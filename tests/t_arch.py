import os as _os, pathlib as _pl, tempfile as _tf
_TD = _pl.Path(__file__).resolve().parents[1]  # repo-root met src, Voorbeelden en de deliverable
_OUT = _os.environ.get("PYD_TEST_OUT") or _os.path.join(_tf.gettempdir(), "pyd-tests", _pl.Path(__file__).stem)
_os.makedirs(_OUT, exist_ok=True)
"""Architectuur: interactie, links vanuit pagina's, density en screenshots (licht/donker)."""
import sys, pathlib
from playwright.sync_api import sync_playwright
HTML, SHOTS = sys.argv[1], pathlib.Path(sys.argv[2]); SHOTS.mkdir(parents=True, exist_ok=True)
fails = []
def check(name, ok, info=""):
    print(("PASS " if ok else "FAIL ") + name + (f"  [{info}]" if info else ""))
    if not ok: fails.append(name)

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1600, "height": 950})
    pg.set_default_timeout(5000)
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(pathlib.Path(HTML).as_uri()); pg.wait_for_timeout(400)
    E = pg.evaluate
    E("Store.replace(buildPresetState('zorg',{customer:'Test BV'}))")
    E("App.go('architectuur')"); pg.wait_for_timeout(300)
    n = pg.locator(".arch-block").count()
    vis_more = E("[...document.querySelectorAll('.ra-more')].filter(x => x.getClientRects().length).length")
    check("bij openen: alles uitgeklapt, geen '+ meer'", n == E("CATALOG.arch.blocks.length") and vis_more == 0, (n, vis_more))
    check("bij openen: legenda ingeklapt (rustig startbeeld), knop beschikbaar", pg.locator("#ra-legend").count() == 0
          and pg.locator("[data-action=arch-legend][aria-pressed=false]").count() == 1)
    check("bij openen: alleen titels, omschrijving in preview en detail", E("[...document.querySelectorAll('.arch-block .ab-nl')].every(x => getComputedStyle(x).display === 'none')")
          and pg.locator("[data-action=arch-dense][aria-pressed=false]").count() == 1)
    vis_all = E("[...document.querySelectorAll('.ra-grid .arch-block')].every(x => x.getClientRects().length > 0)")
    check("geen Compact-knop, alle onderdelen zichtbaar", pg.locator("[data-action=arch-compact], [data-action=arch-more], [data-action=arch-all], .ra-more").count() == 0 and vis_all and n == E("CATALOG.arch.blocks.length"), (n, vis_all))
    check("geen Platen-tab", pg.locator("[data-action=arch-tab], .ra-tabs, .ra-plate, [data-action=arch-plate]").count() == 0
          and "Platen" not in pg.locator("#main").inner_text() and E("typeof ARCH_DIAGRAMS === 'undefined' && typeof ARCH_IMAGES === 'undefined'"))
    E("UI.archSel='lab-scale';App.render()"); pg.wait_for_timeout(200)
    check("selectie lab-scale zichtbaar (geen ingeklapte lanes meer)", pg.locator(".arch-block.sel[data-id='lab-scale']").count() == 1 and pg.locator(".arch-block.sel[data-id='lab-scale']").is_visible())
    E("UI.archSel='';App.render()")
    n = pg.locator(".arch-block").count()
    check("alles zichtbaar na selectie", n >= 25 and pg.locator(".ra-more").count() == 0, n)
    check("5 kolommen", pg.locator(".ra-col").count() == 5)
    words = E("document.querySelector('#main, main, .main') ? (document.querySelector('#main, main, .main').innerText.split(/\\s+/).length) : 0")
    print("woorden op pagina (algemeen):", words)
    pg.screenshot(path=str(SHOTS / "arch-generic.png"), full_page=True)

    pg.click(".arch-block >> nth=7"); pg.wait_for_timeout(200)
    check("detail na klik", pg.locator(".arch-detail:not(.empty-hint)").count() == 1)
    check("blok sel", pg.locator(".arch-block.sel").count() == 1)

    # Geen weergaveschakelaar meer: de ontwerpstatus staat als rustige regel in het detailpaneel.
    check("geen schakelaar 'Jullie ontwerp'", pg.locator("[data-action=arch-mode]").count() == 0 and pg.locator(".arch-block .ab-state").count() == 0)
    st = E("CATALOG.arch.blocks.filter(b => b.design && !b.out).map(b => ArchView.design(b, S()).text || '')")
    check("ontwerpstatus per blok beschikbaar", len(st) >= 20 and all(s for s in st), len(st))
    bad = [s for s in st if any(k in s for k in ["undefined", "NaN", "[object"])]
    check("status-teksten schoon", not bad, bad[:3])
    print("statussen:", st[:12])
    E("UI.archMode='design';UI.archSel='pro-dlp';App.render()"); pg.wait_for_timeout(200)
    dl = pg.locator(".arch-detail .ad-design")
    check("detail toont 'In jullie ontwerp' (oude archMode breekt niets)", dl.count() == 1 and dl.inner_text().startswith("In jullie ontwerp:") and pg.locator(".arch-block .ab-state").count() == 0, dl.count())
    E("UI.archSel='';App.render()"); pg.wait_for_timeout(150)
    pg.screenshot(path=str(SHOTS / "arch-design.png"), full_page=True)

    pg.select_option("select[data-action=arch-path]", index=1); pg.wait_for_timeout(200)
    check("rondleiding stappen", pg.locator(".arch-stepbtn").count() == 5)
    check("rondleiding markeert", pg.locator(".arch-block .ab-step").count() == 5)
    pg.click(".arch-stepbtn >> nth=2"); pg.wait_for_timeout(200)
    check("stap selecteert blok", pg.locator(".arch-block.sel .ab-step").count() == 1)
    pg.screenshot(path=str(SHOTS / "arch-path.png"), full_page=True)

    pg.select_option("select[data-action=arch-layer]", index=3); pg.wait_for_timeout(200)
    check("laagfilter dimt", pg.locator(".arch-block.dim").count() > 0)
    pg.focus("select[data-action=arch-tier]"); pg.select_option("select[data-action=arch-tier]", index=2); pg.wait_for_timeout(200)
    check("focus na select blijft", E("document.activeElement && document.activeElement.dataset.action") == "arch-tier")
    pg.click("[data-action=arch-reset]"); pg.wait_for_timeout(200)
    check("reset", pg.locator(".arch-block.dim").count() == 0 and pg.locator(".arch-stepbtn").count() == 0)

    # route-knop in detail
    pg.click(".arch-block >> nth=12"); pg.wait_for_timeout(200)
    go = pg.locator(".arch-detail [data-action=go]")
    if go.count():
        r = go.first.get_attribute("data-route"); go.first.click(); pg.wait_for_timeout(200)
        check("detail-knop navigeert", E("UI.route") == r, r)

    # links vanuit andere pagina's
    for route in ["schema", "sits", "board", "labels", "policies", "autolabel", "dlp", "endpoint", "copilot", "tenant"]:
        E(f"App.go('{route}')"); pg.wait_for_timeout(150)
        E("document.querySelectorAll('.page-head details.ph-more').forEach(d => d.open = true)")
        lk = pg.locator(".page-head .arch-link")
        if not lk.count(): check(f"link op {route}", False); continue
        want = lk.first.get_attribute("data-id"); lk.first.click(); pg.wait_for_timeout(200)
        ok = E("UI.route") == "architectuur" and pg.locator(f".arch-block.sel[data-id='{want}']").count() == 1
        check(f"link op {route} -> {want}", ok)

    E("App.go('start')"); pg.wait_for_timeout(200)
    check("start-knop", pg.locator("[data-route=architectuur]").count() >= 1)

    # dark + smal
    E("Prefs.set('theme','dark')"); E("UI.archMode='design';UI.archSel='pro-dlp';App.go('architectuur')"); pg.wait_for_timeout(300)
    pg.screenshot(path=str(SHOTS / "arch-dark.png"), full_page=True)
    pg.set_viewport_size({"width": 1100, "height": 900}); pg.wait_for_timeout(200)
    over = E("document.documentElement.scrollWidth > window.innerWidth + 2")
    check("geen horizontale pagina-scroll op 1100px", not over)
    pg.screenshot(path=str(SHOTS / "arch-narrow.png"), full_page=False)
    E("Store.replace(buildPresetState('empty',{customer:'X'}))"); E("UI.archMode='design';App.go('architectuur')"); pg.wait_for_timeout(200)
    check("leeg ontwerp ok", pg.locator(".arch-block").count() >= 18)

    # pariteit origineel + herontwerp
    pg.set_viewport_size({"width": 1600, "height": 950}); E("Prefs.set('theme','light')")
    E("UI.archMode='general';UI.archSel=null;UI.archPath=null;App.go('architectuur')"); pg.wait_for_timeout(200)
    pg.click(".arch-block[data-id='cls-sit']"); pg.wait_for_timeout(200)
    chips = pg.locator(".arch-detail .ad-chip[data-id]")
    check("relatiechips in detail", chips.count() >= 2, chips.count())
    check("upstream/downstream gemarkeerd", pg.locator(".arch-block.up, .arch-block.down").count() >= 2)
    E("document.querySelectorAll('.arch-detail details').forEach(d => d.open = true)")
    check("Ziet/Kan/Kan niet", pg.locator(".arch-detail .ad-tech dt").count() == 3)
    tgt = chips.first.get_attribute("data-id"); chips.first.click(); pg.wait_for_timeout(200)
    check("relatiechip selecteert", pg.locator(f".arch-block.sel[data-id='{tgt}']").count() == 1, tgt)
    # switcher houdt selectie vast en wisselt
    sw = pg.locator(".ra-side select[data-action=sw-pick]")
    check("switcher aanwezig", sw.count() == 1)
    check("switcher toont selectie", sw.input_value() == tgt, sw.input_value())
    pg.click(".ra-side .sw-step:not([disabled]) >> nth=-1"); pg.wait_for_timeout(200)
    cur = E("UI.archSel")
    check("switcher wisselt blok", cur and cur != tgt and pg.locator(f".arch-block.sel[data-id='{cur}']").count() == 1, cur)
    E("Prefs.set('pickerMode','list')"); E("App.go('architectuur')"); pg.wait_for_timeout(200)
    check("lijstmodus behoudt selectie", E("UI.archSel") == cur and pg.locator(".arch-detail:not(.empty-hint)").count() == 1)
    E("Prefs.set('pickerMode','compact')")
    # leeg vlak wist selectie, Esc reset
    pg.click(".ra-grid", position={"x": 5, "y": 5}); pg.wait_for_timeout(200)
    check("klik op lege ruimte wist selectie", pg.locator(".arch-block.sel").count() == 0)
    pg.click(".arch-block >> nth=3"); pg.select_option("select[data-action=arch-layer]", index=2); pg.wait_for_timeout(200)
    check("lensregel", pg.locator(".ra-lens").count() == 1)
    pg.locator("body").press("Escape"); pg.wait_for_timeout(200)
    check("Esc reset", pg.locator(".arch-block.dim").count() == 0 and pg.locator(".arch-block.sel").count() == 0)
    pg.click("[data-action=arch-dense]"); pg.wait_for_timeout(200)
    check("omschrijvingen tonen", E("[...document.querySelectorAll('.arch-block .ab-nl')].every(x => getComputedStyle(x).display !== 'none')")
          and pg.locator("[data-action=arch-dense][aria-pressed=true]").count() == 1)
    pg.click("[data-action=arch-dense]"); pg.wait_for_timeout(200)
    check("alleen titels", E("[...document.querySelectorAll('.arch-block .ab-nl')].every(x => getComputedStyle(x).display === 'none')"))
    pg.click("[data-action=arch-legend]"); pg.wait_for_timeout(200)
    check("legenda openen", pg.locator("#ra-legend").count() == 1 and pg.locator("[data-action=arch-legend][aria-pressed=true]").count() == 1)
    pg.click("[data-action=arch-legend]"); pg.wait_for_timeout(200)
    check("legenda inklappen", pg.locator("#ra-legend").count() == 0 and pg.locator("[data-action=arch-legend][aria-pressed=false]").count() == 1)
    pg.click("[data-action=arch-legend]"); pg.wait_for_timeout(200)
    check("legenda", pg.locator("#ra-legend").count() == 1)
    check("legenda toont lijnvoorbeeld per soort relatie", pg.locator("#ra-legend svg.lg-line[aria-hidden=true]").count() == E("Object.keys(CATALOG.arch.kinds).length") >= 3)
    pg.click("[data-action=arch-legend]")
    # relatielijnen
    E("Store.replace(buildPresetState('generic',{customer:'Test BV'}));UI.archSel='';UI.archPath='';UI.archLayer='';UI.archTier='all';App.go('architectuur')"); pg.wait_for_timeout(300)
    rel = E("""(() => { const svg = document.querySelector('.ra-grid > svg.ra-rel'), ps = [...document.querySelectorAll('svg.ra-rel path.ra-e')];
        const vis = (id) => { const el = document.querySelector(`.ra-grid .arch-block[data-id="${id}"]`); return !!el && el.getClientRects().length > 0; };
        return { svg: !!svg && svg.getAttribute('aria-hidden') === 'true' && getComputedStyle(svg).pointerEvents === 'none', n: ps.length, hiddenEnds: ps.filter(p => !vis(p.dataset.a) || !vis(p.dataset.b)).length }; })()""")
    check("relatielijnen als SVG-overlay (generiek)", rel["svg"] and rel["n"] > 0, rel)
    check("alles uitgeklapt: alle relaties getekend", rel["hiddenEnds"] == 0 and rel["n"] == E("CATALOG.arch.edges.length"), rel)
    # orthogonale routing: alleen M/H/V-stukken en korte hoekbogen (Q), geen diagonalen en niet door kaarten
    ortho = E("""(() => { const g = document.querySelector('.ra-grid'), box = g.getBoundingClientRect(), bad = [], cross = [];
        const cards = [...g.querySelectorAll('.arch-block, .ra-colhead, .ra-more, .ra-grp-h')].filter(x => x.getClientRects().length).map(x => { const r = x.getBoundingClientRect(); return [r.left - box.left, r.right - box.left, r.top - box.top, r.bottom - box.top]; });
        document.querySelectorAll('svg.ra-rel path.ra-e').forEach(p => {
          const id = p.dataset.a + '>' + p.dataset.b, d = p.getAttribute('d') || '', toks = d.match(/[A-Za-z][^A-Za-z]*/g) || [];
          let x = 0, y = 0;
          toks.forEach((t, i) => {
            const c = t[0], v = (t.slice(1).match(/-?[\\d.]+/g) || []).map(Number);
            if (c === 'M' && i === 0) { [x, y] = v; }
            else if (c === 'H') x = v[0];
            else if (c === 'V') y = v[0];
            else if (c === 'L') { if (Math.abs(v[0] - x) > 0.2 && Math.abs(v[1] - y) > 0.2) bad.push(id + ' ' + t); [x, y] = v; }
            else if (c === 'Q') { if (Math.max(Math.abs(v[2] - x), Math.abs(v[3] - y)) > 12) bad.push(id + ' lange boog ' + t); [x, y] = [v[2], v[3]]; }
            else bad.push(id + ' ' + t);
          });
          const L = p.getTotalLength();
          for (let s = 0; s <= L; s += 3) { const q = p.getPointAtLength(s); if (cards.some(c => q.x > c[0] + 1.5 && q.x < c[1] - 1.5 && q.y > c[2] + 1.5 && q.y < c[3] - 1.5)) { cross.push(id); break; } }
        });
        return { bad: bad.slice(0, 5), cross: cross.slice(0, 5) }; })()""")
    check("lijnen orthogonaal (H/V + korte hoekbogen)", not ortho["bad"], ortho["bad"])
    check("lijnen lopen niet door kaarten", not ortho["cross"], ortho["cross"])
    pg.set_viewport_size({"width": 1440, "height": 900}); pg.wait_for_timeout(300)
    check("na resize opnieuw gerouteerd", E("""(() => { const g = document.querySelector('.ra-grid').getBoundingClientRect(), p = document.querySelector('path.ra-e[data-a="src-mail"][data-b="cls-auto"]'), a = document.querySelector('.arch-block[data-id="src-mail"]').getBoundingClientRect();
        return !!p && Math.abs(p.getPointAtLength(0).x - (a.right - g.left)) < 1.5; })()"""))
    pg.set_viewport_size({"width": 1600, "height": 950}); pg.wait_for_timeout(300)
    pg.click("[data-action=arch-dense]"); pg.wait_for_timeout(300)
    rel = E("""(() => { const ps = [...document.querySelectorAll('svg.ra-rel path.ra-e')];
        const vis = (id) => { const el = document.querySelector(`.ra-grid .arch-block[data-id="${id}"]`); return !!el && el.getClientRects().length > 0; };
        return { n: ps.length, hiddenEnds: ps.filter(p => !vis(p.dataset.a) || !vis(p.dataset.b)).length }; })()""")
    check("met omschrijvingen: nog steeds alle relaties tussen zichtbare blokken", rel["hiddenEnds"] == 0 and rel["n"] == E("CATALOG.arch.edges.length"), rel)
    pg.click("[data-action=arch-dense]"); pg.wait_for_timeout(300)
    geo = E("""(() => { const g = document.querySelector('.ra-grid').getBoundingClientRect(), p = document.querySelector('path.ra-e[data-a="src-mail"][data-b="cls-auto"]');
        if (!p) return null; const a = document.querySelector('.arch-block[data-id="src-mail"]').getBoundingClientRect(), b = document.querySelector('.arch-block[data-id="cls-auto"]').getBoundingClientRect();
        const s = p.getPointAtLength(0), e = p.getPointAtLength(p.getTotalLength());
        return [Math.abs(s.x - (a.right - g.left)), Math.abs(e.x - (b.left - g.left)), s.y > a.top - g.top && s.y < a.bottom - g.top, e.y > b.top - g.top && e.y < b.bottom - g.top]; })()""")
    check("lijn sluit aan op de kaartranden", geo and geo[0] < 1.5 and geo[1] < 1.5 and geo[2] and geo[3], geo)
    pg.click(".arch-block[data-id='cls-sit']"); pg.wait_for_timeout(300)
    on = E("[...document.querySelectorAll('svg.ra-rel path.ra-e.on')].map(p => p.dataset.a + '>' + p.dataset.b)")
    check("selectie markeert alleen eigen lijnen", len(on) >= 2 and all("cls-sit" in x.split(">") for x in on) and pg.locator(".ra-grid.rel-sel").count() == 1, on)
    pg.hover(".arch-block[data-id='lab-service']"); pg.wait_for_timeout(150)
    hv = E("[...document.querySelectorAll('svg.ra-rel path.ra-e.hov')].map(p => p.dataset.a + '>' + p.dataset.b)")
    check("aanwijzen markeert lijnen van dat blok", len(hv) >= 1 and all("lab-service" in x.split(">") for x in hv) and pg.locator(".ra-grid.rel-hov").count() == 1, hv)
    pg.click("[data-action=arch-rel]"); pg.wait_for_timeout(200)
    check("knop Relaties verbergt lijnen", pg.locator("[data-action=arch-rel][aria-pressed=false]").count() == 1 and pg.locator("svg.ra-rel path.ra-e").count() == 0)
    pg.click("[data-action=arch-rel]"); pg.wait_for_timeout(300)
    check("knop Relaties toont lijnen weer", pg.locator("[data-action=arch-rel][aria-pressed=true]").count() == 1 and pg.locator("svg.ra-rel path.ra-e").count() > 0)
    pg.set_viewport_size({"width": 700, "height": 900}); pg.wait_for_timeout(300)
    check("gestapelde fasen: geen lijnen", E("(() => { const s = document.querySelector('svg.ra-rel'); return !s || getComputedStyle(s).display === 'none'; })()"))
    pg.set_viewport_size({"width": 1600, "height": 950}); E("UI.archSel='';App.render()"); pg.wait_for_timeout(200)
    # platen zijn verwijderd: oude state en deeplinks breken niets
    E("UI.archTab='plates';App.go('architectuur','platen')"); pg.wait_for_timeout(250)
    check("oude UI.archTab='plates' / deeplink 'platen' toont het model", pg.locator(".ra-grid .arch-block").count() == E("CATALOG.arch.blocks.length") and pg.locator(".ra-plate, .ra-tabs").count() == 0)
    E("UI.sub.architectuur='platen';App.render()"); pg.wait_for_timeout(150)
    check("UI.sub.architectuur='platen' breekt niets", pg.locator(".ra-grid .arch-block").count() > 20)
    E("UI.archSel='lab-service';App.render()"); pg.wait_for_timeout(150)
    check("detail zonder 'Bekijk plaat'", pg.locator(".arch-detail [data-action=arch-plate]").count() == 0 and "plaat" not in pg.locator(".arch-detail .ad-actions").inner_text().lower())
    E("UI.archSel='';UI.sub.architectuur='';App.render()")
    # technische details uit
    E("Prefs.set('showTech', false)"); E("UI.archSel='lab-service';App.go('architectuur')"); pg.wait_for_timeout(200)
    check("zonder tech: detail bruikbaar", pg.locator(".arch-detail .ad-actions a, .arch-detail .ad-actions button").count() >= 1 and len(pg.locator(".arch-detail").inner_text()) > 80)
    E("Prefs.set('showTech', true)")
    # overflow 390/900/1920: overzicht met startkaart en met rondleiding
    for w in (390, 900, 1920):
        pg.set_viewport_size({"width": w, "height": 900})
        for mode, js in (("overzicht", "UI.archPath=''"), ("rondleiding", "UI.archPath=CATALOG.arch.paths[0].id;UI.archStep=1")):
            E(f"{js};App.go('architectuur')"); pg.wait_for_timeout(200)
            check(f"geen overflow {w}px {mode}", not E("document.documentElement.scrollWidth > window.innerWidth + 1"))
    check("geen console/page errors", not errs, errs[:3])
    b.close()
print("FAILS", len(fails))
sys.exit(bool(fails))
