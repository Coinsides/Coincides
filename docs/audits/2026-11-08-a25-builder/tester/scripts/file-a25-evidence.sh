#!/usr/bin/env bash
# File the A-25 acceptance evidence into docs/audits/2026-11-08-a25-builder/tester/ (Tester 11-09). Rows / logs / gates /
# hashes / scripts; no screenshots. Local paths are replaced by placeholders (<scratch>, <session>, <ops>, <a20acc>,
# <a19acc>, <tmp>). The A-25 kit itself (ops tester-kit/a25: a25_probe.mjs, a25d_probe.mjs, analyze-a25.mjs) stays private
# per the order ("不进仓库"); the report cites it by sha256. Logs are filed as *.log.txt (the repo .gitignore drops *.log).
S=<scratch>
T=/d/Coinsides/v2.x/Coincides/docs/audits/2026-11-08-a25-builder/tester
V=$S/verify-editor/runs
K=<ops>/tester-kit/a25
mkdir -p "$T/runs" "$T/runs/void-v1" "$T/pairs" "$T/gate" "$T/hashes" "$T/scripts" "$T/td77"
cp_rows() { # cp_rows <src run dir> <dest dir>: every file except images
  mkdir -p "$2"; for f in "$1"/*; do case "$f" in *.jpg|*.png|*.jpeg|*.webp) ;; *) [ -f "$f" ] && cp "$f" "$2/";; esac; done
}
# runs: k25 canonical and D exits on A-25 and on the base (the base column), the chain (16 labels), a20m LANDOTHER and its
# fill, a20n + third, the dual-gate fill (both sides), the K1-paste500 fill
for L in k25-a25 kd-a25 k25-base kd-base2; do [ -d "$S/a25k/runs/$L" ] && cp_rows "$S/a25k/runs/$L" "$T/runs/$L"; done
for L in a b c c-closetab c-kill d flyk inapp j k k-toast kill-close-0 kill-proc-0 late m offkill-0 m-landother m-landother-fill n n-third k-fill; do
  [ -d "$S/a20/runs/a25-$L" ] && cp_rows "$S/a20/runs/a25-$L" "$T/runs/a25-$L"
done
for L in gate-bp gate-a25; do cp_rows "$S/a20/runs/$L" "$T/runs/$L"; done
# void (first seal v1, stopped at 18:50 by Main_Designer after Reviewer M1): kept apart, not counted
cp_rows "$S/a25k/runs/k25-a25-void-v1" "$T/runs/void-v1/k25-a25-void-v1"
for s in a20bp a25p; do cp_rows "$V/$s-mx-void-v1" "$T/runs/void-v1/$s-mx-void-v1"; cp "$S/a20reg/log-$s-mx-void-v1.txt" "$T/runs/void-v1/"; done
cp "$S/a25k/run-k25-a25-void-v1.log" "$T/runs/void-v1/run-k25-a25-void-v1.log.txt"
# pairs 1-9 and pair 10
for n in mx acc1 acc10 y two2 acc18 acc13 J retry; do
  for s in a20bp a25p; do cp_rows "$V/$s-$n" "$T/pairs/$s-$n"; cp "$S/a20reg/log-$s-$n.txt" "$T/pairs/"; done
  (cd "$S/a20reg" && node ../a20/redsubset.mjs "log-a20bp-$n.txt" "log-a25p-$n.txt") > "$T/pairs/redsubset-$n.txt" 2>&1
done
cp "$S/a20reg/run-reg-a25-par.log" "$T/pairs/run-reg-a25-par.log.txt"
for r in 01 02 03 04 05 06 07 08 09 10; do cp_rows "$S/a20/runs/up-bp-$r" "$T/pairs/up-bp-$r"; cp_rows "$S/a20/runs/up-a25-$r" "$T/pairs/up-a25-$r"; done
cp "$S/a20/run-undopause-pair-a25-par.log" "$T/pairs/run-undopause-pair-a25-par.log.txt"
# gate: chain diff and per-label notes, analyzer outputs, sequence logs
cp "$S/a20/diff-chain-a25.out" "$T/gate/diff-chain-a25.txt"
cp "$S/a20/gate-a25/"*.txt "$T/gate/"
for f in run-a25-chain.log run-a25-seq.log runs-a25-m-landother.log runs-a25-n.log runs-a25-n-third.log runs-gate-bp.log runs-gate-a25.log runs-a25-k-fill.log runs-a25-m-landother-fill.log; do [ -f "$S/a20/$f" ] && cp "$S/a20/$f" "$T/gate/$f.txt"; done
for L in k25-a25 k25-base; do node "$K/analyze-a25.mjs" "$S/a25k/runs/$L" > "$T/gate/an-$L.txt" 2>&1; done
for L in kd-a25 kd-base2; do [ -d "$S/a25k/runs/$L" ] && node -e "
const fs=require('fs');for(const l of fs.readFileSync(process.argv[1]+'/rows.jsonl','utf8').split('\n').filter(Boolean)){const r=JSON.parse(l);console.log(r.name.padEnd(18),r.ok?'ok ':'RED',JSON.stringify(r.check||null))}" "$S/a25k/runs/$L" > "$T/gate/an-$L.txt" 2>&1; done
for f in run-k25-a25.log run-kd-a25.log run-k25-base.log run-kd-base2.log; do [ -f "$S/a25k/$f" ] && cp "$S/a25k/$f" "$T/gate/$f.txt"; done
for L in a25-m-landother a25-m-landother-fill a25-n a25-n-third gate-bp gate-a25 a25-k-fill; do (cd "$S/a20" && W=4000 node analyze-a20.wide.mjs "runs/$L" > "$T/gate/an-$L.txt" 2>&1); done
# td77: the lines30 follow-up (stock D x5, traced D gap 30 x60, the failure-detector control, POST holds, the base long
# session) - Main_Designer filed it to the TD-77 row (stage 2)
for L in mxD mxDT dtfail dtd40 dtd60 dtd80 dtd100 dtd120 dtd150 dtd400 dtd800 dtd1500; do
  for s in a20bp a25p; do [ -d "$V/$s-$L" ] && cp_rows "$V/$s-$L" "$T/td77/$s-$L"; [ -f "$S/a20reg/log-$s-$L.txt" ] && cp "$S/a20reg/log-$s-$L.txt" "$T/td77/"; done
done
cp_rows "$V/a20bp-mxT77" "$T/td77/a20bp-mxT77"; cp "$S/a20reg/log-a20bp-mxT77.txt" "$T/td77/"
(cd "$S/a20reg" && R=../verify-editor/runs && node ana-dtrace.mjs $R/a20bp-mxDT $R/a25p-mxDT > "$T/td77/ana-mxDT.txt" 2>&1
 node ana-dtrace.mjs $R/a20bp-dtfail $R/a25p-dtfail --full > "$T/td77/ana-dtfail.txt" 2>&1
 node ana-dtrace.mjs $R/a20bp-dtd150 $R/a25p-dtd150 $R/a20bp-dtd400 $R/a25p-dtd400 $R/a20bp-dtd800 $R/a25p-dtd800 $R/a20bp-dtd1500 $R/a25p-dtd1500 > "$T/td77/ana-dtd-hold.txt" 2>&1
 node ana-dtrace.mjs $R/a20bp-dtd40 $R/a25p-dtd40 $R/a20bp-dtd60 $R/a25p-dtd60 $R/a20bp-dtd80 $R/a25p-dtd80 $R/a20bp-dtd100 $R/a25p-dtd100 $R/a20bp-dtd120 $R/a25p-dtd120 > "$T/td77/ana-dtd-sweep.txt" 2>&1
 node ana-dtrace.mjs $R/a20bp-mxT77 > "$T/td77/ana-mxT77.txt" 2>&1
 node ana-remount.mjs $R/a20bp-mxDT $R/a25p-mxDT $R/a20bp-dtfail $R/a25p-dtfail $R/a20bp-dtd40 $R/a25p-dtd40 $R/a20bp-dtd60 $R/a25p-dtd60 $R/a20bp-dtd80 $R/a25p-dtd80 $R/a20bp-dtd100 $R/a25p-dtd100 $R/a20bp-dtd120 $R/a25p-dtd120 $R/a20bp-dtd150 $R/a25p-dtd150 $R/a20bp-dtd400 $R/a25p-dtd400 $R/a20bp-dtd800 $R/a25p-dtd800 $R/a20bp-dtd1500 $R/a25p-dtd1500 $R/a20bp-mxT77 > "$T/td77/ana-remount.txt" 2>&1)
# hashes and the same-source / oracle outputs
cp <a20acc>/a25-mine.sha256 "$T/hashes/tester-rebuild-dist-a25-v2.sha256"
# (report review 11-09) the same-source run that gated the 18:55 restart, and the 21:53 re-run kept for the filing; the
# full oracle output (all four lines) on the rebuilt tree and the package-only VOID; every probe file's sha256
rm -f "$T/hashes/same-source-a25-v2.out.txt"
cp "$S/a20/same-source-a25-v2.out" "$T/hashes/same-source-a25-v2-1854-gate.out.txt"
cp <a20acc>/same-source-a25-v2.out "$T/hashes/same-source-a25-v2-2153-rerun.out.txt"
cp "$S/a25-report/oracle-a25-v2-full.txt" "$T/hashes/oracle-a25-v2.out.txt"
cp "$S/a25-report/oracle-a25-v2-package-only.txt" "$T/hashes/oracle-a25-v2-package-only.out.txt"
{ cat "$S/a25-report/probe-files.sha256"; echo "# note: the filed scripts/a20m_probe_gate.mjs differs from the hashed original in one line (the island account name replaced by a placeholder)"; } > "$T/hashes/probe-files.sha256"
# (report review 11-09) the read-only DB readings for lines30 (pair 1 mx round 0) and the full-width chain / a20n notes
cp "$S/a25-report/db-lines30.txt" "$T/td77/db-lines30.txt"; cp "$S/a20reg/db-lines30.cjs" "$T/scripts/"
cp "$S/a25-report/h2-frozen.txt" "$T/gate/h2-frozen.txt"
mkdir -p "$T/gate/wide"; cp "$S/a20/gate-a25/wide/"*.txt "$T/gate/wide/"
# scripts (the scratch probes and runners this round; the A-25 kit stays in ops)
for f in run-a25-seq.sh run-a25-chain.sh diff-chain-a25.sh run-par-a25.sh run-undopause-pair-a25-impl.sh same-source-a25.sh run-a25-fill.sh mk-a20m-gate.mjs a20m_probe_gate.mjs redsubset.mjs stopq.sh analyze-a20.mjs analyze-a20.wide.mjs file-a25-evidence.sh; do [ -f "$S/a20/$f" ] && cp "$S/a20/$f" "$T/scripts/"; done
for f in run-reg-a25-impl.sh mk-dtrace.mjs mk-dtrace2.mjs patch-dtrace3.mjs chk-dtrace3.cjs ana-dtrace.mjs ana-remount.mjs run-dtdelay.sh run-dtsweep.sh; do [ -f "$S/a20reg/$f" ] && cp "$S/a20reg/$f" "$T/scripts/"; done
# placeholders for local paths (text files only)
find "$T" -type f \( -name '*.jsonl' -o -name '*.json' -o -name '*.txt' -o -name '*.log' -o -name '*.sh' -o -name '*.mjs' -o -name '*.cjs' -o -name '*.py' -o -name '*.sha256' \) -print0 | xargs -0 sed -i \
  -e 's#<scratch>#<scratch>#g' \
  -e 's#<scratch>#<scratch>#g' \
  -e 's#<session>#<session>#g' \
  -e 's#<session>#<session>#g' \
  -e 's#<a20acc>#<a20acc>#g; s#<a20acc>#<a20acc>#g' \
  -e 's#<a19acc>#<a19acc>#g; s#<a19acc>#<a19acc>#g' \
  -e 's#<ops>#<ops>#g; s#<ops>#<ops>#g; s#<tmp>#<tmp>#g; s#<tmp>#<tmp>#g'
# second pass: Windows backslash paths (and their JSON-escaped twins) the sed rules above miss; the fixer spells the
# local path parts out, so it stays private (not filed)
node "$S/a20/fix-filed-paths.mjs" "$T"
echo "left over local-path mentions (pattern list in the private ops file):"; grep -rIl -f "$LOCALNAMES" "$T" | head
du -sh "$T"; find "$T" -type f | wc -l
