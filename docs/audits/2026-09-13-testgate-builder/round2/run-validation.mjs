// Round-two evidence runner. No Git, secret scan, database migration command,
// or user-data access. Runs only explicitly selected existing validation gates.
import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const root = process.cwd();
const evidence = resolve(root, 'docs/audits/2026-09-13-testgate-builder/round2');
const temporaryRoot = mkdtempSync(join(tmpdir(), 'coincides-testgate-round2-'));
for (const directory of ['env', 'app-data', 'assets', 'blobs', 'uploads']) {
  mkdirSync(join(temporaryRoot, directory));
}
writeFileSync(join(temporaryRoot, 'empty.env'), '');
// Preserve OS/toolchain settings without propagating real provider credentials.
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  !/KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL|^NODE_OPTIONS$|^DOTENV_|^VITE_|^COINCIDES_D1_WALL_SMOKE_EVIDENCE$/i.test(key)));
Object.assign(env, {
  DB_PATH: ':memory:',
  DOTENV_CONFIG_PATH: join(temporaryRoot, 'empty.env'),
  COINCIDES_VALIDATION_ENV_DIR: join(temporaryRoot, 'env'),
  COINCIDES_APP_DATA_DIR: join(temporaryRoot, 'app-data'),
  CANVAS_ASSET_DIR: join(temporaryRoot, 'assets'),
  SOURCE_BLOB_DIR: join(temporaryRoot, 'blobs'),
  UPLOAD_DIR: join(temporaryRoot, 'uploads'),
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
if (mode === 'repaired') {
  nodeJob('repaired-suites', 'server', ['../scripts/run-server-test-suite.mjs',
    '--test-concurrency=1', '--test-reporter=tap',
    'src/__tests__/v13AtomicTextSaveMigration.test.ts',
    'src/__tests__/v13EventsLedger.test.ts',
    'src/__tests__/v13ProjectDeletionReferences.test.ts']);
} else if (mode === 'server') {
  npmJob('server-test-v2', 'server', 'test:v2', ['--', '--test-concurrency=1', '--test-reporter=tap']);
  const extra = JSON.parse(readFileSync(join(evidence, 'server-supplemental-files.json'), 'utf8'));
  nodeJob('server-supplemental', 'server', ['../scripts/run-server-test-suite.mjs',
    '--test-concurrency=1', '--test-reporter=tap', ...extra]);
} else if (mode === 'verify') {
  const command = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).scripts['verify:v2-bn8-runtime'];
  const gates = command.split(' && ');
  const excluded = ['git diff --check', 'npm run check:changed-file-secrets'];
  if (JSON.stringify(gates.slice(-2)) !== JSON.stringify(excluded)) throw new Error('Verify tail changed; re-audit before execution.');
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
} else {
  throw new Error('Expected repaired, server, verify, or typecheck.');
}

const results = [];
for (const job of jobs) {
  const logFile = join(evidence, `${job.name}.log`);
  const log = createWriteStream(logFile);
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
// The created temporary fixtures are retained outside the audit for this run;
// no build outputs or database files are copied into the evidence directory.
process.exitCode = results.some((result) => result.exitCode !== 0) ? 1 : 0;
