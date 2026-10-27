/* View: Referentiearchitectuur – hoe classificatie, labels, bescherming en inzicht samenwerken (algemeen of voor dit ontwerp).
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
  lit(b, o) {
    if (o.path) return o.path.steps.some((s) => s[0] === b.id);
    if (o.layer) return this.isSrc(b) ? o.layer.cover.includes(b.id) : b.layers.includes(o.layer.id);
    if (o.tier !== "all") return this.isSrc(b) || this.tierOf(b) === o.tier;
    if (o.chain) return b.id === o.sel || o.chain.up.has(b.id) || o.chain.down.has(b.id);
    return true;
  },
  flag(b) { return b.status ? `<span class="ab-flag f-${esc(b.status)}">${esc(this.statusName[b.status] || b.status)}</span>` : ""; },
  block(b, st, o) {
    const stepIdx = o.path ? o.path.steps.findIndex((s) => s[0] === b.id) : -1;
    const lit = this.lit(b, o), d = o.mode === "design" ? this.design(b, st) : null, t = this.tierOf(b);
    const rel = !o.path && o.chain && b.id !== o.sel ? (o.chain.up.has(b.id) ? "up" : o.chain.down.has(b.id) ? "down" : "") : "";
    const cls = ["arch-block", lit ? "" : "dim", stepIdx >= 0 ? "hl" : "", o.sel === b.id ? "sel" : "", rel, b.out ? "out" : "", b.note ? "is-note" : "", d ? "st-" + d.state : ""].filter(Boolean).join(" ");
    const relTxt = rel === "up" ? ", komt hiervoor in de keten" : rel === "down" ? ", volgt hierna in de keten" : "";
    return `<button type="button" class="${cls}" data-action="arch-sel" data-id="${esc(b.id)}" aria-pressed="${o.sel === b.id}" aria-label="${esc(b.name + " – " + b.nl + relTxt)}">
      ${stepIdx >= 0 ? `<span class="ab-step" aria-hidden="true">${stepIdx + 1}</span>` : ""}
      <span class="ab-ico" aria-hidden="true">${icon(b.icon || "info", "s")}</span>
      <span class="ab-txt"><span class="ab-name">${esc(b.name)}</span><span class="ab-nl">${esc(b.nl)}</span></span>
      <span class="ab-meta"><span class="ab-tier t-${esc(t)}" title="${esc(this.tierTitle[t] + "; controleer de licentie")}">${esc(this.tierName[t])}</span>${this.flag(b)}${b.preview ? `<span class="ab-flag f-preview" title="${esc(b.preview)}">Deels preview</span>` : ""}</span>
      ${d && d.text ? `<span class="ab-state"><span class="ab-dot" aria-hidden="true"></span><span>${esc(d.text)}</span></span>` : ""}
    </button>`;
  },
  /* Kernonderdelen per lane; de rest staat achter "+ meer" zolang er geen rondleiding of filter actief is. */
  core: {
    src: ["src-mail", "src-files", "src-teams", "src-devices", "src-copilot"],
    cls: ["cls-auto", "cls-sit", "cls-edm", "cls-tc"],
    lab: ["lab-policy", "lab-manual", "lab-client", "lab-service"],
    pro: ["pro-marking", "pro-encrypt", "pro-container", "pro-dlp"],
    ins: ["ins-explorer", "ins-audit", "ins-alerts", "ins-sim"],
  },
  isOpen(colId, o) {
    if (UI.archAll || o.path || o.layer || o.tier !== "all" || (UI.archOpen && UI.archOpen[colId])) return true;
    const core = this.core[colId];
    return !core || (!!o.sel && this.byId(o.sel) && this.byId(o.sel).col === colId && !core.includes(o.sel));
  },
  column(c, i, st, o) {
    const all = this.A().blocks.filter((b) => b.col === c.id), groups = this.A().groups || {};
    const open = this.isOpen(c.id, o), core = this.core[c.id] || [];
    const list = open ? all : all.filter((b) => core.includes(b.id)), hidden = all.length - list.length;
    let html = "", k = 0;
    while (k < list.length) {
      const g = list[k].grp, run = [];
      while (k < list.length && list[k].grp === g && g) run.push(list[k++]);
      if (run.length > 1) html += `<div class="ra-grp" role="group" aria-label="${esc(groups[g] || g)}"><div class="ra-grp-h">${esc(groups[g] || g)}</div>${run.map((b) => this.block(b, st, o)).join("")}</div>`;
      else if (run.length) html += this.block(run[0], st, o);
      else html += this.block(list[k++], st, o);
    }
    return `<section class="ra-col" aria-label="${esc(`${i + 1}. ${c.name}: ${c.q}`)}">
      <header class="ra-colhead"><span class="ra-num" aria-hidden="true">${i + 1}</span><span class="ra-colt"><b>${esc(c.name)}</b><span>${esc(c.q)}</span></span></header>
      <div class="ra-blocks">${html}${hidden ? `<button type="button" class="ra-more" data-action="arch-more" data-col="${esc(c.id)}" aria-label="${esc(`Nog ${hidden} onderdelen bij ${c.name} tonen`)}">${icon("plus", "s")} ${hidden} meer</button>` : ""}</div></section>`;
  },
  chip(id, kind) {
    const b = this.byId(id);
    if (!b) return "";
    const k = (this.A().kinds || {})[kind];
    return `<button type="button" class="ad-chip${kind ? " k-" + esc(kind) : ""}" data-action="arch-pick" data-id="${esc(id)}"${k ? ` title="${esc(k.name + ": " + k.desc)}"` : ""} aria-label="${esc(b.name + (k ? " (" + k.name + ")" : ""))}">${kind ? `<span class="ad-k" aria-hidden="true"></span>` : ""}${esc(b.name)}</button>`;
  },
  detail(b, st, mode, ch) {
    const A = this.A();
    if (!b) {
      return `<div class="arch-detail empty-hint" id="arch-detail" tabindex="-1">${icon("info")}<div><b>Kies een onderdeel</b><p class="xs muted">Klik op een blok: je ziet wat het doet, welke licentie nodig is en wat ervoor en erna komt.</p></div></div>`;
    }
    const ci = A.cols.findIndex((c) => c.id === b.col), col = A.cols[ci] || {};
    const d = this.design(b, st), v = b.route && Views[b.route], r = this.rel(b.id, ch);
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
    const plate = this.plateFor(b.id);
    const lic = (Array.isArray(b.lic) ? b.lic.length : b.lic) ? licBadge(b.lic) : `<span class="badge neutral">Licentie nog niet bekend</span>`;
    return `<div class="arch-detail" id="arch-detail" tabindex="-1" aria-live="polite">
      <div class="ad-kick">${ci + 1}. ${esc(col.name || "")} <span>· ${esc(col.q || "")}</span></div>
      <h3><span class="ad-ico" aria-hidden="true">${icon(b.icon || "info", "s")}</span>${esc(b.name)}</h3>
      <p class="ad-nl">${esc(b.nl)}</p>
      <div class="ad-badges">${lic}${b.status === "preview" ? previewBadge() : ""}${b.status === "roadmap" ? `<span class="badge neutral">Roadmap</span>` : ""}${b.out ? `<span class="badge neutral">Buiten deze workshop</span>` : ""}${infoTip("Licentie-indicatie; afhankelijk van jullie plan. Controleer in het Microsoft 365-beheercentrum of op Microsoft Learn.")}</div>
      <p class="ad-txt">${esc(b.uitleg)}</p>
      ${mode === "design" && !b.out ? `<div class="ad-design st-${esc(d.state)}"><span class="ab-dot" aria-hidden="true"></span><span><span class="xs muted">In jullie ontwerp</span><b>${esc(this.stateName[d.state] || "")}</b>${d.text && d.text !== this.stateName[d.state] ? ` · ${esc(d.text)}` : ""}</span></div>` : ""}
      ${relRow("Komt van", r.from)}${relRow("Gaat naar", r.to)}${scopeRow}
      ${more ? accordion("arch-more", "Meer uitleg", more) : ""}
      ${tech ? accordion("arch-tech", "Technische details", tech) : ""}
      <div class="ad-actions">${v ? `<button type="button" class="btn primary small" data-action="go" data-route="${esc(b.route)}">${icon("chevronright", "s")} Naar ${esc(v.title)}</button>` : ""}${plate ? `<button type="button" class="btn small" data-action="arch-plate" data-id="${esc(plate.d.id)}" data-block="${esc(b.id)}" title="${esc("Plaat: " + plate.d.title)}">${icon("grid", "s")} Bekijk plaat</button>` : ""}${learn(b.learn, "Microsoft Learn")}</div>
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
  legend(mode) {
    const A = this.A(), k = A.kinds || {};
    const it = (inner, t) => `<li>${inner}<span>${esc(t)}</span></li>`;
    return `<div class="ra-legend" id="ra-legend" role="region" aria-label="Legenda">
      <div><h4>Licentie</h4><ul>${["e3", "e5", "addon"].map((t) => it(`<span class="ab-tier t-${t}">${this.tierName[t]}</span>`, this.tierTitle[t])).join("")}</ul></div>
      <div><h4>Status</h4><ul>${it(`<span class="ab-flag f-preview">Preview</span>`, "Public preview")}${it(`<span class="ab-flag f-roadmap">Roadmap</span>`, "Aangekondigd, nog niet beschikbaar")}${it(`<span class="lg-out" aria-hidden="true"></span>`, "Buiten deze workshop")}</ul></div>
      <div><h4>Keten bij selectie</h4><ul>${it(`<span class="lg-sw sel" aria-hidden="true"></span>`, "Gekozen onderdeel")}${it(`<span class="lg-sw up" aria-hidden="true"></span>`, "Komt ervoor")}${it(`<span class="lg-sw down" aria-hidden="true"></span>`, "Volgt erna")}${it(`<span class="lg-sw dim" aria-hidden="true"></span>`, "Hoort er niet bij")}</ul></div>
      <div><h4>Lijnen: soort relatie</h4><ul>${Object.keys(k).map((x) => it(this.lineSample(x), `${k[x].name}: ${k[x].desc.toLowerCase()}`)).join("")}</ul><p class="lg-note">Wijs een onderdeel aan of klik erop: alleen de lijnen van dat onderdeel worden dan gemarkeerd.</p></div>
      ${mode === "design" ? `<div><h4>Jullie ontwerp</h4><ul>${["on", "todo", "off", "na"].map((s) => it(`<span class="st-${s}"><span class="ab-dot"></span></span>`, this.stateName[s])).join("")}</ul></div>` : ""}
    </div>`;
  },
  /* ---------- Relatielijnen: SVG onder de blokken, berekend uit de posities na het renderen ---------- */
  lineSample(k) {
    return `<svg class="lg-line k-${esc(k)}" width="36" height="10" viewBox="0 0 36 10" aria-hidden="true" focusable="false"><path class="lg-l" d="M1 5H29"/><path class="lg-a" d="M28 1.5L34.5 5L28 8.5Z"/></svg>`;
  },
  relOn() { return UI.archRel !== false; },
  relSvg() {
    const mk = Object.keys(this.A().kinds || {}).map((k) => `<marker id="ra-mk-${esc(k)}" class="ra-mk k-${esc(k)}" viewBox="0 0 10 10" refX="9.5" refY="5" markerWidth="4.5" markerHeight="4.5" markerUnits="strokeWidth" orient="auto"><path d="M1 1L9.5 5L1 9Z"/></marker>`).join("");
    return `<svg class="ra-rel" aria-hidden="true" focusable="false"><defs>${mk}</defs><g class="ra-edges"></g></svg>`;
  },
  _raf: 0,
  _ro: null,
  hov: "",
  /** Lijnen opnieuw tekenen (gebundeld per animatieframe). */
  queue() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => { this._raf = 0; this.draw(); });
  },
  draw() {
    const grid = $(".ra-grid"), svg = grid && grid.querySelector("svg.ra-rel"), g = svg && svg.querySelector(".ra-edges");
    if (!g) return;
    g.textContent = "";
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
    /* Per zijde van een blok worden de aansluitpunten verdeeld, gesorteerd op de positie van het andere blok. */
    const ends = {}, list = [];
    A.edges.forEach(([a, b, k]) => {
      const ba = this.byId(a), bb = this.byId(b);
      if (!els[a] || !els[b] || !ba || !bb) return;
      const ca = colIx[ba.col], cb = colIx[bb.col], e = { a, b, k, same: ca === cb, sa: ca < cb ? "r" : "l", sb: ca > cb ? "r" : "l" };
      const cy = (id) => els[id].t + els[id].h / 2;
      (ends[a + "|" + e.sa] = ends[a + "|" + e.sa] || []).push([e, "ya", cy(b)]);
      (ends[b + "|" + e.sb] = ends[b + "|" + e.sb] || []).push([e, "yb", cy(a)]);
      list.push(e);
    });
    Object.keys(ends).forEach((key) => {
      const r = els[key.split("|")[0]], arr = ends[key].sort((x, y) => x[2] - y[2]), n = arr.length;
      const step = n > 1 ? Math.min(7, (r.h * 0.6) / (n - 1)) : 0;
      arr.forEach(([e, f], i) => { e[f] = r.t + r.h / 2 + (i - (n - 1) / 2) * step; });
    });
    const sel = UI.archSel && els[UI.archSel] ? UI.archSel : "", hit = new Set();
    if (sel) {
      const sb = this.byId(sel), path = A.paths.find((p) => p.id === UI.archPath);
      const ch = !path && !UI.archLayer && (!UI.archTier || UI.archTier === "all") ? this.chain(sel) : null, r = this.rel(sel, ch);
      if (sb) { r.from.forEach(([n]) => hit.add(n + ">" + sel)); r.to.forEach(([n]) => hit.add(sel + ">" + n)); }
    }
    const f = (v) => Math.round(v * 10) / 10, ns = "http://www.w3.org/2000/svg";
    /* Tussenliggende fasen: de lijn steekt over in de ruimte tussen twee kaarten, niet dwars door een kaart. */
    const lanes = [...grid.querySelectorAll(":scope > .ra-col")].map((col) => {
      const q = col.getBoundingClientRect(), obs = [...col.querySelectorAll(".ra-colhead, .arch-block, .ra-more, .ra-grp-h")]
        .filter((x) => x.getClientRects().length).map((x) => { const r = x.getBoundingClientRect(); return [r.top - box.top, r.bottom - box.top]; }).sort((x, y) => x[0] - y[0]);
      const free = [];
      let y = q.top - box.top;
      obs.forEach(([t, b]) => { if (t - y >= 3) free.push([y, t]); y = Math.max(y, b); });
      free.push([y, y + 40]);
      return { l: q.left - box.left, r: q.right - box.left, free };
    });
    const gapY = (lane, want) => {
      let best = null, bd = Infinity;
      lane.free.forEach(([t, b]) => { const c = Math.min(Math.max(want, t + 2), b - 2), dd = Math.abs(c - want); if (dd < bd) { bd = dd; best = (t + b) / 2; } });
      return best === null ? want : best;
    };
    const curve = (xa, ya, xb, yb) => { const s = xb > xa ? 1 : -1, dx = Math.max(10, Math.abs(xb - xa) * 0.5); return `C${f(xa + s * dx)} ${f(ya)} ${f(xb - s * dx)} ${f(yb)} ${f(xb)} ${f(yb)}`; };
    list.forEach((e) => {
      const ra = els[e.a], rb = els[e.b];
      const x1 = e.sa === "r" ? ra.r : ra.l, x2 = e.sb === "r" ? rb.r : rb.l, y1 = e.ya, y2 = e.yb;
      let d;
      if (e.same) {
        const off = Math.min(24, 10 + Math.abs(y2 - y1) * 0.08);
        d = `M${f(x1)} ${f(y1)}C${f(x1 - off)} ${f(y1)} ${f(x2 - off)} ${f(y2)} ${f(x2)} ${f(y2)}`;
      } else {
        const ca = colIx[this.byId(e.a).col], cb = colIx[this.byId(e.b).col], s = cb > ca ? 1 : -1;
        let x = x1, y = y1;
        d = `M${f(x1)} ${f(y1)}`;
        for (let c = ca + s; c !== cb; c += s) {
          const ln = lanes[c];
          if (!ln) continue;
          const xin = s > 0 ? ln.l : ln.r, xout = s > 0 ? ln.r : ln.l, yg = gapY(ln, y1 + ((y2 - y1) * (c - ca)) / (cb - ca));
          d += curve(x, y, xin, yg) + `L${f(xout)} ${f(yg)}`;
          x = xout; y = yg;
        }
        d += curve(x, y, x2, y2);
      }
      const p = document.createElementNS(ns, "path");
      p.setAttribute("d", d);
      p.setAttribute("class", ["ra-e", "k-" + e.k, hit.has(e.a + ">" + e.b) ? "on" : "", ra.dim || rb.dim ? "lo" : ""].filter(Boolean).join(" "));
      p.setAttribute("marker-end", `url(#ra-mk-${e.k})`);
      p.dataset.a = e.a; p.dataset.b = e.b; p.dataset.k = e.k;
      g.appendChild(p);
    });
    grid.classList.toggle("rel-sel", hit.size > 0);
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
  },
  /** Hertekenen bij elke render en bij elke maatwijziging van de plaat (venster, paneel, lettertype). */
  after(main) {
    if (this._ro) { this._ro.disconnect(); this._ro = null; }
    const grid = main && main.querySelector(".ra-grid");
    if (!grid) return;
    const a = document.activeElement;
    this.hov = a && a.matches && a.matches(".ra-grid .arch-block:focus-visible") ? a.dataset.id : "";
    if (typeof ResizeObserver !== "undefined") { this._ro = new ResizeObserver(() => this.queue()); this._ro.observe(grid); }
    this.queue();
  },
  dataUri(v) { return typeof v === "string" && /^data:image\/[\w.+-]+[;,][^"'<>\s]*$/.test(v) ? v : ""; },
  /** Alle platen die getoond kunnen worden (Microsoft-beelden alleen als het beeld er is). */
  plateList() {
    const list = typeof ARCH_DIAGRAMS !== "undefined" ? ARCH_DIAGRAMS : [];
    return list.filter((d) => d.kind !== "ms" || (typeof ARCH_IMAGES !== "undefined" && Object.hasOwn(ARCH_IMAGES, d.img) && this.dataUri(ARCH_IMAGES[d.img])));
  },
  plateById(id) { return this.plateList().find((d) => d.id === id) || null; },
  /** Plaat bij een blok, met de onderdelen die bij dat blok horen (alleen die worden gemarkeerd). */
  plateFor(id) {
    const list = this.plateList();
    for (const d of list) {
      if (d.kind === "svg") { const keys = (d.parts || []).filter((p) => (p[2] || []).includes(id)).map((p) => p[0]); if (keys.length) return { d, keys }; }
      else if ((d.blocks || []).includes(id)) return { d, keys: [] };
    }
    const b = this.byId(id), d = b && b.plate ? list.find((x) => x.id === b.plate) : null;
    return d ? { d, keys: [] } : null;
  },
  /** Eigen plaat als SVG-markup. Logo-tokens worden logo's (of een neutrale tegel); markering alleen voor de opgegeven onderdelen. */
  svg(d, keys) {
    const on = new Set(keys || []);
    let s = String(d.svg).replace(/%%ICO:(\w+):([\d.]+):([\d.]+):([\d.]+):([A-Za-z]{0,3})%%/g, (m, k, X, Y, S, fb) => {
      const uri = typeof BRAND_ASSETS !== "undefined" && Object.hasOwn(BRAND_ASSETS, k) ? this.dataUri(BRAND_ASSETS[k]) : "";
      if (uri) return `<image href="${uri}" x="${X}" y="${Y}" width="${S}" height="${S}"/>`;
      const n = +S;
      return fb ? `<rect x="${X}" y="${Y}" width="${n}" height="${n}" rx="${Math.round(n / 5)}" class="dg-icofb"/><text x="${+X + n / 2}" y="${Math.round(+Y + n * 0.66)}" text-anchor="middle" font-size="${Math.round(n * 0.42)}" class="dg-icofbt">${fb}</text>` : "";
    });
    if (on.size) {
      s = s.replace(/class="dg-p" data-k="([^"]*)"/g, (m, k) => (k.split(" ").some((x) => on.has(x)) ? `class="dg-p on" data-k="${k}"` : m)).replace(/^<svg class="dg"/, '<svg class="dg has-hl"');
    }
    return s;
  },
  media(d, big) {
    if (d.kind === "ms") return `<img class="ra-msimg" src="${esc(this.dataUri(ARCH_IMAGES[d.img]))}" width="${+d.w || 800}" height="${+d.h || 600}" alt="${big ? esc(d.alt || d.title) : ""}" decoding="async">`;
    return this.svg(d);
  },
  credit(d, long) {
    const c = d.credit || {};
    const line = `Bron: Microsoft Learn – ${c.title} (${c.url}), © Microsoft, CC BY 4.0`;
    return long ? `<p class="ra-credit">${esc(line)}. ${learn(c.learn, "Open op Microsoft Learn")}</p>` : `<span class="ra-credit">${esc(line)}</span>`;
  },
  card(d) {
    const ms = d.kind === "ms";
    return `<figure class="ra-plate${ms ? " is-ms" : ""}" data-plate="${esc(d.id)}">
      <button type="button" class="ra-plate-img" data-action="arch-plate" data-id="${esc(d.id)}" aria-label="${esc("Vergroot plaat: " + d.title)}">${this.media(d)}</button>
      <figcaption><span class="ra-kind${ms ? " k-ms" : ""}">${ms ? "Diagram van Microsoft" : "Eigen uitlegplaat"}</span><b>${esc(d.title)}</b><span class="ra-cap">${esc(d.caption)}</span>${ms ? this.credit(d) : `<span class="ra-src">${esc(d.source)}</span>`}</figcaption>
    </figure>`;
  },
  plates() {
    const list = this.plateList(), groups = typeof ARCH_PLATE_GROUPS !== "undefined" ? ARCH_PLATE_GROUPS : [["", ""]];
    const known = new Set(groups.map((g) => g[0]));
    const sec = (id, name, items) => (items.length ? `<section class="ra-pgroup" aria-label="${esc(name || "Platen")}">${name ? `<h3 class="ra-pgroup-h">${esc(name)}</h3>` : ""}<div class="ra-plates">${items.map((d) => this.card(d)).join("")}</div></section>` : "");
    return `<p class="ra-plates-lead muted">Diagrammen van Microsoft en eigen uitlegplaten. Klik op een plaat om te vergroten en de onderdelen één voor één te bespreken.</p>
      ${groups.map(([id, name]) => sec(id, name, list.filter((d) => d.group === id))).join("")}${sec("", "Overig", list.filter((d) => !known.has(d.group)))}`;
  },
  /** Vergrote plaat. keys = onderdelen die bij openen gemarkeerd zijn (alleen vanuit een gekozen blok). */
  openPlate(d, keys, from) {
    keys = keys || [];
    const ms = d.kind === "ms";
    const parts = !ms && (d.parts || []).length ? `<div class="ra-parts"><h4>Onderdelen</h4><p class="xs muted">Kies een onderdeel om het in de plaat te markeren; nog eens klikken wist de markering.</p>
        <ul>${d.parts.map(([k, t]) => `<li><button type="button" class="ra-part${keys.includes(k) ? " on" : ""}" data-action="arch-hl" data-k="${esc(k)}" aria-pressed="${keys.includes(k)}">${esc(t)}</button></li>`).join("")}</ul></div>` : "";
    const note = keys.length && from ? `<p class="ra-hlnote" role="status">${icon("info", "s")}<span>Gemarkeerd: <b>${esc(from.name)}</b>, het onderdeel dat je in de architectuur koos.</span></p>` : "";
    const body = ms
      ? `<div class="ra-zoom is-ms" tabindex="0" role="region" aria-label="${esc("Plaat: " + d.title + "; horizontaal scrollen mogelijk")}">${this.media(d, true)}</div>
        <p class="ra-cap">${esc(d.caption)}</p>
        <div class="ra-parts"><h4>Wat zie je?</h4><ul class="ad-list">${(d.points || []).map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>
        ${this.credit(d, true)}
        ${accordion("arch-plate-lic", "Licentie en herkomst", `<p>${esc(d.credit.license)}</p><p class="xs muted">Herkomst: ${esc(d.credit.repo)}. Tekst op het diagram is Engels, zoals bij Microsoft.</p>`)}`
      : `${note}<div class="ra-zoom" tabindex="0" role="region" aria-label="${esc("Plaat: " + d.title + "; horizontaal scrollen mogelijk")}">${this.svg(d, keys)}</div>
        <p class="ra-cap">${esc(d.caption)}</p>${parts}
        <p class="ra-src">${esc(d.source)}. ${esc(d.license)} ${(d.learn || []).map((k) => learn(k)).join(" ")}</p>`;
    Modal.open({ title: esc(d.title), wide: true, body, focus: keys.length ? ".ra-part.on" : "" });
  },
  /** Markering in de geopende plaat zetten (lege sleutel = niets gemarkeerd). */
  highlight(root, key) {
    const s = root && root.querySelector(".ra-zoom svg.dg");
    if (!s) return;
    s.querySelectorAll(".dg-p").forEach((g) => g.classList.toggle("on", !!key && String(g.dataset.k || "").split(" ").includes(key)));
    s.classList.toggle("has-hl", !!key);
    root.querySelectorAll(".ra-part").forEach((b) => { const on = !!key && b.dataset.k === key; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); });
    const n = root.querySelector(".ra-hlnote");
    if (n) n.remove();
  },
};

registerView("architectuur", {
  title: "Referentiearchitectuur",
  fac: {
    duration: 15,
    goal: "Samen het grote plaatje zien: wat classificatie, labels, DLP en inzicht doen, en welke licentie daarvoor nodig is.",
    questions: ["Welke bronnen zijn voor jullie het belangrijkst: e-mail, SharePoint, Teams, apparaten of Copilot?", "Welke licenties zijn er: E3, E5 of een E5-add-on?", "Is Copilot al in gebruik of gepland?"],
    tips: ["Start met de rondleiding ‘Classificatie of label?’: dat is de meest gestelde vraag.", "Klik een bron aan (bijv. Microsoft Teams) om te laten zien welke maatregelen daar wel en niet gelden.", "Gebruik de plaat ‘Wat werkt waar’ om verwachtingen per locatie te bespreken.", "Zet aan het eind ‘Jullie ontwerp’ aan: zo ziet de klant wat er al staat en wat nog open is."],
    pitfalls: ["Alle blokken in één keer uitleggen: kies één rondleiding per keer.", "Retentie en Insider Risk diep bespreken: die vallen buiten deze workshop.", "Roadmap-onderdelen presenteren alsof ze al beschikbaar zijn."],
    links: ["labels", "dlp", "licensing"],
  },
  render() {
    const st = S(), A = CATALOG.arch;
    const mode = UI.archMode === "design" ? "design" : "generic";
    const tab = UI.archTab === "plates" ? "plates" : "arch";
    const layer = ArchView.layerOf(UI.archLayer);
    const tier = A.tiers.some((x) => x[0] === UI.archTier) ? UI.archTier : "all";
    const path = A.paths.find((p) => p.id === UI.archPath) || null;
    const sel = ArchView.byId(UI.archSel);
    const chain = sel && !path && !layer && tier === "all" ? ArchView.chain(sel.id) : null;
    const o = { mode, layer, tier, path, sel: sel ? sel.id : "", chain };
    const nPlates = ArchView.plateList().length;

    const modeSw = `<div class="btn-group" role="group" aria-label="Weergave">${[["generic", "Algemeen", "layers"], ["design", "Jullie ontwerp", "checkcircle"]].map(([k, n, ic]) => `<button type="button" class="btn small${mode === k ? " on" : ""}" data-action="arch-mode" data-mode="${k}" aria-pressed="${mode === k}">${icon(ic, "s")} ${n}</button>`).join("")}</div>`;
    const more = `<p>Van links naar rechts: waar informatie ontstaat, hoe Purview herkent wat erin staat, hoe een label wordt toegekend, wat het label beschermt en hoe je meet wat er gebeurt.</p>
      <p><b>Classificatie</b> stelt vast wát er in een item staat. Een <b>label</b> is de vastgelegde keuze over hoe gevoelig het is. <b>Bescherming</b> volgt uit het label en de inhoud.</p>
      <p class="xs muted">Licenties: E3 = Microsoft 365 E3; E5 = Microsoft 365 E5 of een E5 Compliance- of Information Protection-add-on. Afhankelijk van jullie plan; controleer.</p>`;
    const head = pageHead("Voorbereiding", "Referentiearchitectuur", "Hoe Purview gevoelige informatie herkent, labelt en beschermt.", modeSw, more);
    const tabs = `<div class="ra-tabs btn-group" role="group" aria-label="Onderdeel van de pagina">${[["arch", "Architectuur", "layers"], ["plates", `Platen (${nPlates})`, "grid"]].map(([k, n, ic]) => `<button type="button" class="btn small${tab === k ? " on" : ""}" data-action="arch-tab" data-tab="${k}" aria-pressed="${tab === k}">${icon(ic, "s")} ${esc(n)}</button>`).join("")}</div>`;
    const foot = `<p class="ra-foot xs muted">Inhoud gecontroleerd op Microsoft Learn (${esc(A.verified || CATALOG.docsVerified || "")}). ${esc(A.scope.lead)} ${infoTip("Buiten deze plaat: " + A.scope.out.join("; ") + ". Daar gelden andere voorwaarden.")} · Opzet gebaseerd op ${learn("archOriginal", "Microsoft Purview Classification & Labeling reference architecture")} (MIT).</p>`;

    if (tab === "plates") return `${head}${tabs}${ArchView.plates()}${foot}`;

    const active = !!(path || layer || tier !== "all" || sel);
    const sel_ = (act, label, opts, cur, first) => `<label class="ra-f"><span>${esc(label)}</span><select class="select" data-action="${act}" aria-label="${esc(label)}">${first ? `<option value="">${esc(first)}</option>` : ""}${opts.map(([k, n]) => `<option value="${esc(k)}"${cur === k ? " selected" : ""}>${esc(n)}</option>`).join("")}</select></label>`;
    const bar = `<div class="ra-bar arch-bar">
      <div class="ra-filters">
        ${sel_("arch-path", "Rondleiding", A.paths.map((p) => [p.id, p.name]), path ? path.id : "", "Geen rondleiding")}
        ${sel_("arch-layer", "Laag", A.layers.map((l) => [l.id, l.name]), layer ? layer.id : "", "Alle lagen")}
        ${sel_("arch-tier", "Licentie", A.tiers, tier, "")}
      </div>
      <div class="ra-tools">
        <button type="button" class="btn ghost small${UI.archAll ? " on" : ""}" data-action="arch-all" aria-pressed="${!!UI.archAll}">${icon("grid", "s")} Alle onderdelen</button>
        <button type="button" class="btn ghost small${UI.archDense ? " on" : ""}" data-action="arch-dense" aria-pressed="${!!UI.archDense}">${icon("menu", "s")} Alleen titels</button>
        <button type="button" class="btn ghost small${ArchView.relOn() ? " on" : ""}" data-action="arch-rel" aria-pressed="${ArchView.relOn()}" title="Lijnen tussen de onderdelen tonen of verbergen">${icon("route", "s")} Relaties</button>
        <button type="button" class="btn ghost small${UI.archLegend ? " on" : ""}" data-action="arch-legend" aria-pressed="${!!UI.archLegend}"${UI.archLegend ? ' aria-controls="ra-legend"' : ""}>${icon("info", "s")} Legenda</button>
        <button type="button" class="btn ghost small" data-action="arch-reset"${active ? "" : " disabled"} title="Alles wissen (Esc)">${icon("undo", "s")} Reset</button>
      </div></div>`;

    const steps = path ? `<ol class="arch-steps ra-steps" aria-label="${esc(path.name)}">${path.steps.map(([id, txt], i) => {
      const b = ArchView.byId(id);
      return `<li><button type="button" class="arch-stepbtn${o.sel === id ? " on" : ""}" data-action="arch-sel" data-id="${esc(id)}"${o.sel === id ? ' aria-current="step"' : ""}><span class="as-num">${i + 1}</span><span><b>${esc(b ? b.name : id)}</b><span class="as-txt">${esc(txt)}</span></span></button></li>`;
    }).join("")}</ol>` : "";

    const priv = A.blocks.filter((b) => b.status === "private");
    const privMsg = priv.length ? msg("warn", `Private preview: ${esc(priv.map((b) => b.name).join(", "))}. Alleen beschikbaar voor geselecteerde tenants.`) : "";
    const relOn = ArchView.relOn();
    const grid = `<div class="ra-grid${UI.archDense ? " ra-dense" : ""}${chain ? " has-chain" : ""}${relOn ? " has-rel" : ""}" data-action="arch-bg" tabindex="-1">${relOn ? ArchView.relSvg() : ""}${A.cols.map((c, i) => ArchView.column(c, i, st, o)).join("")}</div>`;
    const listMode = VH.switchMode() === "list";
    const items = A.cols.flatMap((c) => A.blocks.filter((b) => b.col === c.id).map((b) => ({ id: b.id, name: b.name, icon: b.icon, note: c.name })));
    const det = ArchView.detail(sel, st, mode, chain);
    const aside = sel ? VH.switcher({ label: "Onderdeel", items, cur: sel.id, route: "architectuur", action: "arch-pick", key: "id" }, det) : det;
    const nonEmpty = mode === "design" && !applicableLabels(st).length ? msg("info", "Dit ontwerp heeft nog geen labels. Kies op Start een vertrekpunt; daarna kleurt deze plaat mee.") : "";
    return `${head}${tabs}${nonEmpty}${privMsg}${bar}${UI.archLegend ? ArchView.legend(mode) : ""}${ArchView.lensLine(o)}${steps}
      <div class="ra-layout${listMode ? " is-list" : ""}"><div class="ra-main">${grid}</div><aside class="ra-side" aria-label="Uitleg bij het gekozen onderdeel">${aside}</aside></div>${foot}`;
  },
  after: (main) => ArchView.after(main),
});

const archClear = () => { UI.archLayer = ""; UI.archTier = "all"; UI.archPath = ""; UI.archSel = ""; };
const archShowDetail = () => {
  const d = $("#arch-detail");
  if (d && d.getBoundingClientRect().top > window.innerHeight - 80) d.scrollIntoView({ block: "nearest", behavior: reducedMotion() ? "auto" : "smooth" });
};
Actions["arch-mode"] = (el) => { UI.archMode = el.dataset.mode === "design" ? "design" : "generic"; App.render(); };
Actions["arch-tab"] = (el) => { UI.archTab = el.dataset.tab === "plates" ? "plates" : "arch"; App.render(); };
Actions["arch-all"] = () => { UI.archAll = !UI.archAll; if (!UI.archAll) UI.archOpen = {}; App.render(); };
Actions["arch-more"] = (el) => {
  const id = el.dataset.col; UI.archOpen = UI.archOpen || {}; UI.archOpen[id] = true; App.render();
  const col = $(`.ra-grid .arch-block[data-id="${CSS.escape((ArchView.A().blocks.filter((b) => b.col === id).find((b) => !(ArchView.core[id] || []).includes(b.id)) || {}).id || "")}"]`);
  if (col) col.focus();
};
Actions["arch-dense"] = () => { UI.archDense = !UI.archDense; App.render(); };
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
Actions["arch-legend"] = () => { UI.archLegend = !UI.archLegend; App.render(); };
/* Laag en licentie zijn lenzen: één tegelijk, en ze vervangen selectie en rondleiding (zoals in het origineel). */
Actions["arch-layer"] = (el) => { const v = el.value || ""; archClear(); UI.archLayer = ArchView.layerOf(v) ? v : ""; App.render(); };
Actions["arch-tier"] = (el) => { const v = el.value || "all"; archClear(); UI.archTier = CATALOG.arch.tiers.some((x) => x[0] === v) ? v : "all"; App.render(); };
Actions["arch-path"] = (el) => {
  const id = el.tagName === "SELECT" ? el.value : UI.archPath === el.dataset.id ? "" : el.dataset.id;
  const p = CATALOG.arch.paths.find((x) => x.id === id);
  archClear();
  if (p) { UI.archPath = p.id; UI.archSel = p.steps[0][0]; }
  App.render();
};
Actions["arch-reset"] = () => { archClear(); App.render(); const f = $(".ra-grid .arch-block"); if (f) f.focus(); };
Actions["arch-sel"] = (el) => {
  const id = el.dataset.id, isStep = el.classList && el.classList.contains("arch-stepbtn");
  UI.archSel = UI.archSel === id && !isStep ? "" : id;
  if (!isStep) { UI.archLayer = ""; UI.archTier = "all"; }
  App.render();
  archShowDetail();
};
/** Kiezen via switcher, relatiechips of lijst: altijd selecteren (geen toggle); gebruikt alleen el.dataset. */
Actions["arch-pick"] = (el) => {
  const id = el.dataset && el.dataset.id;
  if (!ArchView.byId(id)) return;
  UI.archSel = id; UI.archLayer = ""; UI.archTier = "all";
  if (UI.archPath && !CATALOG.arch.paths.some((p) => p.id === UI.archPath && p.steps.some((s) => s[0] === id))) UI.archPath = "";
  App.render();
  archShowDetail();
};
/** Klik op lege ruimte in de plaat wist de selectie (blokken hebben hun eigen actie). */
Actions["arch-bg"] = (el, ev) => {
  if (ev && ev.target && ev.target.closest && ev.target.closest(".arch-block")) return;
  if (!UI.archSel || UI.archPath) return;
  UI.archSel = ""; App.render();
};
Actions["arch-plate"] = (el) => {
  const d = ArchView.plateById(el.dataset.id);
  if (!d) return;
  const from = el.dataset.block ? ArchView.byId(el.dataset.block) : null;
  const hit = from ? ArchView.plateFor(from.id) : null;
  ArchView.openPlate(d, hit && hit.d.id === d.id ? hit.keys : [], from);
};
/** Onderdeel in de vergrote plaat markeren; nogmaals klikken wist de markering. */
Actions["arch-hl"] = (el) => {
  const root = el.closest(".modal");
  if (!root) return;
  ArchView.highlight(root, el.getAttribute("aria-pressed") === "true" ? "" : el.dataset.k || "");
};
/** Link "Bekijk in architectuur" vanaf andere pagina's: opent de plaat met het blok geselecteerd. */
Actions["arch-open"] = (el) => {
  archClear();
  UI.archTab = "arch";
  const p = CATALOG.arch.paths.find((x) => x.id === el.dataset.path);
  UI.archPath = p ? p.id : "";
  UI.archSel = el.dataset.id || "";
  App.go("architectuur");
};
function archLink(id, text = "Bekijk in de architectuur", path = "") {
  return `<button type="button" class="link-btn arch-link" data-action="arch-open" data-id="${esc(id)}"${path ? ` data-path="${esc(path)}"` : ""}>${icon("layers", "s")} ${esc(text)}</button>`;
}
/* Esc wist selectie, rondleiding en lenzen (alleen op deze pagina, niet in een dialoog of invoerveld). */
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape" || e.defaultPrevented || typeof UI === "undefined" || UI.route !== "architectuur") return;
  if ((typeof Modal !== "undefined" && Modal.cur) || (e.target && e.target.closest && e.target.closest("input, textarea, select, .modal, [role=dialog]"))) return;
  if (!(UI.archSel || UI.archPath || UI.archLayer || (UI.archTier && UI.archTier !== "all"))) return;
  e.preventDefault();
  const was = UI.archSel;
  archClear(); App.render();
  const f = (was && $(`.ra-grid .arch-block[data-id="${CSS.escape(was)}"]`)) || $(".ra-grid .arch-block");
  if (f) f.focus();
});
