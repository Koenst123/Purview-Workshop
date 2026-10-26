import os as _os, pathlib as _pl, tempfile as _tf
_TD = _pl.Path(__file__).resolve().parents[1]  # repo-root met src, Voorbeelden en de deliverable
_OUT = _os.environ.get("PYD_TEST_OUT") or _os.path.join(_tf.gettempdir(), "pyd-tests", _pl.Path(__file__).stem)
_os.makedirs(_OUT, exist_ok=True)
"""Eigen Playwright-checks VIEWS-B (round 3). Gebruik: python t-vb.py app.html"""
import sys, pathlib, re
from playwright.sync_api import sync_playwright

HTML = sys.argv[1]
SRC = (_TD / "src")
MINE = ["js/views/_shared.js", "js/views/dlp.js", "js/views/endpoint.js", "js/views/copilot.js", "js/views/tenant.js", "js/views/scenarios.js", "js/views/adoption.js", "js/views/export.js"]
fails = []
def check(name, ok, info=""):
    print(("PASS " if ok else "FAIL ") + name + (f"  [{info}]" if info else ""))
    if not ok: fails.append(name)

for m in MINE:
    t = (SRC / m).read_text(encoding="utf-8")
    check(f"geen inline handlers in {m}", not re.search(r"\son(change|click|input|keydown)=", t))

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.set_default_timeout(5000)
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(pathlib.Path(HTML).as_uri()); pg.wait_for_timeout(500)
    pg.evaluate("Store.replace(buildPresetState('generic',{customer:'Test BV'}))")
    E = pg.evaluate

    # ---------- DLP: maatwerk-policy, add-condition selects zonder inline handlers ----------
    E("App.go('dlp')"); pg.wait_for_timeout(100)
    E("Actions['cdlp-add']({dataset:{tpl:'custom'}})"); pg.wait_for_timeout(150)
    n0 = E("(()=>{const c=S().customDlp.at(-1); const r=c.rules[0]; return (r.labels||[]).length+(r.sits||[]).length})()")
    sel = pg.locator('select[data-live="cdlp-addsel"]').first
    check("add-condition select aanwezig", sel.count() > 0)
    opt = sel.locator("option").nth(1).get_attribute("value")
    sel.select_option(opt); pg.wait_for_timeout(200)
    n1 = E("(()=>{const c=S().customDlp.at(-1); const r=c.rules[0]; return (r.labels||[]).length+(r.sits||[]).length})()")
    check("add-condition select voegt conditie toe", n1 == n0 + 1, f"{n0}->{n1}")
    xs = pg.locator('select[data-live="cdlp-xadd"]').first
    if xs.count():
        before = E("JSON.stringify(S().customDlp.at(-1).rules[0])")
        xs.select_option(xs.locator("option").nth(1).get_attribute("value")); pg.wait_for_timeout(200)
        after = E("JSON.stringify(S().customDlp.at(-1).rules[0])")
        check("extra-conditie select werkt", before != after)
    else:
        check("extra-conditie select aanwezig", False)
    check("geen onchange-attribuut in DOM", E("document.querySelectorAll('[onchange],[onclick],[oninput]').length") == 0)

    # ---------- include/exclude exclusiviteit ----------
    E("UI.dlpTab='policies'; App.render()"); pg.wait_for_timeout(150)
    E("document.querySelectorAll('#main details').forEach(d=>d.open=true)"); pg.wait_for_timeout(100)
    pair = pg.locator('input[data-live="vb-incexc"]')
    check("include/exclude velden aanwezig", pair.count() >= 2, str(pair.count()))
    if pair.count() >= 2:
        inc, exc = pair.nth(0), pair.nth(1)
        inc.fill("HR-team"); inc.dispatch_event("change"); pg.wait_for_timeout(300)
        pair = pg.locator('input[data-live="vb-incexc"]')
        check("exclude uitgeschakeld als include gevuld", pair.nth(1).is_disabled())
        pair.nth(0).fill(""); pair.nth(0).dispatch_event("change"); pg.wait_for_timeout(300)
        pair = pg.locator('input[data-live="vb-incexc"]')
        check("exclude weer actief als include leeg", not pair.nth(1).is_disabled())

    # ---------- alertRecipients + partnerException ----------
    E("UI.dlpTab='notify'; App.render()"); pg.wait_for_timeout(150)
    ar = pg.locator('input[data-bind="st:dlpSettings.alertRecipients"]')
    check("alertRecipients veld", ar.count() == 1)
    if ar.count():
        ar.fill("privacy@test.nl; soc@test.nl"); ar.dispatch_event("change"); pg.wait_for_timeout(200)
        check("alertRecipients bewaard", E("S().dlpSettings.alertRecipients") == "privacy@test.nl; soc@test.nl")
    E("Store.update(st=>{st.groups.push({id:uid('grp'),kind:'domain',name:'Ketenpartners',value:'partner.nl; zorg.nl'})})")
    E("UI.dlpTab='matrix'; App.render()"); pg.wait_for_timeout(150)
    pe = pg.locator('input[data-bind^="st:dlpSettings.partnerException."]')
    if pe.count() == 0:
        # refine-tabel staat mogelijk in een ingeklapte sectie
        E("document.querySelectorAll('#main details').forEach(d=>d.open=true)"); pg.wait_for_timeout(100)
        pe = pg.locator('input[data-bind^="st:dlpSettings.partnerException."]')
    check("partnerException checkbox", pe.count() > 0, str(pe.count()))
    if pe.count():
        en = [i for i in range(pe.count()) if not pe.nth(i).is_disabled()]
        if en:
            spec = pe.nth(en[0]).get_attribute("data-bind")
            E("document.querySelectorAll('#main details').forEach(d=>d.open=true)"); pe.nth(en[0]).check(force=True); pg.wait_for_timeout(200)
            lid = spec.split(".")[-1]
            check("partnerException bewaard", E(f"S().dlpSettings.partnerException['{lid}']") is True)
            exp = E("JSON.stringify(Store.exportable ? Store.exportable() : S())")
            check("partnerException in state-JSON", lid in exp and "privacy@test.nl" in exp)
    check("matrix overflow-wrapper", E("!!document.querySelector('.vb-ovf .board-wrap[role=region][tabindex]')"))

    # ---------- Scenario's ----------
    E("App.go('scenarios')"); pg.wait_for_timeout(200)
    check("banner score-uitleg", "Score = ontworpen bescherming" in pg.inner_text("#main") or E("[...document.querySelectorAll('#main [data-tip]')].some(e => /Score = ontworpen bescherming/.test(e.dataset.tip))"))
    chips = pg.locator('[data-action="scn-predict"]')
    check("voorspel-chips aanwezig", chips.count() >= 3, str(chips.count()))
    first = chips.first.get_attribute("data-id")
    pg.locator(f'[data-action="scn-predict"][data-id="{first}"][data-v="block"]').click(); pg.wait_for_timeout(150)
    check("voorspelling bewaard", E(f"(S().scenarioResults['{first}']||{{}}).predict") == "block")
    pg.locator(f'[data-action="scn-play"][data-id="{first}"]').click(); pg.wait_for_timeout(300)
    t = pg.inner_text("#main")
    check("voorspelling vergeleken na afspelen", ("voorspelling klopte" in t) or ("Anders dan verwacht" in t))
    check("Bereikt · Gewenst · Voldoet-tekst", re.search(r"Gewenst: (minstens|precies|\w+–)", t) is not None)
    check("confetti standaard uit", E("document.querySelectorAll('.confetti, .vb-confetti, canvas.confetti').length") == 0 and E("VH.fx()") is False)
    # eigen scenario
    pg.locator('[data-action="scn-custom-add"]').first.click(); pg.wait_for_timeout(200)
    pg.fill("#csc-title", "Offerte met IBAN naar leverancier")
    pg.fill("#csc-persona", "Inkoper")
    pg.select_option("#csc-channel", "endpoint"); pg.wait_for_timeout(50)
    check("activiteit zichtbaar bij endpoint", pg.locator("#csc-activity").is_visible())
    pg.select_option("#csc-channel", "exchange")
    pg.select_option("#csc-recipient", "partner")
    boxes = pg.locator('input[name="csc-sit"]')
    if boxes.count(): boxes.first.check()
    pg.select_option("#csc-min", "1"); pg.select_option("#csc-max", "2")
    pg.locator('.modal [data-action="modal-btn"].primary').click(); pg.wait_for_timeout(250)
    cs = E("S().customScenarios")
    check("eigen scenario toegevoegd", len(cs) == 1 and cs[0]["id"].startswith("csc-") and cs[0]["channel"] == "exchange", str(cs)[:200])
    if cs:
        cid = cs[0]["id"]
        check("eigen scenario zichtbaar", pg.locator(f'[data-action="scn-play"][data-id="{cid}"]').count() == 1)
        pg.locator(f'[data-action="scn-play"][data-id="{cid}"]').click(); pg.wait_for_timeout(300)
        check("eigen scenario afgespeeld", pg.locator(f'.scenario-card .stamp').count() >= 1 and pg.locator(f'[data-action="scn-custom-del"][data-id="{cid}"]').count() == 1)
        pg.locator(f'[data-action="scn-custom-del"][data-id="{cid}"]').click(); pg.wait_for_timeout(150)
        pg.locator('.modal [data-action="modal-btn"].danger').click(); pg.wait_for_timeout(250)
        check("eigen scenario verwijderd", E("S().customScenarios.length") == 0)
    E("Store.update(st=>{st.meta.sector='zorg'})"); pg.wait_for_timeout(150)
    check("zorg-scenario's zichtbaar (break-glass)", "Acute overplaatsing" in E("JSON.stringify(ScnUI.results(S()).map(r=>r.scn.title))"))
    E("Store.update(st=>{st.meta.sector='overheid'})"); pg.wait_for_timeout(150)
    check("overheid-scenario's", E("(() => { const n = ScnUI.results(S()).filter(r=>r.scn.sector==='overheid').length; return n >= 6 && n === CATALOG.scenarios.filter(s=>s.sector==='overheid').length; })()"))
    E("Store.update(st=>{st.meta.sector='financieel'})"); pg.wait_for_timeout(150)
    check("financieel-scenario's", E("(() => { const n = ScnUI.results(S()).filter(r=>r.scn.sector==='financieel').length; return n >= 5 && n === CATALOG.scenarios.filter(s=>s.sector==='financieel').length; })()"))
    E("Actions['scn-play-all']()"); pg.wait_for_timeout(300)
    E("Store.update(st=>{st.meta.sector='generic'})")

    # ---------- Tenant ----------
    E("App.go('tenant')"); pg.wait_for_timeout(150)
    check("geen knoppen in summary (tenant)", E("document.querySelectorAll('#main summary button, #main summary input, #main summary select').length") == 0)
    check("badge Nodig", "Nodig" in pg.inner_text("#main"))
    check("kopregel pilot", "vóór de pilot" in pg.inner_text("#main"))

    # ---------- Adoptie fasen ----------
    E("App.go('adoption','rollout')"); pg.wait_for_timeout(150)
    E("document.querySelectorAll('#main details').forEach(d=>d.open=true)")
    ph = pg.locator('input[data-bind^="st:adoption.phases."]')
    check("fase-velden aanwezig", ph.count() >= 3, str(ph.count()))
    if ph.count():
        spec = ph.first.get_attribute("data-bind")
        ph.first.fill("Jan de Vries"); ph.first.dispatch_event("change"); pg.wait_for_timeout(200)
        key = spec.split(".")[2]; fld = spec.split(".")[3]
        check("fase-eigenaar bewaard", E(f"(S().adoption.phases['{key}']||{{}})['{fld}']") == "Jan de Vries")
    E("App.go('adoption','impact')"); pg.wait_for_timeout(150)
    check("heatmap regio", E("!!document.querySelector('#main [role=region][tabindex]')"))
    check("term 'wrijving' weg uit adoptie", "wrijving" not in pg.inner_text("#main").lower())

    # ---------- Export: versielog ----------
    E("App.go('export')"); pg.wait_for_timeout(150)
    vb = pg.locator('[data-action="vb-version-add"]')
    check("knop Versie vastleggen", vb.count() == 1)
    if vb.count():
        vb.click(); pg.wait_for_timeout(200)
        pg.fill("#ver-version", "0.2"); pg.fill("#ver-change", "Na workshop 2"); pg.fill("#ver-by", "KvdK")
        pg.locator('.modal [data-action="modal-btn"].primary').click(); pg.wait_for_timeout(250)
        v = E("S().meta.versions")
        check("versie vastgelegd", len(v) >= 1 and v[-1]["version"] == "0.2" and v[-1]["change"] == "Na workshop 2", str(v)[:200])
    check("PDF-tip Edge/Chrome", "Edge of Chrome" in pg.inner_text("#main") or E("[...document.querySelectorAll('#main [data-tip]')].some(e => /Edge of Chrome/.test(e.dataset.tip))"))

    # ---------- Endpoint ----------
    E("App.go('endpoint')"); pg.wait_for_timeout(150)
    check("NL-ondertitels endpoint", "Kopiëren naar een USB-stick" in pg.inner_text("#main") or E("document.querySelectorAll('#main .vb-act-nl').length") > 0)
    check("endpoint tabs ARIA", E("document.querySelectorAll('#main [role=tablist] [role=tab][aria-selected]').length") >= 3)
    E("Store.update(st=>{const l=applicableLabels(st).at(-1); l.cfg.dlp.endpoint.activities=l.cfg.dlp.endpoint.activities||{}; l.cfg.dlp.endpoint.activities.rdp='block'})"); pg.wait_for_timeout(150)
    check("Citrix/RDP-waarschuwing", "Citrix" in pg.inner_text("#main"))
    check("Recall preview-info", "Recall" in pg.inner_text("#main"))
    E("UI.epTab='groups'; App.render()"); pg.wait_for_timeout(150)
    sg = pg.locator('[data-action="ep-suggest"]')
    if sg.count() == 0:
        tabs = pg.locator('[data-action="ep-tab"]')
        for i in range(tabs.count()):
            tabs.nth(i).click(); pg.wait_for_timeout(120)
            if pg.locator('[data-action="ep-suggest"]').count(): break
        sg = pg.locator('[data-action="ep-suggest"]')
    check("Voorstel overnemen-knop", sg.count() >= 1, str(sg.count()))
    if sg.count():
        k = sg.first.get_attribute("data-key"); n0 = E(f"(S().endpoint['{k}']||[]).length")
        sg.first.click(); pg.wait_for_timeout(200)
        n1 = E(f"(S().endpoint['{k}']||[]).length")
        check("voorstel samengevoegd", n1 > n0, f"{k}: {n0}->{n1}")
        sg2 = pg.locator(f'[data-action="ep-suggest"][data-key="{k}"]')
        check("voorstel-knop weg na overnemen", sg2.count() == 0)
    ex = pg.locator('[data-action="ep-grp-example"]')
    check("voorbeeldgroep-knoppen", ex.count() >= 2, str(ex.count()))
    if ex.count():
        ex.first.click(); pg.wait_for_timeout(200)
        check("voorbeeldgroep allow", E("[...(S().endpoint.printerGroups||[]),...(S().endpoint.usbGroups||[])].some(g=>g.action==='allow')"))

    # ---------- Copilot ----------
    E("Store.replace(buildPresetState('zorg',{customer:'Zorg BV'}))"); pg.wait_for_timeout(200)
    E("App.go('copilot')"); pg.wait_for_timeout(150)
    tx = pg.inner_text("#main")
    check("DPIA-vraag zorg", "DPIA" in tx)
    check("EXTRACT/UDP in gewone taal", ("EXTRACT-recht" in tx) or ("Door gebruiker bepaalde rechten" in tx) or ("Geen encryptie" in tx))
    E("document.querySelectorAll('#main details').forEach(d=>d.open=true)")
    check("Copilot-meldingen portal-notitie", "Purview-portal" in pg.inner_text("#main"))

    # ---------- Adoptie: + Persona focus, sectorpersona's, datum ----------
    E("App.go('adoption')"); pg.wait_for_timeout(150)
    np0 = E("S().personas.length")
    pg.locator('[data-action="per-add"]').first.click(); pg.wait_for_timeout(250)
    check("+ Persona focust Naam", E("(document.activeElement && (document.activeElement.dataset.bind||'')).endsWith(':name')"), E("document.activeElement && document.activeElement.outerHTML.slice(0,80)"))
    check("+ Persona toegevoegd", E("S().personas.length") == np0 + 1)
    ps_ = pg.locator('[data-action="per-sector"]')
    if ps_.count():
        n0 = E("S().personas.length"); ps_.click(); pg.wait_for_timeout(200)
        check("sectorpersona's toegevoegd", E("S().personas.length") > n0)
    else:
        check("sectorpersona's al compleet (zorg)", E("S().personas.some(p=>/Zorgprofessional/.test(p.name))"))
    E("App.go('adoption','rollout')"); pg.wait_for_timeout(150)
    d = pg.locator('input[type=date][data-bind$=".due"]').first
    d.fill("2026-12-01"); d.dispatch_event("change"); pg.wait_for_timeout(200)
    check("fase-streefdatum bewaard", E("Object.values(S().adoption.phases).some(v=>v.due==='2026-12-01')"))
    E("App.go('adoption','impact')"); pg.wait_for_timeout(150)
    check("grijze 'nog niet ontworpen' of ontworpen labels", E("document.querySelectorAll('#main td.h').length") > 0)

    check("geen JS-fouten", not errs, "; ".join(errs[:5]))
    b.close()

print(f"\nFAILS: {len(fails)}")
sys.exit(bool(fails))
for f_ in fails: print(" -", f_)
