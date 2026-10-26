/* View: Tenant-voorbereiding – randvoorwaarden die vóór uitrol op orde moeten zijn. */

const TENANT_STATUS = [
  ["todo", "Te doen"],
  ["progress", "Bezig"],
  ["done", "Gereed"],
  ["na", "N.v.t."],
];

function _copyFallback(text) {
  const ta = document.createElement("textarea");
  ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta); ta.select();
  try { document.execCommand("copy"); Toast.show("Gekopieerd", "ok"); } catch (e) { Toast.show("Kopiëren mislukt; selecteer de tekst handmatig.", "warn"); }
  ta.remove();
}

Actions["copy-text"] = (el) => {
  let text = el.dataset.text;
  if (text === undefined && el.dataset.target) { const t = document.getElementById(el.dataset.target); text = t ? (t.value !== undefined && t.tagName !== "DIV" && t.tagName !== "PRE" ? t.value : t.textContent) : ""; }
  text = String(text || "");
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(() => Toast.show("Gekopieerd", "ok"), () => _copyFallback(text));
  else _copyFallback(text);
};

Actions["tenant-status"] = (el) => {
  const id = el.dataset.id, v = el.dataset.value;
  Store.update((st) => {
    const c = st.tenant.checks[id] || (st.tenant.checks[id] = {});
    c.status = c.status === v && v !== "todo" ? "todo" : v;
  });
};

const TenantUI = {
  needed(st) { return CATALOG.tenantChecks.filter((c) => { try { return c.when(st); } catch (e) { return false; } }); },
  status(st, id) { return (st.tenant.checks[id] || {}).status || "todo"; },
  progress(st) {
    const n = this.needed(st), done = n.filter((c) => ["done", "na"].includes(this.status(st, c.id))).length;
    return { total: n.length, done, pct: n.length ? (done / n.length) * 100 : 100, openReq: n.filter((c) => c.req && !["done", "na"].includes(this.status(st, c.id))).length };
  },
};

const TENANT_TOPICS = [
  ["Basis", "settings", ["audit"]],
  ["Labels & encryptie", "tag", ["spo", "pdf", "coauth", "rms", "b2b", "ome", "containers", "meetings", "schematized", "powerbi"]],
  ["Endpoint", "laptop", ["devices", "browser"]],
  ["DLP", "shield", ["scanner", "mdca", "alerts"]],
  ["Copilot", "sparkle", ["copilot"]],
];
TenantUI.topic = (c) => { const t = TENANT_TOPICS.find((x) => x[2].includes(c.id)); return t ? t[0] : c.group; };

registerView("tenant", {
  title: "Tenant-voorbereiding",
  fac: {
    duration: 20,
    goal: "Vaststellen welke tenantinstellingen, licenties en rollen klaar moeten staan vóórdat labels en DLP-policies worden uitgerold – en wie daarvoor zorgt.",
    questions: ["Staat de unified audit log aan, en wie heeft toegang tot Activity explorer?", "Zijn sensitivity labels voor SharePoint/OneDrive al ingeschakeld?", "Wie onboardt de apparaten voor Endpoint DLP, en welke browsers zijn in gebruik?", "Wie behandelt DLP-alerts en incidentrapporten?"],
    tips: ["Wijs per punt meteen een eigenaar en datum toe; dit wordt de actielijst na de workshop.", "De lijst past zich aan het ontwerp aan: alleen wat nodig is voor de gekozen keuzes verschijnt.", "Kopieer de PowerShell-regels voor de beheerder; controleer ze eerst in een testtenant."],
    pitfalls: ["Co-authoring voor versleutelde bestanden wijzigt hoe labelmetadata wordt opgeslagen (let op oudere Office-apps) en werkt niet met DKE of verlopende toegang.", "Labels voor Groups & sites werken pas na EnableMIPLabels én label-synchronisatie.", "Endpoint DLP zonder onboarde apparaten of zonder browserextensie (Chrome/Firefox) doet niets."],
    links: ["audit", "labelsSpo", "deviceOnboarding", "dlpAlerts"],
  },
  render() {
    const st = S(), needed = TenantUI.needed(st), pr = TenantUI.progress(st);
    const notNeeded = CATALOG.tenantChecks.filter((c) => !needed.includes(c));
    const fin = (s) => s === "done" || s === "na";
    const open = UI.tnOpen || {};
    const item = (c) => {
      const s = TenantUI.status(st, c.id), on = !!open[c.id];
      const meta = [c.who ? `${icon("users", "s")} ${esc(c.who)}` : "", c.effort ? `${icon("clock", "s")} ${esc(c.effort)}` : ""].filter(Boolean).join(" · ");
      const tech = c.ps ? accordion(`tn-ps-${c.id}`, "Technische details", `<p class="xs muted mt-0">Voor de beheerder. Controleer de opdracht eerst in een testtenant.</p><div class="row tight"><code class="code" style="flex:1;padding:6px 10px;white-space:pre-wrap">${esc(c.ps)}</code><button type="button" class="btn small" data-action="copy-text" data-text="${esc(c.ps)}" title="Kopieer" aria-label="Kopieer opdracht">${icon("copy", "s")}</button></div>`) : "";
      const body = on ? `<div class="vb-tl-body" id="tn-body-${esc(c.id)}"><p class="small mt-0">${esc(c.desc)}</p>${meta ? `<p class="xs muted">${meta}</p>` : ""}
        ${F.text(`st:tenant.checks.${c.id}.note`, "Notitie", { ph: "Afspraak, datum, ticket…" })}${tech}${c.learn ? `<div class="xs mt-1">${learn(c.learn)}</div>` : ""}</div>` : "";
      return `<li class="vb-tl-row${fin(s) ? " vb-fin" : ""}${on ? " open" : ""}" data-check="${esc(c.id)}">
        <div class="vb-tl-line">${VH.aria(F.select(`st:tenant.checks.${c.id}.status`, "", TENANT_STATUS, { cls: "mb-0 vb-tl-status" }), `Status: ${c.name}`)}
        <span class="vb-tl-name">${esc(c.name)}${c.req && !fin(s) ? ` <span class="badge warn" title="Nodig vóór de pilot">Nodig</span>` : ""}</span>
        ${VH.aria(F.text(`st:tenant.checks.${c.id}.owner`, "", { ph: "Eigenaar", cls: "mb-0 vb-tl-owner" }), `Eigenaar: ${c.name}`)}
        <button type="button" class="icon-btn small" data-action="tenant-more" data-id="${esc(c.id)}" aria-expanded="${on}" aria-label="Details: ${esc(c.name)}" title="Details">${icon("chevrondown", "s")}</button></div>${body}</li>`;
    };
    const topics = unique(needed.map((c) => TenantUI.topic(c)));
    const groupsHtml = topics.map((g) => {
      const its = needed.filter((c) => TenantUI.topic(c) === g), ok = its.filter((c) => fin(TenantUI.status(st, c.id))).length;
      return `<h3 class="section-title mt-2">${esc(g)} <span class="xs muted">· ${ok}/${its.length}</span></h3><ul class="vb-tl">${its.map(item).join("")}</ul>`;
    }).join("");
    const more = `<p>Deze lijst toont alleen de randvoorwaarden voor dít ontwerp en past zich automatisch aan. Kies per punt een status en eigenaar; uitleg, notities en de beheeropdracht staan onder het pijltje.</p><p>Punten met <b>Nodig</b> moeten gereed zijn vóór de pilot.</p>`;
    return VH.wrap(`${pageHead("Voorbereiding", "Tenant-voorbereiding", "Wat moet er in de tenant klaarstaan?", "", more)}
      <div class="vb-tl-progress">${meter(pr.pct, pr.openReq ? "warn" : "ok")}<span class="small"><b>${pr.done}/${pr.total}</b> afgerond · ${pr.openReq ? `<b>${pr.openReq}</b> nodig vóór de pilot` : `alles voor vóór de pilot geregeld`}</span></div>
      ${groupsHtml || emptyState("check", "Geen randvoorwaarden", "Voor het huidige ontwerp zijn geen tenantinstellingen nodig.")}
      ${notNeeded.length ? `<div class="mt-3">${accordion("tn-notneeded", `${icon("minus", "s")} Niet nodig voor dit ontwerp <span class="xs muted">· ${notNeeded.length}</span>`, `<ul class="small">${notNeeded.map((c) => `<li><b>${esc(c.name)}</b> – ${esc(c.desc)}</li>`).join("")}</ul>`)}</div>` : ""}`, "vb-tenant");
  },
});

Actions["tenant-more"] = (el) => {
  const id = el.dataset.id;
  UI.tnOpen = UI.tnOpen || {};
  UI.tnOpen[id] = !UI.tnOpen[id];
  App.render();
  const b = document.querySelector(`[data-action="tenant-more"][data-id="${CSS.escape(id)}"]`);
  if (b) b.focus();
};