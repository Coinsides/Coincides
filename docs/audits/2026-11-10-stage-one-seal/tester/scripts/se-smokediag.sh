#!/usr/bin/env bash
# Smoke diagnostics (SM-tag / SM-image / SM-binding setup), local copy of b734197e, one browser, one slot.
SE=<scratch>/stage-end
K=<ops>/tester-kit/a25; A=<acc>
cd $K
bash <scratch>/a20/withslot.sh "stage-end" "smoke diagnostics (tag / image / binding), one browser" 10 bash -c "
  export PRESET=a4_portrait CREDROOT=$A/cred-se-smoke OUTDIR=$SE CDPPORT=9684 ONLY=none
  timeout 600 node smoke_diag_probe.mjs se-smokediag http://127.0.0.1:5615 http://127.0.0.1:3615/api local > $SE/logs/log-se-smokediag.txt 2>&1; echo \"smokediag exit \$?\""
