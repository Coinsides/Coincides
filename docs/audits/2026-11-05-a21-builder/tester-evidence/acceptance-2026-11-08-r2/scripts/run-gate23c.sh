#!/usr/bin/env bash
# Round-2 conservation gate and unit checks, Tester(1). Three lock steps; each yields first while the pause file exists
# and takes/releases the lock inside one subshell with a trap.
#   r2     = 9bc45e69 + the 22 package files (edacc/tree-r23c), dist 63/63 = package
#   pure21 = 9bc45e69 + round-1's 21 files (edacc/tree)
#   frozen = f7dd74ac + the 15 frozen files (edacc/frozen-gate)
L=<home>/.claude/ops/heavy-job.lock
P=<home>/.claude/ops/tester-yield.pause
E=<tmp>/edacc; OUT=$E/gate-runs-r23c; mkdir -p $OUT
V="npx vitest run --pool=forks --poolOptions.forks.maxForks=3"
K=src/pages/Notes/canvasEngine/hooks
lock() { while [ -f "$P" ]; do sleep 15; done; until mkdir "$L" 2>/dev/null; do sleep 20; done
  printf 'session: Tester(1)\ntaken: %s\npurpose: editor rework r2.3c: %s (vitest maxForks=3)\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1" > "$L/owner.txt"; }
( lock "conservation gate, mirrors, boundary mutant, real-adapter x3"; trap 'rm -rf "$L"' EXIT
  cd $E/tree-r23c/client
  echo "== r2: gate as shipped (7 scripts + boundary control + 40 seeds)"; timeout 1500 $V $K/structureTypingConservation.test.tsx > $OUT/r2-gate40.raw 2>&1; echo "exit $?"
  echo "== r2: my 8 benign mirrors"; CONSERVE_SEEDS=0 timeout 900 $V $K/structureTypingConservation.mirrors.test.tsx > $OUT/r2-mirrors.raw 2>&1; echo "exit $?"
  echo "== r2: boundary assertion switched off (control must turn red)"; CONSERVE_SEEDS=0 timeout 900 $V $K/structureTypingConservation.mutNoBoundary.test.tsx -t "boundary" > $OUT/r2-mutNoBoundary.raw 2>&1; echo "exit $?"
  echo "== r2: real-adapter K1 test x3"; for i in 1 2 3; do timeout 600 $V $K/headingStructureWatchdog.realAdapter.test.tsx > $OUT/r2-realAdapter-$i.raw 2>&1; echo "run $i exit $?"; done
  echo "step 1 done $(date -u +%T)" )
( lock "pure21 real-adapter control, round-2 gate on frozen code"; trap 'rm -rf "$L"' EXIT
  cd $E/tree/client
  echo "== pure21: real-adapter K1 test (must be red)"; timeout 600 $V $K/headingStructureWatchdog.realAdapter.r23ccopy.test.tsx > $OUT/pure21-realAdapter.raw 2>&1; echo "exit $?"
  cd $E/frozen-gate/client
  echo "== frozen: round-2 gate, scripts + boundary control"; CONSERVE_SEEDS=0 timeout 900 $V $K/structureTypingConservation.r23cgate.test.tsx > $OUT/frozen-r2gate-scripts.raw 2>&1; echo "exit $?"
  echo "== frozen: round-2 gate, 40 seeds"; CONSERVE_SEEDS=40 timeout 1500 $V $K/structureTypingConservation.r23cgate.test.tsx -t "seeded sequences" > $OUT/frozen-r2gate-seeds40.raw 2>&1; echo "exit $?"
  echo "step 2 done $(date -u +%T)" )
# Step 3: client full suite on the r2.3c tree.
( lock "client full suite on r2.3c tree"; trap 'rm -rf "$L"' EXIT
  cd $E/tree-r23c/client
  # My own test files out of the tree first, so the full suite is the package's files only.
  mkdir -p $E/stash-r23c && mv $K/structureTypingConservation.mutNoBoundary.test.tsx $K/structureTypingConservation.mirrors.test.tsx $E/stash-r23c/ 2>/dev/null
  echo "== r2: client full suite"; timeout 2400 $V > $OUT/r2-client-full.raw 2>&1; echo "exit $?"
  grep -E "Test Files|Tests  " $OUT/r2-client-full.raw | tail -2
  echo "step 3 done $(date -u +%T)" )
echo "gate done $(date -u +%T)"
