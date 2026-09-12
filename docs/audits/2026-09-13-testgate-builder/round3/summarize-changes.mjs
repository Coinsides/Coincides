// Line numstat against saved pre-edit bytes. Never reads Git or environment files.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const evidence = 'docs/audits/2026-09-13-testgate-builder/round3';
const files = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const file = `${dir}/${entry.name}`;
  return entry.isDirectory() ? files(file) : [file];
});
const lines = (source) => source ? source.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n') : [];
function delta(before, after) {
  if (before === after) return [0, 0];
  const a = lines(before), b = lines(after);
  let previous = new Uint32Array(b.length + 1);
  for (const line of a) {
    const current = new Uint32Array(b.length + 1);
    for (let index = 0; index < b.length; index++) {
      current[index + 1] = line === b[index] ? previous[index] + 1 : Math.max(current[index], previous[index + 1]);
    }
    previous = current;
  }
  return [b.length - previous[b.length], a.length - previous[b.length]];
}
const baseline = `${evidence}/before`;
const records = [];
for (const snapshot of files(baseline)) {
  const file = snapshot.slice(baseline.length + 1);
  const [added, removed] = delta(readFileSync(snapshot, 'utf8'), readFileSync(file, 'utf8'));
  if (added || removed) records.push({ added, removed, file });
}
const implementation = [...records];
const numstat = `${evidence}/numstat.tsv`;
for (const file of files(evidence).filter((file) => file !== numstat)) {
  records.push({ added: lines(readFileSync(file, 'utf8')).length, removed: 0, file });
}
records.push({ added: records.length + 2, removed: 0, file: numstat });
records.sort((a, b) => a.file.localeCompare(b.file));
writeFileSync(numstat, 'added\tremoved\tpath\n' + records.map(({ added, removed, file }) => `${added}\t${removed}\t${file}`).join('\n') + '\n');
console.log(JSON.stringify({ basis: 'round3/before bytes, not Git HEAD', implementation,
  evidenceFiles: records.length - implementation.length, totalAdded: records.reduce((n, row) => n + row.added, 0),
  totalRemoved: records.reduce((n, row) => n + row.removed, 0) }, null, 2));
