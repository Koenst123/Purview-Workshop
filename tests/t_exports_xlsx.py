import os as _os, pathlib as _pl, tempfile as _tf
_TD = _pl.Path(__file__).resolve().parents[1]  # repo-root met src, Voorbeelden en de deliverable
_OUT = _os.environ.get("PYD_TEST_OUT") or _os.path.join(_tf.gettempdir(), "pyd-tests", _pl.Path(__file__).stem)
_os.makedirs(_OUT, exist_ok=True)
"""Round-3 exports XLSX test: writes x-*.xlsx and checks sheets, formulas, quotePrefix."""
import sys, pathlib, base64, zipfile, re, openpyxl
from playwright.sync_api import sync_playwright
h, out = sys.argv[1], pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
JS = r"""([k, nasty]) => {
  const st = normalizeState(buildPresetState(k, {customer: nasty ? '=HYPERLINK("http://x","y")' : 'Gemeente Zuid', date: nasty ? '2026/01:05' : '2026-01-05', facilitator:'Jan', notes:''}));
  if (nasty) {
    st.labels[0].tooltip = '=1+1'; st.labels[0].owner = '@SUM(A1)'; st.meta.version = '1.0'; st.meta.status = 'review';
    st.decisions = [{id:'d1', kind:'decision', text:'+cmd|/c calc', route:'board', at:'2026-01-05T10:00', owner:'-CISO', due:'2026-02-01'}, {id:'d2', kind:'park', text:'Woo-afstemming', route:'start', at:'', owner:'', due:''}];
    st.personas = [{id:'p1', name:'=Baliemedewerker', desc:'Werkt met BSN', touch:['dlp_exchange'], impact:{level:2}, comms:'Mail + intranet'}];
    st.adoption = {notes:{general:'-let op'}, phases:{prep:{owner:'Projectleider', start:'2026-02-01', due:'2026-02-15'}, sim:{owner:'CISO', start:'2026-02-15', due:'2026-03-01'}}};
  }
  const bytes = XlsxExport.build(st); let s = ''; bytes.forEach(b => s += String.fromCharCode(b));
  return {b64: btoa(s), name: XlsxExport.fileName(st)};
}"""
cases = [("generic", "generic", False), ("zorg", "zorg", False), ("empty", "empty", False), ("overheid", "overheid", False), ("nasty", "zorg", True)]
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(pathlib.Path(h).as_uri()); pg.wait_for_timeout(800)
    for name, k, nasty in cases:
        r = pg.evaluate(JS, [k, nasty]); fn = out / f"x-{name}.xlsx"; fn.write_bytes(base64.b64decode(r["b64"]))
        z = zipfile.ZipFile(fn); assert z.testzip() is None
        formulas = sum(len(re.findall(r"<f[ >]", z.read(n).decode())) for n in z.namelist() if n.startswith("xl/worksheets/"))
        wb = openpyxl.load_workbook(fn)
        names = [ws.title for ws in wb.worksheets]
        bad, qp = [], 0
        for ws in wb.worksheets:
            for row in ws.iter_rows():
                for c in row:
                    if isinstance(c.value, str) and c.value[:1] in "=+-@":
                        if c.quotePrefix: qp += 1
                        else: bad.append((ws.title, c.coordinate, c.value[:30]))
                    if c.data_type == 'f': bad.append(("FORMULA", ws.title, c.coordinate))
        print(f"== {name}: file={r['name']!r} formulas={formulas} quotePrefix={qp} unprotected={bad[:5]}")
        print("   sheets:", names)
        for want in ["Stappenplan", "Besluiten", "Adoptie"]: assert want in names, want
        assert names[0] == "Stappenplan"
        if name == "nasty":
            for t in ["Overzicht", "Besluiten", "Adoptie", "Scenario's", "Stappenplan"]:
                ws = wb[t]; print("  ", t, [[str(c.value)[:50] for c in row if c.value is not None] for row in ws.iter_rows(max_row=14)])
            print("   Labels head:", [c.value for c in wb["Labels"][1]][:12])
            print("   Endpoint head:", [c.value for c in wb["Endpoint-matrix"][1]][:5])
    print("pageerrors", errs); b.close()
sys.exit(bool(errs))
