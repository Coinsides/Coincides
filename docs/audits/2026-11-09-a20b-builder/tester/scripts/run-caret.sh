#!/usr/bin/env bash
# Caret probe (11-09): fresh-note first-keystroke caret jump on pre / r3e / A-20b r2, interleaved over two rounds so load
# drift hits all three alike. One browser at a time, port 9676, own seeded accounts cred-<api>c. Run under withslot.sh.
cd "<scratch>/a20"
A=<a20acc>
for r in 1 2; do
  for spec in "pre 5601 3601" "r3e 5611 3611" "belt 5612 3612"; do
    set -- $spec
    CREDROOT=$A/cred-$3c CDPPORT=9676 WAITS=800,300,0 N=5 timeout 900 node caret_probe.mjs caret-$1-r$r http://127.0.0.1:$2 http://127.0.0.1:$3/api local > runs-caret-$1-r$r.log 2>&1
    echo "caret $1 r$r exit $? $(date +%T)"; tail -1 runs-caret-$1-r$r.log
  done
done
