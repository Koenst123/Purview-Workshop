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
    const stat = (v, l, sub) => `<div class="stat"><span class="stat-value">${v}</span><span class="stat-label" style="color:rgba(255,255,255,.75)">${l}${sub ? `<br><span class="xs">${sub}</span>` : ""}</span></div>`;
    const nGroups = st.labels.filter((l) => hasChildren(l, st)).length;
    const nSel = st.labels.length - nGroups;
    let figures = "";
    let health = "";
    if (has) {
      const g = Generator.stats(st);
      const rd = StartUtil.ready(st);
      const sc = ScenarioEngine.score(st);
      const vc = Validation.counts(st);
      figures = `<div class="row mt-2" style="gap:22px">${stat(nSel, "labels", nGroups ? `+ ${nGroups} ${nGroups === 1 ? "groep" : "groepen"}` : "")}${stat(g.sits, "informatietypen")}${stat(g.labelPolicies, "labelbeleid")}${stat(g.dlpPolicies, "DLP-policies")}</div>`;
      const rings = `<div class="hero-rings">
        <div class="col" style="align-items:center" data-tip="${esc(rd.design.label)}: ingevulde stappen van het ontwerp. Details op Validatie &amp; export.">${ring(rd.design.pct, undefined, "", "#FB59BE")}<span class="xs" style="color:rgba(255,255,255,.8)">${esc(rd.design.label)}</span></div>
        <div class="col" style="align-items:center" data-tip="${esc(rd.rollout.label)}: geen fouten, groepen en domeinen ingevuld, besluiten vastgelegd. Zie Ontwerpstatus.">${ring(rd.rollout.pct, undefined, "", "#54B054")}<span class="xs" style="color:rgba(255,255,255,.8)">${esc(rd.rollout.label)}</span></div>
      </div>`;
      figures = `<div class="row" style="gap:22px;align-items:flex-end;flex-wrap:wrap">${figures}<span class="spacer"></span>${rings}</div>`;
      const crit = rd.rollout.criteria || [];
      health = `<div class="card"><div class="card-head">${icon("checkcircle")}<h3>Ontwerpstatus</h3><button class="btn small" data-action="go" data-route="export">Details</button></div>
        <div class="row" style="gap:20px"><div class="stat"><span class="stat-value" style="color:var(--err)">${vc.err}</span><span class="stat-label">fouten</span></div><div class="stat"><span class="stat-value" style="color:var(--warn)">${vc.warn}</span><span class="stat-label">waarschuwingen</span></div><div class="stat"><span class="stat-value">${sc.pass}/${sc.total}</span><span class="stat-label">scenario’s kloppen ${infoTip("Automatische toets: het ontwerp wordt doorgerekend tegen praktijkscenario’s. Samen spelen doe je op de pagina Scenario’s.")}</span></div></div>
        ${crit.length ? `<details class="mt-2 ready-crit"><summary class="small"><b>Wat is nodig voor uitrol?</b> <span class="muted">${crit.filter((c) => c.ok).length}/${crit.length} klaar</span></summary><ul class="clean small mt-1">${crit.map((c) => `<li>${icon(c.ok ? "check" : "minus", "s")} ${c.route && !c.ok ? `<button class="link-btn" data-action="go" data-route="${esc(c.route)}">${esc(c.text)}</button>` : esc(c.text)}</li>`).join("")}</ul></details>` : ""}
        <div class="xs muted mt-2">Gebaseerd op Microsoft Learn (gecontroleerd ${esc(CATALOG.docsVerified || "")}) ${infoTip("Functies met het label ‘Preview’ zijn in preview; licentiebadges (zoals E5 IP) tonen de benodigde licentie.")}</div>
      </div>`;
    }
    const cta = has ? `<button class="btn primary large" data-action="go" data-route="board">${icon("board")} Naar het ontwerpbord</button>`
      : `<button class="btn primary large" data-action="start-presets">${icon("layers")} Kies een vertrekpunt ↓</button> <button class="btn ghost" data-action="go" data-route="schema">${icon("tag")} Of begin leeg met het schema</button>`;
    const hero = `<div class="card hero start-hero mb-3">
        <div class="sh-main">
        <div class="eyebrow">Protect your Data · Information Protection &amp; DLP workshop</div>
        <h1>Information Protection &amp; DLP – integraal ontwerp</h1>
        <p class="lead">Van classificatieschema tot labels en DLP – in één ontwerp, direct getoetst met scenario’s.${st.meta.customer ? ` Ontwerp voor <b>${esc(st.meta.customer)}</b>.` : ""}</p>
        ${figures}
        <div class="row mt-2">${cta}${has ? `<button class="btn large hero-ghost" data-action="go" data-route="scenarios">${icon("trophy")} Speel scenario’s</button>` : ""}<button class="btn large hero-ghost" data-action="go" data-route="architectuur">${icon("layers")} Hoe werkt Purview?</button></div>
        </div>
        <div class="sh-brand">${brandImg("peTagline", "Better connected in The Digital Neighborhood", "sh-tagline")}<div class="sh-ms">${brandImg("msSecurity", "Microsoft Security", "ms-wordmark")}${brandImg("msPartner", "Microsoft Solutions Partner – Security", "ms-partner")}</div></div>
      </div>`;

    const journey = `<div class="section"><div class="section-title">${icon("route")} Workshopreis</div><div class="journey">${CATALOG.workshops.map((w, i) => {
      const done = has && w.routes.every((r) => Views[r] && Views[r].done && Views[r].done(st));
      return `<div class="journey-step${done ? " done" : ""}"><h4><span class="js-num">${done ? icon("check", "s") : i + 1}</span><span>${esc(String(w.name).replace(/^Workshop\s*\d+\s*[–-]\s*/, ""))}</span>${infoTip(w.desc)}</h4><div class="chip-list">${w.routes.map((r) => { const v = Views[r]; const ok = has && v && v.done && v.done(st); return `<button class="chip${ok ? " on" : ""}" style="cursor:pointer" data-action="go" data-route="${esc(r)}">${ok ? icon("check", "s") : ""}${esc(v ? v.title : r)}</button>`; }).join("")}</div></div>`;
    }).join("")}</div></div>`;

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

    const achOn = [];
    const ach = CATALOG.achievements.map((a) => { let on = false; try { on = has && !!a.test(st); } catch { /* */ } if (on) achOn.push(a); return `<div class="ach${on ? " on" : ""}" title="${esc(a.desc)}"><span class="ach-ico">${icon(a.icon)}</span><div><b>${esc(a.title)}</b><div class="xs">${esc(a.desc)}</div></div></div>`; }).join("");
    const achAcc = has ? accordion("start-ach", `${icon("trophy")} Prestaties <span class="badge neutral">${achOn.length}/${CATALOG.achievements.length}</span>`, `<div class="achievements">${ach}</div>`) : "";

    const side = `<div class="col" style="gap:14px">${people}${health}</div>`;
    return has
      ? `${hero}${journey}<div class="grid grid-2">${meta}${side}</div>${presets}${achAcc}`
      : `${hero}${presets}${journey}<div class="grid grid-2">${meta}${side}</div>`;
  },
});

const StartUtil = {
  /** Readiness volgens het contract (core); valt terug op een lokale, uitlegbare berekening. */
  ready(st) {
    let r = null;
    try { r = Validation.readiness ? Validation.readiness(st) : null; } catch (e) { r = null; }
    if (typeof r === "number") r = { pct: r };
    r = r || { pct: 0 };
    const design = r.design && r.design.pct != null ? r.design : { pct: r.pct || 0, label: "Ontwerp compleet" };
    let rollout = r.rollout && r.rollout.pct != null ? r.rollout : null;
    if (!rollout) {
      const vc = Validation.counts(st);
      const crit = [
        { text: "Geen fouten in het ontwerp", ok: vc.err === 0, route: "export" },
        { text: "Groepen en partnerdomeinen ingevuld", ok: (st.groups || []).every((g) => String(g.value || "").trim()), route: "policies" },
        { text: "Besluiten vastgelegd", ok: (st.decisions || []).some((d) => d.status === "besloten"), route: "besluiten" },
      ];
      rollout = { pct: Math.round((crit.filter((c) => c.ok).length / crit.length) * 100), label: "Klaar voor uitrol", criteria: crit };
    }
    return { design: { pct: Math.round(Number(design.pct) || 0), label: design.label || "Ontwerp compleet" }, rollout: { pct: Math.round(Number(rollout.pct) || 0), label: rollout.label || "Klaar voor uitrol", criteria: rollout.criteria || [] } };
  },
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
    if (!p.labels.length) { Toast.show(`Preset <b>${esc(p.name)}</b> geladen. Begin met het classificatieschema.`, "ok"); App.go("schema"); return; }
    App.go("start");
    Toast.show(`Preset <b>${esc(p.name)}</b> geladen. Vul nu de klantnaam en deelnemers in. <button class="link-btn" data-action="go" data-route="board">Naar ontwerpbord</button>`, "ok", 7000);
    setTimeout(() => { const c = $("#start-meta"); if (c && c.scrollIntoView) c.scrollIntoView({ block: "start", behavior: "smooth" }); const k = $('#main [data-bind="st:meta.customer"]'); if (k) k.focus({ preventScroll: true }); }, 60);
  };
  if (!S().labels.length) go();
  else confirmDialog(`Preset ‘${p.name}’ laden?`, "Het huidige ontwerp (labels, informatietypen, keuzes, beleid en DLP) wordt vervangen. Workshopgegevens blijven behouden. Je kunt dit ongedaan maken met Ctrl+Z.", go, "Laden");
};
Actions["start-presets"] = () => { const c = $("#start-presets"); if (c && c.scrollIntoView) c.scrollIntoView({ block: "start", behavior: "smooth" }); const f = $("#start-presets .preset-card"); if (f) f.focus({ preventScroll: true }); };
Actions["start-opt"] = (el) => {
  const key = el.dataset.key, on = el.dataset.v === "1";
  const row = CATALOG.boardRows.find((r) => r.key === key);
  let n = 0;
  Store.update((st) => { n = StartUtil.setOpt(st, key, on); });
  Toast.show(on ? `Rij <b>${esc(row ? row.name : key)}</b> staat aan op het ontwerpbord (${n} label${n === 1 ? "" : "s"} met een maatregel). <button class="link-btn" data-action="go" data-route="board">Bekijken</button>` : `Rij <b>${esc(row ? row.name : key)}</b> staat uit voor alle labels.`, "ok");
};
