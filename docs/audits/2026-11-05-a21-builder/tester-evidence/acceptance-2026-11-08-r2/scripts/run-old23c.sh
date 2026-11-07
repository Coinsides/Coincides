#!/usr/bin/env bash
# Old matrices on the r2.3c package, on the builder's scratch backend (3001),
# one browser at a time. Each matrix takes and releases the shared lock on its own, and yields first while the pause
# file exists, so the builder can get the lock between matrices. My own proxy instance (builder's round-2
# proxy-fail2.mjs, unchanged) on 13171, delay 0, only while a matrix runs. matrix25b = the builder's corrected per-note
# harness, 57 ms latency through CDP as in its runs. r04@0 = my round-04 sequences N,R,V,D,L,K,H.
cd "<session-tmp>/scratchpad/verify-editor"
L=<home>/.claude/ops/heavy-job.lock
P=<home>/.claude/ops/tester-yield.pause
OUT=<tmp>/edacc/old-matrices-r23c; mkdir -p $OUT
step() { # step <label> <command...>: lock, proxy up, run, proxy down, unlock — all inside one subshell with a trap
  ( while [ -f "$P" ]; do sleep 15; done
    until mkdir "$L" 2>/dev/null; do sleep 20; done
    printf 'session: Tester(1)\ntaken: %s\npurpose: editor rework r2.3c: old matrix %s, 1 browser, scratch backend 3001\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1" > "$L/owner.txt"
    node b-proxy-fail2.mjs <tmp>/edacc/dist-r23c 13171 0 >> $OUT/proxy.log 2>&1 &
    PX=$!
    trap 'kill $PX 2>/dev/null; rm -rf "$L"' EXIT
    sleep 3
    echo "start $1 $(date -u +%T) bundle $(curl -s http://127.0.0.1:13171/ | grep -o 'assets/index-[A-Za-z0-9_-]*\.js')"
    shift; "$@"; echo "exit $? $(date -u +%T)" )
}
step r04@0 bash -c "node matrix-3001.mjs r23c-r04-0 http://localhost:13171 http://127.0.0.1:3001/api local N,R,V,D,L,K,H > $OUT/r04-0.log 2>&1"
grep SUMMARY $OUT/r04-0.log | cut -c1-400
step win bash -c "node b-matrix25b.mjs http://localhost:13171 $OUT/win.json 2 57 '^(win|ctl|inject_)' 3001 > $OUT/win.log 2>&1"
tail -1 $OUT/win.log | cut -c1-600
step a24 bash -c "node b-matrix25b.mjs http://localhost:13171 $OUT/a24.json 2 57 '^(midHash|a24)' 3001 > $OUT/a24.log 2>&1"
tail -1 $OUT/a24.log | cut -c1-600
step hash bash -c "node b-matrix25b.mjs http://localhost:13171 $OUT/hash.json 3 57 '^(hash|fine)' 3001 > $OUT/hash.log 2>&1"
tail -1 $OUT/hash.log | cut -c1-600
echo "old matrices done $(date -u +%T)"
