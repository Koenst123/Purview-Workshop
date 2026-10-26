# Protect your Data – Information Protection & DLP Workshop Designer

Interactieve workshoptool van **Pink Elephant** om samen met een organisatie Microsoft Purview **sensitivity labels** en **Data Loss Prevention (DLP)** te ontwerpen – van classificatieschema tot DLP-policies, Copilot en endpoint, met uitleg op klantniveau en exports (ontwerpdocument, Excel, PowerShell in simulatie).

**Live:** https://koenst123.github.io/Purview-Workshop/

## Privacy en veiligheid

- De app is één statisch HTML-bestand zonder server, cookies, tracking of externe bronnen.
- Alles wat je invult blijft **in je eigen browser** (localStorage) en in bestanden die je zelf opslaat. Een strikte Content-Security-Policy (`connect-src 'none'`) voorkomt dat de pagina gegevens kan versturen.
- Gebruik op een gedeelde computer na afloop *Nieuw ontwerp* of wis de sitegegevens van de browser.
- Kwetsbaarheid gevonden? Zie [SECURITY.md](SECURITY.md).

## Structuur

| Map | Inhoud |
|---|---|
| `src/` | Broncode (wordt gebundeld door `src/build.py`) |
| `tools/check.py` | Veiligheidscontrole vóór publicatie (CSP, geen klantbestanden of geheimen) |
| `tools/smoke.py` | Rooktest in de browser (optioneel, Playwright) |
| `publiceer.ps1` | Bijwerken → controleren → publiceren |
| `.github/workflows/pages.yml` | Bouwt en publiceert naar GitHub Pages |

Lokaal bouwen: `python src/build.py --web _site` en open `_site/index.html`.

## Disclaimer

Dit is geen product van Microsoft. Microsoft, Microsoft 365, Purview, Copilot, SharePoint, OneDrive, Teams, Outlook en Exchange zijn handelsmerken van Microsoft Corporation. De voorbeeldschermen in de app zijn indicatief; raadpleeg Microsoft Learn voor actuele functionaliteit en licenties. © Pink Elephant – alle rechten voorbehouden.
