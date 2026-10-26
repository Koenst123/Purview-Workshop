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
    const rd = ExportUI.ready(st);
    const g = Generator.all(st);
    const concept = Validation.isConcept(st);

    const design = rd.design || { pct: rd.pct, label: "Ontwerp uitgewerkt" };
    const crit = rd.rollout && Array.isArray(rd.rollout.criteria) ? rd.rollout.criteria : [];
    const critOk = crit.filter((x) => x.ok).length;
    const critHtml = crit.length ? `<ul class="vb-crit">${crit.map((x) => `<li class="${x.ok ? "ok" : ""}">${icon(x.ok ? "check" : "minus", "s")}${x.route && !x.ok ? `<button class="link-btn" data-action="go" data-route="${esc(x.route)}">${esc(x.text)}</button>` : `<span>${esc(x.text)}</span>`}</li>`).join("")}</ul>` : "";
    const checkText = c.err || c.warn ? [c.err ? `<span class="badge err">${plural(c.err, "fout", "fouten")}</span>` : "", c.warn ? `<span class="badge warn">${plural(c.warn, "waarschuwing", "waarschuwingen")}</span>` : ""].join(" ") : `<span class="badge ok">${icon("check", "s")} Geen fouten</span>`;
    const summary = `<div class="card flat exp-sum mb-2">
      <div class="exp-sum-grid">
        <div class="stat"><span class="stat-value">${design.pct}%</span><span class="stat-label">${esc(design.label || "Ontwerp uitgewerkt")}</span></div>
        <div class="stat"><span class="stat-value">${crit.length ? `${critOk}/${crit.length}` : "–"}</span><span class="stat-label">Ontwerp compleet ${infoTip("Criteria: geen fouten, labelscope, groepen en domeinen, verplichte randvoorwaarden en besluiten met eigenaar. Zegt niets over de werking in een tenant.")}</span></div>
        <div class="stat"><span class="exp-sum-check">${checkText}</span><span class="stat-label">Controle</span></div>
      </div>
      ${critHtml && critOk < crit.length ? `<details class="vb-mini" data-acc="exp-crit"><summary class="xs">Wat ontbreekt nog?</summary>${critHtml}</details>` : ""}
      <div class="exp-sum-foot xs muted">${statusBadge(concept ? "open" : "decided", concept ? "Concept" : XlsxExport.statusName(st))} Voorgesteld ontwerp: er is niets in de tenant geconfigureerd.</div>
    </div>`;

    const chips = [["all", `Alle (${all.length})`], ["err", `Fouten (${c.err})`], ["warn", `Waarschuwingen (${c.warn})`], ["info", `Info (${c.info})`]]
      .map(([v, t]) => `<button class="chip sm${f === v ? " on" : ""}" style="cursor:pointer" data-action="val-filter" data-v="${v}" aria-pressed="${f === v}">${t}</button>`).join("");
    const itemHtml = (v) => { const i = items.indexOf(v); return `<div class="val-item ${esc(v.level)}" data-action="val-go" data-i="${i}" role="button" tabindex="0" data-vb-key="1" title="Ga naar ${esc(VAL_ROUTE_NAMES[v.route] || v.route)}">
        ${icon(VAL_ICON[v.level] || "info", "s")}<div style="flex:1;min-width:0"><div class="vi-title">${esc(v.title)}</div>${v.desc ? `<div class="vi-desc">${esc(v.desc)}</div>` : ""}<div class="xs muted">${esc(v.ruleId)} · ${esc(v.category)}${v.blocking ? " · moet worden opgelost" : ""} · ${esc(v.verification)}${v.verifiedAt ? ` (${esc(v.verifiedAt)})` : ""}</div></div>${icon("chevronright", "s")}</div>`; };
    const order = Object.keys(VAL_ROUTE_NAMES);
    const routes = unique(items.map((v) => v.route)).sort((a, b) => (a === "tenant") - (b === "tenant") || order.indexOf(a) - order.indexOf(b));
    const groups = routes.map((r) => {
      const its = items.filter((v) => v.route === r);
      const main = its.filter((v) => v.level !== "info"), info = its.filter((v) => v.level === "info");
      const ne = its.filter((v) => v.level === "err").length, nw = its.filter((v) => v.level === "warn").length;
      const name = esc(VAL_ROUTE_NAMES[r] || r);
      if (r === "tenant") {
        return accordion("val-g-tenant", `<span class="vb-dot info">${icon("settings", "s")}</span><span class="vb-sum-title">${name}</span><span class="xs muted">${plural(its.length, "open punt", "open punten")}</span>`,
          `<div class="row mb-1"><span class="xs muted">To-do’s voor de klant in de tenant, geen ontwerpfout.</span><span class="spacer"></span><button class="btn small subtle" data-action="go" data-route="tenant">${icon("chevronright", "s")} Naar randvoorwaarden</button></div>${its.map(itemHtml).join("")}`, false);
      }
      const sum = `<span class="vb-dot ${ne ? "err" : nw ? "warn" : "info"}">${icon(ne ? "xcircle" : nw ? "warning" : "info", "s")}</span><span class="vb-sum-title">${name}</span>${ne ? `<span class="badge err">${plural(ne, "fout", "fouten")}</span>` : ""}${nw ? `<span class="badge warn">${plural(nw, "waarschuwing", "waarschuwingen")}</span>` : ""}${info.length ? `<span class="badge neutral">${info.length} info</span>` : ""}`;
      const body = `${main.map(itemHtml).join("")}${info.length ? (main.length ? accordion(`val-g-${r}-info`, `${icon("info", "s")} Ter info <span class="xs muted">· ${info.length}</span>`, info.map(itemHtml).join(""), f === "info") : info.map(itemHtml).join("")) : ""}`;
      return accordion(`val-g-${r}`, sum, body, ne > 0 || f !== "all");
    }).join("");
    const list = items.length ? `<div class="vb-acc-list">${groups}</div>`
      : (all.length ? `<p class="muted small">Geen meldingen in dit filter.</p>` : msg("ok", `${icon("checkcircle", "s")} Geen meldingen – het ontwerp is consistent.`));

    const creates = `${plural(g.labels.length, "label", "labels")} · ${g.labelPolicies.length} labelbeleid · ${g.autoPolicies.length} auto-labeling · ${g.dlpPolicies.length} DLP`;
    const exportRow = (ic, title, line, tip, action, btn, label, primary) => `<div class="vb-exp-row">${icon(ic)}<span class="vb-sum-title"><b>${title}</b>${tip ? ` ${infoTip(tip)}` : ""}<span class="xs muted exp-line">${line}</span></span><button class="btn small${primary ? " primary" : ""}" data-action="${action}">${icon(btn, "s")} ${label}</button></div>`;
    const vers = st.meta.versions || [];
    const exportsHtml = `<div class="card flat vb-exp">
      ${exportRow("doc", "Ontwerpdocument", "Voorstel voor akkoord en overdracht.", "Volledig ontwerp met voorblad, statuslegenda en bijlagen. Afdrukken of opslaan als PDF; gebruik Edge of Chrome voor paginanummers.", "exp-doc", "printer", "PDF", true)}
      ${exportRow("excel", "Excel-werkboek", "Alle instellingen per werkblad.", "", "exp-xlsx", "download", "Download")}
      ${exportRow("code", "PowerShell (simulatie)", esc(creates), "Review het script vóór uitvoeren; het draait niet automatisch. Uitvoeren maakt labels en labelbeleid aan; DLP en auto-labeling starten in simulatie.", "exp-ps", "download", "Download").replace('class="vb-exp-row"', 'class="vb-exp-row tech-only"')}
      ${exportRow("save", "JSON", "Werkbestand om later verder te gaan.", "", "exp-json", "download", "Download")}
      ${st.meta.internalNotes ? exportRow("lock", "Interne versie", "Document met facilitatornotities.", "Niet delen met de klant. Interne notities staan verder alleen in de JSON.", "exp-doc-internal", "printer", "PDF") : ""}
      <div class="vb-exp-row">${icon("clock")}<span class="vb-sum-title"><b>Versie ${esc(st.meta.version || "0.1")}</b><span class="xs muted exp-line">${vers.length ? plural(vers.length, "versie", "versies") + " vastgelegd" : "Nog geen versie vastgelegd."}</span></span><button class="btn small subtle" data-action="vb-version-add">${icon("plus", "s")} Versie vastleggen</button></div>
      ${vers.length ? `<details class="vb-mini exp-vers" data-acc="exp-vers"><summary class="xs">Versiebeheer</summary><div class="table-wrap"><table class="table vb-vers"><thead><tr><th>Versie</th><th>Datum</th><th>Wijziging</th><th>Door</th><th><span class="sr-only">Acties</span></th></tr></thead><tbody>${vers.slice().reverse().map((v) => `<tr><td>${esc(v.version)}</td><td class="vb-nowrap">${esc(v.date ? fmtDate(v.date) : "")}</td><td>${esc(v.change)}</td><td>${esc(v.by)}</td><td><button class="btn small subtle" data-action="vb-version-del" data-id="${esc(v.id)}" title="Verwijderen" aria-label="Versie ${esc(v.version)} verwijderen">${icon("trash", "s")}</button></td></tr>`).join("")}</tbody></table></div></details>` : ""}
    </div>`;

    const ps = ExportUI.ps(st);
    const lines = ps ? ps.split("\n") : [];
    const shown = UI.psFull ? lines : lines.slice(0, 60);
    const psHtml = ps ? accordion("exp-ps", `${icon("code", "s")} PowerShell-preview <span class="xs muted">· ${lines.length} regels</span>`, `<div class="row tight mb-1"><span class="xs muted">Review vóór uitvoeren in ${learn("sccPs", "Security & Compliance PowerShell")}. Labels en labelbeleid worden aangemaakt; DLP en auto-labeling starten in simulatie.</span><span class="spacer"></span><button class="btn small subtle" data-action="exp-ps-copy">${icon("copy", "s")} Kopiëren</button>${lines.length > 60 ? `<button class="btn small subtle" data-action="exp-ps-toggle">${icon(UI.psFull ? "minus" : "plus", "s")} ${UI.psFull ? "Inkorten" : "Alles tonen"}</button>` : ""}</div>
      <pre class="code" style="max-height:${UI.psFull ? "none" : "420px"};overflow:auto">${esc(shown.join("\n"))}${!UI.psFull && lines.length > 60 ? "\n…" : ""}</pre>`) : "";
    const keuzeHtml = accordion("exp-keuzes", `${icon("table", "s")} Keuzeoverzicht`, `<div class="row tight mb-1"><span class="xs muted">Alle keuzes per label op één liggende pagina, voor akkoord van de klant.</span><span class="spacer"></span><button class="btn small subtle" data-action="exp-keuzes">${icon("printer", "s")} Afdrukken</button></div><div class="table-wrap vb-keuze-wrap">${Keuzeoverzicht.table(st)}</div>`);

    const more = `<p>Klik op een melding om naar de juiste instelling te gaan. Fouten los je op; waarschuwingen zijn bespreekpunten. Randvoorwaarden zijn to-do’s voor de klant.</p><p>Alle exports beschrijven een voorgesteld ontwerp. Er wordt niets in de tenant ingericht totdat iemand het PowerShell-script bewust uitvoert.</p>`;
    return VH.wrap(`${pageHead("Afronding", "Validatie & export", "Controleer het ontwerp en exporteer het voorstel.", "", more)}
      ${summary}
      <div class="split wide-left vb-split">
        <div><h3 class="section-title">${icon("checkcircle", "s")} Controle</h3><div class="chip-list mb-1" role="group" aria-label="Filter op ernst">${chips}</div>${list}</div>
        <div><h3 class="section-title">${icon("download", "s")} Exporteren</h3>${exportsHtml}</div>
      </div>
      <div class="mt-2">${keuzeHtml}${psHtml}</div>`);
  },
});
