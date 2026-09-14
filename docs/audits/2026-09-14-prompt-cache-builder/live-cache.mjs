// From server/: node --import tsx ../docs/audits/2026-09-14-prompt-cache-builder/live-cache.mjs
// One three-request conversation, using only synthetic context. No application writes.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const evidence = dirname(fileURLToPath(import.meta.url));
const root = resolve(evidence, '../../..');
const require = createRequire(join(root, 'server/package.json'));
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const rawDirectory = join(root, '.codex-tmp/2026-09-14-prompt-cache-builder', `live-${runId}`);
mkdirSync(rawDirectory, { recursive: true });
const summary = {
  executedAt: new Date().toISOString(), status: 'not_started', apiRequests: 0,
  credentialScope: 'Inherited environment, server/.env (normal app dotenv path), and normal provider credential resolver; no other credential files searched.',
  hasAnthropicKey: false, rounds: [], rawDirectory: rawDirectory.replaceAll('\\', '/'),
};
const numeric = (value) => typeof value === 'number' && Number.isFinite(value) ? value : null;

try {
  // Match the application's dotenv entry point, without displaying any values.
  require('dotenv').config({ path: join(root, 'server/.env'), quiet: true });
  const { resolveProviderCredential } = await import('../../../server/src/services/providerCredentials.ts');
  const apiKey = resolveProviderCredential('anthropic');
  summary.hasAnthropicKey = Boolean(apiKey);
  if (!apiKey) {
    summary.status = 'not_run_missing_anthropic_key';
  } else {
    const { AnthropicProvider } = await import('../../../server/src/agent/providers/anthropic.ts');
    const { buildSystemPrompt } = await import('../../../server/src/agent/system-prompt.ts');
    const { toolDefinitions } = await import('../../../server/src/agent/tools/definitions.ts');
    const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
    summary.model = /^claude-[a-z0-9._-]{1,80}$/i.test(model) ? model : 'custom_model';
    const adapter = new AnthropicProvider({ apiKey, model });
    // Bound this evidence run without changing product defaults or adding retries.
    adapter.client = adapter.client.withOptions({ timeout: 60_000, maxRetries: 0, logLevel: 'off' });
    const originalStream = adapter.client.messages.stream.bind(adapter.client.messages);
    let finalMessage;
    adapter.client.messages.stream = (...args) => {
      const stream = originalStream(...args);
      summary.apiRequests++;
      finalMessage = stream.finalMessage().then(
        (message) => ({ usage: message.usage }),
        (error) => ({ httpStatus: numeric(error?.status), failed: true }),
      );
      return stream;
    };
    const systemPrompt = buildSystemPrompt('CacheProbe', {
      userName: 'Synthetic student', courses: [], memories: [], documentSummaries: [],
      currentDate: '2026-09-14', language: 'en',
    });
    summary.systemCharacters = systemPrompt.length;
    summary.toolCount = toolDefinitions.length;
    const messages = [];
    const prompts = [
      'Cache verification only. Do not use tools. What is 2 + 2? Reply with only the number.',
      'Do not use tools. Add 1 to your previous answer. Reply with only the number.',
      'Do not use tools. Add 1 to your previous answer again. Reply with only the number.',
    ];
    for (const [index, prompt] of prompts.entries()) {
      messages.push({ role: 'user', content: prompt });
      let text = '';
      let failed = false;
      let toolCall = false;
      const started = performance.now();
      let firstTextMs = null;
      for await (const chunk of adapter.chat(messages, toolDefinitions, systemPrompt)) {
        if (chunk.type === 'text') {
          firstTextMs ??= Math.round(performance.now() - started);
          text += chunk.text ?? '';
        }
        if (chunk.type.startsWith('tool_call')) toolCall = true;
        if (chunk.type === 'error') failed = true; // Never persist error text, headers, or replies.
      }
      const result = await finalMessage;
      const usage = result?.usage;
      const row = {
        turn: index + 1, elapsedMs: Math.round(performance.now() - started), firstTextMs,
        input_tokens: numeric(usage?.input_tokens), output_tokens: numeric(usage?.output_tokens),
        cache_creation_input_tokens: numeric(usage?.cache_creation_input_tokens),
        cache_read_input_tokens: numeric(usage?.cache_read_input_tokens),
        httpStatus: result?.httpStatus ?? null, failed: failed || Boolean(result?.failed),
        unexpectedToolCall: toolCall, replyPresent: text.length > 0,
      };
      summary.rounds.push(row);
      writeFileSync(join(rawDirectory, `turn-${index + 1}.json`), JSON.stringify(row, null, 2) + '\n');
      if (row.failed || toolCall || !row.replyPresent) {
        summary.status = 'stopped_provider_failure_or_unexpected_reply';
        process.exitCode = 1;
        break;
      }
      messages.push({ role: 'assistant', content: text });
    }
    if (summary.rounds.length === 3 && summary.status === 'not_started') {
      summary.status = summary.rounds.slice(1).some((row) => row.cache_read_input_tokens > 0)
        ? 'completed_cache_hit_observed' : 'completed_no_cache_hit_observed';
      if (summary.status === 'completed_no_cache_hit_observed') process.exitCode = 1;
    }
  }
} catch {
  // Credential parser and transport diagnostics may carry secrets. Emit only a fixed category.
  summary.status = 'stopped_setup_failure';
  process.exitCode = 1;
}
writeFileSync(join(rawDirectory, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
writeFileSync(join(evidence, 'live-summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary));
