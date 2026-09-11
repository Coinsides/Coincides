// Replays D1 builder gates only. The aggregate runtime gate belongs to HQ.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const audit = dirname(fileURLToPath(import.meta.url));
const root = resolve(audit, '../../..');
const output = resolve(audit, 'result-3-validation');
mkdirSync(output, { recursive: true });
const mode = process.argv[2] || 'all';
const targeted = JSON.parse(readFileSync(resolve(audit, 'result-2-validation/targeted-files.json'), 'utf8'));
const existing = Array.isArray(targeted) ? targeted : targeted.files;
const wallFiles = [
  'src/pages/Notes/canvasEngine/pageFrameWallService.test.ts',
  'src/pages/Notes/canvasEngine/hooks/usePageFrameWalls.test.tsx',
  'src/pages/Notes/canvasEngine/hooks/pageFrameWallsPersistence.test.tsx',
  'src/pages/Notes/canvasEngine/pageFramePrintScaleService.test.ts',
  'src/pages/Notes/canvasEngine/layers/PageFrameWallLayer.test.tsx',
];
const checks = [
  ['client-targeted', 'client', process.execPath, ['node_modules/vitest/vitest.mjs', 'run', ...new Set([...existing, ...wallFiles]), '--reporter=json', `--outputFile=${resolve(output, 'targeted.json')}`]],
  ['client-typecheck', 'client', process.execPath, ['node_modules/typescript/bin/tsc', '-b', '--pretty', 'false']],
  ['server-typecheck', 'server', process.execPath, ['node_modules/typescript/bin/tsc', '--noEmit', '--pretty', 'false']],
  ['client-build', 'client', 'npm', ['run', 'build']],
  ['server-build', 'server', 'npm', ['run', 'build']],
  ['contractCheck', 'client', 'npm', ['run', 'smoke:canvas-engine-model-contract']],
  ['client-full', 'client', process.execPath, ['node_modules/vitest/vitest.mjs', 'run', '--reporter=json', `--outputFile=${resolve(output, 'client-full-results.json')}`]],
];
const selected = checks.filter(([name]) => mode === 'all' || name === mode || (mode === 'builds' && ['server-typecheck', 'client-build', 'server-build', 'contractCheck'].includes(name)));
for (const [name, directory, command, args] of selected) {
  for (const suffix of ['log', 'json']) {
    const current = resolve(output, `${name}.${suffix}`);
    if (existsSync(current)) {
      let attempt = 1;
      while (existsSync(resolve(output, `${name}-attempt-${attempt}.${suffix}`))) attempt++;
      copyFileSync(current, resolve(output, `${name}-attempt-${attempt}.${suffix}`));
    }
  }
  const started = Date.now();
  const result = spawnSync(command, args, { cwd: resolve(root, directory), encoding: 'utf8', shell: command === 'npm', maxBuffer: 20 * 1024 * 1024 });
  writeFileSync(resolve(output, `${name}.log`), (result.stdout || '') + (result.stderr || ''));
  const receipt = { name, command: [command, ...args], cwd: directory, exitCode: result.status, durationMs: Date.now() - started, error: result.error?.message };
  writeFileSync(resolve(output, `${name}.json`), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify(receipt));
  if (result.status !== 0) process.exitCode = 1;
}
