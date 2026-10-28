/* View: Data Loss Prevention – matrix per label, gegenereerde policies, meldingen en maatwerk-policies (portal-wizard). */

const DLP_DOM_ACTIONS = {
  exchange: ["off", "audit", "tip", "encrypt", "override", "block"],
  sharing: ["off", "audit", "tip", "override", "block"],
  teams: ["off", "audit", "tip", "override", "block"],
  endpoint: ["off", "custom"],
  copilot: ["off", "audit", "block"],
  fabric: ["off", "tip", "override", "block"],
  onprem: ["off", "audit", "block", "move"],
  instances: ["off", "audit", "govern"],
};
const DLP_DOM_SCOPES = {
  exchange: [["external", "Ontvangers buiten de organisatie"], ["all", "Alle ontvangers"]],
  sharing: [["external", "Delen met personen buiten de organisatie"], ["anyone", "Alleen ‘Anyone with the link’"], ["all", "Iedereen (behalve eigenaar)"]],
  teams: [["external", "Berichten met externen"], ["all", "Alle berichten"]],
};
function DLP_ACTION_LABEL(dom, a) {
  if (dom === "copilot") return { off: "Geen regel", audit: "Alleen inzicht (simulatie-policy)", block: "Prevent Copilot from processing content" }[a] || a;
  if (dom === "endpoint" && a === "custom") return "Per activiteit (zie Endpoint)";
  if (dom === "onprem") return { block: "Block people from accessing file", move: "Move file to a quarantine folder" }[a] || DLP_ACTION_NAMES[a] || a;
  return DLP_ACTION_NAMES[a] || a;
}
/** Geavanceerde instellingen van een maatwerk-policy achter ‘Meer opties’. */
const _cdlpMore = (key, what, body, set) => accordion(`cdlp-more-${key}`, `${icon("sliders", "s")} Meer opties <span class="xs muted">· ${esc(what)}</span>${set ? ` <span class="badge info">ingesteld</span>` : ""}`, body);
const DLP_TABS = [["matrix", "Per label", "grid"], ["policies", "Policies", "shield"], ["notify", "Meldingen", "bell"], ["editor", "Maatwerk", "edit"]];
const CDLP_TEMPLATE_SITS = {
  gdpr: ["eu-debit", "eu-dl", "eu-nid", "eu-pp", "eu-ssn", "eu-tin"],
  "gdpr-enh": ["eu-debit", "eu-dl", "eu-nid", "eu-pp", "eu-ssn", "eu-tin", "bsn", "nl-tin", "nl-pp", "nl-dl", "iban", "cc"],
  pci: ["cc"],
};
const CDLP_M365 = ["exchange", "sharepoint", "onedrive", "teams", "fabric"];

const CdlpUI = {
  newRule(i, o = {}) {
    return {
      id: uid("rule"), name: `Regel ${i + 1}`, labels: [], sits: [], minCount: 1, maxCount: "any", accessScope: "", extra: [], exceptions: [],
      action: "audit", scope: "external", template: "Encrypt", copilotAction: "prompts",
      endpoint: Object.fromEntries(CATALOG.endpointActivities.map((a) => [a.key, "off"])),
      tip: true, tipText: "", emailUser: false, override: "none", severity: "Low", alert: "none", incidentReport: false, stop: false, ...o,
    };
  },
  newPolicy(st, o = {}) {
    const n = (st.customDlp || []).length + 1;
    return { id: uid("cdlp"), name: `${st.dlpSettings.namingPrefix ? st.dlpSettings.namingPrefix + " – " : ""}Maatwerk ${n}`.slice(0, 64), desc: "", template: "custom", adminUnits: [], locations: ["exchange", "sharepoint", "onedrive"], include: [], exclude: [], mode: "simulation", rules: [this.newRule(0)], ...o };
  },
  conditions(locs) { return locs.length ? CATALOG.dlpConditions.filter((c) => locs.every((l) => c.loc.includes(l))) : []; },
  extraConditions(locs) { return this.conditions(locs).filter((c) => c.key !== "contentContains" && c.key !== "accessScope"); },
  actionOptions(locs) {
    if (locs.includes("copilot")) return [["audit", "Alleen auditen (geen actie)"], ["copilot", "Prevent Copilot from processing content"]];
    const o = [["audit", "Alleen auditen / rapporteren"]];
    if (locs.some((l) => l !== "onprem" && l !== "instances")) o.push(["tip", "Alleen policy tip / melding"]);
    if (locs.includes("exchange")) o.push(["encrypt", "Encrypt email messages"]);
    if (locs.some((l) => CDLP_M365.includes(l))) o.push(["override", "Restrict access – block with override"], ["block", "Restrict access – block"]);
    if (locs.includes("devices")) o.push(["custom", "Audit or restrict activities on devices"]);
    if (locs.includes("onprem")) { if (!o.some((x) => x[0] === "block")) o.push(["block", "Block people from accessing file (on-premises)"]); o.push(["move", "Move file to a quarantine folder (on-premises)"]); }
    if (locs.includes("instances")) o.push(["govern", "Restrict third-party apps (MDCA governance)"]);
    return o;
  },
  scopeOptions(locs) {
    const o = [["external", "Alleen personen buiten de organisatie"], ["all", "Iedereen"]];
    if (locs.includes("sharepoint") || locs.includes("onedrive")) o.push(["anyone", "Block only people who were given access through ‘Anyone with the link’"]);
    return o;
  },
  issues(c, st) { return Validation.run(st).filter((x) => x.key === c.id); },
  cur(st) { const list = st.customDlp || []; return byId(list, UI.dlpEdit) || list[0] || null; },
  prune(c) {
    const locs = c.locations || [], acts = this.actionOptions(locs).map((x) => x[0]);
    const cond = this.conditions(locs).map((x) => x.key);
    (c.rules || []).forEach((r) => {
      if (!acts.includes(r.action)) r.action = acts.includes("custom") ? "custom" : "audit";
      r.extra = (r.extra || []).filter((x) => cond.includes(x.key));
      r.exceptions = (r.exceptions || []).filter((x) => cond.includes(x.key) && !(CATALOG.dlpConditions.find((d) => d.key === x.key) || {}).noExcept);
      if (!cond.includes("accessScope")) r.accessScope = "";
    });
    if (locs.includes("copilot") || locs.includes("fabric") || locs.includes("instances")) c.template = "custom";
    if (!locs.every((x) => CATALOG.dlpAdminUnitLocations.includes(x))) c.adminUnits = [];
  },
  /** Nieuwe locatielijst na aan/uitzetten van k (Copilot/Fabric staan altijd alleen in een policy). */
  nextLocs(cur, k) {
    const solo = (x) => !!(CATALOG.dlpLocations.find((d) => d.key === x) || {}).solo;
    let locs = [...(cur || [])];
    if (locs.includes(k)) locs = locs.filter((x) => x !== k);
    else if (solo(k)) locs = [k];
    else locs = [...locs.filter((x) => !solo(x)), k];
    return CATALOG.dlpLocations.map((x) => x.key).filter((x) => locs.includes(x));
  },
  /** Wat prune() zou weghalen of wijzigen (HTML-regels voor de bevestigingsvraag). */
  pruneLosses(a, b) {
    const out = [], lname = (x) => VH.loc(x).name, cname = (k) => (CATALOG.dlpConditions.find((d) => d.key === k) || { name: k }).name;
    const off = (a.locations || []).filter((x) => !(b.locations || []).includes(x));
    const added = (b.locations || []).filter((x) => !(a.locations || []).includes(x));
    if (off.length && added.length) out.push(`Locaties uitgezet: <b>${esc(off.map(lname).join(", "))}</b>${added.some((x) => VH.loc(x).solo) ? " – deze locatie staat altijd alleen in een policy" : " – Copilot/Fabric kunnen niet met andere locaties worden gecombineerd"}`);
    const aOpts = this.actionOptions(a.locations || []);
    (a.rules || []).forEach((r, i) => {
      const n = b.rules[i], rn = `Regel ‘${esc(r.name || i + 1)}’`;
      if (r.action !== n.action) out.push(`${rn}: actie ‘${esc((aOpts.find((x) => x[0] === r.action) || [, r.action])[1])}’ wordt ‘${esc((this.actionOptions(b.locations || []).find((x) => x[0] === n.action) || [, n.action])[1])}’`);
      const lost = (k) => (r[k] || []).filter((x) => !(n[k] || []).some((y) => y.key === x.key)).map((x) => cname(x.key));
      const le = lost("extra"), lx = lost("exceptions");
      if (le.length) out.push(`${rn}: condities verwijderd – ${esc(le.join(", "))}`);
      if (lx.length) out.push(`${rn}: uitzonderingen verwijderd – ${esc(lx.join(", "))}`);
      if (r.accessScope && !n.accessScope) out.push(`${rn}: voorwaarde ‘Content is shared from Microsoft 365’ vervalt`);
    });
    if (a.template !== b.template) out.push(`Template ‘${esc((CATALOG.dlpTemplates.find((t) => t.key === a.template) || { name: a.template }).name)}’ wordt Custom policy`);
    if ((a.adminUnits || []).length && !(b.adminUnits || []).length) out.push(`Admin units vervallen: ${esc(a.adminUnits.join(", "))}`);
    return out;
  },
  valueField(spec, def) {
    switch (def.value) {
      case "none": return "";
      case "enum": return F.select(spec, "", def.options, { cls: "mb-0" });
      case "size": return F.number(spec, "", { min: 1, inline: true }) + `<span class="xs muted">KB</span>`;
      case "kv": return F.text(spec, "", { ph: "naam: waarde", cls: "mb-0" });
      default: return F.text(spec, "", { type: "csv", ph: "waarde1, waarde2", cls: "mb-0" });
    }
  },
};

function _cdlpRule(st, el) { const c = byId(st.customDlp, el.dataset.id); return c ? { c, r: c.rules[Number(el.dataset.rule)] } : {}; }
function _dlpAlertTo(st) { return String((st.dlpSettings && st.dlpSettings.alertRecipients) || "").trim(); }
function _cdlpAddCond(st, c, r, kind, id) {
  const isCop = (c.locations || []).includes("copilot");
  if (kind === "label") {
    const l = labelById(id, st); if (!l) return "";
    const ids = hasChildren(l, st) ? childrenOf(l.id, st).map((x) => x.id) : [l.id];
    r.labels = unique([...(r.labels || []), ...ids]);
    return isCop && (r.sits || []).length ? "Copilot: een regel heeft óf labels óf SIT’s – maak een aparte regel." : "";
  }
  const s = sitById(id, st); if (!s) return "";
  r.sits = unique([...(r.sits || []), id]);
  if (isCop && !["builtin", "custom"].includes(s.kind)) return `‘${s.name}’ wordt in Copilot-prompts niet ondersteund (alleen built-in en custom SIT’s).`;
  return isCop && (r.labels || []).length ? "Copilot: een regel heeft óf labels óf SIT’s – maak een aparte regel." : "";
}

/* ---------- Drag & drop ---------- */
DnD.register("cdlp-cond", (type, p, t) => {
  let warn = "";
  Store.update((st) => {
    const c = byId(st.customDlp, t.policyId); if (!c) return;
    const r = c.rules.find((x) => x.id === t.ruleId); if (!r) return;
    if (type === "pub-label") warn = _cdlpAddCond(st, c, r, "label", p.labelId);
    else { const id = sitFromPayload(st, p); if (id) warn = _cdlpAddCond(st, c, r, "sit", id); }
  });
  if (warn) Toast.show(esc(warn), "warn", 5000);
});

/* ---------- Acties ---------- */
Actions["dlp-tab"] = (el) => { UI.dlpTab = el.dataset.tab; App.render(); };
Actions["dlp-dom"] = (el) => {
  UI.dlpDom = el.dataset.dom; App.render();
  if (!el.dataset.scroll) return;
  const s = $("#main .dl-loc"), f = $("#main .dl-loc .sw-sel");
  if (s && s.scrollIntoView) s.scrollIntoView({ block: "start", behavior: reducedMotion() ? "auto" : "smooth" });
  if (f) f.focus({ preventScroll: true });
};
/* Keuze per label en locatie: direct op de plek wijzigen (zelfde logica als het ontwerpbord). */
Actions["dlp-cell"] = (el) => {
  const v = el.value; if (!v) return;
  if (typeof _boardApply === "function") _boardApply(el.dataset.id, v);
  else Store.update((st) => { Mapping.apply(st, el.dataset.id, v); });
};
Actions["dlp-row"] = (el) => {
  const c = CATALOG.choiceById[el.value], dom = el.dataset.dom;
  el.value = "";
  if (!c || c.d !== dom) return;
  confirmDialog(`‘${esc(c.title)}’ voor alle labels?`, "Dit overschrijft de keuze op deze locatie voor alle labels. Je kunt dit ongedaan maken met Ctrl+Z.", () => {
    let n = 0;
    Store.update((st) => { n = Mapping.applyRow(st, dom, c.id); });
    Toast.show(`${n} label(s) bijgewerkt.`, "ok");
  }, "Toepassen");
};
Actions["dlp-pol"] = (el) => { UI.dlpPol = el.dataset.pol; App.render(); };
Actions["dlp-nlbl"] = (el) => { UI.dlpNotifyLabel = el.dataset.lbl; App.render(); };
Actions["dlp-pl-reset"] = (el) => Store.update((st) => { delete st.dlpSettings.perLocation[el.dataset.dom]; });
Actions["cdlp-add"] = (el) => {
  const tpl = el.dataset.tpl || "custom";
  let id = "";
  Store.update((st) => {
    const c = CdlpUI.newPolicy(st);
    if (tpl !== "custom") {
      const t = CATALOG.dlpTemplates.find((x) => x.key === tpl);
      const sits = (CDLP_TEMPLATE_SITS[tpl] || []).map((ref) => ensureSit(st, ref, "builtin"));
      c.template = tpl; c.name = `${st.dlpSettings.namingPrefix ? st.dlpSettings.namingPrefix + " – " : ""}${t.name}`.slice(0, 64);
      c.locations = ["exchange", "sharepoint", "onedrive", "teams"];
      c.desc = "Template met ‘low count’- en ‘high count’-regel; verfijn SIT’s en drempels met de klant.";
      const short = t.name.replace(/^.*\(([^)]+)\)(.*)$/, "$1$2");
      c.rules = [
        CdlpUI.newRule(0, { name: `Low volume of content detected ${short}`.slice(0, 64), sits: [...sits], minCount: 1, maxCount: 9, accessScope: "NotInOrganization", action: "tip", tip: true, emailUser: true, severity: "Low" }),
        CdlpUI.newRule(1, { name: `High volume of content detected ${short}`.slice(0, 64), sits: [...sits], minCount: 10, maxCount: "any", accessScope: "NotInOrganization", action: "override", scope: "external", tip: true, emailUser: true, override: "justification", severity: "High", alert: "every", incidentReport: true }),
      ];
    }
    st.customDlp.push(c); id = c.id;
  });
  const fresh = byId(S().customDlp, id);
  UI.cdlpFresh = fresh ? { id, sig: JSON.stringify(fresh) } : null;
  UI.dlpEdit = id; UI.dlpRule = 0; UI.dlpTab = "editor"; App.render();
};
Actions["cdlp-jump"] = (el) => {
  const sec = $(`#main .cdlp-s${Number(el.dataset.n) || 1}`); if (!sec) return;
  sec.scrollIntoView({ block: "start", behavior: reducedMotion() ? "auto" : "smooth" });
  const h = $("h3", sec); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
};
Actions["cdlp-sel"] = (el) => { UI.dlpEdit = el.dataset.id; UI.dlpRule = 0; UI.dlpTab = "editor"; App.render(); };
Actions["cdlp-dup"] = (el) => {
  let id = "";
  Store.update((st) => {
    const c = byId(st.customDlp, el.dataset.id); if (!c) return;
    const d = clone(c); d.id = uid("cdlp"); d.name = (c.name + " (kopie)").slice(0, 64); d.rules.forEach((r) => (r.id = uid("rule")));
    st.customDlp.push(d); id = d.id;
  });
  if (id) { UI.dlpEdit = id; App.render(); }
};
Actions["cdlp-del"] = (el) => {
  const c = byId(S().customDlp, el.dataset.id); if (!c) return;
  confirmDialog("Maatwerk-policy verwijderen?", `‘${esc(c.name)}’ en alle regels worden verwijderd.`, () => { Store.update((st) => { st.customDlp = st.customDlp.filter((x) => x.id !== c.id); }); UI.dlpEdit = null; }, "Verwijderen", true);
};
Actions["cdlp-loc"] = (el) => {
  const c0 = byId(S().customDlp, el.dataset.id); if (!c0) return;
  _cdlpSetLocs(c0, CdlpUI.nextLocs(c0.locations || [], el.dataset.loc));
};
Actions["cdlp-only-exchange"] = (el) => {
  const c0 = byId(S().customDlp, el.dataset.id); if (!c0) return;
  _cdlpSetLocs(c0, ["exchange"]);
};
function _cdlpSetLocs(c0, next) {
  const sim = clone(c0); sim.locations = next; CdlpUI.prune(sim);
  const losses = CdlpUI.pruneLosses(c0, sim);
  const apply = () => Store.update((st) => {
    const c = byId(st.customDlp, c0.id); if (!c) return;
    c.locations = next;
    CdlpUI.prune(c);
  });
  if (!losses.length) { apply(); return; }
  App.render();
  Modal.open({
    title: "Locaties wijzigen?",
    body: `<p>Met deze wijziging past de policy niet meer bij alle bestaande instellingen. Dit wordt aangepast of verwijderd:</p><ul class="small">${losses.map((x) => `<li>${x}</li>`).join("")}</ul><p class="small muted">Je kunt dit daarna ongedaan maken met Ctrl+Z.</p>`,
    buttons: [{ label: "Annuleren" }, { label: "Wijzigen", danger: true, fn: () => { apply(); } }],
  });
}
Actions["cdlp-maxany"] = (el) => Store.update((st) => {
  const { r } = _cdlpRule(st, el); if (!r) return;
  const min = Number(r.minCount) || 1;
  r.maxCount = el.checked ? "any" : Math.max(min, 9);
});
Actions["cdlp-rule-add"] = (el) => Store.update((st) => {
  const c = byId(st.customDlp, el.dataset.id); if (!c) return;
  const acts = CdlpUI.actionOptions(c.locations || []).map((x) => x[0]);
  c.rules.push(CdlpUI.newRule(c.rules.length, { action: acts.includes("custom") ? "custom" : "audit" }));
  UI.dlpRule = c.rules.length - 1;
});
Actions["cdlp-rule-sel"] = (el) => { UI.dlpRule = Number(el.dataset.rule); App.render(); };
Actions["cdlp-rule-del"] = (el) => Store.update((st) => {
  const c = byId(st.customDlp, el.dataset.id); if (!c) return;
  c.rules.splice(Number(el.dataset.rule), 1);
  UI.dlpRule = Math.max(0, Math.min(UI.dlpRule || 0, c.rules.length - 1));
});
Actions["cdlp-rule-move"] = (el) => Store.update((st) => {
  const c = byId(st.customDlp, el.dataset.id); if (!c) return;
  const i = Number(el.dataset.rule), j = i + Number(el.dataset.dir);
  if (j < 0 || j >= c.rules.length) return;
  [c.rules[i], c.rules[j]] = [c.rules[j], c.rules[i]];
  UI.dlpRule = j;
});
Actions["cdlp-cond-del"] = (el) => Store.update((st) => {
  const { r } = _cdlpRule(st, el); if (!r) return;
  r[el.dataset.kind] = (r[el.dataset.kind] || []).filter((x) => x !== el.dataset.v);
});
Actions["cdlp-addsel"] = (el) => {
  const v = el.value; if (!v) return;
  let warn = "";
  Store.update((st) => { const { c, r } = _cdlpRule(st, el); if (r) warn = _cdlpAddCond(st, c, r, v[0] === "l" ? "label" : "sit", v.slice(2)); });
  if (warn) Toast.show(esc(warn), "warn", 5000);
};
Actions["cdlp-xadd"] = (el) => {
  const key = el.value; if (!key) return;
  let bad = false;
  Store.update((st) => {
    const { c, r } = _cdlpRule(st, el); if (!r) return;
    const def = CdlpUI.extraConditions(c.locations || []).find((x) => x.key === key);
    if (!def) { bad = true; return; }
    const list = (r[el.dataset.list] = r[el.dataset.list] || []);
    if (list.some((x) => x.key === key)) return;
    list.push({ key, value: def.value === "enum" ? def.options[0][0] : def.value === "list" ? [] : def.value === "size" ? 1024 : "" });
  });
  if (bad) Toast.show("Deze conditie is niet beschikbaar voor de gekozen locaties.", "warn");
};
Actions["cdlp-xdel"] = (el) => Store.update((st) => {
  const { r } = _cdlpRule(st, el); if (!r) return;
  (r[el.dataset.list] || []).splice(Number(el.dataset.idx), 1);
});
Hooks["cdlp-action"] = (st, b, v) => {
  const m = /^rules\.(\d+)\.action$/.exec(b.path); if (!m || !b.obj) return;
  const r = b.obj.rules[Number(m[1])];
  if (v === "override") { r.tip = true; if (!r.override || r.override === "none") r.override = "justification"; }
};

/* ---------- View ---------- */
/* Gewone taal voor keuzes die in Purview Engelstalig zijn (de Purview-naam staat in de infoTip). */
const DLP_MODE_NL = Object.fromEntries(CATALOG.dlpModes.map((m) => [m.key, m.nl || m.name]));
const DLP_OVR_NL = { none: "Niet toestaan", justification: "Toestaan met zakelijke reden", fp: "Toestaan of fout-positief melden", allow: "Toestaan zonder reden" };
const DLP_ALERT_NL = { none: "Geen alert", every: "Bij elke match", threshold: "Bij een drempel" };
const DLP_SEV_NL = { Low: "Laag", Medium: "Gemiddeld", High: "Hoog" };
const DLP_APP = { exchange: "outlook", sharing: "spo", sharepoint: "spo", onedrive: "spo", teams: "teams", endpoint: "endpoint", devices: "endpoint", copilot: "copilot" };
/** Eén hoofdvraag per locatie (klanttaal). */
const DLP_Q = {
  dlp_exchange: "Wat gebeurt er als iemand dit per e-mail verstuurt?",
  dlp_sharing: "Wat gebeurt er als iemand dit deelt via SharePoint of OneDrive?",
  dlp_teams: "Wat gebeurt er als iemand dit deelt in een Teams-chat of -kanaal?",
  dlp_endpoint: "Wat mag er op een laptop of pc: USB, printen, uploaden?",
  dlp_copilot: "Mag Microsoft 365 Copilot deze inhoud gebruiken?",
  dlp_fabric: "Wat gebeurt er met deze inhoud in Fabric en Power BI?",
  dlp_onprem: "Wat gebeurt er met deze bestanden op de fileserver?",
  dlp_instances: "Wat gebeurt er in gekoppelde cloud-apps?",
};
/** Productlogo's per bordrij en per Purview-locatie (herkenbaarheid); anders het gewone icoon. */
const DLP_LOGO = { dlp_exchange: ["outlook"], dlp_sharing: ["sharepoint", "onedrive"], dlp_teams: ["teams"], dlp_copilot: ["copilot"], exchange: ["outlook"], sharepoint: ["sharepoint"], onedrive: ["onedrive"], teams: ["teams"], copilot: ["copilot"] };
function _dlpLogo(r, cls = "") {
  const a = DLP_LOGO[r.key];
  if (!a || typeof msLogo !== "function") return `<span class="dl-logos${cls ? " " + cls : ""}">${icon(r.icon || "shield", "s")}</span>`;
  return `<span class="dl-logos${cls ? " " + cls : ""}">${a.map((x) => msLogo(x, "dl-logo")).join("")}</span>`;
}

/** Voorbeeldmeldingen bij DLP-regels: welke melding hoort bij een gegenereerde regel op een locatie. */
const DlpEx = {
  RANK: { block: 6, override: 5, endpoint: 5, copilot: 4, encrypt: 3, tip: 2, email: 1 },
  CAP: { block: "geblokkeerd", override: "doorgaan met override", endpoint: "apparaat", copilot: "Copilot", encrypt: "versleuteld", tip: "policy tip", email: "e-mail aan de gebruiker" },
  of(r, loc, st = S()) {
    if (!r || r.action === "audit" || r.action === "off") return null;
    const a = r.actions || {}, n = r.notify || {}, app = DLP_APP[loc];
    const l = r.label || ((r.conditions || {}).labels || [])[0] || null;
    const ctx = { tipText: n.tip || "", ruleName: r.name || "", labelName: l ? labelFullName(l, st) : "", labelColor: l ? l.color : "" };
    if (n.override) { ctx.override = n.override; ctx.justification = n.override === "WithJustification" ? "required" : "optional"; }
    let kind = "";
    if (app === "endpoint") {
      const e = a.endpoint || [], x = e.find((y) => y.level === "block") || e.find((y) => y.level === "warn");
      if (!x) return null;
      kind = "endpoint"; ctx.level = x.level; ctx.override = x.level === "warn" ? "WithJustification" : "";
      ctx.activity = (CATALOG.endpointActivities.find((k) => k.key === x.key) || {}).name || "";
    } else if (app === "copilot") { kind = "copilot"; ctx.variant = a.copilotScope === "prompts" ? "prompt" : a.copilotScope === "web" ? "web" : "excluded"; }
    else if (n.override && app) kind = "override";
    else if (a.encrypt && app === "outlook") { kind = "encrypt"; ctx.tipText = ""; }
    else if (a.blockAccess && app) kind = "block";
    else if (n.tip && app) kind = "tip";
    else if (n.email && loc !== "teams") kind = "email";
    return kind ? { kind, app: app || "outlook", ctx } : null;
  },
  /** Maximaal `max` verschillende meldingen, strengste eerst. */
  html(list, max = 2, none = "Geen melding: de gebruiker merkt niets. De activiteit wordt wel vastgelegd.") {
    const seen = new Set(), out = [];
    list.filter(Boolean).sort((a, b) => (this.RANK[b.kind] || 0) - (this.RANK[a.kind] || 0)).forEach((x) => {
      const k = `${x.kind}:${x.app}`;
      if (seen.has(k) || out.length >= max) return;
      seen.add(k); out.push(x);
    });
    if (!out.length) return `<div class="ws-ex-none small muted">${icon("info", "s")}<span>${esc(none)}</span></div>`;
    return `<div class="ws-ex-stack">${out.map((x) => WSX.ex(x.kind, x.app, x.ctx, x.cap || this.CAP[x.kind])).join("")}</div>`;
  },
};

/** Per Purview-locatie: waar en hoe de medewerker de melding ziet (Microsoft Learn: DLP policy tips reference). */
const DLP_PV_NOTE = {
  exchange: "Outlook toont policy tips op web, Windows, Mac en mobiel, maar niet elke client ondersteunt elke conditie. Test eerst in simulatie.",
  sharepoint: "Policy tips verschijnen in de webversie van SharePoint en OneDrive, niet in de synchronisatie-app op de pc.",
  onedrive: "Policy tips verschijnen in de webversie van OneDrive en SharePoint, niet in de synchronisatie-app op de pc.",
  teams: "Teams markeert het bericht met een melding. Bij gedeelde bestanden toont Teams geen policy tip; die vallen onder SharePoint en OneDrive.",
  devices: "Endpoint DLP toont een Windows-melding op het apparaat, niet voor elk informatietype. Controleer in de portal.",
  copilot: "Geen klassieke policy tip: Copilot laat de inhoud of web search weg, of geeft geen antwoord op de prompt.",
  fabric: "Controleer in de portal welke melding medewerkers in Fabric en Power BI zien.",
  onprem: "Geen policy tip op deze locatie: de scanner past de actie toe en legt die vast.",
  instances: "Geen policy tip in niet-Microsoft cloud-apps: de activiteit wordt vastgelegd.",
};
const DLP_PV_DOMLOC = { exchange: "exchange", sharing: "sharepoint", teams: "teams", endpoint: "devices", copilot: "copilot", fabric: "fabric", onprem: "onprem", instances: "instances" };
/** Actieniveaus voor de wisselaar op ‘Per label’ (Purview-termen). */
const DLP_PV_ACT = { tip: ["Policy tip", "info"], override: ["Block with override", "warning"], block: ["Block", "xcircle"], encrypt: ["Encrypt", "lock"], email: ["User notification", "mail"] };
const DLP_PV_COP = { excluded: "Inhoud uitsluiten", prompt: "Prompt blokkeren", web: "Web search blokkeren" };

/** Voorbeeld met wisselaar tussen de alternatieven die bovenaan gekozen zijn (locaties of actieniveaus). Keuze in UI.dlpPv. */
const DlpPv = {
  sel(key, alts) { const m = UI.dlpPv || {}; return alts.find((a) => a.id === m[key]) || alts[0]; },
  set(key, id) { if (!UI.dlpPv) UI.dlpPv = Object.create(null); UI.dlpPv[key] = id; },
  /** Alternatief per Purview-locatie. */
  locAlt(k, items, max = 1) {
    const l = VH.loc(k);
    const xs = items.filter(Boolean).map((x) => { if (k === "onedrive" && x.app === "spo") x.ctx.location = "onedrive"; return x; });
    return { id: k, name: l.short || l.name, title: l.name, logo: _dlpLogo(l), body: DlpEx.html(xs, max), note: DLP_PV_NOTE[k] || "" };
  },
  /** Alternatieven per actieniveau (strengste eerst) voor één locatie op ‘Per label’. */
  actAlts(list, d) {
    const groups = new Map();
    list.filter(Boolean).forEach((x) => {
      const k = x.kind === "endpoint" ? `endpoint-${x.ctx.level}` : x.kind === "copilot" ? `copilot-${x.ctx.variant}` : x.kind;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(x);
    });
    const rank = (x) => (x.kind === "endpoint" ? (x.ctx.level === "block" ? 6 : 5) : DlpEx.RANK[x.kind] || 0);
    const note = DLP_PV_NOTE[DLP_PV_DOMLOC[d]] || "";
    return [...groups.entries()].sort((a, b) => rank(b[1][0]) - rank(a[1][0])).map(([k, xs]) => {
      const x = xs[0];
      const [name, ic] = x.kind === "endpoint" ? [x.ctx.level === "block" ? "Block" : "Block with override", x.ctx.level === "block" ? "xcircle" : "warning"]
        : x.kind === "copilot" ? [DLP_PV_COP[x.ctx.variant] || "Copilot", "sparkle"] : DLP_PV_ACT[x.kind] || [x.kind, "info"];
      const who = unique(xs.map((y) => y.who).filter(Boolean));
      x.cap = `${who.join(", ")} · ${DlpEx.CAP[x.kind]}`;
      return { id: k, name, title: `Geldt voor: ${who.join(", ")}`, logo: icon(ic, "s"), badge: xs.length > 1 ? `<span class="dl-pv-n" aria-label="${xs.length} labels">${xs.length}</span>` : "", body: DlpEx.html([x], 1), note };
    });
  },
  html(key, alts, o = {}) {
    if (!alts.length) return `<div class="ws-ex-none small muted dl-pv-empty">${icon("info", "s")}<span>${esc(o.empty || "Nog geen voorbeeld.")}</span></div>`;
    const cur = this.sel(key, alts), base = `dlpv-${String(key).replace(/[^\w-]/g, "_")}`, tid = (a) => `${base}-${String(a.id).replace(/[^\w-]/g, "_")}`;
    const note = cur.note ? `<p class="dl-pv-note xs muted">${icon("info", "s")}<span>${esc(cur.note)}</span></p>` : "";
    const multi = alts.length > 1;
    const panel = `<div class="dl-pv-panel" data-pv-cur="${esc(cur.id)}"${multi ? ` id="${base}-p" role="tabpanel" aria-labelledby="${tid(cur)}" tabindex="0"` : ""}>${cur.body}${note}</div>`;
    if (!multi) return panel;
    const tabs = `<div class="dl-pv-tabs" role="tablist" aria-label="${esc(o.label || "Voorbeeld")}">${alts.map((a) => {
      const on = a === cur;
      return `<button type="button" class="dl-pv-tab${on ? " on" : ""}" role="tab" id="${tid(a)}" aria-selected="${on}" aria-controls="${base}-p" tabindex="${on ? 0 : -1}" data-action="dlp-pv" data-pvk="${esc(key)}" data-pv="${esc(a.id)}"${a.title ? ` title="${esc(a.title)}"` : ""}>${a.logo || ""}<span>${esc(a.name)}</span>${a.badge || ""}</button>`;
    }).join("")}</div>`;
    return tabs + panel;
  },
};
Actions["dlp-pv"] = (el) => { DlpPv.set(el.dataset.pvk, el.dataset.pv); App.render(); };

registerView("dlp", {
  title: "Data Loss Prevention",
  fac: {
    duration: 60,
    goal: "Bepalen wat DLP doet als informatie met een label of gevoelige informatietypen de organisatie dreigt te verlaten – per locatie, van inzicht naar handhaven.",
    questions: ["Welke uitstroomkanalen zijn voor jullie het grootste risico (e-mail, delen, Teams, USB, Copilot)?", "Mag een gebruiker met een goede reden doorzetten (override), of is blokkeren noodzakelijk?", "Wie ontvangt alerts en wie handelt incidenten af?"],
    tips: ["Kies per locatie de keuze per label; verfijn de exacte Purview-actie onder ‘Fijnafstemmen’.", "Gebruik ‘Maatwerk-policies’ voor SIT-gedreven regels (bijv. BSN in bulk) of afwijkende scopes.", "Alles start in simulatiemodus; plan een evaluatiemoment na 1–2 weken."],
    pitfalls: ["Labels als conditie in Teams-chat werken niet – koppel SIT’s.", "‘Block everyone’ op Delen sluit ook interne collega’s uit.", "Overrides zonder policy tips: de gebruiker ziet de override-optie dan niet."],
    links: ["dlp", "dlpDesign", "dlpCreate"],
  },
  done: (st) => Generator.all(st).dlpPolicies.length > 0,
  after(main) { VH.ovf(main); if (VH.clampFit) VH.clampFit(main); },
  render() {
    const st = S();
    if (!st.labels.length && !(st.customDlp || []).length) return pageHead("Beleid & DLP", "Data Loss Prevention", "Wat mag níet gebeuren met gevoelige informatie?") + VH.needLabels();
    // App.go('dlp', 'policies') opent direct dat tabblad.
    if (DLP_TABS.some((t) => t[0] === UI.sub.dlp)) { UI.dlpTab = UI.sub.dlp; UI.sub.dlp = ""; }
    const tab = DLP_TABS.some((t) => t[0] === UI.dlpTab) ? UI.dlpTab : "matrix";
    const g = Generator.all(st);
    const nRules = sum(g.dlpPolicies.map((p) => p.rules.length));
    const tabs = `<div class="tabs mb-2" role="tablist" aria-label="Onderdelen DLP">${DLP_TABS.map(([k, t, ic]) => `<button class="tab${tab === k ? " on" : ""}" role="tab" aria-selected="${tab === k ? "true" : "false"}" data-action="dlp-tab" data-tab="${esc(k)}">${icon(ic, "s")} ${esc(t)}${k === "editor" && (st.customDlp || []).length ? ` <span class="badge neutral">${st.customDlp.length}</span>` : ""}</button>`).join("")}</div>`;
    const more = `<p>Kies per label en per locatie wat DLP doet: alleen vastleggen, een melding tonen, blokkeren met de mogelijkheid om toch door te gaan, of blokkeren. Daaruit ontstaan automatisch de policies. Voor regels op basis van informatietypen (bijv. BSN in bulk) maak je een maatwerk-policy. Alles start in simulatie.</p><p class="small muted">Nu: ${plural(g.dlpPolicies.length, "policy", "policies")} · ${plural(nRules, "regel", "regels")} · ${learn("dlpLabelCondition", "Labels als DLP-conditie")}</p>`;
    return VH.wrap(`<div class="ws-host">${pageHead("Beleid & DLP", "Data Loss Prevention", "Wat mag níet gebeuren met gevoelige informatie?", "", more)}
      ${tabs}${this["tab_" + tab](st, g)}</div>`, "vb-dlp");
  },

  tab_matrix(st, g) {
    const ls = applicableLabels(st);
    if (!ls.length) return VH.needLabels();
    const rows = BoardUtil.rows(st).filter((r) => r.dlp);
    if (!rows.length) return VH.needLabels();
    const mono = BoardUtil.monoMap(st);
    const dom = rows.some((r) => r.key === UI.dlpDom) ? UI.dlpDom : rows[0].key;
    const row = BoardUtil.rowByKey(dom);
    const choices = CATALOG.choicesFor(dom);
    const lrow = (l) => {
      const c = Mapping.choice(l, dom), cust = Mapping.isCustom(l, dom), m = mono[l.id + "|" + dom], nm = labelFullName(l, st);
      const p = l.parentId ? labelById(l.parentId, st) : null;
      const opts = (c ? "" : `<option value="" selected>Kies…</option>`) + choices.map((x) => `<option value="${esc(x.id)}"${c && c.id === x.id ? " selected" : ""}>${esc(x.title)}</option>`).join("");
      const sel = `<select class="select dl-pick lv-${c ? c.lv : "x"}" data-action="dlp-cell" data-id="${esc(l.id)}" data-dom="${esc(dom)}" aria-label="${esc(`${row.name} – ${nm}`)}">${opts}</select>`;
      const flags = [cust ? `<span class="badge neutral" title="Fijnafstemming wijkt af van deze keuze: ${esc(Mapping.summary(l, dom, st))}">aangepast</span>` : "", m ? `<span class="badge warn" title="${esc(`Minder streng dan het minder gevoelige label ‘${labelFullName(m.lower, st)}’.`)}">${icon("warning", "s")} minder streng</span>` : ""].join(" ");
      return `<div class="dl-row"><span class="dl-lbl"><span class="color-dot" style="background:${esc(l.color)}"></span><span class="dl-lbl-t">${p ? `<span class="dl-lbl-p">${esc(p.displayName || p.name)}</span>` : ""}${esc(l.displayName || l.name)}</span></span>${sel}<span class="dl-user">${esc(c ? c.user || c.desc : "Nog niet gekozen.")}${flags ? ` ${flags}` : ""}</span></div>`;
    };
    const all = `<select class="select dl-all" data-action="dlp-row" data-dom="${esc(dom)}" aria-label="${esc(row.name)}: keuze voor alle labels tegelijk"><option value="" selected>Alle labels tegelijk…</option>${choices.map((x) => `<option value="${esc(x.id)}">${esc(x.title)}</option>`).join("")}</select>`;
    const items = rows.map((r) => ({ id: r.key, name: r.name }));
    const bar = VH.switcher({ label: "Locatie", items, cur: dom, action: "dlp-dom", key: "dom", noList: true, extra: all });
    const optRows = CATALOG.boardRows.filter((r) => r.optional && r.dlp);
    const optUsed = optRows.filter((r) => ls.some((l) => l.choices[r.key] && !/-off$/.test(l.choices[r.key]))).length;
    const optBtn = `<button type="button" class="link-btn xs" data-action="board-optional" aria-pressed="${UI.boardOptional ? "true" : "false"}" title="${esc(optRows.map((r) => r.name).join(", "))}">${UI.boardOptional ? "Ongebruikte locaties verbergen" : `Meer locaties tonen (${optUsed}/${optRows.length} in gebruik)`}</button>`;
    const det = this.refine(st, row, ls);
    const q = `<div class="dl-q">${_dlpLogo(row, "dl-q-logo")}<div><h3>${esc(DLP_Q[dom] || row.desc || row.name)}</h3><p class="small muted m-0">${esc(row.sub || "")}${row.lic ? " · " + licBadge(row.lic) : ""}</p></div></div>`;
    const list = `<div class="dl-list" role="group" aria-label="${esc(row.name)}: keuze per label"><div class="dl-row dl-row-h" aria-hidden="true"><span>Label</span><span>Wat gebeurt er</span><span>Wat merkt de medewerker</span></div>${ls.map(lrow).join("")}</div>`;
    const more = [
      det.ex ? `<section class="dl-pv" aria-labelledby="dl-pv-h"><h4 id="dl-pv-h" class="dl-pv-h">${icon("eye", "s")} Zo ziet de medewerker het</h4>${det.ex}</section>` : "",
      det.main ? accordion("dlp-fine", `${icon("sliders", "s")} Fijnafstemmen <span class="xs muted">· ${esc(det.what)}</span>`, det.main) : "",
      det.link || "",
    ].join("");
    const loc = `<section class="ws-sec dl-loc"><div class="dl-bar">${bar}</div>${q}${list}<div class="dl-more">${more}</div><div class="dl-foot">${optBtn}</div></section>`;
    return `<p class="dl-lead">Kies per locatie wat DLP doet als iemand gelabelde informatie deelt. Alles start in <b>simulatie</b>: je ziet eerst wat er zou gebeuren.</p>${loc}${this.overview(st, ls, rows, dom)}`;
  },

  /** Compact overzicht: locaties × labels (alleen lezen; klik = die locatie bewerken). */
  overview(st, ls, rows, dom) {
    const head = `<tr><th scope="col" class="dl-ovt-c">Locatie</th>${ls.map((l) => `<th scope="col" title="${esc(labelFullName(l, st))}"><span class="color-dot" style="background:${esc(l.color)}"></span>${esc(labelShortName(l))}</th>`).join("")}</tr>`;
    const body = rows.map((r) => `<tr${r.key === dom ? ' class="on"' : ""}><th scope="row"><button type="button" class="link-btn dl-ovt-loc" data-action="dlp-dom" data-dom="${esc(r.key)}" data-scroll="1">${_dlpLogo(r)}${esc(r.name)}</button></th>${ls.map((l) => {
      const c = Mapping.choice(l, r.key);
      return `<td>${c ? `<span class="dl-ovt-v lv-${c.lv}" title="${esc(Mapping.summary(l, r.key, st))}">${esc(c.title)}</span>` : `<span class="muted">–</span>`}</td>`;
    }).join("")}</tr>`).join("");
    return accordion("dlp-overview", `${icon("table", "s")} Overzicht alle locaties`, `<div class="vb-ovf"><div class="board-wrap vb-ovf-scroll" tabindex="0" role="region" aria-label="DLP-overzicht: labels × locaties"><table class="table dl-ovt"><thead>${head}</thead><tbody>${body}</tbody></table></div><span class="vb-ovf-hint" aria-hidden="true">→ meer labels</span></div>`);
  },

  /** Per locatie: fijnafstemming (Purview-actie, bereik, ketenpartners) en voorbeeldmeldingen. */
  refine(st, row, ls) {
    const d = row.dlp;
    const rules = ls.map((l) => [l, Generator.ruleFor(l, d, st)]);
    const exList = rules.filter(([, r]) => r).map(([l, r]) => { const x = DlpEx.of(r, d, st); if (x) x.who = labelShortName(l); return x; });
    const alts = DlpPv.actAlts(exList, d);
    const ex = DLP_APP[d] || alts.length ? DlpPv.html(`m:${row.key}`, alts, { label: "Voorbeeld per actie", empty: "Geen melding: de gebruiker merkt niets. De activiteit wordt wel vastgelegd." }) : "";
    if (!DLP_DOM_ACTIONS[d] || d === "endpoint" || d === "copilot") {
      const link = row.route && row.route !== "dlp" ? `<div class="dl-link"><button class="btn small" data-action="go" data-route="${esc(row.route)}">${icon(row.icon, "s")} Meer instellingen op ${esc(Views[row.route] ? Views[row.route].title : row.name)}</button></div>` : "";
      return { main: "", ex, link, what: "" };
    }
    const scopes = DLP_DOM_SCOPES[d];
    const isMail = d === "exchange";
    const partnerDoms = isMail ? unique((st.groups || []).filter((g) => g.kind === "domain").flatMap((g) => String(g.value || "").split(/[\s,;]+/)).filter(Boolean)) : [];
    const pex = (st.dlpSettings && st.dlpSettings.partnerException) || {};
    const cols = 2 + (scopes ? 1 : 0) + (isMail ? 1 : 0);
    const hd = `<div class="dl-grid-h"><span>Label</span><span>Actie in Purview</span>${scopes ? "<span>Voor wie</span>" : ""}${isMail ? `<span>Ketenpartners ${infoTip("Mail naar partnerdomeinen wordt niet geblokkeerd, wel vastgelegd. In Purview: exception ‘Recipient domain is’.")}</span>` : ""}</div>`;
    const tr = rules.map(([l, r]) => {
      const v = l.cfg.dlp[d] || {}, b = `lbl:${l.id}:cfg.dlp.${d}`, nm = labelFullName(l, st), on = v.action && v.action !== "off";
      const dash = `<span class="muted xs">–</span>`;
      const res = r ? (r.effective ? VH.clamp(`<span>${esc(r.desc)}</span>`, (r.desc || "").length, 2, 150) : `<span class="badge err">Geen conditie</span>`) : `<span class="muted">Geen regel</span>`;
      return `<div class="dl-grid-r"><span class="dl-lbl"><span class="color-dot" style="background:${esc(l.color)}"></span>${esc(nm)}</span>
        ${VH.aria(F.select(`${b}.action`, "", DLP_DOM_ACTIONS[d].map((a) => [a, DLP_ACTION_LABEL(d, a)]), { cls: "mb-0" }), `Actie voor ${nm}`)}
        ${scopes ? (on ? VH.aria(F.select(`${b}.scope`, "", scopes, { cls: "mb-0" }), `Bereik voor ${nm}`) : dash) : ""}
        ${isMail ? `<span>${on && v.action !== "audit" ? VH.aria(F.check(`st:dlpSettings.partnerException.${l.id}`, "Uitzonderen"), `Ketenpartners uitzonderen voor ${nm}`) : pex[l.id] ? `<span class="xs muted">aan, geen effect</span>` : dash}</span>` : ""}
        <div class="dl-res small${r ? "" : " muted"}">${isMail && v.action === "encrypt" ? `<div class="dl-enc">${VH.aria(F.select(`${b}.template`, "", [["Encrypt", "Versleutelen"], ["Do Not Forward", "Niet doorsturen"]], { cls: "mb-0" }), `Versleuteling voor ${nm}`)}</div>` : ""}${res}${Mapping.isCustom(l, row.key) ? ` <span class="badge neutral">aangepast</span>` : ""}</div></div>`;
    }).join("");
    const pexInfo = isMail && Object.values(pex).some(Boolean) ? `<p class="xs muted mt-1 mb-0">${icon("globe", "s")} Partnerdomeinen: ${partnerDoms.length ? `<b>${esc(partnerDoms.join(", "))}</b>` : `nog geen – voeg bij <a href="#" data-action="go" data-route="policies">Labelbeleid</a> een doelgroep van het type ‘domein’ toe.`}</p>` : "";
    const intro = `<p class="xs muted mt-0">Hier stel je de exacte Purview-actie in. Een afwijking van de keuze hierboven krijgt het kenmerk ‘aangepast’.</p>`;
    return { main: `${intro}<div class="dl-grid" style="--dl-cols:${cols}">${hd}${tr}</div>${pexInfo}`, ex, link: "", what: ["actie", scopes ? "bereik" : "", isMail ? "ketenpartners" : ""].filter(Boolean).join(", ") };
  },

  tab_policies(st, g) {
    const ds = st.dlpSettings;
    const nRules = sum(g.dlpPolicies.map((p) => p.rules.length));
    const mode = CATALOG.dlpModes.find((m) => m.key === ds.mode);
    const defaults = WSX.sec("Hoe starten de policies?", `<div class="ws-cols">
        ${F.select("st:dlpSettings.mode", `Start in ${infoTip(`In Purview: ${CATALOG.dlpModes.map((m) => m.name).join(" · ")}`)}`, CATALOG.dlpModes.map((m) => [m.key, DLP_MODE_NL[m.key] || m.name]), { hint: mode ? esc(mode.desc) : "" })}
        <div>${F.check("st:dlpSettings.includeSitsForUnlabeled", "Ook inhoud zonder label controleren", { desc: "Een regel matcht het label óf de informatietypen die bij het label horen." })}</div></div>
      ${accordion("dlp-tech", `${icon("code", "s")} Technische details`, `<div class="ws-cols">${F.text("st:dlpSettings.namingPrefix", "Naamprefix", { ph: "DLP", maxlength: 20 })}
        ${F.text("st:dlpSettings.adminUnits", "Admin units (standaard)", { type: "csv", ph: "Leeg = volledige directory", hint: "Alleen voor Exchange, SharePoint, OneDrive, Teams en Devices." })}</div>
        ${F.check("st:dlpSettings.mergeIdentical", "Identieke locaties samenvoegen in één policy", { desc: "E-mail, Delen en Teams met exact dezelfde keuzes worden één policy met meerdere locaties." })}`)}`);
    const limits = accordion("dlp-limits", `${icon("info", "s")} Limieten <span class="xs muted">· ${nRules} van max. 600 regels</span>`, `<div class="mb-1">${meter(Math.min(100, (nRules / 600) * 100), nRules > 600 ? "err" : "brand")}<div class="xs muted">${nRules} van max. 600 DLP-regels per tenant</div></div>
      <ul class="small">${CATALOG.dlpLimits.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`, nRules > 600);
    if (!g.dlpPolicies.length) return `${defaults}${emptyState("shield", "Nog geen DLP-policies", "Kies DLP-acties per label, of maak een maatwerk-policy.", `<button class="btn primary" data-action="dlp-tab" data-tab="matrix">${icon("grid", "s")} Naar Per label</button>`)}`;
    const cur = g.dlpPolicies.find((p) => p.id === UI.dlpPol) || g.dlpPolicies[0];
    const items = g.dlpPolicies.map((p) => ({ id: p.id, name: p.name, icon: VH.loc((p.locations || [])[0]).icon, note: plural(p.rules.length, "regel", "regels") }));
    const lead = `<p class="dl-lead">Uit jullie keuzes ontstaan <b>${plural(g.dlpPolicies.length, "policy", "policies")}</b> met samen <b>${plural(nRules, "regel", "regels")}</b>. Kies een policy om te zien wat hij doet.</p>`;
    return `${lead}<section class="ws-sec dl-pol">${VH.switcher({ label: "Policy", items, cur: cur.id, action: "dlp-pol", key: "pol", extra: this.newMenu() }, `<div class="mt-2">${this.polDetail(cur, st, ds)}</div>`)}</section>${defaults}<div class="mt-2">${limits}</div>`;
  },

  /** Menu ‘Nieuwe maatwerk-policy’ (vanaf nul of vanuit een template). */
  newMenu() {
    return `<details class="dl-menu"><summary class="btn small">${icon("plus", "s")} Maatwerk-policy</summary><div class="dl-menu-b" role="group" aria-label="Nieuwe maatwerk-policy">${CATALOG.dlpTemplates.map((t) => `<button type="button" class="dl-menu-i" data-action="cdlp-add" data-tpl="${esc(t.key)}"><b>${esc(t.key === "custom" ? "Vanaf nul" : t.name)}</b><span class="xs muted">${esc(t.desc)}</span></button>`).join("")}<div class="xs muted dl-menu-n">${esc(CATALOG.dlpTemplateNote)}</div></div></details>`;
  },

  /** Regel als scanbare zin: EN [scope] → [actie] · [meldingen]. De volledige tekst staat in de tooltip. */
  ruleChips(r) {
    const c = r.conditions, a = r.actions, n = r.notify || {}, acts = [];
    const scope = c.senderExternal ? "Van externe afzenders" : c.accessScope === "NotInOrganization" ? "Gedeeld met externen" : c.accessScope === "InOrganization" ? "Alleen intern gedeeld" : "Overal";
    if (a.blockAccess) acts.push([n.override ? "warn" : "err", `${n.override ? "Blokkeren met override" : "Blokkeren"}${{ All: " voor iedereen", PerUser: " voor externen", PerAnonymousUser: " van Anyone-links" }[a.blockScope] || ""}`]);
    if (a.encrypt) acts.push(["warn", "Versleutelen"]);
    if (a.endpoint) {
      const g = { block: 0, warn: 0, audit: 0 };
      a.endpoint.forEach((e) => { if (e.level in g) g[e.level]++; });
      if (g.block) acts.push(["err", `${plural(g.block, "activiteit", "activiteiten")} blokkeren`]);
      if (g.warn) acts.push(["warn", `${plural(g.warn, "activiteit", "activiteiten")} met override`]);
      if (g.audit) acts.push(["neutral", `${plural(g.audit, "activiteit", "activiteiten")} registreren`]);
    }
    if (a.copilotExclude) acts.push(["warn", { content: "Copilot verwerkt deze items niet", web: "Geen web search door Copilot", prompts: "Copilot verwerkt de prompt niet", external: "Copilot gebruikt deze e-mail niet" }[a.copilotScope] || "Copilot uitsluiten"]);
    if (a.onprem) acts.push(["warn", a.onprem === "move" ? "Naar quarantainemap" : "Toegang beperken"]);
    if (a.govern) acts.push(["warn", "Externe gebruikers verwijderen"]);
    if (!acts.length) acts.push(r.action === "tip" ? ["info", "Alleen policy tip"] : ["neutral", "Alleen registreren"]);
    const note = [n.tip && "Policy tip", n.email && "E-mail aan gebruiker", n.alert && n.alert !== "none" && `Alert ${EXPORT_NL.sev(n.severity)}`, n.incidentReport && "Incidentrapport"].filter(Boolean);
    const rd = (r.exceptions || []).find((x) => x.key === "recipientDomain");
    const exc = rd && rd.value && [].concat(rd.value).length ? `<span class="dl-rc-exc">${icon("minus", "s")} Behalve ${esc([].concat(rd.value).join(", "))}</span>` : "";
    const orSits = r.label && c.sits.length ? `<span class="dl-rc-k">of</span><span class="chip sm" title="${esc(c.sits.map((x) => x.name).join(", "))}">${esc(c.sits.length === 1 ? c.sits[0].name : `${c.sits.length} informatietypen`)}</span>` : "";
    return `<div class="dl-rc" title="${esc(r.desc || "")}">${orSits}<span class="dl-rc-k">en</span><span class="chip sm">${esc(scope)}</span><span class="dl-rc-arrow" aria-label="dan">→</span>${acts.map(([k, t]) => `<span class="badge ${k}">${esc(t)}</span>`).join("")}${note.length ? `<span class="dl-rc-n">${icon("bell", "s")} ${esc(note.join(" · "))}</span>` : ""}${exc}</div>`;
  },

  polDetail(p, st, ds) {
    const locs = unique(p.locations);
    const badges = [p.custom ? `<span class="badge info">Maatwerk</span>` : "", p.merged ? `<span class="badge neutral" title="Locaties met identieke keuzes zijn samengevoegd.">Samengevoegd</span>` : "", locs.includes("copilot") ? previewBadge() : ""].join(" ");
    const head = `<div class="dl-phead">${locs.map((k) => _dlpLogo(VH.loc(k))).join("")}<span class="small">${esc(locs.map((k) => VH.loc(k).name).join(" · "))}</span>${badges}<span class="spacer"></span>${VH.modeBadge(p.mode)}</div>`;
    const rules = p.rules.length ? `<ol class="dl-rules">${p.rules.map((r) => {
      const who = r.label ? labelPill(r.label, st) : [...r.conditions.labels.map((l) => labelPill(l, st)), ...r.conditions.sits.slice(0, 3).map((s) => VH.sitChip(s))].join("") + (r.conditions.sits.length > 3 ? `<span class="chip sm">+${r.conditions.sits.length - 3}</span>` : "");
      return `<li><div class="dl-rule-who">${who}</div><div>${this.ruleChips(r)}${r.effective ? "" : `<span class="badge err mt-1">Geen conditie</span>`}</div></li>`;
    }).join("")}</ol>` : `<p class="small muted">Nog geen regels.</p>`;
    const exFor = (k) => p.rules.map((r) => { const x = DlpEx.of(r, k, st); if (x && r.label) x.cap = `${labelShortName(r.label)} · ${DlpEx.CAP[x.kind]}`; return x; });
    const ex = DlpPv.html(`p:${p.id}`, locs.map((k) => DlpPv.locAlt(k, exFor(k), 2)), { label: "Voorbeeld per locatie", empty: "Deze policy heeft nog geen locatie." });
    const edit = p.custom ? `<div class="mt-2"><button class="btn small" data-action="cdlp-sel" data-id="${esc(p.id)}">${icon("edit", "s")} Bewerken in Maatwerk</button></div>` : "";
    const settings = p.custom || /-sim$/.test(p.id) ? "" : p.domains.map((dk) => {
      const dom = CATALOG.dlpDomains.find((x) => x.key === dk), b = `st:dlpSettings.perLocation.${dk}`;
      const au = dom.locations.every((x) => CATALOG.dlpAdminUnitLocations.includes(x));
      const pl = (ds.perLocation || {})[dk];
      return `<details class="acc mt-1" data-acc="dlp-pl-${esc(dk)}"><summary>${icon("settings", "s")} ${esc(dom.name)}${pl && Object.keys(pl).length ? ` <span class="badge info">aangepast</span>` : ""}</summary><div class="acc-body">
        <div class="ws-cols">${F.text(`${b}.name`, "Naam in Purview", { maxlength: 64, ph: `${ds.namingPrefix ? ds.namingPrefix + " – " : ""}${dom.name}`, hint: p.merged ? "Bij samengevoegde policies bepaalt de tool de naam." : "" })}
        ${F.select(`${b}.mode`, "Modus", [["", `Standaard (${DLP_MODE_NL[ds.mode] || VH.modeName(ds.mode)})`], ...CATALOG.dlpModes.map((m) => [m.key, DLP_MODE_NL[m.key] || m.name])])}</div>
        ${VH.incExc(`${b}.include`, `${b}.exclude`, { incLabel: "Alleen voor (include)", excLabel: "Behalve (exclude)", incPh: "Leeg = iedereen, of: groep1, groep2", incHint: esc(dom.locations.map((k) => VH.loc(k).include).join(" / ")), excPh: "Bijv. sg-dlp-uitzondering" })}
        ${au ? F.text(`${b}.adminUnits`, "Admin units (overschrijft de standaard)", { type: "csv", ph: "Leeg = standaard / volledige directory" }) : `<div class="xs muted">Admin units worden voor deze locatie niet ondersteund.</div>`}
        <button class="btn small subtle" data-action="dlp-pl-reset" data-dom="${esc(dk)}">${icon("undo", "s")} Standaard herstellen</button></div></details>`;
    }).join("");
    const scope = settings ? accordion(`dlp-polscope-${p.id}`, `${icon("settings", "s")} Afwijkende scope of modus <span class="xs muted">· per locatie</span>`, settings) : "";
    const tech = accordion(`dlp-poltech-${p.id}`, `${icon("code", "s")} Technische details <span class="xs muted">· zoals in Purview</span>`, VH.policyBody(p, st, { full: true }));
    return `${head}<h4 class="dl-h4">Wat doet deze policy</h4>${rules}${edit}${ex ? `<section class="dl-pv"><h4 class="dl-pv-h">${icon("eye", "s")} Zo ziet de medewerker het</h4>${ex}</section>` : ""}<div class="dl-more">${scope}${tech}</div>`;
  },

  tab_notify(st) {
    const ls = applicableLabels(st);
    if (!ls.length) return VH.needLabels();
    const needRcpt = ls.some((l) => (l.cfg.notify.alert && l.cfg.notify.alert !== "none") || l.cfg.notify.incidentReport) || (st.customDlp || []).some((c) => (c.rules || []).some((r) => (r.alert && r.alert !== "none") || r.incidentReport));
    const rcpt = WSX.sec("Wie beoordeelt een mogelijk datalek", `${F.text("st:dlpSettings.alertRecipients", `Ontvangers van alerts en incident reports`, { ph: "Bijv. privacy@organisatie.nl; soc@organisatie.nl", hint: "Denk aan FG/privacy-officer en SOC. Geldt voor alle DLP-regels." })}
      ${needRcpt && !_dlpAlertTo(st) ? msg("warn", "Er staan alerts of incident reports aan, maar nog zonder ontvangers.") : ""}`);
    const shows = (x) => Object.keys(x.cfg.dlp || {}).some((k) => { const v = x.cfg.dlp[k]; if (!v || !v.action || v.action === "off") return false; const r = Generator.ruleFor(x, k, st); return !!(r && DlpEx.of(r, k, st)); });
    const l = ls.find((x) => x.id === UI.dlpNotifyLabel) || ls.find(shows) || ls.find((x) => Object.values(x.cfg.dlp || {}).some((v) => v && v.action && v.action !== "off")) || ls[0];
    const items = VH.labelItems(st, (x) => ls.includes(x));
    const doms = Object.keys(l.cfg.dlp || {}).filter((k) => (l.cfg.dlp[k] || {}).action && l.cfg.dlp[k].action !== "off");
    const rules = doms.map((k) => [k, Generator.ruleFor(l, k, st)]).filter(([, r]) => r);
    const b = `lbl:${l.id}:cfg.notify`, n = l.cfg.notify, nm = labelFullName(l, st);
    const hasOverride = doms.some((k) => l.cfg.dlp[k].action === "override");
    const where = doms.length ? `<p class="small muted mt-0">Geldt voor de DLP-regels van dit label op: ${esc(doms.map((k) => (CATALOG.dlpDomains.find((x) => x.key === k) || { name: k }).name).join(", "))}.</p>` : msg("info", "Dit label heeft nog geen DLP-acties; meldingen hebben pas effect als je bij ‘Per label’ een actie kiest.");
    const user = `<div class="ws-toggles">
        ${F.toggle(`${b}.tip`, "Policy tip tonen", { desc: "Melding in Outlook, Office, SharePoint/OneDrive en Teams. Niet bij Copilot." })}
        ${n.tip ? F.textarea(`${b}.tipText`, "Tekst van de melding", { rows: 2, ph: Generator.tipText({}, nm), hint: "Leeg = standaardtekst per locatie. Max. 256 tekens." }) : ""}
        ${F.toggle(`${b}.emailUser`, "E-mail naar de gebruiker", { desc: "Exchange, SharePoint en OneDrive; Teams stuurt geen e-mail." })}</div>
      ${F.select(`${b}.override`, `Toch doorgaan ${infoTip(`Alleen bij de actie ‘Blokkeren met override’; vereist policy tips. In Purview: ${CATALOG.overrideOptions.filter(([k]) => k !== "none").map(([, t]) => t).join(" · ")}`)}`, CATALOG.overrideOptions.map(([k]) => [k, DLP_OVR_NL[k] || k]), { hint: hasOverride ? "" : "Heeft nu geen effect: geen enkele locatie staat op ‘Blokkeren met override’." })}`;
    const admin = `<div class="ws-cols">${F.select(`${b}.alert`, "Alert", CATALOG.alertOptions.map(([k, t]) => [k, DLP_ALERT_NL[k] || t]))}${F.select(`${b}.severity`, "Ernst", CATALOG.severities.map(([k]) => [k, DLP_SEV_NL[k] || k]))}</div>
      ${F.toggle(`${b}.incidentReport`, "Incident report naar beheerders", { desc: _dlpAlertTo(st) ? `Naar: ${esc(_dlpAlertTo(st))}` : "Ontvangers nog niet ingevuld (zie boven)." })}`;
    const exs = rules.map(([k, r]) => DlpEx.of(r, k, st));
    if (n.emailUser && rules.some(([k, r]) => r.notify.email && k !== "teams")) exs.push({ kind: "email", app: "outlook", ctx: { ruleName: rules[0][1].name, tipText: "" } });
    const ex = DlpEx.html(exs, 1, n.tip ? "Nog geen locatie met een melding voor dit label." : "Geen melding: de gebruiker merkt niets.");
    const nc = Mapping.choice(l, "notify");
    const quick = `<div class="field dl-quick"><label class="field-label" for="dl-nq">Snelkeuze ${infoTip("Zet tips, e-mail, override en alerts in één keer. Daarna kun je hieronder elk onderdeel aanpassen.")}</label><select id="dl-nq" class="select dl-pick lv-${nc ? nc.lv : "x"}" data-action="dlp-cell" data-id="${esc(l.id)}" data-dom="notify">${nc ? "" : `<option value="" selected>Kies…</option>`}${CATALOG.choicesFor("notify").map((x) => `<option value="${esc(x.id)}"${nc && nc.id === x.id ? " selected" : ""}>${esc(x.title)}</option>`).join("")}</select>${nc && nc.user ? `<div class="hint">${esc(nc.user)}</div>` : ""}</div>`;
    const detail = `${where}${quick}<h4 class="dl-h4">Wat ziet de gebruiker</h4>${user}<h4 class="dl-h4">Wat krijgen beheerders</h4>${admin}`;
    const overview = accordion("dlp-notify-all", `${icon("table", "s")} Overzicht alle labels`, `<div class="table-wrap"><table class="table dl-ov"><thead><tr><th>Label</th><th>Policy tip</th><th>E-mail</th><th>Toch doorgaan</th><th>Alert</th><th>Incident report</th></tr></thead><tbody>${ls.map((x) => { const m = x.cfg.notify; return `<tr><td>${labelPill(x, st)}</td><td>${m.tip ? "Ja" : "–"}</td><td>${m.emailUser ? "Ja" : "–"}</td><td>${esc(DLP_OVR_NL[m.override] || "–")}</td><td>${esc(DLP_ALERT_NL[m.alert] || "–")}${m.alert && m.alert !== "none" ? ` · ${esc(DLP_SEV_NL[m.severity] || m.severity)}` : ""}</td><td>${m.incidentReport ? "Ja" : "–"}</td></tr>`; }).join("")}</tbody></table></div>`);
    const info = accordion("dlp-notify-info", `${icon("mail", "s")} Wat staat er in een incident report?`, `<div class="ws-cols"><div><h4 class="mt-0">Incident report bevat</h4><ul class="small">${CATALOG.incidentReportContent.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
      <div><h4 class="mt-0">Ontvangers e-mailnotificatie</h4><ul class="small">${CATALOG.notifyRecipients.map(([, t]) => `<li>${esc(t)}</li>`).join("")}</ul></div></div><div class="xs">${learn("dlpTips", "Policy tips")} · ${learn("dlpAlerts", "DLP-alerts")}</div>`);
    const lead = `<p class="dl-lead">Wat ziet een medewerker als DLP ingrijpt, en wie krijgt bericht? Kies een label.</p>`;
    return `${lead}${WSX.sec("Meldingen per label", `${VH.switcher({ label: "Label", items, cur: l.id, action: "dlp-nlbl", key: "lbl", noList: true })}<div class="mt-2">${detail}</div>`, ex)}${rcpt}${overview}<div class="mt-1">${info}</div>`;
  },

  tab_editor(st) {
    const list = st.customDlp || [];
    const c = CdlpUI.cur(st);
    if (!c) return emptyState("edit", "Nog geen maatwerk-policy", "Voor regels op basis van informatietypen of een eigen scope. Begin vanaf nul of vanuit een template.", this.newMenu());
    const items = list.map((p) => ({ id: p.id, name: p.name, icon: VH.loc((p.locations || [])[0]).icon, note: plural((p.rules || []).length, "regel", "regels") }));
    const palette = `<div class="dl-pal"><div class="field-label">${icon("tag", "s")} Labels</div><div class="chip-list mb-2">${orderedLabels(st).map((l) => `<span class="chip" style="cursor:grab" data-drag="pub-label" data-tap="1" data-pick-label="${esc(labelFullName(l, st))}" data-payload="${attr({ labelId: l.id })}"><span class="color-dot" style="background:${esc(l.color)}"></span>${esc(l.parentId ? "↳ " + labelShortName(l) : labelShortName(l))}</span>`).join("") || `<span class="xs muted">Geen labels</span>`}</div>
      <div class="field-label">${icon("search", "s")} Informatietypen</div><div class="chip-list lib-scroll" style="max-height:40vh">${st.sits.map((s) => `<span data-drag="sit" data-tap="1" data-pick-label="${esc(s.name)}" data-payload="${attr({ sitId: s.id })}" style="cursor:grab">${VH.sitChip(s)}</span>`).join("") || `<span class="xs muted">Nog geen informatietypen – zie Informatietypen.</span>`}</div></div>`;
    const ri = Math.max(0, Math.min(UI.dlpRule || 0, c.rules.length - 1)), gr = c.rules[ri] && Generator.customPolicy(c, st).rules[ri], locs = c.locations || [];
    const ex = gr ? DlpPv.html(`c:${c.id}`, locs.map((k) => DlpPv.locAlt(k, [DlpEx.of(gr, k, st)], 1)), { label: "Voorbeeld per locatie", empty: "Kies bij stap 2 minstens één locatie; dan zie je hier wat de medewerker ziet." }) : "";
    const extras = `${accordion("cdlp-pal", `${icon("grip", "s")} Labels en informatietypen slepen`, `<p class="xs muted mt-0">Sleep een label of informatietype naar ‘Content contains’ (of tik erop en daarna op het vak).</p>${palette}`)}${ex ? accordion("cdlp-ex", `${icon("eye", "s")} Zo ziet de medewerker het`, ex, true) : ""}`;
    const lead = `<p class="dl-lead">Een maatwerk-policy is voor regels op basis van informatietypen (bijv. veel BSN’s in één bestand) of een eigen scope. Werk de stappen van boven naar beneden af.</p>`;
    return lead + VH.switcher({ label: "Maatwerk-policy", items, cur: c.id, action: "cdlp-sel", key: "id", extra: this.newMenu() }, `<div class="mt-2">${this.wizard(c, st, extras)}</div>`);
  },

  wizard(c, st, extras = "") {
    const id = c.id, b = `cdlp:${id}:`, locs = c.locations || [];
    const isCop = locs.includes("copilot");
    const au = locs.length && locs.every((x) => CATALOG.dlpAdminUnitLocations.includes(x));
    const onlyCustom = locs.some((x) => ["copilot", "fabric", "instances"].includes(x));
    const step = (n, title) => `<span class="dl-n">${n}</span>${esc(title)}`;
    const fresh = UI.cdlpFresh && UI.cdlpFresh.id === c.id && UI.cdlpFresh.sig === JSON.stringify(c);
    if (UI.cdlpFresh && UI.cdlpFresh.id === c.id && !fresh) UI.cdlpFresh = null;
    const iss = fresh ? [] : CdlpUI.issues(c, st);
    const ri = Math.max(0, Math.min(UI.dlpRule || 0, c.rules.length - 1));
    const eid = esc(id);
    const tpl = CATALOG.dlpTemplates.find((t) => t.key === c.template);
    const mode = CATALOG.dlpModes.find((m) => m.key === c.mode);
    const ruleItems = c.rules.map((r, i) => ({ id: String(i), name: `${i + 1}. ${r.name}`, note: (CdlpUI.actionOptions(locs).find((x) => x[0] === r.action) || [, r.action])[1] }));
    const r0 = c.rules[ri];
    const tools = r0 ? `<span class="dl-rtools"><button class="icon-btn small" data-action="cdlp-rule-move" data-id="${eid}" data-rule="${ri}" data-dir="-1" title="Hoger" aria-label="Regel ${ri + 1} hoger"${ri === 0 ? " disabled" : ""}>↑</button><button class="icon-btn small" data-action="cdlp-rule-move" data-id="${eid}" data-rule="${ri}" data-dir="1" title="Lager" aria-label="Regel ${ri + 1} lager"${ri === c.rules.length - 1 ? " disabled" : ""}>↓</button><button class="icon-btn small" data-action="cdlp-rule-del" data-id="${eid}" data-rule="${ri}" title="Regel verwijderen" aria-label="Regel ${ri + 1} verwijderen">${icon("trash", "s")}</button></span>` : "";
    const addRule = `<button class="btn small" data-action="cdlp-rule-add" data-id="${eid}">${icon("plus", "s")} Regel</button>`;
    const ruleOk = (r) => (r.labels || []).length + (r.sits || []).length > 0;
    const steps = [
      ["Basis", (c.name || "").trim() ? esc(tpl ? tpl.name : "Custom") : "Naam ontbreekt", !!(c.name || "").trim()],
      ["Locaties", locs.length ? plural(locs.length, "locatie", "locaties") : "Nog niets gekozen", locs.length > 0],
      ["Regels", c.rules.length ? `${c.rules.filter(ruleOk).length} van ${c.rules.length} compleet` : "Nog geen regels", c.rules.length > 0 && c.rules.every(ruleOk)],
      ["Starten", esc(mode ? DLP_MODE_NL[mode.key] || mode.name : "Kies een modus"), !!mode],
    ];
    const stepper = `<ol class="cdlp-steps" aria-label="Stappen van deze policy">${steps.map(([t, sub, ok], i) => `<li class="${ok ? "ok" : "todo"}"><button type="button" data-action="cdlp-jump" data-n="${i + 1}"><span class="cs-n" aria-hidden="true">${ok ? icon("check", "s") : i + 1}</span><span class="cs-t"><b>${esc(t)}</b><span>${sub}</span></span><span class="sr-only">${ok ? "– gereed" : "– nog te doen"}</span></button></li>`).join("")}</ol>`;
    return `<div class="dl-phead mb-2">${locs.map((k) => _dlpLogo(VH.loc(k))).join("")}<b class="dl-pname">${esc(c.name)}</b>${VH.modeBadge(c.mode)}<span class="spacer"></span><button class="btn small subtle" data-action="cdlp-dup" data-id="${eid}">${icon("copy", "s")} Dupliceren</button><button class="btn small subtle danger" data-action="cdlp-del" data-id="${eid}">${icon("trash", "s")} Verwijderen</button></div>
      ${fresh ? `<div class="mb-2">${msg("info", `<b>Nieuwe policy aangemaakt.</b> Loop de vier stappen hieronder door: controleer de locaties, geef de regel een conditie (label of informatietype) en kies een actie. Controles verschijnen zodra je iets aanpast.`)}</div>` : ""}
      ${stepper}
      ${iss.length ? `<div class="mb-2">${iss.map((x) => msg(x.level, `<b>${esc(x.title)}</b> – ${esc(x.desc)}`)).join("")}</div>` : ""}
      ${WSX.sec(step(1, "Basis"), `<div class="ws-cols">${F.select(`${b}template`, `Template ${infoTip(CATALOG.dlpTemplateNote)}`, CATALOG.dlpTemplates.map((t) => [t.key, t.name]), { hint: tpl ? esc(tpl.desc) : "" })}${F.text(`${b}name`, "Naam", { maxlength: 64 })}</div>
        ${onlyCustom && c.template !== "custom" ? msg("err", "Copilot, Fabric/Power BI en cloud-apps ondersteunen alleen de Custom-template.") : ""}
        ${F.textarea(`${b}desc`, "Beschrijving", { rows: 2 })}
        ${au ? _cdlpMore("basis", "admin units", F.text(`${b}adminUnits`, "Admin units", { type: "csv", ph: "Leeg = volledige directory" }), (c.adminUnits || []).length > 0) : ""}`, "", { cls: "cdlp-s1" })}
      ${WSX.sec(step(2, "Waar geldt de policy"), `<div class="grid grid-2 vb-locs">${CATALOG.dlpLocations.map((l) => `<label class="check"><input type="checkbox" data-action="cdlp-loc" data-id="${eid}" data-loc="${esc(l.key)}"${locs.includes(l.key) ? " checked" : ""}><span>${_dlpLogo(l)} ${esc(l.name)} ${licBadge(l.lic)}${l.preview ? " " + previewBadge() : ""}${l.retiring ? `<span class="c-desc">${esc(l.retiring)}</span>` : ""}</span></label>`).join("")}</div>
        ${locs.length ? _cdlpMore("scope", "alleen voor of behalve bepaalde gebruikers", VH.incExc(`${b}include`, `${b}exclude`, { incLabel: "Alleen voor (include)", excLabel: "Behalve (exclude)", incHint: esc(locs.map((k) => VH.loc(k).include).join(" / ")) }), (c.include || []).length + (c.exclude || []).length > 0) : ""}
        ${isCop ? msg("info", esc(CATALOG.copilot.notes[0])) : ""}`, "", { cls: "cdlp-s2", aside: infoTip("Copilot en Fabric/Power BI staan altijd alleen in een policy. Bij een wijziging die bestaande regels raakt, vraagt de tool eerst om bevestiging.") })}
      ${WSX.sec(step(3, "Regels"), c.rules.length ? `${VH.switcher({ label: "Regel", items: ruleItems, cur: String(ri), action: "cdlp-rule-sel", key: "rule", noList: true, extra: tools })}<div class="mt-2">${this.ruleEditor(c, ri, st)}</div><div class="dl-more">${extras}</div>` : `<p class="small muted">Nog geen regels.</p>`, "", { cls: "cdlp-s3", aside: addRule })}
      ${WSX.sec(step(4, "Starten"), F.select(`${b}mode`, `Modus ${infoTip(`In Purview: ${CATALOG.dlpModes.map((m) => m.name).join(" · ")}`)}`, CATALOG.dlpModes.map((m) => [m.key, DLP_MODE_NL[m.key] || m.name]), { hint: mode ? esc(mode.desc) : "" }), "", { cls: "cdlp-s4" })}
      ${accordion("cdlp-preview", `${icon("code", "s")} Technische details <span class="xs muted">· zoals in Purview</span>`, VH.policyCard(Generator.customPolicy(c, st), st, { full: true }))}`;
  },

  ruleEditor(c, i, st) {
    const r = c.rules[i], id = c.id, locs = c.locations || [], b = `cdlp:${id}:rules.${i}.`;
    const isCop = locs.includes("copilot"), conds = CdlpUI.conditions(locs), xconds = CdlpUI.extraConditions(locs);
    const acts = CdlpUI.actionOptions(locs);
    const m365 = locs.some((x) => CDLP_M365.includes(x));
    const da = `data-id="${esc(id)}" data-rule="${i}"`;
    const chipsL = (r.labels || []).map((x) => labelById(x, st)).filter(Boolean).map((l) => `<span class="chip sm"><span class="color-dot" style="background:${esc(l.color)}"></span>${esc(labelFullName(l, st))}<button class="chip-x" data-action="cdlp-cond-del" ${da} data-kind="labels" data-v="${esc(l.id)}" title="Verwijderen" aria-label="${esc(labelFullName(l, st))} verwijderen">×</button></span>`).join("");
    const chipsS = (r.sits || []).map((x) => sitById(x, st)).filter(Boolean).map((s) => VH.sitChip(s, `<button class="chip-x" data-action="cdlp-cond-del" ${da} data-kind="sits" data-v="${esc(s.id)}" title="Verwijderen" aria-label="${esc(s.name)} verwijderen">×</button>`)).join("");
    const addSel = `<select class="select" style="max-width:260px" aria-label="Label of informatietype toevoegen" ${da} data-live="cdlp-addsel"><option value="">+ Toevoegen…</option><optgroup label="Sensitivity labels">${orderedLabels(st).map((l) => `<option value="l:${esc(l.id)}">${esc(labelFullName(l, st))}</option>`).join("")}</optgroup><optgroup label="Sensitive info types / classifiers">${st.sits.map((s) => `<option value="s:${esc(s.id)}">${esc(s.name)}</option>`).join("")}</optgroup></select>`;
    const xlist = (list, title) => {
      const items = (r[list] || []).map((x, xi) => {
        const def = CATALOG.dlpConditions.find((k) => k.key === x.key);
        if (!def) return "";
        return `<div class="cond-item row tight"><span class="small" style="min-width:200px">${esc(def.name)}</span>${VH.aria(CdlpUI.valueField(`${b}${list}.${xi}.value`, def), `Waarde voor ${def.name}`)}<span class="spacer"></span><button class="icon-btn small" data-action="cdlp-xdel" ${da} data-list="${esc(list)}" data-idx="${xi}" title="Verwijderen" aria-label="${esc(def.name)} verwijderen">${icon("x", "s")}</button></div>`;
      }).join("");
      const opts = xconds.filter((d) => !(list === "exceptions" && d.noExcept) && !(r[list] || []).some((x) => x.key === d.key));
      const hidden = list === "extra" && locs.length > 1 && locs.includes("exchange") ? CATALOG.dlpConditions.filter((d) => d.loc.includes("exchange") && !conds.some((x) => x.key === d.key)) : [];
      const exHint = hidden.length ? `<div class="vb-hint-row xs mt-1">${icon("info", "s")}<span>Sommige condities (zoals ‘${esc((hidden.find((d) => d.key === "recipientDomain") || hidden[0]).name)}’) zijn alleen beschikbaar als je alléén Exchange kiest. ${infoTip(hidden.map((d) => d.name).join(" · "))}</span><button type="button" class="btn small subtle" data-action="cdlp-only-exchange" data-id="${esc(id)}">${icon("mail", "s")} Alleen Exchange</button></div>` : "";
      return `<div class="field-label mt-1">${title}</div>${items}${opts.length ? `<select class="select" style="max-width:320px" aria-label="${esc(title)}: conditie toevoegen" ${da} data-list="${esc(list)}" data-live="cdlp-xadd"><option value="">+ Voorwaarde toevoegen…</option>${opts.map((d) => `<option value="${esc(d.key)}">${esc(d.name)}</option>`).join("")}</select>` : `<div class="xs muted">${locs.length ? "Geen aanvullende condities voor deze combinatie van locaties." : "Kies eerst locaties."}</div>`}${exHint}`;
    };
    const epGrid = locs.includes("devices") && r.action === "custom" ? `<div class="field-label mt-1">Activiteiten op apparaten</div><div class="table-wrap"><table class="table"><tbody>${CATALOG.endpointActivities.map((a) => `<tr><td>${icon(a.icon, "s")} ${esc(a.name)}</td><td style="width:200px">${VH.aria(F.select(`${b}endpoint.${a.key}`, "", CATALOG.endpointLevels.map(([k, t]) => [k, t]), { cls: "mb-0" }), a.name)}</td></tr>`).join("")}</tbody></table></div>` : "";
    const anyMax = r.maxCount === "any" || r.maxCount === "" || r.maxCount == null;
    const minN = Number(r.minCount), maxN = Number(r.maxCount);
    const cntErr = !Number.isInteger(minN) || minN < 1 ? "‘Vanaf’ moet een heel getal van 1 of hoger zijn."
      : !anyMax && (!Number.isInteger(maxN) || maxN < 1) ? "‘Tot’ moet een heel getal van 1 of hoger zijn, of kies ‘Geen maximum’."
      : !anyMax && minN > maxN ? `‘Vanaf’ (${minN}) is groter dan ‘Tot’ (${maxN}); de regel matcht dan nooit.` : "";
    const counts = `<div class="vb-count mt-1"><div class="field-label">Aantal keer in één item ${infoTip("Hoe vaak het informatietype in één item moet voorkomen. Templates gebruiken 1–9 (low volume) en 10–any (high volume).")}</div>
      <div class="row tight">${VH.aria(F.number(`${b}minCount`, "", { min: 1, max: 500, inline: true }), "Aantal – vanaf")}<span class="small">tot</span>
      ${anyMax ? "" : VH.aria(F.number(`${b}maxCount`, "", { min: 1, max: 500, inline: true }), "Aantal – tot")}
      <label class="check"><input type="checkbox" data-action="cdlp-maxany" ${da}${anyMax ? " checked" : ""}><span>Geen maximum</span></label></div>
      ${cntErr ? `<div class="vb-err" role="alert">${icon("xcircle", "s")} ${esc(cntErr)}</div>` : ""}</div>`;
    return `${F.text(`${b}name`, "Naam van de regel", { maxlength: 64 })}
      <div class="section-title">Voorwaarden</div>
      <div class="cond-group" data-drop="pub-label sit" data-zone="cdlp-cond" data-target='${attr({ policyId: id, ruleId: r.id })}'>
        <div class="row tight"><span class="op-pill">Content contains</span><span class="spacer"></span>${addSel}</div>
        <div class="chip-list mt-1">${chipsL}${chipsS}${chipsL || chipsS ? "" : `<span class="drop-hint">Sleep labels of informatietypen hierheen</span>`}</div>
        ${(r.sits || []).length && !isCop ? counts : ""}
        ${(r.labels || []).length && locs.includes("teams") ? msg("warn", "Teams chat- en kanaalberichten ondersteunen geen labels als conditie; de label-conditie werkt alleen voor de overige locaties.") : ""}
      </div>
      ${isCop ? F.radios(`${b}copilotAction`, "Copilot-regeltype", [["prompts", "Prompts met SIT’s niet verwerken (Processing prompts)", "", previewBadge()], ["web", "Prompts met SIT’s niet naar web search (Performing web searches)"], ["external", "E-mail van externe afzenders niet gebruiken", "", previewBadge()]]) + `<p class="xs muted">Met een label-conditie wordt de regel automatisch ‘Prevent Copilot from processing content’ voor gelabelde bestanden en e-mails.</p>` : ""}
      ${conds.some((x) => x.key === "accessScope") ? F.select(`${b}accessScope`, "Content is shared from Microsoft 365", [["", "(geen voorwaarde)"], ...conds.find((x) => x.key === "accessScope").options]) : ""}
      ${isCop ? "" : xlist("extra", "En ook")}
      ${isCop ? "" : xlist("exceptions", "Behalve")}
      <div class="section-title">Actie</div>
      ${F.select(`${b}action`, "Actie", acts, { onchange: "cdlp-action" })}
      ${["override", "block"].includes(r.action) && m365 ? F.select(`${b}scope`, "Blokkeren voor", CdlpUI.scopeOptions(locs)) : ""}
      ${r.action === "encrypt" ? F.select(`${b}template`, "Versleuteling", [["Encrypt", "Versleutelen"], ["Do Not Forward", "Niet doorsturen"]]) : ""}
      ${epGrid}
      ${isCop ? "" : `<div class="section-title">Wat ziet de gebruiker</div>
        ${F.check(`${b}tip`, "Policy tip tonen", { disabled: r.action === "override" })}
        ${r.tip ? F.textarea(`${b}tipText`, "Tekst van de melding", { rows: 2, ph: CATALOG.notifyTipDefault.replace("${label}", "…") }) : ""}
        ${F.check(`${b}emailUser`, "E-mail naar de gebruiker", { desc: "Niet in Teams." })}
        ${r.action === "override" ? F.select(`${b}override`, "Toch doorgaan", CATALOG.overrideOptions.filter(([k]) => k !== "none").map(([k]) => [k, DLP_OVR_NL[k] || k])) : ""}`}
      ${_cdlpMore("rule", "ernst, alerts, incident report en verwerking stoppen", `<div class="section-title mt-0">Wat krijgen beheerders</div>
      <div class="grid-2">${F.select(`${b}severity`, "Ernst", CATALOG.severities.map(([k]) => [k, DLP_SEV_NL[k] || k]))}${F.select(`${b}alert`, "Alert", CATALOG.alertOptions.map(([k, t]) => [k, DLP_ALERT_NL[k] || t]))}</div>
      ${r.alert === "threshold" ? `<div class="grid-2">${F.number(`${b}alertCount`, "Aantal activiteiten", { min: 1 })}${F.number(`${b}alertMinutes`, "Tijdvenster (minuten)", { min: 1 })}</div>` : ""}
      ${F.check(`${b}incidentReport`, "Incident report naar beheerders", { desc: _dlpAlertTo(st) ? `Naar: ${esc(_dlpAlertTo(st))}` : `Ontvangers nog niet ingevuld – zie <a href="#" data-action="dlp-tab" data-tab="notify">Meldingen</a>.` })}
      <div class="section-title">Overig</div>
      ${F.check(`${b}stop`, "Na een match geen andere DLP-regels meer verwerken", { desc: "Werkt niet in simulatiemodus." })}`, (r.alert && r.alert !== "none") || !!r.incidentReport || !!r.stop)}`;
  },
});
