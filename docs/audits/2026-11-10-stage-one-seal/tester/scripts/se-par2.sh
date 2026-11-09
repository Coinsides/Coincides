#!/usr/bin/env bash
# Stage-one seal regression, slot 2 (Tester(1) 2026-11-10). Same local copy of the island build b734197e as slot 1
# (front 5615 -> backend 3615, bind-local). Each step takes a lock slot of its own; resumable: se-par2.sh <from step>.
#   1. server full suite (server/package.json test:v2, 90 files) in tree-se (git archive b734197e), --test-concurrency=3
#   2. client full suite in tree-se/client, vitest forks capped at 3 (known: exit 1 from the TD-74 teardown race)
#   3. single-side regression probes = the 9 pairs + the r2.3c browser chain, merged (two probes per step, 2 browsers,
#      accounts cred-se-pairs / cred-se-r23c, CDP 9691 / 9692); every arm in its own definition, 1 round (order ruling 2)
#   4. pair 10: UNDOPAUSE x20 (10 x 2) single side, judged by the prefix invariant (undopause-tally, stage-end gate)
#   5. old matrices (builder harness b-matrix25b: win/inject, a24, hash/fine) through a loopback proxy to 3615
#      (r04@0 = the matrix arms N,R,V,D,L,K,H, covered by step 3's mx run)
#   6. A-19 representative: image probe (5 fixtures), unreadable files, lineage x1, delete / rebuild residue
SE=<scratch>/stage-end
SCR=<scratch>
W=$SCR/a20/withslot.sh; R=$SCR/a20reg; V=$SCR/verify-editor; A19=$SCR/a19
A=<acc>; T=<acc>/tree-se
K20=<ops>/tester-kit/a20; PKG=<ops>/packages/a25-ime-save-failure/dist/client
F=http://127.0.0.1:5615; API=http://127.0.0.1:3615/api
FROM=${1:-1}; mkdir -p $SE/logs $SE/runs
if [ "$FROM" -le 1 ]; then echo "step 1 server full start $(date +%T)"
  bash $W "stage-end" "server full suite (test:v2, 90 files, concurrency 3) in tree-se" 20 bash -c "cd $T/server && timeout 3000 node ../scripts/run-server-test-suite.mjs --test-concurrency=3 \$(cat $SE/server-v2-files.txt) > $SE/logs/server-full.log 2>&1; echo \"server full exit \$?\""
  grep -E "^# (tests|suites|pass|fail|cancelled|skipped|todo|duration)" $SE/logs/server-full.log | tr '\n' ' '; echo
  echo "step 1 done $(date +%T)"; fi
if [ "$FROM" -le 2 ]; then echo "step 2 client full start $(date +%T)"
  bash $W "stage-end" "client full suite in tree-se (vitest, 3 forks)" 20 bash -c "cd $T/client && timeout 3000 npx vitest run --pool=forks --poolOptions.forks.maxForks=3 > $SE/logs/client-full.log 2>&1; echo \"client full exit \$?\""
  sed 's/\x1b\[[0-9;]*m//g' $SE/logs/client-full.log | grep -E "Test Files|Tests |Errors|ReferenceError" | head -8
  echo "step 2 done $(date +%T)"; fi
two() { # two <step> <labelA> <envA> <probeA> <labelB> <envB> <probeB> : two probes side by side in one slot
  [ "$1" -lt "$STEP3FROM" ] && return 0
  # matrix.mjs takes its arm list as the 5th argument (default K,W,H only): the pair-1 mx arms
  local XA=""; [ "$4" = matrix.mjs ] && XA="K,W,H,N,R,V,D,L,G"
  local XB=""; [ "$7" = matrix.mjs ] && XB="K,W,H,N,R,V,D,L,G"
  bash $W "stage-end" "regression step 3.$1: $2 + $5, 2 browsers" 40 bash -c "
    export PRESET=a4_portrait
    env $3 CREDROOT=$A/cred-se-pairs CDPPORT=9691 timeout 5400 node $4 $2 $F $API local $XA > $SE/logs/log-$2.txt 2>&1 & P1=\$!
    env $6 CREDROOT=$A/cred-se-r23c CDPPORT=9692 timeout 5400 node $7 $5 $F $API local $XB > $SE/logs/log-$5.txt 2>&1 & P2=\$!
    wait \$P1; echo \"$2 exit \$?\"; wait \$P2; echo \"$5 exit \$?\""
  for L in $2 $5; do echo "  $L: $(tail -1 $SE/logs/log-$L.txt | cut -c1-300)"; done
}
STEP3FROM=${STEP3FROM:-1}
if [ "$FROM" -le 3 ]; then echo "step 3 regression probes start $(date +%T)"; cd $R
  two 1 se-mx    "" "matrix.mjs" se-acc18 "" acc18_probe.mjs
  two 2 se-acc13 "" acc13_probe.mjs se-two2 "ONLY=TWO2 TWO2REPS=1" acc11_probe.mjs
  two 3 se-y     "REP5=1" acc5_probe.mjs se-acc10 "ROLE_SAVE=2" acc10_probe.mjs
  two 4 se-acc11 "ROLE_SAVE=2 ONLY=KU,KRO,EDGE,HL2,HL3" acc11_probe.mjs se-acc1 "ONLY=A,B,C,D,E,F,I,G,H" acc_probe.mjs
  two 5 se-acc8x "ONLY=X XROUNDS=10" acc_probe.mjs se-K "ROLE_SAVE=2" acc3_probe.mjs
  two 6 se-K45   "ROLE_SAVE=2 END=fail" acc3_probe.mjs se-acc6 "" acc6_probe.mjs
  two 7 se-acc7  "" acc7_probe.mjs se-acc4 "" acc4_probe.mjs
  two 8 se-acc9  "" acc9_probe.mjs se-J "REPS=1" acc2_probe.mjs
  two 9 se-acc15 "REP15=1" acc15_probe.mjs se-retry "HOLD=70000" acc22_probe.mjs
  echo "step 3 done $(date +%T)"; fi
if [ "$FROM" -le 4 ]; then echo "step 4 pair 10 start $(date +%T)"
  bash $W "stage-end" "pair 10 single side: UNDOPAUSE 10 x 2, one browser" 20 bash -c "
    export PRESET=a4_portrait ONLY=UNDOPAUSE REPS=2 CDPPORT=9695 CREDROOT=$A/cred-se-p10 OUTDIR=$SE
    for r in 01 02 03 04 05 06 07 08 09 10; do timeout 900 node $K20/a20c_probe.mjs up-se-\$r $F $API local > $SE/logs/runs-up-se-\$r.log 2>&1; echo \"round \$r exit \$?\"; done"
  (cd $SE && PRESIDE=se SIDE=se node $K20/undopause-tally.mjs > $SE/pair10-tally.txt 2>&1); grep -E "rows|gate|record|INVARIANT RED" $SE/pair10-tally.txt
  echo "step 4 done $(date +%T)"; fi
if [ "$FROM" -le 5 ]; then echo "step 5 old matrices start $(date +%T)"; cd $V
  for m in "win|^(win|ctl|inject_)|2" "a24|^(midHash|a24)|2" "hash|^(hash|fine)|3"; do
    IFS='|' read -r name rx reps <<< "$m"
    bash $W "stage-end" "old matrix $name (builder harness, loopback proxy to 3615), one browser" 40 bash -c "
      UPSTREAM=3615 node b-proxy-se.mjs $PKG 13171 0 > $SE/logs/proxy-$name.log 2>&1 & PX=\$!; sleep 3
      echo \"start $name bundle \$(curl -s http://127.0.0.1:13171/ | grep -o 'assets/index-[A-Za-z0-9_-]*\.js')\"
      timeout 3600 node b-matrix25b.mjs http://127.0.0.1:13171 $SE/old-$name.json $reps 57 '$rx' 3615 > $SE/logs/old-$name.log 2>&1; echo \"$name exit \$?\"
      kill \$PX 2>/dev/null"
    tail -1 $SE/logs/old-$name.log | cut -c1-400
  done
  echo "step 5 done $(date +%T)"; fi
if [ "$FROM" -le 6 ]; then echo "step 6 A-19 representative start $(date +%T)"; cd $A19
  bash $W "stage-end" "A-19 representative (images, unreadable, lineage x1, residue), one browser" 30 bash -c "
    export PRESET=a4_portrait
    timeout 1800 node a19-probe.mjs se-a19 $F 3615 png-land-800x600.png,jpeg-exif6-1600x900.jpg,webp-vp8x-alpha-1000x700.webp,png-tall-1200x4000.png,png-ultrawide-16000x300.png > $SE/logs/a19-img.log 2>&1; echo \"a19 images exit \$?\"
    timeout 900 node unread-probe.mjs se-a19u $F 3615 9635 > $SE/logs/a19-unread.log 2>&1; echo \"a19 unread exit \$?\"
    timeout 1200 node lineage-probe.mjs se-a19l $F 3615 1 > $SE/logs/a19-lineage.log 2>&1; echo \"a19 lineage exit \$?\"
    timeout 900 node residue-probe.mjs se-a19r 3615 $A/data-se > $SE/logs/a19-residue.log 2>&1; echo \"a19 residue exit \$?\""
  for f in a19-img a19-unread a19-lineage a19-residue; do echo "  $f: $(tail -2 $SE/logs/$f.log | tr '\n' ' ' | cut -c1-300)"; done
  echo "step 6 done $(date +%T)"; fi
echo "slot-2 sequence done $(date +%T)"
