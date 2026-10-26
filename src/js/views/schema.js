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
  if (err) Toast.show(esc(err), "warn"); else _promotedToast(payload.id, was);
});
/** Sublabel → hoofdlabel: de kleur was geërfd, dus even attenderen. */
function _promotedToast(id, wasParent) {
  const l = labelById(id);
  if (wasParent && l && !l.parentId) Toast.show(`‘${esc(l.displayName || l.name)}’ is nu een hoofdlabel – kies eventueel een eigen kleur.`, "info", 5000);
}
DnD.register("schema-nest", (type, payload, target) => {
  let err = null;
  Store.update((st) => { err = moveLabel(st, payload.id, target.parent, null); });
  if (err) Toast.show(esc(err), "warn"); else Toast.show("Sublabel gemaakt.", "ok");
});
Hooks.lblColor = (st, r, value) => { const l = r.obj; if (l && !l.parentId) childrenOf(l.id, st).forEach((c) => (c.color = value)); };

/* ---------- Oefening ‘Wat is wat?’: voorbeeldkaarten op de eigen classificatieniveaus (alleen UI-state, niet in export) ---------- */
const SortEx = {
  st() {
    const x = (UI.sortEx = UI.sortEx || { set: "", mode: "oefenen", placed: {}, last: null });
    const sets = CATALOG.sortExercise.sets;
    if (!sets.some((s) => s.id === x.set)) { const sec = (S().meta || {}).sector; x.set = sets.some((s) => s.id === sec) ? sec : "generic"; }
    return x;
  },
  set() { const x = this.st(); return CATALOG.sortExercise.sets.find((s) => s.id === x.set) || CATALOG.sortExercise.sets[0]; },
  item(id) { return CATALOG.sortExercise.items[id]; },
  /** Hoofdlabels met een niveau 0..3: eerst op naam (Openbaar/Intern/Vertrouwelijk/Strikt/Geheim), anders naar rato van de volgorde. */
  levels(st) {
    const tops = orderedLabels(st).filter((l) => !l.parentId);
    const n = tops.length;
    return tops.map((l, i) => {
      const nm = String(l.displayName || l.name || "").toLowerCase();
      const pos = n > 1 ? (i * 3) / (n - 1) : 0;
      let tier = pos;
      if (/persoonlijk|personal|priv[eé]/.test(nm)) tier = null;
      else if (/strikt|zeer|highly|geheim|secret|restricted|staatsgeheim/.test(nm)) tier = 3;
      else if (/vertrouwelijk|confidential|gevoelig|sensitive|beperkt/.test(nm)) tier = 2;
      else if (/intern|internal|algemeen|general|bedrijf/.test(nm)) tier = 1;
      else if (/openbaar|public|publiek/.test(nm)) tier = 0;
      return { l, tier, pos, kids: childrenOf(l.id, st) };
    });
  },
  /** Beoordeel een plaatsing: ok (goed) / near (bijna) / diff (anders) + het label dat wij zouden kiezen. */
  verdict(it, labelId, lv) {
    const ok = [it.tier, ...(it.alt || [])];
    const dist = (t) => (t === null ? 9 : Math.min(...ok.map((x) => Math.abs(t - x))));
    const prim = (t) => (t === null ? 9 : Math.abs(t - it.tier));
    const cand = lv.filter((x) => x.tier !== null);
    const best = cand.slice().sort((a, b) => prim(a.tier) - prim(b.tier) || Math.abs(a.pos - it.tier) - Math.abs(b.pos - it.tier))[0];
    const minD = Math.min(...cand.map((x) => dist(x.tier)));
    const me = lv.find((x) => x.l.id === labelId);
    const d = me ? dist(me.tier) : 9;
    const v = d <= 0.34 || d <= minD + 0.01 ? "ok" : d <= 1.01 ? "near" : "diff";
    return { v, best: best ? best.l : null };
  },
  sitNames(it) {
    const lists = [CATALOG.builtinSits, CATALOG.classifiers, CATALOG.customSitTemplates, CATALOG.edmTemplates, CATALOG.fingerprintTemplates];
    return (it.sits || []).map((id) => { for (const L of lists) { const c = (L || []).find((x) => x.id === id); if (c) return c.name; } return null; }).filter(Boolean);
  },
  place(id, labelId) {
    const x = this.st();
    if (!this.item(id)) return;
    if (labelId) x.placed[id] = labelId; else delete x.placed[id];
    x.last = labelId ? { id, labelId, at: Date.now() } : null;
    App.render();
    const lv = this.levels(S()), set = this.set();
    const done = set.items.every((i) => lv.some((v) => v.l.id === x.placed[i]));
    if (done && labelId && x.mode === "oefenen") {
      const good = set.items.filter((i) => this.verdict(this.item(i), x.placed[i], lv).v === "ok").length;
      if (good / set.items.length >= 0.7) VH.confetti(60);
    }
  },
  card(id, it, labelId, lv, mode) {
    const r = labelId && mode === "oefenen" ? this.verdict(it, labelId, lv) : null;
    const badge = r ? { ok: `${icon("check", "s")}Goed`, near: "Bijna", diff: "Anders" }[r.v] : "";
    const x = this.st();
    const last = x.last && x.last.id === id && Date.now() - x.last.at < 1500;
    return `<div class="sortex-card${r ? " v-" + r.v : ""}${last ? " sx-last" : ""}" data-drag="sortex" data-payload='${attr({ id, from: labelId || "" })}' data-tap="1" data-pick-label="${esc(it.name)}" data-pick-hint="klik op een classificatieniveau" aria-label="${esc(it.name)}: ${esc(it.desc)}${r ? ` – ${{ ok: "goed", near: "bijna", diff: "anders" }[r.v]}` : ""}">
      <span class="sx-ico" aria-hidden="true">${icon(it.icon || "doc")}</span><div class="sx-body"><div class="sx-name">${esc(it.name)}</div><div class="sx-desc">${esc(it.desc)}</div></div>${badge ? `<span class="sx-badge" aria-hidden="true">${badge}</span>` : ""}</div>`;
  },
  feedback(x, lv) {
    const L = x.last && this.item(x.last.id) && lv.find((v) => v.l.id === x.last.labelId);
    if (!L) return `<div class="msg info">${icon("info")}<div class="msg-body">${x.mode === "oefenen" ? "Sleep een kaart naar het niveau dat volgens jullie past – je krijgt meteen uitleg." : "Discussiemodus: plaats de kaarten samen, zonder goed of fout. Bespreek bij elke kaart: wie mag dit zien, en wat gebeurt er als het uitlekt?"}</div></div>`;
    const it = this.item(x.last.id), nm = L.l.displayName || L.l.name;
    const sits = this.sitNames(it);
    const sitTxt = sits.length ? `<div class="sortex-why">Purview kan dit herkennen met o.a. ${sits.map((s) => `<b>${esc(s)}</b>`).join(", ")}.</div>` : "";
    if (x.mode !== "oefenen") return `<div class="msg info">${icon("meeting")}<div class="msg-body"><b>${esc(it.name)}</b> → ${esc(nm)}. Waarom dit niveau? Wie mag het zien, en wat is de schade als het uitlekt?${sitTxt}</div></div>`;
    const r = this.verdict(it, L.l.id, lv);
    const bn = r.best ? r.best.displayName || r.best.name : "";
    const head = r.v === "ok" ? `<b>Goed!</b> ${esc(it.name)} hoort bij ${esc(nm)}.` : r.v === "near" ? `<b>Bijna.</b> ${esc(it.name)} bij ${esc(nm)} is te verdedigen, maar wij zouden kiezen voor <b>${esc(bn)}</b>.` : `<b>Wij zouden kiezen voor ${esc(bn)}.</b> ${esc(it.name)} staat nu bij ${esc(nm)}.`;
    const cls = { ok: "ok", near: "warn", diff: "warn" }[r.v];
    return `<div class="msg ${cls}">${icon(r.v === "ok" ? "checkcircle" : "info")}<div class="msg-body">${head} ${esc(it.why)}${sitTxt}</div></div>`;
  },
  render(st) {
    const lv = this.levels(st);
    if (lv.length < 2) return `<div class="card">${emptyState("tag", "Eerst minimaal twee niveaus", "Maak in ‘Labels & prioriteit’ minimaal twee hoofdlabels (bijv. Intern en Vertrouwelijk), of kies een preset op de startpagina. Daarna kun je hier oefenen.")}</div>`;
    const x = this.st(), set = this.set();
    Object.keys(x.placed).forEach((k) => { if (!set.items.includes(k) || !lv.some((v) => v.l.id === x.placed[k])) delete x.placed[k]; });
    const items = set.items.filter((i) => this.item(i));
    const pool = items.filter((i) => !x.placed[i]);
    const nPl = items.length - pool.length;
    const good = items.filter((i) => x.placed[i] && this.verdict(this.item(i), x.placed[i], lv).v === "ok").length;
    const near = items.filter((i) => x.placed[i] && this.verdict(this.item(i), x.placed[i], lv).v === "near").length;
    const seg = (key, opts, cur, label) => `<div class="sx-seg" role="radiogroup" aria-label="${esc(label)}">${opts.map(([k, t, ic]) => `<button type="button" role="radio" aria-checked="${k === cur}" class="${k === cur ? "on" : ""}" data-action="sortex-${key}" data-v="${esc(k)}">${ic ? icon(ic, "s") : ""}${esc(t)}</button>`).join("")}</div>`;
    const oef = x.mode === "oefenen";
    const score = oef
      ? `<div class="sortex-score" aria-live="polite"><span class="sx-num">${good}/${items.length}</span><div><div class="xs">goed${near ? ` · ${near} bijna` : ""}</div><div class="sortex-progress" title="${nPl} van ${items.length} geplaatst"><span style="width:${Math.round((nPl / items.length) * 100)}%"></span></div></div><button class="btn small" data-action="sortex-reset">${icon("undo", "s")} Opnieuw</button></div>`
      : `<div class="sortex-score" aria-live="polite"><span class="sx-num">${nPl}/${items.length}</span><div class="xs">geplaatst</div><button class="btn small" data-action="sortex-mode" data-v="oefenen" title="Schakel naar oefenen: toont per kaart onze keuze">${icon("eye", "s")} Toon antwoorden</button><button class="btn small" data-action="sortex-reset">${icon("undo", "s")} Opnieuw</button></div>`;
    const bar = `<div class="sortex-bar"><div class="sx-group"><span class="xs">Voorbeelden</span>${seg("set", CATALOG.sortExercise.sets.map((s) => [s.id, s.name]), x.set, "Set met voorbeelden")}</div>
      <div class="sx-group"><span class="xs">Modus</span>${seg("mode", [["oefenen", "Oefenen", "check"], ["discussie", "Discussie", "meeting"]], x.mode, "Modus")}</div>${score}</div>`;
    const allDone = !pool.length;
    const done = allDone && oef ? `<div class="sortex-done">${icon("trophy")}<div><b>Klaar: ${good} van ${items.length} goed${near ? `, ${near} bijna` : ""}.</b><div class="small">Bespreek de oranje en rode kaarten: past het schema, of mist er een niveau of sublabel?</div></div><span class="spacer"></span><button class="btn small primary" data-action="sortex-reset">${icon("undo", "s")} Opnieuw</button></div>` : "";
    const stack = `<div class="sortex-stack" data-drop="sortex" data-zone="sortex-unplace" data-target='{}' aria-label="Stapel met voorbeeldkaarten">${pool.map((i) => this.card(i, this.item(i), "", lv, x.mode)).join("") || `<div class="sx-empty small">${allDone ? "Alle kaarten zijn geplaatst. Sleep een kaart hierheen om hem terug te leggen." : ""}</div>`}</div>`;
    const cols = `<div class="sortex-cols">${lv.map((v) => {
      const mine = items.filter((i) => x.placed[i] === v.l.id);
      const nm = v.l.displayName || v.l.name;
      return `<div class="sortex-col" style="--lc:${esc(v.l.color)}" data-drop="sortex" data-zone="sortex-place" data-target='${attr({ labelId: v.l.id })}' aria-label="Niveau ${esc(nm)}"><div class="sx-head"><b>${esc(nm)}</b><span class="xs">${v.kids.length ? `sublabels: ${esc(v.kids.map((k) => k.displayName || k.name).join(", "))}` : esc(v.l.tooltip || "")}</span></div>
        <div class="sx-drop">${mine.map((i) => this.card(i, this.item(i), v.l.id, lv, x.mode)).join("")}<div class="sx-drop-hint">${mine.length ? "" : "Sleep een kaart hierheen"}</div></div></div>`;
    }).join("")}</div>`;
    return `<div class="sortex">
      <div class="sortex-intro"><p>Hoe gevoelig is dit? Sleep de voorbeeldkaarten naar een van <b>jullie</b> niveaus (minst gevoelig links). Geschikt als groepsoefening op de beamer. Liever niet slepen? Klik een kaart en daarna een niveau, of gebruik Tab + Enter.</p></div>
      ${bar}${done}<div class="sortex-fb" aria-live="polite">${this.feedback(x, lv)}</div>${stack}${cols}
      ${oef ? `<div class="sortex-legend"><span class="lg-ok">Goed</span><span class="lg-near">Bijna (één niveau ernaast of te verdedigen)</span><span class="lg-diff">Anders dan wij zouden kiezen</span></div>` : ""}
    </div>`;
  },
};
DnD.register("sortex-place", (type, p, t) => SortEx.place(p.id, t.labelId));
DnD.accept["sortex-place"] = (type, p, t) => !!(p && t && p.from !== t.labelId);
DnD.register("sortex-unplace", (type, p) => SortEx.place(p.id, ""));
DnD.accept["sortex-unplace"] = (type, p) => !!(p && p.from);
DnD.pickMenu.sortex = (pick, anchor) => {
  const p = pick.payload || {};
  const items = SortEx.levels(S()).filter((v) => v.l.id !== p.from).map((v) => ({ icon: "tag", label: v.l.displayName || v.l.name, fn: () => { DnD.clearPick(); SortEx.place(p.id, v.l.id); } }));
  if (p.from) items.push("-", { icon: "undo", label: "Terug naar de stapel", fn: () => { DnD.clearPick(); SortEx.place(p.id, ""); } });
  Menu.open(anchor, items);
};
Actions["sortex-set"] = (el) => { const x = SortEx.st(); if (x.set !== el.dataset.v) { x.set = el.dataset.v; x.placed = {}; x.last = null; } App.render(); };
Actions["sortex-mode"] = (el) => { SortEx.st().mode = el.dataset.v === "discussie" ? "discussie" : "oefenen"; App.render(); };
Actions["sortex-reset"] = () => { const x = SortEx.st(); x.placed = {}; x.last = null; App.render(); };
Actions["schema-tab"] = (el) => { UI.schemaTab = el.dataset.tab === "sort" ? "sort" : "labels"; App.render(); };

registerView("schema", {
  title: "Classificatieschema",
  fac: {
    duration: 30,
    goal: "Het classificatieschema uit Know your Data vertalen naar sensitivity labels en sublabels, in de juiste volgorde (prioriteit).",
    questions: ["Welke niveaus kent het schema (bijv. Openbaar – Intern – Vertrouwelijk – Strikt vertrouwelijk)?", "Zijn er doelgroepen die een eigen sublabel nodig hebben (HR, Directie, Medisch)?", "Begrijpt een medewerker in één oogopslag welk label hij moet kiezen (tooltip)?"],
    tips: ["Sleep labels om de volgorde te wijzigen; onderaan = hoogste prioriteit (meest gevoelig).", "Sleep een label op het vak ‘sublabel’ van een hoofdlabel om te nesten.", "Gebruik ‘Importeren’ om een schema uit Excel/Word te plakken.", "Tabblad ‘Wat is wat?’: laat de groep voorbeelddocumenten op de eigen niveaus leggen (discussie of oefenen) – zo test je of het schema in de praktijk werkt."],
    pitfalls: ["Meer dan ~5 hoofdlabels: gebruikers kiezen dan vaak verkeerd.", "Een parent-label met sublabels kan zelf niet worden toegepast – plan instellingen op de sublabels.", "Labelnamen later wijzigen: de Name (technisch) is na aanmaken niet te wijzigen, de Display name wel."],
    links: ["labels", "labelsCreate", "labelsLimits"],
  },
  done: (st) => applicableLabels(st).length >= 2,
  render() {
    const st = S();
    const ls = orderedLabels(st);
    const sel = VH.selLabel("schema", st);
    const between = (parent, before) => `<div class="drop-between" data-drop="label" data-zone="schema-move" data-target='${attr({ parent, before })}'></div>`;
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
      return `<div class="label-card${l.parentId ? " sub" : ""}${sel && sel.id === l.id ? " selected" : ""}" style="--lc:${esc(l.color)}" data-drag="label" data-payload='${attr({ id: l.id })}' data-action="schema-sel" data-id="${id}">
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
            <div class="lc-chips">${sc}${nS ? `<span class="badge info" title="${nS} informatietype${nS === 1 ? "" : "n"} gekoppeld" aria-label="${nS} informatietype${nS === 1 ? "" : "n"}">${icon("search", "s")}${nS}</span>` : ""}${l.profile ? `<span class="badge info" title="Profiel op het Ontwerpbord">${esc((CATALOG.profiles.find((p) => p.id === l.profile) || {}).name || "")}</span>` : ""}${l.audience ? `<span class="badge lic">${esc(l.audience)}</span>` : ""}</div>
          </div></div>
        ${l.parentId ? "" : `<div class="lc-drop no-drag" data-drop="label" data-zone="schema-nest" data-target='${attr({ parent: l.id })}' data-action="schema-add-sub" data-id="${id}" tabindex="-1" aria-hidden="true" title="Klik om een sublabel toe te voegen – of sleep een bestaand label hierheen">${icon("plus", "s")}<span>Sublabel</span></div>`}
      </div>`;
    };
    let list = "";
    ls.filter((l) => !l.parentId).forEach((t) => {
      list += between(null, t.id) + card(t);
      const kids = childrenOf(t.id, st);
      kids.forEach((c) => { list += between(t.id, c.id) + card(c); });
      if (kids.length) list += between(t.id, null);
    });
    list += between(null, null);

    const left = `<div class="card"><div class="card-head">${icon("tag")}<h3>Labels &amp; prioriteit</h3><span class="small muted">Minst gevoelig bovenaan</span></div>
      ${ls.length ? `<div class="schema-list">${list}</div>` : emptyState("tag", "Nog geen labels", "Voeg labels toe, importeer het schema uit Know your Data, of kies een preset op de startpagina.")}
      <div class="row mt-2"><button class="btn primary" data-action="schema-add">${icon("plus")} Label</button><button class="btn" data-action="schema-import">${icon("upload")} Schema importeren (plakken)</button><span class="spacer"></span><span class="xs muted">Sleep om te ordenen ${infoTip("Sleep een label om de volgorde te wijzigen; sleep het op het vak ‘sublabel’ van een hoofdlabel om te nesten.")}</span></div>
    </div>`;
    const head = pageHead("Input · Know your Data", "Classificatieschema", "Jullie classificatieniveaus als sensitivity labels.", "", `<p class="mb-1">Zet jullie classificatieniveaus om naar sensitivity labels – van minst naar meest gevoelig. De volgorde is de <b>labelprioriteit</b>: het onderste label is het meest gevoelig. Purview gebruikt dit o.a. voor justificatie bij verlagen, auto-labeling en welke DLP-regel voorgaat. Sublabels gaan maximaal één niveau diep.</p><div class="row tight">${learn("labels")} ${learn("labelsCreate", "Labels maken")}</div>`);
    if (UI.sub.schema && UI.sub.schema !== UI._schemaSubSeen) { UI._schemaSubSeen = UI.sub.schema; if (UI.sub.schema === "sort" || UI.sub.schema === "labels") UI.schemaTab = UI.sub.schema; else if (labelById(UI.sub.schema, st)) UI.schemaTab = "labels"; }
    const tab = UI.schemaTab === "sort" ? "sort" : "labels";
    const tb = tabs("schema", [["labels", "Labels &amp; prioriteit"], ["sort", "Wat is wat?", `<span class="badge info">oefening</span>`]], tab, { label: "Classificatieschema" }).replace(/data-action="go" data-route="schema" data-sub="/g, 'data-action="schema-tab" data-tab="');
    if (tab === "sort") return `${head}${tb}${SortEx.render(st)}`;
    return `${head}${tb}
      <div class="split wide-left">${left}<div class="sticky schema-ed">${sel ? this.editor(sel, st) : `<div class="card">${emptyState("edit", "Geen label geselecteerd", "Klik een label om het te bewerken.")}</div>`}</div></div>`;
  },
  editor(l, st) {
    const kids = hasChildren(l, st);
    const tops = st.labels.filter((x) => !x.parentId && x.id !== l.id);
    const id = esc(l.id);
    const sw = CATALOG.labelColors.map((c) => `<button type="button" class="swatch${c.toUpperCase() === String(l.color).toUpperCase() ? " on" : ""}" style="background:${c}" title="${c}" aria-label="Kleur ${c}" data-action="lbl-color" data-id="${id}" data-value="${c}"></button>`).join("");
    const pre = `lbl:${l.id}:`;
    const pid = "schema-parent-" + String(l.id).replace(/[^\w-]/g, "");
    const filled = !!(l.audience || l.owner || (l.info || []).length);
    return `<div class="card"><div class="card-head"><span class="color-dot" style="background:${esc(l.color)};width:14px;height:14px"></span><h3>${esc(labelFullName(l, st))}</h3><button class="btn small" data-action="go" data-route="labels" data-sub="${id}">${icon("settings", "s")} Instellingen</button></div>
      ${F.text(pre + "displayName", "Display name", { maxlength: 64, render: true })}
      ${F.textarea(pre + "tooltip", "Description for users (tooltip)", { rows: 2, ph: "Wanneer kies je dit label? Schrijf vanuit de gebruiker." })}
      <div class="field"><div class="field-label">Label color ${l.parentId ? `<span class="muted xs">(sublabels erven de kleur van de parent)</span>` : ""}</div>${l.parentId ? `<span class="small muted">${esc(l.color)}</span>` : `<div class="swatches">${sw}<input type="color" data-bind="${pre}color" data-onchange="lblColor" value="${esc(l.color)}" title="Eigen kleur" aria-label="Eigen kleur"></div>`}</div>
      <div class="field"><label for="${pid}">Parent label</label><select id="${pid}" class="select" data-live="schema-parent" data-id="${id}"${kids ? " disabled" : ""}><option value="">– Geen (hoofdlabel) –</option>${tops.map((t) => `<option value="${esc(t.id)}"${l.parentId === t.id ? " selected" : ""}>${esc(t.displayName || t.name)}</option>`).join("")}</select>${kids ? `<div class="hint">Dit label heeft sublabels en kan daarom geen sublabel worden.</div>` : ""}</div>
      <div class="row mb-2"><button class="btn small" data-action="board-sits" data-id="${id}">${icon("search", "s")} Informatietypen koppelen (${labelSits(l, st).length})</button></div>
      ${accordion("schema-more", `Meer velden <span class="muted small" style="font-weight:400">doelgroep, voorbeelden${filled ? " · ingevuld" : ""}</span>`, `
        ${F.text(pre + "audience", "Doelgroep (Know your Data)", { ph: "Bijv. HR, Directie, Behandelaars" })}
        ${F.text(pre + "owner", "Eigenaar (rol)", { ph: "Bijv. HR-manager", hint: "Wie beslist over dit label en beoordeelt uitzonderingen?" })}
        ${F.textarea(pre + "info", "Informatieobjecten / voorbeelden", { type: "lines", rows: 3, ph: "Eén per regel, bijv. Arbeidsovereenkomst", hint: "Herkenning via informatietypen/classifiers koppel je bij Informatietypen." })}`)}
      ${accordion("schema-tech", `Technische details <span class="muted small" style="font-weight:400">Name, Description for admins</span>`, `
        ${F.text(pre + "name", "Name (technisch)", { maxlength: 64, hint: `Technische naam in Purview: <code>${esc(labelTechName(l, st))}</code> – na aanmaken niet meer te wijzigen.`, render: false })}
        ${F.textarea(pre + "adminDesc", "Description for admins", { rows: 2 })}`)}
      ${accordion("schema-rules", `Spelregels in Purview <span class="badge neutral">${(CATALOG.labelLimits || []).length}</span>`, `<ul class="tight small">${(CATALOG.labelLimits || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`)}
    </div>`;
  },
});

function _nextColor(st) { return CATALOG.labelColors[st.labels.filter((l) => !l.parentId).length % CATALOG.labelColors.length]; }
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
      if (!name) { $("#sub-name", m).classList.add("invalid"); return true; }
      _schemaAddSub(p.id, name, $("#sub-src", m).value, $("#sub-owner", m).value.trim());
    } }],
  });
};
function _schemaAddSub(parentId, name, srcId, owner) {
  let id, first = false, src = null;
  Store.update((st) => {
    const p = labelById(parentId, st);
    first = !hasChildren(p, st);
    const l = newLabel(name, { parentId: p.id, color: p.color, owner });
    st.labels.push(l); id = l.id;
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
  const extra = first ? " Het hoofdlabel zelf is nu niet meer te kiezen." : "";
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
  if (err) { Toast.show(esc(err), "warn"); App.render(); } else _promotedToast(el.dataset.id, was);
};
Actions["lbl-color"] = (el) => Store.update((st) => {
  const l = labelById(el.dataset.id, st);
  l.color = el.dataset.value;
  childrenOf(l.id, st).forEach((c) => (c.color = l.color));
});
Actions["schema-import"] = () => promptDialog("Classificatieschema importeren", "Eén label per regel", "", (txt) => {
  let n = 0, header = false, inherited = false;
  Store.update((st) => {
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
    syncHierarchy(st);
    if (typeof syncParentPublish === "function") syncParentPublish(st);
    Generator.ensureGroupPolicies(st);
  });
  Toast.show(`${n} label(s) geïmporteerd.${header ? " Kopregel overgeslagen." : ""}`, "ok");
  if (inherited) Toast.show("Sublabels hebben de instellingen van hun hoofdlabel overgenomen.", "info", 5000);
}, { multiline: true, rows: 8, ph: "Openbaar; Vrij te delen\nIntern; Voor alle medewerkers\nVertrouwelijk\n  Externe partners\nStrikt vertrouwelijk / HR; Personeelsdossiers", hint: "Plak uit Excel (naam + tooltip, of Label | Sublabel | Omschrijving) of typ ‘naam; tooltip’. Volgorde = laag → hoog. Sublabel: inspringen of ‘Hoofdlabel / Sub’.", okLabel: "Importeren" });
