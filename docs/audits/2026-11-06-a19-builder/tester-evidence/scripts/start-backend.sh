#!/usr/bin/env bash
# A-19 acceptance backend (Tester(1)): a local server from a verified tree, its own scratch DB and dirs, no model keys,
# docx through the 1a fake converter (controlled by files in $CTL: release / fail). Never the island.
# usage: start-backend.sh <port> <tag> <treeDir> [<dataDir>]   (dataDir defaults to $A/data-<tag>)
PORT_=$1; TAG=$2; TREE=$3; A=<tmp>/a19acc
D=${4:-$A/data-$TAG}; CTL=${CTL_DIR:-$A/ctl}   # CTL_DIR: the 1a harness drives its own ctl dir (hold/release/fail)
mkdir -p "$D/data" "$D/uploads" "$D/assets" "$D/blobs" "$D/appdata" "$A/logs" "$CTL"
[ -f "$A/empty.env" ] || : > "$A/empty.env"
cd "$TREE/server" || exit 1
export DOTENV_CONFIG_PATH="$A/empty.env" DB_PATH="$D/data/app.db" PORT=$PORT_ NODE_ENV=development \
  UPLOAD_DIR="$D/uploads" CANVAS_ASSET_DIR="$D/assets" SOURCE_BLOB_DIR="$D/blobs" COINCIDES_APP_DATA_DIR="$D/appdata"
CTLW=$(cygpath -m "$CTL")   # node on Windows reads /c/... as <current drive>:\c\...
export COINCIDES_DOCX_PDF_COMMAND_JSON="[\"node\",\"<home>/.claude/ops/tester-kit/harness/fake-soffice.cjs\",\"$CTLW\",\"{input}\",\"{outdir}\"]"
[ "${NOCONV:-0}" = 1 ] && unset COINCIDES_DOCX_PDF_COMMAND_JSON   # NOCONV=1: no docx converter configured
unset ANTHROPIC_API_KEY OPENAI_API_KEY DEEPSEEK_API_KEY DASHSCOPE_API_KEY VOYAGE_API_KEY
echo "backend $TAG on $PORT_ tree=$TREE data=$D"
exec node --import "file:///<session-tmp>/scratchpad/a19/bind-local.mjs" --import tsx src/index.ts > "$A/logs/server-$TAG.log" 2>&1
