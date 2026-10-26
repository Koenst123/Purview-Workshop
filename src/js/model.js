/* Datamodel: lege state, label-defaults, helpers voor hiërarchie en prioriteit, migratie */

function defaultLabelCfg() {
  return {
    scope: { files: true, emails: true, meetings: false, sites: false },
    publish: { audience: "all", groups: [] },
    autolabel: {
      client: { mode: "off", minCount: 1, maxCount: "any", confidence: "high", message: "" },
      service: { enabled: false, exchange: true, sharepoint: true, onedrive: true, mode: "simulation", minCount: 1, confidence: "high", overrideManual: false, encryptExternalMail: false },
    },
    marking: {
      header: { enabled: false, text: "", font: "Calibri", size: 10, color: "#000000", align: "Left" },
      footer: { enabled: false, text: "", font: "Calibri", size: 10, color: "#000000", align: "Left" },
      watermark: { enabled: false, text: "", font: "Calibri", size: 36, color: "#7F7F7F", layout: "Diagonal" },
    },
    encryption: {
      mode: "none", // none | assignNow | userDefined | remove
      permissions: [], // {id, type: org|authenticated|user|group|domain|partner, value, level: CoOwner|CoAuthor|Reviewer|Viewer|Custom, rights:[]}
      expiry: { type: "never", date: "", days: 30 },
      offline: { type: "always", days: 7 },
      userDefined: { outlook: "none", office: true }, // outlook: none | DoNotForward | EncryptOnly
      dke: false,
    },
    container: {
      privacy: "unspecified", // public | private | unspecified
      externalUserAccess: true,
      sharing: "ExistingExternalUserSharingOnly",
      unmanaged: "full", // full | limited | block
      authContext: "",
      defaultLinkType: "unspecified",
      defaultLinkPermission: "unspecified",
      privateTeamsDiscoverable: true,
      sharedChannels: { internalOnly: false, sameLabelOnly: false, privateTeamsOnly: false },
    },
    meetings: {
      lobbyBypass: "default",
      presenters: "default",
      whoCanRecord: "default",
      recordAutomatically: false,
      preventCopyChat: false,
      e2ee: false,
      watermarkScreen: false,
      watermarkVideo: false,
      detectSensitiveScreen: false,
      allowChat: "default",
    },
    dlp: {
      exchange: { action: "off", scope: "external" },
      sharing: { action: "off", scope: "external" },
      teams: { action: "off", scope: "external" },
      endpoint: { action: "off", activities: { cloud: "off", paste: "off", clipboard: "off", usb: "off", network: "off", print: "off", bluetooth: "off", rdp: "off", apps: "off" } },
      copilot: { action: "off" },
      fabric: { action: "off" },
      onprem: { action: "off" },
      instances: { action: "off" },
    },
    notify: { tip: true, tipText: "", emailUser: false, override: "none", alert: "none", severity: "Low", incidentReport: false },
  };
}

function createEmptyState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    app: "pyd-ipdlp-designer",
    meta: {
      customer: "",
      date: today(),
      facilitator: "",
      workshop: "W1",
      preset: "empty",
      sector: "generic",
      participants: [],
      notes: "",
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      prefix: "",
      version: "0.1",            // ontwerpversie (Start)
      status: "concept",         // concept | review | final (Concept / Ter besluitvorming / Vastgesteld)
      versions: [],              // [{id, version, date, change, by}] – versiebeheer
      framework: "none",         // none | bio | nen7510 | iso27001 | avg (normenkader)
      docLabelId: "",            // classificatie van het ontwerpdocument (label-id; leeg = "Vertrouwelijk")
      reviewed: {},              // { [route]: true } – stap besproken (facilitator)
      exportedAt: "",            // ISO-tijd van de laatste export/download
      savedAt: "",               // ISO-tijd van de laatste lokale autosave
    },
    labels: [],
    sits: [], // geselecteerde/gedefinieerde classifiers voor dit ontwerp
    groups: [ // doelgroepen/principals die in policies/encryptie gebruikt worden
      { id: "grp-all", name: "Alle medewerkers", kind: "all", value: "" },
    ],
    labelPolicies: [
      { id: "lp-global", name: "Labelbeleid – Alle medewerkers", scope: "all", groups: [], labels: [], settings: defaultLabelPolicySettings(), adv: {} },
    ],
    tenant: { checks: {} },
    endpoint: defaultEndpointSettings(),
    dlpSettings: defaultDlpSettings(),
    customDlp: [],
    personas: [],
    scenarioResults: {},      // { [scenarioId]: {labelId?, predict?: pass|tip|block|"", ...} }
    customScenarios: [],      // eigen scenario's, zelfde vorm als CATALOG.scenarios (id "csc-…")
    adoption: { notes: {}, phases: {} }, // phases: { [fase-id]: {owner, start, due} }
    decisions: [], // besluitenlog / open punten: {id, status, kind (afgeleid), text, route, at, owner, due}
  };
}

/** Status van een besluit of open punt; `kind` blijft afgeleid voor oudere versies/JSON. */
const DECISION_STATUSES = ["besloten", "bespreken", "open", "nvt"];
const DECISION_STATUS_META = { besloten: ["Besloten", "checkcircle"], bespreken: ["Te bespreken", "question"], open: ["Open", "clock"], nvt: ["N.v.t.", "minus"] };
function decisionKind(status) { return status === "besloten" ? "decision" : "park"; }
/** Status van een besluit, ook voor nog niet genormaliseerde (oudere) objecten met alleen `kind`. */
function decisionStatus(d) { return d && DECISION_STATUSES.includes(d.status) ? d.status : d && d.kind === "park" ? "open" : "besloten"; }

/** Limieten bij laden/importeren (bescherming tegen te grote of kwaadaardige bestanden). */
const STATE_CAPS = { labels: 200, sits: 500, customDlp: 200, personas: 100, decisions: 1000, groups: 300, customScenarios: 50, labelPolicies: 200, participants: 100, versions: 200, str: 20000 };
const FRAMEWORKS = [["none", "Geen / nog niet bepaald"], ["bio", "BIO (overheid)"], ["nen7510", "NEN 7510 (zorg)"], ["iso27001", "ISO/IEC 27001"], ["avg", "AVG (alleen privacy)"]];
const DESIGN_STATUS = [["concept", "Concept"], ["review", "Ter besluitvorming"], ["final", "Vastgesteld"]];

function defaultLabelPolicySettings() {
  return {
    justification: true,          // Users must provide a justification to remove a label or lower its classification
    mandatoryDocs: false,         // Require users to apply a label to their emails and documents (docs)
    mandatoryEmail: false,
    mandatoryMeetings: false,
    mandatorySites: false,
    mandatoryFabric: false,       // Require users to apply a label to their Fabric and Power BI content
    helpLink: "",
    defaultDocs: "",              // Default label for documents (label id)
    defaultEmail: "",             // Default label for emails ("same as documents" => "sameAsDocs")
    defaultMeetings: "",
    defaultSites: "",
    defaultFabric: "",
  };
}

function defaultEndpointSettings() {
  return {
    advancedClassification: true,
    bandwidthLimit: "unlimited",   // "unlimited" of MB per 24 uur per apparaat
    advancedLabelProtection: false,
    alwaysAudit: true,
    networkShareCoverage: true,
    fileEvidence: false,
    evidenceStorage: "",
    evidenceStoreType: "customer", // customer | microsoft
    evidenceCacheDays: 30,         // 7 | 30 | 60
    jitProtection: false,
    archiveSupport: true,
    ocr: false,
    pathExclusionsWin: ["%SystemDrive%\\Users\\*(1)\\AppData\\Roaming", "%SystemDrive%\\Users\\*(1)\\AppData\\Local"],
    pathExclusionsMac: ["/System"],
    macRecommendedExclusions: true,
    networkShareExclusions: [],
    unallowedBrowsers: [],
    serviceDomainMode: "block", // allow | block (lijst = toegestane/geblokkeerde domeinen)
    serviceDomains: [],
    sensitiveDomainGroups: [],
    restrictedApps: [],
    restrictedAppGroups: [],
    autoQuarantine: false,
    unallowedBluetoothApps: [],
    printerGroups: [],
    usbGroups: [],
    networkShareGroups: [],
    vpnAddresses: [],
    corporateNetwork: false,
    justificationOptions: [
      "This is part of an established business workflow",
      "My manager has approved this action",
      "Urgent access required; I'll notify my manager separately",
      "The information in these files is not sensitive",
      "Other",
    ],
    justificationMode: "both", // both | default | custom
    showJustificationDropdown: true,
  };
}

function defaultDlpSettings() {
  return {
    namingPrefix: "DLP",
    includeSitsForUnlabeled: true, // DLP-regel per label matcht label OF de gekoppelde SIT's (ongelabelde content)
    mergeIdentical: true,          // EXO/SPO/ODB/Teams in één policy als keuzes identiek zijn
    mode: "simulation",            // simulation | simulationTips | enable | disable
    adminUnits: [],
    perLocation: {},               // per DLP-domein: { name, mode, include:[], exclude:[], adminUnits:[] }
    alertRecipients: "",           // "fg@x.nl; soc@x.nl" – ontvangers van DLP-alerts/incidentrapporten
    partnerException: {},          // { [labelId]: true } – uitzondering "Recipient domain is <partnerdomeinen>" op de externe e-mailregel
  };
}

function newLabel(name, opts = {}) {
  const cfg = defaultLabelCfg();
  return {
    id: uid("lbl"),
    name,
    displayName: name,
    parentId: opts.parentId || null,
    color: opts.color || "#0F6CBD",
    tooltip: opts.tooltip || "",
    adminDesc: opts.adminDesc || "",
    audience: opts.audience || "", // "Doelgroep" uit Know your Data (voor sublabels)
    info: opts.info || [],         // informatietypen/-objecten (tekst)
    sits: opts.sits || [],         // ids uit state.sits
    owner: opts.owner || "",       // eigenaar (rol), bijv. "HR-manager"
    choices: {},
    custom: {},
    cfg,
  };
}

/* ---------- Hiërarchie & prioriteit ---------- */
function _buildOrder(st) {
  const kids = new Map();
  st.labels.forEach((l) => { if (l.parentId) { if (!kids.has(l.parentId)) kids.set(l.parentId, []); kids.get(l.parentId).push(l); } });
  const order = [];
  st.labels.forEach((t) => { if (!t.parentId) { order.push(t); (kids.get(t.id) || []).forEach((c) => order.push(c)); } });
  const idx = new Map(order.map((l, i) => [l, i]));
  const applicable = order.filter((l) => !kids.has(l.id));
  return { order, idx, applicable };
}
/* Cache per labels-array; geldig zolang objecten, ids en parentIds ongewijzigd zijn (O(n)-check i.p.v. O(n²) per aanroep). */
const _orderCache = new WeakMap();
function _labelOrder(st) {
  const arr = st.labels || [];
  const c = _orderCache.get(arr);
  if (c && c.snap.length === arr.length && c.snap.every((s, i) => s.o === arr[i] && s.id === arr[i].id && s.p === arr[i].parentId)) return c.val;
  const val = _buildOrder(st);
  _orderCache.set(arr, { snap: arr.map((l) => ({ o: l, id: l.id, p: l.parentId })), val });
  return val;
}
/** Labels in Purview-volgorde (prioriteit laag→hoog): parent gevolgd door zijn sublabels. */
function orderedLabels(st = S()) { return _labelOrder(st).order.slice(); }
function childrenOf(id, st = S()) { return st.labels.filter((l) => l.parentId === id); }
function parentOf(l, st = S()) { return l && l.parentId ? byId(st.labels, l.parentId) : null; }
function hasChildren(l, st = S()) { return st.labels.some((x) => x.parentId === l.id); }
/** Labels die gebruikers daadwerkelijk kunnen toepassen (parents met sublabels niet). */
function applicableLabels(st = S()) { return _labelOrder(st).applicable.slice(); }
/** Prioriteit 0 = laagste (Purview: onderaan/hoogste nummer = meest gevoelig). */
function labelPriority(l, st = S()) { const i = _labelOrder(st).idx.get(l); return i === undefined ? -1 : i; }
function labelFullName(l, st = S()) { const p = parentOf(l, st); return p ? `${p.displayName || p.name} / ${l.displayName || l.name}` : (l.displayName || l.name); }
function labelShortName(l) { return l.displayName || l.name; }
function labelById(id, st = S()) { return byId(st.labels, id); }
/** Technische naam (Name): alleen letters, cijfers, '-' en '_' (spaties → '-'); nooit leeg. Purview-limiet: 64 tekens (zie Validation). */
function labelTechName(l, st = S()) {
  const clean = (s) => String(s == null ? "" : s).replace(/[^\p{L}\p{N}\-_ ]/gu, "").trim().replace(/\s+/g, "-").replace(/-{2,}/g, "-").replace(/^[-_]+|[-_]+$/g, "");
  const p = parentOf(l, st);
  const own = clean(l && l.name) || clean(l && l.displayName) || "Label";
  const base = p ? [clean(p.name) || clean(p.displayName) || "Label", own].join("-") : own;
  const pre = clean(st && st.meta && st.meta.prefix);
  return (pre ? pre + "-" : "") + base;
}
/** Effectieve SIT's van een label: eigen + (voor sublabels) die van de parent. */
function labelSits(l, st = S()) {
  const p = parentOf(l, st);
  return unique([...(l.sits || []), ...(p ? p.sits || [] : [])]).map((id) => byId(st.sits, id)).filter(Boolean);
}
function sitById(id, st = S()) { return byId(st.sits, id); }

/* ---------- Migratie / normalisatie bij laden ---------- */
const ID_RE = /^[a-z]+-[a-z0-9]+$/i;
const _NZ = {
  obj: (v) => (isPlainObj(v) ? v : {}),
  objs: (v) => (Array.isArray(v) ? v.filter(isPlainObj) : []),
  str: (v, d = "") => (typeof v === "string" ? (v.length > STATE_CAPS.str ? v.slice(0, STATE_CAPS.str) : v) : typeof v === "number" && isFinite(v) ? String(v) : d),
  cap: (arr, n, key) => { if (arr.length > n) { _NZ.truncated.push(key); return arr.slice(0, n); } return arr; },
  truncated: [],
  strs: (v) => (Array.isArray(v) ? v : typeof v === "string" ? v.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean) : [])
    .filter((x) => typeof x === "string" || (typeof x === "number" && isFinite(x))).map(String),
  en: (v, list, d) => (list.includes(v) ? v : d),
  keys: (arr) => (arr || []).map((x) => (Array.isArray(x) ? x[0] : x && (x.key || x.id || x.type))).filter((x) => x !== undefined),
  /** Vorm v naar het type van de default; fill = ontbrekende sleutels aanvullen. Extra sleutels blijven bewaard. */
  shape(def, v, fill = true) {
    if (Array.isArray(def)) return Array.isArray(v) ? v : clone(def);
    if (isPlainObj(def)) {
      const src = isPlainObj(v) ? v : {};
      const out = {};
      Object.keys(def).forEach((k) => { if (fill || k in src) out[k] = _NZ.shape(def[k], src[k], fill); });
      Object.keys(src).forEach((k) => { if (!(k in def) && src[k] !== undefined) out[k] = src[k]; });
      return out;
    }
    if (typeof def === "boolean") return typeof v === "boolean" ? v : v === "true" ? true : v === "false" ? false : def;
    if (typeof def === "number") {
      if (typeof v === "number" && isFinite(v)) return v;
      if (typeof v === "string") return v.trim() !== "" && isFinite(Number(v)) ? Number(v) : v;
      return def;
    }
    if (typeof def === "string") return _NZ.str(v, def);
    return v === undefined ? def : v;
  },
};
/** Controleert ids (formaat + uniek) van een collectie; ongeldige/dubbele ids krijgen een nieuw uid. Retourneert resolve(oudId) → nieuwId|null. */
function _nzIds(items, prefix) {
  const ids = new Set(), remap = new Map();
  items.forEach((it) => {
    const id = it.id;
    if (typeof id === "string" && ID_RE.test(id) && !ids.has(id)) { ids.add(id); return; }
    const nid = uid(prefix);
    if (typeof id === "string" && !remap.has(id) && !ids.has(id)) remap.set(id, nid);
    it.id = nid; ids.add(nid);
  });
  return (ref) => (typeof ref !== "string" ? null : remap.has(ref) ? remap.get(ref) : ids.has(ref) ? ref : null);
}
const _nzRefs = (arr, resolve) => unique(_NZ.strs(arr).map(resolve).filter(Boolean));

function _nzLabelCfg(raw) {
  const N = _NZ, c = N.shape(defaultLabelCfg(), raw);
  const e = c.encryption;
  e.mode = N.en(e.mode, ["none", "assignNow", "userDefined", "remove"], "none");
  e.permissions = N.objs(e.permissions).map((p) => ({ ...p,
    type: N.en(p.type, ["org", "authenticated", "user", "group", "domain", "partner"], "group"),
    value: N.str(p.value), level: N.en(p.level, ["CoOwner", "CoAuthor", "Reviewer", "Viewer", "Custom"], "Viewer"), rights: N.strs(p.rights) }));
  _nzIds(e.permissions, "perm");
  e.expiry.type = N.en(e.expiry.type, ["never", "date", "days"], "never");
  e.offline.type = N.en(e.offline.type, ["always", "never", "days"], "always");
  e.userDefined.outlook = N.en(e.userDefined.outlook, ["none", "DoNotForward", "EncryptOnly"], "none");
  const al = c.autolabel;
  al.client.mode = N.en(al.client.mode, ["off", "recommend", "auto"], "off");
  al.service.mode = N.en(al.service.mode, ["simulation", "enable", "disable"], "simulation");
  const ct = c.container;
  ct.privacy = N.en(ct.privacy, N.keys(CATALOG.containerPrivacy), "unspecified");
  ct.sharing = N.en(ct.sharing, N.keys(CATALOG.siteSharing), "ExistingExternalUserSharingOnly");
  ct.unmanaged = N.en(ct.unmanaged, N.keys(CATALOG.unmanagedAccess), "full");
  const mt = c.meetings;
  [["lobbyBypass", CATALOG.meetingLobby], ["presenters", CATALOG.meetingPresenters], ["whoCanRecord", CATALOG.meetingRecorders], ["allowChat", CATALOG.meetingChat]]
    .forEach(([k, list]) => { const ks = N.keys(list); if (ks.length) mt[k] = N.en(mt[k], ks, ks.includes("default") ? "default" : ks[0]); });
  const acts = ["off", "audit", "tip", "encrypt", "override", "block", "move", "govern", "custom", "copilot", "warn"];
  const levels = N.keys(CATALOG.endpointLevels).length ? N.keys(CATALOG.endpointLevels) : ["off", "audit", "warn", "block"];
  Object.keys(c.dlp).forEach((d) => {
    const v = c.dlp[d] = N.obj(c.dlp[d]);
    v.action = N.en(v.action, acts, "off");
    if ("scope" in v) v.scope = N.en(v.scope, ["external", "all", "anyone", "internal"], "external");
    if ("activities" in v) { v.activities = N.obj(v.activities); Object.keys(v.activities).forEach((k) => { v.activities[k] = N.en(v.activities[k], levels, "off"); }); }
  });
  const nt = c.notify;
  nt.override = N.en(nt.override, ["none", "justification", "fp", "allow"], "none");
  nt.alert = N.en(nt.alert, ["none", "every", "threshold"], "none");
  nt.severity = N.en(nt.severity, ["Low", "Medium", "High"], "Low");
  // Markeringen: kleur, lettertype en uitlijning komen letterlijk in PowerShell terecht → strikt valideren.
  const fonts = CATALOG.markingFonts || ["Calibri"], dm = defaultLabelCfg().marking;
  Object.keys(dm).forEach((k) => {
    const m = c.marking[k] = N.obj(c.marking[k]);
    if (!MARK_HEX_RE.test(N.str(m.color))) m.color = dm[k].color;
    if (!fonts.includes(m.font)) m.font = dm[k].font;
    m.text = N.str(m.text);
    if (typeof m.size !== "number" || !isFinite(m.size) || m.size < 1 || m.size > 400) m.size = dm[k].size;
    if ("align" in dm[k]) m.align = N.en(m.align, ["Left", "Center", "Right"], "Left");
    if ("layout" in dm[k]) m.layout = N.en(m.layout, ["Horizontal", "Diagonal"], "Diagonal");
  });
  return c;
}
const MARK_HEX_RE = /^#[0-9a-f]{6}$/i;

/** Schema-migraties: MIGRATIONS[n] zet een bestand van schemaVersion n naar n+1. */
const MIGRATIONS = {
  // 1: (r) => { … return r; },
};
function _migrate(r) {
  let v = typeof r.schemaVersion === "number" && isFinite(r.schemaVersion) ? r.schemaVersion : 1;
  while (v < SCHEMA_VERSION && MIGRATIONS[v]) { r = MIGRATIONS[v](r) || r; v++; }
  return r;
}
const _strip = (o, keys) => { keys.forEach((k) => { delete o[k]; }); return o; };

/** Laadt/migreert een (mogelijk onbetrouwbaar) ontwerpbestand naar een geldige state: types, enums, ids en verwijzingen. Idempotent. */
function normalizeState(raw) {
  if (!isPlainObj(raw)) throw new Error("Ongeldig bestand.");
  if (raw.app !== undefined && raw.app !== "pyd-ipdlp-designer") throw new Error("Dit bestand is niet gemaakt met de Workshop Designer.");
  const N = _NZ, base = createEmptyState();
  N.truncated = [];
  const fromVersion = typeof raw.schemaVersion === "number" && isFinite(raw.schemaVersion) ? raw.schemaVersion : 1;
  normalizeState.last = { newer: fromVersion > SCHEMA_VERSION, fromVersion, truncated: N.truncated };
  const st = {};
  Object.keys(raw).forEach((k) => { if (!(k in base) && raw[k] !== undefined && k !== "__proto__" && k !== "constructor" && k !== "prototype") st[k] = clone(raw[k]); });
  const r = _migrate(clone(raw));
  st.schemaVersion = SCHEMA_VERSION;
  st.app = "pyd-ipdlp-designer";

  const meta = N.shape(base.meta, r.meta);
  ["customer", "date", "facilitator", "workshop", "preset", "sector", "notes", "created", "updated", "prefix", "version", "docLabelId", "exportedAt", "savedAt"].forEach((k) => { meta[k] = N.str(meta[k], base.meta[k]); });
  meta.status = N.en(meta.status, DESIGN_STATUS.map((x) => x[0]), "concept");
  meta.framework = N.en(meta.framework, FRAMEWORKS.map((x) => x[0]), "none");
  meta.versions = N.cap(N.objs(meta.versions), STATE_CAPS.versions, "versies")
    .map((v) => ({ id: N.str(v.id), version: N.str(v.version), date: N.str(v.date), change: N.str(v.change), by: N.str(v.by) }));
  _nzIds(meta.versions, "ver");
  const rv = {};
  Object.entries(N.obj(meta.reviewed)).forEach(([k, v]) => { if (v === true && /^[a-z-]{1,30}$/.test(k)) rv[k] = true; });
  meta.reviewed = rv;
  meta.participants = N.cap(N.objs(meta.participants), STATE_CAPS.participants, "deelnemers").map((p) => ({ name: N.str(p.name), role: N.str(p.role) }));
  st.meta = meta;

  const labels = N.cap(N.objs(r.labels), STATE_CAPS.labels, "labels").map((l) => {
    const name = N.str(l.name).trim() ? N.str(l.name) : (N.str(l.displayName).trim() ? N.str(l.displayName) : "Label");
    const o = { ...l, name, displayName: typeof l.displayName === "string" ? N.str(l.displayName) : name,
      parentId: l.parentId, color: /^#[0-9a-f]{3,8}$/i.test(N.str(l.color)) ? l.color : "#0F6CBD",
      tooltip: N.str(l.tooltip), adminDesc: N.str(l.adminDesc), audience: N.str(l.audience), owner: N.str(l.owner), info: N.strs(l.info), sits: N.strs(l.sits),
      choices: {}, custom: N.obj(l.custom), cfg: _nzLabelCfg(l.cfg) };
    Object.entries(N.obj(l.choices)).forEach(([k, v]) => { if (typeof v === "string" && CATALOG.choiceById && CATALOG.choiceById[v]) o.choices[k] = v; });
    if ("profile" in o && !(typeof o.profile === "string" && (CATALOG.profiles || []).some((p) => p.id === o.profile))) delete o.profile;
    return o;
  });
  const sits = N.cap(N.objs(r.sits), STATE_CAPS.sits, "informatietypen").map((s) => {
    // testtekst (kan echte persoonsgegevens bevatten) wordt nooit bewaard; zie UI.sitTest
    const o = _strip({ ...s, kind: N.en(s.kind, ["builtin", "custom", "fingerprint", "edm", "classifier", "object"], "custom") }, ["test"]);
    ["name", "desc", "confidence", "sector", "regex"].forEach((k) => { if (k in o) o[k] = N.str(o[k]); });
    if (!o.name || !o.name.trim()) o.name = N.str(s.ref) || "Informatietype";
    if ("keywords" in o) o.keywords = N.strs(o.keywords);
    if ("fields" in o) o.fields = N.objs(o.fields);
    if ("minCount" in o) o.minCount = N.shape(1, o.minCount);
    const c = o.kind === "builtin" ? (CATALOG.builtinSits || []).find((x) => x.id === o.ref) : null;
    return c ? { ...o, name: c.name, entity: !!c.entity, cred: !!c.cred } : o;
  });
  let groups = N.cap(N.objs(r.groups), STATE_CAPS.groups, "groepen").map((g) => ({ ...g, name: N.str(g.name, "Doelgroep"), kind: N.str(g.kind, "group"), value: N.str(g.value) }));
  if (!groups.length) groups = base.groups;
  let lps = N.cap(N.objs(r.labelPolicies), STATE_CAPS.labelPolicies, "labelbeleid");
  if (!lps.length) lps = base.labelPolicies;
  const customDlp = N.cap(N.objs(r.customDlp), STATE_CAPS.customDlp, "maatwerk-DLP");
  const personas = N.cap(N.objs(r.personas), STATE_CAPS.personas, "persona’s").map((p) => ({ ...p, name: N.str(p.name, "Persona"), icon: N.str(p.icon, "user"), desc: N.str(p.desc), touch: N.strs(p.touch), comms: N.str(p.comms), impact: N.obj(p.impact) }));
  const decisions = N.cap(N.objs(r.decisions), STATE_CAPS.decisions, "besluiten").map((d) => {
    const kind = N.en(d.kind, ["decision", "park"], "decision");
    const status = N.en(d.status, DECISION_STATUSES, kind === "park" ? "open" : "besloten");
    return { ...d, status, kind: decisionKind(status), text: N.str(d.text), route: N.str(d.route), at: N.str(d.at), owner: N.str(d.owner), due: N.str(d.due) };
  });

  const rL = _nzIds(labels, "lbl"), rS = _nzIds(sits, "sit"), rG = _nzIds(groups, "grp");
  _nzIds(lps, "lp"); _nzIds(customDlp, "cdlp"); _nzIds(personas, "per"); _nzIds(decisions, "dec");

  labels.forEach((l) => {
    const p = rL(l.parentId);
    l.parentId = p && p !== l.id ? p : null;
    l.sits = _nzRefs(l.sits, rS);
    l.cfg.publish.groups = _nzRefs(l.cfg.publish.groups, rG);
    l.cfg.encryption.permissions.forEach((p2) => { if ("groupId" in p2) { const g = rG(p2.groupId); if (g) p2.groupId = g; else delete p2.groupId; } });
  });
  const lmap = new Map(labels.map((l) => [l.id, l]));
  labels.forEach((l) => {
    const seen = new Set([l.id]);
    for (let p = lmap.get(l.parentId); p; p = lmap.get(p.parentId)) { if (seen.has(p.id)) { l.parentId = null; break; } seen.add(p.id); }
  });
  groups.forEach((g) => { if ("forLabel" in g) { const x = rL(g.forLabel); if (x) g.forLabel = x; else delete g.forLabel; } });

  const lpDef = defaultLabelPolicySettings();
  st.labelPolicies = lps.map((p) => {
    const settings = N.shape(lpDef, p.settings);
    ["defaultDocs", "defaultEmail", "defaultMeetings", "defaultSites", "defaultFabric"].forEach((k) => {
      const v = settings[k];
      settings[k] = v === "" || v === "sameAsDocs" || v === "none" ? v : rL(v) || "";
    });
    const adv = N.obj(p.adv);
    if (typeof adv.OutlookDefaultLabel === "string" && rL(adv.OutlookDefaultLabel)) adv.OutlookDefaultLabel = rL(adv.OutlookDefaultLabel);
    return { ...p, name: N.str(p.name, "Labelbeleid"), scope: p.id === "lp-global" ? "all" : N.en(p.scope, ["all", "groups"], "groups"),
      groups: _nzRefs(p.groups, rG), labels: _nzRefs(p.labels, rL), settings, adv };
  });

  const ep = N.shape(defaultEndpointSettings(), r.endpoint);
  ["pathExclusionsWin", "pathExclusionsMac", "networkShareExclusions", "unallowedBrowsers", "serviceDomains", "restrictedApps", "unallowedBluetoothApps", "vpnAddresses", "justificationOptions"]
    .forEach((k) => { ep[k] = N.strs(ep[k]); });
  ["sensitiveDomainGroups", "restrictedAppGroups", "printerGroups", "usbGroups", "networkShareGroups"].forEach((k) => {
    ep[k] = N.objs(ep[k]).map((g) => ({ ...g, name: N.str(g.name, "Groep"), items: N.strs(g.items), action: N.str(g.action, "default") }));
    _nzIds(ep[k], "epg");
  });
  ep.serviceDomainMode = N.en(ep.serviceDomainMode, ["allow", "block"], "block");
  ep.evidenceStoreType = N.en(ep.evidenceStoreType, ["customer", "microsoft"], "customer");
  ep.justificationMode = N.en(ep.justificationMode, ["both", "default", "custom"], "both");
  st.endpoint = ep;

  const modes = N.keys(CATALOG.dlpModes).length ? N.keys(CATALOG.dlpModes) : ["simulation", "simulationTips", "enable", "disable"];
  const ds = N.shape(defaultDlpSettings(), r.dlpSettings);
  ds.mode = N.en(ds.mode, modes, "simulation");
  ds.namingPrefix = N.str(ds.namingPrefix);
  ds.adminUnits = N.strs(ds.adminUnits);
  ds.perLocation = N.obj(ds.perLocation);
  Object.keys(ds.perLocation).forEach((k) => {
    const pl = ds.perLocation[k] = N.obj(ds.perLocation[k]);
    if ("mode" in pl && !modes.includes(pl.mode)) delete pl.mode;
    if ("name" in pl) pl.name = N.str(pl.name);
    ["include", "exclude", "adminUnits"].forEach((x) => { if (x in pl) pl[x] = N.strs(pl[x]); });
  });
  st.dlpSettings = ds;
  ds.alertRecipients = N.str(ds.alertRecipients).slice(0, 2000);
  const pe = {};
  Object.entries(N.obj(ds.partnerException)).forEach(([k, v]) => { const x = rL(k); if (x && v === true) pe[x] = true; });
  ds.partnerException = pe;
  if (st.meta.docLabelId) st.meta.docLabelId = rL(st.meta.docLabelId) || "";

  const locKeys = N.keys(CATALOG.dlpLocations);
  const levels = N.keys(CATALOG.endpointLevels).length ? N.keys(CATALOG.endpointLevels) : ["off", "audit", "warn", "block"];
  const ruleDef = { name: "Regel", labels: [], sits: [], minCount: 1, maxCount: "any", accessScope: "", extra: [], exceptions: [], action: "audit", scope: "external", template: "Encrypt", copilotAction: "prompts", endpoint: {}, tip: true, tipText: "", emailUser: false, override: "none", severity: "Low", alert: "none", incidentReport: false, stop: false };
  st.customDlp = customDlp.map((c) => {
    const rules = N.objs(c.rules).map((x) => {
      const o = N.shape(ruleDef, x, false);
      o.name = N.str(o.name, "Regel");
      o.labels = _nzRefs(o.labels, rL); o.sits = _nzRefs(o.sits, rS);
      o.extra = N.objs(o.extra); o.exceptions = N.objs(o.exceptions);
      if ("endpoint" in o) Object.keys(o.endpoint).forEach((k) => { o.endpoint[k] = N.en(o.endpoint[k], levels, "off"); });
      if ("severity" in o) o.severity = N.en(o.severity, ["Low", "Medium", "High"], "Low");
      if ("override" in o) o.override = N.en(o.override, ["none", "justification", "fp", "allow"], "none");
      if ("alert" in o) o.alert = N.en(o.alert, ["none", "every", "threshold"], "none");
      return o;
    });
    _nzIds(rules, "rule");
    return { ...c, name: N.str(c.name, "Maatwerk-DLP"), desc: N.str(c.desc), template: N.str(c.template, "custom"), mode: N.en(c.mode, modes, "simulation"),
      locations: N.strs(c.locations).filter((x) => locKeys.includes(x)), adminUnits: N.strs(c.adminUnits), include: N.strs(c.include), exclude: N.strs(c.exclude), rules };
  });

  const tenant = N.obj(r.tenant);
  tenant.checks = N.obj(tenant.checks);
  Object.keys(tenant.checks).forEach((k) => { const v = tenant.checks[k] = N.obj(tenant.checks[k]); if ("status" in v) v.status = N.str(v.status, "todo"); if ("note" in v) v.note = N.str(v.note); });
  const adoption = N.obj(r.adoption);
  adoption.notes = N.obj(adoption.notes);
  Object.keys(adoption.notes).forEach((k) => { adoption.notes[k] = N.str(adoption.notes[k]); });
  const phases = {};
  Object.entries(N.obj(adoption.phases)).slice(0, 50).forEach(([k, v]) => {
    if (!/^[a-z0-9-]{1,40}$/i.test(k) || !isPlainObj(v)) return;
    phases[k] = { owner: N.str(v.owner), start: N.str(v.start), due: N.str(v.due) };
  });
  adoption.phases = phases;

  const customScenarios = N.cap(N.objs(r.customScenarios), STATE_CAPS.customScenarios, "eigen scenario’s").map((s) => {
    const ct = N.obj(s.content), ex = N.obj(s.expect);
    const num = (v, d) => (typeof v === "number" && isFinite(v) ? Math.max(0, Math.min(4, Math.round(v))) : d);
    const o = { id: N.str(s.id), sector: N.str(s.sector, "all") || "all", icon: N.str(s.icon, "user"), title: N.str(s.title, "Eigen scenario"),
      persona: N.str(s.persona), story: N.str(s.story),
      content: { hint: N.strs(ct.hint), sens: num(ct.sens, 2), sits: N.strs(ct.sits), unlabeled: ct.unlabeled === true },
      channel: N.str(s.channel, "exchange"), recipient: N.str(s.recipient, "external"),
      expect: { min: num(ex.min, 0), text: N.str(ex.text) }, custom: true };
    if (typeof ex.max === "number") o.expect.max = Math.max(o.expect.min, num(ex.max, 4));
    if (typeof ct.prompt === "string") o.content.prompt = N.str(ct.prompt);
    if (ct.forward === true) o.content.forward = true;
    if (CATALOG.scenarioChannels && !CATALOG.scenarioChannels[o.channel]) o.channel = "exchange";
    if (CATALOG.scenarioRecipients && !CATALOG.scenarioRecipients[o.recipient]) o.recipient = "external";
    if (o.channel === "endpoint") { const acts = (CATALOG.endpointActivities || []).map((a) => a.key); o.activity = N.en(s.activity, acts, acts[0] || "usb"); }
    const risk = N.str(s.risk).slice(0, 500), lst = (v) => N.strs(v).slice(0, 6).map((x) => x.slice(0, 300));
    if (risk) o.risk = risk;
    ["options", "exceptions", "validate"].forEach((k) => { const v = lst(s[k]); if (v.length) o[k] = v; });
    return o;
  });
  customScenarios.forEach((s) => { if (!/^csc-[a-z0-9]+$/i.test(s.id)) s.id = ""; });
  { const seen = new Set(); customScenarios.forEach((s) => { if (!s.id || seen.has(s.id)) s.id = uid("csc"); seen.add(s.id); }); }

  const scen = {}, scIds = new Set([...(CATALOG.scenarios || []).map((s) => s.id), ...customScenarios.map((s) => s.id)]);
  Object.entries(N.obj(r.scenarioResults)).forEach(([k, v]) => {
    if (!scIds.has(k) || !isPlainObj(v)) return;
    const o = { ...v };
    if ("labelId" in o) { const x = rL(o.labelId); if (x) o.labelId = x; else delete o.labelId; }
    if ("predict" in o) o.predict = N.en(o.predict, ["pass", "tip", "block", ""], "");
    scen[k] = o;
  });

  Object.assign(st, { labels, sits, groups, tenant, personas, scenarioResults: scen, customScenarios, adoption, decisions });
  const order = Object.keys(base);
  const out = {};
  order.forEach((k) => { out[k] = st[k]; });
  Object.keys(st).forEach((k) => { if (!(k in out)) out[k] = st[k]; });
  return out;
}