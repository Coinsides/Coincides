import test, { afterEach, beforeEach, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { closeDb, initDb } from '../db/init.js';
import { ensureSegmentsForMaterial, listCourseMaterials } from '../services/courseMaterials.js';
import { createMaterialReconciliationProposal } from '../services/materialReconciliationProposals.js';
import { createOrganizedNoteProposal } from '../services/organizedNoteProposals.js';
import type { SourceArtifact } from '../services/sourceArtifact.js';
import { intakeSourceTempFile } from '../services/sourceFileIntake.js';
import { materializeSourceNow } from '../services/sourceMaterialization.js';

// Local fixtures only. The AI drafting case stubs fetch, so no model is called.
const originalEnv = process.env;
let appDataDir: string;
beforeEach(() => {
  appDataDir = mkdtempSync(join(tmpdir(), 'coincides-f6-appdata-'));
  process.env = {
    ...originalEnv,
    COINCIDES_APP_DATA_DIR: appDataDir,
    ANTHROPIC_API_KEY: '', OPENAI_API_KEY: '', GENERIC_API_KEY: '',
    DEEPSEEK_API_KEY: '', DASHSCOPE_API_KEY: '', VOYAGE_API_KEY: '',
  };
});
afterEach(() => {
  process.env = originalEnv;
  rmSync(appDataDir, { recursive: true, force: true });
});

interface Fixture { db: Database.Database; userId: string; courseId: string; sourceRootDir: string; canvasAssetRootDir: string }
type Block = { text: string; role?: 'heading' | 'paragraph'; page?: number };

async function withFixture(run: (fixture: Fixture) => Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), 'coincides-f6-'));
  try {
    const db = await initDb(join(dir, 'test.db'));
    const userId = uuidv4();
    const courseId = uuidv4();
    db.prepare("INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, 'synthetic', 'Aftercare')")
      .run(userId, `${userId}@example.invalid`);
    db.prepare("INSERT INTO courses (id, user_id, name) VALUES (?, ?, 'Networks')").run(courseId, userId);
    await run({ db, userId, courseId, sourceRootDir: join(dir, 'source-blobs'), canvasAssetRootDir: join(dir, 'canvas-assets') });
  } finally {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  }
}

async function readySource(fixture: Fixture, filename: string, blocks: Block[]) {
  const tempDir = join(fixture.sourceRootDir, '.tmp');
  mkdirSync(tempDir, { recursive: true });
  const path = join(tempDir, `${uuidv4()}.upload`);
  const body = blocks.map((block) => block.text).join('\n\n');
  writeFileSync(path, body);
  const uploaded = await intakeSourceTempFile(fixture.db, fixture.userId, {
    course_id: fixture.courseId,
    origin_entry_kind: 'project_upload',
    file: { path, originalname: filename, mimetype: 'text/plain', size: Buffer.byteLength(body) },
  }, { rootDir: fixture.sourceRootDir });
  const artifact = {
    schema_version: 'source-artifact.v1', artifact_kind: 'document', parser_key: 'native-text', parser_version: 'builtin-v1',
    blocks: blocks.map((block, index) => ({
      artifact_block_id: `text-${index + 1}`, kind: 'text', text: block.text, writing_role: block.role ?? 'paragraph',
      page_index: null, locator: { kind: 'text_paragraph', index: index + 1 }, metadata: {},
    })),
    metadata: {},
  } as SourceArtifact;
  await materializeSourceNow(fixture.db, fixture.userId, uploaded.source.id, {
    sourceRootDir: fixture.sourceRootDir, canvasAssetRootDir: fixture.canvasAssetRootDir, parseArtifact: async () => artifact,
  });
  // Text Sources have no pages; give the projection blocks the page shape a PDF projection carries.
  const projected = fixture.db.prepare(`
    SELECT p.block_id FROM source_materializations sm
    JOIN note_block_placements p ON p.note_id = sm.projection_note_id
    WHERE sm.source_record_id = ? ORDER BY p.order_index
  `).all(uploaded.source.id) as Array<{ block_id: string }>;
  blocks.forEach((block, index) => {
    if (block.page === undefined || !projected[index]) return;
    fixture.db.prepare("UPDATE note_blocks SET metadata = json_set(metadata, '$.source_page_index', ?) WHERE id = ?")
      .run(block.page, projected[index].block_id);
  });
  return uploaded.source.id;
}

function prepareSegments(fixture: Fixture) {
  for (const material of listCourseMaterials(fixture.db, fixture.userId, fixture.courseId) as Array<{ id: string }>) {
    ensureSegmentsForMaterial(fixture.db, fixture.userId, material.id);
  }
}

type Group = { group_kind: string; evidence: Array<Record<string, any>> };

// The service refuses to create an empty proposal; that is a zero-candidate result here.
function reconcile(fixture: Fixture): Group[] {
  try {
    return (createMaterialReconciliationProposal(fixture.db, fixture.userId, { course_id: fixture.courseId }) as any)
      .data.candidate_groups as Group[];
  } catch (error) {
    if (/No reconciliation candidates found/.test(String((error as Error).message))) return [];
    throw error;
  }
}

const englishPdf: Block[] = [
  { text: 'Ports', role: 'heading', page: 1 },
  { text: 'A port names one service on a host.', page: 1 },
  { text: 'Sockets pair an address with a port.', page: 2 },
];
const chinesePdf: Block[] = [
  { text: '路由', role: 'heading', page: 1 },
  { text: '路由器为每个分组选择下一跳。', page: 1 },
  { text: '路由表记录到达各网络的出口。', page: 2 },
];

// ------------------------------------------------------------ reconcile

test('two different Sources on the same pages are never reported as one document overlapping', async () => {
  await withFixture(async (fixture) => {
    await readySource(fixture, 'english.txt', englishPdf);
    await readySource(fixture, 'chinese.txt', chinesePdf);
    const groups = reconcile(fixture);
    assert.equal(groups.filter((group) => group.group_kind === 'OVERLAP').length, 0);
  });
});

test('blocks of one Source sharing a page are not an overlap flood', async () => {
  await withFixture(async (fixture) => {
    await readySource(fixture, 'dense.txt', Array.from({ length: 12 }, (_, index) => ({ text: `Distinct statement ${index}.`, page: 1 })));
    assert.equal(reconcile(fixture).filter((group) => group.group_kind === 'OVERLAP').length, 0);
  });
});

test('a heading fragment does not pair with its own body as the same concept', async () => {
  await withFixture(async (fixture) => {
    await readySource(fixture, 'notes.md', [
      { text: 'Ports', role: 'heading' },
      { text: 'A port names one service on a host.' },
    ]);
    const sameConcept = reconcile(fixture).filter((group) => group.group_kind === 'SAME_CONCEPT_EVIDENCE');
    assert.deepEqual(sameConcept, []);
  });
});

test('the same heading across two Sources is still same-concept evidence, without the heading fragments', async () => {
  await withFixture(async (fixture) => {
    await readySource(fixture, 'first.md', [{ text: 'Ports', role: 'heading' }, { text: 'A port names one service on a host.' }]);
    await readySource(fixture, 'second.md', [{ text: 'Ports', role: 'heading' }, { text: 'Ports are sixteen-bit numbers.' }]);
    const sameConcept = reconcile(fixture).filter((group) => group.group_kind === 'SAME_CONCEPT_EVIDENCE');
    assert.equal(sameConcept.length, 1);
    assert.deepEqual(sameConcept[0].evidence.map((evidence) => evidence.excerpt).sort(),
      ['A port names one service on a host.', 'Ports are sixteen-bit numbers.']);
  });
});

test('legacy documents still report real page overlap and conflict within one document', async () => {
  await withFixture(async (fixture) => {
    const documentId = uuidv4();
    fixture.db.prepare(`
      INSERT INTO documents (id, user_id, course_id, filename, file_path, file_type, parse_status, extracted_text, page_count, chunk_count)
      VALUES (?, ?, ?, 'continuity.pdf', 'synthetic-never-read.pdf', 'pdf', 'completed', 'Continuity', 4, 2)
    `).run(documentId, fixture.userId, fixture.courseId);
    const chunk = fixture.db.prepare('INSERT INTO document_chunks (id, document_id, chunk_index, content, page_start, page_end, heading) VALUES (?, ?, ?, ?, ?, ?, ?)');
    chunk.run(uuidv4(), documentId, 0, 'A function is continuous when nearby inputs keep outputs nearby.', 1, 3, 'Continuity');
    chunk.run(uuidv4(), documentId, 1, 'A function is not continuous when nearby inputs create jumps.', 2, 4, 'Continuity');
    const kinds = reconcile(fixture).map((group) => group.group_kind);
    assert.ok(kinds.includes('OVERLAP'));
    assert.ok(kinds.includes('CONFLICT'));
  });
});

// ------------------------------------------------------- note proposal

function stubDeepSeek(t: TestContext, reply: (brief: string) => unknown) {
  process.env.DEEPSEEK_API_KEY = 'syn-f6-deepseek';
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => {
    const request = JSON.parse(init.body as string) as { messages: Array<{ role: string; content: string }> };
    const brief = request.messages.find((message) => message.role === 'user')?.content ?? '';
    const content = JSON.stringify(reply(brief));
    return new Response(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\ndata: [DONE]\n\n`);
  });
}

function segmentNumber(brief: string, title: string): number {
  const match = new RegExp(`\\[S(\\d+)\\] Segment: ${title.replace(/\./g, '\\.')}\\n`).exec(brief);
  assert.ok(match, `brief numbers segment ${title}`);
  return Number(match[1]);
}

test('AI-drafted blocks cite only the segments they were drawn from', async (t) => {
  await withFixture(async (fixture) => {
    const english = await readySource(fixture, 'english.txt', englishPdf);
    const chinese = await readySource(fixture, 'chinese.txt', chinesePdf);
    prepareSegments(fixture);
    stubDeepSeek(t, (brief) => ({ blocks: [
      { block_type: 'toc', content_json: {}, plain_text: '' },
      { block_type: 'paragraph', plain_text: 'Ports identify services.', source_segments: [segmentNumber(brief, 'english.txt')] },
      { block_type: 'paragraph', plain_text: '路由选择下一跳。', source_segments: [segmentNumber(brief, 'chinese.txt')] },
      { block_type: 'paragraph', plain_text: 'An unattributed summary.' },
      { block_type: 'paragraph', plain_text: 'A bad attribution.', source_segments: [999] },
    ] }));

    const created = await createOrganizedNoteProposal(fixture.db, fixture.userId, { course_id: fixture.courseId }) as { id: string };
    const row = fixture.db.prepare('SELECT data FROM proposals WHERE id = ?').get(created.id) as { data: string };
    const blocks = JSON.parse(row.data).blocks as Array<{ plain_text: string; source_references: Array<Record<string, any>>; warnings: string[] }>;
    const byText = (text: string) => blocks.find((block) => block.plain_text === text)!;

    const toc = blocks.find((block) => block.plain_text === '')!;
    assert.deepEqual(toc.source_references, []);
    const ports = byText('Ports identify services.');
    const routing = byText('路由选择下一跳。');
    assert.ok(ports.source_references.length > 0 && ports.source_references.every((ref) => ref.source_record_id === english));
    assert.ok(routing.source_references.length > 0 && routing.source_references.every((ref) => ref.source_record_id === chinese));
    assert.notDeepEqual(ports.source_references, routing.source_references);
    for (const text of ['An unattributed summary.', 'A bad attribution.']) {
      assert.deepEqual(byText(text).source_references, [], `${text} carries no borrowed citation`);
      assert.ok(byText(text).warnings.includes('No source segment was attributed to this block.'));
    }
  });
});

test('the deterministic drafter still cites each segment for its own blocks', async () => {
  await withFixture(async (fixture) => {
    const english = await readySource(fixture, 'english.txt', englishPdf);
    prepareSegments(fixture);
    const created = await createOrganizedNoteProposal(fixture.db, fixture.userId, { course_id: fixture.courseId }) as { id: string };
    const row = fixture.db.prepare('SELECT data FROM proposals WHERE id = ?').get(created.id) as { data: string };
    const blocks = JSON.parse(row.data).blocks as Array<{ block_type: string; source_references: Array<Record<string, any>> }>;
    const cited = blocks.filter((block) => block.block_type !== 'toc');
    assert.ok(cited.length > 0);
    assert.ok(cited.every((block) => block.source_references.length > 0
      && block.source_references.every((ref) => ref.source_record_id === english)));
  });
});
