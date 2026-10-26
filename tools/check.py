"""Veiligheidscontrole voor publicatie (lokaal via publiceer.ps1 en in GitHub Actions).

Gebruik:  python tools/check.py _site

Controleert:
  1. _site bevat alleen index.html en robots.txt;
  2. index.html: strikte CSP met kloppende sha256, geen externe bronnen, noindex, frame-guard;
  3. repository: geen klantbestanden (json/xlsx/docx/pdf/...), geen secrets/sleutels;
  4. optioneel: geen klantnamen uit het lokale bestand .verboden-woorden.txt (staat in .gitignore).
Stopt met exitcode 1 bij een probleem.
"""
import base64
import hashlib
import pathlib
import re
import sys

REPO = pathlib.Path(__file__).resolve().parent.parent
SITE = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else REPO / "_site"
problems: list[str] = []


def fail(msg: str) -> None:
    problems.append(msg)


# 1. Inhoud van de site
allowed = {"index.html", "robots.txt"}
found = {p.relative_to(SITE).as_posix() for p in SITE.rglob("*") if p.is_file()} if SITE.is_dir() else set()
if "index.html" not in found:
    fail(f"{SITE}/index.html ontbreekt – eerst bouwen: python src/build.py --web {SITE}")
for extra in sorted(found - allowed):
    fail(f"onverwacht bestand in site: {extra}")

# 2. index.html
idx = SITE / "index.html"
if idx.is_file():
    html = idx.read_text(encoding="utf-8")
    if len(html) > 5 * 1024 * 1024:
        fail("index.html is groter dan 5 MB")
    m = re.search(r'<meta http-equiv="Content-Security-Policy" content="([^"]+)">', html)
    if not m:
        fail("CSP-meta ontbreekt")
    else:
        csp = m.group(1)
        for need in ("default-src 'none'", "connect-src 'none'", "object-src 'none'", "base-uri 'none'", "form-action 'none'"):
            if need not in csp:
                fail(f"CSP mist: {need}")
        if "unsafe-eval" in csp or re.search(r"script-src[^;]*'unsafe-inline'", csp):
            fail("CSP staat unsafe-eval/unsafe-inline toe voor scripts")
        hm = re.search(r"script-src 'sha256-([A-Za-z0-9+/=]+)'", csp)
        try:
            start = html.index("<script>", html.index("<body>")) + len("<script>")
            end = html.index("</script>", start)
            digest = base64.b64encode(hashlib.sha256(html[start:end].encode("utf-8")).digest()).decode("ascii")
            if not hm or hm.group(1) != digest:
                fail("CSP-hash klopt niet met het script")
        except ValueError:
            fail("ingebouwd script niet gevonden")
    if len(re.findall(r"<script\b", html, re.I)) != 1:
        fail("meer dan één <script>-blok")
    if re.search(r'<(script|link|img|iframe|embed|object)\b[^>]*\b(src|href)\s*=\s*["\']?(https?:)?//', html, re.I):
        fail("externe bron (script/link/img/iframe) gevonden")
    if '<meta name="robots" content="noindex, nofollow">' not in html:
        fail("noindex-meta ontbreekt (bouw met --web)")
    if "window.top !== window.self" not in html:
        fail("frame-guard ontbreekt (bouw met --web)")

# 3. Repository-hygiëne
BLOCKED_EXT = {".json", ".xlsx", ".xls", ".csv", ".docx", ".pdf", ".pptx", ".zip", ".pfx", ".pem", ".key", ".p12"}
SECRET_RX = re.compile(
    r"(-----BEGIN [A-Z ]*PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{36}\b|\bgithub_pat_[A-Za-z0-9_]{60,}|"
    r"\bAKIA[0-9A-Z]{16}\b|AccountKey=[A-Za-z0-9+/=]{40,}|\bxox[abp]-[A-Za-z0-9-]{10,}|"
    r"client_secret\s*[:=]\s*['\"][^'\"<]{8,}|SharedAccessSignature=|\bsig=[A-Za-z0-9%]{30,})"
)
words_file = REPO / ".verboden-woorden.txt"
words = []
if words_file.is_file():
    words = [w.strip().lower() for w in words_file.read_text(encoding="utf-8").splitlines() if w.strip() and not w.startswith("#")]

skip_dirs = {".git", "_site", "__pycache__", "node_modules"}
for p in REPO.rglob("*"):
    if not p.is_file() or any(part in skip_dirs for part in p.relative_to(REPO).parts):
        continue
    rel = p.relative_to(REPO).as_posix()
    if p.suffix.lower() in BLOCKED_EXT or (p.suffix.lower() == ".html" and rel != "src/index.template.html"):
        fail(f"bestand hoort niet in de repo: {rel}")
        continue
    if p.stat().st_size > 3 * 1024 * 1024:
        fail(f"bestand groter dan 3 MB: {rel}")
        continue
    try:
        text = p.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        continue
    sm = SECRET_RX.search(text) if p.resolve() != pathlib.Path(__file__).resolve() else None
    if sm:
        fail(f"mogelijk geheim in {rel}: {sm.group(0)[:12]}…")
    low = text.lower()
    for w in words:
        if w in low and p != words_file:
            fail(f"verboden woord '{w}' in {rel}")

if problems:
    print("CONTROLE MISLUKT:")
    for x in problems:
        print("  - " + x)
    sys.exit(1)
print(f"CONTROLE OK: site ({', '.join(sorted(found))}), CSP, noindex, frame-guard, geen klantbestanden of geheimen"
      + (f", {len(words)} verboden woorden gecontroleerd" if words else ""))
