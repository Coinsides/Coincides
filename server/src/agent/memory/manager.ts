import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../db/init.js';
import type { ProviderMessage } from '../providers/types.js';
import { generateMemoryEmbedding, searchMemories, type MemoryMatch } from './service.js';

interface DbMessage {
  id: string;
  role: string;
  content: string;
  tool_calls: string | null;
  tool_results: string | null;
  created_at: string;
}

export function sanitizeConversationHistory(rows: readonly DbMessage[]): ProviderMessage[] {
    const messages: ProviderMessage[] = rows.map((row) => {
      const msg: ProviderMessage = {
        role: row.role as 'user' | 'assistant' | 'system',
        content: row.content,
      };
      if (row.tool_calls) {
        try { msg.tool_calls = JSON.parse(row.tool_calls); } catch { /* ignore */ }
      }
      if (row.tool_results) {
        try { msg.tool_results = JSON.parse(row.tool_results); } catch { /* ignore */ }
      }
      return msg;
    });

    // Sanitize: Anthropic API requires every tool_use block to have a matching
    // tool_result in the immediately following user message. Process pairs together
    // to guarantee both sides survive or neither does.
    const sanitized: ProviderMessage[] = [];
    let i = 0;
    while (i < messages.length) {
      const msg = messages[i];

      // Case 1: assistant message with tool_calls — must pair with next tool_results
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        const next = messages[i + 1];
        if (next?.tool_results && next.tool_results.length > 0) {
          // Filter tool_results to only include IDs present in tool_calls
          const validIds = new Set(msg.tool_calls.map(tc => tc.id));
          const filtered = next.tool_results.filter(tr => validIds.has(tr.tool_call_id));

          if (filtered.length === msg.tool_calls.length) {
            // Perfect match — keep both as-is
            sanitized.push(msg);
            sanitized.push({ ...next, tool_results: filtered });
          } else if (filtered.length > 0) {
            // Partial match — only keep the tool_calls that have results
            const resultIds = new Set(filtered.map(tr => tr.tool_call_id));
            const matchedCalls = msg.tool_calls.filter(tc => resultIds.has(tc.id));
            sanitized.push({ ...msg, tool_calls: matchedCalls });
            sanitized.push({ ...next, tool_results: filtered });
          }
          // else: no matching IDs at all — drop both messages
          i += 2; // skip the pair
          continue;
        }
        // No following tool_results — drop this orphaned tool_use
        i++;
        continue;
      }

      // Case 2: user message with tool_results but no preceding tool_calls
      // (shouldn't happen after Case 1, but guard against DB corruption)
      if (msg.tool_results && msg.tool_results.length > 0) {
        // Orphaned tool_results — drop
        i++;
        continue;
      }

      // Case 3: normal message (text only)
      sanitized.push(msg);
      i++;
    }

    return sanitized;
}

export class MemoryManager {
  constructor(private userId: string) {}

  getConversationHistory(conversationId: string, limit: number = 50): ProviderMessage[] {
    const db = getDb();
    const rows = db.prepare(
      'SELECT role, content, tool_calls, tool_results FROM agent_messages WHERE conversation_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?',
    ).all(conversationId, limit) as DbMessage[];
    // rowid breaks same-millisecond ties so tool_use/result pairs survive reversal.
    return sanitizeConversationHistory(rows.reverse());
  }

  saveMessage(
    conversationId: string,
    role: string,
    content: string,
    toolCalls?: string | null,
    toolResults?: string | null,
    turnId?: string | null,
    meta?: import('../../../../shared/types/agentIntent.js').AgentMessageMeta,
  ): string {
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO agent_messages (id, conversation_id, role, content, tool_calls, tool_results, created_at, turn_id, meta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(id, conversationId, role, content, toolCalls || null, toolResults || null, now, turnId ?? null, JSON.stringify(meta ?? {}));

    // Update conversation updated_at
    db.prepare('UPDATE agent_conversations SET updated_at = ? WHERE id = ?').run(now, conversationId);
    return id;
  }

  retrieveMemories(query: string, limit: number = 5): Promise<MemoryMatch[]> {
    // Episode recall is explicit via search_memories, not an unbounded resident lane.
    return searchMemories(this.userId, query, { limit, includeEpisodes: false });
  }

  extractMemories(conversationId: string, userMessage: string): void {
    // Simple pattern matching for memory extraction from user messages
    const patterns = [
      /I prefer\s+(.+?)(?:\.|$)/i,
      /My exam is\s+(.+?)(?:\.|$)/i,
      /I like\s+(.+?)(?:\.|$)/i,
      /Remember that\s+(.+?)(?:\.|$)/i,
      /I always\s+(.+?)(?:\.|$)/i,
      /I usually\s+(.+?)(?:\.|$)/i,
      /I'm studying\s+(.+?)(?:\.|$)/i,
      /My goal is\s+(.+?)(?:\.|$)/i,
      /I need to\s+(.+?)(?:by|before)\s+(.+?)(?:\.|$)/i,
    ];

    const db = getDb();
    const now = new Date().toISOString();

    for (const pattern of patterns) {
      const match = userMessage.match(pattern);
      if (match) {
        const content = match[0].trim();
        // Check for duplicate
        const existing = db.prepare(
          'SELECT id FROM agent_memories WHERE user_id = ? AND content = ?',
        ).get(this.userId, content);
        if (!existing) {
          const id = uuidv4();
          const category = this.categorizeMemory(content);
          db.prepare(
            'INSERT INTO agent_memories (id, user_id, category, content, source_conversation_id, relevance_score, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          ).run(id, this.userId, category, content, conversationId, 1.0, now);
          generateMemoryEmbedding(this.userId, id, content);
        }
      }
    }
  }

  private categorizeMemory(content: string): string {
    const lower = content.toLowerCase();
    if (lower.includes('prefer') || lower.includes('like') || lower.includes('always') || lower.includes('usually')) {
      return 'preference';
    }
    if (lower.includes('exam') || lower.includes('studying') || lower.includes('course') || lower.includes('class')) {
      return 'course_context';
    }
    if (lower.includes('decided') || lower.includes('going to') || lower.includes('will')) {
      return 'decision';
    }
    return 'general';
  }

  getDocumentSummaries(courseId?: string): { id: string; filename: string; summary: string }[] {
    const db = getDb();
    let query = 'SELECT id, filename, summary FROM documents WHERE user_id = ? AND summary IS NOT NULL';
    const params: unknown[] = [this.userId];
    if (courseId) {
      query += ' AND course_id = ?';
      params.push(courseId);
    }
    query += ' ORDER BY created_at DESC LIMIT 10';
    return db.prepare(query).all(...params) as { id: string; filename: string; summary: string }[];
  }

}
