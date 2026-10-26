/* View: Scenario’s – "Wat gebeurt er als…?" Voorspel, speel af en toets het integrale ontwerp aan herkenbare situaties. */
const SCN_STATUS = { pass: ["Geslaagd", "ok"], partial: ["Deels", "warn"], fail: ["Onvoldoende", "err"] };
const SCN_DOT = { ok: "✓", warn: "!", block: "✕", info: "i" };
/* Voorspelling/uitkomst in klanttaal: gaat door · melding (tip/override) · geblokkeerd. */
const SCN_PRED = { pass: ["Gaat door", "check"], tip: ["Melding", "warning"], block: ["Geblokkeerd", "shield"] };
const SCN_PAGE = 9;
/* Kanaal → app in ‘Zo ziet de gebruiker het’. */
const SCN_PV_APP = { exchange: "outlook", sharing: "spo", teams: "teams", endpoint: "endpoint", copilot: "copilot", container: "spo", meeting: "teams" };

const ScnUI = {
  played(id) { return !!(UI.scnPlayed || {})[id] || !!UI.scnShowAll; },
  /** Catalogus ∪ eigen scenario’s. Werkt vóór en ná ondersteuning van customScenarios in de engine. */
  results(st) {
    const base = ScenarioEngine.all(st);
    const have = new Set(base.map((r) => r.scn.id));
    const extra = (st.customScenarios || []).filter((s) => s && s.id && s.content && s.expect && !have.has(s.id)).map((s) => {
      try { return ScenarioEngine.evaluate(s, st); } catch (e) {
        console.error(e);
        return { scn: s, label: null, lv: 0, steps: [{ kind: "warn", text: "Dit scenario kon niet worden doorgerekend met het huidige ontwerp." }], status: "fail", over: false, labelApplied: false };
      }
    });
    const all = base.concat(extra);
    return all.filter((r) => r.scn.custom || String(r.scn.id).startsWith("csc-")).concat(all.filter((r) => !(r.scn.custom || String(r.scn.id).startsWith("csc-"))));
  },
  isCustom(s) { return !!(s && (s.custom || String(s.id).startsWith("csc-"))); },
  filtered(st) {
    const all = this.results(st);
    return UI.scnChannel ? all.filter((r) => r.scn.channel === UI.scnChannel) : all;
  },
  scoreOf(rs) {
    const pts = sum(rs.map((x) => (x.status === "pass" ? 1 : x.status === "partial" ? 0.5 : 0)));
    return { pct: rs.length ? Math.round((pts / rs.length) * 100) : 0, pass: rs.filter((x) => x.status === "pass").length, partial: rs.filter((x) => x.status === "partial").length, fail: rs.filter((x) => x.status === "fail").length, total: rs.length };
  },
  /** Wat merkt de medewerker? block = tegengehouden, tip = melding/override, pass = gaat door. */
  outcome(r) {
    const steps = r.steps || [];
    if ((r.lv || 0) >= 3 || steps.some((x) => x.kind === "block")) return "block";
    if (steps.some((x) => /policy tip|overrul|justificatie/i.test(x.text || ""))) return "tip";
    return "pass";
  },
  ruleName(r) { const x = r && r.rule; return x ? (typeof x === "string" ? x : x.name || "") : ""; },
  lvName(lv) { return (CATALOG.levels[lv] || {}).name || String(lv); },
  verdict(r) {
    if (r.status === "pass") return ["ok", "check", "Klopt", "De uitkomst past bij wat gewenst is."];
    if (r.over) return ["warn", "warning", "Strenger dan nodig", "Overweeg een minder strenge keuze voor dit label of kanaal: te veel hinder kost draagvlak."];
    if (r.status === "partial") return ["warn", "warning", "Net te zwak", "Eén stap strenger op het ontwerpbord (dit label/kanaal) is genoeg."];
    return ["err", "xcircle", "Te zwak", "Verscherp de keuzes op het ontwerpbord voor dit label/kanaal."];
  },
  expectText(s) {
    const ex = s.expect || {}, mn = Number(ex.min) || 0, mx = ex.max;
    if (mx != null && mx === mn) return `precies ${this.lvName(mn)}`;
    if (mx != null) return `${this.lvName(mn)}–${this.lvName(mx)}`;
    return `minstens ${this.lvName(mn)}`;
  },
  card(r, st) {
    const s = r.scn, ch = CATALOG.scenarioChannels[s.channel] || { name: s.channel, icon: "info" };
    const played = this.played(s.id), just = UI.scnJust === s.id, sid = esc(s.id);
    const res = (st.scenarioResults || {})[s.id] || {};
    const ov = res.labelId && applicableLabels(st).some((l) => l.id === res.labelId);
    const auto = (() => { if (!ov) return r.label; const tmp = { ...st, scenarioResults: {} }; try { return ScenarioEngine.pickLabel(s, tmp); } catch (e) { return null; } })();
    const opts = [["", `Automatisch${auto ? ` (${labelFullName(auto, st)})` : ""}`], ...applicableLabels(st).map((l) => [l.id, labelFullName(l, st)])];
    const autoPicked = r.autoPicked != null ? !!r.autoPicked : !ov && !!r.label;
    const ambiguous = !!r.ambiguous && !ov;
    const [vc, vi, vt, vd] = this.verdict(r);
    const seen = new Set();
    const steps = (r.steps || []).filter((x) => { const k = x.kind + "|" + x.text; if (seen.has(k)) return false; seen.add(k); return true; });
    const flow = played ? `<div class="flow${just ? " anim" : ""}">${steps.map((x, i) => `<div class="flow-step ${esc(x.kind)}"${just ? ` style="animation-delay:${i * 180}ms"` : ""}><span class="fs-dot">${SCN_DOT[x.kind] || "•"}</span><span>${esc(x.text)}</span></div>`).join("")}</div>` : "";
    const pred = res.predict || "";
    const predChips = `<div class="vb-pred" role="group" aria-label="Voorspelling voor ${esc(s.title)}"><span class="xs muted">Wij denken:</span>${Object.entries(SCN_PRED).map(([k, [t]]) => `<button type="button" class="chip sm${pred === k ? " on" : ""}" data-action="scn-predict" data-id="${sid}" data-v="${k}" aria-pressed="${pred === k}">${esc(t)}</button>`).join("")}</div>`;
    const out = this.outcome(r), [ot, oi] = SCN_PRED[out];
    const predRes = pred ? (pred === out ? `<span class="vb-pred-ok">${icon("check", "s")} Jullie voorspelling klopte</span>` : `<span class="vb-pred-diff">${icon("info", "s")} Anders dan verwacht (voorspeld: ${esc(SCN_PRED[pred][0])})</span>`) : "";
    const rn = this.ruleName(r);
    const custom = this.isCustom(s);
    const lblSel = s.content.prompt ? "" : `<div class="vb-scn-lbl${ambiguous ? " vb-amb" : ""}">${VH.aria(F.select(`st:scenarioResults.${s.id}.labelId`, "", opts, { cls: "mb-0" }), "Label van de inhoud")}${ambiguous ? `<span class="badge warn">Kies het label</span>` : ""}</div>`;
    const met = r.status === "pass" ? "Voldoet" : r.over ? "Te streng" : "Voldoet niet";
    return `<div class="scenario-card${played ? " " + esc(r.status) : ""}${custom ? " vb-custom" : ""}">
      ${played ? `<div class="stamp ${esc(r.status)}${just ? " anim" : ""}"${just ? ` style="animation-delay:${steps.length * 180}ms"` : ""}>${esc(vt)}</div>` : ""}
      <div class="row tight" style="align-items:flex-start"><span class="sc-icon">${icon(s.icon || ch.icon)}</span><div style="padding-right:${played ? 96 : 0}px;min-width:0"><b title="${esc(s.persona || "")}">${esc(s.title)}</b>${custom ? ` <span class="badge info">Eigen</span>` : ""}<div class="xs muted"><span role="img" title="${esc(ch.name)}" aria-label="${esc(ch.name)}">${icon(ch.icon, "s")}</span>${s.recipient ? ` ${esc(CATALOG.scenarioRecipients[s.recipient] || s.recipient)}` : ""}${s.persona ? `<span class="sr-only"> · ${esc(s.persona)}</span>` : ""}</div></div></div>
      <div class="sc-story">${esc(s.story)}${s.content.unlabeled ? ` <span class="badge warn">nog niet gelabeld</span>` : ""}${s.content.prompt ? (typeof s.content.prompt === "string" ? `<div class="code xs mt-1">“${esc(s.content.prompt)}”</div>` : ` <span class="badge info">${icon("sparkle", "s")} Copilot-prompt</span>`) : ""}</div>
      ${lblSel}
      ${flow}
      ${played ? `<div class="sc-result">
          <div class="row between"><div class="vb-verdict ${vc}">${icon(vi, "s")} <b>${esc(vt)}</b>${infoTip(`${vd} Gewenst: ${s.expect.text || ""}`)}</div><span class="vb-out vb-out-${out}">${icon(oi, "s")} ${esc(ot)}</span></div>
          <div class="xs mt-1">Bereikt: ${levelChip(r.lv)} · Gewenst: <b>${esc(this.expectText(s))}</b> → <b>${met}</b></div>
          ${r.label && !s.content.prompt ? `<div class="xs mt-1 muted">Label: ${esc(labelFullName(r.label, st))}${autoPicked ? " (automatisch gekozen – controleren)" : ""}</div>` : ""}
          ${rn ? `<div class="xs muted">Beslissende regel: ${esc(rn)}</div>` : ""}
          ${predRes ? `<div class="xs mt-1">${predRes}</div>` : ""}
        </div>
        <div class="row tight"><button class="btn small subtle" data-action="go" data-route="board">${icon("board", "s")} Ontwerpbord</button>${r.label ? `<button class="btn small subtle" data-action="pv-open" data-label="${esc(r.label.id)}" data-app="${esc(SCN_PV_APP[s.channel] || "")}" title="Bekijk wat de medewerker in dit scenario te zien krijgt">${icon("eye", "s")} Zo ziet de gebruiker het</button>` : ""}${custom ? this.customBtns(sid) : ""}<span class="spacer"></span><button class="btn small subtle" data-action="scn-play" data-id="${sid}">${icon("play", "s")} Opnieuw</button></div>`
        : `<div class="row tight vb-scn-foot">${predChips}<span class="spacer"></span>${custom ? this.customBtns(sid) : ""}<button class="btn small primary" data-action="scn-play" data-id="${sid}">${icon("play", "s")} Speel af</button></div>`}
    </div>`;
  },
  customBtns(sid) {
    return `<button class="icon-btn" data-action="scn-custom-edit" data-id="${sid}" aria-label="Eigen scenario bewerken" title="Bewerken">${icon("edit", "s")}</button><button class="icon-btn" data-action="scn-custom-del" data-id="${sid}" aria-label="Eigen scenario verwijderen" title="Verwijderen">${icon("trash", "s")}</button>`;
  },
  /** Editor (modal) voor een eigen scenario – zelfde vorm als CATALOG.scenarios. */
  editor(id) {
    const st = S();
    const cur = id ? (st.customScenarios || []).find((x) => x.id === id) : null;
    if (!cur && (st.customScenarios || []).length >= 50) { Toast.show("Maximaal 50 eigen scenario’s.", "warn"); return; }
    const s = cur || { title: "", persona: "", story: "", channel: "exchange", activity: "usb", recipient: "external", content: { sits: [], unlabeled: false, prompt: "" }, expect: { min: 2, text: "" } };
    const lab = cur ? ((st.scenarioResults || {})[cur.id] || {}).labelId || "" : "";
    const o = (arr, v) => arr.map(([k, t]) => `<option value="${esc(k)}"${String(k) === String(v) ? " selected" : ""}>${esc(t)}</option>`).join("");
    const chans = Object.entries(CATALOG.scenarioChannels).map(([k, c]) => [k, c.name]);
    const recs = Object.entries(CATALOG.scenarioRecipients);
    const acts = (CATALOG.endpointActivities || []).map((a) => [a.key, a.nl || a.name]);
    const lvls = CATALOG.levels.map((l) => [l.lv, `${l.name} – ${l.desc}`]);
    const sits = st.sits.map((x) => [x.ref || x.id, x.name]);
    const has = new Set(s.content.sits || []);
    const sitList = sits.length ? `<div class="vb-csc-sits">${sits.map(([k, n]) => `<label class="check"><input type="checkbox" name="csc-sit" value="${esc(k)}"${has.has(k) ? " checked" : ""}><span>${esc(n)}</span></label>`).join("")}</div>` : `<p class="xs muted">Nog geen informatietypen in het ontwerp. Voeg ze toe bij Informatietypen.</p>`;
    const promptTxt = typeof s.content.prompt === "string" ? s.content.prompt : "";
    const body = `<div class="vb-csc">
      <div class="field"><label for="csc-title">Wat gebeurt er? (titel)</label><input id="csc-title" class="input" maxlength="120" value="${esc(s.title)}" placeholder="Bijv. Offerte met IBAN naar leverancier"></div>
      <div class="grid grid-2">
        <div class="field"><label for="csc-persona">Wie doet het?</label><input id="csc-persona" class="input" maxlength="80" value="${esc(s.persona)}" placeholder="Bijv. Inkoper"></div>
        <div class="field"><label for="csc-label">Welk label heeft de inhoud?</label><select id="csc-label" class="select">${o([["", "Automatisch (ontwerp kiest)"], ...applicableLabels(st).map((l) => [l.id, labelFullName(l, st)])], lab)}</select></div>
        <div class="field"><label for="csc-channel">Kanaal</label><select id="csc-channel" class="select">${o(chans, s.channel)}</select></div>
        <div class="field"><label for="csc-recipient">Naar wie?</label><select id="csc-recipient" class="select">${o(recs, s.recipient)}</select></div>
        <div class="field" data-csc-show="endpoint"><label for="csc-activity">Wat doet de medewerker op het apparaat?</label><select id="csc-activity" class="select">${o(acts, s.activity || "usb")}</select></div>
        <div class="field" data-csc-show="copilot"><label for="csc-prompt">Tekst in de Copilot-prompt (optioneel)</label><input id="csc-prompt" class="input" maxlength="300" value="${esc(promptTxt)}" placeholder="Leeg = Copilot vat een document samen"></div>
      </div>
      <div class="field"><label for="csc-story">Situatie in één of twee zinnen</label><textarea id="csc-story" class="textarea" rows="2" maxlength="500">${esc(s.story)}</textarea></div>
      <div class="field"><div class="field-label">Welke gevoelige gegevens zitten erin?</div>${sitList}</div>
      <label class="check"><input type="checkbox" id="csc-unlabeled"${s.content.unlabeled ? " checked" : ""}><span>De inhoud heeft nog geen label</span></label>
      <div class="grid grid-2 mt-2">
        <div class="field"><label for="csc-min">Gewenste bescherming (minimaal)</label><select id="csc-min" class="select">${o(lvls, s.expect.min)}</select></div>
        <div class="field"><label for="csc-max">Niet strenger dan</label><select id="csc-max" class="select">${o([["", "Geen maximum"], ...lvls], s.expect.max == null ? "" : s.expect.max)}</select></div>
      </div>
      <div class="field"><label for="csc-text">Waarom? (gewenste uitkomst)</label><input id="csc-text" class="input" maxlength="200" value="${esc(s.expect.text || "")}" placeholder="Bijv. Leverancier moet kunnen openen, niet blokkeren"></div>
    </div>`;
    Modal.open({
      title: cur ? "Eigen scenario bewerken" : "Eigen scenario toevoegen", wide: true, body, focus: "#csc-title",
      after: (m) => {
        const sync = () => { const v = $("#csc-channel", m).value; $$("[data-csc-show]", m).forEach((el) => { el.hidden = el.dataset.cscShow !== v; }); };
        $("#csc-channel", m).addEventListener("change", sync); sync();
      },
      buttons: [{ label: "Annuleren" }, { label: cur ? "Opslaan" : "Toevoegen", primary: true, fn: (m) => this.save(m, cur && cur.id) }],
    });
  },
  save(m, id) {
    const v = (sel) => ($(sel, m) || {}).value || "";
    const title = v("#csc-title").trim();
    if (!title) { const t = $("#csc-title", m); t.classList.add("invalid"); t.focus(); Toast.show("Geef het scenario een titel.", "warn"); return true; }
    const channel = v("#csc-channel"), min = Number(v("#csc-min")) || 0, mx = v("#csc-max");
    const sits = $$('input[name="csc-sit"]:checked', m).map((x) => x.value);
    const ex = { min, text: v("#csc-text").trim() || "Eigen scenario van de workshop." };
    if (mx !== "") ex.max = Math.max(min, Number(mx));
    const ch = CATALOG.scenarioChannels[channel] || {};
    const scn = { id: id || uid("csc"), sector: "all", icon: ch.icon || "user", title, persona: v("#csc-persona").trim(), story: v("#csc-story").trim(),
      content: { hint: [], sens: Math.min(4, min + (min >= 2 ? 1 : 0)), sits, unlabeled: !!($("#csc-unlabeled", m) || {}).checked },
      channel, recipient: v("#csc-recipient") || "external", expect: ex, custom: true };
    if (channel === "endpoint") scn.activity = v("#csc-activity") || "usb";
    if (channel === "copilot" && v("#csc-prompt").trim()) scn.content.prompt = v("#csc-prompt").trim();
    const labelId = v("#csc-label");
    let ok = false;
    Store.update((st) => {
      st.customScenarios = st.customScenarios || [];
      const i = st.customScenarios.findIndex((x) => x.id === scn.id);
      if (i >= 0) st.customScenarios[i] = scn;
      else { if (st.customScenarios.length >= 50) return; st.customScenarios.push(scn); }
      st.scenarioResults = st.scenarioResults || {};
      const r = (st.scenarioResults[scn.id] = st.scenarioResults[scn.id] || {});
      if (labelId) r.labelId = labelId; else delete r.labelId;
      ok = true;
    });
    if (!ok) { Toast.show("Maximaal 50 eigen scenario’s.", "warn"); return true; }
    UI.scnPlayed = { ...(UI.scnPlayed || {}) }; delete UI.scnPlayed[scn.id];
    if (UI.scnChannel && UI.scnChannel !== channel) UI.scnChannel = "";
    Toast.show(id ? "Scenario bijgewerkt." : "Eigen scenario toegevoegd – voorspel en speel het af.", "ok");
    return false;
  },
};

Actions["scn-play"] = (el) => {
  UI.scnPlayed = { ...(UI.scnPlayed || {}), [el.dataset.id]: true };
  UI.scnJust = el.dataset.id;
  App.render();
  const r = ScnUI.results(S()).find((x) => x.scn.id === el.dataset.id);
  if (r && r.status === "pass") setTimeout(() => VH.confetti(30), (r.steps.length * 180) + 300);
};
Actions["scn-play-all"] = () => {
  const st = S();
  if (!st.labels.length) { Toast.show("Maak eerst labels aan; dan kun je scenario’s afspelen.", "warn"); return; }
  const list = ScnUI.filtered(st);
  UI.scnPlayed = { ...(UI.scnPlayed || {}) };
  list.forEach((r) => (UI.scnPlayed[r.scn.id] = true));
  UI.scnJust = null;
  App.render();
  const sc = ScnUI.scoreOf(list);
  const ch = UI.scnChannel ? (CATALOG.scenarioChannels[UI.scnChannel] || { name: UI.scnChannel }).name : "";
  if (sc.total && sc.pct >= 80) VH.confetti(sc.pct === 100 ? 140 : 70);
  Toast.show(`${ch ? esc(ch) + ": " : ""}<b>${sc.pct}%</b> over ${plural(sc.total, "scenario", "scenario’s")} – ${sc.pass} klopt, ${sc.partial} deels, ${sc.fail} te zwak.`, sc.pct >= 80 ? "ok" : "info");
};
Actions["scn-predict"] = (el) => {
  const id = el.dataset.id, v = el.dataset.v;
  if (!id || !SCN_PRED[v]) return;
  Store.update((st) => {
    st.scenarioResults = st.scenarioResults || {};
    const r = (st.scenarioResults[id] = st.scenarioResults[id] || {});
    r.predict = r.predict === v ? "" : v;
  });
};
Actions["scn-reset"] = () => { UI.scnPlayed = {}; UI.scnJust = null; UI.scnShowAll = false; App.render(); };
Actions["scn-show-all"] = () => { UI.scnShowAll = !UI.scnShowAll; UI.scnJust = null; App.render(); };
Actions["scn-more"] = () => { UI.scnMore = !UI.scnMore; App.render(); };
Actions["scn-channel"] = (el) => { UI.scnChannel = el.dataset.ch || ""; UI.scnJust = null; App.render(); };
Actions["scn-clear-labels"] = () => Store.update((st) => { Object.values(st.scenarioResults || {}).forEach((r) => { if (r) delete r.labelId; }); });
Actions["scn-custom-add"] = () => ScnUI.editor(null);
Actions["scn-custom-edit"] = (el) => ScnUI.editor(el.dataset.id);
Actions["scn-custom-del"] = (el) => {
  const id = el.dataset.id, s = (S().customScenarios || []).find((x) => x.id === id);
  if (!s) return;
  confirmDialog("Eigen scenario verwijderen?", `‘${esc(s.title)}’ wordt verwijderd. Ctrl+Z maakt dit ongedaan.`, () => {
    Store.update((st) => {
      st.customScenarios = (st.customScenarios || []).filter((x) => x.id !== id);
      if (st.scenarioResults) delete st.scenarioResults[id];
    });
    Toast.show("Scenario verwijderd.", "ok");
  }, "Verwijderen", true);
};

registerView("scenarios", {
  title: "Scenario’s",
  fac: {
    duration: 30,
    goal: "Het ontwerp toetsen aan herkenbare situaties: wat gebeurt er écht als een medewerker dit doet? Te los of te streng?",
    questions: ["Is dit scenario herkenbaar voor jullie organisatie?", "Is de uitkomst acceptabel voor de business – of hindert het te veel?", "Welk label zou de medewerker hier in de praktijk kiezen?"],
    tips: ["Laat de groep eerst voorspellen (Wij denken: …) en speel dan af.", "Is de uitkomst ‘Te zwak’? Wijzig direct de keuze op het ontwerpbord en speel opnieuw af.", "‘Strenger dan nodig’ is óók een signaal: te veel hinder kost draagvlak.", "Mist er een situatie? Voeg met ‘+ Eigen scenario’ een eigen geval toe."],
    pitfalls: ["De engine toetst het beoogde eindbeeld; policies in simulatie handhaven in werkelijkheid nog niet.", "Ongelabelde inhoud wordt alleen beschermd via auto-labeling of SIT-condities in DLP."],
    links: ["dlpSimulation", "labelsAuto"],
  },
  done: (st) => ScenarioEngine.score(st).pct >= 80,
  render() {
    const st = S();
    const lead = "Wat gebeurt er als…? Voorspel eerst, speel dan af.";
    const addBtn = `<button class="btn" data-action="scn-custom-add">${icon("plus", "s")} Eigen scenario</button>`;
    if (!st.labels.length) return pageHead("Toetsen", "Scenario’s", lead) + VH.needLabels();
    const all = ScnUI.results(st);
    if (!all.length) return pageHead("Toetsen", "Scenario’s", lead, addBtn) + emptyState("play", "Geen scenario’s", "Er zijn geen scenario’s voor deze sector. Voeg een eigen scenario toe.");
    const list = ScnUI.filtered(st);
    const playedList = list.filter((r) => ScnUI.played(r.scn.id));
    const sc = ScnUI.scoreOf(playedList);
    const chans = unique(all.map((r) => r.scn.channel));
    const filter = `<div class="chip-list mb-2" role="group" aria-label="Filter op kanaal"><button class="chip sm${!UI.scnChannel ? " on" : ""}" style="cursor:pointer" data-action="scn-channel" data-ch="" aria-pressed="${!UI.scnChannel}">Alle (${all.length})</button>${chans.map((k) => { const c = CATALOG.scenarioChannels[k] || { name: k, icon: "info" }; return `<button class="chip sm${UI.scnChannel === k ? " on" : ""}" style="cursor:pointer" data-action="scn-channel" data-ch="${esc(k)}" aria-pressed="${UI.scnChannel === k}" title="${esc(c.name)}">${icon(c.icon, "s")}${esc(c.name.replace(/\s*\([^)]*\)$/, ""))} (${all.filter((r) => r.scn.channel === k).length})</button>`; }).join("")}</div>`;
    const showScore = playedList.length > 0;
    const predPlayed = playedList.filter((r) => ((st.scenarioResults || {})[r.scn.id] || {}).predict);
    const predOk = predPlayed.filter((r) => st.scenarioResults[r.scn.id].predict === ScnUI.outcome(r)).length;
    const head = `<div class="card mb-2" style="padding:16px"><div class="row vb-stats" style="flex-wrap:wrap">
      ${showScore ? ring(sc.pct, `${sc.pct}%`, "big", sc.pct >= 80 ? "var(--ok)" : sc.pct >= 50 ? "var(--warn)" : "var(--err)") : ring(0, "?", "big")}${infoTip("Score = ontworpen bescherming zodra de policies zijn ingeschakeld (niet in simulatiemodus).")}
      ${showScore ? `<div class="stat"><span class="stat-value" style="color:var(--ok)">${sc.pass}</span><span class="stat-label">klopt</span></div>
      <div class="stat"><span class="stat-value" style="color:var(--warn)">${sc.partial}</span><span class="stat-label">deels</span></div>
      <div class="stat"><span class="stat-value" style="color:var(--err)">${sc.fail}</span><span class="stat-label">te zwak</span></div>` : ""}
      <div class="stat"><span class="stat-value">${playedList.length}/${list.length}</span><span class="stat-label">afgespeeld</span></div>
      ${predPlayed.length ? `<div class="stat"><span class="stat-value">${predOk}/${predPlayed.length}</span><span class="stat-label">goed voorspeld</span></div>` : ""}
      <span class="spacer"></span>
      <div class="row tight"><button class="btn primary" data-action="scn-play-all">${icon("play", "s")} Speel ${UI.scnChannel ? "deze" : "alles"} af</button>
      <button class="btn" data-action="scn-show-all">${icon("eye", "s")} ${UI.scnShowAll ? "Verberg uitkomsten" : "Toon uitkomsten"}</button>
      <button class="btn subtle" data-action="scn-reset" title="Opnieuw beginnen" aria-label="Opnieuw beginnen">${icon("undo", "s")}</button></div></div>
      ${Object.values(st.scenarioResults || {}).some((x) => x && x.labelId) ? `<p class="xs muted mb-0 mt-1">${icon("info", "s")} Bij sommige scenario’s is handmatig een label gekozen. <button class="btn small subtle" data-action="scn-clear-labels">Alles automatisch</button></p>` : ""}</div>`;
    const achOn = (a) => { try { return !!a.test(st); } catch (e) { return false; } };
    const ach = CATALOG.achievements.map((a) => `<div class="ach${achOn(a) ? " on" : ""}" title="${esc(a.desc)}"><span class="ach-ico">${icon(a.icon)}</span><div><b>${esc(a.title)}</b><div class="xs">${esc(a.desc)}</div></div></div>`).join("");
    const nAch = CATALOG.achievements.filter(achOn).length;
    const paged = !UI.scnChannel && !UI.scnMore && list.length > SCN_PAGE + 3;
    const shown = paged ? list.slice(0, SCN_PAGE) : list;
    const more = `<p>Elk scenario wordt afgespeeld tegen het integrale ontwerp: label → encryptie → DLP → melding. Kies eerst wat jullie denken dat er gebeurt (<b>Gaat door</b>, <b>Melding</b> of <b>Geblokkeerd</b>) en speel het dan af.</p><p>De uitkomst is <b>Klopt</b>, <b>Strenger dan nodig</b>, <b>Net te zwak</b> of <b>Te zwak</b>. Kies zo nodig zelf het label dat de medewerker in de praktijk zou gebruiken. De score telt alleen de afgespeelde scenario’s.</p>`;
    return VH.wrap(`${pageHead("Toetsen", "Scenario’s", lead, `${addBtn}<span class="badge neutral">${icon("trophy", "s")} ${nAch}/${CATALOG.achievements.length} prestaties</span>`, more)}
      ${head}${filter}
      <div class="grid grid-3 vb-scn-grid">${shown.map((r) => ScnUI.card(r, st)).join("")}</div>
      ${paged || UI.scnMore && !UI.scnChannel && list.length > SCN_PAGE + 3 ? `<div class="row mt-2" style="justify-content:center"><button class="btn" data-action="scn-more">${UI.scnMore ? "Toon minder" : `Toon alle ${list.length} scenario’s`}</button></div>` : ""}
      <div class="mt-3">${accordion("scn-ach", `${icon("trophy", "s")} Prestaties <span class="xs muted">· ${nAch}/${CATALOG.achievements.length}</span>`, `<div class="achievements">${ach}</div>`)}</div>`);
  },
});
