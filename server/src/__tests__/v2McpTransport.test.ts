import assert from 'node:assert/strict';
import { request as httpRequest, type Server } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import express from 'express';
import { closeDb, initDb } from '../db/init.js';
import { readMcpTransportConfig } from '../db/validateConfig.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';
import { AppError, errorHandler } from '../middleware/errorHandler.js';
import { TOOL_BINDINGS, type ToolBinding } from '../mcp/bindings.js';
import {
  assertToolBindingParity,
  loadToolFaceManifest,
  publicToolFaceEntries,
  type LoadedToolFaceManifest,
  type LoadedToolFaceManifestEntry,
} from '../mcp/manifest.js';
import { resolveEffectiveTier, supportsFormElicitation } from '../mcp/policy.js';
import {
  createMcpHostOriginGuard,
  createMcpRequestHandler,
  dispatchToolCall,
} from '../mcp/transport.js';
import noteRoutes from '../routes/notes.js';
import { createToolReceiptsRouter } from '../routes/toolReceipts.js';
import { trashNoteAsUser } from '../services/notes.js';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const COURSE_ID = '22222222-2222-4222-8222-222222222222';
const MODERN_PROTOCOL_VERSION = '2026-07-28';
const PROTOCOL_VERSION_KEY = 'io.modelcontextprotocol/protocolVersion';
const CLIENT_CAPABILITIES_KEY = 'io.modelcontextprotocol/clientCapabilities';
const CLIENT_INFO_KEY = 'io.modelcontextprotocol/clientInfo';
const OLDER_NOTE_ID = '33333333-3333-4333-8333-333333333333';
const NEWEST_NOTE_ID = '44444444-4444-4444-8444-444444444444';
const MISSING_NOTE_ID = '99999999-9999-4999-8999-999999999999';
const DECISION_METADATA_KEY = 'io.coincides/toolFaceDecision';

interface Fixture {
  baseUrl: string;
  port: number;
  token: string;
  db: Awaited<ReturnType<typeof initDb>>;
}

interface FixtureOptions {
  manifest?: LoadedToolFaceManifest;
  bindings?: ReadonlyMap<string, ToolBinding>;
}

function canonicalManifest(): LoadedToolFaceManifest {
  return loadToolFaceManifest(new URL(
    '../../../docs/generated/tool-face-manifest.json',
    import.meta.url,
  ));
}

function cloneEntry(
  entry: LoadedToolFaceManifestEntry,
  changes: Partial<LoadedToolFaceManifestEntry>,
): LoadedToolFaceManifestEntry {
  return {
    ...structuredClone(entry),
    ...changes,
  };
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

async function withMcpHttp(
  options: FixtureOptions,
  run: (fixture: Fixture) => void | Promise<void>,
): Promise<void> {
  const tempRoot = mkdtempSync(join(tmpdir(), 'coincides-mcp-transport-'));
  let server: Server | null = null;
  try {
    const db = await initDb(join(tempRoot, 'test.db'));
    db.prepare("INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, 'hash', ?, ?)")
      .run(USER_ID, 'mcp-transport@example.com', 'MCP User', '2026-08-23 08:00:00');
    db.prepare('INSERT INTO courses (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run(COURSE_ID, USER_ID, 'MCP Course', '2026-08-23 08:00:00', '2026-08-23 08:00:00');
    const insertNote = db.prepare(`
      INSERT INTO notes (
        id, user_id, course_id, title, description, status, source_kind,
        page_format, metadata, operation_batch_id, created_at, updated_at,
        trashed_at, note_class
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL, ?)
    `);
    insertNote.run(
      OLDER_NOTE_ID, USER_ID, COURSE_ID,
      'Older note', null, 'active', 'manual', 'flow',
      '{"marker":"older"}', '2026-08-23 08:01:00', '2026-08-23 08:02:00', 'user',
    );
    insertNote.run(
      NEWEST_NOTE_ID, USER_ID, COURSE_ID,
      'Newest note', 'MCP positive control', 'active', 'manual', 'flow',
      '{"marker":"newest"}', '2026-08-23 08:03:00', '2026-08-23 08:04:00', 'user',
    );

    const app = express();
    app.use(express.json());
    app.post(
      '/api/mcp',
      createMcpHostOriginGuard({
        allowedHostnames: ['127.0.0.1', 'localhost'],
        allowedOriginHostnames: ['127.0.0.1', 'localhost'],
      }),
      authMiddleware,
      createMcpRequestHandler({
        manifest: options.manifest ?? canonicalManifest(),
        bindings: options.bindings,
      }),
    );
    app.use('/api/notes', authMiddleware, noteRoutes);
    app.use('/api/tool-receipts', authMiddleware, createToolReceiptsRouter());
    app.use(errorHandler);
    server = app.listen();
    await new Promise<void>((resolve) => server!.once('listening', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('MCP fixture did not bind a TCP port');
    await run({
      baseUrl: `http://127.0.0.1:${address.port}`,
      port: address.port,
      token: generateToken(USER_ID),
      db,
    });
  } finally {
    if (server) await closeServer(server);
    closeDb();
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function envelope(clientCapabilities: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    [PROTOCOL_VERSION_KEY]: MODERN_PROTOCOL_VERSION,
    [CLIENT_CAPABILITIES_KEY]: clientCapabilities,
    [CLIENT_INFO_KEY]: { name: 'coincides-mcp-test', version: '1.0.0' },
  };
}

function receiptByCallId(fixture: Fixture, callId: string) {
  const row = fixture.db.prepare(`
    SELECT id, status, source_id, applied_at, metadata
    FROM operation_batches
    WHERE source_type = 'mcp' AND source_id = ?
  `).get(callId) as {
    id: string;
    status: string;
    source_id: string;
    applied_at: string | null;
    metadata: string;
  } | undefined;
  assert.ok(row, `receipt for MCP call ${callId} must exist`);
  return { ...row, metadata: JSON.parse(row.metadata) as Record<string, any> };
}

function mcpReceiptCount(fixture: Fixture): number {
  return fixture.db.prepare(`
    SELECT COUNT(*) AS count FROM operation_batches WHERE source_type = 'mcp'
  `).pluck().get() as number;
}

function noteRows(fixture: Fixture, noteIds: string[]): unknown[] {
  const placeholders = noteIds.map(() => '?').join(', ');
  return fixture.db.prepare(`
    SELECT * FROM notes WHERE id IN (${placeholders}) ORDER BY id
  `).all(...noteIds);
}

function countingTrashBindings(executorCalls: string[]): ReadonlyMap<string, ToolBinding> {
  const bindings = new Map(TOOL_BINDINGS);
  bindings.set('trash_notes', (input, context) => {
    const { note_ids: noteIds } = input as { note_ids: string[] };
    return {
      results: noteIds.map((noteId) => {
        executorCalls.push(noteId);
        return {
          note_id: noteId,
          ...trashNoteAsUser({ userId: context.userId, noteId }),
        };
      }),
    };
  });
  return bindings;
}

function formCapabilities(): Record<string, unknown> {
  return { elicitation: { form: {} } };
}

function trashToolParams(noteIds: string[]): Record<string, unknown> {
  return { name: 'trash_notes', arguments: { note_ids: noteIds } };
}

async function mcpPost(
  fixture: Fixture,
  method: 'tools/list' | 'tools/call',
  params: Record<string, unknown>,
  options: {
    id?: number;
    capabilities?: Record<string, unknown>;
    toolName?: string;
    inputResponses?: Record<string, unknown>;
  } = {},
): Promise<{ response: Response; body: any }> {
  const id = options.id ?? 1;
  const response = await fetch(`${fixture.baseUrl}/api/mcp`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${fixture.token}`,
      'content-type': 'application/json',
      'mcp-protocol-version': MODERN_PROTOCOL_VERSION,
      'mcp-method': method,
      ...(options.toolName && { 'mcp-name': options.toolName }),
      origin: fixture.baseUrl,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id,
      method,
      params: {
        ...params,
        ...(options.inputResponses && { inputResponses: options.inputResponses }),
        _meta: envelope(options.capabilities),
      },
    }),
  });
  return { response, body: await response.json() };
}

async function firstTrashConfirmRound(
  fixture: Fixture,
  id: number,
  noteIds: string[],
): Promise<{ response: Response; body: any }> {
  return mcpPost(
    fixture,
    'tools/call',
    trashToolParams(noteIds),
    {
      id,
      toolName: 'trash_notes',
      capabilities: formCapabilities(),
    },
  );
}

async function retryTrashConfirmRound(
  fixture: Fixture,
  id: number,
  noteIds: string[],
  inputResponseValue: Record<string, unknown>,
): Promise<{ response: Response; body: any }> {
  return mcpPost(
    fixture,
    'tools/call',
    trashToolParams(noteIds),
    {
      id,
      toolName: 'trash_notes',
      capabilities: formCapabilities(),
      inputResponses: { confirm: inputResponseValue },
    },
  );
}

async function postAuthenticated(
  fixture: Fixture,
  path: string,
): Promise<{ response: Response; body: any }> {
  const response = await fetch(`${fixture.baseUrl}${path}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${fixture.token}` },
  });
  return { response, body: await response.json() };
}

async function rawMcpRequest(
  port: number,
  headers: Record<string, string>,
): Promise<{ status: number; body: Buffer }> {
  const payload = Buffer.from(JSON.stringify({
    jsonrpc: '2.0',
    id: 90,
    method: 'tools/list',
    params: { _meta: envelope() },
  }));
  return new Promise((resolve, reject) => {
    const request = httpRequest({
      hostname: '127.0.0.1',
      port,
      path: '/api/mcp',
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': String(payload.length),
        'mcp-protocol-version': MODERN_PROTOCOL_VERSION,
        'mcp-method': 'tools/list',
        ...headers,
      },
    }, (response) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      response.on('end', () => resolve({
        status: response.statusCode ?? 0,
        body: Buffer.concat(chunks),
      }));
    });
    request.on('error', reject);
    request.end(payload);
  });
}

test('S1 config gate defaults local-only and rejects non-hostname deployment values', () => {
  assert.deepEqual(readMcpTransportConfig({}), {
    allowedHostnames: ['localhost', '127.0.0.1', '[::1]'],
    allowedOriginHostnames: ['localhost', '127.0.0.1', '[::1]'],
  });
  assert.deepEqual(readMcpTransportConfig({
    MCP_ALLOWED_HOSTNAMES: ' EXAMPLE.COM,example.com ',
    MCP_ALLOWED_ORIGIN_HOSTNAMES: 'app.example.com',
  }), {
    allowedHostnames: ['example.com'],
    allowedOriginHostnames: ['app.example.com'],
  });
  for (const invalid of ['', 'https://example.com', 'example.com:443', '*', 'a,,b']) {
    assert.throws(
      () => readMcpTransportConfig({ MCP_ALLOWED_HOSTNAMES: invalid }),
      /MCP_ALLOWED_HOSTNAMES/,
    );
  }
});

test('K-0 MCP tools/call list_notes is end-to-end equivalent to the same REST request', async () => {
  await withMcpHttp({}, async (fixture) => {
    const restResponse = await fetch(
      `${fixture.baseUrl}/api/notes?course_id=${COURSE_ID}&status=active`,
      { headers: { authorization: `Bearer ${fixture.token}` } },
    );
    assert.equal(restResponse.status, 200);
    const restBody = await restResponse.json();

    const { response, body } = await mcpPost(
      fixture,
      'tools/call',
      { name: 'list_notes', arguments: { course_id: COURSE_ID, status: 'active' } },
      { id: 10, toolName: 'list_notes' },
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('mcp-session-id'), null);
    assert.equal(body.error, undefined);
    assert.equal(body.result.resultType, 'complete');
    assert.deepEqual(body.result.structuredContent, restBody);
    assert.deepEqual(JSON.parse(body.result.content[0].text), restBody);

    const receipt = fixture.db.prepare(`
      SELECT status, source_id, applied_at, metadata
      FROM operation_batches
      WHERE source_type = 'mcp'
    `).get() as { status: string; source_id: string; applied_at: string | null; metadata: string };
    assert.equal(receipt.status, 'applied');
    assert.equal(receipt.source_id, '10');
    assert.ok(receipt.applied_at);
    assert.equal(JSON.parse(receipt.metadata).tool, 'list_notes');
  });
});

test('K-1 tools/list independently hides a non-public, non-reserved manifest entry', async () => {
  const manifest = canonicalManifest();
  const sentinel = cloneEntry(manifest[0], {
    name: 'internal_probe',
    exposure: 'internal',
  });
  const fixtureManifest = [...manifest, sentinel];
  assert.ok(fixtureManifest.some((entry) => entry.name === 'internal_probe'));

  await withMcpHttp({ manifest: fixtureManifest }, async (fixture) => {
    const { response, body } = await mcpPost(fixture, 'tools/list', {});
    assert.equal(response.status, 200);
    const names = body.result.tools.map((tool: { name: string }) => tool.name);
    assert.ok(names.includes('list_notes'), 'public positive control must be visible');
    assert.ok(!names.includes('internal_probe'));
  });
});

test('K-2 tools/list independently hides a public __-prefixed manifest entry', async () => {
  const manifest = canonicalManifest();
  const sentinel = cloneEntry(manifest[0], {
    name: '__reserved_probe',
    exposure: 'public',
  });
  const fixtureManifest = [...manifest, sentinel];
  assert.ok(fixtureManifest.some((entry) => entry.name === '__reserved_probe'));

  await withMcpHttp({ manifest: fixtureManifest }, async (fixture) => {
    const { response, body } = await mcpPost(fixture, 'tools/list', {});
    assert.equal(response.status, 200);
    const names = body.result.tools.map((tool: { name: string }) => tool.name);
    assert.ok(names.includes('list_notes'), 'public positive control must be visible');
    assert.ok(!names.includes('__reserved_probe'));
  });
});

test('K-3 Host and Origin gates reject before auth with empty 403 and no receipt', async () => {
  await withMcpHttp({}, async (fixture) => {
    const legalWithoutToken = await rawMcpRequest(fixture.port, {
      host: `127.0.0.1:${fixture.port}`,
      origin: fixture.baseUrl,
    });
    assert.equal(legalWithoutToken.status, 401, 'legal transport headers must reach auth');

    const illegalHost = await rawMcpRequest(fixture.port, {
      host: 'attacker.example',
      origin: fixture.baseUrl,
    });
    assert.equal(illegalHost.status, 403);
    assert.equal(illegalHost.body.length, 0);

    const illegalOrigin = await rawMcpRequest(fixture.port, {
      host: `127.0.0.1:${fixture.port}`,
      origin: 'https://attacker.example',
    });
    assert.equal(illegalOrigin.status, 403);
    assert.equal(illegalOrigin.body.length, 0);

    const receiptCount = fixture.db.prepare(`
      SELECT COUNT(*) AS count FROM operation_batches WHERE source_type = 'mcp'
    `).get() as { count: number };
    assert.equal(receiptCount.count, 0);
  });
});

test('K-4 binding names exactly equal the filtered public manifest names', () => {
  const entries = publicToolFaceEntries(canonicalManifest());
  assert.doesNotThrow(() => assertToolBindingParity(entries, TOOL_BINDINGS));

  const extraBindings = new Map(TOOL_BINDINGS);
  extraBindings.set('extra_binding_probe', async () => null);
  assert.throws(
    () => assertToolBindingParity(entries, extraBindings),
    /extra: extra_binding_probe/,
  );

  const missingBindings = new Map(TOOL_BINDINGS);
  missingBindings.delete('list_notes');
  assert.throws(
    () => assertToolBindingParity(entries, missingBindings),
    /missing: list_notes/,
  );
});

test('K-5 real HTTP splits confirm tools between proposal fallback and MRTR input_required', async () => {
  const executorCalls: string[] = [];
  const noteIds = [OLDER_NOTE_ID, NEWEST_NOTE_ID];

  assert.equal(supportsFormElicitation(envelope()), false);
  assert.equal(supportsFormElicitation(envelope({ elicitation: { form: {} } })), true);

  await withMcpHttp({ bindings: countingTrashBindings(executorCalls) }, async (fixture) => {
    const unsupported = await mcpPost(
      fixture,
      'tools/call',
      trashToolParams(noteIds),
      { id: 50, toolName: 'trash_notes' },
    );
    assert.equal(unsupported.response.status, 200);
    assert.equal(unsupported.body.result.resultType, 'complete');
    assert.match(unsupported.body.result.content[0].text, /proposal for human review/);
    assert.deepEqual(executorCalls, []);

    const receipt = receiptByCallId(fixture, '50');
    assert.equal(receipt.status, 'proposed');
    assert.equal(receipt.source_id, '50');
    assert.equal(receipt.applied_at, null);
    assert.deepEqual(receipt.metadata.resources, noteIds.map((id) => ({
      kind: 'note',
      id,
      outcome: 'pending',
    })));
    assert.equal(receipt.metadata.tier, 'propose');

    const capable = await mcpPost(
      fixture,
      'tools/call',
      trashToolParams(noteIds),
      {
        id: 51,
        toolName: 'trash_notes',
        capabilities: { elicitation: { form: {} } },
      },
    );
    assert.equal(capable.response.status, 200);
    assert.equal(capable.body.result.resultType, 'input_required');
    assert.ok(capable.body.result.inputRequests.confirm);
    assert.deepEqual(executorCalls, [], 'the input_required round must not execute note executors');
    assert.equal(mcpReceiptCount(fixture), 1, 'the input_required round must not write a receipt');
  });
});

test('K-b3 threshold policy makes one trash immediate and branches larger batches by capability', () => {
  const manifest = canonicalManifest();
  const listEntry = manifest.find(
    (entry: LoadedToolFaceManifestEntry) => entry.name === 'list_notes',
  );
  const trashEntry = manifest.find(
    (entry: LoadedToolFaceManifestEntry) => entry.name === 'trash_notes',
  );
  assert.ok(listEntry, 'positive control must see list_notes');
  assert.ok(trashEntry, 'trash_notes must exist in the generated manifest');

  assert.equal(resolveEffectiveTier(listEntry, envelope(), { course_id: COURSE_ID }), 'immediate');
  assert.equal(resolveEffectiveTier(trashEntry, envelope(), { note_ids: [OLDER_NOTE_ID] }), 'immediate');
  assert.equal(resolveEffectiveTier(
    trashEntry,
    envelope({ elicitation: { form: {} } }),
    { note_ids: [OLDER_NOTE_ID] },
  ), 'immediate');
  assert.equal(resolveEffectiveTier(
    trashEntry,
    envelope(),
    { note_ids: [OLDER_NOTE_ID, NEWEST_NOTE_ID] },
  ), 'propose');
  assert.equal(resolveEffectiveTier(
    trashEntry,
    envelope({ elicitation: { form: {} } }),
    { note_ids: [OLDER_NOTE_ID, NEWEST_NOTE_ID] },
  ), 'confirm');
  assert.equal(resolveEffectiveTier(
    cloneEntry(trashEntry, { threshold: undefined }),
    envelope(),
    { note_ids: [OLDER_NOTE_ID] },
  ), 'propose', 'a confirm entry without the declared threshold must not become immediate');

  const thresholdProbe = cloneEntry(trashEntry, {
    name: 'threshold_probe',
    threshold: { batch_field: 'probe_ids' },
  });
  assert.equal(
    resolveEffectiveTier(thresholdProbe, envelope(), { probe_ids: [OLDER_NOTE_ID] }),
    'immediate',
    'policy must read the declared batch field instead of hard-coding note_ids',
  );
  assert.equal(
    resolveEffectiveTier(thresholdProbe, envelope(), { note_ids: [OLDER_NOTE_ID] }),
    'propose',
  );
});

test('K-b0 real HTTP trash_notes n=1 applies the lifecycle action and causal receipt', async () => {
  await withMcpHttp({}, async (fixture) => {
    const { response, body } = await mcpPost(
      fixture,
      'tools/call',
      { name: 'trash_notes', arguments: { note_ids: [OLDER_NOTE_ID] } },
      { id: 80, toolName: 'trash_notes' },
    );

    assert.equal(response.status, 200);
    assert.equal(body.error, undefined);
    assert.equal(body.result.isError, undefined);
    assert.equal(body.result.resultType, 'complete');
    assert.deepEqual(body.result.structuredContent, {
      results: [{ note_id: OLDER_NOTE_ID, outcome: 'trashed' }],
    });
    assert.equal(
      fixture.db.prepare('SELECT status FROM notes WHERE id = ?').pluck().get(OLDER_NOTE_ID),
      'trashed',
    );

    const receipt = receiptByCallId(fixture, '80');
    assert.equal(receipt.status, 'applied');
    assert.ok(receipt.applied_at);
    assert.deepEqual(receipt.metadata.resources, [
      { kind: 'note', id: OLDER_NOTE_ID, outcome: 'trashed' },
    ]);
    assert.deepEqual(receipt.metadata.intended_input, { note_ids: [OLDER_NOTE_ID] });
    assert.deepEqual(body.result._meta['io.coincides/toolFaceReceipt'], {
      id: receipt.id,
      status: 'applied',
    });
  });
});

test('K-b0 real HTTP records skipped and missing outcomes without inventing lifecycle effects', async () => {
  await withMcpHttp({}, async (fixture) => {
    fixture.db.prepare(`
      UPDATE notes
      SET status = 'trashed', trashed_at = ?, updated_at = ?
      WHERE id = ?
    `).run('2026-08-23 09:00:00', '2026-08-23 09:00:00', OLDER_NOTE_ID);
    const alreadyTrashedBefore = fixture.db.prepare(
      'SELECT status, trashed_at, updated_at FROM notes WHERE id = ?',
    ).get(OLDER_NOTE_ID);

    const alreadyTrashed = await mcpPost(
      fixture,
      'tools/call',
      { name: 'trash_notes', arguments: { note_ids: [OLDER_NOTE_ID] } },
      { id: 83, toolName: 'trash_notes' },
    );
    assert.equal(alreadyTrashed.response.status, 200);
    assert.deepEqual(alreadyTrashed.body.result.structuredContent, {
      results: [{
        note_id: OLDER_NOTE_ID,
        outcome: 'skipped',
        reason: 'already_trashed',
      }],
    });
    assert.deepEqual(
      fixture.db.prepare(
        'SELECT status, trashed_at, updated_at FROM notes WHERE id = ?',
      ).get(OLDER_NOTE_ID),
      alreadyTrashedBefore,
    );
    assert.deepEqual(receiptByCallId(fixture, '83').metadata.resources, [{
      kind: 'note',
      id: OLDER_NOTE_ID,
      outcome: 'skipped',
      reason: 'already_trashed',
    }]);

    fixture.db.prepare(`
      UPDATE notes
      SET note_class = 'source_projection', source_kind = 'source_projection'
      WHERE id = ?
    `).run(NEWEST_NOTE_ID);
    const sourceProjectionBefore = fixture.db.prepare(
      'SELECT status, trashed_at, updated_at FROM notes WHERE id = ?',
    ).get(NEWEST_NOTE_ID);
    const readOnlyProjection = await mcpPost(
      fixture,
      'tools/call',
      { name: 'trash_notes', arguments: { note_ids: [NEWEST_NOTE_ID] } },
      { id: 84, toolName: 'trash_notes' },
    );
    assert.equal(readOnlyProjection.response.status, 200);
    assert.deepEqual(readOnlyProjection.body.result.structuredContent, {
      results: [{
        note_id: NEWEST_NOTE_ID,
        outcome: 'skipped',
        reason: 'read_only_projection',
      }],
    });
    assert.deepEqual(
      fixture.db.prepare(
        'SELECT status, trashed_at, updated_at FROM notes WHERE id = ?',
      ).get(NEWEST_NOTE_ID),
      sourceProjectionBefore,
    );
    assert.deepEqual(receiptByCallId(fixture, '84').metadata.resources, [{
      kind: 'note',
      id: NEWEST_NOTE_ID,
      outcome: 'skipped',
      reason: 'read_only_projection',
    }]);

    const missing = await mcpPost(
      fixture,
      'tools/call',
      { name: 'trash_notes', arguments: { note_ids: [MISSING_NOTE_ID] } },
      { id: 85, toolName: 'trash_notes' },
    );
    assert.equal(missing.response.status, 200);
    assert.deepEqual(missing.body.result.structuredContent, {
      results: [{ note_id: MISSING_NOTE_ID, outcome: 'missing' }],
    });
    assert.deepEqual(receiptByCallId(fixture, '85').metadata.resources, [{
      kind: 'note',
      id: MISSING_NOTE_ID,
      outcome: 'missing',
    }]);
  });
});

async function assertProposedBatch(
  capabilities: Record<string, unknown>,
  callId: number,
): Promise<void> {
  const executorCalls: string[] = [];
  await withMcpHttp({ bindings: countingTrashBindings(executorCalls) }, async (fixture) => {
    const input = { note_ids: [OLDER_NOTE_ID, NEWEST_NOTE_ID] };
    const before = noteRows(fixture, input.note_ids);
    const receiptsBefore = mcpReceiptCount(fixture);
    const { response, body } = await mcpPost(
      fixture,
      'tools/call',
      { name: 'trash_notes', arguments: input },
      { id: callId, toolName: 'trash_notes', capabilities },
    );

    assert.equal(response.status, 200);
    assert.equal(body.error, undefined);
    assert.equal(body.result.isError, undefined);
    assert.equal(body.result.resultType, 'complete');
    assert.deepEqual(body.result.structuredContent, { results: [] });
    assert.deepEqual(noteRows(fixture, input.note_ids), before);
    assert.deepEqual(executorCalls, [], 'proposal fallback must call zero note executors');
    assert.equal(mcpReceiptCount(fixture), receiptsBefore + 1);

    const receipt = receiptByCallId(fixture, String(callId));
    assert.equal(receipt.status, 'proposed');
    assert.equal(receipt.applied_at, null);
    assert.deepEqual(receipt.metadata.resources, input.note_ids.map((id) => ({
      kind: 'note',
      id,
      outcome: 'pending',
    })));
    assert.deepEqual(receipt.metadata.intended_input, input);
    assert.deepEqual(body.result._meta['io.coincides/toolFaceReceipt'], {
      id: receipt.id,
      status: 'proposed',
    });
  });
}

test('K-b1/K-c1 real HTTP trash_notes n>1 without form capability proposes with zero execution', async () => {
  await assertProposedBatch({}, 81);
});

test('K-b2/K-c2/K-c9 real HTTP capable first call requests input with zero execution and zero persistence', async () => {
  const executorCalls: string[] = [];
  await withMcpHttp({ bindings: countingTrashBindings(executorCalls) }, async (fixture) => {
    const noteIds = [OLDER_NOTE_ID, NEWEST_NOTE_ID];
    const notesBefore = noteRows(fixture, noteIds);
    const operationRowsBefore = fixture.db.prepare(
      'SELECT * FROM operation_batches ORDER BY id',
    ).all();

    const call = await firstTrashConfirmRound(fixture, 82, noteIds);

    assert.equal(call.response.status, 200);
    assert.equal(call.body.error, undefined);
    assert.equal(call.body.result.resultType, 'input_required');
    assert.equal(call.body.result.requestState, undefined, 'MRTR must not use requestState');
    const request = call.body.result.inputRequests.confirm;
    assert.equal(request.method, 'elicitation/create');
    assert.deepEqual(request.params.requestedSchema, {
      type: 'object',
      properties: { confirm: { type: 'boolean' } },
      required: ['confirm'],
    });
    assert.match(request.params.message, /\b2\b/);
    assert.match(request.params.message, new RegExp(OLDER_NOTE_ID));
    assert.match(request.params.message, new RegExp(NEWEST_NOTE_ID));
    assert.deepEqual(executorCalls, [], 'input_required must call zero note executors');
    assert.deepEqual(noteRows(fixture, noteIds), notesBefore, 'every note column must stay unchanged');
    assert.deepEqual(
      fixture.db.prepare('SELECT * FROM operation_batches ORDER BY id').all(),
      operationRowsBefore,
      'input_required must write zero operation rows',
    );
  });
});

test('K-c3 confirm true retries once, calls every executor once, applies, and records actual resources', async () => {
  const executorCalls: string[] = [];
  await withMcpHttp({ bindings: countingTrashBindings(executorCalls) }, async (fixture) => {
    const noteIds = [OLDER_NOTE_ID, NEWEST_NOTE_ID];
    const first = await firstTrashConfirmRound(fixture, 90, noteIds);
    assert.equal(first.body.result.resultType, 'input_required');
    assert.equal(mcpReceiptCount(fixture), 0);

    const accepted = await retryTrashConfirmRound(
      fixture,
      91,
      noteIds,
      { action: 'accept', content: { confirm: true } },
    );

    assert.equal(accepted.response.status, 200);
    assert.equal(accepted.body.result.resultType, 'complete');
    assert.deepEqual(accepted.body.result.structuredContent, {
      results: noteIds.map((noteId) => ({ note_id: noteId, outcome: 'trashed' })),
    });
    assert.deepEqual(
      executorCalls,
      noteIds,
      'confirm retry must call the real note executor exactly n times',
    );
    assert.deepEqual(
      fixture.db.prepare('SELECT id, status FROM notes ORDER BY id').all(),
      noteIds.map((id) => ({ id, status: 'trashed' })),
    );
    assert.equal(mcpReceiptCount(fixture), 1);
    const receipt = receiptByCallId(fixture, '91');
    assert.equal(receipt.status, 'applied');
    assert.equal(receipt.metadata.tier, 'immediate');
    assert.deepEqual(receipt.metadata.resources, noteIds.map((id) => ({
      kind: 'note',
      id,
      outcome: 'trashed',
    })));
    assert.deepEqual(accepted.body.result._meta['io.coincides/toolFaceReceipt'], {
      id: receipt.id,
      status: 'applied',
    });
  });
});

async function assertRejectedConfirmRound(
  inputResponseValue: Record<string, unknown>,
  expectedDecision: 'rejected' | 'declined' | 'cancelled',
  firstCallId: number,
): Promise<void> {
  const executorCalls: string[] = [];
  await withMcpHttp({ bindings: countingTrashBindings(executorCalls) }, async (fixture) => {
    const noteIds = [OLDER_NOTE_ID, NEWEST_NOTE_ID];
    const notesBefore = noteRows(fixture, noteIds);
    const operationRowsBefore = fixture.db.prepare(
      'SELECT * FROM operation_batches ORDER BY id',
    ).all();
    const first = await firstTrashConfirmRound(fixture, firstCallId, noteIds);
    assert.equal(first.body.result.resultType, 'input_required');

    const rejected = await retryTrashConfirmRound(
      fixture,
      firstCallId + 1,
      noteIds,
      inputResponseValue,
    );

    assert.equal(rejected.response.status, 200);
    assert.equal(rejected.body.result.resultType, 'complete', 'a refusal must not ask again');
    assert.equal(rejected.body.result.isError, false);
    assert.deepEqual(rejected.body.result.structuredContent, { results: [] });
    assert.deepEqual(rejected.body.result._meta[DECISION_METADATA_KEY], {
      decision: expectedDecision,
    });
    assert.equal(
      rejected.body.result._meta['io.coincides/toolFaceReceipt'],
      undefined,
      'a refusal must not invent a receipt id',
    );
    assert.deepEqual(
      Object.keys(rejected.body.result._meta).filter((key) => key.startsWith('io.coincides/')),
      [DECISION_METADATA_KEY],
      'decision must be the only Coincides-owned metadata key',
    );
    assert.match(rejected.body.result.content[0].text, /not executed|no notes were deleted/i);
    assert.deepEqual(executorCalls, [], 'a refusal must call zero note executors');
    assert.deepEqual(noteRows(fixture, noteIds), notesBefore);
    assert.deepEqual(
      fixture.db.prepare('SELECT * FROM operation_batches ORDER BY id').all(),
      operationRowsBefore,
      'a refusal must write zero operation rows',
    );
  });
}

test('K-c4/K-c10 rejected: confirm false completes with decision metadata, zero execution, and zero rows', async () => {
  await assertRejectedConfirmRound(
    { action: 'accept', content: { confirm: false } },
    'rejected',
    92,
  );
});

test('K-c5/K-c10 declined: decline completes with its own decision, zero execution, and zero rows', async () => {
  await assertRejectedConfirmRound({ action: 'decline' }, 'declined', 94);
});

test('K-c5/K-c10 cancelled: cancel completes with its own decision, zero execution, and zero rows', async () => {
  await assertRejectedConfirmRound({ action: 'cancel' }, 'cancelled', 96);
});

test('K-c6 disconnecting after input_required leaves the whole database unchanged', async () => {
  const executorCalls: string[] = [];
  await withMcpHttp({ bindings: countingTrashBindings(executorCalls) }, async (fixture) => {
    const noteIds = [OLDER_NOTE_ID, NEWEST_NOTE_ID];
    const databaseBefore = fixture.db.serialize();
    const notesBefore = noteRows(fixture, noteIds);
    const operationRowsBefore = fixture.db.prepare(
      'SELECT * FROM operation_batches ORDER BY id',
    ).all();

    const first = await firstTrashConfirmRound(fixture, 98, noteIds);
    assert.equal(first.body.result.resultType, 'input_required');

    assert.deepEqual(executorCalls, []);
    assert.deepEqual(noteRows(fixture, noteIds), notesBefore);
    assert.deepEqual(
      fixture.db.prepare('SELECT * FROM operation_batches ORDER BY id').all(),
      operationRowsBefore,
    );
    assert.deepEqual(
      fixture.db.serialize(),
      databaseBefore,
      'disconnecting after input_required must leave every database page unchanged',
    );
  });
});

async function assertNonElicitationResponseReasks(
  inputResponseValue: Record<string, unknown>,
  firstCallId: number,
): Promise<void> {
  const executorCalls: string[] = [];
  await withMcpHttp({ bindings: countingTrashBindings(executorCalls) }, async (fixture) => {
    const noteIds = [OLDER_NOTE_ID, NEWEST_NOTE_ID];
    const retry = await retryTrashConfirmRound(
      fixture,
      firstCallId,
      noteIds,
      inputResponseValue,
    );
    assert.equal(retry.response.status, 200);
    assert.equal(retry.body.result.resultType, 'input_required');
    assert.deepEqual(executorCalls, []);
    assert.equal(mcpReceiptCount(fixture), 0);
  });
}

test('confirm treats a sampling response as missing and reissues the form without executing', async () => {
  await assertNonElicitationResponseReasks({
    role: 'assistant',
    content: { type: 'text', text: 'not a confirmation' },
    model: 'sampling-probe',
    stopReason: 'endTurn',
  }, 100);
});

test('confirm treats a roots response as missing and reissues the form without executing', async () => {
  await assertNonElicitationResponseReasks({ roots: [] }, 101);
});

test('K-c11 replaying the same confirmed input records two honest receipts and skips the second trash', async () => {
  const executorCalls: string[] = [];
  await withMcpHttp({ bindings: countingTrashBindings(executorCalls) }, async (fixture) => {
    const noteIds = [OLDER_NOTE_ID, NEWEST_NOTE_ID];
    const acceptedResponse = { action: 'accept', content: { confirm: true } };
    const first = await firstTrashConfirmRound(fixture, 110, noteIds);
    assert.equal(first.body.result.resultType, 'input_required');

    const accepted = await retryTrashConfirmRound(
      fixture,
      111,
      noteIds,
      acceptedResponse,
    );
    assert.deepEqual(accepted.body.result.structuredContent, {
      results: noteIds.map((noteId) => ({ note_id: noteId, outcome: 'trashed' })),
    });
    const afterFirstApply = noteRows(fixture, noteIds);

    const replayed = await retryTrashConfirmRound(
      fixture,
      111,
      noteIds,
      acceptedResponse,
    );
    assert.equal(replayed.body.result.resultType, 'complete');
    assert.deepEqual(replayed.body.result.structuredContent, {
      results: noteIds.map((noteId) => ({
        note_id: noteId,
        outcome: 'skipped',
        reason: 'already_trashed',
      })),
    });
    assert.deepEqual(
      executorCalls,
      [...noteIds, ...noteIds],
      'stateless replay must observably call n executors per request',
    );
    assert.deepEqual(
      noteRows(fixture, noteIds),
      afterFirstApply,
      'the second guarded execution must not trash or timestamp notes again',
    );
    assert.equal(mcpReceiptCount(fixture), 2);
    const replayRows = fixture.db.prepare(`
      SELECT id, status, source_id, applied_at, metadata
      FROM operation_batches
      WHERE source_type = 'mcp' AND source_id = ?
      ORDER BY rowid
    `).all('111') as Array<{
      id: string;
      status: string;
      source_id: string;
      applied_at: string | null;
      metadata: string;
    }>;
    assert.equal(replayRows.length, 2, 'an exact call-id replay must write two receipts');
    const [firstRow, replayRow] = replayRows;
    const firstReceipt = {
      ...firstRow,
      metadata: JSON.parse(firstRow.metadata) as Record<string, any>,
    };
    const replayReceipt = {
      ...replayRow,
      metadata: JSON.parse(replayRow.metadata) as Record<string, any>,
    };
    assert.notEqual(firstReceipt.id, replayReceipt.id);
    assert.equal(firstReceipt.status, 'applied');
    assert.equal(replayReceipt.status, 'applied');
    assert.equal(firstReceipt.metadata.tier, 'immediate');
    assert.equal(replayReceipt.metadata.tier, 'immediate');
    assert.deepEqual(replayReceipt.metadata.resources, noteIds.map((id) => ({
      kind: 'note',
      id,
      outcome: 'skipped',
      reason: 'already_trashed',
    })));
    assert.deepEqual(accepted.body.result._meta['io.coincides/toolFaceReceipt'], {
      id: firstReceipt.id,
      status: 'applied',
    });
    assert.deepEqual(replayed.body.result._meta['io.coincides/toolFaceReceipt'], {
      id: replayReceipt.id,
      status: 'applied',
    });
  });
});

test('K-c12 accepted receipt stores actual resources and the existing revert route restores notes end to end', async () => {
  const executorCalls: string[] = [];
  await withMcpHttp({ bindings: countingTrashBindings(executorCalls) }, async (fixture) => {
    fixture.db.prepare(`
      UPDATE notes
      SET status = 'trashed', trashed_at = ?, updated_at = ?
      WHERE id = ?
    `).run('2026-08-23 10:00:00', '2026-08-23 10:00:00', NEWEST_NOTE_ID);
    const noteIds = [OLDER_NOTE_ID, NEWEST_NOTE_ID, MISSING_NOTE_ID];
    const first = await firstTrashConfirmRound(fixture, 120, noteIds);
    assert.equal(first.body.result.resultType, 'input_required');
    const accepted = await retryTrashConfirmRound(
      fixture,
      121,
      noteIds,
      { action: 'accept', content: { confirm: true } },
    );
    assert.equal(accepted.body.result.resultType, 'complete');
    assert.deepEqual(executorCalls, noteIds);
    assert.equal(mcpReceiptCount(fixture), 1);

    const receipt = receiptByCallId(fixture, '121');
    assert.equal(receipt.status, 'applied');
    assert.equal(receipt.metadata.tier, 'immediate');
    const receiptResources = receipt.metadata.resources;

    const reverted = await postAuthenticated(
      fixture,
      `/api/tool-receipts/${encodeURIComponent(receipt.id)}/revert`,
    );
    assert.equal(reverted.response.status, 200);
    assert.equal(reverted.body.status, 'reverted');
    assert.equal(reverted.body.metadata.revert_outcome, 'complete');
    assert.deepEqual(reverted.body.metadata.revert_details, {
      restored: [OLDER_NOTE_ID],
      failed: [],
    });
    assert.equal(mcpReceiptCount(fixture), 1);
    const revertedReceipt = receiptByCallId(fixture, '121');
    assert.equal(revertedReceipt.id, receipt.id);
    assert.equal(revertedReceipt.status, 'reverted');
    assert.deepEqual(
      fixture.db.prepare('SELECT id, status FROM notes ORDER BY id').all(),
      [
        { id: OLDER_NOTE_ID, status: 'active' },
        { id: NEWEST_NOTE_ID, status: 'trashed' },
      ],
    );
    assert.deepEqual(receiptResources, [
      { kind: 'note', id: OLDER_NOTE_ID, outcome: 'trashed' },
      {
        kind: 'note',
        id: NEWEST_NOTE_ID,
        outcome: 'skipped',
        reason: 'already_trashed',
      },
      { kind: 'note', id: MISSING_NOTE_ID, outcome: 'missing' },
    ]);
    assert.equal(
      receiptResources.some((resource: Record<string, unknown>) => (
        resource.outcome === 'pending'
      )),
      false,
    );
  });
});

test('K-b6 immediate receipt resources preserve every binding result in order', async () => {
  await withMcpHttp({}, async (fixture) => {
    const trashEntry = canonicalManifest().find(
      (entry: LoadedToolFaceManifestEntry) => entry.name === 'trash_notes',
    );
    const binding = TOOL_BINDINGS.get('trash_notes');
    assert.ok(trashEntry);
    assert.ok(binding);
    const input = { note_ids: [OLDER_NOTE_ID, NEWEST_NOTE_ID] };

    const result = await dispatchToolCall(
      cloneEntry(trashEntry, { tier: 'immediate' }),
      binding,
      input,
      USER_ID,
      { callId: '86', envelope: envelope() },
    );
    const structured = result.structuredContent as {
      results: Array<{ note_id: string; outcome: string; reason?: string }>;
    };
    const receipt = receiptByCallId(fixture, '86');

    assert.equal(structured.results.length, 2, 'positive control must execute two binding results');
    assert.deepEqual(receipt.metadata.resources, structured.results.map((item) => ({
      kind: 'note',
      id: item.note_id,
      outcome: item.outcome,
      ...(item.reason && { reason: item.reason }),
    })));
    assert.deepEqual(receipt.metadata.intended_input, input);
  });
});

test('unexpected binding failures are logged server-side and redacted from MCP tool results', async () => {
  const entry = cloneEntry(canonicalManifest()[0], { name: 'internal_error_probe' });
  const bindings = new Map<string, ToolBinding>([
    ['internal_error_probe', async () => {
      throw new Error('sensitive sqlite path D:/private/coincides.db');
    }],
  ]);

  await withMcpHttp({ manifest: [entry], bindings }, async (fixture) => {
    const call = await mcpPost(
      fixture,
      'tools/call',
      { name: 'internal_error_probe', arguments: { course_id: COURSE_ID } },
      { id: 70, toolName: 'internal_error_probe' },
    );
    assert.equal(call.response.status, 200);
    assert.equal(call.body.result.isError, true);
    assert.deepEqual(JSON.parse(call.body.result.content[0].text), {
      error: 'Internal server error',
      status: 500,
    });
    assert.doesNotMatch(JSON.stringify(call.body), /sensitive sqlite path|private\/coincides/);
    const receiptCount = fixture.db.prepare(`
      SELECT COUNT(*) AS count FROM operation_batches WHERE source_type = 'mcp'
    `).get() as { count: number };
    assert.equal(receiptCount.count, 0);
  });
});

test('domain AppError is projected as a safe MCP tool error without a success receipt', async () => {
  const entry = cloneEntry(canonicalManifest()[0], { name: 'app_error_probe' });
  const bindings = new Map<string, ToolBinding>([
    ['app_error_probe', async () => {
      throw new AppError(404, 'Course not found', {
        code: 'course_not_found',
        internal: 'must-not-cross-the-boundary',
      });
    }],
  ]);

  await withMcpHttp({ manifest: [entry], bindings }, async (fixture) => {
    const call = await mcpPost(
      fixture,
      'tools/call',
      { name: 'app_error_probe', arguments: { course_id: COURSE_ID } },
      { id: 71, toolName: 'app_error_probe' },
    );
    assert.equal(call.response.status, 200);
    assert.equal(call.body.result.isError, true);
    assert.deepEqual(JSON.parse(call.body.result.content[0].text), {
      error: 'Course not found',
      status: 404,
      details: { code: 'course_not_found' },
    });
    assert.doesNotMatch(JSON.stringify(call.body), /must-not-cross-the-boundary/);
    const receiptCount = fixture.db.prepare(`
      SELECT COUNT(*) AS count FROM operation_batches WHERE source_type = 'mcp'
    `).get() as { count: number };
    assert.equal(receiptCount.count, 0);
  });
});
