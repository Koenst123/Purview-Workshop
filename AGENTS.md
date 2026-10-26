# AGENTS.md – werkafspraken voor (AI-)ontwikkelaars

Dit bestand is bedoeld voor iedereen (mens of AI-agent) die de **Protect your Data – Information Protection & DLP Workshop Designer** aanpast. Lees het helemaal vóór je iets wijzigt.

## 1. Wat is dit?

Een offline single-page app (één HTML-bestand) waarmee Pink Elephant-consultants samen met klanten Microsoft Purview **sensitivity labels** en **DLP** ontwerpen. Scope: Microsoft 365 **E5**. Live (publiek): https://koenst123.github.io/Purview-Workshop/

**Doelgroep:** klanten zonder Purview-kennis. Het ontwerpprincipe is *progressive disclosure*: per scherm één vraag/taak, details achter "Meer uitleg", "Technische details" of infoTips. Alles moet volledig én technisch juist blijven volgens Microsoft Learn.

**Taal:** UI in het Nederlands; Purview-termen en portalnamen in het Engels (bijv. *Sensitivity label*, *Policy tip*, *Endpoint DLP*). Gebruik geen interne nummering zoals "Workshop 1" of "Module 2". Gebruik de onderdelen **Technische maatregelen**, **Beleid & DLP** en **Impact & adoptie**.

## 2. Mappen

| Locatie | Inhoud |
|---|---|
| `_bron/` (Teams-map) = `src/` (repo) | Broncode. **Enige plek om te wijzigen.** |
| `_bron/tests/` | Regressietests (Playwright). Alleen in de Teams-map, **niet** gepubliceerd. |
| `_publiceren/` (Teams-map) = repo-root | `publiceer.ps1`, `tools/check.py`, `tools/smoke.py`, workflow, README, SECURITY, dit bestand. |
| `Voorbeelden/` (Teams-map) | Voorbeeldontwerpen (JSON). Nooit in de repo. |
| `Protect your Data - IP & DLP Workshop Designer.html` | Offline deliverable (gebouwd). |

De lokale git-clone staat **buiten** OneDrive/Teams (bijv. `C:\dev\purview-workshop-designer`). `publiceer.ps1` kopieert `_bron` naar `src/`.

## 3. Architectuur

- `build.py` bundelt CSS en JS (vaste volgorde, zie lijsten `CSS` en `JS`) in `index.template.html` en zet een **CSP met sha256-hash** van het ene inline script.
  - `python build.py [pad.html]`: offline versie.
  - `python build.py --web <map>`: GitHub Pages-versie (`index.html` + `robots.txt`, met noindex en frame-guard).
- **Data** (`data/`):
  - `catalog-*.js`: alle Purview-kennis, zoals SIT's, classifiers, labelinstellingen, DLP-acties, scenario's, adoptie en architectuur;
  - `presets.js`: voorbeeldontwerpen Generiek, Zorg en Overheid;
  - `brand-assets.js`: logo's als data-URI, ook bruikbaar als `__ASSET_naam__` in template en CSS.
- **Kern** (`js/`):
  - `core.js`: Store, undo/redo, autosave in localStorage.
  - `model.js`: state-schema en normalisatie bij import, met `N.*` en `STATE_CAPS`.
  - `ui.js`: `esc()`, `attr()`, `icon()`, `pageHead()`, `infoTip()`, `accordion()`, `F.*`-velden.
  - `dnd.js`: drag & drop.
  - `mapping.js` / `generator.js`: ontwerp naar Purview-configuratie.
  - `validation.js`: controles.
  - `scenario-engine.js`: scenario-uitkomsten en het pad in 7 fasen (`stage`/`app`/`ref` per stap).
  - `previews.js`: mock-ups van Outlook, Office, SharePoint/OneDrive, Teams, Copilot en Endpoint.
- **Views** (`js/views/*.js`): `registerView(route, { title, fac, done, render })`. Subtabs gaan via `UI.sub[route]` en `App.go(route, sub)`.
- **Exports** (`js/export/`): PowerShell (altijd in simulatiemodus), XLSX, Word/HTML-ontwerpdocument en JSON.
- **Shell** (`js/app.js`):
  - navigatie;
  - `Prefs` (versie `PREFS_VERSION`, met migratie);
  - het dialoogvenster Instellingen (`showSettings`);
  - het facilitatorpaneel (standaard dicht);
  - het thema (standaard licht, of donker);
  - wissen (`wipeNow`).

## 4. Harde regels (security)

1. Alle tekst die van gebruikers of uit een import komt, gaat via `esc()` (inhoud) of `attr()` (attribuut) voordat het in HTML terechtkomt. Imports van klanten zijn **onvertrouwd**.
2. Geen inline event handlers (`onclick=` en dergelijke). Gebruik `data-action="naam"` met `Actions["naam"] = (el, ev) => {}`. Voor invoer gebruik je `data-bind` of `data-live`.
3. Geen `eval`, `new Function`, externe scripts, fonts, afbeeldingen of netwerkverkeer. De CSP heeft `default-src 'none'` en `connect-src 'none'`.
4. Nooit `</script` in een JS-bestand; de build stopt dan.
5. PowerShell-export: quote strings alleen via de bestaande helpers in `powershell.js`. Let op slimme quotes `‘’`: PowerShell ziet die ook als enkele quote. Test dit met `tests/ps_injection.py`.
6. Exports naar XLSX of CSV moeten beschermd blijven tegen formula-injectie.
7. Zet nooit klantgegevens, exports (`*.json`, `*.xlsx`, `*.docx`, `*.pdf`), secrets of klantnamen in de repo. `tools/check.py` en `.gitignore` bewaken dit.
8. Nieuwe velden in de state moeten in `model.js` genormaliseerd én begrensd worden. Bescherm tegen prototype pollution: `__proto__` en `constructor` worden genegeerd.

## 5. Inhoudelijke regels (Purview)

- Controleer elke claim op Microsoft Learn: SIT-namen exact zoals in Purview, ondersteunde locaties en acties, licenties (E5) en talen.
  - Classifiers zijn meestal alleen Engelstalig.
  - Geen classifiers in de DLP-locatie *Microsoft 365 Copilot*.
  - Endpoint-credential-SIT's vereisen *Advanced classification*.
- Is iets onzeker? Zeg dat dan eerlijk in de UI ("controleer in de portal", "test eerst in simulatie") en verzin geen functionaliteit.
- Teksten moeten kort en klantvriendelijk zijn. Uitleg komt achter "Meer uitleg"; Purview-termen achter "Technische details".

## 6. UX en huisstijl

- Pink Elephant-huisstijl in `css/brand.css`, met licht (standaard) en donker thema. Kleuren alleen via CSS-variabelen.
- Microsoft-logo's staan in `brand-assets.js`: Purview, Defender, M365 Copilot, Teams, Outlook en andere. Gebruik het juiste logo, dus bijvoorbeeld niet het Entra-logo voor Purview.
- Toegankelijkheid: alles moet met het toetsenbord werken, met `aria-*`-labels, focus zichtbaar, en respect voor `prefers-reduced-motion` en de instelling "Rustige weergave".
- Responsief tot ongeveer 900px breed. De beamermodus (`data-beamer`) moet leesbaar blijven.

## 7. Bouwen en testen

Vereist: Python 3.10+, `pip install playwright` en `python -m playwright install chromium`.

```powershell
cd _bron
python build.py                      # offline deliverable in de bovenliggende map
.\tests\run-all.ps1                  # bouwt naar %TEMP% en draait alle 19 tests na elkaar
```

- Alle tests moeten slagen (de runner meldt bijvoorbeeld `19/19 geslaagd`). Tests met een nieuwe of gewijzigde UI pas je **mee** aan; een rode test haal je niet weg.
- Draai tests niet parallel, want dan krijg je time-outs.
- Controleer UI-wijzigingen visueel met screenshots in licht, donker en smal (900px).

## 8. Publiceren

Zie `PUBLICEREN.md` (Teams-map). In het kort:

```powershell
cd C:\dev\purview-workshop-designer
.\publiceer.ps1 -Proef                          # alleen bouwen en controleren
.\publiceer.ps1 -Bericht "Wat is er veranderd"   # synchroniseren, controleren, bevestigen (j), pushen
```

GitHub Actions (`.github/workflows/pages.yml`):
- bouwt opnieuw;
- draait `tools/check.py`;
- publiceert de site.

De actions zijn vastgepind op commit-SHA en de rechten zijn minimaal. Controleer na een push of de Actions-run groen is en test de live site.

## 9. Checklist bij elke wijziging

- [ ] Gewijzigd in `_bron`, niet in de gebouwde HTML of in `src/` van de clone.
- [ ] `esc()`/`attr()` gebruikt, geen inline handlers, nieuwe state-velden genormaliseerd in `model.js`.
- [ ] Inhoud gecontroleerd tegen Microsoft Learn; teksten kort en in de juiste taal.
- [ ] `tests\run-all.ps1` volledig groen; screenshots in licht, donker en smal bekeken.
- [ ] Offline deliverable opnieuw gebouwd (`python build.py`).
- [ ] Gepubliceerd met `publiceer.ps1`; Actions-run groen; live site gecontroleerd.
