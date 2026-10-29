/* View: Service-side auto-labeling – één auto-labeling policy per label (Exchange, SharePoint, OneDrive). */

const AUTO_MODES = [
  ["simulation", "Eerst simuleren", "Aanbevolen start: toont wat gelabeld zou worden, zonder iets te wijzigen.", "Run policy in simulation mode"],
  ["enable", "Direct aanzetten", "Labelt echt. Pas na beoordeling van de simulatie.", "Turn on policy"],
  ["disable", "Uit laten", "Aangemaakt, maar uit.", "Leave policy turned off"],
];
const AUTO_LIMITS = [
  "Maximaal 100 auto-labeling policies per tenant; één label per policy.",
  "SharePoint/OneDrive: max. 500.000 automatisch gelabelde bestanden per dag per tenant (Microsoft-limiet; controleer actuele waarde op Microsoft Learn).",
  "Bij specifieke selectie per policy: max. 1.000 SharePoint-sites of 100 OneDrive-gebruikers/-groepen. ‘All’ en adaptive scopes (PowerShell, tot 50.000 sites) vallen hierbuiten.",
  "Een simulatie stopt bij 20 miljoen gevonden bestanden per policy.",
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
    if (sv.mode === "enable" && !sits.length) out.push(["err", "Zonder voorwaarde kan de policy niet aan. Koppel eerst informatietypen en start in simulatie."]);
    else if (sv.mode === "enable") out.push(["info", "Direct aan: Microsoft adviseert eerst simulatie en beoordeling van de resultaten."]);
    if (sv.encryptExternalMail && !sv.exchange) out.push(["warn", "‘Apply encryption to email received from outside’ heeft alleen effect met de locatie Exchange."]);
    if (sv.encryptExternalMail && !String(sv.rmsOwner || "").trim()) out.push(["err", "Bij encryptie van binnenkomende externe mail is een Rights Management owner verplicht."]);
    return out;
  },
  /* Standaardlabel per SharePoint-bibliotheek (Learn: sensitivity-labels-sharepoint-default-label): waarom een label niet kan. */
  libIssues(l) {
    const e = l.cfg.encryption || {}, why = [];
    if (!l.cfg.scope.files) why.push("geen scope Files");
    if (e.mode === "userDefined" && (e.userDefined || {}).office !== false) why.push("gebruikers kiezen zelf de rechten in Office");
    if (e.mode === "assignNow" && e.expiry && e.expiry.type && e.expiry.type !== "never") why.push("toegang verloopt");
    if (e.dke) why.push("Double Key Encryption");
    return why;
  },
  libCard(st) {
    const ls = applicableLabels(st), fit = ls.filter((l) => !this.libIssues(l).length);
    const bad = ls.filter((l) => l.cfg.scope.files && this.libIssues(l).length);
    const facts = [
      ["folder", "Kijkt naar de locatie", "niet naar de inhoud van het bestand."],
      ["edit", "Nieuwe en bewerkte bestanden", "bestanden die er al staan pas als iemand ze bewerkt."],
      ["user", "Handmatig gekozen label blijft", "een automatisch label met lagere prioriteit wordt vervangen."],
    ];
    const pills = fit.length ? `<div class="chip-list">${fit.map((l) => labelPill(l, st)).join("")}</div>` : `<p class="xs muted m-0">Geen label in dit ontwerp is geschikt.</p>`;
    const no = bad.length ? `<p class="xs muted al-lib-no">Niet geschikt: ${bad.map((l) => `${esc(labelFullName(l, st))} <span class="al-lib-why">(${esc(this.libIssues(l).join(", "))})</span>`).join("; ")}.</p>` : "";
    const tech = accordion("al-lib-tech", `${icon("code", "s")} Technische details`, `<dl class="al-lib-dl small">
        <dt>Instellen</dt><dd>Door een site admin: bibliotheek › Settings › Library settings › <b>Default sensitivity labels</b>. Laat <i>Extend protection on download, copy, or move</i> uit; dat is een ander scenario (preview).</dd>
        <dt>Vereisten</dt><dd>Sensitivity labels voor Office-bestanden in SharePoint en OneDrive staan aan (<code>EnableAIPIntegration</code>; voor PDF ook <code>EnableSensitivityLabelforPDF</code>). Het label heeft de scope Files &amp; other data assets en is gepubliceerd aan wie het instelt. Geen SharePoint IRM op de bibliotheek.</dd>
        <dt>Moment</dt><dd>Office voor het web: direct. Upload: na enkele minuten. Desktop-apps: na het sluiten van de app. Lege bestanden pas zodra er inhoud in staat.</dd>
        <dt>Bestaand label</dt><dd>Vervangen als het automatisch of als default label uit een labelbeleid is toegepast én een lagere prioriteit heeft. Handmatig gekozen labels blijven altijd staan.</dd>
        <dt>Niet ondersteund</dt><dd>Labels met user-defined permissions (prompt in Word, PowerPoint en Excel), met <i>User access to content expires</i> anders dan Never, of met Double Key Encryption.</dd>
        <dt>Controleren</dt><dd>Kolom Gevoeligheid in de bibliotheek. In de audit log (Sensitivity label activities) herken je de bibliotheek als bron aan ActionSourceDetail 6.</dd>
        <dt>Uitzetten</dt><dd>Tenantbreed met <code>Set-SPOTenant -DisableDocumentLibraryDefaultLabeling $true</code>; al gezette labels blijven staan.</dd>
      </dl>${learn("labelsDefaultLibrary", "Configure a default sensitivity label for a SharePoint document library")}`);
    return `<section class="al-lib al-lib-c" aria-labelledby="al-lib-h">
      <div class="al-lib-head"><span class="al-lib-logo">${msLogo("sharepoint")}</span><div class="al-lib-ttl"><h3 id="al-lib-h">Standaardlabel per SharePoint-bibliotheek</h3><p class="small muted m-0">Geef een bibliotheek één vast label, bijvoorbeeld voor HR. Alles wat daar wordt opgeslagen of bewerkt, krijgt dat label, zonder inhoudsscan. Dit stelt de site admin in SharePoint in; je legt het hier niet vast.</p></div><span class="badge neutral">Optioneel</span></div>
      <div class="al-lib-cols">
        <ul class="al-lib-facts" aria-label="Zo werkt het">${facts.map(([ic, t, d]) => `<li>${icon(ic, "s")}<span><b>${esc(t)}</b> – ${esc(d)}</span></li>`).join("")}</ul>
        <div class="al-lib-fit"><div class="field-label">Geschikte labels ${infoTip("Labels met de scope Files, zonder user-defined permissions, zonder verlopende toegang en zonder Double Key Encryption. De site admin kiest het label in SharePoint; je legt het hier niet vast.")}</div>${pills}${no}</div>
      </div>
      ${tech}
    </section>`;
  },
  /** Keuze bovenaan: automatisch labelen op inhoud (policy) of op locatie (bibliotheek). Alleen UI-state, niet in het ontwerp. */
  way(cur, nPol) {
    const opt = (k, logo, t, d) => `<button type="button" class="al-way-b${k === cur ? " on" : ""}" aria-pressed="${k === cur}" data-action="al-way" data-way="${k}">${logo}<span class="al-way-t"><b>${esc(t)}</b><span>${esc(d)}</span></span></button>`;
    return `<div class="al-way" role="group" aria-label="Hoe labelt Purview automatisch?">
      ${opt("content", `<span class="al-way-ic">${icon("wand", "s")}</span>`, "Op inhoud", nPol ? `Auto-labeling policy · ${plural(nPol, "policy", "policies")}` : "Auto-labeling policy · Purview scant bestanden en mail")}
      ${opt("library", `<span class="al-way-ic">${msLogo("sharepoint")}</span>`, "Op locatie", "Standaardlabel per bibliotheek · optioneel")}
    </div>`;
  },
};

registerView("autolabel", {
  title: "Auto-labeling",
  fac: {
    duration: 20,
    goal: "Bepalen welke labels Purview automatisch toepast op bestaande bestanden en mail – eerst in simulatie.",
    questions: ["Welke gevoelige informatie staat nu ongelabeld in SharePoint of OneDrive?", "Welke informatietypen zijn betrouwbaar genoeg (weinig valse treffers)?", "Wie beoordeelt de simulatie, en wanneer gaat de policy aan?"],
    tips: ["Begin met één of twee gevoelige labels, niet met alles.", "Laat de simulatie minstens een week lopen; bespreek voorbeelden met de data-eigenaar.", "Client-side labelen (in Office) stel je per label in onder Label-instellingen."],
    pitfalls: ["Direct aanzetten zonder simulatie: massaal verkeerde labels.", "Labels met ‘Let users assign permissions’ worden niet toegepast.", "Handmatig gekozen labels worden standaard niet overschreven."],
    rules: facRules("Spelregels in Purview", () => AUTO_LIMITS, { key: "al-limits", intro: () => `<p class="xs muted mt-0">${statusBadge("verify")} Limieten wijzigen; controleer de actuele waarden op Microsoft Learn.</p>` }),
    links: ["labelsAuto", "newAutoLabelPolicy", "labelsDefaultLibrary"],
  },
  render() {
    const st = S();
    if (!st.labels.length) return pageHead("Labels", "Auto-labeling", "Laat Purview labels toepassen op bestaande bestanden en mail.") + VH.needLabels();
    const labels = applicableLabels(st).filter((l) => l.cfg.scope.files || l.cfg.scope.emails);
    const withPol = labels.filter((l) => l.cfg.autolabel.service.enabled);
    const pols = Generator.autoPolicies(st);
    const sim = pols.filter((p) => p.mode === "simulation").length;
    const client = labels.filter((l) => l.cfg.autolabel.client.mode !== "off").length;
    const counts = pols.length ? `<span>${plural(pols.length, "policy", "policies")} · ${sim} in simulatie · ${client} client-side</span>${pols.length >= 90 ? `<span class="badge warn">${100 - pols.length} van max. 100 over</span>` : ""}` : "";
    const stats = `<div class="lb-al-line">${licBadge("e5ip")}<span class="badge info">${icon("flask", "s")} Aanbevolen: start in simulatie</span>${counts}</div>`;
    const card = (l) => {
      const sv = l.cfg.autolabel.service, id = l.id, b = `lbl:${id}:cfg.autolabel.service`, sits = labelSits(l, st);
      const iss = AutoUI.issues(l, st);
      const nErr = iss.filter((x) => x[0] === "err").length, nWarn = iss.filter((x) => x[0] === "warn").length;
      const locs = [sv.exchange && "Exchange", sv.sharepoint && "SharePoint", sv.onedrive && "OneDrive"].filter(Boolean).join(", ") || "geen locatie";
      const summ = `${VH.modeBadge(sv.mode)}<span class="pc-meta">${esc(locs)} · ${plural(sits.length, "informatietype", "informatietypen")}</span>${nErr ? `<span class="badge err">${plural(nErr, "fout", "fouten")}</span>` : nWarn ? `<span class="badge warn">${plural(nWarn, "aandachtspunt", "aandachtspunten")}</span>` : ""}`;
      const canOn = Generator.autoSits(l, st).length > 0;
      const curMode = AUTO_MODES.find((m) => m[0] === sv.mode) || AUTO_MODES[0];
      const hid = String(id).replace(/[^\w-]/g, "");
      const sec = (key, ic, title, tip, inner) => `<section class="al-sec" aria-labelledby="al-${key}-${hid}"><h4 class="al-sec-t"><span class="al-sec-ic" aria-hidden="true">${icon(ic, "s")}</span><span id="al-${key}-${hid}">${title}</span>${tip ? infoTip(tip) : ""}</h4>${inner}</section>`;
      const body = `<div class="pc-body al-pol">
          <div class="row tight al-head">${summ}<span class="spacer"></span><button class="btn small subtle" data-action="al-remove" data-id="${esc(id)}">${icon("trash", "s")} Policy verwijderen</button></div>
          ${sec("what", "search", "Wat herkent Purview?", "Purview: Conditions – Content contains", `
            ${sits.length ? `<div class="al-cond"><div class="sit-chips f-1">${sits.map((s) => VH.sitChip(s)).join("")}</div><button class="btn small subtle" data-action="board-sits" data-id="${esc(id)}" data-back="autolabel">${icon("edit", "s")} Wijzigen</button></div>` : msg("err", `Geen informatietypen. <button class="btn small" data-action="board-sits" data-id="${esc(id)}" data-back="autolabel">${icon("search", "s")} Koppelen</button>`)}
            <div class="grid-2 al-grid">
              ${F.select(`${b}.confidence`, `Betrouwbaarheid ${infoTip("Purview: Confidence level")}`, CATALOG.confidence.map(([k, n, p]) => [k, `${n} (${p})`]))}
              ${F.number(`${b}.minCount`, `Minimaal aantal keer ${infoTip("Purview: Instance count – from")}`, { min: 1, max: 500 })}
            </div>`)}
          ${sec("where", "site", "Waar labelt Purview?", "Purview: Locations", `<div class="al-locs" role="group" aria-label="Locaties">${F.check(`${b}.exchange`, `${icon("mail", "s")} Exchange email`, { cls: "al-loc" })}${F.check(`${b}.sharepoint`, `${icon("site", "s")} SharePoint sites`, { cls: "al-loc" })}${F.check(`${b}.onedrive`, `${icon("cloud", "s")} OneDrive accounts`, { cls: "al-loc" })}</div>`)}
          ${sec("when", "flask", "Wanneer gaat de policy aan?", "Purview: Decide if you want to test out the policy now or later", `
            <ol class="al-steps xs" aria-label="Veilige volgorde"><li class="${sv.mode === "enable" ? "done" : "on"}"${sv.mode === "enable" ? "" : ` aria-current="step"`}>${icon("flask", "s")} Simuleren</li><li class="${sv.mode === "enable" ? "done" : ""}">${icon("eye", "s")} Beoordelen met data-eigenaar</li><li class="${sv.mode === "enable" ? "on" : ""}"${sv.mode === "enable" ? ` aria-current="step"` : ""}>${icon("check", "s")} Aanzetten</li></ol>
            ${F.radios(`${b}.mode`, "", AUTO_MODES.map(([k, t]) => [k, t]), { cls: "al-seg", disabled: canOn ? [] : ["enable"] }).replace('<div class="radio-list">', `<div class="radio-list" role="radiogroup" aria-labelledby="al-when-${hid}">`)}
            <p class="al-mode-d small">${esc(curMode[2])}${canOn ? "" : ` <span class="muted">Direct aanzetten kan pas als er een voorwaarde is.</span>`}<span class="tech-only">${VH.en(curMode[3])}</span></p>`)}
          ${accordion("al-more", `${icon("settings", "s")} Extra instellingen`, `
            ${sv.mode === "simulation" ? `<div class="check-row">${F.check(`${b}.autoEnable`, "Automatisch aanzetten als de policy 7 dagen ongewijzigd in simulatie staat")}${infoTip("Purview: Automatically turn on policy if not modified after 7 days in simulation. De policy gaat zelf aan als je hem na 7 dagen simulatie niet wijzigt. Zet dit niet aan voor versleutelende labels zonder evaluatie.")}</div>` : ""}
            <div class="check-row">${F.check(`${b}.overrideManual`, "Bestaande labels met gelijke of lagere prioriteit vervangen")}${infoTip("Purview: Automatically replace existing labels that have the same or lower priority. Standaard overschrijft auto-labeling geen labels die een gebruiker handmatig koos.")}</div>
            ${sv.exchange ? `<div class="check-row">${F.check(`${b}.encryptExternalMail`, "Mail van buiten de organisatie versleutelen")}${infoTip("Purview: Apply encryption to email received from outside your organization. Versleutelt binnenkomende mail van externen met de rechten van het label.")}</div>` : ""}
            ${sv.exchange && sv.encryptExternalMail ? F.text(`${b}.rmsOwner`, "Rights Management-eigenaar", { ph: "rms-owner@contoso.nl", hint: "Verplicht: een mailbox in de tenant die eigenaar wordt van de versleutelde berichten." }) : ""}`)}
          ${iss.length ? iss.map(([k, t]) => msg(k, t)).join("") : msg("ok", "Klaar voor simulatie.")}
        </div>`;
      return `<div class="policy-card mb-2">${body}</div>`;
    };
    const free = labels.filter((l) => !l.cfg.autolabel.service.enabled);
    const addBtn = free.length ? `<button class="btn${withPol.length ? " small" : " primary"}" data-action="al-add">${icon("plus", "s")} Policy toevoegen</button>` : "";
    const cur = withPol.find((l) => l.id === UI.sub.autolabel) || withPol[0];
    const MODE = { simulation: "Simulatie", enable: "Aan", disable: "Uit" };
    const pName = (l) => { const p = pols.find((x) => x.label.id === l.id); return p ? p.name : labelFullName(l, st); };
    const pDflt = (l) => Generator.fitName(`${st.meta.prefix ? st.meta.prefix + " " : ""}Auto – ${labelFullName(l, st)}`, 64);
    const items = withPol.map((l) => {
      const sv = l.cfg.autolabel.service, nErr = AutoUI.issues(l, st).filter((x) => x[0] === "err").length;
      const locs = [sv.exchange && "Exchange", sv.sharepoint && "SharePoint", sv.onedrive && "OneDrive"].filter(Boolean);
      return { id: l.id, name: pName(l), full: `${pName(l)} ${labelFullName(l, st)}`, color: l.color, meta: [sv.name ? `Label ${labelFullName(l, st)}` : "", MODE[sv.mode] || "Simulatie", locs.length === 3 ? "alle locaties" : locs.join(", ") || "geen locatie"].filter(Boolean).join(" · "), flag: nErr ? `<span class="badge err">${plural(nErr, "fout", "fouten")}</span>` : "",
        rename: { bind: `lbl:${l.id}:cfg.autolabel.service.name`, value: pName(l), dflt: pDflt(l), max: 64, what: "auto-labeling policy" } };
    });
    const list = !labels.length ? emptyState("wand", "Geen geschikte labels", "Auto-labeling vereist labels met de scope Files of Emails.")
      : withPol.length ? VH.masterList({ route: "autolabel", title: "Policies", items, cur: cur.id, add: free.length ? { action: "al-add", label: "Nieuwe policy" } : null }, `${VH.mdHead(pName(cur), { color: cur.color, meta: `Auto-labeling policy voor label ${labelFullName(cur, st)}`, rename: { route: "autolabel", id: cur.id, what: "auto-labeling policy" } })}${card(cur)}`)
      : emptyState("wand", "Nog geen auto-labeling policies", "Kies een label dat Purview automatisch mag toepassen op bestaande bestanden en mail. De policy start in simulatie.", addBtn);
    const way = UI.alWay === "library" ? "library" : "content";
    return `${pageHead("Labels", "Auto-labeling", "Laat Purview labels toepassen op bestaande bestanden en mail.", `<button class="btn" data-action="go" data-route="labels" title="Voorstel of automatisch label in Word, Excel, PowerPoint en Outlook">${icon("wand", "s")} Client-side per label</button>`, `<p class="mb-1"><b>Service-side:</b> Purview labelt bestanden in SharePoint en OneDrive (ook ongeopend) en mail in transit in Exchange. Eén policy per label; beoordeel de simulatie met de data-eigenaar.</p><p class="mb-1"><b>Client-side:</b> een voorstel of automatisch label in Office; dat stel je per label in onder Label-instellingen.</p><p class="mb-1"><b>Op locatie:</b> een vast standaardlabel per SharePoint-bibliotheek, zonder inhoudsscan.</p>${learn("labelsAuto", "Apply a sensitivity label automatically")}`)}
      ${labels.length ? AutoUI.way(way, pols.length) : ""}
      ${way === "library" && labels.length ? AutoUI.libCard(st) : `${stats}
      ${list}`}`;
  },
});

Actions["al-way"] = (el) => {
  UI.alWay = el.dataset.way === "library" ? "library" : "content";
  App.render();
  const b = document.querySelector(`#main .al-way-b[data-way="${UI.alWay}"]`);
  if (b) b.focus();
};

Actions["al-add"] = (el) => {
  const st = S();
  const free = applicableLabels(st).filter((l) => (l.cfg.scope.files || l.cfg.scope.emails) && !l.cfg.autolabel.service.enabled);
  Menu.open(el, free.map((l) => ({ icon: "tag", label: labelFullName(l, st), desc: plural(labelSits(l, st).length, "informatietype", "informatietypen") + " gekoppeld", fn: () => { UI.sub.autolabel = l.id; Store.update((s2) => {
    const x = labelById(l.id, s2); if (!x) return;
    const sv = x.cfg.autolabel.service;
    sv.enabled = true;
    if (!sv.mode) sv.mode = "simulation";
    sv.exchange = !!x.cfg.scope.emails; sv.sharepoint = !!x.cfg.scope.files; sv.onedrive = !!x.cfg.scope.files;
    _markCustom(x, "cfg.autolabel.service.enabled");
  });
  // Nieuwe policy: direct de naam laten aanpassen in de lijst (na de render).
  requestAnimationFrame(() => setTimeout(() => { if (UI.route === "autolabel") VH.mdRename("autolabel", l.id, "list"); }, 30)); } })));
};
Actions["al-remove"] = (el) => {
  const l = labelById(el.dataset.id); if (!l) return;
  confirmDialog("Auto-labeling policy verwijderen?", `De service-side policy voor ‘${esc(labelFullName(l))}’ wordt verwijderd. Client-side auto-labeling in het label blijft staan.`, () => Store.update((st) => { const x = labelById(l.id, st); if (x) { x.cfg.autolabel.service.enabled = false; _markCustom(x, "cfg.autolabel.service.enabled"); } }), "Verwijderen", true);
};
