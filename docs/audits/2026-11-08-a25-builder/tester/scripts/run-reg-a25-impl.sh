#!/usr/bin/env bash
# A-25 round (Tester 11-09 prep): A-20 editor regression, the A-25 base (= live: A-20b r2 package, 5612 -> 3612) and A-25
# (5614 -> 3614) side by side: A-18 main matrix (three fixed items), editor group H scenes, r2.3c representative arms. Each
# step = the same probe on both at the same time: 2 browsers, one heavy-job lock slot (withslot.sh). Pairs accounts are
# pre-seeded with their own test emails (cred-3612r exists; cred-3614r seeded by run-a25-env.sh). Ports 9691 / 9692.
# Labels a20bp-<name> (base) / a25p-<name> (A-25); subset check: node ../a20/redsubset.mjs log-a20bp-<n>.txt log-a25p-<n>.txt
# Usage: run-reg-a25-impl.sh [<from step>]
cd "<scratch>/a20reg"
W=<scratch>/a20/withslot.sh
FROM=${1:-1}
A=<a20acc>
pair() { # pair <step> <name> <env> <probe> [extra args...]
  [ "$1" -lt "$FROM" ] && return 0
  local step=$1 name=$2 envs=$3 probe=$4; shift 4
  bash "$W" "A-25" "regression step $step $name: A-20b r2 + A-25, 2 browsers" 40 bash -c "
    export PRESET=a4_portrait
    env $envs CREDROOT=$A/cred-3612r CDPPORT=9691 timeout 5400 node $probe a20bp-$name http://127.0.0.1:5612 http://127.0.0.1:3612/api local $* > log-a20bp-$name.txt 2>&1 & P1=\$!
    env $envs CREDROOT=$A/cred-3614r CDPPORT=9692 timeout 5400 node $probe a25p-$name http://127.0.0.1:5614 http://127.0.0.1:3614/api local $* > log-a25p-$name.txt 2>&1 & P2=\$!
    wait \$P1; echo \"base  $name exit \$?\"; wait \$P2; echo \"A-25 $name exit \$?\""
  for s in a20bp a25p; do echo "  $s: $(tail -1 log-$s-$name.txt | cut -c1-500)"; done
  echo "  subset: $(node ../a20/redsubset.mjs log-a20bp-$name.txt log-a25p-$name.txt 2>&1 | tail -1)"
}
pair 1 mx "" matrix.mjs K,W,H,N,R,V,D,L,G
pair 2 acc1 "ONLY=A1,H,G-draftUndo" acc_probe.mjs
pair 3 acc10 "ONLY=HL,TWO ROLE_SAVE=2" acc10_probe.mjs
pair 4 y "ONLY=Y0,Y1 REP5=3" acc5_probe.mjs
pair 5 two2 "ONLY=TWO2 TWO2REPS=3" acc11_probe.mjs
pair 6 acc18 "ONLY=STEAL2,LEGACY,COPYPASTE" acc18_probe.mjs
pair 7 acc13 "" acc13_probe.mjs
pair 8 J "REPS=2" acc2_probe.mjs
pair 9 retry "HOLD=70000" acc22_probe.mjs
echo "regression done $(date +%T)"
