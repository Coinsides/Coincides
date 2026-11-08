#!/usr/bin/env bash
# A-19: 1a original-page regression with the 1a-B harness, Tester(1). One browser at a time, inside the shared lock.
#   arm a = fdeacb5d client (vite 5581) + fdeacb5d server (3594);  arm b = fdeacb5d + package client (vite 5582) +
#   fdeacb5d + package server (3595). Both backends use the harness's converter ctl dir. Output: verify-p2/run/out.
L=<home>/.claude/ops/heavy-job.lock; P=<home>/.claude/ops/tester-yield.pause
H=<session-tmp>/scratchpad/verify-p2/harness
( while [ -f "$P" ]; do sleep 15; done; until mkdir "$L" 2>/dev/null; do sleep 20; done
  printf 'session: Tester(1)\ntaken: %s\npurpose: A-19 1a regression, 8 groups x 2 arms x 2 reps, 1 browser at a time\n' "$(date '+%Y-%m-%d %H:%M:%S')" > "$L/owner.txt"
  trap 'rm -rf "$L"' EXIT
  cd "$H"
  for g in n1 pagestabs pagesback textpos entries focus notice td1; do
    for arm in a b; do
      be=3594; [ "$arm" = b ] && be=3595
      echo "== $g arm $arm start $(date -u +%T)"
      timeout 3600 node run.mjs $g --arms $arm --backend $be --reps 2 > "../run/logs/1a-$g-$arm.log" 2>&1
      echo "== $g arm $arm exit $? $(date -u +%T)"; grep -E " -> " "../run/logs/1a-$g-$arm.log" | sed 's/^\[[0-9:]*\] //' | cut -c1-160
    done
  done
  echo "1a regression done $(date -u +%T)" )
