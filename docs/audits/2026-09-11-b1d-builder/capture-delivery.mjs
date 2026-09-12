import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const audit = dirname(fileURLToPath(import.meta.url));
const root = resolve(audit, '../../..');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const options = { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] };
const files = execFileSync('git', ['diff', '--name-only', '--', 'client/src'], options)
  .toString('utf8').trim().split(/\r?\n/).filter(Boolean);
writeFileSync(resolve(audit, 'product-changes.patch'), execFileSync('git', ['diff', '--binary', '--', 'client/src'], options));
const inventory = files.map(path => {
  const bytes = readFileSync(resolve(root, path));
  return { path, bytes: bytes.length, sha256: sha256(bytes) };
});
writeFileSync(resolve(audit, 'product-change-inventory.json'), JSON.stringify({
  capturedAt: new Date().toISOString(), files: inventory, gitIndexWritten: false,
  scope: 'Tracked client/src changes only; worktree started with no tracked modifications.',
}, null, 2));
const baselineRoot = resolve(audit, 'baseline-source');
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? walk(resolve(dir, entry.name)) : [resolve(dir, entry.name)]);
}
writeFileSync(resolve(audit, 'baseline-manifest.json'), JSON.stringify({ files: walk(baselineRoot).map(path => ({
  path: relative(baselineRoot, path).replaceAll('\\', '/'), sha256: sha256(readFileSync(path)),
})), source: 'Original worktree files copied before edits; Vite baseline loader retains original module IDs.' }, null, 2));
console.log(JSON.stringify({ changedProductFiles: inventory.length }));
