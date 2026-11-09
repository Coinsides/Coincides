#!/usr/bin/env bash
# Stage-one seal (Tester 2026-11-10): the stage-end chain (runs se-*) vs the A-25 chain (scratch a20/runs/a25-*), both read by
# the SAME analyzer (ops kit analyze-a20.mjs as of today, W=4000 wide notes), ids and numbers normalised, diffed per label.
# Verdict basis (order ruling 3): green = manual known shapes + A-25-side readings + rulings; a diff line is not red by
# itself, but each one is read and classified in the report. c is judged against BASE = a25-c on both sides.
SE=<scratch>/stage-end
A20=<scratch>/a20
K=<ops>/tester-kit/a20
OUT=$SE/gate; mkdir -p $OUT
norm() { sed -E 's/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/<id>/g; s/[0-9]+/N/g'; }
for L in k late j k-toast flyk inapp d b a c c-closetab c-kill kill-close-0 kill-proc-0 offkill-0 m m-landother n n-third; do
  [ -d $SE/runs/se-$L ] || { echo "== $L: no stage-end run"; continue; }
  [ -d $A20/runs/a25-$L ] || { echo "== $L: no A-25 run"; continue; }
  if [ "$L" = c ]; then B="BASE=$A20/runs/a25-c"; else B=""; fi
  env $B W=4000 node $K/analyze-a20.mjs $A20/runs/a25-$L > $OUT/a25-$L.txt 2>&1
  env $B W=4000 node $K/analyze-a20.mjs $SE/runs/se-$L > $OUT/se-$L.txt 2>&1
  ra=$(wc -l < $A20/runs/a25-$L/rows.jsonl); rs=$(wc -l < $SE/runs/se-$L/rows.jsonl)
  d=$(diff <(norm < $OUT/a25-$L.txt) <(norm < $OUT/se-$L.txt) | grep -c '^[<>]')
  echo "== $L: rows A-25 $ra / stage-end $rs; A-25 $(grep '^total' $OUT/a25-$L.txt | cut -c1-80) | stage-end $(grep '^total' $OUT/se-$L.txt | cut -c1-80); normalised diff lines $d"
  diff <(norm < $OUT/a25-$L.txt) <(norm < $OUT/se-$L.txt) > $OUT/diff-$L.txt
done
