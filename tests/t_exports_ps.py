import os as _os, pathlib as _pl, tempfile as _tf
_TD = _pl.Path(__file__).resolve().parents[1]  # repo-root met src, Voorbeelden en de deliverable
_OUT = _os.environ.get("PYD_TEST_OUT") or _os.path.join(_tf.gettempdir(), "pyd-tests", _pl.Path(__file__).stem)
_os.makedirs(_OUT, exist_ok=True)
"""Round-3 exports PS test: writes ps3-*.ps1 for several scenarios and prints key lines."""
import sys, json, pathlib, re
from playwright.sync_api import sync_playwright
h, out = sys.argv[1], pathlib.Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
JS = r"""([k, partner, alerts, pex]) => {
  const st = normalizeState(buildPresetState(k, {customer:'Gemeente Zuid',date:'2026-01-05',facilitator:'',notes:''}));
  st.dlpSettings = st.dlpSettings || {};
  st.dlpSettings.alertRecipients = alerts;
  const pg = (st.groups || []).find(g => g.kind === 'domain');
  if (pg) pg.value = partner; else { st.groups.push({id:'gp', kind:'domain', name:'Partnerdomein(en)', value: partner}); }
  const grp = (st.groups || []).find(g => g.kind === 'domain');
  let lab = st.labels.find(l => ((l.cfg.encryption||{}).permissions||[]).some(p => p.type==='domain'||p.type==='partner'));
  if (!lab) {
    lab = applicableLabels(st).find(l => l.cfg.encryption && l.cfg.scope.emails);
    if (lab) { lab.cfg.encryption.mode = 'assignNow'; lab.cfg.encryption.permissions = (lab.cfg.encryption.permissions||[]).concat([{type:'partner', level:'Reviewer', groupId: grp.id}]); }
  }
  if (pex && lab) st.dlpSettings.partnerException = {[lab.id]: true};
  // custom DLP with include + exclude
  st.groups.push({id:'gi', kind:'group', name:'Team Financiën', value:'financien@zuid.nl'}, {id:'ge', kind:'group', name:"Directie 'MT'", value:''});
  const b = st.sits.find(s => s.kind === 'builtin');
  st.customDlp = (st.customDlp || []).concat([{id:'cx', name:'Maatwerk scope', mode:'simulation', locations:['exchange','devices'], include:['gi'], exclude:['ge'], adminUnits:[],
     rules:[{id:'rx', name:'Maatwerk regel', labels:[], sits:[b.id], minCount:1, maxCount:'any', accessScope:'', extra:[], exceptions:[], action:'block', notifyTip:true, endpoint:{}}]}]);
  if (k === "generic" && pex) { const al = applicableLabels(st); al.slice(1,3).forEach((l, i) => { Mapping.apply(st, l.id, i ? "fb-block" : "fb-override"); Mapping.apply(st, l.id, "ep-block"); }); }
  const v = Validation.run(st);
  return {ps: PsExport.build(st), label: lab && labelFullName(lab, st), errs: v.filter(x => x.level === 'err').map(x => x.title)};
}"""
cases = [
  ("generic-multi", "generic", "buurgemeente.nl, ggd-regio.nl; jeugdzorgaanbieder.nl", "soc@zuid.nl; privacy@zuid.nl, fout@", True),
  ("generic-placeholder", "generic", "partner.nl", "", True),
  ("zorg-multi", "zorg", "buurgemeente.nl, ggd-regio.nl; jeugdzorgaanbieder.nl", "", False),
  ("overheid", "overheid", "buurgemeente.nl ggd-regio.nl", "cert@zuid.nl", True),
]
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page()
    errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(pathlib.Path(h).as_uri()); pg.wait_for_timeout(800)
    for name, k, partner, alerts, pex in cases:
        try:
            r = pg.evaluate(JS, [k, partner, alerts, pex])
        except Exception as e:
            raise AssertionError(f"PowerShell-export mislukt: {name}") from e
        f = out / f"ps3-{name}.ps1"; f.write_text(r["ps"], encoding="utf-8-sig")
        print(f"== {name} (label {r['label']}) val errs: {r['errs']}")
        for ln in r["ps"].splitlines():
            if re.search(r"EncryptionRightsDefinitions|ExceptIfRecipientDomainIs|\$AlertRecipient =|BlockAccessScope|Voorbeelddomein|partnerdomeinen|Uitsluiting|ExchangeSenderMemberOf|EndpointDlpRestrictions|Parent label|NotifyPolicyTipCustomText|^\s+'.*' += '|labelschema|Business justification", ln):
                print("   ", ln.strip()[:230])
    print("pageerrors", errs); b.close()
sys.exit(bool(errs))
