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
  verified: "29 oktober 2026",
  /* Kolommen = de vijf fasen uit de Microsoft-referentie (zelfde volgorde en vraag per fase). */
  cols: [
    { id: "src", name: "Gebruikers\u00adinvoer", q: "Waar ontstaat informatie?", sub: "Inhoud die mensen maken, uploaden, versturen of typen", icon: "cloud" },
    { id: "cls", name: "Informatie wordt geclassificeerd", q: "Wat is het?", sub: "De service herkent wat erin staat", icon: "search" },
    { id: "lab", name: "Bestanden labelen", q: "Wat is de standaardbeveiliging en wat bedoelde de gebruiker?", sub: "Optioneel maar blijvend: het label legt de bedoeling vast en stuurt de bescherming", icon: "tag" },
    { id: "pro", name: "Bescherming", q: "Wat doen we eraan?", sub: "DLP, versleuteling, toegang en retentie dwingen het af", icon: "shield" },
    { id: "ins", name: "Inzicht", q: "Wat hebben we geleerd?", sub: "Posture, audit en meldingen", icon: "chart" },
  ],
  groups: { engines: "Classifierlagen", scale: "Auto-labeling: standaardbeveiliging (preview)" },
  /* Lagen ("Isoleer laag") zoals in de referentie: cover = de inhoudsobjecten die een laag raakt, met de bewuste asymmetrie. */
  layers: [
    { id: "label", name: "Sensitivity label", cover: ["src-files", "src-transit", "src-devices", "src-mail"], note: "Een prompt en een Teams-chatbericht krijgen zelf geen label. Bestanden (ook als bijlage of op een apparaat) en e-mail wel." },
    { id: "encryption", name: "Encryption / usage rights", cover: ["src-files", "src-transit", "src-devices", "src-mail"], note: "Versleuteling reist mee met bestanden en e-mail. Een prompt of chatbericht draagt geen label en dus geen labelversleuteling." },
    { id: "sit", name: "Sensitive information types", cover: ["src-copilot", "src-files", "src-transit", "src-devices", "src-teams", "src-mail"], note: "Informatietypen herkennen inhoud overal, ook de tekst van chat, e-mail en prompts. Of EDM en named entities prompttekst beoordelen, is niet gedocumenteerd." },
    { id: "classifiers", name: "Classifiers (trainable / fingerprint / AI)", cover: ["src-copilot", "src-files", "src-transit", "src-devices", "src-teams", "src-mail"], note: "Fingerprinting en trainable classifiers beoordelen het bestand, ook als bijlage of gedeeld in Teams. Of ze ook de tekst van een chat of e-mail beoordelen, is niet gedocumenteerd. AI classifiers staan op de roadmap." },
    { id: "dlp", name: "DLP policy evaluation", cover: ["src-copilot", "src-files", "src-transit", "src-devices", "src-teams", "src-mail"], note: "Voorwaarden verschillen per locatie: Teams-chat alleen informatietypen, de Copilot-locatie labels en informatietypen in de prompttekst." },
    { id: "permissions", name: "Permissions / access", cover: ["src-files", "src-transit", "src-devices", "src-mail"], note: "Toegang gaat altijd voor: wie geen recht heeft op een item, krijgt het niet te zien, ook niet via Copilot." },
    { id: "retention", name: "Retention (DLM)", cover: ["src-files", "src-transit", "src-teams", "src-mail"], note: "Retentie geldt hier voor bestanden in Microsoft 365, e-mail en Teams-berichten, niet voor bestanden op apparaten." },
    { id: "audit", name: "Audit & activity", cover: ["src-copilot", "src-files", "src-transit", "src-devices", "src-teams", "src-mail"], note: "Audit en activiteit leggen gebeurtenissen over items vast (signalen), niet de inhoud zelf." },
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
  /* [van, naar, soort]: één-op-één de verbindingen uit de Microsoft-referentie. */
  edges: [
    /* Gebruikersinvoer -> classificatie */
    ["src-copilot", "cls-auto", "auto"], ["src-files", "cls-auto", "auto"], ["src-teams", "cls-auto", "auto"], ["src-transit", "cls-auto", "auto"], ["src-devices", "cls-auto", "auto"], ["src-mail", "cls-auto", "auto"],
    ["src-files", "cls-ondemand", "demand"], ["src-devices", "cls-ondemand", "demand"],
    ["cls-auto", "cls-sit", "auto"], ["cls-auto", "cls-edm", "auto"], ["cls-auto", "cls-ne", "auto"], ["cls-auto", "cls-fp", "auto"], ["cls-auto", "cls-tc", "auto"], ["cls-auto", "cls-ai", "auto"],
    ["cls-ondemand", "cls-sit", "demand"], ["cls-ondemand", "cls-edm", "demand"], ["cls-ondemand", "cls-ne", "demand"], ["cls-ondemand", "cls-fp", "demand"], ["cls-ondemand", "cls-tc", "demand"], ["cls-ondemand", "cls-ai", "demand"],
    /* Classificatie -> auto-labeling (fingerprinting voedt geen labeling; AI classifiers alleen service-side) */
    ["cls-sit", "lab-client", "auto"], ["cls-edm", "lab-client", "auto"], ["cls-edm", "lab-service", "auto"], ["cls-ne", "lab-service", "auto"], ["cls-ne", "lab-client", "auto"],
    ["cls-sit", "lab-service", "auto"], ["cls-tc", "lab-service", "auto"], ["cls-tc", "lab-client", "auto"], ["cls-ai", "lab-service", "auto"],
    ["cls-ondemand", "lab-service", "demand"],
    /* Classificatie -> DLP */
    ["cls-sit", "pro-dlp", "auto"], ["cls-sit", "pro-dlp-copilot", "auto"], ["cls-edm", "pro-dlp", "auto"], ["cls-ne", "pro-dlp", "auto"], ["cls-fp", "pro-dlp", "auto"], ["cls-tc", "pro-dlp", "auto"],
    /* Auto-labeling op schaal: verbeteringen aan service-side auto-labeling */
    ["lab-service", "lab-scale", "auto"], ["lab-service", "lab-scale-mgmt", "auto"], ["lab-service", "lab-scale-report", "auto"], ["lab-service", "lab-scale-library", "auto"],
    ["lab-library", "lab-scale-library", "auto"],
    /* Elke labelmethode levert een label en een gelogde activiteit */
    ["lab-manual", "lab-taxonomy", "auto"], ["lab-policy", "lab-taxonomy", "auto"], ["lab-client", "lab-taxonomy", "auto"], ["lab-library", "lab-taxonomy", "auto"], ["lab-service", "lab-taxonomy", "auto"],
    ["lab-manual", "lab-activity", "auto"], ["lab-policy", "lab-activity", "auto"], ["lab-client", "lab-activity", "auto"], ["lab-library", "lab-activity", "auto"], ["lab-service", "lab-activity", "auto"],
    ["lab-activity", "ins-audit", "signal"], ["lab-activity", "ins-explorer", "signal"],
    /* Het label draagt de bescherming */
    ["lab-taxonomy", "pro-dlp", "auto"], ["lab-taxonomy", "pro-encrypt", "auto"], ["lab-taxonomy", "lab-copilot", "auto"], ["lab-taxonomy", "pro-dlp-copilot", "auto"], ["lab-taxonomy", "pro-container", "auto"], ["lab-taxonomy", "oos-retention", "auto"],
    /* Bescherming -> inzicht (signalen) */
    ["pro-dlp", "ins-alerts", "signal"], ["pro-dlp-copilot", "ins-alerts", "signal"], ["pro-dlp", "ins-explorer", "signal"], ["pro-dlp", "ins-dspm", "signal"],
    ["pro-dlp-copilot", "ins-explorer", "signal"], ["pro-dlp-copilot", "ins-dspm", "signal"], ["pro-container", "ins-dspm", "signal"],
    ["pro-encrypt", "ins-audit", "signal"], ["lab-copilot", "ins-audit", "signal"],
    ["pro-dlp", "ins-audit", "signal"], ["pro-dlp-copilot", "ins-audit", "signal"], ["pro-container", "ins-audit", "signal"], ["oos-retention", "ins-audit", "signal"], ["pro-adaptive", "ins-audit", "signal"],
    ["pro-adaptive", "pro-dlp", "auto"], ["pro-adaptive", "oos-retention", "auto"],
    ["lab-activity", "oos-irm", "signal"], ["pro-adaptive", "oos-irm", "signal"],
    ["oos-retention", "ins-explorer", "signal"],
  ],
  /* Buiten Microsoft 365 gelden andere voorwaarden (scope-notitie uit het origineel). */
  scope: {
    lead: "Deze plaat beschrijft alleen Microsoft 365: SharePoint, OneDrive, Exchange, Teams, Microsoft 365 Copilot en onboarded Windows- en macOS-apparaten.",
    out: ["Netwerkshares en SharePoint Server via de Information Protection scanner", "Cloud-apps buiten Microsoft 365, ook via Defender for Cloud Apps", "Bronnen van derden en multicloud via Microsoft Purview Data Map"],
  },
  /* Rondleidingen: elke stap verwijst naar een blok-id; why = één zin op de startkaart; sum = samenvatting na de laatste stap. Gecontroleerd op Microsoft Learn (oktober 2026). */
  paths: [
    {
      id: "verschil", name: "Classificatie of label?", icon: "question", why: "De meest gestelde vraag: wat herkent Purview zelf en wat legt een label vast?",
      sum: "Classificatie stelt vast wat erin staat; een label legt vast hoe gevoelig het is. Auto-labeling verbindt die twee, het label draagt de bescherming en DLP gebruikt allebei.",
      steps: [
        ["cls-sit", "Classificatie herkent wát er in de inhoud staat, bijvoorbeeld een BSN of IBAN. Dat wordt niet op het item vastgelegd."],
        ["lab-taxonomy", "Een label is een vastgelegde keuze over hoe gevoelig iets is. Het staat in de metadata van het bestand of de e-mail en reist mee."],
        ["lab-client", "De brug tussen die twee: op basis van classificatie kan Office een label voorstellen of automatisch toepassen. De service kan dat ook op de achtergrond."],
        ["pro-encrypt", "Het label draagt de bescherming: versleuteling en gebruiksrechten reizen mee met het bestand, ook buiten de organisatie."],
        ["pro-dlp", "DLP gebruikt allebei: het label én de herkende gegevens. In Teams-chat kan DLP alleen naar de herkende gegevens kijken."],
      ],
    },
    {
      id: "classificeren", name: "Wanneer wordt informatie geclassificeerd?", icon: "search", why: "Wanneer Purview inhoud herkent, ook bij oudere bestanden.",
      sum: "Nieuwe en gewijzigde inhoud wordt vanzelf geclassificeerd en DLP handelt op het resultaat. Oudere data die nooit of lang niet is gescand, laat je op aanvraag classificeren; service-side auto-labeling kan die resultaten daarna gebruiken.",
      steps: [
        ["cls-auto", "Automatisch: Purview classificeert inhoud zodra die wordt gemaakt, geüpload of gewijzigd."],
        ["cls-sit", "De classifierlagen bepalen wat erin staat. De breedste zijn informatietypen zoals BSN of IBAN; daarnaast EDM, named entities, fingerprints en trainable classifiers."],
        ["pro-dlp", "DLP gebruikt die classificatie bij de volgende actie, zoals delen, verzenden of kopiëren."],
        ["cls-ondemand", "Op aanvraag: een beheerder laat oudere bestanden in SharePoint, OneDrive of op Windows-apparaten scannen die nooit of lang niet zijn geclassificeerd. Kosten via pay-as-you-go; controleer jullie plan."],
        ["lab-service", "Service-side auto-labeling kan de vernieuwde resultaten gebruiken. On-demand classification labelt zelf niets."],
      ],
    },
    {
      id: "wanneer", name: "Wanneer wordt iets gelabeld?", icon: "clock", why: "Alle momenten waarop een label op een bestand of e-mail komt.",
      sum: "Een label komt erop als standaardlabel, tijdens het werken, bij opslaan in een bibliotheek, op de achtergrond of door de gebruiker. Nieuwe Copilot-inhoud erft het label met de hoogste prioriteit. Hoe het label er ook op komt: de bescherming is dezelfde.",
      steps: [
        ["lab-policy", "Als er nog geen label is: het labelbeleid kan een standaardlabel zetten of de gebruiker verplichten zelf een label te kiezen."],
        ["lab-client", "Tijdens het werken: Office herkent gevoelige inhoud en stelt een label voor of past het toe."],
        ["lab-library", "Bij opslaan: een SharePoint-bibliotheek met een standaardlabel geeft nieuwe en bewerkte bestanden dat label."],
        ["lab-service", "Op de achtergrond: de service labelt bestanden in rust in SharePoint en OneDrive en e-mail onderweg. Test eerst in simulatie."],
        ["lab-manual", "Zelf kiezen: de gebruiker kiest of wijzigt het label in Office, Outlook of SharePoint. Een handmatig label heeft voorrang."],
        ["lab-copilot", "Met AI: maakt Copilot nieuwe inhoud op basis van gelabelde bronnen, dan erft die het label met de hoogste prioriteit."],
      ],
    },
    {
      id: "bescherming", name: "Hoe wordt informatie beschermd?", icon: "shield", why: "Van label en classificatie naar versleuteling, toegang en DLP.",
      sum: "Twee routes die elkaar versterken: op inhoud (classificatie naar DLP) en op bedoeling (het label naar DLP, versleuteling en toegang). Security krijgt de meldingen.",
      steps: [
        ["lab-taxonomy", "Het label bepaalt het niveau en daarmee welke bescherming geldt, ook een zichtbare markering zoals een koptekst of watermerk."],
        ["pro-encrypt", "Versleuteling: alleen bevoegden kunnen openen, waar het bestand ook staat."],
        ["pro-container", "Toegang gaat altijd voor. Site- en teamlabels regelen wie erbij mag en of extern delen kan. Bestanden in die site krijgen dat label niet vanzelf."],
        ["pro-dlp", "DLP kijkt naar inhoud én label, en kan waarschuwen of blokkeren bij delen."],
        ["ins-alerts", "Bij een overtreding kan security een melding krijgen."],
      ],
    },
    {
      id: "copilot", name: "Copilot veilig inzetten", icon: "sparkle", why: "Hoe rechten, labels en DLP bepalen wat Copilot gebruikt.",
      sum: "Copilot respecteert rechten en labels. DLP houdt gevoelige items en prompts buiten de antwoorden, nieuwe inhoud erft het label, audit legt prompts en antwoorden vast en DSPM laat de risico’s zien.",
      steps: [
        ["src-copilot", "Copilot gebruikt alleen inhoud die de gebruiker zelf al mag openen. De prompttekst wordt direct gecontroleerd op gevoelige informatietypen."],
        ["pro-dlp-copilot", "DLP for Copilot: bestanden en e-mails met bepaalde labels gebruikt Copilot niet voor een antwoord. Bij gevoelige informatietypen in de prompt kun je zoeken op het web blokkeren of (preview) Copilot helemaal niet laten antwoorden."],
        ["pro-encrypt", "Versleutelde inhoud: zonder het gebruiksrecht EXTRACT naast VIEW geeft Copilot de inhoud niet terug."],
        ["lab-copilot", "Wat Copilot nieuw maakt op basis van gelabelde bronnen, erft het label met de hoogste prioriteit."],
        ["ins-audit", "Audit legt Copilot-prompts en -antwoorden vast in de unified audit log."],
        ["ins-dspm", "DSPM laat zien hoe AI wordt gebruikt, waar gevoelige data wordt overgedeeld en welk beleid helpt."],
      ],
    },
  ],
  blocks: [
    /* ---------- 1 Gebruikersinvoer: inhoudsobjecten (app = Microsoft-productlogo's uit BRAND_ASSETS via msLogo) ---------- */
    {
      id: "src-copilot", col: "src", app: ["copilot"], layers: ["sit", "classifiers", "dlp", "audit"], tier: "e3", lic: "e3", icon: "sparkle", route: "copilot", learn: "copilotConsiderations",
      name: "Prompt (Copilot Chat / Microsoft 365 Copilot)", nl: "Getypte of geplakte tekst, bestand, afbeelding of link",
      uitleg: "Copilot gebruikt alleen inhoud die de gebruiker zelf al mag openen, en respecteert labels en versleuteling. Copilot Chat zit zonder meerprijs in geschikte Microsoft 365-licenties; de Microsoft 365 Copilot-add-on voegt werkdata via Microsoft Graph toe.",
      tech: { ziet: "Wat in de prompt staat: getypte of geplakte tekst, een geüpload bestand, een afbeelding of een link.", kan: "Prompttekst wordt realtime op informatietypen gecontroleerd, zodat DLP for Copilot kan ingrijpen.", niet: "Een prompt is zelf geen gelabeld item: geen labelmethode is van toepassing, ook client-side auto-labeling niet." },
      design: (st) => (ArchUtil.rules(st, "copilot") ? { state: "on", text: "Copilot-regels in ontwerp" } : { state: "off", text: "Geen Copilot-regels" }),
    },
    {
      id: "src-files", col: "src", app: ["sharepoint", "onedrive"], layers: ["label", "encryption", "sit", "classifiers", "dlp", "permissions", "retention", "audit"], tier: "e3", lic: "e3", icon: "folder", route: "dlp", learn: "labelsSpo",
      name: "Files", nl: "OneDrive / SharePoint",
      uitleg: "Bestanden in rust in OneDrive en SharePoint. Classificatie, labels, DLP en retentie werken hierop. Labels moeten eerst voor SharePoint en OneDrive worden ingeschakeld (Randvoorwaarden).",
      tech: { ziet: "Bestanden in rust in OneDrive en SharePoint, in veel bestandsformaten.", kan: "Eén bestand kan tegelijk een label, versleuteling, rechten en retentie hebben; classificatie en DLP beoordelen het.", niet: "Automatisch labelen van bestanden in rust werkt alleen voor ondersteunde Office-bestanden en pdf." },
      design: (st) => (ArchUtil.check(st, "spo") === "done" ? ArchUtil.ruleState(st, "sharing", "delen") : { state: "todo", text: "Labels in SharePoint nog niet ingeschakeld" }),
    },
    {
      id: "src-transit", col: "src", app: ["outlook", "teams"], layers: ["label", "encryption", "sit", "classifiers", "dlp", "permissions", "retention", "audit"], tier: "e3", lic: "e3", icon: "share", route: "dlp", learn: "fingerprint",
      name: "Files in transit", nl: "Bijlagen bij e-mail · bestanden gedeeld in Teams",
      uitleg: "Hetzelfde bestand onderweg: als bijlage in Exchange of gedeeld in een Teams-chat of -kanaal. Label, versleuteling en rechten reizen mee.",
      tech: { ziet: "Een bestand als bijlage bij een e-mail of gedeeld in Teams.", kan: "EDM, document fingerprinting en trainable classifiers beoordelen hier het bestand zelf.", niet: "Hier wordt het bestand beoordeeld, niet de tekst van het bericht of de e-mail waarin het zit." },
      design: (st) => { const n = ArchUtil.rules(st, "exchange") + ArchUtil.rules(st, "teams"); return n ? { state: "on", text: `${ArchUtil.n(n, "regel", "regels")} voor e-mail en Teams` } : { state: "off", text: "Geen DLP voor e-mail of Teams" }; },
    },
    {
      id: "src-devices", col: "src", layers: ["label", "encryption", "sit", "classifiers", "dlp", "permissions", "audit"], tier: "e5", lic: "e5dlp", icon: "laptop", route: "endpoint", learn: "endpoint",
      name: "Files on devices", nl: "Windows- en macOS-apparaten",
      uitleg: "Endpoint DLP ziet wat er met bestanden op een onboarded apparaat gebeurt: kopiëren naar USB, afdrukken, uploaden of plakken in een browser.",
      tech: { ziet: "Bestanden op onboarded Windows 10/11-, Windows Server 2019+- en macOS-apparaten (drie nieuwste versies).", kan: "Scant bij maken of wijzigen op informatietypen en labels. Bewaakt onder meer USB, netwerkshare, afdrukken, klembord, upload, Bluetooth en RDP. Met Advanced classification ook fingerprinting, EDM en trainable classifiers op macOS.", niet: "Data die nooit als bestand is opgeslagen, wordt niet gescand. Een label van een andere tenant wordt niet herkend. Programmabestanden (.exe, .dll, .sys) worden niet bewaakt." },
      design: (st) => { const r = ArchUtil.ruleState(st, "endpoint", "apparaten"); return r.state === "on" && ArchUtil.check(st, "devices") !== "done" ? { state: "todo", text: r.text + " · apparaten nog onboarden" } : r; },
    },
    {
      id: "src-teams", col: "src", app: ["teams"], layers: ["sit", "classifiers", "dlp", "retention", "audit"], tier: "e3", lic: ["e3", "e5dlp"], icon: "teams", route: "dlp", learn: "dlpTeams",
      name: "Chats / channel messages", nl: "Microsoft Teams",
      uitleg: "Chat- en kanaalberichten in Teams. DLP voor berichten vereist doorgaans E5; retentie en audit werken al met E3. Een bestand dat in de chat wordt gedeeld, valt onder Files in transit.",
      tech: { ziet: "Chat- en kanaalberichten in Microsoft Teams.", kan: "DLP beoordeelt berichten met informatietypen en EDM.", niet: "Een chatbericht krijgt zelf geen sensitivity label. Of fingerprinting en trainable classifiers ook berichttekst beoordelen, is niet gedocumenteerd." },
      design: (st) => ArchUtil.ruleState(st, "teams", "Teams"),
    },
    {
      id: "src-mail", col: "src", app: ["outlook"], layers: ["label", "encryption", "sit", "classifiers", "dlp", "permissions", "retention", "audit"], tier: "e3", lic: "e3", icon: "mail", route: "dlp", learn: "dlp",
      name: "Emails", nl: "Outlook / Exchange",
      uitleg: "Purview controleert e-mail bij het verzenden. Het label reist mee met het bericht, ook naar externe ontvangers. Een bijlage valt onder Files in transit.",
      tech: { ziet: "De e-mail zelf: onderwerp, tekst en headers.", kan: "Een e-mail kan een label en versleuteling dragen en wordt door DLP beoordeeld op informatietypen.", niet: "Of EDM, fingerprinting of trainable classifiers ook de e-mailtekst beoordelen, is niet gedocumenteerd; het gedocumenteerde scenario is de bijlage." },
      design: (st) => ArchUtil.ruleState(st, "exchange", "e-mail"),
    },

    /* ---------- 2 Informatie wordt geclassificeerd ---------- */
    {
      id: "cls-auto", col: "cls", layers: [], tier: "e3", lic: "e3", icon: "play", route: "sits", learn: "sitLearn",
      name: "Automatic classification", nl: "Onderweg: bij maken, uploaden of wijzigen",
      uitleg: "Purview classificeert inhoud automatisch zodra die wordt gemaakt, geüpload of gewijzigd. Je ziet daar zelf niets van.",
      tech: { ziet: "Inhoud op het moment dat die ontstaat of verandert.", kan: "Past de classifiers van de tenant toe.", niet: "Classificatie is een vaststelling, geen keuze: het wordt niet op het item vastgelegd en zet zelf geen label." },
      design: () => ({ state: "on", text: "Altijd actief" }),
    },
    {
      id: "cls-ondemand", col: "cls", layers: [], tier: "addon", lic: "payg", icon: "search", route: "", learn: "onDemand", excl: ["lab-client"],
      name: "On-demand classification", nl: "In rust: scan op verzoek van de beheerder",
      uitleg: "Scant op aanvraag oudere bestanden die nooit of lang niet zijn geclassificeerd. Kosten via pay-as-you-go (niet inbegrepen in E5); controleer jullie plan.",
      tech: { ziet: "Oudere bestanden in rust in SharePoint, OneDrive en op Windows-apparaten.", kan: "Classificeert met de huidige classifiers. Service-side auto-labeling kan daarna de vernieuwde resultaten gebruiken.", niet: "Zet zelf geen labels en start nooit client-side labeling in Office." },
      design: () => ({ state: "na", text: "Optioneel, na de uitrol" }),
    },
    {
      id: "cls-sit", col: "cls", grp: "engines", layers: ["sit", "classifiers"], tier: "e3", lic: "e3", icon: "shieldcheck", route: "sits", learn: "sitLearn",
      name: "SIT (syntactic)", nl: "Sensitive information types: regex, trefwoorden, woordenlijsten",
      uitleg: "Ruim 300 ingebouwde informatietypen, zoals BSN, IBAN en creditcard, plus eigen patronen met reguliere expressies en trefwoorden. Typen voor wachtwoorden en sleutels vereisen E5.",
      tech: { ziet: "Inhoud, vergeleken met reguliere expressies, trefwoorden en woordenlijsten, met betrouwbaarheid en nabijheid.", kan: "De breedste herkenning, en de enige die ook de tekst van Teams-berichten en e-mail beoordeelt.", niet: "Een informatietype werkt alleen voor inhoud die ná het maken of wijzigen van dat type is gemaakt of gewijzigd. Voor oudere inhoud is er on-demand classification." },
      design: (st) => { const n = ArchUtil.sits(st, "builtin") + ArchUtil.sits(st, "custom"); return n ? { state: "on", text: ArchUtil.n(n, "informatietype", "informatietypen") } : { state: "off", text: "Nog geen informatietypen" }; },
    },
    {
      id: "cls-edm", col: "cls", grp: "engines", layers: ["sit", "classifiers"], tier: "e5", lic: "e5ip", icon: "database", route: "sits", learn: "edm",
      name: "Exact Data Match (EDM)", nl: "Exacte match met jullie eigen gegevens",
      uitleg: "Herkent exacte waarden uit een eigen tabel, bijvoorbeeld patiënt- of klantnummers. Weinig vals-positieven, wel meer inrichting.",
      tech: { ziet: "Inhoud, vergeleken met een gehashte kopie van jullie eigen tabel (tot 100 miljoen rijen, dagelijks te verversen).", kan: "DLP voor SharePoint, OneDrive, Teams-chat, Exchange en apparaten; service-side auto-labeling voor SharePoint, OneDrive en Exchange; client-side auto-labeling in Word, Excel, PowerPoint en Outlook.", niet: "Voor client-side auto-labeling mag EDM niet de enige voorwaarde zijn: voeg minstens één ander informatietype toe. Of prompttekst wordt beoordeeld, is niet gedocumenteerd." },
      design: (st) => { const n = ArchUtil.sits(st, "edm"); return n ? { state: "on", text: ArchUtil.n(n, "EDM-type", "EDM-typen") } : { state: "off", text: "Niet gebruikt" }; },
    },
    {
      id: "cls-ne", col: "cls", grp: "engines", layers: ["sit", "classifiers"], tier: "e5", lic: "e5ip", icon: "users", route: "sits", learn: "namedEntities",
      name: "Named entities", nl: "Namen, adressen en medische termen",
      uitleg: "Herkent persoonsnamen, adressen en medische termen met woordenlijsten en patronen, gebundeld of per land. Vereist E5.",
      tech: { ziet: "Persoonsnamen, fysieke adressen en medische termen, per land of als bundel.", kan: "Werkt in DLP en auto-labeling voor SharePoint, OneDrive, Teams, Exchange en Windows-apparaten.", niet: "Eerst ‘Advanced classification’ inschakelen. Namen alleen in Latijns schrift. Niet voor on-premises, Power BI of de scanner. Niet te bewerken of te kopiëren." },
      design: () => ({ state: "na", text: "Kies op Informatietypen" }),
    },
    {
      id: "cls-fp", col: "cls", grp: "engines", layers: ["classifiers"], tier: "e5", lic: "e5ip", icon: "fingerprint", route: "sits", learn: "fingerprint",
      scope: { src: ["src-files", "src-transit", "src-devices"] },
      name: "Document fingerprinting", nl: "Herkent bekende documentsjablonen",
      uitleg: "Maakt een ‘vingerafdruk’ van een standaardformulier. Ingevulde varianten worden dan herkend. Voedt alleen DLP, geen labeling.",
      tech: { ziet: "Bestanden, ook als bijlage of gedeeld in Teams.", kan: "Herkent bestanden op basis van een sjabloon. Gaat alleen naar DLP.", niet: "Voedt geen labeling. Beoordeelt het bestand, niet de chat- of e-mailtekst. Geen wachtwoordbeveiligde bestanden, afbeeldingen of bestanden boven 4 MB." },
      design: (st) => { const n = ArchUtil.sits(st, "fingerprint"); return n ? { state: "on", text: ArchUtil.n(n, "fingerprint", "fingerprints") } : { state: "off", text: "Niet gebruikt" }; },
    },
    {
      id: "cls-tc", col: "cls", grp: "engines", layers: ["classifiers"], tier: "e5", lic: "e5ip", icon: "brain", route: "sits", learn: "classifiersLearn",
      scope: { src: ["src-files", "src-transit", "src-devices"] },
      name: "Trainable classifiers", nl: "Vooraf getraind en eigen (machine learning)",
      uitleg: "Herkent documenten op soort in plaats van patroon, bijvoorbeeld cv’s, contracten of medische dossiers. Voedt auto-labeling en DLP.",
      tech: { ziet: "Bestanden, beoordeeld door machine learning (vooraf getraind of eigen), ook als bijlage of gedeeld in Teams.", kan: "Voedt service-side en client-side auto-labeling en DLP.", niet: "Alleen onversleutelde items. Eigen classifiers alleen Engelstalig. Niet bruikbaar in de DLP-locatie Microsoft 365 Copilot." },
      design: (st) => { const n = ArchUtil.sits(st, "classifier"); return n ? { state: "on", text: ArchUtil.n(n, "classifier", "classifiers") } : { state: "off", text: "Niet gebruikt" }; },
    },
    {
      id: "cls-ai", col: "cls", grp: "engines", layers: ["classifiers"], tier: "", lic: [], icon: "sparkle", route: "", learn: "rm560708", status: "roadmap",
      scope: { src: ["src-files", "src-copilot"] }, excl: ["lab-client", "pro-dlp"],
      name: "AI classifiers (semantic)", nl: "Prompts en inhoud die Copilot gebruikt",
      uitleg: "Aangekondigd: semantische herkenning voor prompts en bestanden die Copilot gebruikt. Alleen voor service-side auto-labeling.",
      roadmap: "Op de Microsoft 365-roadmap (ID 560708); niet algemeen beschikbaar. Licentie nog niet bekend; controleer de roadmap.",
      tech: { ziet: "Prompts en bestanden die Copilot gebruikt voor een antwoord.", kan: "Semantische classificatie, als aanvulling op informatietypen.", niet: "Niet voor client-side auto-labeling of algemene DLP." },
    },
    {
      id: "cls-unified", col: "cls", layers: [], tier: "", lic: [], icon: "grid", route: "", learn: "rm570844", status: "roadmap", note: true,
      name: "Unified classification management experience", nl: "Alle classifiers op één plek beheren",
      uitleg: "Aangekondigd: één plek om informatietypen, EDM, fingerprints en trainable classifiers te vinden, maken, testen en beheren. Beheert classifiers; het is zelf geen classifier.",
      roadmap: "Op de Microsoft 365-roadmap (ID 570844). Gepland: preview september 2026, algemeen beschikbaar november 2026; controleer de roadmap.",
      tech: { ziet: "Alle classifiers in Purview.", kan: "Ontdekken, maken, valideren en beheren op één plek.", niet: "Verder gedrag is nog niet gedocumenteerd." },
    },

    /* ---------- 3 Bestanden labelen (eerst de labelmethodes, dan het label zelf) ---------- */
    {
      id: "lab-policy", col: "lab", layers: ["label"], tier: "e3", lic: "e3", icon: "users", route: "policies", learn: "labelsCreate", scope: { src: ["src-files", "src-mail"] },
      name: "Default label from policy", nl: "Als inhoud nog geen label heeft",
      uitleg: "Het labelbeleid publiceert labels aan medewerkers en kan een standaardlabel zetten op nieuwe inhoud zonder label. Hier stel je ook verplicht labelen en motivatie bij verlagen in.",
      tech: { ziet: "Nieuwe inhoud zonder label.", kan: "Zet het standaardlabel uit het beleid. Overschrijft nooit een bestaand label.", niet: "Volgt de labelprioriteit. Labels moeten aan minstens één gebruiker zijn gepubliceerd." },
      design: (st) => {
        const ps = st.labelPolicies || [], s = ps.map((p) => p.settings || {});
        const x = [s.some((o) => o.defaultDocs) && "standaardlabel", s.some((o) => o.mandatoryDocs || o.mandatoryEmail) && "verplicht", s.some((o) => o.justification) && "motivatie"].filter(Boolean);
        return applicableLabels(st).length ? { state: "on", text: `${ArchUtil.n(ps.length, "beleid", "beleidsregels")}${x.length ? " · " + x.join(", ") : ""}` } : { state: "todo", text: "Eerst labels maken" };
      },
    },
    {
      id: "lab-client", col: "lab", layers: ["label"], tier: "e5", lic: "e5ip", icon: "bulb", route: "autolabel", learn: "labelsAuto", scope: { src: ["src-files", "src-mail"] },
      name: "Client-side auto-labeling", nl: "Office-apps: automatisch toepassen of aanbevelen",
      uitleg: "Word, Excel, PowerPoint en Outlook herkennen gevoelige inhoud tijdens het werken en raden een label aan of passen het toe. De gebruiker kan een aanbevolen label accepteren of weigeren.",
      tech: { ziet: "Inhoud in Office-apps terwijl de gebruiker werkt.", kan: "Label aanbevelen of automatisch toepassen, op basis van informatietypen, EDM, named entities en trainable classifiers.", niet: "Afhankelijk van de app-versie. Geen pdf, geen simulatie en geen labeling van binnenkomende e-mail. Niet gevoed door AI classifiers of document fingerprinting." },
      design: (st) => { const n = ArchUtil.labels(st, (l) => l.cfg.autolabel.client.mode !== "off"); return n ? { state: "on", text: ArchUtil.n(n, "label", "labels") } : { state: "off", text: "Niet gebruikt" }; },
    },
    {
      id: "lab-library", col: "lab", layers: ["label"], tier: "e5", lic: "e5ip", icon: "folder", route: "autolabel", learn: "labelsDefaultLibrary", scope: { src: ["src-files"] },
      name: "Default label — SharePoint library", nl: "Op basis van locatie, zonder naar de inhoud te kijken",
      uitleg: "Een SharePoint-bibliotheek krijgt een standaardlabel. Nieuwe en bewerkte bestanden krijgen dat label als ze nog geen label of een lager automatisch label hebben.",
      tech: { ziet: "De locatie (bibliotheek), niet de inhoud.", kan: "Zet het standaardlabel op nieuwe of bewerkte bestanden en vervangt een lager automatisch label, nooit een handmatig label.", niet: "Alleen SharePoint. Bestanden die er al staan krijgen het label nog niet (zie Library default label — data at rest)." },
      design: () => ({ state: "na", text: "Optioneel per bibliotheek" }),
    },
    {
      id: "lab-service", col: "lab", layers: ["label"], tier: "e5", lic: "e5ip", icon: "wand", route: "autolabel", learn: "labelsAuto", scope: { src: ["src-files", "src-mail"] },
      name: "Service-side auto-labeling", nl: "SharePoint en OneDrive in rust · Exchange onderweg",
      uitleg: "Labelt bestaande bestanden in SharePoint en OneDrive en e-mail onderweg, zonder dat de gebruiker iets doet en los van de app-versie. Eerst in simulatie.",
      tech: { ziet: "Bestanden in rust in SharePoint en OneDrive, e-mail onderweg via Exchange (verzonden of ontvangen), en de resultaten van classifiers, ook van on-demand classification.", kan: "Labelt in de service, draait eerst in simulatie en kan een lager handmatig label overschrijven als dat is ingesteld.", niet: "Geen e-mail die al in de mailbox staat. Bij een bijlage krijgt de e-mail het label. Zet geen markering (koptekst, watermerk) en kan geen label aanbevelen." },
      design: (st) => { const n = ArchUtil.labels(st, (l) => l.cfg.autolabel.service.enabled); return n ? { state: "on", text: ArchUtil.n(n, "label", "labels") } : { state: "off", text: "Niet gebruikt" }; },
    },
    {
      id: "lab-manual", col: "lab", layers: ["label"], tier: "e3", lic: "e3", icon: "edit", route: "labels", learn: "labelsOffice", scope: { src: ["src-files", "src-mail"] },
      name: "Manual / override", nl: "Label gekozen door de gebruiker",
      uitleg: "De gebruiker kiest zelf een label in Office, Outlook of SharePoint, of past een eerder label aan.",
      tech: { ziet: "De keuze van de gebruiker, ook het overschrijven van een eerder label.", kan: "Legt het label vast als keuze in de metadata van het item.", niet: "Valt onder de labelprioriteit." },
      design: (st) => (applicableLabels(st).length ? { state: "on", text: "Altijd mogelijk" } : { state: "todo", text: "Eerst labels maken" }),
    },
    {
      id: "lab-priority", col: "lab", layers: [], tier: "", lic: [], icon: "sliders", route: "schema", learn: "labelsAuto", note: true,
      name: "Label priority", nl: "Labeling geldt voor ondersteunde Office-bestanden en pdf",
      uitleg: "Een handmatig label heeft de hoogste prioriteit, behalve als een service-side auto-labelingregel is ingesteld om het te overschrijven. Alle automatische methodes en standaardlabels volgen de labelvolgorde.",
      tech: { ziet: "De labelmethodes die tegelijk een label op hetzelfde item willen zetten.", kan: "Bepaalt welk label wint.", niet: "Eén sensitivity label per item." },
    },
    {
      id: "lab-taxonomy", col: "lab", layers: ["label"], tier: "e3", lic: "e3", icon: "tag", route: "schema", learn: "labels", hub: true,
      scope: { src: ["src-files", "src-transit", "src-devices", "src-mail"] },
      name: "Sensitivity label applied", nl: "Hoe het ook is toegepast: het label draagt de bescherming",
      uitleg: "Het label is een niveau uit jullie classificatieschema. Het staat in de metadata van het item en reist mee. Maatregelen kijken naar het label, niet naar hoe het erop kwam.",
      items: [["Content marking", "Het label kan het niveau ook zichtbaar maken met een koptekst, voettekst of watermerk (watermerk niet in Outlook). Service-side auto-labeling zet geen markering.", "labelsOffice", "Microsoft Learn"]],
      tech: { ziet: "Het label in de metadata van een item, gezet door een van de vijf labelmethodes.", kan: "Draagt de bescherming (versleuteling en rechten, toegang, retentie en DLP-voorwaarden) en reist mee met het item.", niet: "Eén sensitivity label per item; de prioriteit beslist. Geen label op Teams-chatberichten of prompts." },
      design: (st) => { const n = applicableLabels(st).length, m = ArchUtil.labels(st, (l) => { const k = l.cfg.marking; return k.header.enabled || k.footer.enabled || k.watermark.enabled; }); return n ? { state: "on", text: `${ArchUtil.n(n, "label", "labels")}${m ? ` · ${m} met markering` : ""}` } : { state: "todo", text: "Nog geen labels" }; },
    },
    {
      id: "lab-scale", col: "lab", grp: "scale", layers: ["label"], tier: "e5", lic: "e5ip", icon: "layers", route: "autolabel", learn: "rm567890", status: "preview",
      name: "Scale increase — SharePoint / OneDrive", nl: "Tot 500.000 bestanden per dag",
      uitleg: "Service-side auto-labeling labelt per tenant tot 500.000 bestanden per dag in SharePoint en OneDrive (was 100.000). Een beleid kan aan blijven terwijl je het bewerkt, zonder nieuwe simulatie.",
      roadmap: "Public preview vanaf september 2026, algemeen beschikbaar gepland in oktober 2026 (roadmap-ID 567890). Controleer de roadmap.",
      tech: { ziet: "Bestanden in rust in SharePoint en OneDrive voor service-side auto-labeling.", kan: "Meer bestaande data sneller labelen, bijvoorbeeld als voorbereiding op Copilot.", niet: "Verder niets gedocumenteerd naast de genoemde capaciteit." },
    },
    {
      id: "lab-scale-mgmt", col: "lab", grp: "scale", layers: ["label"], tier: "e5", lic: "e5ip", icon: "sliders", route: "autolabel", learn: "rm570445", status: "preview",
      name: "Scalability, policy management & reporting", nl: "Simulatie van 4 naar 20 miljoen items; grotere bereiken",
      uitleg: "Simulatie tot 20 miljoen items, tot 1.000 losse SharePoint-sites per beleid, adaptive scopes tot 50.000 sites, filteren op SiteTemplate en een grafiek van verwerkte bestanden per dag.",
      roadmap: "Public preview vanaf september 2026, algemeen beschikbaar gepland eind oktober 2026 (roadmap-ID 570445). Controleer de roadmap.",
      tech: { ziet: "Configuratie, simulatie, audit en rapportage van auto-labelingbeleid.", kan: "Grotere simulaties en bereiken; audit en rapportage tonen ook welke informatietypen zijn gevonden.", niet: "Staat standaard aan; bestaande beleidsregels blijven ongewijzigd werken en gebruikers merken niets." },
    },
    {
      id: "lab-scale-report", col: "lab", grp: "scale", layers: ["label"], tier: "e5", lic: "e5ip", icon: "chart", route: "autolabel", learn: "rm568935", status: "preview",
      name: "Per-policy coverage report", nl: "Afgedwongen bestanden naast de laatste simulatie",
      uitleg: "Per afgedwongen beleid zie je welke bestanden wel of nog niet zijn gelabeld, en of ze in de laatste simulatie zaten.",
      roadmap: "Preview en algemene beschikbaarheid gepland in september 2026 (roadmap-ID 568935). Controleer de roadmap.",
      tech: { ziet: "Bestanden die tijdens het afdwingen zijn verwerkt, naast de laatste simulatie.", kan: "Toont ook bestanden die niet in de simulatie zaten maar wel zijn verwerkt.", niet: "Verder niets gedocumenteerd." },
    },
    {
      id: "lab-scale-library", col: "lab", grp: "scale", layers: ["label"], tier: "e5", lic: "e5ip", icon: "folder", route: "autolabel", learn: "rm559105", status: "preview",
      name: "Library default label — data at rest", nl: "Bibliotheeklabel ook op bestaande bestanden",
      uitleg: "Een auto-labelingbeleid zet het standaardlabel van een SharePoint-bibliotheek ook op bestanden die er al staan. Zo is een bibliotheek niet meer alleen voor nieuwe of bewerkte bestanden beschermd.",
      roadmap: "Public preview vanaf september 2026, algemeen beschikbaar gepland in oktober 2026 (roadmap-ID 559105). Controleer de roadmap.",
      tech: { ziet: "Bestaande bestanden in een SharePoint-bibliotheek met een standaardlabel.", kan: "Labelt die bestanden met het standaardlabel van de bibliotheek.", niet: "Alleen SharePoint: OneDrive en Exchange hebben geen bibliotheeklabel." },
    },
    {
      id: "lab-prereq", col: "lab", layers: [], tier: "", lic: [], icon: "checkcircle", route: "tenant", learn: "labelsAuto", note: true,
      name: "Prerequisites", nl: "Ontbreekt er één, dan labelt beleid niets, vaak zonder foutmelding",
      uitleg: "Zonder deze instellingen draait labelbeleid zonder iets te labelen, meestal zonder foutmelding in de portal.",
      prereq: ["Sensitivity labels ingeschakeld voor Office-bestanden in SharePoint en OneDrive", "Pdf-ondersteuning apart ingeschakeld (EnableSensitivityLabelForPDF)", "Audit aan (nodig voor simulatie van auto-labeling)", "Labels gepubliceerd aan minstens één gebruiker; een bovenliggend label (parent) kan nooit worden toegepast", "Labelbereik bevat Files en/of Emails"],
      tech: { ziet: "Tenant- en labelinstellingen waar labeling van afhangt.", kan: "Als alles klopt, passen client-side en service-side labeling labels toe zoals ingesteld.", niet: "Zonder pdf-ondersteuning worden pdf’s niet gelabeld." },
      design: (st) => (ArchUtil.check(st, "spo") === "done" && ArchUtil.check(st, "audit") === "done" ? { state: "on", text: "SharePoint en audit staan aan" } : { state: "todo", text: "Randvoorwaarden nog nalopen" }),
    },
    {
      id: "lab-activity", col: "lab", layers: ["label"], tier: "e5", lic: "e5ip", icon: "eye", route: "tenant", learn: "explorers",
      name: "Labeling activity", nl: "Elke toepassing, wijziging, verlaging en verwijdering wordt vastgelegd",
      uitleg: "Elke labelactie wordt vastgelegd, welke methode het label ook zette: toegepast, gewijzigd (hoger, lager of verwijderd) en simulaties van auto-labeling, inclusief de reden bij een verlaagd label.",
      tech: { ziet: "Labelacties via elke methode in Office-apps, SharePoint, OneDrive en Exchange.", kan: "Voedt audit, Activity explorer en Insider Risk Management.", niet: "Activity explorer is niet realtime en toont maximaal 30 dagen. Oude Azure Information Protection-labels worden niet ondersteund." },
      design: (st) => (ArchUtil.check(st, "audit") === "done" ? { state: "on", text: "Audit staat aan" } : { state: "todo", text: "Audit nog aanzetten" }),
    },

    /* ---------- 4 Bescherming ---------- */
    {
      id: "pro-dlp", col: "pro", layers: ["dlp"], tier: "e3", lic: "e3", icon: "shield", route: "dlp", learn: "dlp",
      scope: { src: ["src-files", "src-transit", "src-devices", "src-teams", "src-mail"] },
      name: "DLP policy evaluation", nl: "Exchange, SharePoint, OneDrive, Teams, Endpoint",
      uitleg: "DLP kijkt naar label én inhoud en kan een policy tip tonen, blokkeren of laten overschrijven met een reden. Voor e-mail, SharePoint en OneDrive doorgaans E3; Teams en apparaten doorgaans E5 (controleer licentie).",
      items: [["Simulation & policy tips", "Een nieuw beleid draait eerst in simulatie: je ziet wat er zou gebeuren, medewerkers merken niets. Daarna eventueel alleen policy tips, en pas dan blokkeren.", "dlpSimulation", "Microsoft Learn"]],
      tech: { ziet: "Inhoud en classificatie in Exchange, SharePoint, OneDrive, Teams-chat en -kanalen en op onboarded Windows- en macOS-apparaten.", kan: "Dwingt acties af, ook op apparaten: USB, netwerkshare, afdrukken, klembord, upload, Bluetooth en RDP. Just-in-time protection houdt een actie vast tot de beoordeling klaar is.", niet: "Op apparaten moeten gebruiker én apparaat in het bereik vallen. Een offline apparaat meldt pas na verbinden." },
      design: (st) => { const n = ["exchange", "sharing", "teams", "endpoint"].reduce((a, d) => a + ArchUtil.rules(st, d), 0); return n ? { state: "on", text: `${ArchUtil.n(n, "regel", "regels")} · ${ArchUtil.mode(st, "exchange")}` } : { state: "off", text: "Nog geen DLP" }; },
    },
    {
      id: "pro-dlp-copilot", col: "pro", layers: ["dlp"], tier: "e5", lic: "e5", icon: "sparkle", route: "copilot", learn: "dlpCopilot",
      scope: { src: ["src-copilot", "src-files", "src-transit", "src-mail"] },
      name: "DLP for Microsoft 365 Copilot & Copilot Chat", nl: "Beperkingen op label, informatietype en bron",
      uitleg: "Bestanden en e-mails met bepaalde labels kun je uitsluiten van Copilot-antwoorden (E5). Bevat een prompt gevoelige informatietypen, dan kun je zoeken op het web blokkeren of Copilot helemaal niet laten antwoorden. Geldt voor Microsoft 365 Copilot, Copilot Chat en Cowork.",
      preview: "Copilot niet laten antwoorden op prompts met gevoelige informatietypen is in preview en wordt per tenant uitgerold.",
      tech: { ziet: "Bestanden en e-mail met bepaalde labels, en prompts met informatietypen.", kan: "Verwerking van gelabelde items beperken, prompts met informatietypen blokkeren en zoeken op het web als bron uitschakelen.", niet: "Eén regel kan labels en informatietypen niet combineren. Een bestand dat in de prompt wordt geüpload, wordt niet beoordeeld. Alleen in een eigen beleid (Custom); wijzigingen kunnen tot vier uur duren." },
      design: (st) => (ArchUtil.rules(st, "copilot") ? { state: "on", text: "Regels in ontwerp" } : { state: "off", text: "Niet gebruikt" }),
    },
    {
      id: "pro-conditions", col: "pro", layers: [], tier: "", lic: [], icon: "filter", route: "dlp", learn: "dlpReference", note: true,
      name: "DLP conditions — content and/or intent", nl: "Wat de inhoud ís, wat het label zegt, of allebei",
      uitleg: "Een DLP-regel kan handelen op wat de inhoud is, op wat het label zegt, of op allebei, gecombineerd met Any of these (OF) of All of these (EN).",
      conditions: ["Inhoud: sensitive information types en trainable classifiers", "Bedoeling: sensitivity labels en retention labels", "Teams-chat en -kanalen: alleen informatietypen, geen labels", "Microsoft 365 Copilot: labels; informatietypen alleen in de prompttekst", "Meerdere locaties in één beleid: een ‘nee’ wint, dus Teams toevoegen haalt labelvoorwaarden weg"],
      tech: { ziet: "De voorwaarden die een DLP-regel kan gebruiken; die verschillen per locatie.", kan: "Exchange, SharePoint, OneDrive en apparaten ondersteunen informatietypen én sensitivity labels; SharePoint en OneDrive ook retention labels.", niet: "Teams-berichten niet op labels. In de Copilot-locatie kan één regel labels en informatietypen niet combineren." },
    },
    {
      id: "pro-encrypt", col: "pro", layers: ["encryption"], tier: "e3", lic: "e3", icon: "lock", route: "labels", learn: "labelsEncryption",
      name: "Encryption / usage rights", nl: "AI-apps hebben EXTRACT én VIEW nodig",
      uitleg: "Versleuteling reist mee met het bestand. Rechten bepalen wat iemand mag: lezen, wijzigen, afdrukken of kopiëren. Zonder het recht EXTRACT geeft Copilot de inhoud niet terug.",
      items: [["Double Key Encryption", "Jullie houden een tweede sleutel zelf in beheer; ook Microsoft kan dan niet bij de inhoud. Copilot kan deze bestanden niet gebruiken. Vereist E5 en een eigen DKE-service.", "dke", "Microsoft Learn"]],
      tech: { ziet: "Gelabelde inhoud en de rechten per gebruiker.", kan: "Versleutelt en dwingt rechten af, waar het item ook naartoe gaat.", niet: "AI-apps hebben naast VIEW ook EXTRACT nodig om versleutelde inhoud terug te geven." },
      design: (st) => { const n = ArchUtil.labels(st, (l) => ["assignNow", "userDefined"].includes(l.cfg.encryption.mode)), k = ArchUtil.labels(st, (l) => l.cfg.encryption.dke); return n ? { state: "on", text: `${ArchUtil.n(n, "label", "labels")}${k ? ` · ${k} met DKE` : ""}` } : { state: "off", text: "Geen versleuteling" }; },
    },
    {
      id: "pro-container", col: "pro", layers: ["permissions"], tier: "e3", lic: "e3", icon: "site", route: "labels", learn: "labelsContainers",
      name: "Permissions / access", nl: "Toegang gaat altijd voor",
      uitleg: "Wie geen toegang heeft tot een item, komt niet bij Purview-maatregelen; ook Copilot en agents gebruiken het dan niet. Een label op een team of site regelt privacy, gasttoegang en extern delen. Toegang via Conditional Access (authentication context) vereist E5.",
      tech: { ziet: "Wie toegang vraagt, en de gebruiksrechten die het label geeft.", kan: "Dwingt toegang af, los van het label. Copilot en agents respecteren dat: data waar de gebruiker niet bij mag, wordt nooit gebruikt.", niet: "Een containerlabel labelt niet automatisch de bestanden in die site." },
      design: (st) => { const n = ArchUtil.labels(st, (l) => l.cfg.scope.sites); if (!n) return { state: "off", text: "Geen site-labels" }; return ArchUtil.check(st, "containers") === "done" ? { state: "on", text: ArchUtil.n(n, "label", "labels") } : { state: "todo", text: `${ArchUtil.n(n, "label", "labels")} · nog inschakelen` }; },
    },
    {
      id: "lab-copilot", col: "pro", layers: ["label"], tier: "addon", lic: "copilot", icon: "sparkle", route: "copilot", learn: "labelsCopilot",
      name: "Label inheritance — Copilot responses", nl: "Nieuwe inhoud erft het meest beperkende label",
      uitleg: "Maakt Copilot iets nieuws op basis van gelabelde bronnen, dan krijgt het resultaat het label met de hoogste prioriteit. Vereist een Microsoft 365 Copilot-licentie naast E3 of E5.",
      tech: { ziet: "De labels van de items die Copilot gebruikte.", kan: "Geeft nieuwe inhoud het label met de hoogste prioriteit, zodat bescherming niet verloren gaat.", niet: "Versleuteling zonder label of met door de gebruiker toegewezen machtigingen wordt niet overgeërfd. Voor versleutelde bronnen heeft de gebruiker naast VIEW ook EXTRACT nodig. S/MIME-mail wordt nooit gebruikt." },
      design: (st) => (applicableLabels(st).length ? { state: "on", text: "Werkt automatisch met jullie labels" } : { state: "todo", text: "Eerst labels maken" }),
    },
    {
      id: "pro-adaptive", col: "pro", layers: ["dlp"], tier: "e5", lic: "e5", icon: "user", route: "", learn: "adaptiveProtection", out: true,
      name: "Adaptive Protection", nl: "Insider-risiconiveau bepaalt hoe streng de handhaving is",
      uitleg: "Insider Risk Management bepaalt een risiconiveau per gebruiker. Adaptive Protection maakt DLP en retentie dan automatisch strenger voor die gebruiker. Valt buiten deze workshop.",
      tech: { ziet: "Risiconiveaus (Elevated, Moderate, Minor) uit Insider Risk Management.", kan: "Policy tip bij laag risico, blokkeren bij verhoogd risico. Stuurt DLP, Data Lifecycle Management en Conditional Access.", niet: "Voor DLP alleen Exchange, Teams en apparaten. De koppeling met Data Lifecycle Management en Conditional Access is in preview." },
    },
    {
      id: "oos-retention", col: "pro", layers: ["retention"], tier: "e3", lic: "e3", icon: "clock", route: "", learn: "retention", out: true,
      name: "Data Lifecycle Management", nl: "Retentie",
      uitleg: "Bepaalt hoe lang iets bewaard blijft. Retention labels zijn een ander soort label dan sensitivity labels en vallen buiten deze workshop. Automatisch toepassen vereist E5.",
      tech: { ziet: "Inhoud met een retentiebeleid of retention label.", kan: "Retentie voor Exchange, SharePoint, OneDrive, Teams en Viva Engage; retention labels voor uitzonderingen per item.", niet: "Buiten de scope van deze workshop." },
    },

    /* ---------- 5 Inzicht ---------- */
    {
      id: "ins-dspm", col: "ins", layers: [], tier: "e5", lic: "e5", icon: "target", route: "copilot", learn: "dspm",
      name: "DSPM", nl: "Data Security Posture Management en oversharing-rapporten",
      uitleg: "Eén dashboard met risico’s rond gevoelige data en AI-gebruik: waar staat de data, wie kan erbij, hoe wordt die gebruikt en is die voldoende beschermd. Met aanbevolen beleid.",
      tech: { ziet: "Gevoelige data, wie erbij kan, hoe die wordt gebruikt en of die voldoende is beschermd.", kan: "Toont overdeling en blootstelling, volgt de stand in de tijd en stelt beleid voor.", niet: "Copilot-monitoring vereist ook audit en een Copilot-licentie." },
      design: (st) => (ArchUtil.check(st, "copilot") === "done" ? { state: "on", text: "Ingericht" } : { state: "na", text: "Aanrader bij Copilot" }),
    },
    {
      id: "ins-explorer", col: "ins", layers: ["audit"], tier: "e5", lic: "e5ip", icon: "chart", route: "tenant", learn: "explorers",
      name: "Activity / Content Explorer", nl: "Waar staat gevoelige en gelabelde inhoud?",
      uitleg: "Laat zien waar gelabelde en gevoelige items staan en wat ermee gebeurt (labelen, delen, kopiëren). De volledige weergave vereist E5. Werkt alleen met audit aan.",
      tech: { ziet: "Content explorer: items met een sensitivity label, retention label of informatietype. Activity explorer: activiteiten uit de audit log.", kan: "Laat zien waar gevoelige inhoud staat en wat ermee gebeurde.", niet: "Activity explorer is niet realtime en toont maximaal 30 dagen. Versleutelde gelabelde items in SharePoint en OneDrive verschijnen niet in Content explorer." },
      design: (st) => (ArchUtil.check(st, "audit") === "done" ? { state: "on", text: "Audit staat aan" } : { state: "todo", text: "Audit nog aanzetten" }),
    },
    {
      id: "ins-audit", col: "ins", layers: ["audit"], tier: "e3", lic: "e3", icon: "clipboard", route: "tenant", learn: "auditSolutions",
      name: "Unified audit log", nl: "Ook prompts en antwoorden vastgelegd",
      uitleg: "Audit (Standard, E3) bewaart activiteiten 180 dagen, inclusief Copilot-gebruik. Audit (Premium, E5) bewaart standaard een jaar.",
      tech: { ziet: "Gebeurtenissen in de hele tenant, ook Copilot-prompts en -antwoorden.", kan: "Elke beschermingsmaatregel schrijft naar de unified audit log.", niet: "Langer dan 180 dagen bewaren vereist Audit (Premium); tien jaar vereist een add-on." },
      design: (st) => (ArchUtil.check(st, "audit") === "done" ? { state: "on", text: "Aan" } : { state: "todo", text: "Nog aanzetten" }),
    },
    {
      id: "ins-alerts", col: "ins", layers: [], tier: "e3", lic: "e3", icon: "bell", route: "dlp", learn: "dlpAlerts",
      name: "DLP alerts", nl: "Meldingen bij beleidsovertredingen",
      uitleg: "Een overtreding kan een melding voor het securityteam geven. De licentie hangt af van de locatie: e-mail en SharePoint met E3, Teams en apparaten met E5.",
      tech: { ziet: "DLP-matches over alle locaties.", kan: "Meldingen, triage en onderzoek.", niet: "Hoe lang een melding zichtbaar blijft, hangt af van de auditretentie." },
      design: (st) => { const n = ArchUtil.labels(st, (l) => l.cfg.notify && l.cfg.notify.alert && l.cfg.notify.alert !== "none"); return n ? { state: "on", text: ArchUtil.n(n, "label met alert", "labels met alert") } : { state: "off", text: "Geen alerts" }; },
    },
    {
      id: "oos-irm", col: "ins", layers: [], tier: "e5", lic: "e5", icon: "alert", route: "", learn: "irm", out: true,
      name: "Insider Risk Management alerts", nl: "Meldingen over risicovol gedrag",
      uitleg: "Insider Risk Management signaleert risicovol gedrag, zoals datalekken, op basis van onder meer labelactiviteit en Adaptive Protection. Het meldt ook risico’s buiten deze plaat. Valt buiten deze workshop.",
      tech: { ziet: "Risicosignalen per gebruiker, hier uit labelactiviteit en Adaptive Protection.", kan: "Risicovolle activiteit herkennen, beoordelen en opvolgen; gebruikers zijn standaard gepseudonimiseerd.", niet: "Deze plaat toont alleen meldingen uit classificatie, labeling en DLP; IRM gebruikt veel meer signalen." },
    },
  ],
};
