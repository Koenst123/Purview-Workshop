"""Ervaar Purview → Scenario's: los van het ontwerp, catalogusintegriteit, XSS-afweer, opslagnormalisatie en het menu op smalle schermen."""
from pathlib import Path
import sys
from playwright.sync_api import sync_playwright

app = Path(sys.argv[1]).resolve().as_uri()
errors = []
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 1000})
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(app)
    page.wait_for_function("typeof App !== 'undefined' && !!Store.state")
    E = page.evaluate
    E("sessionStorage.setItem(ACK_KEY,'1')")

    # ---------- Catalogus: volledig, geldig en gekoppeld aan bestaande lessen ----------
    report = E("""() => {
      const C = CATALOG.xpScenarios, ids = new Set(), bad = [];
      const LBL = Object.keys(CATALOG.experience.labels).concat(['none']);
      for (const s of C.items) {
        if (ids.has(s.id)) bad.push('dubbel ' + s.id); ids.add(s.id);
        if (!C.sectors.some(x => x.id === s.sector)) bad.push('sector ' + s.id);
        if (!Object.hasOwn(XS_CH, s.channel)) bad.push('kanaal ' + s.id);
        if (!Object.hasOwn(XS_OUT, s.outcome)) bad.push('uitkomst ' + s.id);
        if (!CATALOG.academy.modules.some(m => m.id === s.lesson)) bad.push('les ' + s.id);
        for (const k of ['title', 'teaser', 'story', 'result', 'why', 'value', 'next']) if (typeof s[k] !== 'string' || !s[k].trim()) bad.push(k + ' ' + s.id);
        // Een scenario noemt alleen de eigen hoofdpersoon bij naam, nooit die van een ander scenario.
        const own = s.person.name, txt = [s.teaser, s.story, s.result, s.why, s.value, s.note, s.next].join(' ');
        const names = new Set(C.items.map(o => o.person.name).concat(CATALOG.experience.roles.map(r => r.person.name)));
        for (const n of names) if (n !== own && new RegExp('\\\\b' + n + "(s|'s)?\\\\b").test(txt)) bad.push('naam ' + n + ' in ' + s.id);
        // Een blokkade laat altijd een veilige route zien.
        if (s.outcome === 'block' && !/\\b(deel|gebruik|stel|vraag|maak|lees|werk|regel)\\b/i.test(s.next)) bad.push('route ' + s.id);
        if (!s.features.length || s.features.some(f => !Object.hasOwn(XS_FEAT_IC, f.key))) bad.push('functie ' + s.id);
        for (const sc of [s.before, s.after]) {
          if (sc.label && !LBL.includes(sc.label)) bad.push('label ' + s.id);
          if (!XScene.render(sc)) bad.push('scherm ' + s.id);
        }
        if (/\\b(u|uw)\\b/.test([s.title, s.teaser, s.story, s.result, s.why, s.value, s.note].join(' '))) bad.push('u-vorm ' + s.id);
      }
      const perSector = C.sectors.map(sec => [sec.id, C.items.filter(s => s.sector === sec.id).map(s => s.outcome)]);
      return { bad, perSector, illu: C.sectors.every(s => !!BRAND_ASSETS[s.illu]) };
    }""")
    assert not report["bad"], report["bad"]
    assert report["illu"], "elke sector heeft een illustratie"
    for sec, outs in report["perSector"]:
        assert len(outs) >= 5 and all(o in outs for o in ["ok", "tip", "block"]), (sec, outs)

    # ---------- Los van het ontwerp: hetzelfde scenario ziet er bij elk ontwerp gelijk uit ----------
    first = E("CATALOG.xpScenarios.items[0]")
    url = f"library/{first['sector']}/{first['id']}"

    def render_all():
        out = []
        for step in (1, 2, 3):
            E("([u, k]) => { Site.go('experience', u); XP.lib.step = k; App.render(); }", [url, step])
            out.append(page.locator("#main .xs-step").inner_html())
        E("Site.go('experience', 'library/' + CATALOG.xpScenarios.items[0].sector)")
        out.append(page.locator("#main .xs-grid").inner_html())
        return out

    E("() => { Store.replace(buildPresetState('zorg'), false); Store.saveLocal.flush(); }")
    a = render_all()
    assert "xs-box-next" in a[2] and "xs-box-next" not in a[0], "stap 3 toont de veilige vervolgstap"
    E("() => { Store.replace(buildPresetState('overheid'), false); Store.update(st => { st.labels = []; st.dlp = st.dlp || {}; }); Store.saveLocal.flush(); }")
    snap = E("() => ({ s: JSON.stringify(S()), rev: Store.rev, past: Store.past.length, stored: localStorage.getItem(STORAGE_KEY) })")
    b = render_all()
    assert a == b, "scenario's veranderen niet mee met het ontwerp"
    assert E("(x) => JSON.stringify(S()) === x.s && Store.rev === x.rev && Store.past.length === x.past && localStorage.getItem(STORAGE_KEY) === x.stored", snap), "scenario's raken het ontwerp niet"
    assert page.locator("#main a[data-route='scenarios'], #main a[data-route='labels']").count() == 0, "geen links naar het ontwerp"

    # ---------- XSS: catalogustekst wordt altijd ge-escaped ----------
    E("""() => {
      const s = CATALOG.xpScenarios.items[0];
      window.__xss = 0;
      s.title = '<img src=x onerror="window.__xss=1">'; s.teaser = '<script>window.__xss=2<\\/script>';
      s.person.name = '"><svg onload="window.__xss=3">'; s.features[0].name = '<b onclick=1>x</b>';
      Site.go('experience', 'library/' + s.sector); XP.lib.step = 3; Site.go('experience', 'library/' + s.sector + '/' + s.id);
      for (const k of [1, 2, 3]) { XP.lib.step = k; App.render(); }
    }""")
    page.wait_for_timeout(100)
    assert E("window.__xss") == 0
    assert page.locator("#main img[src='x'], #main svg[onload], #main b[onclick]").count() == 0

    # ---------- Opslag: alleen geldige, bekende scenario-id's ----------
    norm = E("""() => xsNormalize({ seen: ['__proto__', 'bestaat-niet', 42, CATALOG.xpScenarios.items[1].id, CATALOG.xpScenarios.items[1].id], extra: 'x' })""")
    assert norm == {"seen": [E("CATALOG.xpScenarios.items[1].id")]}, norm
    assert E("xsNormalize(null)") == {"seen": []}

    # ---------- Smal (900 px): menuknop, Escape en focus ----------
    page.set_viewport_size({"width": 900, "height": 900})
    E("Site.go('hub')")
    page.wait_for_timeout(200)
    assert page.locator("#site-nav").is_hidden()
    menu_btn = page.locator('#site-actions [data-action="site-menu"]')
    assert menu_btn.is_visible() and menu_btn.get_attribute("aria-expanded") == "false"
    menu_btn.click()
    assert page.locator("#site-menu").is_visible() and E("document.activeElement.closest('#site-menu') !== null")
    assert page.locator("#site-menu .site-menu-item").count() == 5
    page.keyboard.press("Escape")
    assert page.locator("#site-menu").is_hidden()
    assert E("document.activeElement.dataset.action") == "site-menu"
    menu_btn.click()
    page.locator('#site-menu [data-sub="library"]').click()
    assert E("UI.route") == "experience" and E("UI.sub.experience") == "library"
    assert page.locator("#site-menu").is_hidden()
    overflow = E("document.documentElement.scrollWidth - innerWidth")
    assert overflow <= 1, overflow

    assert not errors, errors
    browser.close()
print("Scenario's los van het ontwerp, catalogus, XSS, opslag en smal menu OK")
