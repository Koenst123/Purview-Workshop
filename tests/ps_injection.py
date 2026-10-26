import os as _os, pathlib as _pl, tempfile as _tf
_TD = _pl.Path(__file__).resolve().parents[1]  # repo-root met src, Voorbeelden en de deliverable
_OUT = _os.environ.get("PYD_TEST_OUT") or _os.path.join(_tf.gettempdir(), "pyd-tests", _pl.Path(__file__).stem)
_os.makedirs(_OUT, exist_ok=True)
import sys, json, re, os, pathlib, subprocess
from playwright.sync_api import sync_playwright
ROOT = str(_TD)
HTML = sys.argv[1]
OUT = os.path.join(_OUT, "nasty"); os.makedirs(OUT, exist_ok=True)
url = pathlib.Path(HTML).as_uri()

NASTY = [
    "A'B ‘q’ $(Write-Host PWNEDa) `b \"dq\" ${env:X}",
    "nl\nWrite-Host PWNEDb\n#",
    "cr\rWrite-Host PWNEDc\r#",
    "ls\u2028Write-Host PWNEDd",
    "#> Write-Host PWNEDe <#",
    "x\n'@\nWrite-Host PWNEDf\n@'",
    "<img src=x onerror=alert(1)>\"'><svg onload=alert(1)>&amp;]]>",
]
JS = r"""
(nasty) => {
  const st = buildPresetState('zorg', {customer:'X'});
  st.sits.push({id:'sit-cx', kind:'custom', name:'CustomSit', desc:'desc', regex:'\\d{4}', keywords:['kw1','kw2'], confidence:'high', proximity:300});
  st.groups.push({id:'grp-x', name:'Groep', kind:'group', value:'g@x.nl'});
  st.decisions = [{id:'d1', kind:'decision', text:'D', route:'board'}];
  // custom dlp with a rule using scoped groups
  const FREE = /^(name|displayName|tooltip|adminDesc|audience|text|tipText|message|customer|facilitator|notes|prefix|desc|description|value|keywords|note|title|comms|role|helpLink|info|tip|regex|evidenceStorage|authContext|justificationOptions|pathExclusionsWin|pathExclusionsMac|serviceDomains|unallowedBrowsers|restrictedApps|vpnAddresses|networkShareExclusions|unallowedBluetoothApps|date)$/;
  let n = 0;
  const ids = new Set(); const col = (o) => { if (Array.isArray(o)) o.forEach(col); else if (o && typeof o === 'object') Object.entries(o).forEach(([k,v]) => { if (k === 'id') ids.add(v); col(v); }); }; col(st);
  const w = (o, key) => {
    if (Array.isArray(o)) { o.forEach((v, i) => { if (typeof v === 'string' && FREE.test(key||'') && !ids.has(v)) o[i] = v + nasty[(n++) % nasty.length]; else w(v, key); }); return; }
    if (!o || typeof o !== 'object') return;
    Object.keys(o).forEach((k) => { const v = o[k]; if (typeof v === 'string' && FREE.test(k) && !ids.has(v)) o[k] = v + nasty[(n++) % nasty.length]; else w(v, k); });
  };
  w(st, '');
  // enable markings so header text etc. are exported
  st.labels.forEach((l) => { l.cfg.marking.header.enabled = true; l.cfg.marking.watermark.enabled = true; });
  Store.replace(st);
  return n;
}
"""
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(url); pg.wait_for_timeout(300)
    for i, nz in enumerate(NASTY):
        cnt = pg.evaluate(JS, [nz])
        ps = pg.evaluate("PsExport.build(S())")
        open(os.path.join(OUT, f"nasty-{i}.ps1"), "w", encoding="utf-8-sig").write(ps)
        xb = pg.evaluate("Array.from(XlsxExport.build(S()))")
        open(os.path.join(OUT, f"nasty-{i}.xlsx"), "wb").write(bytes(xb))
        doc = pg.evaluate("DocExport.html(S())") + pg.evaluate("DocExport.html(S(), {only:'keuzes'})")
        open(os.path.join(OUT, f"nasty-{i}.html"), "w", encoding="utf-8").write(doc)
        print(i, "fields", cnt, "ps lines", ps.count("\n"))
    b.close()
parser_check = r"""
$ErrorActionPreference = 'Stop'
foreach ($file in Get-ChildItem -LiteralPath $env:PYD_PS_OUT -Filter '*.ps1') {
  $tokens = $null; $errors = $null
  $ast = [System.Management.Automation.Language.Parser]::ParseFile($file.FullName, [ref]$tokens, [ref]$errors)
  if ($errors.Count) { throw "PowerShell syntax error in $($file.Name): $($errors.Message -join '; ')" }
  $injected = $ast.FindAll({
    param($node)
    $node -is [System.Management.Automation.Language.CommandAst] -and
    $node.GetCommandName() -eq 'Write-Host' -and
    @($node.CommandElements | Where-Object {
      $_ -is [System.Management.Automation.Language.StringConstantExpressionAst] -and $_.Value -match '^PWNED[a-f]$'
    }).Count -gt 0
  }, $true)
  if ($injected.Count) { throw "Executable injected command found in $($file.Name)" }
}
Write-Output 'PowerShell AST: all payloads remain non-executable'
"""
subprocess.run(["pwsh", "-NoProfile", "-NonInteractive", "-Command", parser_check],
               env={**os.environ, "PYD_PS_OUT": OUT}, check=True)
print("pageerrors", errs)
sys.exit(bool(errs))
