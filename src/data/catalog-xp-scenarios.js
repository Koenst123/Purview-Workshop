/* Ervaar Purview → Scenario's: losstaande praktijksituaties per sector, met vaste uitkomsten.
   Gegenereerd uit de copywriting-review en gecontroleerd op Microsoft Learn. Los van het ontwerp, presets en ScenarioEngine.
   Fictieve organisaties en gegevens; testnummers (BSN 111222333, IBAN NL91ABNA0417164300) zijn geen echte gegevens. */
CATALOG.xpScenarios = {
 "version": 1,
 "sectors": [
  {
   "id": "generic",
   "name": "Algemeen",
   "org": "Noordhaven",
   "desc": "Kantoororganisatie",
   "illu": "illuGeneric"
  },
  {
   "id": "zorg",
   "name": "Zorg",
   "org": "Zorggroep Rivierland",
   "desc": "Zorginstelling",
   "illu": "illuZorg"
  },
  {
   "id": "overheid",
   "name": "Overheid",
   "org": "Gemeente Westerkade",
   "desc": "Gemeente",
   "illu": "illuOverheid"
  },
  {
   "id": "financieel",
   "name": "Financieel",
   "org": "Kustbank",
   "desc": "Bank",
   "illu": "illuFinancieel"
  }
 ],
 "items": [
  {
   "id": "gen-salarismutaties-mail",
   "sector": "generic",
   "channel": "mail",
   "title": "Salarismutaties mailen naar het salarisbureau",
   "person": {
    "name": "Esra",
    "role": "Salarisadministrateur"
   },
   "teaser": "Esra mailt de salarismutaties van deze maand naar een externe partij. Wat gebeurt er als ze op Verzenden klikt?",
   "story": "Esra stuurt elke maand de salarismutaties naar het externe salarisbureau. Dit keer zit er een Excel-bestand bij met de BSN's en IBAN's van medewerkers. Ze klikt op Verzenden.",
   "outcome": "tip",
   "result": "Een Policy tip meldt dat de bijlage BSN's en IBAN's bevat. Esra kan alleen doorgaan als ze een zakelijke reden geeft.",
   "why": "Purview herkent BSN's en IBAN's aan het patroon, een controlegetal en woorden die erbij staan. Omdat de mail naar buiten gaat, vraagt Outlook Esra om een reden. Ze vult in dat het salarisbureau de vaste verwerker is, en de mail gaat weg. Die reden wordt bewaard.",
   "features": [
    {
     "key": "dlp",
     "name": "Data Loss Prevention (DLP)",
     "text": "Controleert berichten op gevoelige gegevens en grijpt in volgens de afspraken van de organisatie."
    },
    {
     "key": "override",
     "name": "Block with override",
     "text": "Houdt het bericht tegen, maar laat de medewerker doorgaan met een zakelijke reden die wordt vastgelegd."
    }
   ],
   "value": "Een bestand met BSN's gaat niet meer ongemerkt naar buiten. Achteraf ziet de organisatie wie doorging en met welke reden.",
   "note": "Voor een maandelijkse uitwisseling is een beveiligde portal of koppeling met het salarisbureau beter dan e-mail. Doorgaan met een reden is bedoeld voor uitzonderingen, niet als vaste route.",
   "lesson": "dlp",
   "before": {
    "t": "mail",
    "to": "mutaties@salarisbureau.example",
    "subj": "Salarismutaties oktober",
    "body": "Hoi, hierbij de mutaties voor oktober.",
    "attach": "Mutaties-oktober.xlsx",
    "label": "vertrouwelijk"
   },
   "after": {
    "t": "mail",
    "to": "mutaties@salarisbureau.example",
    "subj": "Salarismutaties oktober",
    "body": "Hoi, hierbij de mutaties voor oktober.",
    "attach": "Mutaties-oktober.xlsx",
    "label": "vertrouwelijk",
    "bars": [
     [
      "override",
      "Policy tip: gevoelige gegevens",
      "Deze bijlage bevat BSN's en IBAN's en gaat naar buiten Noordhaven. Geef een zakelijke reden als je toch wilt verzenden."
     ]
    ]
   },
   "next": "Gaan dezelfde gegevens elke maand naar dezelfde partij? Vraag dan om een vaste, beveiligde route. Tot die er is: controleer het adres en stuur alleen de kolommen die het salarisbureau nodig heeft."
  },
  {
   "id": "gen-klantoverzicht-label",
   "sector": "generic",
   "channel": "doc",
   "title": "Klantoverzicht met bankgegevens in Word",
   "person": {
    "name": "Mark",
    "role": "Accountmanager"
   },
   "teaser": "Mark zet bankgegevens van klanten in een nieuw Word-document. Doet Purview daar iets mee?",
   "story": "Mark maakt in Word een overzicht van klanten die per incasso betalen. Hij typt de bankrekeningnummers erbij, zodat de financiële afdeling het overzicht kan controleren. Het document heeft nog geen label.",
   "outcome": "tip",
   "result": "Word stelt het label Vertrouwelijk voor. Mark kiest zelf of hij het voorstel overneemt.",
   "why": "Word herkent de IBAN's in de tekst en stelt het label voor dat Noordhaven daarvoor heeft afgesproken. Mark beslist zelf. Neemt hij het over, dan gelden meteen de regels voor Vertrouwelijk, bijvoorbeeld bij delen met mensen buiten de organisatie.",
   "features": [
    {
     "key": "recommend",
     "name": "Client-side auto-labeling",
     "text": "Stelt in Word, Excel, PowerPoint en Outlook een label voor als er gevoelige gegevens in het bestand staan."
    },
    {
     "key": "label",
     "name": "Sensitivity label",
     "text": "Een etiket op het bestand dat laat zien hoe gevoelig het is en welke afspraken ervoor gelden."
    }
   ],
   "value": "Medewerkers krijgen hulp bij het kiezen van een label terwijl ze aan het bestand werken. Hun werk loopt gewoon door.",
   "note": "Een voorstel is zo weggeklikt. Dat gebeurt vooral als niet duidelijk is wat een label betekent. Een korte uitleg per label helpt.",
   "lesson": "autolabel",
   "before": {
    "t": "doc",
    "file": "Klantoverzicht-incasso.docx",
    "label": "none",
    "text": "Incasso Drukkerij De Haven: IBAN NL91ABNA0417164300, maandelijks € 450."
   },
   "after": {
    "t": "doc",
    "file": "Klantoverzicht-incasso.docx",
    "label": "none",
    "text": "Incasso Drukkerij De Haven: IBAN NL91ABNA0417164300, maandelijks € 450.",
    "bars": [
     [
      "recommend",
      "Aanbevolen label: Vertrouwelijk",
      "Dit document bevat bankrekeningnummers. Noordhaven raadt het label Vertrouwelijk aan."
     ]
    ]
   },
   "next": "Neem het voorgestelde label over als het bij de inhoud past. Twijfel je, kies dan het hogere label en vraag het na bij je leidinggevende."
  },
  {
   "id": "gen-begroting-extern",
   "sector": "generic",
   "channel": "share",
   "title": "Begroting delen met een externe adviseur",
   "person": {
    "name": "Fatima",
    "role": "Projectleider"
   },
   "teaser": "Fatima wil vandaag nog een reactie van een externe adviseur op de begroting. Kan hij het bestand openen?",
   "story": "Fatima wil vandaag nog feedback op de begroting voor 2027. Ze deelt het bestand via OneDrive met een adviseur van een extern bureau. Het bestand heeft het label Vertrouwelijk.",
   "outcome": "block",
   "result": "Fatima ziet in OneDrive een Policy tip. De adviseur krijgt geen toegang, omdat het bestand het label Vertrouwelijk heeft.",
   "why": "Noordhaven heeft afgesproken dat bestanden met het label Vertrouwelijk niet buiten de organisatie worden gedeeld. Een DLP-regel kijkt naar het label en houdt toegang voor externen tegen. Collega's kunnen het bestand wel openen. Of Fatima überhaupt met mensen buiten Noordhaven kan delen, hangt ook af van de deelinstellingen van OneDrive.",
   "features": [
    {
     "key": "dlp",
     "name": "Data Loss Prevention (DLP)",
     "text": "Kan voorkomen dat mensen buiten de organisatie een bestand openen als het gevoelige gegevens of een bepaald label heeft."
    },
    {
     "key": "label",
     "name": "Sensitivity label",
     "text": "Het label Vertrouwelijk bepaalt welke regel van toepassing is."
    }
   ],
   "value": "Vertrouwelijke stukken blijven binnen de organisatie, ook als iemand haast heeft.",
   "note": "Een gastaccount is ook extern, dus die regel geldt daar net zo goed. Een blokkade werkt alleen als er een alternatief is; anders gaan mensen het bestand mailen of in een privédienst zetten.",
   "lesson": "dlp",
   "before": {
    "t": "share",
    "file": "Begroting-2027.xlsx",
    "to": "j.bakker@adviesbureau.example",
    "label": "vertrouwelijk"
   },
   "after": {
    "t": "share",
    "file": "Begroting-2027.xlsx",
    "to": "j.bakker@adviesbureau.example",
    "label": "vertrouwelijk",
    "bars": [
     [
      "block",
      "Geen toegang voor externen",
      "Dit bestand heeft het label Vertrouwelijk. Mensen buiten Noordhaven kunnen het niet openen."
     ]
    ]
   },
   "next": "Deel vandaag alleen de hoofdlijnen in een apart document zonder vertrouwelijke details. Heeft de adviseur de volledige begroting nodig, vraag dan via het uitzonderingsproces van Noordhaven toegang aan. Werk je vaker samen, laat dan een partnersite inrichten die bewust buiten deze regel valt."
  },
  {
   "id": "gen-teams-nieuwe-collega",
   "sector": "generic",
   "channel": "teams",
   "title": "Gegevens van een nieuwe collega in Teams",
   "person": {
    "name": "Lisa",
    "role": "HR-adviseur"
   },
   "teaser": "Lisa zet de gegevens van een nieuwe collega in een Teams-chat. Komt het bericht aan?",
   "story": "Lisa regelt de indiensttreding van een nieuwe collega. Ze wil snel controleren of de gegevens kloppen. Daarom plakt ze de naam, het BSN en de IBAN in een chat met de leidinggevende.",
   "outcome": "block",
   "result": "Lisa ziet 'Dit bericht is geblokkeerd' met uitleg. De leidinggevende ziet de inhoud niet.",
   "why": "Chatberichten worden snel gelezen, blijven lang staan en zijn makkelijk door te sturen. DLP herkent het BSN en de IBAN en houdt het bericht tegen. De leidinggevende ziet alleen dat er een bericht is geblokkeerd, niet de inhoud.",
   "features": [
    {
     "key": "teams",
     "name": "DLP for Teams",
     "text": "Blokkeert chat- en kanaalberichten met gevoelige gegevens, zodat de ontvanger de inhoud niet ziet."
    }
   ],
   "value": "Persoonsgegevens komen niet terecht in chats die veel mensen kunnen teruglezen.",
   "note": "Purview herkent een BSN het best als er een woord als 'BSN' bij staat. Een los getal zonder uitleg kan worden gemist.",
   "lesson": "dlp",
   "before": {
    "t": "chat",
    "title": "Lisa en Ruben",
    "me": "Lisa",
    "text": "Nieuwe collega Eva Jansen, BSN 111222333, IBAN NL91ABNA0417164300. Klopt dit zo?",
    "state": "draft"
   },
   "after": {
    "t": "chat",
    "title": "Lisa en Ruben",
    "me": "Lisa",
    "text": "Nieuwe collega Eva Jansen, BSN 111222333, IBAN NL91ABNA0417164300. Klopt dit zo?",
    "state": "blocked"
   },
   "next": "Vraag in de chat alleen of de gegevens kloppen, bijvoorbeeld: 'Heb je de gegevens van Eva in het HR-systeem kunnen nakijken?' De nummers zelf blijven in het HR-systeem."
  },
  {
   "id": "gen-usb-beurs",
   "sector": "generic",
   "channel": "device",
   "title": "Presentatie op een USB-stick voor de beurs",
   "person": {
    "name": "Jasper",
    "role": "Marketeer"
   },
   "teaser": "Jasper zet een interne presentatie op een USB-stick. Wat merkt hij daarvan?",
   "story": "Jasper staat morgen op een beurs, maar de computer daar heeft geen internet. Daarom kopieert hij de presentatie naar een USB-stick. Het bestand heeft het label Intern.",
   "outcome": "ok",
   "result": "Het bestand wordt gekopieerd en Jasper krijgt geen melding.",
   "why": "Noordhaven wil eerst weten hoe vaak bestanden naar een USB-stick gaan, voordat er regels komen. Endpoint DLP legt de actie daarom alleen vast. Jasper merkt niets. Het beveiligingsteam ziet de gebeurtenis later in Activity explorer.",
   "features": [
    {
     "key": "endpoint",
     "name": "Endpoint DLP",
     "text": "Houdt op aangesloten apparaten bij wat er met gevoelige bestanden gebeurt, zoals kopiëren naar een USB-stick."
    },
    {
     "key": "audit",
     "name": "Activity explorer",
     "text": "Laat het beveiligingsteam zien welke acties met gevoelige bestanden zijn uitgevoerd."
    }
   ],
   "value": "De organisatie ziet eerst hoe er echt gewerkt wordt en kan daarna regels kiezen die bij het werk passen.",
   "note": "Dit werkt alleen op apparaten die zijn aangesloten op Endpoint DLP. Een privélaptop valt erbuiten.",
   "lesson": "endpoint",
   "before": {
    "t": "toast",
    "level": "none",
    "act": "Kopiëren naar USB",
    "file": "Beurspresentatie-2026.pptx",
    "note": "Jasper sleept het bestand naar de USB-stick."
   },
   "after": {
    "t": "toast",
    "level": "audit",
    "act": "Kopiëren naar USB",
    "file": "Beurspresentatie-2026.pptx",
    "note": "Het kopiëren is klaar en Jasper ziet geen melding. De actie staat in Activity explorer."
   },
   "next": "Is de presentatie bedoeld voor publiek, controleer dan de inhoud en kies het label Openbaar. Blijft het intern, zet dan alleen deze presentatie op een versleutelde stick van de organisatie en haal hem er na de beurs weer af."
  },
  {
   "id": "gen-copilot-bonussen",
   "sector": "generic",
   "channel": "copilot",
   "title": "Copilot vragen naar bonusafspraken",
   "person": {
    "name": "Youssef",
    "role": "Medewerker klantenservice"
   },
   "teaser": "Youssef vraagt Copilot naar de bonusafspraken. Wat krijgt hij te zien?",
   "story": "Youssef wil weten hoe de bonusregeling werkt en stelt een vraag aan Microsoft 365 Copilot. Copilot vindt een Excel-bestand van HR dat per ongeluk voor de hele organisatie openstaat. Het bestand heeft geen label.",
   "outcome": "ok",
   "result": "Copilot noemt de bonussen van een paar collega's en geeft het HR-bestand als bron.",
   "why": "Copilot gebruikt alleen bestanden die Youssef zelf al mag openen. Het probleem zit in het HR-bestand dat voor iedereen openstaat. Er zit geen label op, dus er is ook geen regel die ingrijpt.",
   "features": [
    {
     "key": "copilot",
     "name": "Microsoft 365 Copilot",
     "text": "Zoekt en vat samen met de rechten van de gebruiker en geeft geen extra toegang."
    },
    {
     "key": "label",
     "name": "Sensitivity label",
     "text": "Met een label had DLP dit bestand kunnen uitsluiten van Copilot-antwoorden."
    }
   ],
   "value": "Dit scenario laat zien waarom je rechten en labels op orde brengt voordat je Copilot breed invoert.",
   "note": "Een DLP-regel voor Copilot had dit bestand kunnen uitsluiten, maar alleen als het een label had. Het eigenlijke probleem, te ruime toegang, lost DLP niet op. Dat moet de eigenaar van het bestand herstellen.",
   "lesson": "copilot",
   "before": {
    "t": "copilot",
    "prompt": "Welke bonusafspraken gelden er dit jaar?",
    "kind": "wait",
    "label": "none"
   },
   "after": {
    "t": "copilot",
    "prompt": "Welke bonusafspraken gelden er dit jaar?",
    "kind": "ok",
    "file": "Bonussen-2026-HR.xlsx",
    "label": "none",
    "answer": "Volgens Bonussen-2026-HR.xlsx krijgen drie collega's van klantenservice dit jaar een bonus tussen € 1.500 en € 2.500."
   },
   "next": "Gebruik de bedragen niet en stuur het antwoord niet door. Meld bij HR of de servicedesk dat het bestand voor iedereen openstaat, zodat de eigenaar de toegang kan beperken."
  },
  {
   "id": "zorg-wmo-mail-gemeente",
   "sector": "zorg",
   "channel": "mail",
   "title": "Wmo-correctie mailen naar de gemeente",
   "person": {
    "name": "Ilse",
    "role": "Zorgadministrateur"
   },
   "teaser": "Ilse mailt een lijst met cliënten naar de gemeente. Wat gebeurt er als ze op Verzenden klikt?",
   "story": "De gemeente vraagt om een correctie op de Wmo-declaratie van september. Ilse maakt een Excel-lijst met namen en BSN's van cliënten en wil die snel mailen. Ze klikt op Verzenden.",
   "outcome": "tip",
   "result": "Een Policy tip meldt dat de bijlage BSN's bevat. Ilse kan alleen doorgaan als ze een zakelijke reden geeft.",
   "why": "Purview herkent het BSN aan het patroon, een controlegetal en woorden die erbij staan. Omdat de mail buiten Rivierland gaat, vraagt Outlook Ilse om een reden. Ze kan ook eerst het bericht aanpassen.",
   "features": [
    {
     "key": "dlp",
     "name": "Data Loss Prevention (DLP)",
     "text": "Controleert berichten op gevoelige gegevens en waarschuwt voordat ze worden verzonden."
    },
    {
     "key": "override",
     "name": "Block with override",
     "text": "Houdt het bericht tegen, maar laat de medewerker doorgaan met een zakelijke reden die wordt vastgelegd."
    }
   ],
   "value": "Cliëntgegevens gaan alleen bewust naar buiten. De privacyfunctionaris kan de opgegeven redenen nalezen.",
   "note": "Voor vaste uitwisseling met gemeenten is een beveiligde route beter dan e-mail. Doorgaan met een reden is bedoeld voor uitzonderingen.",
   "lesson": "dlp",
   "before": {
    "t": "mail",
    "to": "wmo@gemeente-rivierstad.example",
    "subj": "Correctie Wmo-declaratie september",
    "body": "Hierbij de gecorrigeerde lijst met cliënten.",
    "attach": "Wmo-correctie-september.xlsx",
    "label": "vertrouwelijk"
   },
   "after": {
    "t": "mail",
    "to": "wmo@gemeente-rivierstad.example",
    "subj": "Correctie Wmo-declaratie september",
    "body": "Hierbij de gecorrigeerde lijst met cliënten.",
    "attach": "Wmo-correctie-september.xlsx",
    "label": "vertrouwelijk",
    "bars": [
     [
      "override",
      "Policy tip: burgerservicenummers",
      "Deze bijlage bevat BSN's en gaat naar buiten Rivierland. Pas het bericht aan of geef een zakelijke reden om toch te verzenden."
     ]
    ]
   },
   "next": "Gebruik voor declaraties en correcties het beveiligde berichtenverkeer dat jullie met de gemeente hebben. Moet het toch per mail, stuur dan alleen de cliënten van deze correctie en controleer het adres."
  },
  {
   "id": "zorg-print-nachtdienst",
   "sector": "zorg",
   "channel": "device",
   "title": "Bewonersoverzicht printen voor de nachtdienst",
   "person": {
    "name": "Nadia",
    "role": "Teamleider verpleging"
   },
   "teaser": "Nadia print een bewonersoverzicht voor de nachtdienst. Wat gebeurt er als ze op Afdrukken klikt?",
   "story": "De tablets op de afdeling zijn 's nachts vaak leeg. Daarom print Nadia elke avond een overzicht van bewoners en medicatietijden voor de nachtdienst. Het bestand heeft het label Vertrouwelijk.",
   "outcome": "tip",
   "result": "Windows meldt dat afdrukken beperkt is. Nadia kan doorgaan als ze een reden opgeeft.",
   "why": "Een geprinte lijst kan blijven liggen of mee naar huis gaan. Endpoint DLP vraagt Nadia daarom om een reden voordat ze afdrukt. Ze vult 'overdracht nachtdienst' in en de lijst komt uit de printer.",
   "features": [
    {
     "key": "endpoint",
     "name": "Endpoint DLP",
     "text": "Kan op aangesloten apparaten acties zoals afdrukken vastleggen, beperken of blokkeren."
    },
    {
     "key": "override",
     "name": "Block with override",
     "text": "De medewerker kan doorgaan met een reden, en die reden wordt vastgelegd."
    }
   ],
   "value": "Afdrukken blijft mogelijk als de zorg dat nodig heeft. De organisatie ziet hoe vaak en waarom het gebeurt.",
   "note": "Na het printen heeft Purview geen invloed meer op het papier. Afspraken over opbergen en vernietigen blijven nodig.",
   "lesson": "endpoint",
   "before": {
    "t": "toast",
    "level": "none",
    "act": "Afdrukken",
    "file": "Bewonersoverzicht-afdeling-3.xlsx",
    "note": "Nadia kiest Afdrukken op de afdelingsprinter."
   },
   "after": {
    "t": "toast",
    "level": "warn",
    "act": "Afdrukken",
    "file": "Bewonersoverzicht-afdeling-3.xlsx"
   },
   "next": "Print alleen wat de nachtdienst nodig heeft en haal de lijst direct van de printer. Gooi hem na de dienst in de container voor vertrouwelijk papier. Bespreek ook hoe de tablets 's nachts geladen blijven, dan hoeft er minder op papier."
  },
  {
   "id": "zorg-teams-nieuwe-bewoner",
   "sector": "zorg",
   "channel": "teams",
   "title": "Snel overleg over een nieuwe bewoner in Teams",
   "person": {
    "name": "Bram",
    "role": "Verpleegkundige"
   },
   "teaser": "Bram stelt in Teams een vraag over een nieuwe bewoner. Ziet de arts zijn bericht?",
   "story": "Bram wil snel overleggen met de specialist ouderengeneeskunde over een nieuwe bewoner. In een Teams-chat zet hij de naam, het BSN en een vraag over de medicatie.",
   "outcome": "block",
   "result": "Bram ziet 'Dit bericht is geblokkeerd' met uitleg. De arts ziet de inhoud niet.",
   "why": "DLP herkent het BSN en houdt het bericht tegen. De arts ziet alleen dat er een bericht is geblokkeerd, niet de inhoud. Teams is handig voor snel overleg, maar cliëntgegevens horen in het cliëntdossier.",
   "features": [
    {
     "key": "teams",
     "name": "DLP for Teams",
     "text": "Blokkeert chat- en kanaalberichten met gevoelige gegevens, zodat de ontvanger de inhoud niet ziet."
    }
   ],
   "value": "Identificeerbare cliëntgegevens komen niet terecht in chats die lang bewaard blijven en makkelijk worden doorgestuurd.",
   "note": "Purview herkent het BSN, maar Nederlandse medische tekst wordt niet betrouwbaar herkend. Zonder BSN was dit bericht misschien wel verstuurd.",
   "lesson": "dlp",
   "before": {
    "t": "chat",
    "title": "Overleg afdeling 2",
    "me": "Bram",
    "text": "Mevr. Jansen, BSN 111222333, nieuw op kamer 14. Kun je haar medicatie nog nakijken?",
    "state": "draft"
   },
   "after": {
    "t": "chat",
    "title": "Overleg afdeling 2",
    "me": "Bram",
    "text": "Mevr. Jansen, BSN 111222333, nieuw op kamer 14. Kun je haar medicatie nog nakijken?",
    "state": "blocked"
   },
   "next": "Stel je vraag zonder BSN: 'Nieuwe bewoner op kamer 14, kun je vandaag haar medicatie in het dossier nakijken?' De arts vindt de gegevens in het cliëntdossier."
  },
  {
   "id": "zorg-copilot-incidenten",
   "sector": "zorg",
   "channel": "copilot",
   "title": "Incidentmeldingen samenvatten met Copilot",
   "person": {
    "name": "Femke",
    "role": "Beleidsmedewerker kwaliteit"
   },
   "teaser": "Femke vraagt Copilot om incidentmeldingen samen te vatten. Wat komt er in het antwoord?",
   "story": "Femke schrijft een kwaliteitsrapport en vraagt Microsoft 365 Copilot om de belangrijkste punten uit de incidentmeldingen van het afgelopen kwartaal. Eén verslag heeft het label Strikt vertrouwelijk, omdat er cliëntgegevens in staan. Femke heeft wel toegang tot dat verslag.",
   "outcome": "block",
   "result": "Copilot noemt het verslag als bron, maar gebruikt de inhoud ervan niet in het antwoord.",
   "why": "Rivierland heeft met DLP ingesteld dat Copilot bestanden met het label Strikt vertrouwelijk niet in antwoorden gebruikt. Femke kan het verslag zelf openen en lezen. Zo komen gevoelige details niet ongemerkt in een samenvatting of rapport terecht.",
   "features": [
    {
     "key": "copilot",
     "name": "DLP for Microsoft 365 Copilot",
     "text": "Zorgt dat Copilot bestanden en e-mails met een bepaald label niet in antwoorden gebruikt."
    },
    {
     "key": "label",
     "name": "Sensitivity label",
     "text": "Het label Strikt vertrouwelijk bepaalt welke bestanden worden uitgesloten."
    }
   ],
   "value": "Medewerkers kunnen Copilot gebruiken, terwijl de meest gevoelige verslagen buiten de antwoorden blijven.",
   "note": "Dit werkt alleen als het verslag een label heeft. Een verslag zonder label gebruikt Copilot gewoon.",
   "lesson": "copilot",
   "before": {
    "t": "copilot",
    "prompt": "Vat de incidentmeldingen van het afgelopen kwartaal samen.",
    "kind": "wait",
    "label": "none"
   },
   "after": {
    "t": "copilot",
    "prompt": "Vat de incidentmeldingen van het afgelopen kwartaal samen.",
    "kind": "excluded",
    "file": "Incidentverslag-Q3-afdeling-2.docx",
    "label": "strikt"
   },
   "next": "Lees het strikt vertrouwelijke verslag zelf en neem in het rapport alleen op wat zonder cliëntgegevens kan. Twijfel je, overleg dan met de privacyfunctionaris."
  },
  {
   "id": "zorg-mdo-verkeerde-tim",
   "sector": "zorg",
   "channel": "mail",
   "title": "MDO-verslag naar de verkeerde Tim",
   "person": {
    "name": "Anouk",
    "role": "Medisch secretaresse"
   },
   "teaser": "Anouk mailt een MDO-verslag, maar Outlook kiest het verkeerde adres. Wat kan de ontvanger zien?",
   "story": "Anouk stuurt het verslag van het multidisciplinair overleg (MDO) naar haar collega Tim. Outlook vult het adres aan van een andere Tim, die bij een leverancier werkt. Het verslag heeft het label Strikt vertrouwelijk.",
   "outcome": "ok",
   "result": "De mail wordt verstuurd. De leverancier kan het versleutelde verslag niet openen.",
   "why": "Bij Rivierland versleutelt het label Strikt vertrouwelijk het bestand. Alleen medewerkers van Rivierland kunnen het openen, ook als het is doorgestuurd of gedownload. De vergissing is gemaakt, maar de leverancier kan het verslag niet lezen.",
   "features": [
    {
     "key": "encrypt",
     "name": "Sensitivity label with encryption",
     "text": "Versleutelt het bestand, zodat alleen bevoegde mensen het kunnen openen, waar het ook terechtkomt."
    }
   ],
   "value": "Een fout in het adresveld heeft minder grote gevolgen, omdat de ontvanger de inhoud niet kan lezen.",
   "note": "Versleuteling beperkt de schade, maar de verkeerde persoon weet nu wel dat er een MDO-verslag bestaat. Laat de privacyfunctionaris beoordelen of dit een datalek is.",
   "lesson": "labels",
   "before": {
    "t": "mail",
    "to": "tim.degroot@leverancier.example",
    "subj": "Verslag MDO dinsdag",
    "body": "Hoi Tim, hierbij het verslag van het MDO van dinsdag.",
    "attach": "MDO-verslag-dinsdag.docx",
    "label": "strikt"
   },
   "after": {
    "t": "mail",
    "to": "tim.degroot@leverancier.example",
    "subj": "Verslag MDO dinsdag",
    "body": "Hoi Tim, hierbij het verslag van het MDO van dinsdag.",
    "attach": "MDO-verslag-dinsdag.docx",
    "label": "strikt",
    "bars": [
     [
      "encrypt",
      "Versleuteld",
      "Alleen medewerkers van Rivierland kunnen deze bijlage openen."
     ]
    ]
   },
   "next": "Meld de vergissing meteen bij de privacyfunctionaris en vraag de ontvanger de mail te verwijderen. Kijk voortaan naar het volledige adres voordat je op Verzenden klikt."
  },
  {
   "id": "zorg-overdracht-invalkracht",
   "sector": "zorg",
   "channel": "share",
   "title": "Overdracht delen met een externe invalkracht",
   "person": {
    "name": "Sophie",
    "role": "Wijkverpleegkundige"
   },
   "teaser": "Sophie deelt overdrachtsnotities met een invalkracht van buiten. Wat doet Purview?",
   "story": "Deze week valt een zzp-verpleegkundige in voor het wijkteam. Sophie deelt via OneDrive een Word-document met overdrachtsnotities. Er staan namen, adressen en diagnoses in, maar geen BSN, en het document heeft geen label.",
   "outcome": "ok",
   "result": "Het delen lukt zonder melding. De invalkracht kan het document openen.",
   "why": "Namen, adressen en diagnoses in Nederlandse tekst herkent Purview niet betrouwbaar; de ingebouwde herkenning van medische tekst werkt vooral in het Engels. Er staat geen BSN in en het document heeft geen label, dus geen enkele regel grijpt in. Sophie moet zelf beoordelen of deze invalkracht alles mag zien en of OneDrive hiervoor de juiste route is.",
   "features": [
    {
     "key": "dlp",
     "name": "Data Loss Prevention (DLP)",
     "text": "Grijpt alleen in als het gevoelige gegevens herkent of als het bestand een bepaald label heeft."
    },
    {
     "key": "label",
     "name": "Sensitivity label",
     "text": "Had Sophie het label Vertrouwelijk gekozen, dan kan een DLP-regel delen met externen tegenhouden of eerst waarschuwen. Die regel moet je organisatie dan wel hebben ingesteld."
    }
   ],
   "value": "Dit scenario laat zien waar de techniek ophoudt en waar training en duidelijke afspraken nodig zijn.",
   "note": "Je kunt eigen herkenning toevoegen, bijvoorbeeld een lijst met zorgwoorden in een eigen Sensitive information type. Test die eerst in simulatie, want gewone tekst blijft lastig.",
   "lesson": "data",
   "before": {
    "t": "share",
    "file": "Overdracht-wijkteam-week-44.docx",
    "to": "invalkracht@zzpzorg.example",
    "label": "none"
   },
   "after": {
    "t": "share",
    "file": "Overdracht-wijkteam-week-44.docx",
    "to": "invalkracht@zzpzorg.example",
    "label": "none"
   },
   "next": "Regel toegang via het cliëntdossier of een afgeschermde map van het wijkteam, alleen voor de cliënten die de invalkracht bezoekt. Zet het label Vertrouwelijk op overdrachten, ook als Purview niets meldt."
  },
  {
   "id": "gov-wmo-zorgaanbieder",
   "sector": "overheid",
   "channel": "mail",
   "title": "Wmo-gegevens mailen naar een zorgaanbieder",
   "person": {
    "name": "Mirjam",
    "role": "Wmo-consulent"
   },
   "teaser": "Mirjam mailt een zorgaanbieder over een nieuwe cliënt. Wat gebeurt er?",
   "story": "Mirjam is Wmo-consulent bij Gemeente Westerkade. Ze heeft huishoudelijke hulp voor een inwoner goedgekeurd. Ze mailt de gegevens van de cliënt met het BSN naar de gecontracteerde zorgaanbieder, zodat de hulp kan starten.",
   "outcome": "tip",
   "result": "Boven de mail staat een Policy tip over een BSN. Mirjam kan verzenden als ze een zakelijke reden opgeeft.",
   "why": "De mail bevat een BSN en gaat naar een adres buiten de gemeente. Outlook toont Mirjam eerst een Policy tip. Deze aanbieder heeft een contract met de gemeente, dus ze gaat door en vult een reden in.",
   "features": [
    {
     "key": "dlp",
     "name": "Data Loss Prevention (DLP)",
     "text": "Herkent het BSN in de mail en toont een Policy tip voordat Mirjam verstuurt."
    },
    {
     "key": "override",
     "name": "Block with override",
     "text": "Mirjam mag doorgaan met een zakelijke reden. Die reden wordt vastgelegd."
    }
   ],
   "value": "Medewerkers denken even na voordat ze een BSN buiten de gemeente sturen. Achteraf ziet de gemeente wie doorging en waarom.",
   "note": "DLP controleert niet of het adres echt van de juiste aanbieder is. Dat moet Mirjam zelf nakijken.",
   "lesson": "dlp",
   "before": {
    "t": "mail",
    "to": "intake@zorgaanbieder.example",
    "subj": "Nieuwe cliënt huishoudelijke hulp",
    "body": "Hierbij de gegevens van mevrouw Jansen, BSN 111222333. De hulp start per 1 december.",
    "label": "intern"
   },
   "after": {
    "t": "mail",
    "to": "intake@zorgaanbieder.example",
    "subj": "Nieuwe cliënt huishoudelijke hulp",
    "body": "Hierbij de gegevens van mevrouw Jansen, BSN 111222333. De hulp start per 1 december.",
    "label": "intern",
    "bars": [
     [
      "override",
      "Deze mail bevat een BSN",
      "Je stuurt een burgerservicenummer naar iemand buiten Gemeente Westerkade. Verzenden mag alleen met een zakelijke reden."
     ]
    ]
   },
   "next": "Controleer het adres van de aanbieder in het contractenoverzicht en stuur alleen wat nodig is om de hulp te starten. Gebeurt dit vaak, vraag dan of het via het beveiligde berichtenverkeer met aanbieders kan."
  },
  {
   "id": "gov-teams-leverancier",
   "sector": "overheid",
   "channel": "teams",
   "title": "Een BSN in de Teams-chat met de leverancier",
   "person": {
    "name": "Mehmet",
    "role": "Medewerker Burgerzaken"
   },
   "teaser": "Mehmet vraagt de softwareleverancier in Teams om hulp bij een storing. Komt zijn bericht aan?",
   "story": "Mehmet werkt bij Burgerzaken. Een paspoortaanvraag blijft hangen in het systeem. In een Teams-chat met de supportmedewerker van de leverancier, iemand buiten de gemeente, zet hij het BSN van de aanvrager, zodat die kan meekijken.",
   "outcome": "block",
   "result": "Mehmet ziet 'Dit bericht is geblokkeerd' met uitleg. De leverancier ziet de inhoud niet.",
   "why": "Het bericht bevat een BSN en gaat naar iemand buiten de gemeente. De DLP-regel voor Teams houdt het tegen. De leverancier ziet alleen dat er een bericht is geblokkeerd.",
   "features": [
    {
     "key": "teams",
     "name": "Teams chat and channel messages",
     "text": "DLP controleert berichten in Teams-chats en -kanalen en blokkeert berichten met een BSN."
    }
   ],
   "value": "Een BSN komt niet ongemerkt in een chat buiten de gemeente terecht. Dat past bij de privacyafspraken die de gemeente met leveranciers maakt.",
   "note": "Een BSN in een schermafbeelding wordt niet altijd herkend. Let daar dus zelf ook op.",
   "lesson": "dlp",
   "before": {
    "t": "chat",
    "title": "Support Burgerzaken-app (extern)",
    "me": "Mehmet",
    "text": "De aanvraag van BSN 111222333 blijft hangen op 'in behandeling'. Kun je meekijken?",
    "state": "draft"
   },
   "after": {
    "t": "chat",
    "title": "Support Burgerzaken-app (extern)",
    "me": "Mehmet",
    "text": "De aanvraag van BSN 111222333 blijft hangen op 'in behandeling'. Kun je meekijken?",
    "state": "blocked"
   },
   "next": "Stel de vraag opnieuw met het zaaknummer in plaats van het BSN. Heeft de leverancier meer nodig, laat hem dan meekijken via de beveiligde supportomgeving uit het contract."
  },
  {
   "id": "gov-copilot-integriteit",
   "sector": "overheid",
   "channel": "copilot",
   "title": "Copilot vragen om een integriteitsrapport",
   "person": {
    "name": "Fleur",
    "role": "HR-adviseur"
   },
   "teaser": "Fleur vraagt Copilot om een rapport samen te vatten dat ze zelf mag openen. Wat krijgt ze terug?",
   "story": "Fleur is HR-adviseur bij Gemeente Westerkade. Ze bereidt een overleg voor over een integriteitsonderzoek. Ze vraagt Microsoft 365 Copilot om het onderzoeksrapport samen te vatten. Het rapport heeft het label Strikt vertrouwelijk.",
   "outcome": "block",
   "result": "Copilot noemt het rapport als bron, maar gebruikt de inhoud niet in het antwoord.",
   "why": "De gemeente heeft ingesteld dat Copilot de inhoud van bestanden met het label Strikt vertrouwelijk niet gebruikt. Fleur kan het rapport wel openen en zelf lezen. Alleen Copilot laat de inhoud buiten het antwoord.",
   "features": [
    {
     "key": "copilot",
     "name": "DLP for Microsoft 365 Copilot",
     "text": "Zorgt dat Copilot de inhoud van bestanden en e-mails met een bepaald label niet gebruikt in antwoorden."
    },
    {
     "key": "label",
     "name": "Sensitivity label",
     "text": "Het label Strikt vertrouwelijk laat zien om welk soort bestand het gaat."
    }
   ],
   "value": "De gevoeligste stukken komen niet in samenvattingen terecht die je makkelijk kopieert of doorstuurt. Wie toegang heeft, kan het bestand gewoon zelf lezen.",
   "note": "Dit werkt alleen als het rapport het juiste label heeft. De inhoud van een bestand zonder label gebruikt Copilot wel.",
   "lesson": "copilot",
   "before": {
    "t": "copilot",
    "prompt": "Vat het rapport over het integriteitsonderzoek samen in vijf punten.",
    "kind": "wait",
    "file": "Rapport integriteitsonderzoek.docx",
    "label": "strikt"
   },
   "after": {
    "t": "copilot",
    "prompt": "Vat het rapport over het integriteitsonderzoek samen in vijf punten.",
    "kind": "excluded",
    "file": "Rapport integriteitsonderzoek.docx",
    "label": "strikt"
   },
   "next": "Lees het rapport zelf en schrijf je eigen samenvatting voor het overleg. Deel die alleen met de mensen die bij het onderzoek betrokken zijn."
  },
  {
   "id": "gov-print-jeugddossier",
   "sector": "overheid",
   "channel": "device",
   "title": "Een gespreksverslag printen voor een huisbezoek",
   "person": {
    "name": "Joost",
    "role": "Jeugdconsulent"
   },
   "teaser": "Joost print een verslag voor een gesprek bij een gezin thuis. Merkt hij iets van Purview?",
   "story": "Joost is jeugdconsulent in het sociaal domein. Morgen gaat hij op huisbezoek, en daar heeft hij geen goede verbinding. Daarom print hij op zijn laptop van de gemeente het gespreksverslag van het gezin.",
   "outcome": "ok",
   "result": "De printopdracht gaat gewoon door. Joost ziet geen melding.",
   "why": "De gemeente laat Endpoint DLP het afdrukken van gevoelige bestanden alleen vastleggen. Joost kan dus gewoon doorwerken. Een beheerder ziet later in Activity explorer welk bestand is afgedrukt en door wie.",
   "features": [
    {
     "key": "endpoint",
     "name": "Endpoint DLP",
     "text": "Houdt bij wat er gebeurt met gevoelige bestanden op aangesloten Windows- en macOS-apparaten."
    },
    {
     "key": "audit",
     "name": "Audit only",
     "text": "Legt de actie vast zonder de medewerker te storen. Je ziet de actie terug in Activity explorer."
    }
   ],
   "value": "De gemeente ziet hoe vaak gevoelige stukken op papier komen, zonder het werk te hinderen. Met die cijfers kan ze later bepalen of strengere regels nodig zijn.",
   "note": "Vastleggen beschermt het papier niet. Joost blijft zelf verantwoordelijk voor de uitdraai.",
   "lesson": "monitor",
   "before": {
    "t": "doc",
    "file": "Gespreksverslag gezin Bakker.docx",
    "label": "vertrouwelijk",
    "text": "Verslag van het keukentafelgesprek over jeugdhulp voor gezin Bakker. BSN kind: 111222333."
   },
   "after": {
    "t": "toast",
    "level": "audit",
    "act": "Afdrukken",
    "file": "Gespreksverslag gezin Bakker.docx",
    "note": "Je ziet geen melding. De printopdracht gaat naar de printer."
   },
   "next": "Neem alleen de pagina's mee die je voor het gesprek nodig hebt. Houd de uitdraai bij je en gooi hem na afloop in de container voor vertrouwelijk papier."
  },
  {
   "id": "gov-bezwaar-label",
   "sector": "overheid",
   "channel": "doc",
   "title": "Een advies over een bezwaar schrijven in Word",
   "person": {
    "name": "Karin",
    "role": "Juridisch medewerker bezwaar"
   },
   "teaser": "Karin zet persoonsgegevens in een document met het label Intern. Doet Word daar iets mee?",
   "story": "Karin behandelt bezwaren tegen besluiten over bijstand. Ze schrijft in Word een advies over het bezwaar van een inwoner. Ze neemt zijn BSN en IBAN over uit het dossier, terwijl het document nog het label Intern heeft.",
   "outcome": "tip",
   "result": "Word stelt voor om het label Vertrouwelijk te gebruiken. Karin kiest zelf of ze dat doet.",
   "why": "Word herkent het BSN en het IBAN in de tekst. De gemeente heeft ingesteld dat Word dan het label Vertrouwelijk voorstelt. Karin neemt het voorstel over, maar ze had het ook mogen negeren.",
   "features": [
    {
     "key": "recommend",
     "name": "Auto-labeling (recommended label)",
     "text": "Word stelt een passend label voor als het gevoelige informatie herkent. De medewerker beslist."
    },
    {
     "key": "label",
     "name": "Sensitivity label",
     "text": "Het label Vertrouwelijk laat zien hoe je met het document omgaat en kan andere regels in gang zetten."
    }
   ],
   "value": "Medewerkers krijgen hulp op het moment dat ze een label nodig hebben. Zo krijgen meer documenten het juiste label.",
   "note": "Een voorstel dwingt niets af. Als Karin het negeert, blijft het label Intern staan.",
   "lesson": "autolabel",
   "before": {
    "t": "doc",
    "file": "Advies bezwaar bijstand.docx",
    "label": "intern",
    "text": "Advies over het bezwaar van de heer El Amrani, BSN 111222333. Een eventuele terugbetaling gaat naar IBAN NL91ABNA0417164300."
   },
   "after": {
    "t": "doc",
    "file": "Advies bezwaar bijstand.docx",
    "label": "intern",
    "text": "Advies over het bezwaar van de heer El Amrani, BSN 111222333. Een eventuele terugbetaling gaat naar IBAN NL91ABNA0417164300.",
    "bars": [
     [
      "recommend",
      "Aanbevolen label: Vertrouwelijk",
      "Dit document bevat persoonsgegevens zoals een BSN. Je organisatie raadt het label Vertrouwelijk aan."
     ]
    ]
   },
   "next": "Neem het voorgestelde label over. Een advies met een BSN en een IBAN uit het dossier hoort bij Vertrouwelijk, ook als het nog een concept is."
  },
  {
   "id": "gov-teamnotitie-delen",
   "sector": "overheid",
   "channel": "share",
   "title": "Een notitie over medewerkers delen met een adviesbureau",
   "person": {
    "name": "Erik",
    "role": "Teamleider Publiekszaken"
   },
   "teaser": "Erik deelt een notitie over zijn team met een extern adviesbureau. Grijpt Purview in?",
   "story": "Erik is teamleider Publiekszaken. Hij werkt met een extern adviesbureau aan een nieuwe indeling van zijn team. Vanuit OneDrive deelt hij een notitie met namen van medewerkers en opmerkingen over hun ziekteverzuim.",
   "outcome": "ok",
   "result": "Het delen lukt zonder melding. Het adviesbureau kan de notitie openen.",
   "why": "In de notitie staan geen BSN's, IBAN's of andere vaste patronen die Purview herkent. Opmerkingen over ziekte in gewone Nederlandse tekst herkent Purview niet betrouwbaar. Op het label Intern zit geen deelregel, dus Erik moet zelf beoordelen of dit gedeeld mag worden.",
   "features": [
    {
     "key": "dlp",
     "name": "Data Loss Prevention (DLP)",
     "text": "DLP grijpt alleen in als het informatie herkent, of als er een regel op het label staat."
    }
   ],
   "value": "Dit scenario laat zien waar de techniek ophoudt. De gemeente ziet zo waar bewustwording en duidelijke afspraken nodig blijven.",
   "note": "Met het label Vertrouwelijk had een DLP-regel op dat label het delen buiten de gemeente kunnen tegenhouden.",
   "lesson": "data",
   "before": {
    "t": "share",
    "file": "Notitie teamindeling Publiekszaken.docx",
    "to": "consultant@adviesbureau.example",
    "label": "intern"
   },
   "after": {
    "t": "share",
    "file": "Notitie teamindeling Publiekszaken.docx",
    "to": "consultant@adviesbureau.example",
    "label": "intern"
   },
   "next": "Haal namen en verzuimgegevens uit de notitie voordat het adviesbureau meekijkt. Voor een nieuwe teamindeling zijn functies en aantallen meestal genoeg. Zet het label Vertrouwelijk op de versie met namen."
  },
  {
   "id": "fin-iban-accountant",
   "sector": "financieel",
   "channel": "mail",
   "title": "Een lijst met IBAN's mailen naar de accountant",
   "person": {
    "name": "Hanna",
    "role": "Medewerker Betalingsverkeer"
   },
   "teaser": "Hanna stuurt de externe accountant een Excel-bestand voor de jaarcontrole. Kan ze de mail zomaar versturen?",
   "story": "Hanna werkt bij Betalingsverkeer van Kustbank. De externe accountant vraagt voor de jaarcontrole om een overzicht van teruggeboekte betalingen. Ze mailt een Excel-bestand met honderd regels, elk met de naam en het IBAN van een klant.",
   "outcome": "tip",
   "result": "Boven de mail staat een Policy tip. Hanna kan verzenden als ze een zakelijke reden opgeeft.",
   "why": "De bijlage bevat veel IBAN's en gaat naar iemand buiten Kustbank. Outlook toont Hanna een Policy tip. De accountant heeft de gegevens nodig voor de controle, dus ze gaat door en vult een reden in.",
   "features": [
    {
     "key": "dlp",
     "name": "Data Loss Prevention (DLP)",
     "text": "Herkent de IBAN's in de bijlage en toont een Policy tip voordat Hanna verstuurt."
    },
    {
     "key": "override",
     "name": "Block with override",
     "text": "Hanna mag doorgaan met een zakelijke reden. Die reden wordt vastgelegd."
    }
   ],
   "value": "Compliance ziet welke klantgegevens naar buiten gaan en met welke reden. Dat helpt bij vragen van een toezichthouder.",
   "note": "DLP beoordeelt niet of de accountant alle honderd regels nodig heeft. Dat bepaalt Hanna zelf.",
   "lesson": "dlp",
   "before": {
    "t": "mail",
    "to": "controle@accountant.example",
    "subj": "Overzicht terugboekingen 2026",
    "body": "Hierbij het overzicht dat je voor de jaarcontrole vroeg.",
    "attach": "Terugboekingen 2026.xlsx",
    "label": "vertrouwelijk"
   },
   "after": {
    "t": "mail",
    "to": "controle@accountant.example",
    "subj": "Overzicht terugboekingen 2026",
    "body": "Hierbij het overzicht dat je voor de jaarcontrole vroeg.",
    "attach": "Terugboekingen 2026.xlsx",
    "label": "vertrouwelijk",
    "bars": [
     [
      "override",
      "Deze mail bevat klantgegevens",
      "De bijlage bevat veel IBAN's en gaat naar buiten Kustbank. Verzend alleen als dit nodig is en geef een zakelijke reden op."
     ]
    ]
   },
   "next": "Vraag de accountant welke kolommen echt nodig zijn. Lever bij voorkeur aan via de beveiligde uitwisselomgeving die voor de jaarcontrole is afgesproken."
  },
  {
   "id": "fin-krediet-delen",
   "sector": "financieel",
   "channel": "share",
   "title": "Een kredietdossier delen met een taxateur",
   "person": {
    "name": "Thijs",
    "role": "Kredietanalist"
   },
   "teaser": "Thijs wil een kredietdossier vanuit OneDrive delen met een externe taxateur. Lukt dat?",
   "story": "Thijs beoordeelt een zakelijke kredietaanvraag van een bakkerij. Een externe taxateur moet de waarde van het pand bepalen. Thijs wil het hele kredietdossier delen. Dat dossier heeft het label Strikt vertrouwelijk, met versleuteling.",
   "outcome": "block",
   "result": "Delen met de taxateur lukt niet. Thijs ziet een Policy tip bij het bestand.",
   "why": "Kustbank heeft een DLP-regel ingesteld: bestanden met het label Strikt vertrouwelijk deel je niet met mensen buiten de bank. Het dossier bevat jaarcijfers, schulden en persoonsgegevens van de eigenaar. De taxateur heeft alleen de gegevens van het pand nodig, dus Thijs maakt daar een apart document voor.",
   "features": [
    {
     "key": "dlp",
     "name": "Data Loss Prevention (DLP)",
     "text": "Blokkeert delen met mensen buiten Kustbank als een bestand het label Strikt vertrouwelijk heeft."
    },
    {
     "key": "encrypt",
     "name": "Sensitivity label (encryption)",
     "text": "Alleen bevoegden kunnen het dossier openen, ook nadat het is doorgestuurd of gedownload."
    }
   ],
   "value": "Volledige klantdossiers blijven binnen de bank, ook als iemand haast heeft. Externe partijen krijgen alleen wat ze nodig hebben.",
   "note": "De regel kijkt naar het label. Een kopie zonder label valt er niet onder. Haal dus nooit het label weg om toch te kunnen delen.",
   "lesson": "dlp",
   "before": {
    "t": "share",
    "file": "Kredietdossier Bakkerij Zeewind.docx",
    "to": "taxatie@taxateur.example",
    "label": "strikt"
   },
   "after": {
    "t": "share",
    "file": "Kredietdossier Bakkerij Zeewind.docx",
    "to": "taxatie@taxateur.example",
    "label": "strikt",
    "bars": [
     [
      "block",
      "Delen buiten Kustbank is niet toegestaan",
      "Dit bestand heeft het label Strikt vertrouwelijk. Je kunt het niet delen met mensen buiten de organisatie."
     ]
    ]
   },
   "next": "Maak een apart document met alleen de gegevens over het pand en deel dat met de taxateur. Het volledige dossier blijft binnen de bank."
  },
  {
   "id": "fin-kaartdata-upload",
   "sector": "financieel",
   "channel": "device",
   "title": "Een export met kaartgegevens uploaden naar een website",
   "person": {
    "name": "Iris",
    "role": "Fraudeanalist"
   },
   "teaser": "Iris wil een Excel-bestand snel omzetten met een gratis website. Wat gebeurt er?",
   "story": "Iris onderzoekt creditcardfraude bij Kustbank. Ze heeft een export van verdachte transacties met de creditcardnummers van klanten. In Microsoft Edge uploadt ze het bestand naar een gratis website om er een pdf van te maken.",
   "outcome": "block",
   "result": "Windows meldt dat het uploaden is geblokkeerd.",
   "why": "Endpoint DLP herkent de creditcardnummers in het bestand. Kustbank staat uploaden van zulke bestanden alleen toe naar goedgekeurde websites. Deze gratis website staat niet op die lijst, dus het bestand blijft op de laptop.",
   "features": [
    {
     "key": "endpoint",
     "name": "Endpoint DLP",
     "text": "Bewaakt aangesloten Windows- en macOS-apparaten en kan uploaden naar niet-toegestane websites blokkeren."
    }
   ],
   "value": "Kaartgegevens van klanten komen niet bij een onbekende online dienst terecht. Dat verkleint de kans op een datalek met kaartgegevens.",
   "note": "Dit werkt alleen op aangesloten apparaten: in Microsoft Edge meteen, in Chrome en Firefox alleen met de Purview-extensie.",
   "lesson": "endpoint",
   "before": {
    "t": "doc",
    "file": "Export verdachte transacties.xlsx",
    "label": "vertrouwelijk",
    "text": "Overzicht van 240 verdachte transacties, per klant met creditcardnummer, naam en datum."
   },
   "after": {
    "t": "toast",
    "level": "block",
    "act": "Uploaden naar website",
    "file": "Export verdachte transacties.xlsx"
   },
   "next": "Maak de pdf in Excel zelf met Opslaan als pdf; dan verlaat het bestand je laptop niet. Heb je een andere online tool nodig, vraag de servicedesk dan welke diensten zijn goedgekeurd."
  },
  {
   "id": "fin-overname-teams",
   "sector": "financieel",
   "channel": "teams",
   "title": "Vertrouwelijk nieuws over een klant in een Teams-chat",
   "person": {
    "name": "Bas",
    "role": "Adviseur zakelijke markt"
   },
   "teaser": "Bas deelt in een groepschat nieuws over een grote zakelijke klant. Houdt Purview het bericht tegen?",
   "story": "Bas is adviseur zakelijke markt bij Kustbank. Hij hoort dat een beursgenoteerde klant volgende week een overname bekendmaakt. Hij zet dat in een Teams-groepschat met collega's van andere afdelingen.",
   "outcome": "ok",
   "result": "Het bericht komt gewoon aan. Niemand ziet een melding.",
   "why": "Het bericht bevat geen IBAN, creditcardnummer of BSN. Purview herkent niet dat dit koersgevoelige informatie is. Bas moet zelf weten dat hij dit niet met andere afdelingen mag delen.",
   "features": [
    {
     "key": "teams",
     "name": "Teams chat and channel messages",
     "text": "DLP controleert Teams-berichten op informatie die het herkent, zoals IBAN's en creditcardnummers."
    }
   ],
   "value": "Dit laat zien dat Purview geen afspraken over voorwetenschap vervangt. Training en duidelijke regels blijven nodig.",
   "note": "Een eigen informatietype met vaste woorden kan helpen, maar zulke berichten blijven lastig te herkennen. Test zo'n informatietype eerst in simulatie.",
   "lesson": "data",
   "before": {
    "t": "chat",
    "title": "Zakelijke markt en Treasury",
    "me": "Bas",
    "text": "Onder ons: Havenlogistiek NV maakt volgende week een overname bekend. Misschien handig voor jullie posities.",
    "state": "draft"
   },
   "after": {
    "t": "chat",
    "title": "Zakelijke markt en Treasury",
    "me": "Bas",
    "text": "Onder ons: Havenlogistiek NV maakt volgende week een overname bekend. Misschien handig voor jullie posities.",
    "state": "sent"
   },
   "next": "Deel koersgevoelige informatie alleen met mensen die op de insiderlijst staan, en nooit in een groepschat. Twijfel je of iets koersgevoelig is, vraag het Compliance."
  },
  {
   "id": "fin-copilot-klantdossier",
   "sector": "financieel",
   "channel": "copilot",
   "title": "Copilot een klantdossier laten samenvatten",
   "person": {
    "name": "Yara",
    "role": "Hypotheekadviseur"
   },
   "teaser": "Yara vraagt Copilot om de belangrijkste punten uit een klantdossier. Welke informatie gebruikt Copilot?",
   "story": "Yara is hypotheekadviseur bij Kustbank. Ze bereidt een gesprek voor met een klant die zijn hypotheek wil oversluiten. Ze vraagt Microsoft 365 Copilot om de belangrijkste punten uit het klantdossier. Het dossier heeft het label Vertrouwelijk.",
   "outcome": "ok",
   "result": "Copilot geeft een korte samenvatting van het dossier waar Yara toegang toe heeft.",
   "why": "Copilot werkt met de rechten van Yara. Zij mag het dossier openen, dus Copilot kan het ook gebruiken. Kustbank houdt alleen bestanden met het label Strikt vertrouwelijk buiten Copilot, en dit dossier heeft dat label niet.",
   "features": [
    {
     "key": "copilot",
     "name": "Microsoft 365 Copilot",
     "text": "Gebruikt alleen bestanden en e-mails waar de gebruiker zelf al toegang toe heeft."
    },
    {
     "key": "label",
     "name": "Sensitivity label",
     "text": "Het label bepaalt of een DLP-regel voor Copilot op het dossier van toepassing is."
    }
   ],
   "value": "Adviseurs bereiden gesprekken sneller voor, en Copilot krijgt geen extra toegang. Rechten en labels bepalen wat Copilot mag gebruiken.",
   "note": "Staan dossiers te ruim open, dan vindt Copilot ze ook voor collega's die ze niet nodig hebben. Ruim de rechten dus eerst op.",
   "lesson": "copilot",
   "before": {
    "t": "copilot",
    "prompt": "Wat zijn de belangrijkste punten uit het dossier van de heer Visser voor het oversluitgesprek?",
    "kind": "wait",
    "file": "Klantdossier Visser.docx",
    "label": "vertrouwelijk"
   },
   "after": {
    "t": "copilot",
    "prompt": "Wat zijn de belangrijkste punten uit het dossier van de heer Visser voor het oversluitgesprek?",
    "kind": "ok",
    "file": "Klantdossier Visser.docx",
    "label": "vertrouwelijk",
    "answer": "Hypotheek van 280.000 euro met een rentevaste periode tot maart 2027. Inkomen en maandlasten staan in het dossier. De klant wil lagere maandlasten."
   },
   "next": "Controleer de samenvatting in het dossier zelf voordat je het gesprek ingaat. Vind je dossiers van klanten die niet bij jou horen, meld dan dat de toegang te ruim is."
  },
  {
   "id": "fin-print-kredietdossier",
   "sector": "financieel",
   "channel": "device",
   "title": "Een kredietdossier printen voor een overleg",
   "person": {
    "name": "Ruben",
    "role": "Compliance officer"
   },
   "teaser": "Ruben print een gevoelig dossier voor een overleg met de interne audit. Lukt dat zomaar?",
   "story": "Ruben is compliance officer bij Kustbank. Hij bereidt een overleg met de interne auditafdeling voor. Hij wil het kredietdossier van een zakelijke klant printen. Het dossier heeft het label Strikt vertrouwelijk.",
   "outcome": "tip",
   "result": "Windows meldt dat afdrukken is geblokkeerd. Ruben kan doorgaan als hij een zakelijke reden opgeeft.",
   "why": "Kustbank wil dossiers met het label Strikt vertrouwelijk zo min mogelijk op papier. Endpoint DLP vraagt Ruben daarom om een reden. Hij heeft de uitdraai nodig voor het overleg, dus hij vult een reden in en drukt af.",
   "features": [
    {
     "key": "endpoint",
     "name": "Endpoint DLP",
     "text": "Kan afdrukken van gevoelige bestanden op aangesloten apparaten vastleggen, tegenhouden of laten doorgaan met een reden."
    },
    {
     "key": "override",
     "name": "Block with override",
     "text": "Ruben mag doorgaan met een zakelijke reden. Die reden wordt vastgelegd."
    }
   ],
   "value": "Er komen minder gevoelige dossiers op papier, en noodzakelijk werk gaat door. Compliance ziet achteraf wie printte en met welke reden.",
   "note": "Na het printen beschermt Purview het papier niet meer. Ruben moet de uitdraai zelf veilig bewaren en vernietigen.",
   "lesson": "endpoint",
   "before": {
    "t": "doc",
    "file": "Kredietdossier Duinzicht Bouw.docx",
    "label": "strikt",
    "text": "Kredietbeoordeling met jaarcijfers, zekerheden en persoonsgegevens van de directeur-eigenaar."
   },
   "after": {
    "t": "toast",
    "level": "warn",
    "act": "Afdrukken",
    "file": "Kredietdossier Duinzicht Bouw.docx"
   },
   "next": "Kijk of het overleg ook met het dossier op het scherm kan. Print je toch, haal de uitdraai direct op en lever hem na afloop in voor vernietiging."
  }
 ]
};
