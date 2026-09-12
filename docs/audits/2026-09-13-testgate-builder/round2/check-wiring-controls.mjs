import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';

const evidence = 'docs/audits/2026-09-13-testgate-builder/round2';
const sentinel = 'server/src/__tests__/__test wiring positive control__.test.ts';
const localSentinel = sentinel.slice('server/'.length);
const packageFile = 'package.json';
const original = readFileSync(packageFile);
assert.equal(existsSync(sentinel), false, 'Never replace an existing test.');
const results = [];
function check(name, expectedCode, expectedSummary, command = null) {
  const pkg = JSON.parse(original.toString('utf8'));
  if (command !== null) pkg.scripts['test:wiring-positive-control'] = command;
  writeFileSync(packageFile, command === null ? original : JSON.stringify(pkg, null, 2) + '\n');
  const result = spawnSync(process.execPath, ['server/scripts/check-test-wiring.mjs'],
    { encoding: 'utf8', windowsHide: true });
  const output = result.stdout + result.stderr;
  writeFileSync(`${evidence}/wiring-${name}.log`,
    JSON.stringify({ command, expectedCode, actualCode: result.status }) + '\n' + output);
  results.push({ name, command, exitCode: result.status, expectedCode, expectedSummary });
  assert.equal(result.status, expectedCode, output);
  assert.ok(output.includes(expectedSummary), output);
  if (expectedCode === 1) assert.ok(output.includes(sentinel), output);
}
const green = '75 test files; 75 wired; 0 exempted; 0 unwired.';
const red = '76 test files; 75 wired; 0 exempted; 1 unwired.';
const wired = '76 test files; 76 wired; 0 exempted; 0 unwired.';
let created = false;
try {
  check('baseline', 0, green);
  writeFileSync(sentinel, "// Disposable discovery control; never executed.\n", { flag: 'wx' });
  created = true;
  check('unwired', 1, red);
  check('echo', 1, red, `echo "${sentinel}"`);
  check('echo-runner', 1, red, `echo node --test "${sentinel}"`);
  check('ordinary-node-program', 1, red, `node scripts/not-a-test-runner.mjs --test "${sentinel}"`);
  check('import-option-value', 1, red, `node --import "${sentinel}" --test server/src/__tests__/v13EventsLedger.test.ts`);
  check('reporter-option-value', 1, red, `node --test --test-reporter-destination "${sentinel}" server/src/__tests__/v13EventsLedger.test.ts`);
  check('echo-cd', 1, red, `echo cd server && node --test "${localSentinel}"`);
  check('node-test', 0, wired, `node --import tsx --test "${sentinel}"`);
  check('curated-wrapper', 0, wired, `node scripts/run-server-test-suite.mjs "${sentinel}"`);
  check('cd-wrapper', 0, wired, `cd server && node ../scripts/run-server-test-suite.mjs "${localSentinel}"`);
} finally {
  writeFileSync(packageFile, original);
  if (created) unlinkSync(sentinel);
  assert.deepEqual(readFileSync(packageFile), original, 'Package must be restored byte-for-byte.');
  assert.equal(existsSync(sentinel), false);
  check('restored', 0, green);
  writeFileSync(`${evidence}/wiring-controls.json`, JSON.stringify(results, null, 2) + '\n');
}
console.log(`PASS: ${results.length} wiring controls; package bytes restored; sentinel removed.`);
