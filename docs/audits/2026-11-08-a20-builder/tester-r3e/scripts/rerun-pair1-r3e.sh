#!/usr/bin/env bash
# r3e round, pair 1 (mx) rerun (11-09): the first run lost its r3e side at sign-in (cred-3611r had no account of its own: register 409,
# frames 401); cred-3611r seeded with its own test email at 10:2x. Labels a20pre3e-mx2 / a20r3e-mx2 (rows.jsonl is append-only), ports 9653/9654.
cd "<scratch>/a20reg"
W=<scratch>/a20/withslot.sh
FROM=1
A=<a20acc>
pair() { # pair <step> <name> <env> <probe> [extra args...]
  [ "$1" -lt "$FROM" ] && return 0
  local step=$1 name=$2 envs=$3 probe=$4; shift 4
  bash "$W" "A-20" "regression step $step $name: pre+post, 2 browsers" 40 bash -c "
    export PRESET=a4_portrait
    env $envs CREDROOT=$A/cred-3601 CDPPORT=9653 timeout 5400 node $probe a20pre3e-$name http://127.0.0.1:5601 http://127.0.0.1:3601/api local $* > log-a20pre3e-$name.txt 2>&1 & P1=\$!
    env $envs CREDROOT=$A/cred-3611r CDPPORT=9654 timeout 5400 node $probe a20r3e-$name http://127.0.0.1:5611 http://127.0.0.1:3611/api local $* > log-a20r3e-$name.txt 2>&1 & P2=\$!
    wait \$P1; echo \"pre  $name exit \$?\"; wait \$P2; echo \"post $name exit \$?\""
  for s in pre3e r3e; do echo "  $s: $(tail -1 log-a20$s-$name.txt | cut -c1-500)"; done
}
pair 1 mx2 "" matrix.mjs K,W,H,N,R,V,D,L,G
echo "pair 1 rerun done $(date +%T)"
