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
import { supportsFormElicitation } from '../mcp/policy.js';
import {
  createMcpHostOriginGuard,
  createMcpRequestHandler,
  dispatchToolCall,
} from '../mcp/transport.js';
import noteRoutes from '../routes/notes.js';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const COURSE_ID = '22222222-2222-4222-8222-222222222222';
const MODERN_PROTOCOL_VERSION = '2026-07-28';
const PROTOCOL_VERSION_KEY = 'io.modelcontextprotocol/protocolVersion';
const CLIENT_CAPABILITIES_KEY = 'io.modelcontextprotocol/clientCapabilities';
const CLIENT_INFO_KEY = 'io.modelcontextprotocol/clientInfo';

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
      '33333333-3333-4333-8333-333333333333', USER_ID, COURSE_ID,
      'Older note', null, 'active', 'manual', 'flow',
      '{"marker":"older"}', '2026-08-23 08:01:00', '2026-08-23 08:02:00', 'user',
    );
    insertNote.run(
      '44444444-4444-4444-8444-444444444444', USER_ID, COURSE_ID,
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

async function mcpPost(
  fixture: Fixture,
  method: 'tools/list' | 'tools/call',
  params: Record<string, unknown>,
  options: { id?: number; capabilities?: Record<string, unknown>; toolName?: string } = {},
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
        _meta: envelope(options.capabilities),
      },
    }),
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

test('K-5 confirm without elicitation.form downgrades to an unexecuted proposed receipt', async () => {
  const confirmEntry = cloneEntry(canonicalManifest()[0], {
    name: 'confirm_probe',
    tier: 'confirm',
  });
  let executions = 0;
  const bindings = new Map<string, ToolBinding>([
    ['confirm_probe', async () => {
      executions += 1;
      return [];
    }],
  ]);

  assert.equal(supportsFormElicitation(envelope()), false);
  assert.equal(supportsFormElicitation(envelope({ elicitation: { form: {} } })), true);

  await withMcpHttp({}, async (fixture) => {
    const unsupported = await dispatchToolCall(
      confirmEntry,
      bindings.get('confirm_probe')!,
      { course_id: COURSE_ID },
      USER_ID,
      { callId: '50', envelope: envelope() },
    );
    assert.match(unsupported.content[0].type === 'text' ? unsupported.content[0].text : '', /proposal for human review/);
    assert.equal(executions, 0);

    const receipt = fixture.db.prepare(`
      SELECT status, source_id, applied_at, metadata
      FROM operation_batches
      WHERE source_type = 'mcp'
    `).get() as { status: string; source_id: string; applied_at: string | null; metadata: string };
    assert.equal(receipt.status, 'proposed');
    assert.equal(receipt.source_id, '50');
    assert.equal(receipt.applied_at, null);
    assert.deepEqual(JSON.parse(receipt.metadata).resources, []);
    assert.equal(JSON.parse(receipt.metadata).tier, 'propose');

    await assert.rejects(
      dispatchToolCall(
        confirmEntry,
        bindings.get('confirm_probe')!,
        { course_id: COURSE_ID },
        USER_ID,
        { callId: '51', envelope: envelope({ elicitation: { form: {} } }) },
      ),
      /approved elicitation schema/,
    );
    assert.equal(executions, 0, 'unsupported production confirmation seam must not execute');
    const finalCount = fixture.db.prepare(`
      SELECT COUNT(*) AS count FROM operation_batches WHERE source_type = 'mcp'
    `).get() as { count: number };
    assert.equal(finalCount.count, 1);
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
