/* "Zo ziet de gebruiker het": mockups per label en per app, volledig afgeleid van de labelconfiguratie,
   het labelbeleid en de DLP-regels uit de generator. Gebruikt in Label-instellingen (tab), Ontwerpbord (modal) en Scenario's. */

const PV_APPS = [
  { key: "office", name: "Word, Excel, PowerPoint", short: "Office", tile: "W", cls: "word" },
  { key: "outlook", name: "Outlook", short: "Outlook", tile: "O", cls: "outlook" },
  { key: "spo", name: "SharePoint & OneDrive", short: "SharePoint", tile: "S", cls: "spo" },
  { key: "teams", name: "Teams", short: "Teams", tile: "T", cls: "teams" },
  { key: "copilot", name: "Microsoft 365 Copilot", short: "Copilot", tile: "", cls: "copilot" },
  { key: "endpoint", name: "Windows-apparaat", short: "Apparaat", tile: "", cls: "endpoint" },
];

const Previews = {
  /** Neutrale app-tegel (geen officieel logo); Copilot gebruikt het merkbeeld als productaanduiding. */
  tile(k, big) {
    const a = PV_APPS.find((x) => x.key === k) || PV_APPS[0];
    if (k === "copilot" && typeof brandImg === "function" && typeof BRAND_ASSETS !== "undefined" && BRAND_ASSETS.msCopilot) return brandImg("msCopilot", "", `pv-tile img${big ? " big" : ""}`, ' aria-hidden="true"');
    if (k === "endpoint") return `<span class="pv-tile endpoint${big ? " big" : ""}" aria-hidden="true">${icon("laptop", "s")}</span>`;
    return `<span class="pv-tile ${a.cls}${big ? " big" : ""}" aria-hidden="true">${a.tile}</span>`;
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
  _chrome(k, title, extra = "") { return `<div class="pv-chrome pv-${k}">${this.tile(k)}<span class="pv-ctitle">${title}</span>${extra}</div>`; },
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
    return `DLP voor ${where} ${what}.${mtxt} <details class="pv-tech"><summary>Technische regel</summary>${esc(r.desc)}</details>`;
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
    const win = `<div class="pv-win">${this._chrome("office", `${esc(c.item)}`, `<span class="pv-sensbar" title="Sensitivity bar">${this.pill(l, st)}</span>`)}
      <div class="pv-ribbon"><span>Bestand</span><span class="on">Start</span><span>Invoegen</span><span>Controleren</span><span class="pv-sensbtn">${icon("shield", "s")} Gevoeligheid</span></div>
      ${bars.join("")}
      <div class="pv-docwrap"><div class="doc-page pv-page">${mk(m.header, "header")}${wm}<div class="doc-line h"></div>${this._docLines(7)}${mk(m.footer, "footer")}</div></div></div>`;
    const side = [];
    if (set.justification && f.lowerExists) side.push(this._dialog("Motivatie vereist", `Je verlaagt de classificatie van dit document. Waarom?<div class="pv-radios"><span>○ Vorig label is niet meer van toepassing</span><span>○ Vorig label was onjuist</span><span>○ Anders (toelichten)</span></div>`, ["Wijzigen", "Annuleren"]));
    if (set.mandatoryDocs) side.push(this._dialog("Label vereist", "Je organisatie vereist een gevoeligheidslabel voordat je dit bestand opslaat.", ["Label kiezen", "Annuleren"]));
    if (f.enc.mode === "userDefined" && f.enc.userDefined.office) side.push(this._dialog("Machtigingen", "Kies wie dit document mag openen en wat ze mogen doen.<div class=\"pv-field\">Gebruikers: collega@…</div><div class=\"pv-radios\"><span>● Lezen</span><span>○ Wijzigen</span></div>", ["OK", "Annuleren"]));
    const notes = [
      `Het label staat in de titelbalk en onder de knop <b>Gevoeligheid</b>. De kleur helpt het herkennen.`,
      m.header.enabled || m.footer.enabled || m.watermark.enabled ? `Markering (${[m.header.enabled && "koptekst", m.footer.enabled && "voettekst", m.watermark.enabled && "watermerk"].filter(Boolean).join(", ")}) wordt door Office toegevoegd zodra het label wordt gekozen. Een watermerk verschijnt alleen in documenten, niet in e-mail.` : "Dit label voegt geen zichtbare markering toe.",
      lock ? (f.extract ? "Versleuteling reist mee met het bestand, ook als het wordt gedownload of gemaild." : "Versleuteling reist mee met het bestand. Zonder het recht ‘kopiëren’ (EXTRACT) kan Copilot de inhoud niet gebruiken.") : "",
      set.defaultDocs === l.id ? "Dit is het <b>standaardlabel</b>: nieuwe documenten krijgen het automatisch." : "",
      set.mandatoryDocs ? "Verplicht labelen: een ongelabeld bestand kun je nog wel lezen. Na labelen kun je het label alleen wijzigen, niet verwijderen." : "",
      side.length ? "De dialogen zijn indicatief; de exacte teksten verschillen per app en versie." : "",
    ];
    return { main: win, side: side.join(""), notes, learn: "labelsOffice" };
  },

  /* ---------- Outlook ---------- */
  outlook(f) {
    const { l, st, mark: m, c, ex, set } = f, LD = LabelDetail;
    const mhd = (x) => (x.enabled && x.text ? `<div class="pv-mailmark" style="${LD._markStyle(x)}">${esc(LD.resolve(x.text, "O", c))}</div>` : "");
    const ext = !ex || ex.scope !== "internal";
    const lock = f.sc.emails ? this._lockText(f) : "";
    const win = `<div class="pv-win">${this._chrome("outlook", "Nieuw bericht")}
      <div class="pv-mailhead"><div><span class="muted">Aan</span> ${ext ? "partner@extern.nl" : "collega@" + esc(c.upn.split("@")[1] || "contoso.nl")}</div>      <div class="pv-subj"><span class="muted">Onderwerp</span> Kwartaalrapportage Q3${f.sc.emails ? `<span class="pv-sensbar" title="${l.tooltip ? esc(String(l.tooltip).slice(0, 120)) : "Gevoeligheid"}">${icon("shield", "s")} ${this.pill(l, st)}</span>` : ""}</div></div>
            ${lock ? this._bar("lock", "lock", lock) : ""}
            ${this._tipBar(ex, "Het bericht kan niet worden verzonden zolang de ontvangers of de inhoud niet zijn aangepast.", "Je e-mail is in strijd met een beleid in je organisatie.")}
      <div class="pv-mailbody">${f.sc.emails ? mhd(m.header) : ""}<div>Beste partner,</div>${this._docLines(4)}${f.sc.emails ? mhd(m.footer) : ""}</div>
      <div class="pv-mailfoot"><span class="pv-btn primary">Verzenden</span><span class="pv-attach">${icon("doc", "s")} Kwartaalrapportage Q3.docx</span></div></div>`;
    const side = [];
    if (ex && ex.actions.blockAccess && ex.notify.override) side.push(this._dialog("Reden voor overschrijven", "Je verzendt gevoelige informatie buiten de organisatie.<div class=\"pv-radios\"><span>○ Ik heb een zakelijke reden</span><span>○ Dit is een fout-positief</span></div>", ["Verzenden", "Annuleren"]));
    if (set.mandatoryEmail) side.push(this._dialog("Label vereist", "Kies een gevoeligheidslabel voordat je dit bericht verzendt.", ["Label kiezen", "Annuleren"]));
    const notes = [
      f.sc.emails ? "Het label staat naast het onderwerp; de ontvanger ziet het ook." : "Dit label is niet voor e-mail beschikbaar; de regel hieronder reageert op een gelabelde bijlage.",
      this._ruleNote(ex, "exchange", "e-mail"),
      f.sc.emails && (m.header.enabled || m.footer.enabled) ? "Kop- en voettekst komen in de e-mail; een watermerk niet." : "",
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
      ${this._bar(blocked && !sh.notify.override ? "err" : "warn", blocked && !sh.notify.override ? "xcircle" : "warning", `<b>Beleidstip</b><div>${esc(sh.notify.tip || defTip)}</div>${blocked ? `<div class="xs">Geblokkeerd voor: ${esc(scopeTxt)}</div>` : ""}<div class="pv-links">${sh.notify.override ? "<span>Overschrijven</span>" : ""}${sh.notify.override === "FalsePositive" ? "<span>Fout-positief melden</span>" : ""}<span>Meer informatie</span></div>`)}</div>` : "";
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
    return { main: lib + pane, side: site, notes, learn: sh ? "dlpTips" : f.sc.sites ? "labelsContainers" : "labelsSpo" };
  },

  /* ---------- Teams ---------- */
  teams(f) {
    const { l, st, tm, ct, mt } = f;
    const team = f.sc.sites ? `<div class="pv-teamhead">${this.tile("teams")}<div><b>Finance</b> <span class="xs muted">${ct.privacy === "private" ? "Privé" : ct.privacy === "public" ? "Openbaar" : ""}</span><div class="xs muted">Algemeen${ct.externalUserAccess ? "" : ` · ${icon("users", "s")} geen gasten`}</div></div><span class="pv-sensbar" title="Label rechtsboven in het kanaal">${this.pill(l, st)}</span></div>` : "";
    const blocked = tm && tm.actions.blockAccess;
    const chat = `<div class="pv-chat"><div class="pv-msg me${blocked ? " blocked" : ""}"><div class="xs muted">Jij · 10:42</div>Hierbij de cijfers van Q3 en het IBAN voor de betaling.${blocked ? `<div class="pv-msgblock">${icon("xcircle", "s")} Dit bericht is gemarkeerd. <u>Wat kan ik doen?</u></div>` : tm && tm.notify.tip ? `<div class="pv-msgtip">${icon("info", "s")} ${esc(tm.notify.tip)}</div>` : ""}</div>
      ${blocked ? `<div class="pv-msg other"><div class="xs muted">Bij de ontvanger</div><i>${icon("xcircle", "s")} Inhoud geblokkeerd</i></div>` : ""}</div>`;
    const why = blocked ? this._dialog("Wat kan ik doen?", `Dit bericht bevat gevoelige informatie en is geblokkeerd.${tm.notify.tip ? `<div>${esc(tm.notify.tip)}</div>` : ""}`, [tm.notify.override ? "Toch verzenden (met reden)" : "Sluiten", ...(tm.notify.override ? ["Annuleren"] : [])]) : "";
    const ms = [
      mt.lobbyBypass !== "default" ? `<div>Lobby: <b>${esc((CATALOG.meetingLobby.find((x) => x[0] === mt.lobbyBypass) || [0, mt.lobbyBypass])[1])}</b></div>` : "",
      mt.whoCanRecord !== "default" ? `<div>Opnemen: <b>${esc((CATALOG.meetingRecorders.find((x) => x[0] === mt.whoCanRecord) || [0, mt.whoCanRecord])[1])}</b></div>` : "",
      mt.preventCopyChat ? "<div>Chat kopiëren: <b>uit</b></div>" : "", mt.watermarkScreen ? "<div>Watermerk bij scherm delen: <b>aan</b></div>" : "", mt.e2ee ? "<div>End-to-end versleuteling: <b>aan</b></div>" : "",
    ].join("");
    const meet = f.sc.meetings ? `<div class="pv-meet"><div class="pv-dtitle">${icon("meeting", "s")} Teams-vergadering · ${this.pill(l, st)}</div><div class="xs pv-sitefacts">${ms || `<div class="muted">Geen vergaderinstellingen afgedwongen; de organisator kiest zelf.</div>`}</div></div>` : "";
    const panel = `<div class="pv-win">${this._chrome("teams", "Microsoft Teams")}${team}${blocked || tm ? `<div class="xs muted pv-pad">${tm && tm.scope === "external" ? "Chat met een externe gast" : "Chat"}</div>` : ""}${chat}</div>`;
    const notes = [
      f.sc.sites ? "Het label staat rechtsboven in elk kanaal van het team en bepaalt privacy en of gasten mogen worden toegevoegd." : "",
      this._ruleNote(tm, "teams", "Teams-chat") + (blocked ? " De afzender ziet       'Dit bericht is gemarkeerd. Wat kan ik doen?’; de ontvanger ziet de inhoud niet." : ""),
      tm ? "Teams-berichten hebben zelf geen label: DLP herkent gevoelige gegevens in de tekst. Voor bestanden in Teams toont Teams geen policy tip." : "",
      f.sc.meetings ? "Bij een vergadering met dit label gelden de vergaderinstellingen automatisch." : "",
    ];
    return { main: panel, side: why + meet, notes, learn: tm ? "dlpTeams" : f.sc.meetings ? "labelsMeetings" : "labelsContainers" };
  },

  /* ---------- Copilot ---------- */
  copilot(f) {
    const { l, st, cp } = f;
    const excluded = cp && cp.actions.copilotExclude;
    const dke = (f.enc.mode === "assignNow" || f.enc.mode === "userDefined") && !!f.enc.dke;
    const noExtract = !f.extract && !dke;
    const blocked = excluded || noExtract || dke;
    const cite = (n) => `<div class="pv-cite">${n ? `<span class="pv-citen">${n}</span> ` : ""}${icon("doc", "s")} Kwartaalrapportage Q3.docx</div>`;
    const answer = dke
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
          : noExtract ? "Versleuteling zonder recht ‘kopiëren’ (EXTRACT): Copilot vat de inhoud niet samen, maar kan wel naar het bestand linken."
            : "Copilot respecteert het label en de rechten: alleen wie het bestand mag openen, krijgt de inhoud in een antwoord.",
      !blocked ? "Het antwoord toont het label met de hoogste prioriteit van de gebruikte bronnen; een nieuw document met Copilot erft dat label." : "",
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
    const toast = pick && pick.level !== "audit" ? `<div class="pv-toast"><div class="pv-toasthead">${icon("shield", "s")} Microsoft Purview</div><b>${pick.level === "block" ? "Deze actie is geblokkeerd" : "Deze actie is beperkt"}</b>
        <div>${esc(nm(pick.key))}: ‘Kwartaalrapportage Q3.docx’ bevat gevoelige informatie${ep.notify.tip ? ". " + esc(ep.notify.tip) : "."}</div>
        ${pick.level === "warn" ? `<div class="pv-radios">${(((st.endpoint || {}).justificationOptions || []).length ? st.endpoint.justificationOptions : ["Dit hoort bij een bestaand werkproces", "Mijn manager heeft dit goedgekeurd", "Dringend nodig; ik informeer mijn manager", "De informatie is niet gevoelig", "Anders"]).slice(0, 5).map((o, i) => `<span>${i ? "○" : "●"} ${esc(o)}</span>`).join("")}</div><div class="pv-dbtns"><span class="pv-btn primary">Toestaan</span><span class="pv-btn">Annuleren</span></div>` : `<div class="pv-dbtns"><span class="pv-btn">Sluiten</span></div>`}</div>`
      : `<div class="xs muted">${pick ? "Alleen vastleggen: de gebruiker krijgt geen melding." : "Geen endpoint-regel voor dit label."}</div>`;
    const grp = ["block", "warn", "audit"].map((lv) => [lv, acts.filter((a) => a.level === lv)]).filter(([, xs]) => xs.length);
    const list = grp.length ? `<div class="pv-acts">${grp.map(([lv, xs]) => `<div><span class="pv-lv ${lv}">${esc(lvlName[lv])}</span><ul>${xs.map((a) => `<li>${esc(nm(a.key))}</li>`).join("")}</ul></div>`).join("")}</div>` : "";
    const main = `<div class="pv-desk">${toast}</div>`;
    const notes = [
      "Op een onboarded Windows- of Mac-apparaat ziet de gebruiker een melding zodra een geblokkeerde actie wordt geprobeerd. De tekst van de melding kun je zelf aanpassen.",
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
    const tabsHtml = `<div class="pv-tabs" role="tablist" aria-label="Kies een app">${rel.map((k) => { const a = PV_APPS.find((x) => x.key === k); return `<button type="button" role="tab" class="pv-tabbtn${k === cur ? " on" : ""}" aria-selected="${k === cur}" tabindex="${k === cur ? 0 : -1}" data-action="pv-app" data-app="${k}" data-label="${esc(l.id)}">${this.tile(k)}<span>${esc(a.short)}</span></button>`; }).join("")}</div>`;
    const notes = r.notes.filter(Boolean);
    return `<div class="pv-wrap${o.compact ? " compact" : ""}" data-label="${esc(l.id)}" data-app="${cur}"${o.compact ? ' data-compact="1"' : ""}>
      ${tabsHtml}
      <div class="pv-stage"><div class="pv-main">${r.main}</div>${r.side ? `<div class="pv-side">${r.side}</div>` : ""}</div>
      ${notes.length ? `<ul class="pv-notes">${notes.map((n) => `<li>${n}</li>`).join("")}</ul>` : ""}
      <div class="xs muted pv-foot">${icon("info", "s")} Indicatief voorbeeld op basis van jullie keuzes; de echte schermen verschillen per app-versie en taal. ${learn(r.learn)}</div>
    </div>`;
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
