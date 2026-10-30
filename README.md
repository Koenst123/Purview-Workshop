# Protect your Data – Purview Experience Hub

Offline Purview Experience Hub van **Pink Elephant** voor Information Protection & DLP, met drie ingangen:

- **Ervaar Purview**: zes fictieve werkdagen voor HR, financiën, projectleiding, security, verpleegkundigen/verzorgenden en medisch specialisten. Elk heeft vijf interactieve situaties, ook los toegankelijk. Vergelijk keuzes met en zonder de beschreven maatregel. De scenariobibliotheek blijft beschikbaar met voorbeeldontwerpen per sector.
- **Leer Purview kennen**: drie doelgerichte leerpaden met negen gedeelde lessen. Elke les heeft korte, vrij navigeerbare stappen, een oefening, kennisvragen en Microsoft Learn-bronnen. U ziet per leerpad direct wat af is. Zoek een les onder Alle lessen of gebruik de begrippenlijst. De Academy legt het product uit zonder configuratie-instructies.
- **Ontwerp uw oplossing**: de ontwerpworkshop (de bestaande Workshop Designer).

De Experience gebruikt synthetische gegevens en wijzigt geen tenant. Een Workshop-ontwerp is geen tenantconfiguratie of acceptatietest. PowerShell wijzigt labels en beleid; alleen DLP- en auto-labelingpolicies starten in simulatie.

**Live:** https://koenst123.github.io/Purview-Workshop/

## Privacy en veiligheid

- De app is één statisch HTML-bestand zonder server, cookies, tracking of externe bronnen.
- Workshop-ontwerpen blijven **in je eigen browser** (localStorage) en in bestanden die je zelf opslaat. Vaste leerkeuzes en voortgang worden apart lokaal bewaard; ingevoerde oefentekst niet. Leren wijzigt geen ontwerp, undo-historie of export. Een strikte Content-Security-Policy (`connect-src 'none'`) voorkomt dat de pagina gegevens kan versturen.
- Nieuwe bezoekers beginnen op de Hub. Bij hervatten wordt de laatst bezochte pagina geopend; de hoofdnavigatie opent steeds een overzicht. Wissen kan per les, per werkdag of voor alle leervoortgang.
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
