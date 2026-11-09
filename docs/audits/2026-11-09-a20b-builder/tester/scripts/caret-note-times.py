# Caret probe rows -> their note's created_at in the backend DB (read-only), per run (Tester 11-09). Backs the run A / run B
# split and the run A window (its wrapper log was overwritten by run B, same file name). UTC in the DB; +9 h = local.
import json, glob, sqlite3, sys
from datetime import datetime, timedelta
sys.stdout.reconfigure(encoding='utf-8')
R = '<scratch>/a20'
DB = {'pre': '<a19acc>/data-a20pre', 'r3e': '<a20acc>/data-r3e', 'belt': '<a20acc>/data-a20b'}
loc = lambda s: (datetime.strptime(s[:19].replace('T', ' '), '%Y-%m-%d %H:%M:%S') + timedelta(hours=9)).strftime('%H:%M:%S')
for run in ('runsA', 'runsB'):
    ts = []
    for b, d in DB.items():
        c = sqlite3.connect(f'file:{d}/data/app.db?mode=ro', uri=True)
        for f in sorted(glob.glob(f'{R}/{run}/caret-{b}-*/rows.jsonl')):
            for l in open(f, encoding='utf-8'):
                if not l.strip(): continue
                j = json.loads(l); row = c.execute('select created_at from notes where id=?', (j['id'],)).fetchone()
                print(run, f.split('/')[-2], j['name'], j['id'][:8], row[0] if row else None, loc(row[0]) if row else '')
                if row: ts.append(row[0])
    print(f'== {run}: {len(ts)} notes, first {loc(min(ts))}, last {loc(max(ts))} (local)')
