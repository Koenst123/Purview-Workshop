/* Catalogus – Data Loss Prevention: locaties, condities, acties, meldingen, endpoint, Copilot.
   Bron: ‘Data Loss Prevention policy reference’ en ‘Configure endpoint DLP settings’ (Microsoft Learn). */

CATALOG.dlpLocations = [
  { key: "exchange", name: "Exchange email", short: "Exchange", icon: "mail", lic: "e3", ps: "ExchangeLocation", include: "Distribution groups / security groups", labelCond: true, override: true },
  { key: "sharepoint", name: "SharePoint sites", short: "SharePoint", icon: "site", lic: "e3", ps: "SharePointLocation", include: "Sites", labelCond: true, override: true },
  { key: "onedrive", name: "OneDrive accounts", short: "OneDrive", icon: "cloud", lic: "e3", ps: "OneDriveLocation", include: "Users / groups", labelCond: true, override: true },
  { key: "teams", name: "Teams chat and channel messages", short: "Teams", icon: "teams", lic: "e5dlp", ps: "TeamsLocation", include: "Users / groups", labelCond: false, override: true },
  { key: "devices", name: "Devices", short: "Endpoint", icon: "laptop", lic: "e5dlp", ps: "EndpointDlpLocation", include: "Users / groups / device groups", labelCond: true, override: true },
  { key: "instances", name: "Instances", short: "Cloud-apps (MDCA)", icon: "app", lic: "mdca", ps: "ThirdPartyAppDlpLocation", include: "App-instanties", labelCond: true, override: false, retiring: "De locatie Instances wordt per 6 januari 2027 uitgefaseerd.", note: "Het script gebruikt hier alleen e-mailnotificatie; governance-acties (bijv. externe gebruikers verwijderen) stel je in via het portal / Defender for Cloud Apps." },
  { key: "onprem", name: "On-premises repositories", short: "On-premises", icon: "server", lic: "scanner", ps: "OnPremisesScannerDlpLocation", include: "Repositories", labelCond: true, override: false, note: "Geen gebruikersmeldingen of policy tips (Learn: DLP policy reference). Toegang blokkeren of naar een quarantainemap verplaatsen stel je in het portal in." },
  { key: "fabric", name: "Fabric and Power BI workspaces", short: "Fabric/Power BI", icon: "powerbi", lic: "e5dlp", ps: "PowerBIDlpLocation", include: "Workspaces", labelCond: true, override: true, solo: true },
  { key: "copilot", name: "Microsoft 365 Copilot and Copilot Chat", short: "Copilot", icon: "sparkle", lic: "copilot", ps: "Locations", include: "Users / groups", labelCond: true, override: false, solo: true },
];

/* Ontwerpbord-DLP-domeinen → Purview-locaties (één policy per domein, optioneel samengevoegd) */
CATALOG.dlpDomains = [
  { key: "exchange", name: "E-mail", short: "E-mail", locations: ["exchange"], icon: "mail", mergeable: true },
  { key: "sharing", name: "Delen (SharePoint & OneDrive)", short: "SPO/OD", locations: ["sharepoint", "onedrive"], icon: "share", mergeable: true },
  { key: "teams", name: "Teams chat & kanalen", short: "Teams", locations: ["teams"], icon: "teams", mergeable: true },
  { key: "endpoint", name: "Endpoint (apparaten)", short: "Endpoint", locations: ["devices"], icon: "laptop" },
  { key: "onprem", name: "On-premises repositories", short: "On-prem", locations: ["onprem"], icon: "server" },
  { key: "fabric", name: "Fabric & Power BI", short: "Fabric", locations: ["fabric"], icon: "powerbi" },
  { key: "instances", name: "Niet-Microsoft cloud-apps (Instances)", short: "Cloud-apps", locations: ["instances"], icon: "app" },
  { key: "copilot", name: "Microsoft 365 Copilot & Copilot Chat", short: "Copilot", locations: ["copilot"], icon: "sparkle" },
];

CATALOG.dlpModes = [
  { key: "simulation", nl: "Simulatie: gebruikers merken niets", name: "Run the policy in simulation mode", ps: "TestWithoutNotifications", desc: "Alleen evalueren en rapporteren; geen gevolgen voor gebruikers." },
  { key: "simulationTips", nl: "Simulatie met policy tips", name: "Run the policy in simulation mode and show policy tips while in simulation mode", ps: "TestWithNotifications", desc: "Gebruikers zien policy tips (geen blokkade) – ideaal voor bewustwording." },
  { key: "enable", nl: "Direct handhaven", name: "Turn it on right away", ps: "Enable", desc: "Handhaven: acties worden uitgevoerd." },
  { key: "disable", nl: "Uit", name: "Keep it off", ps: "Disable", desc: "Policy bestaat maar is uitgeschakeld." },
];

CATALOG.dlpTemplates = [
  { key: "custom", name: "Custom policy", desc: "Zelf condities en acties opbouwen (aanbevolen voor label-gedreven DLP)." },
  { key: "gdpr", name: "General Data Protection Regulation (GDPR)", desc: "Privacy-template met EU-persoonsgegevens, incl. de Nederlandse SIT’s (BSN, fiscaal nummer, paspoort, rijbewijs)." },
  { key: "gdpr-enh", name: "General Data Protection Regulation (GDPR) Enhanced", desc: "Uitgebreide GDPR-template (~190 SIT’s, alle EU-landen) plus trainable classifiers." },
  { key: "pci", name: "PCI Data Security Standard (PCI DSS)", desc: "Financial-template voor creditcardgegevens." },
];
CATALOG.dlpTemplateNote = "Er bestaat géén Nederlands-specifieke DLP-template. Gebruik GDPR (Enhanced) of – aanbevolen voor label-gedreven DLP – een Custom policy met de Nederlandse SIT’s. Templates bevatten standaard twee rules: ‘low count’ (1–9 instanties → melding) en ‘high count’ (10+ → blokkeren met override, incident report). Fabric/Power BI, Copilot en cloud-apps ondersteunen alleen Custom.";
CATALOG.dlpAdminUnitLocations = ["exchange", "sharepoint", "onedrive", "teams", "devices"];

/* Condities (en exceptions) – loc = locaties waar beschikbaar */
const X = ["exchange"], SPOD = ["sharepoint", "onedrive"], M365 = ["exchange", "sharepoint", "onedrive", "teams"];
CATALOG.dlpConditions = [
  { key: "contentContains", name: "Content contains", loc: ["exchange", "sharepoint", "onedrive", "teams", "devices", "instances", "onprem", "fabric", "copilot"], value: "classifiers", ps: "ContentContainsSensitiveInformation", desc: "Sensitive info types, sensitivity labels en/of trainable classifiers (groepen met AND/OR)." },
  { key: "accessScope", name: "Content is shared from Microsoft 365", loc: M365, value: "enum", options: [["NotInOrganization", "with people outside my organization"], ["InOrganization", "only with people inside my organization"]], ps: "AccessScope" },
  { key: "notLabeled", name: "Content is not labeled", loc: ["exchange", "devices"], value: "none", ps: "ContentIsNotLabeled", noExcept: true },
  { key: "irmRisk", name: "Insider risk level for Adaptive Protection is", loc: ["exchange", "teams", "devices"], value: "enum", options: [["Elevated", "Elevated risk level"], ["Moderate", "Moderate risk level"], ["Minor", "Minor risk level"]], ps: "AdvancedRule (InsiderRiskLevel)", lic: "e5", desc: "Vereist Insider Risk Management met Adaptive Protection (aparte Purview-oplossing, buiten deze workshop)." },
  { key: "fromScope", name: "Sender is", loc: X, value: "enum", options: [["InOrganization", "Inside the organization"], ["NotInOrganization", "Outside the organization"]], ps: "FromScope" },
  { key: "from", name: "Sender is (specific users)", loc: ["exchange", "teams"], value: "list", ps: "From" },
  { key: "fromMemberOf", name: "Sender is a member of", loc: X, value: "list", ps: "FromMemberOf" },
  { key: "senderDomain", name: "Sender domain is", loc: ["exchange", "teams"], value: "list", ps: "SenderDomainIs" },
  { key: "fromAddrWords", name: "Sender address contains words", loc: X, value: "list", ps: "FromAddressContainsWords" },
  { key: "fromAddrPat", name: "Sender address matches patterns", loc: X, value: "list", ps: "FromAddressMatchesPatterns" },
  { key: "senderIp", name: "Sender IP address is", loc: X, value: "list", ps: "SenderIPRanges" },
  { key: "senderOverride", name: "Has sender overridden the policy tip", loc: X, value: "none", ps: "HasSenderOverride" },
  { key: "sentTo", name: "Recipient is", loc: ["exchange", "teams"], value: "list", ps: "SentTo" },
  { key: "sentToMemberOf", name: "Recipient is a member of", loc: X, value: "list", ps: "SentToMemberOf" },
  { key: "recipientDomain", name: "Recipient domain is", loc: ["exchange", "teams"], value: "list", ps: "RecipientDomainIs" },
  { key: "recipAddrWords", name: "Recipient address contains words", loc: X, value: "list", ps: "AnyOfRecipientAddressContainsWords" },
  { key: "recipAddrPat", name: "Recipient address matches patterns", loc: X, value: "list", ps: "AnyOfRecipientAddressMatchesPatterns" },
  { key: "subjectWords", name: "Subject contains words or phrases", loc: X, value: "list", ps: "SubjectContainsWords" },
  { key: "subjectPat", name: "Subject matches patterns", loc: X, value: "list", ps: "SubjectMatchesPatterns" },
  { key: "subjBodyWords", name: "Subject or body contains words or phrases", loc: X, value: "list", ps: "SubjectOrBodyContainsWords" },
  { key: "subjBodyPat", name: "Subject or body matches patterns", loc: X, value: "list", ps: "SubjectOrBodyMatchesPatterns" },
  { key: "headerWords", name: "Header contains words or phrases", loc: X, value: "kv", ps: "HeaderContainsWords" },
  { key: "charset", name: "Content character set contains words", loc: X, value: "list", ps: "ContentCharacterSetContainsWords" },
  { key: "msgSize", name: "Message size equals or is greater than", loc: X, value: "size", ps: "MessageSizeOver" },
  { key: "msgType", name: "Message type is", loc: X, value: "enum", options: [["Encrypted", "Encrypted"], ["Signed", "Signed"], ["PermissionControlled", "Permission controlled"], ["AutoForward", "Auto-forward"]], ps: "MessageTypeMatches" },
  { key: "importance", name: "Message importance is", loc: X, value: "enum", options: [["High", "High"], ["Normal", "Normal"], ["Low", "Low"]], ps: "WithImportance" },
  { key: "extension", name: "File extension is / Attachment's file extension is", loc: ["exchange", "sharepoint", "onedrive", "devices"], value: "list", ps: "ContentExtensionMatchesWords" },
  { key: "docName", name: "Document name contains words or phrases", loc: ["exchange", "sharepoint", "onedrive", "devices"], value: "list", ps: "DocumentNameMatchesWords" },
  { key: "docNamePat", name: "Document name matches patterns", loc: ["exchange", "sharepoint", "onedrive", "devices"], value: "list", ps: "DocumentNameMatchesPatterns" },
  { key: "docProperty", name: "Document property is", loc: ["exchange", "sharepoint", "onedrive", "devices"], value: "kv", ps: "ContentPropertyContainsWords" },
  { key: "docSize", name: "Document size equals or is greater than", loc: ["exchange", "sharepoint", "onedrive", "devices"], value: "size", ps: "DocumentSizeOver" },
  { key: "docWords", name: "Document content contains words or phrases", loc: X, value: "list", ps: "DocumentContainsWords" },
  { key: "docPat", name: "Document content matches patterns", loc: X, value: "list", ps: "DocumentMatchesPatterns" },
  { key: "pwdProtected", name: "Document or attachment is password protected", loc: ["exchange", "sharepoint", "onedrive", "devices"], value: "none", ps: "DocumentIsPasswordProtected" },
  { key: "unsupported", name: "Document or attachment couldn't be scanned", loc: ["exchange", "sharepoint", "onedrive", "devices"], value: "none", ps: "DocumentIsUnsupported" },
  { key: "limitExceeded", name: "Document or attachment didn't complete scanning", loc: ["exchange", "sharepoint", "onedrive", "devices"], value: "none", ps: "ProcessingLimitExceeded" },
  { key: "createdBy", name: "Document created by", loc: SPOD, value: "list", ps: "DocumentCreatedBy" },
  { key: "createdByMemberOf", name: "Document created by a member of", loc: SPOD, value: "list", ps: "DocumentCreatedByMemberOf" },
];

/* Acties */
CATALOG.dlpActions = [
  { key: "restrictAccess", name: "Restrict access or encrypt the content in Microsoft 365 locations", loc: ["exchange", "sharepoint", "onedrive", "teams", "fabric"], value: "enum",
    options: [["All", "Block everyone"], ["PerUser", "Block only people outside your organization"], ["PerAnonymousUser", "Block only people who were given access to the content through the \"Anyone with the link\" option"]],
    desc: "Block users from receiving email, or accessing shared SharePoint, OneDrive, and Teams files, and Power BI items.", ps: "BlockAccess / BlockAccessScope" },
  { key: "encrypt", name: "Encrypt email messages (Microsoft Purview Message Encryption)", loc: X, value: "enum", options: [["Encrypt", "Encrypt"], ["Do Not Forward", "Do Not Forward"]], ps: "EncryptRMSTemplate" },
  { key: "removeEncrypt", name: "Remove email encryption", loc: X, value: "none", ps: "RemoveRMSTemplate" },
  { key: "prependSubject", name: "Prepend email subject", loc: X, value: "text", ps: "PrependSubject" },
  { key: "modifySubject", name: "Modify email subject", loc: X, value: "kv", ps: "ModifySubject" },
  { key: "disclaimer", name: "Apply HTML disclaimer", loc: X, value: "text", ps: "ApplyHtmlDisclaimer" },
  { key: "setHeader", name: "Set headers", loc: X, value: "kv", ps: "SetHeader" },
  { key: "removeHeader", name: "Remove header", loc: X, value: "text", ps: "RemoveHeader" },
  { key: "redirect", name: "Redirect the message to specific users", loc: X, value: "list", ps: "RedirectMessageTo" },
  { key: "moderateManager", name: "Forward the message for approval to sender's manager", loc: X, value: "none", ps: "Moderate (ModerateMessageByManager)" },
  { key: "moderateUser", name: "Forward the message for approval to specific approvers", loc: X, value: "list", ps: "Moderate (ModerateMessageByUser)" },
  { key: "addRecipients", name: "Add recipients", loc: X, value: "list", ps: "AddRecipients" },
  { key: "quarantine", name: "Deliver the message to the hosted quarantine", loc: X, value: "none", ps: "Quarantine" },
  { key: "endpoint", name: "Audit or restrict activities on devices", loc: ["devices"], value: "endpoint", ps: "EndpointDlpRestrictions" },
  { key: "onpremBlock", name: "Restrict access or remove on-premises files", loc: ["onprem"], value: "enum", options: [["block", "Block people from accessing file stored in on-premises scanner"], ["blockAll", "Block everyone"], ["move", "Move file from where it's stored to a quarantine folder"]], ps: "(portal)" },
  { key: "copilotExclude", name: "Prevent Copilot from processing content", loc: ["copilot"], value: "none", ps: "RestrictAccess (ExcludeContentProcessing)" },
  { key: "instancesGovern", name: "Restrict third-party apps (Defender for Cloud Apps governance)", loc: ["instances"], value: "enum", options: [["notify", "Notify owner"], ["removeExternal", "Remove external users"], ["private", "Make private"], ["quarantine", "Put in admin quarantine"]], ps: "(portal / MDCA)" },
];

/* Endpoint-activiteiten (Audit or restrict activities on devices) */
CATALOG.endpointActivities = [
  { key: "cloud", nl: "Uploaden naar een niet-toegestane website of openen in een niet-toegestane browser", name: "Upload to a restricted cloud service domain or access from an unallowed browser", group: "Service domain and browser activities", icon: "cloud", ps: "CloudEgress", desc: "Uploaden naar niet-toegestane domeinen (bijv. persoonlijke cloudopslag, AI-sites) of openen met een niet-toegestane browser." },
  { key: "paste", nl: "Plakken in een browser, bijvoorbeeld in een AI-chatsite", name: "Paste to supported browsers", group: "Service domain and browser activities", icon: "clipboard", ps: "PasteToBrowser", desc: "Plakken van gevoelige inhoud in een browser (bijv. in een generatieve-AI-site)." },
  { key: "clipboard", nl: "Kopiëren naar het klembord", name: "Copy to clipboard", group: "File activities for all apps", icon: "copy", ps: "CopyPaste", desc: "Kopiëren van gevoelige inhoud naar het klembord." },
  { key: "usb", nl: "Kopiëren naar een USB-stick of externe schijf", name: "Copy to a removable USB device", group: "File activities for all apps", icon: "usb", ps: "RemovableMedia", desc: "Kopiëren naar USB-sticks/externe schijven." },
  { key: "network", nl: "Kopiëren naar een netwerkmap", name: "Copy to a network share", group: "File activities for all apps", icon: "network", ps: "NetworkShare", desc: "Kopiëren naar netwerkshares (UNC)." },
  { key: "print", nl: "Afdrukken", name: "Print", group: "File activities for all apps", icon: "printer", ps: "Print", desc: "Afdrukken (lokaal/netwerk/PDF-printers)." },
  { key: "bluetooth", nl: "Versturen via Bluetooth", name: "Copy or move using unallowed Bluetooth app", group: "File activities for all apps", icon: "bluetooth", ps: "UnallowedBluetoothTransferApps", desc: "Overdracht via Bluetooth met niet-toegestane apps." },
  { key: "rdp", nl: "Kopiëren naar een extern bureaublad (RDP)", name: "Copy or move using RDP", group: "File activities for all apps", icon: "rdp", ps: "RemoteDesktopServices", desc: "Kopiëren naar een remote desktop-sessie." },
  { key: "apps", nl: "Openen met een niet-toegestane app", name: "Access by restricted apps", group: "Restricted app activities", icon: "app", ps: "UnallowedApps", desc: "Openen/verwerken door restricted apps (bijv. persoonlijke sync-clients, ongeautoriseerde AI-tools)." },
];
/* Preview-activiteiten: alleen ter informatie (niet in de matrix; instellen in het portal). Learn: endpoint-dlp-learn-about. */
CATALOG.endpointPreviewActivities = [
  { key: "recall", nl: "Opnemen in Windows Recall-momentopnamen", name: "Create Windows Recall snapshots (preview)", icon: "laptop", desc: "Detecteert (en kan beperken) dat een item of Teams-bericht met een gevoelig informatietype of label in een Windows Recall-momentopname terechtkomt (Copilot+ pc’s). Instellen in het portal." },
];
CATALOG.endpointLevels = [
  ["off", "Geen controle", 0, "Off"],
  ["audit", "Alleen registreren", 1, "Audit only"],
  ["warn", "Blokkeren met override", 2, "Block with override"],
  ["block", "Blokkeren", 3, "Block"],
];
CATALOG.endpointPsValue = { audit: "Audit", warn: "Warn", block: "Block" };

/* Endpoint DLP settings (Settings › Data Loss Prevention › Endpoint settings) */
CATALOG.endpointSettingSections = [
  { key: "advancedClassification", name: "Advanced classification scanning and protection", type: "toggle", desc: "Inhoud wordt naar de cloud-classificatieservice gestuurd zodat EDM, trainable classifiers, credential classifiers en named entities ook op apparaten werken (vereist voor credential-SIT’s op apparaten). Instelbare bandbreedtelimiet per apparaat per 24 uur; tekstbestanden max. 64 MB. ‘Paste to supported browsers’ ondersteunt geen advanced classification.", rec: true },
  { key: "advancedLabelProtection", name: "Advanced label-based protection for all files on devices", type: "toggle", desc: "Gebruikers werken lokaal met gelabelde bestanden; DLP dwingt toegang af en versleutelt bij uitstroom (alleen Windows).", preview: true },
  { key: "alwaysAudit", name: "Always audit file activity for devices", type: "toggle", desc: "Standaard aan: Office-, PDF- en CSV-activiteit (aanmaken, wijzigen, hernoemen, naar USB/netwerkshare) wordt op alle onboarded apparaten geaudit, ook zonder policy-match.", rec: true },
  { key: "networkShareCoverage", name: "Network share coverage and exclusions", type: "toggle", desc: "Endpoint DLP-policies (en JIT) ook toepassen op nieuwe/gewijzigde bestanden op netwerkshares en gemapte schijven.", rec: true },
  { key: "fileEvidence", name: "Setup evidence collection for file activities on devices", type: "toggle", desc: "Kopie van het bestand bij een match vastleggen in Azure Storage (customer managed of Microsoft managed); lokale cache 7, 30 of 60 dagen. Per regel kies je de activiteiten.", needs: "evidenceStorage" },
  { key: "jitProtection", name: "Just-in-time protection", type: "toggle", desc: "Blokkeert uitstroom (USB, netwerkshare, print, RDP, Bluetooth, cloud-upload) van nog niet geëvalueerde bestanden totdat de policy-evaluatie klaar is; klembord wordt alleen geaudit." },
  { key: "archiveSupport", name: "Endpoint DLP support for archived files", type: "toggle", desc: "Archiefbestanden (.zip, .rar, .7z, .tar, .gz, …) worden als item gemonitord op Windows en macOS." },
  { key: "ocr", name: "Optical character recognition (OCR)", type: "toggle", desc: "Tekst in afbeeldingen (JPEG, PNG, BMP, TIFF, PDF) herkennen; ingesteld onder Settings › Optical character recognition met locatie Devices. OCR vereist pay-as-you-go-facturering (controleer in de portal).", lic: "payg" },
];
CATALOG.endpointGroups = [
  { key: "usbGroups", name: "Removable storage device groups", icon: "usb", fields: ["Storage device friendly name", "USB vendor ID", "USB product ID", "Serial number ID", "Device ID", "Instance path ID", "Hardware ID"], limit: "Max. 20 groepen, 50 apparaten per groep", ph: "Bijv. ‘Versleutelde bedrijfs-USB’ – Vendor ID 0951", desc: "Groepen van toegestane/afwijkend behandelde USB-apparaten." },
  { key: "printerGroups", name: "Printer groups", icon: "printer", fields: ["Friendly printer name", "USB printer", "IP range", "Print to file", "Universal print deployed on a printer", "Corporate printer", "Print to local"], limit: "Max. 20 groepen, 50 printers per groep", ph: "Bijv. ‘Bedrijfsprinters’ – corporate printer", desc: "Bijv. bedrijfsprinters toestaan, overige printers blokkeren." },
  { key: "networkShareGroups", name: "Network share groups", icon: "network", fields: ["Network share path (prefix)"], ph: "\\\\fileserver\\afdelingen", desc: "Bijv. bedrijfsshares toestaan, overige shares blokkeren." },
  { key: "sensitiveDomainGroups", name: "Sensitive service domain groups", icon: "globe", fields: ["Sensitive service domain", "Match type (URL / IP address)"], limit: "Max. 150 groepen, 100 websites per groep (globale lijst Sensitive service domains: max. 50 domeinen)", ph: "*.chatgpt.com, *.gemini.google.com", desc: "Groepen domeinen met afwijkende acties (bijv. generatieve AI-sites, persoonlijke webmail)." },
  { key: "restrictedAppGroups", name: "Restricted app groups", icon: "app", fields: ["App name", "Executable (Windows) / full path (macOS)"], limit: "Max. 10 groepen, 50 apps per groep", ph: "Dropbox.exe; GoogleDriveFS.exe", desc: "Groepen apps met eigen restricties." },
];
CATALOG.endpointLists = [
  { key: "restrictedApps", name: "Restricted apps", ph: "Bijv. Dropbox.exe", desc: "Apps die gevoelige bestanden niet mogen openen/verwerken (Access by restricted apps)." },
  { key: "unallowedBrowsers", name: "Unallowed browsers", ph: "Bijv. brave.exe, opera.exe", desc: "Browsers die geblokkeerd worden voor gevoelige bestanden; Edge, Chrome (extensie) en Firefox (extensie) zijn ondersteund." },
  { key: "serviceDomains", name: "Service domains", ph: "Bijv. *.dropbox.com", desc: "Max. 50 domeinen; Allow- of Block-modus voor uploads via Edge en Chrome/Firefox met Purview-extensie." },
  { key: "unallowedBluetoothApps", name: "Unallowed Bluetooth apps", ph: "Bijv. fsquirt.exe", desc: "Apps die geen gevoelige bestanden via Bluetooth mogen versturen." },
  { key: "pathExclusionsWin", name: "File path exclusions for Windows", ph: "C:\\Users\\*\\Desktop\\", desc: "Paden die niet worden geaudit/geëvalueerd (ook niet voor OCR). Wildcards en omgevingsvariabelen toegestaan." },
  { key: "pathExclusionsMac", name: "File path exclusions for Mac", ph: "/System", desc: "Paden die niet worden gemonitord (macOS)." },
  { key: "vpnAddresses", name: "VPN settings (Server address / Network address)", ph: "vpn.bedrijf.nl", desc: "Afwijkende acties als het apparaat via deze VPN verbonden is (alleen Windows). Waarden uit Get-VpnConnection." },
  { key: "networkShareExclusions", name: "Exclude these network share paths", ph: "\\\\fileserver\\scratch", desc: "Netwerkshares die buiten de network share coverage vallen." },
];

/* Meldingen, overrides, incidenten */
CATALOG.notifyTipDefault = "Dit item heeft het label ‘${label}’. Deel het alleen met mensen die het echt nodig hebben.";
/* Policy tip in gewone taal, max. 256 tekens in Purview. ${what} = "heeft het label ‘X’" of "bevat gevoelige gegevens (BSN, IBAN)".
   Geen tekst voor on-premises (geen gebruikersmeldingen of policy tips) en Instances (het script gebruikt daar alleen e-mail). */
CATALOG.notifyTipGeneric = "Dit item ${what}. Deel het alleen met mensen die het echt nodig hebben.";
CATALOG.notifyTipByDomain = {
  exchange: "Deze e-mail ${what}. Controleer de ontvangers voordat je verzendt.",
  sharing: "Dit bestand ${what}. Deel het alleen met mensen die het echt nodig hebben.",
  teams: "Dit bericht ${what}. Deel het niet met externe deelnemers.",
  endpoint: "Dit bestand ${what}. Kopiëren, uploaden of afdrukken is daarom beperkt.",
  fabric: "Dit rapport of deze dataset ${what}. Deel of exporteer het alleen als dat echt nodig is.",
};
CATALOG.overrideOptions = [
  ["none", "Geen override"],
  ["justification", "Require the person to enter a business justification for overriding the policy"],
  ["fp", "Allow the person to report a false positive and override the DLP policy"],
  ["allow", "Allow the person to override the DLP policy"],
];
CATALOG.alertOptions = [
  ["none", "Geen alert (alleen rapportage)"],
  ["every", "Send alert every time an activity matches the rule"],
  ["threshold", "Send alert when the volume of matched activities reaches a threshold"],
];
CATALOG.severities = [["Low", "Low"], ["Medium", "Medium"], ["High", "High"]];
CATALOG.notifyRecipients = [
  ["LastModifier", "The person who sent, shared, or last modified the content"],
  ["Owner", "Owner of the SharePoint site or OneDrive account"],
  ["SiteAdmin", "Owner of the SharePoint or OneDrive content"],
];
CATALOG.incidentReportContent = ["Name of the person who last modified the content", "Types of sensitive info that matched the rule", "Rule's severity level", "Name of the item", "Name of the rule that was matched", "Content that matched the rule", "The policy that was matched", "Service"];

/* Copilot-specifiek */
CATALOG.copilot = {
  ruleTypes: [
    { key: "labels", name: "Content contains › Sensitivity labels", action: "Prevent Copilot from processing content", desc: "Bestanden en e-mails (verzonden vanaf 1 januari 2025) met deze labels worden niet gebruikt in antwoorden van Microsoft 365 Copilot, Copilot Chat en Cowork; ze kunnen nog wel als bronvermelding verschijnen. Agenda-items worden niet ondersteund.", ga: true },
    { key: "web", name: "Content contains › Sensitive information types", action: "Prevent Copilot from processing content › Performing Web Searches", desc: "Prompts met deze SIT’s worden niet naar externe web search gestuurd; Copilot antwoordt alleen op basis van interne Microsoft 365-bronnen.", ga: true },
    { key: "prompts", name: "Content contains › Sensitive information types", action: "Prevent Copilot from processing content › Processing prompts", desc: "Copilot geeft géén antwoord als de prompt deze SIT’s bevat (ook geen interne of web search). Alleen built-in en custom SIT’s.", ga: false },
    { key: "external", name: "Email is received from › External users", action: "Prevent Copilot from processing content", desc: "E-mail van buiten de geaccepteerde domeinen wordt niet gebruikt voor grounding/samenvattingen (bescherming tegen prompt injection). Alleen afzender-metadata.", ga: false },
  ],
  notes: [
    "Alleen via de Custom-template; de locatie ‘Microsoft 365 Copilot and Copilot Chat’ kan niet gecombineerd worden met andere locaties en ondersteunt geen admin units. Label-regels en web search-regels zijn GA; prompt-regels en externe e-mail zijn (preview).",
    "Per regel óf een sensitivity-label-conditie óf een SIT-conditie; maak voor beide een aparte regel in dezelfde policy.",
    "Prompt-regels ondersteunen alleen built-in en custom SIT’s – geen EDM, document fingerprints of trainable classifiers. Bestanden die in een prompt worden geüpload worden niet gescand.",
    "In Word/Excel/PowerPoint wordt de label-regel geëvalueerd bij het openen van het bestand.",
    "Simulatiemodus, DLP-alerts en meldingen worden ondersteund; wijzigingen kunnen tot 4 uur duren.",
    "Copilot werkt altijd in de context van de gebruiker: alleen items waar de gebruiker al toegang toe heeft. Encryptie zonder EXTRACT-recht voorkomt eveneens dat Copilot de inhoud gebruikt.",
    "Gebruik DSPM for AI voor inzicht (one-click policies) en Insider Risk / Communication Compliance voor risicovolle prompts.",
  ],
};

/* DLP-limieten / aandachtspunten */
CATALOG.dlpLimits = [
  "Policy tips in Outlook en Office-apps vereisen ondersteunde clients; ‘Block’ zonder override toont in Outlook een NDR/melding.",
  "Een policy met meerdere locaties past álle regels toe op álle locaties; acties die een locatie niet ondersteunt, worden voor die locatie overgeslagen.",
  "Start altijd in simulatiemodus; evalueer 1–2 weken in Activity explorer en DLP-alerts voordat je handhaaft.",
  "Max. 10.000 DLP-policies en max. 600 regels per tenant (alle policies samen); max. 100 KB per policy en per regel; namen max. 64 tekens.",
  "Per bestand wordt max. 2.000.000 tekens tekst gescand en alleen de eerste 3 niveaus van ingesloten/gecomprimeerde inhoud.",
  "‘Stop processing more rules’ werkt niet in simulatiemodus; policy tips tonen alleen de meest restrictieve regel met de hoogste prioriteit.",
  "Sensitivity labels als DLP-conditie: niet beschikbaar voor Teams chat- en kanaalberichten (wel voor bestanden die in Teams gedeeld worden via SharePoint/OneDrive).",
];
