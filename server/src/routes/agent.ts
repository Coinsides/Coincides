import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { sendMessageSchema, createConversationSchema } from '../validators/index.js';
import { ZodError } from 'zod';
import { runAgent } from '../agent/orchestrator.js';

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
    'SELECT id, role, content, tool_calls, tool_results, created_at FROM agent_messages WHERE conversation_id = ? ORDER BY created_at ASC',
  ).all(req.params.id);
  res.json(messages);
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

    // 120s request-level timeout
    const REQUEST_TIMEOUT_MS = 120_000;
    const requestTimer = setTimeout(() => {
      res.write(`event: error\ndata: ${JSON.stringify({ message: 'Request timed out after 120s' })}\n\n`);
      res.write(`event: done\ndata: {}\n\n`);
      res.end();
    }, REQUEST_TIMEOUT_MS);

    const conversationId = req.params.id as string;
    try {
      for await (const chunk of runAgent(
        req.userId!,
        conversationId,
        data.message,
        data.context_hint,
        data.image,
      )) {
        if (res.writableEnded) break;
        if (chunk.type === 'text' && chunk.text) {
          res.write(`event: text\ndata: ${JSON.stringify({ content: chunk.text })}\n\n`);
        } else if (chunk.type === 'tool_call_start') {
          res.write(`event: tool_start\ndata: ${JSON.stringify({ name: chunk.tool_call?.name })}\n\n`);
        } else if (chunk.type === 'tool_call_end') {
          res.write(`event: tool_end\ndata: ${JSON.stringify({ name: chunk.tool_call?.name })}\n\n`);
        } else if (chunk.type === 'preference_form') {
          res.write(`event: preference_form\ndata: ${JSON.stringify({ questions: chunk.data })}\n\n`);
        } else if (chunk.type === 'done') {
          res.write(`event: done\ndata: {}\n\n`);
        } else if (chunk.type === 'error') {
          res.write(`event: error\ndata: ${JSON.stringify({ message: chunk.error })}\n\n`);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
      console.error('Agent SSE stream error:', err);
      if (!res.writableEnded) {
        res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
        res.write(`event: done\ndata: {}\n\n`);
      }
    }

    clearTimeout(requestTimer);
    // Always ensure stream ends with done event
    if (!res.writableEnded) {
      res.write(`event: done\ndata: {}\n\n`);
      res.end();
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
