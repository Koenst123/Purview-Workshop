/* Platen voor de Referentiearchitectuur (tab Platen).
   Twee soorten:
   - kind "ms": diagram van Microsoft (beeld in ARCH_IMAGES, data/arch-images.js; CC BY 4.0, met bronvermelding).
   - kind "svg": eigen tekening (Pink Elephant), inhoudelijk gebaseerd op Microsoft Learn.
   Eigen tekeningen: alleen statische SVG-markup (geen scripts, event-attributen, ids, foreignObject of externe verwijzingen).
   Kleuren via CSS-klassen in r6-arch.css (licht en donker). Elk onderdeel is een <g class="dg-p" data-k="…">; er wordt
   alleen iets gemarkeerd als de gebruiker dat onderdeel kiest (lijst onder de plaat) of de plaat opent vanuit een blok.
   Token %%ICO:naam:x:y:maat:XY%% wordt bij het tonen vervangen door het productlogo uit BRAND_ASSETS, of door een
   neutrale tegel met de letters XY als dat logo er niet is. */
const ARCH_DIAGRAMS = (() => {
  const W = 760;
  const x = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const r = (n) => Math.round(n * 10) / 10;
  const box = (X, Y, w, h, c = "dg-box", rx = 10) => `<rect x="${X}" y="${Y}" width="${w}" height="${h}" rx="${rx}" class="${c}"/>`;
  const txt = (X, Y, s, c = "dg-s", a = "start") => `<text x="${X}" y="${Y}" class="${c}"${a !== "start" ? ` text-anchor="${a}"` : ""}>${x(s)}</text>`;
  const lines = (X, Y, arr, c = "dg-s", a = "start", lh = 19) => arr.map((s, i) => txt(X, Y + i * lh, s, c, a)).join("");
  /** Woorden over regels verdelen (maximaal n tekens per regel). */
  const wrap = (s, n) => String(s).split(" ").reduce((acc, w) => {
    const last = acc[acc.length - 1];
    if (last && (last + " " + w).length <= n) acc[acc.length - 1] = last + " " + w; else acc.push(w);
    return acc;
  }, []);
  const arrow = (x1, y1, x2, y2, c = "") => {
    const ang = Math.atan2(y2 - y1, x2 - x1), L = 9, Wd = 5;
    const bx = x2 - L * Math.cos(ang), by = y2 - L * Math.sin(ang), px = -Math.sin(ang) * Wd, py = Math.cos(ang) * Wd;
    const k = c ? " " + c : "";
    return `<line x1="${x1}" y1="${y1}" x2="${r(bx)}" y2="${r(by)}" class="dg-line${k}"/><polygon points="${x2},${y2} ${r(bx + px)},${r(by + py)} ${r(bx - px)},${r(by - py)}" class="dg-head${k}"/>`;
  };
  const line = (x1, y1, x2, y2, c = "dg-line") => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${c}"/>`;
  const num = (X, Y, n) => `<circle cx="${X}" cy="${Y}" r="14" class="dg-num"/>${txt(X, Y + 5, n, "dg-numt", "middle")}`;
  const ico = (key, X, Y, s, fb) => `%%ICO:${key}:${X}:${Y}:${s}:${fb}%%`;
  const part = (k, inner) => `<g class="dg-p" data-k="${x(k)}">${inner}</g>`;
  const svg = (h, label, body) => `<svg class="dg" viewBox="0 0 ${W} ${h}" role="img" aria-label="${x(label)}" focusable="false"><title>${x(label)}</title>${body}</svg>`;
  const mark = (X, Y, k) => {
    if (k === "ok") return `<circle cx="${X}" cy="${Y}" r="9" class="dg-ok"/><path d="M${X - 4} ${Y} l3 3.5 l5.5 -7" class="dg-mk"/>`;
    if (k === "part") return `<circle cx="${X}" cy="${Y}" r="8.5" class="dg-part"/><path d="M${X} ${Y - 8.5} a8.5 8.5 0 0 0 0 17 z" class="dg-partf"/>`;
    return `<circle cx="${X}" cy="${Y}" r="8.5" class="dg-no"/><line x1="${X - 4}" y1="${Y}" x2="${X + 4}" y2="${Y}" class="dg-nomk"/>`;
  };
  /** Pillen die doorlopen naar een tweede regel als de ruimte op is. */
  const chips = (X0, X1, Y, items, H) => {
    const cw = (s) => Math.round(s.length * 7.1 + 26), rowsOf = [[]];
    let cx = X0;
    items.forEach((s) => { const w = cw(s); if (cx + w > X1 && rowsOf[rowsOf.length - 1].length) { rowsOf.push([]); cx = X0; } rowsOf[rowsOf.length - 1].push([s, cx, w]); cx += w + 8; });
    const ch = 28, gap = 8, tot = rowsOf.length * ch + (rowsOf.length - 1) * gap, y0 = Y + (H - tot) / 2;
    return rowsOf.map((row, ri) => row.map(([s, X, w]) => box(X, y0 + ri * (ch + gap), w, ch, "dg-chip", 14) + txt(X + w / 2, y0 + ri * (ch + gap) + 19, s, "dg-s dg-chipt", "middle")).join("")).join("");
  };
  const LIC = "Eigen tekening (Pink Elephant), geen Microsoft-beeldmateriaal. Controleer details op Microsoft Learn.";
  const CC = "© Microsoft Corporation. Licentie: Creative Commons Attribution 4.0 International (CC BY 4.0). Verkleind en omgezet naar WebP; inhoud ongewijzigd. Microsoft-namen en -logo’s zijn handelsmerken van Microsoft.";

  /* 1. De keten in vier stappen (rijen, zelfde opbouw als de Copilot-plaat) */
  const KETEN = [
    ["herkennen", "Herkennen", "Wat staat erin?", ["Sensitive info types", "Exact data match", "Trainable classifiers"]],
    ["labelen", "Labelen", "Hoe gevoelig is het?", ["Handmatig", "Standaardlabel", "Automatisch in Office", "Automatisch in de service"]],
    ["beschermen", "Beschermen", "Wat mag ermee?", ["Versleuteling en rechten", "Markering", "Data loss prevention"]],
    ["monitoren", "Monitoren", "Wat gebeurt ermee?", ["Activity explorer", "Audit", "DLP alerts"]],
  ];
  const keten = (() => {
    const H = 78, G = 22;
    let b = "";
    KETEN.forEach(([k, t, q, it], i) => {
      const Y = 20 + i * (H + G);
      b += part(k, box(20, Y, 720, H) + num(50, Y + H / 2, String(i + 1)) + txt(78, Y + 34, t, "dg-t") + txt(78, Y + 56, q, "dg-q")
        + line(262, Y + 14, 262, Y + H - 14, "dg-rule") + chips(282, 726, Y, it, H));
      if (i < KETEN.length - 1) b += arrow(50, Y + H + 2, 50, Y + H + G - 2);
    });
    const Y = 20 + 4 * (H + G) + 2;
    b += part("meereizen", box(20, Y, 720, 46, "dg-band", 10) + txt(380, Y + 29, "Het label, en eventuele versleuteling, reist mee met het item; ook buiten de organisatie", "dg-s dg-b", "middle"));
    return svg(Y + 66, "De keten: herkennen, labelen, beschermen en monitoren", b);
  })();

  /* 2. Wat een sensitivity label doet (in, label, uit en gebruikers) */
  const label = (() => {
    const L = [["manual", "Handmatig", "De gebruiker kiest of wijzigt"], ["default", "Standaardlabel", "Uit het beleid of de bibliotheek"], ["auto", "Automatisch", "In Office of in de service"]];
    const R = [["encrypt", "Versleuteling en rechten", "Alleen bevoegden kunnen openen"], ["marking", "Markering", "Koptekst, voettekst, watermerk"], ["container", "Teams, groepen en sites", "Privacy, gasten en extern delen"]];
    const B = [["dlp", "DLP", "Label als voorwaarde in beleid"], ["copilot", "Microsoft 365 Copilot", "Nieuwe inhoud erft het label"], ["insight", "Inzicht", "Explorers en audit tonen labels"]];
    let b = txt(20, 26, "HOE HET LABEL EROP KOMT", "dg-h") + txt(740, 26, "WAT HET LABEL AFDWINGT", "dg-h", "end");
    [40, 120, 200].forEach((Y, i) => {
      b += part(L[i][0], box(20, Y, 210, 64) + txt(36, Y + 27, L[i][1], "dg-t") + txt(36, Y + 49, L[i][2], "dg-xs")) + arrow(232, Y + 32, 288, Y + 32);
      b += arrow(472, Y + 32, 528, Y + 32) + part(R[i][0], box(530, Y, 210, 64) + txt(546, Y + 27, R[i][1], "dg-t") + txt(546, Y + 49, R[i][2], "dg-xs"));
    });
    b += part("hub", box(290, 40, 180, 224, "dg-box dg-hub", 14) + ico("msPurview", 360, 70, 40, "P") + txt(380, 146, "Sensitivity label", "dg-t dg-big", "middle")
      + lines(380, 176, ["Eén label per item", "Reist mee met", "het item"], "dg-s", "middle", 20));
    b += line(380, 266, 380, 292) + line(133, 292, 627, 292);
    [20, 267, 514].forEach((X, i) => {
      b += arrow(X + 113, 292, X + 113, 320) + part(B[i][0], box(X, 322, 226, 64) + txt(X + 16, 349, B[i][1], "dg-t") + txt(X + 16, 371, B[i][2], "dg-xs"));
    });
    b += txt(20, 412, "WIE HET LABEL GEBRUIKT", "dg-h");
    return svg(424, "Wat een sensitivity label doet: hoe het erop komt, wat het afdwingt en wie het gebruikt", b);
  })();

  /* 3. Wat werkt waar (tabel; rij en kolom zijn apart te markeren) */
  const LOC = [
    ["r-mail", "Exchange Online", "E-mail en bijlagen", "msOutlook", "EX", [["ok", "Label op e-mail"], ["ok", "E-mail onderweg"], ["ok", "Info types en", "labels"]]],
    ["r-files", "SharePoint & OneDrive", "Bestanden", "msSharePoint", "SP", [["ok", "Label op bestand"], ["ok", "Bestanden in rust"], ["ok", "Info types en", "labels"]]],
    ["r-teams", "Microsoft Teams", "Chat en kanalen", "msTeams", "T", [["part", "Op het team;", "chat niet"], ["no", "Niet voor", "berichten"], ["ok", "Alleen info", "types"]]],
    ["r-devices", "Apparaten", "Windows en macOS", "msWindows", "W", [["ok", "In Office-apps"], ["no", "Niet op het", "apparaat"], ["ok", "Endpoint DLP", "(na onboarding)"]]],
    ["r-copilot", "Microsoft 365 Copilot", "Prompts en antwoorden", "msCopilot", "C", [["part", "Antwoord erft", "label"], ["no", "Niet van", "toepassing"], ["ok", "Gelabelde items;", "prompts (preview)"]]],
  ];
  const LOCCOL = [["c-label", "Sensitivity label", ""], ["c-auto", "Auto-labeling", "in de service"], ["c-dlp", "DLP", ""]];
  const locaties = (() => {
    const CX = [240, 406, 572], CW = 166, RH = 62, Y0 = 70;
    let b = box(20, 14, 720, Y0 - 14 + LOC.length * RH, "dg-box", 12) + txt(36, 46, "LOCATIE", "dg-h");
    LOCCOL.forEach(([k, t, s], i) => {
      b += part(k, box(CX[i] + 4, 18, CW - 8, Y0 - 22, "dg-cell", 8) + (s ? txt(CX[i] + 16, 40, t, "dg-hb") + txt(CX[i] + 16, 56, s, "dg-xs") : txt(CX[i] + 16, 46, t, "dg-hb")));
    });
    LOC.forEach(([k, n, s, logo, fb, cells], ri) => {
      const Y = Y0 + ri * RH;
      b += line(20, Y, 740, Y, "dg-rule");
      b += part(k, box(24, Y + 4, CX[0] - 28, RH - 8, "dg-cell", 8) + ico(logo, 32, Y + 17, 28, fb) + txt(68, Y + 28, n, "dg-t dg-tm") + txt(68, Y + 47, s, "dg-xs"));
      cells.forEach(([m, a, c2], ci) => {
        const X = CX[ci];
        b += part(`${k} ${LOCCOL[ci][0]}`, box(X + 4, Y + 4, CW - 8, RH - 8, "dg-cell", 8) + mark(X + 24, Y + RH / 2, m)
          + (c2 ? txt(X + 42, Y + 27, a) + txt(X + 42, Y + 45, c2) : txt(X + 42, Y + 36, a)));
      });
    });
    const LY = Y0 + LOC.length * RH + 30;
    b += mark(30, LY, "ok") + txt(46, LY + 5, "Ondersteund", "dg-xs") + mark(150, LY, "part") + txt(166, LY + 5, "Deels", "dg-xs") + mark(232, LY, "no") + txt(248, LY + 5, "Niet", "dg-xs");
    b += txt(740, LY + 5, "DLP voor Teams en apparaten: doorgaans E5", "dg-xs", "end");
    return svg(LY + 18, "Wat werkt waar: sensitivity labels, service-side auto-labeling en DLP per locatie", b);
  })();

  /* 4. Copilot en Purview (rijen, met audit en DSPM als band ernaast) */
  const COP = [
    ["prompt", "Prompt", "De gebruiker stelt een vraag in een Microsoft 365-app."],
    ["access", "Toegang", "Copilot gebruikt alleen items die de gebruiker al mag openen."],
    ["rights", "Label en rechten", "Versleuteld: VIEW én EXTRACT nodig. Double Key Encryption: nooit."],
    ["dlp", "DLP voor Copilot", "Gelabelde items uitsluiten; gevoelige prompts blokkeren (preview)."],
    ["answer", "Antwoord", "Nieuwe inhoud erft het label met de hoogste prioriteit."],
  ];
  const copilot = (() => {
    const H = 62, G = 16;
    let b = "";
    COP.forEach(([k, t, d], i) => {
      const Y = 20 + i * (H + G);
      b += part(k, box(20, Y, 500, H) + num(48, Y + H / 2, String(i + 1)) + txt(74, Y + H / 2 + 5, t, "dg-t")
        + line(212, Y + 12, 212, Y + H - 12, "dg-rule") + lines(228, Y + (wrap(d, 40).length > 1 ? 27 : 36), wrap(d, 40), "dg-s", "start", 19)
        + (i === 0 ? ico("msCopilot", 480, Y + 17, 28, "C") : ""));
      b += line(522, Y + H / 2, 546, Y + H / 2, "dg-line dg-dash");
      if (i < COP.length - 1) b += arrow(48, Y + H + 2, 48, Y + H + G - 2);
    });
    const BH = COP.length * (H + G) - G;
    b += part("audit", box(548, 20, 192, BH, "dg-band", 12) + ico("msPurview", 624, 120, 40, "P") + lines(644, 196, ["Audit en", "DSPM for AI"], "dg-t", "middle", 21)
      + lines(644, 252, ["Prompts, antwoorden", "en risico’s zichtbaar", "voor beheerders"], "dg-s", "middle", 19));
    b += txt(20, BH + 50, "Copilot gebruikt bestaande rechten. Purview voegt labels, DLP en inzicht toe.", "dg-xs");
    return svg(BH + 62, "Microsoft 365 Copilot en Purview: van prompt tot antwoord, met audit en DSPM for AI", b);
  })();

  return [
    /* ---------- Het grote plaatje ---------- */
    {
      id: "ms-pillars", kind: "ms", group: "basis", img: "msIpPillars", w: 1026, h: 501,
      title: "Purview Information Protection in één beeld",
      caption: "Microsofts eigen indeling: ken je data, bescherm je data, voorkom datalekken en beheer je data. Deze workshop gaat over de eerste drie.",
      points: ["Know your data: vind en classificeer gevoelige informatie, overal waar die staat.", "Protect your data: bescherm met versleuteling, toegangsbeperking en markering (sensitivity labels).", "Prevent data loss: voorkom onbedoeld delen met DLP.", "Govern your data: bewaren en verwijderen. Valt buiten deze workshop.", "Eén platform eronder: dezelfde classificatie, beleid en rapportage voor alle onderdelen."],
      alt: "Diagram van Microsoft: vier cirkels Know your data, Protect your data, Prevent data loss en Govern your data, op één intelligent platform.",
      credit: { title: "Learn about Microsoft Purview Information Protection", url: "https://learn.microsoft.com/en-us/purview/information-protection", learn: "ipOverview", license: CC, repo: "github.com/MicrosoftDocs/microsoft-365-docs (commit 3d4eaff)" },
      blocks: [],
    },
    {
      id: "keten", kind: "svg", group: "basis", title: "De keten in vier stappen",
      caption: "Purview herkent gevoelige inhoud, het label legt de gevoeligheid vast, de bescherming volgt uit het label en monitoring laat zien wat er gebeurt.",
      learn: ["ipOverview", "labels"], source: "Gebaseerd op Microsoft Learn – Learn about Microsoft Purview Information Protection", license: LIC,
      parts: [
        ["herkennen", "1. Herkennen: sensitive info types, exact data match en trainable classifiers bepalen wat er in de inhoud staat.", ["cls-auto", "cls-sit", "cls-ne", "cls-edm", "cls-fp", "cls-tc", "cls-ai", "cls-ondemand", "cls-unified"]],
        ["labelen", "2. Labelen: handmatig, met een standaardlabel of automatisch in Office of in de service.", []],
        ["beschermen", "3. Beschermen: versleuteling en rechten, markering en data loss prevention.", []],
        ["monitoren", "4. Monitoren: Activity explorer, audit en DLP alerts.", ["ins-explorer", "ins-audit", "ins-alerts", "ins-sim"]],
        ["meereizen", "Het label en eventuele versleuteling reizen mee met het item, ook buiten de organisatie.", []],
      ],
      svg: keten,
    },
    {
      id: "label", kind: "svg", group: "basis", title: "Wat een sensitivity label doet",
      caption: "Hoe het label er ook op komt: het label draagt de bescherming en andere onderdelen gebruiken het.",
      learn: ["labels", "labelsEncryption"], source: "Gebaseerd op Microsoft Learn – Learn about sensitivity labels", license: LIC,
      parts: [
        ["manual", "Handmatig: de gebruiker kiest of wijzigt het label.", ["lab-manual"]],
        ["default", "Standaardlabel: uit het labelbeleid of als standaard voor een SharePoint-bibliotheek.", ["lab-policy", "lab-library"]],
        ["auto", "Automatisch: in Office-apps (client-side) of in de service (service-side).", ["lab-client", "lab-service", "lab-scale"]],
        ["hub", "Sensitivity label: één label per item, dat met het item meereist.", ["lab-taxonomy"]],
        ["encrypt", "Versleuteling en rechten: alleen bevoegden kunnen openen.", ["pro-encrypt", "pro-dke"]],
        ["marking", "Markering: koptekst, voettekst en watermerk.", ["pro-marking"]],
        ["container", "Teams, groepen en sites: privacy, gasttoegang en extern delen.", ["pro-container"]],
        ["dlp", "DLP: het label als voorwaarde in een DLP-beleid.", []],
        ["copilot", "Microsoft 365 Copilot: nieuwe inhoud erft het label.", []],
        ["insight", "Inzicht: Content explorer, Activity explorer en audit tonen labels.", []],
      ],
      svg: label,
    },
    /* ---------- Labels en DLP per locatie ---------- */
    {
      id: "locaties", kind: "svg", group: "werking", title: "Wat werkt waar",
      caption: "Niet elke maatregel werkt op elke locatie. Gebruik deze plaat om verwachtingen per locatie te bespreken.",
      learn: ["dlp", "labelsAuto"], source: "Gebaseerd op Microsoft Learn – Learn about data loss prevention; Apply a sensitivity label to content automatically", license: LIC,
      parts: [
        ["r-mail", "Exchange Online: label op e-mail; service-side auto-labeling van e-mail onderweg; DLP met info types en labels.", ["src-mail"]],
        ["r-files", "SharePoint en OneDrive: label op bestanden; service-side auto-labeling van bestanden in rust; DLP met info types en labels.", ["src-files"]],
        ["r-teams", "Microsoft Teams: label op het team, niet op chatberichten; geen auto-labeling van berichten; DLP alleen met info types.", ["src-teams"]],
        ["r-devices", "Apparaten (Windows en macOS): label in Office-apps; geen service-side auto-labeling op het apparaat; Endpoint DLP na onboarding.", ["src-devices"]],
        ["r-copilot", "Microsoft 365 Copilot: het antwoord erft het label, een prompt krijgt geen label; auto-labeling niet van toepassing; DLP op gelabelde items en, in preview, op gevoelige info in prompts.", []],
        ["c-label", "Kolom Sensitivity label: waar een label op het item of de container komt.", []],
        ["c-auto", "Kolom Auto-labeling in de service: waar Purview zelf labels toekent.", []],
        ["c-dlp", "Kolom DLP: wat DLP per locatie controleert. DLP voor Teams en apparaten vereist doorgaans E5.", ["pro-dlp"]],
      ],
      svg: locaties,
    },
    {
      id: "ms-solution", kind: "ms", group: "werking", img: "msIpSolution", w: 772, h: 678,
      title: "Aanpak volgens Microsoft",
      caption: "Microsofts stappenplan voor een information protection-oplossing: eerst je data kennen, dan labelen en beschermen, dan DLP.",
      points: ["Know your data: beschrijf welke gevoelige informatie je wilt beschermen, ontdek en classificeer die, en bekijk waar die staat.", "Protect your data: definieer sensitivity labels en pas ze toe in Microsoft 365-apps en -services.", "Prevent data loss: leer DLP kennen, plan, ontwerp en maak beleid en stem het daarna af.", "Defender for Cloud Apps, de scanner (on-premises) en Data Map (Azure) staan ook op de plaat, maar vallen buiten deze workshop."],
      alt: "Diagram van Microsoft: drie kolommen Know your data, Protect your data en Prevent data loss, elk met genummerde stappen.",
      credit: { title: "Deploy an information protection solution with Microsoft Purview", url: "https://learn.microsoft.com/en-us/purview/information-protection-solution", learn: "ipSolution", license: CC, repo: "github.com/MicrosoftDocs/microsoft-365-docs (commit 3d4eaff)" },
      blocks: [],
    },
    /* ---------- Microsoft 365 Copilot ---------- */
    {
      id: "ms-copilot-flow", kind: "ms", group: "copilot", img: "msCopilotFlow", w: 1100, h: 927,
      title: "Hoe Copilot een vraag beantwoordt",
      caption: "Copilot zoekt via Microsoft Graph alleen in gegevens waar de gebruiker al bij kan. Te ruim gedeelde inhoud is dus ook voor Copilot zichtbaar.",
      points: ["1. De gebruiker stelt een vraag (prompt) in een app, zoals Word, Teams of Outlook.", "2. Copilot haalt context op via Microsoft Graph: mail, bestanden, chats en meer, alleen waar de gebruiker al toegang toe heeft.", "3. Prompt en context gaan naar het taalmodel binnen de Microsoft 365-servicegrens.", "4. Het antwoord komt terug in de app. Gegevens zijn onderweg versleuteld."],
      alt: "Diagram van Microsoft: gebruikers en apps sturen een prompt naar Microsoft 365 Copilot, dat via Microsoft Graph gegevens uit de tenant ophaalt en een taalmodel gebruikt binnen de Microsoft 365-servicegrens.",
      credit: { title: "Microsoft 365 Copilot architecture and how it works", url: "https://learn.microsoft.com/en-us/copilot/microsoft-365/microsoft-365-copilot-architecture", learn: "copilotArch", license: CC, repo: "github.com/MicrosoftDocs/microsoft-365-docs (commit 78b6735)" },
      blocks: ["src-copilot"],
    },
    {
      id: "ms-copilot-labels", kind: "ms", group: "copilot", img: "msCopilotLabels", w: 1280, h: 764,
      title: "Copilot, labels en versleuteling",
      caption: "Copilot respecteert labels en versleuteling. Wat Copilot maakt, krijgt het label van de bron (waar ondersteund).",
      points: ["Copilot kan items gebruiken met en zonder label of versleuteling, maar alleen als de gebruiker de rechten heeft. Bij versleuteling zijn VIEW én EXTRACT nodig.", "Nieuwe inhoud van Copilot erft het label (en de versleuteling) van de bron, waar dat wordt ondersteund.", "Dat geldt ook voor externe bestanden die in een Office-app geopend zijn.", "Items met Double Key Encryption kan Copilot niet gebruiken (staat niet op de plaat)."],
      alt: "Diagram van Microsoft: hoe Microsoft 365 Copilot werkt met items zonder label, met versleuteling, met label en met label plus versleuteling, binnen de tenant en voor externe bestanden.",
      credit: { title: "Microsoft 365 Copilot data protection architecture", url: "https://learn.microsoft.com/en-us/copilot/microsoft-365/microsoft-365-copilot-architecture-data-protection-auditing", learn: "copilotDataProt", license: CC, repo: "github.com/MicrosoftDocs/microsoft-365-docs (commit 5705ba9)" },
      blocks: ["lab-copilot"],
    },
    {
      id: "copilot", kind: "svg", group: "copilot", title: "Copilot en Purview",
      caption: "Copilot werkt met de rechten van de gebruiker. Labels, DLP en inzicht bepalen wat Copilot mag gebruiken en wat zichtbaar wordt.",
      learn: ["labelsCopilot", "dlpCopilot", "dspmAi"], source: "Gebaseerd op Microsoft Learn – Microsoft Purview data security and compliance protections for generative AI apps", license: LIC,
      parts: [
        ["prompt", "1. Prompt: de gebruiker stelt een vraag in een Microsoft 365-app.", []],
        ["access", "2. Toegang: Copilot gebruikt alleen items die de gebruiker al mag openen.", []],
        ["rights", "3. Label en rechten: voor versleutelde items zijn VIEW én EXTRACT nodig; items met Double Key Encryption nooit.", []],
        ["dlp", "4. DLP voor Copilot: gelabelde items uitsluiten van verwerking en prompts met gevoelige informatie blokkeren (preview).", ["pro-dlp-copilot"]],
        ["answer", "5. Antwoord: nieuwe inhoud erft het label met de hoogste prioriteit.", []],
        ["audit", "Audit en DSPM for AI maken prompts, antwoorden en risico’s zichtbaar voor beheerders.", ["ins-dspm"]],
      ],
      svg: copilot,
    },
  ];
})();

/** Groepen op de tab Platen, in deze volgorde. */
const ARCH_PLATE_GROUPS = [
  ["basis", "Het grote plaatje"],
  ["werking", "Labels en DLP per locatie"],
  ["copilot", "Microsoft 365 Copilot"],
];
