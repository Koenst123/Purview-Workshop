/* Export: Excel-werkmap (.xlsx) zonder externe bibliotheken.
   Minimale OOXML-writer: inline strings, één stylesheet, store-only ZIP met CRC32. */
const Zip = {
  _crc: null,
  crcTable() {
    if (this._crc) return this._crc;
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return (this._crc = t);
  },
  crc32(bytes) {
    const t = this.crcTable(); let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = t[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  },
  /* files: [{ name, text }] → Uint8Array (ZIP, methode 0 = stored) */
  build(files) {
    const enc = new TextEncoder(), parts = [], central = [];
    const d = new Date();
    const dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
    const dosDate = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    let offset = 0;
    files.forEach((f) => {
      const name = enc.encode(f.name), data = enc.encode(f.text), crc = this.crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, dosTime, true); lh.setUint16(12, dosDate, true); lh.setUint32(14, crc, true);
      lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), name, data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
      ch.setUint16(12, dosTime, true); ch.setUint16(14, dosDate, true); ch.setUint32(16, crc, true);
      ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true);
      ch.setUint16(30, 0, true); ch.setUint16(32, 0, true); ch.setUint16(34, 0, true); ch.setUint16(36, 0, true); ch.setUint32(38, 0, true); ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), name);
      offset += 30 + name.length + data.length;
    });
    const cdSize = central.reduce((t, a) => t + a.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    const all = [...parts, ...central, new Uint8Array(end.buffer)];
    const out = new Uint8Array(all.reduce((t, a) => t + a.length, 0));
    let p = 0; all.forEach((a) => { out.set(a, p); p += a.length; });
    return out;
  },
};

/* Stijlen: 0 normaal · 1 kop · 2 tekst (wrap, rand) · 3 titel · 4 vet · 5 getal (rand) · 6 sectiekop.
   7–13 = dezelfde stijlen met quotePrefix (tekst die met = + - @ begint wordt nooit als formule gelezen).
   Pink Elephant-huisstijl: kop navy #181B3A met witte vette tekst, titels pink #BC0363, sectiekop op #EDF2F3. */
const XLSX_STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="5"><font><sz val="10"/><name val="Segoe UI"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Segoe UI"/></font><font><b/><sz val="14"/><color rgb="FFBC0363"/><name val="Segoe UI"/></font><font><b/><sz val="10"/><name val="Segoe UI"/></font><font><b/><sz val="11"/><color rgb="FFBC0363"/><name val="Segoe UI"/></font></fonts>
<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF181B3A"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEDF2F3"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFCEDCDE"/></left><right style="thin"><color rgb="FFCEDCDE"/></right><top style="thin"><color rgb="FFCEDCDE"/></top><bottom style="thin"><color rgb="FFCEDCDE"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="14">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
<xf numFmtId="0" fontId="4" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" quotePrefix="1"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1" quotePrefix="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1" quotePrefix="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" quotePrefix="1"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1" quotePrefix="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1" quotePrefix="1"><alignment horizontal="center" vertical="top"/></xf>
<xf numFmtId="0" fontId="4" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" quotePrefix="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

const XlsxExport = {
  col(i) { let s = ""; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; },
  x(v) {
    return String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  },
  cell(v, ref, s) {
    if (v === null || v === undefined || v === "") return s ? `<c r="${ref}" s="${s}"/>` : "";
    if (typeof v === "number" && isFinite(v)) return `<c r="${ref}" s="${s === 2 ? 5 : s}"><v>${v}</v></c>`;
    if (typeof v === "boolean") v = v ? "Ja" : "Nee";
    let t = String(v); if (t.length > 32767) t = t.slice(0, 32760) + " …";
    const st = /^[=+\-@\t\r\uFF1D\uFF0B\uFF0D\uFF20]/.test(t) ? (Number(s) || 0) + 7 : s;
    return `<c r="${ref}" t="inlineStr" s="${st}"><is><t xml:space="preserve">${this.x(t)}</t></is></c>`;
  },
  /* sheet: { name, title?, head: [...], rows: [[...]], widths: [...], extra?: [{title, head, rows}] } */
  sheetXml(sh) {
    const rows = []; let r = 0, headRow = 0;
    const put = (vals, style) => { r++; rows.push(`<row r="${r}">${vals.map((v, i) => this.cell(v, this.col(i) + r, style)).join("")}</row>`); };
    if (sh.title) { put([sh.title], 3); if (sh.sub) put([sh.sub], 0); r++; }
    if (sh.head) { put(sh.head, 1); headRow = r; }
    (sh.rows || []).forEach((row) => put(row, 2));
    const lastMain = r;
    (sh.extra || []).forEach((ex) => { r++; put([ex.title], 6); if (ex.head) put(ex.head, 1); ex.rows.forEach((row) => put(row, 2)); });
    const ncol = Math.max(1, (sh.head || []).length, ...(sh.extra || []).map((e) => (e.head || []).length));
    const widths = sh.widths || [];
    const cols = Array.from({ length: ncol }, (_, i) => `<col min="${i + 1}" max="${i + 1}" width="${widths[i] || 22}" customWidth="1"/>`).join("");
    const pane = headRow && !sh.plain ? `<sheetViews><sheetView workbookViewId="0"${sh.zoom ? ` zoomScale="${sh.zoom}"` : ""}><pane ySplit="${headRow}"${sh.freezeCols ? ` xSplit="${sh.freezeCols}"` : ""} topLeftCell="${sh.freezeCols ? this.col(sh.freezeCols) : "A"}${headRow + 1}" activePane="${sh.freezeCols ? "bottomRight" : "bottomLeft"}" state="frozen"/></sheetView></sheetViews>` : `<sheetViews><sheetView workbookViewId="0"/></sheetViews>`;
    const filter = headRow && !sh.plain && (sh.rows || []).length ? `<autoFilter ref="A${headRow}:${this.col(sh.head.length - 1)}${lastMain}"/>` : "";
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${pane}<sheetFormatPr defaultRowHeight="15"/><cols>${cols}</cols><sheetData>${rows.join("")}</sheetData>${filter}<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup orientation="landscape" paperSize="9" fitToHeight="0"/></worksheet>`;
  },
  sheetName(n, used) {
    let s = String(n).replace(/[\[\]:*?\/\\]/g, "-").slice(0, 31) || "Blad";
    let k = 2; const base = s;
    while (used.has(s.toLowerCase())) s = `${base.slice(0, 28)} (${k++})`;
    used.add(s.toLowerCase()); return s;
  },
  workbook(sheets) {
    const used = new Set(); sheets.forEach((s) => (s.name = this.sheetName(s.name, used)));
    const files = [
      { name: "[Content_Types].xml", text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>` },
      { name: "_rels/.rels", text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
      { name: "xl/workbook.xml", text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${sheets.map((s, i) => `<sheet name="${this.x(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets><definedNames>${sheets.map((s, i) => (s._filter ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${this.x(s.name.replace(/'/g, "''"))}'!${s._filter}</definedName>` : "")).join("")}</definedNames></workbook>` },
      { name: "xl/_rels/workbook.xml.rels", text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
      { name: "xl/styles.xml", text: XLSX_STYLES },
    ];
    sheets.forEach((s, i) => {
      const xml = this.sheetXml(s);
      const m = xml.match(/<autoFilter ref="([A-Z]+)(\d+):([A-Z]+)(\d+)"\/>/);
      s._filter = m ? `$${m[1]}$${m[2]}:$${m[3]}$${m[4]}` : null;
      files.push({ name: `xl/worksheets/sheet${i + 1}.xml`, text: xml });
    });
    files[2].text = files[2].text.replace(/<definedNames>.*<\/definedNames>/, () => {
      const dn = sheets.map((s, i) => (s._filter ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${this.x(s.name.replace(/'/g, "''"))}'!${s._filter}</definedName>` : "")).join("");
      return dn ? `<definedNames>${dn}</definedNames>` : "";
    });
    return Zip.build(files);
  },

  /* ---------- Gedeelde metadata (ook gebruikt door het ontwerpdocument) ---------- */
  statusName(st) {
    const k = (st.meta || {}).status || "concept";
    const list = typeof DESIGN_STATUS !== "undefined" ? DESIGN_STATUS : [["concept", "Concept"], ["review", "Ter besluitvorming"], ["final", "Vastgesteld"]];
    return (list.find((x) => x[0] === k) || list[0])[1];
  },
  versionText(st) {
    const v = String((st.meta || {}).version || "0.1").trim().replace(/^v(?=\d)/i, "") || "0.1";
    return `${this.statusName(st)} v${v}`;
  },
  /** Classificatie van het ontwerp zelf: label uit meta.docLabelId, anders "Vertrouwelijk". */
  docClass(st) {
    const id = (st.meta || {}).docLabelId;
    const l = id ? labelById(id, st) : null;
    return l ? labelFullName(l, st) : "Vertrouwelijk";
  },
  ready(st) { return Validation.readiness(st); },
  readyText(st) {
    const r = this.ready(st);
    const crit = ((r.rollout || {}).criteria || []).filter((c) => c && c.text);
    return `${r.design.label}: ${r.design.text}${crit.length ? ` · ${r.rollout.label}: ${crit.filter((c) => c.ok).length} van ${crit.length}` : ""}`;
  },
  phases() {
    return typeof ADOPT_PHASES !== "undefined" ? ADOPT_PHASES : [
      { key: "prep", title: "0 · Voorbereiden", desc: "Tenantvoorwaarden, labels publiceren aan een pilotgroep, key-users trainen." },
      { key: "sim", title: "1 · Simuleren", desc: "DLP- en auto-labelingpolicies in simulatiemodus." },
      { key: "tips", title: "2 · Policy tips aan", desc: "Simulatie met policy tips." },
      { key: "enforce", title: "3 · Handhaven", desc: "Policies gefaseerd aanzetten." },
      { key: "eval", title: "4 · Evalueren", desc: "Overrides, false positives en incidenten periodiek bespreken." },
    ];
  },
  phase(st, key) { const p = (((st.adoption || {}).phases) || {})[key] || {}; return { owner: p.owner || "", start: p.start || "", due: p.due || "" }; },
  scenarioRows(st) {
    let all = [];
    try { all = ScenarioEngine.all(st); } catch (e) { return []; }
    const sr = st.scenarioResults || {};
    const pred = { pass: "Gaat door", tip: "Melding", block: "Geblokkeerd" };
    const res = { pass: "Voldoet", partial: "Deels", fail: "Voldoet niet" };
    const outcome = (r) => {
      if (typeof ScnUI !== "undefined" && typeof ScnUI.outcome === "function") { try { return ScnUI.outcome(r); } catch (e) { /* lokaal */ } }
      const steps = r.steps || [];
      if ((r.lv || 0) >= 3 || steps.some((x) => x.kind === "block")) return "block";
      if (steps.some((x) => /policy tip|overrul|justificatie/i.test(x.text || ""))) return "tip";
      return "pass";
    };
    const lvName = (lv) => (lv == null ? "" : ((CATALOG.levels || [])[lv] || {}).name || String(lv));
    return all.map((r) => {
      const s = r.scn || {}, ex = s.expect || {}, p = (sr[s.id] || {}).predict || "", o = outcome(r);
      const manual = !!(sr[s.id] && sr[s.id].labelId);
      const auto = r.autoPicked != null ? !!r.autoPicked : !manual && !!r.label;
      const label = r.ambiguous ? "Kies het label" : r.label ? `${labelFullName(r.label, st)}${auto ? " (automatisch gekozen – controleren)" : ""}` : s.content && s.content.prompt ? "(prompt – geen label)" : "geen label";
      const rule = r.rule ? (typeof r.rule === "string" ? r.rule : r.rule.name || "") : "";
      const lst = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string" && x).join(" / ") : "");
      const talk = [["Risico", s.risk || ""], ["Afwegingen", lst(s.options)], ["Uitzonderingen", lst(s.exceptions)], ["Valideren", lst(s.validate)]].filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(" · ");
      return { title: `${s.title || s.name || s.id || ""}${String(s.id || "").startsWith("csc-") ? " (eigen scenario)" : ""}`, label, outcome: pred[o] || o, desired: ex.text || (ex.max != null && ex.max !== ex.min ? `${lvName(ex.min)} – ${lvName(ex.max)}` : lvName(ex.min)), status: r.ambiguous ? "Kies het label" : r.uncertain ? "Onzeker – niet gemodelleerd" : res[r.status] || r.status || "", predict: p ? `${pred[p] || p}${p === o ? " (klopte)" : " (anders)"}` : "", rule, talk };
    });
  },

  /* ---------- Inhoud ---------- */
  sheets(st = S()) {
    st = customerState(st);
    const g = Generator.all(st);
    const ln = (id) => { const l = labelById(id, st); return l ? labelFullName(l, st) : ""; };
    const gn = (id) => (byId(st.groups, id) || { name: id }).name;
    const locName = (k) => (CATALOG.dlpLocations.find((x) => x.key === k) || { name: k }).name;
    const modeName = (k) => EXPORT_NL.dlpMode(k);
    const support = (fn) => { try { return typeof PsExport !== "undefined" ? fn() : ""; } catch (e) { return ""; } };
    const yn = (v) => (v ? "Ja" : "Nee");
    const condText = (list) => (list || []).map((x) => {
      const d = CATALOG.dlpConditions.find((c) => c.key === x.key); if (!d) return "";
      const v = Array.isArray(x.value) ? x.value.join(", ") : d.value === "enum" ? ((d.options || []).find((o) => o[0] === x.value) || [x.value, x.value])[1] : d.value === "size" ? `${Number(x.value) || 0} KB` : x.value;
      return d.value === "none" ? d.name : `${d.name}: ${v}`;
    }).filter(Boolean).join("\n");
    const out = [];

    // Overzicht
    const vc = Validation.counts(st), cov = (() => { try { return Mapping.coverage(st); } catch (e) { return null; } })();
    const meta = st.meta;
    const ws = CATALOG.workshops.find((w) => w.id === meta.workshop || w.key === meta.workshop);
    const nApp = applicableLabels(st).length, nPar = st.labels.length - nApp;
    const ovRows = [
      ["Klant", meta.customer || ""], ["Datum", meta.date || ""], ["Versie / status", this.versionText(st)], ["Classificatie", `${this.docClass(st)} – bevat namen van deelnemers`],
      ["Facilitator", meta.facilitator || ""], ["Workshop", ws ? ws.name : meta.workshop || ""],
      ["Voortgang", this.readyText(st)],
      ["Status", Validation.isConcept(st) ? "CONCEPT – voorgesteld ontwerp; er is niets in de tenant geconfigureerd. Open punten en aannames nog bevestigen." : `${this.statusName(st)} – voorgesteld ontwerp; er is niets in de tenant geconfigureerd. Werking nog niet geverifieerd.`],
      ["Statuslegenda", "Voorstel = voorgesteld ontwerp, nog niet besloten · Besloten = door de klant besloten · Aanname = door de klant te bevestigen · Open punt = nog te beslissen · Niet geverifieerd = werking niet getest in een tenant"],
      ...(((this.ready(st) || {}).rollout || {}).criteria || []).filter((c) => c && c.text).map((c) => ["", `${c.ok ? "✓" : "✗"} ${c.text}`]),
      ["Deelnemers", (meta.participants || []).filter((p) => p && p.name).map((p) => `${p.name}${p.role ? ` (${p.role})` : ""}`).join("\n")],
      ["Labels", `${nApp} labels die gebruikers kunnen kiezen${nPar > 0 ? ` (+ ${nPar} parent label${nPar === 1 ? "" : "s"} als groepering)` : ""}`],
      ["Informatietypen & classifiers", st.sits.length], ["Labelbeleid", g.labelPolicies.length], ["Auto-labelingpolicies", g.autoPolicies.length],
      ["DLP-policies", g.dlpPolicies.length], ["DLP-regels", sum(g.dlpPolicies, (p) => p.rules.length)],
      ["Dekking ontwerpbord", cov && cov.pct != null ? `${Math.round(cov.pct)}% van de ontwerpbordcellen ingevuld` : ""], ["Scenario’s afgedekt", (() => { const c = Validation.scenarioCover(st); return c ? `${c.text} praktijkscenario’s (automatische ontwerpcheck, geen tenanttest)` : ""; })()],
      ["Validatie", `${vc.err} fout${vc.err === 1 ? "" : "en"} (oplossen vóór uitrol) · ${vc.warn} waarschuwing${vc.warn === 1 ? "" : "en"} (bewust accepteren of oplossen) · ${vc.info} info-melding${vc.info === 1 ? "" : "en"} – zie tabblad Validatie`],
      ["Notities", meta.notes || ""],
      ["Doelen", meta.goals || ""], ["Buiten scope", meta.exclusions || ""], ["Aannames", meta.assumptions || ""],
    ].filter((r) => r[1] !== "" && r[1] != null);
    out.push({
      name: "Overzicht", plain: true, title: "Protect your Data – Information Protection & DLP", sub: `Ontwerp ${meta.customer || ""} · ${meta.date || today()} · ${this.versionText(st)} · ${this.docClass(st)} – bevat namen van deelnemers`,
      head: ["Onderdeel", "Waarde"], widths: [32, 100], rows: ovRows,
    });

    // Stappenplan (wordt het eerste tabblad)
    const reqChecks = CATALOG.tenantChecks.filter((c) => { try { return c.req && c.when(st); } catch (er) { return false; } });
    const reqDone = reqChecks.filter((c) => ["done", "na"].includes(((st.tenant.checks || {})[c.id] || {}).status)).length;
    const grpOpen = (st.groups || []).filter((x) => x.kind !== "all" && (!String(x.value || "").trim() || /<|partner\.nl|contoso|example\./i.test(x.value))).length;
    const ph = (k) => this.phase(st, k), when = (p) => [p.start, p.due].filter(Boolean).join(" → ");
    const nSim = g.dlpPolicies.length + g.autoPolicies.length;
    const steps = [
      ["Randvoorwaarden", `Vereiste randvoorwaarden afronden (${reqDone} van ${reqChecks.length} gereed) – zie tabblad Randvoorwaarden.`, "Microsoft 365 admin center / Purview-portal", ph("prep").owner || "Tenantbeheerder", when(ph("prep"))],
      ["Groepen", `Doelgroepen en partnerdomeinen invullen in de tabel $Groups bovenaan het script en controleren dat de groepen in Entra ID bestaan${grpOpen ? ` (${grpOpen} nog leeg of voorbeeldwaarde)` : ""}.`, "Entra ID + PowerShell-script", ph("prep").owner || "Identity-beheerder", ""],
      ["Script", "PowerShell-script uitvoeren in Security & Compliance PowerShell (Connect-IPPSSession); het logbestand (transcript) bewaren als bewijs.", "PowerShell", "Purview-beheerder", ""],
      ["Portal-checklist", "Handmatige stappen uit de Portal-checklist aan het eind van het script afronden (o.a. trainable classifiers, endpoint-instellingen, justification-opties).", "Purview-portal", "Purview-beheerder", ""],
      ["Pilotgroep", "Labels publiceren aan een pilotgroep, key-users trainen en de communicatie klaarzetten (zie tabblad Adoptie).", "Purview-portal (labelbeleid)", ph("prep").owner || "Projectleider", ""],
      ["Simulatie 2 wk", `${nSim} DLP- en auto-labelingpolicies 1–2 weken in simulatie; Activity explorer en DLP-alerts beoordelen, false positives bijstellen.`, "Purview-portal", ph("sim").owner || "Purview-beheerder + security officer", when(ph("sim"))],
      ["Policy tips", "DLP-policies naar ‘Simulatie met policy tips’ (Mode TestWithNotifications): gebruikers zien meldingen, er wordt nog niet geblokkeerd.", "Purview-portal of PowerShell (Set-DlpCompliancePolicy)", ph("tips").owner || "Purview-beheerder", when(ph("tips"))],
      ["Handhaven", "Policies gefaseerd aanzetten (Mode Enable), per locatie of groep; begin bij de gevoeligste labels. Het script zet zelf nooit handhaving aan.", "Purview-portal of PowerShell (Set-DlpCompliancePolicy)", ph("enforce").owner || "Purview-beheerder (na akkoord opdrachtgever)", when(ph("enforce"))],
    ];
    out.unshift({
      name: "Stappenplan", title: "Stappenplan uitrol", sub: `${meta.customer || ""} · ${this.versionText(st)} · vink af wat gereed is`,
      head: ["Stap", "Onderdeel", "Wat", "Waar (PowerShell / portal)", "Wie", "Planning", "Gereed ☐"], widths: [6, 20, 80, 30, 28, 22, 10],
      rows: steps.map((s, i) => [i + 1, ...s, "☐"]),
    });

    // Labels
    const rowsDef = CATALOG.boardRows;
    out.push({
      name: "Labels", head: ["Prioriteit (1 = laagst)", "Label", "Naam (technisch)", "Naam in script (ASCII)", "Weergavenaam", "Parent", "Kleur", "Tooltip", "Eigenaar", "Doelgroep", "Voorbeelden", ...rowsDef.map((r) => r.name + (r.sub ? ` (${r.sub})` : ""))],
      widths: [11, 28, 26, 22, 20, 18, 10, 50, 22, 22, 30, ...rowsDef.map(() => 50)], freezeCols: 2,
      rows: g.labels.map((gl) => {
        const l = gl.label;
        return [Number(gl.priority) + 1, gl.fullName, gl.name, gl.psName && gl.psName !== gl.name ? gl.psName : "", l.displayName || l.name, gl.parent ? labelShortName(gl.parent) : "", l.color, l.tooltip || "", l.owner || "", l.audience || "", (l.info || []).join(", "),
          ...rowsDef.map((r) => (gl.isParent ? (r.key === "scope" ? Mapping.summary(l, r.key, st) : "") : (() => { try { return Mapping.summary(l, r.key, st); } catch (e) { return ""; } })()))];
      }),
    });

    // Labelbeleid
    out.push({
      name: "Labelbeleid", head: ["Volgorde (1 = eerst)", "Beleid", "Gepubliceerd voor", "Labels", "Justification bij verlagen", "Verplicht (docs / e-mail / meetings / sites / Fabric)", "Default label documenten", "Default label e-mail", "Default label meetings", "Default label sites & groups", "Default label Fabric", "Helplink", "Advanced settings"],
      widths: [11, 32, 30, 44, 14, 30, 24, 24, 24, 24, 20, 30, 34],
      rows: g.labelPolicies.map((gp) => {
        const s = gp.settings || {};
        const de = s.defaultEmail === "sameAsDocs" ? "Zelfde als documenten" : s.defaultEmail === "none" ? "Geen" : ln(s.defaultEmail);
        return [Number(gp.order) + 1, gp.name, gp.scopeText, gp.labels.map((l) => labelFullName(l, st)).join("\n"), yn(s.justification),
          [s.mandatoryDocs, s.mandatoryEmail, s.mandatoryMeetings, s.mandatorySites, s.mandatoryFabric].map(yn).join(" / "),
          ln(s.defaultDocs), de, ln(s.defaultMeetings), ln(s.defaultSites), ln(s.defaultFabric), s.helpLink || "",
          Object.entries(gp.adv || {}).filter(([, v]) => v !== "" && v != null && v !== false).map(([k, v]) => `${k} = ${v}`).join("\n")];
      }),
    });

    // Auto-labeling
    const autoRows = [];
    g.autoPolicies.forEach((ap) => {
      const mode = EXPORT_NL.autoMode(ap.mode), locs = ap.locations.map((x) => EXPORT_NL.workload(x)).join(", ");
      const sitName = (x) => `${x.name}${x.kind === "classifier" ? " (portal)" : ""}`;
      if (!ap.rules.length) autoRows.push([ap.name, labelFullName(ap.label, st), mode, locs, "", "", "", "", yn(ap.overrideManual), ""]);
      ap.rules.forEach((r) => autoRows.push([ap.name, labelFullName(ap.label, st), mode, locs, r.name, EXPORT_NL.workload(r.workload), r.sits.map(sitName).join("\n"), `${r.minCount} · ${EXPORT_NL.conf(r.confidence)}`, yn(ap.overrideManual), support(() => PsExport.autoSupport(ap, r))]));
    });
    const client = applicableLabels(st).filter((l) => l.cfg.autolabel.client.mode !== "off");
    out.push({
      name: "Auto-labeling", head: ["Policy (service-side)", "Label", "Modus", "Locaties", "Regel", "Workload", "Informatietypen", "Min. aantal · confidence", "Handmatig label overschrijven", "Via script / portal"],
      widths: [34, 28, 30, 30, 34, 14, 50, 22, 14, 16], rows: autoRows,
    });
    if (client.length) out.push({
      name: "Auto-labeling (client)", head: ["Label", "Modus", "Informatietypen", "Via script / portal"], widths: [34, 40, 70, 16],
      rows: client.map((l) => [labelFullName(l, st), l.cfg.autolabel.client.mode === "auto" ? "Automatisch toepassen (Automatically apply the label)" : "Aanbevelen (Recommend that users apply the label)", labelSits(l, st).map((s) => s.name).join("\n"), "Portal"]),
    });

    // SIT's
    out.push({
      name: "Informatietypen", head: ["Naam", "Soort", "Categorie", "Regio", "Gekoppeld aan labels", "Confidence", "Min. aantal", "Patroon / regex", "Keywords", "Beschrijving"],
      widths: [36, 20, 14, 12, 40, 18, 10, 40, 40, 60],
      rows: st.sits.map((s) => [s.name, (CATALOG.sitKinds[s.kind] || { short: s.kind }).short, CATALOG.sitCats[s.cat] || s.cat || "", CATALOG.sitRegions[s.region] || s.region || "",
        st.labels.filter((l) => (l.sits || []).includes(s.id)).map((l) => labelFullName(l, st)).join("\n"),
        EXPORT_NL.conf(s.confidence), Number(s.minCount) || "", s.regex || "", (s.keywords || []).join(", "), s.desc || ""]),
    });

    // DLP policies
    out.push({
      name: "DLP-policies", head: ["Policy", "Type", "Locaties", "Modus (ontwerp)", "Modus in script", "Alleen voor", "Uitgezonderd", "Admin units", "Regels", "Beschrijving"],
      widths: [40, 14, 34, 34, 24, 22, 22, 18, 8, 50],
      rows: g.dlpPolicies.map((p) => [p.name, p.custom ? "Maatwerk" : "Ontwerpbord", p.locations.map(locName).join("\n"), modeName(p.mode),
        typeof PsExport !== "undefined" ? PsExport.psMode(p.mode) : "", (p.include || []).map(gn).join(", "), (p.exclude || []).map(gn).join(", "), (p.adminUnits || []).join(", "), p.rules.length, p.desc || ""]),
    });

    // DLP regels
    const ruleRows = [];
    g.dlpPolicies.forEach((p) => p.rules.forEach((r) => {
      const c = r.conditions, a = r.actions, n = r.notify;
      const ep = (a.endpoint || []).map((x) => `${(CATALOG.endpointActivities.find((e) => e.key === x.key) || { name: x.key }).name}: ${EXPORT_NL.level(x.level) || x.value}`).join("\n");
      const acts = [a.blockAccess && `Blokkeren (${a.blockScope === "PerUser" ? "alleen externen" : "iedereen"})`, a.encrypt && `Versleutelen (${a.encrypt})`, a.copilotScope && `Copilot: ${{ content: "gelabelde inhoud niet verwerken", web: "geen web search", prompts: "prompt niet verwerken", external: "externe e-mail niet gebruiken" }[a.copilotScope] || a.copilotScope}`, a.onprem && `On-premises: ${a.onprem}`, a.govern && "Instances-governance"].filter(Boolean).join("\n");
      ruleRows.push([p.name, r.name, (typeof DLP_ACTION_NAMES !== "undefined" && DLP_ACTION_NAMES[r.action]) || r.action || "", c.labels.map((l) => labelFullName(l, st)).join("\n"), c.sits.map((s) => `${s.name}${s.kind === "classifier" ? " (portal)" : ""}`).join("\n"),
        EXPORT_NL.count(r.minCount, r.maxCount), EXPORT_NL.scope(c.accessScope), condText(c.extra), condText(r.exceptions), acts, ep,
        n.tip ? String(n.tip) : "", yn(n.email), EXPORT_NL.override(n.override), n.alert === "every" ? "Bij elke match" : n.alert === "threshold" ? `Drempel: ${Number(n.alertCount) || 10} in ${Number(n.alertMinutes) || 60} min` : "Nee", n.alert && n.alert !== "none" ? EXPORT_NL.sev(n.severity) : "", yn(n.incidentReport), yn(r.stop), support(() => PsExport.dlpSupport(p, r, st)), r.desc || ""]);
    }));
    out.push({
      name: "DLP-regels", head: ["Policy", "Regel", "Actie", "Labels", "Informatietypen", "Aantal (min – max)", "Access scope", "Extra condities", "Uitzonderingen", "Acties", "Endpoint-activiteiten", "Policy tip", "E-mail gebruiker", "Override", "Alert", "Ernst (severity)", "Incidentrapport", "Stop verwerking", "Via script / portal", "Samenvatting"],
      widths: [34, 34, 18, 30, 40, 18, 24, 30, 26, 26, 40, 50, 10, 24, 16, 16, 12, 10, 16, 70], freezeCols: 2, rows: ruleRows,
    });

    // Endpoint-matrix
    const acts = CATALOG.endpointActivities, lvName = (k) => EXPORT_NL.level(k);
    out.push({
      name: "Endpoint-matrix", head: ["Label", ...acts.map((a) => (a.nl ? `${a.name} (${a.nl})` : a.name))], widths: [30, ...acts.map(() => 22)], freezeCols: 1,
      rows: applicableLabels(st).map((l) => { const m = (l.cfg.dlp.endpoint && l.cfg.dlp.endpoint.activities) || {}; return [labelFullName(l, st), ...acts.map((a) => lvName(m[a.key] || "off"))]; }),
    });

    // Endpoint-instellingen
    const e = st.endpoint || {};
    const setRows = CATALOG.endpointSettingSections.map((s) => [s.name, e[s.key] ? "Aan" : "Uit", s.key === "advancedClassification" && e[s.key] ? `Bandbreedte: ${e.bandwidthLimit === "unlimited" ? "onbeperkt" : (Number(e.bandwidthLimit) || 0) + " MB"}` : s.key === "fileEvidence" && e[s.key] ? `${e.evidenceStoreType === "microsoft" ? "Microsoft managed" : `Customer managed: ${e.evidenceStorage || "(URL ontbreekt)"}`} · cache ${Number(e.evidenceCacheDays) || 30} dagen` : ""]);
    (CATALOG.endpointLists || []).forEach((d) => setRows.push([d.name, (e[d.key] || []).filter(Boolean).join("\n"), d.key === "serviceDomains" ? `Modus: ${e.serviceDomainMode === "allow" ? "Allow" : "Block"}` : ""]));
    CATALOG.endpointGroups.forEach((d) => setRows.push([d.name, (e[d.key] || []).filter((x) => x && x.name).map((x) => `${x.name}${x.value ? `: ${x.value}` : ""}${x.action ? ` (${x.action})` : ""}`).join("\n"), d.limit || ""]));
    const jm = { both: "Show default options and custom text box", default: "Only show default options", custom: "Only show custom text box" }[e.justificationMode || "both"] || "";
    setRows.push(["Business justification-opties", (e.justificationOptions || []).filter(Boolean).join("\n"), `${jm}${e.showJustificationDropdown === false ? " · keuzelijst uit" : ""} · alleen in te stellen in het portal`]);
    out.push({ name: "Endpoint-instellingen", head: ["Instelling", "Waarde", "Toelichting"], widths: [46, 60, 40], rows: setRows });

    // Randvoorwaarden
    const stName = { todo: "Te doen", progress: "Bezig", done: "Gereed", na: "N.v.t." };
    out.push({
      name: "Randvoorwaarden", head: ["Groep", "Randvoorwaarde", "Vereist", "Status", "Eigenaar", "Toelichting", "Actie / PowerShell", "Notitie"], widths: [18, 40, 9, 11, 22, 60, 50, 30],
      rows: CATALOG.tenantChecks.filter((c) => { try { return c.when(st); } catch (er) { return false; } }).map((c) => {
        const s = (st.tenant.checks || {})[c.id] || {};
        return [c.group || "", c.name, yn(c.req), stName[s.status] || "Te doen", s.owner || "", c.desc || "", c.ps || "", s.note || ""];
      }),
    });

    // Validatie
    const lvl = typeof VAL_LV_NAME !== "undefined" ? VAL_LV_NAME : { err: "Fout", warn: "Waarschuwing", info: "Info" };
    out.push({
      name: "Validatie", head: ["Niveau", "Onderdeel", "Bevinding", "Toelichting", "Regel-ID", "Categorie", "Blokkerend", "Bron", "Verificatie", "Geverifieerd op"], widths: [14, 22, 50, 80, 18, 24, 14, 70, 30, 18],
      rows: Validation.run(st).map((v) => [lvl[v.level] || v.level, (typeof VAL_ROUTE_NAMES !== "undefined" && VAL_ROUTE_NAMES[v.route]) || v.route, v.title, String(v.desc || "").replace(/<[^>]+>/g, ""), v.ruleId, v.category, v.blocking ? "Ja" : "Nee", v.source, v.verification, v.verifiedAt]),
    });

    // Besluiten (altijd, ook leeg: dient als invullijst)
    out.push({
      name: "Besluiten", head: ["Status", "Tekst", "Eigenaar", "Deadline", "Onderdeel (route)", "Tijdstip", "Onderbouwing", "Aannames", "Oplossing / acceptatie", "Notities", "Configuratie-ID", "Regel-ID"], widths: [14, 80, 22, 14, 22, 18, 60, 60, 60, 60, 28, 24],
      rows: (st.decisions || []).map((d) => [DECISION_STATUS_META[decisionStatus(d)][0], d.text, d.owner || "", d.due || "", (typeof VAL_ROUTE_NAMES !== "undefined" && VAL_ROUTE_NAMES[d.route]) || d.route || "", d.at ? String(d.at).replace("T", " ").slice(0, 16) : "", d.rationale || "", d.assumptions || "", d.resolution || "", d.notes || "", d.configId || "", d.ruleId || ""]),
    });
    out.push({ name: "Agenda", head: ["Onderwerp", "Minuten", "Doel", "Facilitator", "Onderdeel", "Afspraken"], widths: [35, 12, 70, 25, 25, 70],
      rows: (st.workshop?.agenda || []).map((a) => [a.title, a.duration, a.goal, a.facilitator, a.route, a.notes]),
      sub: `Beschikbare tijd: ${st.workshop?.duration || "niet ingevuld"} minuten` });

    // Adoptie
    const bRows = CATALOG.boardRows.filter((r) => r.kind === "choice");
    const notes = (st.adoption || {}).notes || {};
    const noteList = (typeof ADOPT_NOTES !== "undefined" ? ADOPT_NOTES : []).filter(([k]) => String(notes[k] || "").trim());
    out.push({
      name: "Adoptie", head: ["Persona", "Omschrijving", "Raakt domeinen", "Verwachte impact", "Wat verandert er & communicatie"], widths: [24, 50, 40, 18, 60],
      rows: (st.personas || []).map((p) => [p.name || "", p.desc || "", unique((p.touch || []).map((k) => (bRows.find((r) => r.key === k) || {}).name).filter(Boolean)).join(", "),
        p.impact && p.impact.level != null && p.impact.level !== "" ? (CATALOG.friction || [])[+p.impact.level] || "" : "", p.comms || ""]),
      extra: [
        { title: "Gefaseerde uitrol", head: ["Fase", "Wat", "Eigenaar", "Startdatum", "Streefdatum"], rows: this.phases().map((f) => { const p = this.phase(st, f.key); return [f.title, f.desc, p.owner, p.start, p.due]; }) },
        ...(noteList.length ? [{ title: "Afspraken", head: ["Onderwerp", "Afspraak"], rows: noteList.map(([k, t]) => [t, notes[k]]) }] : []),
      ],
    });

    // Scenario's
    const scRows = this.scenarioRows(st);
    if (scRows.length) out.push({
      name: "Scenario's", head: ["Scenario", "Label", "Wat merkt de medewerker?", "Gewenst", "Resultaat", "Voorspelling team", "Beslissende regel", "Bespreekpunten"], widths: [50, 34, 20, 40, 14, 22, 34, 60],
      rows: scRows.map((r) => [r.title, r.label, r.outcome, r.desired, r.status, r.predict, r.rule, r.talk]),
    });
    return out;
  },
  build(st = S()) { return this.workbook(this.sheets(st)); },
  fileName(st) { return exportFileName(st, "xlsx"); },
  download() {
    const st = S();
    try {
      downloadBlob(new Blob([this.build(st)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), this.fileName(st));
      Toast.show("Excel-download gestart. Controleer het bestand in je downloads.", "ok");
    } catch (e) { console.error(e); Toast.show("Excel-export mislukt: " + esc(e.message || e), "err"); }
  },
};
