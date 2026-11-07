import json, sys, os
HERE = os.path.dirname(os.path.abspath(__file__))

def load(lab):
    p = os.path.join(HERE, 'runs', lab, 'rows.jsonl')
    return [json.loads(l) for l in open(p, encoding='utf-8')] if os.path.exists(p) else []

def times(tr):
    if not tr: return {}
    e = tr.get('enterAt'); h = tr.get('hashKeyAt'); out = {'hash': h, 'enter': e, 'last': tr.get('lastKeyAt'), 'click': tr.get('clickAt')}
    seq = tr.get('trace') or []
    hand = next((t for t, v in seq if e is not None and t > e and v is not None and 'abcd' not in v and v != ''), None)
    gone = None; seen = False
    for t, v in seq:
        if v is not None: seen = True
        elif seen: gone = t
    out['handover'] = hand; out['boxGone'] = gone
    hs = tr.get('hashes') or []
    out['left'] = hs[0][0] if hs else None
    return out

def short(w):
    if not w: return None
    return {k: w.get(k) for k in ['buf', 'boxes', 'notice', 'alerts', 'stored', 'eds'] if w.get(k) not in (None, [], 0)}

only = sys.argv[1] if len(sys.argv) > 1 else ''
for lab in ['rv-pre', 'rv-post']:
    rows = load(lab)
    print(f'===== {lab}: {len(rows)} rows, bad {sum(1 for r in rows if not r["ok"])}')
    for r in rows:
        if only and not r['name'].startswith(only): continue
        print(f"-- {r['name']} ok={r['ok']}" + (f" ERROR {r['error']}" if r.get('error') else ''))
        for k in ['blocks', 'blocksAfter', 'blocks49']:
            if r.get(k) is not None: print(f'   {k}: {json.dumps(r[k], ensure_ascii=False)}')
        if r.get('tr'):
            t = times(r['tr']); print(f'   times: {t}')
            if t.get('enter') is not None:
                e = t['enter']
                rel = {k: (v - e if isinstance(v, int) else None) for k, v in t.items() if k not in ('enter',)}
                print(f'   relative to Enter: {rel}')
        for k in ['during', 's1', 's2', 's5', 's12', 's13', 's25', 's49', 'after', 'away', 'back', 'reopened']:
            if r.get(k): print(f'   {k}: {json.dumps(short(r[k]), ensure_ascii=False)[:420]}')
        for k in ['before', 'ids', 'over', 'rects', 'draft', 'b1', 'waited', 'stored', 'leftNote', 'tabFound', 'holdAll']:
            if r.get(k) is not None: print(f'   {k}: {json.dumps(r[k], ensure_ascii=False)[:600]}')
        if r.get('net'): print(f"   net: {' ; '.join(r['net'])[:900]}")
