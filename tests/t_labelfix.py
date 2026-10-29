import os as _os, pathlib as _pl, tempfile as _tf
_OUT = _os.environ.get("PYD_TEST_OUT") or _os.path.join(_tf.gettempdir(), "pyd-tests", _pl.Path(__file__).stem)
_os.makedirs(_OUT, exist_ok=True)
# Regressie: informatietypen op een hoofdlabel met sublabels (niet toepasbaar in Purview), PV-111,
# consistente bord-/scenarioteksten, neutraal PV-028-voorbeeld, één opbouw voor exportnamen en kleurnamen.
# Gebruik: python t_labelfix.py <app.html>
import sys, json, pathlib
from playwright.sync_api import sync_playwright

APP = sys.argv[1]
FAILS, ERRS = [], []


def ok(cond, msg):
    print(("PASS " if cond else "FAIL ") + msg)
    if not cond:
        FAILS.append(msg)


def go(pg, route, sub=None):
    pg.evaluate(f"() => App.go({json.dumps(route)}{', ' + json.dumps(sub) if sub else ''})")
    pg.wait_for_timeout(250)


with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.on("pageerror", lambda e: ERRS.append(str(e)))
    pg.on("console", lambda m: ERRS.append(m.text) if m.type == "error" else None)
    pg.goto(pathlib.Path(APP).as_uri())
    pg.wait_for_function("typeof App !== 'undefined' && !!Store.state")
    pg.evaluate("() => { Store.replace(buildPresetState('zorg', {customer:'T', date:'2026-01-02'})); }")
    pg.wait_for_timeout(150)

    info = pg.evaluate("""() => { const st = S(); const par = st.labels.find(l => hasChildren(l, st));
      const leaf = st.labels.find(l => l.parentId === par.id);
      const sit = st.sits.find(s => !st.labels.some(l => (l.sits || []).includes(s.id)));
      return { par: par.id, parName: labelShortName(par), leaf: leaf.id, sit: sit.id, sitName: sit.name,
        stranded: st.labels.filter(l => strandedSits(l, st).length).length }; }""")
    ok(info["stranded"] == 0, "preset Zorg: geen informatietypen op hoofdlabels met sublabels")

    # (a) koppelmenu en drop-targets: alleen toepasbare labels
    r = pg.evaluate(f"""() => {{ const pay = {{ sitId: {json.dumps(info['sit'])} }};
      const can = sitCanLink({json.dumps(info['par'])}, pay), canLeaf = sitCanLink({json.dumps(info['leaf'])}, pay);
      const before = JSON.stringify(S().labels.map(l => l.sits));
      linkSit({json.dumps(info['par'])}, pay);
      const same = before === JSON.stringify(S().labels.map(l => l.sits));
      return {{ can, canLeaf, same }}; }}""")
    ok(r["can"] is False and r["canLeaf"] is True, "sitCanLink: hoofdlabel met sublabels nee, sublabel ja")
    ok(r["same"], "linkSit naar hoofdlabel wijzigt niets")

    go(pg, "sits", "map")
    menu = pg.evaluate("""() => { const el = document.querySelector('#main [data-action="sit-add"]'); if (!el) return null;
      el.click(); const items = [...document.querySelectorAll('.menu .menu-item')].map(x => x.textContent.trim());
      Menu.close(); return { items, full: S().labels.filter(l => hasChildren(l, S())).map(l => labelFullName(l)) }; }""")
    ok(menu is not None and len(menu["items"]) > 1, "koppelmenu (+) opent")
    if menu:
        ok(not any(i in menu["full"] for i in menu["items"]), "koppelmenu biedt geen hoofdlabels met sublabels aan")
        ok(any("Hoofdlabels met sublabels" in i for i in menu["items"]), "koppelmenu legt uit waarom hoofdlabels ontbreken")
    drops = pg.evaluate("""() => { const parRows = [...document.querySelectorAll('#main .sit-row.st-parent')];
      return { parents: parRows.length, parDrop: parRows.filter(r => r.matches('[data-drop]') || r.querySelector('[data-drop]')).length,
        anyDrop: document.querySelectorAll('#main .sit-row[data-drop], #main .sit-row [data-drop]').length }; }""")
    ok(drops["parents"] > 0 and drops["parDrop"] == 0, f"hoofdlabelrijen zijn geen drop-target ({drops})")
    ok(drops["anyDrop"] > 0, "sublabelrijen blijven drop-target")

    # (b) geïmporteerde/oude koppeling op hoofdlabel → PV-111 en geen overerving
    pg.evaluate(f"() => Store.update(st => {{ labelById({json.dumps(info['par'])}, st).sits.push({json.dumps(info['sit'])}); }})")
    v = pg.evaluate(f"""() => {{ const iss = Validation.run(S()).filter(i => i.ruleId === 'PV-111');
      const leaf = labelById({json.dumps(info['leaf'])});
      return {{ iss: iss.map(i => ({{ sev: i.sev || i.level || i.kind, labelId: (i.fix || i.target || i).labelId || i.labelId, text: (i.msg || i.title || '') + ' ' + (i.desc || i.fix_text || '') }})),
        inherit: labelSits(leaf).some(s => s.id === {json.dumps(info['sit'])}) }}; }}""")
    ok(len(v["iss"]) == 1, f"PV-111 gemeld voor hoofdlabel met informatietype ({v['iss']})")
    ok(not v["inherit"], "sublabel erft informatietypen van hoofdlabel niet (labelSits)")
    raw = pg.evaluate("() => JSON.stringify(Validation.run(S()).filter(i => i.ruleId === 'PV-111'))")
    ok(info["parName"] in raw and "sublabel" in raw.lower(), "PV-111 noemt het hoofdlabel en de oplossing (sublabel)")

    go(pg, "board")
    flag = pg.evaluate("() => [...document.querySelectorAll('#main .cell-flag.err')].map(x => x.textContent)")
    ok(any("hoofdlabel" in f for f in flag), f"ontwerpbord toont waarschuwing op sublabel ({flag[:2]})")
    chips = pg.evaluate(f"""() => {{ App.go('sits', 'map'); const leafRow = [...document.querySelectorAll('#main .sit-row')].find(r => r.id && r.id.includes({json.dumps(info['leaf'])}));
      return leafRow ? leafRow.innerText : null; }}""")
    ok(chips is None or info["sitName"] not in chips, "informatietypen: sublabelrij toont geen geërfde chip")
    parrow = pg.evaluate("() => { const r = document.querySelector('#main .sit-row.st-parent'); return r ? r.innerText : ''; }")
    ok("Werkt niet" in pg.evaluate("() => [...document.querySelectorAll('#main .sit-row.st-parent')].map(r => r.innerText).join(' ')"), "hoofdlabelrij waarschuwt dat de koppeling niet werkt")

    # (c) scenario: geen tegenstrijdigheid (geen auto-labeling via hoofdlabel, wel uitleg)
    sc = pg.evaluate("""() => { const st = clone(S());
      const sc = ScenarioEngine.list(st).find(s => s.content.unlabeled && ScenarioEngine.matchedSits(st.sits, s).length);
      if (!sc) return null;
      const m = ScenarioEngine.matchedSits(st.sits, sc).map(s => s.id);
      const res = ScenarioEngine.evaluate(sc, st);
      const top = res.label ? ScenarioEngine._top(labelById(res.label.id || res.label, st) || res.label, st) : null;
      const par = top && hasChildren(top, st) ? top : st.labels.find(l => hasChildren(l, st));
      st.labels.forEach(l => { l.sits = (l.sits || []).filter(id => !m.includes(id)); });
      par.sits = m.slice();
      ScenarioEngine._memo = {};
      const r2 = ScenarioEngine.evaluate(sc, st);
      return { id: sc.id, applied: r2.labelApplied, steps: r2.steps.map(x => x.kind + ':' + x.text),
        auto: r2.steps.some(x => x.kind === 'ok' && /automatisch toe|auto-labeling past/i.test(x.text)) }; }""")
    ok(sc is not None, "scenario met ongelabelde inhoud en informatietypen gevonden")
    if sc:
        ok(not sc["applied"] and not sc["auto"], f"scenario {sc['id']}: geen automatische labeling via hoofdlabel")
        ok(any("hoofdlabel" in s and s.startswith("warn:") for s in sc["steps"]), f"scenario {sc['id']}: legt uit dat koppeling op hoofdlabel niets doet")

    # sublabel later toegevoegd: informatietypen verhuizen mee, geen PV-111
    r = pg.evaluate("""() => { Store.replace(buildPresetState('zorg', {customer:'T'}));
      const sits = S().sits.slice(0, 2).map(s => s.id); const nl = newLabel('Testhoofd', { color: '#13A10E', parentId: null });
      Store.update(st => { nl.sits = sits.slice(); st.labels.push(nl); });
      const leaf = labelById(nl.id);
      if (!leaf || !sits.length) return null;
      _schemaAddSub(leaf.id, 'Testsub', '', '');
      const s2 = S(); const sub = s2.labels.find(l => l.parentId === leaf.id && l.name.includes('Testsub'));
      return { moved: !!sub && sits.every(id => sub.sits.includes(id)), parentEmpty: !(labelById(leaf.id).sits || []).length,
        pv: Validation.run(S()).filter(i => i.ruleId === 'PV-111').length }; }""")
    ok(r is not None, "testlabel met informatietypen aangemaakt")
    if r:
        ok(r["moved"] and r["parentEmpty"], "eerste sublabel neemt informatietypen van het hoofdlabel over")
        ok(r["pv"] == 0, "na sublabel toevoegen geen PV-111")
    # nesten onder label met informatietypen → PV-111 (validatie vangt het)
    r = pg.evaluate("""() => { const a = newLabel('Nesthoofd', { color: '#0F6CBD', parentId: null }), bb = newLabel('Nestsub', { color: '#0F6CBD', parentId: null });
      Store.update(st => { a.sits = [st.sits[0].id]; st.labels.push(a, bb); });
      let err = null; Store.update(s => { err = moveLabel(s, bb.id, a.id, null); });
      return { err, pv: Validation.run(S()).filter(i => i.ruleId === 'PV-111').length }; }""")
    ok(not r["err"], f"label nesten gelukt ({r['err']})")
    ok(r["pv"] >= 1, "label nesten onder label met informatietypen geeft PV-111")

    # 2. PV-028 voorbeeld neutraal
    pv = pg.evaluate("""() => { Store.replace(buildPresetState('zorg', {customer:'T'}));
      const nl = newLabel('Ëxtra Team', { color: '#13A10E', parentId: null });
      Store.update(st => { st.labels.push(nl); st.groups = (st.groups || []).filter(g => g.id !== 'grp-x'); st.groups.push({ id: 'grp-x', name: 'Testgroep', kind: 'group', value: '' });
        const l = labelById(nl.id, st); l.cfg.publish.groups = [...(l.cfg.publish.groups || []), 'grp-x']; });
      return JSON.stringify(Validation.run(S()).filter(i => i.ruleId === 'PV-028')); }""")
    ok("bedrijf.nl" not in pv, "PV-028 bevat geen hardcoded sg-hr@bedrijf.nl meer")
    src = pathlib.Path(APP).read_text(encoding="utf-8")
    ok("sg-hr@bedrijf.nl" not in src, "build bevat geen sg-hr@bedrijf.nl")
    ok("PV-028" in pv, "PV-028 gemeld voor lege groep")
    ok("sg-extra-team@" in pv, f"PV-028 geeft voorbeeld afgeleid van het label ({pv[:300]})")

    # 3. één opbouw voor exportnamen
    names = pg.evaluate("""() => ({ xlsx: XlsxExport.fileName(S()), ps: PsExport.fileName(S()), json: exportFileName(S(), 'json'),
      doc: exportFileName(S(), ''), esc: exportFileName({ meta: { customer: 'A/B:<x>', date: '2026-01-02' } }, 'json') })""")
    pre = "Purview IP-DLP ontwerp - T - "
    ok(all(names[k].startswith(pre) for k in ("xlsx", "ps", "json", "doc")), f"exportnamen gelijke opbouw ({names})")
    ok(names["xlsx"].endswith(".xlsx") and names["ps"].endswith(".ps1") and names["json"].endswith(".json") and "." not in names["doc"][len(pre):].replace("-", ""), "juiste extensies")
    ok(not any(c in names["esc"] for c in '/:<>'), f"onveilige tekens uit bestandsnaam ({names['esc']})")

    # 4. kleurnamen op swatches
    leaf = pg.evaluate("() => { const st = S(); return st.labels.find(l => !hasChildren(l, st)).id; }")
    go(pg, "schema", leaf)
    sw = pg.evaluate("() => [...document.querySelectorAll('#main .swatch')].map(x => [x.getAttribute('aria-label'), x.title])")
    ok(len(sw) > 0 and all(a and a.startswith("Kleur: ") and a == t for a, t in sw), f"schema-swatches met 'Kleur: …' ({sw[:3]})")
    ok(any(a == "Kleur: Groen" for a, _ in sw), "schema: #13A10E heet ‘Groen’")
    ok(not any("#" in a for a, _ in sw), "schema: geen hexcodes in aria-label voor paletkleuren")
    go(pg, "labels", leaf)
    sw2 = pg.evaluate("() => [...document.querySelectorAll('#main .swatch')].map(x => x.getAttribute('aria-label') || '')")
    ok(len(sw2) == 0 or all(a.startswith("Kleur: ") for a in sw2), f"labeldetail-swatches met 'Kleur: …' ({sw2[:3]})")
    pg.screenshot(path=_os.path.join(_OUT, "labelfix-detail.png"))

    ok(not ERRS, f"geen JS-fouten ({ERRS[:3]})")
    b.close()

print(f"\n{len(FAILS)} fout(en)")
sys.exit(1 if FAILS else 0)
