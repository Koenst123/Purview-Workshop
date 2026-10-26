/* Validatie: controleert het ontwerp op Purview-limieten, inconsistenties en ontbrekende randvoorwaarden.
   Uitkomst: [{level: err|warn|info, route, title, desc, labelId?, key?, sub?}] gesorteerd op ernst. */
const Validation = {
  _memo: { key: null, val: null },

  run(st = S()) {
    const m = st.meta || {};
    const key = JSON.stringify([st.labels, st.sits, st.groups, st.labelPolicies, st.dlpSettings, st.customDlp, st.endpoint, st.tenant, m.prefix, m.sector, m.framework, st.customScenarios]);
    if (this._memo.key === key) return this._memo.val;
    const out = [];
    const add = (ruleId, level, route, title, desc, extra = {}) => {
      const source = CATALOG.validationSources?.[ruleId];
      const refs = { schema: "labelsCreate", labels: "labels", policies: "labelsCreate", sits: "sitLearn", autolabel: "labelsAuto", dlp: "dlpReference", endpoint: "endpointSettings", tenant: "labelsGetStarted", board: "dlpDesign" };
      out.push({ ruleId, level, route, title, desc, blocking: level === "err",
        category: extra.todo ? "tenantvoorwaarde" : level === "err" ? "technisch" : level === "warn" ? "risico" : "aandachtspunt",
        nextAction: desc, source: CATALOG.learn[source?.ref || refs[route]]?.url || "",
        verifiedAt: source?.date || "", verification: source ? "geverifieerd" : "niet afzonderlijk geverifieerd", ...extra });
    };
    try {
      this.schema(st, add);
      this.sits(st, add);
      this.labels(st, add);
      this.policies(st, add);
      this.dlp(st, add);
      this.endpoint(st, add);
      this.tenant(st, add);
      this.integral(st, add);
    } catch (e) {
      console.error(e);
      add("PV-001", "err", "export", "Validatie kon niet volledig worden uitgevoerd", String(e && e.message || e));
    }
    const rank = { err: 0, warn: 1, info: 2 };
    out.sort((a, b) => rank[a.level] - rank[b.level]);
    this._memo = { key, val: out };
    return out;
  },
  counts(st = S()) {
    const r = this.run(st);
    return { err: r.filter((x) => x.level === "err").length, warn: r.filter((x) => x.level === "warn").length, info: r.filter((x) => x.level === "info").length };
  },
  isConcept(st = S()) {
    return st.meta.status !== "final" || this.readiness(st).rollout.pct < 100
      || (st.decisions || []).some((d) => ["open", "bespreken"].includes(decisionStatus(d)));
  },

  /* ---------- Classificatieschema ---------- */
  schema(st, add) {
    if (!st.labels.length) { add("PV-002", "err", "schema", "Nog geen labels", "Begin met het classificatieschema: voeg labels toe of kies een startpunt."); return; }
    const enc = st.labels.filter((l) => l.cfg.encryption.mode === "assignNow").length;
    if (enc > 500) add("PV-003", "err", "schema", "Te veel labels met encryptie", `${enc} labels met ‘Assign permissions now’; maximaal 500 per tenant.`);
    st.labels.forEach((l) => {
      const p = parentOf(l, st);
      const lid = { labelId: l.id };
      if (p && p.parentId) add("PV-004", "err", "schema", `‘${l.name}’ is een sub-sublabel`, "Purview ondersteunt maar één niveau sublabels.", lid);
      if (!String(l.name || "").trim()) add("PV-005", "err", "schema", "Label zonder naam", "Elk label heeft een (unieke, onwijzigbare) Name nodig.", lid);
      if ((l.displayName || "").length > 64) add("PV-006", "warn", "schema", `Weergavenaam van ‘${l.name}’ is lang`, "Houd de display name kort (max. 64 tekens) zodat hij in de Sensitivity-knop past.", lid);
      if ((l.tooltip || "").length > 1000) add("PV-007", "err", "schema", `Tooltip van ‘${l.name}’ te lang`, "Maximaal 1.000 tekens.", lid);
      if (!(l.tooltip || "").trim()) add("PV-008", "warn", "schema", `‘${labelFullName(l, st)}’ heeft geen tooltip`, "De tooltip is verplicht in het portal en helpt gebruikers het juiste label te kiezen.", lid);
      const kids = childrenOf(l.id, st);
      if (kids.length === 1) add("PV-009", "info", "schema", `‘${l.name}’ heeft maar één sublabel`, "Een parent met één sublabel voegt een extra klik toe; overweeg een los label.", lid);
    });
    const names = st.labels.map((l) => labelTechName(l, st).toLowerCase());
    unique(names.filter((n, i) => names.indexOf(n) !== i)).forEach((n) => add("PV-010", "err", "schema", "Dubbele technische labelnaam", `‘${n}’ komt meerdere keren voor; Name moet uniek zijn in de tenant.`));
    const disp = st.labels.map((l) => String(l.displayName || l.name || "").trim().toLowerCase());
    unique(disp.filter((n, i) => n && disp.indexOf(n) !== i)).forEach((n) => {
      const ls = st.labels.filter((l) => String(l.displayName || l.name || "").trim().toLowerCase() === n);
      // Zelfde sublabelnaam onder verschillende parents (bijv. ‘Vertrouwelijk / Alle medewerkers’ en ‘Zeer vertrouwelijk / Alle medewerkers’) is gangbaar.
      const parents = ls.map((l) => l.parentId || "");
      if (!parents.includes("") && unique(parents).length === parents.length) return;
      add("PV-011", "warn", "schema", `Dubbele weergavenaam ‘${ls[0].displayName || ls[0].name}’`, `Twee labels hebben dezelfde weergavenaam ‘${ls[0].displayName || ls[0].name}’; gebruikers zien dit label twee keer (${ls.map((l) => labelFullName(l, st)).join(" en ")}). Geef één label een onderscheidende naam.`, { labelId: ls[1].id });
    });
    st.labels.forEach((l) => {
      const lid = { labelId: l.id };
      const own = String(l.name || "").replace(/[^\p{L}\p{N}\-_ ]/gu, "").replace(/^[\s\-_]+|[\s\-_]+$/g, "");
      if (String(l.name || "").trim() && !own) add("PV-012", "err", "schema", `Technische naam van ‘${l.displayName || l.name}’ is leeg`, "De naam bevat alleen leestekens; Purview heeft een Name met letters of cijfers nodig. Pas de labelnaam aan.", lid);
      const tn = labelTechName(l, st);
      if (tn.length > 64) add("PV-013", "err", "schema", `Technische naam van ‘${labelFullName(l, st)}’ te lang`, `‘${tn}’ is ${tn.length} tekens; Purview staat maximaal 64 tekens toe voor de Name. Kort de (parent)naam of het prefix in.`, lid);
    });
  },

  /* ---------- Informatietypen ---------- */
  sits(st, add) {
    const used = new Set(st.labels.flatMap((l) => l.sits || []));
    (st.customDlp || []).forEach((p) => (p.rules || []).forEach((r) => (r.sits || []).forEach((s) => used.add(s))));
    st.sits.forEach((s) => {
      const k = { key: s.id };
      if (!used.has(s.id)) add("PV-014", "info", "sits", `‘${s.name}’ is niet gekoppeld`, "Dit informatietype hangt aan geen label of DLP-regel en wordt niet gebruikt.", k);
      if (s.kind === "custom") {
        if (!s.regex && !(s.keywords || []).length) add("PV-015", "err", "sits", `Custom SIT ‘${s.name}’ zonder patroon`, "Een custom SIT heeft een regex of keyword list nodig als primary element.", k);
        if (s.regex) {
          try { new RegExp(s.regex); } catch (e) { add("PV-016", "err", "sits", `Ongeldige regex in ‘${s.name}’`, String(e.message), k); }
          if (/(^|[^\\])[\^$]/.test(s.regex)) add("PV-017", "warn", "sits", `Regex van ‘${s.name}’ bevat ^ of $`, "Purview matcht binnen tekst; ankers zorgen vaak voor geen enkele match. Gebruik woordgrenzen (\\b).", k);
          if (s.regex.length > 1024) add("PV-018", "err", "sits", `Regex van ‘${s.name}’ te lang`, "Maximaal 1.024 tekens per regex.", k);
          if (!(s.keywords || []).length) add("PV-019", "warn", "sits", `‘${s.name}’: regex zonder keywords`, "Zonder supporting keywords (proximity) geeft een regex snel false positives; gebruik keywords voor High confidence.", k);
        }
        if ((s.keywords || []).some((w) => w.length > 50)) add("PV-020", "err", "sits", `Keyword in ‘${s.name}’ te lang`, "Maximaal 50 tekens per keyword.", k);
        const short = (s.keywords || []).map((w) => String(w || "").trim()).filter((w) => w && w.length <= 3);
        if (short.length) add("PV-021", "warn", "sits", `‘${s.name}’: korte keywords (${short.slice(0, 4).join(", ")})`, "Korte keywords (zoals ‘OM’) geven veel false positives; gebruik liever ‘Openbaar Ministerie’.", k);
        if (s.regex && /\((?:[^()\\]|\\.)*[+*](?:[^()\\]|\\.)*\)\s*(?:[+*]|\{\d*,?\d*\})/.test(s.regex)) add("PV-022", "warn", "sits", `Regex van ‘${s.name}’: geneste herhaling`, "Een herhaalde groep met daarbinnen + of * (bijv. (a+)+) kan bij lange tekst extreem traag worden (ReDoS) en de tool of de scan laten vastlopen. Herschrijf zonder geneste kwantoren.", k);
      }
      if (s.kind === "edm" && !(s.fields || []).some((f) => f.searchable)) add("PV-023", "err", "sits", `EDM ‘${s.name}’ zonder searchable field`, "Een EDM-schema heeft 1–10 searchable fields nodig (bijv. BSN, patiëntnummer).", k);
    });
  },

  /* ---------- Labels ---------- */
  labels(st, add) {
    const pols = Generator.all(st).labelPolicies;
    applicableLabels(st).forEach((l) => {
      const c = l.cfg, nm = labelFullName(l, st), lid = { labelId: l.id };
      if (!Object.values(c.scope).some(Boolean)) add("PV-024", "err", "labels", `‘${nm}’ heeft geen scope`, "Kies minstens één scope (Files & other data assets, Emails, Meetings, Groups & sites).", { ...lid, sub: "scope" });
      if (c.scope.meetings && (!c.scope.files || !c.scope.emails)) add("PV-025", "err", "labels", `‘${nm}’: Meetings vereist Files en Emails`, "In Purview kan de scope Meetings alleen samen met Files en Emails worden gekozen.", { ...lid, sub: "scope" });
      if (!pols.some((p) => p.labels.includes(l))) add("PV-026", "warn", "policies", `‘${nm}’ is niet gepubliceerd`, "Het label staat in geen labelbeleid; gebruikers kunnen het niet kiezen.", lid);
      if (c.publish.audience === "groups" && !c.publish.groups.length) add("PV-027", "err", "policies", `‘${nm}’: geen doelgroep`, "Publicatie ‘Alleen specifieke groep(en)’ zonder groep.", lid);
      // Eén melding per label voor ontbrekende groepen (publicatie én encryptie), i.p.v. twee dubbele.
      const grpVal = (p) => p.value || (p.groupId && (byId(st.groups, p.groupId) || {}).value);
      const pubMiss = (c.publish.groups || []).map((g) => byId(st.groups, g)).filter((x) => x && x.kind === "group" && !x.value);
      const encMiss = c.encryption.mode === "assignNow" ? (c.encryption.permissions || []).filter((p) => (p.type === "group" || p.type === "user") && !grpVal(p)) : [];
      if (pubMiss.length || encMiss.length) {
        const gn = unique([...pubMiss.map((x) => x.name), ...encMiss.map((p) => (p.groupId && (byId(st.groups, p.groupId) || {}).name) || Mapping.principalName(p, st))]);
        const why = [pubMiss.length && "wie het label ziet", encMiss.length && "wie het kan openen"].filter(Boolean).join(" en ");
        add("PV-028", "warn", encMiss.length ? "labels" : "schema", `‘${nm}’: groep nog invullen`, `Vul de (mail-enabled) security group in voor ${gn.map((n) => `‘${n}’`).join(", ")}, bijv. sg-hr@bedrijf.nl. Bepaalt ${why}.`, encMiss.length ? { ...lid, sub: "encryption" } : lid);
      }

      // Encryptie
      const e = c.encryption;
      if (e.mode !== "none" && !c.scope.files && !c.scope.emails && !c.scope.meetings) add("PV-029", "warn", "labels", `‘${nm}’: encryptie zonder Files/Emails`, "Encryptie geldt alleen voor bestanden, e-mail en meetings.", { ...lid, sub: "encryption" });
      if (e.mode === "assignNow") {
        if (!e.permissions.length) add("PV-030", "err", "labels", `‘${nm}’: encryptie zonder rechten`, "Bij ‘Assign permissions now’ moet minstens één gebruiker/groep/domein rechten krijgen.", { ...lid, sub: "encryption" });
        e.permissions.forEach((p) => {
          const g = p.groupId ? byId(st.groups, p.groupId) : null;
          if (p.type === "domain" && !(p.value || (g && g.value))) add("PV-031", "warn", "labels", `‘${nm}’: domein nog invullen`, `Rechthebbende ‘${Mapping.principalName(p, st)}’ heeft nog geen domein.`, { ...lid, sub: "encryption" });
          if (p.level === "Custom" && !(p.rights || []).length) add("PV-032", "err", "labels", `‘${nm}’: Custom zonder rechten`, "Kies minstens één usage right (bijv. View, Open, Read).", { ...lid, sub: "encryption" });
        });
        if (e.permissions.some((p) => p.type === "authenticated")) add("PV-033", "info", "labels", `‘${nm}’: any authenticated users`, "Iedereen met een Microsoft- of Entra-account kan openen. Dit beperkt niet wie leest, maar wel wat iemand mag doen.", { ...lid, sub: "encryption" });
        const org = e.permissions.find((p) => p.type === "org");
        if (org && ["Viewer", "Reviewer"].includes(org.level)) add("PV-034", "info", "labels", `‘${nm}’: Copilot kan niet samenvatten`, "Rechten zonder EXTRACT (Copy) betekenen dat Copilot de inhoud niet gebruikt voor deze gebruikers. Bewust zo?", { ...lid, sub: "encryption" });
        if (e.dke && c.autolabel.service.enabled) add("PV-035", "err", "autolabel", `‘${nm}’: DKE met service-side auto-labeling`, "Service-side auto-labeling ondersteunt geen labels met Double Key Encryption.", lid);
        if (e.dke && c.scope.meetings) add("PV-036", "err", "labels", `‘${nm}’: DKE niet voor meetings`, "Double Key Encryption wordt niet ondersteund voor Teams-meetings.", { ...lid, sub: "encryption" });
        if ((e.expiry.type !== "never" || e.dke) && st.tenant.checks.coauth && st.tenant.checks.coauth.status === "done") add("PV-037", "info", "labels", `‘${nm}’: geen co-authoring`, "Versleutelde bestanden met expiry of DKE ondersteunen geen co-authoring/AutoSave.", { ...lid, sub: "encryption" });
      }
      if (e.mode === "userDefined") {
        if (c.autolabel.service.enabled) add("PV-038", "err", "autolabel", `‘${nm}’: door gebruiker bepaalde rechten + service-side`, "Labels met ‘Let users assign permissions’ kunnen niet service-side automatisch worden toegepast.", lid);
        else if (c.autolabel.client.mode === "auto") add("PV-039", "warn", "autolabel", `‘${nm}’: door gebruiker bepaalde rechten + automatisch`, "Bij automatisch toepassen in Office krijgt de gebruiker alsnog de rechtenprompt (Word/Excel/PowerPoint) of wordt Do Not Forward toegepast.", lid);
        if (e.userDefined.outlook === "none" && !e.userDefined.office) add("PV-040", "err", "labels", `‘${nm}’: geen opties voor gebruikersrechten`, "Kies Do Not Forward/Encrypt-Only voor Outlook en/of de rechtenprompt in Word, PowerPoint en Excel.", { ...lid, sub: "encryption" });
      }

      // Markering
      const m = c.marking;
      [["header", 1024], ["footer", 1024], ["watermark", 255]].forEach(([k, max]) => {
        const x = m[k];
        if (!x.enabled) return;
        if (!(x.text || "").trim()) add("PV-041", "err", "labels", `‘${nm}’: ${k} zonder tekst`, "Vul de markeringstekst in.", { ...lid, sub: "marking" });
        if ((x.text || "").length > max) add("PV-042", "err", "labels", `‘${nm}’: ${k} te lang`, `Maximaal ${max} tekens.`, { ...lid, sub: "marking" });
        const t = String(x.text || ""), opens = (t.match(/\$\{If\.App\./g) || []).length, ends = (t.match(/\$\{If\.End\}/g) || []).length;
        if (opens !== ends) add("PV-043", "err", "labels", `‘${nm}’: ${k} – \${If.App…} niet afgesloten`, "Elke ${If.App.<app>} moet worden afgesloten met ${If.End}; anders toont Office de markering niet of verkeerd.", { ...lid, sub: "marking" });
        if (!/^#[0-9a-f]{6}$/i.test(String(x.color || ""))) add("PV-044", "err", "labels", `‘${nm}’: ${k} – ongeldige kleur`, "Gebruik een HEX-kleurcode zoals #000000.", { ...lid, sub: "marking" });
        if (!(CATALOG.markingFonts || []).includes(x.font)) add("PV-045", "err", "labels", `‘${nm}’: ${k} – lettertype niet toegestaan`, `Kies een van: ${(CATALOG.markingFonts || []).join(", ")}.`, { ...lid, sub: "marking" });
      });
      if (m.header.enabled && m.footer.enabled && (m.header.text.length + m.footer.text.length) > 255) add("PV-046", "info", "labels", `‘${nm}’: Excel kapt markering af`, "Excel ondersteunt max. 255 tekens voor header en footer samen.", { ...lid, sub: "marking" });

      // Auto-labeling
      const al = c.autolabel, sits = labelSits(l, st);
      if ((al.client.mode !== "off" || al.service.enabled) && !sits.length) add("PV-047", "err", "autolabel", `‘${nm}’: auto-labeling zonder informatietypen`, "Koppel SIT’s of classifiers aan het label (Herkenning).", lid);
      if (al.service.enabled && !al.service.exchange && !al.service.sharepoint && !al.service.onedrive) add("PV-048", "err", "autolabel", `‘${nm}’: service-side zonder locaties`, "Kies Exchange, SharePoint en/of OneDrive.", lid);
      if (al.service.enabled && al.service.mode === "enable") add("PV-049", "info", "autolabel", `‘${nm}’: service-side direct aan`, "Microsoft adviseert eerst minimaal enkele dagen simulatie te draaien en de resultaten te beoordelen.", lid);
      if (al.service.enabled && sits.some((s) => s.kind === "object")) add("PV-050", "info", "autolabel", `‘${nm}’: informatieobjecten zijn geen classifiers`, "Informatieobjecten (bijv. ‘Patiëntdossier’) zijn beschrijvend; vertaal ze naar SIT’s, EDM of trainable classifiers.", lid);
      if (al.service.enabled && al.service.exchange && al.service.encryptExternalMail && !String(al.service.rmsOwner || "").trim()) add("PV-051", "err", "autolabel", `‘${nm}’: Rights Management owner ontbreekt`, "Bij encryptie van binnenkomende externe mail is een Rights Management owner (mailbox in de tenant) verplicht.", lid);
      if (al.client.mode !== "off") {
        const mn = Validation._count(al.client.minCount), mx = Validation._count(al.client.maxCount, true);
        if (mn === null) add("PV-052", "err", "autolabel", `‘${nm}’: ongeldig minimum aantal (Office)`, "Instance count ‘from’ moet een geheel getal van 1 of hoger zijn.", { ...lid, sub: "autolabel" });
        if (mx === null) add("PV-053", "err", "autolabel", `‘${nm}’: ongeldig maximum aantal (Office)`, "Instance count ‘to’ moet een geheel getal zijn of ‘any’.", { ...lid, sub: "autolabel" });
        else if (mn !== null && mx !== "any" && mx < mn) add("PV-054", "err", "autolabel", `‘${nm}’: maximum kleiner dan minimum (Office)`, `Instance count ‘to’ (${mx}) is kleiner dan ‘from’ (${mn}).`, { ...lid, sub: "autolabel" });
      }

      // Containers
      if (c.scope.sites) {
        const t = c.container;
        if (t.unmanaged !== "full") add("PV-055", "info", "tenant", `‘${nm}’: onbeheerde apparaten`, "Vereist een Conditional Access-beleid met ‘Use app enforced restrictions’ voor SharePoint.", lid);
        if (t.externalUserAccess === false && ["ExternalUserAndGuestSharing", "ExternalUserSharingOnly"].includes(t.sharing)) add("PV-056", "warn", "labels", `‘${nm}’: geen gasten maar wel extern delen`, "Gasten mogen niet in het team, maar bestanden mogen wel extern gedeeld worden. Bewust?", { ...lid, sub: "container" });
      }
      // Meetings (Teams Premium)
      if (c.scope.meetings && (c.meetings.e2ee || c.meetings.watermarkScreen || c.meetings.watermarkVideo)) add("PV-057", "info", "tenant", `‘${nm}’: Teams Premium nodig`, "Extra licentie: Teams Premium (niet in E5). Watermerk en end-to-end encryptie werken alleen voor organisatoren met Teams Premium.", lid);

      // Integraal: encryptie vs. DLP
      if (e.mode === "assignNow" && !e.permissions.some((p) => p.type !== "org") && c.dlp.exchange.action === "encrypt") add("PV-058", "warn", "dlp", `‘${nm}’: DLP-encryptie bij al versleutelde inhoud`, "Het label geeft alleen de organisatie rechten. Ga er niet van uit dat DLP ‘Encrypt’ externe toegang regelt: al versleutelde bijlagen behouden hun oorspronkelijke encryptie. Test bericht én bijlagen met een externe ontvanger.", lid);
      if (e.mode === "assignNow" && e.permissions.every((p) => p.type === "org") && c.dlp.exchange.action === "off") add("PV-059", "info", "dlp", `‘${nm}’: externen kunnen niet openen`, "Versleuteld voor alleen de organisatie: externe ontvangers krijgen een onleesbare mail. Overweeg een DLP-policy tip om gebruikers te waarschuwen.", lid);
    });

    Mapping.monotonicIssues(st).forEach((x) => {
      const row = CATALOG.boardRows.find((r) => r.key === x.domain);
      const dn = row ? row.name : x.domain;
      add("PV-060", "warn", "board", `${dn}: ‘${labelFullName(x.label, st)}’ minder streng dan ‘${labelFullName(x.lower, st)}’`, `Op ‘${dn}’ is een gevoeliger label minder streng (niveau ${x.lv} < ${x.maxLv}).`, { labelId: x.label.id, key: x.domain });
    });
  },

  /* ---------- Labelbeleid ---------- */
  policies(st, add) {
    const gen = Generator.all(st).labelPolicies;
    gen.forEach((g) => {
      const p = g.policy, s = p.settings, k = { key: p.id };
      if (!g.labels.length) add("PV-061", "warn", "policies", `‘${p.name}’ bevat geen labels`, "Een labelbeleid zonder labels heeft geen effect.", k);
      g.labels.filter((l) => hasChildren(l, st)).forEach((l) => {
        if (!childrenOf(l.id, st).some((c) => g.labels.includes(c))) add("PV-062", "warn", "policies", `‘${p.name}’: ‘${labelFullName(l, st)}’ zonder sublabels gepubliceerd`, "Het beleid publiceert de parent maar geen van zijn sublabels; gebruikers zien dan een groep zonder kiesbare labels. Publiceer minstens één sublabel mee.", k);
      });
      if (s.helpLink) {
        const hl = String(s.helpLink).trim();
        if (!/^(https:\/\/[^\s]+|mailto:[^\s]+)$/i.test(hl)) add("PV-063", "err", "policies", `‘${p.name}’: ongeldige help-link`, "De link naar de eigen helppagina moet een https://-adres of een mailto:-adres zijn (http:// en andere schema’s worden niet geaccepteerd).", k);
      }
      if (p.scope === "groups" && !(p.groups || []).length) add("PV-064", "err", "policies", `‘${p.name}’ zonder doelgroep`, "Kies de groep(en) waarvoor dit beleid geldt.", k);
      [["defaultDocs", "files"], ["defaultEmail", "emails"], ["defaultMeetings", "meetings"], ["defaultSites", "sites"], ["defaultFabric", "files"]].forEach(([key, scope]) => {
        const v = s[key];
        if (!v || v === "sameAsDocs" || v === "none") return;
        const l = labelById(v, st);
        const def = CATALOG.labelPolicyDefaults.find((x) => x.key === key);
        if (!l) { add("PV-065", "err", "policies", `‘${p.name}’: default label bestaat niet meer`, def.name, k); return; }
        if (!g.labels.includes(l)) add("PV-066", "err", "policies", `‘${p.name}’: default label niet in beleid`, `‘${labelFullName(l, st)}’ is ingesteld als ${def.name.toLowerCase()}, maar zit niet in dit beleid.`, k);
        if (hasChildren(l, st)) add("PV-067", "err", "policies", `‘${p.name}’: default label heeft sublabels`, "Kies een sublabel als default; een parent kan niet worden toegepast.", k);
        if (!l.cfg.scope[scope]) add("PV-068", "err", "policies", `‘${p.name}’: default label past niet bij scope`, `‘${labelFullName(l, st)}’ heeft geen scope ${CATALOG.labelScopes.find((x) => x.key === scope).name}.`, k);
      });
      if ((s.mandatoryDocs || s.mandatoryEmail) && !s.defaultDocs) add("PV-069", "info", "policies", `‘${p.name}’: verplicht labelen zonder default`, "Gebruikers moeten bij elk nieuw document zelf kiezen; overweeg een default label zodat medewerkers minder vaak hoeven te kiezen.", k);
      if (!s.justification) add("PV-070", "info", "policies", `‘${p.name}’: geen justificatie bij verlagen`, "Zonder justificatie is niet te zien waarom labels worden verlaagd of verwijderd.", k);
      if (s.mandatorySites && !g.labels.some((l) => l.cfg.scope.sites)) add("PV-071", "err", "policies", `‘${p.name}’: verplicht voor sites zonder container-label`, "Er is geen label met scope Groups & sites in dit beleid.", k);
      if (s.mandatoryMeetings && !g.labels.some((l) => l.cfg.scope.meetings)) add("PV-072", "err", "policies", `‘${p.name}’: verplicht voor meetings zonder meeting-label`, "Er is geen label met scope Meetings in dit beleid.", k);
    });
  },

  /* ---------- DLP ---------- */
  dlp(st, add) {
    const gen = Generator.all(st);
    applicableLabels(st).forEach((l) => {
      CATALOG.dlpDomains.forEach((d) => {
        const r = Generator.ruleFor(l, d.key, st);
        if (r && !r.effective) {
          const why = d.key === "teams" ? "Teams-chat ondersteunt geen labels als conditie; koppel SIT’s aan het label." : d.key === "endpoint" ? "Er is geen enkele activiteit gekozen of geen conditie." : "Geen conditie: het label kan op deze locatie niet worden geëvalueerd en er zijn geen SIT’s gekoppeld.";
          add("PV-073", d.key === "teams" ? "err" : "warn", "dlp", `‘${labelFullName(l, st)}’: DLP ${d.name} werkt niet`, why, { labelId: l.id, key: d.key });
        }
      });
    });
    (st.customDlp || []).forEach((c) => {
      const k = { key: c.id }, locs = c.locations || [];
      if (!locs.length) add("PV-074", "err", "dlp", `‘${c.name}’: geen locaties`, "Kies minstens één locatie.", k);
      if (locs.includes("copilot") && locs.length > 1) add("PV-075", "err", "dlp", `‘${c.name}’: Copilot gecombineerd`, "De locatie Microsoft 365 Copilot kan niet met andere locaties in één policy.", k);
      if (locs.includes("fabric") && locs.length > 1) add("PV-076", "err", "dlp", `‘${c.name}’: Fabric gecombineerd`, "De locatie Fabric and Power BI workspaces kan niet met andere locaties in één policy.", k);
      if (!(c.rules || []).length) add("PV-077", "err", "dlp", `‘${c.name}’: geen regels`, "Voeg minstens één regel toe.", k);
      if (c.mode === "enable") add("PV-078", "info", "dlp", `‘${c.name}’ staat direct aan`, "Advies: eerst simulatie, daarna handhaven.", k);
      if ((c.include || []).length && (c.exclude || []).length) add("PV-079", "err", "dlp", `‘${c.name}’: Include én Exclude`, "Purview ondersteunt per locatie óf ‘Include’ (specifieke groepen) óf ‘Exclude’ (bij ‘All’), niet beide.", k);
      (c.rules || []).forEach((r) => {
        const cond = (r.labels || []).length || (r.sits || []).length || (r.extra || []).length;
        const ext = locs.includes("copilot") && r.copilotAction === "external";
        if (!cond && !ext) add("PV-080", "err", "dlp", `‘${c.name}’ › ‘${r.name}’: geen conditie`, "Een regel heeft minstens één conditie nodig.", k);
        if ((r.sits || []).length) {
          const mn = Validation._count(r.minCount === undefined ? 1 : r.minCount), mx = Validation._count(r.maxCount === undefined ? "any" : r.maxCount, true);
          if (mn === null) add("PV-081", "err", "dlp", `‘${c.name}’ › ‘${r.name}’: ongeldig minimum aantal`, "Instance count ‘from’ moet een geheel getal van 1 of hoger zijn.", k);
          if (mx === null) add("PV-082", "err", "dlp", `‘${c.name}’ › ‘${r.name}’: ongeldig maximum aantal`, "Instance count ‘to’ moet een geheel getal zijn of ‘any’.", k);
          else if (mn !== null && mx !== "any" && mx < mn) add("PV-083", "err", "dlp", `‘${c.name}’ › ‘${r.name}’: maximum kleiner dan minimum`, `Instance count ‘to’ (${mx}) is kleiner dan ‘from’ (${mn}).`, k);
        }
        if (r.endpoint && Object.values(r.endpoint).some((v) => v && v !== "off") && !locs.includes("devices")) add("PV-084", "warn", "dlp", `‘${r.name}’: endpoint-acties zonder Devices`, "Endpoint-restricties werken alleen met de locatie Devices.", k);
        if (r.action === "encrypt" && !locs.includes("exchange")) add("PV-085", "err", "dlp", `‘${r.name}’: versleutelen zonder Exchange`, "Encrypt email messages is alleen beschikbaar voor Exchange.", k);
        if ((r.labels || []).length && locs.length && locs.every((x) => x === "teams")) add("PV-086", "err", "dlp", `‘${r.name}’: label-conditie in Teams`, "Teams chat- en kanaalberichten ondersteunen geen sensitivity labels als conditie.", k);
        if (locs.includes("fabric")) {
          const fbad = (r.sits || []).map((id) => sitById(id, st)).filter((s) => s && (["edm", "classifier"].includes(s.kind) || s.entity || s.cred));
          if (fbad.length) add("PV-087", "err", "dlp", `‘${r.name}’: niet-ondersteund informatietype voor Fabric`, `Fabric-DLP ondersteunt geen EDM, trainable classifiers, credential classifiers of named entities: ${fbad.map((s) => s.name).join(", ")}.`, k);
        }
        if (locs.includes("copilot")) {
          const sits = (r.sits || []).map((id) => sitById(id, st)).filter(Boolean);
          if (sits.some((s) => s.kind === "fingerprint")) add("PV-088", "err", "dlp", `‘${r.name}’: fingerprint in Copilot-regel`, "Copilot-regels ondersteunen geen document fingerprints.", k);
          const bad = sits.filter((s) => !["builtin", "custom", "fingerprint"].includes(s.kind));
          if (bad.length) add("PV-089", "err", "dlp", `‘${r.name}’: niet-ondersteund informatietype voor Copilot`, `Alleen built-in en custom SIT’s: ${bad.map((s) => s.name).join(", ")} wordt niet ondersteund.`, k);
          if ((r.labels || []).length && sits.length) add("PV-090", "err", "dlp", `‘${r.name}’: labels én SIT’s in één Copilot-regel`, "Maak aparte regels voor labels en voor SIT’s.", k);
          if (ext && (sits.length || (r.labels || []).length)) add("PV-091", "warn", "dlp", `‘${r.name}’: externe-afzender-regel met condities`, "De regel voor externe e-mail gebruikt alleen afzender-metadata; labels/SIT’s worden genegeerd.", k);
        }
      });
    });
    const ds = st.dlpSettings;
    Object.entries(ds.perLocation || {}).forEach(([dk, pl]) => {
      if (pl && (pl.include || []).length && (pl.exclude || []).length) {
        const d = CATALOG.dlpDomains.find((x) => x.key === dk);
        add("PV-092", "err", "dlp", `DLP ${d ? d.name : dk}: Include én Exclude`, "Purview ondersteunt per locatie óf ‘Include’ (specifieke groepen) óf ‘Exclude’ (bij ‘All’), niet beide.", { key: dk });
      }
    });
    if (gen.dlpPolicies.length) {
      if (ds.mode === "enable") add("PV-093", "warn", "dlp", "DLP direct aan", "Alle afgeleide DLP-policies staan op ‘Turn it on right away’. Start in simulatie en evalueer 1–2 weken.");
      else add("PV-094", "info", "dlp", "DLP start in simulatie", "Goed: evalueer resultaten in Activity explorer en DLP-alerts voordat je handhaaft.");
    }
    applicableLabels(st).forEach((l) => {
      const hasDlp = Object.entries(l.cfg.dlp).some(([k, v]) => k !== "copilot" && v.action !== "off");
      if (hasDlp && !labelSits(l, st).length && ds.includeSitsForUnlabeled) add("PV-095", "info", "sits", `‘${labelFullName(l, st)}’: DLP alleen op label`, "Zonder gekoppelde SIT’s beschermt DLP alleen gelabelde inhoud; ongelabelde gevoelige inhoud glipt erdoor.", { labelId: l.id });
    });
  },

  /* ---------- Endpoint ---------- */
  endpoint(st, add) {
    const ep = st.endpoint;
    const selected = [
      ...applicableLabels(st).filter((l) => l.cfg.dlp.endpoint.action !== "off").flatMap((l) => labelSits(l, st)),
      ...(st.customDlp || []).filter((p) => (p.locations || []).includes("devices")).flatMap((p) => (p.rules || []).flatMap((r) => (r.sits || []).map((id) => sitById(id, st)).filter(Boolean))),
    ];
    if (!ep.advancedClassification && selected.some((s) => s.cred || s.entity || ["edm", "classifier"].includes(s.kind))) add("PV-110", "err", "endpoint", "Advanced classification vereist", "De gekozen credential-SIT, named entity, EDM of trainable classifier vereist cloudclassificatie. Zet Advanced classification aan en controleer bandbreedte en privacyvoorwaarden.");
    const act = (k) => st.labels.some((l) => ((l.cfg.dlp.endpoint.activities || {})[k] || "off") !== "off") || (st.customDlp || []).some((c) => (c.rules || []).some((r) => r.endpoint && r.endpoint[k] && r.endpoint[k] !== "off"));
    if (act("cloud") && !(ep.serviceDomains || []).length && !(ep.sensitiveDomainGroups || []).length) add("PV-096", "warn", "endpoint", "Cloud-upload zonder service domains", "De activiteit ‘Upload to a restricted cloud service domain’ heeft een lijst service domains (Allow/Block) of sensitive service domain groups nodig.");
    if (act("apps") && !(ep.restrictedApps || []).length && !(ep.restrictedAppGroups || []).length) add("PV-097", "warn", "endpoint", "Restricted apps niet ingevuld", "‘Access by restricted apps’ werkt alleen als restricted apps of app groups zijn gedefinieerd.");
    if (act("bluetooth") && !(ep.unallowedBluetoothApps || []).length) add("PV-098", "warn", "endpoint", "Bluetooth-apps niet ingevuld", "Vul ‘Unallowed Bluetooth apps’ in (bijv. fsquirt.exe).");
    if (ep.fileEvidence && !ep.evidenceStorage && ep.evidenceStoreType === "customer") add("PV-099", "err", "endpoint", "Evidence-opslag ontbreekt", "Bij customer managed storage is een Azure Storage-account (URL) nodig.");
    if (ep.ocr) add("PV-100", "info", "endpoint", "OCR is pay-as-you-go", "Optical character recognition wordt via een Azure-abonnement afgerekend.");
    const blk = (k) => st.labels.some((l) => ["block", "warn"].includes(((l.cfg.dlp.endpoint.activities || {})[k] || "off"))) || (st.customDlp || []).some((c) => (c.rules || []).some((r) => r.endpoint && ["block", "warn"].includes(r.endpoint[k])));
    const clin = ["rdp", "clipboard", "cloud"].filter(blk);
    if (clin.length) add("PV-101", "info", "endpoint", "Blokkade op klembord/RDP/cloud-upload: test op werkplekken", `Let op klinische en vakapplicaties (EPD via Citrix/RDP, PACS-viewers) bij: ${clin.map((k) => (CATALOG.endpointActivities.find((a) => a.key === k) || { name: k }).name).join(", ")}. Test op een zorg- of vakwerkplek; kies bij twijfel Audit.`);
  },

  /* ---------- Integraal (eerlijke status) ---------- */
  /** Doet het label iets? Encryptie, markering of een DLP-keuze. */
  protects(l) {
    const c = l.cfg || {}, m = c.marking || {};
    return ((c.encryption || {}).mode || "none") !== "none" || ["header", "footer", "watermark"].some((k) => (m[k] || {}).enabled) || Object.values(c.dlp || {}).some((d) => d && d.action && d.action !== "off");
  },
  /** Labels die beschermen ‘mogen’ ontbreken: het laagste hoofdlabel (bijv. Openbaar) en zijn sublabels. */
  _exempt(st) {
    const tops = applicableLabels(st).map((l) => (l.parentId ? parentOf(l, st) || l : l));
    const low = tops[0];
    return (l) => !!low && (l === low || l.parentId === low.id);
  },
  unprotected(st = S()) { const ex = this._exempt(st); return applicableLabels(st).filter((l) => !ex(l) && !this.protects(l)); },
  _isPlaceholder(x) { return /\.(example|test|invalid|local|localhost)$/i.test(x) || /^(partner|bedrijf|domein|voorbeeld)\.nl$/i.test(x); },
  /** Placeholder/ongeldige domeinen in domeingroepen en rechthebbenden. → [{where, bad, labelId?, key?}] */
  domainIssues(st = S()) {
    const out = [];
    const chk = (txt, where, extra) => {
      const r = Generator.splitDomains(txt);
      const bad = unique([...r.placeholders, ...r.invalid, ...r.domains.filter((d) => this._isPlaceholder(d))]);
      if (bad.length) out.push({ where, bad, ...extra });
    };
    (st.groups || []).filter((g) => g.kind === "domain").forEach((g) => { if (String(g.value || "").trim()) chk(g.value, `Domeingroep ‘${g.name}’`, { key: g.id }); });
    st.labels.forEach((l) => ((l.cfg.encryption || {}).permissions || []).forEach((p) => {
      if (p && (p.type === "domain" || p.type === "partner") && !p.groupId && String(p.value || "").trim()) chk(p.value, `‘${labelFullName(l, st)}’ (rechten)`, { labelId: l.id });
    }));
    return out;
  },
  /** Domeingroepen en doelgroepen die gebruikt worden maar nog leeg zijn. */
  emptyGroups(st = S()) {
    const used = new Set();
    st.labels.forEach((l) => { (l.cfg.publish.groups || []).forEach((g) => used.add(g)); ((l.cfg.encryption || {}).permissions || []).forEach((p) => p && p.groupId && used.add(p.groupId)); });
    (st.labelPolicies || []).forEach((p) => (p.groups || []).forEach((g) => used.add(g)));
    return (st.groups || []).filter((g) => ["group", "domain", "user"].includes(g.kind) && used.has(g.id) && !String(g.value || "").trim());
  },
  _healthSit(s) { return /bsn|burgerservice|citizen service|gezondheid|medisch|medical|health|patiënt|patient|zorg/i.test(`${s.ref || ""} ${s.id || ""} ${s.name || ""}`); },

  integral(st, add) {
    const apps = applicableLabels(st);
    this.unprotected(st).forEach((l) => add("PV-102", "warn", "board", `‘${labelFullName(l, st)}’ beschermt nog niets`, "Medewerkers kunnen dit label kiezen, maar er volgt geen versleuteling, markering of DLP en Copilot mag de inhoud gebruiken. Kies maatregelen op het ontwerpbord.", { labelId: l.id }));
    this.domainIssues(st).forEach((x) => add("PV-103", "err", x.labelId ? "labels" : "schema", `${x.where}: ${x.bad.length === 1 ? `‘${x.bad[0]}’ is geen echt domein` : `${x.bad.length} ongeldige of voorbeelddomeinen`}`, `Partnerdomein ‘${x.bad[0]}’ is een voorbeeld of ongeldig. Vul de echte domeinen van ketenpartners in (bijv. huisartsenpraktijken, laboratorium) of verwijder het.${x.bad.length > 1 ? ` Ook: ${x.bad.slice(1, 6).join(", ")}.` : ""}`, x.labelId ? { labelId: x.labelId, sub: "encryption" } : { key: x.key }));
    // Dezelfde SIT in service-side auto-labeling van meerdere labels → hoogste prioriteit wint.
    const svc = apps.filter((l) => l.cfg.autolabel.service.enabled);
    const bySit = new Map();
    svc.forEach((l) => labelSits(l, st).forEach((s) => { if (!bySit.has(s)) bySit.set(s, []); if (!bySit.get(s).includes(l)) bySit.get(s).push(l); }));
    bySit.forEach((ls, s) => {
      if (ls.length < 2) return;
      const win = ls.slice().sort((a, b) => labelPriority(b, st) - labelPriority(a, st))[0];
      const others = ls.filter((l) => l !== win).map((l) => labelFullName(l, st));
      add("PV-104", "warn", "autolabel", `${s.name} wordt door ${ls.length} auto-labelingpolicies gebruikt (${ls.map((l) => labelShortName(l)).join(" en ")})`, `Purview kiest dan het label met de hoogste prioriteit (‘${labelFullName(win, st)}’) – ook voor inhoud die eigenlijk bij ‘${others.join("’ of ‘")}’ hoort. Maak één regel specifieker (bijv. extra trefwoorden of een hoger aantal) of beperk de locatie.`, { labelId: win.id, key: s.id });
    });
    const alertTo = String((st.dlpSettings || {}).alertRecipients || "").trim();
    const noRecip = [];
    apps.forEach((l) => {
      const c = l.cfg, e = c.encryption, nm = labelFullName(l, st), lid = { labelId: l.id };
      if (e.mode === "assignNow" && (e.permissions || []).some((p) => p && (p.type === "domain" || p.type === "partner"))) add("PV-105", "warn", "labels", `‘${nm}’: versleuteld voor partnerdomeinen`, "Externe ontvangers zonder Microsoft-account (bijv. via ZorgMail of Edifact) kunnen versleutelde berichten niet openen; bij Entra-organisaties krijgen álle geverifieerde domeinen van die organisatie toegang.", { ...lid, sub: "encryption" });
      if (e.mode !== "none" && c.autolabel.service.enabled && c.autolabel.service.exchange) add("PV-106", "warn", "autolabel", `‘${nm}’: versleutelt automatisch uitgaande mail`, "Dit label versleutelt ook automatisch uitgaande mail naar externe ontvangers. Controleer de ketenpartners vóór je de simulatie uitzet.", lid);
      const health = labelSits(l, st).filter((s) => this._healthSit(s));
      if (health.length) {
        const n = c.notify || {}, hasAlert = n.alert && n.alert !== "none";
        if (!hasAlert) add("PV-107", "warn", "dlp", `‘${nm}’: ${health[0].name} zonder alert`, "BSN/patiëntgegevens zonder alert: een mogelijk datalek wordt niet gemeld bij FG/SOC. Zet een alert aan (DLP › Meldingen) en vul de alertontvangers in.", lid);
        else if (!alertTo) noRecip.push(l);
      }
    });
    if (noRecip.length) {
      const names = noRecip.map((l) => `‘${labelFullName(l, st)}’`);
      add("PV-108", "warn", "dlp", noRecip.length === 1 ? `${names[0]}: alert zonder ontvangers` : `Alerts zonder ontvangers (${noRecip.length} labels)`, `De DLP-alert staat aan voor ${names.join(" en ")} (BSN/patiëntgegevens), maar niemand ontvangt hem: een mogelijk datalek wordt niet gemeld bij FG/SOC. Vul bij DLP › Meldingen de alertontvangers in (bijv. fg@… ; soc@…).`, { labelId: noRecip[0].id });
    }
  },

  /* ---------- Tenant (randvoorwaarden = to-do’s voor de klant, geen ontwerpfout) ---------- */
  tenant(st, add) {
    CATALOG.tenantChecks.forEach((c) => {
      let applies = false;
      try { applies = c.when(st); } catch (e) { applies = false; }
      if (!applies) return;
      const s = ((st.tenant.checks || {})[c.id] || {}).status;
      if (s === "done" || s === "na") return;
      let req = false;
      try { req = typeof c.req === "function" ? !!c.req(st) : !!c.req; } catch (e) { req = false; }
      add("PV-109", "info", "tenant", c.name, c.desc, { key: c.id, todo: true, req });
    });
  },

  /** Aantal (instance count): geheel getal ≥ 1, of ‘any’ (alleen als anyOk). Ongeldig → null. */
  _count(v, anyOk = false) {
    if (anyOk && (v === "any" || v === "" || v === null || v === undefined)) return "any";
    if (!anyOk && (v === "" || v === null || v === undefined)) return 1;
    const s = String(v === undefined || v === null ? "" : v).trim();
    if (anyOk && /^any$/i.test(s)) return "any";
    if (!/^\d+$/.test(s)) return null;
    const n = Number(s);
    return n >= 1 ? n : null;
  },

  /** Voortgang voor de hele app (zijbalk, start, export).
      design.pct  = aandeel stappen besproken/klaar × dekking ontwerpbord (0–100); 0 zonder labels.
      rollout.pct = aandeel vervulde reviewcriteria (geen fouten, labelscope, klantgegevens, randvoorwaarden, besluiten).
      pct = design.pct (compatibel met eerdere versies). */
  readiness(st = S()) {
    const routes = typeof NAV_ROUTES !== "undefined" ? NAV_ROUTES : [];
    const rv = (st.meta || {}).reviewed || {};
    const steps = routes.filter((r) => typeof Views !== "undefined" && Object.hasOwn(Views, r) && Views[r].done).map((r) => {
      const done = !!Views[r].done(st);
      const reviewed = !!rv[r];
      return { route: r, title: Views[r].title, done: done || reviewed, reviewed, auto: done && !reviewed };
    });
    const doneN = steps.filter((x) => x.done).length;
    const has = (st.labels || []).length > 0;
    const cov = has ? Mapping.coverage(st).pct : 0;
    const dpct = has && steps.length ? Math.max(0, Math.min(100, Math.round((doneN / steps.length) * cov))) : 0;
    const c = this.counts(st);
    const dom = this.domainIssues(st), emp = this.emptyGroups(st);
    const reqOpen = (CATALOG.tenantChecks || []).filter((t) => {
      const ap = !!t.when(st), req = typeof t.req === "function" ? !!t.req(st) : !!t.req;
      const s = ((st.tenant.checks || {})[t.id] || {}).status;
      return ap && req && s !== "done" && s !== "na";
    });
    const decs = (st.decisions || []).filter((d) => d.status !== "nvt");
    const decMade = decs.filter((d) => (d.status || (d.kind === "park" ? "open" : "besloten")) === "besloten").length;
    const decNoOwner = decs.filter((d) => !String(d.owner || "").trim()).length;
    const criteria = [
      { text: c.err ? `Geen fouten in de validatie (nog ${c.err})` : "Geen fouten in de validatie", ok: has && !c.err, route: "export" },
      { text: "Labels hebben een toepassingsgebied (alleen classificatie is ook geldig)", ok: has && applicableLabels(st).every((l) => Object.values(l.cfg.scope).some(Boolean)), route: "labels" },
      { text: dom.length || emp.length ? `Partnerdomeinen en groepen ingevuld (nog ${dom.length + emp.length} open)` : "Partnerdomeinen en groepen ingevuld", ok: !dom.length && !emp.length, route: emp.length && !dom.length ? "schema" : dom.some((x) => x.labelId) ? "labels" : "schema" },
      { text: reqOpen.length ? `Verplichte randvoorwaarden geregeld (nog ${reqOpen.length})` : "Verplichte randvoorwaarden geregeld", ok: !reqOpen.length, route: "tenant" },
      { text: !decMade ? "Besluiten vastgelegd (nog geen besluiten)" : decNoOwner ? `Besluiten en open punten hebben een eigenaar (nog ${decNoOwner})` : "Besluiten vastgelegd met eigenaar", ok: decMade > 0 && !decNoOwner, route: "besluiten" },
    ];
    const okN = criteria.filter((x) => x.ok).length;
    const rpct = has ? Math.round((okN / criteria.length) * 100) : 0;
    return {
      pct: dpct, done: doneN, total: steps.length, steps,
      design: { pct: dpct, label: "Ontwerp uitgewerkt", coverage: cov },
      rollout: { pct: rpct, label: "Ontwerp compleet", criteria },
    };
  },
};
