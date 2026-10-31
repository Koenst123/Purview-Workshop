/* Catalogus – Purview Experience Hub (landingspagina).
   Platte tekst; **vet** wordt door Site.rich() omgezet na escapen. Feiten volgens Microsoft Learn (zie learn-sleutels). */

Object.assign(CATALOG.learn, {
  purviewPortal: { title: "Learn about the Microsoft Purview portal", url: LEARN_BASE + "purview/purview-portal" },
});

CATALOG.hub = {
  pillars: [
    {
      id: "know", n: "01", title: "Ken je gegevens", short: "Herkennen", icon: "search", visual: "sits", learn: "sitLearn", module: "data",
      lead: "Een BSN in een Excel-lijst of een IBAN in een mail: zulke vaste nummers kan Purview herkennen in documenten, e-mail, chats en op laptops, zodra je organisatie daar regels voor maakt. Gewone tekst, zoals een zin over een diagnose, herkent Purview veel minder goed.",
      points: [
        "**Ingebouwde informatietypen** herkennen onder meer BSN-, IBAN- en paspoortnummers. Ze kijken naar het patroon, waar mogelijk naar een controlegetal, en naar woorden in de buurt.",
        "**Trainable classifiers** herkennen soorten documenten, zoals contracten, cv's of facturen. De meeste zijn getraind op Engelse teksten.",
        "In **Content explorer** zien beheerders met een speciale rol waar gevoelige informatie staat. **Activity explorer** laat zien wat ermee gebeurt, bijvoorbeeld of een bestand is gedeeld. Je organisatie bepaalt wie die rollen krijgt.",
      ],
      tech: "Sensitive information types (SIT's), Exact Data Match (EDM), document fingerprinting, trainable classifiers, Content explorer, Activity explorer.",
    },
    {
      id: "protect", n: "02", title: "Label en bescherm", short: "Labelen", icon: "tag", visual: "label", learn: "labels", module: "labels",
      lead: "Een sensitivity label is een etiket als ‘Vertrouwelijk’ op een document, e-mail of vergadering. Iedereen ziet meteen hoe gevoelig iets is. Als je organisatie dat instelt, neemt het label ook bescherming mee, bijvoorbeeld versleuteling die blijft werken als het bestand wordt doorgestuurd.",
      points: [
        "**Zichtbaar waar mensen werken:** in Word, Excel, PowerPoint, Outlook en Teams.",
        "**Bescherming als je dat kiest:** versleuteling, kop- en voettekst of een watermerk. Een label zonder versleuteling verandert niets aan wie een bestand kan openen.",
        "**Zelf kiezen, voorgesteld krijgen of automatisch:** dat bepaalt het labelbeleid van je organisatie.",
      ],
      tech: "Sensitivity labels, labelbeleid, client-side en service-side auto-labeling, labels voor Teams, Microsoft 365 Groups en SharePoint-sites.",
    },
    {
      id: "prevent", n: "03", title: "Voorkom datalekken", short: "Voorkomen", icon: "shield", visual: "dlp", learn: "dlp", module: "dlp",
      lead: "Data Loss Prevention (DLP) kijkt mee op het moment dat iemand iets mailt, deelt of kopieert. Meestal krijgt de medewerker eerst uitleg en een keuze. Alleen echt risicovolle acties houd je tegen, en dan liefst met een veilige route ernaast.",
      points: [
        "**Policy tips** in Outlook, Teams, SharePoint en OneDrive leggen uit wat er aan de hand is.",
        "**Per situatie kiezen:** alleen vastleggen, doorgaan met een reden (override) of tegenhouden.",
        "**Ook buiten de mailbox:** op beheerde Windows- en macOS-apparaten (Endpoint DLP) en voor Microsoft 365 Copilot.",
      ],
      tech: "DLP-policies voor Exchange, SharePoint, OneDrive, Teams, Devices en Microsoft 365 Copilot; simulatiemodus, policy tips en overrides.",
    },
    {
      id: "monitor", n: "04", title: "Bewaak en verbeter", short: "Bijsturen", icon: "chart", visual: "alerts", learn: "dlpAlerts", module: "monitor",
      lead: "Na de invoering zie je welke regels afgaan, waar medewerkers een reden invullen en welke meldingen opvolging vragen. Daarmee stel je regels bij die onnodig in de weg zitten of iets missen.",
      points: [
        "**DLP-alerts** in Microsoft Purview en in Microsoft Defender XDR.",
        "**Activity explorer** toont labelwijzigingen en DLP-gebeurtenissen per gebruiker, locatie en bestand.",
        "**Eerst simuleren**, dan bijstellen en pas daarna handhaven.",
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
    { title: "Microsoft 365 Copilot", logos: ["copilot"], text: "Copilot gebruikt alles waar jij toegang toe hebt, dus ook bestanden die te ruim gedeeld zijn. Met DLP houd je de inhoud van bestanden met bepaalde labels buiten de antwoorden." },
    { title: "Windows en macOS", logos: ["windows"], text: "Endpoint DLP bewaakt op beheerde apparaten kopiëren naar USB, printen, uploaden en plakken." },
    { title: "Microsoft Edge", logos: ["edge"], text: "Beperk plakken en uploaden van gevoelige inhoud naar websites die je organisatie niet vertrouwt." },
  ],

  approach: [
    { title: "Verkennen", icon: "search", text: "Samen brengen we in kaart welke informatie gevoelig is en waar die staat.", link: ["academy", "data", "Gevoelige informatie herkennen"] },
    { title: "Ontwerpen", icon: "edit", text: "In de ontwerpworkshop ontwerpt het projectteam samen met de business labels, beleid en DLP-regels.", link: ["start", "", "Open de ontwerpworkshop"] },
    { title: "Simuleren", icon: "flask", text: "DLP-regels en automatisch labelen draaien eerst in simulatie: een proefstand die niets tegenhoudt. Beheerders zien in rapporten wat er zou gebeuren; medewerkers merken niets, tenzij je policy tips al aanzet.", link: ["academy", "dlp", "Bekijk DLP-simulatie"] },
    { title: "Uitrollen", icon: "play", text: "Zet regels per afdeling of locatie aan, met policy tips en uitleg vooraf. Tegenhouden komt pas als de regels kloppen, en alleen waar het nodig is.", link: ["academy", "roadmap", "Plan de uitrol"] },
    { title: "Borgen", icon: "chart", text: "Volg alerts op, stel regels bij en kijk of medewerkers de labels gebruiken. Informatiebescherming is nooit af.", link: ["academy", "monitor", "Monitoren en bijsturen"] },
  ],

  faq: [
    {
      q: "Wat is het verschil tussen een sensitivity label en DLP?",
      a: "Een label zegt **wat** iets is en blijft bij het bestand of de mail. Het kan zelf bescherming toepassen, zoals versleuteling. DLP bepaalt **wat er mag** op het moment dat iemand iets deelt, verstuurt of kopieert. Een DLP-regel kan het label als voorwaarde gebruiken, bijvoorbeeld: bestanden met ‘Strikt vertrouwelijk’ gaan niet naar buiten.",
    },
    {
      q: "Welke licentie hebben we nodig?",
      a: "Deze Hub gaat uit van **Microsoft 365 E5**. Met E3 kun je labels handmatig toepassen en DLP gebruiken voor Exchange, SharePoint en OneDrive. Automatisch labelen, Endpoint DLP, DLP voor Teams-chats, trainable classifiers en EDM vragen E5 of een passende add-on. Licentievoorwaarden veranderen; controleer altijd de actuele richtlijnen van Microsoft.",
      learn: "licensing",
    },
    {
      q: "Merken medewerkers hier veel van?",
      a: "Dat bepaalt de organisatie. De meeste organisaties beginnen met labels en **policy tips die uitleggen** in plaats van tegenhouden. Pas als de regels goed zijn afgesteld, wordt in echt gevoelige situaties ingegrepen. Vaak kan de medewerker dan met een zakelijke reden toch doorgaan. Die keuze en de reden worden vastgelegd; alleen beheerders met de juiste rol kunnen dat inzien.",
    },
    {
      q: "Wat betekent dit voor Microsoft 365 Copilot?",
      a: "Er spelen drie dingen. **Toegang:** Copilot werkt met de rechten van de gebruiker; wat iemand niet mag openen, gebruikt Copilot ook niet. Te ruim gedeelde bestanden vindt Copilot dus wél. **Versleuteling:** bij versleutelde inhoud moet de gebruiker die inhoud mogen bekijken én overnemen. **DLP voor Copilot:** de organisatie kan bestanden en mails met bepaalde labels uitsluiten van de antwoorden. Geen van drieën vervangt het opruimen van te ruime rechten.",
      learn: "dlpCopilot",
    },
    {
      q: "Moeten we alles in één keer invoeren?",
      a: "Nee. Eerst labels en uitleg. Daarna DLP in simulatie. Pas als dat goed werkt, handhaaf je, per locatie. Zo zie je de gevolgen voor het werk voordat er iets wordt tegengehouden.",
    },
    {
      q: "Wat gebeurt er met gegevens in deze Hub?",
      a: "Niets verlaat je apparaat. De Hub werkt **volledig offline** en gebruikt verzonnen voorbeelden. Je keuzes in lessen en werkdagen blijven in deze browser bewaard; tekst die je in een oefening typt niet. Met ‘Leervoortgang wissen’ begin je opnieuw; je ontwerp blijft dan staan. Gebruik geen echte persoonsgegevens in oefeningen.",
    },
  ],
};
