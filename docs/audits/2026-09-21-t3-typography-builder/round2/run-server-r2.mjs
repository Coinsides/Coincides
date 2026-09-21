import { readdirSync, mkdirSync, mkdtempSync, writeFileSync, openSync, closeSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const out = resolve(root, '.codex-tmp/t3-typo/round2', process.argv[2] || 'server-rerun');
mkdirSync(join(out, 'app-data'), { recursive: true });
mkdirSync(join(out, 'empty-env'), { recursive: true });
const server = join(root, 'server');
function files(dir) {
  return readdirSync(join(server, dir), { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? files(`${dir}/${entry.name}`)
      : entry.name.endsWith('.test.ts') ? [`${dir}/${entry.name}`] : []);
}
const tests = [...files('src'), ...files('scripts')].sort();
if (tests.length !== 111) throw new Error(`Server inventory drift: ${tests.length}`);
writeFileSync(join(out, 'server-inventory.json'), JSON.stringify({ count: tests.length, timeoutMs: 600000, excluded: [], tests }, null, 2));
const env = { ...process.env, DB_PATH: ':memory:', COINCIDES_APP_DATA_DIR: mkdtempSync(join(tmpdir(), 'coincides-t3-appdata-')), COINCIDES_VALIDATION_ENV_DIR: join(out, 'empty-env'), npm_execpath: join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js') };
for (const key of ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GENERIC_API_KEY', 'DEEPSEEK_API_KEY', 'DASHSCOPE_API_KEY', 'VOYAGE_API_KEY']) delete env[key];
const pathKey = Object.keys(env).find(key => key.toLowerCase() === 'path');
env[pathKey || 'PATH'] = `C:\\Users\\70208\\AppData\\Roaming\\uv\\python\\cpython-3.12.11-windows-x86_64-none;${env[pathKey] || ''}`;
const commands = [
  ['manifest-check', ['--import', 'tsx', '../scripts/generate-tool-face-manifest.ts', '--check']],
  ['manifest-copy', ['../scripts/copy-tool-face-manifest.mjs']],
  ['server-all', ['../scripts/run-server-test-suite.mjs', '--test-timeout=600000', '--test-concurrency=4', ...tests]],
];
const results = [];
for (const [name, args] of commands) {
  const fd = openSync(join(out, `${name}.log`), 'w');
  const started = Date.now();
  const result = spawnSync(process.execPath, args, { cwd: server, env, stdio: ['ignore', fd, fd], windowsHide: true });
  closeSync(fd);
  results.push({ name, command: [process.execPath, ...args], exitCode: result.status, signal: result.signal, error: result.error?.message, durationMs: Date.now() - started });
  writeFileSync(join(out, 'server-results.json'), JSON.stringify(results, null, 2));
  console.log(`${name}: exit=${result.status} durationMs=${Date.now() - started}`);
  if (result.status !== 0) { process.exitCode = 1; break; }
}
