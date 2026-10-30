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
      "intro": "Je werkt op HR en helpt bij sollicitaties en personeelszaken. Je functie geeft je geen extra toegang tot bestanden. Alle namen, gegevens en regels zijn verzonnen.",
      "moments": [
        {
          "id": "hr-sollicitatie",
          "time": "08:30",
          "app": "word",
          "title": "Notities na een sollicitatiegesprek",
          "story": "Je hebt net een sollicitatiegesprek gehad en schrijft je indrukken van de kandidaat op. Bij Noordhaven is de afspraak: sollicitatienotities krijgen het label 'Vertrouwelijk'. Dat label komt er niet vanzelf op als je het bestand alleen in je eigen map opslaat.",
          "question": "Hoe bewaar je je notities?",
          "topic": "labels",
          "choices": [
            {
              "title": "Kies 'Vertrouwelijk' en bewaar op de afgesproken plek",
              "sub": "Alleen de betrokken collega's kunnen erbij",
              "tone": "ok",
              "result": {
                "title": "Goed geregeld",
                "text": "Iedereen ziet nu hoe gevoelig de notities zijn. Kijk wel zelf wie er toegang heeft: het label regelt dat niet voor je."
              },
              "effect": "label",
              "key": "A"
            },
            {
              "title": "Sla op in je eigen map, zonder label",
              "sub": "Die map voelt toch privé",
              "tone": "warn",
              "result": {
                "title": "Het label ontbreekt nog",
                "text": "Opslaan lukt gewoon. Maar zonder label ziet niemand dat dit gevoelig is. Kijk wie er toegang heeft en zet het label erop voordat je de notities deelt."
              },
              "effect": "allow",
              "key": "B"
            }
          ],
          "without": "Zonder deze afspraak moet je nog steeds zorgvuldig opslaan. Alleen ziet niemand meer in één oogopslag hoe gevoelig het document is.",
          "who": "hr"
        },
        {
          "id": "hr-loonbestand",
          "time": "09:45",
          "app": "excel",
          "title": "Een loonbestand met BSN's",
          "story": "Je opent een loonbestand met een kolom vol burgerservicenummers (BSN's). Excel herkent die nummers en stelt voor om het label 'Vertrouwelijk' te gebruiken. Het is een advies: je mag het ook negeren.",
          "question": "Wat doe je met het advies?",
          "topic": "autolabel",
          "choices": [
            {
              "title": "Bekijk het advies en neem het over",
              "sub": "Het past bij wat er in het bestand staat",
              "tone": "ok",
              "result": {
                "title": "Het label staat erop",
                "text": "Het bestand heeft nu het juiste label. Kijk ook naar wie je het stuurt en laat kolommen weg die niemand nodig heeft."
              },
              "effect": "recommend",
              "key": "A"
            },
            {
              "title": "Negeer het advies",
              "sub": "Eerst de berekening afmaken",
              "tone": "warn",
              "result": {
                "title": "Nog zonder label",
                "text": "Je kunt gewoon verder werken. Zet het label er wel op voordat het bestand naar iemand anders gaat."
              },
              "effect": "allow",
              "key": "B"
            }
          ],
          "without": "Zonder dit advies krijg je geen herinnering. Je moet het label dan zelf toevoegen, zoals afgesproken.",
          "who": "hr"
        },
        {
          "id": "hr-verzuim",
          "time": "11:00",
          "app": "outlook",
          "title": "Een vraag over de bezetting",
          "story": "Een teamleider vraagt wie er morgen kan werken. In je antwoord staan ook de redenen waarom collega's ziek zijn. Purview herkent niet elke Nederlandse zin over gezondheid als gevoelig.",
          "question": "Wat stuur je terug?",
          "topic": "data",
          "choices": [
            {
              "title": "Stuur alleen wie er wel en niet is",
              "sub": "Laat de reden van ziekte weg",
              "tone": "ok",
              "result": {
                "title": "Vraag beantwoord, privacy bewaard",
                "text": "De teamleider weet genoeg om te plannen. Details over ziekte blijven op de plek die daarvoor is afgesproken."
              },
              "effect": "allow",
              "key": "A"
            },
            {
              "title": "Stuur het hele overzicht",
              "sub": "Dan weet de teamleider alles",
              "tone": "warn",
              "result": {
                "title": "Meer gedeeld dan nodig",
                "text": "De mail gaat mogelijk zonder waarschuwing weg. Toch deel je zo te veel. Houd het bij wat nodig is en controleer de ontvanger."
              },
              "effect": "allow",
              "key": "B"
            }
          ],
          "without": "Of er nu een regel is of niet: jij bepaalt wat er in de mail staat. Krijg je geen melding, dan betekent dat niet dat het goed is.",
          "who": "hr"
        },
        {
          "id": "hr-recruiter",
          "time": "13:30",
          "app": "teams",
          "title": "Een recruiter in de chat",
          "story": "Een recruiter van buiten vraagt in Teams om het profiel van een kandidaat. Het volledige sollicitatiedossier staat in SharePoint en heeft het label 'Vertrouwelijk'. Bij Noordhaven kunnen mensen van buiten zo'n bestand niet openen, ook niet via een link in Teams.",
          "question": "Wat doe je?",
          "topic": "dlp",
          "choices": [
            {
              "title": "Maak een kort profiel en laat het goedkeuren",
              "sub": "Deel het daarna via de afgesproken weg",
              "tone": "ok",
              "result": {
                "title": "Een goede volgende stap",
                "text": "Je laat eerst checken wat er gedeeld mag worden. Daarna deel je het profiel op de manier die daarvoor is afgesproken."
              },
              "effect": "review",
              "key": "A"
            },
            {
              "title": "Plak de link naar het hele dossier",
              "sub": "Jullie praten toch al in Teams",
              "tone": "block",
              "result": {
                "title": "De recruiter kan het bestand niet openen",
                "text": "Het bestand zelf is beschermd, niet de chat. Deel een goedgekeurd profiel. Zet het dossier niet ergens anders neer om de blokkade te omzeilen."
              },
              "effect": "block",
              "key": "B"
            }
          ],
          "without": "Zonder deze regel bepalen alleen de rechten in SharePoint wie erbij kan. Staan die te ruim, dan kan de recruiter het hele dossier zien.",
          "who": "hr"
        },
        {
          "id": "hr-copilot",
          "time": "15:00",
          "app": "copilot",
          "title": "Copilot vat gesprekken samen",
          "story": "Je vraagt Copilot om een paar gespreksverslagen samen te vatten. Copilot kan alleen bestanden gebruiken die jij zelf al mag openen. In dit voorbeeld is er geen extra regel die Copilot tegenhoudt.",
          "question": "Wat doe je met de samenvatting?",
          "topic": "copilot",
          "choices": [
            {
              "title": "Gebruik het als concept en check de bronnen",
              "sub": "Mensen kiezen de kandidaat, niet Copilot",
              "tone": "ok",
              "result": {
                "title": "Copilot als hulpje",
                "text": "Je controleert de feiten, haalt onnodige persoonlijke details weg en deelt alleen met wie erbij betrokken is. Copilot beslist niet wie de baan krijgt."
              },
              "effect": "review",
              "key": "A"
            },
            {
              "title": "Stuur de samenvatting meteen naar het hele team",
              "sub": "Een samenvatting is toch minder gevoelig",
              "tone": "warn",
              "result": {
                "title": "Korter is niet minder gevoelig",
                "text": "Ook een samenvatting kan persoonlijke oordelen bevatten. Kijk naar de inhoud, het label en de ontvangers voordat je deelt."
              },
              "effect": "allow",
              "key": "B"
            }
          ],
          "without": "Ook zonder extra regels kan Copilot alleen bij bestanden waar jij bij mag. Maar of jij de samenvatting daarna netjes deelt, controleert niemand.",
          "who": "hr"
        }
      ],
      "version": 1
    },
    {
      "id": "finance",
      "title": "Financieel medewerker",
      "person": {
        "name": "Daan",
        "role": "Financieel medewerker",
        "portrait": "personFinance"
      },
      "intro": "Je verwerkt betalingen en helpt bij de financiële controle. Kun je technisch een uitzondering maken, dan is de betaling daarmee nog niet goedgekeurd. Alle bedrijven, bedragen en regels zijn verzonnen.",
      "moments": [
        {
          "id": "finance-betaalbestand",
          "time": "08:15",
          "app": "excel",
          "title": "Een betaalbestand klaarzetten",
          "story": "Je controleert een bestand met salarissen en rekeningnummers. De afspraak is: label 'Vertrouwelijk' en opslaan in de afgeschermde betaalmap. Een saaie bestandsnaam maakt de inhoud niet minder gevoelig.",
          "question": "Hoe zet je het bestand klaar?",
          "topic": "labels",
          "choices": [
            {
              "title": "Zet het label erop en check de betaalmap",
              "sub": "Bescherm de inhoud, niet alleen de naam",
              "tone": "ok",
              "result": {
                "title": "Herkenbaar en veilig opgeslagen",
                "text": "Het bestand heeft het afgesproken label. Je kijkt daarnaast zelf of alleen de juiste collega's toegang hebben."
              },
              "effect": "label",
              "key": "A"
            },
            {
              "title": "Noem het 'overzicht' en laat het label weg",
              "sub": "Dan valt het minder op",
              "tone": "warn",
              "result": {
                "title": "Een andere naam beschermt niets",
                "text": "De gevoelige gegevens staan er nog steeds in. Kies het juiste label en gebruik de afgeschermde betaalmap."
              },
              "effect": "allow",
              "key": "B"
            }
          ],
          "without": "Zonder labelafspraak kan de map nog steeds afgeschermd zijn. Maar wie het bestand later tegenkomt, ziet niet hoe gevoelig het is.",
          "who": "finance"
        },
        {
          "id": "finance-bankwijziging",
          "time": "09:30",
          "app": "outlook",
          "title": "Een leverancier heeft een nieuw rekeningnummer",
          "story": "Een leverancier mailt dat hij een nieuw rekeningnummer heeft en vraagt om bankgegevens ter controle. Mail je bankgegevens naar buiten, dan krijg je bij Noordhaven een waarschuwing. Je mag doorgaan als je een reden opgeeft. Of het verzoek echt is, controleert Purview niet.",
          "question": "Wat doe je eerst?",
          "topic": "dlp",
          "choices": [
            {
              "title": "Bel de leverancier op een nummer dat je al kent",
              "sub": "Niet het nummer uit de nieuwe mail",
              "tone": "ok",
              "result": {
                "title": "Eerst het verzoek checken",
                "text": "Je volgt de vaste betaalprocedure en deelt daarna alleen wat nodig is. De waarschuwing van Purview vervangt die controle niet."
              },
              "effect": "review",
              "key": "A"
            },
            {
              "title": "Geef een reden op en stuur de banklijst",
              "sub": "Het verzoek lijkt dringend",
              "tone": "warn",
              "result": {
                "title": "Verstuurd, maar niet goedgekeurd",
                "text": "Deze regel laat je doorgaan en legt vast dat je dat deed. Controleer het verzoek toch en deel zo min mogelijk. Haast is geen toestemming."
              },
              "effect": "override",
              "key": "B"
            }
          ],
          "without": "Zonder deze waarschuwing gaat de mail zonder onderbreking weg. Je moet het verzoek dan nog steeds zelf controleren.",
          "who": "finance"
        },
        {
          "id": "finance-accountant",
          "time": "11:15",
          "app": "sharepoint",
          "title": "Stukken voor de accountant",
          "story": "De accountant heeft al toegang tot een aparte map voor de controle. Links die iedereen kan openen, zijn bij Noordhaven uitgezet. In de interne financiële map staat veel meer dan de accountant nodig heeft.",
          "question": "Hoe lever je de stukken aan?",
          "topic": "data",
          "choices": [
            {
              "title": "Zet alleen de gevraagde stukken in de controlemap",
              "sub": "Check of het juiste account toegang heeft",
              "tone": "ok",
              "result": {
                "title": "Gericht gedeeld",
                "text": "De accountant krijgt precies wat nodig is, via de toegang die al geregeld was. Dat iemand accountant is, geeft op zich geen rechten."
              },
              "effect": "allow",
              "key": "A"
            },
            {
              "title": "Probeer een openbare link naar de hele map",
              "sub": "Dan zoekt de accountant zelf",
              "tone": "block",
              "result": {
                "title": "Een openbare link kan hier niet",
                "text": "De deelinstellingen houden dit tegen, niet een controle op de inhoud. Gebruik de controlemap met alleen de nodige stukken."
              },
              "effect": "block",
              "key": "B"
            }
          ],
          "without": "Ook zonder controle op de inhoud blijven deze deelinstellingen gelden. De aparte controlemap blijft dan de beste route.",
          "who": "finance"
        },
        {
          "id": "finance-usb",
          "time": "13:00",
          "app": "windows",
          "title": "Thuis verder aan een prognose",
          "story": "Je wilt vanavond verder aan een vertrouwelijke kasprognose. Op je werklaptop kun je dit bestand met label niet naar een USB-stick kopiëren. Dat is bij Noordhaven zo ingesteld.",
          "question": "Hoe neem je je werk mee?",
          "topic": "endpoint",
          "choices": [
            {
              "title": "Werk via de goedgekeurde werkplek",
              "sub": "Het bestand blijft binnen de werkomgeving",
              "tone": "ok",
              "result": {
                "title": "Verder via de afgesproken weg",
                "text": "Je werkt verder op een plek waar je al toegang hebt. Lukt dat niet, regel het dan eerst. Zoek geen omweg."
              },
              "effect": "allow",
              "key": "A"
            },
            {
              "title": "Kopieer het naar een USB-stick",
              "sub": "Alleen voor vanavond",
              "tone": "block",
              "result": {
                "title": "Kopiëren lukt hier niet",
                "text": "Op deze werklaptop geldt de USB-regel. Werk via de goedgekeurde omgeving. Let op: deze bescherming geldt niet vanzelf op elk apparaat."
              },
              "effect": "block",
              "key": "B"
            }
          ],
          "without": "Zonder deze regel lukt kopiëren naar USB misschien wel. Andere instellingen op je laptop kunnen het nog steeds tegenhouden.",
          "who": "finance"
        },
        {
          "id": "finance-teams",
          "time": "15:30",
          "app": "teams",
          "title": "Een spoedbetaling via de chat",
          "story": "In Teams vraagt iemand je om snel een betaling te doen, zonder de normale controle. Er staan geen gevoelige gegevens in het bericht, dus Purview doet niets.",
          "question": "Wat doe je met het verzoek?",
          "topic": "roadmap",
          "choices": [
            {
              "title": "Volg de normale betaalcontrole",
              "sub": "Check wie het vraagt en of het is goedgekeurd",
              "tone": "ok",
              "result": {
                "title": "De procedure gaat voor",
                "text": "Je controleert het verzoek via de bekende weg. Purview kan niet zien of een betaling klopt of nep is."
              },
              "effect": "review",
              "key": "A"
            },
            {
              "title": "Betaal, want er komt geen melding",
              "sub": "Geen waarschuwing voelt als groen licht",
              "tone": "warn",
              "result": {
                "title": "Geen melding is geen goedkeuring",
                "text": "De chat gaat gewoon door. Doe de betaalcontrole toch. Purview beoordeelt dit soort verzoeken niet."
              },
              "effect": "allow",
              "key": "B"
            }
          ],
          "without": "Met of zonder deze regels: de betaalprocedure blijft nodig. Niet elk risico zit in gegevens die Purview kan herkennen.",
          "who": "finance"
        }
      ],
      "version": 1
    },
    {
      "id": "project",
      "title": "Projectleider",
      "person": {
        "name": "Noor",
        "role": "Projectleider",
        "portrait": "personProject"
      },
      "intro": "Je werkt samen met collega's en externe partners aan een project. Als projectlid krijg je niet vanzelf overal toegang: die regel je per persoon. Alle namen en gegevens zijn verzonnen.",
      "moments": [
        {
          "id": "project-ontwerp",
          "time": "08:45",
          "app": "word",
          "title": "Een geheim productidee",
          "story": "Je schrijft een nieuw productidee uit. Er staan geen persoonsgegevens in, maar het idee is wel geheim. Bij Noordhaven krijgt zo'n ontwerp het label 'Vertrouwelijk'. Een scan op persoonsgegevens zou dit document dus missen.",
          "question": "Hoe laat je zien dat dit gevoelig is?",
          "topic": "labels",
          "choices": [
            {
              "title": "Kies 'Vertrouwelijk'",
              "sub": "Ook bedrijfskennis kan gevoelig zijn",
              "tone": "ok",
              "result": {
                "title": "Iedereen ziet dat het ertoe doet",
                "text": "Je zet het afgesproken label erop en bewaart het ontwerp op een plek waar alleen het projectteam bij kan."
              },
              "effect": "label",
              "key": "A"
            },
            {
              "title": "Kies 'Openbaar', er staan geen persoonsgegevens in",
              "sub": "Het zijn maar ideeën",
              "tone": "warn",
              "result": {
                "title": "Een verkeerd signaal",
                "text": "Geen persoonsgegevens betekent niet dat iets openbaar is. Pas het label aan en check wie er toegang heeft voordat je deelt."
              },
              "effect": "allow",
              "key": "B"
            }
          ],
          "without": "Zonder labelafspraak moet je op een andere manier duidelijk maken dat dit geheim is. Niet alleen persoonsgegevens zijn het beschermen waard.",
          "who": "project"
        },
        {
          "id": "project-partner",
          "time": "10:00",
          "app": "sharepoint",
          "title": "Een nieuwe partner laten meelezen",
          "story": "De projectmap mag je alleen delen met mensen die je bij naam toevoegt. Het account van een partner moet eerst worden goedgekeurd. Links die iedereen kan openen, zijn uitgezet.",
          "question": "Hoe regel je toegang?",
          "topic": "data",
          "choices": [
            {
              "title": "Laat het account checken en voeg de partner toe",
              "sub": "Alleen toegang tot de projectmap",
              "tone": "ok",
              "result": {
                "title": "Toegang bewust geregeld",
                "text": "Na goedkeuring kan de partner de bedoelde stukken openen. Andere projectmappen blijven dicht."
              },
              "effect": "review",
              "key": "A"
            },
            {
              "title": "Maak een link die iedereen kan openen",
              "sub": "Scheelt een aanvraag",
              "tone": "block",
              "result": {
                "title": "Zo'n link kan hier niet",
                "text": "SharePoint staat in deze map geen openbare links toe. Vraag gerichte toegang aan en maak geen kopie op een andere plek."
              },
              "effect": "block",
              "key": "B"
            }
          ],
          "without": "Ook zonder controle op de inhoud blijven deze deelinstellingen gelden. Met wie je deelt en wat er in een bestand staat, zijn twee verschillende beschermingen.",
          "who": "project"
        },
        {
          "id": "project-overleg",
          "time": "11:30",
          "app": "teams",
          "title": "Prijzen delen tijdens een overleg",
          "story": "In een Teams-vergadering vraagt een partner om de prijsbijlage. Die staat in SharePoint en heeft het label 'Vertrouwelijk'. Bij Noordhaven kunnen mensen van buiten dat bestand niet openen.",
          "question": "Wat deel je in de chat?",
          "topic": "dlp",
          "choices": [
            {
              "title": "Laat een korte versie goedkeuren",
              "sub": "Deel die daarna op de partnerplek",
              "tone": "ok",
              "result": {
                "title": "Samenwerken zonder de hele bijlage",
                "text": "Je laat checken welke prijzen gedeeld mogen worden. Verlaag niet zelf het label om de bijlage toch te kunnen sturen."
              },
              "effect": "review",
              "key": "A"
            },
            {
              "title": "Plak de link naar de volledige prijsbijlage",
              "sub": "De partner zit toch al in het overleg",
              "tone": "block",
              "result": {
                "title": "De partner kan het bestand niet openen",
                "text": "Meedoen aan een vergadering geeft geen toegang tot bestanden. Deel een goedgekeurde korte versie op de juiste plek."
              },
              "effect": "block",
              "key": "B"
            }
          ],
          "without": "Zonder deze regel bepalen alleen de bestandsrechten wie erbij kan. Is de prijsbijlage te ruim gedeeld, dan kan de partner hem wél openen.",
          "who": "project"
        },
        {
          "id": "project-upload",
          "time": "14:00",
          "app": "windows",
          "title": "Snel iets laten vertalen",
          "story": "Je wilt het geheime ontwerp snel laten vertalen via een gratis website. Op je werklaptop houdt Purview het uploaden van zulke bestanden naar deze site tegen, in de browsers die Purview ondersteunt.",
          "question": "Hoe laat je het vertalen?",
          "topic": "endpoint",
          "choices": [
            {
              "title": "Gebruik de goedgekeurde vertaaldienst",
              "sub": "Check eerst of deze inhoud daar mag",
              "tone": "ok",
              "result": {
                "title": "Eerst de juiste dienst kiezen",
                "text": "Je gebruikt alleen een dienst die voor deze informatie is goedgekeurd. Dat een vertaalsite bestaat, betekent niet dat je hem mag gebruiken."
              },
              "effect": "review",
              "key": "A"
            },
            {
              "title": "Upload het naar de gratis site",
              "sub": "Alleen voor een eerste versie",
              "tone": "block",
              "result": {
                "title": "Uploaden lukt hier niet",
                "text": "De bescherming op je laptop grijpt in. Gebruik de afgesproken dienst. Let op: dit werkt niet vanzelf in elke browser of op elk apparaat."
              },
              "effect": "block",
              "key": "B"
            }
          ],
          "without": "Zonder deze regel kan de website het bestand misschien wel ontvangen. Dan staat het ontwerp buiten de omgeving van Noordhaven.",
          "who": "project"
        },
        {
          "id": "project-copilot",
          "time": "16:00",
          "app": "copilot",
          "title": "Copilot vindt een oude offerte",
          "story": "Copilot noemt een oude offerte. Je kunt die openen omdat hij in een map staat die veel te ruim gedeeld is. Het gaat hier om de toegang in Microsoft 365, niet om een blokkade in Copilot.",
          "question": "Wat doe je met die offerte?",
          "topic": "copilot",
          "choices": [
            {
              "title": "Check de bron en meld dat de toegang te ruim is",
              "sub": "Gebruik de offerte nog niet",
              "tone": "ok",
              "result": {
                "title": "Een lek komt boven water",
                "text": "Je vraagt de eigenaar om de toegang te bekijken en checkt of je de offerte mag hergebruiken. Copilot geeft niemand nieuwe rechten."
              },
              "effect": "review",
              "key": "A"
            },
            {
              "title": "Zet de offerte in de update voor de partner",
              "sub": "Copilot kon hem toch vinden",
              "tone": "warn",
              "result": {
                "title": "Vindbaar is niet hetzelfde als deelbaar",
                "text": "Dat jij erbij kunt, betekent niet dat je het mag doorsturen. Check de bron, de eigenaar en de ontvangers."
              },
              "effect": "allow",
              "key": "B"
            }
          ],
          "without": "Ook zonder extra regels vindt Copilot ruim gedeelde informatie. De toegangsrechten bepalen wat iemand kan zien.",
          "who": "project"
        }
      ],
      "version": 1
    },
    {
      "id": "security",
      "title": "Security officer",
      "person": {
        "name": "Amir",
        "role": "Security officer",
        "portrait": "personSecurity"
      },
      "intro": "Je onderzoekt meldingen over gevoelige gegevens en helpt nieuwe maatregelen zorgvuldig in te voeren. Voor deze oefening zie je alleen de meldingen die aan jou zijn toegewezen. Je functietitel geeft je geen extra rechten.",
      "moments": [
        {
          "id": "security-melding",
          "time": "08:30",
          "app": "purview",
          "title": "Een melding over extern delen",
          "story": "Purview meldt dat iemand een vertrouwelijk bestand naar buiten wilde delen. Jij mag de details van deze melding bekijken. Een melding bewijst niet dat iemand iets fout wilde doen.",
          "question": "Waar begin je?",
          "topic": "monitor",
          "choices": [
            {
              "title": "Bekijk eerst wat er gebeurde en waarom",
              "sub": "Vraag alleen extra informatie als het nodig is",
              "tone": "ok",
              "result": {
                "title": "Gericht onderzoek",
                "text": "Je kijkt wat er echt gebeurde en volgt de afgesproken onderzoeksroute. Het kan ook een vergissing of een normale vraag zijn."
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
                "text": "Een melding geeft je geen extra rechten. Kijk alleen naar wat nodig is en vraag meer toegang via de afgesproken route."
              },
              "effect": "review",
              "key": "B"
            }
          ],
          "without": "Zonder deze melding mis je dit signaal. Andere informatie kan er zijn, maar is ook niet vanzelf bewijs.",
          "who": "security"
        },
        {
          "id": "security-simulatie",
          "time": "10:00",
          "app": "purview",
          "title": "Veel meldingen tijdens een test",
          "story": "Een nieuwe regel staat in testmodus. Jij beoordeelt de resultaten. De regel geeft al meldingen, maar houdt nog niets tegen.",
          "question": "Wat adviseer je?",
          "topic": "roadmap",
          "choices": [
            {
              "title": "Bekijk voorbeelden en stel een kleine vervolgtest voor",
              "sub": "Check wat het doet met normaal werk",
              "tone": "ok",
              "result": {
                "title": "Beslissen op basis van feiten",
                "text": "Je scheidt nuttige meldingen van valse alarmen. Een beheerder met de juiste rechten beslist daarna over aanpassingen."
              },
              "effect": "review",
              "key": "A"
            },
            {
              "title": "Meld dat alles nu wordt tegengehouden",
              "sub": "Er zijn toch veel meldingen",
              "tone": "warn",
              "result": {
                "title": "In testmodus wordt niets tegengehouden",
                "text": "Een test blokkeert niets. Vertel eerlijk dat het om een test gaat en check wat de regel moet doen voordat hij echt aangaat."
              },
              "effect": "review",
              "key": "B"
            }
          ],
          "without": "Zonder de testregel zijn er geen testmeldingen. Regels die al actief zijn, werken gewoon door.",
          "who": "security"
        },
        {
          "id": "security-rapport",
          "time": "11:45",
          "app": "outlook",
          "title": "Een rapport voor een externe adviseur",
          "story": "Een adviseur van buiten vraagt om je bevindingen. Het ruwe rapport bevat namen en heeft het label 'Vertrouwelijk'. Bij Noordhaven kun je die bijlage niet naar buiten mailen.",
          "question": "Wat stuur je?",
          "topic": "dlp",
          "choices": [
            {
              "title": "Laat een korte versie en de ontvanger goedkeuren",
              "sub": "Alleen de bevindingen die nodig zijn",
              "tone": "ok",
              "result": {
                "title": "Eerst passend maken, dan delen",
                "text": "Je volgt de afgesproken controle en verzendroute. Je haalt niet zomaar het label weg om de blokkade te omzeilen."
              },
              "effect": "review",
              "key": "A"
            },
            {
              "title": "Stuur het ruwe rapport naar de adviseur",
              "sub": "Hij helpt toch bij het onderzoek",
              "tone": "block",
              "result": {
                "title": "Deze mail wordt tegengehouden",
                "text": "Ook voor een adviseur geldt deze regel. Stuur een gecontroleerde, korte versie via de goedgekeurde weg."
              },
              "effect": "block",
              "key": "B"
            }
          ],
          "without": "Zonder deze regel gaat de mail misschien gewoon weg. Je moet dan zelf checken of het nodig is, wie het krijgt en hoe je het deelt.",
          "who": "security"
        },
        {
          "id": "security-bewijs",
          "time": "13:30",
          "app": "windows",
          "title": "Onderzoeksbestanden meenemen",
          "story": "Je wilt onderzoeksbestanden met een label meenemen naar een overleg. Op je werklaptop kun je deze bestanden niet naar een USB-stick kopiëren.",
          "question": "Hoe zorg je dat iedereen erbij kan?",
          "topic": "endpoint",
          "choices": [
            {
              "title": "Gebruik de goedgekeurde onderzoeksmap",
              "sub": "Vraag alleen de toegang aan die nodig is",
              "tone": "ok",
              "result": {
                "title": "Binnen de afgesproken omgeving",
                "text": "De bestanden blijven op de juiste plek. Check vooraf of alle deelnemers erbij kunnen."
              },
              "effect": "allow",
              "key": "A"
            },
            {
              "title": "Zet ze op je eigen USB-stick",
              "sub": "Je werkt zelf aan het onderzoek",
              "tone": "block",
              "result": {
                "title": "Ook voor jou lukt kopiëren niet",
                "text": "De regel geldt ook voor jouw account. Gebruik de onderzoeksmap: je functie geeft je geen uitzondering."
              },
              "effect": "block",
              "key": "B"
            }
          ],
          "without": "Zonder deze regel lukt kopiëren misschien wel. De afspraken over onderzoek en andere instellingen op je laptop gelden nog steeds.",
          "who": "security"
        },
        {
          "id": "security-terugkoppeling",
          "time": "15:15",
          "app": "teams",
          "title": "Leren van een uitzondering",
          "story": "In een overzicht zie je dat iemand na een waarschuwing toch doorging, met een reden. Dat mocht volgens de regel. Je wilt dat het team ervan leert.",
          "question": "Hoe bespreek je het?",
          "topic": "monitor",
          "choices": [
            {
              "title": "Check de context en deel een anonieme les",
              "sub": "Bespreek gedrag, geen personen",
              "tone": "ok",
              "result": {
                "title": "Leren zonder iemand aan te wijzen",
                "text": "Je bekijkt de reden via de afgesproken route en deelt alleen wat nodig is, zonder dat iemand herkenbaar is."
              },
              "effect": "review",
              "key": "A"
            },
            {
              "title": "Zet namen en de hele melding in het teamkanaal",
              "sub": "Dan weet iedereen wie het was",
              "tone": "warn",
              "result": {
                "title": "Een uitzondering is geen misbruik",
                "text": "Deel de melding niet breed. Check de context en maak er een anonieme les van voor het team."
              },
              "effect": "review",
              "key": "B"
            }
          ],
          "without": "Zonder deze waarschuwing wordt de uitzondering niet vastgelegd. Dat zegt op zich niets over wat iemand van plan was.",
          "who": "security"
        }
      ],
      "version": 1
    },
    {
      "id": "care",
      "title": "Verpleegkundige / verzorgende",
      "person": {
        "name": "Lotte",
        "role": "Verpleegkundige",
        "portrait": "personCare"
      },
      "intro": "Je plant zorg en draagt werk over aan collega's. Alle voorbeelden zijn verzonnen en spelen zich af in Microsoft 365, niet in het patiëntendossier. Purview neemt geen zorgbeslissingen.",
      "moments": [
        {
          "id": "care-overdracht",
          "time": "07:00",
          "app": "word",
          "title": "Een overdracht in eigen woorden",
          "story": "Je schrijft een overdracht voor de volgende dienst, in gewone Nederlandse zinnen. De afspraak is: label 'Vertrouwelijk'. Purview herkent medische taal vooral in het Engels. Op herkenning van Nederlandse zorgtekst kun je dus niet rekenen.",
          "question": "Hoe bescherm je de overdracht?",
          "topic": "labels",
          "choices": [
            {
              "title": "Zet het label er zelf op en bewaar op de zorgplek",
              "sub": "Check wie de overdracht krijgt",
              "tone": "ok",
              "result": {
                "title": "Je wacht niet op de computer",
                "text": "De overdracht heeft bewust het juiste label. Check ook wie erbij kan: als zorgverlener mag je niet vanzelf alles inzien."
              },
              "effect": "label",
              "key": "A"
            },
            {
              "title": "Wacht tot Purview het zelf herkent",
              "sub": "Er staan toch duidelijk medische woorden in",
              "tone": "warn",
              "result": {
                "title": "Geen melding, toch gevoelig",
                "text": "Purview herkent Nederlandse zorgtekst niet betrouwbaar. Zet het afgesproken label er zelf op."
              },
              "effect": "allow",
              "key": "B"
            }
          ],
          "without": "Zonder labelafspraak is niet duidelijk hoe gevoelig de overdracht is. Zorgvuldig werken en beperkte toegang blijven nodig.",
          "who": "care"
        },
        {
          "id": "care-familie",
          "time": "09:00",
          "app": "outlook",
          "title": "Een mail aan familie met de verkeerde bijlage",
          "story": "Je bevestigt een praktische afspraak met familie. Per ongeluk voeg je een lijst met burgerservicenummers (BSN's) toe. Purview herkent die nummers en houdt de mail naar het externe adres tegen.",
          "question": "Wat doe je met de mail?",
          "topic": "dlp",
          "choices": [
            {
              "title": "Haal de lijst weg en check de mail",
              "sub": "Kijk ook of de ontvanger klopt",
              "tone": "ok",
              "result": {
                "title": "Alleen wat familie nodig heeft",
                "text": "Je deelt alleen wat nodig is, via de afgesproken weg. Purview beslist niet wat familie mag weten."
              },
              "effect": "review",
              "key": "A"
            },
            {
              "title": "Verstuur de mail met de hele lijst",
              "sub": "Ze zoeken zelf de juiste regel wel",
              "tone": "block",
              "result": {
                "title": "De mail wordt tegengehouden",
                "text": "De BSN's in de lijst zorgen voor de blokkade. Haal de bijlage weg. Pas de nummers niet aan om de controle te omzeilen."
              },
              "effect": "block",
              "key": "B"
            }
          ],
          "without": "Zonder deze regel gaat de verkeerde bijlage misschien gewoon mee. Bijlagen en ontvangers checken blijft nodig.",
          "who": "care"
        },
        {
          "id": "care-dienstwissel",
          "time": "11:00",
          "app": "teams",
          "title": "Een dienst ruilen",
          "story": "In het grote roosterkanaal vraag je of iemand je dienst wil overnemen. In je bericht noem je ook een patiënt en hoe het met die patiënt gaat. Purview herkent zo'n Nederlandse zorgtekst niet altijd.",
          "question": "Wat zet je in het kanaal?",
          "topic": "data",
          "choices": [
            {
              "title": "Noem alleen de dienst en wat er nodig is",
              "sub": "Patiëntinformatie blijft op de zorgplek",
              "tone": "ok",
              "result": {
                "title": "Ruilen zonder zorggegevens",
                "text": "Het kanaal krijgt alleen wat nodig is voor de ruil. Een overdracht over de patiënt gaat apart, via de juiste weg."
              },
              "effect": "allow",
              "key": "A"
            },
            {
              "title": "Zet de hele uitleg in het roosterkanaal",
              "sub": "Dan snapt iedereen het",
              "tone": "warn",
              "result": {
                "title": "Het bericht verschijnt, maar hoort daar niet",
                "text": "Een groot roosterkanaal is geen plek voor patiëntinformatie. Houd het bericht kort en gebruik de afgesproken plek voor de overdracht."
              },
              "effect": "allow",
              "key": "B"
            }
          ],
          "without": "Ook zonder regels blijft het verschil belangrijk tussen een dienst ruilen en zorg overdragen. Geen melding betekent niet dat het mag.",
          "who": "care"
        },
        {
          "id": "care-klembord",
          "time": "13:00",
          "app": "windows",
          "title": "Even kopiëren naar een privéchat",
          "story": "Je wilt een collega snel iets laten zien via een privé-chatapp. Op je werklaptop kun je uit dit beschermde zorgbestand niets naar het klembord kopiëren.",
          "question": "Hoe bereik je je collega?",
          "topic": "endpoint",
          "choices": [
            {
              "title": "Gebruik het goedgekeurde zorgkanaal",
              "sub": "Check of je collega toegang heeft",
              "tone": "ok",
              "result": {
                "title": "Via de afgesproken weg",
                "text": "Je deelt alleen wat nodig is, in het kanaal dat daarvoor bedoeld is. Je collega moet wel echt toegang hebben."
              },
              "effect": "allow",
              "key": "A"
            },
            {
              "title": "Kopieer het stukje voor de privéchat",
              "sub": "Het gaat maar om een paar regels",
              "tone": "block",
              "result": {
                "title": "Kopiëren lukt hier niet",
                "text": "De bescherming op je laptop grijpt in. Gebruik de goedgekeurde weg. Maak ook geen foto en typ het niet over."
              },
              "effect": "block",
              "key": "B"
            }
          ],
          "without": "Zonder deze regel lukt kopiëren misschien wel. Maar een privé-chatapp is nog steeds geen plek voor zorginformatie.",
          "who": "care"
        },
        {
          "id": "care-copilot",
          "time": "15:00",
          "app": "copilot",
          "title": "Copilot helpt met een overdracht",
          "story": "Je laat Copilot een concept maken met praktische aandachtspunten, op basis van notities in Microsoft 365. Copilot heeft geen toegang tot het patiëntendossier. En Copilot controleert niet of de medische inhoud klopt.",
          "question": "Wat doe je met het concept?",
          "topic": "copilot",
          "choices": [
            {
              "title": "Check elke afspraak in de originele notitie",
              "sub": "Laat de zorginhoud beoordelen door wie daarover gaat",
              "tone": "ok",
              "result": {
                "title": "Een gecontroleerd concept",
                "text": "Je verbetert fouten, laat onnodige persoonsgegevens weg en gebruikt de afgesproken overdrachtsroute. Copilot en Purview bepalen niet wat voorrang krijgt in de zorg."
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
                "text": "Niets houdt deze mail tegen. Check de bronnen en laat de verantwoordelijke zorgverlener de overdracht beoordelen."
              },
              "effect": "allow",
              "key": "B"
            }
          ],
          "without": "Ook zonder extra regels moet je de bronnen checken en zelf beoordelen. Dat Copilot de notities kan lezen, betekent niet dat de samenvatting klopt.",
          "who": "care"
        }
      ],
      "version": 1
    },
    {
      "id": "specialist",
      "title": "Medisch specialist / arts",
      "person": {
        "name": "Ravi",
        "role": "Medisch specialist",
        "portrait": "personSpecialist"
      },
      "intro": "Je overlegt met collega's, geeft onderwijs en bereidt onderzoek voor. Alle documenten zijn verzonnen en staan in Microsoft 365, niet in het patiëntendossier. Afspraken over toegang en over medische en juridische vragen gelden apart.",
      "moments": [
        {
          "id": "specialist-onderwijs",
          "time": "08:00",
          "app": "word",
          "title": "Een bijzondere casus voor onderwijs",
          "story": "Je maakt een casus voor onderwijs. De naam van de patiënt staat er niet in, maar wel een precieze datum en een zeldzame combinatie van klachten. De afspraak is: het blijft 'Vertrouwelijk' totdat iemand het heeft beoordeeld.",
          "question": "Hoe bereid je de casus voor?",
          "topic": "data",
          "choices": [
            {
              "title": "Haal herkenbare details weg en laat het beoordelen",
              "sub": "Houd het label 'Vertrouwelijk' voorlopig aan",
              "tone": "ok",
              "result": {
                "title": "Meer dan alleen de naam weghalen",
                "text": "Ook details waaraan je iemand indirect herkent, worden gecheckt. De beoordeling bepaalt of de casus geschikt is voor de groep."
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
                "text": "Een ander label maakt de inhoud niet anoniem. Zet het label terug en laat ook de details beoordelen waaraan iemand herkenbaar is."
              },
              "effect": "allow",
              "key": "B"
            }
          ],
          "without": "Zonder deze afspraak lijkt een onderwijsdocument misschien te snel deelbaar. Of iemand herkenbaar is, blijft een menselijke afweging.",
          "who": "specialist"
        },
        {
          "id": "specialist-consult",
          "time": "10:00",
          "app": "outlook",
          "title": "Overleg met een specialist van buiten",
          "story": "Voor dit overleg is één werkadres van een externe specialist vooraf goedgekeurd. Bij Noordhaven kun je de casus met label niet naar buiten mailen, behalve naar dat adres. Het privémailadres van dezelfde specialist valt daar niet onder.",
          "question": "Hoe stuur je je vraag?",
          "topic": "dlp",
          "choices": [
            {
              "title": "Gebruik het goedgekeurde werkadres",
              "sub": "Deel alleen wat nodig is voor het overleg",
              "tone": "ok",
              "result": {
                "title": "Overleg binnen de afspraak",
                "text": "Deze mail past binnen de uitzondering. Je titel als arts geeft geen toegang: het adres, de inhoud en de afspraak zijn gecheckt."
              },
              "effect": "allow",
              "key": "A"
            },
            {
              "title": "Gebruik het privéadres, dat gaat sneller",
              "sub": "Het is toch dezelfde persoon",
              "tone": "block",
              "result": {
                "title": "Dit adres valt buiten de uitzondering",
                "text": "De mail wordt tegengehouden. Gebruik het goedgekeurde werkadres. Dat je de persoon kent, vervangt de afspraak niet."
              },
              "effect": "block",
              "key": "B"
            }
          ],
          "without": "Zonder deze regel komt de mail misschien ook op het privéadres aan. De afspraak over het overleg en het checken van de ontvanger blijven gelden.",
          "who": "specialist"
        },
        {
          "id": "specialist-onderzoek",
          "time": "12:00",
          "app": "sharepoint",
          "title": "Een tabel voor een onderzoekspartner",
          "story": "Een onderzoekspartner vraagt om een tabel met gegevens. In de tabel staan burgerservicenummers (BSN's). Purview herkent die nummers en houdt delen met mensen van buiten tegen. De tabel staat los van het patiëntendossier.",
          "question": "Wat doe je met het verzoek?",
          "topic": "autolabel",
          "choices": [
            {
              "title": "Laat een geschikte onderzoeksversie beoordelen",
              "sub": "Check wat nodig is en of iemand herkenbaar is",
              "tone": "ok",
              "result": {
                "title": "Niet automatisch vrijgegeven",
                "text": "De verantwoordelijke mensen beoordelen de onderzoeksversie. Alleen de BSN's weghalen maakt de tabel nog niet anoniem, en geeft ook geen toestemming om te delen."
              },
              "effect": "review",
              "key": "A"
            },
            {
              "title": "Deel de tabel via een link voor buiten",
              "sub": "De partner doet toch ook onderzoek",
              "tone": "block",
              "result": {
                "title": "Delen met buiten lukt hier niet",
                "text": "Purview reageert op de BSN's in de tabel. Gebruik een beoordeelde onderzoeksversie. Purview geeft geen juridische goedkeuring voor onderzoek."
              },
              "effect": "block",
              "key": "B"
            }
          ],
          "without": "Zonder deze regel bepalen alleen de deelrechten wie erbij kan. Medische tekst in het Nederlands wordt daarmee nog steeds niet goed herkend.",
          "who": "specialist"
        },
        {
          "id": "specialist-ai-upload",
          "time": "14:00",
          "app": "windows",
          "title": "Een brief laten herschrijven door AI",
          "story": "Je wilt een vertrouwelijke conceptbrief laten herschrijven door een openbare AI-website. Op je werklaptop houdt Purview uploads naar deze site tegen, in de browsers die Purview ondersteunt.",
          "question": "Hoe verbeter je de tekst?",
          "topic": "endpoint",
          "choices": [
            {
              "title": "Check welke schrijfhulp is goedgekeurd",
              "sub": "Gebruik alleen de gegevens die nodig zijn",
              "tone": "ok",
              "result": {
                "title": "Eerst de juiste omgeving kiezen",
                "text": "Je gebruikt alleen een dienst die voor deze inhoud is toegestaan en controleert het resultaat. Een hulpmiddel neemt jouw medische verantwoordelijkheid niet over."
              },
              "effect": "review",
              "key": "A"
            },
            {
              "title": "Upload de brief naar de AI-website",
              "sub": "Alleen de formulering moet anders",
              "tone": "block",
              "result": {
                "title": "Uploaden lukt hier niet",
                "text": "De bescherming op je laptop houdt deze upload tegen. Gebruik de goedgekeurde omgeving. Let op: dit werkt niet vanzelf op elk apparaat en bij elke AI-dienst."
              },
              "effect": "block",
              "key": "B"
            }
          ],
          "without": "Zonder deze regel kan de AI-website de brief misschien wel ontvangen. Herschrijven maakt patiëntinformatie niet minder gevoelig.",
          "who": "specialist"
        },
        {
          "id": "specialist-copilot",
          "time": "16:00",
          "app": "copilot",
          "title": "Copilot schrijft mee met richtlijnen",
          "story": "Copilot helpt je een toelichting te schrijven op basis van richtlijnen die je zelf kunt openen. Copilot krijgt geen extra rechten. En niet elke versie van Copilot is op dezelfde manier beschermd.",
          "question": "Hoe maak je de toelichting af?",
          "topic": "copilot",
          "choices": [
            {
              "title": "Check bron, versie en of het hier past",
              "sub": "Beoordeel medische inhoud zelf",
              "tone": "ok",
              "result": {
                "title": "Hulp die je controleert",
                "text": "Je kijkt in de echte richtlijn en beoordeelt de tekst. Copilot helpt met schrijven. Purview stelt geen diagnose en kiest geen behandeling."
              },
              "effect": "review",
              "key": "A"
            },
            {
              "title": "Neem het antwoord over als definitief advies",
              "sub": "De bronnen zien er overtuigend uit",
              "tone": "warn",
              "result": {
                "title": "Een bronvermelding is geen medische check",
                "text": "Niets houdt dit tegen. Check de echte bronnen en laat de verantwoordelijke arts het advies beoordelen."
              },
              "effect": "allow",
              "key": "B"
            }
          ],
          "without": "Met of zonder extra regels: jij blijft verantwoordelijk voor of de inhoud actueel, juist en medisch bruikbaar is.",
          "who": "specialist"
        }
      ],
      "version": 1
    }
  ],
  "library": {
    "sectors": [
      {
        "id": "generic",
        "name": "Algemeen",
        "preset": "generic"
      },
      {
        "id": "zorg",
        "name": "Zorg",
        "preset": "zorg"
      },
      {
        "id": "overheid",
        "name": "Overheid",
        "preset": "overheid"
      },
      {
        "id": "financieel",
        "name": "Financieel",
        "preset": "generic"
      }
    ]
  }
};
CATALOG.experience.moments = CATALOG.experience.roles.flatMap((r) => r.moments);
