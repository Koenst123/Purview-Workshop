/* Leer Purview kennen (#academy): leerlijnen, modules met hoofdstukken, oefeningen, quiz en begrippenlijst.
   Alleen vaste leerkeuzes worden via Learning bewaard; ingevoerde oefentekst blijft in het geheugen.
   Catalogustekst gaat via Site.rich() of esc(); elke actie valideert haar invoer tegen de catalogus. */

const AC = {
  done: {}, quiz: {}, read: {}, practical: {}, path: "", query: "", gq: "", gcat: "",
  w: {
    map: "ip", sit: null,
    label: { id: "vertrouwelijk", mark: true, wm: false, enc: true },
    autolabel: { where: "new", sure: "high" },
    dlp: { loc: "exchange", act: "override", tip: true, mode: "on" },
    endpoint: { act: "usb", action: "override" },
    copilot: { label: "strikt", dlp: true, extract: true, prompt: false, promptRule: true },
    triage: {}, phase: 0,
  },
};

const AC_CHOICES = {
  "dlp.loc": [["exchange", "E-mail (Exchange)", "mail"], ["spo", "SharePoint en OneDrive", "share"], ["teams", "Teams-chats", "teams"], ["devices", "Apparaten (Endpoint)", "laptop"]],
  "dlp.act": [["audit", "Alleen vastleggen", "eye"], ["override", "Toegestane uitzondering", "warning"], ["block", "Tegenhouden", "xcircle"]],
  "dlp.mode": [["sim", "Simulatie", "flask"], ["simtips", "Simulatie met policy tips", "bulb"], ["on", "Aan", "play"]],
  "autolabel.where": [["new", "In een document of e-mail waaraan iemand werkt", "edit"], ["rest", "In bestaande bestanden in SharePoint of OneDrive", "folder"], ["mail", "In e-mail die wordt verzonden of ontvangen", "mail"]],
  "autolabel.sure": [["high", "Ja, de herkenning is betrouwbaar", "checkcircle"], ["unsure", "Nee, er kunnen fout-positieven zijn", "question"]],
  "endpoint.action": [["audit", "Alleen vastleggen", "eye"], ["override", "Toegestane uitzondering", "warning"], ["block", "Tegenhouden", "xcircle"]],
  "copilot.label": [["intern", "Intern"], ["vertrouwelijk", "Vertrouwelijk"], ["strikt", "Strikt vertrouwelijk"]],
};
const AC_TOGGLES = ["label.mark", "label.wm", "label.enc", "dlp.tip", "copilot.dlp", "copilot.extract", "copilot.prompt", "copilot.promptRule"];
const AC_DEFAULT_W = JSON.parse(JSON.stringify(AC.w));
function acNormalize(raw) {
  const o = isPlainObj(raw) ? raw : {}, data = { done: {}, quiz: {}, read: {}, practical: {}, path: "", w: JSON.parse(JSON.stringify(AC_DEFAULT_W)) };
  const own = (obj, key) => isPlainObj(obj) && Object.hasOwn(obj, key) ? obj[key] : undefined;
  for (const m of CATALOG.academy.modules) {
    const answers = own(o.quiz, m.id);
    if (isPlainObj(answers)) {
      data.quiz[m.id] = {};
      m.quiz.forEach((q, i) => { const n = own(answers, String(i)); if (Number.isInteger(n) && n >= 0 && n < q.options.length) data.quiz[m.id][i] = n; });
    }
    if (own(o.done, m.id) === true) data.done[m.id] = true;
    const seen = own(o.read, m.id), steps = m.chapters.map((_, i) => "c" + (i + 1)).concat(["practice", "quiz", "sources"]);
    if (Array.isArray(seen)) data.read[m.id] = steps.filter((s) => seen.includes(s));
  }
  for (const c of CATALOG.academy.practiceCards) {
    for (const mid of c.modules) {
      const key = mid + ":" + c.id, n = own(o.practical, key);
      if (Number.isInteger(n) && n >= 0 && n < c.options.length) data.practical[key] = n;
    }
  }
  if (CATALOG.academy.paths.some((p) => p.id === o.path)) data.path = o.path;
  for (const [key, choices] of Object.entries(AC_CHOICES)) {
    const [group, field] = key.split("."), value = own(own(o.w, group), field);
    if (choices.some(([id]) => id === value)) data.w[group][field] = value;
  }
  for (const key of AC_TOGGLES) {
    const [group, field] = key.split("."), value = own(own(o.w, group), field);
    if (typeof value === "boolean") data.w[group][field] = value;
  }
  const label = own(own(o.w, "label"), "id");
  if (CATALOG.academy.widgets.labels.some((x) => x.id === label)) data.w.label.id = label;
  const act = own(own(o.w, "endpoint"), "act");
  if (CATALOG.academy.widgets.endpointActs.some((x) => x.id === act)) data.w.endpoint.act = act;
  const map = own(o.w, "map");
  if (CATALOG.academy.widgets.map.some((f) => f.items.some((x) => x.id === map))) data.w.map = map;
  const phase = own(o.w, "phase");
  if (Number.isInteger(phase) && phase >= 0 && phase < CATALOG.academy.widgets.roadmap.length) data.w.phase = phase;
  for (const t of CATALOG.academy.widgets.triage) {
    const v = own(own(o.w, "triage"), t.id);
    if (Number.isInteger(v) && v >= 0 && v < t.options.length) data.w.triage[t.id] = v;
  }
  return data;
}
// Verhoog de versie wanneer de betekenis of volgorde van bestaande vragen/stappen verandert.
Object.assign(AC, Learning.register("academy", { version: 1, normalize: acNormalize, reset: () => Object.assign(AC, acNormalize({}), { query: "", gq: "", gcat: "" }) }));
function acSave() {
  const { sit, ...w } = AC.w;
  return Learning.save("academy", { done: AC.done, quiz: AC.quiz, read: AC.read, practical: AC.practical, path: AC.path, w });
}

const AC_WIDGETS = {
  map: ["grid", "Oplossingskaart", "Klik op een oplossing en lees wat die doet. De roze oplossingen komen in deze lessen aan bod."],
  sit: ["fingerprint", "Wat wordt herkend?", "Probeer een verzonnen voorbeeld en zie waarom een nummer soms wel en soms niet wordt herkend."],
  label: ["tag", "Labelstudio", "Kies een label en zet instellingen aan of uit. Rechts zie je wat de medewerker in Word ziet."],
  autolabel: ["wand", "Keuzehulp automatisch labelen", "Beantwoord twee vragen en zie welke vorm van automatisch labelen past."],
  dlp: ["shield", "Wat merkt je collega?", "Verander de voorbeeldafspraken en vergelijk wat de medewerker ziet."],
  endpoint: ["laptop", "Endpoint-simulator", "Kies een activiteit en een actie en zie de melding op het apparaat."],
  copilot: ["sparkle", "Copilot-lab", "Zet instellingen aan of uit en zie wat Microsoft 365 Copilot antwoordt."],
  triage: ["bell", "Een melding beoordelen", "Kies bij drie signalen een passende vervolgstap."],
  roadmap: ["route", "Uitrolplanner", "Klik door de vijf fasen van een Purview-uitrol."],
};

/* ---------- Vereenvoudigde detector voor informatietypen (illustratief) ---------- */
const AC_SIT = {
  BSN_KEYS: ["bsn", "bsn#", "burgerservicenummer", "sofinummer", "sofi", "persoonsnummer", "persoonlijk nummer", "citizen service number", "persoonsgebonden", "uniek identificatienummer"],
  CC_KEYS: ["credit card", "creditcard", "visa", "mastercard", "amex", "american express", "card number", "cvv2", "cvc2", "security code", "expiration date", "exp date", "debit card"],
  CC_TEST: ["4111111111111111", "4012888888881881", "4222222222222", "4242424242424242", "5555555555554444", "5105105105105100", "5200828282828210", "378282246310005", "371449635398431", "6011111111111117", "6011000990139424", "30569309025904", "38520000023237", "3530111333300000"],
  MAX: 2000,
  near(text, start, end) { return text.slice(Math.max(0, start - 300), end + 300).toLowerCase(); },
  hasKey(win, keys) {
    return keys.some((k) => {
      for (let i = win.indexOf(k); i >= 0; i = win.indexOf(k, i + k.length)) {
        const before = i ? win.charAt(i - 1) : " ", after = win.charAt(i + k.length) || " ";
        if (!/[\p{L}\p{N}]/u.test(before) && (k.endsWith("#") || !/[\p{L}\p{N}]/u.test(after))) return true;
      }
      return false;
    });
  },
  elfProef(d) {
    const s = d.length === 8 ? "0" + d : d;
    if (!/^\d{9}$/.test(s) || /^0+$/.test(s)) return false;
    let sum = 0;
    for (let i = 0; i < 8; i++) sum += Number(s[i]) * (9 - i);
    return (sum - Number(s[8])) % 11 === 0;
  },
  mod97(iban) {
    const r = iban.slice(4) + iban.slice(0, 4);
    let m = 0;
    for (const ch of r) {
      const v = /[A-Z]/.test(ch) ? String(ch.charCodeAt(0) - 55) : ch;
      for (const c of v) m = (m * 10 + Number(c)) % 97;
    }
    return m === 1;
  },
  luhn(d) {
    let sum = 0;
    for (let i = 0; i < d.length; i++) {
      let n = Number(d[d.length - 1 - i]);
      if (i % 2) { n *= 2; if (n > 9) n -= 9; }
      sum += n;
    }
    return sum % 10 === 0;
  },
  scan(raw) {
    const text = String(raw || "").slice(0, this.MAX), hits = [], taken = [];
    const free = (s, e) => !taken.some(([a, b]) => s < b && e > a);
    for (const m of text.matchAll(/(?<![A-Z0-9])([A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,3})?)(?![A-Z0-9])/g)) {
      const v = m[1].replace(/ /g, "");
      if (v.length < 15 || v.length > 34) continue;
      const ok = this.mod97(v);
      taken.push([m.index, m.index + m[0].length]);
      hits.push({ at: m.index, name: "International banking account number (IBAN)", value: m[1], conf: ok ? 85 : 0, status: ok ? "match" : "nomatch",
        ev: [["Patroon", true], ["Checksum (mod-97)", ok]], note: ok ? "Patroon en checksum kloppen; een trefwoord is niet nodig." : "Het patroon lijkt op een IBAN, maar de checksum klopt niet." });
    }
    for (const m of text.matchAll(/(?<!\d)(\d(?:[ -]?\d){13,18})(?!\d)/g)) {
      const d = m[1].replace(/[ -]/g, ""), s = m.index, e = s + m[0].length;
      if (d.length < 14 || d.length > 19 || !free(s, e)) continue;
      taken.push([s, e]);
      const ok = this.luhn(d);
      if (this.CC_TEST.includes(d)) {
        hits.push({ at: s, name: "Credit card number", value: m[1], conf: 0, status: "test", ev: [["Patroon", true], ["Luhn-controle", ok]],
          note: "Dit is een bekend testnummer. Purview markeert gereserveerde testnummers niet." });
        continue;
      }
      const win = this.near(text, s, e), key = this.hasKey(win, this.CC_KEYS), date = /(?<!\d)(0[1-9]|1[0-2]) ?[/-] ?(\d{4}|\d{2})(?!\d)/.test(win);
      const conf = !ok ? 0 : key || date ? 85 : 65;
      hits.push({ at: s, name: "Credit card number", value: m[1], conf, status: ok ? "match" : "nomatch",
        ev: [["Patroon", true], ["Luhn-controle", ok], ["Trefwoord of vervaldatum", key || date]],
        note: !ok ? "De Luhn-controle faalt; dit is geen geldig kaartnummer." : conf === 85 ? "Luhn klopt en er staat een trefwoord of vervaldatum in de buurt." : "Alleen de Luhn-controle klopt: lage zekerheid." });
    }
    for (const m of text.matchAll(/(?<!\d)(\d{3} ?\d{3} ?\d{2,3})(?!\d)/g)) {
      const d = m[1].replace(/ /g, ""), s = m.index, e = s + m[0].length;
      if (!free(s, e)) continue;
      const sum = this.elfProef(d), key = this.hasKey(this.near(text, s, e), this.BSN_KEYS), ok = sum && key;
      hits.push({ at: s, name: "Netherlands citizen's service (BSN) number", value: m[1], conf: ok ? 85 : 0, status: ok ? "match" : "nomatch",
        ev: [["Patroon (8-9 cijfers)", true], ["Checksum (11-proef)", sum], ["Trefwoord binnen 300 tekens", key]],
        note: ok ? "Patroon, checksum en trefwoord kloppen: hoge zekerheid." : !sum ? "De 11-proef faalt; dit is geen geldig BSN." : "Patroon en checksum kloppen, maar zonder trefwoord zoals ‘BSN’ telt dit niet als match." });
    }
    return hits.sort((a, b) => a.at - b.at).slice(0, 20);
  },
};

/* ---------- Widgets ---------- */
const ACW = {
  get W() { return CATALOG.academy.widgets; },
  allowed(key) {
    if (key === "label.id") return this.W.labels.map((l) => l.id);
    if (key === "endpoint.act") return this.W.endpointActs.map((a) => a.id);
    return Object.hasOwn(AC_CHOICES, key) ? AC_CHOICES[key].map((c) => c[0]) : null;
  },
  label(id) { return this.W.labels.find((l) => l.id === id) || this.W.labels[2]; },
  dot(l) { return `<span class="s-pill"><i style="--c:${Site.hex(l.color)}"></i>${esc(l.name)}</span>`; },
  opt(key, val, html, on, extra = "") {
    return `<button type="button" class="a-opt" data-action="ac-set" data-key="${esc(key)}" data-value="${esc(val)}" aria-pressed="${!!on}"${extra}>${html}</button>`;
  },
  opts(key, cur, row) {
    const html = AC_CHOICES[key].map(([v, t, ic]) => this.opt(key, v, `${ic ? icon(ic, "s") : ""}<span>${esc(t)}</span>`, v === cur)).join("");
    return row ? `<div class="a-optrow">${html}</div>` : html;
  },
  sw(key, text, on, disabled = false, hint = "") {
    return `<button type="button" class="a-opt" role="switch" data-action="ac-toggle" data-key="${esc(key)}" aria-checked="${!!on}"${disabled ? " disabled" : ""}><span class="sw" aria-hidden="true"></span><span>${esc(text)}${hint ? `<small class="s-muted"> · ${esc(hint)}</small>` : ""}</span></button>`;
  },
  set(legend, inner) { return `<fieldset><legend>${esc(legend)}</legend>${inner}</fieldset>`; },
  /** Punten in de vorm "Begrip: uitleg" worden kernkaarten; overige punten blijven een checklist. */
  keys(items) {
    const re = /^\*{0,2}([^:*]{2,32})\*{0,2}:\s+(.+)$/s;
    const rows = (items || []).filter(Boolean).map((t) => [t, re.exec(t)]);
    const ks = rows.filter(([, m]) => m);
    if (ks.length < 2) return this.check(items);
    const rest = rows.filter(([, m]) => !m).map(([t]) => t);
    return `<ul class="a-keys">${ks.map(([, m]) => `<li><b>${esc(m[1])}</b><span>${Site.rich(m[2])}</span></li>`).join("")}</ul>${rest.length ? this.check(rest) : ""}`;
  },
  check(items) { return `<ul class="s-check">${items.filter(Boolean).map((t) => `<li>${icon("check", "s")}<span>${Site.rich(t)}</span></li>`).join("")}</ul>`; },
  explain(title, badge, items, extra = "") {
    return `<div class="a-explain"><div class="a-hit-top"><b>${esc(title)}</b>${badge || ""}</div>${this.check(items)}${extra}</div>`;
  },
  wrap(kind, body, one) {
    const h = AC_WIDGETS[kind] || ["wand", "Oefening", ""];
    return `<div class="a-widget"><div class="a-widget-head"><span class="s-ico">${icon(h[0])}</span><div><h3>${esc(h[1])}</h3><p>${esc(h[2])}</p></div></div><div class="a-widget-body${one ? " one" : ""}">${body}</div></div>`;
  },
  render(kind) {
    const fn = Object.hasOwn(this, "w_" + kind) ? this["w_" + kind] : null;
    if (typeof fn !== "function") return "";
    try { return fn.call(this); } catch (e) { console.error(e); return `<p class="s-note warn">${icon("warning", "s")}<span>Deze oefening kon niet worden geladen.</span></p>`; }
  },

  w_map() {
    const fams = this.W.map, all = fams.flatMap((f) => f.items.map((it) => ({ ...it, fam: f.title })));
    const cur = all.find((x) => x.id === AC.w.map) || all[0];
    const grid = `<div class="a-map">${fams.map((f) => `<div class="a-fam"><h4>${esc(f.title)}</h4>${f.items.map((it) => `<button type="button" class="a-opt${it.hub ? " hub" : ""}" data-action="ac-map" data-id="${esc(it.id)}" aria-pressed="${it.id === cur.id}"><span>${esc(it.name)}</span>${it.hub ? `<span class="s-chip pink">In de lessen</span>` : ""}</button>`).join("")}</div>`).join("")}</div>`;
    const go = cur.hub ? Site.a("academy", cur.id === "dlp" ? "dlp" : "labels", `Naar de module over ${esc(cur.name)} ${icon("chevronright", "s")}`) : `<span class="s-small s-muted">Deze oplossing valt buiten deze lessen.</span>`;
    return this.wrap("map", `${grid}<div class="a-explain" aria-live="polite"><div class="a-hit-top"><b>${esc(cur.name)}</b><span class="s-badge info">${esc(cur.fam)}</span></div><p>${esc(cur.text)}</p>${go}</div>`, true);
  },

  sitText() { return AC.w.sit == null ? this.W.sitSamples[0].text : AC.w.sit; },
  sitOut(text) {
    if (!String(text || "").trim()) return `<p class="a-gloss-empty">Typ of plak tekst, of kies een voorbeeld.</p>`;
    const hits = AC_SIT.scan(text);
    if (!hits.length) return `<p class="s-note">${icon("info", "s")}<span>Geen kandidaten gevonden. Probeer een BSN, IBAN of creditcardnummer.</span></p>`;
    const n = hits.filter((h) => h.status === "match").length;
    const badge = (h) => h.status === "match" ? `<span class="s-badge ok">Herkend in dit voorbeeld</span>`
      : h.status === "test" ? `<span class="s-badge info">Bekend testnummer</span>` : `<span class="s-badge err">Niet herkend</span>`;
    return `<p class="s-small"><b>${n} van ${hits.length}</b> nummerpatronen worden in deze oefening herkend. Geen herkenning betekent niet dat tekst onschuldig is.</p><ul class="a-hits">${hits.map((h) => `<li class="a-hit">
      <div class="a-hit-top"><b>${esc(h.name)}</b>${badge(h)}</div>
      <span class="a-sample-value">${esc(h.value)}</span>
      <div class="a-ev">${h.ev.map(([t, ok]) => `<span class="${ok ? "y" : "n"}">${icon(ok ? "check" : "x", "s")} ${esc(/checksum|elfproef|luhn/i.test(t) ? "Controle van het nummer" : /trefwoord/i.test(t) ? "Helpende woorden in de buurt" : t)}</span>`).join("")}</div>
      <p class="s-small s-muted">${h.status === "match" ? "De aanwijzingen passen bij dit soort gegeven." : h.status === "test" ? "Dit bekende testnummer is bewust uitgesloten." : "Niet alle vereiste aanwijzingen zijn aanwezig. Beoordeel zelf of de informatie gevoelig is."}</p></li>`).join("")}</ul>`;
  },
  w_sit() {
    const text = this.sitText();
    const samples = this.W.sitSamples.map((s) => `<button type="button" class="a-opt" data-action="ac-sample" data-id="${esc(s.id)}" aria-pressed="${text === s.text}">${esc(s.name)}</button>`).join("");
    const ctl = `<div class="a-ctl">${this.set("Kies een voorbeeld", `<div class="a-optrow">${samples}</div>`)}
      <div><label class="a-ctl-l" for="a-sit-text"><b>Tekst</b></label><textarea id="a-sit-text" class="a-sit-text" data-live="ac-sit" maxlength="${AC_SIT.MAX}" spellcheck="false">${esc(text)}</textarea></div>
      <p class="s-small s-muted">${icon("info", "s")} Vereenvoudigde detector. Purview gebruikt meer patronen, trefwoorden en talen. Gebruik hier geen echte persoonsgegevens; de tekst blijft in je browser.</p></div>`;
    return this.wrap("sit", `${ctl}<div class="a-out" id="a-sit-out" aria-live="polite">${this.sitOut(text)}</div>`);
  },

  w_label() {
    const st = AC.w.label, l = this.label(st.id), c = Site.hex(l.color);
    const mark = l.mark || l.name.toUpperCase();
    const ctl = `<div class="a-ctl">${this.set("Kies een label", this.W.labels.map((x) => this.opt("label.id", x.id, this.dot(x), x.id === l.id)).join(""))}
      ${this.set("Instellingen van dit label", this.sw("label.mark", "Koptekst en voettekst", st.mark) + this.sw("label.wm", "Watermerk", st.wm) + this.sw("label.enc", "Versleuteling", st.enc))}</div>`;
    const who = st.enc ? (l.enc ? l.who : "Alleen medewerkers van Noordhaven kunnen het bestand openen.") : "";
    const doc = `<div class="a-doc" style="--c:${c}">
      <div class="a-doc-bar">${msLogo("word")}<span>Personeelsdossier P. de Vries.docx</span>${this.dot(l)}</div>
      ${st.enc ? `<div class="a-doc-lock">${icon("lock", "s")}<span>Beperkte toegang · ${esc(who)}</span></div>` : ""}
      <div class="a-doc-page">${st.mark ? `<div class="a-doc-hf">${esc(mark)}</div>` : ""}${st.wm ? `<div class="a-doc-wm" aria-hidden="true">${esc(mark)}</div>` : ""}
        <div class="h-line t"></div><div class="h-line"></div><div class="h-line m"></div><div class="h-line"></div><div class="h-line s"></div><div class="h-line m"></div>
        ${st.mark ? `<div class="a-doc-hf foot">${esc(mark)}</div>` : ""}</div></div>`;
    const ex = this.explain("Wat doet dit label?", "", [
      `Het label **${l.name}** staat in de titelbalk van Word en reist mee met het bestand.`,
      st.mark ? `Koptekst en voettekst ‘${mark}’ maken de status zichtbaar, ook op papier.` : "Geen koptekst of voettekst.",
      st.wm ? "Een watermerk staat op elke pagina." : "",
      st.enc ? `**Versleuteling**: ${who} De bescherming blijft, ook als het bestand wordt doorgestuurd.` : "**Geen versleuteling door dit label**: bestaande toegangsrechten blijven gelden, maar dit label beschermt een doorgestuurde kopie niet.",
      "Een label met een lagere prioriteit kiezen kan om een reden vragen, als het labelbeleid dat vereist.",
    ]);
    return this.wrap("label", `${ctl}<div class="a-out">${doc}${ex}</div>`);
  },

  w_autolabel() {
    const st = AC.w.autolabel, L = this.label("vertrouwelijk");
    const ctx = { file: "Verzuimoverzicht 2025.docx", labelName: L.name, labelColor: L.color };
    const ctl = `<div class="a-ctl">${this.set("1. Waar staat de gevoelige informatie?", this.opts("autolabel.where", st.where))}${this.set("2. Is de herkenning betrouwbaar genoeg?", this.opts("autolabel.sure", st.sure))}</div>`;
    const warn = st.sure === "unsure" ? `<p class="s-note warn">${icon("warning", "s")}<span>Automatisch labelen op de achtergrond kan geen voorstel laten beoordelen. Test langer of laat medewerkers een aanbeveling in de Office-apps controleren.</span></p>` : "";
    let out, ex;
    if (st.where === "new") {
      const auto = st.sure === "high";
      out = Site.device(ctx.file, Previews.notice("recommend", "office", { ...ctx, auto }), "Word");
      ex = this.explain(auto ? "Tijdens het werk: automatisch toepassen" : "Tijdens het werk: een voorstel", `<span class="s-badge info">Office-apps</span>`, [
        "De organisatie bepaalt wanneer een voorstel verschijnt of een label wordt toegepast.",
        "Werkt in Word, Excel, PowerPoint en Outlook terwijl de medewerker werkt.",
        auto ? "Het label wordt toegepast zodra de informatie wordt herkend; de medewerker ziet een melding." : "De medewerker ziet een aanbeveling en beslist zelf. **Dat kan in de Office-apps, niet bij labelen op de achtergrond.**",
        "Herkent informatietypen (SIT's) of trainable classifiers.",
      ]);
    } else if (st.where === "rest") {
      out = `<div class="x-portal"><div class="x-portal-bar">${msLogo("purview")} Microsoft Purview · Auto-labeling<small>Voorbeeld</small></div><ul class="x-alerts">
        <li class="x-alert" data-sev="low"><i aria-hidden="true"></i><span><b>Beleid ‘BSN in HR-sites → ${esc(L.name)}’</b><small>SharePoint en OneDrive · simulatie voltooid</small></span><span class="s-badge info">Simulatie</span></li>
        <li class="x-alert" data-sev="medium"><i aria-hidden="true"></i><span><b>1.284 bestanden komen in aanmerking</b><small>Bekijk een steekproef voordat je het beleid aanzet</small></span><span class="s-badge warn">Controleren</span></li>
        <li class="x-alert" data-sev="low"><i aria-hidden="true"></i><span><b>Daarna: label op bestaande bestanden</b><small>Ook op bestanden die niemand opent</small></span><span class="s-badge ok">Na aanzetten</span></li></ul></div>`;
      ex = this.explain("Op de achtergrond labelen", `<span class="s-badge info">SharePoint en OneDrive</span>`, [
        "Labelt bestaande bestanden in SharePoint en OneDrive, ook als niemand ze opent.",
        "Begin in **simulatie** en bekijk een steekproef voordat je het beleid aanzet.",
        "Overschrijft geen label dat een medewerker zelf koos.",
        "Het verwerken van veel bestanden verloopt geleidelijk.",
      ], warn);
    } else {
      out = Previews.sceneMail({ from: "Sanne Visser", subj: "Verzuimoverzicht 2025", body: "Hierbij het overzicht met de BSN's van het team.", attach: "Verzuimoverzicht 2025.xlsx", pillHtml: Site.pill(L.name, L.color), foot: "inbox" });
      ex = this.explain("E-mail labelen op de achtergrond", `<span class="s-badge info">E-mail</span>`, [
        "De e-maildienst kan een label aanbrengen bij het verzenden en ontvangen.",
        "De verzender merkt niets tijdens het schrijven; de ontvanger ziet het label.",
        "Optioneel: een handmatig gekozen label met een lagere prioriteit vervangen.",
        "Begin in **simulatie** en bekijk de resultaten.",
      ], warn);
    }
    return this.wrap("autolabel", `${ctl}<div class="a-out">${out}${ex}</div>`);
  },

  w_dlp() {
    const d = AC.w.dlp, app = { exchange: "outlook", spo: "spo", teams: "teams", devices: "endpoint" }[d.loc] || "outlook";
    const tip = d.act === "override" ? true : d.tip;
    const ctx = { file: "Salarisoverzicht maart.xlsx", to: "partner@extern.nl", subject: "Salarisoverzicht maart", message: "Het BSN van Peter is 111222333.", activity: "Kopiëren naar USB", ruleName: "BSN naar buiten Noordhaven", justification: "required" };
    const quiet = (t) => app === "outlook" ? Previews.quiet("outlook", ctx, t) : app === "endpoint" ? Previews.sceneToast({ level: "none", note: t }) : Previews.sceneNone(t);
    let out, feel;
    if (d.mode === "sim") { out = quiet("Simulatie: de medewerker merkt niets. Purview legt de matches vast in het simulatieoverzicht."); feel = "Niets. Je ziet in de portal hoe vaak de regel zou afgaan."; }
    else if (d.mode === "simtips") {
      if (app === "endpoint") { out = quiet("Simulatie: de actie gaat door. Controleer in de portal welke meldingen apparaten in simulatie tonen."); feel = "Niets dat de actie tegenhoudt. Test meldingen op apparaten eerst met een pilotgroep."; }
      else if (tip) { out = Previews.notice("tip", app, ctx); feel = "Een policy tip, maar niets wordt tegengehouden. Zo leert de medewerker de regel kennen."; }
      else { out = quiet("Policy tips staan uit: in simulatie merkt de medewerker dan niets."); feel = "Niets. Zet policy tips aan om de medewerker al te laten wennen."; }
    } else if (d.act === "audit") {
      if (app === "endpoint") { out = Previews.sceneToast({ level: "audit" }); feel = "Niets: de actie gaat door en wordt vastgelegd."; }
      else if (tip) { out = Previews.notice("tip", app, ctx); feel = "Een policy tip. De actie gaat door en wordt vastgelegd."; }
      else { out = quiet("Geen melding: de actie gaat door en wordt alleen vastgelegd."); feel = "Niets: de actie gaat door en wordt vastgelegd."; }
    } else {
      out = Previews.notice(d.act === "block" ? "block" : "override", app, ctx);
      feel = d.act === "block" ? (tip ? "Een blokkade met uitleg. De medewerker kan niet verder." : "Een blokkade, maar zonder policy tip vooraf. Dat voelt willekeurig; zet meldingen aan.")
        : "Een waarschuwing. De medewerker kan doorgaan met een zakelijke reden; die reden wordt vastgelegd.";
    }
    const locName = AC_CHOICES["dlp.loc"].find((c) => c[0] === d.loc)[1];
    const actName = AC_CHOICES["dlp.act"].find((c) => c[0] === d.act)[1];
    const modeName = AC_CHOICES["dlp.mode"].find((c) => c[0] === d.mode)[1];
    const ctl = `<div class="a-ctl">${this.set("1. Waar geldt de regel?", this.opts("dlp.loc", d.loc))}
      ${this.set("2. Wat gebeurt er bij een match?", this.opts("dlp.act", d.act, true))}
      ${this.set("3. Melding aan de medewerker", this.sw("dlp.tip", app === "endpoint" ? "Melding op het apparaat" : "Policy tip tonen", tip, d.act === "override", d.act === "override" ? "nodig om te kunnen overschrijven" : ""))}
      ${this.set("4. Modus", this.opts("dlp.mode", d.mode, true))}</div>`;
    const ex = this.explain("Jouw regel", `<span class="s-badge ${d.mode === "on" ? "ok" : "info"}">${esc(modeName)}</span>`, [
      `**Locatie**: ${locName}`,
      `**Voorwaarde**: inhoud bevat een Netherlands citizen's service (BSN) number ${d.loc === "devices" ? "en wordt naar een USB-apparaat gekopieerd" : "en wordt gedeeld met personen buiten Noordhaven"}`,
      `**Actie**: ${actName}${tip ? ", met melding" : ", zonder melding"}`,
      `**Wat merkt de medewerker?** ${feel}`,
    ]);
    const head = { outlook: "Outlook", spo: "SharePoint", teams: "Teams", endpoint: "Windows" }[app];
    return this.wrap("dlp", `${ctl}<div class="a-out">${Site.device(head, out, "DLP")}${ex}</div>`);
  },

  w_endpoint() {
    const st = AC.w.endpoint, acts = this.W.endpointActs, a = acts.find((x) => x.id === st.act) || acts[0];
    const lv = { audit: "audit", override: "warn", block: "block" }[st.action] || "warn";
    const ctl = `<div class="a-ctl">${this.set("1. Wat doet de medewerker?", acts.map((x) => this.opt("endpoint.act", x.id, `${icon(x.icon, "s")}<span>${esc(x.name)}</span>`, x.id === a.id)).join(""))}
      ${this.set("2. Welke actie staat in de regel?", this.opts("endpoint.action", st.action, true))}</div>`;
    const feel = { audit: "De actie gaat door. Purview legt de gebeurtenis vast, zodat je die in Activity explorer ziet.", warn: "De medewerker ziet een melding en kan doorgaan met een reden. Ook dat wordt vastgelegd.", block: "De actie wordt tegengehouden en de medewerker ziet waarom." }[lv];
    const ex = this.explain(`${a.name}: ${AC_CHOICES["endpoint.action"].find((c) => c[0] === st.action)[1]}`, `<span class="s-badge ${lv === "block" ? "err" : lv === "warn" ? "warn" : "info"}">Endpoint DLP</span>`, [
      feel,
      "Het apparaat moet door de organisatie zijn aangesloten voor deze bescherming.",
      "Een afspraak kan een activiteit ook uitdrukkelijk toestaan.",
      "De mogelijkheden verschillen per apparaat en browser. Probeer het eerst met een kleine groep.",
    ]);
    return this.wrap("endpoint", `${ctl}<div class="a-out">${Site.device(a.file, Previews.sceneToast({ level: lv, act: a.name, file: a.file }), "Windows")}${ex}</div>`);
  },

  w_copilot() {
    const c = AC.w.copilot, L = this.label(c.label), enc = !!L.enc;
    const file = "Personeelsdossier P. de Vries.docx";
    const prompt = c.prompt ? "Vat het dossier van Peter de Vries samen. Zijn BSN is 111222333." : "Vat het dossier van Peter de Vries samen.";
    let kind, why;
    if (c.prompt && c.promptRule) { kind = "promptBlocked"; why = "De DLP-regel herkent een BSN in de prompt. Copilot geeft geen antwoord en gebruikt de prompt niet om te zoeken. Deze mogelijkheid is in **preview**."; }
    else if (c.dlp && c.label === "strikt") { kind = "excluded"; why = "De voorbeeldregel sluit ‘Strikt vertrouwelijk’ uit van verwerking. Het bestand kan als bron zichtbaar zijn, maar Copilot gebruikt de inhoud niet."; }
    else if (enc && !c.extract) { kind = "noextract"; why = "De medewerker mag het versleutelde bestand wel lezen, maar de inhoud niet overnemen. Daardoor kan Copilot het niet samenvatten."; }
    else { kind = "ok"; why = `Copilot gebruikt het bestand. Het antwoord toont het label **${L.name}**: het label met de hoogste prioriteit van de gebruikte bronnen.${c.dlp && c.label !== "strikt" ? " De DLP-regel geldt alleen voor ‘Strikt vertrouwelijk’." : ""}${c.prompt ? " Let op: de prompt met het BSN is niet tegengehouden." : ""}`; }
    const ctl = `<div class="a-ctl">${this.set("Label van het dossier", AC_CHOICES["copilot.label"].map(([v]) => this.opt("copilot.label", v, this.dot(this.label(v)), v === c.label)).join(""))}
      ${this.set("Instellingen", this.sw("copilot.dlp", "DLP-regel: ‘Strikt vertrouwelijk’ niet verwerken", c.dlp)
        + this.sw("copilot.extract", "Medewerker mag de inhoud overnemen", enc ? c.extract : true, !enc, enc ? "" : "alleen bij versleuteling")
        + this.sw("copilot.prompt", "De prompt bevat een BSN", c.prompt)
        + this.sw("copilot.promptRule", "DLP-regel: prompts met een BSN tegenhouden", c.promptRule, false, "preview"))}</div>`;
    const scene = Previews.sceneCopilot({ prompt, kind, file, pillHtml: Site.pill(L.name, L.color), answer: "de afspraken over verzuim en de loopbaanafspraken" });
    const ex = `<div class="a-explain" aria-live="polite"><div class="a-hit-top"><b>Waarom dit antwoord?</b><span class="s-badge info">Microsoft 365 Copilot</span></div><p>${Site.rich(why)}</p><p class="s-small s-muted">Copilot geeft geen extra toegangsrechten. Deze oefening gaat over Microsoft 365 Copilot, niet over iedere AI-dienst.</p></div>`;
    return this.wrap("copilot", `${ctl}<div class="a-out">${Site.device("Microsoft 365 Copilot", scene, "Copilot")}${ex}</div>`);
  },

  w_triage() {
    const items = this.W.triage, picks = AC.w.triage;
    const done = items.filter((t) => Number.isInteger(picks[t.id])).length, good = items.filter((t) => picks[t.id] === t.best).length;
    const list = items.map((t) => {
      const p = Number.isInteger(picks[t.id]) ? picks[t.id] : -1, ok = p === t.best;
      return `<div class="a-triage-item"><div class="a-hit-top"><h4>${esc(t.title)}</h4><span class="s-badge ${t.sev === "high" ? "err" : "warn"}">${t.sev === "high" ? "Hoog" : "Gemiddeld"}</span></div><p>${esc(t.meta)}</p>
        <div class="a-optrow" role="group" aria-label="${esc("Wat doe je met: " + t.title)}">${t.options.map((o, i) => `<button type="button" class="a-opt" data-action="ac-triage" data-id="${esc(t.id)}" data-value="${i}" aria-pressed="${p === i}">${esc(o)}</button>`).join("")}</div>
        ${p >= 0 ? `<div class="a-q-why ${ok ? "ok" : "no"}" id="a-tri-${esc(t.id)}">${icon(ok ? "checkcircle" : "info", "s")}<div><b>${ok ? "Goede keuze." : `Beter: ${esc(t.options[t.best])}.`}</b> ${esc(t.why)}</div></div>` : ""}</div>`;
    }).join("");
    const head = `<div class="x-portal"><div class="x-portal-bar">${msLogo("purview")} Microsoft Purview · DLP Alerts<small>${done} van ${items.length} beoordeeld${done ? ` · ${good} goed` : ""}</small></div></div>`;
    return this.wrap("triage", `${head}<div class="a-triage">${list}</div>`, true);
  },

  w_roadmap() {
    const R = this.W.roadmap, i = Math.max(0, Math.min(R.length - 1, Number(AC.w.phase) || 0)), p = R[i];
    const phases = `<div class="a-phases" role="group" aria-label="Fasen van de uitrol">${R.map((x, j) => `<button type="button" class="a-phase" data-action="ac-phase" data-i="${j}" aria-pressed="${j === i}"><small>FASE ${esc(x.n)}</small><b>${esc(x.title)}</b></button>`).join("")}</div>`;
    const detail = `<div class="a-explain" aria-live="polite"><div class="a-hit-top"><b>${icon(p.icon, "s")} Fase ${esc(p.n)}: ${esc(p.title)}</b><span class="s-badge ok">${esc(p.result)}</span></div><p>${esc(p.text)}</p>${this.check(p.do)}</div>`;
    return this.wrap("roadmap", `${phases}${detail}`, true);
  },
};

/* ---------- Pagina's ---------- */
/* Visuals per hoofdstuk en één 'Wat denkt u?'-moment per les. Keuzes staan alleen in het geheugen (niet bewaard). */
const ACVis = {
  st: { peek: {}, sitKw: true },
  ico(k) { return String(k).startsWith("app:") ? Previews.tile(String(k).slice(4)) : `<span class="av-ic" aria-hidden="true">${icon(k)}</span>`; },
  hex(c) { return /^#[0-9a-f]{6}$/i.test(String(c || "")) ? c : "#69797E"; },
  wrap(inner, cap, cls = "") { return `<figure class="av ${cls}">${inner}${cap ? `<figcaption>${icon("info", "s")} ${esc(cap)}</figcaption>` : ""}</figure>`; },
  tone(t) { return ["ok", "warn", "block", "muted"].includes(t) ? t : ""; },
  render(v) { return v && Object.hasOwn(this.T, v.t) ? this.T[v.t].call(this, v) : ""; },
  T: {
    pillars(v) {
      return this.wrap(`<div class="av-pillars">${v.items.map(([ic, t, d, on]) => `<div class="av-pillar${on ? " on" : ""}">${this.ico(ic)}<b>${esc(t)}</b><span>${esc(d)}</span>${on ? `<em>${icon("check", "s")} In deze lessen</em>` : ""}</div>`).join("")}</div>`, v.cap);
    },
    flow(v) {
      return this.wrap(`<ol class="av-flow" data-n="${v.items.length}">${v.items.map(([ic, t, d], i) => `<li>${this.ico(ic)}<b><small aria-hidden="true">${i + 1}</small>${esc(t)}</b><span>${esc(d)}</span></li>`).join("")}</ol>${v.loop ? `<p class="av-loop">${icon("redo", "s")} ${esc(v.loop)}</p>` : ""}`, v.cap);
    },
    tiles(v) {
      return this.wrap(`<ul class="av-tiles" data-n="${v.items.length}">${v.items.map(([ic, t, d]) => `<li>${this.ico(ic)}<span><b>${esc(t)}</b>${d ? `<small>${esc(d)}</small>` : ""}</span></li>`).join("")}</ul>`, v.cap);
    },
    cols(v) {
      return this.wrap(`<div class="av-cols" data-n="${v.items.length}">${v.items.map(([ic, t, d, b, tone]) => `<div class="av-col ${this.tone(tone)}">${this.ico(ic)}<b>${esc(t)}</b><span>${esc(d)}</span>${b ? `<em>${esc(b)}</em>` : ""}</div>`).join("")}</div>${v.note ? `<p class="av-note">${icon("bulb", "s")} ${esc(v.note)}</p>` : ""}`, v.cap);
    },
    versus(v) {
      return this.wrap(`<div class="av-versus">${v.items.map(([t, list], i) => `<div class="av-vs${i ? " on" : ""}"><b>${esc(t)}</b><ul>${list.map((x) => `<li>${icon(i ? "plus" : "check", "s")}${esc(x)}</li>`).join("")}</ul></div>`).join("")}</div>`, v.cap);
    },
    list(v) {
      return this.wrap(`${v.title ? `<p class="av-title">${esc(v.title)}</p>` : ""}<ul class="av-list">${v.items.map(([ic, t, d, b, tone]) => `<li class="${this.tone(tone)}">${this.ico(ic)}<span><b>${esc(t)}</b><small>${esc(d)}</small></span>${b ? `<em>${esc(b)}</em>` : ""}</li>`).join("")}</ul>`, v.cap);
    },
    pairs(v) {
      return this.wrap(`<ul class="av-pairs">${v.items.map(([ic, a, b]) => `<li><span class="av-pa">${this.ico(ic)}<b>${esc(a)}</b></span>${icon("chevronright", "s")}<span class="av-pb">${esc(b)}</span></li>`).join("")}</ul>`, v.cap);
    },
    hub(v) {
      return this.wrap(`<div class="av-hub"><div class="av-hub-c">${this.ico(v.center[0])}<b>${esc(v.center[1])}</b></div>${v.items.map(([ic, t, d]) => `<div class="av-hub-i">${this.ico(ic)}<b>${esc(t)}</b><span>${esc(d)}</span></div>`).join("")}</div>`, v.cap);
    },
    ladder(v) {
      return this.wrap(`<div class="av-ladder"><span class="av-ladder-ax" aria-hidden="true">${icon("chevronright", "s")}<small>Hoger</small></span><ol>${v.items.map(([n, c, d], i) => `<li style="--c:${this.hex(c)};--w:${55 + i * 15}%"><i aria-hidden="true"></i><b>${esc(n)}</b><span>${esc(d)}</span></li>`).join("")}</ol></div>`, v.cap);
    },
    sit(v) {
      const kw = this.st.sitKw, ev = [["regex", "Patroon", "Negen cijfers: lijkt op een BSN", true], ["checkcircle", "Controle", "De elfproef klopt", true], ["tag", "Helpend woord", "‘BSN’ staat vlak bij het nummer", kw]];
      const n = ev.filter((e) => e[3]).length;
      return this.wrap(`<div class="av-sit"><div class="av-sit-doc">${Previews.tile("outlook")}<p>${kw ? `<mark class="kw">BSN</mark>` : "Referentie"}: <mark class="num">123456782</mark>, graag verwerken voor de aanvraag.</p></div>
        <ul class="av-sit-ev">${ev.map(([ic, t, d, on]) => `<li class="${on ? "on" : ""}">${icon(on ? ic : "minus", "s")}<span><b>${esc(t)}</b><small>${esc(on ? d : "Geen helpend woord gevonden")}</small></span></li>`).join("")}</ul>
        <div class="av-sit-meter"><span>Zekerheid van de herkenning</span><span class="a-bar" role="img" aria-label="${n === 3 ? "Hogere zekerheid" : "Lagere zekerheid"}"><i style="--p:${Math.round(n / 3 * 100)}%"></i></span><b>${n === 3 ? "Hoger" : "Lager"}</b></div>
        <button type="button" class="s-btn quiet small" id="av-sit-btn" data-action="ac-sit-kw" aria-pressed="${!kw}">${icon(kw ? "minus" : "plus", "s")} ${kw ? "Haal het woord ‘BSN’ weg" : "Zet het woord ‘BSN’ terug"}</button></div>`, "123456782 is een bekend testnummer, geen echt BSN.", "av-i");
    },
    doc(v) {
      const R = [["Openen", 1], ["Bewerken", 1], ["Afdrukken", 0], ["Kopiëren", 0]];
      return this.wrap(`<div class="av-doc"><div class="av-doc-page" aria-hidden="true"><span class="av-doc-hd">VERTROUWELIJK</span><span class="av-doc-wm">VERTROUWELIJK</span><b>Jaarplan 2026</b><i></i><i></i><i class="s"></i><i></i><i class="s"></i><span class="av-doc-ft">Vertrouwelijk · alleen intern</span></div>
        <div class="av-doc-side"><div class="av-doc-k">${icon("lock")}<span><b>Versleuteling</b><small>Bepaalt wie wat mag</small></span></div>
        <ul class="av-rights">${R.map(([t, ok]) => `<li class="${ok ? "ok" : "no"}">${icon(ok ? "check" : "x", "s")}${t}</li>`).join("")}</ul>
        <div class="av-doc-k">${icon("watermark")}<span><b>Markeringen</b><small>Koptekst, voettekst en watermerk</small></span></div></div></div>`, "Voorbeeld. Welke rechten en markeringen een label geeft, bepaalt je organisatie.");
    },
    labelmenu(v) {
      return this.wrap(`<div class="av-menu"><div class="av-menu-bar">${Previews.tile("word")}<b>Offerte klant.docx</b><span class="av-menu-btn">${icon("tag", "s")} Gevoeligheid ${icon("chevrondown", "s")}</span></div>
        <ul class="av-menu-list">${v.items.map(([n, c, def]) => `<li class="${def ? "def" : ""}"><i style="--c:${this.hex(c)}" aria-hidden="true"></i>${esc(n)}${def ? `<em>Standaardlabel</em>` : ""}</li>`).join("")}</ul>
        <p class="av-menu-req">${icon("info", "s")} Verplicht labelen: kies een label om het document op te slaan.</p></div>`, "Voorbeeld van het labelmenu in Word. Welke labels je ziet, bepaalt het labelbeleid.");
    },
    dlp(v) {
      const chip = (t) => `<span class="av-chip">${esc(t)}</span>`;
      return this.wrap(`<div class="av-dlp"><div class="av-dlp-pol">${this.ico("shield")}<span><small>DLP-beleid</small><b>Persoonsgegevens niet zomaar extern delen</b></span></div>
        <div class="av-dlp-grid"><div class="av-dlp-box"><small>Waar kijkt het?</small><b>Locaties</b><span class="av-chips">${["E-mail", "SharePoint", "OneDrive", "Teams", "Apparaten", "Copilot"].map(chip).join("")}</span></div>
        <div class="av-dlp-box av-dlp-rule"><small>Regel</small><div class="av-dlp-ca"><div><b>Voorwaarde</b><span>Bevat een BSN of IBAN én gaat naar iemand buiten de organisatie</span></div>${icon("chevronright", "s")}<div><b>Actie</b><span>Policy tip en Block with override</span></div></div></div></div>
        <p class="av-dlp-foot">${icon("bell", "s")} Daarnaast: meldingen voor medewerkers, alerts en incidentrapporten.</p></div>`, "Voorbeeld van één beleid met één regel.");
    },
    mock(v) {
      const ctx = { file: "Klantoverzicht.xlsx", to: "partner@extern.nl", subject: "Klantoverzicht", message: "Bijgaand het overzicht met IBAN's.", justification: "required" };
      return this.wrap(Site.device("Outlook", Previews.notice(v.kind || "override", "outlook", ctx), ""), "Voorbeeldscherm. Het echte scherm kan er iets anders uitzien.", "av-mock");
    },
  },
  check(m, index) {
    const c = CATALOG.academy.checks?.[m.id];
    if (!c || c.at !== index) return "";
    const sel = this.st.peek[m.id], has = Number.isInteger(sel) && c.options[sel], ok = has && c.options[sel][1];
    return `<section class="av-check" aria-labelledby="av-check-h"><span class="av-check-k">${icon("question", "s")} Wat denk jij?</span><h3 id="av-check-h">${esc(c.q)}</h3>
      <div class="av-check-o">${c.options.map(([t, right], i) => `<button type="button" class="av-opt${i === sel ? (right ? " ok" : " no") : has && right ? " hint" : ""}" data-action="ac-peek" data-id="${esc(m.id)}" data-value="${i}" aria-pressed="${i === sel}">${icon(i === sel ? (right ? "checkcircle" : "xcircle") : "chevronright", "s")}<span>${esc(t)}</span></button>`).join("")}</div>
      ${has ? `<p class="av-fb ${ok ? "ok" : "no"}" id="av-check-fb" tabindex="-1">${icon(ok ? "checkcircle" : "info", "s")}<span><b>${ok ? "Klopt." : "Niet helemaal."}</b> ${esc(c.options[sel][2])}</span></p>` : ""}</section>`;
  },
};

const ACV = {
  get C() { return CATALOG.academy; },
  mod(id) { return this.C.modules.find((m) => m.id === id) || null; },
  track(id) { return this.C.tracks.find((t) => t.id === id) || this.C.tracks[0]; },
  doneCount() { return this.C.modules.filter((m) => AC.done[m.id]).length; },
  nextMod() { return this.C.modules.find((m) => !AC.done[m.id]) || null; },
  minutes() { return this.C.modules.reduce((s, m) => s + (Number(m.minutes) || 0), 0); },
  crumb(items) { return `<nav class="s-crumb" aria-label="Kruimelpad">${Site.a("hub", "", "Home")}${items.map((x) => `<span aria-hidden="true">›</span>${x}`).join("")}</nav>`; },
  STATUS: { new: ["Nog niet gestart", ""], busy: ["Bezig", "warn"], done: ["Afgerond", "ok"] },
  badge(st) { const [t, c] = this.STATUS[st]; return `<span class="s-badge a-st ${c}">${st === "done" ? icon("check", "s") + " " : ""}${t}</span>`; },
  bar(done, total, label) {
    const pct = total ? Math.round(done / total * 100) : 0;
    return `<span class="a-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}" aria-label="${esc(label)}"><i style="--p:${pct}%"></i></span>`;
  },
  lessonState(m) {
    if (AC.done[m.id]) return "done";
    return (AC.read[m.id] || []).length || Object.keys(AC.quiz[m.id] || {}).length ? "busy" : "new";
  },
  pathInfo(p) {
    const mods = p.modules.map((id) => this.mod(id)).filter(Boolean), done = mods.filter((m) => AC.done[m.id]).length;
    const started = done > 0 || AC.path === p.id || mods.some((m) => this.lessonState(m) !== "new");
    const status = done === mods.length ? "done" : started ? "busy" : "new";
    const next = mods.find((m) => !AC.done[m.id]) || mods[0];
    return { mods, done, total: mods.length, status, next, n: mods.indexOf(next) + 1 };
  },
  pathCta(p, info) {
    if (info.status === "done") return ["Herhaal het leerpad", this.lessonUrl(info.mods[0], "c1", p.id)];
    if (info.status === "busy") return [`Ga verder met les ${info.n}`, this.lessonUrl(info.next, "c1", p.id)];
    return ["Begin met les 1", this.lessonUrl(info.mods[0], "c1", p.id)];
  },

  home() {
    const paths = this.C.paths.map((p) => [p, this.pathInfo(p)]);
    const pDone = paths.filter(([, i]) => i.status === "done").length, mDone = this.doneCount(), total = this.C.modules.length;
    const resume = HubRouter.parse(Prefs.v.lastLearn), resumeAcademy = resume && resume.route === "academy" && resume.sub.startsWith("lesson/") ? resume : null;
    const rm = resumeAcademy ? this.mod(resumeAcademy.sub.split("/")[1]) : null;
    let resumeCard = "";
    if (rm) {
      const [, , stepId = "c1", pid = ""] = resumeAcademy.sub.split("/"), st = this.steps(rm);
      const si = Math.max(0, st.findIndex((s) => s.id === stepId)), rp = this.C.paths.find((x) => x.id === pid);
      resumeCard = `<section class="a-resume" aria-labelledby="a-resume-h"><span class="a-resume-ico">${icon("flag")}</span>
        <div class="a-resume-txt"><small>Ga verder waar je was${rp ? ` · ${esc(rp.title)}` : ""}</small><h2 id="a-resume-h">${esc(rm.title)}</h2>
        <span class="a-resume-step">Stap ${si + 1} van ${st.length}: ${esc(st[si].title)}</span>${this.bar(si + 1, st.length, `Stap ${si + 1} van ${st.length}`)}</div>
        ${Site.a("academy", resumeAcademy.sub, `Ga verder ${icon("chevronright", "s")}`, "s-btn primary")}</section>`;
    }
    const LEVEL = ["Basis", "Verdieping", "Invoering"];
    const busyIdx = paths.findIndex(([, i]) => i.status === "busy"), nextIdx = busyIdx >= 0 ? busyIdx : paths.findIndex(([, i]) => i.status !== "done");
    const card = ([p, i], k) => {
      const [cta] = this.pathCta(p, i), pct = i.total ? Math.round(i.done / i.total * 100) : 0, next = k === nextIdx;
      const tag = next ? `<span class="a-path-tag">${i.status === "busy" ? "Hier was je" : "Begin hier"}</span>` : "";
      return `<li class="a-route-step${next ? " is-next" : ""}">${Site.a("academy", "path/" + p.id, `${tag}<div class="a-path-top"><span class="a-ring" style="--p:${pct}%" aria-hidden="true"><span>${icon(i.status === "done" ? "check" : p.icon)}</span></span>
        <span class="a-path-lvl"><b>Leerpad ${k + 1}</b>${esc(LEVEL[k] || "")} · ${i.total} lessen</span>${i.status === "new" ? "" : this.badge(i.status)}</div>
        <h3>${esc(p.title)}</h3><p>${esc(p.goal)}</p>
        <div class="a-path-foot"><span class="a-dots" aria-hidden="true">${i.mods.map((m) => `<i class="${AC.done[m.id] ? "ok" : ""}"></i>`).join("")}</span><span class="s-small">${i.done} van ${i.total} afgerond</span></div>
        <span class="s-link">${i.status === "new" ? "Bekijk dit leerpad" : i.status === "done" ? "Bekijk het leerpad" : "Ga verder"} ${icon("chevronright", "s")}</span>`, `s-card a-path is-${i.status}`, `aria-label="${esc(`Leerpad ${k + 1}: ${p.title}. ${this.STATUS[i.status][0]}. ${i.done} van ${i.total} lessen afgerond. ${cta}.`)}"`)}</li>`;
    };
    return `<div class="site site-ac">
      <header class="s-hero compact a-home-head"><div class="s-wrap">${this.crumb(["<span>Leer Purview kennen</span>"])}
        <div class="a-home-grid"><div>
          <span class="s-eyebrow">Leer Purview kennen</span><h1>Leer Purview kennen, <span class="s-grad-text">in je eigen tempo.</span></h1>
          <p class="s-lead">Kies een leerpad dat bij je doel past. Een les duurt ongeveer tien minuten: uitleg, een oefening en een kennischeck.</p>
        </div>
        <div class="a-home-stats" role="list">
          <div role="listitem"><b>${pDone}<small>/${paths.length}</small></b><span>leerpaden afgerond</span></div>
          <div role="listitem"><b>${mDone}<small>/${total}</small></b><span>lessen afgerond</span></div>
        </div></div>
        ${Learning.error ? `<p class="s-small">${icon("warning", "s")} De voortgang kan niet in deze browser worden bewaard.</p>` : ""}
      </div></header>
      <section class="s-sec tight"><div class="s-wrap">${resumeCard}
        <div class="s-head"><div><h2 class="s-h2">Kies een leerpad</h2><p>De leerpaden bouwen op van basis naar invoering. Sommige lessen staan in meer dan één leerpad. Heb je zo'n les al gedaan, dan telt die in het andere pad ook mee. In totaal zijn er ${this.C.modules.length} lessen.</p></div></div>
        <ol class="a-route a-paths" aria-label="Leerpaden">${paths.map(card).join("")}</ol>
      </div></section>
      <section class="s-sec tight alt"><div class="s-wrap"><h2 class="s-h2">Liever zelf kiezen?</h2>
        <div class="s-grid c2 a-more">
          ${Site.a("academy", "lessons", `<span class="s-ico">${icon("book")}</span><div><h3>Alle lessen</h3><p>Zoek een onderwerp en open direct de les die je nodig hebt.</p></div><span class="s-link">${total} lessen ${icon("chevronright", "s")}</span>`, "s-card a-more-card")}
          ${Site.a("academy", "glossary", `<span class="s-ico">${icon("search")}</span><div><h3>Begrippenlijst</h3><p>Zoek op wat een Purview-term betekent, in gewone taal.</p></div><span class="s-link">${this.C.glossary.length} begrippen ${icon("chevronright", "s")}</span>`, "s-card a-more-card")}
        </div>
      </div></section>${Site.footer()}</div>`;
  },

  lessons() {
    return `<div class="site site-ac">
      <header class="s-hero compact"><div class="s-wrap">${this.crumb([Site.a("academy", "home", "Leer Purview kennen"), "<span>Alle lessen</span>"])}
        <span class="s-eyebrow">${this.doneCount()} van ${this.C.modules.length} afgerond</span><h1>Alle lessen</h1>
        <p class="s-lead">Open elke les in de volgorde die je wilt. Je voortgang telt mee in de leerpaden.</p>
      </div></header>
      <section class="s-sec tight"><div class="s-wrap">
        <label class="a-search-label" for="a-topic-search">Zoek een les of praktijksituatie</label>
        <input id="a-topic-search" class="input a-topic-search" type="search" maxlength="60" data-live="ac-search" value="${esc(AC.query)}" placeholder="Bijvoorbeeld: delen, zorg, BSN of Copilot" aria-controls="a-lessons">
        <div id="a-lessons" class="a-lessons" aria-live="polite">${this.cards(AC.query)}</div>
      </div></section>${Site.footer()}</div>`;
  },

  steps(m) { return m.chapters.map((c, i) => ({ id: "c" + (i + 1), title: c.title })).concat([{ id: "practice", title: "Probeer het zelf" }, { id: "quiz", title: "Kennischeck" }, { id: "sources", title: "Verder lezen (optioneel)" }]); },
  lessonUrl(m, step, path = "") { return `lesson/${m.id}/${step || "c1"}${path ? "/" + path : ""}`; },
  currentPath() { const id = (UI.sub.academy || "").split("/")[3]; return this.C.paths.find((p) => p.id === id) || null; },
  order() { const p = this.currentPath(); return p ? p.modules.map((id) => this.mod(id)) : this.C.modules; },
  /** Waar gaat u heen na de laatste stap van een les? */
  after(m) {
    const path = this.currentPath(), mods = this.order(), nxt = mods[mods.indexOf(m) + 1];
    if (nxt) return { sub: this.lessonUrl(nxt, "c1", path?.id), label: `Volgende les: ${nxt.title}` };
    return path ? { sub: "path/" + path.id, label: "Terug naar het leerpad" } : { sub: "lessons", label: "Naar alle lessen" };
  },
  cards(query = "") {
    const q = query.trim().toLocaleLowerCase("nl");
    const modules = this.C.modules.filter((m) => {
      const extra = this.C.practiceCards.filter((c) => c.modules.includes(m.id)).map((c) => c.text).join(" ");
      return !q || `${m.title} ${m.short} ${m.goals.join(" ")} ${m.chapters.map((c) => c.text).join(" ")} ${extra}`.toLocaleLowerCase("nl").includes(q);
    });
    if (!modules.length) return `<div class="s-card a-empty"><h3>Geen les gevonden</h3><p>Probeer een ander woord, zoals label, delen, zorg of Copilot.</p><button class="s-btn quiet" data-action="ac-search-clear">Alle lessen tonen</button></div>`;
    return modules.map((m) => {
      const st = this.lessonState(m);
      return Site.a("academy", this.lessonUrl(m), `<span class="a-card-icon">${msLogo(m.app)}</span><div><h3>${esc(m.title)}</h3><p>${esc(m.short)}</p><span class="s-link">${st === "done" ? "Opnieuw bekijken" : st === "busy" ? "Ga verder" : "Open de les"} ${icon("chevronright", "s")}</span></div>${st !== "new" ? this.badge(st) : ""}`, `s-card a-lesson-card is-${st}`);
    }).join("");
  },
  pathPage(path) {
    const i = this.pathInfo(path), [cta, url] = this.pathCta(path, i);
    const others = this.C.paths.filter((p) => p.id !== path.id).map((p) => [p, this.pathInfo(p)]);
    const nextPath = (others.find(([, x]) => x.status !== "done") || [])[0];
    const finish = i.status === "done" ? `<div class="a-finish">${icon("trophy")}<div><h3>Leerpad afgerond</h3><p>Je hebt alle kennischecks van dit pad gedaan. ${nextPath ? `Een logische volgende stap is het leerpad ‘${esc(nextPath.title)}’.` : "Je hebt alle leerpaden afgerond. Zie het nu in de praktijk, of leg keuzes vast in de ontwerpworkshop."}</p></div>
      <div class="s-actions">${nextPath ? Site.a("academy", "path/" + nextPath.id, `Naar ${esc(nextPath.title)} ${icon("chevronright", "s")}`, "s-btn primary small") : Site.a("experience", "intro", `Ervaar Purview ${icon("chevronright", "s")}`, "s-btn primary small")}</div></div>` : "";
    return `<div class="site site-ac"><header class="s-hero compact"><div class="s-wrap">
      ${this.crumb([Site.a("academy", "home", "Leer Purview kennen"), `<span>${esc(path.title)}</span>`])}
      <span class="s-eyebrow">Leerpad · ${i.total} lessen</span><h1>${esc(path.title)}</h1><p class="s-lead">${esc(path.goal)}</p>
      <div class="a-path-progress">${this.badge(i.status)}<span>${i.done} van ${i.total} lessen afgerond</span>${this.bar(i.done, i.total, `${i.done} van ${i.total} lessen afgerond`)}</div>
      <div class="s-actions">${Site.a("academy", url, `${icon(i.status === "done" ? "redo" : "play", "s")} ${cta}`, "s-btn primary")}</div>
      </div></header><section class="s-sec tight"><div class="s-wrap a-path-list">${finish}
      <div><h2 class="s-h2">Lessen in dit leerpad</h2><p>Open elke les direct. Een les is afgerond als je de kennischeck hebt gedaan.</p></div>
      <ol class="a-path-rows">${i.mods.map((m, k) => {
        const st = this.lessonState(m), cur = i.status !== "done" && m === i.next;
        return `<li>${Site.a("academy", this.lessonUrl(m, "c1", path.id), `<span class="a-path-number" aria-hidden="true">${st === "done" ? icon("check") : k + 1}</span><div><h3>${esc(m.title)}</h3><p>${esc(m.short)}</p></div><span class="a-path-row-end">${st !== "new" ? this.badge(st) : cur ? `<span class="s-badge info">Volgende</span>` : ""}<span class="s-link">${st === "done" ? "Bekijken" : st === "busy" ? "Verder" : "Starten"} ${icon("chevronright", "s")}</span></span>`, `s-card a-path-row is-${st}${cur ? " is-next" : ""}`, cur ? 'aria-current="step"' : "")}</li>`;
      }).join("")}</ol>
      ${Site.a("academy", "home", `${icon("chevronleft", "s")} Alle leerpaden`, "s-btn quiet")}</div></section>${Site.footer()}</div>`;
  },

  quiz(m) {
    const ans = AC.quiz[m.id] || {}, keys = "ABCDEF";
    const qs = m.quiz.map((q, i) => {
      const has = Object.hasOwn(ans, i), pick = has ? ans[i] : -1, ok = pick === q.answer;
      const opts = q.options.map((o, j) => {
        const cls = has && j === q.answer ? " right" : has && j === pick ? " wrong" : "";
        const sr = has && j === q.answer ? " (juist antwoord)" : has && j === pick ? " (jouw antwoord)" : "";
        return `<button type="button" class="a-q-opt${cls}" data-action="ac-quiz" data-id="${esc(m.id)}" data-i="${i}" data-value="${j}"${has ? " disabled" : ""}><span class="k" aria-hidden="true">${keys[j]}</span><span>${esc(o)}<span class="sr-only">${sr}</span></span>${cls ? icon(cls === " right" ? "check" : "x", "s") : ""}</button>`;
      }).join("");
      return `<div class="a-q"><h3 id="a-qh-${i}"><span>${i + 1}.</span>${esc(q.q)}</h3><div class="a-q-opts" role="group" aria-labelledby="a-qh-${i}">${opts}</div>
        ${has ? `<div class="a-q-why ${ok ? "ok" : "no"}" id="a-why-${i}">${icon(ok ? "checkcircle" : "xcircle", "s")}<div><b>${ok ? "Juist." : "Niet helemaal."}</b> ${esc(q.why)}</div></div>` : ""}</div>`;
    }).join("");
    const all = m.quiz.every((_, i) => Object.hasOwn(ans, i)), score = m.quiz.filter((q, i) => ans[i] === q.answer).length;
    const nxt = this.after(m);
    const done = all ? `<div class="a-quiz-done" id="a-quiz-done">${icon("trophy")}<div><b>Les afgerond: ${score} van ${m.quiz.length} goed</b><p class="s-small s-muted">${score === m.quiz.length ? "Goed gedaan, de kern zit erin." : "Lees de uitleg bij de antwoorden nog eens, of doe de kennischeck opnieuw."}</p></div>
      <div class="s-actions"><button type="button" class="s-btn quiet small" data-action="ac-quiz-reset" data-id="${esc(m.id)}">${icon("redo", "s")} Opnieuw</button>${Site.a("academy", nxt.sub, `${esc(nxt.label)} ${icon("chevronright", "s")}`, "s-btn primary small")}</div></div>` : "";
    return `<div class="a-quiz">${qs}${done}</div>`;
  },

  /** Vorige/volgende stap van een les (lespagina én subbalk). */
  stepNav(m, stepId) {
    const path = this.currentPath(), steps = this.steps(m), index = Math.max(0, steps.findIndex((s) => s.id === stepId));
    const prev = index ? { sub: this.lessonUrl(m, steps[index - 1].id, path?.id), label: steps[index - 1].title, hint: "Vorige stap" }
      : path ? { sub: "path/" + path.id, label: path.title, hint: "Terug naar het leerpad" } : { sub: "lessons", label: "Alle lessen", hint: "Terug" };
    const last = index === steps.length - 1, aft = this.after(m);
    const nextLabel = last ? aft.label.replace(/^Volgende les: /, "") : steps[index + 1].title, nextHint = last ? (aft.label.startsWith("Volgende les") ? "Volgende les" : "Les afronden") : "Volgende stap";
    return { prev, nextLabel, nextHint, index, total: steps.length, step: steps[index].id };
  },
  navSub() {
    const sub = UI.sub.academy || "home", [kind, id] = sub.split("/"), m = kind === "lesson" ? this.mod(id) : null;
    return sub === "glossary" ? "glossary" : sub === "lessons" || (m && !this.currentPath()) ? "lessons" : "home";
  },

  module(m, stepId) {
    const path = this.currentPath(), steps = this.steps(m), index = steps.findIndex((s) => s.id === stepId), step = steps[index], seen = AC.read[m.id] || [];
    const route = Object.hasOwn(Views, m.route) ? m.route : "start";
    const crumbs = [Site.a("academy", "home", "Leer Purview kennen")];
    if (path) crumbs.push(Site.a("academy", "path/" + path.id, path.title));
    else crumbs.push(Site.a("academy", "lessons", "Alle lessen"));
    crumbs.push(`<span>${esc(m.title)}</span>`);
    const mods = this.order(), pos = mods.indexOf(m) + 1, st = this.lessonState(m);
    const nSeen = steps.filter((s) => seen.includes(s.id)).length;
    const stepIcon = (s, j) => j === index ? icon("chevronright", "s") : (s.id === "quiz" ? AC.done[m.id] : seen.includes(s.id)) ? icon("checkcircle", "s") : `<span class="a-toc-dot" aria-hidden="true"></span>`;
    const toc = `<aside class="a-side"><nav class="a-toc" aria-label="Stappen in deze les"><b>In deze les</b>
      <div class="a-toc-prog"><span>${nSeen} van ${steps.length} stappen gezien</span>${this.bar(nSeen, steps.length, `${nSeen} van ${steps.length} stappen gezien`)}</div>
      ${steps.map((s, j) => Site.a("academy", this.lessonUrl(m, s.id, path?.id), `${stepIcon(s, j)}<span>${esc(s.title)}</span>`, j === index ? "active" : "", j === index ? 'aria-current="step"' : "")).join("")}
      <button class="s-btn quiet small" data-action="ac-lesson-reset" data-id="${esc(m.id)}">${icon("redo", "s")} Les opnieuw beginnen</button></nav>
      ${path ? `<nav class="a-toc a-toc-path" aria-label="Lessen in ${esc(path.title)}"><b>${esc(path.title)}</b>${mods.map((x, j) => Site.a("academy", this.lessonUrl(x, "c1", path.id), `${AC.done[x.id] ? icon("checkcircle", "s") : `<span class="a-toc-n" aria-hidden="true">${j + 1}</span>`}<span>${esc(x.title)}</span>`, x === m ? "active" : "", x === m ? 'aria-current="page"' : "")).join("")}</nav>` : ""}
    </aside>`;
    const c = m.chapters[index];
    let body;
    const vis = ACVis.render((this.C.visuals?.[m.id] || [])[index]);
    if (c) body = `<p>${Site.rich(c.text)}</p>${vis}${c.points?.length ? (vis ? `<details class="a-more" data-acc="keys-${esc(m.id)}-${index}"><summary>${icon("chevrondown", "s")} Meer uitleg per onderdeel</summary>${ACW.keys(c.points)}</details>` : ACW.keys(c.points)) : ""}${c.tip ? `<div class="a-tip">${icon("bulb", "s")}<span>${Site.rich(c.tip)}</span></div>` : ""}${ACVis.check(m, index)}`;
    else if (stepId === "practice") body = `${ACW.render(m.widget)}${this.C.practiceCards.filter((p) => p.modules.includes(m.id)).map((p) => {
      const key = m.id + ":" + p.id;
      return `<article class="s-card a-reflect"><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p><div class="a-q-opts">${p.options.map(([title], i) => `<button class="a-q-opt" data-action="ac-reflect" data-id="${esc(p.id)}" data-value="${i}" aria-pressed="${AC.practical[key] === i}">${esc(title)}</button>`).join("")}</div>${Object.hasOwn(AC.practical, key) ? `<p class="a-tip" id="a-reflect-${esc(p.id)}">${esc(p.options[AC.practical[key]][1])}</p>` : ""}</article>`;
    }).join("")}`;
    else if (stepId === "quiz") body = this.quiz(m);
    else body = `<p>Wil je meer weten? Deze bronnen openen Microsoft Learn; daarvoor heb je internet nodig.</p>${Site.sources(m.learn)}<div class="a-tip">${icon("layers", "s")}<span>Wil je keuzes voor je organisatie vastleggen? ${Site.a(route, "", esc(m.routeLabel || "Open de ontwerpworkshop"))}. Je leervoortgang blijft behouden.</span></div>`;
    const { prev, nextLabel, nextHint } = this.stepNav(m, stepId);
    return `<div class="site site-ac"><header class="s-hero compact a-reader-head"><div class="s-wrap">${this.crumb(crumbs)}
      <span class="s-eyebrow">${path ? `${esc(path.title)} · les ${pos} van ${mods.length}` : "Losse les"}</span><h1>${esc(m.title)}</h1><p class="s-lead">${esc(m.short)}</p>
      ${st === "done" ? `<p class="a-head-done">${this.badge("done")} Je hebt de kennischeck van deze les gedaan.</p>` : ""}
      ${index === 0 ? `<details class="a-goal-details"><summary>Wat leer je in deze les?</summary>${ACW.check(m.goals)}</details>` : ""}
      </div></header><section class="s-sec tight"><div class="s-wrap a-layout">${toc}<div class="a-reader">
      <p class="a-step-count">Stap ${index + 1} van ${steps.length}</p>
      <section class="a-chapter" aria-labelledby="a-step-title"><h2 id="a-step-title">${esc(step.title)}</h2>${body}</section>
      <nav class="a-step-nav" aria-label="Lesnavigatie">${Site.a("academy", prev.sub, `${icon("chevronleft", "s")}<span><small>${esc(prev.hint)}</small>${esc(prev.label)}</span>`, "a-step-btn prev")}
      <button class="a-step-btn next" data-action="ac-next" data-id="${esc(m.id)}" data-step="${esc(stepId)}"><span><small>${esc(nextHint)}</small>${esc(nextLabel)}</span>${icon("chevronright", "s")}</button></nav>
      </div></div></section>${Site.footer()}</div>`;
  },

  glossList() {
    const q = AC.gq.trim().toLowerCase();
    return this.C.glossary.filter((g) => (!AC.gcat || g.cat === AC.gcat) && (!q || g.term.toLowerCase().includes(q) || g.def.toLowerCase().includes(q)))
      .sort((a, b) => a.term.localeCompare(b.term, "nl"));
  },
  glossCount(list) { return `${list.length} van ${this.C.glossary.length} begrippen${AC.gcat ? ` in ‘${esc(AC.gcat)}’` : ""}`; },
  glossOut(list) {
    if (!list.length) return `<p class="a-gloss-empty">${icon("search", "s")} Geen begrippen gevonden. Probeer een ander woord of kies ‘Alle’.</p>`;
    return `<div class="a-gloss">${list.map((g) => `<article class="s-card a-term"><span class="s-badge">${esc(g.cat)}</span><h3>${esc(g.term)}</h3><p>${esc(g.def)}</p>${g.learn && Site.ref(g.learn) ? Site.learn(g.learn, "Lees meer op Microsoft Learn") : ""}</article>`).join("")}</div>`;
  },
  glossary() {
    const C = this.C, list = this.glossList();
    const cats = [["", "Alle"]].concat(C.glossaryCats.map((c) => [c, c]));
    return `<div class="site site-ac">
      <header class="s-hero compact"><div class="s-wrap">
        ${this.crumb([Site.a("academy", "home", "Leer Purview kennen"), "<span>Begrippenlijst</span>"])}
        <span class="s-eyebrow">${C.glossary.length} begrippen</span>
        <h1>Begrippenlijst</h1>
        <p class="s-lead">Purview-termen in gewone taal. De Engelse termen zijn zoals je ze in de Purview-portal tegenkomt.</p>
      </div></header>
      <section class="s-sec tight"><div class="s-wrap">
        <div class="a-gloss-tools">
          <div class="a-gloss-wrap">${icon("search", "s")}<input type="search" class="a-gloss-search" data-live="ac-gloss" value="${esc(AC.gq)}" maxlength="60" placeholder="Zoek een begrip, bijvoorbeeld DLP of label" aria-label="Zoek een begrip" aria-describedby="a-gloss-count"></div>
          <div class="s-tabs" role="group" aria-label="Categorie">${cats.map(([v, t]) => `<button type="button" class="s-tab" data-action="ac-gcat" data-value="${esc(v)}" aria-pressed="${AC.gcat === v}">${esc(t)}</button>`).join("")}</div>
        </div>
        <p class="s-small s-muted" id="a-gloss-count" role="status">${this.glossCount(list)}</p>
        <div id="a-gloss-out">${this.glossOut(list)}</div>
      </div></section>
      <section class="s-sec tight alt"><div class="s-wrap"><div class="s-cta"><div><span class="s-eyebrow s-eyebrow-light">Verder leren</span><h2>Zie de begrippen in actie</h2><p>In de lessen zie je hoe deze begrippen samenwerken, met oefeningen en voorbeelden.</p></div>
        <div class="s-actions">${Site.a("academy", "home", `${icon("route", "s")} Kies een leerpad`, "s-btn light")}</div></div></div></section>
      ${Site.footer()}</div>`;
  },
};

registerView("academy", {
  title: "Leer Purview kennen",
  defaultSub: "home",
  navSub() { return ACV.navSub(); },
  normalizeSub(raw) {
    if (!raw || ["home", "lessons", "glossary"].includes(raw)) return raw || "home";
    const legacy = ACV.mod(raw);
    if (legacy) return ACV.lessonUrl(legacy);
    const [kind, id, step, path, ...extra] = raw.split("/");
    if (kind === "path" && !step && !path && !extra.length && CATALOG.academy.paths.some((p) => p.id === id)) return "path/" + id;
    const m = ACV.mod(id);
    if (kind !== "lesson" || !m || extra.length || (path && !CATALOG.academy.paths.some((p) => p.id === path && p.modules.includes(id)))) return null;
    if (step && !ACV.steps(m).some((s) => s.id === step)) return null;
    return ACV.lessonUrl(m, step, path);
  },
  render() {
    const sub = UI.sub.academy;
    if (sub === "glossary") return ACV.glossary();
    if (sub === "lessons") return ACV.lessons();
    const [kind, id, step] = (sub || "").split("/");
    if (kind === "path") return ACV.pathPage(CATALOG.academy.paths.find((p) => p.id === id));
    return kind === "lesson" ? ACV.module(ACV.mod(id), step) : ACV.home();
  },
});

/** Focus (en zo nodig scroll) naar een element in #main na het renderen. */
function acFocus(sel) {
  const main = $("#main"), el = main && $(sel, main);
  if (!el) return;
  if (!el.matches("button, a, input, textarea, select")) el.setAttribute("tabindex", "-1");
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: "nearest", behavior: reducedMotion() ? "auto" : "smooth" });
}

Actions["ac-set"] = (el) => {
  const key = String(el.dataset.key || ""), val = String(el.dataset.value || ""), ok = ACW.allowed(key);
  if (!ok || !ok.includes(val)) return;
  const [g, f] = key.split(".");
  if (key === "label.id") { const l = ACW.label(val); AC.w.label = { id: l.id, mark: !!l.mark, wm: l.id === "strikt", enc: !!l.enc }; }
  else AC.w[g][f] = val;
  acSave();
  App.render();
};
Actions["ac-toggle"] = (el) => {
  const key = String(el.dataset.key || "");
  if (!AC_TOGGLES.includes(key) || el.disabled) return;
  const [g, f] = key.split(".");
  AC.w[g][f] = !AC.w[g][f];
  acSave();
  App.render();
};
Actions["ac-map"] = (el) => {
  if (!ACW.W.map.some((f) => f.items.some((it) => it.id === el.dataset.id))) return;
  AC.w.map = el.dataset.id;
  acSave();
  App.render();
};
Actions["ac-sample"] = (el) => {
  const s = ACW.W.sitSamples.find((x) => x.id === el.dataset.id);
  if (!s) return;
  AC.w.sit = s.text;
  App.render();
};
Actions["ac-sit"] = (el) => {
  AC.w.sit = String(el.value || "").slice(0, AC_SIT.MAX);
  const out = $("#a-sit-out");
  if (out) out.innerHTML = ACW.sitOut(AC.w.sit);
  $$('[data-action="ac-sample"]').forEach((b) => {
    const s = ACW.W.sitSamples.find((x) => x.id === b.dataset.id);
    b.setAttribute("aria-pressed", String(!!s && s.text === AC.w.sit));
  });
};
Actions["ac-triage"] = (el) => {
  const t = ACW.W.triage.find((x) => x.id === el.dataset.id), v = Number(el.dataset.value);
  if (!t || !Number.isInteger(v) || v < 0 || v >= t.options.length) return;
  AC.w.triage[t.id] = v;
  acSave();
  App.render();
};
Actions["ac-phase"] = (el) => {
  const i = Number(el.dataset.i);
  if (!Number.isInteger(i) || i < 0 || i >= ACW.W.roadmap.length) return;
  AC.w.phase = i;
  acSave();
  App.render();
};
Actions["ac-quiz"] = (el) => {
  const m = ACV.mod(el.dataset.id), qi = Number(el.dataset.i), oi = Number(el.dataset.value);
  if (!m || !Number.isInteger(qi) || !m.quiz[qi] || !Number.isInteger(oi) || oi < 0 || oi >= m.quiz[qi].options.length) return;
  const qs = Object.hasOwn(AC.quiz, m.id) ? AC.quiz[m.id] : (AC.quiz[m.id] = {});
  if (Object.hasOwn(qs, qi)) return;
  qs[qi] = oi;
  const all = m.quiz.every((_, i) => Object.hasOwn(qs, i));
  if (all) AC.done[m.id] = true;
  acSave();
  App.render();
  acFocus(all ? "#a-quiz-done" : `#a-why-${qi}`);
};
Actions["ac-quiz-reset"] = (el) => {
  const m = ACV.mod(el.dataset.id);
  if (!m) return;
  delete AC.quiz[m.id];
  acSave();
  App.render();
  acFocus(`[data-action="ac-quiz"][data-id="${CSS.escape(m.id)}"][data-i="0"][data-value="0"]`);
};
Actions["ac-gloss"] = (el) => {
  AC.gq = String(el.value || "").slice(0, 60);
  const list = ACV.glossList(), out = $("#a-gloss-out"), cnt = $("#a-gloss-count");
  if (out) out.innerHTML = ACV.glossOut(list);
  if (cnt) cnt.innerHTML = ACV.glossCount(list);
};
Actions["ac-gcat"] = (el) => {
  const v = String(el.dataset.value || "");
  if (v && !ACV.C.glossaryCats.includes(v)) return;
  AC.gcat = v;
  App.render();
};
Actions["ac-search"] = (el) => {
  AC.query = String(el.value || "").slice(0, 60);
  const out = $("#a-lessons");
  if (out) out.innerHTML = ACV.cards(AC.query);
};
Actions["ac-search-clear"] = () => { AC.query = ""; App.render(); acFocus("#a-topic-search"); };
Actions["ac-reflect"] = (el) => {
  const card = CATALOG.academy.practiceCards.find((c) => c.id === el.dataset.id), value = Number(el.dataset.value);
  const mid = (UI.sub.academy || "").split("/")[1];
  if (!card || !card.modules.includes(mid) || !Number.isInteger(value) || !card.options[value]) return;
  AC.practical[mid + ":" + card.id] = value;
  acSave(); App.render(); acFocus("#a-reflect-" + card.id);
};
Actions["ac-peek"] = (el) => {
  const c = CATALOG.academy.checks?.[el.dataset.id], v = Number(el.dataset.value);
  if (!c || !Number.isInteger(v) || !c.options[v]) return;
  ACVis.st.peek[el.dataset.id] = v;
  App.render(); acFocus("#av-check-fb");
};
Actions["ac-sit-kw"] = () => { ACVis.st.sitKw = !ACVis.st.sitKw; App.render(); acFocus("#av-sit-btn"); };
Actions["ac-next"] = (el) => {
  const m = ACV.mod(el.dataset.id);
  if (!m) return;
  const steps = ACV.steps(m), index = steps.findIndex((s) => s.id === el.dataset.step), path = ACV.currentPath();
  if (index < 0) return;
  const seen = AC.read[m.id] || (AC.read[m.id] = []);
  if (!seen.includes(steps[index].id)) seen.push(steps[index].id);
  AC.path = path?.id || "";
  acSave();
  Site.go("academy", steps[index + 1] ? ACV.lessonUrl(m, steps[index + 1].id, path?.id) : ACV.after(m).sub);
};
Actions["ac-lesson-reset"] = (el) => {
  const m = ACV.mod(el.dataset.id), path = ACV.currentPath();
  if (!m) return;
  confirmDialog("Deze les opnieuw beginnen?", "Alleen de antwoorden en voortgang van deze les worden gewist. Andere lessen en je ontwerp blijven behouden.", () => {
    delete AC.done[m.id]; delete AC.quiz[m.id]; delete AC.read[m.id];
    CATALOG.academy.practiceCards.filter((c) => c.modules.includes(m.id)).forEach((c) => { delete AC.practical[m.id + ":" + c.id]; });
    const widgetKey = m.widget === "roadmap" ? "phase" : m.widget;
    AC.w[widgetKey] = JSON.parse(JSON.stringify(AC_DEFAULT_W[widgetKey]));
    acSave(); Site.go("academy", ACV.lessonUrl(m, "c1", path?.id));
  });
};
