import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const output = dirname(fileURLToPath(import.meta.url));
const root = resolve(output, '../../..');
const source = resolve(root, 'client/src/pages/Notes/canvasEngine/pageFrameSlotService.ts');
const before = readFileSync(source);
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const marker = 'export function resolvePageFrameHeaderReservation(input: CreateBindingPageFrameSlotsInput): number {';
const original = before.toString('utf8');
if (original.split(marker).length !== 2) throw new Error('Expected exactly one reservation entry point');
const emptyEnv = resolve(root, '.codex-tmp/page-repairs-empty-env');
mkdirSync(emptyEnv, { recursive: true });
const run = (name) => {
  const result = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run',
    'src/pages/Notes/canvasEngine/pageHeaderReservation.test.ts',
    'src/pages/Notes/canvasEngine/layers/pageFrameAlignment.test.tsx',
    '-t', 'page header reservation|page repairs:'], {
    cwd: resolve(root, 'client'), encoding: 'utf8', windowsHide: true,
    env: { ...process.env, COINCIDES_VALIDATION_ENV_DIR: emptyEnv },
  });
  writeFileSync(resolve(output, `${name}.log`), (result.stdout || '') + (result.stderr || ''));
  if (result.error) throw result.error;
  return result.status;
};
let red;
try {
  // Deliberately remove the production reservation, not the assertion.
  writeFileSync(source, original.replace(marker, `${marker}\n  return 0; // temporary positive control`));
  red = run('header-positive-red');
} finally {
  writeFileSync(source, before);
}
if (hash(readFileSync(source)) !== hash(before)) throw new Error('Source restoration failed');
const green = run('header-positive-restored');
const result = { mutation: 'Return zero from the production header-reservation function',
  redExitCode: red, restoredExitCode: green, sha256Before: hash(before), sha256Restored: hash(readFileSync(source)) };
writeFileSync(resolve(output, 'header-positive-control.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
if (red !== 1 || green !== 0) process.exitCode = 1;
