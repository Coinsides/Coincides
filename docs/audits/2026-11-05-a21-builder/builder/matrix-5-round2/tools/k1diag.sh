#!/bin/bash
# Diagnostic build of the pure code (controller with console marks), one K arm, then the controller is put back.
A=<scratch>/a18; SP=$(dirname $A)
E=<tmp>/ed21-evidence/r2; C=<tmp>/ed21/client; F=$C/src/pages/Notes/canvasEngine/hooks/useHeadingStructureController.ts
cp $F $SP/ctl-before-diag.ts
trap "cp $SP/ctl-before-diag.ts $F" EXIT
cp $SP/useHeadingStructureController.diag.ts $F
(cd $C && timeout 900 npx vite build --outDir $A/dist-diag --emptyOutDir > $E/build-diag.log 2>&1; echo diag build exit $?)
cp $SP/ctl-before-diag.ts $F; cmp $F $SP/useHeadingStructureController.r2-fixed.ts && echo controller-restored-to-r2
cd $A; node proxy-fail2.mjs $A/dist-diag 4153 57 > $E/proxy4153.log 2>&1 & P=$!
trap "cp $SP/ctl-before-diag.ts $F; kill $P 2>/dev/null" EXIT
sleep 2
STALL_SKIP=1 DIAGK1=1 node matrix25.mjs http://localhost:4153 $E/k-diag.json ${ROUNDS:-2} 57 '^k_roleStallOk' > $E/k-diag.log 2>&1
