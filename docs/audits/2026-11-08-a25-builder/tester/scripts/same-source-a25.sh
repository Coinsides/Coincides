#!/usr/bin/env bash
# A-25 same-source check (Tester 11-09 prep): baseline dfbcce8e (island A-20b r2, round 24) + the package's src files
# (files.list) -> vite build in a lock slot -> compare with the package dist (all files) and the main JS; src.sha256 -c on
# the tree; which listed files differ from the baseline; any server/ or shared/ path in files.list (then the backend 3614
# must start from a new tree, Main_Designer 11-09). Writes a20acc/a25-mine.sha256 and a20acc/build-a25.log.
S=<scratch>/a20
A2=<a20acc>; A=<a20acc>
T=$A2/tree-a25; P=<ops>/packages/a25-ime-save-failure
BASE=dfbcce8e
set -o pipefail
[ -f "$P/files.list" ] && [ -f "$P/src.sha256" ] && [ -f "$P/dist.sha256" ] && [ -d "$P/dist/client" ] || { echo "package not sealed yet (files.list / src.sha256 / dist.sha256 / dist/client missing)"; exit 2; }
MAINJS=$(grep -o 'assets/index-[A-Za-z0-9_-]*\.js' "$P/dist/client/index.html" | head -1 | sed 's#assets/##')
echo "== package main JS (from its index.html): $MAINJS"
echo "== files.list: $(wc -l < "$P/files.list") files; server/ or shared/ paths: $(grep -cE '^(server|shared)/' "$P/files.list")"
grep -E '^(server|shared)/' "$P/files.list" | sed 's/^/   /'
echo "== package self-check: src $(cd "$P/src" && sha256sum -c ../src.sha256 2>&1 | grep -c ': OK$') / $(wc -l < "$P/src.sha256") OK; dist $(cd "$P/dist" && sha256sum -c ../dist.sha256 2>&1 | grep -c ': OK$') / $(wc -l < "$P/dist.sha256") OK"
if [ ! -e "$T" ]; then
  mkdir -p "$T" && (cd /d/Coinsides/v2.x/Coincides && git archive $BASE client shared scripts docs/generated package.json | tar -x -C "$T") || { echo "archive failed"; exit 1; }
  while read -r f; do mkdir -p "$T/$(dirname "$f")"; cp "$P/src/$f" "$T/$f"; done < "$P/files.list"
  cmd //c mklink //J '<a20acc>\tree-a25\client\node_modules' '<repo>\client\node_modules' > /dev/null
  cmd //c mklink //J '<a20acc>\tree-a25\shared\node_modules' '<repo>\shared\node_modules' > /dev/null
fi
echo "== tree: src.sha256 -c OK lines $(cd "$T" && sha256sum -c "$P/src.sha256" 2>&1 | grep -c ': OK$') of $(wc -l < "$P/src.sha256")"
[ -e "$T/client/node_modules" ] && echo "== client/node_modules junction present" || echo "== client/node_modules MISSING"
echo "== the listed files vs the baseline $BASE:"
(cd /d/Coinsides/v2.x/Coincides && while read -r f; do if ! git cat-file -e "$BASE:$f" 2>/dev/null; then echo "   new: $f"; elif git show "$BASE:$f" | cmp -s - "$P/src/$f"; then :; else echo "   changed: $f"; fi; done < "$P/files.list")
echo "   same as baseline: $(cd /d/Coinsides/v2.x/Coincides && while read -r f; do git cat-file -e "$BASE:$f" 2>/dev/null && git show "$BASE:$f" | cmp -s - "$P/src/$f" && echo x; done < "$P/files.list" | wc -l)"
cd "$S" && bash withslot.sh "A-25" "same-source vite build of A-25" 15 bash -c "cd $A/tree-a25/client && npx vite build --outDir $A/dist-a25/client --emptyOutDir > $A/build-a25.log 2>&1; echo build exit \$?"
(cd "$A2/dist-a25" && find . -type f | sort | xargs sha256sum) > "$A2/a25-mine.sha256"
if diff <(sed 's/ \*\.\// */' "$A2/a25-mine.sha256" | sort -k2) <(sed 's/ \*\.\// */' "$P/dist.sha256" | sort -k2); then echo "== rebuild == package dist ($(wc -l < "$A2/a25-mine.sha256") files)"; else echo "== REBUILD DIFFERS"; fi
cmp "$A2/dist-a25/client/assets/$MAINJS" "$P/dist/client/assets/$MAINJS" && echo "== main JS byte-identical"
sha256sum "$A2/dist-a25/client/assets/$MAINJS" | cut -c1-64
node <ops>/tester-kit/a20/check-a20m-oracle.mjs "$P" | tail -2
