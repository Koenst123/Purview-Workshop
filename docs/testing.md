# Bouwen en testen

Gebruik Python 3.10+, Node en PowerShell 7. Installeer uitsluitend ontwikkelafhankelijkheden:

```powershell
python -m pip install -r tools\requirements-test.txt
python -m playwright install chromium
python tools\test.py
```

`tests\run-all.ps1` roept dezelfde runner aan. De runner bouwt standaard een offline app in een unieke tijdelijke map, voert de expliciete `CASES` sequentieel uit, bewaart logs buiten de repository en faalt op exitcodes of een timeout. Voeg nieuwe scripts toe aan `CASES`; een los bestand is nog geen verplichte testcase.

Gericht uitvoeren:

```powershell
python tools\test.py --only t_hub t_scenarios t_academy t_hub_roles t_learning
python src\build.py --web "$env:TEMP\pyd-web-check"
python tools\check.py "$env:TEMP\pyd-web-check"
python tools\syntax.py "$env:TEMP\pyd-web-check\index.html"
python tools\smoke.py "$env:TEMP\pyd-web-check\index.html"
```

`--app` test een bestaand artefact. `--out` moet buiten de repository liggen. Draai browserreeksen niet parallel. `smoke.py` mag ontbrekende Playwright alleen met expliciet `--optional` overslaan; CI gebruikt dat niet.

## Dekking en grenzen

De bestaande suites testen routes, instellingen, modellen, scenario's, drag-and-drop en werkelijke XLSX-/documentbestanden. `t_reliability` dekt mislukte opslag, rollback, undo/redo, beperkte toekomstige import, corrupt herstel, centrale gereedheid en foutpaden bij documentgeneratie/afdrukken. Een mislukte afdruk mag geen exporttijd zetten; een vertraagde afdruk mag geen vervangend ontwerp markeren. `t_experience` dekt schema-2-velden, agenda/timer, echte SIT-testinvoer gevolgd door een gewone wijziging, interne notities, toetsenbord en 256 combinaties van route, thema en breedte (320–1920px), met gevulde lange besluiten en geopende details. De Hub-regressies zijn verdeeld over `t_hub`, `t_scenarios`, `t_academy`, `t_hub_roles` en `t_learning`:
- de Hub: hero, drie ingangen, de tabs, ook met het toetsenbord, en een identieke globale navigatie (vier onderdelen, één `aria-current`) op Home, Ervaar, Academy en Designer;
- `t_hub_roles`: alle keuzes van 30 situaties in zes rollen, vergelijking met en zonder de voorbeeldmaatregel, vrije navigatie, klikbare terugblik, focus en wissen per werkdag;
- de hoofdbalk: uitklapmenu's voor Ervaar en Leer (`aria-expanded`, Escape met focusherstel, pijltjestoetsen, klik buiten), het actieve subonderdeel met `aria-current`, geen tweede balk in Home/Ervaar/Leer en titel *Ontwerpworkshop* in de ontwerpmodule;
- de scenario's: vier sectoren met illustratie, kanaalfilter, kaarten zonder uitkomst, drie stappen (voorspellen, uitkomst met feedback, waarom met Purview-functie en les), *Bekeken*-voortgang in de leeropslag, deep links en browser-terug;
- `t_scenarios`: catalogusintegriteit (sectoren, uitkomsten, lessen, schermen, je-vorm), identieke weergave bij twee verschillende ontwerpen, geen wijziging van de ontwerpstate, XSS-afweer in alle scenariovelden, normalisatie van de opslag en het menu op 900 px (knop, Escape, focus, navigeren);
- `t_academy`: alle stappen van negen lessen met een visual per hoofdstuk, de *Wat denk jij?*-vraag per les (feedback en focus), de BSN-schakelaar, de route met drie leerpaden en status (nieuw/afgerond), de kaart *Ga verder*, de pagina Alle lessen met onderwerpzoeken, oefeningen, kennischecks met focusbeheer en hervatten;
- de detector voor informatietypen, met BSN met en zonder trefwoord, woordgrenzen en herhaalde trefwoorden, ongeldige 11-proef, IBAN, creditcard met hoge en lage zekerheid, testkaartnummer en HTML-invoer;
- de begrippenlijst: zoeken en categorieën;
- dat de Workshop-state ongewijzigd blijft, inclusief Store, undo-historie, localStorage en sessionStorage;
- `t_learning`: voortgang na herladen en een nieuwe browsercontext, deep links, browsergeschiedenis, per-les/wijzigings-/volledig wissen, versievalidatie, corrupte opslag, quota en geweigerde toegang. Gedeelde praktijkvragen blijven per les onafhankelijk; iedere widget wordt bij lesreset hersteld. Undo-/redosneltoetsen in de leeromgeving mogen het klantontwerp niet wijzigen. Detectorinvoer mag ook bij opslaan vanuit een ander leeronderdeel nooit worden bewaard;
- de navigatie naar de ontwerpworkshop en terug;
- geen console- of pageerrors en geen externe verzoeken;
- 108 combinaties van 18 sitepagina's, twee thema's en drie breedtes (320, 900 en 1440px) zonder horizontale overloop, plus 24 combinaties met 150% weergavegrootte of beamermodus en rustige weergave. Screenshots worden buiten de repository opgeslagen, na voltooiing van animaties. `t_quality` draait axe-core (WCAG 2.1 A/AA, geen serious/critical) op elke route in licht en donker en op representatieve leerstappen, en controleert dat alle routes en tabbladen zonder console- of pageerrors openen. axe wordt alleen in de testcontext geïnjecteerd (`bypass_csp`); de app-bundel bevat het niet.

`ps_injection` genereert kwaadaardige synthetische strings en controleert met de PowerShell-parser dat scripts syntactisch geldig blijven en payloads geen uitvoerbare commando's worden. Scripts worden niet uitgevoerd. `syntax.py` controleert het werkelijk gebundelde JavaScript met Node.

Screenshots blijven lokaal. Controleer ook hoofdcontainer-overloop: alleen `document.scrollWidth` controleren mist fouten. Een brede tabel mag in een eigen herkenbare, focusbare container scrollen.

De Pages-workflow draait dezelfde checks voor PR's en relevante wijzigingen op main; alleen main buiten een PR kan deployen. Een lokale groene suite bewijst geen geslaagde Linux/GitHub Actions-run. Echte Office-clients, screenreaders en Purview-tenants vereisen afzonderlijke acceptatie.

## Prestatiemeting

`python tools\bench.py <baseline.html> <eindbuild.html> --out <pad-buiten-repo.json>` vergelijkt lege, preset- en synthetische 200-label-ontwerpen in dezelfde Chromium-versie. Per bewerking worden de eerste meting en vijf warme herhalingen bewaard. De runner meet normalisatie, validatie, serialisatie, wijzigen, navigatie en echte XLSX-/documentgeneratie; hij controleert ook de omvang van de undo-historie na honderd wijzigingen.

Dit zijn lokale synchrone bewerkingen, geen FCP/INP- of representatieve eindgebruikersmetingen. Normalisatie en wijzigen mogen extra kosten hebben door importinspectie en betrouwbare serialisatie. Vergelijk gelijksoortige builds en optimaliseer alleen gemeten knelpunten.
