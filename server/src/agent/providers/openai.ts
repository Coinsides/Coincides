import type { AIProvider, ProviderConfig, ProviderMessage, ToolDefinition, StreamChunk } from './types.js';

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
    };
    if (openaiTools.length > 0) {
      body.tools = openaiTools;
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
      const toolCalls: Map<number, { id: string; name: string; args: string }> = new Map();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') {
            // Emit tool_call_end for any accumulated tool calls
            for (const [, tc] of toolCalls) {
              let args: Record<string, unknown> = {};
              try { args = tc.args ? JSON.parse(tc.args) : {}; } catch { /* ignore */ }
              yield {
                type: 'tool_call_end',
                tool_call: { id: tc.id, name: tc.name, arguments: args },
              };
            }
            yield { type: 'done' };
            return;
          }

          let parsed: Record<string, unknown>;
          try { parsed = JSON.parse(data); } catch { continue; }

          const choices = parsed.choices as Array<Record<string, unknown>> | undefined;
          if (!choices || choices.length === 0) continue;

          const delta = choices[0].delta as Record<string, unknown> | undefined;
          if (!delta) continue;

          // Text content
          if (delta.content) {
            yield { type: 'text', text: delta.content as string };
          }

          // Tool calls
          const deltaToolCalls = delta.tool_calls as Array<Record<string, unknown>> | undefined;
          if (deltaToolCalls) {
            for (const dtc of deltaToolCalls) {
              const index = dtc.index as number;
              const fn = dtc.function as Record<string, unknown> | undefined;

              if (!toolCalls.has(index)) {
                const id = (dtc.id as string) || `call_${index}`;
                const name = fn?.name as string || '';
                toolCalls.set(index, { id, name, args: '' });
                yield { type: 'tool_call_start', tool_call: { id, name } };
              }

              const tc = toolCalls.get(index)!;
              if (fn?.arguments) {
                tc.args += fn.arguments as string;
                yield { type: 'tool_call_delta', tool_call: { id: tc.id, name: tc.name }, text: fn.arguments as string };
              }
            }
          }
        }
      }

      // Handle case where stream ends without [DONE]
      for (const [, tc] of toolCalls) {
        let args: Record<string, unknown> = {};
        try { args = tc.args ? JSON.parse(tc.args) : {}; } catch { /* ignore */ }
        yield {
          type: 'tool_call_end',
          tool_call: { id: tc.id, name: tc.name, arguments: args },
        };
      }
      yield { type: 'done' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'OpenAI API error';
      yield { type: 'error', error: message };
    }
  }
}
