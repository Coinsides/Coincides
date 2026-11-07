# Editor rework round-2 acceptance evidence (r2.3c verdict, 2026-11-08)
#   -> docs/audits/2026-11-05-a21-builder/tester-evidence/acceptance-2026-11-08-r2/
# Rows and classifications per run (no screenshots), the probe scripts, gate outputs (ANSI stripped), old-matrix
# results, hash lists. Test emails and local paths are replaced; everything written is scanned afterwards.
import os, re, sys

S = r'<session-tmp>/scratchpad'
V = S + '/verify-editor'
E = r'<tmp>/edacc'
PK = r'<home>/.claude/ops/packages/editor-rework-r2.3c'
REPO = r'<repo>'
D = REPO + '/docs/audits/2026-11-05-a21-builder/tester-evidence/acceptance-2026-11-08-r2'
for sub in ['runs', 'scripts', 'gate', 'old-matrices', 'hashes']:
    os.makedirs(f'{D}/{sub}', exist_ok=True)

SEP = r'(?:\\\\|\\|/)'
USERS = re.compile(r'[A-Za-z]:' + SEP + r'Users' + SEP + r'[A-Za-z0-9._-]+', re.I)
MSYS = re.compile(r'/c/Users/[A-Za-z0-9._-]+', re.I)
TMP = re.compile(r'<home>' + SEP + r'AppData' + SEP + r'Local' + SEP + r'Temp' + SEP, re.I)
APPDATA = re.compile(r'<home>' + SEP + r'AppData' + SEP + r'[^\s"\'`]*', re.I)
SESSION = re.compile(r'<tmp>/?claude' + SEP + r'[0-9a-f]{16}' + SEP + r'[0-9a-f-]{36}', re.I)
SESSID = re.compile(r'<session>|<session>', re.I)
DREPO = re.compile(r'[A-Za-z]:' + SEP + r'Coinsides' + SEP + r'v2\.x' + SEP + r'Coincides', re.I)
DMSYS = re.compile(r'/d/Coinsides/v2\.x/Coincides', re.I)
ANSI = re.compile(r'\x1b\[[0-9;]*m')

def scrub(t):
    t = ANSI.sub('', t)
    t = t.replace('<my-test-account>', '<my-test-account>').replace('<scratch-account>', '<scratch-account>')
    t = re.sub(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '<email>', t)
    t = USERS.sub('<home>', t)
    t = MSYS.sub('<home>', t)
    t = TMP.sub('<tmp>/', t)
    t = APPDATA.sub('<app-data-path>', t)
    t = SESSION.sub('<session-tmp>', t)
    t = SESSID.sub('<session>', t)
    t = DREPO.sub('<repo>', t)
    t = DMSYS.sub('<repo>', t)
    t = re.sub(r'\b(?!127\.0\.0\.1)\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b', '<ip>', t)
    return t

def copy_text(src, dst):
    if not os.path.exists(src): print('missing', src); return
    with open(src, encoding='utf8', errors='replace') as f: t = f.read()
    with open(dst, 'w', encoding='utf8', newline='\n') as f: f.write(scrub(t))

# Runs: r2.3c (the verdict object), r2.3b carried items, the r2 baselines the tables compare with, r2.3 LANDFAIL2.
runs = sorted(d for d in os.listdir(V + '/runs') if d.startswith('r23c-'))
runs += ['r23b-geo', 'r23b-acc12', 'r23b-acc12d', 'r23b-acc14', 'r23b-boxtype3', 'r23b-y', 'r23b-acc13']
runs += ['r2-acc1', 'r2-acc8x', 'r2-acc4', 'r2-acc6', 'r2-acc3-K', 'r2-acc3-K45', 'r2-acc3-J', 'r2-acc7', 'r2-acc9', 'r2-acc15', 'r23-acc18pc2']
for lab in runs:
    os.makedirs(f'{D}/runs/{lab}', exist_ok=True)
    for fn in ['rows.jsonl', 'classified.json', 'summary.json']:
        if os.path.exists(f'{V}/runs/{lab}/{fn}'):
            copy_text(f'{V}/runs/{lab}/{fn}', f'{D}/runs/{lab}/{fn}')

with open(V + '/early_probe.mjs', encoding='utf8') as f: head = ''.join(f.readlines()[:91])
with open(D + '/scripts/common-header-91-lines.mjs', 'w', encoding='utf8', newline='\n') as f: f.write(scrub(head))
with open(V + '/acc_body.mjs', encoding='utf8') as f: head2 = ''.join(f.readlines()[:60])
with open(D + '/scripts/common-helpers-60-lines.mjs', 'w', encoding='utf8', newline='\n') as f: f.write(scrub(head2))
for fn in ['acc_body.mjs', 'acc2_body.mjs', 'acc3_tail.mjs', 'acc4_body.mjs', 'acc5_body.mjs', 'acc6_body.mjs', 'acc7_body.mjs',
           'acc9_body.mjs', 'acc10_body.mjs', 'acc11_body.mjs', 'acc12_helpers.mjs', 'acc12_body.mjs', 'acc13_body.mjs',
           'acc14_body.mjs', 'acc15_body.mjs', 'acc16_body.mjs', 'acc17_body.mjs', 'acc18_body.mjs', 'acc19_body.mjs',
           'acc20_body.mjs', 'acc21_body.mjs', 'analyze-acc.mjs', 'run-pair.sh', 'run-r23c.sh', 'chain-r23c.sh',
           'setup-r23c.sh', 'run-gate23c.sh', 'run-old23c.sh', 'matrix-3001.mjs']:
    copy_text(f'{V}/{fn}', f'{D}/scripts/{fn}')
copy_text(S + '/edacc-serve7.mjs', D + '/scripts/edacc-serve7.mjs')
copy_text(V + '/b-matrix25b.mjs', D + '/scripts/b-matrix25b.mjs (builder harness, unchanged).mjs')
copy_text(V + '/b-proxy-fail2.mjs', D + '/scripts/b-proxy-fail2.mjs (builder proxy, unchanged).mjs')
copy_text(S + '/archive-r2.py', D + '/scripts/archive-r2.py')

hooks1 = E + '/tree/client/src/pages/Notes/canvasEngine/hooks'
copy_text(hooks1 + '/structureTypingConservation.mirrors.test.tsx', D + '/gate/structureTypingConservation.mirrors.test.tsx')
for fn in os.listdir(E + '/gate-runs-r23c'):
    copy_text(f'{E}/gate-runs-r23c/{fn}', f'{D}/gate/{fn}.txt')
for fn in os.listdir(E + '/old-matrices-r23c'):
    copy_text(f'{E}/old-matrices-r23c/{fn}', f'{D}/old-matrices/{fn}')
copy_text(V + '/runs/r23c-r04-0/rows.jsonl', D + '/old-matrices/r04-0.rows.jsonl')

copy_text(PK + '/src.sha256', D + '/hashes/package-src.sha256')
copy_text(PK + '/dist.sha256', D + '/hashes/package-dist.sha256')
copy_text(E + '/dist-r23c.sorted', D + '/hashes/my-build-dist-index-BVrO4Ql1.sha256')
copy_text(PK + '/MANUAL-KNOWN-SECTION.md', D + '/hashes/builder-manual-known-section-as-checked.md')

# Scan everything written.
bad = []
pat = re.compile(r'@[A-Za-z0-9-]+\.(com|test|net|org)|[A-Za-z]:\\\\?Users|/c/Users|AppData|henry|<session>|5f423a4a|\b(?!127\.0\.0\.1)\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b', re.I)
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
for x in bad[:30]: print(x)
