import { Router, type Response } from 'express';
import { z, ZodError } from 'zod';
import type { AgentMemoryRecord } from '@shared/types/agentMemories';
import { getDb } from '../db/init.js';
import { VectorStore } from '../embedding/vectorStore.js';
import type { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

// Mounted under /api/settings, behind the existing authMiddleware.
const router = Router();
const columns = 'id, category, content, source_conversation_id, created_at, last_accessed';
const updateMemorySchema = z.object({
  // Validate emptiness without trimming or otherwise rewriting the saved text.
  content: z.string().refine((value) => value.trim().length > 0, 'Content is required'),
}).strict();

function getMemory(userId: string, id: string): AgentMemoryRecord {
  const memory = getDb().prepare(
    `SELECT ${columns} FROM agent_memories WHERE user_id = ? AND id = ?`,
  ).get(userId, id) as AgentMemoryRecord | undefined;
  if (!memory) throw new AppError(404, 'Agent memory not found');
  return memory;
}

function discardMemoryEmbedding(id: string): void {
  // sqlite-vec is optional. Reuse its existing deletion helper when available;
  // discard any currently stored vector for the old content.
  if (getDb().prepare("SELECT 1 FROM sqlite_master WHERE name = 'agent_memory_vec'").get()) {
    new VectorStore().deleteMemoryEmbedding(id);
  }
}

router.get('/', (req: AuthRequest, res: Response) => {
  res.json(getDb().prepare(
    `SELECT ${columns} FROM agent_memories WHERE user_id = ? ORDER BY julianday(created_at) DESC, id ASC`,
  ).all(req.userId!));
});

router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const { content } = updateMemorySchema.parse(req.body);
    const memory = getDb().transaction(() => {
      const current = getMemory(req.userId!, String(req.params.id));
      if (current.content !== content) {
        getDb().prepare('UPDATE agent_memories SET content = ? WHERE user_id = ? AND id = ?')
          .run(content, req.userId!, current.id);
        discardMemoryEmbedding(current.id);
      }
      return { ...current, content };
    })();
    res.json(memory);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    throw error;
  }
});

router.delete('/:id', (req: AuthRequest, res: Response) => {
  getDb().transaction(() => {
    const memory = getMemory(req.userId!, String(req.params.id));
    discardMemoryEmbedding(memory.id);
    getDb().prepare('DELETE FROM agent_memories WHERE user_id = ? AND id = ?')
      .run(req.userId!, memory.id);
  })();
  res.status(204).end();
});

export default router;
