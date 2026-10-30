/* App-shell: navigatie, render-loop, topbalk, facilitatorpaneel, bestanden en initialisatie */
/* routes = workshopstappen (Vorige/Volgende, nummering en voortgang); refs = introductie/naslag: wel in menu en Start, geen stap. */
const NAV = [
  { group: "", routes: ["start"], refs: ["architectuur"] },
  { group: "Know your Data", routes: ["schema", "sits"] },
  { group: "Maatregelen", routes: ["board", "labels", "policies", "autolabel"] },
  { group: "Beleid & DLP", routes: ["dlp", "endpoint", "copilot", "scenarios"] },
  { group: "Adoptie", routes: ["adoption", "tenant", "besluiten", "export"] },
];
const JOURNEY_ROUTES = ["hub", "experience", "academy"];
/* Globale navigatie: één bovenbalk, op elke pagina gelijk. Onderdelen met `items` openen een uitklapmenu (disclosure);
   "start" opent de ontwerpworkshop. Op smalle schermen staat alles in één menupaneel (#site-menu). */
const SITE_NAV = [
  { route: "hub", title: "Home", short: "Home", icon: "home" },
  { route: "experience", title: "Ervaar Purview", short: "Ervaar", icon: "eye", items: [
    { sub: "intro", title: "Werkdagen", icon: "users", desc: "Kruip in de huid van een collega en maak keuzes. Je ziet direct wat Purview doet." },
    { sub: "library", title: "Scenario's", icon: "grid", desc: "Korte situaties uit de praktijk. Voorspel wat er gebeurt en bekijk het scherm." },
  ] },
  { route: "academy", title: "Leer Purview kennen", short: "Leer", icon: "book", items: [
    { sub: "home", title: "Leerpaden", icon: "route", desc: "Drie routes: Purview begrijpen, veilig werken en delen, invoering voorbereiden." },
    { sub: "lessons", title: "Alle lessen", icon: "book", desc: "Korte lessen met voorbeelden, oefeningen en een kennischeck." },
    { sub: "glossary", title: "Begrippenlijst", icon: "search", desc: "Alle Purview-termen in gewone taal uitgelegd." },
  ] },
  { route: "start", title: "Ontwerp je oplossing", short: "Ontwerp", icon: "layers" },
];
const isJourney = (r = UI.route) => JOURNEY_ROUTES.includes(r);
/* Route-iconen: ingeklapte navigatie en startpagina. */
const ROUTE_ICON = { hub: "app", experience: "eye", academy: "book", start: "app", architectuur: "layers", schema: "tag", sits: "search", board: "board", labels: "sliders", policies: "users", autolabel: "wand", dlp: "shield", endpoint: "laptop", copilot: "chat", scenarios: "route", adoption: "target", tenant: "server", besluiten: "flag", export: "download" };
/* Iconen per menugroep (startpagina). */
const GROUP_ICON = { "Know your Data": "search", Maatregelen: "tag", "Beleid & DLP": "shield", Adoptie: "users" };
const NAV_ROUTES = NAV.flatMap((g) => g.routes);
const REF_ROUTES = NAV.flatMap((g) => g.refs || []);
/* Alle menupagina's in menuvolgorde (stappen plus introductie), bijv. voor de richtagenda. */
const ALL_ROUTES = NAV.flatMap((g) => [...g.routes, ...(g.refs || [])]);
const HubRouter = {
  target(route, sub = "") {
    if (typeof route !== "string" || !Object.hasOwn(Views, route) || typeof sub !== "string" || sub.length > 160) return null;
    if (sub.split("/").some((x) => ["__proto__", "constructor", "prototype"].includes(x))) return null;
    const view = Views[route];
    if (view.normalizeSub) {
      sub = view.normalizeSub(sub || view.defaultSub || "");
      if (sub === null) return null;
    }
    return { route, sub, page: route + (sub ? "/" + sub : "") };
  },
  parse(value) {
    if (typeof value !== "string" || value.length > 200) return null;
    try {
      const parts = value.replace(/^#/, "").split("/").map(decodeURIComponent);
      return this.target(parts.shift(), parts.join("/"));
    } catch (e) { return null; }
  },
  href(route, sub = "") {
    const target = this.target(route, sub);
    if (!target) { console.error("Ongeldige paginalink:", route, sub); return "#hub"; }
    return "#" + target.page.split("/").map(encodeURIComponent).join("/");
  },
};
const PREFS_KEY = STORAGE_KEY + "-ui";
const ACK_KEY = "pyd-ack";            // sessionStorage: opstartdialoog in deze sessie beantwoord
const BUILD_STAMP = "__BUILD__";      // door build.py vervangen
const IMPORT_MAX = 5 * 1024 * 1024;   // 5 MB
/* Breakpoints (effectieve CSS-breedte: incl. browserzoom én de eigen weergavegrootte uiZoom): paneel als overlay < 1366, navigatie als iconen < 1100. */
const BP_PANEL = 1366, BP_NAV = 1100;
/* Systeeminstelling ‘beperkte beweging’; de gebruiker kan die in Instellingen voor deze app uitzetten (allowMotion). */
const systemReducedMotion = () => !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
const reducedMotion = () => { const v = typeof Prefs !== "undefined" && Prefs.v ? Prefs.v : {}; return !!(v.calm || (systemReducedMotion() && !v.allowMotion)); };

/* Brede werkpagina's: facilitatorpaneel standaard ingeklapt, tenzij de gebruiker het op die pagina zelf opende. */
const WIDE_ROUTES = ["board", "dlp", "endpoint", "copilot", "architectuur"];
/* Prefs-versies: 2 = paneel standaard dicht; 3 = uiZoom; 4 = hervatten op gevalideerde les-/rolpagina's. */
const PREFS_VERSION = 4;
/* Weergavegrootte in procenten: schaalt basis-fontgrootte, --fs-* en --sp-* (r8-zoom.css), geen CSS-transform. */
const ZOOM_MIN = 80, ZOOM_MAX = 150, ZOOM_STEP = 10;
const clampZoom = (z) => { const n = Number(z); return Number.isFinite(n) ? Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(n / ZOOM_STEP) * ZOOM_STEP)) : 100; };
/** Effectieve CSS-breedte voor de breakpoints: bij 150% gedraagt 1440px zich als 960px. */
const EW_STEPS = [1500, 1400, 1350, 1300, 1280, 1200, 1100, 1000, 900, 860, 760, 700, 640, 600];
const effWidth = () => Math.round((window.innerWidth || 1440) * 100 / clampZoom(typeof Prefs !== "undefined" && Prefs.v ? Prefs.v.uiZoom : 100));
const PREFS_DEFAULTS = {
  theme: "light", beamer: false, navCollapsed: false, panelCollapsed: true, panelOpenOn: {}, route: "hub", effects: false, autosave: true,
  uiZoom: 100, calm: false, explainOpen: false, showReviewed: true, resume: true, showTech: true, pickerMode: "compact", allowMotion: false,
  page: "hub", lastLearn: "", lastDesign: "start", pv: PREFS_VERSION,
};
const Prefs = {
  v: JSON.parse(JSON.stringify(PREFS_DEFAULTS)),
  load() {
    let hasTheme = false, pv = 0, legacyLarge = false;
    try {
      const o = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
      if (isPlainObj(o)) Object.keys(this.v).forEach((k) => { if (Object.hasOwn(o, k) && typeof o[k] === typeof this.v[k]) this.v[k] = o[k]; });
      hasTheme = isPlainObj(o) && (o.theme === "light" || o.theme === "dark");
      pv = isPlainObj(o) && typeof o.pv === "number" && Number.isFinite(o.pv) ? o.pv : 0;
      legacyLarge = isPlainObj(o) && o.textSize === "large";
    } catch (e) { /* standaardwaarden */ }
    // Eerste keer: altijd het lichte thema (huisstijl); daarna de eigen keuze via de themaknop.
    if (!hasTheme) this.v.theme = "light";
    if (pv < 2) { this.v.panelCollapsed = true; this.v.panelOpenOn = {}; }
    if (pv < 3) this.v.uiZoom = legacyLarge ? 120 : 100;
    if (pv < 4) this.v.page = this.v.route;
    for (const k of ["page", "lastLearn", "lastDesign"]) {
      const target = HubRouter.parse(this.v[k]);
      const allowed = target && (k === "page" || (k === "lastLearn" ? ["academy", "experience"].includes(target.route) : !isJourney(target.route)));
      this.v[k] = allowed ? target.page : PREFS_DEFAULTS[k];
    }
    this.v.pv = PREFS_VERSION;
    this.v.uiZoom = clampZoom(this.v.uiZoom);
    if (this.v.pickerMode !== "list") this.v.pickerMode = "compact";
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
    const z = this.v.uiZoom = clampZoom(this.v.uiZoom);
    document.documentElement.dataset.zoom = String(z);
    document.documentElement.style.setProperty("--ui-zoom", String(z / 100));
    delete document.documentElement.dataset.text;
    document.documentElement.dataset.tech = this.v.showTech === false ? "hide" : "show";
    document.documentElement.dataset.motion = reducedMotion() ? "reduce" : systemReducedMotion() ? "allow" : "auto";
    UI.facilitator = this.v.showReviewed !== false;
    const w = window.innerWidth || 1440, ew = effWidth();
    // CSS-mediaqueries kennen uiZoom niet: bij vergroten leest r8-zoom.css deze vlaggen (effectieve breedte <= grens).
    document.documentElement.dataset.ew = ew < w ? EW_STEPS.filter((b) => ew <= b).map((b) => "lt" + b).join(" ") : "";
    UI.overlay = ew < BP_PANEL;
    UI.narrowNav = ew < BP_NAV;
    if (this.v.beamer) {
      UI.navCollapsed = !UI.beamerNav;
      UI.panelCollapsed = !UI.beamerPanel;
    } else {
      UI.navCollapsed = UI.narrowNav ? (UI.navOverride != null ? UI.navOverride : true) : !!this.v.navCollapsed;
      UI.panelCollapsed = UI.overlay ? (UI.panelOverride != null ? !UI.panelOverride : true)
        : WIDE_ROUTES.includes(UI.route) ? !this.v.panelOpenOn[UI.route] : !!this.v.panelCollapsed;
    }
    // Hub-pagina's zijn een website zonder zijbalk: de stappennavigatie is dan dicht en niet bereikbaar.
    const journey = isJourney();
    if (journey) UI.navCollapsed = true;
    const app = $("#app");
    if (app) {
      app.classList.toggle("nav-collapsed", UI.navCollapsed); app.classList.toggle("panel-collapsed", UI.panelCollapsed);
      app.classList.toggle("panel-overlay", UI.overlay);
      const navButton = $('[data-action="toggle-nav"]');
      if (navButton) { navButton.setAttribute("aria-expanded", String(!UI.navCollapsed)); navButton.setAttribute("aria-controls", "sidenav"); }
      const nav = $("#sidenav");
      if (nav) nav.inert = journey || (w <= 600 && UI.navCollapsed);
      const main = $("#main");
      if (main) main.inert = !journey && w <= 600 && !UI.navCollapsed;
    }
  },
  set(k, val) { this.v[k] = val; this.save(); this.apply(); },
};

/* ---------- Bestanden ---------- */
const IO = {
  fileName(ext) { return exportFileName(S(), ext); },
  saveJson() {
    downloadText(JSON.stringify(stripPrivate(S()), null, 2), this.fileName("json"), "application/json");
    Toast.show(`${icon("save", "s")} JSON-download gestart. Controleer het bestand in je downloads.`, "ok");
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
    if (new TextEncoder().encode(String(text || "")).byteLength > IMPORT_MAX) { Toast.show("Bestand is groter dan 5 MB. Gebruik een kleiner ontwerpbestand.", "err", 6000); return; }
    let raw;
    try { raw = JSON.parse(String(text || "").replace(/^\uFEFF/, "")); } catch (e) { Toast.show(`${esc(name)} is geen geldig JSON-bestand.`, "err", 5000); return; }
    if (!isPlainObj(raw) || (raw.app !== undefined && raw.app !== "pyd-ipdlp-designer") || !Array.isArray(raw.labels)) {
      Toast.show(`${esc(name)} is geen ontwerp van deze Workshop Designer.`, "err", 5000); return;
    }
    let next, report;
    try {
      next = normalizeState(raw);
      report = { ...normalizeState.last, truncated: [...normalizeState.last.truncated], repaired: [...normalizeState.last.repaired] };
    } catch (e) {
      Toast.show(`Ontwerp kon niet worden geladen: ${esc(e.message)} Je huidige ontwerp is ongewijzigd.`, "err", 7000);
      return;
    }
    const go = () => {
      try {
        Store.replace(next);
        Store.recovery = null;
        Store.queueSave();
      } catch (e) {
        Toast.show("Ontwerp kon niet worden geladen. Je huidige ontwerp is ongewijzigd.", "err", 7000);
        return;
      }
      resetViewState();
      App.go("start");
      Toast.show(`${icon("open", "s")} Ontwerp <b>${esc(S().meta.customer || name)}</b> geladen – Ctrl+Z maakt dit ongedaan.`, "ok", 4500);
      if (report.newer) Toast.show("Beperkte import uitgevoerd. Controleer de keuzes met het oorspronkelijke bestand voordat je verdergaat.", "warn", 9000);
      else if (report.truncated.length) Toast.show(`Ontwerp ingekort: ${esc(report.truncated.join(", "))}.`, "warn", 9000);
    };
    if (report.newer || report.truncated.length || report.repaired.length) {
      Modal.open({
        title: report.newer ? "Nieuwere ontwerpversie" : "Ontwerp past niet volledig",
        body: `<p>${report.newer ? `Dit bestand gebruikt schema ${esc(report.fromVersion)}; deze app ondersteunt schema ${SCHEMA_VERSION}. Alleen ondersteunde instellingen kunnen betrouwbaar worden ingelezen. Nieuwe opties en ongeldige verwijzingen kunnen worden gewijzigd of genegeerd.` : "De volgende gegevens worden ingekort:"}</p>
          ${report.truncated.length ? `<p>Ingekort: ${esc(unique(report.truncated).join(", "))}.</p>` : ""}
          ${report.repaired.length ? `<p>Hersteld: ${esc(report.repaired.join(", "))}.</p>` : ""}
          <p>Bewaar eerst het oorspronkelijke bestand. Beperkt openen vervangt je huidige ontwerp; Ctrl+Z maakt dat ongedaan.</p>`,
        buttons: [
          { label: "Annuleren", primary: true },
          { label: "Origineel downloaden", fn: () => { downloadText(text, safeFileName(name.replace(/\.json$/i, "")) + "-origineel.json", "application/json"); return true; } },
          { label: "Beperkt openen", fn: go },
        ],
      });
    } else if (this.hasContent(S()) || Store.recovery) confirmDialog("Ontwerp openen?", "Het huidige ontwerp wordt vervangen. Sla het eerst op als je het wilt bewaren (je kunt het openen ook ongedaan maken).", go, "Openen");
    else go();
  },
  /** Heeft het huidige ontwerp iets dat verloren kan gaan? (vergelijkt met een leeg ontwerp) */
  hasContent(st) {
    if (!st) return false;
    const e = createEmptyState();
    const differs = (value, base, path = "") => {
      if (value === null || value === undefined || (typeof value === "string" && !value.trim())) return false;
      if (Array.isArray(value)) return value.some((v, i) => differs(v, (base || [])[i], path));
      if (typeof value === "object") return Object.keys(value).some((k) => {
        if (path === "meta" && ["created", "updated", "savedAt", "exportedAt"].includes(k)) return false;
        return differs(value[k], base && base[k], path ? `${path}.${k}` : k);
      });
      return value !== base;
    };
    return differs(stripPrivate(st), e);
  },
  newDesign() {
    confirmDialog("Nieuw ontwerp starten?", "Het huidige ontwerp wordt leeggemaakt en de ongedaan-maakgeschiedenis gewist. Sla het eerst op als JSON als je het wilt bewaren.", () => {
      Store.replace(createEmptyState(), false);
      Store.recovery = null;
      resetViewState();
      App.go("start");
    }, "Nieuw ontwerp", true);
  },
  /** Alle lokale gegevens wissen: ontwerp, ongedaan-maakgeschiedenis en weergave-instellingen. */
  wipe() {
    confirmDialog("Alle lokale gegevens wissen?", "Het ontwerp, de ongedaan-maakgeschiedenis, de leervoortgang en je weergave-instellingen worden uit deze browser verwijderd. Dit kan niet ongedaan worden gemaakt.", () => App.wipeNow(), "Wissen", true);
  },
};
/** Weergavestatus (niet opgeslagen) terugzetten na openen/nieuw ontwerp. */
function resetViewState() {
  UI.sub = {}; UI.dlpRule = 0; UI.dlpEdit = null; UI.selLabel = null; UI.sitEdit = null; UI.perOpen = null;
  UI.sitTest = {}; UI.scnPlayed = {}; UI.scnJust = null; UI.decDraft = ""; UI.decNewDraft = ""; UI.decFilter = "";
}

/* ---------- App ---------- */
const App = {
  _raf: 0,
  _valCache: { rev: -1, items: [] },
  val() {
    if (this._valCache.rev !== Store.rev || this._valCache.st !== Store.state) {
      let items = [];
      try { items = Validation.run(S()); } catch (e) {
        console.warn("Validatie-engine niet beschikbaar.");
        items = [{ ruleId: "PV-ENGINE", level: "err", route: "export", title: "Validatie niet beschikbaar", desc: "Download je ontwerp en heropen de app. Gereedheid kan niet worden vastgesteld.", blocking: true, category: "technisch", nextAction: "Heropen de app." }];
      }
      this._valCache = { rev: Store.rev, st: Store.state, items };
    }
    return this._valCache.items;
  },

  href(route, sub = "") { return HubRouter.href(route, sub); },
  rememberPage(target, save = true) {
    Prefs.v.route = target.route;
    Prefs.v.page = target.page;
    if (["academy", "experience"].includes(target.route) && !["home", "lessons", "intro", "glossary"].includes(target.sub) && !/^library(\/[^/]+)?$/.test(target.sub)) Prefs.v.lastLearn = target.page;
    if (!isJourney(target.route)) Prefs.v.lastDesign = target.page;
    if (save) Prefs.save();
  },
  go(route, sub, options = {}) {
    SiteNav.closeAll(false);
    const rawSub = sub == null || sub === "" ? (isJourney(route) ? Views[route]?.defaultSub || "" : UI.sub[route] || "") : sub;
    let target = HubRouter.target(route, rawSub);
    if (!target) {
      Toast.show("Deze pagina is niet beschikbaar. Kies een ingang op Home.", "warn", 5000);
      target = HubRouter.target("hub");
    }
    if (options.history === "none" && this._page === target.page) return;
    route = target.route;
    const changed = UI.route !== route || UI.sub[route] !== target.sub;
    UI.sub[route] = target.sub;
    UI.route = route;
    this._page = target.page;
    this.rememberPage(target);
    const hash = HubRouter.href(route, target.sub);
    if (options.history !== "none" && location.hash !== hash) {
      history[options.history === "replace" ? "replaceState" : "pushState"]({ pydPage: target.page }, "", hash);
    }
    if (changed) {
      if (window.innerWidth <= 600) { UI.navOverride = true; UI.beamerNav = false; }
      if (Drawer.isOpen()) Drawer.close();
      Menu.close(true);
      if (UI.overlay) { if (Prefs.v.beamer) UI.beamerPanel = false; else UI.panelOverride = null; }
      Prefs.apply();
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

  /** Vorige/volgende stap in de bovenbalk (altijd zichtbaar, ook op lange pagina's). */
  pager() {
    const navR = NAV_ROUTES.filter((r) => Object.hasOwn(Views, r)), i = navR.indexOf(UI.route);
    const b = (r, cls, lbl, html) => `<button type="button" class="btn ${cls}" data-action="go" data-route="${esc(r)}" title="${esc(lbl)}" aria-label="${esc(lbl)}">${html}</button>`;
    const nextBtn = (r) => b(r, "", `Volgende stap: ${Views[r].title}`, `<span class="sp-dir">Volgende</span><span class="sp-name">${esc(Views[r].title)}</span>${icon("chevronright", "s")}`);
    if (i < 0) {
      // Introductie (bijv. referentiearchitectuur): geen stapnummer; terug naar Start of door naar de eerste stap.
      if (!REF_ROUTES.includes(UI.route) || !Object.hasOwn(Views, UI.route) || !navR.length) return "";
      const first = navR[1];
      return `${b(navR[0], "subtle", `Terug naar ${Views[navR[0]].title}`, icon("chevronleft", "s"))}<span class="sp-pos" title="Introductie – telt niet mee als stap">Intro</span>${first ? nextBtn(first) : ""}`;
    }
    const prev = navR[i - 1], next = navR[i + 1];
    return `${prev ? b(prev, "subtle", `Vorige stap: ${Views[prev].title}`, icon("chevronleft", "s")) : ""}<span class="sp-pos" title="Stap ${i + 1} van ${navR.length}">${i + 1}/${navR.length}</span>${next ? nextBtn(next) : ""}`;
  },

  render(o = {}) {
    const main = $("#main");
    if (!main) return;
    const journey = JOURNEY_ROUTES.includes(UI.route);
    const app = $("#app");
    if (app) app.classList.toggle("journey", journey);
    document.documentElement.dataset.journey = journey ? "true" : "false";
    // focus en scroll bewaren
    const a = document.activeElement;
    let fr = null, near = null, selS = null, selE = null;
    if (a && a !== document.body && (main.contains(a) || $("#sidepanel").contains(a))) {
      fr = _rememberFocus();
      near = _rememberNear(a, main.contains(a) ? main : $("#sidepanel"));
      if (near) near.panel = !main.contains(a);
      try { selS = a.selectionStart; selE = a.selectionEnd; } catch (e) { /* geen tekstveld */ }
    }
    const keep = [".board-wrap", ".lib-scroll", ".scroll-x", ".table-wrap", ".code"];
    const scrolls = o.resetScroll ? [] : keep.map((s) => $$(s, main).map((el) => [el.scrollTop, el.scrollLeft]));
    const mainTop = o.resetScroll ? 0 : main.scrollTop, panelTop = this._facRoute === UI.route ? $("#sidepanel").scrollTop : 0;
    // open/dicht-stand van inklapbare secties bewaren (per route + data-acc-sleutel)
    UI.acc = UI.acc || {};
    $$("details[data-acc]", document).forEach((d) => { UI.acc[UI.route + "|" + d.dataset.acc] = d.open; });

    this.renderTopbar();
    this.renderNav();
    const v = Views[UI.route];
    try {
      main.innerHTML = v ? v.render() : msg("err", "Onbekende pagina.");
      if (journey && Learning.error) {
        main.insertAdjacentHTML("afterbegin", `<div class="learning-notice" role="alert"><span>${esc(Learning.error)}</span><button class="btn small" data-action="${Learning.blocked ? "learning-clear" : "learning-retry"}">${Learning.blocked ? "Leervoortgang wissen" : "Opnieuw bewaren"}</button></div>`);
      }
      if (v && v.after) v.after(main);
      if (typeof VH !== "undefined" && VH.clampFit) VH.clampFit(main);
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
      // Element vervangen of verdwenen: equivalent, anders een buur, anders #main – focus mag nooit naar <body> vallen.
      const n = _findFocus(fr, main) || _findFocus(fr, $("#sidepanel")) || _findNear(near, near && near.panel ? $("#sidepanel") : main) || main;
      if (n) { n.focus({ preventScroll: true }); try { if (selS != null) n.setSelectionRange(selS, selE); } catch (e) { /* select/checkbox */ } }
    }
    if (typeof DnD !== "undefined") DnD.refresh();
    if (typeof Tip !== "undefined") Tip.hide();
  },

  renderTopbar() {
    const journey = JOURNEY_ROUTES.includes(UI.route);
    const st = S(), m = st.meta || {};
    const ws = (CATALOG.workshops || []).find((w) => (w.id || w.key) === m.workshop);
    const navR = NAV_ROUTES.filter((r) => Object.hasOwn(Views, r)), idx = navR.indexOf(UI.route);
    const crumb = Prefs.v.beamer && (idx >= 0 || REF_ROUTES.includes(UI.route)) && Views[UI.route] ? ` · <span class="topbar-crumb">${esc(Views[UI.route].title)}</span>` : "";
    const cust = m.customer || "Nieuw ontwerp";
    const extra = `${!Prefs.v.beamer && m.date ? ` · ${esc(fmtDate(m.date))}` : ""}${!Prefs.v.beamer && ws ? ` · ${esc(ws.name)}` : ""}${crumb}`;
    const tc = $("#topbar-customer");
    if (journey) { tc.innerHTML = ""; tc.hidden = true; tc.title = ""; }
    else { tc.hidden = false; tc.innerHTML = `<b class="tc-name">${esc(cust)}</b>${extra ? `<span class="tc-extra">${extra}</span>` : ""}`; tc.title = tc.textContent; }
    const ib = (act, ic, title, dis, extra = "", label = title) => `<button class="icon-btn" data-action="${act}" title="${esc(title)}" aria-label="${esc(label)}"${dis ? " disabled" : ""}${extra}>${icon(ic)}</button>`;
    const saveTxt = Store.storageText();
    const site = $("#site-nav");
    if (site) {
      const html = this.siteNav();
      // Alleen vervangen als er iets veranderde: een open uitklapmenu en de focus erin blijven dan behouden.
      if (site._html !== html) { site.innerHTML = html; site._html = html; SiteNav.restore(); }
    }
    const sm = $("#site-menu");
    if (sm) { const html = this.siteMenu(); if (sm._html !== html) { sm.innerHTML = html; sm._html = html; } }
    const sa = $("#site-actions");
    if (sa) sa.innerHTML = `<button type="button" class="site-menu-btn" data-action="site-menu" aria-expanded="${SiteNav.menu}" aria-controls="site-menu">${icon(SiteNav.menu ? "x" : "menu", "s")}<span>Menu</span></button>${ib("toggle-theme", Prefs.v.theme === "dark" ? "sun" : "moon", Prefs.v.theme === "dark" ? "Licht thema" : "Donker thema", false, ` aria-pressed="${Prefs.v.theme === "dark"}"`, "Thema wijzigen")}${ib("app-settings", "settings", "Instellingen")}${ib("app-menu", "more", "Meer")}`;
    const tools = $("#tb-tools");
    if (tools) tools.hidden = journey;
    const back = !journey && HubRouter.parse(Prefs.v.lastLearn);
    $("#topbar-actions").innerHTML = journey ? ""
      : `${back ? `${Site.a(back.route, back.sub, `${icon("book", "s")} <span class="tb-label">Verder leren</span>`, "btn small tb-learn", 'title="Verder waar u was in Leer Purview kennen of Ervaar Purview"')}<span class="sep"></span>` : ""}
      <button type="button" id="save-ind" class="save-ind" data-action="storage-details" data-state="${esc(Store.storageState())}" title="Bewaard in deze browser (lokaal). Klik voor bewaren en herstellen."><i class="save-dot" aria-hidden="true"></i><span data-save-status role="status" aria-live="polite">${esc(saveTxt)}</span></button>
      ${ib("undo", "undo", Store.canUndo() ? "Ongedaan maken (Ctrl+Z)" : "Geen stappen – ongedaan maken werkt binnen deze sessie", !Store.canUndo(), "", "Ongedaan maken")}${ib("redo", "redo", Store.canRedo() ? "Opnieuw (Ctrl+Y)" : "Niets om opnieuw te doen", !Store.canRedo(), "", "Opnieuw")}<span class="sep"></span>
      <button class="btn small tb-export" data-action="export-menu" title="Exporteren">${icon("download", "s")} <span class="tb-label">Exporteren</span></button><span class="sep"></span>
      ${zoomStepper()}<span class="sep"></span>
      ${ib("toggle-beamer", "projector", "Beamermodus (grotere tekst, facilitatorinhoud verborgen)", false, ` aria-pressed="${!!Prefs.v.beamer}"`, "Beamermodus")}
      ${ib("toggle-panel", "panel", UI.panelCollapsed ? "Facilitatorpaneel tonen" : "Facilitatorpaneel verbergen", false, ` aria-expanded="${!UI.panelCollapsed}" aria-controls="sidepanel"`, "Facilitatorpaneel")}`;
    const sp = $("#topbar-steps");
    if (sp) {
      sp.innerHTML = journey ? "" : this.pager();
      sp.hidden = !sp.innerHTML;
    }
    const mi = $("#ico-menu"); if (mi && !mi.innerHTML) mi.innerHTML = icon("menu");
    this.fitTopbar();
  },

  /** Klantnaam heeft voorrang in de topbalk: past hij niet, dan verdwijnen eerst de staptitel in ‘Volgende’,
      daarna datum/onderdeel en de ondertitel van de app, de tekst bij ‘Bewaard’, ‘Volgende’ en stapnummer en de zoomknoppen (data-fit f1–f5). */
  fitTopbar() {
    const c = $("#topbar-customer"), bar = c && c.closest(".topbar"), nm = c && c.querySelector(".tc-name");
    if (!bar || !nm) return;
    bar.dataset.fit = "";
    if (!c.offsetParent) return;
    const cut = () => {
      const r = c.getBoundingClientRect(), cap = parseFloat(getComputedStyle(c).maxWidth);
      return nm.getBoundingClientRect().right > r.right + 0.5 && !(cap > 0 && r.width >= cap - 1);
    };
    const add = (t) => { bar.dataset.fit = `${bar.dataset.fit} ${t}`.trim(); };
    let lv = 1;
    const shrink = () => { for (; lv <= 5 && cut(); lv++) add(`f${lv}`); };
    shrink();
    // Past de naam wel, maar datum/onderdeel niet helemaal: liever weglaten dan half afkappen.
    // Zonder die extra tekst krimpt het vak mee; daarna opnieuw controleren of de naam nog past.
    if (!/\bf2\b/.test(bar.dataset.fit) && c.scrollWidth > c.clientWidth + 1) { add("fx"); shrink(); }
  },

  /** Globale navigatie (Home, Ervaar, Leer, Ontwerp): overal gelijk. Ervaar en Leer zijn knoppen met een uitklapmenu;
      Ontwerp is actief op alle pagina's van de ontwerpworkshop. Smal: alleen het korte woord (de volledige naam blijft de toegankelijke naam). */
  siteNav() {
    const cur = isJourney() ? UI.route : "start";
    return SITE_NAV.map((e) => {
      const on = cur === e.route, label = `${icon(e.icon, "s")}<span class="sl-long">${esc(e.title)}</span><span class="sl-short">${esc(e.short)}</span>`;
      if (!e.items) {
        const sub = Views[e.route]?.defaultSub || "";
        return `<a class="site-link${on ? " on" : ""}" href="${esc(this.href(e.route, sub))}" data-action="go" data-route="${e.route}" data-sub="${esc(sub)}" aria-label="${esc(e.title)}"${on ? ' aria-current="page"' : ""}>${label}</a>`;
      }
      const id = "dd-" + e.route;
      return `<div class="site-dd${on ? " on" : ""}" data-dd="${e.route}"><button type="button" class="site-link site-dd-btn${on ? " on" : ""}" data-action="site-dd" data-route="${e.route}" aria-expanded="false" aria-controls="${id}" aria-label="${esc(e.title)}"${on ? ' aria-current="true"' : ""}>${label}${icon("chevrondown", "s dd-chev")}</button>
        <div class="site-dd-panel" id="${id}" hidden><p class="site-dd-kop" aria-hidden="true">${esc(e.title)}</p>${this.siteItems(e, on, "site-dd-item")}${this.siteResume(e)}</div></div>`;
    }).join("");
  },
  /** Actief subonderdeel van Ervaar of Leer (voor aria-current in het menu). */
  siteSub(route) { const v = Views[route]; return v && v.navSub ? v.navSub() : ""; },
  siteItems(e, on, cls) {
    const act = on ? this.siteSub(e.route) : "";
    return e.items.map((it) => `<a class="${cls}${act === it.sub ? " on" : ""}" href="${esc(this.href(e.route, it.sub))}" data-action="go" data-route="${e.route}" data-sub="${esc(it.sub)}"${act === it.sub ? ' aria-current="page"' : ""}><span class="site-dd-ic" aria-hidden="true">${icon(it.icon)}</span><span class="site-dd-t"><b>${esc(it.title)}</b><small>${esc(it.desc)}</small></span></a>`).join("");
  },
  /** ‘Ga verder waar je was’ in het menu van Leer of Ervaar. */
  siteResume(e) {
    const r = HubRouter.parse(Prefs.v.lastLearn);
    if (!r || r.route !== e.route) return "";
    let what = "";
    const part = r.sub.split("/");
    try { what = e.route === "academy" ? (ACV.mod(part[1]) || {}).title || "" : part[0] === "library" ? (XLib.find(part[2]) || {}).title || "" : (CATALOG.experience.roles.find((x) => x.id === part[1]) || {}).title || ""; } catch (err) { what = ""; }
    return `<a class="site-dd-resume" href="${esc(this.href(r.route, r.sub))}" data-action="go" data-route="${r.route}" data-sub="${esc(r.sub)}">${icon("bookmark", "s")}<span>Ga verder waar je was${what ? `: <b>${esc(what)}</b>` : ""}</span>${icon("chevronright", "s")}</a>`;
  },
  /** Menupaneel voor smalle schermen: alle onderdelen en subonderdelen onder elkaar. */
  siteMenu() {
    const cur = isJourney() ? UI.route : "start";
    return SITE_NAV.map((e) => {
      const on = cur === e.route, sub = Views[e.route]?.defaultSub || "";
      const head = e.items ? `<p class="site-menu-h${on ? " on" : ""}">${icon(e.icon, "s")}<span>${esc(e.title)}</span></p>`
        : `<a class="site-menu-h${on ? " on" : ""}" href="${esc(this.href(e.route, sub))}" data-action="go" data-route="${e.route}" data-sub="${esc(sub)}"${on ? ' aria-current="page"' : ""}>${icon(e.icon, "s")}<span>${esc(e.title)}</span></a>`;
      return `<div class="site-menu-group">${head}${e.items ? this.siteItems(e, on, "site-menu-item") : ""}</div>`;
    }).join("");
  },

  /** Navigatie; HTML gememoiseerd per rev + route (typen in een veld rendert de nav dan niet opnieuw). */
  renderNav() {
    const st = S(), m = st.meta || {};
    const key = `${Store.rev}|${UI.route}|${Prefs.v.beamer}`;
    const nav = $("#sidenav");
    if (this._navKey === key && this._navSt === st && nav.innerHTML) return;
    if (isJourney()) {
      nav.innerHTML = "";
      this._navKey = null; this._navSt = null;
      return;
    }
    const items = this.val();
    const empty = !(st.labels || []).length;
    let rd = null; try { rd = Validation.readiness(st); } catch (e) { console.error(e); }
    const scn = Validation.scenarioCover ? Validation.scenarioCover(st) : null;
    const head = !rd
      ? `<div class="nav-progress">${msg("err", "Gereedheid niet beschikbaar. Download je ontwerp en heropen de app.")}</div>`
      : empty
      ? `<div class="nav-progress nav-empty"><div class="xs muted">Nog geen labels in dit ontwerp.</div><div class="xs mt-1 nav-alt"><a href="#start" data-action="go" data-route="start">Kies een voorbeeldontwerp</a></div></div>`
      : `<div class="nav-progress">
          <div class="row between xs" title="Stappen waarin de belangrijkste keuzes zijn gemaakt (ingevuld of besproken)"><span>${esc(rd.design.label)}</span><b>${esc(rd.design.text)}</b></div>${meter(rd.design.stepPct)}
          <div class="np-sub xs muted"><span title="Geen fouten, labelscope, groepen en domeinen, verplichte randvoorwaarden en besluiten met eigenaar. Zegt niets over de werking in een tenant.">${esc(rd.rollout.label)} <b>${esc(rd.rollout.text)}</b></span>${scn ? `<span title="Automatische ontwerpcheck van de praktijkscenario’s (geen tenanttest). Speel ze af op het scherm Scenario’s.">${esc(scn.label)} <b>${esc(scn.text)}</b></span>` : ""}</div>
          <div class="nav-legend xs muted" aria-hidden="true"><span><i class="st st-open"></i>Nog niet ingevuld</span><span><i class="st st-pre"></i>Ingevuld</span><span><i class="st st-done">${icon("check", "s")}</i>Besproken</span></div></div>`;
    const stateOf = (r) => {
      const v = Views[r];
      const reviewed = !!(m.reviewed && m.reviewed[r]) || (r === "export" && !!m.exportedAt);
      let done = false; if (!empty && !reviewed) { try { done = !!(v.done && v.done(st)); } catch (e) { /* negeren */ } }
      return { reviewed, done };
    };
    nav.innerHTML = `${head}
      ${NAV.map((g) => {
        const rs = g.routes.filter((r) => Views[r]);
        const states = rs.map(stateOf);
        const nDone = states.filter((s) => s.reviewed).length;
        const gh = g.group ? `<div class="nav-group"><span>${esc(g.group)}</span>${!empty ? `<span class="nav-gcount" title="${nDone} van ${rs.length} besproken">${nDone}/${rs.length}</span>` : ""}</div>` : `<div class="nav-group nav-group-top" aria-hidden="true"></div>`;
        return gh + rs.map((r, i) => {
        const v = Views[r], { reviewed, done } = states[i];
        const mine = items.filter((x) => x.route === r);
        const err = mine.filter((x) => x.level === "err").length, warn = mine.filter((x) => x.level === "warn").length;
        const nb = empty ? "" : err ? `<span class="nb err" title="${err} fout(en)">${err}</span>` : warn ? `<span class="nb warn" title="${warn} waarschuwing(en)">${warn}</span>` : "";
        const stat = reviewed ? (r === "export" && !(m.reviewed || {})[r] ? "afdruk/download gestart" : "besproken") : done ? "ingevuld, nog niet besproken" : "nog niet ingevuld";
        const cls = reviewed ? "st-done" : done ? "st-pre" : "st-open";
        return `<button class="nav-item${UI.route === r ? " on" : ""}${reviewed ? " done" : done ? " prefilled" : ""}" data-action="go" data-route="${r}" title="${esc(v.title + " – " + stat)}"${UI.route === r ? ' aria-current="page"' : ""}><span class="num nav-ico" aria-hidden="true">${icon(ROUTE_ICON[r] || "info", "s")}<i class="st ${cls}">${reviewed ? icon("check", "s") : ""}</i></span><span class="nav-text">${esc(v.title)}<span class="sr-only"> (${esc(stat)})</span></span>${nb}<i class="st nav-st ${cls}" aria-hidden="true">${reviewed ? icon("check", "s") : ""}</i></button>`;
      }).join("") + (g.refs || []).filter((r) => Views[r]).map((r) => `<button class="nav-item nav-ref${UI.route === r ? " on" : ""}" data-action="go" data-route="${r}" title="${esc(Views[r].title)} – introductie, telt niet mee als stap"${UI.route === r ? ' aria-current="page"' : ""}><span class="num nav-ico" aria-hidden="true">${icon(ROUTE_ICON[r] || "info", "s")}</span><span class="nav-text">${esc(Views[r].title)}<span class="sr-only"> (introductie, geen stap)</span></span></button>`).join("");
      }).join("")}`;
    this._navKey = key; this._navSt = st;
  },

  renderPanel() {
    const p = $("#sidepanel");
    if (!p) return;
    if (JOURNEY_ROUTES.includes(UI.route)) { p.innerHTML = ""; this._facRoute = null; return; }
    if (UI.panelCollapsed) { p.innerHTML = ""; this._facRoute = null; return; }
    const st = S(), v = Views[UI.route] || {}, f = v.fac || {};
    // Open/dicht-stand van de naslag bewaren per pagina. Eigen attribuut (data-fac-acc), zodat de algemene
    // data-acc-administratie in render() bij een routewissel de paneelstand niet onder de nieuwe route opslaat.
    UI.facAcc = UI.facAcc || {};
    if (this._facRoute) $$("details[data-fac-acc]", p).forEach((d) => { UI.facAcc[this._facRoute + "|" + d.dataset.facAcc] = d.open; });
    if (this._facRoute !== UI.route) { this._facRoute = UI.route; p.scrollTop = 0; }
    // Vaste opbouw: Doel · Kernvragen · Let op · Naslag (ingeklapt: aanpak, spelregels, Microsoft Learn) · Besluiten.
    const strs = (a) => (Array.isArray(a) ? a.filter((x) => typeof x === "string" && x) : []);
    const items = (a) => a.map((x) => `<li>${esc(x)}</li>`).join("");
    const sec = (key, ic, title, body) => `<section class="fac-sec fac-${key}" aria-labelledby="fac-h-${key}"><h3 class="fac-h" id="fac-h-${key}"><span class="fac-ico" aria-hidden="true">${icon(ic, "s")}</span><span>${title}</span></h3>${body}</section>`;
    const ref = (key, ic, title, n, body) => {
      const k = UI.route + "|" + key, open = k in UI.facAcc ? !!UI.facAcc[k] : false;
      return `<details class="acc fac-ref" data-fac-acc="${key}"${open ? " open" : ""}><summary><span class="fac-ico" aria-hidden="true">${icon(ic, "s")}</span><span class="fac-ref-t">${title}</span>${n ? `<span class="badge neutral">${n}<span class="sr-only"> punten</span></span>` : ""}</summary><div class="acc-body">${body}</div></details>`;
    };
    const qs = strs(f.questions), tips = strs(f.tips), warn = strs(f.pitfalls);
    const links = (f.links || []).filter((k) => CATALOG.learn && CATALOG.learn[k]);
    const rulesHtml = f.rules && typeof facRulesHtml === "function" ? facRulesHtml(f.rules, st) : "";
    const refHtml = (tips.length ? ref("fac-aanpak", "bulb", "Aanpak in de sessie", tips.length, `<ul class="fac-list">${items(tips)}</ul>`) : "") + rulesHtml
      + (links.length ? ref("fac-learn", "book", "Microsoft Learn", links.length, `<ul class="fac-links">${links.map((k) => `<li>${learn(k)}</li>`).join("")}</ul>`) : "");
    const decs = (st.decisions || []).slice().reverse();
    const routeName = (r) => (Views[r] ? Views[r].title : r || "");
    const dec = (d) => { const [sl, si] = DECISION_STATUS_META[d.status] || DECISION_STATUS_META.open; return `<div class="decision" data-focus-key="dec-${esc(d.id)}"><span title="${esc(sl)}">${icon(si, "s")}</span><div class="d-text">${esc(d.text)}${d.route ? `<div class="xs muted"><a href="#${esc(d.route)}" data-action="go" data-route="${esc(d.route)}">${esc(routeName(d.route))}</a>${d.at ? ` · ${esc(new Date(d.at).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }))}` : ""}</div>` : ""}
      <div class="dec-meta"><input class="input dec-owner" data-bind="dec:${esc(d.id)}:owner" value="${esc(d.owner || "")}" maxlength="120" placeholder="Eigenaar (bijv. CISO)" aria-label="Eigenaar van ${d.status === "besloten" ? "besluit" : "open punt"}"><input class="input dec-due" type="date" data-bind="dec:${esc(d.id)}:due" value="${esc(/^\d{4}-\d{2}-\d{2}$/.test(d.due || "") ? d.due : "")}" aria-label="Deadline" title="Deadline"></div></div>
      <button class="icon-btn small" data-action="decision-del" data-id="${esc(d.id)}" title="Verwijderen" aria-label="Verwijderen">${icon("x", "s")}</button></div>`; };
    const rb = NAV_ROUTES.includes(UI.route) ? reviewedButton(UI.route) : "";
    p.innerHTML = `<div class="fac">
      <header class="fac-head">
        <div class="fac-head-row">
          <div class="fac-head-t"><div class="eyebrow">Facilitator</div><h2 class="fac-title">${esc(v.title || "")}</h2></div>
          <button type="button" class="icon-btn small fac-close" data-action="fac-close" aria-label="Facilitatorpaneel sluiten" title="Facilitatorpaneel sluiten">${icon("x", "s")}</button>
        </div>
        ${rb ? `<div class="fac-head-meta">${rb}</div>` : ""}
      </header>
      <div class="fac-body">
        ${f.goal ? sec("goal", "target", "Doel van dit onderdeel", `<p class="fac-goal-t">${esc(f.goal)}</p>`) : ""}
        ${qs.length ? sec("qs", "question", "Kernvragen aan de klant", `<ol class="fac-list fac-qlist">${items(qs)}</ol>`) : ""}
        ${warn.length ? sec("warn", "warning", "Let op", `<ul class="fac-list fac-wlist">${items(warn)}</ul>`) : ""}
        ${!f.goal && !qs.length && !warn.length ? `<p class="xs muted">Geen facilitatornotities voor deze pagina.</p>` : ""}
        ${refHtml ? sec("ref", "layers", "Naslag", `<div class="fac-refs">${refHtml}</div>`) : ""}
        ${sec("dec", "flag", "Besluiten &amp; open punten", `
        <textarea id="dec-text" class="textarea" rows="2" placeholder="Besluit of open punt… (Enter = besluit)" aria-label="Besluit of open punt">${esc(UI.decDraft || "")}</textarea>
        <div class="row tight mt-1 mb-1"><button class="btn small primary" data-action="decision-add" data-kind="decision">${icon("check", "s")} Besluit</button><button class="btn small" data-action="decision-add" data-kind="park">${icon("clock", "s")} Open punt</button>${Views.besluiten ? `<button class="btn small subtle" data-action="go" data-route="besluiten">Alles bekijken</button>` : ""}</div>
        ${decs.length ? decs.slice(0, 8).map(dec).join("") : `<p class="xs muted">Nog niets vastgelegd.</p>`}`)}
      </div>
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
    if (Store.recovery) { showStorage(); return; }
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
    if (!Store.clearLocal()) return;
    Store.replace(createEmptyState(), false);
    if (!Store.clearLocal()) return;
    resetViewState();
    if (soft) { App.go("start"); Toast.show("Lokale ontwerpgegevens gewist – je begint met een leeg ontwerp.", "ok", 4000); return; }
    if (!Learning.clearAll()) return;
    this._wiping = true;
    try { localStorage.removeItem(PREFS_KEY); localStorage.removeItem(STORAGE_KEY + "-coach"); sessionStorage.removeItem(ACK_KEY); } catch (e) {
      this._wiping = false;
      Toast.show("Weergavegegevens konden niet worden gewist. Wis de sitegegevens via je browserinstellingen.", "err", 9000);
      return;
    }
    location.hash = "";
    location.reload();
  },

  init() {
    Prefs.load();
    Prefs.apply();
    Store.init();
    initBindings();
    SiteNav.init();
    if (typeof Tip !== "undefined") Tip.init();
    if (typeof DnD !== "undefined") DnD.init();
    Bus.on("change", (e) => App.schedule(e && e.silent));
    Bus.on("storage", () => {
      $$("[data-save-status]").forEach((el) => { el.textContent = Store.storageText(); });
      const si = $("#save-ind"); if (si) si.dataset.state = Store.storageState();
    });
    document.addEventListener("keydown", (e) => {
      const t = e.target, editable = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      const mod = e.ctrlKey || e.metaKey, k = String(e.key || "").toLowerCase();
      const modal = !!Modal.cur || !!($("#modal-root") && $("#modal-root").innerHTML.trim());
      const picking = typeof DnD !== "undefined" && DnD.pick;
      if (e.key === "Escape") {
        if (e.defaultPrevented || modal || picking) return;
        if (Drawer.isOpen()) { e.preventDefault(); Drawer.close(); return; }
        if (window.innerWidth <= 600 && !UI.navCollapsed) { e.preventDefault(); Actions["toggle-nav"](); return; }
        if (UI.overlay && !UI.panelCollapsed && !Menu.isOpen()) { e.preventDefault(); App.closeOverlay(true); }
        return;
      }
      if (window.innerWidth <= 600 && !UI.navCollapsed && !modal) { _trapTab(e, $("#sidenav")); return; }
      if (modal || Drawer.isOpen()) return; // sneltoetsen staan uit zolang een dialoog of zijpaneel open is
      if (t && t.id === "dec-text" && e.key === "Enter" && !e.shiftKey) { e.preventDefault(); Actions["decision-add"]({ dataset: { kind: "decision" } }); return; }
      if (t && t.id === "dec-new" && e.key === "Enter") { e.preventDefault(); Actions["decision-add"]({ dataset: { input: "dec-new", statusSelect: "dec-new-status" } }); return; }
      if (mod && !e.altKey && k === "s") { e.preventDefault(); IO.saveJson(); return; }
      if (mod && !e.altKey && k === "p") { e.preventDefault(); DocExport.print(); return; }
      if (mod && !e.altKey && k === "o") { e.preventDefault(); IO.openJson(); return; }
      if (editable || isJourney()) return;
      if (mod && !e.shiftKey && k === "z") { e.preventDefault(); Store.undo(); return; }
      if (mod && (k === "y" || (e.shiftKey && k === "z"))) { e.preventDefault(); Store.redo(); return; }
    });
    document.addEventListener("input", (e) => { if (e.target && e.target.id === "dec-text") UI.decDraft = e.target.value; if (e.target && e.target.id === "dec-new") UI.decNewDraft = e.target.value; });
    // Overlay-paneel: klik buiten het paneel sluit het.
    document.addEventListener("pointerdown", (e) => {
      if (window.innerWidth <= 600 && !UI.navCollapsed && !e.target.closest("#sidenav, [data-action='toggle-nav'], #modal-root")) Actions["toggle-nav"]();
      if (!UI.overlay || UI.panelCollapsed) return;
      const t = e.target;
      if (!t || !t.closest || t.closest("#sidepanel, [data-action='toggle-panel'], #modal-root, #drawer-root, .menu, .tooltip, #toast-root")) return;
      App.closeOverlay(false);
    });
    // Breakpoints opnieuw bepalen bij resize/zoom; een expliciete keuze geldt tot de volgende grensovergang.
    window.addEventListener("resize", debounce(() => { if (reflowBreakpoints()) { App.renderTopbar(); App.renderPanel(); } else App.fitTopbar(); }, 150));
    // Logo's, lettertypen en de bewaartekst kunnen na de weergave nog van breedte veranderen: klantnaam opnieuw passend maken.
    if (typeof ResizeObserver === "function") {
      const ro = new ResizeObserver(debounce(() => App.fitTopbar(), 50));
      [$(".topbar .brand"), $("#topbar-actions")].forEach((el) => el && ro.observe(el));
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => App.fitTopbar());
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
    const restorePage = () => {
      const target = HubRouter.parse(location.hash || history.state?.pydPage || "hub");
      App.go(target ? target.route : "", target ? target.sub : "", { history: "none" });
      if (isJourney()) Site.focusHead();
    };
    window.addEventListener("hashchange", restorePage);
    window.addEventListener("popstate", restorePage);
    window.addEventListener("beforeprint", () => { const r = $("#print-root"); if (r && !r.innerHTML.trim()) r.innerHTML = DocExport.html(S(), { only: "keuzes" }); const h = document.documentElement; if (h.dataset.theme === "dark") { h.dataset.theme = "light"; h.dataset.printDark = "1"; } });
    window.addEventListener("afterprint", () => { const r = $("#print-root"); if (r) setTimeout(() => { r.innerHTML = ""; }, 0); const h = document.documentElement; if (h.dataset.printDark) { delete h.dataset.printDark; Prefs.apply(); } });
    ["kind", "cat"].forEach((k) => { if (UI.libFilter && UI.libFilter[k] === "all") UI.libFilter[k] = ""; });

    const h = location.hash.slice(1);
    let target = HubRouter.parse(h || (Prefs.v.resume ? Prefs.v.page : "start"));
    if (!target) {
      target = HubRouter.target("hub");
      Toast.show("Deze pagina is niet beschikbaar. Kies een ingang op Home.", "warn", 5000);
    }
    UI.route = target.route;
    UI.sub[target.route] = target.sub;
    this._page = target.page;
    this.rememberPage(target, !!h);
    history.replaceState({ pydPage: target.page }, "", h ? HubRouter.href(target.route, target.sub) : location.href);
    Prefs.apply();
    this.render({ resetScroll: true });
    this.startup();
  },
};

/* ---------- Hoofdnavigatie: uitklapmenu's (disclosure-patroon) en menupaneel op smalle schermen ---------- */
const SiteNav = {
  open: "", menu: false,
  _dd(route) { return $(`#site-nav .site-dd[data-dd="${route}"]`); },
  _set(route, show) {
    const dd = this._dd(route); if (!dd) return;
    const btn = $(".site-dd-btn", dd), panel = $(".site-dd-panel", dd);
    btn.setAttribute("aria-expanded", String(show)); panel.hidden = !show; dd.classList.toggle("open", show);
  },
  show(route, focus) {
    if (this.open && this.open !== route) this._set(this.open, false);
    this.open = route; this._set(route, true);
    if (focus) { const items = this.items(); const el = focus === "last" ? items[items.length - 1] : items[0]; if (el) el.focus(); }
  },
  close(returnFocus) {
    if (!this.open) return;
    const r = this.open; this.open = ""; this._set(r, false);
    if (returnFocus) { const b = $(".site-dd-btn", this._dd(r) || document); if (b) b.focus(); }
  },
  items() { const dd = this.open && this._dd(this.open); return dd ? $$(".site-dd-panel a", dd) : []; },
  restore() { if (this.open) this._set(this.open, true); },
  setMenu(show, returnFocus) {
    this.menu = !!show;
    const m = $("#site-menu"), b = $('#site-actions [data-action="site-menu"]');
    if (m) m.hidden = !show;
    document.documentElement.dataset.siteMenu = show ? "open" : "closed";
    if (b) { b.setAttribute("aria-expanded", String(show)); b.innerHTML = `${icon(show ? "x" : "menu", "s")}<span>Menu</span>`; }
    if (show) { const first = m && $("a, button", m); if (first) first.focus(); }
    else if (returnFocus && b) b.focus();
  },
  closeAll(returnFocus) { this.close(returnFocus); if (this.menu) this.setMenu(false, returnFocus); },
  init() {
    const nav = $("#site-nav");
    nav.addEventListener("keydown", (e) => {
      const btn = e.target.closest(".site-dd-btn");
      if (btn && (e.key === "ArrowDown" || e.key === "ArrowUp")) { e.preventDefault(); this.show(btn.dataset.route, e.key === "ArrowUp" ? "last" : "first"); return; }
      if (!this.open || !e.target.closest(".site-dd-panel")) return;
      const items = this.items(), i = items.indexOf(e.target);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); const n = items.length; items[(i + (e.key === "ArrowDown" ? 1 : -1) + n) % n].focus(); }
      else if (e.key === "Home" || e.key === "End") { e.preventDefault(); items[e.key === "Home" ? 0 : items.length - 1].focus(); }
    });
    nav.addEventListener("focusout", (e) => { if (this.open && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(".site-dd.open"))) this.close(false); });
    const menu = $("#site-menu");
    if (menu) menu.addEventListener("keydown", (e) => { if (this.menu) _trapTab(e, $("#app .topbar")); });
    document.addEventListener("pointerdown", (e) => {
      const t = e.target;
      if (this.open && !(t.closest && t.closest(".site-dd.open"))) this.close(false);
      if (this.menu && !(t.closest && t.closest("#site-menu, [data-action='site-menu']"))) this.setMenu(false, false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || (!this.open && !this.menu)) return;
      e.preventDefault(); e.stopImmediatePropagation(); this.closeAll(true);
    }, true);
  },
};
Actions["site-dd"] = (el) => { const r = el.dataset.route; if (SiteNav.open === r) SiteNav.close(false); else SiteNav.show(r, false); };
Actions["site-menu"] = () => SiteNav.setMenu(!SiteNav.menu, true);

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
  if (window.innerWidth <= 600) {
    const target = UI.navCollapsed ? $('[data-action="toggle-nav"]') : $("#sidenav [aria-current='page']") || $("#sidenav button");
    if (target) target.focus();
  }
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
Actions["fac-close"] = () => { if (!UI.panelCollapsed) Actions["toggle-panel"](); };
Actions["toggle-theme"] = () => { Prefs.set("theme", Prefs.v.theme === "dark" ? "light" : "dark"); App.renderTopbar(); const b = $('#site-actions [data-action="toggle-theme"]'); if (b) b.focus(); };
Actions["toggle-beamer"] = () => { UI.beamerNav = false; UI.beamerPanel = false; Prefs.set("beamer", !Prefs.v.beamer); App.render(); const b = $('#topbar-actions [data-action="toggle-beamer"]'); if (b) b.focus(); };
Actions["export-menu"] = (el) => Menu.open(el, [
  { icon: "printer", label: "Ontwerpdocument (PDF)", desc: "Volledig ontwerp via afdrukken → Opslaan als PDF", fn: () => DocExport.print() },
  { icon: "table", label: "Keuzeoverzicht – ter bevestiging", desc: "Alle keuzes per label, ter bevestiging", fn: () => DocExport.print({ only: "keuzes" }) },
  { icon: "excel", label: "Excel-werkmap (.xlsx)", desc: "Labels, beleid, DLP-regels, endpoint, randvoorwaarden", fn: () => XlsxExport.download() },
  ...(Prefs.v.showTech === false ? [] : [{ icon: "code", label: "PowerShell-script (.ps1)", desc: "Security & Compliance PowerShell – DLP altijd in simulatie", fn: () => PsExport.download() }]),
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
        <li>Vaste les- en werkdagkeuzes blijven apart in deze browser bewaard. Ze komen niet in ontwerpbestanden of exports. Via <b>Leervoortgang wissen</b> wis je alleen het leren; <b>Nieuw ontwerp</b> behoudt die voortgang.</li>
        <li>Op een gedeelde laptop of beamer-pc: sla het ontwerp op als JSON en <b>wis daarna de lokale gegevens</b> (menu ⋯ → “Lokale gegevens wissen…”).</li>
      </ul>
      <h3 class="mt-2">Instellingen</h3>
      <p class="small">Thema, weergavegrootte, facilitatorpaneel, automatisch bewaren en meer vind je onder <b>Instellingen</b>.</p>
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
          ${zoomSettingRow()}
          ${seg("pickerMode", "Wisselen tussen labels", "Compact: keuzelijst met pijlen. Lijst: alle items links in beeld. Label-instellingen, Labelbeleid en Auto-labeling tonen altijd een lijst links.", [["compact", "menu", "Compact"], ["list", "table", "Lijst"]])}
          ${sw("beamer", "Beamermodus", "Grote tekst voor presenteren; navigatie en facilitatorinhoud verborgen.", v.beamer)}
          ${sw("navCollapsed", "Compacte navigatie", "Linkermenu alleen met iconen, meer ruimte voor het werkgebied.", v.navCollapsed)}
          ${sw("calm", "Minder beweging", rmSys ? (reducedMotion() ? "Aan via je systeeminstelling ‘beperkte beweging’. Zet uit om animaties in deze app toch te tonen." : "Uit voor deze app, ondanks je systeeminstelling ‘beperkte beweging’.") : "Geen animaties en overgangen (rustiger op een beamer).", reducedMotion())}
        </section>
        <section class="set-card" aria-labelledby="set-h-ws"><h3 id="set-h-ws">${icon("users", "s")} Workshop</h3>
          ${sw("facilitatorPanel", "Facilitatorpaneel tonen", "Gespreksvragen, tips, spelregels en besluiten rechts in beeld. Standaard uit; ook te openen met de paneelknop bovenin.", facOpen)}
          ${sw("showReviewed", "Knop ‘Markeer als besproken’", "Zet een vinkje bij een stap in de navigatie zodra hij met de klant is besproken.", v.showReviewed)}
          ${sw("showTech", "Technische details tonen", "Purview-namen, PowerShell en beheerinstellingen. Uit = alleen klantvriendelijke uitleg; je ontwerp en exports blijven volledig.", v.showTech !== false)}
          ${sw("explainOpen", "‘Meer uitleg’ standaard open", "Voor wie alle achtergrond direct wil zien. Standaard dicht, zodat elke pagina rustig blijft.", v.explainOpen)}
          ${sw("resume", "Verder waar je was", "Bij openen terug naar de laatst bekeken pagina. Uit = altijd beginnen bij Start.", v.resume)}
          ${sw("effects", "Feestelijke effecten", reducedMotion() ? "Uit zolang ‘Minder beweging’ aan staat." : "Confetti bij geslaagde scenario’s; standaard uit voor zakelijke presentaties.", v.effects && !reducedMotion(), reducedMotion())}
        </section>
        <section class="set-card" aria-labelledby="set-h-data"><h3 id="set-h-data">${icon("shield", "s")} Gegevens &amp; privacy</h3>
          ${sw("autosave", "Automatisch bewaren in deze browser", "Uitzetten laat de bestaande kopie staan. Nieuwe wijzigingen bewaar je met Ctrl+S.", v.autosave)}
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
    if (Store.autosave) { Store.queueSave(); Store.saveLocal.flush(); }
    else {
      Store.saveLocal.cancel(); Store.setStorageStatus("disabled");
      Toast.show("Automatisch bewaren staat uit. De bestaande lokale kopie blijft staan; nieuwe wijzigingen kun je downloaden als JSON.", "warn", 7000);
    }
  } else if (k === "effects") {
    Prefs.set("effects", !!val && !reducedMotion());
  } else if (k === "calm") {
    Prefs.v.calm = !!val; Prefs.v.allowMotion = !val && systemReducedMotion();
    if (val) Prefs.v.effects = false;
    Prefs.save(); Prefs.apply();
  } else if (k === "explainOpen") {
    Prefs.set("explainOpen", !!val);
    if (UI.acc) Object.keys(UI.acc).forEach((x) => { if (/\|ph-/.test(x)) delete UI.acc[x]; });
    $$("details.ph-more", document).forEach((d) => { d.open = !!val; });
  } else if (Object.hasOwn(PREFS_DEFAULTS, k) && typeof PREFS_DEFAULTS[k] === typeof val) {
    Prefs.set(k, val);
  }
  App.render();
}
Actions["app-settings"] = () => { Menu.close(true); showSettings(); };

/* ---------- Weergavegrootte (uiZoom) ---------- */
/** Breakpoints opnieuw bepalen (resize of andere weergavegrootte); een expliciete keuze geldt tot de volgende grensovergang. */
function reflowBreakpoints() {
  const ew = effWidth(), wasO = UI.overlay, wasN = UI.narrowNav, wasP = UI.panelCollapsed;
  if ((ew < BP_PANEL) !== wasO) { UI.panelOverride = null; UI.beamerPanel = false; }
  if ((ew < BP_NAV) !== wasN) UI.navOverride = null;
  Prefs.apply();
  return wasP !== UI.panelCollapsed || wasO !== UI.overlay;
}
function zoomStepper() {
  const z = clampZoom(Prefs.v.uiZoom);
  return `<span class="zoom-step" role="group" aria-label="Weergavegrootte">
      <button type="button" class="icon-btn" data-action="zoom-dec" title="Weergave verkleinen" aria-label="Weergave verkleinen"${z <= ZOOM_MIN ? " disabled" : ""}>${icon("minus")}</button><button type="button" class="zoom-val" data-action="zoom-reset" title="Weergavegrootte ${z}% – klik voor 100%" aria-label="Weergavegrootte ${z}%, terug naar 100%"><span data-zoom-val aria-live="polite">${z}%</span></button><button type="button" class="icon-btn" data-action="zoom-inc" title="Weergave vergroten" aria-label="Weergave vergroten"${z >= ZOOM_MAX ? " disabled" : ""}>${icon("plus")}</button></span>`;
}
function zoomSettingRow() {
  const z = clampZoom(Prefs.v.uiZoom);
  return `<div class="set-row set-zoom"><div class="s-text"><label for="set-zoom"><b>Weergavegrootte</b></label><span class="s-desc" id="set-zoom-desc">Tekst, ruimte en panelen groter of kleiner. Ook bovenin met − en +.</span></div>
    <div class="zoom-ctl"><input type="range" id="set-zoom" min="${ZOOM_MIN}" max="${ZOOM_MAX}" step="${ZOOM_STEP}" value="${z}" data-live="zoom-range" aria-valuetext="${z}%" aria-describedby="set-zoom-desc"><output for="set-zoom" data-zoom-out>${z}%</output><button type="button" class="btn small" data-action="zoom-reset"${z === 100 ? " disabled" : ""}>Standaard (100%)</button></div></div>`;
}
/** Weergavegrootte wijzigen zonder volledige render: het instellingenvenster en de live-regio blijven staan. */
function setZoom(val) {
  const z = clampZoom(val);
  if (z === Prefs.v.uiZoom) return;
  const active = document.activeElement;
  Prefs.v.uiZoom = z; Prefs.save();
  const panelChanged = reflowBreakpoints();
  if (panelChanged) {
    App.renderPanel();
    const tp = $('#topbar-actions [data-action="toggle-panel"]');
    if (tp) { const t = UI.panelCollapsed ? "Facilitatorpaneel tonen" : "Facilitatorpaneel verbergen"; tp.title = t; tp.setAttribute("aria-expanded", String(!UI.panelCollapsed)); }
  }
  const dec = $('#topbar-actions [data-action="zoom-dec"]'), inc = $('#topbar-actions [data-action="zoom-inc"]');
  if (dec && inc) {
    dec.disabled = z <= ZOOM_MIN; inc.disabled = z >= ZOOM_MAX;
    const v = $("#topbar-actions [data-zoom-val]"); if (v) v.textContent = `${z}%`;
    const r = $('#topbar-actions [data-action="zoom-reset"]');
    if (r) { r.title = `Weergavegrootte ${z}% – klik voor 100%`; r.setAttribute("aria-label", `Weergavegrootte ${z}%, terug naar 100%`); }
    if (active && active.disabled && (active === dec || active === inc)) (active === dec ? inc : dec).focus();
  } else App.renderTopbar();
  const rng = $("#modal-root #set-zoom");
  if (rng) { if (Number(rng.value) !== z) rng.value = String(z); rng.setAttribute("aria-valuetext", `${z}%`); }
  const out = $("#modal-root [data-zoom-out]"); if (out) out.textContent = `${z}%`;
  const rs = $('#modal-root .set-zoom [data-action="zoom-reset"]'); if (rs) rs.disabled = z === 100;
  if (typeof DnD !== "undefined" && DnD.refresh) DnD.refresh();
  if (typeof Tip !== "undefined") Tip.hide();
}
Actions["zoom-dec"] = () => setZoom(clampZoom(Prefs.v.uiZoom) - ZOOM_STEP);
Actions["zoom-inc"] = () => setZoom(clampZoom(Prefs.v.uiZoom) + ZOOM_STEP);
Actions["zoom-reset"] = () => setZoom(100);
Actions["zoom-range"] = (el) => setZoom(el.value);
function showStorage() {
  const recovery = Store.recovery;
  Modal.open({
    title: "Bewaren en herstellen",
    body: `<p data-save-status role="status" aria-live="polite">${esc(Store.storageText())}</p>
      <p>${recovery ? "De vorige lokale kopie kon niet veilig worden geopend. Deze wordt niet automatisch overschreven. Download de kopie voordat je een nieuw ontwerp begint." : "Automatisch bewaren gebruikt alleen deze browser. Dit is geen versleutelde kluis of cloudback-up. Een volledige JSON bevat ook interne notities."}</p>`,
    buttons: [
      { label: "Sluiten", primary: true },
      { label: "Huidig ontwerp downloaden", fn: () => { IO.saveJson(); return true; } },
      ...(recovery ? [
        ...(recovery.raw ? [
          { label: "Originele kopie downloaden", fn: () => { downloadText(recovery.raw, "ontwerp-herstel.json", "application/json"); return true; } },
          { label: "Kopie opnieuw openen", fn: () => IO.loadText(recovery.raw, "ontwerp-herstel.json") },
        ] : []),
        { label: "Nieuw ontwerp", fn: () => IO.newDesign() },
      ] : [{ label: Store.autosave ? "Bewaren proberen" : "Autosave aanzetten", fn: () => { applyPref("autosave", true); return true; } }]),
    ],
  });
}
Actions["storage-details"] = () => { Menu.close(true); showStorage(); };
Actions["pref-toggle"] = (el) => {
  applyPref(el.dataset.key, !!el.checked);
  if (Modal.cur && Modal.cur.title === "Instellingen" && ["calm", "effects"].includes(el.dataset.key)) { const k = el.dataset.key; showSettings(); const n = $(`#modal-root [data-key="${k}"]`); if (n) n.focus(); }
};
Actions["pref-set"] = (el) => {
  const k = el.dataset.key, val = el.dataset.value;
  if (!((k === "theme" && ["light", "dark"].includes(val)) || (k === "pickerMode" && ["compact", "list"].includes(val)))) return;
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
const journeyMenu = () => [
  { icon: "layers", label: "Naar de ontwerpworkshop", desc: "Ontwerp labels en DLP samen met uw organisatie", fn: () => App.go("start") },
  { icon: "projector", label: Prefs.v.beamer ? "Beamermodus uitzetten" : "Beamermodus", desc: "Grotere tekst voor presentaties", fn: () => Actions["toggle-beamer"]() },
  { icon: Prefs.v.theme === "dark" ? "sun" : "moon", label: Prefs.v.theme === "dark" ? "Licht thema" : "Donker thema", fn: () => Actions["toggle-theme"]() },
  Prefs.v.uiZoom === 100
    ? { icon: "search", label: "Weergavegrootte: 100%", desc: "Groter of kleiner maken in Instellingen", fn: showSettings }
    : { icon: "search", label: `Weergavegrootte: ${Prefs.v.uiZoom}%`, desc: "Terug naar de standaard (100%)", fn: () => setZoom(100) },
  "-",
  { icon: "settings", label: "Instellingen", desc: "Thema, weergavegrootte, beweging", fn: showSettings },
  { icon: "shield", label: "Privacy & over deze tool", desc: `Versie ${APP_VERSION} · offline · fictieve gegevens`, fn: showAbout },
];
Actions["app-menu"] = (el) => Menu.open(el, isJourney() ? journeyMenu() : [
  { icon: "save", label: "Bewaren en herstellen", desc: Store.storageText(), fn: showStorage },
  { icon: "panel", label: "Facilitatorpaneel", fn: () => Actions["toggle-panel"]() },
  { icon: "projector", label: "Beamermodus", fn: () => Actions["toggle-beamer"]() },
  { icon: "plus", label: "Nieuw ontwerp", desc: "Begin met een leeg ontwerp of kies een voorbeeld", fn: () => IO.newDesign() },
  { icon: "open", label: "Ontwerp openen…", desc: "JSON-bestand (Ctrl+O), of sleep het op het venster", fn: () => IO.openJson() },
  { icon: "save", label: "Ontwerp opslaan als JSON", desc: "Volledige back-up incl. interne notities (Ctrl+S)", fn: () => IO.saveJson() },
  { icon: Prefs.v.theme === "dark" ? "sun" : "moon", label: Prefs.v.theme === "dark" ? "Licht thema" : "Donker thema", fn: () => Actions["toggle-theme"]() },
  Prefs.v.uiZoom === 100
    ? { icon: "search", label: "Weergavegrootte: 100%", desc: "Groter of kleiner maken in Instellingen of met − en + bovenin", fn: showSettings }
    : { icon: "search", label: `Weergavegrootte: ${Prefs.v.uiZoom}%`, desc: "Terug naar de standaard (100%)", fn: () => setZoom(100) },
  { icon: "check", label: "Validatie & export", fn: () => App.go("export") },
  "-",
  { icon: "settings", label: "Instellingen", desc: "Thema, weergavegrootte, facilitatorpaneel, bewaren", fn: showSettings },
  { icon: "info", label: "Sneltoetsen", desc: "Ctrl+Z/Y · Ctrl+S · Ctrl+O · Ctrl+P · Esc", fn: showShortcuts },
  { icon: "shield", label: "Privacy & over deze tool", desc: `Versie ${APP_VERSION} · offline · automatisch bewaren`, fn: showAbout },
  "-",
  { icon: "trash", label: "Lokale gegevens wissen…", desc: "Ontwerp, geschiedenis en instellingen uit deze browser verwijderen", danger: true, fn: () => IO.wipe() },
]);
Actions["decision-add"] = (el) => {
  const inputId = el.dataset.input || "dec-text";
  const ta = document.getElementById(inputId);
  const text = ta ? ta.value.trim().slice(0, 2000) : "";
  if (!text) { if (ta) ta.focus(); Toast.show("Typ eerst het besluit of het open punt.", "warn"); return; }
  const sel = el.dataset.statusSelect ? document.getElementById(el.dataset.statusSelect) : null;
  const want = sel ? sel.value : el.dataset.status;
  const status = DECISION_STATUSES.includes(want) ? want : el.dataset.kind === "park" ? "open" : "besloten";
  const route = inputId === "dec-text" ? UI.route : "";
  if ((S().decisions || []).some((d) => d.text.trim().toLowerCase() === text.toLowerCase())) { Toast.show("Dit punt staat al in de besluitenlijst. Bewerk het bestaande punt.", "warn"); return; }
  if (S().decisions.length >= STATE_CAPS.decisions) { Toast.show("Het maximumaantal besluiten is bereikt.", "warn"); return; }
  Store.update((st) => { st.decisions = st.decisions || []; st.decisions.push({ id: uid("dec"), status, kind: decisionKind(status), text, route, at: new Date().toISOString(), owner: "", due: "" }); });
  Toast.show(status === "besloten" ? "Besluit vastgelegd" : "Open punt vastgelegd", "ok", 1800);
  if (inputId === "dec-text") UI.decDraft = ""; else UI.decNewDraft = "";
  const n = document.getElementById(inputId); if (n) { n.value = ""; n.focus(); }
};
Actions["decision-del"] = (el) => Store.update((st) => { st.decisions = (st.decisions || []).filter((d) => d.id !== el.dataset.id); });
Hooks["dec-status"] = (st, r, v) => { if (r.obj) { if (!DECISION_STATUSES.includes(v)) r.obj.status = "open"; r.obj.kind = decisionKind(r.obj.status); } };

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => App.init());
else App.init();
