"""Bundelt de bronbestanden tot één offline HTML-bestand.

Gebruik:  python build.py [uitvoerpad]          -> offline HTML (standaard: ..\\Protect your Data - IP & DLP Workshop Designer.html)
          python build.py --web <map>           -> webversie voor GitHub Pages: <map>\\index.html + robots.txt
                                                   (noindex, niet in een frame te openen)
"""
import base64
import hashlib
import pathlib
import re
import sys
import datetime

ROOT = pathlib.Path(__file__).resolve().parent
ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
WEB = "--web" in sys.argv[1:]
if WEB and not ARGS:
    sys.exit("FOUT: gebruik python build.py --web <uitvoermap>")
OUT = pathlib.Path(ARGS[0]) if ARGS else ROOT.parent / "Protect your Data - IP & DLP Workshop Designer.html"
if WEB:
    OUT.mkdir(parents=True, exist_ok=True)
    OUT = OUT / "index.html"

CSS = ["css/app.css", "css/core.css", "css/views-b.css", "css/doc.css", "css/r4.css", "css/r5-sits.css", "css/r5-scn.css", "css/r5-adopt.css", "css/brand.css", "css/r6-arch.css", "css/r7-start.css", "css/r7-dlp.css", "css/polish.css", "css/r8-schema.css", "css/r8-board.css", "css/r8-detail.css", "css/r8-master.css", "css/r8-zoom.css", "css/r8-frame.css", "css/r9-fac.css", "css/hub.css"]
JS = [
    # huisstijl (data-URI-beelden; ook bron voor __ASSET_naam__ in template en CSS)
    "data/brand-assets.js",
    "data/persona-assets.js",
    "js/brand.js",
    # data
    "data/catalog-core.js",
    "data/catalog-sits.js",
    "data/catalog-sits-all.js",
    "data/catalog-labels.js",
    "data/catalog-dlp.js",
    "data/catalog-board.js",
    "data/catalog-scenarios.js",
    "data/catalog-arch.js",
    "data/catalog-adoption.js",
    "data/presets.js",
    "data/catalog-hub.js",
    "data/catalog-experience.js",
    "data/catalog-academy.js",
    # kern
    "js/core.js",
    "js/dnd.js",
    "js/model.js",
    "js/mapping.js",
    "js/generator.js",
    "js/validation.js",
    "js/scenario-engine.js",
    "js/ui.js",
    "js/previews.js",
    "js/learning.js",
    # views
    "js/views/_shared.js",
    "js/views/hub.js",
    "js/views/experience.js",
    "js/views/academy.js",
    "js/views/start.js",
    "js/views/architecture.js",
    "js/views/schema.js",
    "js/views/sits.js",
    "js/views/board.js",
    "js/views/label-detail.js",
    "js/views/policies.js",
    "js/views/autolabel.js",
    "js/views/dlp.js",
    "js/views/endpoint.js",
    "js/views/copilot.js",
    "js/views/tenant.js",
    "js/views/scenarios.js",
    "js/views/adoption.js",
    "js/views/decisions.js",
    "js/views/export.js",
    # exports
    "js/export/xlsx.js",
    "js/export/powershell.js",
    "js/export/document.js",
    # app
    "js/app.js",
]


def read(rel: str) -> str:
    p = ROOT / rel
    if not p.exists():
        sys.exit(f"FOUT: ontbrekend bronbestand: {rel}")
    return p.read_text(encoding="utf-8")


def main() -> None:
    tpl = read("index.template.html")
    css = "\n".join(f"/* ==== {c} ==== */\n" + read(c) for c in CSS)
    parts = []
    for j in JS:
        src = read(j)
        if "</script" in src.lower():
            sys.exit(f"FOUT: '</script' gevonden in {j}")
        parts.append(f"/* ==== {j} ==== */\n{src}\n")
    js = "\n".join(parts)
    if WEB:
        # GitHub Pages kan geen frame-ancestors-header zetten: weiger zelf om in een frame te draaien (clickjacking).
        js = ('if (window.top !== window.self) { document.body.textContent = "Open deze app rechtstreeks, niet in een frame."; '
              'throw new Error("framed"); }\n') + js
    stamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    # Merkbeelden (Pink Elephant / Microsoft) als data-URI in template en CSS: __ASSET_peMark__ e.d.
    assets = dict(re.findall(r'"(\w+)":\s*"(data:[^"]+)"', read("data/brand-assets.js")))

    def asset(m: "re.Match[str]") -> str:
        if m.group(1) not in assets:
            sys.exit(f"FOUT: onbekend merkbeeld __ASSET_{m.group(1)}__")
        return assets[m.group(1)]

    tpl = re.sub(r"__ASSET_(\w+)__", asset, tpl)
    css = re.sub(r"__ASSET_(\w+)__", asset, css)
    html = tpl.replace("/*__CSS__*/", css).replace("__BUILD__", stamp)
    html = html.replace("//__JS__", js.replace("__BUILD__", stamp))
    # Content-Security-Policy: alleen het ene ingebouwde script mag draaien (sha256 over de exacte scripttekst).
    start = html.index("<script>", html.index("<body>")) + len("<script>")
    end = html.index("</script>", start)
    digest = base64.b64encode(hashlib.sha256(html[start:end].encode("utf-8")).digest()).decode("ascii")
    if html.count("__CSP_HASH__") != 1:
        sys.exit("FOUT: CSP-plaatshouder __CSP_HASH__ niet precies één keer gevonden")
    html = html.replace("__CSP_HASH__", digest)
    if WEB:
        ref = '<meta name="referrer" content="no-referrer">'
        if html.count(ref) != 1:
            sys.exit("FOUT: referrer-meta niet precies één keer gevonden")
        html = html.replace(ref, ref + '\n<meta name="robots" content="noindex, nofollow">')
        (OUT.parent / "robots.txt").write_text("User-agent: *\nDisallow: /\n", encoding="utf-8", newline="\n")
    OUT.write_text(html, encoding="utf-8", newline="\n")
    print(f"OK: {OUT.name}{' (web)' if WEB else ''} ({len(html) / 1024:.0f} KB, {len(JS)} JS-modules, build {stamp})")


if __name__ == "__main__":
    main()
