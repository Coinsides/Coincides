import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import test from 'node:test';
import type Database from 'better-sqlite3';
import express from 'express';
import type { AgentMemoryRecord } from '@shared/types/agentMemories';
import { MemoryManager } from '../agent/memory/manager.js';
import { closeDb, initDb } from '../db/init.js';
import { VectorStore } from '../embedding/vectorStore.js';
import type { AuthRequest } from '../middleware/auth.js';
import { errorHandler } from '../middleware/errorHandler.js';
import settingsRoutes from '../routes/settings.js';

function count(statement: Database.Statement, ...params: unknown[]): number {
  return (statement.get(...params) as { count: number }).count;
}

test('human memory list, verbatim edit, reopen and hard delete share the existing Agent data', async () => {
  // Real schema/FTS + synthetic rows only. No app startup, auth credential or .env loader.
  const db = await initDb(':memory:');
  let server: Server | undefined;
  try {
    const userId = 'memory-smoke-user';
    const conversationId = 'memory-smoke-conversation';
    db.prepare("INSERT INTO users (id,email,password_hash,name) VALUES (?,?,'synthetic','Memory smoke')")
      .run(userId, 'memory-smoke@example.invalid');
    db.prepare('INSERT INTO agent_conversations (id,user_id,title) VALUES (?,?,?)')
      .run(conversationId, userId, 'Synthetic memory conversation');
    const manager = new MemoryManager(userId);
    manager.extractMemories(conversationId, 'I prefer morning study.', 'Synthetic reply');
    manager.extractMemories(conversationId, 'My exam is next Friday.', 'Synthetic reply');
    db.prepare('INSERT INTO agent_memories (id,user_id,category,content,created_at) VALUES (?,?,?,?,?)')
      .run('memory-without-source', userId, 'general', '  First line\nSecond line  ', '2026-09-09 10:00:00');

    const app = express();
    app.use(express.json());
    // Exercise the post-auth Settings contract with a fixed synthetic identity.
    app.use((req: AuthRequest, _res, next) => { req.userId = userId; next(); });
    app.use('/api/settings', settingsRoutes);
    app.use(errorHandler);
    server = await new Promise<Server>((resolve) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const base = `http://127.0.0.1:${address.port}/api/settings/agent-memories`;
    const list = async (): Promise<AgentMemoryRecord[]> => {
      const response = await fetch(base);
      assert.equal(response.status, 200);
      return response.json();
    };

    const initial = await list();
    assert.equal(initial.length, 3);
    const preference = initial.find((row) => row.content === 'I prefer morning study.')!;
    assert.ok(preference);
    assert.equal(preference.source_conversation_id, conversationId);
    assert.ok(Number.isFinite(Date.parse(preference.created_at)));
    assert.equal(initial.find((row) => row.id === 'memory-without-source')?.content, '  First line\nSecond line  ');
    assert.equal(initial.find((row) => row.id === 'memory-without-source')?.source_conversation_id, null);

    const hasVectors = Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'agent_memory_vec'").get());
    if (hasVectors) new VectorStore().upsertMemoryEmbedding(preference.id, Array(1024).fill(0.1));
    const content = '  I prefer evening study.\nKeep this wording.  ';
    const saved = await fetch(`${base}/${preference.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }),
    });
    assert.equal(saved.status, 200);
    assert.deepEqual(await saved.json(), { ...preference, content });
    assert.equal((await list()).find((row) => row.id === preference.id)?.content, content);
    assert.ok(manager.retrieveMemories('evening').some((row) => row.id === preference.id && row.content === content));
    assert.equal(count(db.prepare("SELECT COUNT(*) AS count FROM agent_memories_fts WHERE agent_memories_fts MATCH 'evening'")), 1);
    if (hasVectors) {
      assert.equal(count(db.prepare('SELECT COUNT(*) AS count FROM agent_memory_vec WHERE memory_id = ?'), preference.id), 0);
      new VectorStore().upsertMemoryEmbedding(preference.id, Array(1024).fill(0.2));
    }

    const removed = await fetch(`${base}/${preference.id}`, { method: 'DELETE' });
    assert.equal(removed.status, 204);
    assert.equal((await list()).length, 2);
    assert.ok(!manager.retrieveMemories('evening').some((row) => row.id === preference.id));
    assert.equal(count(db.prepare("SELECT COUNT(*) AS count FROM agent_memories_fts WHERE agent_memories_fts MATCH 'evening'")), 0);
    if (hasVectors) assert.equal(count(db.prepare('SELECT COUNT(*) AS count FROM agent_memory_vec WHERE memory_id = ?'), preference.id), 0);

    for (const memory of await list()) {
      assert.equal((await fetch(`${base}/${memory.id}`, { method: 'DELETE' })).status, 204);
    }
    assert.deepEqual(await list(), []);
    assert.deepEqual(manager.retrieveMemories('', 10), []);
  } finally {
    if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
    closeDb();
  }
});
