/* Purview Academy – leerlijnen, modules, oefeningen en begrippenlijst.
   Feiten gecontroleerd op Microsoft Learn. Tekst is platte tekst; **vet** wordt via Site.rich() opgemaakt. */
Object.assign(CATALOG.learn, {
  medicalTerms: { title: "All medical terms and conditions", url: LEARN_BASE + "purview/sit-defn-all-medical-terms-conditions" },
});
CATALOG.academy = {
  paths: [
    { id: "begrijpen", title: "Purview begrijpen", icon: "bulb", goal: "Ontdek wat gevoelige informatie is en hoe herkenning, labels en DLP samenwerken.", modules: ["overview", "data", "labels", "dlp"] },
    { id: "veilig-werken", title: "Veilig werken en delen", icon: "users", goal: "Maak bewuste keuzes bij delen, waarschuwingen en het gebruik van Copilot.", modules: ["labels", "dlp", "endpoint", "copilot"] },
    { id: "voorbereiden", title: "Beleid en invoering voorbereiden", icon: "route", goal: "Van herkenbare situaties naar geteste afspraken en een haalbare invoering.", modules: ["data", "autolabel", "dlp", "monitor", "roadmap"] },
  ],
  practiceCards: [
    { id: "label-access", modules: ["labels", "dlp"], title: "Een label is niet hetzelfde als toegang", text: "Een vertrouwelijk bestand staat in een breed gedeelde map. Wat controleert u?", options: [
      ["Alleen het label", "Een label beperkt niet altijd de toegang. Dat hangt af van de ingestelde bescherming."],
      ["Het label en wie het bestand kan openen", "Zo controleert u zowel de gevoeligheid als de werkelijke toegang. DLP kan daarnaast het delen bewaken."],
    ] },
    { id: "site-file", modules: ["labels"], title: "Een beschermde werkplek, maar welk bestand?", text: "U downloadt een bestand uit een vertrouwelijke projectsite. Het label van de site labelt of versleutelt niet automatisch de bestanden.", options: [
      ["Vertrouwen op het label van de site", "Dat vertelt nog niet welke bescherming het losse bestand heeft."],
      ["De bescherming van het bestand controleren", "Juist buiten de projectsite is belangrijk welke bescherming met het bestand meegaat."],
    ] },
    { id: "policy-tip", modules: ["dlp"], title: "Een melding helpt u verder", text: "Een Policy tip verschijnt bij het extern delen van gevoelige gegevens. Welke veilige weg past bij het werk?", options: [
      ["Ontvanger en inhoud controleren; minder gegevens delen", "Vaak kunt u het werk afronden zonder onnodige gegevens te versturen."],
      ["Een toegestane uitzondering met een concrete werkreden", "Dat kan passend zijn als het beleid dit toestaat. Volg de afspraken; een uitzondering wordt vastgelegd."],
    ] },
    { id: "medical-text", modules: ["data", "autolabel"], title: "Geen herkenning betekent niet: onschuldig", text: "Een Nederlandstalig zorgverslag geeft geen melding. Herkenning van medische vrije tekst hangt onder meer af van de taal. Een beschrijving kan ook zonder naam gevoelig zijn.", options: [
      ["Zonder melding kan het verslag vrij worden gedeeld", "Geen melding bewijst niet dat informatie veilig is. De ingebouwde herkenning van medische termen is bijvoorbeeld Engelstalig."],
      ["Zelf beoordelen en de afgesproken bescherming toepassen", "Menselijke beoordeling blijft nodig. Laat herkenning daarnaast met verzonnen Nederlandse voorbeelden testen."],
    ] },
    { id: "copilot-share", modules: ["copilot"], title: "Copilot helpt; u kiest wat u deelt", text: "Copilot vat projectinformatie samen die u mag openen. Mag de samenvatting direct naar een grotere groep?", options: [
      ["Ja, want Copilot heeft het antwoord gemaakt", "De samenvatting kan informatie bevatten die de grotere groep niet hoort te ontvangen."],
      ["Eerst inhoud, ontvangers en bescherming controleren", "Controleer ook de juistheid. Toegang tot de bron is geen toestemming om de inhoud breder te verspreiden."],
    ] },
    { id: "pilot", modules: ["monitor", "roadmap"], title: "Eerst leren, dan breed invoeren", text: "Een maatregel kan informatie missen of gewoon werk onterecht tegenhouden. Hoe ontdekt u dat?", options: [
      ["Meteen voor iedereen blokkeren", "Onverwachte gevolgen worden dan pas tijdens het werk zichtbaar."],
      ["Eerst simuleren waar mogelijk en kleinschalig proberen", "Test risicovolle en toegestane situaties, beoordeel meldingen en gebruikerservaringen en stel daarna bij."],
    ] },
  ],
  tracks: [
    { id: "basis", n: "01", title: "Basis", icon: "book", lead: "Wat is Purview, hoe herkent het gevoelige informatie en wat doet een sensitivity label?" },
    { id: "beschermen", n: "02", title: "Beschermen", icon: "shield", lead: "Automatisch labelen en datalekken voorkomen in Microsoft 365 en op apparaten." },
    { id: "borgen", n: "03", title: "Borgen", icon: "chart", lead: "Copilot veilig gebruiken, signalen opvolgen en de uitrol goed laten landen." },
  ],

  modules: [
    {
      id: "overview", n: "01", track: "basis", icon: "layers", app: "purview", minutes: 8, widget: "map",
      title: "Purview in één oogopslag",
      short: "Welke oplossingen er zijn, hoe ze samenwerken en wat E5 toevoegt.",
      goals: [
        "U weet welke Purview-oplossingen er zijn voor databeveiliging.",
        "U begrijpt hoe Information Protection en DLP samenwerken.",
        "U kunt de Purview-portal en de E5-licentie plaatsen.",
      ],
      chapters: [
        {
          title: "Wat is Microsoft Purview?",
          text: "Microsoft Purview is de familie van Microsoft-oplossingen voor databeveiliging, data governance en compliance. Deze lessen draaien om twee onderdelen: **Information Protection** (informatie herkennen, labelen en beschermen) en **Data Loss Prevention** (voorkomen dat gevoelige informatie ongewenst de organisatie verlaat).",
          points: [
            "**Data security**: onder meer Information Protection, DLP, Insider Risk Management en DSPM.",
            "**Data governance**: zicht op en beheer van data, bijvoorbeeld met de Unified Catalog en de Data Map.",
            "**Risk & compliance**: onder meer Audit, eDiscovery, Communication Compliance en Data Lifecycle Management.",
          ],
          tip: "Begin bij uw meest gevoelige informatie. Met een paar labels en DLP-regels heeft u snel zichtbaar resultaat.",
          tech: ["Beheer gebeurt in de Microsoft Purview-portal (purview.microsoft.com).", "De portal groepeert oplossingen in Data security, Data governance en Risk & compliance."],
        },
        {
          title: "Vier stappen: ken, bescherm, voorkom, bewaak",
          text: "Informatiebescherming volgt een vaste lijn. Eerst weet u welke informatie gevoelig is en waar die staat. Dan geeft u die informatie een label met passende bescherming. DLP-beleid voorkomt dat de informatie onbedoeld wordt gedeeld. Tot slot volgt u signalen op en stuurt u bij.",
          points: [
            "**Ken uw gegevens**: herken gevoelige nummers en documenten en ontdek waar ze staan.",
            "**Label en bescherm**: sensitivity labels met versleuteling, markeringen en instellingen voor Teams en sites.",
            "**Voorkom datalekken**: DLP in e-mail, SharePoint, OneDrive, Teams, op apparaten en in Copilot.",
            "**Bewaak en verbeter**: alerts, Activity explorer en bijsturen op basis van wat u ziet.",
          ],
          tip: "Labels en DLP versterken elkaar: een DLP-regel kan een label als voorwaarde gebruiken, bijvoorbeeld ‘Strikt vertrouwelijk niet extern delen’.",
        },
        {
          title: "Waar merkt de medewerker het?",
          text: "De bescherming zit in de apps waar mensen al in werken. Labelen is ingebouwd in Word, Excel, PowerPoint en Outlook. DLP werkt in de Microsoft 365-diensten en, met Endpoint DLP, ook op Windows- en macOS-apparaten.",
          points: [
            "Word, Excel, PowerPoint en Outlook: label kiezen, aanbevelingen en policy tips.",
            "SharePoint, OneDrive en Teams: policy tips en blokkades bij delen.",
            "Microsoft 365 Copilot: bepaalde gelabelde inhoud uitsluiten. Gevoelige prompts tegenhouden is nog in preview.",
            "Windows- en macOS-apparaten: meldingen bij USB, uploaden of afdrukken.",
          ],
          tech: ["Labelen is ingebouwd in Microsoft 365 Apps; de Azure Information Protection-add-in is niet meer in ondersteuning.", "Endpoint DLP ondersteunt Windows 10/11 en de drie nieuwste macOS-versies."],
        },
        {
          title: "Licenties: wat voegt E5 toe?",
          text: "Deze lessen gaan uit van **Microsoft 365 E5**. Met E3 kunt u handmatig labelen en DLP gebruiken voor Exchange, SharePoint en OneDrive. E5 voegt onder meer automatisch labelen in de cloud, Endpoint DLP, DLP voor Teams-chats, trainable classifiers, Exact Data Match en de Activity en Content explorer toe.",
          tip: "Licentievoorwaarden veranderen geregeld. Controleer de actuele richtlijnen voordat u een ontwerp vastlegt.",
          tech: ["Sommige functies zijn ook als add-on beschikbaar (bijvoorbeeld E5 Compliance of E5 Information Protection & Governance)."],
        },
      ],
      quiz: [
        { q: "Welke twee Purview-oplossingen staan centraal in deze lessen?", options: ["eDiscovery en Audit", "Information Protection en Data Loss Prevention", "Insider Risk Management en Communication Compliance"], answer: 1, why: "Information Protection herkent, labelt en beschermt informatie. DLP voorkomt dat die informatie ongewenst wordt gedeeld." },
        { q: "Wat heeft een medewerker nodig om in Word een label te kiezen?", options: ["De ingebouwde labelfunctie van Microsoft 365 Apps", "De Azure Information Protection-add-in", "Een aparte Purview-app op elk apparaat"], answer: 0, why: "Labelen is ingebouwd in de Office-apps. De AIP-add-in is niet meer in ondersteuning." },
        { q: "Welke functie hoort bij E5 en niet bij E3?", options: ["DLP voor e-mail in Exchange Online", "Handmatig een label kiezen in Word", "Endpoint DLP op Windows- en macOS-apparaten"], answer: 2, why: "Endpoint DLP vraagt om E5 (of een add-on). Handmatig labelen en DLP voor Exchange, SharePoint en OneDrive zijn ook met E3 mogelijk." },
      ],
      learn: ["ipOverview", "dlp", "purviewPortal", "licensing"],
      route: "architectuur", routeLabel: "Bekijk de referentiearchitectuur",
    },

    {
      id: "data", n: "02", track: "basis", icon: "search", app: "excel", minutes: 12, widget: "sit",
      title: "Gevoelige informatie herkennen",
      short: "Wat kan automatisch worden herkend, en wanneer moet u zelf blijven opletten?",
      goals: [
        "U begrijpt hoe een informatietype (SIT) gevoelige gegevens herkent.",
        "U kent het verschil tussen SIT's, EDM, fingerprints en trainable classifiers.",
        "U weet hoe u ontdekt waar gevoelige informatie staat.",
      ],
      chapters: [
        {
          title: "Sensitive information types",
          text: "Een **sensitive information type** (SIT) herkent een soort gegeven, zoals een burgerservicenummer of een IBAN. Purview levert honderden ingebouwde typen en u kunt eigen typen maken. Een SIT kijkt niet alleen naar een patroon, maar ook naar bewijs eromheen.",
          points: [
            "**Het nummerpatroon**: lijkt de tekst op het soort gegeven dat u zoekt?",
            "**Een controle van het nummer**: klopt de opbouw, of zijn het toevallige cijfers?",
            "**Helpende woorden**: staat er bijvoorbeeld ‘BSN’ in de buurt?",
            "**Meerdere aanwijzingen samen** verkleinen de kans op een onterechte melding.",
          ],
          tip: "Geen melding betekent niet dat tekst onschuldig is. Nederlandse medische vrije tekst vraagt bijvoorbeeld om menselijke beoordeling; de ingebouwde medische terminologie is Engelstalig.",
          tech: [
            "Netherlands citizen's service (BSN) number: high confidence als patroon, trefwoord en checksum binnen 300 tekens samenkomen.",
            "International banking account number (IBAN): high confidence bij patroon plus geldige checksum.",
            "Credit card number: Luhn-controle; gereserveerde testnummers worden niet gemarkeerd.",
          ],
        },
        {
          title: "Precies herkennen: EDM en fingerprints",
          text: "Soms is een algemeen nummerpatroon niet genoeg. **Exact Data Match** (EDM) helpt gegevens uit een bekende organisatielijst te herkennen. **Document fingerprinting** helpt ingevulde versies van een bekend formulier te herkennen. De beheerder bereidt deze herkenning voor.",
          points: [
            "EDM: zeer precies en weinig fout-positieven; geschikt voor grote klant-, patiënt- of personeelsbestanden.",
            "Fingerprint: geschikt voor vaste sjablonen, zoals een aanvraag- of declaratieformulier.",
            "Beide vragen voorbereiding en onderhoud; plan dat in.",
          ],
          tip: "Grijp naar EDM als gewone informatietypen te veel ruis geven of als u alleen úw klanten wilt herkennen.",
          tech: ["EDM werkt met een schema en een gehashte sensitive information source table.", "Een fingerprint is een SIT op basis van een documentsjabloon, bijvoorbeeld een Word-formulier."],
        },
        {
          title: "Trainable classifiers",
          text: "Een **trainable classifier** herkent een soort document aan de hand van voorbeelden: een cv, een contract of broncode. Purview levert kant-en-klare classifiers, en u kunt eigen classifiers trainen met voorbeelden uit uw organisatie.",
          points: [
            "Herkent de aard van een document, niet één los gegeven.",
            "De meeste kant-en-klare classifiers zijn getraind op Engelstalige inhoud.",
            "Niet beschikbaar in de DLP-locatie Microsoft 365 Copilot and Copilot Chat.",
          ],
          tip: "Test een classifier eerst met Nederlandstalige voorbeelden voordat u er beleid op bouwt.",
          tech: ["Bruikbaar in onder meer DLP-beleid en automatisch labelen in de Office-apps.", "Pre-trained classifiers en custom trainable classifiers vragen E5 (of een add-on)."],
        },
        {
          title: "Waar staat het? De explorers",
          text: "Met **Content explorer** ziet u waar inhoud met informatietypen of labels staat, tot op bestandsniveau. **Activity explorer** laat zien wat ermee gebeurt: labelen, wijzigen, delen en kopiëren. Zo ontwerpt u op basis van feiten in plaats van aannames.",
          points: [
            "Content explorer: waar staat gevoelige informatie, en hoeveel?",
            "Activity explorer: wat doen medewerkers met gelabelde en gevoelige inhoud?",
            "Voor het bekijken van de inhoud zelf zijn aparte rollen nodig.",
          ],
          tip: "Kijk vóór de workshop even in Content explorer. Een paar cijfers maken het gesprek concreet.",
          tech: ["Rollen: Content Explorer List viewer (lijst) en Content Explorer Content viewer (inhoud)."],
        },
      ],
      quiz: [
        { q: "Waarom is een reeks van negen cijfers niet automatisch een herkend BSN?", options: ["Alle cijfers zijn altijd een BSN", "Een nummer wordt alleen herkend in een gelabeld bestand", "Ook de nummercontrole en helpende woorden moeten passen"], answer: 2, why: "Het ingebouwde BSN-type combineert meerdere aanwijzingen. Zo herkent het niet elk willekeurig getal." },
        { q: "Wat helpt gegevens uit een bekende organisatielijst te herkennen?", options: ["Exact Data Match (EDM)", "Alleen de bestandsnaam", "Een watermerk"], answer: 0, why: "EDM gebruikt de bekende waarden als onderdeel van de herkenning. Daarvoor is voorbereiding door de beheerder nodig." },
        { q: "Waarom bouwt u niet blind op een kant-en-klare classifier voor Nederlandse documenten?", options: ["Classifiers werken alleen in e-mail", "De meeste zijn getraind op Engelstalige inhoud", "Classifiers kunnen geen PDF lezen"], answer: 1, why: "De meeste kant-en-klare classifiers zijn alleen getraind op Engelstalige inhoud. Test daarom eerst met eigen voorbeelden." },
      ],
      learn: ["sitLearn", "sitDefinitions", "medicalTerms", "edm", "classifiers", "contentExplorer"],
      route: "sits", routeLabel: "Kies informatietypen in de Workshop Designer",
    },

    {
      id: "labels", n: "03", track: "basis", icon: "tag", app: "word", minutes: 14, widget: "label",
      title: "Sensitivity labels",
      short: "Wat een label doet, hoe prioriteit werkt en hoe labelbeleid helpt.",
      goals: [
        "U weet wat een sensitivity label is en wat het kan doen.",
        "U kunt een labelschema met een logische volgorde opzetten.",
        "U weet hoe labelbeleid medewerkers helpt, met een standaardlabel of verplicht labelen.",
      ],
      chapters: [
        {
          title: "Wat is een sensitivity label?",
          text: "Een **sensitivity label** vertelt hoe gevoelig informatie is. Het blijft bij ondersteunde bestanden en e-mails, ook buiten de organisatie. Een label kan bescherming toevoegen, maar doet dat niet altijd. Toegangsrechten blijven een afzonderlijke controle.",
          points: [
            "**Versleuteling**: alleen bevoegden kunnen openen, ook buiten de organisatie.",
            "**Markeringen**: koptekst, voettekst en watermerk.",
            "**Werkplekken**: een label kan ook afspraken voor een Team of site ondersteunen. Bestanden daarin krijgen niet automatisch hetzelfde label.",
            "**Automatisch labelen**: een label aanbevelen of direct toepassen.",
          ],
          tip: "Houd het schema klein. Vier of vijf labels die iedereen begrijpt, werken beter dan twintig.",
          tech: ["Het label wordt als metadata in het bestand of de e-mail opgeslagen en reist mee.", "Labelnamen en tooltips zijn per taal te vertalen."],
        },
        {
          title: "Volgorde en prioriteit",
          text: "Labels vormen een herkenbare schaal: van informatie die iedereen mag zien tot informatie voor een heel beperkte groep. Een lagere classificatie kiezen kan gevolgen hebben voor de bescherming. Daarom kan een toelichting nodig zijn.",
          points: [
            "Van Openbaar (laagste prioriteit) naar Strikt vertrouwelijk (hoogste).",
            "Een minder vertrouwelijk label kiezen kan om een toelichting vragen.",
            "Kies het label dat bij de inhoud en de werkafspraak past, niet het label waarmee delen het makkelijkst is.",
          ],
          tip: "Kies namen die zonder uitleg te begrijpen zijn, en schrijf bij elk label een korte tooltip: wanneer gebruik ik dit?",
          tech: ["Nieuwe tenants gebruiken label groups automatisch; bestaande tenants migreren met een wizard die niet terug te draaien is.", "Labelbeleid: ‘Require users to provide a justification to remove a label or lower its classification’."],
        },
        {
          title: "Versleuteling en markeringen",
          text: "**Versleuteling** bepaalt wie wat mag: openen, bewerken, afdrukken of kopiëren. U legt de rechten vooraf vast, of laat de medewerker kiezen bij het toepassen. **Markeringen** maken het label zichtbaar op scherm en papier.",
          points: [
            "Rechten kunnen vooraf zijn afgesproken voor een bepaalde groep.",
            "Soms kiest de medewerker zelf de ontvangers of bijvoorbeeld ‘Niet doorsturen’ in Outlook.",
            "Extra strenge versleuteling kan verwerking door Microsoft-diensten, waaronder Copilot, uitsluiten.",
            "Koptekst, voettekst en watermerk maken de gevoeligheid zichtbaar, maar beperken op zichzelf geen toegang.",
          ],
          tip: "Versleutel niet alles. Versleuteling beperkt ook samenwerken, zoeken en Copilot. Kies het voor de labels waar het echt nodig is.",
          tech: ["Usage rights zijn onder meer VIEW, EDIT, PRINT, EXTRACT (kopiëren) en EXPORT.", "Copilot heeft VIEW en EXTRACT nodig om versleutelde inhoud te gebruiken."],
        },
        {
          title: "Labelbeleid: labels bij de medewerker",
          text: "De organisatie bepaalt welke labels medewerkers aangeboden krijgen en hoe labelen wordt ondersteund. Dat noemen we **labelbeleid**. Een goed gekozen standaard helpt, maar controleer altijd of het label bij de inhoud past.",
          points: [
            "**Standaardlabel** voor documenten en e-mail.",
            "**Verplicht labelen**: zonder label kan een medewerker niet opslaan of verzenden.",
            "Vergaderingen en agenda-items kunnen ook labels gebruiken; daarvoor kunnen aanvullende licenties nodig zijn.",
            "Een documentbibliotheek kan een eigen standaardlabel voor nieuwe en bewerkte bestanden hebben. Dat is een aparte afspraak, niet hetzelfde als het label van de site.",
          ],
          tip: "Een standaardlabel ‘Intern’ geeft snel dekking, zonder dat medewerkers er iets voor hoeven te doen.",
          tech: ["Voor Fabric en Power BI zijn er aparte beleidsinstellingen.", "Containerlabels regelen privacy, externe gebruikers, extern delen, onbeheerde apparaten en authentication context."],
        },
      ],
      quiz: [
        { q: "Een bestand staat in een vertrouwelijke projectsite. Wat controleert u vóór delen?", options: ["Alleen de naam van de site", "Het label en de toegang van het bestand zelf", "Alleen of de ontvanger een collega is"], answer: 1, why: "Het label van een site labelt of versleutelt niet automatisch de bestanden. Controleer het losse bestand en de ontvangers." },
        { q: "Wat gebeurt er met de versleuteling als een bestand de organisatie verlaat?", options: ["Die blijft: alleen bevoegden kunnen het openen", "Die verdwijnt zodra het bestand wordt gedownload", "Die werkt alleen zolang het bestand in SharePoint staat"], answer: 0, why: "Versleuteling reist mee met het bestand. Wie geen rechten heeft, kan het niet openen, waar het bestand ook staat." },
        { q: "Waarom versleutelt u niet gewoon alles?", options: ["Versleutelde bestanden kunnen geen label hebben", "Versleuteling werkt alleen in e-mail", "Versleuteling beperkt ook samenwerken, zoeken en Copilot"], answer: 2, why: "Versleuteling is krachtig, maar heeft gevolgen voor samenwerken en voor diensten zoals Copilot. Gebruik het waar het nodig is." },
      ],
      learn: ["labels", "labelsEncryption", "labelsContainers", "labelGroups"],
      route: "schema", routeLabel: "Ontwerp het classificatieschema",
    },

    {
      id: "autolabel", n: "04", track: "beschermen", icon: "wand", app: "word", minutes: 10, widget: "autolabel",
      title: "Automatisch labelen",
      short: "Aanbevelen in de Office-apps of automatisch labelen in de cloud.",
      goals: [
        "U kent het verschil tussen labelen in de Office-apps en labelen in de cloud.",
        "U weet waarom een auto-labeling policy start in simulatie.",
        "U begrijpt wanneer een handmatig label voorgaat.",
      ],
      chapters: [
        {
          title: "Twee manieren",
          text: "Purview kan helpen terwijl iemand werkt én op de achtergrond. **In de Office-apps** verschijnt een aanbeveling of wordt een label toegepast. **In de cloud** kan beleid opgeslagen bestanden en verwerkte e-mail labelen, ook als niemand ze opent.",
          points: [
            "In de Office-apps: in Word, Excel, PowerPoint en Outlook; aanbevelen of automatisch toepassen.",
            "Op de achtergrond: bestanden in SharePoint en OneDrive en e-mail in Exchange.",
            "Alleen in de Office-apps kunt u een label aanbevelen; de medewerker kan dat accepteren of negeren.",
            "Herkenning en ondersteuning verschillen per bestandstype. Laat dit met passende voorbeelden testen.",
          ],
          tip: "Aanbevelen is een goede eerste stap: medewerkers leren het schema kennen en houden zelf de regie.",
          tech: ["Client-side: labelinstelling ‘Auto-labeling for files and emails’ met SIT's of trainable classifiers.", "Service-side: aparte auto-labeling policy met de locaties Exchange, SharePoint sites en OneDrive accounts."],
        },
        {
          title: "Eerst simulatie",
          text: "Een auto-labeling policy in de cloud draait eerst in **simulatie**. U ziet welke bestanden en e-mails het label zouden krijgen, zonder dat er iets verandert. Pas na controle zet u het beleid aan.",
          points: [
            "Controleer de gevonden items op fout-positieven.",
            "Scherp voorwaarden aan en draai de simulatie opnieuw.",
            "Zet daarna het beleid aan; het labelen verloopt geleidelijk.",
          ],
          tip: "Plan de simulatie ruim in. Bij veel inhoud duurt het even voordat de resultaten compleet zijn.",
          tech: ["Tenantbreed worden maximaal 500.000 bestanden in SharePoint en OneDrive per dag automatisch gelabeld.", "Maximaal 100 auto-labeling policies per tenant."],
        },
        {
          title: "Wat gaat voor: handmatig of automatisch?",
          text: "Een medewerker die zelf een label kiest, weet vaak het beste wat de inhoud is. Daarom vervangt automatisch labelen **geen handmatig gekozen label**. Alleen bij een auto-labeling policy voor e-mail kunt u instellen dat een handmatig label met een lagere prioriteit toch wordt vervangen.",
          points: [
            "Labelen in de Office-apps vervangt nooit een handmatig label.",
            "Een auto-labeling policy laat handmatige labels in SharePoint en OneDrive staan.",
            "Geen aangepast label betekent niet dat DLP niets kan doen: een aparte regel kan de inhoud herkennen.",
          ],
          tip: "Combineer: een standaardlabel voor de basis, aanbevelen in de apps en een policy in de cloud voor de bestaande bestanden.",
        },
      ],
      quiz: [
        { q: "Waar kan een medewerker een labelaanbeveling zelf beoordelen?", options: ["Bij automatisch labelen op de achtergrond", "In de Office-apps tijdens het werk", "Alleen bij het afdrukken"], answer: 1, why: "In de Office-apps kan de medewerker het voorstel beoordelen. Labelen op de achtergrond werkt zonder die keuze." },
        { q: "Hoe start een auto-labeling policy voor SharePoint en OneDrive?", options: ["In simulatie, zodat u eerst ziet wat er gelabeld zou worden", "Direct aan voor alle bestanden", "Pas nadat alle medewerkers getraind zijn"], answer: 0, why: "Een auto-labeling policy draait eerst in simulatie. Daarna zet u het beleid aan." },
        { q: "Een medewerker koos zelf ‘Intern’. Een policy in SharePoint vindt BSN's. Wat gebeurt er?", options: ["Het label wordt verhoogd naar Strikt vertrouwelijk", "Het bestand wordt geblokkeerd", "Het handmatige label blijft staan"], answer: 2, why: "Een auto-labeling policy vervangt geen handmatig gekozen label in SharePoint of OneDrive. Een DLP-regel op BSN's kan wel ingrijpen." },
      ],
      learn: ["labelsAuto", "sitLearn"],
      route: "autolabel", routeLabel: "Ontwerp automatisch labelen",
    },

    {
      id: "dlp", n: "05", track: "beschermen", icon: "shield", app: "outlook", minutes: 14, widget: "dlp",
      title: "Data Loss Prevention",
      short: "Begrijp waarschuwingen, toegestane uitzonderingen en blokkades bij delen.",
      goals: [
        "U kent de opbouw van een DLP-beleid: locaties, regels, voorwaarden en acties.",
        "U weet wat medewerkers zien: policy tips, override en blokkades.",
        "U begrijpt waarom u in simulatie start en stap voor stap strenger wordt.",
      ],
      chapters: [
        {
          title: "Zo is een DLP-beleid opgebouwd",
          text: "Een DLP-beleid heeft **locaties** (waar het beleid kijkt) en een of meer **regels**. Elke regel heeft **voorwaarden** (wanneer grijpt het in) en **acties** (wat gebeurt er dan). Daarnaast stelt u meldingen voor medewerkers, alerts en incidentrapporten in.",
          points: [
            "Waar: bijvoorbeeld e-mail, gedeelde bestanden, chats, apparaten of Copilot.",
            "Wanneer: bijvoorbeeld gevoelige gegevens delen met iemand buiten de organisatie.",
            "Wat gebeurt er: alleen vastleggen, een toegestane uitzondering aanbieden of tegenhouden. De mogelijkheden verschillen per plek.",
          ],
          tip: "Gebruik de sjablonen in Purview als startpunt, maar stem ze af op uw eigen informatietypen en processen.",
          tech: ["Meer locaties: Instances, On-premises repositories, Fabric and Power BI, en beheerde en onbeheerde cloud-apps.", "Matchen meerdere regels, dan geldt de meest beperkende actie."],
        },
        {
          title: "Wat de medewerker ziet",
          text: "DLP hoeft niet alleen te blokkeren. Een **policy tip** legt in de app uit waarom iets gevoelig is. Met **Block with override** kan een medewerker toch doorgaan met een zakelijke reden; die keuze wordt vastgelegd. Zo leert de organisatie en gaat het werk door.",
          points: [
            "Policy tips in Outlook, Word, Excel, PowerPoint, SharePoint, OneDrive en Teams.",
            "Override met of zonder verplichte zakelijke reden.",
            "Fout-positief melden, zodat u de regel kunt verbeteren.",
            "Op apparaten verschijnt een melding van Windows of macOS.",
          ],
          tip: "Schrijf policy tips in gewone taal: wat is er aan de hand, en wat kan ik nu doen?",
          tech: ["De tekst van een policy tip is per regel aan te passen.", "Teams: een geblokkeerd bericht toont bij de afzender ‘Dit bericht is geblokkeerd’; de ontvanger ziet de inhoud niet."],
        },
        {
          title: "Eerst simulatie, dan stap voor stap",
          text: "Een nieuw DLP-beleid kan eerst in **simulatie** draaien. U ziet hoeveel en welke items zouden matchen, zonder dat medewerkers iets merken. Daarna zet u policy tips aan in simulatie, en pas als de regels kloppen schakelt u het beleid in. Ook de acties maakt u stap voor stap strenger.",
          points: [
            "**Eerst meten**: welke situaties zouden een melding opleveren?",
            "**Uitleg beproeven**: waar ondersteund kunnen medewerkers al een melding zien, zonder blokkade.",
            "**Daarna beschermen**: pas na beoordeling de afgesproken maatregelen toepassen.",
            "Niet alles hoeft te worden geblokkeerd. Kies de maatregel die bij het risico en het werk past.",
          ],
          tip: "Communiceer vóór u policy tips aanzet. Een melding die niemand verwacht, roept vragen op.",
          tech: ["‘Keep it off’: het beleid staat klaar maar doet niets.", "Bekijk de simulatieresultaten in de beleidsdetails en pas voorwaarden of uitzonderingen aan."],
        },
        {
          title: "Regels die vaak goed werken",
          text: "Begin met een paar heldere regels die passen bij echte risico's.",
          points: [
            "BSN's of IBAN's in e-mail naar buiten: Block with override met verplichte reden.",
            "Bestanden met het label Strikt vertrouwelijk extern delen: Block.",
            "Gevoelige bestanden naar USB kopiëren: Block with override op apparaten.",
            "Copilot: items met Strikt vertrouwelijk niet laten verwerken.",
          ],
          tip: "Elke regel heeft een eigenaar nodig: wie beoordeelt de alerts en wie besluit over aanpassingen?",
        },
      ],
      quiz: [
        { q: "Met welke actie kan een medewerker doorgaan als hij een zakelijke reden opgeeft?", options: ["Audit only", "Block", "Block with override"], answer: 2, why: "Block with override houdt de actie tegen, maar laat de medewerker doorgaan met een reden. Die keuze wordt vastgelegd." },
        { q: "Wat doet een proef in simulatie?", options: ["Meten welke situaties zouden worden geraakt, zonder ze tegen te houden", "Alleen buiten kantoortijd blokkeren", "Niets meten"], answer: 0, why: "De proef helpt ontdekken of de maatregel bij normaal werk past, voordat die actief ingrijpt." },
        { q: "Welke volgorde past bij een zorgvuldige uitrol?", options: ["Direct Block op alle locaties", "Simulatie, dan simulatie met policy tips, dan aan", "Aan, dan simulatie, dan uit"], answer: 1, why: "Eerst meten, dan uitleggen, dan handhaven. Zo voorkomt u verrassingen." },
      ],
      learn: ["dlp", "dlpReference", "dlpTips", "dlpSimulation"],
      route: "dlp", routeLabel: "Ontwerp DLP-regels",
    },

    {
      id: "endpoint", n: "06", track: "beschermen", icon: "laptop", app: "windows", minutes: 10, widget: "endpoint",
      title: "Endpoint DLP",
      short: "USB, uploaden, afdrukken en kopiëren op Windows- en macOS-apparaten.",
      goals: [
        "U weet welke activiteiten Endpoint DLP op apparaten bewaakt.",
        "U begrijpt wat er nodig is: onboarding en ondersteunde systemen.",
        "U kent de acties en de meldingen op het apparaat.",
      ],
      chapters: [
        {
          title: "DLP op het apparaat",
          text: "Veel datalekken gebeuren buiten Microsoft 365: een kopie op een USB-stick, een upload naar een privéclouddienst of een afdruk. **Endpoint DLP** bewaakt die acties op Windows- en macOS-apparaten en grijpt in als een bestand gevoelige informatie bevat.",
          points: [
            "Kopiëren naar een USB-stick of netwerkshare.",
            "Uploaden naar een website of clouddienst, en plakken in een browser.",
            "Afdrukken, kopiëren naar het klembord en Bluetooth.",
            "Openen met niet-toegestane apps (restricted apps) en Remote Desktop.",
          ],
          tip: "Begin met de activiteiten die bij u het grootste risico vormen, vaak USB en uploaden naar privéclouddiensten.",
          tech: ["Ondersteund: Windows 10 en 11, Windows Server 2019 en nieuwer, en de drie nieuwste macOS-versies.", "In Microsoft Edge is het ingebouwd; voor Chrome en Firefox is een extensie nodig."],
        },
        {
          title: "Wat is er nodig?",
          text: "Bescherming op het apparaat werkt niet vanzelf op iedere laptop. De organisatie moet het apparaat aansluiten en passende afspraken activeren. De mogelijkheden verschillen per besturingssysteem, browser en activiteit.",
          points: [
            "Gebruik een door de organisatie beheerde en aangesloten werkplek.",
            "Laat de beheerder controleren welke browsers en activiteiten worden ondersteund.",
            "Spreek een werkbare, goedgekeurde route af voor wat u moet delen.",
          ],
          tip: "Start met een pilotgroep en Audit only. Zo ziet u welke werkprocessen geraakt worden voordat u blokkeert.",
          tech: ["Endpointinstellingen: unallowed apps en browsers, service domains, removable USB device groups, printer groups en network share groups.", "Voor sommige informatietypen op apparaten, zoals credentials, is ‘Advanced classification’ nodig."],
        },
        {
          title: "Acties en meldingen",
          text: "Per activiteit kiest u **Audit only** (alleen vastleggen), **Block with override** (doorgaan met een reden) of **Block**. Daarnaast is er **Allow**. De medewerker ziet een melding van Windows of macOS, met uitleg die u zelf kunt aanpassen.",
          points: [
            "Audit only: niets merkbaar, wel zichtbaar in Activity explorer.",
            "Block with override: de medewerker kiest een reden en gaat door.",
            "Block: de actie wordt tegengehouden.",
          ],
          tip: "Blokkeer niet alle USB-gebruik. Sta met groepen goedgekeurde, versleutelde sticks toe.",
          tech: ["Gebeurtenissen verschijnen in Activity explorer en, als u dat instelt, als alert.", "U kunt een kopie van geraakte bestanden als bewijs bewaren; controleer de voorwaarden in de portal."],
        },
      ],
      quiz: [
        { q: "Op welke systemen werkt Endpoint DLP?", options: ["Alleen op Windows 7 en nieuwer", "Windows 10/11 en de drie nieuwste macOS-versies", "Alleen op mobiele telefoons"], answer: 1, why: "Endpoint DLP ondersteunt Windows 10 en 11 (en Windows Server 2019 en nieuwer) en de drie nieuwste macOS-versies." },
        { q: "Wat is nodig voordat DLP-beleid op een laptop werkt?", options: ["Het apparaat moet aangesloten (onboarded) zijn", "Een sensitivity label op het apparaat", "Een aparte Purview-app uit de Microsoft Store"], answer: 0, why: "Alleen aangesloten apparaten vallen onder DLP-beleid met de locatie Devices." },
        { q: "Welke start geeft de minste verstoring?", options: ["Alle USB-poorten direct blokkeren", "Endpoint DLP alleen op servers", "Een pilotgroep met Audit only"], answer: 2, why: "Met Audit only ziet u eerst wat er gebeurt, zonder het werk te verstoren." },
      ],
      learn: ["endpoint", "endpointUsing", "deviceOnboarding", "endpointSettings"],
      route: "endpoint", routeLabel: "Ontwerp Endpoint DLP",
    },

    {
      id: "copilot", n: "07", track: "borgen", icon: "sparkle", app: "copilot", minutes: 12, widget: "copilot",
      title: "Copilot en uw gegevens",
      short: "Rechten, labels, DLP voor Copilot en zicht met DSPM for AI.",
      goals: [
        "U begrijpt hoe Copilot omgaat met rechten en labels.",
        "U weet wat DLP voor Microsoft 365 Copilot kan tegenhouden.",
        "U kent de rol van DSPM for AI.",
      ],
      chapters: [
        {
          title: "Copilot volgt de rechten van de medewerker",
          text: "Microsoft 365 Copilot gebruikt alleen informatie waar de medewerker zelf al bij kan. Daardoor worden te ruime rechten zichtbaar: wat vroeger moeilijk te vinden was, vindt Copilot snel. Rechten opruimen en labelen gaan daarom samen op.",
          points: [
            "Copilot respecteert bestaande machtigingen in SharePoint, OneDrive, Teams en Exchange.",
            "Bij versleutelde inhoud moet de medewerker die inhoud mogen lezen én overnemen.",
            "In ondersteunde situaties kan nieuwe inhoud het meest vertrouwelijke bronlabel overnemen. Controleer het resultaat; dit geldt niet voor iedere toepassing of vorm van versleuteling.",
          ],
          tip: "Pak eerst oversharing aan: sites en teams die voor iedereen openstaan.",
          tech: ["Labelovername geldt niet bij versleuteling met user-defined permissions of Double Key Encryption.", "Copilot toont in het antwoord het label van de gebruikte bronnen."],
        },
        {
          title: "DLP voor Microsoft 365 Copilot",
          text: "Een organisatie kan bepaalde gelabelde bestanden en e-mails uitsluiten van verwerking door Microsoft 365 Copilot. De bron kan nog zichtbaar zijn, maar de inhoud wordt niet gebruikt in het antwoord. Ook het tegenhouden van gevoelige vragen is mogelijk als previewfunctie. Dit is geen algemene bescherming van iedere AI-dienst.",
          points: [
            "Uitsluiten op sensitivity label: algemeen beschikbaar.",
            "Prompts met een informatietype tegenhouden: preview.",
            "Trainable classifiers zijn in deze locatie niet beschikbaar.",
          ],
          tip: "Kies één label, bijvoorbeeld Strikt vertrouwelijk, dat Copilot nooit mag verwerken.",
          tech: ["Voorwaarde ‘Content contains > Sensitivity labels’ met de actie ‘Prevent Copilot from processing content’.", "Een prompt met een gekozen informatietype krijgt geen antwoord en wordt niet gebruikt voor zoeken."],
        },
        {
          title: "Zicht op AI-gebruik",
          text: "**DSPM for AI** laat zien hoe medewerkers AI-apps gebruiken, welke gevoelige informatie in prompts terechtkomt en welk beleid ontbreekt. Microsoft vervangt de klassieke versie door een geïntegreerde DSPM-ervaring (preview).",
          points: [
            "Inzicht in gevoelige informatie in prompts en antwoorden.",
            "Aanbevelingen voor beleid, zoals DLP voor Copilot.",
            "Rapportages over risicovolle interacties.",
          ],
          tip: "Gebruik de inzichten als startpunt voor het gesprek over Copilot-adoptie, niet alleen als controle.",
        },
      ],
      quiz: [
        { q: "Wat heeft Copilot nodig om versleutelde inhoud samen te vatten?", options: ["Alleen toestemming om af te drukken", "De medewerker moet de inhoud mogen lezen en overnemen", "Alleen een herkenbare bestandsnaam"], answer: 1, why: "Copilot werkt namens de medewerker en verleent geen extra rechten." },
        { q: "DLP sluit een gelabeld bestand uit van Copilot. Wat gebeurt er?", options: ["Het bestand kan als bron verschijnen, maar de inhoud wordt niet gebruikt", "Het bestand wordt verwijderd", "Copilot werkt voor niemand meer"], answer: 0, why: "Copilot verwerkt de inhoud niet, maar het item kan nog in de bronvermelding staan." },
        { q: "Copilot maakt een samenvatting uit vertrouwelijke bronnen. Wat doet u vóór delen?", options: ["Direct versturen, want het is een nieuwe tekst", "Alleen spelling controleren", "Inhoud, ontvangers en het label controleren"], answer: 2, why: "De samenvatting kan nog steeds gevoelig zijn. Labelovername helpt waar ondersteund, maar vervangt uw controle niet." },
      ],
      learn: ["dlpCopilot", "labelsCopilot", "copilotDataProt", "dspmAi"],
      route: "copilot", routeLabel: "Ontwerp de Copilot-maatregelen",
    },

    {
      id: "monitor", n: "08", track: "borgen", icon: "chart", app: "defender", minutes: 10, widget: "triage",
      title: "Monitoren en bijsturen",
      short: "Alerts, Activity explorer en regels verbeteren op basis van signalen.",
      goals: [
        "U weet waar u DLP-alerts en activiteiten terugvindt.",
        "U kunt een alert beoordelen en opvolgen.",
        "U begrijpt hoe u regels verbetert met de signalen.",
      ],
      chapters: [
        {
          title: "Waar ziet u wat er gebeurt?",
          text: "Elke DLP-match en elke labelwijziging laat sporen na. In **DLP Alerts** in de Purview-portal ziet u meldingen die aandacht vragen. In **Microsoft Defender XDR** komen ze samen met andere beveiligingsincidenten. **Activity explorer** toont ook activiteiten zonder alert.",
          points: [
            "DLP Alerts: signalen die om beoordeling vragen.",
            "Defender XDR: beveiligingssignalen in samenhang bekijken.",
            "Activity explorer: labelen, delen, kopiëren en overrides.",
            "Audit: het auditlogboek voor diepgaand onderzoek.",
          ],
          tip: "Stel alerts in op de regels die er echt toe doen. Te veel alerts leiden tot alertmoeheid.",
          tech: ["Een alert kan per match of na een drempel (aantal, volume) worden gemaakt.", "Incidentrapporten kunnen per e-mail naar een beheerder of team."],
        },
        {
          title: "Een alert beoordelen",
          text: "Een alert vertelt wat er gebeurde, door wie, met welk bestand en volgens welke regel. De kernvraag: was dit een echt risico, een normaal werkproces of een fout-positief?",
          points: [
            "Bekijk de gevonden informatietypen en het aantal matches.",
            "Lees de zakelijke reden bij een override.",
            "Kijk of het patroon vaker voorkomt bij dezelfde persoon of afdeling.",
            "Leg de uitkomst vast en sluit of escaleer het alert.",
          ],
          tip: "Spreek vooraf af wie alerts opvolgt, binnen welke tijd, en wanneer HR of de privacyfunctionaris erbij komt.",
        },
        {
          title: "Bijsturen",
          text: "Monitoren is geen eindpunt: het voedt het ontwerp. Veel fout-positieven? Verhoog de betrouwbaarheid of voeg uitzonderingen toe. Veel overrides met dezelfde reden? Misschien is het proces legitiem en verdient het een betere oplossing.",
          points: [
            "Onterechte meldingen: laat de herkenning en de werkafspraak opnieuw beoordelen.",
            "Terugkerende overrides: proces bekijken, bijvoorbeeld een veilige deelmethode aanbieden.",
            "Echte incidenten: aanleiding voor uitleg, training of een strengere actie.",
          ],
          tip: "Plan elk kwartaal een korte review van regels, alerts en adoptiecijfers.",
        },
      ],
      quiz: [
        { q: "Wat bewijst een melding over extern delen?", options: ["Dat iemand kwaadwillend handelde", "Dat een gebeurtenis en de context moeten worden beoordeeld", "Dat u alle bestanden van de medewerker mag bekijken"], answer: 1, why: "Een melding is een signaal, geen bewijs van misbruik of toestemming voor brede inzage." },
        { q: "Waar ziet u ook activiteiten die geen alert opleverden?", options: ["In Activity explorer", "Alleen in de mailbox van de medewerker", "Nergens"], answer: 0, why: "Activity explorer toont activiteiten met gelabelde en gevoelige inhoud, ook zonder alert." },
        { q: "Veel overrides met dezelfde zakelijke reden. Wat ligt het meest voor de hand?", options: ["Alerts uitzetten", "Overrides verbieden", "Het werkproces bekijken en de regel of het proces aanpassen"], answer: 2, why: "Terugkerende redenen wijzen vaak op een legitiem proces. Zoek een veilige werkwijze en stem de regel daarop af." },
      ],
      learn: ["dlpAlerts", "explorers", "contentExplorer", "audit"],
      route: "adoption", routeLabel: "Plan adoptie en opvolging",
    },

    {
      id: "roadmap", n: "09", track: "borgen", icon: "route", app: "purview", minutes: 8, widget: "roadmap",
      title: "Van ontwerp naar uitrol",
      short: "Vijf fasen, mensen meenemen en meten of het werkt.",
      goals: [
        "U kent de fasen van een Purview-traject.",
        "U weet wat u per fase oplevert.",
        "U begrijpt hoe adoptie en communicatie het verschil maken.",
      ],
      chapters: [
        {
          title: "Een traject in vijf fasen",
          text: "Een goede uitrol is geleidelijk. U begint met inzicht, maakt een ontwerp, test dat in simulatie en met een pilotgroep, rolt gefaseerd uit en blijft daarna bijsturen.",
          points: [
            "**Verkennen**: welke informatie is gevoelig en waar staat die?",
            "**Ontwerpen**: classificatieschema, labels, DLP-regels en afspraken.",
            "**Simuleren**: DLP en auto-labeling in simulatie, labels bij een pilotgroep.",
            "**Uitrollen**: gefaseerd aanzetten, met policy tips en communicatie.",
            "**Borgen**: alerts opvolgen, regels bijstellen en adoptie meten.",
          ],
          tip: "Gebruik de Workshop Designer om het ontwerp vast te leggen; de export helpt bij de configuratie.",
        },
        {
          title: "Mensen meenemen",
          text: "Techniek is maar de helft. Medewerkers moeten begrijpen waarom labels bestaan, welk label wanneer past en wat een policy tip betekent.",
          points: [
            "Labels met duidelijke namen en tooltips.",
            "Korte uitleg: een pagina op intranet, een video van twee minuten of een vragenlijst.",
            "Ambassadeurs per afdeling die vragen opvangen.",
            "Een vast kanaal voor feedback en fout-positieven.",
          ],
          tip: "Vertel vooral waarom: welke risico's lopen we, en hoe helpt dit de medewerker zelf?",
        },
        {
          title: "Meten en verbeteren",
          text: "Meet of het werkt: hoeveel documenten zijn gelabeld, hoe vaak wordt een label verlaagd en hoeveel overrides en fout-positieven zijn er? Die cijfers sturen de volgende stap.",
          points: [
            "Aandeel gelabelde documenten en e-mails per label.",
            "Aantal verlaagde of verwijderde labels, met de redenen.",
            "Aantal DLP-matches, overrides en gemelde fout-positieven.",
          ],
          tip: "Deel de resultaten met het management en de ambassadeurs. Zichtbare voortgang houdt het traject levend.",
        },
      ],
      quiz: [
        { q: "Waarom start u DLP en auto-labeling in simulatie?", options: ["Om de impact te zien voordat medewerkers iets merken", "Omdat simulatie goedkoper is", "Omdat het verplicht is voor E3"], answer: 0, why: "Simulatie toont wat er zou gebeuren. Zo voorkomt u verrassingen en fout-positieven in het werk." },
        { q: "Wat helpt adoptie het meest?", options: ["Zoveel mogelijk labels", "Duidelijke labelnamen, korte uitleg en ambassadeurs", "Alles direct blokkeren"], answer: 1, why: "Medewerkers moeten het begrijpen. Eenvoud, uitleg en aanspreekpunten maken het verschil." },
        { q: "Wat is een goede maatstaf na de uitrol?", options: ["Het aantal licenties", "Het aantal SharePoint-sites", "Het aandeel gelabelde documenten en het aantal fout-positieven"], answer: 2, why: "Dekking en kwaliteit van de regels laten zien of de bescherming werkt en geaccepteerd wordt." },
      ],
      learn: ["dlpPlan", "labelsGetStarted", "dlpSimulation"],
      route: "start", routeLabel: "Start in de Workshop Designer",
    },
  ],

  /* ---------- Gegevens voor de oefeningen ---------- */
  widgets: {
    map: [
      {
        title: "Data security", items: [
          { id: "ip", name: "Information Protection", hub: true, text: "Herkent, labelt en beschermt gevoelige informatie met sensitivity labels, versleuteling en markeringen." },
          { id: "dlp", name: "Data Loss Prevention", hub: true, text: "Voorkomt dat gevoelige informatie ongewenst wordt gedeeld, in Microsoft 365, op apparaten en in Copilot." },
          { id: "irm", name: "Insider Risk Management", text: "Signaleert risicovol gedrag van medewerkers, zoals grote downloads vlak voor vertrek." },
          { id: "dspm", name: "Data Security Posture Management", text: "Geeft overzicht van datarisico's en aanbevelingen, ook voor AI-gebruik." },
          { id: "ib", name: "Information Barriers", text: "Voorkomt dat bepaalde groepen met elkaar communiceren of samenwerken." },
        ],
      },
      {
        title: "Data governance", items: [
          { id: "catalog", name: "Unified Catalog", text: "Maakt data vindbaar en beheersbaar, met eigenaarschap en kwaliteit." },
          { id: "map", name: "Data Map", text: "Scant en classificeert data in bronnen buiten Microsoft 365." },
        ],
      },
      {
        title: "Risk & compliance", items: [
          { id: "audit", name: "Audit", text: "Legt activiteiten vast voor onderzoek en verantwoording." },
          { id: "ediscovery", name: "eDiscovery", text: "Zoekt en bewaart informatie voor juridische zaken en onderzoeken." },
          { id: "cc", name: "Communication Compliance", text: "Signaleert ongepaste of risicovolle berichten." },
          { id: "dlm", name: "Data Lifecycle Management", text: "Bewaart informatie zo lang als nodig en ruimt daarna op." },
          { id: "cm", name: "Compliance Manager", text: "Helpt maatregelen en wet- en regelgeving bij te houden." },
        ],
      },
    ],
    sitSamples: [
      { id: "hr", name: "HR-dossier", text: "Personeelsdossier Peter de Vries\nBSN: 111222333\nSalaris wordt overgemaakt op IBAN NL91ABNA0417164300." },
      { id: "nokey", name: "Zonder trefwoord", text: "Factuurnummer 111222333 is betaald.\nZie IBAN NL91 ABNA 0417 1643 00." },
      { id: "card", name: "Testcreditcard", text: "Creditcard voor de reis: 4111 1111 1111 1111, vervaldatum 12/28." },
      { id: "empty", name: "Leeg", text: "" },
    ],
    labels: [
      { id: "openbaar", name: "Openbaar", color: "#107C10", prio: 1, mark: "", enc: false, who: "Iedereen mag dit zien, ook buiten Noordhaven." },
      { id: "intern", name: "Intern", color: "#0F6CBD", prio: 2, mark: "INTERN", enc: false, who: "Bedoeld voor medewerkers van Noordhaven. Geen versleuteling, wel een duidelijke markering." },
      { id: "vertrouwelijk", name: "Vertrouwelijk", color: "#CA5010", prio: 3, mark: "VERTROUWELIJK", enc: true, who: "Alle medewerkers mogen openen en bewerken; externen niet." },
      { id: "strikt", name: "Strikt vertrouwelijk", color: "#C50F1F", prio: 4, mark: "STRIKT VERTROUWELIJK", enc: true, who: "Alleen een vaste groep mag openen. Afdrukken en kopiëren is beperkt." },
    ],
    endpointActs: [
      { id: "usb", name: "Kopiëren naar USB", icon: "usb", file: "Verzuimoverzicht 2025.xlsx" },
      { id: "cloud", name: "Uploaden naar privéclouddienst", icon: "upload", file: "Salarisoverzicht maart.xlsx" },
      { id: "print", name: "Afdrukken", icon: "printer", file: "Personeelsdossier P. de Vries.docx" },
      { id: "clip", name: "Kopiëren naar klembord", icon: "clipboard", file: "Reorganisatieplan 2026.docx" },
      { id: "share", name: "Kopiëren naar netwerkshare", icon: "folder", file: "Verzuimoverzicht 2025.xlsx" },
      { id: "bt", name: "Bluetooth", icon: "bluetooth", file: "Salarisoverzicht maart.xlsx" },
    ],
    triage: [
      { id: "t1", sev: "high", title: "62 BSN's naar een privé-e-mailadres", meta: "Outlook · Sanne Visser · verzonden met reden ‘Thuis afmaken’", options: ["Sluiten: fout-positief", "Onderzoeken en het gesprek aangaan", "Regel uitzetten"], best: 1, why: "Veel BSN's naar een privéadres is een echt risico, ook met een reden. Bespreek het met de medewerker en bied een veilige manier om thuis te werken." },
      { id: "t2", sev: "medium", title: "Factuurnummers als BSN herkend", meta: "SharePoint · Financiën · 40 matches per week zonder trefwoord", options: ["Regel aanscherpen: hogere confidence of een uitzondering", "Escaleren naar HR", "Niets doen"], best: 0, why: "Zonder trefwoord en met ruis is dit een fout-positief. Scherp de regel aan, zodat echte signalen opvallen." },
      { id: "t3", sev: "high", title: "Strikt vertrouwelijk bestand naar USB", meta: "Windows · Mark de Boer · geblokkeerd", options: ["Alleen vastleggen en sluiten", "Direct HR inschakelen", "Regel uitzetten omdat het blokkeren werkte"], best: 0, why: "De blokkade deed haar werk. Leg het vast en sluit het alert; kijk alleen verder als het patroon vaker voorkomt." },
    ],
    roadmap: [
      { n: "1", title: "Verkennen", icon: "search", text: "Breng in kaart welke informatie gevoelig is, waar die staat en wie ermee werkt.", do: ["Interviews met afdelingen en eigenaren", "Content explorer en Activity explorer bekijken", "Risico's en wet- en regelgeving op een rij"], result: "Overzicht van gevoelige informatie en risico's" },
      { n: "2", title: "Ontwerpen", icon: "layers", text: "Leg het classificatieschema, de labelinstellingen en de DLP-regels vast.", do: ["Workshop met de Workshop Designer", "Labelnamen, tooltips en versleuteling kiezen", "DLP-regels en meldingen ontwerpen"], result: "Ontwerpdocument en configuratie-export" },
      { n: "3", title: "Simuleren", icon: "flask", text: "Test het ontwerp zonder impact: simulatie en een pilotgroep.", do: ["Labels publiceren aan een pilotgroep", "DLP en auto-labeling in simulatie", "Fout-positieven analyseren en regels bijstellen"], result: "Getest ontwerp met cijfers uit de eigen omgeving" },
      { n: "4", title: "Uitrollen", icon: "play", text: "Zet het beleid gefaseerd aan, met uitleg en ondersteuning.", do: ["Communicatie en korte training", "Policy tips aan, daarna Block with override", "Blokkeren waar het echt moet"], result: "Beleid actief voor de hele organisatie" },
      { n: "5", title: "Borgen", icon: "chart", text: "Volg signalen op en verbeter het ontwerp continu.", do: ["Alerts opvolgen volgens afspraken", "Kwartaalreview van regels en adoptie", "Nieuwe risico's meenemen, zoals AI-gebruik"], result: "Een lerende, beheerde aanpak" },
    ],
  },

  /* ---------- Begrippenlijst ---------- */
  glossaryCats: ["Basis", "Herkennen", "Labelen", "DLP", "Apparaten", "Copilot & AI", "Beheer"],
  glossary: [
    { term: "Microsoft Purview", cat: "Basis", def: "De familie van Microsoft-oplossingen voor databeveiliging, data governance en compliance.", learn: "purviewPortal" },
    { term: "Information Protection", cat: "Basis", def: "Het Purview-onderdeel dat informatie herkent, labelt en beschermt.", learn: "ipOverview" },
    { term: "Microsoft 365 E5", cat: "Basis", def: "Licentie met onder meer automatisch labelen in de cloud, Endpoint DLP, Teams-DLP, classifiers en EDM.", learn: "licensing" },
    { term: "Sensitive information type (SIT)", cat: "Herkennen", def: "Een definitie die een soort gegeven herkent, zoals een BSN of IBAN, op basis van patroon, checksum en trefwoorden.", learn: "sitLearn" },
    { term: "Gevoelige informatie", cat: "Herkennen", def: "Informatie die zorgvuldig moet worden behandeld, zoals persoonsgegevens, financiële informatie of bedrijfsgeheimen." },
    { term: "Dataminimalisatie", cat: "Herkennen", def: "Alleen de gegevens gebruiken en delen die werkelijk nodig zijn voor het doel." },
    { term: "Fout-positief", cat: "Herkennen", def: "Een melding over informatie die in deze situatie niet het bedoelde risico vormt. Meld dit via de afgesproken route." },
    { term: "Gemiste herkenning", cat: "Herkennen", def: "Gevoelige informatie die geen melding oplevert. Geen melding is daarom geen bewijs dat delen veilig is." },
    { term: "Indirect herkenbaar", cat: "Herkennen", def: "Een persoon is soms herkenbaar aan een combinatie van details, ook zonder naam of identificatienummer." },
    { term: "Exact Data Match (EDM)", cat: "Herkennen", def: "Helpt gegevens uit een bekende organisatielijst te herkennen.", learn: "edm" },
    { term: "Document fingerprinting", cat: "Herkennen", def: "Maakt van een standaardformulier een informatietype, zodat ingevulde versies herkend worden.", learn: "fingerprint" },
    { term: "Trainable classifier", cat: "Herkennen", def: "Herkent een soort document, zoals een cv of contract, aan de hand van voorbeelden.", learn: "classifiers" },
    { term: "Sensitivity label", cat: "Labelen", def: "Een classificatie die bij de inhoud blijft en bescherming kan toevoegen, zoals versleuteling en markeringen.", learn: "labels" },
    { term: "Labelbeleid (label policy)", cat: "Labelen", def: "Publiceert labels aan medewerkers en regelt bijvoorbeeld het standaardlabel en verplicht labelen." },
    { term: "Labelprioriteit", cat: "Labelen", def: "De rangorde van labels, van minder naar meer vertrouwelijk." },
    { term: "Label groups", cat: "Labelen", def: "Een groepering die helpt verwante labels bij elkaar te vinden.", learn: "labelGroups" },
    { term: "Standaardlabel", cat: "Labelen", def: "Het label dat automatisch wordt toegepast als de medewerker zelf niets kiest." },
    { term: "Verplicht labelen", cat: "Labelen", def: "Een instelling waardoor een document of e-mail pas kan worden opgeslagen of verzonden met een label." },
    { term: "Justification", cat: "Labelen", def: "De reden die een medewerker opgeeft bij het verlagen of verwijderen van een label." },
    { term: "Usage rights", cat: "Labelen", def: "Rechten bij versleuteling: bijvoorbeeld mogen lezen, bewerken, afdrukken of de inhoud overnemen.", learn: "usageRights" },
    { term: "Double Key Encryption (DKE)", cat: "Labelen", def: "Versleuteling met een tweede sleutel in eigen beheer; Microsoft-diensten kunnen de inhoud niet lezen.", learn: "dke" },
    { term: "Content marking", cat: "Labelen", def: "Koptekst, voettekst of watermerk die een label zichtbaar maakt." },
    { term: "Containerlabel", cat: "Labelen", def: "Een label voor Teams, Microsoft 365-groepen en SharePoint-sites, met onder meer privacy- en deelinstellingen.", learn: "labelsContainers" },
    { term: "Labelaanbeveling", cat: "Labelen", def: "Een voorstel in de Office-apps dat de medewerker kan controleren, accepteren of afwijzen.", learn: "labelsAuto" },
    { term: "Auto-labeling policy", cat: "Labelen", def: "Automatisch labelen in de cloud: bestanden in SharePoint en OneDrive en e-mail in Exchange.", learn: "labelsAuto" },
    { term: "Data Loss Prevention (DLP)", cat: "DLP", def: "Beleid dat voorkomt dat gevoelige informatie ongewenst wordt gedeeld.", learn: "dlp" },
    { term: "DLP-locatie", cat: "DLP", def: "De plek waar een DLP-afspraak werkt, zoals e-mail, gedeelde bestanden, chats, apparaten of Copilot.", learn: "dlpReference" },
    { term: "Policy tip", cat: "DLP", def: "Een melding in de app die uitlegt waarom iets gevoelig is en wat de medewerker kan doen.", learn: "dlpTips" },
    { term: "Audit only", cat: "DLP", def: "DLP-actie die alleen vastlegt; de medewerker kan gewoon doorgaan." },
    { term: "Block with override", cat: "DLP", def: "DLP-actie die tegenhoudt, maar doorgaan toestaat met een (zakelijke) reden." },
    { term: "Simulation mode", cat: "DLP", def: "Een beleid meet wat er zou matchen, zonder in te grijpen; eventueel met policy tips.", learn: "dlpSimulation" },
    { term: "Endpoint DLP", cat: "Apparaten", def: "DLP op Windows- en macOS-apparaten, bijvoorbeeld bij USB, uploaden en afdrukken.", learn: "endpoint" },
    { term: "Device onboarding", cat: "Apparaten", def: "Het aansluiten van apparaten op Purview, zodat DLP-beleid erop kan werken.", learn: "deviceOnboarding" },
    { term: "Restricted apps", cat: "Apparaten", def: "Apps die gevoelige bestanden niet (of alleen met een melding) mogen openen." },
    { term: "Oversharing", cat: "Copilot & AI", def: "Informatie die voor te veel mensen toegankelijk is; Copilot maakt dat sneller zichtbaar." },
    { term: "Microsoft 365 Copilot and Copilot Chat", cat: "Copilot & AI", def: "De DLP-locatie waarmee u gelabelde inhoud en gevoelige prompts uitsluit van Copilot.", learn: "dlpCopilot" },
    { term: "DSPM for AI", cat: "Copilot & AI", def: "Inzicht in AI-gebruik en gevoelige informatie in prompts, met beleidsaanbevelingen.", learn: "dspmAi" },
    { term: "DLP-alert", cat: "Beheer", def: "Een signaal voor bevoegde medewerkers om een gebeurtenis en de context te beoordelen.", learn: "dlpAlerts" },
    { term: "Activity explorer", cat: "Beheer", def: "Overzicht van activiteiten met gelabelde en gevoelige inhoud.", learn: "explorers" },
    { term: "Content explorer", cat: "Beheer", def: "Laat zien waar inhoud met informatietypen of labels staat.", learn: "contentExplorer" },
    { term: "Audit", cat: "Beheer", def: "Het auditlogboek met activiteiten van gebruikers en beheerders.", learn: "audit" },
  ],
};
