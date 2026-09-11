import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const audit = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(audit, '../../..');
const output = path.join(audit, 'validation');
await mkdir(output, { recursive: true });
const baseline = JSON.parse(await readFile(path.join(root, 'docs/audits/2026-09-11-d2-builder/validation/targeted.json'), 'utf8'));
const d2Files = baseline.command.filter(arg => /\.test\.tsx$/.test(arg));
if (d2Files.length !== 20) throw new Error('Expected the exact 20-file D2 regression suite');
const jobs = {
  targeted: ['node_modules/vitest/vitest.mjs', 'run', ...d2Files, '--reporter=json', `--outputFile=${path.join(output, 'targeted-results.json')}`],
  view: ['node_modules/vitest/vitest.mjs', 'run', 'src/pages/Notes/canvasEngine/layers/ViewOptionsMenu.test.tsx', '--reporter=json', `--outputFile=${path.join(output, 'view-results.json')}`],
  typecheck: ['node_modules/typescript/bin/tsc', '--noEmit'],
  build: ['node_modules/vite/bin/vite.js', 'build'],
};
const names = process.argv.slice(2);
if (!names.length || names.some(name => !(name in jobs))) throw new Error('Choose targeted, view, typecheck, build');
const results = await Promise.all(names.map(async name => {
  const args = jobs[name];
  const started = Date.now();
  const child = spawn(process.execPath, args, { cwd: path.join(root, 'client'), windowsHide: true });
  let stdout = '', stderr = '';
  child.stdout.on('data', data => { stdout += data; });
  child.stderr.on('data', data => { stderr += data; });
  const exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', resolve);
  });
  await writeFile(path.join(output, `${name}.log`), stdout + stderr, 'utf8');
  const result = { name, command: ['node', ...args], cwd: 'client', exitCode, elapsedMs: Date.now() - started };
  if (name === 'targeted' || name === 'view') {
    const report = JSON.parse(await readFile(path.join(output, `${name}-results.json`), 'utf8'));
    Object.assign(result, { files: report.testResults.length, passed: report.numPassedTests, failed: report.numFailedTests, pending: report.numPendingTests });
  }
  await writeFile(path.join(output, `${name}.json`), JSON.stringify(result, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(result));
  return result;
}));
if (results.some(result => result.exitCode !== 0)) process.exitCode = 1;
