import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../db/init.js';
import { getEmbeddingProvider } from '../../embedding/index.js';
import { VectorStore } from '../../embedding/vectorStore.js';
import { searchEpisodes } from './episodes.js';
import type { AgentEpisodeRecord } from '../../../../shared/types/agentEpisodes.js';

export interface MemoryMatch {
  kind: 'memory' | 'episode';
  id: string;
  category: string;
  content: string;
  created_at: string;
  similarity_score?: number;
  conversation_id?: string;
  message_range?: AgentEpisodeRecord['message_range'];
  anchor_manifest?: AgentEpisodeRecord['anchor_manifest'];
}

/** The single retrieval path for prompt context and search_memories. */
export async function searchMemories(
  userId: string,
  query: string,
  { limit = 10, category, includeEpisodes = true }: { limit?: number; category?: string; includeEpisodes?: boolean } = {},
): Promise<MemoryMatch[]> {
  const db = getDb();
  const store = new VectorStore();

  // Preserve the tool's three candidate lanes and semantic > FTS5 > LIKE order.
  let keywordSql = 'SELECT id, category, content, created_at FROM agent_memories WHERE user_id = ? AND content LIKE ?';
  const keywordParams: unknown[] = [userId, `%${query}%`];
  if (category) { keywordSql += ' AND category = ?'; keywordParams.push(category); }
  keywordSql += ' ORDER BY relevance_score DESC, created_at DESC LIMIT ?';
  keywordParams.push(limit);
  const keywordMemories = db.prepare(keywordSql).all(...keywordParams) as MemoryMatch[];
  const ftsResults = store.ftsSearchMemories(query, limit, userId);

  let semanticMapped: MemoryMatch[] = [];
  try {
    const provider = query.trim() ? getEmbeddingProvider(userId) : null;
    if (provider) {
      const queryEmbeddings = await provider.embed([query], 'query');
      if (queryEmbeddings.length > 0) {
        semanticMapped = store.searchMemoriesWithContent(queryEmbeddings[0], limit, userId).map((row) => ({
          kind: 'memory',
          id: row.memory_id,
          category: row.category,
          content: row.content,
          created_at: row.created_at,
          similarity_score: Math.round((1 - row.distance) * 100) / 100,
        }));
      }
    }
  } catch (err) {
    console.warn('Semantic memory search failed:', err);
  }

  const results: MemoryMatch[] = [];
  const seenIds = new Set<string>();
  const candidates = [
    ...semanticMapped,
    ...ftsResults.map((row) => ({ id: row.memory_id, category: row.category, content: row.content, created_at: row.created_at })),
    ...keywordMemories,
  ];
  for (const memory of candidates) {
    if (category && memory.category !== category) continue;
    if (!seenIds.has(memory.id)) {
      seenIds.add(memory.id);
      results.push({ ...memory, kind: 'memory' });
    }
  }

  if (includeEpisodes && !category) {
    for (const episode of searchEpisodes(userId, query, limit)) {
      results.push({ kind: 'episode', id: episode.id, category: 'episode', content: episode.summary_text,
        created_at: episode.created_at, conversation_id: episode.conversation_id,
        message_range: episode.message_range, anchor_manifest: episode.anchor_manifest });
    }
  }
  const selected = results.slice(0, limit);
  const selectedMemories = selected.filter(memory => memory.kind === 'memory');
  if (selectedMemories.length > 0) {
    const placeholders = selectedMemories.map(() => '?').join(',');
    db.prepare(`UPDATE agent_memories SET last_accessed = ? WHERE user_id = ? AND id IN (${placeholders})`)
      .run(new Date().toISOString(), userId, ...selectedMemories.map((memory) => memory.id));
  }
  return selected;
}

/** Keep writes synchronous; failures in the optional background embedding are visible. */
export function generateMemoryEmbedding(userId: string, memoryId: string, content: string): void {
  void (async () => {
    try {
      const provider = getEmbeddingProvider(userId);
      if (!provider) return;
      const embeddings = await provider.embed([content], 'document');
      if (!embeddings[0]?.length) throw new Error('Memory embedding provider returned no vector');
      new VectorStore().upsertMemoryEmbedding(memoryId, embeddings[0]);
    } catch (err) {
      console.warn('Failed to generate memory embedding:', err);
    }
  })();
}

// Conservative near-duplicate rule: case, whitespace and final sentence marks only.
// FTS is candidate retrieval, never sufficient evidence to merge different facts.
function duplicateKey(content: string): string {
  return content.toLowerCase().replace(/\s+/g, ' ').trim().replace(/[.!?。！？]+$/u, '').trim();
}

export function saveMemory(userId: string, category: string, content: string): string {
  const db = getDb();
  // No await between duplicate lookup and insertion, including simultaneous tool calls.
  const exact = db.prepare('SELECT id FROM agent_memories WHERE user_id = ? AND content = ? ORDER BY rowid LIMIT 1')
    .get(userId, content) as { id: string } | undefined;
  if (exact) return exact.id;

  const key = duplicateKey(content);
  const near = key ? new VectorStore().ftsSearchMemories(content, 10, userId)
    .find((memory) => duplicateKey(memory.content) === key) : undefined;
  if (near) return near.memory_id;

  const id = uuidv4();
  db.prepare('INSERT INTO agent_memories (id, user_id, category, content, relevance_score, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, userId, category, content, 1.0, new Date().toISOString());
  generateMemoryEmbedding(userId, id, content);
  return id;
}
