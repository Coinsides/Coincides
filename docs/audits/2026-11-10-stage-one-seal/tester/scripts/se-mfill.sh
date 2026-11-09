#!/usr/bin/env bash
# Fill for the se-m setup error (BACKIN-fail-fast-1: "no empty line ['rmup','wa']", the setup's cursor jump, TD-77 family):
# a20m BACKIN-fail-fast x2 (REPSRACE=2) on the local copy of b734197e, one browser, one slot.
SE=<scratch>/stage-end
A=<acc>; K20=<ops>/tester-kit/a20
bash <scratch>/a20/withslot.sh "stage-end" "chain se-m-fill (BACKIN-fail-fast x2, one browser)" 15 bash -c "
  export CREDROOT=$A/cred-se-chain OUTDIR=$SE PRESET=a4_portrait CDPPORT=9690 REPS=1 REPSRACE=2 ONLY=BACKIN-fail-fast
  timeout 1500 node $K20/a20m_probe_gate.mjs se-m-fill http://127.0.0.1:5615 http://127.0.0.1:3615/api local > $SE/logs/runs-se-m-fill.log 2>&1; echo \"se-m-fill exit \$?\""
node $K20/analyze-a20.mjs $SE/runs/se-m-fill 2>&1 | grep -E "BACKIN|setup|TOTAL|total" | cut -c1-300
