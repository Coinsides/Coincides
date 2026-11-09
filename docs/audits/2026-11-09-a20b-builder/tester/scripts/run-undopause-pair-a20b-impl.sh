#!/usr/bin/env bash
# A-20b round (11-09; labels up-preb-NN / up-belt-NN, tally PRESIDE=preb SIDE=belt): A-20 regression pair 10 (Main_Designer 11-08, order "UNDOPAUSE 间歇红归修前对照"): UNDOPAUSE x20 on pre (04f6f822,
# 5601 -> 3601) vs x20 on r3 (5612 -> 3612), same environment, interleaved: 10 rounds of [pre x2, r3 x2], one browser
# at a time, the same CDP port for both sides. Takes one heavy-job lock slot for the whole run (Main_Designer 11-08:
# real Chrome + backend + proxy = a heavy job even with one browser).
# Signature (builder): the second undo deletes the whole block, skipping the step back to ['warmup'].
# Decision: pre shows it too -> record the counts (TD, stage two); pre 0/20 and r3 >= 3/20 -> STOP and report, no release.
# Tally: node undopause-tally.mjs   Usage: run-undopause-pair.sh [<from round>]
cd "<scratch>/a20"
FROM=${1:-1}
[ -z "$INSLOT" ] && exec env INSLOT=1 bash withslot.sh "A-20b" "regression pair 10: UNDOPAUSE x20 pre vs x20 A-20b, one browser" 60 bash "$0" "$@"
A=<a20acc>
export PRESET=a4_portrait ONLY=UNDOPAUSE REPS=2 CDPPORT=9675
for r in $(seq "$FROM" 10); do
  rr=$(printf '%02d' "$r")
  CREDROOT=$A/cred-3601 timeout 900 node a20c_probe.mjs up-preb-$rr http://127.0.0.1:5601 http://127.0.0.1:3601/api local > runs-up-preb-$rr.log 2>&1
  echo "round $rr pre exit $? $(date +%T)"
  CREDROOT=$A/cred-3612r timeout 900 node a20c_probe.mjs up-belt-$rr http://127.0.0.1:5612 http://127.0.0.1:3612/api local > runs-up-belt-$rr.log 2>&1
  echo "round $rr A-20b exit $? $(date +%T)"
done
PRESIDE=preb SIDE=belt node undopause-tally.mjs
echo "undopause pair done $(date +%T)"
