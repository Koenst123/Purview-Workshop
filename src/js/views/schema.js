/* View: Classificatieschema – labels en sublabels (volgorde = prioriteit), slepen om te ordenen/nesten */

/** Verwijder alle verwijzingen naar labels (beleid, defaults, maatwerk-DLP, scenario-overrides, doelgroepen). */
function removeLabelRefs(st, ids) {
  const set = new Set(ids);
  const grp = st.groups.filter((g) => g.forLabel && set.has(g.forLabel)).map((g) => g.id);
  st.groups = st.groups.filter((g) => !grp.includes(g.id));
  st.labelPolicies.forEach((p) => {
    p.labels = (p.labels || []).filter((id) => !set.has(id));
    p.groups = (p.groups || []).filter((g) => !grp.includes(g));
    Object.keys(p.settings || {}).forEach((k) => { if (/^default/.test(k) && set.has(p.settings[k])) p.settings[k] = ""; });
    if (p.settings && p.settings.defaultEmail === "sameAsDocs" && !p.settings.defaultDocs) p.settings.defaultEmail = "";
    Object.keys(p.adv || {}).forEach((k) => { if (set.has(p.adv[k])) p.adv[k] = ""; });
  });
  st.labels.forEach((l) => {
    l.cfg.publish.groups = (l.cfg.publish.groups || []).filter((g) => !grp.includes(g));
    l.cfg.encryption.permissions = (l.cfg.encryption.permissions || []).filter((p) => !p.groupId || !grp.includes(p.groupId));
  });
  (st.customDlp || []).forEach((c) => (c.rules || []).forEach((r) => { r.labels = (r.labels || []).filter((id) => !set.has(id)); }));
  Object.keys(st.scenarioResults || {}).forEach((k) => { if (set.has(st.scenarioResults[k].labelId)) delete st.scenarioResults[k]; });
  Generator.ensureGroupPolicies(st);
}

/** Parents krijgen de vereniging van de scope van hun sublabels; sublabels erven de kleur van de parent. */
function syncHierarchy(st) {
  st.labels.filter((l) => hasChildren(l, st)).forEach((p) => {
    const kids = childrenOf(p.id, st);
    Object.keys(p.cfg.scope).forEach((k) => { p.cfg.scope[k] = p.cfg.scope[k] || kids.some((c) => c.cfg.scope[k]); });
    kids.forEach((c) => (c.color = p.color));
  });
}

/** Verplaats een label (optioneel onder een parent, vóór een ander label). Geeft een foutmelding of null terug. */
function moveLabel(st, id, parentId, beforeId) {
  const l = labelById(id, st);
  if (!l) return "Label niet gevonden.";
  if (parentId === id || beforeId === id) return null;
  if (parentId) {
    const p = labelById(parentId, st);
    if (!p) return "Parent niet gevonden.";
    if (p.parentId) return "Purview ondersteunt één niveau sublabels: een sublabel kan geen eigen sublabels hebben.";
    if (hasChildren(l, st)) return "Een label met sublabels kan zelf geen sublabel worden.";
  }
  const i = st.labels.indexOf(l);
  st.labels.splice(i, 1);
  l.parentId = parentId || null;
  const bi = beforeId ? st.labels.findIndex((x) => x.id === beforeId) : -1;
  if (bi >= 0) st.labels.splice(bi, 0, l); else st.labels.push(l);
  syncHierarchy(st);
  Generator.ensureGroupPolicies(st);
  return null;
}

DnD.register("schema-move", (type, payload, target) => {
  let err = null;
  const was = (labelById(payload.id) || {}).parentId;
  Store.update((st) => { err = moveLabel(st, payload.id, target.parent, target.before); });
  if (err) Toast.show(esc(err), "warn"); else { _promotedToast(payload.id, was); _strandedToast(target.parent); }
});
/** Hoofdlabel kreeg sublabels terwijl er informatietypen aan hangen: die doen nu niets (zie PV-111). */
function _strandedToast(parentId) {
  const p = parentId && labelById(parentId);
  const n = p ? strandedSits(p).length : 0;
  if (n) Toast.show(`‘${esc(labelShortName(p))}’ heeft nu sublabels en kan zelf niet meer worden toegepast. ${n === 1 ? "Het gekoppelde informatietype doet" : `De ${n} gekoppelde informatietypen doen`} daardoor niets. <button class="link-btn" data-action="board-sits" data-id="${esc(p.id)}">Verplaats naar een sublabel</button>`, "warn", 8000);
}
/** Sublabel → hoofdlabel: de kleur was geërfd, dus even attenderen. */
function _promotedToast(id, wasParent) {
  const l = labelById(id);
  if (wasParent && l && !l.parentId) Toast.show(`‘${esc(l.displayName || l.name)}’ is nu een hoofdlabel – kies eventueel een eigen kleur.`, "info", 5000);
}
DnD.register("schema-nest", (type, payload, target) => {
  let err = null;
  Store.update((st) => { err = moveLabel(st, payload.id, target.parent, null); });
  if (err) Toast.show(esc(err), "warn"); else { Toast.show("Sublabel gemaakt.", "ok"); _strandedToast(target.parent); }
});
Hooks.lblColor = (st, r, value) => { const l = r.obj; if (l && !l.parentId) childrenOf(l.id, st).forEach((c) => (c.color = value)); };


registerView("schema", {
  title: "Classificatieschema",
  fac: {
    duration: 30,
    goal: "Het classificatieschema uit Know your Data vertalen naar sensitivity labels en sublabels, in de juiste volgorde (prioriteit).",
    questions: ["Welke niveaus kent het schema (bijv. Openbaar – Intern – Vertrouwelijk – Strikt vertrouwelijk)?", "Zijn er doelgroepen die een eigen sublabel nodig hebben (HR, Directie, Medisch)?", "Begrijpt een medewerker in één oogopslag welk label hij moet kiezen (tooltip)?"],
    tips: ["Sleep labels om de volgorde te wijzigen; onderaan = hoogste prioriteit (meest gevoelig).", "Sleep een label op het vak ‘sublabel’ van een hoofdlabel om te nesten.", "Gebruik ‘Importeren’ om een schema uit Excel/Word te plakken."],
    pitfalls: ["Meer dan ~5 hoofdlabels: gebruikers kiezen dan vaak verkeerd.", "Een parent-label met sublabels kan zelf niet worden toegepast – plan instellingen op de sublabels.", "Labelnamen later wijzigen: de Name (technisch) is na aanmaken niet te wijzigen, de Display name wel."],
    links: ["labels", "labelsCreate", "labelsLimits"],
  },
  done: (st) => applicableLabels(st).length >= 2,
  render() {
    const st = S();
    const ls = orderedLabels(st);
    const sel = VH.selLabel("schema", st);
    const zName = (id) => { const x = id && labelById(id, st); return x ? `‘${x.displayName || x.name}’` : ""; };
    const between = (parent, before) => {
      const lbl = before ? `Hier plaatsen${parent ? " als sublabel" : ""}, vóór ${zName(before)}` : "Hier plaatsen, onderaan als hoofdlabel";
      return `<div class="drop-between${parent ? " dz-sub" : ""}" data-drop="label" data-zone="schema-move" data-target='${attr({ parent, before })}' role="button" aria-label="${esc(lbl)}"></div>`;
    };
    const card = (l) => {
      const kids = hasChildren(l, st);
      const scIco = { files: "doc", emails: "mail", meetings: "meeting", sites: "site" };
      const scOn = CATALOG.labelScopes.filter((x) => l.cfg.scope[x.key]);
      const sc = scOn.length ? `<span class="badge neutral scope-icons" role="img" aria-label="Scope: ${esc(scOn.map((x) => x.name).join(", "))}" title="Scope: ${esc(scOn.map((x) => x.name + (x.badge === "teamsPremium" ? " (deels Teams Premium)" : "")).join(" · "))}">${scOn.map((x) => icon(scIco[x.key] || "tag", "s")).join("")}</span>` : "";
      const nS = labelSits(l, st).length;
      const nm = esc(l.displayName || l.name);
      const id = esc(l.id);
      const sib = st.labels.filter((x) => (x.parentId || null) === (l.parentId || null));
      const si = sib.indexOf(l);
      const upT = si <= 0 ? "Staat al bovenaan" : "Omhoog (lagere prioriteit)", dnT = si >= sib.length - 1 ? "Staat al onderaan" : "Omlaag (hogere prioriteit)";
      return `<div class="label-card${l.parentId ? " sub" : ""}${sel && sel.id === l.id ? " selected" : ""}" style="--lc:${esc(l.color)}" data-drag="label" data-payload='${attr({ id: l.id })}' data-action="schema-sel" data-id="${id}" role="group" aria-label="Label ${nm}${sel && sel.id === l.id ? " (geselecteerd)" : ""}">
        <span class="bar"></span>
        <div class="lc-main"><span class="drag-handle">${icon("grip", "s")}</span><span class="prio" title="Prioriteit (0 = laagst)">${labelPriority(l, st)}</span>
          <div class="lc-body">
            <div class="lc-top"><div class="lc-title ellipsis" title="${nm}">${nm}${kids ? ` <span class="badge neutral" title="Hoofdlabel met sublabels: medewerkers kiezen een sublabel">hoofdlabel</span>` : ""}</div>
              <div class="lc-actions no-drag">
                <button class="icon-btn small" data-action="schema-up" data-id="${id}" title="${upT}" aria-label="${nm} omhoog" style="transform:rotate(180deg)"${si <= 0 ? " disabled" : ""}>${icon("chevrondown", "s")}</button>
                <button class="icon-btn small" data-action="schema-down" data-id="${id}" title="${dnT}" aria-label="${nm} omlaag"${si >= sib.length - 1 ? " disabled" : ""}>${icon("chevrondown", "s")}</button>
                ${l.parentId ? "" : `<button class="icon-btn small" data-action="schema-add-sub" data-id="${id}" title="Sublabel toevoegen" aria-label="Sublabel toevoegen aan ${nm}">${icon("plus", "s")}</button>`}
                <button class="icon-btn small danger" data-action="schema-del" data-id="${id}" title="Verwijderen" aria-label="${nm} verwijderen">${icon("trash", "s")}</button>
              </div></div>
            <div class="lc-sub ellipsis">${esc(l.tooltip || "Nog geen beschrijving voor gebruikers")}</div>
            <div class="lc-chips">${sc}${nS ? `<span class="badge neutral" title="${nS} informatietype${nS === 1 ? "" : "n"} gekoppeld" aria-label="${nS} informatietype${nS === 1 ? "" : "n"}">${icon("search", "s")}${nS}</span>` : ""}${l.profile ? `<span class="badge neutral" title="Profiel op het Ontwerpbord">${esc((CATALOG.profiles.find((p) => p.id === l.profile) || {}).name || "")}</span>` : ""}${l.audience ? `<span class="badge neutral" title="Doelgroep">${icon("users", "s")}${esc(l.audience)}</span>` : ""}</div>
          </div></div>
        ${l.parentId ? "" : `<div class="lc-drop no-drag" data-drop="label" data-zone="schema-nest" data-target='${attr({ parent: l.id })}' data-action="schema-add-sub" data-id="${id}" tabindex="-1" data-dnd-ti="1" role="button" aria-label="Als laatste sublabel onder ${nm} plaatsen" title="Klik om een sublabel toe te voegen – of sleep een bestaand label hierheen">${icon("plus", "s")}<span>Sublabel</span></div>`}
      </div>`;
    };
    // Precies één dropzone per visuele tussenpositie: vóór elk hoofdlabel (hoofdlabelniveau),
    // vóór elk sublabel (sublabelniveau) en één onderaan de lijst. Een zone "achter het laatste
    // sublabel van een parent" zou visueel samenvallen met de zone vóór het volgende hoofdlabel;
    // die laten we weg. Als laatste sublabel plaatsen kan via het vak ‘Sublabel’ (.lc-drop).
    let list = "";
    ls.filter((l) => !l.parentId).forEach((t) => {
      list += between(null, t.id) + card(t);
      childrenOf(t.id, st).forEach((c) => { list += between(t.id, c.id) + card(c); });
    });
    list += between(null, null);

    const left = `<div class="card"><div class="card-head">${icon("tag")}<h3>Labels &amp; prioriteit</h3><span class="xs muted">Bovenaan minst, onderaan meest gevoelig</span></div>
      ${ls.length ? `<div class="schema-list">${list}</div>` : emptyState("tag", "Nog geen labels", "Voeg labels toe, importeer het schema uit Know your Data, of kies een preset op de startpagina.")}
      <div class="row mt-2"><button class="btn primary" data-action="schema-add">${icon("plus")} Label</button><button class="btn" data-action="schema-import" title="Schema importeren door een lijst te plakken (bijv. uit Excel of Word)">${icon("upload")} Importeren</button><span class="spacer"></span><span class="xs muted">Sleep om te ordenen ${infoTip("Sleep een label om de volgorde te wijzigen; sleep het op het vak ‘Sublabel’ van een hoofdlabel om te nesten. Zonder muis: gebruik de pijltjes en + bij het label.")}</span></div>
    </div>`;
    const head = pageHead("Input · Know your Data", "Classificatieschema", "Jullie classificatieniveaus als sensitivity labels; de volgorde is de prioriteit.", "", `<p class="mb-1">Zet de niveaus van minst naar meest gevoelig. Het onderste label heeft de hoogste <b>labelprioriteit</b>; Purview gebruikt die o.a. voor justificatie bij verlagen, auto-labeling en welke DLP-regel voorgaat. Sublabels gaan maximaal één niveau diep.</p><div class="row tight">${learn("labels")} ${learn("labelsCreate", "Labels maken")}</div>`);
    return `${head}
      <div class="split wide-left">${left}<div class="sticky schema-ed">${sel ? this.editor(sel, st) : `<div class="card">${emptyState("edit", "Geen label geselecteerd", "Klik een label om het te bewerken.")}</div>`}</div></div>`;
  },
  editor(l, st) {
    const kids = hasChildren(l, st);
    const tops = st.labels.filter((x) => !x.parentId && x.id !== l.id);
    const id = esc(l.id);
    const sw = CATALOG.labelColors.map((c) => `<button type="button" class="swatch${c.toUpperCase() === String(l.color).toUpperCase() ? " on" : ""}" style="background:${c}" title="Kleur: ${esc(labelColorName(c))}" aria-label="Kleur: ${esc(labelColorName(c))}" aria-pressed="${c.toUpperCase() === String(l.color).toUpperCase()}" data-action="lbl-color" data-id="${id}" data-value="${c}"></button>`).join("");
    const pre = `lbl:${l.id}:`;
    const pid = "schema-parent-" + String(l.id).replace(/[^\w-]/g, "");
    const filled = !!(l.audience || l.owner || (l.info || []).length);
    return `<div class="card"><div class="card-head"><span class="color-dot" style="background:${esc(l.color)};width:14px;height:14px"></span><h3>${esc(labelFullName(l, st))}</h3><button class="btn small" data-action="go" data-route="labels" data-sub="${id}">${icon("settings", "s")} Instellingen</button></div>
      ${F.text(pre + "displayName", "Display name", { maxlength: 64, render: true })}
      ${F.textarea(pre + "tooltip", "Description for users (tooltip)", { rows: 2, ph: "Wanneer kies je dit label? Schrijf vanuit de gebruiker." })}
      <div class="field"><div class="field-label">Label color ${l.parentId ? infoTip("Sublabels erven de kleur van de parent.") : ""}</div>${l.parentId ? `<span class="small muted">${esc(l.color)}</span>` : `<div class="swatches">${sw}<input type="color" data-bind="${pre}color" data-onchange="lblColor" value="${esc(l.color)}" title="Eigen kleur" aria-label="Eigen kleur"></div>`}</div>
      <div class="field"><label for="${pid}">Parent label</label><select id="${pid}" class="select" data-live="schema-parent" data-id="${id}"${kids ? " disabled" : ""}><option value="">– Geen (hoofdlabel) –</option>${tops.map((t) => `<option value="${esc(t.id)}"${l.parentId === t.id ? " selected" : ""}>${esc(t.displayName || t.name)}</option>`).join("")}</select>${kids ? `<div class="hint">Dit label heeft sublabels en kan daarom geen sublabel worden.</div>` : ""}</div>
      <div class="row mb-2">${kids ? (strandedSits(l, st).length ? `<button class="btn small" data-action="board-sits" data-id="${id}">${icon("warning", "s")} ${strandedSits(l, st).length} informatietype(n) naar een sublabel verplaatsen</button>` : `<span class="xs muted">Hoofdlabel: koppel informatietypen aan de sublabels.</span>`) : `<button class="btn small" data-action="board-sits" data-id="${id}">${icon("search", "s")} Informatietypen koppelen (${labelSits(l, st).length})</button>`}</div>
      ${accordion("schema-more", `Meer velden <span class="muted small" style="font-weight:400">doelgroep, voorbeelden${filled ? " · ingevuld" : ""}</span>`, `
        ${F.text(pre + "audience", "Doelgroep (Know your Data)", { ph: "Bijv. HR, Directie, Behandelaars" })}
        ${F.text(pre + "owner", "Eigenaar (rol)", { ph: "Bijv. HR-manager", hint: "Wie beslist over dit label en beoordeelt uitzonderingen?" })}
        ${F.textarea(pre + "info", "Informatieobjecten / voorbeelden", { type: "lines", rows: 3, ph: "Eén per regel, bijv. Arbeidsovereenkomst", hint: "Herkenning via informatietypen/classifiers koppel je bij Informatietypen." })}`)}
      ${techNameIssue(st, l.id) ? `<p class="hint">${icon("alert", "s")} De technische naam vraagt aandacht: <button class="btn small subtle" data-action="go" data-route="labels" data-sub="${id}">open Label-instellingen</button></p>` : ""}
      ${accordion("schema-rules", `Spelregels in Purview <span class="badge neutral">${(CATALOG.labelLimits || []).length}</span>`, `<ul class="tight small">${(CATALOG.labelLimits || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`)}
    </div>`;
  },
});

function _nextColor(st) { return CATALOG.labelColors[st.labels.filter((l) => !l.parentId).length % CATALOG.labelColors.length]; }
/** Nederlandse namen voor de labelkleuren (schermlezer en tooltip); onbekende kleuren als hexwaarde. */
const LABEL_COLOR_NAMES = { "#13A10E": "Groen", "#0F6CBD": "Blauw", "#038387": "Blauwgroen", "#8764B8": "Paars", "#CA5010": "Oranje", "#E3008C": "Roze", "#C50F1F": "Rood", "#986F0B": "Goudbruin", "#69797E": "Grijs", "#3B3A39": "Donkergrijs" };
function labelColorName(c) { const k = String(c || "").trim().toUpperCase(); return Object.hasOwn(LABEL_COLOR_NAMES, k) ? LABEL_COLOR_NAMES[k] : k; }
/** Kleurstalen uit F.color: "Kleur: Groen" i.p.v. alleen de hexcode als tooltip/aria-label. */
function withColorNames(html) {
  return String(html).replace(/(<button type="button" class="swatch[^"]*" style="background:(#[0-9A-Fa-f]{3,8})") title="[^"]*"/g, (m, head, c) => `${head} title="Kleur: ${esc(labelColorName(c))}" aria-label="Kleur: ${esc(labelColorName(c))}"`);
}
Actions["schema-sel"] = (el) => { UI.sub.schema = el.dataset.id; App.render(); };
Actions["schema-add"] = () => promptDialog("Nieuw label", "Naam", "", (name) => {
  let id;
  Store.update((st) => { const l = newLabel(name, { color: _nextColor(st) }); st.labels.push(l); id = l.id; });
  UI.sub.schema = id; App.render();
}, { ph: "Bijv. Vertrouwelijk" });
Actions["schema-add-sub"] = (el) => {
  const st = S();
  const p = labelById(el.dataset.id, st);
  if (!p) return;
  const sibs = childrenOf(p.id, st);
  const pHas = Object.keys(p.choices || {}).length > 0;
  const opts = [...(pHas ? [[p.id, `${p.displayName || p.name} (hoofdlabel)`]] : []), ...sibs.map((s) => [s.id, s.displayName || s.name]), ["", "Niets – ik kies zelf"]];
  const strict = sibs.slice().sort((a, b) => Mapping.strictness(b) - Mapping.strictness(a))[0];
  const def = !sibs.length ? (pHas ? p.id : "") : strict ? strict.id : "";
  Modal.open({
    title: `Sublabel onder ‘${esc(p.displayName || p.name)}’`,
    body: `<div class="field"><label for="sub-name">Naam</label><input class="input" id="sub-name" placeholder="Bijv. HR"></div>
      <div class="field"><label for="sub-src">Instellingen overnemen van</label><select class="select" id="sub-src">${opts.map(([v, t]) => `<option value="${esc(v)}"${v === def ? " selected" : ""}>${esc(t)}</option>`).join("")}</select><div class="hint">Keuzes op het ontwerpbord (versleuteling, markering, DLP …). Je kunt ze daarna nog wijzigen.</div></div>
      <div class="field"><label for="sub-owner">Eigenaar (rol) <span class="xs muted">optioneel</span></label><input class="input" id="sub-owner" placeholder="Bijv. HR-manager"></div>
      ${!sibs.length ? `<p class="xs muted">Een hoofdlabel met sublabels kun je zelf niet meer kiezen; medewerkers kiezen voortaan een sublabel.</p>` : ""}`,
    focus: "#sub-name",
    buttons: [{ label: "Annuleren" }, { label: "Toevoegen", primary: true, fn: (m) => {
      const name = $("#sub-name", m).value.trim();
      if (!name) return fieldError($("#sub-name", m), "Geef het sublabel een naam.");
      _schemaAddSub(p.id, name, $("#sub-src", m).value, $("#sub-owner", m).value.trim());
    } }],
  });
};
function _schemaAddSub(parentId, name, srcId, owner) {
  let id, first = false, src = null, moved = 0;
  Store.update((st) => {
    const p = labelById(parentId, st);
    first = !hasChildren(p, st);
    const l = newLabel(name, { parentId: p.id, color: p.color, owner });
    st.labels.push(l); id = l.id;
    // Het hoofdlabel is straks niet meer toepasbaar: zijn informatietypen gaan mee naar het eerste sublabel (anders doen ze niets).
    if (first && (p.sits || []).length) { moved = p.sits.length; l.sits = unique([...(l.sits || []), ...p.sits]); p.sits = []; }
    src = srcId ? labelById(srcId, st) : null;
    if (src && src.id === p.id) {
      l.cfg = clone(p.cfg); l.choices = clone(p.choices || {}); l.custom = clone(p.custom || {}); if (p.profile) l.profile = p.profile;
      if (first) { p.choices = {}; p.custom = {}; delete p.profile; }
    } else if (src) BoardUtil.copyChoices(st, src.id, l.id);
    syncHierarchy(st);
    if (typeof syncParentPublish === "function") syncParentPublish(st);
    Generator.ensureGroupPolicies(st);
  });
  UI.sub.schema = id; App.render();
  const extra = first ? ` Het hoofdlabel zelf is nu niet meer te kiezen.${moved ? ` ${moved === 1 ? "Het gekoppelde informatietype is" : `De ${moved} gekoppelde informatietypen zijn`} meeverhuisd naar ‘${esc(name)}’.` : ""}` : "";
  const btn = ` <button class="link-btn" data-action="go" data-route="board">Naar ontwerpbord</button>`;
  if (src) Toast.show(`Sublabel ‘${esc(name)}’ heeft de keuzes van ‘${esc(src.displayName || src.name)}’ gekregen – controleer ze op het ontwerpbord.${extra}${btn}`, "ok", 7000);
  else Toast.show(`Sublabel ‘${esc(name)}’ is gemaakt zonder bescherming – kies nu de maatregelen op het ontwerpbord.${extra}${btn}`, "warn", 7000);
}
Actions["schema-del"] = (el) => {
  const l = labelById(el.dataset.id);
  if (!l) return;
  const kids = childrenOf(l.id);
  confirmDialog(`‘${labelFullName(l)}’ verwijderen?`, kids.length ? `Ook de ${kids.length} sublabel(s) worden verwijderd.` : "Verwijzingen in labelbeleid, DLP en scenario’s worden opgeschoond.", () => {
    Store.update((st) => { const ids = [l.id, ...childrenOf(l.id, st).map((c) => c.id)]; st.labels = st.labels.filter((x) => !ids.includes(x.id)); removeLabelRefs(st, ids); syncHierarchy(st); });
  }, "Verwijderen", true);
};
function _schemaShift(id, dir) {
  Store.update((st) => {
    const l = labelById(id, st);
    const sib = st.labels.filter((x) => (x.parentId || null) === (l.parentId || null));
    const i = sib.indexOf(l), j = i + dir;
    if (j < 0 || j >= sib.length) return;
    const a = st.labels.indexOf(l), b = st.labels.indexOf(sib[j]);
    [st.labels[a], st.labels[b]] = [st.labels[b], st.labels[a]];
  });
}
Actions["schema-up"] = (el) => _schemaShift(el.dataset.id, -1);
Actions["schema-down"] = (el) => _schemaShift(el.dataset.id, 1);
Actions["schema-parent"] = (el) => {
  let err = null;
  const was = (labelById(el.dataset.id) || {}).parentId;
  Store.update((st) => { err = moveLabel(st, el.dataset.id, el.value || null, null); });
  if (err) { Toast.show(esc(err), "warn"); App.render(); } else { _promotedToast(el.dataset.id, was); _strandedToast(el.value || null); }
};
Actions["lbl-color"] = (el) => Store.update((st) => {
  const l = labelById(el.dataset.id, st);
  l.color = el.dataset.value;
  childrenOf(l.id, st).forEach((c) => (c.color = l.color));
});
Actions["schema-import"] = () => promptDialog("Classificatieschema importeren", "Eén label per regel", "", (txt) => {
  let n = 0, header = false, inherited = false;
  Store.update((st) => {
    const hadKids = new Set(st.labels.filter((x) => x.parentId).map((x) => x.parentId));
    let lastTop = null;
    const newSubs = [];
    const lines = txt.split(/\r?\n/).filter((r) => r.trim());
    const split = (raw) => { const t = raw.trim().replace(/^[-–•*]\s*/, ""); return t.split(t.includes("\t") ? /\t+/ : /;/); };
    const cells = (raw) => raw.replace(/^[-–•*]\s*/, "").split("\t").map((x) => x.trim());
    const findTop = (nm) => st.labels.find((x) => !x.parentId && x.name.toLowerCase() === nm.toLowerCase());
    let subCol = lines.length && /^sub/i.test((cells(lines[0])[1] || ""));
    if (lines.length && /^(label|labels|labelnaam|naam|name|niveau|hoofdlabel|classificatie(niveau)?|rubricering)$/i.test(split(lines[0])[0].trim())) { lines.shift(); header = true; }
    if (!header && lines.some((r) => cells(r).length >= 3)) subCol = true;
    if (subCol) {
      // Excel-kolommen: Label | Sublabel | Omschrijving
      lines.forEach((raw) => {
        const [top, subNm, tip] = cells(raw);
        if (!top && !subNm) return;
        let p = top ? findTop(top) : lastTop;
        if (top && !p) { p = newLabel(top, { color: _nextColor(st), tooltip: subNm ? "" : tip || "" }); st.labels.push(p); n++; }
        if (p) lastTop = p;
        if (subNm && p) { const c = newLabel(subNm, { parentId: p.id, color: p.color, tooltip: tip || "" }); st.labels.push(c); newSubs.push(c); n++; }
      });
      lines.length = 0;
    }
    lines.forEach((raw) => {
      const indented = /^[ \t]+/.test(raw) || /^[-–•*]\s/.test(raw.trim()) && lastTop;
      const parts = split(raw);
      const name = parts[0].trim(); const tip = (parts[1] || "").trim();
      if (!name) return;
      const slash = name.split(/\s+\/\s+/);
      const sub = (p, nm) => { const c = newLabel(nm, { parentId: p.id, color: p.color, tooltip: tip }); st.labels.push(c); newSubs.push(c); n++; };
      if (slash.length === 2) {
        let p = st.labels.find((x) => !x.parentId && x.name.toLowerCase() === slash[0].toLowerCase());
        if (!p) { p = newLabel(slash[0], { color: _nextColor(st) }); st.labels.push(p); n++; }
        sub(p, slash[1]); lastTop = p;
      } else if (indented && lastTop) {
        sub(lastTop, name);
      } else {
        const l = newLabel(name, { color: _nextColor(st), tooltip: tip }); st.labels.push(l); lastTop = l; n++;
      }
    });
    // Nieuwe sublabels erven de keuzes van hun hoofdlabel; dat hoofdlabel is daarna zelf niet meer te kiezen.
    const parents = new Set();
    newSubs.forEach((c) => { const p = labelById(c.parentId, st); if (p && Object.keys(p.choices || {}).length) { c.cfg = clone(p.cfg); c.choices = clone(p.choices); c.custom = clone(p.custom || {}); parents.add(p); inherited = true; } });
    parents.forEach((p) => { p.choices = {}; p.custom = {}; delete p.profile; });
    // Informatietypen van een hoofdlabel dat net sublabels kreeg: naar het eerste nieuwe sublabel (een hoofdlabel wordt niet toegepast).
    newSubs.forEach((c) => { const p = labelById(c.parentId, st); if (p && !hadKids.has(p.id) && (p.sits || []).length) { c.sits = unique([...(c.sits || []), ...p.sits]); p.sits = []; } if (p) hadKids.add(p.id); });
    syncHierarchy(st);
    if (typeof syncParentPublish === "function") syncParentPublish(st);
    Generator.ensureGroupPolicies(st);
  });
  Toast.show(`${n} label(s) geïmporteerd.${header ? " Kopregel overgeslagen." : ""}`, "ok");
  if (inherited) Toast.show("Sublabels hebben de instellingen van hun hoofdlabel overgenomen.", "info", 5000);
}, { multiline: true, rows: 8, ph: "Openbaar; Vrij te delen\nIntern; Voor alle medewerkers\nVertrouwelijk\n  Externe partners\nStrikt vertrouwelijk / HR; Personeelsdossiers", hint: "Plak uit Excel (naam + tooltip, of Label | Sublabel | Omschrijving) of typ ‘naam; tooltip’. Volgorde = laag → hoog. Sublabel: inspringen of ‘Hoofdlabel / Sub’.", okLabel: "Importeren" });
