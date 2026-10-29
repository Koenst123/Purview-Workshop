import os as _os, pathlib as _pl, tempfile as _tf
_OUT = _os.environ.get("PYD_TEST_OUT") or _os.path.join(_tf.gettempdir(), "pyd-tests", _pl.Path(__file__).stem)
_os.makedirs(_OUT, exist_ok=True)
# Ronde 8b: referentiearchitectuur (legenda rechts, geconsolideerde lijnen, rondleidingen).
# Gebruik: python t_r8_arch.py <app.html>
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


VSEG = r"""(() => {
  /* Verticale stukken uit een pad-d (alleen M/H/V/Q zoals de view ze schrijft). */
  const vsegs = (d) => { const out = [], toks = d.match(/[A-Za-z][^A-Za-z]*/g) || []; let x = 0, y = 0;
    toks.forEach((t) => { const c = t[0], v = (t.slice(1).match(/-?[\d.]+/g) || []).map(Number);
      if (c === 'M') { [x, y] = v; } else if (c === 'H') x = v[0]; else if (c === 'V') { if (Math.abs(v[0] - y) > 2) out.push([x, Math.min(y, v[0]), Math.max(y, v[0])]); y = v[0]; } else if (c === 'Q') { x = v[2]; y = v[3]; } });
    return out; };
  const g = document.querySelector('.ra-grid'), box = g.getBoundingClientRect();
  const cols = [...g.querySelectorAll(':scope > .ra-col .ra-blocks')].map((c) => { const r = c.getBoundingClientRect(); return [r.left - box.left, r.right - box.left]; });
  const gutter = (x) => cols.filter((c) => c[1] <= x).length;
  const byKey = {}, baseX = new Set();
  document.querySelectorAll('svg.ra-rel path.ra-b').forEach((p) => vsegs(p.getAttribute('d')).forEach(([x]) => baseX.add(Math.round(x * 2) / 2)));
  let n = 0, off = [];
  document.querySelectorAll('svg.ra-rel path.ra-e').forEach((p) => vsegs(p.getAttribute('d')).forEach(([x]) => {
    n++; const k = gutter(x) + '|' + p.dataset.k; (byKey[k] = byKey[k] || new Set()).add(Math.round(x * 2) / 2);
    if (![...baseX].some((bx) => Math.abs(bx - x) < 0.6)) off.push(p.dataset.a + '>' + p.dataset.b);
  }));
  const lanes = Object.fromEntries(Object.entries(byKey).map(([k, v]) => [k, v.size]));
  return { n, lanes, maxPerKind: Math.max(0, ...Object.values(lanes)), distinctX: new Set([].concat(...Object.values(byKey).map((v) => [...v]))).size,
           base: document.querySelectorAll('svg.ra-rel path.ra-b').length, edges: document.querySelectorAll('svg.ra-rel path.ra-e').length, off: off.slice(0, 5) };
})()"""

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = page(b)
    go(pg, "architectuur")
    E = pg.evaluate

    # (a) geen weergaveschakelaar 'Jullie ontwerp' meer; ontwerpstatus alleen in het detail
    ok(pg.locator('[data-action="arch-mode"]').count() == 0, "geen [data-action=arch-mode]")
    ok(not E("[...document.querySelectorAll('#main button, #main [role=group]')].some(x => /Jullie ontwerp/.test(x.innerText))"), "geen knop/schakelaar 'Jullie ontwerp'")
    ok(pg.locator(".ra-legend").count() == 0 and pg.locator(".ra-tools [data-action=arch-legend][aria-pressed=false]").count() == 1, "legenda standaard ingeklapt (rustig startbeeld)")
    pg.click(".ra-tools [data-action=arch-legend]"); pg.wait_for_timeout(200)
    ok(pg.locator(".ra-legend").count() == 1 and "Jullie ontwerp" not in pg.locator(".ra-legend").inner_text(), "legenda zonder sectie 'Jullie ontwerp'")
    ok(pg.locator(".arch-block .ab-state, .arch-block.st-on, .arch-block.st-todo").count() == 0, "geen statusbolletjes op kaarten")
    E("() => { UI.archMode = 'design'; UI.archSel = 'src-teams'; App.render(); }"); pg.wait_for_timeout(200)
    ok(pg.locator(".arch-detail .ad-design").count() == 1 and "In jullie ontwerp:" in pg.locator(".arch-detail .ad-design").inner_text()
       and pg.locator(".arch-block .ab-state").count() == 0, "oude UI.archMode='design' breekt niets; detail toont 'In jullie ontwerp'")
    E("() => { UI.archSel = 'cls-sit'; App.render(); }"); pg.wait_for_timeout(150)
    ok(pg.locator(".arch-detail .ad-design").count() == 1, "ontwerpstatus ook bij classificatieblok")
    E("() => { UI.archSel = 'oos-irm'; App.render(); }"); pg.wait_for_timeout(150)
    ok(pg.locator(".arch-detail .ad-design").count() == 0, "geen ontwerpregel bij blok buiten de workshop")
    E("() => { UI.archSel = ''; App.render(); }"); pg.wait_for_timeout(200)

    # (b) legenda rechts van het model op 1440, open en sticky; smaller: legenda boven het model
    lg = E("""(() => { const l = document.querySelector('#ra-legend'), g = document.querySelector('.ra-grid'), m = document.querySelector('.ra-main');
        if (!l || !g) return null; const a = l.getBoundingClientRect(), r = g.getBoundingClientRect(), mm = m.getBoundingClientRect();
        return { left: a.left, gridRight: r.right, mainRight: mm.right, vis: a.width > 100 && a.height > 100, rail: getComputedStyle(document.querySelector('.ra-rail')).position,
                 pressed: !!document.querySelector('[data-action=arch-legend][aria-pressed=true]') }; })()""")
    ok(lg and lg["left"] >= lg["gridRight"] and lg["left"] >= lg["mainRight"] and lg["vis"], f"1440: legenda rechts van het model {lg}")
    ok(lg and lg["pressed"] and lg["rail"] == "sticky", f"1440: geopende legenda in sticky rechterkolom {lg}")
    E("() => { UI.archSel = 'pro-dlp'; App.render(); }"); pg.wait_for_timeout(250)
    dl = E("""(() => { const g = document.querySelector('.ra-grid').getBoundingClientRect(), d = document.querySelector('#arch-detail').getBoundingClientRect(), l = document.querySelector('#ra-legend').getBoundingClientRect();
        return { below: d.top >= g.bottom - 1, sameW: Math.abs(d.width - g.width) < 2, leftOfLegend: d.right <= l.left + 1, noRailSide: !document.querySelector('.ra-rail .ra-side') }; })()""")
    ok(all(dl.values()), f"1440 met legenda: uitleg onder de plaat, legenda rechts {dl}")
    E("() => { UI.archSel = ''; App.render(); }"); pg.wait_for_timeout(200)
    pg.click("#ra-legend .lg-x"); pg.wait_for_timeout(200)
    ok(pg.locator("#ra-legend").count() == 0 and pg.locator("[data-action=arch-legend][aria-pressed=false]").count() == 1, "legenda inklapbaar via de kop")
    pg.click(".ra-tools [data-action=arch-legend]"); pg.wait_for_timeout(200)
    ok(pg.locator("#ra-legend").count() == 1, "legenda weer open")
    for w in (1100, 900):
        pg.set_viewport_size({"width": w, "height": 900}); pg.wait_for_timeout(300)
        r = E("(() => { const l = document.querySelector('#ra-legend').getBoundingClientRect(), g = document.querySelector('.ra-grid').getBoundingClientRect(); return [l.bottom <= g.top + 1, document.documentElement.scrollWidth <= window.innerWidth + 1]; })()")
        ok(r[0] and r[1], f"{w}px: legenda boven het model, geen overflow {r}")
    pg.set_viewport_size({"width": 1440, "height": 900}); E("() => Prefs.set('uiZoom', 150)"); E("() => App.render()"); pg.wait_for_timeout(300)
    r = E("(() => { const l = document.querySelector('#ra-legend').getBoundingClientRect(), g = document.querySelector('.ra-grid').getBoundingClientRect(); return [l.bottom <= g.top + 1, document.documentElement.scrollWidth <= window.innerWidth + 1, document.documentElement.dataset.ew]; })()")
    ok(r[0] and r[1], f"1440 met weergavegrootte 150%: legenda valt terug boven het model {r}")
    E("() => Prefs.set('uiZoom', 100)"); E("() => App.render()"); pg.wait_for_timeout(300)

    # (c) consolidatie: per goot en soort relatie hooguit twee verticale banen (doorgaand + binnen de fase)
    c = E(VSEG)
    ok(c["n"] > 50 and c["maxPerKind"] <= 2, f"per goot en soort hooguit 2 verticale banen {c['lanes']}")
    ok(c["distinctX"] <= 20 and c["distinctX"] * 3 < c["edges"], f"weinig unieke verticale lijnen: {c['distinctX']} voor {c['edges']} relaties")
    ok(c["base"] <= 2 * E("Object.keys(CATALOG.arch.kinds).length") and c["base"] >= 3, f"samengevoegde laag: één pad per soort (+ gedimd) {c['base']}")
    ok(not c["off"], f"elke relatie ligt exact op een gebundelde baan {c['off']}")
    vis = E("(() => { const ps = [...document.querySelectorAll('svg.ra-rel path.ra-e')]; return ps.filter(p => getComputedStyle(p).opacity !== '0').length; })()")
    ok(vis == 0, f"losse relatiepaden standaard onzichtbaar (alleen de bundels) {vis}")
    pg.hover(".arch-block[data-id='lab-taxonomy']"); pg.wait_for_timeout(300)
    hv = E("""(() => { const ps = [...document.querySelectorAll('svg.ra-rel path.ra-e.hov')]; return { n: ps.length, own: ps.every(p => p.dataset.a === 'lab-taxonomy' || p.dataset.b === 'lab-taxonomy'),
        shown: ps.filter(p => +getComputedStyle(p).opacity > 0.9).length, base: +getComputedStyle(document.querySelector('svg.ra-rel path.ra-b')).opacity }; })()""")
    ok(hv["n"] >= 5 and hv["own"] and hv["shown"] == hv["n"] and hv["base"] < 0.3, f"aanwijzen: alleen eigen takken lichten op, bundels dimmen {hv}")
    pg.mouse.move(2, 2); pg.wait_for_timeout(200)
    heads = E("(() => { const d = [...document.querySelectorAll('svg.ra-rel path.ra-ah')].map(p => p.getAttribute('d')).join(''); return (d.match(/M/g) || []).length; })()")
    ok(0 < heads < E("CATALOG.arch.edges.length"), f"pijlpunten alleen bij het doel, gebundeld per aansluitpunt ({heads})")

    # (c2) startkaart: korte intro en Start rondleiding; de rondleidingen als kaarten (icoon, aantal stappen, één zin waarom) pas na uitklappen
    ok(pg.locator(".ra-start.is-closed").count() == 1 and pg.locator(".ra-start .rs-card").count() == 0 and pg.locator(".ra-start .rs-startbtn").count() == 1
       and pg.locator(".ra-start .rs-x[aria-expanded=false]").count() == 1, "startkaart standaard compact: Start rondleiding zichtbaar, kaarten ingeklapt")
    pg.click(".ra-start .rs-x"); pg.wait_for_timeout(200)
    sc = E("""(() => { const s = document.querySelector('#main .ra-start'), g = document.querySelector('.ra-grid');
        const cards = [...document.querySelectorAll('.ra-start .rs-card[data-action=arch-path]')];
        return { n: cards.length, above: !!s && !!g && s.getBoundingClientRect().bottom <= g.getBoundingClientRect().top,
          ok: cards.every((c, i) => { const p = CATALOG.arch.paths[i]; return c.dataset.id === p.id && !!c.querySelector('.rs-cico svg') && c.innerText.includes(p.steps.length + ' stappen')
            && !!p.why && c.querySelector('.rs-cwhy').innerText.trim() === p.why && c.querySelectorAll('.rs-route .rs-dot').length === p.steps.length; }),
          start: !!document.querySelector('.ra-start .rs-startbtn[data-id="' + CATALOG.arch.paths[0].id + '"]'), lab: s && s.getAttribute('aria-labelledby') }; })()""")
    ok(sc["n"] == E("CATALOG.arch.paths.length") and sc["ok"] and sc["above"] and sc["start"] and sc["lab"] == "ra-start-h", f"startkaart met keuzekaarten (icoon, stappen, waarom) boven het model {sc}")
    pg.click(".ra-start .rs-x"); pg.wait_for_timeout(200)
    ok(pg.locator(".ra-start.is-closed").count() == 1 and pg.locator(".ra-start .rs-card").count() == 0 and pg.locator(".ra-start .rs-startbtn").count() == 1
       and pg.locator(".ra-start .rs-x[aria-expanded=false]").count() == 1 and E("document.activeElement && document.activeElement.classList.contains('rs-x')"), "startkaart inklapbaar; Start rondleiding blijft, focus op de knop")
    pg.keyboard.press("Enter"); pg.wait_for_timeout(200)
    ok(pg.locator(".ra-start .rs-card").count() == E("CATALOG.arch.paths.length") and pg.locator(".ra-start .rs-x[aria-expanded=true]").count() == 1, "startkaart weer uitklappen met Enter")
    pg.click(".ra-start .rs-startbtn"); pg.wait_for_timeout(250)
    p0 = E("CATALOG.arch.paths[0]")
    ok(E("UI.archPath") == p0["id"] and pg.locator(".ra-tour .rt-count").inner_text().strip() == f"Stap 1 van {len(p0['steps'])}" and pg.locator(".ra-start").count() == 0
       and E("document.activeElement && document.activeElement.id") == "ra-tour-h", "Start rondleiding start de eerste rondleiding; startkaart maakt plaats voor de stappenkaart")
    pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
    ok(pg.locator(".ra-start").count() == 1 and pg.locator(".ra-tour").count() == 0, "na sluiten is de startkaart terug")
    pid3 = E("CATALOG.arch.paths[2].id")
    pg.focus(f".ra-start .rs-card[data-id='{pid3}']"); pg.keyboard.press("Enter"); pg.wait_for_timeout(250)
    ok(E("UI.archPath") == pid3 and pg.locator(".ra-tour .rt-count").inner_text().strip().startswith("Stap 1 van"), "keuzekaart start met Enter die rondleiding")
    pg.keyboard.press("Escape"); pg.wait_for_timeout(200)

    # (d) elke rondleiding met het toetsenbord doorlopen
    E("() => Prefs.set('calm', true)")
    paths = E("CATALOG.arch.paths.map(p => ({ id: p.id, steps: p.steps.map(s => s[0]) }))")
    links = E("CATALOG.arch.paths.flatMap(p => p.steps.slice(1).map((s, i) => [p.id, p.steps[i][0], s[0], ArchView.link(p.steps[i][0], s[0]).edges.length]))")
    ok(all(l[3] > 0 for l in links), f"elke stapovergang heeft een verbinding in de plaat {[l for l in links if not l[3]]}")
    for pth in paths:
        pid, ids, n = pth["id"], pth["steps"], len(pth["steps"])
        pg.select_option("select[data-action=arch-path]", pid); pg.wait_for_timeout(250)
        ok(pg.locator(".ra-tour[aria-labelledby]").count() == 1 and pg.locator(".ra-tour .rt-body[aria-live=polite]").count() == 1, f"{pid}: stappenkaart met aria-live")
        ok(pg.locator(".arch-block .ab-step").count() == n and pg.locator(".ra-tour .arch-stepbtn").count() == n, f"{pid}: {n} genummerde markeringen en stapbolletjes")
        pg.focus(".ra-tour [data-action=arch-step][data-dir=next]")
        bad = []
        for i in range(n):
            st = E("""(() => { const c = document.querySelector('.ra-grid .arch-block.cur'), t = document.querySelector('.ra-tour'), m = document.getElementById('main').getBoundingClientRect();
                const r = c && c.getBoundingClientRect(), tb = t.getBoundingClientRect();
                return { id: c && c.dataset.id, n: document.querySelectorAll('.ra-grid .arch-block.cur').length, dim: c && c.classList.contains('dim'),
                  vis: !!r && r.width > 0 && r.top >= tb.bottom - 2 && r.bottom <= m.bottom + 2, count: t.querySelector('.rt-count').innerText.trim(),
                  dot: [...t.querySelectorAll('.arch-stepbtn')].findIndex(x => x.classList.contains('on')), on: document.querySelectorAll('svg.ra-rel path.ra-e.on').length,
                  exist: !!CATALOG.arch.blocks.find(b => b.id === (c && c.dataset.id)), focus: document.activeElement && document.activeElement.dataset.dir,
                  ph: t.classList.contains('ph-' + ((CATALOG.arch.blocks.find(b => b.id === (c && c.dataset.id)) || {}).col)) && !!c.closest('.ra-col.ph-' + ((CATALOG.arch.blocks.find(b => b.id === (c && c.dataset.id)) || {}).col)),
                  big: parseFloat(getComputedStyle(t.querySelector('.rt-name')).fontSize) > parseFloat(getComputedStyle(t.querySelector('.rt-txt p')).fontSize),
                  ico: !!t.querySelector('.rt-name .rt-bico svg'),
                  flow: (() => { const f = t.querySelector('.rt-flow'), cur = f && f.querySelector('.rt-chip.cur');
                    return !f ? 'none' : (cur && cur.innerText.trim() === (CATALOG.arch.blocks.find(b => b.id === c.dataset.id) || {}).name ? 'ok' : 'bad'); })() }; })()""")
            want = {"id": ids[i], "n": 1, "dim": False, "vis": True, "count": f"Stap {i + 1} van {n}", "dot": i, "exist": True, "ph": True, "big": True, "ico": True, "flow": "none" if i == 0 else "ok"}
            if any(st[k] != v for k, v in want.items()) or (i > 0 and st["on"] < 1) or (i > 0 and st["focus"] != "next"):
                bad.append((i + 1, st))
            pg.keyboard.press("Enter"); pg.wait_for_timeout(200)
        ok(not bad, f"{pid}: elke stap markeert het juiste zichtbare blok, voortgang klopt {bad[:2]}")
        ok(pg.locator(".ra-tour .rt-count").inner_text().strip() == "Samenvatting" and pg.locator(".ra-tour .rt-li").count() == n
           and pg.locator(".arch-block.cur").count() == 0 and pg.locator(".arch-block .ab-step").count() == n, f"{pid}: afsluitende samenvatting")
        sm = E("""(() => { const t = document.querySelector('.ra-tour'); return { end: t.classList.contains('is-end'), nums: [...t.querySelectorAll('.rt-li .rt-n')].map(x => x.innerText.trim()).join(','),
            ico: t.querySelectorAll('.rt-li .rt-li-ico svg').length, next: t.querySelectorAll('.rt-btns [data-action=arch-path]').length, nextTxt: (t.querySelector('.rt-next') || {}).innerText || '' }; })()""")
        ok(sm["end"] and sm["nums"] == ",".join(str(k + 1) for k in range(n)) and sm["ico"] == n and sm["next"] == 1 and "volgende rondleiding" in sm["nextTxt"].lower(),
           f"{pid}: samenvatting met genummerde stappen, iconen en 'Volgende rondleiding' {sm}")
        pg.keyboard.press("ArrowLeft"); pg.wait_for_timeout(200)
        ok(pg.locator(f".arch-block.cur[data-id='{ids[-1]}']").count() == 1, f"{pid}: pijl links gaat terug naar de laatste stap")
        E("() => document.activeElement && document.activeElement.blur()")
        pg.keyboard.press("ArrowLeft"); pg.wait_for_timeout(200)
        ok(n < 2 or pg.locator(f".arch-block.cur[data-id='{ids[-2]}']").count() == 1, f"{pid}: pijltjes werken ook zonder focus in de kaart")
        pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
        ok(pg.locator(".ra-tour").count() == 0 and E("UI.archPath") == "" and pg.locator(".arch-block .ab-step").count() == 0, f"{pid}: Esc sluit de rondleiding")
        ok(E("document.activeElement && document.activeElement.dataset.action") == "arch-path", f"{pid}: focus terug op de keuzelijst")
    # stapbolletje, blok in de plaat en 'volgende rondleiding'
    pg.select_option("select[data-action=arch-path]", paths[0]["id"]); pg.wait_for_timeout(200)
    pg.click(".ra-tour .arch-stepbtn >> nth=2"); pg.wait_for_timeout(200)
    ok(pg.locator(f".arch-block.cur[data-id='{paths[0]['steps'][2]}']").count() == 1 and E("document.activeElement.dataset.to") == "2", "stapbolletje springt naar stap 3, focus blijft")
    E(f"() => document.querySelector(\".ra-grid .arch-block[data-id='{paths[0]['steps'][0]}']\").click()"); pg.wait_for_timeout(200)
    ok(pg.locator(".ra-tour .rt-count").inner_text().strip().startswith("Stap 1"), "klik op een stapblok in de plaat gaat naar die stap")
    E("() => archGoStep(99)"); pg.wait_for_timeout(200)
    nxt = pg.locator(".ra-tour .rt-btns [data-action=arch-path]")
    ok(nxt.count() == 1, "samenvatting biedt de volgende rondleiding aan")
    nxt.click(); pg.wait_for_timeout(200)
    ok(E("UI.archPath") == paths[1]["id"] and pg.locator(".ra-tour .rt-count").inner_text().strip() == f"Stap 1 van {len(paths[1]['steps'])}", "volgende rondleiding start bij stap 1")
    pg.click(".ra-tour .rt-x"); pg.wait_for_timeout(200)
    ok(pg.locator(".ra-tour").count() == 0, "sluitknop sluit de rondleiding")
    # beweging: kalm = geen animatie op de stappenkaart
    pg.select_option("select[data-action=arch-path]", paths[0]["id"]); pg.wait_for_timeout(200)
    an = E("getComputedStyle(document.querySelector('.ra-tour .rt-step')).animationName")
    ok(an == "none", f"Rustige weergave: geen animatie ({an})")
    an2 = E("getComputedStyle(document.querySelector('.ra-grid .arch-block.cur')).animationName")
    ok(an2 == "none", f"Rustige weergave: geen markeringsanimatie op het actieve blok ({an2})")
    E("() => Prefs.set('calm', false)"); E("() => App.render()"); pg.wait_for_timeout(200)
    an = E("getComputedStyle(document.querySelector('.ra-tour .rt-step')).animationName")
    ok(an != "none", f"zonder Rustige weergave: zachte overgang ({an})")

    # (e) routekaart in de stappenkaart: de pijlen volgen de echte richting van de relaties in de plaat
    #     (eerder stond er altijd "Vanuit stap N  A > B", ook als de relatie andersom liep of via een ander blok ging)
    fl = E("""(() => { const A = CATALOG.arch, nm = (id) => (ArchView.byId(id) || {}).name, bad = [];
        const has = (x, y) => A.edges.some(e => e[0] === x && e[1] === y);
        A.paths.forEach((p) => { archClear(); UI.archPath = p.id; App.render();
          p.steps.forEach((s, i) => { if (!i) return; archGoStep(i);
            const f = document.querySelector('.ra-tour .rt-flow'), chips = f ? [...f.querySelectorAll('.rt-chip')].map(c => c.innerText.trim()) : [];
            const arrs = f ? [...f.querySelectorAll('.rt-arr')].map(a => !a.classList.contains('back')) : [], L = ArchView.link(p.steps[i - 1][0], s[0], new Set(p.steps.slice(0, i).map(x => x[0])));
            const okSeq = L.seq.length > 1 && L.seq[0] === p.steps[i - 1][0] && L.seq[L.seq.length - 1] === s[0] && L.seq.slice(1).every((y, k) => L.fwd[k] ? has(L.seq[k], y) : has(y, L.seq[k]));
            const okDom = chips.join('|') === L.seq.map(nm).join('|') && arrs.join() === L.fwd.join();
            const head = (f && f.querySelector('.rt-flow-h') || {}).innerText || '', okHead = L.fwd.every(Boolean) ? head === 'Vanuit stap ' + i : head === 'Samenhang met stap ' + i;
            if (!(okSeq && okDom && okHead)) bad.push([p.id, i + 1, chips.join(' / '), arrs.join(), head]); }); });
        archClear(); App.render(); return bad; })()""")
    ok(not fl, f"stappenkaart: route en pijlrichting kloppen met de relaties in de plaat {fl[:3]}")
    cp = E("""(() => { const p = CATALOG.arch.paths.find(x => x.id === 'copilot'); archClear(); UI.archPath = p.id; App.render(); archGoStep(p.steps.length - 1);
        const chips = [...document.querySelectorAll('.ra-tour .rt-flow .rt-chip')].map(c => c.innerText.trim()); archClear(); App.render(); return chips; })()""")
    ok(cp == ["Unified audit log", "DLP for Microsoft 365 Copilot & Copilot Chat", "DSPM"], f"route bij voorkeur via eerdere stappen (audit -> DSPM via DLP for Copilot) {cp}")
    E(f"() => {{ archClear(); UI.archPath = {json.dumps(paths[0]['id'])}; App.render(); archGoStep(99); }}"); pg.wait_for_timeout(200)
    ok(E("getComputedStyle(document.querySelector('.ra-tour.is-end')).position") != "sticky", "samenvatting is niet sticky (plaat blijft bereikbaar bij scrollen)")
    E("() => { archClear(); App.render(); }"); pg.wait_for_timeout(150)

    # (f) licenties: specifieke badges (PAYG, Copilot), onbekende licentie zonder badge, lenstekst zonder kleine letters
    lic = E("""(() => { const t = (id) => { const el = document.querySelector('.arch-block[data-id="' + id + '"]'); return { tag: (el.querySelector('.ab-tier') || {}).textContent || '', aria: el.getAttribute('aria-label') }; };
        return { od: t('cls-ondemand'), inh: t('lab-copilot'), ai: t('cls-ai'), dlp: t('pro-dlp'), irm: t('oos-irm') }; })()""")
    ok(lic["od"]["tag"] == "PAYG" and "pay-as-you-go" in lic["od"]["aria"], f"on-demand classification: PAYG {lic['od']}")
    ok(lic["inh"]["tag"] == "Copilot" and "Copilot-licentie" in lic["inh"]["aria"], f"label inheritance: Copilot-licentie {lic['inh']}")
    ok(lic["ai"]["tag"] == "" and "licentie nog niet bekend" in lic["ai"]["aria"] and "Roadmap" in lic["ai"]["aria"], f"AI classifiers: licentie onbekend (roadmap), geen verzonnen badge {lic['ai']}")
    ok(lic["irm"]["aria"].endswith("buiten deze workshop"), f"aria-label noemt 'buiten deze workshop' {lic['irm']}")
    pg.select_option("select[data-action=arch-tier]", "e3"); pg.wait_for_timeout(200)
    lens = pg.locator(".ra-lens").inner_text()
    ok("E3" in lens and " e3" not in lens, f"licentielens zonder kleine letters (E3) {lens[:80]}")
    pg.select_option("select[data-action=arch-tier]", "addon"); pg.wait_for_timeout(200)
    ok("Copilot / pay-as-you-go" in pg.locator(".ra-lens").inner_text() and pg.locator(".arch-block[data-id='cls-ai'].dim").count() == 1, "lens Copilot / pay-as-you-go: AI classifiers (onbekend) valt erbuiten")
    E("() => { archClear(); UI.archSel = 'cls-ai'; App.render(); }"); pg.wait_for_timeout(150)
    ok("Microsoft 365-roadmap" in pg.locator("#arch-detail .ad-actions").inner_text(), "roadmaplink heet 'Microsoft 365-roadmap', niet 'Microsoft Learn'")
    E("() => { UI.archLegend = true; UI.archSel = ''; App.render(); }"); pg.wait_for_timeout(150)
    lg = pg.locator("#ra-legend").inner_text()
    ok(all(x in lg for x in ("PAYG", "Copilot", "Toelichting bij de plaat")), "legenda: PAYG, Copilot en toelichting")
    E("() => { UI.archLegend = false; App.render(); }"); pg.wait_for_timeout(150)

    # breedtes en thema's met rondleiding actief: geen horizontale overflow
    pg.select_option("select[data-action=arch-path]", paths[0]["id"]); pg.wait_for_timeout(200)
    for w in (375, 900, 1440, 3440):
        for th, beam in (("light", "false"), ("dark", "false"), ("light", "true")):
            pg.set_viewport_size({"width": w, "height": 900})
            E(f"() => {{ Prefs.set('theme', '{th}'); Prefs.set('beamer', {beam}); App.render(); }}"); pg.wait_for_timeout(200)
            o = E("[document.documentElement.scrollWidth - document.documentElement.clientWidth, document.getElementById('main').scrollWidth - document.getElementById('main').clientWidth]")
            if o[0] > 1 or o[1] > 1:
                ok(False, f"overflow {w}px {th} beamer={beam}: {o}")
    ok(True, "overflow-ronde klaar (375/900/1440/3440, licht/donker/beamer)")
    b.close()

ok(not ERRS, f"geen JS-fouten {ERRS[:5]}")
print(f"\n{len(FAILS)} fouten")
sys.exit(1 if FAILS else 0)
