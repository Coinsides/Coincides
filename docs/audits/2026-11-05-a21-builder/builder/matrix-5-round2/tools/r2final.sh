#!/bin/bash
# Round 2 final: rebuild from ed21, type check, client full (with the gate's 40 seeds), checks; then the injection
# matrix on r2 / frozen / pre-A-18, K arms (with the 25 s arm) on r2 / frozen, 3b arms on r2, r04@57 on r2.
A=<scratch>/a18
E=<tmp>/ed21-evidence/r2final; mkdir -p $E; R=<tmp>/ed21; C=$R/client
cd $C && rm -rf $A/dist-r2 && timeout 900 npx vite build --outDir $A/dist-r2 --emptyOutDir > $E/build.log 2>&1; echo build exit $? > $E/summary.txt
(cd $A && sha256sum $(find dist-r2 -type f | sort)) > $E/dist-r2.sha256
node node_modules/typescript/bin/tsc --noEmit -p . > $E/tsc.txt 2>&1; echo tsc exit $? >> $E/summary.txt
npx vitest run --pool=forks --poolOptions.forks.maxForks=3 > $E/client-full.raw 2>&1; echo client $(grep -a -E 'Tests ' $E/client-full.raw | tail -1) >> $E/summary.txt
grep -a "UNSAVED AT UNLOAD" $E/client-full.raw | head -1 | cut -c1-300 >> $E/summary.txt
cd $R && for c in check:canvas-runtime-boundary check:source-experience check:owned-helper-contract; do npm run -s $c > $E/$c.txt 2>&1; echo $c exit $? >> $E/summary.txt; done
cd $A
node proxy-fail2.mjs $A/dist-r2 4152 57 > $E/p4152.log 2>&1 & P1=$!
node proxy-fail2.mjs $A/dist-edfrozen 4151 57 > $E/p4151.log 2>&1 & P2=$!
node proxy-fail2.mjs $A/dist-before 4154 57 > $E/p4154.log 2>&1 & P3=$!
node proxy.mjs $A/dist-r2 4155 57 > $E/p4155.log 2>&1 & P4=$!
node proxy-fail2.mjs $A/dist-edfix 4150 57 > $E/p4150.log 2>&1 & P5=$!
trap 'kill $P1 $P2 $P3 $P4 $P5 2>/dev/null' EXIT; sleep 2
for t in r2:4152 frozen:4151 before:4154; do n=${t%%:*}; p=${t##*:}
  node matrix25.mjs http://localhost:$p $E/enter-$n.json 2 57 '^enter_' > $E/enter-$n.log 2>&1; done
STALL_SKIP=1 node matrix25.mjs http://localhost:4152 $E/k-r2.json 2 57 '^k_' > $E/k-r2.log 2>&1
STALL_SKIP=2 node matrix25.mjs http://localhost:4151 $E/k-frozen.json 2 57 '^k_' > $E/k-frozen.log 2>&1
node matrix25.mjs http://localhost:4152 $E/h-r2.json 3 57 '^h_' > $E/h-r2.log 2>&1
node matrix25.mjs http://localhost:4151 $E/hl-frozen.json 3 57 '^h_HL$' > $E/hl-frozen.log 2>&1
node matrix25.mjs http://localhost:4150 $E/hl-pure.json 3 57 '^h_HL$' > $E/hl-pure.log 2>&1
rm -rf tester-copy/runs/r2final57; node matrix_r04.mjs r2final57 http://localhost:4155 http://127.0.0.1:3001/api local N,R,V,D,L,K,H 1 > $E/r04-r2final57.log 2>&1
cp tester-copy/runs/r2final57/rows.jsonl $E/r2final57.rows.jsonl 2>/dev/null; echo "r04 $(grep -a -E ^SUMMARY $E/r04-r2final57.log | cut -c1-400)" >> $E/summary.txt
(cd $A && sha256sum $(find dist-r2 -type f | sort)) | diff - $E/dist-r2.sha256 > /dev/null && echo "dist unchanged during runs" >> $E/summary.txt || echo "DIST CHANGED during runs" >> $E/summary.txt
node classify.mjs $E/enter-r2.json $E/enter-frozen.json $E/enter-before.json $E/k-r2.json $E/k-frozen.json $E/h-r2.json $E/hl-frozen.json $E/hl-pure.json >> $E/summary.txt 2>&1
echo "=== r2final done $(date '+%F %T') ===" >> $E/summary.txt
