import os as _os, pathlib as _pl, tempfile as _tf
_TD = _pl.Path(__file__).resolve().parents[1]  # repo-root met src, Voorbeelden en de deliverable
_OUT = _os.environ.get("PYD_TEST_OUT") or _os.path.join(_tf.gettempdir(), "pyd-tests", _pl.Path(__file__).stem)
_os.makedirs(_OUT, exist_ok=True)
import sys, json, os, pathlib
from playwright.sync_api import sync_playwright
ROOT = str(_TD)
HTML = sys.argv[1]
url = pathlib.Path(HTML).as_uri()
CUR = ["init"]
LOG = []

def fresh(p, pre=None):
    ctx = p.new_context(viewport={"width": 1400, "height": 900})
    if pre: ctx.add_init_script(pre)
    pg = ctx.new_page()
    pg.on("console", lambda m: LOG.append((CUR[0], m.type, m.text[:200])) if m.type in ("error", "warning") else None)
    pg.on("pageerror", lambda e: LOG.append((CUR[0], "pageerror", str(e)[:200])))
    pg.goto(url); pg.wait_for_timeout(300)
    return ctx, pg

ROUTES_JS = "() => Object.keys(Views)"

SWEEP = r"""
async (routes) => {
  const out = {};
  for (const r of routes) {
    const t0 = performance.now();
    let err = null;
    try { App.go(r); } catch (e) { err = String(e); }
    const t = performance.now() - t0;
    const main = document.querySelector('#main');
    out[r] = { ms: +t.toFixed(1), err, errorPage: !!(main && /kon niet worden weergegeven|went wrong/i.test(main.innerText.slice(0, 400))), len: main ? main.innerHTML.length : 0 };
  }
  return out;
}
"""

def sweep(pg, tag):
    routes = pg.evaluate(ROUTES_JS)
    CUR[0] = tag
    return pg.evaluate(SWEEP, routes)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx, pg = fresh(b)
    routes = pg.evaluate(ROUTES_JS)
    print("routes", routes)

    # ---------- 1. malicious imports ----------
    cases = {
        "proto": '{"app":"pyd-ipdlp-designer","meta":{"customer":"A"},"__proto__":{"polluted":1},"labels":[{"id":"l1","name":"L","__proto__":{"polluted2":1}}],"constructor":{"prototype":{"polluted3":1}}}',
        "labels-null": '{"app":"pyd-ipdlp-designer","labels":[null,1,"x",{"id":"l1","name":"ok"}]}',
        "labels-obj": '{"app":"pyd-ipdlp-designer","labels":{"a":1}}',
        "groups-str": '{"app":"pyd-ipdlp-designer","labels":[],"groups":"x","labelPolicies":5,"customDlp":{},"sits":[null],"meta":null,"decisions":"x","personas":7}',
        "name-types": '{"app":"pyd-ipdlp-designer","labels":[{"id":"l1","name":123,"displayName":{"a":1},"parentId":"nope","color":null}],"sits":[{"id":"s1","name":null,"kind":"zzz","keywords":"notarray"}]}',
        "cfg-wrong": '{"app":"pyd-ipdlp-designer","labels":[{"id":"l1","name":"L","cfg":{"encryption":"x","marking":5,"autolabel":[1,2],"scope":null}}]}',
        "parent-cycle": '{"app":"pyd-ipdlp-designer","labels":[{"id":"a","name":"A","parentId":"b"},{"id":"b","name":"B","parentId":"a"}]}',
        "dup-ids": '{"app":"pyd-ipdlp-designer","labels":[{"id":"a","name":"A"},{"id":"a","name":"A2"}]}',
        "empty-obj": '{}',
        "array": '[]',
        "null": 'null',
        "notjson": '{"app":',
        "cfg-null": '{"app":"pyd-ipdlp-designer","labels":[{"id":"l1","name":"L","cfg":null}],"endpoint":null,"copilot":null,"board":null,"adoption":null}',
        "sits-wrong": '{"app":"pyd-ipdlp-designer","labels":[{"id":"l1","name":"L"}],"sits":[{"id":"s1","name":"S","kind":"custom","keywords":"a,b","regex":5,"edm":"x"}],"labelPolicies":[{"id":"p","name":"P","labels":"l1","groups":null}],"customDlp":[{"id":"c","name":"C","rules":null}]}',
        "ep-junk": '{"app":"pyd-ipdlp-designer","meta":{"sector":5,"customer":["x"]},"labels":[{"id":"lbl-a","name":"A","cfg":{"dlp":{"endpoint":{"action":"nuke","activities":{"print":"zzz","usb":7}},"exchange":{"action":5}},"meetings":{"lobbyBypass":"zzz"},"container":{"sharing":9}}}],"customDlp":[{"id":"cdlp-1","name":"C","locations":["devices","bogus"],"rules":[{"id":"rule-1","sits":["sit-x"],"labels":["lbl-a"],"endpoint":{"print":"nuke","usb":null},"minCount":"abc","maxCount":-3,"severity":"Ultra","alert":5}]}],"scenarioResults":{"__proto__":{"x":1},"bogus":5},"endpoint":{"serviceDomains":"a.com","restrictedApps":[null,5]},"dlpSettings":{"mode":"zz","perLocation":7},"tenant":{"checks":[1,2]}}',
        "bad-ids": '{"app":"pyd-ipdlp-designer","labels":[{"id":"x\\"><img src=x onerror=alert(1)>","name":"A"},{"id":"lbl-b","name":"B","parentId":"x\\"><img src=x onerror=alert(1)>"}],"labelPolicies":[{"id":"lp 1","name":"P","labels":["x\\"><img src=x onerror=alert(1)>"],"settings":{"defaultDocs":"lbl-b"}}]}',
        "wrong-app": '{"app":"evil","labels":[]}',
        "board-junk": '{"app":"pyd-ipdlp-designer","labels":[{"id":"a","name":"A"}],"board":{"a":{"teams":"zz","exchange":[1]}, "ghost":{"x":1}},"customDlp":[{"id":"c1","name":"C","rules":[{"id":"r","sits":["ghost"],"labels":["ghost"]}]}]}',
    }
    base_routes = routes
    for name, txt in cases.items():
        CUR[0] = "import:" + name
        n0 = len(LOG)
        try:
            res = pg.evaluate("""(t)=>{ try { const r = IO.loadText(t,'x.json'); return {ok:true, r:String(r)} } catch(e){ return {ok:false, e:String(e)} } }""", txt)
        except Exception as e:
            res = {"evalfail": str(e)[:200]}
        pg.wait_for_timeout(150)
        # accept any confirm dialog
        try:
            pg.evaluate("()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Openen'); if(b) b.click();}"); pg.wait_for_timeout(150)
        except Exception: pass
        info = pg.evaluate("()=>({toast:(document.querySelector('#toast-root')||{}).innerText?.slice(-90), customer:S().meta&&S().meta.customer, labels:Array.isArray(S().labels)?S().labels.length:typeof S().labels, polluted:({}).polluted, polluted2:({}).polluted2, polluted3:({}).polluted3, groupsT:Array.isArray(S().groups), customDlpT:Array.isArray(S().customDlp)})")
        sw = sweep(pg, "import:" + name)
        bad = {k: v for k, v in sw.items() if v["err"] or v["errorPage"]}
        assert not bad, f"Onbruikbare routes na {name}: {bad}"
        assert not any(info.get(k) for k in ("polluted", "polluted2", "polluted3")), name
        assert info["groupsT"] and info["customDlpT"], name
        errs = [l for l in LOG[n0:] if "ERR_FILE" not in l[2]]
        print(f"IMPORT {name}: res={res} state={info} badRoutes={list(bad)} errors={len(errs)}")
        for l in errs[:4]: print("    ", l)
        # reset
        pg.evaluate("()=>Store.replace(buildPresetState('generic',{customer:'G'}))")

    # ---------- 2. huge import ----------
    CUR[0] = "huge"
    n0 = len(LOG)
    r = pg.evaluate("""()=>{ const st = buildPresetState('generic',{customer:'H'}); for(let i=0;i<5000;i++) st.labels.push({id:'h'+i,name:'H'+i}); const t=JSON.stringify(st); const t0=performance.now(); try{IO.loadText(t,'h.json')}catch(e){return String(e)} return {ms:performance.now()-t0, size:t.length} }""")
    pg.wait_for_timeout(300)
    pg.evaluate("()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Openen'); if(b) b.click();}"); pg.wait_for_timeout(300)
    print("HUGE import", r, "labels", pg.evaluate("()=>S().labels.length"), "errors", [l for l in LOG[n0:]][:3])
    pg.evaluate("()=>Store.replace(buildPresetState('generic',{customer:'G'}))")

    # ---------- 3. hash routing to prototype keys ----------
    for h in ("constructor", "toString", "__proto__", "hasOwnProperty"):
        CUR[0] = "hash:" + h; n0 = len(LOG)
        pg.evaluate(f"()=>{{location.hash='#{h}'}}"); pg.wait_for_timeout(200)
        txt = pg.evaluate("()=>document.querySelector('#main').innerText.slice(0,160)")
        print("HASH", h, "->", repr(txt[:120]), [l[2][:120] for l in LOG[n0:]][:2])
    pg.evaluate("()=>App.go('start')")
    ctx.close()

    # ---------- 4. corrupt localStorage ----------
    for label, pre in {
        "corrupt-json": "localStorage.setItem('pyd-ipdlp-designer-v1','{bad json');",
        "wrong-type": "localStorage.setItem('pyd-ipdlp-designer-v1','[1,2,3]');",
        "null-str": "localStorage.setItem('pyd-ipdlp-designer-v1','null');",
        "prefs-corrupt": "Object.keys(localStorage).forEach(k=>0); for (const k of ['pyd-ipdlp-designer-v1-ui']) localStorage.setItem(k,'{bad');",
    }.items():
        LOG.clear(); CUR[0] = "ls:" + label
        c2, p2 = fresh(b, pre)
        ok = p2.evaluate("()=>({hasS: typeof S==='function' && !!S(), main: (document.querySelector('#main')||{}).innerText?.slice(0,80)})")
        print("LOCALSTORAGE", label, ok, [l[2][:120] for l in LOG][:3])
        c2.close()

    # quota
    LOG.clear(); CUR[0] = "quota"
    c2, p2 = fresh(b)
    keys = p2.evaluate("()=>Object.keys(localStorage)")
    print("LS keys", keys)
    p2.evaluate("()=>{ Storage.prototype._si = Storage.prototype.setItem; Storage.prototype.setItem = function(){ throw new DOMException('QuotaExceededError','QuotaExceededError') }; }")
    p2.evaluate("()=>Store.update(st=>{st.meta.customer='Q'})"); p2.wait_for_timeout(1200)
    toast = p2.evaluate("()=>document.querySelector('#toast-root, .toasts') ? document.querySelector('#toast-root, .toasts').innerText : ''")
    print("QUOTA: toast=", repr(toast[:150]), "log=", [l[2][:120] for l in LOG][:3])
    c2.close()

    # ---------- 5. undo/redo + uid + dangling refs ----------
    LOG.clear(); CUR[0] = "undo"
    c2, p2 = fresh(b)
    r = p2.evaluate("""()=>{
      Store.replace(buildPresetState('generic',{customer:'U'}));
      const s0 = JSON.stringify(S());
      for (let i=0;i<120;i++) Store.update(st=>{st.meta.customer='U'+i});
      let u=0; while (Store.past && Store.past.length && u<500) { Store.undo(); u++; }
      const afterUndo = S().meta.customer;
      let rd=0; while (Store.future && Store.future.length && rd<500) { Store.redo(); rd++; }
      const ids = new Set(); let dup=0; for (let i=0;i<200000;i++){ const x=uid('t'); if (ids.has(x)) dup++; ids.add(x); }
      // replace stack growth
      for (let i=0;i<200;i++) Store.replace(buildPresetState('empty',{customer:'R'+i}));
      return {undos:u, afterUndo, redos:rd, final:S().meta.customer, uidDup:dup, pastAfterReplace: Store.past.length, pastBytes: Store.past.reduce((a,x)=>a+(typeof x==='string'?x.length:JSON.stringify(x).length),0)};
    }""")
    print("UNDO/UID", r)
    assert r["uidDup"] == 0 and r["pastAfterReplace"] <= 80, r
    c2.close()

    LOG.clear(); CUR[0] = "dangling"
    c2, p2 = fresh(b)
    r = p2.evaluate("""()=>{
      Store.replace(buildPresetState('zorg',{customer:'D'}));
      const st = S();
      const used = JSON.stringify(st);
      // delete every label, sit and group directly, mimicking hard deletes, then check references
      const lab = st.labels.map(l=>l.id), sit = st.sits.map(s=>s.id), grp = st.groups.map(g=>g.id);
      return {labels: lab.length, sits: sit.length, groups: grp.length};
    }""")
    print("DANGLING base", r)
    # use the UI delete actions: find actions containing 'del'
    acts = p2.evaluate("()=>Object.keys(Actions).filter(k=>/del|remove/.test(k))")
    print("delete actions", acts)
    c2.close()
    b.close()
