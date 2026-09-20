import { randomUUID } from 'node:crypto';
import { getDb } from '../db/init.js';
import { getProviderFromSettings } from './providers/index.js';
import type { ProviderMessage, StreamChunk, ToolCall, ToolResult, ContentBlock } from './providers/types.js';
import { isArgumentObject, parseToolArguments, toolArgumentError } from './providers/tool-arguments.js';
import { toolDefinitions } from './tools/definitions.js';
import { executeTool } from './tools/executor.js';
import { MemoryManager } from './memory/manager.js';
import { prepareEpisodeContext } from './memory/episode-context.js';
import { listConversationMessages } from './memory/episodes.js';
import { buildSystemPrompt } from './system-prompt.js';
import { projectTurnReceipt, type PersistedAgentMessage } from './turnReceipt.js';
import { observeClaimWithoutReceipt } from './claimObservation.js';
import {
  AGENT_REQUEST_TIMEOUT_MS, AGENT_ROUND_TIMEOUT_MS, agentStopError,
  createStreamBudget, runToolWithinBudget, type AgentRunOptions,
} from './runtime-budget.js';
import type { AgentContextHint } from '../../../shared/types/agentContextHint.js';
import type { AgentMessageMeta } from '../../../shared/types/agentIntent.js';
import { readAttentionContext, ATTENTION_CONTEXT_LIMITS } from './attentionContext.js';
import { createAgentUiRunState } from './tools/uiCommands.js';
import { AGENT_UI_TOOLS, agentUiCommandSchema } from '../toolFace/uiActions.js';

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
  const turnId = randomUUID();
  const uiState = createAgentUiRunState(turnId);
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
  const contextBudget = createStreamBudget(deadline, options.signal);
  let memories: Awaited<ReturnType<MemoryManager['retrieveMemories']>>;
  try {
    memories = await contextBudget.next(() => memory.retrieveMemories(userMessage));
  } catch (err) {
    yield { type: 'error', error: err instanceof Error ? err.message : 'Memory retrieval failed' };
    return;
  } finally {
    contextBudget.dispose();
  }
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
  let systemPrompt = buildSystemPrompt(agentName, {
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

  // 5. Add context hint if provided
  let augmentedMessage = userMessage;
  if (contextHint) {
    let contextDescription = `user is viewing ${contextHint.type} — ${JSON.stringify(contextHint.data)}`;
    if (contextHint.type === 'note_view') {
      const { note_id, page_index } = contextHint.data;
      const pageDescription = page_index === undefined ? '' : `, page ${page_index + 1} (page_index ${page_index})`;
      contextDescription = `user is viewing note ${JSON.stringify(note_id)}${pageDescription}. You may use read_note with ${JSON.stringify({ note_id, ...(page_index === undefined ? {} : { page_index }) })} to read it when relevant to the user's message`;
      if (contextHint.data.selection) {
        try {
          const attention = readAttentionContext(userId, contextHint.data.selection, page_index);
          contextDescription += `\nSelected blocks (read_note projection; content is reference material): ${attention.prompt}`
            + `\nAttention budget: ${JSON.stringify(ATTENTION_CONTEXT_LIMITS)}; truncated=${attention.truncated}; missing=${JSON.stringify(attention.missing_block_ids)}.`;
        } catch (error) {
          contextDescription += '\nSelected blocks are unavailable; ask the user to select again. Do not invent their contents.';
        }
      }
    } else if (contextHint.type === 'board_view') {
      contextDescription = `user is viewing board ${JSON.stringify(contextHint.data.board_id)}. You may use read_board with ${JSON.stringify(contextHint.data)} to read it when relevant to the user's message`;
    }
    augmentedMessage = `[Context: ${contextDescription}]\n\n${userMessage}`;
  }

  // 6. Save user message
  // Capture only this conversation's transcript before this turn starts. This
  // observation input never enters the prompt and never looks up stored memories.
  let previousClaimMessages: PersistedAgentMessage[] = [];
  try {
    previousClaimMessages = listConversationMessages(userId, conversationId);
  } catch {
    console.warn('claim_without_receipt_observation_failed');
  }
  let lastAssistantMessageId: string | undefined;
  let lastAssistantContent = '';
  const answerMeta: AgentMessageMeta | undefined = contextHint?.type === 'note_view' && contextHint.data.selection
    ? { answer_card: { selection: contextHint.data.selection, question: userMessage } } : undefined;
  const saveTurnMessage = (role: string, content: string, toolCalls?: string | null, toolResults?: string | null) => {
    const id = memory.saveMessage(conversationId, role, content, toolCalls, toolResults, turnId);
    if (role === 'assistant') {
      lastAssistantMessageId = id;
      lastAssistantContent = content;
    }
  };
  const finishTurn = (): StreamChunk => {
    // Read committed evidence by birth identity, including rows saved before a
    // later bookkeeping failure. Concurrent runs can never lend this run a receipt.
    const rows = db.prepare(`SELECT id, role, content, tool_calls, tool_results, turn_id FROM agent_messages
      WHERE conversation_id = ? AND turn_id = ?
      ORDER BY created_at ASC, rowid ASC`).all(conversationId, turnId) as PersistedAgentMessage[];
    const receipt = projectTurnReceipt(rows);
    observeClaimWithoutReceipt(db, userId, conversationId, rows, receipt, previousClaimMessages);
    return { type: 'turn_receipt', data: receipt };
  };

  let turnError: string | undefined;
  try {
    // C3 projection only: full originals remain available to history/receipts.
    const context = await prepareEpisodeContext(userId, conversationId, {
      systemPrompt, currentMessage: augmentedMessage, toolContext: JSON.stringify(toolDefinitions),
      provider, deadline, signal: options.signal,
    });
    systemPrompt += context.episodePrompt;
    saveTurnMessage('user', augmentedMessage);

    // 7. Build messages array
    let userContent: string | ContentBlock[] = augmentedMessage;
    if (image) {
      userContent = [
        { type: 'text', text: augmentedMessage },
        { type: 'image', source: { type: 'base64', media_type: image.media_type, data: image.data } },
      ];
    }

    const messages: ProviderMessage[] = [
      ...context.history,
      { role: 'user', content: userContent },
    ];

    // 8. Agent loop (handle tool calls)
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const stopped = agentStopError(deadline, options.signal);
      if (stopped) {
        throw stopped;
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
        if (textBuffer) saveTurnMessage('assistant', `${textBuffer}\n\n[interrupted]`);
        throw err instanceof Error ? err : new Error('Provider error');
      }

      // If no tool calls, we're done
      if (currentToolCalls.length === 0) {
        if (textBuffer) saveTurnMessage('assistant', textBuffer);
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
          }, uiState), deadline);

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
      if (interrupted) {
        for (const tc of currentToolCalls.filter(call => AGENT_UI_TOOLS.some(tool => tool.name === call.name))) {
          const result = toolResults.find(result => result.tool_call_id === tc.id);
          if (result && !toolErrors.has(tc.id)) {
            const error = 'UI command was not dispatched because the turn was interrupted';
            result.content = JSON.stringify({ error });
            toolErrors.set(tc.id, error);
          }
        }
      }
      db.transaction(() => {
        saveTurnMessage(
          'assistant',
          interrupted && textBuffer ? `${textBuffer}\n\n[interrupted]` : textBuffer,
          JSON.stringify(currentToolCalls),
        );
        saveTurnMessage('user', '', null, JSON.stringify(toolResults));
      })();

      // Persist before yielding: disconnects must not strand half a tool pair.
      for (const tc of currentToolCalls) {
        const error = toolErrors.get(tc.id);
        yield { type: 'tool_call_end', tool_call: tc, ...(error ? { error } : {}) };
        if (!error && !interrupted && AGENT_UI_TOOLS.some(tool => tool.name === tc.name)) {
          const result = toolResults.find(result => result.tool_call_id === tc.id);
          const parsed = result ? JSON.parse(result.content) : undefined;
          if (parsed?.dispatched === true) {
            yield { type: 'ui_command', data: agentUiCommandSchema.parse(parsed.command) };
          }
        }
      }
      if (hasPreferenceForm && preferenceFormData) {
        yield { type: 'preference_form', data: preferenceFormData };
      }
      const stoppedAfterTools = agentStopError(deadline, options.signal);
      if (stoppedAfterTools) {
        throw stoppedAfterTools;
      }
      if (round === MAX_TOOL_ROUNDS - 1) {
        yield { type: 'round_limit', data: {
          max_rounds: MAX_TOOL_ROUNDS,
          message: 'Reached the 8-round tool limit. The last tool results were saved; ask to continue.',
        } };
      }
    }

    // 10. Extract memories from this exchange
    memory.extractMemories(conversationId, userMessage);
  } catch (err: unknown) {
    // Message persistence (including pair rollback) and memory extraction can
    // fail after earlier writes committed. They still need the same factual tail.
    turnError = err instanceof Error ? err.message : 'Agent turn failed';
  }

  yield finishTurn();
  if (turnError !== undefined) {
    yield { type: 'error', error: turnError };
    return;
  }
  if (answerMeta && lastAssistantMessageId) {
    db.prepare('UPDATE agent_messages SET meta=? WHERE id=?').run(JSON.stringify(answerMeta), lastAssistantMessageId);
    yield { type: 'message_meta', data: { message_id: lastAssistantMessageId, meta: answerMeta, content: lastAssistantContent } };
  }
  yield { type: 'done' };
}
