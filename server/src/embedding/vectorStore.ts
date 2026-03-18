import { getDb } from '../db/init.js';
import type { SearchResult } from './types.js';

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
}

/**
 * Convert a number[] to a Buffer containing Float32Array data
 * (required by sqlite-vec for vector queries).
 */
function float32ArrayToBuffer(arr: number[]): Buffer {
  const float32 = new Float32Array(arr);
  return Buffer.from(float32.buffer);
}
