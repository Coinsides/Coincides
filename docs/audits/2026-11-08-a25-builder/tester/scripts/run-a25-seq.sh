#!/usr/bin/env bash
# A-25 acceptance (Tester 11-09 prep; dispatch details from Main_Designer when the package is sealed). Runs after the
# same-source check and run-a25-env.sh (backend 3614 + front 5614 + accounts). One job after another, each in a lock slot;
# the regression pairs run beside it in the other slot (run-par-a25.sh). A-25 = 5614 -> 3614; the base (= live, A-20b r2)
# = 5612 -> 3612. Ports 9690-9699. Pause between steps: touch a20/a25.pause. Usage: run-a25-seq.sh [<from step>]
#   1. k25 canonical (ops tester-kit/a25, all groups: IME 2x24, SAVEFAIL 8, LANDFAIL 8 + other 3, CHAIN, H1, H2) on A-25
#   2. D exits (a25d_probe, REPS_D=2) on A-25
#   3. the r3 chain 190 on A-25 (run-a25-chain.sh, self-wraps; step 13 = a20m BACKIN + LIST) -> diff-chain-a25.sh vs A-20b r2
#   4. a20m LANDOTHER on A-25, REPS=2
#   5. a20n on A-25, TRACE=1, REPS=2, all arms (incl. the A-20b ones), then heldback / heldhead / heldhead-undo x1 more
#   6. the base column: k25 canonical and D exits (REPS_D=2) on the base (A-20b r2)
cd "<scratch>/a20"
FROM=${1:-1}
A=<a20acc>
S=<scratch>
K=<ops>/tester-kit/a25
gate() { while [ -f a25.pause ]; do sleep 15; done; }
k25() { # k25 <label> <front> <api> <cred> : the canonical kit, every group
  bash withslot.sh "A-25" "k25 canonical ($1), one browser" 45 bash -c "
    export CREDROOT=$A/$4 OUTDIR=$S/a25k PRESET=a4_portrait CDPPORT=9693 REPS=2 REPS_IME=24 REPS_OTHER=1
    timeout 3600 node $K/a25_probe.mjs $1 $2 $3 local > $S/a25k/run-$1.log 2>&1; echo \"$1 exit \$?\"
    node $K/analyze-a25.mjs $S/a25k/runs/$1 > $S/a25k/an-$1.txt 2>&1"
}
kd() { # kd <label> <front> <api> <cred> : the D exits
  bash withslot.sh "A-25" "D exits ($1), one browser" 15 bash -c "
    export CREDROOT=$A/$4 OUTDIR=$S/a25k PRESET=a4_portrait CDPPORT=9694 REPS_D=2
    timeout 1500 node $K/a25d_probe.mjs $1 $2 $3 local > $S/a25k/run-$1.log 2>&1; echo \"$1 exit \$?\""
}
if [ "$FROM" -le 1 ]; then gate; echo "step 1 k25 A-25 start $(date +%T)"; k25 k25-a25 http://127.0.0.1:5614 http://127.0.0.1:3614/api cred-3614k; echo "step 1 done $(date +%T)"; fi
if [ "$FROM" -le 2 ]; then gate; echo "step 2 D A-25 start $(date +%T)"; kd kd-a25 http://127.0.0.1:5614 http://127.0.0.1:3614/api cred-3614k; echo "step 2 done $(date +%T)"; fi
if [ "$FROM" -le 3 ]; then gate; echo "step 3 chain start $(date +%T)"; bash run-a25-chain.sh > run-a25-chain.log 2>&1; echo "step 3 chain exit $? $(date +%T)"; bash diff-chain-a25.sh > diff-chain-a25.out 2>&1; fi
if [ "$FROM" -le 4 ]; then gate; echo "step 4 a20m LANDOTHER start $(date +%T)"
  bash withslot.sh "A-25" "a20m LANDOTHER on A-25 (5614 -> 3614); one browser" 20 bash -c "
    export PRESET=a4_portrait CDPPORT=9696 REPS=2 ONLY=LANDOTHER CREDROOT=$A/cred-3614
    timeout 1800 node a20m_probe.mjs a25-m-landother http://127.0.0.1:5614 http://127.0.0.1:3614/api local > runs-a25-m-landother.log 2>&1; echo \"a25 landother exit \$?\""
  echo "step 4 done $(date +%T)"; fi
if [ "$FROM" -le 5 ]; then gate; echo "step 5 a20n A-25 start $(date +%T)"
  bash withslot.sh "A-25" "a20n on A-25 (5614 -> 3614), TRACE=1, all arms; one browser" 70 bash -c "
    export PRESET=a4_portrait CDPPORT=9697 CREDROOT=$A/cred-3614 TRACE=1
    REPS=2 timeout 6600 node a20n_probe.mjs a25-n http://127.0.0.1:5614 http://127.0.0.1:3614/api local > runs-a25-n.log 2>&1; echo \"a25-n exit \$?\"
    REPS=1 ONLY=BACKIN-heldback,BACKIN-fail-heldhead,BACKIN-heldhead-undo timeout 1800 node a20n_probe.mjs a25-n-third http://127.0.0.1:5614 http://127.0.0.1:3614/api local > runs-a25-n-third.log 2>&1; echo \"a25-n-third exit \$?\""
  echo "step 5 done $(date +%T)"; fi
if [ "$FROM" -le 6 ]; then gate; echo "step 6 base column start $(date +%T)"
  k25 k25-base http://127.0.0.1:5612 http://127.0.0.1:3612/api cred-3612k
  kd kd-base2 http://127.0.0.1:5612 http://127.0.0.1:3612/api cred-3612k
  echo "step 6 done $(date +%T)"; fi
echo "A-25 seq done $(date +%T)"
