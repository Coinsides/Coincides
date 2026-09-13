import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';

const SERVER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FIXTURE_USER_ID = '11111111-1111-4111-8111-111111111111';
const FIXTURE_EMAIL = 'dev-quick-login@example.com';
const FIXTURE_PASSWORD = 'fixture-password';

interface RunningServer {
  baseUrl: string;
  child: ChildProcess;
  dbPath: string;
  output: () => string;
  tempRoot: string;
}

interface StartServerOptions {
  nodeEnv: string;
  quickLoginEnabled: boolean;
}

interface AuthBody {
  token: unknown;
  user: Record<string, unknown>;
}

function reservePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      if (!address || typeof address === 'string') {
        probe.close();
        reject(new Error('Port probe did not bind a TCP port'));
        return;
      }
      probe.close((error) => {
        if (error) reject(error);
        else resolvePort(address.port);
      });
    });
  });
}

async function waitForHealth(server: RunningServer): Promise<void> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (server.child.exitCode !== null) {
      throw new Error(`Server exited before becoming ready (${server.child.exitCode})\n${server.output()}`);
    }
    try {
      const response = await fetch(`${server.baseUrl}/api/health`);
      if (response.status === 200) return;
    } catch {
      // The child has not bound the port yet.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 50));
  }
  throw new Error(`Server did not become ready within 60s\n${server.output()}`);
}

async function startServer(options: StartServerOptions): Promise<RunningServer> {
  const tempRoot = mkdtempSync(join(tmpdir(), 'coincides-dev-quick-login-'));
  const port = await reservePort();
  const dbPath = join(tempRoot, 'test.db');
  const sourceRoot = join(tempRoot, 'source-blobs');
  const canvasRoot = join(tempRoot, 'canvas-assets');
  const uploadRoot = join(tempRoot, 'uploads');
  const dotenvPath = join(tempRoot, '.env');
  for (const path of [sourceRoot, canvasRoot, uploadRoot]) {
    mkdirSync(path, { recursive: true });
  }
  writeFileSync(dotenvPath, '', 'utf8');

  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    PORT: String(port),
    DB_PATH: dbPath,
    SOURCE_BLOB_DIR: sourceRoot,
    CANVAS_ASSET_DIR: canvasRoot,
    UPLOAD_DIR: uploadRoot,
    DOTENV_CONFIG_PATH: dotenvPath,
    DOTENV_CONFIG_QUIET: 'true',
    JWT_SECRET: 'dev-quick-login-test-secret',
    NODE_ENV: options.nodeEnv,
  };
  if (options.quickLoginEnabled) {
    childEnv.COINCIDES_DEV_QUICK_LOGIN = 'enabled';
  } else {
    delete childEnv.COINCIDES_DEV_QUICK_LOGIN;
  }

  const child = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], {
    cwd: SERVER_ROOT,
    env: childEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let combinedOutput = '';
  child.stdout?.on('data', (chunk) => { combinedOutput += chunk.toString(); });
  child.stderr?.on('data', (chunk) => { combinedOutput += chunk.toString(); });
  const runningServer: RunningServer = {
    baseUrl: `http://127.0.0.1:${port}`,
    child,
    dbPath,
    output: () => combinedOutput,
    tempRoot,
  };

  try {
    await waitForHealth(runningServer);
    return runningServer;
  } catch (error) {
    await stopServer(runningServer);
    throw error;
  }
}

async function waitForExit(child: ChildProcess, timeoutMs: number): Promise<void> {
  if (child.exitCode !== null) return;
  await Promise.race([
    once(child, 'exit').then(() => undefined),
    new Promise<void>((resolveWait) => setTimeout(resolveWait, timeoutMs)),
  ]);
}

async function stopServer(server: RunningServer): Promise<void> {
  if (server.child.exitCode === null) {
    server.child.kill('SIGTERM');
    await waitForExit(server.child, 5_000);
  }
  if (server.child.exitCode === null) {
    server.child.kill('SIGKILL');
    await waitForExit(server.child, 5_000);
  }
  rmSync(server.tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
}

function seedFixtureUser(dbPath: string): void {
  const db = new Database(dbPath);
  try {
    db.prepare(`
      INSERT INTO users (
        id, email, password_hash, name, settings, onboarding_completed, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      FIXTURE_USER_ID,
      FIXTURE_EMAIL,
      bcrypt.hashSync(FIXTURE_PASSWORD, 4),
      'Dev Quick Login User',
      JSON.stringify({ theme: 'dark' }),
      0,
      '2026-08-26T12:00:00.000Z',
      '2026-08-26T12:00:00.000Z',
    );
  } finally {
    db.close();
  }
}

async function postJson(baseUrl: string, path: string, body: Record<string, unknown>): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('T-1 both dev gates enabled returns a normal-login-shaped JWT response', async () => {
  const server = await startServer({ nodeEnv: 'development', quickLoginEnabled: true });
  try {
    seedFixtureUser(server.dbPath);
    const quickResponse = await postJson(server.baseUrl, '/api/dev/quick-login', {
      email: FIXTURE_EMAIL,
    });
    assert.equal(quickResponse.status, 200);
    const quickBody = await quickResponse.json() as AuthBody;

    const normalResponse = await postJson(server.baseUrl, '/api/auth/login', {
      email: FIXTURE_EMAIL,
      password: FIXTURE_PASSWORD,
    });
    assert.equal(normalResponse.status, 200);
    const normalBody = await normalResponse.json() as AuthBody;

    assert.equal(typeof quickBody.token, 'string');
    if (typeof quickBody.token !== 'string') {
      assert.fail('quick-login token must be a string');
    }
    assert.ok(quickBody.token.length > 0);
    assert.equal(quickBody.user.id, FIXTURE_USER_ID);
    assert.deepEqual(Object.keys(quickBody).sort(), Object.keys(normalBody).sort());
    assert.deepEqual(Object.keys(quickBody.user).sort(), Object.keys(normalBody.user).sort());
    assert.deepEqual(quickBody.user, normalBody.user);

    const meResponse = await fetch(`${server.baseUrl}/api/auth/me`, {
      headers: { authorization: `Bearer ${quickBody.token}` },
    });
    assert.equal(meResponse.status, 200);
    assert.equal((await meResponse.json() as { id?: unknown }).id, FIXTURE_USER_ID);

    const passwordFieldResponse = await postJson(server.baseUrl, '/api/dev/quick-login', {
      email: FIXTURE_EMAIL,
      password: FIXTURE_PASSWORD,
    });
    assert.equal(passwordFieldResponse.status, 400, 'strict body must reject password-like fields');
  } finally {
    await stopServer(server);
  }
});

test('T-2 production startup does not mount the dev quick-login path', async () => {
  const server = await startServer({ nodeEnv: 'production', quickLoginEnabled: true });
  try {
    seedFixtureUser(server.dbPath);
    const response = await postJson(server.baseUrl, '/api/dev/quick-login', {
      email: FIXTURE_EMAIL,
    });
    assert.equal(response.status, 404);
  } finally {
    await stopServer(server);
  }
});

test('T-3 the explicit opt-in defaults off and leaves the path unmounted', async () => {
  const server = await startServer({ nodeEnv: 'development', quickLoginEnabled: false });
  try {
    seedFixtureUser(server.dbPath);
    const response = await postJson(server.baseUrl, '/api/dev/quick-login', {
      email: FIXTURE_EMAIL,
    });
    assert.equal(response.status, 404);
  } finally {
    await stopServer(server);
  }
});
