<#
.SYNOPSIS
  Bouwt de app en draait de volledige regressietestset (Playwright/Chromium).
.DESCRIPTION
  Vereist: Python 3.10+, Node, PowerShell 7, `pip install -r tools\requirements-test.txt`
  en `python -m playwright install chromium`.
  Tests draaien na elkaar (parallel geeft time-outs). Uitvoer en screenshots: unieke map onder %TEMP%.
  Alleen synthetische testbronnen worden gepubliceerd, nooit de uitvoer.
.EXAMPLE
  .\run-all.ps1            # bouwt naar %TEMP% en test
  .\run-all.ps1 -App 'C:\pad\app.html'
#>
param([string]$App)
$ErrorActionPreference = 'Stop'
$env:PYTHONIOENCODING = 'utf-8'
$runner = Join-Path (Split-Path $PSScriptRoot -Parent) 'tools\test.py'
if ($App) { python $runner --app $App } else { python $runner }
exit $LASTEXITCODE
