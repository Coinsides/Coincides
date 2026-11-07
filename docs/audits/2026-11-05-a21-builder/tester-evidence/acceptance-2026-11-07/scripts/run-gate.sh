#!/usr/bin/env bash
# Conservation gate positive control, Tester(1). Frozen = f7dd74ac + the 15 frozen files (hashes checked) + the fix's gate
# test; fix = 9bc45e69 + the 21 files of the receipt. Mirrors = the same scripts with the trigger removed (my own file).
L=<home>/.claude/ops/heavy-job.lock
until mkdir "$L" 2>/dev/null; do sleep 20; done
printf 'session: Tester(1)\ntaken: %s\npurpose: editor rework acceptance: conservation gate positive control (vitest, maxForks=3)\n' "$(date '+%Y-%m-%d %H:%M:%S')" > "$L/owner.txt"
trap 'rm -rf "$L"' EXIT
OUT=<tmp>/edacc/gate-runs; mkdir -p $OUT
V="npx vitest run --pool=forks --poolOptions.forks.maxForks=3"
cd <tmp>/edacc/frozen-gate/client
echo "== frozen: 7 known-loss scripts"; CONSERVE_SEEDS=0 timeout 900 $V src/pages/Notes/canvasEngine/hooks/structureTypingConservation.test.tsx > $OUT/frozen-scripts.raw 2>&1; echo "exit $?"
echo "== frozen: 8 benign mirrors"; CONSERVE_SEEDS=0 timeout 900 $V src/pages/Notes/canvasEngine/hooks/structureTypingConservation.mirrors.test.tsx > $OUT/frozen-mirrors.raw 2>&1; echo "exit $?"
echo "== frozen: 40 seeds (sensitivity)"; CONSERVE_SEEDS=40 timeout 1200 $V src/pages/Notes/canvasEngine/hooks/structureTypingConservation.test.tsx -t "seeded sequences" > $OUT/frozen-seeds40.raw 2>&1; echo "exit $?"
echo "== frozen: fix's controller test, H case only"; cp <tmp>/edacc/tree/client/src/pages/Notes/canvasEngine/hooks/useHeadingStructureController.test.tsx src/pages/Notes/canvasEngine/hooks/useHeadingStructureController.fixcopy.test.tsx; timeout 600 $V src/pages/Notes/canvasEngine/hooks/useHeadingStructureController.fixcopy.test.tsx -t "a page going away" > $OUT/frozen-H-unit.raw 2>&1; echo "exit $?"
cd <tmp>/edacc/tree/client
echo "== fix: gate, 7 scripts + 40 seeds"; timeout 1500 $V src/pages/Notes/canvasEngine/hooks/structureTypingConservation.test.tsx > $OUT/fix-gate40.raw 2>&1; echo "exit $?"
echo "== fix: 8 benign mirrors"; CONSERVE_SEEDS=0 timeout 900 $V src/pages/Notes/canvasEngine/hooks/structureTypingConservation.mirrors.test.tsx > $OUT/fix-mirrors.raw 2>&1; echo "exit $?"
echo "== fix: controller H case"; timeout 600 $V src/pages/Notes/canvasEngine/hooks/useHeadingStructureController.test.tsx -t "a page going away" > $OUT/fix-H-unit.raw 2>&1; echo "exit $?"
echo "done $(date -u +%T), lock released"
