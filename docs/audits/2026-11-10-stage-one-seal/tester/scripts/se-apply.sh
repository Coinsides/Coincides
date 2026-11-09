#!/usr/bin/env bash
# Main_Designer rulings (d) and (e), 2026-11-10 - one slot, one browser:
#  (d) Apply step: human-speed HL x1 + N-b2 x1 with APPLY=1 (click Apply on the item after the reopen, read the server
#      and the items at +8 s); on the local copy of b734197e first, then on the island test account (holds only in the
#      test browser).
#  (e) re-read with a fourth place: the original HL x3 (acc10), HL2 x3 (acc11), N-b2 x2 (acc13) re-run locally with the
#      recovery items recorded at the reopen (itemsAtReopen); the new rule is applied by reread-items.mjs.
SE=<scratch>/stage-end
R=<scratch>/a20reg
A=<acc>
cd $R
bash ../a20/withslot.sh "stage-end" "TD-82/83 Apply step (local then island test account) + local re-read runs with items (one browser)" 30 bash -c "
  export PRESET=a4_portrait CDPPORT=9682 CREDROOT=$A/cred-se-pairs
  APPLY=1 HL_TARGET=1 NB_TARGET=1 MAXTRY=1 timeout 900 node hum_probe.mjs se-hum-apply http://127.0.0.1:5615 http://127.0.0.1:3615/api local > $SE/logs/log-se-hum-apply.txt 2>&1; echo \"se-hum-apply exit \$?\"
  if grep -q '^DONE se-hum-apply' $SE/logs/log-se-hum-apply.txt; then
    APPLY=1 HL_TARGET=1 NB_TARGET=1 MAXTRY=1 timeout 900 node hum_probe.mjs isl-hum-apply http://127.0.0.1:13002 http://127.0.0.1:13002/api island > $SE/logs/log-isl-hum-apply.txt 2>&1; echo \"isl-hum-apply exit \$?\"
  else echo 'local Apply run did not finish: island step skipped'; fi
  ONLY=HL-saveNotSentThenClose timeout 900 node acc10i_probe.mjs se-acc10i http://127.0.0.1:5615 http://127.0.0.1:3615/api local > $SE/logs/log-se-acc10i.txt 2>&1; echo \"se-acc10i exit \$?\"
  ONLY=HL2- timeout 900 node acc11i_probe.mjs se-acc11i http://127.0.0.1:5615 http://127.0.0.1:3615/api local > $SE/logs/log-se-acc11i.txt 2>&1; echo \"se-acc11i exit \$?\"
  ONLY=N-b2 timeout 900 node acc13i_probe.mjs se-acc13i http://127.0.0.1:5615 http://127.0.0.1:3615/api local > $SE/logs/log-se-acc13i.txt 2>&1; echo \"se-acc13i exit \$?\""
for L in se-hum-apply isl-hum-apply se-acc10i se-acc11i se-acc13i; do echo "== $L: $(grep '^DONE' $SE/logs/log-$L.txt 2>/dev/null)"; done
