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
    return `<section class="ra-col" aria-label="${esc(`${i + 1}. ${c.name}: ${c.q}`)}">
      <header class="ra-colhead"><span class="ra-num" aria-hidden="true">${i + 1}</span><span class="ra-colt"><b>${esc(c.name)}</b><span>${esc(c.q)}</span></span></header>
      <div class="ra-blocks">${html}</div></section>`;
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
    const plate = b.plate && typeof ARCH_DIAGRAMS !== "undefined" ? ARCH_DIAGRAMS.find((p) => p.id === b.plate) : null;
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
      <div class="ad-actions">${v ? `<button type="button" class="btn primary small" data-action="go" data-route="${esc(b.route)}">${icon("chevronright", "s")} Naar ${esc(v.title)}</button>` : ""}${plate ? `<button type="button" class="btn small" data-action="arch-plate" data-id="${esc(plate.id)}">${icon("grid", "s")} Bekijk plaat</button>` : ""}${learn(b.learn, "Microsoft Learn")}</div>
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
      <div><h4>Soort relatie</h4><ul>${Object.keys(k).map((x) => it(`<span class="ad-k k-${esc(x)}" aria-hidden="true"></span>`, `${k[x].name}: ${k[x].desc.toLowerCase()}`)).join("")}</ul></div>
      ${mode === "design" ? `<div><h4>Jullie ontwerp</h4><ul>${["on", "todo", "off", "na"].map((s) => it(`<span class="st-${s}"><span class="ab-dot"></span></span>`, this.stateName[s])).join("")}</ul></div>` : ""}
    </div>`;
  },
  svg(d) {
    const ok = (k) => typeof BRAND_ASSETS !== "undefined" && Object.hasOwn(BRAND_ASSETS, k) && /^data:image\/[\w.+-]+[;,][^"<>\s]*$/.test(BRAND_ASSETS[k]);
    return String(d.svg).replace(/%%ICO:(\w+):([\d.]+):([\d.]+):([\d.]+)%%/g, (m, k, X, Y, s) => (ok(k) ? `<image href="${BRAND_ASSETS[k]}" x="${X}" y="${Y}" width="${s}" height="${s}"/>` : ""));
  },
  plates() {
    const list = typeof ARCH_DIAGRAMS !== "undefined" ? ARCH_DIAGRAMS : [];
    return `<p class="ra-plates-lead muted">Vier platen om Purview uit te leggen. Klik op een plaat om te vergroten.</p>
      <div class="ra-plates">${list.map((d) => `<figure class="ra-plate">
        <button type="button" class="ra-plate-img" data-action="arch-plate" data-id="${esc(d.id)}" aria-label="${esc("Vergroot plaat: " + d.title)}">${this.svg(d)}</button>
        <figcaption><b>${esc(d.title)}</b><span class="ra-cap">${esc(d.caption)}</span><span class="ra-src">${esc(d.source)}</span></figcaption>
      </figure>`).join("")}</div>`;
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
    const nPlates = typeof ARCH_DIAGRAMS !== "undefined" ? ARCH_DIAGRAMS.length : 0;

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
        <button type="button" class="btn ghost small${UI.archDense ? " on" : ""}" data-action="arch-dense" aria-pressed="${!!UI.archDense}">${icon("menu", "s")} Alleen titels</button>
        <button type="button" class="btn ghost small${UI.archLegend ? " on" : ""}" data-action="arch-legend" aria-pressed="${!!UI.archLegend}"${UI.archLegend ? ' aria-controls="ra-legend"' : ""}>${icon("info", "s")} Legenda</button>
        <button type="button" class="btn ghost small" data-action="arch-reset"${active ? "" : " disabled"} title="Alles wissen (Esc)">${icon("undo", "s")} Reset</button>
      </div></div>`;

    const steps = path ? `<ol class="arch-steps ra-steps" aria-label="${esc(path.name)}">${path.steps.map(([id, txt], i) => {
      const b = ArchView.byId(id);
      return `<li><button type="button" class="arch-stepbtn${o.sel === id ? " on" : ""}" data-action="arch-sel" data-id="${esc(id)}"${o.sel === id ? ' aria-current="step"' : ""}><span class="as-num">${i + 1}</span><span><b>${esc(b ? b.name : id)}</b><span class="as-txt">${esc(txt)}</span></span></button></li>`;
    }).join("")}</ol>` : "";

    const priv = A.blocks.filter((b) => b.status === "private");
    const privMsg = priv.length ? msg("warn", `Private preview: ${esc(priv.map((b) => b.name).join(", "))}. Alleen beschikbaar voor geselecteerde tenants.`) : "";
    const grid = `<div class="ra-grid${UI.archDense ? " ra-dense" : ""}${chain ? " has-chain" : ""}" data-action="arch-bg" tabindex="-1">${A.cols.map((c, i) => ArchView.column(c, i, st, o)).join("")}</div>`;
    const listMode = VH.switchMode() === "list";
    const items = A.cols.flatMap((c) => A.blocks.filter((b) => b.col === c.id).map((b) => ({ id: b.id, name: b.name, icon: b.icon, note: c.name })));
    const det = ArchView.detail(sel, st, mode, chain);
    const aside = sel ? VH.switcher({ label: "Onderdeel", items, cur: sel.id, route: "architectuur", action: "arch-pick", key: "id" }, det) : det;
    const nonEmpty = mode === "design" && !applicableLabels(st).length ? msg("info", "Dit ontwerp heeft nog geen labels. Kies op Start een vertrekpunt; daarna kleurt deze plaat mee.") : "";
    return `${head}${tabs}${nonEmpty}${privMsg}${bar}${UI.archLegend ? ArchView.legend(mode) : ""}${ArchView.lensLine(o)}${steps}
      <div class="ra-layout${listMode ? " is-list" : ""}"><div class="ra-main">${grid}</div><aside class="ra-side" aria-label="Uitleg bij het gekozen onderdeel">${aside}</aside></div>${foot}`;
  },
});

const archClear = () => { UI.archLayer = ""; UI.archTier = "all"; UI.archPath = ""; UI.archSel = ""; };
const archShowDetail = () => {
  const d = $("#arch-detail");
  if (d && d.getBoundingClientRect().top > window.innerHeight - 80) d.scrollIntoView({ block: "nearest", behavior: reducedMotion() ? "auto" : "smooth" });
};
Actions["arch-mode"] = (el) => { UI.archMode = el.dataset.mode === "design" ? "design" : "generic"; App.render(); };
Actions["arch-tab"] = (el) => { UI.archTab = el.dataset.tab === "plates" ? "plates" : "arch"; App.render(); };
Actions["arch-dense"] = () => { UI.archDense = !UI.archDense; App.render(); };
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
  const d = (typeof ARCH_DIAGRAMS !== "undefined" ? ARCH_DIAGRAMS : []).find((x) => x.id === el.dataset.id);
  if (!d) return;
  Modal.open({
    title: esc(d.title), wide: true,
    body: `<div class="ra-zoom" tabindex="0" role="region" aria-label="${esc("Plaat: " + d.title + "; horizontaal scrollen mogelijk")}">${ArchView.svg(d)}</div>
      <p class="ra-cap">${esc(d.caption)}</p>
      ${accordion("arch-plate-alt", "Tekstversie", `<ul class="ad-list">${(d.alt || []).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`)}
      <p class="ra-src">${esc(d.source)}. ${esc(d.license)} ${(d.learn || []).map((k) => learn(k)).join(" ")}</p>`,
  });
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
