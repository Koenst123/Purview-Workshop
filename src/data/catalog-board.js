/* Catalogus – Integraal Ontwerpbord: rijen (maatregel-domeinen), keuzekaarten (hoog-over) en profielen.
   Elke keuzekaart heeft apply(label, state) die de exacte Purview-instellingen in label.cfg zet. */

CATALOG.boardGroups = [
  { key: "classify", name: "Classificeren", icon: "tag", desc: "Herkennen, beschikbaar stellen en (automatisch) toepassen van het label." },
  { key: "protect", name: "Beschermen (label-acties)", icon: "lock", desc: "Wat het label met de inhoud of container doet." },
  { key: "dlp", name: "Datalekken voorkomen (DLP)", icon: "shield", desc: "Wat er gebeurt als inhoud met dit label of deze informatietypen de organisatie dreigt te verlaten." },
  { key: "monitor", name: "Melden & monitoren", icon: "bell", desc: "Policy tips, overrides, alerts en incidentrapportage." },
];

CATALOG.boardRows = [
  { key: "recognition", group: "classify", kind: "sits", name: "Herkenning", sub: "Informatietypen & classifiers", icon: "search", route: "sits", desc: "Welke sensitive info types, classifiers, EDM- of fingerprint-SIT’s horen bij dit label? Basis voor auto-labeling én DLP op ongelabelde inhoud." },
  { key: "scope", group: "classify", kind: "scope", name: "Scope", sub: "Waar is het label bruikbaar", icon: "layers", route: "labels", sub2: "scope", desc: "Files & other data assets, Emails, Meetings, Groups & sites." },
  { key: "publish", group: "classify", kind: "choice", name: "Publicatie", sub: "Wie kan het label kiezen", icon: "users", route: "policies", desc: "Labelbeleid: voor wie is het label zichtbaar en is het een default label?" },
  { key: "autolabel", group: "classify", kind: "choice", name: "Automatisch labelen", sub: "Client- & service-side", icon: "wand", route: "autolabel", lic: "e5ip", desc: "Aanbevelen of automatisch toepassen in Office (client-side) en/of service-side voor data at rest en e-mail." },
  { key: "marking", group: "protect", kind: "choice", name: "Visuele markering", sub: "Header, footer, watermerk", icon: "watermark", route: "labels", sub2: "marking", desc: "Content marking in Office-documenten en e-mail." },
  { key: "encryption", group: "protect", kind: "choice", name: "Toegang & encryptie", sub: "Control access", icon: "lock", route: "labels", sub2: "encryption", desc: "Wie mag wat (usage rights), verloop, offline toegang, door gebruiker bepaald, DKE." },
  { key: "container", group: "protect", kind: "choice", name: "Teams, Groups & sites", sub: "Container-label", icon: "site", route: "labels", sub2: "container", desc: "Privacy, gasten, extern delen, onbeheerde apparaten, standaard deellink." },
  { key: "meetings", group: "protect", kind: "choice", name: "Teams meetings", sub: "Vergaderingen & chat", icon: "meeting", route: "labels", sub2: "meetings", desc: "Label op uitnodigingen (zonder extra licentie). Meeting-opties zoals lobby, presentatoren, kopiëren van chat, watermerk en E2EE vereisen Teams Premium." },
  { key: "dlp_exchange", group: "dlp", kind: "choice", name: "E-mail", sub: "Exchange email", icon: "mail", route: "dlp", dlp: "exchange", desc: "Extern versturen van e-mail met dit label/deze informatietypen." },
  { key: "dlp_sharing", group: "dlp", kind: "choice", name: "Delen", sub: "SharePoint & OneDrive", icon: "share", route: "dlp", dlp: "sharing", desc: "Delen van bestanden met externen of via ‘Anyone’-links." },
  { key: "dlp_teams", group: "dlp", kind: "choice", name: "Teams chat", sub: "Chat & kanaalberichten", icon: "teams", route: "dlp", dlp: "teams", lic: "e5dlp", desc: "Gevoelige informatie in chat- en kanaalberichten met externen." },
  { key: "dlp_endpoint", group: "dlp", kind: "choice", name: "Endpoint", sub: "USB, print, cloud, klembord…", icon: "laptop", route: "endpoint", dlp: "endpoint", lic: "e5dlp", desc: "Activiteiten op Windows/macOS-apparaten: USB, printen, netwerkshare, upload, plakken in browser, Bluetooth, RDP, apps." },
  { key: "dlp_copilot", group: "dlp", kind: "choice", name: "Microsoft 365 Copilot", sub: "Copilot & Copilot Chat", icon: "sparkle", route: "copilot", dlp: "copilot", lic: "copilot", desc: "Voorkomen dat Copilot inhoud met dit label verwerkt in antwoorden." },
  { key: "dlp_fabric", group: "dlp", kind: "choice", name: "Fabric & Power BI", sub: "Semantic models e.d.", icon: "powerbi", route: "dlp", dlp: "fabric", lic: "e5dlp", optional: true, desc: "DLP voor Fabric- en Power BI-workspaces." },
  { key: "dlp_onprem", group: "dlp", kind: "choice", name: "On-premises", sub: "File shares, SharePoint Server", icon: "server", route: "dlp", dlp: "onprem", lic: "scanner", optional: true, desc: "DLP op on-premises repositories via de Information Protection scanner. Geen gebruikersmeldingen of policy tips." },
  { key: "dlp_instances", group: "dlp", kind: "choice", name: "Cloud-apps (Instances)", sub: "Via Defender for Cloud Apps", icon: "app", route: "dlp", dlp: "instances", lic: "mdca", optional: true, desc: "DLP voor niet-Microsoft cloud-apps (bijv. Box, Dropbox, Google Workspace) via MDCA." },
  { key: "notify", group: "monitor", kind: "choice", name: "Melden & incidenten", sub: "Tips, override, alerts", icon: "bell", route: "dlp", desc: "Policy tips, e-mailnotificatie, override met justificatie, severity, alerts en incidentrapporten (geldt voor alle DLP-regels van dit label)." },
];

/* ---------- Hulpfuncties voor apply ---------- */
const _txt = (l) => (l.displayName || l.name || "").toUpperCase();
function _mark(l, h, f, w, wText) {
  const m = l.cfg.marking;
  m.header = { ...m.header, enabled: !!h, text: h ? (typeof h === "string" ? h : _txt(l)) : m.header.text, align: "Left", size: 10, color: "#000000" };
  m.footer = { ...m.footer, enabled: !!f, text: f ? (typeof f === "string" ? f : `Classificatie: ${l.displayName || l.name}`) : m.footer.text, align: "Center", size: 9, color: "#7F7F7F" };
  m.watermark = { ...m.watermark, enabled: !!w, text: w ? (wText || _txt(l)) : m.watermark.text, size: 36, color: "#A6A6A6", layout: "Diagonal" };
}
function _enc(l, mode, perms, extra = {}) {
  const e = l.cfg.encryption;
  e.mode = mode;
  e.permissions = (perms || []).map((p) => ({ id: uid("perm"), rights: [], ...p }));
  e.expiry = { type: "never", date: "", days: 30, ...(extra.expiry || {}) };
  e.offline = { type: "always", days: 7, ...(extra.offline || {}) };
  e.userDefined = { outlook: "none", office: false, ...(extra.userDefined || {}) };
  e.dke = !!extra.dke;
}
function _labelGroup(l, st) {
  // zoekt/maakt een doelgroep voor dit label (bijv. ‘HR’, ‘Directie’)
  const nm = `Doelgroep – ${labelFullName(l, st)}`;
  let g = st.groups.find((x) => x.forLabel === l.id) || st.groups.find((x) => x.name === nm);
  if (!g) { g = { id: uid("grp"), name: nm, kind: "group", value: "", forLabel: l.id }; st.groups.push(g); }
  return g;
}
function _partner(st) {
  let g = st.groups.find((x) => x.kind === "domain");
  if (!g) { g = { id: uid("grp"), name: "Partnerdomein(en)", kind: "domain", value: "" }; st.groups.push(g); }
  return g;
}
function _container(l, o) {
  l.cfg.scope.sites = true;
  Object.assign(l.cfg.container, { privacy: "private", externalUserAccess: false, sharing: "Disabled", unmanaged: "full", authContext: "", defaultLinkType: "unspecified", defaultLinkPermission: "unspecified", privateTeamsDiscoverable: true, sharedChannels: { internalOnly: false, sameLabelOnly: false, privateTeamsOnly: false } }, o);
}
function _meet(l, o) {
  l.cfg.scope.meetings = true;
  Object.assign(l.cfg.meetings, { lobbyBypass: "default", presenters: "default", whoCanRecord: "default", recordAutomatically: false, preventCopyChat: false, e2ee: false, watermarkScreen: false, watermarkVideo: false, detectSensitiveScreen: false, allowChat: "default" }, o);
}
function _ep(l, levels) {
  const acts = {};
  CATALOG.endpointActivities.forEach((a) => (acts[a.key] = typeof levels === "string" ? levels : levels[a.key] || levels._ || "off"));
  l.cfg.dlp.endpoint = { action: typeof levels === "string" ? levels : "custom", activities: acts };
}
function _setDefaultLabel(st, labelId, on) {
  const lp = st.labelPolicies.find((p) => p.scope === "all") || st.labelPolicies[0];
  if (!lp) return;
  if (on) { lp.settings.defaultDocs = labelId; if (!lp.settings.defaultEmail || lp.settings.defaultEmail === labelId) lp.settings.defaultEmail = "sameAsDocs"; }
  else if (lp.settings.defaultDocs === labelId) { lp.settings.defaultDocs = ""; if (lp.settings.defaultEmail === "sameAsDocs") lp.settings.defaultEmail = ""; }
}

/* ---------- Keuzekaarten per domein ---------- */
/* lv = strengheid 0..4, fr = wrijving eindgebruiker 0..3 */
CATALOG.choices = [
  // Publicatie
  { id: "pub-all", d: "publish", lv: 0, fr: 0, icon: "users", title: "Alle medewerkers", desc: "Label wordt gepubliceerd in het globale labelbeleid.", user: "Iedereen ziet dit label in de knop Gevoeligheid en kan het kiezen.", apply: (l, st) => { l.cfg.publish = { audience: "all", groups: [] }; _setDefaultLabel(st, l.id, false); } },
  { id: "pub-default", d: "publish", lv: 1, fr: 1, icon: "star", title: "Alle medewerkers + default label", desc: "Wordt automatisch toegepast op nieuwe documenten en e-mail (Default label). Slechts één label kan default zijn.", user: "Nieuwe documenten en mails krijgen dit label vanzelf; je kunt het zelf wijzigen.", apply: (l, st) => { st.labels.forEach((x) => { if (x.choices.publish === "pub-default" && x.id !== l.id) x.choices.publish = "pub-all"; }); l.cfg.publish = { audience: "all", groups: [] }; _setDefaultLabel(st, l.id, true); } },
  { id: "pub-groups", d: "publish", lv: 3, fr: 0, icon: "user", title: "Alleen specifieke groep(en)", desc: "Label in een apart labelbeleid voor een doelgroep (bijv. HR, Directie).", user: "Alleen leden van de gekozen groep zien dit label; anderen kunnen het niet kiezen.", apply: (l, st) => { const g = _labelGroup(l, st); l.cfg.publish = { audience: "groups", groups: [g.id] }; _setDefaultLabel(st, l.id, false); } },

  // Automatisch labelen
  { id: "al-manual", d: "autolabel", lv: 0, fr: 1, icon: "user", title: "Handmatig", desc: "Gebruiker kiest zelf het label (eventueel met default/mandatory).", user: "Je kiest het label zelf via de knop Gevoeligheid.", apply: (l) => { l.cfg.autolabel.client.mode = "off"; l.cfg.autolabel.service.enabled = false; } },
  { id: "al-recommend", d: "autolabel", lv: 1, fr: 1, icon: "bulb", title: "Aanbevelen in Office", desc: "Client-side: ‘Recommend that the user apply the label’ bij herkende SIT’s/classifiers.", lic: "e5ip", user: "Word, Excel, PowerPoint en Outlook stellen dit label voor als ze gevoelige gegevens zien; jij beslist.", apply: (l) => { Object.assign(l.cfg.autolabel.client, { mode: "recommend" }); l.cfg.autolabel.service.enabled = false; } },
  { id: "al-auto", d: "autolabel", lv: 2, fr: 0, icon: "wand", title: "Automatisch in Office", desc: "Client-side: ‘Automatically apply the label’ tijdens het bewerken.", lic: "e5ip", user: "Het label wordt tijdens het werken vanzelf gezet; je ziet een melding in de app.", apply: (l) => { Object.assign(l.cfg.autolabel.client, { mode: "auto" }); l.cfg.autolabel.service.enabled = false; } },
  { id: "al-service", d: "autolabel", lv: 3, fr: 0, icon: "cloud", title: "Aanbevelen + service-side", desc: "Office beveelt aan; service-side policy labelt bestaande bestanden (SharePoint/OneDrive) en e-mail in transit. Start in simulatie.", lic: "e5ip", user: "Office stelt het label voor; bestaande bestanden en mail krijgen het later vanzelf (eerst alleen in simulatie).", apply: (l) => { l.cfg.autolabel.client.mode = "recommend"; Object.assign(l.cfg.autolabel.service, { enabled: true, exchange: true, sharepoint: true, onedrive: true, mode: "simulation" }); } },
  { id: "al-full", d: "autolabel", lv: 4, fr: 0, icon: "sparkle", title: "Automatisch: client + service", desc: "Overal automatisch labelen: in Office én service-side voor data at rest en e-mail.", lic: "e5ip", user: "Het label wordt overal vanzelf gezet, ook op bestaande bestanden en mail; je hoeft er weinig voor te doen.", apply: (l) => { l.cfg.autolabel.client.mode = "auto"; Object.assign(l.cfg.autolabel.service, { enabled: true, exchange: true, sharepoint: true, onedrive: true, mode: "simulation" }); } },

  // Markering
  { id: "mk-none", d: "marking", lv: 0, fr: 0, icon: "doc", title: "Geen markering", desc: "Alleen metadata; label zichtbaar in de app (statusbalk/infobalk).", user: "Je ziet het label alleen in de balk van de app; het document zelf verandert niet.", apply: (l) => _mark(l, false, false, false) },
  { id: "mk-footer", d: "marking", lv: 1, fr: 0, icon: "footer", title: "Footer", desc: "Footer ‘Classificatie: <label>’ in documenten en e-mail.", user: "Onderaan elk document en elke mail staat ‘Classificatie: …’.", apply: (l) => _mark(l, false, true, false) },
  { id: "mk-hf", d: "marking", lv: 2, fr: 0, icon: "header", title: "Header + footer", desc: "Header met labelnaam (hoofdletters) en footer met classificatie.", user: "Boven- en onderaan staat de labelnaam – ook op een afdruk.", apply: (l) => _mark(l, true, true, false) },
  { id: "mk-wm", d: "marking", lv: 3, fr: 1, icon: "watermark", title: "Header, footer + watermerk", desc: "Diagonaal watermerk met labelnaam in Word, Excel en PowerPoint.", user: "Schuin over elke pagina staat de labelnaam als watermerk.", apply: (l) => _mark(l, true, true, true) },
  { id: "mk-user", d: "marking", lv: 4, fr: 1, icon: "user", title: "Watermerk met naam & datum", desc: "Watermerk met ${User.Name} en ${Event.DateTime}: herleidbaar bij lekken (foto/print).", user: "Je naam en de datum staan schuin over elke pagina – ook op een afdruk of foto.", apply: (l) => _mark(l, true, "${Item.Label} – gelabeld door ${User.Name} op ${Event.DateTime}", true, "${Item.Label} – ${User.Name}") },

  // Encryptie
  { id: "enc-none", d: "encryption", lv: 0, fr: 0, icon: "unlock", title: "Geen encryptie", desc: "Het label stelt geen encryptie in (Access control niet geconfigureerd). Bescherming via DLP en markering.", user: "Bestanden openen zoals altijd; er wordt niets versleuteld.", apply: (l) => _enc(l, "none", []) },
  { id: "enc-remove", d: "encryption", lv: 0, fr: 0, icon: "unlock", title: "Encryptie verwijderen", desc: "Bewuste keuze: ‘Remove access control settings if already applied to items’. Bestaande encryptie verdwijnt zodra het label wordt toegepast – alleen als de gebruiker EXPORT- of FULL CONTROL-rechten heeft of eigenaar is.", user: "Een eerder versleuteld bestand is weer gewoon te openen zodra je dit label kiest.", apply: (l) => _enc(l, "remove", []) },
  { id: "enc-org", d: "encryption", lv: 2, fr: 1, icon: "users", title: "Alleen eigen organisatie", desc: "Assign permissions now: alle gebruikers in de organisatie = Editor. Extern niet te openen.", user: "Collega’s openen het gewoon; mensen buiten de organisatie kunnen het niet openen.", apply: (l) => _enc(l, "assignNow", [{ type: "org", value: "", level: "CoAuthor" }]) },
  { id: "enc-partners", d: "encryption", lv: 2, fr: 1, icon: "globe", title: "Organisatie + partnerdomeinen", desc: "Organisatie én opgegeven partnerdomeinen = Editor.", user: "Collega’s en de gekozen partnerorganisaties kunnen het openen; anderen niet.", apply: (l, st) => { const g = _partner(st); _enc(l, "assignNow", [{ type: "org", value: "", level: "CoAuthor" }, { type: "domain", value: g.value, groupId: g.id, level: "CoAuthor" }]); } },
  { id: "enc-readonly", d: "encryption", lv: 3, fr: 2, icon: "eye", title: "Organisatie: alleen lezen", desc: "Organisatie = Viewer; doelgroep = Owner. Geen print/kopie/doorsturen voor overigen.", user: "Collega’s kunnen alleen lezen – niet bewerken, printen of kopiëren; de doelgroep mag alles.", apply: (l, st) => { const g = _labelGroup(l, st); _enc(l, "assignNow", [{ type: "org", value: "", level: "Viewer" }, { type: "group", value: "", groupId: g.id, level: "CoOwner" }]); } },
  { id: "enc-user", d: "encryption", lv: 3, fr: 2, icon: "user", title: "Gebruiker kiest ontvangers", desc: "Let users assign permissions: Outlook = Do Not Forward, Office = gebruiker kiest personen & rechten (‘Specifieke personen’). Niet voor auto-labeling.", user: "Bij mailen of opslaan kies je zelf wie het mag openen; een mail kan niet worden doorgestuurd.", apply: (l) => _enc(l, "userDefined", [], { userDefined: { outlook: "DoNotForward", office: true } }) },
  { id: "enc-encryptonly", d: "encryption", lv: 2, fr: 1, icon: "mail", title: "E-mail: Encrypt-Only", desc: "Let users assign permissions: Outlook = Encrypt-Only (ontvangers alle rechten behalve opslaan zonder encryptie).", user: "De mail gaat versleuteld weg; ontvangers kunnen hem gewoon lezen en beantwoorden.", apply: (l) => _enc(l, "userDefined", [], { userDefined: { outlook: "EncryptOnly", office: false } }) },
  { id: "enc-group", d: "encryption", lv: 4, fr: 2, icon: "lock", title: "Alleen doelgroep (+ expiry)", desc: "Alleen de doelgroep (bijv. HR/Directie) = Editor; offline toegang 7 dagen.", user: "Alleen collega’s in de groep kunnen het bestand openen; anderen zien ‘U hebt geen toegang’. Offline werkt het maximaal 7 dagen.", apply: (l, st) => { const g = _labelGroup(l, st); _enc(l, "assignNow", [{ type: "group", value: "", groupId: g.id, level: "CoAuthor" }], { offline: { type: "days", days: 7 } }); } },
  { id: "enc-dke", d: "encryption", lv: 4, fr: 3, icon: "key", title: "Double Key Encryption", desc: "Doelgroep = Editor met DKE: Microsoft kan de inhoud niet ontsleutelen. Geen Copilot/search/eDiscovery op inhoud.", lic: "dke", user: "Alleen de groep kan het openen; Copilot, zoeken en voorbeeldweergave werken niet op deze bestanden.", apply: (l, st) => { const g = _labelGroup(l, st); _enc(l, "assignNow", [{ type: "group", value: "", groupId: g.id, level: "CoAuthor" }], { dke: true, offline: { type: "never", days: 0 } }); } },

  // Containers
  { id: "ct-none", d: "container", lv: 0, fr: 0, icon: "minus", title: "Niet voor containers", desc: "Label niet beschikbaar voor Teams/Groups/sites.", user: "Bij een team of site kun je dit label niet kiezen.", apply: (l) => { l.cfg.scope.sites = false; } },
  { id: "ct-public", d: "container", lv: 1, fr: 0, icon: "globe", title: "Publiek team, gasten welkom", desc: "Privacy Public, gasten toegestaan, delen met nieuwe en bestaande gasten.", user: "Iedereen in de organisatie kan het team vinden en lid worden; gasten zijn welkom.", apply: (l) => _container(l, { privacy: "public", externalUserAccess: true, sharing: "ExternalUserSharingOnly" }) },
  { id: "ct-guests", d: "container", lv: 2, fr: 0, icon: "users", title: "Privé, bestaande gasten", desc: "Privacy Private, gasten toegestaan, delen alleen met bestaande gasten.", user: "Alleen leden zien het team; gasten die al bekend zijn mogen meedoen.", apply: (l) => _container(l, { privacy: "private", externalUserAccess: true, sharing: "ExistingExternalUserSharingOnly" }) },
  { id: "ct-internal", d: "container", lv: 3, fr: 1, icon: "lock", title: "Privé, alleen intern", desc: "Geen gasten, geen extern delen, onbeheerde apparaten alleen web-toegang, standaardlink ‘Specific people’.", user: "Alleen collega’s; extern delen kan niet en op een privé-apparaat werk je alleen in de browser.", apply: (l) => _container(l, { privacy: "private", externalUserAccess: false, sharing: "Disabled", unmanaged: "limited", defaultLinkType: "SpecificPeople", defaultLinkPermission: "View" }) },
  { id: "ct-locked", d: "container", lv: 4, fr: 2, icon: "shield", title: "Afgeschermd", desc: "Als ‘alleen intern’ + onbeheerde apparaten geblokkeerd, team niet vindbaar, gedeelde kanalen alleen intern.", user: "Alleen collega’s op een beheerd apparaat; anderen kunnen het team niet vinden.", apply: (l) => _container(l, { privacy: "private", externalUserAccess: false, sharing: "Disabled", unmanaged: "block", defaultLinkType: "SpecificPeople", defaultLinkPermission: "View", privateTeamsDiscoverable: false, sharedChannels: { internalOnly: true, sameLabelOnly: false, privateTeamsOnly: false } }) },

  // Meetings
  { id: "mt-none", d: "meetings", lv: 0, fr: 0, icon: "minus", title: "Niet voor meetings", desc: "Label niet beschikbaar voor agenda-items/Teams-meetings.", user: "Bij een vergadering kun je dit label niet kiezen.", apply: (l) => { l.cfg.scope.meetings = false; } },
  { id: "mt-label", d: "meetings", lv: 1, fr: 0, icon: "meeting", title: "Alleen labelen", desc: "Meeting krijgt het label (markering/encryptie op de uitnodiging); geen extra Teams-restricties.", user: "De uitnodiging toont het label; de vergadering zelf werkt zoals altijd.", apply: (l) => _meet(l, {}) },
  { id: "mt-org", d: "meetings", lv: 2, fr: 1, icon: "users", title: "Intern geregisseerd", lic: "teamsPremium", desc: "Lobby-bypass: People in my org and guests; presentatoren uit de organisatie.", user: "Collega’s en gasten komen direct binnen, anderen wachten in de lobby; alleen collega’s presenteren.", apply: (l) => _meet(l, { lobbyBypass: "Organization", presenters: "Organization" }) },
  { id: "mt-conf", d: "meetings", lv: 3, fr: 1, icon: "lock", title: "Vertrouwelijk overleg", lic: "teamsPremium", desc: "Alleen genodigden langs lobby, alleen organisator presenteert, chat niet kopiëren.", user: "Alleen genodigden komen direct binnen, alleen de organisator presenteert en de chat is niet te kopiëren.", apply: (l) => _meet(l, { lobbyBypass: "Invited", presenters: "Organizer", preventCopyChat: true }) },
  { id: "mt-strict", d: "meetings", lv: 4, fr: 2, icon: "shield", title: "Strikt + E2EE & watermerk", desc: "Als vertrouwelijk + end-to-end encryptie en watermerken (Teams Premium).", lic: "teamsPremium", user: "Als hiervoor, plus versleuteld beeld en geluid en een watermerk met je naam over gedeelde schermen.", apply: (l) => _meet(l, { lobbyBypass: "Organizer", presenters: "Organizer", whoCanRecord: "Organizer", preventCopyChat: true, e2ee: true, watermarkScreen: true, watermarkVideo: true }) },

  // DLP – Exchange
  { id: "dx-off", d: "dlp_exchange", lv: 0, fr: 0, icon: "minus", title: "Geen controle", desc: "Geen controle bij versturen.", user: "Mailen naar buiten gaat zoals altijd; er wordt niets gecontroleerd.", apply: (l) => (l.cfg.dlp.exchange = { action: "off", scope: "external" }) },
  { id: "dx-audit", d: "dlp_exchange", lv: 1, fr: 0, icon: "eye", title: "Audit extern", desc: "Regel zonder blokkerende actie: extern versturen wordt gelogd (Activity explorer).", user: "Je merkt niets; mails naar buiten worden alleen geregistreerd.", apply: (l) => (l.cfg.dlp.exchange = { action: "audit", scope: "external" }) },
  { id: "dx-tip", d: "dlp_exchange", lv: 1, fr: 1, icon: "bulb", title: "Policy tip bij extern", desc: "Gebruiker ziet een waarschuwing in Outlook; verzenden blijft mogelijk.", user: "Bij mailen naar buiten zie je een waarschuwing in Outlook; versturen kan gewoon.", apply: (l) => (l.cfg.dlp.exchange = { action: "tip", scope: "external" }) },
  { id: "dx-encrypt", d: "dlp_exchange", lv: 2, fr: 0, icon: "lock", title: "Extern automatisch versleutelen", desc: "Encrypt email messages (Purview Message Encryption) bij externe ontvangers.", user: "Mail naar buiten wordt vanzelf versleuteld; de ontvanger opent hem in Outlook of via een link.", apply: (l) => (l.cfg.dlp.exchange = { action: "encrypt", scope: "external", template: "Encrypt" }) },
  { id: "dx-override", d: "dlp_exchange", lv: 2, fr: 2, icon: "alert", title: "Extern blokkeren met override", desc: "Blokkeren voor externe ontvangers; gebruiker kan overrulen met zakelijke justificatie.", user: "Bij mailen naar buiten verschijnt een melding; je kunt doorgaan met een reden.", apply: (l) => (l.cfg.dlp.exchange = { action: "override", scope: "external" }) },
  { id: "dx-block", d: "dlp_exchange", lv: 3, fr: 3, icon: "xcircle", title: "Extern blokkeren", desc: "Extern versturen wordt geblokkeerd zonder override (NDR).", user: "Mailen naar buiten wordt tegengehouden; je krijgt een melding terug.", apply: (l) => (l.cfg.dlp.exchange = { action: "block", scope: "external" }) },
  { id: "dx-blockall", d: "dlp_exchange", lv: 4, fr: 3, icon: "shield", title: "Altijd blokkeren (ook intern)", desc: "Block everyone – alleen voor uitzonderlijke labels; voeg een exception toe voor de doelgroep.", user: "Mailen wordt altijd tegengehouden, ook naar collega’s – behalve voor de uitzonderingsgroep.", apply: (l) => (l.cfg.dlp.exchange = { action: "block", scope: "all" }) },

  // DLP – Delen (SharePoint/OneDrive)
  { id: "ds-off", d: "dlp_sharing", lv: 0, fr: 0, icon: "minus", title: "Geen controle", desc: "Delen volgt alleen de site-/tenant-instellingen.", user: "Delen gaat zoals de site toestaat; er wordt niets extra gecontroleerd.", apply: (l) => (l.cfg.dlp.sharing = { action: "off", scope: "external" }) },
  { id: "ds-audit", d: "dlp_sharing", lv: 1, fr: 0, icon: "eye", title: "Audit extern delen", desc: "Delen met externen wordt gelogd.", user: "Je merkt niets; delen met externen wordt alleen geregistreerd.", apply: (l) => (l.cfg.dlp.sharing = { action: "audit", scope: "external" }) },
  { id: "ds-tip", d: "dlp_sharing", lv: 1, fr: 1, icon: "bulb", title: "Policy tip bij extern delen", desc: "Waarschuwing in SharePoint/OneDrive en Office; delen blijft mogelijk.", user: "Bij delen met externen zie je een waarschuwing; delen kan gewoon.", apply: (l) => (l.cfg.dlp.sharing = { action: "tip", scope: "external" }) },
  { id: "ds-anyone", d: "dlp_sharing", lv: 2, fr: 1, icon: "link", title: "Blokkeer ‘Anyone’-links", desc: "Block only people who were given access through ‘Anyone with the link’.", user: "Een ‘Iedereen met de link’-link werkt niet voor dit bestand; delen met specifieke personen wel.", apply: (l) => (l.cfg.dlp.sharing = { action: "block", scope: "anyone" }) },
  { id: "ds-override", d: "dlp_sharing", lv: 2, fr: 2, icon: "alert", title: "Extern blokkeren met override", desc: "Block only people outside your organization; eigenaar kan overrulen met justificatie.", user: "Externen krijgen geen toegang, tenzij jij als eigenaar doorgaat met een reden.", apply: (l) => (l.cfg.dlp.sharing = { action: "override", scope: "external" }) },
  { id: "ds-block", d: "dlp_sharing", lv: 3, fr: 2, icon: "xcircle", title: "Extern blokkeren", desc: "Block only people outside your organization – zonder override.", user: "Externen kunnen het bestand niet openen, ook niet als je het met ze deelt.", apply: (l) => (l.cfg.dlp.sharing = { action: "block", scope: "external" }) },
  { id: "ds-blockall", d: "dlp_sharing", lv: 4, fr: 3, icon: "shield", title: "Alleen eigenaar", desc: "Block everyone: alleen eigenaar, laatste bewerker en site-eigenaar houden toegang.", user: "Alleen jij (eigenaar), de laatste bewerker en de site-eigenaar kunnen het openen.", apply: (l) => (l.cfg.dlp.sharing = { action: "block", scope: "all" }) },

  // DLP – Teams
  { id: "tm-off", d: "dlp_teams", lv: 0, fr: 0, icon: "minus", title: "Geen controle", desc: "Geen controle op chatberichten.", user: "Chatten gaat zoals altijd; er wordt niets gecontroleerd.", apply: (l) => (l.cfg.dlp.teams = { action: "off", scope: "external" }) },
  { id: "tm-audit", d: "dlp_teams", lv: 1, fr: 0, icon: "eye", title: "Audit", desc: "Berichten met deze informatietypen naar externen worden gelogd.", user: "Je merkt niets; berichten naar externen worden alleen geregistreerd.", apply: (l) => (l.cfg.dlp.teams = { action: "audit", scope: "external" }) },
  { id: "tm-tip", d: "dlp_teams", lv: 1, fr: 1, icon: "bulb", title: "Policy tip", desc: "Afzender ziet een policy tip bij het bericht.", user: "Je ziet een melding bij je bericht; het bericht wordt wel verstuurd.", apply: (l) => (l.cfg.dlp.teams = { action: "tip", scope: "external" }) },
  { id: "tm-override", d: "dlp_teams", lv: 2, fr: 2, icon: "alert", title: "Extern blokkeren met override", desc: "Bericht wordt voor externen geblokkeerd; afzender kan overrulen.", user: "Externen zien je bericht niet, tenzij je met een reden doorgaat.", apply: (l) => (l.cfg.dlp.teams = { action: "override", scope: "external" }) },
  { id: "tm-block", d: "dlp_teams", lv: 3, fr: 2, icon: "xcircle", title: "Extern blokkeren", desc: "Bericht wordt voor externe deelnemers geblokkeerd.", user: "Externe deelnemers zien je bericht niet; jij ziet een melding.", apply: (l) => (l.cfg.dlp.teams = { action: "block", scope: "external" }) },
  { id: "tm-blockall", d: "dlp_teams", lv: 4, fr: 3, icon: "shield", title: "Altijd blokkeren", desc: "Bericht met deze gegevens wordt voor iedereen geblokkeerd (niet in chat delen).", user: "Niemand ziet je bericht met deze gegevens; deel ze niet via chat.", apply: (l) => (l.cfg.dlp.teams = { action: "block", scope: "all" }) },

  // DLP – Endpoint
  { id: "ep-off", d: "dlp_endpoint", lv: 0, fr: 0, icon: "minus", title: "Geen controle", desc: "Geen endpoint-controles (alleen ‘Always audit’ als ingesteld).", user: "Op je laptop merk je niets: USB, printen en uploaden gaan zoals altijd.", apply: (l) => _ep(l, "off") },
  { id: "ep-audit", d: "dlp_endpoint", lv: 1, fr: 0, icon: "eye", title: "Audit alle activiteiten", desc: "USB, print, netwerk, upload, plakken, Bluetooth, RDP, apps: Audit only.", user: "Je merkt niets; kopiëren naar USB, printen en uploaden worden geregistreerd.", apply: (l) => _ep(l, "audit") },
  { id: "ep-warn", d: "dlp_endpoint", lv: 2, fr: 1, icon: "alert", title: "Waarschuwen bij uitstroom", desc: "Block with override voor USB, cloud-upload, plakken in browser, Bluetooth en restricted apps; overige audit.", user: "Bij kopiëren naar USB, uploaden of plakken in een website zie je een melding; je kunt doorgaan met een reden.", apply: (l) => _ep(l, { usb: "warn", cloud: "warn", paste: "warn", bluetooth: "warn", apps: "warn", _: "audit" }) },
  { id: "ep-egress", d: "dlp_endpoint", lv: 3, fr: 2, icon: "xcircle", title: "Uitstroom blokkeren", desc: "Block: USB, cloud-upload, plakken in browser, Bluetooth, apps. Override: print, netwerkshare, RDP. Klembord: audit.", user: "Kopiëren naar USB, uploaden en plakken in een website lukt niet; printen kan met een reden.", apply: (l) => _ep(l, { usb: "block", cloud: "block", paste: "block", bluetooth: "block", apps: "block", print: "warn", network: "warn", rdp: "warn", clipboard: "audit" }) },
  { id: "ep-block", d: "dlp_endpoint", lv: 4, fr: 3, icon: "shield", title: "Alles blokkeren", desc: "Alle endpoint-activiteiten Block; afdrukken en klembord: Block with override (anders kan ook de eigenaar zelf niet meer printen).", user: "Kopiëren naar USB, uploaden en plakken lukken niet – ook niet voor de eigenaar zelf; printen kan alleen met een reden.", apply: (l) => _ep(l, { clipboard: "warn", print: "warn", _: "block" }) },

  // DLP – Copilot
  { id: "cp-off", d: "dlp_copilot", lv: 0, fr: 0, icon: "minus", title: "Copilot mag gebruiken (geen beperking)", desc: "Geen beperking: Copilot gebruikt inhoud waartoe de gebruiker toegang heeft (en EXTRACT bij encryptie).", user: "Copilot kan deze bestanden gebruiken in antwoorden, als jij er zelf toegang toe hebt.", apply: (l) => (l.cfg.dlp.copilot = { action: "off" }) },
  { id: "cp-sim", d: "dlp_copilot", lv: 1, fr: 0, icon: "eye", title: "Eerst simuleren", desc: "Regel ‘Prevent Copilot from processing content’ in een policy in simulatiemodus: inzicht zonder impact.", lic: "copilot", user: "Je merkt niets; beheer ziet hoe vaak Copilot deze bestanden zou gebruiken.", apply: (l) => (l.cfg.dlp.copilot = { action: "audit" }) },
  { id: "cp-block", d: "dlp_copilot", lv: 4, fr: 2, icon: "shield", title: "Uitsluiten van Copilot", desc: "Prevent Copilot from processing content: items met dit label worden niet gebruikt in Copilot-antwoorden.", lic: "copilot", user: "Copilot gebruikt de inhoud niet in antwoorden; het bestand kan wel als bron genoemd worden.", apply: (l) => (l.cfg.dlp.copilot = { action: "block" }) },

  // DLP – Fabric/Power BI
  { id: "fb-off", d: "dlp_fabric", lv: 0, fr: 0, icon: "minus", title: "Geen controle", desc: "", user: "Werken met Power BI en Fabric gaat zoals altijd.", apply: (l) => (l.cfg.dlp.fabric = { action: "off" }) },
  { id: "fb-tip", d: "dlp_fabric", lv: 1, fr: 1, icon: "bulb", title: "Policy tip", desc: "Policy tip op semantic model/lakehouse en alert bij detectie.", user: "Je ziet een melding bij het rapport of datamodel.", apply: (l) => (l.cfg.dlp.fabric = { action: "tip" }) },
  { id: "fb-override", d: "dlp_fabric", lv: 2, fr: 2, icon: "alert", title: "Externen blokkeren met override", desc: "Restrict access (preview), ‘Block only people outside your organization’: alleen mensen buiten de organisatie verliezen toegang; overrulen met justificatie is mogelijk.", preview: true, user: "Collega’s houden toegang; alleen mensen buiten de organisatie verliezen toegang (opheffen kan met een reden).", apply: (l) => (l.cfg.dlp.fabric = { action: "override" }) },
  { id: "fb-block", d: "dlp_fabric", lv: 3, fr: 2, icon: "xcircle", title: "Toegang beperken", desc: "Restrict access (preview): alleen data-eigenaren houden toegang; alle anderen verliezen toegang tot het item is opgeschoond.", preview: true, user: "Alleen de eigenaren kunnen het datamodel nog openen.", apply: (l) => (l.cfg.dlp.fabric = { action: "block" }) },

  // DLP – On-premises
  { id: "op-off", d: "dlp_onprem", lv: 0, fr: 0, icon: "minus", title: "Geen controle", desc: "", user: "Op de fileserver verandert niets (on-premises kent geen meldingen of policy tips).", apply: (l) => (l.cfg.dlp.onprem = { action: "off" }) },
  { id: "op-audit", d: "dlp_onprem", lv: 1, fr: 0, icon: "eye", title: "Inventariseren", desc: "Scanner rapporteert matches (geen actie). Geen gebruikersmeldingen of policy tips voor on-premises.", user: "Je merkt niets (geen melding of policy tip); beheer ziet waar deze bestanden op de fileserver staan.", apply: (l) => (l.cfg.dlp.onprem = { action: "audit" }) },
  { id: "op-block", d: "dlp_onprem", lv: 3, fr: 1, icon: "lock", title: "Toegang beperken", desc: "Block everyone behalve eigenaar: NTFS-rechten worden ingeperkt. Geen gebruikersmeldingen of policy tips voor on-premises.", user: "Alleen de eigenaar kan het bestand op de fileserver nog openen; anderen krijgen geen melding of policy tip, alleen ‘geen toegang’.", apply: (l) => (l.cfg.dlp.onprem = { action: "block" }) },
  { id: "op-move", d: "dlp_onprem", lv: 4, fr: 2, icon: "folder", title: "Naar quarantaine", desc: "Bestand verplaatsen naar een quarantainemap (met notitie op de oorspronkelijke locatie). Geen gebruikersmeldingen of policy tips voor on-premises.", user: "Het bestand verhuist naar een quarantainemap; op de oude plek staat een notitie (geen melding of policy tip).", apply: (l) => (l.cfg.dlp.onprem = { action: "move" }) },

  // DLP – Instances
  { id: "in-off", d: "dlp_instances", lv: 0, fr: 0, icon: "minus", title: "Geen controle", desc: "", user: "In andere cloud-apps verandert niets.", apply: (l) => (l.cfg.dlp.instances = { action: "off" }) },
  { id: "in-audit", d: "dlp_instances", lv: 1, fr: 0, icon: "eye", title: "Monitoren", desc: "Matches in gekoppelde cloud-apps rapporteren.", user: "Je merkt niets; beheer ziet deze bestanden in gekoppelde cloud-apps.", apply: (l) => (l.cfg.dlp.instances = { action: "audit" }) },
  { id: "in-govern", d: "dlp_instances", lv: 3, fr: 1, icon: "shield", title: "Extern delen intrekken", desc: "Governance: externe gebruikers verwijderen / item privé maken.", user: "Externe toegang tot het bestand in bijv. Box of Dropbox wordt ingetrokken.", apply: (l) => (l.cfg.dlp.instances = { action: "govern" }) },

  // Melden & monitoren
  { id: "nt-silent", d: "notify", lv: 0, fr: 0, icon: "eye", title: "Stil registreren", desc: "Geen policy tips of e-mail; severity Low; zichtbaar in Activity explorer.", user: "Je krijgt geen meldingen; alles wordt stil geregistreerd.", apply: (l) => (l.cfg.notify = { tip: false, tipText: "", emailUser: false, override: "justification", alert: "none", severity: "Low", incidentReport: false }) },
  { id: "nt-tip", d: "notify", lv: 1, fr: 1, icon: "bulb", title: "Policy tip", desc: "Policy tip voor de gebruiker; severity Low.", user: "Je ziet een korte uitleg (policy tip) als je iets doet met deze gegevens.", apply: (l) => (l.cfg.notify = { tip: true, tipText: "", emailUser: false, override: "justification", alert: "none", severity: "Low", incidentReport: false }) },
  { id: "nt-tipmail", d: "notify", lv: 2, fr: 1, icon: "mail", title: "Tip + e-mail aan gebruiker", desc: "Policy tip en e-mailnotificatie; override met justificatie; severity Medium.", user: "Je ziet een uitleg en krijgt ook een mail; bij een blokkade kun je een reden opgeven.", apply: (l) => (l.cfg.notify = { tip: true, tipText: "", emailUser: true, override: "justification", alert: "none", severity: "Medium", incidentReport: false }) },
  { id: "nt-alert", d: "notify", lv: 3, fr: 1, icon: "bell", title: "Alert naar security", desc: "Als hiervoor + alert bij elke match (severity Medium) in het DLP-alertsdashboard.", user: "Als hiervoor; het securityteam krijgt ook een melding.", apply: (l) => (l.cfg.notify = { tip: true, tipText: "", emailUser: true, override: "justification", alert: "every", severity: "Medium", incidentReport: false }) },
  { id: "nt-incident", d: "notify", lv: 4, fr: 1, icon: "alert", title: "Alert High + incidentrapport", desc: "Severity High, alert bij elke match en e-mail-incidentrapport aan compliance.", user: "Als hiervoor; het securityteam krijgt een melding met hoge prioriteit en een rapport.", apply: (l) => (l.cfg.notify = { tip: true, tipText: "", emailUser: true, override: "justification", alert: "every", severity: "High", incidentReport: true }) },
];
CATALOG.choiceById = Object.fromEntries(CATALOG.choices.map((c) => [c.id, c]));
CATALOG.choicesFor = (d) => CATALOG.choices.filter((c) => c.d === d);

/* ---------- Profielkaarten: complete kolom in één keer (sleep op labelkolom) ----------
   Generieke namen (los van labelnamen). Optionele rijen (Fabric, on-premises, cloud-apps) staan standaard uit;
   `opt` geeft de keuze als de klant die omgeving wél heeft (Start → Meer gegevens). Meetings: geen Teams Premium nodig. */
CATALOG.profiles = [
  { id: "pf-public", name: "Open", lv: 0, color: "#13A10E", desc: "Vrij te delen; geen markering, encryptie of DLP.",
    choices: { publish: "pub-all", autolabel: "al-manual", marking: "mk-none", encryption: "enc-none", container: "ct-public", meetings: "mt-none", dlp_exchange: "dx-off", dlp_sharing: "ds-off", dlp_teams: "tm-off", dlp_endpoint: "ep-off", dlp_copilot: "cp-off", dlp_fabric: "fb-off", dlp_onprem: "op-off", dlp_instances: "in-off", notify: "nt-silent" },
    opt: { dlp_fabric: "fb-off", dlp_onprem: "op-off", dlp_instances: "in-off" } },
  { id: "pf-internal", name: "Basis", lv: 1, color: "#0F6CBD", desc: "Default label, footer, bewustwording bij extern delen.",
    choices: { publish: "pub-default", autolabel: "al-manual", marking: "mk-footer", encryption: "enc-none", container: "ct-guests", meetings: "mt-label", dlp_exchange: "dx-audit", dlp_sharing: "ds-audit", dlp_teams: "tm-off", dlp_endpoint: "ep-audit", dlp_copilot: "cp-off", dlp_fabric: "fb-off", dlp_onprem: "op-off", dlp_instances: "in-off", notify: "nt-silent" },
    opt: { dlp_fabric: "fb-off", dlp_onprem: "op-audit", dlp_instances: "in-off" } },
  { id: "pf-conf", name: "Beschermen", lv: 2, color: "#CA5010", desc: "Header/footer, encryptie organisatie, waarschuwen en override bij extern.",
    choices: { publish: "pub-all", autolabel: "al-recommend", marking: "mk-hf", encryption: "enc-org", container: "ct-internal", meetings: "mt-label", dlp_exchange: "dx-override", dlp_sharing: "ds-override", dlp_teams: "tm-tip", dlp_endpoint: "ep-warn", dlp_copilot: "cp-off", dlp_fabric: "fb-off", dlp_onprem: "op-off", dlp_instances: "in-off", notify: "nt-tipmail" },
    opt: { dlp_fabric: "fb-tip", dlp_onprem: "op-audit", dlp_instances: "in-audit" } },
  { id: "pf-conf-ext", name: "Beschermen + partners", lv: 2, color: "#CA5010", desc: "Als Beschermen, maar partnerdomeinen kunnen openen.",
    choices: { publish: "pub-all", autolabel: "al-recommend", marking: "mk-hf", encryption: "enc-partners", container: "ct-guests", meetings: "mt-label", dlp_exchange: "dx-tip", dlp_sharing: "ds-anyone", dlp_teams: "tm-tip", dlp_endpoint: "ep-warn", dlp_copilot: "cp-off", dlp_fabric: "fb-off", dlp_onprem: "op-off", dlp_instances: "in-off", notify: "nt-tipmail" },
    opt: { dlp_fabric: "fb-tip", dlp_onprem: "op-audit", dlp_instances: "in-audit" } },
  { id: "pf-conf-specific", name: "Persoonlijk delen", lv: 3, color: "#C50F1F", desc: "Gebruiker kiest ontvangers (Do Not Forward); extern blokkeren met override.",
    choices: { publish: "pub-all", autolabel: "al-manual", marking: "mk-wm", encryption: "enc-user", container: "ct-none", meetings: "mt-label", dlp_exchange: "dx-override", dlp_sharing: "ds-override", dlp_teams: "tm-override", dlp_endpoint: "ep-egress", dlp_copilot: "cp-off", dlp_fabric: "fb-off", dlp_onprem: "op-off", dlp_instances: "in-off", notify: "nt-alert" },
    opt: { dlp_fabric: "fb-override", dlp_onprem: "op-block", dlp_instances: "in-govern" } },
  { id: "pf-strict", name: "Streng", lv: 4, color: "#8764B8", desc: "Doelgroep-encryptie, watermerk met naam, automatisch labelen, extern blokkeren, uitsluiten van Copilot.",
    choices: { publish: "pub-groups", autolabel: "al-service", marking: "mk-user", encryption: "enc-group", container: "ct-locked", meetings: "mt-label", dlp_exchange: "dx-block", dlp_sharing: "ds-block", dlp_teams: "tm-block", dlp_endpoint: "ep-egress", dlp_copilot: "cp-block", dlp_fabric: "fb-off", dlp_onprem: "op-off", dlp_instances: "in-off", notify: "nt-incident" },
    opt: { dlp_fabric: "fb-block", dlp_onprem: "op-move", dlp_instances: "in-govern" } },
];