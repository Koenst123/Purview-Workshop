/* App-shell: navigatie, render-loop, topbalk, facilitatorpaneel, bestanden en initialisatie */
const NAV = [
  { group: "Voorbereiding", routes: ["start", "architectuur"] },
  { group: "Know your Data", routes: ["schema", "sits"] },
  { group: "Integraal", routes: ["board"] },
  { group: "Labels", routes: ["labels", "policies", "autolabel"] },
  { group: "Data Loss Prevention", routes: ["dlp", "endpoint", "copilot"] },
  { group: "Randvoorwaarden", routes: ["tenant"] },
  { group: "Toetsen & afronden", routes: ["scenarios", "adoption", "export"] },
];
const NAV_ROUTES = NAV.flatMap((g) => g.routes);
const PREFS_KEY = STORAGE_KEY + "-ui";
const ACK_KEY = "pyd-ack";            // sessionStorage: opstartdialoog in deze sessie beantwoord
const BUILD_STAMP = "__BUILD__";      // door build.py vervangen
const IMPORT_MAX = 5 * 1024 * 1024;   // 5 MB
/* Breakpoints (effectieve CSS-breedte, dus incl. zoom): paneel als overlay < 1366, navigatie als iconen < 1100. */
const BP_PANEL = 1366, BP_NAV = 1100;
const reducedMotion = () => !!((typeof Prefs !== "undefined" && Prefs.v && Prefs.v.calm) || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches));

/* Brede werkpagina's: facilitatorpaneel standaard ingeklapt, tenzij de gebruiker het op die pagina zelf opende. */
const WIDE_ROUTES = ["board", "dlp", "endpoint", "copilot", "architectuur"];
const PREFS_VERSION = 2; // 2: facilitatorpaneel standaard dicht (ook voor eerder opgeslagen voorkeuren)
const PREFS_DEFAULTS = {
  theme: "light", beamer: false, navCollapsed: false, panelCollapsed: true, panelOpenOn: {}, route: "start", effects: false, autosave: true,
  textSize: "normal", calm: false, explainOpen: false, showReviewed: true, resume: true, pv: PREFS_VERSION,
};
const Prefs = {
  v: JSON.parse(JSON.stringify(PREFS_DEFAULTS)),
  load() {
    let hasTheme = false, oldVersion = true;
    try {
      const o = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
      if (isPlainObj(o)) Object.keys(this.v).forEach((k) => { if (Object.hasOwn(o, k) && typeof o[k] === typeof this.v[k]) this.v[k] = o[k]; });
      hasTheme = isPlainObj(o) && (o.theme === "light" || o.theme === "dark");
      oldVersion = !(isPlainObj(o) && o.pv >= PREFS_VERSION);
    } catch (e) { /* standaardwaarden */ }
    // Eerste keer: altijd het lichte thema (huisstijl); daarna de eigen keuze via de themaknop.
    if (!hasTheme) this.v.theme = "light";
    if (oldVersion) { this.v.panelCollapsed = true; this.v.panelOpenOn = {}; this.v.pv = PREFS_VERSION; }
    if (this.v.textSize !== "large") this.v.textSize = "normal";
    if (!isPlainObj(this.v.panelOpenOn)) this.v.panelOpenOn = {};
    const po = {};
    Object.keys(this.v.panelOpenOn).forEach((k) => { if (WIDE_ROUTES.includes(k)) po[k] = !!this.v.panelOpenOn[k]; });
    this.v.panelOpenOn = po;
    if (typeof this.v.route !== "string") this.v.route = "start";
    if (reducedMotion()) this.v.effects = false; // feestelijke effecten altijd uit bij prefers-reduced-motion
    Store.autosave = this.v.autosave !== false;
  },
  save() { if (App._wiping) return; try { localStorage.setItem(PREFS_KEY, JSON.stringify(this.v)); } catch (e) { /* niet kritisch */ } },
  /** Effectieve stand van nav en paneel voor de huidige route en schermbreedte (beamer: beide dicht tot de gebruiker ze opent). */
  apply() {
    document.documentElement.dataset.theme = this.v.theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.beamer = this.v.beamer ? "true" : "false";
    document.documentElement.dataset.text = this.v.textSize === "large" ? "large" : "normal";
    document.documentElement.dataset.motion = this.v.calm ? "reduce" : "auto";
    UI.facilitator = this.v.showReviewed !== false;
    const w = window.innerWidth || 1440;
    UI.overlay = w < BP_PANEL;
    UI.narrowNav = w < BP_NAV;
    if (this.v.beamer) {
      UI.navCollapsed = !UI.beamerNav;
      UI.panelCollapsed = !UI.beamerPanel;
    } else {
      UI.navCollapsed = UI.narrowNav ? (UI.navOverride != null ? UI.navOverride : true) : !!this.v.navCollapsed;
      UI.panelCollapsed = UI.overlay ? (UI.panelOverride != null ? !UI.panelOverride : true)
        : WIDE_ROUTES.includes(UI.route) ? !this.v.panelOpenOn[UI.route] : !!this.v.panelCollapsed;
    }
    const app = $("#app");
    if (app) {
      app.classList.toggle("nav-collapsed", UI.navCollapsed); app.classList.toggle("panel-collapsed", UI.panelCollapsed);
      app.classList.toggle("panel-overlay", UI.overlay);
    }
  },
  set(k, val) { this.v[k] = val; this.save(); this.apply(); },
};

/* ---------- Bestanden ---------- */
const IO = {
  fileName(ext) { const m = S().meta || {}; return `${safeFileName(`Purview IP-DLP ontwerp - ${m.customer || "klant"} - ${m.date || today()}`)}.${ext}`; },
  saveJson() {
    downloadText(JSON.stringify(stripPrivate(S()), null, 2), this.fileName("json"), "application/json");
    Toast.show(`${icon("save", "s")} Ontwerp opgeslagen als JSON`, "ok");
  },
  openJson() {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = ".json,application/json";
    inp.addEventListener("change", () => { if (inp.files && inp.files[0]) this.readFile(inp.files[0]); });
    inp.click();
  },
  readFile(file) {
    if (file.size > IMPORT_MAX) { Toast.show("Bestand is groter dan 5 MB – dit is geen ontwerp van deze tool.", "err", 6000); return; }
    const rd = new FileReader();
    rd.onload = () => this.loadText(String(rd.result || ""), file.name);
    rd.onerror = () => Toast.show("Bestand kon niet worden gelezen.", "err");
    rd.readAsText(file);
  },
  loadText(text, name = "bestand") {
    if (String(text || "").length > IMPORT_MAX) { Toast.show("Bestand is groter dan 5 MB – dit is geen ontwerp van deze tool.", "err", 6000); return; }
    let raw;
    try { raw = JSON.parse(String(text || "").replace(/^\uFEFF/, "")); } catch (e) { Toast.show(`${esc(name)} is geen geldig JSON-bestand.`, "err", 5000); return; }
    if (!isPlainObj(raw) || (raw.app !== undefined && raw.app !== "pyd-ipdlp-designer") || !Array.isArray(raw.labels)) {
      Toast.show(`${esc(name)} is geen ontwerp van deze Workshop Designer.`, "err", 5000); return;
    }
    const go = () => {
      try {
        Store.replace(raw); // normaliseert; gooit bij een onbruikbaar bestand en laat het huidige ontwerp dan intact
      } catch (e) {
        console.error(e);
        Toast.show(`Ontwerp kon niet worden geladen: ${esc(e && e.message ? e.message : String(e))}. Je huidige ontwerp is ongewijzigd.`, "err", 7000);
        return;
      }
      resetViewState();
      App.go("start");
      Toast.show(`${icon("open", "s")} Ontwerp <b>${esc(S().meta.customer || name)}</b> geladen – Ctrl+Z maakt dit ongedaan.`, "ok", 4500);
      const nz = normalizeState.last || {};
      if (nz.newer) Toast.show("Dit ontwerp is gemaakt met een nieuwere versie van de tool; sommige keuzes kunnen verloren gaan.", "warn", 9000);
      else if (nz.truncated && nz.truncated.length) Toast.show(`Ontwerp ingekort: te veel ${esc(nz.truncated.join(", "))} – alleen de eerste zijn geladen.`, "warn", 9000);
    };
    if (this.hasContent(S())) confirmDialog("Ontwerp openen?", "Het huidige ontwerp wordt vervangen. Sla het eerst op als je het wilt bewaren (je kunt het openen ook ongedaan maken).", go, "Openen");
    else go();
  },
  /** Heeft het huidige ontwerp iets dat verloren kan gaan? (vergelijkt met een leeg ontwerp) */
  hasContent(st) {
    if (!st) return false;
    const e = createEmptyState();
    const m = st.meta || {};
    if ((st.labels || []).length || (st.sits || []).length || (st.customDlp || []).length || (st.personas || []).length || (st.decisions || []).length) return true;
    if (["customer", "facilitator", "notes", "prefix"].some((k) => String(m[k] || "").trim()) || (m.participants || []).length) return true;
    if (Object.keys(st.scenarioResults || {}).length || Object.keys((st.tenant || {}).checks || {}).length || Object.values((st.adoption || {}).notes || {}).some((x) => String(x || "").trim())) return true;
    const sig = (x) => JSON.stringify([x.groups, (x.labelPolicies || []).map((p) => ({ ...p, id: "" })), x.endpoint, x.dlpSettings]);
    return sig(st) !== sig(e);
  },
  newDesign() {
    confirmDialog("Nieuw ontwerp starten?", "Het huidige ontwerp wordt leeggemaakt en de ongedaan-maakgeschiedenis gewist. Sla het eerst op als JSON als je het wilt bewaren.", () => {
      Store.replace(createEmptyState(), false);
      resetViewState();
      App.go("start");
    }, "Nieuw ontwerp", true);
  },
  /** Alle lokale gegevens wissen: ontwerp, ongedaan-maakgeschiedenis en weergave-instellingen. */
  wipe() {
    confirmDialog("Alle lokale gegevens wissen?", "Het ontwerp, de ongedaan-maakgeschiedenis en je weergave-instellingen worden uit deze browser verwijderd. Dit kan niet ongedaan worden gemaakt.", () => App.wipeNow(), "Wissen", true);
  },
};
/** Weergavestatus (niet opgeslagen) terugzetten na openen/nieuw ontwerp. */
function resetViewState() {
  UI.sub = {}; UI.dlpRule = 0; UI.dlpEdit = null; UI.selLabel = null; UI.sitEdit = null; UI.perOpen = null;
  UI.sitTest = {}; UI.scnPlayed = {}; UI.scnJust = null; UI.decDraft = "";
}

/* ---------- Timer (facilitator) ---------- */
const Timer = {
  s: { running: false, startAt: 0, acc: 0, extra: 0, route: null, base: 0 },
  _dur(r) { const v = Object.hasOwn(Views, r) ? Views[r] : null; return ((v && v.fac && v.fac.duration) || 0) * 60; },
  active() { return this.s.running || this.s.acc > 0; },
  /** Doeltijd ligt vast bij het starten (route waarop de timer liep); navigeren verandert hem niet. */
  target() { return (this.active() ? this.s.base : this._dur(UI.route)) + this.s.extra; },
  elapsed() { return this.s.acc + (this.s.running ? (Date.now() - this.s.startAt) / 1000 : 0); },
  forRoute(r) { if (!this.active() && this.s.route !== r) this.s = { running: false, startAt: 0, acc: 0, extra: 0, route: r, base: this._dur(r) }; },
  start() {
    if (!this.active()) { this.s.route = UI.route; this.s.base = this._dur(UI.route); }
    this.s.running = true; this.s.startAt = Date.now();
  },
  pause() { if (!this.s.running) return; this.s.acc = this.elapsed(); this.s.running = false; },
  reset() { this.s = { running: false, startAt: 0, acc: 0, extra: 0, route: UI.route, base: this._dur(UI.route) }; },
  html() {
    const tg = this.target(), rem = tg - this.elapsed(), over = tg > 0 && rem < 0;
    const other = this.active() && this.s.route && this.s.route !== UI.route && Object.hasOwn(Views, this.s.route) ? `<div class="xs muted">Loopt voor: ${esc(Views[this.s.route].title)}</div>` : "";
    return `<div class="timer${over ? " over" : ""}" id="fac-timer" role="timer" aria-live="off"><span class="t">${tg ? (over ? "+" : "") + fmtTime(Math.abs(rem)) : fmtTime(this.elapsed())}</span>
      <button class="icon-btn small" data-action="${this.s.running ? "timer-pause" : "timer-start"}" title="${this.s.running ? "Pauzeren" : this.s.acc > 0 ? "Hervatten" : "Starten"}" aria-label="${this.s.running ? "Timer pauzeren" : this.s.acc > 0 ? "Timer hervatten" : "Timer starten"}">${icon(this.s.running ? "pause" : "play", "s")}</button>
      <button class="icon-btn small" data-action="timer-add" title="+5 minuten" aria-label="5 minuten toevoegen">${icon("plus", "s")}</button>
      <button class="icon-btn small" data-action="timer-reset" title="Opnieuw" aria-label="Timer opnieuw instellen">${icon("redo", "s")}</button></div>${other}`;
  },
  tick() {
    const el = document.getElementById("fac-timer");
    if (!el || !this.s.running) return;
    const tg = this.target(), rem = tg - this.elapsed(), over = tg > 0 && rem < 0;
    el.classList.toggle("over", over);
    const t = el.querySelector(".t"); if (t) t.textContent = tg ? (over ? "+" : "") + fmtTime(Math.abs(rem)) : fmtTime(this.elapsed());
  },
};
Actions["timer-start"] = () => { Timer.start(); App.renderPanel(); };
Actions["timer-pause"] = () => { Timer.pause(); App.renderPanel(); };
Actions["timer-add"] = () => { Timer.s.extra += 300; App.renderPanel(); };
Actions["timer-reset"] = () => { Timer.reset(); App.renderPanel(); };

/* ---------- App ---------- */
const App = {
  _raf: 0,
  _valCache: { rev: -1, items: [] },
  val() {
    if (this._valCache.rev !== Store.rev || this._valCache.st !== Store.state) {
      let items = [];
      try { items = Validation.run(S()); } catch (e) { console.error(e); }
      this._valCache = { rev: Store.rev, st: Store.state, items };
    }
    return this._valCache.items;
  },

  go(route, sub) {
    if (typeof route !== "string" || !Object.hasOwn(Views, route)) route = "start";
    if (sub !== undefined && sub !== null && sub !== "") UI.sub[route] = sub;
    const changed = UI.route !== route;
    UI.route = route;
    Prefs.v.route = route; Prefs.save();
    if (changed) {
      if (Drawer.isOpen()) Drawer.close();
      Menu.close(true);
      Timer.forRoute(route);
      if (UI.overlay) { if (Prefs.v.beamer) UI.beamerPanel = false; else UI.panelOverride = null; }
      Prefs.apply();
      if (location.hash !== "#" + route) history.replaceState(null, "", "#" + route);
    }
    this.render({ resetScroll: changed });
    if (changed) { const m = $("#main"); if (m) m.focus({ preventScroll: true }); }
  },

  schedule(silent) {
    if (silent) { this._chrome(); return; }
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => { this._raf = 0; this.render(); });
  },
  _chrome: debounce(function () { App.renderTopbar(); App.renderNav(); }, 350),

  render(o = {}) {
    const main = $("#main");
    if (!main) return;
    // focus en scroll bewaren
    const a = document.activeElement;
    let fr = null, selS = null, selE = null;
    if (a && a !== document.body && (main.contains(a) || $("#sidepanel").contains(a))) {
      fr = _rememberFocus();
      try { selS = a.selectionStart; selE = a.selectionEnd; } catch (e) { /* geen tekstveld */ }
    }
    const keep = [".board-wrap", ".lib-scroll", ".scroll-x", ".table-wrap", ".code"];
    const scrolls = o.resetScroll ? [] : keep.map((s) => $$(s, main).map((el) => [el.scrollTop, el.scrollLeft]));
    const mainTop = o.resetScroll ? 0 : main.scrollTop, panelTop = $("#sidepanel").scrollTop;
    // open/dicht-stand van inklapbare secties bewaren (per route + data-acc-sleutel)
    UI.acc = UI.acc || {};
    $$("details[data-acc]", document).forEach((d) => { UI.acc[UI.route + "|" + d.dataset.acc] = d.open; });

    this.renderTopbar();
    this.renderNav();
    const v = Views[UI.route];
    try {
      main.innerHTML = v ? v.render() : msg("err", "Onbekende pagina.");
      if (v && v.after) v.after(main);
    } catch (e) {
      console.error(e);
      main.innerHTML = `${msg("err", `<b>Deze pagina kon niet worden weergegeven.</b> ${esc(e.message)}<br><span class="xs">Je ontwerp is niet verloren. Probeer Ctrl+Z of ga naar een andere stap.</span>`)}`;
    }
    this.renderPanel();
    a11yEnhance($("#app") || document);
    if (Drawer.isOpen()) Drawer.render();
    $$("details[data-acc]", document).forEach((d) => { const k = UI.route + "|" + d.dataset.acc; if (k in UI.acc) d.open = UI.acc[k]; });

    if (!o.resetScroll) keep.forEach((s, i) => $$(s, main).forEach((el, j) => { const p = scrolls[i] && scrolls[i][j]; if (p) { el.scrollTop = p[0]; el.scrollLeft = p[1]; } }));
    main.scrollTop = mainTop;
    $("#sidepanel").scrollTop = panelTop;
    if (fr && !(fr.el && fr.el.isConnected)) {
      const n = _findFocus(fr, main) || _findFocus(fr, $("#sidepanel"));
      if (n) { n.focus({ preventScroll: true }); try { if (selS != null) n.setSelectionRange(selS, selE); } catch (e) { /* select/checkbox */ } }
    }
    if (typeof DnD !== "undefined") DnD.refresh();
    if (typeof Tip !== "undefined") Tip.hide();
  },

  renderTopbar() {
    const st = S(), m = st.meta || {};
    const ws = (CATALOG.workshops || []).find((w) => (w.id || w.key) === m.workshop);
    const navR = NAV_ROUTES.filter((r) => Object.hasOwn(Views, r)), idx = navR.indexOf(UI.route);
    const crumb = Prefs.v.beamer && idx >= 0 ? ` · <span class="topbar-crumb">Stap ${idx + 1} van ${navR.length} · ${esc(Views[UI.route].title)}</span>` : "";
    $("#topbar-customer").innerHTML = `<b>${esc(m.customer || "Nieuw ontwerp")}</b>${!Prefs.v.beamer && m.date ? ` · ${esc(fmtDate(m.date))}` : ""}${!Prefs.v.beamer && ws ? ` · ${esc(ws.name)}` : ""}${crumb}`;
    const ib = (act, ic, title, dis, extra = "", label = title) => `<button class="icon-btn" data-action="${act}" title="${esc(title)}" aria-label="${esc(label)}"${dis ? " disabled" : ""}${extra}>${icon(ic)}</button>`;
    const saveTxt = Store.autosave ? (this._saved || "") : "Autosave uit";
    $("#topbar-actions").innerHTML = `<span id="save-ind" class="xs fac-only save-ind" title="${Store.autosave ? "Je ontwerp wordt automatisch in deze browser bewaard" : "Automatisch bewaren staat uit – sla je ontwerp op als JSON (Ctrl+S)"}">${esc(saveTxt)}</span>
      ${ib("undo", "undo", Store.canUndo() ? "Ongedaan maken (Ctrl+Z)" : "Geen stappen – ongedaan maken werkt binnen deze sessie", !Store.canUndo(), "", "Ongedaan maken")}${ib("redo", "redo", Store.canRedo() ? "Opnieuw (Ctrl+Y)" : "Niets om opnieuw te doen", !Store.canRedo(), "", "Opnieuw")}<span class="sep"></span>
      ${ib("open-json", "open", "Ontwerp openen (JSON, Ctrl+O)")}${ib("save-json", "save", "Ontwerp opslaan als JSON (Ctrl+S)")}
      <button class="btn small primary" data-action="export-menu" title="Exporteren">${icon("download", "s")} <span class="tb-label">Exporteren</span></button><span class="sep"></span>
      ${ib("toggle-beamer", "projector", "Beamermodus (grotere tekst, facilitatorinhoud verborgen)", false, ` aria-pressed="${!!Prefs.v.beamer}"`, "Beamermodus")}${ib("toggle-theme", Prefs.v.theme === "dark" ? "sun" : "moon", Prefs.v.theme === "dark" ? "Donker thema staat aan – klik voor licht thema" : "Donker thema aanzetten", false, ` aria-pressed="${Prefs.v.theme === "dark"}"`, "Donker thema")}
      ${ib("toggle-panel", "panel", UI.panelCollapsed ? "Facilitatorpaneel tonen" : "Facilitatorpaneel verbergen", false, ` aria-expanded="${!UI.panelCollapsed}" aria-controls="sidepanel"`, "Facilitatorpaneel")}${ib("app-settings", "settings", "Instellingen")}${ib("app-menu", "more", "Meer")}`;
    const mi = $("#ico-menu"); if (mi && !mi.innerHTML) mi.innerHTML = icon("menu");
  },

  /** Navigatie; HTML gememoiseerd per rev + route (typen in een veld rendert de nav dan niet opnieuw). */
  renderNav() {
    const st = S(), m = st.meta || {};
    const key = `${Store.rev}|${UI.route}|${Prefs.v.beamer}`;
    const nav = $("#sidenav");
    if (this._navKey === key && this._navSt === st && nav.innerHTML) return;
    const items = this.val();
    const empty = !(st.labels || []).length;
    let rd = null; try { rd = Validation.readiness(st); } catch (e) { console.error(e); }
    let scn = null; try { scn = ScenarioEngine.score(st).pct; } catch (e) { /* geen scenario's */ }
    const dp = rd ? (rd.design ? rd.design.pct : rd.pct) : 0;
    const rp = rd && rd.rollout ? rd.rollout.pct : null;
    let n = 0;
    const head = empty
      ? `<div class="nav-progress nav-empty"><div class="xs muted mb-1">Nog geen labels in dit ontwerp.</div><button class="btn small primary w-100" data-action="go" data-route="schema">${icon("plus", "s")} Labels toevoegen</button><div class="xs mt-1 nav-alt"><a href="#start" data-action="go" data-route="start">of kies een voorbeeld</a></div></div>`
      : `<div class="nav-progress" title="Ontwerp: stappen en dekking. Uitrol: openstaande fouten en ontbrekende klantgegevens.">
          <div class="row between xs"><span>Ontwerp compleet</span><b>${dp}%</b></div>${meter(dp)}
          ${rp != null ? `<div class="row between xs mt-1"><span>Klaar voor uitrol</span><b>${rp}%</b></div>${meter(rp)}` : ""}
          ${scn != null ? `<div class="xs muted mt-1" title="Automatische toets: hoe goed het ontwerp de praktijkscenario’s afdekt">${icon("trophy", "s")} Scenario-toets ${scn}%</div>` : ""}</div>`;
    nav.innerHTML = `${head}
      ${NAV.map((g) => `<div class="nav-group">${esc(g.group)}</div>${g.routes.filter((r) => Views[r]).map((r) => {
        n++;
        const v = Views[r];
        const reviewed = !!(m.reviewed && m.reviewed[r]) || (r === "export" && !!m.exportedAt);
        let done = false; if (!empty && !reviewed) { try { done = !!(v.done && v.done(st)); } catch (e) { /* negeren */ } }
        const mine = items.filter((x) => x.route === r);
        const err = mine.filter((x) => x.level === "err").length, warn = mine.filter((x) => x.level === "warn").length;
        const nb = empty ? "" : err ? `<span class="nb err" title="${err} fout(en)">${err}</span>` : warn ? `<span class="nb warn" title="${warn} waarschuwing(en)">${warn}</span>` : "";
        const stat = reviewed ? (r === "export" && !(m.reviewed || {})[r] ? "geëxporteerd" : "besproken") : done ? "Voorgevuld – nog niet besproken" : "";
        const num = reviewed ? icon("check", "s") : done ? `${n}<span class="nav-half" aria-hidden="true"></span>` : n;
        return `<button class="nav-item${UI.route === r ? " on" : ""}${reviewed ? " done" : done ? " prefilled" : ""}" data-action="go" data-route="${r}" title="${esc(v.title + (stat ? " – " + stat : ""))}"${UI.route === r ? ' aria-current="page"' : ""}><span class="num">${num}</span><span class="nav-text">${esc(v.title)}${stat ? `<span class="sr-only"> (${esc(stat)})</span>` : ""}</span>${nb}</button>`;
      }).join("")}`).join("")}`;
    this._navKey = key; this._navSt = st;
  },

  renderPanel() {
    const p = $("#sidepanel");
    if (!p) return;
    if (UI.panelCollapsed) { p.innerHTML = ""; return; }
    const st = S(), v = Views[UI.route] || {}, f = v.fac || {};
    Timer.forRoute(UI.route);
    const list = (ic, t, arr) => (arr && arr.length ? `<h4>${icon(ic, "s")} ${t}</h4><ul>${arr.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "");
    const links = (f.links || []).filter((k) => CATALOG.learn && CATALOG.learn[k]);
    const decs = (st.decisions || []).slice().reverse();
    const routeName = (r) => (Views[r] ? Views[r].title : r || "");
    const dec = (d) => `<div class="decision" data-focus-key="dec-${esc(d.id)}"><span title="${d.kind === "park" ? "Parkeerpunt" : "Besluit"}">${icon(d.kind === "park" ? "clock" : "checkcircle", "s")}</span><div class="d-text">${esc(d.text)}${d.route ? `<div class="xs muted"><a href="#${esc(d.route)}" data-action="go" data-route="${esc(d.route)}">${esc(routeName(d.route))}</a>${d.at ? ` · ${esc(new Date(d.at).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }))}` : ""}</div>` : ""}
      <div class="dec-meta"><input class="input dec-owner" data-bind="dec:${esc(d.id)}:owner" value="${esc(d.owner || "")}" maxlength="120" placeholder="Eigenaar (bijv. CISO)" aria-label="Eigenaar van ${d.kind === "park" ? "parkeerpunt" : "besluit"}"><input class="input dec-due" type="date" data-bind="dec:${esc(d.id)}:due" value="${esc(/^\d{4}-\d{2}-\d{2}$/.test(d.due || "") ? d.due : "")}" aria-label="Deadline" title="Deadline"></div></div>
      <button class="icon-btn small" data-action="decision-del" data-id="${esc(d.id)}" title="Verwijderen" aria-label="Verwijderen">${icon("x", "s")}</button></div>`;
    p.innerHTML = `<div class="fac">
      <div class="row between"><div><div class="eyebrow">Facilitator</div><b>${esc(v.title || "")}</b></div>${f.duration ? `<span class="badge neutral">${icon("clock", "s")} ${f.duration} min</span>` : ""}</div>
      <div class="mt-1">${Timer.html()}</div>
      ${NAV_ROUTES.includes(UI.route) ? `<div class="mt-1">${reviewedButton(UI.route)}</div>` : ""}
      ${f.goal ? `<h4>${icon("target", "s")} Doel</h4><p class="small mb-0">${esc(f.goal)}</p>` : ""}
      ${list("question", "Vragen aan de klant", f.questions)}
      ${list("bulb", "Tips", f.tips)}
      ${list("warning", "Valkuilen", f.pitfalls)}
      ${links.length ? `<h4>${icon("book", "s")} Microsoft Learn</h4><ul>${links.map((k) => `<li>${learn(k)}</li>`).join("")}</ul>` : ""}
      <h4>${icon("flag", "s")} Besluiten & parkeerplaats</h4>
      <textarea id="dec-text" class="textarea" rows="2" placeholder="Besluit of open punt… (Enter = besluit)" aria-label="Besluit of parkeerpunt">${esc(UI.decDraft || "")}</textarea>
      <div class="row tight mt-1 mb-1"><button class="btn small primary" data-action="decision-add" data-kind="decision">${icon("check", "s")} Besluit</button><button class="btn small" data-action="decision-add" data-kind="park">${icon("clock", "s")} Parkeren</button></div>
      ${decs.length ? decs.map(dec).join("") : `<p class="xs muted">Nog niets vastgelegd. Besluiten komen in het ontwerpdocument en de Excel-export; eigenaar en deadline zijn optioneel.</p>`}
    </div>`;
  },

  /** Overlay-paneel (smalle schermen) sluiten. */
  closeOverlay(focusToggle) {
    if (Prefs.v.beamer) UI.beamerPanel = false; else UI.panelOverride = false;
    Prefs.apply(); this.renderTopbar(); this.renderPanel();
    if (focusToggle) { const b = $('#topbar-actions [data-action="toggle-panel"]'); if (b) b.focus(); }
  },

  /** Opstartdialoog: er staat al een ontwerp in deze browser (privacy op gedeelde laptops). */
  startup() {
    let ack = false; try { ack = sessionStorage.getItem(ACK_KEY) === "1"; } catch (e) { /* geblokkeerd */ }
    if (ack || !Store.peekLocal() || !IO.hasContent(S())) return;
    const m = S().meta || {};
    const when = m.savedAt || m.updated || "", d = when ? new Date(when) : null, ok = d && !isNaN(d);
    const dstr = ok ? d.toLocaleString("nl-NL", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "onbekend";
    const old = ok && Date.now() - d.getTime() > 30 * 864e5;
    const setAck = () => { try { sessionStorage.setItem(ACK_KEY, "1"); } catch (e) { /* geblokkeerd */ } };
    const name = m.customer || "naamloos ontwerp";
    Modal.open({
      title: "Vorig ontwerp gevonden",
      body: `<p>In deze browser staat nog een ontwerp${m.customer ? ` van <b>${esc(m.customer)}</b>` : ""}, laatst bewaard op ${esc(dstr)}.</p>
        ${old ? msg("warn", "<b>Ontwerp ouder dan 30 dagen – wissen?</b> Bewaar klantgegevens niet langer dan nodig in de browser.") : ""}
        <p class="small muted">Werk je op een gedeelde laptop of beamer-pc? Kies dan voor wissen; sla het ontwerp eerst op als JSON als je het wilt bewaren.</p>`,
      buttons: [
        { label: "Nieuw ontwerp – lokale gegevens wissen", danger: true, fn: () => { setAck(); App.wipeNow(true); } },
        { label: `Doorgaan met ‘${esc(name.length > 40 ? name.slice(0, 39) + "…" : name)}’`, primary: true, fn: setAck },
      ],
    });
  },

  /** Lokale gegevens wissen. soft = alleen het ontwerp (opstartdialoog), anders ook instellingen + herladen. */
  wipeNow(soft) {
    Store.clearLocal();
    Store.replace(createEmptyState(), false);
    Store.clearLocal();
    resetViewState();
    if (soft) { App.go("start"); Toast.show("Lokale ontwerpgegevens gewist – je begint met een leeg ontwerp.", "ok", 4000); return; }
    this._wiping = true;
    try { localStorage.removeItem(PREFS_KEY); localStorage.removeItem(STORAGE_KEY + "-coach"); sessionStorage.removeItem(ACK_KEY); } catch (e) { /* geblokkeerd */ }
    location.hash = "";
    location.reload();
  },

  init() {
    Prefs.load();
    Prefs.apply();
    Store.init();
    initBindings();
    if (typeof Tip !== "undefined") Tip.init();
    if (typeof DnD !== "undefined") DnD.init();
    Bus.on("change", (e) => App.schedule(e && e.silent));
    Bus.on("saved", () => {
      this._saved = "Opgeslagen " + new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
      const el = $("#save-ind"); if (el) el.textContent = this._saved;
    });
    setInterval(() => Timer.tick(), 1000);
    // Exportstap: afdrukken/PDF telt ook als export (downloads worden in downloadBlob geregistreerd).
    if (typeof DocExport !== "undefined" && typeof DocExport.print === "function" && !DocExport.print._wrapped) {
      const orig = DocExport.print;
      DocExport.print = function (...a) { const r = orig.apply(this, a); setTimeout(markExported, 0); return r; };
      DocExport.print._wrapped = true;
    }

    document.addEventListener("keydown", (e) => {
      const t = e.target, editable = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      const mod = e.ctrlKey || e.metaKey, k = String(e.key || "").toLowerCase();
      const modal = !!Modal.cur || !!($("#modal-root") && $("#modal-root").innerHTML.trim());
      const picking = typeof DnD !== "undefined" && DnD.pick;
      if (e.key === "Escape") {
        if (e.defaultPrevented || modal || picking) return;
        if (Drawer.isOpen()) { e.preventDefault(); Drawer.close(); return; }
        if (UI.overlay && !UI.panelCollapsed && !Menu.isOpen()) { e.preventDefault(); App.closeOverlay(true); }
        return;
      }
      if (modal || Drawer.isOpen()) return; // sneltoetsen staan uit zolang een dialoog of zijpaneel open is
      if (t && t.id === "dec-text" && e.key === "Enter" && !e.shiftKey) { e.preventDefault(); Actions["decision-add"]({ dataset: { kind: "decision" } }); return; }
      if (mod && !e.altKey && k === "s") { e.preventDefault(); IO.saveJson(); return; }
      if (mod && !e.altKey && k === "p") { e.preventDefault(); DocExport.print(); return; }
      if (mod && !e.altKey && k === "o") { e.preventDefault(); IO.openJson(); return; }
      if (editable) return;
      if (mod && !e.shiftKey && k === "z") { e.preventDefault(); Store.undo(); return; }
      if (mod && (k === "y" || (e.shiftKey && k === "z"))) { e.preventDefault(); Store.redo(); return; }
    });
    document.addEventListener("input", (e) => { if (e.target && e.target.id === "dec-text") UI.decDraft = e.target.value; });
    // Overlay-paneel: klik buiten het paneel sluit het.
    document.addEventListener("pointerdown", (e) => {
      if (!UI.overlay || UI.panelCollapsed) return;
      const t = e.target;
      if (!t || !t.closest || t.closest("#sidepanel, [data-action='toggle-panel'], #modal-root, #drawer-root, .menu, .tooltip, #toast-root")) return;
      App.closeOverlay(false);
    });
    // Breakpoints opnieuw bepalen bij resize/zoom; een expliciete keuze geldt tot de volgende grensovergang.
    window.addEventListener("resize", debounce(() => {
      const w = window.innerWidth, wasO = UI.overlay, wasN = UI.narrowNav, wasP = UI.panelCollapsed;
      if ((w < BP_PANEL) !== wasO) { UI.panelOverride = null; UI.beamerPanel = false; }
      if ((w < BP_NAV) !== wasN) UI.navOverride = null;
      Prefs.apply();
      if (wasP !== UI.panelCollapsed || wasO !== UI.overlay) { App.renderTopbar(); App.renderPanel(); }
    }, 150));
    // Autosave direct wegschrijven bij sluiten/verbergen van het tabblad.
    window.addEventListener("pagehide", () => Store.saveLocal.flush());
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") Store.saveLocal.flush(); });
    // JSON-bestand op het venster slepen
    window.addEventListener("dragover", (e) => { if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes("Files")) e.preventDefault(); });
    window.addEventListener("drop", (e) => {
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!f) return;
      e.preventDefault();
      if (/\.json$/i.test(f.name)) IO.readFile(f); else Toast.show("Sleep een .json-ontwerpbestand hierheen om het te openen.", "warn");
    });
    window.addEventListener("hashchange", () => { const r = location.hash.slice(1); if (r && r !== UI.route && Object.hasOwn(Views, r)) App.go(r); });
    window.addEventListener("beforeprint", () => { const r = $("#print-root"); if (r && !r.innerHTML.trim()) r.innerHTML = DocExport.html(S(), { only: "keuzes" }); const h = document.documentElement; if (h.dataset.theme === "dark") { h.dataset.theme = "light"; h.dataset.printDark = "1"; } });
    window.addEventListener("afterprint", () => { const r = $("#print-root"); if (r) setTimeout(() => { r.innerHTML = ""; }, 0); const h = document.documentElement; if (h.dataset.printDark) { delete h.dataset.printDark; Prefs.apply(); } });
    ["kind", "cat"].forEach((k) => { if (UI.libFilter && UI.libFilter[k] === "all") UI.libFilter[k] = ""; });

    const h = location.hash.slice(1);
    UI.route = Object.hasOwn(Views, h) ? h : Prefs.v.resume && Object.hasOwn(Views, Prefs.v.route) ? Prefs.v.route : "start";
    Prefs.apply();
    Timer.forRoute(UI.route);
    this.render({ resetScroll: true });
    this.startup();
  },
};

/* ---------- Globale acties ---------- */
Actions["go"] = (el) => App.go(el.dataset.route, el.dataset.sub);
Actions["undo"] = () => Store.undo();
Actions["redo"] = () => Store.redo();
Actions["save-json"] = () => IO.saveJson();
Actions["open-json"] = () => IO.openJson();
Actions["new-design"] = () => IO.newDesign();
Actions["wipe-local"] = () => { Modal.close(true); IO.wipe(); };
Actions["skip-main"] = () => { const m = $("#main"); const h = m && $("h1", m); (h || m).setAttribute("tabindex", "-1"); (h || m).focus(); };
Actions["toggle-nav"] = () => {
  if (Prefs.v.beamer) { UI.beamerNav = UI.navCollapsed; Prefs.apply(); }
  else if (UI.narrowNav) { UI.navOverride = !UI.navCollapsed; Prefs.apply(); }
  else Prefs.set("navCollapsed", !UI.navCollapsed);
};
Actions["toggle-panel"] = () => {
  const open = UI.panelCollapsed;
  if (Prefs.v.beamer) UI.beamerPanel = open;
  else if (UI.overlay) UI.panelOverride = open;
  else if (WIDE_ROUTES.includes(UI.route)) { Prefs.v.panelOpenOn[UI.route] = open; Prefs.save(); }
  else { Prefs.v.panelCollapsed = !open; Prefs.save(); }
  Prefs.apply(); App.renderTopbar(); App.renderPanel(); a11yEnhance($("#sidepanel") || document);
  if (open && UI.overlay) { const f = _focusables($("#sidepanel"))[0]; if (f) f.focus(); }
  else { const b = $('#topbar-actions [data-action="toggle-panel"]'); if (b) b.focus(); }
};
Actions["toggle-theme"] = () => { Prefs.set("theme", Prefs.v.theme === "dark" ? "light" : "dark"); App.renderTopbar(); const b = $('#topbar-actions [data-action="toggle-theme"]'); if (b) b.focus(); };
Actions["toggle-beamer"] = () => { UI.beamerNav = false; UI.beamerPanel = false; Prefs.set("beamer", !Prefs.v.beamer); App.render(); const b = $('#topbar-actions [data-action="toggle-beamer"]'); if (b) b.focus(); };
Actions["export-menu"] = (el) => Menu.open(el, [
  { icon: "printer", label: "Ontwerpdocument (PDF)", desc: "Volledig ontwerp via afdrukken → Opslaan als PDF", fn: () => DocExport.print() },
  { icon: "table", label: "Keuzeoverzicht – ter bevestiging", desc: "Alle keuzes per label, ter bevestiging", fn: () => DocExport.print({ only: "keuzes" }) },
  { icon: "excel", label: "Excel-werkmap (.xlsx)", desc: "Labels, beleid, DLP-regels, endpoint, randvoorwaarden", fn: () => XlsxExport.download() },
  { icon: "code", label: "PowerShell-script (.ps1)", desc: "Security & Compliance PowerShell – DLP altijd in simulatie", fn: () => PsExport.download() },
  "-",
  { icon: "save", label: "Ontwerp opslaan (.json)", desc: "Later verder werken of delen met collega’s", fn: () => IO.saveJson() },
]);

/** Sneltoetsen-overzicht. */
function showShortcuts() {
  const rows = [
    ["Ctrl+Z", "Ongedaan maken (in een tekstveld: tekst-undo van de browser)"],
    ["Ctrl+Y / Ctrl+Shift+Z", "Opnieuw"],
    ["Ctrl+S", "Ontwerp opslaan als JSON"],
    ["Ctrl+O", "Ontwerp openen (JSON)"],
    ["Ctrl+P", "Ontwerpdocument afdrukken / opslaan als PDF"],
    ["Esc", "Dialoog, zijpaneel, menu of overlay-paneel sluiten"],
    ["Spatie", "Kaart oppakken op het ontwerpbord of in de bibliotheek; met Enter/spatie op een vak plaatsen"],
    ["Pijltjestoetsen", "Tussen tabbladen en menu-items bewegen"],
    ["Tab", "Naar het volgende element; de eerste Tab toont “Naar inhoud”"],
  ];
  Modal.open({
    title: "Sneltoetsen",
    body: `<table class="table shortcuts"><thead><tr><th scope="col">Toets</th><th scope="col">Wat het doet</th></tr></thead><tbody>${rows.map(([k, t]) => `<tr><td><kbd>${esc(k)}</kbd></td><td>${esc(t)}</td></tr>`).join("")}</tbody></table>
      <p class="xs muted mt-1">Sneltoetsen werken niet zolang een dialoog of zijpaneel open is (behalve Esc). Op een Mac: ⌘ in plaats van Ctrl.</p>`,
  });
}
/** Privacy & over deze tool (incl. autosave- en effectenschakelaar). */
function showAbout() {
  Modal.open({
    title: "Privacy & over deze tool",
    wide: true,
    body: `<div class="about-brand">${brandImg("peLogo", "Pink Elephant – maakt IT persoonlijk", "about-logo")}<span class="spacer"></span>${brandImg("msSecurity", "Microsoft Security", "ms-wordmark")}${brandImg("msPartner", "Microsoft Solutions Partner – Security", "ms-partner")}</div>
      <p><b>Pink Elephant – Protect your Data</b> · Information Protection &amp; DLP Workshop Designer · versie ${esc(APP_VERSION)} · build ${esc(BUILD_STAMP)}</p>
      <h3 class="mt-2">Privacy</h3>
      <ul class="small">
        <li>De tool <b>werkt volledig offline; gegevens blijven in deze browser</b>. Er wordt niets naar internet verzonden – een Content-Security-Policy blokkeert alle netwerkverkeer. Links naar Microsoft Learn openen pas als je erop klikt.</li>
        <li>Met <b>automatisch bewaren</b> staat het ontwerp (klantnaam, deelnemers, besluiten) in de lokale opslag van deze browser, zodat je na sluiten verder kunt.</li>
        <li>Testteksten voor gevoelige informatietypen worden <b>nooit</b> bewaard of geëxporteerd; ze bestaan alleen zolang de pagina open is.</li>
        <li>Op een gedeelde laptop of beamer-pc: sla het ontwerp op als JSON en <b>wis daarna de lokale gegevens</b> (menu ⋯ → “Lokale gegevens wissen…”).</li>
      </ul>
      <h3 class="mt-2">Instellingen</h3>
      <p class="small">Thema, tekstgrootte, facilitatorpaneel, automatisch bewaren en meer vind je onder <b>Instellingen</b>.</p>
      <div class="row tight mt-1"><button class="btn" data-action="app-settings">${icon("settings", "s")} Instellingen openen</button><button class="btn danger" data-action="wipe-local">${icon("trash", "s")} Lokale gegevens wissen…</button></div>
      <p class="about-foot">Pink Elephant maakt IT persoonlijk · Better connected in The Digital Neighborhood</p>`,
  });
}

/* ---------- Instellingen (alleen deze browser; nooit in het ontwerpbestand) ---------- */
function showSettings() {
  const v = Prefs.v, rmSys = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const sw = (key, title, desc, on, dis = false) => `<label class="switch set-row${dis ? " disabled" : ""}"><input type="checkbox" role="switch" data-action="pref-toggle" data-key="${key}"${on ? " checked" : ""}${dis ? " disabled" : ""}><span class="track" aria-hidden="true"></span><span class="s-text"><b>${title}</b><span class="s-desc">${desc}</span></span></label>`;
  const seg = (key, title, desc, opts) => `<div class="set-row set-seg"><div class="s-text"><b id="set-${key}">${title}</b><span class="s-desc">${desc}</span></div><div class="row tight" role="group" aria-labelledby="set-${key}">${opts.map(([val, ic, t]) => `<button type="button" class="pill-toggle${v[key] === val ? " on" : ""}" data-action="pref-set" data-key="${key}" data-value="${val}" aria-pressed="${v[key] === val}">${ic ? icon(ic, "s") : `<span class="set-a${val === "large" ? " lg" : ""}" aria-hidden="true">A</span>`} ${t}</button>`).join("")}</div></div>`;
  const facOpen = !v.panelCollapsed;
  Modal.open({
    title: "Instellingen",
    wide: true,
    body: `<p class="small muted mb-1">Deze instellingen gelden alleen voor deze browser en komen niet in het ontwerpbestand of de exports.</p>
      <div class="set-grid">
        <section class="set-card" aria-labelledby="set-h-view"><h3 id="set-h-view">${icon("eye", "s")} Weergave</h3>
          ${seg("theme", "Thema", "Licht is de huisstijl; donker is prettig in een donkere ruimte.", [["light", "sun", "Licht"], ["dark", "moon", "Donker"]])}
          ${seg("textSize", "Tekstgrootte", "Groter lezen op een laptop of kleiner scherm.", [["normal", "", "Normaal"], ["large", "", "Groot"]])}
          ${sw("beamer", "Beamermodus", "Grote tekst voor presenteren; navigatie en facilitatorinhoud verborgen.", v.beamer)}
          ${sw("navCollapsed", "Compacte navigatie", "Linkermenu alleen met nummers, meer ruimte voor het werkgebied.", v.navCollapsed)}
          ${sw("calm", "Minder beweging", rmSys ? "Staat al aan via je systeeminstelling ‘beperkte beweging’." : "Geen animaties en overgangen (rustiger op een beamer).", v.calm || rmSys, rmSys)}
        </section>
        <section class="set-card" aria-labelledby="set-h-ws"><h3 id="set-h-ws">${icon("users", "s")} Workshop</h3>
          ${sw("facilitatorPanel", "Facilitatorpaneel tonen", "Timer, gespreksvragen, tips en besluiten rechts in beeld. Standaard uit; ook te openen met de paneelknop bovenin.", facOpen)}
          ${sw("showReviewed", "Knop ‘Markeer als besproken’", "Zet een stap op groen in de navigatie zodra hij met de klant is besproken.", v.showReviewed)}
          ${sw("explainOpen", "‘Meer uitleg’ standaard open", "Voor wie alle achtergrond direct wil zien. Standaard dicht, zodat elke pagina rustig blijft.", v.explainOpen)}
          ${sw("resume", "Verder waar je was", "Bij openen terug naar de laatst bekeken pagina. Uit = altijd beginnen bij Start.", v.resume)}
          ${sw("effects", "Feestelijke effecten", rmSys || v.calm ? "Uit zolang ‘Minder beweging’ aan staat." : "Confetti bij geslaagde scenario’s; standaard uit voor zakelijke presentaties.", v.effects && !reducedMotion(), rmSys || v.calm)}
        </section>
        <section class="set-card" aria-labelledby="set-h-data"><h3 id="set-h-data">${icon("shield", "s")} Gegevens &amp; privacy</h3>
          ${sw("autosave", "Automatisch bewaren in deze browser", "Uitzetten verwijdert ook de lokale kopie; bewaar je werk dan met Ctrl+S.", v.autosave)}
          <div class="row tight mt-1"><button type="button" class="btn" data-action="prefs-reset">${icon("redo", "s")} Instellingen terugzetten</button><button type="button" class="btn danger" data-action="wipe-local">${icon("trash", "s")} Lokale gegevens wissen…</button></div>
          <p class="xs muted mt-1">Terugzetten verandert alleen deze instellingen, niet je ontwerp.</p>
        </section>
      </div>`,
  });
}
/** Instelling toepassen en de rest van de app bijwerken (zonder het instellingenvenster te sluiten). */
function applyPref(k, val) {
  if (k === "facilitatorPanel") {
    UI.panelOverride = null; UI.beamerPanel = false;
    Prefs.v.panelCollapsed = !val; Prefs.v.panelOpenOn = {};
    WIDE_ROUTES.forEach((r) => { if (val) Prefs.v.panelOpenOn[r] = true; });
    Prefs.save(); Prefs.apply();
  } else if (k === "beamer") {
    UI.beamerNav = false; UI.beamerPanel = false; Prefs.set("beamer", !!val);
  } else if (k === "autosave") {
    Prefs.set("autosave", !!val); Store.autosave = !!val;
    if (Store.autosave) { Store.saveLocal(); Store.saveLocal.flush(); Toast.show("Automatisch bewaren staat aan.", "ok", 2500); }
    else { Store.clearLocal(); Toast.show("Automatisch bewaren staat uit en de lokale kopie is verwijderd. Sla je werk op met Ctrl+S.", "warn", 6000); }
  } else if (k === "effects") {
    Prefs.set("effects", !!val && !reducedMotion());
  } else if (k === "calm") {
    Prefs.set("calm", !!val); if (val) Prefs.set("effects", false);
  } else if (k === "explainOpen") {
    Prefs.set("explainOpen", !!val);
    if (UI.acc) Object.keys(UI.acc).forEach((x) => { if (/\|ph-/.test(x)) delete UI.acc[x]; });
  } else if (Object.hasOwn(PREFS_DEFAULTS, k) && typeof PREFS_DEFAULTS[k] === typeof val) {
    Prefs.set(k, val);
  }
  App.render();
}
Actions["app-settings"] = () => { Menu.close(true); showSettings(); };
Actions["pref-toggle"] = (el) => {
  applyPref(el.dataset.key, !!el.checked);
  if (Modal.cur && Modal.cur.title === "Instellingen" && ["calm", "effects"].includes(el.dataset.key)) { const k = el.dataset.key; showSettings(); const n = $(`#modal-root [data-key="${k}"]`); if (n) n.focus(); }
};
Actions["pref-set"] = (el) => {
  const k = el.dataset.key, val = el.dataset.value;
  if (!((k === "theme" && ["light", "dark"].includes(val)) || (k === "textSize" && ["normal", "large"].includes(val)))) return;
  applyPref(k, val);
  $$(`#modal-root [data-action="pref-set"][data-key="${k}"]`).forEach((b) => { const on = b.dataset.value === val; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); });
};
Actions["prefs-reset"] = () => {
  const keep = { autosave: Prefs.v.autosave, route: Prefs.v.route };
  Prefs.v = { ...JSON.parse(JSON.stringify(PREFS_DEFAULTS)), ...keep };
  UI.panelOverride = null; UI.navOverride = null; UI.beamerNav = false; UI.beamerPanel = false;
  Prefs.save(); Prefs.apply(); App.render(); showSettings();
  Toast.show("Instellingen teruggezet naar de standaard. Je ontwerp is niet gewijzigd.", "ok", 3500);
};
Actions["app-menu"] = (el) => Menu.open(el, [
  { icon: "plus", label: "Nieuw ontwerp", desc: "Begin met een leeg ontwerp of kies een voorbeeld", fn: () => IO.newDesign() },
  { icon: "open", label: "Ontwerp openen…", desc: "JSON-bestand (Ctrl+O), of sleep het op het venster", fn: () => IO.openJson() },
  { icon: "check", label: "Validatie & export", fn: () => App.go("export") },
  "-",
  { icon: "settings", label: "Instellingen", desc: "Thema, tekstgrootte, facilitatorpaneel, bewaren", fn: showSettings },
  { icon: "info", label: "Sneltoetsen", desc: "Ctrl+Z/Y · Ctrl+S · Ctrl+O · Ctrl+P · Esc", fn: showShortcuts },
  { icon: "shield", label: "Privacy & over deze tool", desc: `Versie ${APP_VERSION} · offline · automatisch bewaren`, fn: showAbout },
  "-",
  { icon: "trash", label: "Lokale gegevens wissen…", desc: "Ontwerp, geschiedenis en instellingen uit deze browser verwijderen", danger: true, fn: () => IO.wipe() },
]);
Actions["decision-add"] = (el) => {
  const ta = document.getElementById("dec-text");
  const text = ta ? ta.value.trim() : "";
  if (!text) { if (ta) ta.focus(); Toast.show("Typ eerst het besluit of het open punt.", "warn"); return; }
  const kind = el.dataset.kind === "park" ? "park" : "decision";
  Store.update((st) => { st.decisions = st.decisions || []; st.decisions.push({ id: uid("dec"), kind, text, route: UI.route, at: new Date().toISOString(), owner: "", due: "" }); });
  Toast.show(kind === "park" ? "Op de parkeerplaats gezet" : "Besluit vastgelegd", "ok", 1800);
  UI.decDraft = "";
  const n = document.getElementById("dec-text"); if (n) { n.value = ""; n.focus(); }
};
Actions["decision-del"] = (el) => Store.update((st) => { st.decisions = (st.decisions || []).filter((d) => d.id !== el.dataset.id); });

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => App.init());
else App.init();
