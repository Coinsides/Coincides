import { getDb } from '../db/init.js';
import { getProviderFromSettings } from './providers/index.js';
import type { ProviderMessage, StreamChunk, ToolCall, ToolResult, ContentBlock } from './providers/types.js';
import { toolDefinitions } from './tools/definitions.js';
import { executeTool } from './tools/executor.js';
import { MemoryManager } from './memory/manager.js';
import { buildSystemPrompt } from './system-prompt.js';

const MAX_TOOL_ROUNDS = 8;

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
  const parsedSettings = JSON.parse(user.settings || '{}');
  // Detect L1 onboarding context
  const isNewUser = contextHint?.type === 'l1_onboarding';
  const systemPrompt = buildSystemPrompt(agentName, {
    userName: user.name,
    courses,
    memories: memories.map((m) => ({ category: m.category, content: m.content })),
    documentSummaries: docSummaries,
    currentDate: today,
    energyLevel: energyStatus?.energy_level,
    language: parsedSettings.language,
    isNewUser,
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
  let lastRoundText = '';
  let lastRoundHadTools = false;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const currentToolCalls: ToolCall[] = [];
    let textBuffer = '';
    let currentToolCall: Partial<ToolCall> | null = null;
    let toolInputJson = '';

    try {
      const ROUND_TIMEOUT_MS = 300_000;
      let roundTimedOut = false;
      const timeoutHandle = setTimeout(() => { roundTimedOut = true; }, ROUND_TIMEOUT_MS);

      try {
        for await (const chunk of provider.chat(messages, toolDefinitions, systemPrompt)) {
          if (roundTimedOut) {
            yield { type: 'error', error: 'Request timed out after 300s' };
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
    lastRoundText = textBuffer;

    // If no tool calls, we're done
    if (currentToolCalls.length === 0) {
      lastRoundHadTools = false;
      break;
    }
    lastRoundHadTools = true;

    // Execute tool calls
    const toolResults: ToolResult[] = [];
    let hasPreferenceForm = false;
    let preferenceFormData: unknown = null;
    for (const tc of currentToolCalls) {
      try {
        const result = await executeTool(tc.name, tc.arguments, userId);
        toolResults.push({ tool_call_id: tc.id, content: result });

        // Detect preference_form from collect_preferences tool
        if (tc.name === 'collect_preferences') {
          try {
            const parsed = JSON.parse(result);
            if (parsed.__type === 'preference_form') {
              hasPreferenceForm = true;
              preferenceFormData = parsed.questions;
            }
          } catch { /* ignore parse errors */ }
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Tool execution error';
        console.error(`Tool execution failed [${tc.name}]:`, err);
        toolResults.push({ tool_call_id: tc.id, content: JSON.stringify({ error: `Tool '${tc.name}' failed: ${errMsg}` }) });
      }
    }

    // If a preference form was generated, emit it as a special SSE event
    if (hasPreferenceForm && preferenceFormData) {
      yield { type: 'preference_form', data: preferenceFormData };
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

    // Persist intermediate tool round to DB so history stays complete
    // (each tool_use must have a matching tool_result in conversation history)
    memory.saveMessage(
      conversationId,
      'assistant',
      textBuffer,
      JSON.stringify(currentToolCalls),
    );
    memory.saveMessage(
      conversationId,
      'user',
      '',
      null,
      JSON.stringify(toolResults),
    );
  }

  // 9. Save final assistant text response
  // Only save if the last round had NO tool calls (otherwise it was already saved in the loop)
  if (lastRoundText && !lastRoundHadTools) {
    memory.saveMessage(
      conversationId,
      'assistant',
      lastRoundText,
    );
  }

  // 10. Extract memories from this exchange
  memory.extractMemories(conversationId, userMessage, fullResponse);

  yield { type: 'done' };
}
