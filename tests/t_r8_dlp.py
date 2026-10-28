import os as _os, pathlib as _pl, tempfile as _tf
_OUT = _os.environ.get("PYD_TEST_OUT") or _os.path.join(_tf.gettempdir(), "pyd-tests", _pl.Path(__file__).stem)
_os.makedirs(_OUT, exist_ok=True)
# Ronde 8b: DLP-voorbeeld wisselt tussen alternatieven.
# Gebruik: python t_r8_dlp.py <app.html>
import sys, json, pathlib
from playwright.sync_api import sync_playwright

APP = sys.argv[1]
FAILS, ERRS = [], []


def ok(cond, msg):
    print(("PASS " if cond else "FAIL ") + msg)
    if not cond:
        FAILS.append(msg)


def page(b, w=1440, preset="generic", theme="light"):
    pg = b.new_page(viewport={"width": w, "height": 900})
    pg.on("pageerror", lambda e: ERRS.append(str(e)))
    pg.on("console", lambda m: ERRS.append(m.text) if m.type == "error" else None)
    pg.goto(pathlib.Path(APP).as_uri())
    pg.wait_for_function("typeof App !== 'undefined' && !!Store.state")
    pg.evaluate(f"() => {{ Store.replace(buildPresetState('{preset}', {{customer:'T'}})); Prefs.set('theme', '{theme}'); }}")
    pg.wait_for_timeout(150)
    return pg


def go(pg, route, sub=None):
    pg.evaluate(f"() => App.go({json.dumps(route)}{', ' + json.dumps(sub) if sub else ''})")
    pg.wait_for_timeout(250)


PV = "#main .dl-pv-tabs [role=tab]"


def tabs(pg, scope="#main"):
    return pg.evaluate(f"() => [...document.querySelectorAll('{scope} .dl-pv-tabs [role=tab]')].map(b => [b.dataset.pv, b.getAttribute('aria-selected')])")


def panel(pg, scope="#main"):
    return pg.evaluate(f"""() => {{ const p = document.querySelector('{scope} .dl-pv-panel'); if (!p) return null;
      const n = p.querySelector('.pv-notice'); return {{ cur: p.dataset.pvCur, app: n ? n.dataset.app : '', kind: n ? n.dataset.kind : '', html: p.innerHTML.length, text: p.textContent }}; }}""")


def overflow(pg):
    return pg.evaluate("""() => { const m = document.querySelector('#main'); const bad = [...m.querySelectorAll('.dl-pv-tabs, .dl-pv-tab, .dl-pv-panel')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > m.getBoundingClientRect().right + 1; }).length;
      return { doc: document.documentElement.scrollWidth > window.innerWidth + 1, main: m.scrollWidth > m.clientWidth + 1, bad }; }""")


def to_editor_with_locs(pg, locs):
    pg.evaluate("() => Actions['cdlp-add']({ dataset: { tpl: CATALOG.dlpTemplates.find(x => x.key !== 'custom').key } })")
    pg.wait_for_timeout(200)
    # Regel 2 van de template = ‘Block with override’.
    pg.evaluate(f"""() => {{ const id = UI.dlpEdit; Store.update(st => {{ const c = st.customDlp.find(x => x.id === id); c.locations = {json.dumps(locs)}; CdlpUI.prune(c); }});
        UI.dlpRule = 1; App.render(); }}""")
    pg.wait_for_timeout(250)


with sync_playwright() as p:
    b = p.chromium.launch()

    # 1) Maatwerk-editor: wisselaar toont exact de gekozen locaties en wisselt de mock-up.
    pg = page(b)
    go(pg, "dlp", "editor")
    to_editor_with_locs(pg, ["exchange", "sharepoint", "teams", "devices"])
    pg.evaluate("() => { document.querySelectorAll('#main details[data-acc=\"cdlp-ex\"]').forEach(d => d.open = true); }")
    t = tabs(pg)
    ok([x[0] for x in t] == ["exchange", "sharepoint", "teams", "devices"], f"Maatwerk: wisselaar = gekozen locaties {t}")
    ok([x[1] for x in t].count("true") == 1 and t[0][1] == "true", "Maatwerk: eerste locatie standaard geselecteerd")
    ok(pg.locator("#main .dl-pv-tabs[role=tablist]").count() == 1, "Maatwerk: role=tablist aanwezig")
    p0 = panel(pg)
    ok(p0 and p0["cur"] == "exchange" and p0["app"] == "outlook", f"Maatwerk: Exchange toont Outlook {p0 and p0['app']}")
    pg.locator(PV + "[data-pv=teams]").click(); pg.wait_for_timeout(200)
    p1 = panel(pg)
    ok(p1 and p1["cur"] == "teams" and p1["app"] == "teams", f"Maatwerk: wisselen naar Teams toont Teams-mock-up {p1 and p1['app']}")
    ok(pg.evaluate("() => S().customDlp.every(c => !('pv' in c))") and pg.evaluate("() => UI.dlpPv && Object.values(UI.dlpPv).includes('teams')"), "Maatwerk: keuze in UI-state, niet in het model")
    pg.locator(PV + "[data-pv=devices]").click(); pg.wait_for_timeout(200)
    p2 = panel(pg)
    ok(p2 and p2["cur"] == "devices" and "Windows-melding" in p2["text"] and p2["app"] != "outlook", f"Maatwerk: Devices toont geen Outlook maar Endpoint-uitleg (Windows-melding) {p2 and p2['app']}")
    pg.locator(PV + "[data-pv=sharepoint]").click(); pg.wait_for_timeout(200)
    p3 = panel(pg)
    ok(p3 and p3["app"] == "spo" and "webversie" in p3["text"], "Maatwerk: SharePoint toont SPO-mock-up met beperking webversie")

    # Toetsenbord: pijltjes verplaatsen focus, Enter activeert, focus blijft op de tab.
    pg.locator(PV + "[data-pv=sharepoint]").focus()
    pg.keyboard.press("ArrowRight"); pg.wait_for_timeout(80)
    ok(pg.evaluate("() => document.activeElement.dataset.pv") == "teams", "Toetsenbord: ArrowRight → volgende tab")
    pg.keyboard.press("Enter"); pg.wait_for_timeout(250)
    ok(panel(pg)["cur"] == "teams" and pg.evaluate("() => document.activeElement && document.activeElement.dataset.pv") == "teams", "Toetsenbord: Enter activeert en focus blijft op de tab")
    pg.keyboard.press("ArrowLeft"); pg.keyboard.press("ArrowLeft"); pg.wait_for_timeout(80)
    pg.keyboard.press(" "); pg.wait_for_timeout(250)
    ok(panel(pg)["cur"] == "exchange", "Toetsenbord: ArrowLeft + spatie selecteert Exchange")
    ok(pg.evaluate("() => [...document.querySelectorAll('#main .dl-pv-tabs [role=tab]')].filter(b => b.tabIndex === 0).length") == 1, "Toetsenbord: roving tabindex (één tab in tabvolgorde)")

    # Live: locatie bovenaan uitzetten werkt de wisselaar bij en valt terug op een geldig alternatief.
    pg.locator(PV + "[data-pv=teams]").click(); pg.wait_for_timeout(200)
    pg.locator('#main input[data-action="cdlp-loc"][data-loc="teams"]').click(); pg.wait_for_timeout(300)
    if pg.locator("#modal-root .modal").count():
        pg.locator("#modal-root .modal-foot .btn.primary, #modal-root .modal-foot .btn.danger").first.click(); pg.wait_for_timeout(250)
    t = tabs(pg)
    ok([x[0] for x in t] == ["exchange", "sharepoint", "devices"], f"Live: Teams uit → wisselaar zonder Teams {t}")
    ok(panel(pg)["cur"] in ("exchange", "sharepoint", "devices") and [x[1] for x in t].count("true") == 1, "Live: keuze valt terug op een geldig alternatief")
    pg.locator('#main input[data-action="cdlp-loc"][data-loc="onedrive"]').click(); pg.wait_for_timeout(300)
    t = tabs(pg)
    ok("onedrive" in [x[0] for x in t], f"Live: OneDrive aan → extra alternatief {t}")
    pg.locator(PV + "[data-pv=onedrive]").click(); pg.wait_for_timeout(200)
    ok(pg.evaluate("() => { const n = document.querySelector('#main .dl-pv-panel .pv-notice'); return !!n && /OneDrive/.test(n.textContent); }"), "Live: OneDrive-tab toont OneDrive-mock-up")

    # Precies één alternatief: geen wisselaar; nul: nette lege staat.
    pg.evaluate("() => { const id = UI.dlpEdit; Store.update(st => { st.customDlp.find(x => x.id === id).locations = ['exchange']; }); }"); pg.wait_for_timeout(250)
    ok(pg.locator("#main .dl-pv-tabs").count() == 0 and panel(pg) and panel(pg)["app"] == "outlook", "Eén locatie: geen wisselaar, wel het voorbeeld")
    pg.evaluate("() => { const id = UI.dlpEdit; Store.update(st => { st.customDlp.find(x => x.id === id).locations = []; }); }"); pg.wait_for_timeout(250)
    ok(pg.locator("#main .dl-pv-tabs").count() == 0 and pg.locator("#main .dl-pv-empty").count() == 1, "Nul locaties: lege staat zonder wisselaar")
    pg.close()

    # 2) Policies: Delen-policy wisselt tussen SharePoint en OneDrive; Copilot zonder wisselaar.
    pg = page(b)
    go(pg, "dlp", "policies")
    pid = pg.evaluate("() => Generator.all(S()).dlpPolicies.find(p => p.locations.includes('onedrive') && p.locations.includes('sharepoint') && !p.custom).id")
    pg.evaluate(f"() => {{ UI.dlpPol = {json.dumps(pid)}; App.render(); }}"); pg.wait_for_timeout(250)
    t = tabs(pg)
    ok([x[0] for x in t] == ["sharepoint", "onedrive"], f"Policies: Delen → SharePoint en OneDrive {t}")
    a = panel(pg)["text"]
    pg.locator(PV + "[data-pv=onedrive]").click(); pg.wait_for_timeout(200)
    ok(panel(pg)["cur"] == "onedrive" and panel(pg)["text"] != a, "Policies: wisselen verandert de mock-up")
    cid = pg.evaluate("() => Generator.all(S()).dlpPolicies.find(p => p.locations.length === 1 && p.locations[0] === 'copilot').id")
    pg.evaluate(f"() => {{ UI.dlpPol = {json.dumps(cid)}; App.render(); }}"); pg.wait_for_timeout(250)
    ok(pg.locator("#main .dl-pv-tabs").count() == 0 and panel(pg)["app"] == "copilot" and "Geen klassieke policy tip" in panel(pg)["text"], "Policies: Copilot zonder wisselaar, eerlijke uitleg")
    pg.close()

    # 3) Per label: wisselaar per actieniveau volgt de keuzes bovenaan.
    pg = page(b)
    go(pg, "dlp", "matrix")
    pg.evaluate("() => { UI.dlpDom = 'dlp_exchange'; App.render(); }"); pg.wait_for_timeout(200)
    acts = pg.evaluate("() => DLP_DOM_ACTIONS.exchange")
    # Zet twee labels op verschillende niveaus (policy tip en block) zodat er ≥2 alternatieven zijn.
    pg.evaluate("""() => { const ls = applicableLabels(S()); Store.update(st => { st.labels.forEach(l => { if (l.cfg.dlp.exchange) l.cfg.dlp.exchange.action = 'audit'; });
      const a = st.labels.find(l => l.id === ls[0].id), b = st.labels.find(l => l.id === ls[ls.length - 1].id);
      a.cfg.dlp.exchange = Object.assign(a.cfg.dlp.exchange || {}, { action: 'tip' }); a.cfg.notify.tip = true;
      b.cfg.dlp.exchange = Object.assign(b.cfg.dlp.exchange || {}, { action: 'block', scope: 'external' }); b.cfg.notify.override = 'none'; }); }""")
    pg.wait_for_timeout(300)
    t = tabs(pg)
    ids = [x[0] for x in t]
    ok(len(ids) >= 2 and ids[0] == "block" and "tip" in ids, f"Per label: wisselaar toont gekozen actieniveaus, strengste eerst {ids} (acties {acts})")
    k0 = panel(pg)["kind"]
    pg.locator(PV + "[data-pv=tip]").click(); pg.wait_for_timeout(200)
    k1 = panel(pg)["kind"]
    ok(k0 == "block" and k1 == "tip", f"Per label: wisselen verandert de melding ({k0} → {k1})")
    # Niveau bovenaan weghalen → wisselaar verdwijnt (één alternatief), keuze valt terug.
    pg.evaluate("""() => { const ls = applicableLabels(S()); Store.update(st => { st.labels.find(l => l.id === ls[0].id).cfg.dlp.exchange.action = 'audit'; }); }""")
    pg.wait_for_timeout(300)
    ok(pg.locator("#main .dl-pv-tabs").count() == 0 and panel(pg) and panel(pg)["kind"] == "block", "Per label: tip eraf → geen wisselaar, terugval op Block")

    # Overflow op 900 en 1440 in licht en donker.
    for w in (1440, 900):
        for theme in ("light", "dark"):
            pg.set_viewport_size({"width": w, "height": 900})
            pg.evaluate(f"() => {{ Prefs.set('theme', '{theme}'); App.render(); }}"); pg.wait_for_timeout(200)
            o = overflow(pg)
            ok(not o["doc"] and not o["bad"], f"Geen overflow per label {w}px {theme} {o}")
    pg.close()

    pg = page(b, w=900)
    go(pg, "dlp", "editor")
    to_editor_with_locs(pg, ["exchange", "sharepoint", "onedrive", "teams", "devices"])
    pg.evaluate("() => { document.querySelectorAll('#main details[data-acc=\"cdlp-ex\"]').forEach(d => d.open = true); }")
    for w in (900, 1440):
        pg.set_viewport_size({"width": w, "height": 900}); pg.wait_for_timeout(200)
        o = overflow(pg)
        ok(not o["doc"] and not o["bad"], f"Geen overflow maatwerk {w}px {o}")
    pg.close()
    b.close()

ok(not ERRS, f"geen JS-fouten {ERRS[:5]}")
print(f"\n{len(FAILS)} fouten")
sys.exit(1 if FAILS else 0)
