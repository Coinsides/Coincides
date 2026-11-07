// Scratch-only server for the patch walkthrough: a brand-new database and storage under the
// scratchpad, no model access, and a stand-in converter. Nothing reads the dev database or .env keys.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const data = '<tmp>/a18d/data';
for (const dir of ['uploads', 'source-blobs', 'canvas-assets', 'app-data']) mkdirSync(join(data, dir), { recursive: true });
const env = {
  ...process.env,
  DB_PATH: join(data, 'scratch.db'),
  UPLOAD_DIR: join(data, 'uploads'),
  SOURCE_BLOB_DIR: join(data, 'source-blobs'),
  CANVAS_ASSET_DIR: join(data, 'canvas-assets'),
  COINCIDES_APP_DATA_DIR: join(data, 'app-data'),
  PORT: '3001',
  NODE_TEST_CONTEXT: 'walkthrough',
  ANTHROPIC_API_KEY: '', OPENAI_API_KEY: '', DEEPSEEK_API_KEY: '', DASHSCOPE_API_KEY: '', VOYAGE_API_KEY: '',
};
const child = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], {
  cwd: 'D:/Coinsides/v2.x/Coincides/server',
  env,
  stdio: 'inherit',
});
child.on('exit', (code) => process.exit(code ?? 1));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
