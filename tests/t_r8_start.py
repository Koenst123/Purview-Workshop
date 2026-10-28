import os as _os, pathlib as _pl, tempfile as _tf
_OUT = _os.environ.get("PYD_TEST_OUT") or _os.path.join(_tf.gettempdir(), "pyd-tests", _pl.Path(__file__).stem)
_os.makedirs(_OUT, exist_ok=True)
# Ronde 8/9: Start - eerste-gebruikservaring in drie stappen (UX-002) met altijd zichtbare routekaart.
# Gebruik: python t_r8_start.py <app.html>
import sys, json, pathlib
from playwright.sync_api import sync_playwright

APP = sys.argv[1]
FAILS, ERRS = [], []


def ok(cond, msg):
    print(("PASS " if cond else "FAIL ") + msg)
    if not cond:
        FAILS.append(msg)


def page(b, w=1440, preset=None, theme="light", beamer=False):
    """Zonder preset: een verse, lege start (eerste gebruik)."""
    pg = b.new_page(viewport={"width": w, "height": 900})
    pg.on("pageerror", lambda e: ERRS.append(str(e)))
    pg.on("console", lambda m: ERRS.append(m.text) if m.type == "error" else None)
    pg.goto(pathlib.Path(APP).as_uri())
    pg.wait_for_function("typeof App !== 'undefined' && !!Store.state")
    if preset:
        pg.evaluate(f"() => Store.replace(buildPresetState('{preset}', {{customer:'T'}}))")
    pg.evaluate(f"() => {{ Prefs.set('theme', '{theme}'); Prefs.set('beamer', {'true' if beamer else 'false'}); App.go('start'); App.render(); }}")
    pg.wait_for_timeout(200)
    return pg


def go(pg, route, sub=None):
    pg.evaluate(f"() => App.go({json.dumps(route)}{', ' + json.dumps(sub) if sub else ''})")
    pg.wait_for_timeout(250)


VIS = """(s) => { const e = document.querySelector(s); if (!e) return false; const p = e.parentElement; if (p && p.closest('details:not([open])') && !e.closest('summary')) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !!e.offsetParent; }"""
FOCUSABLE = """() => [...document.querySelectorAll('#main a[href], #main button, #main input, #main select, #main textarea, #main summary, #main [tabindex]:not([tabindex="-1"])')]
  .filter((e) => !e.disabled && e.getClientRects().length > 0 && !e.closest('details:not([open]) > :not(summary)')).length"""
OVER = """() => { const m = document.querySelector('#main'); return m.scrollWidth - m.clientWidth; }"""
BAD = r"""() => { const t = document.querySelector('#main').innerText; const m = t.match(/undefined|NaN|\[object Object\]|kon niet worden/); return m ? m[0] : ''; }"""
ACTIVE = "() => { const a = document.activeElement; return a ? (a.dataset.bind || a.id || a.dataset.action || a.tagName) : ''; }"


with sync_playwright() as p:
    b = p.chromium.launch()

    # ---------- 1. Lege state: alleen stap 1 ----------
    pg = page(b)
    E = pg.evaluate
    ok(E("() => !!document.querySelector('#main .start-page.is-first')"), "verse start toont de eerste-gebruikservaring")
    ok(E("() => document.querySelectorAll('#main .sf-steps > li').length") == 3, "stappenindicator met 3 stappen")
    cur = E("() => { const c = document.querySelector('#main .sf-steps [aria-current=\"step\"]'); return c ? c.textContent.trim() : ''; }")
    ok("Kies een vertrekpunt" in cur, f"stap 1 heeft aria-current=step ({cur!r})")
    ok(E("() => document.querySelectorAll('#main [aria-current=\"step\"]').length") == 1, "precies één huidige stap")
    ok(E("() => document.querySelectorAll('#main .sf-pick .preset-card').length") == 4, "stap 1 toont de vier vertrekpunten")
    fold = E("() => [...document.querySelectorAll('#main .sf-pick .preset-card')].every((c) => { const r = c.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; })")
    ok(fold, "alle vertrekpunten staan boven de vouw (1440x900)")
    ok(E("() => document.querySelectorAll('#main .btn.primary').length") == 0, "geen concurrerende primaire knoppen in de lege state")
    ok(not E("() => !!document.querySelector('#start-flow-2')"), "stap 2 nog niet zichtbaar vóór een keuze")
    ok(E(VIS, "#main .start-groups") and E("() => document.querySelectorAll('#main .start-groups .start-grp').length") == 4, "routekaart direct zichtbaar in lege state")
    ok(not E("() => !!document.querySelector('#main details[data-acc=\"start-route\"]')"), "geen 'Toon de hele route'-accordion meer")
    ok(not E(VIS, '#main details[data-acc="start-agenda"]'), "agenda standaard niet zichtbaar")
    ok(not E(VIS, '#main details[data-acc="start-preparation"]'), "workshopgegevens/deelnemers standaard niet zichtbaar")
    ok(not E(VIS, "#main .start-next"), "geen voortgangsblok in de lege state")
    nf = E(FOCUSABLE)
    ok(nf <= 45, f"focusbare elementen in #main in lege state: {nf} (max 45)")
    ok(E("() => !!document.querySelector('#main .start-context .preset-card[data-id=\"empty\"]')"), "'Leeg' blijft een vertrekpunt")

    # ---------- 2. Routekaart: architectuur als introductiestap direct na Start ----------
    ok(E("() => NAV[0].routes[0] === 'start' && NAV[0].routes[1] === 'architectuur'"), "menu: architectuur direct na Start")
    order = E("() => [...document.querySelectorAll('#main .start-groups > *')].map((e) => e.matches('.start-intro') ? e.dataset.route : e.querySelector('h2').textContent.trim())")
    ok(order[:2] == ["architectuur", "Know your Data"], f"routekaart: architectuur als introductiestap vóór Know your Data ({order[:3]})")
    ok(E("() => !document.querySelector('#main .start-grp [data-route=\"architectuur\"]')"), "architectuur niet onder een groep")
    ok(E("() => document.querySelector('#main .start-groups').compareDocumentPosition(document.querySelector('#main .sf-pick')) & Node.DOCUMENT_POSITION_PRECEDING"), "'Zo begin je' staat vóór de routekaart")
    ok(E("() => [...document.querySelectorAll('#main .start-grp-nr')].map((e) => e.textContent).join('')") == "1234", "onderdelen genummerd 1-4")

    # ---------- 3. Toetsenbord-only doorloop ----------
    E("() => document.querySelector('#main').focus()")
    hit = False
    for _ in range(20):
        pg.keyboard.press("Tab")
        if E("() => !!(document.activeElement && document.activeElement.matches('.preset-card[data-id=\"generic\"]'))"):
            hit = True; break
    ok(hit, "vertrekpunt 'Generiek' bereikbaar met Tab")
    pg.keyboard.press("Enter"); pg.wait_for_timeout(500)
    if pg.locator("#modal-root .btn.primary").count():
        FAILS.append("onverwachte vervangingsdialoog bij eerste keuze")
    ok(E("() => S().labels.length > 0 && UI.route === 'start'"), "Enter kiest het vertrekpunt en blijft op Start")
    ok(E(ACTIVE) == "st:meta.customer", f"focus naar klantnaam in stap 2 ({E(ACTIVE)!r})")
    ok(E(VIS, "#start-flow-2"), "stap 2 'Klant en scope' zichtbaar")
    cur = E("() => document.querySelector('#main .sf-steps [aria-current=\"step\"]').textContent")
    ok("Klant en scope" in cur, "stap 2 is nu de huidige stap")
    ok("Vul nu de klantnaam" in pg.inner_text("#toast-root"), "toast vraagt om de klantnaam")
    ok(E(VIS, "#main .start-groups"), "routekaart verschijnt na de keuze")
    ok(not E(VIS, '#main details[data-acc="start-preparation"]'), "geen dubbele gegevensvelden naast stap 2")
    ok(E("() => document.querySelectorAll('#main [data-bind=\"st:meta.customer\"]').length") == 1, "klantnaam staat één keer op de pagina")
    ok(E("() => !!document.querySelector('#start-flow-2 details[data-acc=\"start-flow-more\"]')"), "'Meer workshopgegevens' ingeklapt in stap 2")
    ok(E("() => !!document.querySelector('#start-flow-2 [data-action=\"part-add\"]') && !!document.querySelector('#start-flow-2 [data-bind=\"st:meta.goals\"]')"), "deelnemers en doelen bereikbaar via 'Meer workshopgegevens'")
    pg.keyboard.type("Voorbeeld BV"); pg.wait_for_timeout(300)
    ok(E("() => S().meta.customer") == "Voorbeeld BV", "klantnaam ingevuld via toetsenbord")
    ok(E(ACTIVE) == "st:meta.customer", "focus blijft in het veld tijdens typen")
    cur = E("() => document.querySelector('#main .sf-steps [aria-current=\"step\"]').textContent")
    ok("Ga verder" in cur, "na klantnaam is stap 3 de huidige stap")
    target = E("() => document.querySelector('#start-flow-go').dataset.route")
    ok(target == E("() => NAV_ROUTES.find((r) => r !== 'start')"), f"'Ga verder' wijst naar de eerste ontwerpstap ({target})")
    hit = False
    for _ in range(25):
        pg.keyboard.press("Tab")
        if E(ACTIVE) == "start-flow-go":
            hit = True; break
    ok(hit, "'Ga verder' bereikbaar met Tab vanuit stap 2")
    pg.keyboard.press("Enter"); pg.wait_for_timeout(300)
    ok(E("() => UI.route") == target, f"'Ga verder' opent {target}")
    go(pg, "start")
    ok(E("() => !!document.querySelector('#main .start-page.has-design') && !document.querySelector('#start-flow')"), "terug op Start: het volledige startscherm")
    ok(not ERRS, f"geen JS-fouten in de doorloop {ERRS[:3]}")
    pg.close()

    # ---------- 4. Stappenindicator, ander vertrekpunt en weg-navigeren ----------
    pg = page(b)
    E = pg.evaluate
    pg.locator('#main .preset-card[data-id="zorg"]').click(); pg.wait_for_timeout(400)
    ok(E("() => !!document.querySelector('#start-flow')"), "flow actief na klikken")
    pg.locator('#main .sf-steps button[data-step="3"]').click(); pg.wait_for_timeout(150)
    ok(E(ACTIVE) == "start-flow-go", "stap 3 in de indicator zet focus op 'Ga verder'")
    pg.locator('#main .sf-steps button[data-step="1"]').click(); pg.wait_for_timeout(150)
    ok(E("() => document.querySelector('#main details[data-acc=\"start-examples\"]').open && document.activeElement.matches('.preset-card.on[data-id=\"zorg\"]')"), "stap 1 opent 'Ander vertrekpunt' met focus op de huidige keuze")
    pg.locator('#main .preset-card[data-id="overheid"]').click(); pg.wait_for_timeout(300)
    if pg.locator("#modal-root .btn.primary").count():
        pg.locator("#modal-root .btn.primary").first.click(); pg.wait_for_timeout(400)
    ok(E("() => S().meta.preset === 'overheid' && !!document.querySelector('#start-flow')"), "ander vertrekpunt binnen de flow houdt de flow vast")
    go(pg, "board"); go(pg, "start")
    ok(E("() => !document.querySelector('#start-flow') && !!document.querySelector('#main #start-next')"), "weg-navigeren beëindigt de flow")
    E("() => Store.replace(createEmptyState())"); go(pg, "start")
    ok(E("() => !!document.querySelector('#main .start-page.is-first')"), "nieuw leeg ontwerp toont weer stap 1")
    pg.locator('#main .preset-card[data-id="empty"]').click(); pg.wait_for_timeout(400)
    ok(E("() => !!document.querySelector('#start-flow-2') && document.querySelector('#start-flow-go').dataset.route === 'schema'"), "'Leeg' gaat via stap 2 naar het classificatieschema")
    E("() => Store.undo()"); pg.wait_for_timeout(200)
    ok(E("() => !document.querySelector('#start-flow-2')"), "ongedaan maken verlaat de flow")
    ok(not E(BAD), "geen kapotte tekst")
    pg.close()

    # ---------- 5. Bestaand ontwerp: volledig startscherm ----------
    pg = page(b, preset="generic")
    E = pg.evaluate
    ok(E("() => !document.querySelector('#start-flow') && !document.querySelector('.start-page.is-first')"), "met ontwerp geen eerste-gebruiksflow")
    ok(E(VIS, "#main .start-groups") and E("() => document.querySelectorAll('#main .start-groups .start-grp').length") == 4, "met ontwerp: routekaart zichtbaar")
    ok(E(VIS, "#main #start-next") and E(VIS, "#main .start-lbls"), "met ontwerp: volgende stap en labeloverzicht")
    ok(E(VIS, "#main .start-intro[data-route=\"architectuur\"]") and E("() => !!document.querySelector('#main .start-intro .st')"), "met ontwerp: introductiestap met status")
    ok(E("() => document.querySelectorAll('#main .start-step-tag').length") <= 1, "met ontwerp: hooguit één 'Volgende'-markering")
    ok(E("() => !!document.querySelector('#main details[data-acc=\"start-preparation\"]') && !!document.querySelector('#main details[data-acc=\"start-agenda\"]') && !!document.querySelector('#main details[data-acc=\"start-examples\"]')"), "met ontwerp: gegevens, agenda en ander vertrekpunt blijven bereikbaar")
    prim = E("() => [...document.querySelectorAll('#main .btn.primary')].filter((e) => e.getClientRects().length).map((e) => e.closest('.start-next-acts') ? 'next' : 'other')")
    ok(prim == ["next"], f"'Ga verder' is de enige primaire knop met ontwerp ({prim})")
    ok(E("() => document.querySelector('#main .start-next-acts .btn.primary').getBoundingClientRect().bottom <= innerHeight"), "volgende stap boven de vouw")
    ok(not ERRS, f"geen JS-fouten {ERRS[:3]}")
    pg.close()

    # ---------- 6. Overflow: 375/900/1440/3440, licht/donker/beamer ----------
    for w in (375, 900, 1440, 3440):
        for theme, beamer in (("light", False), ("dark", False), ("light", True)):
            for state in ("first", "flow", "design"):
                pg = page(b, w=w, preset="generic" if state == "design" else None, theme=theme, beamer=beamer)
                if state == "flow":
                    pg.evaluate("() => Actions['preset']({dataset:{id:'generic'}})"); pg.wait_for_timeout(300)
                sw = pg.evaluate(OVER)
                ok(sw <= 1, f"geen overflow {state} {theme}{' beamer' if beamer else ''} {w}px ({sw})")
                if pg.evaluate(BAD):
                    FAILS.append(f"kapotte tekst {state} {w}")
                pg.close()

    # ---------- 7. Rustige weergave ----------
    pg = page(b)
    pg.evaluate("() => { Prefs.set('calm', true); Prefs.apply(); App.render(); }"); pg.wait_for_timeout(100)
    tr = pg.evaluate("() => getComputedStyle(document.querySelector('#main .preset-card')).transitionDuration")
    ok(all(float(x.rstrip('s')) < 0.01 for x in tr.split(',')), f"rustige weergave: geen overgangen op vertrekpunten ({tr})")
    pg.close()

    b.close()

ok(not ERRS, f"geen JS-fouten totaal {ERRS[:3]}")
print(f"\n{len(FAILS)} fout(en)")
for f in FAILS:
    print(" -", f)
sys.exit(1 if FAILS else 0)
