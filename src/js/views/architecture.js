/* View: Referentiearchitectuur – hoe classificatie, labels, bescherming en inzicht samenwerken (algemeen of voor dit ontwerp) */
const ArchView = {
  tierOf(b) { return b.tier || "e3"; },
  tierName: { e3: "E3", e5: "E5", addon: "Add-on" },
  stateName: { on: "In ontwerp", todo: "Actie nodig", off: "Niet gebruikt", na: "Optioneel" },
  design(b, st) {
    if (b.out) return { state: "out", text: "Buiten deze workshop" };
    try { return b.design ? b.design(st) : { state: "na", text: "" }; } catch (e) { return { state: "na", text: "" }; }
  },
  block(b, st, o) {
    const path = o.path, stepIdx = path ? path.steps.findIndex((s) => s[0] === b.id) : -1;
    const layerOk = !o.layer || b.layers.includes(o.layer), tierOk = o.tier === "all" || this.tierOf(b) === o.tier;
    const dim = !layerOk || !tierOk || (path && stepIdx < 0);
    const d = o.mode === "design" ? this.design(b, st) : null;
    const t = this.tierOf(b);
    const cls = ["arch-block", dim ? "dim" : "", stepIdx >= 0 ? "hl" : "", o.sel === b.id ? "sel" : "", b.out ? "out" : "", d ? "st-" + d.state : ""].filter(Boolean).join(" ");
    return `<button type="button" class="${cls}" data-action="arch-sel" data-id="${esc(b.id)}" aria-pressed="${o.sel === b.id}" aria-label="${esc(b.name + " – " + b.nl)}">
      ${stepIdx >= 0 ? `<span class="ab-step" aria-hidden="true">${stepIdx + 1}</span>` : ""}
      <span class="ab-ico">${icon(b.icon || "info", "s")}</span>
      <span class="ab-txt"><span class="ab-name">${esc(b.name)}</span><span class="ab-nl">${esc(b.nl)}</span><span class="ab-meta"><span class="ab-tier t-${t}" title="${esc(t === "e3" ? "Zit in Microsoft 365 E3" : t === "e5" ? "Vereist E5 (of een E5-add-on)" : "Aparte licentie of pay-as-you-go")}">${this.tierName[t]}</span>${b.preview ? `<span class="ab-prev" title="${esc(b.preview)}">Preview</span>` : ""}</span>${d && d.text ? `<span class="ab-state"><span class="ab-dot" aria-hidden="true"></span><span>${esc(d.text)}</span></span>` : ""}</span>
    </button>`;
  },
  detail(b, st, mode) {
    if (!b) return `<div class="arch-detail empty-hint">${icon("info")}<div><b>Klik op een blok</b><div class="xs muted">Je ziet dan wat het doet, welke licentie nodig is en waar het in de app zit.</div></div></div>`;
    const col = CATALOG.arch.cols.find((c) => c.id === b.col) || {};
    const d = this.design(b, st);
    const v = b.route && Views[b.route];
    return `<div class="arch-detail" id="arch-detail" tabindex="-1" aria-live="polite">
      <div class="xs muted">${esc(col.name || "")}</div>
      <h3>${icon(b.icon || "info")} ${esc(b.name)}</h3>
      <p class="ad-nl">${esc(b.nl)}</p>
      <p>${esc(b.uitleg)}</p>
      <div class="row wrap" style="gap:6px">${licBadge(b.lic)}${b.preview ? previewBadge() : ""}${b.out ? `<span class="badge neutral">Buiten deze workshop</span>` : ""}</div>
      ${b.preview ? `<div class="xs muted mt-1">${esc(b.preview)}</div>` : ""}
      ${!b.out ? `<div class="ad-design st-${d.state}"><div class="xs muted">In jullie ontwerp</div><b><span class="ab-dot" aria-hidden="true"></span>${esc(this.stateName[d.state] || "")}</b>${d.text ? ` · ${esc(d.text)}` : ""}</div>` : ""}
      <div class="row wrap mt-2" style="gap:8px">${v ? `<button class="btn primary small" data-action="go" data-route="${esc(b.route)}">${icon("chevronright", "s")} Naar ${esc(v.title)}</button>` : ""}${learn(b.learn, "Microsoft Learn")}</div>
    </div>`;
  },
};

registerView("architectuur", {
  title: "Referentiearchitectuur",
  fac: {
    duration: 15,
    goal: "Samen het grote plaatje zien: wat classificatie, labels, DLP en inzicht doen, en welke licentie daarvoor nodig is.",
    questions: ["Welke bronnen zijn voor jullie het belangrijkst: e-mail, SharePoint, Teams, apparaten of Copilot?", "Welke licenties zijn er: E3, E5 of een E5-add-on?", "Is Copilot al in gebruik of gepland?"],
    tips: ["Start met de rondleiding ‘Classificatie of label?’: dat is de meest gestelde vraag.", "Zet aan het eind van de workshop ‘Jullie ontwerp’ aan: zo ziet de klant wat er al staat en wat nog open is.", "Filter op ‘Zit in E3’ om te laten zien wat zonder extra licentie al kan."],
    pitfalls: ["Alle blokken in één keer uitleggen: kies één rondleiding per keer.", "Retentie en Insider Risk diep bespreken: die vallen buiten deze workshop."],
    links: ["labels", "dlp", "licensing"],
  },
  render() {
    const st = S(), A = CATALOG.arch;
    const mode = UI.archMode === "design" ? "design" : "generic";
    const layer = A.layers.some((x) => x[0] === UI.archLayer) ? UI.archLayer : "";
    const tier = A.tiers.some((x) => x[0] === UI.archTier) ? UI.archTier : "all";
    const path = A.paths.find((p) => p.id === UI.archPath) || null;
    const sel = A.blocks.find((b) => b.id === UI.archSel) || null;
    const o = { mode, layer, tier, path, sel: sel ? sel.id : "" };

    const modeSw = `<div class="btn-group" role="group" aria-label="Weergave">${[["generic", "Algemeen", "layers"], ["design", "Jullie ontwerp", "checkcircle"]].map(([k, n, ic]) => `<button type="button" class="btn small${mode === k ? " on" : ""}" data-action="arch-mode" data-mode="${k}" aria-pressed="${mode === k}">${icon(ic, "s")} ${n}</button>`).join("")}</div>`;
    const more = `<p>Van links naar rechts: waar data staat, hoe Purview herkent wat gevoelig is, hoe een label wordt toegekend, wat het label beschermt en hoe je meet wat er gebeurt.</p>
      <p><b>Classificatie</b> herkent wát er in een bestand staat. Een <b>label</b> is de zichtbare afspraak over hoe gevoelig het is. <b>Bescherming</b> (versleuteling, DLP) volgt uit het label en de inhoud.</p>
      <p class="xs muted">Eigen samenvatting op basis van Microsoft Learn (gecontroleerd ${esc(CATALOG.docsVerified || "")}). Licenties: E3 = Microsoft 365 E3; E5 = Microsoft 365 E5 of een E5 Compliance / Information Protection-add-on.</p>`;
    const head = pageHead("Voorbereiding", "Referentiearchitectuur", "Hoe Purview gevoelige data herkent, labelt, beschermt en zichtbaar maakt – in één plaat.", modeSw, more);

    const filtersOn = layer || tier !== "all" || path;
    const bar = `<div class="arch-bar">
      <div class="arch-paths" role="group" aria-label="Rondleiding"><span class="xs muted">Rondleiding</span>${A.paths.map((p) => `<button type="button" class="chip${path === p ? " on" : ""}" data-action="arch-path" data-id="${esc(p.id)}" aria-pressed="${path === p}">${icon(p.icon, "s")} ${esc(p.name)}</button>`).join("")}</div>
      <div class="arch-filters">
        <label class="xs">Laag <select class="select" data-action="arch-layer" aria-label="Filter op laag"><option value="">Alle lagen</option>${A.layers.map(([k, n]) => `<option value="${esc(k)}"${layer === k ? " selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
        <label class="xs">Licentie <select class="select" data-action="arch-tier" aria-label="Filter op licentie">${A.tiers.map(([k, n]) => `<option value="${esc(k)}"${tier === k ? " selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
        ${filtersOn ? `<button type="button" class="btn ghost small" data-action="arch-reset">${icon("x", "s")} Wis filters</button>` : ""}
      </div></div>`;

    const steps = path ? `<ol class="arch-steps" aria-label="${esc(path.name)}">${path.steps.map(([id, txt], i) => {
      const b = A.blocks.find((x) => x.id === id);
      return `<li><button type="button" class="arch-stepbtn${o.sel === id ? " on" : ""}" data-action="arch-sel" data-id="${esc(id)}"><span class="as-num">${i + 1}</span><span><b>${esc(b ? b.name : id)}</b><span class="as-txt">${esc(txt)}</span></span></button></li>`;
    }).join("")}</ol>` : "";

    const grid = `<div class="arch-grid" role="list">${A.cols.map((c, i) => `<section class="arch-col" role="listitem" aria-label="${esc(`${i + 1}. ${c.name}`)}">
        <header class="arch-colhead"><span class="ac-num">${i + 1}</span><div><b>${icon(c.icon, "s")} ${esc(c.name)}</b><div class="xs muted">${esc(c.sub)}</div></div></header>
        <div class="arch-blocks">${A.blocks.filter((b) => b.col === c.id).map((b) => ArchView.block(b, st, o)).join("")}</div>
      </section>`).join("")}</div>`;

    const legend = `<div class="arch-legend xs">
      <span><span class="ab-tier t-e3">E3</span> zit in E3</span><span><span class="ab-tier t-e5">E5</span> vereist E5</span><span><span class="ab-tier t-addon">Add-on</span> Copilot of pay-as-you-go</span>
      ${mode === "design" ? `<span class="sep"></span>${["on", "todo", "off", "na"].map((s) => `<span class="st-${s}"><span class="ab-dot"></span>${ArchView.stateName[s]}</span>`).join("")}` : ""}
    </div>`;

    const nonEmpty = mode === "design" && !applicableLabels(st).length ? msg("info", "Dit ontwerp heeft nog geen labels. Kies op Start een vertrekpunt; daarna kleurt deze plaat mee.") : "";
    return `${head}${nonEmpty}${bar}${steps}<div class="arch-layout"><div class="arch-main">${grid}${legend}</div><aside class="arch-side">${ArchView.detail(sel, st, mode)}</aside></div>`;
  },
});

Actions["arch-mode"] = (el) => { UI.archMode = el.dataset.mode === "design" ? "design" : "generic"; App.render(); };
Actions["arch-layer"] = (el) => { UI.archLayer = el.value || ""; App.render(); };
Actions["arch-tier"] = (el) => { UI.archTier = el.value || "all"; App.render(); };
Actions["arch-path"] = (el) => {
  UI.archPath = UI.archPath === el.dataset.id ? "" : el.dataset.id;
  const p = CATALOG.arch.paths.find((x) => x.id === UI.archPath);
  UI.archSel = p ? p.steps[0][0] : UI.archSel;
  App.render();
};
Actions["arch-reset"] = () => { UI.archLayer = ""; UI.archTier = "all"; UI.archPath = ""; App.render(); };
Actions["arch-sel"] = (el) => {
  const id = el.dataset.id;
  UI.archSel = UI.archSel === id && !el.classList.contains("arch-stepbtn") ? "" : id;
  App.render();
  const d = $("#arch-detail");
  if (d && d.getBoundingClientRect().top > window.innerHeight - 80) d.scrollIntoView({ block: "nearest", behavior: reducedMotion() ? "auto" : "smooth" });
};
/** Link "Bekijk in architectuur" vanaf andere pagina's: opent de plaat met het blok geselecteerd. */
Actions["arch-open"] = (el) => { UI.archSel = el.dataset.id || ""; UI.archPath = el.dataset.path || ""; UI.archLayer = ""; UI.archTier = "all"; App.go("architectuur"); };
function archLink(id, text = "Bekijk in de architectuur", path = "") {
  return `<button type="button" class="link-btn arch-link" data-action="arch-open" data-id="${esc(id)}"${path ? ` data-path="${esc(path)}"` : ""}>${icon("layers", "s")} ${esc(text)}</button>`;
}
