#!/usr/bin/env bash
# Stage-end slot-2 step 5 again (the first try never ran: the arm regexes contain '|', which was also the field
# separator). Old matrices = the builder harness b-matrix25b (win / inject, a24, hash / fine) through the loopback proxy
# b-proxy-se (UPSTREAM 3615) serving the A-25 package's dist (== the island 63/63), one browser per matrix, one slot each.
SE=<scratch>/stage-end
SCR=<scratch>
W=$SCR/a20/withslot.sh; V=$SCR/verify-editor
PKG=<ops>/packages/a25-ime-save-failure/dist/client
cd $V
for m in "win;^(win|ctl|inject_);2" "a24;^(midHash|a24);2" "hash;^(hash|fine);3"; do
  IFS=';' read -r name rx reps <<< "$m"
  echo "== $name: arms /$rx/ x$reps $(date +%T)"
  bash $W "stage-end" "old matrix $name (builder harness, loopback proxy to 3615), one browser" 40 bash -c "
    UPSTREAM=3615 node b-proxy-se.mjs $PKG 13171 0 > $SE/logs/proxy-$name.log 2>&1 & PX=\$!; sleep 3
    echo \"start $name bundle \$(curl -s http://127.0.0.1:13171/ | grep -o 'assets/index-[A-Za-z0-9_-]*\.js')\"
    timeout 3600 node b-matrix25b.mjs http://127.0.0.1:13171 $SE/old-$name.json $reps 57 '$rx' 3615 > $SE/logs/old-$name.log 2>&1; echo \"$name exit \$?\"
    kill \$PX 2>/dev/null"
  tail -2 $SE/logs/old-$name.log | cut -c1-400
done
echo "old matrices done $(date +%T)"
