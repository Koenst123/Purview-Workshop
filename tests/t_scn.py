import os as _os, pathlib as _pl, tempfile as _tf
_TD = _pl.Path(__file__).resolve().parents[1]  # repo-root met src, Voorbeelden en de deliverable
_OUT = _os.environ.get("PYD_TEST_OUT") or _os.path.join(_tf.gettempdir(), "pyd-tests", _pl.Path(__file__).stem)
_os.makedirs(_OUT, exist_ok=True)
"""Ronde 5 – scn: ‘Bekijk het pad’ (Scenario’s). Gebruik: python t-scn.py app.html [screenshotmap]"""
import sys, pathlib, re
from playwright.sync_api import sync_playwright

HTML = sys.argv[1]
SHOTS = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else None
if SHOTS: SHOTS.mkdir(parents=True, exist_ok=True)
fails = []
def check(name, ok, info=""):
    print(("PASS " if ok else "FAIL ") + name + (f"  [{info}]" if info else ""))
    if not ok: fails.append(name)

XSS = '<img src=x onerror="window.__x=1">'
STAGES = ["actor", "detect", "label", "protect", "dlp", "outcome", "audit"]

SWEEP = r"""() => {
  const st = S(), out = { n: 0, bad: [], kinds: {}, status: {}, noStage: 0 };
  const rx = /undefined|NaN|\[object Object\]|kon niet worden gemaakt|null\b/;
  for (const r of ScnUI.results(st)) {
    out.n++;
    const k = r.scn.channel + (r.scn.content && r.scn.content.prompt ? '-prompt' : '');
    out.kinds[k] = (out.kinds[k] || 0) + 1;
    if ((r.steps || []).some((p) => !p.stage)) out.noStage++;
    let m;
    try { m = ScnPath.model(r, st); } catch (e) { out.bad.push(r.scn.id + ': model ' + e.message); continue; }
    if (m.length !== 7) out.bad.push(r.scn.id + ': ' + m.length + ' fasen');
    m.forEach((g, i) => {
      out.status[g.key + ':' + g.status] = (out.status[g.key + ':' + g.status] || 0) + 1;
      if (!g.sum || !g.mock) out.bad.push(r.scn.id + '/' + g.key + ': leeg');
      const words = String(g.sum).split(/\s+/).length;
      if (words > 5) out.bad.push(r.scn.id + '/' + g.key + ': samenvatting te lang: ' + g.sum);
      const txt = (g.sum + ' ' + (g.sub || '') + ' ' + g.explain + ' ' + g.mock + ' ' + JSON.stringify(g.tech)).replace(/<[^>]+>/g, ' ');
      const mm = txt.match(rx); if (mm) out.bad.push(r.scn.id + '/' + g.key + ': ' + mm[0] + ' … ' + txt.slice(Math.max(0, mm.index - 60), mm.index + 20));
      let h = ''; try { h = ScnPath.detailHtml(m, i); } catch (e) { out.bad.push(r.scn.id + '/' + g.key + ': detail ' + e.message); }
    });
  }
  return out;
}"""

def shot(pg, name):
    if SHOTS: pg.screenshot(path=str(SHOTS / f"{name}.png"))

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.clock.install()
    pg.set_default_timeout(6000)
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.on("dialog", lambda d: d.dismiss())
    pg.goto(pathlib.Path(HTML).as_uri()); pg.wait_for_timeout(500)
    E = pg.evaluate
    E("window.__x = undefined")

    def cur_idx():
        return E("""() => [...document.querySelectorAll('#modal-root .scnp-nbtn')].findIndex((b) => b.getAttribute('aria-current') === 'step')""")
    def n_current():
        return pg.locator('#modal-root .scnp-nbtn[aria-current="step"]').count()
    def stage_key():
        return E("() => (document.querySelector('#modal-root .scnp-live .scnp-detail') || {}).dataset?.stage || ''")
    def open_scn(sid):
        E("App.go('scenarios')"); pg.wait_for_timeout(120)
        btn = pg.locator(f'#main .scenario-card [data-action="scn-path"][data-id="{sid}"]')
        if btn.count():
            btn.first.click()
        else:
            E(f"ScnPath.open({sid!r})")
        pg.wait_for_timeout(200)
        return pg.locator("#modal-root .modal.scnp-modal").count() == 1

    def walk(tag, deep):
        """Loop alle fasen door met knoppen + toetsenbord en controleer render."""
        check(f"{tag}: 7 fase-knopen", pg.locator("#modal-root .scnp-pipe > li.scnp-node").count() == 7)
        check(f"{tag}: pipeline is lijst (ol)", E("() => document.querySelector('#modal-root .scnp-pipe').tagName") == "OL")
        check(f"{tag}: precies één aria-current", n_current() == 1 and cur_idx() == 0, f"{n_current()} idx {cur_idx()}")
        check(f"{tag}: detail aria-live polite", pg.locator('#modal-root .scnp-live[aria-live="polite"]').count() == 1)
        seen = []
        for i in range(7):
            k = stage_key(); seen.append(k)
            mock = pg.locator("#modal-root .scnp-live .scnp-mock").locator(".pv-scene, .pv-desk, .pv-scnone, .pv-site").count()
            expl = len((pg.locator("#modal-root .scnp-live .scnp-explain").inner_text() or "").strip())
            if not (mock >= 1 and expl > 20 and n_current() == 1 and cur_idx() == i):
                check(f"{tag}: fase {i} {k} render", False, f"mock {mock} expl {expl} cur {cur_idx()}")
            if deep and i < 6: pg.locator('#modal-root [data-action="scnp-next"]').click(); pg.wait_for_timeout(60)
            elif i < 6: E("ScnPath.step(1)"); pg.wait_for_timeout(30)
        check(f"{tag}: alle fasen bezocht", seen == STAGES, ",".join(seen))
        check(f"{tag}: Volgende uit op laatste fase", pg.locator('#modal-root [data-action="scnp-next"]').is_disabled())
        if deep:
            pg.locator('#modal-root [data-action="scnp-prev"]').click(); pg.wait_for_timeout(60)
            check(f"{tag}: Vorige", cur_idx() == 5, str(cur_idx()))
            pg.locator('#modal-root .scnp-nbtn[data-i="2"]').click(); pg.wait_for_timeout(60)
            check(f"{tag}: klik op knoop", cur_idx() == 2 and stage_key() == "label")
            pg.keyboard.press("ArrowRight"); pg.wait_for_timeout(60)
            check(f"{tag}: pijl rechts", cur_idx() == 3, str(cur_idx()))
            check(f"{tag}: focus blijft op actieve knoop", E("() => document.activeElement && document.activeElement.getAttribute('aria-current')") == "step")
            pg.keyboard.press("ArrowLeft"); pg.keyboard.press("ArrowLeft"); pg.wait_for_timeout(60)
            check(f"{tag}: pijl links", cur_idx() == 1, str(cur_idx()))
            pg.keyboard.press("End"); pg.wait_for_timeout(60)
            check(f"{tag}: End", cur_idx() == 6)
            pg.keyboard.press("Home"); pg.wait_for_timeout(60)
            check(f"{tag}: Home", cur_idx() == 0)
            # Technische details op DLP-fase
            pg.locator('#modal-root .scnp-nbtn[data-i="4"]').click(); pg.wait_for_timeout(60)
            t = pg.locator("#modal-root .scnp-live details.scnp-tech")
            if t.count():
                check(f"{tag}: technische details dicht", not E("() => document.querySelector('#modal-root .scnp-tech').open"))
                t.locator("summary").click(); pg.wait_for_timeout(60)
                check(f"{tag}: technische details open met Purview-termen", bool(re.search(r"Rule|Policy|Actions|Locatie|Encryption", t.inner_text())))
                t.locator("summary").click(); pg.wait_for_timeout(30)

    for preset in ["generic", "zorg", "overheid"]:
        E(f"Store.replace(buildPresetState('{preset}',{{customer:'Test BV'}}))"); pg.wait_for_timeout(150)
        E("UI.scnChannel = null; UI.scnPlayed = {}; App.go('scenarios')"); pg.wait_for_timeout(200)
        check(f"{preset}: geen padknop vóór afspelen", pg.locator('#main [data-action="scn-paths"]').count() == 0)
        g = E("() => ({ cards: document.querySelectorAll('#main .scn-card').length, n: ScnUI.results(S()).length, groups: document.querySelectorAll('#main .scn-group').length, chans: new Set(ScnUI.results(S()).map((r) => r.scn.channel)).size, more: document.querySelectorAll('#main [data-action=\"scn-more\"]').length })")
        check(f"{preset}: alle scenario's direct zichtbaar (geen paginering)", g["cards"] == g["n"] and g["more"] == 0, str(g))
        check(f"{preset}: gegroepeerd per kanaal", g["groups"] == g["chans"], str(g))
        vis = E("""() => { const cards = [...document.querySelectorAll('#main .scn-card')];
          return { n: cards.length,
            logo: cards.filter((c) => c.querySelector('.scn-band .scn-alogo')).length,
            sens: cards.filter((c) => /^Gevoeligheid: /.test(c.querySelector('.scn-band .scn-sens')?.getAttribute('aria-label') || '')).length,
            goal: cards.filter((c) => c.querySelector('.scn-ob.ob-goal')).length,
            spoil: document.querySelectorAll('#main .scn-card .scn-ob:not(.ob-goal)').length,
            h3: cards.filter((c) => c.querySelector('h3.scn-title')).length,
            seg: [...document.querySelectorAll('#main .scn-seg .scn-segbtn[data-action="scn-channel"]')].map((b) => [b.dataset.ch, !!b.querySelector('.scn-seglogo, .scn-segall'), b.getAttribute('aria-pressed')]),
            glogo: [...document.querySelectorAll('#main .scn-group')].every((x) => x.querySelector('.scn-ghead .scn-glogo')) }; }""")
        check(f"{preset}: app-logo op elke kaart", vis["logo"] == vis["n"], str(vis["logo"]))
        check(f"{preset}: gevoeligheid op elke kaart", vis["sens"] == vis["n"], str(vis["sens"]))
        check(f"{preset}: kaarttitel als kop (h3)", vis["h3"] == vis["n"], str(vis["h3"]))
        check(f"{preset}: vóór afspelen gewenst zichtbaar, uitkomst verborgen", vis["goal"] == vis["n"] and vis["spoil"] == 0, str((vis["goal"], vis["spoil"])))
        check(f"{preset}: kanaalfilter met logo per kanaal + ‘Alle’", len(vis["seg"]) == g["chans"] + 1 and all(x[1] for x in vis["seg"]) and vis["seg"][0][0] == "" and vis["seg"][0][2] == "true", str(vis["seg"]))
        check(f"{preset}: groepskop met app-logo", vis["glogo"])
        E("UI.scnChannel = 'exchange'; App.render()"); pg.wait_for_timeout(100)
        fe = E("() => ({ groups: [...document.querySelectorAll('#main .scn-group')].map((x) => x.dataset.ch), cards: document.querySelectorAll('#main .scn-card').length, n: ScnUI.filtered(S()).length })")
        check(f"{preset}: kanaalfilter toont één groep", fe["groups"] == ["exchange"] and fe["cards"] == fe["n"], str(fe))
        E("UI.scnChannel = null; App.render()"); pg.wait_for_timeout(100)
        r = E(SWEEP)
        check(f"{preset}: sweep alle scenario's", not r["bad"] and r["noStage"] == 0, f"{r['n']} scn {r['kinds']} {r['bad'][:5]}")
        print("   statussen:", dict(sorted(r["status"].items())))
        # predict → play → stamp blijft werken
        first = E("ScnUI.filtered(S())[0].scn.id")
        chip = pg.locator(f'#main [data-action="scn-predict"][data-id="{first}"]')
        if chip.count():
            chip.first.click(); pg.wait_for_timeout(100)
        pg.locator(f'#main [data-action="scn-play"][data-id="{first}"]').first.click(); pg.wait_for_timeout(1800)
        check(f"{preset}: na afspelen padknop op kaart", pg.locator(f'#main .scenario-card [data-action="scn-path"][data-id="{first}"]').count() == 1)
        check(f"{preset}: stempel/verdict intact", pg.locator(f'#main .scenario-card [data-action="scn-play"][data-id="{first}"]').count() == 1)
        # Speel alles af → ‘Bekijk de paden’
        E("Actions['scn-play-all']()"); pg.wait_for_timeout(300)
        hb = pg.locator('#main [data-action="scn-paths"]')
        check(f"{preset}: knop ‘Bekijk de paden’ na Speel alles af", hb.count() == 1)
        cards = pg.locator('#main .scenario-card [data-action="scn-path"]').count()
        check(f"{preset}: padknop op alle afgespeelde kaarten", cards >= 10, str(cards))
        tl = E("() => [...document.querySelectorAll('#main .scn-tally li b')].reduce((a, b) => a + Number(b.textContent), 0)")
        check(f"{preset}: telling dekt alle scenario's", tl == E("ScnUI.results(S()).length"), str(tl))
        ob = E("""() => { const st = S(), rs = ScnUI.results(st), bad = [];
          for (const r of rs) {
            const c = document.querySelector(`#main .scn-card[data-scn="${CSS.escape(r.scn.id)}"]`);
            if (!c) { bad.push(r.scn.id + ': geen kaart'); continue; }
            const want = r.uncertain ? 'ob-unsure' : 'ob-' + ScnUI.outcome(r);
            if (!c.querySelector('.scn-outrow .scn-ob.' + want)) bad.push(r.scn.id + ': badge ' + want);
            if (!!c.querySelector('.scn-ob.ob-enc') !== (!r.uncertain && ScnUI.encrypted(r))) bad.push(r.scn.id + ': versleuteld');
          }
          const dec = rs.filter((r) => !r.uncertain).length;
          const stat = Object.fromEntries([...document.querySelectorAll('#main .scn-stats .scn-stat')].map((li) => [[...li.classList].find((k) => k.startsWith('ob-')), Number(li.querySelector('b').textContent)]));
          return { bad, dec, stat, ring: getComputedStyle(document.querySelector('#main .scn-ring')).getPropertyValue('--p').trim() }; }""")
        check(f"{preset}: uitkomstbadge per kaart volgt de engine", not ob["bad"], str(ob["bad"][:4]))
        st_ = ob["stat"]
        check(f"{preset}: uitkomsttellers (geblokkeerd/melding/gaat door) dekken beslisbare scenario's", st_.get("ob-block", -1) + st_.get("ob-tip", 0) + st_.get("ob-pass", 0) == ob["dec"] and "ob-enc" in st_, str(ob))
        check(f"{preset}: score-ring toont percentage", ob["ring"] == str(E("ScnUI.scoreOf(ScnUI.filtered(S())).pct")), ob["ring"])
        if preset == "generic": shot(pg, "01-overzicht-generic")
        # Per soort scenario
        pick = E("""() => { const o = {}; for (const r of ScnUI.results(S())) { const s = r.scn, k = s.channel + (s.content && s.content.prompt ? '-prompt' : ''); if (!o[k]) o[k] = s.id; } return o; }""")
        want = ["exchange", "sharing", "teams", "endpoint", "copilot"]
        for k in want:
            check(f"{preset}: scenario met kanaal {k} aanwezig", k in pick, str(list(pick)))
        for k, sid in pick.items():
            deep = k in ("exchange", "copilot-prompt") or (preset == "generic")
            ok = open_scn(sid)
            check(f"{preset}/{k}: pad geopend", ok)
            if not ok: continue
            walk(f"{preset}/{k}", deep)
            # mockup per fase zoals beloofd
            E("ScnPath.go(4)"); pg.wait_for_timeout(60)
            dm = E("() => document.querySelector('#modal-root .scnp-live .scnp-mock').innerHTML")
            exp = {"exchange": "pv-outlook", "sharing": "pv-spo", "teams": "pv-teams", "endpoint": "pv-desk", "copilot": "pv-copilot", "copilot-prompt": "pv-copilot"}.get(k)
            if exp: check(f"{preset}/{k}: DLP-fase toont {exp}", exp in dm)
            if preset == "zorg" or k in ("exchange", "copilot-prompt", "endpoint"):
                shot(pg, f"10-{preset}-{k}-dlp")
            E("ScnPath.go(5)"); pg.wait_for_timeout(60)
            if preset == "generic": shot(pg, f"11-{preset}-{k}-uitkomst")
            pg.locator('#modal-root .modal-foot .btn.primary').click(); pg.wait_for_timeout(100)
            check(f"{preset}/{k}: sluiten", pg.locator("#modal-root .modal").count() == 0)

        # Header-knop + scenario-navigatie
        hb.click(); pg.wait_for_timeout(200)
        t1 = pg.locator("#modal-title").inner_text()
        pg.locator('#modal-root [data-action="scnp-scn"][data-d="1"]').click(); pg.wait_for_timeout(150)
        t2 = pg.locator("#modal-title").inner_text()
        check(f"{preset}: volgend scenario in pad-dialoog", t1 != t2 and cur_idx() == 0, f"{t1[:30]} → {t2[:30]}")
        check(f"{preset}: focus blijft in dialoog", E("() => !!document.activeElement.closest('#modal-root')"))
        pg.locator('#modal-root [data-action="scnp-scn"][data-d="-1"]').click(); pg.wait_for_timeout(150)
        check(f"{preset}: vorig scenario", pg.locator("#modal-title").inner_text() == t1)
        pg.keyboard.press("Escape"); pg.wait_for_timeout(100)
        check(f"{preset}: Escape sluit", pg.locator("#modal-root .modal").count() == 0)

    # ---------- Afspelen ----------
    check("standaard tempo 1,2 s", E("ScnPath.delay") == 1200)
    sid = E("ScnUI.results(S()).find((r) => r.scn.channel === 'exchange').scn.id")
    open_scn(sid)
    # Een snelle timer mag niet aflopen terwijl Playwright op een stabiele knop wacht.
    pg.clock.pause_at(E("Date.now() + 1000"))
    E("ScnPath.delay = 250")
    pg.locator('#modal-root [data-action="scnp-play"]').click()
    check("afspelen: aria-pressed true", pg.locator('#modal-root [data-action="scnp-play"]').get_attribute("aria-pressed") == "true")
    pg.clock.run_for(250)
    mid = cur_idx()
    check("afspelen: gaat vanzelf verder", mid >= 1, str(mid))
    pg.clock.run_for(2200)
    last = E("() => { const n = [...document.querySelectorAll('#modal-root .scnp-node')]; let k = -1; n.forEach((x, i) => { if (!x.classList.contains('s-skip')) k = i; }); return k; }")
    check("afspelen: stopt op laatste fase", cur_idx() == last and pg.locator('#modal-root [data-action="scnp-play"]').get_attribute("aria-pressed") == "false", f"{cur_idx()} / {last}")
    pg.locator('#modal-root [data-action="scnp-play"]').click()
    check("afspelen: opnieuw begint vooraan", cur_idx() == 0)
    pg.locator('#modal-root [data-action="scnp-play"]').click()
    check("pauzeer", E("!(ScnPath.cur && ScnPath.cur.timer)"))
    paused = cur_idx()
    pg.clock.run_for(500)
    check("pauze houdt fase vast", cur_idx() == paused)
    pg.locator('#modal-root [data-action="scnp-play"]').click()
    pg.keyboard.press("Escape"); pg.clock.run_for(500)
    check("afspelen: timer stopt na sluiten", E("!(ScnPath.cur && ScnPath.cur.timer)") and pg.locator("#modal-root .modal").count() == 0)
    E("ScnPath.delay = 1200")
    pg.clock.resume()

    # ---------- Afdrukken ----------
    open_scn(sid)
    E("() => { window.__printed = 0; window.print = () => { window.__printed++; }; }")
    pg.locator("#modal-root .modal-foot .btn", has_text="Afdrukken").click(); pg.wait_for_timeout(250)
    check("afdrukken: print aangeroepen", E("window.__printed") == 1)
    check("afdrukken: dialoog blijft open", pg.locator("#modal-root .scnp-modal").count() == 1)
    check("afdrukken: alle fasen in #print-root", pg.locator("#print-root .scnp-print .scnp-pstage").count() == 7)
    check("afdrukken: geen svg/mockups", pg.locator("#print-root .scnp-print svg, #print-root .scnp-print .pv-win").count() == 0)
    E("window.dispatchEvent(new Event('afterprint'))"); pg.wait_for_timeout(50)
    check("afdrukken: opgeruimd", E("document.getElementById('print-root').innerHTML") == "")
    pg.keyboard.press("Escape"); pg.wait_for_timeout(100)

    # ---------- Technische details uit (Instellingen) ----------
    E("Prefs.set('showTech', false)"); pg.wait_for_timeout(100)
    open_scn(sid); E("ScnPath.go(4)"); pg.wait_for_timeout(60)
    th = E("() => ({ tech: [...document.querySelectorAll('#modal-root .scnp-tech')].filter((x) => x.offsetParent !== null).length, txt: (document.querySelector('#modal-root .scnp-explain') || {}).innerText || '' })")
    check("showTech uit: technische details verborgen", th["tech"] == 0, str(th["tech"]))
    check("showTech uit: uitleg blijft zichtbaar", len(th["txt"].strip()) > 20)
    pg.keyboard.press("Escape"); pg.wait_for_timeout(100)
    empty = E("() => [...document.querySelectorAll('#main .scn-card')].filter((x) => x.textContent.trim().length < 20).length")
    check("showTech uit: geen lege scenariokaarten", empty == 0, str(empty))
    E("Prefs.set('showTech', true)"); pg.wait_for_timeout(100)

    # ---------- Uitkomst volgt de invoer + onzeker ----------
    E("Store.replace(buildPresetState('generic',{customer:'Test BV'}))"); pg.wait_for_timeout(150)
    io = E("""() => { const id = 'sc-mail-contract-partner', ls = applicableLabels(S());
      const res = () => ScenarioEngine.all(S()).find((x) => x.scn.id === id);
      const setLbl = (l) => Store.update((t) => { t.scenarioResults[id] = { labelId: l.id }; });
      setLbl(ls[0]); const lo = ScnUI.outcome(res());
      setLbl(ls[ls.length - 1]); const hi = ScnUI.outcome(res());
      const l = ls.find((x) => x.cfg.encryption.mode === 'none' && x.cfg.dlp && x.cfg.dlp.exchange);
      const act = (a) => { Store.update((t) => { t.scenarioResults[id] = { labelId: l.id }; t.labels.find((y) => y.id === l.id).cfg.dlp.exchange = { action: a, scope: 'external' }; }); return ScnUI.outcome(res()); };
      return { lo, hi, off: act('off'), block: act('block'), sig: res().signal };
    }""")
    check("invoer: ander label → andere uitkomst", io["lo"] != io["hi"], str(io))
    check("invoer: DLP-actie van label → andere uitkomst", io["off"] != io["block"] and io["block"] == "block", str(io))
    check("invoer: gekozen label als signaal", io["sig"] == "chosen", str(io))
    un = E("""() => { Store.update((t) => { t.customScenarios.push({ id: 'csc-unsure', sector: 'all', icon: 'mail', title: 'Memo', persona: '', story: 'Een memo.', channel: 'exchange', recipient: 'external',
        content: { hint: [], sens: 1, sits: [], unlabeled: false }, expect: { min: 1, text: 'Test.' }, custom: true }); });
      const r = ScenarioEngine.all(S()).find((x) => x.scn.id === 'csc-unsure'), sc = ScenarioEngine.score(S());
      return { u: r.uncertain, sig: r.signal, warn: r.steps.some((s) => /Onzeker/.test(s.text)), excl: sc.uncertain, total: sc.total, n: ScenarioEngine.all(S()).length - sc.ambiguous }; }""")
    check("onzeker: geen label en geen signaal", un["u"] is True and un["sig"] == "none" and un["warn"], str(un))
    check("onzeker: telt niet mee in score", un["excl"] >= 1 and un["total"] == un["n"] - un["excl"], str(un))
    E("UI.scnChannel = null; UI.scnPlayed = { 'csc-unsure': true }; App.go('scenarios')"); pg.wait_for_timeout(200)
    card = pg.locator('#main .scenario-card:has([data-id="csc-unsure"])')
    check("onzeker: kaart toont ‘Onzeker – niet gemodelleerd’", card.count() == 1 and "Onzeker" in card.inner_text() and "niet gemodelleerd" in card.inner_text())
    check("onzeker: kaart toont invoer (label, locatie)", card.locator(".scn-inputs").count() == 1 and "Locatie" in card.locator(".scn-inputs").inner_text())
    if open_scn("csc-unsure"):
        check("onzeker: pad toont invoer", pg.locator("#modal-root .scn-inputs").count() >= 1)
        E("ScnPath.go(5)"); pg.wait_for_timeout(60)
        check("onzeker: uitkomstfase ‘Onzeker’", "Onzeker" in pg.locator("#modal-root .scnp-live").inner_text())
        pg.keyboard.press("Escape"); pg.wait_for_timeout(100)
    else: check("onzeker: pad geopend", False)
    lab = E("""() => { const l = applicableLabels(S())[0]; Store.update((t) => { t.scenarioResults['csc-unsure'] = { labelId: l.id }; });
      const r = ScenarioEngine.all(S()).find((x) => x.scn.id === 'csc-unsure'); return [r.uncertain, r.signal]; }""")
    check("onzeker: label kiezen maakt uitkomst beslisbaar", lab == [False, "chosen"], str(lab))

    # ---------- Eigen scenario + XSS ----------
    E("Store.replace(buildPresetState('zorg',{customer:'Test BV'}))"); pg.wait_for_timeout(150)
    E(f"""Store.update((st) => {{ const l = applicableLabels(st).find((x) => x.cfg.encryption.mode !== 'none') || st.labels[0]; l.name = {XSS!r}; l.displayName = {XSS!r}; }})"""); pg.wait_for_timeout(150)
    E("UI.scnChannel = null; App.go('scenarios')"); pg.wait_for_timeout(200)
    E("Actions['scn-custom-add']()"); pg.wait_for_timeout(200)
    pg.fill("#csc-title", "Eigen " + XSS)
    pg.fill("#csc-persona", "Inkoper " + XSS)
    pg.fill("#csc-story", "Stuurt een overzicht met BSN " + XSS)
    pg.select_option("#csc-channel", "exchange")
    sits = pg.locator('#modal-root input[name="csc-sit"]')
    for i in range(min(2, sits.count())): sits.nth(i).check()
    lab = E("""() => { const o = [...document.querySelectorAll('#csc-label option')].find((x) => /onerror/.test(x.textContent)); return o ? o.value : ''; }""")
    if lab: pg.select_option("#csc-label", lab)
    pg.locator("#modal-root .modal-foot .btn.primary").click(); pg.wait_for_timeout(250)
    csid = E("(S().customScenarios || []).slice(-1)[0]?.id")
    check("eigen scenario aangemaakt", bool(csid), str(csid))
    pg.locator(f'#main [data-action="scn-play"][data-id="{csid}"]').first.click(); pg.wait_for_timeout(1600)
    ok = open_scn(csid)
    check("eigen scenario: pad geopend", ok)
    if ok:
        walk("eigen scenario", True)
        txt = pg.locator("#modal-root .modal").inner_text()
        check("eigen scenario: payload als tekst zichtbaar", "onerror" in pg.locator("#modal-title").inner_text())
        for i in range(7):
            E(f"ScnPath.go({i})"); pg.wait_for_timeout(40)
            if E("document.querySelectorAll('#modal-root img[src=\"x\"]').length"): check(f"XSS: img-element in fase {i}", False)
            if i == 2: shot(pg, "20-eigen-label-xss")
        tech = pg.locator("#modal-root .scnp-tech")
        if tech.count(): tech.locator("summary").click(); pg.wait_for_timeout(50)
        E("() => { window.print = () => {}; }")
        pg.locator("#modal-root .modal-foot .btn", has_text="Afdrukken").click(); pg.wait_for_timeout(200)
        check("XSS: geen img in printversie", E("document.querySelectorAll('#print-root img[src=\"x\"]').length") == 0)
        E("window.dispatchEvent(new Event('afterprint'))")
        # copilot-variant van eigen scenario
        pg.keyboard.press("Escape"); pg.wait_for_timeout(100)
        E(f"Actions['scn-custom-edit']({{ dataset: {{ id: {csid!r} }} }})"); pg.wait_for_timeout(200)
        pg.select_option("#csc-channel", "copilot"); pg.fill("#csc-prompt", "Maak een brief " + XSS)
        pg.locator("#modal-root .modal-foot .btn.primary").click(); pg.wait_for_timeout(250)
        E(f"UI.scnPlayed = {{ ...(UI.scnPlayed || {{}}), [{csid!r}]: true }}; App.render()"); pg.wait_for_timeout(150)
        open_scn(csid); walk("eigen copilot-prompt", False)
        E("ScnPath.go(0)"); pg.wait_for_timeout(60)
        check("eigen copilot-prompt: prompt in mockup", "Maak een brief" in pg.locator("#modal-root .scnp-mock").inner_text())
        pg.keyboard.press("Escape"); pg.wait_for_timeout(100)
    check("XSS: payload niet uitgevoerd", E("window.__x") is None)

    # ---------- Thema's en smal scherm ----------
    E("Store.replace(buildPresetState('generic',{customer:'Test BV'}))"); pg.wait_for_timeout(150)
    E("UI.scnChannel = null; App.go('scenarios'); Actions['scn-play-all']()"); pg.wait_for_timeout(300)
    sid = E("ScnUI.results(S()).find((r) => r.scn.channel === 'exchange' && r.lv >= 3)?.scn.id || ScnUI.results(S())[0].scn.id")
    for theme in ["light", "dark"]:
        E(f"Prefs.set('theme','{theme}')"); pg.wait_for_timeout(150)
        for w in [1440, 900]:
            pg.set_viewport_size({"width": w, "height": 900}); pg.wait_for_timeout(150)
            open_scn(sid)
            E("ScnPath.go(4)"); pg.wait_for_timeout(80)
            ov = E("() => { const m = document.querySelector('#modal-root .modal'); const r = m.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right), innerWidth]; }")
            check(f"{theme} {w}px: dialoog past in beeld", ov[0] >= 0 and ov[1] <= ov[2], str(ov))
            hs = E("() => { const b = document.querySelector('#modal-root .modal-body'); return b.scrollWidth - b.clientWidth; }")
            check(f"{theme} {w}px: geen horizontale scroll in body", hs <= 2, str(hs))
            pv = E("() => { const p = document.querySelector('#modal-root .scnp-pipe'); const a = p.querySelector('li').getBoundingClientRect(), z = p.querySelector('li:last-child').getBoundingClientRect(); return [Math.round(a.top), Math.round(z.top), p.scrollWidth - p.clientWidth]; }")
            check(f"{theme} {w}px: pipeline op één rij", pv[0] == pv[1], str(pv))
            col = E("() => getComputedStyle(document.querySelector('#modal-root .scnp-node.on .scnp-ico')).borderTopColor")
            check(f"{theme} {w}px: statuskleur zichtbaar", col not in ("rgba(0, 0, 0, 0)", ""), col)
            shot(pg, f"30-{theme}-{w}-dlp")
            E("ScnPath.go(0)"); pg.wait_for_timeout(80); shot(pg, f"31-{theme}-{w}-medewerker")
            E("ScnPath.go(6)"); pg.wait_for_timeout(80); shot(pg, f"32-{theme}-{w}-audit")
            pg.keyboard.press("Escape"); pg.wait_for_timeout(100)
    E("Prefs.set('theme','light')")
    pg.set_viewport_size({"width": 1440, "height": 900})

    # ---------- Reduced motion ----------
    pg.emulate_media(reduced_motion="reduce")
    open_scn(sid); E("ScnPath.go(3)"); pg.wait_for_timeout(80)
    an = E("() => getComputedStyle(document.querySelector('#modal-root .scnp-detail')).animationName")
    check("reduced motion: geen animatie", an == "none", an)
    pg.keyboard.press("Escape")
    pg.emulate_media(reduced_motion="no-preference")

    # ---------- Leeg ontwerp ----------
    E("Store.replace(buildPresetState('empty',{customer:'Test BV'}))"); pg.wait_for_timeout(150)
    E("UI.scnPlayed = {}; App.go('scenarios')"); pg.wait_for_timeout(150)
    E("ScnPath.open(null)"); pg.wait_for_timeout(150)
    check("leeg: geen dialoog zonder afgespeelde scenario's", pg.locator("#modal-root .scnp-modal").count() == 0)
    r = E(SWEEP)
    check("leeg ontwerp: sweep (geen labels)", not r["bad"], str(r["bad"][:4]))
    E("ScnUI.results(S()).forEach((r) => (UI.scnPlayed[r.scn.id] = true)); App.render()"); pg.wait_for_timeout(150)
    E("ScnPath.open(null)"); pg.wait_for_timeout(150)
    if pg.locator("#modal-root .scnp-modal").count(): walk("leeg ontwerp", False); shot(pg, "40-leeg"); pg.keyboard.press("Escape")

    check("geen console-/paginafouten", not errs, " | ".join(errs[:5]))
    b.close()

print(f"FAILS {len(fails)}")
sys.exit(bool(fails))
for f in fails: print("  -", f)
