#!/usr/bin/env bash
# After the 22nd deploy (A-19): island hash check against the package's dist/client (stop on a main JS mismatch),
# then the island probe (one browser, my test account only; cleans up the Sources it uploads).
V=<session-tmp>/scratchpad/verify-editor
A=<session-tmp>/scratchpad/a19
curl -s --max-time 10 http://127.0.0.1:13002/api/health; echo
bash $V/island-hash.sh post22 <tmp>/a19acc/a19-island-expected.sha256
MAIN=$(curl -s --max-time 15 http://127.0.0.1:13002/ | grep -o 'assets/index-[A-Za-z0-9_-]*\.js' | head -1)
if [ "$MAIN" != "assets/index-Gswd3cHv.js" ]; then echo "ISLAND MAIN IS $MAIN, NOT THE ACCEPTED BUILD - stopping"; exit 3; fi
cd $A && PRESET=a4_portrait timeout 1800 node island-post-probe.mjs post22-island 9638
echo "post-deploy 22 done $(date -u +%T)"
