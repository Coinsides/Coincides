import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { sendMessageSchema, createConversationSchema } from '../validators/index.js';
import { ZodError } from 'zod';
import { runAgent } from '../agent/orchestrator.js';
import { AGENT_REQUEST_TIMEOUT_MS } from '../agent/runtime-budget.js';
import { projectMessageReceipts, type PersistedAgentMessage } from '../agent/turnReceipt.js';

const router = Router();

// GET /api/agent/conversations — list conversations
router.get('/conversations', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const conversations = db.prepare(
    'SELECT id, title, created_at, updated_at FROM agent_conversations WHERE user_id = ? ORDER BY updated_at DESC',
  ).all(req.userId!);
  res.json(conversations);
});

// POST /api/agent/conversations — create conversation
router.post('/conversations', (req: AuthRequest, res: Response) => {
  try {
    const data = createConversationSchema.parse(req.body);
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO agent_conversations (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    ).run(id, req.userId!, data.title || 'New conversation', now, now);
    res.status(201).json({ id, title: data.title || 'New conversation', created_at: now, updated_at: now });
  } catch (err) {
    if (err instanceof ZodError) {
      throw new AppError(400, 'Validation error', err.errors);
    }
    throw err;
  }
});

// GET /api/agent/conversations/:id/messages — get messages
router.get('/conversations/:id/messages', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const conv = db.prepare(
    'SELECT id FROM agent_conversations WHERE id = ? AND user_id = ?',
  ).get(req.params.id, req.userId!) as { id: string } | undefined;

  if (!conv) throw new AppError(404, 'Conversation not found');

  const messages = db.prepare(
    'SELECT id, role, content, tool_calls, tool_results, created_at, turn_id FROM agent_messages WHERE conversation_id = ? ORDER BY created_at ASC, rowid ASC',
  ).all(req.params.id) as PersistedAgentMessage[];
  res.json(projectMessageReceipts(messages));
});

// DELETE /api/agent/conversations/:id — delete conversation
router.delete('/conversations/:id', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const result = db.prepare(
    'DELETE FROM agent_conversations WHERE id = ? AND user_id = ?',
  ).run(req.params.id, req.userId!);
  if (result.changes === 0) throw new AppError(404, 'Conversation not found');
  res.json({ message: 'Conversation deleted' });
});

// POST /api/agent/conversations/:id/messages — send message (SSE stream)
router.post('/conversations/:id/messages', async (req: AuthRequest, res: Response) => {
  try {
    const data = sendMessageSchema.parse(req.body);
    const db = getDb();

    // Verify conversation belongs to user
    const conv = db.prepare(
      'SELECT id FROM agent_conversations WHERE id = ? AND user_id = ?',
    ).get(req.params.id, req.userId!) as { id: string } | undefined;

    if (!conv) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const controller = new AbortController();
    const deadline = Date.now() + AGENT_REQUEST_TIMEOUT_MS;
    const conversationId = req.params.id as string;
    let doneSent = false;
    let errorSent = false;
    let responseClosed = false;
    const canWrite = () => !responseClosed && !res.writableEnded && !res.destroyed;
    const sendEvent = (event: string, data: unknown) => {
      if (canWrite() && !doneSent) {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      }
    };
    const sendError = (message: string, code?: string) => {
      if (errorSent) return;
      sendEvent('error', { message, ...(code ? { code } : {}) });
      errorSent = true;
    };
    const sendDone = () => {
      sendEvent('done', {});
      doneSent = true;
    };
    const closeResponse = () => {
      sendDone();
      if (canWrite()) res.end();
    };
    const abortDisconnected = () => {
      responseClosed = true;
      controller.abort(new Error('Client disconnected'));
    };
    const onRequestClose = () => {
      // IncomingMessage also closes after an ordinary, completely read POST body.
      if (req.aborted || !req.complete) abortDisconnected();
    };
    const onResponseClose = () => {
      responseClosed = true;
      if (!doneSent) controller.abort(new Error('Client disconnected'));
    };
    req.on('aborted', abortDisconnected);
    req.on('close', onRequestClose);
    res.on('close', onResponseClose);
    if (req.aborted || res.destroyed) abortDisconnected();

    const requestTimer = setTimeout(() => {
      const message = `Request timed out after ${AGENT_REQUEST_TIMEOUT_MS / 1000}s`;
      controller.abort(new Error(message));
      sendError(message);
      closeResponse();
    }, Math.max(0, deadline - Date.now()));

    try {
      for await (const chunk of runAgent(
        req.userId!,
        conversationId,
        data.message,
        data.context_hint,
        data.image,
        { signal: controller.signal, deadline },
      )) {
        if (!canWrite()) {
          if (!controller.signal.aborted) controller.abort(new Error('Client disconnected'));
          // Drain the generator so already-started writes and paired tool history settle.
          continue;
        }
        if (chunk.type === 'text' && chunk.text) {
          sendEvent('text', { content: chunk.text });
        } else if (chunk.type === 'tool_call_start') {
          sendEvent('tool_start', { id: chunk.tool_call?.id, name: chunk.tool_call?.name });
        } else if (chunk.type === 'tool_call_end') {
          sendEvent('tool_end', { id: chunk.tool_call?.id, name: chunk.tool_call?.name, ok: !chunk.error });
        } else if (chunk.type === 'preference_form') {
          sendEvent('preference_form', { questions: chunk.data });
        } else if (chunk.type === 'turn_receipt') {
          sendEvent('turn_receipt', chunk.data);
        } else if (chunk.type === 'round_limit') {
          const message = chunk.error || 'Tool round limit reached. Send another message to continue.';
          sendEvent('round_limit', { message, details: chunk.data });
          // Existing clients display the error channel; the distinct event is also available.
          sendError(message, 'round_limit');
        } else if (chunk.type === 'done') {
          sendDone();
        } else if (chunk.type === 'error') {
          sendError(chunk.error || 'An unexpected error occurred. Please try again.');
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
      console.error('Agent SSE stream error:', err);
      sendError(message);
    } finally {
      clearTimeout(requestTimer);
      req.removeListener('aborted', abortDisconnected);
      req.removeListener('close', onRequestClose);
      res.removeListener('close', onResponseClose);
      closeResponse();
    }
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

export default router;
