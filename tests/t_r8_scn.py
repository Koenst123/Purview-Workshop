import os as _os, pathlib as _pl, tempfile as _tf
_OUT = _os.environ.get("PYD_TEST_OUT") or _os.path.join(_tf.gettempdir(), "pyd-tests", _pl.Path(__file__).stem)
_os.makedirs(_OUT, exist_ok=True)
# Ronde 8b: scenario-visuals (scorecirkel, padmarkering, Ter info).
# Gebruik: python t_r8_scn.py <app.html>
import sys, json, pathlib
from playwright.sync_api import sync_playwright

APP = sys.argv[1]
FAILS, ERRS = [], []


def ok(cond, msg):
    print(("PASS " if cond else "FAIL ") + msg)
    if not cond:
        FAILS.append(msg)


def page(b, w=1440, preset="generic", theme="light"):
    pg = b.new_page(viewport={"width": w, "height": 900})
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


RING_JS = """() => {
  const ring = document.querySelector('#main .scn-ring'), v = ring && ring.querySelector('.scn-score-v'), t = ring && ring.querySelector('.scn-ring-t');
  if (!ring || !v) return null;
  const R = ring.getBoundingClientRect(), rg = document.createRange(); rg.selectNodeContents(v);
  const T = rg.getBoundingClientRect(), L = t ? t.getBoundingClientRect() : null;
  const cx = R.left + R.width / 2, cy = R.top + R.height / 2, inner = 0.78 * Math.min(R.width, R.height) / 2;
  const corners = [[T.left, T.top], [T.right, T.top], [T.left, T.bottom], [T.right, T.bottom]];
  const maxD = Math.max(...corners.map(([x, y]) => Math.hypot(x - cx, y - cy)));
  const lc = L ? [[L.left, L.top], [L.right, L.top], [L.left, L.bottom], [L.right, L.bottom]] : [];
  const lMax = lc.length ? Math.max(...lc.map(([x, y]) => Math.hypot(x - cx, y - cy))) : 0;
  return { txt: v.textContent, w: R.width, h: R.height, inner, maxD, lMax,
    dx: (T.left + T.width / 2) - cx, dy: (T.top + T.height / 2) - cy,
    inBox: T.left >= R.left + 2 && T.right <= R.right - 2 && T.top >= R.top + 2 && T.bottom <= R.bottom - 2,
    lblBelow: !L || L.top >= T.bottom - 1, sw: v.scrollWidth, cw: v.clientWidth };
}"""

PLAY_JS = """(mode) => {
  const rs = ScnUI.results(Store.state), counts = (r) => !r.uncertain && !r.ambiguous;
  let pick = [];
  if (mode === 'pass') pick = rs.filter((r) => counts(r) && r.status === 'pass').slice(0, 1);
  else if (mode === 'fail') pick = rs.filter((r) => counts(r) && r.status === 'fail').slice(0, 1);
  else pick = rs;
  UI.scnShowAll = false; UI.scnChannel = null; UI.scnPlayed = {}; pick.forEach((r) => (UI.scnPlayed[r.scn.id] = true));
  App.render();
  return pick.length;
}"""

HALO_JS = """() => {
  const n = document.querySelector('#modal-root .scnp-node.on'); if (!n) return null;
  const b = n.querySelector('.scnp-nbtn'), ico = n.querySelector('.scnp-ico'), h = n.querySelector('.scnp-halo');
  if (!h) return { noHalo: true };
  const I = ico.getBoundingClientRect(), H = h.getBoundingClientRect(), hs = getComputedStyle(h), bs = getComputedStyle(b);
  return { dx: (H.left + H.width / 2) - (I.left + I.width / 2), dy: (H.top + H.height / 2) - (I.top + I.height / 2),
    round: hs.borderTopLeftRadius === '50%' || parseFloat(hs.borderTopLeftRadius) >= H.width / 2 - 1, square: Math.abs(H.width - H.height) <= 1,
    haloOn: hs.borderTopStyle !== 'none' && hs.borderTopColor !== 'rgba(0, 0, 0, 0)',
    btnShadow: bs.boxShadow, btnOutline: bs.outlineStyle, btnBg: bs.backgroundColor,
    focus: document.activeElement === b && b.matches(':focus-visible'), haloOutline: hs.outlineStyle };
}"""

INFO_JS = """() => {
  const rs = ScnUI.results(Store.state).filter((r) => (r.steps || []).some((s) => s.kind === 'info'));
  for (const r of rs) {
    ScnPath.open(r.scn.id);
    const m = ScnPath.cur.model || [];
    for (let k = 0; k < m.length; k++) {
      ScnPath.go(k, false);
      if (document.querySelector('#modal-root .scnp-info')) return { id: r.scn.id, k };
    }
    Modal.close && Modal.close();
  }
  return null;
}"""

INFO_CHECK_JS = """() => {
  const md = document.querySelector('#modal-root .scnp-modal'); if (!md) return null;
  const infos = [...md.querySelectorAll('.scnp-lines .scnp-info')];
  const clip = (el) => el.scrollWidth > el.clientWidth + 1;
  const pill = md.querySelector('.scnp-detail .scnp-pill');
  const other = md.querySelector('.scnp-lines .flow-step:not(.scnp-info) .fs-dot'), idot = infos[0] && infos[0].querySelector('.fs-dot');
  return { n: infos.length,
    struct: infos.every((li) => li.classList.contains('info') && li.querySelector('.fs-dot svg') && (li.querySelector('.scnp-info-k') || {}).textContent === 'Goed om te weten' && [...li.querySelectorAll('.scnp-info-t')].every((x) => x.textContent.trim().length > 3)),
    loneI: infos.some((li) => (li.querySelector('.fs-dot') || {}).textContent.trim() === 'i'),
    clipped: infos.flatMap((li) => [li, ...li.querySelectorAll('.scnp-info-k, .scnp-info-t')]).filter(clip).length + (pill && clip(pill) ? 1 : 0),
    noTerInfo: !/Ter info/.test(md.textContent),
    pillOk: !pill || !pill.classList.contains('s-info') || (/Goed om te weten/.test(pill.textContent) && !!pill.querySelector('svg')),
    align: other && idot ? Math.abs(other.getBoundingClientRect().left - idot.getBoundingClientRect().left) : 0 };
}"""


def ring_checks(b, w):
    pg = page(b, w)
    go(pg, "scenarios")
    for beamer in (False, True):
        for zoom in (80, 100, 150):
            pg.evaluate(f"() => {{ Prefs.set('beamer', {str(beamer).lower()}); Prefs.set('uiZoom', {zoom}); App.render(); }}")
            for mode, want in (("pass", "100%"), ("fail", "0%"), ("all", None)):
                n = pg.evaluate(PLAY_JS, mode)
                pg.wait_for_timeout(80)
                r = pg.evaluate(RING_JS)
                tag = f"ring {mode} w{w} beamer={beamer} zoom={zoom}"
                if not n or not r:
                    ok(False, f"{tag}: geen scenario/ring ({n}, {r})"); continue
                if want: ok(r["txt"] == want, f"{tag}: score '{r['txt']}' == {want}")
                else: ok(r["txt"].endswith("%") and r["txt"] not in ("0%", "100%"), f"{tag}: tussenwaarde '{r['txt']}'")
                ok(r["inBox"] and r["maxD"] <= r["inner"] - 1, f"{tag}: score binnen cirkel (hoek {r['maxD']:.1f} <= binnen {r['inner']:.1f}, ring {r['w']:.0f})")
                ok(abs(r["dx"]) <= 2 and abs(r["dy"]) <= 2, f"{tag}: score gecentreerd (dx {r['dx']:.1f}, dy {r['dy']:.1f})")
                ok(r["sw"] <= r["cw"] + 1, f"{tag}: score niet afgekapt")
                ok(r["lblBelow"] and r["lMax"] <= r["inner"], f"{tag}: label onder score en binnen cirkel ({r['lMax']:.1f})")
    pg.close()


def halo_checks(b, w, beamer, zoom):
    tag = f"pad w{w} beamer={beamer} zoom={zoom}"
    pg = page(b, w)
    pg.evaluate(f"() => {{ Prefs.set('beamer', {str(beamer).lower()}); Prefs.set('uiZoom', {zoom}); }}")
    go(pg, "scenarios")
    pg.evaluate(PLAY_JS, "all")
    pg.wait_for_timeout(100)
    pg.locator('#main [data-action="scn-path"]').first.click()
    pg.wait_for_timeout(300)
    pg.locator('#modal-root [data-action="scnp-play"]').click()
    pg.wait_for_timeout(1700)
    r = pg.evaluate(HALO_JS)
    ok(bool(r) and not r.get("noHalo"), f"{tag}: actieve markering aanwezig tijdens afspelen")
    if r and not r.get("noHalo"):
        ok(abs(r["dx"]) <= 1 and abs(r["dy"]) <= 1, f"{tag}: afspelen – markering concentrisch (dx {r['dx']:.2f}, dy {r['dy']:.2f})")
        ok(r["round"] and r["square"] and r["haloOn"], f"{tag}: afspelen – ronde zichtbare markering")
        ok(r["btnShadow"] == "none" and r["btnBg"] in ("rgba(0, 0, 0, 0)", "transparent"), f"{tag}: geen vierkant om de knop ({r['btnShadow']}, {r['btnBg']})")
    stage = pg.evaluate("() => ScnPath.cur && ScnPath.cur.stage")
    ok(isinstance(stage, int) and stage > 0, f"{tag}: afspelen schuift door ({stage})")
    pg.locator('#modal-root [data-action="scnp-play"]').click()
    pg.wait_for_timeout(100)
    pg.locator("#modal-root .scnp-node.on .scnp-nbtn").focus()
    pg.keyboard.press("ArrowLeft"); pg.wait_for_timeout(350)
    r = pg.evaluate(HALO_JS)
    if r and not r.get("noHalo"):
        ok(r["focus"], f"{tag}: toetsenbordfocus op actief padrondje")
        ok(abs(r["dx"]) <= 1 and abs(r["dy"]) <= 1, f"{tag}: focus – markering concentrisch (dx {r['dx']:.2f}, dy {r['dy']:.2f})")
        ok(r["haloOutline"] != "none" and r["btnOutline"] == "none", f"{tag}: focusring rond het rondje, niet om de knop ({r['haloOutline']}/{r['btnOutline']})")
    else:
        ok(False, f"{tag}: focus – geen markering")
    pg.close()


def info_checks(b, w, theme, beamer=False):
    tag = f"info w{w} {theme} beamer={beamer}"
    pg = page(b, w, theme=theme)
    pg.evaluate(f"() => Prefs.set('beamer', {str(beamer).lower()})")
    go(pg, "scenarios")
    pg.evaluate(PLAY_JS, "all")
    pg.wait_for_timeout(100)
    hit = pg.evaluate(INFO_JS)
    pg.wait_for_timeout(250)
    ok(bool(hit), f"{tag}: pad met info-stap gevonden ({hit})")
    r = pg.evaluate(INFO_CHECK_JS)
    if r:
        ok(r["n"] >= 1 and r["struct"], f"{tag}: info-callout met icoon, kop 'Goed om te weten' en tekst ({r['n']})")
        ok(not r["loneI"], f"{tag}: geen losse 'i'")
        ok(r["clipped"] == 0, f"{tag}: info-tekst en pill niet afgekapt ({r['clipped']})")
        ok(r["noTerInfo"] and r["pillOk"], f"{tag}: geen 'Ter info'; info-pill met icoon")
        ok(r["align"] <= 1.5, f"{tag}: info-icoon uitgelijnd met andere staptypen ({r['align']:.1f})")
    else:
        ok(False, f"{tag}: geen modal")
    pg.close()


with sync_playwright() as p:
    b = p.chromium.launch()
    for w in (1440, 375):
        ring_checks(b, w)
    for w, beamer, zoom in ((1440, False, 100), (1440, True, 150), (900, False, 80), (375, True, 150)):
        halo_checks(b, w, beamer, zoom)
    for w, theme, beamer in ((1440, "light", False), (1440, "dark", True), (375, "dark", False)):
        info_checks(b, w, theme, beamer)
    b.close()
ok(not ERRS, f"geen JS-fouten {ERRS[:5]}")
print(f"\n{len(FAILS)} fouten")
sys.exit(1 if FAILS else 0)
