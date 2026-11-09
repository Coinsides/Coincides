#!/usr/bin/env bash
# A-20b acceptance (order 2026-11-09-a20b-safety-belt-coverage-order.md, 验收), after the same-source check (same-source-a20b.sh);
# one job after another, each in a slot. A-20b: front 5612 -> backend 3612 (fresh library a20acc/data-a20b), accounts cred-3612
# (chain, a20m, a20n) / cred-3612r (pairs). Ports 9667-9675 (the r3e round used 9647-9657).
#   1. the r3 chain on A-20b (run-a20b-chain.sh, self-wraps; step 13 = a20m BACKIN + LIST) -> diff-chain-a20b.sh vs the r3e chain
#   2. a20m LANDOTHER on A-20b, REPS=2 ("a20m 全部")
#   3. a20n on A-20b, TRACE=1, REPS=2, all arms incl. the new ones (MULTIPASTE-close, LISTPASTE-close, SHIFTENTER-close, SURROGATE-paste-close, ADDR-noncanon bare /
#      bareslash / bareaddr), then heldback / heldhead / heldhead-undo x1 more
#   4. the new arms on pre (5601 -> 3601) and on r3e (5611 -> 3611), REPS=2 each ("MULTIPASTE-close 修前 / r3e / A-20b")
#   5. the 9 regression pairs pre vs A-20b (../a20reg/run-reg-a20b-impl.sh; each pair takes a slot, 2 browsers)
#   6. pair 10, UNDOPAUSE x20 pre vs x20 A-20b interleaved (run-undopause-pair-a20b-impl.sh, self-wraps; tally PRESIDE=preb SIDE=belt)
# Pause between steps: touch a20/a20b.pause. Usage: run-a20b-seq.sh [<from step>]
cd "<scratch>/a20"
FROM=${1:-1}
A=<a20acc>
NEW=MULTIPASTE-close,LISTPASTE-close,SHIFTENTER-close,SHIFTENTER-typed-close,SHIFTENTER-idle,SURROGATE-paste-close,WINDOWENTER-land,ADDR-noncanon-bare
gate() { while [ -f a20b.pause ]; do sleep 15; done; }
if [ "$FROM" -le 1 ]; then gate; echo "step 1 chain start $(date +%T)"; bash run-a20b-chain.sh > run-a20b-chain.log 2>&1; echo "step 1 chain exit $? $(date +%T)"; fi
if [ "$FROM" -le 2 ]; then gate; echo "step 2 a20m LANDOTHER start $(date +%T)"
  bash withslot.sh "A-20b" "a20m LANDOTHER on A-20b (5612 -> 3612); one browser" 20 bash -c "
    export PRESET=a4_portrait CDPPORT=9668 REPS=2 ONLY=LANDOTHER CREDROOT=$A/cred-3612
    timeout 1800 node a20m_probe.mjs belt-m-landother http://127.0.0.1:5612 http://127.0.0.1:3612/api local > runs-belt-m-landother.log 2>&1; echo \"belt landother exit \$?\""
  echo "step 2 done $(date +%T)"; fi
if [ "$FROM" -le 3 ]; then gate; echo "step 3 a20n A-20b start $(date +%T)"
  bash withslot.sh "A-20b" "a20n on A-20b (5612 -> 3612), TRACE=1, all arms + new; one browser" 70 bash -c "
    export PRESET=a4_portrait CDPPORT=9669 CREDROOT=$A/cred-3612 TRACE=1
    REPS=2 timeout 6600 node a20n_probe.mjs belt-n http://127.0.0.1:5612 http://127.0.0.1:3612/api local > runs-belt-n.log 2>&1; echo \"belt-n exit \$?\"
    REPS=1 ONLY=BACKIN-heldback,BACKIN-fail-heldhead,BACKIN-heldhead-undo timeout 1800 node a20n_probe.mjs belt-n-third http://127.0.0.1:5612 http://127.0.0.1:3612/api local > runs-belt-n-third.log 2>&1; echo \"belt-n-third exit \$?\""
  echo "step 3 done $(date +%T)"; fi
if [ "$FROM" -le 4 ]; then gate; echo "step 4 new arms on pre and r3e start $(date +%T)"
  bash withslot.sh "A-20b" "new A-20b arms on pre (5601) then r3e (5611), REPS=2; one browser at a time" 40 bash -c "
    export PRESET=a4_portrait CDPPORT=9670 REPS=2 ONLY=$NEW
    ALLOWEXTRA=1 CREDROOT=$A/cred-3601 timeout 2400 node a20n_probe.mjs preb-n-new http://127.0.0.1:5601 http://127.0.0.1:3601/api local > runs-preb-n-new.log 2>&1; echo \"preb-n-new exit \$?\"
    CREDROOT=$A/cred-3611 timeout 2400 node a20n_probe.mjs r3e-n-new http://127.0.0.1:5611 http://127.0.0.1:3611/api local > runs-r3e-n-new.log 2>&1; echo \"r3e-n-new exit \$?\""
  echo "step 4 done $(date +%T)"; fi
if [ "$FROM" -le 5 ] && [ "${UPTO:-6}" -ge 5 ]; then gate; echo "step 5 pairs start $(date +%T)"; bash ../a20reg/run-reg-a20b-impl.sh > ../a20reg/run-reg-a20b.log 2>&1; echo "step 5 pairs exit $? $(date +%T)"; fi
if [ "$FROM" -le 6 ] && [ "${UPTO:-6}" -ge 6 ]; then gate; echo "step 6 pair 10 start $(date +%T)"; bash run-undopause-pair-a20b-impl.sh > run-undopause-pair-a20b.log 2>&1; echo "step 6 pair 10 exit $? $(date +%T)"; fi
echo "A-20b seq done $(date +%T)"
