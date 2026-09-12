// Round-three evidence runner: existing complete suites, isolated synthetic data.
// The two HQ-owned Git/secrets tail gates are deliberately never executed here.
import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const root = process.cwd();
const evidence = resolve(root, 'docs/audits/2026-09-13-testgate-builder/round3');
const temporaryRoot = mkdtempSync(join(tmpdir(), 'coincides-testgate-round3-'));
for (const directory of ['env', 'app-data', 'assets', 'blobs', 'uploads']) mkdirSync(join(temporaryRoot, directory));
writeFileSync(join(temporaryRoot, 'empty.env'), '');
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  !/KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL|^NODE_OPTIONS$|^DOTENV_|^VITE_|^COINCIDES_D1_WALL_SMOKE_EVIDENCE$/i.test(key)));
Object.assign(env, {
  DB_PATH: ':memory:', DOTENV_CONFIG_PATH: join(temporaryRoot, 'empty.env'),
  COINCIDES_VALIDATION_ENV_DIR: join(temporaryRoot, 'env'),
  COINCIDES_APP_DATA_DIR: join(temporaryRoot, 'app-data'),
  CANVAS_ASSET_DIR: join(temporaryRoot, 'assets'),
  SOURCE_BLOB_DIR: join(temporaryRoot, 'blobs'), UPLOAD_DIR: join(temporaryRoot, 'uploads'),
  ANTHROPIC_API_KEY: '', OPENAI_API_KEY: '', GENERIC_API_KEY: '',
  DEEPSEEK_API_KEY: '', DASHSCOPE_API_KEY: '', VOYAGE_API_KEY: '',
});
const npm = join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
env.npm_execpath = npm;
env.npm_node_execpath = process.execPath;
const mode = process.argv[2];
const jobs = [];
const nodeJob = (name, cwd, args) => jobs.push({ name, cwd, args });
const npmJob = (name, cwd, script, args = []) => nodeJob(name, cwd, [npm, 'run', script, ...args]);
if (mode === 'server') {
  const collect = (dir) => readdirSync(resolve(root, 'server', dir), { withFileTypes: true }).flatMap((entry) => {
    if (entry.isSymbolicLink()) throw new Error(`Linked test inventory entry: ${dir}/${entry.name}`);
    const file = `${dir}/${entry.name}`;
    return entry.isDirectory() ? collect(file) : file.endsWith('.test.ts') ? [file] : [];
  });
  const all = [...collect('src'), ...collect('scripts')].sort();
  const command = JSON.parse(readFileSync(join(root, 'server/package.json'), 'utf8')).scripts['test:v2'];
  const prefix = 'node ../scripts/run-server-test-suite.mjs ';
  if (!command.startsWith(prefix)) throw new Error('Curated runner changed; re-audit.');
  const testV2 = command.slice(prefix.length).split(' ');
  if (testV2.some((file) => !/^(src|scripts)\/[\w/.-]+\.test\.ts$/.test(file) || !all.includes(file))
    || new Set(testV2).size !== testV2.length) throw new Error('Invalid explicit test list.');
  const supplemental = all.filter((file) => !testV2.includes(file));
  writeFileSync(join(evidence, 'server-inventory.json'), JSON.stringify({ all, testV2, supplemental }, null, 2) + '\n');
  npmJob('server-test-v2', 'server', 'test:v2', ['--', '--test-concurrency=1', '--test-reporter=tap']);
  nodeJob('server-supplemental', 'server', ['../scripts/run-server-test-suite.mjs',
    '--test-concurrency=1', '--test-reporter=tap', ...supplemental]);
} else if (mode === 'verify') {
  const command = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).scripts['verify:v2-bn8-runtime'];
  const gates = command.split(' && ');
  const excluded = ['git diff --check', 'npm run check:changed-file-secrets'];
  if (JSON.stringify(gates.slice(-2)) !== JSON.stringify(excluded)) throw new Error('Verify tail changed; re-audit.');
  for (const gate of gates.slice(0, -2)) {
    const match = /^npm run ([\w:-]+)$/.exec(gate);
    if (!match) throw new Error(`Unreviewed gate: ${gate}`);
    const script = match[1];
    npmJob(`verify-${script.replaceAll(':', '-')}`, '.', script,
      script === 'test:unit' ? ['--', '--maxWorkers=1', '--fileParallelism=false'] : []);
  }
} else if (mode === 'typecheck') {
  nodeJob('typecheck-server', 'server', ['node_modules/typescript/bin/tsc', '--noEmit']);
  nodeJob('typecheck-client', 'client', ['node_modules/typescript/bin/tsc', '-b']);
} else if (mode === 'docs') {
  npmJob('final-docs-check', '.', 'docs:check');
} else if (mode === 'docs-after-index') {
  npmJob('final-docs-check-after-index', '.', 'docs:check');
} else {
  throw new Error('Expected server, verify, typecheck, docs, or docs-after-index.');
}

const results = [];
for (const job of jobs) {
  const log = createWriteStream(join(evidence, `${job.name}.log`), { flags: 'wx' });
  log.write(JSON.stringify({ command: [process.execPath, ...job.args], cwd: job.cwd,
    temporaryRoot, isolation: 'empty dotenv/Vite env; memory DB; temporary app-data/assets/blobs/uploads; provider keys cleared' }) + '\n');
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
  writeFileSync(join(evidence, `${mode}-results.json`), JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify(result));
}
// Temporary synthetic fixtures remain outside audits; no build outputs are archived.
process.exitCode = results.some((result) => result.exitCode !== 0) ? 1 : 0;
