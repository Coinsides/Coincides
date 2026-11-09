// Scratch-only A-20 server: the 04f6f822 copy's server, a fresh database under Temp/a20d, no model keys, loopback only.
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const data = '<tmp>/a20d/data';
rmSync(data, { recursive: true, force: true });
for (const dir of ['uploads', 'source-blobs', 'canvas-assets', 'app-data']) mkdirSync(join(data, dir), { recursive: true });
const env = { ...process.env, DB_PATH: join(data, 'scratch.db'), UPLOAD_DIR: join(data, 'uploads'), SOURCE_BLOB_DIR: join(data, 'source-blobs'),
  CANVAS_ASSET_DIR: join(data, 'canvas-assets'), COINCIDES_APP_DATA_DIR: join(data, 'app-data'), PORT: '3001', NODE_TEST_CONTEXT: 'walkthrough',
  ANTHROPIC_API_KEY: '', OPENAI_API_KEY: '', DEEPSEEK_API_KEY: '', DASHSCOPE_API_KEY: '', VOYAGE_API_KEY: '' };
const child = spawn(process.execPath, ['--import', pathToFileURL(join(here, '..', 'a18', 'loopback.mjs')).href, '--import', 'tsx', 'src/index.ts'],
  { cwd: '<tmp>/a20/base/server', env, stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 1));
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => child.kill(s));
