# Architectuur

`src/build.py` bundelt CSS-bestanden en JavaScript-modules in vaste volgorde. De enige scriptinhoud krijgt een SHA-256 CSP-hash. De webvariant voegt noindex, robots.txt en een frameguard toe; de offlinevariant blijft een zelfstandig HTML-bestand. Er is geen backend of externe runtimeafhankelijkheid.

Dataflow Workshop: catalogi en presets → model → Store → mapping/generator/validatie → views en exports. `Actions` en `Hooks` verwerken acties en bindings; geen inline event handlers. `App.go()` verzorgt de bestaande Workshop-routes en de drie Hub-routes: `hub`, `experience` en `academy`. De Hub biedt exact drie primaire ingangen: de Experience, Academy en de ongewijzigde Workshop Designer.

## Experience Hub

De Hub-routes (`JOURNEY_ROUTES` in `app.js`) draaien in sitemodus: `#app` krijgt de klasse `journey`, zijnavigatie en facilitatorpaneel zijn verborgen. De bovenbalk heeft twee rijen. De eerste rij (`#site-nav`, `#site-actions`) is op elke pagina gelijk: `siteNav()` toont Home, Ervaar Purview, Leer Purview kennen en Ontwerp uw oplossing (`SITE_NAV`), met `aria-current` op het actieve onderdeel; Ontwerp is actief op alle Designer-pagina's. De tweede rij (`#tb-tools`) met klantnaam, stappenpager en Designer-acties verschijnt alleen buiten de sitemodus. Subpagina's lopen via `UI.sub[route]`; `Site.go(route, sub)` rendert, scrolt naar boven en zet de focus op de `h1`.

| Onderdeel | Data | View | Werkgeheugen |
|---|---|---|---|
| Hub | `data/catalog-hub.js` (pijlers, apps, aanpak, FAQ) | `js/views/hub.js` (ook de gedeelde `Site`-helpers) | `HubUI` |
| Ervaar Purview | `data/catalog-experience.js` (6 rollen, 30 situaties, bibliotheeksectoren) | `js/views/experience.js` (`intro`, `role/id`, `day/rol/situatie`, `finale/rol`, `library`) | `XP` |
| Leer Purview kennen | `data/catalog-academy.js` (3 doelpaden, 9 lessen, oefeningen, begrippenlijst) | `js/views/academy.js` (`home`, `lessons`, `path/id`, `lesson/les/stap[/pad]`, `glossary`) | `AC` |

De vormgeving staat in `css/hub.css` (klassen `s-*` voor gedeelde sitecomponenten, `h-*`, `x-*` en `a-*` per onderdeel) en gebruikt de bestaande thema-variabelen. Mock-ups van Office, Outlook, SharePoint, Teams, Copilot en Endpoint komen uit `previews.js`.

De zes fictieve persona-portretten zijn originele SVG-illustraties in `data/persona-assets.js`, toegevoegd aan `BRAND_ASSETS` als data-URI. De gedeelde avatar-renderer gebruikt dezelfde afbeelding bij rolkeuze, roloverzicht en situaties. Er zijn geen externe beeldverzoeken; namen en rollen blijven als toegankelijke tekst naast de decoratieve portretten staan.

Catalogustekst gaat via `esc()` of `Site.rich()` (alleen `**vet**`). Elke actie valideert haar invoer tegen de catalogus. Microsoft Learn-links zijn beperkt tot `https://learn.microsoft.com/` en openen alleen na een klik.

Ervaar Purview, de Academy en de ontwerpworkshop delen één subbalk onder de hoofdnavigatie (`#tb-tabs`, `#topbar-ctx`, `#topbar-steps`), gevuld via `subbar()` in de view (tabs, context en een pager). Home heeft geen subbalk. De Academy-tabs zijn Leerpaden, Alle lessen en Begrippenlijst; Ervaar heeft Werkdagen en Scenario's. Een leerpad is *Nog niet gestart*, *Bezig* zodra een les is geopend of afgerond, en *Afgerond* als alle kennischecks van het pad zijn gedaan (`ACV.pathInfo`). Een les toont de stappen en de lessen van het pad in een vaste zijkolom; na de laatste stap gaat `ACV.after()` naar de volgende les of terug naar het pad.

De werkdag rekent met vaste uitkomsten per keuze. De scenariobibliotheek bouwt per sector een eigen voorbeeldstate met `buildPresetState()` en gebruikt `ScenarioEngine`. De scenario's zijn een begeleide flow in drie stappen (`XLib`): kies een situatie (kaarten met uitkomst Gaat door, Melding of Tegengehouden), bekijk het scherm vóór en na (mock-up met schakelaar) en begrijp waarom (labelkeuze, uitleg en de stappen achter de uitkomst). `XP.lib.open` en `XP.lib.scene` zijn alleen UI-state. Lessen tonen punten in de vorm *Begrip: uitleg* als kernkaarten (`ACW.keys`). In zichtbare tekst heet de Academy altijd *Leer Purview kennen* (kruimelpad, knoppen, lesinhoud); `academy` blijft alleen de interne route- en codenaam. De detector voor informatietypen in de Academy (`AC_SIT`) is een vereenvoudigde, illustratieve nabootsing van de SIT-definities voor BSN, IBAN en creditcardnummer: patroon, checksum en trefwoord binnen 300 tekens; bekende testkaartnummers worden genegeerd. Het is geen Purview-engine.

`HubRouter` valideert en normaliseert alle paginalinks. Views leveren `defaultSub` en `normalizeSub`; oudere modulelinks blijven geldig. `App.go()` schrijft geschiedenis bij navigatie, niet bij renderen of typen. Prefs-versie 4 bewaart de laatste pagina en afzonderlijke terugkeerlinks naar leren en ontwerpen. Browser-terug/vooruit herstelt de volledige les-/rolcontext.

`js/learning.js` bewaart uitsluitend gevalideerde standaardkeuzes in `STORAGE_KEY + "-learning"` (rootversie 1, maximaal 128 KiB). Elke namespace registreert normalisatie, versie en een resetcallback. De teruggegeven werkstate staat los van de opgeslagen snapshot: detectorinvoer mag ook bij opslaan vanuit een ander leeronderdeel nooit meeliften. Vrije tekst en zoekopdrachten blijven vluchtig. De Workshop-Store, undo/redo, klantopslag en exports blijven ongewijzigd.

Verhoog de Academy-namespaceversie wanneer bestaande vragen, antwoorden of hoofdstukvolgorde veranderen. Verhoog bij rollen de expliciete `version` wanneer antwoordbetekenissen veranderen. Onbekende root-/namespaceversies en corrupte opslag worden niet automatisch overschreven; gewijzigde rolversies krijgen een melding en hun oude antwoorden worden niet overgenomen. Identifiers en antwoordwaarden worden tegen de catalogus begrensd. Opslagfouten tonen een zichtbare melding en een herstelactie.

Wissen kan per les/rol of voor alle leerkeuzes. Nieuw ontwerp behoudt leren; de volledige gegevenswisser verwijdert ook leeropslag. Technische uitklappers zijn geen onderdeel van de Academy-lezer; productgrenzen blijven in gewone taal aanwezig.

## Gegevenscontract

Schema 2 behoudt schema-1-data via `MIGRATIONS[1]`. `meta` bevat klantcontext, doelen, afbakening, aannames en interne notities. `workshop` bevat beschikbare minuten en maximaal 32 agendapunten. Besluiten bewaren status, eigenaar, deadline, onderbouwing, aannames, oplossing en optionele route/configuratie/regel-ID.

Normalisatie begrenst bekende velden en collecties, herstelt identifiers/verwijzingen en weigert te diepe of complexe invoer. Onbekende, veilige velden blijven waar mogelijk behouden; dat is geen garantie van compatibiliteit met toekomstige versies.

## State en bewaren

`Store.update()` voert mutatie en serialisatie uit voordat de wijziging aan de historie wordt toegevoegd. Bij fouten wordt de vorige snapshot hersteld. Undo/redo gebruikt maximaal 80 snapshots met coalescing voor normale invoer. UI-selecties, timer en SIT-testtekst staan buiten de ontwerpstate.

Hub-, Experience- en Academy-routes gebruiken de bestaande app-shell en navigatie, maar tonen geen Workshop-opslagstatus of facilitatorpaneel. De Workshop-routes behouden hun bestaande navigatie, Store en persistentiemechanismen.

Autosave is gedebounced, met flush bij pagehide/visibilitychange. `savedAt` verandert pas na een geslaagde write. De vluchtige opslagstatus onderscheidt gewijzigd, bewaren, bewaard, mislukt, onbeschikbaar en uitgeschakeld. Een corrupte of toekomstige lokale kopie blokkeert automatisch overschrijven totdat de gebruiker bewust verdergaat.

Een lopende agendatimer houdt zijn gekozen doeltijd vast bij navigatie en pauze. De timer zelf is geen persistent aanwezigheids- of tijdregistratiesysteem.

## Exports

JSON gebruikt `stripPrivate()` en bevat de volledige werkstand inclusief interne notities. Klantuitvoer gebruikt `customerState()`; alleen de expliciet bevestigde interne documentvariant neemt interne notities mee. XLSX gebruikt bestaande ZIP/XML-generatie, filters, freeze panes en formula-afweer. Het document hergebruikt dezelfde werkbladen. PowerShell gebruikt bestaande quotinghelpers en wordt nooit door de app uitgevoerd.
