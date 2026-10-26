/* Kern: helpers, iconen, eventbus, store (undo/redo, autosave), UI-state, downloads */
const APP_VERSION = "1.0.0";
const SCHEMA_VERSION = 2;
const STORAGE_KEY = "pyd-ipdlp-designer-v1";

/* ---------- DOM & data helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
let _uidN = 0;
function uid(p = "id") {
  // Een vaste, niet-teruglopende teller voorkomt botsingen bij gelijke tijd/random.
  const n = (++_uidN).toString(36).padStart(11, "0");
  return `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}${n}`;
}
function clone(o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o), (k, v) => ["__proto__", "constructor", "prototype"].includes(k) ? undefined : v); }
function esc(s) {
  if (s === null || s === undefined) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
/** JSON veilig in een HTML-attribuut (gebruik met enkele of dubbele quotes). */
function attr(o) { return esc(JSON.stringify(o)); }
function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
function sum(arr, fn = (x) => x) { return arr.reduce((t, x) => t + (Number(fn(x)) || 0), 0); }
function byId(arr, id) { return (arr || []).find((x) => x && x.id === id) || null; }
function unique(arr) { return Array.from(new Set(arr)); }
function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function plural(n, one, many) { return `${n} ${n === 1 ? one : many}`; }
function deepEqual(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function getPath(o, path) {
  if (!path) return o;
  return String(path).split(".").reduce((x, k) => (x === null || x === undefined ? undefined : x[k]), o);
}
function setPath(o, path, v) {
  const ks = String(path).split(".");
  if (ks.some((k) => ["__proto__", "constructor", "prototype"].includes(k))) throw new Error("Ongeldig veldpad.");
  let x = o;
  for (let i = 0; i < ks.length - 1; i++) {
    if (x[ks[i]] === null || typeof x[ks[i]] !== "object") x[ks[i]] = /^\d+$/.test(ks[i + 1]) ? [] : {};
    x = x[ks[i]];
  }
  x[ks[ks.length - 1]] = v;
}
function isPlainObj(o) { return o !== null && typeof o === "object" && !Array.isArray(o); }
/** Nieuwe diepe merge: objecten recursief, arrays/primitives uit b vervangen a. */
function deepMerge(a, b) {
  if (!isPlainObj(a)) return clone(b === undefined ? a : b);
  const out = clone(a);
  if (!isPlainObj(b)) return out;
  Object.keys(b).forEach((k) => {
    if (b[k] === undefined || ["__proto__", "constructor", "prototype"].includes(k)) return;
    out[k] = isPlainObj(out[k]) && isPlainObj(b[k]) ? deepMerge(out[k], b[k]) : clone(b[k]);
  });
  return out;
}
function debounce(fn, ms) {
  let t = null, args = null;
  const run = () => { t = null; const a = args; args = null; fn(...a); };
  const d = (...a) => { args = a; clearTimeout(t); t = setTimeout(run, ms); };
  d.flush = () => { if (t !== null) { clearTimeout(t); run(); } };
  d.cancel = () => { clearTimeout(t); t = null; args = null; };
  d.pending = () => t !== null;
  return d;
}
function fmtDate(iso) { if (!iso) return ""; const d = new Date(iso); if (isNaN(d)) return String(iso); return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }); }
function fmtTime(sec) { const s = Math.max(0, Math.round(sec)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }

/* ---------- Iconen (Fluent-achtige line-icons, 24×24) ---------- */
const ICONS = {
  alert: '<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17h.01"/>',
  app: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  bank: '<path d="M3 9 12 4l9 5"/><path d="M5 10v7M9.5 10v7M14.5 10v7M19 10v7M3 20h18"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  blank: '',
  bluetooth: '<path d="m7 7 10 10-5 4V3l5 4L7 17"/>',
  board: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11M15 9v11"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z"/><path d="M4 19a2 2 0 0 1 2-2h13"/>',
  brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a2 2 0 0 0-3-1z"/><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1"/>',
  browser: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M6 6.5h.01M8.5 6.5h.01"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',
  chat: '<path d="M4 5h16v11H9l-5 4V5z"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  checkcircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  chevrondown: '<path d="m6 9 6 6 6-6"/>',
  chevronleft: '<path d="m15 6-6 6 6 6"/>',
  chevronright: '<path d="m9 6 6 6-6 6"/>',
  clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  cloud: '<path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9a4.5 4.5 0 0 0 1 9z"/>',
  code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  database: '<ellipse cx="12" cy="5.5" rx="7" ry="2.5"/><path d="M5 5.5v13c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-13M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5"/>',
  doc: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  edit: '<path d="m4 20 1-4L16 5l3 3L8 19l-4 1z"/><path d="m14 7 3 3"/>',
  excel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m8 9 5 6M13 9l-5 6M15 9h3M15 12h3M15 15h3"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  filter: '<path d="M4 5h16l-6 7v6l-4 2v-8L4 5z"/>',
  fingerprint: '<path d="M7 11a5 5 0 0 1 10 0c0 3-.5 5.5-1.5 8"/><path d="M12 11c0 3.5-.7 6.5-2.5 9M9.5 11a2.5 2.5 0 0 1 5 0c0 2-.3 3.8-.8 5.4M4.5 15c.4-1.3.5-2.6.5-4a7 7 0 0 1 12-4.9M19.5 9.5c.3 1.6.2 4-.3 6"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  flask: '<path d="M9 3h6M10 3v6L5 19a1.5 1.5 0 0 0 1.3 2h11.4a1.5 1.5 0 0 0 1.3-2L14 9V3"/><path d="M7.5 14h9"/>',
  folder: '<path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6z"/>',
  footer: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 16h16M8 18.5h8"/>',
  header: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 8h16M8 5.5h8"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9S14.5 18.5 12 21c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z"/>',
  gov: '<path d="M4 20h16M5 17h14M6 10v7M10 10v7M14 10v7M18 10v7M3 10h18L12 4 3 10z"/>',
  grid: '<path d="M4 4h16v16H4zM4 10h16M4 15h16M10 4v16M15 4v16"/>',
  grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
  heart: '<path d="M12 20s-7-4.4-9-9a4.8 4.8 0 0 1 9-3 4.8 4.8 0 0 1 9 3c-2 4.6-9 9-9 9z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M15 8l2 2"/>',
  laptop: '<rect x="5" y="5" width="14" height="10" rx="1.5"/><path d="M2 19h20l-2-4H4l-2 4z"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/>',
  link: '<path d="M10 14a4 4 0 0 0 6 .5l3-3a4 4 0 0 0-5.7-5.7l-1.5 1.5"/><path d="M14 10a4 4 0 0 0-6-.5l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  meeting: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  minus: '<path d="M5 12h14"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  more: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
  network: '<rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M6 16v-4h12v4"/>',
  open: '<path d="M3 7a1 1 0 0 1 1-1h5l2 2h8a1 1 0 0 1 1 1v2"/><path d="M3 7v11a1 1 0 0 0 1 1h14l3-8H6l-3 8"/>',
  panel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  pdf: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5"/><path d="M8.5 17v-4h1.5a1.2 1.2 0 0 1 0 2.4H8.5M13 13v4h1a2 2 0 0 0 0-4h-1z"/>',
  play: '<path d="M7 4v16l13-8L7 4z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  powerbi: '<rect x="4" y="11" width="4" height="9" rx="1"/><rect x="10" y="7" width="4" height="13" rx="1"/><rect x="16" y="3" width="4" height="17" rx="1"/>',
  printer: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
  projector: '<rect x="2" y="8" width="20" height="9" rx="2"/><circle cx="15" cy="12.5" r="2.5"/><path d="M6 17v2M18 17v2M5.5 12.5h4"/>',
  question: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5h.01"/>',
  rdp: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4M9 10h6M13 8l2 2-2 2"/>',
  redo: '<path d="M20 8h-9a6 6 0 0 0 0 12h3"/><path d="m16 4 4 4-4 4"/>',
  regex: '<path d="M17 3v8M13.5 5l7 4M13.5 9l7-4"/><rect x="4" y="15" width="5" height="5" rx="1"/>',
  route: '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H16a3 3 0 0 0 0-6H8a3 3 0 0 1 0-6h7.5"/>',
  save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.5-4.5"/>',
  server: '<rect x="4" y="3" width="16" height="7" rx="1.5"/><rect x="4" y="14" width="16" height="7" rx="1.5"/><path d="M8 6.5h.01M8 17.5h.01"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5"/>',
  shield: '<path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6l-8-3z"/>',
  shieldcheck: '<path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6l-8-3z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  site: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M7 13h4v4H7zM14 13h3M14 16h3"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9L12 3z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 14h18M9 9v11"/>',
  tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  teams: '<rect x="3" y="7" width="11" height="11" rx="2"/><path d="M6 10h5M8.5 10v6"/><circle cx="18" cy="6" r="2.2"/><path d="M15.5 10h5v5a2.5 2.5 0 0 1-5 0"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  trophy: '<path d="M8 4h8v6a4 4 0 0 1-8 0V4z"/><path d="M8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4M12 14v3M8 21h8M9 17h6v4H9z"/>',
  undo: '<path d="M4 8h9a6 6 0 0 1 0 12h-3"/><path d="M8 4 4 8l4 4"/>',
  unlock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 7.5-2M12 14v3"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  usb: '<path d="M12 3v15"/><circle cx="12" cy="19.5" r="1.5"/><path d="m12 13-4-3V7M12 11l4-2V6"/><rect x="6.5" y="4.5" width="3" height="2.5"/><circle cx="16" cy="5" r="1.2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0"/><path d="M15.5 4.5a3.5 3.5 0 0 1 0 7M18 13.5a7 7 0 0 1 4 6.5"/>',
  wand: '<path d="m4 20 11-11M14 4v3M17.5 6.5l2-2M17 10h3M12.5 2.5l1 1"/><path d="m13 7 4 4"/>',
  warning: '<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17h.01"/>',
  watermark: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="m7 17 10-10M9 17l8-8" opacity=".6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  xcircle: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
};
ICONS.header = '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 8h16M8 5.5h8"/>';
function icon(name, size) {
  const p = ICONS[name] !== undefined ? ICONS[name] : ICONS.info;
  return `<svg class="ic${size ? " " + size : ""}" viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
}

/* ---------- Event bus ---------- */
const Bus = {
  _h: {},
  on(ev, fn) { (this._h[ev] = this._h[ev] || []).push(fn); return () => this.off(ev, fn); },
  off(ev, fn) { this._h[ev] = (this._h[ev] || []).filter((f) => f !== fn); },
  emit(ev, data) { (this._h[ev] || []).slice().forEach((f) => { try { f(data); } catch (e) { console.error(e); } }); },
};

/* ---------- Store ---------- */
const Store = {
  state: null,
  past: [],
  future: [],
  max: 80,
  rev: 0,
  autosave: true,        // gezet vanuit Prefs.v.autosave
  _snap: null,           // JSON van de huidige state (cache: 1× stringify per update)
  _lastCoalesce: null,
  _lastAt: 0,
  storageStatus: "idle",
  lastSavedAt: "",
  recovery: null,
  setStorageStatus(status) { this.storageStatus = status; Bus.emit("storage", status); },
  storageText() {
    if (this.recovery) return "Opslag herstellen";
    if (!this.autosave) return "Autosave uit";
    const texts = { idle: "Nog niet bewaard", dirty: "Nog niet bewaard", saving: "Bewaren…", failed: "Bewaren mislukt", unavailable: "Opslag niet beschikbaar" };
    if (this.storageStatus !== "saved") return texts[this.storageStatus] || "Nog niet bewaard";
    const date = new Date(this.lastSavedAt);
    return !isNaN(date) ? `Bewaard ${date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}` : "Bewaard in deze browser";
  },
  queueSave() {
    this.setStorageStatus(this.autosave ? "dirty" : "disabled");
    this.saveLocal();
  },
  init(initial) {
    this.state = initial || this.loadLocal() || createEmptyState();
    this.past = []; this.future = []; this._snap = null;
    this.lastSavedAt = this.state.meta.savedAt || "";
    this.setStorageStatus(this.recovery ? "unavailable" : this.lastSavedAt ? "saved" : "idle");
    Bus.emit("change", { init: true });
  },
  /** Ruwe autosave (zonder normalisatie) – voor de opstartdialoog. */
  peekLocal() {
    try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  },
  loadLocal() {
    let raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!isPlainObj(parsed) || !Array.isArray(parsed.labels) || parsed.schemaVersion > SCHEMA_VERSION) throw new Error("Opgeslagen ontwerp vraagt om herstel.");
      return normalizeState(parsed);
    } catch (e) {
      this.recovery = { raw };
      console.warn("Opgeslagen ontwerp niet beschikbaar; herstel is nodig.");
      return null;
    }
  },
  clearLocal() {
    this.saveLocal.cancel();
    try {
      localStorage.removeItem(STORAGE_KEY);
      this.recovery = null; this.lastSavedAt = "";
      this.setStorageStatus("idle");
      return true;
    } catch (e) {
      this.setStorageStatus("unavailable");
      if (typeof Toast !== "undefined") Toast.show("Lokale gegevens konden niet worden gewist. Wis de sitegegevens via je browserinstellingen.", "err", 9000);
      return false;
    }
  },
  _snapshot() { return this._snap !== null ? this._snap : (this._snap = JSON.stringify(this.state)); },
  saveLocal: debounce(function () {
    if (!Store.autosave || !Store.state || Store.recovery) return;
    Store.setStorageStatus("saving");
    try {
      const savedAt = new Date().toISOString();
      const data = { ...stripPrivate(Store.state), meta: { ...Store.state.meta, savedAt } };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      Store.state.meta.savedAt = savedAt;
      Store.lastSavedAt = savedAt;
      Store._snap = null;
      Store._saveWarned = false;
      Store.setStorageStatus("saved");
      Bus.emit("saved");
    } catch (e) {
      console.warn("Autosave mislukt: browseropslag vol of geblokkeerd.");
      Store.setStorageStatus("failed");
      if (!Store._saveWarned && typeof Toast !== "undefined") { Store._saveWarned = true; Toast.show("Automatisch bewaren in deze browser lukt niet (opslag vol of geblokkeerd). Sla je ontwerp op als JSON (Ctrl+S) om niets kwijt te raken.", "err", 9000); }
      Bus.emit("savefail");
    }
  }, 400),
  /** Muteer de state via fn(state). Opties: silent (geen re-render), coalesce (sleutel: opeenvolgende edits = 1 undo-stap), noHistory.
      Gooit fn een fout, dan wordt de state teruggezet (rollback) en verschijnt "Actie mislukt – niets gewijzigd". */
  update(fn, opts = {}) {
    const before = this._snapshot();
    let res, after;
    try {
      res = fn(this.state);
      after = JSON.stringify(this.state);
      if (after !== before && this.state.meta) {
        this.state.meta.updated = new Date().toISOString();
        after = JSON.stringify(this.state);
      }
    } catch (e) {
      console.warn("Ontwerpwijziging teruggedraaid.");
      this.state = JSON.parse(before);
      this._snap = before;
      if (typeof Toast !== "undefined") Toast.show("Actie mislukt – niets gewijzigd", "err");
      Bus.emit("change", {});
      return undefined;
    }
    if (before === after) return res;
    if (!opts.noHistory) {
      const now = Date.now();
      const merge = opts.coalesce && opts.coalesce === this._lastCoalesce && now - this._lastAt < 2500;
      if (!merge) {
        this.past.push(before);
        if (this.past.length > this.max) this.past.shift();
      }
      this._lastCoalesce = opts.coalesce || null;
      this._lastAt = now;
      this.future = [];
    }
    this._snap = after;
    this.rev++;
    this.queueSave();
    Bus.emit("change", { silent: !!opts.silent });
    return res;
  },
  canUndo() { return this.past.length > 0; },
  canRedo() { return this.future.length > 0; },
  undo() {
    if (!this.past.length) return;
    this.future.push(this._snapshot());
    this._snap = this.past.pop();
    this.state = JSON.parse(this._snap);
    this._lastCoalesce = null;
    this.rev++;
    this.queueSave();
    Bus.emit("change", {});
  },
  redo() {
    if (!this.future.length) return;
    this.past.push(this._snapshot());
    if (this.past.length > this.max) this.past.shift();
    this._snap = this.future.pop();
    this.state = JSON.parse(this._snap);
    this._lastCoalesce = null;
    this.rev++;
    this.queueSave();
    Bus.emit("change", {});
  },
  /** Wis de ongedaan-maakgeschiedenis. */
  clearHistory() { this.past = []; this.future = []; this._lastCoalesce = null; },
  /** Vervang de volledige state (bijv. bestand openen). Undo blijft mogelijk. Normaliseert eerst; gooit bij een onbruikbaar ontwerp (huidige state blijft dan intact). */
  replace(st, keepHistory = true) {
    const next = normalizeState(st);
    if (keepHistory) {
      this.past.push(this._snapshot());
      if (this.past.length > this.max) this.past.splice(0, this.past.length - this.max);
      this.future = [];
    } else { this.past = []; this.future = []; }
    this.state = next;
    this._snap = null;
    this._lastCoalesce = null;
    this.rev++;
    this.queueSave();
    Bus.emit("change", {});
  },
};
function S() { return Store.state; }
/** Kopie van de state zonder privacygevoelige werkvelden (SIT-testteksten) – voor opslaan en exporteren. */
function stripPrivate(st) {
  if (!st || !Array.isArray(st.sits)) return st;
  return { ...st, sits: st.sits.map((x) => { if (!x || !("test" in x)) return x; const o = { ...x }; delete o.test; return o; }) };
}
function customerState(st, includeInternal = false) {
  const data = stripPrivate(st);
  const meta = { ...data.meta };
  if (!includeInternal) delete meta.internalNotes;
  return { ...data, meta };
}

/* ---------- UI-state (niet opgeslagen in het ontwerp) ---------- */
const UI = {
  route: "start",
  sub: {},
  picked: null,
  facilitator: true,
  navCollapsed: false,
  panelCollapsed: false,
  boardFilter: "all",
  libFilter: { q: "", kind: "", cat: "" },
  selLabel: null,
  sitTest: {},  // { [sitId]: testtekst } – alleen in het geheugen, nooit opgeslagen (privacy)
};

/** Registreer een export (xlsx, ps1, document, afdrukken) in meta.exportedAt – voor de voortgang van de exportstap. */
function markExported() {
  if (!Store.state || !Store.state.meta) return;
  const iso = new Date().toISOString();
  Store.update((st) => { st.meta.exportedAt = iso; }, { noHistory: true });
}

/* ---------- Downloads ---------- */
function downloadBlob(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  if (!/\.json$/i.test(String(name))) setTimeout(markExported, 0);
}
function downloadText(text, name, type = "text/plain;charset=utf-8") {
  const bom = /csv|powershell|ps1/i.test(type + name) ? "\uFEFF" : "";
  downloadBlob(new Blob([bom + String(text).replace(/^\uFEFF+/, "")], { type }), name);
}
function safeFileName(s) { return String(s || "ontwerp").replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, " ").trim().slice(0, 80) || "ontwerp"; }
