#!/usr/bin/env bash
# Before I ack the 21st deploy: is commit <X> exactly what I accepted (r2.3c)?
#   1. each of the package's 22 source files at <X> has the package's sha256;
#   2. nothing else under client/, shared/, server/, package*.json differs from 9bc45e69 (the package base);
#   3. the commit and its parents, for the record.
# Read-only git (show, diff, log). Usage: ack-check.sh <commit>
set -u
X=${1:?commit}
REPO=<repo>
PK=<home>/.claude/ops/packages/editor-rework-r2.3c
SRC=${EXPECT:-$PK/src.sha256}   # EXPECT=<list> only for the positive control
cd "$REPO"
git rev-parse --verify -q "$X^{commit}" >/dev/null || { echo "NO SUCH COMMIT $X"; exit 2; }
echo "== commit"; git log --oneline -1 "$X"; echo "parents: $(git log --pretty=%p -1 "$X")"
git merge-base --is-ancestor 9bc45e69 "$X" && echo "9bc45e69 is an ancestor: yes" || echo "9bc45e69 is an ancestor: NO"
echo "== 22 package files at $X"
ok=0; bad=0
while read -r h p; do
  p=${p#\*}
  got=$(git show "$X:$p" 2>/dev/null | sha256sum | cut -d' ' -f1)
  if [ "$got" = "$h" ]; then ok=$((ok+1)); else bad=$((bad+1)); echo "MISMATCH $p (want ${h:0:12} got ${got:0:12})"; fi
done < "$SRC"
echo "package files: $ok OK, $bad mismatched"
echo "== other changes 9bc45e69..$X under client shared server package*.json"
LIST=$(mktemp)
sed 's/^[0-9a-f]* \*//' "$SRC" | sort > "$LIST"
others=$(git diff --name-only 9bc45e69 "$X" -- client shared server package.json package-lock.json | sort | comm -23 - "$LIST")
if [ -z "$others" ]; then echo "none (only the 22)"; else echo "$others" | sed 's/^/OTHER /'; echo "others: $(echo "$others" | wc -l)"; fi
rm -f "$LIST"
echo "== docs-only files in the range (for the record)"; git diff --name-only 9bc45e69 "$X" -- . ':!client' ':!shared' ':!server' ':!package.json' ':!package-lock.json' | wc -l
