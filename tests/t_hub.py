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
    assert page.locator("#tb-tabs").is_hidden(), "Home heeft geen subnavigatie"
    assert page.locator(".h-hero .h-art").count() == 1
    assert page.locator(".h-entry").count() == 3
    for cls in ["experience", "academy", "design"]:
        assert page.locator(f".h-entry-{cls}").count() == 1, cls
    assert f"{E('CATALOG.experience.roles.length')} rollen" in page.locator(".h-entry-experience").inner_text()
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

    # ---------- Ervaar Purview: scenario's als begeleide flow ----------
    go("experience", "intro")
    assert page.locator('[data-action="xp-roles"]').count() == 1
    assert page.locator('.x-intro-actions [data-sub="library"]').count() == 1
    assert page.locator('#tb-tabs [aria-current="page"]').inner_text().strip() == "Werkdagen"
    go("experience", "library")
    assert page.locator('#tb-tabs [aria-current="page"]').inner_text().strip() == "Scenario's"
    assert page.locator(".x-guide li.on").inner_text().strip().endswith("Kies een situatie")
    sectors = E("CATALOG.experience.library.sectors.map(s => s.id)")
    assert len(sectors) >= 3
    for sec in sectors:
        page.locator(f'[data-action="xp-lib-sector"][data-id="{sec}"]').click()
        assert page.locator(".x-lib-item").count() > 0, sec
        assert page.locator(".x-story").count() == 0, sec
        assert page.locator(".x-lib-item .x-lib-feel").count() == page.locator(".x-lib-item").count(), sec
    page.locator('[data-action="xp-lib-channel"]').nth(1).click()
    assert E("XP.lib.channel") != "all"
    page.locator('[data-action="xp-lib-channel"][data-id="all"]').click()
    assert E("XP.lib.channel") == "all"
    items = page.locator(".x-lib-item")
    assert items.count() > 2
    picked = items.nth(1).get_attribute("data-id")
    items.nth(1).click()
    assert E("XP.lib.open") and E("XP.lib.id") == picked
    assert E("document.activeElement.id") == "x-lib-h"
    assert page.locator(".x-story .x-outcome").count() == 1
    assert page.locator(".x-story .x-lib-stage").count() == 1
    assert "Situatie 2/" in page.locator("#topbar-steps").inner_text()
    page.locator('[data-action="xp-lib-scene"][data-v="before"]').click()
    assert E("XP.lib.scene") == "before"
    assert page.locator('[data-action="xp-lib-scene"][data-v="before"]').get_attribute("aria-pressed") == "true"
    labels = page.locator(".x-label")
    assert labels.count() >= 2
    labels.nth(labels.count() - 1).click()
    assert page.locator(".x-label").nth(labels.count() - 1).get_attribute("aria-pressed") == "true"
    assert E("XP.lib.scene") == "after"
    assert page.locator(".x-steps-list li").count() > 0
    clean_text(page, "situatie")
    page.locator('#topbar-steps [data-action="xp-lib-step"][data-dir="1"]').click()
    assert "Situatie 3/" in page.locator("#topbar-steps").inner_text()
    third = E("XP.lib.id")
    page.locator('[data-action="xp-lib-back"]').click()
    assert not E("XP.lib.open")
    assert E("document.activeElement.dataset.id") == third
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
    assert page.locator("#tb-tabs").is_hidden()
    page.locator("#topbar .brand").click()
    assert E("UI.route") == "hub"
    page.locator('#site-nav .site-link[data-route="academy"]').click()
    assert E("UI.route") == "academy"
    nav_html = E("document.querySelector('#site-nav').innerHTML.replace(/ on\"/g, '\"').replace(/ aria-current=\"page\"/g, '')")
    for route, sub in [("hub", ""), ("experience", "intro"), ("experience", "library"), ("academy", "lessons"), ("academy", "path/begrijpen"), ("start", "")]:
        go(route, sub)
        assert E("document.querySelector('#site-nav').innerHTML.replace(/ on\"/g, '\"').replace(/ aria-current=\"page\"/g, '')") == nav_html, route
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
