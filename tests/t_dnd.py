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

    # WP3-regressie: op 'schema' precies één .drop-between tussen elk paar opeenvolgende labelkaarten,
    # ook rond sublabelgroepen, plus één boven- en onderaan; alle zones even hoog.
    cerrs = []
    pg.on("console", lambda m: cerrs.append(m.text) if m.type == "error" else None)
    for preset in ("generic", "zorg", "overheid"):
        pg.evaluate(f"Store.replace(buildPresetState('{preset}',{{customer:'T'}})); App.go('schema')"); pg.wait_for_timeout(200)
        r = pg.evaluate("""() => { const kids=[...document.querySelectorAll('#main .schema-list > *')];
          const seq=kids.map(k=>k.classList.contains('label-card')?'C':k.classList.contains('drop-between')?'Z':'?');
          const hs=[...new Set(kids.filter(k=>k.classList.contains('drop-between')).map(k=>Math.round(k.getBoundingClientRect().height)))];
          return {seq:seq.join(''), subs:S().labels.filter(l=>l.parentId).length, hs}; }""")
        print(preset, r)
        assert r["subs"] > 0 or preset != "generic", "preset zonder sublabels"
        assert "?" not in r["seq"], r
        assert r["seq"].startswith("Z") and r["seq"].endswith("CZ"), r
        assert "CC" not in r["seq"] and "ZZ" not in r["seq"], f"{preset}: niet precies 1 dropzone tussen labels: {r['seq']}"
        assert len(r["hs"]) == 1, f"{preset}: ongelijke dropzonehoogtes {r['hs']}"
    # Nesten via .lc-drop met toetsenbord-pick (spatie = oppakken; Enter op een kaart selecteert, Enter op zone = plaatsen) blijft werken
    pg.evaluate("Store.replace(buildPresetState('generic',{customer:'T'})); App.go('schema')"); pg.wait_for_timeout(200)
    top = pg.evaluate("S().labels.filter(l=>!l.parentId && !S().labels.some(c=>c.parentId===l.id)).map(l=>l.id)")
    par = pg.evaluate("S().labels.filter(l=>!l.parentId && S().labels.some(c=>c.parentId===l.id)).map(l=>l.id)")
    mover = top[0]; target = par[0]
    pg.locator(f'#main .label-card[data-payload*="{mover}"]').first.focus(); pg.keyboard.press("Space"); pg.wait_for_timeout(150)
    assert pg.locator("#main .drop-between.drop-ok").count() > 0, "geen geldige dropzones na toetsenbord-pick"
    pg.keyboard.press("Escape"); pg.wait_for_timeout(100)
    assert pg.locator("#main .drop-ok").count() == 0, "Esc annuleert de pick niet"
    pg.locator(f'#main .label-card[data-payload*="{mover}"]').first.focus(); pg.keyboard.press("Space"); pg.wait_for_timeout(150)
    pg.locator(f'#main .lc-drop[data-id="{target}"]').focus(); pg.keyboard.press("Enter"); pg.wait_for_timeout(250)
    assert pg.evaluate(f"(S().labels.find(l=>l.id==='{mover}')||{{}}).parentId") == target, "nesten via .lc-drop met toetsenbord faalt"
    seq = pg.evaluate("[...document.querySelectorAll('#main .schema-list > *')].map(k=>k.classList.contains('label-card')?'C':'Z').join('')")
    assert "CC" not in seq and "ZZ" not in seq, f"na nesten niet 1 zone per positie: {seq}"
    assert not errs and not cerrs, (errs, cerrs)
    print("schema dropzones OK")
    b.close()
