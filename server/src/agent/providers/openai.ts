import { randomUUID } from 'node:crypto';
import type { AIProvider, ProviderConfig, ProviderMessage, ToolDefinition, StreamChunk } from './types.js';
import { parseToolArguments } from './tool-arguments.js';

export class OpenAIProvider implements AIProvider {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.baseUrl = (config.baseUrl || 'https://api.openai.com').replace(/\/$/, '');
  }

  async *chat(
    messages: ProviderMessage[],
    tools: ToolDefinition[],
    systemPrompt: string,
  ): AsyncGenerator<StreamChunk> {
    // Map messages to OpenAI format
    const openaiMessages: Record<string, unknown>[] = [
      { role: 'system', content: systemPrompt },
    ];

    for (const m of messages) {
      if (m.tool_calls && m.tool_calls.length > 0) {
        openaiMessages.push({
          role: 'assistant',
          content: (typeof m.content === 'string' ? m.content : null) || null,
          tool_calls: m.tool_calls.map((tc) => ({
            id: tc.id,
            type: 'function',
            function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
          })),
        });
      } else if (m.tool_results && m.tool_results.length > 0) {
        for (const tr of m.tool_results) {
          openaiMessages.push({
            role: 'tool',
            tool_call_id: tr.tool_call_id,
            content: tr.content,
          });
        }
      } else if (Array.isArray(m.content)) {
        // Map content blocks to OpenAI format
        const parts = m.content.map((block) => {
          if (block.type === 'image') {
            return {
              type: 'image_url',
              image_url: { url: `data:${block.source.media_type};base64,${block.source.data}` },
            };
          }
          return { type: 'text', text: block.text };
        });
        openaiMessages.push({ role: m.role, content: parts });
      } else {
        openaiMessages.push({ role: m.role, content: m.content });
      }
    }

    // Map tool definitions
    const openaiTools = tools.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    const body: Record<string, unknown> = {
      model: this.model,
      messages: openaiMessages,
      stream: true,
      max_tokens: 16384,
    };
    if (openaiTools.length > 0) {
      body.tools = openaiTools;
      body.parallel_tool_calls = true;
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text();
        yield { type: 'error', error: `OpenAI API error ${response.status}: ${errText}` };
        return;
      }

      if (!response.body) {
        yield { type: 'error', error: 'No response body from OpenAI' };
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const streamId = randomUUID();
      const toolCalls = new Map<number, { id: string; name: string; args: string; started: boolean }>();
      let latestIndex: number | undefined;
      let finishReason: string | null = null;
      let streamDone = false;

      function* parseLine(line: string): Generator<StreamChunk> {
        const trimmed = line.trim();
        if (!/^data:\s?/.test(trimmed)) return;
        const data = trimmed.replace(/^data:\s?/, '');
        if (data === '[DONE]') {
          streamDone = true;
          return;
        }
        let parsed: Record<string, unknown>;
        try { parsed = JSON.parse(data); } catch { return; }
        const choices = parsed?.choices as Array<Record<string, unknown>> | undefined;
        const choice = choices?.[0];
        if (!choice) return;
        if (typeof choice.finish_reason === 'string') finishReason = choice.finish_reason;
        const delta = choice.delta as Record<string, unknown> | undefined;
        if (!delta) return;
        if (typeof delta.content === 'string' && delta.content) {
          yield { type: 'text', text: delta.content };
        }
        const deltaToolCalls = delta.tool_calls as Array<Record<string, unknown>> | undefined;
        if (!Array.isArray(deltaToolCalls)) return;
        for (const dtc of deltaToolCalls) {
          const index = typeof dtc.index === 'number' && Number.isInteger(dtc.index) && dtc.index >= 0
            ? dtc.index : latestIndex ?? 0;
          const fn = dtc.function as Record<string, unknown> | undefined;
          if (!toolCalls.has(index)) {
            toolCalls.set(index, { id: '', name: '', args: '', started: false });
            latestIndex = index;
          }
          const tc = toolCalls.get(index)!;
          if (!tc.id && typeof dtc.id === 'string') tc.id = dtc.id;
          if (!tc.name && typeof fn?.name === 'string') tc.name = fn.name;
          const addition = typeof fn?.arguments === 'string' ? fn.arguments : '';
          tc.args += addition;
          // Wait for late metadata before exposing identity. Buffered arguments
          // are replayed once, so every start/delta/end keeps the same id.
          if (!tc.started && tc.id && tc.name) {
            tc.started = true;
            yield { type: 'tool_call_start', tool_call: { id: tc.id, name: tc.name } };
            if (tc.args) yield { type: 'tool_call_delta', tool_call: { id: tc.id, name: tc.name }, text: tc.args };
          } else if (tc.started && addition) {
            yield { type: 'tool_call_delta', tool_call: { id: tc.id, name: tc.name }, text: addition };
          }
        }
      }

      try {
        while (!streamDone) {
          const { done, value } = await reader.read();
          buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          if (done && buffer) {
            lines.push(buffer);
            buffer = '';
          }
          for (const line of lines) {
            yield* parseLine(line);
            if (streamDone) break;
          }
          if (done) break;
        }
      } finally {
        reader.releaseLock();
      }

      let sequence = 0;
      for (const tc of toolCalls.values()) {
        if (!tc.id) tc.id = `call_${streamId}_${sequence}`;
        sequence++;
        if (!tc.started) {
          yield { type: 'tool_call_start', tool_call: { id: tc.id, name: tc.name } };
          if (tc.args) yield { type: 'tool_call_delta', tool_call: { id: tc.id, name: tc.name }, text: tc.args };
        }
        const result = parseToolArguments(tc.name, tc.args, finishReason);
        yield {
          type: 'tool_call_end',
          tool_call: { id: tc.id, name: tc.name, ...(result.error ? {} : { arguments: result.arguments }) },
          ...(result.error ? { error: result.error } : {}),
        };
      }
      yield { type: 'done' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'OpenAI API error';
      yield { type: 'error', error: message };
    }
  }
}
