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

// Beelden in de vaste HTML en het mozaïek (CSS-variabele) krijgen hun data-URI hier, zodat niets dubbel in het bestand staat.
if (typeof document !== "undefined") {
  document.querySelectorAll("img[data-asset]").forEach((im) => { const s = BRAND_ASSETS[im.dataset.asset]; if (s) im.src = s; });
  document.documentElement.style.setProperty("--img-mosaic", `url("${BRAND_ASSETS.peMosaic}")`);
}
