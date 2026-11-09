#!/bin/bash
# A-20 final browser arms (scratch only). Each run.sh call starts the scratch server + proxy and stops them.
D=$(cd "$(dirname "$0")" && pwd); cd $D
bash buildwork.sh
sha256sum $(find dist-work -type f | sort) > dist-work.sha256
NOAPI="--disable-blink-features=NavigationApi"
DIST=$D/dist-work bash run.sh f-leave 10 '^(hashSwitch|pasteLink|loginHash|login401Enter|clickLeave|emptyHash|lateReply)$'
DIST=$D/dist-work CHROME_FLAGS="$NOAPI" bash run.sh f-fallback 10 '^(hashSwitch|pasteLink|loginHash|emptyHash|lateReply)$'
DIST=$D/dist-base bash run.sh b-late 3 '^(lateReply)$'
DIST=$D/dist-base CHROME_FLAGS="$NOAPI" bash run.sh b-fallback 3 '^(hashSwitch|pasteLink|emptyHash|lateReply)$'
DIST=$D/dist-work bash run.sh f-extra 3 '^(undoEnter|undoPause|undoSealA|undoIme|idleSaved|idleThenMore|idleThenEnter)$' extra.mjs
DIST=$D/dist-base bash run.sh b-extra 3 '^(undoEnter|undoPause|undoIme)$' extra.mjs
DIST=$D/dist-work bash run.sh f-rate 1 '^(rate60|rate4pauses|rateDraft|rateIme)$' extra.mjs
DIST=$D/dist-work bash run.sh f-kill 1 '^(idleHardKill)$' extra.mjs
sha256sum $(find dist-work -type f | sort) | diff - dist-work.sha256 > /dev/null && echo "dist unchanged during runs" || echo "DIST CHANGED"
echo "browser-final done $(date '+%F %T')"
