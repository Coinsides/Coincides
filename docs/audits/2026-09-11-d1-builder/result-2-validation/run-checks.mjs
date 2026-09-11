import { spawnSync } from 'node:child_process';
import { readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const output = dirname(fileURLToPath(import.meta.url));
const root = resolve(output, '../../../..');
const client = resolve(root, 'client');
const server = resolve(root, 'server');
const npm = resolve(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
const emptyEnv = resolve(output, 'empty-env');
mkdirSync(emptyEnv, { recursive: true });
const env = { ...process.env, COINCIDES_VALIDATION_ENV_DIR: emptyEnv };
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory()
    ? files(resolve(dir, entry.name)) : [resolve(dir, entry.name)]);
}
const targeted = files(resolve(client, 'src/pages/Notes/canvasEngine'))
  .filter((path) => /\.test\.tsx?$/.test(path))
  .filter((path) => /placement|autowidth|interactions|coordinateContractIntegration|wall|boundaryAccount|pageFrameAlignment|pagePrint|overview|gutter/i.test(path))
  .map((path) => relative(client, path).replaceAll('\\', '/')).sort();
writeFileSync(resolve(output, 'targeted-files.json'), JSON.stringify(targeted, null, 2) + '\n');
const checks = [
  ['client-targeted', client, ['node_modules/vitest/vitest.mjs', 'run', '--maxWorkers=2', '--reporter=default', '--reporter=json', `--outputFile.json=${resolve(output, 'client-targeted.json')}`, ...targeted]],
  ['client-typecheck', client, ['node_modules/typescript/bin/tsc', '-b', '--pretty', 'false']],
  ['server-typecheck', server, ['node_modules/typescript/bin/tsc', '--noEmit', '--pretty', 'false']],
  ['client-build', client, [npm, 'run', 'build']],
  ['server-build', server, [npm, 'run', 'build']],
  ['canvas-engine-contract', client, [npm, 'run', 'smoke:canvas-engine-model-contract']],
  ['runtime-gate', root, [npm, 'run', 'verify:v2-bn8-runtime']],
];
const results = [];
for (const [name, cwd, args] of checks) {
  console.log(`Running ${name}`);
  const started = Date.now();
  const run = spawnSync(process.execPath, args, { cwd, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  writeFileSync(resolve(output, `${name}.log`), `${run.stdout || ''}${run.stderr || ''}${run.error ? '\n' + run.error : ''}`);
  results.push({ name, cwd: relative(root, cwd) || '.', command: ['node', ...args], exitCode: run.status, signal: run.signal, elapsedMs: Date.now() - started });
  writeFileSync(resolve(output, 'checks.json'), JSON.stringify(results, null, 2) + '\n');
  console.log(`${name}: exit ${run.status}`);
}
