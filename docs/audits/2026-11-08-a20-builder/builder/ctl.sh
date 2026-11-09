#!/bin/bash
# Positive controls: the A-20 tests copied onto the frozen 04f6f822 copy, run there, then the copy is restored.
T=<tmp>/a20; R=src/pages/Notes/canvasEngine; D=<scratch>/a20
FILES="$R/textFlowEditSession.test.ts $R/hooks/useTextFlowHistory.test.tsx $R/hooks/useNoteRouteSaveBoundary.leave.test.tsx $R/draftBlockPersistence.test.ts $R/hooks/useNoteCanvasDataAdapter.test.tsx $R/hooks/structureTypingConservation.test.tsx"
mkdir -p $D/ctl-keep; for f in $FILES; do [ -f $T/base/client/$f ] && cp $T/base/client/$f $D/ctl-keep/$(basename $f); cp $T/work/client/$f $T/base/client/$f; done
cd $T/base/client
run() { echo "=== $1"; timeout 900 npx vitest run --pool=forks --poolOptions.forks.maxForks=3 $2 -t "$3" 2>&1 | grep -aE "✓|×|Tests |→|UNSAVED AT UNLOAD|LOST" | sed 's/\x1b\[[0-9;]*m//g'; }
run "peek (session)" $R/textFlowEditSession.test.ts "peek reads the open group"
run "idle save (text history)" $R/hooks/useTextFlowHistory.test.tsx "A-20 idle save"
run "leave guard (route boundary)" $R/hooks/useNoteRouteSaveBoundary.leave.test.tsx "A-20 departures"
run "receipt storage" $R/draftBlockPersistence.test.ts "A-20 block edit receipts"
run "late reply receipt (adapter)" $R/hooks/useNoteCanvasDataAdapter.test.tsx "forgets the receipt of a save that succeeds"
run "conservation gate, relaxation removed" $R/hooks/structureTypingConservation.test.tsx ""
for f in $FILES; do b=$(basename $f); if [ -f $D/ctl-keep/$b ]; then cp $D/ctl-keep/$b $T/base/client/$f; else rm -f $T/base/client/$f; fi; done
echo "=== restored base copy"
