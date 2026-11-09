#!/usr/bin/env bash
# Tester(1) 11-09, A-25 chain follow-up (fill the rows the chain could not set up), ONE lock slot:
#   1. the four toast-gated a20m arms with the dual setup gate (a20m_probe_gate.mjs: failure toast OR the A-25 mark),
#      base A-20b r2 (5612 -> 3612, cred-3612, port 9690) and A-25 (5614 -> 3614, cred-3614, port 9698) side by side,
#      REPS=2 (idlefirst x5 as in the chain): labels gate-bp / gate-a25;
#   2. setup-contaminated rows on A-25 (prep caret jump, TD-77 family), one browser: K1-paste500 x2 (a20e_probe.mjs,
#      label a25-k-fill) and LANDOTHER-plain x2 (a20m_probe.mjs, label a25-m-landother-fill).
cd "<scratch>/a20"
A=<a20acc>
bash withslot.sh "A-25" "fill: 4 toast-gated a20m arms with the dual gate (base + A-25, 2 browsers), then K1-paste500 x2 and LANDOTHER-plain x2 on A-25" 30 bash -c "
export PRESET=a4_portrait
ONLY=BACKIN-fail-sealed,BACKIN-fail-refail,BACKIN-fail-idlefirst,BACKIN-ctlfail REPS=2 CREDROOT=$A/cred-3612 CDPPORT=9690 timeout 2400 node a20m_probe_gate.mjs gate-bp http://127.0.0.1:5612 http://127.0.0.1:3612/api local > runs-gate-bp.log 2>&1 & P1=\$!
ONLY=BACKIN-fail-sealed,BACKIN-fail-refail,BACKIN-fail-idlefirst,BACKIN-ctlfail REPS=2 CREDROOT=$A/cred-3614 CDPPORT=9698 timeout 2400 node a20m_probe_gate.mjs gate-a25 http://127.0.0.1:5614 http://127.0.0.1:3614/api local > runs-gate-a25.log 2>&1 & P2=\$!
wait \$P1; echo \"gate base exit \$?\"; wait \$P2; echo \"gate A-25 exit \$?\"
ONLY=K1-paste500 REPS=2 CREDROOT=$A/cred-3614 CDPPORT=9698 timeout 900 node a20e_probe.mjs a25-k-fill http://127.0.0.1:5614 http://127.0.0.1:3614/api local > runs-a25-k-fill.log 2>&1; echo \"k fill exit \$?\"
ONLY=LANDOTHER-plain REPS=2 CREDROOT=$A/cred-3614 CDPPORT=9698 timeout 900 node a20m_probe.mjs a25-m-landother-fill http://127.0.0.1:5614 http://127.0.0.1:3614/api local > runs-a25-m-landother-fill.log 2>&1; echo \"landother fill exit \$?\""
for L in gate-bp gate-a25 a25-k-fill a25-m-landother-fill; do echo "== $L"; node analyze-a20.mjs runs/$L 2>&1 | cut -c1-400; done
node -e "
const fs=require('fs');for(const L of ['gate-bp','gate-a25']){for(const l of fs.readFileSync('runs/'+L+'/rows.jsonl','utf8').split('\n').filter(Boolean)){const r=JSON.parse(l);console.log(L, r.name, r.ok?'ok':'RED', 'gate', r.setupGate, r.error?('ERROR '+r.error.slice(0,80)):'')}}"
