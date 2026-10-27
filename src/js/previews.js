/* "Zo ziet de gebruiker het": mockups per label en per app, volledig afgeleid van de labelconfiguratie,
   het labelbeleid en de DLP-regels uit de generator. Gebruikt in Label-instellingen (tab), Ontwerpbord (modal) en Scenario's.

   API voor andere views
   - Previews.panel(label, st, app, { compact })  volledig paneel met app-keuze, mockup en uitleg.
   - Previews.open(labelId, app)                    hetzelfde paneel in een modal.
   - Previews.tile(app, big)                        app-icoon; officieel Microsoft-logo uit BRAND_ASSETS (ms*) als dat er is,
                                                    anders een neutrale lettertegel. app: office|word|excel|powerpoint|outlook|spo|
                                                    onedrive|teams|copilot|edge|endpoint|windows|purview. Voor Office kiest de titelbalk
                                                    het logo op bestandsextensie (docx → Word, xlsx → Excel, pptx → PowerPoint).
   - Previews.notice(kind, app, ctx)                compacte mockup (max. 420px) van precies één melding, met app-icoon en
                                                    badge ‘Illustratief’. Geeft "" terug bij een onbekende kind.
       kind  tip        DLP policy tip (alleen waarschuwen)                   apps: outlook office spo teams
             override   blokkeren met override (+ reden / fout-positief)     apps: outlook spo teams endpoint
             block      blokkeren (Outlook NDR, Teams, SPO/OneDrive delen)    apps: outlook spo teams endpoint
             encrypt    versleuteld bericht / document                        apps: outlook office
             endpoint   Windows-melding Endpoint DLP (ctx.override = warn)    apps: endpoint
             copilot    Copilot gebruikt inhoud niet / prompt geblokkeerd     apps: copilot
             mandatory  verplicht label kiezen                                apps: office outlook
             justify    motivatie bij verlagen of verwijderen van een label   apps: office outlook
             default    standaardlabel toegepast (geen melding)               apps: office outlook
             recommend  aanbevolen label (client-side auto-labeling)          apps: office outlook
       Een app die niet bij de kind hoort, valt terug op de eerste app uit Previews.noticeKinds[kind].
       ctx (alles optioneel; platte tekst, wordt ge-escaped):
         tipText        eigen policy-tiptekst; wordt letterlijk getoond
         labelName      labelnaam (pill); labelColor: #RRGGBB; noLabel: true toont ‘Geen label’ als er geen labelName is
         ruleName       DLP-regelnaam (informatief, kleine regel; tech-only, verborgen als Technische details uit staat)
         override       WithJustification | FalsePositive | WithoutJustification (DLP-instelling)
         justification  required | optional (reden verplicht of optioneel)
         variant        copilot: excluded (standaard) | noextract | prompt | web
         activity       endpoint: naam van de actie, bijv. "Kopiëren naar USB"
         file           bestandsnaam (extensie bepaalt het Office-logo); to: ontvanger
         location       spo: "onedrive" toont OneDrive (logo + ‘Mijn bestanden’) i.p.v. SharePoint
   - Previews.noticeKinds                           { kind: [apps] } voor het aanbieden van geldige combinaties.
   - Previews.quiet(app, ctx, text)                 document (office) of e-mail (outlook) zonder melding, met korte uitleg (Labelbeleid).
   - Previews.scene*()                              scènes voor Scenario's › ‘Bekijk het pad’ (sceneShare: o.onedrive). */

const PV_APPS = [
  { key: "office", name: "Word, Excel, PowerPoint", short: "Office", tile: "W", cls: "word" },
  { key: "outlook", name: "Outlook", short: "Outlook", tile: "O", cls: "outlook" },
  { key: "spo", name: "SharePoint & OneDrive", short: "SharePoint & OneDrive", tile: "S", cls: "spo" },
  { key: "teams", name: "Teams", short: "Teams", tile: "T", cls: "teams" },
  { key: "copilot", name: "Microsoft 365 Copilot", short: "Copilot", tile: "", cls: "copilot" },
  { key: "endpoint", name: "Windows-apparaat", short: "Apparaat", tile: "", cls: "endpoint" },
];

/** app → [BRAND_ASSETS-sleutel, lettertegel, css-klasse, fallback-icoon] */
const PV_TILES = {
  office: ["msWord", "W", "word"], word: ["msWord", "W", "word"], excel: ["msExcel", "X", "excel"], powerpoint: ["msPowerPoint", "P", "ppt"],
  outlook: ["msOutlook", "O", "outlook"], spo: ["msSharePoint", "S", "spo"], onedrive: ["msOneDrive", "", "onedrive", "cloud"], teams: ["msTeams", "T", "teams"],
  copilot: ["msCopilot", "", "copilot", "chat"], edge: ["msEdge", "", "edge", "globe"], endpoint: ["msWindows", "", "endpoint", "laptop"], windows: ["msWindows", "", "endpoint", "laptop"],
  purview: ["msPurview", "", "endpoint", "shield"],
};
/** Bestandsnaam → Office-app (voor het juiste logo in de titelbalk). */
function pvOfficeApp(name) {
  const m = /\.([a-z0-9]{2,5})\s*$/i.exec(String(name || ""));
  const x = m ? m[1].toLowerCase() : "";
  return /^(xlsx|xlsm|xls|csv)$/.test(x) ? "excel" : /^(pptx|pptm|ppt)$/.test(x) ? "powerpoint" : "word";
}

const Previews = {
  /** App-icoon: officieel Microsoft-logo als het in BRAND_ASSETS staat, anders een neutrale tegel. */
  tile(k, big) {
    const t = PV_TILES[k] || PV_TILES.office, cls = `pv-tile${big ? " big" : ""}`;
    if (typeof brandImg === "function" && typeof BRAND_ASSETS !== "undefined" && BRAND_ASSETS[t[0]]) return brandImg(t[0], "", `${cls} img`, ' aria-hidden="true"');
    return `<span class="${cls} ${t[2]}" aria-hidden="true">${t[1] || icon(t[3] || "app", "s")}</span>`;
  },
  _hex(c) { return /^#[0-9a-f]{6}$/i.test(String(c || "")) ? c : "#69797E"; },
  pill(l, st) { return `<span class="pv-pill"><span class="color-dot" style="background:${this._hex(l.color)}"></span>${esc(labelFullName(l, st))}</span>`; },
  /** Alles wat de mockups nodig hebben, één keer afgeleid. */
  facts(l, st = S()) {
    this._st = st;
    const rule = (d) => { try { return Generator.ruleFor(l, d, st); } catch (e) { return null; } };
    let pol = null;
    try { pol = Generator.labelPolicies(st).find((p) => (p.labels || []).includes(l)) || null; } catch (e) { pol = null; }
    const e = l.cfg.encryption;
    const perms = e.mode === "assignNow" ? e.permissions || [] : [];
    const extract = perms.length ? perms.some((p) => LabelDetail.rightsOf(p).includes("EXTRACT")) : true;
    const prio = labelPriority(l, st), lowerExists = applicableLabels(st).some((x) => labelPriority(x, st) < prio);
    return {
      l, st, sc: l.cfg.scope, enc: e, mark: l.cfg.marking, auto: l.cfg.autolabel.client, ct: l.cfg.container, mt: l.cfg.meetings,
      pol, set: pol ? pol.settings || {} : {}, extract, perms, lowerExists,
      ex: rule("exchange"), sh: rule("sharing"), tm: rule("teams"), ep: rule("endpoint"), cp: rule("copilot"),
      c: LabelDetail.ctx(l, st),
    };
  },
  /** Apps die voor dit label iets laten zien. */
  relevant(f) {
    const out = [];
    if (f.sc.files) out.push("office");
    if (f.sc.emails || f.ex) out.push("outlook");
    if (f.sc.files || f.sc.sites || f.sh) out.push("spo");
    if (f.sc.sites || f.sc.meetings || f.tm) out.push("teams");
    if (f.sc.files || f.sc.emails) out.push("copilot");
    if (f.ep && f.ep.actions.endpoint) out.push("endpoint");
    return out;
  },
  _illu() { return `<span class="pv-illu">${statusBadge("illustrative")}</span>`; },
  _chrome(k, title, extra = "", tk) { return `<div class="pv-chrome pv-${k}">${this.tile(tk || k)}<span class="pv-ctitle">${title}</span>${extra}${this._illu()}</div>`; },
  /** Wat merkt de gebruiker van één DLP-regel, in gewone taal. kind: audit | tip | encrypt | override | block. */
  ux(r, domKey, st = this._st || S()) {
    if (!r) return null;
    const d = domKey || r.domain, a = r.actions || {}, n = r.notify || {}, ov = n.override;
    const DOES = { exchange: "Mailt naar buiten", sharing: "Deelt een bestand", teams: "Stuurt een chatbericht", endpoint: "Kopieert, print of uploadt", copilot: "Vraagt Copilot naar het item", fabric: "Deelt of exporteert data", onprem: "Opent een bestand op de fileserver", instances: "Deelt in een cloud-app" };
    const REASON = { WithJustification: "Ja, zakelijke reden", FalsePositive: "Meldt fout-positief", WithoutJustification: "Nee" };
    const o = { does: DOES[d] || "Werkt met het item", kind: "audit", sees: "Niets", over: "n.v.t.", reason: "n.v.t.", next: "Beheer bekijkt Activity explorer", verify: false };
    if (d === "copilot") {
      if (a.copilotExclude) Object.assign(o, { kind: "block", sees: "Copilot gebruikt de inhoud niet; het item kan als bron verschijnen", over: "Nee", next: "Het bestand zelf openen" });
      return o;
    }
    if (d === "onprem") return Object.assign(o, a.onprem ? { kind: "block", sees: "Geen melding; alleen ‘geen toegang’", over: "Nee", next: "Eigenaar of beheer vragen" } : {});
    if (d === "endpoint") {
      const lv = (a.endpoint || []).map((x) => x.level);
      const just = { both: "Ja, keuzelijst of eigen tekst", default: "Ja, uit keuzelijst", custom: "Ja, eigen tekst" }[(st.endpoint || {}).justificationMode] || "Ja";
      if (lv.includes("block") && lv.includes("warn")) return Object.assign(o, { kind: "block", sees: "Windows-melding bij beperkte acties", over: "Deels (alleen acties met override)", reason: just, next: "Andere route kiezen of reden opgeven" });
      if (lv.includes("block")) return Object.assign(o, { kind: "block", sees: "Windows-melding: actie geblokkeerd", over: "Nee", next: "Andere route kiezen of beheer vragen" });
      if (lv.includes("warn")) return Object.assign(o, { kind: "override", sees: "Windows-melding met keuze om door te gaan", over: "Ja", reason: just, next: "Doorgaan met reden of annuleren" });
      return o;
    }
    if (d === "instances") return Object.assign(o, n.email ? { kind: "tip", sees: "E-mailmelding", over: "n.v.t.", reason: "Nee", next: "Delen controleren" } : {});
    if (a.blockAccess) {
      const SEES = { exchange: ov ? "Policy tip in Outlook" : "Policy tip; mail wordt niet bezorgd (NDR)", sharing: "Policy tip bij het bestand; externen krijgen geen toegang", teams: "Bericht geblokkeerd; ontvanger ziet de inhoud niet", fabric: "Policy tip bij het item" };
      Object.assign(o, { kind: ov ? "override" : "block", sees: SEES[d] || "Blokkade met policy tip", over: ov ? "Ja" : "Nee", reason: ov ? REASON[ov] || "Ja" : "n.v.t.", next: ov ? "Doorgaan met reden, of ontvangers aanpassen" : "Inhoud of ontvangers aanpassen" });
      if (ov && !n.tip) Object.assign(o, { sees: "Blokkade zonder policy tip", over: "Niet zichtbaar zonder policy tip" });
      return o;
    }
    if (a.encrypt) return Object.assign(o, { kind: "encrypt", sees: "Niets; de mail gaat versleuteld weg", next: "Ontvanger opent via Outlook of link" });
    if (n.tip) return Object.assign(o, { kind: "tip", sees: "Policy tip (waarschuwing)", over: "Niet nodig; actie gaat door", reason: "Nee", next: "Zelf controleren en zo nodig aanpassen" });
    return o;
  },
  UX_KIND: { audit: ["Alleen registreren", 1], tip: ["Policy tip", 1], encrypt: ["Versleutelen", 2], override: ["Blokkeren met override", 2], block: ["Blokkeren", 3] },
  /** Compacte regel: doet · ziet · overrulen · reden · wat nu. */
  uxHtml(r, domKey, st) {
    const o = this.ux(r, domKey, st);
    if (!o) return "";
    const k = this.UX_KIND[o.kind] || this.UX_KIND.audit;
    return `<dl class="pv-ux"><div class="pv-ux-k"><dt class="sr-only">Niveau</dt><dd><span class="pv-uxkind lv-${k[1]}">${esc(k[0])}</span></dd></div>
      <div><dt>Doet</dt><dd>${esc(o.does)}</dd></div><div><dt>Ziet</dt><dd>${esc(o.sees)}</dd></div>
      <div><dt>Overrulen</dt><dd>${esc(o.over)}${o.verify ? " " + statusBadge("verify") : ""}</dd></div><div><dt>Reden</dt><dd>${esc(o.reason)}</dd></div><div><dt>Wat nu</dt><dd>${esc(o.next)}</dd></div></dl>`;
  },
  _bar(kind, ic, html) { return `<div class="pv-bar ${kind}">${icon(ic, "s")}<div>${html}</div></div>`; },
  _lockText(f) {
    const e = f.enc, st = f.st;
    if (e.mode === "assignNow") return `Beperkte toegang: ${esc(f.perms.map((p) => Mapping.principalName(p, st) + " (" + Mapping.levelName(p.level) + ")").join(", ") || "alleen de eigenaar")}`;
    if (e.mode === "userDefined") return e.userDefined.outlook === "DoNotForward" ? "Do Not Forward: ontvangers kunnen niet doorsturen, afdrukken of kopiëren" : e.userDefined.outlook === "EncryptOnly" ? "Encrypt-Only: versleuteld, ontvangers kunnen niet ‘Opslaan als’ of exporteren" : "De gebruiker kiest zelf wie wat mag (rechtenvenster)";
    return "";
  },
  /** Kleine mockup van een (Office-)dialoog. */
  _dialog(title, body, btns) { return `<div class="pv-dialog"><div class="pv-dtitle">${title}</div><div class="pv-dbody">${body}</div><div class="pv-dbtns">${btns.map((b, i) => `<span class="pv-btn${i === 0 ? " primary" : ""}">${b}</span>`).join("")}</div></div>`; },
  _tipBar(r, what, def = "") {
    if (!r) return "";
    const tip = r.notify.tip ? esc(r.notify.tip) : esc(def);
    if (r.actions.blockAccess) {
      const ov = r.notify.override;
      return this._bar(ov ? "warn" : "err", ov ? "warning" : "xcircle", `<b>${ov ? "Policy tip – actie nodig" : "Geblokkeerd door beleid"}</b>${tip ? `<div>${tip}</div>` : ""}<div class="pv-links">${def ? "<span>Details weergeven</span>" : ""}${ov ? `<span>Overschrijven${ov === "WithJustification" || ov === "FalsePositive" ? " (met reden)" : ""}</span>` : ""}${ov === "FalsePositive" ? "<span>Fout-positief melden</span>" : ""}<span>Meer informatie</span></div>${!ov ? `<div class="xs">${esc(what)}</div>` : ""}`);
    }
    if (r.actions.encrypt) return this._bar("info", "lock", `<b>Wordt versleuteld verzonden</b>${r.notify.tip ? `<div>${tip}</div>` : ""}`);
    if (r.notify.tip) return this._bar("warn", "info", `<b>Policy tip</b><div>${tip}</div>`);
    return "";
  },
  _docLines(n = 6) { return Array.from({ length: n }, (_, i) => `<div class="doc-line${["", " m", " s", "", " m", " s"][i % 6]}"></div>`).join(""); },
  /** Korte uitleg van een DLP-regel in klanttaal + modus + inklapbare technische regel. */
  _ruleNote(r, dom, where) {
    if (!r) return `Er is geen DLP-regel voor ${where} met dit label.`;
    const a = r.actions;
    const what = a.blockAccess ? (r.notify.override ? "blokkeert, maar de medewerker kan met een reden doorgaan" : "blokkeert")
      : a.encrypt ? "versleutelt het bericht automatisch"
      : a.copilotExclude ? "zorgt dat Copilot deze items niet gebruikt"
      : a.endpoint ? "beperkt acties op het apparaat"
      : r.notify.tip ? "toont een waarschuwing (policy tip)" : "legt alleen vast, zonder melding";
    const mode = r.domain === "copilot" && !a.copilotExclude ? "simulation" : Generator.modeFor(dom, this._st || S());
    const mtxt = mode === "simulation" ? ` <span class="badge warn">Simulatie</span> Nu nog in simulatie: medewerkers merken niets. Dit zien ze na inschakelen.`
      : mode === "simulationTips" ? ` <span class="badge info">Simulatie + tips</span> Medewerkers zien nu alleen de policy tip; blokkeren gebeurt pas na inschakelen.`
      : mode === "disable" ? ` <span class="badge neutral">Uit</span> Het beleid staat uit.` : "";
    return `DLP voor ${where} ${what}.${mtxt} <details class="pv-tech tech-only"><summary>Technische regel</summary>${esc(r.desc)}</details>`;
  },

  /* ---------- Office ---------- */
  office(f) {
    const { l, st, mark: m, c, auto, set } = f, LD = LabelDetail;
    const mk = (x, cls) => (x.enabled && x.text ? `<div class="doc-mark ${cls}" style="${LD._markStyle(x)}">${esc(LD.resolve(x.text, "W", c))}</div>` : "");
    const wm = m.watermark.enabled && m.watermark.text ? `<div class="doc-wm ${m.watermark.layout === "Horizontal" ? "" : "diagonal"}"><span style="color:${LD._hex(m.watermark.color, "#7F7F7F")};font-size:${clamp(Math.round((Number(m.watermark.size) || 36) * 0.55), 10, 36)}px;font-family:${LD._font(m.watermark.font)},sans-serif">${esc(LD.resolve(m.watermark.text, "W", c))}</span></div>` : "";
    const bars = [];
    if (auto.mode === "recommend") bars.push(this._bar("warn", "bulb", `<b>Aanbevolen label</b><div>${esc(auto.message || `Je organisatie raadt aan het label ‘${labelFullName(l, st)}’ toe te passen.`)}</div><div class="pv-links"><span>Gevoeligheid wijzigen</span><span>Negeren</span></div>`));
    if (auto.mode === "auto") bars.push(this._bar("info", "wand", `<b>Label automatisch toegepast</b><div>${esc(auto.message || `Dit document is gelabeld als ‘${labelFullName(l, st)}’.`)}</div>`));
    const lock = this._lockText(f);
    if (lock) bars.push(this._bar("lock", "lock", `<b>${f.enc.mode === "assignNow" ? "Beperkte toegang" : "Versleuteling"}</b><div>${lock}</div><div class="pv-links"><span>Machtigingen weergeven</span></div>`));
    const win = `<div class="pv-win">${this._chrome("office", `${esc(c.item)}`, `<span class="pv-sensbar" title="Sensitivity bar">${this.pill(l, st)}</span>`, pvOfficeApp(c.item))}
      <div class="pv-ribbon"><span>Bestand</span><span class="on">Start</span><span>Invoegen</span><span>Controleren</span><span class="pv-sensbtn">${icon("shield", "s")} Gevoeligheid</span></div>
      ${bars.join("")}
      <div class="pv-docwrap"><div class="doc-page pv-page">${mk(m.header, "header")}${wm}<div class="doc-line h"></div>${this._docLines(7)}${mk(m.footer, "footer")}</div></div></div>`;
    const side = [];
    if (set.justification && f.lowerExists) side.push(this._dialog("Motivatie vereist", `Je verlaagt de classificatie van dit document of verwijdert het label. Waarom?<div class="pv-radios"><span>○ Vorig label is niet meer van toepassing</span><span>○ Vorig label was onjuist</span><span>○ Anders (toelichten)</span></div>`, ["Wijzigen", "Annuleren"]));
    if (set.mandatoryDocs) side.push(this._dialog("Label vereist", "Je organisatie vereist een gevoeligheidslabel voor dit document.", ["Label kiezen", "Alleen-lezen openen"]));
    if (f.enc.mode === "userDefined" && f.enc.userDefined.office) side.push(this._dialog("Machtigingen", "Kies wie dit document mag openen en wat ze mogen doen.<div class=\"pv-field\">Gebruikers: collega@…</div><div class=\"pv-radios\"><span>● Lezen</span><span>○ Wijzigen</span></div>", ["OK", "Annuleren"]));
    const notes = [
      `Het label staat in de titelbalk en onder de knop <b>Gevoeligheid</b>. De kleur helpt het herkennen.`,
      m.header.enabled || m.footer.enabled || m.watermark.enabled ? `Markering (${[m.header.enabled && "koptekst", m.footer.enabled && "voettekst", m.watermark.enabled && "watermerk"].filter(Boolean).join(", ")}) wordt door Office toegevoegd zodra het label wordt gekozen. Een watermerk verschijnt alleen in documenten, niet in e-mail.` : "Dit label voegt geen zichtbare markering toe.",
      lock ? (f.extract ? "Versleuteling reist mee met het bestand, ook als het wordt gedownload of gemaild." : "Versleuteling reist mee met het bestand. Zonder het recht ‘kopiëren’ (EXTRACT) kan Copilot de inhoud niet gebruiken.") : "",
      set.defaultDocs === l.id ? "Dit is het <b>standaardlabel</b>: nieuwe documenten krijgen het automatisch." : "",
      set.mandatoryDocs ? "Verplicht labelen: Office vraagt om een label bij openen of opslaan van een document zonder label; bij openen kan de medewerker ook alleen-lezen kiezen. Een label kan daarna wel gewijzigd, maar niet verwijderd worden." : "",
      side.length ? "De dialogen zijn indicatief; de exacte teksten verschillen per app en versie." : "",
    ];
    return { main: win, side: side.join(""), notes, learn: "labelsOffice" };
  },

  /* ---------- Outlook ---------- */
  outlook(f) {
    const { l, st, mark: m, c, ex, set } = f, LD = LabelDetail;
    const mhd = (x) => (x.enabled && x.text ? `<div class="pv-mailmark pv-after" title="Wordt bij verzenden toegevoegd" style="${LD._markStyle(x)}">${esc(LD.resolve(x.text, "O", c))}</div>` : "");
    const ext = !ex || ex.scope !== "internal";
    const lock = f.sc.emails ? this._lockText(f) : "";
    const win = `<div class="pv-win">${this._chrome("outlook", "Nieuw bericht")}
      <div class="pv-mailhead"><div><span class="muted">Aan</span> ${ext ? "partner@extern.nl" : "collega@" + esc(c.upn.split("@")[1] || "contoso.nl")}</div>      <div class="pv-subj"><span class="muted">Onderwerp</span> Kwartaalrapportage Q3${f.sc.emails ? `<span class="pv-sensbar" title="${l.tooltip ? esc(String(l.tooltip).slice(0, 120)) : "Gevoeligheid"}">${icon("shield", "s")} ${this.pill(l, st)}</span>` : ""}</div></div>
            ${lock ? this._bar("lock", "lock", lock) : ""}
            ${this._tipBar(ex, "Het bericht kan niet worden verzonden zolang de ontvangers of de inhoud niet zijn aangepast.", "Je e-mail is in strijd met een beleid in je organisatie.")}
      <div class="pv-mailbody">${f.sc.emails ? mhd(m.header) : ""}<div>Beste partner,</div>${this._docLines(4)}${f.sc.emails ? mhd(m.footer) : ""}</div>
      <div class="pv-mailfoot"><span class="pv-btn primary">Verzenden</span><span class="pv-attach">${icon("doc", "s")} Kwartaalrapportage Q3.docx</span></div></div>`;
    const side = [];
    if (ex && ex.actions.blockAccess && ex.notify.override) side.push(this._dialog("Beleid overschrijven", `Je verzendt gevoelige informatie buiten de organisatie.${ex.notify.override === "WithJustification" ? `<div class="pv-field pv-just">Zakelijke reden (verplicht)</div>` : ""}${ex.notify.override === "FalsePositive" ? `<div class="pv-radios"><span>○ Dit is een fout-positief</span></div>` : ""}`, ["Verzenden", "Annuleren"]));
    if (set.mandatoryEmail) side.push(this._dialog("Label vereist", "Kies een gevoeligheidslabel voordat je dit bericht verzendt.", ["Label kiezen", "Annuleren"]));
    const notes = [
      f.sc.emails ? "Het label staat in de onderwerpregel. Ontvangers in je eigen organisatie zien het ook; externe ontvangers zien alleen markeringen en versleuteling." : "Dit label is niet voor e-mail beschikbaar; de regel hieronder reageert op een gelabelde bijlage.",
      this._ruleNote(ex, "exchange", "e-mail"),
      f.sc.emails && (m.header.enabled || m.footer.enabled) ? "Kop- en voettekst (gestippeld) worden pas bij verzenden toegevoegd; een watermerk komt niet in e-mail." : "",
      f.enc.mode === "userDefined" && f.enc.userDefined.outlook === "EncryptOnly" ? "Encrypt-Only: Copilot en kopiëren blijven voor de ontvanger mogelijk." : "",
    ];
    return { main: win, side: side.join(""), notes, learn: ex ? "dlpTips" : "labelsOffice" };
  },

  /* ---------- SharePoint & OneDrive ---------- */
  spo(f) {
    const { l, st, sh, ct } = f;
    const others = applicableLabels(st).filter((x) => x !== l).slice(0, 2);
    const blocked = sh && sh.actions.blockAccess, warned = sh && !blocked && !!sh.notify.tip;
    const ico = blocked ? `<span class="pv-blockico" title="Geblokkeerd door DLP">${icon("xcircle", "s")}</span>` : warned ? `<span class="pv-blockico warn" title="Policy tip (DLP)">${icon("warning", "s")}</span>` : "";
    const row = (name, lab, mine) => `<tr${mine ? ' class="on"' : ""}><td>${icon("doc", "s")} ${mine ? ico : ""}${esc(name)}</td><td class="xs muted">${mine ? "Zojuist" : "Gisteren"}</td><td>${lab ? this.pill(lab, st) : `<span class="xs muted">—</span>`}</td></tr>`;
    const lib = f.sc.files || sh ? `<table class="pv-lib"><thead><tr><th>Naam</th><th>Gewijzigd</th><th>Gevoeligheid</th></tr></thead><tbody>
      ${row("Kwartaalrapportage Q3.docx", f.sc.files ? l : null, true)}${row("Notulen overleg.docx", others[0], false)}${row("Planning.xlsx", others[1] || null, false)}</tbody></table>` : "";
    const scopeTxt = sh ? ({ All: "iedereen behalve de eigenaar, de laatste wijziger en de primaire sitebeheerder", PerUser: "personen buiten je organisatie", PerAnonymousUser: "personen met een ‘Iedereen’-link" })[sh.actions.blockScope] || "" : "";
    const defTip = !sh ? "" : blocked ? (sh.notify.override ? "Dit item is in strijd met een beleid in je organisatie. Toegang tot dit bestand kan worden geblokkeerd." : `Dit item is in strijd met een beleid in je organisatie. Toegang is geblokkeerd voor ${scopeTxt}.`) : "Dit item is in strijd met een beleid in je organisatie.";
    const pane = sh && (blocked || warned) ? `<div class="pv-share"><div class="pv-dtitle">${icon("info", "s")} Details · Kwartaalrapportage Q3.docx</div><div class="xs muted">Informatie › Beleidstip weergeven</div>
      ${this._bar(blocked && !sh.notify.override ? "err" : "warn", blocked && !sh.notify.override ? "xcircle" : "warning", `<b>Beleidstip</b><div>${esc(sh.notify.tip || defTip)}</div>${blocked ? `<div class="xs">Geblokkeerd voor: ${esc(scopeTxt)}</div>` : ""}<div class="pv-links">${sh.notify.override ? "<span>Oplossen › Overschrijven</span>" : ""}${sh.notify.override === "FalsePositive" ? "<span>Fout-positief melden</span>" : ""}<span>Meer informatie</span></div>`)}</div>` : "";
    const sharingName = (CATALOG.siteSharing.find((x) => x[0] === ct.sharing) || [0, ct.sharing])[1];
    const privName = (CATALOG.containerPrivacy.find((x) => x[0] === ct.privacy) || [0, ""])[1];
    const site = f.sc.sites ? `<div class="pv-site">${this._chrome("spo", "Site Finance")}<div class="pv-sitehead"><span class="pv-sitelogo">F</span><div><b>Finance</b><div class="xs">${ct.privacy === "private" ? "Privégroep" : ct.privacy === "public" ? "Openbare groep" : "Groep"} · ${this.pill(l, st)}</div></div></div>
      <div class="pv-sitefacts xs"><div>${icon("share", "s")} Extern delen: <b>${esc(sharingName)}</b></div><div>${icon("users", "s")} Gasten toevoegen: <b>${ct.externalUserAccess ? "toegestaan" : "niet toegestaan"}</b></div>${ct.unmanaged !== "full" ? `<div>${icon("laptop", "s")} Onbeheerde apparaten: <b>${ct.unmanaged === "block" ? "geblokkeerd" : "alleen web"}</b></div>` : ""}${privName && ct.privacy !== "unspecified" ? `<div>${icon("lock", "s")} Privacy: <b>${esc(privName)}</b></div>` : ""}</div></div>` : "";
    const notes = [
      f.sc.files ? "In de bibliotheek staat het label in de kolom <b>Gevoeligheid</b>; zo ziet iedereen in één oogopslag wat gevoelig is." : "",
      blocked ? "Een rood symbool bij het bestand betekent dat DLP de toegang blokkeert; een geel symbool is alleen een waarschuwing. Via <b>Informatie › Beleidstip weergeven</b> ziet de medewerker waarom." : warned ? "Een geel waarschuwingssymbool bij het bestand: via <b>Informatie › Beleidstip weergeven</b> ziet de medewerker waarom." : "",
      this._ruleNote(sh, "sharing", "delen"),
      f.sc.sites ? "Het label op de site bepaalt privacy, gasten en extern delen. Geldt er ook een tenantinstelling, dan wint de strengste." : "",
    ];
    const odNote = `<span class="pv-also" title="OneDrive toont bestanden, label en policy tip op dezelfde manier">${this.tile("onedrive")}<span>ook in OneDrive</span></span>`;
    const libWin = lib || pane ? `<div class="pv-win">${this._chrome("spo", "SharePoint · Documenten", odNote)}${lib}${pane}</div>` : "";
    return { main: libWin, side: site, notes, learn: sh ? "dlpTips" : f.sc.sites ? "labelsContainers" : "labelsSpo" };
  },

  /* ---------- Teams ---------- */
  teams(f) {
    const { l, st, tm, ct, mt } = f;
    const team = f.sc.sites ? `<div class="pv-teamhead">${this.tile("teams")}<div><b>Finance</b> <span class="xs muted">${ct.privacy === "private" ? "Privé" : ct.privacy === "public" ? "Openbaar" : ""}</span><div class="xs muted">Algemeen${ct.externalUserAccess ? "" : ` · ${icon("users", "s")} geen gasten`}</div></div><span class="pv-sensbar" title="Label rechtsboven in het kanaal">${this.pill(l, st)}</span></div>` : "";
    const blocked = tm && tm.actions.blockAccess;
    const chat = `<div class="pv-chat"><div class="pv-msg me${blocked ? " blocked" : ""}"><div class="xs muted">Jij · 10:42</div>Hierbij de cijfers van Q3 en het IBAN voor de betaling.${blocked ? `<div class="pv-msgblock">${icon("xcircle", "s")} Dit bericht is geblokkeerd. <u>Wat kan ik doen?</u></div>` : tm && tm.notify.tip ? `<div class="pv-msgtip">${icon("info", "s")} ${esc(tm.notify.tip)}</div>` : ""}</div>
      ${blocked ? `<div class="pv-msg other"><div class="xs muted">Bij de ontvanger</div><i>${icon("xcircle", "s")} Dit bericht is geblokkeerd vanwege gevoelige inhoud.</i></div>` : ""}</div>`;
    const why = blocked ? this._dialog("Wat kan ik doen?", `Dit bericht bevat gevoelige informatie en is geblokkeerd.${tm.notify.tip ? `<div>${esc(tm.notify.tip)}</div>` : ""}${tm.notify.override === "WithJustification" ? `<div class="pv-field pv-just">Zakelijke reden (verplicht)</div>` : ""}`, tm.notify.override ? ["Overschrijven en verzenden", tm.notify.override === "FalsePositive" ? "Fout-positief melden" : "Annuleren"] : ["Sluiten"]) : "";
    const ms = [
      mt.lobbyBypass !== "default" ? `<div>Lobby: <b>${esc((CATALOG.meetingLobby.find((x) => x[0] === mt.lobbyBypass) || [0, mt.lobbyBypass])[1])}</b></div>` : "",
      mt.whoCanRecord !== "default" ? `<div>Opnemen: <b>${esc((CATALOG.meetingRecorders.find((x) => x[0] === mt.whoCanRecord) || [0, mt.whoCanRecord])[1])}</b></div>` : "",
      mt.preventCopyChat ? "<div>Chat kopiëren: <b>uit</b></div>" : "", mt.watermarkScreen ? "<div>Watermerk bij scherm delen: <b>aan</b></div>" : "", mt.e2ee ? "<div>End-to-end versleuteling: <b>aan</b></div>" : "",
    ].join("");
    const meet = f.sc.meetings ? `<div class="pv-meet"><div class="pv-dtitle">${icon("meeting", "s")} Teams-vergadering · ${this.pill(l, st)} ${typeof teamsPremiumBadge === "function" ? teamsPremiumBadge() : ""}</div><div class="xs pv-sitefacts">${ms || `<div class="muted">Geen vergaderinstellingen afgedwongen; de organisator kiest zelf.</div>`}</div></div>` : "";
    const panel = `<div class="pv-win">${this._chrome("teams", "Microsoft Teams")}${team}${blocked || tm ? `<div class="xs muted pv-pad">${tm && tm.scope === "external" ? "Chat met een externe gast" : "Chat"}</div>` : ""}${chat}</div>`;
    const notes = [
      f.sc.sites ? "Het label staat rechtsboven in elk kanaal van het team en bepaalt privacy en of gasten mogen worden toegevoegd." : "",
      this._ruleNote(tm, "teams", "Teams-chat") + (blocked ? " De afzender ziet ‘Dit bericht is geblokkeerd. Wat kan ik doen?’; de ontvanger ziet de inhoud niet." : ""),
      tm ? "Teams-berichten hebben zelf geen label: DLP herkent gevoelige gegevens in de tekst. Bestanden die in Teams worden gedeeld, vallen onder DLP voor SharePoint en OneDrive." : "",
      f.sc.meetings ? "Bij een vergadering met dit label gelden de vergaderinstellingen automatisch. Labels voor vergaderingen vereisen Teams Premium." : "",
    ];
    return { main: panel, side: why + meet, notes, learn: tm ? "dlpTeams" : f.sc.meetings ? "labelsMeetings" : "labelsContainers" };
  },

  /* ---------- Copilot ---------- */
  copilot(f) {
    const { l, st, cp } = f;
    const excluded = cp && cp.actions.copilotExclude;
    const dke = (f.enc.mode === "assignNow" || f.enc.mode === "userDefined") && !!f.enc.dke;
    const noExtract = !f.extract && !dke;
    const ud = f.enc.mode === "userDefined" && !dke;
    const blocked = excluded || noExtract || dke || ud;
    const cite = (n) => `<div class="pv-cite">${n ? `<span class="pv-citen">${n}</span> ` : ""}${icon("doc", "s")} Kwartaalrapportage Q3.docx</div>`;
    const answer = dke || (ud && !excluded)
      ? `<div class="pv-cpans"><p>Ik heb geen informatie gevonden over het kwartaalrapport Q3.</p></div>`
      : excluded
        ? `<div class="pv-cpans"><p>Ik kan geen samenvatting maken van de gevonden informatie.</p>${cite(1)}</div>`
        : noExtract
          ? `<div class="pv-cpans"><p>Ik kan dit bestand niet samenvatten, maar je kunt het hier openen:</p>${cite(1)}</div>`
          : `<div class="pv-cpans"><div class="pv-cplabel">${icon("shield", "s")} Gevoeligheid: ${this.pill(l, st)}</div><p>De omzet in Q3 steeg met 8% <sup>1</sup>. De grootste stijging zat in…</p>${cite(1)}</div>`;
    const win = `<div class="pv-win">${this._chrome("copilot", "Microsoft 365 Copilot")}<div class="pv-chat"><div class="pv-msg me">Vat het kwartaalrapport Q3 samen.</div>${answer}</div></div>`;
    const side = !blocked ? this._dialog("Nieuw document met Copilot", `Copilot maakt een concept op basis van het kwartaalrapport.<div class="pv-field">Label: ${this.pill(l, st)}</div>`, ["Behouden"]) : "";
    const notes = [
      dke ? "Double Key Encryption: Copilot vindt en gebruikt deze bestanden helemaal niet, ook niet als link."
        : excluded ? "Het bestand kan nog als bron (citatie) verschijnen, maar de inhoud wordt niet gebruikt in het antwoord."
          : ud ? "Gebruikersrechten (user-defined): Copilot vindt ongeopende bestanden in SharePoint en OneDrive niet, tenzij de gebruiker het bestand met ‘/’ noemt en het recht kopiëren (EXTRACT) heeft. In een geopend bestand werkt Copilot wel."
          : noExtract ? "Versleuteling zonder recht ‘kopiëren’ (EXTRACT): Copilot vat de inhoud niet samen, maar kan wel naar het bestand linken."
            : "Copilot respecteert het label en de rechten: alleen wie het bestand mag openen, krijgt de inhoud in een antwoord.",
      !blocked ? "Het antwoord toont het label met de hoogste prioriteit van de gebruikte bronnen; een nieuw document met Copilot erft dat label (niet bij gebruikersrechten/user-defined)." : "",
      cp ? "Een Copilot-DLP-regel op labels geeft geen policy tip: de gebruiker ziet alleen dat de inhoud niet wordt gebruikt. Het standaardbeleid draait in simulatie." : "",
      cp ? this._ruleNote(cp, "copilot", "Copilot") : "",
    ];
    return { main: win, side, notes, learn: cp ? "dlpCopilot" : "labelsCopilot" };
  },

  /* ---------- Endpoint ---------- */
  endpoint(f) {
    const { ep, st } = f;
    const acts = (ep && ep.actions.endpoint) || [];
    const nm = (k) => { const a = CATALOG.endpointActivities.find((x) => x.key === k); return a ? a.nl || a.name : k; };
    const pick = acts.find((a) => a.key === "usb") || acts.find((a) => a.level !== "audit") || acts[0];
    const lvlName = { block: "Geblokkeerd", warn: "Geblokkeerd, overschrijven mogelijk", audit: "Alleen vastgelegd (geen melding)" };
    const toast = pick && pick.level !== "audit" ? `<div class="pv-toast"><div class="pv-toasthead">${this.tile("windows")} Windows-melding</div><b>${pick.level === "block" ? "Deze actie is geblokkeerd" : "Deze actie is beperkt"}</b>
        <div>${esc(nm(pick.key))}: ‘Kwartaalrapportage Q3.docx’ bevat gevoelige informatie${ep.notify.tip ? ". " + esc(ep.notify.tip) : "."}</div>
        ${pick.level === "warn" ? `<div class="pv-radios">${(((st.endpoint || {}).justificationOptions || []).length ? st.endpoint.justificationOptions : ["Dit hoort bij een bestaand werkproces", "Mijn manager heeft dit goedgekeurd", "Dringend nodig; ik informeer mijn manager", "De informatie is niet gevoelig", "Anders"]).slice(0, 5).map((o, i) => `<span>${i ? "○" : "●"} ${esc(o)}</span>`).join("")}</div><div class="pv-dbtns"><span class="pv-btn primary">Toestaan</span><span class="pv-btn">Annuleren</span></div>` : `<div class="pv-dbtns"><span class="pv-btn">Sluiten</span></div>`}</div>`
      : `<div class="xs muted">${pick ? "Alleen vastleggen: de gebruiker krijgt geen melding." : "Geen endpoint-regel voor dit label."}</div>`;
    const grp = ["block", "warn", "audit"].map((lv) => [lv, acts.filter((a) => a.level === lv)]).filter(([, xs]) => xs.length);
    const list = grp.length ? `<div class="pv-acts">${grp.map(([lv, xs]) => `<div><span class="pv-lv ${lv}">${esc(lvlName[lv])}</span><ul>${xs.map((a) => `<li>${esc(nm(a.key))}</li>`).join("")}</ul></div>`).join("")}</div>` : "";
    const main = `<div class="pv-desk">${this._illu()}${toast}</div>`;
    const notes = [
      "Op een onboarded Windows- of Mac-apparaat ziet de gebruiker een melding zodra een geblokkeerde actie wordt geprobeerd. De tekst van de melding kun je zelf aanpassen; opmaak en standaardtekst zijn illustratief (controleer in de portal).",
      this._ruleNote(ep, "endpoint", "apparaten"),
      acts.some((a) => a.level === "warn") ? "Bij ‘Block with override’ kiest de gebruiker een reden en kan dan doorgaan; dat wordt vastgelegd." : "",
      "Alleen-vastleggen (audit) geeft geen melding, maar is zichtbaar in Activity explorer.",
    ];
    return { main, side: list, notes, learn: "endpointUsing" };
  },

  /** Volledig paneel: app-tabs + mockup + uitleg. o.compact = kleinere variant (modal/scenario). */
  panel(l, st = S(), app, o = {}) {
    if (!l) return emptyState("eye", "Geen label", "Kies een label om te zien wat de gebruiker ziet.");
    if (hasChildren(l, st)) return msg("info", "Dit is een parent-label: gebruikers kiezen een van de sublabels. Kies een sublabel om het voorbeeld te zien.");
    const f = this.facts(l, st), rel = this.relevant(f);
    if (!rel.length) return msg("info", "Dit label heeft geen scope voor bestanden, e-mail, sites of meetings; er is niets te tonen.");
    const cur = rel.includes(app) ? app : rel[0];
    let r;
    try { r = this[cur](f); } catch (e) { console.error(e); return msg("warn", "Voorbeeld kon niet worden gemaakt."); }
    const tabsHtml = `<div class="pv-tabs" role="tablist" aria-label="Kies een app">${rel.map((k) => { const a = PV_APPS.find((x) => x.key === k); return `<button type="button" role="tab" class="pv-tabbtn${k === cur ? " on" : ""}" aria-selected="${k === cur}" tabindex="${k === cur ? 0 : -1}" data-action="pv-app" data-app="${k}" data-label="${esc(l.id)}">${this.tile(k)}${k === "spo" ? this.tile("onedrive") : ""}<span>${esc(a.short)}</span></button>`; }).join("")}</div>`;
    const notes = r.notes.filter(Boolean);
    const uxRule = { outlook: [f.ex, "exchange"], spo: [f.sh, "sharing"], teams: [f.tm, "teams"], endpoint: [f.ep, "endpoint"], copilot: [f.cp, "copilot"] }[cur];
    const uxHtml = uxRule && uxRule[0] ? this.uxHtml(uxRule[0], uxRule[1], st) : "";
    return `<div class="pv-wrap${o.compact ? " compact" : ""}" data-label="${esc(l.id)}" data-app="${cur}"${o.compact ? ' data-compact="1"' : ""}>
      ${tabsHtml}
      ${uxHtml}
      <div class="pv-stage"><div class="pv-main">${r.main}</div>${r.side ? `<div class="pv-side">${r.side}</div>` : ""}</div>
      ${notes.length ? `<ul class="pv-notes">${notes.map((n) => `<li>${n}</li>`).join("")}</ul>` : ""}
      <div class="xs muted pv-foot">${icon("info", "s")} Illustratief op basis van jullie keuzes; echte schermen verschillen per app, versie en taal. ${learn(r.learn)}</div>
    </div>`;
  },

  /* ---------- Scènes voor Scenario’s › ‘Bekijk het pad’ ----------
     Platte tekst wordt hier ge-escaped; parameters die op ‘Html’ eindigen zijn al veilige html (bijv. this.pill). */
  _sc(k, title, inner, cls = "", tk) { return `<div class="pv-win pv-scene${cls ? " " + cls : ""}">${this._chrome(k, esc(title), "", tk)}${inner}</div>`; },
  /** Lege/neutrale pill als de inhoud (nog) geen label heeft. */
  noPill() { return `<span class="pv-pill pv-nolabel">${icon("tag", "s")} Geen label</span>`; },
  /** Balk in de stijl van een policy tip. kind: block | override | encrypt | tip | audit | lock | auto | recommend | none. */
  sceneBar(kind, title, text, links = []) {
    const m = { block: ["err", "xcircle"], override: ["warn", "warning"], encrypt: ["info", "lock"], tip: ["warn", "info"], audit: ["lock", "eye"], lock: ["lock", "lock"], auto: ["info", "wand"], recommend: ["warn", "bulb"], none: ["lock", "info"] }[kind] || ["lock", "info"];
    return this._bar(m[0], m[1], `<b>${esc(title)}</b>${text ? `<div>${esc(text)}</div>` : ""}${links.length ? `<div class="pv-links">${links.map((x) => `<span>${esc(x)}</span>`).join("")}</div>` : ""}`);
  },
  /** E-mail opstellen/ontvangen. o: { to, from, subj, body, attach, pillHtml, barsHtml, foot: send|inbox|none } */
  sceneMail(o = {}) {
    const inbox = o.foot === "inbox";
    return this._sc("outlook", inbox ? "Postvak IN" : "Nieuw bericht", `
      <div class="pv-mailhead">${inbox ? `<div><span class="muted">Van</span> ${esc(o.from || "")}</div>` : `<div><span class="muted">Aan</span> ${esc(o.to || "")}</div>`}<div class="pv-subj"><span class="muted">Onderwerp</span> ${esc(o.subj || "")}${o.pillHtml ? `<span class="pv-sensbar">${icon("shield", "s")} ${o.pillHtml}</span>` : ""}</div></div>
      ${o.barsHtml || ""}
      <div class="pv-mailbody">${o.lockedHtml || `<div>${esc(o.body || "")}</div>${this._docLines(2)}`}</div>
      ${o.foot === "none" ? "" : `<div class="pv-mailfoot">${inbox ? `<span class="pv-btn">Beantwoorden</span><span class="pv-btn">Doorsturen</span>` : `<span class="pv-btn primary">Verzenden</span>`}${o.attach ? `<span class="pv-attach">${icon("doc", "s")} ${esc(o.attach)}</span>` : ""}</div>`}`);
  },
  /** Office-document met gevoeligheidsbalk. o: { file, pillHtml, barsHtml, wm } */
  sceneDoc(o = {}) {
    return this._sc("office", o.file || "Document", `${o.barsHtml || ""}<div class="pv-docwrap"><div class="doc-page pv-page pv-scdoc">${o.pillHtml ? `<div class="pv-scsens">${icon("shield", "s")} Gevoeligheid: ${o.pillHtml}</div>` : ""}${o.wm ? `<div class="doc-wm diagonal"><span>${esc(o.wm)}</span></div>` : ""}<div class="doc-line h"></div>${o.textHtml ? `<div class="pv-sctext">${o.textHtml}</div>` : ""}${this._docLines(4)}</div></div>`, "", pvOfficeApp(o.file || "x.docx"));
  },
  /** Informatietypen in de tekst. o: { file, text, sits: [{ name, found }] } */
  sceneSits(o = {}) {
    const chips = (o.sits || []).map((s) => `<span class="pv-sit ${s.found ? "found" : "miss"}">${icon(s.found ? "check" : "minus", "s")} ${esc(s.name)}</span>`).join("");
    return this.sceneDoc({ file: o.file, barsHtml: o.barsHtml, textHtml: `<div>${esc(o.text || "")}</div><div class="pv-sits">${chips}</div>` });
  },
  /** Delen-venster (SharePoint/OneDrive). o: { file, to, anyone, pillHtml, barsHtml, onedrive } */
  sceneShare(o = {}) {
    return this._sc("spo", o.onedrive ? "Delen · OneDrive" : "Delen", `<div class="pv-pad pv-scshare"><div class="pv-scfile">${icon("doc", "s")} <b>${esc(o.file || "")}</b>${o.pillHtml ? ` ${o.pillHtml}` : ""}</div>
      <div class="pv-field">${icon(o.anyone ? "link" : "user", "s")} ${esc(o.anyone ? "Iedereen met de link kan weergeven" : o.to || "")}</div>${o.barsHtml || ""}
      <div class="pv-dbtns"><span class="pv-btn primary">${o.anyone ? "Koppeling kopiëren" : "Verzenden"}</span><span class="pv-btn">Annuleren</span></div></div>`, "", o.onedrive ? "onedrive" : "spo");
  },
  /** Teams-chat. o: { title, me, text, state: draft|sent|blocked|tip|override, tip, otherHtml } */
  sceneChat(o = {}) {
    const st = o.state || "sent";
    const note = st === "blocked" ? `<div class="pv-msgblock">${icon("xcircle", "s")} Dit bericht is geblokkeerd. <u>Wat kan ik doen?</u></div>`
      : st === "override" ? `<div class="pv-msgblock warn">${icon("warning", "s")} Dit bericht is geblokkeerd. <u>Wat kan ik doen?</u></div>`
        : st === "tip" && o.tip ? `<div class="pv-msgtip">${icon("info", "s")} ${esc(o.tip)}</div>` : "";
    const draft = st === "draft" ? `<div class="pv-field pv-sccompose">${esc(o.text || "")}<span class="pv-btn primary">${icon("play", "s")}</span></div>` : "";
    return this._sc("teams", o.title || "Chat", `<div class="pv-chat">${st === "draft" ? "" : `<div class="pv-msg me${st === "blocked" ? " blocked" : ""}"><div class="xs muted">${esc(o.me || "Jij")} · 10:42</div>${esc(o.text || "")}${note}</div>`}${o.otherHtml || ""}</div>${draft}`);
  },
  /** Bericht aan de kant van de ontvanger (Teams). */
  sceneChatOther(who, html) { return `<div class="pv-msg other"><div class="xs muted">${esc(who)}</div>${html}</div>`; },
  /** Windows-melding van Endpoint DLP. o: { level: block|warn|audit|ok|none, act, file, tip, options, title } */
  sceneToast(o = {}) {
    const lv = o.level || "none";
    if (lv === "none" || lv === "audit") return `<div class="pv-desk">${this._illu()}<div class="xs">${esc(o.note || (lv === "audit" ? "Geen melding: de actie gaat door en wordt alleen vastgelegd." : "Geen melding: de actie gaat gewoon door."))}</div></div>`;
    if (lv === "ok" || lv === "action") return `<div class="pv-desk">${this._illu()}<div class="pv-toast"><div class="pv-toasthead">${icon(lv === "ok" ? "check" : "laptop", "s")} ${esc(o.title || "Windows")}</div><div>${esc(o.text || "")}</div></div></div>`;
    const opts = (o.options && o.options.length ? o.options : ["Dit hoort bij een bestaand werkproces", "Mijn manager heeft dit goedgekeurd", "Anders"]).slice(0, 4);
    return `<div class="pv-desk">${this._illu()}<div class="pv-toast"><div class="pv-toasthead">${this.tile("windows")} Windows-melding</div><b>${lv === "block" ? "Deze actie is geblokkeerd" : "Deze actie is beperkt"}</b>
      <div>${esc(o.act || "")}: ‘${esc(o.file || "")}’ bevat gevoelige informatie.${o.tip ? " " + esc(o.tip) : ""}</div>
      ${lv === "warn" ? `<div class="pv-radios">${opts.map((x, i) => `<span>${i ? "○" : "●"} ${esc(x)}</span>`).join("")}</div><div class="pv-dbtns"><span class="pv-btn primary">Toestaan</span><span class="pv-btn">Annuleren</span></div>` : `<div class="pv-dbtns"><span class="pv-btn">Sluiten</span></div>`}</div></div>`;
  },
  /** Copilot-chat. o: { prompt, kind: wait|ok|excluded|noextract|dke|promptBlocked|web, file, pillHtml } */
  sceneCopilot(o = {}) {
    const cite = `<div class="pv-cite"><span class="pv-citen">1</span> ${icon("doc", "s")} ${esc(o.file || "Document.docx")}</div>`;
    const ans = {
      wait: `<div class="pv-cpans pv-typing"><span></span><span></span><span></span></div>`,
      ok: `<div class="pv-cpans">${o.pillHtml ? `<div class="pv-cplabel">${icon("shield", "s")} Gevoeligheid: ${o.pillHtml}</div>` : ""}<p>Hier is een samenvatting: ${esc(o.answer || "de belangrijkste punten uit het document")} <sup>1</sup>.</p>${cite}</div>`,
      excluded: `<div class="pv-cpans"><p>Ik kan geen samenvatting maken van de gevonden informatie.</p>${cite}</div>`,
      noextract: `<div class="pv-cpans"><p>Ik kan dit bestand niet samenvatten, maar je kunt het hier openen:</p>${cite}</div>`,
      dke: `<div class="pv-cpans"><p>Ik heb hier geen informatie over gevonden.</p></div>`,
      promptBlocked: `<div class="pv-cpans pv-cpblock"><p>${icon("shield", "s")} Dit verzoek kan niet worden voltooid: het bevat gevoelige informatie die je organisatie heeft uitgesloten van gebruik met Microsoft 365 Copilot.</p></div>`,
      web: `<div class="pv-cpans"><p>Op basis van interne bronnen: ${esc(o.answer || "dit is wat ik heb gevonden")}.</p><div class="xs muted">${icon("globe", "s")} Zoeken op het web is overgeslagen voor deze prompt.</div></div>`,
    }[o.kind || "wait"] || "";
    return this._sc("copilot", "Microsoft 365 Copilot", `<div class="pv-chat"><div class="pv-msg me">${esc(o.prompt || "")}</div>${ans}</div>`);
  },
  /** Team/site/vergadering met feiten uit het label. o: { app: spo|teams, name, pillHtml, facts: [[icon, text, value]], barsHtml } */
  sceneSite(o = {}) {
    return `<div class="pv-win pv-site pv-scene">${this._chrome(o.app === "teams" ? "teams" : "spo", esc(o.name || "Team"))}<div class="pv-sitehead"><span class="pv-sitelogo">${esc(String(o.name || "T").charAt(0).toUpperCase())}</span><div><b>${esc(o.name || "Team")}</b><div class="xs">${o.pillHtml || ""}</div></div></div>${o.barsHtml || ""}
      <div class="pv-sitefacts xs">${(o.facts || []).map(([ic, t, v]) => `<div>${icon(ic, "s")} ${esc(t)}${v ? `: <b>${esc(v)}</b>` : ""}</div>`).join("")}</div></div>`;
  },
  /** Purview-portal: DLP-waarschuwingen en Activity explorer. o: { rows: [{ when, act, rule, user, where, sev }], alert } */
  sceneAudit(o = {}) {
    const rows = (o.rows || []).map((r) => `<tr><td>${esc(r.when || "Zojuist")}</td><td>${esc(r.act)}</td><td>${esc(r.rule)}</td><td>${esc(r.user)}</td><td>${esc(r.where)}</td><td>${r.sev ? `<span class="pv-sev ${esc(String(r.sev).toLowerCase())}">${esc(r.sev)}</span>` : "—"}</td></tr>`).join("");
    return `<div class="pv-win pv-scene"><div class="pv-chrome pv-purview">${this.tile("purview")}<span class="pv-ctitle">Microsoft Purview · ${esc(o.title || "Activity explorer")}</span>${this._illu()}</div>
      ${o.alert ? this.sceneBar(o.alertKind || "tip", o.alert, o.alertText || "") : ""}
      <table class="pv-lib pv-audit"><thead><tr><th>Tijd</th><th>Activiteit</th><th>Regel</th><th>Gebruiker</th><th>Locatie</th><th>Ernst</th></tr></thead><tbody>${rows || `<tr><td colspan="6" class="muted">Geen DLP-gebeurtenissen</td></tr>`}</tbody></table></div>`;
  },
  /** Neutraal ‘hier is niets te zien’-vlak. */
  sceneNone(text) { return `<div class="pv-scnone">${icon("info", "s")} ${esc(text || "In deze stap merkt de medewerker niets.")}</div>`; },
  /* ---------- Losse meldingen (zie API bovenaan) ---------- */
  noticeKinds: {
    tip: ["outlook", "office", "spo", "teams"],
    override: ["outlook", "spo", "teams", "endpoint"],
    block: ["outlook", "spo", "teams", "endpoint"],
    encrypt: ["outlook", "office"],
    endpoint: ["endpoint"],
    copilot: ["copilot"],
    mandatory: ["office", "outlook"],
    justify: ["office", "outlook"],
    default: ["office", "outlook"],
    recommend: ["office", "outlook"],
  },
  notice(kind, app, ctx) {
    const apps = Object.prototype.hasOwnProperty.call(this.noticeKinds, kind) ? this.noticeKinds[kind] : null;
    if (!apps) return "";
    const a = apps.includes(app) ? app : apps[0], c = ctx && typeof ctx === "object" ? ctx : {};
    let h = "";
    try { h = this._N[kind].call(this, a, c); } catch (e) { console.error(e); return ""; }
    const rule = c.ruleName ? `<div class="pv-nrule xs muted tech-only">${icon("shield", "s")} ${esc(c.ruleName)}</div>` : "";
    return `<div class="pv-notice" data-kind="${esc(kind)}" data-app="${esc(a)}">${h}${rule}</div>`;
  },
  _nPill(c) { return c.labelName ? `<span class="pv-pill"><span class="color-dot" style="background:${this._hex(c.labelColor)}"></span>${esc(c.labelName)}</span>` : c.noLabel ? this.noPill() : ""; },
  /** Situatie zonder melding (instelling staat uit): document of e-mail met een korte uitleg. */
  quiet(app, ctx, text) {
    const a = app === "outlook" ? "outlook" : "office", c = ctx && typeof ctx === "object" ? ctx : {};
    const note = `<div class="pv-mailbody xs muted">${icon("info", "s")} ${esc(text || "Geen melding.")}</div>`;
    return `<div class="pv-notice" data-kind="quiet" data-app="${a}">${a === "outlook" ? this._nMail(c, "", { body: note }) : this._nDoc(c, "", note)}</div>`;
  },
  _nTxt(c, def) { return esc(c.tipText != null && String(c.tipText).trim() ? c.tipText : def); },
  _nFile(c, def = "Kwartaalrapportage Q3.docx") { return esc(c.file || def); },
  _nWin(app, title, inner, extra = "", tk) { return `<div class="pv-win">${this._chrome(app, esc(title), extra, tk)}${inner}</div>`; },
  _nLinks(xs) { return xs.length ? `<div class="pv-links">${xs.map((x) => `<span>${esc(x)}</span>`).join("")}</div>` : ""; },
  _nOv(c) {
    const req = c.justification === "required" || c.override === "WithJustification";
    const opt = !req && (c.justification === "optional" || c.override === "WithoutJustification");
    return { req, opt, fp: c.override === "FalsePositive" || !!c.falsePositive };
  },
  _nJust(o) { return o.req ? `<div class="pv-field pv-just">Zakelijke reden (verplicht)</div>` : o.opt ? `<div class="pv-field pv-just">Zakelijke reden (optioneel)</div>` : ""; },
  _nMail(c, bars, o = {}) {
    const pill = this._nPill(c);
    return this._nWin("outlook", o.inbox ? "Postvak IN" : "Nieuw bericht", `<div class="pv-mailhead">${o.inbox ? `<div><span class="muted">Van</span> ${esc(c.from || "Finance – Contoso")}</div>` : `<div><span class="muted">Aan</span> ${esc(c.to || "partner@extern.nl")}</div>`}<div class="pv-subj"><span class="muted">Onderwerp</span> ${esc(c.subject || "Kwartaalrapportage Q3")}${pill ? `<span class="pv-sensbar">${icon("shield", "s")} ${pill}</span>` : ""}</div></div>${bars}${o.body || `<div class="pv-mailbody">${this._docLines(2)}</div>`}`);
  },
  _nDoc(c, bars, inner) { const pill = this._nPill(c); return this._nWin("office", this._nFile(c), `${bars}${inner || `<div class="pv-mailbody">${this._docLines(3)}</div>`}`, pill ? `<span class="pv-sensbar">${pill}</span>` : "", pvOfficeApp(c.file || "x.docx")); },
  /** SharePoint (standaard) of OneDrive (ctx.location === "onedrive" of ctx.onedrive). */
  _nOd(c) { return !!c && (c.onedrive === true || String(c.location || "").toLowerCase() === "onedrive"); },
  _nSpo(c, lvl, html) {
    const ico = lvl === "block" ? `<span class="pv-blockico" title="Geblokkeerd door DLP">${icon("xcircle", "s")}</span>` : `<span class="pv-blockico warn" title="Policy tip (DLP)">${icon("warning", "s")}</span>`;
    const od = this._nOd(c);
    return this._nWin("spo", od ? "OneDrive · Mijn bestanden" : "SharePoint · Documenten", `<table class="pv-lib"><thead><tr><th>Naam</th><th>Gevoeligheid</th></tr></thead><tbody><tr class="on"><td>${icon("doc", "s")} ${ico}${this._nFile(c)}</td><td>${this._nPill(c) || `<span class="xs muted">—</span>`}</td></tr></tbody></table>
      <div class="pv-share pv-npane"><div class="pv-dtitle">${icon("info", "s")} Details › Beleidstip weergeven</div>${html}</div>`, "", od ? "onedrive" : "spo");
  },
  _nChat(c, note, other = "") { return this._nWin("teams", c.chat || "Chat met Partner (extern)", `<div class="pv-chat"><div class="pv-msg me"><div class="xs muted">Jij · 10:42</div>${esc(c.message || "Hierbij het IBAN voor de betaling.")}${note}</div>${other}</div>`); },
  _nToast(c, warn) {
    const opts = (Array.isArray(c.options) && c.options.length ? c.options : ["Dit hoort bij een bestaand werkproces", "Mijn manager heeft dit goedgekeurd", "Dringend nodig; ik informeer mijn manager", "De informatie is niet gevoelig", "Anders"]).slice(0, 5);
    return `<div class="pv-desk">${this._illu()}<div class="pv-toast"><div class="pv-toasthead">${this.tile("windows")} Windows-melding</div><b>${warn ? "Deze actie is beperkt" : "Deze actie is geblokkeerd"}</b>
      <div>${esc(c.activity || "Kopiëren naar USB")}: ‘${this._nFile(c)}’ bevat gevoelige informatie.${c.tipText ? " " + esc(c.tipText) : ""}</div>
      ${warn ? `<div class="pv-radios">${opts.map((x, i) => `<span>${i ? "○" : "●"} ${esc(x)}</span>`).join("")}</div><div class="pv-dbtns"><span class="pv-btn primary">Toestaan</span><span class="pv-btn">Annuleren</span></div>` : `<div class="pv-dbtns"><span class="pv-btn">Sluiten</span></div>`}</div></div>`;
  },
  _nOvl(app, c, dlg) { return app === "outlook" ? this._nMail(c, "", { body: `<div class="pv-ovl">${dlg}</div>` }) : this._nDoc(c, "", `<div class="pv-ovl">${dlg}</div>`); },
  _N: {
    tip(a, c) {
      if (a === "outlook") return this._nMail(c, this._bar("warn", "info", `<b>Beleidstip</b><div>${this._nTxt(c, "Je e-mailbericht is in strijd met een beleid in je organisatie.")}</div>`));
      if (a === "office") return this._nDoc(c, this._bar("warn", "info", `<b>Beleidstip</b><div>${this._nTxt(c, "Dit item is in strijd met een beleid in je organisatie.")}</div>${this._nLinks(["Details weergeven"])}`));
      if (a === "spo") return this._nSpo(c, "tip", this._bar("warn", "warning", `<b>Beleidstip</b><div>${this._nTxt(c, "Dit item is in strijd met een beleid in je organisatie.")}</div>`));
      return this._nChat(c, `<div class="pv-msgtip">${icon("info", "s")} ${this._nTxt(c, "Dit bericht bevat mogelijk gevoelige informatie.")}</div>`);
    },
    override(a, c) {
      const o = this._nOv(c);
      if (a === "endpoint") return this._nToast(c, true);
      if (a === "outlook") return this._nMail(c, this._bar("warn", "warning", `<b>Beleidstip</b><div>${this._nTxt(c, "Je e-mailbericht is in strijd met een beleid in je organisatie.")}</div>${this._nLinks(["Overschrijven", ...(o.fp ? ["Fout-positief melden"] : [])])}`),
        { body: `<div class="pv-ovl">${this._dialog("Beleid overschrijven", `Je verzendt gevoelige informatie buiten de organisatie.${this._nJust(o)}`, ["Overschrijven", "Annuleren"])}</div>` });
      if (a === "spo") return this._nSpo(c, "tip", this._bar("warn", "warning", `<b>Beleidstip</b><div>${this._nTxt(c, "Dit item is in strijd met een beleid in je organisatie. Als je dit conflict niet oplost, kan de toegang tot dit bestand worden geblokkeerd.")}</div>${this._nJust(o)}${this._nLinks(["Oplossen › Overschrijven", ...(o.fp ? ["Fout-positief melden"] : [])])}`));
      return this._nChat(c, `<div class="pv-msgblock warn">${icon("warning", "s")} Dit bericht is geblokkeerd. <u>Wat kan ik doen?</u></div>`)
        + this._dialog("Wat kan ik doen?", `${this._nTxt(c, "Dit bericht bevat gevoelige informatie.")}${this._nJust(o)}`, ["Overschrijven en verzenden", o.fp ? "Fout-positief melden" : "Annuleren"]);
    },
    block(a, c) {
      if (a === "endpoint") return this._nToast(c, false);
      if (a === "outlook") return this._nMail(c, this._bar("err", "xcircle", `<b>Beleidstip</b><div>${this._nTxt(c, "Je e-mailbericht is in strijd met een beleid in je organisatie. Het bericht wordt niet bij alle ontvangers bezorgd.")}</div>`),
        { body: `<div class="pv-ndr">${this.tile("outlook")}<div><b>Microsoft Outlook</b><div>Niet bezorgd: ${esc(c.subject || "Kwartaalrapportage Q3")}</div><div class="xs muted">Je bericht is niet bij alle ontvangers aangekomen vanwege een beleid in je organisatie.</div></div></div>` });
      if (a === "spo") return this._nSpo(c, "block", this._bar("err", "xcircle", `<b>Beleidstip</b><div>${this._nTxt(c, "Dit item is in strijd met een beleid in je organisatie. Toegang tot dit item is geblokkeerd voor iedereen behalve de eigenaar, de laatste wijziger en de primaire sitebeheerder.")}</div>`));
      return this._nChat(c, `<div class="pv-msgblock">${icon("xcircle", "s")} Dit bericht is geblokkeerd. <u>Wat kan ik doen?</u></div>`, `<div class="pv-msg other"><div class="xs muted">Bij de ontvanger</div><i>${icon("xcircle", "s")} Dit bericht is geblokkeerd vanwege gevoelige inhoud.</i></div>`);
    },
    encrypt(a, c) {
      if (a === "office") return this._nDoc(c, this._bar("lock", "lock", `<b>Beperkte toegang</b><div>${this._nTxt(c, "Alleen specifieke personen hebben toegang tot deze inhoud.")}</div>${this._nLinks(["Machtigingen weergeven"])}`));
      return this._nMail(c, this._bar("lock", "lock", `<b>Versleuteld</b><div>${this._nTxt(c, "Dit bericht is versleuteld; alleen de ontvangers kunnen het openen.")}</div>${this._nLinks(["Machtigingen weergeven"])}`), { inbox: true, body: `<div class="pv-mailbody">${this._docLines(2)}<div class="xs muted">Externe ontvangers zonder Outlook openen het bericht via een link en een eenmalige code.</div></div>` });
    },
    endpoint(a, c) { return this._nToast(c, !!c.override || c.level === "warn"); },
    copilot(a, c) {
      const v = c.variant || "excluded", f = this._nFile(c);
      const cite = `<div class="pv-cite"><span class="pv-citen">1</span> ${icon("doc", "s")} ${f}</div>`;
      const ans = {
        excluded: `<div class="pv-cpans"><p>Ik kan de inhoud van dit bestand niet gebruiken in mijn antwoord. Je kunt het hier openen:</p>${cite}</div>`,
        noextract: `<div class="pv-cpans"><p>Ik kan dit bestand niet samenvatten, maar je kunt het hier openen:</p>${cite}</div>`,
        prompt: `<div class="pv-cpans pv-cpblock"><p>${icon("shield", "s")} ${this._nTxt(c, "Dit verzoek kan niet worden voltooid: het bevat gevoelige informatie die je organisatie heeft uitgesloten van gebruik met Microsoft 365 Copilot.")}</p></div>`,
        web: `<div class="pv-cpans"><p>Op basis van interne bronnen: de belangrijkste punten uit ${f}.</p><div class="xs muted">${icon("globe", "s")} Zoeken op het web is overgeslagen voor deze prompt.</div></div>`,
      }[v] || "";
      const prompt = v === "prompt" || v === "web" ? "Controleer IBAN NL91 ABNA 0417 1643 00 voor de betaling." : `Vat ${f} samen.`;
      return this._nWin("copilot", "Microsoft 365 Copilot", `<div class="pv-chat"><div class="pv-msg me">${esc(c.prompt || prompt)}</div>${ans}</div>`, v === "prompt" && typeof previewBadge === "function" ? `<span class="pv-nbadge">${previewBadge()}</span>` : "");
    },
    mandatory(a, c) {
      return this._nOvl(a, c, a === "outlook" ? this._dialog("Label vereist", "Kies een gevoeligheidslabel voordat je dit bericht verzendt.", ["Label kiezen", "Annuleren"])
        : this._dialog("Label vereist", "Je organisatie vereist een gevoeligheidslabel voor dit document.", ["Label kiezen", "Alleen-lezen openen"]));
    },
    justify(a, c) {
      return this._nOvl(a, c, this._dialog("Motivatie vereist", `Je organisatie vraagt om een reden voor het verlagen of verwijderen van dit label.<div class="pv-radios"><span>○ Vorig label is niet meer van toepassing</span><span>○ Vorig label was onjuist</span><span>○ Anders (toelichten)</span></div>`, ["Wijzigen", "Annuleren"]));
    },
    default(a, c) {
      const cc = Object.assign({}, c, { labelName: c.labelName || "Intern" });
      const note = `<div class="pv-mailbody xs muted">${icon("info", "s")} Geen melding: het standaardlabel staat direct ${a === "outlook" ? "in de onderwerpregel" : "in de titelbalk"}. De medewerker kan het wijzigen.</div>`;
      return a === "outlook" ? this._nMail(cc, "", { body: note }) : this._nDoc(cc, "", note);
    },
    recommend(a, c) {
      const ln = c.labelName || "Vertrouwelijk";
      const bar = this._bar("warn", "bulb", `<b>Aanbevolen label</b><div>${this._nTxt(c, `Je organisatie raadt aan het label ‘${ln}’ toe te passen.`)}</div>${this._nLinks(["Gevoeligheid wijzigen"])}`);
      const cc = Object.assign({}, c, { labelName: "" });
      return a === "outlook" ? this._nMail(cc, bar) : this._nDoc(cc, bar);
    },
  },
  /** Modal met het voorbeeld van één label (Ontwerpbord, Scenario's). */
  open(labelId, app) {
    const st = S(), l = labelById(labelId, st);
    if (!l) return;
    Modal.open({ title: `${icon("eye")} Zo ziet de gebruiker het · ${esc(labelFullName(l, st))}`, wide: true, body: this.panel(l, st, app, { compact: true }),
      buttons: [{ label: "Sluiten", primary: true }, { label: `${icon("tag", "s")} Label-instellingen`, fn: () => { UI.labelTab = "preview"; App.go("labels", l.id); } }] });
  },
};

Actions["pv-app"] = (el) => {
  const w = el.closest(".pv-wrap");
  const st = S(), l = labelById(el.dataset.label, st);
  if (!w || !l) return;
  UI.pvApp = el.dataset.app;
  const tmp = document.createElement("div");
  tmp.innerHTML = Previews.panel(l, st, el.dataset.app, { compact: !!w.dataset.compact });
  const nw = tmp.firstElementChild;
  w.replaceWith(nw);
  a11yEnhance(nw);
  const b = nw.querySelector(`.pv-tabbtn[data-app="${CSS.escape(el.dataset.app)}"]`);
  if (b) b.focus();
};
Actions["pv-open"] = (el) => Previews.open(el.dataset.label || el.dataset.id, el.dataset.app);
