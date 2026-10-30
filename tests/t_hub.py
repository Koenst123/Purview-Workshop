"""Purview Experience Hub: Hub, Ervaar Purview, Academy, isolatie van de Workshop-state en responsieve schermen."""
from pathlib import Path
import sys
from playwright.sync_api import sync_playwright

app_path = Path(sys.argv[1])
out = Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
errors, console, external_requests = [], [], []
BAD_TEXT = ["undefined", "NaN", "[object Object]", "${", "kon niet worden weergegeven"]


def clean_text(page, where):
    text = page.locator("#main").inner_text()
    for bad in BAD_TEXT:
        assert bad not in text, (where, bad)


with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 1000})
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("console", lambda msg: console.append(f"{msg.type}: {msg.text}") if msg.type in ("error", "warning") else None)
    page.on("request", lambda request: external_requests.append(request.url) if request.url.startswith(("http:", "https:")) else None)
    page.goto(app_path.resolve().as_uri())
    page.wait_for_function("typeof App !== 'undefined' && !!Store.state")
    E = page.evaluate

    def go(route, sub=""):
        E("([r, s]) => Site.go(r, s)", [route, sub])
        page.wait_for_timeout(40)

    # ---------- Hub ----------
    assert E("UI.route") == "hub"
    assert E("document.querySelector('#app').classList.contains('journey')")
    assert page.locator("#site-nav .site-link").count() == 4
    assert E("[...document.querySelectorAll('#site-nav .site-link')].map(a => a.dataset.route).join()") == "hub,experience,academy,start"
    assert page.locator('#site-nav .site-link[aria-current="page"]').get_attribute("data-route") == "hub"
    assert not page.locator("#tb-tools").is_visible()
    assert page.locator("#site-nav .site-dd").count() == 2, "Ervaar en Leer hebben een uitklapmenu"
    assert page.locator("#site-nav .site-dd-panel:not([hidden])").count() == 0
    assert page.locator(".h-hero .h-art").count() == 1
    assert page.locator(".h-entry").count() == 3
    for cls in ["experience", "academy", "design"]:
        assert page.locator(f".h-entry-{cls}").count() == 1, cls
    assert f"{E('CATALOG.experience.roles.length')} werkdagen" in page.locator(".h-entry-experience").inner_text()
    assert page.locator(".a-tech").count() == 0
    assert page.locator(".h-hero .s-hero-ctas a").count() == 2
    assert E("Array.from(document.querySelectorAll('.h-hero .s-hero-ctas a')).every(e=>e.getBoundingClientRect().bottom < innerHeight)")
    pillars = E("CATALOG.hub.pillars.map(p => p.id)")
    assert len(pillars) == 4 and page.locator(".h-flow-tab").count() == 4
    for pid in pillars:
        page.locator(f'.h-flow-tab[data-id="{pid}"]').click()
        assert page.locator(f'.h-flow-tab[data-id="{pid}"]').get_attribute("aria-selected") == "true"
        assert page.locator("#h-flow-panel").get_attribute("aria-labelledby") == f"h-tab-{pid}"
    # Toetsenbord: pijltje naar de volgende tab, Enter activeert, de focus blijft op de tab.
    page.locator(f'.h-flow-tab[data-id="{pillars[0]}"]').click()
    page.keyboard.press("ArrowRight")
    assert E("document.activeElement.dataset.id") == pillars[1]
    page.keyboard.press("Enter")
    assert page.locator(f'.h-flow-tab[data-id="{pillars[1]}"]').get_attribute("aria-selected") == "true"
    assert E("document.activeElement.dataset.id") == pillars[1]
    assert page.locator('#main a[href^="http"]:not([target="_blank"])').count() == 0
    clean_text(page, "hub")

    # ---------- Workshop-state vastleggen; Hub, Ervaar en Leer mogen die niet raken ----------
    snapshot_js = """() => ({
      state: JSON.stringify(S()), rev: Store.rev, past: Store.past.length,
      stored: localStorage.getItem(STORAGE_KEY), session: JSON.stringify(sessionStorage)
    })"""
    E("""() => {
      Store.replace(buildPresetState('zorg'), false);
      Store.update(st => { st.meta.customer = 'SYNTHETIC-CUSTOMER'; st.decisions = [{ id: 'hub-test', status: 'open', text: 'SYNTHETIC-DECISION' }]; });
      Store.saveLocal.flush();
      sessionStorage.setItem(ACK_KEY, '1');
    }""")
    before = E(snapshot_js)
    unchanged_js = """(b) => JSON.stringify(S()) === b.state && Store.rev === b.rev && Store.past.length === b.past
      && localStorage.getItem(STORAGE_KEY) === b.stored && JSON.stringify(sessionStorage) === b.session"""

    # ---------- Hoofdnavigatie: uitklapmenu (disclosure) met toetsenbord ----------
    go("experience", "intro")
    assert page.locator('[data-action="xp-roles"]').count() == 1
    assert page.locator('.x-intro-actions [data-sub="library"]').count() == 1
    assert not page.locator("#tb-tools").is_visible(), "geen tweede balk in Ervaar"
    btn = page.locator('#site-nav .site-dd-btn[data-route="experience"]')
    assert btn.get_attribute("aria-current") == "true" and btn.get_attribute("aria-expanded") == "false"
    btn.click()
    assert btn.get_attribute("aria-expanded") == "true" and page.locator("#dd-experience").is_visible()
    assert "Werkdagen" in page.locator('#dd-experience [aria-current="page"]').inner_text()
    page.keyboard.press("Escape")
    assert btn.get_attribute("aria-expanded") == "false" and page.locator("#dd-experience").is_hidden()
    assert E("document.activeElement.dataset.route") == "experience"
    page.keyboard.press("ArrowDown")
    assert btn.get_attribute("aria-expanded") == "true" and E("document.activeElement.dataset.sub") == "intro"
    page.keyboard.press("ArrowDown")
    assert E("document.activeElement.dataset.sub") == "library"
    page.keyboard.press("Enter")
    assert E("UI.route") == "experience" and E("UI.sub.experience") == "library"
    assert page.locator("#dd-experience").is_hidden()
    assert "Scenario's" in page.locator('#dd-experience [aria-current="page"]').text_content()
    page.locator('#site-nav .site-dd-btn[data-route="academy"]').click()
    page.mouse.click(5, 900)
    assert page.locator("#dd-academy").is_hidden(), "klik buiten het menu sluit het"

    # ---------- Ervaar Purview: losstaande scenario's ----------
    sectors = E("CATALOG.xpScenarios.sectors.map(s => s.id)")
    assert sectors == ["generic", "zorg", "overheid", "financieel"]
    for sec in sectors:
        go("experience", "library/" + sec)
        n = E("(s) => CATALOG.xpScenarios.items.filter(x => x.sector === s).length", sec)
        assert n >= 5 and page.locator(".xs-card").count() == n, sec
        assert page.locator(".xs-sec.on").count() == 1 and page.locator(".xs-sec-art").count() == 4, sec
        assert page.locator(".xs-card .xs-outcome").count() == 0, "kaarten verraden de uitkomst niet"
    page.locator(".xs-chan").nth(1).click()
    assert E("XP.lib.channel") != "all" and E("document.activeElement.classList.contains('xs-chan')")
    page.locator('.xs-chan[data-id="all"]').click()
    assert E("XP.lib.channel") == "all"
    cards = page.locator(".xs-card")
    picked = cards.nth(1).get_attribute("data-sub")
    cards.nth(1).click()
    assert E("UI.sub.experience") == picked and E("XP.lib.step") == 1
    assert E("document.activeElement.tagName") == "H1"
    assert page.locator(".xs-guide li.on").inner_text().strip().endswith("Situatie")
    assert page.locator(".xs-outcome").count() == 0 and page.locator(".xs-stage .s-device").count() == 1
    page.locator('[data-action="xp-lib-guess"][data-v="block"]').click()
    assert E("XP.lib.guess") == "block"
    assert page.locator('[data-action="xp-lib-guess"][data-v="block"]').get_attribute("aria-pressed") == "true"
    page.locator('.xs-stepnav [data-action="xp-lib-go"][data-step="2"]').click()
    assert E("XP.lib.step") == 2 and E("document.activeElement.id") == "x-lib-step-h"
    assert page.locator(".xs-outcome").count() == 1 and page.locator(".xs-fb").count() == 1
    assert E("XP.seen.includes(XP.lib.id)")
    assert E("JSON.parse(localStorage.getItem(STORAGE_KEY + '-learning')).entries.scenarios.data.seen.includes(XP.lib.id)")
    page.locator('.xs-guide [data-action="xp-lib-go"][data-step="3"]').click()
    assert E("XP.lib.step") == 3
    assert page.locator(".xs-feats li").count() >= 1 and page.locator(".xs-lesson").count() == 1
    clean_text(page, "situatie")
    first = E("XP.lib.id")
    page.locator(".xs-stepnav .a-step-btn.next").click()
    assert E("XP.lib.id") != first and E("XP.lib.step") == 1 and E("XP.lib.guess") == ""
    page.go_back()
    page.wait_for_timeout(60)
    assert E("XP.lib.id") == first
    assert E("HubRouter.parse('#experience/library/zorg/' + CATALOG.xpScenarios.items.find(s => s.sector === 'generic').id)") is None
    assert E("HubRouter.parse('#experience/library/onbekend')") is None
    go("experience", picked.rsplit("/", 1)[0])
    assert page.locator(".xs-card.done").count() >= 1
    clean_text(page, "bibliotheek")
    assert E(unchanged_js, before), "Ervaar Purview wijzigde de Workshop-state"

    # ---------- Naar de ontwerpworkshop en terug ----------
    go("hub")
    page.locator('#site-nav .site-link[data-route="start"]').click()
    assert E("UI.route") == "start"
    assert not E("document.querySelector('#app').classList.contains('journey')")
    assert page.locator("#main h1").inner_text() == "Jouw informatiebescherming"
    assert page.locator("#sidenav .nav-item").count() > 3
    assert page.locator("#site-nav .site-link").count() == 4 and page.locator("#tb-tools").is_visible()
    assert page.locator('#site-nav .site-link[aria-current="page"]').get_attribute("data-route") == "start"
    assert page.locator("#tb-title").text_content().strip() == "Ontwerpworkshop"
    page.locator("#topbar .brand").click()
    assert E("UI.route") == "hub"
    page.locator('#site-nav .site-link[data-route="academy"]').click()
    page.locator('#dd-academy [data-sub="home"]').click()
    assert E("UI.route") == "academy"
    norm = """document.querySelector('#site-nav').innerHTML.replace(/ on"/g, '"').replace(/ aria-current="(page|true)"/g, '').replace(/<a class="site-dd-resume"[\\s\\S]*?<\\/a>/g, '')"""
    nav_html = E(norm)
    for route, sub in [("hub", ""), ("experience", "intro"), ("experience", "library"), ("academy", "lessons"), ("academy", "path/begrijpen"), ("start", "")]:
        go(route, sub)
        assert E(norm) == nav_html, route
        assert page.locator('#site-nav [aria-current="page"]').count() == 1, route
    go("academy", "home")

    # ---------- Responsief: licht en donker, 320/900/1440, geen horizontale overloop ----------
    modules = E("CATALOG.academy.modules.map(m => m.id)")
    pages = [("hub", ""), ("experience", "intro"), ("experience", "day"), ("experience", "finale"), ("experience", "library"),
             ("experience", "role/specialist"), ("academy", "home"), ("academy", "lessons"), ("academy", "path/begrijpen"), ("academy", "glossary")]
    pages += [("academy", "lesson/" + m + "/practice") for m in modules]
    shots = {("hub", ""), ("experience", "intro"), ("experience", "day"), ("academy", "home"), ("academy", "lesson/dlp/practice")}
    combos = 0
    for theme in ["light", "dark"]:
        E("(t) => { Prefs.v.theme = t; Prefs.apply(); }", theme)
        for width in [320, 900, 1440]:
            page.set_viewport_size({"width": width, "height": 1000})
            for route, sub in pages:
                go(route, sub)
                overflow = E("""() => ({
                  main: document.querySelector('#main').scrollWidth - document.querySelector('#main').clientWidth,
                  document: document.documentElement.scrollWidth - innerWidth
                })""")
                assert overflow["main"] <= 1 and overflow["document"] <= 1, (route, sub, theme, width, overflow)
                combos += 1
                if (route, sub) in shots:
                    page.screenshot(path=str(out / f"{route}-{sub.replace('/', '-') or 'main'}-{theme}-{width}.png"), animations="disabled")
    for theme in ["light", "dark"]:
        for width, zoom, beamer in [(900, 150, False), (320, 150, False), (900, 100, True)]:
            page.set_viewport_size({"width": width, "height": 1000})
            E("""([t,z,b]) => {
                Object.assign(Prefs.v,{theme:t,uiZoom:z,beamer:b,calm:true});
                Prefs.apply();
            }""", [theme, zoom, beamer])
            assert E("reducedMotion()")
            for route, sub in [("hub", ""), ("academy", "path/begrijpen"),
                               ("academy", "lesson/dlp/practice"), ("experience", "day/care/care-overdracht")]:
                go(route, sub)
                overflow = E("""() => ({
                    main:document.querySelector('#main').scrollWidth-document.querySelector('#main').clientWidth,
                    document:document.documentElement.scrollWidth-innerWidth
                })""")
                assert max(overflow.values()) <= 1, (theme, width, zoom, beamer, route, sub, overflow)
                assert E("document.activeElement.tagName") == "H1"
                if route == "hub":
                    assert E("""document.querySelector('.s-stats').getBoundingClientRect().top >=
                        Math.max(...[...document.querySelectorAll('.h-entry')].map(e=>e.getBoundingClientRect().bottom))""")
                combos += 1
    assert E("(saved) => localStorage.getItem(STORAGE_KEY) === saved", before["stored"])

    assert not errors, errors
    assert not console, console
    assert not external_requests, external_requests
    browser.close()

print(f"Hub, bibliotheek, Workshop-navigatie en {combos} responsieve combinaties OK")
