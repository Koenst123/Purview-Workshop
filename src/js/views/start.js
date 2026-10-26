/* View: Start – workshopgegevens, presets, voortgang en reis */
registerView("start", {
  title: "Start",
  fac: {
    duration: 15,
    goal: "Doel, scope en spelregels van de workshops neerzetten; deelnemers en uitgangspunten vastleggen.",
    questions: ["Welke uitkomsten uit Know your Data (classificatieschema, informatietypen) zijn vastgesteld?", "Welke licenties zijn aanwezig (E3, E5, E5 Compliance, Teams Premium, Copilot)?", "Wie besluit bij twijfel (product owner / CISO / FG)?"],
    tips: ["Kies een preset als vertrekpunt en pas samen aan – dat gaat sneller dan vanaf nul.", "Zet de beamer-modus aan (topbalk) voor grotere tekst.", "Leg besluiten en open punten vast in het facilitatorpaneel (rechts)."],
    pitfalls: ["Direct in techniek duiken zonder het classificatieschema te bevestigen.", "Te veel labels: houd het bij 5 hoofdlabels en maximaal enkele sublabels."],
    links: ["labelsGetStarted", "dlpPlan", "licensing"],
  },
  done: (st) => !!st.meta.customer && st.labels.length > 0,
  render() {
    const st = S();
    const has = st.labels.length > 0;
    const open = (st.decisions || []).filter((d) => ["open", "bespreken"].includes(decisionStatus(d))).length;
    const next = !has ? "schema" : App.val().find((v) => v.level === "err")?.route
      || NAV_ROUTES.find((r) => r !== "start" && !(st.meta.reviewed || {})[r]) || "export";
    const hero = `<header class="page-head"><div class="ph-text"><h1>Jouw informatiebescherming</h1><p class="lead">Werk samen aan een onderbouwd Purview-ontwerp.</p></div></header>
      <nav class="start-entries" aria-label="Workshoponderdelen">${[
        ["schema", "tag", "Maatregelen", "Labels en classificatie"],
        ["dlp", "shield", "Beleid & DLP", "Regels en scenario's"],
        ["adoption", "users", "Adoptie", "Impact en afspraken"],
      ].map(([r, ic, title, desc]) => `<a class="card start-entry" href="#${r}" data-action="go" data-route="${r}">${icon(ic, "xl")}<h2>${esc(title)}</h2><p>${esc(desc)}</p>${icon("chevronright", "s")}</a>`).join("")}</nav>
      <div class="card start-context mt-2 mb-3"><div><b>${esc(st.meta.customer || "Nieuw ontwerp")}</b><span class="small muted"> · ${esc(st.meta.version || "0.1")}</span>
        <div class="row small mt-1"><button class="link-btn" data-action="storage-details"><span data-save-status role="status" aria-live="polite">${esc(Store.storageText())}</span></button>
        <button class="link-btn" data-action="go" data-route="besluiten">${open} open punten</button></div></div>
        <button class="btn primary" data-action="go" data-route="${esc(next)}">${has ? "Verder met" : "Begin met"} ${esc(Views[next].title)}</button></div>`;

    const fw = typeof FRAMEWORKS !== "undefined" ? FRAMEWORKS : [["none", "Geen / nog niet bepaald"], ["bio", "BIO (overheid)"], ["nen7510", "NEN 7510 (zorg)"], ["iso27001", "ISO/IEC 27001"], ["avg", "AVG (alleen privacy)"]];
    const ds = typeof DESIGN_STATUS !== "undefined" ? DESIGN_STATUS : [["concept", "Concept"], ["review", "Ter besluitvorming"], ["final", "Vastgesteld"]];
    const docOpts = [["", "Vertrouwelijk (standaard)"], ...applicableLabels(st).map((l) => [l.id, labelFullName(l, st)])];
    const yn = (key, q, hint) => {
      const on = StartUtil.optOn(st, key);
      return `<div class="field"><div class="field-label">${esc(q)} ${infoTip(hint)}</div><div class="btn-group" role="group" aria-label="${esc(q)}"><button class="btn small${on ? " on" : ""}" data-action="start-opt" data-key="${key}" data-v="1" aria-pressed="${on}">Ja</button><button class="btn small${on ? "" : " on"}" data-action="start-opt" data-key="${key}" data-v="0" aria-pressed="${!on}">Nee</button></div></div>`;
    };
    const more = accordion("start-meta-more", `Meer gegevens <span class="muted small" style="font-weight:400">versie, status, normenkader, sector, locaties</span>`, `
        <div class="grid grid-2 meta-grid" style="gap:0 14px">
          ${F.text("st:meta.version", "Versie", { ph: "0.1", maxlength: 12 })}
          ${F.select("st:meta.status", "Status", ds)}
          ${F.select("st:meta.framework", "Normenkader", fw)}
          ${F.select("st:meta.docLabelId", "Classificatie van dit document", docOpts, { hint: "Komt in kop- en voettekst van de exports." })}
          ${F.select("st:meta.sector", "Sector (scenario’s en aanbevelingen)", CATALOG.sectors, { render: true })}
          ${F.text("st:meta.prefix", "Naamprefix (technische namen)", { ph: "Bijv. ZN", maxlength: 10, hint: "Komt vóór label-, beleid- en regelnamen (bijv. ZN-Vertrouwelijk)." })}
        </div>
        ${has ? `<div class="grid grid-2" style="gap:0 14px">${yn("dlp_onprem", "Eigen fileservers of SharePoint Server?", "Ja zet de rij ‘On-premises’ (DLP via de Information Protection-scanner) aan op het ontwerpbord, voor alle labels.")}${yn("dlp_fabric", "Fabric of Power BI in gebruik?", "Ja zet de rij ‘Fabric & Power BI’ aan op het ontwerpbord, voor alle labels.")}</div>` : ""}
        ${F.select("st:meta.workshop", "Huidig onderdeel", CATALOG.workshops.map((w) => [w.id, w.name]))}`);
    const dateVal = String(st.meta.date || "");
    const dateField = (!dateVal || /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) ? F.text("st:meta.date", "Datum").replace('type="text"', 'type="date"') : F.text("st:meta.date", "Datum");
    const meta = `<div class="card" id="start-meta"><div class="card-head">${icon("settings")}<h3>Workshopgegevens</h3></div>
      <div class="grid grid-2 meta-grid" style="gap:0 14px">
        ${F.text("st:meta.customer", "Klant / organisatie", { ph: "Bijv. Ziekenhuis Noord", render: true })}
        ${dateField}
      </div>
      ${F.text("st:meta.facilitator", "Facilitator(s)")}
      ${F.textarea("st:meta.notes", "Uitgangspunten / scope-afspraken", { rows: 3, ph: "Bijv. alleen M365-tenant; on-premises shares buiten scope; Copilot-uitrol Q2." })}
      ${accordion("start-goals", "Doelen, afbakening en aannames", `${F.textarea("st:meta.goals", "Wat willen we bereiken?", { maxlength: STATE_CAPS.str })}${F.textarea("st:meta.exclusions", "Buiten scope", { maxlength: STATE_CAPS.str })}${F.textarea("st:meta.assumptions", "Aannames om te bevestigen", { maxlength: STATE_CAPS.str })}`)}
      ${accordion("start-internal", "Interne facilitatornotities", F.textarea("st:meta.internalNotes", "Alleen voor facilitators", { maxlength: STATE_CAPS.str, hint: "Bewaard in deze browser en de volledige JSON. Niet in klantdocumenten, Excel of PowerShell. Voer geen secrets of echte testgegevens in." }))}
      ${more}
    </div>`;

    const parts = st.meta.participants || [];
    const aria = (html, label) => html.replace(/<(input|select) /, `<$1 aria-label="${esc(label)}" `);
    const roleOpts = (cur) => { const rs = [...CATALOG.roles]; if (cur && !rs.includes(cur)) rs.push(cur); return [["", "– kies rol –"], ...rs.map((r) => [r, r])]; };
    const people = `<div class="card"><div class="card-head">${icon("users")}<h3>Deelnemers ${infoTip("Alleen naam en rol; komt in de exports.")}</h3><button class="btn small" data-action="part-add">${icon("plus", "s")} Deelnemer</button></div>
      ${parts.length ? `<div class="table-wrap"><table class="table meta-grid"><thead><tr><th>Naam</th><th>Rol</th><th><span class="sr-only">Acties</span></th></tr></thead><tbody>${parts.map((p, i) => `<tr><td>${aria(F.text(`st:meta.participants.${i}.name`, "", { cls: "mb-0", ph: "Naam" }), `Naam deelnemer ${i + 1}`)}</td><td>${aria(F.select(`st:meta.participants.${i}.role`, "", roleOpts(p.role), { cls: "mb-0" }), `Rol deelnemer ${i + 1}`)}</td><td><button class="icon-btn small danger" data-action="part-del" data-i="${i}" title="Verwijderen" aria-label="Deelnemer ${i + 1} verwijderen">${icon("trash", "s")}</button></td></tr>`).join("")}</tbody></table></div>`       : `<p class="muted small">Wie denkt mee en wie beslist? ${infoTip("Aanbevolen: CISO/security officer, privacy officer/FG, M365-beheerder, business-vertegenwoordigers en een key-user.")}</p>`}
    </div>`;

    const presets = `<div class="section" id="start-presets"><div class="section-title">${icon("layers")} ${has ? "Ander vertrekpunt kiezen" : "Kies een vertrekpunt"}<span class="spacer"></span>${infoTip("Een preset vervangt labels, informatietypen en keuzes. Workshopgegevens blijven behouden en je kunt het ongedaan maken (Ctrl+Z).")}</div>
      <div class="grid grid-${Math.min(4, Object.keys(PRESETS).length)} preset-grid">${Object.values(PRESETS).map((p) => {
        const nG = p.labels.filter((l) => (l.children || []).length).length;
        const nL = p.labels.reduce((a, l) => a + ((l.children || []).length || 1), 0);
        const on = has && st.meta.preset === p.id;
        return `<div class="preset-card${on ? " on" : ""}" data-action="preset" data-id="${esc(p.id)}" tabindex="0" role="button"><div class="row"><span class="pc-ico">${icon(p.icon, "l")}</span><div><h3 class="mb-0">${esc(p.name)}</h3><span class="small muted">${nL ? `${nL} labels${nG ? ` + ${nG} ${nG === 1 ? "groep" : "groepen"}` : ""}` : "Zelf opbouwen vanaf nul"}</span></div></div><p class="small mb-0">${esc(p.desc)}</p></div>`;
      }).join("")}</div></div>`;

    return `${hero}${accordion("start-preparation", "Workshop voorbereiden", `<div class="grid grid-2">${meta}${people}</div>`, !has)}
      ${accordion("start-agenda", "Agenda en tijd", StartUtil.agenda(st))}
      ${accordion("start-examples", has ? "Ander vertrekpunt kiezen" : "Beginnen met een voorbeeld", presets, !has)}
      <button class="btn subtle mt-2" data-action="go" data-route="architectuur">${icon("layers", "s")} Hoe werkt Purview?</button>`;
  },
});

const StartUtil = {
  agenda(st) {
    const a = st.workshop.agenda, total = sum(a, (x) => x.duration);
    return `${F.number("st:workshop.duration", "Beschikbare tijd (minuten)", { min: 0, max: 1440, render: true })}
      <p class="small">${total} minuten gepland${st.workshop.duration ? ` van ${st.workshop.duration}` : "; totale workshopduur nog niet ingevuld"}.</p>
      ${st.workshop.duration && total > st.workshop.duration ? msg("warn", "De agenda overschrijdt de beschikbare tijd.") : ""}
      ${a.some((x) => !x.duration) ? msg("warn", "Vul de duur van elk agendapunt in.") : ""}
      ${a.map((x, i) => accordion(`agenda-${x.id}`, esc(x.title || "Agendapunt"), `
        ${F.text(`st:workshop.agenda.${i}.title`, "Onderwerp", { maxlength: 200 })}
        ${F.select(`st:workshop.agenda.${i}.route`, "Onderdeel", Object.entries(Views).map(([r,v])=>[r,v.title]))}
        ${F.number(`st:workshop.agenda.${i}.duration`, "Minuten", { min: 0, max: 1440, render: true })}
        ${F.text(`st:workshop.agenda.${i}.facilitator`, "Facilitator", { maxlength: 200 })}
        ${F.textarea(`st:workshop.agenda.${i}.goal`, "Doel")}
        ${F.textarea(`st:workshop.agenda.${i}.notes`, "Afspraken voor het ontwerp")}
        <div class="row"><button class="btn small" data-action="agenda-start" data-id="${esc(x.id)}">${icon("play", "s")} Start dit agendapunt</button><button class="btn small danger" data-action="agenda-remove" data-id="${esc(x.id)}">Verwijderen</button></div>
      `)).join("")}
      <div class="row mt-2"><button class="btn" data-action="agenda-add">${icon("plus", "s")} Agendapunt</button>${!a.length ? '<button class="btn" data-action="agenda-suggest">Richtagenda overnemen</button>' : ""}</div>
      <p class="hint">Richtduren zijn suggesties; pas ze aan. Een lopende timer houdt zijn gekozen doeltijd vast.</p>`;
  },
  ready(st) { return Validation.readiness(st); },
  optOn(st, key) { return applicableLabels(st).some((l) => l.choices && l.choices[key] && !/-off$/.test(l.choices[key])); },
  /** Ja: zet de optionele rij aan volgens het profiel van elk label (of een lichte standaard); Nee: overal uit. */
  setOpt(st, key, on) {
    const cs = CATALOG.choicesFor(key);
    const off = cs.find((c) => /-off$/.test(c.id));
    const light = cs.filter((c) => c.lv > 0).sort((a, b) => a.lv - b.lv)[0];
    let n = 0;
    applicableLabels(st).forEach((l) => {
      let id = off && off.id;
      if (on) {
        const cur = l.choices && l.choices[key];
        if (cur && !/-off$/.test(cur)) return;
        const pf = CATALOG.profiles.find((p) => p.id === l.profile);
        id = pf && pf.opt && pf.opt[key] ? pf.opt[key] : (Mapping.strictness(l) >= 1 && light ? light.id : off && off.id);
      }
      if (id && Mapping.apply(st, l.id, id) && !/-off$/.test(id)) n++;
    });
    return n;
  },
};

Actions["part-add"] = () => {
  let i = 0;
  Store.update((st) => { st.meta.participants = st.meta.participants || []; st.meta.participants.push({ name: "", role: "" }); i = st.meta.participants.length - 1; });
  setTimeout(() => { const el = document.querySelector(`#main [data-bind="st:meta.participants.${i}.name"]`); if (el) el.focus(); }, 30);
};
Actions["part-del"] = (el) => Store.update((st) => { st.meta.participants.splice(Number(el.dataset.i), 1); });
Actions["preset"] = (el) => {
  const p = PRESETS[el.dataset.id];
  if (!p) return;
  const go = () => {
    applyPreset(p.id);
    Store.recovery = null;
    resetViewState();
    UI.acc = { "start|start-preparation": true };
    Store.queueSave();
    if (!p.labels.length) { Toast.show(`Preset <b>${esc(p.name)}</b> geladen. Begin met het classificatieschema.`, "ok"); App.go("schema"); return; }
    App.go("start");
    Toast.show(`Preset <b>${esc(p.name)}</b> geladen. Vul nu de klantnaam en deelnemers in. <button class="link-btn" data-action="go" data-route="board">Naar ontwerpbord</button>`, "ok", 7000);
    setTimeout(() => { const c = $("#start-meta"); if (c && c.scrollIntoView) c.scrollIntoView({ block: "start", behavior: "smooth" }); const k = $('#main [data-bind="st:meta.customer"]'); if (k) k.focus({ preventScroll: true }); }, 60);
  };
  if (!IO.hasContent(S()) && !Store.recovery) go();
  else confirmDialog(`Preset ‘${p.name}’ laden?`, "Het huidige ontwerp (labels, informatietypen, keuzes, beleid en DLP) wordt vervangen. Workshopgegevens blijven behouden. Je kunt dit ongedaan maken met Ctrl+Z.", go, "Laden");
};
Actions["start-presets"] = () => { const c = $("#start-presets"); if (c && c.scrollIntoView) c.scrollIntoView({ block: "start", behavior: "smooth" }); const f = $("#start-presets .preset-card"); if (f) f.focus({ preventScroll: true }); };
Actions["agenda-add"] = () => {
  if (S().workshop.agenda.length >= 32) { Toast.show("Maximaal 32 agendapunten.", "warn"); return; }
  Store.update((st) => st.workshop.agenda.push({ id: uid("agenda"), title: "", route: "start", duration: 0, goal: "", facilitator: "", notes: "" }));
};
Actions["agenda-remove"] = (el) => Store.update((st) => { st.workshop.agenda = st.workshop.agenda.filter((a) => a.id !== el.dataset.id); });
Actions["agenda-suggest"] = () => Store.update((st) => {
  if (st.workshop.agenda.length) return;
  st.workshop.agenda = NAV_ROUTES.map((r) => ({ id: uid("agenda"), title: Views[r].title, route: r, duration: Views[r].fac?.duration || 0, goal: Views[r].fac?.goal || "", facilitator: st.meta.facilitator, notes: "" }));
});
Actions["agenda-start"] = (el) => {
  const a = S().workshop.agenda.find((x) => x.id === el.dataset.id);
  if (!a || !a.duration) { Toast.show("Vul eerst de duur in.", "warn"); return; }
  const go = () => {
    App.go(a.route); Timer.reset(); Timer.s.base = a.duration * 60; Timer.s.route = UI.route;
    Timer.s.running = true; Timer.s.startAt = Date.now();
    UI.panelOverride = true; UI.beamerPanel = true; Prefs.apply(); App.renderTopbar(); App.renderPanel();
  };
  if (Timer.active()) confirmDialog("Lopende timer vervangen?", "De verstreken tijd van de huidige timer wordt gewist.", go, "Start agendapunt");
  else go();
};
Actions["start-opt"] = (el) => {
  const key = el.dataset.key, on = el.dataset.v === "1";
  const row = CATALOG.boardRows.find((r) => r.key === key);
  let n = 0;
  Store.update((st) => { n = StartUtil.setOpt(st, key, on); });
  Toast.show(on ? `Rij <b>${esc(row ? row.name : key)}</b> staat aan op het ontwerpbord (${n} label${n === 1 ? "" : "s"} met een maatregel). <button class="link-btn" data-action="go" data-route="board">Bekijken</button>` : `Rij <b>${esc(row ? row.name : key)}</b> staat uit voor alle labels.`, "ok");
};
