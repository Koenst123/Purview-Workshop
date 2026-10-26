/* Catalogus – basis: licenties, Microsoft Learn-links, classifier-soorten, paletten */
const CATALOG = {};
CATALOG.docsVerified = "per onderwerp; zie bronnen en technische review";

/* Licentie-badges (bron: Microsoft 365 guidance for security & compliance – service descriptions) */
CATALOG.licensing = {
  e3: { short: "E3", detail: "Microsoft 365 E3 / Office 365 E3 / Business Premium (handmatig labelen, basis-DLP voor Exchange/SharePoint/OneDrive)" },
  e5: { short: "E5", detail: "Microsoft 365 E5 / E5 Compliance / E5 Information Protection & Governance" },
  e5ip: { short: "E5 IP", detail: "Microsoft 365 E5 / E5 Compliance / E5 Information Protection & Governance (bijv. automatisch labelen, trainable classifiers, EDM)" },
  e5dlp: { short: "E5 DLP", detail: "Microsoft 365 E5 / passende Purview-add-on. Teams-chat en -kanalen worden ook ondersteund met Office 365 E5/A5/G5. Controleer per locatie de licenties; Office 365 E5 geeft niet automatisch Endpoint DLP." },
  teamsPremium: { short: "Teams Premium", detail: "Sommige meeting-labelinstellingen (o.a. watermerk, end-to-end encryptie, wie mag opnemen) vereisen Teams Premium" },
  copilot: { short: "Copilot", detail: "DLP voor Microsoft 365 Copilot: controleer de actuele Purview-servicebeschrijving en je Copilot-licenties. Promptbescherming met SIT’s is in preview; beschikbaarheid hangt af van tenant en client." },
  payg: { short: "Pay-as-you-go", detail: "Pay-as-you-go-facturering via Azure-abonnement (o.a. bepaalde Purview-functies voor AI-apps / niet-Microsoft locaties)" },
  dke: { short: "E5 + DKE", detail: "Double Key Encryption vereist Microsoft 365 E5 / E5 IP&G of EMS E5 en een zelf gehoste DKE-service" },
  mdca: { short: "MDCA", detail: "Microsoft Defender for Cloud Apps-licentie vereist voor de locatie Instances" },
  scanner: { short: "Scanner", detail: "Microsoft Purview Information Protection scanner (on-premises) vereist" },
};

/* Microsoft Learn-referenties (titel = paginatitel op Learn) */
const LEARN_BASE = "https://learn.microsoft.com/en-us/";
CATALOG.validationSources = {
  "PV-030": { ref: "labelsEncryption", date: "2026-10-26" },
  "PV-036": { ref: "labelsMeetings", date: "2026-10-26" },
  "PV-048": { ref: "labelsAuto", date: "2026-10-26" },
  "PV-057": { ref: "labelsMeetings", date: "2026-10-26" },
  "PV-058": { ref: "labelsEncryption", date: "2026-10-26" },
  "PV-088": { ref: "dlpCopilot", date: "2026-10-26" },
  "PV-089": { ref: "dlpCopilot", date: "2026-10-26" },
  "PV-090": { ref: "dlpCopilot", date: "2026-10-26" },
  "PV-094": { ref: "dlpSimulation", date: "2026-10-26" },
  "PV-110": { ref: "endpointSettings", date: "2026-10-26" },
};
CATALOG.learn = {
  labels: { title: "Learn about sensitivity labels", url: LEARN_BASE + "purview/sensitivity-labels" },
  labelsGetStarted: { title: "Get started with sensitivity labels", url: LEARN_BASE + "purview/get-started-with-sensitivity-labels" },
  labelsCreate: { title: "Create and publish sensitivity labels", url: LEARN_BASE + "purview/create-sensitivity-labels" },
  labelsEncryption: { title: "Restrict access to content by using sensitivity labels to apply encryption", url: LEARN_BASE + "purview/encryption-sensitivity-labels" },
  usageRights: { title: "Configure usage rights for Azure Information Protection", url: LEARN_BASE + "azure/information-protection/configure-usage-rights" },
  dke: { title: "Double Key Encryption", url: LEARN_BASE + "purview/double-key-encryption" },
  labelsContainers: { title: "Use sensitivity labels to protect content in Microsoft Teams, Microsoft 365 Groups, and SharePoint sites", url: LEARN_BASE + "purview/sensitivity-labels-teams-groups-sites" },
  labelsMeetings: { title: "Use sensitivity labels to protect calendar items, Teams meetings, and chat", url: LEARN_BASE + "purview/sensitivity-labels-meetings" },
  labelsAuto: { title: "Apply a sensitivity label to content automatically", url: LEARN_BASE + "purview/apply-sensitivity-label-automatically" },
  labelsOffice: { title: "Manage sensitivity labels in Office apps", url: LEARN_BASE + "purview/sensitivity-labels-office-apps" },
  labelsSpo: { title: "Enable sensitivity labels for Office files in SharePoint and OneDrive", url: LEARN_BASE + "purview/sensitivity-labels-sharepoint-onedrive-files" },
  labelsDefaultLibrary: { title: "Configure a default sensitivity label for a SharePoint document library", url: LEARN_BASE + "purview/sensitivity-labels-sharepoint-default-label" },
  labelsCoauth: { title: "Enable co-authoring for files encrypted with sensitivity labels", url: LEARN_BASE + "purview/sensitivity-labels-coauthoring" },
  labelsPowerBI: { title: "Sensitivity labels in Fabric and Power BI", url: LEARN_BASE + "fabric/governance/information-protection" },
  labelsSchematized: { title: "Labeling in the Microsoft Purview Data Map", url: LEARN_BASE + "purview/data-map-sensitivity-labels" },
  labelsAdvanced: { title: "Advanced settings for sensitivity labels (Set-Label / Set-LabelPolicy)", url: LEARN_BASE + "powershell/module/exchange/set-labelpolicy" },
  labelsCopilot: { title: "Microsoft Purview data security and compliance protections for generative AI apps", url: LEARN_BASE + "purview/ai-microsoft-purview" },
  sitDefinitions: { title: "Sensitive information type entity definitions", url: LEARN_BASE + "purview/sit-sensitive-information-type-entity-definitions" },
  sitLearn: { title: "Learn about sensitive information types", url: LEARN_BASE + "purview/sit-sensitive-information-type-learn-about" },
  sitCustom: { title: "Create a custom sensitive information type", url: LEARN_BASE + "purview/sit-create-a-custom-sensitive-information-type" },
  sitCustomPs: { title: "Create a custom sensitive information type using PowerShell", url: LEARN_BASE + "purview/sit-create-a-custom-sensitive-information-type-in-scc-powershell" },
  edm: { title: "Learn about exact data match based sensitive information types", url: LEARN_BASE + "purview/sit-learn-about-exact-data-match-based-sits" },
  fingerprint: { title: "About document fingerprinting", url: LEARN_BASE + "purview/sit-document-fingerprinting" },
  classifiers: { title: "Trainable classifiers definitions", url: LEARN_BASE + "purview/trainable-classifiers-definitions" },
  classifiersLearn: { title: "Learn about trainable classifiers", url: LEARN_BASE + "purview/trainable-classifiers-learn-about" },
  dlp: { title: "Learn about data loss prevention", url: LEARN_BASE + "purview/dlp-learn-about-dlp" },
  dlpPlan: { title: "Plan for data loss prevention (DLP)", url: LEARN_BASE + "purview/dlp-overview-plan-for-dlp" },
  dlpDesign: { title: "Design a data loss prevention policy", url: LEARN_BASE + "purview/dlp-policy-design" },
  dlpCreate: { title: "Create and deploy data loss prevention policies", url: LEARN_BASE + "purview/dlp-create-deploy-policy" },
  dlpReference: { title: "Data Loss Prevention policy reference", url: LEARN_BASE + "purview/dlp-policy-reference" },
  dlpConditions: { title: "DLP policy conditions, exceptions, and actions", url: LEARN_BASE + "purview/dlp-exchange-conditions-and-actions" },
  dlpLabelCondition: { title: "Use sensitivity labels as conditions in DLP policies", url: LEARN_BASE + "purview/dlp-sensitivity-label-as-condition" },
  dlpTips: { title: "Data loss prevention policy tip reference", url: LEARN_BASE + "purview/dlp-policy-tips-reference" },
  dlpSimulation: { title: "Learn about DLP simulation mode", url: LEARN_BASE + "purview/dlp-simulation-mode-learn" },
  dlpAlerts: { title: "Learn about data loss prevention alerts", url: LEARN_BASE + "purview/dlp-alert-investigation-learn" },
  dlpTeams: { title: "Data loss prevention and Microsoft Teams", url: LEARN_BASE + "purview/dlp-microsoft-teams" },
  endpoint: { title: "Learn about Endpoint data loss prevention", url: LEARN_BASE + "purview/endpoint-dlp-learn-about" },
  endpointSettings: { title: "Configure endpoint data loss prevention settings", url: LEARN_BASE + "purview/dlp-configure-endpoint-settings" },
  endpointUsing: { title: "Using Endpoint data loss prevention", url: LEARN_BASE + "purview/endpoint-dlp-using" },
  deviceOnboarding: { title: "Onboard Windows devices into Microsoft 365 overview", url: LEARN_BASE + "purview/device-onboarding-overview" },
  chromeExt: { title: "Learn about the Microsoft Purview extension (Chrome)", url: LEARN_BASE + "purview/dlp-chrome-learn-about" },
  firefoxExt: { title: "Get started with the Microsoft Purview Firefox extension", url: LEARN_BASE + "purview/dlp-firefox-extension-get-started" },
  dlpBrowser: { title: "Learn about Data Loss Prevention for browser activity (Edge for Business)", url: LEARN_BASE + "purview/dlp-browser-dlp-learn" },
  dlpNetwork: { title: "Learn about Data Loss Prevention for network activity", url: LEARN_BASE + "purview/dlp-network-data-security-learn" },
  dlpOnprem: { title: "Learn about the data loss prevention on-premises repositories", url: LEARN_BASE + "purview/dlp-on-premises-scanner-learn" },
  dlpFabric: { title: "Get started with data loss prevention policies for Fabric and Power BI", url: LEARN_BASE + "fabric/governance/data-loss-prevention-overview" },
  dlpInstances: { title: "Use data loss prevention policies for non-Microsoft cloud apps", url: LEARN_BASE + "purview/dlp-use-policies-non-microsoft-cloud-apps" },
  dlpCopilot: { title: "Learn about the Microsoft 365 Copilot and Copilot Chat policy location", url: LEARN_BASE + "purview/dlp-microsoft365-copilot-location-learn-about" },
  dspmAi: { title: "Learn about Data Security Posture Management (DSPM) for AI", url: LEARN_BASE + "purview/dspm-for-ai" },
  audit: { title: "Turn auditing on or off", url: LEARN_BASE + "purview/audit-log-enable-disable" },
  auditRetention: { title: "Manage audit log retention policies", url: LEARN_BASE + "purview/audit-log-retention-policies" },
  labelGroups: { title: "Migrate parent sensitivity labels to sensitivity label groups", url: LEARN_BASE + "purview/migrate-sensitivity-label-scheme" },
  ome: { title: "Learn about email encryption (Microsoft Purview Message Encryption)", url: LEARN_BASE + "purview/ome" },
  sccPs: { title: "Connect to Security & Compliance PowerShell", url: LEARN_BASE + "powershell/exchange/connect-to-scc-powershell" },
  newLabel: { title: "New-Label (ExchangePowerShell)", url: LEARN_BASE + "powershell/module/exchange/new-label" },
  setLabel: { title: "Set-Label (ExchangePowerShell)", url: LEARN_BASE + "powershell/module/exchange/set-label" },
  newLabelPolicy: { title: "New-LabelPolicy (ExchangePowerShell)", url: LEARN_BASE + "powershell/module/exchange/new-labelpolicy" },
  newAutoLabelPolicy: { title: "New-AutoSensitivityLabelPolicy (ExchangePowerShell)", url: LEARN_BASE + "powershell/module/exchange/new-autosensitivitylabelpolicy" },
  newAutoLabelRule: { title: "New-AutoSensitivityLabelRule (ExchangePowerShell)", url: LEARN_BASE + "powershell/module/exchange/new-autosensitivitylabelrule" },
  newDlpPolicy: { title: "New-DlpCompliancePolicy (ExchangePowerShell)", url: LEARN_BASE + "powershell/module/exchange/new-dlpcompliancepolicy" },
  newDlpRule: { title: "New-DlpComplianceRule (ExchangePowerShell)", url: LEARN_BASE + "powershell/module/exchange/new-dlpcompliancerule" },
  licensing: { title: "Microsoft 365 guidance for security & compliance (licensing)", url: LEARN_BASE + "office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-365-security-compliance-licensing-guidance" },
  labelsLimits: { title: "Sensitivity labels – limits and considerations", url: LEARN_BASE + "purview/sensitivity-labels#label-priority-order-matters" },
};

/* Soorten classifiers (badge-teksten en uitleg) */
CATALOG.sitKinds = {
  builtin: { short: "Built-in SIT", name: "Built-in sensitive information type", icon: "shieldcheck", desc: "Door Microsoft geleverd informatietype (patroon + keywords + checksum). Direct bruikbaar in labels, auto-labeling en DLP." },
  custom: { short: "Custom SIT", name: "Custom sensitive information type", icon: "regex", desc: "Zelf gedefinieerd: primair element (regex / keyword list / keyword dictionary) met ondersteunende elementen, proximity en confidence levels." },
  fingerprint: { short: "Fingerprint", name: "Document fingerprint SIT", icon: "fingerprint", desc: "Vingerafdruk van een standaardformulier/sjabloon (Word/PDF). Niet ondersteund in de DLP-locatie Microsoft 365 Copilot." },
  edm: { short: "EDM", name: "Exact data match (EDM) SIT", icon: "database", desc: "Match op exacte waarden uit een gehashte brontabel (bijv. patiënt- of personeelsregister). Minimaliseert false positives." },
  classifier: { short: "Trainable classifier", name: "Trainable classifier", icon: "brain", desc: "Machine-learning model dat een categorie inhoud herkent (bijv. HR, Financial statements, Health/Medical forms)." },
  object: { short: "Informatieobject", name: "Informatieobject (Know your Data)", icon: "doc", desc: "Documentsoort uit het classificatieschema (bijv. patiëntdossier, verwijsbrief). Wordt herkend via fingerprint, classifier of SIT-combinatie." },
};

/* Labelkleuren – Purview biedt een vaste kleurenset + vrije hex-waarde */
CATALOG.labelColors = ["#13A10E", "#0F6CBD", "#038387", "#8764B8", "#CA5010", "#E3008C", "#C50F1F", "#986F0B", "#69797E", "#3B3A39"];

/* Strengheidsniveaus voor keuzekaarten op het ontwerpbord */
CATALOG.levels = [
  { lv: 0, name: "Geen", desc: "Niet van toepassing / geen maatregel" },
  { lv: 1, name: "Bewust", desc: "Monitoren en bewustwording (audit, tip)" },
  { lv: 2, name: "Sturen", desc: "Sturen met lichte impact op medewerkers (waarschuwen, override)" },
  { lv: 3, name: "Beschermen", desc: "Afdwingen voor extern/risicovolle kanalen" },
  { lv: 4, name: "Streng", desc: "Maximaal afdwingen, ook intern beperken" },
];
CATALOG.friction = ["Geen", "Laag", "Middel", "Hoog"];

/* Stakeholder-rollen (uit Protect your Data kick-off) en persona's (onderdeel Impact & adoptie) */
CATALOG.roles = ["Directie / eigenaar", "Partner / vennoot", "CISO / CSO", "CIO / IT-manager", "Privacy officer / FG", "Functionaris gegevensbescherming (FG)", "Compliance officer", "Security officer", "Architect", "M365-beheerder", "Applicatiebeheer", "Office manager", "Proceseigenaar", "Informatiebeheerder / records manager", "Medisch manager / zorgprofessional", "Business-vertegenwoordiger", "Key-user", "Medewerker (eindgebruiker)", "Juridisch", "HR", "Communicatie / adoptie"];
/* Sectoren (Start › sector; scenario’s, informatietypen en aanbevelingen) */
CATALOG.sectors = [
  ["generic", "Generiek"],
  ["zorg", "Zorg"],
  ["overheid", "Overheid / gemeente"],
  ["financieel", "Financiële & zakelijke dienstverlening"],
  ["onderwijs", "Onderwijs"],
  ["juridisch", "Juridisch / advocatuur"],
  ["it", "IT & software"],
  ["industrie", "Industrie & productie"],
  ["retail", "Retail & e-commerce"],
];
CATALOG.personas = [
  { id: "per-user", name: "Medewerker (eindgebruiker)", icon: "user", weight: 3, desc: "Labelt documenten en e-mail, ontvangt policy tips en meldingen." },
  { id: "per-keyuser", name: "Key-user / ambassadeur", icon: "star", weight: 2, desc: "Eerste aanspreekpunt in de afdeling, helpt bij labelkeuzes." },
  { id: "per-manager", name: "Manager", icon: "users", weight: 2, desc: "Keurt overrides/uitzonderingen goed, draagt beleid uit." },
  { id: "per-hr", name: "HR", icon: "heart", weight: 2, desc: "Werkt dagelijks met strikt vertrouwelijke persoonsgegevens." },
  { id: "per-admin", name: "M365-beheerder", icon: "settings", weight: 1, desc: "Configureert en onderhoudt labels, policies en endpoint-instellingen." },
  { id: "per-security", name: "Security / SOC", icon: "shield", weight: 1, desc: "Monitort DLP-alerts en Activity explorer." },
  { id: "per-compliance", name: "Compliance & privacy", icon: "shieldcheck", weight: 1, desc: "Eigenaar van beleid, beoordeelt incidenten en rapportages." },
  { id: "per-legal", name: "Juridisch", icon: "book", weight: 1, desc: "Beoordeelt contractuele/wettelijke eisen (AVG, NEN 7510, BIO)." },
  { id: "per-incident", name: "Incidentmanager", icon: "alert", weight: 1, desc: "Handelt DLP-incidenten en datalekken af (meldplicht AP)." },
];

/* Onderdelen van de Information Protection & DLP workshop (Protect your Data) */
CATALOG.workshops = [
  { id: "W1", name: "Technische maatregelen", desc: "Labels, encryptie, markering, containers en DLP-locaties ontwerpen.", routes: ["architectuur", "schema", "sits", "board", "labels", "policies", "autolabel"] },
  { id: "W2", name: "Beleid & DLP", desc: "DLP-policies, endpoint, Copilot, meldingen en impact op medewerkers afstemmen op het informatiebeveiligingsbeleid.", routes: ["board", "dlp", "endpoint", "copilot", "tenant", "scenarios"] },
  { id: "W3", name: "Impact & adoptie", desc: "Persona’s, impact op medewerkers, communicatie en uitrol (simulatie → handhaven).", routes: ["scenarios", "adoption", "export"] },
];
