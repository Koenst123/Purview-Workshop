/* Catalogus – adoptiemateriaal (Ronde 5): spiekbrief, labelkaarten, communicatiepakket, persona-reis, quiz en adoptie-KPI's.
   Teksten zijn sjablonen; de view (js/views/adoption.js → AdoptKit) vult ze met het ontwerp van de klant.
   Feiten volgens Microsoft Learn (labels in Office-apps, verplicht labelen, justification, policy tips, Copilot + EXTRACT/VIEW). */

Object.assign(CATALOG.learn, {
  dataExplorer: { title: "Get started with data explorer", url: LEARN_BASE + "purview/data-classification-data-explorer" },
  contentExplorer: { title: "Get started with content explorer", url: LEARN_BASE + "purview/data-classification-content-explorer" },
});

CATALOG.adoption = {
  months: ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"],

  /* Niveaus van het classificatieschema: herkenning op naam (eerst) en beschrijving, met een standaardvraag.
     "q" = vraag die bepaalt of iets minstens dit niveau heeft (Ja = gevoeliger). */
  levels: [
    { key: "public", re: /openbaar|public|publiek|extern openbaar/i, icon: "globe", q: "Mag iedereen dit zien, ook buiten de organisatie?", hint: "Bijv. website, persbericht, publicatie." },
    { key: "personal", re: /persoonlijk|personal|priv[ée]/i, icon: "user", q: "Gaat het over iets privé, niet over je werk?", hint: "Bijv. een persoonlijke afspraak." },
    { key: "strict", re: /strikt|zeer vertrouwelijk|geheim|highly|secret|restricted|staatsgeheim/i, icon: "shield", q: "Kan uitlekken ernstige schade veroorzaken, of geldt er geheimhouding?", hint: "Bijv. personeelsdossiers, fusies, geheime bestuursstukken." },
    { key: "confidential", re: /vertrouwelijk|confidential|gevoelig|sensitive|persoonsgegevens|beperkt/i, icon: "lock", q: "Bevat het persoonsgegevens of vertrouwelijke bedrijfsinformatie?", hint: "Bijv. BSN, klant- of patiëntgegevens, contracten." },
    { key: "internal", re: /intern|algemeen|general|internal|bedrijf/i, icon: "users", q: "Is het alleen bedoeld voor collega’s (en vaste partners)?", hint: "Bijv. werkinstructies, agenda’s, interne nieuwsbrief." },
  ],
  otherLevel: { key: "other", icon: "tag" },
  subQuestion: "Met wie deel je het?",

  /* Voorbeelddocumenten als een label zelf geen voorbeelden heeft. */
  examples: {
    public: ["Persbericht", "Website-tekst", "Publieksfolder"],
    personal: ["Persoonlijke notitie", "Privéafspraak", "Eigen cv"],
    internal: ["Werkinstructie", "Agenda teamoverleg", "Interne nieuwsbrief"],
    confidential: ["Klantdossier", "Contract leverancier", "Offerte"],
    strict: ["Personeelsdossier", "Salarisoverzicht", "Strategisch plan"],
    other: ["Rapportage", "Notitie", "Overzicht"],
  },
  /* Documentsoort (thumbnail) op basis van de naam van het voorbeeld. */
  docTypes: [
    { key: "mail", re: /e-?mail|mailtje|nieuwsbrief|uitnodiging|bericht aan/i, ext: "", app: "O", name: "E-mail" },
    { key: "ppt", re: /presentatie|slides|pitch|sheets/i, ext: ".pptx", app: "P", name: "PowerPoint" },
    { key: "xls", re: /overzicht|lijst|begroting|budget|rooster|planning|declaratie|salaris|cijfers|export|kwartaal|financ|tabel|registratie/i, ext: ".xlsx", app: "X", name: "Excel" },
    { key: "pdf", re: /folder|brochure|publicatie|persbericht|beschikking|contract|polis|besluit|raadsstuk|raadsvoorstel|jaarverslag|vergunning/i, ext: ".pdf", app: "W", name: "PDF" },
    { key: "doc", re: /./, ext: ".docx", app: "W", name: "Word" },
  ],

  /* Korte namen voor Endpoint DLP-activiteiten (CATALOG.endpointActivities). */
  endpointShort: { usb: "kopiëren naar USB", print: "afdrukken", cloud: "uploaden naar niet-toegestane websites", paste: "plakken in een browser", clipboard: "kopiëren naar het klembord", network: "kopiëren naar een netwerkmap", bluetooth: "versturen via Bluetooth", rdp: "kopiëren via extern bureaublad (RDP)", apps: "openen in niet-toegestane apps" },

  /* Persona-reis: momenten op een werkdag (illustratief: tijden en handelingen zijn voorbeelden, geen meting). "touch" = rijen van het ontwerpbord die het moment relevant maken. */
  moments: [
    { key: "create", time: "08:45", scene: "doc", app: "office", title: "Document maken", touch: ["publish", "marking", "autolabel", "encryption"], does: "Maakt in Word een ‘{doc}’ en kiest bovenin een label." },
    { key: "mail", time: "10:15", scene: "mail", app: "outlook", title: "Mail naar een externe partij", touch: ["dlp_exchange", "encryption"], does: "Mailt de ‘{doc}’ naar een externe contactpersoon." },
    { key: "share", time: "11:30", scene: "share", app: "spo", title: "Delen via OneDrive of SharePoint", touch: ["dlp_sharing", "container"], does: "Deelt een link naar de ‘{doc}’ met iemand buiten de organisatie." },
    { key: "teams", time: "13:00", scene: "teams", app: "teams", title: "Bestand in een Teams-chat", touch: ["dlp_teams", "meetings"], does: "Plakt gevoelige gegevens uit de ‘{doc}’ in een Teams-chat met een gast." },
    { key: "copilot", time: "14:15", scene: "copilot", app: "copilot", title: "Copilot vragen", touch: ["dlp_copilot"], does: "Vraagt Copilot de ‘{doc}’ samen te vatten." },
    { key: "usb", time: "15:30", scene: "usb", app: "endpoint", title: "Bestand op een USB-stick", touch: ["dlp_endpoint"], does: "Zet de ‘{doc}’ op een USB-stick of drukt hem af." },
    { key: "downgrade", time: "16:15", scene: "downgrade", app: "office", title: "Label verlagen", touch: ["publish"], does: "Wil de ‘{doc}’ toch breder delen en kiest een lager label." },
    { key: "mobile", time: "17:30", scene: "phone", app: "outlook", title: "Op de telefoon", touch: ["encryption", "publish"], does: "Opent de ‘{doc}’ onderweg in Outlook op de telefoon." },
  ],

  /* Quiz: herkenbare situaties; het label wordt gezocht op trefwoorden in naam, beschrijving, doelgroep en voorbeelden. */
  quizScenarios: [
    { text: "Je stuurt een salarisoverzicht naar de accountant.", kw: ["salaris", "loon", "payroll", "personeel", "hr"] },
    { text: "Je schrijft een persbericht dat morgen op de website komt.", kw: ["persbericht", "website", "openbaar", "publiek", "public"] },
    { text: "Je maakt een werkinstructie voor alle collega’s.", kw: ["werkinstructie", "instructie", "intern", "algemeen", "protocol"] },
    { text: "Je verwerkt een verwijsbrief met patiëntgegevens.", kw: ["patiënt", "patient", "medisch", "zorg"] },
    { text: "Je bereidt een geheim collegevoorstel voor.", kw: ["geheim", "college", "bestuur", "raadsvoorstel"] },
    { text: "Je deelt een contract met een vaste leverancier.", kw: ["partner", "extern", "leverancier", "contract"] },
    { text: "Je maakt een beschikking voor een inwoner in het sociaal domein.", kw: ["sociaal", "wmo", "jeugd", "beschikking", "inwoner"] },
    { text: "Je werkt aan stukken over een mogelijke overname.", kw: ["fusie", "overname", "strategisch", "directie", "management"] },
  ],

  /* Adoptie meten: KPI's met de plek in de Microsoft Purview-portal. learn = sleutels uit CATALOG.learn.
     target = VOORBEELDDOEL (geen norm van Microsoft); de view toont het als ‘Voorbeelddoel – samen vaststellen’. */
  kpis: [
    { key: "labeled", icon: "tag", title: "Gelabelde documenten", target: "≥ 80% van nieuwe documenten gelabeld na 3 maanden",
      where: "Information Protection › Explorers › Data explorer (klassiek: Content explorer)",
      how: "Bekijk per label het aantal items per locatie (Exchange, SharePoint, OneDrive). Zet dit af tegen het totaal aantal documenten, bijv. uit de gebruiksrapporten in het Microsoft 365-beheercentrum.",
      learn: ["dataExplorer", "contentExplorer"] },
    { key: "applied", icon: "chart", title: "Labelgebruik per label", target: "Elk label wordt gebruikt; geen label > 70% tenzij standaardlabel",
      where: "Information Protection › Explorers › Activity explorer",
      how: "Filter op ‘Sensitivity labels applied, changed, or removed’ en kijk naar de activiteit Label applied per label en afdeling. Activity explorer toont maximaal 30 dagen.",
      learn: ["explorers"] },
    { key: "downgrade", icon: "redo", title: "Labels verlaagd met reden", target: "Dalend; < 5% van alle labelwijzigingen",
      where: "Activity explorer › activiteit Label changed / Label removed",
      how: "Tel de wijzigingen naar een lager label of het verwijderen van een label. Open een event voor de details, zoals de opgegeven reden (justification). Bespreek patronen met de key-users.",
      learn: ["explorers"] },
    { key: "dlp", icon: "shield", title: "DLP-meldingen en overrides", target: "Overrides < 10% van de matches; false positives dalend",
      where: "Data Loss Prevention › Alerts en Activity explorer (DLP-events)",
      how: "Vergelijk het aantal DLP-matches met het aantal overrides met zakelijke reden en gemelde false positives. Veel overrides = regel te streng of uitleg onduidelijk.",
      learn: ["dlpAlerts", "explorers"] },
    { key: "autosim", icon: "wand", title: "Auto-labeling in simulatie", target: "≥ 90% juiste matches vóór inschakelen",
      where: "Information Protection › Auto-labeling policies › policy › simulatieresultaten",
      how: "Controleer een steekproef van de gevonden items: krijgt het juiste document het juiste label? Pas informatietypen of drempels aan en draai de simulatie opnieuw.",
      learn: ["labelsAuto"] },
    { key: "copilot", icon: "sparkle", title: "Copilot en AI-gebruik", target: "Gevoelige interacties dalend; geen hits op de strengste labels",
      where: "DSPM for AI › Reports (nieuwe ervaring: Data Security Posture Management)",
      how: "Bekijk interacties met Copilot en andere AI-apps, en welke gevoelige informatie en labels daarin voorkomen. Gebruik dit om oversharing te vinden en DLP voor Copilot af te stemmen.",
      learn: ["dspmAi", "dlpCopilot"] },
    { key: "endpoint", icon: "laptop", title: "Activiteit op apparaten", target: "Geblokkeerde USB- en printacties dalend na training",
      where: "Activity explorer › filter Endpoint DLP activities",
      how: "Bekijk welke acties met gelabelde bestanden op onboarded apparaten zijn gewaarschuwd of geblokkeerd (USB, afdrukken, upload). Alleen zichtbaar voor apparaten die zijn aangesloten.",
      learn: ["endpointUsing", "explorers"] },
    { key: "support", icon: "chat", title: "Vragen en tickets", target: "Tickets over labels dalen na 6 weken",
      where: "Eigen servicedesk (buiten Purview)",
      how: "Label tickets met ‘labels/DLP’. Veel vragen over één label of melding? Pas de beschrijving, de policy tip of de spiekbrief aan.",
      learn: [] },
  ],

  /* Illustraties (eigen inline SVG, viewBox 160×100). Klassen worden gestyled in css/r5-adopt.css; --lc = labelkleur. */
  scenes: {
    doc: `<circle class="sc-bg" cx="80" cy="54" r="44"/><circle class="sc-dot" cx="24" cy="26" r="3"/><circle class="sc-dot" cx="138" cy="84" r="2.5"/><rect class="sc-f" x="36" y="20" width="88" height="56" rx="6"/><rect class="sc-m" x="42" y="26" width="76" height="44" rx="3"/><path class="sc-f" d="M26 80h108l-7 9H33z"/><rect class="sc-p" x="64" y="30" width="32" height="38" rx="2"/><rect class="sc-l" x="64" y="30" width="32" height="6" rx="2"/><path class="sc-ln" d="M69 44h22M69 50h18M69 56h22M69 62h12"/><path class="sc-l" d="M106 12h24v16h-24l-8-8z"/><circle class="sc-w" cx="106" cy="20" r="2.4"/>`,
    mail: `<circle class="sc-bg" cx="80" cy="54" r="44"/><circle class="sc-dot" cx="20" cy="30" r="3"/><rect class="sc-f" x="24" y="34" width="64" height="44" rx="5"/><path class="sc-o" d="M25 39l31 22 31-22"/><rect class="sc-l" x="30" y="68" width="24" height="6" rx="3"/><path class="sc-o sc-dash" d="M94 54c10-14 22-17 32-12"/><path class="sc-o" d="M119 36l8 6-9 4"/><circle class="sc-f" cx="132" cy="66" r="15"/><path class="sc-o sc-thin" d="M117 66h30M132 51c-7 8-7 22 0 30M132 51c7 8 7 22 0 30"/>`,
    share: `<circle class="sc-bg" cx="80" cy="54" r="44"/><circle class="sc-dot" cx="140" cy="22" r="3"/><g class="sc-cloud"><circle cx="64" cy="56" r="14"/><circle cx="84" cy="44" r="19"/><circle cx="104" cy="57" r="12"/><rect x="52" y="56" width="64" height="16" rx="8"/></g><g transform="rotate(-30 84 58)"><rect class="sc-o" x="70" y="53" width="17" height="10" rx="5"/><rect class="sc-o" x="82" y="53" width="17" height="10" rx="5"/></g><rect class="sc-p" x="18" y="42" width="24" height="30" rx="2"/><rect class="sc-l" x="18" y="42" width="24" height="5" rx="2"/><path class="sc-ln" d="M23 54h14M23 60h10M23 66h14"/><circle class="sc-b" cx="138" cy="48" r="7"/><path class="sc-b" d="M126 74a12 12 0 0 1 24 0z"/>`,
    teams: `<circle class="sc-bg" cx="80" cy="54" r="44"/><circle class="sc-b" cx="20" cy="38" r="8"/><rect class="sc-f" x="32" y="22" width="66" height="34" rx="11"/><path class="sc-ln" d="M43 34h42M43 44h28"/><circle class="sc-a" cx="142" cy="72" r="8"/><rect class="sc-tint" x="62" y="54" width="70" height="32" rx="11"/><rect class="sc-p" x="70" y="59" width="17" height="22" rx="2"/><rect class="sc-l" x="70" y="59" width="17" height="5" rx="1"/><path class="sc-ln" d="M94 66h28M94 75h18"/>`,
    copilot: `<circle class="sc-bg" cx="80" cy="54" r="44"/><circle class="sc-dot" cx="22" cy="78" r="3"/><rect class="sc-f" x="32" y="16" width="96" height="70" rx="10"/><rect class="sc-tint" x="72" y="24" width="48" height="14" rx="7"/><path class="sc-ln" d="M42 50h54M42 58h42M42 66h48"/><rect class="sc-l" x="42" y="73" width="32" height="7" rx="3.5"/><path class="sc-a" d="M116 50l3.5 9 9 3.5-9 3.5-3.5 9-3.5-9-9-3.5 9-3.5z"/><path class="sc-a sc-small" d="M104 44l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z"/>`,
    usb: `<circle class="sc-bg" cx="80" cy="54" r="44"/><rect class="sc-f" x="22" y="24" width="76" height="48" rx="6"/><rect class="sc-m" x="28" y="30" width="64" height="36" rx="3"/><path class="sc-f" d="M14 76h92l-6 8H20z"/><rect class="sc-p" x="48" y="34" width="24" height="28" rx="2"/><rect class="sc-l" x="48" y="34" width="24" height="5" rx="2"/><g transform="rotate(18 126 56)"><rect class="sc-f" x="116" y="40" width="20" height="36" rx="4"/><rect class="sc-m" x="120" y="30" width="12" height="11" rx="1"/><circle class="sc-l" cx="126" cy="64" r="3"/></g><path class="sc-o sc-dash" d="M98 50c6-4 10-4 14-2"/>`,
    downgrade: `<circle class="sc-bg" cx="80" cy="54" r="44"/><circle class="sc-dot" cx="140" cy="22" r="3"/><path class="sc-l" d="M44 18h38v18H44l-9-9z"/><circle class="sc-w" cx="44" cy="27" r="2.6"/><path class="sc-o" d="M60 42v18M52 53l8 8 8-8"/><path class="sc-g" d="M44 66h38v18H44l-9-9z"/><circle class="sc-w" cx="44" cy="75" r="2.6"/><rect class="sc-f" x="94" y="34" width="50" height="32" rx="9"/><path class="sc-f" d="M102 64l-4 10 12-8"/><path class="sc-ln" d="M103 46h32M103 55h22"/>`,
    phone: `<circle class="sc-bg" cx="80" cy="54" r="44"/><circle class="sc-dot" cx="26" cy="30" r="3"/><rect class="sc-f" x="58" y="10" width="42" height="80" rx="9"/><rect class="sc-m" x="63" y="18" width="32" height="62" rx="3"/><rect class="sc-l" x="63" y="18" width="32" height="7" rx="2"/><path class="sc-ln" d="M68 34h22M68 42h18M68 50h22M68 58h14"/><circle class="sc-ln2" cx="79" cy="85" r="2"/><rect class="sc-b" x="108" y="48" width="24" height="20" rx="4"/><path class="sc-o" d="M113 48v-6a7 7 0 0 1 14 0v6"/><circle class="sc-w" cx="120" cy="57" r="2.6"/>`,
  },
};

/* Communicatiepakket – tekstsjablonen. c = context uit AdoptKit.ctx(st) (platte tekst; wordt bij tonen ge-escaped). */
CATALOG.adoption.comms = [
  {
    key: "mail", icon: "mail", title: "Aankondiging van het management", desc: "E-mail van directie of management aan alle medewerkers.",
    text: (c) => [
      `Onderwerp: ${c.startDate ? `Vanaf ${c.startDate}: ` : ""}zo gaan we zorgvuldig om met informatie`,
      "",
      "Beste collega,",
      "",
      `Informatie is een van de belangrijkste dingen die we bij ${c.org} hebben. Daarom gaan we gevoeligheidslabels (sensitivity labels) gebruiken in Microsoft 365. Een label laat in één oogopslag zien hoe gevoelig een document of e-mail is, en zorgt waar nodig automatisch voor de juiste bescherming.`,
      "",
      "Welke labels zijn er?",
      ...c.labelLines.map((x) => `• ${x}`),
      "",
      "Wat merk je ervan?",
      ...c.changes.slice(0, 6).map((x) => `• ${x}`),
      "",
      "Planning",
      ...c.planLines.map((x) => `• ${x}`),
      "",
      "Hulp nodig?",
      `Op ${c.link} vind je een spiekbrief en antwoorden op veelgestelde vragen. Heb je een vraag? Neem contact op met ${c.contact} of met ${c.desk}.`,
      "",
      "Dank je wel: samen houden we onze informatie veilig.",
      "",
      "Met vriendelijke groet,",
      c.sender,
    ].join("\n"),
  },
  {
    key: "intranet", icon: "globe", title: "Intranetartikel", desc: "Uitgebreider bericht voor intranet of nieuwsbrief, met de spiekbriefvragen.",
    text: (c) => [
      `Nieuw bij ${c.org}: zo label je informatie`,
      "",
      `${c.startDate ? `Vanaf ${c.startDate}` : "Binnenkort"} gebruiken we gevoeligheidslabels in Word, Excel, PowerPoint, Outlook en Teams. Daarmee zie je meteen hoe gevoelig informatie is, en beschermt Microsoft 365 de gevoeligste informatie automatisch.`,
      "",
      "Waarom doen we dit?",
      "We werken steeds vaker samen, op elk apparaat en met partijen buiten de organisatie. Een label zorgt ervoor dat gevoelige informatie alleen bij de juiste mensen terechtkomt – ook als een bestand per ongeluk wordt doorgestuurd.",
      "",
      "Welke labels zijn er?",
      ...c.labelLines.map((x) => `• ${x}`),
      "",
      "Welk label kies ik?",
      ...c.treeLines.map((x, i) => `${i + 1}. ${x}`),
      "Twijfel je? Kies dan het hogere label of vraag het je key-user.",
      "",
      "Wat merk je ervan?",
      ...c.changes.map((x) => `• ${x}`),
      "",
      "Tips bij een melding",
      ...c.dlpTips.map((x) => `• ${x}`),
      "",
      "Planning",
      ...c.planLines.map((x) => `• ${x}`),
      "",
      "Meer weten?",
      `Kijk op ${c.link} of neem contact op met ${c.contact} (${c.desk}).`,
    ].join("\n"),
  },
  {
    key: "faq", icon: "question", title: "Veelgestelde vragen", desc: "8–12 vragen en antwoorden, afgestemd op jullie ontwerp.",
    text: (c) => [`Veelgestelde vragen – gevoeligheidslabels bij ${c.org}`, "", ...c.faq.map((x, i) => `${i + 1}. ${x.q}\n${x.a}\n`)].join("\n").trim(),
  },
];

/* FAQ: q + a(c) en optionele voorwaarde when(c). Volgorde = volgorde in het pakket. */
CATALOG.adoption.faq = [
  { q: "Wat is een gevoeligheidslabel?", a: (c) => "Een label (in de apps: Gevoeligheid of Sensitivity) laat zien hoe gevoelig een document of e-mail is. Het label wordt in het bestand opgeslagen en reist mee als je het deelt. Sommige labels beschermen ook: met een markering, of met versleuteling zodat alleen bevoegden het kunnen openen." },
  { q: "Welke labels zijn er en wanneer gebruik ik welk label?", a: (c) => `${c.labelLines.join(" ")} Twijfel je? Kies het hogere label.` },
  { q: "Hoe kies ik een label?", a: (c) => `In Word, Excel, PowerPoint en Outlook kies je een label via de knop Gevoeligheid (Sensitivity) op het lint of via de balk bovenin het venster.${c.defaultLabel ? ` Nieuwe documenten krijgen standaard het label ‘${c.defaultLabel}’; pas het aan als dat niet klopt.` : ""}${c.mandatory ? " Labelen is verplicht: de app vraagt om een label als je opslaat of verstuurt zonder label." : ""}` },
  { q: "Wat als ik het verkeerde label kies?", a: (c) => `Geen probleem: je kunt het label altijd aanpassen. Een hoger label kies je gewoon.${c.justification ? " Kies je een lager label of haal je het label weg, dan vraagt de app om een korte reden (justification)." : ""} Labelwijzigingen worden vastgelegd, zodat we het beleid kunnen verbeteren – niet om jou te controleren.` },
  { q: "Waarom kan ik dit bestand niet extern delen of versturen?", a: (c) => `Data Loss Prevention (DLP) controleert of gevoelige informatie de organisatie verlaat. ${c.dlpSummary} De melding (policy tip) vertelt waarom; lees hem goed. Denk je dat de melding onterecht is? Neem contact op met ${c.desk}.` },
  { q: "Werkt dit ook op mijn telefoon?", a: (c) => `Ja. Labels werken in Word, Excel, PowerPoint en Outlook op Windows, Mac, iOS en Android en in de webversies.${c.hasEncryption ? " Versleutelde bestanden en e-mails open je na aanmelden met je werkaccount." : ""}` },
  { q: "Wat doet Copilot met gelabelde documenten?", a: (c) => `Microsoft 365 Copilot gebruikt alleen informatie waar jij zelf toegang toe hebt en houdt rekening met labels. Maakt Copilot nieuwe inhoud op basis van gelabelde bestanden, dan krijgt die het label met de hoogste prioriteit mee. Bij versleutelde bestanden kan Copilot de inhoud alleen gebruiken als jij de rechten VIEW en EXTRACT (kopiëren) hebt.${c.copilotBlock ? ` Bestanden met ${c.copilotBlock} worden bovendien niet in Copilot-antwoorden verwerkt.` : ""}` },
  { q: "Kan een externe ontvanger een versleuteld bestand openen?", when: (c) => c.hasEncryption, a: (c) => `Alleen als het label externe partijen toegang geeft${c.extLabels ? ` (zoals ${c.extLabels})` : ""}. De ontvanger meldt zich dan aan met een werk- of Microsoft-account. Bij andere versleutelde labels kan alleen de eigen organisatie het openen – ook als het per ongeluk wordt doorgestuurd.` },
  { q: "Waarom stelt Office een label voor?", when: (c) => c.hasAuto, a: () => "Office herkent gevoelige gegevens, zoals een BSN of IBAN, en stelt dan een passend label voor of past het automatisch toe. Je ziet altijd een melding; bij een voorstel kies je zelf of je het overneemt." },
  { q: "Waarom kan ik niet kopiëren naar een USB-stick of afdrukken?", when: (c) => c.endpoint, a: (c) => `Op apparaten van de organisatie beschermt Endpoint DLP gevoelige bestanden. ${c.endpoint} Je ziet dan een melding van Windows. Heb je een goede reden, neem dan contact op met ${c.desk}.` },
  { q: "Moet ik al mijn oude documenten opnieuw labelen?", a: (c) => `Nee. Je labelt nieuwe documenten en documenten die je wijzigt.${c.hasServiceAuto ? " Daarnaast labelt automatische labeling bestaande bestanden in SharePoint en OneDrive." : ""}` },
  { q: "Bij wie kan ik terecht met vragen?", a: (c) => `Kijk eerst op ${c.link}. Kom je er niet uit? Neem contact op met ${c.contact} of met ${c.desk}.` },
];
