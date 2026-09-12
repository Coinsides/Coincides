// Line-based numstat against explicit pre-edit snapshots, without invoking Git.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';

const evidence = 'docs/audits/2026-09-13-testgate-builder/round2';
const baseline = `${evidence}/before`;
const owned = new Set([
  'package.json', 'server/package.json', 'server/scripts/check-test-wiring.mjs',
  'server/src/__tests__/v13AtomicTextSaveMigration.test.ts',
  'server/src/__tests__/v13EventsLedger.test.ts',
  'server/src/__tests__/v13ProjectDeletionReferences.test.ts',
  'docs/generated/object-inventory.md',
  'docs/agent-ops/handoffs/2026-09-13-v13-6-test-gate-repair-order.md',
  'docs/audits/2026-09-13-testgate-builder/README.md',
]);
const lines = (text) => text.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n');
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    return entry.isDirectory() ? files(path) : [path];
  });
}
function delta(before, after) {
  if (before === after) return [0, 0];
  const a = before ? lines(before) : [];
  const b = after ? lines(after) : [];
  let previous = new Uint32Array(b.length + 1);
  for (const line of a) {
    const current = new Uint32Array(b.length + 1);
    for (let index = 0; index < b.length; index += 1) {
      current[index + 1] = line === b[index] ? previous[index] + 1
        : Math.max(current[index], previous[index + 1]);
    }
    previous = current;
  }
  const common = previous[b.length];
  return [b.length - common, a.length - common];
}
const records = [];
for (const snapshot of files(baseline)) {
  const file = snapshot.slice(baseline.length + 1);
  if (!owned.has(file)) continue;
  const before = readFileSync(snapshot, 'utf8');
  const after = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const [added, removed] = delta(before, after);
  if (added || removed) records.push({ added, removed, file });
}
const numstat = `${evidence}/numstat.tsv`;
for (const file of files(evidence).filter((file) => file !== numstat)) {
  records.push({ added: lines(readFileSync(file, 'utf8')).length, removed: 0, file });
}
records.push({ added: records.length + 2, removed: 0, file: numstat });
records.sort((left, right) => left.file.localeCompare(right.file));
writeFileSync(numstat, 'added\tremoved\tpath\n' + records.map(({ added, removed, file }) =>
  `${added}\t${removed}\t${file}`).join('\n') + '\n');
console.log(JSON.stringify({ files: records.length,
  added: records.reduce((sum, entry) => sum + entry.added, 0),
  removed: records.reduce((sum, entry) => sum + entry.removed, 0),
  implementation: records.filter((entry) => !entry.file.startsWith('docs/audits/')) }, null, 2));
