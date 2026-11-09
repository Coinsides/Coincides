#!/usr/bin/env bash
# stopq.sh <pattern> (Tester 11-09): TaskStop stops only a background task's outer shell; a queued withslot.sh / runner
# inside it lives on and later takes a slot (11-07 run-pair, 11-09 caret probe). This stops every msys process whose
# command line matches <pattern> AND all their descendants (children first, read from the ps tree before anything is
# killed), then looks again; exit 1 if any of them is still there. Dry run: DRY=1.
pat="$1"; [ -z "$pat" ] && { echo "usage: stopq.sh <pattern>"; exit 2; }
snap=$(ps -ef | tail -n +2)
roots=$(echo "$snap" | grep -E -- "$pat" | grep -v -E "grep|stopq\.sh" | awk '{print $2}')
[ -z "$roots" ] && { echo "nothing matches: $pat"; exit 0; }
desc() { for c in $(echo "$snap" | awk -v p="$1" '$3 == p {print $2}'); do desc "$c"; echo "$c"; done; }
all=$(for r in $roots; do desc "$r"; echo "$r"; done | awk '!seen[$0]++')
echo "$snap" | awk -v l=" $(echo $all) " 'index(l, " " $2 " ")'
[ -n "$DRY" ] && { echo "DRY: would stop (children first) $(echo $all)"; exit 0; }
for p in $all; do kill "$p" 2>/dev/null; done; sleep 2
left=$(ps -ef | awk -v l=" $(echo $all) " 'index(l, " " $2 " ")')
[ -n "$left" ] && { echo "STILL RUNNING:"; echo "$left"; exit 1; }
echo "stopped (children first): $(echo $all)"
