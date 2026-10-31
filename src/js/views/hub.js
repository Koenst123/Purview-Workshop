/* Purview Experience Hub – gedeelde site-helpers (Site.*) en de landingspagina (#hub).
   Alle catalogustekst gaat via Site.rich() of esc(); Learning bewaart alleen vaste leerkeuzes. */

const SITE_HEX = /^#[0-9a-f]{6}$/i;

const Site = {
  /** Platte tekst → veilige html; **vet** wordt <b>. */
  rich(s) { return esc(String(s == null ? "" : s)).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>"); },
  hex(c, fb = "#69797E") { return SITE_HEX.test(String(c || "")) ? c : fb; },
  /** Labelpill in de stijl van de app-mock-ups. */
  pill(name, color) {
    return `<span class="pv-pill" title="${esc(name)}"><span class="color-dot" style="background:${this.hex(color)}"></span><span class="pv-pill-t">${esc(name)}</span></span>`;
  },
  ref(key) {
    const r = CATALOG.learn && Object.hasOwn(CATALOG.learn, key) ? CATALOG.learn[key] : null;
    return r && /^https:\/\/learn\.microsoft\.com\//.test(String(r.url || "")) ? r : null;
  },
  /** Inline link naar Microsoft Learn (opent pas na klikken). */
  learn(key, label = "") {
    const r = this.ref(key);
    if (!r) return `<span class="s-src-missing">Microsoft Learn-bron niet beschikbaar.</span>`;
    return `<a class="s-link" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(label || r.title)} ${icon("open", "s")}<span class="sr-only"> (opent Microsoft Learn in een nieuw venster)</span></a>`;
  },
  sources(keys) {
    const items = (keys || []).map((k) => this.ref(k)).filter(Boolean);
    if (!items.length) return "";
    return `<div class="s-sources">${items.map((r) => `<a class="s-src" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${msLogo("purview")}<span><b>${esc(r.title)}</b><small>Microsoft Learn</small></span>${icon("open", "s")}<span class="sr-only"> (opent in een nieuw venster)</span></a>`).join("")}</div>`;
  },
  /** Link binnen de site (Hub, Ervaar, Leer, Workshop). */
  a(route, sub, html, cls = "s-link", extra = "") {
    return `<a class="${cls}" href="${esc(App.href(route, sub || ""))}" data-action="site-go" data-route="${esc(route)}"${sub ? ` data-sub="${esc(sub)}"` : ""}${extra ? " " + extra : ""}>${html}</a>`;
  },
  /** Naar een route en/of subpagina; scrolt naar boven en zet de focus op de paginakop. */
  go(route, sub) {
    App.go(route, sub);
    this.focusHead();
  },
  focusHead(sel = "h1") {
    const main = $("#main"), h = main && ($(sel, main) || $("h1", main));
    if (!h) return;
    h.setAttribute("tabindex", "-1");
    h.focus({ preventScroll: true });
  },
  scrollTo(id) {
    const el = id && document.getElementById(id), main = $("#main");
    if (!el || !main) return;
    const top = el.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop - 12;
    main.scrollTo({ top, behavior: reducedMotion() ? "auto" : "smooth" });
    const h = $("h2, h3", el) || el;
    h.setAttribute("tabindex", "-1");
    h.focus({ preventScroll: true });
  },
  /** App-venster rond een mock-up. */
  device(title, inner, app = "") {
    return `<div class="s-device"><div class="s-device-bar" aria-hidden="true"><i></i><i></i><i></i><span>${app ? `${esc(app)} · ` : ""}${esc(title)}</span></div><div class="s-device-screen">${inner}</div></div>`;
  },
  footer() {
    const col = (title, links) => `<div><h3>${esc(title)}</h3><ul>${links.map(([r, s, t]) => `<li>${this.a(r, s, esc(t), "")}</li>`).join("")}</ul></div>`;
    return `<footer class="s-foot"><div class="s-wrap">
      <div class="s-foot-grid">
        <div class="s-foot-brand">${brandImg("peMark", "Pink Elephant", "")}<p>De Purview Experience Hub laat zien hoe Microsoft Purview gevoelige informatie beschermt. Gemaakt door Pink Elephant voor workshops over Information Protection en DLP.</p></div>
        ${col("Ervaar", [["experience", "intro", "Werkdagen"], ["experience", "library", "Scenario's"]])}
        ${col("Leer", [["academy", "home", "Alle leerpaden"], ["academy", "overview", "Purview in één oogopslag"], ["academy", "glossary", "Begrippenlijst"]])}
        ${col("Ontwerp", [["start", "", "Ontwerpworkshop"], ["architectuur", "", "Referentiearchitectuur"], ["hub", "", "Home"]])}
      </div>
      <div class="s-foot-legal"><span>Fictieve voorbeelden · volledig offline · ${Learning.error ? "leeropslag vraagt aandacht; nieuwe keuzes zijn mogelijk alleen in dit venster beschikbaar." : "vaste keuzes worden in deze browser bewaard, ingevoerde oefentekst niet."} <button type="button" class="s-btn quiet small" data-action="learning-clear">Leervoortgang wissen</button></span><span>Microsoft, Microsoft 365, Purview en Copilot zijn handelsmerken van Microsoft. <button type="button" class="s-btn quiet small" data-action="site-about">Privacy &amp; over</button></span></div>
    </div></footer>`;
  },
};

/* ---------- Visuals voor de pijlers (hergebruik van de Previews-mock-ups) ---------- */
const HubVisual = {
  sits() {
    return Site.device("Personeelslijst.xlsx", Previews.sceneSits({
      file: "Personeelslijst.xlsx",
      text: "Sanne Visser · BSN 111222333 · IBAN NL91ABNA0417164300 · afdeling HR",
      sits: [
        { name: "Netherlands citizen's service (BSN) number", found: true },
        { name: "International banking account number (IBAN)", found: true },
        { name: "Credit card number", found: false },
      ],
    }), "Excel");
  },
  label() {
    return Site.device("Reorganisatieplan 2026.docx", Previews.sceneDoc({
      file: "Reorganisatieplan 2026.docx",
      pillHtml: Site.pill("Strikt vertrouwelijk", "#C50F1F"),
      barsHtml: Previews.sceneBar("encrypt", "Versleuteld met een sensitivity label", "Alleen de stuurgroep kan dit document openen, ook als het buiten Noordhaven belandt."),
      wm: "STRIKT VERTROUWELIJK",
    }), "Word");
  },
  dlp() {
    return Site.device("Nieuw bericht", Previews.sceneMail({
      to: "s.visser@example.com",
      subj: "Verzuimoverzicht om thuis af te maken",
      body: "Even naar mijn eigen mail, dan kan ik er vanavond verder aan.",
      attach: "Verzuimoverzicht 2025.xlsx",
      barsHtml: Previews.sceneBar("override", "Dit bericht bevat burgerservicenummers", "Het gaat naar een ontvanger buiten Noordhaven. Verzenden kan alleen met een zakelijke reden.", ["Reden opgeven", "Meer informatie"]),
    }), "Outlook");
  },
  alerts() {
    const rows = [
      ["high", "BSN's naar externe e-mail", "Outlook · verzonden met zakelijke reden", "Nieuw"],
      ["medium", "IBAN in Teams-chat met gast", "Teams · geblokkeerd", "In behandeling"],
      ["high", "Kopiëren naar USB", "Windows-apparaat · geblokkeerd", "Nieuw"],
    ];
    return Site.device("DLP Alerts", `<div class="x-portal"><div class="x-portal-bar">${msLogo("purview")} Microsoft Purview · DLP Alerts<small>Vandaag</small></div><ul class="x-alerts">${rows.map(([sev, t, s, b]) => `<li class="x-alert" data-sev="${sev}"><i aria-hidden="true"></i><span><b>${esc(t)}</b><small>${esc(s)}</small></span><span class="s-badge ${b === "Nieuw" ? "err" : "info"}">${esc(b)}</span></li>`).join("")}</ul></div>`, "Purview-portal");
  },
};

const HubUI = { pillar: "know" };

registerView("hub", {
  title: "Purview Experience Hub",
  defaultSub: "",
  normalizeSub(sub) { return sub === "" ? "" : null; },
  render() {
    const H = CATALOG.hub, X = CATALOG.experience || { moments: [] }, A = CATALOG.academy || { modules: [], glossary: [] };
    const nSit = (CATALOG.builtinSits || []).length;
    const pillar = H.pillars.find((p) => p.id === HubUI.pillar) || H.pillars[0];
    const visual = HubVisual[pillar.visual] ? HubVisual[pillar.visual]() : "";
    const resume = HubRouter.parse(Prefs.v.lastLearn);
    const design = HubRouter.parse(Prefs.v.lastDesign) || { route: "start", sub: "" };
    const roles = X.roles || [], nMom = roles.reduce((n, r) => n + (r.moments || []).length, 0), nPaths = (A.paths || []).length, nScn = ((CATALOG.xpScenarios || {}).items || []).length;
    const hero = `<header class="s-hero h-hero"><div class="s-wrap s-hero-grid">
      <div>
        <span class="s-eyebrow">Microsoft Purview · Information Protection &amp; DLP</span>
        <h1>Gevoelige informatie beschermen, <span class="s-grad-text">zonder het werk stil te leggen.</span></h1>
        <p class="s-lead">Zie wat Microsoft Purview doet als iemand een BSN mailt, een vertrouwelijk bestand deelt of Copilot een vraag stelt. Daarna leer je hoe het werkt en ontwerp je de aanpak voor je eigen organisatie.</p>
        <div class="s-hero-ctas">${Site.a("experience", "intro", `${icon("play", "s")} Start een werkdag`, "s-btn primary")}${Site.a("academy", "home", `${icon("book", "s")} Begin met leren`, "s-btn ghost")}</div>
        ${resume ? `<div class="h-resume">${icon("bookmark", "s")}<span>Welkom terug. Je was gebleven bij een les of werkdag.</span>${Site.a(resume.route, resume.sub, `Ga verder ${icon("chevronright", "s")}`, "s-btn light small")}</div>`
          : `<ul class="s-trust"><li>${icon("shieldcheck", "s")} Werkt volledig offline</li><li>${icon("user", "s")} Fictieve voorbeelden</li><li>${icon("book", "s")} Gebaseerd op Microsoft Learn</li></ul>`}
      </div>
      <div class="h-art" role="img" aria-label="Illustratie: een Word-document met het label Vertrouwelijk, een policy tip in Outlook, een Copilot-melding en een geblokkeerde kopie naar USB.">
        <span class="h-badge">${msLogo("purview")} Microsoft Purview</span>
        <div class="h-win">
          <div class="h-win-bar">${msLogo("word")} Verzuimoverzicht 2025.docx <span class="s-pill"><i style="--c:#CA5010"></i>Vertrouwelijk</span></div>
          <div class="h-doc"><div class="h-doc-mark">VERTROUWELIJK · ALLEEN VOOR NOORDHAVEN</div><div class="h-line t"></div><div class="h-line"></div><div class="h-line m"></div><span class="h-hit">BSN 111 222 333</span><div class="h-line"></div><div class="h-line s"></div><span class="h-hit">NL91 ABNA 0417 1643 00</span><div class="h-line m"></div><div class="h-line s"></div><div class="h-wm">VERTROUWELIJK</div></div>
        </div>
        <div class="h-float tip">${msLogo("outlook")}<div><b>Policy tip</b>Dit bericht bevat een BSN en gaat naar iemand buiten de organisatie.</div></div>
        <div class="h-float cop">${msLogo("copilot")}<div><b>Microsoft 365 Copilot</b>Strikt vertrouwelijke bestanden worden niet in dit antwoord gebruikt.</div></div>
        <div class="h-float usb">${msLogo("windows")}<div><b>Actie geblokkeerd</b>Kopiëren naar USB: het bestand bevat gevoelige informatie.</div></div>
      </div>
    </div></header>`;

    const entries = `<section class="s-sec h-start" aria-labelledby="h-entries"><div class="s-wrap">
      <div class="s-head center"><div><span class="s-eyebrow">Waar wil je beginnen?</span><h2 class="s-h2" id="h-entries">Zien, begrijpen, ontwerpen</h2><p class="s-lead">Nieuw met Purview? Begin met een werkdag, volg daarna de lessen en ontwerp tot slot je eigen aanpak. Elk onderdeel werkt ook los.</p></div></div>
      <div class="s-grid c3">
        ${Site.a("experience", "intro", `<div class="h-entry-top exp">${icon("play")}<span>Ik wil het zien</span><span class="h-entry-tag">Begin hier</span></div>
          <div class="h-entry-body"><h3>Ervaar Purview</h3><p>Loop een werkdag mee met een collega. Je maakt keuzes en ziet direct wat Purview doet in de apps die je kent.</p><span class="s-muted s-small">${roles.length} werkdagen · ${nMom} momenten · ${nScn} losse scenario's</span>
          <span class="s-link">Kies een werkdag ${icon("chevronright", "s")}</span></div>`, "s-card h-entry h-entry-experience")}
        ${Site.a("academy", "home", `<div class="h-entry-top acad">${icon("book")}<span>Ik wil het begrijpen</span></div>
          <div class="h-entry-body"><h3>Leer Purview kennen</h3><p>Korte lessen met uitleg, oefeningen en kennischecks. Volg een leerpad of kies zelf een onderwerp.</p><span class="s-muted s-small">${nPaths} leerpaden · ${A.modules.length} lessen · begrippenlijst</span>
          <span class="s-link">Kies een leerpad ${icon("chevronright", "s")}</span></div>`, "s-card h-entry h-entry-academy")}
        ${Site.a(design.route, design.sub, `<div class="h-entry-top design">${icon("layers")}<span>Ik wil aan de slag</span></div>
          <div class="h-entry-body"><h3>Ontwerp je oplossing</h3><p>Maak samen keuzes voor je organisatie: labels, beleid, DLP en adoptie. Je ontwerp blijft bewaard in deze browser; exporteer het als bestand om het mee te nemen.</p><span class="s-muted s-small">Ontwerpworkshop · ontwerpdocument in Word en Excel</span>
          <span class="s-link">${IO.hasContent(S()) ? "Ga verder met je ontwerp" : "Open de ontwerpworkshop"} ${icon("chevronright", "s")}</span></div>`, "s-card h-entry h-entry-design")}
      </div>
    </div></section>`;

    const stats = `<div class="s-wrap"><div class="s-stats" role="list">
      <div class="s-stat" role="listitem"><b>${roles.length}</b><small>rollen om een werkdag mee te beleven</small></div>
      <div class="s-stat" role="listitem"><b>${A.modules.length}</b><small>lessen met oefeningen en kennischecks</small></div>
      <div class="s-stat" role="listitem"><b>${nSit}<span>+</span></b><small>ingebouwde typen gevoelige informatie</small></div>
      <div class="s-stat" role="listitem"><b>${nPaths}</b><small>leerpaden, van eerste kennismaking tot invoering</small></div>
    </div></div>`;

    const flow = `<section class="s-sec alt" aria-labelledby="h-flow"><div class="s-wrap">
      <div class="s-head"><div><span class="s-eyebrow">Zo werkt het</span><h2 class="s-h2" id="h-flow">Vier stappen naar beschermde informatie</h2><p class="s-lead">Purview herkent, labelt, voorkomt en stuurt bij. Kies een stap en zie wat medewerkers ervan merken.</p></div></div>
      <div class="h-flow-tabs" role="tablist" aria-label="Stappen van informatiebescherming">${H.pillars.map((p) => {
        const on = p.id === pillar.id;
        return `<button type="button" class="h-flow-tab" role="tab" id="h-tab-${esc(p.id)}" aria-selected="${on}" aria-controls="h-flow-panel" tabindex="${on ? 0 : -1}" data-action="hub-pillar" data-id="${esc(p.id)}"><span class="n">${esc(p.n)}</span><span><b>${esc(p.title)}</b><small>${esc(p.short)}</small></span></button>`;
      }).join("")}</div>
      <div class="h-flow-panel" role="tabpanel" id="h-flow-panel" aria-labelledby="h-tab-${esc(pillar.id)}">
        <div class="x-enter">
          <span class="s-ico">${icon(pillar.icon)}</span>
          <h3>${esc(pillar.title)}</h3>
          <p class="s-lead">${Site.rich(pillar.lead)}</p>
          <ul class="s-check">${pillar.points.map((t) => `<li>${icon("checkcircle", "s")}<span>${Site.rich(t)}</span></li>`).join("")}</ul>
          <div class="s-actions h-flow-actions">${Site.a("academy", pillar.module, `${icon("book", "s")} Lees de les hierover`, "s-btn quiet small")}${Site.learn(pillar.learn, "Microsoft Learn")}</div>
        </div>
        <div class="h-flow-visual x-enter">${visual}</div>
      </div>
    </div></section>`;

    const apps = `<section class="s-sec" aria-labelledby="h-apps"><div class="s-wrap">
      <div class="s-head"><div><span class="s-eyebrow">Overal waar je werkt</span><h2 class="s-h2" id="h-apps">Bescherming in vertrouwde apps</h2></div><p class="s-lead">Wat een medewerker merkt, hangt af van de app en het ingestelde beleid. Zo werken de onderdelen samen.</p></div>
      <div class="h-apps">${H.apps.map((a) => `<div class="s-card h-app"><span class="h-app-logos">${a.logos.map((l) => msLogo(l)).join("")}</span><h3>${esc(a.title)}</h3><p>${esc(a.text)}</p></div>`).join("")}</div>
    </div></section>`;

    const approach = `<section class="s-sec alt" aria-labelledby="h-approach"><div class="s-wrap">
      <div class="s-head center"><div><span class="s-eyebrow">Aanpak</span><h2 class="s-h2" id="h-approach">Van verkenning naar borging</h2><p class="s-lead">Zo begeleidt Pink Elephant de invoering: in fasen, samen met de organisatie, en met uitleg aan medewerkers voordat er iets verandert.</p></div></div>
      <ol class="h-steps">${H.approach.map((s) => `<li class="h-step"><span class="n">${icon(s.icon)}</span><b>${esc(s.title)}</b><p>${esc(s.text)}</p>${Site.a(s.link[0], s.link[1], `${esc(s.link[2])} ${icon("chevronright", "s")}`)}</li>`).join("")}</ol>
    </div></section>`;

    const faq = `<section class="s-sec" aria-labelledby="h-faq"><div class="s-wrap">
      <div class="s-head center"><div><span class="s-eyebrow">Veelgestelde vragen</span><h2 class="s-h2" id="h-faq">Wat klanten ons vaak vragen</h2></div></div>
      <div class="s-faq">${H.faq.map((f, i) => `<details data-acc="faq-${i}"><summary>${esc(f.q)}</summary><div><p>${Site.rich(f.a)}</p>${f.learn ? Site.learn(f.learn) : ""}</div></details>`).join("")}</div>
    </div></section>`;

    const cta = `<section class="s-sec tight"><div class="s-wrap"><div class="s-cta">
      <div><span class="s-eyebrow s-eyebrow-light">Volgende stap</span><h2>Klaar voor je eigen ontwerp?</h2><p>In de ontwerpworkshop vertalen we samen jouw informatie, risico's en werkprocessen naar labels, beleid en DLP-regels.</p></div>
      <div class="s-actions">${Site.a(design.route, design.sub, `${icon("layers", "s")} Ontwerp je oplossing`, "s-btn primary")}${Site.a("experience", "intro", `${icon("play", "s")} Kies een werkdag`, "s-btn ghost")}</div>
    </div></div></section>`;

    return `<div class="site site-hub">${hero}${entries}${stats}${flow}${apps}${approach}${faq}${cta}${Site.footer()}</div>`;
  },
});

Actions["site-go"] = (el) => Site.go(el.dataset.route, el.dataset.sub);
Actions["site-scroll"] = (el) => Site.scrollTo(el.dataset.target);
Actions["site-about"] = () => showAbout();
Actions["learning-clear"] = () => confirmDialog("Leervoortgang wissen?", "Alle les- en werkdagkeuzes worden uit deze browser verwijderd. Je ontwerp en weergave-instellingen blijven behouden.", () => {
  if (Learning.clearAll()) { Prefs.v.lastLearn = ""; Prefs.save(); App.render(); Toast.show("Leervoortgang gewist. Je ontwerp is niet gewijzigd.", "ok", 4000); }
}, "Voortgang wissen", true);
Actions["learning-retry"] = () => {
  const key = Object.keys(Learning.entries)[0];
  if (key && Learning.save(key, Learning.entries[key].data)) { App.render(); Toast.show("Leervoortgang bewaard in deze browser.", "ok", 3000); }
};
Actions["hub-pillar"] = (el) => {
  if (!CATALOG.hub.pillars.some((p) => p.id === el.dataset.id)) return;
  HubUI.pillar = el.dataset.id;
  App.render();
};
