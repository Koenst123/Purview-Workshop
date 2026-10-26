/* View: Impact & adoptie – persona-heatmap, uitrol, spiekbrief, labelkaarten, communicatiepakket, persona-reis, quiz en meten */
const ADOPT_PHASES = [
  { key: "prep", icon: "settings", title: "0 · Voorbereiden", desc: "Tenantvoorwaarden, labels publiceren aan een pilotgroep, key-users trainen, communicatie klaarzetten.", modes: [] },
  { key: "sim", icon: "eye", title: "1 · Simuleren", desc: "DLP- en auto-labelingpolicies in simulatiemodus; 1–2 weken Activity explorer en DLP-alerts bekijken.", modes: ["simulation"] },
  { key: "tips", icon: "bell", title: "2 · Policy tips aan", desc: "Simulatie + policy tips: gebruikers zien meldingen, er wordt nog niet geblokkeerd. Ideaal om de impact te meten.", modes: ["simulationTips"] },
  { key: "enforce", icon: "shield", title: "3 · Handhaven", desc: "Policies aanzetten, gefaseerd per locatie of afdeling (admin units / groepen). Begin met de gevoeligste labels.", modes: ["enable"] },
  { key: "eval", icon: "chart", title: "4 · Evalueren", desc: "Overrides, false positives en incidenten periodiek bespreken; drempels en SIT’s bijstellen.", modes: [] },
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
  quiz(st) {
    const L = this.leaves(st);
    if (L.length < 2) return [];
    const r = this.rng(this.hash(L.map((l) => l.id + "|" + this.nm(l)).join(";")));
    const fn = (l) => this.full(l, st), lq = [], bq = [];
    const why = (l) => `‘${fn(l)}’${this.when(l, st) ? ": " + this.when(l, st) : "."}`;
    const lblQ = (q, l) => {
      const others = this.shuffle(L.filter((x) => x !== l), r).slice(0, 3);
      lq.push({ q, opts: this.shuffle([l, ...others], r).map((x) => ({ t: fn(x), ok: x === l, c: this.hex(x.color) })), why: why(l) });
    };
    const opt = (arr) => this.shuffle(arr.map((t, i) => ({ t, ok: i === 0 })), r);
    const exOf = new Map(L.map((l) => [l, this.examples(l, st)]));
    let n1 = 0;
    this.shuffle(L, r).forEach((l) => {
      if (n1 >= 3) return;
      const ex = exOf.get(l).find((x) => !L.some((o) => o !== l && exOf.get(o).some((y) => y.toLowerCase() === x.toLowerCase())));
      if (!ex) return;
      lblQ(`Je werkt aan: ‘${ex}’. Welk label kies je?`, l); n1++;
    });
    let n2 = 0;
    this.A().quizScenarios.forEach((sc) => {
      if (n2 >= 2) return;
      const sco = L.map((l) => {
        const pp = parentOf(l, st);
        const txt = [this.nm(l), l.tooltip, l.audience, ...(Array.isArray(l.info) ? l.info : []), pp && this.nm(pp), pp && pp.tooltip].map((y) => this.str(y)).join(" ").toLowerCase();
        return { l, s: sc.kw.filter((k) => this.kwRe(k).test(txt)).length };
      }).sort((a, b) => b.s - a.s);
      if (!sco[0].s || (sco[1] && sco[1].s === sco[0].s)) return;
      lblQ(`${sc.text} Welk label kies je?`, sco[0].l); n2++;
    });
    const rank = { block: 4, override: 3, encrypt: 2, tip: 1 };
    const exr = L.map((l) => ({ l, r: this.rule(l, "exchange", st) })).filter((x) => x.r && rank[x.r.action] && x.r.scope !== "internal")
      .sort((a, b) => rank[b.r.action] - rank[a.r.action] || labelPriority(b.l, st) - labelPriority(a.l, st));
    if (exr.length) {
      const x = exr[0], ov = String((x.r.notify && x.r.notify.override) || "");
      const A = { block: "De mail wordt tegengehouden", override: ov === "WithoutJustification" ? "Je krijgt een waarschuwing en kunt doorgaan" : "Je krijgt een waarschuwing en kunt doorgaan met een zakelijke reden", encrypt: "De mail wordt automatisch versleuteld", tip: "Je ziet een melding (policy tip), maar de mail gaat gewoon" };
      const keys = [x.r.action, ...Object.keys(A).filter((k) => k !== x.r.action)];
      bq.push({ q: `Je mailt een document met het label ‘${fn(x.l)}’ naar een externe partij. Wat gebeurt er?`, opts: opt(keys.map((k) => A[k])), why: `In jullie ontwerp: ${this.lc(this.dlpText(x.l, "exchange", st).t)}.` });
    }
    const s = this.settings(st);
    bq.push({ q: "Je kiest voor een document een lager label dan het had. Wat gebeurt er?", opts: opt([s.justification ? "De app vraagt om een korte reden (justification)" : "Het label wordt aangepast; de wijziging wordt wel vastgelegd", "Het document wordt verwijderd", "Dat kan niet: een label is definitief", "Je manager moet het eerst goedkeuren"]), why: s.justification ? "Jullie labelbeleid vraagt om een reden bij het verlagen of verwijderen van een label. Die reden is terug te zien in Activity explorer." : "In jullie labelbeleid is geen reden verplicht. De wijziging is wel zichtbaar in Activity explorer." });
    const lo = L[0], hi = L[L.length - 1];
    bq.push({ q: `Copilot maakt een nieuw document op basis van een bestand met ‘${fn(lo)}’ en een bestand met ‘${fn(hi)}’. Welk label krijgt het nieuwe document?`, opts: opt([fn(hi), fn(lo), "Geen label", "Een willekeurig label"]), why: `Nieuwe inhoud krijgt het label met de hoogste prioriteit mee: ‘${fn(hi)}’.` });
    const cpx = L.find((l) => { const x = this.rule(l, "copilot", st); return x && x.actions && x.actions.copilotExclude; });
    if (cpx) bq.push({ q: `Je vraagt Copilot een bestand met ‘${fn(cpx)}’ samen te vatten. Wat gebeurt er?`, opts: opt(["Copilot gebruikt de inhoud niet in het antwoord", "Copilot vat het gewoon samen", "Het bestand wordt verwijderd", "Het label wordt automatisch verlaagd"]), why: `Een DLP-regel voor Microsoft 365 Copilot sluit bestanden met ‘${fn(cpx)}’ uit van verwerking in antwoorden.` });
    else bq.push({ q: "Kan Copilot een document samenvatten waar jij zelf geen toegang toe hebt?", opts: opt(["Nee, Copilot gebruikt alleen wat jij zelf mag openen", "Ja, Copilot kan alles in de organisatie lezen", "Ja, als je het netjes vraagt", "Alleen als het document geen label heeft"]), why: "Copilot werkt met jouw rechten. Bij versleutelde bestanden heb je bovendien de gebruiksrechten VIEW en EXTRACT nodig." });
    bq.push({ q: "Werken labels ook in Outlook en Word op je telefoon?", opts: opt(["Ja, op iOS en Android, en ook in de browser", "Nee, alleen op een Windows-pc", "Alleen in de webversie", "Alleen op een Mac"]), why: "Labels zijn ingebouwd in de Office-apps op Windows, Mac, iOS en Android en in Office voor het web." });
    const mi = Math.max(0, Math.floor((L.length - 1) / 2)), a = L[mi], b = L[mi + 1] || L[L.length - 1];
    bq.push({ q: `Je twijfelt tussen ‘${fn(a)}’ en ‘${fn(b)}’. Wat doe je?`, opts: opt([`Kies het hogere label: ‘${fn(b)}’`, `Kies het lagere label: ‘${fn(a)}’`, "Geen label kiezen", "Het bestand niet opslaan"]), why: "Bij twijfel kies je het hogere label. Je kunt het later altijd nog aanpassen." });
    if (lq.length + bq.length < 8) bq.push({ q: "Waar kies je in Word of Outlook een label?", opts: opt(["Via de knop Gevoeligheid (Sensitivity) op het lint", "In het Windows-configuratiescherm", "Via een mail naar de servicedesk", "Dat doet alleen IT"]), why: "Je kiest een label via Gevoeligheid (Sensitivity) op het tabblad Start, of via de balk bovenaan het venster." });
    const out = [];
    for (let i = 0; i < Math.max(lq.length, bq.length); i++) { if (lq[i]) out.push(lq[i]); if (bq[i]) out.push(bq[i]); }
    return out.slice(0, 10);
  },
  quizHtml(st) {
    const qs = this.quiz(st);
    if (!qs.length) return emptyState("trophy", "Te weinig labels voor een quiz", "Een quiz heeft minimaal twee toepasbare labels nodig.");
    const key = String(this.hash(qs.map((q) => q.q + q.opts.map((o) => o.t).join()).join("|")));
    let Q = UI.adpQuiz;
    if (!Q || Q.key !== key) Q = UI.adpQuiz = { key, i: 0, ans: [] };
    const n = qs.length, i = Math.min(Math.max(0, Q.i), n);
    const isAns = (j) => Q.ans[j] !== undefined && Q.ans[j] !== null;
    const score = qs.reduce((t, q, j) => t + (isAns(j) && q.opts[Q.ans[j]] && q.opts[Q.ans[j]].ok ? 1 : 0), 0);
    const fs = !!UI.adpQuizFs;
    const dots = qs.map((q, j) => `<span class="adp-qdot${isAns(j) ? (q.opts[Q.ans[j]] && q.opts[Q.ans[j]].ok ? " ok" : " no") : ""}${j === i ? " cur" : ""}"></span>`).join("");
    const bar = `<div class="adp-qbar"><span class="adp-qdots" aria-hidden="true">${dots}</span><span class="spacer"></span><span class="adp-qscore" aria-label="Score">${icon("trophy", "s")} ${score} / ${n}</span><button type="button" class="btn small subtle" data-action="adp-toggle-quizfs" aria-pressed="${fs}">${icon(fs ? "x" : "projector", "s")} ${fs ? "Sluiten" : "Presenteren"}</button></div>`;
    let body;
    if (i >= n) {
      const pct = Math.round((score / n) * 100);
      body = `<div class="adp-qres">${ring(pct, `${score}/${n}`, "adp-ring", pct >= 80 ? "var(--ok)" : pct >= 50 ? "var(--warn)" : "var(--err)")}<div><h3>${pct >= 80 ? "Uitstekend!" : pct >= 50 ? "Goed op weg" : "Nog even oefenen"}</h3><p>${score} van de ${n} vragen goed (${pct}%).</p><button type="button" class="btn primary" data-action="adp-qr">${icon("redo", "s")} Opnieuw</button></div></div>
        <ol class="adp-qrev">${qs.map((q, j) => { const ok = isAns(j) && q.opts[Q.ans[j]] && q.opts[Q.ans[j]].ok; const good = q.opts.find((o) => o.ok); return `<li class="${ok ? "ok" : "no"}">${icon(ok ? "checkcircle" : "xcircle", "s")}<div><b>${esc(q.q)}</b><small>Juist: ${esc(good ? good.t : "")}</small></div></li>`; }).join("")}</ol>`;
    } else {
      const q = qs[i], a = Q.ans[i], done = isAns(i), ok = done && q.opts[a] && q.opts[a].ok;
      body = `<div class="adp-qq"><span class="adp-qnum">Vraag ${i + 1} van ${n}</span><h3>${esc(q.q)}</h3>
        <div class="adp-opts" role="group" aria-label="Antwoorden">${q.opts.map((o, j) => {
          const cls = done ? (o.ok ? " ok" : j === a ? " no" : " dim") : "";
          return `<button type="button" class="adp-opt${cls}" data-action="adp-qa" data-o="${j}"${done ? ' aria-disabled="true"' : ""}><span class="adp-ol">${"ABCD"[j] || j + 1}</span>${o.c ? `<i class="adp-odot" style="background:${o.c}"></i>` : ""}<span class="adp-ot">${esc(o.t)}</span>${done && o.ok ? icon("checkcircle", "s") : done && j === a ? icon("xcircle", "s") : ""}</button>`;
        }).join("")}</div>
        ${done ? `<div class="adp-fb ${ok ? "ok" : "no"}" role="status">${icon(ok ? "checkcircle" : "info")}<div><b>${ok ? "Goed!" : "Helaas."}</b> ${esc(q.why)}</div></div>` : ""}
        <div class="adp-qnav"><button type="button" class="btn subtle" data-action="adp-qp"${i === 0 ? " disabled" : ""}>${icon("chevronleft", "s")} Vorige</button><span class="spacer"></span>${done ? `<button type="button" class="btn primary" data-action="adp-qn">${i === n - 1 ? "Bekijk score" : "Volgende"} ${icon("chevronright", "s")}</button>` : `<span class="xs muted">Kies een antwoord${fs ? " (A–D)" : ""}</span>`}</div></div>`;
    }
    return `<div class="adp-quiz${fs ? " fs" : ""}"${fs ? ' role="dialog" aria-modal="true" aria-label="Quiz"' : ""}>${fs ? `<div class="adp-toggle-quizfs-h"><span>${esc(this.org(st))} · Quiz: welk label kies ik?</span></div>` : ""}${bar}${body}</div>`;
  },
  quizScore(st) { const qs = this.quiz(st), Q = UI.adpQuiz || { ans: [] }; return { n: qs.length, s: qs.reduce((t, q, j) => t + (Q.ans[j] != null && q.opts[Q.ans[j]] && q.opts[Q.ans[j]].ok ? 1 : 0), 0) }; },
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
Actions["adp-qr"] = () => { UI.adpQuiz = null; App.render(); _adpFocus(".adp-opt"); };
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

const ADP_TABS = [
  ["impact", "users", "Impact"],
  ["rollout", "clock", "Uitrol"],
  ["tree", "route", "Spiekbrief"],
  ["cards", "tag", "Labelkaarten"],
  ["comms", "mail", "Communicatie"],
  ["journey", "user", "Persona-reis"],
  ["quiz", "trophy", "Quiz"],
  ["kpi", "chart", "Meten"],
];

registerView("adoption", {
  title: "Adoptie & impact",
  fac: {
    duration: 45,
    goal: "Inzicht in wat het ontwerp betekent voor verschillende groepen medewerkers, en afspraken over communicatie, training, gefaseerde uitrol en het meten van adoptie.",
    questions: ["Welke groep merkt het meest van de maatregelen – en is dat terecht?", "Wat moet een medewerker weten op dag 1?", "Wie is het aanspreekpunt bij een melding of blokkade?", "Hoe zien we over drie maanden of het werkt?"],
    tips: ["Gebruik de heatmap om ‘rode’ combinaties te bespreken: is de impact proportioneel?", "Laat de spiekbrief en de labelkaarten zien: herkent de klant de vragen en voorbeelden?", "Speel de quiz op de beamer met het hele team – fouten zijn gespreksstof.", "Plan de uitrol in fasen: simulatie → tips → handhaven, met een eigenaar en datum per fase."],
    pitfalls: ["Alles tegelijk handhaven leidt tot veel tickets en workarounds.", "Zonder key-users in de afdelingen blijven labels ongebruikt.", "Communicatie zonder concrete voorbeelden blijft abstract."],
    links: ["labelsGetStarted", "dlpSimulation", "dlpPlan"],
  },
  done: (st) => (st.personas || []).some((p) => String(p.comms || "").trim()) || Object.values((st.adoption || {}).notes || {}).some((v) => String(v || "").trim()),
  render() {
    const st = S();
    const cur = ADP_TABS.some((t) => t[0] === UI.sub.adoption) ? UI.sub.adoption : "impact";
    if (cur !== "quiz") UI.adpQuizFs = false;
    const ls = applicableLabels(st);
    const lead = "Wat merken medewerkers ervan – en hoe neem je ze mee?";
    const more = `<p>Bespreek eerst de impact per persona (heatmap) en plan de uitrol in fasen. Gebruik daarna de kant-en-klare materialen: spiekbrief, labelkaarten, communicatiepakket, persona-reis en quiz. Alles wordt automatisch opgebouwd uit het ontwerp.</p><p>Met <b>Meten</b> spreek je af hoe je na de livegang in Purview volgt of labels en DLP werken.</p>`;
    const head = pageHead("Impact & adoptie", "Adoptie & impact", lead, `<button class="btn" data-action="go" data-route="scenarios">${icon("play", "s")} Scenario’s</button>`, more);
    const needL = ["impact", "tree", "cards", "comms", "journey", "quiz"].includes(cur) && !ls.length;
    let body = "";
    try { body = needL ? VH.needLabels() : this["tab_" + cur](st, ls); } catch (e) { console.error(e); body = msg("err", "Dit onderdeel kon niet worden opgebouwd. Controleer het ontwerp of kies een ander tabblad."); }
    return VH.wrap(`${head}${tabs("adoption", ADP_TABS.map(([k, ic, t]) => [k, `${icon(ic, "s")}<span>${t}</span>`]), cur, { label: "Onderdelen adoptie" })}<div class="adp-pane adp-p-${cur}" role="tabpanel">${body}</div>`, "adp-view");
  },
  /** Kop per tabblad: korte uitleg + acties. */
  _bar(text, acts = "") { return `<div class="adp-lead"><p>${text}</p>${acts ? `<div class="adp-acts">${acts}</div>` : ""}</div>`; },

  tab_impact(st, ls) {
    const pers = st.personas || [];
    const rows = AdoptUI.rows();
    const des = ls.map((l) => AdoptUI.designed(l));
    const hh = (l, i) => {
      const p = parentOf(l, st);
      return `<th scope="col" class="${des[i] ? "" : "vb-heat-na"}" title="${esc(labelFullName(l, st))}${des[i] ? "" : " – nog niet ontworpen"}"><span class="vb-hh">${p ? `<span class="vb-hh-p">${esc(p.displayName || p.name)}</span>` : ""}<span class="vb-hh-n"><span class="color-dot" style="background:${esc(AdoptKit.hex(l.color))}"></span> ${esc(l.displayName || l.name)}</span>${des[i] ? "" : `<span class="vb-hh-p">nog niet ontworpen</span>`}</span></th>`;
    };
    const heat = pers.length ? `<div class="table-wrap vb-heat-wrap" tabindex="0" role="region" aria-label="Heatmap persona’s × labels"><table class="heat vb-heat"><thead><tr><th scope="col"><span class="sr-only">Persona</span></th>${ls.map(hh).join("")}<th scope="col">Totaal</th></tr></thead>
      <tbody>${pers.map((p) => {
        const cells = ls.map((l) => AdoptUI.cell(p, l));
        const tot = sum(cells.map((c) => c.total)), fl = Mapping.frictionLabel(Math.round(tot / Math.max(1, ls.length)));
        return `<tr><th scope="row" class="vb-heat-p" title="${esc(p.desc || "")}">${icon(p.icon || "user", "s")} ${esc(p.name)}</th>${cells.map((c, i) => des[i]
          ? `<td class="h h${c.h}" title="${esc(labelFullName(ls[i], st))}: ${c.parts.length ? esc(c.parts.map((x) => `${(BoardUtil.rowByKey(x.k) || {}).name}: ${x.c.title} (${CATALOG.friction[x.fr]})`).join(" · ")) : "merkt niets"}">${c.total || ""}</td>`
          : `<td class="h vb-h-na" title="${esc(labelFullName(ls[i], st))}: nog niet ontworpen">–</td>`).join("")}<td><span class="badge ${esc(fl.cls)}">${esc(fl.t)}</span></td></tr>`;
      }).join("")}</tbody></table></div>
      <p class="xs muted mt-1 mb-0">0 = merkt niets · 10+ = veel uitleg nodig ${infoTip("Getal = merkbare wijzigingen voor deze rol, gewogen naar hinder. Alle labels tellen mee: persona’s zijn niet aan publicatiegroepen gekoppeld. Een label dat alleen voor één afdeling is gepubliceerd, raakt andere rollen in werkelijkheid niet. Grijs = label beschermt nog niets (nog niet ontworpen).")}</p>`
      : emptyState("users", "Geen persona’s", "Voeg persona’s toe om de impact per doelgroep te bespreken.", `<button class="btn primary" data-action="per-add">${icon("plus", "s")} Persona</button>`);

    const personaCard = (p) => {
      const open = UI.perOpen === p.id, pid = esc(p.id);
      const hot = AdoptUI.hot(p, st);
      const grp = [];
      hot.forEach((x) => { const k = x.k + "|" + x.c.id; let g = grp.find((y) => y.k === k); if (!g) grp.push((g = { k, row: BoardUtil.rowByKey(x.k) || { name: x.k }, c: x.c, ls: [] })); g.ls.push(labelFullName(x.l, st)); });
      const chip = (g) => `<span class="chip sm" title="${esc(g.c.desc)} – ${esc(g.ls.join(", "))}">${esc(g.row.name)}: ${esc(g.c.title)}${g.ls.length > 1 ? ` <span class="muted">×${g.ls.length}</span>` : ""}</span>`;
      const hasComms = String(p.comms || "").trim().length > 0;
      return `<div class="card flat mb-1 vb-per"><div class="row tight vb-per-head">${icon(p.icon || "user")}<b class="vb-sum-title" title="${esc(p.desc || "")}">${esc(p.name)}</b>${grp.length ? `<span class="badge warn" title="${esc(grp.map((g) => `${g.row.name}: ${g.c.title}`).join(" · "))}">${plural(grp.length, "impactpunt", "impactpunten")}</span>` : `<span class="badge neutral">Weinig impact</span>`}
          <button class="btn small subtle" data-action="per-open" data-id="${pid}" aria-expanded="${open}">${icon(open ? "chevrondown" : "edit", "s")} ${open ? "Klaar" : "Bewerken"}</button><button class="btn small subtle" data-action="per-del" data-id="${pid}" title="Verwijderen" aria-label="Persona ${esc(p.name)} verwijderen">${icon("trash", "s")}</button></div>
        ${open ? `<div class="mt-1 vb-per-edit"><div class="grid grid-2">${F.text(`per:${p.id}:name`, "Naam", { render: true })}${F.text(`per:${p.id}:desc`, "Omschrijving", { render: true })}</div>
          ${grp.length ? `<div class="chip-list mb-1">${grp.map(chip).join("")}</div>` : ""}
          <div class="field-label">Raakt deze domeinen ${infoTip("Bepaalt welke keuzes van het ontwerpbord meetellen in de impact voor deze persona.")}</div><div class="chip-list mb-1">${rows.map((r) => `<button class="chip sm${(p.touch || []).includes(r.key) ? " on" : ""}" style="cursor:pointer" data-action="per-touch" data-id="${pid}" data-key="${esc(r.key)}" aria-pressed="${(p.touch || []).includes(r.key)}">${icon(r.icon, "s")}${esc(r.name)}</button>`).join("")}</div>
          ${F.select(`per:${p.id}:impact.level`, "Verwachte impact", CATALOG.friction.map((t, i) => [String(i), t]))}</div>` : ""}
        <details class="vb-mini mt-1" data-acc="ad-comms-${pid}"${hasComms ? " open" : ""}><summary>${icon(hasComms ? "check" : "mail", "s")} Communicatie${hasComms ? "" : `<span class="sr-only"> (nog leeg)</span>`}</summary>
          ${F.textarea(`per:${p.id}:comms`, "Wat verandert er & hoe communiceren we?", { rows: 2, ph: "Bijv. e-learning labelen, intranetbericht, instructie bij eerste policy tip…" })}</details></div>`;
    };
    const frictionLabels = ls.map((l) => ({ l, f: Mapping.friction(l) })).sort((a, b) => b.f - a.f);
    const lblTable = `<div class="table-wrap"><table class="table vb-fr-table"><thead><tr><th>Label · merkbaar voor de gebruiker</th><th>Impact</th></tr></thead><tbody>${frictionLabels.map(({ l, f }) => {
      const fl = Mapping.frictionLabel(f);
      const vis = rows.map((r) => Mapping.choice(l, r.key)).filter((c) => c && c.fr > 0).map((c) => c.title);
      return `<tr><td>${labelPill(l, st)}<div class="xs mt-1">${vis.length ? VH.clamp(`<span class="muted">${esc(vis.join(" · "))}</span>`, vis.join(" · ").length, 2, 90) : `<span class="muted">${AdoptUI.designed(l) ? "Niets merkbaars" : "Nog niet ontworpen"}</span>`}</div></td><td><span class="badge ${esc(fl.cls)}">${esc(fl.t)}</span></td></tr>`;
    }).join("")}</tbody></table></div>`;
    const miss = AdoptUI.missingSector(st);
    return `${this._bar("Hoeveel merkt elke doelgroep van het ontwerp? Beweeg over een cel voor de details.")}
      <h3 class="section-title">${icon("users", "s")} Impact per persona × label ${infoTip("Opgetelde impact van de keuzes op het ontwerpbord in de domeinen die de persona raakt. Leeg = niets merkbaar; donkerder = meer impact.")}</h3>
      <div class="card mb-2" style="padding:12px">${heat}</div>
      <div class="split wide-left vb-split">
        <div><div class="row between"><h3 class="section-title">${icon("user", "s")} Persona’s & communicatie</h3><div class="row tight">${miss.length ? `<button class="btn small subtle" data-action="per-sector" title="${esc(miss.map((p) => p.name).join(", "))}">${icon("plus", "s")} ${plural(miss.length, "sectorpersona", "sectorpersona’s")}</button>` : ""}<button class="btn small" data-action="per-add">${icon("plus", "s")} Persona</button></div></div>${pers.map(personaCard).join("")}</div>
        <div><h3 class="section-title">${icon("tag", "s")} Impact per label</h3>${lblTable}</div>
      </div>`;
  },

  tab_rollout(st) {
    let g = { dlpPolicies: [], autoPolicies: [] };
    try { g = Generator.all(st); } catch (e) { /* leeg ontwerp */ }
    const modeCount = (modes) => g.dlpPolicies.filter((p) => modes.includes(p.mode)).length + g.autoPolicies.filter((p) => modes.includes(p.mode === "enable" ? "enable" : "simulation")).length;
    const dateIn = (k, f, label) => { const id = `adp-${k}-${f}`, v = AdoptUI.phase(st, k)[f] || ""; return `<div class="field mb-0"><label for="${id}">${label}</label><input id="${id}" class="input" type="date" data-bind="st:adoption.phases.${esc(k)}.${f}" value="${esc(v)}"></div>`; };
    const phases = `<div class="vb-phases">${ADOPT_PHASES.map((ph) => {
      const pv = AdoptUI.phase(st, ph.key);
      const late = pv.due && pv.start && pv.due < pv.start;
      return `<div class="card flat vb-phase"><div class="row tight">${icon(ph.icon, "s")}<b>${esc(ph.title)}</b>${infoTip(ph.desc)}<span class="spacer"></span>${ph.modes.length ? `<span class="badge neutral" title="Policies in deze modus">${modeCount(ph.modes)}</span>` : ""}</div>
        ${F.text(`st:adoption.phases.${ph.key}.owner`, "Eigenaar", { ph: "Rol of naam" })}
        <div class="vb-phase-dates">${dateIn(ph.key, "start", "Start")}${dateIn(ph.key, "due", "Streefdatum")}</div>
        ${late ? `<div class="xs" style="color:var(--warn)">Streefdatum ligt vóór de start.</div>` : ""}</div>`;
    }).join("")}</div>`;
    const notesFilled = ADOPT_NOTES.filter(([k]) => String(((st.adoption || {}).notes || {})[k] || "").trim()).length;
    return `${this._bar("Plan de uitrol in fasen, met een eigenaar en datum per fase. De startdata komen ook in het communicatiepakket.")}
      <h3 class="section-title">${icon("route", "s")} Gefaseerde uitrol ${infoTip("Eigenaar en data per fase komen in het ontwerpdocument en de Excel-export.")}</h3>${phases}
      <div class="mt-2">${accordion("ad-notes", `${icon("edit", "s")} Afspraken <span class="xs muted">· ${notesFilled}/${ADOPT_NOTES.length} ingevuld</span>`, ADOPT_NOTES.map(([k, t]) => F.textarea(`st:adoption.notes.${k}`, t, { rows: 2 })).join(""), notesFilled > 0)}</div>
      <p class="small muted mt-1">${learn("dlpSimulation", "DLP-simulatiemodus")} ${learn("labelsGetStarted", "Aan de slag met sensitivity labels")}</p>`;
  },

  _docToggle(spec, label) { return `<span class="adp-doc-t">${F.toggle(spec, label, { invert: true })}</span>`; },

  tab_tree(st) {
    const Q = AdoptKit.questions(st);
    const how = `<ul class="small mb-0"><li>De hoofdlabels staan van laag naar hoog, in de volgorde van het classificatieschema.</li><li>Per overgang wordt een ja/nee-vraag gekozen op basis van de naam en beschrijving van het label (openbaar, intern, vertrouwelijk, strikt vertrouwelijk). Herkent de app het niveau niet, dan luidt de vraag “Is het gevoeliger dan …?”.</li><li>Beschrijving, voorbeelden en sublabels komen uit het schema. Pas ze daar aan om de spiekbrief te verbeteren.</li></ul>`;
    return `${this._bar(`Eén A4 voor iedere medewerker, met ${plural(Q.steps.length, "vraag", "vragen")} op basis van jullie labels.`, `${this._docToggle("st:adoption.doc.noTree", "In ontwerpdocument")}<button type="button" class="btn" data-action="adp-print" data-what="tree">${icon("printer", "s")} Afdrukken (A4)</button>`)}
      <div class="adp-sheet-wrap">${AdoptKit.treeHtml(st)}</div>
      <div class="mt-2">${accordion("adp-tree-how", `${icon("info", "s")} Hoe komen de vragen tot stand?`, how)}</div>`;
  },

  tab_cards(st, ls) {
    return `${this._bar(`Per label een kaart met voorbeelden en wat er gebeurt: ${plural(ls.length, "kaart", "kaarten")}, af te drukken op A4.`, `${this._docToggle("st:adoption.doc.noCards", "In ontwerpdocument")}<button type="button" class="btn" data-action="adp-print" data-what="cards">${icon("printer", "s")} Afdrukken (A4)</button>`)}
      ${AdoptKit.cardsHtml(st, { app: typeof Previews !== "undefined" })}
      <p class="xs muted mt-1">De voorbeelden komen uit de labelbeschrijving (‘informatie’) en de gekoppelde informatietypen. Kop- en voetteksten en watermerken zijn de markeringen uit de labelinstellingen.</p>`;
  },

  tab_comms(st) {
    const items = AdoptKit.comms(st);
    const ph = (st.adoption || {}).phases || {};
    const hasDates = ["prep", "sim", "tips", "enforce"].some((k) => ph[k] && ph[k].start);
    const words = (t) => String(t).split(/\s+/).filter(Boolean).length;
    const set = `<div class="card adp-cset"><h3 class="section-title">${icon("edit", "s")} Gegevens invullen</h3><p class="xs muted mt-0">Lege velden blijven als [placeholder] in de tekst staan.</p>
      ${F.text("st:adoption.comms.contact", "Contactpersoon", { render: true, ph: "Bijv. Anne Jansen, informatiebeveiliging" })}
      ${F.text("st:adoption.comms.desk", "Servicedesk", { render: true, ph: "Bijv. servicedesk@… of 020-…" })}
      ${F.text("st:adoption.comms.link", "Intranetpagina", { render: true, ph: "Bijv. intranet › Informatiebeveiliging" })}
      ${F.text("st:adoption.comms.sender", "Afzender aankondiging", { render: true, ph: "Bijv. Mark de Boer, directeur" })}
      ${hasDates ? "" : `<div class="adp-hint">${icon("clock", "s")}<span>Nog geen startdata. <button type="button" class="linklike" data-action="go" data-route="adoption" data-sub="rollout">Vul ze in bij Uitrol</button> om de planning in de teksten te zetten.</span></div>`}
      <div class="adp-cset-f">${F.toggle("st:adoption.doc.comms", "Opnemen in ontwerpdocument")}<button type="button" class="btn small" data-action="adp-dl" data-item="all">${icon("download", "s")} Alles als .txt</button></div></div>`;
    const list = items.map((x, i) => `<article class="card adp-comm"><header class="adp-comm-h"><span class="adp-comm-ic">${icon(x.icon)}</span><div class="adp-comm-t"><h3>${esc(x.title)}</h3><p class="xs muted">${esc(x.desc)}</p></div>
        <div class="adp-acts"><button type="button" class="btn small" data-action="adp-copy" data-item="${esc(x.key)}">${icon("copy", "s")} Kopieer</button><button type="button" class="btn small subtle" data-action="adp-dl" data-item="${esc(x.key)}">${icon("download", "s")} Download .txt</button></div></header>
        <details class="adp-more" data-acc="adp-comm-${esc(x.key)}"${i === 0 ? " open" : ""}><summary>Tekst bekijken <span class="xs muted">· ${words(x.body)} woorden</span></summary><pre class="adp-text" tabindex="0">${esc(x.body)}</pre></details></article>`).join("");
    return `${this._bar("Kant-en-klare teksten, gevuld met jullie labels, planning en afspraken. Kopieer ze of download ze als tekstbestand.")}
      <div class="adp-comms">${set}<div class="adp-comm-list">${list}</div></div>`;
  },

  tab_journey(st, ls) {
    const pers = st.personas || [];
    if (!pers.length) return emptyState("users", "Geen persona’s", "Voeg eerst persona’s toe op het tabblad Impact.", `<button class="btn primary" data-action="go" data-route="adoption" data-sub="impact">${icon("users", "s")} Naar Impact</button>`);
    const A = CATALOG.adoption, cur = pers.find((p) => p.id === UI.adpPer) || pers[0];
    const l = AdoptKit.personaLabel(cur, st);
    const hex = AdoptKit.hex(l.color), ex = AdoptKit.examples(l, st)[0] || "document";
    const chips = `<div class="adp-pers" role="group" aria-label="Kies een persona">${pers.map((p) => `<button type="button" class="adp-per${p === cur ? " on" : ""}" data-action="adp-per" data-id="${esc(p.id)}" aria-pressed="${p === cur}">${icon(p.icon || "user", "s")}<span>${esc(p.name)}</span></button>`).join("")}</div>`;
    const sel = `<label class="adp-psel"><span>Werkt vandaag met</span><select class="select" data-action="adp-per-label" data-id="${esc(cur.id)}">${ls.map((x) => `<option value="${esc(x.id)}"${x === l ? " selected" : ""}>${esc(labelFullName(x, st))}</option>`).join("")}</select></label>`;
    const pv = typeof Previews !== "undefined";
    const day = AdoptKit.moments(cur, st).map((m) => {
      const o = AdoptKit.outcome(m.key, l, st);
      return `<li class="adp-mom k-${o.k}" style="--lc:${hex}"><div class="adp-mom-art"><svg class="adp-scene" viewBox="0 0 160 100" aria-hidden="true" focusable="false">${A.scenes[m.scene] || ""}</svg><span class="adp-time">${esc(m.time)}</span></div>
        <div class="adp-mom-b"><h4>${esc(m.title)}</h4><p class="adp-does">${esc(m.does.replace("{doc}", ex))}</p><div class="adp-pv-lbl">${icon("shield", "s")} Wat Purview doet</div>${AdoptKit.fxList(o.lines)}
        ${pv ? `<button type="button" class="btn small subtle" data-action="pv-open" data-label="${esc(l.id)}" data-app="${esc(m.app)}">${icon("eye", "s")} Zo ziet het eruit</button>` : ""}</div></li>`;
    }).join("");
    return `${this._bar("Een werkdag met labels en DLP, per persona. Wat doet de medewerker – en wat doet Purview in jullie ontwerp?")}
      ${chips}
      <div class="card adp-phead" style="--lc:${hex}"><span class="adp-pav">${icon(cur.icon || "user")}</span><div class="adp-ph-t"><h3>Een dag van: ${esc(cur.name)}</h3>${cur.desc ? `<p class="small muted">${esc(cur.desc)}</p>` : ""}</div>${sel}</div>
      <ol class="adp-day">${day}</ol>`;
  },

  tab_quiz(st) {
    return `${this._bar("Test de kennis van eindgebruikers met vragen uit jullie eigen ontwerp. Geschikt voor de beamer en als train-de-trainer-demo.")}${AdoptKit.quizHtml(st)}`;
  },

  tab_kpi(st) {
    const ls = applicableLabels(st), s = AdoptKit.settings(st);
    const any = (d) => ls.some((l) => AdoptKit.rule(l, d, st));
    const rel = {
      downgrade: !!s.justification,
      dlp: ["exchange", "sharing", "teams"].some(any),
      autosim: ls.some((l) => (((l.cfg || {}).autolabel || {}).service || {}).enabled),
      copilot: any("copilot"),
      endpoint: any("endpoint"),
    };
    const cards = CATALOG.adoption.kpis.map((k) => {
      const r = rel[k.key];
      const badge = r === true ? `<span class="badge ok">${icon("check", "s")} In jullie ontwerp</span>` : r === false ? `<span class="badge neutral">Nog niet in het ontwerp</span>` : "";
      const links = (k.learn || []).map((x) => learn(x)).filter(Boolean).join(" ");
      return `<article class="card adp-kpi${r === false ? " off" : ""}"><header><span class="adp-kpi-ic">${icon(k.icon)}</span><h3>${esc(k.title)}</h3>${badge}</header>
        <div class="adp-target">${icon("target", "s")}<span><b>Streefwaarde</b> ${esc(k.target)}</span></div>
        <dl><dt>Waar</dt><dd>${esc(k.where)}</dd><dt>Hoe meet je dit?</dt><dd>${esc(k.how)}</dd></dl>${links ? `<div class="adp-kpi-l">${links}</div>` : ""}</article>`;
    }).join("");
    const rhythm = [["eye", "Simulatie (1–2 weken)", "Auto-labeling- en DLP-simulatie: klopt wat er matcht? Stel drempels bij vóór het inschakelen."], ["chart", "Eerste 3 maanden: maandelijks", "Labelgebruik, verlagingen met reden, DLP-overrides en tickets bespreken met de key-users."], ["redo", "Daarna: per kwartaal", "Trends volgen, beschrijvingen en policy tips verbeteren, spiekbrief bijwerken."]];
    return `${this._bar("Zo zie je in Microsoft Purview of labels en DLP worden gebruikt. Spreek streefwaarden af en meet ze vast.")}
      <ol class="adp-rhythm">${rhythm.map(([ic, t, d], i) => `<li><span class="adp-rn">${i + 1}</span><div><b>${icon(ic, "s")} ${esc(t)}</b><span>${esc(d)}</span></div></li>`).join("")}</ol>
      <div class="adp-kpis">${cards}</div>
      ${msg("info", `Activity explorer en Data explorer gebruiken gegevens uit <b>Audit</b>: zet auditing aan vóór de livegang. Activity explorer toont maximaal 30 dagen; leg trends daarom maandelijks vast. ${learn("audit", "Microsoft Purview Audit")}`)}`;
  },
});
