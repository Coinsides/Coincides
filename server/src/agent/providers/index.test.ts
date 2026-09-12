import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { afterEach, beforeEach, type TestContext } from 'node:test';
import { AnthropicProvider } from './anthropic.js';
import { createProvider, getProviderFromSettings, type AIProvider } from './index.js';
import { OpenAIProvider } from './openai.js';
import { saveProviderCredential } from '../../services/providerCredentials.js';

// These tests run serially, isolate credential env vars, and never load .env.
const originalEnv = process.env;
let credentialDirectory: string;
beforeEach(() => {
  credentialDirectory = mkdtempSync(join(tmpdir(), 'coincides-provider-regression-'));
  process.env = {
    ...originalEnv,
    COINCIDES_APP_DATA_DIR: credentialDirectory,
    ANTHROPIC_API_KEY: '',
    OPENAI_API_KEY: '',
    DEEPSEEK_API_KEY: '',
    DASHSCOPE_API_KEY: '',
    GENERIC_API_KEY: '',
    VOYAGE_API_KEY: '',
  };
});
afterEach(() => {
  process.env = originalEnv;
  rmSync(credentialDirectory, { recursive: true, force: true });
});

async function captureRequest(t: TestContext, provider: AIProvider, expectedKey: string) {
  let request: { url: string; model: string; authorized: boolean } | undefined;
  t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    request = {
      url: String(url),
      model: JSON.parse(init.body as string).model,
      // Never include credentials or full headers in assertion diagnostics.
      authorized: new Headers(init.headers).get('Authorization') === `Bearer ${expectedKey}`,
    };
    return new Response('data: [DONE]\n\n');
  });
  const chunkTypes: string[] = [];
  for await (const chunk of provider.chat([], [], 'Provider wiring test')) {
    chunkTypes.push(chunk.type);
  }
  assert.deepEqual(chunkTypes, ['done']);
  assert.ok(request, 'provider must issue a request');
  assert.equal(request.authorized, true, 'request must use the expected credential source');
  return request;
}

const newProviders = [
  { name: 'deepseek', env: 'DEEPSEEK_API_KEY', baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' },
  { name: 'dashscope', env: 'DASHSCOPE_API_KEY', baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode', model: 'qwen-plus' },
];

for (const { name, env, baseUrl, model } of newProviders) {
  test(`${name}: createProvider uses the OpenAI-compatible adapter`, () => {
    assert.ok(createProvider(name, { apiKey: 'syn-fake-adapter', model }) instanceof OpenAIProvider);
  });

  test(`${name}: env fallback supplies defaults for absent or empty settings`, async (t) => {
    const envKey = 'syn-fake-environment';
    process.env[env] = envKey;
    for (const config of [undefined, { api_key: '', default_model: '', base_url: '' }]) {
      const { provider, providerName } = getProviderFromSettings({
        active_provider: name,
        ai_providers: config ? { [name]: config } : undefined,
      });
      assert.equal(providerName, name);
      const request = await captureRequest(t, provider, envKey);
      assert.equal(request.url, `${baseUrl}/v1/chat/completions`);
      assert.equal(request.model, model);
    }
  });

  test(`${name}: local credentials win and only the terminal v1 suffix is removed`, async (t) => {
    process.env[env] = 'syn-fake-environment';
    const settingsKey = 'syn-fake-local';
    saveProviderCredential(name, settingsKey);
    for (const suffix of ['', '/', '/v1', '/v1/']) {
      const explicitBase = 'https://provider.example/v1/proxy';
      const config = Object.freeze({
        default_model: 'custom-model',
        base_url: `${explicitBase}${suffix}`,
      });
      const { provider } = getProviderFromSettings({ active_provider: name, ai_providers: { [name]: config } });
      const request = await captureRequest(t, provider, settingsKey);
      assert.equal(request.url, `${explicitBase}/v1/chat/completions`);
      assert.equal(request.model, 'custom-model');
      assert.equal(config.base_url, `${explicitBase}${suffix}`, 'reading must not mutate settings');
    }
  });

  test(`${name}: local credentials work without env fallback`, async (t) => {
    const settingsKey = 'syn-fake-local';
    saveProviderCredential(name, settingsKey);
    const { provider } = getProviderFromSettings({
      active_provider: name,
    });
    await captureRequest(t, provider, settingsKey);
  });

  test(`${name}: missing credentials produce only the existing configuration error`, () => {
    // Credentials for other providers must not be used as a fallback.
    process.env.ANTHROPIC_API_KEY = 'syn-fake-other';
    process.env[name === 'deepseek' ? 'DASHSCOPE_API_KEY' : 'DEEPSEEK_API_KEY'] = 'syn-fake-other';
    assert.throws(() => getProviderFromSettings({ active_provider: name }), {
      message: 'No API key configured. Go to Settings to add one.',
    });
  });
}

for (const name of ['openai', 'generic']) {
  test(`${name}: existing defaults and explicit URL handling work with local credentials`, async (t) => {
    const settingsKey = 'syn-fake-local';
    process.env.DEEPSEEK_API_KEY = 'syn-fake-other';
    process.env.DASHSCOPE_API_KEY = 'syn-fake-other';
    assert.throws(() => getProviderFromSettings({ active_provider: name }), {
      message: 'No API key configured. Go to Settings to add one.',
    });
    saveProviderCredential(name, settingsKey);
    for (const base_url of [undefined, 'https://provider.example/v1/']) {
      const { provider } = getProviderFromSettings({
        active_provider: name,
        ai_providers: { [name]: { base_url } },
      });
      assert.ok(provider instanceof OpenAIProvider);
      const request = await captureRequest(t, provider, settingsKey);
      assert.equal(request.model, 'gpt-4o');
      assert.equal(request.url, base_url
        ? 'https://provider.example/v1/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions');
    }
  });
}

test('anthropic remains the default provider with env fallback', () => {
  process.env.ANTHROPIC_API_KEY = 'syn-fake-anthropic';
  const { provider, providerName } = getProviderFromSettings({});
  assert.equal(providerName, 'anthropic');
  assert.ok(provider instanceof AnthropicProvider);
});
