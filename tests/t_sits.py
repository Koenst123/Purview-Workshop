import os as _os, pathlib as _pl, tempfile as _tf
_TD = _pl.Path(__file__).resolve().parents[1]  # repo-root met src, Voorbeelden en de deliverable
_OUT = _os.environ.get("PYD_TEST_OUT") or _os.path.join(_tf.gettempdir(), "pyd-tests", _pl.Path(__file__).stem)
_os.makedirs(_OUT, exist_ok=True)
# Ronde 5 – Informatietypen (slepen/verplaatsen/loskoppelen) + oefening ‘Wat is wat?’
# Gebruik: python t-sits.py <app.html> [shots-dir]
import sys, os, json, pathlib
from playwright.sync_api import sync_playwright

APP = sys.argv[1]
SHOTS = sys.argv[2] if len(sys.argv) > 2 else os.path.join(_OUT, "sits", "shots")
os.makedirs(SHOTS, exist_ok=True)
FAILS = []
ERRS = []


def ok(cond, msg):
    print(("PASS " if cond else "FAIL ") + msg)
    if not cond:
        FAILS.append(msg)


def new_page(b, w=1440, h=900, preset="generic", theme="light", clear=True):
    pg = b.new_page(viewport={"width": w, "height": h})
    pg.on("pageerror", lambda e: ERRS.append("pageerror: " + str(e)))
    pg.on("console", lambda m: ERRS.append("console: " + m.text) if m.type == "error" else None)
    pg.goto(pathlib.Path(APP).as_uri())
    pg.wait_for_timeout(250)
    if clear:
        pg.evaluate("() => { try { localStorage.removeItem(STORAGE_KEY + '-coach'); } catch (e) {} UI.coachSeen = {}; }")
    pg.evaluate(f"() => {{ Store.replace(buildPresetState('{preset}', {{customer:'T'}})); Prefs.set('theme', '{theme}'); }}")
    pg.wait_for_timeout(150)
    return pg


def go(pg, route, sub=None):
    pg.evaluate(f"() => App.go({json.dumps(route)}{', ' + json.dumps(sub) if sub else ''})")
    pg.wait_for_timeout(200)


def drag(pg, src, dst, mid=None, steps=16):
    src.scroll_into_view_if_needed()
    sb = src.bounding_box()
    dst.scroll_into_view_if_needed()
    sb = src.bounding_box()
    tb = dst.bounding_box()
    x0, y0 = sb["x"] + min(14, sb["width"] / 2), sb["y"] + sb["height"] / 2
    x1, y1 = tb["x"] + tb["width"] / 2, tb["y"] + min(tb["height"] / 2, 60)
    hit = src.evaluate("(e, [x, y]) => e.contains(document.elementFromPoint(x, y))", [x0, y0])
    if not hit:
        print("  (drag: source covered at", x0, y0, ")", pg.evaluate("([x, y]) => { const e = document.elementFromPoint(x, y); return e ? e.outerHTML.slice(0, 100) : null; }", [x0, y0]))
    pg.mouse.move(x0, y0)
    pg.mouse.down()
    for k in range(1, steps + 1):
        pg.mouse.move(x0 + (x1 - x0) * k / steps, y0 + (y1 - y0) * k / steps)
        pg.wait_for_timeout(20)
    res = mid() if mid else None
    pg.mouse.up()
    pg.wait_for_timeout(250)
    return res


def label_sits(pg, lid):
    return pg.evaluate(f"() => (labelById({json.dumps(lid)}, S()).sits || []).slice()")


def labels(pg):
    return pg.evaluate("() => orderedLabels(S()).map(l => ({id: l.id, name: l.name, parent: l.parentId || null, n: (l.sits || []).length}))")


def lib_card_for(pg, lid):
    """Index van de eerste bibliotheekkaart die op label lid mag."""
    return pg.evaluate("""(lid) => [...document.querySelectorAll('#lib-list .lib-card')].findIndex(c => sitCanLink(lid, JSON.parse(c.dataset.payload)) && c.offsetParent)""", lid)


def test_sits(b, preset, theme, w):
    tag = f"{preset}-{theme}-{w}"
    pg = new_page(b, w=w, preset=preset, theme=theme)
    go(pg, "sits", "map")
    # hint + coach-mark
    hint = pg.locator("#main .sit-hint")
    ok(hint.count() == 1 and "Sleep een type naar een label" in hint.inner_text(), f"[{tag}] one-line hint present")
    lay = pg.evaluate("""() => { const ids = orderedLabels(S()).map(l => 'sitlbl-' + l.id); const row = document.querySelector('#main .sit-board .sit-tiles');
        const inRow = row ? ids.filter(id => row.querySelector('#' + CSS.escape(id))).length : 0;
        const tiles = row ? [...row.children] : []; const top = tiles.length ? Math.min(...tiles.map(t => t.getBoundingClientRect().top)) : 0;
        const pool = new Set([...document.querySelectorAll('#lib-list .lib-card[data-payload]')].map(c => JSON.parse(c.dataset.payload).sitId).filter(Boolean));
        const lib = document.querySelector('#main .lib-panel'); const board = document.querySelector('#main .sit-board');
        return { n: ids.length, inRow, firstRowTop: top, missing: S().sits.filter(s => !pool.has(s.id)).map(s => s.name), below: !!(lib && board && lib.getBoundingClientRect().top >= board.getBoundingClientRect().bottom - 1) }; }""")
    ok(lay["n"] > 0 and lay["inRow"] == lay["n"], f"[{tag}] all label drop targets in one top container {lay['inRow']}/{lay['n']}")
    ok(lay["below"], f"[{tag}] library sits below the label row")
    ok(not lay["missing"], f"[{tag}] library contains every SIT of the design (missing {lay['missing'][:3]})")
    ok(pg.locator("#main .sit-coach").count() == 1, f"[{tag}] coach-mark shown first time")
    ok(pg.locator("#main .lib-card .lib-grip").count() > 0, f"[{tag}] library cards show a grip")
    pg.screenshot(path=os.path.join(SHOTS, f"sits-coach-{tag}.png"))
    pg.click("#main [data-action=sit-coach-done]")
    pg.wait_for_timeout(150)
    ok(pg.locator("#main .sit-coach").count() == 0, f"[{tag}] coach-mark dismissed")
    pg.reload(); pg.wait_for_timeout(600)
    mt = pg.evaluate("() => { const m = document.querySelector('.modal'); return m ? m.innerText.slice(0, 80) : ''; }")
    if mt: print("  (modal after reload:", mt.replace("\n", " "), ")")
    pg.evaluate(f"() => {{ if (typeof Modal !== 'undefined') Modal.close(true); Store.replace(buildPresetState('{preset}', {{customer:'T'}})); App.go('sits', 'map'); }}"); pg.wait_for_timeout(200)
    ok(pg.locator("#main .sit-coach").count() == 0, f"[{tag}] coach-mark stays dismissed after reload")

    ls = labels(pg)
    A, B_ = ls[0]["id"], ls[1]["id"]
    # 1. muis: bibliotheek -> label
    i = lib_card_for(pg, A)
    ok(i >= 0, f"[{tag}] found linkable library card")
    card = pg.locator("#lib-list .lib-card").nth(i)
    tgt = pg.locator(f"#sitlbl-{A}")
    before = label_sits(pg, A)

    def mid1():
        return pg.evaluate("""() => ({ ok: document.querySelectorAll('.label-card.sit-lbl.drop-ok').length, all: document.querySelectorAll('.label-card.sit-lbl').length,
            type: document.body.dataset.dndType || '', lib: document.querySelectorAll('.lib-panel.drop-ok').length, ghost: document.querySelectorAll('.dnd-ghost').length,
            dh: [...document.querySelectorAll('.label-card.sit-lbl.drop-ok .dh-drop')].some(e => getComputedStyle(e).display !== 'none') })""")
    m = drag(pg, card, tgt, mid1)
    ok(m["ok"] > 0 and m["type"] == "sit" and m["ghost"] == 1, f"[{tag}] valid labels highlighted while dragging {m}")
    ok(m["lib"] == 0, f"[{tag}] library is no unlink target for library cards")
    ok(m["dh"], f"[{tag}] drop hint switches to 'Loslaten om te koppelen'")
    after = label_sits(pg, A)
    ok(len(after) == len(before) + 1, f"[{tag}] mouse drag library -> label links ({len(before)} -> {len(after)})")
    ok(pg.locator(f"#sitlbl-{A}.drop-done").count() == 1, f"[{tag}] drop success animation class")
    new_sit = [s for s in after if s not in before][0]
    pg.screenshot(path=os.path.join(SHOTS, f"sits-linked-{tag}.png"))

    # 2. chip label -> label (verplaatsen)
    chip = pg.locator(f'#sitlbl-{A} .sit-drag[data-payload*="{new_sit}"]')
    ok(chip.count() == 1, f"[{tag}] linked chip is draggable")
    can_b = pg.evaluate("([b, s, a]) => sitCanLink(b, {sitId: s, from: a})", [B_, new_sit, A])
    m = drag(pg, chip, pg.locator(f"#sitlbl-{B_}"), lambda: pg.evaluate("() => ({ lib: document.querySelectorAll('.lib-panel.drop-ok').length, src: document.querySelectorAll('.label-card.sit-lbl.drop-ok').length })"))
    ok(m["lib"] == 1, f"[{tag}] library lights up as unlink zone while dragging a chip")
    if can_b:
        ok(new_sit not in label_sits(pg, A) and new_sit in label_sits(pg, B_), f"[{tag}] chip moved label -> label")
        pg.evaluate("() => Store.undo()"); pg.wait_for_timeout(200)
        ok(new_sit in label_sits(pg, A) and new_sit not in label_sits(pg, B_), f"[{tag}] undo restores move in one step")
        pg.evaluate("() => Store.redo()"); pg.wait_for_timeout(200)
        ok(new_sit in label_sits(pg, B_) and new_sit not in label_sits(pg, A), f"[{tag}] redo re-applies move")
        pg.evaluate("() => Store.undo()"); pg.wait_for_timeout(200)
    else:
        print(f"SKIP move to B (already present via parent) [{tag}]")

    # 3. chip -> bibliotheek (loskoppelen)
    chip = pg.locator(f'#sitlbl-{A} .sit-drag[data-payload*="{new_sit}"]')

    def mid3():
        pg.screenshot(path=os.path.join(SHOTS, f"sits-unlinkzone-{tag}.png"))
        return pg.evaluate("() => { const o = document.querySelector('.lib-panel .lib-unlink-ov'); return o && getComputedStyle(o).display; }")
    disp = drag(pg, chip, pg.locator("#main .lib-panel .lib-head"), mid3)
    ok(disp == "flex", f"[{tag}] unlink overlay visible over library ({disp})")
    ok(new_sit not in label_sits(pg, A), f"[{tag}] drag chip -> library unlinks")
    pg.evaluate("() => Store.undo()"); pg.wait_for_timeout(200)
    ok(new_sit in label_sits(pg, A), f"[{tag}] undo restores unlink")

    # 4. tikken: chip -> ander label; bibliotheekkaart -> label
    ls = labels(pg)
    C = next((l["id"] for l in ls if l["id"] != A and pg.evaluate("([c, s, a]) => sitCanLink(c, {sitId: s, from: a})", [l["id"], new_sit, A])), None)
    if C:
        pg.locator(f'#sitlbl-{A} .sit-drag[data-payload*="{new_sit}"] .chip').first.click()
        pg.wait_for_timeout(120)
        ok(pg.locator(".pick-banner").count() == 1 and "verplaatsen" in pg.locator(".pick-banner").inner_text(), f"[{tag}] tap chip shows move hint")
        pg.locator(f"#sitlbl-{C} .sl-body .lc-title-wrap").click()
        pg.wait_for_timeout(250)
        ok(new_sit in label_sits(pg, C) and new_sit not in label_sits(pg, A), f"[{tag}] tap chip -> tap label moves")
        pg.evaluate("() => Store.undo()"); pg.wait_for_timeout(200)
    i = lib_card_for(pg, B_)
    pg.locator("#lib-list .lib-card").nth(i).locator(".lib-title").click()
    pg.wait_for_timeout(120)
    n0 = len(label_sits(pg, B_))
    pg.locator(f"#sitlbl-{B_} button.drop-hint").click()
    pg.wait_for_timeout(250)
    ok(len(label_sits(pg, B_)) == n0 + 1, f"[{tag}] tap library card -> tap label links")

    # 5. toetsenbord: Enter op kaart, focus label, Enter
    i = lib_card_for(pg, A)
    n0 = len(label_sits(pg, A))
    pg.locator("#lib-list .lib-card").nth(i).focus()
    pg.keyboard.press("Enter"); pg.wait_for_timeout(120)
    ok(pg.evaluate(f"() => document.getElementById('sitlbl-{A}').tabIndex") == 0, f"[{tag}] target label reachable with Tab during pick")
    pg.locator(f"#sitlbl-{A}").focus()
    pg.keyboard.press("Enter"); pg.wait_for_timeout(250)
    ok(len(label_sits(pg, A)) == n0 + 1, f"[{tag}] keyboard Enter/Enter links")
    # toetsenbord op chip + ‘Kies uit lijst…’ (Verplaats naar / Loskoppelen)
    sid = label_sits(pg, A)[-1]
    pg.locator(f'#sitlbl-{A} .sit-drag[data-payload*="{sid}"]').focus()
    pg.keyboard.press("Enter"); pg.wait_for_timeout(120)
    ok(pg.locator(".pick-banner [data-pick-menu]").count() == 1, f"[{tag}] pick banner offers 'Kies uit lijst…'")
    pg.click(".pick-banner [data-pick-menu]"); pg.wait_for_timeout(150)
    items = pg.locator(".menu [role=menuitem], .menu button").all_inner_texts()
    ok(any("Loskoppelen van" in t for t in items), f"[{tag}] pick menu has unlink option")
    ok(any(t.strip().startswith("Verplaats naar") for t in items) or len(ls) < 2, f"[{tag}] pick menu has 'Verplaats naar…'")
    pg.locator(".menu [role=menuitem], .menu button").filter(has_text="Loskoppelen van").first.click(); pg.wait_for_timeout(250)
    ok(sid not in label_sits(pg, A) and pg.locator(".pick-banner").count() == 0, f"[{tag}] menu unlink works and clears pick")

    # 6. ×-knop + ‘Ongedaan maken’ in toast
    sid = label_sits(pg, A)[0] if label_sits(pg, A) else None
    if sid:
        pg.locator(f'#sitlbl-{A} .chip-x[data-sit="{sid}"]').click(); pg.wait_for_timeout(200)
        ok(sid not in label_sits(pg, A), f"[{tag}] × unlinks")
        u = pg.locator(".toast [data-action=undo]").last
        ok(u.count() == 1, f"[{tag}] unlink toast has undo")
        u.click(); pg.wait_for_timeout(200)
        ok(sid in label_sits(pg, A), f"[{tag}] toast undo restores")

    # afgeleide views blijven consistent
    for r in ["board", "autolabel", "dlp", "sits"]:
        go(pg, r)
        ok(pg.locator("#main").inner_text().strip() != "", f"[{tag}] {r} renders after link changes")
    pg.screenshot(path=os.path.join(SHOTS, f"sits-final-{tag}.png"))
    pg.close()


def test_sortex(b, preset, theme, w):
    tag = f"{preset}-{theme}-{w}"
    pg = new_page(b, w=w, preset=preset, theme=theme)
    pg.evaluate("() => { UI.sortEx = null; UI.schemaTab = 'labels'; }")
    go(pg, "schema")
    tab = pg.locator('#main [data-action=schema-tab][data-tab=sort]')
    ok(tab.count() == 1, f"[{tag}] 'Wat is wat?' tab present")
    tab.click(); pg.wait_for_timeout(200)
    exp = {"generic": "generic", "zorg": "zorg", "overheid": "overheid"}[preset]
    ok(pg.evaluate("() => UI.sortEx.set") == exp, f"[{tag}] example set follows sector ({exp})")
    ncols = pg.locator("#main .sortex-col").count()
    ntops = pg.evaluate("() => orderedLabels(S()).filter(l => !l.parentId).length")
    ok(ncols == ntops and ncols >= 3, f"[{tag}] one column per top-level label ({ncols})")
    total = pg.locator("#main .sortex-stack .sortex-card").count()
    ok(total >= 8, f"[{tag}] stack has cards ({total})")
    pg.screenshot(path=os.path.join(SHOTS, f"sortex-start-{tag}.png"))
    # muis: eerste kaart naar het ‘beste’ niveau -> Goed
    first = pg.locator("#main .sortex-stack .sortex-card").first
    iid = json.loads(first.get_attribute("data-payload"))["id"]
    best = pg.evaluate("(id) => { const lv = SortEx.levels(S()); return SortEx.verdict(SortEx.item(id), '', lv).best.id; }", iid)

    def midS():
        return pg.evaluate("() => ({ ok: document.querySelectorAll('.sortex-col.drop-ok').length, stack: document.querySelectorAll('.sortex-stack.drop-ok').length })")
    m = drag(pg, first, pg.locator(f'#main .sortex-col[data-target*="{best}"]'), midS)
    ok(m["ok"] == ncols and m["stack"] == 0, f"[{tag}] all columns highlight while dragging {m}")
    ok(pg.evaluate("(id) => UI.sortEx.placed[id]", iid) == best, f"[{tag}] mouse drop places card")
    fb = pg.locator("#main .sortex-fb").inner_text()
    ok("Goed." in fb, f"[{tag}] feedback 'Goed.' for best level: {fb[:80]!r}")
    ok(pg.locator(f'#main .sortex-col[data-target*="{best}"] .sortex-card.v-ok').count() == 1, f"[{tag}] card shows 'Goed' badge")
    # verkeerd: tier-0 kaart op meest gevoelige niveau -> Anders
    zero = pg.evaluate("() => SortEx.set().items.find(i => SortEx.item(i).tier === 0 && !(SortEx.item(i).alt || []).length && !UI.sortEx.placed[i])")
    top = pg.evaluate("() => { const lv = SortEx.levels(S()).filter(v => v.tier !== null); return lv.sort((a, b) => b.tier - a.tier)[0].l.id; }")
    if zero:
        c = pg.locator(f'#main .sortex-stack .sortex-card[data-payload*="\\"{zero}\\""]')
        c.click(); pg.wait_for_timeout(100)
        pg.locator(f'#main .sortex-col[data-target*="{top}"] .sx-head').click(); pg.wait_for_timeout(250)
        fb = pg.locator("#main .sortex-fb").inner_text()
        ok("Wij zouden kiezen voor" in fb, f"[{tag}] tap-to-place + feedback 'anders': {fb[:90]!r}")
        ok(pg.locator("#main .sortex-card.v-diff").count() == 1, f"[{tag}] 'Anders' badge")
    ok(pg.locator("#main .sx-num").inner_text().startswith("1/"), f"[{tag}] score shows 1 correct ({pg.locator('#main .sx-num').inner_text()})")
    # toetsenbord: Enter op kaart, Enter op kolom
    k = pg.locator("#main .sortex-stack .sortex-card").first
    kid = json.loads(k.get_attribute("data-payload"))["id"]
    k.focus(); pg.keyboard.press("Enter"); pg.wait_for_timeout(100)
    col = pg.locator("#main .sortex-col").nth(1)
    col.focus(); pg.keyboard.press("Enter"); pg.wait_for_timeout(250)
    ok(bool(pg.evaluate("(id) => UI.sortEx.placed[id]", kid)), f"[{tag}] keyboard places card")
    # terug naar de stapel (slepen)
    placed = pg.locator("#main .sortex-col .sortex-card").first
    pid = json.loads(placed.get_attribute("data-payload"))["id"]
    drag(pg, placed, pg.locator("#main .sortex-stack"))
    ok(not pg.evaluate("(id) => UI.sortEx.placed[id]", pid), f"[{tag}] drag back to stack unplaces")
    # rest plaatsen via ‘tik’ -> klaar-paneel
    for _ in range(40):
        c = pg.locator("#main .sortex-stack .sortex-card")
        if c.count() == 0:
            break
        c.first.click(); pg.wait_for_timeout(60)
        pg.locator("#main .sortex-col .sx-head").nth(_ % ncols).click(); pg.wait_for_timeout(120)
    ok(pg.locator("#main .sortex-stack .sortex-card").count() == 0, f"[{tag}] all cards placed")
    ok(pg.locator("#main .sortex-done").count() == 1, f"[{tag}] completion panel with score")
    pg.screenshot(path=os.path.join(SHOTS, f"sortex-done-{tag}.png"), full_page=True)
    # Opnieuw
    pg.locator("#main .sortex-score [data-action=sortex-reset]").click(); pg.wait_for_timeout(200)
    ok(pg.locator("#main .sortex-stack .sortex-card").count() == total and pg.locator("#main .sx-num").inner_text() == f"0/{total}", f"[{tag}] Opnieuw resets")
    # discussie-modus: geen goed/fout
    pg.click('#main [data-action=sortex-mode][data-v=discussie]'); pg.wait_for_timeout(150)
    pg.locator("#main .sortex-stack .sortex-card").first.click(); pg.wait_for_timeout(60)
    pg.locator("#main .sortex-col .sx-head").first.click(); pg.wait_for_timeout(200)
    ok(pg.locator("#main .sx-badge").count() == 0 and "Waarom dit niveau" in pg.locator("#main .sortex-fb").inner_text(), f"[{tag}] discussie: no right/wrong")
    pg.screenshot(path=os.path.join(SHOTS, f"sortex-discussie-{tag}.png"))
    pg.click('#main .sortex-score [data-action=sortex-mode][data-v=oefenen]'); pg.wait_for_timeout(150)
    ok(pg.locator("#main .sx-badge").count() == 1, f"[{tag}] 'Toon antwoorden' reveals feedback")
    # set wisselen
    pg.click('#main [data-action=sortex-set][data-v=mix]'); pg.wait_for_timeout(150)
    ok(pg.locator("#main .sortex-stack .sortex-card").count() == 10, f"[{tag}] mixed set loads")
    # export blijft schoon
    ok("sortEx" not in pg.evaluate("() => JSON.stringify(S())"), f"[{tag}] exercise not stored in exported state")
    # labels-tab terug
    pg.click('#main [data-action=schema-tab][data-tab=labels]'); pg.wait_for_timeout(150)
    ok(pg.locator("#main .schema-list").count() == 1, f"[{tag}] back to labels tab")
    pg.close()


def test_scales(b):
    pg = new_page(b, preset="generic")
    go(pg, "schema", "sort")
    # 3, 5 en 6 niveaus: proportioneel/op naam
    for names in (["Publiek", "Intern", "Geheim"], ["A", "B", "C", "D", "E"], ["Openbaar", "Algemeen", "Intern", "Vertrouwelijk", "Zeer vertrouwelijk", "Staatsgeheim"]):
        pg.evaluate("""(names) => { const st = buildPresetState('generic', {customer:'T'}); const tops = st.labels.filter(l => !l.parentId);
            st.labels = st.labels.filter(l => !l.parentId).slice(0, 1); st.labels[0].sits = [];
            names.forEach((n, i) => { if (i === 0) { st.labels[0].name = st.labels[0].displayName = n; return; } const c = JSON.parse(JSON.stringify(st.labels[0])); c.id = 'lx' + i; c.name = c.displayName = n; st.labels.push(c); });
            Store.replace(st); UI.sortEx = null; App.go('schema', 'sort'); }""", names)
        pg.wait_for_timeout(200)
        n = pg.locator("#main .sortex-col").count()
        tiers = pg.evaluate("() => SortEx.levels(S()).map(v => v.tier)")
        ok(n == len(names) and tiers[0] == 0 and tiers[-1] == 3, f"[scale {len(names)}] columns + tiers {tiers}")
        best = pg.evaluate("() => SortEx.verdict(SortEx.item('wachtwoorden'), '', SortEx.levels(S())).best.name")
        ok(best == names[-1], f"[scale {len(names)}] password list maps to most sensitive ({best})")
    # 1 niveau: vriendelijke lege staat
    pg.evaluate("() => { const st = buildPresetState('generic', {customer:'T'}); st.labels = st.labels.filter(l => !l.parentId).slice(0, 1); Store.replace(st); App.go('schema', 'sort'); }")
    pg.wait_for_timeout(200)
    ok("minimaal twee" in pg.locator("#main").inner_text(), "[scale 1] friendly empty state")
    pg.close()


def test_xss(b):
    pg = new_page(b, preset="generic")
    X = '<img src=x onerror="window.__x=1">'
    pg.evaluate("(x) => Store.update(st => { const l = st.labels[0]; l.name = l.displayName = x; l.tooltip = x; })", X)
    go(pg, "sits", "map")
    lid = labels(pg)[0]["id"]
    i = lib_card_for(pg, lid)
    pg.locator("#lib-list .lib-card").nth(i).locator(".lib-title").click(); pg.wait_for_timeout(80)
    pg.click(".pick-banner [data-pick-menu]"); pg.wait_for_timeout(150)
    ok(X in pg.locator(".menu").first.inner_text(), "[xss] label name shown literally in pick menu")
    pg.keyboard.press("Escape"); pg.keyboard.press("Escape")
    pg.locator(f"#sitlbl-{lid} button.drop-hint").click(); pg.wait_for_timeout(200)
    go(pg, "schema", "sort")
    ok(X in pg.locator("#main .sortex-cols").inner_text(), "[xss] label name shown literally in exercise")
    c = pg.locator("#main .sortex-stack .sortex-card").first
    drag(pg, c, pg.locator("#main .sortex-col").first)
    ok(pg.evaluate("() => window.__x") is None and pg.locator("#main img[src=x], .toast img[src=x]").count() == 0, "[xss] no script execution / injected img")
    pg.screenshot(path=os.path.join(SHOTS, "sortex-xss.png"))
    pg.close()


def test_reduced_motion(b):
    ctx = b.new_context(viewport={"width": 1440, "height": 900}, reduced_motion="reduce")
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: ERRS.append("pageerror: " + str(e)))
    pg.goto(pathlib.Path(APP).as_uri()); pg.wait_for_timeout(250)
    pg.evaluate("() => { Store.replace(buildPresetState('generic', {customer:'T'})); App.go('sits', 'map'); }"); pg.wait_for_timeout(200)
    an = pg.evaluate("() => { const e = document.querySelector('.sc-card, .sit-coach'); return e ? getComputedStyle(e).animationName : 'none'; }")
    ok(an == "none", f"[reduced-motion] coach demo animation off ({an})")
    lid = labels(pg)[0]["id"]
    i = lib_card_for(pg, lid)
    an2 = drag(pg, pg.locator("#lib-list .lib-card").nth(i), pg.locator(f"#sitlbl-{lid}"), lambda: pg.evaluate("() => { const e = document.querySelector('.label-card.sit-lbl.drop-ok:not(.drop-hover)'); return e ? getComputedStyle(e).animationName : 'none'; }"))
    ok(an2 == "none", f"[reduced-motion] no pulse while dragging ({an2})")
    ctx.close()


def lib_names(pg):
    return pg.evaluate("() => [...document.querySelectorAll('#lib-list .lib-card .lib-title')].map(e => e.textContent)")


def test_library(b, theme, w):
    tag = f"lib-{theme}-{w}"
    pg = new_page(b, w=w, preset="generic", theme=theme)
    go(pg, "sits", "map")
    pg.click("#main [data-action=sit-coach-done]"); pg.wait_for_timeout(100)
    opts = pg.evaluate("() => [...document.querySelectorAll('#main [data-live=lib-sector] option')].map(o => o.value)")
    ok(opts == ["generic", "zorg", "overheid", "financieel", "onderwijs", "juridisch", "it", "industrie", "retail"], f"[{tag}] sector selector has 9 sectors {opts}")
    for sec, must in [("it", ["All Credential Types", "Microsoft Entra user Credentials", "Source code"]), ("onderwijs", ["Studentnummer / leerlingnummer", "Onderwijsnummer"]),
                      ("juridisch", ["Lease deeds", "MoU files (Memorandum of understanding)"]), ("industrie", ["Control system and SCADA files", "Safety records"]),
                      ("retail", ["Customer complaints", "Quotation", "Credit card number"]), ("zorg", ["Lab test terms", "Healthcare"]), ("financieel", ["Wire transfer", "Belgium value added tax number"])]:
        pg.select_option("#main [data-live=lib-sector]", sec); pg.wait_for_timeout(150)
        names = lib_names(pg)
        miss = [m for m in must if m not in names]
        ok(not miss and len(names) < 80, f"[{tag}] Aanbevolen startset (+ items already in the design) for {sec} ({len(names)} cards, missing {miss})")
        if sec == "it":
            pg.screenshot(path=os.path.join(SHOTS, f"lib-it-{theme}-{w}.png"))
    ok(pg.evaluate("() => S().meta.sector") == "generic", f"[{tag}] sector selector does not change the design")
    # alle typen: groepen + lazy 'toon meer'
    pg.click("#main [data-action=lib-kind][data-kind='']"); pg.wait_for_timeout(150)
    n1 = pg.locator("#lib-list .lib-card").count()
    groups = pg.evaluate("() => [...document.querySelectorAll('#lib-list .lib-group')].map(e => e.firstChild.textContent)")
    ok(len(groups) >= 3 and "Identiteit" in groups, f"[{tag}] library grouped by category {groups}")
    ok(pg.locator("#lib-list .lib-star").count() > 0, f"[{tag}] items relevant for the chosen sector are starred")
    more = pg.locator("#lib-list [data-action=lib-more]")
    ok(more.count() == 1 and n1 == 80, f"[{tag}] lazy rendering: first 80 cards + 'Toon nog' ({n1})")
    if more.count():
        more.click(); pg.wait_for_timeout(150)
        n2 = pg.locator("#lib-list .lib-card").count()
        ok(n2 > n1, f"[{tag}] 'Toon nog' renders more ({n1} -> {n2})")
    pg.screenshot(path=os.path.join(SHOTS, f"lib-all-{theme}-{w}.png"))
    # zoeken op exacte nieuwe naam
    pg.fill("#main [data-live=lib-search]", "SPI"); pg.wait_for_timeout(250)
    ok("France Tax Identification Number (numéro SPI.)" in lib_names(pg), f"[{tag}] search finds new SIT with exact name")
    pg.fill("#main [data-live=lib-search]", ""); pg.wait_for_timeout(150)
    # koppelen + PowerShell-export met exacte namen
    lid = labels(pg)[-1]["id"]
    want = ["Microsoft Entra user Credentials", "France Tax Identification Number (numéro SPI.)", "U.K. national insurance number (NINO)"]
    pg.evaluate("""(lid) => { linkSit(lid, {kind:'builtin', ref:'entra-user-credentials'}); linkSit(lid, {kind:'builtin', ref:'fr-tax-id-spi'}); linkSit(lid, {kind:'builtin', ref:'uk-nino'}); linkSit(lid, {kind:'classifier', ref:'tc-harassment'}); }""", lid)
    pg.wait_for_timeout(200)
    have = pg.evaluate("(lid) => labelSits(labelById(lid, S()), S()).map(s => s.name)", lid)
    ok(all(x in have for x in want + ["Harassment"]), f"[{tag}] new types linked to label ({have[-4:]})")
    ps = pg.evaluate("() => { const r = PsExport.build(S()); return typeof r === 'string' ? r : JSON.stringify(r); }")
    miss = [x for x in want if x.replace("'", "''") not in ps and json.dumps(x)[1:-1] not in ps and x not in ps]
    ok(not miss, f"[{tag}] PowerShell export contains exact new SIT names (missing {miss})")
    # export/import JSON round-trip blijft werken
    rt = pg.evaluate("() => { const j = JSON.stringify(S()); const st = JSON.parse(j); Store.replace(st); return S().sits.some(s => s.ref === 'fr-tax-id-spi' && s.name === 'France Tax Identification Number (numéro SPI.)'); }")
    ok(rt, f"[{tag}] JSON round-trip keeps new SIT")
    pg.close()


with sync_playwright() as p:
    b = p.chromium.launch()
    test_sits(b, "generic", "light", 1440)
    test_sits(b, "zorg", "dark", 1440)
    test_sits(b, "overheid", "light", 900)
    test_sortex(b, "generic", "light", 1440)
    test_sortex(b, "zorg", "dark", 1440)
    test_sortex(b, "overheid", "light", 900)
    test_sortex(b, "generic", "dark", 900)
    test_scales(b)
    test_xss(b)
    test_reduced_motion(b)
    test_library(b, "light", 1440)
    test_library(b, "dark", 900)
    b.close()

ok(not ERRS, f"no console/page errors {ERRS[:5]}")
print("FAILS", len(FAILS))
sys.exit(bool(FAILS or ERRS))
for f in FAILS:
    print("  -", f)
