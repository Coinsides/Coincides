import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, ProviderConfig, ProviderMessage, ToolDefinition, StreamChunk } from './types.js';

export class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  private model: string;

  constructor(config: ProviderConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model;
  }

  async *chat(
    messages: ProviderMessage[],
    tools: ToolDefinition[],
    systemPrompt: string,
  ): AsyncGenerator<StreamChunk> {
    // Map messages to Anthropic format
    const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => {
      if (m.tool_calls && m.tool_calls.length > 0) {
        // Assistant message with tool use
        const content: Anthropic.ContentBlockParam[] = [];
        if (m.content && typeof m.content === 'string') {
          content.push({ type: 'text', text: m.content });
        }
        for (const tc of m.tool_calls) {
          content.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.name,
            input: tc.arguments,
          });
        }
        return { role: 'assistant' as const, content };
      }

      if (m.tool_results && m.tool_results.length > 0) {
        // Tool results as user message
        const content: Anthropic.ContentBlockParam[] = m.tool_results.map((tr) => ({
          type: 'tool_result' as const,
          tool_use_id: tr.tool_call_id,
          content: tr.content,
        }));
        return { role: 'user' as const, content };
      }

      // Handle content blocks (e.g. image + text)
      if (Array.isArray(m.content)) {
        const content: Anthropic.ContentBlockParam[] = m.content.map((block) => {
          if (block.type === 'image') {
            return {
              type: 'image' as const,
              source: {
                type: 'base64' as const,
                media_type: block.source.media_type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: block.source.data,
              },
            };
          }
          return { type: 'text' as const, text: block.text };
        });
        return { role: m.role === 'assistant' ? 'assistant' as const : 'user' as const, content };
      }

      return { role: m.role === 'assistant' ? 'assistant' as const : 'user' as const, content: m.content };
    });

    // Final safety pass: ensure every tool_use has a matching tool_result
    // This guards against any edge case the history sanitizer might miss
    const validatedMessages: Anthropic.MessageParam[] = [];
    for (let idx = 0; idx < anthropicMessages.length; idx++) {
      const am = anthropicMessages[idx];
      // Check if this is an assistant message containing tool_use blocks
      if (am.role === 'assistant' && Array.isArray(am.content)) {
        const toolUseBlocks = (am.content as Anthropic.ContentBlockParam[]).filter(
          (b: any) => b.type === 'tool_use',
        );
        if (toolUseBlocks.length > 0) {
          const nextMsg = anthropicMessages[idx + 1];
          if (nextMsg?.role === 'user' && Array.isArray(nextMsg.content)) {
            const toolResultBlocks = (nextMsg.content as any[]).filter(
              (b: any) => b.type === 'tool_result',
            );
            const resultIds = new Set(toolResultBlocks.map((b: any) => b.tool_use_id));
            const allMatched = toolUseBlocks.every((b: any) => resultIds.has(b.id));
            if (allMatched) {
              validatedMessages.push(am);
              validatedMessages.push(nextMsg);
              idx++; // skip the tool_result message (already added)
              continue;
            }
            // Mismatch — drop both the tool_use assistant msg and tool_result user msg
            idx++; // skip the next message too
            continue;
          }
          // No following tool_result — drop this assistant message
          continue;
        }
      }
      validatedMessages.push(am);
    }

    // Map tool definitions to Anthropic format
    const anthropicTools: Anthropic.Tool[] = tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters as Anthropic.Tool.InputSchema,
    }));

    try {
      const stream = this.client.messages.stream({
        model: this.model,
        max_tokens: 16384,
        system: systemPrompt,
        messages: validatedMessages,
        tools: anthropicTools.length > 0 ? anthropicTools : undefined,
      });

      let currentToolCallId = '';
      let currentToolCallName = '';
      let currentToolInputJson = '';

      for await (const event of stream) {
        if (event.type === 'content_block_start') {
          const block = event.content_block;
          if (block.type === 'text') {
            // Text block starting, nothing to yield yet
          } else if (block.type === 'tool_use') {
            currentToolCallId = block.id;
            currentToolCallName = block.name;
            currentToolInputJson = '';
            yield {
              type: 'tool_call_start',
              tool_call: { id: block.id, name: block.name },
            };
          }
        } else if (event.type === 'content_block_delta') {
          const delta = event.delta;
          if (delta.type === 'text_delta') {
            yield { type: 'text', text: delta.text };
          } else if (delta.type === 'input_json_delta') {
            currentToolInputJson += delta.partial_json;
            yield {
              type: 'tool_call_delta',
              tool_call: { id: currentToolCallId, name: currentToolCallName },
              text: delta.partial_json,
            };
          }
        } else if (event.type === 'content_block_stop') {
          if (currentToolCallName) {
            let args: Record<string, unknown> = {};
            try {
              args = currentToolInputJson ? JSON.parse(currentToolInputJson) : {};
            } catch (err) {
              console.error('Anthropic stream error:', err);
              // If JSON parse fails, use empty args
            }
            yield {
              type: 'tool_call_end',
              tool_call: { id: currentToolCallId, name: currentToolCallName, arguments: args },
            };
            currentToolCallId = '';
            currentToolCallName = '';
            currentToolInputJson = '';
          }
        } else if (event.type === 'message_stop') {
          yield { type: 'done' };
        }
      }
      // Fallback: if stream ended without message_stop, still emit done
      yield { type: 'done' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Anthropic API error';
      yield { type: 'error', error: message };
    }
  }
}
