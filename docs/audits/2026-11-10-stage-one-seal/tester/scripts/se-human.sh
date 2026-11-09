#!/usr/bin/env bash
# TD-82 / TD-83 at human typing speed (Main_Designer ruling 2026-11-10 after the first island batch): one slot, one
# browser. First on the local copy of b734197e (setup check + the local reading at the same pace), then on the island
# test account through the tunnel (holds only inside the test browser). A row counts only when a unit-transfer 200 lands
# between the first and last key of the typed word; otherwise it is void (not green).
SE=<scratch>/stage-end
R=<scratch>/a20reg
A=<acc>
cd $R
bash ../a20/withslot.sh "stage-end" "TD-82/83 at human speed: local copy, then the island test account (one browser)" 30 bash -c "
  export PRESET=a4_portrait CDPPORT=9687 MAXTRY=6
  CREDROOT=$A/cred-se-pairs timeout 1500 node hum_probe.mjs se-hum http://127.0.0.1:5615 http://127.0.0.1:3615/api local > $SE/logs/log-se-hum.txt 2>&1; echo \"se-hum exit \$?\"
  node -e \"const fs=require('fs');const f='<scratch>/verify-editor/runs/se-hum/rows.jsonl';const rows=fs.existsSync(f)?fs.readFileSync(f,'utf8').split(String.fromCharCode(10)).filter(Boolean).map(JSON.parse):[];const okRows=rows.filter(r=>!r.error);console.log('local rows',rows.length,'without setup error',okRows.length);process.exit(okRows.length?0:1)\" || { echo 'local setup check failed: island step skipped'; exit 0; }
  CREDROOT=$A/cred-se-pairs timeout 1800 node hum_probe.mjs isl-hum http://127.0.0.1:13002 http://127.0.0.1:13002/api island > $SE/logs/log-isl-hum.txt 2>&1; echo \"isl-hum exit \$?\""
for L in se-hum isl-hum; do echo "== $L"; grep -E "counted|^DONE" $SE/logs/log-$L.txt; done
