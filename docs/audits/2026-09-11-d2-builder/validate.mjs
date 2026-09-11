import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const audit = dirname(fileURLToPath(import.meta.url));
const root = resolve(audit, '../../..');
const output = resolve(audit, 'validation');
mkdirSync(output, { recursive: true });
const base = 'src/pages/Notes/canvasEngine/';
const targeted = [
  ...['NoteChromeLayer', 'NotePaperHeader', 'NoteRuntimeDocumentLayer', 'NotePrintLayer', 'BlockEditorLayer',
    'DraftBlockEditorLayer', 'pageFrameAlignment', 'PageFrameWallLayer', 'PaperInkProjection', 'textFlowNavigation.surface']
    .map(name => `${base}layers/${name}.test.tsx`),
  ...['useNoteCanvasDataAdapter', 'useNoteCanvasRuntimeController', 'useNoteRouteSaveBoundary',
    'usePageReadingPresentation', 'usePageFrameWalls', 'pageFrameWallsPersistence']
    .map(name => `${base}hooks/${name}.test.tsx`),
  'src/pages/Boards/BoardNoteModal.test.tsx', 'src/pages/Boards/BoardNoteModal.rangeSession.test.tsx',
  'src/pages/Boards/BoardPage.modal.test.tsx', 'src/components/Layout/AppLayout.test.tsx',
];
const npmCli = resolve(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
const checks = [
  ['targeted', 'client', ['node_modules/vitest/vitest.mjs', 'run', ...targeted, '--reporter=json', `--outputFile=${resolve(output, 'targeted-results.json')}`]],
  ['client-typecheck', 'client', ['node_modules/typescript/bin/tsc', '-b', '--pretty', 'false']],
  ['server-typecheck', 'server', ['node_modules/typescript/bin/tsc', '--noEmit', '--pretty', 'false']],
  ['client-build', 'client', [npmCli, 'run', 'build']],
  ['server-build', 'server', [npmCli, 'run', 'build']],
  ['runtime-boundary', 'client', ['scripts/canvasRuntimeBoundaryCheck.mjs']],
  ['model-contract', 'client', [npmCli, 'run', 'smoke:canvas-engine-model-contract']],
];
const mode = process.argv[2] || 'all';
for (const [name, dir, args] of checks.filter(([name]) => mode === 'all' || mode === name)) {
  const stamp = Date.now();
  for (const suffix of ['log', 'json']) {
    const old = resolve(output, `${name}.${suffix}`);
    if (existsSync(old)) copyFileSync(old, resolve(output, `${name}-attempt-${stamp}.${suffix}`));
  }
  const result = spawnSync(process.execPath, args, { cwd: resolve(root, dir), encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  writeFileSync(resolve(output, `${name}.log`), (result.stdout || '') + (result.stderr || ''));
  const receipt = { name, command: ['node', ...args], cwd: dir, exitCode: result.status, elapsedMs: Date.now() - stamp };
  if (name === 'targeted' && existsSync(resolve(output, 'targeted-results.json'))) {
    const report = JSON.parse(readFileSync(resolve(output, 'targeted-results.json'), 'utf8'));
    Object.assign(receipt, { files: report.testResults.length, passed: report.numPassedTests, failed: report.numFailedTests, pending: report.numPendingTests });
  }
  writeFileSync(resolve(output, `${name}.json`), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify(receipt));
  if (result.status !== 0) process.exitCode = 1;
}
