/* View: Labelbeleid (label policies) – publicatie van labels naar doelgroepen, policy settings, default labels, volgorde. */

/** Voegt een aria-label toe aan het eerste formulierelement in een F.*-fragment. */
function _lpAria(html, label) { return html.replace(/<(input|select|textarea) /, (m) => `${m}aria-label="${esc(label)}" `); }

const PolicyUI = {
  summary(gp, st, short = false) {
    const p = gp.policy, s = p.settings || {};
    const gs = (p.groups || []).map((g) => (byId(st.groups, g) || {}).name).filter(Boolean);
    const who = p.scope === "all" ? "alle gebruikers" : (short && gs.length ? plural(gs.length, "doelgroep", "doelgroepen") : gs.join(", ") || "nog geen doelgroep");
    const dl = s.defaultDocs && labelById(s.defaultDocs, st);
    return [who, plural(gp.labels.length, "label", "labels"), `standaard: ${dl ? labelFullName(dl, st) : "geen"}`, !short && s.mandatoryDocs ? "verplicht labelen" : "", !short && s.justification ? "reden bij verlagen" : ""].filter(Boolean).join(" · ");
  },
  scopes(labels) {
    const s = { files: false, emails: false, meetings: false, sites: false };
    labels.forEach((l) => Object.keys(s).forEach((k) => { if (l.cfg.scope[k]) s[k] = true; }));
    return s;
  },
  defaultOptions(labels, st, scope, sameAsDocs) {
    const opts = [["", "None"]];
    if (sameAsDocs) opts.push(["sameAsDocs", "Same as document"]);
    labels.filter((l) => !hasChildren(l, st) && l.cfg.scope[scope]).forEach((l) => opts.push([l.id, labelFullName(l, st)]));
    return opts;
  },
  settingVisible(key, sc) {
    return ({
      justification: sc.files || sc.emails || sc.meetings,
      mandatoryDocs: sc.files, mandatoryEmail: sc.emails, mandatoryMeetings: sc.meetings, mandatorySites: sc.sites, mandatoryFabric: sc.files,
      helpLink: true,
    })[key];
  },
  issues(gp, st, idx) {
    const p = gp.policy, s = p.settings || {}, out = [];
    const ids = new Set(gp.labels.map((l) => l.id));
    if (!gp.labels.length) out.push(["err", "Dit beleid publiceert nog geen labels."]);
    if (p.scope === "groups" && !(p.groups || []).length) out.push(["err", "Kies minstens één doelgroep (of ‘All users and groups’)."]);
    CATALOG.labelPolicyDefaults.forEach((d) => {
      const v = s[d.key];
      if (!v || v === "sameAsDocs") return;
      const l = labelById(v, st);
      if (!l) out.push(["err", `${d.name}: het gekozen label bestaat niet meer.`]);
      else if (!ids.has(v)) out.push(["err", `${d.name}: ‘${esc(labelFullName(l, st))}’ wordt niet door dit beleid gepubliceerd.`]);
      else if (hasChildren(l, st)) out.push(["err", `${d.name}: een parent-label kan niet als default worden toegepast.`]);
      else if (!l.cfg.scope[d.scope]) out.push(["err", `${d.name}: ‘${esc(labelFullName(l, st))}’ heeft de scope niet.`]);
      else if (d.key === "defaultDocs" || d.key === "defaultEmail") {
        if (l.cfg.encryption.mode === "userDefined") out.push(["err", `${d.name}: een default label met door gebruiker bepaalde rechten vraagt bij elk nieuw item om rechten. Kies een label zonder encryptie.`]);
        else if (l.cfg.encryption.mode === "assignNow") out.push(["warn", `${d.name}: het default label versleutelt; elk nieuw ${d.key === "defaultDocs" ? "document" : "bericht"} wordt versleuteld (impact op delen, zoeken en externen).`]);
      }
    });
    if (s.defaultEmail === "sameAsDocs" && !s.defaultDocs) out.push(["info", "‘Same as document’ zonder default label voor documenten betekent: geen default voor e-mail."]);
    if (s.mandatoryDocs && !s.defaultDocs) out.push(["info", "Verplicht labelen zonder default label: gebruikers moeten bij elk document zelf kiezen (meer frictie, wel bewuster)."]);
    if (s.helpLink && !/^(https?:\/\/|mailto:)/i.test(s.helpLink)) out.push(["warn", "De help-link moet beginnen met https://, http:// of mailto:."]);
    if (p.scope === "groups" && idx > 0) {
      const overlap = Generator.labelPolicies(st).filter((x) => x.id !== p.id && x.policy.scope === "groups" && (x.policy.groups || []).some((g) => (p.groups || []).includes(g)));
      if (overlap.length) out.push(["info", `Overlap in doelgroep met ${overlap.map((x) => `‘${esc(x.name)}’`).join(", ")}: gebruikers krijgen alle labels; de settings komen van het beleid met de hoogste order (onderaan).`]);
    }
    return out;
  },
  /** Kleine matrix: welke doelgroep ziet welke labels (Iedereen = beleid voor alle gebruikers). */
  whoSees(gps, st) {
    const cols = [{ id: "__all", name: "Iedereen" }];
    gps.forEach((gp) => { if (gp.policy.scope !== "all") (gp.policy.groups || []).forEach((gid) => { const g = byId(st.groups, gid); if (g && !cols.some((c) => c.id === g.id)) cols.push({ id: g.id, name: g.name.replace(/^Doelgroep – /, "") }); }); });
    const ls = applicableLabels(st);
    if (!ls.length || cols.length < 2) return "";
    const sees = (l, cid) => gps.some((gp) => gp.labels.some((x) => x.id === l.id) && (gp.policy.scope === "all" || (cid !== "__all" && (gp.policy.groups || []).includes(cid))));
    const rows = ls.map((l) => `<tr><td><span class="color-dot" style="background:${esc(l.color)}"></span> ${esc(labelFullName(l, st))}</td>${cols.map((c) => `<td>${sees(l, c.id) ? `<span style="color:var(--ok)" aria-label="ja">${icon("check", "s")}</span>` : `<span class="muted" aria-label="nee">–</span>`}</td>`).join("")}</tr>`).join("");
    return accordion("lp-who", `${icon("eye", "s")} Wie ziet welke labels`, `<div class="table-wrap"><table class="table compact wsl-matrix"><thead><tr><th>Label</th>${cols.map((c) => `<th>${esc(c.name)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div><p class="xs muted mt-1">Leden van een doelgroep zien ook alle labels van ‘Iedereen’.</p>`);
  },
  card(gp, st, i, n) {
    const p = gp.policy, id = p.id, sc = this.scopes(gp.labels), isAll = p.scope === "all";
    const explicit = new Set(p.labels || []);
    const chips = gp.labels.map((l) => {
      const imp = !explicit.has(l.id), par = hasChildren(l, st);
      return `<span class="chip" title="${imp ? (par ? "Hoofdlabel: wordt automatisch meegepubliceerd zolang er een sublabel in dit beleid zit" : "Komt uit de publicatiekeuze op het ontwerpbord (rij Publicatie). Wijzig het daar om het hier te verwijderen.") : "Expliciet toegevoegd"}"><span class="color-dot" style="background:${esc(l.color)}"></span>${esc(labelFullName(l, st))}${imp ? ` <span class="muted xs">${par ? "automatisch (bovenliggend label)" : "via ontwerpbord"}</span>` : `<button class="chip-x" data-action="lp-label-del" data-id="${esc(id)}" data-label="${esc(l.id)}" title="Verwijderen" aria-label="${esc(labelFullName(l, st))} uit dit beleid halen">${icon("x", "s")}</button>`}</span>`;
    }).join("");
    const groups = (p.groups || []).map((g) => byId(st.groups, g)).filter(Boolean).map((g) => `<span class="chip">${icon(g.kind === "domain" ? "link" : "users", "s")}${esc(g.name)}${g.value ? ` <span class="muted xs">${esc(g.value)}</span>` : ""}<button class="chip-x" data-action="lp-group-del" data-id="${esc(id)}" data-group="${esc(g.id)}" title="Verwijderen" aria-label="${esc(g.name)} uit dit beleid halen">${icon("x", "s")}</button></span>`).join("");
    const settings = CATALOG.labelPolicySettings.filter((s) => this.settingVisible(s.key, sc)).map((s) => s.key === "helpLink"
      ? `<div class="check-row">${F.text(`lp:${id}:settings.helpLink`, s.name, { ph: "https://intranet/classificatie", cls: "f-1", hint: "Begint met https:// of mailto:" })}${infoTip(s.desc)}</div>`
      : `<div class="check-row">${F.check(`lp:${id}:settings.${s.key}`, esc(s.name))}${infoTip(s.desc)}</div>`).join("");
    const defaults = CATALOG.labelPolicyDefaults.filter((d) => sc[d.scope] && (d.key !== "defaultFabric" || true)).map((d) => F.select(`lp:${id}:settings.${d.key}`, d.name, this.defaultOptions(gp.labels, st, d.scope, d.sameAsDocs && sc.files))).join("");
    const adv = CATALOG.labelPolicyAdvanced.map((a) => {
      const spec = `lp:${id}:adv.${a.key}`;
      if (a.type === "bool") return `<div class="check-row">${F.check(spec, `<span class="mono">${esc(a.name)}</span>`)}${infoTip(a.desc)}</div>`;
      if (a.type === "enum") return F.select(spec, `<span class="mono">${esc(a.name)}</span>`, a.options, { hint: a.desc });
      return F.select(spec, `<span class="mono">${esc(a.name)}</span>`, [["", "Niet ingesteld"], ["None", "None"], ...gp.labels.filter((l) => !hasChildren(l, st) && l.cfg.scope.emails).map((l) => [l.id, labelFullName(l, st)])], { hint: a.desc });
    }).join("");
    const iss = this.issues(gp, st, i);
    const nErr = iss.filter((x) => x[0] === "err").length, nWarn = iss.filter((x) => x[0] === "warn").length;
    const badge = nErr ? `<span class="badge err">${plural(nErr, "fout", "fouten")}</span>` : nWarn ? `<span class="badge warn">${plural(nWarn, "aandachtspunt", "aandachtspunten")}</span>` : `<span class="badge ok" title="In orde" aria-label="In orde">${icon("check", "s")}</span>`;
    const summ = `<span class="prio-num" title="Order ${gp.order}: hoe lager in de lijst, hoe hoger de prioriteit">${gp.order + 1}</span><span class="pc-sum"><b class="pc-name">${esc(p.name)}</b><span class="pc-meta" title="${esc(this.summary(gp, st))}">${esc(this.summary(gp, st, true))}</span></span>${badge}`;
    const body = `<div class="pc-body">
        <div class="pc-namerow"><label class="field-label" for="lp-name-${esc(id)}">Naam</label>
        <input class="input" id="lp-name-${esc(id)}" data-bind="lp:${esc(id)}:name" value="${esc(p.name)}" maxlength="64" aria-label="Naam van het labelbeleid">
        ${!isAll ? `<button class="icon-btn" data-action="lp-move" data-id="${esc(id)}" data-dir="-1" title="Hoger in de lijst (lagere prioriteit)" aria-label="Hoger in de lijst"${i <= 1 ? " disabled" : ""}>${icon("chevronleft", "s")}</button><button class="icon-btn" data-action="lp-move" data-id="${esc(id)}" data-dir="1" title="Lager in de lijst (hogere prioriteit)" aria-label="Lager in de lijst"${i >= n - 1 ? " disabled" : ""}>${icon("chevronright", "s")}</button>` : ""}
        <button class="icon-btn" data-action="lp-dup" data-id="${esc(id)}" title="Dupliceren" aria-label="Labelbeleid dupliceren">${icon("copy", "s")}</button>
        ${n > 1 ? `<button class="icon-btn" data-action="lp-del" data-id="${esc(id)}" title="Verwijderen" aria-label="Labelbeleid verwijderen">${icon("trash", "s")}</button>` : ""}</div>
        <div class="grid-2">
          <div><div class="field-label">${icon("tag", "s")} Labels to publish</div>
            <div class="pc-drop" data-drop="pub-label" data-zone="lp-labels" data-target="${attr({ policyId: id })}">${chips ? `<div class="chip-list">${chips}</div>` : `<div class="drop-hint">Sleep labels hierheen</div>`}</div></div>
          <div><div class="field-label">${icon("users", "s")} Users and groups</div>
            <label class="check"><input type="checkbox" data-action="lp-all" data-id="${esc(id)}"${isAll ? " checked" : ""}><span>All users and groups</span></label>
            ${!isAll ? `<div class="pc-drop" data-drop="pub-group" data-zone="lp-groups" data-target="${attr({ policyId: id })}">${groups ? `<div class="chip-list">${groups}</div>` : `<div class="drop-hint">Sleep een groep hierheen (wie dit beleid krijgt)</div>`}</div>` : ""}
          </div>
        </div>
        <div class="grid-2 mt-2">
          <div><div class="field-label">Policy settings</div>${settings}</div>
          <div><div class="field-label">Default labels</div>${defaults || `<div class="muted small">Geen labels met passende scope.</div>`}</div>
        </div>
        ${accordion(`lp-tech-${id}`, `${icon("code", "s")} Technische details <span class="muted xs">admin units · advanced settings</span>`, `${F.text(`lp:${id}:adminUnitsText`, "Admin units (optioneel)", { ph: "bijv. AU-Zorg", hint: "Beperk het beleid tot administrative units (Entra ID)." })}
          <div class="field-label">Advanced settings (PowerShell)</div>${adv}<div class="muted xs">Alleen via <span class="mono">Set-LabelPolicy -AdvancedSettings</span>. ${learn("newLabelPolicy", "Set-LabelPolicy")}</div>`)}
        ${iss.length ? `<div class="mt-2">${iss.map(([k, t]) => msg(k, t)).join("")}</div>` : ""}
      </div>`;
    return `<div class="policy-card mb-2">${accordion(`lp-${id}`, summ, body, n === 1 || nErr > 0)}</div>`;
  },
};

function _removeGroupRefs(st, gid) {
  st.labelPolicies.forEach((p) => { p.groups = (p.groups || []).filter((g) => g !== gid); });
  st.labels.forEach((l) => {
    l.cfg.publish.groups = (l.cfg.publish.groups || []).filter((g) => g !== gid);
    if (l.cfg.publish.audience === "groups" && !l.cfg.publish.groups.length) l.cfg.publish.audience = "all";
    l.cfg.encryption.permissions = l.cfg.encryption.permissions.filter((p) => p.groupId !== gid);
  });
  st.groups = st.groups.filter((g) => g.id !== gid);
  Generator.ensureGroupPolicies(st);
}

/* ---------- Drag & drop ---------- */
DnD.register("lp-labels", (type, p, t) => Store.update((st) => {
  const pol = byId(st.labelPolicies, t.policyId), l = labelById(p.labelId, st);
  if (!pol || !l) return;
  const ids = [l.id, ...childrenOf(l.id, st).map((c) => c.id)];
  pol.labels = unique([...(pol.labels || []), ...ids]);
  Toast.show(`${esc(labelFullName(l, st))} toegevoegd aan ${esc(pol.name)}.`, "ok");
}));
DnD.register("lp-groups", (type, p, t) => Store.update((st) => {
  const pol = byId(st.labelPolicies, t.policyId), g = byId(st.groups, p.groupId);
  if (!pol || !g) return;
  if (g.kind === "all") { pol.scope = "all"; pol.groups = []; return; }
  pol.scope = "groups";
  pol.groups = unique([...(pol.groups || []), g.id]);
}));

/* ---------- Acties ---------- */
Actions["lp-add"] = () => {
  const st0 = S();
  const used = new Set(st0.labelPolicies.flatMap((p) => p.groups || []));
  const gs = st0.groups.filter((g) => g.kind === "group");
  const first = gs.find((g) => !used.has(g.id));
  const sug = (g) => (g ? `Labelbeleid – ${g.name.replace(/^Doelgroep – /, "")}` : `Labelbeleid ${st0.labelPolicies.length + 1}`).slice(0, 64);
  Modal.open({
    title: "Nieuw labelbeleid",
    body: `<div class="field"><label for="lp-new-grp">Voor welke doelgroep?</label><select id="lp-new-grp" class="select"><option value="">Later kiezen</option>${gs.map((g) => `<option value="${esc(g.id)}"${first && g.id === first.id ? " selected" : ""}>${esc(g.name)}</option>`).join("")}</select><div class="field-hint">Wie dit beleid krijgt. Een nieuwe doelgroep maak je onder Doelgroepen.</div></div>
      <div class="field"><label for="lp-new-name">Naam</label><input id="lp-new-name" class="input" maxlength="64" value="${esc(sug(first))}"></div>`,
    focus: "#lp-new-name",
    buttons: [{ label: "Annuleren" }, { label: "Toevoegen", primary: true, fn: (m) => {
      const name = ($("#lp-new-name", m).value || "").trim() || sug(null);
      const gid = $("#lp-new-grp", m).value;
      Store.update((st) => {
        const g = st.labelPolicies.find((p) => p.scope === "all");
        st.labelPolicies.push({ id: uid("lp"), name: name.slice(0, 64), scope: "groups", groups: gid ? [gid] : [], labels: [], settings: clone(g ? g.settings : defaultLabelPolicySettings()), adv: clone(g ? g.adv || {} : {}) });
      });
      Toast.show(`Labelbeleid <b>${esc(name)}</b> toegevoegd. Sleep nu de labels erin.`, "ok");
    } }],
  });
  setTimeout(() => {
    const sel = $("#lp-new-grp"), nm = $("#lp-new-name");
    if (!sel || !nm) return;
    nm.addEventListener("input", () => { nm.dataset.edited = "1"; });
    sel.addEventListener("change", () => { if (!nm.dataset.edited) nm.value = sug(byId(S().groups, sel.value)); });
  }, 30);
};
Actions["lp-dup"] = (el) => Store.update((st) => {
  const p = byId(st.labelPolicies, el.dataset.id); if (!p) return;
  const c = clone(p); c.id = uid("lp"); c.name = (p.name + " (kopie)").slice(0, 64); c.auto = false;
  if (c.scope === "all") { c.scope = "groups"; c.groups = []; }
  st.labelPolicies.push(c);
});
Actions["lp-del"] = (el) => {
  const p = byId(S().labelPolicies, el.dataset.id); if (!p) return;
  confirmDialog("Labelbeleid verwijderen?", `‘${esc(p.name)}’ wordt verwijderd. Labels die alleen via dit beleid zichtbaar waren, zijn dan niet meer gepubliceerd.`, () => Store.update((st) => {
    st.labelPolicies = st.labelPolicies.filter((x) => x.id !== p.id);
    if (p.auto) st.labels.forEach((l) => { if (l.cfg.publish.audience === "groups" && (l.cfg.publish.groups || []).some((g) => (p.groups || []).includes(g))) { l.cfg.publish.groups = l.cfg.publish.groups.filter((g) => !(p.groups || []).includes(g)); if (!l.cfg.publish.groups.length) l.cfg.publish.audience = "all"; } });
  }), "Verwijderen", true);
};
Actions["lp-move"] = (el) => Store.update((st) => {
  const order = Generator.labelPolicies(st).map((x) => x.id);
  const i = order.indexOf(el.dataset.id), j = i + Number(el.dataset.dir);
  if (i < 0 || j < 0 || j >= order.length) return;
  if (byId(st.labelPolicies, order[i]).scope === "all" || byId(st.labelPolicies, order[j]).scope === "all") return;
  [order[i], order[j]] = [order[j], order[i]];
  st.labelPolicies = order.map((id) => byId(st.labelPolicies, id));
});
Actions["lp-label-del"] = (el) => Store.update((st) => {
  const p = byId(st.labelPolicies, el.dataset.id); if (!p) return;
  const rm = [el.dataset.label, ...childrenOf(el.dataset.label, st).map((c) => c.id)];
  p.labels = (p.labels || []).filter((x) => !rm.includes(x));
  _lpPruneParents(st, p);
});
/** Een hoofdlabel staat alleen in een beleid samen met minstens één sublabel. */
function _lpPruneParents(st, p) {
  p.labels = (p.labels || []).filter((id) => { const l = labelById(id, st); return !l || !hasChildren(l, st) || childrenOf(id, st).some((c) => p.labels.includes(c.id)); });
}
Actions["lp-group-del"] = (el) => Store.update((st) => {
  const p = byId(st.labelPolicies, el.dataset.id); if (!p) return;
  p.groups = (p.groups || []).filter((g) => g !== el.dataset.group);
});
Actions["lp-all"] = (el) => Store.update((st) => {
  const p = byId(st.labelPolicies, el.dataset.id); if (!p) return;
  if (p.scope === "all") { p.scope = "groups"; } else { p.scope = "all"; p.groups = []; }
});
Actions["grp-add"] = () => promptDialog("Nieuwe doelgroep", "Naam", "", (val) => {
  const name = String(val || "").trim().slice(0, 64) || "Nieuwe doelgroep";
  Store.update((st) => { st.groups.push({ id: uid("grp"), name, kind: "group", value: "" }); });
  Toast.show(`Doelgroep <b>${esc(name)}</b> toegevoegd. Vul het e-mailadres van de groep in en sleep hem naar ‘Users and groups’.`, "ok");
}, { ph: "Bijv. HR-medewerkers", hint: "Een (mail-enabled) groep uit Entra ID. Het e-mailadres vul je daarna in.", okLabel: "Toevoegen" });
Actions["grp-del"] = (el) => {
  const g = byId(S().groups, el.dataset.id); if (!g) return;
  confirmDialog("Doelgroep verwijderen?", `‘${esc(g.name)}’ wordt verwijderd uit labelbeleid, publicatie en encryptierechten.`, () => Store.update((st) => _removeGroupRefs(st, g.id)), "Verwijderen", true);
};

/* ---------- View ---------- */
registerView("policies", {
  title: "Labelbeleid",
  fac: {
    duration: 30,
    goal: "Bepalen welke medewerkers welke labels zien, welk label standaard wordt toegepast en hoeveel vrijheid gebruikers hebben.",
    questions: ["Zien alle medewerkers dezelfde labels, of heeft een afdeling (bijv. HR, Directie) extra labels nodig?", "Welk label krijgt een nieuw document of nieuwe mail standaard – en mag dat label versleutelen?", "Moet een medewerker een reden opgeven bij het verlagen of verwijderen van een label? Is labelen verplicht?"],
    tips: ["Start met één beleid voor alle gebruikers; voeg alleen een extra beleid toe voor groepen met extra labels.", "Het beleid onderaan de lijst wint bij conflicterende instellingen.", "Verwijs met de help-link naar een intranetpagina met jullie classificatiebeleid."],
    pitfalls: ["Een default label met encryptie: elk nieuw document wordt versleuteld (impact op delen en externen).", "Verplicht labelen zonder default label en zonder training: veel frictie en ‘willekeurig’ gekozen labels.", "Doelgroepen zonder (mail-enabled) groep in Entra ID: het beleid is dan niet toe te wijzen."],
    links: ["labelsGetStarted", "newLabelPolicy"],
  },
  render() {
    const st = S();
    if (!st.labels.length) return VH.needLabels();
    const gps = Generator.labelPolicies(st);
    const published = new Set(gps.flatMap((g) => g.labels.map((l) => l.id)));
    const unpub = applicableLabels(st).filter((l) => !published.has(l.id));
    const palette = orderedLabels(st).map((l) => `<div class="chip" style="cursor:grab${l.parentId ? ";margin-left:12px" : ""}" data-drag="pub-label" data-tap="1" data-pick-label="${esc(labelFullName(l, st))}" data-payload="${attr({ labelId: l.id })}" title="${esc(labelFullName(l, st))}"><span class="color-dot" style="background:${esc(l.color)}"></span>${esc(l.parentId ? "↳ " + labelShortName(l) : labelShortName(l))}${hasChildren(l, st) ? ' <span class="muted xs">+ sublabels</span>' : ""}</div>`).join("");
    const groups = st.groups.map((g) => g.kind === "all"
      ? `<div class="row tight mb-1"><div class="chip" style="cursor:grab" data-drag="pub-group" data-tap="1" data-pick-label="${esc(g.name)}" data-payload="${attr({ groupId: g.id })}" title="All users and groups">${icon("users", "s")}${esc(g.name)}</div></div>`
      : `<div class="grp-card lb-grp"><div class="row tight nowrap"><span class="chip" style="cursor:grab" data-drag="pub-group" data-tap="1" data-pick-label="${esc(g.name)}" data-payload="${attr({ groupId: g.id })}" title="Sleep naar ‘Users and groups’">${icon("grip", "s")}${icon(g.kind === "domain" ? "link" : "users", "s")}</span>
          <div class="f-1">${_lpAria(F.select(`grp:${g.id}:kind`, "", [["group", "Groep / gebruiker"], ["domain", "Domein / extern adres"]], { cls: "mb-0" }), `Soort doelgroep ${g.name}`)}</div>
          <button class="icon-btn" data-action="grp-del" data-id="${esc(g.id)}" title="Verwijderen" aria-label="Doelgroep ${esc(g.name)} verwijderen">${icon("trash", "s")}</button></div>
          <input class="input mt-1" style="width:100%" data-bind="grp:${esc(g.id)}:name" value="${esc(g.name)}" title="${esc(g.name)}" data-render="1" aria-label="Naam van de doelgroep">
          <div class="mt-1">${g.kind === "domain" ? _lpAria(F.textarea(`grp:${g.id}:value`, "", { rows: 2, ph: "bijv. ketenpartner.nl", cls: "mb-0" }), `Domeinen ${g.name}`) : _lpAria(F.text(`grp:${g.id}:value`, "", { ph: "hr@contoso.nl", cls: "mb-0" }), `E-mailadres ${g.name}`)}</div>
          ${g.kind === "domain" ? `<div class="muted xs mt-1">Eén domein per regel ${infoTip("Eén domein per regel; geen e-mailadressen. Bij een organisatie met Microsoft Entra ID krijgen álle geverifieerde domeinen van die tenant toegang, niet alleen het opgegeven domein. Ontvangers zonder Microsoft-account kunnen versleutelde inhoud niet openen.")}</div>` : ""}
          ${g.kind === "group" && !g.value ? `<div class="muted xs mt-1">${icon("warning", "s")} Vul het e-mailadres van de (mail-enabled) groep in.</div>` : ""}</div>`).join("");
    const who = PolicyUI.whoSees(gps, st);
    return `${pageHead("Labels", "Labelbeleid", "Bepaal wie welke labels ziet en wat de standaard is.", `<button class="btn primary" data-action="lp-add">${icon("plus", "s")} Beleid toevoegen</button>`, `<p class="mb-1">Een label policy publiceert labels naar gebruikers en groepen, met standaardlabels en verplichtingen. Bij meerdere policies wint de policy die het laagst in de lijst staat. Labels ‘via ontwerpbord’ komen uit de publicatiekeuze op het Ontwerpbord.</p>${learn("labelsGetStarted", "Publish sensitivity labels")} · ${learn("newLabelPolicy", "New-LabelPolicy")}`)}
      ${unpub.length ? msg("warn", `Niet gepubliceerd: ${unpub.map((l) => `<b>${esc(labelFullName(l, st))}</b>`).join(", ")}. Gebruikers zien deze labels niet.`) : ""}
      <div class="split wide-left lp-split"><div>
        ${gps.map((gp, i) => PolicyUI.card(gp, st, i, gps.length)).join("")}
      </div><div>
        <div class="card mb-2"><div class="card-head"><h3>${icon("tag")} Labels ${infoTip("Sleep een label naar ‘Labels to publish’ (of klik het en daarna het vak). Een bovenliggend label neemt de sublabels mee.")}</h3></div><div class="chip-list" style="flex-direction:column;align-items:flex-start">${palette}</div></div>
        <div class="card mb-2"><div class="card-head">        <h3>${icon("users")} Doelgroepen ${infoTip("Sleep een groep naar ‘Users and groups’ (wie dit beleid krijgt). Doelgroepen worden gebruikt in labelbeleid én in encryptierechten van labels.")}</h3><button class="btn small" data-action="grp-add">${icon("plus", "s")} Doelgroep</button></div>
                  ${groups}</div>
        ${who}
        ${accordion("lp-limits", `${icon("info", "s")} Limieten & regels <span class="badge neutral">${CATALOG.labelLimits.length}</span>`, `<ul class="small">${CATALOG.labelLimits.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>${learn("labelsLimits", "Limits")}`)}
      </div></div>`;
  },
});
