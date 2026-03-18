import { Router, Response } from 'express';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import { getEmbeddingProvider } from '../embedding/index.js';
import { VectorStore } from '../embedding/vectorStore.js';

const router = Router();

/**
 * GET /api/embedding/status
 * Returns embedding statistics for the current user.
 */
router.get('/status', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const userId = req.userId!;

  // Total chunks for user's documents
  const totalChunks = db
    .prepare(
      `SELECT COUNT(*) AS count FROM document_chunks dc
       JOIN documents d ON dc.document_id = d.id
       WHERE d.user_id = ?`
    )
    .get(userId) as { count: number };

  // Un-chunked documents (chunk_count = 0 but have extracted_text)
  const unchunkedDocs = db
    .prepare(
      `SELECT COUNT(*) AS count FROM documents
       WHERE user_id = ? AND parse_status = 'completed' AND (chunk_count = 0 OR chunk_count IS NULL) AND extracted_text IS NOT NULL`
    )
    .get(userId) as { count: number };

  // Embedded chunks
  const embeddedChunks = db
    .prepare(
      `SELECT COUNT(*) AS count FROM doc_chunk_vec v
       JOIN document_chunks dc ON v.chunk_id = dc.id
       JOIN documents d ON dc.document_id = d.id
       WHERE d.user_id = ?`
    )
    .get(userId) as { count: number };

  // Embedded un-chunked docs (stored with document id as chunk_id)
  const embeddedUnchunked = db
    .prepare(
      `SELECT COUNT(*) AS count FROM doc_chunk_vec v
       JOIN documents d ON v.chunk_id = d.id
       WHERE d.user_id = ? AND (d.chunk_count = 0 OR d.chunk_count IS NULL)`
    )
    .get(userId) as { count: number };

  // Total memories
  const totalMemories = db
    .prepare('SELECT COUNT(*) AS count FROM agent_memories WHERE user_id = ?')
    .get(userId) as { count: number };

  // Embedded memories
  const embeddedMemories = db
    .prepare(
      `SELECT COUNT(*) AS count FROM agent_memory_vec v
       JOIN agent_memories m ON v.memory_id = m.id
       WHERE m.user_id = ?`
    )
    .get(userId) as { count: number };

  const totalEmbeddable = totalChunks.count + unchunkedDocs.count;
  const totalEmbedded = embeddedChunks.count + embeddedUnchunked.count;

  const provider = getEmbeddingProvider(userId);

  res.json({
    configured: !!provider,
    provider_name: provider?.name || null,
    chunks: {
      total: totalEmbeddable,
      embedded: totalEmbedded,
    },
    memories: {
      total: totalMemories.count,
      embedded: embeddedMemories.count,
    },
  });
});

/**
 * POST /api/embedding/backfill
 * Generate embeddings for all un-embedded chunks and memories.
 */
router.post('/backfill', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const provider = getEmbeddingProvider(userId);

  if (!provider) {
    res.status(400).json({ error: 'No embedding provider configured' });
    return;
  }

  const db = getDb();
  const store = new VectorStore();
  let chunksProcessed = 0;
  let memoriesProcessed = 0;

  try {
    // Backfill document chunks
    const unembeddedChunks = db
      .prepare(
        `SELECT dc.id, dc.content FROM document_chunks dc
         JOIN documents d ON dc.document_id = d.id
         WHERE d.user_id = ? AND dc.id NOT IN (SELECT chunk_id FROM doc_chunk_vec)`
      )
      .all(userId) as Array<{ id: string; content: string }>;

    // Backfill un-chunked documents
    const unembeddedDocs = db
      .prepare(
        `SELECT d.id, d.extracted_text AS content FROM documents d
         WHERE d.user_id = ? AND d.parse_status = 'completed'
         AND (d.chunk_count = 0 OR d.chunk_count IS NULL)
         AND d.extracted_text IS NOT NULL
         AND d.id NOT IN (SELECT chunk_id FROM doc_chunk_vec)`
      )
      .all(userId) as Array<{ id: string; content: string }>;

    const allChunkItems = [...unembeddedChunks, ...unembeddedDocs];

    // Process in batches
    const batchSize = provider.maxBatchSize;
    for (let i = 0; i < allChunkItems.length; i += batchSize) {
      const batch = allChunkItems.slice(i, i + batchSize);
      const texts = batch.map((c) => c.content);
      const embeddings = await provider.embed(texts, 'document');

      const items = batch.map((chunk, idx) => ({
        id: chunk.id,
        embedding: embeddings[idx],
      }));
      store.upsertChunkEmbeddings(items);
      chunksProcessed += items.length;
    }

    // Backfill agent memories
    const unembeddedMemories = db
      .prepare(
        `SELECT id, content FROM agent_memories
         WHERE user_id = ? AND id NOT IN (SELECT memory_id FROM agent_memory_vec)`
      )
      .all(userId) as Array<{ id: string; content: string }>;

    for (let i = 0; i < unembeddedMemories.length; i += batchSize) {
      const batch = unembeddedMemories.slice(i, i + batchSize);
      const texts = batch.map((m) => m.content);
      const embeddings = await provider.embed(texts, 'document');

      for (let j = 0; j < batch.length; j++) {
        store.upsertMemoryEmbedding(batch[j].id, embeddings[j]);
      }
      memoriesProcessed += batch.length;
    }

    res.json({
      success: true,
      chunks_processed: chunksProcessed,
      memories_processed: memoriesProcessed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: `Backfill failed: ${message}` });
  }
});

export default router;
