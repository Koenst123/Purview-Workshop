import os as _os, pathlib as _pl, tempfile as _tf
_OUT = _os.environ.get("PYD_TEST_OUT") or _os.path.join(_tf.gettempdir(), "pyd-tests", _pl.Path(__file__).stem)
_os.makedirs(_OUT, exist_ok=True)
# Regressies SaaS-polish: H1 op lege staten, Copilot op één regel, nieuwe DLP zonder fout,
# Endpoint sticky kolom, filter wissen, PS-waarschuwing, consistente metrics en geen woordbreuk op 320px.
# Gebruik: python t_polish.py <app.html>
import sys, json, pathlib
from playwright.sync_api import sync_playwright

APP = sys.argv[1]
FAILS, ERRS = [], []


def ok(cond, msg):
    print(("PASS " if cond else "FAIL ") + msg)
    if not cond:
        FAILS.append(msg)


def page(b, w=1440, preset="generic", theme="light"):
    pg = b.new_page(viewport={"width": w, "height": 900})
    pg.on("pageerror", lambda e: ERRS.append(str(e)))
    pg.goto(pathlib.Path(APP).as_uri())
    pg.wait_for_function("typeof App !== 'undefined' && !!Store.state")
    pg.evaluate(f"() => {{ Store.replace(buildPresetState('{preset}', {{customer:'T'}})); Prefs.set('theme', '{theme}'); }}")
    pg.wait_for_timeout(150)
    return pg


def go(pg, route, sub=None):
    pg.evaluate(f"() => App.go({json.dumps(route)}{', ' + json.dumps(sub) if sub else ''})")
    pg.wait_for_timeout(250)


MIDWORD = r"""() => {
  const out = []; const w = document.createTreeWalker(document.getElementById('main'), NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) { const el = n.parentElement; if (!el || !el.offsetParent) continue;
    const cs = getComputedStyle(el); if (cs.hyphens === 'auto' || el.closest('.wrap-any, code, pre, .ph-rb-label')) continue;
    const re = /[A-Za-zÀ-ÿ]{6,}/g; let m;
    while ((m = re.exec(n.nodeValue))) { const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
      const rs = [...r.getClientRects()].filter(x => x.width > 0);
      if (rs.length > 1 && Math.abs(rs[0].top - rs[rs.length - 1].top) > 4) out.push(m[0]); } }
  return out.slice(0, 5); }"""


with sync_playwright() as p:
    b = p.chromium.launch()

    # 1. Lege staten met H1
    pg = page(b, preset="empty")
    for r in ("labels", "policies", "autolabel"):
        go(pg, r)
        ok(pg.locator("#main h1").count() == 1, f"H1 op lege staat van {r}")
    go(pg, "schema")
    pg.evaluate("() => Actions['preset']({dataset:{id:'empty'}})")
    pg.wait_for_timeout(200)
    confirm = pg.locator(".modal .btn.primary")
    if confirm.count():
        confirm.first.click()
    pg.wait_for_timeout(300)
    ok("Classificatieschema" not in pg.inner_text("#main h1"), "lege preset begint op Start, niet op het Classificatieschema")
    pg.close()

    # 2. Copilot: segmented control op één regel + Resultaat-kolom
    pg = page(b)
    go(pg, "copilot")
    segs = pg.evaluate("() => [...document.querySelectorAll('#main .cp-seg')].map(g => new Set([...g.querySelectorAll('.cp-seg-b')].map(x => Math.round(x.getBoundingClientRect().top))).size)")
    ok(len(segs) > 0 and all(s == 1 for s in segs), f"Copilot-keuze op één regel {segs[:5]}")
    ok(pg.locator("#main .cp-seg-b[aria-pressed=true]").count() >= 1, "Copilot-keuze heeft aria-pressed")

    # 3. Nieuwe maatwerk-DLP: begeleiding in plaats van rode fout
    go(pg, "dlp", "custom")
    pg.evaluate("() => Actions['cdlp-add']({dataset:{tpl:'custom'}})")
    pg.wait_for_timeout(300)
    ok(pg.locator("#main .msg.err").count() == 0, "nieuwe maatwerk-policy toont geen foutbanner")
    ok("Nieuwe policy aangemaakt" in pg.inner_text("#main"), "nieuwe maatwerk-policy toont begeleiding")

    # 4. Endpoint: NL niveaunamen + sticky eerste kolom
    go(pg, "endpoint")
    txt = pg.inner_text("#main")
    ok("Blokkeren met override" in txt and "Alleen registreren" in txt, "Endpoint toont NL-niveaunamen")
    ok(pg.evaluate("() => { const th = document.querySelector('#main .vb-epm th.vb-act'); return !!th && getComputedStyle(th).position === 'sticky'; }"),
       "Endpoint eerste kolom is sticky")

    # 5. Informatietypen: Filter wissen
    go(pg, "sits", "map")
    pg.evaluate("() => { UI.libFilter.q = 'iban'; UI.libFilter.region = 'NL'; App.render(); }")
    pg.wait_for_timeout(200)
    btn = pg.locator("#main [data-action=lib-clear]")
    ok(btn.count() == 1, "knop Filter wissen zichtbaar bij actief filter")
    if btn.count():
        btn.click(); pg.wait_for_timeout(200)
        f = pg.evaluate("() => UI.libFilter")
        ok(not f.get("q") and not f.get("region"), f"Filter wissen reset zoekterm en land {f}")
        ok(pg.locator("#main [data-action=lib-clear]").count() == 0, "Filter wissen verdwijnt na wissen")

    # 6. Export: eerlijk PS-label + waarschuwing; metrics met noemer
    go(pg, "export")
    txt = pg.inner_text("#main")
    ok("PowerShell-configuratiescript" in txt and "PowerShell (simulatie)" not in txt, "PS-export heet configuratiescript")
    ok(pg.locator("#main .exp-ps-warn").count() == 1, "PS-export toont waarschuwing")
    nav = pg.inner_text(".nav") if pg.locator(".nav").count() else pg.inner_text("body")
    ok(" van " in nav, "zijbalk-metrics tonen een noemer (x van y)")
    pg.close()

    # 7. Inline fout in dialoog + presetwissel behouden/wissen + rustige topbalk
    pg = page(b)
    go(pg, "policies")
    pg.evaluate("() => Actions['grp-add']()"); pg.wait_for_timeout(150)
    pg.click(".modal .btn.primary"); pg.wait_for_timeout(150)
    inv = pg.evaluate("() => { const i = document.querySelector('#pd-in'); const d = i && document.getElementById((i.getAttribute('aria-describedby') || '').split(' ').pop()); return [i && i.getAttribute('aria-invalid'), d ? d.textContent : '', document.activeElement === i]; }")
    ok(inv[0] == "true" and "naam" in inv[1] and inv[2], f"lege doelgroepnaam: aria-invalid, beschreven fout en focus {inv}")
    pg.keyboard.press("Escape"); pg.wait_for_timeout(150)
    ok(pg.locator('#topbar-actions [data-action="open-json"], #topbar-actions [data-action="save-json"], #topbar-actions [data-action="toggle-theme"]').count() == 0, "topbalk: openen, opslaan en thema zitten in Meer")
    ok(pg.locator('#save-ind[data-state="ok"]').count() == 1 and "browser" in pg.inner_text("#save-ind"), "bewaarstatus: chip 'Bewaard in browser'")
    pg.evaluate("() => { Store.update(st => { st.meta.customer = 'Klant X'; st.decisions.push({id:'dec-k', status:'open', text:'Blijft', route:'start'}); }); }")
    for btn, keep in (("Workshopgegevens behouden", True), ("Alles wissen", False)):
        pg.evaluate("() => Actions['preset']({dataset:{id:'zorg'}})"); pg.wait_for_timeout(150)
        pg.locator(".modal .btn", has_text=btn).click(); pg.wait_for_timeout(250)
        got = pg.evaluate("() => [S().meta.customer || '', S().decisions.some(d => d.id === 'dec-k'), S().labels.length]")
        ok((got[0] == "Klant X") == keep and got[1] == keep and got[2] > 0, f"presetwissel '{btn}' {got}")
    pg.close()

    # 8. Ontwerpbord: legenda-strip, passend maken en focus terug na sluiten
    pg = page(b, w=900)
    go(pg, "board")
    ok(pg.locator(".lb-legend .lg").count() == 5, "bord: legenda als strip met 5 niveaus")
    ok(pg.locator('[data-action="board-fit"]').count() == 0, "bord: knop 'Passend' is verwijderd")
    cell = pg.locator('#main [data-action="board-cell"]').nth(2); cell.focus(); pg.keyboard.press("Enter"); pg.wait_for_timeout(250)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(250)
    ok(pg.evaluate("() => document.activeElement && document.activeElement.dataset.action === 'board-cell'"), "bord: focus terug op de cel na sluiten")
    pg.close()

    # 10. DLP: wizardstappen, Meer opties, regelchips; Copilot-status; auto-labeling zonder voorwaarde
    pg = page(b)
    go(pg, "dlp", "custom")
    pg.evaluate("() => Actions['cdlp-add']({dataset:{tpl:'custom'}})")
    pg.wait_for_timeout(300)
    ok(pg.locator("#main .cdlp-steps [data-action=cdlp-jump]").count() == 4, "maatwerk-wizard heeft 4 stappen")
    ok(pg.locator("#main details summary", has_text="Meer opties").count() >= 1, "maatwerk-wizard: Meer opties ingeklapt")
    pg.locator("#main .cdlp-steps [data-action=cdlp-jump]").nth(2).click()
    pg.wait_for_timeout(400)
    ok(pg.evaluate("() => !!document.activeElement.closest('.cdlp-s3')"), "stap-knop springt naar Regels en zet focus")
    go(pg, "dlp", "policies")
    ok(pg.locator("#main .dl-rc").count() > 0, "DLP-policyregels als chips")
    go(pg, "copilot")
    ok(pg.locator("#main .cp-type .cp-type-s").count() >= 3, "Copilot extra regels tonen status per regeltype")
    ok(pg.locator("#main .cp-types > li.cp-type").count() == 4 and pg.locator("#main .cp-types .btn.primary").count() == 0, "Copilot: regeltypen als rustige lijst zonder primaire knoppen")
    pg.evaluate("() => { Actions['cp-add-rule']({dataset:{type:'web'}}); App.go('copilot'); }"); pg.wait_for_timeout(300)
    more = pg.locator("#main .cp-pol details.acc", has=pg.locator("summary", has_text="Meer opties"))
    ok(more.count() == 1 and more.locator("[data-action=cp-edit]").count() == 1 and more.locator("select[data-bind$=':mode']").count() == 1, "Copilot: modus en wizard achter Meer opties")
    ok(pg.locator("#main .cp-pol .policy-card, #main .cp-pol .card").count() == 0, "Copilot: policy-blok heeft één omkadering")
    lid = pg.evaluate("() => { const l = applicableLabels(S()).find(x => x.cfg.scope.files); Store.update(st => { const y = labelById(l.id, st); y.cfg.autolabel.service.enabled = true; y.cfg.autolabel.service.mode = 'simulation'; y.sits = []; y.classifiers = []; }); UI.alSel = l.id; return l.id; }")
    go(pg, "autolabel")
    dis = pg.evaluate("() => [...document.querySelectorAll('#main input[type=radio][value=enable]')].map(i => i.disabled)")
    ok(True in dis, f"auto-labeling: direct aanzetten uitgeschakeld zonder voorwaarde {dis}")
    ok(pg.locator("#main .al-steps li").count() == 3, "auto-labeling toont veilige volgorde")
    pg.close()

    # 11. Rustige Start, sticky kanaalfilter, JSON-privacymelding, navigatie niet afgekapt
    pg = page(b)
    pg.evaluate("() => { UI.facilitator = true; }")
    go(pg, "start")
    ok(pg.locator("#main .start-hero .ph-reviewed, #main .page-head .ph-reviewed").count() == 0, "Start: besproken-knop niet in de hero")
    go(pg, "scenarios")
    ok(pg.evaluate("() => getComputedStyle(document.querySelector('#main .scn-filter')).position") == "sticky", "Scenario's: kanaalfilter sticky")
    pg.evaluate("() => Store.update(st => { st.meta.internalNotes = 'intern'; })")
    go(pg, "export")
    pg.evaluate("() => Actions['exp-json']()")
    pg.wait_for_timeout(200)
    ok(pg.locator(".modal", has_text="interne").count() == 1, "JSON-export waarschuwt bij interne notities")
    pg.keyboard.press("Escape")
    cut = pg.evaluate("() => [...document.querySelectorAll('.nav-item .nav-text')].filter(t => t.offsetParent && t.scrollHeight > t.clientHeight + 1).map(t => t.textContent)")
    ok(not cut, f"navigatie-items niet afgekapt {cut}")
    pg.close()

    # 12. Ultra-wide: inhoud gecentreerd en begrensd
    pg = page(b, w=3440)
    for r in ("endpoint", "dlp", "board"):
        go(pg, r)
        box = pg.evaluate("() => { const m = document.getElementById('main'); const rs = [...m.children].map(c => c.getBoundingClientRect()); const mr = m.getBoundingClientRect(); return [Math.min(...rs.map(x => x.left)) - mr.left, mr.right - Math.max(...rs.map(x => x.right)), Math.max(...rs.map(x => x.right)) - Math.min(...rs.map(x => x.left))]; }")
        ok(box[2] <= 1800 and abs(box[0] - box[1]) < 40, f"ultra-wide {r}: inhoud begrensd en gecentreerd {box}")
    pg.close()

    # 13. Voorbeelden zichtbaar (niet weggestopt in een dichte accordion)
    pg = page(b)
    go(pg, "dlp", "policies")
    ok(pg.locator("#main .dl-pv").first.is_visible() and pg.locator("#main details .dl-pv").count() == 0, "DLP Policies: voorbeeld direct zichtbaar")
    go(pg, "labels")
    btn = pg.locator("#main .lb-pv-btn")
    ok(btn.is_visible() and btn.get_attribute("aria-expanded") == "true" and pg.locator("#main #lb-pv-col .pv-wrap").is_visible(), "Label-instellingen: voorbeeld standaard zichtbaar naast de instellingen")
    wl = pg.evaluate("() => { const st = S(); const l = applicableLabels(st).find(x => !hasChildren(x, st) && x.cfg.scope.files && x.cfg.marking.watermark.enabled) || applicableLabels(st).find(x => !hasChildren(x, st) && x.cfg.scope.files); Store.update(s => { const y = labelById(l.id, s); y.cfg.marking.watermark.enabled = true; }); return l.id; }")
    go(pg, "labels", wl)
    geo = pg.evaluate("() => { const m = document.querySelector('#main .lb-main').getBoundingClientRect(), a = document.querySelector('#main #lb-pv-col').getBoundingClientRect(); return [Math.round(m.right), Math.round(a.left), Math.round(a.width)]; }")
    ok(geo[1] >= geo[0] - 1 and geo[2] >= 320, f"Label-instellingen: voorbeeld als kolom rechts op 1440 {geo}")
    ok(pg.locator("#main .lb-main .tabs [data-tab=preview]").count() == 0, "Label-instellingen: geen aparte Voorbeeld-tab meer")
    pg.locator("#main .lb-main .tabs [data-tab=marking]").click(); pg.wait_for_timeout(250)
    pg.evaluate("() => { const m = document.getElementById('main'); m.scrollTop = m.scrollHeight; }"); pg.wait_for_timeout(200)
    st = pg.evaluate("() => { const a = document.querySelector('#main #lb-pv-col').getBoundingClientRect(); return [Math.round(a.top), Math.round(a.bottom), innerHeight]; }")
    ok(st[0] >= 0 and st[0] < st[2] - 100, f"Label-instellingen: voorbeeld blijft in beeld bij scrollen (sticky) {st}")
    ok(btn.is_visible() and pg.locator("#main #lb-pv-col .pv-wrap").is_visible(), "Label-instellingen: bediening en voorbeeld zichtbaar na wisselen van tab")
    ok(pg.locator("#main .lb-main #mark-issues").count() == 1 and pg.locator("#main #mark-preview").count() == 0, "Label-instellingen: markering toont controle, geen dubbel voorbeeld")
    pg.locator("#main .lb-main textarea[data-live=mark-preview]").first.fill("LIVE-WM-TEST"); pg.wait_for_timeout(450)
    ok("LIVE-WM-TEST" in pg.locator("#main #lb-pv-col").inner_text(), "Label-instellingen: voorbeeld loopt live mee tijdens typen")
    apps = pg.locator("#main #lb-pv-col .pv-tabbtn")
    if apps.count() > 1:
        apps.nth(1).click(); pg.wait_for_timeout(200)
    ok(btn.is_visible() and pg.locator("#main #lb-pv-col .pv-wrap").count() == 1, "Label-instellingen: bediening blijft zichtbaar na app-keuze in het voorbeeld")
    btn.click(); pg.wait_for_timeout(250)
    btn = pg.locator("#main .lb-pv-btn")
    ok(btn.is_visible() and btn.get_attribute("aria-expanded") == "false" and not pg.locator("#main #lb-pv-col").is_visible(), "Label-instellingen: voorbeeld verbergen, knop blijft zichtbaar")
    ok(pg.evaluate("() => document.activeElement && document.activeElement.classList.contains('lb-pv-btn')"), "Label-instellingen: focus blijft op de voorbeeldknop")
    btn.click(); pg.wait_for_timeout(250)
    ok(pg.locator("#main .lb-pv-btn").get_attribute("aria-expanded") == "true" and pg.locator("#main #lb-pv-col .pv-wrap").is_visible(), "Label-instellingen: voorbeeld weer tonen")
    pg.evaluate("() => { UI.lbPvHide = true; UI.labelTab = 'preview'; App.render(); }"); pg.wait_for_timeout(250)
    ok(pg.locator("#main .pv-wrap").count() == 1 and pg.locator("#main #lb-pv-col .pv-wrap").is_visible() and pg.evaluate("() => UI.labelTab") == "scope", "Label-instellingen: ‘preview’ (uit voorbeeldvenster) opent het vaste paneel")
    pg.close()
    pg = page(b, w=900)
    go(pg, "labels")
    geo = pg.evaluate("() => { const m = document.querySelector('#main .lb-main').getBoundingClientRect(), a = document.querySelector('#main #lb-pv-col').getBoundingClientRect(); return [Math.round(m.bottom), Math.round(a.top)]; }")
    ok(geo[1] >= geo[0] - 1, f"Label-instellingen 900: voorbeeld valt onder de instellingen {geo}")
    back = pg.locator("#main .lb-pv-back")
    ok(back.is_visible() and pg.locator("#main .lb-pv-btn").is_visible(), "Label-instellingen 900: ‘Terug naar instellingen’ en voorbeeldknop zichtbaar")
    back.click(); pg.wait_for_timeout(250)
    ok(pg.evaluate("() => !!document.activeElement && document.activeElement.matches('#main .lb-main .tabs .tab.on')"), "Label-instellingen 900: terug naar instellingen zet focus op de actieve tab")
    ovf = pg.evaluate("() => document.getElementById('main').scrollWidth - document.getElementById('main').clientWidth")
    ok(ovf <= 1, f"Label-instellingen 900: geen horizontale overflow ({ovf})")
    pg.close()

    # 14. Labelbeleid: groot voorbeeld met situatiekeuze, Meer instellingen, doelgroepen ingeklapt
    pg = page(b)
    go(pg, "policies")
    wpv = pg.evaluate("() => { const e = document.querySelector('#main .lp-pv'); return e ? Math.round(e.getBoundingClientRect().width) : 0; }")
    ok(wpv >= 400, f"labelbeleid: voorbeeldpaneel minstens 400px breed op 1440 ({wpv})")
    ok(pg.locator("#main .lp-pv [data-action=lp-pv][data-kind]").count() == 3, "labelbeleid: drie situaties in het voorbeeld")
    pg.click("#main .lp-pv [data-action=lp-pv][data-kind=justify]"); pg.wait_for_timeout(250)
    got = pg.evaluate("() => [UI.lpPv && UI.lpPv.kind, !!document.querySelector('#main .lp-pv-stage .pv-notice[data-kind=justify]'), 'lpPv' in S()]")
    ok(got[0] == "justify" and got[1] and not got[2], f"labelbeleid: situatiekeuze wisselt het voorbeeld, alleen in UI-state {got}")
    pg.click('#main .lp-main label.switch:has(input[data-bind$="settings.justification"])'); pg.wait_for_timeout(250)
    ok(pg.locator("#main .lp-pv-stage .pv-notice[data-kind=quiet]").count() == 1, "labelbeleid: voorbeeld volgt de instelling live (reden uit)")
    more = pg.locator("#main details.acc", has=pg.locator("summary", has_text="Meer instellingen"))
    ok(more.count() == 1 and more.locator('input[data-bind$="settings.mandatoryMeetings"]').count() == 1, "labelbeleid: extra verplichtingen achter Meer instellingen")
    pg.evaluate("() => Store.update(st => { st.labelPolicies.forEach(p => { p.settings.mandatoryMeetings = true; }); })"); pg.wait_for_timeout(250)
    ok("1 ingesteld" in more.locator("summary").inner_text(), "labelbeleid: Meer instellingen toont aantal ingesteld")
    grp = pg.locator('#main details[data-acc="lp-groups"]')
    ok(grp.count() == 1 and not grp.evaluate("d => d.open") and grp.locator('[data-bind^="grp:"]').count() > 0, "labelbeleid: doelgroepen beheren ingeklapt met bestaande velden")
    pg.close()

    # 9. Geen woordbreuk midden in een woord op 320px
    pg = page(b, w=320)
    for r in ("start", "schema", "sits", "copilot", "export", "endpoint"):
        go(pg, r)
        bad = pg.evaluate(MIDWORD)
        ok(not bad, f"geen woordbreuk op 320px in {r} {bad}")
    pg.close()
    b.close()

ok(not ERRS, f"geen JS-fouten {ERRS[:3]}")
print(f"\n{'POLISH OK' if not FAILS else 'POLISH FAILED'}: {len(FAILS)} fouten")
sys.exit(1 if FAILS else 0)
