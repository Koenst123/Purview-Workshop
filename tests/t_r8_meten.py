import os as _os, pathlib as _pl, tempfile as _tf
_OUT = _os.environ.get("PYD_TEST_OUT") or _os.path.join(_tf.gettempdir(), "pyd-tests", _pl.Path(__file__).stem)
_os.makedirs(_OUT, exist_ok=True)
# Ronde 8b: Adoptie & impact - onderdeel Meten.
# Gebruik: python t_r8_meten.py <app.html>
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


BAD = r"""() => { const t = document.querySelector('#main').innerText; const m = t.match(/undefined|NaN|\[object Object\]|kon niet worden opgebouwd/); return m ? m[0] : ''; }"""
OVER = """() => { const vw = document.documentElement.clientWidth; const m = document.querySelector('#main');
  const els = [...m.querySelectorAll('.adp-pane *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > vw + 1 && !e.closest('.table-wrap') && getComputedStyle(e).position !== 'fixed'; });
  return { sw: m.scrollWidth - m.clientWidth, els: els.slice(0, 4).map(e => e.tagName + '.' + (e.className.baseVal !== undefined ? e.className.baseVal : e.className)) }; }"""


def kpi(pg, key):
    return pg.locator(f'#main .adp-kpi[data-kpi="{key}"]')


with sync_playwright() as p:
    b = p.chromium.launch()
    pg = page(b)
    E = pg.evaluate
    n = E("CATALOG.adoption.kpis.length")

    # Meetplan komt in het ontwerpdocument (alleen gekozen KPI's, tekst geëscaped).
    doc = E("""() => { const st = normalizeState(buildPresetState('generic', {customer:'T'}));
      st.adoption.kpi = { labeled: { on: true, base: 12, target: 80, now: 40, owner: '<img src=x onerror=alert(1)>', freq: 'month', note: 'Nul<b>' }, applied: { on: false } };
      const h = DocExport.html(normalizeState(st)); return { meet: h.includes('Meetplan'), lab: h.includes('Gelabelde documenten en e-mails'), off: h.includes('Verdeling per label</b>'), xss: /<img src=x/.test(h) }; }""")
    ok(doc["meet"] and doc["lab"] and not doc["off"] and not doc["xss"], f"ontwerpdocument bevat meetplan (alleen gekozen KPI's, geëscaped) {doc}")
    empty = E("() => DocExport.html(normalizeState(buildPresetState('generic', {customer:'T'}))).includes('Meetplan')")
    ok(not empty, "ontwerpdocument zonder meetplan toont geen lege meetplansectie")

    # ---------- Catalogus: elke KPI volledig ----------
    cat = E("""() => { const ph = ADOPT_PHASES.map(p => p.key), fr = CATALOG.adoption.kpiFreq.map(f => f[0]);
      return CATALOG.adoption.kpis.map(k => ({ key: k.key, miss: ['title','what','why','where','how','roles','target','icon'].filter(f => !String(k[f] || '').trim()),
        unit: ['pct','count'].includes(k.unit), dir: ['up','down'].includes(k.dir), freq: fr.includes(k.freq),
        ph: Array.isArray(k.phases) && k.phases.length > 0 && k.phases.every(x => ph.includes(x)),
        learn: (k.learn || []).every(x => !!CATALOG.learn[x]) })); }""")
    ok(n >= 10, f"minstens 10 KPI's ({n})")
    for k in cat:
        ok(not k["miss"] and k["unit"] and k["dir"] and k["freq"] and k["ph"] and k["learn"], f"KPI {k['key']} volledig {k}")
    ok(set(E("Object.keys(CATALOG.adoption.kpiGates)")) == set(E("ADOPT_PHASES.map(p => p.key)")), "go/no-go voor elke fase")
    ok(E("Object.values(CATALOG.adoption.kpiGates).every(g => g.go.length >= 2)"), "elke fase ≥ 2 go/no-go-criteria")
    srcs = " ".join(E("CATALOG.adoption.kpis.map(k => k.where)"))
    for portal in ["Data explorer", "Content explorer", "Activity explorer", "Data Loss Prevention › Alerts", "Auto-labeling policies", "DSPM for AI", "Endpoint DLP activities", "Audit"]:
        ok(portal in srcs, f"meetbron noemt '{portal}'")

    # ---------- Rendert met preset en leeg ontwerp ----------
    for preset in ["generic", "zorg", "overheid", "empty"]:
        E(f"() => Store.replace(buildPresetState('{preset}', {{customer:'T'}}))"); go(pg, "adoption", "kpi")
        bad = E(BAD)
        ok(pg.locator("#main .adp-pane.adp-p-kpi").count() == 1 and not bad, f"{preset}: Meten rendert {bad}")
        ok(pg.locator("#main .adp-kpi").count() == n, f"{preset}: alle {n} KPI-kaarten")
        miss = E("""() => [...document.querySelectorAll('#main .adp-kpi')].filter(li => { const w = li.querySelector('.adp-kpi-w'), t = li.querySelector('.adp-kpi-what'), d = li.querySelector('.adp-kpi-more');
          return !w || !/Meetbron/.test(w.textContent) || w.textContent.trim().length < 20 || !t || t.textContent.trim().length < 10 || !d || !/Waarom/.test(d.textContent) || !/Hoe meet je dit/.test(d.textContent) || !/Rol en licentie/.test(d.textContent); }).map(li => li.dataset.kpi)""")
        ok(not miss, f"{preset}: elke KPI heeft meetbron + uitleg {miss}")
    ok(pg.locator("#main .adp-mp").count() == 1, "meetplan-samenvatting zichtbaar")

    # ---------- Invullen en bewaren ----------
    E("() => Store.replace(buildPresetState('generic', {customer:'T'}))"); go(pg, "adoption", "kpi")
    ok(kpi(pg, "labeled").locator(".adp-target").count() == 1 and kpi(pg, "labeled").locator(".adp-kpi-f").count() == 0, "zonder meetplan: voorbeelddoel, geen velden")
    kpi(pg, "labeled").locator(".adp-kpi-on .switch").click(); pg.wait_for_timeout(250)
    ok(E("S().adoption.kpi.labeled.on === true"), "In meetplan aan → state")
    card = kpi(pg, "labeled")
    ok(card.locator(".adp-kpi-f input").count() >= 5, "velden verschijnen")
    for fld, val in [("base", "40"), ("target", "80"), ("now", "62.5")]:
        el = card.locator(f'input[data-bind="st:adoption.kpi.labeled.{fld}"]')
        el.fill(val); el.dispatch_event("change"); pg.wait_for_timeout(120)
        card = kpi(pg, "labeled")
    el = card.locator('input[data-bind="st:adoption.kpi.labeled.owner"]'); el.fill("Team Informatiebeveiliging"); el.dispatch_event("change"); pg.wait_for_timeout(120)
    kpi(pg, "labeled").locator('select[data-bind="st:adoption.kpi.labeled.freq"]').select_option("month"); pg.wait_for_timeout(250)
    v = E("S().adoption.kpi.labeled")
    ok(v.get("base") == 40 and v.get("target") == 80 and v.get("now") == 62.5 and v.get("owner") == "Team Informatiebeveiliging" and v.get("freq") == "month", f"waarden bewaard {v}")
    m = kpi(pg, "labeled").locator(".adp-meter")
    ok(m.count() == 1 and "Op weg" in (m.get_attribute("aria-label") or ""), f"meter met status Op weg [{m.get_attribute('aria-label') if m.count() else ''}]")
    ok(kpi(pg, "labeled").locator(".adp-kpi-st").inner_text().strip() == "Op weg", "statusbadge Op weg")
    w = E("parseFloat(document.querySelector('#main .adp-kpi[data-kpi=\"labeled\"] .adp-mf').style.width)")
    ok(abs(w - 62.5) < 0.2, f"balk = laatste meting ({w}%)")
    E("() => Store.update(s => { s.adoption.kpi.labeled.now = 85; })"); go(pg, "adoption", "kpi")
    ok(kpi(pg, "labeled").locator(".adp-kpi-st").inner_text().strip() == "Op doel", "status Op doel bij 85 ≥ 80")
    E("() => Store.update(s => { s.adoption.kpi.blocked = {on:true, base: 40, target: 5, now: 60}; })"); go(pg, "adoption", "kpi")
    ok(kpi(pg, "blocked").locator(".adp-kpi-st").inner_text().strip() == "Nog niet op doel", "lager-is-beter: 60 > doel 5 en boven nulmeting")
    ok(f"2/{n}" in pg.locator("#main .adp-mp-s").inner_text(), "samenvatting telt meetplan (2/n)")

    # ---------- JSON-round-trip ----------
    rt = E("() => { const j = JSON.parse(JSON.stringify(S())); const n = normalizeState(j); return n.adoption.kpi.labeled; }")
    ok(rt == {"on": True, "base": 40, "target": 80, "now": 85, "owner": "Team Informatiebeveiliging", "freq": "month", "note": ""}, f"round-trip {rt}")
    E("() => Store.replace(normalizeState(JSON.parse(JSON.stringify(S()))))"); go(pg, "adoption", "kpi")
    ok(kpi(pg, "labeled").locator('input[data-bind="st:adoption.kpi.labeled.base"]').input_value() == "40", "na import staat nulmeting in het veld")
    ok(E("customerState ? JSON.stringify(customerState(S())).includes('Team Informatiebeveiliging') : true"), "meetplan in klantuitvoer (JSON)")

    # ---------- Normalisatie: ongeldig, te groot, prototype pollution ----------
    RAW = '{"adoption":{"kpi":{"__proto__":{"on":true,"polluted":1},"constructor":{"on":true},"onbekend":{"on":true},"dlp":"kapot",' \
        '"labeled":{"on":"yes","base":"abc","target":1e9,"now":-5,"owner":"' + 'x' * 500 + '","freq":"daily","note":"' + 'y' * 2000 + '","extra":{"a":1}},' \
        '"blocked":{"on":true,"base":"12,5","target":1e12,"now":"  7 ","freq":"week"}}}}'
    bad = E("""(txt) => { const raw = JSON.parse(txt);
      const n = normalizeState(raw), k = n.adoption.kpi;
      return { keys: Object.keys(k).sort(), lab: k.labeled, blk: k.blocked, proto: Object.getPrototypeOf(k) === Object.prototype, polluted: ({}).polluted, on: ({}).on,
        str: normalizeState({ adoption: { kpi: 'x' } }).adoption.kpi, arr: normalizeState({ adoption: { kpi: [1, 2] } }).adoption.kpi, none: normalizeState({}).adoption.kpi }; }""", RAW)
    ok(bad["keys"] == ["blocked", "labeled"], f"alleen bekende KPI's {bad['keys']}")
    lab = bad["lab"]
    ok(lab["on"] is False and lab["base"] == "" and lab["target"] == 100 and lab["now"] == 0 and len(lab["owner"]) == 120 and lab["freq"] == "" and len(lab["note"]) == 500 and "extra" not in lab, f"labeled genormaliseerd {dict(lab, owner=len(lab['owner']), note=len(lab['note']))}")
    blk = bad["blk"]
    ok(blk["base"] == 12.5 and blk["target"] == 10000000 and blk["now"] == 7 and blk["freq"] == "week", f"aantal-KPI geclampt {blk}")
    ok(bad["proto"] and bad["polluted"] is None and bad["on"] is None, "geen prototype pollution")
    ok(bad["str"] == {} and bad["arr"] == {} and bad["none"] == {}, "kapotte kpi-waarde → leeg object")

    # Rare (niet-genormaliseerde) state in de view
    for js in ["s.adoption.kpi = 'x'", "s.adoption.kpi = {labeled: 5, dlp: null, autosim: {on: true, base: 'abc', target: {}, now: []}}", "s.adoption = 7"]:
        E(f"() => {{ Store.replace(buildPresetState('generic', {{customer:'T'}})); Store.update(s => {{ {js}; }}); }}"); go(pg, "adoption", "kpi")
        ok(pg.locator("#main .adp-kpi").count() == n and not E(BAD), f"rare state rendert: {js}")

    # ---------- Fasefilter en go/no-go ----------
    E("() => Store.replace(buildPresetState('generic', {customer:'T'}))"); go(pg, "adoption", "kpi")
    for ph in E("ADOPT_PHASES.map(p => p.key)"):
        pg.locator(f'#main .adp-kf-b[data-k="{ph}"]').click(); pg.wait_for_timeout(150)
        exp = E(f"CATALOG.adoption.kpis.filter(k => k.phases.includes('{ph}')).length")
        ok(pg.locator("#main .adp-kpi").count() == exp, f"filter {ph}: {exp} KPI's")
        ok(pg.locator(f'#main .adp-kf-b[data-k="{ph}"]').get_attribute("aria-pressed") == "true", f"filter {ph}: aria-pressed")
        g = pg.locator("#main .adp-gate")
        ok(g.count() == 1 and g.locator(".adp-go li").count() >= 2 and g.locator(".adp-gk").count() == exp, f"filter {ph}: go/no-go-paneel")
    pg.locator('#main .adp-kf-b[data-k="sim"]').click(); pg.wait_for_timeout(150)
    ok(E("[...document.querySelectorAll('#main .adp-kpi')].some(e => e.dataset.kpi === 'autosim') && ![...document.querySelectorAll('#main .adp-kpi')].some(e => e.dataset.kpi === 'blocked')"), "sim toont auto-labeling, niet geblokkeerd")
    pg.locator('#main .adp-kf-b[data-k="all"]').click(); pg.wait_for_timeout(150)
    ok(pg.locator("#main .adp-gate").count() == 0 and pg.locator("#main .adp-kpi").count() == n, "Alle fasen: geen paneel, alle KPI's")

    # Voorstel overnemen + alleen meetplan
    pg.locator('#main [data-action="adp-kpi-suggest"]').click(); pg.wait_for_timeout(200)
    on = E("Object.values(S().adoption.kpi).filter(v => v.on).length")
    ok(on >= 3, f"voorstel zet relevante KPI's aan ({on})")
    pg.locator("#main .adp-kf-only").click(); pg.wait_for_timeout(150)
    ok(pg.locator("#main .adp-kpi").count() == on and pg.locator("#main .adp-kf-only").get_attribute("aria-pressed") == "true", "Alleen meetplan filtert")
    E("() => Store.update(s => { s.adoption.kpi.labeled.now = 90; s.adoption.kpi.labeled.target = 80; })")
    pg.locator('#main .adp-kf-b[data-k="tips"]').click(); pg.wait_for_timeout(150)
    ok(pg.locator("#main .adp-gate .adp-gk.s-ok").count() >= 1, "go/no-go toont KPI op doel")
    pg.locator("#main .adp-kf-only").click(); pg.locator('#main .adp-kf-b[data-k="all"]').click(); pg.wait_for_timeout(150)

    # ---------- Toetsenbord ----------
    pg.locator('#main .adp-kf-b[data-k="enforce"]').focus(); pg.keyboard.press("Enter"); pg.wait_for_timeout(200)
    ok(E("UI.adpKpiPhase") == "enforce" and E("document.activeElement && document.activeElement.dataset.k") == "enforce", "Enter op fasefilter; focus blijft")
    pg.keyboard.press("Tab"); pg.wait_for_timeout(50)
    ok(E("document.activeElement && document.activeElement.dataset.k") == "eval", "Tab naar volgende filter")
    pg.locator('#main .adp-kf-b[data-k="all"]').focus(); pg.keyboard.press("Space"); pg.wait_for_timeout(200)
    ok(E("UI.adpKpiPhase") == "all", "Spatie op filter")
    tg = kpi(pg, "support").locator('.adp-kpi-on input[type="checkbox"]')
    before = E("!!(S().adoption.kpi.support||{}).on")
    tg.focus(); pg.keyboard.press("Space"); pg.wait_for_timeout(250)
    ok(E("!!(S().adoption.kpi.support||{}).on") != before, "Spatie op ‘In meetplan’")
    det = kpi(pg, "dlp").locator(".adp-kpi-more summary")
    det.focus(); pg.keyboard.press("Enter"); pg.wait_for_timeout(100)
    ok(kpi(pg, "dlp").locator(".adp-kpi-more").get_attribute("open") is not None, "Meer uitleg opent met Enter")
    ok(kpi(pg, "labeled").locator(".adp-meter[role='img'][aria-label]").count() == 1, "meter heeft role=img + aria-label")
    lbl = E("""() => [...document.querySelectorAll('#main .adp-kpi-f input, #main .adp-kpi-f select')].filter(e => !e.id || !document.querySelector('label[for="' + e.id + '"]')).length""")
    ok(lbl == 0, f"alle velden hebben een label ({lbl})")

    # ---------- XSS via eigenaar/notitie ----------
    X = '<img src=x onerror="window.__xss=1">"><svg onload=window.__xss=1>'
    E(f"() => Store.update(s => {{ s.adoption.kpi.labeled.owner = {json.dumps(X)}; s.adoption.kpi.labeled.note = {json.dumps(X)}; }})"); go(pg, "adoption", "kpi")
    ok(not E("window.__xss") and pg.locator("#main .adp-kpi img, #main .adp-kpi-f svg[onload]").count() == 0, "geen XSS via meetplanvelden")
    ok(len(E("DocExport.html(S())")) > 1000, "ontwerpdocument blijft werken")

    # ---------- Overloop 1440/900/375, licht/donker ----------
    E("() => { Store.update(s => { s.adoption.kpi.labeled = {on:true, base: 40, target: 80, now: 62, owner: 'Team IB', freq: 'month', note: 'Maandrapport'}; }); UI.adpKpiPhase = 'tips'; }")
    for theme in ["light", "dark"]:
        for wv in [1440, 900, 375]:
            pg.set_viewport_size({"width": wv, "height": 900}); E(f"() => {{ Prefs.set('theme', '{theme}'); App.render(); }}"); pg.wait_for_timeout(200)
            r = E(OVER)
            ok(r["sw"] <= 1 and not r["els"], f"{wv}/{theme}: geen overloop {r}")
    E("() => { Prefs.set('beamer', true); App.render(); }"); pg.set_viewport_size({"width": 1440, "height": 900}); pg.wait_for_timeout(200)
    r = E(OVER); ok(r["sw"] <= 1 and not r["els"], f"beamer 1440: geen overloop {r}")
    E("() => { Prefs.set('beamer', false); Prefs.set('theme', 'light'); UI.adpKpiPhase = 'all'; App.render(); }")

    pg.close()
    b.close()

ok(not ERRS, f"geen JS-fouten {ERRS[:5]}")
print(f"\n{len(FAILS)} fouten")
sys.exit(1 if FAILS else 0)
