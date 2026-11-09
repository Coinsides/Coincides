#!/usr/bin/env bash
# Stage-one seal, island part (Tester(1) 2026-11-10; Main_Designer rulings 7 and the TD-82/83 follow-up):
#   1. seal-state check: the island's served files (fetched through the tunnel 127.0.0.1:13002) vs the b734197e same-source
#      rebuild's 63-file list (stage-end/se-build.sha256); stop if the main JS is not index-4nEsyJNA.js
#   2. island health: /api/health + one login of MY test account + one write + one read (island-health.mjs)
#   3. TD-82 / TD-83 on the island: acc10 HL-saveNotSentThenClose x3 and acc13 N-b2-headingAboveLineSameWord x2 on my
#      island test account (holds only inside the test browser; the island sees ordinary requests or none), one browser.
# Reading (Main_Designer): island red -> not environment, red on the current build; island green -> "reproduces only with a
# fast local backend; the window is in the code, latency only moves it" (green != impossible on the island).
SE=<scratch>/stage-end
V=<scratch>/verify-editor
R=<scratch>/a20reg
O=http://127.0.0.1:13002; API=$O/api
echo "== 1. seal-state check $(date +%T)"
bash $V/island-hash.sh seal-b734 $SE/se-build.sha256
MAIN=$(curl -s --max-time 15 $O/ | grep -o 'assets/index-[A-Za-z0-9_-]*\.js' | head -1)
if [ "$MAIN" != "assets/index-4nEsyJNA.js" ]; then echo "ISLAND MAIN IS $MAIN, NOT b734197e - stopping"; exit 3; fi
echo "== 2. island health $(date +%T)"
node $SE/island-health.mjs; echo "health exit $?"
echo "== 3. TD-82 / TD-83 on the island $(date +%T)"
cd $R
bash ../a20/withslot.sh "stage-end" "TD-82/83 on the island test account: acc10 HL x3, acc13 N-b2 x2 (one browser)" 20 bash -c "
  export PRESET=a4_portrait CDPPORT=9698
  ONLY=HL ROLE_SAVE=2 timeout 1500 node acc10_probe.mjs isl-hl $O $API island > $SE/logs/log-isl-hl.txt 2>&1; echo \"isl-hl exit \$?\"
  ONLY=N-b2 timeout 1500 node acc13_probe.mjs isl-nb2 $O $API island > $SE/logs/log-isl-nb2.txt 2>&1; echo \"isl-nb2 exit \$?\""
node $SE/count-void.mjs $V/runs/isl-hl $V/runs/isl-nb2
for L in isl-hl isl-nb2; do echo "  $L: $(grep -c '^BAD' $SE/logs/log-$L.txt) BAD; $(tail -1 $SE/logs/log-$L.txt | cut -c1-200)"; done
echo "island part done $(date +%T)"
