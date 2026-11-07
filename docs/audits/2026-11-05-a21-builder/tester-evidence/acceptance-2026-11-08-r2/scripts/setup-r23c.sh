#!/usr/bin/env bash
# Prepare the r2.3c tree and my cross-check test files. No lock (file copies only). Junction made separately (PowerShell).
set -e
E=<tmp>/edacc; PK=<home>/.claude/ops/packages/editor-rework-r2.3c
(cd $PK/src && sha256sum -c --quiet ../src.sha256) && echo SRC_OK
(cd $PK && sha256sum -c --quiet dist.sha256) && echo DIST_OK
echo "== against r2.3b:"; diff <(sort -k2 <home>/.claude/ops/packages/editor-rework-r2.3b/src.sha256) <(sort -k2 $PK/src.sha256) || true
grep index- $PK/dist.sha256
rm -rf $E/tree-r23c; mkdir -p $E/tree-r23c
(cd <repo> && git archive 9bc45e69 client shared package.json) | tar -x -C $E/tree-r23c
cp -r $PK/src/client/. $E/tree-r23c/client/
(cd $E/tree-r23c && sha256sum -c --quiet $PK/src.sha256) && echo OVERLAY_OK
H22=$E/tree-r23c/client/src/pages/Notes/canvasEngine/hooks; H1=$E/tree/client/src/pages/Notes/canvasEngine/hooks; HF=$E/frozen-gate/client/src/pages/Notes/canvasEngine/hooks
cp $H1/structureTypingConservation.mirrors.test.tsx $H22/
cp $H22/structureTypingConservation.test.tsx $HF/structureTypingConservation.r23cgate.test.tsx
cp $H22/headingStructureWatchdog.realAdapter.test.tsx $H1/headingStructureWatchdog.realAdapter.r23ccopy.test.tsx
node -e "
const fs=require('fs');const p='<tmp>/edacc/tree-r23c/client/src/pages/Notes/canvasEngine/hooks/structureTypingConservation.test.tsx';let t=fs.readFileSync(p,'utf8');
const a='if (typedInWindow.has(token)) problems.push';const n=t.split(a).length-1;if(n!==1){console.log('MUTANT ANCHOR COUNT',n,'- write the mutant by hand');process.exit(0)}
fs.writeFileSync(p.replace('.test.tsx','.mutNoBoundary.test.tsx'),t.replace(a,'if (false && typedInWindow.has(token)) problems.push'));console.log('mutant written')"
echo "setup done; now make the node_modules junction for tree-r23c/client"
