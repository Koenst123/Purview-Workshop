# Protect your Data – Information Protection & DLP Workshop Designer

Offline workshoptool van **Pink Elephant** voor een onderbouwd Microsoft Purview-ontwerp. Begin bij **Maatregelen**, **Beleid & DLP** of **Adoptie**. Leg doelen, agenda, besluiten en open punten vast; exporteer een ontwerpdocument, Excel-werkboek of PowerShell-script.

Een ontwerp is geen tenantconfiguratie of acceptatietest. PowerShell wijzigt labels en beleid; alleen DLP- en auto-labelingpolicies starten in simulatie.

**Live:** https://koenst123.github.io/Purview-Workshop/

## Privacy en veiligheid

- De app is één statisch HTML-bestand zonder server, cookies, tracking of externe bronnen.
- Alles wat je invult blijft **in je eigen browser** (localStorage) en in bestanden die je zelf opslaat. Een strikte Content-Security-Policy (`connect-src 'none'`) voorkomt dat de pagina gegevens kan versturen.
- localStorage is geen versleutelde kluis. Volledige JSON-back-ups bevatten ook interne facilitatornotities; klantdocumenten en Excel standaard niet.
- Gebruik op een gedeelde computer **Lokale gegevens wissen** en controleer downloads. *Nieuw ontwerp* wist niet alle browsergegevens.
- Bij opslagfouten blijft het ontwerp in het geheugen. Gebruik **Bewaren en herstellen** om opnieuw te proberen of JSON te downloaden.
- Kwetsbaarheid gevonden? Zie [SECURITY.md](SECURITY.md).

## Structuur

| Map | Inhoud |
|---|---|
| `src/` | Broncode (wordt gebundeld door `src/build.py`) |
| `tools/check.py` | Veiligheidscontrole vóór publicatie (CSP, geen klantbestanden of geheimen) |
| `tools/smoke.py` | Verplichte webrooktest; uitsluitend met `--optional` overslaan toegestaan |
| `tools/test.py`, `tests/` | Sequentiele regressies met synthetische invoer |
| `docs/` | Architectuur, privacy, tests, validatieregels en workshophandleiding |
| `publiceer.ps1` | Bijwerken → controleren → publiceren |
| `AGENTS.md` | Werkafspraken voor ontwikkelaars en AI-agents (architectuur, regels, tests) |
| `.github/workflows/pages.yml` | Bouwt en publiceert naar GitHub Pages |

Alleen toegestane synthetische testbronnen worden gepubliceerd. Voorbeeldontwerpen, klantbestanden, screenshots en testuitvoer blijven uitgesloten.

Lokaal bouwen: `python src/build.py --web _site` en open `_site/index.html`.

Testen: `python -m pip install -r tools/requirements-test.txt`, `python -m playwright install chromium`, daarna `python tools/test.py`. Node en PowerShell 7 zijn nodig voor syntaxcontroles. Zie [testen](docs/testing.md) en de [workshophandleiding](docs/workshop-handleiding.md).

## Disclaimer

Dit is geen product van Microsoft. Microsoft, Microsoft 365, Purview, Copilot, SharePoint, OneDrive, Teams, Outlook en Exchange zijn handelsmerken van Microsoft Corporation. De voorbeeldschermen in de app zijn indicatief; raadpleeg Microsoft Learn voor actuele functionaliteit en licenties. © Pink Elephant – alle rechten voorbehouden.
