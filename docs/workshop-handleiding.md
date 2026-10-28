# Samen een Purview-ontwerp maken

Begin op **Jouw informatiebescherming**. Bij een nieuw, leeg ontwerp leidt het startscherm je in drie stappen: kies een vertrekpunt, vul klant en scope in, ga verder. Routekaart, workshopgegevens en agenda staan dan achter **Toon de hele route**. De drie kaarten openen dezelfde bestaande ontwerpstappen: **Maatregelen** voor labels en classificatie, **Beleid & DLP** voor regels en scenario's, **Adoptie** voor impact en afspraken. Je kunt altijd rechtstreeks navigeren; er is geen verplichte wizard.

Onder **Workshop voorbereiden** leg je organisatie, deelnemers, scope, doelen, uitsluitingen en aannames vast. Gebruik alleen verzonnen testinhoud. Een voorbeeldontwerp is een vertrekpunt, geen vastgesteld beleid; controleer de vervangingsmelding voordat je een ander voorbeeld kiest.

Onder **Agenda en tijd** kun je richtduren overnemen of eigen agendapunten toevoegen. Vul de werkelijk beschikbare tijd in. Start een agendapunt met zijn eigen timer; navigeren of pauzeren verandert die doeltijd niet.

Tijdens het ontwerpen:
- **Ontwerpbord**: de legenda toont de vijf niveaus (Geen, Bewust, Sturen, Beschermen, Streng); **Passend** schaalt het bord naar de schermbreedte (minimaal 50%).
- **Referentiearchitectuur**: alle onderdelen staan altijd open. Boven het model staan de rondleidingen als kaarten (icoon, aantal stappen, waarom); **Start rondleiding** begint bij ‘Classificatie of label?’. De legenda staat rechts van het model (op smallere schermen erboven) en is in te klappen. Relatielijnen zijn gebundeld per goot en soort relatie; aanwijzen of selecteren markeert alleen de lijnen van dat onderdeel, en **Relaties** zet ze uit. Een **rondleiding** toont stap voor stap genummerde onderdelen in de kleur van hun fase, met de verbinding vanuit de vorige stap, voortgang, Vorige/Volgende (ook met pijltjes) en een samenvatting met **Volgende rondleiding**; Esc sluit.
- **Weergavegrootte**: met − / + in de topbalk (of de schuif onder Instellingen) schaal je de hele app van 80% tot 150%; de keuze blijft bewaard in deze browser.
- **Informatietypen**: links staan alle labels onder elkaar, rechts de bibliotheek; beide panelen scrollen zelf. Sleep een type van rechts naar een label links; de labels blijven daarbij even groot en de lijst scrolt mee als je bij de rand komt. Op een smal scherm staan de labels boven de bibliotheek.
- **Label-instellingen, Labelbeleid en Auto-labeling**: links staat de lijst met labels of policies (zoeken vanaf 9 items, inklapbaar); rechts het detail. Wijzig een naam in de lijst: klik op het potlood, druk F2 of dubbelklik; Enter bewaart, Esc annuleert, Ctrl+Z draait terug. Bij Label-instellingen wijzig je zo de weergavenaam en loopt **Zo ziet de medewerker het** live mee naast de instellingen.
- **DLP**: regels staan als compacte chips (informatietypen, scope, acties, meldingen, uitzonderingen); de volledige tekst staat in de tooltip. De maatwerkwizard heeft vier stappen (Basis, Locaties, Regels, Starten) die je direct kunt aanklikken; zelden gebruikte instellingen staan onder **Meer opties**. Onder **Zo ziet de medewerker het** wissel je tussen de gekozen locaties of actieniveaus.
- **Copilot – Extra regels**: elke kaart toont hoeveel regels er zijn of **Niet gebruikt**. Controleer bij een Preview-badge de status in de Purview-portal.
- **Auto-labeling**: volg 1 Simuleren → 2 Resultaten beoordelen met de data-eigenaar → 3 Aanzetten. **Direct aanzetten** kan pas als de policy een voorwaarde heeft.
- **Scenario's**: elke kanaalgroep staat standaard ingeklapt; de groepskop toont aantal en uitkomsten. Klap een groep open, kies een kanaal in het filter of gebruik **Alles uitklappen**. Bij Zorg en Overheid filter je ook op sectorscenario's; elk scenario toont na afspelen waarom Purview zo reageert.
- **Adoptie & impact**: de quiz heeft vragen per thema met uitleg bij elk antwoord; de oefencasus (LAB) volgt het eigen ontwerp. Onder **Meten** kies je KPI's voor het meetplan met nulmeting, doel, eigenaar en frequentie, met go/no-go per uitrolfase; het meetplan komt in het ontwerpdocument.

Leg besluiten direct vast in het facilitatorpaneel of bij **Besluiten & open punten**. Voeg een eigenaar toe en gebruik **Onderbouwing en koppelingen** voor het waarom, aannames, oplossing en bijbehorende configuratie/regel. **N.v.t.** blijft in het volledige overzicht staan maar telt niet als open punt.

**Interne facilitatornotities** blijven buiten normale klantdocumenten en Excel, maar zitten wel in de volledige JSON-back-up. Kies een interne documentvariant alleen bewust. Zijn er interne notities, dan vraagt de JSON-download eerst om bevestiging: JSON is een werkbestand, de klant krijgt het ontwerpdocument en Excel. Ook lokale browseropslag moet zorgvuldig worden behandeld.

De bewaarmelding beschrijft alleen deze browser. Bij **Bewaren mislukt**: laat het venster open, open **Bewaren en herstellen** en download JSON of probeer opnieuw. Controleer de download; de browser kan niet bevestigen dat je het bestand veilig hebt opgeborgen. Bij een nieuwere JSON-versie kun je eerst het origineel downloaden en pas daarna beperkt openen.

Rond af bij **Validatie & export**. Bespreek fouten, risico's en tenantvoorwaarden; neem open punten mee in een herkenbaar concept. Een score of de status Vastgesteld betekent niet dat Purview al werkt. PowerShell is geen dry-run: alleen DLP- en auto-labelingpolicies starten in simulatie; het script kan labels en labelbeleid aanmaken. Laat een beheerder het script reviewen en test labels, rechten en DLP in de tenant vóór handhaving.

**Afdruk/download gestart** betekent niet dat het bestand daadwerkelijk is opgeslagen. De browser kan een geannuleerde afdruk niet betrouwbaar onderscheiden van een voltooide afdruk. Controleer zelf het resultaat; bij een generatie- of afdrukfout wordt geen nieuwe exporttijd vastgelegd.

Lange namen in de navigatie lopen door over twee regels. Op smalle schermen opent het navigatiemenu over de inhoud. Escape sluit het. Via **Meer** blijven bewaren/herstel en facilitator/timer bereikbaar. Op gedeelde computers gebruik je na afloop **Lokale gegevens wissen**; controleer daarnaast bestanden in Downloads.
