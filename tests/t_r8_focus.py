import os as _os, pathlib as _pl, tempfile as _tf
_OUT = _os.environ.get("PYD_TEST_OUT") or _os.path.join(_tf.gettempdir(), "pyd-tests", _pl.Path(__file__).stem)
_os.makedirs(_OUT, exist_ok=True)
# Ronde 8: toetsenbordfocus (audit A11Y-002). Volledige Tab- en Shift+Tab-cyclus per scherm,
# classificatie van niet-bereikte elementen, focusbehoud bij rerenders en drop-zones tijdens een pick.
# Gebruik: python t_r8_focus.py <app.html>
import sys, json, pathlib
from playwright.sync_api import sync_playwright

APP = sys.argv[1]
FAILS, ERRS = [], []
ROUTES = [("sits", None), ("board", None), ("policies", None), ("dlp", "matrix"), ("dlp", "policies"), ("dlp", "notify"), ("dlp", "editor"),
          ("copilot", None), ("export", None), ("labels", None), ("autolabel", None)]


def ok(cond, msg):
    print(("PASS " if cond else "FAIL ") + msg)
    if not cond:
        FAILS.append(msg)


def page(b, w=1440, preset="generic", theme="light"):
    pg = b.new_page(viewport={"width": w, "height": 900})
    pg.on("pageerror", lambda e: ERRS.append(str(e)))
    pg.on("console", lambda m: ERRS.append(m.text) if m.type == "error" else None)
    pg.on("dialog", lambda d: d.dismiss())
    pg.goto(pathlib.Path(APP).as_uri())
    pg.wait_for_function("typeof App !== 'undefined' && !!Store.state")
    pg.evaluate(f"() => {{ Store.replace(buildPresetState('{preset}', {{customer:'T'}})); Prefs.set('theme', '{theme}'); }}")
    pg.wait_for_timeout(150)
    return pg


def go(pg, route, sub=None, fresh=True):
    rs = ("Store.replace(buildPresetState('generic', {customer:'T'})); " if fresh else "")
    pg.evaluate(f"() => {{ Modal.close && Modal.close(true); Menu.close(true); UI.boardFilter = ''; {rs}App.go({json.dumps(route)}{', ' + json.dumps(sub) if sub else ''}); document.querySelector('#main').scrollTop = 0; }}")
    pg.wait_for_timeout(350)


# Wat een gangbare audit als "zichtbare focusable" telt. Inhoud van een dichte <details> telt niet mee:
# Chromium houdt die meetbaar (zodat Ctrl+F erin zoekt en hem opent), maar niet bereikbaar met Tab – dat is correct gedrag.
MARK = r"""() => { window.__aud = []; let i = 0;
  document.querySelectorAll('a[href], button, input, select, textarea, summary, [tabindex]').forEach(e => {
    if (!(e.offsetParent !== null || e.getClientRects().length > 0) || e.disabled) return;
    const d = (e.tagName === 'SUMMARY' ? e.parentElement.parentElement : e); if (d && d.closest('details:not([open])')) return;
    const id = 'a' + (i++); e.dataset.auditId = id; window.__aud.push({ id, el: e }); });
  return window.__aud.length; }"""
CUR = "() => { const a = document.activeElement; return a && a !== document.body ? (a.dataset.auditId || '?') : 'BODY'; }"


def cycle(pg, key):
    pg.evaluate("() => { document.activeElement && document.activeElement.blur(); }")
    order, bodies, first = [], 0, None
    for _ in range(700):
        pg.keyboard.press(key)
        a = pg.evaluate(CUR)
        if a == "BODY":
            bodies += 1
            if bodies > 2: break
            continue
        if first is None: first = a
        elif a == first: break
        order.append(a)
    return order, bodies


# Niet bereikt: waarom? Alleen bewuste patronen zijn toegestaan.
CLASSIFY = r"""(reached) => { const R = new Set(reached); const out = [];
  for (const { id, el } of window.__aud) { if (R.has(id)) continue;
    const ti = el.getAttribute('tabindex'), d = el.tagName + '.' + String(el.className).split(' ')[0] + ' ' + (el.dataset.action || '') + ' |' + (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30);
    let kind = 'FOUT', comp = null;
    if (el.type === 'radio' && el.name) { const g = [...document.querySelectorAll('input[type=radio]')].filter(x => x.name === el.name);
      kind = g.some(x => R.has(x.dataset.auditId)) ? 'radiogroep' : 'FOUT'; }
    else if (ti !== '-1') kind = 'FOUT';
    else if (el.id === 'main' || /^H[1-6]$/.test(el.tagName) || el.getAttribute('role') === 'dialog') kind = 'programmatisch';
    else if (el.matches('[data-drop][data-dnd-ti]')) kind = 'dropzone';
    else if (el.getAttribute('role') === 'tab' && el.closest('[role=tablist]')) { comp = el.closest('[role=tablist]'); kind = 'tablist'; }
    else if (el.matches('.md-i') && el.closest('.md-list')) { comp = el.closest('.md-list'); kind = 'masterlijst'; }
    if (comp) { const items = kind === 'tablist' ? [...comp.querySelectorAll('[role=tab]:not([disabled])')] : [...comp.querySelectorAll('.md-li:not([hidden]) > .md-i')];
      if (!items.some(x => R.has(x.dataset.auditId))) kind = 'FOUT (geen actief item bereikt)';
      comp.dataset.auditComp = comp.dataset.auditComp || ('c' + id); }
    out.push({ id, d, kind, comp: comp ? comp.dataset.auditComp : null }); }
  return out; }"""

# Pijltjestoetsen binnen een composite widget bereiken alle items.
ARROWS = r"""(cid) => { const comp = document.querySelector(`[data-audit-comp="${cid}"]`); if (!comp) return null;
  const tab = comp.getAttribute('role') === 'tablist';
  const items = tab ? [...comp.querySelectorAll('[role=tab]:not([disabled])')] : [...comp.querySelectorAll('.md-li:not([hidden]) > .md-i')];
  return { tab, n: items.length, ids: items.map(x => x.dataset.auditId), start: (items.find(x => x.tabIndex === 0) || items[0]).dataset.auditId }; }"""


def arrows_cover(pg, cid):
    info = pg.evaluate(ARROWS, cid)
    if not info: return False, "widget weg"
    pg.evaluate(f"() => document.querySelector('[data-audit-id=\"{info['start']}\"]').focus()")
    fwd, back = ("ArrowRight", "ArrowLeft") if info["tab"] else ("ArrowDown", "ArrowUp")
    seen = set()
    pg.keyboard.press("Home"); seen.add(pg.evaluate(CUR))
    for _ in range(info["n"] + 1):
        pg.keyboard.press(fwd); seen.add(pg.evaluate(CUR))
    pg.keyboard.press("End"); end = pg.evaluate(CUR)
    pg.keyboard.press(back); seen.add(pg.evaluate(CUR))
    miss = [i for i in info["ids"] if i not in seen]
    return not miss and end == info["ids"][-1], f"{len(info['ids']) - len(miss)}/{len(info['ids'])} items, End={end == info['ids'][-1]}"


# Typische interacties per scherm: (selector, toets). Daarna mag de focus niet op <body> of een losgekoppeld element staan.
INTERACT = {
    "sits": [("#main [data-action=sit-unlink]", "Enter"), ("#main [data-action=sit-coach-done]", "Enter"), ("#main select[data-live=lib-cat]", "ArrowDown"),
             ("#main [data-action=lib-kind]", "Enter"), ("#main [data-action=sit-pick]", "Enter")],
    "board": [("#main [data-action=board-sits]", "Enter"), ("#main [data-action=board-col-menu]", "Enter"), ("#main th[data-action=board-filter]", "Enter"),
              ("#main select.lb-filter", "ArrowDown")],
    "policies": [("#main [data-action=lp-dup]", "Enter"), ("#main select[data-action=lp-label-add]", "ArrowDown"),
                 ("#main input[type=checkbox][data-bind$='settings.justification']", "Space"), ("#main .md-i:not(.on)", "Enter"),
                 ("#main [data-action=lp-pv]:not(.on)", "Enter")],
    "dlp/matrix": [("#main [data-action=dlp-pv][aria-selected=false]", "Enter"), ("#main select[data-action=dlp-cell]", "ArrowDown"),
                   ("#main [role=tab][data-action=dlp-tab]:not(.on)", "Enter")],
    "dlp/policies": [("#main [data-action=dlp-pol]", "Enter"), ("#main input[type=checkbox][data-bind]", "Space"), ("#main select[data-bind]", "ArrowDown")],
    "dlp/notify": [("#main [data-action=dlp-nlbl]:not(.on)", "Enter"), ("#main input[type=checkbox][data-bind$='notify.tip']", "Space"),
                   ("#main select[data-bind$='notify.alert']", "ArrowDown")],
    "dlp/editor": [("#main [data-action=cdlp-dup]", "Enter"), ("#main [data-action=cdlp-rule-del]", "Enter"), ("#main [data-action=cdlp-rule-add]", "Enter"),
                   ("#main select[data-bind$=':mode']", "ArrowDown")],
    "copilot": [("#main [data-action=board-choose]", "Enter"), ("#main [data-action=cp-all]", "Enter"), ("#main [data-action=cp-add-rule]", "Enter")],
    "export": [("#main [data-action=val-filter]", "Enter"), ("#main [data-action=vb-version-add]", "Enter")],
    "labels": [("#main label[data-action=lbl-scope] > input", "Space"), ("#main [data-action=pv-app][aria-selected=false]", "Enter"), ("#main .md-i:not(.on)", "Enter")],
    "autolabel": [("#main input[type=checkbox][data-bind$='service.exchange']", "Space"), ("#main select[data-bind$='service.confidence']", "ArrowDown"),
                  ("#main input[type=radio][data-bind$='service.mode']", "ArrowDown")],
}
WHERE = """() => { const a = document.activeElement; if (!a || a === document.body) return 'BODY'; if (!a.isConnected) return 'LOS';
  return a.closest('#main') ? 'main' : a.closest('#modal-root, #drawer-root, .menu') ? 'dialoog' : 'elders:' + (a.id || a.tagName); }"""


with sync_playwright() as p:
    b = p.chromium.launch()
    pg = page(b)
    E = pg.evaluate

    # ---------- Tab- en Shift+Tab-cyclus per scherm ----------
    for route, sub in ROUTES:
        nm = route + ("/" + sub if sub else "")
        go(pg, route, sub)
        n = E(MARK)
        fwd, bodies = cycle(pg, "Tab")
        ok(n > 20 and len(fwd) > 20, f"{nm}: cyclus loopt ({n} zichtbaar, {len(fwd)} bereikt)")
        ok("?" not in fwd, f"{nm}: geen focus op elementen zonder audit-ID (geen vervangen elementen tijdens Tab)")
        ok(len(fwd) == len(set(fwd)), f"{nm}: geen dubbele tabstops in één cyclus")
        ok(bodies <= 1, f"{nm}: focus valt binnen de cyclus niet terug naar body ({bodies})")
        lost = E("() => window.__aud.filter(x => !x.el.isConnected || !x.el.dataset.auditId).map(x => x.id)")
        ok(not lost, f"{nm}: geen element verliest zijn audit-ID tijdens de Tab-cyclus {lost[:5]}")
        cls = E(CLASSIFY, fwd)
        bad = [c for c in cls if c["kind"].startswith("FOUT")]
        ok(not bad, f"{nm}: elk zichtbaar focusbaar element met tabindex>=0 wordt bereikt; rest is bewust {[(c['d'], c['kind']) for c in bad][:6]}")
        kinds = {}
        for c in cls: kinds[c["kind"]] = kinds.get(c["kind"], 0) + 1
        print(f"     {nm}: vooraf {n}, bereikt {len(set(fwd))}, bewust niet in tabvolgorde {kinds}")
        for cid in sorted({c["comp"] for c in cls if c["comp"]}):
            good, info = arrows_cover(pg, cid)
            ok(good, f"{nm}: pijltjes/Home/End bereiken alle items van composite widget {cid} ({info})")
        # Shift+Tab: dezelfde set (vanaf een schone render)
        go(pg, route, sub, fresh=False)
        E(MARK)
        back, bodies = cycle(pg, "Shift+Tab")
        ok(set(back) == set(fwd) or (len(set(back) ^ set(fwd)) == 0), f"{nm}: Shift+Tab bereikt dezelfde elementen ({len(set(back))} vs {len(set(fwd))})")
        ok("?" not in back and len(back) == len(set(back)), f"{nm}: Shift+Tab zonder vervangen elementen of dubbele stops")

    # ---------- Dichte <details>: inhoud niet met Tab bereikbaar, wel doorzoekbaar (Ctrl+F) ----------
    go(pg, "policies")
    tab_in = E("""() => { const ds = [...document.querySelectorAll('#main details:not([open])')]; if (!ds.length) return -1;
      const inner = ds.flatMap(d => [...d.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')]);
      return inner.filter(x => { x.focus(); return document.activeElement === x; }).length; }""")
    ok(tab_in == 0, f"dichte accordions: velden binnenin niet focusbaar ({tab_in})")
    ok(E("() => !document.querySelector('#main details:not([open]) > :not(summary)') || getComputedStyle(document.querySelector('#main details:not([open]) > :not(summary)')).display !== 'none'"), "dichte accordions: inhoud niet met display:none verborgen (Ctrl+F blijft werken)")
    E("() => { const d = document.querySelector('#main details:not([open])'); d.open = true; }")
    ok(E("() => { const d = [...document.querySelectorAll('#main details[open]')].pop(); return [...d.children].filter(x => x.tagName !== 'SUMMARY').some(x => x.getClientRects().length); }"), "geopende accordion toont de inhoud")

    # ---------- Drop-zones: alleen tijdens een pick in de tabvolgorde ----------
    go(pg, "sits")
    E("() => { const c = document.querySelector('#main .lib-card[data-drag]'); c.focus(); }")
    pg.keyboard.press("Enter"); pg.wait_for_timeout(150)
    z = E("() => ({ ok: [...document.querySelectorAll('[data-drop].drop-ok')].filter(x => x.getClientRects().length).map(x => x.tabIndex), idle: [...document.querySelectorAll('[data-drop][data-dnd-ti]:not(.drop-ok)')].map(x => x.tabIndex) })")
    ok(z["ok"] and all(t == 0 for t in z["ok"]) and all(t == -1 for t in z["idle"]), f"sits: tijdens een pick zijn geaccepteerde drop-zones met Tab bereikbaar ({len(z['ok'])})")
    pg.keyboard.press("Tab"); pg.wait_for_timeout(50)
    ok(E("() => document.activeElement.matches('[data-drop].drop-ok') || !!document.activeElement.closest('.lib-card, .lib-panel, #main')"), "sits: Tab na een pick blijft in de pagina")
    pg.keyboard.press("Escape"); pg.wait_for_timeout(100)
    ok(E("() => [...document.querySelectorAll('[data-drop][data-dnd-ti]')].every(x => x.tabIndex === -1)"), "sits: na Esc zijn drop-zones weer uit de tabvolgorde")

    # ---------- Focus blijft behouden bij statewijzigingen ----------
    for key, acts in INTERACT.items():
        route, _, sub = key.partition("/")
        for sel, k in acts:
            go(pg, route, sub or None)
            found = E(f"() => {{ const e = [...document.querySelectorAll({json.dumps(sel)})].find(x => x.getClientRects().length && !x.disabled && !x.closest('details:not([open])')); if (!e) return false; e.focus(); return document.activeElement === e; }}")
            ok(found, f"{key}: interactie-element {sel} gevonden en focusbaar")
            if not found: continue
            pg.keyboard.press(k); pg.wait_for_timeout(350)
            w = E(WHERE)
            ok(w in ("main", "dialoog"), f"{key}: focus behouden na {k} op {sel} ({w})")
            if w == "dialoog":
                pg.keyboard.press("Escape"); pg.wait_for_timeout(250)
                w2 = E(WHERE)
                ok(w2 not in ("BODY", "LOS"), f"{key}: na Esc keert de focus terug ({w2})")

    # Tablist-wissel via pijltjes + Enter houdt de focus op de tab
    go(pg, "labels")
    E("() => document.querySelector('#main [data-action=pv-app][aria-selected=true]').focus()")
    pg.keyboard.press("ArrowRight"); pg.keyboard.press("Enter"); pg.wait_for_timeout(300)
    ok(E("() => { const a = document.activeElement; return a.matches('[role=tab]') && a.getAttribute('aria-selected') === 'true'; }"), "labels: voorbeeldtab wisselen met pijl+Enter houdt focus op de gekozen tab")

    # Ook na een interactie levert een nieuwe Tab-cyclus geen verloren of dubbele stops op
    go(pg, "policies")
    E("() => document.querySelector('#main [data-action=lp-dup]').focus()"); pg.keyboard.press("Enter"); pg.wait_for_timeout(350)
    E(MARK); fwd, bodies = cycle(pg, "Tab")
    ok("?" not in fwd and len(fwd) == len(set(fwd)) and bodies <= 1, "policies: na dupliceren is de Tab-cyclus nog volledig en stabiel")

    ok(not ERRS, f"geen JS-fouten {ERRS[:3]}")
    b.close()

print(f"\n{len(FAILS)} FAIL(S)" if FAILS else "\nALLE TESTS GESLAAGD")
sys.exit(1 if FAILS else 0)
