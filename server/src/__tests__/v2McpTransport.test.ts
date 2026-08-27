import assert from 'node:assert/strict';
import { request as httpRequest, type Server } from 'node:http';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
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
import { listContentGroups, upsertContentGroup } from '../services/contentGroups.js';
import { createItem, getItem, listItems } from '../services/items.js';
import { trashNoteAsUser } from '../services/notes.js';
import {
  createRelation,
  getRelation,
  listRelations,
  listRelationTypes,
} from '../services/relations.js';
import {
  resolveSelection,
  type ResolveSelectionInput,
  type SelectionReceiptTextRangeInput,
} from '../services/selectionResolve.js';
import { textFlowIdForBlock } from '../services/textFlowIdentity.js';
import { TOOL_REGISTRY } from '../toolFace/registry.js';

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
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const INTRUDER_USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const INTRUDER_COURSE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const INTRUDER_NOTE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const OWNER_BLOCK_ID = '55555555-5555-4555-8555-555555555555';
const MALFORMED_BLOCK_ID = '66666666-6666-4666-8666-666666666666';
const INTRUDER_BLOCK_ID = '77777777-7777-4777-8777-777777777777';
const MISSING_BLOCK_ID = '88888888-8888-4888-8888-888888888888';
const ACTIVE_UNIT_ID = 'owner-unit-active';
const DELETED_UNIT_ID = 'owner-unit-deleted';
const ACTIVE_UNIT_TEXT = 'prefix selected suffix';

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

function textFlowBody(units: Array<Record<string, unknown>>): string {
  return JSON.stringify({
    body: units.map((unit) => unit.text).filter((text) => typeof text === 'string').join('\n'),
    text_flow: {
      textflow_version: 'TextBlockContentV1',
      units,
      inline_structures: [],
      metadata: {},
    },
  });
}

function seedResolveSelectionData(fixture: Fixture): { intruderToken: string } {
  fixture.db.prepare("INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, 'hash', ?, ?)")
    .run(INTRUDER_USER_ID, 'selection-intruder@example.com', 'Selection Intruder', '2026-08-24 09:00:00');
  fixture.db.prepare('INSERT INTO courses (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
    .run(
      INTRUDER_COURSE_ID,
      INTRUDER_USER_ID,
      'Intruder Project',
      '2026-08-24 09:00:00',
      '2026-08-24 09:00:00',
    );
  fixture.db.prepare(`
    INSERT INTO notes (
      id, user_id, course_id, title, description, status, source_kind,
      page_format, metadata, operation_batch_id, created_at, updated_at,
      trashed_at, note_class
    ) VALUES (?, ?, ?, ?, NULL, 'active', 'manual', 'flow', '{}', NULL, ?, ?, NULL, 'user')
  `).run(
    INTRUDER_NOTE_ID,
    INTRUDER_USER_ID,
    INTRUDER_COURSE_ID,
    'Intruder note',
    '2026-08-24 09:01:00',
    '2026-08-24 09:01:00',
  );

  const insertBlock = fixture.db.prepare(`
    INSERT INTO note_blocks (
      id, user_id, course_id, block_type, content_json, plain_text, source_kind, metadata
    ) VALUES (?, ?, ?, 'text', ?, ?, 'manual', '{}')
  `);
  insertBlock.run(
    OWNER_BLOCK_ID,
    USER_ID,
    COURSE_ID,
    textFlowBody([
      {
        id: ACTIVE_UNIT_ID,
        text: ACTIVE_UNIT_TEXT,
        status: 'active',
        order_index: 0,
      },
      {
        id: DELETED_UNIT_ID,
        text: 'gone',
        status: 'deleted',
        order_index: 1,
      },
    ]),
    ACTIVE_UNIT_TEXT,
  );
  insertBlock.run(
    MALFORMED_BLOCK_ID,
    USER_ID,
    COURSE_ID,
    '{broken-json',
    'oops',
  );
  insertBlock.run(
    INTRUDER_BLOCK_ID,
    INTRUDER_USER_ID,
    INTRUDER_COURSE_ID,
    textFlowBody([{
      id: 'intruder-unit-active',
      text: 'intruder text',
      status: 'active',
      order_index: 0,
    }]),
    'intruder text',
  );

  const insertPlacement = fixture.db.prepare(`
    INSERT INTO note_block_placements (id, note_id, block_id, order_index)
    VALUES (?, ?, ?, ?)
  `);
  insertPlacement.run('99999999-0000-4000-8000-000000000001', NEWEST_NOTE_ID, OWNER_BLOCK_ID, 0);
  insertPlacement.run('99999999-0000-4000-8000-000000000002', NEWEST_NOTE_ID, MALFORMED_BLOCK_ID, 1);
  insertPlacement.run('99999999-0000-4000-8000-000000000003', INTRUDER_NOTE_ID, INTRUDER_BLOCK_ID, 0);

  return { intruderToken: generateToken(INTRUDER_USER_ID) };
}

function selectionRange(
  overrides: Partial<SelectionReceiptTextRangeInput> = {},
): SelectionReceiptTextRangeInput {
  return {
    blockId: OWNER_BLOCK_ID,
    textFlowId: textFlowIdForBlock(OWNER_BLOCK_ID),
    textUnitId: ACTIVE_UNIT_ID,
    startOffset: 7,
    endOffset: 15,
    excerpt: 'selected',
    ...overrides,
  };
}

function selectionReceipt(
  ranges: SelectionReceiptTextRangeInput[],
): ResolveSelectionInput {
  return {
    note_id: NEWEST_NOTE_ID,
    refs: ranges.map(({ blockId, textFlowId, textUnitId }) => ({
      blockId,
      textFlowId,
      textUnitId,
    })),
    text_ranges: ranges,
    at: '2026-08-24T12:02:03.456Z',
  };
}

function resolveSelectionParams(input: ResolveSelectionInput): Record<string, unknown> {
  return { name: 'resolve_selection', arguments: input };
}

function productionTypeScriptFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' ? [] : productionTypeScriptFiles(path);
    }
    if (!entry.isFile() || !/\.tsx?$/.test(entry.name) || /\.(?:test|spec)\.tsx?$/.test(entry.name)) {
      return [];
    }
    return [path];
  });
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
    token?: string;
  } = {},
): Promise<{ response: Response; body: any }> {
  const id = options.id ?? 1;
  const response = await fetch(`${fixture.baseUrl}/api/mcp`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${options.token ?? fixture.token}`,
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

function assertReadToolResult(
  toolName:
    | 'list_items'
    | 'get_item'
    | 'list_content_groups'
    | 'list_relations'
    | 'get_relation'
    | 'list_relation_types',
  body: any,
  expected: unknown,
): void {
  assert.equal(body.error, undefined);
  assert.equal(body.result.resultType, 'complete');
  const entry = TOOL_REGISTRY.find((candidate) => candidate.name === toolName);
  assert.ok(entry, `missing registry entry: ${toolName}`);

  const parsed = entry.output_schema.safeParse(body.result.structuredContent);
  assert.equal(
    parsed.success,
    true,
    parsed.success
      ? undefined
      : `${toolName} output_schema rejected structuredContent: ${parsed.error.message}`,
  );
  assert.deepEqual(
    body.result.structuredContent,
    expected,
    `${toolName} structuredContent must match the direct service result`,
  );
  assert.deepEqual(JSON.parse(body.result.content[0].text), expected);
}

function seedS42Relation(fixture: Fixture, marker: string) {
  const fromItem = createItem(fixture.db, USER_ID, {
    plain_text: `${marker} from Item`,
    item_type: 'claim',
    topic: 'MCP semantic read face',
    origin_course_id: COURSE_ID,
    origin_note_id: NEWEST_NOTE_ID,
    metadata: { source: 'mcp-transport-test', marker },
  });
  const toItem = createItem(fixture.db, USER_ID, {
    plain_text: `${marker} to Item`,
    item_type: 'evidence',
    topic: 'MCP semantic read face',
    origin_course_id: COURSE_ID,
    origin_note_id: NEWEST_NOTE_ID,
    metadata: { source: 'mcp-transport-test', marker },
  });
  const relation = createRelation(fixture.db, USER_ID, {
    from_item_id: fromItem.id,
    to_item_id: toItem.id,
    relation_type: 'supports',
    note: `${marker} Relation sentinel`,
    created_by: 'human',
  });
  return { fromItem, toItem, relation };
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

test('S4-1 tools/call list_items validates its output schema and matches the direct service', async () => {
  await withMcpHttp({}, async (fixture) => {
    createItem(fixture.db, USER_ID, {
      plain_text: 'S4-1 list Item sentinel',
      item_type: 'concept',
      topic: 'MCP read face',
      origin_course_id: COURSE_ID,
      origin_note_id: NEWEST_NOTE_ID,
      metadata: { source: 'mcp-transport-test', nested: { batch: 'S4-1' } },
    });
    const input = {
      status: 'active' as const,
      origin_course_id: COURSE_ID,
      q: 'list Item sentinel',
      limit: 25,
    };
    const expected = listItems(fixture.db, USER_ID, input);
    assert.equal(expected.length, 1, 'the direct-service positive control must be non-empty');

    const { response, body } = await mcpPost(
      fixture,
      'tools/call',
      { name: 'list_items', arguments: input },
      { id: 301, toolName: 'list_items' },
    );

    assert.equal(response.status, 200);
    assertReadToolResult('list_items', body, expected);
  });
});

test('S4-1 tools/call get_item validates its output schema and matches the direct service', async () => {
  await withMcpHttp({}, async (fixture) => {
    const item = createItem(fixture.db, USER_ID, {
      plain_text: 'S4-1 get Item sentinel',
      item_type: 'claim',
      topic: 'MCP read face',
      origin_course_id: COURSE_ID,
      origin_note_id: NEWEST_NOTE_ID,
      metadata: { source: 'mcp-transport-test', flags: ['schema', 'oracle'] },
    });
    const input = { item_id: item.id };
    const expected = getItem(fixture.db, USER_ID, input.item_id);

    const { response, body } = await mcpPost(
      fixture,
      'tools/call',
      { name: 'get_item', arguments: input },
      { id: 302, toolName: 'get_item' },
    );

    assert.equal(response.status, 200);
    assertReadToolResult('get_item', body, expected);
  });
});

test('S4-1 tools/call list_content_groups validates its output schema and matches the direct service', async () => {
  await withMcpHttp({}, async (fixture) => {
    upsertContentGroup(fixture.db, USER_ID, {
      id: 's4-1-content-group',
      project_id: COURSE_ID,
      note_id: NEWEST_NOTE_ID,
      canvas_id: 's4-1-canvas',
      title: 'S4-1 ContentGroup sentinel',
      status: 'active',
      created_by: 'human',
      placements: [{
        folder_id: 's4-1-legacy-folder',
        order_index: 0,
        added_at: '2026-08-26T12:00:00.000Z',
        added_by: 'human',
      }],
      members: [{
        id: 's4-1-content-group-member',
        kind: 'content_range',
        target_id: 's4-1-range',
        content_range: { start: 2, end: 8 },
        current_content: 'member sentinel',
        source_ref: { status: 'fresh', locator: { page: 3 } },
        source_sync_status: 'fresh',
        preview_text: 'member sentinel',
        order_index: 0,
        metadata: { source: 'mcp-transport-test' },
      }],
      identity: {
        status: 'accepted',
        type: 'concept',
        topic: 'MCP read face',
        summary: 'Hydrated ContentGroup schema control',
        created_by: 'human',
        reviewed_by: 'human',
        confidence: 0.95,
        updated_at: '2026-08-26T12:00:00.000Z',
        accepted_at: '2026-08-26T12:00:00.000Z',
        metadata: { source: 'mcp-transport-test' },
      },
      view_state: { collapsed: false },
      metadata: { source: 'mcp-transport-test' },
    });
    const input = {
      course_id: COURSE_ID,
      note_id: NEWEST_NOTE_ID,
      status: 'active' as const,
    };
    const expected = listContentGroups(fixture.db, USER_ID, input);
    assert.equal(expected.length, 1, 'the direct-service positive control must be non-empty');

    const { response, body } = await mcpPost(
      fixture,
      'tools/call',
      { name: 'list_content_groups', arguments: input },
      { id: 303, toolName: 'list_content_groups' },
    );

    assert.equal(response.status, 200);
    assertReadToolResult('list_content_groups', body, expected);
  });
});

test('S4-2 tools/call list_relations validates its output schema and matches the direct service', async () => {
  await withMcpHttp({}, async (fixture) => {
    const { fromItem, relation } = seedS42Relation(fixture, 'S4-2 list');
    const input = { item_id: fromItem.id, status: 'active' as const };
    const expected = listRelations(fixture.db, USER_ID, input);
    assert.equal(expected.length, 1, 'the direct-service positive control must be non-empty');
    assert.equal(expected[0]?.id, relation.id);

    const { response, body } = await mcpPost(
      fixture,
      'tools/call',
      { name: 'list_relations', arguments: input },
      { id: 304, toolName: 'list_relations' },
    );

    assert.equal(response.status, 200);
    assertReadToolResult('list_relations', body, expected);
  });
});

test('S4-2 tools/call get_relation validates its output schema and matches the direct service', async () => {
  await withMcpHttp({}, async (fixture) => {
    const { relation } = seedS42Relation(fixture, 'S4-2 get');
    const input = { relation_id: relation.id };
    const expected = getRelation(fixture.db, USER_ID, input.relation_id);

    const { response, body } = await mcpPost(
      fixture,
      'tools/call',
      { name: 'get_relation', arguments: input },
      { id: 305, toolName: 'get_relation' },
    );

    assert.equal(response.status, 200);
    assertReadToolResult('get_relation', body, expected);
  });
});

test('S4-2 tools/call list_relation_types validates its output schema and matches the direct service', async () => {
  await withMcpHttp({}, async (fixture) => {
    const expected = listRelationTypes();
    assert.equal(expected.length, 9, 'the static type-table positive control must be non-empty');

    const { response, body } = await mcpPost(
      fixture,
      'tools/call',
      { name: 'list_relation_types', arguments: {} },
      { id: 306, toolName: 'list_relation_types' },
    );

    assert.equal(response.status, 200);
    assertReadToolResult('list_relation_types', body, expected);
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

function installTruthWriteAudit(fixture: Fixture): void {
  fixture.db.exec(`
    CREATE TEMP TABLE selection_truth_writes (
      table_name TEXT NOT NULL,
      operation TEXT NOT NULL
    );
    CREATE TEMP TRIGGER selection_notes_insert AFTER INSERT ON notes BEGIN
      INSERT INTO selection_truth_writes VALUES ('notes', 'insert');
    END;
    CREATE TEMP TRIGGER selection_notes_update AFTER UPDATE ON notes BEGIN
      INSERT INTO selection_truth_writes VALUES ('notes', 'update');
    END;
    CREATE TEMP TRIGGER selection_notes_delete AFTER DELETE ON notes BEGIN
      INSERT INTO selection_truth_writes VALUES ('notes', 'delete');
    END;
    CREATE TEMP TRIGGER selection_blocks_insert AFTER INSERT ON note_blocks BEGIN
      INSERT INTO selection_truth_writes VALUES ('note_blocks', 'insert');
    END;
    CREATE TEMP TRIGGER selection_blocks_update AFTER UPDATE ON note_blocks BEGIN
      INSERT INTO selection_truth_writes VALUES ('note_blocks', 'update');
    END;
    CREATE TEMP TRIGGER selection_blocks_delete AFTER DELETE ON note_blocks BEGIN
      INSERT INTO selection_truth_writes VALUES ('note_blocks', 'delete');
    END;
  `);
  fixture.db.prepare('UPDATE notes SET title = title WHERE id = ?').run(NEWEST_NOTE_ID);
  fixture.db.prepare('UPDATE note_blocks SET plain_text = plain_text WHERE id = ?').run(OWNER_BLOCK_ID);
  const positiveControl = fixture.db.prepare(`
    SELECT table_name, operation FROM selection_truth_writes ORDER BY table_name
  `).all();
  assert.deepEqual(positiveControl, [
    { table_name: 'note_blocks', operation: 'update' },
    { table_name: 'notes', operation: 'update' },
  ], 'write-audit triggers must first prove they can observe both truth tables');
  fixture.db.prepare('DELETE FROM selection_truth_writes').run();
}

function truthWriteAudit(fixture: Fixture): unknown[] {
  return fixture.db.prepare(`
    SELECT table_name, operation FROM selection_truth_writes ORDER BY rowid
  `).all();
}

test('c-2 S2 invalid excerpt length reaches the real binding as a safe 400', async () => {
  await withMcpHttp({}, async (fixture) => {
    seedResolveSelectionData(fixture);
    const invalid = selectionReceipt([selectionRange({ excerpt: 'short' })]);
    const beforeReceipts = mcpReceiptCount(fixture);
    const { response, body } = await mcpPost(
      fixture,
      'tools/call',
      resolveSelectionParams(invalid),
      { id: 200, toolName: 'resolve_selection' },
    );

    assert.equal(response.status, 200);
    assert.equal(body.result.isError, true);
    assert.deepEqual(JSON.parse(body.result.content[0].text), {
      error: 'Invalid selection receipt',
      status: 400,
    });
    assert.equal(mcpReceiptCount(fixture), beforeReceipts);
    assert.equal(fixture.db.prepare(`
      SELECT id FROM operation_batches WHERE source_type = 'mcp' AND source_id = '200'
    `).get(), undefined, 'an input 400 must not create a success receipt');
  });
});

test('c-2 K-1 real Express resolves an owned current excerpt as found with its identity', async () => {
  await withMcpHttp({}, async (fixture) => {
    seedResolveSelectionData(fixture);
    const stored = fixture.db.prepare(`
      SELECT user_id, content_json FROM note_blocks WHERE id = ?
    `).get(OWNER_BLOCK_ID) as { user_id: string; content_json: string };
    const storedBody = JSON.parse(stored.content_json) as {
      text_flow: { units: Array<Record<string, unknown>> };
    };
    assert.equal(stored.user_id, USER_ID);
    assert.ok(storedBody.text_flow.units.some((unit) => (
      unit.id === ACTIVE_UNIT_ID && unit.text === ACTIVE_UNIT_TEXT && unit.status === 'active'
    )), 'database fixture must independently contain the active owner unit');

    const { response, body } = await mcpPost(
      fixture,
      'tools/call',
      resolveSelectionParams(selectionReceipt([selectionRange()])),
      { id: 201, toolName: 'resolve_selection' },
    );

    assert.equal(response.status, 200);
    assert.equal(body.error, undefined);
    assert.equal(body.result.resultType, 'complete');
    assert.deepEqual(body.result.structuredContent, {
      results: [{
        outcome: 'found',
        blockId: OWNER_BLOCK_ID,
        textFlowId: textFlowIdForBlock(OWNER_BLOCK_ID),
        textUnitId: ACTIVE_UNIT_ID,
      }],
    });
  });
});

test('c-4 T-1/K-1/K-3 trashed owned blocks collapse byte-identically with missing blocks', async () => {
  await withMcpHttp({}, (fixture) => {
    seedResolveSelectionData(fixture);
    const input = selectionReceipt([selectionRange()]);
    const active = resolveSelection(USER_ID, input);
    assert.equal(
      active.results[0]?.outcome,
      'found',
      'active owned block positive control must hit before the trashed check',
    );

    const update = fixture.db.prepare(`
      UPDATE note_blocks
      SET status = 'trashed'
      WHERE id = ? AND user_id = ?
    `).run(OWNER_BLOCK_ID, USER_ID);
    assert.equal(update.changes, 1);
    assert.deepEqual(
      fixture.db.prepare('SELECT user_id, status FROM note_blocks WHERE id = ?')
        .get(OWNER_BLOCK_ID),
      { user_id: USER_ID, status: 'trashed' },
      'fixture must independently prove the owned block is trashed',
    );

    const trashed = resolveSelection(USER_ID, input);
    assert.equal(
      trashed.results[0]?.outcome,
      'missing',
      'trashed owned block must resolve as missing',
    );

    assert.equal(
      fixture.db.prepare('SELECT id FROM note_blocks WHERE id = ?').get(MISSING_BLOCK_ID),
      undefined,
      'SQL must independently prove the comparison block is absent',
    );
    const nonexistent = resolveSelection(USER_ID, selectionReceipt([selectionRange({
      blockId: MISSING_BLOCK_ID,
      textFlowId: textFlowIdForBlock(MISSING_BLOCK_ID),
      textUnitId: 'missing-unit',
      startOffset: 0,
      endOffset: 4,
      excerpt: 'none',
    })]));
    assert.equal(
      JSON.stringify(trashed),
      JSON.stringify(nonexistent),
      'trashed and nonexistent blocks must remain byte-identical missing results',
    );
  });
});

test('c-4 T-2 active blocks stay found and become text_drifted only after text changes', async () => {
  await withMcpHttp({}, (fixture) => {
    seedResolveSelectionData(fixture);
    const input = selectionReceipt([selectionRange()]);
    assert.deepEqual(resolveSelection(USER_ID, input), {
      results: [{
        outcome: 'found',
        blockId: OWNER_BLOCK_ID,
        textFlowId: textFlowIdForBlock(OWNER_BLOCK_ID),
        textUnitId: ACTIVE_UNIT_ID,
      }],
    });

    const changedText = 'prefix replaced suffix';
    const update = fixture.db.prepare(`
      UPDATE note_blocks
      SET content_json = ?, plain_text = ?
      WHERE id = ? AND user_id = ? AND status = 'active'
    `).run(
      textFlowBody([{
        id: ACTIVE_UNIT_ID,
        text: changedText,
        status: 'active',
        order_index: 0,
      }]),
      changedText,
      OWNER_BLOCK_ID,
      USER_ID,
    );
    assert.equal(update.changes, 1);
    assert.deepEqual(
      fixture.db.prepare('SELECT user_id, status, plain_text FROM note_blocks WHERE id = ?')
        .get(OWNER_BLOCK_ID),
      { user_id: USER_ID, status: 'active', plain_text: changedText },
      'fixture must independently prove the same active block text changed',
    );

    assert.deepEqual(resolveSelection(USER_ID, input), {
      results: [{
        outcome: 'text_drifted',
        blockId: OWNER_BLOCK_ID,
        textFlowId: textFlowIdForBlock(OWNER_BLOCK_ID),
        textUnitId: ACTIVE_UNIT_ID,
      }],
    });
  });
});

test('c-2 K-2 foreign and nonexistent identities are byte-identical missing after an owner hit', async () => {
  await withMcpHttp({}, (fixture) => {
    seedResolveSelectionData(fixture);
    const owner = resolveSelection(USER_ID, selectionReceipt([selectionRange()]));
    assert.equal(owner.results[0]?.outcome, 'found', 'owner positive control must hit before missing checks');

    const foreignFact = fixture.db.prepare(`
      SELECT user_id FROM note_blocks WHERE id = ?
    `).get(INTRUDER_BLOCK_ID) as { user_id: string } | undefined;
    const absentFact = fixture.db.prepare(`
      SELECT id FROM note_blocks WHERE id = ?
    `).get(MISSING_BLOCK_ID);
    assert.deepEqual(foreignFact, { user_id: INTRUDER_USER_ID });
    assert.equal(absentFact, undefined);

    const foreign = resolveSelection(USER_ID, selectionReceipt([selectionRange({
      blockId: INTRUDER_BLOCK_ID,
      textFlowId: textFlowIdForBlock(INTRUDER_BLOCK_ID),
      textUnitId: 'intruder-unit-active',
      startOffset: 0,
      endOffset: 8,
      excerpt: 'intruder',
    })]));
    const nonexistent = resolveSelection(USER_ID, selectionReceipt([selectionRange({
      blockId: MISSING_BLOCK_ID,
      textFlowId: textFlowIdForBlock(MISSING_BLOCK_ID),
      textUnitId: 'missing-unit',
      startOffset: 0,
      endOffset: 4,
      excerpt: 'none',
    })]));

    assert.equal(JSON.stringify(foreign), JSON.stringify(nonexistent));
    assert.deepEqual(foreign, { results: [{ outcome: 'missing' }] });
  });
});

test('c-2 K-3 resolve locks the authoritative textFlowIdForBlock symbol source', async () => {
  const source = readFileSync(
    resolve(REPO_ROOT, 'server/src/services/selectionResolve.ts'),
    'utf8',
  );
  assert.match(
    source,
    /import\s+\{\s*textFlowIdForBlock\s*\}\s+from\s+'\.\/textFlowIdentity\.js';/,
    'resolve must import the authoritative server identity symbol',
  );
  assert.doesNotMatch(
    source,
    /(?:function|const)\s+textFlowIdForBlock\b/,
    'resolve must not locally rederive the identity helper',
  );
  assert.doesNotMatch(
    source,
    /(?:@shared|shared\/types)\/textFlow/,
    'resolve must not introduce the known-broken server runtime import boundary',
  );
  assert.match(source, /textFlowIdForBlock\(range\.blockId\)/);

  await withMcpHttp({}, (fixture) => {
    seedResolveSelectionData(fixture);
    assert.equal(
      resolveSelection(USER_ID, selectionReceipt([selectionRange()])).results[0]?.outcome,
      'found',
    );
    const mismatched = resolveSelection(USER_ID, selectionReceipt([selectionRange({
      textFlowId: 'textflow-not-the-block',
    })]));
    assert.deepEqual(mismatched, { results: [{ outcome: 'missing' }] });
  });
});

test('c-2 K-4 deleted units remain missing beside an active found control', async () => {
  await withMcpHttp({}, (fixture) => {
    seedResolveSelectionData(fixture);
    assert.equal(
      resolveSelection(USER_ID, selectionReceipt([selectionRange()])).results[0]?.outcome,
      'found',
    );
    const row = fixture.db.prepare('SELECT content_json FROM note_blocks WHERE id = ?')
      .get(OWNER_BLOCK_ID) as { content_json: string };
    const body = JSON.parse(row.content_json) as {
      text_flow: { units: Array<Record<string, unknown>> };
    };
    assert.ok(body.text_flow.units.some((unit) => (
      unit.id === DELETED_UNIT_ID && unit.status === 'deleted'
    )), 'raw stored TextFlow must independently contain the deleted unit');

    const deleted = resolveSelection(USER_ID, selectionReceipt([selectionRange({
      textUnitId: DELETED_UNIT_ID,
      startOffset: 0,
      endOffset: 4,
      excerpt: 'GONE',
    })]));
    assert.deepEqual(deleted, { results: [{ outcome: 'missing' }] });
  });
});

test('c-2 K-5 text_drifted requires an existing owned unit, never an absent block', async () => {
  await withMcpHttp({}, (fixture) => {
    seedResolveSelectionData(fixture);
    assert.equal(
      resolveSelection(USER_ID, selectionReceipt([selectionRange()])).results[0]?.outcome,
      'found',
    );
    assert.deepEqual(
      resolveSelection(USER_ID, selectionReceipt([selectionRange({ excerpt: 'SELECTED' })])),
      {
        results: [{
          outcome: 'text_drifted',
          blockId: OWNER_BLOCK_ID,
          textFlowId: textFlowIdForBlock(OWNER_BLOCK_ID),
          textUnitId: ACTIVE_UNIT_ID,
        }],
      },
      'an owned current unit with a mechanically different offset slice must report drift',
    );
    assert.equal(fixture.db.prepare('SELECT id FROM note_blocks WHERE id = ?')
      .get(MISSING_BLOCK_ID), undefined, 'SQL must independently prove the target block is absent');

    const missing = resolveSelection(USER_ID, selectionReceipt([selectionRange({
      blockId: MISSING_BLOCK_ID,
      textFlowId: textFlowIdForBlock(MISSING_BLOCK_ID),
      textUnitId: 'missing-unit',
      startOffset: 0,
      endOffset: 4,
      excerpt: 'none',
    })]));
    assert.deepEqual(missing, { results: [{ outcome: 'missing' }] });
  });
});

test('c-2 K-6 one malformed range cannot abort a sibling found range', async () => {
  await withMcpHttp({}, (fixture) => {
    seedResolveSelectionData(fixture);
    assert.equal(
      resolveSelection(USER_ID, selectionReceipt([selectionRange()])).results[0]?.outcome,
      'found',
    );
    const malformedFact = fixture.db.prepare(`
      SELECT content_json FROM note_blocks WHERE id = ? AND user_id = ?
    `).get(MALFORMED_BLOCK_ID, USER_ID) as { content_json: string } | undefined;
    assert.deepEqual(malformedFact, { content_json: '{broken-json' });

    const input = selectionReceipt([
      selectionRange({
        blockId: MALFORMED_BLOCK_ID,
        textFlowId: textFlowIdForBlock(MALFORMED_BLOCK_ID),
        textUnitId: 'malformed-unit',
        startOffset: 0,
        endOffset: 4,
        excerpt: 'oops',
      }),
      selectionRange(),
    ]);
    let result: ReturnType<typeof resolveSelection> | undefined;
    assert.doesNotThrow(() => {
      result = resolveSelection(USER_ID, input);
    });
    assert.deepEqual(result, {
      results: [
        { outcome: 'missing' },
        {
          outcome: 'found',
          blockId: OWNER_BLOCK_ID,
          textFlowId: textFlowIdForBlock(OWNER_BLOCK_ID),
          textUnitId: ACTIVE_UNIT_ID,
        },
      ],
    });
  });
});

test('c-2 K-7a extracted TextFlow projection remains byte-equivalent', async () => {
  await withMcpHttp({}, (fixture) => {
    const item = createItem(fixture.db, USER_ID, {
      body_json: {
        body: 'ignored projection sentinel',
        text_flow: {
          units: [
            { id: 'later', text: 'beta', status: 'active', order_index: 2 },
            null,
            { id: 'deleted', text: 'never', status: 'deleted', order_index: -1 },
            'not-an-object',
            { id: 'first', text: 'gamma', status: 'deprecated', order_index: 0 },
            { id: 'not-text', text: 42, status: 'active', order_index: 0 },
            { id: 'middle', text: '  alpha', order_index: 1 },
          ],
        },
      },
    });

    assert.equal(item.plain_text, 'gamma\n  alpha\nbeta');
    assert.equal(item.body_json.body, 'gamma\n  alpha\nbeta');
    assert.equal(
      Buffer.from(item.plain_text, 'utf8').toString('hex'),
      '67616d6d610a2020616c7068610a62657461',
    );
  });
});

test('c-2 K-7b valid TextFlow unit parsing has one production convention and two consumers', () => {
  const helperSource = readFileSync(
    resolve(REPO_ROOT, 'server/src/services/textFlowUnits.ts'),
    'utf8',
  );
  const itemsSource = readFileSync(
    resolve(REPO_ROOT, 'server/src/services/items.ts'),
    'utf8',
  );
  const resolveSource = readFileSync(
    resolve(REPO_ROOT, 'server/src/services/selectionResolve.ts'),
    'utf8',
  );
  const predicate = /([A-Za-z_$][\w$]*)\.status\s*!==\s*'deleted'\s*&&\s*typeof\s+\1\.text\s*===\s*'string'/g;
  const productSources = [
    resolve(REPO_ROOT, 'client/src'),
    resolve(REPO_ROOT, 'server/src'),
    resolve(REPO_ROOT, 'shared'),
  ].flatMap((root) => productionTypeScriptFiles(root));
  const predicateCount = productSources
    .map((path) => readFileSync(path, 'utf8').match(predicate)?.length ?? 0)
    .reduce((total, count) => total + count, 0);

  assert.equal(predicateCount, 1, 'the valid-unit predicate must have exactly one product-source copy');
  assert.match(itemsSource, /import \{ validTextFlowUnits \} from '\.\/textFlowUnits\.js';/);
  assert.match(resolveSource, /import \{ validTextFlowUnits \} from '\.\/textFlowUnits\.js';/);
  assert.doesNotMatch(itemsSource, /function\s+validTextFlowUnits\b/);
  assert.doesNotMatch(resolveSource, /function\s+validTextFlowUnits\b/);
});

test('c-2 K-8 resolve is truth-read-only and writes the normal applied immediate receipt', async () => {
  await withMcpHttp({}, (fixture) => {
    seedResolveSelectionData(fixture);
    const input = selectionReceipt([selectionRange()]);
    assert.equal(resolveSelection(USER_ID, input).results[0]?.outcome, 'found');
  });

  await withMcpHttp({}, async (fixture) => {
    seedResolveSelectionData(fixture);
    const input = selectionReceipt([selectionRange()]);
    installTruthWriteAudit(fixture);
    const notesBefore = fixture.db.prepare('SELECT * FROM notes ORDER BY id').all();
    const blocksBefore = fixture.db.prepare('SELECT * FROM note_blocks ORDER BY id').all();
    const receiptsBefore = mcpReceiptCount(fixture);

    const { response, body } = await mcpPost(
      fixture,
      'tools/call',
      resolveSelectionParams(input),
      { id: 208, toolName: 'resolve_selection' },
    );

    assert.equal(response.status, 200);
    assert.deepEqual(fixture.db.prepare('SELECT * FROM notes ORDER BY id').all(), notesBefore);
    assert.deepEqual(fixture.db.prepare('SELECT * FROM note_blocks ORDER BY id').all(), blocksBefore);
    assert.deepEqual(truthWriteAudit(fixture), [], 'independent triggers must observe no truth-table writes');
    assert.equal(mcpReceiptCount(fixture), receiptsBefore + 1);
    const receipt = receiptByCallId(fixture, '208');
    assert.equal(receipt.status, 'applied');
    assert.ok(receipt.applied_at);
    assert.equal(receipt.metadata.tool, 'resolve_selection');
    assert.equal(receipt.metadata.tier, 'immediate');
    assert.deepEqual(receipt.metadata.resources, []);
    assert.deepEqual(receipt.metadata.intended_input, input);
    assert.deepEqual(body.result.structuredContent, {
      results: [{
        outcome: 'found',
        blockId: OWNER_BLOCK_ID,
        textFlowId: textFlowIdForBlock(OWNER_BLOCK_ID),
        textUnitId: ACTIVE_UNIT_ID,
      }],
    });
  });
});

test('c-2 K-9 another user gets per-range missing while the owner still gets found', async () => {
  await withMcpHttp({}, async (fixture) => {
    const { intruderToken } = seedResolveSelectionData(fixture);
    const input = selectionReceipt([selectionRange()]);
    const ownerFact = fixture.db.prepare(`
      SELECT user_id FROM note_blocks WHERE id = ?
    `).get(OWNER_BLOCK_ID) as { user_id: string } | undefined;
    assert.deepEqual(ownerFact, { user_id: USER_ID });
    installTruthWriteAudit(fixture);
    const ownerNoteBefore = fixture.db.prepare('SELECT * FROM notes WHERE id = ?')
      .get(NEWEST_NOTE_ID);
    const ownerBlockBefore = fixture.db.prepare('SELECT * FROM note_blocks WHERE id = ?')
      .get(OWNER_BLOCK_ID);

    const ownerCall = await mcpPost(
      fixture,
      'tools/call',
      resolveSelectionParams(input),
      { id: 209, toolName: 'resolve_selection' },
    );
    assert.deepEqual(ownerCall.body.result.structuredContent, {
      results: [{
        outcome: 'found',
        blockId: OWNER_BLOCK_ID,
        textFlowId: textFlowIdForBlock(OWNER_BLOCK_ID),
        textUnitId: ACTIVE_UNIT_ID,
      }],
    }, 'owner positive control must hit before the foreign-user check');

    const intruderCall = await mcpPost(
      fixture,
      'tools/call',
      resolveSelectionParams(input),
      { id: 210, toolName: 'resolve_selection', token: intruderToken },
    );
    assert.equal(intruderCall.response.status, 200);
    assert.deepEqual(intruderCall.body.result.structuredContent, {
      results: [{ outcome: 'missing' }],
    });
    assert.deepEqual(
      fixture.db.prepare('SELECT * FROM notes WHERE id = ?').get(NEWEST_NOTE_ID),
      ownerNoteBefore,
    );
    assert.deepEqual(
      fixture.db.prepare('SELECT * FROM note_blocks WHERE id = ?').get(OWNER_BLOCK_ID),
      ownerBlockBefore,
    );
    assert.deepEqual(truthWriteAudit(fixture), [], 'independent triggers must observe no owner truth writes');
  });
});
