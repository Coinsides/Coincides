#!/usr/bin/env bash
# Stage-end void-arm classification (Tester(1) 2026-11-10; Main_Designer ruling 4): the kept-box arms that are not in the
# slot-2 chain - acc11 GEO (6 shapes x 1) and acc12 BAN (x1) - on the local copy of b734197e (5615 -> 3615), one browser,
# 1 round. STEAL / BOXTYPE3 come from se-acc18 and Z from se-acc6 in slot 2. Then count-void over the five arms' runs.
SE=<scratch>/stage-end
R=<scratch>/a20reg
V=<scratch>/verify-editor
A=<acc>
cd $R
bash ../a20/withslot.sh "stage-end" "void-arm check: acc11 GEO x1 per shape, acc12 BAN x1 (one browser)" 20 bash -c "
  export PRESET=a4_portrait CREDROOT=$A/cred-se-arms CDPPORT=9697
  ONLY=GEO- timeout 2400 node acc11_probe.mjs se-geo http://127.0.0.1:5615 http://127.0.0.1:3615/api local > $SE/logs/log-se-geo.txt 2>&1; echo \"se-geo exit \$?\"
  ONLY=BAN- REP12=1 timeout 900 node acc12_probe.mjs se-ban http://127.0.0.1:5615 http://127.0.0.1:3615/api local > $SE/logs/log-se-ban.txt 2>&1; echo \"se-ban exit \$?\""
echo "== void count (GEO, BAN here; STEAL / BOXTYPE3 in se-acc18, Z in se-acc6 when slot 2 has run them)"
node $SE/count-void.mjs $V/runs/se-geo $V/runs/se-ban $V/runs/se-acc18 $V/runs/se-acc6 $V/runs/se-two2
