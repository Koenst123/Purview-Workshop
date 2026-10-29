/* View: Integraal Ontwerpbord – labels (kolommen) × maatregeldomeinen (rijen) met keuzekaarten */
const LV_NAMES = CATALOG.levels.map((x) => x.name);
const SCOPE_SHORT = { files: "Files", emails: "Emails", meetings: "Meetings", sites: "Groups & sites" };
const ROW_LEARN = { recognition: ["sitDefinitions"], scope: ["labelsCreate"], publish: ["labelsCreate", "labelsOffice"], autolabel: ["labelsAuto"], marking: ["labelsCreate"], encryption: ["labelsEncryption", "usageRights"], container: ["labelsContainers"], meetings: ["labelsMeetings"], dlp_exchange: ["dlpCreate", "dlpLabelCondition"], dlp_sharing: ["dlpCreate", "dlpLabelCondition"], dlp_teams: ["dlpTeams"], dlp_endpoint: ["endpoint", "endpointUsing"], dlp_copilot: ["dlpCopilot"], dlp_fabric: ["dlpFabric"], dlp_onprem: ["dlpOnprem"], dlp_instances: ["dlpInstances"], notify: ["dlpTips", "dlpAlerts"] };

const BoardUtil = {
  QUIET: { dlp_exchange: "mail naar buiten", dlp_sharing: "delen met externen", dlp_teams: "Teams-chat met externen", dlp_endpoint: "USB, printen en uploaden", dlp_copilot: "Copilot", dlp_onprem: "de fileserver", dlp_instances: "gekoppelde cloud-apps" },
  rows(st = S()) {
    const ls = applicableLabels(st);
    return CATALOG.boardRows.filter((r) => !r.optional || UI.boardOptional || ls.some((l) => l.choices[r.key] && !/-off$/.test(l.choices[r.key])));
  },
  rowByKey(k) { return CATALOG.boardRows.find((r) => r.key === k); },
  frDots(fr) { return `<span title="Wat merkt de medewerker: ${["niets", "weinig", "merkbaar", "veel"][fr] || fr}" style="letter-spacing:-1px;color:var(--fg3);font-size:9px">${"●".repeat(fr)}${"○".repeat(3 - fr)}</span>`; },
  choiceCard(c, o = {}) {
    const drag = o.drag !== false ? ` data-drag="choice" data-payload='${attr({ choiceId: c.id })}' data-tap="1" data-pick-label="${esc(c.title)}"` : "";
    const act = o.action ? ` data-action="${o.action}"${o.attrs || ""}` : "";
    if (o.mini) return `<div class="choice mini lv-${c.lv}"${drag} title="${esc(c.title + " – " + c.desc + " (" + (LV_NAMES[c.lv] || "") + ")")}" tabindex="0">${icon(c.icon || "check", "s")}<span>${esc(c.title)}</span></div>`;
    return `<div class="choice lv-${c.lv}${o.on ? " on" : ""}"${drag}${act} style="position:relative" title="${esc(c.desc)}" tabindex="0">
      <div class="ch-title">${icon(c.icon || "check", "s")}<span>${esc(c.title)}</span></div>
      ${o.desc && c.user ? `<div class="ch-user"><b>Wat merkt de medewerker:</b> ${esc(c.user)}</div>` : ""}
      ${o.desc ? `<div class="ch-sub">${esc(c.desc)}</div>` : ""}
      <div class="row tight mt-1" title="Niveau: ${esc(LV_NAMES[c.lv] || "")}"><span class="sr-only">Niveau: ${esc(LV_NAMES[c.lv] || "")}</span>${this.frDots(c.fr)}${c.lic ? this.lic(c.lic) : ""}</div>
    </div>`;
  },
  /** Licentiebadge; Teams Premium expliciet als extra licentie (zit niet in E5). */
  lic(key) {
    const keys = Array.isArray(key) ? key : [key];
    return keys.map((k) => k === "teamsPremium" ? `<span class="badge lic warn-lic" title="${esc((CATALOG.licensing.teamsPremium || {}).detail || "")}">Extra licentie: Teams Premium (niet in E5)</span>` : licBadge(k)).join(" ");
  },
  needsPremium(c) { return !!c && [].concat(c.lic || []).includes("teamsPremium"); },
  /** Keuzes van een ander label overnemen door de kaarten opnieuw toe te passen (teksten volgen de eigen labelnaam). */
  copyChoices(st, fromId, toId) {
    const src = labelById(fromId, st), dst = labelById(toId, st);
    if (!src || !dst || hasChildren(dst, st)) return { n: 0, custom: 0 };
    dst.cfg.scope = clone(src.cfg.scope);
    let n = 0;
    CATALOG.boardRows.filter((r) => r.kind === "choice").forEach((r) => { const c = src.choices && src.choices[r.key]; if (c && Mapping.apply(st, dst.id, c)) n++; });
    if (src.profile) dst.profile = src.profile;
    if (typeof syncParentPublish === "function") syncParentPublish(st);
    return { n, custom: Object.keys(src.custom || {}).length };
  },
  /** Doelgroepen die automatisch voor een label zijn gemaakt en nergens meer gebruikt worden, opruimen. */
  pruneGroups(st) {
    const used = new Set();
    st.labels.forEach((l) => {
      (l.cfg.publish.groups || []).forEach((g) => used.add(g));
      ((l.cfg.encryption || {}).permissions || []).forEach((p) => p.groupId && used.add(p.groupId));
    });
    (st.labelPolicies || []).filter((p) => !p.auto).forEach((p) => (p.groups || []).forEach((g) => used.add(g)));
    st.groups = st.groups.filter((g) => !g.forLabel || used.has(g.id));
    Generator.ensureGroupPolicies(st);
  },
  /** Openstaande punten na een profiel/keuze: knoppen naar de plek waar je ze invult. */
  todo(l, st = S()) {
    const out = [];
    const pubG = l.cfg.publish.audience === "groups" ? (l.cfg.publish.groups || []).map((g) => byId(st.groups, g)).filter(Boolean) : [];
    const encG = ((l.cfg.encryption || {}).permissions || []).map((p) => p.groupId && byId(st.groups, p.groupId)).filter(Boolean);
    if ([...pubG, ...encG].some((g) => g.kind !== "domain" && !g.value)) out.push(`<button class="link-btn" data-action="go" data-route="policies">groep invullen</button>`);
    if (encG.some((g) => g.kind === "domain" && !g.value)) out.push(`<button class="link-btn" data-action="go" data-route="policies">partnerdomein invullen</button>`);
    const al = l.choices.autolabel;
    if (al && al !== "al-manual" && !labelSits(l, st).length) out.push(`<button class="link-btn" data-action="board-sits" data-id="${esc(l.id)}">informatietypen koppelen</button>`);
    return out;
  },
  todoToast(labelId, head) {
    const l = labelById(labelId);
    if (!l) return;
    const t = this.todo(l);
    Toast.show(`${head}${t.length ? `<div class="mt-1">Nog te doen: ${t.join(" · ")}</div>` : ""}`, t.length ? "warn" : "ok", t.length ? 8000 : 3200);
  },
  monoMap(st = S()) { const m = {}; Mapping.monotonicIssues(st).forEach((x) => (m[x.label.id + "|" + x.domain] = x)); return m; },
  needsScope(l, key) {
    const s = l.cfg.scope;
    if (key === "container") return !s.sites;
    if (key === "meetings") return !s.meetings;
    if (key === "marking" || key === "encryption" || key === "autolabel") return !s.files && !s.emails;
    return false;
  },
  cell(l, r, st, mono) {
    const tgt = attr({ labelId: l.id, domain: r.key });
    if (r.kind === "sits") {
      const s = labelSits(l, st);
      const nm = esc(labelFullName(l, st));
      const par = parentOf(l, st), lost = par ? strandedSits(par, st) : [];
      // Koppelingen op het hoofdlabel horen niet bij dit sublabel (geen overerving in Purview); wel melden, zodat bord en validatie hetzelfde zeggen.
      const warn = lost.length ? `<button type="button" class="cell-flag err" data-action="board-sits" data-id="${esc(par.id)}" title="${esc(`Hoofdlabel ‘${labelShortName(par)}’ heeft ${lost.length} informatietype${lost.length === 1 ? "" : "n"} zonder effect (${lost.map((x) => x.name).join(", ")}). Verplaats ze naar een sublabel.`)}">${icon("warning", "s")} ${lost.length} op hoofdlabel</button>` : "";
      return `<td class="cell" data-drop="sit" data-zone="sit-to-label" data-target='${attr({ labelId: l.id })}'><div class="sit-chips">${s.length ? `<button class="sit-open" data-action="board-sits" data-id="${esc(l.id)}" title="Informatietypen van ${nm} bekijken of wijzigen" aria-label="Informatietypen van ${nm} bekijken">${s.slice(0, 3).map((x) => ((h) => h.includes(`title="${esc(x.name)}`) ? h : h.replace('title="', `title="${esc(x.name)} · `))(VH.sitChip(x))).join("")}${s.length > 3 ? `<span class="chip sm sit-more" title="${esc(s.slice(3).map((x) => x.name).join(", "))}">+${s.length - 3} meer</span>` : ""}</button>` : `<button class="cell-empty" data-action="board-sits" data-id="${esc(l.id)}" title="Informatietypen koppelen" aria-label="Informatietypen koppelen aan ${nm}"><span class="ce-dash">–</span><span class="ce-add">${icon("plus", "s")} SIT’s</span></button>`}${warn}</div></td>`;
    }
    if (r.kind === "scope") {
      return `<td class="cell"><div class="scope-toggles">${CATALOG.labelScopes.map((x) => `<button class="${l.cfg.scope[x.key] ? "on" : ""}" data-action="board-scope" data-id="${esc(l.id)}" data-key="${esc(x.key)}" title="${esc(x.name)}${x.requires && x.requires.length ? " (vereist Files en Emails)" : ""}" aria-pressed="${l.cfg.scope[x.key] ? "true" : "false"}">${esc(SCOPE_SHORT[x.key] || x.name)}</button>`).join("")}</div></td>`;
    }
    const c = Mapping.choice(l, r.key);
    const cust = Mapping.isCustom(l, r.key);
    const m = mono[l.id + "|" + r.key];
    const na = !c && this.needsScope(l, r.key);
    const flags = [cust ? `<span class="cell-flag" title="Handmatig aangepast in de detail-editor – wijkt af van de kaart.">aangepast</span>` : "", m ? `<span class="cell-flag err" title="Minder streng (${LV_NAMES[m.lv]}) dan het minder gevoelige label ‘${esc(labelFullName(m.lower, st))}’ (${LV_NAMES[m.maxLv]}).">↓ ${esc(LV_NAMES[m.lv])}</span>` : ""].join("");
    const inner = c
      ? `<div class="choice lv-${c.lv}" title="${esc(Mapping.summary(l, r.key, st))}"><div class="ch-title">${icon(c.icon || "check", "s")}<span>${esc(c.title)}</span></div><div class="ch-sub ellipsis">${esc(LV_NAMES[c.lv])}</div>${flags ? `<div class="ch-flags">${flags}</div>` : ""}</div>`
      : cust ? `<div class="cell-empty">${flags}</div>` : `<div class="cell-empty" title="${na ? "Scope van het label staat uit – een keuze zet de scope aan." : "Nog niet gekozen – sleep een kaart hierheen of klik om te kiezen"}">${na ? `<span class="xs">scope uit</span>` : `<span class="ce-dash">–</span><span class="ce-add">${icon("plus", "s")} kiezen</span>`}</div>`;
    const sel = UI.boardCell && UI.boardCell.id === l.id && UI.boardCell.dom === r.key;
    return `<td class="cell${na ? " na" : ""}${sel ? " is-sel" : ""}" data-drop="choice" data-zone="board-cell" data-target='${tgt}' data-action="board-cell" data-id="${esc(l.id)}" data-dom="${esc(r.key)}">${inner}</td>`;
  },
};

/* ---------- Keuzeoverzicht (ook gebruikt in export en document) ---------- */
const Keuzeoverzicht = {
  table(st = S(), o = {}) {
    const ls = applicableLabels(st);
    if (!ls.length) return `<p class="muted">Nog geen labels.</p>`;
    const rows = CATALOG.boardRows.filter((r) => !r.optional || ls.some((l) => l.choices[r.key] && !/-off$/.test(l.choices[r.key])));
    const cellTxt = (l, r) => {
      if (r.kind === "sits") { const s = labelSits(l, st); return s.length ? esc(s.map((x) => x.name).join(", ")) : `<span class="muted">–</span>`; }
      if (r.kind === "scope") return esc(CATALOG.labelScopes.filter((x) => l.cfg.scope[x.key]).map((x) => SCOPE_SHORT[x.key] || x.name).join(", ") || "–");
      const c = Mapping.choice(l, r.key);
      if (!c) return Mapping.isCustom(l, r.key) ? "<i>Maatwerk</i>" : `<span class="muted">–</span>`;
      return `<span class="lvchip lv-${c.lv}"${o.print ? "" : ` style="border-left:3px solid var(--lvc);padding:0 4px;background:var(--lvbg);border-radius:3px"`}>${esc(c.title)}</span>${Mapping.isCustom(l, r.key) ? " <i>(aangepast)</i>" : ""}`;
    };
    let html = `<table class="${o.print ? "board-print" : "table"}"><thead><tr><th>Domein</th>${ls.map((l) => `<th><span class="color-dot" style="background:${esc(l.color)}"></span> ${esc(labelFullName(l, st))}</th>`).join("")}</tr></thead><tbody>`;
    CATALOG.boardGroups.forEach((g) => {
      const gr = rows.filter((r) => r.group === g.key);
      if (!gr.length) return;
      html += `<tr><th colspan="${ls.length + 1}" style="background:var(--surface2)">${esc(g.name)}</th></tr>`;
      gr.forEach((r) => (html += `<tr><th>${esc(r.name)}<div class="xs muted">${esc(r.sub || "")}</div></th>${ls.map((l) => `<td>${cellTxt(l, r)}</td>`).join("")}</tr>`));
    });
    html += `<tr><th>Wat merkt de medewerker</th>${ls.map((l) => { const f = Mapping.frictionLabel(Mapping.friction(l)); return `<td><span class="badge ${f.cls}">${f.t}</span></td>`; }).join("")}</tr></tbody></table>`;
    return html;
  },
  policies(st = S()) {
    const g = Generator.all(st);
    const lp = g.labelPolicies.map((p) => `<tr><td>Labelbeleid</td><td><b>${esc(p.name)}</b></td><td>${esc(p.scopeText || "")}</td><td>${esc(p.labels.map((l) => labelFullName(l, st)).join(", "))}</td></tr>`).join("");
    const al = g.autoPolicies.map((p) => `<tr><td>Auto-labeling</td><td><b>${esc(p.name)}</b></td><td>${esc(p.locations.join(", "))} · ${esc(p.mode)}</td><td>${esc(labelFullName(p.label, st))}</td></tr>`).join("");
    const dp = g.dlpPolicies.map((p) => `<tr><td>DLP</td><td><b>${esc(p.name)}</b></td><td>${esc(p.locations.map((k) => VH.loc(k).name).join(", "))} · ${esc(VH.modeName(p.mode))}</td><td>${p.rules.length} regel(s)</td></tr>`).join("");
    return `<table class="table"><thead><tr><th>Soort</th><th>Naam</th><th>Scope / locaties</th><th>Inhoud</th></tr></thead><tbody>${lp}${al}${dp}</tbody></table>`;
  },
  /** Gewone-taal-samenvatting per label: wat merken medewerkers? → [{labelId, name, lines[], empty}] */
  plainSummary(st = S()) {
    const rows = CATALOG.boardRows.filter((r) => r.kind === "choice");
    return applicableLabels(st).map((l) => {
      const cs = rows.map((r) => ({ r, c: Mapping.choice(l, r.key) })).filter((x) => x.c && x.c.user && !(x.r.optional && /-off$/.test(x.c.id)));
      const quiet = [], lines = [];
      cs.forEach((x) => {
        if (x.c.id === "al-manual" && cs.some((y) => y.r.key === "publish")) return;
        if (!(x.r.key === "publish" || x.r.key === "autolabel" || x.c.lv > 0)) return;
        if (/^Je merkt niets/.test(x.c.user) && BoardUtil.QUIET[x.r.key]) quiet.push(BoardUtil.QUIET[x.r.key]);
        else lines.push(x.c.user);
      });
      if (quiet.length) lines.push(`Je merkt niets van DLP bij ${quiet.length > 1 ? quiet.slice(0, -1).join(", ") + " en " + quiet[quiet.length - 1] : quiet[0]}; dat wordt alleen geregistreerd.`);
      if (cs.length && !cs.some((x) => x.c.lv > 0 && x.r.key !== "publish" && x.r.key !== "autolabel")) lines.push("Verder merk je niets: openen, mailen en delen gaan zoals altijd.");
      return { labelId: l.id, name: labelFullName(l, st), color: l.color, lines: unique(lines), empty: !cs.length };
    });
  },
  plainHtml(st = S()) {
    const ps = this.plainSummary(st);
    if (!ps.length) return "";
    return `<div class="plain-sum">${ps.map((p) => `<div class="ps-col" style="--lc:${esc(p.color)}"><div class="ps-name"><span class="color-dot" style="background:${esc(p.color)}"></span>${esc(p.name)}</div>${p.empty ? `<p class="xs muted">Nog geen maatregelen gekozen</p>` : `<ul>${p.lines.slice(0, 5).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>${p.lines.length > 5 ? `<details class="ps-more"><summary class="xs">+${p.lines.length - 5} meer</summary><ul>${p.lines.slice(5).map((x) => `<li>${esc(x)}</li>`).join("")}</ul></details>` : ""}`}</div>`).join("")}</div>`;
  },
  open() {
    Modal.open({
      title: "Keuzeoverzicht", wide: true,
      body: () => `<div class="section-title">In het kort – wat merken medewerkers?</div>${this.plainHtml(S())}<details class="acc mt-2 tech-only" data-acc="kz-table"><summary>Alle keuzes per label (technisch)</summary><div class="acc-body"><div class="table-wrap">${this.table(S())}</div></div></details><details class="acc mt-1 tech-only" data-acc="kz-pol"><summary>Resulterend beleid in Purview</summary><div class="acc-body"><div class="table-wrap">${this.policies(S())}</div></div></details>`,
      buttons: [{ label: "Afdrukken / PDF", primary: true, fn: () => { DocExport.print({ only: "keuzes" }); return true; } }, { label: "Sluiten" }],
    });
  },
};

/* ---------- Detail-drawer per cel ---------- */
const BoardDrawer = {
  mark() {
    const c = UI.boardCell;
    document.querySelectorAll(".lb-board .board td.cell.is-sel").forEach((td) => { if (!c || td.dataset.id !== c.id || td.dataset.dom !== c.dom) td.classList.remove("is-sel"); });
    if (c) document.querySelectorAll(".lb-board .board td.cell").forEach((td) => { if (td.dataset.id === c.id && td.dataset.dom === c.dom) td.classList.add("is-sel"); });
  },
  open(labelId, dom) {
    const row = BoardUtil.rowByKey(dom);
    UI.boardCell = { id: labelId, dom };
    this.mark();
    Drawer.open({
      icon: row.icon,
      onClose: () => { UI.boardCell = null; BoardDrawer.mark(); },
      title: () => { const l = labelById(labelId); return l ? `${row.name} · ${labelFullName(l)}` : row.name; },
      render: () => {
        const st = S();
        const l = labelById(labelId, st);
        if (!l) return null;
        const cur = Mapping.choice(l, dom);
        const cust = Mapping.isCustom(l, dom);
        const cards = CATALOG.choicesFor(dom).map((c) => BoardUtil.choiceCard(c, { on: cur && cur.id === c.id, drag: false, desc: true, action: "board-choose", attrs: ` data-id="${esc(l.id)}" data-choice="${esc(c.id)}"` })).join("");
        let exact = "";
        if (row.dlp) {
          const r = Generator.ruleFor(l, row.dlp, st);
          if (r && r.effective) {
            exact = VH.ruleCard(r, st, { full: true });
            if (row.dlp === "endpoint" && r.actions.endpoint && r.actions.endpoint.length) exact += `<table class="table mt-1"><thead><tr><th>Activiteit</th><th>Actie</th></tr></thead><tbody>${r.actions.endpoint.map((a) => { const ea = CATALOG.endpointActivities.find((x) => x.key === a.key); return `<tr><td>${esc(ea ? ea.name : a.key)}</td><td>${levelChip(a.level || 0, a.value)}</td></tr>`; }).join("")}</tbody></table>`;
          } else exact = `<p class="small muted">Geen DLP-regel voor dit label op deze locatie.</p>`;
          const pol = Generator.all(st).dlpPolicies.find((p) => p.rules.some((x) => x.label && x.label.id === l.id && x.domain === row.dlp));
          if (pol) exact += `<p class="xs muted mt-1">Onderdeel van policy <b>${esc(pol.name)}</b> (${esc(VH.modeName(pol.mode))}).</p>`;
        } else {
          exact = VH.kv([["Resultaat", esc(Mapping.summary(l, dom, st))]]);
        }
        if (dom === "notify") exact = VH.kv([["Resultaat", esc(Mapping.summary(l, dom, st))]]) + `<p class="xs muted">Geldt voor alle DLP-regels die voor dit label worden gegenereerd.</p>`;
        return `<p class="small muted">${esc(row.desc)}</p>
          ${hasChildren(l, st) ? msg("warn", "Parent-label: niet zelf toepasbaar. Kies instellingen op de sublabels.") : ""}
          ${cust ? msg("warn", `Instellingen zijn handmatig aangepast in de detail-editor. <button class="btn small" data-action="board-reset-custom" data-id="${esc(l.id)}" data-dom="${esc(dom)}">Terug naar kaart</button>`) : ""}
          ${row.lic ? `<div class="mb-1">${BoardUtil.lic(row.lic)}</div>` : ""}
          <div class="choice-palette">${cards}</div>
          <div class="section-title mt-2">${icon("code", "s")} Exact in Purview</div>${exact}
          <div class="row tight mt-2">${(ROW_LEARN[dom] || []).map((k) => learn(k)).join(" ")}</div>`;
      },
      foot: () => `<button class="btn subtle" data-action="board-clear" data-id="${esc(labelId)}" data-dom="${esc(dom)}">${icon("trash", "s")} Leegmaken</button><span class="spacer"></span><button class="btn primary" data-action="board-detail" data-id="${esc(labelId)}" data-dom="${esc(dom)}">${icon("settings", "s")} Open detail-editor</button>`,
    });
  },
};

function _choiceFits(c, dom) { return c && c.d === dom; }
DnD.accept["board-cell"] = DnD.accept["board-row"] = (type, p, t) => type !== "choice" || !p || !t || _choiceFits(CATALOG.choiceById[p.choiceId], t.domain);
/** Feedback bij een kaart op de verkeerde rij: DnD.accept weigert die drop stil, dus melden we het hier. */
function _wrongRowToast(c) { const r = c && BoardUtil.rowByKey(c.d); if (c) Toast.show(`‘${esc(c.title)}’ hoort bij de rij <b>${esc(r ? r.name : c.d)}</b>. Sleep de kaart naar die rij.`, "warn"); }
window.addEventListener("pointerup", (e) => {
  const d = DnD.drag;
  if (!d || !d.started || d.type !== "choice" || !d.payload || UI.route !== "board") return;
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const z = el && el.closest('[data-zone="board-cell"], [data-zone="board-row"]');
  if (z && !DnD._accepts(z, d.type, d.payload)) _wrongRowToast(CATALOG.choiceById[d.payload.choiceId]);
}, true);
DnD.register("board-cell", (type, p, t) => {
  const c = CATALOG.choiceById[p.choiceId];
  if (!_choiceFits(c, t.domain)) { const r = BoardUtil.rowByKey(c.d); Toast.show(`‘${esc(c.title)}’ hoort bij de rij <b>${esc(r ? r.name : c.d)}</b>.`, "warn"); return; }
  _boardApply(t.labelId, c.id);
});
/** Eén keuze toepassen met de nodige tussenstappen: Teams Premium bevestigen, doelgroep kiezen bij ‘Alleen specifieke groep(en)’. */
function _boardApply(labelId, choiceId, skipPremium) {
  const c = CATALOG.choiceById[choiceId];
  const l = labelById(labelId);
  if (!c || !l) return;
  if (hasChildren(l, S())) { Toast.show("Dit label heeft sublabels en kan zelf niet worden toegepast.", "warn"); return; }
  if (!skipPremium && BoardUtil.needsPremium(c) && l.choices[c.d] !== c.id) {
    confirmDialog("Teams Premium nodig", `‘${esc(c.title)}’ werkt alleen met een <b>Teams Premium</b>-licentie; die zit niet in Microsoft 365 E5. Zonder die licentie kies je ‘Alleen labelen’.`, () => _boardApply(labelId, choiceId, true), "Toch kiezen");
    return;
  }
  if (c.id === "pub-groups") { _groupChooser(labelId); return; }
  Store.update((st) => {
    Mapping.apply(st, labelId, c.id);
    if (c.d === "publish") { if (typeof syncParentPublish === "function") syncParentPublish(st); BoardUtil.pruneGroups(st); }
  });
}
/** Doelgroep(en) kiezen voor een label dat alleen voor een groep wordt gepubliceerd. */
function _groupChooser(labelId) {
  const st = S();
  const l = labelById(labelId, st);
  const own = st.groups.find((g) => g.forLabel === l.id);
  const others = st.groups.filter((g) => g.kind !== "domain" && g !== own);
  const cur = l.cfg.publish.audience === "groups" ? l.cfg.publish.groups || [] : [];
  if (!others.length) { Store.update((s) => { Mapping.apply(s, labelId, "pub-groups"); if (typeof syncParentPublish === "function") syncParentPublish(s); }); BoardUtil.todoToast(labelId, `‘${esc(labelFullName(l))}’ is alleen voor een eigen doelgroep.`); return; }
  const row = (id, name, sub, on) => `<label class="check-row"><input type="checkbox" value="${esc(id)}"${on ? " checked" : ""}><span><b>${esc(name)}</b>${sub ? ` <span class="xs muted">${esc(sub)}</span>` : ""}</span></label>`;
  Modal.open({
    title: `Voor wie is ‘${esc(labelFullName(l, st))}’?`,
    body: `<p class="small muted mb-1">Alleen leden van de gekozen groep(en) zien dit label.</p><div class="grp-pick">${others.map((g) => row(g.id, g.name.replace(/^Doelgroep – /, ""), g.value || "groep nog invullen", cur.includes(g.id))).join("")}${row("__new", "+ Nieuwe doelgroep", `Doelgroep – ${labelFullName(l, st)}`, !cur.length || (own && cur.includes(own.id)))}</div>`,
    buttons: [{ label: "Annuleren" }, { label: "Opslaan", primary: true, fn: (m) => {
      const ids = $$("input:checked", m).map((x) => x.value);
      if (!ids.length) { Toast.show("Kies minstens één groep.", "warn"); return true; }
      Store.update((s) => {
        Mapping.apply(s, labelId, "pub-groups");
        const x = labelById(labelId, s);
        const g = ids.filter((i) => i !== "__new");
        if (ids.includes("__new")) g.push(x.cfg.publish.groups[0]);
        x.cfg.publish = { audience: "groups", groups: unique(g) };
        if (typeof syncParentPublish === "function") syncParentPublish(s);
        BoardUtil.pruneGroups(s);
      });
      BoardUtil.todoToast(labelId, `Doelgroep ingesteld voor ‘${esc(labelFullName(labelById(labelId)))}’.`);
    } }],
  });
}
DnD.register("board-row", (type, p, t) => {
  const c = CATALOG.choiceById[p.choiceId];
  if (!_choiceFits(c, t.domain)) { Toast.show(`Deze kaart hoort niet bij deze rij.`, "warn"); return; }
  confirmDialog(`‘${c.title}’ op alle labels toepassen?`, `Overschrijft de keuze in deze rij voor alle toepasbare labels.${BoardUtil.needsPremium(c) ? " <b>Let op:</b> vereist een Teams Premium-licentie (niet in E5)." : ""}`, () => {
    let n = 0;
    Store.update((st) => { n = Mapping.applyRow(st, t.domain, c.id); if (c.d === "publish") { if (typeof syncParentPublish === "function") syncParentPublish(st); BoardUtil.pruneGroups(st); } });
    Toast.show(`${n} label(s) bijgewerkt.`, "ok");
  }, "Toepassen");
});
DnD.register("board-profile", (type, p, t) => _boardProfile(t.labelId, p.profileId));
function _boardProfile(labelId, profileId) {
  let ok = false;
  Store.update((st) => { ok = Mapping.applyProfile(st, labelId, profileId); if (ok) { if (typeof syncParentPublish === "function") syncParentPublish(st); BoardUtil.pruneGroups(st); } });
  const pf = CATALOG.profiles.find((x) => x.id === profileId);
  if (ok) BoardUtil.todoToast(labelId, `Profiel <b>${esc(pf.name)}</b> toegepast op ${esc(labelFullName(labelById(labelId)))}.`);
  else Toast.show("Dit label heeft sublabels; kies een profiel per sublabel.", "warn");
}

registerView("board", {
  title: "Integraal ontwerpbord",
  fac: {
    duration: 60,
    goal: "Per label in één samenhangend beeld kiezen wat het label doet (classificeren, beschermen) en wat DLP doet bij delen – van licht naar streng.",
    questions: ["Wat mag er níet gebeuren met informatie van dit label? (Extern mailen, delen via link, USB, Copilot?)", "Hoeveel mag de medewerker merken (meldingen, blokkades) bij dit niveau?", "Moet een gevoeliger label altijd minstens zo streng zijn als het label erboven?"],
    tips: ["Sleep eerst een profiel op elke kolom; verfijn daarna per cel.", "Klik een cel voor alle opties en de exacte Purview-instellingen.", "Rode ↓-markering: minder streng dan een minder gevoelig label – bespreek of dat bewust is.", "Toets direct op Scenario’s om de keuzes te valideren."],
    pitfalls: ["Alles op ‘blokkeren’: te veel hinder leidt tot omzeilen (privémail, WhatsApp).", "DLP direct handhaven zonder simulatie – start altijd in simulatiemodus.", "Encryptie op labels die met externen gedeeld worden zonder partnerdomeinen."],
    links: ["labels", "dlp", "dlpDesign"],
  },
  done: (st) => Mapping.coverage(st).pct >= 80,
  render() {
    const st = S();
    const ls = applicableLabels(st);
    if (!ls.length) return pageHead("Integraal", "Integraal ontwerpbord", "") + VH.needLabels();
    const cov = Mapping.coverage(st);
    const mono = BoardUtil.monoMap(st);
    const nMono = Object.keys(mono).length;
    const rows = BoardUtil.rows(st);
    const filt = UI.boardFilter && UI.boardFilter !== "all" ? UI.boardFilter : "";
    const nOpt = CATALOG.boardRows.filter((r) => r.optional && ls.some((l) => l.choices[r.key] && !/-off$/.test(l.choices[r.key]))).length;
    const nOptAll = CATALOG.boardRows.filter((r) => r.optional).length;
    const corner = `<div class="lb-cov" title="${cov.done} van ${cov.total} cellen ingevuld"><b>${cov.done}/${cov.total}</b> ingevuld</div>${nMono ? `<span class="badge err mt-1" title="Een gevoeliger label is hier minder streng dan een minder gevoelig label">${icon("warning", "s")} ${nMono}× minder streng</span>` : ""}`;
    const head = `<tr><th class="corner">${corner}</th>${ls.map((l) => {
      const p = parentOf(l, st);
      const fr = Mapping.frictionLabel(Mapping.friction(l));
      return `<th class="lbl-head" style="--lc:${esc(l.color)}" data-drop="profile" data-zone="board-profile" data-target='${attr({ labelId: l.id })}'><div class="lbl-bar"></div><div class="lbl-inner">
        <div class="row tight between"><span class="lbl-parent">${p ? esc(p.displayName || p.name) : "&nbsp;"}</span><span class="row tight"><button class="icon-btn small" data-action="pv-open" data-label="${esc(l.id)}" title="Zo ziet de gebruiker het" aria-label="Voorbeeld: zo ziet de gebruiker ${esc(labelFullName(l, st))}">${icon("eye", "s")}</button><button class="icon-btn small" data-action="board-col-menu" data-id="${esc(l.id)}" title="Kolomacties" aria-label="Kolomacties ${esc(labelFullName(l, st))}">${icon("more", "s")}</button></span></div>
        <div class="lbl-name" title="${esc(labelFullName(l, st))}">${esc(l.displayName || l.name)}</div>
        <div class="lb-hmeta" title="Prioriteit in Purview: ${labelPriority(l, st)}"><span title="Wat merkt de medewerker">Impact ${esc(fr.t.toLowerCase())}</span></div>
      </div></th>`;
    }).join("")}</tr>`;
    let body = "";
    CATALOG.boardGroups.forEach((grp) => {
      if (filt && filt !== grp.key) return;
      const gr = rows.filter((r) => r.group === grp.key);
      if (!gr.length) return;
      body += `<tr class="group-row"><th data-action="board-filter" data-focus-key="bfilter-${esc(grp.key)}" data-key="${filt ? "" : esc(grp.key)}" style="cursor:pointer" title="${filt ? "Alle groepen tonen" : "Alleen deze groep tonen"}">${icon(grp.icon, "s")} ${esc(grp.name)}</th><td colspan="${ls.length}"></td></tr>`;
      gr.forEach((r) => {
        const rowDrop = r.kind === "choice" ? ` data-drop="choice" data-zone="board-row" data-target='${attr({ domain: r.key })}'` : "";
        body += `<tr><th class="${UI.boardDomain === r.key ? "sel" : ""}"${rowDrop} data-action="board-dom" data-dom="${esc(r.key)}" style="cursor:pointer"><div class="dom-title">${icon(r.icon, "s")}${esc(r.name)}${r.lic ? " " + licBadge(r.lic) : ""}</div><div class="dom-desc">${esc(r.sub || "")}</div></th>${ls.map((l) => BoardUtil.cell(l, r, st, mono)).join("")}</tr>`;
      });
      if (grp.key === "dlp" && nOptAll > nOpt) body += `<tr class="lb-optrow"><th><button class="link-btn" data-action="board-optional" aria-pressed="${UI.boardOptional ? "true" : "false"}" title="Fabric/Power BI, on-premises en cloud-apps">${icon(UI.boardOptional ? "minus" : "plus", "s")} ${UI.boardOptional ? "Ongebruikte locaties verbergen" : "Meer locaties"}</button></th><td colspan="${ls.length}"></td></tr>`;
    });
    const table = `<div class="board-wrap"><table class="board"><thead>${head}</thead><tbody>${body}</tbody></table></div>`;

    const ptab = UI.paletteTab || "choices";
    const choiceRows = CATALOG.boardRows.filter((r) => r.kind === "choice");
    const dom = choiceRows.some((r) => r.key === UI.boardDomain) ? UI.boardDomain : "encryption";
    const prow = BoardUtil.rowByKey(dom);
    const big = !!UI.boardPalette;
    const domSel = `<select class="select" data-live="board-dom-sel" aria-label="Rij voor keuzekaarten">${choiceRows.map((r) => `<option value="${esc(r.key)}"${r.key === dom ? " selected" : ""}>${esc(r.name)}${r.optional ? " (optioneel)" : ""}</option>`).join("")}</select>`;
    const ptabs = `<div class="btn-group"><button class="btn small${ptab === "choices" ? " on" : ""}" data-action="board-ptab" data-tab="choices" aria-pressed="${ptab === "choices"}">Keuzekaarten</button><button class="btn small${ptab === "profiles" ? " on" : ""}" data-action="board-ptab" data-tab="profiles" aria-pressed="${ptab === "profiles"}">Profielen</button></div>`;
    const toggle = `<button class="icon-btn small" data-action="board-palette" title="${big ? "Kaarten compact boven het bord" : "Kaarten met uitleg naast het bord"}" aria-label="${big ? "Keuzekaarten compact tonen" : "Keuzekaarten met uitleg tonen"}">${icon(big ? "menu" : "panel", "s")}</button>`;
    const profCard = (p, mini) => mini
      ? `<div class="choice mini lv-${p.lv}" data-drag="profile" data-payload='${attr({ profileId: p.id })}' data-tap="1" data-pick-label="${esc(p.name)}" title="${esc(p.name + " – " + p.desc)}" style="border-left-color:${esc(p.color)}" tabindex="0">${icon("layers", "s")}<span>${esc(p.name)}</span></div>`
      : `<div class="choice lv-${p.lv}" data-drag="profile" data-payload='${attr({ profileId: p.id })}' data-tap="1" data-pick-label="${esc(p.name)}" style="cursor:grab;border-left-color:${esc(p.color)}"><div class="ch-title">${icon("layers", "s")}<span>${esc(p.name)}</span></div><div class="ch-sub">${esc(p.desc)}</div></div>`;
    const hint = ptab === "choices" ? "Sleep een kaart op een cel, of op de rijkop voor alle labels. Klik een cel voor alle opties." : "Sleep een profiel op een labelkolom om alle rijen te vullen.";
    const filterSel = `<select class="select lb-filter" data-live="board-filter-sel" aria-label="Maatregelen tonen">${[["", "Alle maatregelen"], ...CATALOG.boardGroups.map((x) => [x.key, x.name])].map(([k, t]) => `<option value="${esc(k)}"${filt === k ? " selected" : ""}>${esc(t)}</option>`).join("")}</select>`;
    const legend = `<span class="lb-legend legend" aria-label="Legenda strengheid">${CATALOG.levels.map((x) => `<span class="lg lv-${x.lv}" title="${esc(x.desc)}"><i aria-hidden="true"></i>${esc(x.name)}</span>`).join("")}${infoTip(`Niveaus, van licht naar streng: ${CATALOG.levels.map((x) => `${x.name} (${x.desc.toLowerCase()})`).join("; ")}. Rode ↓: minder streng dan een minder gevoelig label. ‘aangepast’: handmatig gewijzigd in Label-instellingen.`)}</span>`;
    const tools = `<span class="lb-tools">${filterSel}${legend}</span>`;
    const palette = big
      ? `<div class="card flat board-palette" style="padding:12px"><div class="row tight mb-2">${ptabs}<span class="spacer"></span>${toggle}</div>
      ${ptab === "choices" ? `<div class="mb-1">${domSel}</div>
        <p class="xs muted">${esc(prow.desc)}</p>
        <div class="choice-palette lib-scroll" style="max-height:calc(100vh - 360px)">${CATALOG.choicesFor(dom).map((c) => BoardUtil.choiceCard(c, { desc: true })).join("")}</div>`
      : `<div class="choice-palette lib-scroll" style="max-height:calc(100vh - 320px)">${CATALOG.profiles.map((p) => profCard(p, false)).join("")}</div>`}
      <p class="xs muted mt-1">${esc(hint)}</p>
    </div>`
      : `<div class="palette-strip lb-toolbar">${ptabs}${ptab === "choices" ? `<div class="ps-sel">${domSel}</div>` : ""}<div class="ps-cards">${ptab === "choices" ? CATALOG.choicesFor(dom).map((c) => BoardUtil.choiceCard(c, { mini: true })).join("") : CATALOG.profiles.map((p) => profCard(p, true)).join("")}</div>${infoTip(hint)}${tools}${toggle}</div>`;

    return `<div class="lb-board">${pageHead("Integraal", "Integraal ontwerpbord", "Kies per label de maatregelen. Klik een cel voor alle opties.", `<button class="btn" data-action="board-overview">${icon("table", "s")} Keuzeoverzicht</button><button class="btn primary" data-action="go" data-route="scenarios">${icon("play", "s")} Scenario’s testen</button>`, `<p class="mb-1">Kolommen zijn jullie labels, van minst naar meest gevoelig. Rijen zijn de maatregelen: herkennen, publiceren, beschermen en DLP. Elke kaart vertaalt naar exacte Purview-instellingen.</p>`)}
      ${big ? `<div class="row tight mb-1 lb-toolbar">${tools}</div><div class="board-layout">${table}<div class="sticky">${palette}</div></div>` : `${palette}${table}`}</div>`;
  },
});

Actions["board-filter-sel"] = (el) => { UI.boardFilter = el.value || ""; App.render(); };Actions["board-filter"] = (el) => { UI.boardFilter = el.dataset.key || ""; App.render(); };
Actions["board-optional"] = () => { UI.boardOptional = !UI.boardOptional; App.render(); };
Actions["board-dom"] = (el) => { const r = BoardUtil.rowByKey(el.dataset.dom); if (r && r.kind === "choice") { UI.boardDomain = r.key; UI.paletteTab = "choices"; App.render(); } else if (r) { if (r.sub2) UI.labelTab = r.sub2; App.go(r.route); } };
Actions["board-dom-sel"] = (el) => { UI.boardDomain = el.value; App.render(); };
Actions["board-ptab"] = (el) => { UI.paletteTab = el.dataset.tab; App.render(); };
Actions["board-palette"] = () => { UI.boardPalette = !UI.boardPalette; App.render(); };
Actions["board-overview"] = () => Keuzeoverzicht.open();
Actions["board-cell"] = (el) => {
  if (DnD.pick) { if (DnD.pick.type === "choice" && DnD.pick.payload) _wrongRowToast(CATALOG.choiceById[DnD.pick.payload.choiceId]); return; }
  BoardDrawer.open(el.dataset.id, el.dataset.dom);
};
Actions["board-choose"] = (el) => _boardApply(el.dataset.id, el.dataset.choice);
Actions["board-sits"] = (el) => { UI.sitFocus = { labelId: el.dataset.id, back: el.dataset.back || UI.route }; UI.selLabel = el.dataset.id; Drawer.close(); App.go("sits", "map"); };
Actions["board-clear"] = (el) => { Store.update((st) => Mapping.clear(st, el.dataset.id, el.dataset.dom)); };
Actions["board-reset-custom"] = (el) => Store.update((st) => {
  const l = labelById(el.dataset.id, st);
  const c = l.choices[el.dataset.dom];
  if (c) Mapping.apply(st, l.id, c); else if (l.custom) delete l.custom[el.dataset.dom];
});
Actions["board-detail"] = (el) => {
  const r = BoardUtil.rowByKey(el.dataset.dom);
  Drawer.close();
  if (r.sub2) UI.labelTab = r.sub2;
  if (r.dlp && r.route === "dlp") UI.dlpTab = "matrix";
  App.go(r.route, el.dataset.id);
};
Actions["board-scope"] = (el) => {
  const id = el.dataset.id, k = el.dataset.key;
  const l = labelById(id);
  if (!l) return;
  if ((k === "files" || k === "emails") && l.cfg.scope[k] && l.cfg.scope.meetings) {
    const nm = k === "files" ? "Files & other data assets" : "Emails";
    confirmDialog(`${nm} uitzetten?`, `De scope Meetings vereist zowel Files als Emails. Als je ${nm} uitzet, gaat Meetings voor ‘${esc(labelFullName(l))}’ ook uit en vervallen de meeting-instellingen van dit label.`, () => _boardScope(id, k), "Beide uitzetten");
    return;
  }
  _boardScope(id, k);
};
function _boardScope(id, k) {
  let auto = "";
  Store.update((st) => {
  const l = labelById(id, st);
  const s = l.cfg.scope;
  const before = { files: s.files, emails: s.emails };
  s[k] = !s[k];
  if (k === "meetings" && s.meetings) { s.files = true; s.emails = true; }
  if ((k === "files" || k === "emails") && !s[k]) s.meetings = false;
  if (!Object.values(s).some(Boolean)) { s[k] = true; Toast.show("Een label heeft minstens één scope nodig.", "warn"); }
  if (!s.meetings && l.choices.meetings && l.choices.meetings !== "mt-none") Mapping.apply(st, l.id, "mt-none");
  if (s.meetings && (!l.choices.meetings || l.choices.meetings === "mt-none")) { Mapping.apply(st, l.id, "mt-label"); s.files = true; s.emails = true; }
  if (!s.sites && l.choices.container && l.choices.container !== "ct-none") Mapping.apply(st, l.id, "ct-none");
  if (s.sites && (!l.choices.container || l.choices.container === "ct-none")) Mapping.apply(st, l.id, "ct-internal");
  l.cfg.scope.sites = s.sites; l.cfg.scope.meetings = s.meetings;
  if (k === "meetings" && s.meetings && (!before.files || !before.emails)) auto = "Meetings vereist Files en Emails; die staan nu ook aan.";
  });
  if (auto) Toast.show(esc(auto), "info");
}
Actions["board-clear-label"] = (el) => confirmDialog("Kolom leegmaken?", "Alle keuzes van dit label op het bord worden gewist (de instellingen blijven staan).", () => Store.update((st) => {
  const l = labelById(el.dataset.id, st);
  l.choices = {}; l.custom = {}; delete l.profile;
}), "Leegmaken", true);
Actions["board-col-menu"] = (el) => {
  const id = el.dataset.id;
  const others = applicableLabels().filter((x) => x.id !== id && Object.keys(x.choices || {}).length);
  Menu.open(el, [
    ...CATALOG.profiles.map((p) => ({ icon: "layers", label: `Profiel: ${p.name}`, desc: p.desc, fn: () => _boardProfile(id, p.id) })),
    "-",
    ...(others.length ? [{ icon: "copy", label: "Neem keuzes over van…", desc: "Alle kaarten van een ander label kopiëren", fn: () => setTimeout(() => Menu.open(el, others.map((o) => ({ icon: "tag", label: labelFullName(o), fn: () => {
      let r = { n: 0, custom: 0 };
      Store.update((st) => { r = BoardUtil.copyChoices(st, o.id, id); BoardUtil.pruneGroups(st); });
      BoardUtil.todoToast(id, `${r.n} keuzes overgenomen van ‘${esc(labelFullName(o))}’.${r.custom ? " Handmatige aanpassingen zijn niet meegekopieerd." : ""}`);
    } }))), 0) }] : []),
    { icon: "eye", label: "Zo ziet de gebruiker het", desc: "Voorbeelden in Office, Outlook, SharePoint, Teams, Copilot en op het apparaat", fn: () => Previews.open(id) },
    { icon: "settings", label: "Label-instellingen openen", fn: () => App.go("labels", id) },
    { icon: "trash", label: "Kolom leegmaken", fn: () => Actions["board-clear-label"]({ dataset: { id } }) },
  ]);
};
