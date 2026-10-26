import os as _os, pathlib as _pl, tempfile as _tf
_TD = _pl.Path(__file__).resolve().parents[1]  # repo-root met src, Voorbeelden en de deliverable
_OUT = _os.environ.get("PYD_TEST_OUT") or _os.path.join(_tf.gettempdir(), "pyd-tests", _pl.Path(__file__).stem)
_os.makedirs(_OUT, exist_ok=True)
import sys, pathlib
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width":1600,"height":950})
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(pathlib.Path(sys.argv[1]).as_uri()); pg.wait_for_timeout(300)
    pg.evaluate("Store.replace(buildPresetState('generic',{customer:'T'})); App.go('board')"); pg.wait_for_timeout(200)
    info = pg.evaluate("""() => { const d=document.querySelector('#main [data-drag="choice"]'); return {payload:d.dataset.payload, drag:d.dataset.drag, tap:d.dataset.tap, html:d.outerHTML.slice(0,200), dom:UI.boardDomain}; }""")
    print(info)
    import json
    pl = json.loads(info["payload"])
    dom = "encryption"
    print("domain", dom)
    cell = pg.locator(f'#main td.cell[data-dom="{dom}"]').last
    print("target", cell.get_attribute("data-target"))
    before = pg.evaluate("JSON.stringify(S().labels.map(l=>l.choices))")
    src = pg.locator('#main [data-drag="choice"]').first
    cell.scroll_into_view_if_needed(); src.scroll_into_view_if_needed()
    sb = src.bounding_box(); tb = cell.bounding_box(); print(sb, tb)
    pg.mouse.move(sb["x"]+10, sb["y"]+10); pg.mouse.down()
    for k in range(1, 15): pg.mouse.move(sb["x"]+10+(tb["x"]+tb["width"]/2-sb["x"]-10)*k/14, sb["y"]+10+(tb["y"]+tb["height"]/2-sb["y"]-10)*k/14); pg.wait_for_timeout(25)
    print("ghost:", pg.locator(".dnd-ghost").count(), "hover:", pg.locator(".drop-hover").count(), "ok:", pg.locator(".drop-ok").count())
    pg.mouse.up(); pg.wait_for_timeout(300)
    print("changed:", before != pg.evaluate("JSON.stringify(S().labels.map(l=>l.choices))"), errs)
    assert before != pg.evaluate("JSON.stringify(S().labels.map(l=>l.choices))"), "Drop wijzigt geen keuze"
    assert not errs, errs
    b.close()
