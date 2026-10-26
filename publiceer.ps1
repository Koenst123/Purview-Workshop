<#
.SYNOPSIS
  Publiceert de Workshop Designer naar GitHub Pages (https://koenst123.github.io/Purview-Workshop/).

.DESCRIPTION
  1. Haalt de laatste versie van GitHub op (git pull --ff-only).
  2. Gebruikt de broncode in src\ van deze map. (Alleen met -Bron: kopieert eerst een andere bronmap naar src\, zonder klantbestanden.)
  3. Bouwt de webversie (_site) en draait de veiligheidscontrole (+ rooktest als Playwright aanwezig is).
  4. Toont wat er verandert en vraagt om bevestiging.
  5. Commit + push naar main. GitHub Actions publiceert daarna automatisch (1-2 minuten).

.PARAMETER Bericht
  Korte omschrijving van de wijziging (commitbericht), bijv. "Architectuurpagina bijgewerkt".

.PARAMETER Bron
  Optioneel: pad naar een andere bronmap (bijv. een oude _bron-map) die eerst naar src\ wordt gekopieerd.
  Standaard bewerk en publiceer je direct src\ in deze map.

.PARAMETER Proef
  Alleen bouwen en controleren; niets committen of pushen.

.EXAMPLE
  .\publiceer.ps1 -Bericht "Teksten DLP-pagina verbeterd"

.EXAMPLE
  .\publiceer.ps1 -Proef
#>
[CmdletBinding()]
param(
  [string]$Bericht,
  [string]$Bron,
  [switch]$Proef
)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

function Stap($t) { Write-Host "`n== $t" -ForegroundColor Magenta }
function Stop-Met($t) { Write-Host "STOP: $t" -ForegroundColor Red; exit 1 }

if (-not $Proef -and -not $Bericht) { Stop-Met 'Geef een omschrijving mee: .\publiceer.ps1 -Bericht "Wat is er veranderd"' }
if (-not (Test-Path -LiteralPath '.git')) { Stop-Met 'Dit script moet in de lokale clone van de repository staan (map met .git).' }
if ($Bron -and -not (Test-Path -LiteralPath (Join-Path $Bron 'build.py'))) { Stop-Met "Geen build.py gevonden in -Bron '$Bron'." }
if (-not $Bron -and -not (Test-Path -LiteralPath 'src\build.py')) { Stop-Met 'src\build.py niet gevonden. Staat dit script in de repo-map?' }

Stap 'Controleren op juiste branch en laatste versie'
$branch = (git branch --show-current).Trim()
if ($branch -ne 'main') { Stop-Met "Je staat op branch '$branch'. Ga eerst naar main: git switch main" }
if (-not $Proef -and (git ls-remote --heads origin main)) {
  git pull --ff-only --quiet
  if ($LASTEXITCODE -ne 0) { Stop-Met 'git pull mislukt (lokale wijzigingen of conflict). Los dit eerst op.' }
}

if ($Bron) {
  Stap "Bron kopieren: $Bron -> src"
  robocopy $Bron (Join-Path $PSScriptRoot 'src') /MIR /NFL /NDL /NJH /NJS /NP /XF *.json *.xlsx *.xls *.csv *.docx *.pdf *.pptx *.zip *.html desktop.ini /XD __pycache__ .git tests | Out-Null
  if ($LASTEXITCODE -ge 8) { Stop-Met "Kopieren mislukt (robocopy code $LASTEXITCODE)." }
  Copy-Item -LiteralPath (Join-Path $Bron 'index.template.html') -Destination (Join-Path $PSScriptRoot 'src\index.template.html') -Force
  $global:LASTEXITCODE = 0
}

Stap 'Webversie bouwen'
python src\build.py --web _site
if ($LASTEXITCODE -ne 0) { Stop-Met 'Bouwen mislukt.' }

Stap 'Veiligheidscontrole'
python tools\check.py _site
if ($LASTEXITCODE -ne 0) { Stop-Met 'Veiligheidscontrole mislukt - er wordt niets gepubliceerd.' }

Stap 'Rooktest in de browser'
python tools\smoke.py _site\index.html
if ($LASTEXITCODE -ne 0) { Stop-Met 'Rooktest mislukt - er wordt niets gepubliceerd.' }

if ($Proef) { Write-Host "`nProef geslaagd. Bekijk lokaal: _site\index.html (niets gepubliceerd)." -ForegroundColor Green; exit 0 }

Stap 'Wijzigingen'
git add -A
$changes = git status --short
if (-not $changes) { Write-Host 'Geen wijzigingen - niets te publiceren.' -ForegroundColor Yellow; exit 0 }
$changes | ForEach-Object { Write-Host "  $_" }
$ok = Read-Host "`nDeze wijzigingen publiek publiceren? (j/n)"
if ($ok -notin @('j', 'J', 'ja', 'Ja')) { git reset --quiet; Write-Host 'Afgebroken - niets gepubliceerd.' -ForegroundColor Yellow; exit 0 }

Stap 'Commit en push'
git commit --quiet -m $Bericht
if ($LASTEXITCODE -ne 0) { Stop-Met 'Commit mislukt.' }
git push --quiet -u origin main
if ($LASTEXITCODE -ne 0) { Stop-Met 'Push mislukt (inloggen of rechten?). Er is lokaal wel gecommit; probeer later: git push' }

$repo = ((git remote get-url origin) -replace '\.git$', '' -replace '^git@github\.com:', 'https://github.com/')
Write-Host "`nVerstuurd. GitHub publiceert nu automatisch (1-2 minuten):" -ForegroundColor Green
Write-Host "  Voortgang : $repo/actions"
$parts = ($repo -replace '^https://github\.com/', '') -split '/'
Write-Host "  Live site : https://$($parts[0].ToLower()).github.io/$($parts[1])/"
