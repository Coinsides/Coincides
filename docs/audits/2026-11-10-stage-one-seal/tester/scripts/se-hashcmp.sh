#!/usr/bin/env bash
# Old matrix 'hash' (builder harness b-matrix25b, arms /^(hash|fine)/ x3, latency 57) - stage-end read 3/78 bad, r2.3c 0/78.
# One more run on the build (A-25 package -> 3615) and one on the A-20b r2 base (package -> 3612), same harness and proxy,
# one browser each, one slot each. Gives build-vs-base counts for the TD / new-finding question.
SE=<scratch>/stage-end
SCR=<scratch>
W=$SCR/a20/withslot.sh; V=$SCR/verify-editor
for m in "build2;<ops>/packages/a25-ime-save-failure/dist/client;3615" "base1;<ops>/packages/a20b-belt-coverage-r2/dist/client;3612"; do
  IFS=';' read -r name pkg up <<< "$m"
  cd $V
  bash $W "stage-end" "old matrix hash $name (builder harness, proxy to $up), one browser" 30 bash -c "
    UPSTREAM=$up node b-proxy-se.mjs $pkg 13172 0 > $SE/logs/proxy-hash-$name.log 2>&1 & PX=\$!; sleep 3
    echo \"start hash-$name bundle \$(curl -s http://127.0.0.1:13172/ | grep -o 'assets/index-[A-Za-z0-9_-]*\.js')\"
    timeout 3600 node b-matrix25b.mjs http://127.0.0.1:13172 $SE/old-hash-$name.json 3 57 '^(hash|fine)' $up > $SE/logs/old-hash-$name.log 2>&1; echo \"hash-$name exit \$?\"
    kill \$PX 2>/dev/null; true"
  tail -1 $SE/logs/old-hash-$name.log | cut -c1-300
done
node -e "
for (const n of ['old-hash','old-hash-build2','old-hash-base1']) { let a; try { a = require('<scratch>/stage-end/' + n + '.json'); } catch { console.log(n, 'missing'); continue; }
  const bad = a.filter((x) => x.ok === false); console.log(n, 'rows', a.length, 'bad', bad.length, bad.map((x) => x.arm + '#' + x.round + ' ' + JSON.stringify(x.server)).join(' | ')); }"
