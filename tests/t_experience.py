"""Synthetic end-to-end workshop, privacy, keyboard and reflow contracts."""
from pathlib import Path
import sys
from playwright.sync_api import sync_playwright

out = Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 1000})
    errors, network = [], []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("request", lambda r: network.append(r.url) if r.url.startswith(("http:", "https:")) else None)
    page.goto(Path(sys.argv[1]).resolve().as_uri())
    page.wait_for_function("typeof App !== 'undefined' && !!Store.state")
    E = page.evaluate
    E("""Store.replace(buildPresetState('generic'),false);
      Store.update(st=>{
        st.meta.goals='Synthetic objective';st.meta.internalNotes='INTERNAL-MARKER';
        st.meta.assumptions='Synthetic assumption';
        st.workshop={duration:90,agenda:[{id:'agenda-test',title:'Synthetic agenda',route:'schema',duration:17,goal:'Agree labels',facilitator:'Test role',notes:'Customer note'}]};
        st.decisions=[{id:'dec-test',status:'open',kind:'park',text:'Synthetic decision',owner:'Test role',due:'2026-12-01',route:'schema',rationale:'Synthetic rationale',resolution:'Synthetic acceptance',assumptions:'Check licenses',notes:'Customer-facing',ruleId:'PV-024',configId:st.labels[0].id}];
      }); Store.saveLocal.flush(); App.go('start');""")
    assert page.locator("#main h1").inner_text() == "Jouw informatiebescherming"
    assert page.locator(".start-grp h2").all_inner_texts() == ["Know your Data", "Maatregelen", "Beleid & DLP", "Adoptie"]
    page.locator('.start-grp .start-step[data-route="schema"]').focus()
    page.keyboard.press("Enter")
    assert E("UI.route") == "schema"
    E("App.go('start')")
    page.locator(".start-lbls .start-lbl").first.click()
    assert E("UI.route") == "labels" and E("UI.sub.labels") == E("orderedLabels(S())[0].id")
    E("App.go('start')")
    # Geen tijdregistratie meer: geen timer en geen 'Start dit agendapunt'.
    assert E("typeof Timer") == "undefined" and E("!('agenda-start' in Actions)")
    assert E("normalizeState({...S(),schemaVersion:1}).schemaVersion") == 2
    assert E("normalizeState(S()).decisions[0].rationale") == "Synthetic rationale"
    assert E("IO.hasContent({...createEmptyState(),meta:{...createEmptyState().meta,internalNotes:'Internal'}})")
    assert E("IO.hasContent({...createEmptyState(),workshop:{duration:0,agenda:[{title:'Meeting'}]}})")
    E("Store.replace({...S(),sits:[...S().sits,{id:'sit-privacy',kind:'custom',name:'Synthetic pattern',regex:'test'}]});UI.sitEdit='sit-privacy';App.go('sits','builder')")
    page.locator("#sit-testtext").fill("TRANSIENT-MARKER")
    page.locator('[data-bind="sit:sit-privacy:name"]').fill("Edited synthetic pattern")
    page.locator('[data-bind="sit:sit-privacy:name"]').press("Tab")
    E("Store.undo();Store.redo();Store.saveLocal.flush()")
    for expression in ["JSON.stringify(S())", "JSON.stringify(Store.past)", "localStorage.getItem(STORAGE_KEY)", "JSON.stringify(stripPrivate(S()))",
                       "DocExport.html(S())", "JSON.stringify(XlsxExport.sheets(S()))", "PsExport.build(S())"]:
        assert "TRANSIENT-MARKER" not in E(expression), expression
    assert "INTERNAL-MARKER" in E("JSON.stringify(stripPrivate(S()))")
    assert "INTERNAL-MARKER" in E("DocExport.html(S(),{includeInternal:true})")
    for expression in ["DocExport.html(S())", "JSON.stringify(XlsxExport.sheets(S()))", "PsExport.build(S())"]:
        result = E(expression)
        assert "INTERNAL-MARKER" not in result
        assert "CONCEPT" in result
    assert "Synthetic rationale" in E("DocExport.html(S())")
    assert "Synthetic agenda" in E("JSON.stringify(XlsxExport.sheets(S()))")
    assert E("Validation.run(S()).every(v=>/^PV-\\d{3}$/.test(v.ruleId)&&v.category&&v.verification&&typeof v.blocking==='boolean')")
    assert E("""(() => {
      const st=buildPresetState('generic'),l=applicableLabels(st)[0];
      l.cfg.encryption.mode='assignNow';l.cfg.encryption.permissions=[{type:'org',rights:'VIEW'}];
      l.cfg.dlp.exchange.action='encrypt';
      const v=Validation.run(st).find(v=>v.ruleId==='PV-058');
      return v?.level==='warn'&&v.verification==='geverifieerd'&&v.desc.includes('bijlagen behouden');
    })()""")
    E("window.visualDecisions=clone(S().decisions);applyPreset('zorg')")
    assert E("S().workshop.agenda[0].duration") == 17
    assert E("S().meta.internalNotes") == "INTERNAL-MARKER"
    E("""Store.update(st=>{
      st.decisions=window.visualDecisions;
      st.decisions[0].text='Synthetisch besluit met lange tekst: '+ 'Stem rechten, uitzonderingen en acceptatie af. '.repeat(12);
    });delete window.visualDecisions;
    UI.acc['besluiten|decision-dec-test']=true;UI.beamerPanel=false;""")
    E("App.go('besluiten')")
    summary = page.locator('[data-acc="decision-dec-test"] > summary')
    summary.focus()
    page.keyboard.press("Enter")
    assert not page.locator('[data-acc="decision-dec-test"]').evaluate("(e)=>e.open")
    page.keyboard.press("Enter")
    assert page.locator('[data-acc="decision-dec-test"]').evaluate("(e)=>e.open")
    page.keyboard.press("Tab")
    assert page.locator('[data-bind="dec:dec-test:rationale"]').evaluate("(e)=>e===document.activeElement")

    failures = []
    routes = E("Object.keys(Views)")
    for width in [320, 375, 768, 900, 1024, 1280, 1440, 1920]:
        page.set_viewport_size({"width": width, "height": 1000})
        for theme in ["light", "dark"]:
            E("(t)=>{Prefs.v.theme=t;Prefs.apply()}", theme)
            for route in routes:
                E("(r)=>App.go(r)", route)
                sizes = E("""(() => {
                  const m=document.getElementById('main');
                  return {main:m.scrollWidth-m.clientWidth,body:document.documentElement.scrollWidth-innerWidth,
                    nodes:[...m.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>m.getBoundingClientRect().right+1&&!e.closest('.table-wrap,.scroll-x,.board-wrap,.code'))
                      .slice(0,4).map(e=>e.className)};
                })()""")
                if sizes["main"] > 1 or sizes["body"] > 1:
                    failures.append((width, theme, route, sizes))
                if width in [320, 900, 1440] and route in ["start", "besluiten"]:
                    page.screenshot(path=str(out / f"{route}-{theme}-{width}.png"))
    page.set_viewport_size({"width": 320, "height": 900})
    E("Prefs.apply(); App.go('start')")
    page.locator('[data-action="toggle-nav"]').click()
    assert page.locator("#sidenav").is_visible()
    assert E("document.getElementById('main').inert")
    page.keyboard.press("Escape")
    assert not page.locator("#sidenav").is_visible()
    assert page.locator('[data-action="toggle-nav"]').evaluate("(e)=>e===document.activeElement")
    E("UI.beamerPanel=false;Prefs.v.beamer=true;Prefs.v.uiZoom=120;Prefs.v.calm=true;Prefs.apply();App.render()")
    assert E("document.getElementById('main').scrollWidth<=document.getElementById('main').clientWidth+1")
    assert not page.locator("#sidepanel").is_visible()
    page.screenshot(path=str(out / "start-beamer-320.png"))
    assert not errors, errors
    assert not network, network
    browser.close()
assert not failures, failures[:20]
print("Workshop/privacy contracts and 256 responsive route/theme cases OK")
