/* Mapping: keuzekaarten op het Integraal Ontwerpbord ↔ exacte label-/DLP-instellingen.
   Schrijffuncties muteren de meegegeven state (aanroepen binnen Store.update). */
const MONOTONIC_DOMAINS = ["marking", "encryption", "dlp_exchange", "dlp_sharing", "dlp_teams", "dlp_endpoint", "dlp_copilot", "notify"];

const Mapping = {
  /* ---------- Schrijven ---------- */
  apply(st, labelId, choiceId) {
    const l = labelById(labelId, st);
    const c = CATALOG.choiceById[choiceId];
    if (!l || !c) return false;
    if (hasChildren(l, st)) return false;
    c.apply(l, st);
    l.choices[c.d] = c.id;
    if (l.custom) delete l.custom[c.d];
    this.afterApply(st, l, c.d, c.id);
    return true;
  },
  afterApply(st, l, d, id) {
    if (id === "ct-none") l.cfg.scope.sites = false;
    if (id === "mt-none") l.cfg.scope.meetings = false;
    if (d === "meetings" && l.cfg.scope.meetings) { l.cfg.scope.files = true; l.cfg.scope.emails = true; }
    if (d === "publish") Generator.ensureGroupPolicies(st);
  },
  applyRow(st, domain, choiceId) {
    let n = 0;
    applicableLabels(st).forEach((l) => { if (this.apply(st, l.id, choiceId)) n++; });
    return n;
  },
  applyProfile(st, labelId, profileId) {
    const l = labelById(labelId, st);
    const pf = CATALOG.profiles.find((p) => p.id === profileId);
    if (!l || !pf || hasChildren(l, st)) return false;
    CATALOG.boardRows.filter((r) => r.kind === "choice").forEach((r) => { if (pf.choices[r.key]) this.apply(st, l.id, pf.choices[r.key]); });
    if (!l.color || l.color === "#0F6CBD") l.color = pf.color;
    l.profile = pf.id;
    return true;
  },
  clear(st, labelId, domain) {
    const l = labelById(labelId, st);
    if (!l) return;
    delete l.choices[domain];
    if (l.custom) delete l.custom[domain];
  },

  /* ---------- Lezen ---------- */
  choice(l, d) { return (l && l.choices && CATALOG.choiceById[l.choices[d]]) || null; },
  level(l, d) { const c = this.choice(l, d); return c ? c.lv : null; },
  isCustom(l, d) { return !!(l && l.custom && l.custom[d]); },
  strictness(l) {
    const lv = CATALOG.boardRows.filter((r) => r.kind === "choice").map((r) => this.level(l, r.key)).filter((x) => x != null);
    return lv.length ? sum(lv) / lv.length : 0;
  },
  friction(l) {
    return sum(CATALOG.boardRows.filter((r) => r.kind === "choice").map((r) => { const c = this.choice(l, r.key); return c ? c.fr : 0; }));
  },
  frictionLabel(score) {
    if (score <= 3) return { t: "Laag", cls: "ok" };
    if (score <= 8) return { t: "Middel", cls: "warn" };
    return { t: "Hoog", cls: "err" };
  },
  coverage(st = S()) {
    const rows = CATALOG.boardRows.filter((r) => r.kind === "choice" && !r.optional);
    const ls = applicableLabels(st);
    const total = rows.length * ls.length;
    let done = 0;
    ls.forEach((l) => rows.forEach((r) => { if (l.choices[r.key] || this.isCustom(l, r.key)) done++; }));
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  },
  /** Een label hoort niet minder streng te zijn dan een minder gevoelig label (siblings onderling mogen afwijken). */
  monotonicIssues(st = S()) {
    const ls = applicableLabels(st);
    const out = [];
    MONOTONIC_DOMAINS.forEach((d) => {
      ls.forEach((l, i) => {
        const lv = this.level(l, d);
        if (lv == null) return;
        let worst = null;
        ls.slice(0, i).forEach((o) => {
          if (o.parentId && o.parentId === l.parentId) return;
          const olv = this.level(o, d);
          if (olv != null && olv > lv && (!worst || olv > worst.lv)) worst = { l: o, lv: olv };
        });
        if (worst) out.push({ domain: d, label: l, lower: worst.l, lv, maxLv: worst.lv });
      });
    });
    return out;
  },

  /* ---------- Teksten ---------- */
  principalName(p, st = S()) {
    const g = p.groupId ? byId(st.groups, p.groupId) : null;
    switch (p.type) {
      case "org": return "Alle gebruikers in de organisatie";
      case "authenticated": return "Any authenticated users";
      case "group": return g ? g.name + (g.value ? ` (${g.value})` : "") : p.value || "Groep (nog invullen)";
      case "domain": return g ? (g.value || g.name) : p.value || "Domein (nog invullen)";
      case "partner": return g ? (g.value || g.name) : p.value || "Partner";
      case "user": return p.value || "Gebruiker (nog invullen)";
      default: return p.value || p.type;
    }
  },
  levelName(key) { const x = CATALOG.permissionLevels.find((p) => p.key === key); return x ? x.name : key; },
  summary(l, domain, st = S()) {
    const c = l.cfg;
    const lst = (arr) => arr.filter(Boolean).join(", ");
    switch (domain) {
      case "recognition": { const s = labelSits(l, st); return s.length ? `${s.length} informatietype(n): ${s.slice(0, 4).map((x) => x.name).join(", ")}${s.length > 4 ? " …" : ""}` : "Geen informatietypen gekoppeld"; }
      case "scope": return lst(CATALOG.labelScopes.filter((x) => c.scope[x.key]).map((x) => x.name)) || "Geen scope";
      case "publish": {
        const lp = st.labelPolicies.find((p) => p.scope === "all");
        const def = lp && lp.settings.defaultDocs === l.id ? " · default label" : "";
        if (c.publish.audience === "groups") return `Alleen voor: ${lst(c.publish.groups.map((g) => (byId(st.groups, g) || {}).name)) || "(groep kiezen)"}${def}`;
        return `Alle medewerkers${def}`;
      }
      case "autolabel": {
        const a = c.autolabel;
        const cl = { off: "", recommend: "Aanbevelen in Office", auto: "Automatisch in Office" }[a.client.mode];
        const sv = a.service.enabled ? `service-side (${lst([a.service.exchange && "Exchange", a.service.sharepoint && "SharePoint", a.service.onedrive && "OneDrive"])}, ${a.service.mode === "enable" ? "aan" : "simulatie"})` : "";
        return lst([cl, sv]) || "Handmatig";
      }
      case "marking": {
        const m = c.marking;
        return lst([m.header.enabled && `Header “${m.header.text}”`, m.footer.enabled && `Footer “${m.footer.text}”`, m.watermark.enabled && `Watermerk “${m.watermark.text}”`]) || "Geen markering";
      }
      case "encryption": {
        const e = c.encryption;
        if (e.mode === "none") return "Geen encryptie";
        if (e.mode === "remove") return "Encryptie verwijderen";
        if (e.mode === "userDefined") return `Gebruiker bepaalt rechten${e.userDefined.outlook !== "none" ? ` · Outlook: ${e.userDefined.outlook === "DoNotForward" ? "Do Not Forward" : "Encrypt-Only"}` : ""}${e.userDefined.office ? " · Word/Excel/PowerPoint: gebruiker kiest" : ""}`;
        const p = e.permissions.map((x) => `${this.principalName(x, st)} = ${this.levelName(x.level)}`).join("; ") || "nog geen rechten";
        const ex = e.expiry.type === "date" ? ` · verloopt ${e.expiry.date}` : e.expiry.type === "days" ? ` · verloopt na ${e.expiry.days} dagen` : "";
        const off = e.offline.type === "never" ? " · geen offline toegang" : e.offline.type === "days" ? ` · offline ${e.offline.days} dagen` : "";
        return `${e.dke ? "DKE · " : ""}${p}${ex}${off}`;
      }
      case "container": {
        if (!c.scope.sites) return "Niet voor Teams/Groups/sites";
        const t = c.container;
        const pv = (CATALOG.containerPrivacy.find((x) => x[0] === t.privacy) || [])[1];
        const sh = (CATALOG.siteSharing.find((x) => x[0] === t.sharing) || [])[1];
        const um = { full: "", limited: "onbeheerd: alleen web", block: "onbeheerd: geblokkeerd" }[t.unmanaged];
        return lst([`Privacy: ${pv}`, t.externalUserAccess ? "gasten toegestaan" : "geen gasten", `delen: ${sh}`, um]);
      }
      case "meetings": {
        if (!c.scope.meetings) return "Niet voor meetings";
        const m = c.meetings;
        const lob = (CATALOG.meetingLobby.find((x) => x[0] === m.lobbyBypass) || [])[1];
        return lst([m.lobbyBypass !== "default" && `Lobby: ${lob}`, m.presenters !== "default" && `Presentatoren: ${(CATALOG.meetingPresenters.find((x) => x[0] === m.presenters) || [])[1]}`, m.preventCopyChat && "chat niet kopiëren", m.e2ee && "E2EE", (m.watermarkScreen || m.watermarkVideo) && "watermerk"]) || "Alleen labelen";
      }
      case "notify": {
        const n = c.notify;
        return lst([n.tip ? "Policy tip" : "Geen tip", n.emailUser && "e-mail gebruiker", `override: ${n.override === "none" ? "nee" : "met justificatie"}`, n.alert !== "none" && `alert (${n.severity})`, n.incidentReport && "incidentrapport"]);
      }
      case "dlp_endpoint": {
        const a = c.dlp.endpoint.activities || {};
        const by = { block: [], warn: [], audit: [] };
        CATALOG.endpointActivities.forEach((x) => { if (by[a[x.key]]) by[a[x.key]].push(x.key); });
        const nm = { cloud: "cloud", paste: "plakken browser", clipboard: "klembord", usb: "USB", network: "netwerkshare", print: "print", bluetooth: "Bluetooth", rdp: "RDP", apps: "apps" };
        return lst([by.block.length && `Block: ${by.block.map((k) => nm[k]).join(", ")}`, by.warn.length && `Override: ${by.warn.map((k) => nm[k]).join(", ")}`, by.audit.length && `Audit: ${by.audit.map((k) => nm[k]).join(", ")}`]) || "Geen regel";
      }
      default: {
        if (domain.startsWith("dlp_")) {
          const d = c.dlp[domain.slice(4)];
          if (!d || d.action === "off") return "Geen regel";
          const sc = d.scope ? ` (${SCOPE_NAMES[d.scope] || d.scope})` : "";
          return `${DLP_ACTION_NAMES[d.action] || d.action}${sc}`;
        }
        return "";
      }
    }
  },
};
