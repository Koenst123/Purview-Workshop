import os as _os, pathlib as _pl, tempfile as _tf
_TD = _pl.Path(__file__).resolve().parents[1]  # repo-root met src, Voorbeelden en de deliverable
_OUT = _os.environ.get("PYD_TEST_OUT") or _os.path.join(_tf.gettempdir(), "pyd-tests", _pl.Path(__file__).stem)
_os.makedirs(_OUT, exist_ok=True)
import sys, json, pathlib
from playwright.sync_api import sync_playwright
h, out = sys.argv[1], pathlib.Path(sys.argv[2])
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page()
    errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(pathlib.Path(h).as_uri()); pg.wait_for_timeout(800)
    for k in ["generic", "zorg"]:
        r = pg.evaluate("""k => { const st = normalizeState(buildPresetState(k,{customer:'T',date:'',facilitator:'',notes:''}));
          const v = Validation.run(st); return {ps: PsExport.build(st), errs: v.filter(x=>x.level==='err').map(x=>x.title)}; }""", k)
        (out / f"ps-{k}.ps1").write_text(r["ps"], encoding="utf-8-sig"); print(k, "val errs", r["errs"])
    r = pg.evaluate("""() => { const st = normalizeState(buildPresetState('generic',{customer:'T',date:'',facilitator:'',notes:''}));
      st.groups = st.groups || []; st.groups.push({id:'g1',name:'Finance',value:'finance@contoso.com'},{id:'g2',name:'Directie',value:''});
      const b = st.sits.find(s=>s.kind==='builtin' && !s.entity && !s.cred), cr = st.sits.find(s=>s.cred) || st.sits.find(s=>s.entity);
      const rule = (o) => Object.assign({id:'r'+Math.random(),name:'R',labels:[],sits:[],minCount:1,maxCount:'any',accessScope:'',extra:[],exceptions:[],action:'audit',endpoint:{}},o);
      st.customDlp = [
        {id:'c1',name:'Copilot web',mode:'simulation',locations:['copilot'],include:[],exclude:[],adminUnits:[],rules:[rule({name:'Web',sits:[b.id],copilotAction:'web'})]},
        {id:'c2',name:'Onprem',mode:'simulation',locations:['onprem'],include:[],exclude:[],adminUnits:[],rules:[rule({name:'OP',sits:[b.id],action:'block',tip:true})]},
        {id:'c3',name:'Scoped',mode:'simulation',locations:['exchange','onedrive','sharepoint','teams','devices'],include:['g1'],exclude:['g2'],adminUnits:[],rules:[rule({name:'Sc',sits:[b.id],exceptions:[{key:'notLabeled',value:''}]})]},
        {id:'c4',name:'Fabric bad',mode:'simulation',locations:['fabric','exchange'],include:[],exclude:[],adminUnits:[],rules:[rule({name:'Fb',sits:[cr ? cr.id : b.id]})]},
      ];
      const v = Validation.run(st); return {ps: PsExport.build(st), val: v.filter(x=>x.route==='dlp' && x.level==='err').map(x=>x.title), cr: cr && cr.name}; }""")
    (out / "ps-edge.ps1").write_text(r["ps"], encoding="utf-8-sig"); print("edge val", r["val"], "cred/entity sit:", r["cr"])
    print("pageerrors", errs); b.close()
sys.exit(bool(errs))
