#!/usr/bin/env bash
# Focused count for the only arm that is red on the build and not on the base so far: old matrix hash@300 (builder
# harness, latency 57), x12 on the build (A-25 package -> 3615) and x12 on the A-20b r2 base (-> 3612), one browser,
# one slot each.
SE=<scratch>/stage-end
SCR=<scratch>
W=$SCR/a20/withslot.sh; V=$SCR/verify-editor
for m in "build;<ops>/packages/a25-ime-save-failure/dist/client;3615" "base;<ops>/packages/a20b-belt-coverage-r2/dist/client;3612"; do
  IFS=';' read -r name pkg up <<< "$m"
  cd $V
  bash $W "stage-end" "old matrix hash@300 x12 $name (proxy to $up), one browser" 15 bash -c "
    UPSTREAM=$up node b-proxy-se.mjs $pkg 13173 0 > $SE/logs/proxy-h300-$name.log 2>&1 & PX=\$!; sleep 3
    echo \"start h300-$name bundle \$(curl -s http://127.0.0.1:13173/ | grep -o 'assets/index-[A-Za-z0-9_-]*\.js')\"
    timeout 1800 node b-matrix25b.mjs http://127.0.0.1:13173 $SE/old-h300-$name.json 12 57 '^hash@300' $up > $SE/logs/old-h300-$name.log 2>&1; echo \"h300-$name exit \$?\"
    kill \$PX 2>/dev/null; true"
done
node -e "
for (const n of ['old-h300-build','old-h300-base']) { let a; try { a = require('<scratch>/stage-end/' + n + '.json'); } catch { console.log(n, 'missing'); continue; }
  const bad = a.filter((x) => x.ok === false); console.log(n, 'rows', a.length, 'bad', bad.length, bad.map((x) => '#' + x.round + ' ' + JSON.stringify(x.server)).join(' | ')); }"
