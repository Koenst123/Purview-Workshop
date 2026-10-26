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
python tools\test.py --only t_reliability t_experience ps_injection
python src\build.py --web "$env:TEMP\pyd-web-check"
python tools\check.py "$env:TEMP\pyd-web-check"
python tools\syntax.py "$env:TEMP\pyd-web-check\index.html"
python tools\smoke.py "$env:TEMP\pyd-web-check\index.html"
```

`--app` test een bestaand artefact. `--out` moet buiten de repository liggen. Draai browserreeksen niet parallel. `smoke.py` mag ontbrekende Playwright alleen met expliciet `--optional` overslaan; CI gebruikt dat niet.

## Dekking en grenzen

De bestaande suites testen routes, instellingen, modellen, scenario's, drag-and-drop en werkelijke XLSX-/documentbestanden. `t_reliability` dekt mislukte opslag, rollback, undo/redo, beperkte toekomstige import, corrupt herstel, centrale gereedheid en foutpaden bij documentgeneratie/afdrukken. Een mislukte afdruk mag geen exporttijd zetten; een vertraagde afdruk mag geen vervangend ontwerp markeren. `t_experience` dekt schema-2-velden, agenda/timer, echte SIT-testinvoer gevolgd door een gewone wijziging, interne notities, toetsenbord en 256 combinaties van route, thema en breedte (320–1920px), met gevulde lange besluiten en geopende details.

`ps_injection` genereert kwaadaardige synthetische strings en controleert met de PowerShell-parser dat scripts syntactisch geldig blijven en payloads geen uitvoerbare commando's worden. Scripts worden niet uitgevoerd. `syntax.py` controleert het werkelijk gebundelde JavaScript met Node.

Screenshots blijven lokaal. Controleer ook hoofdcontainer-overloop: alleen `document.scrollWidth` controleren mist fouten. Een brede tabel mag in een eigen herkenbare, focusbare container scrollen.

De Pages-workflow draait dezelfde checks voor PR's en relevante wijzigingen op main; alleen main buiten een PR kan deployen. Een lokale groene suite bewijst geen geslaagde Linux/GitHub Actions-run. Echte Office-clients, screenreaders en Purview-tenants vereisen afzonderlijke acceptatie.

## Prestatiemeting

`python tools\bench.py <baseline.html> <eindbuild.html> --out <pad-buiten-repo.json>` vergelijkt lege, preset- en synthetische 200-label-ontwerpen in dezelfde Chromium-versie. Per bewerking worden de eerste meting en vijf warme herhalingen bewaard. De runner meet normalisatie, validatie, serialisatie, wijzigen, navigatie en echte XLSX-/documentgeneratie; hij controleert ook de omvang van de undo-historie na honderd wijzigingen.

Dit zijn lokale synchrone bewerkingen, geen FCP/INP- of representatieve eindgebruikersmetingen. Normalisatie en wijzigen mogen extra kosten hebben door importinspectie en betrouwbare serialisatie. Vergelijk gelijksoortige builds en optimaliseer alleen gemeten knelpunten.
