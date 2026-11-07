# 21st deploy (editor rework r2.3c) post-deploy check evidence
#   -> docs/audits/2026-11-05-a21-builder/tester-evidence/postdeploy-21/
# Same scrubbing as archive-r2.py (imported), then a scan of everything written.
import os, re, sys, importlib.util
S = r'<session-tmp>/scratchpad'
V = S + '/verify-editor'
E = r'<tmp>/edacc'
REPO = r'<repo>'
D = REPO + '/docs/audits/2026-11-05-a21-builder/tester-evidence/postdeploy-21'

# Borrow scrub() from archive-r2.py without running its body.
src = open(S + '/archive-r2.py', encoding='utf8').read()
cut = src.index('def copy_text')
ns = {}
exec(src[:cut].replace("for sub in ['runs', 'scripts', 'gate', 'old-matrices', 'hashes']:\n    os.makedirs(f'{D}/{sub}', exist_ok=True)\n", ''), ns)
scrub = ns['scrub']

for sub in ['runs', 'scripts', 'hashes']:
    os.makedirs(f'{D}/{sub}', exist_ok=True)

def copy_text(src, dst):
    if not os.path.exists(src): print('missing', src); return
    with open(src, encoding='utf8', errors='replace') as f: t = f.read()
    with open(dst, 'w', encoding='utf8', newline='\n') as f: f.write(scrub(t))

runs = sorted(d for d in os.listdir(V + '/runs') if d.startswith('post21-'))
runs += ['smoke-island20-J', 'r23c-landfail3', 'r23c-landfail3re', 'r23c-split']
for lab in runs:
    os.makedirs(f'{D}/runs/{lab}', exist_ok=True)
    for fn in ['rows.jsonl', 'classified.json', 'summary.json']:
        if os.path.exists(f'{V}/runs/{lab}/{fn}'):
            copy_text(f'{V}/runs/{lab}/{fn}', f'{D}/runs/{lab}/{fn}')
for fn in ['ack-check.sh', 'island-hash.sh', 'run-post21.sh', 'acc22_body.mjs', 'acc23_body.mjs', 'acc24_body.mjs']:
    copy_text(f'{V}/{fn}', f'{D}/scripts/{fn}')
copy_text(S + '/archive-post21.py', D + '/scripts/archive-post21.py')
for lab in ['pre21', 'calib-base9b', 'post21']:
    copy_text(f'{E}/island-hash-{lab}/report.txt', f'{D}/hashes/island-{lab}-report.txt')
copy_text(E + '/dist-base9b.sorted', D + '/hashes/my-build-9bc45e69-dist.sha256')
copy_text(V + '/../../tasks/bqr9mfk2s.output', D + '/run-post21-output.txt')

bad = []
pat = re.compile(r'@[A-Za-z0-9-]+\.(com|net|org)|[A-Za-z]:\\\\?Users|/c/Users|AppData|henry|<session>|5f423a4a|\b(?!127\.0\.0\.1)\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b', re.I)
n = 0
for root, _, files in os.walk(D):
    for fn in files:
        n += 1
        p = os.path.join(root, fn)
        with open(p, encoding='utf8', errors='replace') as f:
            for i, line in enumerate(f):
                m = pat.search(line)
                if m: bad.append(f'{p}:{i+1}: {m.group(0)}')
print(f'files {n}, scan hits {len(bad)}')
for x in bad[:20]: print(x)
