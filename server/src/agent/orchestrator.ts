import { getDb } from '../db/init.js';
import { getProviderFromSettings } from './providers/index.js';
import type { ProviderMessage, StreamChunk, ToolCall, ToolResult, ContentBlock } from './providers/types.js';
import { toolDefinitions } from './tools/definitions.js';
import { executeTool } from './tools/executor.js';
import { MemoryManager } from './memory/manager.js';
import { buildSystemPrompt } from './system-prompt.js';

const MAX_TOOL_ROUNDS = 5;

interface UserRow {
  id: string;
  name: string;
  settings: string;
}

interface CourseRow {
  id: string;
  name: string;
  code: string;
}

interface EnergyRow {
  energy_level: string;
}

export async function* runAgent(
  userId: string,
  conversationId: string,
  userMessage: string,
  contextHint?: { type: string; data?: unknown },
  image?: { media_type: string; data: string },
): AsyncGenerator<StreamChunk> {
  const db = getDb();
  const memory = new MemoryManager(userId);

  // 1. Get user settings, build provider
  const user = db.prepare('SELECT id, name, settings FROM users WHERE id = ?').get(userId) as UserRow | undefined;
  if (!user) {
    yield { type: 'error', error: 'User not found' };
    return;
  }

  let settings: Record<string, unknown>;
  try {
    settings = JSON.parse(user.settings || '{}');
  } catch (err) {
    console.error('Agent orchestration error:', err);
    settings = {};
  }

  let provider;
  try {
    const result = getProviderFromSettings(settings);
    provider = result.provider;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to initialize AI provider';
    yield { type: 'error', error: message };
    return;
  }

  const agentName = (settings.agent_name as string) || 'Mr. Zero';

  // 2. Build context
  const courses = db.prepare('SELECT id, name, code FROM courses WHERE user_id = ?').all(userId) as CourseRow[];
  const memories = memory.retrieveMemories(userMessage);
  const docSummaries = memory.getDocumentSummaries();
  const today = new Date().toISOString().split('T')[0];
  const energyStatus = db.prepare(
    'SELECT energy_level FROM daily_statuses WHERE user_id = ? AND date = ?',
  ).get(userId, today) as EnergyRow | undefined;

  // 3. Build system prompt
  const systemPrompt = buildSystemPrompt(agentName, {
    userName: user.name,
    courses,
    memories: memories.map((m) => ({ category: m.category, content: m.content })),
    documentSummaries: docSummaries,
    currentDate: today,
    energyLevel: energyStatus?.energy_level,
  });

  // 4. Get conversation history
  const history = memory.getConversationHistory(conversationId);

  // 5. Add context hint if provided
  let augmentedMessage = userMessage;
  if (contextHint) {
    augmentedMessage = `[Context: user is viewing ${contextHint.type} — ${JSON.stringify(contextHint.data)}]\n\n${userMessage}`;
  }

  // 6. Save user message
  memory.saveMessage(conversationId, 'user', augmentedMessage);

  // 7. Build messages array
  let userContent: string | ContentBlock[] = augmentedMessage;
  if (image) {
    userContent = [
      { type: 'text', text: augmentedMessage },
      { type: 'image', source: { type: 'base64', media_type: image.media_type, data: image.data } },
    ];
  }

  const messages: ProviderMessage[] = [
    ...history,
    { role: 'user', content: userContent },
  ];

  // 8. Agent loop (handle tool calls)
  let fullResponse = '';
  const toolCallsAccumulated: ToolCall[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const currentToolCalls: ToolCall[] = [];
    let textBuffer = '';
    let currentToolCall: Partial<ToolCall> | null = null;
    let toolInputJson = '';

    try {
      const ROUND_TIMEOUT_MS = 30_000;
      let roundTimedOut = false;
      const timeoutHandle = setTimeout(() => { roundTimedOut = true; }, ROUND_TIMEOUT_MS);

      try {
        for await (const chunk of provider.chat(messages, toolDefinitions, systemPrompt)) {
          if (roundTimedOut) {
            yield { type: 'error', error: 'Agent round timed out after 30s' };
            clearTimeout(timeoutHandle);
            return;
          }
          if (chunk.type === 'text') {
            textBuffer += chunk.text || '';
            yield chunk;
          } else if (chunk.type === 'tool_call_start') {
            currentToolCall = { id: chunk.tool_call?.id, name: chunk.tool_call?.name };
            toolInputJson = '';
          } else if (chunk.type === 'tool_call_delta') {
            toolInputJson += chunk.text || '';
          } else if (chunk.type === 'tool_call_end') {
            if (chunk.tool_call?.arguments) {
              currentToolCalls.push(chunk.tool_call as ToolCall);
            } else if (currentToolCall?.name) {
              let args: Record<string, unknown> = {};
              try { args = toolInputJson ? JSON.parse(toolInputJson) : {}; } catch { /* ignore */ }
              currentToolCalls.push({
                id: currentToolCall.id || `call_${round}_${currentToolCalls.length}`,
                name: currentToolCall.name,
                arguments: args,
              });
            }
            currentToolCall = null;
            toolInputJson = '';
          } else if (chunk.type === 'error') {
            yield chunk;
            clearTimeout(timeoutHandle);
            return;
          } else if (chunk.type === 'done') {
            break;
          }
        }
      } finally {
        clearTimeout(timeoutHandle);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Provider error';
      yield { type: 'error', error: message };
      return;
    }

    fullResponse += textBuffer;

    // If no tool calls, we're done
    if (currentToolCalls.length === 0) {
      break;
    }

    // Execute tool calls
    const toolResults: ToolResult[] = [];
    for (const tc of currentToolCalls) {
      try {
        const result = await executeTool(tc.name, tc.arguments, userId);
        toolResults.push({ tool_call_id: tc.id, content: result });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Tool execution error';
        toolResults.push({ tool_call_id: tc.id, content: JSON.stringify({ error: errMsg }) });
      }
    }

    // Add assistant message with tool calls + tool results to messages
    messages.push({
      role: 'assistant',
      content: textBuffer,
      tool_calls: currentToolCalls,
    });
    messages.push({
      role: 'user',
      content: '',
      tool_results: toolResults,
    });

    toolCallsAccumulated.push(...currentToolCalls);
  }

  // 9. Save assistant response
  memory.saveMessage(
    conversationId,
    'assistant',
    fullResponse,
    toolCallsAccumulated.length > 0 ? JSON.stringify(toolCallsAccumulated) : null,
  );

  // 10. Extract memories from this exchange
  memory.extractMemories(conversationId, userMessage, fullResponse);

  yield { type: 'done' };
}
