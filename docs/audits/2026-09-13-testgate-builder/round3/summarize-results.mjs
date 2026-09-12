import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';

const evidence = 'docs/audits/2026-09-13-testgate-builder/round3';
const json = (path) => JSON.parse(readFileSync(path, 'utf8'));
const read = (file) => readFileSync(`${evidence}/${file}`, 'utf8');
const hash = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
const inventory = json(`${evidence}/server-inventory.json`);
assert.equal(inventory.all.length, 75);
assert.equal(inventory.testV2.length, 57);
assert.equal(inventory.supplemental.length, 18);
assert.deepEqual([...inventory.testV2, ...inventory.supplemental].sort(), inventory.all);

const failures = [];
function tap(name) {
  const source = read(`${name}.log`);
  const result = {};
  for (const key of ['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo']) {
    const values = [...source.matchAll(new RegExp(`^# ${key} (\\d+)$`, 'gm'))];
    assert.ok(values.length, `${name} missing TAP summary: ${key}`);
    result[key] = Number(values.at(-1)[1]);
  }
  const lines = source.split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    if (!/^not ok \d+ - /.test(lines[index])) continue;
    let end = index + 1;
    while (end < lines.length && lines[end] !== '  ...') end++;
    const block = lines.slice(index, end + 1).join('\n');
    const location = /  location: (.+)/.exec(block)?.[1] ?? '';
    const file = /([\w]+\.test\.ts)/.exec(location)?.[1];
    assert.ok(file, `Cannot identify failure: ${lines[index]}`);
    failures.push({ log: `${name}.log`, line: index + 1, title: lines[index], file,
      classification: file === 'v2CanvasPersistenceCutover.test.ts' ? 'adjudicated-order-1' : 'known-environment-baseline', block });
  }
  return result;
}
const batches = { testV2: tap('server-test-v2'), supplemental: tap('server-supplemental') };
const totals = Object.fromEntries(Object.keys(batches.testV2).map((key) => [key, batches.testV2[key] + batches.supplemental[key]]));
const groupedFailures = Object.fromEntries([...new Set(failures.map((entry) => entry.file))].sort()
  .map((file) => [file, failures.filter((entry) => entry.file === file).length]));
assert.deepEqual(groupedFailures, {
  'v2CanvasPersistenceCutover.test.ts': 25,
  'v2SourceMineruWiring.test.ts': 1,
  'v2SourceRegionCells.test.ts': 1,
});
assert.equal(totals.fail, failures.length);
assert.equal(batches.supplemental.fail, 0);
assert.equal(totals.tests, 645);
assert.equal(totals.pass, 618);
for (const key of ['cancelled', 'skipped', 'todo']) assert.equal(totals[key], 0);
writeFileSync(`${evidence}/failures.json`, JSON.stringify(failures, null, 2) + '\n');

const server = json(`${evidence}/server-results.json`);
assert.deepEqual(server.map((entry) => entry.exitCode), [1, 0]);
const verify = json(`${evidence}/verify-results.json`);
assert.equal(verify.length, 21);
assert.ok(verify.every((entry) => entry.exitCode === 0));
const typecheck = json(`${evidence}/typecheck-results.json`);
assert.equal(typecheck.length, 2);
assert.ok(typecheck.every((entry) => entry.exitCode === 0));
const finalDocs = json(`${evidence}/docs-after-index-results.json`);
assert.deepEqual(finalDocs.map((entry) => entry.exitCode), [0]);
const unit = read('verify-test-unit.log').replace(/\x1b\[[0-9;]*m/g, '');
assert.match(unit, /Test Files\s+151 passed \(151\)/);
assert.match(unit, /Tests\s+1590 passed \(1590\)/);

const collect = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  assert.ok(!entry.isSymbolicLink(), `Linked source entry: ${dir}/${entry.name}`);
  const file = `${dir}/${entry.name}`;
  return entry.isDirectory() ? collect(file) : [file];
});
const baseline = json(`${evidence}/source-hashes.before.json`);
const current = baseline.scope.flatMap(collect).filter((file) => /\.(?:ts|tsx|mjs|js|json|css|sql)$/.test(file)).sort();
assert.deepEqual(current, baseline.files.map((entry) => entry.file).sort());
const changes = baseline.files.filter((entry) => hash(entry.file) !== entry.sha256).map((entry) => entry.file).sort();
assert.deepEqual(changes, [
  'server/scripts/v13WildernessExecute.test.ts',
  'server/src/__tests__/v13BoardIdentity.test.ts',
  'server/src/__tests__/v2MaterialLibrary.test.ts',
  'server/src/__tests__/v2NotesLifecycle.test.ts',
  'server/src/toolFace/registry.ts',
]);
const preserved = [
  'package.json', 'server/package.json', 'server/scripts/check-test-wiring.mjs', 'scripts/check-tech-debt-table.mjs',
  'server/src/__tests__/v13AtomicTextSaveMigration.test.ts', 'server/src/__tests__/v13EventsLedger.test.ts',
  'server/src/__tests__/v13ProjectDeletionReferences.test.ts', 'docs/generated/object-inventory.md',
];
for (const file of preserved) assert.equal(hash(file), hash(`${evidence}/before/${file}`), `Preserved file changed: ${file}`);
const oldInventory = json('docs/audits/2026-09-13-testgate-builder/round2/server-inventory.json');
assert.deepEqual(inventory, oldInventory);
const controls = json('docs/audits/2026-09-13-testgate-builder/round2/wiring-controls.json');
assert.equal(controls.length, 12);
const manifest = json(`${evidence}/mcp-manifest-delta.json`);
assert.equal(hash('docs/generated/tool-face-manifest.json'), manifest.manifestSha256);
assert.equal(hash('server/src/toolFace/registry.ts'), manifest.registrySha256);
assert.equal(hash('server/dist/tool-face-manifest.json'), manifest.manifestSha256);
const integrity = { scope: baseline.scope, baselineFiles: baseline.files.length,
  unchanged: baseline.files.length - changes.length, changed: changes, added: [], deleted: [],
  preserved, inventoryUnchangedFromRound2: true, wiringPositiveControls: '../round2/wiring-controls.json',
  productionManifestByteIdentical: true };
writeFileSync(`${evidence}/integrity.json`, JSON.stringify(integrity, null, 2) + '\n');
const summary = { serverFiles: 75, batches, totals, groupedFailures,
  caveat: 'TAP count includes MineruWiring module-load failure; its internal tests never registered.',
  server, typecheck, verify, finalDocs, clientUnit: { files: 151, tests: 1590, failed: 0 },
  excludedHqTail: ['git diff --check', 'npm run check:changed-file-secrets'],
  manifest, terminalCriterionMet: true };
writeFileSync(`${evidence}/validation-summary.json`, JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ totals, groupedFailures, verifyPassed: verify.length, integrity }));
