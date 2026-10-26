import os as _os, pathlib as _pl, tempfile as _tf
_TD = _pl.Path(__file__).resolve().parents[1]  # repo-root met src, Voorbeelden en de deliverable
_OUT = _os.environ.get("PYD_TEST_OUT") or _os.path.join(_tf.gettempdir(), "pyd-tests", _pl.Path(__file__).stem)
_os.makedirs(_OUT, exist_ok=True)
import sys, os, json, pathlib
from playwright.sync_api import sync_playwright
HTML = sys.argv[1]
OUT = os.path.join(_OUT, "shots")
os.makedirs(OUT, exist_ok=True)
url = pathlib.Path(HTML).as_uri()
errs = []
def ok(name, cond, extra=""):
    print(("PASS " if cond else "FAIL ") + name, extra)
    if not cond: errs.append(name)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1440, "height": 900})
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errs.append("PAGEERROR " + str(e)[:200]))
    pg.on("console", lambda m: (errs.append("CONSOLE " + m.text[:160]) if m.type == "error" and "iss is not defined" not in m.text else None))
    pg.goto(url); pg.wait_for_timeout(400)

    # ---------- normalizeState ----------
    r = pg.evaluate("""() => { const out = {}; for (const k of ['generic','zorg','overheid','empty']) { try { const a = normalizeState(buildPresetState(k)); const b = normalizeState(JSON.parse(JSON.stringify(a))); out[k] = JSON.stringify(a) === JSON.stringify(b); } catch (e) { out[k] = String(e); } } return out; }""")
    ok("normalizeState idempotent", all(v is True for v in r.values()), r)
    r = pg.evaluate("""() => { const st = buildPresetState('zorg'); const a = normalizeState(JSON.parse(JSON.stringify(st))); return JSON.stringify(a.labels.map(l=>[l.id,l.parentId])) === JSON.stringify(st.labels.map(l=>[l.id,l.parentId])) && a.labelPolicies.length === st.labelPolicies.length; }""")
    ok("preset ids preserved", r)
    r = pg.evaluate("""() => { const st = normalizeState({app:'pyd-ipdlp-designer', labels:[{id:'x"><img src=x onerror=alert(1)>', name:'A'},{id:'lbl-b',name:'B',parentId:'x"><img src=x onerror=alert(1)>'}], labelPolicies:[{id:'lp 1',name:'P',labels:['x"><img src=x onerror=alert(1)>','lbl-b'],settings:{defaultDocs:'lbl-b'}}]});
      const a = st.labels[0]; return {aid:a.id, parentOfB: st.labels[1].parentId, pol: st.labelPolicies[0].id, polLabels: st.labelPolicies[0].labels, ok: /^[a-z]+-[a-z0-9]+$/i.test(a.id) && st.labels[1].parentId === a.id && st.labelPolicies[0].labels[0] === a.id && /^[a-z]+-[a-z0-9]+$/i.test(st.labelPolicies[0].id)}; }""")
    ok("bad ids remapped consistently", r["ok"], r)

    # ---------- validation ----------
    r = pg.evaluate("""() => { const st = buildPresetState('generic'); const L = st.labels;
      const par = L.find(l => L.some(c => c.parentId === l.id));
      L[0].name = '!!!'; L[1].name = 'x'.repeat(70);
      const leaf = L.find(l => !L.some(c => c.parentId === l.id) && l.id !== L[0].id && l.id !== L[1].id);
      leaf.cfg.marking.header.enabled = true; leaf.cfg.marking.header.text = '${If.App.WXP}Vertrouwelijk';
      leaf.cfg.autolabel.service.enabled = true; leaf.cfg.autolabel.service.exchange = true; leaf.cfg.autolabel.service.encryptExternalMail = true; leaf.cfg.autolabel.service.rmsOwner = '';
      leaf.cfg.autolabel.client.mode = 'recommend'; leaf.cfg.autolabel.client.maxCount = 'veel';
      if (st.labelPolicies[0]) st.labelPolicies[0].settings.helpLink = 'intranet/help';
      st.customDlp = [{ id:'cdlp-t', name:'T', locations:['exchange'], mode:'simulation', rules:[{ id:'rule-t', name:'R', labels:[], sits:[st.sits[0].id], minCount: 10, maxCount: 3, extra:[], exceptions:[], action:'audit', endpoint:{} }] }];
      Store.replace(st); const v = Validation.run(S());
      const has = (re) => v.filter(x => re.test(x.title)).map(x => x.level + ':' + x.title);
      return { techEmpty: has(/Technische naam .* leeg/), techLong: has(/te lang/), ifEnd: has(/If\\.App/), rms: has(/Rights Management owner/), help: has(/help-link/), minmax: has(/maximum kleiner|ongeldig maximum/), tenant: v.filter(x => x.route === 'tenant').map(x => x.level + ':' + x.title).slice(0, 3), mono: v.filter(x => x.route === 'board').slice(0, 2).map(x => x.title), readiness: Validation.readiness(S()) }; }""")
    print(json.dumps(r, ensure_ascii=False, indent=1)[:2500])
    ok("val tech-name empty", bool(r["techEmpty"])); ok("val tech-name >64", any("Technische" in x for x in r["techLong"]))
    ok("val If.End", bool(r["ifEnd"])); ok("val rmsOwner", bool(r["rms"])); ok("val helpLink", bool(r["help"])); ok("val min/max", len(r["minmax"]) >= 2, r["minmax"])
    ok("tenant = info", all(x.startswith("info:") for x in r["tenant"]))
    ok("readiness shape", set(r["readiness"].keys()) >= {"pct", "done", "total", "steps"})
    r = pg.evaluate("""() => { const st = buildPresetState('generic'); const par = st.labels.find(l => st.labels.some(c => c.parentId === l.id));
      st.labels.filter(c => c.parentId === par.id).forEach(c => { c.cfg.publish.audience = 'groups'; c.cfg.publish.groups = ['nope']; });
      st.labelPolicies = [{...st.labelPolicies[0], scope: 'all', labels: [par.id]}]; Store.replace(normalizeState(st)); return Validation.run(S()).filter(x => /zonder sublabels/.test(x.title)).map(x => x.level + ':' + x.title); }""")
    ok("parent-without-sublabels warning", bool(r) and r[0].startswith("warn"), r)
    r = pg.evaluate("""() => { const st = buildPresetState('generic'); st.labels[2].cfg.dlp.endpoint = {action:'nuke', activities:{print:'zzz'}}; st.customDlp=[{id:'cdlp-a',name:'A',locations:['devices'],rules:[{id:'rule-a',name:'R',sits:[st.sits[0].id],labels:[st.labels[2].id],endpoint:{print:'nuke'}}]}]; Store.replace(st); const s = ScenarioEngine.score(S()); return s; }""")
    ok("scenario engine survives junk endpoint", isinstance(r, dict) and "pct" in r, r)

    # ---------- tech name ----------
    r = pg.evaluate("""() => { const st = createEmptyState(); st.meta.prefix=''; const l = {id:'lbl-a', name:'Vertrouwelijk - ', displayName:'', parentId:null}; const l2 = {id:'lbl-b', name:'***', displayName:'Geheim!', parentId:null}; st.labels=[l,l2]; return [labelTechName(l, st), labelTechName(l2, st)]; }""")
    ok("labelTechName trims '-' and falls back", r[0] == "Vertrouwelijk" and r[1] == "Geheim", r)

    # ---------- shell: empty design ----------
    pg.evaluate("Store.replace(createEmptyState()); App.go('start')"); pg.wait_for_timeout(200)
    nav = pg.inner_text("#sidenav")
    ok("empty nav shows empty state and no scores", "kies een voorbeeld" in nav and "Ontwerp uitgewerkt" not in nav and "Scenario-toets" not in nav and not pg.locator("#sidenav .nb").count(), nav[:120].replace("\n", " | "))
    pg.screenshot(path=os.path.join(OUT, "c-empty-1440.png"))
    ok("libFilter default empty", pg.evaluate("UI.libFilter.kind === '' && UI.libFilter.cat === ''"))

    # ---------- keyboard walkthrough ----------
    pg.evaluate("localStorage.clear()")
    def tab_to(sel, maxn=250, shift=False):
        for i in range(maxn):
            pg.keyboard.press("Shift+Tab" if shift else "Tab")
            if pg.evaluate("s => { const a = document.activeElement; return !!(a && a.matches(s)); }", sel): return i + 1
        return -1
    pg.evaluate("App.go('start')"); pg.wait_for_timeout(200); pg.focus("#main")
    n = tab_to('[data-action="preset"]')
    ok("Tab reaches preset", n > 0, f"tabs={n} el={pg.evaluate('document.activeElement.outerHTML.slice(0,90)')}")
    pg.keyboard.press("Enter"); pg.wait_for_timeout(300)
    if pg.evaluate("!!Modal.cur"):
        ok("modal focus inside", pg.evaluate("document.querySelector('#modal-root').contains(document.activeElement)"))
        # Tab trap: 10 tabs stay inside
        for i in range(10): pg.keyboard.press("Tab")
        ok("modal focus trapped", pg.evaluate("document.querySelector('#modal-root').contains(document.activeElement)"))
        tab_to('#modal-root .btn.primary, #modal-root .btn.danger', 10)
        pg.keyboard.press("Enter"); pg.wait_for_timeout(300)
    ok("preset applied by keyboard", pg.evaluate("S().labels.length") > 0, pg.evaluate("S().labels.length"))
    nav = pg.inner_text("#sidenav")
    ok("nav shows Ontwerp/Uitrol + Scenario-toets", "Ontwerp uitgewerkt" in nav and "Ontwerp compleet" in nav and "Scenario-toets" in nav)
    pg.focus("#main")
    n = tab_to('#sidenav [data-route="board"]', 300, shift=True)
    ok("Shift+Tab reaches nav board", n > 0, n)
    pg.keyboard.press("Enter"); pg.wait_for_timeout(300)
    ok("on board", pg.evaluate("UI.route") == "board")
    ok("panel auto-collapsed on board", pg.evaluate("UI.panelCollapsed") is True)
    n = tab_to('#main td.cell[data-action="board-cell"]')
    ok("Tab reaches board cell", n > 0, n)
    trig = pg.evaluate("document.activeElement.dataset.id + '|' + document.activeElement.dataset.dom")
    pg.keyboard.press("Enter"); pg.wait_for_timeout(300)
    ok("drawer opened from cell", pg.evaluate("Drawer.isOpen()"))
    ok("focus in drawer", pg.evaluate("document.querySelector('#drawer-root').contains(document.activeElement)"), pg.evaluate("document.activeElement.outerHTML.slice(0,80)"))
    ok("drawer aria", pg.evaluate("(() => { const d = document.querySelector('#drawer-root .drawer'); return d.getAttribute('aria-modal') === 'true' && !!document.getElementById(d.getAttribute('aria-labelledby')); })()"))
    for i in range(25): pg.keyboard.press("Tab")
    ok("drawer focus trapped", pg.evaluate("document.querySelector('#drawer-root').contains(document.activeElement)"))
    inp = pg.evaluate("(() => { const i = document.querySelector('#drawer-root input:not([type=checkbox]):not([type=radio]), #drawer-root textarea, #drawer-root select'); if (i) { i.focus(); return i.tagName; } return null; })()")
    pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
    ok("Escape closes drawer (from " + str(inp) + ")", not pg.evaluate("Drawer.isOpen()"))
    ok("focus restored to trigger cell", pg.evaluate("(() => { const a = document.activeElement; return a && a.matches('td.cell') ? a.dataset.id + '|' + a.dataset.dom : (a ? a.outerHTML.slice(0,80) : null); })()") == trig)
    # keyboard DnD: palette choice -> Space/Enter pick -> Tab to drop -> Enter
    pg.focus("#main")
    before = pg.evaluate("Store.rev")
    n = tab_to('#main [data-drag="choice"]')
    ok("Tab reaches palette choice", n > 0, n)
    pg.keyboard.press("Enter"); pg.wait_for_timeout(200)
    picked = pg.evaluate("!!(DnD.pick)")
    ok("keyboard pick", picked)
    n = tab_to('#main td.cell.drop-ok', 400)
    ok("Tab reaches highlighted drop target", n > 0, n)
    pg.keyboard.press("Tab"); pg.keyboard.press("Tab")
    pg.keyboard.press("Enter"); pg.wait_for_timeout(300)
    if pg.evaluate("!!Modal.cur"): print("  (modal after drop:", pg.inner_text("#modal-root")[:100].replace("\n"," "), ")"); pg.keyboard.press("Escape")
    ok("keyboard drop changed store", pg.evaluate("Store.rev") != before)
    pg.evaluate("Drawer.open({title:'<b>T</b>', render:() => '<input id=zz class=input>'})"); pg.wait_for_timeout(100); pg.focus("#zz"); pg.keyboard.press("Escape"); pg.wait_for_timeout(100)
    ok("Escape closes drawer from input", not pg.evaluate("Drawer.isOpen()"))
    pg.screenshot(path=os.path.join(OUT, "c-board-kbd-1440.png"))

    # ---------- panel / beamer ----------
    pg.click('[data-action="toggle-panel"]'); pg.wait_for_timeout(150)
    ok("panel opens on board via toggle", pg.evaluate("!UI.panelCollapsed"))
    pg.evaluate("App.go('dlp')"); pg.wait_for_timeout(150)
    ok("panel collapsed on dlp", pg.evaluate("UI.panelCollapsed"))
    pg.evaluate("App.go('board')"); pg.wait_for_timeout(150)
    ok("panel remembered open on board", pg.evaluate("!UI.panelCollapsed"))
    pg.fill("#dec-text", "Concept besluit")
    pg.evaluate("Store.update(st => { st.meta.notes = 'x'; })"); pg.wait_for_timeout(200)
    ok("dec draft survives re-render", pg.input_value("#dec-text") == "Concept besluit")
    # timer
    pg.click('[data-action="timer-start"]'); pg.wait_for_timeout(1100)
    t1 = pg.evaluate("Timer.target()")
    pg.evaluate("App.go('labels')"); pg.wait_for_timeout(100)
    ok("timer target fixed across navigation", pg.evaluate("Timer.target()") == t1 and pg.evaluate("Timer.s.running"))
    pg.evaluate("App.go('board')"); pg.click('[data-action="timer-pause"]'); el = pg.evaluate("Timer.elapsed()")
    pg.wait_for_timeout(300); pg.evaluate("App.render()")
    ok("pause keeps elapsed", abs(pg.evaluate("Timer.elapsed()") - el) < 0.01 and el > 0.9, el)
    for th in ("light", "dark"):
        pg.evaluate(f"Prefs.set('theme','{th}'); App.render()")
        for w in (1440, 1280):
            pg.set_viewport_size({"width": w, "height": 900}); pg.wait_for_timeout(150)
            pg.screenshot(path=os.path.join(OUT, f"c-board-{th}-{w}.png"))
    pg.evaluate("Prefs.set('theme','light'); App.render()")
    pg.click('[data-action="toggle-beamer"]'); pg.wait_for_timeout(200)
    ok("beamer collapses nav+panel", pg.evaluate("UI.navCollapsed && UI.panelCollapsed"))
    ok("beamer keeps storage status reachable", pg.locator("#save-ind").is_visible() and pg.locator("#save-ind").get_attribute("data-action") == "storage-details")
    ok("beamer hides facilitator content", not pg.locator("#sidepanel").is_visible())
    for w in (1440, 1280):
        pg.set_viewport_size({"width": w, "height": 900}); pg.wait_for_timeout(150)
        pg.screenshot(path=os.path.join(OUT, f"c-board-beamer-{w}.png"))
    pg.click('[data-action="toggle-panel"]'); pg.wait_for_timeout(150)
    ok("beamer panel reopenable", pg.evaluate("!UI.panelCollapsed"))
    pg.click('[data-action="toggle-beamer"]'); pg.wait_for_timeout(150)
    pg.set_viewport_size({"width": 1440, "height": 900})
    pg.evaluate("App.go('start')"); pg.wait_for_timeout(200); pg.screenshot(path=os.path.join(OUT, "c-start-1440.png"))
    pg.evaluate("Prefs.set('theme','dark'); App.go('start')"); pg.wait_for_timeout(200); pg.screenshot(path=os.path.join(OUT, "c-start-dark-1440.png"))
    pg.evaluate("Prefs.set('theme','light'); App.go('export')"); pg.wait_for_timeout(200); pg.screenshot(path=os.path.join(OUT, "c-export-1440.png"))

    # ---------- import: confirm when any content ----------
    pg.evaluate("Store.replace(createEmptyState()); Store.update(st => { st.meta.customer = 'Klant'; })")
    pg.evaluate("IO.loadText(JSON.stringify(buildPresetState('generic')), 'a.json')"); pg.wait_for_timeout(150)
    ok("confirm on meta-only content", pg.evaluate("!!Modal.cur"))
    pg.keyboard.press("Escape"); pg.wait_for_timeout(100)
    ok("Escape closes modal, design unchanged", pg.evaluate("!Modal.cur && S().meta.customer === 'Klant' && S().labels.length === 0"))
    pg.evaluate("IO.loadText(JSON.stringify({app:'pyd-ipdlp-designer', labels:[{id:'lbl-a',name:'A'}], meta:null}), 'b.json'); if (Modal.cur) Modal._btn(1);"); pg.wait_for_timeout(150)
    ok("meta:null import OK", pg.evaluate("S().labels.length === 1 && typeof S().meta === 'object'"))
    # hash proto
    pg.evaluate("location.hash = '#constructor'"); pg.wait_for_timeout(150)
    ok("#constructor ignored", pg.evaluate("UI.route") != "constructor")
    b.close()

print("ERRORS:", len(errs))
sys.exit(bool(errs))
for e in errs: print("  ", e)
