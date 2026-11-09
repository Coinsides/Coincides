#!/usr/bin/env bash
# File the A-20b r2 acceptance evidence into docs/audits/2026-11-09-a20b-builder/tester/ (Tester 11-09). Rows / logs /
# gates / hashes / scripts; no screenshots. Local paths are replaced by placeholders (<scratch>, <ops>, <a20acc>, <tmp>).
# The caret probe rows are filed split by run (caret-split.py): runB = the ordered run (main ruling), runA = the
# unplanned replication (an orphaned queue, see the report section 9). The raw files are runA rows followed by runB rows.
S=<scratch>
T=/d/Coinsides/v2.x/Coincides/docs/audits/2026-11-09-a20b-builder/tester
V=$S/verify-editor/runs
mkdir -p "$T/runs" "$T/pairs" "$T/gate" "$T/hashes" "$T/scripts"
cp_rows() { # cp_rows <src run dir> <dest dir>: rows.jsonl + summary.json + any *.json/*.txt, never images
  mkdir -p "$2"; for f in "$1"/*; do case "$f" in *.jpg|*.png|*.jpeg|*.webp) ;; *) [ -f "$f" ] && cp "$f" "$2/";; esac; done
}
# runs: chain (16 labels), a20m LANDOTHER + rerun, a20n + third, new arms on pre / r3e, pair 10, caret probe (split)
for L in a b c c-closetab c-kill d flyk inapp j k k-toast kill-close-0 kill-proc-0 late m offkill-0 m-landother m-landother-rerun n n-third; do
  [ -d "$S/a20/runs/belt-$L" ] && cp_rows "$S/a20/runs/belt-$L" "$T/runs/belt-$L"
done
for L in preb-n-new r3e-n-new; do cp_rows "$S/a20/runs/$L" "$T/runs/$L"; done
for r in 01 02 03 04 05 06 07 08 09 10; do cp_rows "$S/a20/runs/up-preb-$r" "$T/runs/up-preb-$r"; cp_rows "$S/a20/runs/up-belt-$r" "$T/runs/up-belt-$r"; done
for k in A B; do for d in "$S/a20/runs$k"/caret-*; do cp_rows "$d" "$T/runs/caret-run$k/$(basename "$d")"; done; done
# pairs 1-9
for n in mx acc1 acc10 y two2 acc18 acc13 J retry; do
  for s in preb belt; do [ -d "$V/a20$s-$n" ] && cp_rows "$V/a20$s-$n" "$T/pairs/a20$s-$n"; cp "$S/a20reg/log-a20$s-$n.txt" "$T/pairs/"; done
  (cd "$S/a20reg" && node ../a20/redsubset.mjs "log-a20preb-$n.txt" "log-a20belt-$n.txt") > "$T/pairs/redsubset-$n.txt" 2>&1
done
# logs are filed as *.log.txt: the repo .gitignore drops *.log (and the pre-harvest scanner skips ignored files)
cp "$S/a20reg/run-reg-a20b-par.log" "$T/pairs/run-reg-a20b-par.log.txt"
# gate: chain notes, sequence logs, analyzer outputs, caret tallies, census / confound outputs
cp "$S/a20/gate-a20b/"*.txt "$T/gate/"
for f in run-a20b-chain.log run-a20b-seq.log run-caret.log run-caret-after-seq.log run-undopause-pair-a20b-par.log; do [ -f "$S/a20/$f" ] && cp "$S/a20/$f" "$T/gate/$f.txt"; done
# a20m oracle check (read-only) and the caret rows' note times (read-only DB; backs the run A / run B split and run A's window)
{ node <ops>/tester-kit/a20/check-a20m-oracle.mjs <ops>/packages/a20b-belt-coverage-r2; echo "oracle exit $?"; } > "$T/gate/oracle-a20b-r2.txt" 2>&1
(cd "$S/a20" && python -I caret-note-times.py > "$T/gate/caret-note-times.txt" 2>&1)
for L in belt-n belt-n-third preb-n-new r3e-n-new belt-m-landother belt-m-landother-rerun; do
  [ -d "$S/a20/runs/$L" ] && (cd "$S/a20" && W=4000 node analyze-a20.wide.mjs "runs/$L" > "$T/gate/an-$L.txt" 2>&1)
done
(cd "$S/a20" && R="$S/a20/runsB" node caret-tally.mjs > "$T/gate/caret-tally-main-runB.txt" 2>&1
 R="$S/a20/runsA" node caret-tally.mjs > "$T/gate/caret-tally-replication-runA.txt" 2>&1
 R="$S/a20/runs" node caret-tally.mjs > "$T/gate/caret-tally-pooled-AB.txt" 2>&1
 for k in A B; do R="$S/a20/runs$k" node caret-gone.mjs > "$T/gate/caret-gone-run$k.txt" 2>&1; done
 node census2.mjs runs > "$T/gate/census2.txt" 2>&1
 python -I confound2.py > "$T/gate/confound2.txt" 2>&1)
# hashes
cp <a20acc>/a20b-r2-mine.sha256 "$T/hashes/tester-rebuild-dist-a20b-r2.sha256"
# scripts
for f in a20n_arms.mjs analyze-a20.mjs analyze-a20.wide.mjs caret_body.mjs run-caret.sh run-caret-after-seq.sh caret-tally.mjs caret-split.py caret-gone.mjs census2.mjs confound2.py redsubset.mjs stopq.sh run-a20b-chain.sh run-a20b-seq.sh diff-chain-a20b.sh run-par-a20b.sh run-undopause-pair-a20b-impl.sh same-source-a20b-r2.sh undopause-tally.mjs caret-note-times.py file-a20b-evidence.sh; do
  [ -f "$S/a20/$f" ] && cp "$S/a20/$f" "$T/scripts/"
done
cp "$S/a20reg/run-reg-a20b-impl.sh" "$T/scripts/"
cp <ops>/tester-kit/a20/check-a20m-oracle.mjs "$T/scripts/"
# placeholders for local paths (text files only)
find "$T" -type f \( -name '*.jsonl' -o -name '*.json' -o -name '*.txt' -o -name '*.log' -o -name '*.sh' -o -name '*.mjs' -o -name '*.py' -o -name '*.sha256' \) -print0 | xargs -0 sed -i \
  -e 's#<scratch>#<scratch>#g' \
  -e 's#<scratch>#<scratch>#g' \
  -e 's#<session>#<session>#g' \
  -e 's#<session>#<session>#g' \
  -e 's#<a20acc>#<a20acc>#g; s#<a20acc>#<a20acc>#g' \
  -e 's#<a19acc>#<a19acc>#g; s#<a19acc>#<a19acc>#g' \
  -e 's#<ops>#<ops>#g; s#<ops>#<ops>#g; s#<tmp>#<tmp>#g; s#<tmp>#<tmp>#g'
echo "left over local-path mentions (pattern list in the private ops file):"; grep -rIl -f "$LOCALNAMES" "$T" | head
du -sh "$T"; find "$T" -type f | wc -l
