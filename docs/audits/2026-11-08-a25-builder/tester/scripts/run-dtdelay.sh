#!/usr/bin/env bash
# Tester(1) 11-09, A-25 lines30 follow-up (Main_Designer approved the hold run): recorder v2 (matrix-dtrace2.mjs), gap 30,
# base (A-20b r2, 5612 -> 3612) and A-25 (5614 -> 3614) side by side, all in ONE lock slot, 2 browsers, ports 9691/9692,
# accounts cred-3612r / cred-3614r.
#   0. positive control for the failure detectors: the first text-save of each row answered 500 (DFAILONCE=1), 2 rows
#      a side (labels a20bp-dtfail / a25p-dtfail) - the A-25 mark and the base's 'Failed to save block' must show;
#   1. POST /notes/:id/blocks held 150 / 400 / 800 / 1500 ms, 5 rows each (labels a20bp-dtd<ms> / a25p-dtd<ms>).
cd "<scratch>/a20reg"
A=<a20acc>
bash ../a20/withslot.sh "A-25" "matrix D traced v2: failure-detector control x2, then POST /blocks held 150/400/800/1500 ms x5 each; A-20b r2 + A-25, 2 browsers" 18 bash -c "
export PRESET=a4_portrait DGAPS=30
DREPS=2 DFAILONCE=1 CREDROOT=$A/cred-3612r CDPPORT=9691 timeout 600 node matrix-dtrace2.mjs a20bp-dtfail http://127.0.0.1:5612 http://127.0.0.1:3612/api local D 1 > log-a20bp-dtfail.txt 2>&1 & P1=\$!
DREPS=2 DFAILONCE=1 CREDROOT=$A/cred-3614r CDPPORT=9692 timeout 600 node matrix-dtrace2.mjs a25p-dtfail http://127.0.0.1:5614 http://127.0.0.1:3614/api local D 1 > log-a25p-dtfail.txt 2>&1 & P2=\$!
wait \$P1; echo \"base dtfail exit \$?\"; wait \$P2; echo \"A-25 dtfail exit \$?\"
for d in 150 400 800 1500; do
  DREPS=5 DPOSTDELAY=\$d CREDROOT=$A/cred-3612r CDPPORT=9691 timeout 900 node matrix-dtrace2.mjs a20bp-dtd\$d http://127.0.0.1:5612 http://127.0.0.1:3612/api local D 1 > log-a20bp-dtd\$d.txt 2>&1 & P1=\$!
  DREPS=5 DPOSTDELAY=\$d CREDROOT=$A/cred-3614r CDPPORT=9692 timeout 900 node matrix-dtrace2.mjs a25p-dtd\$d http://127.0.0.1:5614 http://127.0.0.1:3614/api local D 1 > log-a25p-dtd\$d.txt 2>&1 & P2=\$!
  wait \$P1; echo \"base dtd\$d exit \$?\"; wait \$P2; echo \"A-25 dtd\$d exit \$?\"
done"
R=../verify-editor/runs
node ana-dtrace.mjs $R/a20bp-dtfail $R/a25p-dtfail $R/a20bp-dtd150 $R/a25p-dtd150 $R/a20bp-dtd400 $R/a25p-dtd400 $R/a20bp-dtd800 $R/a25p-dtd800 $R/a20bp-dtd1500 $R/a25p-dtd1500
