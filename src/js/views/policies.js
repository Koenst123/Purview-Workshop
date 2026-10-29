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
    const opts = [["", "Geen"]];
    if (sameAsDocs) opts.push(["sameAsDocs", "Zelfde als documenten"]);
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
    if (s.defaultEmail === "sameAsDocs" && !s.defaultDocs) out.push(["info", "‘Zelfde als documenten’ zonder standaardlabel voor documenten betekent: geen default voor e-mail."]);
    if (s.mandatoryDocs && !s.defaultDocs) out.push(["info", "Verplicht labelen zonder default label: gebruikers moeten bij elk document zelf kiezen (meer frictie, wel bewuster)."]);
    if (s.helpLink && !/^(https?:\/\/|mailto:)/i.test(s.helpLink)) out.push(["warn", "De help-link moet beginnen met https://, http:// of mailto:."]);
    if (p.scope === "groups" && idx > 0) {
      const overlap = Generator.labelPolicies(st).filter((x) => x.id !== p.id && x.policy.scope === "groups" && (x.policy.groups || []).some((g) => (p.groups || []).includes(g)));
      if (overlap.length) out.push(["info", `Overlap in doelgroep met ${overlap.map((x) => `‘${esc(x.name)}’`).join(", ")}: gebruikers krijgen alle labels; de settings komen van het beleid met de hoogste order (onderaan).`]);
    }
    return out;
  },
  /** Kleine matrix: welke doelgroep ziet welke labels (Iedereen = beleid voor alle gebruikers). Naslag in het facilitatorpaneel. */
  whoSees(gps, st) {
    const cols = [{ id: "__all", name: "Iedereen" }];
    gps.forEach((gp) => { if (gp.policy.scope !== "all") (gp.policy.groups || []).forEach((gid) => { const g = byId(st.groups, gid); if (g && !cols.some((c) => c.id === g.id)) cols.push({ id: g.id, name: g.name.replace(/^Doelgroep – /, "") }); }); });
    const ls = applicableLabels(st);
    if (!ls.length || cols.length < 2) return "";
    const sees = (l, cid) => gps.some((gp) => gp.labels.some((x) => x.id === l.id) && (gp.policy.scope === "all" || (cid !== "__all" && (gp.policy.groups || []).includes(cid))));
    const rows = ls.map((l) => `<tr><td><span class="color-dot" style="background:${esc(l.color)}"></span> ${esc(labelFullName(l, st))}</td>${cols.map((c) => `<td>${sees(l, c.id) ? `<span style="color:var(--ok)" aria-label="ja">${icon("check", "s")}</span>` : `<span class="muted" aria-label="nee">–</span>`}</td>`).join("")}</tr>`).join("");
    return `<div class="table-wrap"><table class="table compact wsl-matrix"><thead><tr><th>Label</th>${cols.map((c) => `<th>${esc(c.name)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div><p class="xs muted mt-1">Leden van een doelgroep zien ook alle labels van ‘Iedereen’.</p>`;
  },
  /** Klantvriendelijke naam en gevolg per instelling; de Purview-naam staat in de infoTip. */
  NL: {
    justification: ["Reden vragen bij verlagen of verwijderen", "De gebruiker kiest een reden; die is zichtbaar in Activity explorer."],
    mandatoryDocs: ["Label verplicht voor documenten", "Office vraagt om een label voordat het document wordt opgeslagen."],
    mandatoryEmail: ["Label verplicht voor e-mail", "Outlook vraagt om een label voordat de e-mail wordt verzonden."],
    mandatoryMeetings: ["Label verplicht voor meetings", "Een label kiezen bij het plannen van een meeting of afspraak."],
    mandatorySites: ["Label verplicht voor teams, groepen en sites", "Een label kiezen bij het maken van een team, groep of site."],
    mandatoryFabric: ["Label verplicht in Fabric en Power BI", "Een label kiezen bij het opslaan van Fabric- en Power BI-inhoud."],
    helpLink: ["Eigen helppagina", "Link onder ‘Meer informatie’ in de Sensitivity-knop."],
    defaultDocs: "Documenten", defaultEmail: "E-mail", defaultMeetings: "Meetings", defaultSites: "Groepen en sites", defaultFabric: "Fabric en Power BI",
  },
  items(gps, st) {
    return gps.map((gp) => {
      const nErr = this.issues(gp, st, gp.order).filter((x) => x[0] === "err").length;
      const p = gp.policy, nG = (p.groups || []).length;
      const who = p.scope === "all" ? "iedereen" : nG ? plural(nG, "doelgroep", "doelgroepen") : "nog geen doelgroep";
      return {
        id: gp.id, name: gp.name, mark: gp.order + 1, meta: `${plural(gp.labels.length, "label", "labels")} · ${who}`,
        flag: nErr ? `<span class="badge err">${plural(nErr, "fout", "fouten")}</span>` : "",
        rename: { bind: `lp:${gp.id}:name`, value: p.name, max: 64, what: "labelbeleid" },
      };
    });
  },
  /** Naam (kop; hernoemen via de lijst links), volgorde en beheerknoppen van één beleid. */
  head(gp, st, i, n) {
    const p = gp.policy, id = p.id, isAll = p.scope === "all";
    const iss = this.issues(gp, st, i);
    const nErr = iss.filter((x) => x[0] === "err").length, nWarn = iss.filter((x) => x[0] === "warn").length;
    const badge = nErr ? `<span class="badge err">${plural(nErr, "fout", "fouten")}</span>` : nWarn ? `<span class="badge warn">${plural(nWarn, "aandachtspunt", "aandachtspunten")}</span>` : "";
    return `<div class="lp-head">
        ${n > 1 ? `<span class="lp-order" title="Volgorde ${gp.order + 1}: hoe lager in de lijst, hoe hoger de prioriteit">${gp.order + 1}</span>` : ""}
        ${VH.mdTitle(p.name, { route: "policies", id, what: "labelbeleid" })}
        ${badge}
        <span class="lp-tools">${!isAll ? `<button class="icon-btn lp-up" data-action="lp-move" data-id="${esc(id)}" data-dir="-1" title="Hoger in de lijst (lagere prioriteit)" aria-label="Hoger in de lijst"${i <= 1 ? " disabled" : ""}>${icon("chevrondown", "s")}</button><button class="icon-btn" data-action="lp-move" data-id="${esc(id)}" data-dir="1" title="Lager in de lijst (hogere prioriteit)" aria-label="Lager in de lijst"${i >= n - 1 ? " disabled" : ""}>${icon("chevrondown", "s")}</button>` : ""}<button class="icon-btn" data-action="lp-dup" data-id="${esc(id)}" title="Dupliceren" aria-label="Labelbeleid dupliceren">${icon("copy", "s")}</button>${n > 1 ? `<button class="icon-btn" data-action="lp-del" data-id="${esc(id)}" title="Verwijderen" aria-label="Labelbeleid verwijderen">${icon("trash", "s")}</button>` : ""}</span>
      </div>`;
  },
  detail(gp, st, i, n, o = {}) {
    const p = gp.policy, id = p.id, sc = this.scopes(gp.labels), isAll = p.scope === "all", s = p.settings || {};
    const explicit = new Set(p.labels || []);
    let nImp = 0;
    const chips = gp.labels.map((l) => {
      const imp = !explicit.has(l.id), par = hasChildren(l, st);
      if (imp && !par) nImp++;
      return `<span class="chip${imp ? " lp-imp" : ""}" title="${imp ? (par ? "Hoofdlabel: wordt automatisch meegepubliceerd zolang er een sublabel in dit beleid zit" : "Komt uit de publicatiekeuze op het ontwerpbord (rij Publicatie). Wijzig het daar om het hier te verwijderen.") : "Expliciet toegevoegd"}"><span class="color-dot" style="background:${esc(l.color)}"></span>${esc(labelFullName(l, st))}${imp && !par ? `<span class="lp-imp-ic" aria-hidden="true">${icon("table", "s")}</span>` : ""}${imp ? `<span class="sr-only"> (${par ? "automatisch" : "via ontwerpbord"})</span>` : `<button class="chip-x" data-action="lp-label-del" data-id="${esc(id)}" data-label="${esc(l.id)}" title="Verwijderen" aria-label="${esc(labelFullName(l, st))} uit dit beleid halen">${icon("x", "s")}</button>`}</span>`;
    }).join("");
    const inPol = new Set(gp.labels.map((l) => l.id));
    const addable = orderedLabels(st).filter((l) => !inPol.has(l.id));
    const labelAdd = addable.length ? `<select class="select lp-add" data-action="lp-label-add" data-id="${esc(id)}" aria-label="Label toevoegen aan dit beleid"><option value="">+ Label toevoegen…</option>${addable.map((l) => `<option value="${esc(l.id)}">${esc(labelFullName(l, st))}</option>`).join("")}</select>` : "";
    const groups = (p.groups || []).map((g) => byId(st.groups, g)).filter(Boolean).map((g) => `<span class="chip">${icon(g.kind === "domain" ? "link" : "users", "s")}${esc(g.name)}${g.value ? ` <span class="muted xs">${esc(g.value)}</span>` : ""}<button class="chip-x" data-action="lp-group-del" data-id="${esc(id)}" data-group="${esc(g.id)}" title="Verwijderen" aria-label="${esc(g.name)} uit dit beleid halen">${icon("x", "s")}</button></span>`).join("");
    const freeGroups = st.groups.filter((g) => g.kind !== "all" && !(p.groups || []).includes(g.id));
    const groupAdd = `<div class="lp-addrow">${freeGroups.length ? `<select class="select lp-add" data-action="lp-group-add" data-id="${esc(id)}" aria-label="Doelgroep toevoegen aan dit beleid"><option value="">+ Doelgroep toevoegen…</option>${freeGroups.map((g) => `<option value="${esc(g.id)}">${esc(g.name)}</option>`).join("")}</select>` : ""}<button type="button" class="btn small subtle" data-action="lp-grp-open">${icon("users", "s")} Doelgroepen beheren</button></div>`;
    const nl = (k, def) => this.NL[k] || def;
    const CORE = ["justification", "mandatoryDocs", "mandatoryEmail", "defaultDocs", "defaultEmail"];
    const vis = CATALOG.labelPolicySettings.filter((x) => x.key !== "helpLink" && this.settingVisible(x.key, sc));
    const tg = (x) => { const [t, d] = nl(x.key, [x.name, x.desc]); return F.toggle(`lp:${id}:settings.${x.key}`, esc(t), { desc: esc(d), badge: infoTip(`Purview: ${x.name}. ${x.desc}`) }); };
    const toggles = vis.filter((x) => CORE.includes(x.key)).map(tg).join("");
    const moreToggles = vis.filter((x) => !CORE.includes(x.key)).map(tg).join("");
    const hl = CATALOG.labelPolicySettings.find((x) => x.key === "helpLink");
    const help = hl ? F.text(`lp:${id}:settings.helpLink`, `${esc(nl("helpLink", [hl.name])[0])} ${infoTip(`Purview: ${hl.name}. ${hl.desc}`)}`, { ph: "https://intranet/classificatie", hint: "Begint met https:// of mailto:" }) : "";
    const defs = CATALOG.labelPolicyDefaults.filter((d) => sc[d.scope]);
    const dsel = (d) => F.select(`lp:${id}:settings.${d.key}`, `${esc(nl(d.key, d.name))} ${infoTip(`Purview: ${d.name}.`)}`, this.defaultOptions(gp.labels, st, d.scope, d.sameAsDocs && sc.files));
    const defaults = defs.filter((d) => CORE.includes(d.key)).map(dsel).join("");
    const moreDefaults = defs.filter((d) => !CORE.includes(d.key)).map(dsel).join("");
    const nMore = vis.filter((x) => !CORE.includes(x.key) && s[x.key]).length + defs.filter((d) => !CORE.includes(d.key) && s[d.key]).length + (s.helpLink ? 1 : 0);
    const more = accordion("lp-more", `${icon("sliders", "s")} Meer instellingen ${nMore ? `<span class="badge lp-more-n">${nMore} ingesteld</span>` : `<span class="muted xs">meetings, sites, Fabric, help-link</span>`}`,
      `${moreToggles ? `<div class="ws-toggles">${moreToggles}</div>` : ""}
      ${moreDefaults ? `<div class="field-label mt-2">Standaardlabel voor</div><div class="grid-2 lp-defaults">${moreDefaults}</div>` : ""}
      ${help}`, !!(s.helpLink && !/^(https?:\/\/|mailto:)/i.test(s.helpLink)), false);
    const adv = CATALOG.labelPolicyAdvanced.map((a) => {
      const spec = `lp:${id}:adv.${a.key}`;
      if (a.type === "bool") return `<div class="check-row">${F.check(spec, `<span class="mono">${esc(a.name)}</span>`)}${infoTip(a.desc)}</div>`;
      if (a.type === "enum") return F.select(spec, `<span class="mono">${esc(a.name)}</span>`, a.options, { hint: a.desc });
      return F.select(spec, `<span class="mono">${esc(a.name)}</span>`, [["", "Niet ingesteld"], ["None", "None"], ...gp.labels.filter((l) => !hasChildren(l, st) && l.cfg.scope.emails).map((l) => [l.id, labelFullName(l, st)])], { hint: a.desc });
    }).join("");
    const iss = this.issues(gp, st, i);
    return `<div class="lp-detail">${o.noHead ? "" : this.head(gp, st, i, n)}
      ${iss.length ? `<div class="lp-issues">${iss.map(([k, t]) => msg(k, t)).join("")}</div>` : ""}
      ${WSX.sec("Wie krijgt welke labels", `<div class="grid-2 lp-who">
          <div><div class="field-label">Labels ${infoTip(`Purview: Labels to publish. Kies een label of sleep het hierheen. Een bovenliggend label neemt de sublabels mee.${nImp ? " Labels met het bordicoon (zonder ×) komen uit de publicatiekeuze op het Ontwerpbord; wijzig ze daar." : ""}`)}</div>
            <div class="pc-drop" data-drop="pub-label" data-zone="lp-labels" data-target="${attr({ policyId: id })}">${chips ? `<div class="chip-list">${chips}</div>` : `<div class="drop-hint">Sleep labels hierheen</div>`}</div>
            
            ${labelAdd ? `<div class="lp-addrow">${labelAdd}</div>` : ""}</div>
          <div><div class="field-label">Voor wie ${infoTip("Purview: Users and groups.")}</div>
            <label class="check"><input type="checkbox" data-action="lp-all" data-id="${esc(id)}"${isAll ? " checked" : ""}><span>Alle gebruikers en groepen</span></label>
            ${!isAll ? `<div class="pc-drop" data-drop="pub-group" data-zone="lp-groups" data-target="${attr({ policyId: id })}">${groups ? `<div class="chip-list">${groups}</div>` : `<div class="drop-hint">Sleep een doelgroep hierheen</div>`}</div>${groupAdd}` : ""}
          </div></div>`)}
      ${WSX.sec("Wat merkt de gebruiker", `<div class="ws-toggles">${toggles}</div>
          ${defaults ? `<div class="field-label mt-2">Standaardlabel ${infoTip("Label dat automatisch op nieuwe items komt. De gebruiker kan het wijzigen.")}</div><div class="grid-2 lp-defaults">${defaults}</div>` : `<div class="muted small">Geen labels met passende scope voor een standaardlabel.</div>`}
          ${more}`)}
      ${accordion(`lp-tech-${id}`, `${icon("code", "s")} Technische details <span class="muted xs">admin units · advanced settings</span>`, `${F.text(`lp:${id}:adminUnitsText`, "Admin units (optioneel)", { ph: "bijv. AU-Zorg", hint: "Beperk het beleid tot administrative units (Entra ID)." })}
          <div class="field-label">Advanced settings (PowerShell)</div>${adv}<div class="muted xs">Alleen via <span class="mono">Set-LabelPolicy -AdvancedSettings</span>. ${learn("newLabelPolicy", "Set-LabelPolicy")}</div>`)}
    </div>`;
  },
  /** Groot voorbeeld ‘Zo ziet de medewerker het’ voor het gekozen beleid; situatie en app staan in UI.lpPv (niet in het ontwerp). */
  preview(gp, st) {
    const s = gp.policy.settings || {}, sc = this.scopes(gp.labels);
    const pv = UI.lpPv || {};
    const both = sc.files && sc.emails;
    const app = both && (pv.app === "office" || pv.app === "outlook") ? pv.app : (!sc.files && sc.emails ? "outlook" : "office");
    const mail = app === "outlook";
    const kind = ["default", "justify", "mandatory"].includes(pv.kind) ? pv.kind : "default";
    const leaves = gp.labels.filter((l) => !hasChildren(l, st) && l.cfg.scope[mail ? "emails" : "files"]);
    const defId = mail ? (s.defaultEmail === "sameAsDocs" ? s.defaultDocs : s.defaultEmail) : s.defaultDocs;
    const dl = defId && leaves.find((l) => l.id === defId);
    const high = leaves[leaves.length - 1], low = leaves[0];
    const on = { default: !!dl, justify: !!s.justification, mandatory: !!s[mail ? "mandatoryEmail" : "mandatoryDocs"] };
    const ctx = (l, o = {}) => Object.assign(l ? { labelName: labelFullName(l, st), labelColor: l.color } : { noLabel: true }, o);
    const item = mail ? "een nieuwe e-mail" : "een nieuw document";
    const K = {
      default: [mail ? "Nieuwe e-mail" : "Nieuw document", `Standaardlabel ${mail ? "e-mail" : "documenten"}`, `Een medewerker maakt ${item}.`],
      justify: ["Label verlagen", this.NL.justification[0], high ? `Een medewerker verlaagt ‘${labelFullName(high, st)}’ naar een lager label of haalt het label weg.` : ""],
      mandatory: ["Verplicht label", this.NL[mail ? "mandatoryEmail" : "mandatoryDocs"][0], `Een medewerker ${mail ? "verstuurt een e-mail" : "slaat een document op"} zonder label.`],
    };
    let body = "";
    if (!leaves.length) body = Previews.sceneNone(`Dit beleid publiceert geen labels voor ${mail ? "e-mail" : "documenten"}.`);
    else if (kind === "default") body = on.default ? Previews.notice("default", app, ctx(dl)) : Previews.quiet(app, ctx(null), `Geen standaardlabel: ${item} start zonder label. De medewerker kiest zelf${on.mandatory ? " (en moet dat ook)" : ""}.`);
    else if (kind === "justify") body = on.justify ? Previews.notice("justify", app, ctx(high)) : Previews.quiet(app, ctx(low), "Geen vraag om een reden: de medewerker verlaagt of verwijdert het label direct.");
    else body = on.mandatory ? Previews.notice("mandatory", app, ctx(null)) : Previews.quiet(app, ctx(null), `Niet verplicht: de medewerker kan ${mail ? "verzenden" : "opslaan"} zonder label.`);
    const seg = (key, items, cur, lbl) => `<div class="lp-seg" role="group" aria-label="${esc(lbl)}">${items.map(([v, t, state]) => `<button type="button" class="lp-seg-b${v === cur ? " on" : ""}" aria-pressed="${v === cur}" data-action="lp-pv" data-${key}="${esc(v)}">${state === undefined ? "" : `<span class="lp-dot${state ? " on" : ""}" aria-hidden="true"></span>`}${esc(t)}${state === undefined ? "" : `<span class="sr-only"> (${state ? "aan" : "uit"})</span>`}</button>`).join("")}</div>`;
    const kinds = seg("kind", Object.keys(K).map((k) => [k, K[k][0], on[k]]), kind, "Situatie in het voorbeeld");
    const apps = both ? seg("app", [["office", "Word"], ["outlook", "Outlook"]], app, "App in het voorbeeld") : "";
    return `<section class="lp-pv" aria-labelledby="lp-pv-h">
      <div class="lp-pv-h"><h3 id="lp-pv-h">${icon("eye", "s")} Zo ziet de medewerker het</h3>${apps}</div>
      ${kinds}
      <p class="lp-pv-sit small">${esc(K[kind][2])}</p>
      <div class="lp-pv-stage" data-pv-kind="${esc(kind)}">${body}</div>
      <div class="lp-pv-st small"><span class="lp-dot${on[kind] ? " on" : ""}" aria-hidden="true"></span>${esc(K[kind][1])}: <b>${on[kind] ? (kind === "default" ? esc(labelFullName(dl, st)) : "aan") : (kind === "default" ? "geen" : "uit")}</b></div>
      <p class="xs muted lp-pv-note">Illustratief: het echte scherm verschilt per app en versie.</p>
    </section>`;
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
      const nid = uid("lp");
      UI.sub.policies = nid;
      Store.update((st) => {
        const g = st.labelPolicies.find((p) => p.scope === "all");
        st.labelPolicies.push({ id: nid, name: name.slice(0, 64), scope: "groups", groups: gid ? [gid] : [], labels: [], settings: clone(g ? g.settings : defaultLabelPolicySettings()), adv: clone(g ? g.adv || {} : {}) });
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
  const c = clone(p); c.id = uid("lp"); UI.sub.policies = c.id; c.name = (p.name + " (kopie)").slice(0, 64); c.auto = false;
  if (c.scope === "all") { c.scope = "groups"; c.groups = []; }
  st.labelPolicies.push(c);
  el.dataset.id = c.id; // focus na de render naar dezelfde knop van de kopie
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
Actions["lp-label-add"] = (el) => {
  const lid = el.value; if (!lid) return;
  Store.update((st) => {
    const p = byId(st.labelPolicies, el.dataset.id), l = labelById(lid, st);
    if (!p || !l) return;
    p.labels = unique([...(p.labels || []), l.id, ...childrenOf(l.id, st).map((c) => c.id)]);
  });
};
Actions["lp-group-add"] = (el) => {
  const gid = el.value; if (!gid) return;
  Store.update((st) => {
    const p = byId(st.labelPolicies, el.dataset.id), g = byId(st.groups, gid);
    if (!p || !g || g.kind === "all") return;
    p.scope = "groups";
    p.groups = unique([...(p.groups || []), g.id]);
  });
};
Actions["lp-pv"] = (el) => {
  UI.lpPv = Object.assign({ kind: "default", app: "" }, UI.lpPv);
  if (el.dataset.kind) UI.lpPv.kind = el.dataset.kind;
  if (el.dataset.app) UI.lpPv.app = el.dataset.app;
  App.render();
};
Actions["lp-grp-open"] = () => {
  const d = $('#main details[data-acc="lp-groups"]'); if (!d) return;
  d.open = true;
  d.scrollIntoView({ block: "start", behavior: reducedMotion() ? "auto" : "smooth" });
  const s = $("summary", d); if (s) s.focus({ preventScroll: true });
};
Actions["grp-add"] = () => promptDialog("Nieuwe doelgroep", "Naam", "", (val) => {
  const name = String(val || "").trim().slice(0, 64) || "Nieuwe doelgroep";
  const d = $('#main details[data-acc="lp-groups"]'); if (d) d.open = true;
  Store.update((st) => { st.groups.push({ id: uid("grp"), name, kind: "group", value: "" }); });
  Toast.show(`Doelgroep <b>${esc(name)}</b> toegevoegd. Vul het e-mailadres van de groep in en sleep hem naar ‘Users and groups’.`, "ok");
}, { ph: "Bijv. HR-medewerkers", hint: "Een (mail-enabled) groep uit Entra ID. Het e-mailadres vul je daarna in.", okLabel: "Toevoegen", required: "Geef de doelgroep een naam, bijv. HR-medewerkers." });
Actions["grp-del"] = (el) => {
  const g = byId(S().groups, el.dataset.id); if (!g) return;
  confirmDialog("Doelgroep verwijderen?", `‘${esc(g.name)}’ wordt verwijderd uit labelbeleid, publicatie en encryptierechten.`, () => Store.update((st) => _removeGroupRefs(st, g.id)), "Verwijderen", true);
};

/* ---------- View ---------- */
registerView("policies", {
  title: "Labelbeleid",
  fac: {
    duration: 30,
    goal: "Bepalen wie welke labels ziet, welk label standaard is en hoeveel vrijheid gebruikers hebben.",
    questions: ["Zien alle medewerkers dezelfde labels, of heeft een afdeling extra labels nodig?", "Welk standaardlabel krijgen nieuwe documenten en mails?", "Is labelen verplicht? Moet je een reden geven bij verlagen?"],
    tips: ["Start met één beleid voor iedereen; voeg alleen beleid toe voor extra labels.", "Bij conflicterende instellingen wint het beleid onderaan de lijst.", "Laat de help-link verwijzen naar jullie classificatiebeleid op intranet."],
    pitfalls: ["Standaardlabel met encryptie: elk nieuw document wordt versleuteld.", "Verplicht labelen zonder standaardlabel en training: veel frictie.", "Doelgroep zonder (mail-enabled) groep in Entra ID: niet toe te wijzen."],
    rules: [
      facRules("Spelregels in Purview", () => CATALOG.labelLimits || [], { key: "label-limits" }),
      facRules("Wie ziet welke labels", [], { key: "lp-who", intro: (st) => PolicyUI.whoSees(Generator.labelPolicies(st), st) }),
    ],
    links: ["labelsGetStarted", "newLabelPolicy", "labelsLimits"],
  },
  render() {
    const st = S();
    if (!st.labels.length) return pageHead("Labels", "Labelbeleid", "Bepaal wie welke labels ziet en wat de standaard is.") + VH.needLabels();
    const gps = Generator.labelPolicies(st);
    const published = new Set(gps.flatMap((g) => g.labels.map((l) => l.id)));
    const unpub = applicableLabels(st).filter((l) => !published.has(l.id));
    const palette = orderedLabels(st).map((l) => `<div class="chip${l.parentId ? " lp-sub" : ""}" style="cursor:grab" data-drag="pub-label" data-tap="1" data-pick-label="${esc(labelFullName(l, st))}" data-payload="${attr({ labelId: l.id })}" title="${esc(labelFullName(l, st))}"><span class="color-dot" style="background:${esc(l.color)}"></span>${esc(l.parentId ? "↳ " + labelShortName(l) : labelShortName(l))}${hasChildren(l, st) ? ' <span class="muted xs">+ sublabels</span>' : ""}</div>`).join("");
    const gHint = infoTip("Eén domein per regel; geen e-mailadressen. Bij een organisatie met Microsoft Entra ID krijgen álle geverifieerde domeinen van die tenant toegang, niet alleen het opgegeven domein. Ontvangers zonder Microsoft-account kunnen versleutelde inhoud niet openen.");
    const groups = st.groups.map((g) => g.kind === "all"
      ? `<div class="lp-grp lp-grp-all"><div class="chip" style="cursor:grab" data-drag="pub-group" data-tap="1" data-pick-label="${esc(g.name)}" data-payload="${attr({ groupId: g.id })}" title="All users and groups">${icon("users", "s")}${esc(g.name)}</div></div>`
      : `<div class="grp-card lb-grp lp-grp"><div class="lp-grp-r1"><span class="chip lp-grip" style="cursor:grab" data-drag="pub-group" data-tap="1" data-pick-label="${esc(g.name)}" data-payload="${attr({ groupId: g.id })}" title="Sleep naar ‘Voor wie’">${icon("grip", "s")}${icon(g.kind === "domain" ? "link" : "users", "s")}</span>
          <input class="input" data-bind="grp:${esc(g.id)}:name" value="${esc(g.name)}" title="${esc(g.name)}" data-render="1" aria-label="Naam van de doelgroep">
          <button class="icon-btn" data-action="grp-del" data-id="${esc(g.id)}" title="Verwijderen" aria-label="Doelgroep ${esc(g.name)} verwijderen">${icon("trash", "s")}</button></div>
          <div class="lp-grp-r2">${_lpAria(F.select(`grp:${g.id}:kind`, "", [["group", "Groep"], ["domain", "Domein"]], { cls: "mb-0" }), `Soort doelgroep ${g.name}`)}
          ${g.kind === "domain" ? _lpAria(F.textarea(`grp:${g.id}:value`, "", { rows: 1, ph: "bijv. ketenpartner.nl", cls: "mb-0" }), `Domeinen ${g.name}`) + gHint : _lpAria(F.text(`grp:${g.id}:value`, "", { ph: "hr@contoso.nl", cls: "mb-0" }), `E-mailadres ${g.name}`)}</div>
          ${g.kind === "group" && !g.value ? `<div class="xs lp-grp-todo">${icon("info", "s")} Nog in te vullen: e-mailadres van de groep (uiterlijk vóór het script).</div>` : ""}</div>`).join("");
    const cur = gps.find((g) => g.id === UI.sub.policies) || gps[0];
    const ci = Math.max(0, gps.indexOf(cur));
    const detail = cur ? PolicyUI.detail(cur, st, ci, gps.length, { noHead: true }) : "";
    const nTodo = st.groups.filter((g) => g.kind === "group" && !g.value).length, nGrp = st.groups.filter((g) => g.kind !== "all").length;
    const grpSum = `${icon("users", "s")} Doelgroepen en labels <span class="muted xs">${plural(nGrp, "doelgroep", "doelgroepen")}${nTodo ? ` · ${nTodo} nog in te vullen` : ""} · slepen naar het beleid</span>`;
    const grpBody = `<div class="lp-grp-bar"><p class="small muted">Sleep een doelgroep naar ‘Voor wie’ of kies hem daar. Doelgroepen worden ook gebruikt in de encryptierechten van labels.</p><button class="btn small" data-action="grp-add">${icon("plus", "s")} Doelgroep</button></div><div class="lp-grps">${groups}</div>
      <div class="lp-pal-sec"><div class="field-label">Alle labels</div><p class="small muted">Sleep een label naar ‘Labels’ in het beleid (of klik het en daarna het vak). Een bovenliggend label neemt de sublabels mee.</p><div class="lp-palette">${palette}</div></div>`;
    const extra = `<div class="lp-extra">${accordion("lp-groups", grpSum, grpBody, false, false)}</div>`;
    const body = cur ? `${PolicyUI.head(cur, st, ci, gps.length)}
      <div class="lp-grid"><div class="lp-main">${detail}</div>
      <aside class="lp-pv-col" aria-label="Voorbeeld voor de medewerker">${PolicyUI.preview(cur, st)}</aside>
      ${extra}</div>` : "";
    const empty = `${emptyState("users", "Nog geen labelbeleid", "Een labelbeleid maakt labels zichtbaar voor medewerkers en bepaalt het standaardlabel.", `<button class="btn primary" data-action="lp-add">${icon("plus", "s")} Beleid toevoegen</button>`)}<div class="lp-grid">${extra}</div>`;
    return `<div class="lp-page ws-host">${pageHead("Labels", "Labelbeleid", "Bepaal wie welke labels ziet en wat de standaard is.", "", `<p class="mb-1">Een label policy publiceert labels naar gebruikers en groepen, met standaardlabels en verplichtingen. Bij meerdere policies wint de policy die het laagst in de lijst staat. Labels zonder × komen uit de publicatiekeuze op het Ontwerpbord.</p>${learn("labelsGetStarted", "Publish sensitivity labels")} · ${learn("newLabelPolicy", "New-LabelPolicy")}`)}
      ${unpub.length ? msg("warn", `Niet gepubliceerd: ${unpub.map((l) => `<b>${esc(labelFullName(l, st))}</b>`).join(", ")}. Gebruikers zien deze labels niet.`) : ""}
      ${VH.masterList({ route: "policies", title: "Labelbeleid", items: PolicyUI.items(gps, st), cur: cur && cur.id, add: { action: "lp-add", label: "Nieuw beleid" }, empty }, body)}</div>`;
  },
});
