/* View: Referentiearchitectuur – hoe classificatie, labels, bescherming en inzicht samenwerken (referentiemodel; de status in jullie ontwerp staat in het detailpaneel).
   Interactie volgens "Microsoft Purview – Classification & Labeling Interactive Reference Architecture" (microsoft/purview, MIT):
   ketenmarkering bij selectie, rondleidingen, laag- en licentielens, legenda, alleen titels en Esc = reset. */
const ArchView = {
  tierName: { e3: "E3", e5: "E5", addon: "Add-on" },
  tierTitle: { e3: "Doorgaans in Microsoft 365 E3", e5: "Doorgaans E5 of een E5-add-on", addon: "Aparte licentie, add-on of pay-as-you-go" },
  stateName: { on: "In ontwerp", todo: "Actie nodig", off: "Niet gebruikt", na: "Optioneel", out: "Buiten workshop" },
  statusName: { preview: "Preview", roadmap: "Roadmap", private: "Private preview" },
  _adj: null,
  A() { return CATALOG.arch; },
  byId(id) { return this.A().blocks.find((b) => b.id === id) || null; },
  isSrc(b) { return !!b && b.col === "src"; },
  tierOf(b) { return b.tier || "e3"; },
  adj() {
    if (this._adj) return this._adj;
    const fwd = {}, bwd = {}, add = (m, a, b, k) => { (m[a] = m[a] || []).push([b, k]); };
    this.A().edges.forEach(([a, b, k]) => { add(fwd, a, b, k); add(bwd, b, a, k); });
    return (this._adj = { fwd, bwd });
  },
  reach(id, map) {
    const out = new Set(), stack = [id];
    while (stack.length) (map[stack.pop()] || []).forEach(([n]) => { if (n !== id && !out.has(n)) { out.add(n); stack.push(n); } });
    return out;
  },
  /** Stroomopwaarts (up) en stroomafwaarts (down), ingekort op scope: een onderdeel geldt alleen voor de bronnen in scope.src, nooit voor excl. */
  chain(id) {
    const b = this.byId(id);
    if (!b) return null;
    const blocks = this.A().blocks, up = this.reach(id, this.adj().bwd), down = this.reach(id, this.adj().fwd);
    const drop = (x) => { up.delete(x); down.delete(x); };
    if (b.scope && b.scope.src) blocks.forEach((o) => { if (this.isSrc(o) && !b.scope.src.includes(o.id)) drop(o.id); });
    (b.excl || []).forEach(drop);
    blocks.forEach((o) => { if ((o.excl || []).includes(id)) drop(o.id); });
    if (this.isSrc(b)) blocks.forEach((o) => { if (o.scope && o.scope.src && !o.scope.src.includes(id)) drop(o.id); });
    return { up, down };
  },
  /** Directe relaties (één stap) van een blok, binnen de keten. */
  rel(id, ch) {
    const a = this.adj(), keep = (n) => !ch || ch.up.has(n) || ch.down.has(n);
    return { from: (a.bwd[id] || []).filter(([n]) => keep(n)), to: (a.fwd[id] || []).filter(([n]) => keep(n)) };
  },
  design(b, st) {
    if (b.out) return { state: "out", text: "Buiten deze workshop" };
    if (!b.design) return { state: "na", text: this.statusName[b.status] || "Optioneel" };
    try { const d = b.design(st); return d && d.text ? d : { state: (d && d.state) || "na", text: this.stateName[(d && d.state) || "na"] }; } catch (e) { return { state: "na", text: "Optioneel" }; }
  },
  layerOf(id) { return this.A().layers.find((l) => l.id === id) || null; },
  /** Kortste route tussen twee blokken via de relaties: eerst met de stroom mee, dan tegen de stroom in, dan in beide richtingen (max. 3 stappen). */
  link(a, b) {
    const ed = this.A().edges;
    const bfs = (s, t, both) => {
      const prev = new Map([[s, null]]), q = [s];
      while (q.length && !prev.has(t)) {
        const n = q.shift();
        ed.forEach(([x, y]) => {
          if (x === n && !prev.has(y)) { prev.set(y, [n, x + ">" + y]); q.push(y); }
          if (both && y === n && !prev.has(x)) { prev.set(x, [n, x + ">" + y]); q.push(x); }
        });
      }
      if (!prev.has(t)) return null;
      const edges = [], nodes = [];
      for (let n = t; prev.get(n); n = prev.get(n)[0]) { edges.push(prev.get(n)[1]); if (prev.get(n)[0] !== s) nodes.push(prev.get(n)[0]); }
      return edges.length <= 3 ? { edges, nodes } : null;
    };
    return bfs(a, b, false) || bfs(b, a, false) || bfs(a, b, true) || { edges: [], nodes: [] };
  },
  /** Actieve rondleiding: stap (lengte = samenvatting), uitgelichte verbindingen en tussenliggende blokken. */
  tour() {
    const path = this.A().paths.find((p) => p.id === UI.archPath);
    if (!path) return null;
    const n = path.steps.length, step = Math.min(Math.max(Number(UI.archStep) || 0, 0), n);
    const cur = new Set(), trail = new Set(), via = new Set(), ids = path.steps.map((s) => s[0]);
    for (let i = 1; i <= Math.min(step, n - 1); i++) {
      const l = this.link(ids[i - 1], ids[i]);
      l.edges.forEach((k) => (i === step || step === n ? cur : trail).add(k));
      l.nodes.forEach((x) => { if (!ids.includes(x)) via.add(x); });
    }
    return { path, n, step, ids, cur, trail, via, end: step === n };
  },
  lit(b, o) {
    if (o.tour) return o.tour.ids.includes(b.id) || o.tour.via.has(b.id);
    if (o.path) return o.path.steps.some((s) => s[0] === b.id);
    if (o.layer) return this.isSrc(b) ? o.layer.cover.includes(b.id) : b.layers.includes(o.layer.id);
    if (o.tier !== "all") return this.isSrc(b) || this.tierOf(b) === o.tier;
    if (o.chain) return b.id === o.sel || o.chain.up.has(b.id) || o.chain.down.has(b.id);
    return true;
  },
  flag(b) { return b.status ? `<span class="ab-flag f-${esc(b.status)}">${esc(this.statusName[b.status] || b.status)}</span>` : ""; },
  /** Beeldmerk: officieel Microsoft-productlogo voor bronnen (b.app), anders een lijnicoon. */
  glyph(b, cls = "") {
    const apps = Array.isArray(b.app) && typeof msLogo === "function" ? b.app.map((a) => msLogo(a, cls)).filter(Boolean) : [];
    return apps.length ? apps.join("") : icon(b.icon || "info", "s");
  },
  /** Standaard alleen titels; de omschrijving staat in de aanwijs-preview en het detailpaneel. */
  denseOn() { return UI.archDense !== false; },
  block(b, st, o) {
    const T = o.tour, stepIdx = T ? T.ids.indexOf(b.id) : -1;
    const lit = this.lit(b, o), t = this.tierOf(b);
    const rel = !o.path && o.chain && b.id !== o.sel ? (o.chain.up.has(b.id) ? "up" : o.chain.down.has(b.id) ? "down" : "") : "";
    const tc = stepIdx < 0 ? (T && T.via.has(b.id) ? "via" : "") : `hl${stepIdx === T.step ? " cur" : stepIdx < T.step || T.end ? " done" : ""}`;
    const cls = ["arch-block", lit ? "" : "dim", tc, o.sel === b.id ? "sel" : "", rel, b.out ? "out" : "", b.note ? "is-note" : "", this.isSrc(b) ? "has-ico" : "", b.app ? "has-logo" : ""].filter(Boolean).join(" ");
    const relTxt = rel === "up" ? ", komt hiervoor in de keten" : rel === "down" ? ", volgt hierna in de keten" : stepIdx >= 0 ? `, stap ${stepIdx + 1} van ${T.n}` : "";
    return `<button type="button" class="${cls}" data-action="arch-sel" data-id="${esc(b.id)}" aria-pressed="${o.sel === b.id}" aria-label="${esc(b.name + " – " + b.nl + ", " + this.tierName[t] + relTxt)}">
      ${stepIdx >= 0 ? `<span class="ab-step" aria-hidden="true">${stepIdx + 1}</span>` : ""}
      ${this.isSrc(b) ? `<span class="ab-ico" aria-hidden="true">${this.glyph(b, "ab-logo")}</span>` : ""}
      <span class="ab-txt"><span class="ab-name">${esc(b.name)}</span><span class="ab-nl">${esc(b.nl)}</span></span>
      <span class="ab-meta"><span class="ab-tier t-${esc(t)}" title="${esc(this.tierTitle[t] + "; controleer de licentie")}">${esc(this.tierName[t])}</span>${this.flag(b)}${b.preview ? `<span class="ab-flag f-preview" title="${esc(b.preview)}">Deels preview</span>` : ""}</span>
    </button>`;
  },
  /** Korte preview in het lege detailpaneel bij aanwijzen of toetsenbordfocus (alleen visueel; het blok heeft dezelfde tekst als label). */
  peek(id) {
    const b = this.byId(id);
    if (!b) return "";
    const P = this.phase(id), t = this.tierOf(b);
    return `<span class="pk-kick ${esc(P.cls)}">${P.col ? `${P.i + 1}. ${esc(P.col.name)}` : ""}</span>
      <span class="pk-name"><span class="pk-ico">${this.glyph(b, "pk-logo")}</span>${esc(b.name)}</span>
      <span class="pk-nl">${esc(b.nl)}</span>
      <span class="pk-meta"><span class="ab-tier t-${esc(t)}">${esc(this.tierName[t])}</span><span>${esc(this.tierTitle[t])}</span></span>
      <span class="pk-hint">Klik voor uitleg en samenhang</span>`;
  },
  /** Fase (kolom) van een blok: bepaalt het kleuraccent (klasse ph-<kolom>). */
  phase(id) {
    const b = this.byId(id), A = this.A(), i = b ? A.cols.findIndex((c) => c.id === b.col) : -1;
    return i >= 0 ? { i, col: A.cols[i], cls: "ph-" + A.cols[i].id } : { i: -1, col: null, cls: "" };
  },
  column(c, i, st, o) {
    const list = this.A().blocks.filter((b) => b.col === c.id), groups = this.A().groups || {};
    let html = "", k = 0;
    while (k < list.length) {
      const g = list[k].grp, run = [];
      while (k < list.length && list[k].grp === g && g) run.push(list[k++]);
      if (run.length > 1) html += `<div class="ra-grp" role="group" aria-label="${esc(groups[g] || g)}"><div class="ra-grp-h">${esc(groups[g] || g)}</div>${run.map((b) => this.block(b, st, o)).join("")}</div>`;
      else if (run.length) html += this.block(run[0], st, o);
      else html += this.block(list[k++], st, o);
    }
    return `<section class="ra-col ph-${esc(c.id)}" aria-label="${esc(`${i + 1}. ${c.name}: ${c.q}`)}">
      <header class="ra-colhead"><span class="ra-num" aria-hidden="true">${i + 1}</span><span class="ra-colt"><b>${esc(c.name)}</b><span>${esc(c.q)}</span></span></header>
      <div class="ra-blocks">${html}</div></section>`;
  },
  chip(id, kind) {
    const b = this.byId(id);
    if (!b) return "";
    const k = (this.A().kinds || {})[kind];
    return `<button type="button" class="ad-chip${kind ? " k-" + esc(kind) : ""}" data-action="arch-pick" data-id="${esc(id)}"${k ? ` title="${esc(k.name + ": " + k.desc)}"` : ""} aria-label="${esc(b.name + (k ? " (" + k.name + ")" : ""))}">${kind ? `<span class="ad-k" aria-hidden="true"></span>` : ""}${esc(b.name)}</button>`;
  },
  detail(b, st, ch, quiet) {
    const A = this.A();
    if (!b) {
      return `<div class="arch-detail empty-hint" id="arch-detail" tabindex="-1">
        <div class="ad-empty"><span class="ad-empty-ico" aria-hidden="true">${icon("info", "s")}</span><div><b>Kies een onderdeel</b><p class="xs muted">Wijs een blok aan voor een korte omschrijving. Klik erop: je ziet wat het doet, welke licentie nodig is en wat ervoor en erna komt.</p></div></div>
        <div class="ra-peek" id="ra-peek" aria-hidden="true"></div>
      </div>`;
    }
    const ci = A.cols.findIndex((c) => c.id === b.col), col = A.cols[ci] || {};
    const d = b.design && !b.out ? this.design(b, st) : null, v = b.route && Views[b.route], r = this.rel(b.id, ch);
    const relRow = (h, list) => (list.length ? `<div class="ad-rel"><div class="ad-rel-h">${esc(h)}</div><div class="ad-chips">${list.map(([n, k]) => this.chip(n, k)).join("")}</div></div>` : "");
    const scopeRow = b.scope && b.scope.src ? `<div class="ad-rel"><div class="ad-rel-h">Geldt voor</div><div class="ad-chips">${b.scope.src.map((n) => this.chip(n, "")).join("")}</div></div>` : "";
    const li = (arr) => `<ul class="ad-list">${arr.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
    const more = [
      b.preview ? `<p><b>Preview.</b> ${esc(b.preview)}</p>` : "",
      b.roadmap ? `<p><b>Beschikbaarheid.</b> ${esc(b.roadmap)}</p>` : "",
      b.items ? `<ul class="ad-items">${b.items.map(([t, s, l]) => `<li><b>${esc(t)}</b><span>${esc(s)}</span>${l ? learn(l, "Roadmap") : ""}</li>`).join("")}</ul>` : "",
      b.prereq ? `<p class="ad-sub">Randvoorwaarden</p>${li(b.prereq)}` : "",
      b.priority ? `<p class="ad-sub">Labelprioriteit</p><p>${esc(b.priority)}</p>` : "",
      b.conditions ? `<p class="ad-sub">Voorwaarden in DLP</p>${li(b.conditions)}` : "",
    ].join("");
    const tech = b.tech ? `<dl class="ad-tech"><dt>Ziet</dt><dd>${esc(b.tech.ziet)}</dd><dt>Kan</dt><dd>${esc(b.tech.kan)}</dd><dt>Kan niet</dt><dd>${esc(b.tech.niet)}</dd></dl>` : "";
    const lic = (Array.isArray(b.lic) ? b.lic.length : b.lic) ? licBadge(b.lic) : `<span class="badge neutral">Licentie nog niet bekend</span>`;
    return `<div class="arch-detail" id="arch-detail" tabindex="-1"${quiet ? "" : ' aria-live="polite"'}>
      <div class="ad-kick">${ci + 1}. ${esc(col.name || "")} <span>· ${esc(col.q || "")}</span></div>
      <h3><span class="ad-ico${b.app ? " is-logo" : ""}" aria-hidden="true">${this.glyph(b, "ad-logo")}</span>${esc(b.name)}</h3>
      <p class="ad-nl">${esc(b.nl)}</p>
      <div class="ad-badges">${lic}${b.status === "preview" ? previewBadge() : ""}${b.status === "roadmap" ? `<span class="badge neutral">Roadmap</span>` : ""}${b.out ? `<span class="badge neutral">Buiten deze workshop</span>` : ""}${infoTip("Licentie-indicatie; afhankelijk van jullie plan. Controleer in het Microsoft 365-beheercentrum of op Microsoft Learn.")}</div>
      <p class="ad-txt">${esc(b.uitleg)}</p>
      ${d ? `<p class="ad-design st-${esc(d.state)}"><span class="ab-dot" aria-hidden="true"></span><span>In jullie ontwerp: <b>${esc(this.stateName[d.state] || "")}</b>${d.text && d.text !== this.stateName[d.state] ? ` · ${esc(d.text)}` : ""}</span></p>` : ""}
      ${relRow("Komt van", r.from)}${relRow("Gaat naar", r.to)}${scopeRow}
      ${more ? accordion("arch-more", "Meer uitleg", more) : ""}
      ${tech ? accordion("arch-tech", "Technische details", tech) : ""}
      <div class="ad-actions">${v ? `<button type="button" class="btn primary small" data-action="go" data-route="${esc(b.route)}">${icon("chevronright", "s")} Naar ${esc(v.title)}</button>` : ""}${learn(b.learn, "Microsoft Learn")}</div>
    </div>`;
  },
  lensLine(o) {
    const A = this.A(), names = (ids) => ids.map((id) => (this.byId(id) || {}).name).filter(Boolean).join(", ");
    if (o.layer) {
      const src = A.blocks.filter((b) => this.isSrc(b)), yes = src.filter((b) => o.layer.cover.includes(b.id)).map((b) => b.id), no = src.filter((b) => !o.layer.cover.includes(b.id)).map((b) => b.id);
      return `<div class="ra-lens" role="status">${icon("layers", "s")}<div><b>${esc(o.layer.name)}</b> · geldt voor ${esc(names(yes) || "geen bronnen")}${no.length ? `; niet voor ${esc(names(no))}` : ""}.<span class="ra-lens-n">${esc(o.layer.note || "")}</span></div></div>`;
    }
    if (o.tier !== "all") {
      const all = A.blocks.filter((b) => !this.isSrc(b)), hit = all.filter((b) => this.tierOf(b) === o.tier).length;
      const tn = (A.tiers.find((x) => x[0] === o.tier) || [])[1] || "";
      return `<div class="ra-lens" role="status">${icon("filter", "s")}<div><b>${hit} van ${all.length}</b> onderdelen: ${esc(tn.toLowerCase())}.<span class="ra-lens-n">Bronnen blijven zichtbaar als context. Licentie-indicatie; controleer jullie plan.</span></div></div>`;
    }
    return "";
  },
  legend() {
    const A = this.A(), k = A.kinds || {};
    const it = (inner, t) => `<li>${inner}<span>${esc(t)}</span></li>`;
    return `<section class="ra-legend" id="ra-legend" aria-labelledby="ra-legend-h">
      <div class="lg-head"><h3 id="ra-legend-h">${icon("info", "s")} Legenda</h3><button type="button" class="icon-btn lg-x" data-action="arch-legend" aria-label="Legenda inklappen" title="Legenda inklappen">${icon("x", "s")}</button></div>
      <div class="lg-sec"><h4>Lijnen: soort relatie</h4><ul>${Object.keys(k).map((x) => it(this.lineSample(x), `${k[x].name}: ${k[x].desc.toLowerCase()}`)).join("")}</ul><p class="lg-note">Lijnen van dezelfde soort lopen gebundeld. Wijs een onderdeel aan of klik erop: alleen de takken van dat onderdeel lichten op.</p></div>
      <div class="lg-sec"><h4>Keten bij selectie</h4><ul>${it(`<span class="lg-sw sel" aria-hidden="true"></span>`, "Gekozen onderdeel")}${it(`<span class="lg-sw up" aria-hidden="true"></span>`, "Komt ervoor")}${it(`<span class="lg-sw down" aria-hidden="true"></span>`, "Volgt erna")}${it(`<span class="lg-sw dim" aria-hidden="true"></span>`, "Hoort er niet bij")}</ul></div>
      <div class="lg-sec"><h4>Licentie</h4><ul>${["e3", "e5", "addon"].map((t) => it(`<span class="ab-tier t-${t}">${this.tierName[t]}</span>`, this.tierTitle[t])).join("")}</ul></div>
      <div class="lg-sec"><h4>Status</h4><ul>${it(`<span class="ab-flag f-preview">Preview</span>`, "Public preview")}${it(`<span class="ab-flag f-roadmap">Roadmap</span>`, "Aangekondigd, nog niet beschikbaar")}${it(`<span class="lg-out" aria-hidden="true"></span>`, "Buiten deze workshop")}</ul></div>
    </section>`;
  },
  /* ---------- Rondleiding: startkaart (keuze) en stappenkaart boven het model ---------- */
  pathRoute(p) { return `<span class="rs-route" aria-hidden="true">${p.steps.map(([id]) => `<span class="rs-dot ${esc(this.phase(id).cls)}"></span>`).join("")}</span>`; },
  /** Uitnodiging boven het model zolang er geen rondleiding loopt: één rustige regel met de startknop; de rondleidingen als kaarten pas na uitklappen. */
  startCard() {
    const A = this.A(), first = A.paths[0], open = UI.archIntro === true;
    if (!first) return "";
    const cards = A.paths.map((p) => {
      const n = p.steps.length, label = `${p.name}. ${n} stappen.${p.why ? " " + p.why : ""}`;
      return `<li><button type="button" class="rs-card" data-action="arch-path" data-id="${esc(p.id)}" aria-label="${esc("Start rondleiding: " + label)}">
        <span class="rs-ctop"><span class="rs-cico" aria-hidden="true">${icon(p.icon || "route", "s")}</span><span class="rs-cname">${esc(p.name)}</span></span>
        ${p.why ? `<span class="rs-cwhy">${esc(p.why)}</span>` : ""}
        <span class="rs-cmeta">${this.pathRoute(p)}<span>${n} stappen</span><span class="rs-go" aria-hidden="true">${icon("chevronright", "s")}</span></span>
      </button></li>`;
    }).join("");
    return `<section class="ra-start${open ? "" : " is-closed"}" aria-labelledby="ra-start-h">
      <div class="rs-head">
        <span class="rs-ico" aria-hidden="true">${icon("route", "s")}</span>
        <div class="rs-title"><h3 id="ra-start-h">Ontdek het model stap voor stap</h3>
          <p class="rs-lead">Kies een vraag. Per stap licht één onderdeel op en zie je hoe het samenhangt met de vorige stap.</p></div>
        <div class="rs-acts">
          <button type="button" class="btn ghost small rs-x" data-action="arch-intro" aria-expanded="${open}"${open ? ' aria-controls="ra-start-list"' : ""}>${A.paths.length} rondleidingen ${icon("chevrondown", "s")}</button>
          <button type="button" class="btn primary rs-startbtn" data-action="arch-path" data-id="${esc(first.id)}" title="${esc("Begint met: " + first.name)}">${icon("play", "s")} Start rondleiding</button>
        </div>
      </div>
      ${open ? `<ul class="rs-list" id="ra-start-list">${cards}</ul>` : ""}
    </section>`;
  },
  tourCard(T) {
    const p = T.path, A = this.A(), nm = (id) => (this.byId(id) || {}).name || id;
    const ph = (id) => this.phase(id);
    const chip = (id, cur) => { const b = this.byId(id); return b ? `<span class="rt-chip ${esc(ph(id).cls)}${cur ? " cur" : ""}"><span class="rt-chip-ico" aria-hidden="true">${icon(b.icon || "info", "s")}</span>${esc(b.name)}</span>` : ""; };
    const dots = `<ol class="rt-dots" aria-label="Stappen">${p.steps.map(([id], i) => `<li><button type="button" class="rt-dot arch-stepbtn ${esc(ph(id).cls)}${i === T.step && !T.end ? " on" : i < T.step || T.end ? " done" : ""}" data-action="arch-step" data-to="${i}"${i === T.step && !T.end ? ' aria-current="step"' : ""} aria-label="${esc(`Stap ${i + 1}: ${nm(id)}`)}" title="${esc(nm(id))}">${i + 1}</button></li>`).join("")}<li><button type="button" class="rt-dot rt-end${T.end ? " on" : ""}" data-action="arch-step" data-to="${T.n}"${T.end ? ' aria-current="step"' : ""} aria-label="Samenvatting" title="Samenvatting">${icon("flag", "s")}</button></li></ol>`;
    const pct = Math.round(((T.end ? T.n : T.step + 1) / T.n) * 100);
    const others = A.paths.filter((x) => x.id !== p.id), next = others[(A.paths.indexOf(p)) % others.length];
    let body, nav, tone = "";
    if (T.end) {
      tone = " is-end";
      body = `<div class="rt-sum"><p class="rt-lead"><span class="rt-sumico" aria-hidden="true">${icon("flag", "s")}</span><span><b>Samenvatting.</b> ${esc(p.sum || "Zo hangen deze onderdelen samen.")}</span></p>
        <ol class="rt-list">${p.steps.map(([id, txt], i) => { const b = this.byId(id); return `<li><button type="button" class="rt-li ${esc(ph(id).cls)}" data-action="arch-step" data-to="${i}"><span class="rt-n" aria-hidden="true">${i + 1}</span><span class="rt-li-t"><b>${b ? `<span class="rt-li-ico" aria-hidden="true">${icon(b.icon || "info", "s")}</span>` : ""}${esc(nm(id))}</b><span>${esc(txt)}</span></span></button></li>`; }).join("")}</ol></div>`;
      nav = `<button type="button" class="btn small" data-action="arch-step" data-dir="prev">${icon("chevronleft", "s")} Vorige</button>
        <span class="rt-btns"><button type="button" class="btn small" data-action="arch-step" data-to="0">${icon("undo", "s")} Opnieuw</button>${next ? `<button type="button" class="btn small rt-next" data-action="arch-path" data-id="${esc(next.id)}" title="${esc(`Volgende rondleiding: ${next.name} (${next.steps.length} stappen)`)}">${icon(next.icon || "route", "s")} <span><span class="rt-next-k">Volgende rondleiding</span> ${esc(next.name)}</span></button>` : ""}<button type="button" class="btn primary small" data-action="arch-tour-close">${icon("check", "s")} Afronden</button></span>`;
    } else {
      const [id, txt] = p.steps[T.step], b = this.byId(id), P = ph(id);
      tone = P.cls ? " " + P.cls : "";
      const prev = T.step ? T.ids[T.step - 1] : "", via = prev ? this.link(prev, id).nodes.filter((x) => !T.ids.includes(x)).reverse() : [];
      const flow = prev ? `<p class="rt-flow"><span class="rt-flow-h">Vanuit stap ${T.step}</span>${[prev, ...via].map((x) => chip(x) + `<span class="rt-arr" aria-hidden="true">${icon("chevronright", "s")}</span><span class="sr-only">naar</span>`).join("")}${chip(id, true)}</p>` : "";
      body = `<div class="rt-step"><span class="rt-num" aria-hidden="true">${T.step + 1}</span><div class="rt-txt">
          <span class="rt-col"><span class="rt-phdot" aria-hidden="true"></span>${P.col ? `${P.i + 1}. ${esc(P.col.name)} <span>· ${esc(P.col.q)}</span>` : ""}</span>
          <b class="rt-name">${b ? `<span class="rt-bico" aria-hidden="true">${icon(b.icon || "info", "s")}</span>` : ""}${esc(nm(id))}</b>
          <p>${esc(txt)}</p>${flow}</div></div>`;
      nav = `<button type="button" class="btn small" data-action="arch-step" data-dir="prev"${T.step ? "" : " disabled"}>${icon("chevronleft", "s")} Vorige</button>
        ${dots}
        <button type="button" class="btn primary small" data-action="arch-step" data-dir="next">${T.step === T.n - 1 ? "Samenvatting" : "Volgende"} ${icon("chevronright", "s")}</button>`;
    }
    return `<section class="ra-tour${tone}" id="ra-tour" aria-labelledby="ra-tour-h">
      <div class="rt-prog" aria-hidden="true"><span style="width:${pct}%"></span></div>
      <div class="rt-head"><span class="rt-ico" aria-hidden="true">${icon(p.icon || "route", "s")}</span><div class="rt-title"><span class="rt-kick">Rondleiding</span><h3 id="ra-tour-h">${esc(p.name)}</h3></div>
        <span class="rt-hint" aria-hidden="true"><kbd>←</kbd> <kbd>→</kbd> bladeren · <kbd>Esc</kbd> sluiten</span>
        <span class="rt-count">${T.end ? "Samenvatting" : `Stap ${T.step + 1} van ${T.n}`}</span>
        <button type="button" class="icon-btn rt-x" data-action="arch-tour-close" aria-label="Rondleiding sluiten (Esc)" title="Rondleiding sluiten (Esc)">${icon("x", "s")}</button></div>
      <div class="rt-body" aria-live="polite" aria-atomic="true"><span class="sr-only">${esc(T.end ? "Samenvatting" : `Stap ${T.step + 1} van ${T.n}`)}.</span>${body}</div>
      <div class="rt-nav">${nav}</div>
    </section>`;
  },
  /* ---------- Relatielijnen: SVG onder de blokken, berekend uit de posities na het renderen ---------- */
  lineSample(k) {
    return `<svg class="lg-line k-${esc(k)}" width="36" height="10" viewBox="0 0 36 10" aria-hidden="true" focusable="false"><path class="lg-l" d="M1 5H29"/><path class="lg-a" d="M28 1.5L34.5 5L28 8.5Z"/></svg>`;
  },
  relOn() { return UI.archRel !== false; },
  legendOn() { return UI.archLegend === true; },
  relSvg() {
    const mk = Object.keys(this.A().kinds || {}).map((k) => `<marker id="ra-mk-${esc(k)}" class="ra-mk k-${esc(k)}" viewBox="0 0 10 10" refX="9.5" refY="5" markerWidth="4.5" markerHeight="4.5" markerUnits="strokeWidth" orient="auto"><path d="M1 1L9.5 5L1 9Z"/></marker>`).join("");
    return `<svg class="ra-rel" aria-hidden="true" focusable="false"><defs>${mk}</defs><g class="ra-base"></g><g class="ra-edges"></g></svg>`;
  },
  _raf: 0,
  _ro: null,
  hov: "",
  /** Lijnen opnieuw tekenen (gebundeld per animatieframe). */
  queue() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => { this._raf = 0; this.draw(); });
  },
  /* Lijnen als metrokaart: per goot en soort relatie één verticale baan (trunk), per kaartzijde en soort één aansluitpunt,
     en per fase en soort één doorsteek tussen de kaarten. Zichtbaar is alleen de samengevoegde laag (.ra-base); elke relatie
     ligt daarnaast als eigen pad (.ra-e) exact op dezelfde coördinaten en wordt alleen getoond bij aanwijzen, kiezen of een rondleiding. */
  draw() {
    const grid = $(".ra-grid"), svg = grid && grid.querySelector("svg.ra-rel");
    const base = svg && svg.querySelector(".ra-base"), g = svg && svg.querySelector(".ra-edges");
    if (!g || !base) return;
    g.textContent = ""; base.textContent = "";
    if (!this.relOn() || getComputedStyle(svg).display === "none") return;
    const box = grid.getBoundingClientRect(), A = this.A(), els = {}, colIx = {};
    svg.setAttribute("viewBox", `0 0 ${Math.round(box.width)} ${Math.round(box.height)}`);
    svg.setAttribute("width", String(Math.round(box.width)));
    svg.setAttribute("height", String(Math.round(box.height)));
    A.cols.forEach((c, i) => { colIx[c.id] = i; });
    grid.querySelectorAll(".arch-block[data-id]").forEach((el) => {
      if (!el.getClientRects().length) return;
      const q = el.getBoundingClientRect();
      els[el.dataset.id] = { l: q.left - box.left, r: q.right - box.left, t: q.top - box.top, h: q.height, dim: el.classList.contains("dim") };
    });
    const kinds = Object.keys(A.kinds || {}), kOrd = (k) => Math.max(0, kinds.indexOf(k));
    const f = (v) => Math.round(v * 10) / 10, ns = "http://www.w3.org/2000/svg";
    /* Fasen met hun vrije openingen tussen kaarten (voor doorsteken dwars door een fase). */
    const lanes = [...grid.querySelectorAll(":scope > .ra-col")].map((col) => {
      const q = (col.querySelector(".ra-blocks") || col).getBoundingClientRect(), qc = col.getBoundingClientRect();
      const obs = [...col.querySelectorAll(".ra-colhead, .arch-block, .ra-grp-h")]
        .filter((x) => x.getClientRects().length).map((x) => { const r = x.getBoundingClientRect(); return [r.top - box.top, r.bottom - box.top]; }).sort((x, y) => x[0] - y[0]);
      const free = [];
      let y = qc.top - box.top;
      obs.forEach(([t, b]) => { if (t - y >= 3) free.push([y, t]); y = Math.max(y, b); });
      free.push([y, Math.max(y + 24, box.height)]);
      return { l: q.left - box.left, r: q.right - box.left, free };
    });
    /* 1. Relaties: zijden en goten. Binnen één fase loopt een relatie via de goot aan de linkerkant (bij Bronnen rechts). */
    const list = [];
    A.edges.forEach(([a, b, k]) => {
      const ba = this.byId(a), bb = this.byId(b);
      if (!els[a] || !els[b] || !ba || !bb) return;
      const ca = colIx[ba.col], cb = colIx[bb.col], e = { a, b, k, ca, cb, same: ca === cb, gs: [] };
      if (e.same) { e.sa = e.sb = ca === 0 ? "r" : "l"; e.gs.push(ca === 0 ? 1 : ca); }
      else { e.dir = cb > ca ? 1 : -1; e.sa = e.dir > 0 ? "r" : "l"; e.sb = e.dir > 0 ? "l" : "r"; for (let c = ca; c !== cb; c += e.dir) e.gs.push(e.dir > 0 ? c + 1 : c); }
      e.lo = els[a].dim || els[b].dim;
      list.push(e);
    });
    /* 2. Aansluitpunten: per kaartzijde één punt per soort en richting; alle relaties van dat punt delen de aftakking. */
    const cy = (id) => els[id].t + els[id].h / 2, ports = {};
    const port = (id, side, dir, k, other) => {
      const m = (ports[id + "|" + side] = ports[id + "|" + side] || {});
      return ((m[dir + k] = m[dir + k] || { id, side, dir, k, ys: [], y: 0, lo: true }).ys.push(other), m[dir + k]);
    };
    list.forEach((e) => { e.pa = port(e.a, e.sa, "o", e.k, cy(e.b)); e.pb = port(e.b, e.sb, "i", e.k, cy(e.a)); if (!e.lo) e.pb.lo = false; });
    Object.keys(ports).forEach((key) => {
      const r = els[key.split("|")[0]], arr = Object.values(ports[key]), n = arr.length;
      arr.forEach((p) => { p.w = p.ys.reduce((s, v) => s + v, 0) / p.ys.length; });
      arr.sort((x, y) => x.w - y.w || kOrd(x.k) - kOrd(y.k) || (x.dir < y.dir ? -1 : 1));
      const step = n > 1 ? Math.min(9, (r.h * 0.6) / (n - 1)) : 0;
      arr.forEach((p, i) => { p.y = r.t + r.h / 2 + (i - (n - 1) / 2) * step; });
    });
    /* 3. Banen per goot: [binnen Bronnen] [doorgaand per soort] [binnen de fase rechts], elk op een vaste x. */
    const laneKey = (gi, e) => `${gi}|${e.same ? (e.ca === gi ? "R" : "P") : "X"}|${e.k}`, used = {}, lx = {};
    list.forEach((e) => e.gs.forEach((gi) => { (used[gi] = used[gi] || new Set()).add(laneKey(gi, e)); }));
    Object.keys(used).forEach((gi) => {
      const L = lanes[gi - 1], R = lanes[gi];
      if (!L || !R) return;
      const side = { P: 0, X: 1, R: 2 }, keys = [...used[gi]].sort((x, y) => { const a = x.split("|"), b = y.split("|"); return side[a[1]] - side[b[1]] || kOrd(a[2]) - kOrd(b[2]); });
      const n = keys.length, gw = R.l - L.r, m = Math.min(6, gw / 4), sp = n > 1 ? Math.min(7, (gw - 2 * m) / (n - 1)) : 0, mid = (L.r + R.l) / 2;
      keys.forEach((k, i) => { lx[k] = mid + (i - (n - 1) / 2) * sp; });
    });
    /* 4. Doorsteken: per tussenliggende fase en soort één horizontale baan door de opening die het best past. */
    const chans = {};
    list.forEach((e) => {
      e.ys = [e.pa];
      const n = Math.abs(e.cb - e.ca);
      for (let i = 1; i < n; i++) {
        const c = e.ca + e.dir * i, key = c + "|" + e.k;
        (chans[key] = chans[key] || { c, k: e.k, wants: [], y: 0 }).wants.push(e.pa.y + ((e.pb.y - e.pa.y) * i) / n);
        e.ys.push(chans[key]);
      }
      e.ys.push(e.pb);
    });
    const gaps = {};
    Object.values(chans).forEach((ch) => {
      const w = ch.wants.slice().sort((x, y) => x - y), want = w[Math.floor((w.length - 1) / 2)], fr = lanes[ch.c].free;
      let k = 0, bd = Infinity;
      fr.forEach(([t, b], i) => { const d = Math.abs(Math.min(Math.max(want, t), b) - want); if (d < bd) { bd = d; k = i; } });
      ch.want = want;
      (gaps[ch.c + "|" + k] = gaps[ch.c + "|" + k] || []).push(ch);
    });
    Object.keys(gaps).forEach((key) => {
      const arr = gaps[key].sort((x, y) => kOrd(x.k) - kOrd(y.k)), [c, k] = key.split("|").map(Number), [t, b] = lanes[c].free[k];
      const pad = Math.min(4, (b - t) / 2), lo = t + pad, hi = b - pad, n = arr.length, sp = n > 1 ? Math.min(5, (hi - lo) / (n - 1)) : 0;
      const ctr = arr.reduce((s, x) => s + x.want, 0) / n, start = Math.min(Math.max(ctr - ((n - 1) * sp) / 2, lo), Math.max(lo, hi - (n - 1) * sp));
      arr.forEach((ch, i) => { ch.y = start + i * sp; });
    });
    /* 5. Punten per relatie (alleen H/V). */
    list.forEach((e) => {
      const ra = els[e.a], rb = els[e.b], x1 = e.sa === "r" ? ra.r : ra.l, x2 = e.sb === "r" ? rb.r : rb.l, ys = e.ys.map((v) => v.y), pts = [[x1, ys[0]]];
      e.gs.forEach((gi, i) => {
        const L = lanes[gi - 1], R = lanes[gi], x = lx[laneKey(gi, e)] ?? (L && R ? (L.r + R.l) / 2 : x1);
        pts.push([x, ys[i]], [x, ys[i + 1]]);
      });
      pts.push([x2, ys[ys.length - 1]]);
      const P = [];
      pts.map(([x, y]) => [f(x), f(y)]).forEach((q) => {
        const l = P[P.length - 1], m = P[P.length - 2];
        if (l && l[0] === q[0] && l[1] === q[1]) return;
        if (l && m && ((m[0] === l[0] && l[0] === q[0]) || (m[1] === l[1] && l[1] === q[1]))) P.pop();
        P.push(q);
      });
      e.pts = P;
    });
    /* Rechte stukken (H/V) met kleine afgeronde hoeken. */
    const route = (P) => {
      let cx = P[0][0], cy0 = P[0][1], d = `M${cx} ${cy0}`;
      const to = (x, y) => { if (y === cy0 && x !== cx) d += `H${f(x)}`; else if (x === cx && y !== cy0) d += `V${f(y)}`; cx = x; cy0 = y; };
      for (let i = 1; i < P.length - 1; i++) {
        const [px, py] = P[i - 1], [x, y] = P[i], [nx, ny] = P[i + 1];
        const r = Math.min(5, Math.abs(x - px + y - py) / 2, Math.abs(nx - x + ny - y) / 2);
        const ix = f(x - Math.sign(x - px) * r), iy = f(y - Math.sign(y - py) * r), ox = f(x + Math.sign(nx - x) * r), oy = f(y + Math.sign(ny - y) * r);
        to(ix, iy);
        d += `Q${x} ${y} ${ox} ${oy}`; cx = ox; cy0 = oy;
      }
      const z = P[P.length - 1];
      to(z[0], z[1]);
      return d;
    };
    /* 6. Samengevoegde laag: overlappende stukken van dezelfde soort worden één lijn; L-hoeken worden afgerond, T-splitsingen niet. */
    const segs = {};
    list.forEach((e) => {
      for (let i = 0; i < e.pts.length - 1; i++) {
        const [x0, y0] = e.pts[i], [x1, y1] = e.pts[i + 1], v = x0 === x1;
        const key = `${e.lo ? 1 : 0}|${e.k}|${v ? "V" : "H"}|${v ? x0 : y0}`;
        (segs[key] = segs[key] || []).push(v ? [Math.min(y0, y1), Math.max(y0, y1)] : [Math.min(x0, x1), Math.max(x0, x1)]);
      }
    });
    const groups = {};
    Object.keys(segs).forEach((key) => {
      const [lo, k, o, c] = key.split("|"), arr = segs[key].sort((x, y) => x[0] - y[0]), out = [];
      arr.forEach(([a, b]) => { const l = out[out.length - 1]; if (l && a <= l.b + 0.3) l.b = Math.max(l.b, b); else out.push({ v: o === "V", c: +c, a, b, ta: 0, tb: 0 }); });
      (groups[lo + "|" + k] = groups[lo + "|" + k] || []).push(...out);
    });
    Object.keys(groups).sort().reverse().forEach((gk) => {
      const [lo, k] = gk.split("|"), arr = groups[gk], ends = {}, corners = [];
      const pt = (s, w) => (s.v ? [s.c, s[w]] : [s[w], s.c]);
      arr.forEach((s) => ["a", "b"].forEach((w) => { const p = pt(s, w), key = p[0] + "," + p[1]; (ends[key] = ends[key] || []).push([s, w]); }));
      const inside = (x, y) => arr.some((s) => (s.v ? s.c === x && y > s.a + 0.2 && y < s.b - 0.2 : s.c === y && x > s.a + 0.2 && x < s.b - 0.2));
      Object.keys(ends).forEach((key) => {
        const list2 = ends[key];
        if (list2.length !== 2 || list2[0][0].v === list2[1][0].v) return;
        const [x, y] = key.split(",").map(Number);
        if (inside(x, y)) return;
        const [[s1, w1], [s2, w2]] = list2, len = (s) => s.b - s.a, r = Math.min(5, len(s1) / 2, len(s2) / 2);
        if (r < 0.5) return;
        const far = (s, w) => (w === "a" ? s.b : s.a);
        const H = s1.v ? [s2, w2] : [s1, w1], V = s1.v ? [s1, w1] : [s2, w2];
        const hx = f(x + Math.sign(far(...H) - x) * r), vy = f(y + Math.sign(far(...V) - y) * r);
        H[0]["t" + H[1]] = r; V[0]["t" + V[1]] = r;
        corners.push(`M${hx} ${y}Q${x} ${y} ${x} ${vy}`);
      });
      let d = "";
      arr.forEach((s) => { const a = f(s.a + s.ta), b = f(s.b - s.tb); if (b - a < 0.1 && !(s.ta || s.tb)) return; d += s.v ? `M${s.c} ${a}V${b}` : `M${a} ${s.c}H${b}`; });
      d += corners.join("");
      if (!d) return;
      const p = document.createElementNS(ns, "path");
      p.setAttribute("d", d);
      p.setAttribute("class", `ra-b k-${k}${lo === "1" ? " lo" : ""}`);
      base.appendChild(p);
    });
    /* Pijlpunt alleen aan het eind van de tak, bij het doel (één per aansluitpunt). */
    const heads = {};
    Object.values(ports).forEach((m) => Object.values(m).forEach((p) => {
      if (p.dir !== "i") return;
      const r = els[p.id], x = f(p.side === "r" ? r.r : r.l), y = f(p.y), s = p.side === "r" ? 1 : -1;
      const key = `${p.lo ? 1 : 0}|${p.k}`;
      heads[key] = (heads[key] || "") + `M${x} ${y}L${f(x + s * 6.5)} ${f(y - 3.5)}L${f(x + s * 6.5)} ${f(y + 3.5)}Z`;
    }));
    Object.keys(heads).forEach((key) => {
      const [lo, k] = key.split("|"), p = document.createElementNS(ns, "path");
      p.setAttribute("d", heads[key]);
      p.setAttribute("class", `ra-ah k-${k}${lo === "1" ? " lo" : ""}`);
      base.appendChild(p);
    });
    /* 7. Per relatie een eigen pad op dezelfde coördinaten: zichtbaar bij selectie, aanwijzen of rondleiding. */
    const T = this.tour(), sel = UI.archSel && els[UI.archSel] ? UI.archSel : "";
    let hit = new Set(), trail = new Set();
    if (T) { hit = T.cur; trail = T.trail; }
    else if (sel) {
      const ch = !UI.archLayer && (!UI.archTier || UI.archTier === "all") ? this.chain(sel) : null, r = this.rel(sel, ch);
      r.from.forEach(([n]) => hit.add(n + ">" + sel)); r.to.forEach(([n]) => hit.add(sel + ">" + n));
    }
    list.forEach((e) => {
      const key = e.a + ">" + e.b, p = document.createElementNS(ns, "path");
      p.setAttribute("d", route(e.pts));
      p.setAttribute("class", ["ra-e", "k-" + e.k, hit.has(key) ? "on" : "", trail.has(key) ? "tr" : "", e.lo ? "lo" : ""].filter(Boolean).join(" "));
      p.setAttribute("marker-end", `url(#ra-mk-${e.k})`);
      p.dataset.a = e.a; p.dataset.b = e.b; p.dataset.k = e.k;
      g.appendChild(p);
    });
    grid.classList.toggle("rel-sel", hit.size + trail.size > 0);
    grid.classList.toggle("rel-tour", !!T);
    this.mark();
  },
  /** Wijzen of focussen: alleen de lijnen van dat onderdeel markeren (zonder opnieuw te renderen). */
  mark() {
    const grid = $(".ra-grid");
    if (!grid) return;
    const id = this.hov;
    let n = 0;
    grid.querySelectorAll("svg.ra-rel path.ra-e").forEach((p) => { const on = !!id && (p.dataset.a === id || p.dataset.b === id); if (on) n++; p.classList.toggle("hov", on); });
    grid.classList.toggle("rel-hov", n > 0);
    const pk = document.getElementById("ra-peek");
    if (pk && pk.dataset.id !== id) { pk.dataset.id = id; pk.innerHTML = id ? this.peek(id) : ""; pk.closest(".arch-detail").classList.toggle("has-peek", !!id); }
  },
  /** Hertekenen bij elke render en bij elke maatwijziging van de plaat (venster, paneel, lettertype). */
  after(main) {
    if (this._ro) { this._ro.disconnect(); this._ro = null; }
    const grid = main && main.querySelector(".ra-grid");
    if (!grid) return;
    const tc = main.querySelector(".ra-tour");
    grid.style.setProperty("--ra-tour-h", `${tc ? Math.ceil(tc.getBoundingClientRect().height) : 0}px`);
    const a = document.activeElement;
    this.hov = a && a.matches && a.matches(".ra-grid .arch-block:focus-visible") ? a.dataset.id : "";
    if (typeof ResizeObserver !== "undefined") { this._ro = new ResizeObserver(() => this.queue()); this._ro.observe(grid); }
    this.queue();
  },
};

registerView("architectuur", {
  title: "Referentiearchitectuur",
  fac: {
    duration: 15,
    goal: "Samen het grote plaatje zien: wat classificatie, labels, DLP en inzicht doen, en welke licentie daarvoor nodig is.",
    questions: ["Welke bronnen zijn voor jullie het belangrijkst: e-mail, SharePoint, Teams, apparaten of Copilot?", "Welke licenties zijn er: E3, E5 of een E5-add-on?", "Is Copilot al in gebruik of gepland?"],
    tips: ["Start met de rondleiding ‘Classificatie of label?’ (knop Start rondleiding): dat is de meest gestelde vraag.", "Klik een bron aan (bijv. Microsoft Teams) om te laten zien welke maatregelen daar wel en niet gelden.", "Klik aan het eind een blok aan: het detailpaneel toont onder ‘In jullie ontwerp’ wat er al staat en wat nog open is."],
    pitfalls: ["Alle blokken in één keer uitleggen: kies één rondleiding per keer.", "Retentie en Insider Risk diep bespreken: die vallen buiten deze workshop.", "Roadmap-onderdelen presenteren alsof ze al beschikbaar zijn."],
    links: ["labels", "dlp", "licensing"],
  },
  render() {
    const st = S(), A = CATALOG.arch;
    const layer = ArchView.layerOf(UI.archLayer);
    const tier = A.tiers.some((x) => x[0] === UI.archTier) ? UI.archTier : "all";
    const path = A.paths.find((p) => p.id === UI.archPath) || null;
    const sel = ArchView.byId(UI.archSel);
    const chain = sel && !path && !layer && tier === "all" ? ArchView.chain(sel.id) : null;
    const tour = ArchView.tour();
    const o = { layer, tier, path, tour, sel: sel ? sel.id : "", chain };

    const more = `<p>Van links naar rechts: waar informatie ontstaat, hoe Purview herkent wat erin staat, hoe een label wordt toegekend, wat het label beschermt en hoe je meet wat er gebeurt.</p>
      <p><b>Classificatie</b> stelt vast wát er in een item staat. Een <b>label</b> is de vastgelegde keuze over hoe gevoelig het is. <b>Bescherming</b> volgt uit het label en de inhoud.</p>
      <p class="xs muted">Licenties: E3 = Microsoft 365 E3; E5 = Microsoft 365 E5 of een E5 Compliance- of Information Protection-add-on. Afhankelijk van jullie plan; controleer.</p>`;
    const head = pageHead("Introductie", "Referentiearchitectuur", "Hoe Purview gevoelige informatie herkent, labelt en beschermt.", "", more);
    const foot = `<p class="ra-foot xs muted">Inhoud gecontroleerd op Microsoft Learn (${esc(A.verified || CATALOG.docsVerified || "")}). ${esc(A.scope.lead)} ${infoTip("Buiten deze plaat: " + A.scope.out.join("; ") + ". Daar gelden andere voorwaarden.")} · Opzet gebaseerd op ${learn("archOriginal", "Microsoft Purview Classification & Labeling reference architecture")} (MIT).</p>`;
    const nextV = Views.schema;
    const next = `<nav class="ra-next" aria-label="Verder">
      <button type="button" class="btn ghost small" data-action="go" data-route="start">${icon("chevronleft", "s")} Terug naar Start</button>
      ${nextV ? `<button type="button" class="btn small ra-next-go" data-action="go" data-route="schema"><span><span class="ra-next-k">Volgende stap</span> ${esc(nextV.title)}</span> ${icon("chevronright", "s")}</button>` : ""}
    </nav>`;

    const active = !!(path || layer || tier !== "all" || sel);
    const sel_ = (act, label, opts, cur, first) => `<label class="ra-f"><span>${esc(label)}</span><select class="select" data-action="${act}" aria-label="${esc(label)}">${first ? `<option value="">${esc(first)}</option>` : ""}${opts.map(([k, n]) => `<option value="${esc(k)}"${cur === k ? " selected" : ""}>${esc(n)}</option>`).join("")}</select></label>`;
    const dense = ArchView.denseOn();
    const bar = `<div class="ra-bar arch-bar">
      <div class="ra-filters" role="group" aria-label="Bekijk het model">
        ${sel_("arch-path", "Rondleiding", A.paths.map((p) => [p.id, p.name]), path ? path.id : "", "Geen rondleiding")}
        ${sel_("arch-layer", "Laag", A.layers.map((l) => [l.id, l.name]), layer ? layer.id : "", "Alle lagen")}
        ${sel_("arch-tier", "Licentie", A.tiers, tier, "")}
      </div>
      <div class="ra-tools" role="group" aria-label="Weergave">
        <button type="button" class="btn ghost small${dense ? "" : " on"}" data-action="arch-dense" aria-pressed="${!dense}" title="Korte omschrijving onder elke titel tonen">${icon("menu", "s")} Omschrijvingen</button>
        <button type="button" class="btn ghost small${ArchView.relOn() ? " on" : ""}" data-action="arch-rel" aria-pressed="${ArchView.relOn()}" title="Lijnen tussen de onderdelen tonen of verbergen">${icon("route", "s")} Relaties</button>
        <button type="button" class="btn ghost small${ArchView.legendOn() ? " on" : ""}" data-action="arch-legend" aria-pressed="${ArchView.legendOn()}"${ArchView.legendOn() ? ' aria-controls="ra-legend"' : ""}>${icon("info", "s")} Legenda</button>
        <button type="button" class="btn ghost small" data-action="arch-reset"${active ? "" : " disabled"} title="Alles wissen (Esc)">${icon("undo", "s")} Reset</button>
      </div></div>`;

    const priv = A.blocks.filter((b) => b.status === "private");
    const privMsg = priv.length ? msg("warn", `Private preview: ${esc(priv.map((b) => b.name).join(", "))}. Alleen beschikbaar voor geselecteerde tenants.`) : "";
    const relOn = ArchView.relOn();
    const grid = `<div class="ra-grid${dense ? " ra-dense" : ""}${chain ? " has-chain" : ""}${relOn ? " has-rel" : ""}" data-action="arch-bg" tabindex="-1">${relOn ? ArchView.relSvg() : ""}${A.cols.map((c, i) => ArchView.column(c, i, st, o)).join("")}</div>`;
    const listMode = VH.switchMode() === "list";
    const items = A.cols.flatMap((c) => A.blocks.filter((b) => b.col === c.id).map((b) => ({ id: b.id, name: b.name, icon: b.icon, note: c.name })));
    const det = ArchView.detail(sel, st, chain, !!tour);
    const aside = sel ? VH.switcher({ label: "Onderdeel", items, cur: sel.id, route: "architectuur", action: "arch-pick", key: "id" }, det) : det;
    const legend = ArchView.legendOn() ? ArchView.legend() : "";
    return `${head}${privMsg}${tour ? "" : ArchView.startCard()}${bar}${ArchView.lensLine(o)}
      <div class="ra-wrap"><div class="ra-layout${listMode ? " is-list" : ""}${legend ? " has-legend" : ""}">
        <div class="ra-main">${tour ? ArchView.tourCard(tour) : ""}${grid}</div>
        <div class="ra-rail"><aside class="ra-side" aria-label="Uitleg bij het gekozen onderdeel">${aside}</aside>${legend}</div>
      </div></div>${foot}${next}`;
  },
  after: (main) => ArchView.after(main),
});

const archClear = () => { UI.archLayer = ""; UI.archTier = "all"; UI.archPath = ""; UI.archSel = ""; UI.archStep = 0; };
const archStepIx = (id) => { const p = CATALOG.arch.paths.find((x) => x.id === UI.archPath); return p ? p.steps.findIndex((s) => s[0] === id) : -1; };
/** Naar stap i van de rondleiding (lengte = samenvatting); het blok van die stap wordt gekozen en in beeld gebracht. */
const archGoStep = (i, focusSel) => {
  const T = ArchView.tour();
  if (!T) return;
  const n = Math.min(Math.max(i, 0), T.n);
  UI.archStep = n; UI.archSel = n < T.n ? T.ids[n] : "";
  App.render();
  const f = focusSel && $(focusSel);
  if (f && !f.disabled) f.focus();
  else if (focusSel) { const c = $("#ra-tour-h"); if (c) { c.setAttribute("tabindex", "-1"); c.focus(); } }
  archReveal(n < T.n ? T.ids[n] : "");
};
/** Blok van de huidige stap in beeld brengen als het (deels) achter de stappenkaart of buiten beeld valt. */
const archReveal = (id) => {
  const b = id && $(`.ra-grid .arch-block[data-id="${CSS.escape(id)}"]`), main = $("#main");
  if (!b || !main) return;
  const r = b.getBoundingClientRect(), m = main.getBoundingClientRect(), tc = $(".ra-tour"), top = Math.max(m.top, tc && getComputedStyle(tc).position === "sticky" ? tc.getBoundingClientRect().bottom : m.top);
  if (r.top >= top + 8 && r.bottom <= m.bottom - 8) return;
  b.scrollIntoView({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" });
};
const archShowDetail = () => {
  const d = $("#arch-detail");
  if (d && d.getBoundingClientRect().top > window.innerHeight - 80) d.scrollIntoView({ block: "nearest", behavior: reducedMotion() ? "auto" : "smooth" });
};
/** Startkaart met rondleidingen in- of uitklappen; de focus blijft op de knop. */
Actions["arch-intro"] = () => { UI.archIntro = UI.archIntro !== true; App.render(); const f = $(".ra-start .rs-x"); if (f) f.focus(); };
Actions["arch-dense"] = () => { UI.archDense = !ArchView.denseOn(); App.render(); };
Actions["arch-rel"] = () => { UI.archRel = !ArchView.relOn(); App.render(); };
/* Wijzen of toetsenbordfocus op een blok markeert alleen de lijnen van dat blok. */
const archHover = (id) => { if (ArchView.hov === id) return; ArchView.hov = id; ArchView.mark(); };
const archFocusId = () => { const a = document.activeElement; return a && a.matches && a.matches(".ra-grid .arch-block:focus-visible") ? a.dataset.id || "" : ""; };
document.addEventListener("pointerover", (e) => {
  if (typeof UI === "undefined" || UI.route !== "architectuur") return;
  const b = e.target && e.target.closest && e.target.closest(".ra-grid .arch-block");
  archHover(b ? b.dataset.id || "" : archFocusId());
});
document.addEventListener("focusin", () => { if (typeof UI !== "undefined" && UI.route === "architectuur") archHover(archFocusId()); });
document.addEventListener("focusout", (e) => { if (typeof UI !== "undefined" && UI.route === "architectuur" && !e.relatedTarget) archHover(""); });
Actions["arch-legend"] = () => { UI.archLegend = !ArchView.legendOn(); App.render(); };
/* Laag en licentie zijn lenzen: één tegelijk, en ze vervangen selectie en rondleiding (zoals in het origineel). */
Actions["arch-layer"] = (el) => { const v = el.value || ""; archClear(); UI.archLayer = ArchView.layerOf(v) ? v : ""; App.render(); };
Actions["arch-tier"] = (el) => { const v = el.value || "all"; archClear(); UI.archTier = CATALOG.arch.tiers.some((x) => x[0] === v) ? v : "all"; App.render(); };
Actions["arch-path"] = (el) => {
  const id = el.tagName === "SELECT" ? el.value : UI.archPath === el.dataset.id ? "" : el.dataset.id;
  const p = CATALOG.arch.paths.find((x) => x.id === id);
  archClear();
  if (p) { UI.archPath = p.id; UI.archSel = p.steps[0][0]; UI.archStep = 0; }
  App.render();
  if (p && el.tagName !== "SELECT") { const c = $("#ra-tour-h"); if (c) { c.setAttribute("tabindex", "-1"); c.focus({ preventScroll: true }); } }
  if (p) archReveal(p.steps[0][0]);
};
/** Vorige/Volgende of een stapbolletje; de focus blijft op de bediende knop. */
Actions["arch-step"] = (el) => {
  const T = ArchView.tour();
  if (!T) return;
  const d = el.dataset.dir, to = d === "next" ? T.step + 1 : d === "prev" ? T.step - 1 : Number(el.dataset.to);
  if (!Number.isFinite(to)) return;
  const c = Math.min(Math.max(to, 0), T.n);
  archGoStep(c, d ? `.ra-tour [data-action="arch-step"][data-dir="${d}"]` : `.ra-tour .rt-dot[data-to="${c}"]`);
};
Actions["arch-tour-close"] = () => {
  UI.archPath = ""; UI.archStep = 0; App.render();
  const f = $(".ra-bar select[data-action=arch-path]");
  if (f) f.focus();
};
Actions["arch-reset"] = () => { archClear(); App.render(); const f = $(".ra-grid .arch-block"); if (f) f.focus(); };
Actions["arch-sel"] = (el) => {
  const id = el.dataset.id, ix = UI.archPath ? archStepIx(id) : -1;
  if (ix >= 0) { archGoStep(ix); return; }
  UI.archSel = UI.archSel === id ? "" : id;
  UI.archLayer = ""; UI.archTier = "all";
  App.render();
  archShowDetail();
};
/** Kiezen via switcher, relatiechips of lijst: altijd selecteren (geen toggle); gebruikt alleen el.dataset. */
Actions["arch-pick"] = (el) => {
  const id = el.dataset && el.dataset.id;
  if (!ArchView.byId(id)) return;
  UI.archSel = id; UI.archLayer = ""; UI.archTier = "all";
  const ix = UI.archPath ? archStepIx(id) : -1;
  if (ix >= 0) UI.archStep = ix;
  else if (UI.archPath) { UI.archPath = ""; UI.archStep = 0; }
  App.render();
  archShowDetail();
};
/** Klik op lege ruimte in de plaat wist de selectie (blokken hebben hun eigen actie). */
Actions["arch-bg"] = (el, ev) => {
  if (ev && ev.target && ev.target.closest && ev.target.closest(".arch-block")) return;
  if (!UI.archSel || UI.archPath) return;
  UI.archSel = ""; App.render();
};
/** Link "Bekijk in architectuur" vanaf andere pagina's: opent het model met het blok geselecteerd. */
Actions["arch-open"] = (el) => {
  archClear();
  const p = CATALOG.arch.paths.find((x) => x.id === el.dataset.path);
  UI.archPath = p ? p.id : "";
  UI.archSel = el.dataset.id || "";
  UI.archStep = Math.max(0, archStepIx(UI.archSel));
  App.go("architectuur");
};
function archLink(id, text = "Bekijk in de architectuur", path = "") {
  return `<button type="button" class="link-btn arch-link" data-action="arch-open" data-id="${esc(id)}"${path ? ` data-path="${esc(path)}"` : ""}>${icon("layers", "s")} ${esc(text)}</button>`;
}
/* Esc wist selectie, rondleiding en lenzen (alleen op deze pagina, niet in een dialoog of invoerveld). */
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape" || e.defaultPrevented || typeof UI === "undefined" || UI.route !== "architectuur") return;
  const inTourSel = UI.archPath && e.target && e.target.matches && e.target.matches(".ra-bar select[data-action=arch-path]");
  if ((typeof Modal !== "undefined" && Modal.cur) || (!inTourSel && e.target && e.target.closest && e.target.closest("input, textarea, select, .modal, [role=dialog]"))) return;
  if (!(UI.archSel || UI.archPath || UI.archLayer || (UI.archTier && UI.archTier !== "all"))) return;
  e.preventDefault();
  const was = UI.archSel, tour = !!UI.archPath;
  archClear(); App.render();
  const f = (tour && $(".ra-bar select[data-action=arch-path]")) || (was && $(`.ra-grid .arch-block[data-id="${CSS.escape(was)}"]`)) || $(".ra-grid .arch-block");
  if (f) f.focus();
});
/* Rondleiding: pijltjes links/rechts bladeren door de stappen (niet in invoervelden, keuzelijsten of tabbalken). */
document.addEventListener("keydown", (e) => {
  if ((e.key !== "ArrowRight" && e.key !== "ArrowLeft") || e.defaultPrevented || e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;
  if (typeof UI === "undefined" || UI.route !== "architectuur" || !UI.archPath) return;
  if ((typeof Modal !== "undefined" && Modal.cur) || (e.target && e.target.closest && e.target.closest("input, textarea, select, [contenteditable], [role=tablist], [role=slider], .modal, [role=dialog]"))) return;
  const T = ArchView.tour();
  if (!T) return;
  const to = T.step + (e.key === "ArrowRight" ? 1 : -1);
  if (to < 0 || to > T.n) return;
  e.preventDefault();
  archGoStep(to, `.ra-tour [data-action="arch-step"][data-dir="${e.key === "ArrowRight" ? "next" : "prev"}"]`);
});
