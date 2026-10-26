/* Uitlegplaten voor de Referentiearchitectuur (WS-I).
   Eigen tekeningen, inhoudelijk gebaseerd op Microsoft Learn; geen kopie van Microsoft-beeldmateriaal.
   Alleen statische SVG-markup: geen scripts, event-attributen, ids of externe verwijzingen.
   Kleuren via CSS-klassen in r6-arch.css (licht en donker). Een token %%ICO:naam:x:y:maat%% wordt bij het
   tonen vervangen door het productlogo uit BRAND_ASSETS (data-URI), of weggelaten als dat logo er niet is. */
const ARCH_DIAGRAMS = (() => {
  const x = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const r = (n) => Math.round(n * 10) / 10;
  const box = (X, Y, w, h, c = "dg-box", rx = 10) => `<rect x="${X}" y="${Y}" width="${w}" height="${h}" rx="${rx}" class="${c}"/>`;
  const txt = (X, Y, s, c = "dg-s", a = "start") => `<text x="${X}" y="${Y}" class="${c}"${a !== "start" ? ` text-anchor="${a}"` : ""}>${x(s)}</text>`;
  const lines = (X, Y, arr, c = "dg-s", a = "start", lh = 18) => arr.map((s, i) => txt(X, Y + i * lh, s, c, a)).join("");
  const arrow = (x1, y1, x2, y2, c = "") => {
    const ang = Math.atan2(y2 - y1, x2 - x1), L = 9, W = 5;
    const bx = x2 - L * Math.cos(ang), by = y2 - L * Math.sin(ang), px = -Math.sin(ang) * W, py = Math.cos(ang) * W;
    const k = c ? " " + c : "";
    return `<line x1="${x1}" y1="${y1}" x2="${r(bx)}" y2="${r(by)}" class="dg-line${k}"/><polygon points="${x2},${y2} ${r(bx + px)},${r(by + py)} ${r(bx - px)},${r(by - py)}" class="dg-head${k}"/>`;
  };
  const num = (X, Y, n) => `<circle cx="${X}" cy="${Y}" r="13" class="dg-num"/>${txt(X, Y + 4.5, n, "dg-numt", "middle")}`;
  const ico = (key, X, Y, s) => `%%ICO:${key}:${X}:${Y}:${s}%%`;
  const svg = (w, h, label, body) => `<svg class="dg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${x(label)}" focusable="false"><title>${x(label)}</title>${body}</svg>`;
  const mark = (X, Y, k) => {
    if (k === "ok") return `<circle cx="${X}" cy="${Y}" r="9" class="dg-ok"/><path d="M${X - 4} ${Y} l3 3.5 l5.5 -7" class="dg-mk"/>`;
    if (k === "part") return `<circle cx="${X}" cy="${Y}" r="8.5" class="dg-part"/><path d="M${X} ${Y - 8.5} a8.5 8.5 0 0 0 0 17 z" class="dg-partf"/>`;
    return `<circle cx="${X}" cy="${Y}" r="8.5" class="dg-no"/><line x1="${X - 4}" y1="${Y}" x2="${X + 4}" y2="${Y}" class="dg-nomk"/>`;
  };
  const LIC = "Eigen tekening (Pink Elephant), geen Microsoft-beeldmateriaal. Controleer details op Microsoft Learn.";

  /* 1. De keten en de levenscyclus van een item */
  const keten = (() => {
    const st = [
      ["Herkennen", "Wat staat erin?", ["Sensitive info types", "Exact data match", "Trainable classifiers"]],
      ["Labelen", "Hoe gevoelig is het?", ["Handmatig of standaard", "Automatisch in Office", "Automatisch in de service"]],
      ["Beschermen", "Wat mag ermee?", ["Versleuteling en rechten", "Markering", "Data loss prevention"]],
      ["Monitoren", "Wat gebeurt ermee?", ["Activity explorer", "Audit", "DLP alerts"]],
    ];
    let b = "";
    st.forEach(([t, q, it], i) => {
      const X = 20 + i * 240;
      b += box(X, 20, 200, 176, i === 1 ? "dg-box dg-accent" : "dg-box") + num(X + 26, 48, String(i + 1)) + txt(X + 48, 53, t, "dg-t") + txt(X + 20, 84, q, "dg-q");
      b += `<line x1="${X + 20}" y1="98" x2="${X + 180}" y2="98" class="dg-rule"/>` + lines(X + 20, 124, it.map((s) => "• " + s));
      if (i < 3) b += arrow(X + 204, 108, X + 236, 108);
    });
    b += txt(20, 238, "Levenscyclus van een item", "dg-h");
    ["Maken", "Opslaan", "Delen", "Gebruiken (Copilot)", "Bewaren of verwijderen"].forEach((s, i) => {
      const X = 20 + i * 188;
      b += box(X, 252, 168, 44, i === 4 ? "dg-box dg-out" : "dg-box", 22) + txt(X + 84, 279, s, "dg-s dg-b", "middle");
      if (i < 4) b += arrow(X + 170, 274, X + 186, 274);
    });
    b += box(20, 312, 920, 36, "dg-band", 8) + txt(480, 335, "Het label, en eventuele versleuteling, reist mee met het item; ook buiten de organisatie", "dg-s dg-b", "middle");
    b += txt(940, 372, "Bewaren en verwijderen (Data Lifecycle Management) valt buiten deze workshop", "dg-xs", "end");
    return svg(960, 382, "De keten: herkennen, labelen, beschermen en monitoren, langs de levenscyclus van een item", b);
  })();

  /* 2. Wat een sensitivity label doet */
  const label = (() => {
    const L = [["Handmatig", "De gebruiker kiest of wijzigt"], ["Standaardlabel", "Uit het beleid of de bibliotheek"], ["Automatisch", "In Office of in de service"]];
    const R = [["Versleuteling en rechten", "Alleen bevoegden kunnen openen"], ["Markering", "Koptekst, voettekst, watermerk"], ["Teams, groepen en sites", "Privacy, gasten en extern delen"]];
    const B = [["DLP", "Label als voorwaarde"], ["Microsoft 365 Copilot", "Nieuwe inhoud erft het label"], ["Inzicht", "Explorer en audit tonen labels"]];
    let b = txt(20, 22, "Hoe het label erop komt", "dg-h") + txt(940, 22, "Wat het label afdwingt", "dg-h", "end");
    [36, 116, 196].forEach((Y, i) => {
      b += box(20, Y, 250, 66) + txt(38, Y + 28, L[i][0], "dg-t") + txt(38, Y + 50, L[i][1]) + arrow(272, Y + 33, 352, 151);
      b += box(690, Y, 250, 66) + txt(708, Y + 28, R[i][0], "dg-t") + txt(708, Y + 50, R[i][1]) + arrow(608, 151, 688, Y + 33);
    });
    b += box(355, 96, 250, 110, "dg-box dg-accent", 14) + ico("msPurview", 368, 108, 22) + txt(480, 142, "Sensitivity label", "dg-t dg-big", "middle") + txt(480, 166, "Eén label per item", "dg-s", "middle") + txt(480, 186, "Reist mee met het item", "dg-s", "middle");
    b += txt(480, 372, "Wie het label gebruikt", "dg-h", "middle");
    [135, 370, 605].forEach((X, i) => {
      b += arrow(480, 208, X + 110, 274) + box(X, 276, 220, 66) + txt(X + 18, 304, B[i][0], "dg-t") + txt(X + 18, 326, B[i][1]);
    });
    return svg(960, 384, "Wat een sensitivity label doet: hoe het erop komt, wat het afdwingt en wie het gebruikt", b);
  })();

  /* 3. Wat werkt waar */
  const locaties = (() => {
    const cols = ["Sensitivity label", "Auto-labeling (service)", "DLP"], CX = [300, 515, 730];
    const rows = [
      ["Exchange Online", "E-mail en bijlagen", [["ok", "Label op e-mail"], ["ok", "E-mail onderweg"], ["ok", "Informatietypen", "en labels"]]],
      ["SharePoint & OneDrive", "Bestanden", [["ok", "Label op bestand"], ["ok", "Bestanden in rust"], ["ok", "Informatietypen", "en labels"]]],
      ["Microsoft Teams", "Chat en kanalen", [["part", "Team en vergadering;", "chatbericht niet"], ["no", "Niet voor berichten"], ["ok", "Alleen", "informatietypen"]]],
      ["Apparaten", "Windows en macOS", [["ok", "In Office-apps"], ["no", "Niet op het apparaat"], ["ok", "Endpoint DLP", "(na onboarding)"]]],
      ["Microsoft 365 Copilot", "Prompts en antwoorden", [["part", "Antwoord erft label;", "prompt niet"], ["no", "Niet van toepassing"], ["ok", "Labels; prompts met", "info types (preview)"]]],
    ];
    let b = box(10, 10, 940, 346, "dg-box", 12) + txt(30, 40, "Locatie", "dg-h");
    cols.forEach((c, i) => { b += txt(CX[i] + 16, 40, c, "dg-h"); });
    rows.forEach(([n, s, cells], ri) => {
      const Y = 56 + ri * 60;
      b += `<line x1="10" y1="${Y}" x2="950" y2="${Y}" class="dg-rule"/>` + txt(30, Y + 27, n, "dg-t") + txt(30, Y + 46, s);
      cells.forEach(([k, a, c2], ci) => {
        const X = CX[ci];
        b += mark(X + 24, Y + 28, k) + (c2 ? txt(X + 42, Y + 25, a) + txt(X + 42, Y + 43, c2) : txt(X + 42, Y + 33, a));
      });
    });
    b += mark(30, 380, "ok") + txt(46, 385, "Ondersteund", "dg-xs") + mark(150, 380, "part") + txt(166, 385, "Deels", "dg-xs") + mark(232, 380, "no") + txt(248, 385, "Niet", "dg-xs");
    b += txt(950, 385, "Teams en apparaten in DLP: doorgaans E5", "dg-xs", "end");
    return svg(960, 396, "Wat werkt waar: sensitivity labels, service-side auto-labeling en DLP per locatie", b);
  })();

  /* 4. Copilot en Purview */
  const copilot = (() => {
    const st = [
      ["Prompt", ["De gebruiker vraagt", "iets aan Copilot"]],
      ["Toegang", ["Alleen items die de", "gebruiker al mag", "openen"]],
      ["Label en rechten", ["Versleuteld: VIEW", "én EXTRACT nodig;", "DKE nooit"]],
      ["DLP voor Copilot", ["Gelabelde items", "uitsluiten; prompts", "blokkeren (preview)"]],
      ["Antwoord", ["Nieuwe inhoud erft", "het label met de", "hoogste prioriteit"]],
    ];
    let b = "";
    st.forEach(([t, it], i) => {
      const X = 20 + i * 188;
      b += box(X, 20, 168, 150, i === 3 ? "dg-box dg-accent" : "dg-box") + num(X + 24, 46, String(i + 1)) + txt(X + 44, 51, t, "dg-t") + lines(X + 18, 88, it);
      if (i === 0) b += ico("msCopilot", X + 132, 30, 24);
      if (i < 4) b += arrow(X + 170, 95, X + 186, 95);
      b += `<line x1="${X + 84}" y1="172" x2="${X + 84}" y2="204" class="dg-line dg-dash"/>`;
    });
    b += box(20, 206, 920, 52, "dg-band", 8) + txt(480, 228, "Audit en DSPM for AI", "dg-t", "middle") + txt(480, 248, "Prompts, antwoorden en risico’s worden zichtbaar voor beheerders", "dg-s", "middle");
    b += txt(20, 286, "Copilot gebruikt bestaande rechten. Purview voegt labels, DLP en inzicht toe.", "dg-xs");
    return svg(960, 296, "Microsoft 365 Copilot en Purview: van prompt tot antwoord, met audit en DSPM", b);
  })();

  return [
    {
      id: "keten", title: "De keten in vier stappen", caption: "Purview herkent gevoelige inhoud, het label legt de gevoeligheid vast, de bescherming volgt uit het label en monitoring laat zien wat er gebeurt.",
      learn: ["ipOverview", "labels"], source: "Gebaseerd op Microsoft Learn – Learn about Microsoft Purview Information Protection", license: LIC,
      alt: ["1. Herkennen: sensitive info types, exact data match en trainable classifiers bepalen wat er in de inhoud staat.", "2. Labelen: handmatig, met een standaardlabel of automatisch in Office of in de service.", "3. Beschermen: versleuteling en rechten, markering en data loss prevention.", "4. Monitoren: Activity explorer, audit en DLP alerts.", "Levenscyclus: maken, opslaan, delen, gebruiken (ook met Copilot), bewaren of verwijderen. Het label en eventuele versleuteling reizen mee met het item. Bewaren en verwijderen valt buiten deze workshop."],
      svg: keten,
    },
    {
      id: "label", title: "Wat een sensitivity label doet", caption: "Hoe het label er ook op komt: het label draagt de bescherming en andere onderdelen gebruiken het.",
      learn: ["labels", "labelsEncryption"], source: "Gebaseerd op Microsoft Learn – Learn about sensitivity labels", license: LIC,
      alt: ["Hoe het label erop komt: handmatig door de gebruiker, als standaardlabel uit het beleid of de bibliotheek, of automatisch in Office of in de service.", "Wat het label afdwingt: versleuteling en rechten, markering (koptekst, voettekst, watermerk) en instellingen voor teams, groepen en sites.", "Een item heeft één sensitivity label, dat met het item meereist.", "Wie het label gebruikt: DLP (label als voorwaarde), Microsoft 365 Copilot (nieuwe inhoud erft het label) en inzicht (explorer en audit)."],
      svg: label,
    },
    {
      id: "locaties", title: "Wat werkt waar", caption: "Niet elke maatregel werkt op elke locatie. Gebruik deze plaat om verwachtingen per locatie te bespreken.",
      learn: ["dlp", "labelsAuto"], source: "Gebaseerd op Microsoft Learn – Learn about data loss prevention; Apply a sensitivity label to content automatically", license: LIC,
      alt: ["Exchange Online: label op e-mail; service-side auto-labeling van e-mail onderweg; DLP met informatietypen en labels.", "SharePoint en OneDrive: label op bestanden; service-side auto-labeling van bestanden in rust; DLP met informatietypen en labels.", "Microsoft Teams: label op teams en vergaderingen, niet op chatberichten; geen auto-labeling van berichten; DLP alleen met informatietypen.", "Apparaten (Windows en macOS): label in Office-apps; geen service-side auto-labeling op het apparaat; Endpoint DLP na onboarding.", "Microsoft 365 Copilot: het antwoord erft het label, een prompt krijgt geen label; auto-labeling niet van toepassing; DLP op labels en, in preview, op informatietypen in prompts.", "DLP voor Teams en apparaten vereist doorgaans E5."],
      svg: locaties,
    },
    {
      id: "copilot", title: "Copilot en Purview", caption: "Copilot werkt met de rechten van de gebruiker. Labels, DLP en inzicht bepalen wat Copilot mag gebruiken en wat zichtbaar wordt.",
      learn: ["labelsCopilot", "dlpCopilot", "dspmAi"], source: "Gebaseerd op Microsoft Learn – Microsoft Purview data security and compliance protections for generative AI apps", license: LIC,
      alt: ["1. Prompt: de gebruiker vraagt iets aan Copilot.", "2. Toegang: Copilot gebruikt alleen items die de gebruiker al mag openen.", "3. Label en rechten: voor versleutelde items zijn VIEW én EXTRACT nodig; items met Double Key Encryption nooit.", "4. DLP voor Copilot: gelabelde items uitsluiten van verwerking en prompts met gevoelige informatie blokkeren (preview).", "5. Antwoord: nieuwe inhoud erft het label met de hoogste prioriteit.", "Audit en DSPM for AI maken prompts, antwoorden en risico’s zichtbaar voor beheerders."],
      svg: copilot,
    },
  ];
})();
