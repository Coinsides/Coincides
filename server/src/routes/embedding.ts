import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { getEmbeddingProvider } from '../embedding/index.js';
import { VectorStore } from '../embedding/vectorStore.js';
import { queryOne, queryAll } from '../db/pool.js';

const router = Router();

/**
 * GET /api/embedding/status
 * Returns embedding statistics for the current user.
 */
router.get('/status', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;

  // Total chunks for user's documents
  const totalChunks = await queryOne(
    `SELECT COUNT(*) AS count FROM document_chunks dc
     JOIN documents d ON dc.document_id = d.id
     WHERE d.user_id = $1`,
    [userId]
  );

  // Un-chunked documents (chunk_count = 0 but have extracted_text)
  const unchunkedDocs = await queryOne(
    `SELECT COUNT(*) AS count FROM documents
     WHERE user_id = $1 AND parse_status = 'completed'
     AND (chunk_count = 0 OR chunk_count IS NULL) AND extracted_text IS NOT NULL`,
    [userId]
  );

  // Total memories
  const totalMemories = await queryOne(
    'SELECT COUNT(*) AS count FROM agent_memories WHERE user_id = $1',
    [userId]
  );

  const totalEmbeddable = (totalChunks?.count || 0) + (unchunkedDocs?.count || 0);
  const provider = await getEmbeddingProvider(userId);

  res.json({
    configured: !!provider,
    provider_name: provider?.name || null,
    chunks: {
      total: Number(totalEmbeddable),
      embedded: 0,  // pgvector not yet configured
    },
    memories: {
      total: Number(totalMemories?.count || 0),
      embedded: 0,  // pgvector not yet configured
    },
    pgvector_pending: true,  // Flag for frontend to show "vector search coming soon"
  });
});

/**
 * POST /api/embedding/backfill
 * Generate embeddings for all un-embedded chunks and memories.
 * Currently a no-op until pgvector is configured.
 */
router.post('/backfill', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const provider = await getEmbeddingProvider(userId);

  if (!provider) {
    res.status(400).json({ error: 'No embedding provider configured' });
    return;
  }

  // pgvector not yet set up — can't store embeddings
  res.json({
    success: true,
    chunks_processed: 0,
    memories_processed: 0,
    message: 'Embedding storage (pgvector) not yet configured. Full-text search is active.',
  });
});

export default router;
