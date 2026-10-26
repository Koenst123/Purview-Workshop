# Beveiliging en privacy

| Gegevens | Browseropslag / undo | Volledige JSON | Klantdocument / Excel / PowerShell |
|---|---|---|---|
| Ontwerp, scope, deelnemers, besluiten, agenda | Ja | Ja | Waar relevant |
| Interne facilitatornotities | Ja | Ja | Nee; alleen expliciete interne documentvariant |
| SIT-testtekst | Nee; alleen transient UI-geheugen | Nee | Nee |
| Weergavevoorkeuren | Aparte lokale sleutel; geen undo | Nee | Nee |
| Timer / selecties / nog niet toegevoegde invoer | Alleen geheugen | Nee | Nee |

localStorage is geen versleutelde kluis, geen cloudback-up en niet betrouwbaar beschikbaar in elk browserprofiel. Andere gebruikers van hetzelfde profiel kunnen gegevens lezen. Het verplaatsen van een offline HTML-bestand kan de toegang tot oude browseropslag veranderen; maak vooraf een JSON-back-up. De app verstuurt geen ingevulde inhoud; externe Microsoft Learn-links worden alleen op verzoek geopend.

## Import en herstel

JSON-import is begrensd op 5 MiB UTF-8. Modelinspectie begrenst diepte op 32 en bezochte waarden op 150.000. Bekende teksten hebben maximaal 20.000 tekens; collectiegrenzen staan in `STATE_CAPS`. Gevaarlijke prototypesleutels worden genegeerd. Die grenzen beschermen de app, niet de inhoudelijke juistheid van een ontwerp.

Toekomstige versies en gemelde reparaties/afkappingen worden vóór vervangen getoond. Annuleren is de veilige standaard; het originele bestand is eerst downloadbaar. Bij ongeldige import blijft de actieve state intact. Een herstelde verwijzing of beperkte import vereist altijd inhoudelijke controle.

Bij een corrupte lokale kopie schrijft autosave niet over die kopie heen. **Bewaren en herstellen** biedt de originele kopie, het huidige ontwerp en bewust opnieuw beginnen. Autosave uitschakelen laat de bestaande kopie staan. **Nieuw ontwerp** vervangt de werkstand; **Lokale gegevens wissen** verwijdert ook geschiedenis en voorkeuren waar de browser dat toestaat. Eerdere downloads en andere browserprofielen worden niet gewist.

## Technische verdediging

Escaping per HTML-context, geen inline handlers/eval, een script-hash-CSP met `connect-src 'none'`, frameguard in de webbuild, PowerShell-quoting inclusief slimme quotes, en XLSX inline strings met formula-afweer blijven vereist.

Synthetische regressies dekken XSS, prototype pollution, corrupte imports, quota, transient testtekst, interne-notitiebeleid en PowerShell AST-parsing. Het AST-onderzoek voert geen gegenereerd script of tenantcommando uit. Deze controles zijn geen volledige penetratietest en beschermen niet tegen een onveilig apparaat, kwaadaardige browserextensie of onzorgvuldig gedeelde downloads.
