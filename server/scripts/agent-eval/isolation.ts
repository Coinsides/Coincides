import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import type { Mode } from './types.js';

/** Allowlist inherited OS necessities; never inherit a provider key or dotenv loader. */
export function cleanEnvironment(source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const allowed = new Set(['path', 'systemroot', 'windir', 'comspec', 'pathext', 'temp', 'tmp',
    'localappdata', 'appdata', 'userprofile', 'home', 'lang', 'lc_all', 'tz']);
  return Object.fromEntries(Object.entries(source).filter(([key]) => allowed.has(key.toLowerCase())));
}

export function createIsolation(mode: Mode, source = process.env) {
  const directory = mkdtempSync(join(tmpdir(), 'coincides-agent-eval-'));
  const parent = realpathSync(tmpdir());
  const actual = realpathSync(directory);
  const inside = relative(parent, actual);
  if (!inside || isAbsolute(inside) || inside === '..' || inside.startsWith(`..${sep}`)) {
    throw new Error('Eval temporary directory escaped its parent');
  }
  const dotenv = join(directory, 'empty.env');
  writeFileSync(dotenv, '');
  const env: NodeJS.ProcessEnv = {
    ...cleanEnvironment(source), NODE_ENV: 'test', DB_PATH: ':memory:', PORT: '0',
    DOTENV_CONFIG_PATH: dotenv, OPENAI_API_KEY: mode === 'scripted' ? 'syn-eval' : '',
    ANTHROPIC_API_KEY: '', ANTHROPIC_AUTH_TOKEN: '', VOYAGE_API_KEY: '',
    GENERIC_API_KEY: '', DEEPSEEK_API_KEY: '', DASHSCOPE_API_KEY: '',
  };
  // Live uses the existing machine store only. No user database/settings are read.
  if (mode === 'scripted') env.COINCIDES_APP_DATA_DIR = join(directory, 'credentials');
  else if (source.COINCIDES_APP_DATA_DIR) env.COINCIDES_APP_DATA_DIR = source.COINCIDES_APP_DATA_DIR;
  for (const key of ['CANVAS_ASSET_DIR', 'SOURCE_BLOB_DIR', 'UPLOAD_DIR', 'DOCUMENT_UPLOAD_DIR']) {
    env[key] = join(directory, key.toLowerCase());
    mkdirSync(env[key]!, { recursive: true });
  }
  mkdirSync(join(directory, 'credentials'), { recursive: true });
  return { directory, env, cleanup() {
    // Validate the exact, originally allocated target again before recursive removal.
    if (resolve(directory) !== actual || realpathSync(directory) !== actual) {
      throw new Error('Eval cleanup target changed');
    }
    rmSync(actual, { recursive: true, force: true });
  } };
}
