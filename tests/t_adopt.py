import os as _os, pathlib as _pl, tempfile as _tf
_TD = _pl.Path(__file__).resolve().parents[1]  # repo-root met src, Voorbeelden en de deliverable
_OUT = _os.environ.get("PYD_TEST_OUT") or _os.path.join(_tf.gettempdir(), "pyd-tests", _pl.Path(__file__).stem)
_os.makedirs(_OUT, exist_ok=True)
"""Ronde 5 – Impact & adoptie: tabbladen, spiekbrief, labelkaarten, communicatiepakket, persona-reis, quiz, meten, document-export.
Gebruik: python t-adopt.py app.html [screenshotmap]"""
import sys, pathlib, re
from playwright.sync_api import sync_playwright

HTML = sys.argv[1]
SHOTS = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else None
if SHOTS: SHOTS.mkdir(parents=True, exist_ok=True)
TABS = ["impact", "rollout", "tree", "cards", "comms", "journey", "quiz", "lab", "kpi"]
fails = []
def check(name, ok, info=""):
    print(("PASS " if ok else "FAIL ") + name + (f"  [{info}]" if info else ""))
    if not ok: fails.append(name)

BAD = r"""() => { const t = document.querySelector('#main').innerText; const m = t.match(/undefined|NaN|\[object Object\]|kon niet worden opgebouwd/); return m ? m[0] : ''; }"""

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1440, "height": 900}, accept_downloads=True)
    pg = ctx.new_page()
    pg.set_default_timeout(6000)
    errs = []
    pg.on("pageerror", lambda e: errs.append("pageerror: " + str(e)))
    pg.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" else None)
    pg.on("dialog", lambda d: (errs.append("dialog: " + d.message), d.dismiss()))
    pg.goto(pathlib.Path(HTML).as_uri()); pg.wait_for_timeout(500)
    E = pg.evaluate
    def load(k, extra=""):
        E(f"Store.replace(buildPresetState('{k}',{{customer:'Test BV'}})); {extra}"); pg.wait_for_timeout(120)
    def tab(t):
        E(f"App.go('adoption','{t}')"); pg.wait_for_timeout(160)
    def shot(name, full=False):
        if SHOTS: pg.screenshot(path=str(SHOTS / f"{name}.png"), full_page=full)

    # ---------- Kop & tabs ----------
    load("generic"); tab("impact")
    eb = E("(document.querySelector('#main .ph-eyebrow, #main .eyebrow')||{}).textContent||''")
    check("geen 'Workshop 3' in kop", "Workshop" not in E("document.querySelector('#main').innerText"), eb)
    # Herontwerp: 4 hoofdtabbladen (Impact, Uitrol, Materiaal, Meten); de 8 onderdelen blijven bereikbaar via App.go en de segmentkeuze.
    check("4 tabbladen", pg.locator("#main .tabs .tab").count() == 4, str(pg.locator("#main .tabs .tab").count()))
    pg.locator('#main .tabs .tab[data-sub="tree"]').click(); pg.wait_for_timeout(150)
    check("tabklik → spiekbrief", pg.locator("#main .adp-sheet").count() == 1)

    # ---------- Alle tabs × presets × thema ----------
    for preset in ["generic", "zorg", "overheid"]:
        for theme in ["light", "dark"]:
            E(f"Prefs.set('theme','{theme}')"); load(preset)
            for t in TABS:
                tab(t)
                bad = E(BAD)
                pane = pg.locator("#main .adp-pane").count()
                check(f"{preset}/{theme}/{t} rendert", pane == 1 and not bad, bad)
                if theme == "light" or preset == "zorg": shot(f"{preset}-{theme}-{t}", full=True)
    E("Prefs.set('theme','light')")

    # ---------- Spiekbrief volgt de labelnamen ----------
    for preset in ["generic", "zorg", "overheid"]:
        load(preset); tab("tree")
        r = E("""() => { const st=S(); const tops=AdoptKit.tops(st).map(l=>AdoptKit.nm(l)); const txt=document.querySelector('#main .adp-sheet').innerText;
          return { tops, miss: tops.filter(n=>!txt.includes(n)), q: document.querySelectorAll('#main .adp-q').length, out: document.querySelectorAll('#main .adp-out').length, sub: document.querySelectorAll('#main .adp-sub').length, kids: orderedLabels(st).filter(l=>parentOf(l,st)).length }; }""")
        check(f"{preset}: spiekbrief toont alle hoofdlabels", not r["miss"], f"{r['tops']} mis={r['miss']}")
        check(f"{preset}: {len(r['tops'])-1} vragen, {len(r['tops'])} uitkomsten", r["q"] == len(r["tops"]) - 1 and r["out"] == len(r["tops"]), f"q={r['q']} out={r['out']}")
        check(f"{preset}: sublabels in spiekbrief", r["sub"] == r["kids"], f"{r['sub']}/{r['kids']}")
    # 2 en 6 niveaus + hernoemen
    load("generic")
    E("""(() => { const st=S(); const t=AdoptKit.tops(st); Store.update(s=>{ const l=s.labels.find(x=>x.id===t[0].id); l.displayName='Openbaar-XYZ'; l.name='Openbaar-XYZ'; }); })()"""); tab("tree")
    check("hernoemd label direct in spiekbrief", "Openbaar-XYZ" in pg.locator("#main .adp-sheet").inner_text())
    for n in [2, 6]:
        r = E(f"""(() => {{ const st=S(); const keep=AdoptKit.tops(st).slice(0,{n}); const extra=[];
          for (let i=keep.length;i<{n};i++) extra.push(newLabel('Niveau '+i,{{color:'#336699',tooltip:'Extra niveau'}}));
          Store.update(s=>{{ s.labels = s.labels.filter(l=>keep.some(k=>k.id===l.id) || keep.some(k=>k.id===l.parentId)).concat(extra); }});
          App.render(); return {{ tops: AdoptKit.tops(S()).length, q: AdoptKit.questions(S()).steps.length }}; }})()""")
        tab("tree")
        check(f"{n} niveaus: {n-1} vragen", r["tops"] == n and r["q"] == n - 1 and pg.locator("#main .adp-q").count() == n - 1, str(r))
        load("generic")

    # ---------- Labelkaarten ----------
    for preset in ["generic", "zorg", "overheid"]:
        load(preset); tab("cards")
        r = E("({cards: document.querySelectorAll('#main .adp-lcard').length, leaves: applicableLabels(S()).length, thumbs: document.querySelectorAll('#main .adp-thumb').length, mk: document.querySelectorAll('#main .adp-mk, #main .adp-wm').length})")
        check(f"{preset}: kaart per label met 3 thumbnails", r["cards"] == r["leaves"] and r["thumbs"] == 3 * r["cards"], str(r))
        check(f"{preset}: markeringen zichtbaar in thumbnails", r["mk"] > 0, str(r["mk"]))
    load("zorg"); tab("cards")
    if SHOTS: pg.locator("#main .adp-lcard").first.screenshot(path=str(SHOTS / "card-zorg.png"))

    # ---------- Communicatie: kopiëren + download ----------
    load("zorg", "Store.update(s=>{ s.adoption=s.adoption||{}; s.adoption.phases=s.adoption.phases||{}; s.adoption.phases.sim={start:'2026-03-02'}; s.adoption.phases.enforce={start:'2026-05-04'}; s.adoption.comms={contact:'Anne Jansen'}; })")
    tab("comms")
    check("3 communicatie-items", pg.locator("#main .adp-comm").count() == 3, str(pg.locator("#main .adp-comm").count()))
    txt = pg.locator("#main .adp-text").first.inner_text()
    check("aankondiging bevat klantnaam, contact en datum", "Test BV" in txt and "Anne Jansen" in txt and "2 maart 2026" in txt, txt[:120])
    faq = E("AdoptKit.commText(S(),'faq')")
    nq = len(re.findall(r"(?m)^\s*(?:V:|\d+\.\s).*\?\s*$", faq)) or faq.count("?")
    check("FAQ heeft 8–12 vragen", 8 <= E("CATALOG.adoption.faq.length") <= 12, str(E("CATALOG.adoption.faq.length")))
    check("FAQ noemt Copilot, telefoon en verkeerde label", all(k in faq for k in ["Copilot", "telefoon", "verkeerde label"]))
    try: ctx.grant_permissions(["clipboard-read", "clipboard-write"])
    except Exception: pass
    pg.locator('#main [data-action="adp-copy"][data-item="mail"]').click(); pg.wait_for_timeout(300)
    toast = E("(document.querySelector('#toast-root')||{}).innerText||''")
    check("kopieer → toast", "gekopieerd" in toast or "Kopiëren lukte niet" in toast, toast[:80])
    try:
        clip = E("navigator.clipboard.readText()")
        check("klembord bevat aankondiging", "Test BV" in clip, clip[:60])
    except Exception as e:
        print("INFO klembord niet leesbaar:", str(e)[:80])
    # fallback zonder clipboard-API
    E("Object.defineProperty(navigator,'clipboard',{value:undefined,configurable:true})")
    pg.locator('#main [data-action="adp-copy"][data-item="faq"]').click(); pg.wait_for_timeout(300)
    toast = E("(document.querySelector('#toast-root')||{}).innerText||''")
    check("kopieer-fallback zonder clipboard-API", "gekopieerd" in toast or "Kopiëren lukte niet" in toast, toast[:80])
    for item in ["mail", "intranet", "faq", "all"]:
        with pg.expect_download() as dl:
            pg.locator(f'#main [data-action="adp-dl"][data-item="{item}"]').click()
        d = dl.value
        path = d.path(); body = pathlib.Path(path).read_text(encoding="utf-8-sig")
        check(f"download {item} → .txt", d.suggested_filename.endswith(".txt") and "Test BV" in body and len(body) > 300, f"{d.suggested_filename} {len(body)}")
    shot("comms-zorg", True)

    # ---------- Persona-reis ----------
    for preset in ["generic", "zorg", "overheid"]:
        load(preset); tab("journey")
        n = pg.locator("#main select#adp-per-s option").count()
        moms = pg.locator("#main .adp-mom").count()
        check(f"{preset}: persona-reis 4–6 momenten met scène", n > 0 and 4 <= moms <= 6 and pg.locator("#main .adp-mom svg.adp-scene").count() == moms, f"pers={n} moms={moms}")
        check(f"{preset}: persona-keuze met zichtbaar label", pg.locator('#main label[for="adp-per-s"]').is_visible())
        check(f"{preset}: één groot labelblok voor het gekozen label", pg.locator("#main .adp-jhero").count() == 1
              and pg.locator("#main .adp-jhero .adp-jchip-t").inner_text().strip().endswith(E("AdoptKit.nm(AdoptKit.personaLabel(S().personas[0], S()))")))
        if n > 1:
            pg.locator("#main select#adp-per-s").select_option(E("S().personas[1].id")); pg.wait_for_timeout(150)
            check(f"{preset}: wissel persona", pg.locator("#main select#adp-per-s").input_value() == E("S().personas[1].id") and E("document.activeElement && document.activeElement.id") == "adp-per-s")
        pills = pg.locator("#main .adp-lsel-b")
        if pills.count() > 1:
            v = pills.last.get_attribute("data-l"); pills.last.click(); pg.wait_for_timeout(200)
            check(f"{preset}: labelkeuze persona-reis", pg.locator("#main .adp-lsel-b[aria-checked=true]").get_attribute("data-l") == v)
    load("zorg"); tab("journey")
    pv = pg.locator('#main .adp-mom [data-action="pv-open"]')
    if pv.count():
        pv.first.click(); pg.wait_for_timeout(300)
        check("‘Zo ziet het eruit’ opent preview", pg.locator(".pv-wrap").count() >= 1)
        pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
    shot("journey-zorg", True)

    # ---------- Quiz ----------
    load("zorg"); tab("quiz")
    n = E("AdoptKit.quiz(S()).length")
    check("quiz 6–10 vragen", 6 <= n <= 10, str(n))
    good = 0
    for i in range(n):
        ok_idx = E(f"AdoptKit.quiz(S())[{i}].opts.findIndex(o=>o.ok)")
        pick = ok_idx if i % 2 == 0 else (ok_idx + 1) % E(f"AdoptKit.quiz(S())[{i}].opts.length")
        if i % 2 == 0: good += 1
        pg.locator(f'#main .adp-opt[data-o="{pick}"]').click(); pg.wait_for_timeout(80)
        fb = pg.locator("#main .adp-fb")
        check(f"quiz v{i+1} feedback", fb.count() == 1 and ("ok" in fb.get_attribute("class")) == (i % 2 == 0))
        whys = E("[...document.querySelectorAll('#main .adp-quiz .adp-opt')].map(o => ((o.querySelector('.adp-owhy')||{}).textContent||'').trim().length)")
        check(f"quiz v{i+1} uitleg bij elk alternatief", len(whys) >= 2 and all(w > 5 for w in whys), str(whys))
        check(f"quiz v{i+1} ‘Meer uitleg’", pg.locator("#main .adp-fb details.adp-why > summary").count() == 1 and "Meer uitleg" in pg.locator("#main .adp-fb details.adp-why > summary").inner_text())
        check(f"quiz v{i+1} feedback niet alleen kleur", ("Juist." in fb.inner_text() or "Onjuist." in fb.inner_text()) and pg.locator("#main .adp-quiz .adp-otag").count() >= 1)
        if i == 0: shot("quiz-feedback")
        pg.locator('#main [data-action="adp-qn"]').click(); pg.wait_for_timeout(80)
    score = pg.locator("#main .adp-qres").inner_text()
    check("quiz score", f"{good} van de {n}" in score, score[:60])
    shot("quiz-score", True)
    pg.locator('#main [data-action="adp-qr"]').click(); pg.wait_for_timeout(100)
    check("quiz reset", pg.locator("#main .adp-qnum").text_content().startswith("Vraag 1 ") and pg.locator("#main .adp-qdot.ok, #main .adp-qdot.no").count() == 0)
    # Presenteren + toetsenbord
    pg.locator('#main [data-action="adp-toggle-quizfs"]').click(); pg.wait_for_timeout(200)
    check("presenteermodus", pg.locator(".adp-quiz.fs").count() == 1)
    pg.keyboard.press("b"); pg.wait_for_timeout(120)
    check("toets B beantwoordt", pg.locator("#main .adp-fb").count() == 1)
    shot("quiz-fs")
    pg.keyboard.press("ArrowRight"); pg.wait_for_timeout(120)
    check("pijl → volgende", pg.locator("#main .adp-qnum").text_content().startswith("Vraag 2"))
    pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
    check("Esc sluit presenteermodus", pg.locator(".adp-quiz.fs").count() == 0)
    E("Prefs.set('beamer', true)"); App = None
    pg.wait_for_timeout(150); E("App.render()"); pg.wait_for_timeout(150); shot("quiz-beamer")
    E("Prefs.set('beamer', false)"); E("App.render()")

    # ---------- Quiz: vragenbank (WP7) ----------
    THEMES = E("CATALOG.adoption.quizThemes.map(t=>t.key)")
    for preset in ["generic", "zorg", "overheid", "empty"]:
        load(preset)
        r = E("""() => { const b = AdoptKit.quizBank(S()); const ids = b.map(q=>q.id);
          return { n: b.length, dup: ids.filter((x,i)=>ids.indexOf(x)!==i),
            badOpt: b.filter(q => q.opts.length < 3 || q.opts.some(o => !String(o.t||'').trim() || String(o.why||'').trim().length < 6)).map(q=>q.id),
            badOk: b.filter(q => q.opts.filter(o=>o.ok).length !== 1).map(q=>q.id),
            dupOpt: b.filter(q => new Set(q.opts.map(o=>o.t)).size !== q.opts.length).map(q=>q.id),
            noMore: b.filter(q => !String(q.more||'').trim()).map(q=>q.id),
            per: Object.fromEntries(CATALOG.adoption.quizThemes.map(t => [t.key, b.filter(q=>q.theme===t.key).length])),
            badTheme: b.filter(q => !CATALOG.adoption.quizThemes.some(t=>t.key===q.theme)).map(q=>q.id) }; }""")
        print(f"INFO {preset}: vragen per thema {r['per']} (totaal {r['n']})")
        check(f"{preset}: geen dubbele vraag-id's", not r["dup"], str(r["dup"]))
        check(f"{preset}: uitleg bij elk alternatief", not r["badOpt"], str(r["badOpt"]))
        check(f"{preset}: precies één juist antwoord", not r["badOk"], str(r["badOk"]))
        check(f"{preset}: geen dubbele alternatieven", not r["dupOpt"], str(r["dupOpt"]))
        check(f"{preset}: ‘Meer uitleg’ bij elke vraag", not r["noMore"], str(r["noMore"]))
        check(f"{preset}: thema's geldig", not r["badTheme"], str(r["badTheme"]))
        check(f"{preset}: elk thema ≥ {3 if preset == 'empty' else 5} vragen", all(v >= (3 if preset == "empty" else 5) for v in r["per"].values()), str(r["per"]))
    check("vaste vraag-id's uniek in catalogus", E("(() => { const a = CATALOG.adoption.quizStatic.map(q=>q.id); return a.length === new Set(a).size; })()"))

    # ---------- Quiz: elk thema volledig afspelen ----------
    load("overheid"); tab("quiz")
    for th in ["mix"] + THEMES:
        pg.locator(f'#main .adp-qth[data-k="{th}"]').click(); pg.wait_for_timeout(120)
        check(f"thema {th} gekozen", pg.locator(f'#main .adp-qth[data-k="{th}"]').get_attribute("aria-pressed") == "true")
        n = E("AdoptKit.quiz(S()).length")
        okn = 0
        for i in range(n):
            q = E(f"(() => {{ const q = AdoptKit.quiz(S())[{i}]; return {{ ok: q.opts.findIndex(o=>o.ok), len: q.opts.length, theme: q.theme }}; }})()")
            if th != "mix": check(f"{th} v{i+1} hoort bij thema", q["theme"] == th, q["theme"])
            pick = q["ok"] if i % 3 != 1 else (q["ok"] + 1) % q["len"]
            okn += 1 if i % 3 != 1 else 0
            pg.locator(f'#main .adp-quiz .adp-opt[data-o="{pick}"]').click(); pg.wait_for_timeout(60)
            nwhy = pg.locator("#main .adp-quiz .adp-owhy").count()
            check(f"{th} v{i+1} uitleg na antwoord", pg.locator("#main .adp-fb").count() == 1 and nwhy == q["len"], f"{nwhy}/{q['len']}")
            pg.locator('#main [data-action="adp-qn"]').click(); pg.wait_for_timeout(60)
        res = pg.locator("#main .adp-qres").inner_text()
        check(f"{th}: score {okn} van {n}", f"{okn} van de {n}" in res, res[:80])
    shot("quiz-theme-result", True)
    E("UI.adpQuizTheme='mix'; UI.adpQuiz=null; App.render()")

    # ---------- LAB: volledig met toetsenbord, bekend patroon ----------
    def focus_info():
        return E("""(() => { const a = document.activeElement; if (!a) return {}; const cs = getComputedStyle(a);
          return { act: a.dataset ? a.dataset.action || '' : '', o: a.dataset ? a.dataset.o || '' : '', id: a.id || '', lab: !!a.closest('.adp-lab'),
            vis: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 && a.matches(':focus-visible') }; })()""")
    for preset in ["zorg", "empty"]:
        load(preset); E("UI.adpLab = null"); tab("lab")
        n = E("AdoptKit.lab(S()).steps.length")
        check(f"{preset}: LAB heeft 6 stappen", n == 6, str(n))
        E("document.activeElement && document.activeElement.blur()")
        pg.locator("#main .adp-pane").click(position={"x": 2, "y": 2}); pg.wait_for_timeout(50)
        for _ in range(80):
            f = focus_info()
            if f.get("act") == "adp-lab-a": break
            pg.keyboard.press("Tab")
        f = focus_info()
        check(f"{preset}: LAB-optie bereikbaar met Tab", f.get("act") == "adp-lab-a" and f.get("o") == "0", str(f))
        check(f"{preset}: zichtbare focus op optie", f.get("vis"), str(f))
        good = 0
        for i in range(n):
            st = pg.locator("#main .adp-lstep").inner_text()
            check(f"{preset}: voortgang ‘Stap {i+1} van {n}’", st.strip() == f"Stap {i+1} van {n}", st)
            ok = E(f"AdoptKit.lab(S()).steps[{i}].opts.findIndex(o=>o.ok)")
            length = E(f"AdoptKit.lab(S()).steps[{i}].opts.length")
            target = ok if i % 2 == 0 else (ok + 1) % length
            good += 1 if i % 2 == 0 else 0
            f = focus_info()
            check(f"{preset}: stap {i+1} focus op eerste optie", f.get("act") == "adp-lab-a" and f.get("o") == "0", str(f))
            for _ in range(target): pg.keyboard.press("Tab")
            f = focus_info()
            check(f"{preset}: stap {i+1} optie {target} met Tab + zichtbaar", f.get("o") == str(target) and f.get("vis"), str(f))
            pg.keyboard.press("Enter"); pg.wait_for_timeout(80)
            fb = pg.locator("#main .adp-lab .adp-fb")
            check(f"{preset}: stap {i+1} directe feedback", fb.count() == 1 and ("ok" in fb.get_attribute("class")) == (i % 2 == 0) and pg.locator("#main .adp-lab .adp-owhy").count() == length)
            f = focus_info()
            check(f"{preset}: stap {i+1} focus op ‘Volgende’", f.get("act") == "adp-lab-n" and f.get("vis"), str(f))
            if preset == "zorg" and i == 2: shot("lab-step3")
            pg.keyboard.press("Enter"); pg.wait_for_timeout(80)
        res = pg.locator("#main .adp-lres").inner_text()
        check(f"{preset}: LAB-score {good} van {n} met duiding", f"{good} van de {n} stappen goed" in res and "Deels" in res, res[:120])
        check(f"{preset}: LAB-voortgang op 100%", E("document.querySelector('#main .adp-lbar').getAttribute('aria-valuenow')") == str(n))
        f = focus_info()
        check(f"{preset}: focus op resultaat", f.get("id") == "adp-lres-h", str(f))
        if preset == "zorg": shot("lab-result", True)
        for _ in range(10):
            pg.keyboard.press("Tab")
            if focus_info().get("act") == "adp-lab-r" and E("!!document.activeElement.closest('.adp-lres')"): break
        pg.keyboard.press("Enter"); pg.wait_for_timeout(100)
        check(f"{preset}: ‘Opnieuw beginnen’ met toetsenbord", pg.locator("#main .adp-lstep").inner_text().strip() == f"Stap 1 van {n}" and pg.locator("#main .adp-lab .adp-fb").count() == 0)
    # LAB volgt het ontwerp: ander label/regel → andere uitkomst
    load("zorg")
    lab_lbl = E("AdoptKit.full(AdoptKit.lab(S()).label, S())")
    tab("lab")
    check("LAB toont label uit ontwerp", lab_lbl in pg.locator("#main .adp-lab-h").inner_text(), lab_lbl)
    def lab_down(): return E("AdoptKit.lab(S()).steps.find(s=>s.id==='downgrade').opts.find(o=>o.ok).t")
    E("Store.update(s => { (s.labelPolicies || []).forEach(p => { if (p.settings) p.settings.justification = false; }); })")
    j1 = lab_down()
    E("Store.update(s => { (s.labelPolicies || []).forEach(p => { if (p.settings) p.settings.justification = true; }); })")
    j2 = lab_down()
    check("LAB volgt labelbeleid (reden bij verlagen)", "zonder vragen" in j1 and "korte reden" in j2, f"{j1} / {j2}")
    # state alleen in UI, niet in het model/export
    check("LAB/quiz-state niet in model", all(k not in E("JSON.stringify(S())") for k in ["adpLab", "adpQuiz"]))

    # ---------- Rustige weergave + beamer ----------
    load("zorg"); E("UI.adpLab = null; Prefs.set('calm', true); App.render()"); tab("lab")
    pg.locator("#main .adp-lab .adp-opt").first.click(); pg.wait_for_timeout(80)
    an = E("getComputedStyle(document.querySelector('#main .adp-lab .adp-fb')).animationName")
    check("rustige weergave: geen animatie", an == "none", an)
    E("Prefs.set('calm', false); Prefs.set('beamer', true); App.render()"); pg.wait_for_timeout(120)
    fs_b = E("parseFloat(getComputedStyle(document.querySelector('#main .adp-lq')).fontSize)")
    E("Prefs.set('beamer', false); App.render()"); pg.wait_for_timeout(120)
    fs_n = E("parseFloat(getComputedStyle(document.querySelector('#main .adp-lq')).fontSize)")
    check("beamer: grotere LAB-vraag", fs_b > fs_n, f"{fs_b} > {fs_n}")

    # ---------- Geen horizontale overloop (900 en 1440) ----------
    OW = """(() => { const m=document.querySelector('#main'); const r=[...m.querySelectorAll('.adp-pane *')].filter(e=>e.getBoundingClientRect().right > m.getBoundingClientRect().right + 2 && !e.closest('.table-wrap') && getComputedStyle(e).position!=='fixed');
      return { sw: m.scrollWidth - m.clientWidth, els: r.slice(0,3).map(e=>e.className.baseVal!==undefined?e.className.baseVal:e.className) }; })()"""
    for w in [900, 1440]:
        pg.set_viewport_size({"width": w, "height": 900})
        for theme in ["light", "dark"]:
            E(f"Prefs.set('theme','{theme}')"); load("overheid", "Store.update(s=>{ s.meta.customer = 'Gemeente Met Een Hele Lange Naam Voor Een Overloop Test BV'; })")
            E("UI.adpQuiz=null; UI.adpLab=null"); tab("quiz")
            pg.locator("#main .adp-quiz .adp-opt").first.click(); pg.wait_for_timeout(60)
            E("document.querySelectorAll('#main details.adp-why').forEach(d=>d.open=true)")
            r = E(OW); check(f"{w}/{theme} quiz beantwoord: geen overloop", r["sw"] <= 1 and not r["els"], str(r))
            tab("lab")
            pg.locator("#main .adp-lab .adp-opt").first.click(); pg.wait_for_timeout(60)
            E("document.querySelectorAll('#main details.adp-why').forEach(d=>d.open=true)")
            r = E(OW); check(f"{w}/{theme} LAB-stap: geen overloop", r["sw"] <= 1 and not r["els"], str(r))
            if theme == "light": shot(f"lab-{w}", True)
            E("UI.adpLab.i = 6; App.render()"); pg.wait_for_timeout(60)
            r = E(OW); check(f"{w}/{theme} LAB-resultaat: geen overloop", r["sw"] <= 1 and not r["els"], str(r))
    pg.set_viewport_size({"width": 1440, "height": 900}); E("Prefs.set('theme','light')")

    # ---------- Meten ----------
    load("zorg"); tab("kpi")
    k = pg.locator("#main .adp-kpi").count()
    check("KPI-kaarten", k >= 6, str(k))
    check("KPI learn-links", pg.locator("#main .adp-kpi a[href^='https://learn.microsoft.com']").count() >= 5, str(pg.locator("#main .adp-kpi a[href^='https://learn.microsoft.com']").count()))
    kt = pg.locator("#main .adp-kpis").inner_text()
    check("KPI noemt portalen", all(s in kt for s in ["Activity explorer", "Content explorer", "DSPM"]), "")
    # Ronde 8b: meetplan (fasefilter, invulbaar per KPI, bewaard in het ontwerp)
    check("Meten: fasefilter met alle fasen", pg.locator("#main .adp-kf-b[data-k]").count() == E("ADOPT_PHASES.length") + 1)
    pg.locator('#main .adp-kpi[data-kpi="labeled"] .adp-kpi-on .switch').click(); pg.wait_for_timeout(200)
    check("Meten: In meetplan toont invulvelden", pg.locator('#main .adp-kpi[data-kpi="labeled"] input[data-bind="st:adoption.kpi.labeled.target"]').count() == 1 and E("S().adoption.kpi.labeled.on === true"))
    check("Meten: meetplan overleeft normalisatie", E("normalizeState(JSON.parse(JSON.stringify(S()))).adoption.kpi.labeled.on === true"))

    # ---------- Afdrukken (A4) ----------
    E("window.print = () => { window.__printed = (window.__printed||0) + 1; }")
    for preset in ["generic", "zorg", "overheid"]:
        load(preset); tab("tree")
        pg.locator('#main [data-action="adp-print"][data-what="tree"]').click(); pg.wait_for_timeout(200)
        check(f"{preset}: print spiekbrief vult #print-root", E("!!document.querySelector('#print-root .adp-print-tree .adp-sheet') && window.__printed > 0"))
        pg.emulate_media(media="print")
        pdf = pg.pdf(prefer_css_page_size=True, print_background=True)
        pages = len(re.findall(rb"/Type\s*/Page[^s]", pdf))
        check(f"{preset}: spiekbrief past op 1 A4", pages == 1, f"{pages} pagina's")
        if SHOTS: (SHOTS / f"spiekbrief-{preset}.pdf").write_bytes(pdf)
        pg.emulate_media(media="screen"); E("window.dispatchEvent(new Event('afterprint'))"); pg.wait_for_timeout(100)
        check(f"{preset}: print-root weer leeg", E("document.querySelector('#print-root').innerHTML.trim()===''"))
    load("zorg"); tab("cards")
    pg.locator('#main [data-action="adp-print"][data-what="cards"]').click(); pg.wait_for_timeout(200)
    check("print labelkaarten", E("document.querySelectorAll('#print-root .adp-lcard').length") == E("applicableLabels(S()).length"))
    pg.emulate_media(media="print"); pdf = pg.pdf(prefer_css_page_size=True, print_background=True)
    if SHOTS: (SHOTS / "labelkaarten-zorg.pdf").write_bytes(pdf)
    pg.emulate_media(media="screen"); E("window.dispatchEvent(new Event('afterprint'))"); pg.wait_for_timeout(100)
    E("Prefs.set('theme','dark')"); load("overheid"); tab("tree")
    pg.locator('#main [data-action="adp-print"][data-what="tree"]').click(); pg.wait_for_timeout(200)
    pg.emulate_media(media="print")
    bg = E("getComputedStyle(document.querySelector('#print-root .adp-sheet')).backgroundColor")
    check("print in donker thema: spiekbrief wit", bg in ("rgb(255, 255, 255)", "rgba(0, 0, 0, 0)"), bg)
    pg.emulate_media(media="screen"); E("window.dispatchEvent(new Event('afterprint'))"); E("Prefs.set('theme','light')")

    # ---------- Ontwerpdocument ----------
    load("zorg")
    h = E("DocExport.html(S())")
    check("document: spiekbrief-bijlage", "Spiekbrief: welk label kies ik?" in h and "adp-sheet" in h)
    check("document: labelkaarten-bijlage", "Labelkaarten" in h and "adp-lcard" in h)
    check("document: communicatie standaard uit", "Communicatiepakket" not in h)
    check("document: bestaande adoptiesectie", "Adoptie, impact &amp; communicatie" in h or "Adoptie, impact & communicatie" in h)
    E("Store.update(s=>{ s.adoption=s.adoption||{}; s.adoption.doc={comms:true, noTree:true}; })")
    h = E("DocExport.html(S())")
    check("document: communicatie aan, spiekbrief uit", "Communicatiepakket" in h and "adp-doc-text" in h and "Spiekbrief: welk label" not in h)
    tab("tree")
    check("toggle ‘In ontwerpdocument’ toont uit", not pg.locator('#main input[data-bind="st:adoption.doc.noTree"]').is_checked())
    pg.locator('#main .adp-doc-t .switch').click(); pg.wait_for_timeout(150)
    check("toggle zet spiekbrief weer aan", E("!S().adoption.doc.noTree") and "Spiekbrief: welk label" in E("DocExport.html(S())"))
    E("Store.update(s=>{ s.adoption.doc='kapot'; })")
    check("document robuust bij kapotte doc-optie", "adp-sheet" in E("DocExport.html(S())"))
    load("empty")
    check("document met leeg schema", "adp-sheet" not in E("DocExport.html(S())"))

    # ---------- Leeg schema ----------
    E("Prefs.set('theme','light')"); load("empty")
    for t in TABS:
        tab(t)
        bad = E(BAD)
        check(f"leeg/{t} netjes", pg.locator("#main .adp-pane").count() == 1 and not bad and (t in ("rollout", "kpi") or pg.locator("#main .adp-pane .empty, #main .adp-pane .msg, #main .adp-pane .btn").count() > 0), bad)
    shot("empty-tree")
    load("generic", "Store.update(s=>{ s.personas=[]; })"); tab("journey")
    check("geen persona's → lege staat", pg.locator("#main .adp-pane .empty").count() == 1)
    load("generic", "Store.update(s=>{ s.adoption={ notes:'x', phases:5, comms:'y', doc:[] }; })")
    for t in TABS:
        tab(t); check(f"rare adoption-state/{t}", pg.locator("#main .adp-pane").count() == 1 and not E(BAD))
    check("rare adoption-state document", len(E("DocExport.html(S())")) > 1000)

    # ---------- Smal 900 ----------
    pg.set_viewport_size({"width": 900, "height": 900})
    for theme in ["light", "dark"]:
        E(f"Prefs.set('theme','{theme}')"); load("zorg")
        for t in TABS:
            tab(t)
            ow = E("(() => { const m=document.querySelector('#main'); const r=[...m.querySelectorAll('.adp-pane *')].filter(e=>e.getBoundingClientRect().right > window.innerWidth + 2 && !e.closest('.table-wrap') && getComputedStyle(e).position!=='fixed'); return r.slice(0,3).map(e=>e.className.baseVal!==undefined?e.className.baseVal:e.className); })()")
            check(f"900/{theme}/{t} geen horizontale overloop", not ow, str(ow))
            if theme == "light" or t in ("tree", "quiz", "journey"): shot(f"narrow-{theme}-{t}", True)
    pg.set_viewport_size({"width": 1440, "height": 900}); E("Prefs.set('theme','light')")

    # ---------- r3c: "Werkt met" als primaire bediening van de persona-reis ----------
    for preset in ["generic", "zorg", "overheid"]:
        load(preset, "UI.adpPer=null; UI.adpPerLabel={}"); tab("journey")
        r = E("""(() => { const s = document.querySelector('#main .adp-lsel'); if (!s) return null; const b = s.getBoundingClientRect(), m = document.querySelector('#main .adp-mom');
          const g = s.querySelector('[role=radiogroup]'), lb = g && document.getElementById(g.getAttribute('aria-labelledby'));
          return { top: b.top, bottom: b.bottom, mom: m ? m.getBoundingClientRect().top : 9999, vh: innerHeight, lbl: lb ? lb.innerText.trim() : '', lblVis: !!(lb && lb.offsetParent),
            fs: parseFloat(getComputedStyle(s.querySelector('.adp-lsel-b')).fontSize), n: s.querySelectorAll('.adp-lsel-b').length, on: s.querySelectorAll('.adp-lsel-b[aria-checked=true]').length }; })()""")
        check(f"{preset}: ‘Werkt met’ zichtbaar boven de vouw en vóór de werkdag", bool(r) and r["bottom"] <= r["vh"] and r["bottom"] <= r["mom"] + 1, str(r))
        check(f"{preset}: ‘Werkt met’ heeft zichtbaar label", bool(r) and r["lblVis"] and "werkt met" in r["lbl"].lower(), str(r and r["lbl"]))
        check(f"{preset}: labelpillen ≥ 13px en precies één gekozen", bool(r) and r["fs"] >= 13 and r["on"] == 1 and r["n"] == E("applicableLabels(S()).length"), str(r))
        # muis
        pid = E("document.querySelector('#main select#adp-per-s').value")
        tgt = pg.locator("#main .adp-lsel-b[aria-checked=false]").nth(0)
        lid = tgt.get_attribute("data-l"); tgt.click(); pg.wait_for_timeout(200)
        check(f"{preset}: klik wisselt label in de reis", pg.locator("#main .adp-lsel-b[aria-checked=true]").get_attribute("data-l") == lid
              and E(f"AdoptKit.personaLabel(S().personas.find(p=>p.id==={pid!r}), S()).id") == lid
              and all(x == lid for x in E("[...document.querySelectorAll('#main .adp-mom [data-action=pv-open]')].map(b=>b.dataset.label)")))
        check(f"{preset}: focus blijft op gekozen pil", E("document.activeElement && document.activeElement.dataset.l") == lid)
        # toetsenbord
        n = pg.locator("#main .adp-lsel-b").count()
        i0 = E("[...document.querySelectorAll('#main .adp-lsel-b')].findIndex(b=>b.getAttribute('aria-checked')==='true')")
        pg.keyboard.press("ArrowRight"); pg.wait_for_timeout(200)
        i1 = E("[...document.querySelectorAll('#main .adp-lsel-b')].findIndex(b=>b.getAttribute('aria-checked')==='true')")
        f = E("(() => { const a = document.activeElement; return { l: a && a.dataset.l, vis: a && a.matches(':focus-visible'), tab: a && a.tabIndex }; })()")
        check(f"{preset}: pijl → volgend label + focus", i1 == (i0 + 1) % n and f["l"] == pg.locator("#main .adp-lsel-b").nth(i1).get_attribute("data-l") and f["tab"] == 0, f"{i0}->{i1} {f}")
        pg.keyboard.press("End"); pg.wait_for_timeout(200)
        check(f"{preset}: End → laatste label", E("[...document.querySelectorAll('#main .adp-lsel-b')].findIndex(b=>b.getAttribute('aria-checked')==='true')") == n - 1)
        pg.keyboard.press("ArrowLeft"); pg.wait_for_timeout(200)
        check(f"{preset}: pijl ← vorig label", E("[...document.querySelectorAll('#main .adp-lsel-b')].findIndex(b=>b.getAttribute('aria-checked')==='true')") == n - 2)
        check(f"{preset}: roving tabindex", E("[...document.querySelectorAll('#main .adp-lsel-b')].filter(b=>b.tabIndex===0).length") == 1)
        if preset == "zorg": shot("r3c-werkt-met")
    # veel labels → nette keuzelijst met zichtbaar label
    load("generic", "Store.update(s=>{ for (let i=0;i<4;i++) s.labels.push(newLabel('Extra label '+i,{color:'#336699'})); }); UI.adpPer=null; UI.adpPerLabel={}"); tab("journey")
    sel = pg.locator("#main .adp-lsel select#adp-lsel-s")
    check("veel labels: keuzelijst met <label for>", sel.count() == 1 and pg.locator('#main label[for="adp-lsel-s"]').is_visible() and "werkt met" in pg.locator('#main label[for="adp-lsel-s"]').inner_text().lower())
    if sel.count():
        v = sel.locator("option").last.get_attribute("value"); sel.select_option(v); pg.wait_for_timeout(200)
        check("veel labels: keuzelijst wisselt reis", pg.locator("#main .adp-lsel select").input_value() == v and E("document.activeElement && document.activeElement.id") == "adp-lsel-s")

    # ---------- r3c: labelnamen in Materiaal/spiekbrief netjes en leesbaar ----------
    LNPROBE = r"""() => {
      const LN = '.adp-chip b, .adp-sub b, .adp-dot, .adp-badge, .adp-lc-t h3, .adp-lc-p, .adp-ot, .adp-lab-lbl b, .sensitivity-pill, .adp-lsel-b, .adp-ln';
      const PILL = '.adp-chip, .adp-dot, .adp-badge, .adp-sub, .sensitivity-pill, .adp-lsel-b';
      const pane = document.querySelector('#main .adp-pane'); if (!pane) return { cut: ['geen pane'], mid: [], low: [], n: 0 };
      const vis = (e) => e.offsetParent && e.getClientRects().length;
      const els = [...pane.querySelectorAll(LN)].filter(vis);
      const titled = (e) => { const t = e.textContent.replace(/…$/, '').trim(); for (let x = e; x; x = x.parentElement) if (x.title && x.title.includes(t)) return true; return false; };
      const cut = els.filter(e => (e.scrollWidth > e.clientWidth + 1 || /…$/.test(e.textContent.trim())) && !titled(e)).map(e => e.className + ':' + e.textContent.trim().slice(0, 40));
      const mid = [];
      const midIn = (root, skipHyph) => { const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
        while ((n = w.nextNode())) { const el = n.parentElement; if (!el || !vis(el)) continue;
          if (skipHyph && (getComputedStyle(el).hyphens === 'auto' || el.closest('.wrap-any, code, pre, .ph-rb-label'))) continue;
          const re = /[A-Za-zÀ-ÿ]{6,}/g; let m;
          while ((m = re.exec(n.nodeValue))) { const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
            const rs = [...r.getClientRects()].filter(x => x.width > 0);
            if (rs.length > 1 && Math.abs(rs[0].top - rs[rs.length - 1].top) > 4) mid.push(m[0]); } } };
      els.forEach(e => midIn(e, false));
      midIn(pane, true);
      const parse = (s) => { let m = /rgba?\(([^)]+)\)/.exec(s); if (m) { const a = m[1].split(/[ ,\/]+/).filter(Boolean).map(parseFloat); return [a[0], a[1], a[2], a.length > 3 ? a[3] : 1]; }
        m = /color\(srgb ([^)]+)\)/.exec(s); if (m) { const a = m[1].split(/[ \/]+/).filter(Boolean).map(parseFloat); return [a[0] * 255, a[1] * 255, a[2] * 255, a.length > 3 ? a[3] : 1]; } return [0, 0, 0, 0]; };
      const bgOf = (e) => { const stack = []; for (let x = e; x; x = x.parentElement) { const c = parse(getComputedStyle(x).backgroundColor); if (c[3] > 0) { stack.push(c); if (c[3] >= 1) break; } }
        let r = [255, 255, 255]; for (let i = stack.length - 1; i >= 0; i--) { const c = stack[i]; r = [0, 1, 2].map(k => c[k] * c[3] + r[k] * (1 - c[3])); } return r; };
      const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
      const low = []; let np = 0;
      [...pane.querySelectorAll(PILL)].filter(vis).forEach(p => {
        [p, ...p.querySelectorAll('b, span')].filter(x => [...x.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim())).forEach(x => {
          np++; const fg = parse(getComputedStyle(x).color), bg = bgOf(x); const f = [0, 1, 2].map(k => fg[k] * fg[3] + bg[k] * (1 - fg[3]));
          const L1 = lum(f), L2 = lum(bg), cr = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
          if (cr < 4.5) low.push(x.className + ':' + x.textContent.trim().slice(0, 30) + ' ' + cr.toFixed(2)); }); });
      return { cut: cut.slice(0, 6), mid: [...new Set(mid)].slice(0, 6), low: low.slice(0, 6), n: els.length, np };
    }"""
    LONGNAME = "Strikt vertrouwelijk Bestuursdossiers 2026"
    VARIANTS = [("generic", ""), ("zorg", ""), ("overheid", ""),
                ("lang", f"Store.update(s=>{{ s.labels.filter(x=>x.parentId).slice(0,1).forEach(l=>{{ l.displayName=l.name={LONGNAME!r}; }}); }})"),
                ("geel", "Store.update(s=>{ s.labels.forEach((l,i)=>{ l.color = ['#FFF100','#FFFFFF','#FCE100','#000000'][i%4]; }); })")]
    for w in [1440, 900]:
        pg.set_viewport_size({"width": w, "height": 900})
        for theme in ["light", "dark"]:
            E(f"Prefs.set('theme','{theme}')")
            for name, extra in VARIANTS:
                if theme == "dark" and name in ("generic", "zorg"): continue
                load("overheid" if name in ("lang", "geel") else name, extra + "; UI.adpQuiz=null; UI.adpLab=null")
                agg = {"cut": [], "mid": [], "low": [], "n": 0, "np": 0}
                for t in ["journey", "tree", "cards", "comms", "quiz", "lab"]:
                    tab(t)
                    if t in ("quiz", "lab"):
                        pg.locator("#main .adp-opt").first.click(); pg.wait_for_timeout(60)
                    r = E(LNPROBE)
                    for k in ("cut", "mid", "low"): agg[k] += [f"{t}:{x}" for x in r[k]]
                    agg["n"] += r["n"]; agg["np"] += r["np"]
                check(f"{w}/{theme}/{name}: labelnamen niet afgekapt zonder title", not agg["cut"] and agg["n"] > 20, str(agg["cut"][:4]) + f" n={agg['n']}")
                check(f"{w}/{theme}/{name}: geen woordbreuk midden in een woord", not agg["mid"], str(agg["mid"][:4]))
                check(f"{w}/{theme}/{name}: contrast labelpillen ≥ 4.5:1", not agg["low"] and agg["np"] > 10, str(agg["low"][:4]) + f" np={agg['np']}")
    E("Prefs.set('theme','light')"); pg.set_viewport_size({"width": 1440, "height": 900})
    # Beamer: dezelfde controles op de spiekbrief en labelkaarten
    E("Prefs.set('beamer', true)")
    load("overheid", f"Store.update(s=>{{ s.labels.filter(x=>x.parentId).slice(0,1).forEach(l=>{{ l.displayName=l.name={LONGNAME!r}; }}); }})")
    for t in ["tree", "cards", "journey"]:
        tab(t); r = E(LNPROBE)
        check(f"beamer/{t}: labelnamen netjes", not r["cut"] and not r["mid"] and not r["low"], str(r))
    E("Prefs.set('beamer', false); App.render()")
    # Office-voorbeeld: labelpil in de titelbalk niet afgekapt
    tab("cards")
    pg.locator('#main .adp-lcard [data-action="pv-open"]').nth(2).click(); pg.wait_for_timeout(300)
    pill = E("(() => { const p = document.querySelector('.pv-sensbar .pv-pill'); return p ? { sw: p.scrollWidth, cw: p.clientWidth, txt: p.textContent, r: p.getBoundingClientRect().right, wr: p.closest('.pv-win').getBoundingClientRect().right } : null; })()")
    check("Office-voorbeeld: volledige labelnaam in titelbalk", bool(pill) and pill["sw"] <= pill["cw"] + 1 and pill["r"] <= pill["wr"] + 1 and LONGNAME in pill["txt"], str(pill))
    shot("r3c-pv-office")
    pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
    # Afdrukken: labelnamen in de spiekbrief ook in printweergave heel
    tab("tree")
    pg.locator('#main [data-action="adp-print"][data-what="tree"]').click(); pg.wait_for_timeout(200)
    pg.emulate_media(media="print")
    pm = E("""(() => { const out = []; document.querySelectorAll('#print-root .adp-chip b, #print-root .adp-sub b, #print-root .adp-dot').forEach(e => {
      if (e.scrollWidth > e.clientWidth + 1) out.push('cut:' + e.textContent); const n = e.firstChild && e.firstChild.nodeType === 3 ? e.firstChild : [...e.childNodes].find(x => x.nodeType === 3);
      if (!n) return; const re = /[A-Za-zÀ-ÿ]{6,}/g; let m; while ((m = re.exec(n.nodeValue))) { const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
        const rs = [...r.getClientRects()].filter(x => x.width > 0); if (rs.length > 1 && Math.abs(rs[0].top - rs[rs.length - 1].top) > 4) out.push('mid:' + m[0]); } }); return out; })()""")
    check("print spiekbrief: labelnamen heel", not pm, str(pm))
    pg.emulate_media(media="screen"); E("window.dispatchEvent(new Event('afterprint'))"); pg.wait_for_timeout(100)

    # ---------- r3c: geen overloop op 375 ----------
    pg.set_viewport_size({"width": 375, "height": 800})
    for theme in ["light", "dark"]:
        E(f"Prefs.set('theme','{theme}')"); load("overheid", f"Store.update(s=>{{ s.labels.filter(x=>x.parentId).slice(0,1).forEach(l=>{{ l.displayName=l.name={LONGNAME!r}; }}); }})")
        for t in TABS:
            tab(t)
            ow = E("(() => { const m=document.querySelector('#main'); const r=[...m.querySelectorAll('.adp-pane *')].filter(e=>e.getBoundingClientRect().right > window.innerWidth + 2 && !e.closest('.table-wrap') && getComputedStyle(e).position!=='fixed'); return { sw: document.documentElement.scrollWidth - innerWidth, els: r.slice(0,3).map(e=>e.className.baseVal!==undefined?e.className.baseVal:e.className) }; })()")
            check(f"375/{theme}/{t} geen horizontale overloop", ow["sw"] <= 1 and not ow["els"], str(ow))
            if theme == "light" and t in ("journey", "cards", "tree"): shot(f"r3c-375-{t}", True)
    pg.set_viewport_size({"width": 1440, "height": 900}); E("Prefs.set('theme','light')")

    # ---------- XSS ----------
    X = '<img src=x onerror="window.__xss=1">"><svg onload=window.__xss=1>'
    load("zorg", f"Store.update(s=>{{ s.labels.forEach(l=>{{ l.displayName=l.name={X!r}+l.name; l.tooltip={X!r}; l.audience={X!r}; }}); (s.personas||[]).forEach(p=>{{p.name={X!r}+p.name; p.desc={X!r};}}); s.meta.customer={X!r}; s.adoption={{comms:{{contact:{X!r}}}}}; }})")
    for t in TABS:
        tab(t)
        if t in ("quiz", "lab"):
            pg.locator("#main .adp-opt").first.click(); pg.wait_for_timeout(80)
            E("document.querySelectorAll('#main details.adp-why').forEach(d=>d.open=true)")
    E("document.body.insertAdjacentHTML('beforeend','<div id=\"xd\"></div>'); document.getElementById('xd').innerHTML = DocExport.html(S());")
    pg.wait_for_timeout(200)
    E("document.getElementById('xd').remove()")
    tab("tree"); pg.locator('#main [data-action="adp-print"][data-what="tree"]').click(); pg.wait_for_timeout(150); E("window.dispatchEvent(new Event('afterprint'))")
    check("XSS voert niet uit", not E("window.__xss"), str(E("window.__xss")))
    check("XSS-tekst zichtbaar als tekst", "<img src=x" in E("AdoptKit.commText(S(),'mail')"))

    pg.wait_for_timeout(200)
    real = [e for e in errs if "favicon" not in e]
    check("0 console/page errors", not real, " | ".join(real[:5]))
    b.close()

print("FAILS", len(fails))
sys.exit(bool(fails))
for f in fails: print(" -", f)
