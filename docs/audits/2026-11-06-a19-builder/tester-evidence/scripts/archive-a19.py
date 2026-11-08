# A-19 acceptance evidence (Tester(1), 2026-11-08) -> docs/audits/2026-11-06-a19-builder/tester-evidence/
# Rows and logs per run, scripts, the 1a regression outputs, same-source hash lists, a few screenshots.
# Fixture images are not copied (gen-*.mjs regenerate them; manifest.json keeps their sha256). The scratch account
# file with a password (a19acc/legacy-account.json) is never copied. Scrub from archive-r2.py, then a scan.
import os, re, shutil
S = r'<session-tmp>/scratchpad'
A19 = S + '/a19'
P = S + '/verify-p2'
ACC = r'<tmp>/a19acc'
REPO = r'<repo>'
D = REPO + '/docs/audits/2026-11-06-a19-builder/tester-evidence'
src = open(S + '/archive-r2.py', encoding='utf8').read()
ns = {}
exec(src[:src.index('def copy_text')].replace("for sub in ['runs', 'scripts', 'gate', 'old-matrices', 'hashes']:\n    os.makedirs(f'{D}/{sub}', exist_ok=True)\n", ''), ns)
scrub = ns['scrub']
PASS = re.compile(r'"password"\s*:\s*"[^"]*"')
def clean(t): return PASS.sub('"password":"<redacted>"', scrub(t))
for sub in ['runs', 'scripts', 'regression-1a', 'hashes', 'screens']:
    os.makedirs(f'{D}/{sub}', exist_ok=True)
def copy_text(src, dst):
    if not os.path.exists(src): print('missing', src); return
    with open(src, encoding='utf8', errors='replace') as f: t = f.read()
    with open(dst, 'w', encoding='utf8', newline='\n') as f: f.write(clean(t))
for lab in sorted(os.listdir(A19 + '/runs')):
    os.makedirs(f'{D}/runs/{lab}', exist_ok=True)
    for fn in ['rows.jsonl', 'log.txt', 'summary.json']:
        if os.path.exists(f'{A19}/runs/{lab}/{fn}'): copy_text(f'{A19}/runs/{lab}/{fn}', f'{D}/runs/{lab}/{fn}')
for fn in os.listdir(A19):
    if fn.endswith(('.mjs', '.sh', '.md')): copy_text(f'{A19}/{fn}', f'{D}/scripts/{fn}')
copy_text(A19 + '/fixtures/manifest.json', D + '/scripts/fixtures-manifest.json')
copy_text(S + '/archive-a19.py', D + '/scripts/archive-a19.py')
for fn in os.listdir(P + '/run/out'):
    if fn.endswith('.jsonl'): copy_text(f'{P}/run/out/{fn}', f'{D}/regression-1a/{fn}')
for fn in os.listdir(P + '/run/logs'):
    if fn.startswith('1a-') and fn.endswith('.log'): copy_text(f'{P}/run/logs/{fn}', f'{D}/regression-1a/{fn}')
copy_text(S + '/../tasks/b9juylg41.output', D + '/regression-1a/run-1a-output.txt')
for fn in ['mine-client.sha256', 'mine-server.sha256', 'pkg-client.sha256', 'pkg-server.sha256']:
    copy_text(f'{ACC}/{fn}', f'{D}/hashes/{fn}')
shots = [('cap-post', 'image-pagesOnly.jpg'), ('sel-post', 'pdf-text-select.jpg'), ('ins-post', 'pdf-text.jpg'),
         ('legacy-on-post-img', 'jpeg-exif6-1600x900.jpg'), ('legacy-on-pre', 'png-land-800x600.png.jpg'),
         ('unread-post', 'unread-png-zero-width.png.jpg'), ('post-fresh', 'png-ultrawide-16000x300.png.jpg'), ('post-fresh', 'png-tall-1200x4000.png.jpg')]
for lab, fn in shots:
    s = f'{A19}/runs/{lab}/{fn}'
    if os.path.exists(s): shutil.copyfile(s, f'{D}/screens/{lab}--{fn}')
    else: print('no shot', s)
bad = []
pat = re.compile(r'@[A-Za-z0-9-]+\.(com|net|org)\b|[A-Za-z]:\\\\?Users|/c/Users|AppData|<session>|5f423a4a|"password":"(?!<redacted>)|\b(?!127\.0\.0\.1)\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b', re.I)
n = 0
for root, _, files in os.walk(D):
    for fn in files:
        if fn.endswith('.jpg'): continue
        n += 1
        with open(os.path.join(root, fn), encoding='utf8', errors='replace') as f:
            for i, line in enumerate(f):
                m = pat.search(line)
                if m: bad.append(f'{os.path.join(root, fn)}:{i+1}: {m.group(0)}')
print(f'text files {n}, scan hits {len(bad)}')
for x in bad[:20]: print(x)
