#!/usr/bin/env bash
# A-20b same-source check (Tester 11-09): baseline 04f6f822 + the package's 18 src files -> vite build (in a lock slot) ->
# compare with the package dist (all files) and the main JS; src.sha256 -c on the tree; the 13 "as r3e" files byte for byte
# against the r3e package src; the a20m oracle check. Writes a20acc/a20b-r2-mine.sha256 and a20acc/build-a20b-r2.log.
S=<scratch>/a20
A2=<a20acc>; A=<a20acc>
T=$A2/tree-a20b-r2; P=<ops>/packages/a20b-belt-coverage-r2; E=<ops>/packages/a20b-belt-coverage
MAINJS=index-Db4qSSYo.js
set -o pipefail
if [ ! -e "$T" ]; then
  mkdir -p "$T" && (cd /d/Coinsides/v2.x/Coincides && git archive 04f6f822 client shared scripts docs/generated package.json | tar -x -C "$T") || { echo "archive failed"; exit 1; }
  while read -r f; do mkdir -p "$T/$(dirname "$f")"; cp "$P/src/$f" "$T/$f"; done < "$P/files.list"
  cmd //c mklink //J '<a20acc>\tree-a20b-r2\client\node_modules' 'D:\Coinsides\v2.x\Coincides\client\node_modules' > /dev/null
  cmd //c mklink //J '<a20acc>\tree-a20b-r2\shared\node_modules' 'D:\Coinsides\v2.x\Coincides\shared\node_modules' > /dev/null
fi
echo "== tree: src.sha256 -c OK lines $(cd "$T" && sha256sum -c "$P/src.sha256" 2>&1 | grep -c ': OK$') of $(wc -l < "$P/src.sha256")"
[ -e "$T/client/node_modules" ] && echo "== client/node_modules junction present" || echo "== client/node_modules MISSING"
echo "== the 18 files vs the r1 package src:"
while read -r f; do
  if [ ! -f "$E/src/$f" ]; then echo "   new vs r1: $f"; elif cmp -s "$P/src/$f" "$E/src/$f"; then :; else echo "   changed vs r1: $f"; fi
done < "$P/files.list"
echo "   same as r1: $(while read -r f; do [ -f "$E/src/$f" ] && cmp -s "$P/src/$f" "$E/src/$f" && echo x; done < "$P/files.list" | wc -l)"
cd "$S" && bash withslot.sh "A-20b" "same-source vite build of A-20b r2" 15 bash -c "cd $A/tree-a20b-r2/client && npx vite build --outDir $A/dist-a20b-r2/client --emptyOutDir > $A/build-a20b-r2.log 2>&1; echo build exit \$?"
(cd "$A2/dist-a20b-r2" && find . -type f | sort | xargs sha256sum) > "$A2/a20b-r2-mine.sha256"
if diff <(sed 's/ \*\.\// */' "$A2/a20b-r2-mine.sha256" | sort -k2) <(sed 's/ \*\.\// */' "$P/dist.sha256" | sort -k2); then echo "== rebuild == package dist ($(wc -l < "$A2/a20b-r2-mine.sha256") files)"; else echo "== REBUILD DIFFERS"; fi
cmp "$A2/dist-a20b-r2/client/assets/$MAINJS" "$P/dist/client/assets/$MAINJS" && echo "== main JS byte-identical"
sha256sum "$A2/dist-a20b-r2/client/assets/$MAINJS" | cut -c1-64
node <ops>/tester-kit/a20/check-a20m-oracle.mjs "$P" | tail -2
