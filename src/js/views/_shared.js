/* Gedeelde view-helpers (VH): locaties, modi, regel- en policykaarten, labelkiezer, confetti */
const VH = {
  loc(k) { return CATALOG.dlpLocations.find((x) => x.key === k) || { key: k, name: k, short: k, icon: "info" }; },
  locIcons(keys) {
    return `<span class="loc-icons">${(keys || []).map((k) => { const l = this.loc(k); return `<span class="loc-icon" data-tip="${esc(l.name)}">${icon(l.icon, "s")}</span>`; }).join("")}</span>`;
  },
  modeName(key) { const m = CATALOG.dlpModes.find((x) => x.key === key); return m ? m.name : key; },
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
      if (!t || !b || !t.clientHeight) return;
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
window.addEventListener("resize", () => { const m = document.getElementById("main"); if (m) { VH.ovf(m); VH.clampFit(m); } });
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
