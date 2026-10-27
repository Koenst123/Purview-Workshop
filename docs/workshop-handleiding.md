# Samen een Purview-ontwerp maken

Begin op **Jouw informatiebescherming**. De drie kaarten openen dezelfde bestaande ontwerpstappen: **Maatregelen** voor labels en classificatie, **Beleid & DLP** voor regels en scenario's, **Adoptie** voor impact en afspraken. Je kunt altijd rechtstreeks navigeren; er is geen verplichte wizard.

Onder **Workshop voorbereiden** leg je organisatie, deelnemers, scope, doelen, uitsluitingen en aannames vast. Gebruik alleen verzonnen testinhoud. Een voorbeeldontwerp is een vertrekpunt, geen vastgesteld beleid; controleer de vervangingsmelding voordat je een ander voorbeeld kiest.

Onder **Agenda en tijd** kun je richtduren overnemen of eigen agendapunten toevoegen. Vul de werkelijk beschikbare tijd in. Start een agendapunt met zijn eigen timer; navigeren of pauzeren verandert die doeltijd niet.

Tijdens het ontwerpen:
- **Ontwerpbord**: de legenda toont de vijf niveaus (Geen, Bewust, Sturen, Beschermen, Streng); **Passend** schaalt het bord naar de schermbreedte (minimaal 50%).
- **Referentiearchitectuur**: per laag staan eerst de kernonderdelen, met **+N meer** of **Alle onderdelen** voor de rest. Een rondleiding, laag- of licentiefilter toont automatisch alles. Lijnen tonen de relaties tussen zichtbare onderdelen (stijl per soort relatie, zie **Legenda**); aanwijzen of selecteren markeert alleen de lijnen van dat onderdeel, en **Relaties** zet ze uit.
- **DLP**: regels staan als compacte chips (informatietypen, scope, acties, meldingen, uitzonderingen); de volledige tekst staat in de tooltip. De maatwerkwizard heeft vier stappen (Basis, Locaties, Regels, Starten) die je direct kunt aanklikken; zelden gebruikte instellingen staan onder **Meer opties**.
- **Copilot – Extra regels**: elke kaart toont hoeveel regels er zijn of **Niet gebruikt**. Controleer bij een Preview-badge de status in de Purview-portal.
- **Auto-labeling**: volg 1 Simuleren → 2 Resultaten beoordelen met de data-eigenaar → 3 Aanzetten. **Direct aanzetten** kan pas als de policy een voorwaarde heeft.
- **Scenario's**: het kanaalfilter blijft zichtbaar tijdens scrollen.

Leg besluiten direct vast in het facilitatorpaneel of bij **Besluiten & open punten**. Voeg een eigenaar toe en gebruik **Onderbouwing en koppelingen** voor het waarom, aannames, oplossing en bijbehorende configuratie/regel. **N.v.t.** blijft in het volledige overzicht staan maar telt niet als open punt.

**Interne facilitatornotities** blijven buiten normale klantdocumenten en Excel, maar zitten wel in de volledige JSON-back-up. Kies een interne documentvariant alleen bewust. Zijn er interne notities, dan vraagt de JSON-download eerst om bevestiging: JSON is een werkbestand, de klant krijgt het ontwerpdocument en Excel. Ook lokale browseropslag moet zorgvuldig worden behandeld.

De bewaarmelding beschrijft alleen deze browser. Bij **Bewaren mislukt**: laat het venster open, open **Bewaren en herstellen** en download JSON of probeer opnieuw. Controleer de download; de browser kan niet bevestigen dat je het bestand veilig hebt opgeborgen. Bij een nieuwere JSON-versie kun je eerst het origineel downloaden en pas daarna beperkt openen.

Rond af bij **Validatie & export**. Bespreek fouten, risico's en tenantvoorwaarden; neem open punten mee in een herkenbaar concept. Een score of de status Vastgesteld betekent niet dat Purview al werkt. PowerShell is geen dry-run: alleen DLP- en auto-labelingpolicies starten in simulatie; het script kan labels en labelbeleid aanmaken. Laat een beheerder het script reviewen en test labels, rechten en DLP in de tenant vóór handhaving.

**Afdruk/download gestart** betekent niet dat het bestand daadwerkelijk is opgeslagen. De browser kan een geannuleerde afdruk niet betrouwbaar onderscheiden van een voltooide afdruk. Controleer zelf het resultaat; bij een generatie- of afdrukfout wordt geen nieuwe exporttijd vastgelegd.

Lange namen in de navigatie lopen door over twee regels. Op smalle schermen opent het navigatiemenu over de inhoud. Escape sluit het. Via **Meer** blijven bewaren/herstel en facilitator/timer bereikbaar. Op gedeelde computers gebruik je na afloop **Lokale gegevens wissen**; controleer daarnaast bestanden in Downloads.
