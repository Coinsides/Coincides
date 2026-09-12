import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const audit = dirname(fileURLToPath(import.meta.url));
const root = resolve(audit, '../../..');
// E1 adaptations are checked in directly under e1-recheck; this only reconstructs board baseline.
// Start-of-task git status had no tracked changes: HEAD is the incumbent source.
// Read-only extraction, never an index/worktree reset. Shared note runtime stays current.
const files = execFileSync('git', ['ls-files', 'client/src/pages/Boards/*'], { cwd: root, encoding: 'utf8' }).trim().split(/\r?\n/).filter((file) => !file.includes('.test.'));
const baseline = resolve(audit, 'baseline'); mkdirSync(baseline, { recursive: true });
const manifest = { ref: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), premise: 'Opening status: tracked tree clean; only unrelated untracked files.', files: [] };
for (const file of files) {
  const source = execFileSync('git', ['show', `HEAD:${file}`], { cwd: root, encoding: 'utf8', maxBuffer: 8e6 });
  const relocated = source.replaceAll("'../Notes/", "'@/pages/Notes/");
  writeFileSync(resolve(baseline, file.split('/').at(-1)), relocated, 'utf8');
  manifest.files.push({ file, sha256: createHash('sha256').update(source).digest('hex'), adjustment: 'Only relative ../Notes imports changed to @/pages/Notes for audit relocation' });
}
writeFileSync(resolve(audit, 'baseline-manifest.json'), JSON.stringify(manifest, null, 2));
