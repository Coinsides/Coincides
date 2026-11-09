#!/usr/bin/env bash
# Void-arm classification, (b) setup-fix attempt (Main_Designer ruling 4; <= 30 min): local copy of b734197e (5615 ->
# 3615), one browser, one slot. GEO noEnter / enter / narrow* and acc18 STEAL / BOXTYPE2 / BOXTYPE3 with a 9 s pending
# structure (KEPT_DELAY=9000; the recipe that still produced a box for GEO-long); BAN with a full-page leave while the
# first save is held (BAN_NAV=1). Then count-void over the new runs.
SE=<scratch>/stage-end
R=<scratch>/a20reg
V=<scratch>/verify-editor
A=<acc>
cd $R
bash ../a20/withslot.sh "stage-end" "void-arm setup fix: GEO / STEAL / BOXTYPE2-3 with a 9 s pending, BAN with a page leave (one browser)" 30 bash -c "
  export PRESET=a4_portrait CREDROOT=$A/cred-se-arms CDPPORT=9685
  ONLY=GEO-noEnter,GEO-enter,GEO-narrow KEPT_DELAY=9000 timeout 1800 node acc11v_probe.mjs se-geo9 http://127.0.0.1:5615 http://127.0.0.1:3615/api local > $SE/logs/log-se-geo9.txt 2>&1; echo \"se-geo9 exit \$?\"
  ONLY=STEAL-,BOXTYPE2-,BOXTYPE3- KEPT_DELAY=9000 timeout 1500 node acc18v_probe.mjs se-acc18v http://127.0.0.1:5615 http://127.0.0.1:3615/api local > $SE/logs/log-se-acc18v.txt 2>&1; echo \"se-acc18v exit \$?\"
  ONLY=BAN- REP12=1 BAN_NAV=1 timeout 600 node acc12v_probe.mjs se-banv http://127.0.0.1:5615 http://127.0.0.1:3615/api local > $SE/logs/log-se-banv.txt 2>&1; echo \"se-banv exit \$?\""
node $SE/count-void.mjs $V/runs/se-geo9 $V/runs/se-acc18v $V/runs/se-banv
