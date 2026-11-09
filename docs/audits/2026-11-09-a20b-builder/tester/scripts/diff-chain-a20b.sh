#!/usr/bin/env bash
# A-20b chain vs r3e chain (11-09): the analyzer's per-arm notes for each chain label, ids and numbers normalised, diffed.
# r3e gates = gate-r3e/r3e-*.txt (made by diff-chain-r3e.sh; filed with the r3e report). Usage: diff-chain-a20b.sh
cd "<scratch>/a20"
G=gate-r3e
mkdir -p gate-a20b
norm() { sed -E 's/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/<id>/g; s/[0-9]+/N/g'; }
for L in k late j k-toast flyk inapp d b a c c-closetab c-kill kill-close-0 kill-proc-0 offkill-0 m; do
  [ -d runs/belt-$L ] || { echo "== $L: no A-20b run"; continue; }
  if [ "$L" = c ]; then BASE=runs/pre-c2 node analyze-a20.mjs runs/belt-$L > gate-a20b/belt-$L.txt 2>&1; else node analyze-a20.mjs runs/belt-$L > gate-a20b/belt-$L.txt 2>&1; fi
  rows=$(wc -l < runs/belt-$L/rows.jsonl); rows3=$(wc -l < runs/r3e-$L/rows.jsonl 2>/dev/null)
  d=$(diff <(norm < $G/r3e-$L.txt) <(norm < gate-a20b/belt-$L.txt) | grep -c '^[<>]')
  echo "== $L: rows r3e $rows3 / A-20b $rows; $(grep '^total' gate-a20b/belt-$L.txt); normalised diff lines $d"
  [ "$d" -gt 0 ] && diff <(norm < $G/r3e-$L.txt) <(norm < gate-a20b/belt-$L.txt) | head -20 | cut -c1-300
done
