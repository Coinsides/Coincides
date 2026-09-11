import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const directory = path.dirname(fileURLToPath(import.meta.url));
const client = path.resolve(directory, '../../../client');
const targets = [
  'freehandService.test.tsx', 'layers/PaperInkLayer.test.tsx', 'layers/PaperInkProjection.test.tsx',
  'hooks/usePaperInkCommands.test.tsx', 'hooks/usePlacementHistory.test.tsx', 'layers/pageFrameAlignment.test.tsx',
  'layers/BlockEditorLayer.test.tsx', 'layers/DraftBlockEditorLayer.test.tsx', 'layers/PageFrameWallLayer.test.tsx',
  'layers/ViewOptionsMenu.test.tsx', 'layers/NoteChromeLayer.test.tsx',
].map(file => `src/pages/Notes/canvasEngine/${file}`);
const steps = {
  tests: [['node_modules/vitest/vitest.mjs', 'run', ...targets]],
  static: [['scripts/canvasRuntimeBoundaryCheck.mjs']],
  build: [['node_modules/typescript/bin/tsc', '-b'], ['node_modules/vite/bin/vite.js', 'build']],
};
const mode = process.argv[2];
if (!steps[mode]) throw new Error('Pass tests, static or build');
let log = ''; let failed = false;
for (const args of steps[mode]) {
  const start = Date.now();
  const result = spawnSync(process.execPath, args, { cwd: client, encoding: 'utf8' });
  const header = `node ${args.join(' ')}\nexit=${result.status}; elapsedMs=${Date.now() - start}\n`;
  log += header + (result.stdout || '') + (result.stderr || '') + '\n';
  console.log(header + (result.stdout || '') + (result.stderr || ''));
  if (result.status !== 0) { failed = true; break; }
}
fs.writeFileSync(path.join(directory, `${mode}.log`), log, 'utf8');
process.exitCode = failed ? 1 : 0;
