import os as _os, pathlib as _pl, tempfile as _tf
_TD = _pl.Path(__file__).resolve().parents[1]  # repo-root met src, Voorbeelden en de deliverable
_OUT = _os.environ.get("PYD_TEST_OUT") or _os.path.join(_tf.gettempdir(), "pyd-tests", _pl.Path(__file__).stem)
_os.makedirs(_OUT, exist_ok=True)
"""Round-3 exports doc test: print Ontwerpdocument to PDF for zorg/overheid/generic + render pages."""
import sys, pathlib, re, pymupdf
from playwright.sync_api import sync_playwright
h, out = sys.argv[1], pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
JS = r"""([k, rich]) => {
  const st = normalizeState(buildPresetState(k, {customer:'Gemeente Zuid <b>x</b>', date:'2026-01-05', facilitator: rich ? 'K. van der Kolk (Pink Elephant)' : 'Jan', notes: rich ? 'Retentie buiten scope.\nWoo apart traject.' : ''}));
  if (rich) {
    st.meta.version = '1.0'; st.meta.status = 'review';
    st.meta.versions = [{id:'v1', version:'0.1', date:'2026-01-05', change:'Uitkomst workshop 1', by:'Jan'}, {id:'v2', version:'1.0', date:'2026-01-20', change:'Verwerkt feedback CISO </td><script>alert(1)</script>', by:'K.'}];
    const al = applicableLabels(st); st.meta.docLabelId = (al[2] || al[0]).id; al.forEach((l, i) => l.owner = i % 2 ? 'CISO' : 'Teamleider HR');
    st.decisions = [{id:'d1', kind:'decision', text:'Standaardlabel Intern', route:'board', at:'2026-01-05T10:00', owner:'CIO', due:'2026-02-01'}, {id:'d2', kind:'park', text:'Woo-afstemming met informatiebeheer', route:'start', at:'', owner:'Informatiebeheer', due:'2026-03-01'}];
    st.adoption = {notes:{general:'Starten met HR'}, phases:{prep:{owner:'Projectleider', start:'2026-02-01', due:'2026-02-15'}, sim:{owner:'CISO', start:'2026-02-15', due:'2026-03-01'}, enforce:{owner:'CIO', start:'', due:'2026-04-01'}}};
    st.dlpSettings = st.dlpSettings || {}; st.dlpSettings.alertRecipients = 'soc@zuid.nl';
  }
  const html = DocExport.html(st);
  document.getElementById('print-root').innerHTML = html;
  const txt = document.getElementById('print-root').innerText;
  return {len: html.length, txt, scripts: document.querySelectorAll('#print-root script').length};
}"""
cases = [("zorg", "zorg", True), ("overheid", "overheid", True), ("generic", "generic", False)]
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(pathlib.Path(h).as_uri()); pg.wait_for_timeout(800)
    for name, k, rich in cases:
        r = pg.evaluate(JS, [k, rich])
        t = r["txt"]
        (out / f"doc-{name}.txt").write_text(t, encoding="utf-8")
        checks = {k2: (k2 in t) for k2 in ["Scope en afbakening", "Versiebeheer", "Wat merken medewerkers?", "Verantwoording", "Adoptie, impact & communicatie", "Woo-verzoeken", "Noodprocedure", "automatisch gekozen", "Ter besluitvorming v1.0", "Wabvpz", "Art. 9 AVG", "(Pink Elephant) (Pink Elephant)", "Concept v0.1", "5.12", "Ontwerp uitgewerkt"]}
        print(f"== {name}: html={r['len']} scripts={r['scripts']} {checks}")
        pg.emulate_media(media="print"); pdf = out / f"doc-{name}.pdf"
        pg.pdf(path=str(pdf), format="A4", print_background=True, display_header_footer=False, prefer_css_page_size=True)
        pg.emulate_media(media="screen")
        d = pymupdf.open(str(pdf)); print("   pages:", d.page_count)
        for i in range(d.page_count):
            pt = d[i].get_text()
            if any(s in pt for s in ["Scope en afbakening", "Versiebeheer", "Verantwoording", "Wat merken medewerkers", "Vervolgstappen"]) or i in (0, 1):
                d[i].get_pixmap(dpi=60).save(str(out / f"doc-{name}-p{i+1}.png"))
        # footer text on page 3
        print("   p3 text head/foot:", re.sub(r"\s+", " ", d[2].get_text())[:120], "...", re.sub(r"\s+", " ", d[2].get_text())[-90:])
    pg.evaluate("document.getElementById('print-root').innerHTML=''")
    r = pg.evaluate("""() => { const st = normalizeState(buildPresetState('zorg', {customer:'X', date:'2026-01-05'})); st.meta.status='final'; st.meta.version='2.0'; return DocExport.html(st, {only:'keuzes'}).slice(0, 2500); }""")
    print("keuzes has version:", "Vastgesteld v2.0" in r, "Vertrouwelijk" in r)
    print("pageerrors", errs); b.close()
sys.exit(bool(errs))
