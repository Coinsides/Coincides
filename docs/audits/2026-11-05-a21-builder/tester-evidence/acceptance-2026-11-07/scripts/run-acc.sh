#!/usr/bin/env bash
# Editor rework acceptance batch. Takes the shared heavy-job lock for the whole batch, releases it on exit.
# Usage: run-acc.sh <probe.mjs> <labelA> <originA> [<labelB> <originB>]   (extra env passes through: ONLY, XROUNDS, REPS, WHERE, ROLE_SAVE, END)
cd "<session-tmp>/scratchpad/verify-editor"
L=<home>/.claude/ops/heavy-job.lock
until mkdir "$L" 2>/dev/null; do sleep 20; done
printf 'session: Tester(1)\ntaken: %s\npurpose: editor rework acceptance: %s %s %s (2 headless browsers max)\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1" "$2" "$4" > "$L/owner.txt"
trap 'rm -rf "$L"' EXIT
export PRESET=a4_portrait
ISLAND=http://127.0.0.1:13002/api
PROBE=$1
echo "start $(date -u +%T) lock taken"
node "$PROBE" "$2" "$3" $ISLAND island > "log-$2.txt" 2>&1 &
A=$!
if [ -n "$4" ]; then node "$PROBE" "$4" "$5" $ISLAND island > "log-$4.txt" 2>&1 & B=$!; fi
wait $A; echo "$2 exit $? $(date -u +%T)"
if [ -n "$4" ]; then wait $B; echo "$4 exit $? $(date -u +%T)"; fi
tail -1 "log-$2.txt"; [ -n "$4" ] && tail -1 "log-$4.txt"
echo "end $(date -u +%T) lock released"
