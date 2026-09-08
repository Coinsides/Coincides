#!/usr/bin/env node
// Run the existing verification commands with an empty Vite env directory.
// Output is summarized in memory; raw test/scan output is never printed or saved.
// Examples:
//   node scripts/run-isolated-coordinate-validation.mjs
//   node scripts/run-isolated-coordinate-validation.mjs --cwd client -- npm run test:unit -- path/to/test.ts
//   node scripts/run-isolated-coordinate-validation.mjs --cwd server -- node --import tsx --test path/to/test.ts
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scratchRoot = join(root, '.codex-tmp', 'coordinate-validation');
const args = process.argv.slice(2);
let workingDirectory = root;
if (args[0] === '--cwd') {
  const requested = args[1];
  if (!['.', 'client', 'server', 'shared'].includes(requested)) {
    throw new Error('Validation working directory must be root, client, server, or shared.');
  }
  workingDirectory = resolve(root, requested);
  args.splice(0, 2);
}
if (args[0] === '--') args.shift();
const command = args.length ? args.shift() : 'npm';
const commandArgs = args.length ? args : ['run', 'verify:v2-bn8-runtime'];
if (!['npm', 'node'].includes(command)) {
  throw new Error('Validation runner accepts npm or node commands only.');
}

function gitPaths(args) {
  return execFileSync('git', args, {
    cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  }).split(/\r?\n/).filter(Boolean);
}

const changedPaths = new Set([
  ...gitPaths(['diff', '--name-only', '--diff-filter=ACMRTUXB']),
  ...gitPaths(['diff', '--cached', '--name-only', '--diff-filter=ACMRTUXB']),
  ...gitPaths(['ls-files', '--others', '--exclude-standard']),
]);
if ([...changedPaths].some((file) => /^\.env(?:\.|$)/i.test(basename(file)))) {
  throw new Error('Validation refused: a changed env file would enter the existing changed-file scan.');
}

function npmCliPath() {
  const candidates = [
    process.env.npm_execpath,
    join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  ];
  if (process.platform === 'win32' && !candidates.some((path) => path && existsSync(path))) {
    const npmCommands = execFileSync('where.exe', ['npm.cmd'], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
    }).split(/\r?\n/).filter(Boolean);
    candidates.push(...npmCommands.map((path) => join(dirname(path), 'node_modules', 'npm', 'bin', 'npm-cli.js')));
  }
  const found = candidates.find((path) => path && basename(path) === 'npm-cli.js' && existsSync(path));
  if (!found) throw new Error('Cannot locate npm CLI without a shell.');
  return found;
}

function diagnosticSummary(rawOutput) {
  const clean = rawOutput.replace(/\u001b\[[0-9;]*m/g, '');
  // The allowlist excludes security scanner output and arbitrary console output.
  const lines = clean.split(/\r?\n/).filter((line) => (
    /^\s*(?:Test Files|Tests|Duration)\s/.test(line)
    || /^# (?:tests|suites|pass|fail|cancelled|skipped|todo|duration_ms)\s/.test(line)
    || /^\s*(?:FAIL\s|AssertionError:|Error:|TypeError:|ReferenceError:)/.test(line)
    || /(?:^|\s)error TS\d+:/.test(line)
    || /^\s*(?:Expected|Received|expected|received):/.test(line)
    || /^\s*(?:not ok \d+|× )/.test(line)
  ));
  return lines.slice(-100).map((line) => line
    .replace(/(?:sk-|ghp_|github_pat_|xox[baprs]-)[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/(?:[A-Za-z0-9_+\/.=-]){40,}/g, '[redacted-long-value]')
    .replace(/((?:api[_-]?key|secret|password|token)\s*[:=]\s*)\S+/gi, '$1[redacted]')
    .slice(0, 1200));
}

mkdirSync(scratchRoot, { recursive: true });
const temporaryRoot = mkdtempSync(join(scratchRoot, 'run-'));
const emptyEnvDirectory = join(temporaryRoot, 'empty-env');
mkdirSync(emptyEnvDirectory);
const canvasAssetDirectory = join(temporaryRoot, 'canvas-assets');
const sourceBlobDirectory = join(temporaryRoot, 'source-blobs');
mkdirSync(canvasAssetDirectory);
mkdirSync(sourceBlobDirectory);
const childEnv = {
  ...process.env,
  COINCIDES_VALIDATION_ENV_DIR: emptyEnvDirectory,
  CANVAS_ASSET_DIR: canvasAssetDirectory,
  SOURCE_BLOB_DIR: sourceBlobDirectory,
};
delete childEnv.NODE_OPTIONS;
// A missing explicit synthetic database cannot silently select the user's database.
childEnv.DB_PATH = ':memory:';
let rawOutput = '';
let exitCode = 1;
let pendingOutput = '';
const started = Date.now();
const heartbeat = setInterval(() => {
  console.log(`[coordinate-validation] running (${Math.round((Date.now() - started) / 1000)}s)`);
}, 45000);

try {
  const executableArgs = command === 'npm' ? [npmCliPath(), ...commandArgs] : commandArgs;
  const child = spawn(process.execPath, executableArgs, {
    cwd: workingDirectory, env: childEnv,
    stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  });
  const capture = (chunk) => {
    const text = chunk.toString();
    rawOutput += text;
    pendingOutput += text;
    const lines = pendingOutput.split(/\r?\n/);
    pendingOutput = lines.pop() || '';
    for (const line of lines) {
      const stage = line.match(/^> [@\w/.-]+@\d[\w.-]* ([\w:.-]+)$/)?.[1];
      if (stage) console.log(`[coordinate-validation] stage ${stage}`);
    }
  };
  child.stdout.on('data', capture);
  child.stderr.on('data', capture);
  exitCode = await new Promise((resolveCode, reject) => {
    child.once('error', reject);
    child.once('close', (code) => resolveCode(typeof code === 'number' ? code : 1));
  });
  for (const line of diagnosticSummary(rawOutput)) console.log(line);
  console.log(`[coordinate-validation] exit=${exitCode}; elapsed=${Math.round((Date.now() - started) / 1000)}s; raw output withheld`);
} catch {
  console.error('[coordinate-validation] failed to start or finish the selected command; raw error withheld');
} finally {
  clearInterval(heartbeat);
  const removalTarget = resolve(temporaryRoot);
  const removalRelative = relative(scratchRoot, removalTarget);
  if (removalRelative && !isAbsolute(removalRelative) && removalRelative !== '..'
    && !removalRelative.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`)) {
    rmSync(removalTarget, { recursive: true, force: true });
  }
}
process.exitCode = exitCode;
