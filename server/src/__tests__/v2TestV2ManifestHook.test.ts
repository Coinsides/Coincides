import assert from 'node:assert/strict';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const SERVER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const REPO_ROOT = resolve(SERVER_ROOT, '..');
const CANONICAL_MANIFEST_PATH = resolve(
  REPO_ROOT,
  'docs/generated/tool-face-manifest.json',
);

function spawnReceipt(result: SpawnSyncReturns<string>): string {
  return [
    `exit=${String(result.status)}`,
    result.stdout,
    result.stderr,
    result.error?.stack,
  ].filter(Boolean).join('\n');
}

test('T-1 manifest copy recreates a missing dist target byte-for-byte', () => {
  const npmExecPath = process.env.npm_execpath;
  assert.ok(npmExecPath, 'npm_execpath is required to exercise the npm lifecycle hook');

  const tempRoot = mkdtempSync(join(tmpdir(), 'coincides-test-v2-manifest-hook-'));
  const destination = join(tempRoot, 'dist', 'tool-face-manifest.json');
  try {
    assert.equal(existsSync(destination), false, 'isolated dist copy must start missing');
    const childEnv: NodeJS.ProcessEnv = {
      ...process.env,
      NODE_ENV: 'test',
      TOOL_FACE_COPY_TEST_DESTINATION: destination,
    };
    delete childEnv.TOOL_FACE_COPY_TEST_SOURCE;

    const result = spawnSync(
      process.execPath,
      [npmExecPath, 'run', 'copy:tool-face-manifest'],
      {
        cwd: SERVER_ROOT,
        encoding: 'utf8',
        env: childEnv,
        timeout: 60_000,
        windowsHide: true,
      },
    );

    assert.equal(result.error, undefined, spawnReceipt(result));
    assert.equal(result.signal, null, spawnReceipt(result));
    assert.equal(result.status, 0, spawnReceipt(result));
    assert.equal(existsSync(destination), true, spawnReceipt(result));
    assert.deepEqual(
      readFileSync(destination),
      readFileSync(CANONICAL_MANIFEST_PATH),
      'the copy command must reproduce the current canonical manifest bytes',
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('T-2 pretest:v2 keeps manifest freshness checking and copying wired', () => {
  const packageJson = JSON.parse(
    readFileSync(resolve(SERVER_ROOT, 'package.json'), 'utf8'),
  ) as { scripts?: Record<string, string> };
  const hook = packageJson.scripts?.['pretest:v2'] ?? '';

  assert.deepEqual(
    {
      check: hook.includes('check:tool-face-manifest'),
      copy: hook.includes('copy:tool-face-manifest'),
    },
    { check: true, copy: true },
    'pretest:v2 must retain both check:tool-face-manifest and copy:tool-face-manifest',
  );
});
