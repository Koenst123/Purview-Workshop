/* Export: Security & Compliance PowerShell-script.
   Uitgangspunten: voorgestelde uitvoer, nooit automatisch uitgevoerd. DLP en auto-labeling starten in simulatie (DLP: TestWithoutNotifications/TestWithNotifications,
   auto-labeling: TestWithoutNotifications); labels en labelbeleid worden bij uitvoeren wél aangemaakt;
   niet-geverifieerde parameters alleen als commentaar, elke stap afzonderlijk met foutafhandeling en idempotent ([SKIP] als het object al bestaat).
   Veiligheid: alle gebruikersinvoer gaat via q()/dq() (strings), n() (getallen), xml() (rule package) of c() (commentaarregels). */
const PS_CONF = { high: 85, medium: 75, low: 65 };
const PS_CONF_NAME = { high: "High", medium: "Medium", low: "Low" };
const PS_EP_VERIFIED = ["Print", "CopyPaste", "RemovableMedia", "NetworkShare"];
const PS_COPILOT_GUID = "470f2276-e011-4e9d-a6ec-20768be3a4b0";
const PS_LABEL_ADV_KEYS = ["outlookdefaultlabel", "defaultlabelid", "teamworkdefaultlabelid", "siteandgroupdefaultlabelid", "powerbidefaultlabelid", "defaultsublabelid"];
const PS_NO_TIP_LOCS = ["onprem", "instances"];

const PsExport = {
  _todo: [],

  /* ---------- Escaping ---------- */
  q(v) { return "'" + String(v == null ? "" : v).replace(/['\u2018\u2019\u201A\u201B]/g, "$&$&") + "'"; },
  dq(v) { return String(v == null ? "" : v).replace(/[`"$\u201C\u201D\u201E]/g, "`$&"); },
  b(v) { return v ? "$true" : "$false"; },
  arr(list) { return "@(" + list.map((x) => this.q(x)).join(", ") + ")"; },
  /** Tekst voor een #-commentaarregel of het <# #>-kopblok: één regel, geen blokcommentaar-einde. */
  c(text) {
    return String(text == null ? "" : text).replace(/[\r\n\u0085\u2028\u2029]+/g, " ").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").replace(/#>/g, "# >").trim();
  },
  /** Geheel getal als PowerShell-literal; ongeldige invoer → standaardwaarde. */
  n(v, d = 0) { const x = Number(v); return String(Number.isFinite(x) ? Math.trunc(x) : d); },
  /** Hashtable-sleutel: kaal als het een identifier is, anders gequote. */
  key(k) { return /^[A-Za-z_][A-Za-z0-9_]*$/.test(String(k)) ? String(k) : this.q(k); },
  xml(v) {
    return String(v == null ? "" : v).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\uFFFE\uFFFF]/g, "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;")
      .replace(/[\r\n\u0085\u2028\u2029]/g, (ch) => `&#${ch.charCodeAt(0)};`);
  },
  /** Deterministische GUID (v4-formaat) uit een seed, zodat een nieuwe export hetzelfde rule package bijwerkt i.p.v. dupliceert. */
  guid(seed) {
    const s = String(seed);
    let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
    for (let i = 0, k; i < s.length; i++) {
      k = s.charCodeAt(i);
      h1 = h2 ^ Math.imul(h1 ^ k, 597399067); h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
      h3 = h4 ^ Math.imul(h3 ^ k, 951274213); h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067); h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213); h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    h1 ^= h2 ^ h3 ^ h4; h2 ^= h1; h3 ^= h1; h4 ^= h1;
    const x = [h1, h2, h3, h4].map((v) => (v >>> 0).toString(16).padStart(8, "0")).join("");
    return `${x.slice(0, 8)}-${x.slice(8, 12)}-4${x.slice(13, 16)}-${((parseInt(x[16], 16) & 3) | 8).toString(16)}${x.slice(17, 20)}-${x.slice(20, 32)}`;
  },
  splat(name, entries, ind = "") {
    const keys = entries.filter(Boolean);
    const w = Math.max(...keys.map(([k]) => k.length));
    return `${ind}$${name} = @{\n${keys.map(([k, v]) => `${ind}  ${k.padEnd(w)} = ${String(v).replace(/\n/g, "\n" + ind)}`).join("\n")}\n${ind}}`;
  },
  exists(kind, id) { return kind ? ` -Kind '${kind}' -Id ${this.q(id)}` : ""; },
  step(title, cmd, kind, id) { return `Step ${this.q(title)}${this.exists(kind, id)} { ${cmd} }`; },
  run(title, name, kv, cmd, kind, id) { return `Step ${this.q(title)}${this.exists(kind, id)} {\n${this.splat(name, kv, "  ")}\n  ${cmd} @${name}\n}`; },
  section(t) { return `\n# ${"=".repeat(78)}\n# ${t}\n# ${"=".repeat(78)}`; },
  ruleTitle(r) { const n = String(r.name || ""); return /^regel\b/i.test(n) ? n : `Regel ${n}`; },
  fileName(st) {
    const c = (st.meta.customer || "ontwerp").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const d = String(st.meta.date || today()).replace(/[^0-9-]/g, "") || today();
    return `Purview-IP-DLP-${c || "ontwerp"}-${d}.ps1`;
  },
  grp(id, st) { return byId(st.groups, id); },
  /** Labelnaam zoals het script hem aanmaakt (ASCII) – overal gebruiken waar het script naar een label verwijst. */
  ln(l, st) { return Generator.psName(l, st); },
  grpValue(g) {
    const v = g && g.value ? g.value : `<${g ? g.name : "groep"}@domein>`;
    if (this._grp && g) this._grp.set(g.name, v);
    return v;
  },
  /** E-mailadressen voor GenerateAlert/GenerateIncidentReport uit dlpSettings.alertRecipients ("a@x; b@x"). */
  alertRecipients(st) {
    const ok = [], bad = [];
    String((st.dlpSettings || {}).alertRecipients || "").split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean).forEach((x) => {
      (/^[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(x) ? ok : bad).push(x);
    });
    return { ok: unique(ok), bad: unique(bad) };
  },

  /* ---------- LET OP-notities: gebundeld per object + portal-checklist ---------- */
  /** Checklist-item; items met dezelfde eigenaar (policy/label) worden onder één nummer gegroepeerd. */
  todo(t, owner = "") {
    const s = this.c(t), o = this.c(owner);
    if (!s) return;
    let g = o ? this._todo.find((x) => x.owner === o) : null;
    if (!g) this._todo.push((g = { owner: o, items: [] }));
    if (!g.items.includes(s)) g.items.push(s);
  },
  untodo(owner) { const o = this.c(owner); this._todo = this._todo.filter((x) => x.owner !== o); },
  checklist() {
    if (!this._todo.length) return "# Geen handmatige stappen.";
    return this._todo.map((g, i) => {
      const nr = `# ${String(i + 1).padStart(2, " ")}. `;
      if (!g.owner) return nr + g.items[0];
      if (g.items.length === 1) return `${nr}${g.owner}: ${g.items[0]}`;
      return [`${nr}${g.owner}:`, ...g.items.map((x) => `#       - ${x}`)].join("\n");
    }).join("\n");
  },
  notes() {
    return {
      list: [],
      add(t, who, info = false) {
        if (t && t.cls) {
          let e = this.list.find((x) => x.cls);
          if (!e) this.list.unshift((e = { cls: [], who: [], info: false, t: "" }));
          let m = e.cls.find((x) => x.who === (who || ""));
          if (!m) e.cls.push((m = { who: who || "", names: [] }));
          t.cls.forEach((nm) => { if (!m.names.includes(nm)) m.names.push(nm); });
          if (who && !e.who.includes(who)) e.who.push(who);
          const q = (a) => a.map((nm) => `‘${nm}’`).join(", ");
          const all = [...new Set(e.cls.flatMap((x) => x.names))];
          e.noWho = e.cls.some((x) => x.names.length !== all.length);
          e.t = e.noWho
            ? `Trainable classifiers toevoegen als conditie in het portal (PowerShell-syntax niet gedocumenteerd): ${e.cls.map((x) => `${x.who}: ${q(x.names)}`).join("; ")}.`
            : `Trainable classifier${all.length > 1 ? "s" : ""} ${q(all)} toevoegen als conditie in het portal (PowerShell-syntax niet gedocumenteerd).`;
          return;
        }
        let e = this.list.find((x) => x.t === t);
        if (!e) this.list.push((e = { t, who: [], info }));
        if (who && !e.who.includes(who)) e.who.push(who);
      },
    };
  },
  /** Schrijft gebundelde notities als commentaar; portal-acties gaan ook naar de checklist. */
  emitNotes(ns, total, owner, lines, pre = "# LET OP: ") {
    ns.list.forEach((e) => {
      const who = !e.noWho && e.who.length && e.who.length < total ? ` [${e.who.length === 1 ? "regel" : "regels"}: ${e.who.join("; ")}]` : "";
      lines.push(`${e.info ? "# Info: " : pre}${this.c(e.t + who)}`);
      if (!e.info) this.todo(`${e.t}${who}`, owner);
    });
  },
  /* ---------- Labels ---------- */
  rightsDefinition(l, st) {
    const out = [], notes = [];
    (l.cfg.encryption.permissions || []).forEach((p) => {
      const lv = CATALOG.permissionLevels.find((x) => x.key === p.level);
      const rights = p.level === "Custom" ? p.rights || [] : lv ? lv.rights : [];
      if (!rights.length) { notes.push(`Rechthebbende ${Mapping.principalName(p, st)} heeft geen rechten – overgeslagen.`); return; }
      const g = p.groupId ? this.grp(p.groupId, st) : null;
      let id;
      if (p.type === "org") id = "$($TenantDomain)";
      else if (p.type === "authenticated") { id = "AuthenticatedUsers"; notes.push("‘AuthenticatedUsers’ als identiteit staat niet letterlijk in de cmdlet-documentatie; controleer na aanmaken in het portal (Any authenticated users)."); }
      else if (p.type === "domain" || p.type === "partner") {
        const sd = Generator.splitDomains((g && g.value) || p.value || "");
        if (sd.placeholders.length) notes.push(`Voorbeelddomein ${sd.placeholders.map((x) => `‘${x}’`).join(", ")} overgeslagen – vul de echte partnerdomeinen in (Labelbeleid › Doelgroepen) en exporteer opnieuw.`);
        if (sd.invalid.length) notes.push(`Ongeldig domein/adres ${sd.invalid.map((x) => `‘${x}’`).join(", ")} overgeslagen – controleer de schrijfwijze.`);
        if (!sd.valid.length) {
          if (!sd.placeholders.length && !sd.invalid.length) notes.push(`Vul de partnerdomeinen in voor ‘${Mapping.principalName(p, st)}’ (vóór het uitvoeren).`);
          return;
        }
        sd.valid.forEach((x) => out.push(`${this.dq(x)}:${rights.map((r) => this.dq(r)).join(",")}`));
        return;
      }
      else {
        id = this.dq((g && g.value) || p.value || `<${(g && g.name) || p.type}>`);
        if (g && this._grp) this._grp.set(g.name, g.value || `<${g.name}>`);
      }
      if (/^</.test(id)) notes.push(`Vul de identiteit in voor ‘${Mapping.principalName(p, st)}’ (vóór het uitvoeren).`);
      out.push(`${id}:${rights.map((r) => this.dq(r)).join(",")}`);
    });
    return { value: `"${out.join(";")}"`, notes, empty: !out.length };
  },
  labelBlock(gl, st) {
    const l = gl.label, c = l.cfg, e = c.encryption, m = c.marking, t = c.container, mt = c.meetings;
    const kv = [], notes = [], adv = [], P = !!gl.isParent;
    kv.push(["Name", this.q(gl.psName || gl.name)], ["DisplayName", this.q(l.displayName || l.name)], ["Tooltip", this.q(l.tooltip || l.displayName || l.name)]);
    if (l.adminDesc) kv.push(["Comment", this.q(this.c(l.adminDesc))]);
    kv.push(["ContentType", this.q(gl.contentTypes.join(", ") || "File, Email")]);
    if (gl.parent) kv.push(["ParentId", this.q(this.ln(gl.parent, st))]);
    adv.push(["color", this.q(l.color)]);
    if (gl.contentTypes.length === 0) notes.push("Geen scope gekozen – ContentType ‘File, Email’ als standaard gebruikt.");
    if (!P && c.scope.meetings && Object.entries(mt).some(([k, v]) => v && v !== "default" && k !== "allowChat")) notes.push("Meeting-instellingen (Teams*-parameters) vereisen Teams Premium voor de organisator.");
    // Encryptie
    const info = P ? ["Parent label: alleen een container voor de sublabels – encryptie, markering en groups & sites/Teams-instellingen staan op de sublabels en worden hier bewust niet ingesteld."] : [];
    if (e.mode === "assignNow" && (c.scope.files || c.scope.emails || c.scope.meetings) && !P) {
      const rd = this.rightsDefinition(l, st);
      notes.push(...rd.notes);
      if (rd.empty) notes.push("Encryptie NIET ingesteld: er is geen enkele geldige rechthebbende. Vul de rechten aan en exporteer opnieuw, of stel de encryptie in het portal in.");
      else {
        kv.push(["EncryptionEnabled", "$true"], ["EncryptionProtectionType", "'Template'"], ["EncryptionRightsDefinitions", rd.value]);
        if (e.expiry.type === "days") kv.push(["EncryptionContentExpiredOnDateInDaysOrNever", this.q(this.n(e.expiry.days || 30, 30))]);
        else if (e.expiry.type === "date") { kv.push(["EncryptionContentExpiredOnDateInDaysOrNever", "'Never'"]); notes.push(`Vervaldatum ${e.expiry.date || "(leeg)"}: een vaste datum stel je in het portal in (Access expires on a specific date).`); }
        else kv.push(["EncryptionContentExpiredOnDateInDaysOrNever", "'Never'"]);
        if (e.offline.type === "days") kv.push(["EncryptionOfflineAccessDays", this.n(e.offline.days || 7, 7)]);
        else if (e.offline.type === "never") kv.push(["EncryptionOfflineAccessDays", "0"]);
        if (e.dke) notes.push("Double Key Encryption: voeg -EncryptionDoubleKeyEncryptionUrl '<https://dke-service/...>' toe (kan na instellen niet meer worden verwijderd).");
      }
    } else if (e.mode === "userDefined" && !P) {
      kv.push(["EncryptionEnabled", "$true"], ["EncryptionProtectionType", "'UserDefined'"], ["EncryptionPromptUser", this.b(e.userDefined.office)]);
      if (e.userDefined.outlook === "DoNotForward") kv.push(["EncryptionDoNotForward", "$true"]);
      if (e.userDefined.outlook === "EncryptOnly") kv.push(["EncryptionEncryptOnly", "$true"]);
    } else if (e.mode === "remove" && !P) {
      kv.push(["EncryptionEnabled", "$true"], ["EncryptionProtectionType", "'RemoveProtection'"]);
    }
    // Markering
    const mk = (x, pre, alignKey) => {
      if (!x.enabled) return;
      kv.push([`${pre}Enabled`, "$true"], [`${pre}Text`, this.q(x.text)], [`${pre}FontSize`, this.n(x.size || 10, 10)], [`${pre}FontColor`, this.q(x.color || "#000000")], [`${pre}FontName`, this.q(x.font || "Calibri")]);
      if (alignKey) kv.push([`${pre}${alignKey}`, this.q(alignKey === "Layout" ? x.layout || "Diagonal" : x.align || "Left")]);
    };
    if (!P && (c.scope.files || c.scope.emails)) {
      mk(m.header, "ApplyContentMarkingHeader", "Alignment");
      mk(m.footer, "ApplyContentMarkingFooter", "Alignment");
      mk(m.watermark, "ApplyWaterMarking", "Layout");
    }
    // Groups & sites
    if (!P && c.scope.sites) {
      kv.push(["SiteAndGroupProtectionEnabled", "$true"]);
      if (t.privacy === "public" || t.privacy === "private") kv.push(["SiteAndGroupProtectionPrivacy", this.q(t.privacy === "public" ? "Public" : "Private")]);
      kv.push(["SiteAndGroupProtectionAllowAccessToGuestUsers", this.b(t.externalUserAccess)]);
      if (t.sharing) kv.push(["SiteExternalSharingControlType", this.q(t.sharing)]);
      if (t.unmanaged === "full") kv.push(["SiteAndGroupProtectionAllowFullAccess", "$true"]);
      if (t.unmanaged === "limited") kv.push(["SiteAndGroupProtectionAllowLimitedAccess", "$true"]);
      if (t.unmanaged === "block") kv.push(["SiteAndGroupProtectionBlockAccess", "$true"]);
      if (t.authContext) notes.push(`Authentication context ‘${t.authContext}’: kies deze in het portal (Groups & sites › External sharing & Conditional Access).`);
      if (t.privateTeamsDiscoverable === false || t.sharedChannels.internalOnly || t.sharedChannels.sameLabelOnly || t.sharedChannels.privateTeamsOnly) notes.push("Instellingen voor private teams / shared channels: stel in via het portal (Teams*-parameters zijn niet gedocumenteerd).");
    }
    if (!P && (c.scope.files || c.scope.sites)) {
      if (t.defaultLinkType && t.defaultLinkType !== "unspecified") adv.push(["DefaultSharingScope", this.q(t.defaultLinkType)]);
      if (t.defaultLinkPermission && t.defaultLinkPermission !== "unspecified") adv.push(["DefaultShareLinkPermission", this.q(t.defaultLinkPermission)]);
    }
    // Meetings
    if (!P && c.scope.meetings) {
      kv.push(["TeamsProtectionEnabled", "$true"]);
      if (mt.lobbyBypass && mt.lobbyBypass !== "default") kv.push(["TeamsLobbyRestrictionEnforced", "$true"], ["TeamsLobbyBypassScope", this.q(mt.lobbyBypass)]);
      if (mt.presenters && mt.presenters !== "default") kv.push(["TeamsPresentersRestrictionEnforced", "$true"], ["TeamsAllowedPresenters", this.q(mt.presenters)]);
      if (mt.whoCanRecord && mt.whoCanRecord !== "default") kv.push(["TeamsWhoCanRecord", this.q(mt.whoCanRecord)]);
      if (mt.recordAutomatically) kv.push(["TeamsRecordAutomatically", "$true"]);
      if (mt.preventCopyChat) kv.push(["TeamsCopyRestrictionEnforced", "$true"]);
      if (mt.e2ee) kv.push(["TeamsEndToEndEncryptionEnabled", "$true"]);
      if (mt.watermarkScreen || mt.watermarkVideo) {
        kv.push(["TeamsVideoWatermark", this.q(mt.watermarkVideo ? "EnabledForVideo" : "EnabledForContentSharing")]);
        if (mt.watermarkScreen && mt.watermarkVideo) notes.push("Watermerk voor zowel schermdelen als camera: TeamsVideoWatermark accepteert één waarde – controleer in het portal.");
      }
      if (mt.allowChat && mt.allowChat !== "default") kv.push(["TeamsAllowMeetingChat", this.q(mt.allowChat)]);
      if (mt.detectSensitiveScreen) notes.push("‘Detect sensitive content during screen sharing’ (preview): instellen via het portal.");
    }
    kv.push(["AdvancedSettings", `@{ ${adv.map(([k, v]) => `${k} = ${v}`).join("; ")} }`]);
    const lines = [`# --- ${this.c(gl.fullName)}${gl.isParent ? " (parent label)" : ""} ---`];
    const ns = this.notes();
    notes.forEach((x) => ns.add(x));
    info.forEach((x) => ns.add(x, null, true));
    this.emitNotes(ns, 1, `Label ‘${gl.fullName}’`, lines);
    lines.push(this.run(`Label ${gl.fullName}`, "p", kv, "New-Label", "Label", gl.psName || gl.name));
    return lines.join("\n");
  },

  /* ---------- Labelbeleid ---------- */
  policyBlock(gp, st) {
    const p = gp.policy, s = gp.settings || {}, a = gp.adv || {};
    const adv = [], notes = [];
    const lid = (id) => { const l = labelById(id, st) || st.labels.find((x) => labelTechName(x, st) === id || this.ln(x, st) === id); return l ? `(LabelId ${this.q(this.ln(l, st))})` : null; };
    const def = (key, v, legacy, what) => {
      if (!v) return;
      const ref = lid(v);
      if (ref) adv.push([key, ref, legacy]);
      else notes.push(`Default label voor ${what} verwijst naar een label dat niet (meer) bestaat – overgeslagen; kies het default label in het portal.`);
    };
    if (s.justification) adv.push(["requiredowngradejustification", "'true'", true]);
    if (s.mandatoryDocs) adv.push(["mandatory", "'true'", true]);
    if (s.mandatoryDocs && !s.mandatoryEmail) adv.push(["DisableMandatoryInOutlook", "'true'"]);
    if (!s.mandatoryDocs && s.mandatoryEmail) notes.push("Alleen e-mail verplicht labelen: stel in het portal in (pagina ‘Default settings for emails’).");
    def("defaultlabelid", s.defaultDocs, true, "documenten");
    if (s.defaultEmail === "none") adv.push(["OutlookDefaultLabel", "'None'"]);
    else if (s.defaultEmail !== "sameAsDocs") def("OutlookDefaultLabel", s.defaultEmail, false, "e-mail");
    if (s.mandatoryMeetings) adv.push(["TeamworkMandatory", "'true'"]);
    def("teamworkdefaultlabelid", s.defaultMeetings, false, "vergaderingen");
    if (s.mandatorySites) adv.push(["siteandgroupmandatory", "'true'", true]);
    def("siteandgroupdefaultlabelid", s.defaultSites, true, "sites en groepen");
    if (s.mandatoryFabric) adv.push(["powerbimandatory", "'true'"]);
    def("powerbidefaultlabelid", s.defaultFabric, false, "Fabric/Power BI");
    if (s.helpLink) {
      const hl = String(s.helpLink).trim();
      if (/^(https:\/\/|mailto:)[^\s'"<>`]+$/i.test(hl)) adv.push(["customurl", this.q(hl), true]);
      else notes.push(`Help-link ‘${hl}’ overgeslagen: alleen https://- of mailto:-adressen zijn toegestaan.`);
    }
    Object.entries(a).forEach(([k, v]) => {
      if (v === "" || v == null || v === false) return;
      if (adv.some(([x]) => x.toLowerCase() === String(k).toLowerCase())) return;
      const sv = typeof v === "object" ? JSON.stringify(v) : v === true ? "true" : String(v);
      if (PS_LABEL_ADV_KEYS.includes(String(k).toLowerCase()) || /^lbl-/.test(sv)) {
        if (/^none$/i.test(sv)) { adv.push([this.key(k), "'None'"]); return; }
        const ref = lid(sv);
        if (ref) adv.push([this.key(k), ref]);
        else notes.push(`Advanced setting ‘${k}’ verwijst naar een label dat niet (meer) bestaat (${sv}) – overgeslagen; kies het label in het portal.`);
        return;
      }
      adv.push([this.key(k), this.q(sv)]);
    });
    let loc;
    if (p.scope === "all") loc = "'All'";
    else {
      const gs = (p.groups || []).map((g) => this.grp(g, st)).filter(Boolean);
      gs.filter((g) => !g.value).forEach((g) => notes.push(`Vul het e-mailadres in van groep ‘${g.name}’ (vóór het uitvoeren).`));
      loc = gs.length ? this.arr(gs.map((g) => this.grpValue(g))) : "'<groep@domein>'";
    }
    const ns = this.notes();
    notes.forEach((x) => ns.add(x));
    if (adv.some((x) => x[2])) ns.add("Sleutels met (*) staan niet (meer) in de huidige Learn-documentatie van New-LabelPolicy; het portal gebruikt ze wel. Controleer na uitvoeren met Get-LabelPolicy | Format-List Settings.", null, true);
    const kv = [["Name", this.q(gp.name)], ["Labels", this.arr(gp.labels.map((l) => this.ln(l, st)))], ["ExchangeLocation", loc]];
    if (adv.length) kv.push(["AdvancedSettings", `@{\n${adv.map(([k, v, legacy]) => `    ${k} = ${v}${legacy ? "   # (*)" : ""}`).join("\n")}\n  }`]);
    const lines = [`# --- ${this.c(gp.name)} (${this.c(gp.scopeText)}) ---`];
    this.emitNotes(ns, 1, `Labelbeleid ‘${gp.name}’`, lines);
    lines.push(this.run(gp.name, "p", kv, "New-LabelPolicy", "LabelPolicy", gp.name));
    return lines.join("\n");
  },
  /* ---------- Custom SIT's (XML rule package) ---------- */
  sitPackage(st) {
    const sits = st.sits.filter((s) => s.kind === "custom");
    if (!sits.length) return "# Geen custom SIT’s in dit ontwerp.";
    const out = [], skipped = [];
    const ents = [], regs = [], kws = [], res = [];
    const cust = st.meta.customer || "Organisatie";
    const seed = (x) => `pyd|${cust}|${x}`;
    sits.forEach((s, i) => {
      const keywords = (s.keywords || []).map((k) => String(k).trim()).filter(Boolean);
      if (!s.regex && !keywords.length) { skipped.push(s.name); return; }
      const id = this.guid(seed(`sit|${s.id || s.name}`)), rx = `Regex_${i}`, kw = `Keyword_${i}`;
      const prox = Number(s.proximity) > 0 ? this.n(s.proximity, 300) : "300";
      const rec = PS_CONF[s.confidence] || 75;
      const minK = Math.max(1, Number(this.n(s.high && s.high.minKeywords, 1)) || 1);
      const pats = [];
      if (s.regex) {
        regs.push(`  <Regex id="${rx}">${this.xml(s.regex)}</Regex>`);
        if (keywords.length) {
          pats.push(`    <Pattern confidenceLevel="85">\n      <IdMatch idRef="${rx}"/>\n      <Match idRef="${kw}" minCount="${minK}"/>\n    </Pattern>`);
          if (!(s.high && s.high.keywords) || (s.medium && s.medium.keywords === false)) pats.push(`    <Pattern confidenceLevel="75">\n      <IdMatch idRef="${rx}"/>\n    </Pattern>`);
        } else pats.push(`    <Pattern confidenceLevel="75">\n      <IdMatch idRef="${rx}"/>\n    </Pattern>`);
      } else pats.push(`    <Pattern confidenceLevel="75">\n      <IdMatch idRef="${kw}"/>\n    </Pattern>`);
      if (keywords.length) kws.push(`  <Keyword id="${kw}">\n    <Group matchStyle="word">\n${keywords.map((k) => `      <Term>${this.xml(k)}</Term>`).join("\n")}\n    </Group>\n  </Keyword>`);
      ents.push(`  <Entity id="${id}" patternsProximity="${prox}" recommendedConfidence="${Math.min(rec, Math.max(...pats.map((p) => +p.match(/confidenceLevel="(\d+)"/)[1])))}">\n${pats.join("\n")}\n  </Entity>`);
      res.push(`    <Resource idRef="${id}">\n      <Name default="true" langcode="en-us">${this.xml(s.name)}</Name>\n      <Description default="true" langcode="en-us">${this.xml(this.c(s.desc || s.name))}</Description>\n    </Resource>`);
    });
    if (skipped.length) {
      out.push(`# LET OP: overgeslagen (geen regex of keywords): ${this.c(skipped.join(", "))}`);
      this.todo(`Custom SIT’s zonder regex of keywords aanvullen en in het portal aanmaken: ${skipped.join(", ")}`);
    }
    if (!ents.length) return out.join("\n");
    const pub = this.xml(cust), packId = this.guid(seed("rulepack")), pkgName = `${cust} custom SITs`;
    const xml = `<?xml version="1.0" encoding="UTF-16"?>
<RulePackage xmlns="http://schemas.microsoft.com/office/2011/mce">
<RulePack id="${packId}">
  <Version build="0" major="1" minor="0" revision="0"/>
  <Publisher id="${this.guid(seed("publisher"))}"/>
  <Details defaultLangCode="en-us">
    <LocalizedDetails langcode="en-us">
      <PublisherName>${pub}</PublisherName>
      <Name>${this.xml(pkgName)}</Name>
      <Description>Custom sensitive information types uit de Protect your Data-workshop.</Description>
    </LocalizedDetails>
  </Details>
</RulePack>
<Rules>
${ents.join("\n")}
${regs.join("\n")}
${kws.join("\n")}
  <LocalizedStrings>
${res.join("\n")}
  </LocalizedStrings>
</Rules>
</RulePackage>`;
    out.push("# Test de patronen eerst in het portal (Sensitive info types › Test). De regex-engine is Boost.RegEx 5.1.3.");
    out.push("# De GUID's zijn vast per klant en SIT: opnieuw uitvoeren werkt het bestaande rule package bij (Set-) in plaats van een dubbel aan te maken.");
    out.push(`$sitXml = @'\n${xml.replace(/^'@/gm, "&apos;@")}\n'@`);
    out.push("# Bij elke update moet de Version in het rule package omhoog; daarom wordt die bij uitvoeren bepaald (minor = dagen sinds 2020, build = tijdstip).");
    out.push(`$sitVersion = 'build="{0}" major="1" minor="{1}" revision="0"' -f [int][Math]::Floor((Get-Date).TimeOfDay.TotalSeconds / 2), [int][Math]::Floor(((Get-Date) - [datetime]'2020-01-01').TotalDays)
$sitXml = $sitXml -replace '<Version [^>]*/>', "<Version $sitVersion/>"`);
    out.push(`Step 'Custom SIT rule package' {
  $bytes = [System.Text.Encoding]::Unicode.GetBytes($sitXml)
  $all   = @(Get-DlpSensitiveInformationTypeRulePackage)
  $found = @($all | Where-Object { (($_.PSObject.Properties | ForEach-Object { [string]$_.Value }) -join '|') -match '${packId}' })
  if ($found.Count) { Set-DlpSensitiveInformationTypeRulePackage -FileData $bytes -Confirm:$false; Write-Host '       bestaand rule package bijgewerkt (Set-)' }
  elseif (@($all | Where-Object { [string]$_.RuleCollectionName -eq ${this.q(pkgName)} }).Count) { throw 'Er bestaat al een rule package met deze naam maar met een ander ID - niet overschreven. Controleer handmatig (Get-DlpSensitiveInformationTypeRulePackage).' }
  else { New-DlpSensitiveInformationTypeRulePackage -FileData $bytes }
}`);
    return out.join("\n");
  },

  /* ---------- Informatietypen in condities ---------- */
  /** Valideert instance count: min = geheel getal ≥ 1, max = 'any' (-1) of geheel getal ≥ min. Nooit NaN. */
  counts(minRaw, maxRaw, name, notes) {
    let min = minRaw == null || minRaw === "" ? 1 : Number(minRaw);
    if (!Number.isInteger(min) || min < 1 || min > 2147483647) { notes.push(`‘${name}’: ongeldig minimum aantal (${minRaw}) – 1 gebruikt; controleer de regel in het portal.`); min = 1; }
    let max = -1;
    const anyMax = maxRaw == null || String(maxRaw).trim() === "" || /^any$/i.test(String(maxRaw).trim()) || Number(maxRaw) === -1;
    if (!anyMax) {
      const m = Number(maxRaw);
      if (!Number.isInteger(m) || m < min || m > 2147483647) notes.push(`‘${name}’: ongeldig maximum aantal (${maxRaw}) – ‘any’ gebruikt; controleer de regel in het portal.`);
      else max = m;
    }
    return { min, max };
  },
  sitEntries(sits, o = {}) {
    const ok = [], notes = [], info = [], cls = [];
    sits.forEach((s) => {
      if (s.kind === "classifier") { cls.push(`‘${s.name}’`); return; }
      if (s.kind === "edm") info.push(`EDM-SIT ‘${s.name}’: het EDM-schema en de upload moeten bestaan; controleer de naam.`);
      const conf = o.confidence || s.confidence || "high";
      const { min, max } = this.counts(o.minCount != null ? o.minCount : s.minCount || 1, o.maxCount, s.name, notes);
      ok.push(o.auto
        ? `@{ name = ${this.q(s.name)}; mincount = '${min}'; maxcount = '${max}'; confidencelevel = '${PS_CONF_NAME[conf] || "High"}' }`
        : `@{ name = ${this.q(s.name)}; mincount = ${min}; maxcount = ${max}; minconfidence = ${PS_CONF[conf] || 85}; maxconfidence = 100 }`);
    });
    if (cls.length) notes.unshift({ cls: cls.map((x) => x.slice(1, -1)) });
    return { ok, notes, info };
  },

  /* ---------- Auto-labeling ---------- */
  autoRuleParts(ap, r) {
    const se = this.sitEntries(r.sits, { auto: true, minCount: r.minCount, confidence: r.confidence });
    if (!se.ok.length) return { code: null, notes: se.notes, info: se.info };
    const cc = `@(@{ operator = 'And'; groups = @(@{ operator = 'Or'; name = 'Default'; sensitivetypes = @(\n      ${se.ok.join(",\n      ")}\n    ) }) })`;
    const code = this.run(this.ruleTitle(r), "r", [["Name", this.q(r.name)], ["Policy", this.q(ap.name)], ["Workload", this.q(r.workload)], ["ContentContainsSensitiveInformation", cc]], "New-AutoSensitivityLabelRule", "AutoSensitivityLabelRule", r.name);
    return { code, notes: se.notes, info: se.info };
  },
  /** "Script" | "Script + portal" | "Portal" – voor de kolom ‘Via script / portal’ in Excel en het ontwerpdocument. */
  autoSupport(ap, r) {
    const x = this.autoRuleParts(ap, r);
    return !x.code ? "Portal" : x.notes.length ? "Script + portal" : "Script";
  },
  autoBlock(ap, st) {
    const lines = [`# --- ${this.c(ap.name)} ---`];
    if (!ap.sits.length) { lines.push("# Overgeslagen: geen informatietypen gekoppeld aan dit label."); return lines.join("\n"); }
    const owner = `Auto-labeling ‘${ap.name}’`, ns = this.notes();
    if (ap.encryptExternalMail) ns.add("‘Encrypt email received from outside the organization’ instellen via het portal.");
    const parts = ap.rules.map((r) => ({ r, ...this.autoRuleParts(ap, r) }));
    parts.forEach((x) => { x.notes.forEach((t) => ns.add(t, x.r.name)); x.info.forEach((t) => ns.add(t, x.r.name, true)); });
    const wl = { Exchange: "Exchange", SharePoint: "SharePoint", OneDriveForBusiness: "OneDrive" };
    if (!parts.some((x) => x.code)) {
      lines.push("# LET OP: deze policy wordt NIET door het script aangemaakt: geen enkele regel heeft een conditie die via PowerShell kan (bijv. alleen trainable classifiers).");
      lines.push("#   Maak de policy in het portal: Purview › Information Protection › Policies › Auto-labeling policies › Create policy (start in simulatie).");
      lines.push(`#   Label: ${this.c(labelFullName(ap.label, st))} · Locaties: ${ap.locations.map((x) => wl[x] || x).join(", ")} · Condities: ${this.c(ap.sits.map((s) => s.name).join("; "))}`);
      this.emitNotes(ns, ap.rules.length, owner, lines, "#   · ");
      this.untodo(owner);
      this.todo("volledig in het portal aanmaken (geen regel via PowerShell mogelijk) – zie sectie 4.", owner);
      return lines.join("\n");
    }
    if (ap.mode === "enable") lines.push("# Ontwerp: inschakelen. Na evaluatie van de simulatie: Set-AutoSensitivityLabelPolicy -Identity <naam> -Mode Enable");
    this.emitNotes(ns, ap.rules.length, owner, lines);
    const kv = [["Name", this.q(ap.name)], ["ApplySensitivityLabel", `(LabelId ${this.q(this.ln(ap.label, st))})`], ["Mode", "'TestWithoutNotifications'"], ["OverwriteLabel", this.b(ap.overrideManual)]];
    if (ap.locations.includes("Exchange")) kv.push(["ExchangeLocation", "'All'"]);
    if (ap.locations.includes("SharePoint")) kv.push(["SharePointLocation", "'All'"]);
    if (ap.locations.includes("OneDriveForBusiness")) kv.push(["OneDriveLocation", "'All'"]);
    lines.push(this.run(ap.name, "p", kv, "New-AutoSensitivityLabelPolicy", "AutoSensitivityLabelPolicy", ap.name));
    parts.forEach((x) => {
      if (x.code) lines.push(x.code);
      else { lines.push(`# ${this.c(this.ruleTitle(x.r))}: geen via PowerShell ondersteunde informatietypen – maak deze regel in het portal.`); this.todo(`regel ‘${x.r.name}’ in het portal aanmaken.`, owner); }
    });
    return lines.join("\n");
  },
  /* ---------- DLP ---------- */
  psMode(mode) { return mode === "simulationTips" ? "TestWithNotifications" : mode === "disable" ? "Disable" : "TestWithoutNotifications"; },
  contentCondition(r, st) {
    const groups = [];
    let notes = [], info = [];
    if (r.conditions.labels.length) groups.push(`@{ operator = 'Or'; name = 'Labels'; labels = @(${r.conditions.labels.map((l) => `@{ name = (LabelId ${this.q(this.ln(l, st))}); type = 'Sensitivity' }`).join(", ")}) }`);
    if (r.conditions.sits.length) {
      const se = this.sitEntries(r.conditions.sits, r.custom ? { minCount: r.minCount, maxCount: r.maxCount } : {});
      notes = se.notes; info = se.info;
      if (se.ok.length) groups.push(`@{ operator = 'Or'; name = 'Informatietypen'; sensitivetypes = @(\n      ${se.ok.join(",\n      ")}\n    ) }`);
    }
    if (!groups.length) return { value: null, notes, info };
    return { value: `@(@{ operator = 'Or'; groups = @(\n    ${groups.join(",\n    ")}\n  ) })`, notes, info };
  },
  extraParams(list, prefix, kv, notes) {
    let added = 0;
    (list || []).forEach((x) => {
      const def = CATALOG.dlpConditions.find((d) => d.key === x.key);
      if (!def) return;
      const name = prefix + def.ps;
      if (!/^[A-Za-z]+$/.test(def.ps) || def.value === "kv") { notes.push(`${prefix ? "Uitzondering" : "Conditie"} ‘${def.name}’ (${def.ps}): instellen via het portal.`); return; }
      let v;
      if (def.value === "none") v = "$true";
      else if (def.value === "enum") v = this.q(x.value);
      else if (def.value === "size") v = this.q(`${this.n(x.value, 0)}KB`);
      else {
        const items = (Array.isArray(x.value) ? x.value : String(x.value || "").split(/[\n,;]/)).map((s) => String(s).trim()).filter(Boolean);
        if (!items.length) { notes.push(`${def.name}: geen waarden ingevuld – overgeslagen.`); return; }
        v = this.arr(items);
      }
      kv.push([name, v]);
      added++;
    });
    return added;
  },
  /** Bouwt één DLP-regel. code = null als de regel niet via PowerShell kan; notes = portal-acties, info = ter informatie. */
  ruleParts(p, r, st) {
    const notes = [], info = [], kv = [["Name", this.q(r.name)], ["Policy", this.q(p.name)]];
    const cc = this.contentCondition(r, st);
    notes.push(...cc.notes); info.push(...cc.info);
    if (cc.value) kv.push(["ContentContainsSensitiveInformation", cc.value]);
    if (r.conditions.accessScope) kv.push(["AccessScope", this.q(r.conditions.accessScope)]);
    if (r.partnerException) {
      const px = r.partnerException, mails = px.valid.filter((x) => !px.domains.includes(x));
      if (px.placeholders.length) notes.push(`Uitzondering partnerdomeinen: voorbeelddomein ${px.placeholders.map((x) => `‘${x}’`).join(", ")} overgeslagen – vul de echte domeinen in en exporteer opnieuw.`);
      if (px.invalid.length) notes.push(`Uitzondering partnerdomeinen: ongeldige waarde ${px.invalid.map((x) => `‘${x}’`).join(", ")} overgeslagen.`);
      if (mails.length) notes.push(`Uitzondering partnerdomeinen: e-mailadressen (${mails.join(", ")}) zijn geen domein – stel zo nodig ‘Recipient is’ in het portal in.`);
      if (!px.domains.length) notes.push("Uitzondering voor partnerdomeinen gekozen, maar er is geen geldig domein – de uitzondering is NIET ingesteld.");
    }
    const extra = this.extraParams(r.conditions.extra, "", kv, notes);
    this.extraParams((r.exceptions || []).filter((x) => !(CATALOG.dlpConditions.find((d) => d.key === x.key) || {}).noExcept), "ExceptIf", kv, notes);
    if (!cc.value && !extra) {
      notes.push("Geen conditie die via PowerShell kan – maak deze regel in het portal.");
      return { code: null, notes, info };
    }
    const a = r.actions, n = r.notify;
    if (a.encrypt) kv.push(["EncryptRMSTemplate", this.q(a.encrypt)]);
    if (a.blockAccess) kv.push(["BlockAccess", "$true"], ["BlockAccessScope", this.q(a.blockScope)]);
    let epBlock = false;
    if (a.endpoint) {
      const ver = a.endpoint.filter((x) => PS_EP_VERIFIED.includes(x.setting)), unv = a.endpoint.filter((x) => !PS_EP_VERIFIED.includes(x.setting));
      if (ver.length) kv.push(["EndpointDlpRestrictions", `@(${ver.map((x) => `@{ Setting = ${this.q(x.setting)}; Value = ${this.q(x.value)} }`).join(", ")})`]);
      if (unv.length) notes.push(`Endpoint-activiteiten ${unv.map((x) => `${x.setting} = ${x.value}`).join(", ")}: deze settingnamen staan niet in de Learn-documentatie van EndpointDlpRestrictions – stel ze in via het portal (Audit or restrict activities on devices).`);
      epBlock = a.endpoint.some((x) => x.level === "block" || x.level === "warn");
    }
    if (a.onprem) notes.push(`On-premises actie (${a.onprem === "move" ? "naar quarantainemap" : "toegang blokkeren"}): instellen via het portal.`);
    if (a.govern) notes.push("Instances-governance (externe gebruikers verwijderen): instellen via het portal / Defender for Cloud Apps.");
    const spod = p.locations.some((x) => ["sharepoint", "onedrive"].includes(x));
    const noTip = p.locations.some((x) => PS_NO_TIP_LOCS.includes(x));
    const onpremOnly = p.locations.length > 0 && p.locations.every((x) => x === "onprem");
    const who = spod ? ["Owner", "LastModifier"] : ["LastModifier"];
    const types = [(n.email || (n.tip && noTip)) && "Email", n.tip && !noTip && "PolicyTip"].filter(Boolean);
    if (onpremOnly) info.push("Gebruikersmeldingen en policy tips zijn niet beschikbaar voor on-premises repositories; het script zet geen NotifyUser.");
    else if (n.tip && noTip) info.push("Voor on-premises repositories en cloud-apps (Instances) gebruikt het script geen policy tip, alleen e-mailnotificatie.");
    if (!onpremOnly && (types.length || epBlock || n.override)) {
      kv.push(["NotifyUser", this.arr(who)]);
      kv.push(["NotifyUserType", this.q(types.length ? types.join(",") : noTip ? "Email" : "PolicyTip")]);
      if (types.includes("PolicyTip")) kv.push(["NotifyPolicyTipCustomText", this.q(String(n.tip).slice(0, 256))]);
    }
    if (n.override && (a.blockAccess || epBlock)) kv.push(["NotifyAllowOverride", this.q(n.override)]);
    if (n.alert && n.alert !== "none") {
      kv.push(["GenerateAlert", "$AlertRecipient"]);
      if (n.alert === "threshold") notes.push(`Alert-drempel (${this.n(n.alertCount || 10, 10)} activiteiten in ${this.n(n.alertMinutes || 60, 60)} minuten): instellen via het portal (AlertProperties is niet gedocumenteerd).`);
    }
    if (n.alert !== "none" || n.incidentReport || a.blockAccess || epBlock) kv.push(["ReportSeverityLevel", this.q(n.severity || "Low")]);
    if (n.incidentReport) kv.push(["GenerateIncidentReport", "$AlertRecipient"], ["IncidentReportContent", "'Default'"]);
    if (r.stop) kv.push(["StopPolicyProcessing", "$true"]);
    const code = `# ${this.c(this.ruleTitle(r))}: ${this.c(r.desc)}\n` + this.run(this.ruleTitle(r), "r", kv, "New-DlpComplianceRule", "DlpComplianceRule", r.name);
    return { code, notes, info };
  },
  copilotParts(p, r, st) {
    const notes = [], info = [];
    const head = `# ${this.c(this.ruleTitle(r))}: ${this.c(r.desc)}\n`;
    const scope = r.actions.copilotScope;
    info.push("Policy tips/meldingen voor Copilot-regels: optioneel instellen in het portal (User notifications).");
    const open = `Step ${this.q(this.ruleTitle(r))}${this.exists("DlpComplianceRule", r.name)} {`;
    if (scope === "content" && r.conditions.labels.length) {
      const lbls = r.conditions.labels.map((l) => `@{ name = (LabelId ${this.q(this.ln(l, st))}); type = 'Sensitivity' }`).join(", ");
      const n = r.notify || {}, extra = [];
      if (n.alert && n.alert !== "none") extra.push("-GenerateAlert $AlertRecipient");
      if (n.incidentReport) extra.push("-GenerateIncidentReport $AlertRecipient -IncidentReportContent 'Default'");
      if (extra.length) extra.push(`-ReportSeverityLevel ${this.q(n.severity || "Low")}`);
      return { notes, info, code: `${head}${open}
  $adv = @{
    Version   = '1.0'
    Condition = @{
      Operator      = 'And'
      SubConditions = @(@{
        ConditionName = 'ContentContainsSensitiveInformation'
        Value         = @(@{ groups = @(@{ Operator = 'Or'; name = 'Default'; labels = @(${lbls}) }) })
      })
    }
  } | ConvertTo-Json -Depth 100
  New-DlpComplianceRule -Name ${this.q(r.name)} -Policy ${this.q(p.name)} -AdvancedRule $adv -RestrictAccess @(@{ setting = 'ExcludeContentProcessing'; value = 'Block' })${extra.length ? " " + extra.join(" ") : ""}
}` };
    }
    const what = { prompts: "Prevent Copilot from processing prompts (gevoelige informatietypen in de prompt)", web: "Prevent Copilot from performing web searches", external: "Prevent Copilot from processing emails from external senders" }[scope] || "Copilot-actie";
    if (scope === "web" && r.conditions.sits.length) {
      const se = this.sitEntries(r.conditions.sits.filter((s) => ["builtin", "custom"].includes(s.kind)), r.custom ? { minCount: r.minCount, maxCount: r.maxCount } : {});
      notes.push(...se.notes); info.push(...se.info);
      if (se.ok.length) {
        info.push("Controleer de web search-regel na aanmaken in het portal (Prevent Copilot from processing content › Performing Web Searches).");
        return { notes, info, code: `${head}${open}
  $adv = @{
    Version   = '1.0'
    Condition = @{
      Operator      = 'And'
      SubConditions = @(@{
        ConditionName = 'ContentContainsSensitiveInformation'
        Value         = @(@{ groups = @(@{ Operator = 'Or'; name = 'Default'; sensitivetypes = @(
          ${se.ok.join(",\n          ")}
        ) }) })
      })
    }
  } | ConvertTo-Json -Depth 100
  New-DlpComplianceRule -Name ${this.q(r.name)} -Policy ${this.q(p.name)} -AdvancedRule $adv -RestrictWebGrounding $true
}` };
      }
    }
    const sits = r.conditions.sits.length ? ` Informatietypen: ${r.conditions.sits.map((s) => s.name).join("; ")}.` : "";
    notes.push(`Regel ‘${r.name}’ – ‘${what}’ ${scope === "web" ? "heeft geen ondersteunde informatietypen" : "heeft (preview) geen gedocumenteerde PowerShell-syntax"}: maak deze regel in het portal (Purview › Data Loss Prevention › Policies › ${p.name} › Edit).${sits}`);
    return { code: null, notes, info };
  },
  /** "Script" | "Script + portal" | "Portal" – voor de kolom ‘Via script / portal’ in Excel en het ontwerpdocument. */
  dlpSupport(p, r, st = S()) {
    const x = p.locations.includes("copilot") ? this.copilotParts(p, r, st) : this.ruleParts(p, r, st);
    return !x.code ? "Portal" : x.notes.length ? "Script + portal" : "Script";
  },
  dlpBlock(p, st) {
    const lines = [`# --- ${this.c(p.name)} ${p.custom ? "(maatwerk)" : "(afgeleid van het ontwerpbord)"} ---`];
    if (p.desc) lines.push(`# ${this.c(p.desc)}`);
    const mode = this.psMode(p.mode), owner = `DLP ‘${p.name}’`, ns = this.notes();
    const cop = p.locations.includes("copilot");
    if (p.template && p.template !== "custom") lines.push(`# Gebaseerd op template ‘${this.c((CATALOG.dlpTemplates.find((t) => t.key === p.template) || {}).name || p.template)}’ – de regels hieronder bevatten de SIT’s uit het ontwerp.`);
    const scopeNote = [], inc = (p.include || []).map((g) => this.grp(g, st) || { name: g }), exc = (p.exclude || []).map((g) => this.grp(g, st) || { name: g });
    const SCOPE_PS = { exchange: ["ExchangeSenderMemberOf", "ExchangeSenderMemberOfException"], onedrive: ["OneDriveSharedByMemberOf", "ExceptIfOneDriveSharedByMemberOf"], teams: ["TeamsLocation", "TeamsLocationException"], devices: ["EndpointDlpLocation", "EndpointDlpLocationException"] };
    if (!cop && inc.length && exc.length) {
      ns.add(`Uitsluiting ${exc.map((g) => `‘${g.name}’`).join(", ")} niet in het script: Purview ondersteunt per locatie óf ‘Include’ (specifieke groepen) óf ‘Exclude’ (bij ‘All’), niet beide. Alleen de insluiting is gezet – stel de uitsluiting zo nodig in het portal in.`);
      exc.length = 0;
    }
    const scoped = !cop && (inc.length || exc.length);
    const unscoped = scoped ? p.locations.filter((k) => !SCOPE_PS[k]).map((k) => (CATALOG.dlpLocations.find((x) => x.key === k) || {}).short || k) : [];
    if (scoped && [...inc, ...exc].some((g) => !g.value)) ns.add("Niet alle groepen hebben een e-mailadres/ID; vervang de <placeholders> vóór het uitvoeren.");
    if (unscoped.length && inc.length) scopeNote.push(`alleen voor: ${inc.map((g) => g.name).join(", ")} (locaties ${unscoped.join(", ")})`);
    if (unscoped.length && exc.length) scopeNote.push(`uitgezonderd: ${exc.map((g) => g.name).join(", ")} (locaties ${unscoped.join(", ")})`);
    if (cop && (inc.length || exc.length)) scopeNote.push(`groepen: ${[...inc, ...exc].map((g) => g.name).join(", ")}`);
    if ((p.adminUnits || []).length) scopeNote.push(`admin units: ${p.adminUnits.join(", ")}`);
    if (scopeNote.length) ns.add(`Scope beperken (${scopeNote.join("; ")}) – stel in via het portal.`);
    const parts = p.rules.map((r) => ({ r, ...(cop ? this.copilotParts(p, r, st) : this.ruleParts(p, r, st)) }));
    parts.forEach((x) => { x.notes.forEach((t) => ns.add(t, x.r.name)); x.info.forEach((t) => ns.add(t, x.r.name, true)); });
    if (!parts.some((x) => x.code)) {
      lines.push(`# LET OP: deze policy wordt NIET door het script aangemaakt: geen van de ${p.rules.length} regel(s) kan via PowerShell (een policy zonder regels heeft geen effect).`);
      lines.push(`#   Maak policy en regels in het portal: Purview › Data Loss Prevention › Policies › Create policy (modus: ${this.c((CATALOG.dlpModes.find((m) => m.key === p.mode) || {}).name || "simulatie")}).`);
      parts.forEach((x) => lines.push(`#   - ${this.c(this.ruleTitle(x.r))}: ${this.c(x.r.desc)}`));
      ns.list.forEach((e) => lines.push(`#   · ${this.c(e.t)}`));
      this.untodo(owner);
      this.todo(`volledig in het portal aanmaken (${p.rules.length} regel(s); zie sectie 5).`, owner);
      return lines.join("\n");
    }
    if (p.mode === "enable") lines.push("# Ontwerp: handhaven. Script zet de policy eerst in simulatie; daarna: Set-DlpCompliancePolicy -Identity <naam> -Mode Enable");
    this.emitNotes(ns, p.rules.length, owner, lines);
    if (cop) {
      lines.push(`$loc = '[{"Workload":"Applications","Location":"${PS_COPILOT_GUID}","Inclusions":[{"Type":"Tenant","Identity":"All"}]}]'`);
      lines.push(this.step(p.name, `New-DlpCompliancePolicy -Name ${this.q(p.name)} -Mode '${mode}' -Locations $loc -EnforcementPlanes @('CopilotExperiences')`, "DlpCompliancePolicy", p.name));
    } else {
      const kv = [["Name", this.q(p.name)], ["Mode", this.q(mode)]];
      if (p.desc) kv.push(["Comment", this.q(this.c(p.desc).slice(0, 1024))]);
      p.locations.forEach((k) => {
        const loc = CATALOG.dlpLocations.find((x) => x.key === k); if (!loc || !/^[A-Za-z]+$/.test(loc.ps)) return;
        const sp = SCOPE_PS[k], gv = (gs) => this.arr(gs.map((g) => this.grpValue(g)));
        if (sp && sp[0] === loc.ps && inc.length) kv.push([loc.ps, gv(inc)]); else kv.push([loc.ps, "'All'"]);
        if (sp && sp[0] !== loc.ps && inc.length) kv.push([sp[0], gv(inc)]);
        if (sp && exc.length) kv.push([sp[1], gv(exc)]);
      });
      lines.push(this.run(p.name, "p", kv, "New-DlpCompliancePolicy", "DlpCompliancePolicy", p.name));
    }
    parts.forEach((x) => { if (x.code) lines.push(x.code); else lines.push(`# ${this.c(this.ruleTitle(x.r))}: alleen via het portal (zie LET OP hierboven).`); });
    return lines.join("\n");
  },

  /* ---------- Endpoint-instellingen (commentaar) ---------- */
  endpointNotes(st) {
    const e = st.endpoint || {}, out = ["# Endpoint DLP settings worden via het portal beheerd: Purview › Settings › Data Loss Prevention › Endpoint DLP settings."];
    const yn = (v) => (v ? "aan" : "uit");
    const bw = e.bandwidthLimit === "unlimited" ? "onbeperkt" : `${this.n(e.bandwidthLimit, 0)} MB`;
    out.push(`#   Advanced classification scanning: ${yn(e.advancedClassification)}${e.advancedClassification ? ` (bandbreedte: ${bw})` : ""}`);
    out.push(`#   Always audit file activity for devices: ${yn(e.alwaysAudit)} · Network share coverage: ${yn(e.networkShareCoverage)} · Archive support: ${yn(e.archiveSupport)} · OCR: ${yn(e.ocr)}`);
    out.push(`#   Just-in-time protection: ${yn(e.jitProtection)} · Advanced label based protection: ${yn(e.advancedLabelProtection)} · Auto-quarantine: ${yn(e.autoQuarantine)}`);
    if (e.fileEvidence) out.push(`#   Bewijsmateriaal (evidence): ${e.evidenceStoreType === "microsoft" ? "Microsoft-managed storage" : `Azure storage ${this.c(e.evidenceStorage || "<URL>")}`} · cache ${this.n(e.evidenceCacheDays, 30)} dagen`);
    const list = (k, t) => { const v = (e[k] || []).filter(Boolean); if (v.length) out.push(`#   ${t}: ${this.c(v.join("; "))}`); };
    list("pathExclusionsWin", "File path exclusions (Windows)"); list("pathExclusionsMac", "File path exclusions (Mac)"); list("networkShareExclusions", "Network share exclusions");
    list("unallowedBrowsers", "Unallowed browsers"); list("serviceDomains", `Service domains (${e.serviceDomainMode === "allow" ? "Allow" : "Block"})`);
    list("restrictedApps", "Restricted apps"); list("unallowedBluetoothApps", "Unallowed Bluetooth apps"); list("vpnAddresses", "VPN-adressen");
    ["sensitiveDomainGroups", "restrictedAppGroups", "printerGroups", "usbGroups", "networkShareGroups"].forEach((k) => {
      const g = (e[k] || []).filter((x) => x && x.name);
      if (g.length) out.push(`#   ${k}: ${this.c(g.map((x) => `${x.name}${x.action ? ` (${x.action})` : ""}`).join("; "))}`);
    });
    const jm = { both: "Show default options and custom text box", default: "Only show default options", custom: "Only show custom text box" }[e.justificationMode] || "Show default options and custom text box";
    const j = (e.justificationOptions || []).filter(Boolean);
    out.push(`#   Business justification in policy tips (geldt voor alle endpointregels): ${jm}${j.length && e.justificationMode !== "custom" ? ` · opties: ${this.c(j.join(" | "))}` : ""}`);
    out.push("#     Geen gedocumenteerde PowerShell-parameter – instellen in het portal (Endpoint DLP settings › Business justification in policy tips).");
    this.todo(`Business justification-opties voor endpointregels instellen in het portal (${jm}).`);
    out.push("# Info: ‘Create Windows Recall snapshots’ (preview, Copilot+ PC’s) is een aparte endpointactiviteit; zo nodig instellen in het portal (Audit or restrict activities on devices).");
    return out.join("\n");
  },

  /* ---------- Randvoorwaarden: module per cmdlet ---------- */
  tenantLine(x) {
    const t = String(x || "").trim();
    if (!t) return null;
    if (/^#/.test(t)) return `[Portal] ${t.replace(/^#\s*/, "")}`;
    if (/AdminAuditLogConfig|IRMConfiguration/i.test(t)) return `[EXO] Connect-ExchangeOnline; ${t}`;
    if (/SPOTenant/i.test(t)) return `[SPO] Connect-SPOService -Url https://<tenant>-admin.sharepoint.com; ${t}`;
    if (/AipService/i.test(t)) return `[AIPService] ${/^Connect-AipService/i.test(t) ? t : `Connect-AipService; ${t}`}`;
    if (/Scanner/i.test(t)) return `[Scanner-server] ${t}`;
    return `[IPPS] ${t.replace(/^Connect-IPPSSession;\s*/i, "")}`;
  },

  /* ---------- Script ---------- */
  /** Variabelen, controles op placeholders, logbestand en verbinding (wordt ná de secties opgebouwd, zodat de groepentabel compleet is). */
  varsBlock(st, g) {
    const ar = this.alertRecipients(st);
    const usesAlert = g.dlpPolicies.some((p) => p.rules.some((r) => r.notify && ((r.notify.alert && r.notify.alert !== "none") || r.notify.incidentReport)));
    const out = [];
    out.push("# LET OP: tenants zonder labels of aangemaakt vanaf 1 oktober 2025 gebruiken het moderne labelschema met label groups (portal: + Create › Label group).");
    out.push("#         Dit script maakt labels met sublabels (ParentId, klassiek schema). Controleer vóór het uitvoeren welk schema je tenant gebruikt (Purview › Information Protection › Sensitivity labels).");
    this.todo("Controleer of de tenant het moderne labelschema met label groups gebruikt (tenants vanaf 1 okt 2025); maak de groepering dan in het portal en controleer de labelvolgorde.");
    out.push("");
    out.push("$AdminUpn       = 'admin@<tenant>.onmicrosoft.com'   # beheerdersaccount");
    out.push("$TenantDomain   = '<tenant>.onmicrosoft.com'          # 'alle gebruikers in de organisatie' bij encryptie");
    if (ar.ok.length) out.push(`$AlertRecipient = ${this.arr(ar.ok)}   # ontvanger(s) van DLP-alerts en incidentrapporten`);
    else {
      out.push("$AlertRecipient = 'SiteAdmin'   # LET OP: geen ontvanger vastgelegd – vul e-mailadres(sen) in, bijv. @('soc@klant.nl', 'privacy@klant.nl')");
      if (usesAlert) this.todo("Ontvanger(s) van DLP-alerts en incidentrapporten vastleggen (nu ‘SiteAdmin’); pas $AlertRecipient aan of stel de ontvangers in het portal in.");
    }
    if (ar.bad.length) out.push(`# LET OP: ongeldig e-mailadres voor alerts overgeslagen: ${this.c(ar.bad.join(", "))}`);
    if (g.dlpPolicies.some((p) => (p.locations || []).includes("copilot"))) this.todo("DLP voor Microsoft 365 Copilot: gebruikersmeldingen (User notifications) stel je zo nodig in het portal in – het script zet ze niet aan.");
    const grp = [...(this._grp || new Map()).entries()];
    if (grp.length) {
      const w = Math.max(...grp.map(([k]) => this.q(this.c(k)).length));
      out.push("", "# Groepen en adressen uit het ontwerp (dezelfde waarden staan in de stappen hieronder).", "$Groups = [ordered]@{");
      grp.forEach(([k, v]) => out.push(`  ${this.q(this.c(k)).padEnd(w)} = ${this.q(v)}`));
      out.push("}");
    }
    out.push("");
    out.push("# Stop direct als er nog <placeholders> in staan.");
    out.push("if ($AdminUpn -match '<' -or $TenantDomain -match '<') { throw 'Vul eerst $AdminUpn en $TenantDomain in (bovenaan dit script).' }");
    if (grp.length) {
      out.push("$open = @($Groups.GetEnumerator() | Where-Object { [string]$_.Value -match '<' } | ForEach-Object { $_.Key })");
      out.push("if ($open.Count) { throw \"Groep(en) zonder e-mailadres: $($open -join ', '). Vul ze in de Workshop Designer in (Doelgroepen) en exporteer opnieuw, of vervang alle <placeholders> in dit script.\" }");
    }
    out.push("");
    out.push("# Logbestand bewaren als bewijs van uitvoering (BIO 8.15 Logging).");
    out.push("$LogFile = Join-Path (Get-Location) ('Purview-IP-DLP-{0:yyyyMMdd-HHmm}.log' -f (Get-Date))");
    out.push("Start-Transcript -Path $LogFile | Out-Null");
    out.push("try { Connect-IPPSSession -UserPrincipalName $AdminUpn -ErrorAction Stop } catch { Stop-Transcript | Out-Null; throw }");
    return out.join("\n");
  },
  build(st = S()) {
    st = customerState(st);
    this._todo = [];
    this._grp = new Map();
    const g = Generator.all(st);
    const L = [];
    const cust = st.meta.customer || "(klant)";
    L.push(`<#
  Protect your Data – Information Protection & DLP
  Klant      : ${this.c(cust)}
  Datum      : ${this.c(st.meta.date || today())}
  Status     : ${Validation.isConcept(st) ? "CONCEPT - voorgesteld ontwerp; open punten nog afhandelen" : "Voorgesteld ontwerp; werking in de tenant niet geverifieerd"}
  Gegenereerd: ${new Date().toISOString().slice(0, 16).replace("T", " ")} met de Pink Elephant Workshop Designer

  LET OP: VOORGESTELDE UITVOER
  - Dit script is een voorstel op basis van het workshopontwerp. Er is nog niets in de tenant geconfigureerd.
  - Het draait niet automatisch: review het volledig en test het in een test- of pilot-tenant voordat je het uitvoert.
  - Bij uitvoeren worden sensitivity labels en labelbeleid (label policies) WEL aangemaakt en gepubliceerd; dit is geen dry-run.
  - Alleen DLP- en auto-labelingpolicies starten in SIMULATIE. Handhaven zet je later zelf aan.

  WAT DOET DIT SCRIPT
  - Maakt custom SIT's, sensitivity labels, labelbeleid, auto-labeling en DLP-policies volgens het workshopontwerp.
  - Bestaat een object al (zelfde naam), dan wordt de stap overgeslagen ([SKIP]); controleer zelf of bestaande instellingen overeenkomen.
  - Instellingen zonder gedocumenteerde PowerShell-syntax staan als '# LET OP' commentaar en in de PORTAL-CHECKLIST onderaan.

  GEBRUIK
  1. Lees het script door en test eerst in een test- of pilot-tenant.
  2. Vul de variabelen hieronder in.
  3. Rollen: Compliance Administrator (of Information Protection Admin + DLP Compliance Management).
  4. Voer uit in PowerShell 7 met de module ExchangeOnlineManagement (Install-Module ExchangeOnlineManagement).
#>
#Requires -Modules ExchangeOnlineManagement`);
    L.push(`# Elke cmdlet (ook de proxyfuncties van Connect-IPPSSession) stopt bij een fout, zodat Step de fout afvangt en meldt.
# De oorspronkelijke standaardwaarden worden aan het eind hersteld.
$prevDefaults = $PSDefaultParameterValues.Clone()
$PSDefaultParameterValues['*:ErrorAction'] = 'Stop'
$script:Errors  = 0
$script:Skipped = 0
$script:Known   = @{}

# Bestaat er al een object met deze naam? Bewust geen Get-* -Identity: een lege of onbekende Identity geeft ALLE objecten terug.
function Test-Exists([string]$Kind, [string]$Name) {
  if (-not $script:Known.ContainsKey($Kind)) {
    try { $script:Known[$Kind] = @(& "Get-$Kind" | ForEach-Object { [string]$_.Name }) }
    catch { Write-Warning "Kan bestaande objecten ($Kind) niet ophalen: $($_.Exception.Message)"; $script:Known[$Kind] = @() }
  }
  return ($script:Known[$Kind] -contains $Name)
}
function Step([string]$Name, [scriptblock]$Do, [string]$Kind = '', [string]$Id = '') {
  if ($Kind -and (Test-Exists $Kind $Id)) { $script:Skipped++; Write-Host "[SKIP] $Name - bestaat al" -ForegroundColor Yellow; return }
  try {
    & $Do | Out-Null
    if ($Kind) { $script:Known[$Kind] += $Id }
    Write-Host "[OK]   $Name" -ForegroundColor Green
  }
  catch { $script:Errors++; Write-Warning "[FOUT] $Name - $($_.Exception.Message)" }
}
function LabelId([string]$Name) {
  $l = @(Get-Label | Where-Object { $_.Name -eq $Name })
  if ($l.Count -ne 1) { throw "Label '$Name' niet (eenduidig) gevonden." }
  [string]$l[0].Guid
}`);

    // 0. Randvoorwaarden
    L.push(this.section("0. Randvoorwaarden (tenant) – controleer of voer uit in de aangegeven module"));
    L.push("# Modules: [EXO] Connect-ExchangeOnline (ExchangeOnlineManagement) · [SPO] Connect-SPOService (Microsoft.Online.SharePoint.PowerShell)\n#          [AIPService] Connect-AipService (AIPService) · [IPPS] deze sessie · [Scanner-server] op de scannerserver · [Portal] handmatig");
    const checks = CATALOG.tenantChecks.filter((c) => { try { return c.when(st); } catch (e) { return false; } });
    const tc = [];
    checks.forEach((c) => {
      const s = ((st.tenant.checks || {})[c.id] || {}).status || "todo", closed = ["done", "na"].includes(s);
      tc.push(`# [${s === "done" ? "x" : s === "na" ? "-" : " "}] ${this.c(c.name)}${c.req ? " (vereist)" : ""}${s === "na" ? " (n.v.t.)" : ""} – ${this.c(c.desc)}`);
      if (c.ps) String(c.ps).split("\n").map((x) => this.tenantLine(x)).filter(Boolean).forEach((x) => tc.push(`#       ${this.c(x)}`));
      if (c.req && !closed) this.todo(c.name, "Vereiste randvoorwaarden afronden (zie sectie 0)");
    });
    L.push(tc.length ? tc.join("\n") : "# Geen randvoorwaarden voor dit ontwerp.");

    // 1. SIT's
    L.push(this.section("1. Custom sensitive information types"));
    L.push(this.sitPackage(st));
    const other = st.sits.filter((s) => ["edm", "fingerprint", "classifier"].includes(s.kind));
    if (other.length) {
      const ol = ["# Overige classifiers (aanmaken via het portal):"];
      other.forEach((s) => {
        const kind = (CATALOG.sitKinds[s.kind] || {}).name || s.kind;
        ol.push(`#   - ${this.c(s.name)} (${this.c(kind)})`);
        this.todo(`${s.name} (${kind})`, "Classifiers aanmaken/controleren in het portal (Data classification › Classifiers)");
      });
      L.push(ol.join("\n"));
    }

    // 2. Labels
    L.push(this.section("2. Sensitivity labels (volgorde = prioriteit, laag → hoog)"));
    if (!g.labels.length) L.push("# Geen labels in dit ontwerp.");
    g.labels.forEach((gl) => L.push(this.labelBlock(gl, st)));

    // 3. Labelbeleid
    L.push(this.section("3. Labelbeleid (publicatie)"));
    L.push("# Labels zijn na publicatie binnen ~24 uur zichtbaar in de Office-apps.");
    g.labelPolicies.forEach((gp) => L.push(this.policyBlock(gp, st)));

    // 4. Auto-labeling
    L.push(this.section("4. Auto-labeling (service-side) – simulatie"));
    if (!g.autoPolicies.length) L.push("# Geen auto-labelingpolicies in dit ontwerp.");
    g.autoPolicies.forEach((ap) => L.push(this.autoBlock(ap, st)));
    const client = applicableLabels(st).filter((l) => l.cfg.autolabel.client.mode !== "off");
    if (client.length) {
      const cl = ["# Client-side auto-labeling (aanbevelen/automatisch in Office) wordt per label ingesteld in het portal:"];
      client.forEach((l) => cl.push(`#   - ${this.c(labelFullName(l, st))}: ${this.c(l.cfg.autolabel.client.mode)} · ${this.c(labelSits(l, st).map((s) => s.name).join("; ") || "(geen SIT's)")}`));
            L.push(cl.join("\n"));
            this.todo(`Client-side auto-labeling instellen per label in het portal (${client.length} label${client.length === 1 ? "" : "s"}; zie sectie 4).`);
    }

    // 5. DLP
    L.push(this.section("5. Data Loss Prevention – simulatie"));
    if (!g.dlpPolicies.length) L.push("# Geen DLP-policies in dit ontwerp.");
    g.dlpPolicies.forEach((p) => L.push(this.dlpBlock(p, st)));

    // 6. Endpoint
    if (g.dlpPolicies.some((p) => p.locations.includes("devices"))) {
      L.push(this.section("6. Endpoint DLP-instellingen (portal)"));
      L.push(this.endpointNotes(st));
      this.todo("Endpoint DLP-instellingen in het portal instellen (zie sectie 6).");
    }
    const enable = [...g.autoPolicies.filter((p) => p.mode === "enable"), ...g.dlpPolicies.filter((p) => p.mode === "enable")].map((p) => p.name);
    if (enable.length) this.todo(`Na evaluatie van de simulatie inschakelen (-Mode Enable): ${enable.join("; ")}.`);

    L.splice(1, 0, this.varsBlock(st, g));

    // Checklist
    L.push(this.section("PORTAL-CHECKLIST – handmatige stappen na (of vóór) het uitvoeren"));
    L.push(this.checklist());

    L.push(`
Write-Host ''
if ($script:Skipped) { Write-Host "$($script:Skipped) stap(pen) overgeslagen omdat het object al bestaat." -ForegroundColor Yellow }
if ($script:Errors) { Write-Warning "$($script:Errors) stap(pen) mislukt – zie de meldingen hierboven." }
else { Write-Host 'Klaar. Loop de PORTAL-CHECKLIST onderaan het script na en evalueer de simulatie (Activity explorer, DLP-alerts).' -ForegroundColor Cyan }

$PSDefaultParameterValues.Clear()
foreach ($k in $prevDefaults.Keys) { $PSDefaultParameterValues[$k] = $prevDefaults[$k] }
Stop-Transcript | Out-Null
Write-Host "Logbestand (bewaren als bewijs): $LogFile"`);
    return L.join("\n\n").replace(/\n{3,}/g, "\n\n") + "\n";
  },

  download() {
    const st = S();
    downloadText(this.build(st), this.fileName(st), "text/plain;charset=utf-8");
    Toast.show("PowerShell-download gestart. Uitvoeren wijzigt labels en beleid; alleen DLP en auto-labeling starten in simulatie.", "warn", 8000);
  },
};
