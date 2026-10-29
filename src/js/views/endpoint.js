/* View: Endpoint DLP – activiteiten × labels, Endpoint settings en groepen/lijsten */
const EP_ORDER = ["off", "audit", "warn", "block"];
const EP_LV_CLS = { off: 0, audit: 1, warn: 2, block: 4 };
const EP_TABS = [["matrix", "Activiteiten", "grid"], ["settings", "Endpoint settings", "settings"], ["groups", "Groepen & lijsten", "layers"]];
const EP_GROUP_ACTIONS = [["default", "Volgt de regel (standaard)"], ["allow", "Toestaan (Allow)"], ["audit", "Alleen registreren (Audit only)"], ["warn", "Blokkeren met override (Block with override)"], ["block", "Blokkeren (Block)"]];
function epLevelName(k) { const x = CATALOG.endpointLevels.find((y) => y[0] === k); return x ? x[1] : k; }
function epLevelEn(k) { const x = CATALOG.endpointLevels.find((y) => y[0] === k); return x && x[3] ? x[3] : ""; }
const EP_LV_ICON = { off: "minus", audit: "eye", warn: "alert", block: "shield" };

function _epActs(l) {
  const e = l.cfg.dlp.endpoint;
  e.activities = e.activities || {};
  CATALOG.endpointActivities.forEach((a) => { if (!e.activities[a.key]) e.activities[a.key] = "off"; });
  return e.activities;
}
function _epSync(l) {
  const a = _epActs(l), keys = CATALOG.endpointActivities.map((x) => x.key);
  const lv = unique(keys.map((k) => a[k]));
  l.cfg.dlp.endpoint.action = lv.length === 1 ? lv[0] : "custom";
  const match = CATALOG.choicesFor("dlp_endpoint").find((c) => {
    const tmp = { cfg: { dlp: { endpoint: {} } } };
    c.apply(tmp);
    const ta = tmp.cfg.dlp.endpoint.activities || {};
    return keys.every((k) => (ta[k] || "off") === a[k]);
  });
  l.choices = l.choices || {}; l.custom = l.custom || {};
  if (match) { l.choices.dlp_endpoint = match.id; delete l.custom.dlp_endpoint; }
  else l.custom.dlp_endpoint = true;
}
function _epSet(l, act, lv) { if (!l || !EP_ORDER.includes(lv)) return; _epActs(l)[act] = lv; _epSync(l); }

const EpUI = {
  active(st, k) { return applicableLabels(st).some((l) => ((l.cfg.dlp.endpoint.activities || {})[k] || "off") !== "off"); },
  labelCount(st) { return applicableLabels(st).filter((l) => CATALOG.endpointActivities.some((a) => ((l.cfg.dlp.endpoint.activities || {})[a.key] || "off") !== "off")).length; },
  issues(st) { return Validation.run(st).filter((x) => x.route === "endpoint"); },
};

DnD.register("ep-label", (type, p, t) => {
  const c = CATALOG.choiceById[p.choiceId];
  if (!c || c.d !== "dlp_endpoint") { Toast.show("Alleen Endpoint-kaarten passen hier.", "warn"); return; }
  let ok = false;
  Store.update((st) => { ok = Mapping.apply(st, t.labelId, c.id); });
  if (!ok) Toast.show("Dit label heeft sublabels en kan zelf niet worden toegepast.", "warn");
});

Actions["ep-cycle"] = (el) => {
  Store.update((st) => {
    const l = labelById(el.dataset.id, st); if (!l) return;
    const cur = _epActs(l)[el.dataset.act] || "off";
    _epSet(l, el.dataset.act, EP_ORDER[(EP_ORDER.indexOf(cur) + 1) % EP_ORDER.length]);
  });
};
Actions["ep-tab"] = (el) => { UI.epTab = el.dataset.tab; App.render(); };
Actions["ep-grp-add"] = (el) => {
  Store.update((st) => { const k = el.dataset.key; st.endpoint[k] = st.endpoint[k] || []; st.endpoint[k].push({ id: uid("epg"), name: `Groep ${st.endpoint[k].length + 1}`, items: [], action: "default" }); });
};
Actions["ep-grp-del"] = (el) => {
  Store.update((st) => { const k = el.dataset.key; st.endpoint[k] = (st.endpoint[k] || []).filter((g, i) => String(i) !== el.dataset.i); });
};
/* Voorstellen voor lijsten: veelgebruikte persoonlijke cloud-/transferdiensten en sync-clients (Block-modus). */
const EP_SUGGEST = {
  serviceDomains: ["*.wetransfer.com", "*.dropbox.com", "drive.google.com", "onedrive.live.com", "*.box.com", "mega.nz"],
  restrictedApps: ["Dropbox.exe", "GoogleDriveFS.exe", "MEGAsync.exe"],
};
Actions["ep-suggest"] = (el) => {
  const k = el.dataset.key, add = EP_SUGGEST[k] || [];
  let n = 0;
  Store.update((st) => { const cur = (st.endpoint[k] = st.endpoint[k] || []); add.forEach((x) => { if (!cur.includes(x)) { cur.push(x); n++; } }); });
  if (n) Toast.show(`${plural(n, "item", "items")} toegevoegd – controleer de lijst met de klant.`, "ok");
};
Actions["ep-grp-example"] = (el) => {
  const k = el.dataset.key, zorg = S().meta.sector === "zorg";
  const ex = { printerGroups: { name: zorg ? "Afdelingsprinters" : "Bedrijfsprinters", items: ["Corporate printer"] }, usbGroups: { name: zorg ? "Medische apparatuur" : "Versleutelde bedrijfs-USB", items: [] } }[k];
  if (!ex) return;
  Store.update((st) => { st.endpoint[k] = st.endpoint[k] || []; st.endpoint[k].push({ id: uid("epg"), name: ex.name, items: ex.items, action: "allow" }); });
};

registerView("endpoint", {
  title: "Endpoint DLP",
  fac: {
    duration: 30,
    goal: "Per label bepalen wat er op Windows- en macOS-apparaten mag gebeuren met gevoelige bestanden: USB, printen, netwerkshares, cloud-upload, plakken in browsers, Bluetooth, RDP en apps.",
    questions: ["Welke uitstroomkanalen op apparaten worden nu gebruikt (USB, privé-cloud, AI-websites)?", "Zijn er goedgekeurde USB-sticks, printers of shares die wél mogen?", "Zijn alle apparaten al onboarded in Defender for Endpoint / Purview?"],
    tips: ["Start met ‘Alleen registreren’ (Audit only) op alle activiteiten voor gevoelige labels en kijk 2 weken in Activity explorer.", "Gebruik groepen (USB, printers, domeinen) om uitzonderingen te maken in plaats van alles te blokkeren.", "Leg de keuzes vast per label; de detailinstellingen gelden tenantbreed."],
    pitfalls: ["‘Upload to restricted cloud service domain’ zonder service domains-lijst heeft weinig effect.", "Klembord blokkeren hindert medewerkers vaak bij hun werk – overweeg ‘Blokkeren met override’ of registreren."],
    rules: facRules("Vereisten voor apparaten", (st) => [
      "Apparaten zijn onboarded (Defender for Endpoint of het Purview onboarding-script); Windows 10/11 en macOS.",
      "Chrome en Firefox hebben de Microsoft Purview-extensie nodig; Edge ondersteunt het native.",
      `Labels als conditie werken op bestanden met de scope Files; gekoppelde SIT’s vangen ongelabelde bestanden${st && st.dlpSettings ? (st.dlpSettings.includeSitsForUnlabeled ? " (aan)" : " (uit – zie DLP-instellingen)") : ""}.`,
      "Credential-SIT’s, named entities, EDM en trainable classifiers vereisen Advanced classification (Endpoint settings).",
      "‘Blokkeren met override’ (Block with override) toont de gebruiker een melding met keuze voor een business justification (zie Endpoint settings).",
    ], { key: "ep-prereq", open: () => true }),
    links: ["deviceOnboarding", "endpointUsing", "chromeExt", "firefoxExt", "endpoint", "endpointSettings"],
  },
  done: (st) => EpUI.labelCount(st) > 0 || (st.customDlp || []).some((c) => (c.locations || []).includes("devices")),
  render() {
    const st = S();
    if (!st.labels.length) return pageHead("Beleid & DLP", "Endpoint DLP", "Wat mag er op laptops en pc’s gebeuren met gevoelige bestanden?") + VH.needLabels();
    const tab = EP_TABS.some((t) => t[0] === UI.epTab) ? UI.epTab : "matrix";
    const g = Generator.all(st);
    const pol = g.dlpPolicies.find((p) => (p.domains || []).includes("endpoint"));
    const tabsHtml = `<div class="tabs mb-2" role="tablist" aria-label="Endpoint DLP">${EP_TABS.map(([k, t, ic]) => `<button type="button" class="tab${tab === k ? " on" : ""}" role="tab" aria-selected="${tab === k}" tabindex="${tab === k ? 0 : -1}" data-action="ep-tab" data-tab="${esc(k)}">${icon(ic, "s")} ${esc(t)}</button>`).join("")}</div>`;
    const nAct = CATALOG.endpointActivities.filter((a) => EpUI.active(st, a.key)).length;
    const more = `<p>Klik per label en activiteit op een cel om het niveau te wisselen: <b>Geen controle</b> → <b>Alleen registreren</b> (Audit only) → <b>Blokkeren met override</b> (Block with override) → <b>Blokkeren</b> (Block). Met een Endpoint-kaart zet je alle activiteiten van een label in één keer. Tenantbrede instellingen en uitzonderingen staan in de andere tabbladen.</p>
      <p class="small muted">Nu: ${EpUI.labelCount(st)}/${applicableLabels(st).length} labels · ${nAct}/${CATALOG.endpointActivities.length} activiteiten${pol ? " · " + plural(pol.rules.length, "regel", "regels") : ""} · Microsoft 365 E5 (of add-on).</p>`;
    return VH.wrap(`${pageHead("Beleid & DLP", "Endpoint DLP", "Wat mag er op laptops met gevoelige bestanden?", "", more)}
      ${tabsHtml}${this["tab_" + tab](st, g, pol)}`, "vb-ep");
  },

  tab_matrix(st, g, pol) {
    const ls = applicableLabels(st);
    if (!ls.length) return VH.needLabels();
    const groups = unique(CATALOG.endpointActivities.map((a) => a.group));
    const head = `<tr><th class="corner"><div class="small muted">Activiteit ↓ · Label →</div></th>${ls.map((l) => {
      const c = Mapping.choice(l, "dlp_endpoint"), cust = Mapping.isCustom(l, "dlp_endpoint");
      return `<th data-drop="choice" data-zone="ep-label" data-target='${attr({ labelId: l.id })}' title="Sleep een Endpoint-kaart hierheen om alle activiteiten van dit label in te stellen">${labelPill(l, st)}
        <div class="xs muted mt-1">${cust ? `<span class="cell-flag">aangepast</span>` : c ? esc(c.title) : "—"}</div>${l.cfg.scope.files ? "" : `<div class="xs"><span class="badge warn" title="Endpoint DLP evalueert bestanden; zonder scope Files komt dit label niet op bestanden.">geen Files-scope</span></div>`}</th>`;
    }).join("")}</tr>`;
    const EP_GRP_NL = { "Service domain and browser activities": "Websites en browsers", "File activities for all apps": "Bestanden – alle apps", "Restricted app activities": "Niet-toegestane apps" };
    const body = groups.map((grp) => `<tr class="ep-grp"><th colspan="${ls.length + 1}" class="xs muted">${esc(EP_GRP_NL[grp] || grp)}${EP_GRP_NL[grp] ? ` <span lang="en">· ${esc(grp)}</span>` : ""}</th></tr>` + CATALOG.endpointActivities.filter((a) => a.group === grp).map((a) => {
      let max = -1;
      const cells = ls.map((l) => {
        const lv = (l.cfg.dlp.endpoint.activities || {})[a.key] || "off";
        const i = EP_ORDER.indexOf(lv), down = i < max;
        max = Math.max(max, i);
        return `<td class="ep-cell"><button class="lvl-btn lv-${EP_LV_CLS[lv]}" data-action="ep-cycle" data-id="${esc(l.id)}" data-act="${esc(a.key)}" title="${esc(epLevelEn(lv) ? `${epLevelName(lv)} (${epLevelEn(lv)})` : epLevelName(lv))} – klik om te wisselen" aria-label="${esc(a.nl || a.name)} – ${esc(labelFullName(l, st))}: ${esc(epLevelName(lv))}">${icon(EP_LV_ICON[lv], "s")}<span>${esc(epLevelName(lv))}</span>${down ? ` <span class="cell-flag err" title="Minder streng dan een minder gevoelig label">↓</span>` : ""}</button></td>`;
      }).join("");
      return `<tr><th class="vb-act"><span class="vb-act-in">${icon(a.icon, "s")}<span class="vb-act-txt">${a.nl ? `<span class="vb-act-main">${esc(a.nl)}</span><span class="vb-act-nl" lang="en">${esc(a.name)}</span>` : `<span class="vb-act-main">${esc(a.name)}</span>`}</span>${infoTip(`${a.desc || ""}${a.ps ? ` (Purview: ${a.ps})` : ""}`)}</span></th>${cells}</tr>`;
    }).join("")).join("");
    const prevRows = (CATALOG.endpointPreviewActivities || []).map((a) => `<tr class="vb-ep-prev"><th class="vb-act"><span class="vb-act-in">${icon(a.icon || "info", "s")}<span class="vb-act-txt">${a.nl ? `<span class="vb-act-main">${esc(a.nl)}</span><span class="vb-act-nl" lang="en">${esc(a.name)}</span>` : `<span class="vb-act-main">${esc(a.name)}</span>`}</span>${infoTip(a.desc || "")}</span></th><td colspan="${ls.length}" class="xs muted">${previewBadge()} Alleen in het Purview-portal in te stellen (niet in het script).</td></tr>`).join("");
    const ACT_SHORT = { clipboard: "kopiëren naar het klembord", rdp: "kopiëren via RDP" };
    const hard = ["clipboard", "rdp"].filter((k) => ls.some((l) => ((l.cfg.dlp.endpoint.activities || {})[k] || "off") === "block"));
    const zorg = st.meta.sector === "zorg";
    const citrix = hard.length ? msg("warn", `<b>Let op ${zorg ? "klinische en Citrix-werkplekken" : "Citrix- en RDP-werkplekken"}:</b> ‘Block’ op ${hard.map((k) => ACT_SHORT[k]).join(" en ")} kan ${zorg ? "het werken in het EPD" : "het werk"} via Citrix of extern bureaublad stilleggen. Test eerst met een pilotgroep.`) : "";
    const palette = accordion("ep-cards", `${icon("board", "s")} Endpoint-kaarten <span class="xs muted">· één klik per label</span>`, `<p class="xs muted mt-0 mb-1">Een kaart zet alle activiteiten van een label in één keer; sleep hem op een labelkop. Losse cellen wissel je met een klik.</p><div class="choice-palette ep-cards">${CATALOG.choicesFor("dlp_endpoint").map((c) => BoardUtil.choiceCard(c)).join("")}</div>`);
    return `${citrix}${palette}${ls.length > 4 ? `<p class="ep-scroll-hint xs muted">${icon("chevronright", "s")} ${ls.length} labels – scroll horizontaal; de activiteitenkolom blijft staan.</p>` : ""}<div class="board-wrap ep-wrap" tabindex="0" role="region" aria-label="Endpoint-activiteiten per label"><table class="matrix vb-epm"><thead>${head}</thead><tbody>${body}${prevRows}</tbody></table></div>
      <div class="mt-2">
      ${pol ? VH.policyAcc("ep-policy", pol, st) : msg("info", "Nog geen endpoint-regels: zet minstens één activiteit voor een label op Alleen registreren, Blokkeren met override of Blokkeren.")}</div>`;
  },

  tab_settings(st) {
    const ep = st.endpoint;
    const sec = (s) => {
      const b = `st:endpoint.${s.key}`;
      const badges = [s.rec ? `<span class="badge ok">Aanbevolen</span>` : "", s.preview ? previewBadge() : "", s.lic === "payg" ? `<span class="badge info">Pay-as-you-go</span> ${statusBadge("verify")}` : ""].join(" ");
      let extra = "";
      if (s.key === "advancedClassification" && ep.advancedClassification) extra = F.text("st:endpoint.bandwidthLimit", "Bandwidth limit (per apparaat per 24 uur)", { hint: "‘unlimited’ of een limiet in MB, bijv. 1000. Boven de limiet valt het apparaat terug op lokale classificatie." });
      if (s.key === "networkShareCoverage" && ep.networkShareCoverage) extra = F.textarea("st:endpoint.networkShareExclusions", "Exclude these network share paths", { type: "lines", rows: 2, mono: true, ph: "\\\\fileserver\\scratch" });
      if (s.key === "fileEvidence" && ep.fileEvidence) extra = `<div class="grid grid-3">
        ${F.select("st:endpoint.evidenceStoreType", "Storage", [["customer", "Customer managed storage (Azure)"], ["microsoft", "Microsoft managed storage"]])}
        ${ep.evidenceStoreType === "customer" ? F.text("st:endpoint.evidenceStorage", "Azure Storage account URL", { mono: true, ph: "https://<account>.blob.core.windows.net/<container>" }) : `<div class="field"><div class="field-label">Opslag</div><div class="small muted">Door Microsoft beheerd; geen URL nodig.</div></div>`}
        ${F.select("st:endpoint.evidenceCacheDays", "Local storage (cache)", [[7, "7 dagen"], [30, "30 dagen"], [60, "60 dagen"]], { type: "number" })}</div>`;
      if (s.key === "ocr" && ep.ocr) extra = msg("info", "OCR stel je in onder Settings › Optical character recognition (locatie Devices). OCR vereist pay-as-you-go-facturering (controleer in de portal).");
      return `<div class="card flat mb-1" style="padding:12px"><div class="row between"><div><b>${esc(s.name)}</b> ${badges}</div>${F.toggle(b, "")}</div><p class="xs muted mb-0">${esc(s.desc)}</p>${extra ? `<div class="mt-1">${extra}</div>` : ""}</div>`;
    };
    const just = `<div class="card flat mb-1" style="padding:12px"><b>Business justification in policy tips</b>
      <p class="xs muted">Bij ‘Blokkeren met override’ geeft de gebruiker een reden op: kies uit een keuzelijst, typ zelf een reden, of allebei.</p>
      <div class="grid grid-2">${F.select("st:endpoint.justificationMode", "Wat ziet de gebruiker?", [["both", "Keuzelijst + eigen tekstvak"], ["default", "Alleen de keuzelijst"], ["custom", "Alleen een eigen tekstvak"]], { hint: { both: "Show default options and custom text box", default: "Only show default options", custom: "Only show custom text box" }[ep.justificationMode] || "" })}
      ${ep.justificationMode === "custom" ? "" : F.check("st:endpoint.showJustificationDropdown", "Eigen opties in de keuzelijst", { desc: "Customize the options for drop-down menu" })}</div>
      ${ep.justificationMode === "custom" ? `<p class="xs muted mb-0">Geen keuzelijst: de gebruiker typt zelf een reden.</p>` : F.textarea("st:endpoint.justificationOptions", "Opties in de keuzelijst (één per regel, max. 5)", { type: "lines", rows: 5 })}
      ${ep.justificationMode !== "custom" && (ep.justificationOptions || []).length > 5 ? msg("warn", "Purview toont maximaal 5 opties.") : ""}</div>`;
    const more = `<div class="card flat mb-1" style="padding:12px"><b>Overige instellingen</b>
      ${F.check("st:endpoint.autoQuarantine", "Auto-quarantine voor unallowed apps", { desc: "Bestanden die een unallowed app (bijv. sync-client) benadert, worden naar een quarantainemap verplaatst." })}
      ${F.check("st:endpoint.corporateNetwork", "Afwijkende acties op het bedrijfsnetwerk / VPN", { desc: "Gebruik VPN-instellingen en ‘Corporate network’ in regels om andere acties te kiezen binnen het netwerk." })}
      ${F.check("st:endpoint.macRecommendedExclusions", "Aanbevolen macOS-padexclusies gebruiken")}</div>`;
    return `<div class="split wide-left"><div>${CATALOG.endpointSettingSections.map(sec).join("")}</div>
      <div>${just}${more}<div class="card flat" style="padding:12px">${learn("endpointSettings", "Configure endpoint DLP settings")}<br>${learn("dlpBrowser", "Browser- en domeinbeperkingen")}<br>${learn("dlpNetwork", "Network share coverage")}</div></div></div>`;
  },

  tab_groups(st) {
    const ep = st.endpoint, zorg = st.meta.sector === "zorg";
    const EX = { printerGroups: [zorg ? "Afdelingsprinters" : "Bedrijfsprinters", "Corporate printer"], usbGroups: [zorg ? "Medische apparatuur" : "Versleutelde bedrijfs-USB", "USB vendor ID / product ID van het apparaat"] };
    const groupCard = (gdef) => {
      const list = ep[gdef.key] || [], ex = EX[gdef.key];
      const exBtn = ex && !list.some((x) => x && x.name === ex[0]) ? `<button class="btn small subtle" data-action="ep-grp-example" data-key="${esc(gdef.key)}" title="Voegt een voorbeeldgroep toe met actie Allow">${icon("plus", "s")} Voorbeeld: ${esc(ex[0])} (allow)</button>` : "";
      return `<div class="card flat mb-2" style="padding:12px"><div class="row between"><div><b>${icon(gdef.icon, "s")} ${esc(gdef.name)}</b> ${gdef.limit ? `<span class="badge neutral">${esc(gdef.limit)}</span>` : ""}</div>
        <div class="row tight">${exBtn}<button class="btn small" data-action="ep-grp-add" data-key="${esc(gdef.key)}">${icon("plus", "s")} Groep</button></div></div>
        <p class="xs muted">${esc(gdef.desc)} Kenmerken: ${esc(gdef.fields.join(", "))}.</p>
        ${list.length ? list.map((grp, i) => `<div class="rule-row mb-1"><div class="rr-main"><div class="vb-grp-row">
            ${F.text(`st:endpoint.${gdef.key}.${i}.name`, "Groepsnaam")}
            ${F.select(`st:endpoint.${gdef.key}.${i}.action`, "Actie in de DLP-regel", EP_GROUP_ACTIONS)}
            <div class="field" style="text-align:right"><button class="btn small subtle" data-action="ep-grp-del" data-key="${esc(gdef.key)}" data-i="${i}" title="Groep verwijderen" aria-label="Groep verwijderen">${icon("trash", "s")}</button></div></div>
            ${F.textarea(`st:endpoint.${gdef.key}.${i}.items`, "Items (één per regel)", { type: "lines", rows: 2, mono: true, ph: gdef.ph })}</div></div>`).join("") : `<div class="xs muted">Nog geen groepen.</div>`}</div>`;
    };
    const listCard = (d) => {
      const sug = (EP_SUGGEST[d.key] || []).filter((x) => !(ep[d.key] || []).includes(x));
      const canSug = sug.length && !(d.key === "serviceDomains" && ep.serviceDomainMode === "allow");
      return `<div class="card flat mb-2" style="padding:12px">${F.textarea(`st:endpoint.${d.key}`, `<b>${esc(d.name)}</b>`, { type: "lines", rows: 3, mono: true, ph: d.ph })}<p class="xs muted mb-0">${esc(d.desc)}</p>
      ${canSug ? `<div class="row tight mt-1"><button class="btn small" data-action="ep-suggest" data-key="${esc(d.key)}">${icon("sparkle", "s")} Voorstel overnemen</button><span class="xs muted">${esc(sug.join(", "))}</span></div>` : ""}
      ${d.key === "serviceDomains" ? F.select("st:endpoint.serviceDomainMode", "Service domains-modus", [["block", "Block – deze domeinen blokkeren"], ["allow", "Allow – alleen deze domeinen toestaan"]]) : ""}</div>`;
    };
    return `<p class="small muted">De acties per groep stel je in Purview per DLP-regel in (bijv. ‘Copy to a removable USB device’ → per groep Allow/Audit/Block); hier leg je het ontwerp vast.</p>
      <div class="grid grid-2"><div><h3 class="section-title">${icon("layers", "s")} Groepen</h3>${CATALOG.endpointGroups.map(groupCard).join("")}</div>
      <div><h3 class="section-title">${icon("settings", "s")} Lijsten</h3>${CATALOG.endpointLists.map(listCard).join("")}</div></div>`;
  },
});
