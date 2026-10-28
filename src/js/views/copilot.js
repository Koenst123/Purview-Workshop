/* View: Microsoft 365 Copilot – DLP voor Copilot & Copilot Chat (labels, prompts, web search, externe e-mail) */
const CP_RULE_NAMES = { labels: "Gelabelde inhoud niet verwerken", web: "Geen web search met gevoelige gegevens", prompts: "Gevoelige gegevens in prompts", external: "E-mail van externe afzenders niet verwerken" };
const CP_PROMPT_KINDS = ["builtin", "custom"];
const CP_ENC_TEXT = { dke: "Dubbele sleutel (DKE)", noextract: "Zonder EXTRACT-recht", extract: "Mag samenvatten (EXTRACT-recht)", userDefined: "Door gebruiker bepaalde rechten (UDP)", none: "Geen encryptie", remove: "Geen encryptie" };
const CP_EXTRACT_TIP = "EXTRACT = recht om inhoud te kopiëren; zonder dit recht kan Copilot de inhoud niet gebruiken.";
const CP_HEALTH_SITS = ["bsn", "med-all", "icd10", "tc-healthcare", "tc-medforms", "tpl-patnr", "tpl-opname", "edm-patient", "edm-brp", "fp-intake", "fp-verwijs", "tpl-wmo"];
const CP_TYPE_SHORT = {
  labels: "Bestanden en e-mails met deze labels niet gebruiken. Meestal regel je dit al hierboven per label.",
  web: "Geen web search als de prompt gevoelige gegevens bevat.",
  prompts: "Geen antwoord als de prompt gevoelige gegevens bevat.",
  external: "E-mail van buiten de organisatie niet gebruiken.",
};
/* Bron: Microsoft Purview service description – DLP for Microsoft Copilot (licentietabel). */
const CP_LICENSE = "Licentie: labels uitsluiten (bestanden en e-mails) vereist Microsoft 365 E5/A5, E5 Information Protection and Governance, Office 365 E5 of Microsoft Purview Suite. DLP voor prompts is beschikbaar voor alle gebruikers van Microsoft 365 Copilot en Copilot Chat. Voor web search en externe e-mail: controleer de actuele servicebeschrijving.";
const CP_NOTES_EXTRA = [
  "Double Key Encryption (DKE): Copilot kan deze inhoud niet gebruiken; met een geopend DKE-item werkt Copilot in de app niet.",
  "Labels met door de gebruiker bepaalde rechten: niet-geopende bestanden in SharePoint/OneDrive kan Copilot meestal niet gebruiken; een geopend bestand wel (met EXTRACT).",
  CP_LICENSE,
];

const CopilotUI = {
  policies(st = S()) { return (st.customDlp || []).filter((c) => (c.locations || []).includes("copilot")); },
  promptSits(st = S()) { return st.sits.filter((s) => CP_PROMPT_KINDS.includes(s.kind)); },
  health(l, st = S()) {
    let sits = [];
    try { sits = labelSits(l, st) || []; } catch (e) { sits = []; }
    return sits.some((s) => s && (CP_HEALTH_SITS.includes(s.id) || /\bBSN\b|patiënt|patient|medisch|medical|health|gezondheid|ICD/i.test(s.name || "")));
  },
  extract(l) {
    const e = l.cfg.encryption;
    if (e.dke) return { k: "dke", lv: 4, t: "Double Key Encryption: Copilot kan de inhoud niet verwerken." };
    if (e.mode === "none" || e.mode === "remove") return { k: e.mode, lv: 0, t: "Geen encryptie: Copilot gebruikt inhoud waartoe de gebruiker toegang heeft." };
    if (e.mode === "userDefined") return { k: "userDefined", lv: 2, t: "Gebruiker kiest rechten: Copilot verwerkt alleen voor gebruikers met de rechten EXTRACT (Copy) én VIEW. Niet-geopende bestanden in SharePoint/OneDrive met deze rechten kan Copilot meestal niet gebruiken; een geopend bestand wel." };
    const rights = (p) => { const pl = CATALOG.permissionLevels.find((x) => x.key === p.level); return p.level === "Custom" || !pl ? p.rights || [] : pl.rights; };
    const perms = e.permissions || [];
    if (!perms.length) return { k: "extract", lv: 1, t: "Versleuteld (nog geen rechten toegewezen)." };
    const no = perms.filter((p) => !rights(p).includes("EXTRACT"));
    return no.length
      ? { k: "noextract", lv: 3, t: `Versleuteld; ${no.length} rechtenregel(s) zonder EXTRACT – Copilot vat de inhoud voor die gebruikers niet samen, maar kan wel een link naar het item tonen. Is het item geopend, dan werkt Copilot in die app niet.` }
      : { k: "extract", lv: 1, t: "Versleuteld met EXTRACT: Copilot kan samenvatten voor gebruikers met rechten." };
  },
  effect(l) {
    const a = (l.cfg.dlp.copilot || {}).action || "off";
    if (a === "block") return { lv: 4, t: "Niet gebruikt in Copilot-antwoorden (kan nog als bronvermelding verschijnen)." };
    if (a === "audit") return { lv: 1, t: "Simulatie: de policy draait in simulatiemodus; je ziet de resultaten bij de policy in het Purview-portal, zonder effect voor gebruikers." };
    return { lv: 0, t: "Copilot mag verwerken (binnen de rechten van de gebruiker)." };
  },
  seedSits(st) {
    const ls = applicableLabels(st);
    const src = ls.filter((l) => ((l.cfg.dlp.copilot || {}).action || "off") !== "off");
    const pick = src.length ? src : ls.slice(-2);
    return unique(pick.flatMap((l) => labelSits(l, st)).filter((s) => CP_PROMPT_KINDS.includes(s.kind)).map((s) => s.id)).slice(0, 10);
  },
  newPolicy(st) {
    const p = CdlpUI.newPolicy(st, { name: `${st.dlpSettings.namingPrefix ? st.dlpSettings.namingPrefix + " – " : ""}Microsoft 365 Copilot – maatwerk`.slice(0, 64), locations: ["copilot"], rules: [], desc: "Maatwerk-policy voor de locatie Microsoft 365 Copilot and Copilot Chat." });
    st.customDlp = st.customDlp || [];
    st.customDlp.push(p);
    return p;
  },
};

DnD.register("cp-label", (type, p, t) => {
  const c = CATALOG.choiceById[p.choiceId];
  if (!c || c.d !== "dlp_copilot") { Toast.show("Alleen Copilot-kaarten passen hier.", "warn"); return; }
  let ok = false;
  Store.update((st) => { ok = Mapping.apply(st, t.labelId, c.id); });
  if (!ok) Toast.show("Dit label heeft sublabels en kan zelf niet worden toegepast.", "warn");
});

Actions["cp-add-rule"] = (el) => {
  const type = el.dataset.type;
  Store.update((st) => {
    const c = CopilotUI.policies(st).find((x) => x.id === UI.cpSel) || CopilotUI.policies(st)[0] || CopilotUI.newPolicy(st);
    const sits = type === "web" || type === "prompts" ? CopilotUI.seedSits(st) : [];
    c.rules.push(CdlpUI.newRule(c.rules.length, { name: CP_RULE_NAMES[type] || `Regel ${c.rules.length + 1}`, sits, action: "copilot", copilotAction: type === "labels" ? "prompts" : type, tip: false, accessScope: "", severity: "Medium" }));
    UI.dlpEdit = c.id;
  });
  Toast.show(type === "labels" ? "Regel toegevoegd – sleep labels in de conditie." : type === "external" ? "Regel toegevoegd (conditie: externe afzenders)." : "Regel toegevoegd met SIT’s van de gevoeligste labels – controleer de lijst.", "ok");
};
Actions["cp-new-policy"] = () => {
  Store.update((st) => { const c = CopilotUI.newPolicy(st); UI.cpSel = c.id; c.rules.push(CdlpUI.newRule(0, { name: CP_RULE_NAMES.prompts, action: "copilot", copilotAction: "prompts", tip: false, accessScope: "", severity: "Medium" })); });
};
Actions["cp-sel"] = (el) => { UI.cpSel = el.dataset.id; App.render(); };
Actions["cp-all"] = (el) => {
  let n = 0;
  Store.update((st) => { n = Mapping.applyRow(st, "dlp_copilot", el.dataset.choice); });
  Toast.show(`${n} label(s) bijgewerkt.`, "ok");
};
Actions["cp-edit"] = (el) => { UI.dlpTab = "editor"; UI.dlpEdit = el.dataset.id; App.go("dlp"); };

const CP_SEG = { "cp-off": "Toestaan", "cp-sim": "Simuleren", "cp-block": "Uitsluiten" };
registerView("copilot", {
  title: "Microsoft 365 Copilot",
  fac: {
    duration: 30,
    goal: "Bepalen welke informatie Microsoft 365 Copilot en Copilot Chat níet mogen gebruiken: gelabelde bestanden en e-mails, gevoelige gegevens in prompts, web search en externe e-mail.",
    questions: ["Welke labels zijn te gevoelig om in Copilot-antwoorden terug te komen?", "Welke gegevens (BSN, IBAN, patiëntnummers) mogen nooit in een prompt staan?", "Mag Copilot het web raadplegen met interne informatie in de prompt?"],
    tips: ["Copilot respecteert altijd de rechten van de gebruiker; DLP voegt een extra laag toe voor gelabelde inhoud.", "Start in simulatiemodus en gebruik DSPM for AI voor inzicht in AI-gebruik.", "Maak per regeltype een aparte regel: labels óf SIT’s."],
    pitfalls: ["De Copilot-locatie kan niet gecombineerd worden met andere locaties.", "Prompt-regels ondersteunen geen EDM, fingerprints of trainable classifiers.", "Encryptie zonder EXTRACT blokkeert ook samenvatten – soms ongewenst."],
    links: ["dlpCopilot", "labelsCopilot", "dspmAi"],
  },
  done: (st) => applicableLabels(st).some((l) => ((l.cfg.dlp.copilot || {}).action || "off") !== "off") || CopilotUI.policies(st).length > 0,
  render() {
    const st = S();
    const lead = "Welke informatie mag Copilot níet gebruiken?";
    if (!st.labels.length) return pageHead("Beleid & DLP", "Microsoft 365 Copilot", lead) + VH.needLabels();
    const ls = applicableLabels(st);
    const g = Generator.all(st);
    const cpPols = g.dlpPolicies.filter((p) => (p.locations || []).includes("copilot"));
    const nBlock = ls.filter((l) => (l.cfg.dlp.copilot || {}).action === "block").length;
    const cps = CATALOG.choicesFor("dlp_copilot");
    const nExtra = sum(CopilotUI.policies(st).map((c) => c.rules.length));

    const rows = ls.map((l) => {
      const cur = Mapping.choice(l, "dlp_copilot"), x = CopilotUI.extract(l), ef = CopilotUI.effect(l);
      const dpia = (!cur || cur.id !== "cp-block") && CopilotUI.health(l, st) ? `<div class="vb-dpia xs">${icon("warning", "s")} Is er een DPIA voor Copilot op ${st.meta.sector === "zorg" ? "patiëntgegevens" : "deze persoonsgegevens (BSN)"}? Zo niet: kies ‘Uitsluiten van Copilot’.</div>` : "";
      return `<tr><th data-drop="choice" data-zone="cp-label" data-target='${attr({ labelId: l.id })}'>${labelPill(l, st)}</th>
        <td><div class="cp-seg" role="group" aria-label="${esc(`Copilot en ${labelFullName(l, st)}`)}">${cps.map((c) => `<button type="button" class="cp-seg-b${cur && cur.id === c.id ? " on" : ""}" aria-pressed="${!!(cur && cur.id === c.id)}" data-action="board-choose" data-id="${esc(l.id)}" data-choice="${esc(c.id)}" title="${esc(`${c.title} – ${c.desc}`)}">${icon(c.icon, "s")}<span>${esc(CP_SEG[c.id] || c.title)}</span></button>`).join("")}</div>${Mapping.isCustom(l, "dlp_copilot") ? ` <span class="cell-flag">aangepast</span>` : ""}${dpia}</td>
        <td class="vb-cp-res"><div class="cp-res">${levelChip(ef.lv, ef.lv === 4 ? "Uitgesloten" : ef.lv === 1 ? "Simulatie" : "Toegestaan")} ${infoTip(ef.t)}</div><div class="cp-res-enc xs muted">${icon("lock", "s")} ${esc(CP_ENC_TEXT[x.k] || "Geen encryptie")} ${infoTip(`${x.t}${["extract", "noextract"].includes(x.k) ? ` ${CP_EXTRACT_TIP}` : ""}`)}</div></td></tr>`;
    }).join("");
    const labelTable = `<div class="card flat" style="padding:12px">
      <div class="table-wrap" tabindex="0" role="region" aria-label="Copilot per label"><table class="table vb-cp-table"><thead><tr><th>Label</th><th>Copilot mag dit label gebruiken?</th><th>Resultaat ${infoTip(`Wat Copilot met dit label doet, plus de encryptie. Bij encryptie verwerkt Copilot inhoud alleen voor gebruikers met de rechten EXTRACT (Copy) én VIEW. ${CP_EXTRACT_TIP}`)}</th></tr></thead><tbody>${rows}
      <tr><th class="muted">Alle labels</th><td colspan="2"><div class="cp-seg cp-seg-all" role="group" aria-label="Alle labels tegelijk">${cps.map((c) => `<button type="button" class="cp-seg-b" data-action="cp-all" data-choice="${esc(c.id)}" title="${esc(`${c.title} voor alle labels`)}">${icon(c.icon, "s")}<span>${esc(CP_SEG[c.id] || c.title)}</span></button>`).join("")}</div></td></tr></tbody></table></div></div>`;

    const allRules = CopilotUI.policies(st).flatMap((c) => c.rules);
    const isLabelRule = (r) => (r.labels || []).length > 0 || r.name === CP_RULE_NAMES.labels;
    const ruleCount = (k) => allRules.filter((r) => k === "labels" ? isLabelRule(r) : (r.copilotAction || "prompts") === k && !isLabelRule(r)).length;
    const typeList = `<ul class="cp-types" aria-label="Soorten extra regels">${CATALOG.copilot.ruleTypes.map((t) => {
      const n = ruleCount(t.key), nm = CP_RULE_NAMES[t.key] || t.name;
      return `<li class="cp-type${n ? " on" : ""}"><span class="cp-type-t"><b>${esc(nm)}</b><span class="xs muted">${esc(CP_TYPE_SHORT[t.key] || "")}</span></span>
        <span class="cp-type-m">${t.ga ? `<span class="badge ok">GA</span>` : previewBadge()}<span class="cp-type-s xs ${n ? "ok-t" : "muted"}">${n ? `${icon("check", "s")} ${esc(plural(n, "regel", "regels"))}` : "Niet gebruikt"}</span>${infoTip(`${t.name} → ${t.action}. ${t.desc}${t.key === "labels" ? " Wordt ook automatisch afgeleid uit de labelkeuzes hierboven." : ""}`)}</span>
        <button type="button" class="btn small subtle cp-type-add" data-action="cp-add-rule" data-type="${esc(t.key)}" aria-label="${esc(`Regel toevoegen: ${nm}`)}">${icon("plus", "s")} Toevoegen</button></li>`;
    }).join("")}</ul>`;

    const more = `<p>Copilot gebruikt altijd alleen informatie waartoe de gebruiker zelf toegang heeft. Met DLP voor Microsoft 365 Copilot en Copilot Chat sluit je daarbovenop gelabelde bestanden en e-mails uit (Content contains › Sensitivity labels; e-mails verzonden vanaf 1 januari 2025, geen agenda-items; in Word/Excel/PowerPoint geëvalueerd bij het openen).</p><p>Met maatwerkregels voorkom je dat Copilot prompts met gevoelige gegevens verwerkt, ermee op het web zoekt of e-mail van externe afzenders gebruikt.</p>`;
    const notifyNote = "Gebruikersmeldingen voor de Copilot-locatie stel je zo nodig na de import in het Purview-portal in; het script zet ze niet aan (een gekozen alert bij ‘Uitsluiten van Copilot’ zet het script wel).";
    const pols = CopilotUI.policies(st);
    return VH.wrap(`${pageHead("Beleid & DLP", "Microsoft 365 Copilot", lead, "", more + `<p class="small muted">Nu: ${nBlock}/${ls.length} labels uitgesloten · ${plural(nExtra, "extra regel", "extra regels")}.</p><p class="small">${esc(CP_LICENSE)} ${statusBadge("verify")}</p>`)}
      <h3 class="section-title">${icon("tag", "s")} Labels uitsluiten van Copilot ${infoTip("Purview: Content contains › Sensitivity labels → Prevent Copilot from processing content. Items met het label worden niet gebruikt in antwoorden, maar kunnen nog als bronvermelding verschijnen.")}</h3>${labelTable}
      <section class="cp-extra" aria-labelledby="cp-extra-h"><h3 class="section-title mt-3" id="cp-extra-h">${icon("sparkle", "s")} Extra regels ${infoTip(`Maatwerkregels voor prompts, web search en externe e-mail in een aparte Copilot-policy (Custom-template). De Copilot-locatie kan niet met andere locaties in één policy. Alleen built-in en custom SIT’s: geen trainable classifiers, EDM of document fingerprints. ${notifyNote}`)}</h3>
      <p class="small muted mt-0 mb-2">Optioneel. Kies wat Copilot nog meer níet mag doen.</p>
      ${typeList}
      ${pols.length ? `<div class="mt-3">${this.customBlock(st)}</div>` : ""}</section>
      <div class="cp-foot mt-3">${techOnly(accordion("cp-result", `${icon("layers", "s")} Resulterende Copilot-policies <span class="xs muted">· ${cpPols.length}</span>`, cpPols.length ? cpPols.map((p) => VH.policyCard(p, st)).join("") : msg("info", "Nog geen Copilot-policies: kies ‘Uitsluiten van Copilot’ of ‘Eerst simuleren’ voor een label, of voeg een regel toe.")))}
      ${accordion("cp-notes", `${icon("info", "s")} Goed om te weten <span class="xs muted">· ${CATALOG.copilot.notes.length + CP_NOTES_EXTRA.length + 2}</span>`, `<ul class="small"><li><b>${esc(notifyNote)}</b></li>${CATALOG.copilot.notes.map((n) => `<li>${esc(n)}</li>`).join("")}${CP_NOTES_EXTRA.map((n) => `<li>${esc(n)}</li>`).join("")}<li>${esc(CATALOG.sitLimits.copilotFingerprint)}</li></ul>
        <div class="ws-links">${learn("dlpCopilot", "DLP voor Microsoft 365 Copilot")} ${learn("labelsCopilot", "Sensitivity labels en Copilot")} ${learn("dspmAi", "DSPM for AI")}</div>`)}</div>`);
  },

  customBlock(st) {
    const pols = CopilotUI.policies(st);
    if (!pols.length) return `<div class="cp-pol">${emptyState("sparkle", "Nog geen maatwerkregels", "Voeg hierboven een regel toe voor prompts, web search of externe e-mail.", `<button class="btn primary" data-action="cp-new-policy">${icon("plus", "s")} Copilot-policy</button>`)}</div>`;
    const typeName = { prompts: "Processing prompts", web: "Performing web searches", external: "Email from external users" };
    const cur = pols.find((c) => c.id === UI.cpSel) || pols[0];
    const anyEmpty = cur.rules.some((r) => !(r.labels || []).length && !(r.sits || []).length && r.copilotAction !== "external");
    const palette = accordion("cp-pal", `${icon("tag", "s")} Labels en informatietypen toevoegen <span class="xs muted">· slepen of tikken</span>`, `
      <div class="field-label">${icon("tag", "s")} Labels</div>
      <div class="chip-list mb-2">${applicableLabels(st).map((l) => `<span class="chip" style="cursor:grab" data-drag="pub-label" data-tap="1" data-pick-label="${esc(labelFullName(l, st))}" data-payload="${attr({ labelId: l.id })}"><span class="color-dot" style="background:${esc(l.color)}"></span>${esc(labelFullName(l, st))}</span>`).join("")}</div>
      <div class="field-label">${icon("search", "s")} Informatietypen ${infoTip("Sleep naar ‘Content contains’ van een regel. Grijs = niet bruikbaar in Copilot-regels (EDM, fingerprint, trainable classifier).")}</div>
      <div class="chip-list lib-scroll" style="max-height:40vh">${st.sits.map((s) => CP_PROMPT_KINDS.includes(s.kind)
        ? `<span data-drag="sit" data-tap="1" data-pick-label="${esc(s.name)}" data-payload="${attr({ sitId: s.id })}" style="cursor:grab">${VH.sitChip(s)}</span>`
        : `<span style="opacity:.45" title="Niet ondersteund in Copilot-prompts (alleen built-in en custom SIT’s)">${VH.sitChip(s)}</span>`).join("") || `<span class="xs muted">Nog geen informatietypen.</span>`}</div>`, anyEmpty, false);
    const addPol = `<button type="button" class="btn small subtle" data-action="cp-new-policy">${icon("plus", "s")} Nog een Copilot-policy</button>`;
    const block = [cur].map((c) => {
      const gp = Generator.customPolicy(c, st);
      const iss = CdlpUI.issues(c, st);
      const cid = esc(c.id);
      const rules = c.rules.map((r, i) => {
        const b = `cdlp:${c.id}:rules.${i}`;
        const hasL = (r.labels || []).length > 0, isExt = r.copilotAction === "external" && !hasL;
        const nCond = (r.labels || []).length + (r.sits || []).length;
        const chips = [...(r.labels || []).map((id) => { const l = labelById(id, st); return l ? `<span class="chip sm"><span class="color-dot" style="background:${esc(l.color)}"></span>${esc(labelFullName(l, st))}<button class="chip-x" data-action="cdlp-cond-del" data-id="${cid}" data-rule="${i}" data-kind="labels" data-v="${esc(id)}" title="Verwijderen" aria-label="${esc(labelFullName(l, st))} verwijderen">${icon("x", "s")}</button></span>` : ""; }),
          ...(r.sits || []).map((id) => { const s = sitById(id, st); return s ? VH.sitChip(s, `<button class="chip-x" data-action="cdlp-cond-del" data-id="${cid}" data-rule="${i}" data-kind="sits" data-v="${esc(id)}" title="Verwijderen" aria-label="${esc(s.name)} verwijderen">${icon("x", "s")}</button>`) : ""; })].join("");
        const gr = gp.rules[i];
        const kind = hasL ? "Sensitivity labels" : typeName[r.copilotAction] || r.copilotAction;
        const empty = !isExt && !nCond;
        const sumHtml = `<span class="prio-num">${i + 1}</span><span class="vb-sum-title">${esc(r.name || `Regel ${i + 1}`)}</span><span class="badge neutral">${esc(kind)}</span>${isExt ? "" : `<span class="xs muted">${nCond ? plural(nCond, "conditie", "condities") : ""}</span>`}${empty ? `<span class="badge warn">Geen conditie</span>` : ""}`;
        const body = `${F.text(`${b}.name`, "Naam van de regel", { maxlength: 64 })}
          ${hasL ? `<div class="xs muted mb-1">Regeltype: Content contains › Sensitivity labels → items worden niet verwerkt.</div>` : F.radios(`${b}.copilotAction`, "Regeltype", [["prompts", "Processing prompts", "Copilot beantwoordt de prompt niet.", previewBadge()], ["web", "Performing web searches", "Geen web search met deze gegevens.", ""], ["external", "Email is received from › External users", "Externe e-mail niet gebruiken.", previewBadge()]])}
          ${isExt ? msg("info", "Conditie: afzender buiten de organisatie (geen labels of SIT’s nodig).") : `<div class="cond-group pc-drop" data-drop="sit pub-label" data-zone="cdlp-cond" data-target='${attr({ policyId: c.id, ruleId: r.id })}'><div class="field-label">Content contains</div><div class="chip-list">${chips || `<span class="drop-hint">Sleep labels óf informatietypen hierheen</span>`}</div></div>`}
          ${gr ? `<div class="xs muted mt-1">${icon("info", "s")} ${esc(gr.desc)}</div>` : ""}
          <div class="row mt-1"><span class="spacer"></span><button class="btn small subtle" data-action="cdlp-rule-del" data-id="${cid}" data-rule="${i}">${icon("trash", "s")} Regel verwijderen</button></div>`;
        return `<details class="acc vb-racc cp-rule" data-acc="cp-rule-${esc(r.id)}"${empty ? " open" : ""}><summary>${sumHtml}</summary><div class="acc-body">${body}</div></details>`;
      }).join("");
      const opts = accordion(`cp-more-${c.id}`, `${icon("settings", "s")} Meer opties <span class="xs muted">· modus, wizard, extra policy</span>`, `
        <div class="cp-more">${F.select(`cdlp:${c.id}:mode`, "Policy mode", CATALOG.dlpModes.map((m) => [m.key, m.nl || m.name]), { cls: "mb-0" })}
        <div class="cp-more-a"><button type="button" class="btn small" data-action="cp-edit" data-id="${cid}">${icon("edit", "s")} In wizard bewerken</button>${addPol}</div></div>`, false, false);
      return `<section class="cp-pol" aria-label="${esc(`Copilot-policy ${c.name}`)}"><div class="cp-pol-h">${icon("sparkle", "s")}<h4>${esc(c.name)}</h4>${VH.modeBadge(c.mode)}</div>
        ${iss.length ? `<div class="cp-iss">${iss.map((x) => `<div class="val-item ${esc(x.level)}" style="cursor:default"><div><div class="vi-title">${esc(x.title)}</div>${x.desc ? `<div class="vi-desc">${esc(x.desc)}</div>` : ""}</div></div>`).join("")}</div>` : ""}
        <div class="cp-rules">${rules || `<div class="xs muted">Nog geen regels.</div>`}</div>
        ${palette}${opts}</section>`;
    }).join("");
    return pols.length > 1
      ? VH.switcher({ label: "Copilot-policy", items: pols.map((c) => ({ id: c.id, name: c.name, icon: "sparkle", note: ({ simulation: "simulatie", simulationTips: "simulatie", enable: "aan", disable: "uit" })[c.mode] || "" })), cur: cur.id, action: "cp-sel", key: "id" }, block)
      : block;
  },
});
