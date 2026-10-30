/* Catalogus – Purview Experience Hub (landingspagina).
   Platte tekst; **vet** wordt door Site.rich() omgezet na escapen. Feiten volgens Microsoft Learn (zie learn-sleutels). */

Object.assign(CATALOG.learn, {
  purviewPortal: { title: "Learn about the Microsoft Purview portal", url: LEARN_BASE + "purview/purview-portal" },
});

CATALOG.hub = {
  pillars: [
    {
      id: "know", n: "01", title: "Ken je gegevens", short: "Herkennen", icon: "search", visual: "sits", learn: "sitLearn", module: "data",
      lead: "Je kunt alleen beschermen wat je kent. Purview kan gevoelige informatie herkennen in documenten, e-mail, chats en op apparaten, zodra je organisatie daar regels voor instelt. Vaste nummers zoals een BSN gaan goed; gewone tekst, bijvoorbeeld over een diagnose, vaak niet.",
      points: [
        "**Ingebouwde informatietypen** herkennen onder meer BSN-, IBAN- en paspoortnummers. Ze kijken naar het patroon, waar mogelijk naar een controlegetal, en naar woorden in de buurt.",
        "**Trainable classifiers** herkennen soorten documenten, zoals contracten, cv's of facturen.",
        "In **Content explorer** zien beheerders met een speciale rol waar gevoelige informatie staat. **Activity explorer** laat zien wat ermee gebeurt, bijvoorbeeld of een bestand is gedeeld. Je organisatie bepaalt wie die rollen krijgt.",
      ],
      tech: "Sensitive information types (SIT's), Exact Data Match (EDM), document fingerprinting, trainable classifiers, Content explorer, Activity explorer.",
    },
    {
      id: "protect", n: "02", title: "Label en bescherm", short: "Labelen", icon: "tag", visual: "label", learn: "labels", module: "labels",
      lead: "Een sensitivity label is een etiket als ‘Vertrouwelijk’ op een document, e-mail of vergadering. Het label kan bescherming meenemen, waar het bestand ook naartoe gaat.",
      points: [
        "**Zichtbaar waar mensen werken:** in Word, Excel, PowerPoint, Outlook en Teams.",
        "**Optionele bescherming:** versleuteling, kop- en voettekst of een watermerk.",
        "**Handmatig, aanbevolen of automatisch** toegepast, afhankelijk van je beleid.",
      ],
      tech: "Sensitivity labels, labelbeleid, client-side en service-side auto-labeling, labels voor Teams, Microsoft 365 Groups en SharePoint-sites.",
    },
    {
      id: "prevent", n: "03", title: "Voorkom datalekken", short: "Voorkomen", icon: "shield", visual: "dlp", learn: "dlp", module: "dlp",
      lead: "Data Loss Prevention (DLP) kijkt mee op het moment dat iemand iets deelt. Medewerkers krijgen uitleg op het juiste moment. Echt risicovolle acties kun je blokkeren.",
      points: [
        "**Policy tips** in Outlook, Teams, SharePoint en OneDrive leggen uit wat er aan de hand is.",
        "**Per situatie kiezen:** alleen vastleggen, blokkeren met override (met reden) of volledig blokkeren.",
        "**Ook buiten de mailbox:** op Windows- en macOS-apparaten (Endpoint DLP) en voor Microsoft 365 Copilot.",
      ],
      tech: "DLP-policies voor Exchange, SharePoint, OneDrive, Teams, Devices en Microsoft 365 Copilot; simulatiemodus, policy tips en overrides.",
    },
    {
      id: "monitor", n: "04", title: "Bewaak en verbeter", short: "Bijsturen", icon: "chart", visual: "alerts", learn: "dlpAlerts", module: "monitor",
      lead: "Je ziet welke regels afgaan en welke meldingen opvolging vragen. Zo weet je waar je het beleid kunt verfijnen.",
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
    { title: "Microsoft 365 Copilot", logos: ["copilot"], text: "Copilot gebruikt alles waar jij toegang toe hebt, dus ook bestanden die te ruim gedeeld zijn. Met DLP houd je bestanden met bepaalde labels buiten de antwoorden." },
    { title: "Windows en macOS", logos: ["windows"], text: "Endpoint DLP bewaakt kopiëren naar USB, printen, uploaden en plakken." },
    { title: "Microsoft Edge", logos: ["edge"], text: "Beperk plakken en uploaden van gevoelige inhoud naar websites die je niet vertrouwt." },
  ],

  approach: [
    { title: "Verkennen", icon: "search", text: "Samen brengen we in kaart welke informatie gevoelig is en waar die staat.", link: ["academy", "data", "Gevoelige informatie herkennen"] },
    { title: "Ontwerpen", icon: "edit", text: "In de ontwerpworkshop ontwerp je samen met de business labels, beleid en DLP-regels.", link: ["start", "", "Open de ontwerpworkshop"] },
    { title: "Simuleren", icon: "flask", text: "Je zet DLP-regels en automatisch labelen eerst in simulatie. Beheerders zien in rapporten wat er zou gebeuren; medewerkers merken nog niets, tenzij je policy tips al aanzet.", link: ["academy", "dlp", "Bekijk DLP-simulatie"] },
    { title: "Uitrollen", icon: "play", text: "Zet regels stap voor stap aan, met policy tips en communicatie. Blokkeer pas daarna, waar nodig.", link: ["academy", "roadmap", "Plan de uitrol"] },
    { title: "Borgen", icon: "chart", text: "Volg alerts op, stel regels bij en meet de adoptie. Informatiebescherming blijft doorlopend werk.", link: ["academy", "monitor", "Monitoren en bijsturen"] },
  ],

  faq: [
    {
      q: "Wat is het verschil tussen een sensitivity label en DLP?",
      a: "Een label zegt **wat** iets is en reist mee met het bestand. Het kan zelf bescherming toepassen, zoals versleuteling. DLP bepaalt **wat er mag** op het moment dat iemand iets deelt, verstuurt of kopieert. DLP kan het label daarbij als voorwaarde gebruiken. Zo vullen ze elkaar aan.",
    },
    {
      q: "Welke licentie hebben we nodig?",
      a: "Deze Hub gaat uit van **Microsoft 365 E5**. Met E3 kun je labels handmatig toepassen en DLP gebruiken voor Exchange, SharePoint en OneDrive. Automatisch labelen, Endpoint DLP, DLP voor Teams-chats, trainable classifiers en EDM vragen E5 of een passende add-on. Controleer altijd de actuele licentierichtlijnen van Microsoft.",
      learn: "licensing",
    },
    {
      q: "Merken medewerkers hier veel van?",
      a: "Dat bepaal je zelf. De meeste organisaties beginnen met labels en **policy tips die uitleggen** in plaats van blokkeren. Pas als de regels goed zijn afgesteld, blokkeer je in echt gevoelige situaties. Vaak kan de medewerker dan met een zakelijke reden toch doorgaan (override). Die keuze en de reden worden vastgelegd; alleen beheerders met de juiste rol kunnen dat inzien.",
    },
    {
      q: "Wat betekent dit voor Microsoft 365 Copilot?",
      a: "Copilot werkt met de rechten van de gebruiker. Wat iemand niet mag openen, gebruikt Copilot ook niet. Bij versleutelde inhoud heeft de gebruiker de rechten **VIEW en EXTRACT** nodig. Met een DLP-policy voor de locatie Microsoft 365 Copilot kun je inhoud met bepaalde labels uitsluiten van verwerking in antwoorden.",
      learn: "dlpCopilot",
    },
    {
      q: "Moeten we alles in één keer invoeren?",
      a: "Nee. Een **gefaseerde aanpak** werkt het best: eerst labels en bewustwording, dan DLP in simulatie, daarna per locatie handhaven. Zo houd je grip op de impact en kun je tussentijds bijsturen.",
    },
    {
      q: "Wat gebeurt er met gegevens in deze Hub?",
      a: "Niets verlaat je apparaat. De Hub werkt **volledig offline** en gebruikt fictieve voorbeelden. Je les- en werkdagkeuzes blijven in deze browser bewaard; ingevoerde oefentekst niet. Met ‘Leervoortgang wissen’ begin je opnieuw. Je ontwerp blijft dan ongewijzigd. Gebruik geen echte persoonsgegevens in oefeningen.",
    },
  ],
};
