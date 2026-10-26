import os as _os, pathlib as _pl, tempfile as _tf
_TD = _pl.Path(__file__).resolve().parents[1]  # repo-root met src, Voorbeelden en de deliverable
_OUT = _os.environ.get("PYD_TEST_OUT") or _os.path.join(_tf.gettempdir(), "pyd-tests", _pl.Path(__file__).stem)
_os.makedirs(_OUT, exist_ok=True)
import sys, json, time, pathlib
from playwright.sync_api import sync_playwright
HTML = sys.argv[1]
url = pathlib.Path(HTML).as_uri()
errs = []; res = {}
def ok(k, v):
    res[k] = v
    assert v is True, (k, v)
    print("PASS " + k)
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1440, "height": 900}, accept_downloads=True)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errs.append("PAGEERROR " + str(e)))
    pg.on("console", lambda m: errs.append("CONSOLE " + m.type + ": " + m.text) if m.type == "error" else None)
    pg.goto(url); pg.wait_for_timeout(600)
    modal_ok = lambda: pg.locator('#modal-root .btn.primary').first.click()

    # ---------- Start: 4 preset cards, overheid via UI, stays on start ----------
    pg.evaluate("App.go('start')"); pg.wait_for_timeout(100)
    ok("start 4 preset cards", pg.locator('.preset-card').count() == 4)
    ok("empty start action", pg.locator('.start-context [data-route="schema"]').count() == 1)
    pg.click('.preset-card[data-id="overheid"]'); pg.wait_for_timeout(200)
    if pg.locator('#modal-root .btn.primary').count(): modal_ok()
    pg.wait_for_timeout(400)
    ok("preset stays on start", pg.evaluate("UI.route") == "start")
    ok("klant focused", pg.evaluate("document.activeElement && document.activeElement.dataset.bind") == "st:meta.customer")
    ok("toast preset", "Vul nu de klantnaam" in pg.inner_text("#toast-root") if pg.locator("#toast-root").count() else "no toast root")
    ok("overheid framework bio", pg.evaluate("S().meta.framework") == "bio")
    ok("starttitel", pg.locator("#main h1").inner_text() == "Jouw informatiebescherming")
    ok("drie startonderdelen", pg.locator(".start-entry").count() == 3)
    # ---------- overheid on all routes ----------
    routes = pg.evaluate("NAV_ROUTES")
    before = len(errs)
    for r in routes:
        pg.evaluate(f"App.go('{r}')"); pg.wait_for_timeout(80)
        t = pg.inner_text("#main")
        if "undefined" in t or "NaN" in t or "[object Object]" in t: errs.append("BADTEXT overheid " + r)
    ok("overheid all routes no errors", len(errs) == before)

    # ---------- Start: Fabric question ----------
    pg.evaluate("App.go('start')"); pg.wait_for_timeout(100)
    pg.evaluate("document.querySelector('details[data-acc=\"start-meta-more\"], details') && 0")
    n_on = pg.evaluate("""() => { const b = document.querySelector('[data-action="start-opt"][data-key="dlp_fabric"][data-v="1"]'); if (!b) return 'no button'; b.click(); return applicableLabels(S()).filter(l => l.choices.dlp_fabric && !/-off$/.test(l.choices.dlp_fabric)).length; }""")
    ok("fabric Ja turns rows on", isinstance(n_on, int) and n_on > 0)
    n_off = pg.evaluate("""() => { document.querySelector('[data-action="start-opt"][data-key="dlp_fabric"][data-v="0"]').click(); return applicableLabels(S()).filter(l => l.choices.dlp_fabric && !/-off$/.test(l.choices.dlp_fabric)).length; }""")
    ok("fabric Nee turns rows off", n_off == 0)

    # ---------- A1 sublabel dialog: first child gets parent choices ----------
    pg.evaluate("Store.replace(buildPresetState('generic',{customer:'Test BV'}))"); pg.wait_for_timeout(100)
    pid = pg.evaluate("applicableLabels(S()).filter(l => !l.parentId && Object.keys(l.choices).length).slice(-2)[0].id")
    pch = pg.evaluate(f"JSON.stringify(labelById('{pid}').choices)")
    pg.evaluate("App.go('schema')"); pg.wait_for_timeout(100)
    pg.evaluate(f"""() => {{ const b = document.querySelector('[data-action="schema-add-sub"][data-id="{pid}"]'); if (b) b.click(); else Actions['schema-add-sub']({{dataset:{{id:'{pid}'}}}}); }}""")
    pg.wait_for_timeout(200)
    has_dlg = pg.locator("#sub-src").count() == 1
    ok("sublabel dialog with source", has_dlg)
    if has_dlg:
        ok("default source = parent", pg.evaluate("document.querySelector('#sub-src').value") == pid)
        pg.fill("#sub-name", "Testsub"); modal_ok(); pg.wait_for_timeout(300)
        r = pg.evaluate(f"""() => {{ const p = labelById('{pid}'); const c = S().labels.find(l => l.parentId === '{pid}' && l.name === 'Testsub'); return {{ child: c ? JSON.stringify(c.choices) : null, parentChoices: Object.keys(p.choices).length }}; }}""")
        ok("first child inherits parent choices", r["child"] == pch)
        ok("parent choices cleared", r["parentChoices"] == 0)
        ok("toast sublabel", "Testsub" in pg.inner_text("#toast-root"))
        # second child: default = strictest sibling, copy
        pg.evaluate(f"""() => {{ const b = document.querySelector('[data-action="schema-add-sub"][data-id="{pid}"]'); if (b) b.click(); }}""")
        pg.wait_for_timeout(200)
        sib = pg.evaluate("document.querySelector('#sub-src') && document.querySelector('#sub-src').value")
        pg.fill("#sub-name", "Testsub2"); modal_ok(); pg.wait_for_timeout(300)
        r2 = pg.evaluate(f"""() => {{ const a = S().labels.find(l => l.name === 'Testsub'); const c = S().labels.find(l => l.name === 'Testsub2'); return a && c && JSON.stringify(a.choices) === JSON.stringify(c.choices); }}""")
        ok("second child copies sibling", r2 is True)

    # ---------- A6 import with tabs and header ----------
    pg.evaluate("Store.replace(buildPresetState('empty',{customer:'Test BV'}))"); pg.wait_for_timeout(100)
    pg.evaluate("App.go('schema')"); pg.wait_for_timeout(100)
    imp = pg.evaluate("""() => { const b = document.querySelector('[data-action="schema-import"]'); if (!b) return 'no import button'; b.click(); return 'ok'; }""")
    pg.wait_for_timeout(200)
    if imp == "ok" and pg.locator("#modal-root textarea").count():
        pg.fill("#modal-root textarea", "Label\tSublabel\tOmschrijving\nOpenbaar\t\tVrij\nVertrouwelijk\t\tIntern\nVertrouwelijk\tPersoneel\tHR\nGeheim\t\t")
        modal_ok(); pg.wait_for_timeout(300)
        names = pg.evaluate("S().labels.map(l => labelFullName(l))")
        ok("import tab/header", "Label" not in names and "Vertrouwelijk / Personeel" in names)
        ok("import toast kopregel", "kopregel" in pg.inner_text("#toast-root").lower())
    else:
        ok("import dialog", False)

    # ---------- A2 ReDoS + transient test text ----------
    pg.evaluate("Store.replace(buildPresetState('generic',{customer:'Test BV'}))"); pg.wait_for_timeout(100)
    sid = pg.evaluate("""() => { let id; Store.update(st => { const s = { id: uid('sit'), kind: 'custom', name: 'ReDoS test', regex: '(a+)+$', keywords: [], confidence: 'medium', proximity: 300, medium: { keywords: true } }; st.sits.push(s); id = s.id; }); return id; }""")
    pg.evaluate(f"UI.sitEdit = '{sid}'; App.go('sits','builder')"); pg.wait_for_timeout(200)
    has_ta = pg.locator("#sit-testtext").count() == 1
    ok("builder textarea", has_ta)
    if has_ta:
        cur = pg.evaluate("document.querySelector('#sit-testtext').closest('[data-id]') ? document.querySelector('#sit-testtext').closest('[data-id]').dataset.id : ''")
        secret = "a" * 40 + "b GEHEIM-TESTTEKST-123"
        t0 = time.time()
        pg.fill("#sit-testtext", secret); pg.wait_for_timeout(900)
        out = pg.inner_text("#regex-out")
        alive = pg.evaluate("1+1") == 2
        ok("redos timeout message", "te traag" in out.lower() or "te lang" in out.lower() or "time" in out.lower() or "250" in out)
        ok("page responsive", alive and (time.time() - t0) < 5)
        js = pg.evaluate("JSON.stringify(typeof stripPrivate === 'function' ? stripPrivate(S()) : S())")
        ok("test text not in state/export", "GEHEIM-TESTTEKST" not in js)
        pg.evaluate("typeof saveLocal === 'function' ? saveLocal() : (Store.save ? Store.save() : 0)"); pg.wait_for_timeout(1500)
        ls = pg.evaluate("JSON.stringify(Object.assign({}, localStorage))")
        ok("test text not in localStorage", "GEHEIM-TESTTEKST" not in ls)
        # export JSON download
        try:
            with pg.expect_download(timeout=5000) as dl:
                pg.evaluate("Actions['save-json'] ? Actions['save-json']({dataset:{}}) : 0")
            path = dl.value.path(); txt = open(path, encoding="utf-8").read()
            ok("test text not in JSON download", "GEHEIM-TESTTEKST" not in txt)
        except Exception as e:
            raise AssertionError("JSON download failed") from e

    # ---------- A4 group chooser + plainSummary ----------
    pg.evaluate("Store.replace(buildPresetState('generic',{customer:'Test BV'}))"); pg.wait_for_timeout(100)
    ps = pg.evaluate("Keuzeoverzicht.plainSummary(S())")
    ok("plainSummary shape", isinstance(ps, list) and len(ps) > 0 and all("lines" in x and "empty" in x for x in ps))
    lid = pg.evaluate("applicableLabels(S())[1].id")
    pg.evaluate("App.go('board')"); pg.wait_for_timeout(100)
    pg.evaluate(f"_boardApply('{lid}','pub-groups')"); pg.wait_for_timeout(200)
    chooser = pg.locator("#modal-root .grp-pick").count()
    if chooser:
        pols_before = pg.evaluate("S().labelPolicies.length")
        pg.locator("#modal-root .grp-pick input[type=checkbox]").first.check(); modal_ok(); pg.wait_for_timeout(300)
        r = pg.evaluate(f"({{aud: labelById('{lid}').cfg.publish.audience, groups: labelById('{lid}').cfg.publish.groups.length}})")
        ok("group chooser applies", r["aud"] == "groups" and r["groups"] >= 1)
    else:
        r = pg.evaluate(f"({{aud: labelById('{lid}').cfg.publish.audience, groups: labelById('{lid}').cfg.publish.groups.length}})")
        ok("group chooser (direct apply, no other groups)", r["aud"] == "groups")
    orphan = pg.evaluate("S().groups.filter(g => g.forLabel && !S().labels.some(l => (l.cfg.publish.groups||[]).includes(g.id) || (l.cfg.encryption.permissions||[]).some(p => p.groupId === g.id))).map(g => g.name)")
    ok("no orphan forLabel groups", orphan == [])
    # Teams premium confirm
    pg.evaluate(f"_boardApply('{lid}','mt-strict')"); pg.wait_for_timeout(200)
    ok("teams premium confirm", "Teams Premium" in pg.inner_text("#modal-root"))
    pg.keyboard.press("Escape"); pg.wait_for_timeout(100)
    pg.evaluate("Keuzeoverzicht.open && Keuzeoverzicht.open()"); pg.wait_for_timeout(200)
    ok("keuzeoverzicht plain block", "In het kort" in pg.inner_text("#modal-root"))
    pg.keyboard.press("Escape")

    # ---------- autolabel koppelen -> sits focus -> back ----------
    pg.evaluate("App.go('autolabel')"); pg.wait_for_timeout(100)
    lid2 = pg.evaluate("applicableLabels(S())[0].id")
    pg.evaluate(f"Actions['board-sits']({{dataset:{{id:'{lid2}', back:'autolabel'}}}})"); pg.wait_for_timeout(200)
    ok("sits focus banner", pg.locator(".sit-focus").count() == 1 and pg.locator(f"#sitlbl-{lid2}.focus").count() == 1)
    pg.click('[data-action="sit-focus-back"]'); pg.wait_for_timeout(150)
    ok("back to autolabel", pg.evaluate("UI.route") == "autolabel")
    pg.evaluate("App.go('sits','map')"); pg.wait_for_timeout(150)
    pg.locator('[data-action="sit-pick"]').first.click(); pg.wait_for_timeout(150)
    ok("sit-pick menu", pg.locator(".menu, [role=menu]").count() > 0)
    pg.keyboard.press("Escape")

    # ---------- preset validation ----------
    pv = pg.evaluate("""() => { const out={}; for (const k of ['generic','zorg','overheid']) { const v = Validation.run(buildPresetState(k,{customer:'X'})); out[k] = { err: v.filter(x=>x.level==='err' || x.level==='error').length, warn: v.filter(x=>x.level==='warn').map(x=>x.title) }; } return out; }""")
    res["presetValidation"] = pv; print(json.dumps(pv, ensure_ascii=False, indent=1))
    print("ERRORS:", len(errs)); [print(" ", e) for e in errs[:20]]
    b.close()
sys.exit(bool(errs))
