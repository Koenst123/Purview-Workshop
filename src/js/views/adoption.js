/* View: Impact & adoptie – persona-heatmap, uitrol, spiekbrief, labelkaarten, communicatiepakket, persona-reis, quiz en meten */
/* title/desc worden ook gebruikt door de Excel-export; name/goal/actions/role/done alleen in de view (voorbeeldaanpak). */
const ADOPT_PHASES = [
  { key: "prep", icon: "settings", title: "0 · Voorbereiden", name: "Voorbereiden", desc: "Tenantvoorwaarden, labels publiceren aan een pilotgroep, key-users trainen, communicatie klaarzetten.", modes: [],
    goal: "Basis klaar en pilotgroep gestart.", actions: ["Tenantvoorwaarden controleren, waaronder Audit", "Labels publiceren aan een pilotgroep", "Key-users trainen", "Communicatie klaarzetten"], role: "Projectleider, beheer en key-users", done: "Pilotgroep gebruikt de labels; vragen zijn verwerkt in spiekbrief en FAQ." },
  { key: "sim", icon: "eye", title: "1 · Simuleren", name: "Simuleren", desc: "DLP- en auto-labelingpolicies in simulatiemodus; 1–2 weken Activity explorer en DLP-alerts bekijken.", modes: ["simulation"],
    goal: "Zien wat policies doen, zonder impact voor gebruikers.", actions: ["DLP- en auto-labelingpolicies in simulatiemodus", "Matches beoordelen in Activity explorer en de simulatieresultaten", "Informatietypen en drempels bijstellen"], role: "Purview-beheer met informatiebeveiliging", done: "Matches beoordeeld en false positives verklaard of opgelost." },
  { key: "tips", icon: "bell", title: "2 · Policy tips aan", name: "Policy tips aan", desc: "Simulatie + policy tips: gebruikers zien meldingen, er wordt nog niet geblokkeerd. Ideaal om de impact te meten.", modes: ["simulationTips"],
    goal: "Gebruikers zien meldingen; er wordt nog niets tegengehouden.", actions: ["Policies in simulatie met policy tips", "Aankondiging en intranettekst versturen", "Servicedesk instrueren"], role: "Communicatie, servicedesk en key-users", done: "Meldingen worden begrepen; vragen en tickets nemen af." },
  { key: "enforce", icon: "shield", title: "3 · Handhaven", name: "Handhaven", desc: "Policies aanzetten, gefaseerd per locatie of afdeling (admin units / groepen). Begin met de gevoeligste labels.", modes: ["enable"],
    goal: "Policies gefaseerd aanzetten.", actions: ["Per locatie of groep inschakelen", "Beginnen met de gevoeligste labels", "Alerts en meldingen dagelijks volgen in de eerste weken"], role: "Purview-beheer, met akkoord van de opdrachtgever", done: "Geen onverwachte blokkades in kritieke processen." },
  { key: "eval", icon: "chart", title: "4 · Evalueren", name: "Evalueren", desc: "Overrides, false positives en incidenten periodiek bespreken; drempels en SIT’s bijstellen.", modes: [],
    goal: "Bijsturen op basis van gebruik en meldingen.", actions: ["Overrides, false positives en incidenten bespreken", "Drempels, informatietypen en policy tips bijstellen", "Spiekbrief en FAQ bijwerken"], role: "Informatiebeveiliging met key-users", done: "Vast meetritme afgesproken (zie Meten)." },
];
const ADOPT_NOTES = [["general", "Algemene aandachtspunten"], ["training", "Training & instructie"], ["support", "Servicedesk & ondersteuning"], ["kpi", "Succescriteria / KPI’s"]];
/* Sectorpersona's die met één klik kunnen worden aangevuld (bestaande namen worden overgeslagen). */
const ADOPT_SECTOR_PERSONAS = {
  zorg: [
    { name: "Zorgprofessional (arts/verpleegkundige)", icon: "heart", desc: "Werkt met patiëntgegevens, verwijst naar en communiceert met externe zorgpartners.", touch: ["publish", "marking", "encryption", "dlp_exchange", "dlp_teams", "dlp_endpoint", "dlp_copilot", "meetings"] },
    { name: "Zorgadministratie / declaratie", icon: "table", desc: "Verwerkt polisnummers, AGB-codes en declaraties richting zorgverzekeraars.", touch: ["dlp_exchange", "dlp_sharing", "dlp_endpoint", "autolabel"] },
    { name: "Medisch secretariaat", icon: "mail", desc: "Verstuurt brieven en verwijzingen naar huisartsen en patiënten; plant afspraken.", touch: ["publish", "marking", "encryption", "dlp_exchange", "dlp_endpoint"] },
  ],
  overheid: [
    { name: "Medewerker Burgerzaken", icon: "user", desc: "Werkt met BRP-gegevens, BSN en reisdocumenten; heeft dagelijks contact met inwoners.", touch: ["publish", "marking", "dlp_exchange", "dlp_endpoint", "dlp_copilot"] },
    { name: "Consulent sociaal domein", icon: "heart", desc: "Voert keukentafelgesprekken, maakt beschikkingen Wmo/Jeugd en deelt met zorgaanbieders.", touch: ["encryption", "dlp_exchange", "dlp_teams", "dlp_endpoint", "meetings"] },
    { name: "Handhaver / BOA", icon: "shield", desc: "Werkt mobiel met kentekens, processen-verbaal en foto’s.", touch: ["dlp_endpoint", "dlp_sharing", "marking"] },
    { name: "Raadsgriffie", icon: "book", desc: "Verspreidt raads- en collegestukken, ook geheime stukken met geheimhoudingsplicht.", touch: ["encryption", "publish", "dlp_exchange", "dlp_sharing"] },
  ],
  financieel: [
    { name: "Klantadviseur / relatiebeheerder", icon: "user", desc: "Mailt offertes, polissen en klantdossiers met IBAN en BSN naar klanten en tussenpersonen.", touch: ["publish", "marking", "encryption", "dlp_exchange", "dlp_sharing", "dlp_copilot"] },
    { name: "Backoffice / betalingsverkeer", icon: "table", desc: "Verwerkt betaalbestanden, IBAN’s en creditcardgegevens; werkt met exports uit kernsystemen.", touch: ["dlp_exchange", "dlp_endpoint", "autolabel", "dlp_copilot"] },
    { name: "Compliance officer (Wwft)", icon: "shieldcheck", desc: "Beoordeelt klantonderzoek en meldingen ongebruikelijke transacties; ontvangt DLP-incidenten.", touch: ["notify", "encryption", "dlp_exchange"] },
  ],
};

const AdoptUI = {
  rows() { return CATALOG.boardRows.filter((r) => r.kind === "choice"); },
  designed(l) { return this.rows().some((r) => (Mapping.level(l, r.key) || 0) > 0); },
  cell(p, l) {
    const touch = (p.touch || []).filter((k) => this.rows().some((r) => r.key === k));
    const parts = touch.map((k) => { const c = Mapping.choice(l, k); return { k, c, fr: c ? c.fr : 0 }; });
    const total = sum(parts.map((x) => x.fr));
    const avg = touch.length ? total / touch.length : 0;
    const h = total === 0 ? 0 : avg < 0.5 ? 1 : avg < 1.2 ? 2 : avg < 2 ? 3 : 4;
    return { total, avg, h, parts: parts.filter((x) => x.fr > 0) };
  },
  hot(p, st) {
    const out = [];
    applicableLabels(st).forEach((l) => (p.touch || []).forEach((k) => { const c = Mapping.choice(l, k); if (c && c.fr >= 2) out.push({ l, c, k }); }));
    return out;
  },
  missingSector(st) {
    const have = new Set((st.personas || []).map((p) => String(p.name || "").trim().toLowerCase()));
    return (ADOPT_SECTOR_PERSONAS[st.meta.sector] || []).filter((p) => !have.has(p.name.toLowerCase()));
  },
  phase(st, k) { return ((st.adoption || {}).phases || {})[k] || {}; },
  /** Aandachtspunten per fase, afgeleid uit het ontwerp (geen aannames). */
  attention(st) {
    const K = AdoptKit, L = K.leaves(st), out = {}, s = K.settings(st);
    const add = (ph, ic, t, ls) => { (out[ph] = out[ph] || []).push({ ic, t, tip: ls ? ls.map((l) => K.full(l, st)).join(", ") : "" }); };
    const has = (fn) => L.filter((l) => { try { return fn(l); } catch (e) { return false; } });
    const act = (l, a) => ["exchange", "sharing", "teams"].some((d) => { const r = K.rule(l, d, st); return r && r.action === a; });
    const epLv = (l, lv) => { const r = K.rule(l, "endpoint", st); return !!(r && ((r.actions && r.actions.endpoint) || []).some((x) => x.level === lv)); };
    const enc = has((l) => ["assignNow", "userDefined"].includes(K.enc(l).mode));
    const ep = has((l) => K.rule(l, "endpoint", st));
    const svc = has((l) => (((l.cfg || {}).autolabel || {}).service || {}).enabled);
    const ov = has((l) => act(l, "override") || epLv(l, "warn"));
    const bl = has((l) => act(l, "block") || epLv(l, "block"));
    const cp = has((l) => { const r = K.rule(l, "copilot", st); return r && r.actions && r.actions.copilotExclude; });
    const n = (a) => plural(a.length, "label", "labels");
    if (s.mandatoryDocs || s.mandatoryEmail) add("prep", "checkcircle", "Verplicht labelen: train gebruikers vóór publicatie aan iedereen.");
    if (enc.length) add("prep", "lock", `Versleuteling (${n(enc)}): test openen door externen en op mobiel in de pilot.`, enc);
    if (ep.length) add("prep", "laptop", `Endpoint DLP (${n(ep)}): apparaten onboarden; test USB en afdrukken in de pilot.`, ep);
    if (svc.length) add("sim", "wand", `Auto-labeling (${n(svc)}): beoordeel de simulatieresultaten vóór inschakelen.`, svc);
    if (ov.length) add("tips", "chat", `Doorgaan met reden (${n(ov)}): leg uit wanneer dat mag; volg overrides.`, ov);
    if (cp.length) add("tips", "sparkle", `Copilot-uitsluiting (${n(cp)}): leg uit waarom Copilot deze inhoud niet gebruikt.`, cp);
    if (bl.length) add("enforce", "shield", `Blokkades (${n(bl)}): eerst een pilot met de betrokken afdelingen; servicedesk paraat.`, bl);
    if (s.justification) add("eval", "redo", "Reden bij label verlagen: bespreek de opgegeven redenen met key-users.");
    return out;
  },
};

Actions["per-add"] = () => {
  let id = "";
  Store.update((st) => { id = uid("per"); st.personas.push({ id, name: "Nieuwe persona", icon: "user", desc: "", touch: [], comms: "", impact: {} }); UI.perOpen = id; });
  setTimeout(() => { const el = document.querySelector(`[data-bind="per:${id}:name"]`); if (el) { el.focus(); el.select && el.select(); el.scrollIntoView({ block: "center" }); } }, 30);
};
Actions["per-sector"] = () => {
  let n = 0;
  Store.update((st) => { AdoptUI.missingSector(st).forEach((p) => { st.personas.push({ id: uid("per"), ...clone(p), comms: "", impact: {} }); n++; }); });
  if (n) Toast.show(`${plural(n, "persona", "persona’s")} toegevoegd.`, "ok");
};
Actions["per-del"] = (el) => confirmDialog("Persona verwijderen?", "De notities bij deze persona gaan verloren.", () => Store.update((st) => { st.personas = st.personas.filter((p) => p.id !== el.dataset.id); }), "Verwijderen", true);
Actions["per-touch"] = (el) => Store.update((st) => {
  const p = byId(st.personas, el.dataset.id); if (!p) return;
  const k = el.dataset.key;
  p.touch = (p.touch || []).includes(k) ? p.touch.filter((x) => x !== k) : [...(p.touch || []), k];
});
Actions["per-open"] = (el) => { UI.perOpen = UI.perOpen === el.dataset.id ? null : el.dataset.id; App.render(); };


/* ---------- AdoptKit: adoptiemateriaal afgeleid uit het ontwerp (ook gebruikt door js/export/document.js) ---------- */
const ADP_STOP = new Set("met van een het de en voor naar die dat werkt zijn heeft ook als bij aan uit over maakt deelt dagelijks contact the and with wat wie hoe niet wel maar zoals andere alle onze jouw zij hij wordt worden kan kunnen mag mogen veel eerste".split(" "));
const ADP_EXT_TYPES = ["domain", "partner", "authenticated"];

const AdoptKit = {
  A() { return CATALOG.adoption; },
  str(v) { return typeof v === "string" ? v : typeof v === "number" ? String(v) : ""; },
  hex(c) { return /^#[0-9a-f]{6}$/i.test(String(c || "")) ? c : "#69797E"; },
  nm(l) { return l ? this.str(l.displayName).trim() || this.str(l.name) : ""; },
  full(l, st) { return l ? labelFullName(l, st) : ""; },
  cut(s, n) { s = this.str(s).replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s; },
  /** Eerste zin (max. n tekens). */
  first(t, n = 150) {
    const s = this.str(t).replace(/\s+/g, " ").trim();
    if (!s) return "";
    const re = /[.!?](?=\s|$)/g;
    let m, end = s.length;
    while ((m = re.exec(s))) {
      const w = (/(\S+)$/.exec(s.slice(0, m.index + 1)) || ["", ""])[1].toLowerCase();
      if (m[0] === "." && /^(bijv|bv|vb|o\.a|e\.d|e\.a|m\.b\.t|i\.v\.m|t\.a\.v|zgn|incl|excl|ca|nr|resp|enz|etc|evt|d\.w\.z|z\.s\.m|e\.g|i\.e)\.$/.test(w) && m.index + 1 < s.length) continue;
      end = m.index + 1; break;
    }
    return this.cut(s.slice(0, end), n);
  },
  sent(s) { s = this.str(s).trim(); return s && !/[.!?…]$/.test(s) ? s + "." : s; },
  lc(s) { return /^(Teams|Copilot|Office|Outlook|Word|Excel|PowerPoint)/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1); },
  join(a) { return a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " en " + a[a.length - 1]; },
  date(v) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(this.str(v)); return m && +m[2] >= 1 && +m[2] <= 12 ? `${+m[3]} ${this.A().months[+m[2] - 1]} ${m[1]}` : ""; },
  hash(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; },
  rng(seed) { let a = seed || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; },
  shuffle(arr, r) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  org(st) { return this.str((st.meta || {}).customer).trim() || "onze organisatie"; },
  kwRe(k) { return new RegExp("(^|[^a-z0-9à-ÿ])" + k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"); },

  /* ---------- Schema ---------- */
  tops(st) { return orderedLabels(st).filter((l) => !parentOf(l, st)); },
  kids(l, st) { return orderedLabels(st).filter((x) => x.parentId === l.id); },
  leaves(st) { return applicableLabels(st); },
  /** Niveau (openbaar/intern/vertrouwelijk/…) op naam, dan beschrijving; sublabels volgen hun parent. */
  cat(l, st) {
    const p = parentOf(l, st);
    if (p) return this.cat(p, st);
    const L = this.A().levels;
    return L.find((x) => x.re.test(this.nm(l))) || L.find((x) => x.re.test(this.str(l.tooltip))) || this.A().otherLevel;
  },
  examples(l, st) {
    const out = [], add = (x) => { x = this.cut(x, 44); if (x && out.length < 3 && !out.some((y) => y.toLowerCase() === x.toLowerCase())) out.push(x); };
    (Array.isArray(l.info) ? l.info : []).forEach((x) => add(this.str(x)));
    if (out.length < 3) {
      let al = [];
      try { al = Generator.sitAliases(labelSits(l, st)); } catch (e) { al = []; }
      const tpl = ["Overzicht met {s}", "Brief met {s}", "E-mail met {s}"];
      al.slice(0, 3).forEach((s) => add(tpl[out.length % 3].replace("{s}", s)));
    }
    const p = parentOf(l, st);
    if (out.length < 3 && p) (Array.isArray(p.info) ? p.info : []).forEach((x) => add(this.str(x)));
    if (out.length < 3) (this.A().examples[this.cat(l, st).key] || this.A().examples.other).forEach(add);
    return out;
  },
  when(l, st) { const p = parentOf(l, st); return this.first(l.tooltip) || this.first(p && p.tooltip) || ""; },
  settings(st) {
    try { const ps = Generator.labelPolicies(st); const p = ps.find((x) => x.policy && x.policy.scope === "all") || ps[0]; return (p && p.settings) || {}; } catch (e) { return {}; }
  },
  defaultLabel(st) { const s = this.settings(st), l = s.defaultDocs ? labelById(s.defaultDocs, st) : null; return l ? this.full(l, st) : ""; },
  enc(l) { return ((l.cfg || {}).encryption) || {}; },
  perms(l) { const e = this.enc(l); return e.mode === "assignNow" && Array.isArray(e.permissions) ? e.permissions : []; },
  extract(l) { const p = this.perms(l); return !p.length || p.some((x) => { try { return LabelDetail.rightsOf(x).includes("EXTRACT"); } catch (e) { return true; } }); },

  /* ---------- DLP en effecten in gewone taal ---------- */
  rule(l, dom, st) { try { const r = Generator.ruleFor(l, dom, st); return r && r.effective !== false ? r : null; } catch (e) { return null; } },
  mode(dom, st) { try { return Generator.modeFor(dom, st); } catch (e) { return ""; } },
  modeNote(dom, st) { return ({ simulation: " (nu nog in simulatie: je merkt er niets van)", simulationTips: " (proefperiode: alleen een melding)", disable: " (staat nog uit)" })[this.mode(dom, st)] || ""; },
  /** {ic, k: ok|info|warn|block|muted, t, p?} of null. */
  dlpText(l, dom, st) {
    const r = this.rule(l, dom, st);
    if (!r) return null;
    const ic = { exchange: "mail", sharing: "share", teams: "teams", endpoint: "laptop", copilot: "sparkle" }[dom] || "shield";
    const note = this.modeNote(dom, st);
    if (dom === "endpoint") {
      const es = this.A().endpointShort, list = (r.actions && r.actions.endpoint) || [];
      const by = (lv) => list.filter((x) => x.level === lv).map((x) => es[x.key] || x.key);
      const b = by("block"), w = by("warn"), parts = [];
      if (b.length) parts.push(`${this.join(b)} wordt geblokkeerd`);
      if (w.length) parts.push(`bij ${this.join(w)} krijg je een waarschuwing; doorgaan kan met een reden`);
      if (!parts.length) return { ic, k: "muted", t: `Op je werkplek: acties met dit bestand worden alleen vastgelegd${note}`, p: "" };
      const p = parts.join("; ");
      return { ic, k: b.length ? "block" : "warn", t: `Op je werkplek: ${p}${note}`, p: p + note };
    }
    if (dom === "copilot") return r.actions && r.actions.copilotExclude ? { ic, k: "block", t: `Copilot gebruikt de inhoud niet in antwoorden${note}` } : null;
    const where = {
      exchange: { external: "E-mail naar externe ontvangers", internal: "E-mail binnen de organisatie", all: "E-mail (alle ontvangers)" },
      sharing: { external: "Delen met externen via OneDrive/SharePoint", anyone: "Delen via een ‘Iedereen’-link", internal: "Delen binnen de organisatie", all: "Delen via OneDrive/SharePoint" },
      teams: { external: "Teams-chat met gasten en externen", internal: "Teams-chat binnen de organisatie", all: "Teams-chats en -kanalen" },
    }[dom] || {};
    const w = where[r.scope] || where.external || "Delen";
    const ov = String((r.notify && r.notify.override) || "");
    const how = { block: "wordt geblokkeerd", override: ov === "WithoutJustification" ? "geeft een waarschuwing; je kunt doorgaan" : "geeft een waarschuwing; doorgaan kan met een zakelijke reden", tip: "geeft een melding (policy tip)", encrypt: "wordt automatisch versleuteld", audit: "wordt alleen vastgelegd" }[r.action];
    if (!how) return null;
    const k = { block: "block", override: "warn", tip: "info", encrypt: "ok", audit: "muted" }[r.action];
    return { ic, k, t: `${w} ${how}${note}` };
  },
  effects(l, st) {
    const out = [], e = this.enc(l), ctx = LabelDetail.ctx(l, st);
    if (e.mode === "assignNow") {
      const who = unique(this.perms(l).map((p) => { try { return Mapping.principalName(p, st); } catch (x) { return ""; } }).filter(Boolean));
      out.push({ ic: "lock", k: "ok", t: `Versleuteld: alleen te openen door ${who.length ? this.join(who.slice(0, 3)) + (who.length > 3 ? " e.a." : "") : "de eigenaar"}` });
      if (!this.extract(l)) out.push({ ic: "sparkle", k: "warn", t: "Copilot kan de inhoud niet samenvatten: het gebruiksrecht EXTRACT (kopiëren) ontbreekt" });
    } else if (e.mode === "userDefined") {
      const o = (e.userDefined || {}).outlook;
      out.push({ ic: "lock", k: "ok", t: o === "DoNotForward" ? "E-mail: Niet doorsturen (Do Not Forward) – niet doorsturen, afdrukken of kopiëren" : o === "EncryptOnly" ? "E-mail: alleen versleutelen (Encrypt-Only)" : "Versleuteld: je kiest zelf wie toegang krijgt" });
    } else if (e.mode === "remove") out.push({ ic: "unlock", k: "muted", t: "Bestaande versleuteling wordt verwijderd" });
    else out.push({ ic: "unlock", k: "muted", t: "Niet versleuteld" });
    const m = (l.cfg && l.cfg.marking) || {};
    const mk = [["header", "koptekst"], ["footer", "voettekst"], ["watermark", "watermerk"]].filter(([k]) => m[k] && m[k].enabled && this.str(m[k].text).trim())
      .map(([k, n]) => `${n} ‘${this.cut(LabelDetail.resolve(m[k].text, "W", ctx), 40)}’`);
    if (mk.length) out.push({ ic: "watermark", k: "info", t: `Markering: ${mk.join(" · ")}` });
    const a = (l.cfg && l.cfg.autolabel) || {}, cm = (a.client || {}).mode;
    if (cm === "recommend") out.push({ ic: "wand", k: "info", t: "Office stelt dit label voor bij gevoelige gegevens" });
    else if (cm === "auto") out.push({ ic: "wand", k: "info", t: "Office past dit label automatisch toe bij gevoelige gegevens" });
    if ((a.service || {}).enabled) out.push({ ic: "wand", k: "info", t: `Bestaande bestanden en mail worden automatisch gelabeld${a.service.mode !== "enable" ? " (eerst in simulatie)" : ""}` });
    const dl = ["exchange", "sharing", "teams", "endpoint", "copilot"].map((d) => this.dlpText(l, d, st)).filter(Boolean);
    if (dl.length) out.push(...dl); else out.push({ ic: "checkcircle", k: "ok", t: "Geen DLP-regels voor dit label" });
    return out;
  },
  fxList(fx) { return `<ul class="adp-fx">${fx.map((f) => `<li class="fx-${esc(f.k)}">${icon(f.ic, "s")}<span>${esc(f.t)}</span></li>`).join("")}</ul>`; },

  /* ---------- Spiekbrief (beslisboom) ---------- */
  /** Ja/nee-vragen tussen opeenvolgende hoofdlabels (laag → hoog). side = uitkomst opzij, down = verder (op de laatste stap ook een label). */
  questions(st) {
    const T = this.tops(st), n = T.length;
    if (!n) return { steps: [], single: null };
    if (n === 1) return { steps: [], single: T[0] };
    const used = new Set(), steps = [];
    for (let k = 0; k < n - 1; k++) {
      const lo = T[k], hi = T[k + 1], cl = this.cat(lo, st), ch = this.cat(hi, st), last = k === n - 2;
      let s;
      if ((cl.key === "public" || cl.key === "personal") && !used.has(cl.key)) {
        used.add(cl.key);
        s = { q: cl.q, hint: cl.hint, side: { ans: "Ja", l: lo }, down: { ans: "Nee", l: last ? hi : null } };
      } else if (ch.q && ch.key !== cl.key && ch.key !== "public" && ch.key !== "personal" && !used.has(ch.key)) {
        used.add(ch.key);
        s = { q: ch.q, hint: ch.hint, side: { ans: "Nee", l: lo }, down: { ans: "Ja", l: last ? hi : null } };
      } else s = { q: `Is het gevoeliger dan ‘${this.nm(lo)}’?`, hint: this.first(hi.tooltip, 110), side: { ans: "Nee", l: lo }, down: { ans: "Ja", l: last ? hi : null } };
      steps.push(s);
    }
    return { steps, single: null };
  },
  outHtml(l, ans, st) {
    const cat = this.cat(l, st), kids = this.kids(l, st), ex = this.examples(l, st), d = this.first(l.tooltip, 130);
    const sub = kids.length ? `<div class="adp-subs"><span class="adp-subq">${icon("users", "s")}${esc(this.A().subQuestion)}</span>${kids.map((c) => {
      const a = this.cut(c.audience, 46) || this.first(c.tooltip, 70);
      return `<span class="adp-sub" style="--lc:${this.hex(c.color)}"><b>${esc(this.nm(c))}</b>${a ? `<small>${esc(a)}</small>` : ""}</span>`;
    }).join("")}</div>` : "";
    return `<div class="adp-out" style="--lc:${this.hex(l.color)}">${ans ? `<span class="adp-ans ${ans === "Ja" ? "yes" : "no"}">${ans}</span>` : ""}
      <div class="adp-out-b"><div class="adp-chip">${icon(cat.icon || "tag", "s")}<b>${esc(this.nm(l))}</b></div>${d ? `<p class="adp-out-d">${esc(d)}</p>` : ""}${ex.length ? `<p class="adp-out-ex"><b>Bijv.</b> ${esc(ex.join(" · "))}</p>` : ""}${sub}</div></div>`;
  },
  treeHtml(st) {
    const Q = this.questions(st);
    if (!Q.single && !Q.steps.length) return "";
    const s = this.settings(st), dl = this.defaultLabel(st);
    const tips = [["bulb", "Twijfel je? Kies het hogere label."]];
    if (s.justification) tips.push(["redo", "Lager label of label weghalen? De app vraagt om een korte reden."]);
    if (dl) tips.push(["tag", `Nieuwe documenten krijgen standaard ‘${dl}’. Klopt dat niet? Pas het aan.`]);
    if (s.mandatoryDocs || s.mandatoryEmail) tips.push(["checkcircle", "Een label kiezen is verplicht."]);
    tips.push(["laptop", "Kies het label via Gevoeligheid (Sensitivity) in Word, Excel, PowerPoint en Outlook – ook op je telefoon en in de browser."]);
    const flow = Q.single ? `<div class="adp-step single"><div class="adp-outs">${this.outHtml(Q.single, "", st)}</div></div>` : Q.steps.map((x, i) => {
      const last = i === Q.steps.length - 1;
      const outs = !last ? [x.side] : x.side.ans === "Ja" ? [x.side, x.down] : [x.down, x.side];
      return `<div class="adp-step${last ? " last" : ""}"><div class="adp-q"><span class="adp-qn">${i + 1}</span><div><b>${esc(x.q)}</b>${x.hint ? `<small>${esc(x.hint)}</small>` : ""}</div></div>
        <div class="adp-outs">${outs.map((o) => this.outHtml(o.l, o.ans, st)).join("")}</div></div>${last ? "" : `<div class="adp-down"><span class="adp-ans ${x.down.ans === "Ja" ? "yes" : "no"}">${x.down.ans}</span><span>ga naar vraag ${i + 2}</span></div>`}`;
    }).join("");
    return `<section class="adp-sheet" aria-label="Spiekbrief: welk label kies ik?"><header class="adp-sheet-h"><div><span class="adp-eb">${esc(this.org(st))} · Spiekbrief</span><h2>Welk label kies ik?</h2><p>Begin bij vraag 1 en volg je antwoord.</p></div>
      <div class="adp-legend" aria-label="Labels van laag naar hoog">${this.tops(st).map((t) => `<span class="adp-dot" style="--lc:${this.hex(t.color)}"><i></i>${esc(this.nm(t))}</span>`).join("")}</div></header>
      <div class="adp-flow">${flow}</div>
      <footer class="adp-tips">${tips.map(([ic, t]) => `<span>${icon(ic, "s")}${esc(t)}</span>`).join("")}</footer></section>`;
  },

  /* ---------- Labelkaarten ---------- */
  docType(name) { const D = this.A().docTypes; return D.find((d) => d.re.test(name)) || D[D.length - 1]; },
  thumb(ex, l, st, ctx) {
    const dt = this.docType(ex), file = ex + dt.ext, c = Object.assign({}, ctx || LabelDetail.ctx(l, st), { item: file });
    const m = (l.cfg && l.cfg.marking) || {}, em = this.enc(l).mode;
    const mk = (k, n) => (m[k] && m[k].enabled && this.str(m[k].text).trim() ? this.cut(LabelDetail.resolve(m[k].text, dt.app, c), n) : "");
    const col = (k) => LabelDetail._hex((m[k] || {}).color, "#000000");
    const hd = mk("header", 46), ft = mk("footer", 46), wm = ["doc", "ppt", "pdf"].includes(dt.key) ? mk("watermark", 22) : "";
    const ln = (n) => Array.from({ length: n }, (_, i) => `<i${i % 3 === 2 ? ' class="s"' : ""}></i>`).join("");
    const body = { doc: ln(10), pdf: ln(10), xls: `<b class="adp-grid">${"<i></i>".repeat(21)}</b>`, ppt: `<b class="adp-slide"><i></i><i class="s"></i><i class="s"></i></b>${ln(3)}`, mail: `<i class="to"></i><i class="sub"></i>${ln(7)}` }[dt.key] || ln(10);
    const app = dt.key === "mail" ? icon("mail", "s") : { xls: "X", ppt: "P", pdf: "PDF" }[dt.key] || "W";
    return `<figure class="adp-thumb t-${dt.key}" style="--lc:${this.hex(l.color)}" title="${esc(file)}"><div class="adp-page" aria-hidden="true"><span class="adp-app">${app}</span>${hd ? `<span class="adp-mk hd" style="color:${col("header")}">${esc(hd)}</span>` : ""}<span class="adp-body">${body}</span>${wm ? `<span class="adp-wm" style="color:${col("watermark")}">${esc(wm)}</span>` : ""}${ft ? `<span class="adp-mk ft" style="color:${col("footer")}">${esc(ft)}</span>` : ""}<span class="adp-badge">${em === "assignNow" || em === "userDefined" ? icon("lock", "s") : ""}${esc(this.cut(this.nm(l), 18))}</span></div><figcaption>${esc(file)}</figcaption></figure>`;
  },
  cardHtml(l, st, o = {}) {
    const p = parentOf(l, st), cat = this.cat(l, st), ex = this.examples(l, st), ctx = LabelDetail.ctx(l, st);
    const when = this.when(l, st) || `Bijvoorbeeld voor ${ex.join(", ").toLowerCase()}.`;
    return `<article class="adp-lcard" style="--lc:${this.hex(l.color)}"><header class="adp-lc-h"><span class="adp-lc-ic">${icon(cat.icon || "tag")}</span><div class="adp-lc-t">${p ? `<span class="adp-lc-p">${esc(this.nm(p))}</span>` : ""}<h3>${esc(this.nm(l))}</h3>${this.str(l.audience).trim() ? `<span class="adp-lc-a">${icon("users", "s")}${esc(this.cut(l.audience, 60))}</span>` : ""}</div></header>
      <p class="adp-lc-when"><b>Wanneer?</b> ${esc(when)}</p>
      <div class="adp-thumbs">${ex.map((x) => this.thumb(x, l, st, ctx)).join("")}</div>
      <div class="adp-lc-what"><b>Wat gebeurt er?</b>${this.fxList(this.effects(l, st))}</div>
      ${o.app ? `<div class="adp-lc-foot"><button type="button" class="btn small subtle" data-action="pv-open" data-label="${esc(l.id)}" data-app="office">${icon("eye", "s")} Bekijk in Office</button></div>` : ""}</article>`;
  },
  cardsHtml(st, o = {}) { const ls = this.leaves(st); return ls.length ? `<div class="adp-cards">${ls.map((l) => this.cardHtml(l, st, o)).join("")}</div>` : ""; },

  /* ---------- Communicatiepakket ---------- */
  ctx(st) {
    const ad = st.adoption && typeof st.adoption === "object" ? st.adoption : {};
    const cs = ad.comms && typeof ad.comms === "object" ? ad.comms : {};
    const v = (k, d) => this.str(cs[k]).trim() || d;
    const s = this.settings(st), T = this.tops(st), L = this.leaves(st);
    const ph = (k) => { const p = (ad.phases && typeof ad.phases === "object" ? ad.phases : {})[k]; return p && typeof p === "object" ? p : {}; };
    const dt = (k) => this.date(ph(k).start);
    const names = (arr) => this.join(arr.slice(0, 3).map((l) => `‘${this.full(l, st)}’`)) + (arr.length > 3 ? " en andere labels" : "");
    const labelLines = T.map((t) => {
      const kids = this.kids(t, st);
      const d = this.sent(this.first(t.tooltip, 160)) || `Bijvoorbeeld: ${this.examples(t, st).join(", ").toLowerCase()}.`;
      return `${this.nm(t)}: ${d}${kids.length ? ` Varianten: ${kids.map((k) => this.nm(k)).join(", ")}.` : ""}`;
    });
    const plan = [];
    if (dt("prep")) plan.push(`Vanaf ${dt("prep")}: voorbereiding en een pilot met een kleine groep collega’s.`);
    if (dt("sim")) plan.push(`Vanaf ${dt("sim")}: de labels zijn beschikbaar; de regels draaien eerst in een testmodus (simulatie), je merkt er nog weinig van.`);
    if (dt("tips")) plan.push(`Vanaf ${dt("tips")}: je ziet meldingen (policy tips) als iets gevoelig lijkt; er wordt nog niets tegengehouden.`);
    if (dt("enforce")) plan.push(`Vanaf ${dt("enforce")}: de regels worden gehandhaafd.`);
    if (!plan.length) plan.push("We beginnen met een proefperiode waarin je alleen meldingen ziet. De precieze data volgen.");
    const startDate = dt("sim") || dt("tips") || dt("enforce") || "";
    const enc = L.filter((l) => ["assignNow", "userDefined"].includes(this.enc(l).mode));
    const mark = L.filter((l) => { const m = (l.cfg && l.cfg.marking) || {}; return ["header", "footer", "watermark"].some((k) => m[k] && m[k].enabled); });
    const auto = L.filter((l) => ["recommend", "auto"].includes((((l.cfg || {}).autolabel || {}).client || {}).mode));
    const svc = L.filter((l) => (((l.cfg || {}).autolabel || {}).service || {}).enabled);
    const R = (d) => L.map((l) => ({ l, r: this.rule(l, d, st), t: this.dlpText(l, d, st) })).filter((x) => x.r && x.t);
    const share = [...R("exchange"), ...R("sharing"), ...R("teams")];
    const ep = R("endpoint").filter((x) => x.t.k !== "muted").sort((a, b) => labelPriority(b.l, st) - labelPriority(a.l, st));
    const cp = R("copilot");
    const strong = share.filter((x) => ["block", "warn", "ok"].includes(x.t.k)).sort((a, b) => labelPriority(b.l, st) - labelPriority(a.l, st));
    const desk = v("desk", "[servicedesk: e-mail/telefoon]");
    const dl = this.defaultLabel(st);
    const changes = ["In Word, Excel, PowerPoint en Outlook kies je een label via de knop Gevoeligheid (Sensitivity)."];
    if (dl) changes.push(`Nieuwe documenten krijgen standaard het label ‘${dl}’.`);
    if (s.mandatoryDocs || s.mandatoryEmail) changes.push(`Een label kiezen is verplicht${s.mandatoryDocs && s.mandatoryEmail ? "" : s.mandatoryDocs ? " voor documenten" : " voor e-mail"}.`);
    if (s.justification) changes.push("Kies je een lager label of haal je het label weg, dan vraagt de app om een korte reden.");
    if (mark.length) changes.push(`Bij ${names(mark)} verschijnt automatisch een markering, zoals een kop- of voettekst of een watermerk.`);
    if (enc.length) changes.push(`Informatie met ${names(enc)} wordt versleuteld: alleen bevoegden kunnen die openen.`);
    if (auto.length) changes.push("Herkent Office gevoelige gegevens, zoals een BSN of IBAN, dan stelt het een passend label voor.");
    if (share.length) changes.push(strong.some((x) => x.t.k !== "ok") ? "Deel je gevoelige informatie buiten de organisatie, dan zie je een melding (policy tip) of wordt het tegengehouden." : "Deel je gevoelige informatie buiten de organisatie, dan zie je een melding (policy tip).");
    if (ep.length) changes.push("Op apparaten van de organisatie kan het kopiëren naar USB, afdrukken of uploaden van gevoelige bestanden beperkt zijn.");
    if (cp.length) changes.push(`Copilot gebruikt de inhoud van ${names(cp.map((x) => x.l))} niet in antwoorden.`);
    const dlpTips = ["Lees de melding: daarin staat waarom iets als gevoelig wordt gezien."];
    if (share.some((x) => x.r.action === "override") || ep.some((x) => x.t.k === "warn")) dlpTips.push("Is het zakelijk nodig? Dan kun je vaak doorgaan met een korte reden.");
    dlpTips.push("Haal gevoelige gegevens weg, of deel binnen de organisatie (bijvoorbeeld in een Teams-kanaal of op een SharePoint-site).");
    dlpTips.push(`Denk je dat de melding onterecht is? Neem contact op met ${desk}.`);
    const Q = this.questions(st);
    const treeLines = Q.single ? [`Gebruik het label ‘${this.nm(Q.single)}’.`] : Q.steps.map((x) => {
      const a = (o) => (o.l ? `kies ‘${this.nm(o.l)}’` : "ga naar de volgende vraag");
      const [y, n] = x.side.ans === "Ja" ? [x.side, x.down] : [x.down, x.side];
      return `${x.q} Ja: ${a(y)}. Nee: ${a(n)}.`;
    });
    const c = {
      org: this.org(st), startDate, labelLines, changes, planLines: plan, treeLines, dlpTips,
      link: v("link", this.str(s.helpLink).trim() || "[link naar intranetpagina]"), contact: v("contact", "[naam contactpersoon]"), desk, sender: v("sender", "[naam], [functie]"),
      defaultLabel: dl, mandatory: !!(s.mandatoryDocs || s.mandatoryEmail), justification: !!s.justification,
      dlpSummary: strong.length ? strong.slice(0, 2).map((x) => `Voor ‘${this.full(x.l, st)}’ geldt: ${this.lc(x.t.t)}.`).join(" ") : share.length ? "In ons ontwerp krijg je vooral meldingen (policy tips); er wordt weinig tegengehouden." : "In ons ontwerp houdt DLP op dit moment nog niets tegen.",
      hasEncryption: enc.length > 0, copilotBlock: cp.length ? names(cp.map((x) => x.l)) : "",
      extLabels: names(enc.filter((l) => this.perms(l).some((p) => ADP_EXT_TYPES.includes(p.type)))),
      hasAuto: auto.length > 0, endpoint: ep.length ? `Voor ‘${this.full(ep[0].l, st)}’ geldt: ${ep[0].t.p}.` : "", hasServiceAuto: svc.length > 0,
    };
    c.faq = this.A().faq.filter((f) => { try { return !f.when || f.when(c); } catch (e) { return false; } }).slice(0, 12).map((f) => ({ q: f.q, a: f.a(c) }));
    return c;
  },
  comms(st) { const c = this.ctx(st); return this.A().comms.map((x) => ({ key: x.key, icon: x.icon, title: x.title, desc: x.desc, body: x.text(c) })); },
  commText(st, key) {
    const it = this.comms(st);
    if (key === "all") return it.map((x) => `=== ${x.title} ===\n\n${x.body}`).join("\n\n\n");
    const x = it.find((y) => y.key === key);
    return x ? x.body : "";
  },
  commsDoc(st) { return this.comms(st).map((x) => `<h3>${esc(x.title)}</h3><pre class="adp-doc-text">${esc(x.body)}</pre>`).join(""); },
  copy(text) {
    const fb = () => {
      try {
        const ta = document.createElement("textarea");
        ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.top = "0"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        const ok = document.execCommand("copy"); ta.remove(); return !!ok;
      } catch (e) { return false; }
    };
    try { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(() => true, () => fb()); } catch (e) { /* val terug */ }
    return Promise.resolve(fb());
  },
  download(name, text) {
    const blob = new Blob(["\ufeff" + String(text).replace(/\r?\n/g, "\r\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = name; a.style.display = "none";
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
  },

  /* ---------- Persona-reis ---------- */
  personaLabel(p, st) {
    const L = this.leaves(st);
    if (!L.length) return null;
    const pick = UI.adpPerLabel && UI.adpPerLabel[p.id], x = pick ? labelById(pick, st) : null;
    if (x && L.includes(x)) return x;
    const words = unique((this.str(p.name) + " " + this.str(p.desc)).toLowerCase().split(/[^a-z0-9à-ÿ]+/).filter((w) => w.length >= 3 && !ADP_STOP.has(w)));
    let best = null, bs = 0;
    L.forEach((l) => {
      const pp = parentOf(l, st);
      const txt = [this.nm(l), l.tooltip, l.audience, ...(Array.isArray(l.info) ? l.info : []), pp && this.nm(pp)].map((y) => this.str(y)).join(" ").toLowerCase();
      const sc = words.filter((w) => txt.includes(w)).length;
      if (sc > bs || (sc && sc === bs && labelPriority(l, st) > labelPriority(best, st))) { best = l; bs = sc; }
    });
    return best || L.find((l) => this.cat(l, st).key === "confidential") || L[Math.floor(L.length / 2)];
  },
  moments(p, st) {
    const M = this.A().moments, t = Array.isArray(p.touch) ? p.touch : [];
    const sel = new Set(M.filter((m) => m.key === "create" || m.touch.some((k) => t.includes(k))).map((m) => m.key));
    ["mail", "copilot", "downgrade", "mobile", "share"].forEach((k) => { if (sel.size < 4) sel.add(k); });
    return M.filter((m) => sel.has(m.key)).slice(0, 6);
  },
  outcome(key, l, st) {
    const lines = [], nm = this.full(l, st), e = this.enc(l), s = this.settings(st);
    const push = (ic, k, t) => lines.push({ ic, k, t });
    const dl = (d) => { const x = this.dlpText(l, d, st); if (x) lines.push(x); return !!x; };
    const m = (l.cfg && l.cfg.marking) || {};
    let lower = false;
    try { const pr = labelPriority(l, st); lower = this.leaves(st).some((x) => labelPriority(x, st) < pr); } catch (x) { lower = false; }
    switch (key) {
      case "create": {
        const cm = ((((l.cfg || {}).autolabel) || {}).client || {}).mode, def = this.defaultLabel(st);
        if (cm === "auto") push("wand", "info", `Office herkent gevoelige gegevens en past ‘${nm}’ automatisch toe.`);
        else if (cm === "recommend") push("wand", "info", `Office herkent gevoelige gegevens en stelt ‘${nm}’ voor.`);
        else push("tag", "ok", `Kiest ‘${nm}’ via Gevoeligheid${def && def !== nm ? ` (standaard staat er ‘${def}’)` : ""}.`);
        const mk = [["header", "koptekst"], ["footer", "voettekst"], ["watermark", "watermerk"]].filter(([k]) => m[k] && m[k].enabled).map(([, n]) => n);
        if (mk.length) push("watermark", "info", `Er verschijnt automatisch een ${this.join(mk)}.`);
        if (e.mode === "assignNow") push("lock", "ok", "Het bestand wordt versleuteld: alleen bevoegden kunnen het openen.");
        else if (e.mode === "userDefined") push("lock", "info", "Bij opslaan of versturen kies je zelf wie toegang krijgt.");
        break;
      }
      case "mail": {
        dl("exchange");
        if (e.mode === "assignNow") {
          const ext = this.perms(l).some((p) => ADP_EXT_TYPES.includes(p.type));
          push("lock", ext ? "ok" : "warn", ext ? "De bijlage blijft versleuteld; ontvangers met rechten (zoals partnerdomeinen) openen hem met hun eigen account." : "De bijlage is versleuteld voor de eigen organisatie: een externe ontvanger kan hem niet openen.");
        } else if (e.mode === "userDefined" && (e.userDefined || {}).outlook === "DoNotForward") push("lock", "ok", "De mail krijgt ‘Niet doorsturen’: de ontvanger kan niet doorsturen, afdrukken of kopiëren.");
        if (!lines.length) push("checkcircle", "ok", "Purview grijpt niet in: de mail gaat gewoon, met het label erop.");
        break;
      }
      case "share": {
        dl("sharing");
        if (e.mode === "assignNow") push("lock", "info", "Ook gedeeld blijft het bestand versleuteld: alleen wie rechten heeft, kan het openen.");
        if (!lines.length) push("checkcircle", "ok", "Delen gaat gewoon; het label reist mee met het bestand.");
        break;
      }
      case "teams": if (!dl("teams")) push("checkcircle", "ok", "Geen Teams-regel voor dit label: het bericht gaat gewoon."); break;
      case "copilot": {
        const cp = this.rule(l, "copilot", st);
        if (cp && cp.actions && cp.actions.copilotExclude) push("sparkle", "block", `Copilot gebruikt de inhoud van ‘${nm}’ niet in het antwoord${this.modeNote("copilot", st)}.`);
        else if (e.mode === "assignNow" && !this.extract(l)) push("sparkle", "warn", "Copilot kan het bestand niet samenvatten: het gebruiksrecht EXTRACT ontbreekt.");
        else push("sparkle", "ok", e.mode === "assignNow" ? "Copilot vat samen, want de gebruiker heeft de rechten VIEW en EXTRACT." : "Copilot vat samen: de gebruiker heeft zelf toegang tot het bestand.");
        push("tag", "info", `Nieuwe inhoud die Copilot hiermee maakt, krijgt ‘${nm}’ mee (het label met de hoogste prioriteit).`);
        break;
      }
      case "usb": {
        const x = this.dlpText(l, "endpoint", st);
        if (x) lines.push(x); else push("checkcircle", "muted", "Geen Endpoint DLP-regel voor dit label: kopiëren en afdrukken mogen.");
        if (e.mode === "assignNow") push("lock", "info", "Ook op de USB-stick blijft het bestand versleuteld.");
        break;
      }
      case "downgrade": {
        if (!lower) { push("info", "muted", "Er is geen lager label om naar te wisselen."); break; }
        if (s.justification) push("chat", "warn", "Office vraagt om een korte reden (justification) voordat het label lager wordt.");
        else push("redo", "info", "Het label kan zonder reden worden verlaagd.");
        push("chart", "muted", "De wijziging is zichtbaar in Activity explorer.");
        break;
      }
      case "mobile": {
        push("tag", "ok", "Het label staat ook in Outlook en de Office-apps op iOS en Android, en in de browser.");
        if (e.mode === "assignNow" || e.mode === "userDefined") push("lock", "info", "Versleutelde bestanden en mail open je na aanmelden met je werkaccount.");
        break;
      }
      default: break;
    }
    const k = lines.some((x) => x.k === "block") ? "block" : lines.some((x) => x.k === "warn") ? "warn" : "ok";
    return { k, lines };
  },

  /* ---------- Quiz ---------- */
  /** Opties in de vorm [tekst, uitleg, kleur?]; de eerste is juist. Volgorde wordt per vraag-id vast geschud. */
  _opts(seedStr, opts) { return this.shuffle(opts.map((o, i) => ({ t: this.str(o[0]), why: this.str(o[1]), ok: i === 0, c: o[2] || "" })), this.rng(this.hash(seedStr) || 1)); },
  /** Uitleg zonder voorvoegsel ‘Juist:’/‘Nee:’ (de UI toont zelf Juist/Onjuist). */
  whyTxt(s) { s = this.str(s).replace(/^(Juist|Nee)[:.]\s*/, ""); return s.charAt(0).toUpperCase() + s.slice(1); },
  _pr(l, st) { try { return labelPriority(l, st); } catch (e) { return 0; } },
  _desc(l, st) { return this.sent(this.when(l, st) || `Bijvoorbeeld ${this.examples(l, st).join(", ").toLowerCase()}`); },
  /** Alle quizvragen: per thema eerst vragen uit het ontwerp, daarna de vaste vragen uit de catalogus.
      Vraag = { id, theme, q, opts: [{ t, ok, why, c }], more, learn: [] }. */
  quizBank(st) {
    const A = this.A(), L = this.leaves(st), fn = (l) => this.full(l, st), out = [], s = this.settings(st);
    const seed = String(this.hash(L.map((l) => l.id + "|" + this.nm(l)).join(";")));
    const pr = (l) => this._pr(l, st), P = L.slice().sort((a, b) => pr(a) - pr(b));
    const add = (id, theme, q, opts, more = "", learn = []) => { if (!out.some((x) => x.id === id)) out.push({ id, theme, q, more, learn, opts: this._opts(seed + id, opts) }); };
    const lblOpts = (l, id) => [l, ...this.shuffle(L.filter((x) => x !== l), this.rng(this.hash(seed + id + "o") || 1)).slice(0, 3)]
      .map((x) => [fn(x), x === l ? `Juist: ${this._desc(x, st)}` : `${pr(x) < pr(l) ? "Te laag" : "Strenger dan nodig"}. ${this._desc(x, st)}`, this.hex(x.color)]);
    const lblMore = "De voorbeelden en beschrijvingen komen uit jullie classificatieschema. Op de spiekbrief en de labelkaarten staan ze per label.";

    /* Label kiezen */
    if (L.length >= 2) {
      const exOf = new Map(L.map((l) => [l, this.examples(l, st)]));
      let n1 = 0;
      this.shuffle(L, this.rng(this.hash(seed) || 1)).forEach((l) => {
        if (n1 >= 3) return;
        const ex = exOf.get(l).find((x) => !L.some((o) => o !== l && exOf.get(o).some((y) => y.toLowerCase() === x.toLowerCase())));
        if (!ex) return;
        add("lbl-ex-" + l.id, "label", `Je werkt aan: ‘${ex}’. Welk label kies je?`, lblOpts(l, "lbl-ex-" + l.id), lblMore, ["labels"]); n1++;
      });
      let n2 = 0;
      A.quizScenarios.forEach((sc, i) => {
        if (n2 >= 2) return;
        const sco = L.map((l) => {
          const pp = parentOf(l, st);
          const txt = [this.nm(l), l.tooltip, l.audience, ...(Array.isArray(l.info) ? l.info : []), pp && this.nm(pp), pp && pp.tooltip].map((y) => this.str(y)).join(" ").toLowerCase();
          return { l, s: sc.kw.filter((k) => this.kwRe(k).test(txt)).length };
        }).sort((a, b) => b.s - a.s);
        if (!sco[0].s || (sco[1] && sco[1].s === sco[0].s)) return;
        add("lbl-sc-" + i, "label", `${sc.text} Welk label kies je?`, lblOpts(sco[0].l, "lbl-sc-" + i), lblMore, ["labels"]); n2++;
      });
      const mi = Math.max(0, Math.floor((P.length - 1) / 2)), a = P[mi], b = P[mi + 1] || P[P.length - 1];
      if (a !== b) add("lbl-doubt", "label", `Je twijfelt tussen ‘${fn(a)}’ en ‘${fn(b)}’. Wat doe je?`, [
        [`Kies het hogere label: ‘${fn(b)}’`, "Juist: bij twijfel kies je het hogere label. Aanpassen kan later altijd."],
        [`Kies het lagere label: ‘${fn(a)}’`, "Liever niet: een te laag label beschermt te weinig."],
        ["Geen label kiezen", "Nee: zonder label ontbreekt de bescherming en zien anderen niet hoe gevoelig het is."],
        ["Het bestand niet opslaan", "Nee: kies het hogere label en vraag het eventueel na bij je key-user."]],
      "Een te hoog label is vervelend (bijv. extra beperkingen), een te laag label is een risico. Daarom: bij twijfel hoger.", ["labels"]);
    }
    add("lbl-down", "label", "Je kiest voor een document een lager label dan het had. Wat gebeurt er?", [
      s.justification ? ["De app vraagt om een korte reden", "Juist: jullie labelbeleid vraagt om een reden (justification) bij verlagen of verwijderen."] : ["Het label wordt aangepast en vastgelegd", "Juist: in jullie labelbeleid is geen reden verplicht. De wijziging is wel terug te zien in Activity explorer."],
      s.justification ? ["Het label wordt zonder vragen aangepast", "Nee: jullie labelbeleid vraagt om een korte reden."] : ["De app vraagt om een korte reden", "Nee: dat staat in jullie labelbeleid (nog) niet aan."],
      ["Dat kan niet: een label is definitief", "Nee: je kunt een label altijd aanpassen."],
      ["Je manager moet het eerst goedkeuren", "Nee: er is geen goedkeuringsstap voor labels."]],
    "Een reden vragen bij verlagen of verwijderen is een instelling van het labelbeleid. De redenen zijn terug te zien in Activity explorer: bespreek patronen met key-users.", ["labels", "explorers"]);

    /* DLP-regels uit het ontwerp (mail, delen, Teams) */
    const rank = { block: 4, override: 3, encrypt: 2, tip: 1, audit: 0 };
    const O = (ov) => ({
      block: ["Het wordt tegengehouden", "Dat gebeurt bij een DLP-regel die blokkeert."],
      override: [ov ? "Je krijgt een waarschuwing en kunt doorgaan" : "Je krijgt een waarschuwing en kunt doorgaan met een zakelijke reden", "Dat gebeurt bij een regel ‘blokkeren met override’."],
      encrypt: ["Het wordt automatisch versleuteld", "Dat gebeurt bij een regel die de mail versleutelt."],
      tip: ["Je ziet een melding (policy tip), maar het gaat wel", "Dat gebeurt bij een regel met alleen een melding."],
      audit: ["Het gaat gewoon; het wordt alleen vastgelegd", "Dat gebeurt bij een regel die alleen registreert."],
      none: ["Er gebeurt niets bijzonders", "Dat geldt alleen zonder DLP-regel."],
    });
    const domQ = (dom, id, theme, q, more, learn) => {
      const x = L.map((l) => ({ l, r: this.rule(l, dom, st) })).filter((y) => y.r && rank[y.r.action] !== undefined && y.r.scope !== "internal")
        .sort((a, b) => rank[b.r.action] - rank[a.r.action] || pr(b.l) - pr(a.l))[0];
      const t = x && this.dlpText(x.l, dom, st);
      if (!t) return;
      const T = O(String((x.r.notify && x.r.notify.override) || "") === "WithoutJustification"), k = x.r.action;
      const pool = (dom === "exchange" ? ["block", "override", "encrypt", "tip", "none"] : ["block", "override", "tip", "none"]).filter((z) => z !== k && !(k === "audit" && z === "none"));
      add(id, theme, q(fn(x.l)), [[T[k][0], `Juist. In jullie ontwerp: ${this.lc(t.t)}.`], ...pool.slice(0, 3).map((z) => [T[z][0], `Niet voor dit label. ${T[z][1]}`])], more, learn);
    };
    domQ("exchange", "sh-mail", "share", (n) => `Je mailt een document met het label ‘${n}’ naar een externe partij. Wat gebeurt er?`,
      "Wat er gebeurt, bepaalt de DLP-regel voor Exchange in jullie ontwerp. Staat de regel nog in simulatie, dan merkt de gebruiker er nog niets van.", ["dlpNotify"]);
    const encL = P.filter((l) => this.enc(l).mode === "assignNow");
    const hasExt = (l) => this.perms(l).some((p) => ADP_EXT_TYPES.includes(p.type));
    const noExt = encL.find((l) => !hasExt(l)), withExt = encL.find(hasExt);
    if (noExt) add("sh-enc", "share", `Je mailt een document met ‘${fn(noExt)}’ naar een externe adviseur. Kan die het openen?`, [
      ["Nee: alleen wie rechten heeft in het label", `Juist: ‘${fn(noExt)}’ versleutelt het document. Externe ontvangers hebben in jullie ontwerp geen rechten.`],
      ["Ja, na aanmelden met een Microsoft-account", "Nee: aanmelden lukt wel, maar zonder rechten opent het document niet."],
      ["Ja, versleuteling geldt alleen binnen de organisatie", "Nee: de versleuteling blijft ook buiten de organisatie op het bestand."],
      ["Ja, als je het label in de mail noemt", "Nee: alleen de rechten in het label tellen."]],
    "Versleuteling met een label blijft op het bestand, waar het ook staat. Moet een partner het kunnen openen, kies dan een label dat die partner rechten geeft.", ["labelsEncryption"]);
    else if (withExt) add("sh-enc", "share", `Een externe partner krijgt een document met ‘${fn(withExt)}’. Kan die het openen?`, [
      ["Ja, na aanmelden met een account dat rechten heeft", `Juist: ‘${fn(withExt)}’ geeft in jullie ontwerp ook externe partijen rechten.`],
      ["Nee, nooit", "Nee: dit label geeft ook externe partijen rechten."],
      ["Ja, zonder aanmelden", "Nee: de ontvanger moet zich aanmelden, zodat de rechten gecontroleerd kunnen worden."],
      ["Alleen als je het label eerst weghaalt", "Nee: dat is niet nodig en omzeilt de bescherming."]],
    "De ontvanger meldt zich aan met een werk- of Microsoft-account. Alleen accounts die in het label rechten hebben, kunnen het document openen.", ["labelsEncryption"]);
    domQ("sharing", "sh-link", "share", (n) => `Je deelt via OneDrive een bestand met ‘${n}’ met iemand buiten de organisatie. Wat gebeurt er?`,
      "DLP voor SharePoint en OneDrive kijkt naar het label of de inhoud van het gedeelde bestand en naar met wie je deelt.", ["dlpNotify"]);
    domQ("teams", "dlp-teams", "dlp", (n) => `Je plakt gegevens uit een document met ‘${n}’ in een Teams-chat met een gast. Wat gebeurt er?`,
      "DLP voor Teams controleert chat- en kanaalberichten. Een geblokkeerd bericht krijgt een melding voor de afzender.", ["dlpTeams"]);

    /* Copilot */
    const cpx = P.slice().reverse().find((l) => { const x = this.rule(l, "copilot", st); return x && x.actions && x.actions.copilotExclude; });
    if (cpx) add("cp-exclude", "copilot", `Je vraagt Copilot een bestand met ‘${fn(cpx)}’ samen te vatten. Wat gebeurt er?`, [
      ["Copilot gebruikt de inhoud niet in het antwoord", `Juist: jullie DLP-regel voor Microsoft 365 Copilot sluit ‘${fn(cpx)}’ uit${this.modeNote("copilot", st)}.`],
      ["Copilot vat het gewoon samen", "Nee: de DLP-regel houdt Copilot tegen, ook als jij het bestand mag openen."],
      ["Het bestand wordt verwijderd", "Nee: het bestand blijft gewoon staan."],
      ["Het label wordt automatisch verlaagd", "Nee: het label blijft hetzelfde."]],
    "Met de DLP-locatie Microsoft 365 Copilot kun je bestanden en e-mails met bepaalde labels uitsluiten van verwerking in antwoorden. Je kunt het bestand zelf nog wel openen.", ["dlpCopilot"]);
    if (P.length >= 2) {
      const lo = P[0], hi = P[P.length - 1];
      add("cp-inherit", "copilot", `Copilot maakt een nieuw document op basis van een bestand met ‘${fn(lo)}’ en een bestand met ‘${fn(hi)}’. Welk label krijgt het?`, [
        [fn(hi), `Juist: nieuwe inhoud krijgt het label met de hoogste prioriteit mee: ‘${fn(hi)}’.`, this.hex(hi.color)],
        [fn(lo), "Nee: dan zou gevoelige inhoud minder beschermd raken.", this.hex(lo.color)],
        ["Geen label", "Nee: Copilot neemt het label van de bronnen over."],
        ["Een willekeurig label", "Nee: het is altijd het label met de hoogste prioriteit."]],
      "Dit heet labelovererving. Het label wordt automatisch toegepast en is zichtbaar in de app.", ["copilotDataProt"]);
    }
    const nox = encL.find((l) => !this.extract(l));
    if (nox) add("cp-extract", "copilot", `Je vraagt Copilot een document met ‘${fn(nox)}’ samen te vatten. Wat gebeurt er?`, [
      ["Copilot kan het niet: het recht EXTRACT ontbreekt", `Juist: ‘${fn(nox)}’ geeft geen EXTRACT-recht, dus Copilot kan de inhoud niet gebruiken.`],
      ["Copilot vat het gewoon samen", "Nee: zonder EXTRACT (kopiëren) kan Copilot de inhoud niet gebruiken."],
      ["Copilot haalt eerst de versleuteling weg", "Nee: Copilot verandert niets aan label of versleuteling."],
      ["Het document wordt naar je manager gestuurd", "Nee: Copilot verstuurt niets."]],
    "Copilot heeft voor jou de gebruiksrechten VIEW én EXTRACT nodig. Wil je dat Copilot dit label wel kan gebruiken, geef dan EXTRACT in de rechten van het label.", ["copilotDataProt", "labelsEncryption"]);

    /* Werkplek (Endpoint DLP) */
    const E = {
      block: ["Het wordt geblokkeerd", "Dat gebeurt bij het niveau ‘Blokkeren’."],
      warn: ["Je krijgt een waarschuwing; doorgaan kan met een reden", "Dat gebeurt bij ‘Blokkeren met override’."],
      allow: ["Het mag; Purview legt het hooguit vast", "Dat geldt bij ‘Alleen registreren’ of zonder regel."],
      wipe: ["Het bestand wordt gewist", "Dat doet Endpoint DLP niet: het legt vast, waarschuwt of blokkeert."],
    };
    const epQ = (act, id, q) => {
      const x = P.slice().reverse().map((l) => { const r = this.rule(l, "endpoint", st); return { l, lv: ((((r || {}).actions || {}).endpoint || []).find((y) => y.key === act) || {}).level }; }).find((y) => y.lv === "block" || y.lv === "warn");
      const t = x && this.dlpText(x.l, "endpoint", st);
      if (!t) return;
      add(id, "endpoint", q(fn(x.l)), [[E[x.lv][0], `Juist. In jullie ontwerp: ${this.lc(t.t)}.`], ...["block", "warn", "allow", "wipe"].filter((k) => k !== x.lv).map((k) => [E[k][0], `Niet voor dit label. ${E[k][1]}`])],
        "Endpoint DLP werkt op aangesloten (onboarded) Windows- en macOS-apparaten. Per activiteit kies je: alleen registreren, blokkeren met override of blokkeren.", ["endpoint", "endpointUsing"]);
    };
    epQ("usb", "ep-usb", (n) => `Je kopieert een bestand met ‘${n}’ naar een USB-stick op je werklaptop. Wat gebeurt er?`);
    epQ("print", "ep-print", (n) => `Je drukt een bestand met ‘${n}’ af op je werklaptop. Wat gebeurt er?`);

    /* Vaste vragen */
    (A.quizStatic || []).forEach((x) => add(x.id, x.theme, x.q, x.opts, x.more, x.learn));
    return out;
  },
  quizTheme() { const t = UI.adpQuizTheme; return this.A().quizThemes.some((x) => x.key === t) ? t : "mix"; },
  /** Vragen voor het gekozen thema; ‘mix’ = twee per thema. */
  quiz(st, theme) {
    const th = theme || this.quizTheme(), all = this.quizBank(st), T = this.A().quizThemes;
    if (th === "mix") { const out = []; [0, 1].forEach((k) => T.forEach((t) => { const q = all.filter((x) => x.theme === t.key)[k]; if (q) out.push(q); })); return out; }
    return all.filter((x) => x.theme === th).slice(0, 8);
  },
  /** Gedeelde weergave van antwoordopties (quiz en LAB). a = gekozen index of undefined. */
  optsHtml(opts, a, act, labelledBy) {
    const done = a !== undefined && a !== null;
    return `<div class="adp-opts" role="group" aria-labelledby="${esc(labelledBy)}">${opts.map((o, j) => {
      const cls = done ? (o.ok ? " ok" : j === a ? " no" : " dim") : "";
      const tag = done ? (o.ok ? `<span class="adp-otag ok">${icon("checkcircle", "s")}${j === a ? "Juist – jouw keuze" : "Juist antwoord"}</span>` : j === a ? `<span class="adp-otag no">${icon("xcircle", "s")}Jouw keuze</span>` : "") : "";
      return `<button type="button" class="adp-opt${cls}" data-action="${esc(act)}" data-o="${j}"${done ? ' aria-disabled="true"' : ""}><span class="adp-ol" aria-hidden="true">${"ABCD"[j] || j + 1}</span>${o.c ? `<i class="adp-odot" style="background:${this.hex(o.c)}" aria-hidden="true"></i>` : ""}<span class="adp-ob"><span class="adp-ot">${esc(o.t)}</span>${done ? `<small class="adp-owhy">${esc(this.whyTxt(o.why))}</small>` : ""}</span>${tag}</button>`;
    }).join("")}</div>`;
  },
  /** Feedback na een antwoord: juist/onjuist in tekst + icoon, uitleg van de keuze, en ‘Meer uitleg’. */
  fbHtml(q, a) {
    const o = q.opts[a] || {}, ok = !!o.ok, good = q.opts.find((x) => x.ok) || {};
    const links = (q.learn || []).map((k) => learn(k)).filter(Boolean).join(" ");
    return `<div class="adp-fb ${ok ? "ok" : "no"}" role="status">${icon(ok ? "checkcircle" : "xcircle")}<div class="adp-fb-b"><p><b>${ok ? "Juist." : "Onjuist."}</b> ${esc(this.whyTxt(o.why))}</p>${ok ? "" : `<p class="adp-fb-good"><b>Juist antwoord:</b> ${esc(good.t)}. ${esc(this.whyTxt(good.why))}</p>`}
      ${q.more || links ? `<details class="adp-why"><summary>Meer uitleg</summary>${q.more ? `<p>${esc(q.more)}</p>` : ""}${links ? `<p class="adp-why-l">${links}</p>` : ""}</details>` : ""}</div></div>`;
  },
  quizHtml(st) {
    const th = this.quizTheme(), bank = this.quizBank(st), qs = this.quiz(st, th);
    const T = [["mix", "question", "Mix", Math.min(bank.length, 2 * this.A().quizThemes.length)], ...this.A().quizThemes.map((t) => [t.key, t.icon, t.title, Math.min(8, bank.filter((x) => x.theme === t.key).length)])];
    const pick = `<div class="adp-qthemes" role="group" aria-label="Kies een thema">${T.map(([k, ic, t, c]) => `<button type="button" class="adp-qth${k === th ? " on" : ""}" data-action="adp-qtheme" data-k="${esc(k)}" aria-pressed="${k === th}">${icon(ic, "s")}<span>${esc(t)}</span><small>${c}<span class="sr-only"> vragen</span></small></button>`).join("")}</div>`;
    if (!qs.length) return `${pick}${emptyState("question", "Geen vragen voor dit thema", "Kies een ander thema.")}`;
    const key = String(this.hash(th + "|" + qs.map((q) => q.id + q.q + q.opts.map((o) => o.t).join()).join("|")));
    let Q = UI.adpQuiz;
    if (!Q || Q.key !== key) Q = UI.adpQuiz = { key, i: 0, ans: [] };
    const n = qs.length, i = Math.min(Math.max(0, Q.i), n);
    const isAns = (j) => Q.ans[j] !== undefined && Q.ans[j] !== null;
    const okAt = (j) => isAns(j) && qs[j].opts[Q.ans[j]] && qs[j].opts[Q.ans[j]].ok;
    const score = qs.reduce((t, q, j) => t + (okAt(j) ? 1 : 0), 0);
    const fs = !!UI.adpQuizFs, thName = (T.find((x) => x[0] === th) || [])[2] || "";
    const dots = qs.map((q, j) => `<span class="adp-qdot${isAns(j) ? (okAt(j) ? " ok" : " no") : ""}${j === i ? " cur" : ""}"></span>`).join("");
    const bar = `<div class="adp-qbar"><span class="adp-qdots" aria-hidden="true">${dots}</span><span class="spacer"></span><span class="adp-qscore">Score ${score} / ${n}</span>${i < n ? `<button type="button" class="btn small subtle" data-action="adp-qr">${icon("redo", "s")} Opnieuw beginnen</button>` : ""}<button type="button" class="btn small subtle" data-action="adp-toggle-quizfs" aria-pressed="${fs}">${icon(fs ? "x" : "projector", "s")} ${fs ? "Sluiten" : "Presenteren"}</button></div>`;
    let body;
    if (i >= n) {
      const pct = Math.round((score / n) * 100);
      body = `<div class="adp-qres">${ring(pct, `${score}/${n}`, "adp-ring", pct >= 80 ? "var(--ok)" : pct >= 50 ? "var(--warn)" : "var(--err)")}<div><h3>${pct >= 80 ? "Goed beheerst" : pct >= 50 ? "Deels beheerst" : "Extra uitleg nodig"}</h3><p>${score} van de ${n} vragen goed (${pct}%). Thema: ${esc(thName)}.</p><button type="button" class="btn primary" data-action="adp-qr">${icon("redo", "s")} Opnieuw beginnen</button></div></div>
        <ol class="adp-qrev">${qs.map((q, j) => { const ok = okAt(j), good = q.opts.find((o) => o.ok); return `<li class="${ok ? "ok" : "no"}">${icon(ok ? "checkcircle" : "xcircle", "s")}<div><b>${esc(q.q)}</b><small>${ok ? "Goed beantwoord" : "Onjuist"} · Juist: ${esc(good ? good.t : "")}</small></div></li>`; }).join("")}</ol>`;
    } else {
      const q = qs[i], a = Q.ans[i], done = isAns(i);
      const thq = (this.A().quizThemes.find((t) => t.key === q.theme) || {}).title || "";
      body = `<div class="adp-qq"><span class="adp-qnum">Vraag ${i + 1} van ${n}${thq ? ` · ${esc(thq)}` : ""}</span><h3 id="adp-qh">${esc(q.q)}</h3>
        ${this.optsHtml(q.opts, done ? a : undefined, "adp-qa", "adp-qh")}
        ${done ? this.fbHtml(q, a) : ""}
        <div class="adp-qnav"><button type="button" class="btn subtle" data-action="adp-qp"${i === 0 ? " disabled" : ""}>${icon("chevronleft", "s")} Vorige</button><span class="spacer"></span>${done ? `<button type="button" class="btn primary" data-action="adp-qn">${i === n - 1 ? "Bekijk score" : "Volgende"} ${icon("chevronright", "s")}</button>` : `<span class="xs muted">Kies een antwoord${fs ? " (A–D)" : ""}</span>`}</div></div>`;
    }
    return `${fs ? "" : pick}<div class="adp-quiz${fs ? " fs" : ""}"${fs ? ' role="dialog" aria-modal="true" aria-label="Quiz"' : ""}>${fs ? `<div class="adp-toggle-quizfs-h"><span>${esc(this.org(st))} · Quiz: ${esc(thName)}</span></div>` : ""}${bar}${body}</div>`;
  },
  quizScore(st) { const qs = this.quiz(st), Q = UI.adpQuiz || { ans: [] }; return { n: qs.length, s: qs.reduce((t, q, j) => t + (Q.ans[j] != null && q.opts[Q.ans[j]] && q.opts[Q.ans[j]].ok ? 1 : 0), 0) }; },

  /* ---------- LAB: oefencasus op basis van het eigen ontwerp ---------- */
  /** Het label waar de casus om draait: bij voorkeur ‘vertrouwelijk’ met de meeste regels, en met een lager label eronder. */
  labTarget(st) {
    const L = this.leaves(st);
    if (L.length < 2) return null;
    const pr = (l) => this._pr(l, st), minP = Math.min(...L.map(pr));
    const sc = (l) => ["exchange", "sharing", "teams", "endpoint", "copilot"].filter((d) => this.rule(l, d, st)).length + (this.enc(l).mode === "assignNow" ? 1 : 0);
    const up = L.filter((l) => pr(l) > minP), base = up.length ? up : L;
    const c = base.filter((l) => this.cat(l, st).key === "confidential"), s2 = base.filter((l) => this.cat(l, st).key === "strict");
    const list = c.length ? c : s2.length ? s2 : base;
    return list.slice().sort((a, b) => sc(b) - sc(a) || pr(a) - pr(b))[0];
  },
  /** Zes stappen: label kiezen, extern mailen, melding, Copilot, USB, label verlagen. */
  lab(st) {
    const A = this.A(), T = A.lab, L = this.leaves(st), l = this.labTarget(st), fn = (x) => this.full(x, st), s = this.settings(st), who = T.who;
    const pr = (x) => this._pr(x, st), doc = l ? this.examples(l, st)[0] || "document" : T.demoDoc, nm = l ? fn(l) : T.demoLevels[0][0];
    const steps = [], seed = "lab|" + (l ? l.id : "demo") + "|";
    const add = (id, scene, title, story, q, opts, more = "", learn = []) => steps.push({ id, scene, title, story, q, more, learn, opts: this._opts(seed + id, opts) });
    const em = l ? this.enc(l).mode : "", ext = l ? this.perms(l).some((p) => ADP_EXT_TYPES.includes(p.type)) : false;

    /* 1 · Label kiezen */
    let o1;
    if (l) {
      const P = L.slice().sort((a, b) => pr(a) - pr(b)), i = P.indexOf(l);
      const near = P.filter((x) => x !== l).sort((a, b) => Math.abs(P.indexOf(a) - i) - Math.abs(P.indexOf(b) - i)).slice(0, 3);
      o1 = [l, ...near].map((x) => [fn(x), x === l ? `Past: ${this._desc(x, st)}` : pr(x) < pr(l) ? `Te laag. ${this._desc(x, st)}` : `Strenger dan nodig; bij twijfel is hoger wel veiliger dan lager. ${this._desc(x, st)}`, this.hex(x.color)]);
    } else o1 = T.demoLevels.map((x) => [x[0], x[1]]);
    add("label", "doc", "Document maken", `${who} maakt in Word een nieuw document: ‘${doc}’.${l ? "" : " (Er zijn nog geen labels in het ontwerp; deze casus gebruikt voorbeeldlabels.)"}`, `Welk label kiest ${who}?`, o1,
      l ? "Het juiste label volgt uit jullie classificatieschema: beschrijving en voorbeelden per label. Twijfel? Dan het hogere label." : "Zodra er labels in het schema staan, gebruikt deze casus jullie eigen labels en regels.", ["labels"]);

    /* 2 · Extern mailen */
    const r2 = l && this.rule(l, "exchange", st), t2 = l && this.dlpText(l, "exchange", st);
    const ov = !!(r2 && String((r2.notify && r2.notify.override) || "") === "WithoutJustification");
    const M = {
      block: ["De mail wordt tegengehouden", "Dat gebeurt alleen bij een DLP-regel die externe mail met dit label blokkeert."],
      override: [ov ? `${who} krijgt een waarschuwing en kan doorgaan` : `${who} krijgt een waarschuwing en kan doorgaan met een zakelijke reden`, "Dat gebeurt bij een DLP-regel ‘blokkeren met override’."],
      encrypt: ["De mail wordt automatisch versleuteld", "Dat gebeurt alleen bij een DLP-regel die mail versleutelt."],
      tip: [`${who} ziet een melding (policy tip), maar de mail gaat wel`, "Dat gebeurt bij een DLP-regel met alleen een melding."],
      locked: ["De mail gaat, maar de ontvanger kan de bijlage niet openen", "Dat gebeurt bij een label dat alleen de eigen organisatie rechten geeft."],
      none: ["De mail gaat gewoon, met het label erop", "Dat geldt alleen als geen regel of versleuteling ingrijpt."],
    };
    let k2 = "none", w2;
    if (r2 && r2.scope !== "internal" && t2 && ["block", "override", "encrypt", "tip"].includes(r2.action)) { k2 = r2.action; w2 = `In jullie ontwerp: ${this.lc(t2.t)}.`; }
    else if (em === "assignNow" && !ext) { k2 = "locked"; w2 = `‘${nm}’ versleutelt de bijlage voor de eigen organisatie: een externe ontvanger heeft geen rechten.`; }
    else w2 = l ? `Voor ‘${nm}’ is geen DLP-regel voor externe mail ingesteld${em === "assignNow" ? "; ontvangers met rechten openen de bijlage na aanmelden" : ""}.` : "Zonder ontwerp zijn er nog geen DLP-regels. Op het ontwerpbord bepalen jullie wat hier gebeurt.";
    const lockedToo = em === "assignNow" && !ext;
    const pool2 = ["block", "tip", "none", "override", "locked", "encrypt"].filter((x) => x !== k2 && !(lockedToo && x === "locked") && !(k2 === "locked" && x === "none")).slice(0, 3);
    add("mail", "mail", "Mail naar een externe partij", `${who} mailt de ‘${doc}’ als bijlage naar een externe adviseur.`, "Wat gebeurt er als de regels worden gehandhaafd?",
      [[M[k2][0], w2], ...pool2.map((x) => [M[x][0], `Niet voor dit label. ${M[x][1]}`])],
      "DLP voor Exchange kan per label of gevoelige inhoud een melding geven, laten doorgaan met een reden, versleutelen of blokkeren. Versleuteling uit het label reist bovendien mee met de bijlage.", ["dlpNotify", "labelsEncryption"]);

    /* 3 · Melding */
    add("tip", "mail", "Een melding (policy tip)", `Stel: bij het versturen verschijnt een melding. De mail bevat mogelijk gevoelige informatie.`, T.tip.q, T.tip.opts, T.tip.more, ["dlpNotify"]);

    /* 4 · Copilot */
    const cp = l && this.rule(l, "copilot", st), excl = !!(cp && cp.actions && cp.actions.copilotExclude), noEx = !!(l && em === "assignNow" && !this.extract(l));
    const C = {
      excl: ["Copilot gebruikt de inhoud niet in het antwoord", "Dat gebeurt bij een DLP-regel voor Microsoft 365 Copilot die dit label uitsluit."],
      noex: ["Copilot kan het niet samenvatten: het recht EXTRACT ontbreekt", "Dat gebeurt bij versleuteling zonder het gebruiksrecht EXTRACT."],
      ok: [`Copilot vat het samen, want ${who} mag het bestand openen`, "Dat gebeurt als geen regel of versleuteling Copilot tegenhoudt."],
      strip: ["Copilot haalt eerst het label weg", "Dat doet Copilot niet: nieuwe inhoud krijgt juist het label met de hoogste prioriteit mee."],
    };
    const k4 = excl ? "excl" : noEx ? "noex" : "ok";
    const w4 = excl ? `Jullie DLP-regel voor Microsoft 365 Copilot sluit ‘${nm}’ uit${this.modeNote("copilot", st)}.` : noEx ? `‘${nm}’ geeft geen EXTRACT-recht: Copilot kan de inhoud niet gebruiken.` : `Copilot werkt met de rechten van ${who}${em === "assignNow" ? " (VIEW en EXTRACT)" : ""}. Een nieuw document op basis hiervan krijgt ‘${nm}’ mee.`;
    add("copilot", "copilot", "Copilot vragen", `${who} vraagt Microsoft 365 Copilot de ‘${doc}’ samen te vatten.`, "Wat gebeurt er?",
      [[C[k4][0], w4], ...["excl", "noex", "ok", "strip"].filter((x) => x !== k4).slice(0, 3).map((x) => [C[x][0], `Niet voor dit label. ${C[x][1]}`])],
      "Copilot gebruikt alleen inhoud waar de gebruiker toegang toe heeft. Bij versleuteling zijn VIEW en EXTRACT nodig. Een DLP-regel voor Microsoft 365 Copilot kan gelabelde bestanden uitsluiten.", ["copilotDataProt", "dlpCopilot"]);

    /* 5 · USB */
    const r5 = l && this.rule(l, "endpoint", st), lv = r5 ? ((((r5.actions || {}).endpoint) || []).find((x) => x.key === "usb") || {}).level : "";
    const U = {
      block: ["Het kopiëren wordt geblokkeerd", "Dat gebeurt bij het niveau ‘Blokkeren’."],
      warn: [`${who} krijgt een waarschuwing; doorgaan kan met een reden`, "Dat gebeurt bij ‘Blokkeren met override’."],
      allow: ["Het kopiëren mag; Purview legt het hooguit vast", "Dat geldt bij ‘Alleen registreren’ of zonder regel."],
      wipe: ["Het bestand wordt van de USB-stick gewist", "Dat doet Endpoint DLP niet: het legt vast, waarschuwt of blokkeert."],
    };
    const k5 = lv === "block" || lv === "warn" ? lv : "allow";
    const w5 = k5 !== "allow" ? `In jullie ontwerp: ${this.lc(this.dlpText(l, "endpoint", st).t)}.` : !l ? "Zonder ontwerp is er nog geen Endpoint DLP-regel." : lv === "audit" ? `Voor ‘${nm}’ wordt kopiëren naar USB alleen vastgelegd${this.modeNote("endpoint", st)}.` : `Voor ‘${nm}’ is kopiëren naar USB niet beperkt.`;
    add("usb", "usb", "Bestand op een USB-stick", `${who} wil de ‘${doc}’ op een USB-stick zetten, op de werklaptop.`, "Wat gebeurt er?",
      [[U[k5][0], w5], ...["block", "warn", "allow", "wipe"].filter((x) => x !== k5).map((x) => [U[x][0], `Niet voor dit label. ${U[x][1]}`])],
      `Endpoint DLP werkt op aangesloten (onboarded) Windows- en macOS-apparaten. ${em === "assignNow" ? "Ook op de USB-stick blijft het bestand versleuteld." : ""}`.trim(), ["endpoint"]);

    /* 6 · Label verlagen */
    const lower = !!(l && L.some((x) => pr(x) < pr(l)));
    const D = {
      reason: ["Office vraagt om een korte reden", "Dat gebeurt als het labelbeleid een reden (justification) verplicht."],
      free: ["Het label wordt zonder vragen aangepast", "Dat geldt als het labelbeleid geen reden vraagt."],
      no: ["Dat kan niet: een label is definitief", "Nee: een label kun je aanpassen."],
      boss: ["De manager moet het eerst goedkeuren", "Nee: er is geen goedkeuringsstap voor labels."],
    };
    const k6 = s.justification ? "reason" : "free";
    const w6 = !l ? (s.justification ? "Het labelbeleid in dit ontwerp vraagt om een reden (justification) bij verlagen of verwijderen." : "Standaard vraagt Office geen reden; het labelbeleid kan dat wel verplichten.") : s.justification ? "Jullie labelbeleid vraagt om een reden bij verlagen of verwijderen. De reden is terug te zien in Activity explorer." : "In jullie labelbeleid is geen reden verplicht. De wijziging is wel terug te zien in Activity explorer.";
    add("downgrade", "downgrade", "Label verlagen", `${who} wil de ‘${doc}’ toch breder delen en ${lower || !l ? "kiest een lager label" : "haalt het label weg"}.`, "Wat gebeurt er?",
      [[D[k6][0], w6], ...["reason", "free", "no", "boss"].filter((x) => x !== k6).map((x) => [D[x][0], D[x][1]])],
      "Een reden vragen bij verlagen of verwijderen is een instelling van het labelbeleid. Patronen in de redenen zijn goede gespreksstof voor key-users.", ["labels", "explorers"]);
    return { label: l, doc, steps };
  },
  labState(st) {
    const lab = this.lab(st);
    const key = String(this.hash(lab.steps.map((x) => x.id + x.story + x.opts.map((o) => o.t + o.ok).join()).join("|")));
    let S_ = UI.adpLab;
    if (!S_ || S_.key !== key) S_ = UI.adpLab = { key, i: 0, ans: [] };
    const n = lab.steps.length, okAt = (j) => S_.ans[j] != null && lab.steps[j].opts[S_.ans[j]] && lab.steps[j].opts[S_.ans[j]].ok;
    return { lab, S: S_, n, okAt, score: lab.steps.reduce((t, x, j) => t + (okAt(j) ? 1 : 0), 0), answered: lab.steps.filter((x, j) => S_.ans[j] != null).length };
  },
  labHtml(st) {
    const A = this.A(), { lab, S: Sx, n, okAt, score, answered } = this.labState(st), i = Math.min(Math.max(0, Sx.i), n), l = lab.label;
    const hex = l ? this.hex(l.color) : "#69797E";
    const head = `<header class="adp-lab-h"><div><span class="adp-eb">LAB · Oefencasus</span><h3 id="adp-lab-t">Een werkdag van ${esc(A.lab.who)} bij ${esc(this.org(st))}</h3><p>Zes situaties, gebaseerd op jullie ontwerp. Kies wat er volgens jou gebeurt.</p></div>
      <div class="adp-lab-tools">${l ? `<span class="adp-chip adp-lab-lbl" style="--lc:${hex}">${icon("tag", "s")}<b>${esc(this.full(l, st))}</b></span>` : `<span class="badge neutral">Voorbeeldlabels</span>`}<button type="button" class="btn small subtle" data-action="adp-lab-r">${icon("redo", "s")} Opnieuw beginnen</button></div></header>`;
    const pct = Math.round((answered / n) * 100);
    const prog = `<div class="adp-lprog"><span class="adp-lstep" aria-live="polite">${i < n ? `Stap ${i + 1} van ${n}` : "Resultaat"}</span><span class="adp-lbar" role="progressbar" aria-label="Voortgang" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${answered}" aria-valuetext="${answered} van ${n} stappen beantwoord"><i style="width:${pct}%"></i></span><span class="adp-lscore">Score ${score} / ${n}</span></div>
      <ol class="adp-lsteps">${lab.steps.map((x, j) => { const d = Sx.ans[j] != null, ok = okAt(j); return `<li class="${d ? (ok ? "ok" : "no") : ""}${j === i ? " cur" : ""}"${j === i ? ' aria-current="step"' : ""}><span class="adp-lsn" aria-hidden="true">${d ? icon(ok ? "checkcircle" : "xcircle", "s") : j + 1}</span><span class="adp-lst">${esc(x.title)}</span><span class="sr-only">${d ? (ok ? " – goed" : " – fout") : " – nog open"}</span></li>`; }).join("")}</ol>`;
    let body;
    if (i >= n) {
      const pc = Math.round((score / n) * 100), v = A.lab.verdicts.find((x) => score >= x.min) || A.lab.verdicts[A.lab.verdicts.length - 1];
      body = `<div class="adp-lres"><div class="adp-qres">${ring(pc, `${score}/${n}`, "adp-ring", pc >= 80 ? "var(--ok)" : pc >= 50 ? "var(--warn)" : "var(--err)")}<div><h3 id="adp-lres-h" tabindex="-1">${esc(v.title)}</h3><p>${score} van de ${n} stappen goed. ${esc(v.text)}</p><div class="row tight"><button type="button" class="btn primary" data-action="adp-lab-r">${icon("redo", "s")} Opnieuw beginnen</button><button type="button" class="btn subtle" data-action="go" data-route="adoption" data-sub="tree">${icon("book", "s")} Naar de spiekbrief</button></div></div></div>
        <ol class="adp-qrev">${lab.steps.map((x, j) => { const ok = okAt(j), g = x.opts.find((o) => o.ok) || {}; return `<li class="${ok ? "ok" : "no"}">${icon(ok ? "checkcircle" : "xcircle", "s")}<div><b>${j + 1}. ${esc(x.title)}</b><small>${ok ? "Goed" : "Fout"} · Juist: ${esc(g.t)}</small></div></li>`; }).join("")}</ol></div>`;
    } else {
      const x = lab.steps[i], a = Sx.ans[i], done = a != null;
      body = `<div class="adp-lcase" style="--lc:${hex}"><div class="adp-lart"><svg class="adp-scene" viewBox="0 0 160 100" aria-hidden="true" focusable="false">${A.scenes[x.scene] || ""}</svg></div>
        <div class="adp-lbody"><span class="adp-qnum">Stap ${i + 1} · ${esc(x.title)}</span><p class="adp-lstory">${esc(x.story)}</p><h4 class="adp-lq" id="adp-lq">${esc(x.q)}</h4>
          ${this.optsHtml(x.opts, done ? a : undefined, "adp-lab-a", "adp-lq")}
          ${done ? this.fbHtml(x, a) : ""}
          <div class="adp-qnav"><button type="button" class="btn subtle" data-action="adp-lab-p"${i === 0 ? " disabled" : ""}>${icon("chevronleft", "s")} Vorige</button><span class="spacer"></span>${done ? `<button type="button" class="btn primary" data-action="adp-lab-n">${i === n - 1 ? "Bekijk resultaat" : "Volgende stap"} ${icon("chevronright", "s")}</button>` : `<span class="xs muted">Kies een antwoord</span>`}</div></div></div>`;
    }
    return `<section class="adp-lab" aria-labelledby="adp-lab-t">${head}${prog}${body}</section>`;
  },
};

/* ---------- Acties ---------- */
const _adpItemTitle = (k) => (k === "all" ? "Communicatiepakket" : ((CATALOG.adoption.comms || []).find((x) => x.key === k) || {}).title || "Tekst");
Actions["adp-copy"] = (el) => {
  const t = AdoptKit.commText(S(), el.dataset.item);
  if (!t) return;
  AdoptKit.copy(t).then((ok) => Toast.show(ok ? `${esc(_adpItemTitle(el.dataset.item))} gekopieerd naar het klembord.` : "Kopiëren lukte niet. Selecteer de tekst en kopieer handmatig.", ok ? "ok" : "warn"));
};
Actions["adp-dl"] = (el) => {
  const st = S(), t = AdoptKit.commText(st, el.dataset.item);
  if (!t) return;
  AdoptKit.download(`${safeFileName(`${st.meta.customer || "Klant"} - ${_adpItemTitle(el.dataset.item)}`)}.txt`, t);
  Toast.show(`${esc(_adpItemTitle(el.dataset.item))} gedownload als .txt.`, "ok");
};
Actions["adp-print"] = (el) => {
  const st = S(), what = el.dataset.what === "cards" ? "cards" : "tree";
  const root = document.getElementById("print-root");
  if (!root) return;
  let html = "";
  try { html = what === "tree" ? AdoptKit.treeHtml(st) : AdoptKit.cardsHtml(st); } catch (e) { console.error(e); }
  if (!html) { Toast.show("Nog geen labels om af te drukken.", "warn"); return; }
  root.innerHTML = `<style>@page { size: A4 portrait; margin: 10mm; }</style><div class="doc adp-print adp-print-${what}">${what === "cards" ? `<h1 class="adp-print-h">Labelkaarten · ${esc(AdoptKit.org(st))}</h1>` : ""}${html}</div>`;
  const prev = document.title;
  document.title = safeFileName(`${what === "tree" ? "Spiekbrief" : "Labelkaarten"} - ${st.meta.customer || "klant"}`);
  const done = () => { document.title = prev; root.innerHTML = ""; window.removeEventListener("afterprint", done); };
  window.addEventListener("afterprint", done);
  setTimeout(() => window.print(), 60);
};
const _adpFocus = (sel) => setTimeout(() => { const b = document.querySelector(sel); if (b) b.focus(); }, 0);
Actions["adp-qa"] = (el) => {
  const Q = UI.adpQuiz;
  if (!Q || (Q.ans[Q.i] !== undefined && Q.ans[Q.i] !== null)) return;
  Q.ans[Q.i] = Number(el.dataset.o) || 0;
  App.render();
  _adpFocus('[data-action="adp-qn"]');
};
Actions["adp-qn"] = () => {
  const Q = UI.adpQuiz;
  if (!Q) return;
  const sc = AdoptKit.quizScore(S());
  Q.i = Math.min(Q.i + 1, sc.n);
  if (Q.i >= sc.n && sc.n && sc.s / sc.n >= 0.8 && VH.confetti) VH.confetti(70);
  App.render();
  _adpFocus(Q.i >= sc.n ? '[data-action="adp-qr"]' : ".adp-opt");
};
Actions["adp-qp"] = () => { const Q = UI.adpQuiz; if (!Q) return; Q.i = Math.max(0, Q.i - 1); App.render(); };
Actions["adp-qr"] = () => { UI.adpQuiz = null; App.render(); _adpFocus(".adp-quiz .adp-opt"); };
Actions["adp-qtheme"] = (el) => { const k = el.dataset.k; UI.adpQuizTheme = k; UI.adpQuiz = null; App.render(); _adpFocus(`.adp-qth[data-k="${k === "mix" || CATALOG.adoption.quizThemes.some((t) => t.key === k) ? k : "mix"}"]`); };
Actions["adp-lab-a"] = (el) => {
  const L = UI.adpLab;
  if (!L || (L.ans[L.i] !== undefined && L.ans[L.i] !== null)) return;
  L.ans[L.i] = Number(el.dataset.o) || 0;
  App.render();
  _adpFocus('[data-action="adp-lab-n"]');
};
Actions["adp-lab-n"] = () => {
  const L = UI.adpLab;
  if (!L) return;
  const x = AdoptKit.labState(S());
  L.i = Math.min(L.i + 1, x.n);
  if (L.i >= x.n && x.n && x.score === x.n && VH.confetti) VH.confetti(70);
  App.render();
  _adpFocus(L.i >= x.n ? "#adp-lres-h" : ".adp-lab .adp-opt");
};
Actions["adp-lab-p"] = () => { const L = UI.adpLab; if (!L) return; L.i = Math.max(0, L.i - 1); App.render(); _adpFocus('[data-action="adp-lab-n"]'); };
Actions["adp-lab-r"] = () => { UI.adpLab = null; App.render(); _adpFocus(".adp-lab .adp-opt"); };
Actions["adp-toggle-quizfs"] = () => {
  UI.adpQuizFs = !UI.adpQuizFs;
  try {
    if (UI.adpQuizFs && document.documentElement.requestFullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else if (!UI.adpQuizFs && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
  } catch (e) { /* volledig scherm niet beschikbaar: overlay volstaat */ }
  App.render();
};
document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && UI.adpQuizFs) { UI.adpQuizFs = false; App.render(); } });
document.addEventListener("keydown", (e) => {
  if (!UI.adpQuizFs || UI.route !== "adoption" || e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target;
  if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
  if (e.key === "Escape") { e.preventDefault(); Actions["adp-toggle-quizfs"](); return; }
  const Q = UI.adpQuiz;
  if (!Q) return;
  const k = String(e.key).toLowerCase(), idx = "abcd".includes(k) && k.length === 1 ? "abcd".indexOf(k) : "1234".includes(k) && k.length === 1 ? "1234".indexOf(k) : -1;
  if (idx >= 0) { const b = document.querySelector(`.adp-opt[data-o="${idx}"]`); if (b) { e.preventDefault(); Actions["adp-qa"](b); } }
  else if (e.key === "ArrowRight" && Q.ans[Q.i] !== undefined && Q.ans[Q.i] !== null) { e.preventDefault(); Actions["adp-qn"](); }
  else if (e.key === "ArrowLeft" && Q.i > 0) { e.preventDefault(); Actions["adp-qp"](); }
});
Actions["adp-per"] = (el) => { UI.adpPer = el.dataset.id; App.render(); };
Actions["adp-per-label"] = (el) => { UI.adpPerLabel = UI.adpPerLabel || {}; UI.adpPerLabel[el.dataset.id] = el.value; App.render(); };

/* Meten: meetplan per klant (state: adoption.kpi[key] = {on, base, target, now, owner, freq, note}; genormaliseerd in model.js). */
const AdpKpi = {
  val(st, key) { const a = st && st.adoption; const m = a && isPlainObj(a.kpi) ? a.kpi : null; return m && Object.prototype.hasOwnProperty.call(m, key) && isPlainObj(m[key]) ? m[key] : {}; },
  num(x, k) {
    const n = typeof x === "number" ? x : typeof x === "string" && x.trim() !== "" ? Number(x.trim().replace(",", ".")) : NaN;
    return Number.isFinite(n) ? Math.max(0, Math.min(k && k.unit === "pct" ? 100 : 10000000, n)) : null;
  },
  fmt(n, k) { if (n === null) return "–"; const t = n.toLocaleString("nl-NL", { maximumFractionDigits: 1 }); return k.unit === "pct" ? t + "%" : t; },
  rel(st) {
    const ls = applicableLabels(st), s = AdoptKit.settings(st);
    const any = (d) => ls.some((l) => AdoptKit.rule(l, d, st));
    const dlp = ["exchange", "sharing", "teams"].some(any);
    return {
      downgrade: !!s.justification, dlp, override: dlp,
      blocked: dlp || ["endpoint", "copilot"].some(any),
      autosim: ls.some((l) => (((l.cfg || {}).autolabel || {}).service || {}).enabled),
      copilot: any("copilot"), endpoint: any("endpoint"),
    };
  },
  /** Status t.o.v. doel: ok | prog | off | wait | none. */
  status(k, v) {
    const b = this.num(v.base, k), t = this.num(v.target, k), n = this.num(v.now, k), up = k.dir !== "down";
    if (t === null) return { k: "none", cls: "neutral", t: "Nog geen doel" };
    if (n === null) return { k: "wait", cls: "neutral", t: b === null ? "Nog niet gemeten" : "Nulmeting gedaan" };
    if (up ? n >= t : n <= t) return { k: "ok", cls: "ok", t: "Op doel" };
    if (b !== null && (up ? n > b : n < b)) return { k: "prog", cls: "info", t: "Op weg" };
    return { k: "off", cls: "warn", t: "Nog niet op doel" };
  },
  /** Eenvoudige meter: balk tot de laatste meting (of nulmeting), met markeringen voor nulmeting en doel. */
  meter(k, v) {
    const b = this.num(v.base, k), t = this.num(v.target, k), n = this.num(v.now, k);
    if (b === null && t === null && n === null) return `<p class="adp-meter-e xs">${icon("target", "s")} Vul de nulmeting en het doel in om de voortgang te zien.</p>`;
    const max = k.unit === "pct" ? 100 : Math.max(1, ...[b, t, n].filter((x) => x !== null)) * 1.15;
    const pos = (x) => Math.round(Math.max(0, Math.min(100, (x / max) * 100)) * 10) / 10;
    const cur = n !== null ? n : b, st = this.status(k, v);
    const dirTxt = k.dir === "down" ? "lager is beter" : "hoger is beter";
    const label = `${k.title}: nulmeting ${this.fmt(b, k)}, laatste meting ${this.fmt(n, k)}, doel ${this.fmt(t, k)} (${dirTxt}). ${st.t}.`;
    return `<div class="adp-meter s-${esc(st.k)}" role="img" aria-label="${esc(label)}">
      <div class="adp-mt" aria-hidden="true">${cur !== null ? `<span class="adp-mf${n === null ? " base" : ""}" style="width:${pos(cur)}%"></span>` : ""}${b !== null ? `<span class="adp-mk b" style="left:${pos(b)}%" title="Nulmeting"></span>` : ""}${t !== null ? `<span class="adp-mk t" style="left:${pos(t)}%" title="Doel"></span>` : ""}</div>
      <div class="adp-ml" aria-hidden="true"><span><i class="adp-mi b"></i>Nulmeting <b>${esc(this.fmt(b, k))}</b></span><span><i class="adp-mi n"></i>Laatste <b>${esc(this.fmt(n, k))}</b></span><span><i class="adp-mi t"></i>Doel <b>${esc(this.fmt(t, k))}</b></span><span class="adp-mdir">${icon(k.dir === "down" ? "chevrondown" : "chevronright", "s")}${esc(dirTxt)}</span></div></div>`;
  },
};
Actions["adp-kpi-ph"] = (el) => { const k = el.dataset.k; UI.adpKpiPhase = k; App.render(); _adpFocus(`.adp-kf-b[data-k="${CSS.escape(k)}"]`); };
Actions["adp-kpi-only"] = () => { UI.adpKpiOnly = !UI.adpKpiOnly; App.render(); _adpFocus(".adp-kf-only"); };
Actions["adp-kpi-suggest"] = () => {
  const rel = AdpKpi.rel(S());
  Store.update((st) => {
    if (!isPlainObj(st.adoption)) st.adoption = {};
    if (!isPlainObj(st.adoption.kpi)) st.adoption.kpi = {};
    CATALOG.adoption.kpis.forEach((k) => {
      if (rel[k.key] === false) return;
      const cur = Object.prototype.hasOwnProperty.call(st.adoption.kpi, k.key) && isPlainObj(st.adoption.kpi[k.key]) ? st.adoption.kpi[k.key] : {};
      st.adoption.kpi[k.key] = { ...cur, on: true };
    });
  });
  _adpFocus(".adp-mp-s");
};

/* Hoofdtabbladen met onderdelen; de sub-sleutels (impact, journey, rollout, tree, cards, comms, quiz, lab, kpi) blijven App.go-routes. */
const ADP_GROUPS = [
  ["impact", "users", "Impact", [["impact", "Overzicht"], ["journey", "Werkdag per persona"]]],
  ["rollout", "clock", "Uitrol", [["rollout", "Uitrol"]]],
  ["material", "book", "Materiaal", [["tree", "Spiekbrief"], ["cards", "Labelkaarten"], ["comms", "Communicatie"], ["quiz", "Quiz"], ["lab", "Oefencasus (LAB)"]]],
  ["kpi", "chart", "Meten", [["kpi", "Meten"]]],
];
const ADP_TABS = ADP_GROUPS.flatMap((g) => g[3].map(([k, t]) => [k, g[1], t]));

registerView("adoption", {
  title: "Adoptie & impact",
  fac: {
    duration: 45,
    goal: "Inzicht in wat het ontwerp betekent voor verschillende groepen medewerkers, en afspraken over communicatie, training, gefaseerde uitrol en het meten van adoptie.",
    questions: ["Welke groep merkt het meest van de maatregelen – en is dat terecht?", "Wat moet een medewerker weten op dag 1?", "Wie is het aanspreekpunt bij een melding of blokkade?", "Hoe zien we over drie maanden of het werkt?"],
    tips: ["Gebruik de heatmap om de donkerste combinaties te bespreken: is de impact proportioneel?", "Laat de spiekbrief en de labelkaarten zien: herkent de klant de vragen en voorbeelden?", "De quiz en de oefencasus (LAB) werken op de beamer als korte kennischeck; foute antwoorden zijn gespreksstof.", "Plan de uitrol in fasen: simulatie → tips → handhaven, met een eigenaar en datum per fase."],
    pitfalls: ["Alles tegelijk handhaven leidt tot veel tickets en workarounds.", "Zonder key-users in de afdelingen blijven labels ongebruikt.", "Communicatie zonder concrete voorbeelden blijft abstract."],
    links: ["labelsGetStarted", "dlpSimulation", "dlpPlan"],
  },
  done: (st) => (st.personas || []).some((p) => String(p.comms || "").trim()) || Object.values((st.adoption || {}).notes || {}).some((v) => String(v || "").trim()) || Object.values(isPlainObj((st.adoption || {}).kpi) ? st.adoption.kpi : {}).some((v) => v && v.on === true),
  render() {
    const st = S();
    const cur = ADP_TABS.some((t) => t[0] === UI.sub.adoption) ? UI.sub.adoption : "impact";
    if (cur !== "quiz") UI.adpQuizFs = false;
    const grp = ADP_GROUPS.find((g) => g[3].some((x) => x[0] === cur)) || ADP_GROUPS[0];
    UI.adpLast = UI.adpLast && typeof UI.adpLast === "object" ? UI.adpLast : {};
    UI.adpLast[grp[0]] = cur;
    const ls = applicableLabels(st);
    const lead = "Wat merken medewerkers ervan, en hoe neem je ze mee?";
    const more = `<p><b>Impact</b>: wie merkt wat van het ontwerp. <b>Uitrol</b>: fasen met eigenaar en data. <b>Materiaal</b>: spiekbrief, labelkaarten, communicatieteksten, een quiz en een oefencasus (LAB), automatisch opgebouwd uit het ontwerp. <b>Meten</b>: hoe je na livegang in Purview volgt of labels en DLP werken.</p>`;
    const head = pageHead("Impact & adoptie", "Adoptie & impact", lead, `<button class="btn subtle" data-action="go" data-route="scenarios">${icon("play", "s")} Scenario’s</button>`, more);
    const top = tabs("adoption", ADP_GROUPS.map(([k, ic, t, subs]) => {
      const last = UI.adpLast[k];
      return [subs.some((x) => x[0] === last) ? last : subs[0][0], `${icon(ic, "s")}<span>${t}</span>`];
    }), cur, { label: "Onderdelen adoptie" });
    const seg = grp[3].length > 1 ? `<div class="adp-seg" role="tablist" aria-label="${esc(grp[2])}">${grp[3].map(([k, t]) => `<button type="button" class="adp-seg-b${k === cur ? " on" : ""}" role="tab" aria-selected="${k === cur}" tabindex="${k === cur ? 0 : -1}" data-action="go" data-route="adoption" data-sub="${esc(k)}">${esc(t)}</button>`).join("")}</div>` : "";
    const needL = ["impact", "tree", "cards", "comms", "journey"].includes(cur) && !ls.length;
    let body = "";
    try { body = needL ? VH.needLabels() : this["tab_" + cur](st, ls); } catch (e) { console.error(e); body = msg("err", "Dit onderdeel kon niet worden opgebouwd. Controleer het ontwerp of kies een ander tabblad."); }
    return VH.wrap(`${head}${top}<div class="adp-pane adp-p-${cur}" role="tabpanel">${seg}${body}</div>`, "adp-view");
  },
  /** Werkbalk per onderdeel: optionele korte regel links, acties rechts. */
  _bar(text, acts = "") { return text || acts ? `<div class="adp-lead">${text ? `<p>${text}</p>` : "<span></span>"}${acts ? `<div class="adp-acts">${acts}</div>` : ""}</div>` : ""; },

  tab_impact(st, ls) {
    const pers = st.personas || [];
    const rows = AdoptUI.rows();
    const des = ls.map((l) => AdoptUI.designed(l));
    const hh = (l, i) => {
      const p = parentOf(l, st);
      return `<th scope="col" class="${des[i] ? "" : "vb-heat-na"}" title="${esc(labelFullName(l, st))}${des[i] ? "" : " – nog niet ontworpen"}"><span class="vb-hh">${p ? `<span class="vb-hh-p">${esc(p.displayName || p.name)}</span>` : ""}<span class="vb-hh-n"><span class="color-dot" style="background:${esc(AdoptKit.hex(l.color))}"></span> ${esc(l.displayName || l.name)}</span></span></th>`;
    };
    const legend = `<div class="adp-hlegend"><span class="adp-hscale" aria-hidden="true"><i class="h h1"></i><i class="h h2"></i><i class="h h3"></i><i class="h h4"></i></span><span>Weinig → veel impact</span><span class="adp-hna" aria-hidden="true">–</span><span>nog niet ontworpen</span>${infoTip("Getal = merkbare wijzigingen voor deze rol, gewogen naar hinder. Alle labels tellen mee: persona’s zijn niet aan publicatiegroepen gekoppeld. Een label dat alleen voor één afdeling is gepubliceerd, raakt andere rollen in werkelijkheid niet.")}</div>`;
    const heat = pers.length ? `<div class="table-wrap vb-heat-wrap" tabindex="0" role="region" aria-label="Heatmap persona’s × labels"><table class="heat vb-heat adp-heat"><thead><tr><th scope="col"><span class="sr-only">Persona</span></th>${ls.map(hh).join("")}<th scope="col">Totaal</th></tr></thead>
      <tbody>${pers.map((p) => {
        const cells = ls.map((l) => AdoptUI.cell(p, l));
        const tot = sum(cells.map((c) => c.total)), fl = Mapping.frictionLabel(Math.round(tot / Math.max(1, ls.length)));
        return `<tr><th scope="row" class="vb-heat-p" title="${esc(p.desc || "")}">${icon(p.icon || "user", "s")} ${esc(p.name)}</th>${cells.map((c, i) => des[i]
          ? `<td class="h h${c.h}" title="${esc(labelFullName(ls[i], st))}: ${c.parts.length ? esc(c.parts.map((x) => `${(BoardUtil.rowByKey(x.k) || {}).name}: ${x.c.title} (${CATALOG.friction[x.fr]})`).join(" · ")) : "merkt niets"}">${c.total || ""}</td>`
          : `<td class="h vb-h-na" title="${esc(labelFullName(ls[i], st))}: nog niet ontworpen">–</td>`).join("")}<td class="adp-htot"><span class="badge ${esc(fl.cls)}">${esc(fl.t)}</span></td></tr>`;
      }).join("")}</tbody></table></div>`
      : emptyState("users", "Geen persona’s", "Voeg persona’s toe om de impact per doelgroep te bespreken.", `<button class="btn primary" data-action="per-add">${icon("plus", "s")} Persona</button>`);

    const personaRow = (p) => {
      const open = UI.perOpen === p.id, pid = esc(p.id);
      const hot = AdoptUI.hot(p, st);
      const grp = [];
      hot.forEach((x) => { const k = x.k + "|" + x.c.id; let g = grp.find((y) => y.k === k); if (!g) grp.push((g = { k, row: BoardUtil.rowByKey(x.k) || { name: x.k }, c: x.c, ls: [] })); g.ls.push(labelFullName(x.l, st)); });
      const chip = (g) => `<span class="chip sm" title="${esc(g.c.desc)} – ${esc(g.ls.join(", "))}">${esc(g.row.name)}: ${esc(g.c.title)}${g.ls.length > 1 ? ` <span class="muted">×${g.ls.length}</span>` : ""}</span>`;
      const hasComms = String(p.comms || "").trim().length > 0;
      return `<li class="adp-prow${open ? " open" : ""}"><div class="adp-prow-h">${icon(p.icon || "user", "s")}<b class="adp-prow-n" title="${esc(p.desc || "")}">${esc(p.name)}</b>
          ${grp.length ? `<span class="adp-prow-m" title="${esc(grp.map((g) => `${g.row.name}: ${g.c.title}`).join(" · "))}">${plural(grp.length, "impactpunt", "impactpunten")}</span>` : `<span class="adp-prow-m">Weinig impact</span>`}
          ${hasComms ? `<span class="adp-prow-c" title="Communicatie vastgelegd">${icon("mail", "s")}<span class="sr-only">Communicatie vastgelegd</span></span>` : ""}
          <span class="spacer"></span>
          <button class="btn small subtle" data-action="per-open" data-id="${pid}" aria-expanded="${open}">${icon(open ? "chevrondown" : "edit", "s")} ${open ? "Sluiten" : "Bewerken"}</button><button class="btn small subtle" data-action="per-del" data-id="${pid}" title="Verwijderen" aria-label="Persona ${esc(p.name)} verwijderen">${icon("trash", "s")}</button></div>
        ${open ? `<div class="adp-prow-e vb-per-edit"><div class="grid grid-2">${F.text(`per:${p.id}:name`, "Naam", { render: true })}${F.text(`per:${p.id}:desc`, "Omschrijving", { render: true })}</div>
          ${grp.length ? `<div class="chip-list mb-1">${grp.map(chip).join("")}</div>` : ""}
          <div class="field-label">Raakt deze domeinen ${infoTip("Bepaalt welke keuzes van het ontwerpbord meetellen in de impact voor deze persona.")}</div><div class="chip-list mb-1">${rows.map((r) => `<button class="chip sm${(p.touch || []).includes(r.key) ? " on" : ""}" style="cursor:pointer" data-action="per-touch" data-id="${pid}" data-key="${esc(r.key)}" aria-pressed="${(p.touch || []).includes(r.key)}">${icon(r.icon, "s")}${esc(r.name)}</button>`).join("")}</div>
          <div class="grid grid-2">${F.select(`per:${p.id}:impact.level`, "Verwachte impact", CATALOG.friction.map((t, i) => [String(i), t]))}${F.textarea(`per:${p.id}:comms`, "Communicatie voor deze groep", { rows: 2, ph: "Bijv. e-learning, intranetbericht, instructie bij eerste policy tip" })}</div></div>` : ""}</li>`;
    };
    const frictionLabels = ls.map((l) => ({ l, f: Mapping.friction(l) })).sort((a, b) => b.f - a.f);
    const lblTable = `<div class="table-wrap"><table class="table vb-fr-table"><thead><tr><th>Label · merkbaar voor de gebruiker</th><th>Impact</th></tr></thead><tbody>${frictionLabels.map(({ l, f }) => {
      const fl = Mapping.frictionLabel(f);
      const vis = rows.map((r) => Mapping.choice(l, r.key)).filter((c) => c && c.fr > 0).map((c) => c.title);
      return `<tr><td>${labelPill(l, st)}<div class="xs mt-1">${vis.length ? VH.clamp(`<span class="muted">${esc(vis.join(" · "))}</span>`, vis.join(" · ").length, 2, 90) : `<span class="muted">${AdoptUI.designed(l) ? "Niets merkbaars" : "Nog niet ontworpen"}</span>`}</div></td><td><span class="badge ${esc(fl.cls)}">${esc(fl.t)}</span></td></tr>`;
    }).join("")}</tbody></table></div>`;
    const miss = AdoptUI.missingSector(st);
    return `<section class="adp-hsec"><div class="adp-sec-h"><h3 class="section-title">Impact per persona en label</h3>${pers.length ? legend : ""}</div>${heat}</section>
      <section class="adp-psec"><div class="adp-sec-h"><h3 class="section-title">Persona’s</h3><div class="row tight">${miss.length ? `<button class="btn small subtle" data-action="per-sector" title="${esc(miss.map((p) => p.name).join(", "))}">${icon("plus", "s")} ${plural(miss.length, "sectorpersona", "sectorpersona’s")}</button>` : ""}<button class="btn small" data-action="per-add">${icon("plus", "s")} Persona</button></div></div>
        ${pers.length ? `<ul class="adp-plist">${pers.map(personaRow).join("")}</ul>` : ""}</section>
      <div class="mt-2">${accordion("adp-lbl-impact", "Impact per label", lblTable)}</div>`;
  },

  tab_rollout(st) {
    let g = { dlpPolicies: [], autoPolicies: [] };
    try { g = Generator.all(st); } catch (e) { /* leeg ontwerp */ }
    const modeCount = (modes) => (g.dlpPolicies || []).filter((p) => modes.includes(p.mode)).length + (g.autoPolicies || []).filter((p) => modes.includes(p.mode === "enable" ? "enable" : "simulation")).length;
    let att = {};
    try { att = AdoptUI.attention(st); } catch (e) { att = {}; }
    const dateIn = (k, f, label) => { const id = `adp-${k}-${f}`, v = AdoptUI.phase(st, k)[f] || ""; return `<div class="field mb-0"><label for="${id}">${label}</label><input id="${id}" class="input" type="date" data-bind="st:adoption.phases.${esc(k)}.${f}" value="${esc(v)}"></div>`; };
    const steps = ADOPT_PHASES.map((ph, i) => {
      const pv = AdoptUI.phase(st, ph.key);
      const late = pv.due && pv.start && pv.due < pv.start;
      const a = att[ph.key] || [];
      const n = ph.modes.length ? modeCount(ph.modes) : null;
      return `<li class="adp-ph"><span class="adp-ph-n" aria-hidden="true">${i + 1}</span>
        <div class="adp-ph-main"><div class="adp-ph-h"><h3>${esc(ph.name)}</h3>${n ? `<span class="badge neutral" title="DLP- en auto-labelingpolicies in deze modus">${plural(n, "policy", "policies")}</span>` : ""}</div>
          <p class="adp-ph-goal">${esc(ph.goal)}</p>
          ${a.length ? `<ul class="adp-ph-att" aria-label="Aandachtspunten uit het ontwerp">${a.map((x) => `<li${x.tip ? ` title="${esc(x.tip)}"` : ""}>${icon("warning", "s")}<span>${esc(x.t)}</span></li>`).join("")}</ul>` : ""}
          <details class="adp-ph-more" data-acc="adp-ph-${esc(ph.key)}"><summary>Acties en gereed-criterium</summary><dl><dt>Acties</dt><dd><ul>${ph.actions.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></dd><dt>Rol</dt><dd>${esc(ph.role)}</dd><dt>Gereed als</dt><dd>${esc(ph.done)}</dd></dl></details></div>
        <div class="adp-ph-f">${F.text(`st:adoption.phases.${ph.key}.owner`, "Eigenaar", { ph: "Rol of naam" })}<div class="vb-phase-dates">${dateIn(ph.key, "start", "Start")}${dateIn(ph.key, "due", "Streefdatum")}</div>
          ${late ? `<div class="xs adp-late">Streefdatum ligt vóór de start.</div>` : ""}</div></li>`;
    }).join("");
    const notesFilled = ADOPT_NOTES.filter(([k]) => String(((st.adoption || {}).notes || {})[k] || "").trim()).length;
    const anyAtt = Object.keys(att).length > 0;
    return `${this._bar(`${statusBadge("example", "Voorbeeldaanpak")} ${infoTip("Fasen, acties, rollen en criteria zijn een voorbeeldaanpak: stem ze af met de klant. Eigenaar en data komen in het ontwerpdocument, de Excel-export en de communicatieteksten.")}${anyAtt ? `<span class="adp-att-key">${icon("warning", "s")} = aandachtspunt uit jullie ontwerp</span>` : ""}`)}
      <ol class="adp-tl">${steps}</ol>
      <div class="mt-2">${accordion("ad-notes", `Afspraken <span class="xs muted">· ${notesFilled}/${ADOPT_NOTES.length} ingevuld</span>`, ADOPT_NOTES.map(([k, t]) => F.textarea(`st:adoption.notes.${k}`, t, { rows: 2 })).join(""), notesFilled > 0)}</div>
      <p class="small muted mt-1">${learn("dlpSimulation", "DLP-simulatiemodus")} ${learn("labelsGetStarted", "Aan de slag met sensitivity labels")}</p>`;
  },

  _docToggle(spec, label) { return `<span class="adp-doc-t">${F.toggle(spec, label, { invert: true })}</span>`; },

  tab_tree(st) {
    const how = `<ul class="small mb-0"><li>De hoofdlabels staan van laag naar hoog, in de volgorde van het classificatieschema.</li><li>Per overgang wordt een ja/nee-vraag gekozen op basis van de naam en beschrijving van het label (openbaar, intern, vertrouwelijk, strikt vertrouwelijk). Herkent de app het niveau niet, dan luidt de vraag “Is het gevoeliger dan …?”.</li><li>Beschrijving, voorbeelden en sublabels komen uit het schema. Pas ze daar aan om de spiekbrief te verbeteren.</li></ul>`;
    return `${this._bar("Eén A4 voor iedere medewerker.", `${this._docToggle("st:adoption.doc.noTree", "In ontwerpdocument")}<button type="button" class="btn" data-action="adp-print" data-what="tree">${icon("printer", "s")} Afdrukken</button>`)}
      <div class="adp-sheet-wrap">${AdoptKit.treeHtml(st)}</div>
      <div class="mt-2">${accordion("adp-tree-how", "Hoe komen de vragen tot stand?", how)}</div>`;
  },

  tab_cards(st, ls) {
    return `${this._bar(`${plural(ls.length, "kaart", "kaarten")} ${infoTip("De voorbeelden komen uit de labelbeschrijving (‘informatie’) en de gekoppelde informatietypen. Kop- en voetteksten en watermerken zijn de markeringen uit de labelinstellingen.")}`, `${this._docToggle("st:adoption.doc.noCards", "In ontwerpdocument")}<button type="button" class="btn" data-action="adp-print" data-what="cards">${icon("printer", "s")} Afdrukken</button>`)}
      ${AdoptKit.cardsHtml(st, { app: typeof Previews !== "undefined" })}`;
  },

  tab_comms(st) {
    const items = AdoptKit.comms(st);
    const ph = (st.adoption || {}).phases || {};
    const hasDates = ["prep", "sim", "tips", "enforce"].some((k) => ph[k] && ph[k].start);
    const words = (t) => String(t).split(/\s+/).filter(Boolean).length;
    const set = `<div class="card flat adp-cset"><h3 class="section-title">Gegevens ${infoTip("Lege velden blijven als [placeholder] in de tekst staan.")}</h3>
      ${F.text("st:adoption.comms.contact", "Contactpersoon", { render: true, ph: "Naam, functie" })}
      ${F.text("st:adoption.comms.desk", "Servicedesk", { render: true, ph: "E-mail of telefoon" })}
      ${F.text("st:adoption.comms.link", "Intranetpagina", { render: true, ph: "Link of pad" })}
      ${F.text("st:adoption.comms.sender", "Afzender aankondiging", { render: true, ph: "Naam, functie" })}
      ${hasDates ? "" : `<div class="adp-hint">${icon("clock", "s")}<span>Geen startdata. <button type="button" class="linklike" data-action="go" data-route="adoption" data-sub="rollout">Vul in bij Uitrol</button></span></div>`}
      <div class="adp-cset-f">${F.toggle("st:adoption.doc.comms", "In ontwerpdocument")}<button type="button" class="btn small" data-action="adp-dl" data-item="all">${icon("download", "s")} Alles (.txt)</button></div></div>`;
    const list = items.map((x, i) => `<article class="adp-comm"><header class="adp-comm-h"><span class="adp-comm-ic">${icon(x.icon, "s")}</span><div class="adp-comm-t"><h3>${esc(x.title)}</h3><p class="xs muted">${esc(x.desc)}</p></div>
        <div class="adp-acts"><button type="button" class="btn small" data-action="adp-copy" data-item="${esc(x.key)}">${icon("copy", "s")} Kopiëren</button><button type="button" class="btn small subtle" data-action="adp-dl" data-item="${esc(x.key)}" aria-label="${esc(x.title)} downloaden als .txt">${icon("download", "s")} .txt</button></div></header>
        <details class="adp-more" data-acc="adp-comm-${esc(x.key)}"${i === 0 ? " open" : ""}><summary>Tekst bekijken <span class="xs muted">· ${words(x.body)} woorden</span></summary><pre class="adp-text" tabindex="0">${esc(x.body)}</pre></details></article>`).join("");
    return `<div class="adp-comms">${set}<div class="adp-comm-list">${list}</div></div>`;
  },

  tab_journey(st, ls) {
    const pers = st.personas || [];
    if (!pers.length) return emptyState("users", "Geen persona’s", "Voeg eerst persona’s toe bij Overzicht.", `<button class="btn primary" data-action="go" data-route="adoption" data-sub="impact">${icon("users", "s")} Naar Overzicht</button>`);
    const A = CATALOG.adoption, cur = pers.find((p) => p.id === UI.adpPer) || pers[0];
    const l = AdoptKit.personaLabel(cur, st);
    const hex = AdoptKit.hex(l.color), ex = AdoptKit.examples(l, st)[0] || "document";
    const chips = `<div class="adp-pers" role="group" aria-label="Kies een persona">${pers.map((p) => `<button type="button" class="adp-per${p === cur ? " on" : ""}" data-action="adp-per" data-id="${esc(p.id)}" aria-pressed="${p === cur}">${icon(p.icon || "user", "s")}<span>${esc(p.name)}</span></button>`).join("")}</div>`;
    const sel = `<label class="adp-psel"><span>Werkt met</span><select class="select" data-action="adp-per-label" data-id="${esc(cur.id)}">${ls.map((x) => `<option value="${esc(x.id)}"${x === l ? " selected" : ""}>${esc(labelFullName(x, st))}</option>`).join("")}</select></label>`;
    const pv = typeof Previews !== "undefined";
    const day = AdoptKit.moments(cur, st).map((m) => {
      const o = AdoptKit.outcome(m.key, l, st);
      return `<li class="adp-mom k-${o.k}" style="--lc:${hex}"><div class="adp-mom-art"><svg class="adp-scene" viewBox="0 0 160 100" aria-hidden="true" focusable="false">${A.scenes[m.scene] || ""}</svg><span class="adp-time">${esc(m.time)}</span></div>
        <div class="adp-mom-b"><h4>${esc(m.title)}</h4><p class="adp-does">${esc(m.does.replace("{doc}", ex))}</p><div class="adp-pv-lbl">${icon("shield", "s")} Wat Purview doet</div>${AdoptKit.fxList(o.lines)}
        ${pv ? `<button type="button" class="btn small subtle" data-action="pv-open" data-label="${esc(l.id)}" data-app="${esc(m.app)}">${icon("eye", "s")} Voorbeeld</button>` : ""}</div></li>`;
    }).join("");
    return `${chips}
      <div class="adp-phead" style="--lc:${hex}"><span class="adp-pav">${icon(cur.icon || "user")}</span><div class="adp-ph-t"><h3>${esc(cur.name)}</h3>${cur.desc ? `<p class="small muted">${esc(cur.desc)}</p>` : ""}</div>${statusBadge("illustrative", "Illustratieve werkdag")}${sel}</div>
      <ol class="adp-day">${day}</ol>`;
  },

  tab_quiz(st) {
    return `${this._bar(`Kennischeck per thema, met vragen uit jullie ontwerp. ${infoTip("Mix = twee vragen per thema. Na elk antwoord zie je bij elk alternatief waarom het wel of niet klopt; verdieping staat achter ‘Meer uitleg’.")}`)}${AdoptKit.quizHtml(st)}`;
  },

  tab_lab(st) {
    return `${this._bar(`Oefencasus voor de groep: één collega, zes situaties. ${infoTip("Het label, de DLP-regels, de versleuteling en het labelbeleid komen uit jullie ontwerp. Zonder labels gebruikt de casus voorbeeldlabels. Uitkomsten gaan uit van gehandhaafde regels.")}`)}${AdoptKit.labHtml(st)}`;
  },

  tab_kpi(st) {
    const A = CATALOG.adoption, rel = AdpKpi.rel(st), phs = ADOPT_PHASES;
    const ph = phs.some((p) => p.key === UI.adpKpiPhase) ? UI.adpKpiPhase : "all";
    const only = UI.adpKpiOnly === true;
    const all = A.kpis.slice().sort((x, y) => (rel[x.key] === false) - (rel[y.key] === false));
    const on = (k) => AdpKpi.val(st, k.key).on === true;
    const plan = all.filter(on);
    let list = ph === "all" ? all : all.filter((k) => (k.phases || []).includes(ph));
    if (only) list = list.filter(on);
    const stat = plan.map((k) => AdpKpi.status(k, AdpKpi.val(st, k.key)));
    const nTarget = plan.filter((k) => AdpKpi.num(AdpKpi.val(st, k.key).target, k) !== null).length;
    const nOwner = plan.filter((k) => String(AdpKpi.val(st, k.key).owner || "").trim()).length;
    const nOk = stat.filter((x) => x.k === "ok").length;
    const sugg = all.filter((k) => rel[k.key] !== false && !on(k));
    const sumItem = (n, t, ic) => `<li><span class="adp-mp-ic">${icon(ic, "s")}</span><b>${n}</b><span>${esc(t)}</span></li>`;
    const summary = `<section class="adp-mp" aria-label="Meetplan">
      <ul class="adp-mp-s">${sumItem(`${plan.length}/${all.length}`, "KPI’s in meetplan", "target")}${sumItem(nTarget, "met doelwaarde", "flag")}${sumItem(nOwner, "met eigenaar", "user")}${sumItem(nOk, "op doel", "checkcircle")}</ul>
      ${sugg.length ? `<button type="button" class="btn small" data-action="adp-kpi-suggest">${icon("wand", "s")} ${plan.length ? `Voorstel aanvullen (${sugg.length})` : "Voorstel overnemen"}</button>` : ""}</section>`;
    const cnt = (key) => all.filter((k) => key === "all" || (k.phases || []).includes(key)).length;
    const fbtn = (key, txt) => `<button type="button" class="adp-kf-b${ph === key ? " on" : ""}" data-action="adp-kpi-ph" data-k="${esc(key)}" aria-pressed="${ph === key}">${esc(txt)} <span class="adp-kf-n" aria-label="${esc(plural(cnt(key), "KPI", "KPI’s"))}">${cnt(key)}</span></button>`;
    const filter = `<div class="adp-kf"><div class="adp-kf-g" role="group" aria-label="Filter op uitrolfase">${fbtn("all", "Alle fasen")}${phs.map((p) => fbtn(p.key, p.title)).join("")}</div>
      <button type="button" class="adp-kf-b adp-kf-only${only ? " on" : ""}" data-action="adp-kpi-only" aria-pressed="${only}">${icon("filter", "s")} Alleen meetplan</button></div>`;
    const gate = ph === "all" ? "" : this._kpiGate(st, phs.find((p) => p.key === ph), all);
    const rows = list.map((k) => this._kpiCard(st, k, rel[k.key] === false)).join("");
    const empty = list.length ? "" : `<div class="adp-kpi-empty">${icon("info", "s")}<span>${only ? "Nog geen KPI’s in het meetplan voor deze selectie. Zet ‘In meetplan’ aan bij een KPI of neem het voorstel over." : "Geen KPI’s voor deze fase."}</span></div>`;
    const rhythm = [["Simulatie", "bijv. 1–2 weken: klopt wat er matcht?"], ["Eerste 3 maanden", "maandelijks met key-users"], ["Daarna", "per kwartaal trends en bijsturen"]];
    return `${this._bar(`${statusBadge("example", "Voorbeelddoelen – samen vaststellen")} ${infoTip("Kies samen met de klant welke KPI’s tellen. Vul per KPI de nulmeting, de doelwaarde, de eigenaar en de frequentie in; dat wordt in het ontwerp bewaard. Streefwaarden zijn voorbeelden, geen norm van Microsoft.")}`)}
      ${summary}
      <ol class="adp-rhythm" aria-label="Meetritme (voorbeeld)">${rhythm.map(([t, d], i) => `<li><span class="adp-rn">${i + 1}</span><div><b>${esc(t)}</b><span>${esc(d)}</span></div></li>`).join("")}</ol>
      ${filter}${gate}
      <ul class="adp-kpis" aria-label="KPI’s">${rows}</ul>${empty}
      <p class="small muted adp-audit">${icon("info", "s")} Vereist Audit, aan vóór de livegang. Activity explorer toont maximaal 30 dagen: leg trends maandelijks vast. ${learn("audit", "Microsoft Purview Audit")}</p>`;
  },

  /** Go/no-go-paneel voor één uitrolfase: welke KPI's tellen en wanneer door naar de volgende fase. */
  _kpiGate(st, p, all) {
    const g = (CATALOG.adoption.kpiGates || {})[p.key] || { go: [] };
    const ks = all.filter((k) => (k.phases || []).includes(p.key));
    const plan = ks.filter((k) => AdpKpi.val(st, k.key).on === true);
    const sts = plan.map((k) => AdpKpi.status(k, AdpKpi.val(st, k.key)));
    const meas = sts.filter((x) => x.k === "ok" || x.k === "prog" || x.k === "off").length, ok = sts.filter((x) => x.k === "ok").length;
    const verdict = !plan.length ? ["neutral", "Nog geen KPI’s gekozen"] : !meas ? ["neutral", "Nog niet gemeten"] : ok === plan.length ? ["ok", "Go: alle KPI’s op doel"] : ["warn", `${ok} van ${plan.length} op doel`];
    const chip = (k, i) => { const x = plan.includes(k) ? sts[plan.indexOf(k)] : null; return `<li class="adp-gk${x ? " s-" + x.k : " s-out"}">${icon(k.icon, "s")}<span>${esc(k.title)}</span>${x ? `<span class="sr-only">: ${esc(x.t)}</span>` : `<span class="sr-only">: niet in meetplan</span>`}</li>`; };
    return `<section class="adp-gate" aria-labelledby="adp-gate-h">
      <div class="adp-gate-h"><span class="adp-gate-ic">${icon(p.icon, "s")}</span><div><h3 id="adp-gate-h">${esc(p.title)}</h3><p>${esc(p.goal)}</p></div><span class="badge ${verdict[0]}">${esc(verdict[1])}</span></div>
      <div class="adp-gate-b"><div><h4>KPI’s die tellen</h4><ul class="adp-gks">${ks.map(chip).join("")}</ul></div>
        <div><h4>${g.next ? `Go/no-go naar ${esc(g.next)}` : "Blijvend meten"} ${infoTip("Voorbeeldcriteria: spreek samen af wanneer je doorgaat. Gaat een criterium niet door (no-go), blijf dan in deze fase en stel bij.")}</h4><ul class="adp-go">${(g.go || []).map((x) => `<li>${icon("check", "s")}<span>${esc(x)}</span></li>`).join("")}</ul></div></div>
      <p class="xs muted adp-gate-f">${icon("clock", "s")} Eigenaar en data van deze fase leg je vast bij <button type="button" class="linklike" data-action="go" data-route="adoption" data-sub="rollout">Uitrol</button>.</p></section>`;
  },

  /** Eén KPI-kaart: uitleg en meetbron altijd zichtbaar; invulvelden en meter zodra de KPI in het meetplan staat. */
  _kpiCard(st, k, off) {
    const v = AdpKpi.val(st, k.key), on = v.on === true, kk = esc(k.key), pre = `st:adoption.kpi.${k.key}`;
    const pct = k.unit === "pct", unit = pct ? " (%)" : " (aantal)";
    const freqs = CATALOG.adoption.kpiFreq || [], defF = (freqs.find((f) => f[0] === k.freq) || [])[1] || "";
    const links = (k.learn || []).map((x) => learn(x)).filter(Boolean).join(" ");
    const phaseNames = (k.phases || []).map((x) => (ADOPT_PHASES.find((p) => p.key === x) || {}).name).filter(Boolean);
    const s = on ? AdpKpi.status(k, v) : null;
    const lim = { min: 0, max: pct ? 100 : 10000000, step: "any", render: true };
    const fields = on ? `<div class="adp-kpi-f">
        ${F.number(`${pre}.base`, "Nulmeting" + unit, lim)}
        ${F.number(`${pre}.target`, "Doel" + unit, lim)}
        ${F.number(`${pre}.now`, "Laatste meting" + unit, lim)}
        ${F.text(`${pre}.owner`, "Eigenaar", { ph: "Rol of naam", maxlength: 120 })}
        ${F.select(`${pre}.freq`, "Frequentie", [["", defF ? `Voorstel: ${defF.toLowerCase()}` : "Kies"], ...freqs])}
        ${F.text(`${pre}.note`, "Afspraak of toelichting", { ph: "Bijv. bron, periode of aanpak", maxlength: 500, cls: "adp-kpi-note" })}</div>` : "";
    return `<li class="adp-kpi${off ? " off" : ""}${on ? " on" : ""}" data-kpi="${kk}"><span class="adp-kpi-ic">${icon(k.icon, "s")}</span>
      <div class="adp-kpi-b"><div class="adp-kpi-h"><h3>${esc(k.title)}</h3>${off ? `<span class="badge neutral">Niet in ontwerp</span>` : ""}${s ? `<span class="badge ${esc(s.cls)} adp-kpi-st">${esc(s.t)}</span>` : ""}
          <span class="adp-kpi-on">${F.toggle(`${pre}.on`, "In meetplan")}</span></div>
        <p class="adp-kpi-what">${esc(k.what || "")}</p>
        <p class="adp-kpi-w"><span class="adp-kpi-src">${icon("search", "s")} Meetbron</span> ${esc(k.where)}</p>
        ${on ? AdpKpi.meter(k, v) : `<p class="adp-target"><span>Voorbeelddoel</span> ${esc(k.target)}</p>`}
        ${fields}
        <p class="adp-kpi-ph xs">${phaseNames.length ? `Telt in: ${esc(phaseNames.join(" · "))}` : ""}${defF ? ` · Meet ${esc(defF.toLowerCase())}` : ""}</p>
        <details class="adp-kpi-more" data-acc="adp-kpi-${kk}"><summary>Meer uitleg</summary>
          <dl><dt>Waarom</dt><dd>${esc(k.why || "")}</dd><dt>Hoe meet je dit?</dt><dd>${esc(k.how)}</dd><dt>Rol en licentie</dt><dd>${esc(k.roles || "")}</dd>${k.note ? `<dt>Let op</dt><dd>${esc(k.note)} <span class="muted">Controleer in de portal.</span></dd>` : ""}</dl>
          ${links ? `<div class="adp-kpi-l">${links}</div>` : ""}</details></div></li>`;
  },
});
