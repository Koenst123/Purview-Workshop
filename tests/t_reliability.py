"""State, persistence and import contracts; only synthetic data."""
from pathlib import Path
import sys
from playwright.sync_api import sync_playwright


with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto(Path(sys.argv[1]).resolve().as_uri())
    page.wait_for_function("typeof App !== 'undefined' && !!Store.state")
    page.evaluate("App.go('start')")
    E = page.evaluate

    assert E("!IO.hasContent(createEmptyState())"), "Fresh state must be empty"
    assert E("!IO.hasContent(normalizeState(createEmptyState()))"), "Normalized empty state"
    assert E("(() => {const s=createEmptyState();s.adoption.phases.prep={owner:'Test'};return IO.hasContent(s)})()")
    E("Store.replace(buildPresetState('generic',{customer:'Synthetic'}),false); Store.saveLocal.flush()")
    saved = E("S().meta.savedAt")
    E("""Storage.prototype._originalSet = Storage.prototype.setItem;
      Storage.prototype.setItem = function(k,v) {
        if (k===STORAGE_KEY) throw new DOMException('Synthetic quota','QuotaExceededError');
        return this._originalSet(k,v);
      };
      Store.update(st => {st.meta.notes='Unsaved synthetic edit'});
      Store.saveLocal.flush();""")
    assert E("Store.storageStatus") == "failed"
    assert E("S().meta.savedAt") == saved, "Failed write must not update savedAt"
    assert "mislukt" in page.locator("#save-ind").inner_text()
    assert E("JSON.parse(localStorage.getItem(STORAGE_KEY)).meta.notes") != "Unsaved synthetic edit"
    E("Storage.prototype.setItem=Storage.prototype._originalSet; delete Storage.prototype._originalSet; Store.saveLocal(); Store.saveLocal.flush()")
    assert E("Store.storageStatus") == "saved"
    assert E("JSON.parse(localStorage.getItem(STORAGE_KEY)).meta.notes") == "Unsaved synthetic edit"

    before = E("Store._snapshot()")
    history = E("Store.past.length")
    E("Store.update(st => {st.meta.customer='partial'; st.circular=st})")
    assert E("JSON.stringify(S())") == before, "Serialization failure must roll back"
    assert E("Store.past.length") == history
    E("Store.update(st => {st.extra={updated:st.meta.updated};st.meta.customer='Edited'}); Store.saveLocal.cancel()")
    assert E("Store._snapshot()===JSON.stringify(S())"), "Snapshot must match state"
    E("Store.undo()")
    assert E("S().meta.customer") == "Synthetic"
    E("Store.redo()")
    assert E("S().meta.customer") == "Edited"

    E("Store.saveLocal.flush()")
    snapshot = E("Store._snapshot()")
    E("IO.loadText('{bad','synthetic.json')")
    assert E("Store._snapshot()") == snapshot
    E("IO.loadText(JSON.stringify({...createEmptyState(),schemaVersion:999,meta:{customer:'Future'}}),'future.json')")
    assert E("S().meta.customer") == "Edited", "Future import must not replace before approval"
    assert E("Modal.cur.title") == "Nieuwere ontwerpversie"
    E("Modal._btn(0)")
    assert E("Store._snapshot()") == snapshot, "Cancel must leave state intact"
    E("IO.loadText(JSON.stringify({...createEmptyState(),schemaVersion:999,meta:{customer:'Future'}}),'future.json'); Modal._btn(2)")
    assert E("S().meta.customer") == "Future"
    assert E("S().schemaVersion===SCHEMA_VERSION")
    assert E("(() => {const o={name:'same'};return normalizeState({...createEmptyState(),labels:[o,o]}).labels.length===2})()")
    assert E("""(() => {const s=createEmptyState();s.extra={};let o=s.extra;
      for(let i=0;i<40;i++) o=o.child={};
      try{normalizeState(s);return false}catch(e){return e.message.includes('geneste')}})()""")

    E("Store.saveLocal.flush(); applyPref('autosave',false)")
    assert E("localStorage.getItem(STORAGE_KEY)!==null"), "Switching autosave off must not delete a backup"
    E("Store.update(st=>{st.meta.customer='Not persisted'}); Store.saveLocal.flush()")
    assert E("JSON.parse(localStorage.getItem(STORAGE_KEY)).meta.customer") == "Future"
    E("applyPref('autosave',true)")
    assert E("JSON.parse(localStorage.getItem(STORAGE_KEY)).meta.customer") == "Not persisted"

    expected = E("Validation.readiness(S())")
    for helper in ["StartUtil.ready", "ExportUI.ready", "XlsxExport.ready"]:
        assert E(f"{helper}(S())") == expected, helper
    E("""window.originalReadiness=Validation.readiness;
      Validation.readiness=()=>{throw new Error('Synthetic readiness failure')};void 0;""")
    for expression in ["StartUtil.ready(S())", "ExportUI.ready(S())", "ExportUI.readiness(S())",
                       "XlsxExport.ready(S())", "XlsxExport.sheets(S())", "DocExport.html(S())"]:
        assert E(f"(()=>{{try{{{expression};return false}}catch(e){{return e.message==='Synthetic readiness failure'}}}})()"), expression
    E("App._navKey='';App.renderNav()")
    assert "Gereedheid niet beschikbaar" in page.locator("#sidenav").inner_text()
    E("Validation.readiness=window.originalReadiness;delete window.originalReadiness")
    E("window.originalDone=Views.start.done;Views.start.done=()=>{throw new Error('Synthetic step failure')};void 0")
    assert E("(()=>{try{Validation.readiness(S());return false}catch(e){return e.message==='Synthetic step failure'}})()")
    E("Views.start.done=window.originalDone;delete window.originalDone")
    E("window.originalWhen=CATALOG.tenantChecks[0].when;CATALOG.tenantChecks[0].when=()=>{throw new Error('Synthetic tenant failure')};void 0")
    assert E("(()=>{try{Validation.readiness(S());return false}catch(e){return e.message==='Synthetic tenant failure'}})()")
    E("CATALOG.tenantChecks[0].when=window.originalWhen;delete window.originalWhen;Validation._memo={key:null,val:null}")

    E("""Store.saveLocal.flush();window.originalHtml=DocExport.html;window.originalPrint=window.print;
      window.printCalls=0;window.print=()=>{window.printCalls++};
      DocExport.html=()=>{throw new Error('Synthetic document failure')};void 0;""")
    exported = E("S().meta.exportedAt")
    assert E("DocExport.print()") is False
    page.wait_for_timeout(120)
    assert E("S().meta.exportedAt") == exported and E("window.printCalls") == 0
    E("DocExport.html=window.originalHtml;document.getElementById('print-root').id='hidden-print-root'")
    assert E("DocExport.print()") is False
    E("document.getElementById('hidden-print-root').id='print-root'")
    title = page.title()
    E("window.print=()=>{throw new Error('Synthetic print failure')};DocExport.print()")
    page.wait_for_timeout(120)
    assert E("S().meta.exportedAt") == exported
    assert page.title() == title and page.locator("#print-root").inner_html() == ""
    E("window.print=()=>{window.printCalls++;window.dispatchEvent(new Event('afterprint'))};DocExport.print()")
    page.wait_for_timeout(120)
    assert E("S().meta.exportedAt") and E("S().meta.exportedAt") != exported
    assert E("window.printCalls") == 1
    assert page.title() == title and page.locator("#print-root").inner_html() == ""
    E("DocExport.print();Store.replace(createEmptyState(),false)")
    page.wait_for_timeout(120)
    assert E("S().meta.exportedAt") == "", "A pending print must not mark a replacement design"
    E("window.print=window.originalPrint;delete window.originalPrint;delete window.originalHtml")

    E("Store.saveLocal.flush();localStorage.setItem(STORAGE_KEY,'{broken')")
    page.reload()
    page.wait_for_function("typeof App !== 'undefined' && !!Store.state")
    assert E("!!Store.recovery")
    E("Store.update(st=>{st.meta.customer='Recovery edit'}); Store.saveLocal.flush()")
    assert E("localStorage.getItem(STORAGE_KEY)") == "{broken", "Do not overwrite a corrupt backup"
    assert page.get_by_role("dialog", name="Bewaren en herstellen").count() == 1
    browser.close()
print("Reliability contracts OK")
