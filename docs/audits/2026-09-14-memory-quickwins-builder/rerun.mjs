#!/usr/bin/env node
// Run from any directory. This receipt runner never invokes the complete runtime
// gate: its final git / credential-scanner commands belong to HQ.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync,
  rmdirSync, unlinkSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const RAW_ROOT = join(REPO, '.codex-tmp/2026-09-14-memory-quickwins-builder');
const SERVER = join(REPO, 'server');
const ROOT_PACKAGE = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8'));
const GATE_NAME = 'verify:v2-bn8-runtime';
const GATE = ROOT_PACKAGE.scripts[GATE_NAME];
const HQ_SUFFIX = ' && git diff --check && npm run check:changed-file-secrets';
const CLEARED_PROVIDER_VARIABLES = [
  'ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GENERIC_API_KEY', 'DEEPSEEK_API_KEY',
  'DASHSCOPE_API_KEY', 'VOYAGE_API_KEY', 'ANTHROPIC_AUTH_TOKEN',
];
const AGENT_FILES = [
  'src/agent/providers/index.test.ts',
  'src/__tests__/providerCredentials.test.ts',
  'src/__tests__/v13AgentMemories.test.ts',
  'src/__tests__/v14AgentWriteDoor.test.ts',
  'src/__tests__/v14AgentVerbTransfer.test.ts',
  'src/__tests__/v14DeleteCeremony.test.ts',
  'src/__tests__/v14ProposalUnification.test.ts',
  'src/__tests__/v14ReadTools.test.ts',
  'src/__tests__/v14ContextHint.test.ts',
  'src/__tests__/v14LoopRobustness.test.ts',
  'src/__tests__/v14AgentRouteLifecycle.test.ts',
  'src/__tests__/v14MemoryQuickwins.test.ts',
];

const posix = path => path.split(sep).join('/');
const repoRelative = path => posix(relative(REPO, path));
const sha256 = text => createHash('sha256').update(text).digest('hex');

function npmCli() {
  const candidates = [
    process.env.npm_execpath,
    join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'),
    ...(process.env.PATH || process.env.Path || '').split(delimiter)
      .map(directory => join(directory, 'node_modules/npm/bin/npm-cli.js')),
  ];
  const found = candidates.find(path => path && existsSync(path) && /npm-cli[.]js$/i.test(path));
  if (!found) throw new Error('Cannot locate npm-cli.js; invoke with an npm-provided npm_execpath.');
  return resolve(found);
}

function collectTests(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Linked test entry refused: ${repoRelative(path)}`);
    if (entry.isDirectory()) return collectTests(path);
    return entry.isFile() && entry.name.endsWith('.test.ts') ? [path] : [];
  });
}

// Check all package-script commands reached by the requested runtime components,
// including npm's pre/post hooks. Only the repository's current simple grammar
// is accepted; changed shell syntax fails closed for a new human inspection.
function inspectPackageScript(cwd, name, seen = new Set()) {
  const key = `${cwd}#${name}`;
  if (seen.has(key)) return [];
  seen.add(key);
  const packagePath = join(cwd, 'package.json');
  const scripts = JSON.parse(readFileSync(packagePath, 'utf8')).scripts || {};
  if (typeof scripts[name] !== 'string') throw new Error(`Missing package script ${key}`);
  const records = [];
  for (const hook of [`pre${name}`, name, `post${name}`]) {
    if (!scripts[hook]) continue;
    const command = scripts[hook];
    records.push({ package: repoRelative(packagePath), script: hook, command });
    let childCwd = cwd;
    for (const segment of command.split(' && ')) {
      if (/[&|;<>`\r\n]/.test(segment) || /(^|\s)git(?:\s|$)|changed.file.secret|[.]git(?:[\\/]|\s|$)/i.test(segment)) {
        throw new Error(`Unapproved command in ${repoRelative(packagePath)}#${hook}: ${segment}`);
      }
      const cd = /^cd ([\w./-]+)$/.exec(segment);
      if (cd) { childCwd = resolve(childCwd, cd[1]); continue; }
      const nested = /^npm run ([\w:-]+)(?: -- --check)?$/.exec(segment);
      if (nested) {
        records.push(...inspectPackageScript(childCwd, nested[1], seen));
        continue;
      }
      if (!/^(?:node|tsc|vite|vitest)(?:\s|$)/.test(segment)) {
        throw new Error(`Unreviewed executable in ${repoRelative(packagePath)}#${hook}: ${segment}`);
      }
    }
  }
  return records;
}

function parseOptions() {
  const options = { stages: ['all'], list: false, keepGoing: false, runId: null };
  for (let index = 2; index < process.argv.length; index++) {
    const arg = process.argv[index];
    if (arg === '--stage') options.stages = (process.argv[++index] || '').split(',');
    else if (arg === '--run-id') options.runId = process.argv[++index];
    else if (arg === '--list') options.list = true;
    else if (arg === '--keep-going') options.keepGoing = true;
    else throw new Error(`Unknown option ${arg}; use --stage all|directed|quickwins|history|agent|server|client|runtime, --list, --run-id NAME, --keep-going.`);
  }
  if (options.runId !== null && !/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,79}$/.test(options.runId)) {
    throw new Error('--run-id must be a simple name, with no directory separators.');
  }
  const expanded = options.stages.flatMap(stage => stage === 'all'
    ? ['quickwins', 'history', 'agent', 'server', 'runtime']
    : stage === 'directed' ? ['quickwins', 'history'] : [stage]);
  options.stages = [...new Set(expanded)];
  if (options.stages.some(stage => !['quickwins', 'history', 'agent', 'server', 'client', 'runtime'].includes(stage))) {
    throw new Error('Unknown stage.');
  }
  // The runtime prefix already runs the complete client suite once.
  if (options.stages.includes('runtime')) options.stages = options.stages.filter(stage => stage !== 'client');
  return options;
}

function makeCommands(options, cli) {
  if (typeof GATE !== 'string' || !GATE.endsWith(HQ_SUFFIX)) {
    throw new Error('The runtime gate suffix changed; inspect it again before rerunning.');
  }
  const prefixScripts = GATE.slice(0, -HQ_SUFFIX.length).split(' && ').map(command => {
    const match = /^npm run ([\w:-]+)$/.exec(command);
    if (!match) throw new Error(`Unreviewed runtime segment: ${command}`);
    return match[1];
  });
  const commands = [];
  const suite = (stage, id, files, options = []) => commands.push({
    stage, id, cwd: 'server', executable: process.execPath,
    args: ['../scripts/run-server-test-suite.mjs', '--test-reporter=tap', '--test-concurrency=1', ...options, ...files],
    testFiles: files.map(file => `server/${file}`),
  });
  const npm = (stage, id, cwd, script) => commands.push({
    stage, id, cwd: repoRelative(cwd) || '.', executable: process.execPath,
    args: [cli, 'run', script], packageScripts: inspectPackageScript(cwd, script),
  });
  for (const stage of options.stages) {
    if (stage === 'quickwins') suite(stage, 'memory-quickwins', ['src/__tests__/v14MemoryQuickwins.test.ts']);
    else if (stage === 'history') suite(stage, 'existing-rowid-pairing', [
      'src/__tests__/v14AgentRouteLifecycle.test.ts', 'src/__tests__/v14LoopRobustness.test.ts',
    ], ['--test-name-pattern=disconnect at tool_(start|end) preserves|request deadline is checked between tool rounds']);
    else if (stage === 'agent') suite(stage, 'agent-family', AGENT_FILES);
    else if (stage === 'server') {
      npm(stage, 'server-manifest-check', SERVER, 'check:tool-face-manifest');
      npm(stage, 'server-manifest-copy', SERVER, 'copy:tool-face-manifest');
      const files = [join(SERVER, 'src'), join(SERVER, 'scripts')].flatMap(collectTests)
        .map(path => posix(relative(SERVER, path))).sort();
      suite(stage, 'server-all-discovered-tests', files);
    } else if (stage === 'client') npm(stage, 'client-full-suite', join(REPO, 'client'), 'test:unit');
    else for (const script of prefixScripts) npm(stage, `runtime-${script.replaceAll(':', '-')}`, REPO, script);
  }
  return commands;
}

function countsFrom(log) {
  const text = log.replace(/\x1b\[[0-9;]*m/g, '');
  const counts = {};
  for (const name of ['tests', 'suites', 'pass', 'fail', 'cancelled', 'skipped', 'todo']) {
    const values = [...text.matchAll(new RegExp(`^# ${name} (\\d+)\\s*$`, 'gm'))];
    if (values.length) counts[name] = Number(values.at(-1)[1]);
  }
  for (const [label, prefix] of [['Test Files', 'files'], ['Tests', 'tests']]) {
    const result = new RegExp(`^\\s*${label}\\s+(.+)$`, 'm').exec(text);
    if (!result) continue;
    for (const status of ['passed', 'failed', 'skipped']) {
      const value = new RegExp(`(\\d+) ${status}`).exec(result[1]);
      if (value) counts[`${prefix}_${status}`] = Number(value[1]);
    }
    const total = /\((\d+)\)/.exec(result[1]);
    if (total) counts[`${prefix}_total`] = Number(total[1]);
  }
  return counts;
}

async function runCommand(command, env, runRoot, index) {
  const logPath = join(runRoot, `${String(index + 1).padStart(2, '0')}-${command.id}.log`);
  const startedAt = new Date().toISOString();
  const started = Date.now();
  writeFileSync(logPath, `${JSON.stringify({ ...command, startedAt })}\n\n`, 'utf8');
  console.log(`[start] ${command.id} -> ${repoRelative(logPath)}`);
  const result = await new Promise(resolveResult => {
    const child = spawn(command.executable, command.args, {
      cwd: resolve(REPO, command.cwd), env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
    });
    for (const stream of [child.stdout, child.stderr]) stream.on('data', data => appendFileSync(logPath, data));
    child.once('error', error => appendFileSync(logPath, `\n[spawn error] ${error.message}\n`));
    child.once('close', (exitCode, signal) => resolveResult({ exitCode, signal }));
  });
  const counts = countsFrom(readFileSync(logPath, 'utf8'));
  const record = {
    ...command, ...result, startedAt, durationMs: Date.now() - started,
    status: result.exitCode === 0 ? 'passed' : 'failed', counts, log: repoRelative(logPath),
  };
  console.log(`[${record.status}] ${command.id}: exit=${result.exitCode} ${JSON.stringify(counts)}`);
  return record;
}

const options = parseOptions();
const cli = npmCli();
const commands = makeCommands(options, cli);
const boundary = {
  originalRuntimeGateExecuted: false,
  originalRuntimeGate: GATE,
  originalRuntimeGateSha256: sha256(GATE),
  runtimePrefixIncluded: options.stages.includes('runtime'),
  notRunByUserInstruction: ['git diff --check', 'npm run check:changed-file-secrets'],
  clientSuiteIncludedIn: options.stages.includes('runtime') ? 'runtime-test-unit' : options.stages.includes('client') ? 'client-full-suite' : null,
};
if (options.list) {
  console.log(JSON.stringify({ stages: options.stages, boundary, commands }, null, 2));
} else {
  mkdirSync(RAW_ROOT, { recursive: true });
  const runId = options.runId || `${new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')}-${options.stages.join('-')}`;
  const runRoot = join(RAW_ROOT, runId);
  mkdirSync(runRoot); // Fail if reused, preserving all earlier raw receipts.
  const envRoot = mkdtempSync(join(tmpdir(), 'memory-quickwins-validation-'));
  const emptyDotenv = join(envRoot, 'empty.env');
  writeFileSync(emptyDotenv, '', 'utf8');
  const env = {
    ...process.env, NODE_ENV: 'test', NO_COLOR: '1', FORCE_COLOR: '0',
    NODE_OPTIONS: '', npm_execpath: cli,
    COINCIDES_APP_DATA_DIR: envRoot, COINCIDES_VALIDATION_ENV_DIR: envRoot,
    DOTENV_CONFIG_PATH: emptyDotenv, DOTENV_CONFIG_QUIET: 'true',
    ...Object.fromEntries(CLEARED_PROVIDER_VARIABLES.map(name => [name, ''])),
  };
  const summary = {
    schema: 'memory-quickwins-rerun.v1', startedAt: new Date().toISOString(),
    stages: options.stages, boundary,
    isolation: { providerVariablesCleared: CLEARED_PROVIDER_VARIABLES, appData: envRoot, dotenv: 'new empty fixture', viteEnv: 'new empty directory', credentialsCreatedByRunner: 0 },
    plannedCommands: commands, results: [],
  };
  const summaryPath = join(runRoot, 'summary.json');
  const save = () => writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  save();
  try {
    for (const [index, command] of commands.entries()) {
      const result = await runCommand(command, env, runRoot, index);
      summary.results.push(result);
      save();
      if (result.status === 'failed' && !options.keepGoing) break;
    }
  } finally {
    // Delete only this runner's known empty fixture; do not recursively delete
    // unknown files a failed child might leave. No environment values are logged.
    unlinkSync(emptyDotenv);
    try { rmdirSync(envRoot); summary.isolation.temporaryDirectoryRemoved = true; }
    catch { summary.isolation.temporaryDirectoryRemoved = false; }
    summary.completedAt = new Date().toISOString();
    summary.commandsPassed = summary.results.filter(result => result.status === 'passed').length;
    summary.commandsFailed = summary.results.filter(result => result.status === 'failed').length;
    summary.commandsNotRun = commands.length - summary.results.length;
    save();
  }
  console.log(`[summary] ${repoRelative(summaryPath)}`);
  process.exitCode = summary.commandsFailed || summary.commandsNotRun ? 1 : 0;
}
