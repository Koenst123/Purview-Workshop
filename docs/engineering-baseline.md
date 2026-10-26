# Engineering-baseline

Uitgangspunt: commit `03d5ccc`, schone werkboom op `main`. Deze professionaliseringsronde is eerst lokaal opgeleverd, toen nog zonder publicatietoestemming. De gebruiker heeft op 2026-10-26 daarna toestemming gegeven voor productiepublicatie.

## Architectuur

Offline vanilla-JS-app: `src/build.py` bundelt 41 JS-modules en negen CSS-bestanden in een HTML. Geen frontendframework, server of externe runtimebronnen. De webvariant krijgt noindex, robots.txt en een frameguard. De CSP staat alleen het ingebouwde script met de berekende SHA-256-hash toe.

Laadvolgorde: merkassets, catalogi/presets, kern/model/mapping/generator/validatie/scenario-engine/UI, views, exports, app-shell. Zestien hash-routes delen een Store met snapshots, undo/redo en localStorage-autosave. `UI` bevat niet-opgeslagen weergavestatus.

Functionaliteit: voorbereiding, architectuur, classificatie, informatietypen, ontwerpbord, labels, publicatiebeleid, auto-labeling, DLP, Endpoint, Copilot, tenantvoorwaarden, scenario's, adoptie, besluiten en exports.

## Gemeten voor wijzigingen

- Volledige lokale regressiesuite: **20/20 geslaagd**.
- Offlinebuild, webbuild, `tools/check.py` en rooktest: geslaagd.
- Rooktest: zestien routes met twee presets; frameguard actief.
- Webartefact: 1.460.138 UTF-8-bytes; scriptinhoud 1.279.192 bytes; CSS-inhoud 178.721 bytes.
- Headless Chromium op dezelfde machine/context, vijf navigaties naar de lokale webbuild; `performance.now()` afgelezen zodra Playwright inhoud in `#main` waarneemt: 734,3 / 113,6 / 91,9 / 95,1 / 98,5 ms. Mediaan 98,5 ms. Verkennend, inclusief observatiekosten; geen FCP/INP-benchmark.
- Synthetische Generiek-state, alle routes op 320/1440px: geen page-errors of HTTP(S)-requests. Op 320px inhoudsoverloop binnen `#main` op vijftien routes; op 1440px niet.
- Laatste productie-CI voor de uitgangscommit geslaagd, maar draaide alleen build en repository-/artefactcontrole, geen regressietests.

## Bevestigde aandachtspunten

1. Opslagfout verandert `savedAt` en laat de oude melding 'Opgeslagen' staan.
2. Nieuwere JSON-schema's worden actief voordat een waarschuwing verschijnt.
3. Alleen adoptieplanning wordt door de inhoudsdetectie als leeg beschouwd.
4. De lokale testrunner gebruikt uitvoerpatronen; meerdere scripts geven bij falende controles nog exitcode 0.
5. Browser-smoke kon bij ontbrekende Playwright succesvol overslaan.
6. Kleine schermen hebben inhoudsoverloop; de startpagina is daar te hoog en dicht.
7. Besluiten, agenda en bronverificatie missen gevraagde traceerbaarheid.
8. Documentteksten kunnen een ontworpen beleid verwarren met daadwerkelijke handhaving.

SIT-testtekst bleef in een gewone bewerking buiten state, undo, browseropslag en JSON. Dit is een bestaande invariant, geen nieuw gevonden lek.

## Grenzen van deze baseline

De twintig scripts zijn geen dekkingspercentage. Sommige exporttests genereerden vooral voorbeelden; echte asserts en exitcodes worden versterkt. Er is geen volledige WCAG-certificering, live tenantvalidatie of garantie op Office-rendering. Performance-eindmetingen moeten een eigen herhaalbare methode beschrijven en vergelijkbare voor/na-data gebruiken.

## Lokale vervolgmeting 2026-10-26

`tools\bench.py` is uitgevoerd op de bewaarde baseline-webbuild en de nieuwe webbuild, sequentieel in Chromium 156.0.8078.4. Per dataset zijn een eerste meting en vijf warme herhalingen vastgelegd. Hieronder staan warme medianen in milliseconden, **baseline → eindbuild**.

| Bewerking | Leeg | Generiek | 200 synthetische labels |
|---|---:|---:|---:|
| Normaliseren | 0,2 → 0,3 | 0,9 → 1,4 | 16,2 → 22,4 |
| Valideren | 0,1 → 0,0 | 1,7 → 1,7 | 44,9 → 26,0 |
| JSON-serialisatie | 0,0 → 0,0 | 0,4 → 0,4 | 7,7 → 8,5 |
| Wijzigen | 0,0 → 0,2 | 0,3 → 0,5 | 8,1 → 13,6 |
| Navigeren | 6,6 → 6,6 | 16,8 → 10,7 | 279,6 → 106,6 |
| XLSX maken | 1,8 → 2,0 | 7,9 → 8,8 | 141,0 → 102,2 |
| Document maken | 1,1 → 1,7 | 12,2 → 12,9 | 331,1 → 294,5 |

De nieuwe webbuild is 1.477.776 UTF-8-bytes tegenover 1.460.138 bytes voor de baseline (+1,2%). De historie bleef in alle datasets begrensd op 80 snapshots na honderd wijzigingen. Nulwaarden zijn afronding binnen de meetresolutie, niet kosteloze bewerkingen.

Normalisatie en wijzigen kosten meer door invoerinspectie en betrouwbare serialisatie. De grote synthetische state blijft een aandachtspunt voor interactiviteit. Deze lokale steekproef is gevoelig voor machinebelasting; zij rechtvaardigt geen algemene snelheidsclaim, Web Vitals-score of extra caching die betrouwbaarheid zou aantasten. De ruwe metingen, inclusief eerste metingen en spreiding, blijven buiten de repository.

## Afbakening van de eindcontrole

De visuele controle omvat start, gevulde lange besluiten en geopende onderbouwing in licht/donker, 900px en 320px, plus beamer met gesloten facilitatorpaneel. De automatische reflowmatrix omvat zestien routes, acht breedtes en twee thema's. Dit is geen volledige contrast-, touch-, screenreader- of WCAG-audit.

Tien concrete validatieregels hebben individueel geregistreerde Microsoft Learn-verificatie; de overige regels zijn herkenbaar niet afzonderlijk geverifieerd. PV-058 waarschuwt nu dat DLP-encryptie geen garantie op externe toegang geeft en bestaande encryptie op bijlagen blijft gelden. Een volledige herverificatie van catalogi, scenario's en alle cmdletparameters, een formele security-audit en acceptatie in Office/Purview zijn niet uitgevoerd.

Ontbrekende app (runner), ontbrekende Playwright (`python -S tools\smoke.py`) en een gesimuleerde falende test-subprocess geven aantoonbaar een niet-nul exitstatus. De scenario-afspeeltest gebruikt een bestuurbare Playwright-klok: op een belaste machine kon de versnelde timer anders al stoppen voordat de pauzeklik plaatsvond. De pauzecontrole is behouden en controleert nu ook dat de fase stilstaat.

## Definitieve lokale resultaten

- `tests\run-all.ps1`: **22/22 geslaagd**, exitcode 0; geen suites overgeslagen. De voorafgaande run gaf 21/22 door de timinggevoelige pauzecontrole; na herstel is de volledige reeks opnieuw uitgevoerd.
- Offline- en webbuild, repository-/CSP-controle, gebundelde JavaScript-syntax en Python-syntax: geslaagd.
- Webrooktest: zestien routes met twee presets zonder fouten; frameguard actief.
- Werkelijke XLSX-/documentexports, PowerShell AST-/injectiecontroles, opslag/import/privacy en 256 responsive route/themacombinaties: geslaagd in de volledige suite.
- Offline deliverable opnieuw gebouwd. Testbestanden, screenshots en logs blijven lokaal buiten Git.
- Bij de lokale oplevering niet uitgevoerd: commit, push, publicatie, livecontrole en een echte GitHub Actions-run. De daarna toegestane publicatie wordt afzonderlijk gecontroleerd. Bovenstaande audit- en tenantbeperkingen blijven gelden.

## Aanvullende productiecontrole

De eerste GitHub Actions-run blokkeerde de deployment: de bestaande UID-generator leverde één dubbele ID bij 200.000 aanroepen. De teller liep na 1.296 waarden terug naar nul. Met een vaste klok en randomwaarde is dit deterministisch gereproduceerd: 3.000 aanroepen leverden slechts 1.296 unieke IDs.

De teller loopt nu door en krijgt een vaste breedte, zodat herhaalde tijd/randomwaarden binnen dezelfde sessie geen botsing veroorzaken. Bestaande IDs blijven geldig. De bestaande stresstest blijft behouden en bevat daarnaast de deterministische regressie. `robust`, `t_core` en `t_experience` zijn lokaal geslaagd na deze correctie; productiepublicatie vereist opnieuw de volledige CI-reeks.
