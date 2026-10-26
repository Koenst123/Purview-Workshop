import os as _os, pathlib as _pl, tempfile as _tf
_TD = _pl.Path(__file__).resolve().parents[1]  # repo-root met src, Voorbeelden en de deliverable
_OUT = _os.environ.get("PYD_TEST_OUT") or _os.path.join(_tf.gettempdir(), "pyd-tests", _pl.Path(__file__).stem)
_os.makedirs(_OUT, exist_ok=True)
# Besluiten & open punten: statussen, migratie, bewerken, readiness, exports, XSS, persistentie, wissen, vorige/volgende.
import sys, json, pathlib
from playwright.sync_api import sync_playwright
A = pathlib.Path(sys.argv[1]).as_uri(); OUT = sys.argv[2] if len(sys.argv) > 2 else _OUT; fails = []
def ok(n, c):
    print(("PASS " if c else "FAIL ") + n); (None if c else fails.append(n))

XSS = '<img src=x onerror="window.__x=1">'
with sync_playwright() as p:
    b = p.chromium.launch(); c = b.new_context(viewport={"width": 1400, "height": 900}); pg = c.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.on("dialog", lambda d: d.dismiss())
    pg.goto(A); pg.wait_for_timeout(500)
    E = pg.evaluate

    # 1. Route bestaat in navigatie, vóór Export
    ok("route in NAV vóór export", E("NAV_ROUTES.indexOf('besluiten') >= 0 && NAV_ROUTES.indexOf('besluiten') === NAV_ROUTES.indexOf('export') - 1"))

    # 2. Migratie oud JSON (alleen kind)
    old = {"app": "pyd-ipdlp-designer", "labels": [{"id": "lbl-a", "name": "A"}], "decisions": [
        {"id": "dec-d1", "kind": "decision", "text": "Standaardlabel Intern", "route": "board", "owner": "CIO"},
        {"id": "dec-d2", "kind": "park", "text": "Woo-afstemming", "route": "start", "owner": ""},
        {"id": "dec-d3", "text": "Zonder kind"},
        {"id": "dec-d4", "kind": "decision", "status": "bogus", "text": "Rare status"}]}
    before = E("JSON.stringify(S())")
    E("t => IO.loadText(t, 'oud.json')", json.dumps(old))
    ok("reparatiewaarschuwing vóór migratie", pg.get_by_role("button", name="Beperkt openen", exact=True).is_visible() and E("JSON.stringify(S())") == before)
    pg.get_by_role("button", name="Annuleren", exact=True).click()
    ok("annuleren behoudt ontwerp", E("JSON.stringify(S())") == before)
    E("t => IO.loadText(t, 'oud.json')", json.dumps(old))
    pg.get_by_role("button", name="Beperkt openen", exact=True).click(); pg.wait_for_timeout(200)
    st = E("S().decisions.map(d => [d.id, d.status, d.kind])")
    ok("migratie decision → besloten", ["dec-d1", "besloten", "decision"] in st)
    ok("migratie park → open", ["dec-d2", "open", "park"] in st)
    ok("migratie zonder kind → besloten", ["dec-d3", "besloten", "decision"] in st)
    ok("onbekende status → afgeleid uit kind", ["dec-d4", "besloten", "decision"] in st)
    ok("decisionStatus() op ruw object", E("[decisionStatus({kind:'park'}), decisionStatus({}), decisionStatus({status:'nvt', kind:'decision'})].join()") == "open,besloten,nvt")

    # 3. Readiness: open punt zonder eigenaar blokkeert, n.v.t. telt niet mee
    def crit():
        return E("Validation.readiness(S()).rollout.criteria.find(c => c.route === 'besluiten')")
    cr = crit()
    ok("readiness: criterium linkt naar route", cr is not None)
    ok("readiness: open punt zonder eigenaar → niet ok", cr and cr["ok"] is False and "eigenaar" in cr["text"])
    E("Store.update(st => { st.decisions.forEach(d => { if (d.id !== 'dec-d2') d.owner = 'X'; }); st.decisions.find(d => d.id === 'dec-d2').status = 'nvt'; })")
    ok("readiness: n.v.t. telt niet mee → ok", crit()["ok"] is True)
    E("Store.update(st => { st.decisions.forEach(d => { if (d.status === 'besloten') { d.status = 'open'; d.kind = 'park'; } }); })")
    cr = crit(); ok("readiness: alleen open punten → niet ok", cr["ok"] is False and "nog geen besluiten" in cr["text"])
    ok("readiness: nog steeds 5 criteria", E("Validation.readiness(S()).rollout.criteria.length") == 5)

    # 4. View: toevoegen, status, bewerken
    E("App.go('besluiten')"); pg.wait_for_timeout(150)
    ok("view rendert", pg.locator("#main h1", has_text="Besluiten & open punten").count() == 1)
    ok("filterchips aanwezig", pg.locator(".dec-chips .chip").count() == 5)
    pg.fill("#dec-new", "Nieuw open punt " + XSS); pg.select_option("#dec-new-status", "bespreken"); pg.click('[data-action="decision-add"][data-input="dec-new"]'); pg.wait_for_timeout(150)
    last = E("S().decisions[S().decisions.length-1]")
    ok("toevoegen via view met gekozen status", last["status"] == "bespreken" and last["kind"] == "park" and last["text"].startswith("Nieuw open punt"))
    ok("XSS in besluittekst niet uitgevoerd", E("window.__x") is None and pg.locator("#main img[src=x]").count() == 0)
    pg.fill("#dec-new", "Via Enter"); pg.press("#dec-new", "Enter"); pg.wait_for_timeout(150)
    ok("toevoegen via Enter", E("S().decisions.some(d => d.text === 'Via Enter' && d.status === 'open')"))
    did = last["id"]
    sel = f'select[data-bind="dec:{did}:status"]'
    pg.select_option(sel, "besloten"); pg.wait_for_timeout(150)
    d = E(f"S().decisions.find(d => d.id === '{did}')")
    ok("status wijzigen → kind meegezet", d["status"] == "besloten" and d["kind"] == "decision")
    inp = f'textarea[data-bind="dec:{did}:text"]'
    pg.fill(inp, "Bewerkte tekst"); pg.press(inp, "Tab"); pg.wait_for_timeout(150)
    ok("tekst bewerken", E(f"S().decisions.find(d => d.id === '{did}').text") == "Bewerkte tekst")
    pg.fill(f'input[data-bind="dec:{did}:owner"]', "CISO"); pg.press(f'input[data-bind="dec:{did}:owner"]', "Tab"); pg.wait_for_timeout(150)
    ok("eigenaar zetten", E(f"S().decisions.find(d => d.id === '{did}').owner") == "CISO")
    pg.click('.dec-chips [data-value="besloten"]'); pg.wait_for_timeout(100)
    ok("filter besloten", pg.locator(".dec-row").count() == E("S().decisions.filter(d => d.status === 'besloten').length") and pg.locator(".dec-row.st-open").count() == 0)
    pg.click('.dec-chips [data-value=""]'); pg.wait_for_timeout(100)
    ok("filter alle", pg.locator(".dec-row").count() == E("S().decisions.length"))
    n0 = E("S().decisions.length")
    pg.click(f'.dec-row [data-action="decision-del"][data-id="{did}"]'); pg.wait_for_timeout(100)
    ok("verwijderen", E("S().decisions.length") == n0 - 1)
    E("Store.undo()"); pg.wait_for_timeout(100)
    ok("verwijderen ongedaan maken", E("S().decisions.length") == n0)
    sw = E("document.documentElement.scrollWidth <= window.innerWidth + 1 && document.getElementById('main').scrollWidth <= document.getElementById('main').clientWidth + 1")
    ok("geen horizontale overflow", sw)
    pg.screenshot(path=OUT + r"\besluiten.png", full_page=True)

    # 5. Exports
    xs = E("XlsxExport.sheets(S()).find(s => s.name === 'Besluiten')")
    ok("xlsx: kolom Status", xs["head"][0] == "Status")
    ok("xlsx: statusnamen", {r[0] for r in xs["rows"]} <= {"Besloten", "Te bespreken", "Open", "N.v.t."})
    E("Store.update(st => { st.decisions.push({id:'dec-dx', status:'nvt', kind:'park', text:'NVT-punt-xyz', route:'', at:'', owner:'', due:''}); st.decisions.push({id:'dec-dy', status:'bespreken', kind:'park', text:'Bespreek-xyz', route:'', at:'', owner:'Jan', due:'2026-03-01'}); })")
    h = E("DocExport.html(S())")
    ok("document: te bespreken in open punten", "Bespreek-xyz" in h and "Te bespreken" in h)
    ok("document: n.v.t. niet als open punt", "NVT-punt-xyz" not in E("JSON.stringify(DocExport.openItems(S()))"))
    ok("document: n.v.t. behouden in besluitenbijlage", "NVT-punt-xyz" in h)
    ok("document: geen <img> uit besluittekst", "<img src=x" not in h)
    k = E("DocExport.html(S(), {only:'keuzes'})")
    ok("keuzeoverzicht: open punten", "Open punten" in k and "Bespreek-xyz" in k and "NVT-punt-xyz" not in k)

    # 6. Facilitatorpaneel: open punt
    pg.click('[data-action="toggle-panel"]'); pg.wait_for_timeout(150)
    pg.fill("#dec-text", "Paneelpunt"); pg.click('#sidepanel [data-action="decision-add"][data-kind="park"]'); pg.wait_for_timeout(150)
    ok("paneel: open punt → status open", E("S().decisions.some(d => d.text === 'Paneelpunt' && d.status === 'open' && d.route === 'besluiten')"))
    ok("paneel: link naar overzicht", pg.locator('#sidepanel button[data-action="go"][data-route="besluiten"]').count() == 1)
    pg.click('[data-action="toggle-panel"]'); pg.wait_for_timeout(150)

    # 7. Persistentie na herladen
    E("Store.flush && Store.flush()"); pg.wait_for_timeout(1200)
    pg.reload(); pg.wait_for_timeout(600)
    ok("na herladen: hervat-dialoog", pg.locator("#modal-root .modal").count() == 1)
    pg.locator("#modal-root .btn.primary").first.click(); pg.wait_for_timeout(200)
    ok("na herladen bewaard", E("S().decisions.some(d => d.id === 'dec-dy' && d.status === 'bespreken' && d.owner === 'Jan')"))

    # 8. Vorige/volgende-navigatie
    E("App.go('labels')"); pg.wait_for_timeout(100)
    ok("pager op stap", pg.locator("#main .step-pager").count() == 1)
    nxt = E("NAV_ROUTES[NAV_ROUTES.indexOf('labels') + 1]")
    pg.click("#main .step-pager .btn:not(.subtle)"); pg.wait_for_timeout(100)
    ok("pager: volgende", E("UI.route") == nxt)
    pg.click("#main .step-pager .btn.subtle"); pg.wait_for_timeout(100)
    ok("pager: vorige", E("UI.route") == "labels")
    E("App.go('start')"); pg.wait_for_timeout(100)
    ok("pager: eerste stap zonder vorige", pg.locator("#main .step-pager .btn.subtle").count() == 0)
    E("App.go('export')"); pg.wait_for_timeout(100)
    ok("pager: laatste stap zonder volgende", pg.locator("#main .step-pager .btn:not(.subtle)").count() == 0)

    # 9. A11y: infoTip heeft toegankelijke naam
    ok("infoTip aria-label", E("(() => { const t = document.createElement('div'); t.innerHTML = infoTip('Uitleg'); const s = t.firstChild; return s.getAttribute('role') === 'button' && s.getAttribute('aria-label') === 'Meer informatie: Uitleg'; })()"))

    # 10. Wissen
    E("App.wipeNow(true)"); pg.wait_for_timeout(200)
    ok("wissen: besluiten weg", E("S().decisions.length") == 0)
    E("App.go('besluiten')"); pg.wait_for_timeout(100)
    ok("lege toestand", pg.locator("#main .empty").count() == 1 and pg.locator("#dec-new").count() == 1)

    # 11. Scenario's: bespreekpunten, normalisatie eigen scenario, export
    imp = {"app": "pyd-ipdlp-designer", "labels": [{"id": "lbl-a", "name": "A"}], "customScenarios": [
        {"id": "csc-x1", "title": "Eigen EP", "channel": "endpoint", "activity": "network", "content": {"sens": 2}, "expect": {"min": 1},
         "risk": "Risico " + XSS, "options": ["Optie " + XSS] + ["o%d" % i for i in range(10)], "exceptions": "a;b", "validate": [{"x": 1}, "Test"], "__proto__": {"polluted": 1}},
        {"id": "csc-x2", "title": "Ongeldige activiteit", "channel": "endpoint", "activity": "bogus", "content": {}, "expect": {}}]}
    E("t => IO.loadText(t, 'scn.json')", json.dumps(imp))
    pg.get_by_role("button", name="Beperkt openen", exact=True).click(); pg.wait_for_timeout(200)
    cs = E("S().customScenarios")
    c1 = next((x for x in cs if x["id"] == "csc-x1"), {}); c2 = next((x for x in cs if x["id"] == "csc-x2"), {})
    ok("eigen scenario: activity behouden", c1.get("activity") == "network")
    ok("eigen scenario: ongeldige activity → standaard", c2.get("activity") == E("CATALOG.endpointActivities[0].key"))
    ok("eigen scenario: lijsten begrensd", len(c1.get("options", [])) == 6 and c1.get("exceptions") == ["a", "b"] and c1.get("validate") == ["Test"])
    ok("geen prototype pollution", E("({}).polluted") is None)
    E("UI.scnChannel = 'endpoint'; App.go('scenarios')"); pg.wait_for_timeout(200)
    ok("bespreekpunten ingeklapt aanwezig", pg.locator(".sc-talk").count() > 0 and pg.locator(".sc-talk[open]").count() == 0)
    pg.locator(".sc-talk summary").first.click(); pg.wait_for_timeout(100)
    ok("bespreekpunten: XSS niet uitgevoerd", E("window.__x") is None and pg.locator("#main img[src=x]").count() == 0)
    ok("catalogus: nieuwe kanalen aanwezig", E("['network','bluetooth','rdp','clipboard','apps'].every(a => CATALOG.scenarios.some(s => s.activity === a))"))
    ok("catalogus: alle scenario-ID’s uniek", E("new Set(CATALOG.scenarios.map(s => s.id)).size === CATALOG.scenarios.length"))
    xl = E("(() => { const s = XlsxExport.sheets(S()).find(x => x.name === \"Scenario's\"); return s ? [s.head[s.head.length - 1], s.rows.some(r => String(r[7] || '').startsWith('Risico'))] : null; })()")
    ok("xlsx: kolom bespreekpunten", xl and xl[0] == "Bespreekpunten" and xl[1])
    E("UI.scnChannel = ''")

    ok("geen JS-fouten", not errs)
    if errs: print("  ", errs[:5])
    b.close()
print("FAILS:", fails)
sys.exit(1 if fails else 0)
