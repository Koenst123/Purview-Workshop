import os as _os, pathlib as _pl, tempfile as _tf
_TD = _pl.Path(__file__).resolve().parents[1]  # repo-root met src, Voorbeelden en de deliverable
_OUT = _os.environ.get("PYD_TEST_OUT") or _os.path.join(_tf.gettempdir(), "pyd-tests", _pl.Path(__file__).stem)
_os.makedirs(_OUT, exist_ok=True)
# Ronde 5 – Informatietypen (slepen/verplaatsen/loskoppelen)
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
    # Meet het doel na de sleepstart opnieuw (de labelrijen veranderen niet, maar zo blijft de test robuust bij auto-scroll).
    pg.mouse.move(x0 + 4, y0 - 4); pg.wait_for_timeout(20)
    pg.mouse.move(x0 + 8, y0 - 8); pg.wait_for_timeout(80)
    tb = dst.bounding_box()
    x0, y0 = x0 + 8, y0 - 8
    x1, y1 = tb["x"] + tb["width"] / 2, tb["y"] + min(tb["height"] / 2, 60)
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
    lay = pg.evaluate("""() => { const ids = orderedLabels(S()).map(l => 'sitlbl-' + l.id); const list = document.querySelector('#main .sit-labels .sit-list');
        const inList = list ? ids.filter(id => list.querySelector('#' + CSS.escape(id))).length : 0;
        const pool = new Set([...document.querySelectorAll('#lib-list .lib-card[data-payload]')].map(c => JSON.parse(c.dataset.payload).sitId).filter(Boolean));
        const lib = document.querySelector('#main .lib-panel').getBoundingClientRect(); const lab = document.querySelector('#main .sit-labels').getBoundingClientRect();
        return { n: ids.length, inList, missing: S().sits.filter(s => !pool.has(s.id)).map(s => s.name), beside: lib.left >= lab.right - 1 && lib.top < lab.bottom, below: lib.top >= lab.bottom - 1 }; }""")
    ok(lay["n"] > 0 and lay["inList"] == lay["n"], f"[{tag}] all label drop targets in the labels panel {lay['inList']}/{lay['n']}")
    ok(lay["beside"] or (w < 700 and lay["below"]), f"[{tag}] library panel sits next to the labels panel {lay}")
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
            dh: [...document.querySelectorAll('.label-card.sit-lbl.drop-ok .dh-drop')].some(e => getComputedStyle(e).display !== 'none'),
            rows: [...document.querySelectorAll('#main .sit-list > .sit-row')].map(t => [t.getBoundingClientRect().height, [...t.querySelectorAll('.sit-chips, button.drop-hint')].filter(e => getComputedStyle(e).display !== 'none').length]),
            note: !!document.querySelector('#main .sit-lnote') })""")
    rest = pg.evaluate("() => [...document.querySelectorAll('#main .sit-list > .sit-row')].map(t => [t.getBoundingClientRect().height, [...t.querySelectorAll('.sit-chips, button.drop-hint')].filter(e => getComputedStyle(e).display !== 'none').length])")
    m = drag(pg, card, tgt, mid1)
    ok(m["ok"] > 0 and m["type"] == "sit" and m["ghost"] == 1, f"[{tag}] valid labels highlighted while dragging {m}")
    ok(m["lib"] == 0, f"[{tag}] library is no unlink target for library cards")
    # Twee panelen: tijdens slepen houden de labelrijen hun hoogte (±1px) en chips; geen 'Laat los'-melding meer.
    same = len(rest) == len(m["rows"]) and all(abs(a[0] - b[0]) <= 1 and a[1] == b[1] and b[1] > 0 for a, b in zip(rest, m["rows"]))
    ok(same and not m["note"], f"[{tag}] while dragging the label rows keep their height and chips (no collapse)")
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
    # Tijdens kiezen is de hele labelrij het doel; ook de zone ‘Sleep hierheen of kies’ in een lege rij plaatst.
    dh = pg.locator(f"#sitlbl-{B_} button.drop-hint")
    (dh if dh.is_visible() else pg.locator(f"#sitlbl-{B_} .sl-body .lc-title-wrap")).click()
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


def test_no_sortex(b):
    pg = new_page(b, preset="generic")
    go(pg, "schema")
    ok(pg.locator("#main [data-action=schema-tab]").count() == 0 and "Wat is wat" not in pg.locator("#main").inner_text(), "'Wat is wat?' exercise removed from Classificatieschema")
    ok(pg.locator("#main .schema-list").count() == 1, "schema shows labels list directly")
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
    ok(pg.evaluate("() => window.__x") is None and pg.locator("#main img[src=x], .toast img[src=x]").count() == 0, "[xss] no script execution / injected img")
    pg.screenshot(path=os.path.join(SHOTS, "sits-xss.png"))
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
    groups = pg.evaluate("() => [...document.querySelectorAll('#lib-list .lib-group')].map(e => e.firstChild.textContent)")
    ok(len(groups) >= 3 and "Identiteit" in groups, f"[{tag}] library grouped by category {groups}")
    ok(pg.locator("#lib-list .lib-star").count() > 0, f"[{tag}] items relevant for the chosen sector are starred")
    gall = pg.locator("#lib-list [data-action=lib-cat-go]")
    if gall.count():
        # veel typen: per categorie een preview + ‘Alle N tonen’
        cat = gall.first.get_attribute("data-cat")
        gall.first.click(); pg.wait_for_timeout(150)
        ok(pg.evaluate("() => UI.libFilter.cat") == cat, f"[{tag}] 'Alle N tonen' filters on category {cat}")
    n1 = pg.locator("#lib-list .lib-card").count()
    total = pg.evaluate("() => SitLib.filtered(S()).length")
    more = pg.locator("#lib-list [data-action=lib-more]")
    ok((more.count() == 1 and n1 == 80) if total > 80 else (more.count() == 0 and n1 == total), f"[{tag}] lazy rendering: first 80 cards + 'Toon nog' ({n1} of {total})")
    if more.count():
        more.click(); pg.wait_for_timeout(150)
        n2 = pg.locator("#lib-list .lib-card").count()
        ok(n2 > n1, f"[{tag}] 'Toon nog' renders more ({n1} -> {n2})")
    pg.screenshot(path=os.path.join(SHOTS, f"lib-all-{theme}-{w}.png"))
    pg.select_option("#main [data-live=lib-cat]", "")
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


def test_one_page(b):
    pg = new_page(b, preset="zorg")
    go(pg, "sits")
    ok(pg.locator("#main [data-action=sub][data-route=sits], #main .tabs [data-sub]").count() == 0, "[page] no sub-tabs on Informatietypen")
    ok(pg.locator("#main .lib-head [data-action=sit-new-open]").count() == 1, "[page] '+ Eigen type' in the library header")
    ok(pg.locator("#main .sit-labels .sit-lh [data-action=sit-overview]").count() == 1, "[page] 'Overzicht' button in the labels panel header")
    pg.close()


def test_own_types(b):
    """Custom SIT, EDM en fingerprint maken via ‘+ Eigen type’; ze verschijnen onder ‘Eigen typen’ en in de export."""
    pg = new_page(b, preset="generic")
    go(pg, "sits")
    n0 = pg.evaluate("() => S().sits.length")
    made = {}
    for kind, sel in [("custom", "#sit-testtext"), ("edm", "[data-action=edm-field-add]"), ("fingerprint", ".sit-ed")]:
        pg.click("#main [data-action=sit-new-open]"); pg.wait_for_timeout(150)
        ok(pg.locator(".modal .sit-new-opt").count() == 3, f"[own] chooser shows 3 options ({kind})")
        if kind == "custom":
            pg.screenshot(path=os.path.join(SHOTS, "sits-new-chooser.png"))
        pg.click(f".modal .sit-new-opt[data-kind={kind}]"); pg.wait_for_timeout(300)
        ok(pg.locator(".modal .sit-new-opt").count() == 0, f"[own] chooser closes after choosing {kind}")
        ok(pg.locator(f"#drawer-root {sel}").count() >= 1, f"[own] {kind} editor opens in side panel")
        sid = pg.evaluate("() => UI.sitEdit")
        made[kind] = sid
        name = {"custom": "Medewerkernummer Test", "edm": "EDM Klantregister Test", "fingerprint": "Fingerprint Contract Test"}[kind]
        f = pg.locator(f'#drawer-root [data-bind="sit:{sid}:name"]')
        f.fill(name); f.press("Tab"); pg.wait_for_timeout(200)
        ok(pg.evaluate("(id) => sitById(id).name", sid) == name, f"[own] {kind} name editable in side panel")
        if kind == "custom":
            pg.fill("#sit-regex", r"\bMW\d{6}\b"); pg.wait_for_timeout(100)
            pg.fill("#sit-testtext", "Medewerker MW123456 werkt hier"); pg.wait_for_timeout(700)
            ok("regex-hit" in pg.locator("#regex-out").inner_html(), "[own] regex test works in side panel")
            pg.screenshot(path=os.path.join(SHOTS, "sits-editor-custom.png"))
        pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
    ok(pg.evaluate("() => S().sits.length") == n0 + 3, "[own] three own types added to state")
    pg.click("#main [data-action=lib-kind][data-kind=own]"); pg.wait_for_timeout(150)
    names = lib_names(pg)
    ok(all(x in names for x in ["Medewerkernummer Test", "EDM Klantregister Test", "Fingerprint Contract Test"]), f"[own] own types listed under 'Eigen typen' ({names[:5]})")
    ok(pg.locator("#lib-list .lib-card [data-action=sit-edit]").count() >= 3, "[own] own types have an edit button in the library")
    pg.locator("#lib-list .lib-card", has_text="EDM Klantregister Test").locator("[data-action=sit-edit]").click(); pg.wait_for_timeout(200)
    ok(pg.locator("#drawer-root [data-action=edm-field-add]").count() == 1, "[own] edit button reopens EDM editor")
    pg.keyboard.press("Escape"); pg.wait_for_timeout(150)
    lid = labels(pg)[-1]["id"]
    pg.evaluate("([l, ids]) => ids.forEach(id => linkSit(l, {sitId: id}))", [lid, list(made.values())]); pg.wait_for_timeout(200)
    ps = pg.evaluate("() => { const r = PsExport.build(S()); return typeof r === 'string' ? r : JSON.stringify(r); }")
    ok("Medewerkernummer Test" in ps and "EDM Klantregister Test" in ps, "[own] PowerShell export contains own types")
    # sjabloon: filter ‘Eigen typen’ met sjablonen
    pg.click("#main [data-action=sit-new-open]"); pg.wait_for_timeout(150)
    pg.click(".modal [data-action=sit-new-tpl]"); pg.wait_for_timeout(300)
    f = pg.evaluate("() => UI.libFilter.kind")
    ok(f == "own" and pg.locator(".modal .sit-new-opt").count() == 0 and pg.locator("#lib-list .lib-card").count() > 3, f"[own] 'Start met een sjabloon' shows own types + templates ({f})")
    pg.close()


def test_deep_links(b):
    pg = new_page(b, preset="zorg")
    for sub, sel in [("list", "#drawer-root .sit-ov"), ("overview", "#drawer-root .sit-ov"), ("builder", "#drawer-root #sit-testtext"), ("custom", "#drawer-root #sit-testtext"),
                     ("edm", "#drawer-root .sit-ed"), ("fingerprint", "#drawer-root .sit-ed"), ("new", ".modal .sit-new-opt"), ("map", "#main .sit-labels")]:
        pg.evaluate("() => { if (Modal.cur) Modal.close(true); Drawer.close && Drawer.close(); App.go('start'); }"); pg.wait_for_timeout(150)
        go(pg, "sits", sub); pg.wait_for_timeout(200)
        ok(pg.locator(sel).count() >= 1 and pg.locator("#main .sit-labels").count() == 1, f"[deep] App.go('sits','{sub}') opens {sel}")
        if sub == "list":
            pg.screenshot(path=os.path.join(SHOTS, "sits-overview.png"))
    kinds = pg.evaluate("() => S().sits.filter(s => s.id === UI.sitEdit).map(s => s.kind)")
    ok(kinds == ["fingerprint"], f"[deep] 'fingerprint' opens a fingerprint ({kinds})")
    # zonder eigen typen: keuzedialoog
    pg.evaluate("() => { if (Modal.cur) Modal.close(true); Drawer.close && Drawer.close(); Store.update(st => { st.sits = st.sits.filter(s => !['custom','edm','fingerprint'].includes(s.kind)); st.labels.forEach(l => l.sits = (l.sits || []).filter(id => st.sits.some(s => s.id === id))); }); App.go('start'); }"); pg.wait_for_timeout(150)
    go(pg, "sits", "builder"); pg.wait_for_timeout(200)
    ok(pg.locator(".modal .sit-new-opt").count() == 3, "[deep] 'builder' without custom SITs opens the chooser")
    # overzicht: bewerken -> terug
    pg.evaluate("() => { Modal.close(true); }"); go(pg, "sits", "list")
    pg.locator("#drawer-root .sit-ov [data-action=sit-edit]").first.click(); pg.wait_for_timeout(200)
    back = pg.locator("#drawer-root [data-action=sit-overview]")
    ok(back.count() == 1, "[deep] editor opened from overview offers 'Terug naar het overzicht'")
    if back.count():
        back.click(); pg.wait_for_timeout(200)
        ok(pg.locator("#drawer-root .sit-ov").count() == 1, "[deep] back to overview works")
    pg.close()


def test_chips_readable(b, w, theme="light"):
    tag = f"chips-{theme}-{w}"
    pg = new_page(b, w=w, preset="zorg", theme=theme)
    go(pg, "sits")
    lid = labels(pg)[0]["id"]
    pg.evaluate("(l) => ['uk-nino', 'fr-tax-id-spi', 'entra-user-credentials'].forEach(r => linkSit(l, {kind: 'builtin', ref: r}))", lid); pg.wait_for_timeout(200)
    r = pg.evaluate("""() => [...document.querySelectorAll('.sit-row .st-cname')].map(e => ({ t: e.textContent, sw: e.scrollWidth, cw: e.clientWidth, sh: e.scrollHeight, ch: e.clientHeight, ov: getComputedStyle(e.closest('.chip')).textOverflow, ws: getComputedStyle(e.closest('.chip')).whiteSpace }))""")
    bad = [x["t"] for x in r if x["sw"] > x["cw"] + 1 or x["sh"] > x["ch"] + 1 or x["ov"] == "ellipsis" or x["ws"] == "nowrap"]
    ok(r and not bad, f"[{tag}] chip names fully readable, not truncated ({len(r)} chips, bad {bad[:3]})")
    tw = pg.evaluate("""() => [...document.querySelectorAll('.sit-row .lc-title')].filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent)""")
    ok(not tw, f"[{tag}] label names not truncated ({tw[:3]})")
    lt = pg.evaluate("""() => [...document.querySelectorAll('#lib-list .lib-title')].filter(e => e.scrollWidth > e.clientWidth + 1 || getComputedStyle(e).textOverflow === 'ellipsis').length""")
    ok(lt == 0, f"[{tag}] library card titles not truncated ({lt})")
    # veel chips: compact met ‘+x meer’
    big = pg.evaluate("() => orderedLabels(S()).map(l => [l.id, labelSits(l, S()).length]).sort((a, b) => b[1] - a[1])[0]")
    if big[1] > 5:
        ok(pg.locator(f"#sitlbl-{big[0]} .sit-chips > .sit-drag, #sitlbl-{big[0]} .sit-chips > .sit-inh").count() == 5 and pg.locator(f"#sitlbl-{big[0]} .st-more").count() == 1, f"[{tag}] tile with {big[1]} types shows 5 + '+x meer'")
        pg.click(f"#sitlbl-{big[0]} .st-more"); pg.wait_for_timeout(150)
        ok(pg.locator(f"#sitlbl-{big[0]} .sit-chips > .sit-drag, #sitlbl-{big[0]} .sit-chips > .sit-inh").count() == big[1], f"[{tag}] '+x meer' expands the tile")
    ov = pg.evaluate("() => document.documentElement.scrollWidth <= window.innerWidth && document.querySelector('#main').scrollWidth <= document.querySelector('#main').clientWidth + 1")
    ok(ov, f"[{tag}] no horizontal overflow")
    pg.screenshot(path=os.path.join(SHOTS, f"sits-tiles-{tag}.png"))
    pg.close()


def test_big_library(b):
    pg = new_page(b, preset="generic")
    go(pg, "sits")
    n = pg.evaluate("() => CATALOG.builtinSits.length")
    regs = pg.evaluate("() => [...document.querySelectorAll('#main [data-live=lib-region] option')].map(o => o.value)")
    ok(regs[:4] == ["", "NL", "EU", "BE"], f"[big] region list starts with Alle landen, NL, EU, BE ({regs[:5]})")
    pg.select_option("#main [data-live=lib-region]", "NL"); pg.wait_for_timeout(200)
    rr = pg.evaluate("() => [...document.querySelectorAll('#lib-list .lib-card')].map(c => JSON.parse(c.dataset.payload)).filter(p => p.ref).map(p => (CATALOG.builtinSits.find(s => s.id === p.ref) || {}).region)")
    ok(rr and all(x == "NL" for x in rr), f"[big] region filter NL shows only Dutch SITs ({len(rr)})")
    pg.select_option("#main [data-live=lib-region]", ""); pg.wait_for_timeout(150)
    pg.fill("#main [data-live=lib-search]", "zzqqxx"); pg.wait_for_timeout(200)
    ok(pg.locator("#lib-list [data-action=sit-new-open]").count() == 1, "[big] empty search offers '+ Eigen type maken'")
    if n >= 300:
        pg.fill("#main [data-live=lib-search]", "Italy driver"); pg.wait_for_timeout(250)
        names = lib_names(pg)
        ok(any(x.lower().startswith("italy driver") for x in names), f"[big] search finds Italy driver's license number in {n} SITs ({names[:3]})")
        t = pg.evaluate("() => { const t0 = performance.now(); App.render(); return performance.now() - t0; }")
        ok(t < 400, f"[big] render with {n} SITs is fast ({t:.0f} ms)")
    else:
        print(f"SKIP big catalog search (only {n} built-in SITs)")
    pg.close()


def test_label_list(b, w, theme="light"):
    """Twee panelen: alle labels onder elkaar in het labelpaneel (links), de bibliotheek ernaast; de lijst scrolt zelf."""
    for preset in ("generic", "zorg"):
        pg = new_page(b, w, 900, preset, theme)
        go(pg, "sits")
        r = pg.evaluate("""() => { const rows = [...document.querySelectorAll('#main .sit-list > .sit-row')];
          const pos = rows.map(c => { const t = c.querySelector('.lc-title').getBoundingClientRect(); return { sub: c.classList.contains('sub'), left: Math.round(t.left), top: c.getBoundingClientRect().top }; });
          const main = pos.filter(p => !p.sub), subs = pos.filter(p => p.sub);
          const list = document.querySelector('#main .sit-list'); const cs = getComputedStyle(list);
          return { n: rows.length, labels: orderedLabels(S()).length, mainSpread: main.length ? Math.max(...main.map(p => p.left)) - Math.min(...main.map(p => p.left)) : 99,
            asc: pos.every((p, i) => i === 0 || p.top > pos[i - 1].top), subIndent: subs.every(s => s.left > main[0].left + 4),
            order: rows.map(x => x.id.replace('sitlbl-', '')).join() === orderedLabels(S()).map(l => l.id).join(), oy: cs.overflowY }; }""")
        ok(r["n"] >= 2 and r["n"] == r["labels"], f"[{preset} {w}] alle {r['n']} labels als rij in het labelpaneel")
        ok(r["mainSpread"] <= 1 and r["asc"], f"[{preset} {w}] labels staan onder elkaar: hoofdlabels zelfde left (spreiding {r['mainSpread']}px), oplopende top")
        ok(r["subIndent"] and r["order"], f"[{preset} {w}] schema-volgorde met ingesprongen sublabels")
        ok(r["oy"] in ("auto", "scroll"), f"[{preset} {w}] labellijst heeft een eigen verticale scroll ({r['oy']})")
        over = pg.evaluate("() => { const l = document.querySelector('#main .sit-list'); return l.scrollHeight - l.clientHeight; }")
        if over > 2:
            pg.evaluate("() => { const l = document.querySelector('#main .sit-list'); l.scrollTop = l.scrollHeight; }"); pg.wait_for_timeout(200)
            y0 = pg.evaluate("() => document.querySelector('#main .sit-list').scrollTop")
            pg.evaluate("() => App.render()"); pg.wait_for_timeout(200)
            y1 = pg.evaluate("() => document.querySelector('#main .sit-list').scrollTop")
            ok(y0 > 0 and abs(y1 - y0) <= 2, f"[{preset} {w}] scrollpositie van de labellijst blijft bewaard na een re-render ({y0} -> {y1})")
        else:
            ok(True, f"[{preset} {w}] labellijst past zonder scrollen")
        # SIT slepen naar het laatste label in de lijst werkt
        last = pg.locator("#main .sit-list > .sit-row").last
        lid = last.get_attribute('aria-label') or ''
        src = pg.locator('#main .lib-card[data-drag][data-payload*="builtin"]').first
        before = pg.evaluate("() => JSON.stringify(S().labels.map(l => l.sits || []))")
        drag(pg, src, last)
        pg.wait_for_timeout(300)
        ok(pg.evaluate("() => JSON.stringify(S().labels.map(l => l.sits || []))") != before, f"[{preset} {w}] SIT slepen naar het laatste label in de lijst werkt ({lid})")
        pg.screenshot(path=os.path.join(SHOTS, f"label-list-{preset}-{w}-{theme}.png"))
        pg.close()


with sync_playwright() as p:
    b = p.chromium.launch()
    test_label_list(b, 900)
    test_label_list(b, 1440, "dark")
    test_one_page(b)
    test_own_types(b)
    test_deep_links(b)
    test_chips_readable(b, 1440)
    test_chips_readable(b, 900, "dark")
    test_big_library(b)
    test_sits(b, "generic", "light", 1440)
    test_sits(b, "zorg", "dark", 1440)
    test_sits(b, "overheid", "light", 900)
    test_no_sortex(b)
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
