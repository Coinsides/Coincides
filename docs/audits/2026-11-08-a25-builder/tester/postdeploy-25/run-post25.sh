#!/usr/bin/env bash
# After the 25th deploy (A-25, main JS index-4nEsyJNA.js): island hash check against the A-25 package's dist/client (63
# files; stop on a main JS mismatch), then representative arms on the island front through the tunnel (127.0.0.1:13002),
# one browser, MY island test account only (ACCOUNT=island = the t1.r04 test account in <ops>/island-test-accounts.md;
# never Henry's account). Each arm x1 (Main_Designer's list 11-09):
#   A-25 kit a25_probe: IME-new (one row), SAVEFAIL-500-direct (gates a..e incl. zero failure toasts), ONEFAIL-500
#   A-25 kit a25d_probe: D-anchor (the second writer is the same test account through the island API)
#   a20n HEADCLOSE-putback (the conflict-item form, ruled at :188), a20e K1-close, a20_probe IDLE
# Expected = the A-25 acceptance readings (all green; putback = Apply -> conflict item, aaa only there).
# Failures / holds happen inside the test browser (CDP Fetch); the island only sees ordinary requests or none.
S=<scratch>
V=$S/verify-editor; K=<ops>/tester-kit/a25; cd $S/a20
EXP=<a20acc>/a20-island-expected-a25.sha256
O=http://127.0.0.1:13002; API=$O/api
echo "health $(curl -s --max-time 10 -o /dev/null -w '%{http_code}' $API/health)"
bash $V/island-hash.sh post25 $EXP
MAIN=$(curl -s --max-time 15 $O/ | grep -o 'assets/index-[A-Za-z0-9_-]*\.js' | head -1)
if [ "$MAIN" != "assets/index-4nEsyJNA.js" ]; then echo "ISLAND MAIN IS $MAIN, NOT THE ACCEPTED BUILD - stopping"; exit 3; fi
[ -n "$HASHONLY" ] && { echo "hash only, done"; exit 0; }
mkdir -p $S/a25k
bash withslot.sh "A-25" "post-deploy 25 representative arms on the island (my test account); one browser" 30 bash -c "
  export PRESET=a4_portrait CDPPORT=9680 REPS=1 OUTDIR=$S/a25k CREDROOT=<a20acc>/cred-island25
  ONLY=IME-new REPS_IME=1 timeout 900 node $K/a25_probe.mjs post25-ime $O $API island > $S/a25k/run-post25-ime.log 2>&1; echo \"ime exit \$?\"
  ONLY=SAVEFAIL-500-direct,ONEFAIL-500 timeout 900 node $K/a25_probe.mjs post25-save $O $API island > $S/a25k/run-post25-save.log 2>&1; echo \"save exit \$?\"
  ONLY=D-anchor REPS_D=1 timeout 900 node $K/a25d_probe.mjs post25-d $O $API island > $S/a25k/run-post25-d.log 2>&1; echo \"d exit \$?\"
  [ -n \"$KITONLY\" ] || { ONLY=HEADCLOSE-putback timeout 900 node a20n_probe.mjs post25-n $O $API island > runs-post25-n.log 2>&1; echo \"n exit \$?\"
  ONLY=K1-close timeout 600 node a20e_probe.mjs post25-k $O $API island > runs-post25-k.log 2>&1; echo \"k exit \$?\"
  ONLY=IDLE timeout 600 node a20_probe.mjs post25-a $O $API island > runs-post25-a.log 2>&1; echo \"a exit \$?\"; }"
for L in post25-ime post25-save; do echo "#### $L"; node $K/analyze-a25.mjs $S/a25k/runs/$L 2>&1 | cut -c1-400 | head -12; done
echo "#### post25-d"; node -e "
const fs=require('fs');for(const l of fs.readFileSync(process.argv[1]+'/rows.jsonl','utf8').split('\n').filter(Boolean)){const r=JSON.parse(l);console.log(r.name.padEnd(14),r.ok?'ok ':'RED',JSON.stringify(r.check||null),r.error?('ERR '+r.error.slice(0,100)):'')}" $S/a25k/runs/post25-d
for L in post25-n post25-k post25-a; do [ -d runs/$L ] || continue; echo "#### $L"; W=4000 node analyze-a20.wide.mjs runs/$L 2>&1 | tail -8 | cut -c1-900; done
echo "post-deploy 25 done $(date +%T)"
