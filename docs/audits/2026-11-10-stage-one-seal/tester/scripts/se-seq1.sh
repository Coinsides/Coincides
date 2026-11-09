#!/usr/bin/env bash
# Stage-one seal regression, slot 1 (Tester(1) 2026-11-10; order 2026-11-10-stage-one-seal-regression-order.md).
# Baseline = the island build b734197e itself, run on a local copy: front 5615 = the A-25 package dist/client (63/63 = the
# island, round 25), backend 3615 = a19acc/post (server + shared == b734197e), fresh library data-se, bind-local.
# Rounds (order ruling 2): race / timing arms 2 rounds (a20n, a20m BACKIN fast / neterr, k25 SAVEFAIL / LANDFAIL /
# ONEFAIL, D exits); IME-new 8 rows; everything else 1 round. Ops kit probes (loud on a missing CREDROOT), local only.
# Each step takes a lock slot of its own (withslot.sh); resumable: se-seq1.sh <from step>.
#   1. same-source: vite build of tree-se (git archive b734197e) -> hashes vs the island's 63-file list + the main JS
#   2. k25 canonical, all groups (REPS=2, REPS_IME=8, REPS_OTHER=1)
#   3. D exits (REPS_D=2)
#   4. the r3 chain, 16 labels, 1 round; label m with the dual-gate a20m probe, REPS=1, REPSRACE=2 (fast / neterr x2)
#   5. a20m LANDOTHER x1
#   6. a20n full (REPS=2, TRACE=1) + the third form (heldback, heldhead, heldhead-undo x1)
SE=<scratch>/stage-end
W=<scratch>/a20/withslot.sh
A=<acc>; A2=<acc>
K20=<ops>/tester-kit/a20; K25=<ops>/tester-kit/a25
F=http://127.0.0.1:5615; API=http://127.0.0.1:3615/api
FROM=${1:-1}; cd $SE; mkdir -p $SE/logs
if [ "$FROM" -le 1 ]; then echo "step 1 same-source start $(date +%T)"
  bash $W "stage-end" "same-source vite build of b734197e (tree-se)" 10 bash -c "cd $A/tree-se/client && npx vite build --outDir $A/dist-se/client --emptyOutDir > $SE/logs/build-se.log 2>&1; echo build exit \$?"
  (cd $A2/dist-se/client && find . -type f | sort | xargs sha256sum | sed -E 's#^([0-9a-f]+) [ *]\./#\1  #') > $SE/se-build.sha256
  if diff <(sort -k2 $SE/se-build.sha256) <(sort -k2 $A2/a20-island-expected-a25.sha256) > $SE/logs/se-build-vs-island.diff; then echo "== b734197e rebuild == the island's 63-file list ($(wc -l < $SE/se-build.sha256) files)"; else echo "== REBUILD DIFFERS from the island list"; cat $SE/logs/se-build-vs-island.diff | head; fi
  grep -o 'assets/index-[A-Za-z0-9_-]*\.js' $A2/dist-se/client/index.html | head -1
  echo "step 1 done $(date +%T)"; fi
if [ "$FROM" -le 2 ]; then echo "step 2 k25 start $(date +%T)"
  bash $W "stage-end" "k25 canonical (se-k25), one browser" 40 bash -c "
    export CREDROOT=$A/cred-se-k25 OUTDIR=$SE PRESET=a4_portrait CDPPORT=9693 REPS=2 REPS_IME=8 REPS_OTHER=1
    timeout 3600 node $K25/a25_probe.mjs se-k25 $F $API local > $SE/logs/run-se-k25.log 2>&1; echo \"se-k25 exit \$?\"
    node $K25/analyze-a25.mjs $SE/runs/se-k25 > $SE/an-se-k25.txt 2>&1; tail -1 $SE/an-se-k25.txt"
  echo "step 2 done $(date +%T)"; fi
if [ "$FROM" -le 3 ]; then echo "step 3 D start $(date +%T)"
  bash $W "stage-end" "D exits (se-kd), one browser" 15 bash -c "
    export CREDROOT=$A/cred-se-k25 OUTDIR=$SE PRESET=a4_portrait CDPPORT=9694 REPS_D=2
    timeout 1500 node $K25/a25d_probe.mjs se-kd $F $API local > $SE/logs/run-se-kd.log 2>&1; echo \"se-kd exit \$?\""
  echo "step 3 done $(date +%T)"; fi
run() { # run <label> <env> <probe> : one chain label, in its own slot
  bash $W "stage-end" "chain $1 (one browser)" 30 bash -c "
    export CREDROOT=$A/cred-se-chain OUTDIR=$SE PRESET=a4_portrait CDPPORT=9690
    env $2 timeout 3600 node $K20/$3 $1 $F $API local > $SE/logs/runs-$1.log 2>&1; echo \"$1 exit \$? \$(grep -c '^BAD' $SE/logs/runs-$1.log) BAD\""
}
if [ "$FROM" -le 4 ]; then echo "step 4 chain start $(date +%T)"
  run se-k        "REPS=1 ONLY=K1-401hash,K1-401blur,K1-close,K1-paste500,K1IME-held,K2,K5,K3,K6" a20e_probe.mjs
  run se-late     "REPS=1" a20f_probe.mjs
  run se-j        "REPS=1" a20j_probe.mjs
  run se-k-toast  "REPS=1" a20k_probe.mjs
  run se-flyk     "REPS=1" a20l_probe.mjs
  run se-inapp    "REPS=1" a20g_probe.mjs
  run se-d        "REPS=1" a20d_probe.mjs
  run se-b        "REPS=1" a20b_probe.mjs
  run se-a        "REPS=1 ONLY=IDLE,WAMP,PAUSES,UNDO,PAGEHIDE" a20_probe.mjs
  run se-c        "REPS=1 ONLY=PAUSEEXIT-unload,PAUSEEXIT-hash,PAUSEEXIT-401,UNDOSEQ,UNDOPAUSE,DRAFT,OFFLINE,PUTDUP,IME" a20c_probe.mjs
  run se-c-closetab "REPS=1 ONLY=PAUSEEXIT-closetab" a20c_probe.mjs
  run se-c-kill   "REPS=1 ONLY=PAUSEEXIT-kill" a20c_probe.mjs
  run se-kill-close-0 "ONLY=HARDKILL KILL=close" a20_probe.mjs
  run se-kill-proc-0  "ONLY=HARDKILL KILL=proc" a20_probe.mjs
  run se-offkill-0 "" a20i_probe.mjs
  run se-m        "REPS=1 REPSRACE=2 ONLY=BACKIN,LIST" a20m_probe_gate.mjs
  echo "step 4 done $(date +%T)"; fi
if [ "$FROM" -le 5 ]; then echo "step 5 LANDOTHER start $(date +%T)"
  run se-m-landother "REPS=1 ONLY=LANDOTHER" a20m_probe_gate.mjs
  echo "step 5 done $(date +%T)"; fi
if [ "$FROM" -le 6 ]; then echo "step 6 a20n start $(date +%T)"
  run se-n "REPS=2 TRACE=1" a20n_probe.mjs
  run se-n-third "REPS=1 TRACE=1 ONLY=BACKIN-heldback,BACKIN-fail-heldhead,BACKIN-heldhead-undo" a20n_probe.mjs
  echo "step 6 done $(date +%T)"; fi
for L in se-k se-late se-j se-k-toast se-flyk se-inapp se-d se-b se-a se-c se-c-closetab se-c-kill se-kill-close-0 se-kill-proc-0 se-offkill-0 se-m se-m-landother se-n se-n-third; do
  [ -d $SE/runs/$L ] || { echo "== $L: NO RUN DIR"; continue; }
  # se-c: UNDOSEQ / UNDOPAUSE / IME are judged against a BASE run; the baseline is the A-25 round's own A-25-side reading
  if [ "$L" = se-c ]; then BASE=<scratch>/a20/runs/a25-c node $K20/analyze-a20.mjs $SE/runs/$L > $SE/an-$L.txt 2>&1; else node $K20/analyze-a20.mjs $SE/runs/$L > $SE/an-$L.txt 2>&1; fi
  echo "== $L: $(wc -l < $SE/runs/$L/rows.jsonl) rows; $(grep '^total' $SE/an-$L.txt); $(grep '^setup errors' $SE/an-$L.txt | cut -c1-200)"
done
echo "slot-1 sequence done $(date +%T)"
