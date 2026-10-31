/* Ervaar Purview (#experience): interactieve werkdag bij Noordhaven + losstaande scenario's per sector.
   Learning bewaart vaste keuzes per rol en welke scenario's zijn bekeken. Geen van beide raakt de ontwerpstate (S()). */

const XP = { role: "hr", i: 0, picks: {}, view: {}, seen: [], lib: { sector: "generic", channel: "all", id: "", step: 1, guess: "" } };
const XP_TONE = { ok: ["ok", "checkcircle", "Veilige keuze"], warn: ["warn", "warning", "Aandacht nodig"], block: ["err", "shield", "Tegengehouden"] };

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
      : !without && choice?.effect === "recommend" ? [["auto", "Aanbevolen label toegepast", "Je hebt het voorstel gecontroleerd en overgenomen."]]
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
    return { t: "toast", level: blocked ? "block" : "audit", act, file, title: blocked ? "Actie geblokkeerd" : "Voorbeeld van een beheerd apparaat", text: blocked ? choice.result.text : without ? m.without : "Gebruik de route die de organisatie hiervoor heeft.", note: "Voorbeeld van het beleid in deze situatie. Op andere apparaten kan het anders werken." };
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
        <span class="s-eyebrow">Zes collega's, één gewone werkdag</span>
        <h1>Loop een werkdag mee <span class="s-grad-text">met een collega</span></h1>
        <p class="s-lead">Kies een collega en speel vijf momenten uit zijn of haar werkdag. Bij elk moment kies je wat je zelf zou doen. Je ziet meteen wat Purview doet, en waar het op je eigen oordeel aankomt.</p>
        <div class="s-actions x-intro-actions"><button type="button" class="s-btn primary" data-action="xp-roles">${icon("users", "s")} Kies een werkdag</button>${Site.a("experience", "library", `${icon("grid", "s")} Bekijk situaties uit de praktijk`, "s-btn ghost")}</div>
        <p class="s-small">Alle personen en gegevens zijn verzonnen. Er is geen echte Microsoft 365-omgeving gekoppeld.</p>
      </div></header><section class="s-sec tight"><div class="s-wrap"><h2 class="sr-only" id="x-roles-h" tabindex="-1">Kies een werkdag</h2><div class="s-grid c3 x-roles">
      ${this.C.roles.map((r) => Site.a("experience", "role/" + r.id, `<div class="x-role-head">${this.avatar(r.person)}<span>${esc(r.person.name)}<small>${r.moments.length} momenten</small></span></div><h3>${esc(r.title)}</h3><p>${esc(r.intro.split(".")[0].replace(/^Je /, r.person.name + " "))}.</p><div class="x-role-apps" aria-hidden="true">${[...new Set(r.moments.map((m) => m.app))].map((a) => msLogo(a)).join("")}</div><span class="s-link">${this.answered(r) ? `${this.answered(r)} van ${r.moments.length} gespeeld · verdergaan` : "Start deze werkdag"} ${icon("chevronright", "s")}</span>`, "s-card x-role")).join("")}
      </div><aside class="x-lib-banner"><div><span class="s-eyebrow">Scenario's</span><h2>Liever per situatie kijken?</h2><p>Van een mail met een BSN tot een vraag aan Copilot: zie in één oogopslag wat een medewerker op het scherm krijgt, en waarom.</p>${Site.a("experience", "library", `Bekijk de situaties ${icon("chevronright", "s")}`, "s-btn primary")}</div><div class="x-lib-banner-apps" aria-hidden="true">${[...new Set(this.C.roles.flatMap((r) => r.moments.map((m) => m.app)))].slice(0, 6).map((a) => `<span>${msLogo(a)}</span>`).join("")}</div></aside></div></section>${Site.footer()}</div>`;
  },
  rolePage() {
    const r = this.role(), next = r.moments.find((m) => !this.choice(m)) || r.moments[0];
    return `<div class="site site-xp"><header class="s-hero compact"><div class="s-wrap">
      <nav class="s-crumb" aria-label="Kruimelpad">${Site.a("hub", "", "Home")}<span aria-hidden="true">›</span>${Site.a("experience", "intro", "Ervaar Purview")}<span aria-hidden="true">›</span><span>${esc(r.title)}</span></nav>
      <div class="x-role-intro">${this.avatar(r.person)}<div><span class="s-eyebrow">${esc(r.title)}</span><h1>Een dag met ${esc(r.person.name)}</h1></div></div><p class="s-lead">${esc(r.intro)}</p>
      <div class="s-actions">${Site.a("experience", this.dayUrl(next), `${icon("play", "s")} ${this.answered() ? "Werkdag hervatten" : "Begin de werkdag"}`, "s-btn primary")}${Site.a("experience", "finale/" + r.id, "Jouw terugblik", "s-btn ghost")}</div>
      </div></header><section class="s-sec tight"><div class="s-wrap"><h2 class="s-h2">Of begin bij een ander moment</h2><p>Je kunt elk moment los openen en je keuzes later nog aanpassen.</p>
      <ol class="x-role-timeline">${r.moments.map((m) => `<li>${Site.a("experience", this.dayUrl(m), `<time>${esc(m.time)}</time>${msLogo(m.app)}<span><b>${esc(m.title)}</b><small>${esc(this.appName(m.app))} · ${this.choice(m) ? "Al gespeeld" : "Nog niet gespeeld"}</small></span>${icon("chevronright", "s")}`, "s-card x-role-moment")}</li>`).join("")}</ol>
      <button class="s-btn quiet small" data-action="xp-restart">${icon("redo", "s")} Alleen deze werkdag opnieuw beginnen</button>
      </div></section>${Site.footer()}</div>`;
  },

  progress() {
    const ms = this.C.moments, done = this.answered();
    return `<div class="x-progress"><div class="s-wrap">${Site.a("experience", "intro", `${icon("chevronleft", "s")}<span>Werkdagen</span>`, "x-progress-back", 'title="Terug naar alle werkdagen"')}${Site.a("experience", "role/" + this.role().id, `${this.avatar(this.person(), true)}<span>${esc(this.person().name)}</span>`, "x-progress-title", `title="Overzicht van de dag van ${esc(this.person().name)}"`)}
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
        <div class="x-behind"><h3 class="x-behind-h">Meer weten</h3>
          <p class="s-small s-muted">De uitkomst hoort bij de voorbeeldafspraken van deze organisatie. Wat medewerkers zien, verschilt per organisatie en instelling.</p>
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
      return `<li>${Site.a("experience", this.dayUrl(m), `<time>${esc(m.time)}</time>${msLogo(m.app)}<span><b>${esc(m.title)}</b><small>${c ? esc(c.title) : "Nog niet gespeeld, open deze situatie"}</small></span>${t ? `<span class="s-badge ${t[0]}">${esc(t[2])}</span>` : icon("chevronright", "s")}`, "x-recap-link")}</li>`;
    }).join("");
    return `<div class="site site-xp">
      <header class="s-hero compact"><div class="s-wrap">
        <nav class="s-crumb" aria-label="Kruimelpad">${Site.a("hub", "", "Home")}<span aria-hidden="true">›</span>${Site.a("experience", "intro", "Ervaar Purview")}<span aria-hidden="true">›</span><span>Samenvatting</span></nav>
        <span class="s-eyebrow">Jouw terugblik · ${esc(r.title)}</span>
        <h1>De dag van <span class="s-grad-text">${esc(r.person.name)}</span></h1>
        <p class="s-lead">Je speelde ${done} van ${ms.length} momenten. Waar hielp Purview je, en waar kwam het op je eigen oordeel aan?</p>
      </div></header>
      <section class="s-sec tight"><div class="s-wrap">
        <div class="x-score">
          <div class="s-card x-ring-card"><svg class="x-ring" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="x-ring-bg"></circle><circle cx="60" cy="60" r="52" class="x-ring-fg" transform="rotate(-90 60 60)" stroke-dasharray="${(326.7 * done / Math.max(1, ms.length)).toFixed(1)} 326.7"></circle></svg><div class="x-ring-txt"><strong>${done}/${ms.length}</strong><small>momenten gespeeld</small></div></div>
          <div class="s-card ok"><b>${n("ok")}</b><span>${icon("checkcircle", "s")} Veilige keuzes</span><small class="s-muted">Je koos een route die past.</small></div>
          <div class="s-card warn"><b>${n("warn")}</b><span>${icon("warning", "s")} Aandacht nodig</span><small class="s-muted">Lees bij deze keuzes de uitleg nog eens.</small></div>
          <div class="s-card err"><b>${n("block")}</b><span>${icon("shield", "s")} Tegengehouden</span><small class="s-muted">De regel in het voorbeeld greep in.</small></div>
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
      <section class="s-sec tight"><div class="s-wrap"><div class="s-cta"><div><span class="s-eyebrow s-eyebrow-light">Verder</span><h2>Begrijpen hoe het werkt, of meteen ontwerpen?</h2><p>In Leer Purview kennen lees je hoe labels, DLP en Copilot samenwerken. In de ontwerpworkshop maak je samen het ontwerp voor je eigen organisatie.</p></div>
        <div class="s-actions">${Site.a("academy", "home", `${icon("book", "s")} Leer Purview kennen`, "s-btn primary")}${Site.a("start", "", `${icon("layers", "s")} Naar de ontwerpworkshop`, "s-btn ghost")}${Site.a("experience", "intro", `${icon("users", "s")} Kies een andere rol`, "s-btn ghost")}<button type="button" class="s-btn ghost" data-action="xp-restart">${icon("redo", "s")} Deze dag opnieuw beginnen</button></div></div></div></section>
      ${Site.footer()}</div>`;
  },
};

/* ---------- Scenario's: losstaande praktijksituaties per sector (CATALOG.xpScenarios) ----------
   Vaste, gecontroleerde uitkomsten per scenario. Geen koppeling met het ontwerp (S()), presets of ScenarioEngine.
   Routes: library · library/<sector> · library/<sector>/<id>. Bewaard wordt alleen welke scenario's zijn bekeken. */
const XS_OUT = {
  ok: { cls: "ok", ic: "checkcircle", t: "Gaat door", d: "Het werk gaat gewoon door." },
  tip: { cls: "warn", ic: "warning", t: "Eerst een melding", d: "De medewerker krijgt uitleg en beslist dan zelf." },
  block: { cls: "block", ic: "shieldcheck", t: "Tegengehouden", d: "Purview houdt de actie tegen." },
};
const XS_CH = { mail: ["E-mail", "outlook"], share: ["Delen", "spo"], teams: ["Teams", "teams"], device: ["Laptop", "endpoint"], copilot: ["Copilot", "copilot"], doc: ["Document", "word"] };
const XS_FEAT_IC = { label: "tag", encrypt: "lock", recommend: "bulb", dlp: "shield", override: "warning", teams: "chat", endpoint: "laptop", copilot: "sparkle", audit: "eye", container: "users" };
const XS_SEEN_MAX = 200;
function xsNormalize(raw) {
  const o = isPlainObj(raw) ? raw : {}, ids = new Set((CATALOG.xpScenarios.items || []).map((s) => s.id));
  const seen = Array.isArray(o.seen) ? [...new Set(o.seen.filter((x) => typeof x === "string" && ids.has(x)))].slice(0, XS_SEEN_MAX) : [];
  return { seen };
}
XP.seen = Learning.register("scenarios", { version: 1, normalize: xsNormalize, reset: () => { XP.seen = []; } }).seen;

const XLib = {
  C() { return CATALOG.xpScenarios; },
  STEPS: ["Situatie", "Wat er gebeurt", "Waarom en wat nu"],
  sectors() { return this.C().sectors; },
  sector(id = XP.lib.sector) { return this.sectors().find((s) => s.id === id) || this.sectors()[0]; },
  items(sec = this.sector()) { return this.C().items.filter((s) => s.sector === sec.id); },
  list(sec = this.sector()) { const ch = XP.lib.channel; return this.items(sec).filter((s) => ch === "all" || s.channel === ch); },
  find(id) { return this.C().items.find((s) => s.id === id) || null; },
  isSeen(id) { return XP.seen.includes(id); },
  markSeen(id) {
    if (this.isSeen(id) || !this.find(id)) return;
    XP.seen = XP.seen.concat(id).slice(-XS_SEEN_MAX);
    Learning.save("scenarios", { seen: XP.seen });
  },
  ch(s) { return XS_CH[s.channel] || XS_CH.doc; },
  url(s) { return `library/${s.sector}/${s.id}`; },
  initials(name) { return String(name || "?").trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase(); },
  avatar(p, sec) { return `<span class="xs-avatar" data-sector="${esc(sec.id)}" aria-hidden="true">${esc(this.initials(p.name))}</span>`; },
  device(title, scene, app) { return `${Site.device(title, XScene.render(scene) || Previews.sceneNone(), app)}<p class="xs-note">${icon("info", "s")} Voorbeeldscherm. Het echte scherm kan er iets anders uitzien.</p>`; },
  crumb(parts) { return `<nav class="s-crumb" aria-label="Kruimelpad">${Site.a("hub", "", "Home")}<span aria-hidden="true">›</span>${Site.a("experience", "intro", "Ervaar Purview")}${parts.map((p) => `<span aria-hidden="true">›</span>${p}`).join("")}</nav>`; },
  progress(done, total, label) {
    const pct = total ? Math.round((done / total) * 100) : 0;
    return `<span class="xs-prog" role="img" aria-label="${esc(label)}"><span class="xs-prog-bar"><i style="width:${pct}%"></i></span><span class="xs-prog-t" aria-hidden="true">${done}/${total} bekeken</span></span>`;
  },

  overview() {
    const secs = this.sectors(), sec = this.sector(), all = this.items(sec);
    const count = (k) => all.filter((s) => s.channel === k).length;
    if (XP.lib.channel !== "all" && !count(XP.lib.channel)) XP.lib.channel = "all";
    const list = this.list(sec), seen = all.filter((s) => this.isSeen(s.id)).length;
    const chans = [["all", "Alles", null, all.length]].concat(Object.keys(XS_CH).filter((k) => count(k)).map((k) => [k, XS_CH[k][0], XS_CH[k][1], count(k)]));
    const how = [["Lees de situatie", "Een collega wil iets mailen, delen of opslaan."], ["Voorspel", "Gaat het door, komt er een melding of houdt Purview het tegen?"], ["Begrijp", "Zie het scherm, waarom het zo gaat en hoe het veilig kan."]];
    const secCard = (s) => {
      const items = this.items(s), n = items.filter((x) => this.isSeen(x.id)).length, on = s.id === sec.id;
      return `<li>${Site.a("experience", "library/" + s.id, `${brandImg(s.illu, "", "xs-sec-art", ' width="160" height="120"')}<span class="xs-sec-name">${esc(s.name)}</span><span class="xs-sec-sub">${esc(s.org)} · ${items.length} situaties</span>${this.progress(n, items.length, `${n} van ${items.length} situaties bekeken`)}`, "xs-sec" + (on ? " on" : ""), on ? 'aria-current="true"' : "")}</li>`;
    };
    const card = (s) => {
      const [chName, app] = this.ch(s), done = this.isSeen(s.id);
      return `<li>${Site.a("experience", this.url(s), `<span class="xs-card-band" data-ch="${esc(s.channel)}">${Previews.tile(app)}<span>${esc(chName)}</span>${done ? `<span class="xs-seen">${icon("check", "s")} Bekeken</span>` : ""}</span>
        <span class="xs-card-body"><b class="xs-card-t">${esc(s.title)}</b><span class="xs-card-who">${esc(s.person.name)} · ${esc(s.person.role)}</span><span class="xs-card-q">${esc(s.teaser)}</span><span class="xs-card-go">${done ? "Nog eens bekijken" : "Bekijk de situatie"} ${icon("chevronright", "s")}</span></span>`, "xs-card" + (done ? " done" : ""))}</li>`;
    };
    return `<div class="site site-xp xs-page">
      <header class="s-hero compact xs-hero"><div class="s-wrap xs-hero-grid"><div>
        ${this.crumb(["<span>Scenario's</span>"])}
        <span class="s-eyebrow">Scenario's · geen voorkennis nodig</span>
        <h1 id="x-lib-h">Wat merkt een medewerker van Purview?</h1>
        <p class="s-lead">Kies een sector en een situatie. Je voorspelt eerst wat er gebeurt. Daarna zie je het scherm van de medewerker en lees je waarom het zo gaat.</p>
        <ol class="xs-how">${how.map(([t, d], i) => `<li><span class="xs-how-n" aria-hidden="true">${i + 1}</span><span><b>${t}</b><small>${d}</small></span></li>`).join("")}</ol>
      </div>${brandImg("illuScnHero", "", "xs-hero-art", ' width="320" height="220"')}</div></header>
      <section class="s-sec tight xs-sec-block" aria-labelledby="xs-h1"><div class="s-wrap">
        <h2 class="xs-h2" id="xs-h1">Kies een sector <small>Elke sector is een verzonnen organisatie met eigen situaties.</small></h2>
        <ul class="xs-secs" role="list">${secs.map(secCard).join("")}</ul>
      </div></section>
      <section class="s-sec tight xs-sec-block" aria-labelledby="xs-h2"><div class="s-wrap">
        <h2 class="xs-h2" id="xs-h2">Kies een situatie <small>bij ${esc(sec.org)}</small></h2>
        <div class="xs-tools"><div class="xs-chans" role="group" aria-label="Waar gebeurt het?">${chans.map(([k, n, app, c]) => `<button type="button" class="xs-chan" data-action="xp-lib-channel" data-id="${esc(k)}" aria-pressed="${XP.lib.channel === k}">${app ? Previews.tile(app) : icon("grid", "s")}<span>${esc(n)}</span><small>${c}</small></button>`).join("")}</div>
          <p class="xs-count" role="status">${seen} van ${all.length} bekeken</p></div>
        <ul class="xs-grid" role="list">${list.map(card).join("")}</ul>
        <aside class="xs-more">${icon("book")}<div><b>Wil je weten hoe dit werkt?</b><span>In Leer Purview kennen leggen korte lessen uit wat labels, DLP en Copilot-beveiliging doen.</span></div>${Site.a("academy", "home", `Naar de leerpaden ${icon("chevronright", "s")}`, "s-btn ghost small")}</aside>
      </div></section>${Site.footer()}</div>`;
  },

  stepper(step) {
    return `<ol class="x-guide xs-guide" aria-label="Stappen in deze situatie">${this.STEPS.map((n, i) => {
      const k = i + 1, cur = k === step ? ' aria-current="step"' : "";
      return `<li class="${k === step ? "on" : k < step ? "done" : ""}"><button type="button" class="x-guide-b" data-action="xp-lib-go" data-step="${k}"${cur}><span class="x-guide-n" aria-hidden="true">${k < step ? icon("check", "s") : k}</span><span>${n}</span></button></li>`;
    }).join("")}</ol>`;
  },
  guessFb(s) {
    const g = XP.lib.guess;
    if (!g) return "";
    const right = g === s.outcome, mine = XS_OUT[g].t;
    return right ? `<p class="xs-fb ok">${icon("sparkle", "s")}<span><b>Goed ingeschat.</b> Je verwachtte: ${esc(mine)}.</span></p>`
      : `<p class="xs-fb info">${icon("bulb", "s")}<span><b>Anders dan je dacht.</b> Je verwachtte: ${esc(mine)}. In de volgende stap lees je waarom het zo gaat.</span></p>`;
  },
  detail(s) {
    const sec = this.sector(s.sector), list = this.items(sec), i = list.indexOf(s), next = list[i + 1] || null;
    const [chName, app] = this.ch(s), out = XS_OUT[s.outcome] || XS_OUT.ok, step = [1, 2, 3].includes(XP.lib.step) ? XP.lib.step : 1, g = XP.lib.guess;
    let body = "";
    if (step === 1) {
      body = `<div class="xs-split"><div class="xs-main">
          <div class="xs-person">${this.avatar(s.person, sec)}<div><b>${esc(s.person.name)}</b><small>${esc(s.person.role)} · ${esc(sec.org)}</small></div></div>
          <p class="xs-story">${esc(s.story)}</p>
          <div class="xs-guess"><h2 id="x-lib-step-h">Wat denk jij dat er gebeurt?</h2><p class="xs-muted">Er is geen fout antwoord. Kies wat jij verwacht en kijk daarna wat er gebeurt.</p>
            <div class="xs-opts" role="group" aria-label="Jouw verwachting">${Object.entries(XS_OUT).map(([k, o]) => `<button type="button" class="xs-opt ${o.cls}" data-action="xp-lib-guess" data-v="${k}" aria-pressed="${g === k}">${icon(o.ic)}<span><b>${o.t}</b><small>${o.d}</small></span></button>`).join("")}</div>
            ${g ? `<p class="xs-set" role="status">${icon("checkcircle", "s")} Je verwachting staat genoteerd. Bekijk nu wat er gebeurt.</p>` : ""}</div>
        </div><div class="xs-stage">${this.device("Vlak voordat " + s.person.name + " verdergaat", s.before, "")}</div></div>`;
    } else if (step === 2) {
      body = `<div class="xs-split"><div class="xs-main">
          <h2 id="x-lib-step-h" class="xs-step-h">Dit gebeurt er</h2>
          <div class="xs-outcome ${out.cls}">${icon(out.ic)}<div><b>${out.t}</b><span>${esc(s.result)}</span></div></div>
          ${this.guessFb(s)}
        </div><div class="xs-stage">${this.device("Wat " + s.person.name + " ziet", s.after, "")}</div></div>`;
    } else {
      body = `<div class="xs-why">
          <section class="xs-box xs-box-why"><h2 id="x-lib-step-h" class="xs-step-h">Waarom gebeurt dit?</h2><p>${esc(s.why)}</p></section>
          ${s.next ? `<section class="xs-box xs-box-next"><h3>${icon("checkcircle", "s")} Zo doe je het veilig</h3><p>${esc(s.next)}</p></section>` : ""}
          <section class="xs-box xs-box-feats"><h3>${icon("shield", "s")} Hier zit Purview achter</h3><ul class="xs-feats" role="list">${s.features.map((f) => `<li><span class="xs-feat-ic" aria-hidden="true">${icon(XS_FEAT_IC[f.key] || "shield")}</span><span><b>${esc(f.name)}</b><small>${esc(f.text)}</small></span></li>`).join("")}</ul>
            ${Site.a("academy", s.lesson, `${icon("book", "s")} Lees de les: ${esc((ACV.mod(s.lesson) || {}).title || "Leer Purview kennen")}`, "s-link xs-lesson")}</section>
          <section class="xs-box"><h3>${icon("target", "s")} Wat levert dit op?</h3><p>${esc(s.value)}</p></section>
          ${s.note ? `<section class="xs-box xs-box-note"><h3>${icon("info", "s")} Goed om te weten</h3><p>${esc(s.note)}</p></section>` : ""}
        </div>
        ${next ? `<aside class="xs-next"><span class="s-eyebrow">Volgende situatie</span>${Site.a("experience", this.url(next), `<b>${esc(next.title)}</b><span>${esc(next.teaser)}</span>${icon("chevronright", "s")}`, "xs-next-card")}</aside>` : list.every((x) => this.isSeen(x.id)) ? `<aside class="xs-next done"><span class="s-eyebrow">Klaar met ${esc(sec.name)}</span><p>Je hebt alle ${list.length} situaties in deze sector bekeken. Kies hieronder een andere sector of lees verder in de lessen.</p></aside>` : `<aside class="xs-next last"><p>Dit was de laatste situatie in deze lijst. Je hebt ${list.filter((x) => this.isSeen(x.id)).length} van de ${list.length} bekeken.</p></aside>`}`;
    }
    const stepBtn = (k, small, label, dir) => `<button type="button" class="a-step-btn ${dir}" data-action="xp-lib-go" data-step="${k}">${dir === "prev" ? icon("chevronleft", "s") : ""}<span><small>${small}</small>${esc(label)}</span>${dir === "next" ? icon("chevronright", "s") : ""}</button>`;
    const prev = step === 1 ? Site.a("experience", "library/" + sec.id, `${icon("chevronleft", "s")}<span><small>Terug</small>Alle situaties</span>`, "a-step-btn prev") : stepBtn(step - 1, "Vorige stap", this.STEPS[step - 2], "prev");
    const nextBtn = step < 3 ? stepBtn(step + 1, step === 1 && !g ? "Of sla de voorspelling over" : "Volgende stap", step === 1 ? "Bekijk wat er gebeurt" : "Lees waarom", "next")
      : next ? Site.a("experience", this.url(next), `<span><small>Volgende situatie</small>${esc(next.title)}</span>${icon("chevronright", "s")}`, "a-step-btn next") : Site.a("experience", "library/" + sec.id, `<span><small>Klaar</small>Alle situaties</span>${icon("chevronright", "s")}`, "a-step-btn next");
    return `<div class="site site-xp xs-page xs-detail-page">
      <header class="s-hero compact xs-hero xs-hero-detail"><div class="s-wrap">
        ${this.crumb([Site.a("experience", "library", "Scenario's"), Site.a("experience", "library/" + sec.id, esc(sec.name)), "<span>Situatie</span>"])}
        <div class="xs-meta">${Previews.tile(app)}<span class="s-badge info">${esc(chName)}</span><span class="s-chip">${esc(sec.org)}</span><span class="s-chip">Situatie ${i + 1} van ${list.length}</span></div>
        <h1 id="x-lib-h">${esc(s.title)}</h1>
        ${this.stepper(step)}
      </div></header>
      <section class="s-sec tight"><div class="s-wrap"><div class="xs-step xs-step-${step}" id="x-story">${body}</div>
        <nav class="a-step-nav xs-stepnav" aria-label="Stappen in deze situatie">${prev}${nextBtn}</nav>
      </div></section>${Site.footer()}</div>`;
  },
  render(sub) {
    const [, secId, id] = String(sub || "library").split("/");
    if (secId && this.sectors().some((s) => s.id === secId)) XP.lib.sector = secId;
    const s = id ? this.find(id) : null;
    if (!s) { XP.lib.id = ""; return this.overview(); }
    if (XP.lib.id !== s.id) Object.assign(XP.lib, { id: s.id, step: 1, guess: "" });
    if (XP.lib.step > 1) this.markSeen(s.id);
    return this.detail(s);
  },
  normalizeSub(raw) {
    const [k, secId, id, ...extra] = String(raw).split("/");
    if (k !== "library" || extra.length) return null;
    if (!secId) return "library";
    const sec = this.sectors().find((s) => s.id === secId);
    if (!sec) return null;
    if (!id) return "library/" + sec.id;
    const s = this.find(id);
    return s && s.sector === sec.id ? `library/${sec.id}/${s.id}` : null;
  },
};

registerView("experience", {
  title: "Ervaar Purview",
  defaultSub: "intro",
  navSub() { return String(UI.sub.experience || "intro").startsWith("library") ? "library" : "intro"; },
  normalizeSub(raw) {
    if (!raw || raw === "intro") return "intro";
    if (String(raw).startsWith("library")) return XLib.normalizeSub(raw);
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
    if (sub.startsWith("library")) return XLib.render(sub);
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
  confirmDialog("Deze werkdag opnieuw beginnen?", "Alleen de keuzes voor " + r.person.name + " worden gewist. Andere werkdagen en je ontwerp blijven staan.", () => {
    r.moments.forEach((m) => { delete XP.picks[m.id]; delete XP.view[m.id]; });
    xpSave(); Site.go("experience", XExp.dayUrl(r.moments[0], r));
  });
};
Actions["xp-lib-channel"] = (el) => {
  const k = el.dataset.id;
  if (k !== "all" && !Object.hasOwn(XS_CH, k)) return;
  XP.lib.channel = k;
  App.render();
  const b = $(`#main .xs-chan[data-id="${CSS.escape(k)}"]`);
  if (b) b.focus({ preventScroll: true });
};
Actions["xp-lib-go"] = (el) => {
  const k = Number(el.dataset.step);
  if (![1, 2, 3].includes(k) || !XLib.find(XP.lib.id)) return;
  XP.lib.step = k;
  App.render();
  xpFocus("#x-lib-step-h");
};
Actions["xp-lib-guess"] = (el) => {
  const v = el.dataset.v;
  if (!Object.hasOwn(XS_OUT, v)) return;
  XP.lib.guess = v;
  App.render();
  const b = $(`#main [data-action="xp-lib-guess"][data-v="${v}"]`);
  if (b) b.focus({ preventScroll: true });
};
