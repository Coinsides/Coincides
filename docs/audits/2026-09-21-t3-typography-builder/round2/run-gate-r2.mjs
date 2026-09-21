import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, openSync, closeSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
const root = process.cwd();
const out = resolve(root, '.codex-tmp/t3-typo/round2', process.argv[2] || 'gate-final');
const npm = join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
const env = { ...process.env, DB_PATH: ':memory:', COINCIDES_APP_DATA_DIR: mkdtempSync(join(tmpdir(), 'coincides-t3-gate-')), COINCIDES_VALIDATION_ENV_DIR: join(out, 'empty-env') };
mkdirSync(out, { recursive: true });
mkdirSync(join(out, 'empty-env'), { recursive: true });
const all = JSON.parse(readFileSync('package.json', 'utf8')).scripts['verify:v2-bn8-runtime'].split(' && ');
const commands = all.filter(cmd => cmd !== 'git diff --check' && cmd !== 'npm run check:changed-file-secrets');
if (commands.length !== 25 || all.length !== 27) throw new Error('Gate inventory drift');
const results = [];
for (const command of commands) {
  const name = command.slice('npm run '.length);
  const fd = openSync(join(out, `gate-${name.replaceAll(':', '-')}.log`), 'w');
  const started = Date.now();
  const result = spawnSync(process.execPath, [npm, 'run', name], { cwd: root, env, stdio: ['ignore', fd, fd], windowsHide: true });
  closeSync(fd);
  results.push({ command, exitCode: result.status, signal: result.signal, error: result.error?.message, durationMs: Date.now() - started });
  writeFileSync(join(out, 'gate-results.json'), JSON.stringify({ scope: 'non-git/secrets 25 components', reservedForHQ: all.filter(cmd => !commands.includes(cmd)), results }, null, 2));
  console.log(`${command}: exit=${result.status} durationMs=${Date.now() - started}`);
}
process.exitCode = results.every(r => r.exitCode === 0) ? 0 : 1;
