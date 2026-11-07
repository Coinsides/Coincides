#!/bin/bash
S=$(dirname "$0"); cd "$S"
R=/d/Coinsides/v2.x/Coincides
A=$R/docs/audits/2026-11-05-a21-builder/matrix-accept; LOCK="$HOME/.claude/ops/heavy-job.lock"
take() { until mkdir "$LOCK" 2>/dev/null; do sleep 30; done; }
drop() { rmdir "$LOCK"; }
tester() { take; rm -rf "tester-copy/runs/$1"; node matrix_r04.mjs "$1" "http://localhost:$2" http://127.0.0.1:3001/api local "$3" 1 > "r04-$1.log" 2>&1; drop; grep -a -E "^(BAD|SUMMARY)" "r04-$1.log" > "$A/$1.txt"; echo "FINAL $1 $(grep -a -E ^SUMMARY r04-$1.log | cut -c1-400)" >> "$A/summary.txt"; }
own() { take; node matrix24.mjs "http://localhost:$2" "$A/$1.json" "$3" "$4" "$5" > "$A/$1.log" 2>&1; drop; echo "FINAL $1 $(tail -1 "$A/$1.log" | cut -c1-600)" >> "$A/summary.txt"; }
echo "=== FINAL BUILD: only the lines below count ===" >> "$A/summary.txt"
ARMS=N,R,V,D,L,K,H
tester after113 4130 $ARMS
tester after0 4131 $ARMS
own win-after 4134 2 57 '^(win|inject|ctlComp)'
own a24-after 4130 2 57 '^(a24|midHash)'
own hash-after 4130 3 57 '^(hash|fine@45|fine@44|fine@46)'
# Positive controls on a scratch copy.
take; C=<tmp>/a21c/client; cd "$C"
run() { npx vitest run --pool=forks --poolOptions.forks.maxForks=3 src/pages/Notes/canvasEngine/hooks/useHeadingStructureController.test.tsx src/pages/Notes/canvasEngine/hooks/draftFastEnter.test.tsx src/pages/Notes/canvasEngine/headingInputService.draftText.test.ts src/pages/Notes/canvasEngine/hooks/useRuntimeNaturalWritingController.test.tsx 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E "^ +×|Tests " | cut -c1-170; }
OUT=$R/docs/audits/2026-11-05-a21-builder/positive-controls.txt
{ echo "# A-21/A-24 positive controls, final code. Each mutation applied to a scratch copy, never the shared tree."; echo "# [APPLIED] is printed only when the target text was found and replaced."; echo; echo "== unmodified"; run; } > "$OUT"
python ctl.py list | tr -d '\r' | while read -r n; do T=src/pages/Notes/canvasEngine; rm -rf "$T.bak"; cp -r "$T" "$T.bak"; python ctl.py "$n" >> "$OUT" 2>&1 && R2=APPLIED || R2=NOT-APPLIED; { echo; echo "== $n [$R2]"; run; } >> "$OUT"; rm -rf "$T"; mv "$T.bak" "$T"; done
drop
# Client full.
take; cd "$R/client"; npx vitest run --pool=forks --poolOptions.forks.maxForks=3 > "$R/docs/audits/2026-11-05-a21-builder/client-full.raw.txt" 2>&1; drop
sed 's/\x1b\[[0-9;]*m//g' "$R/docs/audits/2026-11-05-a21-builder/client-full.raw.txt" | grep -E "^ +×|FAIL|Tests |Test Files " | cut -c1-200 > "$R/docs/audits/2026-11-05-a21-builder/client-full.txt"
echo "=== done3 ===" >> "$A/summary.txt"
