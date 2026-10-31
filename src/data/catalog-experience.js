/* Fictieve rolreizen. Verhoog role.version bij gewijzigde vragen of antwoordbetekenissen. */
Object.assign(CATALOG.learn, {
  "dlpSpoExternal": {
    "title": "Create a DLP policy to protect documents shared with external users",
    "url": "https://learn.microsoft.com/purview/dlp-create-policy-spo-odb-external"
  }
});

CATALOG.experience = {
  "org": "Noordhaven",
  "labels": {
    "openbaar": {
      "name": "Openbaar",
      "color": "#107C10"
    },
    "intern": {
      "name": "Intern",
      "color": "#0F6CBD"
    },
    "vertrouwelijk": {
      "name": "Vertrouwelijk",
      "color": "#CA5010"
    },
    "strikt": {
      "name": "Strikt vertrouwelijk",
      "color": "#C50F1F"
    }
  },
  "appNames": {
    "word": "Word",
    "excel": "Excel",
    "outlook": "Outlook",
    "sharepoint": "SharePoint",
    "onedrive": "OneDrive",
    "teams": "Teams",
    "copilot": "Microsoft 365 Copilot",
    "windows": "Windows",
    "purview": "Microsoft Purview"
  },
  "roles": [
    {
      "id": "hr",
      "title": "HR-medewerker",
      "person": {
        "name": "Sanne",
        "role": "HR-medewerker",
        "portrait": "personHr"
      },
      "intro": "Je werkt bij HR aan werving, verzuim en personeelszaken. Je ziet veel persoonlijke informatie, maar je functie geeft je geen extra toegang tot bestanden. Noordhaven en alle personen zijn verzonnen.",
      "moments": [
        {
          "id": "hr-sollicitatie",
          "time": "08:30",
          "app": "word",
          "title": "Notities na een sollicitatiegesprek",
          "story": "Je komt net uit een sollicitatiegesprek en typt je indrukken van de kandidaat uit. Bij Noordhaven krijgen sollicitatienotities het label 'Vertrouwelijk'. Opslaan in je eigen OneDrive zet dat label er niet vanzelf op.",
          "question": "Hoe bewaar je de notities?",
          "topic": "labels",
          "choices": [
            {
              "title": "Kies 'Vertrouwelijk' en sla op in de vacaturemap",
              "sub": "Daar kunnen alleen HR en de selectiecommissie bij",
              "tone": "ok",
              "result": {
                "title": "Label staat erop",
                "text": "Iedereen die het document opent, ziet dat het vertrouwelijk is. Wie erbij kan, bepaalt de vacaturemap."
              },
              "effect": "label",
              "key": "A"
            },
            {
              "title": "Sla op in je eigen OneDrive, zonder label",
              "sub": "Je werkt het vanmiddag nog uit",
              "tone": "warn",
              "result": {
                "title": "Label ontbreekt nog",
                "text": "Opslaan lukt, maar niemand ziet dat dit gevoelig is. Zet het label erop en verplaats de notities naar de vacaturemap voordat je ze met de commissie deelt."
              },
              "effect": "allow",
              "key": "B"
            }
          ],
          "without": "Zonder labelafspraak blijven de notities even gevoelig, alleen ziet niemand dat in één oogopslag.",
          "who": "hr"
        },
        {
          "id": "hr-loonbestand",
          "time": "09:45",
          "app": "excel",
          "title": "Een loonbestand met BSN's",
          "story": "Je opent het loonbestand van deze maand, met een kolom burgerservicenummers (BSN's). Noordhaven laat Office een label voorstellen als er BSN's in een bestand staan. Bovenin Excel verschijnt: aanbevolen label 'Vertrouwelijk'.",
          "question": "Wat doe je met het voorstel?",
          "topic": "autolabel",
          "choices": [
            {
              "title": "Neem het voorgestelde label over",
              "sub": "Het past bij wat er in het bestand staat",
              "tone": "ok",
              "result": {
                "title": "Label staat erop",
                "text": "Het bestand heeft nu het afgesproken label. Laat bij het delen de BSN-kolom weg als de ontvanger die niet nodig heeft."
              },
              "effect": "recommend",
              "key": "A"
            },
            {
              "title": "Klik het voorstel weg",
              "sub": "Je wilt eerst de berekening afmaken",
              "tone": "warn",
              "result": {
                "title": "Nog zonder label",
                "text": "Je kunt doorwerken; het voorstel dwingt niets af. Zet het label erop voordat het bestand naar iemand anders gaat."
              },
              "effect": "allow",
              "key": "B"
            }
          ],
          "without": "Office stelt dan niets voor. Je kiest het label zelf, zoals afgesproken.",
          "who": "hr"
        },
        {
          "id": "hr-verzuim",
          "time": "11:00",
          "app": "outlook",
          "title": "Een vraag over de bezetting",
          "story": "Een teamleider mailt: wie kan er morgen werken? Jouw verzuimoverzicht beantwoordt die vraag, maar er staat ook in waarom collega's ziek zijn. Een zin als 'thuis met rugklachten' herkent Purview niet als gevoelig.",
          "question": "Wat stuur je terug?",
          "topic": "data",
          "choices": [
            {
              "title": "Stuur het hele overzicht door",
              "sub": "Scheelt overtypen, en ze moet vandaag nog plannen",
              "tone": "warn",
              "result": {
                "title": "Meer gedeeld dan nodig",
                "text": "De mail gaat zonder melding weg. Toch weet de teamleider nu waarom collega's ziek zijn, en dat hoeft ze niet te weten. Stuur alleen wie er morgen wel en niet is."
              },
              "effect": "allow",
              "key": "A"
            },
            {
              "title": "Stuur alleen wie er morgen is",
              "sub": "Laat de reden van verzuim weg",
              "tone": "ok",
              "result": {
                "title": "Alleen de planning gedeeld",
                "text": "De teamleider kan plannen. De reden van verzuim blijft in het verzuimsysteem, waar alleen de mensen bij kunnen die het nodig hebben."
              },
              "effect": "allow",
              "key": "B"
            }
          ],
          "without": "Ook met een regel komt hier geen melding: Purview herkent 'rugklachten' niet. Wat in de mail staat, bepaal jij.",
          "who": "hr"
        },
        {
          "id": "hr-recruiter",
          "time": "13:30",
          "app": "teams",
          "title": "Een recruiter in de chat",
          "story": "Een externe recruiter vraagt in een Teams-chat om het profiel van een kandidaat. Het volledige sollicitatiedossier staat in SharePoint en heeft het label 'Vertrouwelijk'. Bij Noordhaven kunnen mensen van buiten zo'n bestand niet openen.",
          "question": "Wat doe je?",
          "topic": "dlp",
          "choices": [
            {
              "title": "Maak een kort profiel zonder naam en contactgegevens",
              "sub": "Laat de vacaturehouder het eerst lezen",
              "tone": "ok",
              "result": {
                "title": "Gedeeld wat nodig is",
                "text": "De recruiter krijgt ervaring en beschikbaarheid, zonder naam, adres of gespreksnotities. Na akkoord stuur je het profiel als bijlage in de chat of per mail."
              },
              "effect": "review",
              "key": "A"
            },
            {
              "title": "Plak de link naar het hele dossier",
              "sub": "Jullie chatten toch al in Teams",
              "tone": "block",
              "result": {
                "title": "De recruiter kan het bestand niet openen",
                "text": "De link komt aan, maar het dossier blijft dicht. De bescherming zit op het bestand. Zet het dossier ook niet op een andere plek om dat te omzeilen."
              },
              "effect": "block",
              "key": "B"
            }
          ],
          "without": "Dan bepalen alleen de rechten in SharePoint wie erbij kan. Staan die te ruim, dan opent de recruiter het hele dossier.",
          "who": "hr"
        },
        {
          "id": "hr-copilot",
          "time": "15:00",
          "app": "copilot",
          "title": "Copilot vat gesprekken samen",
          "story": "Na drie gesprekken vraag je Copilot de verslagen samen te vatten voor de selectiecommissie. Copilot gebruikt alleen bestanden die jij zelf mag openen. In dit voorbeeld is er geen regel die Copilot tegenhoudt.",
          "question": "Wat doe je met de samenvatting?",
          "topic": "copilot",
          "choices": [
            {
              "title": "Stuur hem meteen naar het hele team",
              "sub": "Dan is iedereen voor het overleg bijgepraat",
              "tone": "warn",
              "result": {
                "title": "Te breed gedeeld",
                "text": "Ook een samenvatting bevat oordelen over kandidaten. Lees hem eerst zelf na en stuur hem alleen naar de selectiecommissie."
              },
              "effect": "allow",
              "key": "A"
            },
            {
              "title": "Lees hem na en vergelijk met de verslagen",
              "sub": "De commissie kiest, niet Copilot",
              "tone": "ok",
              "result": {
                "title": "Copilot als schrijfhulp",
                "text": "Je verbetert wat niet klopt, haalt overbodige persoonlijke details weg en deelt de samenvatting alleen met de commissie."
              },
              "effect": "review",
              "key": "B"
            }
          ],
          "without": "Hier verandert niets: er was al geen regel. Wie de samenvatting krijgt, bepaal jij.",
          "who": "hr"
        }
      ],
      "version": 2
    },
    {
      "id": "finance",
      "title": "Financieel medewerker",
      "person": {
        "name": "Daan",
        "role": "Financieel medewerker",
        "portrait": "personFinance"
      },
      "intro": "Je verwerkt betalingen en helpt bij de jaarcontrole. Soms mag je na een melding doorgaan, maar daarmee is een betaling nog niet goedgekeurd. Noordhaven en alle personen zijn verzonnen.",
      "moments": [
        {
          "id": "finance-betaalbestand",
          "time": "08:15",
          "app": "excel",
          "title": "Een betaalbestand klaarzetten",
          "story": "Je zet het betaalbestand voor de salarissen klaar, met namen en rekeningnummers. Vanmiddag moet je het nog een keer nalopen. De afspraak is: label 'Vertrouwelijk' en opslaan in de afgeschermde betaalmap.",
          "question": "Hoe zet je het bestand klaar?",
          "topic": "labels",
          "choices": [
            {
              "title": "Zet het label erop en sla op in de betaalmap",
              "sub": "Alleen de betaalcontrole kan erbij",
              "tone": "ok",
              "result": {
                "title": "Herkenbaar en afgeschermd",
                "text": "Het bestand heeft het afgesproken label en staat in de map waar alleen de betaalcontrole bij kan."
              },
              "effect": "label",
              "key": "A"
            },
            {
              "title": "Sla het zonder label op in je eigen OneDrive",
              "sub": "Daar kun je er vanmiddag snel bij",
              "tone": "warn",
              "result": {
                "title": "Label en plek ontbreken",
                "text": "De rekeningnummers staan in een map die niet voor betalingen bedoeld is, en niemand ziet dat het bestand gevoelig is. Kies 'Vertrouwelijk' en zet het in de betaalmap; daar kun je er vanmiddag ook bij."
              },
              "effect": "allow",
              "key": "B"
            }
          ],
          "without": "De betaalmap kan nog steeds afgeschermd zijn. Maar wie het bestand later ergens anders tegenkomt, ziet niet hoe gevoelig het is.",
          "who": "finance"
        },
        {
          "id": "finance-bankwijziging",
          "time": "09:30",
          "app": "outlook",
          "title": "Een leverancier heeft een nieuw rekeningnummer",
          "story": "Een vaste leverancier mailt dat hij van bank is gewisseld en vraagt het nieuwe rekeningnummer door te voeren. Ter controle wil hij het overzicht van openstaande facturen terug, met de bankgegevens die Noordhaven nu van hem heeft. Mail je bankgegevens naar buiten, dan vraagt Outlook om een reden. Of het verzoek echt van de leverancier komt, ziet Purview niet.",
          "question": "Wat doe je eerst?",
          "topic": "dlp",
          "choices": [
            {
              "title": "Vul een reden in en stuur de gegevens",
              "sub": "De leverancier wacht op een betaling",
              "tone": "warn",
              "result": {
                "title": "Verstuurd, maar niet nagegaan",
                "text": "De regel laat je doorgaan en legt vast dat je dat deed. Of het verzoek echt is, weet je nog steeds niet. Bel de leverancier eerst."
              },
              "effect": "override",
              "key": "A"
            },
            {
              "title": "Bel de leverancier op het nummer uit je administratie",
              "sub": "Niet het nummer uit deze mail",
              "tone": "ok",
              "result": {
                "title": "Eerst het verzoek nagaan",
                "text": "Je volgt de vaste procedure voor bankwijzigingen. Pas als de leverancier het bevestigt, pas je iets aan. De melding van Outlook vervangt dat telefoontje niet."
              },
              "effect": "review",
              "key": "B"
            }
          ],
          "without": "De mail gaat nu zonder melding weg. Het telefoontje naar de leverancier blijft net zo nodig.",
          "who": "finance"
        },
        {
          "id": "finance-accountant",
          "time": "11:15",
          "app": "sharepoint",
          "title": "Stukken voor de accountant",
          "story": "De accountant vraagt de facturen boven € 10.000 van het derde kwartaal. Hij heeft al toegang tot een aparte controlemap in SharePoint. In jullie eigen financiële map staat veel meer dan hij nodig heeft.",
          "question": "Hoe lever je de stukken aan?",
          "topic": "data",
          "choices": [
            {
              "title": "Zet alleen die facturen in de controlemap",
              "sub": "Kijk na of zijn account er nog bij kan",
              "tone": "ok",
              "result": {
                "title": "Gericht gedeeld",
                "text": "De accountant krijgt precies wat hij vroeg, via de toegang die al geregeld was."
              },
              "effect": "allow",
              "key": "A"
            },
            {
              "title": "Maak een link naar de hele map die iedereen kan openen",
              "sub": "Dan zoekt hij het zelf uit",
              "tone": "block",
              "result": {
                "title": "Zo'n link kan hier niet",
                "text": "Noordhaven heeft links uitgezet waarmee iemand zonder aan te melden een bestand opent, dus SharePoint maakt deze link niet aan. Dat is een deelinstelling, geen controle op de inhoud. Gebruik de controlemap."
              },
              "effect": "block",
              "key": "B"
            }
          ],
          "without": "Ook zonder controle op de inhoud blijft deze deelinstelling gelden. De controlemap is dan nog steeds de beste route.",
          "who": "finance"
        },
        {
          "id": "finance-usb",
          "time": "13:00",
          "app": "windows",
          "title": "Vanavond thuis verder",
          "story": "Je wilt vanavond thuis verder aan de kasprognose, die het label 'Vertrouwelijk' heeft. Je werklaptop laat je liever op kantoor, dus je denkt aan een USB-stick.",
          "question": "Hoe neem je je werk mee?",
          "topic": "endpoint",
          "choices": [
            {
              "title": "Kopieer het naar een USB-stick",
              "sub": "Alleen voor vanavond",
              "tone": "block",
              "result": {
                "title": "Kopiëren lukt niet",
                "text": "Op werklaptops van Noordhaven kun je gelabelde bestanden niet naar een USB-stick kopiëren; Windows meldt dat. Neem je werklaptop mee, dan blijft het bestand op een apparaat van Noordhaven."
              },
              "effect": "block",
              "key": "A"
            },
            {
              "title": "Neem je werklaptop mee naar huis",
              "sub": "Het bestand blijft op een beheerd apparaat",
              "tone": "ok",
              "result": {
                "title": "Verder zonder omweg",
                "text": "Je werkt thuis verder op hetzelfde beveiligde apparaat. Lukt dat niet, regel dan met de servicedesk hoe je thuis veilig kunt inloggen."
              },
              "effect": "allow",
              "key": "B"
            }
          ],
          "without": "Zonder deze regel kan het bestand op een stick belanden, en weet daarna niemand meer waar het is.",
          "who": "finance"
        },
        {
          "id": "finance-teams",
          "time": "15:30",
          "app": "teams",
          "title": "Een spoedbetaling via de chat",
          "story": "Je krijgt een Teams-bericht dat van de directeur lijkt te komen: 'Kun je deze factuur nog vandaag betalen? Geen tijd voor de normale route.' Er staan geen gevoelige gegevens in het bericht, dus Purview doet niets.",
          "question": "Wat doe je?",
          "topic": "roadmap",
          "choices": [
            {
              "title": "Volg de normale betaalcontrole",
              "sub": "Bel de directeur op een nummer dat je al kent",
              "tone": "ok",
              "result": {
                "title": "De procedure gaat voor",
                "text": "Je gaat na of het verzoek echt is en laat de betaling via de vaste controle lopen. Is het echt spoed, dan geldt de spoedprocedure, met een tweede paar ogen."
              },
              "effect": "review",
              "key": "A"
            },
            {
              "title": "Betaal meteen, er kwam geen melding",
              "sub": "Het komt van de directeur",
              "tone": "warn",
              "result": {
                "title": "Geen melding is geen goedkeuring",
                "text": "Purview beoordeelt geen betaalverzoeken. Haast en een bekende naam: zo werkt betaalfraude vaak. Volg ook bij spoed de betaalcontrole."
              },
              "effect": "allow",
              "key": "B"
            }
          ],
          "without": "Dit risico zit niet in gegevens die Purview herkent. Hier beschermt de betaalprocedure je, met of zonder Purview.",
          "who": "finance"
        }
      ],
      "version": 2
    },
    {
      "id": "project",
      "title": "Projectleider",
      "person": {
        "name": "Noor",
        "role": "Projectleider",
        "portrait": "personProject"
      },
      "intro": "Je leidt een productproject met collega's en externe partners. Toegang regel je per persoon; als projectleider kun je niet vanzelf overal bij. Noordhaven en alle personen zijn verzonnen.",
      "moments": [
        {
          "id": "project-ontwerp",
          "time": "08:45",
          "app": "word",
          "title": "Een productidee dat nog niet naar buiten mag",
          "story": "Je schrijft een nieuw productidee uit voor de stuurgroep. Er staan geen persoonsgegevens in, dus geen enkele herkenning slaat aan. Toch mag niemand buiten het project het al zien. Bij Noordhaven krijgen zulke plannen het label 'Vertrouwelijk'.",
          "question": "Welk label kies je?",
          "topic": "labels",
          "choices": [
            {
              "title": "Kies 'Vertrouwelijk'",
              "sub": "Ook bedrijfsplannen kunnen gevoelig zijn",
              "tone": "ok",
              "result": {
                "title": "Het label past bij de inhoud",
                "text": "Iedereen die het document opent, ziet dat het vertrouwelijk is. Bewaar het in de projectsite, waar alleen het projectteam bij kan."
              },
              "effect": "label",
              "key": "A"
            },
            {
              "title": "Kies 'Openbaar', er staan geen persoonsgegevens in",
              "sub": "Het zijn nog maar ideeën",
              "tone": "warn",
              "result": {
                "title": "Verkeerd signaal",
                "text": "Gevoelig gaat over meer dan persoonsgegevens. Kies 'Vertrouwelijk' en kijk wie er toegang heeft voordat je het deelt."
              },
              "effect": "allow",
              "key": "B"
            }
          ],
          "without": "Zonder labelafspraak moet je op een andere manier laten weten dat dit plan nog niet naar buiten mag, bijvoorbeeld in de mail erbij. Dat wordt makkelijk over het hoofd gezien.",
          "who": "project"
        },
        {
          "id": "project-partner",
          "time": "10:00",
          "app": "sharepoint",
          "title": "Een nieuwe partner laten meelezen",
          "story": "Een nieuwe ontwerppartner moet vanaf morgen meelezen in de projectmap. Die map deel je alleen met mensen die je bij naam toevoegt, en een extern account moet eerst worden goedgekeurd. Dat duurt meestal een dag.",
          "question": "Hoe regel je de toegang?",
          "topic": "data",
          "choices": [
            {
              "title": "Vraag goedkeuring aan en voeg de partner bij naam toe",
              "sub": "Alleen voor deze projectmap",
              "tone": "ok",
              "result": {
                "title": "Toegang geregeld",
                "text": "Na goedkeuring opent de partner de stukken met een eigen account. Andere projectmappen blijven dicht, en je ziet precies wie erbij kan."
              },
              "effect": "review",
              "key": "A"
            },
            {
              "title": "Maak een link die iedereen kan openen",
              "sub": "Dan kan hij morgen meteen aan de slag",
              "tone": "block",
              "result": {
                "title": "Zo'n link kan hier niet",
                "text": "Noordhaven heeft links uitgezet waarmee iemand zonder aan te melden een bestand opent. Vraag gerichte toegang aan en zet geen kopie op een andere plek."
              },
              "effect": "block",
              "key": "B"
            }
          ],
          "without": "Ook zonder controle op de inhoud blijven deze deelinstellingen gelden. Met wie je deelt en wat er in een bestand staat, zijn twee verschillende vragen.",
          "who": "project"
        },
        {
          "id": "project-overleg",
          "time": "11:30",
          "app": "teams",
          "title": "Prijzen delen tijdens een overleg",
          "story": "In een Teams-vergadering met de partner vraagt iemand: 'Kun je de prijsbijlage even in de chat zetten?' De bijlage staat in SharePoint en heeft het label 'Vertrouwelijk'. Bij Noordhaven kunnen mensen van buiten zo'n bestand niet openen.",
          "question": "Wat zet je in de chat?",
          "topic": "dlp",
          "choices": [
            {
              "title": "De link naar de volledige prijsbijlage",
              "sub": "De partner zit toch al in het overleg",
              "tone": "block",
              "result": {
                "title": "De partner kan het bestand niet openen",
                "text": "De link verschijnt in de chat, maar het bestand blijft dicht voor de partner. Meedoen aan een vergadering geeft geen toegang tot bestanden."
              },
              "effect": "block",
              "key": "A"
            },
            {
              "title": "Een belofte dat je een korte versie nastuurt",
              "sub": "Met alleen de prijzen die de partner mag zien",
              "tone": "ok",
              "result": {
                "title": "Samenwerken zonder de hele bijlage",
                "text": "Je laat de korte versie goedkeuren en zet die in de projectmap waar de partner toegang heeft. Het label van de volledige bijlage blijft staan."
              },
              "effect": "review",
              "key": "B"
            }
          ],
          "without": "Nu bepalen alleen de bestandsrechten wie erbij kan. Staat de prijsbijlage te ruim gedeeld, dan opent de partner hem wél.",
          "who": "project"
        },
        {
          "id": "project-upload",
          "time": "14:00",
          "app": "windows",
          "title": "Snel iets laten vertalen",
          "story": "De Duitse partner wil het productidee morgen lezen. Een gratis vertaalwebsite zou het in een minuut doen. Het document heeft het label 'Vertrouwelijk'.",
          "question": "Hoe laat je het vertalen?",
          "topic": "endpoint",
          "choices": [
            {
              "title": "Gebruik de vertaaldienst die Noordhaven heeft goedgekeurd",
              "sub": "Vraag de servicedesk welke dat is",
              "tone": "ok",
              "result": {
                "title": "Vertaald binnen de afspraken",
                "text": "Je gebruikt een dienst die Noordhaven voor deze informatie heeft goedgekeurd. Het productidee komt niet terecht bij een site die je niet kent."
              },
              "effect": "review",
              "key": "A"
            },
            {
              "title": "Upload het naar de gratis site",
              "sub": "Alleen voor een eerste versie",
              "tone": "block",
              "result": {
                "title": "Uploaden lukt niet",
                "text": "Op werklaptops van Noordhaven houdt Purview het uploaden van gelabelde bestanden naar zulke sites tegen, in Edge en in browsers met de Purview-extensie. Gebruik de goedgekeurde vertaaldienst. Op een privéapparaat werkt deze bescherming niet; daar hoort het bestand ook niet."
              },
              "effect": "block",
              "key": "B"
            }
          ],
          "without": "De website kan het bestand nu wel ontvangen. Het productidee staat dan bij een dienst buiten Noordhaven die je niet kent.",
          "who": "project"
        },
        {
          "id": "project-copilot",
          "time": "16:00",
          "app": "copilot",
          "title": "Copilot vindt een oude offerte",
          "story": "Je vraagt Copilot om een update voor de partner. Copilot verwerkt daarin een oude offerte van een ander project. Je kunt die openen, omdat hij in een map staat die voor de hele afdeling openstaat. Dat was vast niet de bedoeling.",
          "question": "Wat doe je met die offerte?",
          "topic": "copilot",
          "choices": [
            {
              "title": "Laat de offerte in de update staan",
              "sub": "Copilot vond hem toch",
              "tone": "warn",
              "result": {
                "title": "Vindbaar, maar niet deelbaar",
                "text": "Dat jij erbij kunt, maakt de offerte nog niet geschikt voor de partner. Haal hem uit de update en laat de eigenaar weten dat de map te ruim openstaat."
              },
              "effect": "allow",
              "key": "A"
            },
            {
              "title": "Haal de offerte eruit en meld de te ruime toegang",
              "sub": "Bij de eigenaar van de map",
              "tone": "ok",
              "result": {
                "title": "Te ruime toegang gemeld",
                "text": "De eigenaar kan de toegang beperken. Copilot gaf je geen nieuwe rechten; het liet zien wat al te ruim openstond."
              },
              "effect": "review",
              "key": "B"
            }
          ],
          "without": "Ook zonder extra regels vindt Copilot alles waar jij bij kunt. Te ruime rechten los je op bij de bron, niet met een regel voor Copilot.",
          "who": "project"
        }
      ],
      "version": 2
    },
    {
      "id": "security",
      "title": "Security officer",
      "person": {
        "name": "Amir",
        "role": "Security officer",
        "portrait": "personSecurity"
      },
      "intro": "Je volgt meldingen over gevoelige gegevens op en test nieuwe regels voordat ze echt aangaan. Je ziet alleen de meldingen die aan jou zijn toegewezen; je functie geeft je geen extra rechten. Noordhaven en alle personen zijn verzonnen.",
      "moments": [
        {
          "id": "security-melding",
          "time": "08:30",
          "app": "purview",
          "title": "Een melding over extern delen",
          "story": "Er staat een nieuwe melding voor je klaar: iemand probeerde een vertrouwelijk bestand met een extern adres te delen. Jij mag de details van deze melding bekijken. Wat er precies speelde, weet je nog niet.",
          "question": "Waar begin je?",
          "topic": "monitor",
          "choices": [
            {
              "title": "Bekijk eerst wat er gebeurde en waarom",
              "sub": "Lees ook de reden die is ingevuld",
              "tone": "ok",
              "result": {
                "title": "Gericht onderzoek",
                "text": "Je bekijkt welk bestand het was, naar wie het ging en welke reden is opgegeven. Vaak blijkt het een vergissing of gewoon werk."
              },
              "effect": "review",
              "key": "A"
            },
            {
              "title": "Vraag meteen het hele personeelsdossier op",
              "sub": "Voor een compleet beeld",
              "tone": "warn",
              "result": {
                "title": "Te veel voor één melding",
                "text": "Een melding geeft je geen recht op het hele dossier. Kijk eerst naar wat nodig is en vraag meer toegang via HR als het onderzoek daarom vraagt."
              },
              "effect": "review",
              "key": "B"
            }
          ],
          "without": "Dan krijg je deze melding niet. Misschien zie je het op een andere manier, maar één signaal bewijst nog niets.",
          "who": "security"
        },
        {
          "id": "security-simulatie",
          "time": "10:00",
          "app": "purview",
          "title": "Veel meldingen tijdens een test",
          "story": "Een nieuwe DLP-regel voor bankgegevens draait twee weken in simulatie: een proefstand die meldingen verzamelt maar niets tegenhoudt. Medewerkers merken er niets van. Jij beoordeelt de resultaten: 340 meldingen, de meeste van Financiën.",
          "question": "Wat adviseer je?",
          "topic": "roadmap",
          "choices": [
            {
              "title": "Meld dat de regel al veel tegenhoudt",
              "sub": "Er zijn toch honderden meldingen",
              "tone": "warn",
              "result": {
                "title": "Het is nog een test",
                "text": "De regel verzamelt alleen meldingen. Vertel eerlijk dat het om een test gaat en bekijk eerst of de meldingen terecht zijn."
              },
              "effect": "review",
              "key": "A"
            },
            {
              "title": "Bekijk voorbeelden en stel een kleine vervolgtest voor",
              "sub": "Wat raakt de regel in het gewone werk?",
              "tone": "ok",
              "result": {
                "title": "Eerst de meldingen beoordelen",
                "text": "Je scheidt terechte meldingen van vals alarm, zoals de vaste betaalbestanden van Financiën. De eigenaar van de regel besluit over aanpassingen; daarna draait de aangepaste regel nog twee weken in simulatie."
              },
              "effect": "review",
              "key": "B"
            }
          ],
          "without": "Dan zijn er geen testmeldingen, en ontdek je pas na het aanzetten wat de regel in het werk raakt.",
          "who": "security"
        },
        {
          "id": "security-rapport",
          "time": "11:45",
          "app": "outlook",
          "title": "Een rapport voor een externe adviseur",
          "story": "Een externe adviseur helpt bij het onderzoek en vraagt om je bevindingen. Je ruwe rapport bevat namen en heeft het label 'Vertrouwelijk'. Bij Noordhaven wordt zo'n bijlage tegengehouden als je die naar buiten mailt.",
          "question": "Wat stuur je?",
          "topic": "dlp",
          "choices": [
            {
              "title": "Een korte versie zonder namen",
              "sub": "Laat ontvanger en inhoud eerst goedkeuren",
              "tone": "ok",
              "result": {
                "title": "Alleen de bevindingen gedeeld",
                "text": "Je zet de korte versie in de onderzoeksmap waar de adviseur toegang toe heeft. Het label van het ruwe rapport haal je niet weg om de blokkade te omzeilen."
              },
              "effect": "review",
              "key": "A"
            },
            {
              "title": "Het ruwe rapport",
              "sub": "Hij werkt toch mee aan het onderzoek",
              "tone": "block",
              "result": {
                "title": "Deze mail wordt tegengehouden",
                "text": "De regel kijkt naar het label, niet naar wie de ontvanger is. Maak een korte versie zonder namen en laat die goedkeuren."
              },
              "effect": "block",
              "key": "B"
            }
          ],
          "without": "De mail kan nu wel weg. Of de adviseur het hele rapport nodig heeft, moet je dan zelf beoordelen.",
          "who": "security"
        },
        {
          "id": "security-bewijs",
          "time": "13:30",
          "app": "windows",
          "title": "Onderzoeksbestanden meenemen naar een overleg",
          "story": "Vanmiddag bespreek je het onderzoek met HR en de leidinggevende. Je wilt de gelabelde onderzoeksbestanden meenemen naar de vergaderruimte.",
          "question": "Hoe zorg je dat iedereen erbij kan?",
          "topic": "endpoint",
          "choices": [
            {
              "title": "Zet ze op je eigen USB-stick",
              "sub": "Jij werkt zelf aan het onderzoek",
              "tone": "block",
              "result": {
                "title": "Ook jij kunt niet kopiëren",
                "text": "Op werklaptops van Noordhaven kun je gelabelde bestanden niet naar een USB-stick kopiëren, en je account valt gewoon onder die regel. Laat de bestanden vanaf je laptop zien of geef de deelnemers toegang tot de onderzoeksmap."
              },
              "effect": "block",
              "key": "A"
            },
            {
              "title": "Geef de deelnemers toegang tot de onderzoeksmap",
              "sub": "Alleen zolang het onderzoek loopt",
              "tone": "ok",
              "result": {
                "title": "Binnen de afgeschermde map",
                "text": "De bestanden blijven op één plek. Kijk vooraf of alle deelnemers erbij kunnen, en haal de toegang weg als het onderzoek klaar is."
              },
              "effect": "allow",
              "key": "B"
            }
          ],
          "without": "Dan kan het bestand op een stick belanden. Blijft die in de trein liggen, dan ligt het onderzoek op straat.",
          "who": "security"
        },
        {
          "id": "security-terugkoppeling",
          "time": "15:15",
          "app": "teams",
          "title": "Leren van een uitzondering",
          "story": "In het overzicht van deze week zie je dat een collega na een melding toch een klantbestand naar buiten stuurde, met als reden 'klant wacht op offerte'. Dat mocht volgens de regel. Het team wil weten wat het hiervan kan leren.",
          "question": "Hoe bespreek je het met het team?",
          "topic": "monitor",
          "choices": [
            {
              "title": "Bespreek het als anoniem voorbeeld",
              "sub": "Gedrag bespreken, geen personen",
              "tone": "ok",
              "result": {
                "title": "Leren zonder iemand aan te wijzen",
                "text": "Je haalt naam en details weg en bespreekt wat er speelde: een klant die wacht, en geen snelle manier om een offerte beveiligd te versturen. Misschien is dat het echte verbeterpunt."
              },
              "effect": "review",
              "key": "A"
            },
            {
              "title": "Plak de melding met naam in het teamkanaal",
              "sub": "Een echt voorbeeld blijft beter hangen",
              "tone": "warn",
              "result": {
                "title": "Dit mocht gewoon",
                "text": "De collega deed wat de regel toestaat. Deel de melding niet breed; maak er een anoniem voorbeeld van."
              },
              "effect": "review",
              "key": "B"
            }
          ],
          "without": "Dan wordt de uitzondering niet vastgelegd en weet niemand dat dit vaker voorkomt.",
          "who": "security"
        }
      ],
      "version": 2
    },
    {
      "id": "care",
      "title": "Verpleegkundige / verzorgende",
      "person": {
        "name": "Lotte",
        "role": "Verpleegkundige",
        "portrait": "personCare"
      },
      "intro": "Je werkt als verpleegkundige in een zorgorganisatie: je plant zorg en draagt werk over aan collega's. Purview herkent vooral vaste nummers zoals een BSN; gewone zorgtaal herken jij beter. Alle voorbeelden zijn verzonnen en spelen zich af in Microsoft 365, niet in het patiëntendossier.",
      "moments": [
        {
          "id": "care-overdracht",
          "time": "07:00",
          "app": "word",
          "title": "Een werklijst voor je dienst",
          "story": "Je dienst begint om zeven uur. Na de overdracht van de nachtdienst zet je in Word een werklijst klaar voor je collega's: wie welke patiënt heeft en waar extra aandacht nodig is. De afspraak is: label 'Vertrouwelijk' en opslaan in de teammap.",
          "question": "Hoe sla je de werklijst op?",
          "topic": "labels",
          "choices": [
            {
              "title": "Kies zelf 'Vertrouwelijk' en sla op in de teammap",
              "sub": "Alleen het zorgteam kan erbij",
              "tone": "ok",
              "result": {
                "title": "Zelf gelabeld",
                "text": "Het bestand blijft herkenbaar vertrouwelijk, ook als iemand het doorstuurt. In de teammap kan alleen het zorgteam erbij."
              },
              "effect": "label",
              "key": "A"
            },
            {
              "title": "Wacht tot Purview een label voorstelt",
              "sub": "Er staan toch duidelijk medische woorden in",
              "tone": "warn",
              "result": {
                "title": "Geen voorstel, toch gevoelig",
                "text": "Er komt geen voorstel: Purview herkent Nederlandse zorgtekst niet betrouwbaar. Kies het label zelf."
              },
              "effect": "allow",
              "key": "B"
            }
          ],
          "without": "Dan is niet te zien hoe gevoelig de werklijst is. Een afgeschermde teammap wordt dan extra belangrijk.",
          "who": "care"
        },
        {
          "id": "care-familie",
          "time": "09:00",
          "app": "outlook",
          "title": "Een mail aan familie met de verkeerde bijlage",
          "story": "Je bevestigt aan de dochter van een patiënt de tijd van het familiegesprek. Bij de bijlage klik je mis: je voegt de afdelingslijst met burgerservicenummers (BSN's) toe. Outlook houdt de mail naar het externe adres tegen en zegt waarom.",
          "question": "Wat doe je met de mail?",
          "topic": "dlp",
          "choices": [
            {
              "title": "Probeer het opnieuw met een reden",
              "sub": "De dochter wacht op de tijd",
              "tone": "block",
              "result": {
                "title": "De mail wordt tegengehouden",
                "text": "Voor BSN's naar buiten kun je bij deze organisatie niet doorgaan met een reden. Haal de bijlage weg en stuur alleen de afspraak."
              },
              "effect": "block",
              "key": "A"
            },
            {
              "title": "Haal de bijlage weg en stuur alleen de afspraak",
              "sub": "Kijk ook of het adres klopt",
              "tone": "ok",
              "result": {
                "title": "Alleen wat de familie nodig heeft",
                "text": "De dochter krijgt de tijd van het gesprek. Medische informatie bespreek je in het gesprek zelf, niet per mail."
              },
              "effect": "review",
              "key": "B"
            }
          ],
          "without": "Zonder deze regel gaat de verkeerde bijlage mee, en staan de BSN's van de hele afdeling in een privémailbox.",
          "who": "care"
        },
        {
          "id": "care-dienstwissel",
          "time": "11:00",
          "app": "teams",
          "title": "Een dienst ruilen",
          "story": "Je zoekt iemand die zaterdag je late dienst wil overnemen. In het grote roosterkanaal wil je uitleggen waarom het druk is: een patiënt op kamer 6 gaat hard achteruit.",
          "question": "Wat zet je in het kanaal?",
          "topic": "data",
          "choices": [
            {
              "title": "Zet de hele uitleg erin",
              "sub": "Dan snapt iedereen waarom het dringend is",
              "tone": "warn",
              "result": {
                "title": "Verschijnt wel, hoort er niet",
                "text": "Het bericht komt aan, want Purview herkent de zin niet. Maar een roosterkanaal met tientallen collega's is geen plek voor patiëntinformatie. Houd het bij de dienst."
              },
              "effect": "allow",
              "key": "A"
            },
            {
              "title": "Noem alleen de dienst en dat het druk is",
              "sub": "Patiëntinformatie gaat via de overdracht",
              "tone": "ok",
              "result": {
                "title": "Ruilen zonder zorggegevens",
                "text": "Het kanaal krijgt wat nodig is voor de ruil. Wie de dienst overneemt, hoort de rest bij de overdracht."
              },
              "effect": "allow",
              "key": "B"
            }
          ],
          "without": "Er komt in deze situatie toch al geen melding. Wat je in een groot kanaal zet, bepaal je zelf.",
          "who": "care"
        },
        {
          "id": "care-klembord",
          "time": "13:00",
          "app": "windows",
          "title": "Even iets doorsturen via een privéchat",
          "story": "Een collega van een andere afdeling neemt morgen een patiënt van je over en vraagt via je privéchatapp hoe het gaat. Je wilt een stukje uit het gelabelde overdrachtsbestand naar die chat kopiëren.",
          "question": "Hoe help je je collega?",
          "topic": "endpoint",
          "choices": [
            {
              "title": "Verwijs naar de overdracht in het patiëntendossier",
              "sub": "Of bel haar even",
              "tone": "ok",
              "result": {
                "title": "Via de juiste plek",
                "text": "Je collega leest de overdracht in het dossier, waar ze toegang toe heeft. Wat nog ontbreekt, bespreek je telefonisch."
              },
              "effect": "allow",
              "key": "A"
            },
            {
              "title": "Kopieer het stukje naar de privéchat",
              "sub": "Het gaat maar om een paar regels",
              "tone": "block",
              "result": {
                "title": "Kopiëren lukt niet",
                "text": "Op je werklaptop kun je uit dit gelabelde bestand niets naar het klembord kopiëren. Bel je collega of verwijs naar het dossier; patiëntinformatie hoort niet in een privéchatapp."
              },
              "effect": "block",
              "key": "B"
            }
          ],
          "without": "Kopiëren lukt nu wel. De informatie staat daarna op een privételefoon, buiten het zicht van de organisatie.",
          "who": "care"
        },
        {
          "id": "care-copilot",
          "time": "15:00",
          "app": "copilot",
          "title": "Copilot helpt met een overdracht",
          "story": "Je vraagt Copilot om een concept met praktische aandachtspunten voor het weekend, op basis van je notities in Microsoft 365. Copilot kan niet in het patiëntendossier en controleert niet of de medische inhoud klopt. Het resultaat leest vlot en klinkt compleet.",
          "question": "Wat doe je met het concept?",
          "topic": "copilot",
          "choices": [
            {
              "title": "Vergelijk elke afspraak met je notities",
              "sub": "En laat de zorginhoud beoordelen door wie erover gaat",
              "tone": "ok",
              "result": {
                "title": "Een gecontroleerd concept",
                "text": "Je verbetert fouten en haalt overbodige persoonsgegevens weg. Copilot maakt het concept; jij blijft verantwoordelijk voor wat er in de overdracht staat."
              },
              "effect": "review",
              "key": "A"
            },
            {
              "title": "Stuur het concept meteen door als overdracht",
              "sub": "Het klinkt compleet en overtuigend",
              "tone": "warn",
              "result": {
                "title": "Overtuigend is niet hetzelfde als juist",
                "text": "Niets houdt deze mail tegen. Vergelijk het concept met je notities en laat de verantwoordelijke zorgverlener het beoordelen."
              },
              "effect": "allow",
              "key": "B"
            }
          ],
          "without": "Ook zonder extra regels moet je het concept zelf nalezen. Dat Copilot je notities kan lezen, zegt niets over de juistheid van de samenvatting.",
          "who": "care"
        }
      ],
      "version": 2
    },
    {
      "id": "specialist",
      "title": "Medisch specialist / arts",
      "person": {
        "name": "Ravi",
        "role": "Medisch specialist",
        "portrait": "personSpecialist"
      },
      "intro": "Je bent medisch specialist in een ziekenhuis. Je overlegt met collega's, geeft onderwijs en bereidt onderzoek voor. Alle documenten zijn verzonnen en staan in Microsoft 365, niet in het patiëntendossier. Afspraken over privacy en onderzoek gelden daarnaast.",
      "moments": [
        {
          "id": "specialist-onderwijs",
          "time": "08:00",
          "app": "word",
          "title": "Een bijzondere casus voor onderwijs",
          "story": "Je maakt een casus voor het onderwijs aan arts-assistenten. De naam van de patiënt staat er niet in, wel een precieze datum en een zeldzame combinatie van klachten. De afspraak is: 'Vertrouwelijk' totdat iemand heeft beoordeeld of de patiënt herkenbaar is.",
          "question": "Hoe bereid je de casus voor?",
          "topic": "data",
          "choices": [
            {
              "title": "Haal herkenbare details weg en laat het beoordelen",
              "sub": "'Vertrouwelijk' blijft staan tot die beoordeling",
              "tone": "ok",
              "result": {
                "title": "Meer dan alleen de naam weghalen",
                "text": "Je laat ook details beoordelen waaraan iemand indirect te herkennen is. Daarna beslist de beoordelaar of de casus naar de groep kan."
              },
              "effect": "review",
              "key": "A"
            },
            {
              "title": "Maak het document 'Openbaar'",
              "sub": "De naam is er toch uit",
              "tone": "warn",
              "result": {
                "title": "De patiënt is misschien nog herkenbaar",
                "text": "Een ander label maakt de inhoud niet anoniem. Zet het label terug op 'Vertrouwelijk' en laat de details beoordelen."
              },
              "effect": "allow",
              "key": "B"
            }
          ],
          "without": "Dan lijkt een onderwijsdocument snel deelbaar. Of iemand herkenbaar is, blijft een menselijke afweging.",
          "who": "specialist"
        },
        {
          "id": "specialist-consult",
          "time": "10:00",
          "app": "outlook",
          "title": "Overleg met een specialist van buiten",
          "story": "Je wilt een lastige casus voorleggen aan een specialist in een ander ziekenhuis. Voor dit overleg is één werkadres van haar vooraf goedgekeurd. In jouw ziekenhuis kun je gelabelde casussen niet naar buiten mailen, behalve naar dat adres. Haar privéadres valt daar niet onder.",
          "question": "Hoe stuur je je vraag?",
          "topic": "dlp",
          "choices": [
            {
              "title": "Gebruik haar privéadres",
              "sub": "Dan leest ze het vanavond nog",
              "tone": "block",
              "result": {
                "title": "Dit adres valt buiten de uitzondering",
                "text": "De mail wordt tegengehouden. Gebruik het goedgekeurde werkadres; dat je haar kent, maakt het privéadres niet veilig."
              },
              "effect": "block",
              "key": "A"
            },
            {
              "title": "Gebruik het goedgekeurde werkadres",
              "sub": "Deel alleen wat nodig is voor het overleg",
              "tone": "ok",
              "result": {
                "title": "Overleg binnen de afspraak",
                "text": "De regel kijkt naar het adres, niet naar je functie. Dit werkadres staat op de lijst, dus de mail gaat weg."
              },
              "effect": "allow",
              "key": "B"
            }
          ],
          "without": "De mail komt nu ook op het privéadres aan. De afspraak over dit overleg blijft net zo goed gelden.",
          "who": "specialist"
        },
        {
          "id": "specialist-onderzoek",
          "time": "12:00",
          "app": "sharepoint",
          "title": "Een tabel voor een onderzoekspartner",
          "story": "Een onderzoekspartner van een universiteit vraagt om een tabel met gegevens uit jouw onderzoek. In de tabel staan burgerservicenummers (BSN's). In jouw ziekenhuis houdt Purview delen met mensen van buiten tegen als er BSN's in een bestand staan.",
          "question": "Wat doe je met het verzoek?",
          "topic": "autolabel",
          "choices": [
            {
              "title": "Laat een onderzoeksversie maken en beoordelen",
              "sub": "Zonder BSN's en met alleen de nodige gegevens",
              "tone": "ok",
              "result": {
                "title": "Eerst beoordelen, dan delen",
                "text": "De verantwoordelijken beoordelen de onderzoeksversie. Alleen de BSN's weghalen maakt de tabel nog niet anoniem, en geeft ook geen toestemming om te delen."
              },
              "effect": "review",
              "key": "A"
            },
            {
              "title": "Deel de tabel via een link met de partner",
              "sub": "Hij doet toch hetzelfde onderzoek",
              "tone": "block",
              "result": {
                "title": "Delen met buiten lukt niet",
                "text": "De BSN's in de tabel zorgen voor de blokkade. Gebruik een beoordeelde onderzoeksversie; Purview geeft geen juridische goedkeuring voor onderzoek."
              },
              "effect": "block",
              "key": "B"
            }
          ],
          "without": "Nu bepalen alleen de deelrechten wie erbij kan. Andere gegevens in de tabel, zoals diagnoses in Nederlandse tekst, herkent Purview ook met deze regel niet goed.",
          "who": "specialist"
        },
        {
          "id": "specialist-ai-upload",
          "time": "14:00",
          "app": "windows",
          "title": "Een brief laten herschrijven door AI",
          "story": "Je wilt een vertrouwelijke conceptbrief aan een verwijzer laten herschrijven door een openbare AI-website. De brief heeft het label 'Vertrouwelijk'.",
          "question": "Hoe verbeter je de tekst?",
          "topic": "endpoint",
          "choices": [
            {
              "title": "Vraag welke schrijfhulp is goedgekeurd",
              "sub": "Bijvoorbeeld Copilot binnen de organisatie",
              "tone": "ok",
              "result": {
                "title": "Eerst de juiste omgeving kiezen",
                "text": "Je gebruikt alleen een dienst die voor deze inhoud is toegestaan en leest het resultaat zelf na. Een hulpmiddel neemt jouw medische verantwoordelijkheid niet over."
              },
              "effect": "review",
              "key": "A"
            },
            {
              "title": "Upload de brief naar de AI-website",
              "sub": "Alleen de formulering moet anders",
              "tone": "block",
              "result": {
                "title": "Uploaden lukt niet",
                "text": "Op werklaptops van het ziekenhuis houdt Purview het uploaden van gelabelde bestanden naar zulke sites tegen, in Edge en in browsers met de Purview-extensie. Gebruik de goedgekeurde schrijfhulp. Op een privéapparaat werkt deze bescherming niet; daar hoort de brief ook niet."
              },
              "effect": "block",
              "key": "B"
            }
          ],
          "without": "De AI-website kan de brief nu wel ontvangen. Herschrijven maakt patiëntinformatie niet minder gevoelig.",
          "who": "specialist"
        },
        {
          "id": "specialist-copilot",
          "time": "16:00",
          "app": "copilot",
          "title": "Copilot schrijft mee met richtlijnen",
          "story": "Copilot helpt je een toelichting voor patiënten te schrijven, op basis van richtlijnen die je zelf kunt openen. Het antwoord noemt bronnen en klinkt stellig. Copilot krijgt geen extra rechten, maar weet ook niet welke richtlijn het nieuwst is.",
          "question": "Hoe maak je de toelichting af?",
          "topic": "copilot",
          "choices": [
            {
              "title": "Neem het antwoord over als definitieve toelichting",
              "sub": "De bronnen zien er overtuigend uit",
              "tone": "warn",
              "result": {
                "title": "Een bronvermelding is geen medische controle",
                "text": "Niets houdt dit tegen. Lees de echte richtlijn na en laat de toelichting beoordelen voordat patiënten hem krijgen."
              },
              "effect": "allow",
              "key": "A"
            },
            {
              "title": "Controleer bron, versie en inhoud zelf",
              "sub": "Jij beoordeelt de medische inhoud",
              "tone": "ok",
              "result": {
                "title": "Hulp die je controleert",
                "text": "Je vergelijkt de tekst met de actuele richtlijn en past aan waar nodig. Copilot helpt met schrijven; Purview zegt niets over medische juistheid."
              },
              "effect": "review",
              "key": "B"
            }
          ],
          "without": "Ook met extra regels blijft dit jouw verantwoordelijkheid: actuele, juiste en bruikbare inhoud.",
          "who": "specialist"
        }
      ],
      "version": 2
    }
  ]
};
CATALOG.experience.moments = CATALOG.experience.roles.flatMap((r) => r.moments);
