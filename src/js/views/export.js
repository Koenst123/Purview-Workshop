/* View: Validatie & export – controlelijst, exports, PowerShell-preview en keuzeoverzicht */
const VAL_ROUTE_NAMES = { schema: "Classificatieschema", sits: "Informatietypen", labels: "Labelinstellingen", board: "Ontwerpbord", policies: "Labelbeleid", autolabel: "Auto-labeling", dlp: "DLP", endpoint: "Endpoint DLP", copilot: "Copilot", tenant: "Randvoorwaarden", besluiten: "Besluiten & open punten", export: "Export" };
const VAL_ICON = { err: "xcircle", warn: "warning", info: "info" };
const VAL_LV_NAME = { err: "Fout", warn: "Waarschuwing", info: "Info" };

const ExportUI = {
  items(st) {
    const f = UI.valFilter || "all";
    return Validation.run(st).filter((v) => f === "all" || v.level === f);
  },
  goTo(v, st = S()) {
    if (!v) return;
    if (v.labelId) UI.selLabel = v.labelId;
    if (v.route === "labels" && v.labelId) { UI.labelTab = v.sub || UI.labelTab || "scope"; App.go("labels", v.labelId); return; }
    if (v.route === "dlp" && v.key && byId(st.customDlp || [], v.key)) { UI.dlpTab = "editor"; UI.dlpEdit = v.key; UI.dlpRule = 0; App.go("dlp"); return; }
    if (v.route === "sits" && v.key && sitById(v.key)) { App.go("sits"); Actions["sit-edit"]({ dataset: { id: v.key } }); return; }
    App.go(VAL_ROUTE_NAMES[v.route] ? v.route : "board");
  },
  ps(st) {
    return PsExport.build(st);
  },
  ready(st) { return Validation.readiness(st); },
  readiness(st) { return this.ready(st).pct; },
};

Actions["val-filter"] = (el) => { UI.valFilter = el.dataset.v; App.render(); };
Actions["val-go"] = (el) => ExportUI.goTo(ExportUI.items(S())[+el.dataset.i]);
Actions["exp-doc"] = () => DocExport.print();
Actions["exp-doc-internal"] = () => confirmDialog("Interne notities opnemen?", "Deze versie bevat interne facilitatornotities. Deel haar niet als klantdocument.", () => DocExport.print({ includeInternal: true }), "Interne versie afdrukken");
Actions["exp-keuzes"] = () => DocExport.print({ only: "keuzes" });
Actions["exp-xlsx"] = () => XlsxExport.download();
Actions["exp-ps"] = () => PsExport.download();
Actions["exp-json"] = () => IO.saveJson();
Actions["exp-ps-copy"] = () => {
  const txt = ExportUI.ps(S());
  const done = () => Toast.show("PowerShell-script gekopieerd", "ok");
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, () => Toast.show("Kopiëren niet toegestaan – gebruik Download", "warn"));
  else Toast.show("Kopiëren niet beschikbaar – gebruik Download", "warn");
};
Actions["exp-ps-toggle"] = () => { UI.psFull = !UI.psFull; App.render(); };
ExportUI.nextVersion = (st) => {
  const cur = String(st.meta.version || "0.1").trim() || "0.1";
  if (!(st.meta.versions || []).some((v) => v.version === cur)) return cur;
  const m = cur.match(/^(\d+)\.(\d+)$/);
  return m ? `${m[1]}.${+m[2] + 1}` : cur;
};
Actions["vb-version-add"] = () => {
  const st = S();
  Modal.open({
    title: "Versie vastleggen",
    focus: "#ver-change",
    body: `<p class="small muted">Komt in de tabel Versiebeheer van het ontwerpdocument en de Excel-export.</p>
      <div class="grid grid-2"><div class="field"><label for="ver-version">Versie</label><input id="ver-version" class="input" type="text" maxlength="20" value="${esc(ExportUI.nextVersion(st))}"></div>
      <div class="field"><label for="ver-date">Datum</label><input id="ver-date" class="input" type="date" value="${esc(today())}"></div></div>
      <div class="field"><label for="ver-change">Wat is er veranderd?</label><input id="ver-change" class="input" type="text" maxlength="200" placeholder="Bijv. Labels en DLP vastgesteld in de workshop"></div>
      <div class="field"><label for="ver-by">Door</label><input id="ver-by" class="input" type="text" maxlength="100" placeholder="Naam of rol" value="${esc(((st.meta.versions || []).slice(-1)[0] || {}).by || "")}"></div>`,
    buttons: [{ label: "Annuleren" }, { label: "Vastleggen", primary: true, fn: () => {
      const val = (id) => (($("#" + id) || {}).value || "").trim();
      const version = val("ver-version"), change = val("ver-change");
      if (!version || !change) { Toast.show("Vul de versie en de wijziging in.", "warn"); return true; }
      Store.update((s) => {
        s.meta.versions = s.meta.versions || [];
        s.meta.versions.push({ id: uid("ver"), version, date: val("ver-date") || today(), change, by: val("ver-by") });
        s.meta.version = version;
      });
      Toast.show(`Versie ${esc(version)} vastgelegd.`, "ok");
    } }],
  });
};
Actions["vb-version-del"] = (el) => confirmDialog("Versie verwijderen?", "Deze regel verdwijnt uit de tabel Versiebeheer.", () => Store.update((st) => { st.meta.versions = (st.meta.versions || []).filter((v) => v.id !== el.dataset.id); }), "Verwijderen", true);

registerView("export", {
  title: "Validatie & export",
  fac: {
    duration: 20,
    goal: "Het ontwerp controleren op fouten en tegenstrijdigheden, en vastleggen in een ontwerpdocument, Excel-werkboek en PowerShell-script.",
    questions: ["Zijn alle fouten opgelost of bewust geaccepteerd?", "Wie keurt het ontwerp goed en wanneer?", "Wat zijn de vervolgstappen (pilot, simulatie, handhaven)?"],
    tips: ["Loop eerst de rode meldingen langs; klik een melding om direct naar de juiste plek te gaan.", "Print het keuzeoverzicht (alle keuzes per label) voor akkoord van de klant.", "Het PowerShell-script wijzigt labels en beleid. Alleen DLP en auto-labeling starten in simulatie; review en test blijven nodig."],
    pitfalls: ["Het script zonder review in productie draaien.", "Waarschuwingen negeren die over licenties of tenantvoorwaarden gaan."],
    links: ["sccPs", "dlpSimulation", "licensing"],
  },
  done: (st) => applicableLabels(st).length > 0 && Validation.counts(st).err === 0,
  render() {
    const st = S();
    const all = Validation.run(st), c = Validation.counts(st);
    const items = ExportUI.items(st);
    const f = UI.valFilter || "all";
    const rd = ExportUI.ready(st), ready = rd.pct;
    const cov = Mapping.coverage(st).pct;
    const g = Generator.all(st);
    const errWarn = c.err + c.warn;

    const ringCol = (p) => (p >= 80 ? "var(--ok)" : p >= 50 ? "var(--warn)" : "var(--err)");
    const crit = rd.rollout && Array.isArray(rd.rollout.criteria) ? rd.rollout.criteria : [];
    const critHtml = crit.length ? `<ul class="vb-crit">${crit.map((x) => `<li class="${x.ok ? "ok" : ""}">${icon(x.ok ? "check" : "minus", "s")}${x.route && !x.ok ? `<button class="link-btn" data-action="go" data-route="${esc(x.route)}">${esc(x.text)}</button>` : `<span>${esc(x.text)}</span>`}</li>`).join("")}</ul>` : "";
    const kpiReady = rd.design && rd.rollout
      ? `<div class="card flat vb-kpi">${ring(rd.design.pct, undefined, "", ringCol(rd.design.pct))}<div><b>${esc(rd.design.label || "Ontwerp uitgewerkt")}</b><div class="xs muted">${c.err ? plural(c.err, "fout", "fouten") + " op te lossen" : "Geen fouten"}</div></div></div>
        <div class="card flat vb-kpi">${ring(rd.rollout.pct, undefined, "", ringCol(rd.rollout.pct))}<div><b>${esc(rd.rollout.label || "Voor technische review")}</b>${crit.length ? ` <span class="xs muted">${crit.filter((x) => x.ok).length}/${crit.length}</span>` : ""}${critHtml ? `<details class="vb-mini" data-acc="exp-crit"><summary class="xs">Criteria</summary>${critHtml}</details>` : ""}</div></div>`
      : `<div class="card flat vb-kpi">${ring(ready, undefined, "", ringCol(ready))}<div><b>Gereedheid</b> ${infoTip("Hoe compleet en consistent het ontwerp is: ingevulde keuzes op het ontwerpbord, verminderd met fouten en waarschuwingen. Randvoorwaarden (tenant) tellen niet mee.")}<div class="xs muted">${c.err ? plural(c.err, "fout", "fouten") + " op te lossen" : "Geen fouten"}</div></div></div>
        <div class="card flat vb-kpi"><div class="stat"><span class="stat-value">${rd.total ? `${rd.done}/${rd.total}` : `${cov}%`}</span><span class="stat-label">${rd.total ? "stappen ingevuld" : "ontwerpbord ingevuld"}</span></div></div>`;
    const stats = `<div class="vb-kpis mb-2">
      ${kpiReady}
      <div class="card flat vb-kpi"><div><b>Wordt aangemaakt</b> ${infoTip(`${plural(g.labels.length, "label", "labels")}, ${plural(g.labelPolicies.length, "labelbeleid", "labelbeleidsregels")}, ${plural(g.autoPolicies.length, "auto-labelingpolicy", "auto-labelingpolicies")} en ${plural(g.dlpPolicies.length, "DLP-policy", "DLP-policies")} met samen ${sum(g.dlpPolicies.map((p) => p.rules.length))} regels.`)}<div class="small mt-1">${plural(g.labels.length, "label", "labels")} · ${g.labelPolicies.length} labelbeleid<br>${g.autoPolicies.length} auto-labeling · ${g.dlpPolicies.length} DLP</div></div></div>
    </div>`;

    const chips = [["all", `Alle (${all.length})`], ["err", `Fouten (${c.err})`], ["warn", `Waarschuwingen (${c.warn})`], ["info", `Info (${c.info})`]]
      .map(([v, t]) => `<button class="chip sm${f === v ? " on" : ""}" style="cursor:pointer" data-action="val-filter" data-v="${v}" aria-pressed="${f === v}">${t}</button>`).join("");
    const itemHtml = (v) => { const i = items.indexOf(v); return `<div class="val-item ${esc(v.level)}" data-action="val-go" data-i="${i}" role="button" tabindex="0" data-vb-key="1" title="Ga naar ${esc(VAL_ROUTE_NAMES[v.route] || v.route)}">
        ${icon(VAL_ICON[v.level] || "info", "s")}<div style="flex:1;min-width:0"><div class="vi-title">${esc(v.title)}</div>${v.desc ? `<div class="vi-desc">${esc(v.desc)}</div>` : ""}<div class="xs muted">${esc(v.ruleId)} · ${esc(v.category)}${v.blocking ? " · blokkeert technische review" : ""} · ${esc(v.verification)}${v.verifiedAt ? ` (${esc(v.verifiedAt)})` : ""}</div></div>${icon("chevronright", "s")}</div>`; };
    const order = Object.keys(VAL_ROUTE_NAMES);
    const routes = unique(items.map((v) => v.route)).sort((a, b) => (a === "tenant") - (b === "tenant") || order.indexOf(a) - order.indexOf(b));
    const groups = routes.map((r) => {
      const its = items.filter((v) => v.route === r);
      const main = its.filter((v) => v.level !== "info"), info = its.filter((v) => v.level === "info");
      const ne = its.filter((v) => v.level === "err").length, nw = its.filter((v) => v.level === "warn").length;
      const name = esc(VAL_ROUTE_NAMES[r] || r);
      if (r === "tenant") {
        return accordion("val-g-tenant", `<span class="vb-dot info">${icon("settings", "s")}</span><span class="vb-sum-title">${name}</span><span class="xs muted">${plural(its.length, "open punt", "open punten")}</span>${infoTip("To-do’s voor de klant in de tenant, geen ontwerpfout.")}`,
          `<div class="row mb-1"><span class="xs muted">Beheer status en eigenaar op de pagina Tenant-voorbereiding.</span><span class="spacer"></span><button class="btn small" data-action="go" data-route="tenant">${icon("chevronright", "s")} Naar tenant-voorbereiding</button></div>${its.map(itemHtml).join("")}`, false);
      }
      const sum = `<span class="vb-dot ${ne ? "err" : nw ? "warn" : "info"}">${icon(ne ? "xcircle" : nw ? "warning" : "info", "s")}</span><span class="vb-sum-title">${name}</span>${ne ? `<span class="badge err">${plural(ne, "fout", "fouten")}</span>` : ""}${nw ? `<span class="badge warn">${plural(nw, "waarschuwing", "waarschuwingen")}</span>` : ""}${info.length ? `<span class="badge neutral">${info.length} info</span>` : ""}`;
      const body = `${main.map(itemHtml).join("")}${info.length ? (main.length ? accordion(`val-g-${r}-info`, `${icon("info", "s")} Ter info <span class="xs muted">· ${info.length}</span>`, info.map(itemHtml).join(""), f === "info") : info.map(itemHtml).join("")) : ""}`;
      return accordion(`val-g-${r}`, sum, body, ne > 0 || f !== "all");
    }).join("");
    const list = items.length ? `<div class="vb-acc-list">${groups}</div>`
      : (all.length ? `<p class="muted small">Geen meldingen in dit filter.</p>` : msg("ok", `${icon("checkcircle", "s")} Geen meldingen – het ontwerp is consistent.`));

    const exportRow = (ic, title, tip, action, btn, label) => `<div class="vb-exp-row">${icon(ic)}<span class="vb-sum-title"><b>${title}</b> ${infoTip(tip)}</span><button class="btn small" data-action="${action}">${icon(btn, "s")} ${label}</button></div>`;
    const exportsHtml = `<div class="card flat vb-exp">
      ${exportRow("doc", "Ontwerpdocument", "Het volledige ontwerp met voorblad en keuzeoverzicht, om af te drukken of als PDF op te slaan. Gebruik Edge of Chrome voor paginanummers in de PDF.", "exp-doc", "printer", "PDF")}
      ${exportRow("table", "Keuzeoverzicht", "Alle keuzes per label op één liggend overzicht – handig voor akkoord van de klant. Afdrukken of opslaan als PDF (Edge of Chrome voor paginanummers).", "exp-keuzes", "printer", "PDF")}
      ${exportRow("excel", "Excel-werkboek", "Alle instellingen in werkbladen, om mee te nemen naar de implementatie.", "exp-xlsx", "download", "Download")}
      ${exportRow("code", "PowerShell-script", "Security & Compliance PowerShell. DLP- en auto-labelingpolicies staan in simulatiemodus; tenantvoorwaarden als commentaar. Altijd eerst reviewen en testen.", "exp-ps", "download", "Download")}
      ${exportRow("save", "Ontwerp opslaan (JSON)", "Volledige werkstand om later verder te gaan of te delen met collega’s.", "exp-json", "download", "Download")}
      ${st.meta.internalNotes ? exportRow("lock", "Interne facilitatorversie", "Alleen na bevestiging: document inclusief interne notities.", "exp-doc-internal", "printer", "Intern") : ""}
    </div>`;
    const vers = st.meta.versions || [];
    const versHtml = `<div class="card flat vb-exp mt-2"><div class="vb-exp-row">${icon("clock")}<span class="vb-sum-title"><b>Versie ${esc(st.meta.version || "0.1")}</b>${vers.length ? `<span class="xs muted" style="display:block">${plural(vers.length, "versie", "versies")} vastgelegd</span>` : ""}</span><button class="btn small" data-action="vb-version-add">${icon("plus", "s")} Versie vastleggen</button></div>
      ${vers.length ? `<details class="vb-mini" data-acc="exp-vers"><summary class="xs">Versiebeheer</summary><div class="table-wrap"><table class="table vb-vers"><thead><tr><th>Versie</th><th>Datum</th><th>Wijziging</th><th>Door</th><th><span class="sr-only">Acties</span></th></tr></thead><tbody>${vers.slice().reverse().map((v) => `<tr><td>${esc(v.version)}</td><td class="vb-nowrap">${esc(v.date ? fmtDate(v.date) : "")}</td><td>${esc(v.change)}</td><td>${esc(v.by)}</td><td><button class="btn small subtle" data-action="vb-version-del" data-id="${esc(v.id)}" title="Verwijderen" aria-label="Versie ${esc(v.version)} verwijderen">${icon("trash", "s")}</button></td></tr>`).join("")}</tbody></table></div></details>` : ""}
      <div class="vb-exp-row"><span class="xs muted vb-sum-title">Uitrolfasen ${infoTip("Eigenaren en data per uitrolfase leg je vast op Adoptie & impact.")}</span><button class="btn small subtle" data-action="go" data-route="adoption">${icon("chevronright", "s")} Adoptie</button></div></div>`;

    const ps = ExportUI.ps(st);
    const lines = ps ? ps.split("\n") : [];
    const shown = UI.psFull ? lines : lines.slice(0, 60);
    const psHtml = ps ? accordion("exp-ps", `${icon("code", "s")} PowerShell-preview <span class="xs muted">· ${lines.length} regels</span>`, `<div class="row tight mb-1">${msg("warn", `Controleer het script voordat je het uitvoert. Het draait tegen Security & Compliance PowerShell (${learn("sccPs", "Connect-IPPSSession")}); DLP en auto-labeling staan in simulatie.`)}</div>
      <div class="row tight mb-1"><span class="spacer"></span><button class="btn small subtle" data-action="exp-ps-copy">${icon("copy", "s")} Kopiëren</button>${lines.length > 60 ? `<button class="btn small subtle" data-action="exp-ps-toggle">${icon(UI.psFull ? "minus" : "plus", "s")} ${UI.psFull ? "Inkorten" : "Alles tonen"}</button>` : ""}</div>
      <pre class="code" style="max-height:${UI.psFull ? "none" : "420px"};overflow:auto">${esc(shown.join("\n"))}${!UI.psFull && lines.length > 60 ? "\n…" : ""}</pre>`) : "";

    const more = `<p>Klik op een melding om direct naar de juiste instelling te gaan. Fouten moeten worden opgelost; waarschuwingen zijn bespreekpunten. Randvoorwaarden zijn to-do’s voor de klant en tellen niet mee in de gereedheid.</p><p>Leg het ontwerp vast als ontwerpdocument (PDF), keuzeoverzicht, Excel-werkboek of PowerShell-script (simulatiemodus).</p>`;
    return VH.wrap(`${pageHead("Afronding", "Validatie & export", "Klopt het ontwerp? Leg het vast.", `<button class="btn primary" data-action="exp-doc">${icon("printer", "s")} Ontwerpdocument</button>`, more)}
      ${msg("info", Validation.isConcept(st) ? "Export is een concept. Los open punten op en toets de werking in de tenant. Interne notities staan alleen in de volledige JSON of een expliciet gekozen interne documentversie." : "Voor technische review. De berekende status bewijst geen werking in een tenant.")}
      ${stats}
      <div class="split wide-left vb-split">
        <div><h3 class="section-title">${icon("checkcircle", "s")} Controle ${errWarn > 0 ? "" : `<span class="badge ok">${icon("check", "s")} Geen fouten of waarschuwingen</span>`}</h3><div class="chip-list mb-1" role="group" aria-label="Filter op ernst">${chips}</div>${list}</div>
        <div><h3 class="section-title">${icon("download", "s")} Vastleggen</h3>${exportsHtml}${versHtml}</div>
      </div>
      <div class="mt-2">${accordion("exp-keuzes", `${icon("table", "s")} Keuzeoverzicht ${infoTip("Alle keuzes per label in één tabel.")}`, `<div class="table-wrap vb-keuze-wrap">${Keuzeoverzicht.table(st)}</div>`)}
      ${psHtml}</div>`);
  },
});
