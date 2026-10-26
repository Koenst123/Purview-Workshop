/* Catalogus: Referentiearchitectuur (Classificatie & Labeling). Eigen Nederlandse uitleg, licenties en status volgens Microsoft Learn (zie CATALOG.docsVerified). */

Object.assign(CATALOG.learn, {
  onDemand: { title: "On-demand classification", url: LEARN_BASE + "purview/on-demand-classification" },
  explorers: { title: "Get started with Activity explorer", url: LEARN_BASE + "purview/data-classification-activity-explorer" },
  auditSolutions: { title: "Auditing solutions in Microsoft Purview", url: LEARN_BASE + "purview/audit-solutions-overview" },
  dspm: { title: "Learn about Data Security Posture Management", url: LEARN_BASE + "purview/data-security-posture-management-learn-about" },
  adaptiveProtection: { title: "Learn about Adaptive Protection", url: LEARN_BASE + "purview/insider-risk-management-adaptive-protection" },
  retention: { title: "Learn about data lifecycle management", url: LEARN_BASE + "purview/data-lifecycle-management" },
  copilotConsiderations: { title: "Considerations for Microsoft 365 Copilot and Purview", url: LEARN_BASE + "purview/ai-m365-copilot-considerations" },
});

/** Kleine helpers voor de "Jullie ontwerp"-status van blokken (alleen lezen). */
const ArchUtil = {
  rules(st, dom) {
    let n = 0;
    applicableLabels(st).forEach((l) => { try { if (Generator.ruleFor(l, dom, st)) n++; } catch (e) { /* negeren */ } });
    return n;
  },
  mode(st, dom) { return ({ simulation: "simulatie", simulationTips: "simulatie + tips", enable: "aan", disable: "uit" })[Generator.modeFor(dom, st)] || "simulatie"; },
  sits(st, kind) { return (st.sits || []).filter((s) => s.kind === kind).length; },
  labels(st, fn) { return applicableLabels(st).filter(fn).length; },
  check(st, id) { return ((st.tenant.checks || {})[id] || {}).status || "todo"; },
  n(x, one, many) { return `${x} ${x === 1 ? one : many}`; },
  ruleState(st, dom, what) {
    const n = this.rules(st, dom);
    return n ? { state: "on", text: `${this.n(n, "regel", "regels")} · ${this.mode(st, dom)}` } : { state: "off", text: `Geen DLP voor ${what}` };
  },
};

CATALOG.arch = {
  cols: [
    { id: "src", name: "Bronnen", sub: "Waar data ontstaat en wordt gedeeld", icon: "cloud" },
    { id: "cls", name: "Classificatie", sub: "Herkennen wát gevoelig is", icon: "search" },
    { id: "lab", name: "Labeling", sub: "Een zichtbaar label toekennen", icon: "tag" },
    { id: "pro", name: "Bescherming", sub: "Toegang en delen beperken", icon: "shield" },
    { id: "ins", name: "Inzicht", sub: "Meten, melden en bijsturen", icon: "chart" },
  ],
  layers: [
    ["label", "Labels"],
    ["classify", "Classificatie"],
    ["protect", "Versleuteling & toegang"],
    ["dlp", "DLP"],
    ["ai", "Copilot & AI"],
    ["monitor", "Monitoring"],
  ],
  tiers: [
    ["all", "Alle licenties"],
    ["e3", "Doorgaans in E3"],
    ["e5", "E5 of add-on"],
    ["addon", "Copilot / pay-as-you-go"],
  ],
  paths: [
    {
      id: "verschil", name: "Classificatie of label?", icon: "question",
      steps: [
        ["cls-sit", "Classificatie herkent wát er in de inhoud staat, bijvoorbeeld een BSN. Er verandert nog niets."],
        ["lab-taxonomy", "Een label is een zichtbare afspraak over hoe gevoelig iets is. Een mens of een regel kiest het."],
        ["lab-client", "Classificatie kan een label voorstellen of automatisch toepassen."],
        ["pro-encrypt", "Pas het label beschermt: versleuteling en markering reizen mee met het bestand."],
        ["pro-dlp", "DLP gebruikt allebei: het label én de herkende gegevens."],
      ],
    },
    {
      id: "wanneer", name: "Wanneer wordt iets gelabeld?", icon: "clock",
      steps: [
        ["lab-policy", "Bij het maken: een standaardlabel of de gebruiker moet zelf kiezen."],
        ["lab-client", "Tijdens het werken: Office herkent gevoelige inhoud en stelt een label voor."],
        ["lab-service", "In rust en onderweg: de service labelt bestanden en e-mail op de achtergrond."],
        ["cls-ondemand", "Achteraf: bestaande data op aanvraag laten scannen."],
        ["lab-copilot", "Met AI: nieuwe inhoud van Copilot erft het label van de bron."],
      ],
    },
    {
      id: "bescherming", name: "Hoe wordt data beschermd?", icon: "shield",
      steps: [
        ["lab-taxonomy", "Het label bepaalt het niveau."],
        ["pro-encrypt", "Versleuteling: alleen bevoegden kunnen openen, waar het bestand ook is."],
        ["pro-container", "Site- en teamlabels: wie erbij mag en of extern delen kan."],
        ["pro-dlp", "DLP waarschuwt of blokkeert bij e-mail, delen, chat en op apparaten."],
        ["ins-alerts", "Security krijgt een melding bij overtredingen."],
      ],
    },
    {
      id: "copilot", name: "Copilot veilig inzetten", icon: "sparkle",
      steps: [
        ["src-copilot", "Copilot ziet alleen wat de gebruiker zelf al mag openen."],
        ["pro-encrypt", "Zonder het recht ‘kopiëren’ (EXTRACT) vat Copilot een versleuteld bestand niet samen."],
        ["lab-copilot", "Nieuwe inhoud erft het label met de hoogste prioriteit."],
        ["pro-dlp-copilot", "DLP houdt gelabelde items en gevoelige prompts weg bij Copilot."],
        ["ins-dspm", "DSPM en audit laten zien wat er met AI gebeurt."],
      ],
    },
  ],
  blocks: [
    /* ---------- 1 Bronnen ---------- */
    {
      id: "src-mail", col: "src", layers: ["dlp", "label"], tier: "e3", lic: "e3", icon: "mail", route: "dlp", learn: "dlp",
      name: "Exchange Online", nl: "E-mail en bijlagen",
      uitleg: "Purview controleert e-mail bij het verzenden. Het label reist mee met bericht en bijlage, ook naar externe ontvangers.",
      design: (st) => ArchUtil.ruleState(st, "exchange", "e-mail"),
    },
    {
      id: "src-files", col: "src", layers: ["dlp", "label", "protect"], tier: "e3", lic: "e3", icon: "folder", route: "dlp", learn: "labelsSpo",
      name: "SharePoint & OneDrive", nl: "Documenten en sites",
      uitleg: "Bestanden in rust. DLP en automatisch labelen kijken naar inhoud en label. Labels moeten eerst voor SharePoint en OneDrive worden ingeschakeld (Randvoorwaarden).",
      design: (st) => (ArchUtil.check(st, "spo") === "done" ? ArchUtil.ruleState(st, "sharing", "delen") : { state: "todo", text: "Labels in SharePoint nog niet ingeschakeld" }),
    },
    {
      id: "src-teams", col: "src", layers: ["dlp", "label", "protect"], tier: "e5", lic: "e5dlp", icon: "teams", route: "dlp", learn: "dlpTeams",
      name: "Microsoft Teams", nl: "Chat, kanalen en vergaderingen",
      uitleg: "DLP voor chat- en kanaalberichten vereist E5. Labels op teams en vergaderingen werken al met E3; een paar vergaderinstellingen vragen Teams Premium.",
      design: (st) => ArchUtil.ruleState(st, "teams", "Teams"),
    },
    {
      id: "src-devices", col: "src", layers: ["dlp"], tier: "e5", lic: "e5dlp", icon: "laptop", route: "endpoint", learn: "endpoint",
      name: "Windows & macOS devices", nl: "Bestanden op laptops en pc’s",
      uitleg: "Endpoint DLP ziet wat er op een onboarded apparaat gebeurt: kopiëren naar USB, afdrukken, uploaden of plakken in een browser.",
      design: (st) => { const r = ArchUtil.ruleState(st, "endpoint", "apparaten"); return r.state === "on" && ArchUtil.check(st, "devices") !== "done" ? { state: "todo", text: r.text + " · apparaten nog onboarden" } : r; },
    },
    {
      id: "src-copilot", col: "src", layers: ["ai"], tier: "addon", lic: "copilot", icon: "sparkle", route: "copilot", learn: "copilotConsiderations",
      name: "Microsoft 365 Copilot", nl: "Prompts en antwoorden",
      uitleg: "Copilot gebruikt alleen inhoud die de gebruiker zelf al mag openen, en respecteert labels en versleuteling.",
      design: (st) => (ArchUtil.rules(st, "copilot") ? { state: "on", text: "Copilot-regels in ontwerp" } : { state: "off", text: "Geen Copilot-regels" }),
    },
    {
      id: "src-other", col: "src", layers: ["dlp", "label"], tier: "e5", lic: ["e5dlp"], icon: "server", route: "dlp", learn: "dlpOnprem",
      name: "Fabric, on-premises & cloud-apps", nl: "Power BI, bestandsshares, andere SaaS",
      uitleg: "DLP kan ook Fabric/Power BI, on-premises bestandsshares (met de scanner) en andere cloud-apps (met Defender for Cloud Apps) bewaken.",
      design: (st) => { const n = ["fabric", "onprem", "instances"].reduce((a, d) => a + ArchUtil.rules(st, d), 0); return n ? { state: "on", text: ArchUtil.n(n, "regel", "regels") } : { state: "off", text: "Niet in dit ontwerp" }; },
    },

    /* ---------- 2 Classificatie ---------- */
    {
      id: "cls-sit", col: "cls", layers: ["classify", "dlp", "label"], tier: "e3", lic: "e3", icon: "shieldcheck", route: "sits", learn: "sitLearn",
      name: "Sensitive information types", nl: "Patronen zoals BSN, IBAN en creditcard",
      uitleg: "Ruim 300 ingebouwde typen, plus eigen patronen met reguliere expressies en trefwoorden. Typen voor wachtwoorden en sleutels en ‘named entities’ (namen, adressen) vereisen E5.",
      design: (st) => { const n = ArchUtil.sits(st, "builtin") + ArchUtil.sits(st, "custom"); return n ? { state: "on", text: ArchUtil.n(n, "informatietype", "informatietypen") } : { state: "off", text: "Nog geen informatietypen" }; },
    },
    {
      id: "cls-edm", col: "cls", layers: ["classify"], tier: "e5", lic: "e5ip", icon: "database", route: "sits", learn: "edm",
      name: "Exact data match (EDM)", nl: "Match op echte waarden uit je eigen bron",
      uitleg: "Herkent exacte waarden uit een eigen tabel, bijvoorbeeld patiënt- of klantnummers. Weinig vals-positieven, wel meer inrichting.",
      design: (st) => { const n = ArchUtil.sits(st, "edm"); return n ? { state: "on", text: ArchUtil.n(n, "EDM-type", "EDM-typen") } : { state: "off", text: "Niet gebruikt" }; },
    },
    {
      id: "cls-fp", col: "cls", layers: ["classify"], tier: "e5", lic: "e5ip", icon: "fingerprint", route: "sits", learn: "fingerprint",
      name: "Document fingerprinting", nl: "Herkent formulieren en sjablonen",
      uitleg: "Maakt een ‘vingerafdruk’ van een standaardformulier. Ingevulde varianten worden dan herkend. Nieuwe fingerprints maken vereist E5.",
      design: (st) => { const n = ArchUtil.sits(st, "fingerprint"); return n ? { state: "on", text: ArchUtil.n(n, "fingerprint", "fingerprints") } : { state: "off", text: "Niet gebruikt" }; },
    },
    {
      id: "cls-tc", col: "cls", layers: ["classify", "label"], tier: "e5", lic: "e5ip", icon: "brain", route: "sits", learn: "classifiersLearn",
      name: "Trainable classifiers", nl: "Herkent documentsoorten",
      uitleg: "Herkent documenten op type in plaats van patroon, bijvoorbeeld cv’s, contracten of medische dossiers. Voor automatisch labelen is E5 nodig.",
      design: (st) => { const n = ArchUtil.sits(st, "classifier"); return n ? { state: "on", text: ArchUtil.n(n, "classifier", "classifiers") } : { state: "off", text: "Niet gebruikt" }; },
    },
    {
      id: "cls-ondemand", col: "cls", layers: ["classify"], tier: "addon", lic: "payg", icon: "search", route: "", learn: "onDemand",
      name: "On-demand classification", nl: "Bestaande data achteraf scannen",
      uitleg: "Scant op aanvraag bestaande bestanden die nog nooit zijn geclassificeerd. Je betaalt per gescand item (pay-as-you-go), bovenop de normale licentie.",
      design: () => ({ state: "na", text: "Optioneel, na de uitrol" }),
    },

    /* ---------- 3 Labeling ---------- */
    {
      id: "lab-taxonomy", col: "lab", layers: ["label"], tier: "e3", lic: "e3", icon: "tag", route: "schema", learn: "labels",
      name: "Sensitivity labels", nl: "Jullie classificatieschema als labels",
      uitleg: "Elk label is een niveau uit het classificatieschema. De volgorde bepaalt de prioriteit: hoger is gevoeliger.",
      design: (st) => { const n = applicableLabels(st).length; return n ? { state: "on", text: ArchUtil.n(n, "label", "labels") } : { state: "todo", text: "Nog geen labels" }; },
    },
    {
      id: "lab-policy", col: "lab", layers: ["label"], tier: "e3", lic: "e3", icon: "users", route: "policies", learn: "labelsCreate",
      name: "Label policies", nl: "Wie welke labels krijgt",
      uitleg: "Publiceert labels aan medewerkers. Hier stel je ook een standaardlabel, verplicht labelen en motivatie bij verlagen in.",
      design: (st) => {
        const ps = st.labelPolicies || [], s = ps.map((p) => p.settings || {});
        const x = [s.some((o) => o.defaultDocs) && "standaardlabel", s.some((o) => o.mandatoryDocs || o.mandatoryEmail) && "verplicht", s.some((o) => o.justification) && "motivatie"].filter(Boolean);
        return applicableLabels(st).length ? { state: "on", text: `${ArchUtil.n(ps.length, "beleid", "beleidsregels")}${x.length ? " · " + x.join(", ") : ""}` } : { state: "todo", text: "Eerst labels maken" };
      },
    },
    {
      id: "lab-client", col: "lab", layers: ["label", "classify"], tier: "e5", lic: "e5ip", icon: "bulb", route: "autolabel", learn: "labelsAuto",
      name: "Client-side auto-labeling", nl: "Office stelt een label voor tijdens het werken",
      uitleg: "Word, Excel, PowerPoint en Outlook herkennen gevoelige inhoud en raden een label aan of passen het toe. Zowel aanbevelen als automatisch toepassen vereist E5.",
      design: (st) => { const n = ArchUtil.labels(st, (l) => l.cfg.autolabel.client.mode !== "off"); return n ? { state: "on", text: ArchUtil.n(n, "label", "labels") } : { state: "off", text: "Niet gebruikt" }; },
    },
    {
      id: "lab-service", col: "lab", layers: ["label", "classify"], tier: "e5", lic: "e5ip", icon: "wand", route: "autolabel", learn: "labelsAuto",
      name: "Service-side auto-labeling", nl: "Labelt bestanden en e-mail op de achtergrond",
      uitleg: "Labelt bestaande bestanden in SharePoint en OneDrive en e-mail onderweg, zonder dat de gebruiker iets doet. Eerst in simulatie. Een standaardlabel per bibliotheek valt ook onder E5.",
      design: (st) => { const n = ArchUtil.labels(st, (l) => l.cfg.autolabel.service.enabled); return n ? { state: "on", text: ArchUtil.n(n, "label", "labels") } : { state: "off", text: "Niet gebruikt" }; },
    },
    {
      id: "lab-copilot", col: "lab", layers: ["label", "ai"], tier: "addon", lic: "copilot", icon: "sparkle", route: "copilot", learn: "labelsCopilot",
      name: "Label inheritance (Copilot)", nl: "Nieuwe inhoud erft het hoogste label",
      uitleg: "Maakt Copilot iets nieuws op basis van gelabelde bronnen, dan krijgt het resultaat het label met de hoogste prioriteit.",
      design: (st) => (applicableLabels(st).length ? { state: "on", text: "Werkt automatisch met jullie labels" } : { state: "todo", text: "Eerst labels maken" }),
    },

    /* ---------- 4 Bescherming ---------- */
    {
      id: "pro-marking", col: "pro", layers: ["label", "protect"], tier: "e3", lic: "e3", icon: "watermark", route: "labels", learn: "labelsOffice",
      name: "Content marking", nl: "Koptekst, voettekst en watermerk",
      uitleg: "Maakt het label zichtbaar in het document zelf. Een watermerk verschijnt in Word, Excel en PowerPoint, niet in e-mail.",
      design: (st) => { const n = ArchUtil.labels(st, (l) => { const m = l.cfg.marking; return m.header.enabled || m.footer.enabled || m.watermark.enabled; }); return n ? { state: "on", text: ArchUtil.n(n, "label", "labels") } : { state: "off", text: "Geen markering" }; },
    },
    {
      id: "pro-encrypt", col: "pro", layers: ["protect", "label", "ai"], tier: "e3", lic: "e3", icon: "lock", route: "labels", learn: "labelsEncryption",
      name: "Encryption & usage rights", nl: "Alleen bevoegden kunnen openen",
      uitleg: "Versleuteling reist mee met het bestand. Rechten bepalen wat iemand mag: lezen, wijzigen, afdrukken of kopiëren. Zonder ‘kopiëren’ (EXTRACT) vat Copilot het bestand niet samen.",
      design: (st) => { const n = ArchUtil.labels(st, (l) => ["assignNow", "userDefined"].includes(l.cfg.encryption.mode)); return n ? { state: "on", text: ArchUtil.n(n, "label", "labels") } : { state: "off", text: "Geen versleuteling" }; },
    },
    {
      id: "pro-dke", col: "pro", layers: ["protect"], tier: "e5", lic: "dke", icon: "key", route: "labels", learn: "dke",
      name: "Double Key Encryption", nl: "Eigen sleutel voor het allergeheimste",
      uitleg: "Jullie houden een tweede sleutel zelf in beheer; ook Microsoft kan dan niet bij de inhoud. Copilot kan deze bestanden niet gebruiken. Alleen voor een klein deel van de data.",
      design: (st) => { const n = ArchUtil.labels(st, (l) => l.cfg.encryption.dke); return n ? { state: "on", text: ArchUtil.n(n, "label", "labels") } : { state: "off", text: "Niet gebruikt" }; },
    },
    {
      id: "pro-container", col: "pro", layers: ["protect", "label"], tier: "e3", lic: "e3", icon: "site", route: "labels", learn: "labelsContainers",
      name: "Teams, groups & sites", nl: "Privacy, gasten en extern delen per site",
      uitleg: "Een label op een team of site bepaalt privacy, gasttoegang, extern delen en toegang vanaf onbeheerde apparaten. Toegang via Conditional Access (authentication context) vereist E5.",
      design: (st) => { const n = ArchUtil.labels(st, (l) => l.cfg.scope.sites); if (!n) return { state: "off", text: "Geen site-labels" }; return ArchUtil.check(st, "containers") === "done" ? { state: "on", text: ArchUtil.n(n, "label", "labels") } : { state: "todo", text: `${ArchUtil.n(n, "label", "labels")} · nog inschakelen` }; },
    },
    {
      id: "pro-dlp", col: "pro", layers: ["dlp"], tier: "e3", lic: "e3", icon: "shield", route: "dlp", learn: "dlp",
      name: "Data loss prevention", nl: "Waarschuwen of blokkeren bij delen",
      uitleg: "DLP kijkt naar label én inhoud en kan een policy tip tonen, blokkeren of laten overschrijven met een reden. Voor e-mail, SharePoint en OneDrive doorgaans E3; Teams en apparaten doorgaans E5 (controleer licentie).",
      design: (st) => { const n = ["exchange", "sharing", "teams", "endpoint"].reduce((a, d) => a + ArchUtil.rules(st, d), 0); return n ? { state: "on", text: `${ArchUtil.n(n, "regel", "regels")} · ${ArchUtil.mode(st, "exchange")}` } : { state: "off", text: "Nog geen DLP" }; },
    },
    {
      id: "pro-dlp-copilot", col: "pro", layers: ["dlp", "ai"], tier: "addon", lic: "copilot", icon: "sparkle", route: "copilot", learn: "dlpCopilot",
      name: "DLP for Copilot", nl: "Gevoelige items en prompts weghouden bij Copilot",
      uitleg: "Items met bepaalde labels kun je uitsluiten van Copilot-antwoorden; ze kunnen wel als bron verschijnen. Prompts met gevoelige informatietypen kun je blokkeren. Eigen policy (niet te combineren met andere locaties), zonder trainable classifiers. Licentie: afhankelijk van plan; controleer.",
      preview: "Prompts met gevoelige gegevens blokkeren is in preview.",
      design: (st) => (ArchUtil.rules(st, "copilot") ? { state: "on", text: "Regels in ontwerp" } : { state: "off", text: "Niet gebruikt" }),
    },
    {
      id: "oos-retention", col: "pro", layers: ["label"], tier: "e3", lic: "e3", icon: "clock", route: "", learn: "retention", out: true,
      name: "Retention labels", nl: "Bewaren en verwijderen",
      uitleg: "Bepaalt hoe lang iets bewaard blijft. Dit is een ander soort label dan een sensitivity label en valt buiten deze workshop. Automatisch toepassen vereist E5.",
    },

    /* ---------- 5 Inzicht ---------- */
    {
      id: "ins-sim", col: "ins", layers: ["dlp", "monitor"], tier: "e3", lic: "e3", icon: "flask", route: "dlp", learn: "dlpSimulation",
      name: "Simulation & policy tips", nl: "Eerst meten, dan pas blokkeren",
      uitleg: "Een nieuw beleid draait eerst in simulatie: je ziet wat er zou gebeuren, medewerkers merken niets. Daarna eventueel alleen policy tips, en pas dan blokkeren.",
      design: (st) => ({ state: "on", text: `Standaard: ${ArchUtil.mode(st, "exchange")}` }),
    },
    {
      id: "ins-alerts", col: "ins", layers: ["dlp", "monitor"], tier: "e3", lic: "e3", icon: "bell", route: "dlp", learn: "dlpAlerts",
      name: "DLP alerts", nl: "Meldingen voor security bij overtredingen",
      uitleg: "Een overtreding kan een melding voor het securityteam geven. De licentie hangt af van de locatie: e-mail en SharePoint met E3, Teams en apparaten met E5.",
      design: (st) => { const n = ArchUtil.labels(st, (l) => l.cfg.notify && l.cfg.notify.alert && l.cfg.notify.alert !== "none"); return n ? { state: "on", text: ArchUtil.n(n, "label met alert", "labels met alert") } : { state: "off", text: "Geen alerts" }; },
    },
    {
      id: "ins-explorer", col: "ins", layers: ["monitor", "classify"], tier: "e5", lic: "e5ip", icon: "chart", route: "tenant", learn: "explorers",
      name: "Content & Activity explorer", nl: "Waar staat gevoelige data, wat gebeurt ermee?",
      uitleg: "Laat zien waar gelabelde en gevoelige items staan en wat ermee gebeurt (labelen, delen, kopiëren). De volledige weergave vereist E5. Werkt alleen met audit aan.",
      design: (st) => (ArchUtil.check(st, "audit") === "done" ? { state: "on", text: "Audit staat aan" } : { state: "todo", text: "Audit nog aanzetten" }),
    },
    {
      id: "ins-audit", col: "ins", layers: ["monitor", "ai"], tier: "e3", lic: "e3", icon: "clipboard", route: "tenant", learn: "auditSolutions",
      name: "Audit", nl: "Wie deed wat, wanneer?",
      uitleg: "Audit (Standard, E3) bewaart activiteiten 180 dagen, inclusief Copilot-gebruik. Audit (Premium, E5) bewaart standaard een jaar.",
      design: (st) => (ArchUtil.check(st, "audit") === "done" ? { state: "on", text: "Aan" } : { state: "todo", text: "Nog aanzetten" }),
    },
    {
      id: "ins-dspm", col: "ins", layers: ["monitor", "ai"], tier: "e5", lic: "e5", icon: "target", route: "copilot", learn: "dspm",
      name: "Data Security Posture Management", nl: "Overzicht van datarisico’s, ook voor AI",
      uitleg: "Eén dashboard met risico’s rond gevoelige data en AI-gebruik, met aanbevolen beleid. Enkele onderdelen zijn nog in preview.",
      design: (st) => (ArchUtil.check(st, "copilot") === "done" ? { state: "on", text: "Ingericht" } : { state: "na", text: "Aanrader bij Copilot" }),
    },
    {
      id: "oos-irm", col: "ins", layers: ["monitor", "dlp"], tier: "e5", lic: "e5", icon: "user", route: "", learn: "adaptiveProtection", out: true,
      name: "Insider Risk & Adaptive Protection", nl: "Strengere DLP voor risicovolle gebruikers",
      uitleg: "Insider Risk Management bepaalt een risiconiveau per gebruiker. Adaptive Protection maakt DLP dan automatisch strenger. Valt buiten deze workshop.",
    },
  ],
};
