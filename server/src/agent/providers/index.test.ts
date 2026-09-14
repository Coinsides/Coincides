import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { afterEach, beforeEach, type TestContext } from 'node:test';
import { AnthropicProvider } from './anthropic.js';
import { createProvider, getProviderFromSettings, type AIProvider } from './index.js';
import { OpenAIProvider } from './openai.js';
import type { ProviderChatOptions, ProviderMessage, StreamChunk, ToolDefinition } from './types.js';
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


// Protocol fixtures only: fetch/SDK streams are local stubs and no .env or database is loaded.
const noteTool: ToolDefinition = {
  name: 'organized_note',
  description: 'Prepare a note proposal',
  parameters: { type: 'object', properties: { title: { type: 'string' } } },
};

function provider() {
  return new OpenAIProvider({
    apiKey: 'syn-stream',
    model: 'stream-fixture',
    baseUrl: 'https://provider.example',
  });
}

function event(delta: Record<string, unknown>, finishReason?: string, separator = ' ') {
  return `data:${separator}${JSON.stringify({
    choices: [{ delta, ...(finishReason ? { finish_reason: finishReason } : {}) }],
  })}\n\n`;
}

function toolDelta(index: number | undefined, args: string, id?: string, name?: string) {
  return {
    tool_calls: [{
      ...(index === undefined ? {} : { index }),
      ...(id ? { id } : {}),
      function: { ...(name ? { name } : {}), arguments: args },
    }],
  };
}

function stubStream(t: TestContext, pieces: Array<string | Uint8Array>) {
  const requests: Record<string, unknown>[] = [];
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => {
    requests.push(JSON.parse(init.body as string));
    const encoder = new TextEncoder();
    return new Response(new ReadableStream<Uint8Array>({
      start(controller) {
        for (const piece of pieces) {
          controller.enqueue(typeof piece === 'string' ? encoder.encode(piece) : piece);
        }
        controller.close();
      },
    }));
  });
  return requests;
}

async function collect(
  adapter: AIProvider = provider(),
  tools = [noteTool],
  messages: ProviderMessage[] = [{ role: 'user', content: '整理笔记' }],
  systemPrompt = 'Protocol test',
  options?: ProviderChatOptions,
) {
  const chunks: StreamChunk[] = [];
  for await (const chunk of adapter.chat(messages, tools, systemPrompt, options)) {
    chunks.push(chunk);
  }
  return chunks;
}

function ends(chunks: StreamChunk[]) {
  return chunks.filter((chunk) => chunk.type === 'tool_call_end');
}

function assertSuccessfulCall(chunks: StreamChunk[], id: string, args: Record<string, unknown>) {
  const callChunks = chunks.filter((chunk) => chunk.tool_call?.id === id);
  const end = callChunks[callChunks.length - 1];
  assert.equal(callChunks[0]?.type, 'tool_call_start');
  assert.equal(end?.type, 'tool_call_end');
  assert.ok(callChunks.every((chunk) => chunk.tool_call?.name === noteTool.name));
  assert.deepEqual(end?.tool_call?.arguments, args);
  assert.equal(end?.error, undefined);
  assert.deepEqual(JSON.parse(callChunks.filter((chunk) => chunk.type === 'tool_call_delta')
    .map((chunk) => chunk.text ?? '').join('')), args);
}

test('OpenAI requests explicitly set the output budget and parallel tool calls', async (t) => {
  const requests = stubStream(t, ['data: [DONE]\n\n']);
  await collect();
  await collect(provider(), []);
  assert.equal(requests[0].max_tokens, 16384);
  assert.equal(requests[0].parallel_tool_calls, true);
  assert.deepEqual(requests[0].tools, [{
    type: 'function',
    function: { name: noteTool.name, description: noteTool.description, parameters: noteTool.parameters },
  }]);
  assert.equal(requests[1].max_tokens, 16384);
  assert.equal(requests[1].tools, undefined);
});

for (const ending of ['done', 'eof'] as const) {
  for (const scenario of [
    { name: 'empty arguments', raw: '', finishReason: 'tool_calls' },
    { name: 'unfinished JSON', raw: '{"title":"Draft"', finishReason: 'tool_calls' },
    { name: 'length-truncated arguments', raw: '{"title":"Draft"}', finishReason: 'length' },
  ]) {
    test(`OpenAI ${scenario.name} returns a readable tool error at ${ending}`, async (t) => {
      // A finish-only chunk deliberately has no delta: length still has to be captured.
      const finish = `data: ${JSON.stringify({ choices: [{ finish_reason: scenario.finishReason }] })}`;
      stubStream(t, [
        event(toolDelta(0, scenario.raw, 'call-one', noteTool.name)),
        finish + (ending === 'done' ? '\n\ndata: [DONE]\n\n' : ''),
      ]);
      const chunks = await collect();
      const [end] = ends(chunks);
      assert.equal(ends(chunks).length, 1);
      assert.equal(end.tool_call?.id, 'call-one');
      assert.equal(end.tool_call?.name, noteTool.name);
      assert.equal(end.tool_call?.arguments, undefined, 'invalid arguments must not become a successful empty object');
      assert.ok(end.error);
      assert.match(end.error, /organized_note/);
      assert.match(end.error, /finish_reason/);
      assert.ok(end.error.includes(scenario.finishReason));
      assert.match(end.error, /raw_length/);
      assert.ok(end.error.includes(String(scenario.raw.length)));
      assert.match(end.error, /raw_prefix/);
      if (scenario.finishReason === 'length') assert.match(end.error, /truncat|截断/i);
      assert.equal(chunks[chunks.length - 1]?.type, 'done');
    });
  }
}

test('OpenAI keeps a deliberately empty JSON object valid', async (t) => {
  stubStream(t, [event(toolDelta(0, '{}', 'call-empty', noteTool.name)), event({}, 'tool_calls'), 'data: [DONE]\n\n']);
  assertSuccessfulCall(await collect(), 'call-empty', {});
});

test('OpenAI diagnostics report a bounded prefix for a long interrupted note', async (t) => {
  const raw = `{"title":"Notes","content":"${'Long note text. '.repeat(60)}`;
  stubStream(t, [event(toolDelta(0, raw, 'call-long', noteTool.name)), event({}, 'length'), 'data: [DONE]\n\n']);
  const [end] = ends(await collect());
  assert.ok(end.error);
  assert.ok(end.error.includes(String(raw.length)));
  assert.match(end.error, /raw_prefix/);
  assert.ok(end.error.length < raw.length, 'diagnostics must not embed the full long argument payload');
  assert.equal(end.tool_call?.arguments, undefined);
});

test('OpenAI interleaved calls with the same name retain separate IDs and arguments', async (t) => {
  stubStream(t, [
    event(toolDelta(0, '{"title":', 'call-first', noteTool.name)),
    event(toolDelta(1, '{"title":', 'call-second', noteTool.name)),
    event(toolDelta(0, '"First"}')),
    event(toolDelta(1, '"Second"}')),
    event({}, 'tool_calls'),
    'data: [DONE]\n\n',
  ]);
  const chunks = await collect();
  assert.equal(ends(chunks).length, 2);
  assertSuccessfulCall(chunks, 'call-first', { title: 'First' });
  assertSuccessfulCall(chunks, 'call-second', { title: 'Second' });
});

test('OpenAI missing continuation index uses the most recently registered call', async (t) => {
  stubStream(t, [
    event(toolDelta(3, '{"title":', 'call-first', noteTool.name)),
    event(toolDelta(7, '{"title":', 'call-second', noteTool.name)),
    event(toolDelta(3, '"First"}')),
    event(toolDelta(undefined, '"Second"}')),
    'data: [DONE]\n\n',
  ]);
  const chunks = await collect();
  assert.equal(ends(chunks).length, 2, 'a missing index must not register a third call');
  assertSuccessfulCall(chunks, 'call-first', { title: 'First' });
  assertSuccessfulCall(chunks, 'call-second', { title: 'Second' });
});

test('OpenAI registers late name and ID before exposing buffered arguments', async (t) => {
  stubStream(t, [
    event(toolDelta(0, '{"title":')),
    event(toolDelta(undefined, '"Late"', undefined, noteTool.name)),
    event(toolDelta(0, '}', 'call-late')),
    'data: [DONE]\n\n',
  ]);
  const chunks = await collect();
  const toolChunks = chunks.filter((chunk) => chunk.tool_call);
  assert.ok(toolChunks.every((chunk) => chunk.tool_call?.id === 'call-late'));
  assertSuccessfulCall(chunks, 'call-late', { title: 'Late' });
});

test('OpenAI fallback IDs remain stable within a call and distinct across calls and turns', async (t) => {
  stubStream(t, [
    event(toolDelta(0, '{"title":"First"}', undefined, noteTool.name)),
    event(toolDelta(1, '{"title":"Second"}', undefined, noteTool.name)),
    'data: [DONE]\n\n',
  ]);
  const adapter = provider();
  const first = await collect(adapter);
  const second = await collect(adapter);
  const ids = [...ends(first), ...ends(second)].map((chunk) => chunk.tool_call?.id);
  assert.equal(ids.length, 4);
  assert.ok(ids.every((id) => typeof id === 'string' && id.length > 0));
  assert.equal(new Set(ids).size, 4);
  for (const chunks of [first, second]) {
    for (const end of ends(chunks)) {
      assertSuccessfulCall(chunks, end.tool_call!.id!, end.tool_call!.arguments!);
    }
  }
});

test('OpenAI handles no-space SSE fields, split UTF-8, and an unterminated final line', async (t) => {
  const text = event({ content: '整理' }, undefined, '')
    + event(toolDelta(0, '{"title":"笔记"}', 'call-utf8', noteTool.name), undefined, '').trimEnd();
  const bytes = new TextEncoder().encode(text);
  const chineseByte = bytes.findIndex((byte) => byte > 127);
  stubStream(t, [bytes.slice(0, chineseByte + 1), bytes.slice(chineseByte + 1, chineseByte + 2), bytes.slice(chineseByte + 2)]);
  const chunks = await collect();
  assert.equal(chunks.find((chunk) => chunk.type === 'text')?.text, '整理');
  assertSuccessfulCall(chunks, 'call-utf8', { title: '笔记' });
  assert.equal(chunks[chunks.length - 1]?.type, 'done');
});

test('Anthropic normal text and tool streams retain the existing protocol and token budget', async (t) => {
  const adapter = new AnthropicProvider({ apiKey: 'syn-anthropic', model: 'stream-fixture' });
  const sdk = (adapter as unknown as {
    client: { messages: { stream: (params: Record<string, unknown>) => AsyncIterable<unknown> } };
  }).client;
  let request: Record<string, unknown> | undefined;
  t.mock.method(sdk.messages, 'stream', (params: Record<string, unknown>) => {
    request = params;
    return (async function* () {
      yield { type: 'content_block_start', content_block: { type: 'text', text: '' } };
      yield { type: 'content_block_delta', delta: { type: 'text_delta', text: '整理中' } };
      yield { type: 'content_block_stop' };
      yield { type: 'content_block_start', content_block: { type: 'tool_use', id: 'anthropic-one', name: noteTool.name } };
      yield { type: 'content_block_delta', delta: { type: 'input_json_delta', partial_json: '{"title":' } };
      yield { type: 'content_block_delta', delta: { type: 'input_json_delta', partial_json: '"笔记"}' } };
      yield { type: 'content_block_stop' };
      yield { type: 'message_stop' };
    })();
  });
  const chunks = await collect(adapter);
  assert.equal(request?.max_tokens, 16384);
  assert.deepEqual(request?.tools, [{
    name: noteTool.name,
    description: noteTool.description,
    input_schema: noteTool.parameters,
    cache_control: { type: 'ephemeral' },
  }]);
  assert.equal(chunks.find((chunk) => chunk.type === 'text')?.text, '整理中');
  assertSuccessfulCall(chunks, 'anthropic-one', { title: '笔记' });
  assert.equal(chunks.some((chunk) => chunk.type === 'error'), false);
  assert.equal(chunks[chunks.length - 1]?.type, 'done');
});

function anthropicEvent(type: string, fields: Record<string, unknown> = {}) {
  return `event: ${type}\ndata: ${JSON.stringify({ type, ...fields })}\n\n`;
}

// The real SDK consumes these SSE fixtures, so assertions below inspect the
// serialized HTTP body rather than just the arguments passed to messages.stream.
function anthropicResponse() {
  return [
    anthropicEvent('message_start', { message: {
      id: 'msg-fixture', type: 'message', role: 'assistant', model: 'stream-fixture',
      content: [], stop_reason: null, stop_sequence: null,
      usage: { input_tokens: 12, output_tokens: 0 },
    } }),
    anthropicEvent('content_block_start', { index: 0, content_block: { type: 'text', text: '' } }),
    anthropicEvent('content_block_delta', { index: 0, delta: { type: 'text_delta', text: '整理中' } }),
    anthropicEvent('content_block_stop', { index: 0 }),
    anthropicEvent('content_block_start', {
      index: 1, content_block: { type: 'tool_use', id: 'call-sdk', name: noteTool.name, input: {} },
    }),
    anthropicEvent('content_block_delta', {
      index: 1, delta: { type: 'input_json_delta', partial_json: '{"title":' },
    }),
    anthropicEvent('content_block_delta', {
      index: 1, delta: { type: 'input_json_delta', partial_json: '"笔记"}' },
    }),
    anthropicEvent('content_block_stop', { index: 1 }),
    anthropicEvent('message_delta', {
      delta: { stop_reason: 'tool_use', stop_sequence: null }, usage: { output_tokens: 8 },
    }),
    anthropicEvent('message_stop'),
  ];
}

test('Anthropic HTTP payload caches system, the final tool, and the rolling conversation prefix', async (t) => {
  const requests = stubStream(t, anthropicResponse());
  const adapter = new AnthropicProvider({ apiKey: 'syn-cache', model: 'stream-fixture' });
  // More than four tools catches mistakenly allocating one breakpoint per tool.
  const tools = Array.from({ length: 6 }, (_, index) => ({
    ...noteTool, name: index === 5 ? noteTool.name : `note_${index}`,
  }));
  const originalTools = structuredClone(tools);
  const systemPrompt = 'Static instructions\n中文与空格保持原样。';
  const chunks = await collect(adapter, tools, undefined, systemPrompt);
  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0], {
    model: 'stream-fixture', max_tokens: 16384, stream: true,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    tools: tools.map((tool, index) => ({
      name: tool.name, description: tool.description, input_schema: tool.parameters,
      ...(index === tools.length - 1 ? { cache_control: { type: 'ephemeral' } } : {}),
    })),
    messages: [{ role: 'user', content: '整理笔记' }],
    cache_control: { type: 'ephemeral' },
  });
  assert.deepEqual(tools, originalTools, 'cache metadata must not mutate the shared tool definitions');
  assert.deepEqual(chunks.map((chunk) => chunk.type), [
    'text', 'tool_call_start', 'tool_call_delta', 'tool_call_delta', 'tool_call_end', 'done', 'done',
  ], 'retain the existing text, tool, and completion events');
  assert.equal(chunks[0].text, '整理中');
  assertSuccessfulCall(chunks, 'call-sdk', { title: '笔记' });
});

test('Anthropic HTTP payload leaves empty system and tools valid without empty cache blocks', async (t) => {
  const requests = stubStream(t, anthropicResponse());
  const adapter = new AnthropicProvider({ apiKey: 'syn-cache', model: 'stream-fixture' });
  await collect(adapter, [], undefined, '');
  await collect(adapter, [], undefined, 'Static instructions');
  assert.equal(requests[0].system, '', 'preserve the existing empty-string representation');
  assert.equal(requests[0].tools, undefined);
  assert.deepEqual(requests[0].cache_control, { type: 'ephemeral' });
  assert.deepEqual(requests[1].system, [{
    type: 'text', text: 'Static instructions', cache_control: { type: 'ephemeral' },
  }]);
  assert.equal(requests[1].tools, undefined);
  assert.deepEqual(requests[1].cache_control, { type: 'ephemeral' });
});

test('Anthropic caching preserves growing text and tool history, input objects, and safety filtering', async (t) => {
  const requests = stubStream(t, anthropicResponse());
  const adapter = new AnthropicProvider({ apiKey: 'syn-cache', model: 'stream-fixture' });
  const history: ProviderMessage[] = [{ role: 'user', content: '整理笔记' }];
  const expectedMessages: Record<string, unknown>[] = [{ role: 'user', content: '整理笔记' }];
  for (let turn = 0; turn < 8; turn++) {
    const originalHistory = structuredClone(history);
    await collect(adapter, [noteTool], history);
    const request = requests[turn];
    assert.deepEqual(request.messages, expectedMessages, 'history content and order must stay unchanged');
    assert.deepEqual(request.cache_control, { type: 'ephemeral' });
    assert.equal(JSON.stringify(request).match(/"cache_control"/g)?.length, 3,
      'growing history must not accumulate explicit per-message breakpoints');
    assert.deepEqual(history, originalHistory, 'request construction must not annotate or rewrite caller history');
    const id = `call-${turn}`;
    const content = `工具回执 ${turn}`;
    history.push(
      { role: 'assistant', content: `步骤 ${turn}`, tool_calls: [{ id, name: noteTool.name, arguments: { turn } }] },
      { role: 'user', content: '', tool_results: [{ tool_call_id: id, content }] },
      { role: 'assistant', content: `完成 ${turn}` },
      { role: 'user', content: [{ type: 'text', text: `继续 ${turn}` }] },
    );
    expectedMessages.push(
      { role: 'assistant', content: [
        { type: 'text', text: `步骤 ${turn}` },
        { type: 'tool_use', id, name: noteTool.name, input: { turn } },
      ] },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content }] },
      { role: 'assistant', content: `完成 ${turn}` },
      { role: 'user', content: [{ type: 'text', text: `继续 ${turn}` }] },
    );
  }
  history.push(
    { role: 'assistant', content: '', tool_calls: [{ id: 'missing-result', name: noteTool.name, arguments: {} }] },
    { role: 'user', content: '', tool_results: [{ tool_call_id: 'wrong-id', content: 'discard' }] },
    { role: 'assistant', content: '', tool_calls: [{ id: 'orphan', name: noteTool.name, arguments: {} }] },
    { role: 'user', content: '保留最后的问题' },
  );
  const originalHistory = structuredClone(history);
  await collect(adapter, [noteTool], history);
  assert.deepEqual(requests[8].messages, [
    ...expectedMessages, { role: 'user', content: '保留最后的问题' },
  ], 'the existing pass still drops mismatched tool pairs and orphan tool calls');
  assert.deepEqual(history, originalHistory);
});

// The same public cancellation contract applies to every provider name. The
// Anthropic rows exercise the installed SDK, including its actual fetch signal.
const abortProviders = ['openai', 'generic', 'deepseek', 'dashscope', 'anthropic'];
function abortProvider(name: string) {
  return createProvider(name, { apiKey: 'syn-abort', model: 'stream-fixture' });
}

for (const name of abortProviders) {
  test(`${name}: a pre-aborted chat makes no network request`, async (t) => {
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => {
      assert.fail('pre-aborted chat must not call fetch');
    });
    const controller = new AbortController();
    controller.abort(new Error('Request cancelled'));
    const chunks = await collect(abortProvider(name), [], [], '', { signal: controller.signal });
    assert.deepEqual(chunks, [{ type: 'error', error: 'Request cancelled' }]);
    assert.equal(fetchMock.mock.callCount(), 0);
    assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
  });

  test(`${name}: abort reaches an in-flight fetch and releases the chat`, { timeout: 2000 }, async (t) => {
    let transportSignal: AbortSignal | undefined;
    let started!: () => void;
    const requestStarted = new Promise<void>((resolve) => { started = resolve; });
    t.mock.method(globalThis, 'fetch', (_url: unknown, init: RequestInit) => {
      transportSignal = init.signal!;
      return new Promise<Response>((_resolve, reject) => {
        transportSignal!.addEventListener('abort', () => reject(transportSignal!.reason), { once: true });
        started();
      });
    });
    const controller = new AbortController();
    const pending = collect(abortProvider(name), [], [], '', { signal: controller.signal });
    await requestStarted;
    controller.abort();
    const chunks = await pending;
    assert.equal(transportSignal?.aborted, true);
    assert.deepEqual(chunks.map((chunk) => chunk.type), ['error']);
    assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
  });

  test(`${name}: abort interrupts a response body stalled after visible text`, { timeout: 2000 }, async (t) => {
    let transportSignal: AbortSignal | undefined;
    const prefix = name === 'anthropic'
      ? anthropicResponse().slice(0, 3).join('')
      : event({ content: '整理中' });
    let body: ReadableStream<Uint8Array> | undefined;
    t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => {
      transportSignal = init.signal!;
      body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(prefix));
          transportSignal!.addEventListener('abort', () => controller.error(transportSignal!.reason), { once: true });
        },
      });
      return new Response(body);
    });
    const controller = new AbortController();
    const iterator = abortProvider(name).chat([], [], '', { signal: controller.signal });
    assert.deepEqual((await iterator.next()).value, { type: 'text', text: '整理中' });
    const pending = iterator.next();
    controller.abort();
    const result = await pending;
    assert.equal(result.value?.type, 'error');
    assert.equal((await iterator.next()).done, true);
    assert.equal(transportSignal?.aborted, true);
    assert.equal(body?.locked, false);
    assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
  });
}

test('OpenAI early return cancels the body without awaiting a stalled cancellation handshake', { timeout: 2000 }, async (t) => {
  let transportSignal: AbortSignal | undefined;
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(new TextEncoder().encode(event({ content: 'visible' }))); },
    cancel() {
      cancelled = true;
      return new Promise<void>(() => {});
    },
  });
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => {
    transportSignal = init.signal!;
    return new Response(body);
  });
  const controller = new AbortController();
  const iterator = provider().chat([], [], '', { signal: controller.signal });
  assert.equal((await iterator.next()).value?.type, 'text');
  assert.equal((await iterator.return(undefined)).done, true);
  assert.equal(cancelled, true);
  assert.equal(transportSignal?.aborted, true);
  assert.equal(body.locked, false);
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
});

test('OpenAI protocol completion closes a peer that keeps its response body open', { timeout: 2000 }, async (t) => {
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n')); },
    cancel() { cancelled = true; return new Promise<void>(() => {}); },
  });
  t.mock.method(globalThis, 'fetch', async () => new Response(body));
  assert.deepEqual(await collect(provider(), []), [{ type: 'done' }]);
  assert.equal(cancelled, true);
  assert.equal(body.locked, false);
});

test('Anthropic early return aborts the real SDK transport without waiting for more events', { timeout: 2000 }, async (t) => {
  let transportSignal: AbortSignal | undefined;
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => {
    transportSignal = init.signal!;
    return new Response(new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(anthropicResponse().slice(0, 3).join('')));
        transportSignal!.addEventListener('abort', () => controller.error(transportSignal!.reason), { once: true });
      },
    }));
  });
  const controller = new AbortController();
  const iterator = abortProvider('anthropic').chat([], [], '', { signal: controller.signal });
  assert.equal((await iterator.next()).value?.type, 'text');
  assert.equal((await iterator.return(undefined)).done, true);
  assert.equal(transportSignal?.aborted, true);
  // SDK completion runs in its background pump after iterator.return() aborts.
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
});
