# Split the caret probe rows by run (Tester 11-09): run A (accidental, orphaned queue) = notes created before 07:00Z,
# run B (ordered, after seq) = notes created 07:16Z or later. rows.jsonl is append-only, so both runs share the files.
# Rows without an id (setup errors) follow the run of the nearest previous row in the same file. Read-only on the DBs.
import json, os, sqlite3, sys
R = '<scratch>/a20'
DB = {'pre': '<a19acc>/data-a20pre', 'r3e': '<a20acc>/data-r3e', 'belt': '<a20acc>/data-a20b'}
for b, d in DB.items():
    c = sqlite3.connect(f'file:{d}/data/app.db?mode=ro', uri=True)
    for rr in ('r1', 'r2'):
        src = f'{R}/runs/caret-{b}-{rr}/rows.jsonl'
        if not os.path.exists(src): continue
        out = {'A': [], 'B': []}; cur = None
        for l in open(src, encoding='utf-8'):
            if not l.strip(): continue
            j = json.loads(l); row = c.execute('select created_at from notes where id=?', (j.get('id'),)).fetchone() if j.get('id') else None
            if row: cur = 'A' if row[0] < '2026-11-09T07:00' else 'B' if row[0] >= '2026-11-09T07:16' else '?'
            out[cur or '?'].append(l)
        for k, ls in out.items():
            if not ls: continue
            os.makedirs(f'{R}/runs{k}/caret-{b}-{rr}', exist_ok=True)
            open(f'{R}/runs{k}/caret-{b}-{rr}/rows.jsonl', 'w', encoding='utf-8').writelines(ls)
            print(b, rr, k, len(ls))
