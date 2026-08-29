import test from 'node:test';
import assert from 'node:assert/strict';
import {
  existsSync,
  readFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { v4 as uuidv4 } from 'uuid';
import { closeDb, initDb } from '../db/init.js';
import type { SourceArtifact } from '../services/sourceArtifact.js';
import { intakeSourceTempFile } from '../services/sourceFileIntake.js';
import {
  getImprintFragmentsByAnchor,
  storeSourceImprint,
  validateSourceImprint,
  type SourceImprintInput,
} from '../services/sourceImprints.js';
import { materializeSourceNow } from '../services/sourceMaterialization.js';
import {
  canonicalizeSourceText,
  nonWhitespaceText,
} from '../services/sourceTextCanonical.js';

async function makePdf(pageTexts: string[]): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (const text of pageTexts) {
    const page = pdf.addPage([595, 842]);
    page.drawText(text, { x: 72, y: 760, size: 14, font });
  }
  return Buffer.from(await pdf.save());
}

type TestDb = Awaited<ReturnType<typeof initDb>>;

function seedUserCourse(db: TestDb) {
  const userId = uuidv4();
  const courseId = uuidv4();
  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `).run(userId, `${userId}@example.com`, 'hash', 'T0 Alignment User');
  db.prepare(`
    INSERT INTO courses (id, user_id, name, created_at, updated_at)
    VALUES (?, ?, ?, datetime('now'), datetime('now'))
  `).run(courseId, userId, 'T0 Alignment Project');
  return { userId, courseId };
}

async function intakeFixture(
  db: TestDb,
  userId: string,
  courseId: string,
  rootDir: string,
  filename: string,
  mimeType: string,
  contents: Buffer | string,
) {
  const tempDir = join(rootDir, '.tmp');
  const uploadPath = join(tempDir, `${uuidv4()}.upload`);
  mkdirSync(tempDir, { recursive: true });
  writeFileSync(uploadPath, contents);
  return intakeSourceTempFile(db, userId, {
    course_id: courseId,
    origin_entry_kind: 'project_upload',
    file: {
      path: uploadPath,
      originalname: filename,
      mimetype: mimeType,
      size: Buffer.byteLength(contents),
    },
  }, { rootDir });
}

test('K-1 a real two-page PDF materialization stores one accepted page-anchored SourceArtifact imprint', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'coincides-source-t0-alignment-'));
  const rootDir = join(dir, 'source-blobs');
  const canvasAssetRootDir = join(dir, 'canvas-assets');
  const tempDir = join(rootDir, '.tmp');
  const uploadPath = join(tempDir, `${uuidv4()}.upload`);
  const pdf = await makePdf(['First PDF page', 'Second PDF page']);

  try {
    mkdirSync(tempDir, { recursive: true });
    writeFileSync(uploadPath, pdf);
    const db = await initDb(join(dir, 'test.db'));
    const userId = uuidv4();
    const courseId = uuidv4();
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(userId, `${userId}@example.com`, 'hash', 'T0 Alignment User');
    db.prepare(`
      INSERT INTO courses (id, user_id, name, created_at, updated_at)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
    `).run(courseId, userId, 'T0 Alignment Project');

    const intake = await intakeSourceTempFile(db, userId, {
      course_id: courseId,
      origin_entry_kind: 'project_upload',
      file: {
        path: uploadPath,
        originalname: 'two-pages.pdf',
        mimetype: 'application/pdf',
        size: pdf.length,
      },
    }, { rootDir });

    assert.equal(
      (db.prepare('SELECT COUNT(*) AS count FROM source_imprints WHERE source_file_id = ? AND user_id = ?')
        .get(intake.source.file.id, userId) as { count: number }).count,
      0,
      'intake must not run the requisition-time imprint process',
    );

    const materialized = await materializeSourceNow(db, userId, intake.source.id, {
      sourceRootDir: rootDir,
      canvasAssetRootDir,
    });
    assert.equal(materialized.status, 'materialized');

    const imprints = db.prepare(`
      SELECT *
      FROM source_imprints
      WHERE source_file_id = ? AND user_id = ?
      ORDER BY created_at ASC, id ASC
    `).all(intake.source.file.id, userId) as Array<Record<string, unknown>>;
    assert.equal(imprints.length, 1, 'the materialization must store exactly one SourceArtifact imprint');

    const imprint = imprints[0];
    assert.equal(imprint.status, 'accepted');
    assert.equal(imprint.transcriber_name, intake.source.materialization.parser_key);
    assert.equal(imprint.transcriber_version, intake.source.materialization.parser_version);
    assert.equal(imprint.transcriber_lockfile, 'server/package-lock.json');
    assert.equal(imprint.anchor_fidelity, 'page');
    assert.equal(imprint.text_normalization, 'whitespace');

    const fragments = db.prepare(`
      SELECT seq, role, anchor_json
      FROM imprint_fragments
      WHERE imprint_id = ?
      ORDER BY seq ASC
    `).all(imprint.id) as Array<{ seq: number; role: string; anchor_json: string }>;
    assert.equal(fragments.length > 0, true);
    assert.deepEqual(fragments.map((fragment) => fragment.seq), fragments.map((_, index) => index));
    assert.equal(fragments.every((fragment) => ['para', 'heading'].includes(fragment.role)), true);
    assert.deepEqual(
      fragments.map((fragment) => JSON.parse(fragment.anchor_json)),
      [
        { family: 'page', page: 1, block_index: 1 },
        { family: 'page', page: 2, block_index: 1 },
      ],
    );
  } finally {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('K-1b real DOCX, TXT, and Markdown materializations use honest flow anchors without synthetic pages', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'coincides-source-t0-flow-'));
  const rootDir = join(dir, 'source-blobs');
  const canvasAssetRootDir = join(dir, 'canvas-assets');

  try {
    const db = await initDb(join(dir, 'test.db'));
    const { userId, courseId } = seedUserCourse(db);
    const fixtures = [
      {
        filename: 'single-paragraph.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        contents: readFileSync(new URL(
          '../../node_modules/mammoth/test/test-data/single-paragraph.docx',
          import.meta.url,
        )),
      },
      {
        filename: 'notes.txt',
        mimeType: 'text/plain',
        contents: 'Alpha paragraph\n\nBeta paragraph',
      },
      {
        filename: 'notes.md',
        mimeType: 'text/markdown',
        contents: '# Heading\n\nBody paragraph',
      },
    ];

    for (const fixture of fixtures) {
      const intake = await intakeFixture(
        db,
        userId,
        courseId,
        rootDir,
        fixture.filename,
        fixture.mimeType,
        fixture.contents,
      );
      const materialized = await materializeSourceNow(db, userId, intake.source.id, {
        sourceRootDir: rootDir,
        canvasAssetRootDir,
      });
      assert.equal(materialized.status, 'materialized');

      const imprints = db.prepare(`
        SELECT *
        FROM source_imprints
        WHERE source_file_id = ? AND user_id = ?
          AND transcriber_name = ?
        ORDER BY created_at ASC, id ASC
      `).all(
        intake.source.file.id,
        userId,
        intake.source.materialization.parser_key,
      ) as Array<Record<string, unknown>>;
      assert.equal(imprints.length, 1, `${fixture.filename} must produce one format-honest imprint`);
      assert.equal(imprints[0].status, 'accepted');
      assert.equal(imprints[0].anchor_fidelity, 'element');
      assert.equal(imprints[0].text_normalization, 'whitespace');

      const anchors = db.prepare(`
        SELECT anchor_json
        FROM imprint_fragments
        WHERE imprint_id = ?
        ORDER BY seq ASC
      `).all(imprints[0].id) as Array<{ anchor_json: string }>;
      assert.equal(anchors.length > 0, true);
      assert.equal(anchors.every(({ anchor_json }) => {
        const anchor = JSON.parse(anchor_json) as Record<string, unknown>;
        return anchor.family === 'flow'
          && typeof anchor.path === 'string'
          && !Object.prototype.hasOwnProperty.call(anchor, 'page');
      }), true);
    }
  } finally {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('K-1c page block_index keeps multiple same-page fragments uniquely addressable', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'coincides-source-t0-page-blocks-'));
  const rootDir = join(dir, 'source-blobs');
  const canvasAssetRootDir = join(dir, 'canvas-assets');

  try {
    const db = await initDb(join(dir, 'test.db'));
    const { userId, courseId } = seedUserCourse(db);
    const pdf = await makePdf(['Source page']);
    const intake = await intakeFixture(
      db,
      userId,
      courseId,
      rootDir,
      'same-page-blocks.pdf',
      'application/pdf',
      pdf,
    );
    const artifact: SourceArtifact = {
      schema_version: 'source-artifact.v1',
      artifact_kind: 'document',
      parser_key: 'native-pdf',
      parser_version: '2.4.5',
      blocks: [
        {
          artifact_block_id: 'pdf-page-1-block-1',
          kind: 'text',
          text: 'First paragraph',
          writing_role: 'paragraph',
          page_index: 1,
          locator: { kind: 'pdf_page', page_index: 1, block_index: 1 },
          metadata: {},
        },
        {
          artifact_block_id: 'pdf-page-1-block-2',
          kind: 'text',
          text: 'Second paragraph',
          writing_role: 'paragraph',
          page_index: 1,
          locator: { kind: 'pdf_page', page_index: 1, block_index: 2 },
          metadata: {},
        },
      ],
      metadata: {},
    };

    const materialized = await materializeSourceNow(db, userId, intake.source.id, {
      sourceRootDir: rootDir,
      canvasAssetRootDir,
      parseArtifact: async () => artifact,
    });
    assert.equal(materialized.status, 'materialized');

    const imprint = db.prepare(`
      SELECT id, status
      FROM source_imprints
      WHERE source_file_id = ? AND user_id = ? AND transcriber_name = 'native-pdf'
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `).get(intake.source.file.id, userId) as { id: string; status: string };
    assert.equal(imprint.status, 'accepted');
    const anchors = db.prepare(`
      SELECT anchor_json
      FROM imprint_fragments
      WHERE imprint_id = ?
      ORDER BY seq ASC
    `).all(imprint.id) as Array<{ anchor_json: string }>;
    assert.deepEqual(anchors.map(({ anchor_json }) => JSON.parse(anchor_json)), [
      { family: 'page', page: 1, block_index: 1 },
      { family: 'page', page: 1, block_index: 2 },
    ]);
    const first = getImprintFragmentsByAnchor(db, userId, imprint.id, {
      match: 'exact',
      anchor: { family: 'page', page: 1, block_index: 1 },
    });
    const second = getImprintFragmentsByAnchor(db, userId, imprint.id, {
      match: 'exact',
      anchor: { family: 'page', page: 1, block_index: 2 },
    });
    assert.deepEqual(first.map((fragment) => fragment.text), ['First paragraph']);
    assert.deepEqual(second.map((fragment) => fragment.text), ['Second paragraph']);
  } finally {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('K-2 whitespace normalization preserves the complete non-whitespace byte sequence across splitting', () => {
  const reference = '第一段文字。\n\n第二段文字。';
  const fragments = ['第一段文字。', '第二段文字。'];
  const delivered = fragments.join('');

  assert.equal(
    Buffer.from(canonicalizeSourceText(delivered, 'whitespace'), 'utf8').equals(
      Buffer.from(canonicalizeSourceText(reference, 'whitespace'), 'utf8'),
    ),
    true,
  );
});

test('K-3 deleting one non-whitespace byte trips the PDF split invariant', async () => {
  const reference = 'AlphaBeta';
  const fragmentsWithOneByteMissing = ['Alphaeta'];
  assert.equal(
    Buffer.from(
      canonicalizeSourceText(fragmentsWithOneByteMissing.join(''), 'whitespace'),
      'utf8',
    ).equals(Buffer.from(canonicalizeSourceText(reference, 'whitespace'), 'utf8')),
    false,
  );
  const sourceArtifact = readFileSync(
    new URL('../services/sourceArtifact.ts', import.meta.url),
    'utf8',
  );
  assert.match(
    sourceArtifact,
    /canonicalizeSourceText\(deliveredPageText, 'whitespace'\)/u,
  );
  assert.match(
    sourceArtifact,
    /canonicalizeSourceText\(page\.text, 'whitespace'\)/u,
  );

  const dir = mkdtempSync(join(tmpdir(), 'coincides-source-t0-k3-'));
  const rootDir = join(dir, 'source-blobs');
  const canvasAssetRootDir = join(dir, 'canvas-assets');

  try {
    const db = await initDb(join(dir, 'test.db'));
    const { userId, courseId } = seedUserCourse(db);
    const pdf = await makePdf([reference]);
    const intake = await intakeFixture(
      db,
      userId,
      courseId,
      rootDir,
      'k3-byte-loss.pdf',
      'application/pdf',
      pdf,
    );
    const materialized = await materializeSourceNow(db, userId, intake.source.id, {
      sourceRootDir: rootDir,
      canvasAssetRootDir,
    });
    assert.equal(materialized.status, 'materialized');
  } finally {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  }
});

// Structural lock only: this proves shared canonicalizer provenance, not runtime equivalence.
test('K-4 producer and validator import the same shared canonicalizer', () => {
  const sourceArtifact = readFileSync(
    new URL('../services/sourceArtifact.ts', import.meta.url),
    'utf8',
  );
  const sourceImprints = readFileSync(
    new URL('../services/sourceImprints.ts', import.meta.url),
    'utf8',
  );
  const sharedCanonicalImport = /import\s*\{[^}]*\bcanonicalizeSourceText\b[^}]*\}\s*from '\.\/sourceTextCanonical\.js';/su;

  assert.match(sourceArtifact, sharedCanonicalImport);
  assert.match(sourceImprints, sharedCanonicalImport);
  assert.equal((sourceArtifact.match(/\bcanonicalizeSourceText\(/gu) || []).length >= 2, true);
  assert.equal((sourceImprints.match(/\bcanonicalizeSourceText\(/gu) || []).length >= 1, true);
  assert.doesNotMatch(sourceArtifact, /function\s+normalizeText\b/u);
  assert.doesNotMatch(sourceImprints, /function\s+normalizeText\b/u);
});

test('K-5 whitespace canonicalization keeps its non-whitespace meta-invariant resident', () => {
  const source = 'a A\r\n\t中文 空格';
  const input = {
    source_file_id: 'meta-invariant-source',
    transcriber: {
      name: 'meta-invariant-probe',
      version: '1.0.0',
      lockfile: 'server/package-lock.json',
    },
    anchor_fidelity: 'char',
    text_normalization: 'whitespace',
    fragments: [{
      seq: 0,
      text: source,
      role: 'para',
      anchor: { family: 'flow', path: 'body', char: [0, source.length] },
    }],
    warnings: [],
  } satisfies SourceImprintInput;
  const validation = validateSourceImprint(input, source);
  assert.equal(validation.accepted, true, JSON.stringify(validation.reasons));

  const samples = [
    source,
    'alpha beta',
    '第一段\n\n第二段',
    '\t \r\n',
    '',
  ];
  for (const sample of samples) {
    assert.equal(
      Buffer.from(
        nonWhitespaceText(canonicalizeSourceText(sample, 'whitespace')),
        'utf8',
      ).equals(Buffer.from(nonWhitespaceText(sample), 'utf8')),
      true,
      `meta-invariant failed for ${JSON.stringify(sample)}`,
    );
  }
});

test('K-6 none normalization remains byte-exact and rejects whitespace loss', () => {
  const source = 'A B\r\nC';
  assert.equal(
    Buffer.from(canonicalizeSourceText(source, 'none'), 'utf8').equals(
      Buffer.from(source, 'utf8'),
    ),
    true,
  );

  const inputFor = (text: string): SourceImprintInput => ({
    source_file_id: 'none-normalization-source',
    transcriber: {
      name: 'none-normalization-probe',
      version: '1.0.0',
      lockfile: 'server/package-lock.json',
    },
    anchor_fidelity: 'char',
    text_normalization: 'none',
    fragments: [{
      seq: 0,
      text,
      role: 'para',
      anchor: { family: 'flow', path: 'body', char: [0, source.length] },
    }],
    warnings: [],
  });

  assert.equal(validateSourceImprint(inputFor(source), source).accepted, true);
  const whitespaceLost = validateSourceImprint(inputFor('ABC'), source);
  assert.equal(whitespaceLost.accepted, false);
  assert.equal(
    whitespaceLost.reasons.some((reason) => reason.code === 'fidelity_mismatch'),
    true,
  );
});

test('K-7 pdf-parse uses its bundled v2 types without the legacy ambient declaration', () => {
  const sourceArtifact = readFileSync(
    new URL('../services/sourceArtifact.ts', import.meta.url),
    'utf8',
  );
  const legacyDeclaration = new URL('../types/pdf-parse.d.ts', import.meta.url);

  assert.match(sourceArtifact, /import\s*\{\s*PDFParse\s*\}\s*from 'pdf-parse';/u);
  assert.doesNotMatch(sourceArtifact, /await\s+import\('pdf-parse'\)/u);
  assert.equal(existsSync(legacyDeclaration), false);
});

test('K-8 block_index is page disambiguation while bbox remains a fidelity overclaim', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'coincides-source-t0-k8-'));
  const rootDir = join(dir, 'source-blobs');

  try {
    const db = await initDb(join(dir, 'test.db'));
    const { userId, courseId } = seedUserCourse(db);
    const pdf = await makePdf(['Anchor source']);
    const intake = await intakeFixture(
      db,
      userId,
      courseId,
      rootDir,
      'k8-anchor.pdf',
      'application/pdf',
      pdf,
    );
    const baseInput: SourceImprintInput = {
      source_file_id: intake.source.file.id,
      transcriber: {
        name: 'k8-anchor-probe',
        version: '1.0.0',
        lockfile: 'server/package-lock.json',
      },
      anchor_fidelity: 'page',
      text_normalization: 'whitespace',
      fragments: [{
        seq: 0,
        text: 'Anchor source',
        role: 'para',
        anchor: { family: 'page', page: 1, block_index: 0 },
      }],
      warnings: [],
    };

    const accepted = storeSourceImprint(db, userId, baseInput, { rootDir });
    assert.equal(accepted.imprint.status, 'accepted');
    assert.deepEqual(accepted.fragments[0].anchor, {
      family: 'page',
      page: 1,
      block_index: 0,
    });
    const exact = getImprintFragmentsByAnchor(db, userId, accepted.imprint.id, {
      match: 'exact',
      anchor: { family: 'page', page: 1, block_index: 0 },
    });
    assert.equal(exact.length, 1);
    assert.equal(exact[0].text, 'Anchor source');

    const bboxOverclaim: SourceImprintInput = {
      ...baseInput,
      transcriber: { ...baseInput.transcriber, name: 'k8-bbox-overclaim-probe' },
      fragments: [{
        ...baseInput.fragments[0],
        anchor: {
          family: 'page',
          page: 1,
          block_index: 0,
          bbox: [0, 0, 1, 1],
        },
      }],
    };
    const rejected = storeSourceImprint(db, userId, bboxOverclaim, { rootDir });
    assert.equal(rejected.imprint.status, 'rejected');
    assert.equal(
      rejected.imprint.rejection_reasons.some((reason) => reason.code === 'fidelity_overclaim'),
      true,
    );

    const invalidBlockIndex = validateSourceImprint({
      ...baseInput,
      fragments: [{
        ...baseInput.fragments[0],
        anchor: { family: 'page', page: 1, block_index: -1 },
      }],
    }, null);
    assert.equal(invalidBlockIndex.accepted, false);
    assert.equal(
      invalidBlockIndex.reasons.some((reason) => reason.code === 'anchor_invalid'),
      true,
    );
  } finally {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  }
});
