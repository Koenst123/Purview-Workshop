import os as _os, pathlib as _pl, tempfile as _tf
_TD = _pl.Path(__file__).resolve().parents[1]  # repo-root met src, Voorbeelden en de deliverable
_OUT = _os.environ.get("PYD_TEST_OUT") or _os.path.join(_tf.gettempdir(), "pyd-tests", _pl.Path(__file__).stem)
_os.makedirs(_OUT, exist_ok=True)
"""Ronde 4 checks: previews (alle labels x apps x presets/voorbeelden), UI-paden, XSS en architectuur.
Gebruik: python t-r4.py app.html [screenshotmap]"""
import sys, pathlib
from playwright.sync_api import sync_playwright

HTML = sys.argv[1]
SHOTS = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else None
TD = _TD
fails = []
def check(name, ok, info=""):
    print(("PASS " if ok else "FAIL ") + name + (f"  [{info}]" if info else ""))
    if not ok: fails.append(name)

SWEEP = r"""() => {
  const st = S(), out = { n: 0, bad: [], apps: {} };
  const rx = /kon niet worden gemaakt|undefined|NaN|\[object Object\]/;
  for (const l of applicableLabels(st)) {
    if (hasChildren(l, st)) continue;
    const f = Previews.facts(l, st), rel = Previews.relevant(f);
    for (const a of rel) {
      out.n++; out.apps[a] = (out.apps[a] || 0) + 1;
      let h = '';
      try { h = Previews.panel(l, st, a); } catch (e) { out.bad.push(l.name + '/' + a + ': ' + e.message); continue; }
      const m = h.match(rx); if (m) out.bad.push(l.name + '/' + a + ': ' + m[0]);
    }
  }
  return out;
}"""

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.set_default_timeout(5000)
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(pathlib.Path(HTML).as_uri()); pg.wait_for_timeout(500)
    E = pg.evaluate

    sources = [("preset " + k, f"Store.replace(buildPresetState('{k}',{{customer:'Test BV'}}))") for k in ["generic", "zorg", "overheid", "empty"]]
    sources.append(("synthetisch oud schema", "Store.replace({app:'pyd-ipdlp-designer',schemaVersion:1,labels:[{id:'lbl-test',name:'Testlabel'}],meta:{customer:'Synthetische test'}})"))
    for name, js in sources:
        E(js); pg.wait_for_timeout(150)
        r = E(SWEEP)
        check(f"previews {name}", not r["bad"], f"{r['n']} combinaties {r['apps']} {r['bad'][:4]}")
        if E("typeof Views.architectuur") != "undefined":
            E("App.go('architectuur')"); pg.wait_for_timeout(150)
            check(f"architectuur {name}", pg.locator("#main .arch-block").count() > 10, str(pg.locator("#main .arch-block").count()))

    # ---------- UI-paden (voorbeeld met DLP indien aanwezig, anders zorg) ----------
    E("Store.replace(buildPresetState('zorg',{customer:'Test BV'}))"); pg.wait_for_timeout(150)
    lid = E("(()=>{const st=S(); const l=applicableLabels(st).filter(l=>!hasChildren(l,st)).sort((a,b)=>labelPriority(b,st)-labelPriority(a,st))[0]; return l.id})()")
    E(f"UI.labelTab='preview'; App.go('labels','{lid}')"); pg.wait_for_timeout(250)
    check("labeldetail-tab toont pv-wrap", pg.locator("#main .pv-wrap").count() == 1)
    nt = pg.locator("#main .pv-tabbtn").count()
    check("app-tabs aanwezig", nt >= 3, str(nt))
    seen = []
    for i in range(nt):
        pg.locator("#main .pv-tabbtn").nth(i).click(); pg.wait_for_timeout(120)
        seen.append(E("document.querySelector('#main .pv-wrap').dataset.app"))
        if SHOTS:
            SHOTS.mkdir(parents=True, exist_ok=True)
            pg.locator("#main .pv-wrap").screenshot(path=str(SHOTS / f"pv-{seen[-1]}.png"))
    check("tabklik wisselt app", len(set(seen)) == nt, ",".join(seen))
    check("focus blijft op tab", E("!!document.activeElement && document.activeElement.classList.contains('pv-tabbtn')"))

    E("App.go('board')"); pg.wait_for_timeout(250)
    eye = pg.locator('#main [data-action="pv-open"]').first
    check("oog-knop op Ontwerpbord", eye.count() == 1)
    if eye.count():
        eye.click(); pg.wait_for_timeout(250)
        check("modal met preview opent", pg.locator(".modal .pv-wrap.compact").count() == 1)
        pg.locator(".modal .pv-tabbtn").last.click(); pg.wait_for_timeout(150)
        check("tab in modal blijft compact", pg.locator(".modal .pv-wrap.compact").count() == 1)
        if SHOTS: pg.locator(".modal").screenshot(path=str(SHOTS / "pv-modal.png"))
        pg.keyboard.press("Escape"); pg.wait_for_timeout(150)

    E("UI.scnShowAll=true; UI.scnOpen={exchange:true}; App.go('scenarios')"); pg.wait_for_timeout(300)
    sb = pg.locator('#main .scenario-card [data-action="pv-open"]')
    check("scenario-knop 'Zo ziet de gebruiker het'", sb.count() > 0, str(sb.count()))
    if sb.count():
        want = sb.first.get_attribute("data-app")
        sb.first.click(); pg.wait_for_timeout(250)
        got = E("(document.querySelector('.modal .pv-wrap')||{dataset:{}}).dataset.app || null")
        check("scenario opent preview", got is not None, f"want={want} got={got}")
        pg.keyboard.press("Escape"); pg.wait_for_timeout(150)
    E("UI.scnShowAll=false")

    if SHOTS:
        E("Prefs.set('theme','dark')"); E(f"UI.labelTab='preview'; App.go('labels','{lid}')"); pg.wait_for_timeout(250)
        pg.locator("#main .pv-wrap").screenshot(path=str(SHOTS / "pv-dark.png"))
        if E("typeof Views.architectuur") != "undefined":
            E("App.go('architectuur')"); pg.wait_for_timeout(250); pg.screenshot(path=str(SHOTS / "arch-dark.png"), full_page=True)
        E("Prefs.set('theme','light')")
        if E("typeof Views.architectuur") != "undefined":
            E("App.go('architectuur')"); pg.wait_for_timeout(250); pg.screenshot(path=str(SHOTS / "arch-light.png"), full_page=True)

    # ---------- XSS op labelnaam/tooltip/tiptekst/klantnaam ----------
    E("""(()=>{window.__x=0; Store.update(st=>{const l=applicableLabels(st).find(l=>!hasChildren(l,st)); const p='<img src=x onerror="window.__x++">';
      l.displayName=p; l.name='X'+p; l.tooltip=p; l.cfg.autolabel.client={mode:'recommend',message:p}; l.cfg.notify=Object.assign(l.cfg.notify||{},{tip:true,tipText:p}); st.meta.customer=p;}); Store.replace(JSON.parse(JSON.stringify(Object.assign(S(),{labels:S().labels.map((l,i)=>i?l:Object.assign({},l,{color:'red;background:url(x)'}))})))); })()""")
    pg.wait_for_timeout(150)
    r = E(SWEEP)
    E("(()=>{const st=S(); const l=applicableLabels(st).find(l=>!hasChildren(l,st)); UI.labelTab='preview'; App.go('labels', l.id)})()"); pg.wait_for_timeout(200)
    for i in range(pg.locator("#main .pv-tabbtn").count()):
        pg.locator("#main .pv-tabbtn").nth(i).click(); pg.wait_for_timeout(100)
    E("Previews.open(applicableLabels().find(l=>!hasChildren(l)).id)"); pg.wait_for_timeout(200)
    pg.keyboard.press("Escape")
    if E("typeof Views.architectuur") != "undefined":
        E("App.go('architectuur')"); pg.wait_for_timeout(200)
        E("UI.archMode='design'; App.render()"); pg.wait_for_timeout(200)
    check("xss: geen uitvoering", E("window.__x") == 0, str(E("window.__x")))
    check("xss: sweep zonder fouten", not r["bad"], str(r["bad"][:3]))
    nt = E("""(()=>{ const bad=[]; let n=0; const pay='<img src=x onerror="window.__x=1">';
      for (const [k, apps] of Object.entries(Previews.noticeKinds)) for (const a of apps) {
        const h = Previews.notice(k, a, { tipText: pay, labelName: pay, ruleName: pay, file: pay, labelColor: 'red;x', justification: 'required', override: 'FalsePositive' });
        n++; if (!h.includes('pv-notice') || !h.includes('st-illustrative') || /<img src=x/.test(h) || h.includes('red;x')) bad.push(k + '/' + a); }
      return { n, bad, unknown: Previews.notice('__proto__', 'outlook') }; })()""")
    check("notice: alle kind/app-combinaties veilig met badge", nt["n"] >= 20 and not nt["bad"] and nt["unknown"] == "", str(nt))

    # ---------- Microsoft-productlogo's: juiste icoon per app + veilige SVG-assets ----------
    lg = E("""(()=>{ const A = BRAND_ASSETS, has = (h, k) => !!A[k] && h.includes(A[k]);
      const n = (k, a, c) => Previews.notice(k, a, c || {});
      return {
        keys: ['msWord','msExcel','msPowerPoint','msOutlook','msTeams','msSharePoint','msOneDrive','msEntra'].filter(k => !A[k]),
        spo: has(n('tip','spo'), 'msSharePoint') && !has(n('tip','spo'), 'msOneDrive'),
        od: has(n('tip','spo',{location:'onedrive'}), 'msOneDrive') && !has(n('tip','spo',{location:'onedrive'}), 'msSharePoint'),
        teams: ['tip','override','block'].every(k => has(n(k,'teams'), 'msTeams')),
        outlook: ['tip','override','block','encrypt'].every(k => has(n(k,'outlook'), 'msOutlook')),
        word: has(n('tip','office'), 'msWord'), excel: has(n('tip','office',{file:'Budget.xlsx'}), 'msExcel'), ppt: has(n('mandatory','office',{file:'Deck.pptx'}), 'msPowerPoint'),
        share: has(Previews.sceneShare({file:'a.docx'}), 'msSharePoint') && has(Previews.sceneShare({file:'a.docx', onedrive:true}), 'msOneDrive'),
        logo: ['sharepoint','onedrive','teams','outlook','word'].every(a => /<img[^>]+class="ms-logo/.test(msLogo(a)))
      }; })()""")
    check("logo's: officiële ms*-assets aanwezig", not lg["keys"], str(lg["keys"]))
    for k in ["spo", "od", "teams", "outlook", "word", "excel", "ppt", "share", "logo"]:
        check(f"logo's: policy tip/preview {k} toont het juiste Microsoft-icoon", lg[k])
    E(f"UI.labelTab='preview'; App.go('labels','{lid}')"); pg.wait_for_timeout(200)
    dom = E("""(()=>{ const imgs=[...document.querySelectorAll('#main .pv-tabbtn img.pv-tile')].map(i=>i.getAttribute('src'));
      const has=k=>imgs.includes(BRAND_ASSETS[k]); const tab=a=>!!document.querySelector('#main .pv-tabbtn[data-app="'+a+'"]');
      return { n: imgs.length, ok: imgs.length > 0 && (!tab('spo') || (has('msSharePoint') && has('msOneDrive'))) && (!tab('outlook') || has('msOutlook')) && (!tab('teams') || has('msTeams')) }; })()""")
    check("logo's: app-tabs in labeldetail tonen officiële logo's", dom["ok"], str(dom))
    sv = E("""(()=>{ const bad = [];
      for (const [k, v] of Object.entries(BRAND_ASSETS)) {
        if (!/^ms/.test(k) || !/^data:image\\/svg\\+xml;base64,/.test(v)) continue;
        const s = atob(v.split(',')[1]);
        if (/<script|<foreignObject|\\son[a-z]+\\s*=|href\\s*=|javascript:|<!ENTITY|<image|<use\\b|@import|url\\(\\s*['"]?(?!#)/i.test(s) || !/^<svg[\\s>]/.test(s.trim())) bad.push(k);
        if (s.length > 15000) bad.push(k + ' te groot');
      }
      return { n: Object.keys(BRAND_ASSETS).filter(k => /^ms/.test(k) && /svg/.test(BRAND_ASSETS[k])).length, bad }; })()""")
    check("logo's: ms*-SVG's zonder script/on*/externe refs", sv["n"] >= 7 and not sv["bad"], str(sv))

    check("geen console/page errors", not errs, " | ".join(errs[:5]))
    b.close()

print("FAILS", len(fails))
sys.exit(bool(fails))
