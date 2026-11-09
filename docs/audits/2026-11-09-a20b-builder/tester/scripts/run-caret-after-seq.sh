#!/usr/bin/env bash
# 11-09: the caret probe must not run while another Tester job hits 3601 / 3611 / 3612 (a20n on 3612 would give only the
# r2 reps a second browser on the same backend - the very confound the probe is meant to remove). So: wait for the
# sequence task (bvt811pbm) to print 'seq exit', then the probe (unchanged, run-caret.sh) under a slot, then the owed
# LANDOTHER-heading x2 rerun on A-20b (setup error in belt-m-landother) under a slot.
cd "<scratch>/a20"
A=<a20acc>
SEQOUT="<session>/tasks/bvt811pbm.output"
until grep -q "seq exit" "$SEQOUT" 2>/dev/null; do sleep 30; done
echo "seq exit seen $(date +%T)"
bash withslot.sh "A-20b" "caret probe: fresh-note caret jump, pre/r3e/r2 x30 each, one browser (9676)" 25 bash run-caret.sh > run-caret.log 2>&1
echo "caret exit $? $(date +%T)"; cat run-caret.log
bash withslot.sh "A-20b" "a20m LANDOTHER-heading x2 rerun on A-20b (5612 -> 3612); one browser" 10 bash -c "
  export PRESET=a4_portrait CDPPORT=9668 REPS=2 ONLY=LANDOTHER-heading CREDROOT=$A/cred-3612
  timeout 900 node a20m_probe.mjs belt-m-landother-rerun http://127.0.0.1:5612 http://127.0.0.1:3612/api local > runs-belt-m-landother-rerun.log 2>&1; echo \"landother rerun exit \$?\"; tail -2 runs-belt-m-landother-rerun.log"
echo "after-seq chain done $(date +%T)"
