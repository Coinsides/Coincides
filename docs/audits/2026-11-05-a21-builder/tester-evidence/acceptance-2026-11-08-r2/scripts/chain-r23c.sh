#!/usr/bin/env bash
# r2.3c acceptance chain: browsers (with provenance first), then gate, then old matrices. Do not edit while running.
cd "<session-tmp>/scratchpad/verify-editor"
bash run-r23c.sh
echo "== gate"; bash run-gate23c.sh
echo "== old matrices"; bash run-old23c.sh
echo "chain r23c done $(date -u +%T)"
