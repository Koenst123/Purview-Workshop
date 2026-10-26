/* Huisstijl-helpers (Pink Elephant). Beelden staan in data/brand-assets.js (gegenereerd door make_assets.py). */

/** <img> voor een merkbeeld (alleen vaste sleutels; alt is vaste tekst). Microsoft-iconen uitsluitend als productaanduiding, nooit vervormd. */
function brandImg(key, alt, cls, attrs) {
  const src = BRAND_ASSETS[key];
  if (!src) return "";
  const a = String(alt == null ? "" : alt).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  return `<img class="${cls || ""}" src="${src}" alt="${a}"${attrs || ""} draggable="false">`;
}

/** Productaanduiding per route (paginakop): Microsoft-producticoon + productnaam. */
const BRAND_PRODUCT = {
  schema: ["msPurview", "Microsoft Purview"], sits: ["msPurview", "Microsoft Purview"], board: ["msPurview", "Microsoft Purview"], architectuur: ["msPurview", "Microsoft Purview"],
  labels: ["msPurview", "Microsoft Purview"], policies: ["msPurview", "Microsoft Purview"], autolabel: ["msPurview", "Microsoft Purview"],
  dlp: ["msPurview", "Microsoft Purview"], tenant: ["msPurview", "Microsoft Purview"],
  endpoint: ["msDefender", "Microsoft Purview · Defender for Endpoint"],
  copilot: ["msCopilot", "Microsoft Purview"],
};

/** Microsoft-productlogo per app (gedeeld door start, previews, policy tips en architectuur).
 *  Gebruikt het officiële icoon uit BRAND_ASSETS als dat bestaat, anders een neutrale lettertegel. */
const MS_APPS = {
  word: ["msWord", "Word", "W", "#185abd"], excel: ["msExcel", "Excel", "X", "#107c41"], powerpoint: ["msPowerPoint", "PowerPoint", "P", "#c43e1c"],
  outlook: ["msOutlook", "Outlook", "O", "#0f6cbd"], teams: ["msTeams", "Teams", "T", "#5b5fc7"], sharepoint: ["msSharePoint", "SharePoint", "S", "#03787c"],
  onedrive: ["msOneDrive", "OneDrive", "O", "#0364b8"], edge: ["msEdge", "Edge", "E", "#0c8484"], windows: ["msWindows", "Windows", "W", "#0078d4"],
  purview: ["msPurview", "Microsoft Purview", "P", "#0078d4"], copilot: ["msCopilot", "Microsoft 365 Copilot", "C", "#7b45d6"],
  defender: ["msDefender", "Microsoft Defender", "D", "#0078d4"], entra: ["msEntra", "Microsoft Entra", "E", "#0078d4"],
};
function msLogo(app, cls, withAlt) {
  const d = MS_APPS[String(app || "").toLowerCase()];
  if (!d) return "";
  const c = `ms-logo ${cls || ""}`.trim();
  if (typeof BRAND_ASSETS !== "undefined" && Object.hasOwn(BRAND_ASSETS, d[0])) return brandImg(d[0], withAlt ? d[1] : "", c, withAlt ? "" : ' aria-hidden="true"');
  const glyph = { windows: "laptop", edge: "browser" }[String(app).toLowerCase()];
  if (glyph && typeof icon === "function") return `<span class="${c} ms-logo-fb ms-logo-glyph" style="--ms-c:${d[3]}"${withAlt ? ` role="img" aria-label="${d[1]}"` : ' aria-hidden="true"'}>${icon(glyph, "s")}</span>`;
  return `<span class="${c} ms-logo-fb" style="--ms-c:${d[3]}"${withAlt ? ` role="img" aria-label="${d[1]}"` : ' aria-hidden="true"'}>${d[2]}</span>`;
}

// Beelden in de vaste HTML en het mozaïek (CSS-variabele) krijgen hun data-URI hier, zodat niets dubbel in het bestand staat.
if (typeof document !== "undefined") {
  document.querySelectorAll("img[data-asset]").forEach((im) => { const s = BRAND_ASSETS[im.dataset.asset]; if (s) im.src = s; });
  document.documentElement.style.setProperty("--img-mosaic", `url("${BRAND_ASSETS.peMosaic}")`);
}
