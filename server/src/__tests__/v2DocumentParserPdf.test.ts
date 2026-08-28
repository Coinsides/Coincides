import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { type TestContext } from 'node:test';
import type Database from 'better-sqlite3';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { closeDb, initDb } from '../db/init.js';
import { parseDocument } from '../services/documentParser.js';

const USER_ID = '6d6e2bc0-71fd-4fc4-b04a-93db2c701001';
const COURSE_ID = '6d6e2bc0-71fd-4fc4-b04a-93db2c701002';
const NATIVE_DOCUMENT_ID = '6d6e2bc0-71fd-4fc4-b04a-93db2c701003';
const OCR_DOCUMENT_ID = '6d6e2bc0-71fd-4fc4-b04a-93db2c701004';
const OCR_TEXT = 'Stubbed OCR output from the image-only PDF fixture. '.repeat(4).trim();

interface ParsedDocumentRow {
  parse_status: string;
  parse_channel: string | null;
  extracted_text: string | null;
  page_count: number | null;
  error_message: string | null;
}

interface AnthropicRequest {
  kind: 'vision' | 'summary';
  body: Record<string, unknown>;
}

interface Fixture {
  db: Database.Database;
  tempRoot: string;
}

async function withFixture(run: (fixture: Fixture) => Promise<void>): Promise<void> {
  const tempRoot = mkdtempSync(join(tmpdir(), 'coincides-document-parser-pdf-'));
  const previousVoyageKey = process.env.VOYAGE_API_KEY;
  delete process.env.VOYAGE_API_KEY;

  try {
    const db = await initDb(join(tempRoot, 'test.db'));
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, settings, created_at)
      VALUES (?, ?, 'hash', 'PDF Parser User', ?, datetime('now'))
    `).run(
      USER_ID,
      'pdf-parser@example.com',
      JSON.stringify({ ai_providers: { anthropic: { api_key: 'test-anthropic-key' } } }),
    );
    db.prepare(`
      INSERT INTO courses (id, user_id, name, created_at, updated_at)
      VALUES (?, ?, 'PDF Parser Course', datetime('now'), datetime('now'))
    `).run(COURSE_ID, USER_ID);

    await run({ db, tempRoot });
  } finally {
    closeDb();
    if (previousVoyageKey === undefined) {
      delete process.env.VOYAGE_API_KEY;
    } else {
      process.env.VOYAGE_API_KEY = previousVoyageKey;
    }
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function installAnthropicStub(t: TestContext): AnthropicRequest[] {
  const requests: AnthropicRequest[] = [];
  const fetchStub: typeof fetch = async (input, init) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
    assert.equal(url, 'https://api.anthropic.com/v1/messages');

    const bodyText = typeof init?.body === 'string'
      ? init.body
      : input instanceof Request
        ? await input.clone().text()
        : '';
    assert.notEqual(bodyText, '', 'Anthropic stub expected a JSON request body');
    const body = JSON.parse(bodyText) as Record<string, unknown>;
    const messages = body.messages as Array<{ content?: unknown }> | undefined;
    const content = messages?.[0]?.content;
    const isVision = Array.isArray(content)
      && content.some((block) => (
        typeof block === 'object'
        && block !== null
        && 'type' in block
        && block.type === 'document'
      ));
    const kind: AnthropicRequest['kind'] = isVision ? 'vision' : 'summary';
    requests.push({ kind, body });

    const text = isVision
      ? OCR_TEXT
      : JSON.stringify({ summary: 'Stubbed parser summary.', document_type: 'other' });
    return new Response(JSON.stringify({
      id: `msg_test_${requests.length}`,
      type: 'message',
      role: 'assistant',
      model: 'claude-haiku-4-5-20251001',
      content: [{ type: 'text', text }],
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: { input_tokens: 1, output_tokens: 1 },
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  t.mock.method(globalThis, 'fetch', fetchStub);
  return requests;
}

async function createNativePdf(path: string): Promise<void> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let pageNumber = 1; pageNumber <= 2; pageNumber += 1) {
    const page = pdf.addPage([612, 792]);
    for (let line = 0; line < 8; line += 1) {
      page.drawText(
        `Digital-native PDF adapter fixture page ${pageNumber}, line ${line + 1}: selectable text must stay on the native path.`,
        { x: 48, y: 730 - line * 32, size: 11, font },
      );
    }
  }
  await writeFile(path, await pdf.save());
}

async function createNativeUnreadablePdf(path: string): Promise<void> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  page.drawRectangle({
    x: 48,
    y: 540,
    width: 516,
    height: 180,
    color: rgb(0.2, 0.2, 0.2),
  });
  await writeFile(path, await pdf.save());
}

function insertDocument(
  db: Database.Database,
  input: { id: string; filename: string; filePath: string },
): void {
  db.prepare(`
    INSERT INTO documents (
      id, user_id, course_id, filename, file_path, file_type, parse_status,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'application/pdf', 'pending', datetime('now'), datetime('now'))
  `).run(input.id, USER_ID, COURSE_ID, input.filename, input.filePath);
}

function parsedDocument(db: Database.Database, documentId: string): ParsedDocumentRow {
  const row = db.prepare(`
    SELECT parse_status, parse_channel, extracted_text, page_count, error_message
    FROM documents
    WHERE id = ?
  `).get(documentId) as ParsedDocumentRow | undefined;
  assert.ok(row, `expected document ${documentId} to exist`);
  return row;
}

test('K-1 digital-native PDF stays on the native parser channel', async (t) => {
  await withFixture(async ({ db, tempRoot }) => {
    const requests = installAnthropicStub(t);
    const filePath = join(tempRoot, 'digital-native.pdf');
    await createNativePdf(filePath);
    insertDocument(db, {
      id: NATIVE_DOCUMENT_ID,
      filename: 'digital-native.pdf',
      filePath,
    });

    await parseDocument(NATIVE_DOCUMENT_ID, USER_ID);

    const row = parsedDocument(db, NATIVE_DOCUMENT_ID);
    assert.equal(row.parse_status, 'completed', row.error_message ?? undefined);
    assert.ok((row.extracted_text?.trim().length ?? 0) > 100);
    assert.ok(Number.isInteger(row.page_count) && (row.page_count ?? 0) > 0);
    assert.equal(row.parse_channel, 'native');
    assert.match(row.extracted_text ?? '', /Digital-native PDF adapter fixture/);
    assert.deepEqual(requests.map((request) => request.kind), ['summary']);
  });
});

test('K-2 native-unreadable PDF records OCR fallback without a real vision call', async (t) => {
  await withFixture(async ({ db, tempRoot }) => {
    const requests = installAnthropicStub(t);
    const filePath = join(tempRoot, 'native-unreadable.pdf');
    await createNativeUnreadablePdf(filePath);
    insertDocument(db, {
      id: OCR_DOCUMENT_ID,
      filename: 'native-unreadable.pdf',
      filePath,
    });

    await parseDocument(OCR_DOCUMENT_ID, USER_ID);

    const row = parsedDocument(db, OCR_DOCUMENT_ID);
    assert.equal(row.parse_status, 'completed', row.error_message ?? undefined);
    assert.equal(row.parse_channel, 'ocr');
    assert.equal(row.extracted_text, OCR_TEXT);
    assert.ok(Number.isInteger(row.page_count) && (row.page_count ?? 0) > 0);
    assert.deepEqual(requests.map((request) => request.kind), ['vision', 'summary']);
  });
});
