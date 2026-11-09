# Load confound, part 2 (Tester 11-09): concurrency witnessed by the backends themselves, not by my logs.
# For each probe row: its time = its note's created_at (UTC -> +9 h); rows without a note id (setup errors) take the
# midpoint of the nearest timed rows before and after it in the same run file. Concurrency at t = distinct
# (backend, account) pairs that created a note within +-90 s of t, on ANY local backend (~ live probe browsers), and on
# the row's OWN backend (two browsers hitting the same server). Plus the governor's per-minute machine CPU peak.
# Read-only on every DB (mode=ro). Scramble = a unit that is a reordering of a word typed into a fresh block.
import json, os, re, sqlite3, math, bisect
from datetime import datetime, timedelta

S = '<scratch>'
RUNS = S + '/a20/runs'
DBS = ['<a19acc>/data-a20pre'] + [f'<a20acc>/data-{t}' for t in ['post', 'r2', 'r3', 'r3d', 'r3e', 'a20b', 's2mut']]
WORDS = ['warmup', 'plainb', 'hbody']
sig = lambda s: ''.join(sorted(s))
W = timedelta(seconds=90)

def parse(ca):
    return datetime.strptime(ca[:19].replace('T', ' '), '%Y-%m-%d %H:%M:%S') + timedelta(hours=9)

note = {}            # id -> (db, user, t)
events = []          # (t, db, user)
for d in DBS:
    p = d + '/data/app.db'
    if not os.path.exists(p): continue
    c = sqlite3.connect(f'file:{p}?mode=ro', uri=True)
    db = os.path.basename(d)
    for nid, uid, ca in c.execute('select id, user_id, created_at from notes'):
        if not ca: continue
        t = parse(ca); note[nid] = (db, uid, t); events.append((t, db, uid))
    c.close()
events.sort()
times = [e[0] for e in events]
def active(t, db=None):
    lo = bisect.bisect_left(times, t - W); hi = bisect.bisect_right(times, t + W)
    s = {(e[1], e[2]) for e in events[lo:hi] if db is None or e[1] == db}
    return len(s)

gov = {}
for l in open('<ops>/cpu-governor.log', encoding='utf-8-sig'):
    m = re.match(r'(\d\d)-(\d\d) (\d\d):(\d\d):\d\d minute cores=\d+ peak=(\d+)', l)
    if m: gov[(int(m[1]), int(m[2]), int(m[3]), int(m[4]))] = int(m[5])
def peak3(t):
    v = [gov.get(((t + timedelta(minutes=k)).month, (t + timedelta(minutes=k)).day, (t + timedelta(minutes=k)).hour, (t + timedelta(minutes=k)).minute)) for k in (-1, 0, 1)]
    v = [x for x in v if x is not None]
    return max(v) if v else None

FAMS = {'r3fam': ('r3', 'r3d', 'r3e', 'r3dps', 'r3dps2', 'r3eps'), 'belt': ('belt',), 'pre': ('pre', 'pre3e', 'preb'), 'r2': ('r2',), 'r1+post': ('r1', 'post')}
fam_of = lambda run: next((k for k, v in FAMS.items() if run.split('-')[0] in v), None)

rows = []
for run in sorted(os.listdir(RUNS)):
    f = f'{RUNS}/{run}/rows.jsonl'
    if not os.path.exists(f) or not fam_of(run): continue
    rr = []
    for l in open(f, encoding='utf-8'):
        l = l.strip()
        if not l: continue
        try: j = json.loads(l)
        except Exception: continue
        toks = [x for x in re.split(r'[^a-z0-9]+', l) if x]
        hit = None
        for w in WORDS:
            bad = next((u for u in toks if u != w and len(u) == len(w) and sig(u) == sig(w)), None)
            if bad or (w == 'warmup' and 'rmup' in toks): hit = f'{w}->{bad or "rmup"}'; break
        nid = j.get('id'); n = note.get(nid) if nid else None
        rr.append(dict(fam=fam_of(run), run=run, name=j.get('name'), t=n[2] if n else None, db=n[0] if n else None, hit=hit, setup=bool(re.search(r'warmup|rmup', l)), interp=False))
    # untimed rows: midpoint of nearest timed neighbours in the same run; db from neighbours too
    for i, r in enumerate(rr):
        if r['t']: continue
        a = next((rr[k] for k in range(i - 1, -1, -1) if rr[k]['t'] and not rr[k]['interp']), None)
        b = next((rr[k] for k in range(i + 1, len(rr)) if rr[k]['t'] and not rr[k]['interp']), None)
        if a and b: r['t'] = a['t'] + (b['t'] - a['t']) / 2; r['db'] = a['db']; r['interp'] = True
        elif a or b: r['t'] = (a or b)['t']; r['db'] = (a or b)['db']; r['interp'] = True
    rows += rr

timed = [r for r in rows if r['t']]
for r in timed:
    r['act'] = active(r['t']); r['same'] = active(r['t'], r['db']); r['cpu'] = peak3(r['t'])
print(f'rows {len(rows)}, timed {len(timed)} (of which interpolated {sum(r["interp"] for r in timed)}), untimed {len(rows) - len(timed)}')
print('\n== every scramble: time, live accounts on all backends / on its own backend (+-90 s), machine CPU peak (+-1 min)')
for r in timed:
    if r['hit']:
        print(f"  {r['fam']:7} {r['run']:20} {r['name']:27} {r['hit']:15} {r['t']:%m-%d %H:%M:%S}{'~' if r['interp'] else ' '} live all {r['act']}, same backend ({r['db']}) {r['same']}, cpu {r['cpu']}")
for r in rows:
    if r['hit'] and not r['t']: print(f"  {r['fam']:7} {r['run']:20} {r['name']:27} {r['hit']:15} UNTIMED")

def tab(key, cats, label):
    print(f'\n== setup rows per family x {label}: rows/scrambles')
    t = {}
    for r in timed:
        if not r['setup']: continue
        k = (r['fam'], key(r)); n, s = t.get(k, (0, 0)); t[k] = (n + 1, s + (1 if r['hit'] else 0))
    for fam in FAMS:
        print(f'  {fam:8} ' + '  '.join(f'{c}: {t.get((fam, c), (0, 0))[0]}/{t.get((fam, c), (0, 0))[1]}' for c in cats))
    others = [f for f in FAMS if f != 'r3fam']
    rate = {}
    for c in cats:
        n = sum(t.get((f, c), (0, 0))[0] for f in others); s = sum(t.get((f, c), (0, 0))[1] for f in others)
        rate[c] = s / n if n else 0.0
    exp = sum(rate[c] * t.get(('r3fam', c), (0, 0))[0] for c in cats)
    print('  rate in the other families: ' + '  '.join(f'{c}: {rate[c]:.4f}' for c in cats))
    print(f'  r3 family expected at those rates with its own mix: {exp:.2f}; observed 0; P(0) = e^-{exp:.2f} = {math.exp(-exp):.3f}')
    return t
tab(lambda r: '1' if r['act'] <= 1 else '2' if r['act'] == 2 else '3+', ['1', '2', '3+'], 'live accounts on all backends')
tab(lambda r: '1' if r['same'] <= 1 else '2+', ['1', '2+'], 'live accounts on the row\'s own backend')
tab(lambda r: 'nogov' if r['cpu'] is None else '<50' if r['cpu'] < 50 else '50-69' if r['cpu'] < 70 else '70+', ['<50', '50-69', '70+', 'nogov'], 'machine CPU peak')
# pooled, ignoring load
P = {f: (sum(1 for r in timed if r['setup'] and r['fam'] == f), sum(1 for r in timed if r['setup'] and r['fam'] == f and r['hit'])) for f in FAMS}
print('\n== pooled setup rows/scrambles: ' + '  '.join(f'{f} {n}/{s}' for f, (n, s) in P.items()))
for f in FAMS:
    rs = [r for r in timed if r['setup'] and r['fam'] == f]
    if rs:
        a = sorted(r['act'] for r in rs); print(f'  {f:8} live-accounts median {a[len(a) // 2]}, share with >=3 live: {sum(x >= 3 for x in a) / len(a):.2f}, share same-backend >=2: {sum(r["same"] >= 2 for r in rs) / len(rs):.2f}')
