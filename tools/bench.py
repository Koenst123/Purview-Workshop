"""Comparable local synchronous-operation benchmarks; not a Web Vitals audit."""
import argparse
import json
from pathlib import Path
import statistics
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("apps", type=Path, nargs="+")
parser.add_argument("--out", type=Path, required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
if args.out.resolve() == root or root in args.out.resolve().parents:
    parser.error("Benchmark output must be outside the repository")

job = """(kind) => {
  const st=kind==='empty'?createEmptyState():buildPresetState('generic');
  if(kind==='large') {
    const sample=st.labels.find(l=>!l.parentId);
    st.labels=Array.from({length:200},(_,i)=>({...clone(sample),id:'lbl-bench-'+i,name:'Label '+i,displayName:'Label '+i,parentId:null,sits:[]}));
  }
  Store.replace(st,false);Store.saveLocal.cancel(); App.go('start');
  const timings={normalization:[],validation:[],snapshot:[],edit:[],navigation:[],xlsx:[],document:[]};
  const time=(name,fn)=>{const t=performance.now();fn();timings[name].push(performance.now()-t)};
  for(let i=0;i<6;i++) {
    time('normalization',()=>normalizeState(st));
    time('validation',()=>{Validation._memo={key:null,val:null};Validation.run(st)});
    time('snapshot',()=>JSON.stringify(S()));
    time('edit',()=>Store.update(s=>{s.meta.notes='Synthetic benchmark '+i},{silent:true}));
    time('navigation',()=>App.go(i%2?'start':'labels'));
    time('xlsx',()=>XlsxExport.build(S()));
    time('document',()=>DocExport.html(S()));
  }
  const historyStart=Store.past.length;
  for(let i=0;i<100;i++) Store.update(s=>{s.meta.notes='History '+i},{silent:true});
  Store.saveLocal.cancel();
  return {timings,historyStart,historyEnd:Store.past.length,stateBytes:new TextEncoder().encode(JSON.stringify(S())).length,
    heapBytes:performance.memory?.usedJSHeapSize??null};
}"""

results = []
with sync_playwright() as p:
    browser = p.chromium.launch()
    for app in args.apps:
        context = browser.new_context(viewport={"width": 1440, "height": 1000})
        page = context.new_page()
        page.goto(app.resolve().as_uri())
        page.wait_for_function("typeof App !== 'undefined' && !!Store.state")
        record = {"app": str(app), "bytes": app.stat().st_size, "browser": browser.version,
                  "domContentLoadedMs": page.evaluate("performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd"),
                  "datasets": {}}
        for dataset in ["empty", "preset", "large"]:
            data = page.evaluate(job, dataset)
            data["summaryMs"] = {key: {"first": values[0], "warmMedian": statistics.median(values[1:]),
                                      "warmMin": min(values[1:]), "warmMax": max(values[1:])}
                                 for key, values in data["timings"].items()}
            record["datasets"][dataset] = data
        results.append(record)
        context.close()
    browser.close()
args.out.parent.mkdir(parents=True, exist_ok=True)
args.out.write_text(json.dumps(results, indent=2), encoding="utf-8")
print(f"Benchmark written to {args.out}")
