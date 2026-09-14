// One-off evidence runner for the 2026-09-14 tool-stream repair order.
// Does not change the project's verification machinery or omit existing tests.
// Usage: node docs/audits/2026-09-14-toolstream-repair-builder/run-validation.mjs
//   targeted | gates | server-full | server-full-serial | client-full | typechecks | closeout | docs-final
// Optional targeted operands must name discovered server test files.
import { spawn } from 'node:child_process';
import {
  existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const evidenceDirectory = dirname(fileURLToPath(import.meta.url));
const root = resolve(evidenceDirectory, '../../..');
const server = join(root, 'server');
const client = join(root, 'client');
const [mode, ...requestedTests] = process.argv.slice(2);
const modes = new Set(['targeted', 'gates', 'server-full', 'server-full-serial', 'client-full', 'typechecks', 'closeout', 'docs-final']);
if (!modes.has(mode) || (mode !== 'targeted' && requestedTests.length)) {
  throw new Error('Use targeted [server test paths], gates, server-full, server-full-serial, client-full, typechecks, closeout, or docs-final.');
}

const npmCli = join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
if (!existsSync(npmCli)) throw new Error('Expected the installed npm-cli.js beside node.exe.');
const serverTsc = join(server, 'node_modules/typescript/bin/tsc');
const clientTsc = join(client, 'node_modules/typescript/bin/tsc');
const relativeName = (path) => relative(root, path).split(sep).join('/');

// Enumerate only these source trees; reject linked entries instead of following them.
function discoverTests(directory) {
  const found = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error(`Linked test entry: ${relativeName(join(directory, entry.name))}`);
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...discoverTests(path));
    else if (entry.isFile() && entry.name.endsWith('.test.ts')) found.push(path);
  }
  return found;
}
const discovered = [
  ...discoverTests(join(server, 'src')),
  ...discoverTests(join(server, 'scripts')),
].sort();
const discoveredSet = new Set(discovered);
let targeted = discovered.filter((path) => /(?:v14ContextHint|[\\/]providers[\\/]index)\.test\.ts$/i.test(path));
if (requestedTests.length) {
  targeted = requestedTests.map((path) => resolve(root, path));
  if (targeted.some((path) => !discoveredSet.has(path))) {
    throw new Error('Targeted operands must be discovered server test files, relative to repository root.');
  }
}
if (mode === 'targeted' && !targeted.length) throw new Error('No existing tool-stream test files found.');

// Read the gate's command text only. Execute exclusively the bounded list below.
const gateCommands = [
  'check:test-wiring', 'check:tech-debt-table', 'test:unit',
  'test:tool-face-registry', 'test:tool-face-manifest', 'check:tool-face-manifest',
  'test:tool-face-parity', 'check:tool-face-parity', 'check:server-shared-runtime-import',
  'check:canvas-runtime-boundary', 'check:group-gallery-shell', 'check:groups-rail-shell',
  'check:single-editor-shell', 'check:source-experience', 'check:v2-bn11-legacy-shutdown',
  'check:v2-bn11-relation-freshness', 'smoke:canvas-engine-model-contract',
  'build:client', 'build', 'smoke:canvas-engine-performance', 'docs:check',
];
const hqPending = [
  { gate: 'git diff --check', status: 'not_run', reason: 'Order reserves git/secrets closure for HQ; zero git commands.' },
  { gate: 'check:changed-file-secrets', status: 'not_run', reason: 'Order reserves git/secrets closure for HQ; scanner invokes git.' },
];
const packageScripts = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).scripts;
const expectedGate = [
  ...gateCommands.map((name) => `npm run ${name}`),
  'git diff --check', 'npm run check:changed-file-secrets',
].join(' && ');
if (mode === 'gates' && packageScripts['verify:v2-bn8-runtime'] !== expectedGate) {
  throw new Error('Runtime gate text changed; inspect before updating this evidence runner.');
}

const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`;
const runDirectory = join(evidenceDirectory, `${mode}-${runId}`);
mkdirSync(runDirectory, { recursive: true });
const temporaryRoot = mkdtempSync(join(tmpdir(), 'coincides-toolstream-'));
const temporaryPaths = Object.fromEntries(
  ['empty-env', 'app-data', 'canvas-assets', 'source-blobs', 'uploads'].map((name) => {
    const path = join(temporaryRoot, name);
    mkdirSync(path);
    return [name, path];
  }),
);
const emptyDotenv = join(temporaryRoot, 'empty.dotenv');
writeFileSync(emptyDotenv, '', 'utf8');
const childEnv = {};
for (const name of [
  'PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP',
  'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'ComSpec', 'COMSPEC', 'PATHEXT', 'NUMBER_OF_PROCESSORS',
]) {
  if (process.env[name] !== undefined) childEnv[name] = process.env[name];
}
Object.assign(childEnv, {
  DB_PATH: ':memory:',
  COINCIDES_VALIDATION_ENV_DIR: temporaryPaths['empty-env'],
  DOTENV_CONFIG_PATH: emptyDotenv,
  DOTENV_CONFIG_QUIET: 'true',
  COINCIDES_APP_DATA_DIR: temporaryPaths['app-data'],
  CANVAS_ASSET_DIR: temporaryPaths['canvas-assets'],
  SOURCE_BLOB_DIR: temporaryPaths['source-blobs'],
  UPLOAD_DIR: temporaryPaths.uploads,
  CI: '1',
  NO_COLOR: '1',
  npm_execpath: npmCli,
});

// Only synthetic fixture credentials are available. Redact credential-shaped
// output nevertheless; do not print or persist any environment values.
function sanitize(value) {
  return value
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(/(?:sk-|ghp_|github_pat_|xox[baprs]-)[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/((?:api[_-]?key|jwt[_-]?secret|password|access[_-]?token)\s*[=:]\s*)[^\s,}]+/gi, '$1[redacted]');
}
function testCounts(output) {
  const result = {};
  for (const match of output.matchAll(/^# (tests|suites|pass|fail|cancelled|skipped|todo|duration_ms)\s+([\d.]+)/gm)) {
    result[match[1]] = Number(match[2]);
  }
  const vitest = output.split(/\r?\n/).filter((line) => /^\s*(?:Test Files|Tests|Duration)\s/.test(line));
  if (vitest.length) result.vitest = vitest;
  return result;
}
const summary = {
  mode, runId, startedAt: new Date().toISOString(),
  scope: 'Full suite modes exclude no tests; targeted selection is recorded explicitly. No new security/adversarial cases.',
  isolation: 'OS environment allowlist; in-memory default DB; fresh system-temp dotenv/Vite/appdata/assets/uploads; no inherited credentials or NODE_OPTIONS.',
  serverDiscoveredTestFiles: discovered.map(relativeName),
  selectedTestFiles: (mode.startsWith('server-full') ? discovered : mode === 'targeted' ? targeted : []).map(relativeName),
  hqPending: mode === 'gates' ? hqPending : [],
  steps: [],
};
const summaryPath = join(runDirectory, 'summary.json');
const saveSummary = () => writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
saveSummary();

async function execute(label, args, cwd = root) {
  const started = Date.now();
  const logName = `${String(summary.steps.length + 1).padStart(2, '0')}-${label.replace(/[^\w.-]/g, '_')}.log`;
  console.log(`[toolstream-repair] START ${label}`);
  let rawOutput = '';
  const heartbeat = setInterval(() => console.log(`[toolstream-repair] ${label}: running ${Math.round((Date.now() - started) / 1000)}s`), 45_000);
  let exitCode = 1;
  let signal = null;
  try {
    const result = await new Promise((done, reject) => {
      const child = spawn(process.execPath, args, {
        cwd, env: childEnv, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
      });
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk) => { rawOutput += chunk; });
      child.stderr.on('data', (chunk) => { rawOutput += chunk; });
      child.once('error', reject);
      child.once('close', (code, terminationSignal) => done({ code: code ?? 1, signal: terminationSignal }));
    });
    exitCode = result.code;
    signal = result.signal;
  } catch (error) {
    rawOutput += `\nRunner process error: ${error instanceof Error ? error.message : String(error)}\n`;
  } finally {
    clearInterval(heartbeat);
  }
  const output = sanitize(rawOutput);
  writeFileSync(join(runDirectory, logName), output, 'utf8');
  const step = {
    label, command: ['node', ...args.map((argument) => isAbsolute(argument) ? relativeName(argument) : argument)],
    cwd: relativeName(cwd) || '.', exitCode, signal, durationMs: Date.now() - started,
    log: logName, counts: testCounts(output),
  };
  summary.steps.push(step);
  saveSummary();
  console.log(`[toolstream-repair] ${exitCode === 0 ? 'PASS' : 'FAIL'} ${label}; exit=${exitCode}; log=${relativeName(join(runDirectory, logName))}`);
  return exitCode;
}
const npm = (label, args, cwd = root) => execute(label, [npmCli, ...args], cwd);
const sharedBuild = () => execute('shared-build', [serverTsc, '-b', join(root, 'shared/tsconfig.json')]);
const manifestReady = async () => {
  await npm('server-check-tool-face-manifest', ['run', 'check:tool-face-manifest'], server);
  await npm('server-copy-tool-face-manifest', ['run', 'copy:tool-face-manifest'], server);
};
const clientTests = (label = 'client-full') => npm(label, ['run', 'test:unit', '--', '--maxWorkers=2'], client);

try {
  if (mode === 'docs-final') {
    await execute('refresh-result-status-index', ['scripts/docs-index.mjs']);
    await npm('docs-check-after-result', ['run', 'docs:check']);
  } else if (mode === 'typechecks') {
    await execute('shared-typecheck', [serverTsc, '-p', join(root, 'shared/tsconfig.json'), '--noEmit']);
    await sharedBuild();
    await execute('server-typecheck', [serverTsc, '--noEmit'], server);
    await npm('server-build', ['run', 'build'], server);
    await execute('client-typecheck', [clientTsc, '-b', '--noEmit'], client);
    await npm('client-build', ['run', 'build'], client);
  } else if (mode === 'closeout') {
    await npm('check-test-wiring-final-layout', ['run', 'check:test-wiring']);
    await npm('server-build-final-text', ['run', 'build'], server);
    // HQ/root owns any documentation index refresh after Result/status updates.
    await npm('docs-check-after-result', ['run', 'docs:check']);
  } else if (mode === 'client-full') {
    await clientTests();
  } else if (mode === 'server-full-serial') {
    await sharedBuild();
    await manifestReady();
    // All discovered files, each in its own test process. This avoids the observed
    // Node 22 multi-file IPC deserialization failure without removing any case.
    for (const file of discovered) {
      await execute(relativeName(file), [
        '../scripts/run-server-test-suite.mjs', '--test-concurrency=1', '--test-reporter=tap',
        relative(server, file).split(sep).join('/'),
      ], server);
    }
  } else if (mode === 'targeted' || mode === 'server-full') {
    await sharedBuild();
    await manifestReady();
    const testFiles = mode === 'targeted' ? targeted : discovered;
    await execute(mode, [
      '../scripts/run-server-test-suite.mjs', '--test-concurrency=2', '--test-reporter=tap',
      ...testFiles.map((path) => relative(server, path).split(sep).join('/')),
    ], server);
  } else if (mode === 'gates') {
    await sharedBuild();
    for (const name of gateCommands) {
      if (name === 'test:unit') await clientTests(name);
      else await npm(name, ['run', name]);
    }
    for (const pending of hqPending) console.log(`[toolstream-repair] HQ PENDING ${pending.gate}: ${pending.reason}`);
  }
} catch (error) {
  summary.runnerError = sanitize(error instanceof Error ? error.message : String(error));
} finally {
  // The only deletion target is the exact directory created by mkdtemp above.
  const resolvedTemporaryRoot = resolve(temporaryRoot);
  const temporaryParent = relative(resolve(tmpdir()), resolvedTemporaryRoot);
  if (!temporaryParent || temporaryParent === '..' || temporaryParent.startsWith(`..${sep}`) || isAbsolute(temporaryParent)) {
    summary.cleanupError = 'Temporary root containment check failed; no deletion attempted.';
  } else {
    try { rmSync(resolvedTemporaryRoot, { recursive: true, force: true }); }
    catch (error) { summary.cleanupError = sanitize(error instanceof Error ? error.message : String(error)); }
  }
  summary.finishedAt = new Date().toISOString();
  summary.failedSteps = summary.steps.filter((step) => step.exitCode !== 0).map((step) => step.label);
  summary.executedStepsPassed = !summary.runnerError && !summary.failedSteps.length;
  summary.completeRuntimeGate = false;
  saveSummary();
  console.log(`[toolstream-repair] Summary: ${relativeName(summaryPath)}`);
  process.exitCode = summary.executedStepsPassed && !summary.cleanupError ? 0 : 1;
}
