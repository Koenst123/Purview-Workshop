/* Catalogus – Purview Experience Hub (landingspagina).
   Platte tekst; **vet** wordt door Site.rich() omgezet na escapen. Feiten volgens Microsoft Learn (zie learn-sleutels). */

Object.assign(CATALOG.learn, {
  purviewPortal: { title: "Learn about the Microsoft Purview portal", url: LEARN_BASE + "purview/purview-portal" },
});

CATALOG.hub = {
  pillars: [
    {
      id: "know", n: "01", title: "Ken uw gegevens", short: "Ontdekken", icon: "search", visual: "sits", learn: "sitLearn", module: "data",
      lead: "U kunt alleen beschermen wat u kent. Purview herkent gevoelige informatie automatisch in documenten, e-mail, chats en op apparaten.",
      points: [
        "**Ingebouwde informatietypen** herkennen onder meer het BSN, IBAN- en paspoortnummers, met controle op het patroon, het controlegetal en woorden in de buurt.",
        "**Trainable classifiers** herkennen soorten documenten, zoals contracten, cv's of facturen.",
        "**Content explorer** en **Activity explorer** laten zien waar gevoelige informatie staat en wat ermee gebeurt.",
      ],
      tech: "Sensitive information types (SIT's), Exact Data Match (EDM), document fingerprinting, trainable classifiers, Content explorer, Activity explorer.",
    },
    {
      id: "protect", n: "02", title: "Label en bescherm", short: "Labelen", icon: "tag", visual: "label", learn: "labels", module: "labels",
      lead: "Een sensitivity label is een herkenbaar etiket op een document, e-mail of vergadering. Het label kan bescherming meenemen, waar het bestand ook naartoe gaat.",
      points: [
        "**Zichtbaar waar mensen werken:** in Word, Excel, PowerPoint, Outlook en Teams.",
        "**Optionele bescherming:** versleuteling, kop- en voettekst of een watermerk.",
        "**Handmatig, aanbevolen of automatisch** toegepast, afhankelijk van uw beleid.",
      ],
      tech: "Sensitivity labels, labelbeleid, client-side en service-side auto-labeling, labels voor Teams, Microsoft 365 Groups en SharePoint-sites.",
    },
    {
      id: "prevent", n: "03", title: "Voorkom datalekken", short: "Voorkomen", icon: "shield", visual: "dlp", learn: "dlp", module: "dlp",
      lead: "Data Loss Prevention (DLP) kijkt mee op het moment van delen. Medewerkers krijgen uitleg op het juiste moment, en echt risicovolle acties kunnen worden geblokkeerd.",
      points: [
        "**Policy tips** in Outlook, Teams, SharePoint en OneDrive leggen uit wat er aan de hand is.",
        "**Per situatie kiezen:** alleen vastleggen, blokkeren met override (met reden) of blokkeren.",
        "**Ook buiten de mailbox:** op Windows- en macOS-apparaten (Endpoint DLP) en voor Microsoft 365 Copilot.",
      ],
      tech: "DLP-policies voor Exchange, SharePoint, OneDrive, Teams, Devices en Microsoft 365 Copilot; simulatiemodus, policy tips en overrides.",
    },
    {
      id: "monitor", n: "04", title: "Bewaak en verbeter", short: "Bijsturen", icon: "chart", visual: "alerts", learn: "dlpAlerts", module: "monitor",
      lead: "Inzicht maakt het verschil. U ziet welke regels afgaan, welke meldingen opvolging vragen en waar u uw beleid kunt verfijnen.",
      points: [
        "**DLP-alerts** in Microsoft Purview en in Microsoft Defender XDR.",
        "**Activity explorer** toont labelwijzigingen en DLP-gebeurtenissen per gebruiker, locatie en bestand.",
        "**Eerst simuleren**, dan bijsturen en pas daarna handhaven.",
      ],
      tech: "DLP Alerts, Activity explorer, Content explorer, audit log en incidenten in Microsoft Defender XDR.",
    },
  ],

  apps: [
    { title: "Word, Excel en PowerPoint", logos: ["word", "excel", "powerpoint"], text: "Labels in het lint en de statusbalk, aanbevelingen en automatisch labelen tijdens het werk." },
    { title: "Outlook", logos: ["outlook"], text: "Labels en versleuteling op e-mail en policy tips voordat een bericht de deur uitgaat." },
    { title: "SharePoint", logos: ["sharepoint"], text: "Standaardlabels per bibliotheek, labels voor sites en DLP bij het delen van bestanden." },
    { title: "OneDrive", logos: ["onedrive"], text: "DLP bij delen en automatisch labelen van opgeslagen bestanden, eerst in simulatie." },
    { title: "Teams", logos: ["teams"], text: "Labels voor teams en vergaderingen, DLP in chats en kanaalberichten." },
    { title: "Microsoft 365 Copilot", logos: ["copilot"], text: "Werkt met de rechten van de gebruiker. DLP kan inhoud met bepaalde labels uitsluiten." },
    { title: "Windows en macOS", logos: ["windows"], text: "Endpoint DLP bewaakt kopiëren naar USB, printen, uploaden en plakken." },
    { title: "Microsoft Edge", logos: ["edge"], text: "Beperk plakken en uploaden van gevoelige inhoud naar websites die u niet vertrouwt." },
  ],

  approach: [
    { title: "Verkennen", icon: "search", text: "Welke informatie is gevoelig en waar staat die? Samen brengen we het in kaart.", link: ["academy", "data", "Gevoelige informatie herkennen"] },
    { title: "Ontwerpen", icon: "edit", text: "Labels, beleid en DLP-regels ontwerpen in de ontwerpworkshop, samen met de business.", link: ["start", "", "Naar de ontwerpworkshop"] },
    { title: "Simuleren", icon: "flask", text: "DLP en auto-labeling eerst in simulatie: wat zou er gebeuren, zonder impact op het werk?", link: ["academy", "dlp", "DLP en simulatie"] },
    { title: "Uitrollen", icon: "play", text: "Gefaseerd aanzetten, met policy tips en communicatie. Pas daarna blokkeren waar het moet.", link: ["academy", "roadmap", "Van ontwerp naar uitrol"] },
    { title: "Borgen", icon: "chart", text: "Alerts opvolgen, regels bijstellen en adoptie meten. Informatiebescherming is nooit af.", link: ["academy", "monitor", "Monitoren en bijsturen"] },
  ],

  faq: [
    {
      q: "Wat is het verschil tussen een sensitivity label en DLP?",
      a: "Een label zegt **wat** iets is en reist mee met het bestand. Het kan zelf bescherming toepassen, zoals versleuteling. DLP bepaalt **wat er mag gebeuren** op het moment dat iemand iets deelt, verstuurt of kopieert, en kan het label daarbij als voorwaarde gebruiken. Samen vormen ze een sterk duo.",
    },
    {
      q: "Welke licentie hebben we nodig?",
      a: "Deze Hub gaat uit van **Microsoft 365 E5**. Met E3 kunt u labels handmatig toepassen en DLP gebruiken voor Exchange, SharePoint en OneDrive. Automatisch labelen, Endpoint DLP, DLP voor Teams-chats, trainable classifiers en EDM vragen E5 of een passende add-on. Controleer altijd de actuele licentierichtlijnen van Microsoft.",
      learn: "licensing",
    },
    {
      q: "Merken medewerkers hier veel van?",
      a: "Dat bepaalt u zelf. De meeste organisaties beginnen met labels en **policy tips die uitleggen** in plaats van blokkeren. Pas als de regels goed zijn afgesteld, wordt er in de echt gevoelige situaties geblokkeerd, vaak met een override waarbij de medewerker een zakelijke reden opgeeft.",
    },
    {
      q: "Wat betekent dit voor Microsoft 365 Copilot?",
      a: "Copilot werkt met de rechten van de gebruiker: wat iemand niet mag openen, gebruikt Copilot ook niet. Bij versleutelde inhoud heeft de gebruiker de rechten **VIEW en EXTRACT** nodig. Met een DLP-policy voor de locatie Microsoft 365 Copilot kunt u inhoud met bepaalde labels uitsluiten van verwerking in antwoorden.",
      learn: "dlpCopilot",
    },
    {
      q: "Moeten we alles in één keer invoeren?",
      a: "Nee. Een **gefaseerde aanpak** werkt het best: eerst labels en bewustwording, dan DLP in simulatie, daarna per locatie handhaven. Zo houdt u grip op de impact en kunt u tussentijds bijsturen.",
    },
    {
      q: "Wat gebeurt er met gegevens in deze Hub?",
      a: "Niets verlaat uw apparaat. De Hub werkt **volledig offline** en gebruikt fictieve voorbeelden. Les- en werkdagkeuzes blijven in deze browser bewaard; ingevoerde oefentekst niet. Via ‘Leervoortgang wissen’ begint u opnieuw, zonder uw ontwerp te wijzigen. Gebruik geen echte persoonsgegevens in oefeningen.",
    },
  ],
};
