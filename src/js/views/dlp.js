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
const DLP_TABS = [["matrix", "Per label", "grid"], ["policies", "Policies", "shield"], ["notify", "Meldingen & incidenten", "bell"], ["editor", "Maatwerk-policies", "edit"]];
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
    const o = [["external", "Block only people outside your organization"], ["all", "Block everyone"]];
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
Actions["dlp-dom"] = (el) => { UI.dlpDom = el.dataset.dom; App.render(); };
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
  UI.dlpEdit = id; UI.dlpRule = 0; UI.dlpTab = "editor"; App.render();
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
registerView("dlp", {
  title: "Data Loss Prevention",
  fac: {
    duration: 60,
    goal: "Bepalen wat DLP doet als informatie met een label of gevoelige informatietypen de organisatie dreigt te verlaten – per locatie, van inzicht naar handhaven.",
    questions: ["Welke uitstroomkanalen zijn voor jullie het grootste risico (e-mail, delen, Teams, USB, Copilot)?", "Mag een gebruiker met een goede reden doorzetten (override), of is blokkeren noodzakelijk?", "Wie ontvangt alerts en wie handelt incidenten af?"],
    tips: ["Werk in de matrix per label; verfijn per locatie in de selecties onder de matrix.", "Gebruik ‘Maatwerk-policies’ voor SIT-gedreven regels (bijv. BSN in bulk) of afwijkende scopes.", "Alles start in simulatiemodus; plan een evaluatiemoment na 1–2 weken."],
    pitfalls: ["Labels als conditie in Teams-chat werken niet – koppel SIT’s.", "‘Block everyone’ op Delen sluit ook interne collega’s uit.", "Overrides zonder policy tips: de gebruiker ziet de override-optie dan niet."],
    links: ["dlp", "dlpDesign", "dlpCreate"],
  },
  done: (st) => Generator.all(st).dlpPolicies.length > 0,
  after(main) { VH.ovf(main); },
  render() {
    const st = S();
    if (!st.labels.length && !(st.customDlp || []).length) return pageHead("Workshop 2 · DLP", "Data Loss Prevention", "Wat mag níet gebeuren met gevoelige informatie?") + VH.needLabels();
    const tab = DLP_TABS.some((t) => t[0] === UI.dlpTab) ? UI.dlpTab : "matrix";
    const g = Generator.all(st);
    const nRules = sum(g.dlpPolicies.map((p) => p.rules.length));
    const tabs = `<div class="tabs mb-2" role="tablist" aria-label="Onderdelen DLP">${DLP_TABS.map(([k, t, ic]) => `<button class="tab${tab === k ? " on" : ""}" role="tab" aria-selected="${tab === k ? "true" : "false"}" data-action="dlp-tab" data-tab="${esc(k)}">${icon(ic, "s")} ${esc(t)}${k === "editor" && (st.customDlp || []).length ? ` <span class="badge neutral">${st.customDlp.length}</span>` : ""}</button>`).join("")}</div>`;
    const more = `<p>Kies per label en per locatie (e-mail, delen, Teams, apparaten, Copilot) wat DLP doet: alleen inzicht, een melding, blokkeren met override of blokkeren. Daaruit ontstaan automatisch de DLP-policies (tabblad <b>Policies</b>); die volgen het ontwerpbord.</p><p>Voor regels op basis van gevoelige informatietypen (bijv. BSN in bulk) of een afwijkende scope bouw je een <b>maatwerk-policy</b>, stap voor stap zoals in de Purview-wizard. Alles start in simulatiemodus.</p><p>${learn("dlpLabelCondition", "Labels als DLP-conditie")}</p>`;
    return VH.wrap(`${pageHead("Workshop 2 · DLP", "Data Loss Prevention", "Wat mag níet gebeuren met gevoelige informatie?", `<span class="badge neutral">${plural(g.dlpPolicies.length, "policy", "policies")} · ${plural(nRules, "regel", "regels")}</span><button class="btn" data-action="go" data-route="endpoint">${icon("laptop", "s")} Endpoint</button><button class="btn" data-action="go" data-route="copilot">${icon("sparkle", "s")} Copilot</button>`, more)}
      ${tabs}${this["tab_" + tab](st, g)}`);
  },

  tab_matrix(st, g) {
    const ls = applicableLabels(st);
    if (!ls.length) return VH.needLabels();
    const rows = BoardUtil.rows(st).filter((r) => r.dlp || r.key === "notify");
    const mono = BoardUtil.monoMap(st);
    const dom = rows.some((r) => r.key === UI.dlpDom) ? UI.dlpDom : rows[0].key;
    const row = BoardUtil.rowByKey(dom);
    const covCol = (l) => { const n = rows.filter((r) => l.choices[r.key] || Mapping.isCustom(l, r.key)).length; return Math.round((n / rows.length) * 100); };
    const head = `<tr><th class="corner"><div class="small muted">Label →<br>Locatie ↓</div></th>${ls.map((l) => { const p = l.parentId ? labelById(l.parentId, st) : null; return `<th class="lbl-head" style="--lc:${esc(l.color)}" title="${esc(labelFullName(l, st))}"><div class="lbl-bar"></div><div class="lbl-inner"><div class="lbl-parent">${p ? esc(p.displayName || p.name) : "&nbsp;"}</div><div class="lbl-name">${esc(l.displayName || l.name)}</div><div title="Ingevuld">${meter(covCol(l), "brand")}</div></div></th>`; }).join("")}</tr>`;
    const optRows = CATALOG.boardRows.filter((r) => r.optional && r.dlp);
    const optUsed = optRows.filter((r) => ls.some((l) => l.choices[r.key] && !/-off$/.test(l.choices[r.key]))).length;
    const body = rows.map((r) => {
      const rowDrop = ` data-drop="choice" data-zone="board-row" data-target='${attr({ domain: r.key })}'`;
      return `<tr><th class="${dom === r.key ? "sel" : ""}"${rowDrop} data-action="dlp-dom" data-dom="${esc(r.key)}" style="cursor:pointer" tabindex="0" data-vb-key="1"><div class="dom-title">${icon(r.icon, "s")}${esc(r.name)}${r.lic ? " " + licBadge(r.lic) : ""}</div><div class="dom-desc">${esc(r.sub || "")}</div></th>${ls.map((l) => BoardUtil.cell(l, r, st, mono)).join("")}</tr>`;
    }).join("");
    const palette = `<div class="card flat" style="padding:12px"><div class="field-label">${icon(row.icon, "s")} ${esc(row.name)} ${infoTip((row.desc ? row.desc + " " : "") + "Sleep een kaart op een cel, of op de rijkop voor alle labels. Klik een rijkop om van locatie te wisselen.")}</div>
      <div class="choice-palette lib-scroll" style="max-height:calc(100vh - 300px)">${CATALOG.choicesFor(dom).map((c) => BoardUtil.choiceCard(c)).join("")}</div></div>`;
    const optTip = `${optRows.map((r) => r.name).join(", ")}. Locaties die al in gebruik zijn, blijven altijd zichtbaar.`;
    return `<div class="row mb-2"><span class="small muted">Optionele locaties ${optUsed}/${optRows.length} ${infoTip(optTip)}</span><button class="chip sm${UI.boardOptional ? " on" : ""}" style="cursor:pointer" data-action="board-optional" aria-pressed="${UI.boardOptional ? "true" : "false"}">${icon(UI.boardOptional ? "x" : "plus", "s")}${UI.boardOptional ? "Ongebruikte verbergen" : "Alle tonen"}</button><span class="spacer"></span></div>
      <div class="board-layout"><div class="vb-ovf"><div class="board-wrap vb-ovf-scroll" tabindex="0" role="region" aria-label="DLP-matrix: labels × locaties"><table class="board"><thead>${head}</thead><tbody>${body}</tbody></table></div><span class="vb-ovf-hint" aria-hidden="true">→ meer labels</span></div><div class="sticky">${palette}</div></div>
      ${this.refine(st, row, ls)}`;
  },

  refine(st, row, ls) {
    if (row.key === "notify") return `<div class="card mt-2"><h4 class="mt-0">${icon("bell")} Verfijnen</h4><p class="small mb-0">Meldingen per label stel je in op het tabblad <a href="#" data-action="dlp-tab" data-tab="notify">Meldingen & incidenten</a>.</p></div>`;
    const d = row.dlp;
    if (d === "endpoint" || d === "copilot") return `<div class="card mt-2 row"><span>${icon(row.icon)} Details voor ${esc(row.name)} stel je in op de eigen pagina.</span><span class="spacer"></span><button class="btn" data-action="go" data-route="${esc(d)}">${icon(row.icon, "s")} Naar ${esc(row.name)}</button></div>`;
    const scopes = DLP_DOM_SCOPES[d];
    const isMail = d === "exchange";
    const partnerDoms = isMail ? unique((st.groups || []).filter((g) => g.kind === "domain").flatMap((g) => String(g.value || "").split(/[\s,;]+/)).filter(Boolean)) : [];
    const pex = (st.dlpSettings && st.dlpSettings.partnerException) || {};
    let nRules = 0, nCustom = 0;
    const tr = ls.map((l) => {
      const v = l.cfg.dlp[d] || {}, b = `lbl:${l.id}:cfg.dlp.${d}`, nm = labelFullName(l, st);
      const r = Generator.ruleFor(l, d, st);
      if (r) nRules++;
      if (Mapping.isCustom(l, row.key)) nCustom++;
      return `<tr><td>${labelPill(l, st)}</td>
        <td class="vb-selcell">${VH.aria(F.select(`${b}.action`, "", DLP_DOM_ACTIONS[d].map((a) => [a, DLP_ACTION_LABEL(d, a)]), { cls: "mb-0" }), `Actie voor ${nm}`)}</td>
        ${scopes ? `<td class="vb-selcell">${v.action && v.action !== "off" ? VH.aria(F.select(`${b}.scope`, "", scopes, { cls: "mb-0" }), `Bereik voor ${nm}`) : `<span class="muted xs">–</span>`}</td>` : ""}
        ${d === "exchange" ? `<td class="vb-selcell">${v.action === "encrypt" ? VH.aria(F.select(`${b}.template`, "", [["Encrypt", "Encrypt"], ["Do Not Forward", "Do Not Forward"]], { cls: "mb-0" }), `Encryptie voor ${nm}`) : `<span class="muted xs">–</span>`}</td>
        <td>${v.action && v.action !== "off" && v.action !== "audit" ? VH.aria(F.check(`st:dlpSettings.partnerException.${l.id}`, ""), `Uitzondering ketenpartners voor ${nm}`) : pex[l.id] ? `<span class="xs muted">(aan, geen effect)</span>` : `<span class="muted xs">–</span>`}</td>` : ""}
        <td class="small vb-result">${r ? (r.effective ? VH.clamp(`<span class="muted">${esc(r.desc)}</span>`, (r.desc || "").length, 2, 90) : `<span class="badge err">Geen conditie</span>`) : `<span class="muted xs">Geen regel</span>`}</td></tr>`;
    }).join("");
    const sumTxt = `${icon(row.icon, "s")} Verfijnen: ${esc(row.name)} <span class="xs muted">· ${plural(nRules, "regel", "regels")}${nCustom ? ` · ${nCustom} aangepast` : ""}${isMail && Object.values(pex).some(Boolean) ? ` · ketenpartners uitgezonderd` : ""}</span>`;
    const pexInfo = isMail ? `<p class="small mt-0">${icon("globe", "s")} <b>Uitzondering: ketenpartners</b> ${infoTip("Mail naar deze domeinen wordt niet geblokkeerd, wel gelogd. In Purview: exception ‘Recipient domain is’ op de e-mailregel van het label.")} – ${partnerDoms.length ? `partnerdomeinen: <b>${esc(partnerDoms.join(", "))}</b>` : `<span class="muted">nog geen partnerdomeinen; voeg bij <a href="#" data-action="go" data-route="policies">Labelbeleid</a> een doelgroep van het type ‘domein’ toe.</span>`}</p>` : "";
    return `<div class="mt-2">${accordion(`dlp-refine-${d}`, sumTxt, `<p class="small muted mt-0">Per label de actie en het bereik fijnslijpen. Wijzigingen hier markeren de cel als ‘aangepast’.</p>${pexInfo}
      <div class="table-wrap"><table class="table vb-refine"><thead><tr><th>Label</th><th>Actie</th>${scopes ? "<th>Bereik</th>" : ""}${isMail ? `<th>Encryptie</th><th title="Mail naar deze domeinen wordt niet geblokkeerd, wel gelogd.">Ketenpartners uitzonderen</th>` : ""}<th>Resulterende regel</th></tr></thead><tbody>${tr}</tbody></table></div>`)}</div>`;
  },

  tab_policies(st, g) {
    const ds = st.dlpSettings;
    const nRules = sum(g.dlpPolicies.map((p) => p.rules.length));
    const settings = (p) => {
      if (p.custom) return `<div class="mt-1"><button class="btn small" data-action="cdlp-sel" data-id="${esc(p.id)}">${icon("edit", "s")} Bewerken in wizard</button></div>`;
      if (/-sim$/.test(p.id)) return "";
      return p.domains.map((dk) => {
        const dom = CATALOG.dlpDomains.find((x) => x.key === dk), b = `st:dlpSettings.perLocation.${dk}`;
        const au = dom.locations.every((x) => CATALOG.dlpAdminUnitLocations.includes(x));
        const pl = (ds.perLocation || {})[dk];
        return `<details class="acc mt-1" data-acc="dlp-pl-${esc(dk)}"><summary>${icon("settings", "s")} Instellingen ${esc(dom.name)}${pl && Object.keys(pl).length ? ` <span class="badge info">aangepast</span>` : ""}</summary><div class="acc-body">
          <div class="grid-2">${F.text(`${b}.name`, "Policy name", { maxlength: 64, ph: `${ds.namingPrefix ? ds.namingPrefix + " – " : ""}${dom.name}`, hint: p.merged ? "Bij samengevoegde policies bepaalt de tool de naam." : "" })}
          ${F.select(`${b}.mode`, "Policy mode", [["", `Standaard (${VH.modeName(ds.mode)})`], ...CATALOG.dlpModes.map((m) => [m.key, m.name])])}</div>
          ${VH.incExc(`${b}.include`, `${b}.exclude`, { incLabel: "Include (scope)", incPh: "Alle (leeg) of: groep1, groep2", incHint: esc(dom.locations.map((k) => VH.loc(k).include).join(" / ")), excPh: "Bijv. sg-dlp-uitzondering" })}
          ${au ? F.text(`${b}.adminUnits`, "Admin units (overschrijft de standaard)", { type: "csv", ph: "Leeg = standaard / volledige directory" }) : `<div class="xs muted">Admin units worden voor deze locatie niet ondersteund.</div>`}
          <button class="btn small subtle" data-action="dlp-pl-reset" data-dom="${esc(dk)}">${icon("undo", "s")} Standaard herstellen</button></div></details>`;
      }).join("");
    };
    const list = g.dlpPolicies.length ? `<div class="vb-acc-list">${g.dlpPolicies.map((p) => VH.policyAcc(`dlp-pol-${p.id}`, p, st, { after: settings(p) })).join("")}</div>` : emptyState("shield", "Nog geen DLP-policies", "Kies DLP-kaarten in de matrix of op het ontwerpbord, of maak een maatwerk-policy.", `<button class="btn primary" data-action="dlp-tab" data-tab="matrix">${icon("grid", "s")} Naar de matrix</button>`);
    return `<div class="split wide-left vb-split"><div><p class="small muted mt-0">${plural(g.dlpPolicies.length, "policy", "policies")} – klik er een open voor de regels en instellingen.</p>${list}</div><div>
      <div class="card mb-2"><h4 class="mt-0">${icon("sliders")} Strategie</h4>
        ${F.radios("st:dlpSettings.mode", "Standaard policy mode", CATALOG.dlpModes.map((m) => [m.key, m.name, esc(m.desc)]))}
        ${F.check("st:dlpSettings.includeSitsForUnlabeled", "Ook ongelabelde inhoud: SIT’s van het label als extra conditie", { desc: "De regel per label matcht het label óf de gekoppelde informatietypen." })}
        ${accordion("dlp-tech", `${icon("code", "s")} Technische details`, `${F.text("st:dlpSettings.namingPrefix", "Naamprefix", { ph: "DLP", maxlength: 20 })}
          ${F.check("st:dlpSettings.mergeIdentical", "Identieke locaties samenvoegen in één policy", { desc: "E-mail, Delen en Teams met exact dezelfde keuzes worden één policy met meerdere locaties." })}
          ${F.text("st:dlpSettings.adminUnits", "Admin units (standaard)", { type: "csv", ph: "Leeg = volledige directory", hint: "Alleen voor Exchange, SharePoint, OneDrive, Teams en Devices." })}`)}</div>
      <div class="card mb-2"><h4 class="mt-0">${icon("layers")} Nieuwe policy vanuit template ${infoTip(CATALOG.dlpTemplateNote)}</h4>
        ${CATALOG.dlpTemplates.map((t) => `<button class="btn w-100 mb-1 vb-btn-wrap" data-action="cdlp-add" data-tpl="${esc(t.key)}" title="${esc(t.desc)}">${icon("plus", "s")} ${esc(t.name)}</button>`).join("")}</div>
      ${accordion("dlp-limits", `${icon("info", "s")} Limieten <span class="xs muted">· ${nRules} van max. 600 regels</span>`, `<div class="mb-1">${meter(Math.min(100, (nRules / 600) * 100), nRules > 600 ? "err" : "brand")}<div class="xs muted">${nRules} van max. 600 DLP-regels per tenant</div></div>
        <ul class="small">${CATALOG.dlpLimits.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`, nRules > 600)}
    </div></div>`;
  },

  tab_notify(st) {
    const ls = applicableLabels(st);
    if (!ls.length) return VH.needLabels();
    const tr = ls.map((l) => {
      const b = `lbl:${l.id}:cfg.notify`, n = l.cfg.notify, nm = labelFullName(l, st);
      const any = Object.keys(l.cfg.dlp).some((k) => (l.cfg.dlp[k] || {}).action && l.cfg.dlp[k].action !== "off");
      return `<tr${any ? "" : ` style="opacity:.6" title="Geen DLP-regels voor dit label"`}><td>${labelPill(l, st)}</td>
        <td>${VH.aria(F.check(`${b}.tip`, ""), `Policy tip voor ${nm}`)}</td>
        <td style="min-width:220px">${n.tip ? VH.aria(F.text(`${b}.tipText`, "", { ph: Generator.tipText({}, nm), cls: "mb-0" }), `Tekst policy tip voor ${nm}`) : `<span class="muted xs">–</span>`}</td>
        <td>${VH.aria(F.check(`${b}.emailUser`, ""), `E-mail aan gebruiker voor ${nm}`)}</td>
        <td class="vb-selcell">${VH.aria(F.select(`${b}.override`, "", CATALOG.overrideOptions.map(([k, t]) => [k, k === "none" ? t : { justification: "Met justificatie", fp: "False positive melden", allow: "Zonder justificatie" }[k]]), { cls: "mb-0" }), `Override voor ${nm}`)}</td>
        <td class="vb-selcell">${VH.aria(F.select(`${b}.alert`, "", [["none", "Geen"], ["every", "Elke match"], ["threshold", "Bij drempel"]], { cls: "mb-0" }), `Alert voor ${nm}`)}</td>
        <td class="vb-selcell">${VH.aria(F.select(`${b}.severity`, "", CATALOG.severities, { cls: "mb-0" }), `Severity voor ${nm}`)}</td>
        <td>${VH.aria(F.check(`${b}.incidentReport`, ""), `Incident report voor ${nm}`)}</td></tr>`;
    }).join("");
    const needRcpt = ls.some((l) => (l.cfg.notify.alert && l.cfg.notify.alert !== "none") || l.cfg.notify.incidentReport) || (st.customDlp || []).some((c) => (c.rules || []).some((r) => (r.alert && r.alert !== "none") || r.incidentReport));
    const rcpt = `<div class="card mb-2 vb-rcpt">${F.text("st:dlpSettings.alertRecipients", `${icon("mail", "s")} Ontvangers DLP-alerts en incident reports`, { ph: "Bijv. privacy@organisatie.nl; soc@organisatie.nl", hint: "Wie beoordeelt een mogelijk datalek? Denk aan FG/privacy-officer en SOC. Gebruikt voor alle alerts en incident reports in het script." })}
      ${needRcpt && !_dlpAlertTo(st) ? msg("warn", "Er staan alerts of incident reports aan, maar nog zonder ontvangers. Een mogelijk datalek wordt dan niet gemeld bij FG of SOC.") : ""}</div>`;
    return `${rcpt}<div class="card mb-2"><p class="small mt-0">Wat ziet de gebruiker, en wie krijgt een melding? Geldt voor alle DLP-regels van het label. ${infoTip("Override is alleen actief bij de DLP-keuze ‘Blokkeren met override’ en vereist policy tips. Copilot-regels hebben geen policy tips.")}</p>
        <div class="table-wrap"><table class="table"><thead><tr><th>Label</th><th title="User notifications">Policy tip</th><th>Tekst policy tip</th><th title="Notify the user with an email">E-mail</th><th>Override</th><th title="Use email incident reports / alerts">Alert</th><th>Severity</th><th title="Send an incident report to the admin">Incident report</th></tr></thead><tbody>${tr}</tbody></table></div></div>
      ${accordion("dlp-notify-info", `${icon("mail", "s")} Wat staat er in een incident report, en wie krijgt e-mail?`, `<div class="grid grid-2"><div><h4 class="mt-0">Incident report bevat</h4><ul class="small">${CATALOG.incidentReportContent.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
        <div><h4 class="mt-0">Ontvangers e-mailnotificatie</h4><ul class="small">${CATALOG.notifyRecipients.map(([, t]) => `<li>${esc(t)}</li>`).join("")}</ul><p class="small mb-0">Alerts en incident reports gaan naar: <b>${_dlpAlertTo(st) ? esc(_dlpAlertTo(st)) : "nog niet ingevuld (zie boven)"}</b></p></div></div><div class="xs">${learn("dlpTips", "Policy tips")} · ${learn("dlpAlerts", "DLP-alerts")}</div>`)}`;
  },

  tab_editor(st) {
    const list = st.customDlp || [];
    const c = CdlpUI.cur(st);
    const side = `<div class="card flat mb-2" style="padding:10px"><div class="row between mb-1"><b>Maatwerk-policies</b><button class="btn small primary" data-action="cdlp-add" data-tpl="custom">${icon("plus", "s")} Nieuw</button></div>
      ${list.length ? list.map((p) => `<div class="rule-row${c && c.id === p.id ? " vb-rr-sel" : ""}"><button type="button" class="rr-main vb-rr-btn" data-action="cdlp-sel" data-id="${esc(p.id)}" aria-pressed="${c && c.id === p.id ? "true" : "false"}" aria-label="${esc(p.name)} bewerken"><b class="small">${esc(p.name)}</b><span class="row tight mt-1">${VH.locIcons(p.locations)}${VH.modeBadge(p.mode)}</span></button></div>`).join("") : `<p class="xs muted">Nog geen maatwerk-policies.</p>`}
      <div class="divider"></div><div class="xs muted mb-1">Vanuit template ${infoTip(CATALOG.dlpTemplateNote)}</div>${CATALOG.dlpTemplates.filter((t) => t.key !== "custom").map((t) => `<button class="btn small w-100 mb-1 vb-btn-wrap" data-action="cdlp-add" data-tpl="${esc(t.key)}" title="${esc(t.desc)}">${icon("layers", "s")} ${esc(t.name)}</button>`).join("")}</div>`;
    const palette = `<div class="card flat" style="padding:10px"><div class="field-label">${icon("tag", "s")} Labels</div><div class="chip-list mb-2">${orderedLabels(st).map((l) => `<span class="chip" style="cursor:grab" data-drag="pub-label" data-tap="1" data-pick-label="${esc(labelFullName(l, st))}" data-payload="${attr({ labelId: l.id })}"><span class="color-dot" style="background:${esc(l.color)}"></span>${esc(l.parentId ? "↳ " + labelShortName(l) : labelShortName(l))}</span>`).join("") || `<span class="xs muted">Geen labels</span>`}</div>
      <div class="field-label">${icon("search", "s")} Informatietypen ${infoTip("Sleep een label of informatietype naar ‘Content contains’ van de geselecteerde regel.")}</div><div class="chip-list lib-scroll" style="max-height:40vh">${st.sits.map((s) => `<span data-drag="sit" data-tap="1" data-pick-label="${esc(s.name)}" data-payload="${attr({ sitId: s.id })}" style="cursor:grab">${VH.sitChip(s)}</span>`).join("") || `<span class="xs muted">Nog geen informatietypen – zie Informatietypen.</span>`}</div></div>`;
    const main = c ? this.wizard(c, st) : emptyState("edit", "Nog geen maatwerk-policy", "Maak een policy vanaf nul of vanuit een template. Afgeleide policies van het ontwerpbord staan onder ‘Policies’.", `<button class="btn primary" data-action="cdlp-add" data-tpl="custom">${icon("plus", "s")} Nieuwe policy</button>`);
    return `<div class="vb-editor"><div class="vb-ed-side">${side}</div><div class="vb-ed-main">${main}</div><div class="sticky vb-ed-pal">${palette}</div></div>`;
  },

  wizard(c, st) {
    const id = c.id, b = `cdlp:${id}:`, locs = c.locations || [];
    const isCop = locs.includes("copilot");
    const au = locs.length && locs.every((x) => CATALOG.dlpAdminUnitLocations.includes(x));
    const onlyCustom = locs.some((x) => ["copilot", "fabric", "instances"].includes(x));
    const step = (n, title, html, extra = "") => `<div class="card mb-2"><div class="row tight mb-1"><span class="prio-num">${n}</span><h4 class="mt-0 mb-0">${esc(title)}</h4>${extra}</div>${html}</div>`;
    const iss = CdlpUI.issues(c, st);
    const ri = Math.max(0, Math.min(UI.dlpRule || 0, c.rules.length - 1));
    const eid = esc(id);
    const rules = c.rules.map((r, i) => `<div class="rule-row${i === ri ? " vb-rr-sel" : ""}"><span class="prio-num">${i + 1}</span><button type="button" class="rr-main vb-rr-btn" data-action="cdlp-rule-sel" data-id="${eid}" data-rule="${i}" aria-pressed="${i === ri ? "true" : "false"}" aria-label="Regel ${i + 1}: ${esc(r.name)} bewerken"><b class="small">${esc(r.name)}</b><span class="xs muted vb-block">${plural((r.labels || []).length, "label", "labels")} · ${plural((r.sits || []).length, "informatietype", "informatietypen")} · ${esc((CdlpUI.actionOptions(locs).find((x) => x[0] === r.action) || [, r.action])[1])}</span></button>
      <button class="icon-btn small" data-action="cdlp-rule-move" data-id="${eid}" data-rule="${i}" data-dir="-1" title="Hoger" aria-label="Regel ${i + 1} hoger"${i === 0 ? " disabled" : ""}>↑</button><button class="icon-btn small" data-action="cdlp-rule-move" data-id="${eid}" data-rule="${i}" data-dir="1" title="Lager" aria-label="Regel ${i + 1} lager"${i === c.rules.length - 1 ? " disabled" : ""}>↓</button><button class="icon-btn small" data-action="cdlp-rule-del" data-id="${eid}" data-rule="${i}" title="Verwijderen" aria-label="Regel ${i + 1} verwijderen">${icon("trash", "s")}</button></div>`).join("");
    const preview = VH.policyCard(Generator.customPolicy(c, st), st, { full: true });
    return `<div class="row mb-2"><h3 class="mt-0 mb-0">${esc(c.name)}</h3><span class="spacer"></span><button class="btn small" data-action="cdlp-dup" data-id="${eid}">${icon("copy", "s")} Dupliceren</button><button class="btn small danger" data-action="cdlp-del" data-id="${eid}">${icon("trash", "s")} Verwijderen</button></div>
      ${iss.length ? `<div class="mb-2">${iss.map((x) => msg(x.level, `<b>${esc(x.title)}</b> – ${esc(x.desc)}`)).join("")}</div>` : ""}
      ${step(1, "Template", `${F.radios(`${b}template`, "", CATALOG.dlpTemplates.map((t) => [t.key, t.name, esc(t.desc)]), { cards: true })}${onlyCustom && c.template !== "custom" ? msg("err", "Copilot, Fabric/Power BI en cloud-apps ondersteunen alleen de Custom-template.") : ""}`, infoTip(CATALOG.dlpTemplateNote))}
      ${step(2, "Name your DLP policy", `${F.text(`${b}name`, "Name", { maxlength: 64 })}${F.textarea(`${b}desc`, "Description", { rows: 2 })}`)}
      ${step(3, "Assign admin units", au ? F.text(`${b}adminUnits`, "Admin units", { type: "csv", ph: "Leeg = Full directory" }) : `<p class="small muted">${locs.length ? "De gekozen locaties ondersteunen geen admin units; de policy geldt voor de volledige directory." : "Kies eerst locaties."}</p>`)}
      ${step(4, "Choose where to apply the policy", `<div class="grid grid-2 vb-locs">${CATALOG.dlpLocations.map((l) => `<label class="check"><input type="checkbox" data-action="cdlp-loc" data-id="${eid}" data-loc="${esc(l.key)}"${locs.includes(l.key) ? " checked" : ""}><span>${icon(l.icon, "s")} ${esc(l.name)} ${licBadge(l.lic)}${l.preview ? " " + previewBadge() : ""}${l.retiring ? `<span class="c-desc">${esc(l.retiring)}</span>` : ""}</span></label>`).join("")}</div>
        ${locs.length ? `<div class="mt-1">${VH.incExc(`${b}include`, `${b}exclude`, { incHint: esc(locs.map((k) => VH.loc(k).include).join(" / ")) })}</div>` : ""}
        ${isCop ? msg("info", esc(CATALOG.copilot.notes[0])) : ""}`, infoTip("Copilot en Fabric/Power BI staan altijd alleen in een policy. Bij een wijziging die bestaande regels raakt, vraagt de tool eerst om bevestiging."))}
      ${step(5, "Customize advanced DLP rules", `${rules || `<p class="small muted">Nog geen regels.</p>`}<button class="btn small mt-1" data-action="cdlp-rule-add" data-id="${eid}">${icon("plus", "s")} Create rule</button>
        ${c.rules[ri] ? `<div class="divider"></div>${this.ruleEditor(c, ri, st)}` : ""}`)}
      ${step(6, "Policy mode", F.radios(`${b}mode`, "", CATALOG.dlpModes.map((m) => [m.key, m.name, esc(m.desc)]), { cards: true }))}
      ${accordion("cdlp-preview", `${icon("eye", "s")} Resultaat (zoals het in Purview komt te staan)`, preview)}`;
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
      return `<div class="field-label mt-1">${title}</div>${items}${opts.length ? `<select class="select" style="max-width:320px" aria-label="${esc(title)}: conditie toevoegen" ${da} data-list="${esc(list)}" data-live="cdlp-xadd"><option value="">+ Add condition…</option>${opts.map((d) => `<option value="${esc(d.key)}">${esc(d.name)}</option>`).join("")}</select>` : `<div class="xs muted">${locs.length ? "Geen aanvullende condities voor deze combinatie van locaties." : "Kies eerst locaties."}</div>`}${exHint}`;
    };
    const epGrid = locs.includes("devices") && r.action === "custom" ? `<div class="field-label mt-1">Audit or restrict activities on devices</div><div class="table-wrap"><table class="table"><tbody>${CATALOG.endpointActivities.map((a) => `<tr><td>${icon(a.icon, "s")} ${esc(a.name)}</td><td style="width:200px">${VH.aria(F.select(`${b}endpoint.${a.key}`, "", CATALOG.endpointLevels.map(([k, t]) => [k, t]), { cls: "mb-0" }), a.name)}</td></tr>`).join("")}</tbody></table></div>` : "";
    const anyMax = r.maxCount === "any" || r.maxCount === "" || r.maxCount == null;
    const minN = Number(r.minCount), maxN = Number(r.maxCount);
    const cntErr = !Number.isInteger(minN) || minN < 1 ? "‘From’ moet een heel getal van 1 of hoger zijn."
      : !anyMax && (!Number.isInteger(maxN) || maxN < 1) ? "‘To’ moet een heel getal van 1 of hoger zijn, of kies ‘Any’."
      : !anyMax && minN > maxN ? `‘From’ (${minN}) is groter dan ‘To’ (${maxN}); de regel matcht dan nooit.` : "";
    const counts = `<div class="vb-count mt-1"><div class="field-label">Instance count ${infoTip("Hoe vaak het informatietype in één item moet voorkomen. Templates gebruiken 1–9 (low volume) en 10–any (high volume).")}</div>
      <div class="row tight">${VH.aria(F.number(`${b}minCount`, "", { min: 1, max: 500, inline: true }), "Instance count – from")}<span class="small">to</span>
      ${anyMax ? "" : VH.aria(F.number(`${b}maxCount`, "", { min: 1, max: 500, inline: true }), "Instance count – to")}
      <label class="check"><input type="checkbox" data-action="cdlp-maxany" ${da}${anyMax ? " checked" : ""}><span>Any (geen maximum)</span></label></div>
      ${cntErr ? `<div class="vb-err" role="alert">${icon("xcircle", "s")} ${esc(cntErr)}</div>` : ""}</div>`;
    return `<h4 class="mt-0">${icon("edit", "s")} Regel ${i + 1}</h4>
      ${F.text(`${b}name`, "Name", { maxlength: 64 })}
      <div class="section-title">Conditions</div>
      <div class="cond-group" data-drop="pub-label sit" data-zone="cdlp-cond" data-target='${attr({ policyId: id, ruleId: r.id })}'>
        <div class="row tight"><span class="op-pill">Content contains</span><span class="spacer"></span>${addSel}</div>
        <div class="chip-list mt-1">${chipsL}${chipsS}${chipsL || chipsS ? "" : `<span class="drop-hint">Sleep labels of informatietypen hierheen</span>`}</div>
        ${(r.sits || []).length && !isCop ? counts : ""}
        ${(r.labels || []).length && locs.includes("teams") ? msg("warn", "Teams chat- en kanaalberichten ondersteunen geen labels als conditie; de label-conditie werkt alleen voor de overige locaties.") : ""}
      </div>
      ${isCop ? F.radios(`${b}copilotAction`, "Copilot-regeltype", [["prompts", "Prompts met SIT’s niet verwerken (Processing prompts)", "", previewBadge()], ["web", "Prompts met SIT’s niet naar web search (Performing web searches)"], ["external", "E-mail van externe afzenders niet gebruiken", "", previewBadge()]]) + `<p class="xs muted">Met een label-conditie wordt de regel automatisch ‘Prevent Copilot from processing content’ voor gelabelde bestanden en e-mails.</p>` : ""}
      ${conds.some((x) => x.key === "accessScope") ? F.select(`${b}accessScope`, "Content is shared from Microsoft 365", [["", "(geen voorwaarde)"], ...conds.find((x) => x.key === "accessScope").options]) : ""}
      ${isCop ? "" : xlist("extra", "AND – aanvullende condities")}
      ${isCop ? "" : xlist("exceptions", "Exceptions (NOT)")}
      <div class="section-title">Actions</div>
      ${F.select(`${b}action`, "Actie", acts, { onchange: "cdlp-action" })}
      ${["override", "block"].includes(r.action) && m365 ? F.select(`${b}scope`, "Restrict access", CdlpUI.scopeOptions(locs)) : ""}
      ${r.action === "encrypt" ? F.select(`${b}template`, "Encryption", [["Encrypt", "Encrypt"], ["Do Not Forward", "Do Not Forward"]]) : ""}
      ${epGrid}
      ${isCop ? "" : `<div class="section-title">User notifications</div>
        ${F.check(`${b}tip`, "Notify users with a policy tip", { disabled: r.action === "override" })}
        ${r.tip ? F.textarea(`${b}tipText`, "Policy tip-tekst", { rows: 2, ph: CATALOG.notifyTipDefault.replace("${label}", "…") }) : ""}
        ${F.check(`${b}emailUser`, "Notify the user with an email")}
        ${r.action === "override" ? `<div class="section-title">User overrides</div>${F.select(`${b}override`, "Override", CATALOG.overrideOptions.filter(([k]) => k !== "none"))}` : ""}`}
      <div class="section-title">Incident reports</div>
      <div class="grid-2">${F.select(`${b}severity`, "Severity level", CATALOG.severities)}${F.select(`${b}alert`, "Alerts", CATALOG.alertOptions)}</div>
      ${r.alert === "threshold" ? `<div class="grid-2">${F.number(`${b}alertCount`, "Aantal activiteiten", { min: 1 })}${F.number(`${b}alertMinutes`, "Tijdvenster (minuten)", { min: 1 })}</div>` : ""}
      ${F.check(`${b}incidentReport`, "Send an incident report to the admin", { desc: _dlpAlertTo(st) ? `Naar: ${esc(_dlpAlertTo(st))}` : `Ontvangers nog niet ingevuld – zie <a href="#" data-action="dlp-tab" data-tab="notify">Meldingen & incidenten</a>.` })}
      <div class="section-title">Additional options</div>
      ${F.check(`${b}stop`, "If there's a match for this rule, stop processing additional DLP policies and rules", { desc: "Werkt niet in simulatiemodus." })}`;
  },
});
