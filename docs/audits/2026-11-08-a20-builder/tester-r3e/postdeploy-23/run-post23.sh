#!/usr/bin/env bash
# After the 23rd deploy (A-20 r3e): island hash check against the r3e package's dist/client (stop on a main JS mismatch), then
# representative arms on the island front through the tunnel (127.0.0.1:13002), one browser, MY island test account only
# (ACCOUNT=island = the t1.r04 test account in <ops>/island-test-accounts.md; never Henry's account). Each arm x1:
#   a20_probe IDLE (the idle save), a20e K1-close (close with words in flight), a20n HEADCLOSE-plain, HEADCLOSE-applyslow (req
#   form), MENTER-close, ADDR-noncanon-case ('#/Notes/<id>'), N6B-switch. Expected = the r3e readings (all green).
# Holds / delays happen inside the test browser (CDP Fetch); the island only sees ordinary requests or none.
S=<scratch>
V=$S/verify-editor; cd $S/a20
EXP=<a20acc>/a20-island-expected-r3e.sha256
O=http://127.0.0.1:13002; API=$O/api
echo "health $(curl -s --max-time 10 -o /dev/null -w '%{http_code}' $API/health)"
bash $V/island-hash.sh post23 $EXP
MAIN=$(curl -s --max-time 15 $O/ | grep -o 'assets/index-[A-Za-z0-9_-]*\.js' | head -1)
if [ "$MAIN" != "assets/index-Dkbj0u5K.js" ]; then echo "ISLAND MAIN IS $MAIN, NOT THE ACCEPTED BUILD - stopping"; exit 3; fi
[ -n "$HASHONLY" ] && { echo "hash only, done"; exit 0; }
bash withslot.sh "A-20 r3e" "post-deploy 23 representative arms on the island (my test account); one browser" 30 bash -c "
  export PRESET=a4_portrait CDPPORT=9680 REPS=1
  ONLY=IDLE timeout 600 node a20_probe.mjs post23-a $O $API island > runs-post23-a.log 2>&1; echo \"a exit \$?\"
  ONLY=K1-close timeout 600 node a20e_probe.mjs post23-k $O $API island > runs-post23-k.log 2>&1; echo \"k exit \$?\"
  ONLY=HEADCLOSE-plain,HEADCLOSE-applyslow-,MENTER-close,ADDR-noncanon-case-,N6B-switch timeout 1500 node a20n_probe.mjs post23-n $O $API island > runs-post23-n.log 2>&1; echo \"n exit \$?\""
for L in post23-a post23-k post23-n; do echo "#### $L"; W=4000 node analyze-a20.wide.mjs runs/$L 2>&1 | tail -12; done
echo "post-deploy 23 done $(date +%T)"
