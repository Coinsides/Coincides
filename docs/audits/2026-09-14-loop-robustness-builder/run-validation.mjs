// Evidence runner for the 2026-09-14 loop-robustness order.
// Usage: node docs/audits/2026-09-14-loop-robustness-builder/run-validation.mjs
//   targeted | gates | server-full-serial | closeout | docs-final | client-full
// Full output belongs ONLY in .codex-tmp; docs/audits gets count summaries.
import { spawn } from 'node:child_process';
import {
  existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const evidenceDirectory = dirname(fileURLToPath(import.meta.url));
const root = resolve(evidenceDirectory, '../../..');
const server = join(root, 'server');
const client = join(root, 'client');
const [mode, ...extra] = process.argv.slice(2);
if (!['targeted', 'gates', 'server-full-serial', 'closeout', 'docs-final', 'client-full'].includes(mode) || extra.length) {
  throw new Error('Use exactly one documented evidence mode.');
}
const relativeName = (path) => relative(root, path).split(sep).join('/');
const npmCli = join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
if (!existsSync(npmCli)) throw new Error('Expected installed npm-cli.js beside the Node executable.');
const serverTsc = join(server, 'node_modules/typescript/bin/tsc');

function discoverTests(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Linked test entry: ${relativeName(path)}`);
    if (entry.isDirectory()) files.push(...discoverTests(path));
    else if (entry.isFile() && entry.name.endsWith('.test.ts')) files.push(path);
  }
  return files;
}
// Inventory both entire trees. No name filter, allowlist, or exemption in full mode.
const discovered = [
  ...discoverTests(join(server, 'src')),
  ...discoverTests(join(server, 'scripts')),
].sort();
const targeted = [
  join(server, 'src/agent/providers/index.test.ts'),
  ...discovered.filter((file) => /(?:Agent|ContextHint|LoopRobustness|AgentRouteLifecycle|ProposalUnification|DeleteCeremony|ReadTools).*\.test\.ts$/.test(file)),
];
if (targeted.some((file) => !discovered.includes(file))) {
  throw new Error('An expected targeted test file is absent from the discovered server suites.');
}

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
  { gate: 'git diff --check', status: 'not_run', reason: 'User reserves git closure for HQ.' },
  { gate: 'check:changed-file-secrets', status: 'not_run', reason: 'User reserves secrets closure for HQ; scanner invokes git.' },
];
// Compare text without invoking git or the complete aggregate command.
const packageScripts = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).scripts;
const expectedGate = [
  ...gateCommands.map((name) => `npm run ${name}`),
  'git diff --check', 'npm run check:changed-file-secrets',
].join(' && ');
if (mode === 'gates' && packageScripts['verify:v2-bn8-runtime'] !== expectedGate) {
  throw new Error('Runtime gate text changed; inspect the difference before executing it.');
}

const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`;
const rawRoot = join(root, '.codex-tmp/2026-09-14-loop-robustness-builder');
const runDirectory = join(rawRoot, `${mode}-${runId}`);
mkdirSync(runDirectory, { recursive: true });
// Credential tests intentionally reject stores inside the repository.
const temporaryParent = resolve(tmpdir());
const temporaryRoot = mkdtempSync(join(temporaryParent, 'coincides-loop-robustness-'));
const temporaryPaths = Object.fromEntries(
  ['empty-env', 'app-data', 'canvas-assets', 'source-blobs', 'uploads', 'temp'].map((name) => {
    const path = join(temporaryRoot, name);
    mkdirSync(path);
    return [name, path];
  }),
);
const emptyDotenv = join(temporaryRoot, 'empty.dotenv');
writeFileSync(emptyDotenv, '', 'utf8');
// OS plumbing only: do not inherit provider keys, NODE_OPTIONS, or application env.
const childEnv = {};
for (const name of [
  'PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'WINDIR', 'USERPROFILE',
  'APPDATA', 'LOCALAPPDATA', 'ComSpec', 'COMSPEC', 'PATHEXT', 'NUMBER_OF_PROCESSORS',
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
  TEMP: temporaryPaths.temp,
  TMP: temporaryPaths.temp,
  TMPDIR: temporaryPaths.temp,
  CI: '1',
  NO_COLOR: '1',
  npm_execpath: npmCli,
});

// Fixture output is retained in full except credential-shaped text. No env dump.
function sanitize(value) {
  return value
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(/(?:sk-|ghp_|github_pat_|xox[baprs]-)[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/((?:api[_-]?key|jwt[_-]?secret|password|access[_-]?token)\s*[=:]\s*)[^\s,}]+/gi, '$1[redacted]');
}
function testCounts(output) {
  const counts = {};
  // The final top-level TAP summary wins over earlier summaries in a step.
  for (const match of output.matchAll(/^# (tests|suites|pass|fail|cancelled|skipped|todo|duration_ms)\s+([\d.]+)/gm)) {
    counts[match[1]] = Number(match[2]);
  }
  for (const match of output.matchAll(/^\s*(Test Files|Tests)\s+(.+)$/gm)) {
    const parsed = {};
    for (const part of match[2].matchAll(/(\d+)\s+(passed|failed|skipped|todo)/g)) {
      parsed[part[2]] = Number(part[1]);
    }
    const total = match[2].match(/\((\d+)\)/);
    if (total) parsed.total = Number(total[1]);
    counts[match[1] === 'Tests' ? 'vitestTests' : 'vitestFiles'] = parsed;
  }
  return counts;
}
const selected = mode === 'server-full-serial' ? discovered : mode === 'targeted' ? targeted : [];
const summary = {
  mode, runId, startedAt: new Date().toISOString(),
  rawRunDirectory: relativeName(runDirectory),
  isolation: 'OS env allowlist; no inherited credentials/NODE_OPTIONS; in-memory DB; fresh empty dotenv/Vite/appdata/assets/uploads/temp in a dedicated system temporary directory.',
  scope: 'Full mode discovers all server/src and server/scripts .test.ts files and executes each unfiltered in its own process.',
  serverDiscoveredTestFiles: discovered.map(relativeName),
  selectedTestFiles: selected.map(relativeName),
  hqPending: mode === 'gates' ? hqPending : [],
  steps: [],
};
const rawSummaryPath = join(runDirectory, 'summary.json');
const evidenceSummaryPath = join(evidenceDirectory, `${mode}-summary.json`);
// Both files contain only distilled commands, exit states, paths, and counts.
const saveSummary = () => {
  const text = `${JSON.stringify(summary, null, 2)}\n`;
  writeFileSync(rawSummaryPath, text, 'utf8');
  writeFileSync(evidenceSummaryPath, text, 'utf8');
};
saveSummary();

async function execute(label, args, cwd = root, testFiles = []) {
  const started = Date.now();
  const logName = `${String(summary.steps.length + 1).padStart(3, '0')}-${label.replace(/[^\w.-]/g, '_')}.log`;
  console.log(`[loop-robustness] START ${label}`);
  let output = '';
  const heartbeat = setInterval(() => {
    console.log(`[loop-robustness] ${label}: running ${Math.round((Date.now() - started) / 1000)}s`);
  }, 45_000);
  let exitCode = 1;
  let signal = null;
  try {
    const result = await new Promise((done, reject) => {
      const child = spawn(process.execPath, args, {
        cwd, env: childEnv, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
      });
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk) => { output += chunk; });
      child.stderr.on('data', (chunk) => { output += chunk; });
      child.once('error', reject);
      child.once('close', (code, terminationSignal) => done({ code: code ?? 1, signal: terminationSignal }));
    });
    exitCode = result.code;
    signal = result.signal;
  } catch (error) {
    output += `\nRunner process error: ${error instanceof Error ? error.message : String(error)}\n`;
  } finally {
    clearInterval(heartbeat);
  }
  output = sanitize(output);
  const logPath = join(runDirectory, logName);
  writeFileSync(logPath, output, 'utf8');
  summary.steps.push({
    label,
    command: ['node', ...args.map((argument) => isAbsolute(argument) ? relativeName(argument) : argument)],
    cwd: relativeName(cwd) || '.',
    testFiles: testFiles.map(relativeName),
    exitCode, signal, durationMs: Date.now() - started,
    rawLog: relativeName(logPath), counts: testCounts(output),
  });
  saveSummary();
  console.log(`[loop-robustness] ${exitCode === 0 ? 'PASS' : 'FAIL'} ${label}; exit=${exitCode}; log=${relativeName(logPath)}`);
  return exitCode;
}
const npm = (label, args, cwd = root) => execute(label, [npmCli, ...args], cwd);
const sharedBuild = () => execute('shared-build', [serverTsc, '-b', join(root, 'shared/tsconfig.json')]);
const manifestReady = async () => {
  await npm('server-check-tool-face-manifest', ['run', 'check:tool-face-manifest'], server);
  await npm('server-copy-tool-face-manifest', ['run', 'copy:tool-face-manifest'], server);
};
const runTestFiles = (label, files) => execute(label, [
  '../scripts/run-server-test-suite.mjs', '--test-concurrency=1', '--test-reporter=tap',
  ...files.map((file) => relative(server, file).split(sep).join('/')),
], server, files);

try {
  if (mode === 'targeted' || mode === 'server-full-serial') {
    await sharedBuild();
    await manifestReady();
    // Per-file processes avoid the observed Node 22 multi-file IPC failure;
    // failures remain failures and do not stop execution of the remaining files.
    for (const file of selected) await runTestFiles(relativeName(file), [file]);
  } else if (mode === 'client-full') {
    await npm(mode, ['run', 'test:unit', '--', '--maxWorkers=2'], client);
  } else if (mode === 'gates') {
    await sharedBuild();
    for (const name of gateCommands) {
      if (name === 'test:unit') {
        // Same unfiltered suite; bound workers to avoid environmental resource churn.
        await npm(name, ['run', 'test:unit', '--', '--maxWorkers=2'], client);
      } else await npm(name, ['run', name]);
    }
    for (const pending of hqPending) console.log(`[loop-robustness] HQ PENDING ${pending.gate}`);
  } else if (mode === 'closeout') {
    await sharedBuild();
    await npm('check-test-wiring-final-layout', ['run', 'check:test-wiring']);
    await npm('server-build-final-text', ['run', 'build'], server);
    // Deliberately check-only: never refresh the repository-wide doc indexes.
    await npm('docs-check-after-result', ['run', 'docs:check']);
  } else if (mode === 'docs-final') {
    // Result/status changed the handoff index. The existing generator writes
    // only stale derived indexes; it does not rewrite source documents.
    await execute('refresh-derived-doc-index', ['scripts/docs-index.mjs']);
    await npm('docs-check-final', ['run', 'docs:check']);
  }
} catch (error) {
  summary.runnerError = sanitize(error instanceof Error ? error.message : String(error));
} finally {
  const resolvedTemporaryRoot = resolve(temporaryRoot);
  const withinRun = relative(temporaryParent, resolvedTemporaryRoot);
  if (!withinRun || withinRun === '..' || withinRun.startsWith(`..${sep}`) || isAbsolute(withinRun)) {
    summary.cleanupError = 'Temporary root containment check failed; no deletion attempted.';
  } else {
    try { rmSync(resolvedTemporaryRoot, { recursive: true, force: true }); }
    catch (error) { summary.cleanupError = sanitize(error instanceof Error ? error.message : String(error)); }
  }
  const testSteps = summary.steps.filter((step) => step.testFiles.length);
  const aggregate = Object.fromEntries(['tests', 'suites', 'pass', 'fail', 'cancelled', 'skipped', 'todo'].map((name) => [name, 0]));
  for (const step of testSteps) {
    for (const name of Object.keys(aggregate)) aggregate[name] += step.counts[name] ?? 0;
  }
  summary.serverTestAggregate = {
    selectedFiles: selected.length,
    executedFiles: testSteps.reduce((total, step) => total + step.testFiles.length, 0),
    filesWithTapCounts: testSteps.filter((step) => Number.isInteger(step.counts.tests)).length,
    ...aggregate,
  };
  summary.finishedAt = new Date().toISOString();
  summary.failedSteps = summary.steps.filter((step) => step.exitCode !== 0).map((step) => step.label);
  summary.missingTestCounts = testSteps.filter((step) => !Number.isInteger(step.counts.tests)).map((step) => step.label);
  summary.executedStepsPassed = !summary.runnerError && !summary.failedSteps.length;
  summary.selectedFilesCompleted = selected.length === summary.serverTestAggregate.executedFiles;
  summary.completeRuntimeGate = false;
  saveSummary();
  console.log(`[loop-robustness] Summary: ${relativeName(evidenceSummaryPath)}`);
  process.exitCode = summary.executedStepsPassed && summary.selectedFilesCompleted
    && !summary.missingTestCounts.length && !summary.cleanupError ? 0 : 1;
}
