import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const audit = 'docs/audits/2026-09-11-b1a-builder';
const checks = [
  ['canvas-runtime-boundary', 'client', ['scripts/canvasRuntimeBoundaryCheck.mjs']],
  ['group-gallery-shell', 'client', ['scripts/groupGalleryShellContractCheck.mjs']],
  ['groups-rail-shell', 'client', ['scripts/groupsRailShellContractCheck.mjs']],
  ['single-editor-shell', 'client', ['scripts/singleEditorShellContractCheck.mjs']],
  ['source-experience-static', 'client', ['scripts/sourceExperienceContractCheck.mjs']],
  ['server-shared-runtime-import', '.', ['scripts/check-server-shared-runtime-import.mjs']],
  ['docs-index', '.', ['scripts/docs-index.mjs', '--check']],
  ['docs-inventory', '.', ['scripts/docs-inventory.mjs', '--check']],
  ['glossary-shape-vs-capability', '.', ['docs/agent-ops/current-state/glossary-shape-vs-capability.test.mjs']],
];
const results = checks.map(([name, cwd, args]) => {
  const child = spawnSync(process.execPath, args, { cwd, encoding: 'utf8', windowsHide: true });
  fs.writeFileSync(`${audit}/static-${name}.log`, `${child.stdout ?? ''}${child.stderr ?? ''}`);
  return { name, command: `node ${args.join(' ')}`, cwd, exitCode: child.status, error: child.error?.message };
});
fs.writeFileSync(`${audit}/static-checks.json`, JSON.stringify(results, null, 2) + '\n');
process.stdout.write(JSON.stringify(results, null, 2) + '\n');
process.exitCode = results.some((r) => r.exitCode !== 0) ? 1 : 0;
