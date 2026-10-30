"""Learning storage boundaries, errors, versions, deep links, history and reset semantics."""
from pathlib import Path
import json
import sys
from playwright.sync_api import sync_playwright

app = Path(sys.argv[1]).resolve().as_uri()
with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context()
    page = context.new_page()
    page.goto(app)
    page.wait_for_function("typeof App !== 'undefined' && !!Store.state")
    E = page.evaluate
    key = E("LEARNING_KEY")
    E("sessionStorage.setItem(ACK_KEY,'1')")
    E("""() => {
      Store.replace(buildPresetState('zorg'), false);
      Store.update(s=>s.meta.customer='SYNTHETIC-UNDO-BOUNDARY');
      Store.saveLocal.flush();
      Site.go('academy','home');
    }""")
    snapshot = E("({state:JSON.stringify(S()),past:Store.past.length,future:Store.future.length})")
    for shortcut in ["Control+z", "Control+y", "Control+Shift+z"]:
        page.keyboard.press(shortcut)
        assert E("(b)=>JSON.stringify(S())===b.state && Store.past.length===b.past && Store.future.length===b.future", snapshot)
    E("Site.go('start')")
    page.keyboard.press("Control+z")
    assert E("S().meta.customer") != "SYNTHETIC-UNDO-BOUNDARY"
    page.keyboard.press("Control+y")
    assert E("S().meta.customer") == "SYNTHETIC-UNDO-BOUNDARY"
    E("Site.go('academy','lesson/data/practice')")
    page.locator("#a-sit-text").fill("PRIVATE-EXERCISE-DO-NOT-SAVE BSN 111222333")
    E("Site.go('experience','day/hr/hr-sollicitatie')")
    page.locator('.x-choice[data-key="A"]').click()
    assert "PRIVATE-EXERCISE" not in E("localStorage.getItem(LEARNING_KEY)")
    E("Site.go('academy','lesson/labels/quiz/veilig-werken')")
    page.locator('.a-q-opt[data-i="0"][data-value="1"]').click()
    saved = E("localStorage.getItem(LEARNING_KEY)")
    page.reload()
    page.wait_for_function("typeof App !== 'undefined' && !!Store.state")
    assert E("UI.sub.academy") == "lesson/labels/quiz/veilig-werken"
    assert E("AC.quiz.labels[0]") == 1
    assert E("AC.w.sit === null")
    assert E("HubRouter.parse('#academy/path/begrijpen//junk')===null")
    assert E("HubRouter.parse('#experience/role/hr/').page") == "experience/role/hr"
    E("Site.go('academy','home')")
    page.go_back()
    page.wait_for_function("UI.sub.academy==='lesson/labels/quiz/veilig-werken'")
    page.go_forward()
    page.wait_for_function("UI.sub.academy==='home'")
    E("Site.go('academy','lesson/labels/c2/veilig-werken')")
    E("Site.go('labels')")
    assert page.locator('#topbar-actions .tb-learn[data-route="academy"]').count() == 1
    page.locator('#topbar-actions .tb-learn[data-route="academy"]').click()
    assert E("UI.sub.academy") == "lesson/labels/c2/veilig-werken"
    page.locator('[data-action="ac-lesson-reset"]').click()
    page.get_by_role("button", name="Ja", exact=True).click()
    assert E("!AC.quiz.labels && XP.picks['hr-sollicitatie']==='A'")

    # A shared practical card has independent answers and reset semantics in each lesson.
    for mid in ["labels", "dlp"]:
        E("(id)=>Site.go('academy','lesson/'+id+'/practice')", mid)
        page.locator('[data-action="ac-reflect"][data-id="label-access"][data-value="1"]').click()
    E("Site.go('academy','lesson/labels/practice')")
    page.locator('[data-action="ac-lesson-reset"]').click()
    page.get_by_role("button", name="Ja", exact=True).click()
    assert E("!Object.hasOwn(AC.practical,'labels:label-access') && AC.practical['dlp:label-access']===1")
    page.reload()
    page.wait_for_function("typeof AC !== 'undefined' && !!Store.state")
    assert E("!Object.hasOwn(AC.practical,'labels:label-access') && AC.practical['dlp:label-access']===1")

    # Reset every widget, including the roadmap's phase; leave other widgets untouched.
    E("""() => {
      AC.w.map='dlp'; AC.w.sit='PRIVATE-WIDGET-RESET'; AC.w.label.id='strikt';
      AC.w.autolabel.where='rest'; AC.w.dlp.loc='devices'; AC.w.endpoint.action='block';
      AC.w.copilot.dlp=false; AC.w.triage[CATALOG.academy.widgets.triage[0].id]=0; AC.w.phase=3;
    }""")
    widgets = E("CATALOG.academy.modules.map(m=>[m.id,m.widget==='roadmap'?'phase':m.widget])")
    for mid, widget in widgets:
        expected = E("AC.w")
        expected[widget] = E("(key)=>AC_DEFAULT_W[key]", widget)
        E("(id)=>Site.go('academy','lesson/'+id+'/c1')", mid)
        page.locator('[data-action="ac-lesson-reset"]').click()
        page.get_by_role("button", name="Ja", exact=True).click()
        assert E("AC.w") == expected, (mid, widget)
        assert "PRIVATE-WIDGET-RESET" not in E("localStorage.getItem(LEARNING_KEY)")
    assert E("XP.picks['hr-sollicitatie']") == "A"
    E("IO.newDesign()")
    page.get_by_role("button", name="Nieuw ontwerp", exact=True).click()
    assert E("XP.picks['hr-sollicitatie']") == "A"
    E("Site.go('hub')")
    page.locator('[data-action="learning-clear"]').first.click()
    page.get_by_role("button", name="Voortgang wissen", exact=True).click()
    assert E("localStorage.getItem(LEARNING_KEY) === null")
    assert E("Object.keys(XP.picks).length===0 && Object.keys(AC.quiz).length===0")

    # New browser context with the same storage, without depending on live in-memory state.
    second = browser.new_context()
    second.add_init_script("localStorage.setItem(" + json.dumps(key) + "," + json.dumps(saved) + ");")
    q = second.new_page()
    q.goto(app + "#experience/day/hr/hr-sollicitatie")
    q.wait_for_function("typeof App !== 'undefined' && !!Store.state")
    assert q.evaluate("XP.picks['hr-sollicitatie']==='A' && AC.quiz.labels[0]===1")
    second.close()

    # Malformed roots remain untouched until the learner explicitly clears them.
    for raw in ["{bad json", json.dumps({"version": 999, "entries": {}}),
                json.dumps({"version": 1, "entries": {"academy": {"version": 999, "data": {}}}}),
                "x" * (128 * 1024 + 1)]:
        E("([k,v])=>localStorage.setItem(k,v)", [key, raw])
        page.goto(app + "#academy/home")
        page.reload()
        page.wait_for_function("typeof App !== 'undefined' && !!Store.state")
        assert E("Learning.blocked && !!Learning.error")
        assert page.locator(".learning-notice").count() == 1
        assert not E("xpSave()")
        assert E("localStorage.getItem(LEARNING_KEY)") == raw
        assert E("Learning.clearAll()")

    # Unknown IDs, unsafe keys, invalid types and changed role revisions never become live choices.
    bad = json.loads(saved)
    bad["entries"]["academy"]["data"]["quiz"]["__proto__"] = {"polluted": True}
    bad["entries"]["academy"]["data"]["quiz"]["labels"]["0"] = 999
    bad["entries"]["academy"]["data"]["w"]["sit"] = "PRIVATE-FROM-IMPORT"
    bad["entries"]["experience"]["data"]["versions"]["hr"] = 999
    bad["entries"]["experience"]["data"]["picks"]["unknown"] = "A"
    E("([k,v])=>localStorage.setItem(k,v)", [key, json.dumps(bad)])
    page.reload()
    page.wait_for_function("typeof App !== 'undefined' && !!Store.state")
    assert E("!!Learning.error && !({}).polluted && !AC.quiz.labels[0] && AC.w.sit===null")
    assert E("Object.keys(XP.picks).length") == 0
    assert E("acSave()")
    assert "PRIVATE-FROM-IMPORT" not in E("localStorage.getItem(LEARNING_KEY)")

    # Quota failures: no success fallback, retry preserves current choices, no free text leaks.
    E("""() => {
      window.originalSetItem=Storage.prototype.setItem;
      Storage.prototype.setItem=function(k,v) { if(k===LEARNING_KEY) throw new DOMException('Full','QuotaExceededError'); return originalSetItem.call(this,k,v); };
      Site.go('experience','day/finance/finance-usb');
    }""")
    page.locator('.x-choice[data-key="B"]').click()
    assert E("!!Learning.error && XP.picks['finance-usb']==='B'")
    assert page.locator(".learning-notice").count() == 1
    E("() => {Storage.prototype.setItem=window.originalSetItem;}")
    page.locator('[data-action="learning-retry"]').click()
    assert E("Learning.error === ''")
    assert json.loads(E("localStorage.getItem(LEARNING_KEY)"))["entries"]["experience"]["data"]["picks"]["finance-usb"] == "B"
    E("""() => {
      window.originalRemoveItem=Storage.prototype.removeItem;
      Storage.prototype.removeItem=function(k) { if(k===LEARNING_KEY) throw new DOMException('Denied','SecurityError'); return originalRemoveItem.call(this,k); };
    }""")
    assert not E("Learning.clearAll()")
    assert E("!!Learning.error && XP.picks['finance-usb']==='B'")
    E("() => {Storage.prototype.removeItem=window.originalRemoveItem;}")
    E("App.wipeNow()")
    page.wait_for_load_state()
    page.wait_for_function("typeof App !== 'undefined' && !!Store.state")
    assert E("localStorage.getItem(LEARNING_KEY)===null && Object.keys(XP.picks).length===0")

    denied = browser.new_context()
    denied.add_init_script("""(() => {
      const read=Storage.prototype.getItem;
      Storage.prototype.getItem=function(k){if(k.endsWith('-learning')) throw new DOMException('Denied','SecurityError'); return read.call(this,k);};
    })()""")
    q = denied.new_page()
    q.goto(app)
    q.wait_for_function("typeof App !== 'undefined' && !!Store.state")
    assert q.evaluate("!!Learning.error")
    assert q.locator(".learning-notice").count() == 1
    denied.close()
    page.goto(app + "#academy/lesson/endpoint/c2")
    page.wait_for_function("UI.sub.academy==='lesson/endpoint/c2'")
    page.goto(app)
    page.wait_for_function("UI.sub.academy==='lesson/endpoint/c2'")
    for invalid in ["#academy/lesson/missing/c1", "#experience/day/hr/missing", "#academy/%E0%A4%A", "#academy/constructor", "#hub/oops"]:
        page.goto(app + invalid)
        page.wait_for_function("UI.route==='hub'")
        assert page.locator(".h-entry").count() == 3
    browser.close()
print("Learning: persistence, no free text, history, deep links, versioning, failure recovery and all reset levels OK")
