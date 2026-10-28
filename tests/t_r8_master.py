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

    md_checks(pg, "policies", "Generator.labelPolicies(S()).map(g => g.id)")
    pid = pg.evaluate("() => Generator.labelPolicies(S())[1].id")
    long = "Labelbeleid voor HR-medewerkers en directiesecretariaat Noord"
    ok(len(long) >= 60, "testnaam heeft 60+ tekens")
    pg.evaluate(f"() => Store.update(st => {{ st.labelPolicies.find(x => x.id === {json.dumps(pid)}).name = {json.dumps(long)}; }})")
    go(pg, "policies", pid)
    nm = pg.locator(f"#main #lp-name-{pid}")
    dims = nm.evaluate("e => [e.value, e.scrollWidth, e.clientWidth]")
    ok(dims[0] == long and dims[1] <= dims[2], f"policies: naamveld toont een naam van {len(long)} tekens volledig {dims[1:]}")
    geo = pg.evaluate("() => { const n = document.querySelector('#main .lp-name').getBoundingClientRect(), m = document.querySelector('#main .lp-main').getBoundingClientRect(); return [n.width, m.width]; }")
    ok(geo[0] > geo[1], f"policies: naamveld breder dan de instellingenkolom {geo}")
    ok(pg.locator("#main .md-detail .lp-pv-col .lp-pv").count() == 1, "policies: voorbeeld blijft naast het beleid")
    ok(pg.locator(f"#main .md-i[data-id='{pid}'] .md-mark").inner_text().strip() == "2", "policies: volgorde zichtbaar in de lijst")
    n0 = pg.evaluate("() => S().labelPolicies.length")
    pg.locator("#main .md-add[data-action=lp-add]").click(); pg.wait_for_timeout(200)
    ok(pg.locator(".modal").count() == 1, "policies: ‘Nieuw beleid’ opent het bestaande dialoog")
    pg.keyboard.press("Escape"); pg.wait_for_timeout(150)

    pg.evaluate("() => Store.update(st => { applicableLabels(st).filter(l => l.cfg.scope.files).slice(-3).forEach(l => { const sv = l.cfg.autolabel.service; sv.enabled = true; sv.mode = 'simulation'; sv.sharepoint = true; }); })")
    al = md_checks(pg, "autolabel", "applicableLabels(S()).filter(l => (l.cfg.scope.files || l.cfg.scope.emails) && l.cfg.autolabel.service.enabled).map(l => l.id)")
    ok(pg.locator("#main .md-detail [data-action=al-remove]").count() == 1 and pg.locator("#main .md-add[data-action=al-add]").count() == 1, "autolabel: detail en ‘Nieuwe policy’ aanwezig")
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
