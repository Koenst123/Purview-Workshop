/* Export: ontwerpdocument & keuzeoverzicht via de printdialoog (Opslaan als PDF).
   Opbouw: managementsamenvatting voorin, technische details in de bijlagen.
   Hergebruikt XlsxExport.sheets() zodat Excel en document dezelfde inhoud tonen. */
const DOC_MONTHS = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
const DOC_TENANT_STATUS = { todo: "Te doen", progress: "Bezig", done: "Gereed", na: "N.v.t." };
/* Statuslegenda van het document: [klasse, label, betekenis] */
const DOC_LEGEND = [
  ["proposed", "Voorstel", "Voorgesteld ontwerp, nog niet door de klant besloten."],
  ["decided", "Besloten", "In de workshop door de klant besloten."],
  ["assumption", "Aanname", "Werkaanname; de klant moet deze bevestigen."],
  ["open", "Open punt", "Nog te beslissen of uit te zoeken, met eigenaar."],
  ["unverified", "Niet geverifieerd", "Werking niet getest in een tenant; eerst in simulatie toetsen."],
];
const DOC_ABOUT = "Dit document beschrijft een voorgesteld ontwerp; er is niets in de tenant geconfigureerd.";

/* Normenkader → ISO/IEC 27002:2022-controls (BIO 2.0 en ISO 27001:2022 Annex A gebruiken dezelfde nummering;
   NEN 7510:2024 volgt de 2022-indeling met zorgspecifieke aanvullingen – nummering laten bevestigen). */
const DOC_CONTROLS = [
  ["5.12", "Classification of information (classificatie van informatie)"],
  ["5.13", "Labelling of information (labelen van informatie)"],
  ["5.14", "Information transfer (informatieoverdracht)"],
  ["8.12", "Data leakage prevention (voorkomen van datalekken)"],
  ["8.15", "Logging"],
  ["8.16", "Monitoring activities (monitoren)"],
];

const DocExport = {
  /* ---------- Hulpfuncties ---------- */
  /** "{Status} v{Versie}" uit meta.status/meta.version */
  ver(st) { try { return XlsxExport.versionText(st); } catch (e) { return "Concept v0.1"; } },
  /** Classificatie van dit document (meta.docLabelId), standaard "Vertrouwelijk" */
  cls(st) { try { return XlsxExport.docClass(st); } catch (e) { return "Vertrouwelijk"; } },
  isZorg(st) { const m = st.meta || {}; return m.sector === "zorg" || m.framework === "nen7510"; },
  /** Documentspecifieke randvoorwaarden (aanvulling op CATALOG.tenantChecks) */
  extraChecks(st) {
    const out = [];
    const has = (re) => CATALOG.tenantChecks.some((c) => re.test(`${c.name} ${c.desc || ""}`) && (() => { try { return c.when(st); } catch (e) { return false; } })());
    if (this.isZorg(st) && !has(/noodprocedure|break.?glass/i)) out.push({ name: "Noodprocedure vastleggen (break-the-glass)", desc: "Leg vast wie in acute situaties (bijv. overplaatsing ’s nachts) mag overrulen, met justification, en hoe dit achteraf wordt getoetst (bijv. door de FG binnen 1 werkdag)." });
    return out;
  },
  dateNl(d) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || ""));
    if (!m || +m[2] < 1 || +m[2] > 12) return String(d || "");
    return `${+m[3]} ${DOC_MONTHS[+m[2] - 1]} ${m[1]}`;
  },
  val(v) {
    if (v === undefined || v === null) return "";
    if (typeof v === "boolean") return v ? "Ja" : "Nee";
    return esc(String(v)).replace(/\n/g, "<br>");
  },
  empty(v) { return v === undefined || v === null || v === "" || v === "–" || v === "None" || v === "(parent label)"; },
  blank(html) { const t = String(html == null ? "" : html).replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim(); return t === "" || t === "–"; },
  /* CSS-string voor @page-margeboxen (gebruikersinvoer: geen regeleinden, quotes of tags) */
  cssStr(s) {
    return `"${String(s == null ? "" : s).replace(/[\u0000-\u001f\u007f\u0085\u2028\u2029]/g, " ").replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/</g, "\\3c ").replace(/>/g, "\\3e ")}"`;
  },
  support(fn) { try { return typeof PsExport !== "undefined" ? fn() : ""; } catch (e) { return ""; } },
  sitName(s) { return `${s.name}${s.kind === "classifier" ? " (portal)" : ""}`; },
  locName(k) { return (CATALOG.dlpLocations.find((x) => x.key === k) || { name: k }).name; },
  dot(l) { return `<span class="dot" style="background:${/^#[0-9a-f]{3,8}$/i.test(l.color || "") ? l.color : "#999"}"></span>`; },
  ul(items) { return items.length ? `<ul>${items.map((x) => `<li>${x}</li>`).join("")}</ul>` : ""; },
  /** Statuslabel uit DOC_LEGEND (vaste teksten, geen gebruikersinvoer) */
  tag(kind, text) { const d = DOC_LEGEND.find((x) => x[0] === kind) || DOC_LEGEND[0]; return `<span class="tag ${d[0]}">${esc(text || d[1])}</span>`; },
  about(st) {
    const rows = DOC_LEGEND.map(([k, , t]) => `<tr><td>${this.tag(k)}</td><td>${esc(t)}</td></tr>`).join("");
    return `<div class="about"><h3>Over dit document</h3><p class="callout${Validation.isConcept(st) ? " concept" : ""}"><b>${esc(DOC_ABOUT)}</b> De keuzes zijn een voorstel totdat ze als besloten zijn vastgelegd; de werking is pas bewezen na een test in de tenant.</p><table class="legend"><tbody>${rows}</tbody></table></div>`;
  },

  /* Tabel uit kolomkoppen + (al ge-escapete) HTML-cellen; volledig lege kolommen vervallen. */
  grid(head, rows, o = {}) {
    if (!rows.length) return o.empty === "" ? "" : `<p class="muted">${esc(o.empty || "Niets vastgelegd.")}</p>`;
    const keep = head.map((_, i) => (o.keep || []).includes(i) || rows.some((r) => !this.blank(r[i])));
    const w = o.widths || [];
    return `<table${o.cls ? ` class="${o.cls}"` : ""}><thead><tr>${head.map((h, i) => (keep[i] ? `<th${w[i] ? ` style="width:${w[i]}"` : ""}>${esc(h)}</th>` : "")).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (keep[i] ? `<td>${c == null ? "" : c}</td>` : "")).join("")}</tr>`).join("")}</tbody></table>`;
  },
  /* Tabel uit een Excel-sheet (selectie van kolommen) */
  table(sh, cols, o = {}) {
    if (!sh) return "";
    const idx = cols || sh.head.map((_, i) => i);
    return this.grid(idx.map((i) => sh.head[i]), (sh.rows || []).map((r) => idx.map((i) => (this.empty(r[i]) ? "" : this.val(r[i])))), o);
  },
  /* Brede sheets: één kaartje (sleutel/waarde) per rij; lege velden vervallen */
  records(sh, titleCol, o = {}) {
    if (!sh || !(sh.rows || []).length) return `<p class="muted">Niets vastgelegd.</p>`;
    let html = "", group = null;
    const skip = new Set([titleCol, o.groupCol, ...(o.skip || [])]);
    sh.rows.forEach((r, ri) => {
      if (o.groupCol != null && r[o.groupCol] !== group) { group = r[o.groupCol]; html += `<h3>${esc(group)}</h3>`; }
      const kv = sh.head.map((h, i) => [h, r[i], i]).filter(([, v, i]) => !skip.has(i) && !this.empty(v));
      const note = o.note ? o.note(r, ri) : "";
      html += `<table class="rec"><thead><tr><th colspan="2">${this.val(r[titleCol])}</th></tr></thead><tbody>${note ? `<tr><td colspan="2" class="note">${esc(note)}</td></tr>` : ""}${kv.map(([h, v]) => `<tr><th style="width:30%">${esc(h)}</th><td>${this.val(v)}</td></tr>`).join("")}</tbody></table>`;
    });
    return html;
  },

  /* ---------- Managementsamenvatting ---------- */
  /** Bescherming van een label in één regel (keuzes van het ontwerpbord) */
  protection(l) {
    const parts = [["encryption", "Encryptie"], ["marking", "Markering"], ["container", "Teams/sites"], ["dlp_exchange", "E-mail"], ["dlp_sharing", "Delen"], ["dlp_endpoint", "Endpoint"], ["dlp_copilot", "Copilot"]]
      .map(([d, t]) => { const c = Mapping.choice(l, d); return c && c.lv > 0 ? `${t}: ${c.title}` : Mapping.isCustom(l, d) ? `${t}: maatwerk` : ""; })
      .filter(Boolean);
    return parts.length ? parts.join(" · ") : "Alleen classificatie (geen technische maatregelen)";
  },
  keyDecisions(st, g) {
    const ls = applicableLabels(st), out = [];
    const names = (arr) => arr.map((l) => `<b>${esc(labelFullName(l, st))}</b>`).join(", ");
    const ln = (id) => { const l = id ? labelById(id, st) : null; return l ? esc(labelFullName(l, st)) : ""; };
    const glob = g.labelPolicies.find((p) => p.policy && p.policy.scope === "all") || g.labelPolicies[0];
    if (glob) {
      const s = glob.settings || {};
      const de = s.defaultEmail === "sameAsDocs" ? ln(s.defaultDocs) : s.defaultEmail === "none" ? "" : ln(s.defaultEmail);
      out.push(`Standaardlabel (default label): documenten <b>${ln(s.defaultDocs) || "geen"}</b>, e-mail <b>${de || "geen"}</b>.`);
      out.push(`Verplicht labelen (mandatory labeling): documenten <b>${s.mandatoryDocs ? "ja" : "nee"}</b>, e-mail <b>${s.mandatoryEmail ? "ja" : "nee"}</b> · reden opgeven bij verlagen van een label: <b>${s.justification ? "ja" : "nee"}</b>.`);
    }
    const enc = ls.filter((l) => ["assignNow", "userDefined"].includes(l.cfg.encryption.mode));
    out.push(enc.length ? `Versleuteling (encryption) bij: ${names(enc)}.` : "Geen van de labels versleutelt inhoud.");
    const mark = ls.filter((l) => { const m = l.cfg.marking; return m.header.enabled || m.footer.enabled || m.watermark.enabled; });
    if (mark.length) out.push(`Visuele markering (content marking) bij: ${names(mark)}.`);
    const sites = ls.filter((l) => l.cfg.scope.sites);
    if (sites.length) out.push(`Labels voor Teams, Groups & sites (containers): ${names(sites)}.`);
    const client = ls.filter((l) => l.cfg.autolabel.client.mode !== "off");
    const auto = [g.autoPolicies.length ? `service-side voor ${names(unique(g.autoPolicies.map((p) => p.label)))} (${g.autoPolicies.every((p) => p.mode !== "enable") ? "eerst in simulatie" : "simulatie, daarna aan"})` : "", client.length ? `in Office-apps (client-side) voor ${names(client)}` : ""].filter(Boolean);
    out.push(auto.length ? `Automatisch labelen: ${auto.join("; ")}.` : "Geen automatisch labelen: gebruikers kiezen zelf het label.");
    if (g.dlpPolicies.length) {
      const locs = unique(g.dlpPolicies.flatMap((p) => p.locations)).map((k) => this.locName(k));
      const nOn = g.dlpPolicies.filter((p) => p.mode === "enable").length;
      out.push(`DLP op: ${esc(locs.join(", "))} – ${nOn ? `${nOn} van de ${g.dlpPolicies.length} policies direct handhaven, de rest start in simulatie` : `alle ${g.dlpPolicies.length} policies starten in simulatie`}.`);
    } else out.push("Nog geen DLP-policies vastgelegd.");
    const ep = ls.filter((l) => ((l.cfg.dlp.endpoint || {}).action || "off") !== "off");
    if (ep.length) out.push(`Endpoint DLP (USB, printen, cloud-upload e.d.) voor: ${names(ep)}.`);
    const cpBlock = ls.filter((l) => ((l.cfg.dlp.copilot || {}).action || "off") === "block");
    if (cpBlock.length) out.push(`Uitgesloten van Microsoft 365 Copilot: ${names(cpBlock)}.`);
    return out;
  },
  openItems(st) {
    const rows = [];
    let val = [];
    try { val = Validation.run(st); } catch (e) { val = []; }
    val.filter((v) => v.level === "err").forEach((v) => rows.push([this.tag("open", "Fout"), esc(v.title), "", ""]));
    CATALOG.tenantChecks.filter((c) => { try { return c.req && c.when(st); } catch (e) { return false; } }).forEach((c) => {
      const s = (st.tenant.checks || {})[c.id] || {};
      if (s.status !== "done" && s.status !== "na") rows.push([`${this.tag("unverified", "Randvoorwaarde")} <span class="muted">(${esc((DOC_TENANT_STATUS[s.status] || "Te doen").toLowerCase())})</span>`, esc(c.name), esc(s.owner || ""), ""]);
    });
    this.extraChecks(st).forEach((c) => rows.push([`${this.tag("unverified", "Randvoorwaarde")} <span class="muted">(te doen)</span>`, esc(c.name), "", ""]));
    if ((st.meta || {}).framework === "bio") rows.push([this.tag("open"), "Woo-verzoeken: toegang tot versleutelde documenten bij eDiscovery/zoekacties afstemmen met Informatiebeheer.", "", ""]);
    const warns = val.filter((v) => v.level === "warn");
    warns.slice(0, 8).forEach((v) => rows.push([this.tag("assumption", "Waarschuwing"), esc(v.title), "", ""]));
    if (warns.length > 8) rows.push([this.tag("assumption", "Waarschuwing"), `… en nog ${warns.length - 8} waarschuwingen (zie bijlage Validatie)`, "", ""]);
    (st.decisions || []).filter((d) => ["open", "bespreken"].includes(decisionStatus(d))).forEach((d) => rows.push([this.tag("open", decisionStatus(d) === "bespreken" ? "Te bespreken" : "Open punt"), esc(d.text), esc(d.owner || ""), esc(d.due ? this.dateNl(d.due) : "")]));
    return rows;
  },
  nextSteps(st) {
    const ph = typeof XlsxExport.phases === "function" ? XlsxExport.phases() : [];
    const pv = (k) => (typeof XlsxExport.phase === "function" ? XlsxExport.phase(st, k) : { owner: "", start: "", due: "" });
    return this.grid(["Fase", "Wat", "Eigenaar", "Start", "Streefdatum"], ph.map((p) => { const v = pv(p.key); return [`<b>${esc(p.title)}</b>`, esc(p.desc), esc(v.owner), esc(this.dateNl(v.start)), esc(this.dateNl(v.due))]; }), { keep: [2, 3, 4], widths: ["17%", "45%", "16%", "11%", "11%"], cls: "fill" });
  },
  signoff(st, what) {
    const m = st.meta || {};
    const box = (who, name) => `<td><div class="who">${esc(who)}</div><table class="sig"><tbody><tr><th>Naam</th><td>${esc(name || "")}</td></tr><tr><th>Functie</th><td></td></tr><tr><th>Datum</th><td></td></tr><tr><th>Handtekening</th><td class="sigline"></td></tr></tbody></table></td>`;
    return `<div class="signoff"><h3>Akkoord</h3><p class="note">${esc(what)}</p><table class="sigwrap"><tbody><tr>${box(`Namens ${m.customer || "de opdrachtgever"}`, "")}${box("Namens Pink Elephant", m.facilitator || "")}</tr></tbody></table></div>`;
  },
  /** Scope en afbakening + notities van de startpagina */
  scope(st) {
    const m = st.meta || {}, bio = m.framework === "bio" || m.sector === "overheid";
    const out = bio
      ? "bewaartermijnen en vernietiging (Archiefwet, selectielijst), records management, en de afhandeling van Woo-verzoeken. Labels en encryptie kunnen wel invloed hebben op Woo-zoekacties en eDiscovery; dit is als open punt opgenomen."
      : "bewaartermijnen en vernietiging (retentie), records management en de afhandeling van informatieverzoeken (zoals AVG-inzageverzoeken). Labels en encryptie kunnen wel invloed hebben op zoekacties en eDiscovery.";
    return `<p><b>Scope en afbakening.</b> Dit ontwerp regelt classificatie (sensitivity labels), beveiliging (encryptie, markeringen) en het voorkomen van datalekken (DLP) in Microsoft 365. <b>Niet</b> in scope: ${out}</p>${String(m.notes || "").trim() ? `<p class="note"><b>Notities:</b> ${this.val(m.notes)}</p>` : ""}`;
  },
  /** Wat merken medewerkers? (Keuzeoverzicht.plainSummary) */
  plain(st) {
    let ps = [];
    try { ps = typeof Keuzeoverzicht !== "undefined" && typeof Keuzeoverzicht.plainSummary === "function" ? Keuzeoverzicht.plainSummary(st) || [] : []; } catch (e) { ps = []; }
    ps = ps.filter((p) => p && !p.empty && (p.lines || []).length);
    if (!ps.length) return "";
    return this.grid(["Label", "Wat merkt een medewerker?"], ps.map((p) => [`${this.dot(p)}<b>${esc(p.name)}</b>`, this.ul(p.lines.map((x) => esc(x)))]), { cls: "sum plain", widths: ["24%", "76%"] });
  },
  readiness(st) {
    const r = Validation.readiness(st);
    const crit = r.rollout.criteria.filter((c) => c && c.text);
    const ok = crit.filter((c) => c.ok).length;
    return `<p class="ready"><b>${esc(r.design.label)}: ${esc(r.design.text)}</b>${crit.length ? ` · <b>${esc(r.rollout.label)}: ${ok} van ${crit.length}</b>` : ""} <span class="muted">(zegt niets over de werking in de tenant)</span></p>${crit.length ? `<ul class="crit">${crit.map((c) => `<li class="${c.ok ? "ok" : "nok"}">${c.ok ? "✓" : "✗"} ${esc(c.text)}</li>`).join("")}</ul>` : ""}`;
  },
  versions(st) {
    const m = st.meta || {};
    let v = (m.versions || []).filter((x) => x && (x.version || x.change));
    if (!v.length) v = [{ version: String(m.version || "0.1"), date: m.date || today(), change: "Eerste versie (uitkomst workshop)", by: m.facilitator || "" }];
    return this.grid(["Versie", "Datum", "Wijziging", "Door"], v.map((x) => [esc(x.version || ""), esc(this.dateNl(x.date)), this.val(x.change), esc(x.by || "")]), { keep: [0, 1, 2, 3], widths: ["12%", "18%", "50%", "20%"] });
  },
  /** Verantwoording t.o.v. het normenkader (alleen als meta.framework ≠ none) */
  accountability(st, g) {
    const m = st.meta || {}, fw = m.framework || "none";
    if (fw === "none") return "";
    const ls = applicableLabels(st);
    const intro = {
      bio: "De BIO 2.0 koppelt haar maatregelen aan NEN-EN-ISO/IEC 27002:2022; de nummers hieronder zijn de ISO/IEC 27002:2022-maatregelen waarop de BIO-maatregelen zijn gebaseerd. Toetsing en vaststelling door de CISO.",
      nen7510: "NEN 7510:2024 sluit aan op ISO/IEC 27001/27002:2022 (dezelfde maatregelen, aangevuld met zorgspecifieke eisen). De nummers hieronder zijn die van ISO/IEC 27002:2022; de koppeling met de eigen verklaring van toepasselijkheid is door CISO/FG te bevestigen.",
      iso27001: "Annex A van ISO/IEC 27001:2022 gebruikt dezelfde nummering als ISO/IEC 27002:2022. Opname in de verklaring van toepasselijkheid door de CISO.",
      avg: "De AVG schrijft passende technische en organisatorische maatregelen voor (art. 32 AVG). Als referentiekader zijn hieronder de ISO/IEC 27002:2022-maatregelen gebruikt; toetsing door de FG.",
    }[fw] || "";
    const enc = ls.filter((l) => ["assignNow", "userDefined"].includes(((l.cfg || {}).encryption || {}).mode)).length;
    const nRules = sum(g.dlpPolicies, (p) => p.rules.length);
    const alerts = String(((st.dlpSettings || {}).alertRecipients) || "").trim();
    const how = {
      "5.12": `Classificatieschema met ${ls.length} sensitivity labels, elk met betekenis, voorbeelden en eigenaar.`,
      "5.13": `Labels in Office, Outlook en Teams; ${g.autoPolicies.length} auto-labelingpolicies; standaardlabel en verplicht labelen via het labelbeleid.`,
      "5.14": `Versleuteling bij ${enc} label(s); DLP-regels voor e-mail en delen met externen${(st.groups || []).some((x) => x.kind === "domain" && String(x.value || "").trim()) ? ", met vastgelegde partnerdomeinen" : ""}.`,
      "8.12": g.dlpPolicies.length ? `${g.dlpPolicies.length} DLP-policies met ${nRules} regels (${unique(g.dlpPolicies.flatMap((p) => p.locations)).map((k) => this.locName(k)).join(", ")}), eerst in simulatie.` : "Nog geen DLP-policies vastgelegd.",
      "8.15": "Audit logging in Microsoft Purview (randvoorwaarde); het PowerShell-script legt een transcript (logbestand) vast als bewijs van wat is ingericht.",
      "8.16": `DLP-alerts en incidentrapporten${alerts ? ` naar ${alerts}` : ""}; Activity explorer en DLP-alerts worden tijdens simulatie en daarna periodiek beoordeeld.`,
    };
    const where = { "5.12": "Managementsamenvatting; bijlage Sensitivity labels", "5.13": "Bijlagen Sensitivity labels, Labelbeleid en Auto-labeling", "5.14": "Bijlagen Sensitivity labels (encryptie) en DLP-regels", "8.12": "Resulterend beleid; bijlagen DLP-policies en DLP-regels", "8.15": "Randvoorwaarden tenant", "8.16": "Vervolgstappen; bijlage DLP-regels" };
    let html = `<p>${esc(intro)}</p><h3>Koppeling met maatregelen (ISO/IEC 27002:2022)</h3>${this.grid(["Maatregel", "Onderwerp", "Hoe dit ontwerp eraan bijdraagt", "Waar"], DOC_CONTROLS.map(([n, t]) => [`<b>${n}</b>`, esc(t), esc(how[n]), esc(where[n])]), { widths: ["9%", "24%", "45%", "22%"] })}`;
    const zorg = this.isZorg(st) || fw === "avg";
    const health = (s) => { try { return typeof Validation._healthSit === "function" ? Validation._healthSit(s) : s.cat === "health"; } catch (e) { return s.cat === "health"; } };
    const basis = (l) => {
      const sits = labelSits(l, st), out = [];
      if (sits.some(health)) out.push("Art. 9 AVG – gezondheidsgegevens");
      if (this.isZorg(st) && sits.some((s) => /bsn|burgerservice/i.test(`${s.name} ${s.id}`))) out.push("Wabvpz – BSN in de zorg");
      return out.length ? `${out.join("; ")} <span class="muted">(door FG te bevestigen)</span>` : `<span class="muted">door FG te bepalen</span>`;
    };
    const head = ["Label", "Soort gegevens (informatietypen)", "Eigenaar", ...(zorg ? ["Grondslag", "DPIA-referentie"] : [])];
    html += `<h3>Per label</h3>${this.grid(head, ls.map((l) => [`${this.dot(l)}<b>${esc(labelFullName(l, st))}</b>`, esc(labelSits(l, st).map((s) => s.name).join(", ") || (l.info || []).join(", ")), esc(l.owner || ""), ...(zorg ? [basis(l), ""] : [])]), { keep: zorg ? [2, 4] : [2], widths: zorg ? ["20%", "34%", "14%", "20%", "12%"] : ["26%", "54%", "20%"], cls: "fill", empty: "Nog geen labels." })}`;
    return html;
  },
  summary(st, g) {
    const ls = applicableLabels(st), m = st.meta || {};
    const nOn = g.dlpPolicies.filter((p) => p.mode === "enable").length;
    let sc = null;
    try { sc = ScenarioEngine.score(st); } catch (e) { sc = null; }
    const lead = `<p class="lead">Dit document legt het ontwerp vast voor het classificeren en beschermen van informatie bij <b>${esc(m.customer || "de organisatie")}</b> met Microsoft Purview: <b>${ls.length} sensitivity labels</b>, ${g.autoPolicies.length} auto-labelingpolicies en <b>${g.dlpPolicies.length} DLP-policies</b> met ${sum(g.dlpPolicies, (p) => p.rules.length)} regels.${g.dlpPolicies.length ? nOn ? ` ${nOn} DLP-policies zijn in het ontwerp op handhaven gezet; het script start DLP altijd in simulatie.` : " Alle DLP-policies starten in simulatiemodus; handhaven gebeurt pas na evaluatie van de resultaten." : ""}${sc && sc.total ? ` Het ontwerp dekt ${sc.pass} van de ${sc.total} getoetste praktijkscenario’s (automatische ontwerpcheck, geen tenanttest).` : ""}</p>`;
    const cls = this.grid(["Label", "Betekenis", "Voorbeelden", "Bescherming"], ls.map((l) => [`${this.dot(l)}<b>${esc(labelFullName(l, st))}</b>`, esc(l.tooltip || (parentOf(l, st) || {}).tooltip || ""), esc((l.info || []).join(", ")), esc(this.protection(l))]), { cls: "sum", widths: ["19%", "35%", "17%", "29%"], empty: "Nog geen labels vastgelegd." });
    const dec = (st.decisions || []).filter((d) => decisionStatus(d) === "besloten");
    const open = this.openItems(st);
    const plain = this.plain(st);
    const decHtml = dec.some((d) => d.owner || d.due)
      ? this.grid(["Besluit", "Eigenaar", "Deadline"], dec.map((d) => [esc(d.text), esc(d.owner || ""), esc(d.due ? this.dateNl(d.due) : "")]), { widths: ["64%", "20%", "16%"] })
      : this.ul(dec.map((d) => esc(d.text)));
    return `${lead}${this.readiness(st)}${this.scope(st)}<h3>Classificatie in één oogopslag</h3>${cls}
      ${plain ? `<h3>Wat merken medewerkers?</h3>${plain}` : ""}
      <h3>Belangrijkste ontwerpkeuzes ${this.tag("proposed")}</h3>${this.ul(this.keyDecisions(st, g))}
      ${dec.length ? `<h3>Besluiten uit de workshop ${this.tag("decided")}</h3>${decHtml}` : ""}
      <h3>Open punten & risico’s</h3>${open.length ? `<p class="note">Fouten oplossen vóór uitrol; waarschuwingen bewust accepteren of oplossen; vereiste randvoorwaarden afronden vóór de pilot.</p>` + this.grid(["Soort", "Punt", "Eigenaar", "Deadline"], open, { keep: [2, 3], widths: ["21%", "53%", "15%", "11%"], cls: "open-items" }) : `<p>Geen open punten: het ontwerp heeft geen fouten of waarschuwingen en alle vereiste randvoorwaarden zijn afgerond.</p>`}
      <h3>Vervolgstappen: pilot → simulatie → handhaven</h3>${this.nextSteps(st)}
      ${this.signoff(st, "Met ondertekening gaan partijen akkoord met dit ontwerp als basis voor de pilot- en simulatiefase.")}`;
  },

  /* ---------- Hoofdstukken ---------- */
  policyOverview(st, g) {
    const rows = [
      ...g.labelPolicies.map((p) => ["Labelbeleid (label policy)", `<b>${esc(p.name)}</b>`, esc(p.scopeText || ""), "", esc(p.labels.map((l) => labelFullName(l, st)).join(", "))]),
      ...g.autoPolicies.map((p) => ["Auto-labeling", `<b>${esc(p.name)}</b>`, esc(p.locations.map((x) => EXPORT_NL.workload(x)).join(", ")), esc(EXPORT_NL.autoMode(p.mode)), `${esc(labelFullName(p.label, st))} · ${p.rules.length} regel(s)`]),
      ...g.dlpPolicies.map((p) => ["DLP", `<b>${esc(p.name)}</b>`, esc(p.locations.map((k) => this.locName(k)).join(", ")), esc(EXPORT_NL.dlpMode(p.mode)), `${p.rules.length} regel(s)`]),
    ];
    return this.grid(["Soort", "Naam", "Scope / locaties", "Modus", "Inhoud"], rows, { empty: "Nog geen beleid." });
  },
  copilot(st, g) {
    const ls = applicableLabels(st), cp = typeof CopilotUI !== "undefined" ? CopilotUI : null;
    const lab = this.grid(["Label", "DLP voor Copilot", "Effect van encryptie op Copilot"], ls.map((l) => {
      const c = Mapping.choice(l, "dlp_copilot");
      return [esc(labelFullName(l, st)), esc(cp ? cp.effect(l).t : c ? c.title : ""), esc(cp ? cp.extract(l).t : "")];
    }), { empty: "Nog geen labels." });
    const pols = g.dlpPolicies.filter((p) => p.locations.includes("copilot"));
    const rows = [];
    pols.forEach((p) => p.rules.forEach((r) => rows.push([`<b>${esc(p.name)}</b>`, esc(r.name), esc(r.desc || ""), esc(EXPORT_NL.dlpMode(p.mode)), esc(this.support(() => PsExport.dlpSupport(p, r, st)))])));
    const manual = rows.some((r) => /portal/i.test(r[4]));
    const steps = [
      "Controleer na het uitvoeren van het script in het Purview-portal (Data loss prevention › Policies) dat de Copilot-policies alleen de locatie <i>Microsoft 365 Copilot and Copilot Chat</i> bevatten; deze locatie kan niet met andere locaties worden gecombineerd.",
      manual ? "Regels gemarkeerd met ‘Portal’ of ‘Script + portal’ maak of rond je handmatig af in het portal (zie de Portal-checklist aan het eind van het PowerShell-script)." : "",
      "Volg in DSPM for AI en Activity explorer welke items en prompts in simulatie matchen voordat je gaat handhaven.",
    ].filter(Boolean);
    return `<p>Microsoft 365 Copilot en Copilot Chat gebruiken alleen inhoud waartoe de gebruiker toegang heeft. Met DLP voor Copilot voorkom je daarnaast dat Copilot inhoud met gevoelige labels in antwoorden verwerkt, of prompts met gevoelige gegevens (zoals BSN of IBAN) verwerkt.</p>
      <h3>Per label</h3>${lab}
      <h3>DLP-policies voor Copilot</h3>${rows.length ? this.grid(["Policy", "Regel", "Wat", "Modus", "Via script / portal"], rows, { widths: ["19%", "18%", "35%", "17%", "11%"] }) : `<p class="muted">Er zijn (nog) geen DLP-regels voor Copilot vastgelegd; Copilot verwerkt alle inhoud waartoe de gebruiker toegang heeft.</p>`}
      <h3>Stappen in het portal</h3>${this.ul(steps)}`;
  },
  adoption(st) {
    const pers = st.personas || [];
    const rows = CATALOG.boardRows.filter((r) => r.kind === "choice");
    const ls = applicableLabels(st);
    let html = "";
    if (pers.length) {
      html += this.grid(["Persona", "Omschrijving", "Raakt domeinen", "Verwachte impact", "Wat merkt de medewerker", "Wat verandert er & communicatie"], pers.map((p) => {
        const touch = unique((p.touch || []).map((k) => (rows.find((r) => r.key === k) || {}).name).filter(Boolean));
        const hot = new Map();
        ls.forEach((l) => (p.touch || []).forEach((k) => {
          const c = Mapping.choice(l, k);
          if (!c || c.fr < 2) return;
          if (!hot.has(c.title)) hot.set(c.title, new Set());
          hot.get(c.title).add(l.id);
        }));
        const imp = p.impact && p.impact.level != null && p.impact.level !== "" ? CATALOG.friction[+p.impact.level] || "" : "";
        return [`<b>${esc(p.name)}</b>`, this.val(p.desc), esc(touch.join(", ")), esc(imp), [...hot].map(([t, n]) => `${esc(t)} <span class="muted">(${n.size} label${n.size === 1 ? "" : "s"})</span>`).join("<br>"), this.val(p.comms)];
      }), { widths: ["14%", "24%", "20%", "8%", "34%", "24%"] });
    } else html += `<p class="muted">Geen persona’s vastgelegd.</p>`;
    const notes = (st.adoption || {}).notes || {};
    const nl = (typeof ADOPT_NOTES !== "undefined" ? ADOPT_NOTES : []).filter(([k]) => String(notes[k] || "").trim());
    if (nl.length) html += `<h3>Afspraken</h3><table><tbody>${nl.map(([k, t]) => `<tr><th style="width:28%">${esc(t)}</th><td>${this.val(notes[k])}</td></tr>`).join("")}</tbody></table>`;
    return html;
  },
  scenarios(st) {
    const r = typeof XlsxExport.scenarioRows === "function" ? XlsxExport.scenarioRows(st) : [];
    if (!r.length) return "";
    let sc = null;
    try { sc = ScenarioEngine.score(st); } catch (e) { sc = null; }
    const pred = r.some((x) => x.predict);
    return `${sc ? `<p>Score: <b>${sc.pct}%</b> – ${sc.pass} voldoet, ${sc.partial} deels, ${sc.fail} voldoet niet (van ${sc.total}).</p>` : ""}
      ${this.grid(["Scenario", "Label", "Wat merkt de medewerker?", "Resultaat", ...(pred ? ["Voorspelling team"] : [])], r.map((x) => [esc(x.title), esc(x.label), esc(x.outcome), esc(x.status), ...(pred ? [esc(x.predict)] : [])]), { widths: pred ? ["34%", "28%", "14%", "11%", "13%"] : ["40%", "32%", "16%", "12%"] })}`;
  },
  tenant(st) {
    const checks = CATALOG.tenantChecks.filter((c) => { try { return c.when(st); } catch (e) { return false; } });
    const rows = checks.map((c) => {
      const s = (st.tenant.checks || {})[c.id] || {};
      return [`${esc(c.name)}${c.req ? "" : ` <span class="muted">(optioneel)</span>`}`, esc(DOC_TENANT_STATUS[s.status] || "Te doen"), esc(s.owner || ""), `${esc(c.desc || "")}${s.note ? `<br><i>${esc(s.note)}</i>` : ""}`];
    });
    this.extraChecks(st).forEach((c) => rows.push([esc(c.name), "Te doen", "", esc(c.desc)]));
    return this.grid(["Randvoorwaarde", "Status", "Eigenaar", "Toelichting"], rows, { keep: [2], widths: ["30%", "10%", "15%", "45%"] });
  },

  /* ---------- Bijlagen ---------- */
  autoAppendix(st, g, sh) {
    const rows = g.autoPolicies.map((ap) => {
      const grp = new Map();
      ap.rules.forEach((r) => {
        const k = `${r.sits.map((s) => this.sitName(s)).join(", ")} (min. ${Number(r.minCount) || 1} · ${EXPORT_NL.conf(r.confidence)})`;
        if (!grp.has(k)) grp.set(k, []);
        grp.get(k).push(EXPORT_NL.workload(r.workload));
      });
      const rules = [...grp].map(([k, w]) => `<b>${esc(w.join(", "))}:</b> ${esc(k)}`).join("<br>");
      const sup = unique(ap.rules.map((r) => this.support(() => PsExport.autoSupport(ap, r))).filter(Boolean)).join(" / ");
      return [`<b>${esc(ap.name)}</b>`, esc(labelFullName(ap.label, st)), esc(EXPORT_NL.autoMode(ap.mode)), rules || `<span class="muted">geen regels – maak in het portal</span>`, esc(sup)];
    });
    let html = `<h3>Service-side (Exchange, SharePoint, OneDrive)</h3>${this.grid(["Policy", "Label", "Modus", "Regels per workload: informatietypen", "Via script / portal"], rows, { widths: ["20%", "16%", "16%", "38%", "10%"], empty: "Geen service-side auto-labeling." })}`;
    if (sh["Auto-labeling (client)"]) html += `<h3>Client-side (Office-apps)</h3>${this.table(sh["Auto-labeling (client)"])}`;
    return `${html}<p class="note">“(portal)” = trainable classifier: niet via PowerShell in te stellen; voeg deze in het portal toe aan de regel.</p>`;
  },
  dlpRules(sh) {
    if (!sh || !sh.rows.length) return `<p class="muted">Geen DLP-regels.</p>`;
    const H = (n) => sh.head.indexOf(n);
    const iP = 0, iR = 1, iD = H("Samenvatting"), iS = H("Via script / portal"), iA = H("Actie");
    let html = "";
    unique(sh.rows.map((r) => r[iP])).forEach((p) => {
      const rr = sh.rows.filter((r) => r[iP] === p);
      html += `<h3>${esc(p)}</h3>${this.grid(["Regel", "Wat doet de regel", "Via script / portal"], rr.map((r) => [esc(r[iR]), this.val(r[iD] || r[iA] || ""), esc(iS >= 0 ? r[iS] : "")]), { widths: ["26%", "62%", "12%"] })}`;
    });
    return html;
  },

  /* ---------- Opmaak ---------- */
  pageCss(st, keuzes) {
    const m = st.meta || {};
    const head = this.cssStr(`${keuzes ? "Keuzeoverzicht" : "Ontwerp Information Protection & DLP"}${m.customer ? ` – ${m.customer}` : ""}`);
    const foot = this.cssStr(`${this.ver(st)} · Geëxporteerd ${this.dateNl(today())}`);
    const first = keuzes ? "" : `@page :first { @top-left { content: none; } @top-right { content: none; } @bottom-left { content: none; } @bottom-center { content: none; } @bottom-right { content: none; } }`;
    return `<style>@media print { @page { @top-left { content: ${head}; } @top-right { content: ${this.cssStr(this.cls(st))}; } @bottom-left { content: ${foot}; } @bottom-center { content: "Pink Elephant · Protect your Data"; } @bottom-right { content: "Pagina " counter(page) " van " counter(pages); } } ${first} }</style>`;
  },
  cover(st) {
    const m = st.meta || {};
    const ws = CATALOG.workshops.find((w) => w.id === m.workshop || w.key === m.workshop);
    const parts = (m.participants || []).filter((p) => p && p.name).map((p) => `${esc(p.name)}${p.role ? ` – ${esc(p.role)}` : ""}`);
    const fw = typeof FRAMEWORKS !== "undefined" && m.framework && m.framework !== "none" ? (FRAMEWORKS.find((x) => x[0] === m.framework) || [])[1] : "";
    const rows = [["Klant", esc(m.customer || "")], ["Workshopdatum", esc(this.dateNl(m.date || today()))], ["Versie / status", `${esc(this.ver(st))} ${this.tag("proposed")}`], ["Geëxporteerd", esc(this.dateNl(today()))], ["Classificatie", esc(this.cls(st))], ["Normenkader", esc(fw || "")], ["Opgesteld door", m.facilitator ? `${esc(m.facilitator)}${/pink\s*elephant/i.test(m.facilitator) ? "" : " (Pink Elephant)"}` : ""], ["Workshop", ws ? esc(ws.name) : ""], ["Deelnemers", parts.join("<br>")]].filter((r) => r[1]);
    return `<section class="cover"><div class="cover-top">${brandImg("peLogo", "Pink Elephant – maakt IT persoonlijk", "cover-logo")}</div><div class="cover-body"><div class="sub">Pink Elephant · Protect your Data</div><h1>Ontwerp Information Protection&nbsp;&amp;&nbsp;DLP</h1><div class="sub">Microsoft Purview – sensitivity labels, auto-labeling en Data Loss Prevention</div>
      <table class="cover-meta"><tbody>${rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join("")}</tbody></table><p class="cover-note">${esc(DOC_ABOUT)}</p></div>
      <div class="cover-band">${brandImg("peTagline", "Better connected in The Digital Neighborhood", "cover-tagline")}</div></section>`;
  },

  /** Optionele adoptiebijlagen (Impact & adoptie): spiekbrief, labelkaarten (standaard aan) en communicatiepakket (standaard uit). */
  adoptAppx(st, add) {
    if (typeof AdoptKit === "undefined" || !applicableLabels(st).length) return;
    const d = (st.adoption && typeof st.adoption.doc === "object" && st.adoption.doc) || {};
    const safe = (fn) => { try { return fn(); } catch (e) { console.error(e); return ""; } };
    if (!d.noTree) add("spiekbrief", "Spiekbrief: welk label kies ik?", safe(() => { const t = AdoptKit.treeHtml(st); return t ? `<p class="note">Handout voor medewerkers (één A4), opgebouwd uit het classificatieschema.</p>${t}` : ""; }));
    if (!d.noCards) add("labelkaarten", "Labelkaarten", safe(() => { const c = AdoptKit.cardsHtml(st); return c ? `<p class="note">Per label: wanneer gebruik je het, voorbeelddocumenten met markering en wat er gebeurt.</p>${c}` : ""; }));
    if (d.comms) add("communicatie", "Communicatiepakket", safe(() => `<p class="note">Concept-teksten voor de aankondiging, het intranet en de FAQ. Velden tussen [haken] nog invullen.</p>${AdoptKit.commsDoc(st)}`));
  },

  html(st = S(), opts = {}) {
    st = customerState(st, opts.includeInternal === true);
    const m = st.meta || {};
    const g = Generator.all(st);
    const notice = `<p class="callout${Validation.isConcept(st) ? " concept" : ""}"><b>${Validation.isConcept(st) ? "CONCEPT" : esc(XlsxExport.statusName(st))}</b> · ${esc(DOC_ABOUT)}${Validation.isConcept(st) ? " Open punten en aannames moeten nog worden bevestigd." : " De werking is pas bewezen na een test in de tenant."}</p>`;
    if (opts.only === "keuzes") {
      const dec = (st.decisions || []).filter((d) => decisionStatus(d) === "besloten");
      const park = (st.decisions || []).filter((d) => ["open", "bespreken"].includes(decisionStatus(d)));
      return `${this.pageCss(st, true)}<style>@page { size: A4 landscape; }</style><div class="doc keuzes"><div class="doc-brandbar">${brandImg("peLogo", "Pink Elephant – maakt IT persoonlijk", "doc-logo")}</div><h1>Keuzeoverzicht – ter bevestiging</h1><p class="muted">${esc(m.customer || "")} · ${esc(this.dateNl(m.date || today()))} · ${esc(this.ver(st))} · ${esc(this.cls(st))} · Protect your Data – Information Protection &amp;&nbsp;DLP</p>
        ${notice}${Keuzeoverzicht.table(st, { print: true })}
        <h2>Resulterend beleid</h2>${this.policyOverview(st, g)}
        ${dec.length ? `<h2>Besluiten</h2>${this.ul(dec.map((d) => `${esc(d.text)}${d.owner || d.due ? ` <span class="muted">(${esc([d.owner, d.due ? this.dateNl(d.due) : ""].filter(Boolean).join(" · "))})</span>` : ""}`))}` : ""}
        ${park.length ? `<h2>Open punten</h2>${this.ul(park.map((d) => `${esc(d.text)}${d.owner || d.due ? ` <span class="muted">(${esc([d.owner, d.due ? this.dateNl(d.due) : ""].filter(Boolean).join(" · "))})</span>` : ""}`))}` : ""}
        ${this.signoff(st, "Met ondertekening bevestigen partijen dat dit overzicht de keuzes uit de workshop juist weergeeft.")}</div>`;
    }
    const sh = {};
    XlsxExport.sheets(st).forEach((s) => (sh[s.name] = s));
    const main = [], appx = [];
    const add = (list, id, title, body, cls = "") => { if (body) list.push({ id, title, body, cls }); };
    add(main, "samenvatting", "Managementsamenvatting", notice + this.summary(st, g));
    add(main, "doelen", "Doelen, scope en aannames", this.grid(["Onderwerp", "Afspraak"], [["Doelen", m.goals], ["Scope", m.notes], ["Buiten scope", m.exclusions], ["Aannames", m.assumptions]].filter(([,v])=>v).map(([k,v])=>[`${esc(k)}${k === "Aannames" ? ` ${this.tag("assumption")}` : ""}`,this.val(v)]), { widths: ["22%", "78%"] }));
    add(main, "keuzes", "Keuzeoverzicht (Integraal Ontwerpbord)", applicableLabels(st).length ? Keuzeoverzicht.table(st, { print: true }) : `<p class="muted">Nog geen labels.</p>`, "landscape");
    add(main, "beleid", "Resulterend beleid", `<p>${this.tag("proposed")} Uit de keuzes volgen de onderstaande policies; de details staan in de bijlagen. Het PowerShell-script maakt ze pas aan als iemand het na review uitvoert; DLP en auto-labeling starten dan in simulatie.</p>${this.policyOverview(st, g)}`, "brk");
    add(main, "copilot", "Microsoft 365 Copilot", this.copilot(st, g));
    add(main, "adoptie", "Adoptie, impact & communicatie", this.adoption(st));
    add(main, "scenarios", "Scenariotoets", this.scenarios(st));
    add(main, "tenant", "Randvoorwaarden tenant", this.tenant(st));
    add(main, "verantwoording", "Verantwoording", this.accountability(st, g), "brk");
    const parentIdx = new Set(g.labels.map((gl, i) => (gl.isParent ? i : -1)).filter((i) => i >= 0));
    if (sh["Labels"]) add(appx, "labels", "Sensitivity labels – instellingen", `<p class="note">Per label de configuratie zoals die in de Purview-portal wordt ingericht (Information Protection › Sensitivity labels).</p>${this.records(sh["Labels"], 1, { note: (r, i) => (parentIdx.has(i) ? "Parent label: groepeert de sublabels en wordt zelf niet toegepast; de instellingen staan bij de sublabels." : "") })}`);
    if (sh["Labelbeleid"]) add(appx, "labelbeleid", "Labelbeleid (publicatie)", this.records(sh["Labelbeleid"], 1));
    add(appx, "autolabel", "Auto-labeling", this.autoAppendix(st, g, sh));
    if (sh["Informatietypen"]) add(appx, "sits", "Gevoelige informatietypen & classifiers", this.table(sh["Informatietypen"], [0, 1, 4, 5, 6]));
    if (sh["DLP-policies"]) add(appx, "dlp", "DLP-policies", this.table(sh["DLP-policies"], [0, 1, 2, 3, 5, 6, 7, 8]));
    if (sh["DLP-regels"]) add(appx, "dlpregels", "DLP-regels", this.dlpRules(sh["DLP-regels"]));
    if (sh["Endpoint-matrix"] && sh["Endpoint-matrix"].rows.length) add(appx, "endpoint", "Endpoint DLP", `<h3>Acties per label</h3>${this.table(sh["Endpoint-matrix"])}<h3>Endpoint DLP settings</h3>${this.table(sh["Endpoint-instellingen"], [0, 1])}`, "landscape");
    else if (sh["Endpoint-instellingen"]) add(appx, "endpoint", "Endpoint DLP", `<h3>Endpoint DLP settings</h3>${this.table(sh["Endpoint-instellingen"], [0, 1])}`);
    if (sh["Validatie"]) add(appx, "validatie", "Validatie & aandachtspunten", this.table(sh["Validatie"], null, { empty: "Geen bevindingen." }));
    if (sh["Besluiten"]) add(appx, "besluiten", "Besluiten en onderbouwing", this.records(sh["Besluiten"], 1));
    if (sh["Agenda"]) add(appx, "agenda", "Workshopagenda", `<p>Beschikbare tijd: ${esc(st.workshop?.duration || "niet ingevuld")} minuten.</p>${this.records(sh["Agenda"], 0)}`);
    add(appx, "scenariodetails", "Scenario's: afwegingen en acceptatie", this.grid(["Scenario", "Beslissende regel", "Bespreekpunten"], XlsxExport.scenarioRows(st).map((r)=>[esc(r.title),esc(r.rule),this.val(r.talk)])));
    if (opts.includeInternal && m.internalNotes) add(appx, "intern", "INTERN – facilitatornotities", this.val(m.internalNotes));
    this.adoptAppx(st, (id, title, body) => add(appx, id, title, body));
    const L = (i) => String.fromCharCode(65 + i);
    return `${this.pageCss(st, false)}<div class="doc">${this.cover(st)}
      <section class="page-break toc-page"><h2>Inhoud</h2><ol class="toc">${main.map((s) => `<li>${esc(s.title)}</li>`).join("")}</ol>
      <div class="toc-appx"><b>Bijlagen</b><ol class="toc" type="A">${appx.map((s) => `<li>${esc(s.title)}</li>`).join("")}</ol></div>
      ${this.about(st)}
      <h3>Versiebeheer</h3>${this.versions(st)}
      <p class="note">Gegenereerd met de Pink Elephant Workshop Designer op ${esc(this.dateNl(today()))}. Microsoft-termen staan in het Engels (tussen haakjes), zodat ze 1-op-1 terug te vinden zijn in de Purview-portal.</p></section>
      ${main.map((s, i) => `<section class="${i === 0 || s.cls ? "page-break " : ""}${s.cls}"><h2>${i + 1}. ${esc(s.title)}</h2>${s.body}</section>`).join("")}
      ${appx.map((s, i) => `<section class="page-break ${s.cls}"><h2>Bijlage ${L(i)}. ${esc(s.title)}</h2>${s.body}</section>`).join("")}</div>`;
  },

  print(opts = {}) {
    const root = document.getElementById("print-root");
    if (!root) { Toast.show("Afdrukken niet beschikbaar. Heropen de app.", "err"); return false; }
    const st = S();
    try { root.innerHTML = this.html(st, opts); } catch (e) { console.error(e); Toast.show("Document maken mislukt: " + esc(e.message), "err"); return false; }
    const prev = document.title;
    document.title = safeFileName(`${opts.only === "keuzes" ? "Keuzeoverzicht" : "Ontwerp IP & DLP"} - ${st.meta.customer || "klant"} - ${st.meta.date || today()}`);
    const done = () => { document.title = prev; root.innerHTML = ""; window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    setTimeout(() => {
      try {
        window.print();
        if (S() === st) markExported();
        Toast.show("Afdrukvenster aangevraagd. Controleer zelf of de afdruk of PDF is opgeslagen.", "info");
      } catch (e) {
        console.error(e);
        done();
        Toast.show("Afdrukken mislukt. Probeer het opnieuw.", "err");
      }
    }, 60);
    return true;
  },
};
