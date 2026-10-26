/* Catalogus: Referentiearchitectuur (Classificatie & Labeling). Eigen Nederlandse uitleg, licenties en status volgens Microsoft Learn (zie CATALOG.docsVerified).
   Structuur en relaties gebaseerd op "Microsoft Purview – Classification & Labeling Interactive Reference Architecture" (github.com/microsoft/purview, MIT-licentie, © Microsoft Corporation). */

Object.assign(CATALOG.learn, {
  ipOverview: { title: "Learn about Microsoft Purview Information Protection", url: LEARN_BASE + "purview/information-protection" },
  onDemand: { title: "On-demand classification", url: LEARN_BASE + "purview/on-demand-classification" },
  explorers: { title: "Get started with Activity explorer", url: LEARN_BASE + "purview/data-classification-activity-explorer" },
  auditSolutions: { title: "Auditing solutions in Microsoft Purview", url: LEARN_BASE + "purview/audit-solutions-overview" },
  dspm: { title: "Learn about Data Security Posture Management", url: LEARN_BASE + "purview/data-security-posture-management-learn-about" },
  adaptiveProtection: { title: "Learn about Adaptive Protection", url: LEARN_BASE + "purview/insider-risk-management-adaptive-protection" },
  retention: { title: "Learn about data lifecycle management", url: LEARN_BASE + "purview/data-lifecycle-management" },
  copilotConsiderations: { title: "Considerations for Microsoft 365 Copilot and Purview", url: LEARN_BASE + "purview/ai-m365-copilot-considerations" },
  namedEntities: { title: "Learn about named entities", url: LEARN_BASE + "purview/sit-named-entities-learn" },
  aiPurview: { title: "Microsoft Purview data security and compliance protections for generative AI apps", url: LEARN_BASE + "purview/ai-microsoft-purview" },
  irm: { title: "Learn about Insider Risk Management", url: LEARN_BASE + "purview/insider-risk-management" },
  ipSolution: { title: "Deploy an information protection solution with Microsoft Purview", url: LEARN_BASE + "purview/information-protection-solution" },
  copilotArch: { title: "Microsoft 365 Copilot architecture and how it works", url: LEARN_BASE + "copilot/microsoft-365/microsoft-365-copilot-architecture" },
  copilotDataProt: { title: "Microsoft 365 Copilot data protection architecture", url: LEARN_BASE + "copilot/microsoft-365/microsoft-365-copilot-architecture-data-protection-auditing" },
  archOriginal: { title: "Microsoft Purview – Classification & Labeling Interactive Reference Architecture", url: "https://microsoft.github.io/purview/purview-classification-labeling-reference-architecture.html" },
  rm560708: { title: "Microsoft 365 roadmap – ID 560708", url: "https://www.microsoft.com/microsoft-365/roadmap?id=560708" },
  rm570844: { title: "Microsoft 365 roadmap – ID 570844", url: "https://www.microsoft.com/microsoft-365/roadmap?id=570844" },
  rm567890: { title: "Microsoft 365 roadmap – ID 567890", url: "https://www.microsoft.com/microsoft-365/roadmap?id=567890" },
  rm570445: { title: "Microsoft 365 roadmap – ID 570445", url: "https://www.microsoft.com/microsoft-365/roadmap?id=570445" },
  rm568935: { title: "Microsoft 365 roadmap – ID 568935", url: "https://www.microsoft.com/microsoft-365/roadmap?id=568935" },
  rm559105: { title: "Microsoft 365 roadmap – ID 559105", url: "https://www.microsoft.com/microsoft-365/roadmap?id=559105" },
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
  verified: "29 september 2026",
  /* Kolommen = de vijf fasen uit het origineel, elk met de vraag die de fase beantwoordt. */
  cols: [
    { id: "src", name: "Bronnen", q: "Waar ontstaat informatie?", sub: "Wat mensen maken, delen of typen", icon: "cloud" },
    { id: "cls", name: "Classificatie", q: "Wat is het?", sub: "Purview herkent wat erin staat", icon: "search" },
    { id: "lab", name: "Labeling", q: "Wat is de bedoeling?", sub: "Een label legt de gevoeligheid vast", icon: "tag" },
    { id: "pro", name: "Bescherming", q: "Wat doen we eraan?", sub: "Versleuteling, toegang en DLP", icon: "shield" },
    { id: "ins", name: "Inzicht", q: "Wat leren we ervan?", sub: "Meten, melden en bijsturen", icon: "chart" },
  ],
  groups: { engines: "Classifiers", scale: "Auto-labeling op schaal" },
  /* Lagen ("Isoleer laag"): welke bronnen een laag raakt, met de bewuste asymmetrie. */
  layers: [
    { id: "label", name: "Labels", cover: ["src-mail", "src-files", "src-devices", "src-teams"], note: "Een Copilot-prompt en een Teams-chatbericht krijgen zelf geen label. Bestanden in Teams en het team zelf wel." },
    { id: "classify", name: "Classificatie", cover: ["src-mail", "src-files", "src-teams", "src-devices", "src-copilot", "src-other"], note: "Fingerprinting en trainable classifiers beoordelen bestanden, niet de tekst van een chat of e-mail." },
    { id: "protect", name: "Versleuteling & toegang", cover: ["src-mail", "src-files", "src-teams", "src-devices"], note: "Versleuteling werkt op bestanden en e-mail. Copilot respecteert rechten, maar een prompt zelf wordt niet versleuteld." },
    { id: "dlp", name: "DLP", cover: ["src-mail", "src-files", "src-teams", "src-devices", "src-copilot", "src-other"], note: "Voorwaarden verschillen per locatie: Teams-chat alleen informatietypen, de Copilot-locatie vooral labels." },
    { id: "ai", name: "Copilot & AI", cover: ["src-copilot", "src-files", "src-mail"], note: "Copilot gebruikt bestanden en e-mail waar de gebruiker al bij mag." },
    { id: "monitor", name: "Monitoring", cover: ["src-mail", "src-files", "src-teams", "src-devices", "src-copilot", "src-other"], note: "Inzicht krijgt signalen over items (gebeurtenissen, meldingen), niet de inhoud zelf." },
  ],
  tiers: [
    ["all", "Alle licenties"],
    ["e3", "Doorgaans in E3"],
    ["e5", "E5 (extra t.o.v. E3)"],
    ["addon", "Copilot / pay-as-you-go"],
  ],
  /* Soorten relaties (de pijlen uit het origineel). */
  kinds: {
    auto: { name: "Automatisch", desc: "Gebeurt vanzelf, tijdens het werken of onderweg" },
    demand: { name: "Op aanvraag", desc: "Alleen als een beheerder het start (data in rust)" },
    signal: { name: "Signaal", desc: "Gegevens óver het item (gebeurtenis, melding), niet de inhoud" },
  },
  /* [van, naar, soort] */
  edges: [
    ["src-mail", "cls-auto", "auto"], ["src-files", "cls-auto", "auto"], ["src-teams", "cls-auto", "auto"], ["src-devices", "cls-auto", "auto"], ["src-copilot", "cls-auto", "auto"], ["src-other", "cls-auto", "auto"],
    ["src-files", "cls-ondemand", "demand"], ["src-devices", "cls-ondemand", "demand"],
    ["cls-auto", "cls-sit", "auto"], ["cls-auto", "cls-ne", "auto"], ["cls-auto", "cls-edm", "auto"], ["cls-auto", "cls-fp", "auto"], ["cls-auto", "cls-tc", "auto"], ["cls-auto", "cls-ai", "auto"],
    ["cls-ondemand", "cls-sit", "demand"], ["cls-ondemand", "cls-ne", "demand"], ["cls-ondemand", "cls-edm", "demand"], ["cls-ondemand", "cls-fp", "demand"], ["cls-ondemand", "cls-tc", "demand"], ["cls-ondemand", "lab-service", "demand"],
    ["cls-sit", "lab-client", "auto"], ["cls-sit", "lab-service", "auto"], ["cls-sit", "pro-dlp", "auto"], ["cls-sit", "pro-dlp-copilot", "auto"],
    ["cls-edm", "lab-client", "auto"], ["cls-edm", "lab-service", "auto"], ["cls-edm", "pro-dlp", "auto"],
    ["cls-ne", "lab-client", "auto"], ["cls-ne", "lab-service", "auto"], ["cls-ne", "pro-dlp", "auto"],
    ["cls-fp", "pro-dlp", "auto"],
    ["cls-tc", "lab-client", "auto"], ["cls-tc", "lab-service", "auto"], ["cls-tc", "pro-dlp", "auto"],
    ["cls-ai", "lab-service", "auto"],
    ["lab-policy", "lab-taxonomy", "auto"], ["lab-manual", "lab-taxonomy", "auto"], ["lab-client", "lab-taxonomy", "auto"], ["lab-library", "lab-taxonomy", "auto"], ["lab-service", "lab-taxonomy", "auto"],
    ["lab-service", "lab-scale", "auto"], ["lab-library", "lab-scale", "auto"],
    ["lab-taxonomy", "pro-marking", "auto"], ["lab-taxonomy", "pro-encrypt", "auto"], ["lab-taxonomy", "pro-dke", "auto"], ["lab-taxonomy", "pro-container", "auto"], ["lab-taxonomy", "pro-dlp", "auto"], ["lab-taxonomy", "pro-dlp-copilot", "auto"], ["lab-taxonomy", "lab-copilot", "auto"],
    ["lab-taxonomy", "ins-explorer", "signal"], ["lab-taxonomy", "ins-audit", "signal"], ["lab-taxonomy", "oos-irm", "signal"],
    ["lab-copilot", "ins-audit", "signal"], ["pro-encrypt", "ins-audit", "signal"],
    ["pro-container", "ins-dspm", "signal"], ["pro-container", "ins-audit", "signal"],
    ["pro-dlp", "ins-sim", "signal"], ["pro-dlp", "ins-alerts", "signal"], ["pro-dlp", "ins-explorer", "signal"], ["pro-dlp", "ins-dspm", "signal"], ["pro-dlp", "ins-audit", "signal"],
    ["pro-dlp-copilot", "ins-alerts", "signal"], ["pro-dlp-copilot", "ins-explorer", "signal"], ["pro-dlp-copilot", "ins-dspm", "signal"], ["pro-dlp-copilot", "ins-audit", "signal"],
    ["oos-retention", "ins-explorer", "signal"], ["oos-retention", "ins-audit", "signal"],
    ["oos-irm", "pro-dlp", "auto"], ["oos-irm", "ins-audit", "signal"],
  ],
  /* Buiten Microsoft 365 gelden andere voorwaarden (scope-notitie uit het origineel). */
  scope: {
    lead: "Deze plaat beschrijft Microsoft 365: SharePoint, OneDrive, Exchange, Teams, Microsoft 365 Copilot en onboarded Windows- en macOS-apparaten.",
    out: ["Netwerkshares en SharePoint Server via de Information Protection scanner", "Cloud-apps buiten Microsoft 365 via Defender for Cloud Apps", "Bronnen van derden en multicloud via Microsoft Purview Data Map"],
  },
  paths: [
    {
      id: "verschil", name: "Classificatie of label?", icon: "question",
      steps: [
        ["cls-sit", "Classificatie herkent wát er in de inhoud staat, bijvoorbeeld een BSN. Dat wordt niet op het item vastgelegd."],
        ["lab-taxonomy", "Een label is een vastgelegde keuze over hoe gevoelig iets is. Het reist mee met het item."],
        ["lab-client", "Classificatie kan een label voorstellen of automatisch toepassen."],
        ["pro-encrypt", "Het label draagt de bescherming: versleuteling en markering reizen mee met het bestand."],
        ["pro-dlp", "DLP gebruikt allebei: het label én de herkende gegevens."],
      ],
    },
    {
      id: "classificeren", name: "Wanneer wordt iets geclassificeerd?", icon: "search",
      steps: [
        ["cls-auto", "Automatisch: bij maken, uploaden of wijzigen."],
        ["cls-sit", "De classifiers bepalen wat er in de inhoud staat."],
        ["cls-ondemand", "Op aanvraag: een beheerder laat bestaande data in rust scannen (pay-as-you-go)."],
        ["lab-service", "Service-side auto-labeling gebruikt de nieuwe resultaten. On-demand classification labelt zelf niet."],
        ["pro-dlp", "DLP gebruikt de classificatie bij de volgende actie, zoals delen of verzenden."],
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
        ["lab-taxonomy", "Het label bepaalt het niveau: de bedoeling."],
        ["pro-encrypt", "Versleuteling: alleen bevoegden kunnen openen, waar het bestand ook is."],
        ["pro-container", "Site- en teamlabels: wie erbij mag en of extern delen kan."],
        ["pro-dlp", "DLP kijkt naar inhoud én label, en waarschuwt of blokkeert."],
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
      id: "src-mail", col: "src", layers: ["dlp", "label", "classify", "protect", "ai", "monitor"], tier: "e3", lic: "e3", icon: "mail", route: "dlp", learn: "dlp", plate: "locaties",
      name: "Exchange Online", nl: "E-mail en bijlagen",
      uitleg: "Purview controleert e-mail bij het verzenden. Het label reist mee met bericht en bijlage, ook naar externe ontvangers.",
      tech: { ziet: "Onderwerp, tekst en headers van e-mail. Een bijlage wordt als bestand beoordeeld.", kan: "Een e-mail kan een label en versleuteling dragen en wordt door DLP beoordeeld op informatietypen.", niet: "Of EDM, fingerprinting of trainable classifiers ook de e-mailtekst zelf beoordelen, is niet gedocumenteerd; het gedocumenteerde scenario is de bijlage." },
      design: (st) => ArchUtil.ruleState(st, "exchange", "e-mail"),
    },
    {
      id: "src-files", col: "src", layers: ["dlp", "label", "classify", "protect", "ai", "monitor"], tier: "e3", lic: "e3", icon: "folder", route: "dlp", learn: "labelsSpo", plate: "locaties",
      name: "SharePoint & OneDrive", nl: "Documenten en sites",
      uitleg: "Bestanden in rust. DLP en automatisch labelen kijken naar inhoud en label. Labels moeten eerst voor SharePoint en OneDrive worden ingeschakeld (Randvoorwaarden).",
      tech: { ziet: "Bestanden in rust in SharePoint en OneDrive, in veel bestandsformaten.", kan: "Eén bestand kan tegelijk een label, versleuteling, rechten en retentie hebben.", niet: "Automatisch labelen van bestanden in rust werkt alleen voor ondersteunde Office-bestanden en pdf." },
      design: (st) => (ArchUtil.check(st, "spo") === "done" ? ArchUtil.ruleState(st, "sharing", "delen") : { state: "todo", text: "Labels in SharePoint nog niet ingeschakeld" }),
    },
    {
      id: "src-teams", col: "src", layers: ["dlp", "label", "classify", "protect", "monitor"], tier: "e5", lic: "e5dlp", icon: "teams", route: "dlp", learn: "dlpTeams", plate: "locaties",
      name: "Microsoft Teams", nl: "Chat, kanalen en vergaderingen",
      uitleg: "DLP voor chat- en kanaalberichten vereist E5. Labels op teams en vergaderingen werken al met E3; een paar vergaderinstellingen vragen Teams Premium.",
      tech: { ziet: "Chat- en kanaalberichten. Een gedeeld bestand wordt apart als bestand beoordeeld.", kan: "DLP beoordeelt berichten met informatietypen en EDM.", niet: "Een chatbericht krijgt zelf geen sensitivity label. In Teams kan DLP geen label als voorwaarde gebruiken." },
      design: (st) => ArchUtil.ruleState(st, "teams", "Teams"),
    },
    {
      id: "src-devices", col: "src", layers: ["dlp", "label", "classify", "protect", "monitor"], tier: "e5", lic: "e5dlp", icon: "laptop", route: "endpoint", learn: "endpoint", plate: "locaties",
      name: "Windows & macOS devices", nl: "Bestanden op laptops en pc’s",
      uitleg: "Endpoint DLP ziet wat er op een onboarded apparaat gebeurt: kopiëren naar USB, afdrukken, uploaden of plakken in een browser.",
      tech: { ziet: "Bestanden op onboarded Windows 10/11-, Windows Server- en macOS-apparaten.", kan: "Scant bij maken of wijzigen op informatietypen en labels. Bewaakt onder meer USB, netwerkshare, afdrukken, klembord, upload, Bluetooth en RDP.", niet: "Data die nooit als bestand is opgeslagen, wordt niet gescand. Een label van een andere tenant wordt niet herkend. Programmabestanden (.exe, .dll) worden niet bewaakt." },
      design: (st) => { const r = ArchUtil.ruleState(st, "endpoint", "apparaten"); return r.state === "on" && ArchUtil.check(st, "devices") !== "done" ? { state: "todo", text: r.text + " · apparaten nog onboarden" } : r; },
    },
    {
      id: "src-copilot", col: "src", layers: ["ai", "classify", "dlp", "monitor"], tier: "addon", lic: "copilot", icon: "sparkle", route: "copilot", learn: "copilotConsiderations", plate: "copilot",
      name: "Microsoft 365 Copilot", nl: "Prompts en antwoorden",
      uitleg: "Copilot gebruikt alleen inhoud die de gebruiker zelf al mag openen, en respecteert labels en versleuteling.",
      tech: { ziet: "Wat in de prompt staat: getypte of geplakte tekst, een geüpload bestand, een afbeelding of een link.", kan: "Prompttekst wordt realtime op informatietypen gecontroleerd, zodat DLP voor Copilot kan ingrijpen.", niet: "Een prompt is zelf geen gelabeld item en krijgt geen sensitivity label." },
      design: (st) => (ArchUtil.rules(st, "copilot") ? { state: "on", text: "Copilot-regels in ontwerp" } : { state: "off", text: "Geen Copilot-regels" }),
    },
    {
      id: "src-other", col: "src", layers: ["dlp", "label", "classify", "monitor"], tier: "e5", lic: ["e5dlp"], icon: "server", route: "dlp", learn: "dlpOnprem",
      name: "Fabric, on-premises & cloud-apps", nl: "Power BI, bestandsshares, andere SaaS",
      uitleg: "DLP kan ook Fabric/Power BI, on-premises bestandsshares (met de scanner) en andere cloud-apps (met Defender for Cloud Apps) bewaken. Hiervoor gelden andere voorwaarden dan op deze plaat.",
      tech: { ziet: "Data buiten de Microsoft 365-workloads.", kan: "DLP en labels uitbreiden met de scanner, Defender for Cloud Apps of Data Map.", niet: "De rest van deze plaat zegt niets over deze bronnen: mogelijkheden en licenties verschillen. Controleer per bron." },
      design: (st) => { const n = ["fabric", "onprem", "instances"].reduce((a, d) => a + ArchUtil.rules(st, d), 0); return n ? { state: "on", text: ArchUtil.n(n, "regel", "regels") } : { state: "off", text: "Niet in dit ontwerp" }; },
    },

    /* ---------- 2 Classificatie ---------- */
    {
      id: "cls-auto", col: "cls", layers: ["classify"], tier: "e3", lic: "e3", icon: "play", route: "sits", learn: "sitLearn", plate: "keten",
      name: "Automatic classification", nl: "Bij maken, uploaden of wijzigen",
      uitleg: "Purview classificeert inhoud automatisch zodra die wordt gemaakt, geüpload of gewijzigd. Je ziet daar zelf niets van.",
      tech: { ziet: "Inhoud op het moment dat die ontstaat of verandert.", kan: "Past de classifiers van de tenant toe.", niet: "Classificatie is een vaststelling, geen keuze: het wordt niet op het item vastgelegd en zet zelf geen label." },
      design: () => ({ state: "on", text: "Altijd actief" }),
    },
    {
      id: "cls-sit", col: "cls", grp: "engines", layers: ["classify", "dlp", "label"], tier: "e3", lic: "e3", icon: "shieldcheck", route: "sits", learn: "sitLearn",
      name: "Sensitive information types", nl: "Patronen zoals BSN, IBAN en creditcard",
      uitleg: "Ruim 300 ingebouwde typen, plus eigen patronen met reguliere expressies en trefwoorden. Typen voor wachtwoorden en sleutels vereisen E5.",
      tech: { ziet: "Inhoud, vergeleken met reguliere expressies, trefwoorden en woordenlijsten, met betrouwbaarheid en nabijheid.", kan: "De breedste herkenning: ook tekst in Teams-berichten en e-mail.", niet: "Een informatietype werkt alleen voor inhoud die ná het maken of wijzigen van dat type is gemaakt of gewijzigd. Voor oudere inhoud is er on-demand classification." },
      design: (st) => { const n = ArchUtil.sits(st, "builtin") + ArchUtil.sits(st, "custom"); return n ? { state: "on", text: ArchUtil.n(n, "informatietype", "informatietypen") } : { state: "off", text: "Nog geen informatietypen" }; },
    },
    {
      id: "cls-ne", col: "cls", grp: "engines", layers: ["classify", "dlp", "label"], tier: "e5", lic: "e5ip", icon: "users", route: "sits", learn: "namedEntities",
      name: "Named entities", nl: "Namen, adressen en medische termen",
      uitleg: "Herkent persoonsnamen, adressen en medische termen met woordenlijsten en patronen. Vereist E5.",
      tech: { ziet: "Persoonsnamen, fysieke adressen en medische termen, per land of als bundel.", kan: "Werkt in DLP en auto-labeling voor SharePoint, OneDrive, Teams, Exchange en Windows-apparaten.", niet: "Eerst ‘Advanced classification’ inschakelen. Namen alleen in Latijns schrift. Niet voor on-premises, Power BI of de scanner. Niet te bewerken of te kopiëren." },
      design: () => ({ state: "na", text: "Kies op Informatietypen" }),
    },
    {
      id: "cls-edm", col: "cls", grp: "engines", layers: ["classify", "dlp", "label"], tier: "e5", lic: "e5ip", icon: "database", route: "sits", learn: "edm",
      name: "Exact data match (EDM)", nl: "Match op echte waarden uit je eigen bron",
      uitleg: "Herkent exacte waarden uit een eigen tabel, bijvoorbeeld patiënt- of klantnummers. Weinig vals-positieven, wel meer inrichting.",
      tech: { ziet: "Inhoud, vergeleken met een gehashte kopie van jullie eigen tabel (tot 100 miljoen rijen, dagelijks te verversen).", kan: "DLP voor SharePoint, OneDrive, Teams-chat, Exchange en apparaten; auto-labeling in de service en in Office.", niet: "Voor client-side auto-labeling mag EDM niet de enige voorwaarde zijn: voeg minstens één ander informatietype toe." },
      design: (st) => { const n = ArchUtil.sits(st, "edm"); return n ? { state: "on", text: ArchUtil.n(n, "EDM-type", "EDM-typen") } : { state: "off", text: "Niet gebruikt" }; },
    },
    {
      id: "cls-fp", col: "cls", grp: "engines", layers: ["classify", "dlp"], tier: "e5", lic: "e5ip", icon: "fingerprint", route: "sits", learn: "fingerprint",
      scope: { src: ["src-files", "src-devices", "src-mail", "src-teams"] },
      name: "Document fingerprinting", nl: "Herkent formulieren en sjablonen",
      uitleg: "Maakt een ‘vingerafdruk’ van een standaardformulier. Ingevulde varianten worden dan herkend. Nieuwe fingerprints maken vereist E5.",
      tech: { ziet: "Bestanden, ook als bijlage of gedeeld in Teams.", kan: "Herkent bestanden op basis van een sjabloon. Gaat alleen naar DLP.", niet: "Voedt geen labeling. Beoordeelt het bestand, niet de chat- of e-mailtekst. Geen wachtwoordbeveiligde bestanden, afbeeldingen of bestanden boven 4 MB." },
      design: (st) => { const n = ArchUtil.sits(st, "fingerprint"); return n ? { state: "on", text: ArchUtil.n(n, "fingerprint", "fingerprints") } : { state: "off", text: "Niet gebruikt" }; },
    },
    {
      id: "cls-tc", col: "cls", grp: "engines", layers: ["classify", "label", "dlp"], tier: "e5", lic: "e5ip", icon: "brain", route: "sits", learn: "classifiersLearn",
      scope: { src: ["src-files", "src-devices", "src-mail", "src-teams"] },
      name: "Trainable classifiers", nl: "Herkent documentsoorten",
      uitleg: "Herkent documenten op type in plaats van patroon, bijvoorbeeld cv’s, contracten of medische dossiers. Voor automatisch labelen is E5 nodig.",
      tech: { ziet: "Bestanden, beoordeeld door machine learning (vooraf getraind of eigen).", kan: "Voedt auto-labeling en DLP.", niet: "Alleen onversleutelde items. Eigen classifiers alleen Engelstalig. Niet bruikbaar in de DLP-locatie Microsoft 365 Copilot." },
      design: (st) => { const n = ArchUtil.sits(st, "classifier"); return n ? { state: "on", text: ArchUtil.n(n, "classifier", "classifiers") } : { state: "off", text: "Niet gebruikt" }; },
    },
    {
      id: "cls-ai", col: "cls", grp: "engines", layers: ["classify", "ai"], tier: "addon", lic: [], icon: "sparkle", route: "", learn: "rm560708", status: "roadmap",
      scope: { src: ["src-files", "src-copilot"] }, excl: ["lab-client", "pro-dlp"],
      name: "AI classifiers (semantic)", nl: "Begrijpt de betekenis van prompts en bronnen",
      uitleg: "Aangekondigd: semantische herkenning voor prompts en bestanden die Copilot gebruikt. Alleen voor service-side auto-labeling.",
      roadmap: "Op de Microsoft 365-roadmap (ID 560708); niet algemeen beschikbaar. Licentie nog niet bekend; controleer de roadmap.",
      tech: { ziet: "Prompts en bestanden die Copilot gebruikt voor een antwoord.", kan: "Semantische classificatie, als aanvulling op informatietypen.", niet: "Niet voor client-side auto-labeling of algemene DLP." },
    },
    {
      id: "cls-ondemand", col: "cls", layers: ["classify"], tier: "addon", lic: "payg", icon: "search", route: "", learn: "onDemand", excl: ["lab-client"], plate: "keten",
      name: "On-demand classification", nl: "Bestaande data achteraf scannen",
      uitleg: "Scant op aanvraag bestaande bestanden die nog nooit zijn geclassificeerd. Je betaalt per gescand item (pay-as-you-go), bovenop de normale licentie.",
      tech: { ziet: "Oudere bestanden in rust in SharePoint, OneDrive en op Windows-apparaten.", kan: "Classificeert met de huidige classifiers. Service-side auto-labeling kan de nieuwe resultaten daarna gebruiken.", niet: "Zet zelf geen labels en start nooit client-side labeling in Office." },
      design: () => ({ state: "na", text: "Optioneel, na de uitrol" }),
    },
    {
      id: "cls-unified", col: "cls", layers: ["classify"], tier: "addon", lic: [], icon: "grid", route: "", learn: "rm570844", status: "roadmap", note: true,
      name: "Unified classification management", nl: "Alle classifiers op één plek beheren",
      uitleg: "Aangekondigd: één plek om informatietypen, EDM, fingerprints en trainable classifiers te vinden, maken, testen en beheren. Beheert classifiers; het is zelf geen classifier.",
      roadmap: "Op de Microsoft 365-roadmap (ID 570844). Gepland: preview september 2026, algemeen beschikbaar november 2026; controleer de roadmap.",
      tech: { ziet: "Alle classifiers in Purview.", kan: "Ontdekken, maken, valideren en beheren op één plek.", niet: "Verder gedrag is nog niet gedocumenteerd." },
    },

    /* ---------- 3 Labeling ---------- */
    {
      id: "lab-policy", col: "lab", layers: ["label"], tier: "e3", lic: "e3", icon: "users", route: "policies", learn: "labelsCreate", scope: { src: ["src-files", "src-mail", "src-teams"] },
      name: "Label policies", nl: "Wie welke labels krijgt, standaardlabel",
      uitleg: "Publiceert labels aan medewerkers. Hier stel je ook een standaardlabel, verplicht labelen en motivatie bij verlagen in.",
      tech: { ziet: "Nieuwe inhoud zonder label.", kan: "Zet een standaardlabel uit het beleid. Overschrijft nooit een bestaand label.", niet: "Labels moeten aan minstens één gebruiker zijn gepubliceerd. Een bovenliggend label (parent) kan nooit worden toegepast." },
      design: (st) => {
        const ps = st.labelPolicies || [], s = ps.map((p) => p.settings || {});
        const x = [s.some((o) => o.defaultDocs) && "standaardlabel", s.some((o) => o.mandatoryDocs || o.mandatoryEmail) && "verplicht", s.some((o) => o.justification) && "motivatie"].filter(Boolean);
        return applicableLabels(st).length ? { state: "on", text: `${ArchUtil.n(ps.length, "beleid", "beleidsregels")}${x.length ? " · " + x.join(", ") : ""}` } : { state: "todo", text: "Eerst labels maken" };
      },
    },
    {
      id: "lab-manual", col: "lab", layers: ["label"], tier: "e3", lic: "e3", icon: "edit", route: "labels", learn: "labelsOffice", scope: { src: ["src-files", "src-mail"] },
      name: "Manual labeling", nl: "De gebruiker kiest of wijzigt het label",
      uitleg: "De gebruiker kiest zelf een label in Office, Outlook of SharePoint, of past een voorgesteld label aan.",
      tech: { ziet: "De keuze van de gebruiker, ook het overschrijven van een eerder label.", kan: "Legt het label vast als keuze in de metadata van het item.", niet: "Valt onder de labelprioriteit. Een handmatig label heeft voorrang, behalve als een service-side regel is ingesteld om lagere labels te overschrijven." },
      design: (st) => (applicableLabels(st).length ? { state: "on", text: "Altijd mogelijk" } : { state: "todo", text: "Eerst labels maken" }),
    },
    {
      id: "lab-client", col: "lab", layers: ["label", "classify"], tier: "e5", lic: "e5ip", icon: "bulb", route: "autolabel", learn: "labelsAuto", scope: { src: ["src-files", "src-mail"] },
      name: "Client-side auto-labeling", nl: "Office stelt een label voor tijdens het werken",
      uitleg: "Word, Excel, PowerPoint en Outlook herkennen gevoelige inhoud en raden een label aan of passen het toe. Zowel aanbevelen als automatisch toepassen vereist E5.",
      tech: { ziet: "Inhoud in Office-apps terwijl de gebruiker werkt.", kan: "Label aanbevelen of automatisch toepassen, op basis van informatietypen, EDM, named entities en trainable classifiers.", niet: "Afhankelijk van de app-versie. Geen pdf, geen simulatie en geen labeling van binnenkomende e-mail." },
      design: (st) => { const n = ArchUtil.labels(st, (l) => l.cfg.autolabel.client.mode !== "off"); return n ? { state: "on", text: ArchUtil.n(n, "label", "labels") } : { state: "off", text: "Niet gebruikt" }; },
    },
    {
      id: "lab-service", col: "lab", layers: ["label", "classify"], tier: "e5", lic: "e5ip", icon: "wand", route: "autolabel", learn: "labelsAuto", scope: { src: ["src-files", "src-mail"] },
      name: "Service-side auto-labeling", nl: "Labelt bestanden en e-mail op de achtergrond",
      uitleg: "Labelt bestaande bestanden in SharePoint en OneDrive en e-mail onderweg, zonder dat de gebruiker iets doet. Eerst in simulatie.",
      tech: { ziet: "Bestanden in rust in SharePoint en OneDrive, e-mail onderweg via Exchange, en de resultaten van classifiers.", kan: "Labelt in de service, los van de app-versie. Draait eerst in simulatie en kan een lager handmatig label overschrijven als dat is ingesteld.", niet: "Geen e-mail die al in de mailbox staat. Bij een bijlage krijgt de e-mail het label. Zet geen markering (koptekst, watermerk) en kan geen label aanbevelen." },
      prereq: ["Sensitivity labels ingeschakeld voor Office-bestanden in SharePoint en OneDrive", "Pdf-ondersteuning apart ingeschakeld", "Audit aan (nodig voor simulatie)", "Labels gepubliceerd aan minstens één gebruiker", "Labelbereik bevat Files en/of Emails"],
      design: (st) => { const n = ArchUtil.labels(st, (l) => l.cfg.autolabel.service.enabled); return n ? { state: "on", text: ArchUtil.n(n, "label", "labels") } : { state: "off", text: "Niet gebruikt" }; },
    },
    {
      id: "lab-library", col: "lab", layers: ["label"], tier: "e5", lic: "e5ip", icon: "folder", route: "autolabel", learn: "labelsDefaultLibrary", scope: { src: ["src-files"] },
      name: "Default label for a library", nl: "Standaardlabel per SharePoint-bibliotheek",
      uitleg: "Een bibliotheek krijgt een standaardlabel. Nieuwe en bewerkte bestanden krijgen dat label, zonder naar de inhoud te kijken.",
      tech: { ziet: "De locatie (bibliotheek), niet de inhoud.", kan: "Zet het standaardlabel op nieuwe of bewerkte bestanden en kan een lager label vervangen.", niet: "Alleen SharePoint. Bestanden die er al staan krijgen het label nog niet (zie Auto-labeling op schaal)." },
      design: () => ({ state: "na", text: "Optioneel per bibliotheek" }),
    },
    {
      id: "lab-scale", col: "lab", grp: "scale", layers: ["label"], tier: "e5", lic: "e5ip", icon: "layers", route: "autolabel", learn: "rm567890", status: "preview",
      name: "Auto-labeling at scale", nl: "Meer capaciteit en betere rapportage",
      uitleg: "Vier verbeteringen in public preview die samen zijn uitgebracht. Ze helpen bestaande data sneller te labelen, bijvoorbeeld als voorbereiding op Copilot.",
      items: [
        ["Capaciteit SharePoint/OneDrive", "Tot 500.000 bestanden per dag (was 100.000); een beleid blijft aan tijdens bewerken.", "rm567890"],
        ["Schaal, beheer en rapportage", "Simulatie tot 20 miljoen items, grotere bereiken, overzicht per dag.", "rm570445"],
        ["Dekkingsrapport per beleid", "Vergelijkt afdwingen met de laatste simulatie.", "rm568935"],
        ["Bibliotheeklabel voor bestaande data", "Zet het standaardlabel van een bibliotheek ook op bestanden die er al staan.", "rm559105"],
      ],
      roadmap: "Public preview vanaf september 2026, algemeen beschikbaar gepland in oktober 2026. Controleer de roadmap.",
      tech: { ziet: "Service-side auto-labeling en bibliotheeklabels.", kan: "Meer bestanden per dag, grotere simulaties en betere rapportage.", niet: "Bestaande beleidsregels blijven werken; gebruikers merken niets." },
    },
    {
      id: "lab-taxonomy", col: "lab", layers: ["label"], tier: "e3", lic: "e3", icon: "tag", route: "schema", learn: "labels", hub: true, plate: "label",
      scope: { src: ["src-files", "src-mail", "src-devices", "src-teams"] },
      name: "Sensitivity labels", nl: "Het label draagt de bescherming",
      uitleg: "Hoe het label er ook op kwam: het label bepaalt de bescherming. Elk label is een niveau uit jullie classificatieschema; de volgorde bepaalt de prioriteit.",
      tech: { ziet: "Het label in de metadata van een item, gezet door een van de labelmethodes.", kan: "Draagt de bescherming (versleuteling, toegang, markering, DLP-voorwaarde) en reist mee met het item.", niet: "Eén sensitivity label per item; de prioriteit beslist. Geen label op Teams-chatberichten of prompts." },
      priority: "Een handmatig label heeft voorrang, behalve als een service-side regel lagere labels mag overschrijven. Automatische methodes en standaardlabels volgen de labelvolgorde.",
      design: (st) => { const n = applicableLabels(st).length; return n ? { state: "on", text: ArchUtil.n(n, "label", "labels") } : { state: "todo", text: "Nog geen labels" }; },
    },
    {
      id: "lab-copilot", col: "lab", layers: ["label", "ai"], tier: "addon", lic: "copilot", icon: "sparkle", route: "copilot", learn: "labelsCopilot", plate: "copilot",
      scope: { src: ["src-copilot", "src-files", "src-mail"] },
      name: "Label inheritance (Copilot)", nl: "Nieuwe inhoud erft het hoogste label",
      uitleg: "Maakt Copilot iets nieuws op basis van gelabelde bronnen, dan krijgt het resultaat het label met de hoogste prioriteit.",
      tech: { ziet: "De labels van de items die Copilot gebruikte.", kan: "Geeft nieuwe inhoud het label met de hoogste prioriteit, zodat bescherming niet verloren gaat.", niet: "Versleuteling zonder label wordt niet overgeërfd. Voor versleutelde bronnen heeft de gebruiker naast VIEW ook EXTRACT nodig." },
      design: (st) => (applicableLabels(st).length ? { state: "on", text: "Werkt automatisch met jullie labels" } : { state: "todo", text: "Eerst labels maken" }),
    },

    /* ---------- 4 Bescherming ---------- */
    {
      id: "pro-marking", col: "pro", layers: ["label", "protect"], tier: "e3", lic: "e3", icon: "watermark", route: "labels", learn: "labelsOffice", plate: "label",
      name: "Content marking", nl: "Koptekst, voettekst en watermerk",
      uitleg: "Maakt het label zichtbaar in het document zelf. Een watermerk verschijnt in Word, Excel en PowerPoint, niet in e-mail.",
      tech: { ziet: "Het label op een document of e-mail.", kan: "Koptekst en voettekst in Word, Excel, PowerPoint en Outlook; watermerk in Word, Excel en PowerPoint.", niet: "Geen watermerk in Outlook. Auto-labeling in de service zet geen markering op documenten." },
      design: (st) => { const n = ArchUtil.labels(st, (l) => { const m = l.cfg.marking; return m.header.enabled || m.footer.enabled || m.watermark.enabled; }); return n ? { state: "on", text: ArchUtil.n(n, "label", "labels") } : { state: "off", text: "Geen markering" }; },
    },
    {
      id: "pro-encrypt", col: "pro", layers: ["protect", "label", "ai"], tier: "e3", lic: "e3", icon: "lock", route: "labels", learn: "labelsEncryption", plate: "label",
      name: "Encryption & usage rights", nl: "Alleen bevoegden kunnen openen",
      uitleg: "Versleuteling reist mee met het bestand. Rechten bepalen wat iemand mag: lezen, wijzigen, afdrukken of kopiëren. Zonder ‘kopiëren’ (EXTRACT) vat Copilot het bestand niet samen.",
      tech: { ziet: "Gelabelde inhoud en de rechten per gebruiker.", kan: "Versleutelt en dwingt rechten af, waar het item ook naartoe gaat.", niet: "AI-apps hebben naast VIEW ook EXTRACT nodig om versleutelde inhoud te gebruiken." },
      design: (st) => { const n = ArchUtil.labels(st, (l) => ["assignNow", "userDefined"].includes(l.cfg.encryption.mode)); return n ? { state: "on", text: ArchUtil.n(n, "label", "labels") } : { state: "off", text: "Geen versleuteling" }; },
    },
    {
      id: "pro-dke", col: "pro", layers: ["protect"], tier: "e5", lic: "dke", icon: "key", route: "labels", learn: "dke",
      name: "Double Key Encryption", nl: "Eigen sleutel voor het allergeheimste",
      uitleg: "Jullie houden een tweede sleutel zelf in beheer; ook Microsoft kan dan niet bij de inhoud. Copilot kan deze bestanden niet gebruiken. Alleen voor een klein deel van de data.",
      tech: { ziet: "Items met een DKE-label.", kan: "Inhoud is alleen te openen met beide sleutels.", niet: "Copilot gebruikt of noemt deze items niet. Geen co-authoring." },
      design: (st) => { const n = ArchUtil.labels(st, (l) => l.cfg.encryption.dke); return n ? { state: "on", text: ArchUtil.n(n, "label", "labels") } : { state: "off", text: "Niet gebruikt" }; },
    },
    {
      id: "pro-container", col: "pro", layers: ["protect", "label"], tier: "e3", lic: "e3", icon: "site", route: "labels", learn: "labelsContainers",
      name: "Permissions & access", nl: "Labels op teams, groepen en sites",
      uitleg: "Een label op een team of site bepaalt privacy, gasttoegang, extern delen en toegang vanaf onbeheerde apparaten. Toegang via Conditional Access (authentication context) vereist E5.",
      tech: { ziet: "Wie toegang vraagt en tot welke container.", kan: "Toegang geldt altijd eerst: wie geen recht heeft, komt niet bij het item. Copilot en agents respecteren dat.", niet: "Een containerlabel labelt niet automatisch de bestanden in die site." },
      design: (st) => { const n = ArchUtil.labels(st, (l) => l.cfg.scope.sites); if (!n) return { state: "off", text: "Geen site-labels" }; return ArchUtil.check(st, "containers") === "done" ? { state: "on", text: ArchUtil.n(n, "label", "labels") } : { state: "todo", text: `${ArchUtil.n(n, "label", "labels")} · nog inschakelen` }; },
    },
    {
      id: "pro-dlp", col: "pro", layers: ["dlp"], tier: "e3", lic: "e3", icon: "shield", route: "dlp", learn: "dlp", plate: "locaties",
      scope: { src: ["src-mail", "src-files", "src-teams", "src-devices", "src-other"] },
      name: "Data loss prevention", nl: "Waarschuwen of blokkeren bij delen",
      uitleg: "DLP kijkt naar label én inhoud en kan een policy tip tonen, blokkeren of laten overschrijven met een reden. Voor e-mail, SharePoint en OneDrive doorgaans E3; Teams en apparaten doorgaans E5 (controleer licentie).",
      tech: { ziet: "Inhoud en classificatie in Exchange, SharePoint, OneDrive, Teams en op apparaten.", kan: "Dwingt acties af, ook op apparaten: USB, netwerkshare, afdrukken, klembord, upload, Bluetooth en RDP.", niet: "Op apparaten moeten gebruiker én apparaat in het bereik vallen." },
      conditions: ["Inhoud: informatietypen en trainable classifiers", "Bedoeling: sensitivity labels en retention labels", "Teams-chat: alleen informatietypen, geen labels", "Microsoft 365 Copilot: labels; informatietypen in prompts (preview)", "Meerdere locaties in één beleid: een ‘nee’ wint, dus Teams toevoegen haalt labelvoorwaarden weg"],
      design: (st) => { const n = ["exchange", "sharing", "teams", "endpoint"].reduce((a, d) => a + ArchUtil.rules(st, d), 0); return n ? { state: "on", text: `${ArchUtil.n(n, "regel", "regels")} · ${ArchUtil.mode(st, "exchange")}` } : { state: "off", text: "Nog geen DLP" }; },
    },
    {
      id: "pro-dlp-copilot", col: "pro", layers: ["dlp", "ai"], tier: "addon", lic: "copilot", icon: "sparkle", route: "copilot", learn: "dlpCopilot", plate: "copilot",
      scope: { src: ["src-copilot", "src-files", "src-mail"] },
      name: "DLP for Copilot", nl: "Gevoelige items en prompts weghouden bij Copilot",
      uitleg: "Items met bepaalde labels kun je uitsluiten van Copilot-antwoorden; ze kunnen wel als bron verschijnen. Prompts met gevoelige informatietypen kun je blokkeren. Eigen policy (niet te combineren met andere locaties), zonder trainable classifiers. Licentie: afhankelijk van plan; controleer.",
      preview: "Prompts met gevoelige gegevens blokkeren is in preview.",
      tech: { ziet: "Bestanden en e-mail met bepaalde labels, en prompts met informatietypen.", kan: "Verwerking van gelabelde items beperken, prompts met informatietypen blokkeren en zoeken op het web als bron uitschakelen.", niet: "Eén regel kan labels en informatietypen niet combineren. Een bestand dat in de prompt wordt geüpload, wordt niet beoordeeld. Wijzigingen kunnen tot vier uur duren." },
      design: (st) => (ArchUtil.rules(st, "copilot") ? { state: "on", text: "Regels in ontwerp" } : { state: "off", text: "Niet gebruikt" }),
    },
    {
      id: "oos-retention", col: "pro", layers: ["label"], tier: "e3", lic: "e3", icon: "clock", route: "", learn: "retention", out: true,
      name: "Data Lifecycle Management", nl: "Bewaren en verwijderen (retentie)",
      uitleg: "Bepaalt hoe lang iets bewaard blijft. Retention labels zijn een ander soort label dan sensitivity labels en vallen buiten deze workshop. Automatisch toepassen vereist E5.",
      tech: { ziet: "Inhoud met een retentiebeleid of retention label.", kan: "Retentie voor Exchange, SharePoint, OneDrive, Teams en Viva Engage.", niet: "Buiten de scope van deze workshop." },
    },

    /* ---------- 5 Inzicht ---------- */
    {
      id: "ins-dspm", col: "ins", layers: ["monitor", "ai"], tier: "e5", lic: "e5", icon: "target", route: "copilot", learn: "dspm",
      name: "Data Security Posture Management", nl: "Overzicht van datarisico’s, ook voor AI",
      uitleg: "Eén dashboard met risico’s rond gevoelige data en AI-gebruik, met aanbevolen beleid. Enkele onderdelen zijn nog in preview.",
      tech: { ziet: "Gevoelige data, wie erbij kan, hoe die wordt gebruikt en of die voldoende is beschermd.", kan: "Toont overdeling en blootstelling, volgt de stand in de tijd en stelt beleid voor.", niet: "Copilot-monitoring vereist ook audit en een Copilot-licentie." },
      design: (st) => (ArchUtil.check(st, "copilot") === "done" ? { state: "on", text: "Ingericht" } : { state: "na", text: "Aanrader bij Copilot" }),
    },
    {
      id: "ins-explorer", col: "ins", layers: ["monitor", "classify"], tier: "e5", lic: "e5ip", icon: "chart", route: "tenant", learn: "explorers",
      name: "Content & Activity explorer", nl: "Waar staat gevoelige data, wat gebeurt ermee?",
      uitleg: "Laat zien waar gelabelde en gevoelige items staan en wat ermee gebeurt (labelen, delen, kopiëren). De volledige weergave vereist E5. Werkt alleen met audit aan.",
      tech: { ziet: "Content explorer: items met een label of informatietype. Activity explorer: activiteiten, zoals label gezet, gewijzigd of verwijderd.", kan: "Laat zien waar gevoelige inhoud staat en wat ermee gebeurde, inclusief de reden bij een verlaagd label.", niet: "Activity explorer is niet realtime en toont maximaal 30 dagen." },
      design: (st) => (ArchUtil.check(st, "audit") === "done" ? { state: "on", text: "Audit staat aan" } : { state: "todo", text: "Audit nog aanzetten" }),
    },
    {
      id: "ins-audit", col: "ins", layers: ["monitor", "ai"], tier: "e3", lic: "e3", icon: "clipboard", route: "tenant", learn: "auditSolutions",
      name: "Audit", nl: "Wie deed wat, wanneer?",
      uitleg: "Audit (Standard, E3) bewaart activiteiten 180 dagen, inclusief Copilot-gebruik. Audit (Premium, E5) bewaart standaard een jaar.",
      tech: { ziet: "Gebeurtenissen in de hele tenant, ook Copilot-prompts en -antwoorden.", kan: "Elke beschermingsmaatregel schrijft naar de unified audit log.", niet: "Langer dan 180 dagen bewaren vereist Audit (Premium); tien jaar vereist een add-on." },
      design: (st) => (ArchUtil.check(st, "audit") === "done" ? { state: "on", text: "Aan" } : { state: "todo", text: "Nog aanzetten" }),
    },
    {
      id: "ins-alerts", col: "ins", layers: ["dlp", "monitor"], tier: "e3", lic: "e3", icon: "bell", route: "dlp", learn: "dlpAlerts",
      name: "DLP alerts", nl: "Meldingen voor security bij overtredingen",
      uitleg: "Een overtreding kan een melding voor het securityteam geven. De licentie hangt af van de locatie: e-mail en SharePoint met E3, Teams en apparaten met E5.",
      tech: { ziet: "DLP-matches over alle locaties.", kan: "Meldingen, triage en onderzoek.", niet: "Hoe lang een melding zichtbaar blijft, hangt af van de auditretentie." },
      design: (st) => { const n = ArchUtil.labels(st, (l) => l.cfg.notify && l.cfg.notify.alert && l.cfg.notify.alert !== "none"); return n ? { state: "on", text: ArchUtil.n(n, "label met alert", "labels met alert") } : { state: "off", text: "Geen alerts" }; },
    },
    {
      id: "ins-sim", col: "ins", layers: ["dlp", "monitor"], tier: "e3", lic: "e3", icon: "flask", route: "dlp", learn: "dlpSimulation",
      name: "Simulation & policy tips", nl: "Eerst meten, dan pas blokkeren",
      uitleg: "Een nieuw beleid draait eerst in simulatie: je ziet wat er zou gebeuren, medewerkers merken niets. Daarna eventueel alleen policy tips, en pas dan blokkeren.",
      tech: { ziet: "Wat een beleid zou doen.", kan: "Matches tonen zonder in te grijpen; daarna alleen policy tips.", niet: "Client-side auto-labeling heeft geen simulatie." },
      design: (st) => ({ state: "on", text: `Standaard: ${ArchUtil.mode(st, "exchange")}` }),
    },
    {
      id: "oos-irm", col: "ins", layers: ["monitor", "dlp"], tier: "e5", lic: "e5", icon: "user", route: "", learn: "adaptiveProtection", out: true,
      name: "Insider Risk & Adaptive Protection", nl: "Strengere DLP voor risicovolle gebruikers",
      uitleg: "Insider Risk Management bepaalt een risiconiveau per gebruiker. Adaptive Protection maakt DLP dan automatisch strenger. Valt buiten deze workshop.",
      tech: { ziet: "Risicosignalen per gebruiker, zoals labelactiviteit.", kan: "Policy tip bij laag risico, blokkeren bij verhoogd risico. Stuurt DLP, retentie en Conditional Access.", niet: "Adaptive Protection voor DLP werkt voor Exchange, Teams en apparaten. IRM meldt ook risico’s buiten deze plaat." },
    },
  ],
};
