/* Presets (Generiek / Zorg / Overheid / Leeg), SIT-factory en standaard-persona's */

/** Maakt een SIT-object voor state.sits vanuit een catalogusitem. kind: builtin|classifier|custom|edm|fingerprint|object */
function makeSit(kind, ref, extra = {}) {
  const base = { id: uid("sit"), kind, ref, name: ref, desc: "", confidence: "high", minCount: 1, sector: "generic" };
  const find = (arr) => (arr || []).find((x) => x.id === ref);
  let c;
  switch (kind) {
    case "builtin": c = find(CATALOG.builtinSits); if (c) Object.assign(base, { name: c.name, desc: c.desc, region: c.region, cat: c.cat, entity: !!c.entity, cred: !!c.cred }); break;
    case "classifier": c = find(CATALOG.classifiers); if (c) Object.assign(base, { name: c.name, desc: c.desc, cat: c.cat, confidence: "" }); break;
    case "custom": c = find(CATALOG.customSitTemplates); if (c) Object.assign(base, { name: c.name, desc: c.desc, sector: c.sector, regex: c.regex, keywords: [...c.keywords], proximity: c.proximity, high: clone(c.high), medium: clone(c.medium) }); break;
    case "edm": c = find(CATALOG.edmTemplates); if (c) Object.assign(base, { name: `EDM – ${c.name}`, desc: c.desc, sector: c.sector, fields: clone(c.fields) }); break;
    case "fingerprint": c = find(CATALOG.fingerprintTemplates); if (c) Object.assign(base, { name: `Fingerprint – ${c.name}`, desc: c.desc, sector: c.sector, confidence: "" }); break;
    case "object": c = find(CATALOG.infoObjects); if (c) Object.assign(base, { name: c.name, desc: c.hint, sector: c.sector, confidence: "" }); break;
  }
  return Object.assign(base, extra);
}
function sitKindOf(ref) {
  if (CATALOG.builtinSits.some((x) => x.id === ref)) return "builtin";
  if (CATALOG.classifiers.some((x) => x.id === ref)) return "classifier";
  if (CATALOG.customSitTemplates.some((x) => x.id === ref)) return "custom";
  if (CATALOG.edmTemplates.some((x) => x.id === ref)) return "edm";
  if (CATALOG.fingerprintTemplates.some((x) => x.id === ref)) return "fingerprint";
  if (CATALOG.infoObjects.some((x) => x.id === ref)) return "object";
  return null;
}
/** Zorgt dat een catalogus-SIT in de state staat en geeft het id terug. */
function ensureSit(st, ref, kind = sitKindOf(ref)) {
  let s = st.sits.find((x) => x.ref === ref && x.kind === kind);
  if (!s) { s = makeSit(kind, ref); st.sits.push(s); }
  return s.id;
}

const DEFAULT_PERSONAS = [
  { name: "Medewerker (kenniswerker)", icon: "user", desc: "Maakt en deelt dagelijks documenten en e-mail, intern en met externen.", touch: ["publish", "marking", "encryption", "dlp_exchange", "dlp_sharing", "dlp_teams", "dlp_endpoint", "dlp_copilot"] },
  { name: "Key-user / ambassadeur", icon: "star", desc: "Eerste aanspreekpunt in de afdeling, test labels en policy tips vooraf.", touch: ["publish", "autolabel", "marking", "encryption", "dlp_exchange", "dlp_sharing"] },
  { name: "Manager / directie", icon: "users", desc: "Werkt met strategische en personele informatie, veel extern contact.", touch: ["encryption", "meetings", "dlp_exchange", "dlp_copilot", "container"] },
  { name: "HR-adviseur", icon: "heart", desc: "Verwerkt personeelsdossiers, BSN en salarisgegevens; deelt met arbodienst en salarisverwerker.", touch: ["encryption", "dlp_exchange", "dlp_sharing", "dlp_endpoint", "autolabel"] },
  { name: "Teameigenaar", icon: "site", desc: "Maakt teams en sites aan en nodigt gasten uit.", touch: ["container", "meetings", "dlp_sharing"] },
  { name: "IT-beheerder", icon: "settings", desc: "Beheert tenant-instellingen, apparaten (onboarding) en ondersteunt gebruikers.", touch: ["dlp_endpoint", "dlp_teams"] },
  { name: "Security officer / SOC", icon: "shield", desc: "Beoordeelt DLP-alerts en incidenten, stemt drempels af.", touch: ["notify"] },
  { name: "Privacy officer / FG", icon: "book", desc: "Toetst op AVG; ontvangt incidentrapporten over persoonsgegevens.", touch: ["notify", "recognition"] },
  { name: "Juridisch / compliance", icon: "bank", desc: "Bewaakt contracten, NDA’s en wet- en regelgeving.", touch: ["encryption", "dlp_exchange", "notify"] },
];
const ZORG_PERSONAS = [
  { name: "Zorgprofessional (arts/verpleegkundige)", icon: "heart", desc: "Werkt met patiëntgegevens, verwijst naar en communiceert met externe zorgpartners.", touch: ["publish", "marking", "encryption", "dlp_exchange", "dlp_teams", "dlp_endpoint", "dlp_copilot", "meetings"] },
  { name: "Zorgadministratie / declaratie", icon: "table", desc: "Verwerkt polisnummers, AGB-codes en declaraties richting zorgverzekeraars.", touch: ["dlp_exchange", "dlp_sharing", "dlp_endpoint", "autolabel"] },
];

const OVERHEID_PERSONAS = [
  { name: "Medewerker Burgerzaken", icon: "user", desc: "Werkt met BRP-gegevens, BSN en reisdocumenten; heeft dagelijks contact met inwoners.", touch: ["publish", "marking", "dlp_exchange", "dlp_endpoint", "dlp_copilot"] },
  { name: "Consulent sociaal domein", icon: "heart", desc: "Voert keukentafelgesprekken, maakt beschikkingen Wmo/Jeugd en deelt met zorgaanbieders.", touch: ["encryption", "dlp_exchange", "dlp_teams", "dlp_endpoint", "meetings"] },
  { name: "Handhaver / BOA", icon: "shield", desc: "Werkt mobiel met kentekens, processen-verbaal en foto’s.", touch: ["dlp_endpoint", "dlp_sharing", "marking"] },
  { name: "Raadsgriffie", icon: "book", desc: "Verspreidt raads- en collegestukken, ook geheime stukken met geheimhoudingsplicht.", touch: ["encryption", "publish", "dlp_exchange", "dlp_sharing"] },
];

function _personas(sector) {
  const extra = sector === "zorg" ? ZORG_PERSONAS : sector === "overheid" ? OVERHEID_PERSONAS : [];
  return [...DEFAULT_PERSONAS, ...extra].map((p) => ({ id: uid("per"), ...clone(p), comms: "", impact: {} }));
}

/* Presetdefinities: labels (met profielen en SIT-koppelingen), extra DLP.
   framework = normenkader (model FRAMEWORKS); roles = voorgestelde deelnemersrollen als er nog geen deelnemers zijn. */
const PRESETS = {
  generic: {
    id: "generic", name: "Generiek", icon: "layers", sector: "generic", framework: "none",
    desc: "Veelgebruikt schema in 4 niveaus, met sublabels voor partners, HR en management.",
    labels: [
      { name: "Openbaar", profile: "pf-public", tooltip: "Informatie die bedoeld is voor of zonder risico gedeeld kan worden met het publiek, zoals persberichten en website-inhoud.", info: ["Persbericht", "Website-inhoud", "Publieke brochure"] },
      { name: "Algemeen", profile: "pf-internal", tooltip: "Informatie voor intern gebruik die zonder grote schade gedeeld kan worden met externen waarmee we samenwerken. Standaardlabel.", info: ["Werkinstructie", "Intranetbericht", "Agenda"] },
      { name: "Vertrouwelijk", color: "#CA5010", tooltip: "Gevoelige bedrijfsinformatie die schade kan veroorzaken als deze met onbevoegden wordt gedeeld.", children: [
        { name: "Intern", profile: "pf-conf", audience: "Alle medewerkers", tooltip: "Vertrouwelijke informatie die alleen binnen de organisatie gedeeld mag worden. Versleuteld: alleen medewerkers kunnen openen.", sits: ["iban", "cc", "pwd", "azkey", "tc-customer", "tc-finance", "edm-customer"], info: ["Klantenbestand", "Budget", "Projectplan"] },
        { name: "Externe partners", profile: "pf-conf-ext", audience: "Medewerkers + partnerdomeinen", tooltip: "Vertrouwelijke informatie die gedeeld wordt met vaste partners. Versleuteld: medewerkers en partnerdomeinen kunnen openen.", sits: ["tc-agreements", "tpl-contract", "fp-nda"], info: ["Contract / overeenkomst", "Offerte"] },
        { name: "Specifieke personen", profile: "pf-conf-specific", audience: "Door gebruiker gekozen personen", tooltip: "Vertrouwelijke informatie voor door jou gekozen personen. Je kiest zelf wie toegang krijgt; e-mail krijgt ‘Niet doorsturen’.", sits: ["tc-legal"], info: ["Juridisch advies", "Vertrouwelijke correspondentie"] },
      ] },
      { name: "Strikt vertrouwelijk", color: "#8764B8", tooltip: "Zeer gevoelige informatie die ernstige schade kan veroorzaken; alleen toegankelijk voor een beperkte doelgroep.", children: [
        { name: "HR", profile: "pf-strict", audience: "HR", tooltip: "Personeelsdossiers, salarisgegevens en andere zeer gevoelige HR-informatie. Alleen HR kan openen.", sits: ["bsn", "nl-pp", "nl-dl", "tc-hr", "tc-payslip", "tc-employment", "tpl-pers", "edm-employee", "fp-arbeid"], info: ["Personeelsdossier", "Salarisoverzicht"] },
        { name: "Management", profile: "pf-strict", audience: "Directie & management", tooltip: "Strategische informatie zoals fusies, overnames en RvB-stukken. Alleen het management kan openen.", sits: ["tc-mna", "tc-business", "tc-finstat", "tpl-project"], info: ["Directie-/RvB-stukken", "Jaarrekening (concept)"] },
      ] },
    ],
    copilotPromptSits: ["bsn", "cc", "iban"],
  },
  zorg: {
    id: "zorg", name: "Zorg", icon: "heart", sector: "zorg", framework: "nen7510",
    desc: "Voor zorginstellingen (NEN 7510, AVG art. 9): patiëntgegevens, zorgpartners, HR en directie.",
    roles: ["CISO / security officer", "FG", "Medisch manager / zorgprofessional", "Applicatiebeheer M365", "EPD-beheer"],
    labels: [
      { name: "Openbaar", profile: "pf-public", tooltip: "Informatie voor patiënten en publiek, zoals folders en website-inhoud.", info: ["Patiëntenfolder", "Persbericht"] },
      { name: "Intern", profile: "pf-internal", tooltip: "Informatie voor intern gebruik zonder patiëntgegevens, zoals werkinstructies en roosters. Standaardlabel.", info: ["Protocol", "Rooster", "Werkinstructie"] },
      { name: "Vertrouwelijk", color: "#CA5010", tooltip: "Patiënt- en bedrijfsgegevens die alleen voor bevoegden toegankelijk mogen zijn.", children: [
        { name: "Patiëntgegevens", profile: "pf-conf", choices: { notify: "nt-alert" }, audience: "Alle medewerkers", tooltip: "Patiëntgegevens en vertrouwelijke bedrijfsinformatie die binnen de organisatie blijven. Versleuteld: alleen medewerkers kunnen openen.", sits: ["bsn", "tpl-patnr", "tpl-opname", "edm-patient", "med-all", "icd10", "fp-intake", "tc-healthcare", "tc-medforms", "pwd"], info: ["Patiëntdossier", "Behandelplan", "Labrapport"] },
        { name: "Externe zorgpartners", profile: "pf-conf-ext", choices: { notify: "nt-alert" }, audience: "Medewerkers + zorgpartners", tooltip: "Patiëntgegevens die gedeeld worden met vaste zorgpartners (huisartsen, ziekenhuizen, apotheken). Versleuteld voor medewerkers en partnerdomeinen.", adminDesc: "Niet voor zorgverzekeraars – andere grondslag.", sits: ["fp-verwijs", "tpl-agb", "tpl-big", "tpl-polis", "tpl-uzi"], info: ["Verwijsbrief", "Ontslagbrief"] },
        { name: "Specifieke personen", profile: "pf-conf-specific", audience: "Door gebruiker gekozen personen", tooltip: "Vertrouwelijke informatie voor door jou gekozen personen, bijv. een cliënt of één behandelaar. E-mail krijgt ‘Niet doorsturen’.", sits: ["tc-legal"], info: ["Klachtdossier", "Correspondentie cliënt"] },
      ] },
      { name: "Geheim", color: "#8764B8", tooltip: "Zeer gevoelige informatie voor een beperkte doelgroep.", children: [
        { name: "HR", profile: "pf-strict", audience: "HR", tooltip: "Personeelsdossiers en salarisgegevens. Alleen HR kan openen.", sits: ["tc-hr", "tc-payslip", "tc-employment", "tpl-pers", "edm-employee"], info: ["Personeelsdossier", "Salarisoverzicht"] },
        { name: "Directie", profile: "pf-strict", audience: "Raad van Bestuur & directie", tooltip: "Strategische en bestuurlijke informatie (fusies, RvB/RvT-stukken). Alleen de directie kan openen.", sits: ["tc-mna", "tc-business", "tc-finstat"], info: ["RvB-/RvT-stukken", "Fusiedossier"] },
      ] },
    ],
    copilotPromptSits: ["bsn", "tpl-patnr", "iban"],
    bulkSits: { name: "BSN in bulk naar extern", sits: ["bsn"], min: 10 },
  },
  overheid: {
    id: "overheid", name: "Gemeente / overheid (BIO)", icon: "bank", sector: "overheid", framework: "bio",
    desc: "Voor gemeenten en overheid (BIO, AVG, Woo): sociaal domein, personeel en bestuur.",
    roles: ["CISO / CIO", "FG", "Informatiebeheerder", "Teamleider sociaal domein", "M365-beheerder"],
    labels: [
      { name: "Openbaar", profile: "pf-public", tooltip: "Informatie die openbaar is of openbaar gemaakt mag worden, zoals raadsstukken, persberichten en Woo-publicaties.", info: ["Persbericht", "Openbaar raadsstuk", "Woo-publicatie"] },
      { name: "Intern", profile: "pf-internal", tooltip: "Informatie voor intern gebruik zonder persoonsgegevens, zoals werkinstructies en interne nieuwsbrieven. Standaardlabel.", info: ["Werkinstructie", "Interne nieuwsbrief", "Agenda"] },
      { name: "Vertrouwelijk", color: "#CA5010", tooltip: "Informatie met persoonsgegevens of bedrijfsgevoelige gegevens die alleen voor bevoegden toegankelijk mag zijn.", children: [
        { name: "Organisatie", profile: "pf-conf", audience: "Alle medewerkers", tooltip: "Zaakdossiers en vertrouwelijke informatie die binnen de gemeente blijven. Versleuteld: alleen medewerkers kunnen openen.", sits: ["iban", "nl-pp", "nl-dl", "tpl-zaaknr"], info: ["Zaakdossier", "Bezwaarschrift", "Woo-besluit (concept)"] },
        { name: "Sociaal domein", profile: "pf-strict", audience: "Team sociaal domein", tooltip: "Gegevens over inwoners in Wmo, Jeugdwet en Participatiewet. Alleen het team sociaal domein kan openen.", sits: ["bsn"], info: ["Beschikking Wmo/Jeugd", "Gespreksverslag keukentafel"] },
        { name: "Personeel", profile: "pf-strict", audience: "HR / P&O", tooltip: "Personeelsdossiers en salarisgegevens. Alleen HR kan openen.", sits: ["tc-hr", "tc-employment", "tc-payslip"], info: ["Personeelsdossier", "Salarisoverzicht"] },
      ] },
      { name: "Geheim", color: "#8764B8", tooltip: "Informatie waarop geheimhouding rust; alleen voor een beperkte doelgroep.", children: [
        { name: "Bestuur", profile: "pf-strict", audience: "College & directie", tooltip: "Geheime college- en raadsstukken en bestuurlijke dossiers. Alleen bestuur en directie kunnen openen.", sits: ["tpl-geheim"], info: ["Raadsvoorstel (geheim)", "Collegebesluit (geheim)"] },
      ] },
    ],
    copilotPromptSits: ["bsn", "iban", "nl-pp"],
  },
  empty: { id: "empty", name: "Leeg", icon: "plus", sector: "generic", framework: "none", desc: "Maak het classificatieschema uit Know your Data zelf na.", labels: [] },
};

/** Endpoint-lijsten met gangbare startwaarden (klant past aan in Endpoint-instellingen). */
const PRESET_ENDPOINT = { serviceDomains: ["*.dropbox.com", "*.wetransfer.com", "drive.google.com"], restrictedApps: ["Dropbox.exe"], unallowedBluetoothApps: ["fsquirt.exe"] };

/**
 * Een hoofdlabel (parent) wordt alleen gepubliceerd samen met zijn sublabels: als álle sublabels alleen
 * voor groepen zijn, volgt de parent die groepen; anders gaat hij mee in het beleid voor alle medewerkers.
 */
function syncParentPublish(st) {
  (st.labels || []).filter((l) => !l.parentId).forEach((par) => {
    const kids = st.labels.filter((c) => c.parentId === par.id);
    if (!kids.length) return;
    const pubs = kids.map((c) => (c.cfg && c.cfg.publish) || { audience: "all", groups: [] });
    par.cfg.publish = pubs.every((p) => p.audience === "groups")
      ? { audience: "groups", groups: [...new Set(pubs.flatMap((p) => p.groups || []))] }
      : { audience: "all", groups: [] };
  });
}

/** Bouwt een complete state op basis van een preset (meta blijft behouden). */
function buildPresetState(key, meta) {
  const p = PRESETS[key] || PRESETS.empty;
  const st = createEmptyState();
  if (meta) st.meta = { ...st.meta, ...clone(meta) };
  st.meta.preset = p.id;
  st.meta.sector = p.sector;
  if (!st.meta.framework || st.meta.framework === "none") st.meta.framework = p.framework || "none";
  if (p.roles && !(st.meta.participants || []).length) st.meta.participants = p.roles.map((role) => ({ name: "", role }));
  const plan = [];
  const add = (def, parentId) => {
    const l = newLabel(def.name, { parentId, tooltip: def.tooltip, audience: def.audience || "", info: def.info || [], color: def.color });
    l.adminDesc = def.adminDesc || "";
    st.labels.push(l);
    (def.sits || []).forEach((ref) => l.sits.push(ensureSit(st, ref)));
    if (def.profile) plan.push([l.id, def.profile, def.choices]);
    (def.children || []).forEach((c) => add(c, l.id));
  };
  p.labels.forEach((d) => add(d, null));
  plan.forEach(([id, pf, ch]) => { Mapping.applyProfile(st, id, pf); Object.entries(ch || {}).forEach(([, c]) => Mapping.apply(st, id, c)); });
  // Service-side labelen van mail met een doelgroep-versleuteld label maakt mail onleesbaar voor ontvangers buiten die groep: in presets alleen SharePoint/OneDrive
  st.labels.forEach((l) => { const a = l.cfg.autolabel.service; if (a.enabled && l.cfg.encryption.mode !== "none") a.exchange = false; });
  // Een parent-label moet minimaal de scope van zijn sublabels hebben
  st.labels.filter((l) => hasChildren(l, st)).forEach((par) => {
    const sc = par.cfg.scope;
    childrenOf(par.id, st).forEach((c) => Object.keys(sc).forEach((k) => { sc[k] = sc[k] || c.cfg.scope[k]; }));
  });
  syncParentPublish(st);
  if (p.labels.length) Object.entries(PRESET_ENDPOINT).forEach(([k, v]) => { if (!(st.endpoint[k] || []).length) st.endpoint[k] = [...v]; });
  if (p.copilotPromptSits && p.copilotPromptSits.length) {
    st.customDlp.push({
      id: uid("cdlp"), name: "DLP – Microsoft 365 Copilot – gevoelige gegevens in prompts", template: "custom", locations: ["copilot"], mode: "simulation",
      desc: "Prevent Copilot from processing content › Processing prompts: Copilot verwerkt geen prompts met deze gevoelige gegevens (alleen built-in en custom SIT’s; geen EDM/fingerprint/classifiers).", adminUnits: [],
      rules: [{ id: uid("crule"), name: "Gevoelige gegevens in prompts", labels: [], sits: p.copilotPromptSits.map((r) => ensureSit(st, r)), action: "copilot", copilotAction: "prompts", accessScope: null, extra: [], exceptions: [], severity: "Medium", alert: "none", incidentReport: false, tip: false, emailUser: false, override: "none", stop: false }],
    });
  }
  if (p.bulkSits) {
    const b = p.bulkSits;
    st.customDlp.push({
      id: uid("cdlp"), name: `DLP – ${b.name}`, template: "custom", locations: ["exchange", "sharepoint", "onedrive", "teams"], mode: "simulation",
      desc: `Blokkeert mail, delen en chat naar buiten zodra er ${b.min} of meer exemplaren in één item staan (bulk-export, geen override). Start in simulatie.`, adminUnits: [],
      rules: [{ id: uid("crule"), name: `${b.name} (${b.min}+)`, labels: [], sits: b.sits.map((r) => ensureSit(st, r)), minCount: b.min, maxCount: "any", action: "block", scope: "external", accessScope: null, extra: [], exceptions: [], severity: "High", alert: "every", incidentReport: true, tip: true, emailUser: true, override: "none", stop: false }],
    });
  }
  st.personas = _personas(p.sector);
  Generator.ensureGroupPolicies(st);
  return st;
}

function applyPreset(key) {
  const cur = S();
  const keep = ["customer", "date", "facilitator", "workshop", "participants", "notes", "prefix", "version", "status", "versions", "framework", "reviewed"];
  const meta = {};
  keep.forEach((k) => { if (cur.meta[k] !== undefined) meta[k] = clone(cur.meta[k]); });
  const st = buildPresetState(key, meta);
  Store.update((s) => { Object.keys(s).forEach((k) => delete s[k]); Object.assign(s, st); });
}
