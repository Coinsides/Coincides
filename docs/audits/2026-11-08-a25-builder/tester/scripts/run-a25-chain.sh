#!/usr/bin/env bash
# A-25 acceptance chain (11-09 prep) = the r3 chain (190 rows), one browser, self-wraps in a heavy-job slot. A-25 front 5614 ->
# backend 3614 (fresh library a20acc/data-a25); per-arm notes diffed against the A-20b r2 chain (gate-a20b/belt-*.txt) by diff-chain-a25.sh.
# r2 expectations (Main_Designer 11-08, order 02669083 / ea1bedd8 / 22fa24ab / a902abee):
#   K1 all (incl. paste500, K1IME-held): no duplicate, and the words on the server or brought back by Apply (superseded below);
#   K2: the undone word does not come back, no kept record; K3: offered after sign-in, Dismiss removes it (both keys);
#   K5: no Apply banner in the same mount, live text never overwritten; K6 replace: Back -> X;
#   LATEBACK type: ' second' on server or in the kept box, a visible status while waiting; still: behaviour as written;
#   INAPP type (old bug): same as LATEBACK; GONEFAIL-back: 0 false toast, words on server or box, 1 copy.
#   r2 method (0dc0ac0b): the belt keeps ONLY unsealed words (start = last confirmed, end = live); sealed words go by
#   the receipt (banner Apply, 409). So: SPLIT x4 = pre behaviour ('alpha beta' on server + recovery banner); RETRY del
#   stays deleted, no box; RETRY more no box, 'beta more'; K1 all + K1IME-held: no duplicate on the server and NO automatic
#   landing (a banner may offer Apply; Apply must give the newest snapshot); K2: no automatic return (a banner offering
#   the undone words = the user's choice, not class 2); TWICE / BACKOK = GONEFAIL-back positive controls: 0 false
#   message; conservation gate green, no exemption, receipts counted. STALE: size it (window shape, not new).
#   Toast counts use watchN (a20k): 'Failed to save block' at most once while offline.
#   Last r2 ruling (Main_Designer 11-08): a queued 'Enter + words' split group keeps ONLY the new unit as a kept-box record,
#   put back by hand, never landing by itself. FLYK: kone waits in the box (0 on the server), kzero by receipt, no
#   duplicate. SPLIT: the original unit = 'alpha beta' on server and screen + banner; mid/home may add a box with the
#   second half (accepted, class B); pressing put-back (if a control exists) must not duplicate.
#   r2 adds NO put-back control (Main_Designer 11-08; new UI = L-018, stage two): record box contents and buttons only;
#   in the verdict write the SPLIT box contents one line per variant (manual: Discard the second half, do not paste it).
# Usage: run-r2-chain.sh [<from step>]
cd "<scratch>/a20"
FROM=${1:-1}
[ -z "$INSLOT" ] && exec env INSLOT=1 bash withslot.sh "A-25" "A-25 acceptance chain (r3 chain arms + a20m BACKIN,LIST; 5614 -> 3614)" 100 bash "$0" "$@"
F=http://127.0.0.1:5614; API=http://127.0.0.1:3614/api
export CREDROOT=<a20acc>/cred-3614 PRESET=a4_portrait CDPPORT=9690
run() { # run <step> <label> <env> <probe>
  [ "$1" -lt "$FROM" ] && return 0
  echo "step $1 $2 start $(date +%T)"
  env $3 timeout 3600 node "$4" "$2" $F $API local > "runs-$2.log" 2>&1
  echo "step $1 $2 exit $? $(date +%T) $(grep -c '^BAD' runs-$2.log) BAD; $(tail -1 runs-$2.log | cut -c1-160)"
}
run 1  a25-k      "REPS=2 ONLY=K1-401hash,K1-401blur,K1-close,K1-paste500,K1IME-held,K2,K5,K3,K6" a20e_probe.mjs
run 2  a25-late   "REPS=2" a20f_probe.mjs
run 2  a25-j      "REPS=2" a20j_probe.mjs
run 2  a25-k-toast "REPS=2" a20k_probe.mjs
run 2  a25-flyk   "REPS=2" a20l_probe.mjs
run 3  a25-inapp  "REPS=2" a20g_probe.mjs
run 4  a25-d      "REPS=2" a20d_probe.mjs
run 5  a25-b      "REPS=2" a20b_probe.mjs
run 6  a25-a      "REPS=2 ONLY=IDLE,WAMP,PAUSES,UNDO,PAGEHIDE" a20_probe.mjs
run 7  a25-c      "REPS=2 ONLY=PAUSEEXIT-unload,PAUSEEXIT-hash,PAUSEEXIT-401,UNDOSEQ,UNDOPAUSE,DRAFT,OFFLINE,PUTDUP,IME" a20c_probe.mjs
run 8  a25-c-closetab "REPS=1 ONLY=PAUSEEXIT-closetab" a20c_probe.mjs
run 9  a25-c-kill "REPS=1 ONLY=PAUSEEXIT-kill" a20c_probe.mjs
run 10 a25-kill-close-0 "ONLY=HARDKILL KILL=close" a20_probe.mjs
run 11 a25-kill-proc-0  "ONLY=HARDKILL KILL=proc" a20_probe.mjs
run 12 a25-offkill-0 "" a20i_probe.mjs
run 13 a25-m      "REPS=2 ONLY=BACKIN,LIST" a20m_probe.mjs
echo "A-25 chain done $(date +%T)"
