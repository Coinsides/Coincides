#!/bin/bash
# usage: run.sh <tag> <samples> <armRegex> [script]   Starts the scratch server + proxy, runs a probe, stops both.
D=$(cd "$(dirname "$0")" && pwd); cd $D
export A20_PASS=$(node -e "console.log(require('crypto').randomBytes(12).toString('hex'))")
node server.mjs > server-$1.log 2>&1 & S=$!
node proxy.mjs ${DIST:-$D/dist-base} 4201 57 > proxy-$1.log 2>&1 & P=$!
trap 'kill $P 2>/dev/null; taskkill //F //T //PID $(cat /proc/$S/winpid 2>/dev/null) >/dev/null 2>&1; kill $S 2>/dev/null' EXIT
for i in $(seq 1 60); do curl -s -o /dev/null http://127.0.0.1:3001/api/health && break; sleep 1; done
node ${4:-probe.mjs} http://127.0.0.1:4201 $D/out-$1.json $2 "$3" > probe-$1.log 2>&1
tail -1 probe-$1.log
