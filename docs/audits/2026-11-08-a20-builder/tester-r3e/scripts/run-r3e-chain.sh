#!/usr/bin/env bash
# A-20 r3e acceptance chain = the r3 chain (190 rows, 0 red on r3; per-arm notes == r2), one browser; self-wraps in a heavy-job slot. r3e front 5611 -> backend 3611 (fresh library a20acc/data-r3e).
# r3 front 5604 -> backend 3604 (server = 04f6f822, fresh library a20acc/data-r3; start it when r3 is sealed). Same probe files as pre and r2.
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
[ -z "$INSLOT" ] && exec env INSLOT=1 bash withslot.sh "A-20 r3e" "r3e acceptance chain (r3 chain arms + a20m; 5611 -> 3611)" 100 bash "$0" "$@"
F=http://127.0.0.1:5611; API=http://127.0.0.1:3611/api
export CREDROOT=<a20acc>/cred-3611 PRESET=a4_portrait CDPPORT=9647
run() { # run <step> <label> <env> <probe>
  [ "$1" -lt "$FROM" ] && return 0
  echo "step $1 $2 start $(date +%T)"
  env $3 timeout 3600 node "$4" "$2" $F $API local > "runs-$2.log" 2>&1
  echo "step $1 $2 exit $? $(date +%T) $(grep -c '^BAD' runs-$2.log) BAD; $(tail -1 runs-$2.log | cut -c1-160)"
}
run 1  r3e-k      "REPS=2 ONLY=K1-401hash,K1-401blur,K1-close,K1-paste500,K1IME-held,K2,K5,K3,K6" a20e_probe.mjs
run 2  r3e-late   "REPS=2" a20f_probe.mjs
run 2  r3e-j      "REPS=2" a20j_probe.mjs
run 2  r3e-k-toast "REPS=2" a20k_probe.mjs
run 2  r3e-flyk   "REPS=2" a20l_probe.mjs
run 3  r3e-inapp  "REPS=2" a20g_probe.mjs
run 4  r3e-d      "REPS=2" a20d_probe.mjs
run 5  r3e-b      "REPS=2" a20b_probe.mjs
run 6  r3e-a      "REPS=2 ONLY=IDLE,WAMP,PAUSES,UNDO,PAGEHIDE" a20_probe.mjs
run 7  r3e-c      "REPS=2 ONLY=PAUSEEXIT-unload,PAUSEEXIT-hash,PAUSEEXIT-401,UNDOSEQ,UNDOPAUSE,DRAFT,OFFLINE,PUTDUP,IME" a20c_probe.mjs
run 8  r3e-c-closetab "REPS=1 ONLY=PAUSEEXIT-closetab" a20c_probe.mjs
run 9  r3e-c-kill "REPS=1 ONLY=PAUSEEXIT-kill" a20c_probe.mjs
run 10 r3e-kill-close-0 "ONLY=HARDKILL KILL=close" a20_probe.mjs
run 11 r3e-kill-proc-0  "ONLY=HARDKILL KILL=proc" a20_probe.mjs
run 12 r3e-offkill-0 "" a20i_probe.mjs
run 13 r3e-m      "REPS=2 ONLY=BACKIN,LIST" a20m_probe.mjs
echo "r3e chain done $(date +%T)"
