/**
 * VectorStore — Search layer for document chunks and agent memories.
 * 
 * PostgreSQL version:
 * - Full-text search uses tsvector/tsquery (replaces SQLite FTS5)
 * - Vector (semantic) search is stubbed out pending pgvector setup
 *   (will be added as a migration when pgvector extension is available)
 */

import type { SearchResult } from './types.js';
import { queryAll, execute, query } from '../db/pool.js';

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
 * VectorStore provides search operations for document chunks and agent memories.
 */
export class VectorStore {

  // ─── Vector Embedding Storage (stubbed — pgvector pending) ──────

  /**
   * Insert or update embeddings for document chunks.
   * TODO: Implement with pgvector when extension is available.
   */
  async upsertChunkEmbeddings(chunks: Array<{ id: string; embedding: number[] }>): Promise<void> {
    // pgvector not yet set up — embeddings are not stored.
    // Full-text search (tsvector) is used as the primary search mechanism.
    console.debug(`[VectorStore] Skipping ${chunks.length} chunk embeddings (pgvector not configured)`);
  }

  /**
   * Insert or update embedding for an agent memory.
   * TODO: Implement with pgvector when extension is available.
   */
  async upsertMemoryEmbedding(memoryId: string, embedding: number[]): Promise<void> {
    console.debug(`[VectorStore] Skipping memory embedding for ${memoryId} (pgvector not configured)`);
  }

  /**
   * Delete embeddings for document chunks.
   */
  async deleteChunkEmbeddings(chunkIds: string[]): Promise<void> {
    // No-op until pgvector is set up
  }

  /**
   * Delete embedding for an agent memory.
   */
  async deleteMemoryEmbedding(memoryId: string): Promise<void> {
    // No-op until pgvector is set up
  }

  // ─── Vector Search (stubbed — falls back to FTS) ──────────────

  /**
   * KNN search for document chunks.
   * Currently returns empty — use ftsSearchChunks() instead.
   */
  async searchChunks(queryEmbedding: number[], topK: number, userId: string): Promise<SearchResult[]> {
    // TODO: Implement with pgvector
    return [];
  }

  /**
   * KNN search for document chunks with full content.
   * Currently delegates to full-text search.
   */
  async searchChunksWithContent(
    queryEmbedding: number[],
    topK: number,
    userId: string,
    maxDistance: number = 0.8,
  ): Promise<ChunkSearchResult[]> {
    // TODO: Implement with pgvector. For now, vector search is not available.
    return [];
  }

  /**
   * KNN search for agent memories.
   * Currently returns empty — use ftsSearchMemories() instead.
   */
  async searchMemories(queryEmbedding: number[], topK: number, userId: string): Promise<SearchResult[]> {
    // TODO: Implement with pgvector
    return [];
  }

  /**
   * KNN search for agent memories with full content.
   * Currently returns empty — use ftsSearchMemories() instead.
   */
  async searchMemoriesWithContent(
    queryEmbedding: number[],
    topK: number,
    userId: string,
    maxDistance: number = 0.8,
  ): Promise<MemorySearchResult[]> {
    // TODO: Implement with pgvector
    return [];
  }

  // ─── Full-Text Search (PostgreSQL tsvector/tsquery) ───────────

  /**
   * Full-text search on document chunks using PostgreSQL tsvector.
   * Replaces SQLite FTS5.
   */
  async ftsSearchChunks(
    searchQuery: string,
    topK: number,
    userId: string,
  ): Promise<ChunkSearchResult[]> {
    // Sanitize query: remove special chars, build tsquery
    const safeQuery = searchQuery
      .replace(/[^\w\s\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(w => w.length > 1)
      .join(' & ');  // AND all terms

    if (!safeQuery) return [];

    const results: ChunkSearchResult[] = [];

    // Search chunked documents via tsvector
    try {
      const rows = await queryAll(
        `SELECT dc.id AS chunk_id, dc.content, dc.document_id, dc.chunk_index,
                ts_rank(to_tsvector('english', dc.content), to_tsquery('english', $1)) AS rank
         FROM document_chunks dc
         JOIN documents d ON dc.document_id = d.id
         WHERE d.user_id = $2
           AND to_tsvector('english', dc.content) @@ to_tsquery('english', $1)
         ORDER BY rank DESC
         LIMIT $3`,
        [safeQuery, userId, topK]
      );

      for (const r of rows) {
        results.push({
          chunk_id: r.chunk_id,
          content: r.content,
          document_id: r.document_id,
          chunk_index: r.chunk_index,
          distance: Math.max(0, 1 - (r.rank || 0)),  // Convert rank to distance-like score
        });
      }
    } catch (err) {
      console.warn('Full-text chunk search failed:', err);
    }

    // Also search un-chunked documents (extracted_text in documents table)
    try {
      const queryWords = searchQuery.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      if (queryWords.length === 0) return results;

      const unchunked = await queryAll(
        `SELECT d.id AS chunk_id, d.extracted_text AS content, d.id AS document_id, 0 AS chunk_index
         FROM documents d
         WHERE d.user_id = $1 AND d.parse_status = 'completed'
         AND (d.chunk_count = 0 OR d.chunk_count IS NULL)
         AND d.extracted_text IS NOT NULL
         AND d.extracted_text ILIKE $2
         ORDER BY d.created_at DESC
         LIMIT $3`,
        [userId, `%${queryWords[0]}%`, topK]
      );

      for (const row of unchunked) {
        const textLower = (row.content || '').toLowerCase();
        const matchCount = queryWords.filter(w => textLower.includes(w)).length;
        if (matchCount > 0 && !results.some(r => r.document_id === row.document_id)) {
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
   * Full-text search on agent memories using PostgreSQL tsvector.
   * Replaces SQLite FTS5.
   */
  async ftsSearchMemories(
    searchQuery: string,
    topK: number,
    userId: string,
  ): Promise<MemorySearchResult[]> {
    const safeQuery = searchQuery
      .replace(/[^\w\s\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(w => w.length > 1)
      .join(' & ');

    if (!safeQuery) return [];

    try {
      const rows = await queryAll(
        `SELECT m.id AS memory_id, m.content, m.category, m.created_at,
                ts_rank(to_tsvector('english', m.content), to_tsquery('english', $1)) AS rank
         FROM agent_memories m
         WHERE m.user_id = $2
           AND to_tsvector('english', m.content) @@ to_tsquery('english', $1)
         ORDER BY rank DESC
         LIMIT $3`,
        [safeQuery, userId, topK]
      );

      return rows.map(r => ({
        memory_id: r.memory_id,
        content: r.content,
        category: r.category,
        distance: Math.max(0, 1 - (r.rank || 0)),
        created_at: r.created_at,
      }));
    } catch (err) {
      console.warn('Full-text memory search failed:', err);
      return [];
    }
  }
}
