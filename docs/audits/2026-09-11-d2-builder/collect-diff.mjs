import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const audit = dirname(fileURLToPath(import.meta.url));
const root = resolve(audit, '../../..');
// Read-only diff inspection: no index, ref, commit or other .git mutation.
const numstat = execFileSync('git', ['diff', '--numstat', '--', 'client/src'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const entries = numstat.trim().split('\n').filter(Boolean).map((line) => {
  const [added, removed, path] = line.split('\t');
  return { path, added: Number(added), removed: Number(removed), kind: 'modified' };
});
for (const path of [
  'client/src/pages/Notes/canvasEngine/hooks/useNoteRouteSaveBoundary.tsx',
  'client/src/pages/Notes/canvasEngine/hooks/useNoteRouteSaveBoundary.test.tsx',
  'client/src/pages/Notes/canvasEngine/layers/NotePaperHeader.tsx',
  'client/src/pages/Notes/canvasEngine/layers/NotePaperHeader.module.css',
  'client/src/pages/Notes/canvasEngine/layers/NotePaperHeader.test.tsx',
]) {
  const content = readFileSync(resolve(root, path), 'utf8');
  entries.push({ path, added: content.split('\n').length - Number(content.endsWith('\n')), removed: 0, kind: 'new' });
}
for (const entry of entries) entry.sha256 = createHash('sha256').update(readFileSync(resolve(root, entry.path))).digest('hex');
const receipt = { scope: 'D2 product code + tests only; excludes handoff and synthetic audit assets',
  files: entries.length, added: entries.reduce((n, e) => n + e.added, 0), removed: entries.reduce((n, e) => n + e.removed, 0), entries };
writeFileSync(resolve(audit, 'diff-manifest.json'), JSON.stringify(receipt, null, 2) + '\n');
const check = execFileSync('git', ['diff', '--check'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
writeFileSync(resolve(audit, 'validation/diff-check.txt'), check || 'git diff --check: exit 0, no whitespace errors\n');
console.log(JSON.stringify({ files: receipt.files, added: receipt.added, removed: receipt.removed, diffCheck: 'passed' }));
