#!/usr/bin/env bash
# A-20 editor regression, pre and post side by side (builder's ask, Main_Designer 11-08): A-18 main matrix (with the
# three fixed items: 300 ms human rhythm in G/A1, real-key headings N, English sentence with spaces R), editor group H
# scenes, r2.3c representative arms (the deploy-21 set). Each step = the same probe on pre (5601 -> 3601, 04f6f822
# equivalent) and post (5611 -> 3611, r3e package) at the same time: 2 browsers. Each step takes one heavy-job lock slot
# through withslot.sh (taken and released in that one shell). Usage: run-reg.sh [<from step>]
cd "<scratch>/a20reg"
W=<scratch>/a20/withslot.sh
FROM=${1:-1}
A=<a20acc>
pair() { # pair <step> <name> <env> <probe> [extra args...]
  [ "$1" -lt "$FROM" ] && return 0
  local step=$1 name=$2 envs=$3 probe=$4; shift 4
  bash "$W" "A-20" "regression step $step $name: pre+post, 2 browsers" 40 bash -c "
    export PRESET=a4_portrait
    env $envs CREDROOT=$A/cred-3601 CDPPORT=9651 timeout 5400 node $probe a20pre3e-$name http://127.0.0.1:5601 http://127.0.0.1:3601/api local $* > log-a20pre3e-$name.txt 2>&1 & P1=\$!
    env $envs CREDROOT=$A/cred-3611r CDPPORT=9652 timeout 5400 node $probe a20r3e-$name http://127.0.0.1:5611 http://127.0.0.1:3611/api local $* > log-a20r3e-$name.txt 2>&1 & P2=\$!
    wait \$P1; echo \"pre  $name exit \$?\"; wait \$P2; echo \"post $name exit \$?\""
  for s in pre3e r3e; do echo "  $s: $(tail -1 log-a20$s-$name.txt | cut -c1-500)"; done
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
# pair 10 (UNDOPAUSE x20 pre vs x20 r3, interleaved, one browser): bash ../a20/run-undopause-pair.sh
