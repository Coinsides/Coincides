#!/usr/bin/env bash
# After the 21st deploy (editor rework r2.3c): Tester(1) checks the island itself.
#   0. island-hash: the island's 63 dist files vs the r2.3c package (expect 63/63, main index-BVrO4Ql1.js). No lock (GETs).
#   1-4. representative arms of Henry's three blocking classes and the eight kept items, run against the island's own
#        frontend (origin 127.0.0.1:13002 = the tunnel), my test account only, faults injected in my browser only.
# Each browser step takes and releases the heavy-job lock in one subshell with a trap; yields while the pause file exists.
# Usage: run-post21.sh [<startStep>]
cd "<session-tmp>/scratchpad/verify-editor"
L=<home>/.claude/ops/heavy-job.lock; P=<home>/.claude/ops/tester-yield.pause
START=${1:-0}
O=http://127.0.0.1:13002; ISLAND=http://127.0.0.1:13002/api
lock() { while [ -f "$P" ]; do sleep 15; done; until mkdir "$L" 2>/dev/null; do sleep 20; done
  printf 'session: Tester(1)\ntaken: %s\npurpose: post-deploy check of the 21st deploy (editor r2.3c): %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1" > "$L/owner.txt"; }
pair() { # pair <step> <labelA> <envA> <probeA> [<labelB> <envB> <probeB>]
  [ "$1" -lt "$START" ] && return 0
  ( lock "step $1 browsers: $2 $5"; trap 'rm -rf "$L"' EXIT; export PRESET=a4_portrait
    env $3 node "$4" "$2" $O $ISLAND island > "log-$2.txt" 2>&1 & A=$!
    if [ -n "$5" ]; then env $6 node "$7" "$5" $O $ISLAND island > "log-$5.txt" 2>&1 & B=$!; fi
    wait $A; echo "step $1 $2 exit $? $(date -u +%T)"; tail -1 "log-$2.txt"
    if [ -n "$5" ]; then wait $B; echo "step $1 $5 exit $? $(date -u +%T)"; tail -1 "log-$5.txt"; fi )
}
if [ "$START" -le 0 ]; then
  bash island-hash.sh post21
  MAIN=$(curl -s --max-time 15 $O/ | grep -o 'assets/index-[A-Za-z0-9_-]*\.js' | head -1)
  if [ "$MAIN" != "assets/index-BVrO4Ql1.js" ]; then echo "ISLAND MAIN IS $MAIN, NOT THE ACCEPTED BUILD - stopping before any browser step"; exit 3; fi
fi
pair 1  post21-acc10 "ONLY=HL,TWO ROLE_SAVE=2" acc10_probe.mjs   post21-y "ONLY=Y0,Y1 REP5=3" acc5_probe.mjs
pair 2  post21-two2 "ONLY=TWO2 TWO2REPS=3" acc11_probe.mjs      post21-acc18 "ONLY=STEAL2,LEGACY,COPYPASTE" acc18_probe.mjs
pair 3  post21-acc13 "" acc13_probe.mjs                          post21-acc1 "ONLY=A1,H-unload,G-draftUndo" acc_probe.mjs
pair 4  post21-J "REPS=2" acc2_probe.mjs                        post21-retry "HOLD=70000" acc22_probe.mjs
echo "post-deploy check done $(date -u +%T)"
