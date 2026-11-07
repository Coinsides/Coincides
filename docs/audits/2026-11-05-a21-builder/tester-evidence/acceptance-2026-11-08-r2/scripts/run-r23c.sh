#!/usr/bin/env bash
# r2.3c acceptance, Tester(1). Usage: run-r23c.sh [<startStep>]
# Each step takes and releases the heavy-job lock inside one subshell with a trap, and first yields while the pause
# file exists (the builder may claim the lock between steps). Browsers: at most 2 at a time.
#   r23c = 9bc45e69 + the package's 22 src files (edacc/tree-r23c), served on 13154 with /api to the island tunnel.
cd "<session-tmp>/scratchpad/verify-editor"
L=<home>/.claude/ops/heavy-job.lock; P=<home>/.claude/ops/tester-yield.pause
E=<tmp>/edacc; PK=<home>/.claude/ops/packages/editor-rework-r2.3c
START=${1:-1}
lock() { while [ -f "$P" ]; do sleep 15; done; until mkdir "$L" 2>/dev/null; do sleep 20; done
  printf 'session: Tester(1)\ntaken: %s\npurpose: editor rework r2.3c: %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1" > "$L/owner.txt"; }
R22=http://127.0.0.1:13154; ISLAND=http://127.0.0.1:13002/api
pair() { # pair <step> <labelA> <envA> <probeA> [<labelB> <envB> <probeB>]
  [ "$1" -lt "$START" ] && return 0
  ( lock "step $1 browsers: $2 $5"; trap 'rm -rf "$L"' EXIT; export PRESET=a4_portrait
    env $3 node "$4" "$2" $R22 $ISLAND island > "log-$2.txt" 2>&1 & A=$!
    if [ -n "$5" ]; then env $6 node "$7" "$5" $R22 $ISLAND island > "log-$5.txt" 2>&1 & B=$!; fi
    wait $A; echo "step $1 $2 exit $? $(date -u +%T)"; tail -1 "log-$2.txt"
    if [ -n "$5" ]; then wait $B; echo "step $1 $5 exit $? $(date -u +%T)"; tail -1 "log-$5.txt"; fi )
}
if [ "$START" -le 1 ]; then
  ( lock "step 1 vite build of r2.3c for provenance"; trap 'rm -rf "$L"' EXIT
    cd $E/tree-r23c/client && npx vite build --outDir "$E/dist-r23c" --emptyOutDir > "$E/build-r23c.log" 2>&1; echo "build exit $?"
    cd "$E/dist-r23c" && find . -type f | sed 's#^\./##' | sort | while read f; do echo "$(sha256sum "$f" | cut -d' ' -f1) *dist/$f"; done > "$E/dist-r23c.sorted"
    sort -k2 $PK/dist.sha256 > "$E/dist-r23c-pkg.sorted"
    if diff -q "$E/dist-r23c.sorted" "$E/dist-r23c-pkg.sorted" >/dev/null; then echo "DIST_IDENTICAL $(wc -l < $E/dist-r23c.sorted)"; else echo "DIST_DIFFERS"; exit 3; fi ) || { echo "provenance failed, stopping"; exit 1; }
fi
node "<session-tmp>/scratchpad/edacc-serve7.mjs" > log-serve7.txt 2>&1 &
SV=$!; trap 'kill $SV 2>/dev/null' EXIT
sleep 3; echo "serving $(curl -s $R22/ | grep -o 'index-[A-Za-z0-9_-]*\.js')"
# Release blockers first (the new reds and the H-L condition), then the rest.
# r2.3c: controller arms only (structureTypingBuffer.ts byte-identical to r2.3b; GEO, acc14, BAN, BAN-D carry over).
pair 2  r23c-acc18 "" acc18_probe.mjs                     r23c-acc13 "" acc13_probe.mjs
pair 3  r23c-two2 "ONLY=TWO2 TWO2REPS=6" acc11_probe.mjs  r23c-y "REP5=6" acc5_probe.mjs
pair 4  r23c-acc10 "ROLE_SAVE=2" acc10_probe.mjs          r23c-acc11 "ROLE_SAVE=2 ONLY=KU,KRO,EDGE,HL2,HL3" acc11_probe.mjs
pair 5  r23c-acc1 "ONLY=A,B,C,D,E,F,I,G,H" acc_probe.mjs  r23c-acc8x "ONLY=X XROUNDS=10" acc_probe.mjs
pair 6  r23c-K "ROLE_SAVE=2" acc3_probe.mjs               r23c-K45 "ROLE_SAVE=2 END=fail" acc3_probe.mjs
pair 7  r23c-acc6 "" acc6_probe.mjs                       r23c-acc7 "" acc7_probe.mjs
pair 8  r23c-acc4 "" acc4_probe.mjs                       r23c-acc9 "" acc9_probe.mjs
pair 9  r23c-J "REPS=4" acc2_probe.mjs                    r23c-acc15 "REP15=2" acc15_probe.mjs
echo "browser steps done $(date -u +%T)"
