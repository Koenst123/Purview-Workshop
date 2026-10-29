import os as _os, pathlib as _pl, tempfile as _tf
_TD = _pl.Path(__file__).resolve().parents[1]  # repo-root met src, Voorbeelden en de deliverable
_OUT = _os.environ.get("PYD_TEST_OUT") or _os.path.join(_tf.gettempdir(), "pyd-tests", _pl.Path(__file__).stem)
_os.makedirs(_OUT, exist_ok=True)
import sys, json, re, os, pathlib
from playwright.sync_api import sync_playwright
ROOT = str(_TD)
HTML = sys.argv[1]
OUT = os.path.join(_OUT, "xss-out"); os.makedirs(OUT, exist_ok=True)
url = pathlib.Path(HTML).as_uri()
MODE = sys.argv[2] if len(sys.argv) > 2 else "all"
PER = int(sys.argv[3]) if len(sys.argv) > 3 else 4
VIA = sys.argv[4] if len(sys.argv) > 4 else "direct"

INJECT_JS = r"""
([mode, via]) => {
  const put = (s) => { if (via === "import") { IO.loadText(JSON.stringify(s), "x.json"); if (Modal.cur) Modal._btn(1); } else Store.replace(s); };
  const st = buildPresetState('zorg', {customer:'X'});
  // extra entities so every collection is populated
  st.meta.facilitator = 'F'; st.meta.notes = 'N'; st.meta.prefix = 'P';
  st.meta.participants = [{name:'Jan', role:'CISO'}];
  st.decisions = [{id:'dec-1', kind:'decision', text:'D', route:'board', at:new Date().toISOString()},{id:'dec-2', kind:'park', text:'Pk', route:'dlp', at:new Date().toISOString()}];
  st.personas = st.personas && st.personas.length ? st.personas : [{id:'per-1', name:'Persona', desc:'d', comms:'c', touch:['encryption'], impact:{level:2}}];
  st.adoption = st.adoption || {notes:{}};
  if (typeof ADOPT_NOTES !== 'undefined') ADOPT_NOTES.forEach(([k]) => st.adoption.notes[k] = 'note');
  st.groups.push({id:'grp-x', name:'Groep', kind:'group', value:'g@x.nl'});
  st.sits.push({id:'sit-cx', kind:'custom', name:'CustomSit', desc:'desc', regex:'\\d{4}', keywords:['kw1','kw2'], confidence:'high', proximity:300});
  const ids = new Set();
  const collect = (o) => { if (Array.isArray(o)) o.forEach(collect); else if (o && typeof o === 'object') Object.entries(o).forEach(([k,v]) => { if (k === 'id' && typeof v === 'string') ids.add(v); collect(v); }); };
  collect(st);
  if (mode === 'ids') {
    const map = []; const ren = {};
    Array.from(ids).forEach((v) => { const i = map.length; map.push('id:' + v); ren[v] = v + `"'><img src=x onerror=__x(${i})>`; });
    const w = (o) => { if (Array.isArray(o)) { o.forEach((v, i) => { if (typeof v === 'string' && ren[v]) o[i] = ren[v]; else w(v); }); return; }
      if (!o || typeof o !== 'object') return;
      Object.keys(o).forEach((k) => { const v = o[k]; if (typeof v === 'string' && ren[v]) o[k] = ren[v]; else w(v);
        if (ren[k]) { o[ren[k]] = o[k]; delete o[k]; } }); };
    w(st); put(st); window.__map = map; return map.length;
  }
  const SKIP = /^(id|parentId|ref|color|groupId|labelId|route|at|created|updated|date|app|kind|level|schemaVersion|preset|sector|workshop)$/;
  const FREE = /^(name|displayName|tooltip|adminDesc|audience|text|tipText|message|customer|facilitator|notes|prefix|desc|description|value|keywords|note|title|comms|role|helpLink|info|tip|regex|evidenceStorage|authContext|justificationOptions|pathExclusionsWin|pathExclusionsMac|serviceDomains|unallowedBrowsers|restrictedApps|vpnAddresses|networkShareExclusions|unallowedBluetoothApps|participants|adminUnits)$/;
  const map = []; let n = 0;
  const pay = (i) => `<img src=x onerror=__x(${i})>"'><svg onload=__x(${i})>`;
  const walk = (o, path, key, inArr) => {
    if (Array.isArray(o)) { o.forEach((v, i) => { if (typeof v === 'string') { if (ids.has(v)) return; if (mode === 'free' && !FREE.test(key || '')) return; const id = n++; map.push(path + '[' + i + ']'); o[i] = v + pay(id); } else walk(v, path + '[' + i + ']', key, true); }); return; }
    if (!o || typeof o !== 'object') return;
    Object.keys(o).forEach((k) => {
      const v = o[k];
      if (typeof v === 'string') {
        if (SKIP.test(k) || ids.has(v)) return;
        if (mode === 'free' && !FREE.test(k)) return;
        const id = n++; map.push(path + '.' + k); o[k] = v + pay(id);
      } else walk(v, path + '.' + k, k, false);
    });
  };
  walk(st, 'st', '', false);
  put(st);
  window.__map = map;
  return map.length;
}
"""

hits = {}
CUR = [""]
errs = []
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1600, "height": 950}, accept_downloads=True)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errs.append("PAGEERROR " + str(e)[:300]))
    pg.on("console", lambda m: errs.append("CONSOLE " + m.type + ": " + re.sub(r"file:///\S+?\.html", "", m.text)[:500] + " @where=" + CUR[0] if m.type in ("error","warning") and "ERR_FILE_NOT_FOUND" not in m.text else "") )
    pg.on("dialog", lambda d: (errs.append("DIALOG " + d.message), d.dismiss()))
    pg.goto(url); pg.wait_for_timeout(400)
    pg.evaluate("window.__hits = []; window.__x = (i) => window.__hits.push([i, (window.__where||'')]); window.print = () => {};")
    nfields = pg.evaluate(INJECT_JS, [MODE, VIA])
    print("mode", MODE, "via", VIA, "labels", pg.evaluate("S().labels.length"), "injected fields", nfields)
    routes = pg.evaluate("typeof ALL_ROUTES !== 'undefined' ? ALL_ROUTES : NAV_ROUTES")
    def where(w): CUR[0] = w; pg.evaluate("w => window.__where = w", w)
    def domscan(ctxname):
        r = pg.evaluate("""() => { const bad = []; document.querySelectorAll('img[src="x"], svg[onload], [onerror], [onload]').forEach(e => bad.push(e.outerHTML.slice(0,120) + ' @' + (e.closest('[id]')||{}).id)); return bad; }""")
        for x in r: hits.setdefault("DOM " + ctxname, set()).add(x)
    SKIPACT = re.compile(r"del|remove|clear|reset|preset|new-design|open-json|save-json|exp-|print|copy|export-menu|app-menu|timer|toggle-|undo|redo|^go$|val-go|decision|modal-close|drawer-close")
    def restore(r, tab):
        if pg.evaluate("UI.route") != r: pg.evaluate(f"App.go('{r}')")
        if tab is not None:
            try: pg.locator("#main .tab").nth(tab).click(timeout=1500)
            except Exception: pass
    def monkey(r, tag, tab):
        acts = pg.evaluate("""() => Array.from(document.querySelectorAll('#main [data-action]')).map((e,i)=>({i, a:e.dataset.action}))""")
        cnt = {}
        for a in acts:
            if SKIPACT.search(a["a"]): continue
            cnt[a["a"]] = cnt.get(a["a"], 0) + 1
            if cnt[a["a"]] > PER: continue
            where(f"{tag}/{a['a']}#{cnt[a['a']]}")
            try:
                pg.evaluate(f"""() => {{ const e = document.querySelectorAll('#main [data-action]')[{a['i']}]; if (e && e.dataset.action === '{a['a']}') e.click(); }}""")
                pg.wait_for_timeout(50); domscan(f"{tag}/{a['a']}")
                # one level deeper inside drawer / modal
                inner = pg.evaluate("""() => Array.from(document.querySelectorAll('#drawer-root [data-action], #modal-root [data-action]')).map((e,i)=>({i, a:e.dataset.action}))""")
                seen = set()
                for b2 in inner:
                    if SKIPACT.search(b2["a"]) or b2["a"] in seen: continue
                    seen.add(b2["a"])
                    pg.evaluate(f"""() => {{ const e = document.querySelectorAll('#drawer-root [data-action], #modal-root [data-action]')[{b2['i']}]; if (e && e.dataset.action === '{b2['a']}') e.click(); }}""")
                    pg.wait_for_timeout(40); domscan(f"{tag}/{a['a']}/{b2['a']}")
                    pg.evaluate("Modal.close(); Menu.close();")
                pg.evaluate("Modal.close(); if (Drawer.isOpen()) Drawer.close(); Menu.close();")
                if pg.evaluate("UI.route") != r: restore(r, tab)
            except Exception as e:
                errs.append(f"CLICKFAIL {tag}/{a['a']}: {str(e)[:200]}")
    for r in routes:
        where(r); pg.evaluate(f"App.go('{r}')"); pg.wait_for_timeout(80); domscan(r)
        ntabs = pg.locator("#main .tab").count()
        for i in range(ntabs):
            t = pg.locator("#main .tab").nth(i)
            where(f"{r}/tab{i}")
            try: t.click(timeout=2000)
            except Exception as e: errs.append(f"tabclick {r}/{i} {e}"); continue
            pg.wait_for_timeout(60); domscan(f"{r}/tab{i}")
            monkey(r, f"{r}/tab{i}", i)
        if ntabs == 0:
            monkey(r, r, None)
    # label detail for each label
    where("labels-each")
    pg.evaluate("""() => { /* try opening each label in label detail */ }""")
    # print docs
    where("print-full"); pg.evaluate("document.getElementById('print-root').innerHTML = DocExport.html(S())"); pg.wait_for_timeout(150); domscan("print-full")
    where("print-keuzes"); pg.evaluate("document.getElementById('print-root').innerHTML = DocExport.html(S(), {only:'keuzes'})"); pg.wait_for_timeout(150); domscan("print-keuzes")
    pg.evaluate("document.getElementById('print-root').innerHTML = ''")
    # exports to files
    ps = pg.evaluate("PsExport.build(S())")
    open(os.path.join(OUT, f"xss-{MODE}-{VIA}.ps1"), "w", encoding="utf-8-sig").write(ps)
    xb = pg.evaluate("Array.from(XlsxExport.build(S()))")
    open(os.path.join(OUT, f"xss-{MODE}-{VIA}.xlsx"), "wb").write(bytes(xb))
    json.dump(pg.evaluate("S()"), open(os.path.join(OUT, f"xss-{MODE}-{VIA}.json"), "w", encoding="utf-8"))
    hl = pg.evaluate("window.__hits")
    fmap = pg.evaluate("window.__map")
    b.close()
by = {}
for i, w in hl:
    by.setdefault(fmap[i], set()).add(w)
print("EXECUTED payloads:", len(hl))
for k, v in sorted(by.items()): print("  FIELD", k, "->", sorted(v)[:6])
print("DOM leftovers:")
for k, v in hits.items():
    for x in list(v)[:3]: print("  ", k, x)
print("ERRORS:", len(errs))
errs = [e for e in errs if e]
for e in errs[:40]: print("  ", e)
sys.exit(bool(errs or hl or any(hits.values())))
