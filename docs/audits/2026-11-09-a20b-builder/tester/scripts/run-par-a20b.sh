#!/usr/bin/env bash
# A-20b r2 round, the regression part run beside the sequence (11-09): the 9 pairs pre vs A-20b r2 (each pair takes a slot,
# 2 browsers, ports 9671/9672, pairs account cred-3612r seeded with its own email), then pair 10 (UNDOPAUSE x20 + x20, port 9675).
S=<scratch>
echo "pairs start $(date +%T)"
bash $S/a20reg/run-reg-a20b-impl.sh > $S/a20reg/run-reg-a20b-par.log 2>&1; echo "pairs exit $? $(date +%T)"
echo "pair 10 start $(date +%T)"
cd $S/a20 && bash run-undopause-pair-a20b-impl.sh > run-undopause-pair-a20b-par.log 2>&1; echo "pair 10 exit $? $(date +%T)"
tail -25 $S/a20/run-undopause-pair-a20b-par.log
