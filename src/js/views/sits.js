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
/** Eigen typen: zelf te maken en te bewerken (filter ‘Eigen typen’, editor in het zijpaneel). */
const SIT_OWN_KINDS = ["custom", "edm", "fingerprint"];

const SitLib = {
  PAGE: 80,
  GROUP: 8,
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
    return { q: f.q || "", kind: f.kind === "all" ? "" : f.kind || "", cat: f.cat === "all" ? "" : f.cat || "", region: f.region || "", rec: f.rec !== false, sector, loose: !!f.loose && this.loose(st).size > 0 };
  },
  kindMatch(it, k) { return !k || (k === "own" ? SIT_OWN_KINDS.includes(it.kind) : it.kind === k); },
  /** Landen/regio’s uit de catalogus met aantallen: NL, EU en BE eerst, daarna alfabetisch. */
  regions() {
    const n = {};
    CATALOG.builtinSits.forEach((c) => { if (c.region) n[c.region] = (n[c.region] || 0) + 1; });
    const name = (k) => (CATALOG.sitRegions || {})[k] || k;
    const top = ["NL", "EU", "BE"];
    return Object.keys(n).sort((a, b) => {
      const ia = top.indexOf(a), ib = top.indexOf(b);
      if (ia >= 0 || ib >= 0) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      return name(a).localeCompare(name(b), "nl");
    }).map((k) => [k, name(k), n[k]]);
  },
  /** Zichtbare filters actief (dan geen ‘Aanbevolen’-startset). */
  narrowed(f) { return !!(f.q.trim() || f.kind || f.cat || f.region || f.loose); },
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
    const fold = (x) => String(x).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const terms = fold(f.q).split(/\s+/).filter(Boolean);
    const sector = f.sector;
    const rec = f.rec && !this.narrowed(f) && !ignoreRec;
    const loose = f.loose ? this.loose(st) : null;
    const rank = (it) => (it.own ? 0 : this.relevant(it, sector) ? 1 : it.sector === "generic" && !(it.sectors || []).length ? 2 : 3);
    const hay = (it) => fold(`${it.name} ${it.desc} ${it.catName || ""} ${it.regionName || ""} ${it.region || ""} ${(it.sectors || []).map((x) => (CATALOG.sitSectors || {})[x] || x).join(" ")}`);
    return this.items(st).filter((it) => (!loose || (it.sitId && loose.has(it.sitId))) && this.kindMatch(it, f.kind) && (!f.cat || it.catName === f.cat) && (!f.region || it.region === f.region) && (!rec || this.isRec(it, st)) && (!terms.length || ((h) => terms.every((t) => h.includes(t)))(hay(it))))
      .map((it, i) => [it, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map((x) => x[0]);
  },

  card(it, st = S(), star = false) {
    const users = it.sitId ? st.labels.filter((l) => (l.sits || []).includes(it.sitId)) : [];
    const used = users.length > 0;
    const payload = it.sitId ? { sitId: it.sitId } : { kind: it.kind, ref: it.ref };
    const meta = [it.catName, it.kind === "builtin" ? "" : SECTOR_NAMES[it.sector] || ""].filter(Boolean).join(" · ");
    const linked = used ? users.map((l) => l.displayName || l.name).join(", ") : "";
    const kind = CATALOG.sitKinds[it.kind] || {};
    const cat = it.kind === "builtin" ? `cat-${it.cat || "generic"}` : SIT_OWN_KINDS.includes(it.kind) ? "cat-own" : `cat-${it.kind}`;
    const tag = it.kind === "builtin" ? `<span class="kind-tag kind-builtin" role="img" aria-label="${esc(kind.short)}" title="${esc(kind.short + " – " + SIT_KIND_PLAIN.builtin)}">${icon(kind.icon, "s")}</span>` : `<span class="kind-tag kind-${esc(it.kind)}" title="${esc(SIT_KIND_PLAIN[it.kind] || kind.desc || "")}">${icon(kind.icon || "search", "s")}${esc(kind.short || "")}</span>`;
    const lang = it.kind === "classifier" ? (it.nl ? `<span class="lib-lang" title="Ondersteunt ook Nederlands">NL</span>` : it.langs === "taalonafhankelijk" ? `<span class="lib-lang" title="Taalonafhankelijk">code</span>` : "") : "";
    const reg = it.kind === "builtin" && it.region ? `<span class="lib-region" title="${esc(it.regionName || it.region)}">${esc(it.region)}</span>` : "";
    const edit = it.sitId && (SIT_OWN_KINDS.includes(it.kind) || it.own) ? `<button class="icon-btn small no-drag" data-action="sit-edit" data-id="${esc(it.sitId)}" title="Bewerken" aria-label="${esc(it.name)} bewerken">${icon("edit", "s")}</button>` : "";
    return `<div class="lib-card ${cat}${used ? " used" : ""}" data-drag="sit" data-payload='${attr(payload)}' data-tap="1" data-pick-label="${esc(it.name)}" data-pick-hint="klik op een label om te koppelen" title="${esc(it.name + (it.regionName ? ` (${it.regionName})` : "") + (it.desc ? " – " + it.desc : ""))}">
      <span class="lib-grip" aria-hidden="true">${icon("grip", "s")}</span>
      <div class="lib-main"><span class="lib-title">${esc(it.name)}</span>
      <div class="lib-meta">${tag}${reg}${lang}${used ? `<span class="lib-linked" title="Gekoppeld aan: ${esc(linked)}"><span class="lib-dots" aria-hidden="true">${users.slice(0, 5).map((l) => `<i style="--lc:${esc(l.color)}"></i>`).join("")}</span><span class="ellipsis">${esc(linked)}</span></span>` : meta ? `<span class="ellipsis">${esc(meta)}</span>` : ""}</div></div>
      ${star ? `<span class="lib-star" title="Past vaak bij ${esc(this.sectorName(st))}">${icon("star", "s")}</span>` : ""}${edit}<button class="icon-btn small no-drag" data-action="sit-add" data-payload='${attr(payload)}' title="Koppelen aan een label" aria-label="${esc(it.name)} koppelen aan een label">${icon("plus", "s")}</button>
    </div>`;
  },
  listHtml(st = S()) {
    let items = this.filtered(st);
    const f = this.filter(st);
    const recOn = f.rec && !this.narrowed(f);
    const all = recOn ? this.filtered(st, true).length : 0;
    const more = recOn && all > items.length ? `<button class="btn small subtle mt-1" data-action="lib-rec" data-on="0">Toon alle ${all} typen</button>` : "";
    if (!items.length) return `<div class="lib-none"><p class="muted small">Niets gevonden${f.q.trim() ? ` voor ‘${esc(f.q.trim())}’` : ""}.${f.region || f.cat || f.kind ? ` <button class="link-btn" data-action="lib-reset">Filters wissen</button>` : ""}</p><p class="small">Staat het er niet tussen? <button class="btn small" data-action="sit-new-open">${icon("plus", "s")} Eigen type maken</button></p></div>${more}`;
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
    const star = (it) => this.card(it, st, !recOn && !it.own && this.relevant(it, f.sector) && f.sector !== "generic");
    const head = (g, all) => `<div class="lib-group" role="heading" aria-level="4">${esc(g)}<span class="lib-group-n">${counts[g]}</span>${all ? `<span class="spacer"></span><button type="button" class="link-btn lib-group-all" data-action="lib-cat-go" data-cat="${esc(g)}">Alle ${counts[g]} tonen</button>` : ""}</div>`;
    // Veel typen zonder zoekterm: per categorie een preview, zodat elke categorie zichtbaar blijft.
    if (group && !f.q.trim() && items.length > this.PAGE) {
      return `<p class="xs muted lib-count">${items.length} typen in ${order.length} categorieën · zoek of kies een categorie voor alles</p>` + order.map((g) => {
        const gi = items.filter((it) => (it.catName || "Overig") === g);
        const many = g !== "Eigen" && gi.length > this.GROUP;
        return head(g, many) + (many ? gi.slice(0, this.GROUP) : gi).map(star).join("");
      }).join("") + more;
    }
    let last = null;
    const html = items.slice(0, limit).map((it) => {
      const g = it.catName || "Overig";
      const h = group && g !== last ? head(g, false) : "";
      last = g;
      return h + star(it);
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

/** Eén pagina: labels bovenaan, bibliotheek eronder. Eigen typen (custom SIT, EDM, fingerprint) via ‘+ Eigen type’ in een dialoog en bewerken in een zijpaneel.
    Oude subpagina’s (App.go('sits', 'list' | 'builder' | 'edm' …)) openen het overzicht of de editor. */
const SIT_NEW_OPTS = [
  ["custom", "Custom SIT", "Eigen nummer of code met een vast patroon.", "Bijv. personeelsnummer, dossiernummer of klantnummer."],
  ["edm", "Exact data match (EDM)", "Exacte waarden uit een eigen bronbestand.", "Bijv. het patiënten-, personeels- of klantenregister."],
  ["fingerprint", "Document fingerprint", "Documenten die op een standaardformulier zijn gebaseerd.", "Bijv. een arbeidsovereenkomst of intakeformulier."],
];
const SitOverview = {
  open() { Drawer.open({ title: "Overzicht informatietypen", icon: "table", render: () => this.body(S()) }); },
  body(st) {
    if (!st.sits.length) return `<div class="sit-ov">${emptyState("search", "Nog geen informatietypen", "Koppel typen uit de bibliotheek aan een label, of maak een eigen type.")}</div>`;
    const rows = st.sits.map((s) => {
      const ls = st.labels.filter((l) => (l.sits || []).includes(s.id));
      const conf = s.kind === "builtin" || s.kind === "custom" || s.kind === "edm";
      return `<tr><td>${sitKindTag(s.kind)}</td><td><b>${esc(s.name)}</b>${s.desc ? `<div class="xs muted">${esc(s.desc)}</div>` : ""}</td>
        <td>${conf ? _sitAria(F.select(`sit:${s.id}:confidence`, "", CATALOG.confidence.map((c) => [c[0], `${c[1]} (${c[2]})`]), { cls: "mb-0" }), `Confidence level ${s.name}`) : `<span class="xs muted">n.v.t.</span>`}</td>
        <td class="sit-ov-n">${s.kind === "object" ? "" : _sitAria(F.number(`sit:${s.id}:minCount`, "", { min: 1, max: 500, cls: "mb-0" }), `Minimaal aantal ${s.name}`)}</td>
        <td>${ls.map((l) => `<button type="button" class="pill-link" data-action="go" data-route="labels" data-sub="${esc(l.id)}" title="Naar label-instellingen van ${esc(labelFullName(l, st))}">${labelPill(l, st)}</button>`).join(" ") || `<span class="xs muted">–</span>`}</td>
        <td class="num"><div class="row tight nowrap"><button class="icon-btn small" data-action="sit-edit" data-id="${esc(s.id)}" title="Bewerken" aria-label="${esc(s.name)} bewerken">${icon("edit", "s")}</button><button class="icon-btn small danger" data-action="sit-del" data-id="${esc(s.id)}" title="Verwijderen" aria-label="${esc(s.name)} verwijderen">${icon("trash", "s")}</button></div></td></tr>`;
    }).join("");
    return `<div class="sit-ov"><p class="small muted mb-1">Alle ${st.sits.length} informatietypen in het ontwerp. Het confidence level en het minimaal aantal gelden in auto-labeling en DLP.</p>
      <div class="table-wrap"><table class="table"><thead><tr><th>Soort</th><th>Naam</th><th>Confidence level ${infoTip("Minimaal betrouwbaarheidsniveau in auto-labeling en DLP-regels (High 85 · Medium 75 · Low 65). High = minste false positives.")}</th><th>Min. aantal ${infoTip("Instance count: minimaal aantal keren dat het type moet voorkomen (bijv. 1 BSN vs. lijst met ≥10 BSN’s).")}</th><th>Labels</th><th><span class="sr-only">Acties</span></th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  },
};
const SitNew = {
  open() {
    const n = CATALOG.customSitTemplates.length + CATALOG.edmTemplates.length + CATALOG.fingerprintTemplates.length;
    Modal.open({
      title: `${icon("plus")} Eigen informatietype`,
      wide: true,
      body: `<p class="mb-2">Staat wat jullie zoeken niet in de bibliotheek? Maak dan een eigen type. Kies wat het beste past:</p>
        <div class="sit-new-grid">${SIT_NEW_OPTS.map(([k, t, d, ex]) => `<button type="button" class="sit-new-opt kind-${k}" data-action="sit-new" data-kind="${k}"><span class="sno-ico" aria-hidden="true">${icon(CATALOG.sitKinds[k].icon)}</span><b>${esc(t)}</b><span class="small">${esc(d)}</span><span class="xs muted">${esc(ex)}</span><span class="sno-go">Leeg beginnen ${icon("chevronright", "s")}</span></button>`).join("")}</div>
        <div class="row tight mt-2"><button type="button" class="btn small" data-action="sit-new-tpl">${icon("layers", "s")} Start met een sjabloon (${n})</button><span class="spacer"></span><button type="button" class="btn small subtle" data-action="sit-new" data-kind="object" title="${esc(SIT_KIND_PLAIN.object)}">${icon("doc", "s")} Informatieobject (geheugensteun)</button></div>
        ${accordion("sit-new-more", "Meer uitleg: wanneer kies je wat?", `<ul class="tight small">
          <li><b>Custom SIT</b>: een eigen nummer of code met een herkenbaar patroon (regex), liefst met woorden in de buurt (keywords). Je test het patroon direct met voorbeeldtekst.</li>
          <li><b>EDM</b>: een bekende lijst met personen of klanten. Purview zoekt exacte waarden uit jullie bronbestand; dat bestand wordt gehasht geüpload. Het nauwkeurigst, maar het vraagt beheer: de upload moet actueel blijven.</li>
          <li><b>Document fingerprint</b>: documenten die op een standaardformulier zijn gebaseerd (een leeg sjabloon als basis). ${esc(CATALOG.sitLimits.copilotFingerprint)}</li>
          <li>Een hele <b>soort document</b> (contracten, cv’s, facturen)? Kies dan liever een trainable classifier uit de bibliotheek.</li></ul>
          <div class="row tight mt-1">${learn("sitCustom", "Custom SIT")} ${learn("edm", "EDM")} ${learn("fingerprint", "Fingerprint")}</div>`)}`,
      buttons: [{ label: "Annuleren" }],
    });
  },
};
/** Zijpaneel om één eigen type te bewerken (custom SIT, EDM-schema of fingerprint). */
const SitEditor = {
  open(id, back) {
    const s0 = sitById(id);
    if (!s0) return;
    if (!SIT_OWN_KINDS.includes(s0.kind)) { Actions["sit-edit-object"]({ dataset: { id } }); return; }
    UI.sitEdit = id;
    Drawer.open({
      title: () => (sitById(id) || {}).name || "Informatietype",
      icon: (CATALOG.sitKinds[s0.kind] || {}).icon || "search",
      render: () => {
        const st = S(), s = sitById(id, st);
        if (!s) return null;
        UI.sitEdit = id;
        return `<div class="sit-ed" data-id="${esc(id)}">${this.head(s, st)}${s.kind === "custom" ? this.custom(s) : s.kind === "edm" ? this.edm(s, st) : this.fp(s)}</div>`;
      },
      foot: back === "overview" ? () => `<button class="btn subtle" data-action="sit-overview">${icon("chevronleft", "s")} Terug naar het overzicht</button>` : null,
    });
  },
  head(s, st) {
    const linked = st.labels.filter((l) => (l.sits || []).includes(s.id));
    return `<div class="sit-ed-head">${sitKindTag(s.kind)}<span class="xs muted">${linked.length ? `Gekoppeld aan: ${linked.map((l) => esc(labelFullName(l, st))).join(", ")}` : "Nog niet gekoppeld aan een label."}</span><span class="spacer"></span>
      <button class="btn small" data-action="sit-add" data-payload='${attr({ sitId: s.id })}'>${icon("tag", "s")} Koppelen…</button><button class="icon-btn small danger" data-action="sit-del" data-id="${esc(s.id)}" title="Verwijderen" aria-label="${esc(s.name)} verwijderen">${icon("trash", "s")}</button></div>`;
  },
  custom(s) {
    const pre = `sit:${s.id}:`;
    const iss = SitBuilder.issues(s);
    setTimeout(() => SitBuilder.runTest(s.id), 0);
    return `<div class="grid grid-2" style="gap:0 14px">${F.text(pre + "name", "Name", { render: true, maxlength: 256 })}${F.text(pre + "desc", "Description")}</div>
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
      <div class="row tight mt-1">${learn("sitCustom")}</div>
      <details class="acc mt-2 tech-only" data-acc="sits-howto"><summary>Technische details: zo maak je dit in Purview</summary><div class="acc-body small"><ol class="tight"><li>Purview-portal › Information Protection › Classifiers › Sensitive info types › <b>Create sensitive info type</b>.</li><li>Name/Description → Pattern: primary element <i>Regular expression</i>, supporting element <i>Keyword list</i>, character proximity.</li><li>Maak een pattern per confidence level (High met keywords; Medium alleen regex indien gewenst).</li><li>Kies het <i>recommended confidence level</i> en test met <b>Test</b> op een voorbeeldbestand.</li></ol>Of via PowerShell met een XML rule package (<code>New-DlpSensitiveInformationTypeRulePackage</code>) – zie de PowerShell-export.</div></details>`;
  },
  edm(s, st) {
    const fields = s.fields || [];
    const nS = fields.filter((x) => x.searchable).length;
    const sitNames = `<datalist id="sit-names">${unique([...CATALOG.builtinSits.map((x) => x.name), ...st.sits.filter((x) => x.kind === "custom" || x.kind === "builtin").map((x) => x.name)]).map((n) => `<option value="${esc(n)}">`).join("")}</datalist>`;
    return `<div class="grid grid-2" style="gap:0 14px">${F.text(`sit:${s.id}:name`, "Name", { render: true })}${F.text(`sit:${s.id}:desc`, "Description / bron")}</div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Kolom (schema field)</th><th>Searchable ${infoTip("Op searchable fields wordt gezocht (primary element). Kies 1–10 velden met unieke waarden, bijv. BSN of patiëntnummer. Overige velden zijn corroborative evidence.")}</th><th>Gekoppelde SIT ${infoTip("Een searchable field moet aan een SIT (built-in of custom) gekoppeld zijn die de waarde in tekst vindt.")}</th><th><span class="sr-only">Acties</span></th></tr></thead><tbody>
      ${fields.map((x, i) => `<tr><td>${_sitAria(F.text(`sit:${s.id}:fields.${i}.name`, "", { cls: "mb-0", mono: true }), `Kolomnaam ${i + 1}`)}</td><td>${_sitAria(F.check(`sit:${s.id}:fields.${i}.searchable`, "", {}), `Kolom ${x.name || i + 1} searchable`)}</td><td>${x.searchable ? _sitAria(F.text(`sit:${s.id}:fields.${i}.sit`, "", { cls: "mb-0", list: "sit-names", ph: "Kies SIT…" }), `Gekoppelde SIT voor ${x.name || "kolom " + (i + 1)}`) : `<span class="xs muted">–</span>`}</td><td><button class="icon-btn small danger" data-action="edm-field-del" data-id="${esc(s.id)}" data-i="${i}" title="Kolom verwijderen" aria-label="Kolom ${esc(x.name || String(i + 1))} verwijderen">${icon("trash", "s")}</button></td></tr>`).join("")}
      </tbody></table></div>${sitNames}
      <div class="row mt-1"><button class="btn small" data-action="edm-field-add" data-id="${esc(s.id)}">${icon("plus", "s")} Kolom</button><span class="spacer"></span><span class="badge ${nS >= 1 && nS <= 10 ? "ok" : "err"}">${nS} searchable</span></div>
      ${fields.some((x) => x.searchable && !x.sit) ? msg("warn", "Koppel elk searchable field aan een SIT; anders kan EDM de waarde niet vinden.") : ""}
      <p class="xs muted mt-1">${icon("lock", "s")} EDM gebruikt alleen gehashte waarden; neem minimaal nodige kolommen op (bijv. BSN + geboortedatum, geen diagnose) en leg dit vast in de DPIA.</p>
      <div class="row tight mt-1">${learn("edm")}</div>
      <details class="acc mt-2 tech-only" data-acc="sits-edm-howto"><summary>Technische details: zo werkt EDM in Purview</summary><div class="acc-body small"><p class="mb-1">${esc(CATALOG.sitLimits.edmLocations)}</p><ol class="tight"><li>Schema maken (deze kolommen).</li><li>Gegevens hashen en uploaden met de EDM Upload Agent.</li><li>EDM-SIT maken (primary element = searchable field).</li><li>Gebruiken in auto-labeling en DLP.</li></ol></div></details>`;
  },
  fp(s) {
    return `${msg("warn", esc(CATALOG.sitLimits.copilotFingerprint))}
      ${F.text(`sit:${s.id}:name`, "Name", { render: true })}${F.text(`sit:${s.id}:desc`, "Sjabloon / bronbestand")}
      <p class="small muted">Een fingerprint herkent documenten die op een standaardformulier zijn gebaseerd. Gebruik een leeg sjabloon als basis.</p>
      <div class="row tight mt-1">${learn("fingerprint")}<span class="tech-only">${infoTip("Maken in de portal (Windows-bestand uploaden) of met PowerShell: New-DlpFingerprint + New-DlpSensitiveInformationType.")}</span></div>`;
  },
};
/** Oude subpagina’s (tabs) → nieuwe plek. */
const SitDeep = {
  open(sub) {
    const st = S();
    if (sub === "list" || sub === "overview") { SitOverview.open(); return; }
    if (sub === "new") { SitNew.open(); return; }
    const kinds = { builder: ["custom"], custom: ["custom"], edm: ["edm", "fingerprint"], fingerprint: ["fingerprint"] }[sub];
    if (!kinds) return;
    const cur = sitById(UI.sitEdit, st);
    const s = cur && kinds.includes(cur.kind) ? cur : st.sits.find((x) => kinds.includes(x.kind));
    if (s) SitEditor.open(s.id); else SitNew.open();
  },
};

registerView("sits", {
  title: "Informatietypen",
  fac: {
    duration: 40,
    goal: "Per label vastleggen hoe Purview de inhoud herkent: built-in SIT’s, custom SIT’s, EDM, fingerprints en trainable classifiers.",
    questions: ["Welke informatietypen uit Know your Data horen bij welk label?", "Zijn er organisatie-specifieke nummers (personeels-, patiënt-, contractnummer) die een custom SIT of EDM vragen?", "Zijn er standaardformulieren die we met een fingerprint kunnen herkennen?"],
    tips: ["Sleep een kaart uit de bibliotheek op een label; of klik een kaart en daarna op een label (tap-to-place).", "Eigen typen maak je met ‘+ Eigen type’ in de bibliotheek. Test custom regexen direct met geanonimiseerde voorbeeldtekst.", "EDM is het nauwkeurigst voor bekende populaties (patiënten, personeel)."],
    pitfalls: ["Een kale regex zonder keywords → veel false positives.", "Informatieobjecten zijn geen Purview-classifiers: koppel er een SIT of classifier bij.", "Fingerprints werken niet in de DLP-locatie Microsoft 365 Copilot."],
    links: ["sitDefinitions", "sitCustom", "edm", "fingerprint", "classifiers"],
  },
  done: (st) => applicableLabels(st).filter((l) => labelSits(l, st).length).length >= Math.min(2, applicableLabels(st).length) && st.sits.length > 0,
  render() {
    const st = S();
    const sub = UI.sub.sits;
    if (sub && sub !== "map") { UI.sub.sits = "map"; setTimeout(() => { if (UI.route === "sits") SitDeep.open(sub); }, 0); }
    return `${pageHead("Input · Know your Data", "Informatietypen", "Informatietypen bepalen waaraan Purview gevoelige inhoud herkent; ze sturen auto-labeling en DLP.", "", `<p class="mb-1">Koppel per label de typen die erbij horen. Die koppeling is de basis voor automatisch labelen en voor DLP-regels op ongelabelde inhoud. Deze app scant zelf geen gegevens: Purview herkent pas na inrichting. Test daarom eerst in simulatie.</p><div class="row tight">${learn("sitDefinitions", "SIT-definities")} ${learn("classifiers", "Classifiers")}</div>`)}
      ${this.map(st, this.lib(st))}`;
  },
  lib(st) {
    const f = SitLib.filter(st);
    const all = SitLib.items(st);
    const cats = unique(all.map((i) => i.catName).filter(Boolean));
    const regs = SitLib.regions();
    const secName = SECTOR_PHRASE[f.sector] || "jullie organisatie";
    const nLoose = SitLib.loose(st).size;
    const nOwn = st.sits.filter((s) => SIT_OWN_KINDS.includes(s.kind)).length;
    const fchip = (on, a, label, title, cls = "") => `<button type="button" class="chip lib-fchip${on ? " on" : ""}${cls}" aria-pressed="${on}" ${a} title="${esc(title)}">${label}</button>`;
    const kinds = [["builtin", "Built-in SIT’s", SIT_KIND_PLAIN.builtin], ["classifier", "Classifiers", SIT_KIND_PLAIN.classifier], ["own", `Eigen typen${nOwn ? ` <span class="lib-group-n">${nOwn}</span>` : ""}`, "Custom SIT’s, EDM-schema’s en fingerprints: eigen typen en sjablonen"], ["object", "Informatieobjecten", SIT_KIND_PLAIN.object]];
    const plain = !f.kind && !f.loose;
    return `<div class="lib-panel" data-drop="sit" data-zone="sit-unlink" data-target='{}' role="region" aria-label="Bibliotheek (zet hier een gekoppeld type neer om het los te koppelen)"><div class="lib-unlink-ov" aria-hidden="true">${icon("x")}<b>Loslaten om los te koppelen</b><span class="xs">Het informatietype blijft in de bibliotheek staan.</span></div>
      <div class="lib-head"><h2 class="md-t"><span class="md-t-x">Bibliotheek</span> <span class="md-n" aria-label="${all.length} typen">${all.length}</span></h2>${infoTip("Sleep een type op een label, of klik een type en daarna een label (Shift-klik = meerdere keren). Met + kies je het label uit een lijst. Sleep een gekoppeld type hierheen om het los te koppelen.")}<span class="spacer"></span><button class="btn small primary" data-action="sit-new-open" aria-haspopup="dialog" title="Custom SIT, EDM-schema of document fingerprint maken">${icon("plus", "s")} Eigen type</button></div>
      <div class="lib-tools"><input class="input" type="search" placeholder="Zoek op naam of omschrijving (bijv. BSN, IBAN, paspoort)…" aria-label="Zoek in de bibliotheek" value="${esc(f.q)}" data-live="lib-search">
        <select class="select" data-live="lib-region" aria-label="Land of regio"><option value="">Alle landen</option>${regs.map(([k, n, c]) => `<option value="${esc(k)}"${f.region === k ? " selected" : ""}>${esc(n)} (${c})</option>`).join("")}</select>
        <select class="select" data-live="lib-cat" aria-label="Categorie"><option value="">Alle categorieën</option>${cats.map((c) => `<option${f.cat === c ? " selected" : ""}>${esc(c)}</option>`).join("")}</select>
        <label class="lib-sector" title="Sector voor de suggesties (alleen de bibliotheek; het ontwerp verandert niet)"><span class="xs muted">Sector</span><select class="select" data-live="lib-sector" aria-label="Sector voor de suggesties">${Object.entries(CATALOG.sitSectors || { generic: "Algemeen" }).map(([k, v]) => `<option value="${esc(k)}"${f.sector === k ? " selected" : ""}>${esc(v)}</option>`).join("")}</select></label></div>
      <div class="lib-fchips" role="group" aria-label="Filter op soort">${fchip(f.rec && plain, `data-action="lib-rec" data-on="1"`, `${icon("star", "s")}Aanbevolen`, `Startset die vaak past bij ${secName}`)}${fchip(!f.rec && plain, `data-action="lib-kind" data-kind=""`, "Alle", "Alle soorten")}${kinds.map(([k, label, title]) => fchip(f.kind === k, `data-action="lib-kind" data-kind="${k}"`, label, title)).join("")}${nLoose ? fchip(f.loose, `data-action="lib-loose"`, `${icon("warning", "s")}Niet gekoppeld <span class="lib-group-n">${nLoose}</span>`, "In het ontwerp, maar nog aan geen label of DLP-regel gekoppeld", " warn") : ""}${f.q || f.region || f.cat || f.kind || f.loose ? `<button type="button" class="btn small subtle lib-clear" data-action="lib-clear">${icon("x", "s")} Filter wissen</button>` : ""}</div>
      <div class="lib-scroll lib-grid" id="lib-list">${SitLib.listHtml(st)}</div>
    </div>`;
  },
  /** Eén labelrij in het labelpaneel: kleur, naam, aantal en de gekoppelde typen als chips (drop-doel). */
  row(l, st, foc, fl) {
    const MAX = 5;
    const p = parentOf(l, st);
    const own = (l.sits || []).map((id) => sitById(id, st)).filter(Boolean);
    const inh = p ? (p.sits || []).map((id) => sitById(id, st)).filter(Boolean) : [];
    const all = [...own.map((s) => [s, true]), ...inh.map((s) => [s, false])];
    const open = (UI.sitTileOpen || {})[l.id];
    let vis = open ? all : all.slice(0, MAX);
    if (fl && fl.labelId === l.id && !vis.some(([s]) => s.id === fl.sitId)) vis = [...vis.slice(0, MAX - 1), ...all.filter(([s]) => s.id === fl.sitId)];
    const hidden = all.length - vis.length;
    const pName = p ? p.displayName || p.name : "";
    const full = labelFullName(l, st);
    const chip = (s, mine) => {
      const k = CATALOG.sitKinds[s.kind] || {};
      const tip = `${s.name} · ${k.short || ""}${s.desc ? " – " + s.desc : ""}${mine ? "" : ` (geërfd van ${pName})`}`;
      const x = mine ? `<button class="chip-x" data-action="sit-unlink" data-label="${esc(l.id)}" data-sit="${esc(s.id)}" title="Loskoppelen" aria-label="${esc(s.name)} loskoppelen">×</button>` : "";
      const c = `<span class="chip st-chip kind-${esc(s.kind)}" title="${esc(tip)}">${icon(k.icon || "search", "s")}<span class="st-cname">${esc(s.name)}</span>${x}</span>`;
      return mine ? `<span class="sit-drag${fl && fl.labelId === l.id && fl.sitId === s.id ? " chip-pop" : ""}" data-drag="sit" data-payload='${attr({ sitId: s.id, from: l.id })}' data-tap="1" data-pick-label="${esc(s.name)}" data-pick-hint="klik op een ander label om te verplaatsen, of op de bibliotheek om los te koppelen">${c}</span>` : `<span class="sit-inh">${c}</span>`;
    };
    const chips = vis.map(([s, mine]) => chip(s, mine)).join("");
    const more = hidden > 0 ? `<button type="button" class="st-more" data-action="sit-tile-more" data-id="${esc(l.id)}" aria-expanded="false" title="Alle ${all.length} tonen">+${hidden} meer</button>` : open && all.length > MAX ? `<button type="button" class="st-more" data-action="sit-tile-more" data-id="${esc(l.id)}" aria-expanded="true">Minder tonen</button>` : "";
    const n = `${all.length} ${all.length === 1 ? "type" : "typen"}${inh.length ? `, waarvan ${inh.length} geërfd` : ""}`;
    const pick = (cls, inner) => `<button type="button" class="${cls}" data-action="sit-pick" data-id="${esc(l.id)}" title="Informatietype kiezen" aria-label="Informatietype koppelen aan ${esc(full)}">${inner}</button>`;
    return `<div class="label-card sit-lbl sit-row${l.parentId ? " sub" : ""}${all.length ? "" : " st-empty"}${foc && foc.labelId === l.id ? " focus" : ""}" id="sitlbl-${esc(l.id)}" style="--lc:${esc(l.color)}" data-drop="sit" data-zone="sit-to-label" data-target='${attr({ labelId: l.id })}' role="group" aria-label="${esc(full)}: ${esc(n)}">
      <div class="sl-body"><div class="st-head"><span class="st-dot" aria-hidden="true"></span><div class="lc-title-wrap"><div class="lc-title">${esc(l.displayName || l.name)}</div></div><span class="st-n" title="${esc(n)}">${all.length}</span>${all.length ? pick("icon-btn small st-add", icon("plus", "s")) : ""}</div>
      ${all.length ? `<div class="sit-chips chip-list">${chips}${more}</div>` : pick("drop-hint st-zone", `${icon("plus", "s")}<span>Sleep hierheen of kies</span>`)}</div>
    </div>`;
  },
  map(st, lib) {
    const ls = orderedLabels(st);
    if (!ls.length) return VH.needLabels() + lib;
    const foc = UI.sitFocus && labelById(UI.sitFocus.labelId, st) ? UI.sitFocus : null;
    const backName = foc ? ({ autolabel: "Auto-labeling", board: "Integraal ontwerpbord", schema: "Classificatieschema", labels: "Label-instellingen" }[foc.back] || "") : "";
    const banner = foc ? `<div class="msg info sit-focus">${icon("info")}<div class="msg-body row tight between"><span>Koppel informatietypen aan <b>${esc(labelFullName(labelById(foc.labelId, st), st))}</b>: sleep ze op het omrande label of klik op +.</span>${backName ? `<button class="btn small" data-action="sit-focus-back">${icon("chevronleft", "s")} Terug naar ${esc(backName)}</button>` : ""}<button class="icon-btn small" data-action="sit-focus-done" title="Melding sluiten" aria-label="Melding sluiten">${icon("x", "s")}</button></div></div>` : "";
    const fl = UI.sitFlash && Date.now() - UI.sitFlash.at < 1500 ? UI.sitFlash : null;
    const rows = ls.map((l) => this.row(l, st, foc, fl)).join("");
    if (foc && !foc.scrolled) { foc.scrolled = true; setTimeout(() => { const c = document.getElementById("sitlbl-" + foc.labelId); if (c && c.scrollIntoView) c.scrollIntoView({ block: "nearest" }); }, 30); }
    const nLinked = ls.filter((l) => labelSits(l, st).length).length;
    const coach = !foc && !SitCoach.seen("sit-map") ? `<div class="sit-hint sit-coach" role="note">${icon("grip", "s")}<span>Sleep een type naar een label, of klik het type en daarna een label</span>${infoTip("Al gekoppelde typen sleep je naar een ander label (verplaatsen) of terug naar de bibliotheek (loskoppelen). Toetsenbord: Tab naar het type, Enter, en kies ‘Kies uit lijst…’. Ctrl+Z maakt alles ongedaan. " + CATALOG.sitLimits.classifierLocations)}<span class="spacer"></span><button class="btn small subtle" data-action="sit-coach-done">Begrepen</button></div>` : "";
    const ov = `<button class="btn small subtle sit-ov-btn" data-action="sit-overview" aria-haspopup="dialog" title="Alle informatietypen in het ontwerp, met confidence level en minimaal aantal">${icon("table", "s")} Overzicht <span class="badge neutral">${st.sits.length}</span></button>`;
    return `${banner}${coach}
      <div class="sitw"><div class="sitw-g">
        <section class="sit-labels" aria-labelledby="sit-lh-t">
          <div class="sit-lh"><h2 class="md-t" id="sit-lh-t"><span class="md-t-x">Labels</span> <span class="md-n">${ls.length}</span></h2>${ov}</div>
          <p class="sit-lmeta xs">${nLinked} van ${ls.length} met informatietypen</p>
          <div class="sit-list">${rows}</div>
        </section>
        ${lib}
      </div></div>`;
  },
  after(root) { SitPane.init(); SitPane.restore(root); },
});

/* Twee panelen naast elkaar: beide vullen de zichtbare hoogte onder de paginakop (--sit-avail) en scrollen zelf.
   De scrollpositie van de labellijst blijft bewaard over re-renders; na een drop schuift het label met het nieuwe type in beeld.
   Tijdens slepen zien de labelrijen er hetzelfde uit als in rust. Staat de muis bij de boven- of onderrand van de lijst,
   dan scrolt die vanzelf door (ook zonder te bewegen), zodat labels buiten beeld bereikbaar blijven. */
const SitPane = {
  _on: false,
  _was: false,
  _raf: 0,
  _sraf: 0,
  _pt: null,
  EDGE: 48,
  _active() { const c = document.body.classList; return c.contains("dnd-active") || c.contains("tap-active"); },
  _els() {
    const main = document.getElementById("main"), g = main && main.querySelector(".sitw-g");
    return g ? { main, g, panel: g.querySelector(".sit-labels"), list: g.querySelector(".sit-list"), lib: g.querySelector(".lib-panel") } : null;
  },
  GAP: 12,
  /** Panelen lopen tot onderaan het venster. De ondermarge is precies zo groot dat de pagina kan doorscrollen
      tot de panelen bovenaan staan; dan zijn ze op hun hoogst en kan de pagina niet verder. */
  fit() {
    const e = this._els();
    if (!e || !e.panel) return;
    const m = e.main.getBoundingClientRect(), top = Math.max(e.g.getBoundingClientRect().top, m.top + this.GAP);
    const avail = Math.max(320, Math.floor(m.bottom - top - this.GAP));
    e.g.style.setProperty("--sit-avail", avail + "px");
    e.g.style.setProperty("--sit-mb", Math.round(m.height - this.GAP - avail - (parseFloat(getComputedStyle(e.main).paddingBottom) || 0)) + "px");
  },
  restore(root) {
    const e = this._els();
    if (!e) return;
    this.fit();
    if (e.list && UI.sitListY) e.list.scrollTop = UI.sitListY;
    this._was = this._active();
    if (!this._was) this.reveal();
  },
  /** Na een drop: het label dat net een type kreeg binnen de lijst in beeld schuiven. */
  reveal() {
    const fl = UI.sitFlash && Date.now() - UI.sitFlash.at < 1500 ? UI.sitFlash : null;
    const e = this._els();
    const t = fl && e && e.list && document.getElementById("sitlbl-" + fl.labelId);
    if (!t || this._active()) return;
    const s = e.list.getBoundingClientRect(), r = t.getBoundingClientRect();
    if (r.bottom > s.bottom) e.list.scrollTop += Math.min(r.bottom - s.bottom + 8, r.top - s.top - 4);
    else if (r.top < s.top) e.list.scrollTop -= s.top - r.top + 4;
    UI.sitListY = e.list.scrollTop;
  },
  /** Eén frame auto-scroll: hoe dichter bij de rand, hoe sneller; daarna het doel onder de (stilstaande) muis opnieuw bepalen. */
  _edge() {
    this._sraf = 0;
    const d = DnD.drag, p = this._pt, e = this._els();
    if (!d || !d.started || !p || !e || !e.list) return;
    const r = e.list.getBoundingClientRect(), m = Math.min(this.EDGE, r.height / 4);
    if (p.x < r.left || p.x > r.right || p.y < r.top - 8 || p.y > r.bottom + 8) return;
    const v = p.y < r.top + m ? p.y - r.top - m : p.y > r.bottom - m ? p.y - r.bottom + m : 0;
    if (!v) return;
    const y0 = e.list.scrollTop;
    e.list.scrollTop += Math.sign(v) * Math.max(2, Math.round(Math.min(1, Math.abs(v) / m) * 14));
    if (e.list.scrollTop === y0) return;
    this._hover(d, p);
    this._sraf = requestAnimationFrame(() => this._edge());
  },
  _hover(d, p) {
    const el = document.elementFromPoint(p.x, p.y), z = el && el.closest("[data-drop]");
    const ok = z && DnD._accepts(z, d.type, d.payload) ? z : null;
    if (d.over === ok) return;
    if (d.over) d.over.classList.remove("drop-hover");
    if (ok) ok.classList.add("drop-hover");
    d.over = ok;
  },
  sync() {
    const on = this._active();
    if (on === this._was) return;
    this._was = on;
    if (!on) this.reveal();
  },
  init() {
    if (this._on) return;
    this._on = true;
    document.addEventListener("scroll", (ev) => {
      const t = ev.target;
      if (t && t.id === "main") { cancelAnimationFrame(this._raf); this._raf = requestAnimationFrame(() => this.fit()); }
      else if (t && t.classList && t.classList.contains("sit-list")) UI.sitListY = t.scrollTop;
    }, true);
    document.addEventListener("pointermove", (ev) => {
      if (!document.body.classList.contains("dnd-active")) return;
      this._pt = { x: ev.clientX, y: ev.clientY };
      if (!this._sraf) this._sraf = requestAnimationFrame(() => this._edge());
    }, { passive: true });
    window.addEventListener("resize", () => this.fit());
    new MutationObserver(() => this.sync()).observe(document.body, { attributes: true, attributeFilter: ["class"] });
  },
};

Actions["lib-kind"] = (el) => { UI.libFilter.kind = el.dataset.kind || ""; UI.libFilter.loose = false; if (!UI.libFilter.kind) UI.libFilter.rec = false; UI.libLimit = 0; App.render(); };
Actions["lib-kind-sel"] = (el) => { UI.libFilter.kind = el.value || ""; UI.libFilter.loose = false; if (!UI.libFilter.kind) UI.libFilter.rec = false; UI.libLimit = 0; App.render(); };
Actions["lib-rec"] = (el) => { const on = el.dataset.on === "1"; UI.libFilter.rec = on; UI.libFilter.loose = false; if (on) { UI.libFilter.kind = ""; UI.libFilter.cat = ""; UI.libFilter.region = ""; } UI.libLimit = 0; App.render(); };
Actions["lib-loose"] = () => { UI.libFilter.loose = !UI.libFilter.loose; UI.libFilter.kind = ""; UI.libLimit = 0; App.render(); };
Actions["lib-sector"] = (el) => { UI.libFilter.sector = el.value || ""; UI.libFilter.rec = true; UI.libFilter.loose = false; UI.libFilter.kind = ""; UI.libFilter.cat = ""; UI.libFilter.region = ""; UI.libLimit = 0; App.render(); };
Actions["lib-clear"] = () => { Object.assign(UI.libFilter, { q: "", kind: "", cat: "", region: "", loose: false }); UI.libLimit = 0; App.render(); };
Actions["lib-reset"] = () => { Object.assign(UI.libFilter, { kind: "", cat: "", region: "", loose: false }); UI.libLimit = 0; App.render(); };
Actions["sit-tile-more"] = (el) => { UI.sitTileOpen = UI.sitTileOpen || {}; UI.sitTileOpen[el.dataset.id] = !UI.sitTileOpen[el.dataset.id]; App.render(); };
Actions["lib-more"] = () => { UI.libLimit = Math.max(SitLib.PAGE, UI.libLimit || 0) + SitLib.PAGE; const box = $("#lib-list"); const top = box ? box.scrollTop : 0; _libRefresh(); if (box) box.scrollTop = top; };
Actions["lib-cat"] = (el) => { UI.libFilter.cat = el.value || ""; UI.libLimit = 0; App.render(); };
Actions["lib-cat-go"] = (el) => { UI.libFilter.cat = el.dataset.cat || ""; UI.libFilter.loose = false; UI.libLimit = 0; App.render(); const s = $("#main [data-live=lib-cat]"); if (s) s.focus(); };
Actions["lib-region"] = (el) => { UI.libFilter.region = el.value || ""; UI.libLimit = 0; App.render(); };
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
Actions["sit-new-open"] = () => SitNew.open();
Actions["sit-new-menu"] = Actions["sit-new-open"];
Actions["sit-new-tpl"] = () => {
  Modal.close();
  Object.assign(UI.libFilter, { kind: "own", rec: false, loose: false, cat: "", region: "", q: "" });
  UI.libLimit = 0;
  App.render();
  const lib = $("#main .lib-panel");
  if (lib && lib.scrollIntoView) lib.scrollIntoView({ block: "start", behavior: reducedMotion() ? "auto" : "smooth" });
};
Actions["sit-overview"] = () => SitOverview.open();
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
  const back = el.closest && el.closest(".sit-ov") ? "overview" : el.dataset.back || null;
  if (SIT_OWN_KINDS.includes(s.kind)) SitEditor.open(s.id, back);
  else Actions["sit-edit-object"]({ dataset: { id: s.id, back } });
};
Actions["sit-edit-object"] = (el) => {
  const id = el.dataset.id;
  const back = el.dataset.back === "overview";
  Drawer.open({
    title: () => (sitById(id) || {}).name || "Informatietype", icon: "search", narrow: true,
    foot: back ? () => `<button class="btn subtle" data-action="sit-overview">${icon("chevronleft", "s")} Terug naar het overzicht</button>` : null,
    render: () => {
      const st = S(), s = sitById(id, st);
      if (!s) return null;
      const k = CATALOG.sitKinds[s.kind] || {};
      return `${SitEditor.head(s, st)}<p class="small muted">${esc(k.desc || "")}</p>
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
  if (Modal.cur) Modal.close(true);
  if (kind === "object") Actions["sit-edit-object"]({ dataset: { id } });
  else SitEditor.open(id);
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
