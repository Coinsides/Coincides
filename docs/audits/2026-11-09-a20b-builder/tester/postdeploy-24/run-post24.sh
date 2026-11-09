#!/usr/bin/env bash
# After the 24th deploy (A-20b r2): island hash check against the A-20b r2 package's dist/client (stop on a main JS mismatch), then
# representative arms on the island front through the tunnel (127.0.0.1:13002), one browser, MY island test account only
# (ACCOUNT=island = the t1.r04 test account in <ops>/island-test-accounts.md; never Henry's account). Each arm x1:
#   a20_probe IDLE (the idle save), a20e K1-close (close with words in flight), a20n HEADCLOSE-plain, HEADCLOSE-applyslow (req
#   form), MENTER-close, ADDR-noncanon-case ('#/Notes/<id>'), N6B-switch. Expected = the A-20b r2 readings (all green). NEWARMS=1 adds SHIFTENTER-typed-close, MULTIPASTE-close, ADDR-noncanon-bare (x1 each).
# Holds / delays happen inside the test browser (CDP Fetch); the island only sees ordinary requests or none.
S=<scratch>
V=$S/verify-editor; cd $S/a20
EXP=<a20acc>/a20-island-expected-a20b-r2.sha256
O=http://127.0.0.1:13002; API=$O/api
echo "health $(curl -s --max-time 10 -o /dev/null -w '%{http_code}' $API/health)"
bash $V/island-hash.sh post24 $EXP
MAIN=$(curl -s --max-time 15 $O/ | grep -o 'assets/index-[A-Za-z0-9_-]*\.js' | head -1)
if [ "$MAIN" != "assets/index-Db4qSSYo.js" ]; then echo "ISLAND MAIN IS $MAIN, NOT THE ACCEPTED BUILD - stopping"; exit 3; fi
[ -n "$HASHONLY" ] && { echo "hash only, done"; exit 0; }
bash withslot.sh "A-20b r2" "post-deploy 24 representative arms on the island (my test account); one browser" 30 bash -c "
  export PRESET=a4_portrait CDPPORT=9680 REPS=1
  ONLY=IDLE timeout 600 node a20_probe.mjs post24-a $O $API island > runs-post24-a.log 2>&1; echo \"a exit \$?\"
  ONLY=K1-close timeout 600 node a20e_probe.mjs post24-k $O $API island > runs-post24-k.log 2>&1; echo \"k exit \$?\"
  ONLY=HEADCLOSE-plain,HEADCLOSE-applyslow-,MENTER-close,ADDR-noncanon-case-,N6B-switch timeout 1500 node a20n_probe.mjs post24-n $O $API island > runs-post24-n.log 2>&1; echo \"n exit \$?\"
  [ -n \"$NEWARMS\" ] && { ONLY=SHIFTENTER-typed-close,MULTIPASTE-close,ADDR-noncanon-bare- timeout 1200 node a20n_probe.mjs post24-nn $O $API island > runs-post24-nn.log 2>&1; echo \"nn exit \$?\"; }"
for L in post24-a post24-k post24-n post24-nn; do [ -d runs/$L ] || continue; echo "#### $L"; W=4000 node analyze-a20.wide.mjs runs/$L 2>&1 | tail -12; done
echo "post-deploy 24 done $(date +%T)"
