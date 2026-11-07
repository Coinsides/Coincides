#!/usr/bin/env bash
# What the island serves vs an expected dist list (default: the r2.3c package's dist.sha256). Read-only HTTP GETs
# through the tunnel (127.0.0.1:13002 -> island). Usage: island-hash.sh <label> [<expected dist.sha256>]
set -u
LABEL=${1:?label}
EXP=${2:-<home>/.claude/ops/packages/editor-rework-r2.3c/dist.sha256}
ORIGIN=http://127.0.0.1:13002
OUT=<tmp>/edacc/island-hash-$LABEL; rm -rf "$OUT"; mkdir -p "$OUT"
curl -s --max-time 15 "$ORIGIN/" -o "$OUT/index.html"
echo "island main: $(grep -o 'assets/index-[A-Za-z0-9_-]*\.js' "$OUT/index.html" | head -1)  css: $(grep -o 'assets/index-[A-Za-z0-9_-]*\.css' "$OUT/index.html" | head -1)"
ok=0; bad=0; miss=0
while read -r h p; do
  p=${p#\*}; rel=${p#dist/}
  code=$(curl -s --max-time 30 -o "$OUT/file" -w '%{http_code}' "$ORIGIN/$rel")
  if [ "$code" != 200 ]; then miss=$((miss+1)); echo "HTTP $code $rel" >> "$OUT/report.txt"; continue; fi
  got=$(sha256sum "$OUT/file" | cut -d' ' -f1)
  if [ "$got" = "$h" ]; then ok=$((ok+1)); echo "OK $rel" >> "$OUT/report.txt"; else bad=$((bad+1)); echo "DIFF $rel want ${h:0:12} got ${got:0:12}" >> "$OUT/report.txt"; fi
done < "$EXP"
rm -f "$OUT/file"
echo "$LABEL: $ok same, $bad different, $miss not served (of $(wc -l < "$EXP"))"
grep -v '^OK' "$OUT/report.txt" | head -20
