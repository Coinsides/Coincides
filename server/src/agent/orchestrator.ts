import { getProviderFromSettings } from './providers/index.js';
import type { ProviderMessage, StreamChunk, ToolCall, ToolResult, ContentBlock } from './providers/types.js';
import { toolDefinitions } from './tools/definitions.js';
import { executeTool } from './tools/executor.js';
import { MemoryManager } from './memory/manager.js';
import { buildSystemPrompt } from './system-prompt.js';

import { queryAll, queryOne } from '../db/pool.js';

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
  const memory = new MemoryManager(userId);

  // 1. Get user settings, build provider
  const user = await queryOne(`SELECT id, name, settings FROM users WHERE id = $1`, [userId]) as any | undefined;
  if (!user) {
    yield { type: 'error', error: 'User not found' };
    return;
  }

  let settings: Record<string, unknown>;
  try {
    settings = (user.settings || {});
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
  const courses = await queryAll(`SELECT id, name, code FROM courses WHERE user_id = $1`, [userId]);
  const memories = await memory.retrieveMemories(userMessage);
  const docSummaries = await memory.getDocumentSummaries();
  const today = new Date().toISOString().split('T')[0];
  const energyStatus = await queryOne('SELECT energy_level FROM daily_statuses WHERE user_id = $1 AND date = $2', [userId, today]);

  // Pre-load decks with their sections to reduce tool call rounds
  const decks = await queryAll('SELECT d.id, d.name, d.course_id, d.card_count FROM card_decks d WHERE d.user_id = $1 ORDER BY d.name', [userId]) as { id: string; name: string; course_id: string; card_count: number }[];
  const deckSections = new Map<string, { id: string; name: string }[]>();
  if (decks.length > 0) {
    const sections = await queryAll(`SELECT id, deck_id, name FROM card_sections WHERE user_id = $1 ORDER BY order_index`, [userId]) as { id: string; deck_id: string; name: string }[];
    for (const s of sections) {
      if (!deckSections.has(s.deck_id)) deckSections.set(s.deck_id, []);
      deckSections.get(s.deck_id)!.push({ id: s.id, name: s.name });
    }
  }

  // 3. Build system prompt
  const parsedSettings = (user.settings || {});
  // Detect L1 onboarding context
  const isNewUser = contextHint?.type === 'l1_onboarding';
  const systemPrompt = buildSystemPrompt(agentName, {
    userName: user.name,
    courses,
    memories: memories.map((m) => ({ category: m.category, content: m.content })),
    documentSummaries: docSummaries,
    decks: decks.map((d) => ({
      id: d.id,
      name: d.name,
      course_id: d.course_id,
      card_count: d.card_count,
      sections: deckSections.get(d.id) || [],
    })),
    currentDate: today,
    energyLevel: energyStatus?.energy_level,
    language: parsedSettings.language,
    isNewUser,
  });

  // 4. Get conversation history
  const history = await memory.getConversationHistory(conversationId);

  // 5. Add context hint if provided
  let augmentedMessage = userMessage;
  if (contextHint) {
    augmentedMessage = `[Context: user is viewing ${contextHint.type} — ${JSON.stringify(contextHint.data)}]\n\n${userMessage}`;
  }

  // 6. Save user message
  await memory.saveMessage(conversationId, 'user', augmentedMessage);

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

    // Execute tool calls in parallel for maximum efficiency
    // All tool calls in a single round are independent (Claude decides to call them together)
    let hasPreferenceForm = false;
    let preferenceFormData: unknown = null;

    const toolResultPromises = currentToolCalls.map(async (tc) => {
      try {
        const result = await executeTool(tc.name, tc.arguments, userId);

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

        return { tool_call_id: tc.id, content: result } as ToolResult;
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Tool execution error';
        console.error(`Tool execution failed [${tc.name}]:`, err);
        return { tool_call_id: tc.id, content: JSON.stringify({ error: `Tool '${tc.name}' failed: ${errMsg}` }) } as ToolResult;
      }
    });

    const toolResults = await Promise.all(toolResultPromises);

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
    await memory.saveMessage(
      conversationId,
      'assistant',
      textBuffer,
      JSON.stringify(currentToolCalls),
    );
    await memory.saveMessage(
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
    await memory.saveMessage(
      conversationId,
      'assistant',
      lastRoundText,
    );
  }

  // 10. Extract memories from this exchange
  await memory.extractMemories(conversationId, userMessage, fullResponse);

  yield { type: 'done' };
}
