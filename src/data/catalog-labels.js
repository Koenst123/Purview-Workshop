/* Catalogus – sensitivity labels: scope, encryptie, markering, containers, meetings, labelbeleid, tenantvoorwaarden.
   Portalteksten in het Engels (1-op-1 met het Microsoft Purview-portal), uitleg in het Nederlands. */

/* ---------- Scope (Define the scope for this label) ---------- */
CATALOG.labelScopes = [
  { key: "files", name: "Files & other data assets", short: "Word, Excel, PowerPoint en PDF", ps: "File", requires: [], badge: "", desc: "Word, Excel, PowerPoint, PDF en (sinds de samenvoeging) ook ‘Schematized data assets’ in de Purview Data Map. Basis voor encryptie, markering en auto-labeling van documenten." },
  { key: "emails", name: "Emails", short: "Berichten in Outlook", ps: "Email", requires: [], badge: "", desc: "Berichten in Outlook (desktop, web, mobiel). Encryptie, markering en Do Not Forward/Encrypt-Only." },
  { key: "meetings", name: "Meetings", short: "Agenda-items en Teams-meetings", ps: "Teamwork", requires: ["files", "emails"], badge: "teamsPremium", desc: "Agenda-items en Teams-meetings (lobby, presentatoren, opnemen, chat, watermerk, end-to-end encryptie). Vereist dat ook Files en Emails zijn geselecteerd; een deel van de instellingen vraagt Teams Premium." },
  { key: "sites", name: "Groups & sites", short: "Teams, Groups en SharePoint-sites", ps: "Site, UnifiedGroup", requires: [], badge: "", desc: "Container-label voor Teams, Microsoft 365 Groups en SharePoint-sites: privacy, gasttoegang, extern delen, onbeheerde apparaten. Labelt níet automatisch de bestanden in de container." },
];
CATALOG.labelSchemeNote = "Nieuwe tenants (en tenants die migreren) gebruiken het nieuwe labelschema met label groups (vanaf oktober 2025). Een label group is in het portal het equivalent van een parent-label met sublabels; de ontwerpkeuzes in deze tool gelden voor beide schema’s. Sublabels: maximaal één niveau diep.";

/* ---------- Encryptie (Access control) ---------- */
CATALOG.encryptionModes = [
  { key: "none", name: "Geen encryptie", desc: "Het label versleutelt niet en laat bestaande encryptie ongemoeid." },
  { key: "assignNow", name: "Assign permissions now", desc: "De beheerder bepaalt vooraf wie welke rechten krijgt. Werkt met auto-labeling, DLP en Copilot-rechten (EXTRACT)." },
  { key: "userDefined", name: "Let users assign permissions when they apply the label", desc: "De gebruiker kiest bij het labelen zelf personen en rechten (Word/Excel/PowerPoint) of Do Not Forward / Encrypt-Only (Outlook). Niet bruikbaar voor auto-labeling." },
  { key: "remove", name: "Remove encryption if the file or email or calendar event is encrypted", desc: "Verwijdert bestaande encryptie bij het toepassen van het label (vereist voldoende rechten van de gebruiker)." },
];
CATALOG.permissionPrincipals = [
  { type: "org", name: "Add all users and groups in your organization", short: "Alle gebruikers in de organisatie", icon: "users", desc: "Alle accounts in de tenant (geen gasten). Basis voor ‘intern versleuteld’." },
  { type: "authenticated", name: "Add any authenticated users", short: "Any authenticated users", icon: "globe", desc: "Iedereen met een Entra ID- of Microsoft-account kan openen. Beschermt tegen anonieme toegang en geeft rechtenbeperking + audit, maar beperkt níet wie leest." },
  { type: "group", name: "Add users or groups", short: "Gebruikers of groepen", icon: "user", desc: "Specifieke (mail-enabled) groepen of gebruikers, bijv. HR of Directie. Gebruik groepen, geen individuen." },
  { type: "domain", name: "Add specific email addresses or domains", short: "E-mailadressen of domeinen", icon: "link", desc: "Externe partnerdomeinen (bijv. partner.nl) of adressen. Vereist B2B/cross-tenant toegang voor de ontvangende partij." },
];
CATALOG.usageRights = [
  { key: "VIEW", name: "View, Open, Read", desc: "Openen en lezen." },
  { key: "VIEWRIGHTSDATA", name: "View Rights", desc: "Het beleid/de rechten bekijken." },
  { key: "DOCEDIT", name: "Edit Content, Edit", desc: "Inhoud wijzigen (zonder opslaan)." },
  { key: "EDIT", name: "Save", desc: "Wijzigingen opslaan." },
  { key: "PRINT", name: "Print", desc: "Afdrukken." },
  { key: "EXTRACT", name: "Copy", desc: "Kopiëren, schermafdruk, en gebruik door Copilot (samenvatten)." },
  { key: "REPLY", name: "Reply", desc: "Beantwoorden (e-mail)." },
  { key: "REPLYALL", name: "Reply All", desc: "Allen beantwoorden (e-mail)." },
  { key: "FORWARD", name: "Forward", desc: "Doorsturen (e-mail)." },
  { key: "EDITRIGHTSDATA", name: "Edit Rights", desc: "Rechten wijzigen." },
  { key: "EXPORT", name: "Save As, Export", desc: "Opslaan als / exporteren; ook encryptie verwijderen." },
  { key: "OBJMODEL", name: "Allow Macros", desc: "Macro’s en programmatische toegang." },
  { key: "OWNER", name: "Full Control", desc: "Alle rechten, incl. encryptie verwijderen." },
];
CATALOG.permissionLevels = [
  { key: "CoOwner", name: "Owner", old: "Co-Owner", color: "#C50F1F", rights: ["VIEW", "VIEWRIGHTSDATA", "DOCEDIT", "EDIT", "PRINT", "EXTRACT", "REPLY", "REPLYALL", "FORWARD", "EDITRIGHTSDATA", "EXPORT", "OBJMODEL", "OWNER"], desc: "Volledige controle, inclusief encryptie verwijderen." },
  { key: "CoAuthor", name: "Editor", old: "Co-Author", color: "#0F6CBD", rights: ["VIEW", "VIEWRIGHTSDATA", "DOCEDIT", "EDIT", "PRINT", "EXTRACT", "REPLY", "REPLYALL", "FORWARD", "OBJMODEL"], desc: "Lezen, bewerken, opslaan, kopiëren en afdrukken; geen rechten wijzigen of exporteren." },
  { key: "Reviewer", name: "Restricted Editor", old: "Reviewer", color: "#038387", rights: ["VIEW", "VIEWRIGHTSDATA", "DOCEDIT", "EDIT", "REPLY", "REPLYALL", "FORWARD", "OBJMODEL"], desc: "Bewerken en opslaan, maar niet kopiëren (ook niet door Copilot) of afdrukken." },
  { key: "Viewer", name: "Viewer", old: "Viewer", color: "#8764B8", rights: ["VIEW", "VIEWRIGHTSDATA", "OBJMODEL"], desc: "Alleen lezen: niet bewerken, kopiëren, afdrukken of doorsturen." },
  { key: "Custom", name: "Custom", old: "Custom", color: "#69797E", rights: [], desc: "Zelf samengestelde rechten." },
];
CATALOG.expiryOptions = [["never", "Never"], ["date", "On a specific date"], ["days", "Specify number of days from when label is applied"]];
CATALOG.offlineOptions = [["always", "Always"], ["never", "Never"], ["days", "Only for a number of days"]];
CATALOG.userDefinedOutlook = [["none", "Niet voor Outlook (alleen Word, PowerPoint, Excel)"], ["DoNotForward", "Do Not Forward"], ["EncryptOnly", "Encrypt-Only"]];
CATALOG.encryptionNotes = [
  "Encryptie met ‘Assign permissions now’ en een vervaldatum (expiry) of DKE ondersteunt geen co-authoring en geen AutoSave.",
  "Rechten zonder EXTRACT (Copy) betekenen dat Microsoft 365 Copilot de inhoud niet kan samenvatten voor die gebruiker.",
  "Externe partners openen versleutelde inhoud met hun eigen Entra ID-account; zorg voor passende cross-tenant access settings (B2B).",
  "Double Key Encryption (DKE): niet voor Teams-meetings, auto-labeling, DLP-inspectie, Copilot, eDiscovery-zoeken, Mac of Office web.",
  "Labels met admin-defined encryptie: maximaal 500 per tenant.",
];

/* ---------- Content marking ---------- */
CATALOG.markingVariables = [
  { v: "${Item.Label}", desc: "Naam van het label", sample: (c) => c.label },
  { v: "${Item.Name}", desc: "Bestandsnaam of onderwerp", sample: (c) => c.item },
  { v: "${Item.Location}", desc: "Pad of URL (documenten) of onderwerp (e-mail)", sample: (c) => c.location },
  { v: "${User.Name}", desc: "Weergavenaam van de gebruiker die labelt", sample: (c) => c.user },
  { v: "${User.PrincipalName}", desc: "UPN van de gebruiker die labelt", sample: (c) => c.upn },
  { v: "${Event.DateTime}", desc: "Datum/tijd van labelen (lokale tijd)", sample: (c) => c.dt },
];
CATALOG.markingApps = [
  { key: "W", name: "Word" }, { key: "X", name: "Excel" }, { key: "P", name: "PowerPoint" }, { key: "O", name: "Outlook" },
];
CATALOG.markingFonts = ["Calibri", "Arial", "Segoe UI", "Aptos", "Verdana", "Tahoma", "Times New Roman", "Cambria", "Courier New"];
CATALOG.markingColors = [["#000000", "Zwart"], ["#7F7F7F", "Grijs"], ["#0F6CBD", "Blauw"], ["#C50F1F", "Rood"], ["#CA5010", "Oranje"], ["#13A10E", "Groen"], ["#8764B8", "Paars"]];
CATALOG.markingLimits = { headerFooter: 1024, watermark: 255, excelHeaderFooter: 255 };
CATALOG.markingNotes = [
  "Watermerken worden alleen toegepast op documenten (Word, Excel, PowerPoint), niet op e-mail of meetings. Excel toont watermerken alleen in Page Layout-/afdrukweergave.",
  "Kop- en voetteksten: max. 1.024 tekens (Excel: max. 255 tekens totaal kop+voet). Watermerk: max. 255 tekens.",
  "Variabelen zoals ${Item.Label} en ${User.Name} worden bij het labelen in Office ingevuld; app-specifieke tekst met ${If.App.WXPO}…${If.End}.",
  "Het lettertype is alleen via PowerShell te kiezen (…FontName); het portal ondersteunt grootte, kleur en uitlijning.",
  "Dynamische watermerken (gebruikersnaam/tijd op het scherm) zijn een aparte, encryptie-afhankelijke optie in Word/Excel/PowerPoint.",
];

/* ---------- Groups & sites (container-labels) ---------- */
CATALOG.containerPrivacy = [
  ["unspecified", "None – let team and group owners choose", "De eigenaar kiest zelf Public of Private."],
  ["public", "Public", "Iedereen in de organisatie kan het team/de site openen."],
  ["private", "Private", "Alleen leden; eigenaren beheren het lidmaatschap."],
];
CATALOG.siteSharing = [
  ["ExternalUserAndGuestSharing", "Anyone", "Anyone-links (zonder aanmelden), nieuwe en bestaande gasten."],
  ["ExternalUserSharingOnly", "New and existing guests", "Gasten moeten zich aanmelden of een verificatiecode gebruiken."],
  ["ExistingExternalUserSharingOnly", "Existing guests", "Alleen gasten die al in de directory staan."],
  ["Disabled", "Only people in your organization", "Geen extern delen."],
];
CATALOG.unmanagedAccess = [
  ["full", "Allow full access from desktop apps, mobile apps, and the web", "Geen beperking voor onbeheerde apparaten."],
  ["limited", "Allow limited, web-only access", "Alleen browser, geen download/print/sync (vereist Conditional Access-beleid)."],
  ["block", "Block access", "Geen toegang vanaf onbeheerde apparaten."],
];
CATALOG.defaultLinkType = [["unspecified", "Gebruik site-/tenantinstelling"], ["SpecificPeople", "Specific people (only the people the user specifies)"], ["Organization", "People in your organization"], ["Anyone", "Anyone with the link"]];
CATALOG.defaultLinkPermission = [["unspecified", "Gebruik site-/tenantinstelling"], ["View", "View"], ["Edit", "Edit"]];
CATALOG.containerNotes = [
  "Container-labels vereisen dat de tenant labels voor Groups & sites heeft ingeschakeld (EnableMIPLabels + Execute-AzureADLabelSync).",
  "Een container-label labelt níet automatisch de documenten in het team of de site. Gebruik daarvoor een default label voor de documentbibliotheek of auto-labeling.",
  "‘Extern delen’ van het label kan niet ruimer zijn dan de tenant- of site-instelling; het strengste geldt.",
  "Onbeheerde apparaten (limited/block) vereist een Conditional Access-beleid ‘Use app enforced restrictions’ in Entra ID.",
  "Authentication context koppelt het label aan een Conditional Access-beleid (bijv. MFA of compliant device) voor de site.",
];

/* ---------- Meetings (Teams, Teams Premium) ---------- */
CATALOG.meetingLobby = [
  ["default", "Niet afdwingen (organisator kiest)"],
  ["Everyone", "Everyone"],
  ["OrganizationExcludingGuests", "People in my org"],
  ["OrganizationAndFederated", "People in my org, trusted orgs, and guests"],
  ["Organization", "People in my org and guests"],
  ["Invited", "People who were invited"],
  ["Organizer", "Only organizers and co-organizers"],
];
CATALOG.meetingPresenters = [
  ["default", "Niet afdwingen (organisator kiest)"],
  ["Everyone", "Everyone"],
  ["Organization", "People in my org and guests"],
  ["RoleIsPresenter", "Specific people"],
  ["Organizer", "Only organizers and co-organizers"],
];
CATALOG.meetingRecorders = [
  ["default", "Niet afdwingen (organisator kiest)"],
  ["Organizer", "Organizers"],
  ["Coorganizers", "Organizers and co-organizers"],
  ["Presenters", "Organizers, co-organizers, and presenters"],
];
CATALOG.meetingChat = [["default", "Niet afdwingen (organisator kiest)"], ["Enabled", "On"], ["Limited", "In-meeting only"], ["Disabled", "Off"]];
CATALOG.meetingSettings = [
  { key: "recordAutomatically", name: "Record meetings automatically", desc: "De meeting wordt automatisch opgenomen.", lic: "", preview: false, ps: "TeamsRecordAutomatically" },
  { key: "e2ee", name: "Encryption for meeting video and audio (end-to-end)", desc: "End-to-end versleuteling van audio en video; geen opname, transcriptie, live captions of Copilot tijdens de meeting.", lic: "teamsPremium", preview: false, ps: "TeamsEndToEndEncryptionEnabled" },
  { key: "watermarkScreen", name: "Video watermark for screen sharing", desc: "Watermerk met e-mailadres van de deelnemer op gedeelde inhoud.", lic: "teamsPremium", preview: false, ps: "TeamsVideoWatermark" },
  { key: "watermarkVideo", name: "Video watermark for camera streams", desc: "Watermerk op camerabeelden.", lic: "teamsPremium", preview: false, ps: "TeamsVideoWatermark" },
  { key: "preventCopyChat", name: "Prevent copying and forwarding of meeting chat, live captions, and transcripts", desc: "Kopiëren en doorsturen van chat, ondertiteling en transcript is niet toegestaan.", lic: "teamsPremium", preview: false, ps: "TeamsCopyRestrictionEnforced" },
  { key: "detectSensitiveScreen", name: "Detect sensitive content during screen sharing", desc: "Waarschuwt bij het delen van een scherm met gevoelige informatie.", lic: "teamsPremium", preview: true, ps: "TeamsDetectSensitiveContentDuringScreenSharingEnabled" },
];
CATALOG.meetingNotes = [
  "Meeting-labels vereisen de scope ‘Meetings’ (met Files en Emails) en Teams Premium voor o.a. watermerk, end-to-end encryptie, wie mag opnemen en kopieerbescherming.",
  "Een label op een Teams-meeting beschermt ook de meeting-uitnodiging (agenda-item) in Outlook.",
  "Video watermark: in PowerShell één waarde (TeamsVideoWatermark: None, EnabledForContentSharing of EnabledForVideo).",
  "‘Apply a label to channel meetings’: kies het meeting-label als default op een Groups & sites-label (DefaultContentLabel).",
  "Instellingen die het label niet afdwingt, blijven door de organisator te kiezen binnen de Teams meeting policy.",
];

/* ---------- Label policies ---------- */
CATALOG.labelPolicySettings = [
  { key: "justification", name: "Users must provide a justification to remove a label or lower its classification", desc: "Gebruikers geven een reden bij verwijderen of verlagen; zichtbaar in Activity explorer." },
  { key: "mandatoryDocs", name: "Require users to apply a label to their emails and documents", desc: "Verplicht labelen in Office-apps voor documenten (en e-mail, tenzij apart uitgezet)." },
  { key: "mandatoryEmail", name: "Require users to apply a label to their emails", desc: "Verplicht labelen in Outlook. Advanced setting DisableMandatoryInOutlook kan dit uitzonderen." },
  { key: "mandatoryMeetings", name: "Require users to apply a label to their meetings and calendar events", desc: "Verplicht labelen van meetings (scope Meetings)." },
  { key: "mandatorySites", name: "Require users to apply a label to their groups and sites", desc: "Verplicht label bij het maken van Teams, groepen en sites." },
  { key: "mandatoryFabric", name: "Require users to apply a label to their Fabric and Power BI content", desc: "Verplicht labelen in Fabric/Power BI." },
  { key: "helpLink", name: "Provide users with a link to a custom help page", desc: "Link onder ‘Learn more’ in de Sensitivity-knop (bijv. intranetpagina met het classificatiebeleid)." },
];
CATALOG.labelPolicyDefaults = [
  { key: "defaultDocs", name: "Default label for documents", scope: "files", sameAsDocs: false },
  { key: "defaultEmail", name: "Default label for emails", scope: "emails", sameAsDocs: true },
  { key: "defaultMeetings", name: "Default label for meetings and calendar events", scope: "meetings", sameAsDocs: false },
  { key: "defaultSites", name: "Default label for groups and sites", scope: "sites", sameAsDocs: false },
  { key: "defaultFabric", name: "Default label for Fabric and Power BI content", scope: "files", sameAsDocs: false },
];
CATALOG.labelPolicyAdvanced = [
  { key: "OutlookDefaultLabel", name: "OutlookDefaultLabel", type: "label", options: [], desc: "Afwijkend default label voor e-mail (of ‘None’). In het portal: ‘Default label for emails’." },
  { key: "DisableMandatoryInOutlook", name: "DisableMandatoryInOutlook", type: "bool", options: [], desc: "Verplicht labelen geldt niet voor Outlook (alleen documenten)." },
  { key: "AttachmentAction", name: "AttachmentAction", type: "enum", options: [["", "Niet ingesteld"], ["Automatic", "Automatic – hoogste label van bijlagen"], ["Recommended", "Recommended – aanbeveling"]], desc: "E-mail erft het hoogste label van bijlagen (Outlook)." },
  { key: "teamworkmandatory", name: "teamworkmandatory", type: "bool", options: [], desc: "Verplicht label voor meetings (PowerShell-sleutel achter de portaloptie)." },
];
CATALOG.labelLimits = [
  "Een tenant ondersteunt 1.000+ labels, maar maximaal 500 labels met admin-defined encryptie (Assign permissions now).",
  "Sublabels: één niveau diep; een sublabel erft alleen de kleur van de parent, geen instellingen.",
  "Een parent-label met sublabels kan zelf niet worden toegepast.",
  "Label Name is na aanmaken onwijzigbaar; DisplayName en Tooltip wel.",
  "Wijzigingen in labels en policies kunnen tot 24 uur nodig hebben om alle apps en services te bereiken.",
  "Valt een gebruiker onder meerdere labelpolicies, dan wint voor instellingen de policy met de hoogste prioriteit (onderaan in de lijst).",
  "Labelprioriteit: het laatste label in de lijst is het meest gevoelig; gebruikt voor de justificatie bij ‘lager classificeren’ (niet tussen sublabels van hetzelfde hoofdlabel – die delen de prioriteit van hun parent), bij auto-labeling (laatste label, daarna laatste sublabel wint) en bij overerving van bijlagen.",
];

/* ---------- Tenantvoorwaarden ---------- */
function anyDlp(st, dom) {
  const d = (CATALOG.dlpDomains || []).find((x) => x.key === dom);
  const locs = d ? d.locations : [];
  const viaLabel = st.labels.some((l) => l.cfg && l.cfg.dlp && l.cfg.dlp[dom] && l.cfg.dlp[dom].action && l.cfg.dlp[dom].action !== "off");
  const viaCustom = (st.customDlp || []).some((p) => (p.locations || []).some((x) => locs.includes(x)));
  return viaLabel || viaCustom;
}
const _anyLabel = (st, fn) => st.labels.some((l) => l.cfg && fn(l.cfg, l));
/** Is er een label met BSN- of gezondheidsgerelateerde informatietypen? */
const _healthLabels = (st) => st.labels.some((l) => (l.sits || []).some((id) => { const x = (st.sits || []).find((y) => y.id === id); return x && /bsn|burgerservice|citizen service|gezondheid|medisch|medical|health|patiënt|patient/i.test(`${x.ref || ""} ${x.id || ""} ${x.name || ""}`); }));
CATALOG.tenantChecks = [
  { id: "audit", effort: "±15 min", who: "IT-beheer", group: "Basis", name: "Zet Unified audit log aan", desc: "Nodig voor Activity explorer, DLP-alerts, auto-labeling-simulatie en rapportage.", ps: "Set-AdminAuditLogConfig -UnifiedAuditLogIngestionEnabled $true", learn: "audit", req: true, when: () => true },
  { id: "spo", effort: "±15 min", who: "IT-beheer", group: "Labels", name: "Schakel labels voor Office-bestanden in SharePoint en OneDrive in", desc: "Zodat SharePoint/OneDrive gelabelde en versleutelde bestanden kan doorzoeken, co-authoren, en auto-labeling/DLP de inhoud kan lezen.", ps: "Set-SPOTenant -EnableAIPIntegration $true", learn: "labelsSpo", req: true, when: (st) => st.labels.length > 0 },
  { id: "pdf", effort: "±5 min", who: "IT-beheer", group: "Labels", name: "Schakel labels voor PDF in SharePoint/OneDrive in", desc: "Labelen en encryptie van PDF-bestanden in SharePoint en OneDrive.", ps: "Set-SPOTenant -EnableSensitivityLabelForPDF $true", learn: "labelsSpo", req: false, when: (st) => st.labels.length > 0 },
  { id: "coauth", effort: "±30 min (incl. afweging)", who: "IT-beheer", group: "Labels", name: "Overweeg co-authoring voor versleutelde bestanden", desc: "Gelijktijdig bewerken en AutoSave van versleutelde Office-bestanden. Let op: wijzigt de metadata-opslag van labels; niet met DKE of expiry.", ps: "Set-PolicyConfig -EnableLabelCoauth $true", learn: "labelsCoauth", req: false, when: (st) => _anyLabel(st, (c) => c.encryption.mode === "assignNow") },
  { id: "rms", effort: "±10 min", who: "IT-beheer", group: "Labels", name: "Controleer dat Azure Rights Management actief is", desc: "De protection service moet geactiveerd zijn voor labels met encryptie (standaard actief in nieuwe tenants).", ps: "Connect-AipService; Get-AipService", learn: "labelsEncryption", req: true, when: (st) => _anyLabel(st, (c) => c.encryption.mode === "assignNow" || c.encryption.mode === "userDefined") },
  { id: "b2b", effort: "±1 uur", who: "IT-beheer", group: "Labels", name: "Regel cross-tenant access voor externe ontvangers", desc: "Externe partners (domeinen of any authenticated users) moeten zich kunnen authenticeren; controleer Entra cross-tenant access settings en eventueel Conditional Access voor ‘Microsoft Rights Management Services’.", ps: "# Entra admin center › External Identities › Cross-tenant access settings", learn: "labelsEncryption", req: false, when: (st) => _anyLabel(st, (c) => c.encryption.mode === "assignNow" && c.encryption.permissions.some((p) => p.type === "domain" || p.type === "authenticated" || p.type === "partner")) },
  { id: "ome", effort: "±15 min", who: "IT-beheer", group: "Labels", name: "Controleer Message Encryption (OME) voor e-mail naar externen", desc: "Encrypt-Only, Do Not Forward en DLP-actie ‘Encrypt’ gebruiken Microsoft Purview Message Encryption.", ps: "Get-IRMConfiguration | Format-List AzureRMSLicensingEnabled", learn: "ome", req: false, when: (st) => _anyLabel(st, (c) => c.encryption.mode === "userDefined") || st.labels.some((l) => l.cfg.dlp.exchange.action === "encrypt") },
  { id: "containers", effort: "±30 min", who: "IT-beheer", group: "Labels", name: "Schakel labels voor Groups & sites in", desc: "Entra ID-groepsinstelling EnableMIPLabels = True en daarna de labels synchroniseren.", ps: "# Entra: Group.Unified › EnableMIPLabels = True\nConnect-IPPSSession; Execute-AzureADLabelSync", learn: "labelsContainers", req: true, when: (st) => _anyLabel(st, (c) => c.scope.sites) },
  { id: "meetings", effort: "licentie + ±15 min", who: "IT-beheer", group: "Labels", name: "Wijs Teams Premium toe aan meeting-organisatoren", desc: "Watermerk, end-to-end encryptie, kopieerbescherming en ‘wie mag opnemen’ vereisen Teams Premium voor de organisator.", ps: "# Licentiecontrole: Teams Premium toegewezen aan organisatoren", learn: "labelsMeetings", req: false, when: (st) => _anyLabel(st, (c) => c.scope.meetings && (c.meetings.e2ee || c.meetings.watermarkScreen || c.meetings.watermarkVideo || c.meetings.preventCopyChat || c.meetings.whoCanRecord !== "default")) },
  { id: "schematized", effort: "–", who: "IT-beheer", group: "Labels", name: "Labels voor schematized data assets (Data Map)", desc: "Opgegaan in ‘Files & other data assets’.", ps: "", learn: "labelsSchematized", req: false, when: () => false },
  { id: "powerbi", effort: "±15 min", who: "IT-beheer", group: "Labels", name: "Schakel sensitivity labels in Fabric / Power BI in", desc: "Fabric admin portal › Tenant settings › Information protection › ‘Allow users to apply sensitivity labels for content’.", ps: "# Fabric admin portal (geen PowerShell)", learn: "labelsPowerBI", req: false, when: (st) => anyDlp(st, "fabric") || st.labelPolicies.some((p) => p.settings && (p.settings.mandatoryFabric || p.settings.defaultFabric)) },
  { id: "devices", effort: "½–2 dagen", who: "IT-beheer", group: "DLP", name: "Onboard apparaten voor Endpoint DLP", desc: "Windows 10/11 en macOS onboarden (Intune, GPO, script of via Defender for Endpoint) en ‘Device onboarding’ inschakelen in Purview-instellingen.", ps: "# Purview › Settings › Device onboarding › Turn on device onboarding", learn: "deviceOnboarding", req: true, when: (st) => anyDlp(st, "endpoint") },
  { id: "browser", effort: "±2 uur", who: "IT-beheer", group: "DLP", name: "Rol Edge for Business of de Purview-browserextensie uit", desc: "Microsoft Edge ondersteunt Endpoint DLP native; Chrome en Firefox vereisen de Microsoft Purview-extensie.", ps: "# Intune/GPO: forceer de Microsoft Purview-extensie in Chrome/Firefox", learn: "chromeExt", req: false, when: (st) => anyDlp(st, "endpoint") },
  { id: "scanner", effort: "1–2 dagen", who: "IT-beheer", group: "DLP", name: "Installeer de Information Protection scanner (on-premises)", desc: "De scanner moet geïnstalleerd en geconfigureerd zijn (content scan job met ‘Enable DLP policy rules’).", ps: "Install-Scanner; Set-ScannerConfiguration", learn: "dlpOnprem", req: true, when: (st) => anyDlp(st, "onprem") },
  { id: "mdca", effort: "±½ dag", who: "Security", group: "DLP", name: "Koppel Defender for Cloud Apps voor Instances", desc: "App connectors in Defender for Cloud Apps voor niet-Microsoft cloud-apps (locatie wordt uitgefaseerd).", ps: "# Defender portal › Cloud apps › Connected apps", learn: "dlpInstances", req: true, when: (st) => anyDlp(st, "instances") },
  { id: "copilot", effort: "±1 uur", who: "Security", group: "DLP", name: "Controleer Copilot-licenties en zet DSPM for AI aan", desc: "Copilot-DLP werkt voor gebruikers met Copilot/Copilot Chat; gebruik DSPM for AI voor inzicht en aanbevolen policies.", ps: "# Purview › DSPM for AI › Recommendations", learn: "dspmAi", req: false, when: (st) => anyDlp(st, "copilot") },
  { id: "alerts", effort: "±1 uur", who: "Security", group: "DLP", name: "Beleg ontvangers en afhandeling van DLP-alerts", desc: "Wie behandelt alerts en incidentrapporten (SOC / privacy officer)? Leg rollen (DLP Compliance Management / Alert viewer) en proces vast.", ps: "# Purview › Roles & scopes › Role groups", learn: "dlpAlerts", req: false, when: (st) => !_healthLabels(st) && st.labels.some((l) => l.cfg.notify.alert !== "none" || l.cfg.notify.incidentReport) },
  { id: "alerts-req", effort: "±1 uur", who: "Security", group: "DLP", name: "Beleg ontvangers en afhandeling van DLP-alerts (BSN/gezondheidsgegevens)", desc: "Er zijn labels met BSN- of gezondheidsgegevens: leg vast wie DLP-alerts en incidentrapporten behandelt (FG / SOC), vul de alertontvangers in en beschrijf het proces voor de meldplicht datalekken (72 uur, AP).", ps: "# Purview › Roles & scopes › Role groups; DLP-regels: -GenerateAlert / -GenerateIncidentReport <ontvangers>", learn: "dlpAlerts", req: true, when: (st) => _healthLabels(st) },
  { id: "labelscheme", effort: "±15 min", who: "Pink Elephant", group: "Labels", name: "Controleer of de tenant het nieuwe labelschema met label groups gebruikt", desc: "Tenants vanaf 1 oktober 2025 gebruiken automatisch label groups in plaats van parent labels; bestaande tenants migreren via een melding in het Purview-portal (onomkeerbaar). Een label group heeft alleen naam, beschrijving, kleur en prioriteit – instellingen staan op de labels in de groep.", ps: "# Purview › Information Protection › Sensitivity labels: banner ‘label groups’ / migratie", learn: "labelGroups", req: false, when: (st) => st.labels.some((l) => l.parentId) },
  { id: "auditret", effort: "±1 uur", who: "Security", group: "Basis", name: "Audit-logretentie conform eigen logbeleid / NEN 7513 (Audit Premium of SIEM)", desc: "NEN 7510/7513 vraagt dat toegang tot patiëntgegevens herleidbaar is en lang genoeg wordt bewaard. Audit (Standard) bewaart standaard 180 dagen; stel met Audit Premium een audit log retention policy in of exporteer naar een SIEM (bijv. Microsoft Sentinel).", ps: "# Audit Premium: New-UnifiedAuditLogRetentionPolicy -Name 'NEN 7513' -RetentionDuration TwelveMonths -Priority 100  # langer (TenYears) vereist de 10-Year Audit Log Retention add-on", learn: "auditRetention", req: true, when: (st) => (st.meta || {}).framework === "nen7510" },
  { id: "auditret-opt", effort: "±1 uur", who: "Security", group: "Basis", name: "Audit-logretentie afstemmen op het eigen logbeleid", desc: "Audit (Standard) bewaart standaard 180 dagen. Past dat niet bij het logbeleid (bijv. BIO of ISO/IEC 27001), stel dan met Audit Premium een retentiebeleid in of exporteer naar een SIEM.", ps: "# Audit Premium: New-UnifiedAuditLogRetentionPolicy …", learn: "auditRetention", req: false, when: (st) => ["bio", "iso27001"].includes((st.meta || {}).framework) },
];
