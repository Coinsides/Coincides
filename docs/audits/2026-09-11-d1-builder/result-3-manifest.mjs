import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const audit = dirname(fileURLToPath(import.meta.url));
const root = resolve(audit, '../../..');
const handoff = 'docs/agent-ops/handoffs/2026-09-11-v13-5-d1-walls-order.md';
const prefix = 'docs/audits/2026-09-11-d1-builder/result-3';
function git(args) {
  const run = spawnSync('git', ['-c', 'core.quotepath=false', ...args], { cwd: root, encoding: 'utf8' });
  if (run.status !== 0) throw new Error(run.stderr);
  return run.stdout.trim().split(/\r?\n/).filter(Boolean);
}
function group(file) {
  if (file === handoff) return 'receipt';
  if (file.startsWith(prefix) || file.includes('/.vite-result-3')) return 'audit';
  if (file.startsWith('client/d1-wall-geometry.')) return 'browserFixtureEntry';
  return 'productAndTests';
}
const files = git(['diff', '--numstat', '--', 'client', 'server', handoff]).map((line) => {
  const [added, removed, file] = line.split('\t');
  return { file, group: group(file), status: 'modified', added: Number(added), removed: Number(removed), bytes: statSync(resolve(root, file)).size };
});
const auditFiles = [];
function walk(directory, relative = '') {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!relative && !entry.name.startsWith('result-3') && !entry.name.startsWith('.vite-result-3')) continue;
    const file = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) walk(resolve(directory, entry.name), file);
    else auditFiles.push(`docs/audits/2026-09-11-d1-builder/${file}`);
  }
}
walk(audit);
const additions = new Set([...git(['ls-files', '--others', '--exclude-standard', '--', 'client', 'server']), ...auditFiles]);
for (const file of additions) {
  if (file.endsWith('result-3-delivery-manifest.json')) continue;
  const bytes = readFileSync(resolve(root, file));
  const binary = file.endsWith('.png');
  const lines = bytes.toString('utf8').split(/\r?\n/).length - (bytes.at(-1) === 10 ? 1 : 0);
  files.push({ file, group: group(file), status: 'new', added: binary ? null : lines, removed: 0, bytes: bytes.length });
}
const totals = {};
for (const file of files) {
  const total = totals[file.group] ||= { files: 0, added: 0, removed: 0, bytes: 0 };
  total.files++; total.added += file.added || 0; total.removed += file.removed; total.bytes += file.bytes;
}
writeFileSync(resolve(audit, 'result-3-delivery-manifest.json'), JSON.stringify({
  comparison: 'Cumulative accepted D1 worktree versus HEAD, including the eight inherited intermediate product files. New files counted explicitly. Unrelated pre-existing untracked files excluded. This generated manifest excludes itself.',
  totals, files: files.sort((a, b) => a.file.localeCompare(b.file)),
}, null, 2) + '\n');
console.log(JSON.stringify(totals));
