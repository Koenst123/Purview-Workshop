/* View: Besluiten & open punten – overzicht van alles wat in de workshop is besloten of nog openstaat. */

const DEC_ORDER = ["bespreken", "open", "besloten", "nvt"];
const DEC_BADGE = { besloten: "decided", bespreken: "discuss", open: "open" };

Actions["dec-filter"] = (el) => { UI.decFilter = DECISION_STATUSES.includes(el.dataset.value) ? el.dataset.value : ""; App.render(); };

registerView("besluiten", {
  title: "Besluiten & open punten",
  fac: {
    duration: 10,
    goal: "Samen vaststellen wat besloten is, wat nog openstaat en wie het oppakt.",
    questions: ["Wie is eigenaar van dit punt?", "Wanneer moet dit besloten zijn?", "Is dit punt nog relevant, of is het n.v.t.?"],
    tips: ["Leg punten tijdens de workshop vast in dit paneel; loop de lijst aan het eind door.", "Een eigenaar per open punt telt mee voor de opleveringscriteria."],
    pitfalls: ["Open punten zonder eigenaar blijven liggen na de workshop."],
  },
  done(st) { const d = (st.decisions || []).filter((x) => x.status !== "nvt"); return d.some((x) => x.status === "besloten") && d.every((x) => String(x.owner || "").trim()); },
  render() {
    const st = S(), all = st.decisions || [];
    const f = DECISION_STATUSES.includes(UI.decFilter) ? UI.decFilter : "";
    const count = (s) => all.filter((d) => d.status === s).length;
    const routeName = (r) => (Views[r] ? Views[r].title : r || "");
    const opt = (s, cur) => `<option value="${s}"${s === cur ? " selected" : ""}>${esc(DECISION_STATUS_META[s][0])}</option>`;
    const badge = (s) => DEC_BADGE[s] ? statusBadge(DEC_BADGE[s], DECISION_STATUS_META[s][0]) : `<span class="badge st neutral">${icon("minus", "s")}${esc((DECISION_STATUS_META[s] || DECISION_STATUS_META.nvt)[0])}</span>`;
    const configs = [...st.labels, ...st.labelPolicies, ...st.customDlp];
    const row = (d) => {
      const id = esc(d.id), noOwner = d.status !== "nvt" && !String(d.owner || "").trim();
      const filled = ["rationale", "assumptions", "resolution", "notes"].filter((k) => String(d[k] || "").trim()).length;
      return `<div class="dec-row st-${esc(d.status)}" role="listitem" data-focus-key="decr-${id}">
        <label class="dec-st-wrap"><span aria-hidden="true">${badge(d.status)}</span>${icon("chevrondown", "s")}<select class="dec-st" data-bind="dec:${id}:status" data-onchange="dec-status" aria-label="Status">${DECISION_STATUSES.map((s) => opt(s, d.status)).join("")}</select></label>
        <div class="dec-main"><textarea class="textarea dec-txt" data-bind="dec:${id}:text" rows="1" maxlength="20000" aria-label="Omschrijving">${esc(d.text)}</textarea>${d.route && Views[d.route] ? `<a class="xs muted dec-route" href="#${esc(d.route)}" data-action="go" data-route="${esc(d.route)}">${esc(routeName(d.route))}</a>` : ""}</div>
        <input class="input dec-owner${noOwner ? " dec-need" : ""}" data-bind="dec:${id}:owner" value="${esc(d.owner || "")}" maxlength="120" placeholder="${noOwner ? "Eigenaar nodig" : "Eigenaar"}" aria-label="Eigenaar">
        <input class="input dec-due${/^\d{4}-\d{2}-\d{2}$/.test(d.due || "") ? "" : " is-empty"}" type="date" data-bind="dec:${id}:due" value="${esc(/^\d{4}-\d{2}-\d{2}$/.test(d.due || "") ? d.due : "")}" aria-label="Deadline" title="Deadline">
        <button class="icon-btn small dec-del" data-action="decision-del" data-id="${id}" title="Verwijderen" aria-label="Verwijderen">${icon("x", "s")}</button>
        <div class="dec-details">${accordion(`decision-${d.id}`, `Details${filled ? ` <span class="dec-filled">${filled}/4 ingevuld</span>` : ""}`, `
          ${F.textarea(`dec:${d.id}:rationale`, "Waarom dit besluit?")}
          ${F.textarea(`dec:${d.id}:assumptions`, "Aannames")}
          ${F.textarea(`dec:${d.id}:resolution`, "Oplossing / acceptatiecriterium")}
          ${F.textarea(`dec:${d.id}:notes`, "Notities voor het ontwerp")}
          <div class="grid grid-2 dec-links">
          ${F.select(`dec:${d.id}:route`, "Onderdeel", [["", "Geen"], ...Object.entries(Views).map(([r, v]) => [r, v.title])])}
          ${F.select(`dec:${d.id}:configId`, "Configuratie", [["", "Geen"], ...configs.map((x) => [x.id, x.name]), ...(d.configId && !configs.some((x) => x.id === d.configId) ? [[d.configId, `${d.configId} (niet gevonden)`]] : [])])}
          </div>
          ${F.text(`dec:${d.id}:ruleId`, "Validatieregel-ID", { maxlength: 120, hint: "Neem de regel-ID over uit Validatie & export." })}
        `)}</div>
      </div>`;
    };
    const add = `<div class="card dec-add mb-2"><input id="dec-new" class="input" maxlength="2000" placeholder="Nieuw besluit of open punt…" aria-label="Nieuw besluit of open punt" value="${esc(UI.decNewDraft || "")}">
      <select id="dec-new-status" class="select" aria-label="Status">${DECISION_STATUSES.map((s) => opt(s, "open")).join("")}</select>
      <button class="btn primary" data-action="decision-add" data-input="dec-new" data-status-select="dec-new-status">${icon("plus", "s")} Toevoegen</button></div>`;
    const more = `<p>Alles wat je tijdens de workshop vastlegt, via het facilitatorpaneel of hier, komt in deze lijst, in het ontwerpdocument en in de Excel-export.</p><p>Voor de opleveringscriteria telt: minimaal één besluit, en elk besluit en open punt heeft een eigenaar. Punten op ‘N.v.t.’ tellen niet mee.</p>`;
    const head = pageHead("Toetsen & afronden", "Besluiten & open punten", "Wat is besloten en wat staat nog open?", "", more);
    if (!all.length) return VH.wrap(`${head}${add}${emptyState("flag", "Nog geen besluiten of open punten", "Voeg hierboven het eerste punt toe.")}`);
    const chip = (s, label, n) => `<button type="button" class="chip${f === s ? " on" : ""}" data-action="dec-filter" data-value="${s}" aria-pressed="${f === s}">${esc(label)} <span class="muted">${n}</span></button>`;
    const chips = `<div class="chip-list dec-chips mb-2" role="group" aria-label="Filter op status">${chip("", "Alle", all.length)}${DEC_ORDER.map((s) => chip(s, DECISION_STATUS_META[s][0], count(s))).join("")}</div>`;
    const its = (f ? [f] : DEC_ORDER).flatMap((s) => all.filter((d) => d.status === s));
    const list = its.length ? `<div class="dec-table"><div class="dec-head" aria-hidden="true"><span>Status</span><span>Omschrijving</span><span>Eigenaar</span><span>Deadline</span><span></span></div><div class="dec-list" role="list">${its.map(row).join("")}</div></div>`
      : `<p class="small muted">Geen punten met deze status.</p>`;
    return VH.wrap(`${head}${add}${chips}${list}`);
  },
});
