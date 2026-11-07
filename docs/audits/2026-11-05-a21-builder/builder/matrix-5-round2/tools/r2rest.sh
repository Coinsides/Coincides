#!/bin/bash
# Round 2: everything the broken matrix copies lost, all with the per-note harness (matrix25b / classifyb), same r2 dist.
A=<scratch>/a18
F=<tmp>/ed21-evidence/r2final; E=$F/per-note; H=$F/harness-control; mkdir -p $E $H; cd $A
(sha256sum $(find dist-r2 -type f | sort)) | diff - $F/dist-r2.sha256 > /dev/null && echo "r2 dist = final run's dist" > $E/summary.txt || echo "R2 DIST DIFFERS" > $E/summary.txt
node proxy-fail2.mjs $A/dist-r2 4152 57 > $E/p4152.log 2>&1 & P1=$!
node proxy-fail2.mjs $A/dist-edfrozen 4151 57 > $E/p4151.log 2>&1 & P2=$!
node proxy-fail2.mjs $A/dist-before 4154 57 > $E/p4154.log 2>&1 & P3=$!
node proxy-fail2.mjs $A/dist-edfix 4150 57 > $E/p4150.log 2>&1 & P4=$!
trap 'kill $P1 $P2 $P3 $P4 2>/dev/null' EXIT; sleep 2
# Harness positive control first: a really lost row (frozen, slow reply + unload) with the words planted under another note.
SEED_OTHER=1 node matrix25.mjs http://localhost:4151 $H/old-harness.json 2 57 '^enter_slowReplyUnload$' > $H/old-harness.log 2>&1
SEED_OTHER=1 node matrix25b.mjs http://localhost:4151 $H/new-harness.json 2 57 '^enter_slowReplyUnload$' > $H/new-harness.log 2>&1
{ node classify.mjs $H/old-harness.json; node classifyb.mjs $H/new-harness.json; } > $H/summary.txt 2>&1
for t in r2:4152 frozen:4151 before:4154 pure:4150; do n=${t%%:*}; p=${t##*:}
  node matrix25b.mjs http://localhost:$p $E/enter-$n.json 2 57 '^enter_' > $E/enter-$n.log 2>&1; done
for t in r2:4152 frozen:4151 pure:4150; do n=${t%%:*}; p=${t##*:}
  node matrix25b.mjs http://localhost:$p $E/hl-$n.json 3 57 '^h_HL$' > $E/hl-$n.log 2>&1; done
STALL_SKIP=2 node matrix25b.mjs http://localhost:4151 $E/k-frozen.json 2 57 '^k_' > $E/k-frozen.log 2>&1
node matrix25b.mjs http://localhost:4152 $E/h-proxy-r2.json 2 57 '^h_landed' > $E/h-proxy-r2.log 2>&1
node classifyb.mjs $E/enter-r2.json $E/enter-frozen.json $E/enter-before.json $E/enter-pure.json $E/hl-r2.json $E/hl-frozen.json $E/hl-pure.json $E/k-frozen.json $E/h-proxy-r2.json $F/k-r2.json >> $E/summary.txt 2>&1
(sha256sum $(find dist-r2 -type f | sort)) | diff - $F/dist-r2.sha256 > /dev/null && echo "dist unchanged" >> $E/summary.txt || echo "DIST CHANGED" >> $E/summary.txt
echo "=== r2rest done $(date '+%F %T') ===" >> $E/summary.txt
