#!/usr/bin/env bash
# TD-85 revision readings (the first try read the response body from the wrong field): APPLYTYPE-applyfirst x1 on the
# build (5615 -> 3615) and x1 on the A-20b r2 base (5612 -> 3612), one browser, one slot.
SE=<scratch>/stage-end
K=<ops>/tester-kit/a25; A=<acc>
bash <scratch>/a20/withslot.sh "stage-end" "TD-85 revision readings: APPLYTYPE-applyfirst x1 build + x1 base (one browser)" 10 bash -c "
  export PRESET=a4_portrait OUTDIR=$SE CDPPORT=9686 ONLY=APPLYTYPE-applyfirst REPS_AT=1
  CREDROOT=$A/cred-se-k25 timeout 600 node $K/a25d2_probe.mjs se-kd-atrev http://127.0.0.1:5615 http://127.0.0.1:3615/api local > $SE/logs/run-se-kd-atrev.log 2>&1; echo \"se-kd-atrev exit \$?\"
  CREDROOT=$A/cred-3612k timeout 600 node $K/a25d2_probe.mjs base-kd-atrev http://127.0.0.1:5612 http://127.0.0.1:3612/api local > $SE/logs/run-base-kd-atrev.log 2>&1; echo \"base-kd-atrev exit \$?\""
