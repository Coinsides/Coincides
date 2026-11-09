#!/usr/bin/env bash
# r3e formal round, the regression part run beside the chain (11-09): the 9 pairs pre vs r3e (each pair takes a slot, 2 browsers),
# then pair 10 (UNDOPAUSE x20 pre vs x20 r3e interleaved, one slot, one browser). Markers make the sequence's steps 5 / 6 wait / skip.
S=<scratch>
touch $S/a20reg/pairs-r3e.running
trap 'rm -f $S/a20reg/pairs-r3e.running' EXIT
echo "pairs start $(date +%T)"
bash $S/a20reg/run-reg-r3e-impl.sh > $S/a20reg/run-reg-r3e-par.log 2>&1; rc=$?
echo "pairs exit $rc $(date +%T)"; [ $rc -eq 0 ] && touch $S/a20reg/pairs-r3e.done
echo "pair 10 start $(date +%T)"
cd $S/a20 && bash run-undopause-pair-r3e-impl.sh > run-undopause-pair-r3e-par.log 2>&1; rc=$?
echo "pair 10 exit $rc $(date +%T)"; [ $rc -eq 0 ] && touch $S/a20/undopause-r3e.done
tail -25 $S/a20/run-undopause-pair-r3e-par.log
