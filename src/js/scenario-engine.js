/* Scenario-engine: evalueert scenariokaarten tegen het integrale ontwerp.
   Uitkomst per scenario: gekozen label, stappen (label → encryptie → DLP → melding), bereikt niveau en status.
   Contract per resultaat: { scn, label, lv, steps, status, over, labelApplied, rule, ambiguous, uncertain, signal, autoPicked, recommended }.
   uncertain = het label bepaalt de uitkomst maar is geschat zonder signaal (geen SIT-koppeling/trefwoord, niet gekozen) → telt niet mee.
   DLP: alle regels (afgeleid + maatwerk) op de locatie worden geëvalueerd; de strengste actie geldt
   (Learn: dlp-policy-reference – "the most restrictive actions are applied"). Exceptions worden meegenomen.
   Elke stap heeft naast { kind, text } ook `stage` (actor|detect|label|protect|dlp|outcome|audit), `app` en waar mogelijk `ref`
   (label-id of regelnaam). res.dlp bevat de geëvalueerde DLP-regels (ook die niet vuren) voor ‘Bekijk het pad’. */
const ScenarioEngine = {
  _memo: { key: null, val: null },
  _gen: null,
  STAGES: ["actor", "detect", "label", "protect", "dlp", "outcome", "audit"],
  APP: { exchange: "outlook", sharing: "spo", teams: "teams", endpoint: "endpoint", copilot: "copilot", container: "spo", meeting: "teams" },
  /** Fase-tag op nog niet gemarkeerde stappen vanaf index `from` (kind/text blijven ongewijzigd). */
  _tag(steps, from, stage, x) {
    for (let i = Math.max(0, from); i < steps.length; i++) if (steps[i] && !steps[i].stage) Object.assign(steps[i], { stage }, x || {});
    return steps;
  },
  _hit(ctx, h) { (ctx.hits = ctx.hits || []).push(h); },

  /** Catalogus (sector) ∪ eigen scenario’s (st.customScenarios). */
  list(st = S()) {
    const sec = (st.meta || {}).sector || "generic";
    const ok = (s) => s && s.id && s.content && s.expect && s.channel;
    // ‘generic’-scenario’s (creditcard, Anyone-link, AI-website) gelden voor elke sector behalve zorg (daar staan eigen varianten).
    const forSec = (s) => s.sector === "all" || s.sector === sec || (s.sector === "generic" && sec !== "zorg");
    const cat = (CATALOG.scenarios || []).filter((s) => ok(s) && forSec(s));
    const ids = new Set(cat.map((s) => s.id));
    const own = (st.customScenarios || []).filter((s) => ok(s) && !ids.has(s.id));
    return cat.concat(own);
  },

  all(st = S()) {
    const key = JSON.stringify([st.labels, st.sits, st.groups, st.labelPolicies, st.dlpSettings, st.customDlp, st.endpoint, (st.meta || {}).sector, (st.meta || {}).prefix, st.scenarioResults, st.customScenarios]);
    if (this._memo.key === key) return this._memo.val;
    // Generator.all één keer per doorrekening (niet per scenario): scheelt tientallen ms bij grote ontwerpen.
    this._gen = { st, val: Generator.all(st) };
    let val;
    try {
      val = this.list(st).map((s) => {
        try { return this.evaluate(s, st); } catch (e) {
          console.error(e);
          return { scn: s, label: null, lv: 0, steps: [{ kind: "warn", text: "Dit scenario kon niet worden doorgerekend met het huidige ontwerp.", stage: "outcome" }], status: "fail", over: false, labelApplied: false, rule: null, ambiguous: false, uncertain: false, autoPicked: false, dlp: [] };
        }
      });
    } finally { this._gen = null; }
    this._memo = { key, val };
    return val;
  },

  /** Score over de beslisbare scenario’s; ‘ambiguous’ (label nog kiezen) en ‘uncertain’ (niet gemodelleerd) tellen niet mee. */
  score(st = S()) {
    const all = this.all(st), r = all.filter((x) => !x.ambiguous && !x.uncertain);
    const pts = sum(r.map((x) => (x.status === "pass" ? 1 : x.status === "partial" ? 0.5 : 0)));
    return { pct: r.length ? Math.round((pts / r.length) * 100) : 0, pass: r.filter((x) => x.status === "pass").length, partial: r.filter((x) => x.status === "partial").length, fail: r.filter((x) => x.status === "fail").length, total: r.length, ambiguous: all.filter((x) => x.ambiguous).length, uncertain: all.filter((x) => x.uncertain).length };
  },

  /* ---------- Hulp ---------- */
  _genAll(st) { return this._gen && this._gen.st === st ? this._gen.val : Generator.all(st); },
  sitRef(s) { return s.ref || s.id; },
  matchedSits(sits, scn) {
    const want = (scn.content || {}).sits || [];
    return (sits || []).filter((s) => s && want.includes(this.sitRef(s)));
  },
  _vals(v) { return [].concat(v == null ? [] : v).join(" ").split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean); },
  _hits(txt, scn) {
    const t = ` ${String(txt || "").toLowerCase()} `;
    return ((scn.content || {}).hint || []).filter((h) => h && new RegExp(`(^|[^a-z0-9à-ÿ])${String(h).toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(t)).length;
  },
  _top(l, st) { let t = l, g = 0; while (t && t.parentId && g++ < 10) { const p = parentOf(t, st); if (!p) break; t = p; } return t; },
  /**
   * Labelkeuze. 1) override uit scenarioResults[id].labelId; 2) ongelabelde inhoud: auto-labeling bepaalt het label –
   * het laatste (hoogste) label met gekoppelde SIT’s en daarbinnen het laatste sublabel (Learn: Label priority); 3) anders hoofdniveau via positie van de parent (sublabels delen
   * de prioriteit van hun parent) + SIT-/trefwoordovereenkomst; 4) binnen het niveau: sublabel met overlappende SIT’s,
   * dan trefwoorden; meerdere kandidaten zonder onderscheid → ambiguous.
   */
  pick(scn, st = S()) {
    const apps = applicableLabels(st);
    if (!apps.length) return { label: null, auto: false, ambiguous: false, candidates: [] };
    const sr = st.scenarioResults || {}, ovId = Object.hasOwn(sr, scn.id) && sr[scn.id] && sr[scn.id].labelId;
    if (ovId) { const l = apps.find((x) => x.id === ovId); if (l) return { label: l, auto: false, ambiguous: false, candidates: [l], signal: "chosen" }; }
    const tops = [];
    apps.forEach((l) => { const t = this._top(l, st); if (!tops.includes(t)) tops.push(t); });
    const groups = tops.map((t) => apps.filter((l) => this._top(l, st) === t));
    const ovl = (l) => this.matchedSits(labelSits(l, st), scn).length;
    const own = (l) => this._hits(`${l.name} ${l.displayName || ""} ${l.audience || ""} ${(l.info || []).join(" ")}`, scn);
    let gi = -1;
    if (scn.content.unlabeled) for (let i = groups.length - 1; i >= 0; i--) if (groups[i].some((l) => ovl(l))) { gi = i; break; }
    // Learn (Label priority): bij meerdere auto-labeling-matches wint het laatste label en daarna het laatste sublabel.
    if (gi >= 0) { const hit = groups[gi].filter((l) => ovl(l) > 0); return { label: hit[hit.length - 1], auto: true, ambiguous: false, candidates: hit, signal: "autolabel" }; }
    const n = tops.length, sens = Number(scn.content.sens) || 0;
    let bs = -1e9, gkw = 0;
    groups.forEach((g, i) => {
      const pos = n === 1 ? 0 : (i / (n - 1)) * 4;
      const kw = this._hits([tops[i], ...g].map((l) => `${l.name} ${l.displayName || ""} ${l.audience || ""}`).join(" "), scn);
      const s = 3 * Math.max(0, ...g.map(ovl)) + 2 * kw - 1.2 * Math.abs(pos - sens);
      if (s > bs) { bs = s; gi = i; gkw = kw; }
    });
    const g = groups[gi];
    // Signaal = waarop de keuze rust: gekoppelde informatietypen, trefwoorden in de labelnaam, of er is maar één label.
    const sig = (l) => (ovl(l) > 0 ? "sit" : gkw > 0 || own(l) > 0 ? "keyword" : apps.length === 1 ? "only" : "none");
    if (g.length === 1) return { label: g[0], auto: true, ambiguous: false, candidates: g, signal: sig(g[0]) };
    const best = (arr, f) => { const m = Math.max(0, ...arr.map(f)); return m > 0 ? arr.filter((l) => f(l) === m) : arr; };
    let c = best(g, ovl);
    if (c.length > 1) c = best(c, own);
    return { label: c[0], auto: true, ambiguous: c.length > 1, candidates: c, signal: sig(c[0]) };
  },
  pickLabel(scn, st = S()) { return this.pick(scn, st).label; },

  /** Alle DLP-regels (afgeleid + maatwerk) op de locaties van dit kanaal die voor deze inhoud matchen (label OF SIT). */
  rules(domKey, label, labelApplied, scn, st) {
    const out = [];
    const dom = CATALOG.dlpDomains.find((d) => d.key === domKey);
    if (!dom) return out;
    this._genAll(st).dlpPolicies.forEach((p) => {
      if (p.derived ? !(p.domains || []).includes(domKey) : !(p.locations || []).some((x) => (dom.locations || []).includes(x))) return;
      (p.rules || []).forEach((r) => {
        if (!r || r.effective === false) return;
        const cnd = r.conditions || {};
        const viaLabel = !!(labelApplied && label && (cnd.labels || []).some((x) => x && x.id === label.id));
        const sits = this.matchedSits(cnd.sits, scn);
        if (viaLabel || sits.length) out.push({ rule: r, via: viaLabel ? "label" : "sit", custom: !p.derived, policy: p, sits });
      });
    });
    return out;
  },
  /** Vuurt de regel voor deze ontvanger? → [true] of [false, reden]. Condities én exceptions (NOT). */
  fires(rule, recipient, domKey = "") {
    const cnd = rule.conditions || {};
    const sc = cnd.accessScope;
    if (sc === "NotInOrganization" && recipient === "internal") return [false, "geldt alleen bij delen buiten de organisatie"];
    if (sc === "InOrganization" && recipient !== "internal") return [false, "geldt alleen binnen de organisatie"];
    const mailLike = ["exchange", "teams", "custom", ""].includes(domKey);
    const ext = (cnd.extra || []).filter(Boolean);
    if (mailLike && ext.some((x) => x.key === "recipientDomain" && this._vals(x.value).length) && recipient !== "partner") return [false, "geldt alleen voor de opgegeven ontvangerdomeinen"];
    if (ext.some((x) => x.key === "fromScope" && x.value === "NotInOrganization")) return [false, "geldt alleen voor afzenders buiten de organisatie"];
    for (const x of (rule.exceptions || []).filter(Boolean)) {
      if (x.key === "recipientDomain" && mailLike && recipient === "partner") {
        const v = this._vals(x.value);
        if (v.length) return [false, `uitzondering ‘Recipient domain is ${v.slice(0, 3).join(", ")}${v.length > 3 ? ", …" : ""}’ – geldt niet voor deze ketenpartner`];
      }
      if (x.key === "accessScope") {
        if (x.value === "NotInOrganization" && recipient !== "internal") return [false, "uitzondering: gedeeld buiten de organisatie"];
        if (x.value === "InOrganization" && recipient === "internal") return [false, "uitzondering: gedeeld binnen de organisatie"];
      }
      if (x.key === "fromScope" && x.value === "InOrganization") return [false, "uitzondering: afzender binnen de organisatie"];
    }
    return [true, ""];
  },
  firesFor(rule, recipient) { return this.fires(rule, recipient)[0]; },
  blockEffect(rule, recipient) {
    const a = rule.actions || {};
    if (!a.blockAccess) return null;
    if (a.blockScope === "All") return "all";
    if (a.blockScope === "PerAnonymousUser") return recipient === "anyone" ? "anyone" : null;
    return recipient === "internal" ? null : "external";
  },
  /** Tiptekst zoals de medewerker hem ziet: met het label van de inhoud (niet dat van de regel). */
  tipFor(rule, hit, ctx, domKey) {
    const t = (rule.notify || {}).tip;
    if (!t || rule.custom || !rule.label || ((rule.label.cfg || {}).notify || {}).tipText) return t || "";
    const l = ctx.label;
    if (ctx.applied && l && l === rule.label) return t;
    try { return Generator.tipText({}, ctx.applied && l ? labelFullName(l, ctx.st) : null, domKey, ctx.applied ? [] : hit.sits || []); } catch (e) { return t; }
  },
  /** DLP-stap: alle geraakte regels; de strengste actie bepaalt het niveau (en ctx.rule). */
  dlpStep(hits, recipient, steps, ctx, domKey = "") {
    let lv = 0, best = null, n = 0;
    hits.forEach((h) => {
      const { via, custom, policy } = h;
      const rule = { ...h.rule, actions: h.rule.actions || {}, notify: h.rule.notify || {} };
      const src = `${custom ? `Maatwerk-policy ‘${policy.name}’, regel ‘${rule.name}’` : `DLP-regel ‘${rule.name}’`} (${via === "label" ? "op label" : "op informatietypen"})`;
      const [ok, why] = this.fires(rule, recipient, domKey);
      const i0 = steps.length;
      if (!ok) { steps.push({ kind: "info", text: `${src}: ${why} – niet van toepassing.`, stage: "dlp", ref: rule.name }); this._hit(ctx, { rule: h.rule, policy, via, custom, sits: h.sits || [], domain: domKey, fired: false, why, level: 0 }); return; }
      n++;
      let hl = 0;
      const b = this.blockEffect(rule, recipient);
      if (rule.actions.encrypt) { hl = Math.max(hl, 2); steps.push({ kind: "ok", text: `${src}: bericht wordt automatisch versleuteld (${rule.actions.encrypt}).` }); }
      if (b) {
        const ov = rule.notify.override;
        hl = Math.max(hl, b === "all" ? 4 : ov ? 2 : 3);
        steps.push({ kind: ov ? "warn" : "block", text: `${src}: ${b === "all" ? "geblokkeerd voor iedereen" : b === "anyone" ? "toegang via Anyone-link geblokkeerd" : "geblokkeerd voor externen"}${ov ? " – gebruiker kan overrulen met zakelijke justificatie" : ""}.` });
      } else if (rule.actions.blockAccess) {
        hl = Math.max(hl, 1);
        steps.push({ kind: "info", text: `${src}: blokkeert alleen Anyone-links; delen met deze ontvanger blijft mogelijk.` });
      }
      if (!b && !rule.actions.encrypt && !rule.actions.blockAccess) {
        hl = Math.max(hl, 1);
        steps.push({ kind: rule.notify.tip ? "warn" : "info", text: `${src}: ${rule.notify.tip ? "policy tip getoond, actie gaat door" : "activiteit wordt gelogd (audit)"}.` });
      }
      const tip = this.tipFor(rule, h, ctx, domKey);
      if (tip && (b || rule.actions.encrypt)) steps.push({ kind: "info", text: `Policy tip: “${tip}”` });
      if (rule.notify.alert && rule.notify.alert !== "none") steps.push({ kind: "info", text: `Alert (severity ${rule.notify.severity}) in het DLP-alertsdashboard${rule.notify.incidentReport ? " + incidentrapport" : ""}.`, stage: "audit", ref: rule.name });
      this._tag(steps, i0, "dlp", { ref: rule.name });
      this._hit(ctx, { rule: h.rule, policy, via, custom, sits: h.sits || [], domain: domKey, fired: true, why: "", level: hl, block: b, tip });
      if (!best || hl > best.lv) best = { lv: hl, name: rule.name };
      lv = Math.max(lv, hl);
      ctx.dlp = true;
    });
    if (best) {
      if (n > 1) steps.push({ kind: "info", text: `${n} DLP-regels van toepassing – de strengste actie geldt: ‘${best.name}’.`, stage: "dlp", ref: best.name });
      if (!ctx.rule || best.lv >= (ctx.rlv || 0)) { ctx.rule = best.name; ctx.rlv = best.lv; }
    }
    return lv;
  },
  /** Kan de ontvanger de versleutelde inhoud openen? */
  encAccess(l, recipient) {
    const e = l.cfg.encryption;
    if (e.mode !== "assignNow") return null;
    const p = (e.permissions || []).filter(Boolean);
    if (recipient === "internal") return p.some((x) => x.type === "org" || x.type === "authenticated") ? "open" : "group";
    if (p.some((x) => x.type === "authenticated")) return "open";
    if (recipient === "partner" && p.some((x) => x.type === "domain" || x.type === "partner")) return "partner";
    return "denied";
  },

  /* ---------- Evaluatie ---------- */
  evaluate(scn, st = S()) {
    const res = this._evaluate(scn, st);
    const app = this.APP[scn.channel] || "";
    res.steps.forEach((s) => { if (s && !s.stage) s.stage = "outcome"; if (s && !s.app) s.app = app; });
    return res;
  },
  _evaluate(scn, st = S()) {
    const steps = [];
    const res = { scn, label: null, lv: 0, steps, status: "fail", over: false, labelApplied: false, rule: null, ambiguous: false, uncertain: false, signal: "", autoPicked: false, recommended: false, dlp: [] };
    if (scn.content.prompt) {
      const ctx = {};
      const lv = this.copilotPrompt(scn, st, steps, ctx);
      res.rule = ctx.rule || null;
      res.dlp = ctx.hits || [];
      return this.finish(res, lv, scn);
    }
    const pk = this.pick(scn, st);
    const l = pk.label;
    res.label = l;
    res.autoPicked = !!l && pk.auto;
    if (!l) { steps.push({ kind: "block", text: "Er is nog geen (toepasbaar) label in het classificatieschema.", stage: "label" }); return this.finish(res, 0, scn); }
    const c = l.cfg;
    // 1. Labelen
    let applied = true, recommend = false;
    if (scn.content.unlabeled) {
      const al = c.autolabel;
      const sitsHit = this.matchedSits(labelSits(l, st), scn);
      if (!sitsHit.length) { applied = false; steps.push({ kind: "warn", text: `Inhoud is niet gelabeld en de informatietypen zijn niet gekoppeld aan ‘${labelFullName(l, st)}’ – geen automatische labeling.` }); }
      else if (al.client.mode === "auto") steps.push({ kind: "ok", text: `Office past ‘${labelFullName(l, st)}’ automatisch toe (herkend: ${sitsHit.map((s) => s.name).join(", ")}).`, app: "office" });
      else if (al.service.enabled && ((scn.channel === "exchange" && al.service.exchange) || (scn.channel === "sharing" && (al.service.sharepoint || al.service.onedrive)))) steps.push({ kind: "ok", text: `Service-side auto-labeling past ‘${labelFullName(l, st)}’ toe (na simulatie).` });
      else if (al.client.mode === "recommend") { recommend = true; steps.push({ kind: "warn", text: `Office beveelt ‘${labelFullName(l, st)}’ aan; de gebruiker kan de aanbeveling accepteren of negeren.`, app: "office" }); }
      else { applied = false; steps.push({ kind: "warn", text: `Inhoud blijft ongelabeld: geen automatisch labelen voor ‘${labelFullName(l, st)}’.` }); }
    } else {
      steps.push({ kind: "info", text: `Inhoud heeft label ‘${labelFullName(l, st)}’${res.autoPicked ? " (automatisch gekozen – controleren)" : ""}.` });
    }
    res.labelApplied = applied;
    res.recommended = recommend;
    // Kandidaat-sublabels zonder onderscheid: alleen relevant als het label de uitkomst bepaalt.
    res.ambiguous = !!pk.ambiguous && (applied || ["container", "meeting"].includes(scn.channel));
    if (res.ambiguous) steps.unshift({ kind: "warn", text: `Kies het label – meerdere afdelingslabels mogelijk (${pk.candidates.map((x) => labelFullName(x, st)).join(", ")}). Dit scenario telt niet mee in de score.` });
    // Onzeker: het label bepaalt de uitkomst, maar is geschat zonder signaal uit de inhoud (geen SIT-koppeling, geen trefwoord).
    res.signal = pk.signal || "none";
    res.uncertain = !res.ambiguous && pk.auto && res.signal === "none" && applied && !scn.content.unlabeled && scn.channel !== "teams";
    if (res.uncertain) steps.unshift({ kind: "warn", text: "Onzeker – niet gemodelleerd: het label is geschat zonder gekoppelde informatietypen of trefwoorden. Kies het label; tot die tijd telt dit scenario niet mee in de score." });
    this._tag(steps, 0, "label", { ref: l.id });
    const ctx = { label: l, applied, st };
    const lv = this.channel(scn, st, l, applied, steps, ctx);
    res.dlp = ctx.hits || [];
    res.rule = ctx.rule && (ctx.rlv || 0) >= lv ? ctx.rule : lv ? `Label ‘${labelFullName(l, st)}’` : ctx.rule || null;
    this.finish(res, lv, scn);
    if (recommend && res.status === "pass") {
      const alt = this.channel(scn, st, l, false, [], { label: l, applied: false, st });
      if (alt < (Number((scn.expect || {}).min) || 0)) { res.status = "partial"; steps.push({ kind: "warn", text: "Aanbeveling kan worden genegeerd; zonder label geldt alleen de SIT-regel.", stage: "label", ref: l.id, app: "office" }); }
    }
    return res;
  },

  /** Kanaalspecifieke doorrekening; geeft het bereikte niveau terug. */
  channel(scn, st, l, applied, steps, ctx) {
    const c = l.cfg;
    let lv = 0;
    const r = scn.recipient;
    const i0 = steps.length;
    const prot = () => this._tag(steps, i0, "protect", { ref: l.id });
    switch (scn.channel) {
      case "exchange": {
        if (applied && c.scope.emails) {
          const e = c.encryption;
          if (e.mode === "userDefined" && e.userDefined.outlook === "DoNotForward") {
            if (scn.content.forward) { lv = Math.max(lv, 3); steps.push({ kind: "block", text: "Do Not Forward: doorsturen is niet toegestaan; een externe ontvanger van een doorgestuurde kopie kan niet openen." }); }
            else { lv = Math.max(lv, 2); steps.push({ kind: "ok", text: "Do Not Forward: ontvanger kan lezen, maar niet doorsturen, printen of kopiëren." }); }
          } else if (e.mode === "userDefined" && e.userDefined.outlook === "EncryptOnly") {
            lv = Math.max(lv, 2); steps.push({ kind: "ok", text: "Encrypt-Only: bericht is versleuteld; ontvanger kan lezen en beantwoorden." });
          }
          const acc = this.encAccess(l, r);
          if (acc === "open") { lv = Math.max(lv, 1); steps.push({ kind: "ok", text: "Versleuteld; de ontvanger kan openen met de rechten uit het label." }); }
          if (acc === "partner") { lv = Math.max(lv, 2); steps.push({ kind: "ok", text: "Versleuteld; het partnerdomein heeft rechten en kan openen." }); }
          if (acc === "group") { lv = Math.max(lv, 3); steps.push({ kind: "block", text: "Versleuteld voor een doelgroep: collega’s buiten de doelgroep kunnen niet openen." }); }
          if (acc === "denied") { lv = Math.max(lv, 3); steps.push({ kind: "block", text: "Versleuteld voor de eigen organisatie: de externe ontvanger kan het bericht niet openen." }); }
          if (c.marking.header.enabled || c.marking.footer.enabled) steps.push({ kind: "info", text: "E-mail krijgt de visuele markering van het label." });
        }
        prot();
        lv = Math.max(lv, this.dlpStep(this.rules("exchange", l, applied, scn, st), r, steps, ctx, "exchange"));
        break;
      }
      case "sharing": {
        if (applied && c.scope.files) {
          const acc = this.encAccess(l, r === "anyone" ? "external" : r);
          if (acc === "denied" || (r === "anyone" && acc && acc !== "open")) { lv = Math.max(lv, 3); steps.push({ kind: "block", text: "Bestand is versleuteld: de externe/anonieme ontvanger kan het niet openen." }); }
          if (r === "anyone" && acc === "open") steps.push({ kind: "warn", text: "Any authenticated users: anonieme Anyone-gebruikers kunnen versleutelde bestanden niet openen; wel na aanmelden." });
          if (c.encryption.mode === "userDefined") { lv = Math.max(lv, 2); steps.push({ kind: "ok", text: "Gebruiker heeft bij het labelen zelf personen en rechten gekozen; alleen zij kunnen openen." }); }
        }
        if (c.scope.sites && applied) {
          const sh = CATALOG.siteSharing.find((x) => x[0] === c.container.sharing);
          steps.push({ kind: "info", text: `Staat het bestand in een team/site met dit label, dan geldt extern delen: ‘${sh ? sh[1] : c.container.sharing}’.` });
        }
        prot();
        lv = Math.max(lv, this.dlpStep(this.rules("sharing", l, applied, scn, st), r, steps, ctx, "sharing"));
        break;
      }
      case "teams": {
        const own = Generator.ruleFor(l, "teams", st);
        const hits = this.rules("teams", l, false, scn, st);
        if (own && !hits.some((h) => h.rule.label === l)) steps.push({ kind: "warn", text: `Er is een Teams-regel voor ‘${labelFullName(l, st)}’, maar die herkent de informatie in dit bericht niet (labels zijn geen conditie in Teams-chat).`, stage: "dlp", ref: own.name });
        lv = Math.max(lv, this.dlpStep(hits, r, steps, ctx, "teams"));
        break;
      }
      case "endpoint": {
        const act = CATALOG.endpointActivities.find((a) => a.key === scn.activity) || { key: scn.activity, name: String(scn.activity || "activiteit") };
        const hits = this.rules("endpoint", l, applied, scn, st);
        hits.forEach(({ rule, via, custom, policy, sits }) => {
          const e = ((rule.actions || {}).endpoint || []).find((x) => x && x.key === scn.activity);
          const src = `${custom ? `Maatwerk-policy ‘${policy.name}’, regel ‘${rule.name}’` : `Endpoint DLP-regel ‘${rule.name}’`} (${via === "label" ? "op label" : "op informatietypen"})`;
          const tg = { stage: "dlp", ref: rule.name };
          const base = { rule, policy, via, custom, sits: sits || [], domain: "endpoint", activity: scn.activity };
          if (!e) { steps.push({ kind: "info", text: `${src}: ‘${act.name}’ wordt niet gecontroleerd.`, ...tg }); this._hit(ctx, { ...base, fired: false, why: `‘${act.name}’ staat niet in deze regel`, level: 0 }); return; }
          const m = { audit: [1, "info", "geaudit (activiteit gaat door)"], warn: [2, "warn", "geblokkeerd met override – gebruiker kan doorgaan met justificatie"], block: [3, "block", "geblokkeerd"] }[e.level];
          if (!m) { steps.push({ kind: "info", text: `${src}: ‘${act.name}’ wordt niet gecontroleerd.`, ...tg }); this._hit(ctx, { ...base, fired: false, why: `‘${act.name}’ wordt niet gecontroleerd`, level: 0 }); return; }
          if (m[0] > (ctx.rlv || 0) || !ctx.rule) { ctx.rule = rule.name; ctx.rlv = m[0]; }
          lv = Math.max(lv, m[0]);
          steps.push({ kind: m[1], text: `${src}: ‘${act.name}’ ${m[2]}.`, ...tg });
          this._hit(ctx, { ...base, fired: true, why: "", level: m[0], epLevel: e.level });
          ctx.dlp = true;
        });
        if (applied && scn.activity === "print") {
          const e = c.encryption;
          if (e.mode === "assignNow" && e.permissions.length && e.permissions.every((p) => p.type !== "org" || ["Viewer", "Reviewer"].includes(p.level)) && e.permissions.some((p) => p.type === "org")) { lv = Math.max(lv, 3); steps.push({ kind: "block", text: "Encryptie: gebruikers buiten de doelgroep hebben geen PRINT-recht.", stage: "protect", ref: l.id }); }
          if (c.marking.watermark.enabled) steps.push({ kind: "ok", text: "De afdruk bevat het watermerk van het label (herleidbaar).", stage: "protect", ref: l.id });
        }
        if (!hits.length) steps.push({ kind: "warn", text: "Geen endpoint DLP-regel van toepassing op deze inhoud.", stage: "dlp" });
        break;
      }
      case "copilot": {
        const hits = this.rules("copilot", l, applied, scn, st).filter((h) => h.via === "label");
        hits.forEach(({ rule, custom, policy, via, sits }) => {
          const sim = rule.action === "audit" || !(rule.actions || {}).copilotExclude;
          const hl = sim ? 1 : 4;
          if (hl > (ctx.rlv || 0) || !ctx.rule) { ctx.rule = rule.name; ctx.rlv = hl; }
          if (sim) { lv = Math.max(lv, 1); steps.push({ kind: "info", text: "Copilot-DLP in simulatie: verwerking wordt alleen gerapporteerd.", stage: "dlp", ref: rule.name }); }
          else { lv = Math.max(lv, 4); steps.push({ kind: "ok", text: "DLP voor Copilot: ‘Prevent Copilot from processing content’ – items met dit label worden niet gebruikt in het antwoord.", stage: "dlp", ref: rule.name }); }
          this._hit(ctx, { rule, policy, via, custom, sits: sits || [], domain: "copilot", fired: true, why: "", level: hl, sim });
          ctx.dlp = true;
        });
        if (applied) {
          const e = c.encryption;
          if (e.mode === "assignNow" && e.dke) { lv = Math.max(lv, 4); steps.push({ kind: "ok", text: "Double Key Encryption: Copilot kan de inhoud niet lezen." }); }
          else if (e.mode === "assignNow") {
            const org = e.permissions.find((p) => p.type === "org");
            const rights = org ? (org.level === "Custom" ? org.rights || [] : (CATALOG.permissionLevels.find((x) => x.key === org.level) || {}).rights || []) : [];
            if (org && !rights.includes("EXTRACT")) { lv = Math.max(lv, 3); steps.push({ kind: "ok", text: `Encryptie: ${org.level}-rechten zonder EXTRACT – Copilot vat de inhoud niet samen voor deze gebruikers.` }); }
            else if (!org && !e.permissions.some((p) => p.type === "authenticated")) { lv = Math.max(lv, 2); steps.push({ kind: "warn", text: "Encryptie voor een doelgroep: Copilot gebruikt de inhoud alleen voor leden met EXTRACT-recht." }); }
            else steps.push({ kind: "info", text: "Encryptie met EXTRACT-recht: Copilot kan de inhoud gebruiken voor gebruikers met toegang." });
          }
        }
        prot();
        if (!lv) steps.push({ kind: "warn", text: "Copilot kan deze inhoud gebruiken voor iedereen die er toegang toe heeft.", stage: "outcome" });
        break;
      }
      case "container": {
        if (!c.scope.sites) { steps.push({ kind: "warn", text: `‘${labelFullName(l, st)}’ is niet beschikbaar voor Teams/Groups/sites – de teameigenaar bepaalt alles zelf.`, stage: "label", ref: l.id }); break; }
        const ct = c.container;
        if (r === "guest") {
          if (!ct.externalUserAccess) { lv = Math.max(lv, 3); steps.push({ kind: "block", text: "Container-label: ‘Let Microsoft 365 Group owners add people outside your organization’ staat uit – gast kan niet worden toegevoegd." }); }
          else { steps.push({ kind: "warn", text: "Container-label staat gasten toe." }); }
          if (ct.sharing === "Disabled") { lv = Math.max(lv, 3); steps.push({ kind: "ok", text: "Extern delen vanuit de site: Only people in your organization." }); }
        } else {
          if (ct.privacy === "private") { lv = Math.max(lv, 2); steps.push({ kind: "ok", text: "Privacy wordt afgedwongen: Private – alleen leden hebben toegang." }); }
          else if (ct.privacy === "public") steps.push({ kind: "warn", text: "Het label staat privacy ‘Public’ toe/af: iedereen in de organisatie heeft toegang." });
          else steps.push({ kind: "warn", text: "Privacy ‘None’ – de teameigenaar kiest zelf Public of Private." });
          if (!ct.externalUserAccess) { lv = Math.max(lv, 3); steps.push({ kind: "ok", text: "Gasten zijn uitgesloten." }); }
        }
        if (ct.unmanaged !== "full") steps.push({ kind: "info", text: `Onbeheerde apparaten: ${ct.unmanaged === "block" ? "geblokkeerd" : "alleen beperkte webtoegang"}.` });
        break;
      }
      case "meeting": {
        if (!c.scope.meetings) { steps.push({ kind: "warn", text: `‘${labelFullName(l, st)}’ is niet beschikbaar voor meetings.`, stage: "label", ref: l.id }); break; }
        const m = c.meetings;
        const lobby = CATALOG.meetingLobby.find((x) => x[0] === m.lobbyBypass);
        if (["Invited", "Organizer"].includes(m.lobbyBypass) && lobby) { lv = Math.max(lv, 2); steps.push({ kind: "ok", text: `Lobby: alleen ‘${lobby[1]}’ komen direct binnen; de externe wacht in de lobby.` }); }
        else if (m.lobbyBypass !== "default") { lv = Math.max(lv, 1); steps.push({ kind: "info", text: `Lobby-bypass: ${lobby ? lobby[1] : m.lobbyBypass}.` }); }
        else steps.push({ kind: "warn", text: "Lobby niet afgedwongen door het label." });
        if (m.presenters === "Organizer" && m.preventCopyChat) { lv = Math.max(lv, 3); steps.push({ kind: "ok", text: "Alleen de organisator presenteert en chat kan niet worden gekopieerd." }); }
        else if (m.preventCopyChat) steps.push({ kind: "ok", text: "Chat kan niet worden gekopieerd." });
        if (m.e2ee || m.watermarkScreen || m.watermarkVideo) { lv = Math.max(lv, lv >= 3 ? 4 : 3); steps.push({ kind: "ok", text: [m.e2ee && "end-to-end encryptie", m.watermarkScreen && "watermerk op gedeelde inhoud", m.watermarkVideo && "watermerk op video"].filter(Boolean).join(", ").replace(/^./, (x) => x.toUpperCase()) + " (Teams Premium)." }); }
        break;
      }
    }
    prot();
    if (["exchange", "sharing", "teams", "endpoint"].includes(scn.channel) && !ctx.dlp && !steps.some((s) => s.kind === "block")) steps.push({ kind: "warn", text: "Geen DLP-regel van toepassing.", stage: "dlp" });
    return lv;
  },

  copilotPrompt(scn, st, steps, ctx = {}) {
    let lv = 0;
    this._genAll(st).dlpPolicies.filter((p) => (p.locations || []).includes("copilot")).forEach((p) => {
      (p.rules || []).forEach((r) => {
        r = { ...r, conditions: r.conditions || {}, actions: r.actions || {} };
        const sits = this.matchedSits(r.conditions.sits, scn);
        if (!sits.length) return;
        const i0 = steps.length;
        let hl;
        if (r.actions.copilotExclude && r.actions.copilotScope === "web") { hl = 2; steps.push({ kind: "warn", text: `‘${p.name}’: Copilot stuurt deze prompt niet naar web search, maar beantwoordt hem wel met interne bronnen (Performing Web Searches).` }); }
        else if (r.actions.copilotExclude) { hl = 4; steps.push({ kind: "ok", text: `‘${p.name}’: prompt met ${(r.conditions.sits || []).filter(Boolean).map((s) => s.name).join(", ")} wordt niet verwerkt door Copilot${p.mode === "enable" ? "" : " (na het aanzetten van de policy)"}.` }); }
        else { hl = 1; steps.push({ kind: "info", text: `‘${p.name}’: de prompt wordt gerapporteerd (audit), niet tegengehouden.` }); }
        this._tag(steps, i0, "dlp", { ref: r.name || p.name, app: "copilot" });
        this._hit(ctx, { rule: r, policy: p, via: "sit", custom: !p.derived, sits, domain: "copilot", prompt: true, fired: true, why: "", level: hl, web: r.actions.copilotScope === "web" });
        if (hl > lv) { lv = hl; ctx.rule = r.name || p.name; ctx.rlv = hl; }
      });
    });
    if (!lv) steps.push({ kind: "warn", text: "Geen Copilot-DLP-regel op informatietypen in prompts. Voeg in stap ‘Microsoft 365 Copilot’ een maatwerk-regel toe met de SIT (bijv. BSN).", stage: "dlp" });
    return lv;
  },

  finish(res, lv, scn) {
    const ex = scn.expect || {};
    const min = Number(ex.min) || 0;
    // simulatie: ontwerp telt (we toetsen het beoogde eindbeeld), maar we melden het
    res.lv = lv;
    if (ex.max != null && lv > ex.max) { res.status = "partial"; res.over = true; res.steps.push({ kind: "warn", text: "Strenger dan nodig: dit kan het werk onnodig belemmeren (impact op medewerkers).", stage: "outcome" }); }
    else if (lv >= min) res.status = "pass";
    else if (lv === min - 1) res.status = "partial";
    else res.status = "fail";
    return res;
  },
};
