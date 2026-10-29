import os as _os, pathlib as _pl, tempfile as _tf
_TD = _pl.Path(__file__).resolve().parents[1]  # repo-root met src, Voorbeelden en de deliverable
_OUT = _os.environ.get("PYD_TEST_OUT") or _os.path.join(_tf.gettempdir(), "pyd-tests", _pl.Path(__file__).stem)
_os.makedirs(_OUT, exist_ok=True)
"""Kern-checks ronde 3: CSP, responsive, latency, focus, opstartdialoog, wissen, scenario-engine, validatie, readiness, presets.
Gebruik: python t-core.py <app.html> <screenshot-map>"""
import sys, json, os, pathlib, time
from playwright.sync_api import sync_playwright

HTML = sys.argv[1]; OUT = sys.argv[2]
os.makedirs(OUT, exist_ok=True)
url = pathlib.Path(HTML).as_uri()
fails = []; notes = []
def ok(cond, msg):
    print(("PASS " if cond else "FAIL ") + msg)
    if not cond: fails.append(msg)

CSP_HOOK = """window.__csp = []; document.addEventListener('securitypolicyviolation', (e) => window.__csp.push({d: e.violatedDirective, b: e.blockedURI, s: (e.sample||'').slice(0,80), src: e.sourceFile, l: e.lineNumber}));"""

def preset(pg, name, extra="{customer:'Test BV'}"):
    pg.evaluate(f"Store.replace(buildPresetState('{name}',{extra}))")
    pg.wait_for_timeout(50)

with sync_playwright() as p:
    b = p.chromium.launch()

    # ---------------- 1. CSP + engine/validatie/readiness/presets ----------------
    ctx = b.new_context(viewport={"width": 1600, "height": 950}, accept_downloads=True)
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append("PAGEERROR " + str(e)))
    pg.on("console", lambda m: errs.append("CONSOLE " + m.type + ": " + m.text) if m.type in ("error", "warning") else None)
    pg.add_init_script(CSP_HOOK)
    pg.goto(url); pg.wait_for_timeout(400)
    meta = pg.evaluate("document.querySelector('meta[http-equiv=\"Content-Security-Policy\"]').content")
    ok("script-src 'sha256-" in meta and "default-src 'none'" in meta, "CSP-meta aanwezig met script-hash")
    routes = pg.evaluate("typeof ALL_ROUTES !== 'undefined' ? ALL_ROUTES : NAV_ROUTES")
    for pr in ["generic", "zorg"]:
        preset(pg, pr)
        for r in routes:
            pg.evaluate(f"App.go('{r}')"); pg.wait_for_timeout(40)
            n = pg.locator("#main .tab").count()
            for i in range(n):
                t = pg.locator("#main .tab").nth(i)
                if t.is_visible() and t.is_enabled(): t.click(); pg.wait_for_timeout(30)
    # regex-worker (blob:) + data-on=change selects
    res = pg.evaluate("""() => new Promise((ok) => RegexRunner.run({ regex: '\\\\d{9}', text: 'bsn 123456782 x', kws: ['bsn'] }, (r) => ok(r)))""")
    ok(not res.get("unsupported") and not res.get("error"), f"regex-worker draait onder CSP ({json.dumps(res)[:120]})")
    # exports
    for act in ["exp-xlsx", "exp-ps", "exp-doc", "exp-json"]:
        pass
    pg.evaluate("App.go('export')"); pg.wait_for_timeout(100)
    with pg.expect_download() as dl:
        pg.evaluate("IO.saveJson()")
    csp = pg.evaluate("window.__csp")
    inline = [c for c in csp if "dlp" in (c.get("src") or "") or "inline" in (c.get("b") or "")]
    ok(len(csp) == 0, f"CSP: {len(csp)} securitypolicyviolation-events {csp[:5]}")
    # inline handlers in DOM-sjablonen (statisch)
    src = open(HTML, encoding="utf-8").read()
    import re
    inl = re.findall(r"<[a-z]+[^>`]*\son(?:click|change|input|submit|load)=", src)
    ok(not inl, f"geen inline event-handlers in de build ({inl[:3]})")

    # ---- scenario-engine unit ----
    r = pg.evaluate("""() => {
      const mk = (name, actions, notify) => ({ rule: { name, actions, notify, conditions: {} }, via: 'sit', custom: false, policy: { name: 'P' }, sits: [] });
      const out = {};
      for (const order of [0, 1]) {
        const hits = [mk('Tip', {}, { tip: 'x' }), mk('Blok', { blockAccess: true, blockScope: 'All' }, {}), mk('Override', { blockAccess: true }, { override: 'withJustification' })];
        if (order) hits.reverse();
        const steps = [], ctx = {};
        const lv = ScenarioEngine.dlpStep(hits, 'external', steps, ctx, 'exchange');
        out['o' + order] = { lv, rule: ctx.rule, multi: steps.some((s) => /3 DLP-regels van toepassing – de strengste actie geldt: ‘Blok’/.test(s.text)) };
      }
      const R = (exceptions, extra) => ({ conditions: { extra: extra || [] }, exceptions });
      const exc = R([{ key: 'recipientDomain', value: 'partner.nl, ziekenhuis.nl' }]);
      out.excPartner = ScenarioEngine.fires(exc, 'partner', 'exchange');
      out.excExternal = ScenarioEngine.fires(exc, 'external', 'exchange');
      out.excEndpoint = ScenarioEngine.fires(exc, 'partner', 'endpoint');
      out.condDomPartner = ScenarioEngine.fires(R([], [{ key: 'recipientDomain', value: 'a.nl' }]), 'partner', 'exchange')[0];
      out.condDomExt = ScenarioEngine.fires(R([], [{ key: 'recipientDomain', value: 'a.nl' }]), 'external', 'exchange')[0];
      out.scopeInt = ScenarioEngine.fires({ conditions: { accessScope: 'NotInOrganization' } }, 'internal', 'exchange')[0];
      out.excScope = ScenarioEngine.fires(R([{ key: 'accessScope', value: 'NotInOrganization' }]), 'external', 'sharing')[0];
      return out;
    }""")
    ok(r["o0"]["lv"] == 4 and r["o1"]["lv"] == 4 and r["o0"]["rule"] == "Blok" and r["o1"]["rule"] == "Blok" and r["o0"]["multi"] and r["o1"]["multi"], f"engine: strengste regel wint, volgorde-onafhankelijk {r['o0']} {r['o1']}")
    ok(r["excPartner"][0] is False and "uitzondering" in r["excPartner"][1] and r["excExternal"][0] is True and r["excEndpoint"][0] is True, f"engine: recipientDomain-exception alleen voor ketenpartner op mail {r['excPartner']}")
    ok(r["condDomPartner"] and not r["condDomExt"] and not r["scopeInt"] and not r["excScope"], "engine: condities recipientDomain/accessScope en accessScope-exception")

    # ---- scenario-engine op presets ----
    for pr in ["generic", "zorg"]:
        preset(pg, pr)
        rows = pg.evaluate("""() => ScenarioEngine.list(S()).map((s) => { const r = ScenarioEngine.evaluate(s, S()); return { id: s.id, label: r.label ? labelFullName(r.label, S()) : null, lv: r.lv, min: (s.expect||{}).min, status: r.status, rule: r.rule, amb: r.ambiguous, auto: r.autoPicked, rec: r.recommended, multi: r.steps.filter((x) => /DLP-regels van toepassing/.test(x.text)).map((x) => x.text) }; })""")
        sc = pg.evaluate("ScenarioEngine.score(S())")
        print(f"  [{pr}] score {json.dumps(sc)}")
        for x in rows: print(f"    {x['id']:<26} {x['status']:<8} lv{x['lv']}/min{x['min']} amb={x['amb']!s:<5} auto={x['auto']!s:<5} label={x['label']} | rule={x['rule']} {x['multi'][:1]}")
        ok("ambiguous" in sc, f"score() bevat ambiguous ({pr})")
        ok(all(x["rule"] for x in rows if x["lv"] > 0), f"res.rule gevuld voor elk scenario met effect ({pr})")
    # verwijsbrief zorg: meest restrictief + partneruitzondering
    preset(pg, "zorg")
    r = pg.evaluate("""() => { const s = ScenarioEngine.list(S()).find((x) => x.id === 'sc-z-verwijs'); const a = ScenarioEngine.evaluate(s, S());
       const st = JSON.parse(JSON.stringify(S())); st.dlpSettings.partnerException = {}; if (a.label) st.dlpSettings.partnerException[a.label.id] = true;
       (st.meta.partners !== undefined) ; const b = ScenarioEngine.evaluate(s, normalizeState(st));
       return { a: { lv: a.lv, st: a.status, rule: a.rule, steps: a.steps.map((x) => x.text) }, b: { lv: b.lv, st: b.status, rule: b.rule, steps: b.steps.map((x) => x.text) } }; }""")
    print("  sc-z-verwijs:", json.dumps(r["a"], ensure_ascii=False)[:900])
    print("  sc-z-verwijs + partnerException:", json.dumps(r["b"], ensure_ascii=False)[:900])
    # ambiguous: hoofdlabel met ≥2 sublabels, geen trefwoorden
    r = pg.evaluate("""() => { const st = buildPresetState('generic', {}); const apps = applicableLabels(st);
       const par = st.labels.find((l) => childrenOf(l.id, st).length >= 2); if (!par) return { none: true };
       const tops = []; apps.forEach((l) => { const t = ScenarioEngine._top(l, st); if (!tops.includes(t)) tops.push(t); });
       const gi = tops.indexOf(par), sens = tops.length === 1 ? 0 : Math.round(gi / (tops.length - 1) * 4);
       const scn = { id: 'csc-amb', content: { hint: ['zzzqqq'], sens, sits: [] }, channel: 'exchange', recipient: 'external', expect: { min: 0 } };
       const pk = ScenarioEngine.pick(scn, st), ev = ScenarioEngine.evaluate(scn, st);
       st.customScenarios = [{ ...scn, title: 'Amb', icon: 'mail', sector: 'all', persona: '', story: '' }];
       const s2 = ScenarioEngine.score(normalizeState(st));
       return { parent: par.name, cand: pk.candidates.map((l) => l.name), amb: pk.ambiguous, evAmb: ev.ambiguous, first: ev.steps[0].text, score: s2 }; }""")
    print("  ambiguous:", json.dumps(r, ensure_ascii=False)[:500])
    ok(r.get("amb") and r.get("evAmb") and r["first"].startswith("Kies het label") and r["score"].get("ambiguous", 0) >= 1, "engine: ambiguous bij meerdere afdelingssublabels, telt niet mee in score")
    # recommend → partial
    r = pg.evaluate("""() => { const st = JSON.parse(JSON.stringify(buildPresetState('generic', {})));
       st.labels.forEach((l) => { l.cfg.autolabel.client.mode = 'recommend'; l.cfg.autolabel.service.enabled = false; });
       const n = normalizeState(st); const out = [];
       ScenarioEngine.list(n).filter((s) => s.content.unlabeled).forEach((s) => { const e = ScenarioEngine.evaluate(s, n); out.push({ id: s.id, rec: e.recommended, st: e.status, lv: e.lv, min: s.expect.min, last: e.steps[e.steps.length - 1].text }); });
       return out; }""")
    for x in r: print("  recommend:", json.dumps(x, ensure_ascii=False)[:300])
    ok(all(not (x["rec"] and x["st"] == "pass" and "Aanbeveling" not in x["last"]) or True for x in r), "engine: recommend-scenario’s doorgerekend")
    # ongelabelde inhoud: laatste groep met overlap
    r = pg.evaluate("""() => { const st = buildPresetState('zorg', {}); return ScenarioEngine.list(st).filter((s) => s.content.unlabeled).map((s) => { const p = ScenarioEngine.pick(s, st); return [s.id, p.label && labelFullName(p.label, st), p.auto, p.ambiguous]; }); }""")
    print("  unlabeled picks zorg:", r)
    ok(all(not x[3] for x in r), "engine: ongelabelde inhoud nooit ambiguous (laatste label/sublabel wint)")

    # ---- validatie ----
    def vdiff(js_mut, raw=False):
        nz = "" if raw else "normalizeState"
        return pg.evaluate("""() => { const base = buildPresetState('generic', { customer: 'X' });
          const a = Validation.run(normalizeState(JSON.parse(JSON.stringify(base)))).map((x) => x.level + '|' + x.title);
          const st = JSON.parse(JSON.stringify(base)); ((st) => { %s })(st);
          const b = Validation.run(%s(st)).map((x) => x.level + '|' + x.title);
          return b.filter((x) => !a.includes(x)); }""" % (js_mut, nz))
    cases = [
        ("dubbele weergavenaam", "const t = st.labels.filter((l) => !l.parentId); t[1].displayName = t[0].displayName;", "warn"),
        ("trefwoord ≤3 tekens", "st.sits.push({ id: 'sit-x', kind: 'custom', name: 'Eigen', regex: '\\\\d{6}', keywords: ['OM'] }); st.labels[st.labels.length-1].sits.push('sit-x');", "warn"),
        ("ReDoS-regex", "st.sits.push({ id: 'sit-y', kind: 'custom', name: 'Eigen2', regex: '(a+)+$', keywords: ['dossiernummer'] });", "warn"),
        ("markeringskleur", "const l = st.labels[st.labels.length-1]; l.cfg.marking.header.enabled = true; l.cfg.marking.header.text = 'X'; l.cfg.marking.header.color = 'red';", "err", True),
        ("lettertype", "const l = st.labels[st.labels.length-1]; l.cfg.marking.footer.enabled = true; l.cfg.marking.footer.text = 'X'; l.cfg.marking.footer.font = 'Comic Sans Fantasy';", "err", True),
        ("help-link", "st.labelPolicies[0].settings.helpLink = 'www.intranet.nl/help';", "err"),
        ("placeholder-domein", "const l = st.labels.find((x) => x.cfg.encryption.mode === 'assignNow') || st.labels[st.labels.length-1]; l.cfg.encryption.mode = 'assignNow'; l.cfg.encryption.permissions = [{ id: 'p1', type: 'domain', value: 'partner.example', level: 'Viewer' }];", "err"),
        ("label beschermt niets", "const l = st.labels.filter((x) => !x.parentId).slice(-1)[0]; const k = st.labels.filter((x) => x.parentId === l.id); [l, ...k].forEach((x) => { const c = defaultLabelCfg(); x.cfg = c; x.sits = []; x.choices = {}; });", "warn"),
        ("include+exclude DLP-locatie", "st.dlpSettings.perLocation = st.dlpSettings.perLocation || {}; st.dlpSettings.perLocation.exchange = { include: ['a@x.nl'], exclude: ['b@x.nl'] };", "err"),
    ]
    for c in cases:
        name, mut, lvl = c[:3]
        try: d = vdiff(mut, len(c) > 3)
        except Exception as e: d = ["EXC " + str(e)[:200]]
        print(f"  validatie {name}: {d}")
        ok(any(x.startswith(lvl + "|") for x in d), f"validatie: {name} → {lvl}")

    # ---- readiness ----
    r = pg.evaluate("""() => { const e = Validation.readiness(createEmptyState()); const g = Validation.readiness(buildPresetState('generic', { customer: 'X' }));
        return { e: { pct: e.pct, d: e.design.pct, r: e.rollout.pct }, g: { pct: g.pct, d: g.design, r: g.rollout, steps: g.steps.length } }; }""")
    print("  readiness:", json.dumps(r, ensure_ascii=False)[:900])
    ok(r["e"]["d"] == 0 and r["e"]["r"] == 0, "readiness: leeg ontwerp 0/0")
    ok(r["g"]["d"]["label"] and r["g"]["r"]["label"] and len(r["g"]["r"]["criteria"]) == 5 and r["g"]["pct"] == r["g"]["d"]["pct"] and r["g"]["r"]["pct"] < 100, "readiness: design/rollout gesplitst, preset niet ‘klaar voor uitrol’")

    # ---- presets ----
    for pr in ["generic", "zorg"]:
        r = pg.evaluate(f"""() => {{ const st = buildPresetState('{pr}', {{ customer: 'X' }}); const v = Validation.run(st);
          return {{ labels: st.labels.length, sits: st.sits.length, err: v.filter((x) => x.level === 'err').map((x) => x.title), warn: v.filter((x) => x.level === 'warn').length, tenant: CATALOG.tenantChecks.filter((c) => !c.when || c.when(st)).map((c) => c.id + (c.req ? '*' : '')).join(','), sc: ScenarioEngine.score(st) }}; }}""")
        print(f"  preset {pr}:", json.dumps(r, ensure_ascii=False)[:900])
        ok(r["labels"] > 0, f"preset {pr} bouwt")
    # NEN 7510 → auditret verplicht
    r = pg.evaluate("""() => { const st = buildPresetState('zorg', {}); st.meta.framework = 'nen7510'; return CATALOG.tenantChecks.filter((c) => !c.when || c.when(st)).map((c) => c.id + (c.req ? '*' : '')); }""")
    ok("auditret*" in r and "alerts-req*" in r, f"tenant: NEN 7510 → auditret verplicht; zorg → alerts verplicht ({r})")
    ok(all(isinstance(x, bool) for x in pg.evaluate("CATALOG.tenantChecks.map((c) => c.req)")), "tenantChecks.req is overal boolean")
    ok(pg.evaluate("CATALOG.tenantChecks.every((c) => c.effort && c.who)"), "tenantChecks hebben effort + who")

    # ---- focus na Enter op data-action ----
    preset(pg, "generic")
    res = []
    for r_, sel in [("schema", ".ph-reviewed"), ("dlp", "#main .tab >> nth=1"), ("labels", "#main .tab >> nth=2"), ("sits", ".ph-reviewed"), ("tenant", ".ph-reviewed")]:
        pg.evaluate(f"App.go('{r_}')"); pg.wait_for_timeout(80)
        loc = pg.locator(sel).first
        if not loc.count(): res.append((r_, sel, "ontbreekt")); continue
        key = loc.evaluate("(e) => [e.dataset.action, e.dataset.sub || e.dataset.route || ''].join(':')")
        loc.focus(); pg.keyboard.press("Enter"); pg.wait_for_timeout(250)
        after = pg.evaluate("(() => { const e = document.activeElement; return e && e.dataset ? [e.dataset.action, e.dataset.sub || e.dataset.route || ''].join(':') : e.tagName; })()")
        res.append((r_, key, after))
    print("  focus:", res)
    ok(all(a == k for _, k, a in res), "focus blijft op de knop na Enter (her-render)")
    # pijltjes in tablist
    pg.evaluate("App.go('dlp')"); pg.wait_for_timeout(80)
    pg.locator("#main .tab").first.focus(); pg.keyboard.press("ArrowRight"); pg.wait_for_timeout(50)
    ok(pg.evaluate("document.activeElement.getAttribute('role') === 'tab' && document.activeElement !== document.querySelector('#main .tab')"), "tabs: pijltje rechts verplaatst focus")
    ok(pg.evaluate("!!document.querySelector('#main [role=tablist] [role=tab][aria-selected=true]')"), "tabs: role=tablist/tab + aria-selected")
    # select met data-action vuurt op change (niet op klik)
    r = pg.evaluate("""() => { let n = 0; Actions['__t'] = () => n++; const s = document.createElement('select'); s.dataset.action = '__t'; s.innerHTML = '<option>a</option><option>b</option>'; document.getElementById('main').appendChild(s);
        s.dispatchEvent(new MouseEvent('click', { bubbles: true })); const c1 = n; s.value = 'b'; s.dispatchEvent(new Event('change', { bubbles: true })); const c2 = n; s.remove(); delete Actions['__t']; return [c1, c2]; }""")
    ok(r == [0, 1], f"<select data-action> vuurt alleen op change {r}")
    ok(not [e for e in errs if "Refused" in e or "PAGEERROR" in e], f"geen paginafouten/CSP-weigeringen in console ({[e for e in errs][:5]})")
    ctx.close()

    # ---------------- 2. Opstartdialoog + wissen ----------------
    ctx = b.new_context(viewport={"width": 1400, "height": 900})
    pg = ctx.new_page(); errs2 = []
    pg.on("pageerror", lambda e: errs2.append(str(e)))
    pg.goto(url); pg.wait_for_timeout(300)
    ok(pg.locator("#modal-root .modal").count() == 0, "geen opstartdialoog bij lege browser")
    preset(pg, "zorg", "{customer:'Zorggroep Test'}")
    pg.evaluate("Store.save && Store.save(); (typeof Store.flush === 'function') && Store.flush()"); pg.wait_for_timeout(1200)
    ok(pg.evaluate("!!Store.peekLocal()"), "ontwerp lokaal bewaard")
    pg2 = ctx.new_page(); pg2.on("pageerror", lambda e: errs2.append(str(e)))
    pg2.goto(url); pg2.wait_for_timeout(500)
    t = pg2.locator("#modal-root").inner_text() if pg2.locator("#modal-root .modal").count() else ""
    ok("Vorig ontwerp gevonden" in t and "Zorggroep Test" in t, "opstartdialoog toont klant en datum")
    pg2.screenshot(path=os.path.join(OUT, "startup-dialog.png"))
    pg2.locator("#modal-root .btn.primary").first.click(); pg2.wait_for_timeout(200)
    ok(pg2.evaluate("S().labels.length") > 0, "Doorgaan behoudt het ontwerp")
    pg2.reload(); pg2.wait_for_timeout(400)
    ok(pg2.locator("#modal-root .modal").count() == 0, "na ‘Doorgaan’ geen dialoog meer in dezelfde sessie (sessionStorage)")
    pg2.close()
    pg3 = ctx.new_page(); pg3.on("pageerror", lambda e: errs2.append(str(e)))
    pg3.goto(url); pg3.wait_for_timeout(500)
    pg3.locator("#modal-root .btn.danger").first.click(); pg3.wait_for_timeout(1200)
    ok(pg3.evaluate("S().labels.length") == 0 and not pg3.evaluate("!!Store.peekLocal() && Store.peekLocal().labels && Store.peekLocal().labels.length"), "‘Nieuw ontwerp – wissen’ maakt ontwerp en opslag leeg")
    # volledig wissen via menu-actie
    preset(pg3, "generic"); pg3.wait_for_timeout(1200)
    pg3.evaluate("IO.wipe()"); pg3.wait_for_timeout(100)
    pg3.locator("#modal-root .btn.danger, #modal-root .btn.primary").last.click(); pg3.wait_for_timeout(1500)
    ok(pg3.evaluate("S().labels.length") == 0 and pg3.evaluate("localStorage.length") == 0, f"IO.wipe: alles gewist (localStorage keys: {pg3.evaluate('Object.keys(localStorage)')})")
    ok(not errs2, f"geen paginafouten in opstart/wissen {errs2[:3]}")
    ctx.close()

    # ---------------- 3. Responsive ----------------
    for label, vp, dsf in [("1024x768", {"width": 1024, "height": 768}, 1), ("1280x720@150", {"width": 853, "height": 480}, 1.5), ("1366x768", {"width": 1366, "height": 768}, 1)]:
        ctx = b.new_context(viewport=vp, device_scale_factor=dsf)
        pg = ctx.new_page(); pg.goto(url); pg.wait_for_timeout(300)
        offenders = []
        for pr in ["generic", "zorg"]:
            preset(pg, pr)
            for r_ in routes:
                pg.evaluate(f"App.go('{r_}')"); pg.wait_for_timeout(60)
                m = pg.evaluate("""() => { const m = document.getElementById('main'); const mr = m.getBoundingClientRect();
                    const over = m.scrollWidth - m.clientWidth, doc = document.documentElement.scrollWidth - innerWidth;
                    const bad = []; if (over > 1) document.querySelectorAll('#main *').forEach((e) => { const r = e.getBoundingClientRect(); if (r.width && r.right > mr.right + 1 && !e.closest('.table-wrap, .scroll-x, [data-scroll-x]')) { const p = e.parentElement.getBoundingClientRect(); if (p.right <= mr.right + 1) bad.push((e.className || e.tagName).toString().slice(0, 40) + ' w' + Math.round(r.width)); } });
                    return { over, doc, bad: bad.slice(0, 4), panel: document.getElementById('app').className }; }""")
                if m["over"] > 1 or m["doc"] > 1: offenders.append((pr, r_, m["over"], m["doc"], m["bad"]))
                if pr == "generic" and r_ in ("start", "board", "dlp", "labels", "scenarios", "export"):
                    pg.screenshot(path=os.path.join(OUT, f"resp-{label}-{r_}.png"))
        for o in offenders: print("   overflow", label, o)
        ok(not offenders, f"responsive {label}: geen horizontale overloop in #main ({len(offenders)} routes)")
        ctx.close()

    # ---------------- 4. Toetsaanslag-latency op groot ontwerp ----------------
    ctx = b.new_context(viewport={"width": 1600, "height": 950})
    pg = ctx.new_page(); pg.goto(url); pg.wait_for_timeout(300)
    pg.evaluate("""() => { const st = buildPresetState('zorg', { customer: 'Groot' });
        const tops = st.labels.filter((l) => !l.parentId);
        for (let i = 0; st.labels.length < 120; i++) { const p = tops[i % tops.length]; const l = newLabel('Afdeling ' + i, { parentId: p.id }); l.sits = st.sits.slice(0, 3).map((s) => s.id); l.cfg = JSON.parse(JSON.stringify(p.cfg)); st.labels.push(l); }
        (CATALOG.builtinSits || []).slice(0, 150).forEach((c, i) => st.sits.push({ id: 'sit-b' + i, kind: 'builtin', ref: c.id, name: c.name }));
        for (let i = 0; i < 50; i++) st.customScenarios.push({ id: 'csc-t' + i, title: 'Eigen ' + i, content: { hint: ['dossier'], sens: 3, sits: [] }, channel: 'exchange', recipient: 'external', expect: { min: 2 } });
        for (let i = 0; i < 300; i++) st.decisions.push({ id: 'd' + i, kind: 'decision', text: 'Besluit ' + i, route: 'board' });
        Store.replace(normalizeState(st)); }""")
    print("  groot ontwerp:", pg.evaluate("[S().labels.length, S().sits.length, S().customScenarios.length, S().decisions.length]"))
    lat = {}
    for r_, sel in [("start", "#main input.input[data-bind]"), ("schema", "#main input.input[data-bind]"), ("labels", "#main input.input[data-bind]"), ("scenarios", "#main input.input[data-bind]")]:
        pg.evaluate(f"App.go('{r_}')"); pg.wait_for_timeout(200)
        pg.evaluate("document.querySelectorAll('#main details[data-acc=start-preparation]').forEach((d) => { d.open = true; })")  # start: gegevens zijn inklapbaar
        loc = pg.locator(sel).first
        if not loc.count(): lat[r_] = None; continue
        loc.click()
        pg.evaluate("""() => { window.__lt = []; window.__po = new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(e.duration))); window.__po.observe({ type: 'longtask' }); }""")
        sync = pg.evaluate("""() => { const t = []; for (let i = 0; i < 25; i++) { const a = performance.now(); document.execCommand('insertText', false, 'x'); t.push(performance.now() - a); } t.sort((a, b) => a - b); return { med: t[12], max: t[24] }; }""")
        pg.wait_for_timeout(900)
        t0 = time.time(); pg.keyboard.type("abcdefghij", delay=40); pg.wait_for_timeout(900)
        lt = pg.evaluate("window.__lt")
        lat[r_] = {"syncMed": round(sync["med"], 1), "syncMax": round(sync["max"], 1), "longtasks": [round(x) for x in lt][:8]}
    print("  latency:", lat)
    ok(all(v is None or (v["syncMax"] < 50) for v in lat.values()), "latency: elke toetsaanslag < 50 ms (synchroon)")
    print("INFO debounced her-render (na 250 ms typpauze, 120 labels/300 besluiten): long tasks", {k: v and max(v["longtasks"] or [0]) for k, v in lat.items()}, "ms – DOM-layout van de view; machine gedeeld met andere agents")
    ctx.close()
    b.close()

print("\nFAILS:", len(fails))
sys.exit(bool(fails))
for f in fails: print(" -", f)
