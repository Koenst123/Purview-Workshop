/* View: Adoptie & impact – persona-heatmap, communicatie en uitrolfasen (Workshop 3) */
const ADOPT_PHASES = [
  { key: "prep", icon: "settings", title: "0 · Voorbereiden", desc: "Tenantvoorwaarden, labels publiceren aan een pilotgroep, key-users trainen, communicatie klaarzetten.", modes: [] },
  { key: "sim", icon: "eye", title: "1 · Simuleren", desc: "DLP- en auto-labelingpolicies in simulatiemodus; 1–2 weken Activity explorer en DLP-alerts bekijken.", modes: ["simulation"] },
  { key: "tips", icon: "bell", title: "2 · Policy tips aan", desc: "Simulatie + policy tips: gebruikers zien meldingen, er wordt nog niet geblokkeerd. Ideaal om de impact te meten.", modes: ["simulationTips"] },
  { key: "enforce", icon: "shield", title: "3 · Handhaven", desc: "Policies aanzetten, gefaseerd per locatie of afdeling (admin units / groepen). Begin met de gevoeligste labels.", modes: ["enable"] },
  { key: "eval", icon: "chart", title: "4 · Evalueren", desc: "Overrides, false positives en incidenten periodiek bespreken; drempels en SIT’s bijstellen.", modes: [] },
];
const ADOPT_NOTES = [["general", "Algemene aandachtspunten"], ["training", "Training & instructie"], ["support", "Servicedesk & ondersteuning"], ["kpi", "Succescriteria / KPI’s"]];
/* Sectorpersona's die met één klik kunnen worden aangevuld (bestaande namen worden overgeslagen). */
const ADOPT_SECTOR_PERSONAS = {
  zorg: [
    { name: "Zorgprofessional (arts/verpleegkundige)", icon: "heart", desc: "Werkt met patiëntgegevens, verwijst naar en communiceert met externe zorgpartners.", touch: ["publish", "marking", "encryption", "dlp_exchange", "dlp_teams", "dlp_endpoint", "dlp_copilot", "meetings"] },
    { name: "Zorgadministratie / declaratie", icon: "table", desc: "Verwerkt polisnummers, AGB-codes en declaraties richting zorgverzekeraars.", touch: ["dlp_exchange", "dlp_sharing", "dlp_endpoint", "autolabel"] },
    { name: "Medisch secretariaat", icon: "mail", desc: "Verstuurt brieven en verwijzingen naar huisartsen en patiënten; plant afspraken.", touch: ["publish", "marking", "encryption", "dlp_exchange", "dlp_endpoint"] },
  ],
  overheid: [
    { name: "Medewerker Burgerzaken", icon: "user", desc: "Werkt met BRP-gegevens, BSN en reisdocumenten; heeft dagelijks contact met inwoners.", touch: ["publish", "marking", "dlp_exchange", "dlp_endpoint", "dlp_copilot"] },
    { name: "Consulent sociaal domein", icon: "heart", desc: "Voert keukentafelgesprekken, maakt beschikkingen Wmo/Jeugd en deelt met zorgaanbieders.", touch: ["encryption", "dlp_exchange", "dlp_teams", "dlp_endpoint", "meetings"] },
    { name: "Handhaver / BOA", icon: "shield", desc: "Werkt mobiel met kentekens, processen-verbaal en foto’s.", touch: ["dlp_endpoint", "dlp_sharing", "marking"] },
    { name: "Raadsgriffie", icon: "book", desc: "Verspreidt raads- en collegestukken, ook geheime stukken met geheimhoudingsplicht.", touch: ["encryption", "publish", "dlp_exchange", "dlp_sharing"] },
  ],
  financieel: [
    { name: "Klantadviseur / relatiebeheerder", icon: "user", desc: "Mailt offertes, polissen en klantdossiers met IBAN en BSN naar klanten en tussenpersonen.", touch: ["publish", "marking", "encryption", "dlp_exchange", "dlp_sharing", "dlp_copilot"] },
    { name: "Backoffice / betalingsverkeer", icon: "table", desc: "Verwerkt betaalbestanden, IBAN’s en creditcardgegevens; werkt met exports uit kernsystemen.", touch: ["dlp_exchange", "dlp_endpoint", "autolabel", "dlp_copilot"] },
    { name: "Compliance officer (Wwft)", icon: "shieldcheck", desc: "Beoordeelt klantonderzoek en meldingen ongebruikelijke transacties; ontvangt DLP-incidenten.", touch: ["notify", "encryption", "dlp_exchange"] },
  ],
};

const AdoptUI = {
  rows() { return CATALOG.boardRows.filter((r) => r.kind === "choice"); },
  designed(l) { return this.rows().some((r) => (Mapping.level(l, r.key) || 0) > 0); },
  cell(p, l) {
    const touch = (p.touch || []).filter((k) => this.rows().some((r) => r.key === k));
    const parts = touch.map((k) => { const c = Mapping.choice(l, k); return { k, c, fr: c ? c.fr : 0 }; });
    const total = sum(parts.map((x) => x.fr));
    const avg = touch.length ? total / touch.length : 0;
    const h = total === 0 ? 0 : avg < 0.5 ? 1 : avg < 1.2 ? 2 : avg < 2 ? 3 : 4;
    return { total, avg, h, parts: parts.filter((x) => x.fr > 0) };
  },
  hot(p, st) {
    const out = [];
    applicableLabels(st).forEach((l) => (p.touch || []).forEach((k) => { const c = Mapping.choice(l, k); if (c && c.fr >= 2) out.push({ l, c, k }); }));
    return out;
  },
  missingSector(st) {
    const have = new Set((st.personas || []).map((p) => String(p.name || "").trim().toLowerCase()));
    return (ADOPT_SECTOR_PERSONAS[st.meta.sector] || []).filter((p) => !have.has(p.name.toLowerCase()));
  },
  phase(st, k) { return ((st.adoption || {}).phases || {})[k] || {}; },
};

Actions["per-add"] = () => {
  let id = "";
  Store.update((st) => { id = uid("per"); st.personas.push({ id, name: "Nieuwe persona", icon: "user", desc: "", touch: [], comms: "", impact: {} }); UI.perOpen = id; });
  setTimeout(() => { const el = document.querySelector(`[data-bind="per:${id}:name"]`); if (el) { el.focus(); el.select && el.select(); el.scrollIntoView({ block: "center" }); } }, 30);
};
Actions["per-sector"] = () => {
  let n = 0;
  Store.update((st) => { AdoptUI.missingSector(st).forEach((p) => { st.personas.push({ id: uid("per"), ...clone(p), comms: "", impact: {} }); n++; }); });
  if (n) Toast.show(`${plural(n, "persona", "persona’s")} toegevoegd.`, "ok");
};
Actions["per-del"] = (el) => confirmDialog("Persona verwijderen?", "De notities bij deze persona gaan verloren.", () => Store.update((st) => { st.personas = st.personas.filter((p) => p.id !== el.dataset.id); }), "Verwijderen", true);
Actions["per-touch"] = (el) => Store.update((st) => {
  const p = byId(st.personas, el.dataset.id); if (!p) return;
  const k = el.dataset.key;
  p.touch = (p.touch || []).includes(k) ? p.touch.filter((x) => x !== k) : [...(p.touch || []), k];
});
Actions["per-open"] = (el) => { UI.perOpen = UI.perOpen === el.dataset.id ? null : el.dataset.id; App.render(); };

registerView("adoption", {
  title: "Adoptie & impact",
  fac: {
    duration: 45,
    goal: "Inzicht in wat het ontwerp betekent voor verschillende groepen medewerkers, en afspraken over communicatie, training en gefaseerde uitrol.",
    questions: ["Welke groep merkt het meest van de maatregelen – en is dat terecht?", "Wat moet een medewerker weten op dag 1?", "Wie is het aanspreekpunt bij een melding of blokkade?"],
    tips: ["Gebruik de heatmap om ‘rode’ combinaties te bespreken: is de impact proportioneel?", "Leg per persona vast wat er verandert en via welk kanaal je communiceert.", "Plan de uitrol in fasen: simulatie → tips → handhaven, met een eigenaar en datum per fase."],
    pitfalls: ["Alles tegelijk handhaven leidt tot veel tickets en workarounds.", "Zonder key-users in de afdelingen blijven labels ongebruikt."],
    links: ["labelsGetStarted", "dlpSimulation", "dlpPlan"],
  },
  done: (st) => (st.personas || []).some((p) => String(p.comms || "").trim()) || Object.values((st.adoption || {}).notes || {}).some((v) => String(v || "").trim()),
  render() {
    const st = S();
    const ls = applicableLabels(st);
    const pers = st.personas || [];
    const lead = "Wat merken medewerkers ervan?";
    if (!ls.length) return pageHead("Workshop 3 · Adoptie", "Adoptie & impact", lead) + VH.needLabels();
    const rows = AdoptUI.rows();
    const des = ls.map((l) => AdoptUI.designed(l));
    const hh = (l, i) => {
      const p = parentOf(l, st);
      return `<th scope="col" class="${des[i] ? "" : "vb-heat-na"}" title="${esc(labelFullName(l, st))}${des[i] ? "" : " – nog niet ontworpen"}"><span class="vb-hh">${p ? `<span class="vb-hh-p">${esc(p.displayName || p.name)}</span>` : ""}<span class="vb-hh-n"><span class="color-dot" style="background:${esc(l.color)}"></span> ${esc(l.displayName || l.name)}</span>${des[i] ? "" : `<span class="vb-hh-p">nog niet ontworpen</span>`}</span></th>`;
    };
    const heat = pers.length ? `<div class="table-wrap vb-heat-wrap" tabindex="0" role="region" aria-label="Heatmap persona’s × labels"><table class="heat vb-heat"><thead><tr><th scope="col"><span class="sr-only">Persona</span></th>${ls.map(hh).join("")}<th scope="col">Totaal</th></tr></thead>
      <tbody>${pers.map((p) => {
        const cells = ls.map((l) => AdoptUI.cell(p, l));
        const tot = sum(cells.map((c) => c.total)), fl = Mapping.frictionLabel(Math.round(tot / Math.max(1, ls.length)));
        return `<tr><th scope="row" class="vb-heat-p" title="${esc(p.desc || "")}">${icon(p.icon || "user", "s")} ${esc(p.name)}</th>${cells.map((c, i) => des[i]
          ? `<td class="h h${c.h}" title="${esc(labelFullName(ls[i], st))}: ${c.parts.length ? esc(c.parts.map((x) => `${(BoardUtil.rowByKey(x.k) || {}).name}: ${x.c.title} (${CATALOG.friction[x.fr]})`).join(" · ")) : "merkt niets"}">${c.total || ""}</td>`
          : `<td class="h vb-h-na" title="${esc(labelFullName(ls[i], st))}: nog niet ontworpen">–</td>`).join("")}<td><span class="badge ${esc(fl.cls)}">${esc(fl.t)}</span></td></tr>`;
      }).join("")}</tbody></table></div>
      <p class="xs muted mt-1 mb-0">0 = merkt niets · 10+ = veel uitleg nodig ${infoTip("Getal = merkbare wijzigingen voor deze rol, gewogen naar hinder. Alle labels tellen mee: persona’s zijn niet aan publicatiegroepen gekoppeld. Een label dat alleen voor één afdeling is gepubliceerd, raakt andere rollen in werkelijkheid niet. Grijs = label beschermt nog niets (nog niet ontworpen).")}</p>`
      : emptyState("users", "Geen persona’s", "Voeg persona’s toe om de impact per doelgroep te bespreken.", `<button class="btn primary" data-action="per-add">${icon("plus", "s")} Persona</button>`);

    const personaCard = (p) => {
      const open = UI.perOpen === p.id, pid = esc(p.id);
      const hot = AdoptUI.hot(p, st);
      const grp = [];
      hot.forEach((x) => { const k = x.k + "|" + x.c.id; let g = grp.find((y) => y.k === k); if (!g) grp.push((g = { k, row: BoardUtil.rowByKey(x.k) || { name: x.k }, c: x.c, ls: [] })); g.ls.push(labelFullName(x.l, st)); });
      const chip = (g) => `<span class="chip sm" title="${esc(g.c.desc)} – ${esc(g.ls.join(", "))}">${esc(g.row.name)}: ${esc(g.c.title)}${g.ls.length > 1 ? ` <span class="muted">×${g.ls.length}</span>` : ""}</span>`;
      const hasComms = String(p.comms || "").trim().length > 0;
      return `<div class="card flat mb-1 vb-per"><div class="row tight vb-per-head">${icon(p.icon || "user")}<b class="vb-sum-title" title="${esc(p.desc || "")}">${esc(p.name)}</b>${grp.length ? `<span class="badge warn" title="${esc(grp.map((g) => `${g.row.name}: ${g.c.title}`).join(" · "))}">${plural(grp.length, "impactpunt", "impactpunten")}</span>` : `<span class="badge neutral">Weinig impact</span>`}
          <button class="btn small subtle" data-action="per-open" data-id="${pid}" aria-expanded="${open}">${icon(open ? "chevrondown" : "edit", "s")} ${open ? "Klaar" : "Bewerken"}</button><button class="btn small subtle" data-action="per-del" data-id="${pid}" title="Verwijderen" aria-label="Persona ${esc(p.name)} verwijderen">${icon("trash", "s")}</button></div>
        ${open ? `<div class="mt-1 vb-per-edit"><div class="grid grid-2">${F.text(`per:${p.id}:name`, "Naam", { render: true })}${F.text(`per:${p.id}:desc`, "Omschrijving", { render: true })}</div>
          ${grp.length ? `<div class="chip-list mb-1">${grp.map(chip).join("")}</div>` : ""}
          <div class="field-label">Raakt deze domeinen ${infoTip("Bepaalt welke keuzes van het ontwerpbord meetellen in de impact voor deze persona.")}</div><div class="chip-list mb-1">${rows.map((r) => `<button class="chip sm${(p.touch || []).includes(r.key) ? " on" : ""}" style="cursor:pointer" data-action="per-touch" data-id="${pid}" data-key="${esc(r.key)}" aria-pressed="${(p.touch || []).includes(r.key)}">${icon(r.icon, "s")}${esc(r.name)}</button>`).join("")}</div>
          ${F.select(`per:${p.id}:impact.level`, "Verwachte impact", CATALOG.friction.map((t, i) => [String(i), t]))}</div>` : ""}
        <details class="vb-mini mt-1" data-acc="ad-comms-${pid}"${hasComms ? " open" : ""}><summary>${icon(hasComms ? "check" : "mail", "s")} Communicatie${hasComms ? "" : `<span class="sr-only"> (nog leeg)</span>`}</summary>
          ${F.textarea(`per:${p.id}:comms`, "Wat verandert er & hoe communiceren we?", { rows: 2, ph: "Bijv. e-learning labelen, intranetbericht, instructie bij eerste policy tip…" })}</details></div>`;
    };

    const g = Generator.all(st);
    const modeCount = (modes) => g.dlpPolicies.filter((p) => modes.includes(p.mode)).length + g.autoPolicies.filter((p) => modes.includes(p.mode === "enable" ? "enable" : "simulation")).length;
    const dateIn = (k, f, label) => { const id = `adp-${k}-${f}`, v = AdoptUI.phase(st, k)[f] || ""; return `<div class="field mb-0"><label for="${id}">${label}</label><input id="${id}" class="input" type="date" data-bind="st:adoption.phases.${esc(k)}.${f}" value="${esc(v)}"></div>`; };
    const phases = `<div class="vb-phases">${ADOPT_PHASES.map((ph) => {
      const pv = AdoptUI.phase(st, ph.key);
      const late = pv.due && pv.start && pv.due < pv.start;
      return `<div class="card flat vb-phase"><div class="row tight">${icon(ph.icon, "s")}<b>${esc(ph.title)}</b>${infoTip(ph.desc)}<span class="spacer"></span>${ph.modes.length ? `<span class="badge neutral" title="Policies in deze modus">${modeCount(ph.modes)}</span>` : ""}</div>
        ${F.text(`st:adoption.phases.${ph.key}.owner`, "Eigenaar", { ph: "Rol of naam" })}
        <div class="vb-phase-dates">${dateIn(ph.key, "start", "Start")}${dateIn(ph.key, "due", "Streefdatum")}</div>
        ${late ? `<div class="xs" style="color:var(--warn)">Streefdatum ligt vóór de start.</div>` : ""}</div>`;
    }).join("")}</div>`;

    const frictionLabels = ls.map((l) => ({ l, f: Mapping.friction(l) })).sort((a, b) => b.f - a.f);
    const lblTable = `<div class="table-wrap"><table class="table vb-fr-table"><thead><tr><th>Label · merkbaar voor de gebruiker</th><th>Impact</th></tr></thead><tbody>${frictionLabels.map(({ l, f }) => {
      const fl = Mapping.frictionLabel(f);
      const vis = rows.map((r) => Mapping.choice(l, r.key)).filter((c) => c && c.fr > 0).map((c) => c.title);
      return `<tr><td>${labelPill(l, st)}<div class="xs mt-1">${vis.length ? VH.clamp(`<span class="muted">${esc(vis.join(" · "))}</span>`, vis.join(" · ").length, 2, 90) : `<span class="muted">${AdoptUI.designed(l) ? "Niets merkbaars" : "Nog niet ontworpen"}</span>`}</div></td><td><span class="badge ${esc(fl.cls)}">${esc(fl.t)}</span></td></tr>`;
    }).join("")}</tbody></table></div>`;
    const notesFilled = ADOPT_NOTES.filter(([k]) => String(((st.adoption || {}).notes || {})[k] || "").trim()).length;
    const miss = AdoptUI.missingSector(st);
    const more = `<p>De heatmap telt per persona en label de impact op van de keuzes op het ontwerpbord, in de domeinen die die persona raakt (0 = niets merkbaar). Beweeg over een cel voor details.</p><p>Leg per persona vast wat er verandert en hoe je communiceert, en plan de uitrol in fasen: simuleren → policy tips → handhaven, met een eigenaar en datum per fase.</p>`;

    return VH.wrap(`${pageHead("Workshop 3 · Adoptie", "Adoptie & impact", lead, `<button class="btn" data-action="go" data-route="scenarios">${icon("play", "s")} Scenario’s</button>`, more)}
      <h3 class="section-title">${icon("users", "s")} Impact per persona × label ${infoTip("Opgetelde impact van de keuzes op het ontwerpbord in de domeinen die de persona raakt. Leeg = niets merkbaar; donkerder = meer impact.")}</h3>
      <div class="card mb-2" style="padding:12px">${heat}</div>
      <div class="split wide-left vb-split">
        <div><div class="row between"><h3 class="section-title">${icon("user", "s")} Persona’s & communicatie</h3><div class="row tight">${miss.length ? `<button class="btn small subtle" data-action="per-sector" title="${esc(miss.map((p) => p.name).join(", "))}">${icon("plus", "s")} ${plural(miss.length, "sectorpersona", "sectorpersona’s")}</button>` : ""}<button class="btn small" data-action="per-add">${icon("plus", "s")} Persona</button></div></div>${pers.map(personaCard).join("")}</div>
        <div><h3 class="section-title">${icon("tag", "s")} Impact per label</h3>${lblTable}
          <div class="mt-2">${accordion("ad-notes", `${icon("edit", "s")} Afspraken <span class="xs muted">· ${notesFilled}/${ADOPT_NOTES.length} ingevuld</span>`, ADOPT_NOTES.map(([k, t]) => F.textarea(`st:adoption.notes.${k}`, t, { rows: 2 })).join(""), notesFilled > 0)}</div></div>
      </div>
      <h3 class="section-title mt-3">${icon("route", "s")} Gefaseerde uitrol ${infoTip("Eigenaar en data per fase komen in het ontwerpdocument en de Excel-export.")}</h3>${phases}
      <p class="small muted mt-1">${learn("dlpSimulation", "DLP-simulatiemodus")} ${learn("labelsGetStarted", "Aan de slag met sensitivity labels")}</p>`);
  },
});
