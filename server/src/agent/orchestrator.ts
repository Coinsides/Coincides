import { randomUUID } from 'node:crypto';
import { getDb } from '../db/init.js';
import { getProviderFromSettings } from './providers/index.js';
import type { ProviderMessage, StreamChunk, ToolCall, ToolResult, ContentBlock } from './providers/types.js';
import { isArgumentObject, parseToolArguments, toolArgumentError } from './providers/tool-arguments.js';
import { toolDefinitions } from './tools/definitions.js';
import { executeTool } from './tools/executor.js';
import { MemoryManager } from './memory/manager.js';
import { buildSystemPrompt } from './system-prompt.js';
import {
  AGENT_REQUEST_TIMEOUT_MS, AGENT_ROUND_TIMEOUT_MS, agentStopError,
  createStreamBudget, runToolWithinBudget, type AgentRunOptions,
} from './runtime-budget.js';
import type { AgentContextHint } from '../../../shared/types/agentContextHint.js';

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

export async function* runAgent(
  userId: string,
  conversationId: string,
  userMessage: string,
  contextHint?: AgentContextHint,
  image?: { media_type: string; data: string },
  options: AgentRunOptions = {},
): AsyncGenerator<StreamChunk> {
  const deadline = options.deadline ?? Date.now() + AGENT_REQUEST_TIMEOUT_MS;
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

  // Pre-load decks with their sections to reduce tool call rounds
  const decks = db.prepare(
    'SELECT d.id, d.name, d.course_id, d.card_count FROM card_decks d WHERE d.user_id = ? ORDER BY d.name',
  ).all(userId) as { id: string; name: string; course_id: string; card_count: number }[];
  const deckSections = new Map<string, { id: string; name: string }[]>();
  if (decks.length > 0) {
    const sections = db.prepare(
      `SELECT id, deck_id, name FROM card_sections WHERE user_id = ? ORDER BY order_index`,
    ).all(userId) as { id: string; deck_id: string; name: string }[];
    for (const s of sections) {
      if (!deckSections.has(s.deck_id)) deckSections.set(s.deck_id, []);
      deckSections.get(s.deck_id)!.push({ id: s.id, name: s.name });
    }
  }

  // 3. Build system prompt
  const parsedSettings = JSON.parse(user.settings || '{}');
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
    language: parsedSettings.language,
    isNewUser,
  });

  // 4. Get conversation history
  const history = memory.getConversationHistory(conversationId);

  // 5. Add context hint if provided
  let augmentedMessage = userMessage;
  if (contextHint) {
    let contextDescription = `user is viewing ${contextHint.type} — ${JSON.stringify(contextHint.data)}`;
    if (contextHint.type === 'note_view') {
      const { note_id, page_index } = contextHint.data;
      const pageDescription = page_index === undefined ? '' : `, page ${page_index + 1} (page_index ${page_index})`;
      contextDescription = `user is viewing note ${JSON.stringify(note_id)}${pageDescription}. You may use read_note with ${JSON.stringify(contextHint.data)} to read it when relevant to the user's message`;
    } else if (contextHint.type === 'board_view') {
      contextDescription = `user is viewing board ${JSON.stringify(contextHint.data.board_id)}. You may use read_board with ${JSON.stringify(contextHint.data)} to read it when relevant to the user's message`;
    }
    augmentedMessage = `[Context: ${contextDescription}]\n\n${userMessage}`;
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

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const stopped = agentStopError(deadline, options.signal);
    if (stopped) {
      yield { type: 'error', error: stopped.message };
      return;
    }
    const currentToolCalls: ToolCall[] = [];
    const toolErrors = new Map<string, string>();
    let textBuffer = '';
    const pendingToolCalls = new Map<string, { id: string; name: string; raw: string }>();
    let activeToolCallId: string | undefined;
    const pendingCall = (chunk: StreamChunk) => {
      const id = chunk.tool_call?.id || activeToolCallId || `call_${randomUUID()}`;
      let pending = pendingToolCalls.get(id);
      if (!pending) {
        pending = { id, name: '', raw: '' };
        pendingToolCalls.set(id, pending);
      }
      if (chunk.tool_call?.name) pending.name = chunk.tool_call.name;
      return pending;
    };

    try {
      const budget = createStreamBudget(Math.min(deadline, Date.now() + AGENT_ROUND_TIMEOUT_MS), options.signal);
      let stream: AsyncGenerator<StreamChunk> | undefined;
      try {
        stream = provider.chat(messages, toolDefinitions, systemPrompt, { signal: budget.signal });
        while (true) {
          const next = await budget.next(() => stream!.next());
          if (next.done) break;
          const chunk = next.value;
          if (chunk.type === 'text') {
            textBuffer += chunk.text || '';
            yield chunk;
          } else if (chunk.type === 'tool_call_start') {
            activeToolCallId = undefined;
            activeToolCallId = pendingCall(chunk).id;
          } else if (chunk.type === 'tool_call_delta') {
            pendingCall(chunk).raw += chunk.text || '';
          } else if (chunk.type === 'tool_call_end') {
            const pending = pendingCall(chunk);
            const supplied = chunk.tool_call?.arguments;
            const parsed = isArgumentObject(supplied) && Object.keys(supplied).length > 0
              ? { arguments: supplied }
              : parseToolArguments(pending.name, pending.raw);
            const error = chunk.error || parsed.error
              || (!pending.name ? toolArgumentError('', pending.raw, 'have no tool name') : undefined);
            // An errored call still needs an assistant/tool-result pair in model
            // history. Its placeholder arguments never reach the executor.
            currentToolCalls.push({ id: pending.id, name: pending.name, arguments: error ? {} : parsed.arguments! });
            if (error) toolErrors.set(pending.id, error);
            pendingToolCalls.delete(pending.id);
            if (activeToolCallId === pending.id) activeToolCallId = undefined;
          } else if (chunk.type === 'error') {
            throw new Error(chunk.error || 'Provider error');
          } else if (chunk.type === 'done') {
            break;
          }
        }
      } finally {
        budget.dispose();
        // AsyncGenerator.return() queues behind a pending next(). An uncooperative
        // provider must not turn cleanup into another unbounded wait.
        void stream?.return(undefined).catch(() => {});
      }
    } catch (err: unknown) {
      // Only text was exposed to the user. Calls assembled from a failed stream
      // have not executed, so do not persist orphan tool_use blocks with it.
      if (textBuffer) memory.saveMessage(conversationId, 'assistant', `${textBuffer}\n\n[interrupted]`);
      const message = err instanceof Error ? err.message : 'Provider error';
      yield { type: 'error', error: message };
      return;
    }

    fullResponse += textBuffer;

    // If no tool calls, we're done
    if (currentToolCalls.length === 0) {
      if (textBuffer) memory.saveMessage(conversationId, 'assistant', textBuffer);
      break;
    }

    // Surface tool activity to the SSE consumer at execution time — the
    // provider-stream tool_call_start/end chunks above are consumed for
    // argument assembly and never forwarded, so without these yields the
    // route's tool_start/tool_end events can never fire.
    for (const tc of currentToolCalls) {
      yield { type: 'tool_call_start', tool_call: tc };
    }

    // Execute tool calls in parallel for maximum efficiency
    // All tool calls in a single round are independent (Claude decides to call them together)
    let hasPreferenceForm = false;
    let preferenceFormData: unknown = null;

    const toolResultPromises = currentToolCalls.map(async (tc) => {
      const inputError = toolErrors.get(tc.id);
      if (inputError) {
        return { tool_call_id: tc.id, content: JSON.stringify({ error: inputError }) } as ToolResult;
      }
      try {
        const result = await runToolWithinBudget(() => executeTool(tc.name, tc.arguments, userId, {
          actor: 'agent', channel: 'chat', conversationId, callId: tc.id,
        }), deadline);

        // Some existing executors return an error receipt instead of throwing.
        // Reflect both forms in SSE while preserving the original model result.
        try {
          const receipt: unknown = JSON.parse(result);
          if (isArgumentObject(receipt) && receipt.error) {
            toolErrors.set(tc.id, typeof receipt.error === 'string' ? receipt.error : JSON.stringify(receipt.error));
          }
        } catch { /* Plain-text tool results are also valid. */ }

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
        const error = `Tool '${tc.name}' failed: ${errMsg}`;
        toolErrors.set(tc.id, error);
        return { tool_call_id: tc.id, content: JSON.stringify({ error }) } as ToolResult;
      }
    });

    const toolResults = await Promise.all(toolResultPromises);

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
    const interrupted = agentStopError(deadline, options.signal);
    db.transaction(() => {
      memory.saveMessage(
        conversationId, 'assistant',
        interrupted && textBuffer ? `${textBuffer}\n\n[interrupted]` : textBuffer,
        JSON.stringify(currentToolCalls),
      );
      memory.saveMessage(conversationId, 'user', '', null, JSON.stringify(toolResults));
    })();

    // Persist before yielding: disconnects must not strand half a tool pair.
    for (const tc of currentToolCalls) {
      const error = toolErrors.get(tc.id);
      yield { type: 'tool_call_end', tool_call: tc, ...(error ? { error } : {}) };
    }
    if (hasPreferenceForm && preferenceFormData) {
      yield { type: 'preference_form', data: preferenceFormData };
    }
    const stoppedAfterTools = agentStopError(deadline, options.signal);
    if (stoppedAfterTools) {
      yield { type: 'error', error: stoppedAfterTools.message };
      return;
    }
    if (round === MAX_TOOL_ROUNDS - 1) {
      yield { type: 'round_limit', data: {
        max_rounds: MAX_TOOL_ROUNDS,
        message: 'Reached the 8-round tool limit. The last tool results were saved; ask to continue.',
      } };
    }
  }

  // 10. Extract memories from this exchange
  memory.extractMemories(conversationId, userMessage, fullResponse);

  yield { type: 'done' };
}
