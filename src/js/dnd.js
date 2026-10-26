/* Drag & drop: pointer-events (muis, touch, pen), ghost-element, tap-to-place en toetsenbord.
   Draggable:  [data-drag="type"][data-payload='json'] (optioneel data-tap, data-pick-label)
   Dropzone:   [data-drop="type1 type2"][data-zone="handler"][data-target='json']
   Handler:    DnD.register("handler", (type, payload, target, zoneEl) => {...}) */
const DnD = {
  handlers: {},
  drag: null,
  pick: null, // {type, payload, label, sticky, el}
  register(name, fn) { this.handlers[name] = fn; },

  init() {
    document.addEventListener("pointerdown", (e) => this._down(e));
    document.addEventListener("pointermove", (e) => this._move(e));
    document.addEventListener("pointerup", (e) => this._up(e));
    document.addEventListener("pointercancel", () => this._cancel());
    document.addEventListener("click", (e) => this._click(e), true);
    document.addEventListener("keydown", (e) => this._key(e));
  },

  _parse(s) { if (!s) return null; try { return JSON.parse(s); } catch { return s; } },
  /* Optioneel per zone: DnD.accept[zone] = (type, payload, target) => bool – bepaalt welke dropzones oplichten en accepteren. */
  accept: {},
  _accepts(zone, type, payload) {
    if (!(zone.dataset.drop || "").split(/\s+/).includes(type)) return false;
    const f = this.accept[zone.dataset.zone];
    if (!f || payload === undefined) return true;
    try { return f(type, payload, this._parse(zone.dataset.target)) !== false; } catch (e) { return true; }
  },
  _zones(type, payload) { return $$("[data-drop]").filter((z) => this._accepts(z, type, payload)); },

  _down(e) {
    if (e.button !== 0) return;
    const src = e.target.closest("[data-drag]");
    if (!src) return;
    if (e.target.closest("input, textarea, select, .no-drag, [contenteditable]")) return;
    if (e.target.closest("button, a") && !e.target.closest(".drag-handle")) {
      // knoppen binnen een draggable blijven gewoon klikbaar; slepen start pas na beweging
    }
    this.drag = { src, type: src.dataset.drag, payload: this._parse(src.dataset.payload), x0: e.clientX, y0: e.clientY, started: false, ghost: null, over: null, pid: e.pointerId };
  },

  _start(e) {
    const d = this.drag;
    d.started = true;
    const r = d.src.getBoundingClientRect();
    const g = d.src.cloneNode(true);
    g.classList.add("dnd-ghost");
    g.removeAttribute("data-drag");
    g.style.width = Math.min(r.width, 300) + "px";
    d.dx = Math.min(e.clientX - r.left, 280); d.dy = e.clientY - r.top;
    document.body.appendChild(g);
    d.ghost = g;
    d.src.classList.add("dnd-source");
    document.body.classList.add("dnd-active");
    this._zones(d.type, d.payload).forEach((z) => z.classList.add("drop-ok"));
    this._clearPick(true);
  },

  _move(e) {
    const d = this.drag;
    if (!d) return;
    if (!d.started) {
      if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 6) return;
      this._start(e);
    }
    e.preventDefault();
    d.ghost.style.left = e.clientX - d.dx + "px";
    d.ghost.style.top = e.clientY - d.dy + "px";
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const zone = el && el.closest("[data-drop]");
    const ok = zone && this._accepts(zone, d.type, d.payload) ? zone : null;
    if (d.over !== ok) {
      if (d.over) d.over.classList.remove("drop-hover");
      if (ok) ok.classList.add("drop-hover");
      d.over = ok;
    }
    this._autoscroll(e);
  },

  _autoscroll(e) {
    const scrollers = [$(".board-wrap"), $(".lib-scroll"), $("#main"), $(".drawer-body")].filter(Boolean);
    scrollers.forEach((s) => {
      const r = s.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
      const m = 40;
      if (e.clientY < r.top + m) s.scrollTop -= 12; else if (e.clientY > r.bottom - m) s.scrollTop += 12;
      if (e.clientX < r.left + m) s.scrollLeft -= 12; else if (e.clientX > r.right - m) s.scrollLeft += 12;
    });
  },

  _up(e) {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    if (!d.started) return; // gewone klik
    const zone = d.over;
    this._cleanup(d);
    this._suppressClick = true;
    setTimeout(() => { this._suppressClick = false; }, 50);
    if (zone) this._drop(zone, d.type, d.payload);
  },

  _cancel() { if (this.drag && this.drag.started) this._cleanup(this.drag); this.drag = null; },

  _cleanup(d) {
    if (d.ghost) d.ghost.remove();
    if (d.src) d.src.classList.remove("dnd-source");
    document.body.classList.remove("dnd-active");
    $$(".drop-ok, .drop-hover").forEach((z) => z.classList.remove("drop-ok", "drop-hover"));
  },

  _drop(zone, type, payload) {
    const h = this.handlers[zone.dataset.zone];
    if (!h) { console.warn("Geen DnD-handler voor", zone.dataset.zone); return; }
    const target = this._parse(zone.dataset.target);
    try { h(type, payload, target, zone); } catch (err) { console.error(err); if (window.Toast) Toast.show(esc(err.message), "err"); }
  },

  /* ---- Tap-to-place: klik op [data-tap] kiest het item, klik op een dropzone plaatst het ---- */
  _click(e) {
    if (this._suppressClick) { e.stopPropagation(); e.preventDefault(); return; }
    if (this.pick) {
      const zone = e.target.closest("[data-drop]");
      if (zone && this._accepts(zone, this.pick.type, this.pick.payload) && !e.target.closest(".pick-banner")) {
        e.stopPropagation(); e.preventDefault();
        const p = this.pick;
        this._drop(zone, p.type, p.payload);
        if (!p.sticky) this.clearPick();
        else setTimeout(() => this._markPick(), 30);
        return;
      }
    }
    const src = e.target.closest("[data-drag][data-tap]");
    if (src && !e.target.closest("button:not([data-drag]), a, input, select, textarea, .no-drag")) {
      e.stopPropagation(); e.preventDefault();
      const same = this.pick && this.pick.key === src.dataset.payload + src.dataset.drag;
      if (same) { this.clearPick(); return; }
      this.pick = { type: src.dataset.drag, payload: this._parse(src.dataset.payload), key: src.dataset.payload + src.dataset.drag, label: src.dataset.pickLabel || src.textContent.trim().slice(0, 60), sticky: e.shiftKey };
      this._markPick();
    }
  },

  _markPick() {
    $$(".picked").forEach((x) => x.classList.remove("picked"));
    $$(".drop-ok").forEach((z) => z.classList.remove("drop-ok"));
    const p = this.pick;
    if (!p) { document.body.classList.remove("tap-active"); $(".pick-banner") && $(".pick-banner").remove(); this._tabZones(); return; }
    document.body.classList.add("tap-active");
    $$("[data-drag][data-tap]").forEach((x) => { if (x.dataset.payload + x.dataset.drag === p.key) x.classList.add("picked"); });
    this._zones(p.type, p.payload).forEach((z) => z.classList.add("drop-ok"));
    this._tabZones();
    let b = $(".pick-banner");
    if (!b) { b = document.createElement("div"); b.className = "pick-banner"; document.body.appendChild(b); }
    b.innerHTML = `${icon("target", "s")} <span><b>${esc(p.label)}</b> gekozen – klik op een vak om te plaatsen${p.sticky ? " (meerdere keren)" : ""}</span><button type="button" data-pick-cancel>Annuleren <span class="kbd">Esc</span></button>`;
    b.querySelector("[data-pick-cancel]").onclick = (ev) => { ev.stopPropagation(); this.clearPick(); };
  },
  _clearPick(silent) { this.pick = null; if (!silent) this._markPick(); else { $$(".picked").forEach((x) => x.classList.remove("picked")); document.body.classList.remove("tap-active"); $(".pick-banner") && $(".pick-banner").remove(); this._tabZones(); } },
  clearPick() { this._clearPick(false); },

  /* ---- Toetsenbord: Enter/spatie op een draggable = kiezen (Enter op een element met data-action = openen/selecteren); op een dropzone = plaatsen; Esc = annuleren ---- */
  _key(e) {
    if (e.key === "Escape" && this.pick) { this.clearPick(); return; }
    if (e.key !== "Enter" && e.key !== " ") return;
    if (e.defaultPrevented) return;
    const t = e.target;
    if (!t || t.matches("input, textarea, select, button, a")) return;
    if (this.pick && t.matches("[data-drop]") && this._accepts(t, this.pick.type, this.pick.payload)) {
      e.preventDefault();
      const p = this.pick;
      this._drop(t, p.type, p.payload);
      if (!p.sticky) this.clearPick(); else setTimeout(() => this._markPick(), 30);
      return;
    }
    if (t.matches("[data-drag]")) {
      e.preventDefault();
      this.pick = { type: t.dataset.drag, payload: this._parse(t.dataset.payload), key: t.dataset.payload + t.dataset.drag, label: t.dataset.pickLabel || t.textContent.trim().slice(0, 60), sticky: e.shiftKey };
      this._markPick();
      const z = $$(".drop-ok").find((x) => x.offsetParent !== null);
      if (z && window.Toast) Toast.show(`<b>${esc(this.pick.label)}</b> opgepakt – Tab naar een oplichtend vak en druk op Enter om te plaatsen (Esc = annuleren).`, "info", 4000);
    }
  },

  /** Na elke render: draggables focusbaar maken, dropzones alleen tijdens een pick in de tabvolgorde, pick-markering herstellen. */
  refresh() {
    $$("[data-drag]").forEach((x) => { if (!x.hasAttribute("tabindex")) x.setAttribute("tabindex", "0"); });
    $$("[data-drop]").forEach((x) => { if (!x.hasAttribute("tabindex") && !x.matches("button, a, input")) { x.setAttribute("tabindex", "-1"); x.dataset.dndTi = "1"; } });
    if (this.pick) this._markPick();
  },
  /** Tijdens een pick zijn geaccepteerde dropzones met Tab bereikbaar (tabindex 0), daarna weer -1. */
  _tabZones() {
    $$("[data-drop][data-dnd-ti]").forEach((x) => x.setAttribute("tabindex", this.pick && x.classList.contains("drop-ok") ? "0" : "-1"));
  },
};
