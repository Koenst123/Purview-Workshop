/* View: Service-side auto-labeling – één auto-labeling policy per label (Exchange, SharePoint, OneDrive). */

const AUTO_MODES = [
  ["simulation", "Run policy in simulation mode", "Aanbevolen start: Purview toont welke items het label zouden krijgen, zonder iets te wijzigen (PowerShell: TestWithoutNotifications)."],
  ["enable", "Turn on policy", "Labelt daadwerkelijk. Pas aan na beoordeling van de simulatieresultaten."],
  ["disable", "Leave policy turned off", "Policy is aangemaakt maar staat uit."],
];
const AUTO_LIMITS = [
  "Maximaal 100 auto-labeling policies per tenant; één label per policy.",
  "Tot 500.000 bestanden per dag worden gelabeld (tenantbreed).",
  "Tot 1.000 SharePoint-sites of 100 OneDrive-accounts per policy bij specifieke selectie (adaptive scopes via PowerShell: meer).",
  "Een simulatie stopt bij 20 miljoen gevonden bestanden.",
  "Locaties: alleen Exchange, SharePoint en OneDrive. Teams-chats, on-premises en Power BI vallen buiten service-side auto-labeling.",
  "Het label hoeft niet gepubliceerd te zijn; het overschrijft standaard geen handmatig gekozen labels.",
  "Bestanden worden pas gelabeld als ze aan de voorwaarden voldoen én door de service zijn gescand; bij Exchange alleen berichten in transit (niet de mailbox-inhoud).",
];

const AutoUI = {
  issues(l, st) {
    const sv = l.cfg.autolabel.service, out = [];
    const sits = Generator.autoSits(l, st), all = labelSits(l, st);
    if (!all.length) out.push(["err", "Geen informatietypen gekoppeld; de policy heeft geen voorwaarden."]);
    else if (!sits.length) out.push(["err", "De gekoppelde classifiers zijn niet bruikbaar in een auto-labeling policy; koppel SIT’s of EDM."]);
    if (sits.length && sits.every((s) => s.kind === "edm")) out.push(["info", "Alleen EDM: werkt service-side, maar controleer dat het EDM-schema en de upload actueel zijn."]);
    if (sits.some((s) => s.kind === "fingerprint" || s.kind === "classifier")) out.push(["info", "Document fingerprint of trainable classifier: controleer per locatie of deze classifier in auto-labeling wordt ondersteund en valideer de resultaten in simulatie."]);
    if (!sv.exchange && !sv.sharepoint && !sv.onedrive) out.push(["err", "Kies minstens één locatie."]);
    if (l.cfg.encryption.mode === "userDefined") out.push(["err", "Labels met ‘Let users assign permissions’ kunnen niet service-side automatisch worden toegepast."]);
    if (l.cfg.encryption.dke) out.push(["err", "Labels met Double Key Encryption kunnen niet automatisch worden toegepast."]);
    if (sv.exchange && !l.cfg.scope.emails) out.push(["warn", "Exchange gekozen, maar het label heeft de scope Emails niet."]);
    const enc = l.cfg.encryption.mode && l.cfg.encryption.mode !== "none";
    if (sv.exchange && enc) out.push(["warn", "Dit label versleutelt ook automatisch uitgaande mail naar externe ontvangers. Controleer de ketenpartners vóór je de simulatie uitzet."]);
    if (sv.autoEnable && enc) out.push(["warn", "Automatisch aanzetten na 7 dagen staat aan voor een versleutelend label. Zet dit niet aan zonder evaluatie van de simulatie."]);
    if ((sv.sharepoint || sv.onedrive) && !l.cfg.scope.files) out.push(["warn", "SharePoint/OneDrive gekozen, maar het label heeft de scope Files niet."]);
    if (sv.mode === "enable") out.push(["info", "Direct aan: Microsoft adviseert eerst simulatie en beoordeling van de resultaten."]);
    if (sv.encryptExternalMail && !sv.exchange) out.push(["warn", "‘Apply encryption to email received from outside’ heeft alleen effect met de locatie Exchange."]);
    if (sv.encryptExternalMail && !String(sv.rmsOwner || "").trim()) out.push(["err", "Bij encryptie van binnenkomende externe mail is een Rights Management owner verplicht."]);
    return out;
  },
};

registerView("autolabel", {
  title: "Auto-labeling",
  fac: {
    duration: 20,
    goal: "Bepalen voor welke labels Purview bestaande bestanden en mail automatisch labelt, en hoe we dat veilig invoeren (eerst simulatie).",
    questions: ["Welke informatie staat nu ongelabeld in SharePoint/OneDrive en is zo gevoelig dat we niet op de gebruiker willen wachten?", "Welke informatietypen zijn betrouwbaar genoeg om automatisch op te labelen (weinig valse treffers)?", "Wie beoordeelt de simulatieresultaten, en wanneer zetten we de policy aan?"],
    tips: ["Begin met één of twee gevoelige labels, niet met alles.", "Laat de simulatie minstens een week lopen en bekijk de voorbeelden met de data-eigenaar.", "Client-side (in Office) stel je per label in onder Label-instellingen."],
    pitfalls: ["Policy direct aanzetten zonder simulatie: massaal verkeerde labels, lastig terug te draaien.", "Auto-labeling met een label dat ‘Let users assign permissions’ gebruikt: wordt niet toegepast.", "Verwachten dat handmatig gekozen labels worden overschreven: standaard gebeurt dat niet."],
    links: ["labelsAuto", "labelsDefaultLibrary"],
  },
  render() {
    const st = S();
    if (!st.labels.length) return VH.needLabels();
    const labels = applicableLabels(st).filter((l) => l.cfg.scope.files || l.cfg.scope.emails);
    const withPol = labels.filter((l) => l.cfg.autolabel.service.enabled);
    const pols = Generator.autoPolicies(st);
    const sim = pols.filter((p) => p.mode === "simulation").length;
    const client = labels.filter((l) => l.cfg.autolabel.client.mode !== "off").length;
    const stats = pols.length ? `<div class="row mb-2" style="gap:24px">
      <div class="stat"><span class="stat-value">${pols.length}</span><span class="stat-label">automatisch in de cloud (service-side)</span></div>
      <div class="stat"><span class="stat-value">${sim}</span><span class="stat-label">in simulatie</span></div>
      <div class="stat"><span class="stat-value">${client}</span><span class="stat-label">voorstel of automatisch in Office (client-side)</span></div>
      ${pols.length >= 90 ? `<div class="stat"><span class="stat-value">${100 - pols.length}</span><span class="stat-label">nog beschikbaar van max. 100 policies</span></div>` : ""}</div>` : "";
    const card = (l) => {
      const sv = l.cfg.autolabel.service, id = l.id, b = `lbl:${id}:cfg.autolabel.service`, sits = labelSits(l, st);
      const iss = AutoUI.issues(l, st);
      const nErr = iss.filter((x) => x[0] === "err").length, nWarn = iss.filter((x) => x[0] === "warn").length;
      const locs = [sv.exchange && "Exchange", sv.sharepoint && "SharePoint", sv.onedrive && "OneDrive"].filter(Boolean).join(", ") || "geen locatie";
      const summ = `${labelPill(l, st)}${VH.modeBadge(sv.mode)}<span class="pc-meta">${esc(locs)} · ${plural(sits.length, "informatietype", "informatietypen")}</span>${nErr ? `<span class="badge err">${plural(nErr, "fout", "fouten")}</span>` : nWarn ? `<span class="badge warn">${plural(nWarn, "aandachtspunt", "aandachtspunten")}</span>` : ""}`;
      const body = `<div class="pc-body">
          <div class="row tight mb-1"><div class="field-label mb-0">Conditions – Content contains</div><span class="spacer"></span><button class="btn small subtle" data-action="al-remove" data-id="${esc(id)}">${icon("trash", "s")} Policy verwijderen</button></div>
          ${sits.length ? `<div class="row tight mb-1"><div class="sit-chips f-1">${sits.map((s) => VH.sitChip(s)).join("")}</div><button class="btn small subtle" data-action="board-sits" data-id="${esc(id)}" data-back="autolabel">${icon("edit", "s")} Wijzigen</button></div>` : msg("err", `Geen informatietypen. <button class="btn small" data-action="board-sits" data-id="${esc(id)}" data-back="autolabel">${icon("search", "s")} Koppelen</button>`)}
          <div class="grid-3">
            ${F.select(`${b}.confidence`, "Confidence level", CATALOG.confidence.map(([k, n, p]) => [k, `${n} (${p})`]))}
            ${F.number(`${b}.minCount`, "Instance count – from", { min: 1, max: 500 })}
            <div class="field"><div class="field-label">Locations</div>${F.check(`${b}.exchange`, `${icon("mail", "s")} Exchange email`)}${F.check(`${b}.sharepoint`, `${icon("site", "s")} SharePoint sites`)}${F.check(`${b}.onedrive`, `${icon("cloud", "s")} OneDrive accounts`)}</div>
          </div>
          ${F.radios(`${b}.mode`, "Decide if you want to test out the policy now or later", AUTO_MODES, { cards: true })}
          ${accordion(`al-more-${id}`, `${icon("settings", "s")} Additional settings`, `
            ${sv.mode === "simulation" ? `<div class="check-row">${F.check(`${b}.autoEnable`, "Automatically turn on policy if not modified after 7 days in simulation")}${infoTip("De policy gaat zelf aan als je hem na 7 dagen simulatie niet wijzigt. Zet dit niet aan voor versleutelende labels zonder evaluatie.")}</div>` : ""}
            <div class="check-row">${F.check(`${b}.overrideManual`, "Automatically replace existing labels that have the same or lower priority")}${infoTip("Standaard overschrijft auto-labeling geen labels die een gebruiker handmatig koos.")}</div>
            ${sv.exchange ? `<div class="check-row">${F.check(`${b}.encryptExternalMail`, "Apply encryption to email received from outside your organization")}${infoTip("Versleutelt binnenkomende mail van externen met de rechten van het label.")}</div>` : ""}
            ${sv.exchange && sv.encryptExternalMail ? F.text(`${b}.rmsOwner`, "Assign a Rights Management owner", { ph: "rms-owner@contoso.nl", hint: "Verplicht: een mailbox in de tenant die eigenaar wordt van de versleutelde berichten." }) : ""}`)}
          ${iss.length ? iss.map(([k, t]) => msg(k, t)).join("") : msg("ok", "Klaar voor simulatie.")}
        </div>`;
      return `<div class="policy-card mb-2">${accordion(`al-${id}`, summ, body, withPol.length === 1 || nErr > 0)}</div>`;
    };
    const free = labels.filter((l) => !l.cfg.autolabel.service.enabled);
    const addBtn = free.length ? `<button class="btn${withPol.length ? "" : " primary"}" data-action="al-add">${icon("plus", "s")} Auto-labeling voor label…</button>` : "";
    const list = !labels.length ? emptyState("wand", "Geen geschikte labels", "Auto-labeling vereist labels met de scope Files of Emails.")
      : withPol.length ? withPol.map(card).join("") + `<div class="mb-2">${addBtn}</div>`
      : emptyState("wand", "Nog geen auto-labeling policies", "Kies een label dat Purview automatisch mag toepassen op bestaande bestanden en mail. De policy start in simulatie.", addBtn);
    return `${pageHead("Labels", "Auto-labeling (service-side)", "Labels automatisch toepassen op bestaande bestanden en mail – altijd eerst in simulatie.", `<button class="btn" data-action="go" data-route="labels" title="Voorstel of automatisch label in Word, Excel, PowerPoint en Outlook">${icon("wand", "s")} In Office (client-side) per label</button>`, `<p class="mb-1"><b>Automatisch in de cloud (service-side):</b> Purview labelt bestanden in SharePoint en OneDrive (ook als niemand ze opent) en mail in transit in Exchange. Eén policy per label; start altijd in simulatie en beoordeel de resultaten met de data-eigenaar.</p><p class="mb-1"><b>In Office (client-side):</b> een voorstel of automatisch label tijdens het werken; dat stel je per label in onder Label-instellingen.</p>${learn("labelsAuto", "Apply a sensitivity label automatically")}`)}
      ${stats}
      <div class="split wide-left"><div>
        ${list}
      </div><div>
        ${pols.length ? `<div class="card mb-2"><h4 class="mt-0">${icon("cloud")} Gegenereerde policies</h4>
          ${pols.map((p) => `<div class="rule-row"><div class="rr-main"><div class="row tight"><b class="wrap-any">${esc(p.name)}</b> ${VH.modeBadge(p.mode)}</div><div class="muted xs">${esc(p.locations.join(", ") || "geen locatie")} · ${plural(p.sits.length, "classifier", "classifiers")} · ${plural(p.rules.length, "regel", "regels")}</div></div></div>`).join("")}</div>` : ""}
        <div class="card mb-2"><h4 class="mt-0">${icon("folder")} Alternatief: default label voor een bibliotheek</h4>
          <p class="small mb-1">Een SharePoint-documentbibliotheek kan één default sensitivity label krijgen voor nieuwe en gewijzigde bestanden (zonder hoger label) – bijvoorbeeld voor een HR- of Directiebibliotheek.</p>
          ${learn("labelsDefaultLibrary", "Default label voor een bibliotheek")}</div>
        ${accordion("al-limits", `${icon("info", "s")} Limieten <span class="badge neutral">${AUTO_LIMITS.length}</span>`, `<ul class="small">${AUTO_LIMITS.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>${learn("newAutoLabelPolicy", "New-AutoSensitivityLabelPolicy")}`)}
      </div></div>`;
  },
});

Actions["al-add"] = (el) => {
  const st = S();
  const free = applicableLabels(st).filter((l) => (l.cfg.scope.files || l.cfg.scope.emails) && !l.cfg.autolabel.service.enabled);
  Menu.open(el, free.map((l) => ({ icon: "tag", label: labelFullName(l, st), desc: plural(labelSits(l, st).length, "informatietype", "informatietypen") + " gekoppeld", fn: () => Store.update((s2) => {
    const x = labelById(l.id, s2); if (!x) return;
    const sv = x.cfg.autolabel.service;
    sv.enabled = true;
    if (!sv.mode) sv.mode = "simulation";
    sv.exchange = !!x.cfg.scope.emails; sv.sharepoint = !!x.cfg.scope.files; sv.onedrive = !!x.cfg.scope.files;
    _markCustom(x, "cfg.autolabel.service.enabled");
  }) })));
};
Actions["al-remove"] = (el) => {
  const l = labelById(el.dataset.id); if (!l) return;
  confirmDialog("Auto-labeling policy verwijderen?", `De service-side policy voor ‘${esc(labelFullName(l))}’ wordt verwijderd. Client-side auto-labeling in het label blijft staan.`, () => Store.update((st) => { const x = labelById(l.id, st); if (x) { x.cfg.autolabel.service.enabled = false; _markCustom(x, "cfg.autolabel.service.enabled"); } }), "Verwijderen", true);
};
