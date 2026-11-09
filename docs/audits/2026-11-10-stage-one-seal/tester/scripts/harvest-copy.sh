#!/usr/bin/env bash
# Copy the stage-end evidence into the repo audit folder (Tester(1) 2026-11-10). rows.jsonl + summary.json per run,
# analyzer notes, gate outputs, selected screenshots, scripts, extracts of the big logs. No credentials (cred dirs are
# never copied), no full server logs (multi-MB; failure blocks extracted instead).
set -u
SE=<scratch>/stage-end
V=<scratch>/verify-editor
R=<scratch>/a20reg
K=<ops>/tester-kit
D=<repo>/docs/audits/2026-11-10-stage-one-seal/tester
mkdir -p $D/runs $D/pairs $D/gate $D/logs $D/scripts $D/shots $D/matrices
cp $SE/PLAN.md $SE/plan-raw.json $D/
cp $SE/se-build.sha256 $D/se-build.sha256
# stage-end runs (k25, D, chain, a20n, new arms, smokes, pair 10, A-19 was logged only)
for d in $SE/runs/*; do n=$(basename $d); [ "$n" = neg-imeg ] && continue; mkdir -p $D/runs/$n; for f in rows.jsonl summary.json diag.json rows-orphan-0303.jsonl NOTE-orphan.txt; do [ -f $d/$f ] && cp $d/$f $D/runs/$n/; done; done
# verify-editor runs (pairs, r2.3c chain, void arms, island, human speed, re-read)
for n in se-mx se-acc18 se-acc13 se-two2 se-y se-acc10 se-acc11 se-acc1 se-acc8x se-K se-K45 se-acc6 se-acc7 se-acc4 se-acc9 se-J se-acc15 se-retry se-geo se-ban se-geo9 se-acc18v se-banv isl-hl isl-nb2 se-hum isl-hum se-hum-apply isl-hum-apply se-acc10i se-acc11i se-acc13i; do
  [ -d $V/runs/$n ] || continue; mkdir -p $D/pairs/$n; for f in rows.jsonl summary.json; do [ -f $V/runs/$n/$f ] && cp $V/runs/$n/$f $D/pairs/$n/; done; done
# screenshots that carry a reading
for f in isl-hum/HLH-gap250-0-reopened.jpg isl-hum/NB2H-gap400-0-reopened.jpg se-acc10/HL-saveNotSentThenClose-0-reopened.jpg se-acc13/N-b2-headingAboveLineSameWord-0-reopened.jpg; do cp $V/runs/$f $D/shots/$(echo $f | tr '/' '_'); done
cp $SE/runs/se-smoke/SM-binding.jpg $D/shots/se-smoke_SM-binding-first-run.jpg 2>/dev/null
cp -r $SE/gate/. $D/gate/
cp $SE/an-se-k25.txt $D/gate/ 2>/dev/null
cp $SE/old-*.json $D/matrices/ 2>/dev/null
# logs: sequence logs and extracts
for f in se-seq1.log se-par2.log se-island.log se-void.log se-voidfix.log se-oldmx.log se-hashcmp.log se-newarms2.log se-at-rev.log se-smoke.log se-smoke-fix.log se-human.log se-apply.log se-mfill.log; do [ -f $SE/$f ] && cp $SE/$f $D/logs/; done
for f in a19-img.log a19-unread.log a19-lineage.log a19-residue.log run-se-k25.log run-se-kd.log se-build-vs-island.diff; do [ -f $SE/logs/$f ] && cp $SE/logs/$f $D/logs/; done
tail -40 $SE/logs/client-full.log > $D/logs/client-full-tail.txt
for n in server-full server-full-2; do grep -n -B2 -A22 "^not ok [0-9]* - " $SE/logs/$n.log | grep -v "^[0-9]*-#   ✅" > $D/logs/$n-failures.txt; grep "\[server-test-suite\]" $SE/logs/$n.log >> $D/logs/$n-failures.txt; done
grep -E "^not ok|^# (tests|pass|fail) " $SE/logs/server-mineru-alone.log > $D/logs/server-mineru-alone.txt 2>/dev/null
cp $SE/server-v2-files.txt $D/logs/
# scripts
cp $SE/*.sh $SE/count-void.mjs $SE/reread-items.mjs $SE/island-health.mjs $D/scripts/
cp $R/hum_body.mjs $R/mk-voidfix.mjs $R/mk-items.mjs $D/scripts/
cp $K/a25/a25d_body.next.mjs $D/scripts/a25d_body.stage-end.mjs; cp $K/a25/smoke_body.mjs $K/a25/smoke_diag_tail.mjs $K/a25/compare-imeg.mjs $D/scripts/
cp $K/a20/analyze-a20.mjs $D/scripts/analyze-a20.stage-end.mjs
du -sh $D; find $D -type f | wc -l
