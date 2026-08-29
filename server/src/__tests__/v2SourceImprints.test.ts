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
import { v4 as uuidv4 } from 'uuid';
import { closeDb, initDb } from '../db/init.js';
import { intakeSourceTempFile } from '../services/sourceFileIntake.js';
import type {
  SourceImprintAnchor,
  SourceImprintInput,
} from '../services/sourceImprints.js';

type TestDb = Awaited<ReturnType<typeof initDb>>;

type FlowAnchor = {
  family: 'flow';
  path: string;
  char: [number, number];
};

type TestFragment = {
  seq: number;
  text: string;
  role: 'para';
  anchor: SourceImprintAnchor | Record<string, unknown>;
  style?: Record<string, unknown> | null;
  lang?: string | null;
};

type TestWarning = {
  code: string;
  anchor: FlowAnchor | Record<string, unknown>;
  detail?: string;
};

const VALIDATION_CODES = new Set([
  'fidelity_mismatch',
  'anchor_invalid',
  'fidelity_overclaim',
  'order_violation',
]);

async function loadSourceImprints() {
  return import('../services/sourceImprints.js');
}

async function withTextSource(
  content: string,
  run: (context: {
    db: TestDb;
    rootDir: string;
    userId: string;
    sourceFileId: string;
  }) => void | Promise<void>,
): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), 'coincides-source-imprints-'));
  const rootDir = join(dir, 'source-blobs');
  const tempDir = join(rootDir, '.tmp');
  const dbPath = join(dir, 'test.db');

  try {
    const db = await initDb(dbPath);
    const userId = uuidv4();
    const courseId = uuidv4();
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(userId, `${userId}@example.com`, 'hash', 'Source Imprint User');
    db.prepare(`
      INSERT INTO courses (id, user_id, name, created_at, updated_at)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
    `).run(courseId, userId, 'Source Imprint Project');

    mkdirSync(tempDir, { recursive: true });
    const tempPath = join(tempDir, `${uuidv4()}.upload`);
    writeFileSync(tempPath, content, 'utf8');
    const intake = await intakeSourceTempFile(db, userId, {
      course_id: courseId,
      origin_entry_kind: 'project_upload',
      file: {
        path: tempPath,
        originalname: 'imprint-fixture.txt',
        mimetype: 'text/plain',
        size: Buffer.byteLength(content),
      },
    }, { rootDir });
    const sourceFile = db.prepare(`
      SELECT id
      FROM source_files
      WHERE source_record_id = ? AND user_id = ?
    `).get(intake.source.id, userId) as { id: string };

    await run({ db, rootDir, userId, sourceFileId: sourceFile.id });
  } finally {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  }
}

function imprintInput(
  sourceFileId: string,
  fragments: TestFragment[],
  warnings: TestWarning[] = [],
  overrides: Record<string, unknown> = {},
): SourceImprintInput {
  return {
    source_file_id: sourceFileId,
    transcriber: {
      name: 'fixture-transcriber',
      version: '1.0.0',
      lockfile: 'fixtures/imprint-transcriber.lock',
    },
    anchor_fidelity: 'char',
    text_normalization: 'none',
    fragments,
    warnings,
    ...overrides,
  } as unknown as SourceImprintInput;
}

function flow(path: string, start: number, end: number): FlowAnchor {
  return { family: 'flow', path, char: [start, end] };
}

function reasonCodes(result: any): string[] {
  return result.imprint.rejection_reasons.map((reason: { code: string }) => reason.code);
}

test('K-1 byte fidelity rejects undeclared text drift and honors declared punctuation normalization', async () => {
  await withTextSource('AlphaAlpha', async ({ db, rootDir, userId, sourceFileId }) => {
    const { storeSourceImprint } = await loadSourceImprints();
    const rejected = storeSourceImprint(db, userId, imprintInput(sourceFileId, [
      { seq: 0, text: 'Alpha', role: 'para', anchor: flow('body/p[1]', 0, 10) },
    ]), { rootDir });

    assert.equal(rejected.imprint.status, 'rejected');
    assert.ok(reasonCodes(rejected).includes('fidelity_mismatch'));
  });

  await withTextSource('“Alpha”—Beta…', async ({ db, rootDir, userId, sourceFileId }) => {
    const { storeSourceImprint } = await loadSourceImprints();
    const accepted = storeSourceImprint(db, userId, imprintInput(sourceFileId, [
      { seq: 0, text: '"Alpha"-Beta...', role: 'para', anchor: flow('body/p[1]', 0, 13) },
    ], [], { text_normalization: 'punctuation' }), { rootDir });

    assert.equal(accepted.imprint.status, 'accepted');
    assert.deepEqual(accepted.imprint.rejection_reasons, []);
  });
});

test('K-1b deleting a fragment without a warning is rejected as an unreported interval', async () => {
  await withTextSource('AlphaBeta', async ({ db, rootDir, userId, sourceFileId }) => {
    const { storeSourceImprint } = await loadSourceImprints();
    const result = storeSourceImprint(db, userId, imprintInput(sourceFileId, [
      { seq: 0, text: 'Alpha', role: 'para', anchor: flow('body/p[1]', 0, 5) },
    ]), { rootDir });

    assert.equal(result.imprint.status, 'rejected');
    assert.ok(reasonCodes(result).includes('fidelity_mismatch'));
  });

  await withTextSource('AlphaBeta', async ({ db, rootDir, userId, sourceFileId }) => {
    const { storeSourceImprint } = await loadSourceImprints();
    const result = storeSourceImprint(
      db,
      userId,
      imprintInput(sourceFileId, []),
      { rootDir },
    );

    assert.equal(result.imprint.status, 'rejected');
    assert.ok(reasonCodes(result).includes('fidelity_mismatch'));
    assert.equal(result.fragments.length, 0);
  });
});

test('K-1c fragment and declared-gap intervals must form a non-overlapping, exhaustive partition', async () => {
  await withTextSource('AlphaBeta', async ({ db, rootDir, userId, sourceFileId }) => {
    const { storeSourceImprint } = await loadSourceImprints();
    const result = storeSourceImprint(db, userId, imprintInput(sourceFileId, [
      { seq: 0, text: 'Alpha', role: 'para', anchor: flow('body/p[1]', 0, 6) },
      { seq: 1, text: 'Beta', role: 'para', anchor: flow('body/p[2]', 5, 9) },
    ]), { rootDir });

    assert.equal(result.imprint.status, 'rejected');
    assert.ok(reasonCodes(result).includes('anchor_invalid'));
  });

  await withTextSource('Alpha   Beta', async ({ db, rootDir, userId, sourceFileId }) => {
    const { storeSourceImprint } = await loadSourceImprints();
    const result = storeSourceImprint(db, userId, imprintInput(sourceFileId, [
      { seq: 0, text: 'Alpha ', role: 'para', anchor: flow('body/p[1]', 0, 6) },
      { seq: 1, text: 'Beta', role: 'para', anchor: flow('body/p[2]', 8, 12) },
    ], [], { text_normalization: 'whitespace' }), { rootDir });

    assert.equal(result.imprint.status, 'rejected');
    assert.ok(reasonCodes(result).includes('anchor_invalid'));
  });
});

test('K-1d trailing source whitespace must be declared as a warning interval', async () => {
  await withTextSource('Alpha   ', async ({ db, rootDir, userId, sourceFileId }) => {
    const { storeSourceImprint } = await loadSourceImprints();
    const accepted = storeSourceImprint(db, userId, imprintInput(sourceFileId, [
      { seq: 0, text: 'Alpha', role: 'para', anchor: flow('body/p[1]', 0, 5) },
    ], [{
      code: 'empty_segment',
      anchor: flow('body/trailing-whitespace', 5, 8),
    }]), { rootDir });

    assert.equal(accepted.imprint.status, 'accepted');
    assert.deepEqual(accepted.imprint.rejection_reasons, []);
    assert.equal(accepted.fragments.length, 1);
  });

  await withTextSource('Alpha   ', async ({ db, rootDir, userId, sourceFileId }) => {
    const { storeSourceImprint } = await loadSourceImprints();
    const rejected = storeSourceImprint(db, userId, imprintInput(sourceFileId, [
      { seq: 0, text: 'Alpha', role: 'para', anchor: flow('body/p[1]', 0, 5) },
    ]), { rootDir });

    assert.equal(rejected.imprint.status, 'rejected');
    assert.ok(reasonCodes(rejected).includes('fidelity_mismatch'));
    assert.equal(rejected.fragments.length, 0);
  });
});

test('K-2 flow char anchors are round-trip tickets into the original source', async () => {
  await withTextSource('AlphaBeta', async ({ db, rootDir, userId, sourceFileId }) => {
    const { storeSourceImprint } = await loadSourceImprints();
    const result = storeSourceImprint(db, userId, imprintInput(sourceFileId, [
      { seq: 0, text: 'Alpha', role: 'para', anchor: flow('body/p[2]', 5, 9) },
      { seq: 1, text: 'Beta', role: 'para', anchor: flow('body/p[1]', 0, 5) },
    ]), { rootDir });

    assert.equal(result.imprint.status, 'rejected');
    assert.ok(reasonCodes(result).includes('anchor_invalid'));
  });
});

test('K-3 page fidelity rejects bbox overclaim and every bbox must be a normalized four-tuple', async () => {
  await withTextSource('AlphaBeta', async ({ db, rootDir, userId, sourceFileId }) => {
    const { storeSourceImprint } = await loadSourceImprints();
    const overclaim = storeSourceImprint(db, userId, imprintInput(sourceFileId, [
      {
        seq: 0,
        text: 'AlphaBeta',
        role: 'para',
        anchor: { family: 'page', page: 1, bbox: [0, 0, 1, 1] },
      },
    ], [], { anchor_fidelity: 'page' }), { rootDir });
    assert.equal(overclaim.imprint.status, 'rejected');
    assert.ok(reasonCodes(overclaim).includes('fidelity_overclaim'));

    const malformed = storeSourceImprint(db, userId, imprintInput(sourceFileId, [
      {
        seq: 0,
        text: 'AlphaBeta',
        role: 'para',
        anchor: { family: 'page', page: 1, bbox: [-0.1, 0, 1, 1] },
      },
    ], [], { anchor_fidelity: 'region' }), { rootDir });
    assert.equal(malformed.imprint.status, 'rejected');
    assert.ok(reasonCodes(malformed).includes('anchor_invalid'));

    const wrongArity = storeSourceImprint(db, userId, imprintInput(sourceFileId, [
      {
        seq: 0,
        text: 'AlphaBeta',
        role: 'para',
        anchor: { family: 'page', page: 1, bbox: [0, 0, 1, 1, 0.5] },
      },
    ], [], { anchor_fidelity: 'region' }), { rootDir });
    assert.equal(wrongArity.imprint.status, 'rejected');
    assert.ok(reasonCodes(wrongArity).includes('anchor_invalid'));
  });
});

test('K-4 fragment seq values must arrive ordered and contiguous', async () => {
  await withTextSource('AlphaBeta', async ({ db, rootDir, userId, sourceFileId }) => {
    const { storeSourceImprint } = await loadSourceImprints();
    const disordered = storeSourceImprint(db, userId, imprintInput(sourceFileId, [
      { seq: 1, text: 'Beta', role: 'para', anchor: flow('body/p[2]', 5, 9) },
      { seq: 0, text: 'Alpha', role: 'para', anchor: flow('body/p[1]', 0, 5) },
    ]), { rootDir });
    assert.equal(disordered.imprint.status, 'rejected');
    assert.ok(reasonCodes(disordered).includes('order_violation'));

    const nonContiguous = storeSourceImprint(db, userId, imprintInput(sourceFileId, [
      { seq: 0, text: 'Alpha', role: 'para', anchor: flow('body/p[1]', 0, 5) },
      { seq: 2, text: 'Beta', role: 'para', anchor: flow('body/p[2]', 5, 9) },
    ]), { rootDir });
    assert.equal(nonContiguous.imprint.status, 'rejected');
    assert.ok(reasonCodes(nonContiguous).includes('order_violation'));
  });

  await withTextSource('AA', async ({ db, rootDir, userId, sourceFileId }) => {
    const { storeSourceImprint } = await loadSourceImprints();
    const reversedAnchors = storeSourceImprint(db, userId, imprintInput(sourceFileId, [
      { seq: 0, text: 'A', role: 'para', anchor: flow('body/p[2]', 1, 2) },
      { seq: 1, text: 'A', role: 'para', anchor: flow('body/p[1]', 0, 1) },
    ]), { rootDir });

    assert.equal(reversedAnchors.imprint.status, 'rejected');
    assert.ok(reasonCodes(reversedAnchors).includes('order_violation'));
  });
});

test('K-5 a non-empty missing segment requires an exact warning anchor and cannot be replaced by empty text', async () => {
  await withTextSource('AlphaBROKENOmega', async ({ db, rootDir, userId, sourceFileId }) => {
    const { storeSourceImprint } = await loadSourceImprints();
    const accepted = storeSourceImprint(db, userId, imprintInput(sourceFileId, [
      { seq: 0, text: 'Alpha', role: 'para', anchor: flow('body/p[1]', 0, 5) },
      { seq: 1, text: 'Omega', role: 'para', anchor: flow('body/p[3]', 11, 16) },
    ], [{
      code: 'unreadable_segment',
      anchor: flow('body/p[2]', 5, 11),
      detail: 'fixture corruption',
    }]), { rootDir });

    assert.equal(accepted.imprint.status, 'accepted');
    assert.deepEqual(accepted.imprint.warnings, [{
      code: 'unreadable_segment',
      anchor: flow('body/p[2]', 5, 11),
      detail: 'fixture corruption',
    }]);
    assert.equal(accepted.fragments.length, 2);
    assert.equal(accepted.fragments.some((fragment: { text: string }) => fragment.text === ''), false);
  });

  await withTextSource('AlphaOmega', async ({ db, rootDir, userId, sourceFileId }) => {
    const { storeSourceImprint, validateSourceImprint } = await loadSourceImprints();
    const input = imprintInput(sourceFileId, [
      { seq: 0, text: 'Alpha', role: 'para', anchor: flow('body/p[1]', 0, 5) },
      { seq: 1, text: '', role: 'para', anchor: flow('body/p[1]', 5, 5) },
      { seq: 2, text: 'Omega', role: 'para', anchor: flow('body/p[1]', 5, 10) },
    ]);
    const validation = validateSourceImprint(input, 'AlphaOmega');
    assert.equal(validation.accepted, false);
    assert.ok(validation.reasons.some((reason) => reason.code === 'fidelity_mismatch'));

    const rejected = storeSourceImprint(db, userId, input, { rootDir });

    assert.equal(rejected.imprint.status, 'rejected');
    assert.ok(reasonCodes(rejected).includes('fidelity_mismatch'));
    assert.equal(rejected.fragments.length, 0);
  });

  await withTextSource('AlphaBeta', async ({ db, rootDir, userId, sourceFileId }) => {
    const { storeSourceImprint } = await loadSourceImprints();
    const rejected = storeSourceImprint(db, userId, imprintInput(sourceFileId, [
      { seq: 0, text: 'AlphaBeta', role: 'para', anchor: flow('body/p[1]', 0, 9) },
    ], [{
      code: 'unreadable_segment',
      detail: 'anchor deliberately absent',
    } as unknown as TestWarning]), { rootDir });

    assert.equal(rejected.imprint.status, 'rejected');
    assert.ok(reasonCodes(rejected).includes('anchor_invalid'));
    assert.equal(rejected.fragments.length, 0);
  });

  await withTextSource('AlphaBROKENOmega', async ({ db, rootDir, userId, sourceFileId }) => {
    const { storeSourceImprint } = await loadSourceImprints();
    const rejected = storeSourceImprint(db, userId, imprintInput(sourceFileId, [
      { seq: 0, text: 'Alpha', role: 'para', anchor: flow('body/p[1]', 0, 5) },
      { seq: 1, text: 'Omega', role: 'para', anchor: flow('body/p[3]', 11, 16) },
    ], [{
      code: 'unreadable_segment',
      anchor: { family: 'page', page: 1 },
    } as unknown as TestWarning]), { rootDir });

    assert.equal(rejected.imprint.status, 'rejected');
    assert.ok(reasonCodes(rejected).includes('anchor_invalid'));
    assert.equal(rejected.fragments.length, 0);
  });

  await withTextSource('Alpha', async ({ db, rootDir, userId, sourceFileId }) => {
    const { storeSourceImprint } = await loadSourceImprints();
    const rejected = storeSourceImprint(db, userId, imprintInput(sourceFileId, [], [
      {
        code: 'unreadable_segment',
        anchor: { family: 'page', page: 1 },
      },
      {
        code: 'empty_segment',
        anchor: { family: 'slide', slide: 1, shape: 'shape_1' },
      },
    ] as unknown as TestWarning[], { anchor_fidelity: 'page' }), { rootDir });

    assert.equal(rejected.imprint.status, 'rejected');
    assert.ok(reasonCodes(rejected).includes('anchor_invalid'));
    assert.equal(rejected.fragments.length, 0);
  });

  await withTextSource('ABCD', async ({ db, rootDir, userId, sourceFileId }) => {
    const { storeSourceImprint } = await loadSourceImprints();
    const accepted = storeSourceImprint(db, userId, imprintInput(sourceFileId, [
      { seq: 0, text: 'A', role: 'para', anchor: flow('body/p[1]', 0, 1) },
      { seq: 1, text: 'D', role: 'para', anchor: flow('body/p[4]', 3, 4) },
    ], [
      { code: 'unreadable_segment', anchor: flow('body/p[2]', 1, 2) },
      { code: 'empty_segment', anchor: flow('body/p[3]', 2, 3) },
    ]), { rootDir });

    assert.equal(accepted.imprint.status, 'accepted');
    assert.deepEqual(accepted.imprint.rejection_reasons, []);
    assert.equal(accepted.fragments.length, 2);
  });
});

test('K-5b every validation rejection persists one receipt, no fragments, and never mixes code families', async () => {
  await withTextSource('AlphaBROKENOmega', async ({ db, rootDir, userId, sourceFileId }) => {
    const { storeSourceImprint } = await loadSourceImprints();
    const declaredWarnings: TestWarning[] = [{
      code: 'unreadable_segment',
      anchor: flow('body/p[2]', 5, 11),
    }];
    const expectedDeclaredWarnings: TestWarning[] = [{
      code: 'unreadable_segment',
      anchor: flow('body/p[2]', 5, 11),
    }];
    const rejected = storeSourceImprint(db, userId, imprintInput(sourceFileId, [
      { seq: 0, text: 'Alphx', role: 'para', anchor: flow('body/p[1]', 0, 5) },
      { seq: 1, text: 'Omega', role: 'para', anchor: flow('body/p[3]', 11, 16) },
    ], declaredWarnings), { rootDir });

    assert.equal(rejected.imprint.status, 'rejected');
    assert.ok(rejected.imprint.rejection_reasons.length > 0);
    assert.ok(rejected.imprint.rejection_reasons.every((reason: { code: string }) => (
      VALIDATION_CODES.has(reason.code)
    )));
    assert.ok(rejected.imprint.warnings.every((warning: { code: string }) => (
      !VALIDATION_CODES.has(warning.code)
    )));
    assert.deepEqual(rejected.imprint.warnings, expectedDeclaredWarnings);
    assert.equal(rejected.fragments.length, 0);

    const row = db.prepare(`
      SELECT status, warnings_json, rejection_reasons_json
      FROM source_imprints
      WHERE id = ?
    `).get(rejected.imprint.id) as {
      status: string;
      warnings_json: string;
      rejection_reasons_json: string;
    };
    assert.equal(row.status, 'rejected');
    assert.deepEqual(JSON.parse(row.warnings_json), expectedDeclaredWarnings);
    assert.deepEqual(JSON.parse(row.rejection_reasons_json), rejected.imprint.rejection_reasons);
    assert.equal(
      (db.prepare('SELECT COUNT(*) AS count FROM imprint_fragments WHERE imprint_id = ?')
        .get(rejected.imprint.id) as { count: number }).count,
      0,
    );

    const noWarningRejected = storeSourceImprint(db, userId, imprintInput(sourceFileId, [
      {
        seq: 0,
        text: 'AlphxBROKENOmega',
        role: 'para',
        anchor: flow('body/p[1]', 0, 16),
      },
    ]), { rootDir });
    assert.equal(noWarningRejected.imprint.status, 'rejected');
    assert.deepEqual(noWarningRejected.imprint.warnings, []);
    assert.equal(noWarningRejected.fragments.length, 0);
    assert.deepEqual(
      JSON.parse((db.prepare('SELECT warnings_json FROM source_imprints WHERE id = ?')
        .get(noWarningRejected.imprint.id) as { warnings_json: string }).warnings_json),
      [],
    );

    const beforeInvalidWarning = (db.prepare('SELECT COUNT(*) AS count FROM source_imprints')
      .get() as { count: number }).count;
    assert.throws(() => storeSourceImprint(db, userId, imprintInput(sourceFileId, [
      { seq: 0, text: 'AlphaBROKENOmega', role: 'para', anchor: flow('body/p[1]', 0, 16) },
    ], [{
      code: 'fidelity_mismatch',
      anchor: flow('body/p[1]', 0, 0),
    }]), { rootDir }));
    assert.equal(
      (db.prepare('SELECT COUNT(*) AS count FROM source_imprints').get() as { count: number }).count,
      beforeInvalidWarning,
    );
  });
});

test('K-6 accepted fixture completes store, birth certificate, validation, and both anchor retrieval modes', async () => {
  await withTextSource('AlphaBeta', async ({ db, rootDir, userId, sourceFileId }) => {
    const {
      getImprintFragmentsByAnchor,
      getSourceImprint,
      storeSourceImprint,
      validateSourceImprint,
    } = await loadSourceImprints();
    const input = imprintInput(sourceFileId, [
      { seq: 0, text: 'Alpha', role: 'para', anchor: flow('body/p[1]', 0, 5), lang: 'en' },
      { seq: 1, text: 'Beta', role: 'para', anchor: flow('body/p[1]', 5, 9), lang: 'en' },
    ]);
    const stored = storeSourceImprint(db, userId, input, { rootDir });

    assert.equal(stored.imprint.status, 'accepted');
    assert.equal(stored.imprint.fragment_count, 2);
    assert.deepEqual(stored.fragments.map((fragment: { text: string }) => fragment.text), ['Alpha', 'Beta']);

    const validation = validateSourceImprint(input, 'AlphaBeta');
    assert.equal(validation.accepted, true);
    assert.deepEqual(validation.reasons, []);

    const fetched = getSourceImprint(db, userId, stored.imprint.id);
    assert.deepEqual(
      fetched.fragments.map((fragment: { text: string }) => fragment.text),
      stored.fragments.map((fragment: { text: string }) => fragment.text),
    );

    const exact = getImprintFragmentsByAnchor(db, userId, stored.imprint.id, {
      match: 'exact',
      anchor: flow('body/p[1]', 0, 5),
    });
    assert.equal(exact.length, 1);
    assert.equal(exact[0].text, 'Alpha');

    const located = getImprintFragmentsByAnchor(db, userId, stored.imprint.id, {
      match: 'locator',
      selector: { family: 'flow', path: 'body/p[1]' },
    });
    assert.deepEqual(located.map((fragment: { text: string }) => fragment.text), ['Alpha', 'Beta']);

    const optionalAnchor: {
      family: 'page';
      page: number;
      bbox: undefined;
    } = { family: 'page', page: 1, bbox: undefined };
    const optionalStored = storeSourceImprint(db, userId, imprintInput(sourceFileId, [
      { seq: 0, text: 'AlphaBeta', role: 'para', anchor: optionalAnchor },
    ], [], { anchor_fidelity: 'page' }), { rootDir });
    assert.equal(optionalStored.imprint.status, 'accepted');
    const optionalExact = getImprintFragmentsByAnchor(
      db,
      userId,
      optionalStored.imprint.id,
      { match: 'exact', anchor: optionalAnchor },
    );
    assert.equal(optionalExact.length, 1);

    const canonicalDuplicate = storeSourceImprint(db, userId, imprintInput(sourceFileId, [
      { seq: 0, text: 'Alpha', role: 'para', anchor: optionalAnchor },
      { seq: 1, text: 'Beta', role: 'para', anchor: { family: 'page', page: 1 } },
    ], [], { anchor_fidelity: 'page' }), { rootDir });
    assert.equal(canonicalDuplicate.imprint.status, 'rejected');
    assert.ok(reasonCodes(canonicalDuplicate).includes('anchor_invalid'));
    assert.equal(canonicalDuplicate.fragments.length, 0);

    const negativeZeroAnchor = flow('body/p[negative-zero]', -0, 9);
    const negativeZeroStored = storeSourceImprint(db, userId, imprintInput(sourceFileId, [
      { seq: 0, text: 'AlphaBeta', role: 'para', anchor: negativeZeroAnchor },
    ]), { rootDir });
    assert.equal(negativeZeroStored.imprint.status, 'accepted');
    const negativeZeroExact = getImprintFragmentsByAnchor(
      db,
      userId,
      negativeZeroStored.imprint.id,
      { match: 'exact', anchor: negativeZeroAnchor },
    );
    assert.equal(negativeZeroExact.length, 1);

    db.prepare('DELETE FROM source_files WHERE id = ?').run(sourceFileId);
    assert.equal(
      (db.prepare('SELECT COUNT(*) AS count FROM source_imprints WHERE id = ?')
        .get(stored.imprint.id) as { count: number }).count,
      0,
    );
    assert.equal(
      (db.prepare('SELECT COUNT(*) AS count FROM imprint_fragments WHERE imprint_id = ?')
        .get(stored.imprint.id) as { count: number }).count,
      0,
    );
  });
});

test('time anchors remain shape-only and have no write producer in this segment', async () => {
  await withTextSource('Alpha', async ({ db, rootDir, userId, sourceFileId }) => {
    const { storeSourceImprint } = await loadSourceImprints();
    const timeAnchor: SourceImprintAnchor = { family: 'time', ms: [0, 1_000] };
    const before = (db.prepare('SELECT COUNT(*) AS count FROM source_imprints')
      .get() as { count: number }).count;

    assert.throws(() => storeSourceImprint(db, userId, imprintInput(sourceFileId, [
      {
        seq: 0,
        text: 'Alpha',
        role: 'para',
        anchor: timeAnchor,
      },
    ], [], { anchor_fidelity: 'section' }), { rootDir }));
    assert.equal(
      (db.prepare('SELECT COUNT(*) AS count FROM source_imprints').get() as { count: number }).count,
      before,
    );
  });
});

test('schema contract fixes the two table vocabularies and cascade directions', async () => {
  await withTextSource('Alpha', async ({ db }) => {
    const imprintColumns = (db.prepare('PRAGMA table_info(source_imprints)').all() as Array<{ name: string }>)
      .map((column) => column.name);
    assert.deepEqual(imprintColumns, [
      'id',
      'user_id',
      'source_file_id',
      'transcriber_name',
      'transcriber_version',
      'transcriber_lockfile',
      'anchor_fidelity',
      'text_normalization',
      'fragment_count',
      'warnings_json',
      'status',
      'rejection_reasons_json',
      'created_at',
    ]);
    const fragmentColumns = (db.prepare('PRAGMA table_info(imprint_fragments)').all() as Array<{ name: string }>)
      .map((column) => column.name);
    assert.deepEqual(fragmentColumns, [
      'id',
      'imprint_id',
      'seq',
      'text',
      'role',
      'anchor_json',
      'style_json',
      'lang',
      'created_at',
    ]);

    const imprintForeignKeys = db.prepare('PRAGMA foreign_key_list(source_imprints)').all() as Array<{
      table: string;
      from: string;
      on_delete: string;
    }>;
    assert.ok(imprintForeignKeys.some((foreignKey) => (
      foreignKey.table === 'source_files'
      && foreignKey.from === 'source_file_id'
      && foreignKey.on_delete === 'CASCADE'
    )));
    const fragmentForeignKeys = db.prepare('PRAGMA foreign_key_list(imprint_fragments)').all() as Array<{
      table: string;
      from: string;
      on_delete: string;
    }>;
    assert.ok(fragmentForeignKeys.some((foreignKey) => (
      foreignKey.table === 'source_imprints'
      && foreignKey.from === 'imprint_id'
      && foreignKey.on_delete === 'CASCADE'
    )));
  });
});
