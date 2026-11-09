#!/usr/bin/env bash
# A-25 chain vs the A-20b r2 chain (Tester 11-09 prep): the analyzer's per-arm notes for each chain label, ids and numbers
# normalised, diffed. Baseline gates = gate-a20b/belt-*.txt (filed with the A-20b report; READ ONLY here). A-25 notes are
# written to gate-a25/a25-*.txt. Known baseline difference: belt-m LIST-addr-0 was red on A-20b r2 by a setup caret jump
# (prep contamination, TD-77), so a green LIST-addr-0 on A-25 shows up as a diff and is not a change of the arm.
# Usage: diff-chain-a25.sh
cd "<scratch>/a20"
G=gate-a20b
mkdir -p gate-a25
norm() { sed -E 's/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/<id>/g; s/[0-9]+/N/g'; }
for L in k late j k-toast flyk inapp d b a c c-closetab c-kill kill-close-0 kill-proc-0 offkill-0 m; do
  [ -d runs/a25-$L ] || { echo "== $L: no A-25 run"; continue; }
  OUTF=gate-a25/a25-$L.txt
  if [ "$L" = c ]; then BASE=runs/pre-c2 node analyze-a20.mjs runs/a25-$L > $OUTF 2>&1; else node analyze-a20.mjs runs/a25-$L > $OUTF 2>&1; fi
  rows=$(wc -l < runs/a25-$L/rows.jsonl); rowsb=$(wc -l < runs/belt-$L/rows.jsonl 2>/dev/null)
  d=$(diff <(norm < $G/belt-$L.txt) <(norm < $OUTF) | grep -c '^[<>]')
  echo "== $L: rows A-20b $rowsb / A-25 $rows; $(grep '^total' $OUTF); normalised diff lines $d"
  [ "$d" -gt 0 ] && diff <(norm < $G/belt-$L.txt) <(norm < $OUTF) | head -20 | cut -c1-300
done
