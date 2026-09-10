import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import express from 'express';
import providerCredentialsRouter from '../routes/providerCredentials.js';
import {
  PROVIDER_NAMES,
  resolveProviderCredential,
  saveProviderCredential,
  type ProviderCredentialStatus,
} from '../services/providerCredentials.js';

// Functional smoke only: fresh temporary storage, synthetic values, mocked provider HTTP.
// This standalone router does not load the app entry point, dotenv, or any database module.
const originalEnv = process.env;
let temporaryDirectory: string;
beforeEach(() => {
  temporaryDirectory = mkdtempSync(join(tmpdir(), 'coincides-a2-functional-'));
  process.env = {
    ...originalEnv,
    COINCIDES_APP_DATA_DIR: temporaryDirectory,
    DB_PATH: ':memory:',
    ANTHROPIC_API_KEY: '', OPENAI_API_KEY: '', GENERIC_API_KEY: '',
    DEEPSEEK_API_KEY: '', DASHSCOPE_API_KEY: '', VOYAGE_API_KEY: '',
  };
});
afterEach(() => {
  process.env = originalEnv;
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

async function withApi(run: (call: (method: string, path?: string, body?: unknown) => Promise<{ status: number; body: any }>) => Promise<void>) {
  const app = express();
  app.use(express.json());
  app.use('/api/settings/providers', providerCredentialsRouter);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const port = address.port;
  try {
    await run((method, path = '', body) => new Promise((resolve, reject) => {
      const payload = body === undefined ? undefined : JSON.stringify(body);
      const req = request({
        hostname: '127.0.0.1', port, path: `/api/settings/providers${path}`, method,
        headers: payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {},
      }, (res) => {
        let content = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => { content += chunk; });
        res.on('end', () => {
          try { resolve({ status: res.statusCode || 0, body: JSON.parse(content) }); }
          catch { reject(new Error('API response was not JSON.')); }
        });
      });
      req.once('error', reject);
      req.end(payload);
    }));
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test('PUT and GET expose local masked status and a fresh process rereads the saved value', async () => {
  await withApi(async (call) => {
    const saved = await call('PUT', '/anthropic', { api_key: 'synthetic-key-not-real-local-0001' });
    const expected: ProviderCredentialStatus = {
      provider: 'anthropic', has_key: true, masked_key: '••••0001', source: 'local', has_local_key: true,
    };
    assert.equal(saved.status, 200);
    assert.deepEqual(saved.body, expected);
    const listed = await call('GET');
    assert.equal(listed.status, 200);
    assert.equal(listed.body.providers.length, PROVIDER_NAMES.length);
    assert.deepEqual(listed.body.providers.find((entry: ProviderCredentialStatus) => entry.provider === 'anthropic'), expected);

    const serviceUrl = new URL('../services/providerCredentials.ts', import.meta.url).href;
    const script = `import {getProviderCredentialStatus,resolveProviderCredential} from ${JSON.stringify(serviceUrl)};
      process.stdout.write(JSON.stringify({status:getProviderCredentialStatus('anthropic'),
        resolved:resolveProviderCredential('anthropic') === 'synthetic-key-not-real-local-0001'}));`;
    const child = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '--eval', script], {
      cwd: fileURLToPath(new URL('../../', import.meta.url)), env: process.env, encoding: 'utf8',
    });
    assert.equal(child.status, 0, 'fresh process must read the temporary credential store');
    assert.deepEqual(JSON.parse(child.stdout), { status: expected, resolved: true });
  });
});

test('all provider environment fallbacks remain available and a local value takes precedence', async () => {
  for (const provider of PROVIDER_NAMES) {
    process.env[`${provider.toUpperCase()}_API_KEY`] = `synthetic-key-not-real-env-${provider}-0002`;
  }
  await withApi(async (call) => {
    const listed = await call('GET');
    for (const provider of PROVIDER_NAMES) {
      assert.deepEqual(listed.body.providers.find((entry: ProviderCredentialStatus) => entry.provider === provider), {
        provider, has_key: true, masked_key: '••••0002', source: 'environment', has_local_key: false,
      });
      assert.ok(resolveProviderCredential(provider) === `synthetic-key-not-real-env-${provider}-0002`);
    }
    await call('PUT', '/openai', { api_key: 'synthetic-key-not-real-local-0003' });
    assert.ok(resolveProviderCredential('openai') === 'synthetic-key-not-real-local-0003');
  });
});

test('DELETE reports environment fallback or an absent key immediately', async () => {
  process.env.DEEPSEEK_API_KEY = 'synthetic-key-not-real-env-0004';
  await withApi(async (call) => {
    await call('PUT', '/deepseek', { api_key: 'synthetic-key-not-real-local-0005' });
    const fallback = await call('DELETE', '/deepseek');
    assert.deepEqual(fallback.body, {
      provider: 'deepseek', has_key: true, masked_key: '••••0004', source: 'environment', has_local_key: false,
    });
    await call('PUT', '/voyage', { api_key: 'synthetic-key-not-real-local-0006' });
    const absent = await call('DELETE', '/voyage');
    const expected = { provider: 'voyage', has_key: false, masked_key: null, source: 'none', has_local_key: false };
    assert.deepEqual(absent.body, expected);
    const listed = await call('GET');
    assert.deepEqual(listed.body.providers.find((entry: ProviderCredentialStatus) => entry.provider === 'voyage'), expected);
  });
});

test('test-connection uses one minimal mocked request for each existing provider', async (t) => {
  const requests: Array<{ url: string; body: any; method: string | undefined; hasCredential: boolean }> = [];
  t.mock.method(globalThis, 'fetch', async (url: URL, init: RequestInit) => {
    const headers = new Headers(init.headers);
    requests.push({
      url: String(url), body: JSON.parse(init.body as string), method: init.method,
      hasCredential: headers.get('x-api-key') === 'synthetic-key-not-real-connection-0007'
        || headers.get('Authorization') === 'Bearer synthetic-key-not-real-connection-0007',
    });
    return new Response('{}', { status: 200 });
  });
  const expectedDefaults = [
    ['anthropic', 'https://api.anthropic.com/v1/messages', 'claude-sonnet-4-20250514'],
    ['openai', 'https://api.openai.com/v1/chat/completions', 'gpt-4o'],
    ['generic', 'https://api.openai.com/v1/chat/completions', 'gpt-4o'],
    ['deepseek', 'https://api.deepseek.com/v1/chat/completions', 'deepseek-chat'],
    ['dashscope', 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions', 'qwen-plus'],
    ['voyage', 'https://api.voyageai.com/v1/embeddings', 'voyage-4'],
  ];
  await withApi(async (call) => {
    for (const [provider, url, model] of expectedDefaults) {
      saveProviderCredential(provider, 'synthetic-key-not-real-connection-0007');
      const result = await call('POST', `/${provider}/test-connection`);
      assert.deepEqual(result.body, { success: true, category: 'ok', http_status: 200 });
      const captured = requests.at(-1)!;
      assert.equal(captured.url, url);
      assert.equal(captured.method, 'POST');
      assert.equal(captured.hasCredential, true);
      assert.equal(captured.body.model, model);
      if (provider === 'voyage') assert.deepEqual(captured.body.input, ['Connection check']);
      else {
        assert.equal(captured.body.max_tokens, 1);
        assert.equal(captured.body.stream, false);
        assert.deepEqual(captured.body.messages, [{ role: 'user', content: 'Hi' }]);
      }
    }
    assert.equal(requests.length, PROVIDER_NAMES.length);
    await call('POST', '/deepseek/test-connection', { model: 'synthetic-model', base_url: 'https://provider.example/v1/' });
    assert.equal(requests.at(-1)!.url, 'https://provider.example/v1/chat/completions');
    assert.equal(requests.at(-1)!.body.model, 'synthetic-model');
  });
});

test('test-connection distinguishes missing credentials and mocked HTTP, network, and timeout outcomes', async (t) => {
  let outcome: number | 'network' | 'timeout' = 200;
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    calls++;
    if (outcome === 'network') throw new TypeError('Synthetic network failure');
    if (outcome === 'timeout') throw new DOMException('Synthetic timeout', 'TimeoutError');
    return new Response('{}', { status: outcome });
  });
  await withApi(async (call) => {
    const missing = await call('POST', '/generic/test-connection');
    assert.deepEqual(missing.body, { success: false, category: 'missing_key' });
    assert.equal(calls, 0);
    saveProviderCredential('generic', 'synthetic-key-not-real-connection-0008');
    for (const [status, category] of [
      [401, 'authentication'], [403, 'authentication'], [429, 'rate_limit'],
      [408, 'timeout'], [504, 'timeout'], [500, 'provider_error'], [400, 'invalid_request'],
    ] as const) {
      outcome = status;
      const result = await call('POST', '/generic/test-connection');
      assert.deepEqual(result.body, { success: false, category, http_status: status });
    }
    for (const category of ['network', 'timeout'] as const) {
      outcome = category;
      const result = await call('POST', '/generic/test-connection');
      assert.deepEqual(result.body, { success: false, category });
    }
  });
});
