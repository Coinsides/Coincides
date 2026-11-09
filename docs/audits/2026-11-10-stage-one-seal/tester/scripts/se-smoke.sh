#!/usr/bin/env bash
# Stage-one seal: the "save once from the UI" smokes (Main_Designer ruling 1), 1 round, on the local copy of b734197e
# (5615 -> 3615, account cred-se-smoke), one browser, one slot. Rows in stage-end/runs/se-smoke.
SE=<scratch>/stage-end
K=<ops>/tester-kit/a25
A=<acc>
LBL=${1:-se-smoke}
cd $K
bash <scratch>/a20/withslot.sh "stage-end" "UI-save smokes ($LBL), one browser" 20 bash -c "
  export PRESET=a4_portrait CREDROOT=$A/cred-se-smoke OUTDIR=$SE CDPPORT=9683 ${ONLY:+ONLY=$ONLY}
  timeout 1800 node smoke_probe.mjs $LBL http://127.0.0.1:5615 http://127.0.0.1:3615/api local > $SE/logs/log-$LBL.txt 2>&1; echo \"$LBL exit \$?\""
echo "== $LBL summary"; node -e "
const s=require('$SE/runs/$LBL/summary.json'.replace(/^\/c\//,'C:/'));console.log(JSON.stringify(s,null,1).slice(0,3000))" 2>&1
tail -5 $SE/logs/log-$LBL.txt | cut -c1-300
