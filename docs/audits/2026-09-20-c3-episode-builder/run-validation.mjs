// C3 evidence runner. Product gates remain unchanged; all model evals are scripted.
// Usage: node docs/audits/2026-09-20-c3-episode-builder/run-validation.mjs
//        gates | targeted | server-full | client-full | typecheck | evals
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const evidenceRoot = dirname(fileURLToPath(import.meta.url));
const root = resolve(evidenceRoot, '../../..');
const server = join(root, 'server');
const client = join(root, 'client');
const [mode, ...extra] = process.argv.slice(2);
if (!['gates', 'targeted', 'server-full', 'client-full', 'typecheck', 'evals'].includes(mode) || extra.length) {
  throw new Error('Use one documented C3 validation mode.');
}
const repoPath = path => relative(root, path).split(sep).join('/') || '.';
const npmCli = join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
if (!existsSync(npmCli)) throw new Error('Installed npm-cli.js was not found next to Node.');

function discover(directory, suffix) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Unexpected linked input: ${repoPath(path)}`);
    if (entry.isDirectory()) return discover(path, suffix);
    return entry.isFile() && entry.name.endsWith(suffix) ? [path] : [];
  }).sort();
}
const discovered = [...discover(join(server, 'src'), '.test.ts'), ...discover(join(server, 'scripts'), '.test.ts')].sort();
// This is only a focused regression convenience. server-full has no filter/exemption.
const targeted = discovered.filter(path => /(?:Agent|Episode|Intent|NotePatch|Attention|ContextHint|Claim|Memory|TurnIdentity|Proposal|BoardSandbox|LoopRobustness|AtomicTextSave)/u.test(path)
  || path.includes(`${sep}agent${sep}`) || path.endsWith(`${sep}agent-eval${sep}harness.test.ts`));
const selected = mode === 'server-full' ? discovered : mode === 'targeted' ? targeted : [];
const packageScripts = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).scripts;
const gateParts = packageScripts['verify:v2-bn8-runtime'].split(' && ');
const hqOnly = ['git diff --check', 'npm run check:changed-file-secrets'];
for (const command of hqOnly) {
  if (gateParts.filter(part => part === command).length !== 1) throw new Error(`Unexpected runtime gate HQ component: ${command}`);
}
const gateCommands = gateParts.filter(part => !hqOnly.includes(part)).map(part => {
  const match = part.match(/^npm run ([a-z0-9:-]+)$/u);
  if (!match) throw new Error(`Inspect new runtime gate syntax before running: ${part}`);
  return match[1];
});
const fileTimeoutMs = 660_000;
const runId = `${mode}-${new Date().toISOString().replace(/[:.]/gu, '-')}-${process.pid}`;
const rawRoot = join(root, '.codex-tmp/c3-episode', runId);
mkdirSync(rawRoot, { recursive: true });
const temporaryParent = realpathSync(tmpdir());
const temporaryRoot = mkdtempSync(join(temporaryParent, 'coincides-c3-validation-'));
const allocatedTemporaryRoot = realpathSync(temporaryRoot);
const temporary = Object.fromEntries(['empty-env', 'app-data', 'canvas-assets', 'source-blobs', 'uploads', 'temp'].map(name => {
  const path = join(temporaryRoot, name); mkdirSync(path); return [name, path];
}));
const emptyDotenv = join(temporaryRoot, 'empty.env');
writeFileSync(emptyDotenv, '', 'utf8');
const env = {};
// OS plumbing only. Do not inherit provider credentials, application paths or NODE_OPTIONS.
for (const name of ['PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'WINDIR', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA',
  'ComSpec', 'COMSPEC', 'PATHEXT', 'NUMBER_OF_PROCESSORS']) {
  if (process.env[name] !== undefined) env[name] = process.env[name];
}
Object.assign(env, {
  DB_PATH: ':memory:', NODE_ENV: 'test', COINCIDES_VALIDATION_ENV_DIR: temporary['empty-env'],
  DOTENV_CONFIG_PATH: emptyDotenv, DOTENV_CONFIG_QUIET: 'true', COINCIDES_APP_DATA_DIR: temporary['app-data'],
  CANVAS_ASSET_DIR: temporary['canvas-assets'], SOURCE_BLOB_DIR: temporary['source-blobs'],
  UPLOAD_DIR: temporary.uploads, DOCUMENT_UPLOAD_DIR: temporary.uploads,
  TEMP: temporary.temp, TMP: temporary.temp, TMPDIR: temporary.temp,
  CI: '1', NO_COLOR: '1', npm_execpath: npmCli,
});
const summary = {
  schemaVersion: 1, mode, runId, startedAt: new Date().toISOString(), rawRoot: repoPath(rawRoot),
  isolation: 'OS environment allowlist; in-memory SQLite; empty dotenv and Vite env directory; dedicated temporary application data, assets, uploads and temp. No provider credentials inherited.',
  serverFileTimeoutMs: fileTimeoutMs, nodeTestTimeoutMs: 600_000,
  runtimeGate: { totalComponents: gateParts.length, nonGitSecretsComponents: gateCommands.length,
    commands: gateCommands, hqPending: hqOnly, completeRuntimeGate: false },
  discoveredServerFiles: discovered.map(repoPath), selectedServerFiles: selected.map(repoPath), steps: [],
};
const summaryPath = join(evidenceRoot, `${mode}-summary.json`);
function saveSummary() {
  const text = `${JSON.stringify(summary, null, 2)}\n`;
  writeFileSync(join(rawRoot, 'summary.json'), text, 'utf8');
  writeFileSync(summaryPath, text, 'utf8');
}
function sanitize(value) {
  return value.replace(/\x1b\[[0-9;]*m/gu, '')
    .replace(/(?:sk-|ghp_|github_pat_|xox[baprs]-)[A-Za-z0-9_-]+/gu, '[redacted]')
    .replace(/Bearer\s+\S+/giu, 'Bearer [redacted]');
}
function counts(output) {
  const result = {};
  for (const match of output.matchAll(/^# (tests|suites|pass|fail|cancelled|skipped|todo|duration_ms)\s+([\d.]+)/gmu)) {
    result[match[1]] = Number(match[2]);
  }
  for (const match of output.matchAll(/^\s*(Test Files|Tests)\s+(.+)$/gmu)) {
    const values = {};
    for (const count of match[2].matchAll(/(\d+)\s+(passed|failed|skipped|todo)/gu)) values[count[2]] = Number(count[1]);
    const total = match[2].match(/\((\d+)\)/u);
    if (total) values.total = Number(total[1]);
    result[match[1] === 'Tests' ? 'vitestTests' : 'vitestFiles'] = values;
  }
  return result;
}
async function execute(label, args, cwd = root, files = [], timeoutMs = fileTimeoutMs) {
  const started = Date.now();
  let output = ''; let timedOut = false; let exitCode = 1; let signal = null;
  console.log(`[c3] START ${label}`);
  const heartbeat = setInterval(() => console.log(`[c3] ${label}: ${Math.round((Date.now() - started) / 1000)}s`), 45_000);
  try {
    const result = await new Promise((done, reject) => {
      const child = spawn(process.execPath, args, { cwd, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
      child.stdout.on('data', chunk => { output += chunk; });
      child.stderr.on('data', chunk => { output += chunk; });
      const timer = setTimeout(() => {
        timedOut = true;
        output += `\nEvidence runner exceeded ${timeoutMs}ms budget.\n`;
        if (process.platform === 'win32' && child.pid) {
          const stop = spawn('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], { env, windowsHide: true, stdio: 'ignore' });
          stop.once('error', () => child.kill());
        } else child.kill('SIGTERM');
      }, timeoutMs);
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('close', (code, reason) => { clearTimeout(timer); done({ code: code ?? 1, signal: reason }); });
    });
    exitCode = result.code; signal = result.signal;
  } catch (error) { output += `\nRunner error: ${error instanceof Error ? error.message : String(error)}\n`; }
  finally { clearInterval(heartbeat); }
  output = sanitize(output);
  const rawLog = join(rawRoot, `${String(summary.steps.length + 1).padStart(3, '0')}-${label.replace(/[^\w.-]/gu, '_')}.log`);
  writeFileSync(rawLog, output, 'utf8');
  const step = { label, command: ['node', ...args.map(arg => isAbsolute(arg) ? repoPath(arg) : arg)], cwd: repoPath(cwd),
    files: files.map(repoPath), exitCode, signal, timedOut, durationMs: Date.now() - started, rawLog: repoPath(rawLog), counts: counts(output) };
  summary.steps.push(step); saveSummary();
  console.log(`[c3] ${exitCode === 0 && !timedOut ? 'PASS' : 'FAIL'} ${label}; ${step.durationMs}ms; ${step.rawLog}`);
  return step;
}
const npm = (label, script, cwd = root, extraArgs = []) => execute(label, [npmCli, 'run', script, ...extraArgs], cwd);
const sharedBuild = () => execute('shared-build', [join(server, 'node_modules/typescript/bin/tsc'), '-b', join(root, 'shared/tsconfig.json')]);
async function prepareServer() {
  await sharedBuild();
  await npm('server-manifest-check', 'check:tool-face-manifest', server);
  await npm('server-manifest-copy', 'copy:tool-face-manifest', server);
}
saveSummary();
try {
  if (mode === 'targeted' || mode === 'server-full') {
    await prepareServer();
    for (const file of selected) {
      await execute(repoPath(file), ['../scripts/run-server-test-suite.mjs', '--test-concurrency=1', '--test-timeout=600000',
        relative(server, file).split(sep).join('/')], server, [file]);
    }
  } else if (mode === 'gates') {
    await sharedBuild();
    for (const name of gateCommands) {
      if (name === 'test:unit') await npm(name, 'test:unit', client, ['--', '--maxWorkers=2']);
      else await npm(name, name);
    }
  } else if (mode === 'client-full') {
    await sharedBuild();
    await npm('client-full', 'test:unit', client, ['--', '--maxWorkers=2']);
  } else if (mode === 'typecheck') {
    await sharedBuild();
    await execute('server-typecheck', [join(server, 'node_modules/typescript/bin/tsc'), '--noEmit'], server);
    await execute('client-typecheck', [join(client, 'node_modules/typescript/bin/tsc'), '--noEmit'], client);
    await npm('agent-eval-typecheck', 'typecheck:agent-eval');
  } else if (mode === 'evals') {
    await prepareServer();
    for (const scenario of discover(join(server, 'scripts/agent-eval/scenarios'), '.ts')) {
      const id = scenario.split(sep).at(-1).replace(/\.ts$/u, '');
      const resultPath = join(rawRoot, `${id}.json`);
      const step = await execute(id, ['--import', 'tsx', 'scripts/agent-eval/worker.ts', scenario, resultPath, 'scripted'], server);
      if (existsSync(resultPath)) {
        const result = JSON.parse(readFileSync(resultPath, 'utf8'));
        step.eval = { name: result.name, mode: result.mode, assertions: result.assertions.map(({ name, passed, error }) => ({ name, passed, ...(error ? { error } : {}) })),
          assertionCount: result.assertions.length, passed: result.assertions.filter(item => item.passed).length,
          claimWithoutReceiptCount: (result.finalTables.events ?? []).filter(event => event.verb === 'claim_without_receipt').length,
          durationMs: result.durationMs, rawResult: repoPath(resultPath), ...(result.executionError ? { executionError: result.executionError } : {}) };
        saveSummary();
      }
    }
    await npm('agent-eval-selftests', 'test:agent-eval');
  }
} catch (error) { summary.runnerError = sanitize(error instanceof Error ? error.message : String(error)); }
finally {
  const exact = resolve(temporaryRoot);
  const inside = relative(temporaryParent, exact);
  if (exact !== allocatedTemporaryRoot || realpathSync(exact) !== allocatedTemporaryRoot || !inside
    || isAbsolute(inside) || inside === '..' || inside.startsWith(`..${sep}`)) {
    summary.cleanupError = 'Allocated temporary root failed containment check; no deletion attempted.';
  } else {
    try { rmSync(exact, { recursive: true, force: true }); }
    catch (error) { summary.cleanupError = sanitize(error instanceof Error ? error.message : String(error)); }
  }
  const testSteps = summary.steps.filter(step => step.files.length);
  summary.serverTestAggregate = Object.fromEntries(['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo']
    .map(key => [key, testSteps.reduce((sum, step) => sum + (step.counts[key] ?? 0), 0)]));
  summary.executedServerFiles = testSteps.flatMap(step => step.files);
  summary.missingServerFiles = selected.map(repoPath).filter(file => !summary.executedServerFiles.includes(file));
  summary.missingTapSummaries = testSteps.filter(step => !Number.isInteger(step.counts.tests)).map(step => step.label);
  summary.nonPassingTapSummaries = testSteps.filter(step => step.counts.fail > 0 || step.counts.cancelled > 0).map(step => step.label);
  summary.filesWithTapCounts = testSteps.filter(step => Number.isInteger(step.counts.tests)).length;
  summary.failedSteps = summary.steps.filter(step => step.exitCode !== 0 || step.timedOut).map(step => step.label);
  summary.finishedAt = new Date().toISOString();
  summary.passed = !summary.runnerError && !summary.cleanupError && !summary.failedSteps.length
    && !summary.missingServerFiles.length && !summary.missingTapSummaries.length && !summary.nonPassingTapSummaries.length;
  saveSummary();
  console.log(`[c3] Summary ${repoPath(summaryPath)}: ${summary.passed ? 'PASS' : 'FAIL'}`);
  process.exitCode = summary.passed ? 0 : 1;
}
