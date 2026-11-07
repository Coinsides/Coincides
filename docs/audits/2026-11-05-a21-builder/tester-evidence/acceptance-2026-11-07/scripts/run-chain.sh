#!/usr/bin/env bash
# Acceptance batches 3-6, one after another; each batch takes and releases the shared lock itself (run-acc.sh).
cd "<session-tmp>/scratchpad/verify-editor"
POST=http://127.0.0.1:13147; PRE=http://localhost:13141; FROZEN=http://localhost:13142
echo "== J"; REPS=4 bash run-acc.sh acc2_probe.mjs acc3-J-post $POST acc3-J-pre $PRE
echo "== K1-K3 (role save = 2nd text-save on both builds)"; ROLE_SAVE=2 bash run-acc.sh acc3_probe.mjs acc3-K-post $POST acc3-K-pre $PRE
echo "== K4-K5 (held, then dropped)"; ROLE_SAVE=2 END=fail bash run-acc.sh acc3_probe.mjs acc3-K45-post $POST acc3-K45-pre $PRE
echo "== real shape"; bash run-acc.sh acc4_probe.mjs acc4-post $POST acc4-pre $PRE
echo "== Y post+frozen"; bash run-acc.sh acc5_probe.mjs acc5-post $POST acc5-frozen $FROZEN
echo "== Y pre"; bash run-acc.sh acc5_probe.mjs acc5-pre $PRE
echo "chain done $(date -u +%T)"
