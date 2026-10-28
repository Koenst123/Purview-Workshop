import os as _os, pathlib as _pl, tempfile as _tf
_OUT = _os.environ.get("PYD_TEST_OUT") or _os.path.join(_tf.gettempdir(), "pyd-tests", _pl.Path(__file__).stem)
_os.makedirs(_OUT, exist_ok=True)
# Informatietypen: twee panelen naast elkaar – alle labels onder elkaar (links) en de bibliotheek (rechts).
# Tijdens slepen of kiezen staan alle labeldoelen compact in beeld, ook met veel labels.
# Gebruik: python t_r8_sitsdrag.py <app.html>
import sys, json, pathlib
from playwright.sync_api import sync_playwright

APP = sys.argv[1]
FAILS, ERRS = [], []


def ok(cond, msg):
    print(("PASS " if cond else "FAIL ") + msg)
    if not cond:
        FAILS.append(msg)


def page(b, w=1440, preset="generic", theme="light", h=900):
    pg = b.new_page(viewport={"width": w, "height": h})
    pg.on("pageerror", lambda e: ERRS.append(str(e)))
    pg.on("console", lambda m: ERRS.append(m.text) if m.type == "error" else None)
    pg.goto(pathlib.Path(APP).as_uri())
    pg.wait_for_function("typeof App !== 'undefined' && !!Store.state")
    pg.evaluate(f"() => {{ Store.replace(buildPresetState('{preset}', {{customer:'T'}})); Prefs.set('theme', '{theme}'); }}")
    pg.wait_for_timeout(150)
    return pg


def go(pg, route, sub=None):
    pg.evaluate(f"() => App.go({json.dumps(route)}{', ' + json.dumps(sub) if sub else ''})")
    pg.wait_for_timeout(250)


EXTRA = """(n) => { const names = ['Projectdossiers','Personeelszaken','Inkoopcontracten','Juridische zaken','Bestuursstukken','Medische gegevens','Klantdossiers','Onderzoeksdata','Aanbestedingen','Beveiligingsincidenten','Financiële jaarstukken'];
  Store.update(st => { const par = st.labels.filter(l => !l.parentId); for (let i = 0; i < n; i++) { const p = i % 3 === 2 ? par[par.length - 1] : null; st.labels.push(newLabel(names[i % names.length], { color: ['#C4314B','#038387','#CA5010','#498205'][i % 4], parentId: p ? p.id : null })); } }); }"""

ROWS = "#main .sit-list > .sit-row"
# Zichtbaarheid van alle labeldoelen: binnen de viewport, binnen elke scrollende voorouder en niet afgedekt.
VIS = """() => { const vw = innerWidth, vh = innerHeight; const rows = [...document.querySelectorAll('#main .sit-list > .sit-row')];
  const bad = [];
  rows.forEach((t) => { const r = t.getBoundingClientRect(); const name = (t.getAttribute('aria-label') || '').split(':')[0];
    if (r.width < 40 || r.height < 16 || r.left < -0.5 || r.top < -0.5 || r.right > vw + 0.5 || r.bottom > vh + 0.5) { bad.push(name + ' buiten viewport'); return; }
    for (let a = t.parentElement; a && a !== document.body; a = a.parentElement) { const cs = getComputedStyle(a);
      if (/(auto|scroll|hidden|clip)/.test(cs.overflowX + cs.overflowY)) { const s = a.getBoundingClientRect();
        if (r.left < s.left - 0.5 || r.right > s.right + 0.5 || r.top < s.top - 0.5 || r.bottom > s.bottom + 0.5) { bad.push(name + ' verborgen in ' + (a.id || a.className.split(' ')[0])); return; } } }
    const e = document.elementFromPoint(r.left + Math.min(r.width / 2, 120), r.top + Math.min(r.height / 2, 12)); if (!e || !t.contains(e)) bad.push(name + ' afgedekt'); });
  return { n: rows.length, bad }; }"""
PANELS = """() => { const a = document.querySelector('#main .sit-labels').getBoundingClientRect(), b = document.querySelector('#main .lib-panel').getBoundingClientRect(), m = document.getElementById('main').getBoundingClientRect();
  const inView = (r) => r.top >= m.top - 0.5 && r.bottom <= m.bottom + 0.5 && r.left >= m.left - 0.5 && r.right <= m.right + 0.5;
  return { beside: b.left >= a.right - 1, labels: inView(a), lib: inView(b), wl: Math.round(a.width), wb: Math.round(b.width) }; }"""
COMPACT = """() => ({ active: document.body.classList.contains('dnd-active') || document.body.classList.contains('tap-active'),
  compact: [...document.querySelectorAll('#main .sit-row .sit-chips, #main .sit-row .st-add, #main .sit-row button.drop-hint')].every(e => getComputedStyle(e).display === 'none'),
  note: getComputedStyle(document.querySelector('#main .sit-lnote')).display !== 'none' })"""
OVERFLOW = "() => ({ doc: document.documentElement.scrollWidth - document.documentElement.clientWidth, main: (() => { const m = document.getElementById('main'); return m.scrollWidth - m.clientWidth; })() })"
STATE = "() => JSON.stringify(S().labels.map(l => l.sits || []))"
MIDWORD = r"""() => { const out = []; document.querySelectorAll('#main .sit-row .lc-title').forEach((el) => {
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const re = /[A-Za-zÀ-ÿ]{6,}/g; let m;
    while ((m = re.exec(n.nodeValue))) { const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
      const rs = [...r.getClientRects()].filter(x => x.width > 0); if (rs.length > 1 && Math.abs(rs[0].top - rs[rs.length - 1].top) > 4) out.push(m[0]); } } });
  return out.slice(0, 5); }"""


def setup(b, w, n, theme="light", beamer=False, h=900):
    pg = page(b, w, "generic", theme, h)
    if beamer:
        pg.evaluate("() => Prefs.set('beamer', true)")
    if n > 9:
        pg.evaluate(EXTRA, n - 9)
    go(pg, "sits")
    # Alle built-in SIT's in de bibliotheek, zodat er genoeg ongekoppelde typen zijn om te slepen.
    pg.evaluate("() => { UI.libFilter.kind = 'builtin'; UI.libFilter.rec = false; App.render(); }"); pg.wait_for_timeout(150)
    return pg


def lib_card(pg, i=0):
    # Een type dat nog nergens aan gekoppeld is, zodat elk label het accepteert.
    return pg.locator('#main .lib-card[data-drag][data-payload*="builtin"]:not(:has(.lib-linked))').nth(i)


def start_drag(pg, src):
    src.scroll_into_view_if_needed()
    bb = src.bounding_box()
    x, y = bb["x"] + 14, bb["y"] + bb["height"] / 2
    pg.mouse.move(x, y); pg.mouse.down()
    for k in range(1, 6):
        pg.mouse.move(x - k * 4, y - k * 4); pg.wait_for_timeout(20)
    pg.wait_for_timeout(150)


def drag_to(pg, tgt, steps=14):
    """Muis staat al ingedrukt (start_drag); positie van het doel pas nu meten (de lijst is dan compact)."""
    pos = pg.evaluate("() => ({ x: DnD.drag && DnD.drag.ghost ? parseFloat(DnD.drag.ghost.style.left) + DnD.drag.dx : 0, y: DnD.drag && DnD.drag.ghost ? parseFloat(DnD.drag.ghost.style.top) + DnD.drag.dy : 0 })")
    tb = tgt.bounding_box()
    x1, y1 = tb["x"] + min(tb["width"] / 2, 120), tb["y"] + min(tb["height"] / 2, 12)
    for k in range(1, steps + 1):
        pg.mouse.move(pos["x"] + (x1 - pos["x"]) * k / steps, pos["y"] + (y1 - pos["y"]) * k / steps); pg.wait_for_timeout(20)
    pg.wait_for_timeout(120)
    hover = tgt.evaluate("e => e.classList.contains('drop-hover')")
    pg.mouse.up(); pg.wait_for_timeout(350)
    return hover


def test_layout(b):
    """(a) Op 1440 staat de bibliotheek rechts naast het labelpaneel en zijn beide panelen tegelijk volledig in beeld."""
    for n in (9, 18):
        pg = setup(b, 1440, n)
        p = pg.evaluate(PANELS)
        ok(p["beside"], f"[1440, {n}] bibliotheek staat rechts naast het labelpaneel {p}")
        ok(p["labels"] and p["lib"], f"[1440, {n}] labelpaneel en bibliotheek tegelijk volledig in beeld {p}")
        ok(0.36 <= p["wl"] / (p["wl"] + p["wb"]) <= 0.48, f"[1440, {n}] verhouding labels/bibliotheek ≈ 40/60 ({p['wl']}/{p['wb']})")
        pg.evaluate("() => { document.getElementById('main').scrollTop = 9999; }"); pg.wait_for_timeout(250)
        p = pg.evaluate(PANELS)
        ok(p["labels"] and p["lib"], f"[1440, {n}] ook na scrollen van de pagina blijven beide panelen volledig in beeld {p}")
        rows = pg.evaluate(f"() => document.querySelectorAll('{ROWS}').length")
        ok(rows == n, f"[1440, {n}] {rows} labelrijen (sublabels tellen mee)")
        pg.close()


def test_drag(b, w, n):
    tag = f"[{n} labels, {w}px]"
    pg = setup(b, w, n)
    p = pg.evaluate(PANELS)
    ok(p["beside"], f"{tag} panelen naast elkaar {p}")

    # 1. Muis: tijdens slepen staan álle labels in beeld als compacte doelen
    before = pg.evaluate(STATE)
    start_drag(pg, lib_card(pg))
    st = pg.evaluate(COMPACT)
    ok(st["active"] and st["compact"] and st["note"], f"{tag} slepen klapt de labelrijen in tot compacte doelen met 'Laat los op een label' {st}")
    v = pg.evaluate(VIS)
    ok(v["n"] == n and not v["bad"], f"{tag} tijdens slepen alle {v['n']} labeldoelen volledig zichtbaar {v['bad'][:4]}")
    ok(not pg.evaluate(MIDWORD), f"{tag} geen woordbreuk in labelnamen {pg.evaluate(MIDWORD)}")
    ok(pg.evaluate(f"() => [...document.querySelectorAll('{ROWS}.drop-ok:not(.drop-hover)')].every(t => getComputedStyle(t).outlineStyle === 'none')"), f"{tag} rustige doelen: geen stippelrand per label")
    last = pg.locator(ROWS).last
    lid = pg.evaluate(f"() => {{ const t = [...document.querySelectorAll('{ROWS}')].pop(); return JSON.parse(t.dataset.target).labelId; }}")
    hov = drag_to(pg, last)
    ok(hov, f"{tag} laatste label licht op onder de muis")
    after = pg.evaluate(STATE)
    got = pg.evaluate(f"() => (labelById({json.dumps(lid)}).sits || []).length")
    ok(after != before and got >= 1, f"{tag} SIT slepen naar het laatste label werkt")
    pg.wait_for_timeout(200)
    r = pg.evaluate("""(lid) => { const t = document.getElementById('sitlbl-' + lid); const s = document.querySelector('#main .sit-list').getBoundingClientRect(); const tr = t.getBoundingClientRect();
      return { chips: !!t.querySelector('.sit-chips') && getComputedStyle(t.querySelector('.sit-chips')).display !== 'none', dnd: document.body.classList.contains('dnd-active'), inView: tr.top >= s.top - 1 && tr.top < s.bottom - 10 }; }""", lid)
    ok(r["chips"] and not r["dnd"], f"{tag} na loslaten weer volledige rijen met chips {r}")
    ok(r["inView"], f"{tag} na de drop staat het label met het nieuwe type in beeld in de lijst")
    ok(pg.evaluate("() => document.activeElement && document.activeElement.closest ? !document.activeElement.closest('.sit-list') || !!document.activeElement.closest('.sit-row') : true"), f"{tag} focus niet verloren in een verborgen element")
    ov = pg.evaluate(OVERFLOW)
    ok(ov["doc"] <= 0 and ov["main"] <= 0, f"{tag} geen horizontale paginaoverflow {ov}")

    # 2. Terugslepen naar de bibliotheek = loskoppelen
    sid = pg.evaluate(f"() => labelById({json.dumps(lid)}).sits.slice(-1)[0]")
    chip = pg.locator(f'#sitlbl-{lid} .sit-drag[data-payload*="{sid}"]')
    start_drag(pg, chip)
    ovl = pg.evaluate("() => { const o = document.querySelector('#main .lib-panel .lib-unlink-ov'); return o && getComputedStyle(o).display; }")
    ok(ovl == "flex", f"{tag} bibliotheek toont 'Loslaten om los te koppelen' bij slepen van een gekoppeld type ({ovl})")
    drag_to(pg, pg.locator("#main .lib-panel .lib-head"))
    ok(sid not in pg.evaluate(f"() => labelById({json.dumps(lid)}).sits || []"), f"{tag} terugslepen naar de bibliotheek koppelt los")
    pg.evaluate("() => Store.undo()"); pg.wait_for_timeout(200)
    ok(sid in pg.evaluate(f"() => labelById({json.dumps(lid)}).sits || []"), f"{tag} Ctrl+Z (undo) herstelt het loskoppelen")

    # 3. Tap-to-place: klik kiest, alle doelen in beeld, klik op label plaatst
    src = lib_card(pg, 1)
    name = src.get_attribute("data-pick-label") or ""
    src.click(); pg.wait_for_timeout(250)
    v = pg.evaluate(VIS)
    st = pg.evaluate(COMPACT)
    ok(st["active"] and st["compact"] and not v["bad"], f"{tag} tap-to-place: alle {v['n']} labels compact zichtbaar {v['bad'][:4]}")
    before = pg.evaluate(STATE)
    pg.locator(ROWS).nth(n - 2).click(); pg.wait_for_timeout(300)
    ok(pg.evaluate(STATE) != before and not pg.evaluate("() => document.body.classList.contains('tap-active')"), f"{tag} tap-to-place op het voorlaatste label plaatst '{name}'")

    # 4. Toetsenbord: Enter kiest, Shift+Tab naar een label, Enter plaatst; Esc annuleert
    src = lib_card(pg, 2)
    src.focus(); pg.keyboard.press("Enter"); pg.wait_for_timeout(200)
    ok(pg.evaluate(COMPACT)["compact"], f"{tag} toetsenbord: Enter op een type zet de lijst compact")
    hit = None
    for _ in range(80):
        pg.keyboard.press("Shift+Tab")
        hit = pg.evaluate("() => { const a = document.activeElement; return a && a.matches('#main .sit-row') ? JSON.parse(a.dataset.target).labelId : null; }")
        if hit:
            break
    ok(hit == lid, f"{tag} toetsenbord: Shift+Tab bereikt eerst het laatste label ({hit})")
    if hit:
        ring = pg.evaluate("() => { const r = document.activeElement.getBoundingClientRect(); const s = document.querySelector('#main .sit-list').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.top >= s.top - 1 && r.bottom <= s.bottom + 1; }")
        ok(ring, f"{tag} toetsenbord: gefocust label is in beeld")
        n0 = pg.evaluate(f"() => (labelById({json.dumps(hit)}).sits || []).length")
        pg.keyboard.press("Enter"); pg.wait_for_timeout(300)
        ok(pg.evaluate(f"() => (labelById({json.dumps(hit)}).sits || []).length") == n0 + 1, f"{tag} toetsenbord: Enter plaatst het type op het label")
    lib_card(pg, 3).focus(); pg.keyboard.press("Enter"); pg.wait_for_timeout(150)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(150)
    st = pg.evaluate(COMPACT)
    ok(not st["active"] and not st["compact"], f"{tag} toetsenbord: Esc annuleert en herstelt de rijen {st}")
    pg.close()


def test_themes_motion(b):
    for theme, beamer in (("dark", False), ("light", True)):
        pg = setup(b, 1440, 18, theme, beamer)
        p = pg.evaluate(PANELS)
        ok(p["beside"], f"[{theme}{' beamer' if beamer else ''} 1440, 18] panelen naast elkaar {p}")
        start_drag(pg, lib_card(pg))
        v = pg.evaluate(VIS)
        ok(not v["bad"], f"[{theme}{' beamer' if beamer else ''} 1440, 18] alle labeldoelen zichtbaar tijdens slepen {v['bad'][:3]}")
        pg.mouse.up(); pg.close()
    pg = setup(b, 900, 18)
    pg.evaluate("() => { Prefs.set('calm', true); App.render(); }")
    start_drag(pg, lib_card(pg))
    anim = pg.evaluate(f"() => [...document.querySelectorAll('{ROWS}')].map(t => getComputedStyle(t).animationName).filter(a => a !== 'none')")
    ok(not anim, f"[rustige weergave] geen animatie op de compacte doelen {anim[:3]}")
    pg.mouse.up(); pg.close()
    # 3440: veel ruimte, panelen naast elkaar en alles zichtbaar
    pg = setup(b, 3440, 9)
    p = pg.evaluate(PANELS)
    ok(p["beside"] and p["labels"] and p["lib"], f"[3440] panelen naast elkaar en volledig in beeld {p}")
    start_drag(pg, lib_card(pg))
    ok(not pg.evaluate(VIS)["bad"], "[3440] alle labels zichtbaar tijdens slepen")
    pg.mouse.up(); pg.close()
    # Smal: panelen onder elkaar, labels compact naast elkaar tijdens slepen
    pg = setup(b, 375, 18, h=760)
    p = pg.evaluate("() => { const a = document.querySelector('#main .sit-labels').getBoundingClientRect(), b = document.querySelector('#main .lib-panel').getBoundingClientRect(); return { stacked: b.top >= a.bottom - 1 }; }")
    ok(p["stacked"], f"[375] labels boven, bibliotheek eronder {p}")
    start_drag(pg, lib_card(pg))
    ok(not pg.evaluate(MIDWORD), f"[375, 18] geen woordbreuk in compacte labelnamen {pg.evaluate(MIDWORD)}")
    cols = pg.evaluate(f"() => new Set([...document.querySelectorAll('{ROWS}')].map(t => Math.round(t.getBoundingClientRect().left))).size")
    ok(cols >= 2, f"[375, 18] compacte labels gebruiken minstens twee kolommen ({cols})")
    pg.mouse.up(); pg.wait_for_timeout(200)
    src = lib_card(pg, 0)
    src.click(); pg.wait_for_timeout(200)
    before = pg.evaluate(STATE)
    pg.locator(ROWS).nth(1).click(); pg.wait_for_timeout(300)
    ok(pg.evaluate(STATE) != before, "[375] tap-to-place werkt op smal scherm")
    ov = pg.evaluate(OVERFLOW)
    ok(ov["doc"] <= 0 and ov["main"] <= 0, f"[375] geen horizontale paginaoverflow {ov}")
    pg.close()


with sync_playwright() as p:
    b = p.chromium.launch()
    test_layout(b)
    for n in (9, 18):
        for w in (1440, 900):
            test_drag(b, w, n)
    test_themes_motion(b)
    b.close()

ok(not ERRS, f"geen JS-fouten {ERRS[:5]}")
print(f"\n{len(FAILS)} fouten")
sys.exit(1 if FAILS else 0)