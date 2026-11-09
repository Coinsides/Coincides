#!/usr/bin/env bash
# Main_Designer rulings 2026-11-10 on the new-arm reds (one browser, one slot, local copy of b734197e 5615 -> 3615):
#   ① TD-85: APPLYTYPE x2 more rounds on b734197e (both release orders, REPS_AT=2), with the new readings (editor samples
#      after Apply's release; the typing save's base revision vs Apply's response revision);
#   ② C-convert: toast out of the gate (now a reading); rerun once with the conversion held + the screen recorded
#      (se-kd-cscreen), once not held (se-kd-cnohold).
# Also the A-20b r2 base APPLYTYPE x2 (5612 -> 3612) with the same readings, to give the base its count beside the build
# (the queued base-newarms run has the old probe: 1 round per order, no new readings).
# Probe: a25d2_probe.mjs = a25_head + a25d_body.next (a25d_probe.mjs is left as it is while the queued base run uses it).
SE=<scratch>/stage-end
K=<ops>/tester-kit/a25
A=<acc>
bash <scratch>/a20/withslot.sh "stage-end" "TD-85 APPLYTYPE x2 build + base, C-convert rerun held+screen / not held (one browser)" 30 bash -c "
  export PRESET=a4_portrait OUTDIR=$SE CDPPORT=9688
  ONLY=APPLYTYPE- REPS_AT=2 CREDROOT=$A/cred-se-k25 timeout 1500 node $K/a25d2_probe.mjs se-kd-at2 http://127.0.0.1:5615 http://127.0.0.1:3615/api local > $SE/logs/run-se-kd-at2.log 2>&1; echo \"se-kd-at2 exit \$?\"
  ONLY=C- CHOLD=1 CREDROOT=$A/cred-se-k25 timeout 900 node $K/a25d2_probe.mjs se-kd-cscreen http://127.0.0.1:5615 http://127.0.0.1:3615/api local > $SE/logs/run-se-kd-cscreen.log 2>&1; echo \"se-kd-cscreen exit \$?\"
  ONLY=C- CHOLD=0 CREDROOT=$A/cred-se-k25 timeout 900 node $K/a25d2_probe.mjs se-kd-cnohold http://127.0.0.1:5615 http://127.0.0.1:3615/api local > $SE/logs/run-se-kd-cnohold.log 2>&1; echo \"se-kd-cnohold exit \$?\"
  ONLY=APPLYTYPE- REPS_AT=2 CREDROOT=$A/cred-3612k timeout 1500 node $K/a25d2_probe.mjs base-kd-at2 http://127.0.0.1:5612 http://127.0.0.1:3612/api local > $SE/logs/run-base-kd-at2.log 2>&1; echo \"base-kd-at2 exit \$?\""
for L in se-kd-at2 se-kd-cscreen se-kd-cnohold base-kd-at2; do echo "== $L: $(tail -1 $SE/logs/run-$L.log | cut -c1-200)"; done
