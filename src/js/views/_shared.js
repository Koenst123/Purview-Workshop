/* Gedeelde view-helpers (VH): locaties, modi, regel- en policykaarten, labelkiezer, confetti */
const VH = {
  loc(k) { return CATALOG.dlpLocations.find((x) => x.key === k) || { key: k, name: k, short: k, icon: "info" }; },
  locIcons(keys) {
    return `<span class="loc-icons">${(keys || []).map((k) => { const l = this.loc(k); return `<span class="loc-icon" data-tip="${esc(l.name)}">${icon(l.icon, "s")}</span>`; }).join("")}</span>`;
  },
  modeName(key) { const m = CATALOG.dlpModes.find((x) => x.key === key); return m ? m.nl || m.name : key; },
  /** Engelse Purview-term als subtekst onder een NL-keuze (NL-first). */
  en(term) { return term ? `<span class="en-term">Purview: ${esc(term)}</span>` : ""; },
  modeBadge(key) {
    const t = { simulation: ["Simulatie", "info"], simulationTips: ["Simulatie + tips", "warn"], enable: ["Aan (handhaven)", "ok"], disable: ["Uit", "neutral"] }[key] || [key, "neutral"];
    return `<span class="badge ${t[1]}" title="${esc(this.modeName(key))}">${esc(t[0])}</span>`;
  },
  actionLv(a) { return { off: 0, audit: 1, tip: 1, encrypt: 2, override: 2, warn: 2, custom: 2, move: 3, govern: 3, block: 3, copilot: 4 }[a] ?? 1; },
  sitChip(s, x) {
    if (!s) return "";
    const k = CATALOG.sitKinds[s.kind] || {};
    return `<span class="chip sm kind-${esc(s.kind)}" title="${esc((k.short || "") + (s.desc ? " – " + s.desc : ""))}">${icon(k.icon || "search", "s")}${esc(s.name)}${x || ""}</span>`;
  },
  lvl(lv, text) { return levelChip(lv, text); },
  /** Geselecteerd label voor een route (UI.sub[route]); valt terug op het eerste label uit de lijst. */
  selLabel(route, st = S(), filter) {
    const list = filter ? orderedLabels(st).filter(filter) : orderedLabels(st);
    const id = UI.sub[route];
    return list.find((l) => l.id === id) || list[0] || null;
  },
  /** Wisselstand uit Instellingen: "compact" (keuzelijst met ‹ ›) of "list" (lijst links, detail rechts). */
  switchMode() { return typeof Prefs !== "undefined" && Prefs.v && Prefs.v.pickerMode === "list" ? "list" : "compact"; },
  /** Wisselaar tussen items zonder paginawissel. o: { label, items:[{id,name,color,icon,indent,note}], cur, route, action="go", key="sub", extra, noList }. */
  switcher(o, detail = "") {
    const items = o.items || [];
    if (!items.length) return detail;
    const act = o.action || "go", key = o.key || "sub";
    const i = Math.max(0, items.findIndex((x) => x.id === o.cur));
    const lbl = o.label || "Item";
    const attrs = (x) => `data-action="${esc(act)}"${o.route ? ` data-route="${esc(o.route)}"` : ""} data-${esc(key)}="${esc(x.id)}"`;
    const hex = (c) => (/^#[0-9a-f]{3,8}$/i.test(String(c || "")) ? c : "#69797E");
    const lead = (x) => (x.color ? `<span class="color-dot" style="background:${hex(x.color)}"></span>` : x.icon ? icon(x.icon, "s") : "");
    if (this.switchMode() === "list" && !o.noList) {
      return `<div class="sw-split"><nav class="sw-list" aria-label="${esc(lbl)}">${o.extra ? `<div class="sw-list-x">${o.extra}</div>` : ""}${items.map((x) => `<button type="button" class="sw-li${x.id === items[i].id ? " on" : ""}${x.indent ? " ind" : ""}" ${attrs(x)}${x.id === items[i].id ? ' aria-current="true"' : ""}>${lead(x)}<span class="sw-li-t">${esc(x.name)}</span>${x.note ? `<span class="sw-li-n">${esc(x.note)}</span>` : ""}</button>`).join("")}</nav><div class="sw-detail">${detail}</div></div>`;
    }
    const step = (x, dir) => {
      const t = dir < 0 ? "Vorige" : "Volgende", ic = icon(dir < 0 ? "chevronleft" : "chevronright", "s");
      return x ? `<button type="button" class="icon-btn sw-step" data-sw-dir="${dir < 0 ? "prev" : "next"}" ${attrs(x)} title="${t}: ${esc(x.name)}" aria-label="${t}: ${esc(x.name)}">${ic}</button>` : `<button type="button" class="icon-btn sw-step" data-sw-dir="${dir < 0 ? "prev" : "next"}" disabled aria-label="${t}">${ic}</button>`;
    };
    const cur = items[i];
    return `<div class="sw-bar" data-sw="${esc(act + ":" + key)}" role="group" aria-label="${esc(lbl)} kiezen">${step(items[i - 1], -1)}<span class="sw-sel-wrap">${lead(cur)}<select class="input sw-sel" data-action="sw-pick" data-pick="${esc(act)}"${o.route ? ` data-route="${esc(o.route)}"` : ""} data-key="${esc(key)}" aria-label="${esc(lbl)}">${items.map((x) => `<option value="${esc(x.id)}"${x === cur ? " selected" : ""}>${x.indent ? "\u00a0\u00a0↳ " : ""}${esc(x.name)}${x.note ? ` (${esc(x.note)})` : ""}</option>`).join("")}</select></span>${step(items[i + 1], 1)}<span class="sw-count">${i + 1} / ${items.length}</span>${o.extra ? `<span class="sw-x">${o.extra}</span>` : ""}</div>${detail}`;
  },
  labelItems(st = S(), filter) {
    const list = filter ? orderedLabels(st).filter(filter) : orderedLabels(st);
    return list.map((l) => ({ id: l.id, name: l.parentId ? l.displayName || l.name : labelFullName(l, st), color: l.color, indent: !!l.parentId, note: hasChildren(l, st) ? "parent" : "" }));
  },
  /** Labelwisselaar; detail = de inhoud die bij het gekozen label hoort (nodig voor de lijstweergave). */
  labelSwitch(route, cur, st = S(), filter, detail = "", o = {}) {
    return this.switcher({ label: "Label", items: this.labelItems(st, filter), cur: cur && cur.id, route, ...o }, detail);
  },
  labelPicker(route, cur, st = S(), filter) { return this.labelSwitch(route, cur, st, filter, "", { noList: true }); },
  condText(x) {
    const c = CATALOG.dlpConditions.find((k) => k.key === x.key);
    if (!c) return esc(x.key);
    let v = x.value;
    if (Array.isArray(v)) v = v.join(", ");
    if (c.options) { const o = c.options.find((p) => p[0] === v); if (o) v = o[1]; }
    return `${esc(c.name)}${v !== undefined && v !== "" && c.value !== "none" ? `: <b>${esc(v)}</b>` : ""}`;
  },
  ruleCard(r, st = S(), o = {}) {
    const lv = r.label ? Mapping.level(r.label, "dlp_" + r.domain) : null;
    const L = lv == null ? this.actionLv(r.action) : lv;
    const an = DLP_ACTION_NAMES[r.action] || r.action || "";
    const chipTxt = an && r.desc && String(r.desc).toLowerCase().includes(String(an).toLowerCase()) ? undefined : an;
    const cond = [...r.conditions.labels.map((l) => labelPill(l, st)), ...r.conditions.sits.slice(0, o.full ? 99 : 6).map((s) => this.sitChip(s))];
    if (!o.full && r.conditions.sits.length > 6) cond.push(`<span class="chip sm">+${r.conditions.sits.length - 6}</span>`);
    if (r.conditions.senderExternal) cond.push(`<span class="chip sm">${icon("globe", "s")}Externe afzender</span>`);
    (r.conditions.extra || []).forEach((x) => cond.push(`<span class="chip sm">${this.condText(x)}</span>`));
    const exc = (r.exceptions || []).map((x) => `<span class="chip sm">${this.condText(x)}</span>`).join("");
    return `<div class="rule-row"${o.attrs || ""}><span class="prio-num">${(r.order ?? r.priority ?? 0) + 1}</span><div class="rr-main">
      <div class="row tight"><b>${esc(r.name)}</b> ${levelChip(L, chipTxt)}${r.effective ? "" : ` <span class="badge err" title="Regel heeft geen conditie of activiteit en doet niets.">Geen conditie</span>`}${r.stop ? ` <span class="badge neutral">Stop processing</span>` : ""}</div>
      <div class="muted small mt-1">${esc(r.desc || "")}</div>
      ${cond.length ? `<div class="chip-list mt-1">${cond.join("")}</div>` : ""}
      ${exc ? `<div class="chip-list mt-1"><span class="badge warn">Behalve</span>${exc}</div>` : ""}
      ${o.full && r.notify && r.notify.tip ? `<div class="xs muted mt-1">${icon("chat", "s")} Tip: “${esc(r.notify.tip)}”</div>` : ""}
    </div></div>`;
  },
  policyCard(p, st = S(), o = {}) {
    const locs = unique(p.locations);
    return `<div class="policy-card"><div class="pc-head">${this.locIcons(locs)}<h4>${esc(p.name)}</h4>${this.modeBadge(p.mode)}${o.actions ? o.actions(p) : ""}</div><div class="pc-body">${this.policyBody(p, st, o)}</div></div>`;
  },
  policyBody(p, st = S(), o = {}) {
    const locs = unique(p.locations);
    const sub = [p.custom ? `<span class="badge info">Maatwerk</span>` : `<span class="badge neutral">Afgeleid</span>`, p.merged ? `<span class="badge ok" title="Locaties met identieke keuzes zijn samengevoegd in één policy.">Samengevoegd</span>` : "", p.adminUnits && p.adminUnits.length ? `<span class="badge neutral">Admin units: ${esc(p.adminUnits.join(", "))}</span>` : "", locs.includes("copilot") ? previewBadge() : ""].join(" ");
    return `<div class="row tight mb-1">${sub}<span class="xs muted">${esc(locs.map((k) => this.loc(k).name).join(" · "))}</span></div>
      ${p.desc ? `<div class="small muted mb-1">${esc(p.desc)}</div>` : ""}
      ${(p.include || []).length || (p.exclude || []).length ? `<div class="xs muted mb-1">${(p.include || []).length ? `Include: ${esc(p.include.join(", "))} ` : ""}${(p.exclude || []).length ? `· Exclude: ${esc(p.exclude.join(", "))}` : ""}</div>` : ""}
      ${p.rules.length ? p.rules.map((r) => this.ruleCard(r, st, o)).join("") : `<div class="muted small">Nog geen regels.</div>`}`;
  },
  /** Eén-regel samenvatting van een policy (voor accordeons). */
  policySummary(p) {
    const locs = unique(p.locations);
    return `${this.locIcons(locs)}<span class="vb-sum-title">${esc(p.name)}</span>${this.modeBadge(p.mode)}<span class="xs muted">${plural(p.rules.length, "regel", "regels")}</span>${p.custom ? ` <span class="badge info">Maatwerk</span>` : ""}`;
  },
  /** Policy als inklapbare kaart: samenvatting op één regel, details eronder. */
  policyAcc(key, p, st = S(), o = {}) {
    return `<details class="acc vb-pacc" data-acc="${esc(key)}"${o.open ? " open" : ""}><summary>${this.policySummary(p)}</summary><div class="acc-body">${this.policyBody(p, st, o)}${o.after || ""}</div></details>`;
  },
  /** Pagina-wrapper voor views-b (container queries in views-b.css). */
  wrap(html, cls = "") { return `<div class="vb-page${cls ? " " + cls : ""}">${html}</div>`; },
  /** Lange tekst inkorten tot n regels met een ‘meer’-knop (alleen bij lange tekst). */
  clamp(html, len = 0, lines = 2, min = 110) {
    if (len <= min) return html;
    return `<div class="vb-clamp" style="--lines:${Number(lines) || 2}"><div class="vb-clamp-t">${html}</div><button type="button" class="vb-more" data-action="vb-more" aria-expanded="false">meer</button></div>`;
  },
  /** ‘meer’ alleen tonen als de tekst echt is ingekort; anders doet de knop zichtbaar niets (bijv. op een breed scherm). */
  clampFit(root = document) {
    root.querySelectorAll(".vb-clamp:not(.open)").forEach((box) => {
      const t = box.querySelector(".vb-clamp-t"), b = box.querySelector(".vb-more");
      if (!t || !b) return;
      if (typeof ResizeObserver !== "undefined" && !box._ro) {
        // Breedte kan later veranderen (zijbalk-animatie, container queries): opnieuw meten.
        box._ro = new ResizeObserver(() => { if (!box.classList.contains("open") && t.clientHeight) b.hidden = t.scrollHeight <= t.clientHeight + 1; });
        box._ro.observe(t);
      }
      if (!t.clientHeight) return;
      b.hidden = t.scrollHeight <= t.clientHeight + 1;
    });
  },
  /** Toegankelijke naam voor het eerste formulierveld in een stuk HTML (velden zonder zichtbaar label). */
  aria(html, label) { return String(html).replace(/<(select|input|textarea) /, `<$1 aria-label="${esc(label)}" `); },
  /** Attributen voor een klikbare niet-knop (rij/kaart): focusbaar en bedienbaar met Enter/spatie. */
  kbd: ` role="button" tabindex="0" data-vb-key="1"`,
  /** Include- en Exclude-veld voor één locatie: Purview staat er per locatie maar één van toe. */
  incExc(incSpec, excSpec, o = {}) {
    const has = (v) => (Array.isArray(v) ? v.length > 0 : !!String(v == null ? "" : v).trim());
    const hi = has(bindValue(incSpec)), he = has(bindValue(excSpec)), both = hi && he;
    const mark = (html, pair, off) => String(html).replace("<input ", `<input data-live="vb-incexc" data-vb-pair="${pair}"${off ? " disabled" : ""} `);
    const inc = mark(F.text(incSpec, o.incLabel || "Include", { type: "csv", ph: o.incPh || "Leeg = All", hint: o.incHint }), "inc", !both && he);
    const exc = mark(F.text(excSpec, o.excLabel || "Exclude", { type: "csv", ph: o.excPh || "Optioneel (alleen bij All)" }), "exc", !both && hi);
    const txt = "Purview ondersteunt per locatie óf ‘Include’ (specifieke groepen) óf ‘Exclude’ (bij ‘All’), niet beide.";
    return `<div class="vb-incexc"><div class="grid-2">${inc}${exc}</div>${both ? msg("err", esc(txt) + " Maak één van beide leeg.") : hi || he ? `<div class="xs muted vb-incexc-hint">${icon("info", "s")} ${esc(txt)}</div>` : ""}</div>`;
  },
  /** Horizontale overloop: fade + ‘→ meer’-hint zolang er rechts nog iets te zien is. */
  ovf(root = document) {
    root.querySelectorAll(".vb-ovf").forEach((box) => {
      const sc = box.querySelector(".vb-ovf-scroll");
      if (!sc) return;
      const upd = () => box.classList.toggle("has-more", sc.scrollWidth > sc.clientWidth + 4 && sc.scrollLeft + sc.clientWidth < sc.scrollWidth - 4);
      if (!sc.dataset.vbOvf) { sc.dataset.vbOvf = "1"; sc.addEventListener("scroll", upd, { passive: true }); }
      upd();
    });
  },
  /** Feestelijke effecten alleen als de gebruiker ze aanzet en geen ‘reduced motion’ wil. */
  fx() {
    const on = typeof Prefs !== "undefined" && Prefs.v && Prefs.v.effects === true;
    let calm = false;
    try { calm = reducedMotion(); } catch (e) { calm = false; }
    return on && !calm;
  },
  kv(rows) { return `<table class="table">${rows.filter(Boolean).map(([k, v]) => `<tr><th style="width:38%">${esc(k)}</th><td>${v}</td></tr>`).join("")}</table>`; },
  yes(b) { return b ? `<span class="badge ok">Ja</span>` : `<span class="badge neutral">Nee</span>`; },
  needLabels() { return emptyState("tag", "Nog geen labels", "Begin met het classificatieschema (of kies een preset op de startpagina).", `<button class="btn primary" data-action="go" data-route="schema">${icon("tag")} Naar classificatieschema</button>`); },
  confetti(n = 80) {
    if (!this.fx()) return;
    const c = document.createElement("div");
    c.className = "confetti";
    const colors = ["#DE058C", "#004FA3", "#FB59BE", "#9E1D74", "#181B3A"];
    for (let i = 0; i < n; i++) {
      const p = document.createElement("i");
      p.style.left = Math.random() * 100 + "vw";
      p.style.background = colors[i % colors.length];
      p.style.animationDuration = 1.6 + Math.random() * 1.8 + "s";
      p.style.animationDelay = Math.random() * 0.4 + "s";
      c.appendChild(p);
    }
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 4200);
  },
};

Actions["vb-more"] = (el) => {
  const box = el.closest(".vb-clamp");
  if (!box) return;
  const open = box.classList.toggle("open");
  el.textContent = open ? "minder" : "meer";
  el.setAttribute("aria-expanded", open ? "true" : "false");
};
/* Include/Exclude: tijdens het typen het andere veld (ont)grendelen, zonder volledige render. */
Actions["vb-incexc"] = (el) => {
  const box = el.closest(".vb-incexc");
  if (!box) return;
  const other = box.querySelector(`[data-vb-pair="${el.dataset.vbPair === "inc" ? "exc" : "inc"}"]`);
  if (other && !other.value.trim()) other.disabled = !!el.value.trim();
};
let _vbResizeRaf = 0;
window.addEventListener("resize", () => {
  cancelAnimationFrame(_vbResizeRaf);
  // Twee frames wachten: zijbalk en container queries moeten eerst opnieuw zijn opgemaakt.
  _vbResizeRaf = requestAnimationFrame(() => { _vbResizeRaf = requestAnimationFrame(() => { const m = document.getElementById("main"); if (m) { VH.ovf(m); VH.clampFit(m); } }); });
});
/* Ingeklapte tekst in een net geopende sectie: pas dan is te meten of ‘meer’ nodig is. */
document.addEventListener("toggle", (e) => { if (e.target && e.target.open && e.target.querySelector) VH.clampFit(e.target); }, true);

/* Enter/spatie op focusbare niet-knoppen ([data-vb-key]) gedraagt zich als een klik. */
window.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const el = e.target;
  if (!el || !el.matches || !el.matches("[data-vb-key]")) return;
  e.preventDefault();
  e.stopPropagation();
  el.click();
}, true);

/* Wisselaar: keuze in de keuzelijst → dezelfde actie als de ‹ ›-knoppen; focus blijft op de keuzelijst. */
Actions["sw-pick"] = (el) => {
  const name = el.dataset.pick;
  if (!name || name === "sw-pick" || !Object.hasOwn(Actions, name)) return;
  const ds = { ...el.dataset, action: name };
  ds[el.dataset.key || "sub"] = el.value;
  const route = UI.route;
  // Los (niet-gekoppeld) element met dezelfde data-*, zodat acties de volledige DOM-API hebben.
  const proxy = document.createElement("button");
  Object.keys(ds).forEach((k) => { if (k !== "pick" && k !== "__proto__" && k !== "constructor") proxy.dataset[k] = ds[k]; });
  proxy.value = el.value;
  Actions[name](proxy);
  const pick = el.dataset.pick, key = el.dataset.key;
  setTimeout(() => {
    if (UI.route !== route) return;
    const all = [...document.querySelectorAll("#main .sw-sel")];
    const s = all.find((x) => x.dataset.pick === pick && x.dataset.key === key) || all.find((x) => x.dataset.pick === pick) || all[0];
    if (s) s.focus({ preventScroll: true });
  }, 0);
};

/* ---------- Master-detail: lijst links, detail rechts (label-instellingen, labelbeleid, auto-labeling) ---------- */
Object.assign(VH, {
  /** o: { route, title, items:[{ id, name, full?, color?, icon?, mark?, indent?, meta?, flag?, rename? }], cur, add?: { action, label }, empty? }.
   *  flag is HTML en moet door de aanroeper zijn opgebouwd met esc()/icon(). Smal (container < ±52em): keuzelijst bovenaan.
   *  rename: { bind, value, max?, what, dflt? } → inline hernoemen (potlood, F2, dubbelklik); dflt = waarde die als "" (automatisch) wordt opgeslagen. */
  masterList(o, detail = "") {
    const items = o.items || [], route = String(o.route || UI.route);
    VH._mdRen = VH._mdRen || {};
    VH._mdRen[route] = Object.create(null);
    items.forEach((x) => { if (x.rename && x.rename.bind) VH._mdRen[route][x.id] = { max: 64, what: "item", ...x.rename, value: String(x.rename.value || "") }; });
    if (!items.length) return o.empty !== undefined ? o.empty : detail;
    const cur = items.find((x) => x.id === o.cur) || items[0];
    const rail = !!UI.mdRail, title = o.title || "Items";
    const q = String((UI.mdQ && UI.mdQ[route]) || "");
    const search = items.length > 8;
    const hex = (c) => (/^#[0-9a-f]{3,8}$/i.test(String(c || "")) ? c : "#69797E");
    const lead = (x) => (x.color ? `<span class="color-dot md-dot" style="background:${hex(x.color)}" aria-hidden="true"></span>` : x.mark !== undefined ? `<span class="md-mark" aria-hidden="true">${esc(x.mark)}</span>` : x.icon ? icon(x.icon, "s") : "");
    const full = (x) => String(x.full || x.name || "");
    const qf = this.mdFold(q.trim());
    const hit = (x) => !qf || this.mdFold(full(x)).includes(qf);
    const add = o.add ? `<button type="button" class="btn primary small md-add" data-action="${esc(o.add.action)}" aria-label="${esc(o.add.label)}"${rail ? ` title="${esc(o.add.label)}"` : ""}>${icon("plus", "s")}<span class="md-add-t">${esc(o.add.label)}</span></button>` : "";
    const li = (x) => {
      const on = x === cur, long = rail || full(x).length > 38, ren = on && x.rename && x.rename.bind;
      // Geen data-action: de [data-action]-volgorde in de lijst blijft gelijk, ongeacht welk item gekozen is.
      const pen = ren ? `<button type="button" class="icon-btn md-ren-btn" data-md-ren="list" data-route="${esc(route)}" data-id="${esc(x.id)}" aria-label="${esc(`Naam van ${x.rename.what || "item"} ‘${x.rename.value || x.name}’ wijzigen`)}" title="Naam wijzigen (F2 of dubbelklik)">${icon("edit", "s")}</button>` : "";
      return `<li class="md-li${x.indent ? " ind" : ""}${ren ? " ren" : ""}" data-q="${esc(this.mdFold(full(x)))}"${search && !hit(x) ? " hidden" : ""}><button type="button" class="md-i${on ? " on" : ""}" data-action="md-pick" data-route="${esc(route)}" data-id="${esc(x.id)}" tabindex="${on ? 0 : -1}"${on ? ' aria-current="true"' : ""}${long ? ` title="${esc(full(x))}"` : ""}>${lead(x)}<span class="md-i-b"><span class="md-i-n">${esc(x.name)}</span>${x.meta ? `<span class="md-i-m">${esc(x.meta)}</span>` : ""}</span>${x.flag ? `<span class="md-i-f">${x.flag}</span>` : ""}</button>${pen}</li>`;
    };
    const sel = `<select class="select md-sel" data-action="md-pick" data-route="${esc(route)}" aria-label="${esc(title)} kiezen">${items.map((x) => `<option value="${esc(x.id)}"${x === cur ? " selected" : ""}>${x.indent ? "\u00a0\u00a0↳ " : ""}${x.mark !== undefined ? `${esc(x.mark)}. ` : ""}${esc(x.name)}</option>`).join("")}</select>`;
    const side = `<nav class="md-side" aria-label="${esc(title)}">
        <div class="md-h"><h2 class="md-t"><span class="md-t-x">${esc(title)}</span> <span class="md-n" aria-label="${items.length} items">${items.length}</span></h2>
          <button type="button" class="icon-btn md-rail-btn" data-action="md-rail" aria-expanded="${!rail}" aria-label="${rail ? "Lijst uitklappen" : "Lijst inklappen"}" title="${rail ? "Lijst uitklappen" : "Lijst inklappen"}">${icon(rail ? "chevronright" : "chevronleft", "s")}</button></div>
        ${add}
        ${search ? `<input type="search" class="input md-q" data-md-q="${esc(route)}" value="${esc(q)}" placeholder="Zoeken…" aria-label="Zoeken in ${esc(title)}" autocomplete="off">` : ""}
        ${sel}
        <ul class="md-list" role="list">${items.map(li).join("")}</ul>
        <p class="md-none xs"${search && qf && !items.some(hit) ? "" : " hidden"}>Geen treffers.</p>
      </nav>`;
    return `<div class="md${rail ? " rail" : ""}" data-md="${esc(route)}"><div class="md-g">${side}<div class="md-detail">${detail}</div></div></div>`;
  },
  mdFold(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); },
  /** Kop boven het detail: kleurbolletje, volledige naam en (optioneel) korte context. o.rename: { route, id, what } → hernoemknop (rail/smal). */
  mdHead(name, o = {}) {
    const hex = /^#[0-9a-f]{3,8}$/i.test(String(o.color || "")) ? o.color : "";
    return `<div class="md-dh">${hex ? `<span class="color-dot md-dot" style="background:${hex}" aria-hidden="true"></span>` : ""}${this.mdTitle(name, o.rename)}${o.meta ? `<span class="md-dh-m">${esc(o.meta)}</span>` : ""}${o.aside ? `<span class="md-dh-a">${o.aside}</span>` : ""}</div>`;
  },
  /** Naam als koptekst; met rename een potlood dat alleen zichtbaar is als de lijst is ingeklapt of een keuzelijst is. */
  mdTitle(name, r) {
    if (!r || !r.route || !r.id) return `<h2 class="md-dh-t">${esc(name)}</h2>`;
    return `<h2 class="md-dh-t" data-ren-route="${esc(r.route)}" data-ren-id="${esc(r.id)}">${esc(name)}</h2><button type="button" class="icon-btn md-dh-ren" id="md-dh-ren" data-md-ren="head" data-route="${esc(r.route)}" data-id="${esc(r.id)}" aria-label="${esc(`Naam van ${r.what || "item"} ‘${name}’ wijzigen`)}" title="Naam wijzigen (F2)">${icon("edit", "s")}</button>`;
  },
  /** Schermlezer-melding (beleefd). */
  mdSay(text) {
    let n = document.getElementById("md-live");
    if (!n) { n = document.createElement("div"); n.id = "md-live"; n.className = "sr-only"; n.setAttribute("role", "status"); n.setAttribute("aria-live", "polite"); document.body.appendChild(n); }
    n.textContent = "";
    setTimeout(() => { n.textContent = String(text || ""); }, 40);
  },
  /** Inline hernoemen: tekstveld op de plek van de naam (lijstitem of kop). Enter/blur = opslaan, Esc = annuleren. */
  mdRename(route, id, from = "list") {
    const spec = VH._mdRen && VH._mdRen[route] && VH._mdRen[route][id];
    const md = document.querySelector(`#main .md[data-md="${CSS.escape(String(route))}"]`);
    if (!spec || !md || md.querySelector(".md-ren-in")) return false;
    const item = md.querySelector(`.md-i[data-id="${CSS.escape(String(id))}"]`);
    const listOn = item && item.offsetParent !== null && !md.classList.contains("rail") && getComputedStyle(md.querySelector(".md-list")).display !== "none";
    let box, nameEl, back;
    if (from !== "head" && listOn) {
      box = item.parentElement; nameEl = item.querySelector(".md-i-n"); back = () => md.querySelector(`.md-i[data-id="${CSS.escape(String(id))}"]`);
    } else {
      nameEl = md.querySelector(`.md-dh-t[data-ren-id="${CSS.escape(String(id))}"]`);
      if (!nameEl) return false;
      box = nameEl.parentElement;
      back = () => { const h = md.querySelector(".md-dh-ren"); return h && h.offsetParent !== null ? h : md.querySelector(".md-sel:not([hidden])") || h; };
    }
    if (!nameEl || !box) return false;
    const cs = getComputedStyle(nameEl), br = box.getBoundingClientRect(), nr = nameEl.getBoundingClientRect();
    const inp = document.createElement("input");
    inp.type = "text"; inp.className = "input md-ren-in"; inp.value = spec.value; inp.maxLength = spec.max;
    inp.autocomplete = "off"; inp.spellcheck = false;
    inp.setAttribute("aria-label", `Naam van ${spec.what} ‘${spec.value}’ wijzigen`);
    inp.setAttribute("aria-describedby", "md-ren-help");
    inp.style.font = cs.font; inp.style.lineHeight = cs.lineHeight; inp.style.letterSpacing = cs.letterSpacing;
    const lh = parseFloat(cs.lineHeight) || nr.height;
    inp.style.left = `${Math.max(0, nr.left - br.left - 7)}px`;
    inp.style.top = `${Math.max(0, nr.top - br.top - 2)}px`;
    inp.style.height = `${Math.round(lh + 6)}px`;
    inp.style.width = from !== "head" && listOn ? `${Math.max(80, br.right - nr.left + 1)}px` : `${Math.min(br.width - Math.max(0, nr.left - br.left - 7), Math.max(nr.width + 64, 288))}px`;
    const help = document.createElement("span");
    help.id = "md-ren-help"; help.className = "sr-only"; help.textContent = "Enter om op te slaan, Escape om te annuleren.";
    box.classList.add("md-ren-on");
    box.append(inp, help);
    inp.focus({ preventScroll: true });
    inp.select();
    let done = false;
    const end = (save, refocus) => {
      if (done) return;
      done = true;
      const v = inp.value.replace(/\s+/g, " ").trim().slice(0, spec.max);
      inp.remove(); help.remove();
      box.classList.remove("md-ren-on");
      if (refocus) { const b = back(); if (b) b.focus({ preventScroll: true }); }
      if (!save || v === spec.value) { if (!save) VH.mdSay("Naam niet gewijzigd."); return; }
      if (!v) { VH.mdRenMsg(box, "Naam mag niet leeg zijn. De oude naam blijft staan."); return; }
      Store.update((st) => {
        const r = resolveBind(spec.bind, st);
        if (r.obj) setPath(r.obj, r.path, spec.dflt !== undefined && v === spec.dflt ? "" : v);
      });
      VH.mdSay(`Naam gewijzigd in ${v}.`);
    };
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); end(true, true); }
      else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); end(false, true); }
      else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown", "F2", " "].includes(e.key)) e.stopPropagation();
    });
    ["click", "dblclick", "pointerdown", "mousedown"].forEach((t) => inp.addEventListener(t, (e) => e.stopPropagation()));
    inp.addEventListener("blur", () => end(true, false));
    return true;
  },
  /** Korte melding onder de naam (bijv. lege naam), ook voor schermlezers. */
  mdRenMsg(box, text) {
    box.querySelectorAll(".md-ren-msg").forEach((x) => x.remove());
    const m = document.createElement("span");
    m.className = "md-ren-msg"; m.textContent = text;
    box.appendChild(m);
    VH.mdSay(text);
    setTimeout(() => m.remove(), 3500);
  },
});
/* Potlood in de lijst of de kop (bewust zonder data-action). */
document.addEventListener("click", (e) => {
  const b = e.target && e.target.closest && e.target.closest("#main [data-md-ren]");
  if (!b) return;
  e.preventDefault();
  VH.mdRename(b.dataset.route, b.dataset.id, b.dataset.mdRen === "head" ? "head" : "list");
});
/** Hernoemen starten op een (nog niet geselecteerd) item: eerst kiezen, dan het veld openen. */
function _mdRenStart(route, id, from) {
  if (!route || !id || route !== UI.route) return;
  const md = document.querySelector(`#main .md[data-md="${CSS.escape(route)}"]`);
  const it = md && md.querySelector(`.md-i[data-id="${CSS.escape(id)}"]`);
  if (it && !it.classList.contains("on")) Actions["md-pick"](it);
  VH.mdRename(route, id, from);
}
/* F2 op een lijstitem, de keuzelijst of de kop hernoemt; dubbelklik op de naam ook. */
document.addEventListener("keydown", (e) => {
  if (e.key !== "F2" || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  const t = e.target, md = t && t.closest && t.closest("#main .md[data-md]");
  if (!md) return;
  const route = md.dataset.md;
  let id = null, from = "list";
  if (t.matches(".md-i, .md-ren-btn")) id = t.dataset.id;
  else if (t.matches(".md-sel")) { id = t.value; from = "head"; }
  else if (t.matches(".md-dh-ren")) { id = t.dataset.id; from = "head"; }
  else { const c = md.querySelector(".md-i.on"); id = c && c.dataset.id; }
  if (!id || !(VH._mdRen && VH._mdRen[route] && VH._mdRen[route][id])) return;
  e.preventDefault();
  _mdRenStart(route, id, from);
});
/* Dubbelklik op een lijstitem: de eerste klik kiest (re-render), dus tellen via click.detail in de capture-fase. */
document.addEventListener("click", (e) => {
  if (!e.detail || e.detail < 2 || e.button !== 0) return;
  const t = e.target, it = t && t.closest && t.closest("#main .md[data-md] .md-i[data-id]");
  if (!it) return;
  const route = it.closest(".md[data-md]").dataset.md;
  if (!(VH._mdRen && VH._mdRen[route] && VH._mdRen[route][it.dataset.id])) return;
  e.preventDefault(); e.stopPropagation();
  _mdRenStart(route, it.dataset.id, "list");
}, true);
document.addEventListener("dblclick", (e) => {
  const t = e.target, md = t && t.closest && t.closest("#main .md[data-md]");
  if (!md || (t.closest && t.closest(".md-ren-in"))) return;
  const route = md.dataset.md;
  const h = t.closest(".md-dh-t[data-ren-id]"), hb = md.querySelector(".md-dh-ren");
  if (h && hb && hb.offsetParent !== null) { e.preventDefault(); VH.mdRename(route, h.dataset.renId, "head"); }
});
Actions["md-pick"] = (el) => {
  const route = el.dataset.route, id = el.tagName === "SELECT" ? el.value : el.dataset.id;
  if (!route || !id || !Object.hasOwn(Views, route) || route !== UI.route) return;
  const fromList = el.classList && el.classList.contains("md-i");
  UI.sub[route] = id;
  App.render();
  const md = document.querySelector(`#main .md[data-md="${CSS.escape(route)}"]`);
  if (!md) return;
  const t = fromList ? md.querySelector(`.md-i[data-id="${CSS.escape(id)}"]`) : md.querySelector(".md-sel");
  if (t) t.focus({ preventScroll: true });
  const m = document.getElementById("main");
  if (m && md.getBoundingClientRect().top < m.getBoundingClientRect().top) md.scrollIntoView({ block: "start" });
};
Actions["md-rail"] = () => {
  UI.mdRail = !UI.mdRail;
  App.render();
  const b = document.querySelector("#main .md-rail-btn");
  if (b) b.focus({ preventScroll: true });
};
/* Pijltjes/Home/End verplaatsen de focus in de lijst; Enter of spatie kiest (native knop). */
document.addEventListener("keydown", (e) => {
  const b = e.target && e.target.closest && e.target.closest(".md-i, .md-q");
  if (!b || e.altKey || e.ctrlKey || e.metaKey) return;
  const list = b.closest(".md-side") && b.closest(".md-side").querySelector(".md-list");
  if (!list) return;
  const vis = [...list.querySelectorAll(".md-li:not([hidden]) > .md-i")];
  if (!vis.length) return;
  let n = null;
  if (b.classList.contains("md-q")) {
    if (e.key === "ArrowDown") n = vis.find((x) => x.classList.contains("on")) || vis[0];
    else if (e.key === "Escape" && b.value) { b.value = ""; b.dispatchEvent(new Event("input", { bubbles: true })); e.preventDefault(); }
  } else {
    const i = vis.indexOf(b);
    if (e.key === "ArrowDown") n = vis[Math.min(vis.length - 1, i + 1)];
    else if (e.key === "ArrowUp") n = vis[Math.max(0, i - 1)];
    else if (e.key === "Home") n = vis[0];
    else if (e.key === "End") n = vis[vis.length - 1];
  }
  if (!n) return;
  e.preventDefault();
  list.querySelectorAll(".md-i").forEach((x) => { x.tabIndex = x === n ? 0 : -1; });
  n.focus();
});
/* Zoeken filtert zonder volledige render, zodat de focus in het zoekveld blijft. */
document.addEventListener("input", (e) => {
  const q = e.target;
  if (!q || !q.matches || !q.matches(".md-q")) return;
  const route = q.dataset.mdQ;
  UI.mdQ = UI.mdQ || {};
  UI.mdQ[route] = q.value.slice(0, 80);
  const side = q.closest(".md-side"), f = VH.mdFold(q.value.trim());
  if (!side) return;
  let any = false;
  side.querySelectorAll(".md-li").forEach((li) => { const v = !f || String(li.dataset.q || "").includes(f); li.hidden = !v; if (v) any = true; });
  const none = side.querySelector(".md-none");
  if (none) none.hidden = any;
  const vis = [...side.querySelectorAll(".md-li:not([hidden]) > .md-i")];
  if (vis.length && !vis.some((x) => x.tabIndex === 0)) { side.querySelectorAll(".md-i").forEach((x) => { x.tabIndex = -1; }); vis[0].tabIndex = 0; }
});

/* ---------- Ingeklapte navigatie en masterlijst (rail): item groeit bij hover/toetsenbordfocus uit tot een pill met icoon en naam ----------
   Eén vast gepositioneerd element buiten de scrollcontainers. Alleen kopieën van bestaande DOM-knopen en textContent (geen HTML-invoer).
   Het deel boven het item laat klikken door; de naam is aanwijsbaar (WCAG 1.4.13) en klikt door naar het item. Esc sluit. */
const RailTip = {
  el: null, item: null, kbd: false, timer: 0, raf: 0, warm: 0, quiet: null, _pk: "",
  find(n) {
    const it = n && n.closest ? n.closest(".nav-item, .md-i") : null;
    if (!it || it.offsetParent === null) return null;
    if (it.classList.contains("nav-item")) return it.closest(".app.nav-collapsed #sidenav") ? it : null;
    return it.closest(".md.rail .md-list") ? it : null;
  },
  copy(n) {
    if (!n) return null;
    const c = n.cloneNode(true);
    [c, ...c.querySelectorAll("[title], [id]")].forEach((x) => { x.removeAttribute("title"); x.removeAttribute("id"); });
    return c;
  },
  span(cls, text) { const s = document.createElement("span"); s.className = cls; if (text) s.textContent = text; return s; },
  build(it) {
    const nav = it.classList.contains("nav-item");
    const d = document.createElement("div");
    d.className = `rail-tip ${nav ? "rt-nav" : "rt-md"}${it.classList.contains("on") ? " on" : ""}${this.kbd ? " rt-kbd" : ""}`;
    d.setAttribute("aria-hidden", "true");
    const lead = this.span("rt-lead"), dot = this.span("rt-dot"), txt = this.span("rt-txt"), row = this.span("rt-row");
    let name = "", sub = "", glyph = null, extra = null;
    if (nav) {
      const t = it.querySelector(".nav-text");
      name = t ? [...t.childNodes].filter((x) => x.nodeType === 3).map((x) => x.textContent).join("").trim() : "";
      const sr = t && t.querySelector(".sr-only");
      sub = sr ? sr.textContent.trim().replace(/^\(|\)$/g, "") : "";
      if (sub) sub = sub.charAt(0).toUpperCase() + sub.slice(1);
      const ic = it.querySelector(".nav-ico > svg");
      if (ic) dot.appendChild(this.copy(ic));
      glyph = this.copy(it.querySelector(".nav-st"));
      extra = this.copy(it.querySelector(".nb"));
    } else {
      const n = it.querySelector(".md-i-n"), m = it.querySelector(".md-i-m");
      name = n ? n.textContent.trim() : "";
      sub = m ? m.textContent.trim() : "";
      const li = it.closest(".md-li");
      if (!sub && li && li.classList.contains("ind")) {
        let p = li.previousElementSibling;
        while (p && p.classList.contains("ind")) p = p.previousElementSibling;
        const pn = p && p.querySelector(".md-i-n");
        if (pn) sub = `Sublabel van ${pn.textContent.trim()}`;
      }
      const k = it.querySelector(":scope > .md-dot, :scope > .md-mark, :scope > svg.ic");
      if (k) { dot.classList.add(k.classList.contains("md-dot") ? "rt-k-dot" : k.classList.contains("md-mark") ? "rt-k-mark" : "rt-k-ico"); dot.appendChild(this.copy(k)); }
      const f = it.querySelector(".md-i-f");
      extra = f && f.childElementCount ? this.copy(f) : null;
    }
    if (!name) name = it.dataset.rtTitle || it.getAttribute("title") || it.getAttribute("aria-label") || "";
    lead.appendChild(dot);
    row.appendChild(this.span("rt-name", name));
    if (extra) { extra.classList.add("rt-extra"); row.appendChild(extra); }
    txt.appendChild(row);
    if (sub || glyph) {
      const s = this.span("rt-sub");
      if (glyph) { glyph.classList.remove("nav-st"); s.appendChild(glyph); }
      if (sub) s.appendChild(this.span("", sub));
      txt.appendChild(s);
    }
    d.append(lead, txt);
    return d;
  },
  show(it, kbd) {
    clearTimeout(this.timer);
    if (it === this.item && this.el && this.kbd === kbd) return;
    this.hide();
    this.item = it; this.kbd = kbd;
    if (it.hasAttribute("title")) { it.dataset.rtTitle = it.getAttribute("title"); it.removeAttribute("title"); }
    it.classList.add("rt-hot");
    this.el = this.build(it);
    if (Date.now() < this.warm) this.el.classList.add("rt-warm");
    document.body.appendChild(this.el);
    this.place();
    const tick = () => { if (!this.el) return; if (!this.item.isConnected || this.find(this.item) !== this.item) { this.hide(); return; } this.place(); this.raf = requestAnimationFrame(tick); };
    this.raf = requestAnimationFrame(tick);
  },
  place() {
    const d = this.el, r = this.item.getBoundingClientRect(), padX = 4, padY = 5;
    const key = `${r.left}|${r.top}|${r.width}|${r.height}|${window.innerWidth}|${window.innerHeight}`;
    if (key === this._pk) return;
    this._pk = key;
    d.style.setProperty("--rt-lw", `${Math.round(r.width + padX)}px`);
    d.style.left = `${Math.round(r.left - padX)}px`;
    d.style.minHeight = `${Math.round(r.height + padY * 2)}px`;
    d.style.maxWidth = `${Math.max(220, Math.min(440, window.innerWidth - r.left - 16))}px`;
    const h = d.offsetHeight;
    d.style.top = `${Math.round(Math.max(4, Math.min(window.innerHeight - h - 4, r.top + r.height / 2 - h / 2)))}px`;
  },
  inTip(e) {
    if (!this.el) return false;
    const r = this.el.getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  },
  hide() {
    clearTimeout(this.timer);
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this.item) {
      const it = this.item;
      if (it.dataset.rtTitle !== undefined) { it.setAttribute("title", it.dataset.rtTitle); delete it.dataset.rtTitle; }
      it.classList.remove("rt-hot");
    }
    if (this.el) { this.el.remove(); this.warm = Date.now() + 450; }
    this.el = null; this.item = null; this.kbd = false; this._pk = "";
  },
  init() {
    document.addEventListener("pointerover", (e) => {
      if (e.pointerType === "touch" || e.buttons) return;
      if (this.el && this.el.contains(e.target)) { clearTimeout(this.timer); return; }
      if (this.quiet) { if (Math.hypot(e.clientX - this.quiet.x, e.clientY - this.quiet.y) < 6) return; this.quiet = null; }
      const it = this.find(e.target);
      clearTimeout(this.timer);
      if (!it) { if (this.el && !this.kbd && !this.inTip(e)) this.hide(); return; }
      if (it === this.item) return;
      const go = () => { if (it.isConnected && it.matches(":hover")) this.show(it, false); };
      if (Date.now() < this.warm || this.el) go();
      else this.timer = setTimeout(go, 90);
    });
    document.addEventListener("pointermove", (e) => {
      if (this.quiet && Math.hypot(e.clientX - this.quiet.x, e.clientY - this.quiet.y) >= 6) this.quiet = null;
      if (this.el && !this.kbd && e.pointerType !== "touch" && !this.inTip(e) && !this.item.matches(":hover")) this.hide();
    }, { passive: true });
    // Indrukken (ook slepen) buiten de naam: pill direct weg, zodat hij klikken en drag & drop nooit in de weg zit.
    document.addEventListener("pointerdown", (e) => { if (this.el && !this.el.contains(e.target)) { this.quiet = { x: e.clientX, y: e.clientY }; this.hide(); } }, true);
    document.addEventListener("click", (e) => {
      if (!e.isTrusted) return;
      const it = this.item, onTip = this.el && this.el.contains(e.target);
      this.quiet = { x: e.clientX, y: e.clientY };
      this.hide();
      if (onTip && it && it.isConnected) { e.preventDefault(); e.stopPropagation(); it.click(); }
    }, true);
    document.addEventListener("focusin", (e) => {
      const it = this.find(e.target);
      if (it && it.matches(":focus-visible")) this.show(it, true);
      else if (this.el && this.kbd) this.hide();
    });
    document.addEventListener("focusout", (e) => { if (this.el && this.kbd && e.target === this.item) this.hide(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && this.el) this.hide(); });
    document.addEventListener("wheel", (e) => { if (this.el && this.el.contains(e.target)) this.hide(); }, { passive: true });
    window.addEventListener("resize", () => { if (this.el) this.hide(); });
    window.addEventListener("blur", () => { if (this.el) this.hide(); });
  },
};
RailTip.init();

/* ---------- Spelregels in het facilitatorpaneel ---------- */
/**
 * Spelregels/limieten als uitklapper in het facilitatorpaneel. Gebruik in registerView:
 *   fac: { …, rules: facRules("Spelregels in Purview", () => CATALOG.labelLimits) }
 * title: kop van de uitklapper (platte tekst). items: array van strings of functie (st) → array (platte tekst, wordt ge-escaped).
 * opts: { key = "rules" (data-fac-acc-sleutel), intro: (st) → vertrouwde HTML boven de lijst, open: (st) → bool (standaard ingeklapt; open alleen bij iets urgents, bijv. een overschreden limiet) }.
 * fac.rules mag ook een array van facRules-objecten zijn.
 */
function facRules(title, items, opts = {}) {
  return { title: String(title || "Spelregels in Purview"), items, key: String(opts.key || "rules").replace(/[^\w-]/g, ""), intro: opts.intro, open: opts.open };
}
/** HTML voor fac.rules (één of meer facRules-objecten); wordt door App.renderPanel aangeroepen. */
function facRulesHtml(rules, st = S()) {
  const list = (Array.isArray(rules) ? rules : [rules]).filter((r) => r && typeof r === "object");
  return list.map((r) => {
    const val = (x) => { try { return typeof x === "function" ? x(st) : x; } catch (e) { return undefined; } };
    const items = (val(r.items) || []).filter((x) => typeof x === "string" && x);
    const intro = r.intro ? val(r.intro) || "" : "";
    if (!items.length && !intro) return "";
    const key = "fac-" + (r.key || "rules"), k = (typeof UI !== "undefined" ? UI.route : "") + "|" + key;
    const open = UI.facAcc && k in UI.facAcc ? !!UI.facAcc[k] : !!val(r.open);
    return `<details class="acc fac-ref fac-rules" data-fac-acc="${esc(key)}"${open ? " open" : ""}><summary><span class="fac-ico" aria-hidden="true">${icon("shield", "s")}</span><span class="fac-ref-t fac-rules-t">${esc(r.title)}</span>${items.length ? `<span class="badge neutral">${items.length}<span class="sr-only"> punten</span></span>` : ""}</summary><div class="acc-body">${intro}${items.length ? `<ul class="fac-list">${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}</div></details>`;
  }).join("");
}
