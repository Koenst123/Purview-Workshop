/* Ervaar Purview (#experience): interactieve werkdag bij Noordhaven + scenariobibliotheek.
   Learning bewaart vaste keuzes per rol. De bibliotheek rekent met een eigen voorbeeldontwerp per sector en
   raakt de Workshop-state (S()) nooit aan. */

const XP = { role: "hr", i: 0, picks: {}, view: {}, lib: { sector: "generic", channel: "all", id: "", label: "", open: false, scene: "after" } };
const XP_TONE = { ok: ["ok", "checkcircle", "Bewuste keuze"], warn: ["warn", "warning", "Aandacht nodig"], block: ["err", "shield", "Tegengehouden"] };

const XScene = {
  pill(key) {
    if (!key) return "";
    if (key === "none") return Previews.noPill();
    const l = CATALOG.experience.labels[key];
    return l ? Site.pill(l.name, l.color) : "";
  },
  bars(list) { return (list || []).map((b) => Previews.sceneBar(b[0], b[1], b[2] || "", b[3] || [])).join(""); },
  docText(d) {
    const sits = (d.sits || []).map((n) => `<span class="pv-sit found">${icon("check", "s")} ${esc(n)}</span>`).join("");
    return `<div>${esc(d.text || "")}</div>${sits ? `<div class="pv-sits">${sits}</div>` : ""}${d.foot ? `<div class="x-docfoot">${esc(d.foot)}</div>` : ""}`;
  },
  render(d) {
    if (!d) return "";
    const pill = this.pill(d.label), bars = this.bars(d.bars);
    switch (d.t) {
      case "doc": return Previews.sceneDoc({ file: d.file, pillHtml: pill, barsHtml: bars, wm: d.wm, textHtml: this.docText(d) });
      case "mail": return Previews.sceneMail({ to: d.to, subj: d.subj, body: d.body, attach: d.attach, pillHtml: pill, barsHtml: bars, foot: d.foot || "send" });
      case "share": return Previews.sceneShare({ file: d.file, to: d.to, pillHtml: pill, barsHtml: bars });
      case "chat": return Previews.sceneChat({ title: d.title, me: d.me, text: d.text, state: d.state });
      case "copilot": return Previews.sceneCopilot({ prompt: d.prompt, kind: d.kind, file: d.file, pillHtml: pill, answer: d.answer });
      case "toast": return Previews.sceneToast({ level: d.level, act: d.act, file: d.file, note: d.note, title: d.title, text: d.text });
      case "portal": return this.portal(d);
      default: return "";
    }
  },
  portal(d) {
    const head = `<div class="x-portal-bar">${msLogo("purview")} Microsoft Purview · DLP Alerts<small>Vandaag</small></div>`;
    return `<div class="x-portal">${head}<div class="x-portal-example"><span class="s-badge info">${d.without ? "Zonder deze testregel" : "Fictieve gebeurtenis"}</span><h3>${esc(d.title)}</h3><p>${esc(d.text)}</p><p class="s-small s-muted">De beoordeling geeft geen aanvullende toegangsrechten.</p></div></div>`;
  },
  forMoment(m, choice, without) {
    const labelTasks = ["hr-sollicitatie", "hr-loonbestand", "finance-betaalbestand", "project-ontwerp", "care-overdracht"];
    let label = labelTasks.includes(m.id) ? "none" : "vertrouwelijk";
    if (choice?.effect === "label" || choice?.effect === "recommend") label = "vertrouwelijk";
    if (choice?.key === "B" && ["project-ontwerp", "specialist-onderwijs"].includes(m.id)) label = "openbaar";
    if (without && labelTasks.includes(m.id)) label = "none";
    const blocked = choice?.effect === "block" && (!without || ["finance-accountant", "project-partner"].includes(m.id));
    const bars = blocked ? [["block", "Deze handeling is niet toegestaan", choice.result.text]]
      : !without && choice?.effect === "override" ? [["tip", "Verzonden met toegestane uitzondering", "De opgegeven reden wordt vastgelegd."]]
      : !without && choice?.effect === "recommend" ? [["auto", "Aanbevolen label toegepast", "U heeft het voorstel gecontroleerd en geaccepteerd."]]
      : !choice && m.id === "hr-loonbestand" ? [["recommend", "Aanbevolen label: Vertrouwelijk", "Controleer of dit past bij de inhoud."]] : [];
    const file = m.title + (m.app === "excel" ? ".xlsx" : ".docx");
    const sample = {
      "hr-sollicitatie": "Kandidaat A · gesprek over ervaring en beschikbaarheid · alleen voor betrokken collega's.",
      "hr-loonbestand": "Synthetische testregel · BSN 111222333 · rekening NL91ABNA0417164300",
      "finance-betaalbestand": "Synthetische betaalregel · rekening NL91ABNA0417164300 · alleen voor de betaalcontrole.",
      "project-ontwerp": "Projectconcept · nog niet gepubliceerd · interne ideeën en voorgenomen aanpak.",
      "care-overdracht": "Volledig verzonnen overdracht · zorginformatie hoort op de afgesproken plek.",
      "specialist-onderwijs": "Fictief onderwijsconcept · details moeten nog op herkenbaarheid worden beoordeeld.",
    }[m.id] || "Fictief voorbeeld · " + m.title;
    if (m.app === "word" || m.app === "excel") return { t: "doc", file, label, text: sample, bars };
    if (m.app === "outlook") return { t: "mail", to: m.id === "hr-verzuim" ? "teamleider@noordhaven.example" : "contact@partner.example", subj: m.title, body: "Conceptbericht met uitsluitend fictieve gegevens.", attach: m.topic === "dlp" ? "Vertrouwelijk voorbeeld.docx" : "", label, bars, foot: blocked ? "blocked" : "send" };
    if (m.app === "sharepoint") return { t: "share", file: "Voorbeeldstukken", to: "Aangewezen partneraccount", label, bars };
    if (m.app === "teams") return { t: "chat", title: m.title, me: XExp.person().name, text: blocked ? "Link naar het bestand gedeeld. De externe ontvanger krijgt geen toegang tot het beschermde SharePoint-bestand." : "Fictief bericht · " + (choice ? choice.title : m.question), state: "sent" };
    if (m.app === "copilot") return { t: "copilot", prompt: m.title, kind: "ok", file: "Toegankelijke voorbeeldbron.docx", label, answer: "illustratief concept op basis van toegankelijke bronnen. Controleer feiten, actualiteit en de beoogde ontvangers" };
    if (m.app === "purview") return { t: "portal", title: m.title, text: without ? m.without : m.id === "security-simulatie" ? "Proefresultaten: de regel verzamelt signalen, maar blokkeert nog niet." : "Een poging tot extern delen vraagt om beoordeling van de gebeurtenis en de context.", without };
    const act = m.id === "care-klembord" ? "Naar klembord kopiëren" : ["project-upload", "specialist-ai-upload"].includes(m.id) ? "Bestand uploaden" : "Naar USB kopiëren";
    return { t: "toast", level: blocked ? "block" : "audit", act, file, title: blocked ? "Actie geblokkeerd" : "Voorbeeld van een beheerd apparaat", text: blocked ? choice.result.text : without ? m.without : "Gebruik de afgesproken werkplek en deelroute.", note: "Illustratie van het beschreven voorbeeldbeleid, geen algemene apparaatgarantie." };
  },
};

function xpNormalize(raw) {
  const o = isPlainObj(raw) ? raw : {}, data = { role: "hr", picks: {}, view: {}, versions: {} };
  if (CATALOG.experience.roles.some((r) => r.id === o.role)) data.role = o.role;
  for (const r of CATALOG.experience.roles) {
    data.versions[r.id] = r.version;
    const compatible = isPlainObj(o.versions) && Object.hasOwn(o.versions, r.id) && o.versions[r.id] === r.version;
    for (const m of r.moments) {
      if (!isPlainObj(o.picks) || !Object.hasOwn(o.picks, m.id)) continue;
      if (!compatible) { Learning.report("Een werkdag is gewijzigd. De eerdere antwoorden voor die werkdag zijn niet overgenomen; andere voortgang blijft behouden."); continue; }
      if (!m.choices.some((c) => c.key === o.picks[m.id])) continue;
      data.picks[m.id] = o.picks[m.id];
      if (isPlainObj(o.view) && Object.hasOwn(o.view, m.id) && ["with", "without"].includes(o.view[m.id])) data.view[m.id] = o.view[m.id];
    }
  }
  return data;
}
Object.assign(XP, Learning.register("experience", { version: 1, normalize: xpNormalize, reset: () => Object.assign(XP, xpNormalize({}), { i: 0 }) }));
function xpSave() {
  return Learning.save("experience", { role: XP.role, picks: XP.picks, view: XP.view, versions: Object.fromEntries(CATALOG.experience.roles.map((r) => [r.id, r.version])) });
}

const XExp = {
  get C() { return { ...CATALOG.experience, moments: this.role().moments }; },
  role() { return CATALOG.experience.roles.find((r) => r.id === XP.role) || CATALOG.experience.roles[0]; },
  dayUrl(m, role = this.role()) { return `day/${role.id}/${m.id}`; },
  moment(i = XP.i) { const ms = this.C.moments; return ms[Math.max(0, Math.min(ms.length - 1, i))]; },
  choice(m) { const k = Object.hasOwn(XP.picks, m.id) ? XP.picks[m.id] : ""; return (m.choices || []).find((c) => c.key === k) || null; },
  answered(role = this.role()) { return role.moments.filter((m) => this.choice(m)).length; },
  person() { return this.role().person; },
  avatar(p, small) { return `<span class="x-avatar${small ? " s" : ""}" aria-hidden="true">${brandImg(p.portrait, "", "", ' width="256" height="256"')}</span>`; },
  appName(a) { return this.C.appNames[a] || a; },

  intro() {
    return `<div class="site site-xp"><header class="s-hero compact"><div class="s-wrap">
        <nav class="s-crumb" aria-label="Kruimelpad">${Site.a("hub", "", "Home")}<span aria-hidden="true">›</span><span>Ervaar Purview</span></nav>
        <span class="s-eyebrow">Zes mensen. Herkenbaar werk. Uw keuzes.</span>
        <h1>In wiens schoenen <span class="s-grad-text">stapt u?</span></h1>
        <p class="s-lead">Loop een werkdag mee met een collega. U maakt zelf de keuzes en ziet meteen wat Purview doet, en waar uw eigen oordeel nodig blijft.</p>
        <div class="s-actions x-intro-actions"><button type="button" class="s-btn primary" data-action="xp-roles">${icon("users", "s")} Kies een werkdag</button>${Site.a("experience", "library", `${icon("grid", "s")} Bekijk situaties uit de praktijk`, "s-btn ghost")}</div>
        <p class="s-small">Alle personen en gegevens zijn verzonnen. Er is geen echte Microsoft 365-omgeving gekoppeld.</p>
      </div></header><section class="s-sec tight"><div class="s-wrap"><h2 class="sr-only" id="x-roles-h" tabindex="-1">Kies een werkdag</h2><div class="s-grid c3 x-roles">
      ${this.C.roles.map((r) => Site.a("experience", "role/" + r.id, `<div class="x-role-head">${this.avatar(r.person)}<span>${esc(r.person.name)}<small>${r.moments.length} situaties</small></span></div><h3>${esc(r.title)}</h3><p>${esc(r.intro.split(".")[0].replace(/^Je /, r.person.name + " "))}.</p><div class="x-role-apps" aria-hidden="true">${[...new Set(r.moments.map((m) => m.app))].map((a) => msLogo(a)).join("")}</div><span class="s-link">${this.answered(r) ? `${this.answered(r)} van ${r.moments.length} gespeeld · verdergaan` : "Ontdek deze werkdag"} ${icon("chevronright", "s")}</span>`, "s-card x-role")).join("")}
      </div><aside class="x-lib-banner"><div><span class="s-eyebrow">Scenario's</span><h2>Liever per situatie kijken?</h2><p>Van een mail met een BSN tot een vraag aan Copilot: zie in één oogopslag wat een medewerker op het scherm krijgt, en waarom.</p>${Site.a("experience", "library", `Bekijk de situaties ${icon("chevronright", "s")}`, "s-btn primary")}</div><div class="x-lib-banner-apps" aria-hidden="true">${[...new Set(this.C.roles.flatMap((r) => r.moments.map((m) => m.app)))].slice(0, 6).map((a) => `<span>${msLogo(a)}</span>`).join("")}</div></aside></div></section>${Site.footer()}</div>`;
  },
  rolePage() {
    const r = this.role(), next = r.moments.find((m) => !this.choice(m)) || r.moments[0];
    return `<div class="site site-xp"><header class="s-hero compact"><div class="s-wrap">
      <nav class="s-crumb" aria-label="Kruimelpad">${Site.a("hub", "", "Home")}<span aria-hidden="true">›</span>${Site.a("experience", "intro", "Ervaar Purview")}<span aria-hidden="true">›</span><span>${esc(r.title)}</span></nav>
      <div class="x-role-intro">${this.avatar(r.person)}<div><span class="s-eyebrow">${esc(r.title)}</span><h1>Een dag met ${esc(r.person.name)}</h1></div></div><p class="s-lead">${esc(r.intro)}</p>
      <div class="s-actions">${Site.a("experience", this.dayUrl(next), `${icon("play", "s")} ${this.answered() ? "Werkdag hervatten" : "Begin de werkdag"}`, "s-btn primary")}${Site.a("experience", "finale/" + r.id, "Jouw terugblik", "s-btn ghost")}</div>
      </div></header><section class="s-sec tight"><div class="s-wrap"><h2 class="s-h2">Of begin bij een ander moment</h2><p>Je kunt elk moment los openen en je keuzes later nog aanpassen.</p>
      <ol class="x-role-timeline">${r.moments.map((m) => `<li>${Site.a("experience", this.dayUrl(m), `<time>${esc(m.time)}</time>${msLogo(m.app)}<span><b>${esc(m.title)}</b><small>${esc(this.appName(m.app))} · ${this.choice(m) ? "Al gespeeld" : "Nog te ontdekken"}</small></span>${icon("chevronright", "s")}`, "s-card x-role-moment")}</li>`).join("")}</ol>
      <button class="s-btn quiet small" data-action="xp-restart">${icon("redo", "s")} Alleen deze werkdag opnieuw beginnen</button>
      </div></section>${Site.footer()}</div>`;
  },

  progress() {
    const ms = this.C.moments, done = this.answered();
    return `<div class="x-progress"><div class="s-wrap">${Site.a("experience", "role/" + this.role().id, `${this.avatar(this.person(), true)}<span>${esc(this.person().name)}</span>`, "x-progress-title", `title="Overzicht van de dag van ${esc(this.person().name)}"`)}
      <ol class="x-steps" aria-label="Momenten van de werkdag">${ms.map((m, i) => {
        const cur = i === XP.i, ok = !!this.choice(m);
        return `<li>${Site.a("experience", this.dayUrl(m), `<span>${esc(m.time)}</span>`, `x-dot${ok ? " done" : ""}${cur ? " cur" : ""}`, `${cur ? 'aria-current="step" ' : ""}aria-label="${esc(m.time)}: ${esc(m.title)}${ok ? " (gespeeld)" : ""}"`)}</li>`;
      }).join("")}</ol>
      <button type="button" class="s-btn quiet small" data-action="xp-finale"${done ? "" : " disabled"}>${icon("flag", "s")} Samenvatting</button></div></div>`;
  },

  day() {
    const ms = this.C.moments, m = this.moment(), i = ms.indexOf(m), c = this.choice(m);
    const lesson = ACV.mod(m.topic);
    const relatedTopic = m.topic === "monitor" ? "dlp" : m.topic;
    const other = this.C.roles.filter((r) => r.id !== this.role().id).map((r) => ({ r, m: r.moments.find((x) => x.topic === relatedTopic) })).find((x) => x.m);
    const view = c && XP.view[m.id] === "without" ? "without" : "with", p = this.person(m.who);
    const choices = m.choices.map((ch) => `<button type="button" class="x-choice" data-action="xp-choose" data-id="${esc(m.id)}" data-key="${esc(ch.key)}" aria-pressed="${!!c && c.key === ch.key}"><span class="k" aria-hidden="true">${esc(ch.key)}</span><span><b>${esc(ch.title)}</b><small>${esc(ch.sub)}</small></span>${icon("chevronright", "s")}</button>`).join("");
    let outcome = "";
    if (c) {
      const t = XP_TONE[c.tone] || XP_TONE.ok;
      outcome = `<div class="x-outcome x-enter" data-tone="${esc(c.tone)}">
        <div class="x-outcome-head"><span class="s-ico">${icon(t[1])}</span><div><span class="s-badge ${t[0]}">${esc(t[2])}</span><h2 id="x-out-h" class="x-out-h">${esc(c.result.title)}</h2><p>${esc(c.result.text)}</p></div></div>
        <div class="x-compare" role="group" aria-label="Vergelijk de uitkomst"><button type="button" class="s-tab" data-action="xp-view" data-id="${esc(m.id)}" data-v="with" aria-pressed="${view === "with"}">${icon("shieldcheck", "s")} Met voorbeeldafspraken</button><button type="button" class="s-tab" data-action="xp-view" data-id="${esc(m.id)}" data-v="without" aria-pressed="${view === "without"}">${icon("unlock", "s")} Zonder extra Purview-beleid</button></div>
        ${view === "without" ? `<div class="x-without">${icon("warning", "s")}<p>${esc(m.without)}</p></div>` : ""}
        <div class="x-behind"><h3 class="x-behind-h">Maak de verbinding</h3>
          <p class="s-small s-muted">De uitkomst hoort bij de afspraken in dit voorbeeld. De mogelijkheden en meldingen verschillen per omgeving.</p>
          <div class="x-links">${Site.a("academy", m.topic, `${icon("book", "s")} Leer meer: ${esc(lesson.title)}`)}${other ? Site.a("experience", this.dayUrl(other.m, other.r), `${icon("users", "s")} Dit thema bij ${esc(other.r.person.name)}`) : ""}${(lesson.learn || []).slice(0, 1).map((k) => Site.learn(k)).join("")}</div>
        </div>
      </div>`;
    }
    const scene = XScene.forMoment(m, c, view === "without");
    const cap = `${icon("eye", "s")} Illustratie · ${view === "without" ? "zonder extra Purview-beleid" : c ? "na je keuze" : "vóór je keuze"} · geen live omgeving`;
    const last = i === ms.length - 1;
    const nav = `<nav class="x-nav" aria-label="Situaties">${Site.a("experience", i ? this.dayUrl(ms[i - 1]) : "role/" + this.role().id, `${icon("chevronleft", "s")} ${i ? "Vorig moment" : "Overzicht"}`, "s-btn quiet")}
      ${Site.a("experience", last ? "finale/" + this.role().id : this.dayUrl(ms[i + 1]), `${last ? "Naar je terugblik" : "Volgend moment"} ${icon("chevronright", "s")}`, "s-btn primary")}</nav>`;
    return `<div class="site site-xp site-day">${this.progress()}
      <section class="s-sec tight"><div class="s-wrap"><div class="x-moment">
        <div class="x-enter" data-moment="${esc(m.id)}">
          <div class="x-story-meta"><span class="x-time">${esc(m.time)}</span><span class="x-app">${msLogo(m.app)} ${esc(this.appName(m.app))}</span><span class="s-muted s-small">Moment ${i + 1} van ${ms.length}</span></div>
          <h1 class="x-title">${esc(m.title)}</h1>
          <div class="x-day-card"><div class="x-day-who">${this.avatar(p, true)}<div><b>${esc(p.name)}</b><small>${esc(p.role)}</small></div></div><p class="x-day-story">${esc(m.story)}</p></div>
          <p class="x-question" id="x-q">${esc(m.question)}</p>
          <div class="x-choices" role="group" aria-labelledby="x-q">${choices}</div>
          ${outcome}
          ${nav}
        </div>
        <div class="x-stage" aria-label="Wat er op het scherm gebeurt" role="region"><div class="x-enter">${Site.device(this.sceneTitle(m, scene), XScene.render(scene), this.appName(m.app))}<p class="x-stage-cap">${cap}</p></div></div>
      </div></div></section>${Site.footer()}</div>`;
  },
  pager(r, mid) {
    const ms = r.moments, i = Math.max(0, ms.findIndex((m) => m.id === mid)), last = i === ms.length - 1;
    const pl = i ? `Vorig moment: ${ms[i - 1].title}` : "Overzicht van de werkdag", nl = last ? "Naar de terugblik" : `Volgend moment: ${ms[i + 1].title}`;
    return `${Site.a("experience", i ? this.dayUrl(ms[i - 1], r) : "role/" + r.id, icon("chevronleft", "s"), "btn subtle", `title="${esc(pl)}" aria-label="${esc(pl)}"`)}<span class="sp-pos">Moment ${i + 1}/${ms.length}</span>${Site.a("experience", last ? "finale/" + r.id : this.dayUrl(ms[i + 1], r), `<span class="sp-dir">${last ? "Terugblik" : "Volgende"}</span>${icon("chevronright", "s")}`, "btn", `title="${esc(nl)}" aria-label="${esc(nl)}"`)}`;
  },
  sceneTitle(m, d) {
    if (!d) return "";
    return d.file || d.title || { mail: "Nieuw bericht", copilot: "Copilot Chat", portal: "DLP Alerts", toast: "Bureaublad" }[d.t] || m.title;
  },

  finale() {
    const ms = this.C.moments, picked = ms.map((m) => [m, this.choice(m)]);
    const n = (tone) => picked.filter(([, c]) => c && c.tone === tone).length;
    const done = this.answered(), r = this.role();
    const recap = picked.map(([m, c]) => {
      const t = c ? XP_TONE[c.tone] : null;
      return `<li>${Site.a("experience", this.dayUrl(m), `<time>${esc(m.time)}</time>${msLogo(m.app)}<span><b>${esc(m.title)}</b><small>${c ? esc(c.title) : "Nog niet gespeeld — open deze situatie"}</small></span>${t ? `<span class="s-badge ${t[0]}">${esc(t[2])}</span>` : icon("chevronright", "s")}`, "x-recap-link")}</li>`;
    }).join("");
    return `<div class="site site-xp">
      <header class="s-hero compact"><div class="s-wrap">
        <nav class="s-crumb" aria-label="Kruimelpad">${Site.a("hub", "", "Home")}<span aria-hidden="true">›</span>${Site.a("experience", "intro", "Ervaar Purview")}<span aria-hidden="true">›</span><span>Samenvatting</span></nav>
        <span class="s-eyebrow">Jouw terugblik · ${esc(r.title)}</span>
        <h1>De dag van <span class="s-grad-text">${esc(r.person.name)}</span></h1>
        <p class="s-lead">Je speelde ${done} van ${ms.length} momenten. Kijk nog eens terug: waar hielp de techniek je, en waar maakte jouw eigen afweging het verschil?</p>
      </div></header>
      <section class="s-sec tight"><div class="s-wrap">
        <div class="x-score">
          <div class="s-card x-ring-card"><svg class="x-ring" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="x-ring-bg"></circle><circle cx="60" cy="60" r="52" class="x-ring-fg" transform="rotate(-90 60 60)" stroke-dasharray="${(326.7 * done / Math.max(1, ms.length)).toFixed(1)} 326.7"></circle></svg><div class="x-ring-txt"><strong>${done}/${ms.length}</strong><small>momenten gespeeld</small></div></div>
          <div class="s-card ok"><b>${n("ok")}</b><span>${icon("checkcircle", "s")} Bewuste keuzes</span><small class="s-muted">Een passende route gekozen.</small></div>
          <div class="s-card warn"><b>${n("warn")}</b><span>${icon("warning", "s")} Aandacht nodig</span><small class="s-muted">Controleer de uitleg bij deze keuzes.</small></div>
          <div class="s-card err"><b>${n("block")}</b><span>${icon("shield", "s")} Tegengehouden</span><small class="s-muted">De voorbeeldmaatregel greep in.</small></div>
        </div>
      </div></section>
      <section class="s-sec tight" aria-labelledby="x-recap-h"><div class="s-wrap">
        <div class="s-head"><div><span class="s-eyebrow">Terugblik</span><h2 class="s-h2" id="x-recap-h">Jouw keuzes</h2></div><p class="s-lead">Open een moment om de uitkomst en de vergelijking zonder Purview opnieuw te bekijken.</p></div>
        <ol class="x-recap">${recap}</ol>
      </div></section>
      <section class="s-sec alt" aria-labelledby="x-les-h"><div class="s-wrap">
        <div class="s-head"><div><span class="s-eyebrow">Verder begrijpen</span><h2 class="s-h2" id="x-les-h">De thema's uit deze werkdag</h2></div></div>
        <div class="s-grid c3">${[...new Set(ms.map((m) => m.topic))].map((id) => { const lesson = ACV.mod(id); return Site.a("academy", id, `<h3>${esc(lesson.title)}</h3><p>${esc(lesson.short)}</p><span class="s-link">Open de les ${icon("chevronright", "s")}</span>`, "s-card"); }).join("")}</div>
      </div></section>
      <section class="s-sec tight"><div class="s-wrap"><div class="s-cta"><div><span class="s-eyebrow s-eyebrow-light">Verder</span><h2>Begrijpen hoe het werkt, of meteen ontwerpen?</h2><p>In Leer Purview kennen ziet u stap voor stap hoe labels, DLP en Copilot samenwerken. In de ontwerpworkshop maakt u het ontwerp voor uw eigen organisatie.</p></div>
        <div class="s-actions">${Site.a("academy", "home", `${icon("book", "s")} Leer Purview kennen`, "s-btn primary")}${Site.a("start", "", `${icon("layers", "s")} Naar de ontwerpworkshop`, "s-btn ghost")}${Site.a("experience", "intro", `${icon("users", "s")} Kies een andere rol`, "s-btn ghost")}<button type="button" class="s-btn ghost" data-action="xp-restart">${icon("redo", "s")} Deze dag opnieuw beginnen</button></div></div></div></section>
      ${Site.footer()}</div>`;
  },
};

/* ---------- Scenariobibliotheek ---------- */
const XLib = {
  _models: {},
  sector() { return this.sectors().find((s) => s.id === XP.lib.sector) || this.sectors()[0]; },
  sectors() { return CATALOG.experience.library.sectors; },
  /** Voorbeeldontwerp per sector (los van de Workshop-state). */
  model(sec = this.sector()) {
    if (!this._models[sec.id]) {
      const st = buildPresetState(sec.preset);
      st.meta.sector = sec.id;
      this._models[sec.id] = st;
    }
    return this._models[sec.id];
  },
  list() {
    const st = this.model(), ch = XP.lib.channel;
    return ScenarioEngine.list(st).filter((s) => ch === "all" || s.channel === ch);
  },
  evaluate(scn) {
    const base = this.model();
    const labels = applicableLabels(base);
    const lid = labels.some((l) => l.id === XP.lib.label) ? XP.lib.label : "";
    const st = lid ? { ...base, scenarioResults: { [scn.id]: { labelId: lid } } } : { ...base, scenarioResults: {} };
    return { res: ScenarioEngine.evaluate(scn, st), st, labels, lid };
  },
  /** Wat merkt de medewerker? Afgeleid van de zwaarste stap. */
  feel(res) {
    const out = ScnUI.outcome(res);
    if (out === "block") return { cls: "block", ic: "shieldcheck", t: "Tegengehouden", d: "Purview houdt de actie tegen of zorgt dat alleen de juiste mensen erbij kunnen." };
    if (out === "tip") return { cls: "warn", ic: "warning", t: "Melding", d: "De medewerker krijgt eerst een melding en maakt dan een bewuste keuze." };
    return { cls: "ok", ic: "checkcircle", t: "Gaat door", d: "Het werk gaat gewoon door. Purview legt waar nodig vast wat er gebeurt." };
  },
  SECTOR_ICONS: { generic: "grid", zorg: "heart", overheid: "gov", financieel: "bank" },
  /** Kanaalnamen zonder productjargon. */
  CH: { exchange: "E-mail", sharing: "Bestand delen", teams: "Teams-chat", endpoint: "Op de laptop", copilot: "Copilot", container: "Team of site", meeting: "Vergadering" },
  chName(k) { return this.CH[k] || (CATALOG.scenarioChannels[k] || {}).name || k; },
  app(s) { return ScenarioEngine.APP[s.channel] || "office"; },
  open(list) { return XP.lib.open ? list.find((s) => s.id === XP.lib.id) || null : null; },
  guide(step) {
    const t = [["Kies een situatie", "grid"], ["Bekijk het scherm", "eye"], ["Begrijp waarom", "info"]];
    return `<ol class="x-guide" aria-label="Zo werkt het">${t.map(([n, ic], i) => `<li class="${i + 1 === step ? "on" : i + 1 < step ? "done" : ""}"${i + 1 === step ? ' aria-current="step"' : ""}><span class="x-guide-n" aria-hidden="true">${i + 1 < step ? icon("check", "s") : i + 1}</span><span>${n}</span></li>`).join("")}</ol>`;
  },
  ctx() {
    const sec = this.sector(), list = this.list(), cur = this.open(list);
    return cur ? `<b class="tc-name">${esc(cur.title)}</b><span class="tc-extra"> · ${esc(sec.name)}</span>` : `<b class="tc-name">${esc(sec.name)}</b><span class="tc-extra"> · ${list.length} situaties</span>`;
  },
  pager() {
    const list = this.list(), cur = this.open(list);
    if (!cur) return "";
    const i = list.indexOf(cur), n = list.length;
    const pl = i ? `Vorige situatie: ${list[i - 1].title}` : "Terug naar alle situaties", nl = i < n - 1 ? `Volgende situatie: ${list[i + 1].title}` : "Terug naar alle situaties";
    return `<button type="button" class="btn subtle" data-action="xp-lib-step" data-dir="-1" title="${esc(pl)}" aria-label="${esc(pl)}">${icon("chevronleft", "s")}</button><span class="sp-pos">Situatie ${i + 1}/${n}</span><button type="button" class="btn" data-action="xp-lib-step" data-dir="1" title="${esc(nl)}" aria-label="${esc(nl)}"><span class="sp-dir">${i < n - 1 ? "Volgende" : "Overzicht"}</span>${icon("chevronright", "s")}</button>`;
  },
  card(s) {
    let f; try { f = this.feel(this.evaluate(s).res); } catch { f = null; }
    return `<li><button type="button" class="x-lib-item" data-action="xp-lib-pick" data-id="${esc(s.id)}" aria-pressed="false">
      <span class="x-lib-top">${Previews.tile(this.app(s))}<span class="x-lib-ch">${esc(this.chName(s.channel))}</span>${f ? `<span class="x-lib-feel ${f.cls}">${icon(f.ic, "s")}<span>${f.t}</span></span>` : ""}</span>
      <b class="x-lib-t">${esc(s.title)}</b>
      <small class="x-lib-who">${icon("user", "s")} ${esc(s.persona || "Medewerker")}</small>
      <span class="x-lib-go">Bekijk wat er gebeurt ${icon("chevronright", "s")}</span>
    </button></li>`;
  },
  hero(step, title, lead) {
    return `<header class="s-hero compact x-lib-hero"><div class="s-wrap">
        <nav class="s-crumb" aria-label="Kruimelpad">${Site.a("hub", "", "Home")}<span aria-hidden="true">›</span>${Site.a("experience", "intro", "Ervaar Purview")}<span aria-hidden="true">›</span>${step > 1 ? `${Site.a("experience", "library", "Scenario's")}<span aria-hidden="true">›</span><span>Situatie</span>` : "<span>Scenario's</span>"}</nav>
        ${title}${lead}
        ${this.guide(step)}
      </div></header>`;
  },
  overview() {
    const secs = this.sectors(), sec = this.sector(), all = ScenarioEngine.list(this.model());
    const count = (k) => all.filter((s) => s.channel === k).length;
    if (XP.lib.channel !== "all" && !count(XP.lib.channel)) XP.lib.channel = "all";
    const list = this.list();
    const chans = [["all", "Alles", null, all.length]].concat(Object.keys(CATALOG.scenarioChannels).map((k) => [k, this.chName(k), ScenarioEngine.APP[k] || "office", count(k)]).filter((c) => c[3]));
    return `<div class="site site-xp x-lib-page">
      ${this.hero(1, `<span class="s-eyebrow">${all.length} situaties uit de praktijk</span><h1 id="x-lib-h">Wat merkt een medewerker van Purview?</h1>`, `<p class="s-lead">Kies een herkenbare situatie. U ziet precies wat er op het scherm verschijnt en waarom. Voorkennis is niet nodig.</p>`)}
      <section class="s-sec tight"><div class="s-wrap">
        <div class="s-card x-lib-filter">
          <div class="x-lib-frow"><span class="x-lib-flabel" id="x-lib-sec-l">Organisatie</span><div class="x-lib-sectors" role="group" aria-labelledby="x-lib-sec-l">${secs.map((s) => `<button type="button" class="x-lib-sector" data-action="xp-lib-sector" data-id="${esc(s.id)}" aria-pressed="${s.id === sec.id}">${icon(this.SECTOR_ICONS[s.id] || "grid", "s")}<span>${esc(s.name)}</span></button>`).join("")}</div></div>
          <div class="x-lib-frow"><span class="x-lib-flabel" id="x-lib-ch-l">Waar gebeurt het?</span><div class="x-lib-chans" role="group" aria-labelledby="x-lib-ch-l">${chans.map(([k, n, app, c]) => `<button type="button" class="x-lib-chan" data-action="xp-lib-channel" data-id="${esc(k)}" aria-pressed="${XP.lib.channel === k}">${app ? Previews.tile(app) : icon("grid", "s")}<span>${esc(n)}</span><small>${c}</small></button>`).join("")}</div></div>
        </div>
        <p class="x-lib-count" role="status">${list.length} ${list.length === 1 ? "situatie" : "situaties"} · ${esc(sec.name)}</p>
        ${list.length ? `<ul class="x-lib-grid" role="list">${list.map((s) => this.card(s)).join("")}</ul>` : `<p class="s-note">Geen situaties voor deze keuze. Kies een ander kanaal.</p>`}
        <aside class="x-lib-own">${icon("edit")}<div><b>Benieuwd naar uw eigen ontwerp?</b><span>In de ontwerpworkshop rekent u dezelfde situaties door met uw eigen labels en regels.</span></div>${Site.a("scenarios", "", `Naar de ontwerpworkshop ${icon("chevronright", "s")}`, "s-btn ghost small")}</aside>
      </div></section>${Site.footer()}</div>`;
  },
  detail(scn, list) {
    const sec = this.sector(), app = this.app(scn), rec = (CATALOG.scenarioRecipients || {})[scn.recipient] || "";
    let ev, stages = null;
    try { ev = this.evaluate(scn); } catch (e) { console.error(e); ev = null; }
    if (ev) { try { stages = ScnPath.model(ev.res, ev.st); } catch (e) { console.error(e); } }
    const by = (k) => (stages || []).find((g) => g.key === k) || {};
    const feel = ev && this.feel(ev.res), out = by("outcome");
    const scene = XP.lib.scene === "before" ? "before" : "after";
    const mock = scene === "before" ? by("actor").mock : out.mock;
    const match = ev ? { pass: ["ok", "checkcircle", "Dit is precies wat de organisatie wil."], partial: ["warn", "warning", "Dit komt deels overeen met wat de organisatie wil."], fail: ["err", "xcircle", "Dit is niet wat de organisatie wil. Hier valt iets te verbeteren."] }[ev.res.status] || null : null;
    const labelBtns = ev ? [`<button type="button" class="x-label" data-action="xp-lib-label" data-id="" aria-pressed="${!ev.lid}">${icon("wand", "s")} Zoals ingesteld</button>`]
      .concat(ev.labels.map((l) => `<button type="button" class="x-label" data-action="xp-lib-label" data-id="${esc(l.id)}" aria-pressed="${ev.lid === l.id}"><i style="--c:${Site.hex(l.color)}"></i>${esc(labelFullName(l, ev.st))}</button>`)).join("") : "";
    const steps = ev ? ev.res.steps.map((s, i) => `<li data-kind="${esc(s.kind)}"><span class="x-tl-n" aria-hidden="true">${i + 1}</span>${Previews.tile(s.app || app)}<span>${esc(s.text)}</span></li>`).join("") : "";
    const i = list.indexOf(scn), prev = list[i - 1], next = list[i + 1];
    const nav = (s, dir, txt) => s ? `<button type="button" class="x-lib-nb ${dir < 0 ? "prev" : "next"}" data-action="xp-lib-step" data-dir="${dir}">${dir < 0 ? icon("chevronleft", "s") : ""}<span><small>${txt}</small><b>${esc(s.title)}</b></span>${dir > 0 ? icon("chevronright", "s") : ""}</button>` : "<span></span>";
    return `<div class="site site-xp x-lib-page">
      ${this.hero(scene === "before" ? 2 : 3, `<div class="x-lib-meta">${Previews.tile(app)}<span class="s-badge info">${esc(this.chName(scn.channel))}</span>${rec ? `<span class="s-chip">${esc(rec)}</span>` : ""}<span class="s-chip">${esc(sec.name)}</span></div><h1 id="x-lib-h">${esc(scn.title)}</h1>`, `<p class="s-lead x-lib-story"><b>${esc(scn.persona || "Een medewerker")}</b> ${esc(scn.story)}</p>`)}
      <section class="s-sec tight"><div class="s-wrap">
        <button type="button" class="s-btn quiet small x-story-back" data-action="xp-lib-back">${icon("chevronleft", "s")} Alle situaties</button>
        ${ev ? `<div class="x-lib-detail x-story" id="x-story">
          <div class="x-lib-stage">
            <div class="x-seg" role="group" aria-label="Wat wilt u zien?">
              <button type="button" class="x-seg-b" data-action="xp-lib-scene" data-v="before" aria-pressed="${scene === "before"}"><span aria-hidden="true">1</span> Wat de medewerker doet</button>
              <button type="button" class="x-seg-b" data-action="xp-lib-scene" data-v="after" aria-pressed="${scene === "after"}"><span aria-hidden="true">2</span> Wat er daarna gebeurt</button>
            </div>
            ${Site.device(scene === "before" ? "Voordat Purview iets doet" : "Wat de medewerker ziet", mock || Previews.sceneNone(), "")}
            <p class="s-small s-muted x-lib-note">${icon("info", "s")} Voorbeeldscherm. Het echte scherm kan er iets anders uitzien.</p>
          </div>
          <div class="x-lib-side">
            <div class="x-outcome ${feel.cls}" aria-live="polite">${icon(feel.ic)}<div><b>${feel.t}</b><span>${esc(out.sentence || feel.d)}</span></div></div>
            ${match ? `<p class="x-match ${match[0]}">${icon(match[1], "s")} ${match[2]}</p>` : ""}
            <div class="x-lib-box"><h2>Waarom gebeurt dit?</h2>
              ${scn.why ? `<p>${esc(scn.why)}</p>` : ""}
              ${(scn.expect || {}).text ? `<p class="x-lib-want">${icon("target", "s")}<span><b>Wat de organisatie wil:</b> ${esc(scn.expect.text)}</span></p>` : ""}
            </div>
            <div class="x-lib-box"><h2>Wat als het label anders was?</h2>
              <p class="s-small s-muted">Een label geeft aan hoe gevoelig informatie is. Kies een ander label en zie wat er verandert.</p>
              <div class="x-labels" role="group" aria-label="Kies het label">${labelBtns}</div>
              ${ev.res.label ? `<p class="s-small x-lib-now">Nu: ${Previews.pill(ev.res.label, ev.st)}</p>` : ""}
            </div>
            <details class="a-tech x-lib-more"><summary>${icon("route", "s")} Stap voor stap: wat Purview doet</summary><div><ol class="x-steps-list x-timeline">${steps}</ol></div></details>
          </div>
        </div>` : `<p class="s-note">Deze situatie kon niet worden doorgerekend.</p>`}
        <nav class="x-lib-pn" aria-label="Andere situaties">${nav(prev, -1, "Vorige situatie")}${nav(next, 1, "Volgende situatie")}</nav>
        <p class="s-small s-muted x-story-foot">Berekend met het voorbeeldontwerp ‘${esc(sec.name)}’. ${Site.a("scenarios", "", "Reken dit door met uw eigen ontwerp")}</p>
      </div></section>${Site.footer()}</div>`;
  },
  render() {
    const list = this.list(), cur = this.open(list);
    if (XP.lib.open && !cur) XP.lib.open = false;
    return cur ? this.detail(cur, list) : this.overview();
  },
};

registerView("experience", {
  title: "Ervaar Purview",
  defaultSub: "intro",
  subbar() {
    const sub = UI.sub.experience || "intro", [kind, rid, mid] = sub.split("/"), lib = sub === "library";
    const r = CATALOG.experience.roles.find((x) => x.id === rid);
    let ctx = "", pager = "";
    if (r) ctx = `<b class="tc-name">De dag van ${esc(r.person.name)}</b><span class="tc-extra"> · ${esc(r.title)}</span>`;
    if (r && kind === "day") pager = XExp.pager(r, mid);
    if (lib && typeof XLib.pager === "function") { ctx = XLib.ctx(); pager = XLib.pager(); }
    return { title: "Ervaar Purview", icon: "users", active: lib ? "library" : "intro", tabs: [["intro", "Werkdagen", "users"], ["library", "Scenario's", "grid"]], ctx, pager };
  },
  normalizeSub(raw) {
    if (!raw || ["intro", "library"].includes(raw)) return raw || "intro";
    const r = XExp.role();
    if (raw === "day") return XExp.dayUrl(r.moments[0], r);
    if (raw === "finale") return "finale/" + r.id;
    const [kind, id, moment, ...extra] = raw.split("/"), role = CATALOG.experience.roles.find((x) => x.id === id);
    if (!role || extra.length) return null;
    if (["role", "finale"].includes(kind) && !moment) return kind + "/" + id;
    return kind === "day" && role.moments.some((m) => m.id === moment) ? raw : null;
  },
  render() {
    const sub = UI.sub.experience || "intro", [kind, role, moment] = sub.split("/");
    if (sub === "library") return XLib.render();
    if (role) XP.role = role;
    if (kind === "role") return XExp.rolePage();
    if (kind === "day") { XP.i = XExp.role().moments.findIndex((m) => m.id === moment); return XExp.day(); }
    if (kind === "finale") return XExp.finale();
    return XExp.intro();
  },
});

/** Focus en (indien nodig) scroll naar een element in #main na het renderen. */
function xpFocus(sel) {
  const main = $("#main"), el = main && $(sel, main);
  if (!el) return;
  el.setAttribute("tabindex", "-1");
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: "nearest", behavior: reducedMotion() ? "auto" : "smooth" });
}

Actions["xp-choose"] = (el) => {
  const m = CATALOG.experience.moments.find((x) => x.id === el.dataset.id);
  if (!m || !m.choices.some((c) => c.key === el.dataset.key)) return;
  XP.picks[m.id] = el.dataset.key;
  XP.view[m.id] = "with";
  xpSave();
  App.render();
  xpFocus("#x-out-h");
};
Actions["xp-view"] = (el) => {
  const id = el.dataset.id;
  if (!CATALOG.experience.moments.some((m) => m.id === id)) return;
  XP.view[id] = el.dataset.v === "without" ? "without" : "with";
  xpSave();
  App.render();
};
Actions["xp-roles"] = () => {
  const first = $("#main .x-role");
  if (!first) return;
  first.scrollIntoView({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" });
  first.focus({ preventScroll: true });
};
Actions["xp-finale"] = () => Site.go("experience", "finale/" + XExp.role().id);
Actions["xp-restart"] = () => {
  const r = XExp.role();
  confirmDialog("Deze werkdag opnieuw beginnen?", "Alleen de keuzes voor " + r.person.name + " worden gewist. Andere werkdagen en uw ontwerp blijven behouden.", () => {
    r.moments.forEach((m) => { delete XP.picks[m.id]; delete XP.view[m.id]; });
    xpSave(); Site.go("experience", XExp.dayUrl(r.moments[0], r));
  });
};
Actions["xp-lib-sector"] = (el) => {
  if (!XLib.sectors().some((s) => s.id === el.dataset.id)) return;
  Object.assign(XP.lib, { sector: el.dataset.id, id: "", label: "", open: false });
  App.render();
};
Actions["xp-lib-channel"] = (el) => {
  const k = el.dataset.id;
  if (k !== "all" && !Object.hasOwn(CATALOG.scenarioChannels, k)) return;
  Object.assign(XP.lib, { channel: k, id: "", label: "", open: false });
  App.render();
};
function xpLibOpen(id) {
  Object.assign(XP.lib, { id: String(id || ""), label: "", open: true, scene: "after" });
  App.render();
  window.scrollTo({ top: 0, behavior: "auto" });
  const h = $("#x-lib-h");
  if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
}
Actions["xp-lib-pick"] = (el) => xpLibOpen(el.dataset.id);
Actions["xp-lib-step"] = (el) => {
  const list = XLib.list(), i = list.findIndex((s) => s.id === XP.lib.id), n = list[i + (el.dataset.dir === "-1" ? -1 : 1)];
  if (n) xpLibOpen(n.id); else Actions["xp-lib-back"]();
};
Actions["xp-lib-scene"] = (el) => { XP.lib.scene = el.dataset.v === "before" ? "before" : "after"; App.render(); };
Actions["xp-lib-label"] = (el) => { XP.lib.label = String(el.dataset.id || ""); XP.lib.scene = "after"; App.render(); };
Actions["xp-lib-back"] = () => {
  const id = XP.lib.id;
  XP.lib.open = false; XP.lib.label = "";
  App.render();
  const main = $("#main"), item = main && ($(`.x-lib-item[data-id="${CSS.escape(id)}"]`, main) || $(".x-lib-item", main));
  if (!item) return;
  item.focus({ preventScroll: true });
  item.scrollIntoView({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" });
};

