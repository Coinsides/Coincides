#!/usr/bin/env bash
# Tester(1) 11-09, A-25 lines30 / TD-77 probe, fine sweep after the 150-1500 ms hold run came back all green (there the
# first Enter already sat in the draft at the hand-off). Reviewer L2's shape needs the hand-off while the draft holds only
# 'aa', i.e. the POST returning around the first Enter: POST /notes/:id/blocks held 40 / 60 / 80 / 100 / 120 ms, 10 rows
# each, gap 30, recorder v2 (matrix-dtrace2.mjs), base (A-20b r2, 5612 -> 3612) and A-25 (5614 -> 3614) side by side,
# ONE lock slot, 2 browsers, ports 9691/9692, accounts cred-3612r / cred-3614r. Labels a20bp-dtd<ms> / a25p-dtd<ms>.
cd "<scratch>/a20reg"
A=<a20acc>
bash ../a20/withslot.sh "A-25" "matrix D traced v2: POST /blocks held 40/60/80/100/120 ms x10 each (fine sweep); A-20b r2 + A-25, 2 browsers" 15 bash -c "
export PRESET=a4_portrait DGAPS=30
for d in 40 60 80 100 120; do
  DREPS=10 DPOSTDELAY=\$d CREDROOT=$A/cred-3612r CDPPORT=9691 timeout 900 node matrix-dtrace2.mjs a20bp-dtd\$d http://127.0.0.1:5612 http://127.0.0.1:3612/api local D 1 > log-a20bp-dtd\$d.txt 2>&1 & P1=\$!
  DREPS=10 DPOSTDELAY=\$d CREDROOT=$A/cred-3614r CDPPORT=9692 timeout 900 node matrix-dtrace2.mjs a25p-dtd\$d http://127.0.0.1:5614 http://127.0.0.1:3614/api local D 1 > log-a25p-dtd\$d.txt 2>&1 & P2=\$!
  wait \$P1; echo \"base dtd\$d exit \$?\"; wait \$P2; echo \"A-25 dtd\$d exit \$?\"
done"
R=../verify-editor/runs
node ana-dtrace.mjs $R/a20bp-dtd40 $R/a25p-dtd40 $R/a20bp-dtd60 $R/a25p-dtd60 $R/a20bp-dtd80 $R/a25p-dtd80 $R/a20bp-dtd100 $R/a25p-dtd100 $R/a20bp-dtd120 $R/a25p-dtd120 > ana-dtsweep.txt 2>&1
grep -E "^==|tally" ana-dtsweep.txt
