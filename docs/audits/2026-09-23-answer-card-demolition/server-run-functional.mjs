import { spawnSync } from 'node:child_process';
import { closeSync, mkdirSync, mkdtempSync, openSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const evidenceDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryDirectory = resolve(evidenceDirectory, '../../..');
const isolationDirectory = mkdtempSync(join(tmpdir(), 'answer-demolition-'));
const testFiles = [
  'src/__tests__/v14NotePatch.test.ts',
  'src/__tests__/v14IntentRouter.test.ts',
  'src/__tests__/v14AttentionContext.test.ts',
  'src/__tests__/v14ContextHint.test.ts',
  'src/__tests__/v14LoopRobustness.test.ts',
  'src/__tests__/v14AgentRouteLifecycle.test.ts',
  'src/__tests__/v14ClaimReceipt.test.ts',
  'src/__tests__/v14TurnIdentity.test.ts',
  'src/__tests__/v14EpisodeStorage.test.ts',
];
// Carry only process-launch essentials. No provider credentials, dotenv preload,
// app data, DB paths, or Node preload options are inherited from this shell.
const env = {};
for (const name of ['Path', 'PATH', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'PATHEXT']) {
  if (process.env[name] !== undefined) env[name] = process.env[name];
}
Object.assign(env, {
  NODE_ENV: 'test',
  DB_PATH: ':memory:',
  COINCIDES_APP_DATA_DIR: join(isolationDirectory, 'credentials'),
  UPLOAD_DIR: join(isolationDirectory, 'uploads'),
  OPENAI_API_KEY: '', ANTHROPIC_API_KEY: '', ANTHROPIC_AUTH_TOKEN: '',
  GENERIC_API_KEY: '', DEEPSEEK_API_KEY: '', DASHSCOPE_API_KEY: '', VOYAGE_API_KEY: '',
});
mkdirSync(env.COINCIDES_APP_DATA_DIR);
mkdirSync(env.UPLOAD_DIR);
const log = openSync(join(evidenceDirectory, 'server-functional.log'), 'w');
try {
  const result = spawnSync(process.execPath, [
    '../scripts/run-server-test-suite.mjs', '--test-timeout=600000', ...testFiles,
  ], { cwd: join(repositoryDirectory, 'server'), env, stdio: ['ignore', log, log], windowsHide: true });
  const summary = { node: process.version, testFiles, exitCode: result.status,
    ...(result.error ? { error: result.error.message } : {}),
    isolation: 'in-memory SQLite; temporary credential/upload/asset directories; scripted providers; no dotenv or application bootstrap' };
  writeFileSync(join(evidenceDirectory, 'server-functional-run.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary));
  process.exitCode = result.status ?? 1;
} finally {
  closeSync(log);
  const relativePath = relative(resolve(tmpdir()), resolve(isolationDirectory));
  if (!relativePath || relativePath === '..' || relativePath.startsWith(`..${sep}`)) {
    throw new Error('Refusing cleanup outside the temporary test directory');
  }
  rmSync(isolationDirectory, { recursive: true, force: true });
}
