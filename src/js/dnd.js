/* Drag & drop: pointer-events (muis, touch, pen), ghost-element, tap-to-place en toetsenbord.
   Draggable:  [data-drag="type"][data-payload='json'] (optioneel data-tap, data-pick-label, data-pick-hint)
   Dropzone:   [data-drop="type1 type2"][data-zone="handler"][data-target='json']
   Handler:    DnD.register("handler", (type, payload, target, zoneEl) => {...})
   Na een geslaagde drop krijgt de (opnieuw getekende) dropzone kort de klasse .drop-done (succesanimatie). */
const DnD = {
  handlers: {},
  drag: null,
  pick: null, // {type, payload, label, sticky, el}
  /* Optioneel per type: DnD.pickMenu[type] = (pick, anchorEl) => void – toont in de kies-balk een knop "Kies uit lijst…". */
  pickMenu: {},
  _last: null,
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
    document.body.dataset.dndType = d.type;
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
    delete document.body.dataset.dndType;
    $$(".drop-ok, .drop-hover").forEach((z) => z.classList.remove("drop-ok", "drop-hover"));
  },

  _drop(zone, type, payload) {
    const h = this.handlers[zone.dataset.zone];
    if (!h) { console.warn("Geen DnD-handler voor", zone.dataset.zone); return; }
    const target = this._parse(zone.dataset.target);
    this._last = { zone: zone.dataset.zone, target: zone.dataset.target || "", at: Date.now() };
    try { h(type, payload, target, zone); } catch (err) { console.error(err); this._last = null; if (window.Toast) Toast.show(esc(err.message), "err"); }
    setTimeout(() => this._flash(), 120);
  },
  /** Succesanimatie op de dropzone (ook na een re-render: zone wordt opnieuw opgezocht op zone + target). */
  _flash() {
    const l = this._last;
    if (!l || Date.now() - l.at > 1500) { this._last = null; return; }
    const z = $$(`[data-drop][data-zone="${CSS.escape(l.zone)}"]`).find((x) => (x.dataset.target || "") === l.target);
    if (!z) return;
    this._last = null;
    z.classList.remove("drop-done");
    void z.offsetWidth;
    z.classList.add("drop-done");
    setTimeout(() => z.classList.remove("drop-done"), 1300);
  },

  /* ---- Tap-to-place: klik op [data-tap] kiest het item, klik op een dropzone plaatst het ---- */
  _click(e) {
    if (this._suppressClick) { e.stopPropagation(); e.preventDefault(); return; }
    if (this.pick) {
      const zone = e.target.closest("[data-drop]");
      if (zone && this._accepts(zone, this.pick.type, this.pick.payload) && !e.target.closest(".pick-banner, input, select, textarea, label")) {
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
      this.pick = this._makePick(src, e.shiftKey);
      this._markPick();
    }
  },
  _makePick(src, sticky) {
    return { type: src.dataset.drag, payload: this._parse(src.dataset.payload), key: src.dataset.payload + src.dataset.drag, label: src.dataset.pickLabel || src.textContent.trim().slice(0, 60), hint: src.dataset.pickHint || "", sticky: !!sticky };
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
    b.innerHTML = `${icon("target", "s")} <span><b>${esc(p.label)}</b> gekozen – ${p.hint ? esc(p.hint) : "klik op een vak om te plaatsen"}${p.sticky ? " (meerdere keren)" : ""}</span>${this.pickMenu[p.type] ? `<button type="button" data-pick-menu>Kies uit lijst…</button>` : ""}<button type="button" data-pick-cancel>Annuleren <span class="kbd">Esc</span></button>`;
    b.querySelector("[data-pick-cancel]").onclick = (ev) => { ev.stopPropagation(); this.clearPick(); };
    const pm = b.querySelector("[data-pick-menu]");
    if (pm) pm.onclick = (ev) => { ev.stopPropagation(); if (this.pick && this.pickMenu[this.pick.type]) this.pickMenu[this.pick.type](this.pick, pm); };
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
      this.pick = this._makePick(t, e.shiftKey);
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
    if (this._last) this._flash();
  },
  /** Tijdens een pick zijn geaccepteerde dropzones met Tab bereikbaar (tabindex 0), daarna weer -1. */
  _tabZones() {
    $$("[data-drop][data-dnd-ti]").forEach((x) => x.setAttribute("tabindex", this.pick && x.classList.contains("drop-ok") ? "0" : "-1"));
  },
};
