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
    pg.evaluate(f"() => {{ {ALL_OPEN}; App.render(); }}")
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


HEAD_JS = r"""() => { const vis = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  const nm = (h) => { const l = h.getAttribute('aria-labelledby'); if (l) return l.split(/\s+/).map((i) => (document.getElementById(i) || {}).textContent || '').join(' ').trim();
    if (h.getAttribute('aria-label')) return h.getAttribute('aria-label').trim();
    const c = h.cloneNode(true); c.querySelectorAll('[aria-hidden="true"], [hidden]').forEach((x) => x.remove()); return c.textContent.replace(/\s+/g, ' ').trim(); };
  return [...document.querySelectorAll('#main h1, #main h2, #main h3, #main h4, #main h5, #main h6, #main [role="heading"]')].filter(vis)
    .filter((h) => !nm(h) || !(h.innerText || '').trim()).map((h) => h.tagName + '.' + h.className); }"""

FOCUS_JS = """() => [...document.querySelectorAll('#main button, #main a[href], #main input, #main select, #main textarea, #main summary, #main [tabindex]:not([tabindex="-1"])')].filter((e) => !e.disabled && e.getClientRects().length).length"""

GROUPS_JS = """() => [...document.querySelectorAll('#main .scn-group')].map((g) => { const b = g.querySelector('.scn-ghead h2 > button.scn-gtoggle'), pid = b && b.getAttribute('aria-controls'), p = pid && document.getElementById(pid);
  return { ch: g.dataset.ch, btn: !!b, exp: b && b.getAttribute('aria-expanded'), panel: !!p && g.contains(p), hidden: !!p && p.hidden, cards: g.querySelectorAll('.scn-card').length,
    sum: (g.querySelector('.scn-gsum') || {}).textContent || '', meter: !!g.querySelector('.scn-gmeter'), play: !!g.querySelector('[data-action="scn-play-group"]') }; })"""

ALL_OPEN = "UI.scnOpen = Object.fromEntries(Object.keys(CATALOG.scenarioChannels).map((k) => [k, true]))"


def group_checks(b):
    """Kanaalgroepen standaard ingeklapt (disclosure), lege koppen, filter, Speel alles af en deeplinks."""
    for preset in ("generic", "zorg", "overheid"):
        pg = page(b, preset=preset)
        go(pg, "scenarios")
        tag = f"groepen {preset}"
        g = pg.evaluate(GROUPS_JS)
        ok(len(g) >= 5 and all(x["btn"] and x["exp"] == "false" and x["panel"] and x["hidden"] and x["cards"] == 0 for x in g), f"{tag}: standaard alle groepen ingeklapt met h2 > button[aria-expanded=false] ({len(g)})")
        n = pg.evaluate(FOCUS_JS)
        ok(n < 80, f"{tag}: focusbare elementen in #main < 80 ({n})")
        ok(not pg.evaluate(HEAD_JS), f"{tag}: geen lege koppen (ingeklapt) {pg.evaluate(HEAD_JS)[:3]}")
        pg.evaluate(f"() => {{ {ALL_OPEN}; Actions['scn-play-all'](); App.render(); }}")
        pg.wait_for_timeout(200)
        ok(not pg.evaluate(HEAD_JS), f"{tag}: geen lege koppen (alles open, afgespeeld) {pg.evaluate(HEAD_JS)[:3]}")
        pg.close()

    pg = page(b)
    go(pg, "scenarios")
    # (c) muis en toetsenbord
    btn = pg.locator('#main [data-action="scn-group"][data-key="exchange"]')
    btn.click(); pg.wait_for_timeout(150)
    ex = [x for x in pg.evaluate(GROUPS_JS) if x["ch"] == "exchange"][0]
    ok(ex["exp"] == "true" and not ex["hidden"] and ex["cards"] > 0, f"klik opent groep ({ex['exp']}, {ex['cards']} kaarten)")
    ok(pg.evaluate("document.activeElement && document.activeElement.dataset.key") == "exchange", "focus blijft op groepsknop na klik")
    others = [x for x in pg.evaluate(GROUPS_JS) if x["ch"] != "exchange"]
    ok(all(x["exp"] == "false" and x["cards"] == 0 for x in others), "andere groepen blijven dicht")
    pg.keyboard.press("Enter"); pg.wait_for_timeout(150)
    ex = [x for x in pg.evaluate(GROUPS_JS) if x["ch"] == "exchange"][0]
    ok(ex["exp"] == "false" and ex["cards"] == 0, "Enter sluit groep")
    pg.keyboard.press("Space"); pg.wait_for_timeout(150)
    ex = [x for x in pg.evaluate(GROUPS_JS) if x["ch"] == "exchange"][0]
    ok(ex["exp"] == "true" and ex["cards"] > 0, "Spatie opent groep")
    pg.keyboard.press("Tab")
    ok(pg.evaluate("() => !!document.activeElement.closest('.scn-group[data-ch=\"exchange\"]')"), "Tab gaat van groepskop naar inhoud van de groep")
    ok(not pg.evaluate("JSON.stringify(Store.state).includes('scnOpen')"), "open/dicht niet in het ontwerp")
    # Alles uitklappen / inklappen
    pg.locator('#main [data-action="scn-groups-all"]').click(); pg.wait_for_timeout(150)
    g = pg.evaluate(GROUPS_JS)
    ok(all(x["exp"] == "true" and x["cards"] > 0 for x in g), "‘Alles uitklappen’ opent alle groepen")
    ok("inklappen" in pg.locator('#main [data-action="scn-groups-all"]').inner_text(), "knop wordt ‘Alles inklappen’")
    pg.locator('#main [data-action="scn-groups-all"]').click(); pg.wait_for_timeout(150)
    ok(all(x["exp"] == "false" and x["cards"] == 0 for x in pg.evaluate(GROUPS_JS)), "‘Alles inklappen’ sluit alle groepen")
    # (d) kanaalfilter opent de juiste groep
    pg.locator('#main [data-action="scn-channel"][data-ch="endpoint"]').click(); pg.wait_for_timeout(150)
    g = pg.evaluate(GROUPS_JS)
    ok(len(g) == 1 and g[0]["ch"] == "endpoint" and g[0]["exp"] == "true" and g[0]["cards"] == pg.evaluate("ScnUI.filtered(S()).length"), f"kanaalfilter opent de gekozen groep {[(x['ch'], x['exp'], x['cards']) for x in g]}")
    pg.locator('#main [data-action="scn-channel"][data-ch=""]').click(); pg.wait_for_timeout(150)
    # (e) Speel alles af: inklapstand blijft, kop toont uitkomsten
    pg.evaluate("() => { UI.scnOpen = {}; App.render(); }")
    pg.locator('#main [data-action="scn-play-all"]').click(); pg.wait_for_timeout(300)
    g = pg.evaluate(GROUPS_JS)
    ok(all(x["exp"] == "false" and x["cards"] == 0 for x in g), "na ‘Speel alles af’ blijven groepen ingeklapt")
    ok(all(x["meter"] and not x["play"] and "open" not in x["sum"] and any(w in x["sum"] for w in ("klopt", "te zwak", "strenger", "onzeker")) for x in g), f"ingeklapte groepskop toont uitkomst {[x['sum'] for x in g][:3]}")
    desc = pg.evaluate("() => { const b = document.querySelector('#main .scn-gtoggle'); const d = document.getElementById(b.getAttribute('aria-describedby')); return d ? d.textContent : ''; }")
    ok(bool(desc.strip()), f"groepsknop beschreven door samenvatting ({desc[:40]})")
    pg.evaluate("() => { UI.scnPlayed = {}; App.render(); }")
    pg.locator('#main [data-action="scn-show-all"]').click(); pg.wait_for_timeout(200)
    g = pg.evaluate(GROUPS_JS)
    ok(all(x["exp"] == "false" and x["meter"] for x in g), "‘Toon alle uitkomsten’ behoudt inklapstand en toont uitkomst in kop")
    pg.locator('#main [data-action="scn-show-all"]').click(); pg.wait_for_timeout(150)
    # (f) deeplink en volgend scenario
    sid = pg.evaluate("ScnUI.results(S()).find((r) => r.scn.channel === 'copilot').scn.id")
    pg.evaluate("() => App.go('board')"); pg.wait_for_timeout(150)
    pg.evaluate(f"() => {{ UI.scnOpen = {{}}; UI.scnChannel = 'exchange'; Actions['scn-goto']({{ dataset: {{ id: {json.dumps(sid)} }} }}); }}")
    pg.wait_for_timeout(400)
    st = pg.evaluate(f"() => ({{ route: UI.route, open: ScnUI.isOpen('copilot'), card: !!document.querySelector('#main .scn-card[data-scn={json.dumps(sid)}]'), focus: document.activeElement && document.activeElement.dataset.scn, filter: UI.scnChannel }})")
    ok(st["route"] == "scenarios" and st["open"] and st["card"] and st["focus"] == sid and not st["filter"], f"deeplink opent groep, toont en focust kaart {st}")
    pg.evaluate("() => { UI.scnOpen = {}; UI.scnPlayed = {}; App.render(); }")
    pg.locator('#main [data-action="scn-play-all"]').click(); pg.wait_for_timeout(300)
    pg.locator('#main [data-action="scn-paths"]').click(); pg.wait_for_timeout(300)
    first = pg.evaluate("ScnPath.cur.ids[0]"), pg.evaluate("ScnPath.cur.ids.find((id) => ScnUI.results(S()).find((r) => r.scn.id === id).scn.channel !== ScnUI.results(S()).find((r) => r.scn.id === ScnPath.cur.ids[0]).scn.channel)")
    ch0 = pg.evaluate(f"ScnUI.results(S()).find((r) => r.scn.id === {json.dumps(first[0])}).scn.channel")
    ok(pg.evaluate(f"ScnUI.isOpen({json.dumps(ch0)})"), f"pad-dialoog opent groep van het getoonde scenario ({ch0})")
    idx = pg.evaluate(f"ScnPath.cur.ids.indexOf({json.dumps(first[1])})")
    pg.evaluate(f"() => {{ ScnPath.cur.idx = {idx} - 1; }}")
    pg.locator('#modal-root [data-action="scnp-scn"][data-d="1"]').click(); pg.wait_for_timeout(250)
    ch1 = pg.evaluate(f"ScnUI.results(S()).find((r) => r.scn.id === {json.dumps(first[1])}).scn.channel")
    ok(pg.evaluate(f"ScnUI.isOpen({json.dumps(ch1)})") and pg.locator(f'#main .scn-card[data-scn="{first[1]}"]').count() == 1, f"‘Volgend scenario’ opent de juiste groep ({ch1})")
    ok(pg.evaluate("() => !!document.activeElement.closest('#modal-root')"), "focus blijft in pad-dialoog")
    pg.keyboard.press("Escape"); pg.wait_for_timeout(150)
    pg.close()
    # (g) geen overflow op smal
    for w in (375, 900):
        for theme, beamer in (("light", False), ("dark", True)):
            pg = page(b, w, theme=theme)
            pg.evaluate(f"() => Prefs.set('beamer', {str(beamer).lower()})")
            go(pg, "scenarios")
            for state in ("dicht", "open"):
                if state == "open":
                    pg.evaluate("() => { Actions['scn-play-all'](); UI.scnOpen = { exchange: true }; App.render(); }"); pg.wait_for_timeout(250)
                ov = pg.evaluate("() => { const m = document.querySelector('#main'); const bad = [...m.querySelectorAll('.scn-ghead, .scn-gtoggle, .scn-gbar, .scn-group')].filter((e) => e.getBoundingClientRect().right > m.getBoundingClientRect().right + 1).length; return [m.scrollWidth - m.clientWidth, bad]; }")
                ok(ov[0] <= 1 and ov[1] == 0, f"w{w} {theme} beamer={beamer} {state}: geen horizontale overflow {ov}")
            pg.close()


with sync_playwright() as p:
    b = p.chromium.launch()
    group_checks(b)
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
