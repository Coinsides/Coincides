#!/usr/bin/env bash
# Pair runner, takes/releases the heavy-job lock itself. Yields while the pause file exists.
#---------------------------------------------------------------------------------------------------------------------
cd "<session-tmp>/scratchpad/verify-editor"
L=<home>/.claude/ops/heavy-job.lock
P=<home>/.claude/ops/tester-yield.pause
while [ -f "$P" ]; do sleep 15; done
until mkdir "$L" 2>/dev/null; do sleep 20; done
printf 'session: Tester(1)\ntaken: %s\npurpose: editor rework round-2 acceptance: %s %s (2 headless browsers max)\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$3" "$7" > "$L/owner.txt"
trap 'rm -rf "$L"' EXIT
export PRESET=a4_portrait
ISLAND=http://127.0.0.1:13002/api
echo "start $(date -u +%T) lock taken"
env $1 node "$2" "$3" "$4" $ISLAND island > "log-$3.txt" 2>&1 &
A=$!
if [ -n "$6" ]; then env $5 node "$6" "$7" "$8" $ISLAND island > "log-$7.txt" 2>&1 & B=$!; fi
wait $A; echo "$3 exit $? $(date -u +%T)"; tail -1 "log-$3.txt"
if [ -n "$6" ]; then wait $B; echo "$7 exit $? $(date -u +%T)"; tail -1 "log-$7.txt"; fi
echo "end $(date -u +%T) lock released"
