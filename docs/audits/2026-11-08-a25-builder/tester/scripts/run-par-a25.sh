#!/usr/bin/env bash
# A-25 round, the regression part run beside the sequence (Tester 11-09 prep): the 9 pairs A-20b r2 (live) vs A-25 (each
# pair takes a slot, 2 browsers, ports 9691/9692, pairs accounts cred-3612r / cred-3614r with their own emails), then
# pair 10 (UNDOPAUSE x20 + x20, port 9695).
S=<scratch>
echo "pairs start $(date +%T)"
bash $S/a20reg/run-reg-a25-impl.sh > $S/a20reg/run-reg-a25-par.log 2>&1; echo "pairs exit $? $(date +%T)"
echo "pair 10 start $(date +%T)"
cd $S/a20 && bash run-undopause-pair-a25-impl.sh > run-undopause-pair-a25-par.log 2>&1; echo "pair 10 exit $? $(date +%T)"
tail -25 $S/a20/run-undopause-pair-a25-par.log
