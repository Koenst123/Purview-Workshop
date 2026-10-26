"""Verplichte rooktest van de webversie in een echte browser (vereist Playwright en Chromium).

Gebruik:  python tools/smoke.py _site/index.html
Opent de app, laadt een voorbeeldpreset, bezoekt alle pagina's en faalt bij JavaScript-fouten.
"""
import argparse
import pathlib
import sys
import tempfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("app", nargs="?", default="_site/index.html")
parser.add_argument("--optional", action="store_true", help="Alleen lokaal: overslaan als Playwright ontbreekt")
args = parser.parse_args()
try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("ROOKTEST: Playwright ontbreekt; installeer tools/requirements-test.txt en Chromium")
    sys.exit(0 if args.optional else 1)

html = pathlib.Path(args.app).resolve()
errors: list[str] = []
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.set_default_timeout(10000)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.goto(html.as_uri())
    page.wait_for_timeout(500)
    routes = page.evaluate("Object.keys(Views)")
    for preset in ["generic", "zorg"]:
        page.evaluate(f"Store.replace(buildPresetState('{preset}', {{customer: 'Rooktest'}}))")
        for r in routes:
            page.evaluate(f"App.go('{r}')")
            page.wait_for_timeout(60)
            if not page.evaluate("(document.querySelector('#main')?.innerText || '').trim().length > 20"):
                errors.append(f"lege pagina: {r} ({preset})")
    framed = browser.new_page()
    framed.set_default_timeout(10000)
    host = pathlib.Path(tempfile.mkdtemp()) / "frame.html"
    host.write_text(f'<iframe src="{html.as_uri()}" width="400" height="200"></iframe>', encoding="utf-8")
    framed.goto(host.as_uri(), wait_until="domcontentloaded")
    framed.wait_for_timeout(1000)
    frame = framed.frames[-1]
    if "niet in een frame" not in (frame.evaluate("document.body ? document.body.innerText : ''") or ""):
        errors.append("frame-guard werkt niet")
    browser.close()
    host.unlink(missing_ok=True)

if errors:
    print("ROOKTEST MISLUKT:")
    for e in errors[:20]:
        print("  - " + e)
    sys.exit(1)
print(f"ROOKTEST OK: {len(routes)} pagina's x 2 voorbeelden zonder fouten, frame-guard actief")
