#!/usr/bin/env bash
# A-20 r3e formal acceptance (Main_Designer 11-09 "r3e 封讫" order), after the same-source check; one job after another, each in a slot.
#   1. the r3 chain on r3e (run-r3e-chain.sh, self-wraps; its step 13 = a20m BACKIN + LIST)   -> diff the per-arm notes against r3
#   2. a20m LANDOTHER on r3e, REPS=2 ("a20m 全部"; pre baseline = runs/pre-m-landother3)
#   3. a20n on r3e, TRACE=1, REPS=2 (all arms incl. HEADCLOSE readings, HEADCLOSE-putback x1, N6B x1), then
#      heldback / heldhead / heldhead-undo x1 more (3 each)
#   4. a20n on pre (5601 -> 3601), TRACE=1, REPS=2, all arms ("a20n 修前 / r3e")
#   5. the 9 regression pairs pre vs r3e (../a20reg/run-reg-r3e.sh; each pair takes a slot)
#   6. pair 10, UNDOPAUSE x20 pre vs x20 r3e interleaved (run-undopause-pair-r3e.sh, self-wraps; tally SIDE=r3e)
# r3e: front 5611 -> backend 3611 (fresh library a20acc/data-r3e), accounts cred-3611 (chain, a20m, a20n) / cred-3611r (pairs).
# Pause between steps: touch a20/r3e.pause. Usage: run-r3e-seq.sh [<from step>]
cd "<scratch>/a20"
FROM=${1:-1}
A=<a20acc>
gate() { while [ -f r3e.pause ]; do sleep 15; done; }
if [ "$FROM" -le 1 ]; then gate; echo "step 1 chain start $(date +%T)"; bash run-r3e-chain.sh > run-r3e-chain.log 2>&1; echo "step 1 chain exit $? $(date +%T)"; fi
if [ "$FROM" -le 2 ]; then gate; echo "step 2 a20m LANDOTHER start $(date +%T)"
  bash withslot.sh "A-20 r3e" "a20m LANDOTHER on r3e (5611 -> 3611); one browser" 20 bash -c "
    export PRESET=a4_portrait CDPPORT=9647 REPS=2 ONLY=LANDOTHER CREDROOT=$A/cred-3611
    timeout 1800 node a20m_probe.mjs r3e-m-landother http://127.0.0.1:5611 http://127.0.0.1:3611/api local > runs-r3e-m-landother.log 2>&1; echo \"r3e landother exit \$?\""
  echo "step 2 done $(date +%T)"; fi
if [ "$FROM" -le 3 ]; then gate; echo "step 3 a20n r3e start $(date +%T)"
  bash withslot.sh "A-20 r3e" "a20n on r3e (5611 -> 3611), TRACE=1, all arms; one browser" 60 bash -c "
    export PRESET=a4_portrait CDPPORT=9657 CREDROOT=$A/cred-3611 TRACE=1
    REPS=2 timeout 5400 node a20n_probe.mjs r3e-n http://127.0.0.1:5611 http://127.0.0.1:3611/api local > runs-r3e-n.log 2>&1; echo \"r3e-n exit \$?\"
    REPS=1 ONLY=BACKIN-heldback,BACKIN-fail-heldhead,BACKIN-heldhead-undo timeout 1800 node a20n_probe.mjs r3e-n-third http://127.0.0.1:5611 http://127.0.0.1:3611/api local > runs-r3e-n-third.log 2>&1; echo \"r3e-n-third exit \$?\""
  echo "step 3 done $(date +%T)"; fi
if [ "$FROM" -le 4 ] && ! grep -q '^DONE pre3e-n' runs-pre3e-n.log 2>/dev/null; then gate; echo "step 4 a20n pre start $(date +%T)"
  bash withslot.sh "A-20 r3e" "a20n on pre (5601 -> 3601), TRACE=1, all arms; one browser" 60 bash -c "
    export PRESET=a4_portrait CDPPORT=9656 CREDROOT=$A/cred-3601 TRACE=1
    REPS=2 timeout 5400 node a20n_probe.mjs pre3e-n http://127.0.0.1:5601 http://127.0.0.1:3601/api local > runs-pre3e-n.log 2>&1; echo \"pre3e-n exit \$?\""
  echo "step 4 done $(date +%T)"; fi
if [ "$FROM" -le 5 ]; then gate; echo "step 5 pairs start $(date +%T)"; bash ../a20reg/run-reg-r3e.sh > ../a20reg/run-reg-r3e.log 2>&1; echo "step 5 pairs exit $? $(date +%T)"; fi
if [ "$FROM" -le 6 ]; then gate; echo "step 6 pair 10 start $(date +%T)"; bash run-undopause-pair-r3e.sh > run-undopause-pair-r3e.log 2>&1; echo "step 6 pair 10 exit $? $(date +%T)"; fi
echo "r3e seq done $(date +%T)"
