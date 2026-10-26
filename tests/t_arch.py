import os as _os, pathlib as _pl, tempfile as _tf
_TD = _pl.Path(__file__).resolve().parents[1]  # repo-root met src, Voorbeelden en de deliverable
_OUT = _os.environ.get("PYD_TEST_OUT") or _os.path.join(_tf.gettempdir(), "pyd-tests", _pl.Path(__file__).stem)
_os.makedirs(_OUT, exist_ok=True)
"""Architectuur: interactie, links vanuit pagina's, density en screenshots (licht/donker)."""
import sys, pathlib
from playwright.sync_api import sync_playwright
HTML, SHOTS = sys.argv[1], pathlib.Path(sys.argv[2]); SHOTS.mkdir(parents=True, exist_ok=True)
fails = []
def check(name, ok, info=""):
    print(("PASS " if ok else "FAIL ") + name + (f"  [{info}]" if info else ""))
    if not ok: fails.append(name)

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1600, "height": 950})
    pg.set_default_timeout(5000)
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(pathlib.Path(HTML).as_uri()); pg.wait_for_timeout(400)
    E = pg.evaluate
    E("Store.replace(buildPresetState('zorg',{customer:'Test BV'}))")
    E("App.go('architectuur')"); pg.wait_for_timeout(300)
    n = pg.locator(".arch-block").count()
    check("blokken", n >= 25, n)
    check("5 kolommen", pg.locator(".ra-col").count() == 5)
    words = E("document.querySelector('#main, main, .main') ? (document.querySelector('#main, main, .main').innerText.split(/\\s+/).length) : 0")
    print("woorden op pagina (algemeen):", words)
    pg.screenshot(path=str(SHOTS / "arch-generic.png"), full_page=True)

    pg.click(".arch-block >> nth=7"); pg.wait_for_timeout(200)
    check("detail na klik", pg.locator(".arch-detail:not(.empty-hint)").count() == 1)
    check("blok sel", pg.locator(".arch-block.sel").count() == 1)

    pg.click("[data-action=arch-mode][data-mode=design]"); pg.wait_for_timeout(200)
    st = E("[...document.querySelectorAll('.arch-block .ab-state')].map(x=>x.innerText.trim())")
    check("ontwerpmodus toont status", len(st) >= 20 and all(s for s in st), len(st))
    bad = [s for s in st if any(k in s for k in ["undefined", "NaN", "[object"])]
    check("status-teksten schoon", not bad, bad[:3])
    print("statussen:", st[:12])
    pg.screenshot(path=str(SHOTS / "arch-design.png"), full_page=True)

    pg.select_option("select[data-action=arch-path]", index=1); pg.wait_for_timeout(200)
    check("rondleiding stappen", pg.locator(".arch-stepbtn").count() == 5)
    check("rondleiding markeert", pg.locator(".arch-block .ab-step").count() == 5)
    pg.click(".arch-stepbtn >> nth=2"); pg.wait_for_timeout(200)
    check("stap selecteert blok", pg.locator(".arch-block.sel .ab-step").count() == 1)
    pg.screenshot(path=str(SHOTS / "arch-path.png"), full_page=True)

    pg.select_option("select[data-action=arch-layer]", index=3); pg.wait_for_timeout(200)
    check("laagfilter dimt", pg.locator(".arch-block.dim").count() > 0)
    pg.focus("select[data-action=arch-tier]"); pg.select_option("select[data-action=arch-tier]", index=2); pg.wait_for_timeout(200)
    check("focus na select blijft", E("document.activeElement && document.activeElement.dataset.action") == "arch-tier")
    pg.click("[data-action=arch-reset]"); pg.wait_for_timeout(200)
    check("reset", pg.locator(".arch-block.dim").count() == 0 and pg.locator(".arch-stepbtn").count() == 0)

    # route-knop in detail
    pg.click(".arch-block >> nth=12"); pg.wait_for_timeout(200)
    go = pg.locator(".arch-detail [data-action=go]")
    if go.count():
        r = go.first.get_attribute("data-route"); go.first.click(); pg.wait_for_timeout(200)
        check("detail-knop navigeert", E("UI.route") == r, r)

    # links vanuit andere pagina's
    for route in ["schema", "sits", "board", "labels", "policies", "autolabel", "dlp", "endpoint", "copilot", "tenant"]:
        E(f"App.go('{route}')"); pg.wait_for_timeout(150)
        E("document.querySelectorAll('.page-head details.ph-more').forEach(d => d.open = true)")
        lk = pg.locator(".page-head .arch-link")
        if not lk.count(): check(f"link op {route}", False); continue
        want = lk.first.get_attribute("data-id"); lk.first.click(); pg.wait_for_timeout(200)
        ok = E("UI.route") == "architectuur" and pg.locator(f".arch-block.sel[data-id='{want}']").count() == 1
        check(f"link op {route} -> {want}", ok)

    E("App.go('start')"); pg.wait_for_timeout(200)
    check("start-knop", pg.locator("[data-route=architectuur]").count() >= 1)

    # dark + smal
    E("Prefs.set('theme','dark')"); E("UI.archMode='design';UI.archSel='pro-dlp';App.go('architectuur')"); pg.wait_for_timeout(300)
    pg.screenshot(path=str(SHOTS / "arch-dark.png"), full_page=True)
    pg.set_viewport_size({"width": 1100, "height": 900}); pg.wait_for_timeout(200)
    over = E("document.documentElement.scrollWidth > window.innerWidth + 2")
    check("geen horizontale pagina-scroll op 1100px", not over)
    pg.screenshot(path=str(SHOTS / "arch-narrow.png"), full_page=False)
    E("Store.replace(buildPresetState('empty',{customer:'X'}))"); E("UI.archMode='design';App.go('architectuur')"); pg.wait_for_timeout(200)
    check("leeg ontwerp ok", pg.locator(".arch-block").count() >= 25)

    # pariteit origineel + herontwerp
    pg.set_viewport_size({"width": 1600, "height": 950}); E("Prefs.set('theme','light')")
    E("UI.archMode='general';UI.archTab='arch';UI.archSel=null;UI.archPath=null;App.go('architectuur')"); pg.wait_for_timeout(200)
    pg.click(".arch-block[data-id='cls-sit']"); pg.wait_for_timeout(200)
    chips = pg.locator(".arch-detail .ad-chip[data-id]")
    check("relatiechips in detail", chips.count() >= 2, chips.count())
    check("upstream/downstream gemarkeerd", pg.locator(".arch-block.up, .arch-block.down").count() >= 2)
    E("document.querySelectorAll('.arch-detail details').forEach(d => d.open = true)")
    check("Ziet/Kan/Kan niet", pg.locator(".arch-detail .ad-tech dt").count() == 3)
    tgt = chips.first.get_attribute("data-id"); chips.first.click(); pg.wait_for_timeout(200)
    check("relatiechip selecteert", pg.locator(f".arch-block.sel[data-id='{tgt}']").count() == 1, tgt)
    # switcher houdt selectie vast en wisselt
    sw = pg.locator(".ra-side select[data-action=sw-pick]")
    check("switcher aanwezig", sw.count() == 1)
    check("switcher toont selectie", sw.input_value() == tgt, sw.input_value())
    pg.click(".ra-side .sw-step:not([disabled]) >> nth=-1"); pg.wait_for_timeout(200)
    cur = E("UI.archSel")
    check("switcher wisselt blok", cur and cur != tgt and pg.locator(f".arch-block.sel[data-id='{cur}']").count() == 1, cur)
    E("Prefs.set('pickerMode','list')"); E("App.go('architectuur')"); pg.wait_for_timeout(200)
    check("lijstmodus behoudt selectie", E("UI.archSel") == cur and pg.locator(".arch-detail:not(.empty-hint)").count() == 1)
    E("Prefs.set('pickerMode','compact')")
    # leeg vlak wist selectie, Esc reset
    pg.click(".ra-grid", position={"x": 5, "y": 5}); pg.wait_for_timeout(200)
    check("klik op lege ruimte wist selectie", pg.locator(".arch-block.sel").count() == 0)
    pg.click(".arch-block >> nth=3"); pg.select_option("select[data-action=arch-layer]", index=2); pg.wait_for_timeout(200)
    check("lensregel", pg.locator(".ra-lens").count() == 1)
    pg.locator("body").press("Escape"); pg.wait_for_timeout(200)
    check("Esc reset", pg.locator(".arch-block.dim").count() == 0 and pg.locator(".arch-block.sel").count() == 0)
    pg.click("[data-action=arch-dense]"); pg.wait_for_timeout(200)
    check("alleen titels", E("[...document.querySelectorAll('.arch-block .ab-nl')].every(x => getComputedStyle(x).display === 'none')"))
    pg.click("[data-action=arch-dense]"); pg.click("[data-action=arch-legend]"); pg.wait_for_timeout(200)
    check("legenda", pg.locator("#ra-legend").count() == 1)
    # platen
    pg.click("[data-action=arch-tab][data-tab=plates]"); pg.wait_for_timeout(200)
    svgs = pg.locator("svg.dg[role=img][aria-label]")
    check("4 eigen platen met role/aria", svgs.count() == 4, svgs.count())
    msimgs = pg.locator(".ra-plate.is-ms img.ra-msimg")
    check("4 Microsoft-diagrammen", msimgs.count() == 4, msimgs.count())
    check("8 platen totaal", pg.locator(".ra-plate").count() == 8)
    # geen willekeurige markering bij eerste weergave
    check("geen markering op platen-tab", pg.locator(".dg-p.on, .dg.has-hl").count() == 0 and E("ARCH_DIAGRAMS.every(d => !d.svg || !/dg-accent/.test(d.svg))"))
    # bronvermelding bij elk Microsoft-diagram (kaart)
    ms_cards = E("""[...document.querySelectorAll('.ra-plate.is-ms')].map(f => ({id: f.dataset.plate, t: f.innerText,
        url: (ARCH_DIAGRAMS.find(d => d.id === f.dataset.plate) || {credit:{}}).credit.url}))""")
    bad_cred = [c["id"] for c in ms_cards if not (c["url"] and c["url"].startswith("https://learn.microsoft.com/") and c["url"] in c["t"] and "© Microsoft" in c["t"] and "CC BY 4.0" in c["t"] and "Microsoft Learn" in c["t"])]
    check("bronvermelding op elke Microsoft-kaart", len(ms_cards) == 4 and not bad_cred, bad_cred)
    # SVG-sanering: data en DOM
    san = E(r"""(() => { const bad = [];
        ARCH_DIAGRAMS.forEach(d => { const s = d.svg || ""; if (/<script|<foreignObject|\son[a-z]+\s*=|javascript:|<iframe|<use[^>]+href\s*=\s*["'](?!#|data:)/i.test(s)) bad.push(d.id);
          (s.match(/href\s*=\s*["'][^"']*/gi) || []).forEach(h => { if (!/["'](data:image\/|#)/i.test(h)) bad.push(d.id + ':' + h.slice(0, 40)); }); });
        document.querySelectorAll('svg.dg').forEach(svg => { if (svg.querySelector('script, foreignObject, iframe')) bad.push('dom-el');
          svg.querySelectorAll('*').forEach(el => [...el.attributes].forEach(a => { if (/^on/i.test(a.name)) bad.push('dom-on:' + a.name);
            if (/href$/i.test(a.name) && !/^(data:image\/|#)/i.test(a.value)) bad.push('dom-href'); })); });
        return bad; })()""")
    check("SVG-platen gesaneerd (geen script/on*/foreignObject/externe href)", not san, san[:4])
    # afbeeldingsbudget: elk <=150 KB, totaal <=600 KB, alleen raster data-URI's
    sizes = E("Object.entries(ARCH_IMAGES).map(([k, v]) => [k, v.length, /^data:image\\/(webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(v)])")
    check("Microsoft-afbeeldingen zijn raster data-URI's", all(s[2] for s in sizes) and len(sizes) == 4, [s[0] for s in sizes if not s[2]])
    check("afbeelding <= 150 KB", all(s[1] <= 150 * 1024 for s in sizes), [(s[0], s[1]) for s in sizes])
    check("totaal afbeeldingen <= 600 KB", sum(s[1] for s in sizes) <= 600 * 1024, sum(s[1] for s in sizes))
    print("afbeeldingsgrootte (bytes):", sizes and [(s[0], s[1]) for s in sizes])
    # Microsoft-plaat in modal: afbeelding, alt, bronvermelding
    pg.click(".ra-plate.is-ms [data-action=arch-plate] >> nth=0"); pg.wait_for_timeout(250)
    mb = pg.locator(".modal .modal-body")
    check("Microsoft-plaat vergroot in modal", E("!!Modal.cur") and mb.locator("img.ra-msimg[alt]").count() == 1 and len(mb.locator("img.ra-msimg").get_attribute("alt")) > 20)
    t = mb.inner_text()
    check("bronvermelding Microsoft-plaat in modal", "Bron: Microsoft Learn" in t and "© Microsoft" in t and "CC BY 4.0" in t and "https://learn.microsoft.com/" in t)
    check("Nederlandse uitleg bij Microsoft-plaat", mb.locator(".ra-parts li").count() >= 3)
    lk = mb.locator("a[href^='https://learn.microsoft.com/']")
    check("Learn-link veilig", lk.count() >= 1 and "noopener" in (lk.first.get_attribute("rel") or "") and lk.first.get_attribute("target") == "_blank")
    pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
    # eigen plaat in modal: geen markering tot de gebruiker kiest
    pg.click(".ra-plate:not(.is-ms) [data-action=arch-plate] >> nth=0"); pg.wait_for_timeout(250)
    check("plaat vergroot in modal", E("!!Modal.cur") and pg.locator(".ra-zoom svg.dg").count() == 1)
    check("bronvermelding plaat", "Gebaseerd op Microsoft Learn" in pg.locator(".modal .modal-body").inner_text())
    check("geen markering bij openen", pg.locator(".modal .dg-p.on, .modal .dg.has-hl, .modal .ra-part.on").count() == 0)
    parts = pg.locator(".modal .ra-part")
    check("onderdelenlijst", parts.count() >= 4, parts.count())
    k2 = parts.nth(1).get_attribute("data-k"); parts.nth(1).click(); pg.wait_for_timeout(150)
    on = E("[...document.querySelectorAll('.modal .dg-p.on')].map(g => g.dataset.k)")
    check("klik markeert alleen gekozen onderdeel", on and all(k2 in x.split() for x in on) and parts.nth(1).get_attribute("aria-pressed") == "true" and pg.locator(".modal .dg.has-hl").count() == 1, on)
    check("één knop actief", pg.locator(".modal .ra-part[aria-pressed=true]").count() == 1)
    parts.nth(1).click(); pg.wait_for_timeout(150)
    check("tweede klik wist markering", pg.locator(".modal .dg-p.on, .modal .dg.has-hl").count() == 0 and parts.nth(1).get_attribute("aria-pressed") == "false")
    pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
    # alle eigen platen: geen markering bij openen
    ids = E("ARCH_DIAGRAMS.filter(d => d.kind === 'svg').map(d => d.id)")
    leaked = []
    for pid in ids:
        pg.click(f".ra-plate[data-plate='{pid}'] [data-action=arch-plate]"); pg.wait_for_timeout(200)
        if pg.locator(".modal .dg-p.on, .modal .dg.has-hl").count(): leaked.append(pid)
        pg.keyboard.press("Escape"); pg.wait_for_timeout(150)
    check("geen enkele eigen plaat opent met markering", len(ids) == 4 and not leaked, leaked)
    # plaat vanuit architectuurblok markeert alleen dat onderdeel
    E("UI.archTab='arch';UI.archSel='lab-service';App.go('architectuur')"); pg.wait_for_timeout(200)
    pg.click(".arch-detail [data-action=arch-plate][data-block='lab-service']"); pg.wait_for_timeout(250)
    on = E("[...document.querySelectorAll('.modal .dg-p.on')].map(g => g.dataset.k)")
    check("plaat vanuit blok markeert gekozen onderdeel", on == ["auto"] and pg.locator(".modal .ra-hlnote").count() == 1, on)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
    E("UI.archTab='plates';App.go('architectuur')"); pg.wait_for_timeout(200)
    # technische details uit
    E("Prefs.set('showTech', false)"); E("UI.archTab='arch';UI.archSel='lab-service';App.go('architectuur')"); pg.wait_for_timeout(200)
    check("zonder tech: detail bruikbaar", pg.locator(".arch-detail .ad-actions a, .arch-detail .ad-actions button").count() >= 1 and len(pg.locator(".arch-detail").inner_text()) > 80)
    E("Prefs.set('showTech', true)")
    # overflow 390/900/1920 in beide tabs
    for w in (390, 900, 1920):
        pg.set_viewport_size({"width": w, "height": 900})
        for tab in ("arch", "plates"):
            E(f"UI.archTab='{tab}';App.go('architectuur')"); pg.wait_for_timeout(200)
            check(f"geen overflow {w}px {tab}", not E("document.documentElement.scrollWidth > window.innerWidth + 1"))
    check("geen console/page errors", not errs, errs[:3])
    b.close()
print("FAILS", len(fails))
sys.exit(bool(fails))
