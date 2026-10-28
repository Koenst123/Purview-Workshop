/* View: Scenario’s – "Wat gebeurt er als…?" Voorspel, speel af en toets het integrale ontwerp aan herkenbare situaties. */
const SCN_STATUS = { pass: ["Geslaagd", "ok"], partial: ["Deels", "warn"], fail: ["Onvoldoende", "err"] };
const SCN_DOT = { ok: "✓", warn: "!", block: "✕", info: "i" };
/* Voorspelling/uitkomst in klanttaal: gaat door · melding (tip/override) · geblokkeerd. */
const SCN_PRED = { pass: ["Gaat door", "check"], tip: ["Melding", "warning"], block: ["Geblokkeerd", "shield"] };
/* Kanaal → app in ‘Zo ziet de gebruiker het’. */
const SCN_PV_APP = { exchange: "outlook", sharing: "spo", teams: "teams", endpoint: "endpoint", copilot: "copilot", container: "spo", meeting: "teams" };
/* Kanaal → Microsoft-app(s) op de kaart (eerste = hoofdlogo) en korte kanaalnaam. */
const SCN_LOGO = { exchange: ["outlook"], sharing: ["sharepoint", "onedrive"], teams: ["teams"], endpoint: ["windows"], copilot: ["copilot"], container: ["teams", "sharepoint"], meeting: ["teams"] };
const SCN_CH_SHORT = { exchange: "Outlook", sharing: "SharePoint & OneDrive", teams: "Teams-chat", endpoint: "Windows-apparaat", copilot: "Microsoft 365 Copilot", container: "Teams & sites", meeting: "Teams-meeting" };
const SCN_SEG = { exchange: "E-mail", sharing: "Delen", teams: "Teams-chat", endpoint: "Apparaat", copilot: "Copilot", container: "Teams & sites", meeting: "Meeting" };
const SCN_SENS = ["Laag", "Laag", "Middel", "Hoog", "Zeer hoog"];
/* Wat de medewerker merkt, als badge: tekst, icoon, klasse. */
const SCN_OB = { block: ["Geblokkeerd", "xcircle"], tip: ["Melding", "warning"], pass: ["Gaat door", "checkcircle"], enc: ["Versleuteld", "lock"] };

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
  /** Korte ‘waarom’ bij de gewenste uitkomst (catalogus); leeg bij eigen scenario’s. */
  why(s) { return s && typeof s.why === "string" ? s.why : ""; },
  /** Is dit scenario specifiek voor de sector van het ontwerp (niet ‘all’ of de generieke standaardvariant)? */
  sectorSpecific(s, st = S()) {
    const sec = (st.meta || {}).sector || "generic";
    return !!s && sec !== "generic" && !ScenarioEngine.sectorsOf(s).includes("generic") && ScenarioEngine.sectorsOf(s).includes(sec);
  },
  sectorName(st = S()) { const sec = (st.meta || {}).sector || "generic"; return ((CATALOG.sectors || []).find((x) => x[0] === sec) || [sec, sec])[1]; },
  /** Filter op sector: "" = alles, "base" = algemene scenario’s, "sector" = sectorspecifiek. */
  bySector(rs, st = S()) {
    const k = UI.scnSector || "";
    if (!k) return rs;
    const spec = (r) => !this.isCustom(r.scn) && this.sectorSpecific(r.scn, st);
    return rs.filter((r) => spec(r) === (k === "sector"));
  },
  filtered(st) {
    const all = this.bySector(this.results(st), st);
    return UI.scnChannel ? all.filter((r) => r.scn.channel === UI.scnChannel) : all;
  },
  scoreOf(rs) {
    const c = rs.filter((x) => !x.ambiguous && !x.uncertain);
    const pts = sum(c.map((x) => (x.status === "pass" ? 1 : x.status === "partial" ? 0.5 : 0)));
    return { pct: c.length ? Math.round((pts / c.length) * 100) : 0, pass: c.filter((x) => x.status === "pass").length, partial: c.filter((x) => x.status === "partial").length, fail: c.filter((x) => x.status === "fail").length, total: c.length, excluded: rs.length - c.length };
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
    if (r.uncertain) return ["neutral", "info", "Onzeker", "Niet gemodelleerd: het label is geschat zonder gekoppelde informatietypen of trefwoorden. Kies het label; tot die tijd telt dit scenario niet mee."];
    if (r.ambiguous) return ["neutral", "info", "Label kiezen", "Meerdere labels mogelijk. Kies het label; tot die tijd telt dit scenario niet mee."];
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
  /** Zwaarste DLP-regel die vuurt (bij gelijke zwaarte de beslissende regel). */
  topHit(r) {
    const fired = (r.dlp || []).filter((h) => h && h.fired && h.rule);
    const top = fired.reduce((a, h) => (!a || (h.level || 0) > (a.level || 0) ? h : a), null);
    const rn = this.ruleName(r);
    return fired.find((h) => h.rule.name === rn && (h.level || 0) >= ((top || {}).level || 0)) || top;
  },
  actShort(h) {
    const a = (h.rule || {}).actions || {}, n = (h.rule || {}).notify || {};
    if (h.domain === "endpoint") return { block: "blokkeren", warn: "blokkeren met override", audit: "alleen audit" }[h.epLevel] || "audit";
    if (h.domain === "copilot") return h.prompt ? (h.web ? "geen web search" : h.level >= 4 ? "prompt tegenhouden" : "alleen audit") : h.sim ? "alleen audit" : "uitsluiten van Copilot";
    if (h.block) return n.override ? "blokkeren met override" : "blokkeren";
    if (a.encrypt) return "versleutelen";
    return n.tip ? "policy tip" : "alleen audit";
  },
  /** De invoer die de uitkomst bepaalt: label, herkende informatietypen, DLP-regel/actie en locatie. */
  inputs(r, st) {
    const s = r.scn, c = s.content || {}, L = r.label ? labelFullName(r.label, st) : "";
    const lab = c.prompt ? "geen (prompt)" : !r.label ? "geen label beschikbaar"
      : r.ambiguous ? "nog kiezen"
        : c.unlabeled ? (!r.labelApplied ? "geen (blijft ongelabeld)" : r.recommended ? `${L} (aanbevolen)` : `${L} (auto-labeling)`)
          : `${L}${r.uncertain ? " (geschat – kies het label)" : r.autoPicked ? " (automatisch gekozen – controleer)" : ""}`;
    const want = c.sits || [], found = st.sits.filter((x) => want.includes(ScenarioEngine.sitRef(x)));
    const h = this.topHit(r);
    const to = s.channel === "endpoint" ? ScnPath.actName(s.activity) : CATALOG.scenarioRecipients[s.recipient] || s.recipient || "";
    return [
      ["Label", lab],
      ["Informatietypen", found.length ? ScnPath.sitNames(found).join(", ") : want.length ? "niet in het ontwerp" : "geen"],
      ["DLP", ["container", "meeting"].includes(s.channel) ? "n.v.t." : h ? `‘${h.rule.name}’: ${this.actShort(h)}` : "geen regel van toepassing"],
      ["Locatie", `${SCNP_LOC[s.channel] || s.channel}${to ? ` → ${to}` : ""}`],
    ];
  },
  inputsHtml(r, st) {
    return `<dl class="scn-inputs" aria-label="Invoer die de uitkomst bepaalt">${this.inputs(r, st).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`;
  },
  /** Beoordelingssoort voor telling en accentkleur: ok · weak (te zwak) · over (strenger dan nodig) · unsure. */
  kind(r) {
    if (r.uncertain || r.ambiguous) return "unsure";
    if (r.status === "pass") return "ok";
    return r.over ? "over" : "weak";
  },
  tally(rs) {
    const t = { ok: 0, weak: 0, over: 0, unsure: 0 };
    rs.forEach((r) => { t[this.kind(r)]++; });
    return t;
  },
  /** Microsoft-apps voor een scenario (Edge erbij bij browseractiviteiten op het apparaat). */
  logos(s) {
    const a = (SCN_LOGO[s.channel] || ["purview"]).slice();
    if (s.channel === "endpoint" && ["cloud", "paste"].includes(s.activity)) a.push("edge");
    return a;
  },
  chClass(k) { return Object.hasOwn(SCN_LOGO, k) ? `ch-${k}` : "ch-other"; },
  /** Is de inhoud in dit scenario versleuteld (label-encryptie of DLP ‘versleutelen’)? */
  encrypted(r) {
    return (r.steps || []).some((x) => x && /\bversleuteld\b|Encrypt-Only|Do Not Forward|Double Key|^Encryptie:/i.test(x.text || ""));
  },
  sensHtml(s) {
    const n = Math.max(0, Math.min(4, Number((s.content || {}).sens) || 0)), t = `Gevoeligheid: ${SCN_SENS[n]}`;
    return `<span class="scn-sens sv-${n}" role="img" aria-label="${esc(t)}" title="${esc(t)}">${[1, 2, 3, 4].map((i) => `<i class="${i <= n ? "on" : ""}"></i>`).join("")}<span class="scn-sens-t">${esc(SCN_SENS[n])}</span></span>`;
  },
  /** Uitkomstbadges voor een afgespeeld scenario. */
  obHtml(r) {
    if (r.uncertain) return `<span class="scn-ob ob-unsure">${icon("info", "s")} Onzeker – niet gemodelleerd</span>`;
    const o = this.outcome(r), b = (k) => `<span class="scn-ob ob-${k}">${icon(SCN_OB[k][1], "s")} ${esc(SCN_OB[k][0])}</span>`;
    return b(o) + (this.encrypted(r) ? b("enc") : "");
  },
  card(r, st, apl = applicableLabels(st)) {
    const s = r.scn, ch = CATALOG.scenarioChannels[s.channel] || { name: s.channel, icon: "info" };
    const played = this.played(s.id), sid = esc(s.id);
    const res = (st.scenarioResults || {})[s.id] || {};
    const ov = res.labelId && apl.some((l) => l.id === res.labelId);
    const prompt = s.content.prompt;
    const custom = this.isCustom(s);
    const pick = (!!r.ambiguous || !!r.uncertain) && !ov;
    let lblSel = "";
    if (!prompt) {
      const auto = (() => { if (!ov) return r.label; const tmp = { ...st, scenarioResults: {} }; try { return ScenarioEngine.pickLabel(s, tmp); } catch (e) { return null; } })();
      const opts = [["", `Automatisch${auto ? ` (${labelFullName(auto, st)})` : ""}`], ...apl.map((l) => [l.id, labelFullName(l, st)])];
      lblSel = `<div class="vb-scn-lbl scn-lbl${pick ? " vb-amb" : ""}"><span class="scn-k" aria-hidden="true">Label</span>${VH.aria(F.select(`st:scenarioResults.${s.id}.labelId`, "", opts, { cls: "mb-0" }), "Label van de inhoud")}${pick ? `<span class="badge warn">Kies het label</span>` : ""}</div>`;
    }
    const [vc, vi, vt, vd] = this.verdict(r);
    const pred = res.predict || "";
    const meta = s.channel === "endpoint" ? ScnPath.actName(s.activity) : CATALOG.scenarioRecipients[s.recipient] || s.recipient || "";
    const logos = this.logos(s);
    const band = `<div class="scn-band"><span class="scn-alogos">${logos.map((a, i) => msLogo(a, i ? "scn-alogo scn-alogo-2" : "scn-alogo")).join("")}</span><span class="scn-chan"><span class="scn-chan-n">${esc(SCN_CH_SHORT[s.channel] || ch.name)}</span><span class="scn-chan-to">${esc(meta)}</span></span>${this.sensHtml(s)}</div>`;
    const secB = this.sectorSpecific(s, st) && !custom ? `<span class="scn-secb">${esc(this.sectorName(st))}</span>` : "";
    const head = `${band}<div class="scn-head"><div class="scn-ttl"><h3 class="scn-title" title="${esc(s.persona || "")}">${esc(s.title)}</h3><div class="xs muted">${secB}${custom ? `<span class="scn-own">Eigen scenario</span>` : ""}${s.persona ? `${custom ? " · " : ""}${esc(s.persona)}` : ""}${s.content.unlabeled ? `${custom || s.persona ? " · " : ""}nog geen label` : ""}</div></div>${played ? `<span class="stamp badge ${esc(vc)}">${icon(vi, "s")}${esc(vt)}</span>` : ""}</div>`;
    const story = `<p class="sc-story" title="${esc(s.story)}">${typeof prompt === "string" && prompt ? `“${esc(prompt)}”` : esc(s.story)}</p>`;
    const own = custom ? this.customBtns(sid) : "";
    const cc = this.chClass(s.channel);
    const why = this.why(s), exT = (s.expect || {}).text || "";
    if (!played) {
      const tip = [exT, why ? `Waarom: ${why}` : ""].filter(Boolean).join(" ");
      const goal = `<div class="scn-outrow"><span class="scn-ob ob-goal" title="Gewenste bescherming">${icon("target", "s")} Gewenst: ${esc(this.expectText(s))}</span>${tip ? infoTip(tip) : ""}</div>`;
      const chips = `<div class="vb-pred scn-pred" role="group" aria-label="Voorspelling voor ${esc(s.title)}"><span class="scn-k">Voorspel</span>${Object.entries(SCN_PRED).map(([k, [t]]) => `<button type="button" class="chip sm${pred === k ? " on" : ""}" data-action="scn-predict" data-id="${sid}" data-v="${k}" aria-pressed="${pred === k}">${esc(t)}</button>`).join("")}</div>`;
      return `<article class="scenario-card scn-card scn-open ${cc}${custom ? " scn-custom" : ""}" data-scn="${sid}">${head}<div class="scn-body">${story}${goal}${lblSel}${chips}${this.talk(s)}</div>
        <div class="scn-foot">${own}<span class="spacer"></span><button class="btn small primary scn-playbtn" data-action="scn-play" data-id="${sid}">${icon("play", "s")} Speel af</button></div></article>`;
    }
    const out = this.outcome(r);
    const unsure = !!r.uncertain;
    const predRes = pred && !unsure && SCN_PRED[pred] ? (pred === out ? `<span class="vb-pred-ok">${icon("check", "s")} Jullie voorspelling klopte</span>` : `<span class="vb-pred-diff">${icon("info", "s")} Anders dan verwacht (voorspeld: ${esc(SCN_PRED[pred][0])})</span>`) : "";
    const outChip = this.obHtml(r);
    const rows = this.inputs(r, st).filter(([k]) => k !== "Label" || prompt || s.content.unlabeled);
    const dl = `<dl class="scn-inputs" aria-label="Invoer die de uitkomst bepaalt">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`;
    return `<article class="scenario-card scn-card scn-done ${cc} ${esc(r.status)} k-${this.kind(r)}${unsure ? " unsure" : ""}${custom ? " scn-custom" : ""}" data-scn="${sid}">${head}<div class="scn-body">
      <div class="scn-outrow scn-res-row" aria-label="Wat merkt de medewerker?">${outChip}${predRes ? `<span class="xs scn-predres">${predRes}</span>` : ""}</div>${story}${lblSel}
      <div class="sc-result">
        <div class="xs scn-lv"><span>Bereikt</span> ${levelChip(r.lv)} <span><span class="muted">· Gewenst:</span> <b>${esc(this.expectText(s))}</b></span> ${infoTip(`${vd}${exT ? ` Gewenst: ${exT}` : ""}`)}</div>
        ${why ? `<p class="xs scn-why"><b>Waarom:</b> ${esc(why)}</p>` : ""}
        ${dl}
      </div>${this.talk(s)}</div>
      <div class="scn-foot"><button class="btn small scn-pathbtn" data-action="scn-path" data-id="${sid}">${icon("route", "s")} Bekijk het pad</button>${r.label ? `<button class="btn small subtle" data-action="pv-open" data-label="${esc(r.label.id)}" data-app="${esc(SCN_PV_APP[s.channel] || "")}" title="Zo ziet de gebruiker het" aria-label="Zo ziet de gebruiker het">${icon("eye", "s")}</button>` : ""}<span class="spacer"></span>${own}<button class="btn small subtle" data-action="scn-play" data-id="${sid}" title="Opnieuw afspelen" aria-label="Opnieuw afspelen">${icon("undo", "s")}</button></div>
    </article>`;
  },
  /** Optionele bespreekpunten (risico, afwegingen, uitzonderingen, valideren) – standaard ingeklapt. */
  talk(s) {
    const lst = (k) => (Array.isArray(s[k]) ? s[k].filter((x) => typeof x === "string" && x) : []);
    const parts = [["Risico", s.risk ? [s.risk] : []], ["Afwegingen", lst("options")], ["Uitzonderingen", lst("exceptions")], ["Valideren", lst("validate")]].filter(([, v]) => v.length);
    if (!parts.length) return "";
    return `<details class="vb-mini sc-talk" data-acc="sct-${esc(s.id)}"><summary class="xs">${icon("chat", "s")} Bespreekpunten</summary><dl class="sc-talk-dl">${parts.map(([t, v]) => `<dt>${esc(t)}</dt><dd>${v.length === 1 ? esc(v[0]) : `<ul>${v.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`}</dd>`).join("")}</dl></details>`;
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
    if (!title) return fieldError($("#csc-title", m), "Geef het scenario een titel.");
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

/* ---------- ‘Bekijk het pad’: het volledige pad van één scenario, fase voor fase ---------- */
const SCNP_STAGES = [
  { key: "actor", name: "Medewerker", icon: "user" },
  { key: "detect", name: "Herkenning", icon: "fingerprint" },
  { key: "label", name: "Label", icon: "tag" },
  { key: "protect", name: "Bescherming", icon: "lock" },
  { key: "dlp", name: "DLP-controle", icon: "shield" },
  { key: "outcome", name: "Uitkomst", icon: "flag" },
  { key: "audit", name: "Melding & audit", icon: "bell" },
];
const SCNP_ST = { ok: ["In orde", "✓"], info: ["Goed om te weten", "i"], warn: ["Let op", "!"], block: ["Tegengehouden", "✕"], skip: ["n.v.t.", "–"] };
const SCNP_PILL_IC = { ok: "checkcircle", info: "info", warn: "warning", block: "xcircle" };
const SCNP_RANK = { skip: 0, info: 1, ok: 2, warn: 3, block: 4 };
const SCNP_ADDR = { internal: "collega@organisatie.nl", external: "j.jansen@extern-bedrijf.nl", partner: "contact@partner.nl", anyone: "Iedereen met de link", guest: "gast@extern-bedrijf.nl" };
const SCNP_LOC = { exchange: "Exchange email", sharing: "SharePoint sites, OneDrive accounts", teams: "Teams chat and channel messages", endpoint: "Devices", copilot: "Microsoft 365 Copilot and Copilot Chat", container: "Groups & sites (container labels)", meeting: "Teams meetings (Teams Premium)" };
/* Korte samenvatting (2–4 woorden) per fase: eerste patroon dat past op de zwaarste stap. */
const SCNP_SUM = {
  protect: [[/Do Not Forward: doorsturen is niet/, "Doorsturen geblokkeerd"], [/Do Not Forward/, "Niet doorsturen"], [/Encrypt-Only/, "Alleen versleuteld"], [/kan het bericht niet openen|kan het niet openen/, "Ontvanger kan niet openen"], [/buiten de doelgroep kunnen niet openen/, "Alleen doelgroep opent"], [/partnerdomein heeft rechten/, "Partner kan openen"], [/ontvanger kan openen met de rechten/, "Versleuteld, wel leesbaar"], [/geen PRINT-recht/, "Afdrukken niet toegestaan"], [/watermerk van het label/, "Watermerk op afdruk"], [/Double Key/, "Copilot kan niet lezen"], [/zonder EXTRACT/, "Copilot vat niet samen"], [/Copilot gebruikt de inhoud alleen/, "Alleen voor doelgroep"], [/EXTRACT-recht: Copilot kan/, "Versleuteld, wel bruikbaar"], [/gast kan niet worden toegevoegd/, "Gast niet toegestaan"], [/Only people in your organization/, "Alleen intern delen"], [/staat gasten toe/, "Gasten toegestaan"], [/Gasten zijn uitgesloten/, "Gasten uitgesloten"], [/Privacy wordt afgedwongen/, "Privé afgedwongen"], [/Public/, "Open voor iedereen"], [/Privacy ‘None’/, "Eigenaar kiest privacy"], [/Lobby: alleen/, "Externe wacht in lobby"], [/Lobby niet afgedwongen/, "Lobby niet afgedwongen"], [/Lobby-bypass/, "Lobby ingesteld"], [/organisator presenteert/, "Organisator houdt regie"], [/Teams Premium/, "Extra vergaderbeveiliging"], [/Chat kan niet worden gekopieerd/, "Chat niet kopiëren"], [/zelf personen en rechten/, "Rechten door medewerker"], [/Any authenticated/, "Aanmelden vereist"], [/visuele markering/, "Markering toegevoegd"], [/extern delen:/, "Site-instelling geldt"], [/Onbeheerde apparaten/, "Onbeheerde apparaten beperkt"]],
  dlp: [[/geblokkeerd voor iedereen/, "Geblokkeerd voor iedereen"], [/overrulen|geblokkeerd met override/, "Blokkade met override"], [/geblokkeerd voor externen/, "Geblokkeerd voor extern"], [/Anyone-link geblokkeerd/, "Anyone-link geblokkeerd"], [/: ‘.*’ geblokkeerd\./, "Actie geblokkeerd"], [/automatisch versleuteld/, "Automatisch versleuteld"], [/niet verwerkt door Copilot/, "Prompt tegengehouden"], [/niet naar web search/, "Geen web search"], [/Prevent Copilot/, "Copilot slaat over"], [/policy tip getoond/, "Waarschuwing getoond"], [/geaudit|wordt gelogd|gerapporteerd/, "Alleen vastgelegd"], [/herkent de informatie in dit bericht niet/, "Regel herkent niets"], [/Geen .*DLP-regel|Geen Copilot-DLP-regel/, "Geen regel van toepassing"], [/blokkeert alleen Anyone-links|niet van toepassing|niet gecontroleerd/, "Niet van toepassing"]],
};

const ScnPath = {
  cur: null,
  techOpen: false,
  delay: 1200,
  K2S: { ok: "ok", info: "info", warn: "warn", block: "block" },

  /* ---------- Model ---------- */
  worst(steps) { return (steps || []).reduce((a, p) => { const s = this.K2S[p.kind] || "info"; return SCNP_RANK[s] > SCNP_RANK[a] ? s : a; }, "skip"); },
  pickSum(steps, table, fb) {
    const sorted = (steps || []).map((p, i) => [p, i]).sort((a, b) => (SCNP_RANK[this.K2S[b[0].kind]] || 0) - (SCNP_RANK[this.K2S[a[0].kind]] || 0) || a[1] - b[1]).map((x) => x[0]);
    for (const p of sorted) for (const [re, t] of table) if (re.test(p.text || "")) return t;
    return fb;
  },
  short(s) { try { return Generator.sitAliases([s])[0] || s.name; } catch (e) { return s.name; } },
  sitNames(sits) { return unique((sits || []).filter(Boolean).map((s) => this.short(s))); },
  actName(k) { const a = CATALOG.endpointActivities.find((x) => x.key === k); return a ? a.nl || a.name : String(k || "actie"); },
  ctx(r, st) {
    const s = r.scn, c = s.content || {}, l = r.label;
    const want = c.sits || [];
    const found = st.sits.filter((x) => want.includes(ScenarioEngine.sitRef(x)));
    const have = new Set(found.map((x) => ScenarioEngine.sitRef(x)));
    const missing = want.filter((x) => !have.has(x)).map((ref) => { const b = (CATALOG.builtinSits || []).find((y) => y.id === ref); return { ref, name: b ? b.name : String(ref) }; });
    const fired = (r.dlp || []).filter((h) => h.fired);
    const rn = ScnUI.ruleName(r);
    const top = fired.reduce((a, h) => (!a || (h.level || 0) > (a.level || 0) ? h : a), null);
    const hit = fired.find((h) => (h.rule || {}).name === rn && (h.level || 0) >= ((top || {}).level || 0)) || top;
    const file = `${String(s.title || "Document").replace(/[\\/:*?"<>|]/g, "").trim().slice(0, 60) || "Document"}.docx`;
    const prompt = !!c.prompt;
    return {
      r, s, st, l, c, prompt, found, missing, fired, hit, file,
      app: SCN_PV_APP[s.channel] || "office", who: s.persona || "De medewerker",
      pill: l && r.labelApplied ? Previews.pill(l, st) : Previews.noPill(),
      out: ScnUI.outcome(r), rec: s.recipient || "external", to: SCNP_ADDR[s.recipient] || SCNP_ADDR.external,
      promptText: typeof c.prompt === "string" ? c.prompt : prompt ? `Schrijf een brief voor deze klant${found.length ? ` (${this.sitNames(found).join(", ")} staat in de tekst)` : ""}.` : `Vat ‘${s.title}’ samen.`,
    };
  },
  model(r, st) {
    const x = this.ctx(r, st), by = {};
    SCNP_STAGES.forEach((g) => (by[g.key] = []));
    const seen = new Set();
    (r.steps || []).forEach((p) => { const k = p.kind + "|" + p.text; if (seen.has(k)) return; seen.add(k); (by[p.stage] || by.outcome).push(p); });
    x.by = by;
    return SCNP_STAGES.map((g) => {
      let o;
      try { o = this["st_" + g.key](x, by[g.key]); } catch (e) { console.error(e); o = { status: "info", sum: "Zie stappen", explain: "", mock: Previews.sceneNone("Voorbeeld kon niet worden gemaakt."), tech: [] }; }
      return { ...g, steps: by[g.key], tech: [], ...o };
    });
  },
  skip(sum, text, mock) { return { status: "skip", sum, explain: `<p>${text}</p>`, mock: Previews.sceneNone(mock || "In deze stap gebeurt niets dat de medewerker merkt."), tech: [] }; },

  /* ---------- Fasen ---------- */
  st_actor(x) {
    const s = x.s, ch = CATALOG.scenarioChannels[s.channel] || { name: s.channel, icon: "info" };
    const sum = {
      exchange: x.c.forward ? "Stuurt mail door" : { internal: "Mailt een collega", partner: "Mailt een partner" }[x.rec] || "Mailt naar extern",
      sharing: x.rec === "anyone" ? "Deelt via link" : x.rec === "internal" ? "Deelt met collega" : "Deelt met extern",
      teams: x.rec === "internal" ? "Stuurt chatbericht" : "Chat met extern",
      endpoint: { usb: "Kopieert naar USB", print: "Drukt af", cloud: "Uploadt naar website", paste: "Plakt in browser", clipboard: "Kopieert naar klembord", network: "Kopieert naar netwerkmap", bluetooth: "Verstuurt via Bluetooth", rdp: "Kopieert naar RDP-sessie", apps: "Opent in andere app" }[s.activity] || "Actie op apparaat",
      copilot: x.prompt ? "Typt een prompt" : "Vraagt Copilot",
      container: x.rec === "guest" ? "Nodigt gast uit" : "Maakt team aan",
      meeting: "Plant vergadering",
    }[s.channel] || "Start de actie";
    const sitsTxt = x.found.length || x.missing.length ? [...this.sitNames(x.found), ...x.missing.map((m) => m.name)].join(", ") : "geen herkenbare gevoelige gegevens";
    const facts = [
      ["Kanaal", ch.name],
      [s.channel === "endpoint" ? "Actie" : "Naar", s.channel === "endpoint" ? this.actName(s.activity) : CATALOG.scenarioRecipients[x.rec] || x.rec],
      ["Inhoud", `${sitsTxt}${x.c.unlabeled ? " · nog geen label" : ""}`],
      ["Gewenst", `${ScnUI.expectText(s)}${(s.expect || {}).text ? ` – ${s.expect.text}` : ""}`],
      ...(ScnUI.why(s) ? [["Waarom", ScnUI.why(s)]] : []),
    ];
    const explain = `<p><b>${esc(x.who)}</b>: ${esc(s.story || s.title)}</p><dl class="scnp-facts">${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>`;
    const pre = x.l && !x.c.unlabeled && !x.prompt ? Previews.pill(x.l, x.st) : Previews.noPill();
    const mock = {
      exchange: () => Previews.sceneMail({ to: x.to, subj: s.title, body: s.story, pillHtml: pre, attach: x.c.forward ? "" : x.file }),
      sharing: () => Previews.sceneShare({ file: x.file, to: x.to, anyone: x.rec === "anyone", pillHtml: pre }),
      teams: () => Previews.sceneChat({ title: x.rec === "internal" ? "Chat met een collega" : "Chat met een externe gast", text: s.story, state: "draft" }),
      endpoint: () => Previews.sceneToast({ level: "action", title: { print: "Afdrukken", usb: "Verkenner", network: "Verkenner", bluetooth: "Bluetooth", rdp: "Extern bureaublad", clipboard: "Klembord", apps: "Openen met…" }[s.activity] || "Browser", text: `${this.actName(s.activity)}: ‘${x.file}’…` }),
      copilot: () => Previews.sceneCopilot({ prompt: x.promptText, kind: "wait" }),
      container: () => Previews.sceneSite({ name: "Project", pillHtml: pre, facts: [[x.rec === "guest" ? "users" : "plus", x.rec === "guest" ? "Lid toevoegen" : "Nieuw team aanmaken", x.rec === "guest" ? x.to : ""]] }),
      meeting: () => Previews.sceneSite({ app: "teams", name: "Overleg met externe partij", pillHtml: pre, facts: [["meeting", "Nieuwe vergadering", "vandaag 14:00"], ["users", "Deelnemers", `collega’s + ${SCNP_ADDR.external}`]] }),
    }[s.channel];
    const tech = [{ rows: [["Locatie (location)", SCNP_LOC[s.channel] || s.channel], s.channel === "endpoint" ? ["Activiteit (activity)", (CATALOG.endpointActivities.find((a) => a.key === s.activity) || {}).name || s.activity] : null, ["Ontvanger", { internal: "Binnen de organisatie (InOrganization)", anyone: "Anyone-link (PerAnonymousUser)" }[x.rec] || "Buiten de organisatie (NotInOrganization)"], ["Gewenst niveau", `${(s.expect || {}).min || 0} – ${ScnUI.expectText(s)}`]].filter(Boolean) }];
    return { status: "info", sum, explain, mock: mock ? mock() : Previews.sceneNone(), tech };
  },
  st_detect(x) {
    const want = x.c.sits || [];
    if (!want.length) return this.skip("Niets te herkennen", "In dit scenario zitten geen herkenbare gevoelige gegevens zoals een BSN of IBAN. Purview hoeft hier dus niets te herkennen; de bescherming hangt af van het label.", "Geen gevoelige gegevens in deze inhoud.");
    const names = this.sitNames(x.found);
    const status = x.found.length && !x.missing.length ? "ok" : "warn";
    const sum = !x.found.length ? "Niet in ontwerp" : x.missing.length ? "Deels herkend" : names.join(", ").length <= 18 ? `${names.join(", ")} herkend` : `${x.found.length} typen herkend`;
    const uses = x.found.map((s) => {
      const ls = x.st.labels.filter((l) => (l.sits || []).includes(s.id)).map((l) => labelFullName(l, x.st));
      const rs = unique((x.r.dlp || []).filter((h) => (h.sits || []).includes(s)).map((h) => h.rule.name));
      const u = [ls.length ? `gekoppeld aan label ${ls.map((n) => `‘${n}’`).join(", ")}` : "aan geen label gekoppeld", rs.length ? `gebruikt in DLP-regel ${rs.map((n) => `‘${n}’`).join(", ")}` : ""].filter(Boolean).join(" · ");
      return `<li><b>${esc(this.short(s))}</b> – ${esc(u)}</li>`;
    }).join("");
    const explain = `${x.found.length ? `<p>Purview scant de inhoud en herkent: <b>${esc(names.join(", "))}</b>.</p><ul class="scnp-ul">${uses}</ul>` : `<p>De inhoud bevat gevoelige gegevens, maar die informatietypen staan niet in jullie ontwerp. Purview zoekt er dus niet naar.</p>`}
      ${x.missing.length ? `<p class="scnp-note warn">${icon("warning", "s")} Niet in het ontwerp: <b>${esc(x.missing.map((m) => m.name).join(", "))}</b>. Voeg ze toe bij Informatietypen als ze moeten worden herkend.</p>` : ""}
      ${x.c.unlabeled ? `<p class="xs muted">De inhoud heeft nog geen label. Alleen via deze informatietypen kan Purview hem automatisch labelen of met DLP beschermen.</p>` : ""}`;
    const mock = Previews.sceneSits({ file: x.prompt ? "Copilot-prompt" : x.file, text: x.prompt ? x.promptText : x.s.story, sits: [...x.found.map((s) => ({ name: this.short(s), found: true })), ...x.missing.map((m) => ({ name: m.name, found: false }))] });
    const al = x.l ? x.l.cfg.autolabel.client : null;
    const tech = [{ rows: [...x.found.map((s) => [this.short(s), `${s.name} · ${((CATALOG.sitKinds || {})[s.kind] || {}).short || s.kind || "SIT"}`]), ...x.missing.map((m) => [m.name, "Niet in het ontwerp – wordt niet herkend"]),
      x.c.unlabeled && al && al.mode !== "off" ? ["Auto-labeling (client)", `confidence ${EXPORT_NL.conf(al.confidence)} · min. ${al.minCount || 1} exemplaar`] : null].filter(Boolean) }];
    return { status, sum, explain, mock, tech };
  },
  st_label(x, steps) {
    if (x.prompt) return this.skip("Prompt heeft geen label", "Een prompt die de medewerker typt heeft geen gevoeligheidslabel. Alleen DLP voor Copilot kan hier ingrijpen, op basis van de informatietypen in de tekst.");
    if (!x.l) return { status: "block", sum: "Geen label beschikbaar", explain: "<p>Er is nog geen label dat medewerkers kunnen gebruiken. Maak eerst labels aan in het classificatieschema.</p>", mock: Previews.sceneNone("Geen label om te kiezen."), tech: [] };
    const r = x.r, l = x.l, st = x.st, name = labelFullName(l, st), nm = `<b>${esc(name)}</b>`;
    let status = this.worst(steps);
    if (status === "info" || status === "skip") status = "ok";
    const na = steps.some((p) => /niet beschikbaar/.test(p.text));
    const sum = r.ambiguous ? "Label kiezen" : r.uncertain ? "Label geschat" : na ? "Label niet beschikbaar" : !r.labelApplied ? "Blijft ongelabeld" : r.recommended ? "Label aanbevolen" : x.c.unlabeled ? "Automatisch gelabeld" : "Label aanwezig";
    const sits = esc(this.sitNames(x.found).join(", ") || "gevoelige gegevens");
    const explain = (r.ambiguous ? `<p>Er zijn meerdere afdelingslabels mogelijk. Kies op de scenariokaart welk label de medewerker gebruikt; tot die tijd telt dit scenario niet mee in de score.</p>` : "")
      + (na ? `<p>Het label ${nm} is niet ingesteld voor ${x.s.channel === "meeting" ? "vergaderingen" : "teams en sites"}. De eigenaar bepaalt dan zelf de instellingen.</p>`
        : !r.labelApplied ? `<p>De inhoud blijft zonder label: er is geen automatisch labelen dat hier ingrijpt. Alleen DLP-regels die op informatietypen letten kunnen nu nog beschermen.</p>`
          : r.recommended ? `<p>Office herkent ${sits} en <b>stelt</b> het label ${nm} voor. De medewerker kan de aanbeveling negeren; dan geldt alleen een DLP-regel op informatietypen.</p>`
            : x.c.unlabeled ? `<p>De inhoud had nog geen label. Purview herkent ${sits} en zet automatisch het label ${nm}.</p>`
              : `<p>De inhoud heeft het label ${nm}. Dat label bepaalt welke bescherming (versleuteling, markering) en welke DLP-regels gelden.</p>${r.autoPicked && !r.uncertain ? `<p class="xs muted">De tool koos dit label op basis van de inhoud. Kiest de medewerker in de praktijk een ander label? Kies het dan op de scenariokaart.</p>` : ""}`);
    const al = l.cfg.autolabel;
    const bars = r.recommended ? Previews.sceneBar("recommend", "Aanbevolen label", al.client.message || `Je organisatie raadt aan het label ‘${name}’ toe te passen.`, ["Gevoeligheid wijzigen", "Negeren"])
      : x.c.unlabeled && r.labelApplied ? Previews.sceneBar("auto", "Label automatisch toegepast", al.client.message || `Dit document is gelabeld als ‘${name}’.`)
        : !r.labelApplied ? Previews.sceneBar("none", "Geen label", "Er wordt geen label voorgesteld of toegepast.") : "";
    const pill = r.labelApplied && !r.recommended ? Previews.pill(l, st) : Previews.noPill();
    const mock = ["container", "meeting"].includes(x.s.channel) ? Previews.sceneSite({ app: x.s.channel === "meeting" ? "teams" : "spo", name: x.s.channel === "meeting" ? "Overleg met externe partij" : "Project", pillHtml: na ? Previews.noPill() : pill, barsHtml: na ? Previews.sceneBar("none", "Label niet beschikbaar", "Dit label kan niet op een team of vergadering worden gezet.") : "", facts: [] })
      : x.app === "outlook" && !x.c.unlabeled ? Previews.sceneMail({ to: x.to, subj: x.s.title, body: x.s.story, pillHtml: pill, foot: "none" })
        : Previews.sceneDoc({ file: x.file, pillHtml: pill, barsHtml: bars });
    let pol = null;
    try { pol = Generator.labelPolicies(st).find((p) => (p.labels || []).includes(l)) || null; } catch (e) { pol = null; }
    const sc = l.cfg.scope || {};
    const tech = [{ rows: [["Label", name], ["Technische naam", typeof labelTechName === "function" ? labelTechName(l, st) : name], ["Prioriteit", `${labelPriority(l, st) + 1} (hoger = strenger)`], ["Scope", [sc.files && "Files", sc.emails && "Emails", sc.sites && "Groups & sites", sc.meetings && "Meetings"].filter(Boolean).join(", ") || "—"], pol ? ["Labelbeleid (label policy)", pol.name] : null,
      ["Auto-labeling in Office (client)", { auto: "Automatically apply the label", recommend: "Recommend that the user apply the label", off: "Uit" }[al.client.mode] || al.client.mode], al.client.mode !== "off" ? ["Confidence / aantal", `${EXPORT_NL.conf(al.client.confidence)} · min. ${al.client.minCount || 1}`] : null,
      ["Service-side auto-labeling", al.service.enabled ? EXPORT_NL.autoMode(al.service.mode) : "Uit"]].filter(Boolean) }];
    return { status, sum, sub: name, explain, mock, tech };
  },
  st_protect(x, steps) {
    if (x.prompt) return this.skip("Niet van toepassing", "Een prompt heeft geen label; er is dus geen versleuteling of markering die meereist.");
    if (!x.l) return this.skip("Geen label, geen bescherming", "Zonder label is er geen versleuteling of markering.");
    if (!x.r.labelApplied && !steps.length) return this.skip("Geen label, geen bescherming", "De inhoud heeft geen label, dus er reist geen versleuteling of markering mee. Alleen DLP kan nog ingrijpen.");
    const name = labelFullName(x.l, x.st), nm = `<b>${esc(name)}</b>`, ch = x.s.channel;
    if (!steps.length) return this.skip("Geen versleuteling", `Het label ${nm} voegt voor dit kanaal geen versleuteling, markering of andere bescherming toe.`);
    const status = this.worst(steps);
    const sum = this.pickSum(steps, SCNP_SUM.protect, status === "block" ? "Toegang beperkt" : status === "warn" ? "Deels beschermd" : "Label beschermt");
    const f = Previews.facts(x.l, x.st);
    const lock = Previews._lockText(f);
    const blocked = status === "block";
    const explain = `<p>Het label ${nm} regelt de bescherming${["container", "meeting"].includes(ch) ? ` van ${ch === "meeting" ? "de vergadering" : "het team of de site"}` : " die met de inhoud meereist"}.${lock && !["container", "meeting"].includes(ch) ? ` ${lock}.` : ""}</p>${blocked ? `<p>Daardoor ${ch === "endpoint" ? "mag de medewerker dit niet" : ch === "container" ? "komt de gast er niet in" : "kan de ontvanger de inhoud niet openen"} – ook als het bericht of bestand wel aankomt.</p>` : ""}`;
    const ct = x.l.cfg.container, mt = x.l.cfg.meetings;
    const siteFacts = () => [["share", "Extern delen", (CATALOG.siteSharing.find((y) => y[0] === ct.sharing) || [0, ct.sharing])[1]], ["users", "Gasten toevoegen", ct.externalUserAccess ? "toegestaan" : "niet toegestaan"], ["lock", "Privacy", ct.privacy === "private" ? "Privé" : ct.privacy === "public" ? "Openbaar" : "eigenaar kiest"], ct.unmanaged !== "full" ? ["laptop", "Onbeheerde apparaten", ct.unmanaged === "block" ? "geblokkeerd" : "alleen web"] : null].filter(Boolean);
    const meetFacts = () => [["meeting", "Lobby", (CATALOG.meetingLobby.find((y) => y[0] === mt.lobbyBypass) || [0, mt.lobbyBypass])[1]], ["chat", "Chat kopiëren", mt.preventCopyChat ? "uit" : "toegestaan"], mt.e2ee ? ["lock", "End-to-end versleuteling", "aan"] : null, mt.watermarkScreen ? ["watermark", "Watermerk bij scherm delen", "aan"] : null].filter(Boolean);
    const deny = (what) => Previews.sceneBar("block", "Geen toegang", `Je hebt geen toestemming om ${what} te openen. Vraag de afzender om toegang.`);
    const mock = ch === "container" ? Previews.sceneSite({ name: "Project", pillHtml: x.pill, facts: siteFacts(), barsHtml: blocked ? Previews.sceneBar("block", "Gast kan niet worden toegevoegd", "Het label van dit team staat geen gasten toe.") : "" })
      : ch === "meeting" ? Previews.sceneSite({ app: "teams", name: "Overleg met externe partij", pillHtml: x.pill, facts: meetFacts() })
        : ch === "exchange" ? (blocked ? Previews.sceneMail({ foot: "inbox", from: x.who, subj: x.s.title, pillHtml: x.pill, lockedHtml: deny("dit bericht") }) : Previews.sceneMail({ to: x.to, subj: x.s.title, body: x.s.story, pillHtml: x.pill, barsHtml: lock ? Previews._bar("lock", "lock", lock) : "", foot: "none" }))
          : ch === "endpoint" ? (blocked ? Previews.sceneDoc({ file: x.file, pillHtml: x.pill, barsHtml: Previews.sceneBar("block", "Afdrukken niet toegestaan", "Je hebt geen afdrukrechten voor dit document.") }) : Previews.sceneDoc({ file: x.file, pillHtml: x.pill, wm: x.l.cfg.marking.watermark.enabled ? LabelDetail.resolve(x.l.cfg.marking.watermark.text || "", "W", f.c) : "" }))
            : blocked ? Previews.sceneDoc({ file: x.file, barsHtml: deny("dit bestand") })
              : Previews.sceneDoc({ file: x.file, pillHtml: x.pill, barsHtml: lock ? Previews._bar("lock", "lock", lock) : "" });
    const e = x.l.cfg.encryption, mk = x.l.cfg.marking;
    const rows = [["Encryption", e.mode === "assignNow" ? `Assign permissions now${e.dke ? " · Double Key Encryption" : ""}` : e.mode === "userDefined" ? `Let users assign permissions (Outlook: ${e.userDefined.outlook || "—"})` : "Geen"]];
    if (e.mode === "assignNow") rows.push(["Permissions", (e.permissions || []).map((p) => `${Mapping.principalName(p, x.st)} = ${Mapping.levelName(p.level)}`).join("; ") || "—"]);
    rows.push(["Content marking", [mk.header.enabled && `Header: ${mk.header.text}`, mk.footer.enabled && `Footer: ${mk.footer.text}`, mk.watermark.enabled && `Watermark: ${mk.watermark.text}`].filter(Boolean).join(" · ") || "Geen"]);
    if (ch === "container") rows.push(["Privacy", ct.privacy], ["External user access", ct.externalUserAccess ? "Aan" : "Uit"], ["External sharing", ct.sharing], ["Unmanaged devices", ct.unmanaged]);
    if (ch === "meeting") rows.push(["Lobby bypass", mt.lobbyBypass], ["Who can present", mt.presenters || "default"], ["Prevent copying chat", mt.preventCopyChat ? "Aan" : "Uit"], ["End-to-end encryption", mt.e2ee ? "Aan" : "Uit"]);
    return { status, sum, explain, mock, tech: [{ rows }] };
  },
  effect(h) {
    const a = (h.rule || {}).actions || {}, n = (h.rule || {}).notify || {};
    if (h.domain === "endpoint") return { block: "blokkeert de actie", warn: "blokkeert de actie, maar de medewerker kan doorgaan met een reden", audit: "legt de actie alleen vast; de medewerker merkt niets" }[h.epLevel] || "controleert deze actie niet";
    if (h.domain === "copilot") return h.prompt ? (h.web ? "zorgt dat Copilot met deze prompt niet op het web zoekt" : h.level >= 4 ? "zorgt dat Copilot de prompt niet verwerkt" : "rapporteert de prompt alleen") : h.sim ? "rapporteert alleen (simulatie)" : "zorgt dat Copilot deze items niet gebruikt in antwoorden";
    if (h.block === "all") return `blokkeert de toegang voor iedereen behalve de eigenaar${n.override ? " (doorgaan met een reden is mogelijk)" : ""}`;
    if (h.block === "anyone") return "blokkeert de toegang via de Anyone-link";
    if (h.block) return n.override ? "houdt de actie tegen, maar de medewerker kan doorgaan met een zakelijke reden" : "blokkeert de actie voor ontvangers buiten de organisatie";
    if (a.encrypt) return "versleutelt het bericht automatisch";
    if (a.blockAccess) return "blokkeert alleen Anyone-links; delen met deze ontvanger blijft mogelijk";
    return n.tip ? "toont een waarschuwing (policy tip); de actie gaat door" : "legt de actie alleen vast; de medewerker merkt niets";
  },
  because(h, x) {
    const c = (h.rule || {}).conditions || {};
    const what = h.via === "label" && x.l ? `het label <b>${esc(labelFullName(x.l, x.st))}</b> heeft` : `<b>${esc(this.sitNames(h.sits).join(", ") || "gevoelige informatie")}</b> bevat`;
    return what + (c.accessScope === "NotInOrganization" ? " en naar iemand buiten de organisatie gaat" : c.accessScope === "InOrganization" ? " en binnen de organisatie blijft" : "");
  },
  hitBar(h) {
    if (!h) return "";
    const a = (h.rule || {}).actions || {}, n = (h.rule || {}).notify || {}, tip = h.tip || n.tip || "";
    if (h.block) return n.override ? Previews.sceneBar("override", "Policy tip – actie nodig", tip || "Dit is in strijd met een beleid in je organisatie.", ["Overschrijven (met reden)", "Meer informatie"]) : Previews.sceneBar("block", "Geblokkeerd door beleid", tip || "Dit is in strijd met een beleid in je organisatie.", ["Meer informatie"]);
    if (a.encrypt) return Previews.sceneBar("encrypt", "Wordt versleuteld verzonden", tip);
    if (n.tip) return Previews.sceneBar("tip", "Policy tip", tip);
    return "";
  },
  hitTech(h) {
    const r = h.rule || {}, a = r.actions || {}, n = r.notify || {}, c = r.conditions || {}, p = h.policy || {};
    const acts = [];
    if (a.encrypt) acts.push(`Encrypt the message (${a.encrypt})`);
    if (a.blockAccess) acts.push(`Restrict access – block ${{ All: "everyone", PerUser: "only people outside your organization", PerAnonymousUser: "only people with the ‘Anyone with the link’ option" }[a.blockScope] || ""}`);
    (a.endpoint || []).filter((e) => e && (!h.activity || e.key === h.activity)).forEach((e) => acts.push(`Audit or restrict activities on devices – ${(CATALOG.endpointActivities.find((y) => y.key === e.key) || {}).name || e.key}: ${EXPORT_NL.level(e.level)}`));
    if (a.copilotExclude) acts.push(a.copilotScope === "web" ? "Prevent Copilot from processing content – web searches" : h.prompt ? "Prevent Copilot from processing prompts" : "Prevent Copilot from processing content");
    const cond = [c.labels && c.labels.length ? `Content contains › Sensitivity labels: ${c.labels.filter(Boolean).map((l) => labelFullName(l, S())).join(", ")}` : "", c.sits && c.sits.length ? `Content contains › Sensitive info types: ${c.sits.filter(Boolean).map((s) => s.name).join(", ")}` : ""].filter(Boolean).join("  OR  ") || r.desc || "";
    const exc = (r.exceptions || []).filter(Boolean).map((e) => `${e.key}: ${[].concat(e.value || []).join(", ")}`).join("; ");
    return {
      title: `${h.fired ? "✓" : "–"} ${r.name || p.name || "Regel"}`,
      rows: [["Policy", `${p.name || "—"}${p.mode ? ` · ${EXPORT_NL.dlpMode(p.mode)}` : ""}`], ["Rule", r.name || "—"], ["Conditions", cond || "—"], c.accessScope ? ["Content is shared", EXPORT_NL.scopes[c.accessScope] || c.accessScope] : null,
        c.sits && c.sits.length && (r.minCount || r.confidence) ? ["Instance count / confidence", `min. ${r.minCount || 1}${r.confidence ? ` · ${EXPORT_NL.conf(r.confidence)}` : ""}`] : null,
        ["Actions", acts.join("; ") || "Audit only"], ["User notifications", n.tip ? `Policy tip: “${h.tip || n.tip}”${n.email ? " + e-mail" : ""}` : n.email ? "E-mail aan gebruiker" : "Uit"],
        n.override ? ["User overrides", EXPORT_NL.overrides[n.override] || n.override] : null,
        n.alert && n.alert !== "none" ? ["Incident reports", `Alert · severity ${n.severity || "Low"}${n.incidentReport ? " · incidentrapport" : ""}`] : null,
        exc ? ["Exceptions", exc] : null,
        ["Resultaat", h.fired ? "Van toepassing – regel vuurt" : `Niet van toepassing – ${h.why || "conditie niet vervuld"}`]].filter(Boolean),
    };
  },
  st_dlp(x, steps) {
    const ch = x.s.channel;
    if (["container", "meeting"].includes(ch)) return this.skip("Geen DLP-controle", `Bij het ${ch === "meeting" ? "plannen van een vergadering" : "aanmaken van een team of het toevoegen van een gast"} speelt DLP geen rol; de instellingen van het label bepalen wat er mag.`);
    if (!steps.length) return this.skip("Geen DLP-controle", "Er is geen DLP-controle voor deze situatie.");
    let status = this.worst(steps);
    const h = x.hit, hits = x.r.dlp || [];
    if (h && h.domain === "copilot") status = h.sim ? "info" : h.level >= 4 ? "block" : h.level >= 2 ? "warn" : status;
    const sum = this.pickSum(steps, SCNP_SUM.dlp, status === "block" ? "Tegengehouden" : status === "warn" ? "Let op" : "Gecontroleerd");
    const notFired = hits.filter((y) => !y.fired);
    const sim = h && h.policy && /^simulation/.test(h.policy.mode || "") ? `<p class="scnp-note">${icon("info", "s")} Deze policy staat nu in <b>simulatie</b>: in werkelijkheid merkt de medewerker dit pas na het inschakelen. De score toetst het beoogde eindbeeld.</p>` : "";
    const explain = h
      ? `<p>DLP-regel <b>${esc(h.rule.name)}</b>${h.custom && h.policy ? ` (maatwerk-policy ‘${esc(h.policy.name)}’)` : ""} grijpt in, omdat de inhoud ${this.because(h, x)}. De regel <b>${esc(this.effect(h))}</b>.</p>${x.fired.length > 1 ? `<p>Er zijn ${x.fired.length} regels van toepassing; de strengste actie geldt.</p>` : ""}${sim}`
      : notFired.length ? `<p>Er zijn wel DLP-regels voor deze inhoud, maar ze gelden niet in deze situatie.</p>`
        : `<p>Geen enkele DLP-regel let ${ch === "copilot" ? "in Copilot" : "bij dit kanaal"} op ${x.prompt ? "deze informatietypen" : "dit label of deze informatietypen"}.${status === "warn" ? " Dit kan een gat in het ontwerp zijn." : ""}</p>`;
    const nf = notFired.length ? `<ul class="scnp-ul xs">${notFired.map((y) => `<li>‘${esc(y.rule.name)}’: ${esc(y.why || "niet van toepassing")}</li>`).join("")}</ul>` : "";
    let mock;
    if (ch === "exchange") mock = Previews.sceneMail({ to: x.to, subj: x.s.title, body: x.s.story, pillHtml: x.pill, barsHtml: this.hitBar(h), attach: x.c.forward ? "" : x.file });
    else if (ch === "sharing") mock = Previews.sceneShare({ file: x.file, to: x.to, anyone: x.rec === "anyone", pillHtml: x.pill, barsHtml: this.hitBar(h) });
    else if (ch === "teams") { const n = h ? (h.rule.notify || {}) : {}; mock = Previews.sceneChat({ title: x.rec === "internal" ? "Chat met een collega" : "Chat met een externe gast", text: x.s.story, state: h && h.block ? (n.override ? "override" : "blocked") : h && n.tip ? "tip" : "sent", tip: h ? h.tip || n.tip : "" }); }
    else if (ch === "endpoint") mock = Previews.sceneToast({ level: h ? h.epLevel || "audit" : "none", act: this.actName(x.s.activity), file: x.file, tip: h ? (h.rule.notify || {}).tip : "", options: (x.st.endpoint || {}).justificationOptions, note: h ? "" : "Geen melding: geen endpoint DLP-regel voor deze inhoud." });
    else if (ch === "copilot") mock = Previews.sceneCopilot({ prompt: x.promptText, file: x.file, pillHtml: x.pill, kind: x.prompt ? (h && h.web ? "web" : h && h.level >= 4 ? "promptBlocked" : "ok") : h && !h.sim ? "excluded" : "ok" });
    else mock = Previews.sceneNone();
    const tech = [...x.fired, ...notFired].map((y) => this.hitTech(y));
    return { status, sum, sub: h ? h.rule.name : "", explain: explain + nf, mock, tech };
  },
  st_outcome(x, steps) {
    const r = x.r, s = x.s, ch = s.channel, out = x.out, [vc, vi, vt, vd] = ScnUI.verdict(r);
    const status = r.uncertain ? "info" : out === "block" ? "block" : out === "tip" ? "warn" : "ok";
    const by = x.by, protBlock = (by.protect || []).some((p) => p.kind === "block"), h = x.hit;
    const sentence = out === "block" ? ({ exchange: protBlock && !(h && h.block) ? "Het bericht komt aan, maar de ontvanger kan het niet openen." : "Het bericht wordt niet verzonden.", sharing: "De ontvanger kan het bestand niet openen.", teams: "Het bericht komt niet aan bij de ontvanger.", endpoint: "De actie wordt tegengehouden.", copilot: x.prompt ? "Copilot verwerkt de prompt niet." : "Copilot gebruikt deze inhoud niet in het antwoord.", container: "De gast komt er niet in.", meeting: "De vergadering is goed afgeschermd: externen wachten in de lobby en kunnen niet alles." }[ch] || "De actie wordt tegengehouden.")
      : out === "tip" ? "De actie gaat door, maar de medewerker ziet eerst een melding (policy tip) of moet een reden opgeven."
        : `De actie gaat gewoon door${(by.protect || []).some((p) => p.kind === "ok") ? "; het label blijft de inhoud wel beschermen" : ""}.`;
    const met = r.status === "pass" ? "Voldoet" : r.over ? "Te streng" : "Voldoet niet";
    const pred = ((x.st.scenarioResults || {})[s.id] || {}).predict;
    const explain = `${r.uncertain ? `<p class="scnp-note warn">${icon("warning", "s")} Onzeker – niet gemodelleerd. Met het geschatte label zou dit gebeuren; kies het label voor een betrouwbare uitkomst.</p>` : ""}<p><b>Voor de medewerker:</b> ${esc(sentence)}</p>
      <div class="scnp-verdict ${vc}">${icon(vi, "s")} <b>${esc(vt)}</b> – ${esc(vd)}</div>
      <p class="xs">Bereikt: ${levelChip(r.lv)} · Gewenst: <b>${esc(ScnUI.expectText(s))}</b> → <b>${esc(met)}</b></p>
      ${(s.expect || {}).text ? `<p class="xs muted">Gewenst: ${esc(s.expect.text)}</p>` : ""}${ScnUI.why(s) ? `<p class="xs muted">Waarom: ${esc(ScnUI.why(s))}</p>` : ""}
      ${pred && SCN_PRED[pred] && !r.uncertain ? `<p class="xs">${pred === out ? `${icon("check", "s")} Jullie voorspelling (${esc(SCN_PRED[pred][0])}) klopte.` : `${icon("info", "s")} Jullie voorspelden ‘${esc(SCN_PRED[pred][0])}’.`}</p>` : ""}
      ${r.ambiguous ? `<p class="scnp-note warn">${icon("warning", "s")} Dit scenario telt pas mee als het label is gekozen.</p>` : ""}`;
    const other = (t) => Previews.sceneChatOther("Bij de ontvanger", t);
    const mock = {
      exchange: () => out === "block" && h && h.block && !(h.rule.notify || {}).override ? Previews.sceneMail({ foot: "inbox", from: "Microsoft Outlook", subj: `Niet afgeleverd: ${s.title}`, lockedHtml: Previews.sceneBar("block", "Bericht niet afgeleverd", "Je bericht is niet afgeleverd omdat het in strijd is met een beleid van je organisatie.") })
        : protBlock ? Previews.sceneMail({ foot: "inbox", from: x.who, subj: s.title, pillHtml: x.pill, lockedHtml: Previews.sceneBar("block", "Geen toegang", "Je hebt geen toestemming om dit bericht te openen.") })
          : Previews.sceneMail({ foot: "inbox", from: x.who, subj: s.title, body: s.story, pillHtml: x.r.labelApplied ? x.pill : "", barsHtml: (by.protect || []).some((p) => /Versleuteld|Do Not Forward|Encrypt-Only/.test(p.text)) || (h && (h.rule.actions || {}).encrypt) ? Previews.sceneBar("encrypt", "Versleuteld bericht", "Je kunt dit bericht lezen met je eigen account.") : "" }),
      sharing: () => out === "block" ? Previews.sceneDoc({ file: x.file, barsHtml: Previews.sceneBar("block", "Geen toegang", "Dit bestand is niet beschikbaar voor jou. Vraag de eigenaar om toegang.") }) : Previews.sceneDoc({ file: x.file, pillHtml: x.r.labelApplied ? x.pill : "" }),
      teams: () => Previews.sceneChat({ title: "Chat", text: s.story, state: out === "block" ? "blocked" : out === "tip" ? (h && h.block ? "override" : "tip") : "sent", tip: h ? h.tip || (h.rule.notify || {}).tip || "Dit bericht bevat mogelijk gevoelige informatie." : "Dit bericht bevat mogelijk gevoelige informatie.", otherHtml: out === "block" ? other(`<i>${icon("xcircle", "s")} Dit bericht is geblokkeerd vanwege gevoelige inhoud.</i>`) : other("Bericht ontvangen ✓") }),
      endpoint: () => out === "pass" ? Previews.sceneToast({ level: "ok", title: "Voltooid", text: `${this.actName(s.activity)}: ‘${x.file}’ is gelukt.` }) : Previews.sceneToast({ level: h ? h.epLevel || "block" : "block", act: this.actName(s.activity), file: x.file, tip: h ? (h.rule.notify || {}).tip : "", options: (x.st.endpoint || {}).justificationOptions }),
      copilot: () => Previews.sceneCopilot({ prompt: x.promptText, file: x.file, pillHtml: x.pill, kind: x.prompt ? (h && h.web ? "web" : r.lv >= 4 ? "promptBlocked" : "ok") : (by.protect || []).some((p) => /Double Key/.test(p.text)) ? "dke" : h && !h.sim && r.lv >= 4 ? "excluded" : (by.protect || []).some((p) => /zonder EXTRACT/.test(p.text)) ? "noextract" : "ok" }),
      container: () => Previews.sceneSite({ name: "Project", pillHtml: x.pill, barsHtml: out === "block" ? Previews.sceneBar("block", "Gast niet toegevoegd", "Dit team staat geen gasten toe.") : Previews.sceneBar("tip", "Team klaar", x.rec === "guest" ? "De gast is toegevoegd." : "Het team is aangemaakt."), facts: [] }),
      meeting: () => Previews.sceneSite({ app: "teams", name: "Overleg met externe partij", pillHtml: x.pill, barsHtml: (by.protect || []).some((p) => /Lobby: alleen/.test(p.text)) ? Previews.sceneBar("tip", "Iemand wacht in de lobby", `${SCNP_ADDR.external} wil deelnemen.`, ["Toelaten", "Weigeren"]) : Previews.sceneBar("none", "Vergadering gestart", "Iedereen komt direct binnen."), facts: [] }),
    }[ch];
    const tech = [{ rows: [["Bereikt niveau", `${r.lv} – ${ScnUI.lvName(r.lv)}`], ["Gewenst", ScnUI.expectText(s)], ["Status", `${r.status} · ${vt}`], ScnUI.ruleName(r) ? ["Beslissende regel", ScnUI.ruleName(r)] : null, ["Telt mee in score", r.ambiguous ? "Nee – label nog kiezen" : r.uncertain ? "Nee – label geschat (niet gemodelleerd)" : "Ja"]].filter(Boolean) }];
    return { status, sum: r.uncertain ? "Onzeker" : SCN_PRED[out][0], sub: r.uncertain ? "Niet gemodelleerd" : vt, explain, mock: mock ? mock() : Previews.sceneNone(), tech };
  },
  st_audit(x, steps) {
    if (!x.fired.length && !steps.length) return { ...this.skip("Niets vastgelegd", "Er grijpt geen DLP-regel in. Er komt dus geen DLP-melding in Activity explorer of in het alertsdashboard. Het wijzigen of toepassen van een label wordt wel in het auditlog vastgelegd."), mock: Previews.sceneAudit({ rows: [] }) };
    const alerts = x.fired.filter((h) => ((h.rule.notify || {}).alert || "none") !== "none");
    const top = alerts.reduce((a, h) => { const o = { Low: 1, Medium: 2, High: 3 }; return !a || (o[h.rule.notify.severity] || 0) > (o[a.rule.notify.severity] || 0) ? h : a; }, null);
    const email = x.fired.some((h) => (h.rule.notify || {}).email), ovr = x.fired.some((h) => (h.rule.notify || {}).override && h.block);
    const status = alerts.length ? "ok" : "info";
    const explain = `<p>Elke keer dat een DLP-regel ingrijpt, komt er een gebeurtenis (<i>DLP rule matched</i>) in <b>Activity explorer</b>. Zo ziet het securityteam wat er gebeurt, ook als de actie doorgaat.</p>
      ${top ? `<p>Beheerders krijgen een <b>alert</b> met ernst <b>${esc(top.rule.notify.severity || "Low")}</b> in het DLP-alertsdashboard${top.rule.notify.incidentReport ? " en een incidentrapport per e-mail" : ""}.</p>` : ""}
      ${email ? "<p>De medewerker krijgt ook een e-mail met uitleg.</p>" : ""}${ovr ? "<p>Kiest de medewerker ‘overschrijven’, dan wordt de opgegeven reden vastgelegd.</p>" : ""}`;
    const where = { exchange: "Exchange", sharing: "SharePoint", teams: "Teams", endpoint: "Apparaat", copilot: "Copilot" }[x.s.channel] || "Microsoft 365";
    const act = x.s.channel === "endpoint" ? ((CATALOG.endpointActivities.find((a) => a.key === x.s.activity) || {}).name || "DLP rule matched") : "DLP rule matched";
    const mock = Previews.sceneAudit({ title: top ? "DLP-waarschuwingen" : "Activity explorer", alert: top ? `Nieuwe waarschuwing: ${top.rule.name}` : "", alertKind: (top && top.rule.notify.severity) === "High" ? "block" : "tip", alertText: top ? `Ernst ${top.rule.notify.severity || "Low"} · ${x.who}` : "", rows: x.fired.map((h) => ({ act, rule: h.rule.name, user: x.who, where, sev: ((h.rule.notify || {}).alert || "none") !== "none" ? h.rule.notify.severity || "Low" : "" })) });
    const tech = [{ rows: [["Gebeurtenis", "DLPRuleMatch (Activity explorer)"], ["Waar te zien", "Microsoft Purview › Data loss prevention › Alerts / Activity explorer"], ...alerts.map((h) => [h.rule.name, `Alert · severity ${h.rule.notify.severity || "Low"}${h.rule.notify.incidentReport ? " · incident report" : ""}`])] }];
    return { status, sum: top ? "Alert naar beheer" : "Vastgelegd in log", explain, mock, tech };
  },

  /* ---------- Weergave ---------- */
  list() {
    const st = S();
    const ids = ScnUI.filtered(st).filter((r) => ScnUI.played(r.scn.id)).map((r) => r.scn.id);
    return ids.length ? ids : ScnUI.results(st).filter((r) => ScnUI.played(r.scn.id)).map((r) => r.scn.id);
  },
  techHtml(g) {
    if (!g.tech || !g.tech.length || !g.tech.some((t) => t.rows && t.rows.length)) return "";
    return `<details class="scnp-tech tech-only"${this.techOpen ? " open" : ""}><summary>${icon("code", "s")} Technische details <span class="xs muted">(Purview-termen)</span></summary>${g.tech.map((t) => `${t.title ? `<div class="scnp-ttitle">${esc(t.title)}</div>` : ""}<dl class="scnp-dl">${t.rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>`).join("")}</details>`;
  },
  pipeHtml(m, i) {
    return `<ol class="scnp-pipe" aria-label="Het pad in ${m.length} stappen">${m.map((g, k) => `<li class="scnp-node s-${g.status}${k === i ? " on" : ""}${k < i ? " done" : ""}"><button type="button" class="scnp-nbtn" data-action="scnp-go" data-i="${k}"${k === i ? ' aria-current="step"' : ""} aria-label="Stap ${k + 1}: ${esc(g.name)} – ${esc(g.sum)} (${SCNP_ST[g.status][0]})"><span class="scnp-ico" aria-hidden="true"><span class="scnp-halo"></span>${icon(g.icon)}<span class="scnp-glyph">${SCNP_ST[g.status][1]}</span></span><span class="scnp-name">${esc(g.name)}</span><span class="scnp-sum">${esc(g.status === "skip" ? `n.v.t. · ${g.sum}` : g.sum)}</span></button></li>`).join("")}</ol>`;
  },
  ctrlHtml(m, i) {
    const p = !!(this.cur && this.cur.timer);
    return `<div class="scnp-ctrl" role="group" aria-label="Door het pad stappen"><button type="button" class="btn small" data-action="scnp-prev"${i <= 0 ? " disabled" : ""}>${icon("chevronleft", "s")} Vorige</button><button type="button" class="btn small primary scnp-playbtn" data-action="scnp-play" aria-pressed="${p}">${icon(p ? "pause" : "play", "s")} ${p ? "Pauzeer" : "Afspelen"}</button><button type="button" class="btn small" data-action="scnp-next"${i >= m.length - 1 ? " disabled" : ""}>Volgende ${icon("chevronright", "s")}</button><span class="xs muted scnp-hint">of gebruik de pijltjestoetsen ← →</span></div>`;
  },
  detailHtml(m, i) {
    const g = m[i];
    // Opeenvolgende info-regels samen in één rustige callout ("Goed om te weten"), in de volgorde van het pad.
    const groups = [];
    g.steps.forEach((p) => { const last = groups[groups.length - 1]; if (p.kind === "info" && last && last.info) last.items.push(p); else groups.push({ info: p.kind === "info", items: [p] }); });
    const stepLi = (p) => `<li class="flow-step ${esc(p.kind)}"><span class="fs-dot" aria-hidden="true">${SCN_DOT[p.kind] || "•"}</span><span class="fs-t">${esc(p.text)}</span></li>`;
    const infoLi = (gr) => `<li class="flow-step info scnp-info"><span class="fs-dot" aria-hidden="true">${icon("info", "s")}</span><div class="scnp-info-b"><b class="scnp-info-k">Goed om te weten</b>${gr.items.length === 1 ? `<p class="scnp-info-t">${esc(gr.items[0].text)}</p>` : `<ul class="scnp-info-l">${gr.items.map((p) => `<li class="scnp-info-t">${esc(p.text)}</li>`).join("")}</ul>`}</div></li>`;
    const lines = g.steps.length ? `<div class="scnp-sub">Wat er gebeurt</div><ul class="scnp-lines">${groups.map((gr) => (gr.info ? infoLi(gr) : gr.items.map(stepLi).join(""))).join("")}</ul>` : "";
    return `<div class="scnp-detail s-${g.status}" data-stage="${esc(g.key)}"><div class="scnp-dhead"><span class="scnp-dico s-${g.status}" aria-hidden="true">${icon(g.icon)}</span><div class="scnp-dtitle"><div class="xs muted">Stap ${i + 1} van ${m.length}</div><h3>${esc(g.name)}: ${esc(g.sum)}</h3>${g.sub ? `<div class="xs muted scnp-dsub">${esc(g.sub)}</div>` : ""}</div><span class="scnp-pill s-${g.status}">${SCNP_PILL_IC[g.status] ? icon(SCNP_PILL_IC[g.status], "s") : `<span aria-hidden="true">${SCNP_ST[g.status][1]}</span>`}<span>${esc(SCNP_ST[g.status][0])}</span></span></div>
      <div class="scnp-dgrid"><div class="scnp-explain">${g.explain || ""}${lines}${this.techHtml(g)}</div>
      <div class="scnp-mock"><div class="scnp-sub">${icon("eye", "s")} Zo ziet de gebruiker het</div>${g.mock || ""}<div class="xs muted scnp-mfoot">Indicatief voorbeeld; de echte schermen verschillen per app-versie en taal.</div></div></div></div>`;
  },
  bodyHtml() {
    const c = this.cur, st = S(), r = ScnUI.results(st).find((y) => y.scn.id === c.ids[c.idx]);
    if (!r) return emptyState("play", "Scenario niet gevonden", "Speel eerst een scenario af.");
    const m = (c.model = this.model(r, st)), i = (c.stage = clamp(c.stage, 0, m.length - 1)), s = r.scn;
    const ch = CATALOG.scenarioChannels[s.channel] || { name: s.channel, icon: "info" }, [vc, vi, vt] = ScnUI.verdict(r);
    const n = c.ids.length;
    const top = `<div class="scnp-top ${ScnUI.chClass(s.channel)}"><span class="scn-alogos">${ScnUI.logos(s).map((a, i) => msLogo(a, i ? "scn-alogo scn-alogo-2" : "scn-alogo")).join("")}</span><div class="scnp-ttl"><b>${esc(s.title)}</b><div class="xs muted">${icon(ch.icon, "s")} ${esc(ch.name)}${s.recipient && s.channel !== "endpoint" ? ` · ${esc(CATALOG.scenarioRecipients[s.recipient] || s.recipient)}` : ""}${s.channel === "endpoint" ? ` · ${esc(this.actName(s.activity))}` : ""}${s.persona ? ` · ${esc(s.persona)}` : ""}</div>${ScnUI.inputsHtml(r, st)}</div><span class="badge ${vc} scnp-verd">${icon(vi, "s")} ${esc(vt)}</span>
      ${n > 1 ? `<div class="scnp-snav" role="group" aria-label="Ander scenario"><button type="button" class="btn small subtle" data-action="scnp-scn" data-d="-1"${c.idx <= 0 ? " disabled" : ""} aria-label="Vorig scenario">${icon("chevronleft", "s")}</button><span class="xs">Scenario ${c.idx + 1}/${n}</span><button type="button" class="btn small subtle" data-action="scnp-scn" data-d="1"${c.idx >= n - 1 ? " disabled" : ""} aria-label="Volgend scenario">${icon("chevronright", "s")}</button></div>` : ""}</div>`;
    return `<div class="scnp" data-id="${esc(s.id)}">${top}${this.pipeHtml(m, i)}${this.ctrlHtml(m, i)}<div class="scnp-live" aria-live="polite">${this.detailHtml(m, i)}</div></div>`;
  },
  title() {
    const c = this.cur, r = ScnUI.results(S()).find((y) => y.scn.id === c.ids[c.idx]);
    return `${icon("route")} Het pad${r ? ` · ${esc(r.scn.title)}` : ""}`;
  },
  open(id) {
    const ids = this.list();
    if (id && !ids.includes(id)) ids.unshift(id);
    if (!ids.length) { Toast.show("Speel eerst een scenario af; daarna kun je het pad bekijken.", "info"); return; }
    this.stop();
    this.cur = { ids, idx: Math.max(0, ids.indexOf(id || ids[0])), stage: 0, timer: null };
    const o = {
      title: this.title(), wide: true, body: this.bodyHtml(),
      buttons: [{ label: `${icon("printer", "s")} Afdrukken`, fn: () => { this.print(); return true; } }, { label: "Sluiten", primary: true, fn: () => { this.stop(); } }],
      after: (mEl) => {
        mEl.classList.add("scnp-modal");
        mEl.addEventListener("keydown", (e) => {
          if (e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName || "")) return;
          const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
          if (d) { e.preventDefault(); this.stop(); this.step(d, true); }
          else if (e.key === "Home" || e.key === "End") { e.preventDefault(); this.stop(); this.go(e.key === "Home" ? 0 : SCNP_STAGES.length - 1, true); }
        });
        mEl.addEventListener("toggle", (e) => { if (e.target && e.target.classList && e.target.classList.contains("scnp-tech")) this.techOpen = e.target.open; }, true);
      },
      focus: ".scnp-node.on .scnp-nbtn",
    };
    this._o = o;
    Modal.open(o);
  },
  _modal() { const m = $("#modal-root .modal.scnp-modal"); return m && Modal.cur === this._o ? m : null; },
  /** Werk pipeline/knoppen/detail bij zonder de modal opnieuw te openen (focus-trap blijft intact). */
  render(full, focusNode) {
    const mEl = this._modal();
    if (!mEl || !this.cur) { this.stop(); return; }
    const act = document.activeElement, fa = act && act.dataset ? act.dataset.action : "", onNode = fa === "scnp-go";
    if (full) {
      $(".modal-body", mEl).innerHTML = this.bodyHtml();
      const t = $("#modal-title", mEl); if (t) t.innerHTML = this.title();
    } else {
      const m = this.cur.model, i = (this.cur.stage = clamp(this.cur.stage, 0, m.length - 1));
      const rep = (sel, html) => { const el = $(sel, mEl); if (el) { const tmp = document.createElement("div"); tmp.innerHTML = html; el.replaceWith(tmp.firstElementChild); } };
      rep(".scnp-pipe", this.pipeHtml(m, i));
      rep(".scnp-ctrl", this.ctrlHtml(m, i));
      const live = $(".scnp-live", mEl); if (live) live.innerHTML = this.detailHtml(m, i);
    }
    a11yEnhance(mEl);
    const on = $(".scnp-node.on .scnp-nbtn", mEl);
    if (on && on.scrollIntoView) on.scrollIntoView({ block: "nearest", inline: "nearest" });
    let f = null;
    if (focusNode || onNode) f = on;
    else if (fa && fa !== "modal-btn") { f = $(`[data-action="${fa}"]${act.dataset.d ? `[data-d="${act.dataset.d}"]` : ""}:not([disabled])`, mEl) || $('[data-action="scnp-play"]', mEl); }
    if (f && document.activeElement !== f) f.focus();
  },
  go(i, focusNode) { if (!this.cur) return; this.cur.stage = clamp(i, 0, SCNP_STAGES.length - 1); this.render(false, focusNode); },
  step(d, focusNode) { if (this.cur) this.go(this.cur.stage + d, focusNode); },
  scn(d) {
    if (!this.cur) return;
    this.stop();
    const n = this.cur.idx + d;
    if (n < 0 || n >= this.cur.ids.length) return;
    this.cur.idx = n; this.cur.stage = 0;
    this.render(true);
  },
  stop() { if (this.cur && this.cur.timer) { clearInterval(this.cur.timer); this.cur.timer = null; } },
  toggle() {
    if (!this.cur) return;
    if (this.cur.timer) { this.stop(); this.render(false); return; }
    const m = this.cur.model || [];
    const nextLive = (from) => { for (let k = from; k < m.length; k++) if (m[k].status !== "skip") return k; return -1; };
    if (this.cur.stage >= m.length - 1 || nextLive(this.cur.stage + 1) < 0) this.cur.stage = 0;
    this.cur.timer = setInterval(() => {
      if (!this._modal() || !this.cur) { this.stop(); return; }
      const k = nextLive(this.cur.stage + 1);
      if (k < 0) { this.stop(); this.render(false); return; }
      this.cur.stage = k;
      if (nextLive(k + 1) < 0) this.stop();
      this.render(false);
    }, this.delay);
    this.render(false);
  },
  /** Afdrukken: alle fasen van het huidige scenario als tekst (geen mockups). */
  printHtml() {
    const c = this.cur, st = S(), r = c && ScnUI.results(st).find((y) => y.scn.id === c.ids[c.idx]);
    if (!r) return "";
    const m = this.model(r, st), s = r.scn, [, , vt] = ScnUI.verdict(r);
    const strip = (h) => String(h || "").replace(/<svg[\s\S]*?<\/svg>/g, "");
    return `<div class="doc scnp-print"><h1>Het pad · ${esc(s.title)}</h1><p class="lead">${esc(s.story || "")}</p>
      <p>Uitkomst: <b>${esc(r.uncertain ? "Onzeker – niet gemodelleerd" : SCN_PRED[ScnUI.outcome(r)][0])}</b> · Beoordeling: <b>${esc(vt)}</b> · Bereikt: ${esc(ScnUI.lvName(r.lv))} · Gewenst: ${esc(ScnUI.expectText(s))}</p>
      <p class="xs">${ScnUI.inputs(r, st).map(([k, v]) => `${esc(k)}: ${esc(v)}`).join(" · ")}</p>
      <table class="sum scnp-ptable"><thead><tr>${m.map((g, k) => `<th>${k + 1}. ${esc(g.name)}</th>`).join("")}</tr></thead><tbody><tr>${m.map((g) => `<td class="s-${g.status}">${esc(SCNP_ST[g.status][1])} ${esc(g.sum)}</td>`).join("")}</tr></tbody></table>
      ${m.map((g, k) => `<div class="scnp-pstage"><h3>${k + 1}. ${esc(g.name)} – ${esc(g.sum)}</h3>${strip(g.explain)}${g.steps.length ? `<ul>${g.steps.map((p) => `<li>${esc(p.text)}</li>`).join("")}</ul>` : ""}${(g.tech || []).filter((t) => t.rows && t.rows.length).map((t) => `<table class="plain">${t.title ? `<thead><tr><th colspan="2">${esc(t.title)}</th></tr></thead>` : ""}<tbody>${t.rows.map(([a, b]) => `<tr><th>${esc(a)}</th><td>${esc(b)}</td></tr>`).join("")}</tbody></table>`).join("")}</div>`).join("")}</div>`;
  },
  print() {
    const root = document.getElementById("print-root");
    if (!root) return;
    this.stop();
    root.innerHTML = this.printHtml();
    const done = () => { root.innerHTML = ""; window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    setTimeout(() => window.print(), 60);
  },
};

Actions["scn-path"] = (el) => ScnPath.open(el.dataset.id);
Actions["scn-paths"] = () => ScnPath.open(null);
Actions["scnp-go"] = (el) => { ScnPath.stop(); ScnPath.go(Number(el.dataset.i), true); };
Actions["scnp-prev"] = () => { ScnPath.stop(); ScnPath.step(-1); };
Actions["scnp-next"] = () => { ScnPath.stop(); ScnPath.step(1); };
Actions["scnp-play"] = () => ScnPath.toggle();
Actions["scnp-scn"] = (el) => ScnPath.scn(Number(el.dataset.d));

Actions["scn-play"] = (el) => {
  UI.scnPlayed = { ...(UI.scnPlayed || {}), [el.dataset.id]: true };
  UI.scnJust = el.dataset.id;
  App.render();
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
  if (sc.total && sc.pct >= 80) VH.confetti(sc.pct === 100 ? 140 : 70);
  const ch = UI.scnChannel ? (CATALOG.scenarioChannels[UI.scnChannel] || { name: UI.scnChannel }).name : "";
  Toast.show(`Ontwerptoets${ch ? " " + esc(ch) : ""}: <b>${sc.pct}%</b>`, "info");
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
Actions["scn-play-group"] = (el) => {
  const k = el.dataset.ch || "";
  UI.scnPlayed = { ...(UI.scnPlayed || {}) };
  ScnUI.bySector(ScnUI.results(S())).filter((r) => r.scn.channel === k).forEach((r) => (UI.scnPlayed[r.scn.id] = true));
  UI.scnJust = null;
  App.render();
};
Actions["scn-channel"] = (el) => { UI.scnChannel = el.dataset.ch || ""; UI.scnJust = null; App.render(); };
Actions["scn-sector"] = (el) => { const v = el.dataset.sec || ""; UI.scnSector = ["base", "sector"].includes(v) ? v : ""; UI.scnJust = null; App.render(); };
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
    tips: ["Laat de groep eerst voorspellen en speel dan af.", "Is de uitkomst ‘Te zwak’? Wijzig direct de keuze op het ontwerpbord en speel opnieuw af.", "‘Strenger dan nodig’ is óók een signaal: te veel hinder kost draagvlak.", "Mist er een situatie? Voeg met ‘+ Eigen scenario’ een eigen geval toe."],
    pitfalls: ["De engine toetst het beoogde eindbeeld; policies in simulatie handhaven in werkelijkheid nog niet.", "Ongelabelde inhoud wordt alleen beschermd via auto-labeling of SIT-condities in DLP."],
    links: ["dlpSimulation", "labelsAuto"],
  },
  done: (st) => ScenarioEngine.score(st).pct >= 80,
  render() {
    const st = S();
    const lead = "Toets het ontwerp aan herkenbare situaties: voorspel de uitkomst en speel af.";
    const addBtn = `<button class="btn" data-action="scn-custom-add">${icon("plus", "s")} Eigen scenario</button>`;
    if (!st.labels.length) return pageHead("Toetsen", "Scenario’s", lead) + VH.needLabels();
    const all = ScnUI.results(st);
    if (!all.length) return pageHead("Toetsen", "Scenario’s", lead, addBtn) + emptyState("play", "Geen scenario’s", "Er zijn geen scenario’s voor deze sector. Voeg een eigen scenario toe.");
    const nSpec = all.filter((r) => !ScnUI.isCustom(r.scn) && ScnUI.sectorSpecific(r.scn, st)).length;
    if (!nSpec || (UI.scnSector && !["base", "sector"].includes(UI.scnSector))) UI.scnSector = "";
    const base = ScnUI.bySector(all, st);
    const order = Object.keys(CATALOG.scenarioChannels);
    const chans = unique(base.map((r) => r.scn.channel)).sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));
    if (UI.scnChannel && !chans.includes(UI.scnChannel)) UI.scnChannel = "";
    const list = ScnUI.filtered(st);
    const playedList = list.filter((r) => ScnUI.played(r.scn.id));
    const sc = ScnUI.scoreOf(playedList), t = ScnUI.tally(playedList), open = list.length - playedList.length;
    const chName = (k) => (CATALOG.scenarioChannels[k] || { name: k }).name;
    const TALLY = [["ok", "Klopt"], ["weak", "Te zwak"], ["over", "Strenger dan nodig"], ["unsure", "Onzeker"]];
    const predPlayed = playedList.filter((r) => !r.uncertain && ((st.scenarioResults || {})[r.scn.id] || {}).predict);
    const predOk = predPlayed.filter((r) => st.scenarioResults[r.scn.id].predict === ScnUI.outcome(r)).length;
    const facts = [`${playedList.length}/${list.length} afgespeeld`, sc.excluded ? `${sc.excluded} telt niet mee` : "", predPlayed.length ? `${predOk}/${predPlayed.length} goed voorspeld` : ""].filter(Boolean).join(" · ");
    const meter = list.length ? `<div class="scn-meter" aria-hidden="true">${TALLY.map(([k]) => (t[k] ? `<span class="m-${k}" style="flex-grow:${t[k]}"></span>` : "")).join("")}${open ? `<span class="m-open" style="flex-grow:${open}"></span>` : ""}</div>` : "";
    const tally = `<ul class="scn-tally" aria-label="Resultaat van de afgespeelde scenario’s">${TALLY.map(([k, n]) => `<li class="t-${k}${t[k] ? "" : " zero"}"><b>${t[k]}</b> ${esc(n)}</li>`).join("")}<li class="t-open${open ? "" : " zero"}"><b>${open}</b> Niet afgespeeld</li></ul>`;
    const manual = Object.values(st.scenarioResults || {}).some((x) => x && x.labelId);
    const decided = playedList.filter((r) => !r.uncertain), oc = { block: 0, tip: 0, pass: 0, enc: 0 };
    decided.forEach((r) => { oc[ScnUI.outcome(r)]++; if (ScnUI.encrypted(r)) oc.enc++; });
    const stats = playedList.length
      ? `<ul class="scn-stats" aria-label="Wat merkt de medewerker in de afgespeelde scenario’s?">${Object.keys(SCN_OB).map((k) => `<li class="scn-stat ob-${k}${oc[k] ? "" : " zero"}">${icon(SCN_OB[k][1])}<b>${oc[k]}</b><span>${esc(SCN_OB[k][0])}</span></li>`).join("")}</ul>`
      : `<p class="scn-invite">${icon("sparkle", "s")}<span>Voorspel per kaart wat er gebeurt en speel af. Je ziet direct of de medewerker wordt <b>geblokkeerd</b>, een <b>melding</b> krijgt of gewoon <b>door kan</b>.</span></p>`;
    const pctV = sc.total ? sc.pct : 0;
    const bar = `<section class="scn-sum${sc.total ? "" : " scn-sum-new"}" aria-label="Ontwerptoets">
      <div class="scn-ring${sc.total ? (sc.pct >= 80 ? " r-ok" : sc.pct >= 50 ? " r-mid" : " r-low") : ""}" style="--p:${pctV}" aria-hidden="true"><b class="scn-score-v">${sc.total ? `${sc.pct}%` : "–"}</b><span class="scn-ring-t">${sc.total ? "klopt" : "nog open"}</span></div>
      <div class="scn-score"><span class="scn-score-k">Ontwerptoets ${infoTip("Score = ontworpen bescherming zodra de policies aan staan (niet in simulatie): het aandeel afgespeelde scenario’s met de gewenste uitkomst. Een ontwerpindicator, geen risico- of compliancescore. Onzekere scenario’s tellen niet mee.")}</span>
        <span class="sr-only">${sc.total ? `${sc.pct}%` : "nog niet afgespeeld"}</span><span class="scn-score-f xs muted">${esc(facts)}</span>${(() => { const cv = Validation.scenarioCover(st); return cv ? `<span class="scn-score-f xs muted scn-auto">${icon("checkcircle", "s")} Automatische check: ${esc(cv.text)} scenario’s afgedekt</span>` : ""; })()}<span class="scn-score-f xs muted">${icon("eye", "s")} Ontwerpsimulatie, geen tenanttest</span></div>
      <div class="scn-sum-act">
        <button class="btn primary" data-action="scn-play-all">${icon("play", "s")} Speel ${UI.scnChannel ? "deze" : "alles"} af</button>
        <button class="btn" data-action="scn-show-all" aria-pressed="${!!UI.scnShowAll}">${icon("eye", "s")} Toon alle uitkomsten</button>
        ${addBtn}
        ${playedList.length ? `<button class="btn subtle" data-action="scn-paths">${icon("route", "s")} Bekijk de paden</button><button class="btn subtle" data-action="scn-reset" title="Opnieuw beginnen" aria-label="Opnieuw beginnen">${icon("undo", "s")}</button>` : ""}</div>
      <div class="scn-sum-mid">${stats}${tally}${meter}</div>
    </section>
    ${manual ? `<p class="xs muted scn-manual">Bij sommige scenario’s is handmatig een label gekozen. <button class="btn small subtle" data-action="scn-clear-labels">Alles automatisch</button></p>` : ""}`;
    const seg = (k, txt, n) => {
      const on = (UI.scnChannel || "") === k;
      const lg = k ? msLogo((SCN_LOGO[k] || ["purview"])[0], "scn-seglogo") : `<span class="scn-segall" aria-hidden="true">${icon("grid", "s")}</span>`;
      return `<button type="button" class="scn-segbtn${k ? " " + ScnUI.chClass(k) : ""}${on ? " on" : ""}" data-action="scn-channel" data-ch="${esc(k)}" aria-pressed="${on}"${k ? ` title="${esc(chName(k))}"` : ""}>${lg}<span class="scn-segt">${esc(txt)}</span><span class="scn-n" aria-label="${n} scenario’s">${n}</span></button>`;
    };
    const secSeg = nSpec ? (() => {
      const b = (k, txt, n) => { const on = (UI.scnSector || "") === k; return `<button type="button" class="scn-segbtn scn-secbtn${on ? " on" : ""}" data-action="scn-sector" data-sec="${esc(k)}" aria-pressed="${on}"><span class="scn-segt">${esc(txt)}</span><span class="scn-n" aria-label="${n} scenario’s">${n}</span></button>`; };
      return `<span class="scn-secseg" role="group" aria-label="Filter op sector"><span class="scn-seclbl" aria-hidden="true">Sector</span>${b("", "Alle", all.length)}${b("base", "Algemeen", all.length - nSpec)}${b("sector", ScnUI.sectorName(st), nSpec)}</span>`;
    })() : "";
    const filter = `<div class="scn-filter scn-seg" role="group" aria-label="Filter op kanaal">${seg("", "Alle kanalen", base.length)}${chans.map((k) => seg(k, SCN_SEG[k] || chName(k).replace(/\s*\([^)]*\)$/, ""), base.filter((r) => r.scn.channel === k).length)).join("")}${secSeg}</div>`;
    const apl = applicableLabels(st);
    const groups = chans.filter((k) => !UI.scnChannel || UI.scnChannel === k).map((k) => {
      const rs = list.filter((r) => r.scn.channel === k), pl = rs.filter((r) => ScnUI.played(r.scn.id)), gt = ScnUI.tally(pl), go = rs.length - pl.length;
      const sum = [...TALLY.filter(([x]) => gt[x]).map(([x, n]) => `<span class="t-${x}"><b>${gt[x]}</b> ${esc(n.toLowerCase())}</span>`), go ? `<span class="t-open"><b>${go}</b> open</span>` : ""].filter(Boolean).join("");
      const gid = `scn-g-${esc(k)}`;
      return `<section class="scn-group ${ScnUI.chClass(k)}" data-ch="${esc(k)}" aria-labelledby="${gid}">
        <header class="scn-ghead"><span class="scn-gico" aria-hidden="true">${(SCN_LOGO[k] || ["purview"]).map((a) => msLogo(a, "scn-glogo")).join("")}</span><h2 id="${gid}">${esc(chName(k))}</h2><span class="scn-gcount" aria-label="${rs.length} scenario’s">${rs.length}</span><span class="scn-gsum xs">${sum}</span><span class="spacer"></span>${go ? `<button class="btn small subtle" data-action="scn-play-group" data-ch="${esc(k)}" aria-label="Speel ${esc(chName(k))} af">${icon("play", "s")} Speel af</button>` : ""}</header>
        <div class="scn-grid">${rs.map((r) => ScnUI.card(r, st, apl)).join("")}</div>
      </section>`;
    }).join("");
    const achOn = (a) => { try { return !!a.test(st); } catch (e) { return false; } };
    const ach = CATALOG.achievements.map((a) => `<li class="${achOn(a) ? "on" : ""}">${icon(achOn(a) ? "check" : "minus", "s")}<span><b>${esc(a.title)}</b> <span class="muted">– ${esc(a.desc)}</span></span></li>`).join("");
    const nAch = CATALOG.achievements.filter(achOn).length;
    const more = `<p>Elk scenario loopt door het hele ontwerp: label, versleuteling, DLP en melding. Per kaart zie je welke invoer (label, informatietypen, DLP-regel, locatie) de uitkomst bepaalt.</p><p>Voorspellen is optioneel. Kies bij een kaart het label als de medewerker in de praktijk een ander label zou gebruiken.</p><p>De ontwerptoets is een ontwerpindicator, geen risico- of compliancescore. Scenario’s waarbij het label nog gekozen moet worden of geschat is, tellen niet mee.</p>`;
    return VH.wrap(`${pageHead("Toetsen", "Scenario’s", lead, "", more)}
      ${bar}${filter}
      <div class="scn-groups">${groups}</div>
      <div class="mt-3">${accordion("scn-ach", `Ontwerpmijlpalen <span class="xs muted">· ${nAch}/${CATALOG.achievements.length}</span>`, `<ul class="scn-ach">${ach}</ul>`)}</div>`);
  },
});
