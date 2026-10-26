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
    check("5 kolommen", pg.locator(".arch-col").count() == 5)
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

    pg.click(".arch-paths .chip >> nth=0"); pg.wait_for_timeout(200)
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
    check("geen console/page errors", not errs, errs[:3])
    b.close()
print("FAILS", len(fails))
sys.exit(bool(fails))
