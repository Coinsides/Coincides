#!/usr/bin/env node
// This order-specific runner preserves the runtime gate's order and result.
// The prohibited credential scan is reported as SKIP, never as PASS.
// Usage: node scripts/run-text-range-validation.mjs [--typecheck | --client-tests [filters...] | --server-boards]
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const client = join(root, 'client');
const server = join(root, 'server');
const self = fileURLToPath(import.meta.url);
const args = process.argv.slice(2);
const forbiddenTestNames = /\b(?:security|credentials?|authentication|authorization|SSRF|XSS|cross[- ]user)\b/i;

if (args[0] === '--worker') {
  process.chdir(client);
  if (args[1] === 'client-tests') {
    const { startVitest } = await import('../client/node_modules/vitest/dist/node.js');
    const context = await startVitest('test', args.slice(2), {
      root: client,
      config: join(client, 'vitest.config.ts'),
      run: true,
      watch: false,
      maxWorkers: 2,
      testNamePattern: new RegExp(`^(?!.*${forbiddenTestNames.source})`, 'i'),
    }, { envFile: false });
    try {
      const cases = [];
      const visit = (task, parents = []) => {
        const names = [...parents, task.name];
        if (task.type === 'test') cases.push({ task, name: names.join(' ') });
        for (const child of task.tasks || []) visit(child, names);
      };
      for (const file of context?.state.getFiles() || []) visit(file);
      const executed = cases.filter(({ task }) => ['pass', 'fail'].includes(task.result?.state)).length;
      const excluded = cases.filter(({ name }) => forbiddenTestNames.test(name)).length;
      console.log(`[text-range-validation] collected=${cases.length}; executed=${executed}; safety-title-excluded=${excluded}`);
      if (!cases.length || !executed) throw new Error('Validation requires collected and executed test cases.');
      if (!context || context.state.getCountOfFailedTests() > 0
        || context.state.getUnhandledErrors().length > 0) process.exitCode = 1;
    } finally {
      await context?.close();
    }
  } else if (args[1] === 'client-build') {
    const { build } = await import('../client/node_modules/vite/dist/node/index.js');
    await build({ root: client, configFile: join(client, 'vite.config.ts'), envFile: false });
  } else throw new Error('Unknown validation worker.');
} else {
  // Only OS/tool-location variables enter child processes. Provider credentials,
  // NODE_OPTIONS and VITE_* values are not inherited or written into a bundle.
  const childEnv = {};
  for (const name of ['PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP',
    'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'ComSpec', 'COMSPEC', 'PATHEXT', 'NUMBER_OF_PROCESSORS']) {
    if (process.env[name] !== undefined) childEnv[name] = process.env[name];
  }
  childEnv.DB_PATH = ':memory:';
  childEnv.CANVAS_ASSET_DIR = join(root, '.codex-tmp', 'text-range-validation', 'canvas-assets');
  childEnv.SOURCE_BLOB_DIR = join(root, '.codex-tmp', 'text-range-validation', 'source-blobs');
  childEnv.CI = '1';
  const npmCli = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
  if (!existsSync(npmCli)) throw new Error('Expected locally installed npm CLI beside node.');
  childEnv.npm_execpath = npmCli;

  async function execute(label, executable, commandArgs, cwd = root) {
    console.log(`[text-range-validation] START ${label}`);
    const code = await new Promise((done, reject) => {
      const child = spawn(executable, commandArgs, {
        cwd, env: childEnv, stdio: ['ignore', 'inherit', 'inherit'], windowsHide: true,
      });
      child.once('error', reject);
      child.once('close', (status) => done(status ?? 1));
    });
    console.log(`[text-range-validation] ${code === 0 ? 'PASS' : 'FAIL'} ${label} (${code})`);
    if (code !== 0) throw new Error(`${label} failed with exit ${code}`);
  }
  const node = (label, commandArgs, cwd) => execute(label, process.execPath, commandArgs, cwd);
  const npm = (name) => node(name, [npmCli, 'run', name]);
  const clientTsc = join(client, 'node_modules/typescript/bin/tsc');
  const serverTsc = join(server, 'node_modules/typescript/bin/tsc');
  const buildSharedTypes = () => node('shared type declarations (dependency prerequisite)',
    [serverTsc, '-b', join(root, 'shared/tsconfig.json')]);

  if (args[0] === '--typecheck') {
    await node('client typecheck', [clientTsc, '-b', '--noEmit'], client);
    await buildSharedTypes();
    await node('server typecheck', [serverTsc, '--noEmit'], server);
  } else if (args[0] === '--client-tests') {
    console.log('[text-range-validation] Safety-class test titles excluded; no .env loading.');
    await node('client tests', [self, '--worker', 'client-tests', ...args.slice(1)]);
  } else if (args[0] === '--server-boards') {
    // Reviewed functional suites use synthetic :memory: SQLite and post-auth
    // route fixtures. No application bootstrap or authentication test is run.
    await node('server board functional regression', ['--import', 'tsx', '--test',
      'src/__tests__/v13BoardSchema.test.ts', 'src/__tests__/v13BoardServices.test.ts',
      'src/__tests__/v13BoardRoutes.test.ts', 'src/__tests__/v13BoardWave1.test.ts',
      'src/__tests__/v13BoardTrayRelocation.test.ts', 'src/__tests__/v13ItemFloor.test.ts',
      'src/__tests__/v13BoardTextRanges.test.ts',
    ], server);
  } else if (args.length === 0) {
    const commands = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
      .scripts['verify:v2-bn8-runtime'].split(' && ');
    const audited = [
      'test:unit', 'test:tool-face-registry', 'test:tool-face-manifest', 'check:tool-face-manifest',
      'test:tool-face-parity', 'check:tool-face-parity', 'check:server-shared-runtime-import',
      'check:canvas-runtime-boundary', 'check:group-gallery-shell', 'check:groups-rail-shell',
      'check:single-editor-shell', 'check:source-experience', 'check:v2-bn11-legacy-shutdown',
      'check:v2-bn11-relation-freshness', 'smoke:canvas-engine-model-contract', 'build:client',
      'build', 'smoke:canvas-engine-performance', 'docs:check', 'git diff --check',
      'check:changed-file-secrets',
    ];
    const names = commands.map((command) => command.replace(/^npm run /, ''));
    if (JSON.stringify(names) !== JSON.stringify(audited)) {
      throw new Error('Runtime gate changed; review its commands before extending this order-specific runner.');
    }
    console.log('[text-range-validation] Safety-class test titles excluded; Vite/Vitest envFile:false.');
    await buildSharedTypes();
    for (const name of names) {
      if (name === 'check:changed-file-secrets') {
        console.log('[text-range-validation] SKIP check:changed-file-secrets: prohibited by this order; HQ pending.');
      } else if (name === 'test:unit') {
        await node(name, [self, '--worker', 'client-tests']);
      } else if (name === 'build:client') {
        await node('client build typecheck', [clientTsc, '-b'], client);
        await node(name, [self, '--worker', 'client-build']);
      } else if (name === 'git diff --check') {
        await execute(name, 'git', ['diff', '--check']);
      } else await npm(name);
    }
    console.log('[text-range-validation] Allowed stages complete; original full gate remains pending HQ scan.');
  } else throw new Error('Use --typecheck, --client-tests [filters...], --server-boards, or no arguments.');
}
