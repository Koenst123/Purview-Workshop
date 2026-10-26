/* UI-framework: views, acties, data-binding, formulierhelpers en componenten */
const Views = {};
const Actions = {};
const Hooks = {};
const ROUTES = [];
/** Registreer een view: {title, render()→html, after(main), fac:{duration,goal,questions,tips,pitfalls,links}, done(st)→bool} */
function registerView(route, def) { Views[route] = def; if (!ROUTES.includes(route)) ROUTES.push(route); }

/* ---------- Data-binding ---------- */
const BIND_SCOPES = { lbl: "labels", lp: "labelPolicies", sit: "sits", grp: "groups", cdlp: "customDlp", per: "personas", dec: "decisions", csc: "customScenarios" };
/** "lbl:<id>:cfg.marking.header.text" of "st:meta.customer" → {obj, path, scope, id} */
function resolveBind(spec, st = S()) {
  const i = spec.indexOf(":");
  const scope = spec.slice(0, i);
  if (scope === "st") return { obj: st, path: spec.slice(i + 1), scope };
  const rest = spec.slice(i + 1);
  const j = rest.indexOf(":");
  const id = rest.slice(0, j);
  const path = rest.slice(j + 1);
  const coll = BIND_SCOPES[scope];
  if (!coll) throw new Error("Onbekende bind-scope: " + scope);
  return { obj: byId(st[coll], id), path, scope, id };
}
function bindValue(spec) {
  try { const r = resolveBind(spec); return r.obj ? getPath(r.obj, r.path) : undefined; } catch (e) { console.warn(e); return undefined; }
}
function parseBindValue(el, raw) {
  const t = el.dataset.type;
  if (el.type === "checkbox") return t === "invert" ? !el.checked : el.checked;
  if (raw === undefined) raw = el.value;
  switch (t) {
    case "number": { if (raw === "" || raw === null) return ""; const n = Number(String(raw).replace(",", ".")); return isNaN(n) ? raw : n; }
    case "lines": return String(raw).split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
    case "csv": return String(raw).split(/[,;]/).map((x) => x.trim()).filter(Boolean);
    case "bool": return raw === true || raw === "true";
    case "invert": return !(raw === true || raw === "true");
    default: return raw;
  }
}
/** Markeer een handmatig aangepaste instelling op een label (afwijkend van de bordkeuze). */
function _markCustom(l, path) {
  const m = /^cfg\.(dlp\.)?([a-zA-Z]+)/.exec(path);
  if (!m) return;
  const dom = m[1] ? "dlp_" + m[2] : m[2];
  if (l.choices && l.choices[dom]) { l.custom = l.custom || {}; l.custom[dom] = true; }
}
/** Schrijf een waarde naar een binding-spec. */
function setBind(spec, value, opts = {}) {
  Store.update((st) => {
    const r = resolveBind(spec, st);
    if (!r.obj) return;
    setPath(r.obj, r.path, value);
    if (r.scope === "lbl") _markCustom(r.obj, r.path);
    if (opts.hook && Hooks[opts.hook]) Hooks[opts.hook](st, r, value);
  }, { silent: !!opts.silent, coalesce: opts.coalesce });
}
function applyBind(el, silent) {
  const spec = el.dataset.bind;
  if (!spec) return;
  if (el.type === "radio" && !el.checked) return;
  const v = parseBindValue(el);
  const invalid = (el.dataset.max && typeof v === "string" && v.length > Number(el.dataset.max)) || (el.validity && !el.validity.valid);
  el.classList.toggle("invalid", !!invalid);
  el.setAttribute("aria-invalid", invalid ? "true" : "false");
  let error = el.parentElement.querySelector("[data-field-error]");
  if (invalid && !error) {
    error = document.createElement("div"); error.className = "hint field-error"; error.dataset.fieldError = "1"; error.id = uid("error");
    error.setAttribute("role", "status"); el.insertAdjacentElement("afterend", error);
    el.setAttribute("aria-describedby", [el.getAttribute("aria-describedby"), error.id].filter(Boolean).join(" "));
  }
  if (error) { error.textContent = invalid ? (el.validationMessage || "Controleer de lengte van deze waarde.") : ""; }
  setBind(spec, v, { silent, coalesce: spec, hook: el.dataset.onchange });
}
/** Re-render na typen in een data-render-veld: gedebounced (~250 ms) zodat een toetsaanslag snel blijft. */
const _renderSoon = debounce(() => Bus.emit("change", {}), 250);
let _silentDirty = false;
function initBindings() {
  document.addEventListener("input", (e) => {
    const el = e.target;
    if (el.dataset && el.dataset.live && Actions[el.dataset.live]) { Actions[el.dataset.live](el, e); }
    if (!el.dataset || !el.dataset.bind) return;
    if (el.type === "checkbox" || el.type === "radio" || el.tagName === "SELECT") return;
    const rev = Store.rev;
    applyBind(el, true);
    if (Store.rev !== rev) { _silentDirty = true; if (el.dataset.render) _renderSoon(); }
  });
  document.addEventListener("change", (e) => {
    const el = e.target;
    // <select data-action="x" data-on="change"> (ook input/checkbox): actie bij wijzigen i.p.v. bij klikken.
    if (el.dataset && el.dataset.action && (el.dataset.on === "change" || el.tagName === "SELECT")) { _runAction(el, e); return; }
    if (!el.dataset || !el.dataset.bind) return;
    const rev = Store.rev;
    applyBind(el, false);
    if (Store.rev !== rev) { _silentDirty = false; _renderSoon.cancel(); return; }
    // Tekstveld stil gebonden tijdens typen → één render na het verlaten (focus is dan al verplaatst).
    if (_silentDirty || _renderSoon.pending()) { _silentDirty = false; _renderSoon.cancel(); setTimeout(() => Bus.emit("change", {}), 0); }
  });
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    if (el.tagName === "SELECT" || el.dataset.on === "change") return; // via het change-event
    if (el.tagName !== "INPUT") e.preventDefault();
    _runAction(el, e);
  });
  // Toetsenbord: Enter/spatie op een niet-native [data-action]-element (div/tr/span) = klikken.
  document.addEventListener("keydown", (e) => {
    if ((e.key !== "Enter" && e.key !== " ") || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    const el = e.target;
    if (!el || !el.dataset || !el.dataset.action || el.isContentEditable || A11Y_NATIVE.test(el.tagName)) return;
    if (typeof DnD !== "undefined" && DnD.pick && el.matches("[data-drop]")) return; // plaatsen gaat via DnD
    if (e.key === " " && el.matches("[data-drag]")) return; // spatie = oppakken (DnD)
    e.preventDefault();
    el.click();
  });
}
function _runAction(el, e) {
  const name = el.dataset.action;
  const fn = Object.hasOwn(Actions, name) ? Actions[name] : null;
  if (!fn) { console.warn("Onbekende actie:", name); return; }
  try { fn(el, e); } catch (err) { console.error(err); Toast.show("Er ging iets mis: " + esc(err.message), "err"); }
}
const A11Y_NATIVE = /^(BUTTON|A|INPUT|SELECT|TEXTAREA|SUMMARY|OPTION|LABEL)$/;
/** Maakt niet-native klikbare elementen ([data-action]) bereikbaar met Tab en herkenbaar als knop. */
function a11yEnhance(root = document) {
  $$(".field", root).forEach((field) => {
    const hint = field.querySelector(":scope > .hint"), input = field.querySelector(":scope > input, :scope > select, :scope > textarea");
    if (!hint || !input) return;
    if (!hint.id) hint.id = uid("hint");
    const ids = new Set((input.getAttribute("aria-describedby") || "").split(" ").filter(Boolean));
    ids.add(hint.id); input.setAttribute("aria-describedby", [...ids].join(" "));
  });
  $$(".table-wrap, .scroll-x, .board-wrap", root).forEach((el) => {
    el.tabIndex = 0;
    if (!el.hasAttribute("aria-label")) el.setAttribute("aria-label", "Breed overzicht; horizontaal scrollen mogelijk");
  });
  $$("[data-action]", root).forEach((el) => {
    if (A11Y_NATIVE.test(el.tagName) || /backdrop/.test(el.className || "")) return;
    if (el.hasAttribute("tabindex") && !el.dataset.dndTi) return;
    delete el.dataset.dndTi;
    el.setAttribute("tabindex", "0");
    if (!el.hasAttribute("role") && !/^(TD|TH|TR|LI)$/.test(el.tagName)) el.setAttribute("role", "button");
  });
}
/** Focus binnen een dialoog houden (Tab/Shift+Tab rond laten lopen). */
function _focusables(c) {
  return $$('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])', c)
    .filter((x) => x.offsetParent !== null || x === document.activeElement);
}
function _trapTab(e, c) {
  if (e.key !== "Tab" || !c) return;
  const f = _focusables(c);
  if (!f.length) { e.preventDefault(); c.focus(); return; }
  const first = f[0], last = f[f.length - 1], a = document.activeElement;
  if (e.shiftKey && (a === first || !c.contains(a))) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && (a === last || !c.contains(a))) { e.preventDefault(); first.focus(); }
}
/** Onthoudt het element dat een dialoog opende; na een re-render wordt het via data-attributen teruggevonden. */
const _FOCUS_KEYS = ["action", "id", "label", "dom", "route", "sub", "key", "kind", "sit", "i", "row", "lv", "loc", "choice", "spec", "value"];
function _rememberFocus() {
  const el = document.activeElement;
  if (!el || el === document.body) return null;
  let sel = null;
  if (el.id && !/^f-/.test(el.id)) sel = "#" + CSS.escape(el.id);
  else if (el.dataset && el.dataset.action) sel = _FOCUS_KEYS.filter((k) => el.dataset[k] !== undefined).map((k) => `[data-${k}="${CSS.escape(el.dataset[k])}"]`).join("");
  else if (el.dataset && el.dataset.bind) sel = `[data-bind="${CSS.escape(el.dataset.bind)}"]` + (el.type === "radio" ? `[value="${CSS.escape(el.value)}"]` : "");
  else if (el.dataset && el.dataset.live) sel = `[data-live="${CSS.escape(el.dataset.live)}"]`;
  const fk = el.closest && el.closest("[data-focus-key]");
  return { el, sel, fkey: fk ? fk.dataset.focusKey : null };
}
/** Zoek het equivalent van een onthouden focus-element in de (nieuwe) DOM; vangnet: [data-focus-key]. */
function _findFocus(r, root = document) {
  if (!r) return null;
  let n = null;
  if (r.sel) { try { n = root.querySelector(r.sel); } catch (e) { n = null; } }
  if (!n && r.fkey) {
    try {
      const c = root.querySelector(`[data-focus-key="${CSS.escape(r.fkey)}"]`);
      if (c) n = c.matches("button, a[href], input, select, textarea, [tabindex]") ? c : _focusables(c)[0] || null;
    } catch (e) { n = null; }
  }
  return n;
}
function _restoreFocus(r) {
  if (!r) return;
  setTimeout(() => {
    let n = r.el && r.el.isConnected ? r.el : null;
    if (!n) n = _findFocus(r);
    if (!n) n = $("#main");
    if (n) n.focus({ preventScroll: !!(r.el && !r.el.isConnected) });
  }, 0);
}

/* ---------- Formulierhelpers ---------- */
function _fid() { return uid("f"); }
function _lbl(label, id, o = {}) {
  if (!label && !o.badge) return "";
  return `<label for="${id}">${label || ""}${o.badge ? " " + o.badge : ""}</label>`;
}
function _hint(o) { return o.hint ? `<div class="hint">${o.hint}</div>` : ""; }
const F = {
  text(spec, label, o = {}) {
    const id = _fid(); const v = bindValue(spec);
    const max = ` maxlength="${o.maxlength || STATE_CAPS.str}" data-max="${o.maxlength || STATE_CAPS.str}"`;
    return `<div class="field ${o.cls || ""}">${_lbl(label, id, o)}<input id="${id}" class="input${o.mono ? " mono" : ""}" type="text" data-bind="${esc(spec)}" value="${esc(v === undefined || v === null ? "" : Array.isArray(v) ? v.join(", ") : v)}"${o.ph ? ` placeholder="${esc(o.ph)}"` : ""}${max}${o.list ? ` list="${o.list}"` : ""}${o.type ? ` data-type="${o.type}"` : ""}${o.render ? ' data-render="1"' : ""}${o.onchange ? ` data-onchange="${o.onchange}"` : ""}>${_hint(o)}</div>`;
  },
  textarea(spec, label, o = {}) {
    const id = _fid(); let v = bindValue(spec);
    if (Array.isArray(v)) v = v.join(o.type === "csv" ? ", " : "\n");
    const max = ` maxlength="${o.maxlength || STATE_CAPS.str}" data-max="${o.maxlength || STATE_CAPS.str}"`;
    return `<div class="field ${o.cls || ""}">${_lbl(label, id, o)}<textarea id="${id}" class="textarea${o.mono ? " mono" : ""}" rows="${o.rows || 3}" data-bind="${esc(spec)}"${o.type ? ` data-type="${o.type}"` : ""}${o.ph ? ` placeholder="${esc(o.ph)}"` : ""}${max}${o.render ? ' data-render="1"' : ""}>${esc(v === undefined || v === null ? "" : v)}</textarea>${_hint(o)}</div>`;
  },
  number(spec, label, o = {}) {
    const id = _fid(); const raw = bindValue(spec); const v = raw === "" || raw == null || !Number.isFinite(Number(raw)) ? "" : Number(raw);
    const lim = `${o.min !== undefined ? ` min="${o.min}"` : ""}${o.max !== undefined ? ` max="${o.max}"` : ""}${o.step ? ` step="${o.step}"` : ""}`;
    return `<div class="field${o.inline ? " inline" : ""} ${o.cls || ""}">${_lbl(label, id, o)}<input id="${id}" class="input${o.inline ? " inline" : ""}" type="number" data-type="number" data-bind="${esc(spec)}" value="${esc(v === undefined || v === null ? "" : v)}"${lim}${o.render ? ' data-render="1"' : ""}>${_hint(o)}</div>`;
  },
  select(spec, label, options, o = {}) {
    const id = _fid(); const v = bindValue(spec);
    const opts = (options || []).map((x) => {
      const [val, txt] = Array.isArray(x) ? x : [x, x];
      return `<option value="${esc(val)}"${String(val) === String(v === undefined || v === null ? "" : v) ? " selected" : ""}>${esc(txt)}</option>`;
    }).join("");
    return `<div class="field ${o.cls || ""}">${_lbl(label, id, o)}<select id="${id}" class="select" data-bind="${esc(spec)}"${o.type ? ` data-type="${o.type}"` : ""}${o.onchange ? ` data-onchange="${o.onchange}"` : ""}>${opts}</select>${_hint(o)}</div>`;
  },
  check(spec, label, o = {}) {
    let v = !!bindValue(spec); if (o.invert) v = !v;
    return `<label class="check ${o.cls || ""}${o.disabled ? " disabled" : ""}"><input type="checkbox" data-bind="${esc(spec)}"${o.invert ? ' data-type="invert"' : ""}${v ? " checked" : ""}${o.disabled ? " disabled" : ""}${o.onchange ? ` data-onchange="${o.onchange}"` : ""}><span>${label}${o.badge ? " " + o.badge : ""}${o.desc ? `<span class="c-desc">${o.desc}</span>` : ""}</span></label>`;
  },
  toggle(spec, label, o = {}) {
    let v = !!bindValue(spec); if (o.invert) v = !v;
    return `<label class="switch ${o.cls || ""}"><input type="checkbox" data-bind="${esc(spec)}"${o.invert ? ' data-type="invert"' : ""}${v ? " checked" : ""}${o.onchange ? ` data-onchange="${o.onchange}"` : ""}><span class="track"></span><span class="s-text"><span>${label}${o.badge ? " " + o.badge : ""}</span>${o.desc ? `<span class="s-desc">${o.desc}</span>` : ""}</span></label>`;
  },
  radios(spec, label, options, o = {}) {
    const v = bindValue(spec); const name = _fid();
    const items = options.map(([val, txt, desc, badge]) => `<label class="radio${o.cards ? " radio-card" : ""}"><input type="radio" name="${name}" value="${esc(val)}" data-bind="${esc(spec)}"${o.type ? ` data-type="${o.type}"` : ""}${String(val) === String(v) ? " checked" : ""}${o.onchange ? ` data-onchange="${o.onchange}"` : ""}><span>${esc(txt)}${badge ? " " + badge : ""}${desc ? `<span class="c-desc">${desc}</span>` : ""}</span></label>`).join("");
    return `<div class="field ${o.cls || ""}">${label ? `<div class="field-label">${label}${o.badge ? " " + o.badge : ""}</div>` : ""}<div class="radio-list">${items}</div>${_hint(o)}</div>`;
  },
  color(spec, label, palette = CATALOG.labelColors) {
    const v = String(bindValue(spec) || "").toUpperCase();
    const sw = palette.map((c) => `<button type="button" class="swatch${c.toUpperCase() === v ? " on" : ""}" style="background:${c}" title="${c}" data-action="set-bind" data-spec="${esc(spec)}" data-value="${c}"></button>`).join("");
    return `<div class="field">${label ? `<div class="field-label">${label}</div>` : ""}<div class="swatches">${sw}<input type="color" data-bind="${esc(spec)}" value="${esc(v || "#0F6CBD")}" title="Eigen kleur"></div></div>`;
  },
};
Actions["set-bind"] = (el) => {
  let v = el.dataset.value;
  if (el.dataset.type) v = parseBindValue({ dataset: { type: el.dataset.type }, type: "" }, v);
  setBind(el.dataset.spec, v, { hook: el.dataset.onchange });
};

/* ---------- Kleine componenten ---------- */
function licBadge(key) {
  if (!key) return "";
  const keys = Array.isArray(key) ? key : [key];
  return keys.map((k) => { const l = CATALOG.licensing[k]; return l ? `<span class="badge lic" title="${esc(l.detail)}">${esc(l.short)}</span>` : ""; }).join(" ");
}
function previewBadge(t = "Preview") { return `<span class="badge preview" title="Functie is in preview; gedrag en naamgeving kunnen wijzigen.">${esc(t)}</span>`; }
function teamsPremiumBadge() { return licBadge("teamsPremium"); }
function learn(key, text) {
  const l = CATALOG.learn[key];
  if (!l) return "";
  return `<a class="learn-link" href="${esc(l.url)}" target="_blank" rel="noopener" title="${esc(l.title)} – Microsoft Learn">${icon("book", "s")}${esc(text || l.title)}</a>`;
}
function infoTip(text) { return `<span class="info-tip" data-tip="${esc(text)}" tabindex="0" role="button" aria-label="${esc("Meer informatie: " + text)}">${icon("info", "s")}</span>`; }
function msg(kind, html, ic) {
  const icons = { info: "info", ok: "checkcircle", warn: "warning", err: "xcircle" };
  return `<div class="msg ${kind}">${icon(ic || icons[kind] || "info")}<div class="msg-body">${html}</div></div>`;
}
/** Paginakop. Eyebrow = NAV-groep van de huidige route (eyebrow-parameter is fallback); lead = 1 korte zin; more = optionele extra uitleg (inklapbaar). */
function pageHead(eyebrow, title, lead, actions = "", more = "") {
  const g = typeof NAV !== "undefined" && typeof UI !== "undefined" ? (NAV.find((x) => x.routes.includes(UI.route)) || {}).group : "";
  const eb = g || eyebrow;
  const mo = more ? `<details class="ph-more" data-acc="ph-${typeof UI !== "undefined" ? UI.route : ""}"${typeof Prefs !== "undefined" && Prefs.v && Prefs.v.explainOpen ? " open" : ""}><summary>Meer uitleg</summary><div class="ph-more-body">${more}</div></details>` : "";
  const rb = reviewedButton();
  const acts = actions || rb ? `<div class="page-actions">${rb}${actions}</div>` : "";
  // Huisstijl: Microsoft-producticoon naast de titel en productnaam in de eyebrow (alleen als productaanduiding).
  const pr = typeof BRAND_PRODUCT !== "undefined" && typeof UI !== "undefined" ? BRAND_PRODUCT[UI.route] : null;
  const pIco = pr ? brandImg(pr[0], "", "ph-prod", ' aria-hidden="true"') : "";
  const pTxt = pr ? `<span class="eb-prod">${esc(pr[1])}</span>` : "";
  const ar = typeof archLink === "function" && typeof UI !== "undefined" ? ARCH_FOR[UI.route] : null;
  const al = ar ? ` ${archLink(ar[0], "Waar past dit in het geheel?", ar[1])}` : "";
  return `<div class="page-head"><div class="ph-text">${eb || pTxt ? `<div class="eyebrow">${esc(eb || "")}${pTxt}</div>` : ""}<div class="ph-title">${pIco}<h1>${title}</h1></div>${lead ? `<p class="lead">${lead}${al}</p>` : ""}${mo}</div>${acts}</div>`;
}
/** Per pagina het bijbehorende blok (en eventueel rondleiding) in de Referentiearchitectuur. */
const ARCH_FOR = {
  schema: ["lab-taxonomy"], sits: ["cls-sit", "verschil"], board: ["lab-taxonomy", "bescherming"], labels: ["pro-encrypt"], policies: ["lab-policy"],
  autolabel: ["lab-service", "wanneer"], dlp: ["pro-dlp", "bescherming"], endpoint: ["src-devices"], copilot: ["pro-dlp-copilot", "copilot"], tenant: ["ins-audit"],
};
/** Facilitator-knop "Markeer als besproken ✓" / "Besproken ✓" voor de huidige stap (meta.reviewed[route]). */
function reviewedButton(route = typeof UI !== "undefined" ? UI.route : "") {
  if (typeof UI === "undefined" || !UI.facilitator || !route || typeof NAV_ROUTES === "undefined" || !NAV_ROUTES.includes(route) || !S()) return "";
  const on = !!(S().meta.reviewed || {})[route];
  return `<button type="button" class="btn sm${on ? " ok-btn" : " ghost"} ph-reviewed" data-action="toggle-reviewed" data-route="${esc(route)}" aria-pressed="${on}" title="${on ? "Deze stap is in de workshop besproken. Klik om terug te zetten." : "Alleen voor de facilitator: zet deze stap op groen in de navigatie zodra hij met de klant is besproken."}">${icon(on ? "checkcircle" : "check", "s")}${on ? "Besproken" : "Markeer als besproken"}</button>`;
}
Actions["toggle-reviewed"] = (el) => {
  const r = el.dataset.route;
  if (!r) return;
  Store.update((st) => { st.meta.reviewed = st.meta.reviewed || {}; if (st.meta.reviewed[r]) delete st.meta.reviewed[r]; else st.meta.reviewed[r] = true; });
};
/** Inklapbare sectie; open/dicht-stand blijft bewaard over re-renders via data-acc (stabiele sleutel per route). */
function accordion(key, summary, body, open = false) {
  return `<details class="acc" data-acc="${esc(key)}"${open ? " open" : ""}><summary>${summary}</summary><div class="acc-body">${body}</div></details>`;
}
function labelPill(l, st = S()) {
  if (!l) return `<span class="sensitivity-pill muted">${icon("tag", "s")} (geen label)</span>`;
  return `<span class="sensitivity-pill" title="${esc(labelFullName(l, st))}"><span class="color-dot" style="background:${esc(l.color)}"></span>${esc(labelFullName(l, st))}</span>`;
}
function emptyState(ic, title, text, action = "") {
  return `<div class="empty"><div class="e-ico">${icon(ic, "l")}</div><h3>${esc(title)}</h3><p>${text || ""}</p>${action}</div>`;
}
function levelChip(lv, text) {
  const L = CATALOG.levels[lv] || CATALOG.levels[0];
  return `<span class="choice lv-${esc(lv)}" style="display:inline-block;padding:1px 7px;cursor:default">${esc(text || L.name)}</span>`;
}
function sitKindTag(kind) {
  const k = CATALOG.sitKinds[kind];
  return k ? `<span class="kind-tag kind-${kind}" title="${esc(k.desc)}">${icon(k.icon, "s")}${esc(k.short)}</span>` : "";
}
function meter(pct, cls = "") { return `<div class="meter ${cls}"><i style="--v:${clamp(Math.round(pct), 0, 100)}%"></i></div>`; }
function ring(pct, label, cls = "", color) { return `<div class="ring ${cls}" style="--p:${clamp(Math.round(pct), 0, 100)}${color ? `;--c:${color}` : ""}"><span>${label !== undefined ? label : Math.round(pct) + "%"}</span></div>`; }
/** Tabbalk. tabs(route, items, cur, o?) – items = [[key, titel(html), badge(html)?, {disabled?, title?}?], …]; klik = Actions.go(route, sub=key).
    ARIA: role=tablist/tab, aria-selected, roving tabindex; pijltjes/Home/End verplaatsen de focus. o.label = aria-label van de tablist. */
function tabs(route, items, cur, o = {}) {
  return `<div class="tabs" role="tablist"${o.label ? ` aria-label="${esc(o.label)}"` : ""}>${items.map(([k, t, badge, x]) => {
    const on = k === cur, dis = x && x.disabled;
    return `<button type="button" class="tab${on ? " on" : ""}" role="tab" aria-selected="${on}" tabindex="${on ? 0 : -1}" data-action="go" data-route="${esc(route)}" data-sub="${esc(k)}"${dis ? " disabled" : ""}${x && x.title ? ` title="${esc(x.title)}"` : ""}>${t}${badge ? " " + badge : ""}</button>`;
  }).join("")}</div>`;
}
/** Pijltjestoetsen binnen elke [role=tablist] (ook tabbalken die views zelf opbouwen). */
document.addEventListener("keydown", (e) => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key) || e.ctrlKey || e.altKey || e.metaKey) return;
  const t = e.target, list = t && t.closest && t.closest('[role="tablist"]');
  if (!list || t.getAttribute("role") !== "tab") return;
  const all = $$('[role="tab"]:not([disabled])', list);
  const i = all.indexOf(t);
  const n = e.key === "Home" ? 0 : e.key === "End" ? all.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + all.length) % all.length;
  if (all[n]) { e.preventDefault(); all[n].focus(); }
});
UI.tabs = tabs;

/* ---------- Tooltip ---------- */
const Tip = {
  el: null,
  t: null,
  init() {
    document.addEventListener("mouseover", (e) => { const t = e.target.closest("[data-tip]"); if (t && t !== this.t) this.show(t); });
    document.addEventListener("mouseout", (e) => { const t = e.target.closest("[data-tip]"); if (t && !(e.relatedTarget && t.contains(e.relatedTarget)) && !this.pinned) this.hide(); });
    document.addEventListener("focusin", (e) => { const t = e.target.closest && e.target.closest("[data-tip]"); if (t) this.show(t); });
    document.addEventListener("focusout", () => { if (!this.pinned) this.hide(); });
    // Klik/tik (touch, beamer met afstandsbediening): tooltip vastzetten of sluiten. Alleen voor elementen zonder eigen actie.
    document.addEventListener("click", (e) => {
      const t = e.target.closest && e.target.closest("[data-tip]");
      if (!t || t.closest("[data-action], a[href], button, input, select, textarea, label")) { if (this.pinned) this.hide(); return; }
      if (this.pinned && this.t === t) { this.hide(); return; }
      this.show(t); this.pinned = true;
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && this.el) this.hide(); });
    window.addEventListener("scroll", () => { if (this.el) this.hide(); }, true);
  },
  show(t) {
    this.hide();
    const d = document.createElement("div");
    d.className = "tooltip"; d.textContent = t.dataset.tip; d.setAttribute("role", "tooltip");
    document.body.appendChild(d);
    const r = t.getBoundingClientRect(); const w = d.offsetWidth; const h = d.offsetHeight;
    let x = r.left + r.width / 2 - w / 2; let y = r.top - h - 6;
    if (y < 4) y = r.bottom + 6;
    d.style.left = clamp(x, 4, window.innerWidth - w - 4) + "px"; d.style.top = y + "px";
    this.el = d; this.t = t;
  },
  hide() { if (this.el) { this.el.remove(); this.el = null; } this.t = null; this.pinned = false; },
};

/* ---------- Toast ---------- */
const Toast = {
  max: 2,
  /** Toon een melding. kind: info|ok|warn|err (err/warn = role=alert). Dezelfde soort vervangt de vorige; max. 2 tegelijk zichtbaar. */
  show(html, kind = "info", ms = 3200) {
    const root = $("#toast-root"); if (!root) return;
    const ic = { info: "info", ok: "checkcircle", warn: "warning", err: "xcircle" }[kind] || "info";
    $$(".toast", root).forEach((x) => { if (x.dataset.kind === kind) x.remove(); });
    const live = $$(".toast", root);
    while (live.length >= this.max) live.shift().remove();
    const t = document.createElement("div");
    t.className = "toast " + kind; t.dataset.kind = kind;
    t.setAttribute("role", kind === "err" || kind === "warn" ? "alert" : "status");
    t.innerHTML = `${icon(ic)}<div>${html}</div>`;
    root.appendChild(t);
    setTimeout(() => { t.style.transition = "opacity .3s"; t.style.opacity = "0"; setTimeout(() => t.remove(), 320); }, ms);
  },
};

/* ---------- Modal ---------- */
const Modal = {
  cur: null,
  open(o) {
    const ret = this.cur ? this._ret : _rememberFocus();
    this.close(true);
    this._ret = ret;
    const root = $("#modal-root");
    const body = typeof o.body === "function" ? o.body() : o.body || "";
    const btns = (o.buttons || [{ label: "Sluiten", primary: true }]);
    root.innerHTML = `<div class="modal-backdrop" data-action="modal-close"></div><div class="modal${o.wide ? " wide" : ""}" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1"><div class="modal-head"><h2 id="modal-title">${o.title || ""}</h2><button class="icon-btn" data-action="modal-close" aria-label="Sluiten">${icon("x")}</button></div><div class="modal-body">${body}</div><div class="modal-foot">${btns.map((b, i) => `<button class="btn${b.primary ? " primary" : ""}${b.danger ? " danger" : ""}" data-action="modal-btn" data-i="${i}">${b.label}</button>`).join("")}</div></div>`;
    this.cur = o;
    const m = $(".modal", root);
    const f = o.focus ? $(o.focus, m) : $("input, textarea, select", m);
    setTimeout(() => { if (m.isConnected) (f || $(".btn.primary", m) || m).focus(); }, 20);
    m.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target.tagName === "INPUT") { e.preventDefault(); const pi = btns.findIndex((b) => b.primary); if (pi >= 0) this._btn(pi); }
    });
    this._key = (e) => {
      if (!this.cur) return;
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); this.close(); return; }
      _trapTab(e, m);
    };
    document.addEventListener("keydown", this._key, true);
    if (o.after) o.after(m);
    a11yEnhance(m);
    return m;
  },
  _btn(i) {
    const o = this.cur; if (!o) return;
    const b = (o.buttons || [])[i];
    const m = $("#modal-root .modal");
    const keep = b && b.fn ? b.fn(m) : false;
    if (keep !== true && this.cur === o) this.close();
  },
  close(silent) {
    const root = $("#modal-root"); if (root) root.innerHTML = "";
    const was = !!this.cur;
    this.cur = null;
    if (this._key) { document.removeEventListener("keydown", this._key, true); this._key = null; }
    if (!silent && was) { _restoreFocus(this._ret); this._ret = null; }
  },
};
Actions["modal-close"] = () => Modal.close();
Actions["modal-btn"] = (el) => Modal._btn(Number(el.dataset.i));

function confirmDialog(title, text, onYes, yesLabel = "Ja", danger = false) {
  Modal.open({ title: esc(title), body: `<p>${text}</p>`, buttons: [{ label: "Annuleren" }, { label: esc(yesLabel), primary: !danger, danger, fn: () => { onYes(); } }] });
}
function promptDialog(title, label, value, onOk, o = {}) {
  const input = o.multiline
    ? `<textarea class="textarea" id="pd-in" rows="${o.rows || 4}" placeholder="${esc(o.ph || "")}">${esc(value || "")}</textarea>`
    : `<input class="input" id="pd-in" value="${esc(value || "")}" placeholder="${esc(o.ph || "")}">`;
  Modal.open({
    title: esc(title),
    body: `<div class="field"><label for="pd-in">${esc(label)}</label>${input}${o.hint ? `<div class="hint">${o.hint}</div>` : ""}</div>`,
    focus: "#pd-in",
    buttons: [{ label: "Annuleren" }, { label: esc(o.okLabel || "OK"), primary: true, fn: (m) => { const v = $("#pd-in", m).value.trim(); if (!v && !o.allowEmpty) { $("#pd-in", m).classList.add("invalid"); return true; } onOk(v); } }],
  });
}

/* ---------- Drawer (zijpaneel voor detailbewerking) ---------- */
const Drawer = {
  cur: null,
  open(o) {
    if (!this.cur) this._ret = _rememberFocus();
    this.cur = o; this._fresh = true;
    this.render();
  },
  render() {
    const root = $("#drawer-root"); if (!root) return;
    const o = this.cur;
    if (!o) { root.innerHTML = ""; return; }
    const html = o.render();
    if (html === null || html === undefined) { this.close(); return; }
    const old = $(".drawer-body", root);
    const scroll = old ? old.scrollTop : 0;
    const act = document.activeElement;
    const inside = act && root.contains(act);
    const focusBind = inside && act.dataset && act.dataset.bind ? act.dataset.bind : null;
    const refocus = inside && !focusBind ? _rememberFocus() : null;
    const title = typeof o.title === "function" ? o.title() : o.title;
    root.innerHTML = `<div class="drawer-backdrop" data-action="drawer-close"></div><aside class="drawer${o.narrow ? " narrow" : ""}" role="dialog" aria-modal="true" aria-labelledby="drawer-title" tabindex="-1"><div class="drawer-head">${o.icon ? icon(o.icon, "l") : ""}<h2 id="drawer-title" tabindex="-1">${esc(title || "")}</h2>${o.headExtra ? o.headExtra() : ""}<button class="icon-btn" data-action="drawer-close" aria-label="Sluiten" title="Sluiten (Esc)">${icon("x")}</button></div><div class="drawer-body">${html}</div>${o.foot ? `<div class="drawer-foot">${o.foot()}</div>` : ""}</aside>`;
    const body = $(".drawer-body", root);
    body.scrollTop = scroll;
    const dr = $(".drawer", root);
    if (focusBind) { const f = root.querySelector(`[data-bind="${CSS.escape(focusBind)}"]`); if (f && f.type !== "radio") { f.focus(); if (f.setSelectionRange && /text|search/.test(f.type || "text") && f.tagName !== "SELECT") { try { const n = f.value.length; f.setSelectionRange(n, n); } catch { /* */ } } } }
    else if (refocus && refocus.sel) { let f = null; try { f = root.querySelector(refocus.sel); } catch (e) { /* */ } (f || $("#drawer-title", root)).focus({ preventScroll: true }); }
    else if (this._fresh) { const h = $("#drawer-title", root); if (h) h.focus({ preventScroll: true }); }
    this._fresh = false;
    if (!this._key) {
      this._key = (e) => { const d = $("#drawer-root .drawer"); if (d && this.cur && !$("#modal-root").innerHTML) _trapTab(e, d); };
      document.addEventListener("keydown", this._key);
    }
    if (o.after) o.after(dr);
    a11yEnhance(dr);
    DnD.refresh();
  },
  close() {
    const o = this.cur; this.cur = null;
    const root = $("#drawer-root"); if (root) root.innerHTML = "";
    if (this._key) { document.removeEventListener("keydown", this._key); this._key = null; }
    if (o && o.onClose) o.onClose();
    if (o) { _restoreFocus(this._ret); this._ret = null; }
  },
  isOpen() { return !!this.cur; },
};
Actions["drawer-close"] = () => Drawer.close();

/* ---------- Contextmenu ---------- */
const Menu = {
  /** Open een menu bij anchor. items: [{label, icon?, desc?, fn?, danger?, checked?}, "-"]. Pijltjes/Home/End/Esc; focus keert terug naar anchor. */
  open(anchor, items) {
    this.close(true);
    const m = document.createElement("div");
    m.className = "menu"; m.setAttribute("role", "menu");
    if (anchor && anchor.id) m.setAttribute("aria-labelledby", anchor.id);
    m.innerHTML = items.map((it, i) => it === "-" ? `<div class="menu-sep" role="separator"></div>` : `<button type="button" class="menu-item${it.danger ? " danger" : ""}" data-mi="${i}" role="${it.checked !== undefined ? "menuitemcheckbox" : "menuitem"}"${it.checked !== undefined ? ` aria-checked="${!!it.checked}"` : ""} tabindex="-1">${it.icon ? icon(it.icon) : ""}<span>${esc(it.label)}${it.desc ? `<span class="mi-desc">${esc(it.desc)}</span>` : ""}</span></button>`).join("");
    document.body.appendChild(m);
    const r = anchor.getBoundingClientRect();
    const w = m.offsetWidth; const h = m.offsetHeight;
    m.style.left = clamp(r.right - w, 4, window.innerWidth - w - 4) + "px";
    m.style.top = (r.bottom + h + 6 > window.innerHeight ? Math.max(4, r.top - h - 4) : r.bottom + 4) + "px";
    this.anchor = anchor;
    anchor.setAttribute("aria-haspopup", "menu"); anchor.setAttribute("aria-expanded", "true");
    m.addEventListener("click", (e) => { const b = e.target.closest("[data-mi]"); if (!b) return; e.stopPropagation(); const it = items[Number(b.dataset.mi)]; this.close(true); if (it.fn) it.fn(); else this._return(); });
    m.addEventListener("keydown", (e) => {
      const all = $$(".menu-item", m), i = all.indexOf(document.activeElement);
      let n = -1;
      if (e.key === "ArrowDown") n = (i + 1) % all.length;
      else if (e.key === "ArrowUp") n = (i - 1 + all.length) % all.length;
      else if (e.key === "Home") n = 0;
      else if (e.key === "End") n = all.length - 1;
      else if (e.key === "Tab") { this.close(); return; }
      if (n >= 0) { e.preventDefault(); all[n].focus(); }
    });
    setTimeout(() => {
      this._off = (e) => { if (!m.contains(e.target)) { const onAnchor = this.anchor && this.anchor.contains(e.target); this.close(true); if (onAnchor) { e.stopPropagation(); e.preventDefault(); } } };
      document.addEventListener("click", this._off, true);
      this._key = (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); this.close(); } };
      document.addEventListener("keydown", this._key, true);
    }, 0);
    this.el = m;
    const first = $(".menu-item", m); if (first) first.focus();
  },
  isOpen() { return !!this.el; },
  _return() { const a = this.anchor; this.anchor = null; if (a && a.isConnected) a.focus(); },
  /** Sluit het menu; zonder noFocus keert de focus terug naar de knop die het menu opende. */
  close(noFocus) {
    const was = !!this.el;
    if (this.el) { this.el.remove(); this.el = null; }
    if (this._off) { document.removeEventListener("click", this._off, true); this._off = null; }
    if (this._key) { document.removeEventListener("keydown", this._key, true); this._key = null; }
    if (this.anchor) this.anchor.setAttribute("aria-expanded", "false");
    if (was && !noFocus) this._return();
  },
};
