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
    const val = has ? App.val() : [];
    const nErr = val.filter((v) => v.level === "err").length, nWarn = val.filter((v) => v.level === "warn").length;
    const errRoute = (val.find((v) => v.level === "err") || {}).route;
    const next = !has ? "schema" : (errRoute && Views[errRoute] ? errRoute : "")
      || NAV_ROUTES.find((r) => r !== "start" && !(st.meta.reviewed || {})[r]) || "export";
    const ready = has && !nErr && next === "export";
    const head = pageHead("", "Jouw informatiebescherming", "Ontwerp samen sensitivity labels en DLP voor Microsoft 365.",
      `<button class="btn subtle" data-action="go" data-route="architectuur">${icon("layers", "s")} Hoe werkt Purview?</button>`);

    const presetCards = `<div class="grid grid-${Math.min(4, Object.keys(PRESETS).length)} preset-grid">${Object.values(PRESETS).map((p) => {
      const nG = p.labels.filter((l) => (l.children || []).length).length;
      const nL = p.labels.reduce((a, l) => a + ((l.children || []).length || 1), 0);
      const on = has && st.meta.preset === p.id;
      return `<div class="preset-card${on ? " on" : ""}${nL ? "" : " is-empty"}" data-action="preset" data-id="${esc(p.id)}" tabindex="0" role="button"><div class="row"><span class="pc-ico" aria-hidden="true">${icon(p.icon, "l")}</span><div class="pc-t"><h3 class="mb-0">${esc(p.name)}</h3><span class="pc-meta">${nL ? `${nL} labels${nG ? ` · ${nG} ${nG === 1 ? "groep" : "groepen"}` : ""}` : "Zelf opbouwen"}</span></div></div><p class="small muted mb-0">${esc(p.desc)}</p></div>`;
    }).join("")}</div>`;

    const groups = StartUtil.groups(st, has, next);
    let hero;
    if (!has) {
      hero = `${head}<section class="start-context start-empty" id="start-presets" aria-labelledby="start-pick"><h2 id="start-pick" class="start-h2">Kies een vertrekpunt ${infoTip("Een voorbeeld vult labels, informatietypen en keuzes. Pas het daarna samen aan. Workshopgegevens blijven behouden.")}</h2>${presetCards}</section>
      <div class="start-sec-t" id="start-map">Routekaart</div>${groups}`;
    } else {
      const nRev = NAV_ROUTES.filter((r) => StartUtil.status(st, r) === "done").length;
      let scn = null; try { scn = ScenarioEngine.score(st).pct; } catch (e) { /* geen scenario's */ }
      const why = ready ? "Stappen besproken, geen fouten in de validatie."
        : errRoute && next === errRoute ? `${plural(nErr, "fout", "fouten")} in de validatie. Begin hier.`
        : "Nog niet besproken in de workshop.";
      const kpi = (route, label, value, kind) => `<a class="start-kpi" href="#${route}" data-action="go" data-route="${route}"><span class="start-kpi-l">${esc(label)}</span><span class="start-kpi-v${kind ? ` ${kind}` : ""}">${value}</span></a>`;
      hero = `${head}<div class="start-top">
        <section class="card start-context start-hero2${ready ? " is-ready" : ""}" aria-labelledby="start-next">
          <div class="start-next"><span class="start-next-ico" aria-hidden="true">${icon(ready ? "checkcircle" : ROUTE_ICON[next] || "chevronright", "l")}</span><div class="start-next-text"><div class="eyebrow">${ready ? "Klaar voor review" : "Volgende stap"}</div><h2 id="start-next" class="start-h2">${esc(ready ? "Validatie & export" : Views[next].title)}</h2><p class="small muted mb-0">${esc(why)}</p></div>
            <div class="start-next-acts">${ready ? `<button class="btn" data-action="go" data-route="besluiten">Besluiten</button>` : ""}<button class="btn primary" data-action="go" data-route="${esc(next)}">${ready ? "Naar export" : "Ga verder"} ${icon("chevronright", "s")}</button></div></div>
          <div class="start-kpis">
            ${kpi("export", "Validatie", [nErr ? plural(nErr, "fout", "fouten") : "", nWarn ? plural(nWarn, "waarschuwing", "waarschuwingen") : ""].filter(Boolean).join(" · ") || "Geen bevindingen", nErr ? "err" : nWarn ? "warn" : "ok")}
            ${kpi("besluiten", "Besluiten open", String(open), open ? "warn" : "")}
            <div class="start-kpi"><span class="start-kpi-l">Besproken</span><span class="start-kpi-v">${nRev}/${NAV_ROUTES.length}</span></div>
            ${scn != null ? kpi("scenarios", "Scenario-toets", `${scn}%`, scn >= 80 ? "ok" : "") : ""}
          </div>
        </section>
        ${StartUtil.labels(st)}
      </div>${groups}`;
    }

    const fw = typeof FRAMEWORKS !== "undefined" ? FRAMEWORKS : [["none", "Geen / nog niet bepaald"], ["bio", "BIO (overheid)"], ["nen7510", "NEN 7510 (zorg)"], ["iso27001", "ISO/IEC 27001"], ["avg", "AVG (alleen privacy)"]];
    const ds = typeof DESIGN_STATUS !== "undefined" ? DESIGN_STATUS : [["concept", "Concept"], ["review", "Ter besluitvorming"], ["final", "Vastgesteld"]];
    const docOpts = [["", "Vertrouwelijk (standaard)"], ...applicableLabels(st).map((l) => [l.id, labelFullName(l, st)])];
    const yn = (key, q, hint) => {
      const on = StartUtil.optOn(st, key);
      return `<div class="field"><div class="field-label">${esc(q)} ${infoTip(hint)}</div><div class="btn-group" role="group" aria-label="${esc(q)}"><button class="btn small${on ? " on" : ""}" data-action="start-opt" data-key="${key}" data-v="1" aria-pressed="${on}">Ja</button><button class="btn small${on ? "" : " on"}" data-action="start-opt" data-key="${key}" data-v="0" aria-pressed="${!on}">Nee</button></div></div>`;
    };
    const more = accordion("start-meta-more", `Meer gegevens <span class="start-acc-sub">versie, status, normenkader, sector, locaties</span>`, `
        <div class="grid grid-2 meta-grid" style="gap:0 14px">
          ${F.text("st:meta.version", "Versie", { ph: "0.1", maxlength: 12 })}
          ${F.select("st:meta.status", "Status", ds)}
          ${F.select("st:meta.framework", "Normenkader", fw)}
          ${F.select("st:meta.docLabelId", "Classificatie van dit document", docOpts, { hint: "Komt in kop- en voettekst van de exports." })}
          ${F.select("st:meta.sector", "Sector (scenario’s en aanbevelingen)", CATALOG.sectors, { render: true })}
          ${((f) => (techNameIssue(st) ? f : techOnly(f)))(F.text("st:meta.prefix", "Naamprefix (technische namen)", { ph: "Bijv. ZN", maxlength: 10, hint: "Komt vóór label-, beleid- en regelnamen (bijv. ZN-Vertrouwelijk)." }))}
        </div>
        ${has ? `<div class="grid grid-2" style="gap:0 14px">${yn("dlp_onprem", "Eigen fileservers of SharePoint Server?", "Ja zet de rij ‘On-premises’ (DLP via de Information Protection-scanner) aan op het ontwerpbord, voor alle labels.")}${yn("dlp_fabric", "Fabric of Power BI in gebruik?", "Ja zet de rij ‘Fabric & Power BI’ aan op het ontwerpbord, voor alle labels.")}</div>` : ""}
        ${F.select("st:meta.workshop", "Huidig onderdeel", CATALOG.workshops.map((w) => [w.id, w.name]))}`);
    const dateVal = String(st.meta.date || "");
    const dateField = (!dateVal || /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) ? F.text("st:meta.date", "Datum").replace('type="text"', 'type="date"') : F.text("st:meta.date", "Datum");
    const meta = `<section id="start-meta" class="start-sec"><h3 class="start-h3">Gegevens</h3>
      <div class="grid grid-2 meta-grid" style="gap:0 14px">
        ${F.text("st:meta.customer", "Klant / organisatie", { ph: "Bijv. Ziekenhuis Noord", render: true })}
        ${dateField}
      </div>
      ${F.text("st:meta.facilitator", "Facilitator(s)")}
      ${F.textarea("st:meta.notes", "Uitgangspunten / scope-afspraken", { rows: 3, ph: "Bijv. alleen M365-tenant; on-premises shares buiten scope." })}
      ${accordion("start-goals", "Doelen, afbakening en aannames", `${F.textarea("st:meta.goals", "Wat willen we bereiken?", { maxlength: STATE_CAPS.str })}${F.textarea("st:meta.exclusions", "Buiten scope", { maxlength: STATE_CAPS.str })}${F.textarea("st:meta.assumptions", "Aannames om te bevestigen", { maxlength: STATE_CAPS.str })}`)}
      ${accordion("start-internal", "Interne facilitatornotities", F.textarea("st:meta.internalNotes", "Alleen voor facilitators", { maxlength: STATE_CAPS.str, hint: "Bewaard in deze browser en de volledige JSON. Niet in klantdocumenten, Excel of PowerShell. Voer geen secrets of echte testgegevens in." }))}
      ${more}
    </section>`;

    const parts = st.meta.participants || [];
    const aria = (html, label) => html.replace(/<(input|select) /, `<$1 aria-label="${esc(label)}" `);
    const roleOpts = (cur) => { const rs = [...CATALOG.roles]; if (cur && !rs.includes(cur)) rs.push(cur); return [["", "– kies rol –"], ...rs.map((r) => [r, r])]; };
    const people = `<section class="start-sec"><div class="row start-sec-head"><h3 class="start-h3">Deelnemers ${infoTip("Alleen naam en rol; komt in de exports. Aanbevolen: CISO/security officer, privacy officer/FG, M365-beheerder, business-vertegenwoordigers en een key-user.")}</h3><span class="spacer"></span><button class="btn small" data-action="part-add">${icon("plus", "s")} Deelnemer</button></div>
      ${parts.length ? `<div class="table-wrap"><table class="table meta-grid"><thead><tr><th>Naam</th><th>Rol</th><th><span class="sr-only">Acties</span></th></tr></thead><tbody>${parts.map((p, i) => `<tr><td>${aria(F.text(`st:meta.participants.${i}.name`, "", { cls: "mb-0", ph: "Naam" }), `Naam deelnemer ${i + 1}`)}</td><td>${aria(F.select(`st:meta.participants.${i}.role`, "", roleOpts(p.role), { cls: "mb-0" }), `Rol deelnemer ${i + 1}`)}</td><td><button class="icon-btn small danger" data-action="part-del" data-i="${i}" title="Verwijderen" aria-label="Deelnemer ${i + 1} verwijderen">${icon("trash", "s")}</button></td></tr>`).join("")}</tbody></table></div>` : `<p class="muted small">Nog geen deelnemers.</p>`}
    </section>`;

    const prepSum = [st.meta.customer, /^\d{4}-\d{2}-\d{2}$/.test(dateVal) ? fmtDate(dateVal) : dateVal, parts.length ? plural(parts.length, "deelnemer", "deelnemers") : ""].filter(Boolean).join(" · ");
    const agTotal = sum(st.workshop.agenda, (x) => x.duration);
    const sumText = (title, sub) => `${title}${sub ? ` <span class="start-acc-sub">${esc(sub)}</span>` : ""}`;
    return `${hero}<div class="start-prep">
      ${accordion("start-preparation", sumText("Workshopgegevens en deelnemers", prepSum), `<div class="grid grid-2 start-prep-grid">${meta}${people}</div>`)}
      ${accordion("start-agenda", sumText("Agenda en tijd", st.workshop.agenda.length ? `${agTotal} min gepland` : ""), StartUtil.agenda(st))}
      ${has ? accordion("start-examples", "Ander vertrekpunt kiezen", `<div id="start-presets">${presetCards}</div>`) : ""}
    </div>`;
  },
});

const StartUtil = {
  GROUP_DESC: { "Know your Data": "Welke informatie je hebt", Maatregelen: "Labels en wat ze afdwingen", "Beleid & DLP": "Regels die datalekken voorkomen", Adoptie: "Invoeren, besluiten en opleveren" },
  GROUP_TONE: { "Know your Data": "info", Maatregelen: "brand", "Beleid & DLP": "navy", Adoptie: "ok" },
  STATUS_TXT: { done: "besproken", pre: "voorgevuld", open: "open" },
  /** Zelfde status als het menu: besproken (of export gestart) > voorgevuld > open. */
  status(st, r) {
    const m = st.meta || {};
    if ((m.reviewed && m.reviewed[r]) || (r === "export" && m.exportedAt)) return "done";
    if (!(st.labels || []).length) return "open";
    try { return Views[r] && Views[r].done && Views[r].done(st) ? "pre" : "open"; } catch (e) { return "open"; }
  },
  /** Vier groepstegels gelijk aan het menu; zonder labels als routekaart (zonder voortgang). */
  groups(st, progress, globalNext) {
    const gs = NAV.filter((g) => g.group);
    return `<nav class="start-groups${progress ? "" : " is-map"}" aria-label="Workshoponderdelen">${gs.map((g, gi) => {
      const rs = g.routes.filter((r) => Views[r]);
      const ss = rs.map((r) => (progress ? this.status(st, r) : "open"));
      const nDone = ss.filter((s) => s === "done").length;
      const nextI = progress ? ss.findIndex((s) => s !== "done") : -1;
      const target = rs[nextI >= 0 ? nextI : 0];
      const id = `start-g${gi}`;
      const bar = progress ? `<div class="start-grp-prog"><span class="start-seg" aria-hidden="true">${ss.map((s) => `<i class="${s}"></i>`).join("")}</span><span class="start-grp-n">${nDone}/${rs.length}<span class="sr-only"> besproken</span></span></div>` : "";
      const steps = rs.map((r, i) => {
        const s = ss[i], isNext = i === nextI, tag = isNext && r === globalNext;
        const lead = progress ? `<i class="st st-${s}" aria-hidden="true">${s === "done" ? icon("check", "s") : ""}</i>` : `<span class="start-step-ico" aria-hidden="true">${icon(ROUTE_ICON[r] || "info", "s")}</span>`;
        return `<li><a class="start-step${isNext ? " is-next" : ""}" href="#${r}" data-action="go" data-route="${r}">${lead}<span class="start-step-t">${esc(Views[r].title)}</span>${progress ? `<span class="sr-only"> (${this.STATUS_TXT[s]})</span>` : ""}${tag ? `<span class="start-step-tag">Volgende</span>` : ""}</a></li>`;
      }).join("");
      return `<section class="start-grp tone-${this.GROUP_TONE[g.group] || "brand"}${progress && nDone === rs.length ? " is-done" : ""}" aria-labelledby="${id}">
        <div class="start-grp-head"><span class="start-grp-ico" aria-hidden="true">${icon(GROUP_ICON[g.group] || "grid", "l")}</span><div class="start-grp-t"><h2 id="${id}"><a class="start-grp-link" href="#${target}" data-action="go" data-route="${target}">${esc(g.group)}</a></h2><p>${esc(this.GROUP_DESC[g.group] || "")}</p></div></div>
        ${bar}<ul class="start-steps">${steps}</ul></section>`;
    }).join("")}</nav>`;
  },
  /** Compact labeloverzicht: hoofdlabels met hun sublabels. */
  labels(st) {
    const hex = (c) => (/^#[0-9a-f]{3,8}$/i.test(String(c || "")) ? c : "#69797E");
    const all = orderedLabels(st), tops = all.filter((l) => !l.parentId);
    const nSub = all.length - tops.length;
    const link = (l, cls) => `<a class="${cls}" href="#labels" data-action="go" data-route="labels" data-sub="${esc(l.id)}"><span class="color-dot" style="background:${hex(l.color)}" aria-hidden="true"></span>${esc(labelShortName(l))}</a>`;
    return `<section class="card start-lbls" aria-labelledby="start-lbls-h"><div class="start-lbls-head"><h2 id="start-lbls-h" class="start-h3">Labels</h2><span class="start-lbls-n">${plural(tops.length, "label", "labels")}${nSub ? ` · ${plural(nSub, "sublabel", "sublabels")}` : ""}</span><span class="spacer"></span><a class="small" href="#schema" data-action="go" data-route="schema">Schema</a></div>
      <ul class="start-lbl-list">${tops.map((t) => {
        const kids = all.filter((l) => l.parentId === t.id);
        return `<li>${link(t, "start-lbl")}${kids.length ? `<ul class="start-lbl-kids">${kids.map((k) => `<li>${link(k, "start-lbl sub")}</li>`).join("")}</ul>` : ""}</li>`;
      }).join("")}</ul></section>`;
  },
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
    setTimeout(() => { const d = $('#main details[data-acc="start-preparation"]'); if (d) d.open = true; const c = $("#start-meta"); if (c && c.scrollIntoView) c.scrollIntoView({ block: "start", behavior: reducedMotion() ? "auto" : "smooth" }); const k = $('#main [data-bind="st:meta.customer"]'); if (k) k.focus({ preventScroll: true }); }, 60);
  };
  if (!IO.hasContent(S()) && !Store.recovery) go();
  else confirmDialog(`Preset ‘${p.name}’ laden?`, "Het huidige ontwerp (labels, informatietypen, keuzes, beleid en DLP) wordt vervangen. Workshopgegevens blijven behouden. Je kunt dit ongedaan maken met Ctrl+Z.", go, "Laden");
};
Actions["start-presets"] = () => { const c = $("#start-presets"); if (c && c.scrollIntoView) c.scrollIntoView({ block: "start", behavior: reducedMotion() ? "auto" : "smooth" }); const f = $("#start-presets .preset-card"); if (f) f.focus({ preventScroll: true }); };
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
