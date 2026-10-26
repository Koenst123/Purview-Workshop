# Architectuur

`src/build.py` bundelt negen CSS-bestanden en 41 JavaScript-modules in vaste volgorde. De enige scriptinhoud krijgt een SHA-256 CSP-hash. De webvariant voegt noindex, robots.txt en een frameguard toe; de offlinevariant blijft een zelfstandig HTML-bestand. Er is geen backend of externe runtimeafhankelijkheid.

Dataflow: catalogi en presets → model → Store → mapping/generator/validatie → views en exports. `Actions` en `Hooks` verwerken acties en bindings; geen inline event handlers. `App.go()` verzorgt de zestien bestaande routes. De drie startkaarten verwijzen naar `schema`, `dlp` en `adoption`, zonder extra wizard.

## Gegevenscontract

Schema 2 behoudt schema-1-data via `MIGRATIONS[1]`. `meta` bevat klantcontext, doelen, afbakening, aannames en interne notities. `workshop` bevat beschikbare minuten en maximaal 32 agendapunten. Besluiten bewaren status, eigenaar, deadline, onderbouwing, aannames, oplossing en optionele route/configuratie/regel-ID.

Normalisatie begrenst bekende velden en collecties, herstelt identifiers/verwijzingen en weigert te diepe of complexe invoer. Onbekende, veilige velden blijven waar mogelijk behouden; dat is geen garantie van compatibiliteit met toekomstige versies.

## State en bewaren

`Store.update()` voert mutatie en serialisatie uit voordat de wijziging aan de historie wordt toegevoegd. Bij fouten wordt de vorige snapshot hersteld. Undo/redo gebruikt maximaal 80 snapshots met coalescing voor normale invoer. UI-selecties, timer en SIT-testtekst staan buiten de ontwerpstate.

Autosave is gedebounced, met flush bij pagehide/visibilitychange. `savedAt` verandert pas na een geslaagde write. De vluchtige opslagstatus onderscheidt gewijzigd, bewaren, bewaard, mislukt, onbeschikbaar en uitgeschakeld. Een corrupte of toekomstige lokale kopie blokkeert automatisch overschrijven totdat de gebruiker bewust verdergaat.

Een lopende agendatimer houdt zijn gekozen doeltijd vast bij navigatie en pauze. De timer zelf is geen persistent aanwezigheids- of tijdregistratiesysteem.

## Exports

JSON gebruikt `stripPrivate()` en bevat de volledige werkstand inclusief interne notities. Klantuitvoer gebruikt `customerState()`; alleen de expliciet bevestigde interne documentvariant neemt interne notities mee. XLSX gebruikt bestaande ZIP/XML-generatie, filters, freeze panes en formula-afweer. Het document hergebruikt dezelfde werkbladen. PowerShell gebruikt bestaande quotinghelpers en wordt nooit door de app uitgevoerd.
