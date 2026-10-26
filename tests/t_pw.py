import os as _os, pathlib as _pl, tempfile as _tf
_TD = _pl.Path(__file__).resolve().parents[1]  # repo-root met src, Voorbeelden en de deliverable
_OUT = _os.environ.get("PYD_TEST_OUT") or _os.path.join(_tf.gettempdir(), "pyd-tests", _pl.Path(__file__).stem)
_os.makedirs(_OUT, exist_ok=True)
import sys, json, re, os, pathlib
from playwright.sync_api import sync_playwright
HTML = sys.argv[1]; OUT = sys.argv[2]
url = pathlib.Path(HTML).as_uri()
errs = []
BAD = re.compile(r"undefined|NaN|\[object Object\]|kon niet worden weergegeven")
SKIP = re.compile(r"del|remove|clear|reset|preset|new-design|open-json|save-json|exp-|print|copy|export-menu|app-menu|timer|toggle-|undo|redo|go$|val-go|decision")
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1600, "height": 950}, accept_downloads=True)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errs.append("PAGEERROR " + str(e)))
    pg.on("console", lambda m: errs.append("CONSOLE " + m.type + ": " + m.text) if m.type in ("error", "warning") else None)
    pg.goto(url); pg.wait_for_timeout(500)
    pg.evaluate("window.print = () => { window.__printed = (window.__printed||0)+1; }")
    routes = pg.evaluate("NAV_ROUTES")
    print("routes", routes)
    # preset via UI
    pg.click('[data-action="go"][data-route="start"]')
    pg.click('.preset-card[data-id="generic"]'); pg.wait_for_timeout(200)
    if pg.locator('#modal-root .btn.primary').count(): pg.locator('#modal-root .btn.primary').first.click()
    pg.wait_for_timeout(300)
    print("labels after preset click:", pg.evaluate("S().labels.length"), "route", pg.evaluate("UI.route"))
    for preset in ["generic", "zorg", "empty"]:
        pg.evaluate(f"Store.replace(buildPresetState('{preset}',{{customer:'Test BV'}}))")
        for r in routes:
            pg.evaluate(f"App.go('{r}')"); pg.wait_for_timeout(60)
            txt = pg.inner_text("#main")
            m = BAD.search(txt)
            if m: errs.append(f"BADTEXT {preset}/{r}: ...{txt[max(0,m.start()-60):m.end()+40]!r}")
            # tabs
            ntabs = pg.locator("#main .tab").count()
            for i in range(ntabs):
                t = pg.locator("#main .tab").nth(i)
                if t.is_visible() and t.is_enabled():
                    t.click(); pg.wait_for_timeout(40)
                    txt = pg.inner_text("#main"); m = BAD.search(txt)
                    if m: errs.append(f"BADTEXT {preset}/{r}/tab{i}: ...{txt[max(0,m.start()-60):m.end()+40]!r}")
            if preset == "generic":
                pg.screenshot(path=os.path.join(OUT, f"{r}.png"))
            # monkey: click safe actions
            if preset != "empty":
                acts = pg.evaluate("""() => Array.from(document.querySelectorAll('#main [data-action]')).map((e,i)=>({i, a:e.dataset.action}))""")
                seen = set(); n = 0
                for a in acts:
                    if SKIP.search(a["a"]) or a["a"] in seen: continue
                    seen.add(a["a"]); n += 1
                    try:
                        pg.evaluate(f"""() => {{ const e = document.querySelectorAll('#main [data-action]')[{a['i']}]; if (e && e.dataset.action === '{a['a']}') e.click(); }}""")
                        pg.wait_for_timeout(50)
                        for root in ["#drawer-root", "#modal-root"]:
                            t2 = pg.inner_text(root) if pg.locator(root).count() else ""
                            m = BAD.search(t2)
                            if m: errs.append(f"BADTEXT {preset}/{r} after {a['a']} in {root}: {t2[max(0,m.start()-60):m.end()+40]!r}")
                        pg.evaluate("Modal.close(); if (Drawer.isOpen()) Drawer.close(); Menu.close();")
                        if pg.evaluate("UI.route") != r: pg.evaluate(f"App.go('{r}')")
                    except Exception as e:
                        errs.append(f"CLICKFAIL {preset}/{r}/{a['a']}: {e}")
                if preset == "generic": print(f"  {r}: {ntabs} tabs, {n} actions clicked")
    # DnD on board
    pg.evaluate("Store.replace(buildPresetState('generic',{customer:'Test BV'})); App.go('board')"); pg.wait_for_timeout(200)
    src = pg.locator('#main [data-drag="choice"]').first
    cells = pg.locator('#main td.cell[data-drop="choice"]')
    print("draggables:", pg.locator('#main [data-drag]').count(), "drop cells:", cells.count())
    if src.count() and cells.count():
        before = pg.evaluate("Store.rev")
        sb = src.bounding_box(); tgt = cells.nth(3); tgt.scroll_into_view_if_needed(); tb = tgt.bounding_box()
        pg.mouse.move(sb["x"]+10, sb["y"]+10); pg.mouse.down()
        for k in range(1, 12): pg.mouse.move(sb["x"]+10+(tb["x"]+tb["width"]/2-sb["x"]-10)*k/11, sb["y"]+10+(tb["y"]+tb["height"]/2-sb["y"]-10)*k/11); pg.wait_for_timeout(20)
        pg.mouse.up(); pg.wait_for_timeout(300)
        print("DnD changed store:", pg.evaluate("Store.rev") != before)
        pg.screenshot(path=os.path.join(OUT, "board-after-dnd.png"))
    # JSON round trip via UI
    with pg.expect_download() as dl: pg.click('#topbar-actions [data-action="save-json"]')
    jp = os.path.join(OUT, "rt.json"); dl.value.save_as(jp)
    orig = pg.evaluate("JSON.stringify(S())")
    pg.evaluate("Store.replace(createEmptyState())")
    with pg.expect_file_chooser() as fc: pg.click('#topbar-actions [data-action="open-json"]')
    fc.value.set_files(jp); pg.wait_for_timeout(400)
    if pg.locator('#modal-root .btn.primary').count(): pg.locator('#modal-root .btn.primary').first.click(); pg.wait_for_timeout(300)
    after = pg.evaluate("JSON.stringify(S())")
    a, o = json.loads(after), json.loads(orig)
    for k in ("meta",): a.pop(k, None); o.pop(k, None)
    print("JSON round-trip equal (excl meta):", a == o, "labels", len(a["labels"]))
    # downloads via export menu
    for label, fn in [("Excel", "x-ui.xlsx"), ("PowerShell", "ps-ui.ps1")]:
        pg.click('#topbar-actions [data-action="export-menu"]'); pg.wait_for_timeout(100)
        with pg.expect_download() as dl: pg.locator(".menu-item", has_text=label).click()
        dl.value.save_as(os.path.join(OUT, fn)); print("downloaded", fn, dl.value.suggested_filename)
    # print document
    pg.click('#topbar-actions [data-action="export-menu"]'); pg.locator(".menu-item", has_text="Ontwerpdocument").click(); pg.wait_for_timeout(300)
    print("printed:", pg.evaluate("window.__printed"), "print-root chars:", len(pg.inner_html("#print-root")))
    pg.emulate_media(media="print"); pg.pdf(path=os.path.join(OUT, "doc.pdf"), format="A4", print_background=True)
    pg.evaluate("document.getElementById('print-root').innerHTML=''; DocExport.print({only:'keuzes'})"); pg.wait_for_timeout(200)
    pg.pdf(path=os.path.join(OUT, "keuzes.pdf"), format="A4", landscape=True, print_background=True)
    pg.emulate_media(media="screen")
    # theme / beamer / panel / undo / decisions
    pg.click('[data-action="toggle-theme"]'); pg.evaluate("App.go('board')"); pg.screenshot(path=os.path.join(OUT, "board-dark.png")); pg.click('[data-action="toggle-theme"]')
    if not pg.locator("#dec-text").count(): pg.click('[data-action="toggle-panel"]'); pg.wait_for_timeout(100)  # core: paneel standaard dicht op brede routes
    pg.fill("#dec-text", "Testbesluit"); pg.keyboard.press("Enter"); pg.wait_for_timeout(100)
    print("decisions:", pg.evaluate("S().decisions.length"))
    pg.click('[data-action="undo"]'); print("after undo:", pg.evaluate("S().decisions.length"))
    pg.click('[data-action="timer-start"]'); pg.wait_for_timeout(1200); print("timer:", pg.inner_text("#fac-timer .t"))
    pg.click('[data-action="toggle-beamer"]'); pg.screenshot(path=os.path.join(OUT, "board-beamer.png")); pg.click('[data-action="toggle-beamer"]')
    # reload persistence
    pg.reload(); pg.wait_for_timeout(500); print("after reload labels:", pg.evaluate("S().labels.length"), "route", pg.evaluate("UI.route"))
    b.close()
print("ERRORS:", len(errs))
sys.exit(bool(errs))
for e in errs[:60]: print(" ", e[:400])
