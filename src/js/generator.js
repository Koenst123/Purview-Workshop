/* Generator: leidt uit het ontwerp alle Purview-objecten af (labels, labelbeleid, auto-labeling, DLP-policies en -regels).
   Wordt gebruikt door views, scenario-engine, validatie en exports. */
const DLP_ACTION_NAMES = {
  off: "Geen regel", audit: "Audit (alleen registreren)", tip: "Policy tip", encrypt: "Versleutelen", override: "Blokkeren met override",
  block: "Blokkeren", move: "Naar quarantaine", govern: "Extern delen intrekken", custom: "Per activiteit", copilot: "Copilot uitsluiten", warn: "Blokkeren met override",
};
const SCOPE_NAMES = { external: "extern", all: "iedereen", anyone: "Anyone-links", internal: "intern" };
const OVERRIDE_PS = { justification: "WithJustification", fp: "FalsePositive", allow: "WithoutJustification" };
const _SIT_DLP_KINDS = ["builtin", "custom", "edm", "fingerprint", "classifier"];
const _AUTO_WL_SHORT = { Exchange: "Exchange", SharePoint: "SharePoint", OneDriveForBusiness: "OneDrive" };
const _LOC_DOMAIN = { exchange: "exchange", sharepoint: "sharing", onedrive: "sharing", teams: "teams", devices: "endpoint", onprem: "onprem", fabric: "fabric", instances: "instances", copilot: "copilot" };
/* Korte, herkenbare namen voor informatietypen in policy tips (eindgebruikerstaal). */
const _SIT_TIP_ALIAS = {
  bsn: "BSN", "nl-dl": "rijbewijsnummer", "nl-pp": "paspoortnummer", "nl-tin": "fiscaal nummer", "nl-vat": "btw-nummer", "nl-addr": "adresgegevens",
  iban: "IBAN", cc: "creditcardnummer", "eu-debit": "pinpasnummer", swift: "SWIFT-code", "eu-nid": "identiteitsnummer", "eu-pp": "paspoortnummer",
  "eu-dl": "rijbewijsnummer", "eu-ssn": "sociaal-zekerheidsnummer", "eu-tin": "fiscaal nummer", "be-nn": "rijksregisternummer", "de-id": "identiteitskaartnummer",
  names: "namen", addr: "adresgegevens", ip: "IP-adressen", pwd: "wachtwoorden", azkey: "toegangssleutels",
  "med-all": "medische gegevens", "med-dis": "medische gegevens", "med-meds": "medicatiegegevens", "med-surg": "medische gegevens", "med-spec": "medische gegevens",
  "med-blood": "medische gegevens", icd10: "diagnosecodes", icd9: "diagnosecodes", "edm-patient": "patiëntgegevens", "edm-employee": "personeelsgegevens", "edm-customer": "klantgegevens",
  "tpl-agb": "AGB-code", "tpl-big": "BIG-nummer", "tpl-uzi": "UZI-nummer", "tpl-polis": "polisnummer",
};
const _PARTNER_PLACEHOLDER = /^(partner\.nl|bedrijf\.nl|domein\.nl|voorbeeld\.nl|(.*\.)?(example|contoso|fabrikam)\.[a-z.]+)$/i;

/* Nederlandse weergave met de (Engelse) portalterm tussen haakjes – gebruikt door Excel en het ontwerpdocument. */
const EXPORT_NL = {
  dlpModes: { simulation: "Simulatie (Run the policy in simulation mode)", simulationTips: "Simulatie met policy tips (… show policy tips while in simulation mode)", enable: "Direct handhaven (Turn it on right away)", disable: "Uitgeschakeld (Keep it off)" },
  autoModes: { simulation: "Simulatie (Run policy in simulation mode)", enable: "Inschakelen na simulatie (Turn on policy)" },
  levels: { off: "Niet gecontroleerd", audit: "Alleen registreren (Audit only)", warn: "Blokkeren met override (Block with override)", block: "Blokkeren (Block)" },
  confs: { low: "Laag (Low)", medium: "Gemiddeld (Medium)", high: "Hoog (High)" },
  overrides: { WithJustification: "Met zakelijke reden (business justification)", FalsePositive: "Fout-positief melden (report a false positive)", WithoutJustification: "Zonder reden (override)" },
  scopes: { NotInOrganization: "Buiten de organisatie (NotInOrganization)", InOrganization: "Binnen de organisatie (InOrganization)" },
  dlpMode(k) { return this.dlpModes[k] || (CATALOG.dlpModes.find((m) => m.key === k) || {}).name || k || ""; },
  autoMode(k) { return this.autoModes[k] || this.autoModes.simulation; },
  level(k) { return this.levels[k] || k || ""; },
  conf(k) { return this.confs[String(k || "").toLowerCase()] || k || ""; },
  sev(k) { return this.conf(k); },
  override(k) { return this.overrides[k] || k || ""; },
  scope(k) { return this.scopes[k] || k || ""; },
  workload(k) { return _AUTO_WL_SHORT[k] || k; },
  count(min, max) { return `${min || 1} – ${max === "any" || max == null || max === "" || max === -1 ? "onbeperkt (any)" : max}`; },
};

const Generator = {
  _memo: { key: null, val: null },

  /** Purview-naam: max. `max` tekens, afgekapt op woordgrens, zonder hangende scheidingstekens. */
  fitName(s, max = 64) {
    s = String(s == null ? "" : s).replace(/\s+/g, " ").trim();
    if (s.length <= max) return s;
    const head = s.slice(0, max + 1), sp = head.lastIndexOf(" ");
    const cut = sp >= Math.floor(max / 2) ? head.slice(0, sp) : s.slice(0, max);
    return cut.replace(/[\s–—\-&·(,/+:]+$/, "").trimEnd() || s.slice(0, max).trimEnd();
  },
  /** Maakt een naam uniek binnen `used` (hoofdletterongevoelig) met " (2)", " (3)", … */
  uniqName(name, used, max = 64) {
    const base = this.fitName(name, max) || "Naamloos";
    let n = base, i = 2;
    while (used.has(n.toLowerCase())) { const suf = ` (${i++})`; n = this.fitName(base, max - suf.length) + suf; }
    used.add(n.toLowerCase());
    return n;
  },
  /** Technische labelnaam voor PowerShell (-Name, LabelId, ParentId): ASCII (ë → e), zodat script, Excel en document overeenkomen. */
  psName(l, st = S()) {
    const s = String(labelTechName(l, st)).replace(/ß/g, "ss").replace(/[Ææ]/g, "ae").replace(/[Øø]/g, "o").replace(/[Œœ]/g, "oe")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9\-_ ]/g, "").replace(/-{2,}/g, "-").replace(/^[-_]+|[-_]+$/g, "");
    return s || "Label";
  },
  /** Splitst invoer als "a.nl, b.nl; c.nl" in geldige domeinen/adressen, placeholders (partner.nl, contoso.com …) en ongeldige waarden. */
  splitDomains(text) {
    const valid = [], domains = [], invalid = [], placeholders = [];
    String(text == null ? "" : text).split(/[\s,;]+/).map((x) => x.trim().toLowerCase().replace(/^@/, "")).filter(Boolean).forEach((x) => {
      const host = x.replace(/^.*@/, "");
      if (_PARTNER_PLACEHOLDER.test(host)) placeholders.push(x);
      else if (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(x)) { valid.push(x); domains.push(x); }
      else if (/^[a-z0-9._%+'-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(x)) valid.push(x);
      else invalid.push(x);
    });
    return { valid: unique(valid), domains: unique(domains), invalid: unique(invalid), placeholders: unique(placeholders) };
  },
  /** Partnerdomeinen van een label (rechthebbenden van het type domein/partner); zonder label of rechten: alle domeingroepen. */
  partnerDomains(st = S(), l = null) {
    const vals = [];
    const perms = l ? ((l.cfg.encryption || {}).permissions || []).filter((p) => p.type === "domain" || p.type === "partner") : [];
    perms.forEach((p) => { const g = p.groupId ? byId(st.groups, p.groupId) : null; vals.push((g && g.value) || p.value || ""); });
    if (!perms.length) (st.groups || []).filter((g) => g.kind === "domain").forEach((g) => vals.push(g.value || ""));
    return this.splitDomains(vals.join(" "));
  },

  all(st = S()) {
    const key = JSON.stringify([st.labels, st.sits, st.groups, st.labelPolicies, st.dlpSettings, st.customDlp, st.meta.prefix]);
    if (this._memo.key === key) return this._memo.val;
    const val = { labels: this.labels(st), labelPolicies: this.labelPolicies(st), autoPolicies: this.autoPolicies(st), dlpPolicies: this.dlpPolicies(st) };
    this._memo = { key, val };
    return val;
  },

  /* ---------- Labels ---------- */
  contentTypes(l) {
    const s = l.cfg.scope, out = [];
    if (s.files) out.push("File");
    if (s.emails) out.push("Email");
    if (s.sites) out.push("Site", "UnifiedGroup");
    if (s.meetings) out.push("Teamwork");
    return out;
  },
  labels(st = S()) {
    return orderedLabels(st).map((l, i) => ({
      label: l, id: l.id, name: labelTechName(l, st), psName: this.psName(l, st), displayName: l.displayName || l.name, fullName: labelFullName(l, st),
      parent: parentOf(l, st), priority: i, isParent: hasChildren(l, st), contentTypes: this.contentTypes(l), sits: labelSits(l, st),
    }));
  },

  /* ---------- Labelbeleid ---------- */
  /** Maakt/verwijdert automatisch labelbeleid per doelgroep (aanroepen binnen Store.update). */
  ensureGroupPolicies(st = S()) {
    const used = unique(st.labels.filter((l) => l.cfg.publish.audience === "groups").flatMap((l) => l.cfg.publish.groups || []));
    const global = st.labelPolicies.find((p) => p.scope === "all");
    used.forEach((gid) => {
      if (st.labelPolicies.some((p) => p.scope === "groups" && (p.groups || []).includes(gid))) return;
      const g = byId(st.groups, gid);
      st.labelPolicies.push({
        id: uid("lp"), name: `Labelbeleid – ${g ? g.name.replace(/^Doelgroep – /, "") : "Doelgroep"}`, scope: "groups", groups: [gid], labels: [],
        settings: clone(global ? global.settings : defaultLabelPolicySettings()), adv: clone(global ? global.adv || {} : {}), auto: true,
      });
    });
    st.labelPolicies = st.labelPolicies.filter((p) => !p.auto || (p.groups || []).some((g) => used.includes(g)) || (p.labels || []).length);
  },
  policyLabels(p, st = S()) {
    const ids = new Set(p.labels || []);
    st.labels.forEach((l) => {
      const pub = l.cfg.publish;
      if (p.scope === "all" && pub.audience !== "groups") ids.add(l.id);
      // doelgroepbeleid = alle generieke labels + de doelgroeplabels (settings/default label van het hoogste beleid gelden)
      if (p.scope === "groups" && (pub.audience !== "groups" || (pub.groups || []).some((g) => (p.groups || []).includes(g)))) ids.add(l.id);
    });
    [...ids].forEach((id) => { const l = labelById(id, st); if (l && l.parentId) ids.add(l.parentId); });
    return orderedLabels(st).filter((l) => ids.has(l.id));
  },
  scopeText(p, st = S()) {
    if (p.scope === "all") return "Alle gebruikers en groepen";
    const n = (p.groups || []).map((g) => { const x = byId(st.groups, g); return x ? x.name + (x.value ? ` (${x.value})` : "") : null; }).filter(Boolean);
    return n.length ? n.join(", ") : "Nog geen groep gekozen";
  },
  labelPolicies(st = S()) {
    const ps = [...st.labelPolicies].sort((a, b) => (a.scope === "all" ? -1 : 0) - (b.scope === "all" ? -1 : 0));
    return ps.map((p, i) => ({ policy: p, id: p.id, name: p.name, order: i, scopeText: this.scopeText(p, st), labels: this.policyLabels(p, st), settings: p.settings, adv: p.adv || {} }));
  },

  /* ---------- Auto-labeling (service-side) ---------- */
  autoSits(l, st) { return labelSits(l, st).filter((s) => _SIT_DLP_KINDS.includes(s.kind)); },
  autoPolicies(st = S()) {
    const usedP = new Set(), usedR = new Set();
    return applicableLabels(st).filter((l) => l.cfg.autolabel.service.enabled).map((l) => {
      const sv = l.cfg.autolabel.service;
      const locs = [sv.exchange && "Exchange", sv.sharepoint && "SharePoint", sv.onedrive && "OneDriveForBusiness"].filter(Boolean);
      const sits = this.autoSits(l, st);
      const prefix = st.meta.prefix ? st.meta.prefix + " " : "";
      return {
        label: l, name: this.uniqName(`${prefix}Auto – ${labelFullName(l, st)}`, usedP), mode: sv.mode, locations: locs, sits,
        rules: locs.map((w) => ({ name: this.uniqName(`${labelTechName(l, st)} – ${_AUTO_WL_SHORT[w] || w}`, usedR), workload: w, sits, minCount: sv.minCount || 1, confidence: sv.confidence || "high" })),
        overrideManual: !!sv.overrideManual, encryptExternalMail: !!sv.encryptExternalMail,
      };
    });
  },

  /* ---------- DLP ---------- */
  modeFor(domKey, st = S()) { const pl = (st.dlpSettings.perLocation || {})[domKey]; return (pl && pl.mode) || st.dlpSettings.mode; },
  /** Korte eindgebruikersnamen voor informatietypen (BSN, IBAN, …); onbekende ingebouwde types worden niet genoemd. */
  sitAliases(sits) {
    return unique((sits || []).map((s) => {
      if (!s) return null;
      if (_SIT_TIP_ALIAS[s.id]) return _SIT_TIP_ALIAS[s.id];
      if (["custom", "edm", "fingerprint"].includes(s.kind) && s.name) {
        const t = String(s.name).replace(/\s*\(.*?\)\s*/g, " ").replace(/\s+/g, " ").trim();
        return /^[A-Z0-9-]{2,}\b/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1);
      }
      return null;
    }).filter(Boolean));
  },
  /** Policy tip in gewone taal (max. 256 tekens). names = labelnaam/-namen; sits = informatietypen (maatwerkregels zonder label). */
  tipText(n, names, domKey, sits) {
    if (n && n.tipText) return String(n.tipText).slice(0, 256);
    const tpl = (CATALOG.notifyTipByDomain || {})[domKey] || CATALOG.notifyTipGeneric || "Dit item ${what}. Deel het alleen met mensen die het echt nodig hebben.";
    const what = (list) => {
      if (names) return `heeft het label ‘${names}’`;
      if (!list.length) return "bevat gevoelige gegevens";
      return `bevat gevoelige gegevens (${list.join(", ")})`;
    };
    const al = this.sitAliases(sits);
    let out = tpl.replace("${what}", () => what(al));
    while (out.length > 256 && al.length > 1) { al.pop(); out = tpl.replace("${what}", () => what(al.length ? [...al, "…"] : al)); }
    return out.slice(0, 256);
  },
  /** Ontwerpbord-domein van een set Purview-locaties (alleen als alle locaties tot één domein behoren). */
  domainOfLocations(locs) {
    const ds = unique((locs || []).map((x) => _LOC_DOMAIN[x]).filter(Boolean));
    return ds.length === 1 ? ds[0] : null;
  },
  endpointList(acts) {
    return CATALOG.endpointActivities.filter((x) => acts[x.key] && CATALOG.endpointPsValue[acts[x.key]])
      .map((x) => ({ key: x.key, setting: x.ps, value: CATALOG.endpointPsValue[acts[x.key]], level: acts[x.key] }));
  },

  ruleFor(l, domKey, st = S()) {
    const d = l.cfg.dlp[domKey];
    if (!d || d.action === "off" || hasChildren(l, st)) return null;
    const dom = CATALOG.dlpDomains.find((x) => x.key === domKey);
    if (!dom) return null;
    const locs = dom.locations.map((k) => CATALOG.dlpLocations.find((x) => x.key === k));
    const labelCond = locs.every((x) => x.labelCond) && domKey !== "teams";
    let sits = st.dlpSettings.includeSitsForUnlabeled || domKey === "teams" ? labelSits(l, st).filter((s) => _SIT_DLP_KINDS.includes(s.kind)) : [];
    if (domKey === "copilot") sits = [];
    if (domKey === "fabric") sits = sits.filter((s) => (s.kind === "builtin" && !s.entity && !s.cred) || s.kind === "custom");
    const a = d.action, n = l.cfg.notify, full = labelFullName(l, st);
    const accessScope = ["exchange", "sharing", "teams"].includes(domKey) && d.scope !== "all" ? (d.scope === "internal" ? "InOrganization" : "NotInOrganization") : null;
    let endpoint = null;
    if (domKey === "endpoint") {
      const acts = { ...(d.activities || {}) };
      // ‘Alles blokkeren’: afdrukken met override, anders kan de eigenaar zelf ook niets meer printen (gebruik printergroepen voor uitzonderingen).
      if ((l.choices || {}).dlp_endpoint === "ep-block" && acts.print === "block") acts.print = "warn";
      const list = this.endpointList(acts);
      endpoint = list.length ? list : null;
    }
    if (domKey === "instances" && !(l.choices || {}).dlp_instances && !Mapping.isCustom(l, "dlp_instances")) return null;
    const blocking = ["block", "override"].includes(a) && ["exchange", "sharing", "teams", "fabric"].includes(domKey);
    const noTip = ["onprem", "instances"].includes(domKey);
    const pex = domKey === "exchange" && ((st.dlpSettings || {}).partnerException || {})[l.id] ? this.partnerDomains(st, l) : null;
    const r = {
      id: `r-${domKey}-${l.id}`, label: l, domain: domKey, action: a, scope: d.scope || null,
      name: this.fitName(`${st.dlpSettings.namingPrefix ? st.dlpSettings.namingPrefix + " " : ""}${labelTechName(l, st)} – ${dom.short || dom.name}`),
      priority: labelPriority(l, st),
      conditions: { labels: labelCond ? [l] : [], sits, accessScope, extra: [] },
      actions: {
        encrypt: a === "encrypt" && domKey === "exchange" ? d.template || "Encrypt" : null,
        blockAccess: blocking,
        // Fabric: ‘Sturen’ (met override) = alleen buiten de organisatie (PerUser); ‘Beschermen/Streng’ = iedereen behalve eigenaar (All).
        blockScope: blocking ? (domKey === "fabric" ? (a === "override" ? "PerUser" : "All") : d.scope === "all" ? "All" : d.scope === "anyone" ? "PerAnonymousUser" : "PerUser") : null,
        endpoint,
        copilotExclude: domKey === "copilot" && a === "block",
        copilotScope: domKey === "copilot" ? "content" : null,
        onprem: domKey === "onprem" && ["block", "move"].includes(a) ? a : null,
        govern: domKey === "instances" && a === "govern" ? "removeExternal" : null,
      },
      notify: {
        tip: domKey !== "copilot" && !noTip && a !== "audit" && (n.tip || a === "tip") ? this.tipText(n, full, domKey) : "",
        // On-premises: geen gebruikersmeldingen of policy tips (Learn); Instances: alleen e-mail.
        email: domKey !== "copilot" && domKey !== "onprem" && a !== "audit" && (!!n.emailUser || (noTip && (n.tip || a === "tip"))),
        override: a === "override" ? OVERRIDE_PS[n.override] || "WithJustification" : null,
        severity: n.severity || "Low", alert: n.alert || "none", incidentReport: !!n.incidentReport,
      },
      exceptions: pex && pex.domains.length ? [{ key: "recipientDomain", value: pex.domains }] : [], stop: false, custom: false,
      partnerException: pex,
    };
    r.effective = (r.conditions.labels.length > 0 || r.conditions.sits.length > 0) && (domKey !== "endpoint" || !!endpoint);
    r.desc = this.ruleText(r, st);
    return r;
  },

  ruleText(r, st = S()) {
    const c = r.conditions;
    let cond;
    if (c.senderExternal) cond = "e-mail van externe afzenders";
    else {
      const parts = [];
      if (c.labels.length) parts.push(`label ${c.labels.map((l) => `‘${labelFullName(l, st)}’`).join(" of ")}`);
      if (c.sits.length) parts.push(`${c.sits.length > 3 ? `${c.sits.length} informatietypen (${c.sits.slice(0, 3).map((s) => s.name).join(", ")} …)` : c.sits.map((s) => s.name).join(", ")}`);
      cond = parts.join(" óf ") || "(geen conditie)";
    }
    const sc = c.accessScope === "NotInOrganization" ? " en gedeeld met/verzonden naar externen" : c.accessScope === "InOrganization" ? " en alleen intern gedeeld" : "";
    const a = r.actions, acts = [];
    if (a.encrypt) acts.push(`versleutelen (${a.encrypt})`);
    if (a.blockAccess) acts.push(`${r.notify.override ? "blokkeren met override" : "blokkeren"} – ${{ All: "iedereen behalve eigenaar en laatste wijziger", PerUser: r.domain === "fabric" ? "personen buiten de organisatie (gasten)" : "personen buiten de organisatie", PerAnonymousUser: "Anyone-links" }[a.blockScope]}`);
    if (a.endpoint) {
      const g = { block: [], warn: [], audit: [] };
      a.endpoint.forEach((e) => g[e.level] && g[e.level].push((CATALOG.endpointActivities.find((x) => x.key === e.key) || {}).name || e.key));
      if (g.block.length) acts.push(`blokkeren (Block): ${g.block.join("; ")}`);
      if (g.warn.length) acts.push(`blokkeren met override (Block with override): ${g.warn.join("; ")}`);
      if (g.audit.length) acts.push(`alleen registreren (Audit only): ${g.audit.join("; ")}`);
    }
    if (a.copilotExclude) acts.push({ content: "Copilot verwerkt deze items niet", web: "geen web search door Copilot", prompts: "Copilot verwerkt de prompt niet", external: "Copilot gebruikt deze e-mail niet" }[a.copilotScope] || "Copilot uitsluiten");
    if (a.onprem) acts.push(a.onprem === "move" ? "naar quarantainemap (instellen in het portal)" : "toegang beperken (instellen in het portal)");
    if (a.govern) acts.push("externe gebruikers verwijderen (MDCA)");
    if (!acts.length) acts.push(r.action === "tip" ? "alleen policy tip" : "alleen registreren (audit)");
    const extra = [];
    if (r.notify.tip) extra.push("policy tip");
    if (r.notify.email) extra.push("e-mail aan gebruiker");
    if (r.notify.alert && r.notify.alert !== "none") extra.push(`alert met ernst ${EXPORT_NL.sev(r.notify.severity)}`);
    if (r.notify.incidentReport) extra.push("incidentrapport");
    const rd = (r.exceptions || []).find((x) => x.key === "recipientDomain");
    const exc = rd && rd.value && rd.value.length ? ` Uitzondering: ontvangers bij ${[].concat(rd.value).join(", ")}.` : "";
    return `Als inhoud ${cond} bevat${sc} → ${acts.join("; ")}${extra.length ? ` · ${extra.join(", ")}` : ""}.${exc}`;
  },

  dlpPolicies(st = S()) {
    const ds = st.dlpSettings, out = [];
    const prefix = ds.namingPrefix ? ds.namingPrefix + " – " : "";
    const ls = [...applicableLabels(st)].reverse();
    CATALOG.dlpDomains.forEach((dom) => {
      const rules = ls.map((l) => this.ruleFor(l, dom.key, st)).filter(Boolean);
      if (!rules.length) return;
      const pl = (ds.perLocation || {})[dom.key] || {};
      const au = dom.locations.every((x) => CATALOG.dlpAdminUnitLocations.includes(x)) ? pl.adminUnits || ds.adminUnits || [] : [];
      const base = {
        domains: [dom.key], locations: [...dom.locations], mode: this.modeFor(dom.key, st), include: pl.include || [], exclude: pl.exclude || [], adminUnits: au,
        solo: dom.key === "copilot", derived: true, custom: false, template: "custom", merged: false,
      };
      if (dom.key === "copilot") {
        const enf = rules.filter((r) => r.action === "block"), sim = rules.filter((r) => r.action !== "block");
        if (enf.length) out.push({ ...base, id: "dlp-copilot", name: this.fitName(pl.name || `${prefix}${dom.name}`), rules: enf, desc: "Prevent Copilot from processing content voor de gevoeligste labels." });
        if (sim.length) out.push({ ...base, id: "dlp-copilot-sim", name: this.fitName(`${prefix}${dom.name} (simulatie)`), mode: "simulation", rules: sim, desc: "Inzicht: welke gelabelde items Copilot verwerkt, zonder impact." });
        return;
      }
      out.push({ ...base, id: `dlp-${dom.key}`, name: this.fitName(pl.name || `${prefix}${dom.name}`), rules, mergeable: !!dom.mergeable, desc: `Afgeleid van het Integraal Ontwerpbord (${rules.length} regel${rules.length === 1 ? "" : "s"}).` });
    });
    let pols = out;
    if (ds.mergeIdentical) {
      const sig = (p) => JSON.stringify([p.mode, p.include, p.exclude, p.adminUnits, p.rules.map((r) => [r.label.id, r.action, r.scope, r.conditions.labels.map((x) => x.id), r.conditions.sits.map((x) => x.id), r.conditions.accessScope, r.actions.blockAccess, r.actions.blockScope, r.actions.encrypt, r.notify])]);
      const merged = [];
      pols.forEach((p) => {
        const m = p.mergeable && merged.find((x) => x.mergeable && sig(x) === sig(p));
        if (m) { m.domains.push(...p.domains); m.locations.push(...p.locations); m.merged = true; m.id += "-" + p.domains[0]; m.name = this.fitName(`${prefix}${m.domains.map((k) => CATALOG.dlpDomains.find((d) => d.key === k).name).join(" + ")}`); }
        else merged.push({ ...p, domains: [...p.domains], locations: [...p.locations] });
      });
      pols = merged;
    }
    pols.forEach((p) => p.rules.forEach((r, i) => (r.order = i)));
    (st.customDlp || []).forEach((c) => pols.push(this.customPolicy(c, st)));
    pols.forEach((p, i) => (p.order = i));
    // Purview: policy- en regelnamen zijn tenant-breed uniek
    const usedP = new Set(), usedR = new Set();
    pols.forEach((p) => {
      p.name = this.uniqName(p.name, usedP);
      p.rules.forEach((r) => { r.name = this.uniqName(r.name, usedR); });
    });
    return pols;
  },

  customPolicy(c, st = S()) {
    const locs = c.locations || [];
    const isCop = locs.includes("copilot");
    const domKey = this.domainOfLocations(locs);
    const m365 = locs.some((x) => ["exchange", "sharepoint", "onedrive", "teams", "fabric"].includes(x));
    const rules = (c.rules || []).map((r, i) => {
      const labels = (r.labels || []).map((id) => labelById(id, st)).filter(Boolean);
      const sits = (r.sits || []).map((id) => sitById(id, st)).filter(Boolean);
      const blocking = ["block", "override"].includes(r.action) && m365;
      let endpoint = null;
      if (locs.includes("devices") && r.endpoint) {
        const list = this.endpointList(r.endpoint);
        endpoint = list.length ? list : null;
      }
      const names = labels.map((l) => labelFullName(l, st)).join("’ of ‘");
      const noTipC = locs.some((x) => ["onprem", "instances"].includes(x)), onpremOnly = locs.length > 0 && locs.every((x) => x === "onprem");
      const rule = {
        id: r.id, label: null, domain: "custom", action: r.action, scope: r.scope || null, name: this.fitName(r.name || `Regel ${i + 1}`), priority: i, order: i, custom: true,
        minCount: r.minCount || 1, maxCount: r.maxCount || "any",
        conditions: { labels, sits, accessScope: r.accessScope || null, extra: r.extra || [] },
        exceptions: r.exceptions || [],
        actions: {
          encrypt: r.action === "encrypt" && locs.includes("exchange") ? r.template || "Encrypt" : null,
          blockAccess: blocking,
          blockScope: blocking ? (r.scope === "all" ? "All" : r.scope === "anyone" ? "PerAnonymousUser" : "PerUser") : null,
          endpoint,
          copilotExclude: isCop && r.action === "copilot",
          copilotScope: null,
          onprem: locs.includes("onprem") && ["block", "move"].includes(r.action) ? r.action : null,
          govern: r.action === "govern" ? "removeExternal" : null,
        },
        notify: {
          tip: !isCop && !noTipC && r.action !== "audit" && r.tip ? this.tipText({ tipText: r.tipText }, names, domKey, sits) : "",
          email: !isCop && !onpremOnly && r.action !== "audit" && (!!r.emailUser || (noTipC && !!r.tip)),
          override: r.action === "override" ? OVERRIDE_PS[r.override] || "WithJustification" : null,
          severity: r.severity || "Low", alert: r.alert || "none", incidentReport: !!r.incidentReport,
        },
        stop: !!r.stop,
      };
      if (rule.notify.alert === "threshold") { rule.notify.alertCount = r.alertCount || 10; rule.notify.alertMinutes = r.alertMinutes || 60; }
      if (isCop) {
        if (r.copilotAction === "external") { rule.actions.copilotScope = "external"; rule.conditions.senderExternal = true; rule.conditions.labels = []; rule.conditions.sits = []; }
        else if (labels.length) rule.actions.copilotScope = "content";
        else rule.actions.copilotScope = r.copilotAction === "web" ? "web" : "prompts";
      }
      rule.effective = !!rule.conditions.senderExternal || labels.length > 0 || sits.length > 0 || (rule.conditions.extra || []).length > 0;
      rule.desc = this.ruleText(rule, st);
      return rule;
    });
    const au = locs.length && locs.every((x) => CATALOG.dlpAdminUnitLocations.includes(x)) ? c.adminUnits || [] : [];
    return {
      id: c.id, name: this.fitName(c.name || "Maatwerk-policy"), domains: [], locations: locs, mode: c.mode || st.dlpSettings.mode,
      include: c.include || [], exclude: c.exclude || [], adminUnits: au, rules, solo: isCop, derived: false, custom: true,
      template: c.template || "custom", desc: c.desc || "", merged: false,
    };
  },

  outcome(l, domKey, st = S()) {
    const r = this.ruleFor(l, domKey, st);
    const lv = Mapping.level(l, "dlp_" + domKey);
    return { lv: lv == null ? (r ? 1 : 0) : lv, text: r ? r.desc : "Geen DLP-regel voor dit label.", rule: r };
  },

  stats(st = S()) {
    const g = this.all(st);
    return {
      labels: st.labels.length, labelPolicies: g.labelPolicies.length, autoPolicies: g.autoPolicies.length,
      dlpPolicies: g.dlpPolicies.length, dlpRules: sum(g.dlpPolicies.map((p) => p.rules.length)), sits: st.sits.length,
    };
  },
};
