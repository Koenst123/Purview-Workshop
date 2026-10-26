# Validatieregels en bronstatus

Iedere bevinding heeft een vaste `PV-...` regel-ID in de broncode, naast `level`, categorie, blokkerend ja/nee, doelroute, vervolgstap en bron. Hergebruik bestaande ID's nooit voor andere regels. Dezelfde regel kan meerdere bevindingen opleveren, bijvoorbeeld voor verschillende labels.

`err` betekent een technisch probleem dat review blokkeert. `warn` is een risico of bespreekpunt. `info` omvat aandachtspunten en tenantvoorwaarden. Tenantvoorwaarden zijn niet automatisch ontwerpfouten, maar vereiste open voorwaarden tellen wel mee voor technische review. Een validatie-enginefout levert geen groene uitkomst op.

## Bronverificatie

De standaardstatus is **niet afzonderlijk geverifieerd**, zonder verificatiedatum. Een bronlink alleen bewijst niet dat iedere claim op die pagina is gecontroleerd. `CATALOG.validationSources` bevat uitsluitend concrete gecontroleerde regels.

| Regels / onderwerp | Bron | Status |
|---|---|---|
| PV-030: rechten bij administratief toegewezen encryptie | [Encryptie](https://learn.microsoft.com/en-us/purview/encryption-sensitivity-labels) | Gecontroleerd 2026-10-26 |
| PV-058: DLP-encryptie garandeert geen externe toegang; al versleutelde bijlagen behouden hun encryptie | [Encryptie en bijlagen](https://learn.microsoft.com/en-us/purview/encryption-sensitivity-labels#email-attachments-for-encrypted-email-messages-and-meeting-invites) | Waarschuwing gecorrigeerd 2026-10-26; combinatie in tenant testen |
| PV-036, PV-057: DKE en Teams Premium bij meetings | [Meetings](https://learn.microsoft.com/en-us/purview/sensitivity-labels-meetings) | Gecontroleerd 2026-10-26 |
| PV-048: service-side locaties | [Auto-labeling](https://learn.microsoft.com/en-us/purview/apply-sensitivity-label-automatically) | Gecontroleerd 2026-10-26 |
| PV-088–090: Copilot SIT-types en geen SIT/label-combinatie in dezelfde regel | [Copilot DLP](https://learn.microsoft.com/en-us/purview/dlp-microsoft365-copilot-location-learn-about) | Gecontroleerd 2026-10-26 |
| PV-094: evalueren vóór handhaven | [Simulatie](https://learn.microsoft.com/en-us/purview/dlp-simulation-mode-learn) | Gecontroleerd 2026-10-26 |
| PV-110: Advanced classification | [Endpoint settings](https://learn.microsoft.com/en-us/purview/dlp-configure-endpoint-settings) | Gecontroleerd 2026-10-26 |
| Teams-chat/kanalen zijn ook beschikbaar met Office 365 E5/A5/G5 | [Teams DLP](https://learn.microsoft.com/en-us/purview/dlp-microsoft-teams) | Licentietekst gecorrigeerd 2026-10-26 |
| Labels mogen alleen classificeren | [Sensitivity labels](https://learn.microsoft.com/en-us/purview/sensitivity-labels) | Reviewcriterium gecorrigeerd 2026-10-26 |

Copilot-promptbescherming is preview en afhankelijk van uitrol/client. Controleer actuele servicebeschrijvingen; een generieke E5-badge is geen licentiegarantie voor iedere workload. Teams-bestanden vallen onder SharePoint/OneDrive. Bij cross-tenant chats en shared channels verschillen de toepasselijke tenantregels.

## Ontwerpstatus

**Ontwerp uitgewerkt** combineert ingevulde/besproken stappen en borddekking. **Ontwerp compleet** telt afzonderlijke criteria; besproken markeren heft technische fouten niet op. De handmatige status **Vastgesteld** blijft apart.

Klantuitvoer wordt als concept gemarkeerd als status, reviewcriteria of open besluiten dat vereisen. Geen score bewijst werking in een tenant. Publicatie, encryptierechten, clientversies, licenties, simulatie-uitkomsten en scenarioacceptatie moeten daar nog worden getoetst.
