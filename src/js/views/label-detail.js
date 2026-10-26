/* View: Label-instellingen – per label alle portalinstellingen (scope, encryptie, markering, client-side auto-labeling, Groups & sites, Meetings). */

const LabelDetail = {
  tabs: [
    ["scope", "Algemeen & scope", "layers"],
    ["encryption", "Toegang & encryptie", "lock"],
    ["marking", "Markering", "watermark"],
    ["autolabel", "Auto-labeling (Office)", "wand"],
    ["container", "Groups & sites", "site"],
    ["meetings", "Meetings", "meeting"],
    ["preview", "Zo ziet de gebruiker het", "eye"],
  ],
  KNOWN_VARS: ["${Item.Label}", "${Item.Name}", "${Item.Location}", "${User.Name}", "${User.PrincipalName}", "${Event.DateTime}", "${If.End}"],

  ctx(l, st = S()) {
    return {
      label: l ? (l.displayName || l.name) : "Label",
      item: "Kwartaalrapportage Q3.docx",
      location: "https://" + ((st.meta.customer || "contoso").toLowerCase().replace(/[^a-z0-9]/g, "") || "contoso") + ".sharepoint.com/sites/Finance/Kwartaalrapportage Q3.docx",
      user: "Sanne de Vries",
      upn: "sanne.devries@" + ((st.meta.customer || "contoso").toLowerCase().replace(/[^a-z0-9]/g, "") || "contoso") + ".nl",
      dt: new Date().toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" }),
    };
  },
  /** Vult variabelen en ${If.App.X}…${If.End} in voor app W/X/P/O. */
  resolve(text, app, c) {
    let t = String(text || "");
    t = t.replace(/\$\{If\.App\.([WXPO]+)\}([\s\S]*?)\$\{If\.End\}/g, (m, apps, inner) => (apps.includes(app) ? inner : ""));
    CATALOG.markingVariables.forEach((v) => { t = t.split(v.v).join(v.sample(c)); });
    return t;
  },
  markIssues(l) {
    const m = l.cfg.marking, out = [], L = CATALOG.markingLimits;
    const chk = (k, name, max) => {
      const x = m[k];
      if (!x.enabled) return;
      if (!String(x.text || "").trim()) out.push(["err", `${name} staat aan maar heeft geen tekst.`]);
      if ((x.text || "").length > max) out.push(["err", `${name}: ${x.text.length} tekens (max. ${max}).`]);
      const unknown = (String(x.text || "").match(/\$\{[^}]*\}/g) || []).filter((v) => !this.KNOWN_VARS.includes(v) && !/^\$\{If\.App\.[WXPO]+\}$/.test(v));
      if (unknown.length) out.push(["warn", `${name}: onbekende variabele ${unknown.map(esc).join(", ")} – wordt letterlijk getoond.`]);
      const opens = (String(x.text || "").match(/\$\{If\.App\./g) || []).length, ends = (String(x.text || "").match(/\$\{If\.End\}/g) || []).length;
      if (opens !== ends) out.push(["err", `${name}: elke \${If.App.…} moet worden afgesloten met \${If.End}.`]);
    };
    chk("header", "Header", L.headerFooter);
    chk("footer", "Footer", L.headerFooter);
    chk("watermark", "Watermerk", L.watermark);
    const xl = (m.header.enabled ? (m.header.text || "").length : 0) + (m.footer.enabled ? (m.footer.text || "").length : 0);
    if (xl > L.excelHeaderFooter) out.push(["warn", `Excel: kop- en voettekst samen ${xl} tekens; Excel ondersteunt max. ${L.excelHeaderFooter}. Gebruik eventueel \${If.App.WPO}…\${If.End}.`]);
    if (m.watermark.enabled && !l.cfg.scope.files) out.push(["warn", "Watermerken gelden alleen voor documenten; de scope ‘Files & other data assets’ staat uit."]);
    return out;
  },
  _hex(c, d) { return /^#[0-9a-f]{6}$/i.test(String(c || "")) ? c : d; },
  _font(f) { return /^[A-Za-z0-9 ]{1,40}$/.test(String(f || "")) ? f : "Calibri"; },
  _markStyle(x) { return `color:${this._hex(x.color, "#000000")};font-size:${clamp(Math.round((Number(x.size) || 10) * 0.85), 7, 16)}px;font-family:${this._font(x.font)},sans-serif;text-align:${({ Left: "left", Center: "center", Right: "right" })[x.align] || "left"}`; },
  preview(l, st = S()) {
    const m = l.cfg.marking, c = this.ctx(l, st), e = l.cfg.encryption;
    const mk = (x, cls, app) => (x.enabled && x.text ? `<div class="doc-mark ${cls}" style="${this._markStyle(x)}">${esc(this.resolve(x.text, app, c))}</div>` : "");
    const wm = m.watermark.enabled && m.watermark.text ? `<div class="doc-wm ${m.watermark.layout === "Horizontal" ? "" : "diagonal"}"><span style="color:${this._hex(m.watermark.color, "#7F7F7F")};font-size:${clamp(Math.round((Number(m.watermark.size) || 36) * 0.6), 10, 40)}px;font-family:${this._font(m.watermark.font)},sans-serif">${esc(this.resolve(m.watermark.text, "W", c))}</span></div>` : "";
    const lockTxt = e.mode === "assignNow" ? `${icon("lock", "s")} Beperkte toegang: ${esc(e.permissions.map((p) => Mapping.principalName(p, st) + " (" + Mapping.levelName(p.level) + ")").join(", ") || "geen rechten")}` : e.mode === "userDefined" ? `${icon("lock", "s")} ${e.userDefined.outlook === "DoNotForward" ? "Do Not Forward" : e.userDefined.outlook === "EncryptOnly" ? "Encrypt-Only" : "Door gebruiker bepaalde rechten"}` : "";
    const doc = l.cfg.scope.files ? `<div class="doc-preview"><div class="doc-chrome">${icon("doc", "s")} Word – ${esc(c.item)}</div>
      <div class="doc-sens"><span class="color-dot" style="background:${esc(l.color)}"></span>Sensitivity: <b>${esc(labelFullName(l, st))}</b>${e.mode === "assignNow" ? ` <span style="margin-left:auto">${icon("lock", "s")}</span>` : ""}</div>
      <div class="doc-page">${mk(m.header, "header", "W")}${wm}<div class="doc-line h"></div><div class="doc-line"></div><div class="doc-line m"></div><div class="doc-line"></div><div class="doc-line s"></div><div class="doc-line"></div><div class="doc-line m"></div><div class="doc-line s"></div>${mk(m.footer, "footer", "W")}</div></div>` : "";
    const mhd = (x) => (x.enabled && x.text ? `<div style="${this._markStyle(x)};padding:2px 0">${esc(this.resolve(x.text, "O", c))}</div>` : "");
    const mail = l.cfg.scope.emails ? `<div class="mail-preview"><div class="doc-chrome mail">${icon("mail", "s")} Outlook – Nieuw bericht</div>
      <div class="mail-head"><div class="mh-row">Aan: partner@extern.nl</div><div class="mh-row">Onderwerp: Kwartaalrapportage Q3</div></div>
      <div class="mail-banner"><span class="color-dot" style="background:${esc(l.color)}"></span>${esc(labelFullName(l, st))}${l.tooltip ? ` <span class="muted xs">– ${esc(l.tooltip.slice(0, 70))}</span>` : ""}</div>
      ${lockTxt ? `<div class="mail-banner">${lockTxt}</div>` : ""}
      <div class="mail-body">${mhd(m.header)}<div class="doc-line"></div><div class="doc-line m"></div><div class="doc-line s"></div>${mhd(m.footer)}</div></div>` : "";
    return doc || mail ? doc + mail : `<div class="muted small">Geen preview: dit label geldt niet voor documenten of e-mail.</div>`;
  },
  issuesHtml(l) {
    const iss = this.markIssues(l);
    return iss.length ? iss.map(([k, t]) => msg(k, t)).join("") : msg("ok", "Markering is geldig binnen de portallimieten.");
  },
  rightsOf(p) {
    if (p.level === "Custom") return p.rights || [];
    const L = CATALOG.permissionLevels.find((x) => x.key === p.level);
    return L ? L.rights : [];
  },

  /* ---------- Tab: algemeen & scope ---------- */
  tab_scope(l, st) {
    const id = l.id, parent = hasChildren(l, st);
    const pols = Generator.labelPolicies(st).filter((p) => (p.labels || []).some((x) => (x && x.id ? x.id : x) === id));
    const scopes = CATALOG.labelScopes.map((s) => {
      const on = !!l.cfg.scope[s.key];
      return `<label class="check radio-card${on ? " on" : ""}" data-action="lbl-scope" data-id="${esc(id)}" data-key="${esc(s.key)}" data-tip="${esc(s.desc)}"><input type="checkbox"${on ? " checked" : ""}${parent ? " disabled" : ""}><span><b>${esc(s.name)}</b>${s.badge ? " " + licBadge(s.badge) : ""}<span class="c-desc">${esc(s.short || s.desc)}${s.requires.length ? ` · vereist ook ${s.requires.map((r) => esc((CATALOG.labelScopes.find((x) => x.key === r) || {}).name || r)).join(" + ")}` : ""}</span></span></label>`;
    }).join("");
    return `<div class="grid-2">
      <div class="card"><div class="card-head"><h3>${icon("tag")} Naam & beschrijving</h3>${learn("labelsCreate", "Create sensitivity labels")}</div>
        ${F.text(`lbl:${id}:displayName`, "Display name", { badge: infoTip("Wat de gebruiker ziet in de Sensitivity-knop.") })}
        ${F.textarea(`lbl:${id}:tooltip`, "Description for users", { rows: 2, maxlength: 1000, ph: "Wanneer gebruik je dit label?", badge: infoTip("Tooltip in Office: wanneer gebruik je dit label?") })}
        ${F.color(`lbl:${id}:color`, "Label color")}
        ${F.text(`lbl:${id}:owner`, "Eigenaar (rol)", { ph: "Bijv. HR-manager", badge: infoTip("Wie beslist over dit label en beoordeelt uitzonderingen?") })}
        ${accordion("lbl-tech", `${icon("code", "s")} Technische details`, `${F.text(`lbl:${id}:name`, "Name", { hint: "Technische naam; identiteit in PowerShell en het portal.", render: 1 })}
        ${F.textarea(`lbl:${id}:adminDesc`, "Description for admins", { rows: 2, hint: "Alleen zichtbaar voor beheerders." })}`)}
      </div>
      <div class="card"><div class="card-head"><h3>${icon("layers")} Define the scope for this label</h3>${learn("labels", "Scopes")}</div>
        ${parent ? msg("info", "Dit is een hoofdlabel: scope, Groups & sites en Teams-instellingen gelden voor de sublabels. Stel ze per sublabel in.") : ""}
        <div class="radio-list">${scopes}</div>
        <div class="divider"></div>
        <h4 class="mt-0">Publicatie ${infoTip(CATALOG.labelSchemeNote)}</h4>
        ${pols.length ? `<div class="chip-list">${pols.map((p) => `<button class="chip" style="cursor:pointer" data-action="go" data-route="policies" title="${esc(p.name)}">${icon("users", "s")}${esc(p.name)}</button>`).join("")}</div>` : msg("warn", "Dit label zit nog in geen enkel labelbeleid en is dus niet zichtbaar voor gebruikers (service-side auto-labeling kan wel).")}
      </div>
    </div>`;
  },

  /* ---------- Tab: encryptie ---------- */
  tab_encryption(l, st) {
    const id = l.id, e = l.cfg.encryption, sc = l.cfg.scope;
    if (!sc.files && !sc.emails && !sc.meetings) return emptyState("lock", "Encryptie niet beschikbaar", "Toegangsbeheer (encryptie) geldt voor Files, Emails en Meetings. Zet eerst één van die scopes aan.");
    const modes = F.radios(`lbl:${id}:cfg.encryption.mode`, "Control access", CATALOG.encryptionModes.map((m) => [m.key, m.name, m.desc]), { cards: true });
    let body = "";
    if (e.mode === "assignNow") body = this._permBoard(l, st);
    else if (e.mode === "userDefined") body = `<div class="card flat mt-2"><h4 class="mt-0">Let users assign permissions when they apply the label</h4>
      ${F.select(`lbl:${id}:cfg.encryption.userDefined.outlook`, "In Outlook, enforce restrictions equivalent to…", CATALOG.userDefinedOutlook)}
      ${F.check(`lbl:${id}:cfg.encryption.userDefined.office`, "In Word, PowerPoint, and Excel, prompt users to specify permissions", { desc: "De gebruiker kiest personen en rechten bij het toepassen van het label." })}
      ${!e.userDefined.office && e.userDefined.outlook === "none" ? msg("err", "Kies minstens Outlook (Do Not Forward / Encrypt-Only) of Office-apps; anders versleutelt het label niets.") : ""}
      ${l.cfg.autolabel.client.mode !== "off" || l.cfg.autolabel.service.enabled ? msg("warn", "Door gebruiker bepaalde rechten worden niet toegepast bij automatisch labelen (service-side) en vragen bij client-side om handmatige invoer.") : ""}
      ${e.userDefined.outlook === "EncryptOnly" ? msg("info", "Encrypt-Only: ontvangers krijgen alle rechten behalve Save As, Export en Full Control; Copilot en kopiëren blijven mogelijk.") : ""}</div>`;
    const dke = e.mode === "assignNow" ? `<div class="card flat mt-2">${F.toggle(`lbl:${id}:cfg.encryption.dke`, "Use Double Key Encryption", { badge: licBadge("dke"), desc: "Twee sleutels: één bij Microsoft, één bij de klant. Alleen voor zeer gevoelige data." })}
      ${e.dke ? msg("warn", "DKE: geen Office web, Mac, Teams-meetings, auto-labeling, DLP-inspectie, Copilot of eDiscovery-zoeken op de inhoud. Vereist een eigen DKE-service. " + learn("dke", "Meer over DKE")) : ""}
      ${e.dke && (l.cfg.autolabel.client.mode !== "off" || l.cfg.autolabel.service.enabled) ? msg("err", "DKE-labels kunnen niet automatisch worden toegepast; zet auto-labeling uit.") : ""}</div>` : "";
    return `<div class="split wide-left"><div>
        <div class="card"><div class="card-head"><h3>${icon("lock")} Access control</h3>${learn("labelsEncryption", "Encryptie met sensitivity labels")}</div>${modes}</div>
        ${body}${dke}
      </div><div>
        ${accordion("lbl-enc-notes", `${icon("info", "s")} Goed om te weten <span class="badge neutral">${CATALOG.encryptionNotes.length}</span>`, `<ul class="small">${CATALOG.encryptionNotes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>${learn("usageRights", "Usage rights")}`)}
      </div></div>`;
  },
  _permBoard(l, st) {
    const id = l.id, e = l.cfg.encryption;
    const exp = `<div class="grid-2">
      <div>${F.select(`lbl:${id}:cfg.encryption.expiry.type`, "User access to content expires", CATALOG.expiryOptions)}
        ${e.expiry.type === "date" ? `<div class="field"><label class="field-label">Datum</label><input class="input" type="date" data-bind="lbl:${id}:cfg.encryption.expiry.date" value="${esc(e.expiry.date || "")}"></div>` : ""}
        ${e.expiry.type === "days" ? F.number(`lbl:${id}:cfg.encryption.expiry.days`, "Aantal dagen", { min: 1, max: 9999 }) : ""}</div>
      <div>${F.select(`lbl:${id}:cfg.encryption.offline.type`, "Allow offline access", CATALOG.offlineOptions)}
        ${e.offline.type === "days" ? F.number(`lbl:${id}:cfg.encryption.offline.days`, "Users have offline access for (days)", { min: 0, max: 9999 }) : ""}</div></div>`;
    const palette = [
      ...CATALOG.permissionPrincipals.map((p) => `<div class="principal" data-drag="principal" data-tap="1" data-pick-label="${esc(p.short)}" data-payload="${attr({ type: p.type })}" title="${esc(p.desc)}">${icon(p.icon, "s")}<span>${esc(p.name)}</span></div>`),
      ...st.groups.filter((g) => g.kind === "group" || g.kind === "domain").map((g) => `<div class="principal" data-drag="principal" data-tap="1" data-pick-label="${esc(g.name)}" data-payload="${attr({ type: g.kind, groupId: g.id })}">${icon(g.kind === "domain" ? "link" : "users", "s")}<span>${esc(g.name)}${g.value ? ` <span class="muted xs">${esc(g.value)}</span>` : ""}</span></div>`),
    ].join("");
    const cols = CATALOG.permissionLevels.map((L) => {
      const items = e.permissions.map((p, i) => [p, i]).filter(([p]) => p.level === L.key).map(([p, i]) => {
        const rights = L.key === "Custom" ? `<div class="chip-list mt-1">${CATALOG.usageRights.map((r) => `<button class="pill-toggle ${(p.rights || []).includes(r.key) ? "on" : "off"}" style="font-size:10px;padding:1px 6px" data-action="perm-right" data-id="${esc(id)}" data-idx="${i}" data-right="${esc(r.key)}" aria-pressed="${(p.rights || []).includes(r.key)}" title="${esc(r.desc)}">${esc(r.name)}</button>`).join("")}</div>` : "";
        return `<div><div class="principal" data-drag="perm" data-tap="1" data-pick-label="${esc(Mapping.principalName(p, st))}" data-payload="${attr({ idx: i, labelId: id })}">${icon("grip", "s")}<span>${esc(Mapping.principalName(p, st))}</span><button class="icon-btn x" data-action="perm-del" data-id="${esc(id)}" data-idx="${i}" title="Verwijderen" aria-label="${esc(Mapping.principalName(p, st))} verwijderen">${icon("x", "s")}</button></div>${rights}</div>`;
      }).join("");
      return `<div class="perm-col" data-drop="principal perm" data-zone="perm-level" data-target="${attr({ labelId: id, level: L.key })}" style="border-top:3px solid ${L.color}">
        <h5>${esc(L.name)}${L.old !== L.name ? ` <span class="muted xs">(${esc(L.old)})</span>` : ""}</h5>
        <div class="rights">${L.key === "Custom" ? "Kies rechten per principal" : L.rights.map((r) => esc((CATALOG.usageRights.find((u) => u.key === r) || {}).name || r)).join(" · ")}</div>
        ${items || `<div class="drop-hint">Sleep hier een principal</div>`}</div>`;
    }).join("");
    const w = [];
    if (!e.permissions.length) w.push(msg("err", "Nog geen rechten toegekend: niemand (behalve de eigenaar) kan de inhoud openen. Sleep een principal naar een rechtenniveau."));
    const ext = e.permissions.filter((p) => p.type === "domain" || (p.groupId && ((st.groups.find((g) => g.id === p.groupId) || {}).kind === "domain")));
    if (ext.length) w.push(msg("warn", "<b>Externe ontvangers zonder Microsoft-account kunnen versleutelde berichten en documenten niet openen.</b> Ze hebben een Microsoft Entra ID- of Microsoft-account nodig (bijv. een huisarts via ZorgMail heeft dat vaak niet). Test dit vooraf met een echte ketenpartner. Bij een partner met Entra ID krijgen álle geverifieerde domeinen van die tenant toegang."));
    if (e.permissions.some((p) => p.type === "authenticated")) w.push(msg("info", "<b>Any authenticated users</b>: iedereen met een Entra ID- of Microsoft-account kan openen. Je beschermt tegen anonieme toegang en beperkt rechten, maar niet wíe leest."));
    const noCopy = e.permissions.filter((p) => !this.rightsOf(p).includes("EXTRACT"));
    if (noCopy.length) w.push(msg("warn", `Zonder <b>Copy (EXTRACT)</b> kan Microsoft 365 Copilot de inhoud niet samenvatten voor: ${noCopy.map((p) => esc(Mapping.principalName(p, st))).join(", ")}.`));
    if (e.permissions.some((p) => (p.type === "group" || p.type === "domain") && !p.groupId && !p.value)) w.push(msg("err", "Er is een groep/domein zonder waarde; vul die in onder Labelbeleid → Doelgroepen."));
    if (e.expiry.type !== "never") w.push(msg("info", "Met een vervaldatum werkt co-authoring/AutoSave niet voor dit label en verliezen ook interne gebruikers na de termijn de toegang."));
    if (e.expiry.type === "date" && !e.expiry.date) w.push(msg("err", "Kies een vervaldatum."));
    if (!e.permissions.some((p) => this.rightsOf(p).includes("OWNER") || this.rightsOf(p).includes("EXPORT"))) w.push(msg("info", "Niemand behalve de eigenaar en super users kan de encryptie verwijderen; plan een super user-feature voor herstel/eDiscovery."));
    return `<div class="card mt-2"><div class="card-head"><h3>${icon("key")} Assign permissions now</h3>${learn("usageRights", "Rechtenniveaus")}</div>
      ${exp}
      <div class="divider"></div>
      <div class="field-label">Principals <span class="muted xs">– sleep (of klik en plaats) naar een rechtenniveau</span></div>
      <div class="chip-list mb-2" style="gap:6px">${palette}</div>
      <div class="perm-board">${cols}</div>
      <div class="mt-2">${w.join("")}</div></div>`;
  },

  _colorField(spec, cur, def) {
    const ok = /^#[0-9a-f]{6}$/i.test(String(cur || ""));
    const named = CATALOG.markingColors.map(([h, n]) => [h, n]);
    const opts = ok && !named.some(([h]) => h.toUpperCase() === String(cur).toUpperCase()) ? [...named, [cur, `Eigen kleur ${String(cur).toUpperCase()}`]] : named;
    return `<div class="field"><div class="field-label">Font color</div><div class="color-row">${F.select(spec, "", opts, { cls: "mb-0 f-1" })}<input type="color" data-bind="${esc(spec)}" data-render="1" value="${esc(ok ? cur : def)}" title="Eigen kleur (HEX)" aria-label="Eigen kleur"></div>${ok ? "" : `<div class="field-hint" style="color:var(--err)">Geen geldige HEX-kleur (#RRGGBB); ${esc(def)} wordt gebruikt.</div>`}</div>`;
  },

  /* ---------- Tab: markering ---------- */
  tab_marking(l, st) {
    const id = l.id, m = l.cfg.marking;
    if (!l.cfg.scope.files && !l.cfg.scope.emails) return emptyState("watermark", "Markering niet beschikbaar", "Content marking geldt voor Files en Emails. Zet eerst één van die scopes aan.");
    const L = CATALOG.markingLimits;
    const block = (k, title, ic, max) => {
      const x = m[k], base = `lbl:${id}:cfg.marking.${k}`;
      return `<div class="card mb-2"><div class="card-head"><h3>${icon(ic)} ${title}</h3>${F.toggle(base + ".enabled", "Inschakelen")}</div>
        ${x.enabled ? `<div class="field"><label class="field-label">Text <span class="muted xs">(max. ${max})</span></label>
          <textarea class="textarea mono" rows="2" data-bind="${base}.text" data-live="mark-preview" data-id="${esc(id)}" data-max="${max}" id="mark-${k}-${esc(id)}" aria-label="${esc(title)} – tekst">${esc(x.text || "")}</textarea>
          <div class="chip-list mt-1">${CATALOG.markingVariables.map((v) => `<button class="chip sm" style="cursor:pointer" data-action="mark-var" data-spec="${esc(base)}.text" data-target="mark-${k}-${esc(id)}" data-v="${esc(v.v)}" title="${esc(v.desc)}">${esc(v.v)}</button>`).join("")}<button class="chip sm" style="cursor:pointer" data-action="mark-var" data-spec="${esc(base)}.text" data-target="mark-${k}-${esc(id)}" data-v="\${If.App.WXP}…\${If.End}" title="Tekst alleen in bepaalde apps (W=Word, X=Excel, P=PowerPoint, O=Outlook)">\${If.App.…}</button></div></div>
          <div class="grid-4">
            ${F.number(base + ".size", "Font size", { min: 1, max: 100 })}
            ${this._colorField(base + ".color", x.color, k === "watermark" ? "#7F7F7F" : "#000000")}
            ${k === "watermark" ? F.select(base + ".layout", "Text layout", [["Diagonal", "Diagonal"], ["Horizontal", "Horizontal"]]) : F.select(base + ".align", "Align text", [["Left", "Left"], ["Center", "Center"], ["Right", "Right"]])}
            ${F.select(base + ".font", "Font name", CATALOG.markingFonts.some((f) => (Array.isArray(f) ? f[0] : f) === x.font) || !x.font ? CATALOG.markingFonts : [...CATALOG.markingFonts, [x.font, `${x.font} (ongeldig)`]], { hint: "Alleen via PowerShell" })}
          </div>` : `<div class="muted small">Uit.</div>`}</div>`;
    };
    return `<div class="split wide-left"><div>
        ${block("watermark", "Add a watermark", "watermark", L.watermark)}
        ${block("header", "Add a header", "header", L.headerFooter)}
        ${block("footer", "Add a footer", "footer", L.headerFooter)}
        ${accordion("lbl-mark-notes", `${icon("info", "s")} Regels & beperkingen <span class="badge neutral">${CATALOG.markingNotes.length}</span>`, `<ul class="small">${CATALOG.markingNotes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>${learn("labels", "Content marking")}`)}
      </div><div><div class="sticky" style="top:8px">
        <div class="card"><div class="card-head"><h3>${icon("eye")} Live preview</h3></div>
          <div class="preview-stage" id="mark-preview">${this.preview(l, st)}</div>
          <div id="mark-issues" class="mt-2">${this.issuesHtml(l)}</div></div>
      </div></div></div>`;
  },

  /* ---------- Tab: client-side auto-labeling ---------- */
  tab_autolabel(l, st) {
    const id = l.id, c = l.cfg.autolabel.client, sits = labelSits(l, st);
    if (!l.cfg.scope.files && !l.cfg.scope.emails) return emptyState("wand", "Niet beschikbaar", "Auto-labeling for files and emails vereist de scope Files of Emails.");
    const edmOnly = sits.length && sits.every((s) => s.kind === "edm");
    return `<div class="split wide-left"><div>
      <div class="card"><div class="card-head"><h3>${icon("wand")} Auto-labeling for files and emails</h3>${learn("labelsAuto", "Auto-labeling")}</div>
        ${F.radios(`lbl:${id}:cfg.autolabel.client.mode`, "When content matches these conditions", [
          ["off", "Uit", "De gebruiker labelt zelf."],
          ["recommend", "Recommend that the user apply the label", "Office stelt het label voor."],
          ["auto", "Automatically apply the label", "Office past het label toe; de gebruiker kan het met reden wijzigen."],
        ], { cards: true, badge: licBadge("e5ip") })}
        ${c.mode !== "off" ? `<div class="grid-3">
          ${F.select(`lbl:${id}:cfg.autolabel.client.confidence`, "Confidence level", CATALOG.confidence.map(([k, n, p]) => [k, `${n} (${p})`]))}
          ${F.number(`lbl:${id}:cfg.autolabel.client.minCount`, "Instance count – from", { min: 1, max: 500 })}
          ${F.text(`lbl:${id}:cfg.autolabel.client.maxCount`, "to", { ph: "any", hint: "Getal of ‘any’." })}</div>
          ${F.text(`lbl:${id}:cfg.autolabel.client.message`, "Display this message to users when the label is applied", { ph: `Dit document bevat gevoelige gegevens en is gelabeld als ${l.displayName || l.name}.` })}` : ""}
        <div class="divider"></div>
        <div class="field-label">Conditions – Content contains <span class="muted xs">(uit Herkenning)</span></div>
        ${sits.length ? `<div class="sit-chips">${sits.map((s) => VH.sitChip(s)).join("")}</div>` : msg(c.mode !== "off" ? "err" : "info", `Er zijn nog geen informatietypen aan dit label gekoppeld. <button class="btn small" data-action="go" data-route="sits">${icon("search", "s")} Naar Gevoelige informatie</button>`)}
        ${edmOnly && c.mode !== "off" ? msg("warn", "Alleen EDM-classifiers: controleer of client-side auto-labeling met EDM in alle gebruikte Office-versies wordt ondersteund; service-side is het meest betrouwbaar.") : ""}
        ${c.mode === "auto" && l.cfg.encryption.mode === "userDefined" ? msg("warn", "Automatisch toepassen + door gebruiker bepaalde rechten: de gebruiker moet alsnog zelf de rechten kiezen.") : ""}
      </div></div><div>
      ${accordion("lbl-al-cmp", `${icon("info", "s")} Client-side vs. service-side`, `
        <table class="table small"><thead><tr><th></th><th>Client-side (Office)</th><th>Service-side</th></tr></thead><tbody>
          <tr><td>Waar</td><td>Tijdens bewerken in Office-apps</td><td>Data at rest (SharePoint/OneDrive) en e-mail in transit</td></tr>
          <tr><td>Aanbevelen</td><td>${VH.yes(true)}</td><td>${VH.yes(false)}</td></tr>
          <tr><td>Simulatie</td><td>${VH.yes(false)}</td><td>${VH.yes(true)}</td></tr>
          <tr><td>Bestaande bestanden</td><td>Alleen bij openen/bewerken</td><td>Ja (ook ongeopend)</td></tr>
          <tr><td>Instelling</td><td>In het label</td><td>Aparte auto-labeling policy</td></tr>
        </tbody></table>`)}
      <button class="btn small mt-1" data-action="go" data-route="autolabel">${icon("cloud", "s")} Service-side auto-labeling</button>
      </div></div>`;
  },

  /* ---------- Tab: Groups & sites ---------- */
  tab_container(l, st) {
    const id = l.id, c = l.cfg.container, b = `lbl:${id}:cfg.container`;
    if (!l.cfg.scope.sites) return emptyState("site", "Geen container-label", "Dit label geldt niet voor Groups & sites. Zet de scope aan om privacy, gasttoegang en extern delen voor Teams, Microsoft 365 Groups en SharePoint-sites vast te leggen.", `<button class="btn primary" data-action="lbl-scope" data-id="${esc(id)}" data-key="sites">${icon("plus", "s")} Scope Groups & sites aanzetten</button>`);
    return `<div class="split wide-left"><div>
      <div class="card mb-2"><div class="card-head"><h3>${icon("users")} Privacy and external user access</h3>${learn("labelsContainers", "Labels voor Teams, groepen en sites")}</div>
        ${F.radios(b + ".privacy", "Privacy", CATALOG.containerPrivacy.map(([k, t, d]) => [k, t, d]), { cards: true })}
        ${F.check(b + ".externalUserAccess", "Let Microsoft 365 group owners add people outside your organization to the group as guests")}
      </div>
      <div class="card mb-2"><h3 class="mt-0">${icon("share")} External sharing</h3>
        ${F.radios(b + ".sharing", "Control external sharing from labeled SharePoint sites", CATALOG.siteSharing, { cards: true })}
      </div>
      ${accordion("lbl-ct-tech", `${icon("settings", "s")} Technische details <span class="muted xs">Conditional Access, deellinks, Teams</span>`, `
        ${F.radios(b + ".unmanaged", "Use Microsoft Entra Conditional Access to protect labeled SharePoint sites – unmanaged devices", CATALOG.unmanagedAccess, { cards: true })}
        ${c.unmanaged !== "full" ? msg("info", "Vereist een Conditional Access-beleid met ‘Use app enforced restrictions’ in Entra ID.") : ""}
        ${F.text(b + ".authContext", "Choose an existing authentication context", { ph: "bijv. c1 – MFA + compliant device", hint: "Optioneel; koppelt het label aan een Conditional Access-beleid." })}
        <div class="divider"></div>
        <div class="grid-2">${F.select(b + ".defaultLinkType", "Default sharing link type", CATALOG.defaultLinkType)}${F.select(b + ".defaultLinkPermission", "Default link permission", CATALOG.defaultLinkPermission)}</div>
        <div class="divider"></div>
        ${F.check(b + ".privateTeamsDiscoverable", "Users can discover private teams through search", { desc: "Alleen relevant bij Private." })}
        <div class="field-label mt-2">Shared channels ${infoTip("De PowerShell-parameters (TeamsChannel…, TeamsAllowPrivateTeamsToBeDiscoverableUsingSearch) bestaan, maar zijn nog niet volledig gedocumenteerd; controleer het resultaat in het portal.")}</div>
        ${F.check(b + ".sharedChannels.internalOnly", "Internal only", { desc: "Alleen met interne gebruikers." })}
        ${F.check(b + ".sharedChannels.sameLabelOnly", "Same label only", { desc: "Alleen met teams met hetzelfde label." })}
        ${F.check(b + ".sharedChannels.privateTeamsOnly", "Private teams only", { desc: "Alleen met private teams." })}`)}
      </div><div>
        ${c.privacy === "public" && c.sharing === "Disabled" ? msg("info", "Public + geen extern delen: iedereen intern kan lezen, niemand extern.") : ""}
        ${c.externalUserAccess && c.sharing === "Disabled" ? msg("warn", "Gasten mogen worden toegevoegd, maar extern delen staat uit; gasten zien dan wel teaminhoud maar er kan niet extern gedeeld worden. Bewust zo?") : ""}
        ${accordion("lbl-ct-notes", `${icon("info", "s")} Goed om te weten <span class="badge neutral">${CATALOG.containerNotes.length}</span>`, `<ul class="small">${CATALOG.containerNotes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>`)}
      </div></div>`;
  },

  /* ---------- Tab: zo ziet de gebruiker het ---------- */
  tab_preview(l, st) {
    return `<p class="small muted mt-0">Wat medewerkers zien met dit label. Kies een app.</p>${Previews.panel(l, st, UI.pvApp)}`;
  },

  /* ---------- Tab: meetings ---------- */
  tab_meetings(l, st) {
    const id = l.id, m = l.cfg.meetings, b = `lbl:${id}:cfg.meetings`;
    if (!l.cfg.scope.meetings) return emptyState("meeting", "Geen meeting-label", "Dit label geldt niet voor Teams-meetings en agenda-items. De scope Meetings vereist ook Files en Emails.", `<button class="btn primary" data-action="lbl-scope" data-id="${esc(id)}" data-key="meetings">${icon("plus", "s")} Scope Meetings aanzetten</button>`);
    const w = [];
    if (m.e2ee && (m.recordAutomatically || (m.whoCanRecord !== "default"))) w.push(msg("warn", "End-to-end encryptie schakelt opnemen, transcriptie, live captions en Copilot in de meeting uit; opname-instellingen hebben dan geen effect."));
    if (m.recordAutomatically && m.preventCopyChat) w.push(msg("info", "Automatisch opnemen + kopieerbeveiliging: let op dat transcripties wel worden bewaard."));
    if (m.lobbyBypass === "Everyone") w.push(msg("warn", "Lobby-bypass ‘Everyone’: ook anonieme deelnemers komen direct binnen."));
    return `<div class="split wide-left"><div>
      <div class="card mb-2"><div class="card-head"><h3>${icon("meeting")} Settings for meetings and calendar events</h3>${learn("labelsMeetings", "Labels voor meetings")}</div>
        <div class="grid-2">
          ${F.select(b + ".lobbyBypass", "Who can bypass the lobby?", CATALOG.meetingLobby)}
          ${F.select(b + ".presenters", "Who can present?", CATALOG.meetingPresenters)}
          ${F.select(b + ".whoCanRecord", "Who can record?", CATALOG.meetingRecorders, { badge: licBadge("teamsPremium") })}
          ${F.select(b + ".allowChat", "Allow meeting chat", CATALOG.meetingChat)}
        </div>
        <div class="divider"></div>
        ${CATALOG.meetingSettings.map((s) => F.toggle(`${b}.${s.key}`, s.name, { desc: s.desc, badge: (s.lic ? licBadge(s.lic) : "") + (s.preview ? " " + previewBadge() : "") })).join("")}
        ${w.join("")}
      </div></div><div>
        ${accordion("lbl-mt-notes", `${icon("info", "s")} Goed om te weten <span class="badge neutral">${CATALOG.meetingNotes.length}</span>`, `<ul class="small">${CATALOG.meetingNotes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>`)}
      </div></div>`;
  },
};

/* ---------- Rechten toevoegen / verplaatsen ---------- */
function _addPerm(st, l, principal, level) {
  const e = l.cfg.encryption;
  const same = e.permissions.find((p) => p.type === principal.type && (principal.groupId ? p.groupId === principal.groupId : !p.groupId && !p.value && (principal.type === "org" || principal.type === "authenticated")));
  if (same) { same.level = level; if (level === "Custom" && !(same.rights || []).length) same.rights = ["VIEW", "VIEWRIGHTSDATA"]; }
  else e.permissions.push({ id: uid("perm"), type: principal.type, value: "", groupId: principal.groupId || undefined, level, rights: level === "Custom" ? ["VIEW", "VIEWRIGHTSDATA"] : [] });
  e.mode = "assignNow";
  _markCustom(l, "cfg.encryption");
}
DnD.register("perm-level", (type, p, t) => {
  if (type === "perm") {
    if (p.labelId !== t.labelId) { Toast.show("Je kunt rechten alleen binnen hetzelfde label verplaatsen.", "warn"); return; }
    Store.update((st) => {
      const l = labelById(t.labelId, st), x = l && l.cfg.encryption.permissions[p.idx];
      if (!x) return;
      x.level = t.level;
      if (t.level === "Custom" && !(x.rights || []).length) x.rights = [...LabelDetail.rightsOf({ level: "Viewer" })];
      _markCustom(l, "cfg.encryption");
    });
    return;
  }
  if ((p.type === "group" || p.type === "domain") && !p.groupId) {
    const isDom = p.type === "domain";
    promptDialog(isDom ? "Partnerdomein toevoegen" : "Groep of gebruiker toevoegen", isDom ? "Domein" : "Naam van de groep (mail-enabled)", "", (val) => {
      val = String(val || "").trim();
      if (!val) return;
      Store.update((st) => {
        const l = labelById(t.labelId, st);
        const g = { id: uid("grp"), name: val, kind: isDom ? "domain" : "group", value: isDom ? val : "", forLabel: l.id };
        st.groups.push(g);
        _addPerm(st, l, { type: p.type, groupId: g.id }, t.level);
      });
    }, { ph: isDom ? "bijv. ketenpartner.nl" : "HR-medewerkers", hint: isDom ? "Eén domein per regel; geen e-mailadressen. Let op: bij een organisatie met Microsoft Entra ID krijgen álle geverifieerde domeinen van die tenant toegang, niet alleen het opgegeven domein." : "Gebruik bij voorkeur groepen in plaats van individuele gebruikers. Het e-mailadres kun je later invullen bij Labelbeleid → Doelgroepen.", okLabel: "Toevoegen" });
    return;
  }
  Store.update((st) => { const l = labelById(t.labelId, st); if (l) _addPerm(st, l, p, t.level); });
});

/* ---------- Acties ---------- */
Actions["lbl-tab"] = (el) => { UI.labelTab = el.dataset.tab; App.render(); };
Actions["lbl-scope"] = (el) => Actions["board-scope"](el);
Actions["perm-del"] = (el) => Store.update((st) => {
  const l = labelById(el.dataset.id, st); if (!l) return;
  l.cfg.encryption.permissions.splice(Number(el.dataset.idx), 1);
  _markCustom(l, "cfg.encryption");
});
Actions["perm-right"] = (el) => Store.update((st) => {
  const l = labelById(el.dataset.id, st); const p = l && l.cfg.encryption.permissions[Number(el.dataset.idx)];
  if (!p) return;
  const r = el.dataset.right, set = new Set(p.rights || []);
  if (set.has(r)) set.delete(r); else { set.add(r); if (r !== "VIEW") set.add("VIEW"); }
  if (r === "VIEW" && !set.has("VIEW")) set.clear();
  p.rights = CATALOG.usageRights.map((u) => u.key).filter((k) => set.has(k));
  _markCustom(l, "cfg.encryption");
});
Actions["mark-var"] = (el) => {
  const spec = el.dataset.spec, v = el.dataset.v;
  const ta = el.dataset.target && document.getElementById(el.dataset.target);
  if (!ta) { const cur = String(bindValue(spec) || ""); setBind(spec, (cur && !/\s$/.test(cur) ? cur + " " : cur) + v); return; }
  const cur = ta.value, a = ta.selectionStart ?? cur.length, b = ta.selectionEnd ?? a;
  const pre = cur.slice(0, a), ins = (pre && !/\s$/.test(pre) ? " " : "") + v;
  ta.value = pre + ins + cur.slice(b);
  const pos = a + ins.length;
  ta.focus(); ta.setSelectionRange(pos, pos);
  ta.dispatchEvent(new Event("input", { bubbles: true }));
};
Actions["mark-preview"] = (el) => {
  setTimeout(() => {
    const l = labelById(el.dataset.id); if (!l) return;
    const p = $("#mark-preview"), i = $("#mark-issues");
    if (p) p.innerHTML = LabelDetail.preview(l, S());
    if (i) i.innerHTML = LabelDetail.issuesHtml(l);
  }, 0);
};

/* ---------- View ---------- */
registerView("labels", {
  title: "Label-instellingen",
  fac: {
    duration: 45,
    goal: "Per label de exacte Purview-instellingen vastleggen: wie mag wat (encryptie), welke markering en wat het label doet voor Teams, sites en meetings.",
    questions: ["Wie moet deze informatie kunnen openen – alleen intern, ook partners, of alleen een specifieke groep?", "Moet de ontvanger kunnen kopiëren, printen of doorsturen? (Zonder Copy kan Copilot de inhoud niet gebruiken.)", "Welke zichtbare markering helpt de medewerker zonder het document onleesbaar te maken?"],
    tips: ["Begin op het Ontwerpbord; verfijn hier alleen wat afwijkt – dat wordt als maatwerk gemarkeerd.", "Gebruik groepen in plaats van individuele gebruikers bij rechten.", "Laat de live preview zien bij Markering: dat maakt het tastbaar."],
    pitfalls: ["Encryptie met vervaldatum: co-authoring/AutoSave werkt niet en ook interne gebruikers verliezen toegang.", "Geen super user geregeld: versleutelde inhoud is niet meer te herstellen of te doorzoeken.", "Lange header/footer-teksten: Excel ondersteunt max. 255 tekens samen."],
    links: ["labelsCreate", "labelsEncryption", "usageRights"],
  },
  render() {
    const st = S();
    if (!st.labels.length) return VH.needLabels();
    const l = VH.selLabel("labels", st);
    const parent = hasChildren(l, st);
    let tab = UI.labelTab || "scope";
    if (parent || !LabelDetail.tabs.some((t) => t[0] === tab)) tab = parent ? "scope" : (LabelDetail.tabs.some((t) => t[0] === tab) ? tab : "scope");
    const sc = l.cfg.scope, e = l.cfg.encryption, m = l.cfg.marking;
    const dot = (on) => (on ? `<span class="tab-check" title="Ingesteld" aria-label="ingesteld">${icon("check", "s")}</span>` : "");
    const active = {
      encryption: e.mode !== "none", marking: m.header.enabled || m.footer.enabled || m.watermark.enabled,
      autolabel: l.cfg.autolabel.client.mode !== "off", container: sc.sites, meetings: sc.meetings,
    };
    const idx = orderedLabels(st).indexOf(l), all = orderedLabels(st);
    const next = all[idx + 1];
    const actions = `${next ? `<button class="btn" data-action="go" data-route="labels" data-sub="${esc(next.id)}">Volgende label ${icon("chevronright", "s")}</button>` : ""}<button class="btn subtle" data-action="go" data-route="board">${icon("board", "s")} Ontwerpbord</button>`;
    const tabBar = `<div class="tabs" role="tablist">${LabelDetail.tabs.map(([k, t, ic]) => `<button class="tab${k === tab ? " on" : ""}" role="tab" aria-selected="${k === tab}" data-action="lbl-tab" data-tab="${k}"${parent && k !== "scope" ? " disabled" : ""}>${icon(ic, "s")}${esc(t)}${dot(active[k])}</button>`).join("")}</div>`;
    const sumItem = (d, k, ic) => {
      const c = Mapping.choice(l, d), full = String(Mapping.summary(l, d, st));
      return `<div class="lb-sum-i"><dt>${icon(ic, "s")}${esc(k)}</dt><dd title="${esc(full)}">${esc(c && !Mapping.isCustom(l, d) ? c.title : full)}</dd></div>`;
    };
    const summ = !parent ? `<dl class="lb-sum" aria-label="Wat doet dit label">${sumItem("publish", "Zichtbaar voor", "users")}${sumItem("marking", "Markering", "watermark")}${sumItem("encryption", "Toegang", "lock")}${sumItem("autolabel", "Automatisch", "wand")}</dl>` : "";
    return `<div class="lb-labels">${pageHead("Labels", "Label-instellingen", "Wat doet dit label voor de gebruiker? Verfijn per onderdeel.", actions, `<p class="mb-1">Keuzes op het Ontwerpbord vullen dit automatisch in. Pas je hier iets aan, dan krijgt de cel op het bord de markering <b>aangepast</b>. De tabbladen volgen de wizard in het Purview-portal; een ${icon("check", "s")} betekent dat daar iets is ingesteld.</p>${learn("labelsCreate", "Create and configure sensitivity labels")}`)}
      ${VH.labelPicker("labels", l, st)}
      ${summ}
      ${parent ? msg("info", `Parent-label met ${plural(childrenOf(l.id, st).length, "sublabel", "sublabels")}: gebruikers passen alleen de sublabels toe. Kies een sublabel voor de overige instellingen.`) : ""}
      ${tabBar}
      ${LabelDetail["tab_" + tab](l, st)}</div>`;
  },
});
