"""Kwaliteitssweep: axe-core (serious/critical) per route in licht en donker, plus console- en
pageerror-controle over alle routes en hun tabbladen.
Gebruik: python t_quality.py <app.html> <screenshot-map>"""
import os
import pathlib
import sys

from playwright.sync_api import sync_playwright

try:
    import axe_playwright_python
except ImportError:
    print("FAIL axe-playwright-python ontbreekt (zie tools/requirements-test.txt)")
    sys.exit(1)

sys.stdout.reconfigure(encoding="utf-8")
HTML = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else os.environ.get("PYD_TEST_OUT", ".")
os.makedirs(OUT, exist_ok=True)
AXE = (pathlib.Path(axe_playwright_python.__file__).parent / "axe.min.js").read_text(encoding="utf-8")
BLOCKING = {"serious", "critical"}
fails = []


def ok(cond, msg):
    print(("PASS " if cond else "FAIL ") + msg)
    if not cond:
        fails.append(msg)


def axe_scan(pg):
    if not pg.evaluate("typeof window.axe !== 'undefined'"):
        pg.evaluate(AXE)
    return pg.evaluate("""async () => {
      const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa'] }, resultTypes: ['violations'] });
      return r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length,
        t: v.nodes.slice(0, 3).map(x => x.target.join(' ') + ' :: ' + (x.failureSummary || '').split('\\n').slice(1, 2).join('')) }));
    }""")


with sync_playwright() as p:
    b = p.chromium.launch()
    # bypass_csp alleen om axe in de testpagina te kunnen injecteren; de app zelf blijft ongewijzigd.
    ctx = b.new_context(viewport={"width": 1440, "height": 900}, bypass_csp=True)
    pg = ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))
    pg.on("console", lambda m: errors.append("console: " + m.text) if m.type == "error" else None)
    pg.goto(pathlib.Path(HTML).as_uri())
    pg.wait_for_timeout(500)
    pg.evaluate("sessionStorage.setItem('pyd-start-ack','1')")
    pg.evaluate("Store.replace(buildPresetState('generic', {customer: 'Contoso'}))")
    pg.keyboard.press("Escape")
    routes = pg.evaluate("Object.keys(Views)")
    ok(len(routes) >= 16, f"{len(routes)} routes geregistreerd")

    # 1. Console-/pageerror-sweep over alle routes en tabbladen
    visited = 0
    for r in routes:
        pg.evaluate(f"App.go({r!r})")
        pg.wait_for_timeout(120)
        visited += 1
        n = pg.locator('#main [role="tab"]:not([disabled])').count()
        for i in range(n):
            tabs = pg.locator('#main [role="tab"]:not([disabled])')
            if i >= tabs.count():
                break
            try:
                tabs.nth(i).click(timeout=2000)
            except Exception:
                continue
            pg.wait_for_timeout(80)
            visited += 1
    ok(not errors, f"geen console-/pageerrors over {visited} schermen" + ("" if not errors else f": {errors[:5]}"))

    # 2. axe per route, licht en donker
    for theme in ("light", "dark"):
        pg.evaluate(f"document.documentElement.setAttribute('data-theme', {theme!r})")
        for r in routes:
            pg.evaluate(f"App.go({r!r})")
            pg.wait_for_timeout(150)
            pg.keyboard.press("Escape")
            bad = [v for v in axe_scan(pg) if v["impact"] in BLOCKING]
            ok(not bad, f"axe {theme:5} {r:13} geen serious/critical" + ("" if not bad else ": " + "; ".join(f"{v['id']}({v['impact']},{v['n']}) {v['t']}" for v in bad)))
        pg.screenshot(path=os.path.join(OUT, f"quality-{theme}.png"))
    b.close()

print(f"\n{'TEST MISLUKT' if fails else 'ALLES OK'}: {len(fails)} fout(en)")
sys.exit(1 if fails else 0)
