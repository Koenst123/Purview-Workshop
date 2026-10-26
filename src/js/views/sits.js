/* View: Informatietypen – bibliotheek (SIT's, classifiers, EDM, fingerprints), koppelen aan labels, custom SIT-bouwer */
const SECTOR_NAMES = { zorg: "Zorg", overheid: "Overheid", financieel: "Financieel", onderwijs: "Onderwijs", juridisch: "Juridisch", it: "IT", industrie: "Industrie", retail: "Retail" };
const SECTOR_PHRASE = { generic: "een gemiddelde organisatie", zorg: "de zorg", overheid: "de overheid", financieel: "de financiële sector", onderwijs: "het onderwijs", juridisch: "juridische afdelingen en advocatuur", it: "IT-teams en softwareontwikkeling", industrie: "industrie en productie", retail: "retail en webwinkels" };
/** Eén zin per soort, in gewone taal (infoTip bij ‘Soort’ en tooltips in de bibliotheek). */
const SIT_KIND_PLAIN = {
  builtin: "Standaardpatroon van Microsoft, zoals BSN of IBAN.",
  custom: "Eigen patroon voor eigen nummers, zoals een personeelsnummer.",
  edm: "Exacte waarden uit een eigen bronbestand, zoals het personeelsregister (gehasht geüpload).",
  fingerprint: "Herkent documenten die op een standaardformulier zijn gebaseerd.",
  classifier: "Getraind model dat een soort document herkent; taalondersteuning verschilt per classifier.",
  object: "Geheugensteun uit Know your Data; Purview herkent dit niet zelf.",
};

const SitLib = {
  PAGE: 80,
  items(st = S()) {
    const inState = (kind, ref) => st.sits.find((s) => s.kind === kind && s.ref === ref);
    const out = [];
    const push = (kind, c, extra) => { const s = inState(kind, c.id); out.push(Object.assign({ kind, ref: c.id, name: c.name, desc: c.desc || c.hint || "", sector: c.sector || "generic", sectors: c.sectors || [], nl: !!c.nl, langs: c.langs || "", cat: c.cat || "", region: c.region || "", sitId: s ? s.id : null }, extra)); };
    CATALOG.builtinSits.forEach((c) => push("builtin", c, { catName: CATALOG.sitCats[c.cat] || c.cat, regionName: CATALOG.sitRegions[c.region] || c.region }));
    CATALOG.classifiers.forEach((c) => push("classifier", c, { catName: c.cat }));
    CATALOG.customSitTemplates.forEach((c) => push("custom", c, { catName: "Sjabloon" }));
    CATALOG.edmTemplates.forEach((c) => push("edm", c, { name: `EDM – ${c.name}`, catName: "Sjabloon" }));
    CATALOG.fingerprintTemplates.forEach((c) => push("fingerprint", c, { name: `Fingerprint – ${c.name}`, catName: "Sjabloon" }));
    CATALOG.infoObjects.forEach((c) => push("object", c, { catName: "Know your Data" }));
    st.sits.filter((s) => !s.ref || !sitKindOf(s.ref)).forEach((s) => out.push({ kind: s.kind, ref: null, name: s.name, desc: s.desc || "", sector: s.sector || "generic", sectors: [], cat: "", catName: "Eigen", sitId: s.id, own: true }));
    return out;
  },
  /** Filter normaliseren: "all" (oude default) = geen filter; rec (aanbevolen) staat standaard aan. Sector = startset in de bibliotheek (alleen UI). */
  filter(st = S()) {
    const f = UI.libFilter || (UI.libFilter = { q: "" });
    const sector = f.sector && (CATALOG.sitSectors || {})[f.sector] ? f.sector : (st.meta.sector || "generic");
    return { q: f.q || "", kind: f.kind === "all" ? "" : f.kind || "", cat: f.cat === "all" ? "" : f.cat || "", rec: f.rec !== false, sector, loose: !!f.loose && this.loose(st).size > 0 };
  },
  /** SIT-id's in het ontwerp die aan geen label en geen DLP-regel hangen. */
  loose(st = S()) {
    const used = new Set(st.labels.flatMap((l) => l.sits || []));
    (st.customDlp || []).forEach((c) => (c.rules || []).forEach((r) => (r.sits || []).forEach((s) => used.add(s))));
    return new Set(st.sits.filter((s) => !used.has(s.id)).map((s) => s.id));
  },
  sectorName(st = S()) { const k = this.filter(st).sector; return (CATALOG.sitSectors || {})[k] || SECTOR_NAMES[k] || "Algemeen"; },
  isRec(it, st = S()) {
    const sector = this.filter(st).sector;
    if (it.own || it.sitId || it.kind === "object") return !!(it.own || it.sitId) || it.sector === sector || it.sector === "generic";
    return ((CATALOG.sitRecommended || {})[sector] || []).includes(it.ref);
  },
  /** Relevant voor de gekozen sector (startset of sector-tag) – sorteert bovenaan in ‘Alle’. */
  relevant(it, sector) { return it.own || ((CATALOG.sitRecommended || {})[sector] || []).includes(it.ref) || (it.sectors || []).includes(sector) || it.sector === sector; },
  filtered(st = S(), ignoreRec = false) {
    const f = this.filter(st);
    const q = f.q.toLowerCase().trim();
    const sector = f.sector;
    const rec = f.rec && !q && !f.kind && !f.cat && !f.loose && !ignoreRec;
    const loose = f.loose ? this.loose(st) : null;
    const rank = (it) => (it.own ? 0 : this.relevant(it, sector) ? 1 : it.sector === "generic" && !(it.sectors || []).length ? 2 : 3);
    return this.items(st).filter((it) => (!loose || (it.sitId && loose.has(it.sitId))) && (!f.kind || it.kind === f.kind) && (!f.cat || it.catName === f.cat) && (!rec || this.isRec(it, st)) && (!q || `${it.name} ${it.desc} ${it.catName || ""} ${it.regionName || ""} ${(it.sectors || []).map((x) => (CATALOG.sitSectors || {})[x] || x).join(" ")}`.toLowerCase().includes(q)))
      .map((it, i) => [it, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map((x) => x[0]);
  },

  card(it, st = S(), star = false) {
    const users = it.sitId ? st.labels.filter((l) => (l.sits || []).includes(it.sitId)) : [];
    const used = users.length > 0;
    const payload = it.sitId ? { sitId: it.sitId } : { kind: it.kind, ref: it.ref };
    const meta = [it.catName, it.regionName, SECTOR_NAMES[it.sector] || ""].filter(Boolean).join(" · ");
    const linked = used ? users.map((l) => l.displayName || l.name).join(", ") : "";
    const kind = CATALOG.sitKinds[it.kind] || {};
    const tag = it.kind === "builtin" ? `<span class="kind-tag kind-builtin" role="img" aria-label="${esc(kind.short)}" title="${esc(kind.short + " – " + SIT_KIND_PLAIN.builtin)}">${icon(kind.icon, "s")}</span>` : `<span class="kind-tag kind-${esc(it.kind)}" title="${esc(SIT_KIND_PLAIN[it.kind] || kind.desc || "")}">${icon(kind.icon || "search", "s")}${esc(kind.short || "")}</span>`;
    const lang = it.kind === "classifier" ? (it.nl ? `<span class="lib-lang" title="Ondersteunt ook Nederlands">NL</span>` : it.langs === "taalonafhankelijk" ? `<span class="lib-lang" title="Taalonafhankelijk">code</span>` : "") : "";
    return `<div class="lib-card${used ? " used" : ""}" data-drag="sit" data-payload='${attr(payload)}' data-tap="1" data-pick-label="${esc(it.name)}" data-pick-hint="klik op een label om te koppelen" title="${esc(it.name + (meta ? ` (${meta})` : "") + (it.desc ? " – " + it.desc : ""))}">
      <span class="lib-grip" aria-hidden="true">${icon("grip", "s")}</span>
      <div class="lib-main"><span class="lib-title ellipsis">${esc(it.name)}</span>
      <div class="lib-meta">${tag}${lang}${used ? `<span class="lib-linked" title="Gekoppeld aan: ${esc(linked)}"><span class="lib-dots" aria-hidden="true">${users.slice(0, 5).map((l) => `<i style="--lc:${esc(l.color)}"></i>`).join("")}</span><span class="ellipsis">${esc(linked)}</span></span>` : meta ? `<span class="ellipsis">${esc(meta)}</span>` : ""}</div></div>
      ${star ? `<span class="lib-star" title="Past vaak bij ${esc(this.sectorName(st))}">${icon("star", "s")}</span>` : ""}<button class="icon-btn small no-drag" data-action="sit-add" data-payload='${attr(payload)}' title="Koppelen aan een label" aria-label="${esc(it.name)} koppelen aan een label">${icon("plus", "s")}</button>
    </div>`;
  },
  listHtml(st = S()) {
    let items = this.filtered(st);
    const f = this.filter(st);
    const recOn = f.rec && !f.q.trim() && !f.kind && !f.cat && !f.loose;
    const all = recOn ? this.filtered(st, true).length : 0;
    const more = recOn && all > items.length ? `<button class="btn small subtle mt-1" data-action="lib-rec" data-on="0">Toon alle ${all} typen</button>` : "";
    if (!items.length) return `<p class="muted small">Niets gevonden.</p>${more}`;
    const group = !recOn && !f.cat;
    const order = [];
    if (group) {
      items.forEach((it) => { if (!order.includes(it.catName || "Overig")) order.push(it.catName || "Overig"); });
      const base = this.items(st).map((x) => x.catName || "Overig");
      order.sort((a, b) => (a === "Eigen" ? -1 : b === "Eigen" ? 1 : base.indexOf(a) - base.indexOf(b)));
      items = order.flatMap((g) => items.filter((it) => (it.catName || "Overig") === g));
    }
    const limit = Math.max(this.PAGE, UI.libLimit || 0);
    const counts = {};
    items.forEach((it) => { const g = it.catName || "Overig"; counts[g] = (counts[g] || 0) + 1; });
    let last = null;
    const html = items.slice(0, limit).map((it) => {
      const g = it.catName || "Overig";
      const h = group && g !== last ? `<div class="lib-group" role="heading" aria-level="4">${esc(g)}<span class="lib-group-n">${counts[g]}</span></div>` : "";
      last = g;
      return h + this.card(it, st, !recOn && !it.own && this.relevant(it, f.sector) && f.sector !== "generic");
    }).join("");
    const rest = items.length - limit;
    const page = rest > 0 ? `<button class="btn small subtle mt-1 lib-more" data-action="lib-more">${icon("chevrondown", "s")}Toon nog ${Math.min(rest, this.PAGE)} van ${rest}</button>` : "";
    return `<p class="xs muted lib-count">${recOn ? `Startset ${esc(this.sectorName(st))} · ` : ""}${items.length} ${items.length === 1 ? "type" : "typen"}${recOn ? ` ${infoTip("Een suggestie op basis van de sector; dit zegt niets over welke gegevens jullie echt hebben. Kies samen wat past.")}` : ""}</p>` + html + page + more;
  },
  /** SIT-chip met de volledige naam in de tooltip (lange Purview-namen worden afgekapt). */
  chip(s, x) { return VH.sitChip(s, x).replace('title="', `title="${esc(s.name)} · `); },
};

/** Zet een sleep-payload ({sitId} of {kind,ref}) om naar een SIT-id in de state. */
function sitFromPayload(st, p) {
  if (p.sitId && sitById(p.sitId, st)) return p.sitId;
  if (p.ref) return ensureSit(st, p.ref, p.kind);
  return null;
}
function linkSit(labelId, payload) {
  if (payload && payload.from) return moveSit(payload.sitId, payload.from, labelId);
  let name = "", dup = false, bad = "", sid = null;
  Store.update((st) => {
    const l = labelById(labelId, st);
    if (!l) return;
    const id = sitFromPayload(st, payload);
    if (!id) return;
    const s = sitById(id, st);
    name = s.name;
    if (labelSits(l, st).some((x) => x.id === id)) { dup = true; return; }
    l.sits = l.sits || [];
    l.sits.push(id);
    sid = id;
    if (s.kind === "object") bad = "Een informatieobject is een geheugensteun uit Know your Data, geen classifier in Purview. Koppel ook een SIT, EDM, fingerprint of trainable classifier voor automatische herkenning.";
  });
  if (dup) Toast.show(`‘${esc(name)}’ is al gekoppeld (eventueel via de parent).`, "info");
  else if (name) { UI.sitFlash = { labelId, sitId: sid, at: Date.now() }; Toast.show(`‘${esc(name)}’ gekoppeld aan ${esc(labelFullName(labelById(labelId)))}.`, "ok"); }
  if (bad) Toast.show(esc(bad), "warn", 6000);
}
/** Verplaatsen = loskoppelen van het oude label + koppelen aan het nieuwe, in één (ongedaan te maken) stap. */
function moveSit(sitId, fromId, toId) {
  if (!sitId || !toId || fromId === toId) return;
  let res = null;
  Store.update((st) => {
    const a = labelById(fromId, st), b = labelById(toId, st), s = sitById(sitId, st);
    if (!b || !s) return;
    if (a) a.sits = (a.sits || []).filter((x) => x !== sitId);
    if (!labelSits(b, st).some((x) => x.id === sitId)) { b.sits = b.sits || []; b.sits.push(sitId); }
    res = { name: s.name, from: a ? labelFullName(a, st) : "", to: labelFullName(b, st) };
  });
  if (!res) return;
  UI.sitFlash = { labelId: toId, sitId, at: Date.now() };
  Toast.show(`‘${esc(res.name)}’ verplaatst${res.from ? ` van ${esc(res.from)}` : ""} naar ${esc(res.to)}. <button class="link-btn" data-action="undo">Ongedaan maken</button>`, "ok", 5000);
}
function unlinkSit(labelId, sitId) {
  let res = null;
  Store.update((st) => {
    const l = labelById(labelId, st), s = sitById(sitId, st);
    if (!l || !(l.sits || []).includes(sitId)) return;
    l.sits = l.sits.filter((x) => x !== sitId);
    res = { name: s ? s.name : "Informatietype", from: labelFullName(l, st) };
  });
  if (res) Toast.show(`‘${esc(res.name)}’ losgekoppeld van ${esc(res.from)}. <button class="link-btn" data-action="undo">Ongedaan maken</button>`, "ok", 5000);
}
/** Mag dit informatietype (payload uit de bibliotheek of een chip) op dit label? Alleen deze labels lichten op tijdens het slepen. */
function sitCanLink(labelId, p, st = S()) {
  const l = labelById(labelId, st);
  if (!l || !p || typeof p !== "object") return false;
  if (p.from && p.from === labelId) return false;
  const kind = p.kind || (p.ref ? sitKindOf(p.ref) : null);
  const id = p.sitId || (p.ref ? (st.sits.find((s) => s.ref === p.ref && s.kind === kind) || {}).id : null);
  if (!id) return true;
  if ((l.sits || []).includes(id)) return false;
  const par = parentOf(l, st);
  return !(par && (par.sits || []).includes(id) && par.id !== p.from);
}
DnD.register("sit-to-label", (type, payload, target) => linkSit(target.labelId, payload));
DnD.accept["sit-to-label"] = (type, payload, target) => sitCanLink(target && target.labelId, payload);
DnD.register("sit-unlink", (type, payload) => { if (payload && payload.from) unlinkSit(payload.from, payload.sitId); });
DnD.accept["sit-unlink"] = (type, payload) => !!(payload && typeof payload === "object" && payload.from);
/** "Kies uit lijst…" in de kies-balk: alternatief voor slepen/tikken (toetsenbord, schermlezer). */
DnD.pickMenu.sit = (pick, anchor) => {
  const p = pick.payload, st = S();
  if (!p || typeof p !== "object") return;
  const items = orderedLabels(st).filter((l) => sitCanLink(l.id, p, st)).map((l) => ({ icon: "tag", label: (p.from ? "Verplaats naar " : "") + labelFullName(l, st), fn: () => { DnD.clearPick(); linkSit(l.id, p); } }));
  const from = p.from && labelById(p.from, st);
  if (from) items.push(...(items.length ? ["-"] : []), { icon: "x", label: `Loskoppelen van ${labelFullName(from, st)}`, danger: true, fn: () => { DnD.clearPick(); unlinkSit(from.id, p.sitId); } });
  if (!items.length) items.push({ icon: "info", label: "Al gekoppeld aan alle labels" });
  Menu.open(anchor, items);
};
/** Coach-mark ‘zo werkt slepen’: één keer per browser (wegklikken), of zolang localStorage geblokkeerd is per sessie. */
const SitCoach = {
  key: STORAGE_KEY + "-coach",
  seen(id) { if ((UI.coachSeen || {})[id]) return true; try { return !!JSON.parse(localStorage.getItem(this.key) || "{}")[id]; } catch (e) { return false; } },
  done(id) {
    UI.coachSeen = Object.assign(UI.coachSeen || {}, { [id]: true });
    try { const o = JSON.parse(localStorage.getItem(this.key) || "{}"); o[id] = true; localStorage.setItem(this.key, JSON.stringify(o)); } catch (e) { /* geblokkeerd: alleen deze sessie */ }
  },
};

/** Regex-test in een Web Worker: een traag patroon (catastrophic backtracking) blokkeert zo nooit de pagina. */
function _regexWorkerMain(e) {
  var d = e.data, res = { id: d.id, matches: [], kws: [], error: null };
  try {
    var t = d.text;
    d.kws.forEach(function (k) {
      var re = new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), m;
      while ((m = re.exec(t))) { res.kws.push({ i: m.index, len: m[0].length }); if (!m[0].length) break; }
    });
    if (d.regex) {
      var r = new RegExp(d.regex, "g"), m2, g = 0;
      while ((m2 = r.exec(t)) && g++ < 200) {
        if (!m2[0].length) { r.lastIndex++; continue; }
        res.matches.push({ i: m2.index, len: m2[0].length, text: m2[0] });
      }
    }
  } catch (x) { res.error = String(x && x.message || x); }
  postMessage(res);
}
const RegexRunner = {
  timeoutMs: 250,
  _w: null, _url: null, _seq: 0, _timer: null,
  _worker() {
    if (this._w) return this._w;
    if (!this._url) this._url = URL.createObjectURL(new Blob([`onmessage=${_regexWorkerMain.toString()};`], { type: "text/javascript" }));
    this._w = new Worker(this._url);
    return this._w;
  },
  _kill() { if (this._w) { this._w.terminate(); this._w = null; } },
  /** cb(res) met res.timeout = true als het patroon te traag is. Een nieuwe run annuleert de vorige. */
  run(job, cb) {
    const id = ++this._seq;
    clearTimeout(this._timer);
    let w;
    try { w = this._worker(); } catch (e) { this._kill(); cb({ error: null, unsupported: true, matches: [], kws: [] }); return; }
    w.onmessage = (ev) => { if (ev.data.id !== this._seq) return; clearTimeout(this._timer); cb(ev.data); };
    w.onerror = (ev) => { ev.preventDefault(); clearTimeout(this._timer); this._kill(); if (id === this._seq) cb({ error: ev.message || "Onbekende fout", matches: [], kws: [] }); };
    this._timer = setTimeout(() => { if (id !== this._seq) return; this._kill(); cb({ timeout: true, matches: [], kws: [] }); }, this.timeoutMs);
    w.postMessage(Object.assign({ id }, job));
  },
};
/** Testtekst staat alleen in het geheugen (UI), nooit in de state, export of localStorage. */
function sitTestText(id) {
  const own = (UI.sitTest || {})[id];
  if (own !== undefined) return own;
  const s = sitById(id), tpl = s && s.ref && CATALOG.customSitTemplates.find((x) => x.id === s.ref);
  return (tpl && tpl.test) || "";
}
/** 9 cijfers die de elfproef halen: mogelijk een echt BSN. */
function _looksLikeBsn(text) {
  return (String(text).match(/\b\d{9}\b/g) || []).some((n) => {
    if (/^(\d)\1{8}$/.test(n)) return false;
    const d = n.split("").map(Number);
    const s = d.slice(0, 8).reduce((a, x, i) => a + x * (9 - i), 0) - d[8];
    return s % 11 === 0;
  });
}
const SitBuilder = {
  issues(s) {
    const out = [];
    if (s.kind !== "custom") return out;
    if (!s.regex && !(s.keywords || []).length) out.push(["err", "Geen primary element: vul een regex of keyword list in."]);
    if (s.regex) {
      try { new RegExp(s.regex); } catch (e) { out.push(["err", "Ongeldige regex: " + e.message]); }
      if (s.regex.length > 1024) out.push(["err", `Regex is ${s.regex.length} tekens (max. 1.024).`]);
      if (/\((?:[^()\\]|\\.)*[+*]\)[+*{]/.test(s.regex)) out.push(["err", "Geneste herhaling (bijv. (a+)+) kan vastlopen. Gebruik een vaste lengte, zoals \\d{9}."]);
      if (/(^|[^\\])[\^$]/.test(s.regex)) out.push(["warn", "Regex bevat ^ of $ – Purview matcht binnen lopende tekst; gebruik \\b."]);
      if (/\(\?<[=!]/.test(s.regex)) out.push(["warn", "Lookbehind: Purview (Boost.RegEx) ondersteunt alleen lookbehind met vaste lengte."]);
      const groups = (s.regex.match(/(^|[^\\])\((?!\?)/g) || []).length;
      if (groups > 1) out.push(["info", `${groups} capturing groups – overweeg (?: ) om alleen de waarde te matchen.`]);
      if (!(s.keywords || []).length) out.push(["warn", "Geen supporting keywords: een kale regex geeft vaak false positives."]);
    }
    if ((s.keywords || []).some((w) => w.length > 50)) out.push(["err", "Keyword langer dan 50 tekens."]);
    const short = (s.keywords || []).filter((w) => w && w.trim().length < 3);
    if (short.length) out.push(["warn", `Heel kort keyword (${short.map((w) => `‘${w}’`).join(", ")}) komt in veel woorden voor en geeft valse treffers.`]);
    if (s.proximity !== "" && s.proximity != null && (Number(s.proximity) < 1 || Number(s.proximity) > 10000)) out.push(["warn", "Character proximity buiten bereik (gebruikelijk 300)."]);
    if (s.high && s.high.keywords && !(s.keywords || []).length) out.push(["warn", "High confidence vereist keywords, maar er zijn geen keywords."]);
    return out;
  },
  /** Ruwe treffers (uit de worker) → confidence per treffer. */
  score(s, raw) {
    const res = { matches: [], error: raw.error || null, kws: raw.kws || [] };
    const prox = Number(s.proximity) > 0 ? Number(s.proximity) : 300;
    const minK = (s.high && s.high.minKeywords) || 1;
    const lvl = (near) => {
      if (s.high && s.high.keywords) { if (near >= minK) return "high"; return s.medium && s.medium.keywords === false ? "medium" : null; }
      return near ? "high" : "medium";
    };
    if (s.regex) (raw.matches || []).forEach((m) => { const near = res.kws.filter((k) => Math.abs(k.i - m.i) <= prox).length; res.matches.push({ ...m, near, level: lvl(near) }); });
    else res.kws.forEach((k) => res.matches.push({ i: k.i, len: k.len, near: 1, level: "high" }));
    return res;
  },
  resultHtml(s, text, raw) {
    if (raw.timeout) return msg("err", "Deze regex is te traag (catastrophic backtracking, bijv. (a+)+). Vereenvoudig het patroon – Purview weigert zulke patronen ook.");
    if (raw.unsupported) return msg("warn", "Testen is in deze browser niet beschikbaar (Web Worker geblokkeerd).");
    const r = this.score(s, raw);
    if (r.error) return msg("err", "Regex-fout: " + esc(r.error));
    const marks = [...r.matches.map((m) => ({ ...m, t: "hit" })), ...(s.regex ? r.kws.map((k) => ({ ...k, t: "kw" })) : [])].sort((a, b) => a.i - b.i);
    let html = "", pos = 0;
    marks.forEach((m) => { if (m.i < pos) return; html += esc(text.slice(pos, m.i)) + `<span class="regex-hit${m.t === "kw" ? " kw" : ""}">${esc(text.substr(m.i, m.len))}</span>`; pos = m.i + m.len; });
    html += esc(text.slice(pos));
    const n = { high: 0, medium: 0, none: 0 };
    r.matches.forEach((m) => n[m.level || "none"]++);
    const conf = Object.fromEntries(CATALOG.confidence.map((c) => [c[0], c[1]]));
    return `<div class="regex-box">${html}</div><div class="row tight mt-1">${r.matches.length ? "" : `<span class="badge neutral">Geen match</span>`}${n.high ? `<span class="badge ok">${n.high}× ${conf.high}</span>` : ""}${n.medium ? `<span class="badge warn">${n.medium}× ${conf.medium}</span>` : ""}${n.none ? `<span class="badge neutral" title="Patroon gevonden, maar zonder keyword in de buurt – telt niet mee.">${n.none}× patroon zonder keyword</span>` : ""}<span class="xs muted">Roze = patroon · geel = keyword</span></div>`;
  },
  /** Test asynchroon uitvoeren en het resultaat in #regex-out zetten. */
  runTest(id) {
    const s = sitById(id);
    const o = $("#regex-out");
    if (!s || !o) return;
    const text = sitTestText(id);
    const bsn = (UI.sitTest || {})[id] !== undefined && _looksLikeBsn(text) ? msg("warn", "Dit lijkt een echt BSN (het nummer haalt de elfproef). Gebruik verzonnen of geanonimiseerde nummers.") : "";
    if (!text) { o.innerHTML = `<p class="muted small">Plak voorbeeldtekst om te testen.</p>`; return; }
    if (!s.regex && !(s.keywords || []).filter(Boolean).length) { o.innerHTML = `<p class="muted small">Vul een regex of keywords in om te testen.</p>${bsn}`; return; }
    o.innerHTML = `<p class="muted small">Testen…</p>${bsn}`;
    RegexRunner.run({ regex: s.regex || "", kws: (s.keywords || []).filter(Boolean), text }, (raw) => {
      const o2 = $("#regex-out");
      if (o2 && sitTestText(id) === text) o2.innerHTML = this.resultHtml(s, text, raw) + bsn;
    });
  },
};

registerView("sits", {
  title: "Informatietypen",
  fac: {
    duration: 40,
    goal: "Per label vastleggen hoe Purview de inhoud herkent: built-in SIT’s, custom SIT’s, EDM, fingerprints en trainable classifiers.",
    questions: ["Welke informatietypen uit Know your Data horen bij welk label?", "Zijn er organisatie-specifieke nummers (personeels-, patiënt-, contractnummer) die een custom SIT of EDM vragen?", "Zijn er standaardformulieren die we met een fingerprint kunnen herkennen?"],
    tips: ["Sleep een kaart uit de bibliotheek op een label; of klik een kaart en daarna op een label (tap-to-place).", "Test custom regexen direct met echte (geanonimiseerde) voorbeeldtekst.", "EDM is het nauwkeurigst voor bekende populaties (patiënten, personeel)."],
    pitfalls: ["Een kale regex zonder keywords → veel false positives.", "Informatieobjecten zijn geen Purview-classifiers: koppel er een SIT of classifier bij.", "Fingerprints werken niet in de DLP-locatie Microsoft 365 Copilot."],
    links: ["sitDefinitions", "sitCustom", "edm", "fingerprint", "classifiers"],
  },
  done: (st) => applicableLabels(st).filter((l) => labelSits(l, st).length).length >= Math.min(2, applicableLabels(st).length) && st.sits.length > 0,
  render() {
    const st = S();
    const tab = UI.sub.sits || "map";
    const f = SitLib.filter(st);
    const cats = unique(SitLib.items(st).map((i) => i.catName).filter(Boolean));
    const secName = SECTOR_PHRASE[f.sector] || "jullie organisatie";
    const nLoose = SitLib.loose(st).size;
    const fchip = (on, a, label, title, cls = "") => `<button type="button" class="chip lib-fchip${on ? " on" : ""}${cls}" aria-pressed="${on}" ${a} title="${esc(title)}">${label}</button>`;
    const lib = `<div class="lib-panel" data-drop="sit" data-zone="sit-unlink" data-target='{}' role="region" aria-label="Bibliotheek (zet hier een gekoppeld type neer om het los te koppelen)"><div class="lib-unlink-ov" aria-hidden="true">${icon("x")}<b>Loslaten om los te koppelen</b><span class="xs">Het informatietype blijft in de bibliotheek staan.</span></div>
      <div class="lib-head"><h3>Bibliotheek</h3>${infoTip("Sleep een type op een label, of klik een type en daarna een label (Shift-klik = meerdere keren). Met + kies je het label uit een lijst. Sleep een gekoppeld type hierheen om het los te koppelen.")}<span class="spacer"></span><button class="btn small" data-action="sit-new-menu" aria-haspopup="menu">${icon("plus", "s")} Nieuw</button></div>
      <div class="lib-tools"><input class="input" type="search" placeholder="Zoek (bijv. BSN, IBAN, HR)…" aria-label="Zoek in de bibliotheek" value="${esc(f.q)}" data-live="lib-search">
        <select class="select" data-live="lib-cat" aria-label="Categorie"><option value="">Alle categorieën</option>${cats.map((c) => `<option${f.cat === c ? " selected" : ""}>${esc(c)}</option>`).join("")}</select>
        <label class="lib-sector" title="Sector voor de suggesties (alleen de bibliotheek; het ontwerp verandert niet)"><span class="xs muted">Sector</span><select class="select" data-live="lib-sector" aria-label="Sector voor de suggesties">${Object.entries(CATALOG.sitSectors || { generic: "Algemeen" }).map(([k, v]) => `<option value="${esc(k)}"${f.sector === k ? " selected" : ""}>${esc(v)}</option>`).join("")}</select></label></div>
      <div class="lib-fchips" role="group" aria-label="Filter op soort">${fchip(f.rec && !f.kind && !f.loose, `data-action="lib-rec" data-on="1"`, "Suggesties", `Startset die vaak past bij ${secName}`)}${fchip(!f.rec && !f.kind && !f.loose, `data-action="lib-kind" data-kind=""`, "Alle", "Alle soorten")}${["builtin", "custom", "edm", "fingerprint", "classifier", "object"].map((k) => fchip(f.kind === k, `data-action="lib-kind" data-kind="${k}"`, esc(CATALOG.sitKinds[k].short), SIT_KIND_PLAIN[k])).join("")}${nLoose ? fchip(f.loose, `data-action="lib-loose"`, `${icon("warning", "s")}Niet gekoppeld <span class="lib-group-n">${nLoose}</span>`, "In het ontwerp, maar nog aan geen label of DLP-regel gekoppeld", " warn") : ""}</div>
      <div class="lib-scroll lib-grid" id="lib-list">${SitLib.listHtml(st)}</div>
    </div>`;
    const nCustom = st.sits.filter((s) => s.kind === "custom").length;
    const nEdm = st.sits.filter((s) => s.kind === "edm" || s.kind === "fingerprint").length;
    const t = tabs("sits", [["map", "Koppelen aan labels"], ["list", "Overzicht", `<span class="badge neutral">${st.sits.length}</span>`], ["builder", "Custom SIT-bouwer", nCustom ? `<span class="badge neutral">${nCustom}</span>` : ""], ["edm", "EDM &amp; fingerprints", nEdm ? `<span class="badge neutral">${nEdm}</span>` : ""]], tab);
    let body = "";
    if (tab === "map") body = this.map(st, lib);
    else if (tab === "list") body = this.list(st);
    else if (tab === "builder") body = this.builder(st);
    else body = this.edm(st);
    return `${pageHead("Input · Know your Data", "Informatietypen", "Informatietypen bepalen waaraan Purview gevoelige inhoud herkent; ze sturen auto-labeling en DLP.", "", `<p class="mb-1">Koppel per label de typen die erbij horen. Die koppeling is de basis voor automatisch labelen en voor DLP-regels op ongelabelde inhoud. Deze app scant zelf geen gegevens: Purview herkent pas na inrichting. Test daarom eerst in simulatie.</p><div class="row tight">${learn("sitDefinitions", "SIT-definities")} ${learn("classifiers", "Classifiers")}</div>`)}
      ${t}${body}`;
  },
  map(st, lib) {
    const ls = orderedLabels(st);
    if (!ls.length) return VH.needLabels() + lib;
    const foc = UI.sitFocus && labelById(UI.sitFocus.labelId, st) ? UI.sitFocus : null;
    const backName = foc ? ({ autolabel: "Auto-labeling", board: "Integraal ontwerpbord", schema: "Classificatieschema", labels: "Label-instellingen" }[foc.back] || "") : "";
    const banner = foc ? `<div class="msg info sit-focus">${icon("info")}<div class="msg-body row tight between"><span>Koppel informatietypen aan <b>${esc(labelFullName(labelById(foc.labelId, st), st))}</b>: sleep ze op het omrande label of klik op +.</span>${backName ? `<button class="btn small" data-action="sit-focus-back">${icon("chevronleft", "s")} Terug naar ${esc(backName)}</button>` : ""}<button class="icon-btn small" data-action="sit-focus-done" title="Melding sluiten" aria-label="Melding sluiten">${icon("x", "s")}</button></div></div>` : "";
    const fl = UI.sitFlash && Date.now() - UI.sitFlash.at < 1500 ? UI.sitFlash : null;
    const MAX = 3;
    const open = UI.sitTileOpen || {};
    const tiles = ls.map((l) => {
      const p = parentOf(l, st);
      const own = (l.sits || []).map((id) => sitById(id, st)).filter(Boolean);
      const inh = p ? (p.sits || []).map((id) => sitById(id, st)).filter(Boolean) : [];
      const all = [...own.map((s) => [s, true]), ...inh.map((s) => [s, false])];
      let vis = open[l.id] ? all : all.slice(0, MAX);
      if (fl && fl.labelId === l.id && !vis.some(([s]) => s.id === fl.sitId)) vis = [...vis.slice(0, MAX - 1), ...all.filter(([s]) => s.id === fl.sitId)];
      const hidden = all.length - vis.length;
      const chip = (s) => `<span class="sit-drag${fl && fl.labelId === l.id && fl.sitId === s.id ? " chip-pop" : ""}" data-drag="sit" data-payload='${attr({ sitId: s.id, from: l.id })}' data-tap="1" data-pick-label="${esc(s.name)}" data-pick-hint="klik op een ander label om te verplaatsen, of op de bibliotheek om los te koppelen">${SitLib.chip(s, `<button class="chip-x" data-action="sit-unlink" data-label="${esc(l.id)}" data-sit="${esc(s.id)}" title="Loskoppelen" aria-label="${esc(s.name)} loskoppelen">×</button>`)}</span>`;
      const chips = vis.map(([s, mine]) => (mine ? chip(s) : `<span class="sit-inh" title="Geërfd van ${esc(p.displayName || p.name)}">${SitLib.chip(s)}</span>`)).join("");
      const more = hidden > 0 ? `<button type="button" class="st-more" data-action="sit-tile-more" data-id="${esc(l.id)}" aria-expanded="false" title="Alle ${all.length} tonen">+${hidden}</button>` : open[l.id] && all.length > MAX ? `<button type="button" class="st-more" data-action="sit-tile-more" data-id="${esc(l.id)}" aria-expanded="true">Minder</button>` : "";
      return `<div class="label-card sit-lbl sit-tile${l.parentId ? " sub" : ""}${foc && foc.labelId === l.id ? " focus" : ""}" id="sitlbl-${esc(l.id)}" style="--lc:${esc(l.color)}" data-drop="sit" data-zone="sit-to-label" data-target='${attr({ labelId: l.id })}' role="group" aria-label="${esc(labelFullName(l, st))}">
        <div class="sl-body"><div class="st-head"><span class="st-dot" aria-hidden="true"></span><div class="lc-title-wrap">${p ? `<div class="lc-parent">${esc(p.displayName || p.name)} /</div>` : ""}<div class="lc-title">${esc(l.displayName || l.name)}</div></div>
        <span class="st-n" title="${all.length} ${all.length === 1 ? "type" : "typen"}${inh.length ? `, waarvan ${inh.length} geërfd` : ""}">${all.length}</span>
        <button class="drop-hint" data-action="sit-pick" data-id="${esc(l.id)}" title="Informatietype kiezen" aria-label="Informatietype koppelen aan ${esc(labelFullName(l, st))}"><span class="dh-idle">${icon("plus", "s")}</span><span class="dh-drop" aria-hidden="true">${icon("target", "s")}</span></button></div>
        <div class="sit-chips chip-list">${chips || `<span class="st-empty">Sleep hierheen</span>`}${more}</div>
      </div></div>`;
    }).join("");
    if (foc && !foc.scrolled) { foc.scrolled = true; setTimeout(() => { const c = document.getElementById("sitlbl-" + foc.labelId); if (c && c.scrollIntoView) c.scrollIntoView({ block: "nearest" }); }, 30); }
    const nLinked = ls.filter((l) => labelSits(l, st).length).length;
    const coach = !foc && !SitCoach.seen("sit-map") ? `<div class="sit-hint sit-coach" role="note">${icon("grip", "s")}<span>Sleep een type naar een label, of klik het type en daarna een label</span>${infoTip("Al gekoppelde typen sleep je naar een ander label (verplaatsen) of terug naar de bibliotheek (loskoppelen). Toetsenbord: Tab naar het type, Enter, en kies ‘Kies uit lijst…’. Ctrl+Z maakt alles ongedaan. " + CATALOG.sitLimits.classifierLocations)}<button class="btn small subtle" data-action="sit-coach-done">Begrepen</button></div>` : "";
    return `${banner}
      <section class="sit-board" aria-label="Labels"><div class="sit-board-head"><h3>Labels</h3><span class="xs muted">${nLinked} van ${ls.length} met informatietypen</span><span class="spacer"></span>${coach}</div>
      <div class="sit-tiles">${tiles}</div></section>
      ${lib}`;
  },
  list(st) {
    if (!st.sits.length) return emptyState("search", "Nog geen informatietypen", "Koppel typen in ‘Koppelen aan labels’, of maak een custom SIT.");
    const rows = st.sits.map((s) => {
      const ls = st.labels.filter((l) => (l.sits || []).includes(s.id));
      const conf = s.kind === "builtin" || s.kind === "custom" || s.kind === "edm";
      return `<tr><td>${sitKindTag(s.kind)}</td><td><b>${esc(s.name)}</b><div class="xs muted">${esc(s.desc || "")}</div></td>
        <td>${conf ? _sitAria(F.select(`sit:${s.id}:confidence`, "", CATALOG.confidence.map((c) => [c[0], `${c[1]} (${c[2]})`]), { cls: "mb-0" }), `Confidence level ${s.name}`) : `<span class="xs muted">n.v.t.</span>`}</td>
        <td style="width:90px">${s.kind === "object" ? "" : _sitAria(F.number(`sit:${s.id}:minCount`, "", { min: 1, max: 500, cls: "mb-0" }), `Minimaal aantal ${s.name}`)}</td>
        <td>${ls.map((l) => `<button type="button" class="pill-link" data-action="go" data-route="labels" data-sub="${esc(l.id)}" title="Naar label-instellingen van ${esc(labelFullName(l, st))}">${labelPill(l, st)}</button>`).join(" ") || `<span class="xs muted">–</span>`}</td>
        <td class="num"><div class="row tight"><button class="icon-btn small" data-action="sit-edit" data-id="${esc(s.id)}" title="Bewerken" aria-label="${esc(s.name)} bewerken">${icon("edit", "s")}</button><button class="icon-btn small danger" data-action="sit-del" data-id="${esc(s.id)}" title="Verwijderen" aria-label="${esc(s.name)} verwijderen">${icon("trash", "s")}</button></div></td></tr>`;
    }).join("");
    return `<div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Soort</th><th>Naam</th><th>Confidence level ${infoTip("Minimaal betrouwbaarheidsniveau in auto-labeling en DLP-regels (High 85 · Medium 75 · Low 65). High = minste false positives.")}</th><th>Min. aantal ${infoTip("Instance count: minimaal aantal keren dat het type moet voorkomen (bijv. 1 BSN vs. lijst met ≥10 BSN’s).")}</th><th>Labels</th><th><span class="sr-only">Acties</span></th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  },
  builder(st) {
    const list = st.sits.filter((s) => s.kind === "custom");
    const s = list.find((x) => x.id === UI.sitEdit) || list[0];
    const pick = `<div class="chip-list mb-2">${list.map((x) => `<button class="chip${s && s.id === x.id ? " on" : ""}" style="cursor:pointer" data-action="sit-edit" data-id="${esc(x.id)}" title="${esc(x.name)}">${icon("regex", "s")}${esc(x.name)}</button>`).join("")}<button class="chip" style="cursor:pointer" data-action="sit-new" data-kind="custom">${icon("plus", "s")}Nieuw</button></div>`;
    if (!s) return pick + emptyState("regex", "Nog geen custom SIT’s", "Maak een custom SIT, of koppel een sjabloon (bijv. Personeelsnummer) in ‘Koppelen aan labels’.", `<button class="btn primary" data-action="sit-new" data-kind="custom">${icon("plus")} Custom SIT</button>`);
    const pre = `sit:${s.id}:`;
    const iss = SitBuilder.issues(s);
    const linked = st.labels.filter((l) => (l.sits || []).includes(s.id)).map((l) => l.displayName || l.name);
    setTimeout(() => SitBuilder.runTest(s.id), 0);
    return `${pick}<div class="card"><div class="card-head">${icon("regex")}<h3>${esc(s.name)}</h3>${learn("sitCustom")}</div>
      <p class="xs muted mb-1">${linked.length ? `Gekoppeld aan: ${esc(linked.join(", "))}` : `Nog niet gekoppeld aan een label. <button class="link-btn" data-action="sit-add" data-payload='${attr({ sitId: s.id })}'>Koppelen…</button>`}</p>
      <div class="grid grid-2" style="gap:0 14px">${F.text(pre + "name", "Name", { render: true, maxlength: 256 })}${F.text(pre + "desc", "Description")}</div>
      <div class="section-title mt-1">Primary element</div>
      <div class="field"><label for="sit-regex">Regular expression ${infoTip(CATALOG.sitLimits.regexLimits)}</label><input id="sit-regex" class="input mono" type="text" data-bind="${esc(pre)}regex" data-live="sit-test" data-id="${esc(s.id)}" value="${esc(s.regex || "")}" placeholder="\\b\\d{7}\\b"></div>
      <div class="section-title mt-1">Supporting elements</div>
      <div class="grid grid-2" style="gap:0 14px">
        ${F.text(pre + "keywords", "Keyword list (komma-gescheiden)", { type: "csv", hint: "Hoofdletterongevoelig; max. 50 tekens per keyword." })}
        ${F.number(pre + "proximity", "Character proximity", { min: 1, max: 10000, hint: "Afstand (tekens) tussen patroon en keyword. Standaard 300." })}
      </div>
      <div class="section-title mt-1">Patterns &amp; confidence levels</div>
      <div class="grid grid-2" style="gap:0 14px">
        <div class="card flat"><b>High confidence (85)</b>${F.check(pre + "high.keywords", "Regex + keyword in de buurt", {})}${F.number(pre + "high.minKeywords", "Min. aantal unieke keywords", { min: 1, max: 20, inline: true })}</div>
        <div class="card flat"><b>Medium confidence (75)</b>${F.check(pre + "medium.keywords", "Alleen regex (zonder keyword) telt als Medium", { invert: true })}<div class="hint">Laat uit om false positives te beperken.</div></div>
      </div>
      <div class="field mt-1"><label for="sit-testtext">Testtekst <span class="xs muted">(wordt niet opgeslagen)</span></label><textarea id="sit-testtext" class="textarea" rows="4" maxlength="5000" data-live="sit-test-text" data-id="${esc(s.id)}" placeholder="Plak hier voorbeeldtekst…">${esc(sitTestText(s.id))}</textarea><div class="hint">Gebruik verzonnen of geanonimiseerde tekst – geen echte BSN’s of patiëntgegevens.</div></div>
      <div id="regex-out"><p class="muted small">${sitTestText(s.id) ? "Testen…" : "Plak voorbeeldtekst om te testen."}</p></div>
      <div id="regex-issues" class="mt-1">${iss.map(([k, t]) => msg(k, esc(t))).join("")}</div>
      <details class="acc mt-2 tech-only" data-acc="sits-howto"><summary>Technische details: zo maak je dit in Purview</summary><div class="acc-body small"><ol class="tight"><li>Purview-portal › Information Protection › Classifiers › Sensitive info types › <b>Create sensitive info type</b>.</li><li>Name/Description → Pattern: primary element <i>Regular expression</i>, supporting element <i>Keyword list</i>, character proximity.</li><li>Maak een pattern per confidence level (High met keywords; Medium alleen regex indien gewenst).</li><li>Kies het <i>recommended confidence level</i> en test met <b>Test</b> op een voorbeeldbestand.</li></ol>Of via PowerShell met een XML rule package (<code>New-DlpSensitiveInformationTypeRulePackage</code>) – zie de PowerShell-export.</div></details>
    </div>`;
  },
  edm(st) {
    const edms = st.sits.filter((s) => s.kind === "edm");
    const fps = st.sits.filter((s) => s.kind === "fingerprint");
    const s = edms.find((x) => x.id === UI.sitEdit) || edms[0];
    const sitNames = `<datalist id="sit-names">${unique([...CATALOG.builtinSits.map((x) => x.name), ...st.sits.filter((x) => x.kind === "custom" || x.kind === "builtin").map((x) => x.name)]).map((n) => `<option value="${esc(n)}">`).join("")}</datalist>`;
    let edm = `<div class="chip-list mb-2">${edms.map((x) => `<button class="chip${s && s.id === x.id ? " on" : ""}" style="cursor:pointer" data-action="sit-edit" data-id="${esc(x.id)}" title="${esc(x.name)}">${icon("database", "s")}${esc(x.name)}</button>`).join("")}<button class="chip" style="cursor:pointer" data-action="sit-new" data-kind="edm">${icon("plus", "s")}Nieuw EDM-schema</button></div>`;
    if (s) {
      const fields = s.fields || [];
      const nS = fields.filter((x) => x.searchable).length;
      edm += `<div class="card"><div class="card-head">${icon("database")}<h3>${esc(s.name)}</h3>${learn("edm")}</div>
        <div class="grid grid-2" style="gap:0 14px">${F.text(`sit:${s.id}:name`, "Name", { render: true })}${F.text(`sit:${s.id}:desc`, "Description / bron")}</div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Kolom (schema field)</th><th>Searchable ${infoTip("Op searchable fields wordt gezocht (primary element). Kies 1–10 velden met unieke waarden, bijv. BSN of patiëntnummer. Overige velden zijn corroborative evidence.")}</th><th>Gekoppelde SIT ${infoTip("Een searchable field moet aan een SIT (built-in of custom) gekoppeld zijn die de waarde in tekst vindt.")}</th><th><span class="sr-only">Acties</span></th></tr></thead><tbody>
        ${fields.map((x, i) => `<tr><td>${_sitAria(F.text(`sit:${s.id}:fields.${i}.name`, "", { cls: "mb-0", mono: true }), `Kolomnaam ${i + 1}`)}</td><td>${_sitAria(F.check(`sit:${s.id}:fields.${i}.searchable`, "", {}), `Kolom ${x.name || i + 1} searchable`)}</td><td>${x.searchable ? _sitAria(F.text(`sit:${s.id}:fields.${i}.sit`, "", { cls: "mb-0", list: "sit-names", ph: "Kies SIT…" }), `Gekoppelde SIT voor ${x.name || "kolom " + (i + 1)}`) : `<span class="xs muted">–</span>`}</td><td><button class="icon-btn small danger" data-action="edm-field-del" data-id="${esc(s.id)}" data-i="${i}" title="Kolom verwijderen" aria-label="Kolom ${esc(x.name || String(i + 1))} verwijderen">${icon("trash", "s")}</button></td></tr>`).join("")}
        </tbody></table></div>${sitNames}
        <div class="row mt-1"><button class="btn small" data-action="edm-field-add" data-id="${esc(s.id)}">${icon("plus", "s")} Kolom</button><span class="spacer"></span><span class="badge ${nS >= 1 && nS <= 10 ? "ok" : "err"}">${nS} searchable</span></div>
        ${fields.some((x) => x.searchable && !x.sit) ? msg("warn", "Koppel elk searchable field aan een SIT; anders kan EDM de waarde niet vinden.") : ""}
        <p class="xs muted mt-1">${icon("lock", "s")} EDM gebruikt alleen gehashte waarden; neem minimaal nodige kolommen op (bijv. BSN + geboortedatum, geen diagnose) en leg dit vast in de DPIA.</p>
        <details class="acc mt-2 tech-only" data-acc="sits-edm-howto"><summary>Technische details: zo werkt EDM in Purview</summary><div class="acc-body small"><p class="mb-1">${esc(CATALOG.sitLimits.edmLocations)}</p><ol class="tight"><li>Schema maken (deze kolommen).</li><li>Gegevens hashen en uploaden met de EDM Upload Agent.</li><li>EDM-SIT maken (primary element = searchable field).</li><li>Gebruiken in auto-labeling en DLP.</li></ol></div></details>
      </div>`;
    } else edm += emptyState("database", "Nog geen EDM-schema", "Gebruik EDM voor bekende populaties (patiënten, medewerkers, klanten). Koppel een sjabloon in ‘Koppelen aan labels’ of maak een nieuw schema.");
    const fp = `<div class="section"><div class="section-title">${icon("fingerprint")} Document fingerprints<span class="spacer"></span>${learn("fingerprint")}</div>
      ${msg("warn", esc(CATALOG.sitLimits.copilotFingerprint))}
      ${fps.length ? `<div class="grid grid-2">${fps.map((x) => `<div class="card flat">${F.text(`sit:${x.id}:name`, "Name", { render: true })}${F.text(`sit:${x.id}:desc`, "Sjabloon / bronbestand")}<div class="row tight"><span class="xs muted">Gekoppeld aan: ${st.labels.filter((l) => (l.sits || []).includes(x.id)).map((l) => esc(labelFullName(l, st))).join(", ") || "–"}</span><span class="spacer"></span><button class="icon-btn small danger" data-action="sit-del" data-id="${esc(x.id)}" title="Verwijderen" aria-label="${esc(x.name)} verwijderen">${icon("trash", "s")}</button></div></div>`).join("")}</div>` : `<p class="muted small">Fingerprints herkennen standaardformulieren (leeg sjabloon als basis). <span class="tech-only">${infoTip("Maken in de portal (Windows-bestand uploaden) of met PowerShell: New-DlpFingerprint + New-DlpSensitiveInformationType.")}</span></p>`}
      <button class="btn small" data-action="sit-new" data-kind="fingerprint">${icon("plus", "s")} Fingerprint</button></div>`;
    return edm + fp;
  },
});

Actions["lib-kind"] = (el) => { UI.libFilter.kind = el.dataset.kind || ""; UI.libFilter.loose = false; if (!UI.libFilter.kind) UI.libFilter.rec = false; UI.libLimit = 0; App.render(); };
Actions["lib-kind-sel"] = (el) => { UI.libFilter.kind = el.value || ""; UI.libFilter.loose = false; if (!UI.libFilter.kind) UI.libFilter.rec = false; UI.libLimit = 0; App.render(); };
Actions["lib-rec"] = (el) => { const on = el.dataset.on === "1"; UI.libFilter.rec = on; UI.libFilter.loose = false; if (on) { UI.libFilter.kind = ""; UI.libFilter.cat = ""; } UI.libLimit = 0; App.render(); };
Actions["lib-loose"] = () => { UI.libFilter.loose = !UI.libFilter.loose; UI.libFilter.kind = ""; UI.libLimit = 0; App.render(); };
Actions["lib-sector"] = (el) => { UI.libFilter.sector = el.value || ""; UI.libFilter.rec = true; UI.libFilter.loose = false; UI.libFilter.kind = ""; UI.libFilter.cat = ""; UI.libLimit = 0; App.render(); };
Actions["sit-tile-more"] = (el) => { UI.sitTileOpen = UI.sitTileOpen || {}; UI.sitTileOpen[el.dataset.id] = !UI.sitTileOpen[el.dataset.id]; App.render(); };
Actions["lib-more"] = () => { UI.libLimit = Math.max(SitLib.PAGE, UI.libLimit || 0) + SitLib.PAGE; const box = $("#lib-list"); const top = box ? box.scrollTop : 0; _libRefresh(); if (box) box.scrollTop = top; };
Actions["lib-cat"] = (el) => { UI.libFilter.cat = el.value || ""; UI.libLimit = 0; _libRefresh(); };
Actions["lib-search"] = (el) => { UI.libFilter.q = el.value; UI.libLimit = 0; _libRefresh(); };
function _libRefresh() { const box = $("#lib-list"); if (box) { box.innerHTML = SitLib.listHtml(S()); DnD.refresh(); } }
Actions["sit-test"] = () => setTimeout(() => {
  const s = sitById(UI.sitEdit) || S().sits.find((x) => x.kind === "custom");
  if (!s) return;
  clearTimeout(Actions._sitT); Actions._sitT = setTimeout(() => SitBuilder.runTest(s.id), 150);
  const i = $("#regex-issues"); if (i) i.innerHTML = SitBuilder.issues(s).map(([k, t]) => msg(k, esc(t))).join("");
}, 0);
Actions["sit-test-text"] = (el) => {
  const id = el.dataset.id;
  UI.sitTest = UI.sitTest || {};
  UI.sitTest[id] = String(el.value || "").slice(0, 5000);
  clearTimeout(Actions._sitT); Actions._sitT = setTimeout(() => SitBuilder.runTest(id), 150);
};
Actions["sit-add"] = (el) => {
  const payload = JSON.parse(el.dataset.payload);
  const apps = orderedLabels().filter((l) => sitCanLink(l.id, payload));
  if (!orderedLabels().length) { Toast.show("Maak eerst labels in het classificatieschema.", "warn"); return; }
  if (!apps.length) { Menu.open(el, [{ icon: "info", label: "Al gekoppeld aan alle labels" }]); return; }
  const cur = apps.find((l) => l.id === UI.selLabel) || apps.find((l) => l.id === UI.sub.schema);
  Menu.open(el, [...(cur ? [{ icon: "star", label: `Aan ${labelFullName(cur)}`, desc: "Laatst geselecteerd label", fn: () => linkSit(cur.id, payload) }, "-"] : []), ...apps.map((l) => ({ icon: "tag", label: labelFullName(l), fn: () => { UI.selLabel = l.id; linkSit(l.id, payload); } }))]);
};
Actions["sit-unlink"] = (el) => unlinkSit(el.dataset.label, el.dataset.sit);
Actions["sit-new-menu"] = (el) => Menu.open(el, ["custom", "edm", "fingerprint", "object"].map((kind) => {
  const k = CATALOG.sitKinds[kind] || {};
  return { icon: k.icon || "plus", label: k.short || kind, desc: SIT_KIND_PLAIN[kind] || "", fn: () => Actions["sit-new"]({ dataset: { kind } }) };
}));
Actions["sit-coach-done"] = () => { SitCoach.done("sit-map"); App.render(); };
Actions["sit-pick"] = (el) => {
  if (DnD.pick) return;
  const st = S();
  const l = labelById(el.dataset.id, st);
  if (!l) return;
  const have = new Set(labelSits(l, st).map((x) => x.id));
  const items = SitLib.filtered(st).filter((it) => !(it.sitId && have.has(it.sitId))).slice(0, 12);
  Menu.open(el, [...items.map((it) => ({ icon: (CATALOG.sitKinds[it.kind] || {}).icon || "search", label: it.name, desc: it.catName || "", fn: () => linkSit(l.id, it.sitId ? { sitId: it.sitId } : { kind: it.kind, ref: it.ref }) })),
    ...(items.length ? ["-"] : []), { icon: "search", label: "Zoek in de bibliotheek…", fn: () => { const q = $("#main [data-live=lib-search]"); if (q) q.focus(); } }]);
};
Actions["sit-focus-back"] = () => { const f = UI.sitFocus; UI.sitFocus = null; App.go(f && f.back ? f.back : "board"); };
Actions["sit-focus-done"] = () => { UI.sitFocus = null; App.render(); };
Actions["sit-edit"] = (el) => {
  const s = sitById(el.dataset.id);
  if (!s) return;
  UI.sitEdit = s.id;
  if (s.kind === "custom") { UI.sub.sits = "builder"; App.render(); }
  else if (s.kind === "edm" || s.kind === "fingerprint") { UI.sub.sits = "edm"; App.render(); }
  else Actions["sit-edit-object"](el);
};
Actions["sit-edit-object"] = (el) => {
  const id = el.dataset.id;
  Drawer.open({
    title: () => (sitById(id) || {}).name || "Informatietype", icon: "search", narrow: true,
    render: () => {
      const s = sitById(id);
      if (!s) return null;
      const k = CATALOG.sitKinds[s.kind] || {};
      return `${sitKindTag(s.kind)}<p class="small muted">${esc(k.desc || "")}</p>
        ${s.ref ? `<p class="small"><b>Purview-naam:</b> ${esc(s.name)}</p>` : _sitLive(F.text(`sit:${id}:name`, "Naam"))}
        ${_sitLive(F.textarea(`sit:${id}:desc`, "Beschrijving / toelichting", { rows: 3 }))}
        ${s.kind === "builtin" ? F.select(`sit:${id}:confidence`, "Confidence level", CATALOG.confidence.map((c) => [c[0], `${c[1]} (${c[2]})`])) + F.number(`sit:${id}:minCount`, "Minimaal aantal (instance count)", { min: 1, max: 500 }) : ""}
        ${s.kind === "classifier" ? msg("info", esc(((CATALOG.classifiers.find((x) => x.id === s.ref) || {}).nl ? "Deze classifier ondersteunt ook Nederlands (minimaal 6 woorden) en is vooral bedoeld voor Communication Compliance." : CATALOG.classifierLangHint) || "") + " " + esc(CATALOG.sitLimits.classifierLocations)) : ""}
        ${s.kind === "builtin" && ((CATALOG.builtinSits.find((x) => x.id === s.ref) || {}).hint) ? msg("info", esc(CATALOG.builtinSits.find((x) => x.id === s.ref).hint)) : ""}
        ${s.kind === "object" ? msg("warn", "Informatieobject: geen Purview-classifier. Gebruik dit als geheugensteun en koppel er SIT’s of classifiers bij.") : ""}
        ${s.kind === "builtin" ? learn("sitDefinitions", "Definitie op Microsoft Learn") : ""}`;
    },
  });
};
Actions["sit-del"] = (el) => {
  const s = sitById(el.dataset.id);
  if (!s) return;
  confirmDialog(`‘${s.name}’ verwijderen?`, "Het informatietype wordt ontkoppeld van alle labels en DLP-regels.", () => Store.update((st) => {
    st.sits = st.sits.filter((x) => x.id !== s.id);
    st.labels.forEach((l) => (l.sits = (l.sits || []).filter((x) => x !== s.id)));
    (st.customDlp || []).forEach((c) => (c.rules || []).forEach((r) => (r.sits = (r.sits || []).filter((x) => x !== s.id))));
  }), "Verwijderen", true);
};
Actions["sit-new"] = (el) => {
  const kind = el.dataset.kind;
  const defs = {
    custom: { name: "Nieuwe custom SIT", regex: "", keywords: [], proximity: 300, high: { keywords: true, minKeywords: 1 }, medium: { keywords: true } },
    edm: { name: "EDM – Nieuw schema", fields: [{ name: "Kolom1", searchable: true, sit: "" }, { name: "Kolom2", searchable: false }], confidence: "high" },
    fingerprint: { name: "Fingerprint – Nieuw sjabloon", confidence: "" },
    object: { name: "Nieuw informatieobject", confidence: "" },
  }[kind];
  if (!defs) return;
  let id;
  Store.update((st) => { const s = makeSit(kind, null, Object.assign({ sector: st.meta.sector || "generic" }, clone(defs))); st.sits.push(s); id = s.id; });
  UI.sitEdit = id;
  if (kind === "custom") UI.sub.sits = "builder"; else if (kind === "edm" || kind === "fingerprint") UI.sub.sits = "edm"; else UI.sub.sits = "list";
  App.render();
  if (kind === "object") Actions["sit-edit-object"]({ dataset: { id } });
};
/** Voegt een aria-label toe aan het eerste formulierelement in een F-helper (velden zonder zichtbaar label in tabellen). */
function _sitAria(html, label) { return html.replace(/<(input|select|textarea) /, `<$1 aria-label="${esc(label)}" `); }
/** Drawer-velden: hoofdweergave live bijwerken zonder de drawer (en de focus) opnieuw te tekenen. */
function _sitLive(html) { return html.replace(/<(input|textarea) /, `<$1 data-live="sit-obj-live" `); }
Actions["sit-obj-live"] = () => setTimeout(() => {
  const main = $("#main");
  if (!main || UI.route !== "sits" || !Views.sits) return;
  const top = main.scrollTop, lib = $(".lib-scroll", main), libTop = lib ? lib.scrollTop : 0;
  const open = {}; $$("details[data-acc]", main).forEach((d) => { open[d.dataset.acc] = d.open; });
  main.innerHTML = Views.sits.render();
  $$("details[data-acc]", main).forEach((d) => { if (d.dataset.acc in open) d.open = open[d.dataset.acc]; });
  main.scrollTop = top; const lib2 = $(".lib-scroll", main); if (lib2) lib2.scrollTop = libTop;
  DnD.refresh();
}, 0);
Actions["edm-field-add"] = (el) => Store.update((st) => { const s = sitById(el.dataset.id, st); s.fields = s.fields || []; s.fields.push({ name: `Kolom${s.fields.length + 1}`, searchable: false }); });
Actions["edm-field-del"] = (el) => Store.update((st) => { const s = sitById(el.dataset.id, st); s.fields.splice(Number(el.dataset.i), 1); });
