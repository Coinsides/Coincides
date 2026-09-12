import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const audit = dirname(fileURLToPath(import.meta.url));
const root = resolve(audit, '../../..');
const [name, cwd, executable, ...args] = process.argv.slice(2);
if (!name || !cwd || !executable) throw new Error('name cwd executable args required');
mkdirSync(audit, { recursive: true });
const start = Date.now();
const child = spawn(executable === 'node' ? process.execPath : executable, args, {
  cwd: resolve(root, cwd), windowsHide: true, env: { ...process.env, VITEST_MAX_THREADS: '4', VITEST_MIN_THREADS: '1', VITEST_MAX_FORKS: '4', VITEST_MIN_FORKS: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
child.stdout.on('data', (value) => { output += value; process.stdout.write(value); });
child.stderr.on('data', (value) => { output += value; process.stderr.write(value); });
child.on('close', (code) => {
  writeFileSync(resolve(audit, name + '.log'), output, 'utf8');
  writeFileSync(resolve(audit, name + '.json'), JSON.stringify({ command: [executable, ...args], cwd, started: new Date(start).toISOString(), durationMs: Date.now() - start, exitCode: code }, null, 2));
  process.exitCode = code ?? 1;
});
