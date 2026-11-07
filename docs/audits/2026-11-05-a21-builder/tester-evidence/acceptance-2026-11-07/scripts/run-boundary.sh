#!/usr/bin/env bash
L=<home>/.claude/ops/heavy-job.lock
until mkdir "$L" 2>/dev/null; do sleep 20; done
printf 'session: Tester(1)\ntaken: %s\npurpose: editor rework acceptance: gate relaxation boundary check (vitest, 1 file, maxForks=3)\n' "$(date '+%Y-%m-%d %H:%M:%S')" > "$L/owner.txt"
trap 'rm -rf "$L"' EXIT
cd <tmp>/edacc/tree/client
timeout 900 npx vitest run --pool=forks --poolOptions.forks.maxForks=3 src/pages/Notes/canvasEngine/hooks/structureTypingConservation.boundary.test.tsx > <tmp>/edacc/gate-runs/fix-boundary.raw 2>&1; echo "exit $?"
grep -E "BOUNDARY" <tmp>/edacc/gate-runs/fix-boundary.raw | cut -c1-1500
