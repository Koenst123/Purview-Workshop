import os as _os, pathlib as _pl, tempfile as _tf
_OUT = _os.environ.get("PYD_TEST_OUT") or _os.path.join(_tf.gettempdir(), "pyd-tests", _pl.Path(__file__).stem)
_os.makedirs(_OUT, exist_ok=True)
# Ronde 8b: master-detail (lijst links) voor label-instellingen, labelbeleid en auto-labeling.
# Gebruik: python t_r8_master.py <app.html>
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
    pg.on("console", lambda m: ERRS.append(m.text) if m.type == "error" else None)
    pg.goto(pathlib.Path(APP).as_uri())
    pg.wait_for_function("typeof App !== 'undefined' && !!Store.state")
    pg.evaluate(f"() => {{ Store.replace(buildPresetState('{preset}', {{customer:'T'}})); Prefs.set('theme', '{theme}'); }}")
    pg.wait_for_timeout(150)
    return pg


def go(pg, route, sub=None):
    pg.evaluate(f"() => App.go({json.dumps(route)}{', ' + json.dumps(sub) if sub else ''})")
    pg.wait_for_timeout(250)


def md_checks(pg, route, sub_js):
    """Lijst links, alle items, selectie gemarkeerd, klik/pijltjes+Enter/App.go wisselen."""
    go(pg, route)
    ids = pg.evaluate(f"() => {sub_js}")
    md = pg.locator("#main .md")
    ok(md.count() == 1, f"{route}: master-detail aanwezig")
    geo = pg.evaluate("() => { const s = document.querySelector('#main .md-side').getBoundingClientRect(), d = document.querySelector('#main .md-detail').getBoundingClientRect(); return [s.left, s.right, d.left, s.width]; }")
    ok(geo[1] <= geo[2] + 0.5 and geo[0] < geo[2] and geo[3] > 150, f"{route}: lijst staat links van het detail {geo}")
    got = pg.evaluate("() => [...document.querySelectorAll('#main .md-list .md-i')].map(x => x.dataset.id)")
    ok(got == ids, f"{route}: lijst bevat alle items in volgorde ({len(got)}/{len(ids)})")
    ok(pg.locator("#main .md-sel").is_hidden(), f"{route}: geen keuzelijst naast de lijst op 1440")
    cur = pg.locator("#main .md-i[aria-current=true]")
    ok(cur.count() == 1 and cur.get_attribute("data-id") == ids[0] and "on" in (cur.get_attribute("class") or ""), f"{route}: eerste item geselecteerd en gemarkeerd")
    ok(pg.evaluate("() => [...document.querySelectorAll('#main .md-i')].filter(x => x.tabIndex === 0).length") == 1, f"{route}: één tabstop in de lijst (roving tabindex)")
    if len(ids) < 2:
        return ids
    # klik
    pg.locator(f"#main .md-i[data-id='{ids[1]}']").click(); pg.wait_for_timeout(250)
    ok(pg.evaluate(f"() => UI.sub[{json.dumps(route)}]") == ids[1] and pg.locator(f"#main .md-i[data-id='{ids[1]}'][aria-current=true]").count() == 1, f"{route}: klik selecteert item 2")
    ok(pg.evaluate("() => !!document.activeElement && document.activeElement.matches('#main .md-i.on')"), f"{route}: focus blijft op het gekozen item")
    # pijltjes + Enter
    pg.keyboard.press("ArrowUp"); pg.wait_for_timeout(80)
    ok(pg.evaluate("() => document.activeElement && document.activeElement.dataset.id") == ids[0] and pg.evaluate(f"() => UI.sub[{json.dumps(route)}]") == ids[1], f"{route}: pijl omhoog verplaatst alleen de focus")
    pg.keyboard.press("Enter"); pg.wait_for_timeout(250)
    ok(pg.evaluate(f"() => UI.sub[{json.dumps(route)}]") == ids[0] and pg.locator(f"#main .md-i[data-id='{ids[0]}'][aria-current=true]").count() == 1, f"{route}: Enter selecteert het item met focus")
    pg.keyboard.press("End"); pg.keyboard.press("Enter"); pg.wait_for_timeout(250)
    ok(pg.evaluate(f"() => UI.sub[{json.dumps(route)}]") == ids[-1], f"{route}: End + Enter kiest het laatste item")
    # App.go(route, id)
    go(pg, "start"); go(pg, route, ids[1])
    ok(pg.locator(f"#main .md-i[data-id='{ids[1]}'][aria-current=true]").count() == 1, f"{route}: App.go(route, id) selecteert en markeert het item")
    return ids


NAME_JS = {
    "labels": "(id) => { const l = labelById(id); return l.displayName || l.name; }",
    "policies": "(id) => S().labelPolicies.find(p => p.id === id).name",
    "autolabel": "(id) => Generator.autoPolicies(S()).find(p => p.label.id === id).name",
}


def name_of(pg, route, i):
    return pg.evaluate(NAME_JS[route], i)


def ren_input(pg):
    return pg.evaluate("() => { const a = document.activeElement; return a && a.matches('#main .md-ren-in') ? [a.value, a.selectionStart, a.selectionEnd, a.getAttribute('aria-label') || ''] : null; }")


def ren_checks(pg, route):
    """Inline hernoemen in de lijst: potlood, F2, dubbelklik, Enter/Esc/blur, leeg, XSS, max, undo, pijltjes."""
    go(pg, route)
    cur = pg.locator("#main .md-i.on")
    i = cur.get_attribute("data-id")
    old = name_of(pg, route, i)
    pen = pg.locator("#main .md-li.ren .md-ren-btn")
    ok(pen.count() == 1 and (pen.get_attribute("aria-label") or "").startswith("Naam van"), f"{route}: potlood bij het geselecteerde item met aria-label")
    ok(pg.locator("#main .md-ren-btn").count() == 1 and pg.locator("#main .md-ren-btn:visible").count() == 1, f"{route}: alleen het geselecteerde item heeft een potlood")
    cur.focus(); pg.keyboard.press("Tab")
    ok(pg.evaluate("() => document.activeElement && document.activeElement.matches('#main .md-ren-btn')"), f"{route}: potlood bereikbaar met Tab vanaf het geselecteerde item")
    h0 = pg.evaluate("() => [document.querySelector('#main .md-li.ren').getBoundingClientRect().height, document.querySelector('#main .md-side').getBoundingClientRect().height]")
    pg.keyboard.press("Enter"); pg.wait_for_timeout(80)
    r = ren_input(pg)
    ok(r is not None and r[0] == old and r[1] == 0 and r[2] == len(old) and "wijzigen" in r[3], f"{route}: potlood opent het veld met de naam geselecteerd {r}")
    h1 = pg.evaluate("() => { const li = document.querySelector('#main .md-li.ren'), n = li.getBoundingClientRect(), f = li.querySelector('.md-ren-in').getBoundingClientRect(); return [n.height, document.querySelector('#main .md-side').getBoundingClientRect().height, f.top >= n.top - 1 && f.bottom <= n.bottom + 1]; }")
    ok(abs(h1[0] - h0[0]) < 1 and abs(h1[1] - h0[1]) < 1 and h1[2], f"{route}: veld op dezelfde plek, geen layoutsprong {h0} {h1}")
    sub0 = pg.evaluate(f"() => UI.sub[{json.dumps(route)}] || null")
    pg.keyboard.press("ArrowDown"); pg.keyboard.press("ArrowUp"); pg.keyboard.press("End"); pg.wait_for_timeout(80)
    ok(ren_input(pg) is not None and pg.evaluate(f"() => UI.sub[{json.dumps(route)}] || null") == sub0, f"{route}: pijltjes in het veld bewegen niet door de lijst")
    past = pg.evaluate("() => Store.past.length")
    new = f"Hernoemd {route}"
    pg.keyboard.press("Control+a"); pg.keyboard.type(new); pg.keyboard.press("Enter"); pg.wait_for_timeout(250)
    ok(name_of(pg, route, i) == new, f"{route}: Enter slaat op in de state")
    ok(new in pg.locator(f"#main .md-i[data-id='{i}']").inner_text() and new in pg.locator("#main .md-detail .md-dh-t").first.inner_text(), f"{route}: lijst en kop direct bijgewerkt")
    ok(pg.evaluate("() => Store.past.length") == past + 1, f"{route}: één undo-stap per hernoeming")
    ok(pg.evaluate("() => !document.querySelector('#main .md-ren-in') && document.activeElement && document.activeElement.matches('#main .md-i.on')"), f"{route}: focus terug op het lijstitem")
    ok(new in pg.evaluate("() => (document.getElementById('md-live') || {}).textContent || ''"), f"{route}: schermlezer-melding na opslaan")
    pg.keyboard.press("Control+z"); pg.wait_for_timeout(250)
    ok(name_of(pg, route, i) == old, f"{route}: Ctrl+Z draait de hernoeming in één stap terug")
    # F2 + Esc
    pg.locator(f"#main .md-i[data-id='{i}']").focus(); pg.keyboard.press("F2"); pg.wait_for_timeout(80)
    ok(ren_input(pg) is not None, f"{route}: F2 opent het veld")
    pg.keyboard.type("XYZ"); pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
    ok(name_of(pg, route, i) == old and pg.locator("#main .md-ren-in").count() == 0 and pg.evaluate("() => document.activeElement && document.activeElement.matches('#main .md-i.on')"), f"{route}: Esc annuleert, focus terug op het item")
    ok(pg.locator(f"#main .md-i[data-id='{i}'] .md-i-n").is_visible() and pg.locator(f"#main .md-i[data-id='{i}'] .md-i-n").evaluate("e => getComputedStyle(e).visibility") == "visible", f"{route}: oude naam weer zichtbaar na Esc")
    # dubbelklik + blur
    pg.locator(f"#main .md-i[data-id='{i}'] .md-i-n").dblclick(); pg.wait_for_timeout(150)
    ok(ren_input(pg) is not None, f"{route}: dubbelklik op de naam opent het veld")
    pg.keyboard.press("Control+a"); pg.keyboard.type("Via blur"); pg.evaluate("() => document.activeElement.blur()"); pg.wait_for_timeout(250)
    ok(name_of(pg, route, i) == "Via blur" and pg.locator("#main .md-ren-in").count() == 0, f"{route}: focus verlaten slaat op")
    # leeg
    pg.locator(f"#main .md-i[data-id='{i}']").focus(); pg.keyboard.press("F2"); pg.keyboard.press("Control+a"); pg.keyboard.type("   "); pg.keyboard.press("Enter"); pg.wait_for_timeout(150)
    ok(name_of(pg, route, i) == "Via blur" and pg.locator("#main .md-ren-msg").count() == 1 and "leeg" in pg.locator("#main .md-ren-msg").inner_text(), f"{route}: lege naam geweigerd met melding")
    # maximale lengte
    pg.locator(f"#main .md-i[data-id='{i}']").focus(); pg.keyboard.press("F2"); pg.keyboard.press("Control+a"); pg.keyboard.type("m" * 80); pg.keyboard.press("Enter"); pg.wait_for_timeout(200)
    ok(len(name_of(pg, route, i)) == 64, f"{route}: maximaal 64 tekens ({len(name_of(pg, route, i))})")
    # XSS
    x = '<img src=x onerror="window.__r3=1">'
    pg.locator(f"#main .md-i[data-id='{i}']").focus(); pg.keyboard.press("F2"); pg.keyboard.press("Control+a"); pg.keyboard.type(x); pg.keyboard.press("Enter"); pg.wait_for_timeout(250)
    ok(name_of(pg, route, i) == x and x in pg.locator(f"#main .md-i[data-id='{i}']").inner_text() and pg.locator("#main img[onerror], #main img[src='x']").count() == 0 and not pg.evaluate("() => window.__r3"), f"{route}: XSS-naam als tekst getoond")
    pg.locator(f"#main .md-i[data-id='{i}']").focus(); pg.keyboard.press("F2"); pg.keyboard.press("Control+a"); pg.keyboard.type(old); pg.keyboard.press("Enter"); pg.wait_for_timeout(200)
    ok(name_of(pg, route, i) == old, f"{route}: oude naam teruggezet")


def head_ren(pg, route, label):
    """Rail of smal: hernoemen via de kop boven het detail (potlood naast de naam)."""
    hb = pg.locator("#main .md-dh-ren")
    ok(hb.count() == 1 and hb.is_visible() and pg.locator("#main .md-ren-btn:visible").count() == 0, f"{route} {label}: hernoemknop in de kop, niet in de lijst")
    i = hb.get_attribute("data-id")
    old = name_of(pg, route, i)
    hb.click(); pg.wait_for_timeout(100)
    r = ren_input(pg)
    ok(r is not None and r[0] == old, f"{route} {label}: kop-potlood opent het veld {r}")
    pg.keyboard.press("Control+a"); pg.keyboard.type(f"Kop {label}"); pg.keyboard.press("Enter"); pg.wait_for_timeout(250)
    ok(name_of(pg, route, i) == f"Kop {label}" and pg.evaluate("() => document.activeElement && document.activeElement.matches('#main .md-dh-ren')"), f"{route} {label}: opgeslagen, focus terug op de knop")
    pg.keyboard.press("Control+z"); pg.wait_for_timeout(250)
    ok(name_of(pg, route, i) == old, f"{route} {label}: Ctrl+Z draait terug")


with sync_playwright() as p:
    b = p.chromium.launch()
    pg = page(b)
    lab = md_checks(pg, "labels", "orderedLabels(S()).map(l => l.id)")
    go(pg, "labels", lab[0])
    ok(pg.locator("#main .md-detail .md-dh-t").inner_text().strip() == pg.evaluate(f"() => labelFullName(labelById({json.dumps(lab[0])}))"), "labels: detail toont de naam van het gekozen label")
    ok(pg.locator("#main .md-detail #lb-pv-col").count() == 1 and pg.locator("#main .md-detail .lb-main .tabs").count() == 1, "labels: tabs en voorbeeldpaneel staan in het detail")
    geo = pg.evaluate("() => { const m = document.querySelector('#main .lb-main .tabs').getBoundingClientRect(); const t = [...document.querySelectorAll('#main .lb-main .tabs .tab')].map(x => x.getBoundingClientRect().top); return [Math.max(...t) - Math.min(...t)]; }")
    ok(geo[0] < 4, f"labels: tabbladen op één regel naast lijst en voorbeeld {geo}")
    sub = pg.evaluate("() => { const st = S(); const l = orderedLabels(st).find(x => x.parentId); return l ? l.id : null; }")
    if sub:
        ok("ind" in (pg.locator(f"#main .md-i[data-id='{sub}']").locator("xpath=..").get_attribute("class") or ""), "labels: sublabel ingesprongen")
    # zoeken (> 8 items)
    q = pg.locator("#main .md-q")
    ok(q.count() == 1, "labels: zoekveld bij meer dan 8 labels")
    q.fill("intern"); pg.wait_for_timeout(100)
    vis = pg.evaluate("() => [...document.querySelectorAll('#main .md-li')].filter(x => !x.hidden).length")
    ok(1 <= vis < len(lab), f"labels: zoeken filtert de lijst ({vis})")
    pg.keyboard.press("ArrowDown"); pg.wait_for_timeout(50)
    ok(pg.evaluate("() => document.activeElement && document.activeElement.matches('#main .md-li:not([hidden]) .md-i')"), "labels: pijl omlaag vanuit zoekveld gaat naar de lijst")
    q.fill(""); pg.wait_for_timeout(100)
    ok(pg.evaluate("() => [...document.querySelectorAll('#main .md-li')].every(x => !x.hidden)"), "labels: leeg zoekveld toont alles")
    # zoekterm met spatie aan het eind: na een re-render filtert de lijst hetzelfde als tijdens typen
    q.fill("intern "); pg.wait_for_timeout(100)
    before = pg.evaluate("() => [...document.querySelectorAll('#main .md-li')].filter(x => !x.hidden).map(x => x.querySelector('.md-i').dataset.id)")
    pg.evaluate("() => App.render()"); pg.wait_for_timeout(150)
    after = pg.evaluate("() => [...document.querySelectorAll('#main .md-li')].filter(x => !x.hidden).map(x => x.querySelector('.md-i').dataset.id)")
    ok(before and before == after and pg.locator("#main .md-none:not([hidden])").count() == 0, f"labels: zoekfilter gelijk na re-render ({len(before)}/{len(after)})")
    pg.locator("#main .md-q").fill(""); pg.wait_for_timeout(100)
    # nieuw label via de lijst
    n0 = pg.evaluate("() => S().labels.length")
    pg.locator("#main .md-add[data-action=lbl-new]").click(); pg.wait_for_timeout(200)
    pg.locator(".modal input").first.fill("WP10 testlabel"); pg.locator(".modal .btn.primary").click(); pg.wait_for_timeout(300)
    ok(pg.evaluate("() => S().labels.length") == n0 + 1 and "WP10 testlabel" in pg.locator("#main .md-i[aria-current=true]").inner_text(), "labels: ‘Nieuw label’ voegt toe en selecteert")
    # rail
    pg.locator("#main .md-rail-btn").click(); pg.wait_for_timeout(250)
    w = pg.evaluate("() => document.querySelector('#main .md-side').getBoundingClientRect().width")
    ok(pg.locator("#main .md.rail").count() == 1 and w < 90 and pg.locator("#main .md-rail-btn").get_attribute("aria-expanded") == "false", f"labels: lijst inklapbaar tot rail ({w:.0f}px)")
    ok(pg.evaluate("() => document.activeElement && document.activeElement.classList.contains('md-rail-btn')"), "labels: focus blijft op de inklapknop")
    pg.locator("#main .md-rail-btn").click(); pg.wait_for_timeout(250)
    ok(pg.locator("#main .md.rail").count() == 0, "labels: lijst weer uitklappen")
    go(pg, "labels", lab[0]); pg.evaluate("() => { UI.labelTab = 'scope'; App.render(); }"); pg.wait_for_timeout(150)
    ok(pg.locator("#main [data-bind$=':displayName']").count() == 0 and "Naam en beschrijving" not in pg.locator("#main").inner_text(), "labels: geen weergavenaamveld meer in ‘Naam en beschrijving’")
    ok(pg.locator("#main .lb-main .ws-sec, #main .lb-main section, #main .lb-main h3").filter(has_text="Beschrijving").count() >= 1, "labels: blok heet nu ‘Beschrijving’")
    ren_checks(pg, "labels")

    md_checks(pg, "policies", "Generator.labelPolicies(S()).map(g => g.id)")
    pid = pg.evaluate("() => Generator.labelPolicies(S())[1].id")
    long = "Labelbeleid voor HR-medewerkers en directiesecretariaat Noord"
    ok(len(long) >= 60, "testnaam heeft 60+ tekens")
    pg.evaluate(f"() => Store.update(st => {{ st.labelPolicies.find(x => x.id === {json.dumps(pid)}).name = {json.dumps(long)}; }})")
    go(pg, "policies", pid)
    ok(pg.locator(f"#main #lp-name-{pid}").count() == 0 and pg.locator("#main .lp-name, #main input[data-bind^='lp:'][data-bind$=':name']").count() == 0, "policies: geen naamveld meer bovenaan het detail")
    nm = pg.locator("#main .lp-head .md-dh-t")
    dims = nm.evaluate("e => [e.textContent, e.scrollWidth, e.clientWidth]")
    ok(dims[0] == long and dims[1] <= dims[2] + 1, f"policies: kop toont een naam van {len(long)} tekens volledig {dims[1:]}")
    ok(pg.locator("#main .lp-head [data-action=lp-dup]").count() == 1 and pg.locator("#main .lp-head [data-action=lp-del]").count() == 1, "policies: kopiëren en verwijderen blijven in de kop")
    ok(pg.locator("#main .md-detail .lp-pv-col .lp-pv").count() == 1, "policies: voorbeeld blijft naast het beleid")
    ok(pg.locator(f"#main .md-i[data-id='{pid}'] .md-mark").inner_text().strip() == "2", "policies: volgorde zichtbaar in de lijst")
    n0 = pg.evaluate("() => S().labelPolicies.length")
    pg.locator("#main .md-add[data-action=lp-add]").click(); pg.wait_for_timeout(200)
    ok(pg.locator(".modal").count() == 1, "policies: ‘Nieuw beleid’ opent het bestaande dialoog")
    pg.keyboard.press("Escape"); pg.wait_for_timeout(150)
    ren_checks(pg, "policies")

    pg.evaluate("() => Store.update(st => { applicableLabels(st).filter(l => l.cfg.scope.files).slice(-3).forEach(l => { const sv = l.cfg.autolabel.service; sv.enabled = true; sv.mode = 'simulation'; sv.sharepoint = true; }); })")
    al = md_checks(pg, "autolabel", "applicableLabels(S()).filter(l => (l.cfg.scope.files || l.cfg.scope.emails) && l.cfg.autolabel.service.enabled).map(l => l.id)")
    ok(pg.locator("#main .md-detail [data-action=al-remove]").count() == 1 and pg.locator("#main .md-add[data-action=al-add]").count() == 1, "autolabel: detail en ‘Nieuwe policy’ aanwezig")
    ren_checks(pg, "autolabel")
    # eigen naam komt in de export (generator → PowerShell) en blijft na normalisatie
    aid = pg.evaluate("() => document.querySelector('#main .md-i.on').dataset.id")
    pg.locator("#main .md-i.on").focus(); pg.keyboard.press("F2"); pg.keyboard.press("Control+a"); pg.keyboard.type("AL eigen naam ‘test’"); pg.keyboard.press("Enter"); pg.wait_for_timeout(250)
    ok(pg.evaluate("(i) => labelById(i).cfg.autolabel.service.name", aid) == "AL eigen naam ‘test’", "autolabel: eigen naam in het model")
    ps = pg.evaluate("() => { const r = PsExport.build(S()); return typeof r === 'string' ? r : JSON.stringify(r); }")
    ok("AL eigen naam" in ps, "autolabel: eigen naam in de PowerShell-export")
    ok(pg.evaluate("(i) => normalizeState(JSON.parse(JSON.stringify(S()))).labels.find(l => l.id === i).cfg.autolabel.service.name", aid) == "AL eigen naam ‘test’", "autolabel: naam overleeft normalisatie")
    ok(pg.evaluate("() => { const s = JSON.parse(JSON.stringify(S())); s.labels[0].cfg.autolabel.service.name = '  ' + 'x'.repeat(90) + '  '; const n = normalizeState(s).labels[0].cfg.autolabel.service.name; const s2 = JSON.parse(JSON.stringify(S())); s2.labels[0].cfg.autolabel.service.name = {a:1}; return [n.length, 'name' in normalizeState(s2).labels[0].cfg.autolabel.service]; }") == [64, False], "autolabel: naam genormaliseerd en begrensd")
    pg.keyboard.press("Control+z"); pg.wait_for_timeout(250)
    # nieuwe policy: direct hernoemen
    pg.locator("#main .md-add[data-action=al-add]").click(); pg.wait_for_timeout(200)
    pg.locator(".menu [role=menuitem], .menu button").first.click(); pg.wait_for_timeout(400)
    r = ren_input(pg)
    ok(r is not None and "Auto" in r[0], f"autolabel: nieuwe policy start direct met hernoemen {r}")
    pg.keyboard.press("Escape"); pg.wait_for_timeout(150)
    pg.close()

    # Rail: hernoemen via de kop
    pg = page(b)
    pg.evaluate("() => Store.update(st => { applicableLabels(st).filter(l => l.cfg.scope.files).slice(-2).forEach(l => { l.cfg.autolabel.service.enabled = true; }); })")
    for r in ("labels", "policies", "autolabel"):
        go(pg, r)
        pg.locator("#main .md-rail-btn").click(); pg.wait_for_timeout(250)
        head_ren(pg, r, "rail")
        pg.locator("#main .md-rail-btn").click(); pg.wait_for_timeout(250)
    pg.close()

    # Donker thema en beamer: geen fouten, lijst blijft links
    for theme, beamer in (("dark", False), ("light", True)):
        pg = page(b, theme=theme)
        pg.evaluate(f"() => {{ Prefs.set('beamer', {str(beamer).lower()}); App.render(); }}")
        for r in ("labels", "policies", "autolabel"):
            go(pg, r)
            if pg.locator("#main .md").count():
                g = pg.evaluate("() => { const s = document.querySelector('#main .md-side').getBoundingClientRect(), d = document.querySelector('#main .md-detail').getBoundingClientRect(); return [s.right <= d.left + .5, document.getElementById('main').scrollWidth - document.getElementById('main').clientWidth]; }")
                ok(g[0] and g[1] <= 1, f"{r} {theme}{' beamer' if beamer else ''}: lijst links, geen overflow {g}")
        pg.close()

    # Smal: 900 en 375
    for w in (900, 375):
        pg = page(b, w=w)
        for r in ("labels", "policies", "autolabel"):
            go(pg, r)
            ovf = pg.evaluate("() => [document.documentElement.scrollWidth - document.documentElement.clientWidth, document.getElementById('main').scrollWidth - document.getElementById('main').clientWidth]")
            ok(max(ovf) <= 1, f"{r} {w}: geen horizontale overflow {ovf}")
            if pg.locator("#main .md").count():
                lst, sel = pg.locator("#main .md-list").is_visible(), pg.locator("#main .md-sel").is_visible()
                ok(lst != sel, f"{r} {w}: óf lijst óf keuzelijst zichtbaar (lijst={lst}, keuzelijst={sel})")
                if w == 375:
                    ok(sel, f"{r} 375: lijst wordt een keuzelijst bovenaan")
                    g = pg.evaluate("() => { const s = document.querySelector('#main .md-sel').getBoundingClientRect(), d = document.querySelector('#main .md-detail').getBoundingClientRect(); return [s.bottom, d.top]; }")
                    ok(g[0] <= g[1] + .5, f"{r} 375: keuzelijst boven het detail {g}")
                if w == 900:
                    if sel:
                        head_ren(pg, r, "900")
                        pg.locator("#main .md-sel").focus(); pg.keyboard.press("F2"); pg.wait_for_timeout(100)
                        ok(ren_input(pg) is not None, f"{r} 900: F2 op de keuzelijst hernoemt via de kop")
                        pg.keyboard.press("Escape"); pg.wait_for_timeout(100)
                    else:
                        ren_checks(pg, r)
        go(pg, "policies")
        opts = pg.evaluate("() => [...document.querySelectorAll('#main .md-sel option')].map(o => o.value)")
        if w == 375 and len(opts) > 1:
            pg.select_option("#main .md-sel", opts[1]); pg.wait_for_timeout(250)
            ok(pg.evaluate("() => UI.sub.policies") == opts[1] and pg.evaluate("() => document.activeElement && document.activeElement.classList.contains('md-sel')"), "policies 375: keuzelijst wisselt het beleid, focus blijft")
        pg.close()

    # Lege staat
    pg = page(b)
    pg.evaluate("() => Store.update(st => { st.labels = []; st.labelPolicies = []; })")
    for r in ("labels", "policies", "autolabel"):
        go(pg, r)
        ok(pg.locator("#main .md").count() == 0 and pg.locator("#main .empty, #main .empty-state").count() >= 1, f"{r}: lege staat zonder labels")
    pg.evaluate("() => Store.replace(buildPresetState('generic', {customer:'T'}))")
    pg.evaluate("() => Store.update(st => { st.labels.forEach(l => { l.cfg.autolabel.service.enabled = false; }); })")
    go(pg, "autolabel")
    ok(pg.locator("#main .md").count() == 0 and pg.locator("#main [data-action=al-add]").count() == 1, "autolabel: lege staat zonder policies met knop")
    pg.close()
    b.close()

ok(not ERRS, f"geen JS-fouten {ERRS[:5]}")
print(f"\n{len(FAILS)} fouten")
sys.exit(1 if FAILS else 0)
