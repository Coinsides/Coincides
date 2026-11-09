#!/usr/bin/env bash
# A-25 round (Tester 11-09 prep; labels up-bp-NN / up-a25-NN, tally PRESIDE=bp SIDE=a25): pair 10, UNDOPAUSE x20 on the
# A-25 base (A-20b r2, 5612 -> 3612) vs x20 on A-25 (5614 -> 3614), interleaved: 10 rounds of [base x2, A-25 x2], one browser
# at a time, the same CDP port for both sides; one heavy-job lock slot for the whole run.
# Signature (builder): the second undo deletes the whole block, skipping the step back to ['warmup'].
# Decision (Main_Designer 11-08): base 0/20 and A-25 >= 3/20 -> STOP and report, no release; otherwise record the counts.
# Usage: run-undopause-pair-a25-impl.sh [<from round>]
cd "<scratch>/a20"
FROM=${1:-1}
[ -z "$INSLOT" ] && exec env INSLOT=1 bash withslot.sh "A-25" "regression pair 10: UNDOPAUSE x20 A-20b r2 vs x20 A-25, one browser" 60 bash "$0" "$@"
A=<a20acc>
export PRESET=a4_portrait ONLY=UNDOPAUSE REPS=2 CDPPORT=9695
for r in $(seq "$FROM" 10); do
  rr=$(printf '%02d' "$r")
  CREDROOT=$A/cred-3612r timeout 900 node a20c_probe.mjs up-bp-$rr http://127.0.0.1:5612 http://127.0.0.1:3612/api local > runs-up-bp-$rr.log 2>&1
  echo "round $rr base exit $? $(date +%T)"
  CREDROOT=$A/cred-3614r timeout 900 node a20c_probe.mjs up-a25-$rr http://127.0.0.1:5614 http://127.0.0.1:3614/api local > runs-up-a25-$rr.log 2>&1
  echo "round $rr A-25 exit $? $(date +%T)"
done
PRESIDE=bp SIDE=a25 node undopause-tally.mjs
echo "undopause pair done $(date +%T)"
