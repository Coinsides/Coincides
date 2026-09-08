import assert from 'node:assert/strict';
import test from 'node:test';
import Database from 'better-sqlite3';
import migration054 from '../db/migrations/054_v13_events_ledger.js';
import type { AuthRequest } from '../middleware/auth.js';
import { runRecordedAction } from '../middleware/recordedAction.js';

test('route wrapper commits synchronous actions with the authenticated human stamp and verbatim summary', () => {
  const db = new Database(':memory:');
  try {
    migration054.up(db);
    db.exec('CREATE TABLE synthetic_action (id TEXT PRIMARY KEY)');
    const req = { userId: 'synthetic-user' } as AuthRequest;
    const summary = '  原话：落定。\n保留空白。  ';
    const value = runRecordedAction(db, req, 'POST /api/boards', (connection, userId) => {
      assert.equal(connection, db);
      assert.equal(connection.inTransaction, true);
      assert.equal(userId, 'synthetic-user');
      connection.prepare('INSERT INTO synthetic_action VALUES (?)').run('board');
      return {
        value: 'committed',
        events: [{ verb: 'board_created', objects: [{ kind: 'board', id: 'board' }], summary }],
      };
    });
    assert.equal(value, 'committed');
    assert.equal(db.inTransaction, false);
    assert.deepEqual(db.prepare('SELECT user_id, actor_kind, channel, verb, summary FROM events').all(), [{
      user_id: 'synthetic-user', actor_kind: 'human', channel: 'POST /api/boards', verb: 'board_created', summary,
    }]);
    assert.deepEqual(db.prepare('SELECT * FROM synthetic_action').all(), [{ id: 'board' }]);
  } finally {
    db.close();
  }
});

test('an event insert failure rolls back its action and earlier events in the same callback', () => {
  const db = new Database(':memory:');
  try {
    migration054.up(db);
    db.exec(`
      CREATE TABLE synthetic_action (id TEXT PRIMARY KEY);
      CREATE TRIGGER synthetic_event_failure BEFORE INSERT ON events
      WHEN NEW.verb = 'board_created' BEGIN SELECT RAISE(ABORT, 'synthetic_event_failed'); END;
    `);
    assert.throws(() => runRecordedAction(db, { userId: 'synthetic-user' } as AuthRequest, 'POST /api/boards', (connection) => {
      connection.prepare('INSERT INTO synthetic_action VALUES (?)').run('purpose-and-board');
      return {
        value: true,
        events: [
          { verb: 'purpose_created', objects: [{ kind: 'purpose', id: 'purpose' }], summary: 'Purpose' },
          { verb: 'board_created', objects: [{ kind: 'board', id: 'board' }], summary: 'Board' },
        ],
      };
    }), /synthetic_event_failed/);
    assert.deepEqual(db.prepare('SELECT * FROM synthetic_action').all(), []);
    assert.deepEqual(db.prepare('SELECT * FROM events').all(), []);

    assert.throws(() => runRecordedAction(db, { userId: 'synthetic-user' } as AuthRequest, 'POST /api/boards', (connection) => {
      connection.prepare('INSERT INTO synthetic_action VALUES (?)').run('failed-action');
      throw new Error('synthetic_action_failed');
    }), /synthetic_action_failed/);
    assert.deepEqual(db.prepare('SELECT * FROM synthetic_action').all(), []);
    assert.deepEqual(db.prepare('SELECT * FROM events').all(), []);
  } finally {
    db.close();
  }
});
