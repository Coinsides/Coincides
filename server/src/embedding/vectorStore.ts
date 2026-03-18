import { getDb } from '../db/init.js';
import type { SearchResult } from './types.js';

export interface ChunkSearchResult {
  chunk_id: string;
  content: string;
  document_id: string;
  chunk_index: number;
  distance: number;
}

export interface MemorySearchResult {
  memory_id: string;
  content: string;
  category: string;
  distance: number;
  created_at: string;
}

/**
 * VectorStore wraps sqlite-vec operations for document chunks and agent memories.
 */
export class VectorStore {
  /**
   * Insert or update embeddings for document chunks.
   */
  upsertChunkEmbeddings(chunks: Array<{ id: string; embedding: number[] }>): void {
    const db = getDb();
    const del = db.prepare('DELETE FROM doc_chunk_vec WHERE chunk_id = ?');
    const insert = db.prepare('INSERT INTO doc_chunk_vec (chunk_id, embedding) VALUES (?, ?)');

    const upsertMany = db.transaction((items: typeof chunks) => {
      for (const chunk of items) {
        const vecBuf = float32ArrayToBuffer(chunk.embedding);
        del.run(chunk.id);
        insert.run(chunk.id, vecBuf);
      }
    });

    upsertMany(chunks);
  }

  /**
   * Insert or update embedding for an agent memory.
   */
  upsertMemoryEmbedding(memoryId: string, embedding: number[]): void {
    const db = getDb();
    const vecBuf = float32ArrayToBuffer(embedding);
    db.prepare('DELETE FROM agent_memory_vec WHERE memory_id = ?').run(memoryId);
    db.prepare('INSERT INTO agent_memory_vec (memory_id, embedding) VALUES (?, ?)').run(memoryId, vecBuf);
  }

  /**
   * Delete embeddings for document chunks.
   */
  deleteChunkEmbeddings(chunkIds: string[]): void {
    const db = getDb();
    const del = db.prepare('DELETE FROM doc_chunk_vec WHERE chunk_id = ?');
    const deleteMany = db.transaction((ids: string[]) => {
      for (const id of ids) {
        del.run(id);
      }
    });
    deleteMany(chunkIds);
  }

  /**
   * Delete embedding for an agent memory.
   */
  deleteMemoryEmbedding(memoryId: string): void {
    const db = getDb();
    db.prepare('DELETE FROM agent_memory_vec WHERE memory_id = ?').run(memoryId);
  }

  /**
   * KNN search for document chunks, filtered by user ownership.
   */
  searchChunks(queryEmbedding: number[], topK: number, userId: string): SearchResult[] {
    const db = getDb();
    const vecBuf = float32ArrayToBuffer(queryEmbedding);

    // KNN search via sqlite-vec, then join to verify user ownership
    const rows = db
      .prepare(
        `SELECT v.chunk_id AS id, v.distance
         FROM doc_chunk_vec v
         WHERE v.embedding MATCH ? AND k = ?
         ORDER BY v.distance`
      )
      .all(vecBuf, topK * 3) as Array<{ id: string; distance: number }>;

    // Filter by user ownership
    if (rows.length === 0) return [];

    const placeholders = rows.map(() => '?').join(',');
    const owned = db
      .prepare(
        `SELECT dc.id FROM document_chunks dc
         JOIN documents d ON dc.document_id = d.id
         WHERE d.user_id = ? AND dc.id IN (${placeholders})`
      )
      .all(userId, ...rows.map((r) => r.id)) as Array<{ id: string }>;

    const ownedSet = new Set(owned.map((r) => r.id));
    return rows.filter((r) => ownedSet.has(r.id)).slice(0, topK);
  }

  /**
   * KNN search for document chunks with full content and document info.
   * Returns chunk content alongside distance scores in a single round-trip.
   */
  searchChunksWithContent(
    queryEmbedding: number[],
    topK: number,
    userId: string,
    maxDistance: number = 0.8,
  ): ChunkSearchResult[] {
    const db = getDb();
    const vecBuf = float32ArrayToBuffer(queryEmbedding);

    // KNN search — fetch extra to account for ownership filter + distance threshold
    const rows = db
      .prepare(
        `SELECT v.chunk_id AS id, v.distance
         FROM doc_chunk_vec v
         WHERE v.embedding MATCH ? AND k = ?
         ORDER BY v.distance`
      )
      .all(vecBuf, topK * 5) as Array<{ id: string; distance: number }>;

    if (rows.length === 0) return [];

    // Filter by distance threshold
    const withinThreshold = rows.filter((r) => r.distance < maxDistance);
    if (withinThreshold.length === 0) return [];

    // Look up chunk content + document info, filtered by ownership
    const placeholders = withinThreshold.map(() => '?').join(',');
    const chunkDetails = db
      .prepare(
        `SELECT dc.id AS chunk_id, dc.content, dc.document_id, dc.chunk_index, d.user_id
         FROM document_chunks dc
         JOIN documents d ON dc.document_id = d.id
         WHERE d.user_id = ? AND dc.id IN (${placeholders})`
      )
      .all(userId, ...withinThreshold.map((r) => r.id)) as Array<{
        chunk_id: string; content: string; document_id: string; chunk_index: number;
      }>;

    // Also check un-chunked documents (stored with doc id as chunk_id)
    const unchunkedDetails = db
      .prepare(
        `SELECT d.id AS chunk_id, d.extracted_text AS content, d.id AS document_id, 0 AS chunk_index
         FROM documents d
         WHERE d.user_id = ? AND d.id IN (${placeholders})
         AND (d.chunk_count = 0 OR d.chunk_count IS NULL)`
      )
      .all(userId, ...withinThreshold.map((r) => r.id)) as Array<{
        chunk_id: string; content: string; document_id: string; chunk_index: number;
      }>;

    const allDetails = [...chunkDetails, ...unchunkedDetails];
    const detailMap = new Map(allDetails.map((d) => [d.chunk_id, d]));

    // Build distance map
    const distMap = new Map(withinThreshold.map((r) => [r.id, r.distance]));

    return withinThreshold
      .filter((r) => detailMap.has(r.id))
      .slice(0, topK)
      .map((r) => {
        const detail = detailMap.get(r.id)!;
        return {
          chunk_id: detail.chunk_id,
          content: detail.content,
          document_id: detail.document_id,
          chunk_index: detail.chunk_index,
          distance: distMap.get(r.id) || r.distance,
        };
      });
  }

  /**
   * KNN search for agent memories, filtered by user ownership.
   */
  searchMemories(queryEmbedding: number[], topK: number, userId: string): SearchResult[] {
    const db = getDb();
    const vecBuf = float32ArrayToBuffer(queryEmbedding);

    const rows = db
      .prepare(
        `SELECT v.memory_id AS id, v.distance
         FROM agent_memory_vec v
         WHERE v.embedding MATCH ? AND k = ?
         ORDER BY v.distance`
      )
      .all(vecBuf, topK * 3) as Array<{ id: string; distance: number }>;

    if (rows.length === 0) return [];

    const placeholders = rows.map(() => '?').join(',');
    const owned = db
      .prepare(
        `SELECT id FROM agent_memories
         WHERE user_id = ? AND id IN (${placeholders})`
      )
      .all(userId, ...rows.map((r) => r.id)) as Array<{ id: string }>;

    const ownedSet = new Set(owned.map((r) => r.id));
    return rows.filter((r) => ownedSet.has(r.id)).slice(0, topK);
  }

  /**
   * KNN search for agent memories with full content.
   */
  searchMemoriesWithContent(
    queryEmbedding: number[],
    topK: number,
    userId: string,
    maxDistance: number = 0.8,
  ): MemorySearchResult[] {
    const db = getDb();
    const vecBuf = float32ArrayToBuffer(queryEmbedding);

    const rows = db
      .prepare(
        `SELECT v.memory_id AS id, v.distance
         FROM agent_memory_vec v
         WHERE v.embedding MATCH ? AND k = ?
         ORDER BY v.distance`
      )
      .all(vecBuf, topK * 5) as Array<{ id: string; distance: number }>;

    if (rows.length === 0) return [];

    const withinThreshold = rows.filter((r) => r.distance < maxDistance);
    if (withinThreshold.length === 0) return [];

    const placeholders = withinThreshold.map(() => '?').join(',');
    const memoryDetails = db
      .prepare(
        `SELECT id AS memory_id, content, category, created_at
         FROM agent_memories
         WHERE user_id = ? AND id IN (${placeholders})`
      )
      .all(userId, ...withinThreshold.map((r) => r.id)) as Array<{
        memory_id: string; content: string; category: string; created_at: string;
      }>;

    const detailMap = new Map(memoryDetails.map((m) => [m.memory_id, m]));
    const distMap = new Map(withinThreshold.map((r) => [r.id, r.distance]));

    return withinThreshold
      .filter((r) => detailMap.has(r.id))
      .slice(0, topK)
      .map((r) => {
        const detail = detailMap.get(r.id)!;
        return {
          memory_id: detail.memory_id,
          content: detail.content,
          category: detail.category,
          distance: distMap.get(r.id) || r.distance,
          created_at: detail.created_at,
        };
      });
  }

  // ─── FTS5 Full-Text Search Methods ───────────────────────────

  /**
   * FTS5 full-text search on document chunks, filtered by user ownership.
   * Returns chunks with BM25 rank and content.
   */
  ftsSearchChunks(
    query: string,
    topK: number,
    userId: string,
  ): ChunkSearchResult[] {
    const db = getDb();

    // Sanitize query for FTS5 (escape double quotes, strip special chars)
    const safeQuery = query.replace(/["']/g, ' ').replace(/[^\w\s\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/g, ' ').trim();
    if (!safeQuery) return [];

    const results: ChunkSearchResult[] = [];

    // Search chunked documents via FTS5
    try {
      const rows = db
        .prepare(
          `SELECT dc.id AS chunk_id, dc.content, dc.document_id, dc.chunk_index,
                  rank AS bm25_rank
           FROM document_chunks_fts fts
           JOIN document_chunks dc ON dc.rowid = fts.rowid
           JOIN documents d ON dc.document_id = d.id
           WHERE document_chunks_fts MATCH ? AND d.user_id = ?
           ORDER BY rank
           LIMIT ?`
        )
        .all(safeQuery, userId, topK) as Array<{
          chunk_id: string; content: string; document_id: string;
          chunk_index: number; bm25_rank: number;
        }>;

      for (const r of rows) {
        results.push({
          chunk_id: r.chunk_id,
          content: r.content,
          document_id: r.document_id,
          chunk_index: r.chunk_index,
          distance: Math.max(0, Math.min(1, 1 + r.bm25_rank / 10)),
        });
      }
    } catch (err) {
      console.warn('FTS5 chunk search failed:', err);
    }

    // Also search un-chunked documents (extracted_text stored directly in documents table)
    try {
      const unchunked = db
        .prepare(
          `SELECT d.id AS chunk_id, d.extracted_text AS content, d.id AS document_id, 0 AS chunk_index
           FROM documents d
           WHERE d.user_id = ? AND d.parse_status = 'completed'
           AND (d.chunk_count = 0 OR d.chunk_count IS NULL)
           AND d.extracted_text IS NOT NULL
           AND d.extracted_text LIKE ?
           ORDER BY d.created_at DESC
           LIMIT ?`
        )
        .all(userId, `%${safeQuery.split(/\s+/)[0]}%`, topK) as Array<{
          chunk_id: string; content: string; document_id: string; chunk_index: number;
        }>;

      // Filter: at least one query word must appear in extracted_text
      const queryWords = safeQuery.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
      for (const row of unchunked) {
        const textLower = (row.content || '').toLowerCase();
        const matchCount = queryWords.filter((w) => textLower.includes(w)).length;
        if (matchCount > 0 && !results.some((r) => r.document_id === row.document_id)) {
          results.push({
            ...row,
            distance: Math.max(0.1, 1 - matchCount / queryWords.length),
          });
        }
      }
    } catch (err) {
      console.warn('Un-chunked document text search failed:', err);
    }

    return results.slice(0, topK);
  }

  /**
   * FTS5 full-text search on agent memories, filtered by user ownership.
   */
  ftsSearchMemories(
    query: string,
    topK: number,
    userId: string,
  ): MemorySearchResult[] {
    const db = getDb();

    const safeQuery = query.replace(/["']/g, ' ').replace(/[^\w\s\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/g, ' ').trim();
    if (!safeQuery) return [];

    try {
      const rows = db
        .prepare(
          `SELECT m.id AS memory_id, m.content, m.category, m.created_at,
                  rank AS bm25_rank
           FROM agent_memories_fts fts
           JOIN agent_memories m ON m.rowid = fts.rowid
           WHERE agent_memories_fts MATCH ? AND m.user_id = ?
           ORDER BY rank
           LIMIT ?`
        )
        .all(safeQuery, userId, topK) as Array<{
          memory_id: string; content: string; category: string;
          created_at: string; bm25_rank: number;
        }>;

      return rows.map((r) => ({
        memory_id: r.memory_id,
        content: r.content,
        category: r.category,
        distance: Math.max(0, Math.min(1, 1 + r.bm25_rank / 10)),
        created_at: r.created_at,
      }));
    } catch (err) {
      console.warn('FTS5 memory search failed:', err);
      return [];
    }
  }
}

/**
 * Convert a number[] to a Buffer containing Float32Array data
 * (required by sqlite-vec for vector queries).
 */
function float32ArrayToBuffer(arr: number[]): Buffer {
  const float32 = new Float32Array(arr);
  return Buffer.from(float32.buffer);
}
