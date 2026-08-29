import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { closeDb, initDb } from '../db/init.js';
import { errorHandler } from '../middleware/errorHandler.js';
import sourceRoutes from '../routes/sources.js';
import {
  SOURCE_INTAKE_DECLARATION_CODES,
  getSourceRecordDetail,
  intakeSourceTempFile,
} from '../services/sourceFileIntake.js';
import {
  SOURCE_IMPRINT_REJECTION_CODES,
  SOURCE_IMPRINT_WARNING_CODES,
  storeSourceImprint,
} from '../services/sourceImprints.js';

type TestDb = Awaited<ReturnType<typeof initDb>>;

interface IntakeFixture {
  filename: string;
  mimeType: string;
  bytes: Buffer;
}

const KNOWN_BASELINE_FIXTURES: IntakeFixture[] = [
  {
    filename: 'known.pdf',
    mimeType: 'application/pdf',
    bytes: Buffer.from('%PDF-1.7\nknown-pdf'),
  },
  {
    filename: 'known.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    bytes: Buffer.from('PK\u0003\u0004known-docx'),
  },
  { filename: 'known.txt', mimeType: 'text/plain', bytes: Buffer.from('known txt\n') },
  { filename: 'known.md', mimeType: 'text/markdown', bytes: Buffer.from('# known md\n') },
  { filename: 'known.markdown', mimeType: 'text/plain', bytes: Buffer.from('# known markdown\n') },
  {
    filename: 'known.png',
    mimeType: 'image/png',
    bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01]),
  },
  {
    filename: 'known.jpg',
    mimeType: 'image/jpeg',
    bytes: Buffer.from([0xff, 0xd8, 0xff, 0x01]),
  },
  {
    filename: 'known.jpeg',
    mimeType: 'image/jpeg',
    bytes: Buffer.from([0xff, 0xd8, 0xff, 0x02]),
  },
  {
    filename: 'known.webp',
    mimeType: 'image/webp',
    bytes: Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBPknown')]),
  },
  {
    filename: 'known.pptx',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    bytes: Buffer.from('PK\u0003\u0004known-pptx'),
  },
  {
    filename: 'known.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    bytes: Buffer.from('PK\u0003\u0004known-xlsx'),
  },
  { filename: 'known.csv', mimeType: 'text/csv', bytes: Buffer.from('name,value\nknown,1\n') },
];

// Captured from the unmodified known-format intake path before the never-reject implementation.
const K6_KNOWN_FORMAT_BASELINE = [
  {
    created: true,
    deduplicated: false,
    file: {
      original_filename: 'known.pdf', mime_type: 'application/pdf', byte_size: 18,
      storage_state: 'ready', content_hash: 'c3306f9386647b931a05c4ac54e4b9ba508e2bb2760eacd6057dd6c1f2265dc9',
      format: 'pdf', capability: 'materializable', blob_available: true, issue: null,
      intake_declarations: [],
    },
    materialization: {
      parser_key: 'native-pdf', parser_version: '2.4.5', status: 'received', attempt_count: 0,
      projection_available: false, error_code: null, error_message: null, retryable: false,
    },
    imprint_count: 0, fragment_count: 0, intake_declarations_json: '[]',
  },
  {
    created: true,
    deduplicated: false,
    file: {
      original_filename: 'known.docx',
      mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      byte_size: 14, storage_state: 'ready',
      content_hash: '64374fcbcb438d70514dcc24a07b0436162c70e01c64652fd2c534a0103143ee',
      format: 'docx', capability: 'materializable', blob_available: true, issue: null,
      intake_declarations: [],
    },
    materialization: {
      parser_key: 'native-docx', parser_version: '1.12.0', status: 'received', attempt_count: 0,
      projection_available: false, error_code: null, error_message: null, retryable: false,
    },
    imprint_count: 0, fragment_count: 0, intake_declarations_json: '[]',
  },
  {
    created: true,
    deduplicated: false,
    file: {
      original_filename: 'known.txt', mime_type: 'text/plain', byte_size: 10,
      storage_state: 'ready', content_hash: '96d44e919ca9f42a87143c20903c0f868036ba46ffd9a96b1d0b69fc20f43e83',
      format: 'txt', capability: 'materializable', blob_available: true, issue: null,
      intake_declarations: [],
    },
    materialization: {
      parser_key: 'native-text', parser_version: 'utf8-v1', status: 'received', attempt_count: 0,
      projection_available: false, error_code: null, error_message: null, retryable: false,
    },
    imprint_count: 0, fragment_count: 0, intake_declarations_json: '[]',
  },
  {
    created: true,
    deduplicated: false,
    file: {
      original_filename: 'known.md', mime_type: 'text/markdown', byte_size: 11,
      storage_state: 'ready', content_hash: 'f40701b7b01bac27d88032b0e25799e783ea3f11a220ec697dc85196187174b5',
      format: 'md', capability: 'materializable', blob_available: true, issue: null,
      intake_declarations: [],
    },
    materialization: {
      parser_key: 'native-text', parser_version: 'utf8-v1', status: 'received', attempt_count: 0,
      projection_available: false, error_code: null, error_message: null, retryable: false,
    },
    imprint_count: 0, fragment_count: 0, intake_declarations_json: '[]',
  },
  {
    created: true,
    deduplicated: false,
    file: {
      original_filename: 'known.markdown', mime_type: 'text/plain', byte_size: 17,
      storage_state: 'ready', content_hash: '1952bce98d07807006cbb1097a270e2c2f3ff359a2a08f46dab49f1aefe3d0a8',
      format: 'md', capability: 'materializable', blob_available: true, issue: null,
      intake_declarations: [],
    },
    materialization: {
      parser_key: 'native-text', parser_version: 'utf8-v1', status: 'received', attempt_count: 0,
      projection_available: false, error_code: null, error_message: null, retryable: false,
    },
    imprint_count: 0, fragment_count: 0, intake_declarations_json: '[]',
  },
  {
    created: true,
    deduplicated: false,
    file: {
      original_filename: 'known.png', mime_type: 'image/png', byte_size: 9,
      storage_state: 'ready', content_hash: '275f1bcbbb585c71e3b2184304eccfa0e37de92022ca3b6f4e9c10df32318d85',
      format: 'png', capability: 'materializable', blob_available: true, issue: null,
      intake_declarations: [],
    },
    materialization: {
      parser_key: 'native-image', parser_version: 'passthrough-v1', status: 'received', attempt_count: 0,
      projection_available: false, error_code: null, error_message: null, retryable: false,
    },
    imprint_count: 0, fragment_count: 0, intake_declarations_json: '[]',
  },
  {
    created: true,
    deduplicated: false,
    file: {
      original_filename: 'known.jpg', mime_type: 'image/jpeg', byte_size: 4,
      storage_state: 'ready', content_hash: '2501302c0464719ae433103d7f70c01350d8dceee909f52197fe284905e20a96',
      format: 'jpeg', capability: 'materializable', blob_available: true, issue: null,
      intake_declarations: [],
    },
    materialization: {
      parser_key: 'native-image', parser_version: 'passthrough-v1', status: 'received', attempt_count: 0,
      projection_available: false, error_code: null, error_message: null, retryable: false,
    },
    imprint_count: 0, fragment_count: 0, intake_declarations_json: '[]',
  },
  {
    created: true,
    deduplicated: false,
    file: {
      original_filename: 'known.jpeg', mime_type: 'image/jpeg', byte_size: 4,
      storage_state: 'ready', content_hash: 'e5e81de05171c7a1cfcaf20763c22c006f68dd669ffc31ea1c903b9475af7665',
      format: 'jpeg', capability: 'materializable', blob_available: true, issue: null,
      intake_declarations: [],
    },
    materialization: {
      parser_key: 'native-image', parser_version: 'passthrough-v1', status: 'received', attempt_count: 0,
      projection_available: false, error_code: null, error_message: null, retryable: false,
    },
    imprint_count: 0, fragment_count: 0, intake_declarations_json: '[]',
  },
  {
    created: true,
    deduplicated: false,
    file: {
      original_filename: 'known.webp', mime_type: 'image/webp', byte_size: 17,
      storage_state: 'ready', content_hash: '812dc3ff41758f64719a32805a8776b14327eb0b382f40525f2cca24f9054f74',
      format: 'webp', capability: 'materializable', blob_available: true, issue: null,
      intake_declarations: [],
    },
    materialization: {
      parser_key: 'native-image', parser_version: 'passthrough-v1', status: 'received', attempt_count: 0,
      projection_available: false, error_code: null, error_message: null, retryable: false,
    },
    imprint_count: 0, fragment_count: 0, intake_declarations_json: '[]',
  },
  {
    created: true,
    deduplicated: false,
    file: {
      original_filename: 'known.pptx',
      mime_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      byte_size: 14, storage_state: 'ready',
      content_hash: '37bb3e1040b1454730680d47595b969f4766653683806431dccf5c9f44dcd6df',
      format: 'pptx', capability: 'stored_only', blob_available: true, issue: null,
      intake_declarations: [],
    },
    materialization: {
      parser_key: 'stored-only', parser_version: 'none', status: 'received', attempt_count: 0,
      projection_available: false, error_code: null, error_message: null, retryable: false,
    },
    imprint_count: 0, fragment_count: 0, intake_declarations_json: '[]',
  },
  {
    created: true,
    deduplicated: false,
    file: {
      original_filename: 'known.xlsx',
      mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      byte_size: 14, storage_state: 'ready',
      content_hash: '179317e52db4f3cec339c76cd6e9c7661d8e1f40b434c9f611e1071128d75c99',
      format: 'xlsx', capability: 'stored_only', blob_available: true, issue: null,
      intake_declarations: [],
    },
    materialization: {
      parser_key: 'stored-only', parser_version: 'none', status: 'received', attempt_count: 0,
      projection_available: false, error_code: null, error_message: null, retryable: false,
    },
    imprint_count: 0, fragment_count: 0, intake_declarations_json: '[]',
  },
  {
    created: true,
    deduplicated: false,
    file: {
      original_filename: 'known.csv', mime_type: 'text/csv', byte_size: 19,
      storage_state: 'ready', content_hash: '2086f0ecbba06d76ed84008725bb4ded424aa4cbec77a8e04057f29b5bcf8c65',
      format: 'csv', capability: 'stored_only', blob_available: true, issue: null,
      intake_declarations: [],
    },
    materialization: {
      parser_key: 'stored-only', parser_version: 'none', status: 'received', attempt_count: 0,
      projection_available: false, error_code: null, error_message: null, retryable: false,
    },
    imprint_count: 0, fragment_count: 0, intake_declarations_json: '[]',
  },
] as const;

async function withDbAndStorage(
  run: (context: { db: TestDb; rootDir: string; userId: string; courseId: string }) => void | Promise<void>,
): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), 'coincides-source-never-reject-'));
  const rootDir = join(dir, 'source-blobs');
  const dbPath = join(dir, 'test.db');

  try {
    const db = await initDb(dbPath);
    const userId = uuidv4();
    const courseId = uuidv4();
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(userId, `${userId}@example.com`, 'hash', 'Never Reject User');
    db.prepare(`
      INSERT INTO courses (id, user_id, name, created_at, updated_at)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
    `).run(courseId, userId, 'Never Reject Project');
    await run({ db, rootDir, userId, courseId });
  } finally {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  }
}

function writeTemp(rootDir: string, fixture: IntakeFixture) {
  const tempDir = join(rootDir, '.tmp');
  mkdirSync(tempDir, { recursive: true });
  const path = join(tempDir, `${uuidv4()}.upload`);
  writeFileSync(path, fixture.bytes);
  return {
    path,
    originalname: fixture.filename,
    mimetype: fixture.mimeType,
    size: fixture.bytes.length,
  };
}

async function intakeFixture(
  db: TestDb,
  rootDir: string,
  userId: string,
  courseId: string,
  fixture: IntakeFixture,
) {
  return intakeSourceTempFile(db, userId, {
    course_id: courseId,
    origin_entry_kind: 'project_upload',
    file: writeTemp(rootDir, fixture),
  }, { rootDir });
}

function countRows(db: TestDb, sql: string, ...params: unknown[]): number {
  return (db.prepare(sql).get(...params) as { count: number }).count;
}

test('K-1 unknown-extension binary is stored with declarations and without fragments or imprint', async () => {
  await withDbAndStorage(async ({ db, rootDir, userId, courseId }) => {
    const fixture: IntakeFixture = {
      filename: 'opaque-capture.unknown',
      mimeType: 'application/octet-stream',
      bytes: Buffer.from([0xde, 0xad, 0xbe, 0xef, 0x00, 0x01]),
    };
    let result: Awaited<ReturnType<typeof intakeFixture>> | undefined;
    await assert.doesNotReject(async () => {
      result = await intakeFixture(db, rootDir, userId, courseId, fixture);
    });
    assert.ok(result);
    assert.equal(result.source.file.storage_state, 'ready');
    assert.equal(result.source.file.blob_available, true);
    assert.equal(result.source.file.byte_size, fixture.bytes.length);

    const row = db.prepare(`
      SELECT id, original_filename, content_hash, intake_declarations_json
      FROM source_files
      WHERE source_record_id = ? AND user_id = ?
    `).get(result.source.id, userId) as {
      id: string;
      original_filename: string;
      content_hash: string;
      intake_declarations_json: string;
    };
    const declarations = JSON.parse(row.intake_declarations_json) as string[];
    assert.equal(row.original_filename, fixture.filename);
    assert.match(row.content_hash, /^[a-f0-9]{64}$/);
    assert.ok(declarations.includes('unknown_extension'));
    assert.ok(declarations.includes('binary_unparsed'));
    assert.equal(
      countRows(db, 'SELECT COUNT(*) AS count FROM source_imprints WHERE source_file_id = ?', row.id),
      0,
    );
    assert.equal(
      countRows(db, `
        SELECT COUNT(*) AS count
        FROM imprint_fragments f
        JOIN source_imprints i ON i.id = f.imprint_id
        WHERE i.source_file_id = ?
      `, row.id),
      0,
    );
  });
});

test('K-2 unknown-extension UTF-8 text produces plain-text fragments with flow line anchors', async () => {
  await withDbAndStorage(async ({ db, rootDir, userId, courseId }) => {
    const fixture: IntakeFixture = {
      filename: 'field-notes.unlisted',
      mimeType: 'application/octet-stream',
      bytes: Buffer.from('First line\n\nThird line', 'utf8'),
    };
    const result = await intakeFixture(db, rootDir, userId, courseId, fixture);
    const row = db.prepare(`
      SELECT id, intake_declarations_json
      FROM source_files
      WHERE source_record_id = ? AND user_id = ?
    `).get(result.source.id, userId) as {
      id: string;
      intake_declarations_json: string;
    };
    assert.deepEqual(JSON.parse(row.intake_declarations_json), ['unknown_extension']);
    assert.equal(
      countRows(db, 'SELECT COUNT(*) AS count FROM source_imprints WHERE source_file_id = ?', row.id),
      1,
    );

    const imprint = db.prepare(`
      SELECT id, status, warnings_json, rejection_reasons_json
      FROM source_imprints
      WHERE source_file_id = ? AND user_id = ?
    `).get(row.id, userId) as {
      id: string;
      status: string;
      warnings_json: string;
      rejection_reasons_json: string;
    };
    assert.ok(imprint, 'unknown-extension UTF-8 text must create one accepted fallback imprint');
    assert.equal(imprint.status, 'accepted');
    assert.deepEqual(JSON.parse(imprint.warnings_json), []);
    assert.deepEqual(JSON.parse(imprint.rejection_reasons_json), []);

    const fragments = db.prepare(`
      SELECT seq, text, role, anchor_json
      FROM imprint_fragments
      WHERE imprint_id = ?
      ORDER BY seq ASC
    `).all(imprint.id) as Array<{
      seq: number;
      text: string;
      role: string;
      anchor_json: string;
    }>;
    assert.deepEqual(fragments.map((fragment) => fragment.text), [
      'First line\n',
      '\n',
      'Third line',
    ]);
    assert.deepEqual(fragments.map((fragment) => fragment.role), ['para', 'blank', 'para']);
    assert.deepEqual(fragments.map((fragment) => JSON.parse(fragment.anchor_json)), [
      { family: 'flow', path: 'body/line[1]', char: [0, 11], line: [1, 1] },
      { family: 'flow', path: 'body/line[2]', char: [11, 12], line: [2, 2] },
      { family: 'flow', path: 'body/line[3]', char: [12, 22], line: [3, 3] },
    ]);
  });
});

test('K-2b text fallback imprint is recovered once across deduplication and interrupted ready flip', async () => {
  await withDbAndStorage(async ({ db, rootDir, userId, courseId }) => {
    const sharedText = Buffer.from('Shared text fallback', 'utf8');
    await intakeFixture(db, rootDir, userId, courseId, {
      filename: 'shared-first.txt',
      mimeType: 'text/plain',
      bytes: sharedText,
    });

    const deduplicated = await intakeFixture(db, rootDir, userId, courseId, {
      filename: 'shared-second.unknown',
      mimeType: 'application/octet-stream',
      bytes: sharedText,
    });
    assert.equal(deduplicated.deduplicated, true);
    const sharedFileId = deduplicated.source.file.id;
    assert.equal(countRows(db, `
      SELECT COUNT(*) AS count
      FROM source_imprints
      WHERE source_file_id = ?
        AND transcriber_name = 'source-intake-text-fallback'
        AND status = 'accepted'
    `, sharedFileId), 1);
    assert.equal(countRows(db, `
      SELECT COUNT(*) AS count
      FROM imprint_fragments f
      JOIN source_imprints i ON i.id = f.imprint_id
      WHERE i.source_file_id = ?
        AND i.transcriber_name = 'source-intake-text-fallback'
    `, sharedFileId), 1);

    const deduplicatedAgain = await intakeFixture(db, rootDir, userId, courseId, {
      filename: 'shared-third.unknown',
      mimeType: 'application/octet-stream',
      bytes: sharedText,
    });
    assert.equal(deduplicatedAgain.deduplicated, true);
    assert.equal(countRows(db, `
      SELECT COUNT(*) AS count
      FROM source_imprints
      WHERE source_file_id = ?
        AND transcriber_name = 'source-intake-text-fallback'
        AND status = 'accepted'
    `, sharedFileId), 1);

    const interruptedFixture: IntakeFixture = {
      filename: 'interrupted.unknown',
      mimeType: 'application/octet-stream',
      bytes: Buffer.from('Interrupted text fallback', 'utf8'),
    };
    await assert.rejects(() => intakeSourceTempFile(db, userId, {
      course_id: courseId,
      origin_entry_kind: 'project_upload',
      file: writeTemp(rootDir, interruptedFixture),
    }, {
      rootDir,
      beforeReadyFlip: () => {
        throw new Error('injected crash after rename');
      },
    }), (error: any) => error?.details?.code === 'ready_flip_interrupted');

    const recovered = await intakeFixture(db, rootDir, userId, courseId, interruptedFixture);
    assert.equal(recovered.deduplicated, true);
    assert.equal(recovered.source.file.storage_state, 'ready');
    assert.equal(countRows(db, `
      SELECT COUNT(*) AS count
      FROM source_imprints
      WHERE source_file_id = ?
        AND transcriber_name = 'source-intake-text-fallback'
        AND status = 'accepted'
    `, recovered.source.file.id), 1);
    assert.equal(countRows(db, `
      SELECT COUNT(*) AS count
      FROM imprint_fragments f
      JOIN source_imprints i ON i.id = f.imprint_id
      WHERE i.source_file_id = ?
        AND i.transcriber_name = 'source-intake-text-fallback'
    `, recovered.source.file.id), 1);
  });
});

test('K-3 PDF magic overrides extension and MIME claims and declares every mismatch', async () => {
  await withDbAndStorage(async ({ db, rootDir, userId, courseId }) => {
    const cases: Array<{ fixture: IntakeFixture; declarations: string[] }> = [
      {
        fixture: {
          filename: 'signature-gate.png',
          mimeType: 'image/png',
          bytes: Buffer.from('%PDF-1.7\nsignature-gate'),
        },
        declarations: ['signature_mismatch'],
      },
      {
        fixture: {
          filename: 'mime-gate.png',
          mimeType: 'application/pdf',
          bytes: Buffer.from('%PDF-1.7\nmime-gate'),
        },
        declarations: ['signature_mismatch'],
      },
      {
        fixture: {
          filename: 'unknown-magic.unlisted',
          mimeType: 'application/octet-stream',
          bytes: Buffer.from('%PDF-1.7\nunknown-magic'),
        },
        declarations: ['unknown_extension', 'signature_mismatch'],
      },
    ];

    for (const { fixture, declarations } of cases) {
      const result = await intakeFixture(db, rootDir, userId, courseId, fixture);
      assert.equal(result.source.file.format, 'pdf');
      assert.equal(result.source.file.mime_type, 'application/pdf');
      assert.equal(result.source.file.capability, 'materializable');
      assert.equal(result.source.materialization.parser_key, 'native-pdf');

      const row = db.prepare(`
        SELECT id, intake_declarations_json
        FROM source_files
        WHERE source_record_id = ? AND user_id = ?
      `).get(result.source.id, userId) as {
        id: string;
        intake_declarations_json: string;
      };
      assert.deepEqual(JSON.parse(row.intake_declarations_json), declarations);
      assert.equal(
        countRows(db, 'SELECT COUNT(*) AS count FROM source_imprints WHERE source_file_id = ?', row.id),
        0,
      );
    }
  });
});

test('K-8 every observable signature mismatch branch has an isolated result fixture', async () => {
  await withDbAndStorage(async ({ db, rootDir, userId, courseId }) => {
    // The distinct-magic branch is already isolated by K-3's .png + PDF fixture.
    const cases: Array<{
      label: string;
      fixture: IntakeFixture;
      expected: {
        format: string;
        mimeType: string;
        capability: string;
        declarations: string[];
      };
    }> = [
      {
        label: 'claimed text suffix with mismatched image MIME and NUL bytes',
        fixture: {
          filename: 'claimed-mime-mismatch.txt',
          mimeType: 'image/png',
          bytes: Buffer.from([0x41, 0x00, 0x42]),
        },
        expected: {
          format: 'binary',
          mimeType: 'application/octet-stream',
          capability: 'stored_only',
          declarations: ['signature_mismatch', 'nul_bytes', 'binary_unparsed'],
        },
      },
      {
        label: 'claimed text with matching MIME and ZIP magic',
        fixture: {
          filename: 'zip-magic-in-text.txt',
          mimeType: 'text/plain',
          bytes: Buffer.from('PK\u0003\u0004k8-zip-in-text'),
        },
        expected: {
          format: 'binary',
          mimeType: 'application/octet-stream',
          capability: 'stored_only',
          declarations: ['signature_mismatch', 'binary_unparsed'],
        },
      },
      {
        label: 'unknown suffix with HTML MIME and UTF-8 text',
        fixture: {
          filename: 'html-mime-fallback.unlisted',
          mimeType: 'text/html',
          bytes: Buffer.from('K-8 UTF-8 fallback text', 'utf8'),
        },
        expected: {
          format: 'txt',
          mimeType: 'text/plain',
          capability: 'materializable',
          declarations: ['unknown_extension', 'signature_mismatch'],
        },
      },
      {
        label: 'claimed PNG with matching MIME and non-UTF-8 bytes',
        fixture: {
          filename: 'non-utf8-image.png',
          mimeType: 'image/png',
          bytes: Buffer.from([0xc3, 0x28, 0x86]),
        },
        expected: {
          format: 'binary',
          mimeType: 'application/octet-stream',
          capability: 'stored_only',
          declarations: ['signature_mismatch', 'non_utf8_text', 'binary_unparsed'],
        },
      },
    ];

    for (const { label, fixture, expected } of cases) {
      const result = await intakeFixture(db, rootDir, userId, courseId, fixture);
      assert.deepEqual({
        format: result.source.file.format,
        mimeType: result.source.file.mime_type,
        capability: result.source.file.capability,
        declarations: result.source.file.intake_declarations,
      }, expected, label);
    }
  });
});

test('K-4 NUL-bearing claimed text is stored as binary without fragments or imprint', async () => {
  await withDbAndStorage(async ({ db, rootDir, userId, courseId }) => {
    const fixture: IntakeFixture = {
      filename: 'nul-bearing.txt',
      mimeType: 'text/plain',
      bytes: Buffer.from([0x41, 0x00, 0x42]),
    };
    const result = await intakeFixture(db, rootDir, userId, courseId, fixture);
    assert.equal(result.source.file.format, 'binary');
    assert.equal(result.source.file.capability, 'stored_only');

    const row = db.prepare(`
      SELECT id, storage_state, intake_declarations_json
      FROM source_files
      WHERE source_record_id = ? AND user_id = ?
    `).get(result.source.id, userId) as {
      id: string;
      storage_state: string;
      intake_declarations_json: string;
    };
    assert.equal(row.storage_state, 'ready');
    assert.deepEqual(JSON.parse(row.intake_declarations_json), ['nul_bytes', 'binary_unparsed']);
    assert.equal(
      countRows(db, 'SELECT COUNT(*) AS count FROM source_imprints WHERE source_file_id = ?', row.id),
      0,
    );
    assert.equal(
      countRows(db, `
        SELECT COUNT(*) AS count
        FROM imprint_fragments f
        JOIN source_imprints i ON i.id = f.imprint_id
        WHERE i.source_file_id = ?
      `, row.id),
      0,
    );
  });
});

test('K-5 every degraded Source is readable with declarations through list and detail HTTP routes', async () => {
  await withDbAndStorage(async ({ db, rootDir, userId, courseId }) => {
    const cases: Array<{ fixture: IntakeFixture; declarations: string[] }> = [
      {
        fixture: {
          filename: 'route-binary.unknown',
          mimeType: 'application/octet-stream',
          bytes: Buffer.from([0xff, 0xfe, 0xfd]),
        },
        declarations: ['unknown_extension', 'non_utf8_text', 'binary_unparsed'],
      },
      {
        fixture: {
          filename: 'route-text.unknown',
          mimeType: 'application/octet-stream',
          bytes: Buffer.from('Readable fallback text', 'utf8'),
        },
        declarations: ['unknown_extension'],
      },
      {
        fixture: {
          filename: 'route-magic.png',
          mimeType: 'image/png',
          bytes: Buffer.from('%PDF-1.7\nroute-magic'),
        },
        declarations: ['signature_mismatch'],
      },
      {
        fixture: {
          filename: 'route-nul.txt',
          mimeType: 'text/plain',
          bytes: Buffer.from([0x72, 0x00, 0x6e]),
        },
        declarations: ['nul_bytes', 'binary_unparsed'],
      },
    ];
    const expectedById = new Map<string, string[]>();
    for (const entry of cases) {
      const result = await intakeFixture(db, rootDir, userId, courseId, entry.fixture);
      expectedById.set(result.source.id, entry.declarations);
    }

    const previousRoot = process.env.SOURCE_BLOB_DIR;
    process.env.SOURCE_BLOB_DIR = rootDir;
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as any).userId = req.header('x-test-user') || userId;
      next();
    });
    app.use('/api/sources', sourceRoutes);
    app.use(errorHandler);

    const server = await new Promise<ReturnType<typeof app.listen>>((resolveServer) => {
      const running = app.listen(0, () => resolveServer(running));
    });
    try {
      const address = server.address() as { port: number };
      const base = `http://127.0.0.1:${address.port}/api/sources`;
      const listed = await fetch(`${base}?course_id=${courseId}`, {
        headers: { 'x-test-user': userId },
      });
      assert.equal(listed.status, 200);
      const listBody = await listed.json() as any[];
      assert.equal(listBody.length, cases.length);
      for (const source of listBody) {
        assert.deepEqual(source.file.intake_declarations, expectedById.get(source.id));
      }

      for (const [sourceId, declarations] of expectedById) {
        const detailed = await fetch(`${base}/${sourceId}`, {
          headers: { 'x-test-user': userId },
        });
        assert.equal(detailed.status, 200);
        const detailBody = await detailed.json() as any;
        assert.equal(detailBody.id, sourceId);
        assert.deepEqual(detailBody.file.intake_declarations, declarations);
      }
    } finally {
      await new Promise<void>((resolveClose, rejectClose) => {
        server.close((error?: Error) => error ? rejectClose(error) : resolveClose());
      });
      if (previousRoot === undefined) delete process.env.SOURCE_BLOB_DIR;
      else process.env.SOURCE_BLOB_DIR = previousRoot;
    }
  });
});

test('K-6 all 12 known suffixes retain the captured byte-for-byte intake projection', async () => {
  await withDbAndStorage(async ({ db, rootDir, userId, courseId }) => {
    const actual = [];
    for (const fixture of KNOWN_BASELINE_FIXTURES) {
      const result = await intakeFixture(db, rootDir, userId, courseId, fixture);
      const fileRow = db.prepare(`
        SELECT id, intake_declarations_json
        FROM source_files
        WHERE source_record_id = ? AND user_id = ?
      `).get(result.source.id, userId) as { id: string; intake_declarations_json: string };
      actual.push({
        created: result.created,
        deduplicated: result.deduplicated,
        file: {
          original_filename: result.source.file.original_filename,
          mime_type: result.source.file.mime_type,
          byte_size: result.source.file.byte_size,
          storage_state: result.source.file.storage_state,
          content_hash: result.source.file.content_hash,
          format: result.source.file.format,
          capability: result.source.file.capability,
          blob_available: result.source.file.blob_available,
          issue: result.source.file.issue,
          intake_declarations: result.source.file.intake_declarations,
        },
        materialization: {
          parser_key: result.source.materialization.parser_key,
          parser_version: result.source.materialization.parser_version,
          status: result.source.materialization.status,
          attempt_count: result.source.materialization.attempt_count,
          projection_available: result.source.materialization.projection_available,
          error_code: result.source.materialization.error_code,
          error_message: result.source.materialization.error_message,
          retryable: result.source.materialization.retryable,
        },
        imprint_count: countRows(
          db,
          'SELECT COUNT(*) AS count FROM source_imprints WHERE source_file_id = ?',
          fileRow.id,
        ),
        fragment_count: countRows(db, `
          SELECT COUNT(*) AS count
          FROM imprint_fragments f
          JOIN source_imprints i ON i.id = f.imprint_id
          WHERE i.source_file_id = ?
        `, fileRow.id),
        intake_declarations_json: fileRow.intake_declarations_json,
      });
    }

    assert.equal(JSON.stringify(actual), JSON.stringify(K6_KNOWN_FORMAT_BASELINE));
  });
});

test('K-7 intake, warning, and validation code families never cross storage layers', async () => {
  await withDbAndStorage(async ({ db, rootDir, userId, courseId }) => {
    assert.deepEqual(SOURCE_INTAKE_DECLARATION_CODES, [
      'unknown_extension',
      'signature_mismatch',
      'non_utf8_text',
      'nul_bytes',
      'binary_unparsed',
    ]);
    const intakeCodes = new Set<string>(SOURCE_INTAKE_DECLARATION_CODES);
    const warningCodes = new Set<string>(SOURCE_IMPRINT_WARNING_CODES);
    const validationCodes = new Set<string>(SOURCE_IMPRINT_REJECTION_CODES);
    for (const code of intakeCodes) {
      assert.equal(warningCodes.has(code), false);
      assert.equal(validationCodes.has(code), false);
    }
    for (const code of warningCodes) assert.equal(validationCodes.has(code), false);

    const degradedFixtures: IntakeFixture[] = [
      {
        filename: 'families-binary.unknown',
        mimeType: 'application/octet-stream',
        bytes: Buffer.from([0xff, 0xfe, 0xfd]),
      },
      {
        filename: 'families-text.unknown',
        mimeType: 'application/octet-stream',
        bytes: Buffer.from('families fallback', 'utf8'),
      },
      {
        filename: 'families-magic.png',
        mimeType: 'image/png',
        bytes: Buffer.from('%PDF-1.7\nfamilies-magic'),
      },
      {
        filename: 'families-nul.txt',
        mimeType: 'text/plain',
        bytes: Buffer.from([0x41, 0x00, 0x42]),
      },
    ];
    const degradedFileIds: string[] = [];
    for (const fixture of degradedFixtures) {
      const result = await intakeFixture(db, rootDir, userId, courseId, fixture);
      const row = db.prepare(`
        SELECT id, intake_declarations_json
        FROM source_files
        WHERE source_record_id = ? AND user_id = ?
      `).get(result.source.id, userId) as { id: string; intake_declarations_json: string };
      degradedFileIds.push(row.id);
      const declarations = JSON.parse(row.intake_declarations_json) as string[];
      assert.ok(declarations.length > 0);
      for (const code of declarations) {
        assert.equal(intakeCodes.has(code), true);
        assert.equal(warningCodes.has(code), false);
        assert.equal(validationCodes.has(code), false);
      }
    }

    const textResult = await intakeFixture(db, rootDir, userId, courseId, {
      filename: 'families-source.txt',
      mimeType: 'text/plain',
      bytes: Buffer.from('Alpha-Beta', 'utf8'),
    });
    const textFile = db.prepare(`
      SELECT id
      FROM source_files
      WHERE source_record_id = ? AND user_id = ?
    `).get(textResult.source.id, userId) as { id: string };
    const transcriber = { name: 'k7-family-lock', version: '1', lockfile: 'server/package-lock.json' };

    const imprintCountBeforeInvalid = countRows(
      db,
      'SELECT COUNT(*) AS count FROM source_imprints WHERE source_file_id = ?',
      textFile.id,
    );
    for (const code of SOURCE_INTAKE_DECLARATION_CODES) {
      assert.throws(() => storeSourceImprint(db, userId, {
        source_file_id: textFile.id,
        transcriber,
        anchor_fidelity: 'char',
        text_normalization: 'none',
        fragments: [
          { seq: 0, text: 'Alpha-Beta', role: 'para', anchor: { family: 'flow', path: 'body', char: [0, 10] } },
        ],
        warnings: [
          {
            code: code as never,
            anchor: { family: 'flow', path: 'body', char: [0, 0] },
          },
        ],
      }, { rootDir }), /Invalid Source imprint warning code/);
    }
    assert.equal(
      countRows(db, 'SELECT COUNT(*) AS count FROM source_imprints WHERE source_file_id = ?', textFile.id),
      imprintCountBeforeInvalid,
    );

    const accepted = storeSourceImprint(db, userId, {
      source_file_id: textFile.id,
      transcriber,
      anchor_fidelity: 'char',
      text_normalization: 'none',
      fragments: [
        { seq: 0, text: 'Alpha', role: 'para', anchor: { family: 'flow', path: 'body', char: [0, 5] } },
        { seq: 1, text: 'Beta', role: 'para', anchor: { family: 'flow', path: 'body', char: [6, 10] } },
      ],
      warnings: [
        { code: 'decode_failed', anchor: { family: 'flow', path: 'body', char: [5, 6] } },
      ],
    }, { rootDir });
    assert.equal(accepted.imprint.status, 'accepted');
    assert.deepEqual(accepted.imprint.warnings.map((warning) => warning.code), ['decode_failed']);

    const rejected = storeSourceImprint(db, userId, {
      source_file_id: textFile.id,
      transcriber,
      anchor_fidelity: 'char',
      text_normalization: 'none',
      fragments: [
        { seq: 0, text: 'BROKEN', role: 'para', anchor: { family: 'flow', path: 'body', char: [0, 10] } },
      ],
      warnings: [],
    }, { rootDir });
    assert.equal(rejected.imprint.status, 'rejected');
    assert.ok(rejected.imprint.rejection_reasons.length > 0);

    const imprintRows = db.prepare(`
      SELECT warnings_json, rejection_reasons_json
      FROM source_imprints
      WHERE user_id = ?
    `).all(userId) as Array<{ warnings_json: string; rejection_reasons_json: string }>;
    for (const row of imprintRows) {
      for (const warning of JSON.parse(row.warnings_json) as Array<{ code: string }>) {
        assert.equal(warningCodes.has(warning.code), true);
        assert.equal(intakeCodes.has(warning.code), false);
        assert.equal(validationCodes.has(warning.code), false);
      }
      for (const reason of JSON.parse(row.rejection_reasons_json) as Array<{ code: string }>) {
        assert.equal(validationCodes.has(reason.code), true);
        assert.equal(intakeCodes.has(reason.code), false);
        assert.equal(warningCodes.has(reason.code), false);
      }
    }

    db.prepare(`
      UPDATE source_files
      SET intake_declarations_json = ?
      WHERE id = ? AND user_id = ?
    `).run(JSON.stringify([
      'unknown_extension',
      ...SOURCE_IMPRINT_WARNING_CODES,
      ...SOURCE_IMPRINT_REJECTION_CODES,
    ]), degradedFileIds[0], userId);
    const sourceRecord = db.prepare(`
      SELECT source_record_id
      FROM source_files
      WHERE id = ? AND user_id = ?
    `).get(degradedFileIds[0], userId) as { source_record_id: string };
    const detail = getSourceRecordDetail(db, userId, sourceRecord.source_record_id, { rootDir });
    assert.deepEqual(detail.file.intake_declarations, ['unknown_extension']);
  });
});
