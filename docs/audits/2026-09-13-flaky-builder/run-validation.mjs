// Order-local evidence runner. No Git, user data, provider credentials or .env reads.
import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../..');
const evidence = import.meta.dirname;
const [mode, label = mode] = process.argv.slice(2);
if (!/^[\w-]+$/.test(label)) throw new Error('Invalid evidence label');
const scratch = mkdtempSync(join(tmpdir(), 'coincides-flaky-'));
for (const dir of ['env', 'app-data', 'assets', 'blobs', 'uploads']) mkdirSync(join(scratch, dir));
writeFileSync(join(scratch, 'empty.env'), '');
const env = {};
for (const key of ['PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP',
  'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'ComSpec', 'COMSPEC', 'PATHEXT', 'NUMBER_OF_PROCESSORS']) {
  if (process.env[key] !== undefined) env[key] = process.env[key];
}
Object.assign(env, {
  DB_PATH: ':memory:', DOTENV_CONFIG_PATH: join(scratch, 'empty.env'), DOTENV_CONFIG_QUIET: 'true',
  COINCIDES_VALIDATION_ENV_DIR: join(scratch, 'env'), COINCIDES_APP_DATA_DIR: join(scratch, 'app-data'),
  CANVAS_ASSET_DIR: join(scratch, 'assets'), SOURCE_BLOB_DIR: join(scratch, 'blobs'), UPLOAD_DIR: join(scratch, 'uploads'),
  ANTHROPIC_API_KEY: '', OPENAI_API_KEY: '', GENERIC_API_KEY: '', DEEPSEEK_API_KEY: '', DASHSCOPE_API_KEY: '', VOYAGE_API_KEY: '',
});
const npm = join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
const jobs = [];
const nodeJob = (name, cwd, args) => jobs.push({ name, cwd, args });
const npmJob = (name, cwd, script, args = []) => nodeJob(name, cwd, [npm, 'run', script, ...args]);
if (mode === 'client-targeted') {
  nodeJob(label, 'client', ['node_modules/vitest/vitest.mjs', 'run',
    'src/pages/Boards/BoardPage.unboxing.test.tsx', 'src/pages/Boards/BoardPage.selection.test.tsx',
    'src/pages/GroupGallery/groupGalleryPurposeRetirement.test.tsx']);
} else if (mode === 't1') {
  nodeJob(label, 'server', ['--import', 'tsx', '--test', '--test-reporter=tap',
    '--test-name-pattern=^T-1 both dev gates enabled', 'src/__tests__/v2DevQuickLogin.test.ts']);
} else if (mode === 'python') {
  const results = ['python.exe', 'D:/Coinsides/v12.9-selection/tools/mineru/.venv/Scripts/python.exe'].map((command) => {
    const result = spawnSync(command, ['-B', '-c', 'import sys; print(sys.version)'], {
      env, timeout: 5000, encoding: 'utf8', windowsHide: true,
    });
    return { command, status: result.status, errorCode: result.error?.code, stdout: result.stdout, stderr: result.stderr };
  });
  writeFileSync(join(evidence, `${label}.json`), JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify(results));
} else if (mode === 'client') {
  npmJob(label, 'client', 'test:unit');
} else if (mode === 'server') {
  const collect = (dir) => readdirSync(resolve(root, 'server', dir), { withFileTypes: true }).flatMap((entry) => {
    if (entry.isSymbolicLink()) throw new Error(`Linked test inventory entry: ${dir}/${entry.name}`);
    const file = `${dir}/${entry.name}`;
    return entry.isDirectory() ? collect(file) : file.endsWith('.test.ts') ? [file] : [];
  });
  const all = [...collect('src'), ...collect('scripts')].sort();
  const command = JSON.parse(readFileSync(join(root, 'server/package.json'), 'utf8')).scripts['test:v2'];
  const prefix = 'node ../scripts/run-server-test-suite.mjs ';
  if (!command.startsWith(prefix)) throw new Error('Curated runner changed; re-audit.');
  const curated = command.slice(prefix.length).split(' ');
  if (curated.some((file) => !/^(src|scripts)\/[\w/.-]+\.test\.ts$/.test(file) || !all.includes(file))
    || new Set(curated).size !== curated.length) throw new Error('Invalid explicit test list.');
  const supplemental = all.filter((file) => !curated.includes(file));
  writeFileSync(join(evidence, `${label}-inventory.json`), JSON.stringify({ all, curated, supplemental }, null, 2) + '\n');
  npmJob(`${label}-v2`, 'server', 'test:v2', ['--', '--test-reporter=tap']);
  nodeJob(`${label}-supplemental`, 'server', ['../scripts/run-server-test-suite.mjs', '--test-reporter=tap', ...supplemental]);
} else if (mode === 'wiring') {
  npmJob(label, '.', 'check:test-wiring');
} else if (mode === 'typecheck-client') {
  nodeJob(label, 'client', ['node_modules/typescript/bin/tsc', '--noEmit']);
} else {
  throw new Error('Unknown validation mode');
}
const results = [];
for (const job of jobs) {
  const log = createWriteStream(join(evidence, `${job.name}.log`), { flags: 'wx' });
  log.write(JSON.stringify({ command: [process.execPath, ...job.args], cwd: job.cwd, scratch,
    isolation: 'OS-only inherited env; empty dotenv/Vite env; memory DB; temporary app-data/assets/blobs/uploads',
    concurrency: 'runner defaults; no worker/concurrency override' }) + '\n');
  const started = Date.now();
  const code = await new Promise((done, reject) => {
    const child = spawn(process.execPath, job.args, { cwd: resolve(root, job.cwd), env, windowsHide: true });
    child.stdout.pipe(log, { end: false });
    child.stderr.pipe(log, { end: false });
    child.once('error', reject);
    child.once('close', done);
  });
  await new Promise((done) => log.end(done));
  const result = { name: job.name, exitCode: code, elapsedSeconds: (Date.now() - started) / 1000 };
  results.push(result);
  writeFileSync(join(evidence, `${label}-results.json`), JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify(result));
}
process.exitCode = results.some((result) => result.exitCode !== 0) ? 1 : 0;
