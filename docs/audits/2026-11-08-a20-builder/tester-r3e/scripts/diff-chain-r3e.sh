#!/usr/bin/env bash
# r3e chain vs r3 chain: the analyzer's per-arm notes for each chain label, ids and numbers normalised, diffed.
# r3 gates = the files filed with the r3 report (tester-r3/gate/r3-*.txt). Usage: diff-chain.sh
cd "<scratch>/a20"
G=/d/Coinsides/v2.x/Coincides/docs/audits/2026-11-08-a20-builder/tester-r3/gate
mkdir -p gate-r3e
norm() { sed -E 's/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/<id>/g; s/[0-9]+/N/g'; }
for L in k late j k-toast flyk inapp d b a c c-closetab c-kill kill-close-0 kill-proc-0 offkill-0 m; do
  [ -d runs/r3e-$L ] || { echo "== $L: no r3e run"; continue; }
  if [ "$L" = c ]; then BASE=runs/pre-c2 node analyze-a20.mjs runs/r3e-$L > gate-r3e/r3e-$L.txt 2>&1; else node analyze-a20.mjs runs/r3e-$L > gate-r3e/r3e-$L.txt 2>&1; fi
  rows=$(wc -l < runs/r3e-$L/rows.jsonl); rows3=$(wc -l < /d/Coinsides/v2.x/Coincides/docs/audits/2026-11-08-a20-builder/tester-r3/runs/r3-$L/rows.jsonl 2>/dev/null)
  d=$(diff <(norm < $G/r3-$L.txt) <(norm < gate-r3e/r3e-$L.txt) | grep -c '^[<>]')
  echo "== $L: rows r3 $rows3 / r3e $rows; $(grep '^total' gate-r3e/r3e-$L.txt); normalised diff lines $d"
  [ "$d" -gt 0 ] && diff <(norm < $G/r3-$L.txt) <(norm < gate-r3e/r3e-$L.txt) | head -20 | cut -c1-300
done
