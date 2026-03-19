import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../db/init.js';
import type { ProviderMessage } from '../providers/types.js';

interface AgentMemory {
  id: string;
  category: string;
  content: string;
  created_at: string;
  last_accessed: string | null;
}

interface DbMessage {
  id: string;
  role: string;
  content: string;
  tool_calls: string | null;
  tool_results: string | null;
  created_at: string;
}

export class MemoryManager {
  constructor(private userId: string) {}

  getConversationHistory(conversationId: string, limit: number = 50): ProviderMessage[] {
    const db = getDb();
    const rows = db.prepare(
      'SELECT role, content, tool_calls, tool_results FROM agent_messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?',
    ).all(conversationId, limit) as DbMessage[];

    // Reverse to get chronological order
    rows.reverse();

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

    // Sanitize: ensure every tool_use has a matching tool_result and vice versa.
    // If the first message is a tool_result without a preceding tool_use, drop it.
    // If the last message is a tool_use without a following tool_result, drop it.
    const sanitized: ProviderMessage[] = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.tool_results && msg.tool_results.length > 0) {
        // This is a tool_result message — only keep if previous message has matching tool_calls
        const prev = sanitized[sanitized.length - 1];
        if (prev?.tool_calls && prev.tool_calls.length > 0) {
          // Filter tool_results to only include IDs that exist in the previous tool_calls
          const validIds = new Set(prev.tool_calls.map(tc => tc.id));
          const filtered = msg.tool_results.filter(tr => validIds.has(tr.tool_call_id));
          if (filtered.length > 0) {
            sanitized.push({ ...msg, tool_results: filtered });
          }
          // else: drop orphaned tool_results
        }
        // else: drop orphaned tool_results (no preceding tool_use)
      } else if (msg.tool_calls && msg.tool_calls.length > 0) {
        // This is a tool_use message — only keep if next message has tool_results
        const next = messages[i + 1];
        if (next?.tool_results && next.tool_results.length > 0) {
          sanitized.push(msg);
        }
        // else: drop orphaned tool_use (no following tool_result)
      } else {
        sanitized.push(msg);
      }
    }

    return sanitized;
  }

  saveMessage(
    conversationId: string,
    role: string,
    content: string,
    toolCalls?: string | null,
    toolResults?: string | null,
  ): void {
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO agent_messages (id, conversation_id, role, content, tool_calls, tool_results, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(id, conversationId, role, content, toolCalls || null, toolResults || null, now);

    // Update conversation updated_at
    db.prepare('UPDATE agent_conversations SET updated_at = ? WHERE id = ?').run(now, conversationId);
  }

  retrieveMemories(query: string, limit: number = 5): AgentMemory[] {
    const db = getDb();
    // Simple keyword search — split query into words and match any
    const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    if (words.length === 0) {
      return db.prepare(
        'SELECT id, category, content, created_at, last_accessed FROM agent_memories WHERE user_id = ? ORDER BY relevance_score DESC, created_at DESC LIMIT ?',
      ).all(this.userId, limit) as AgentMemory[];
    }

    const conditions = words.map(() => 'LOWER(content) LIKE ?').join(' OR ');
    const params: unknown[] = [this.userId, ...words.map((w) => `%${w}%`), limit];

    const memories = db.prepare(
      `SELECT id, category, content, created_at, last_accessed FROM agent_memories WHERE user_id = ? AND (${conditions}) ORDER BY relevance_score DESC, created_at DESC LIMIT ?`,
    ).all(...params) as AgentMemory[];

    // Update last_accessed
    const now = new Date().toISOString();
    for (const m of memories) {
      db.prepare('UPDATE agent_memories SET last_accessed = ? WHERE id = ?').run(now, m.id);
    }

    return memories;
  }

  extractMemories(conversationId: string, userMessage: string, assistantResponse: string): void {
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
          const category = this.categorizeMemory(content);
          db.prepare(
            'INSERT INTO agent_memories (id, user_id, category, content, source_conversation_id, relevance_score, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          ).run(uuidv4(), this.userId, category, content, conversationId, 1.0, now);
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
    query += ' LIMIT 10';
    return db.prepare(query).all(...params) as { id: string; filename: string; summary: string }[];
  }

  summarizeOldMessages(conversationId: string, keepRecent: number = 10): string | null {
    const db = getDb();
    const totalCount = db.prepare(
      'SELECT COUNT(*) as count FROM agent_messages WHERE conversation_id = ?',
    ).get(conversationId) as { count: number };

    if (totalCount.count <= keepRecent) return null;

    const oldMessages = db.prepare(
      'SELECT role, content FROM agent_messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT ?',
    ).all(conversationId, totalCount.count - keepRecent) as Array<{ role: string; content: string }>;

    // Build a simple summary
    const parts: string[] = [];
    for (const msg of oldMessages) {
      if (msg.content && msg.content.length > 0) {
        const prefix = msg.role === 'user' ? 'Student' : 'Assistant';
        const truncated = msg.content.length > 200 ? msg.content.slice(0, 200) + '...' : msg.content;
        parts.push(`${prefix}: ${truncated}`);
      }
    }

    return parts.length > 0 ? `[Earlier conversation summary]\n${parts.join('\n')}` : null;
  }
}
