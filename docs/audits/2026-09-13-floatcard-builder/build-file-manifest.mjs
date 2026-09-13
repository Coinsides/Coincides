import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const audit = 'docs/audits/2026-09-13-floatcard-builder';
const json = p => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const records = new Map();
const add = (file, change = 'modified') => records.set(file, { path: file, change });
for (const item of json(`${audit}/integration-files.json`).files) add(item.path, item.change);
for (const file of json('.tmp/floatcard-fixture-baseline/edited-paths.json')) add(file);
for (const file of [
  'client/src/components/Skin/SkinFloatCard.tsx',
  'client/src/components/Skin/SkinFloatCard.module.css',
  'client/src/components/Skin/SkinFloatCard.test.tsx',
  'client/src/components/Skin/skinFloatCardGeometry.ts',
  'client/scripts/skinFloatCardSmoke/serve.mjs',
  'server/src/db/migrations/071_v14_skin_suites.ts',
  'server/src/validators/skinSuites.ts',
  'server/src/services/skinSuites.ts',
  'server/src/routes/skinSuites.ts',
  'server/src/__tests__/v14SkinSuites.test.ts',
]) add(file, 'new');
for (const file of ['shared/types/skin.ts', 'server/src/validators/skin.ts', 'server/src/index.ts', 'server/package.json', 'docs/generated/object-inventory.md']) add(file);
const lines = text => { const list = text.replace(/\r\n/g, '\n').split('\n'); if (list.at(-1) === '') list.pop(); return list; };
function numstat(before, after) {
  let row = new Uint32Array(after.length + 1);
  for (const value of before) {
    const next = new Uint32Array(after.length + 1);
    for (let j = 1; j <= after.length; j++) next[j] = value === after[j - 1] ? row[j - 1] + 1 : Math.max(row[j], next[j - 1]);
    row = next;
  }
  return { added: after.length - row[after.length], deleted: before.length - row[after.length] };
}
const files = [...records.values()].sort((a, b) => a.path.localeCompare(b.path)).map(item => {
  const bytes = fs.readFileSync(path.join(root, item.path));
  const current = lines(bytes.toString('utf8'));
  const baseline = item.path === 'docs/generated/object-inventory.md'
    ? '.tmp/floatcard-fixture-baseline/object-inventory-before-runtime.md'
    : `.tmp/floatcard-fixture-baseline/${item.path}`;
  const evidence = item.change === 'new' ? 'Known empty baseline: created in this order.'
    : fs.existsSync(baseline) ? `Saved pre-edit bytes: ${baseline}`
    : 'No pre-order byte baseline retained. HQ must supply git numstat; current size is not a substitute.';
  return { ...item, current_lines: current.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    numstat: item.change === 'new' ? { added: current.length, deleted: 0 }
      : fs.existsSync(baseline) ? numstat(lines(fs.readFileSync(baseline, 'utf8')), current) : null, evidence };
});
const known = files.filter(item => item.numstat);
const result = { status: 'partial-numstat-awaiting-HQ', generated_at: new Date().toISOString(), git_used: false,
  method: 'New files use the known empty baseline; saved baselines use line LCS (not git diff). Existing files without baseline explicitly remain null. This is a source/test/script/generated-inventory manifest; audit receipts and handoff Result are separate.',
  file_count: files.length, known_numstat_files: known.length, unknown_numstat_files: files.length - known.length,
  known_subset: { added: known.reduce((sum, item) => sum + item.numstat.added, 0), deleted: known.reduce((sum, item) => sum + item.numstat.deleted, 0) }, files };
fs.writeFileSync(`${audit}/delivery-files.json`, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ file_count: result.file_count, known_numstat_files: result.known_numstat_files, unknown_numstat_files: result.unknown_numstat_files, known_subset: result.known_subset }));
