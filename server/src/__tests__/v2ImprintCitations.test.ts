import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import {
  alignCitationEvidenceFilename,
  buildCitationExistenceIndex,
  ImprintCitationPreparationError,
  prepareImprintCitationRequest,
  validateImprintCitationResponse,
  type ImprintCitationContext,
} from '../services/imprintCitations.js';

const USER_ID = 'user-citation';
const ACTIVE_LOCK = '8'.repeat(64);

function createDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE source_files (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      content_hash TEXT NOT NULL
    );
    CREATE TABLE source_imprints (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      source_file_id TEXT NOT NULL REFERENCES source_files(id),
      transcriber_name TEXT NOT NULL,
      transcriber_version TEXT NOT NULL,
      transcriber_lockfile TEXT NOT NULL,
      transcriber_lockfile_hash TEXT,
      anchor_fidelity TEXT NOT NULL,
      text_normalization TEXT NOT NULL,
      fragment_count INTEGER NOT NULL,
      warnings_json TEXT NOT NULL,
      status TEXT NOT NULL,
      rejection_reasons_json TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE imprint_fragments (
      id TEXT PRIMARY KEY,
      imprint_id TEXT NOT NULL REFERENCES source_imprints(id),
      seq INTEGER NOT NULL,
      text TEXT NOT NULL,
      role TEXT NOT NULL,
      anchor_json TEXT NOT NULL,
      style_json TEXT,
      lang TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  return db;
}

function addImprint(
  db: Database.Database,
  input: {
    sourceId: string;
    imprintId: string;
    fragmentId: string;
    filename?: string;
    page?: number;
    lockHash?: string;
  },
): void {
  db.prepare(`
    INSERT INTO source_files (id, user_id, original_filename, content_hash)
    VALUES (?, ?, ?, ?)
  `).run(
    input.sourceId,
    USER_ID,
    input.filename ?? 'ielts-academic-reading-sample-tasks-2023.pdf',
    '9'.repeat(64),
  );
  db.prepare(`
    INSERT INTO source_imprints (
      id, user_id, source_file_id, transcriber_name, transcriber_version,
      transcriber_lockfile, transcriber_lockfile_hash, anchor_fidelity,
      text_normalization, fragment_count, warnings_json, status,
      rejection_reasons_json
    ) VALUES (?, ?, ?, 'native-pdf', '2.4.5', 'fixture.lock', ?, 'page',
              'whitespace', 1, '[]', 'accepted', '[]')
  `).run(input.imprintId, USER_ID, input.sourceId, input.lockHash ?? ACTIVE_LOCK);
  db.prepare(`
    INSERT INTO imprint_fragments (
      id, imprint_id, seq, text, role, anchor_json, style_json, lang
    ) VALUES (?, ?, 0, ?, 'para', ?, NULL, 'en')
  `).run(
    input.fragmentId,
    input.imprintId,
    `Functional page ${input.page ?? 19} content`,
    JSON.stringify({ family: 'page', page: input.page ?? 19 }),
  );
}

function fixture(): { db: Database.Database; context: ImprintCitationContext } {
  const db = createDb();
  addImprint(db, {
    sourceId: 'source-a',
    imprintId: 'imprint-a',
    fragmentId: 'fragment-a',
  });
  const context = prepareImprintCitationRequest(db, USER_ID, {
    requestId: 'citation-functional-p19',
    imprintId: 'imprint-a',
    pageRange: { start: 19, end: 19 },
  });
  return { db, context };
}

function output(
  requestId: string,
  claims: Array<{ claim_id: string; statement: string; fragmentIds: string[] }> = [{
    claim_id: 'c1',
    statement: 'The page contains a functional reading passage.',
    fragmentIds: ['fragment-a'],
  }],
): string {
  return JSON.stringify({
    schema_version: 'citation-output.v1',
    request_id: requestId,
    claims: claims.map((claim) => ({
      claim_id: claim.claim_id,
      statement: claim.statement,
      citations: claim.fragmentIds.map((fragment_id) => ({ fragment_id })),
    })),
    abstentions: claims.length === 0 ? [{ reason: 'insufficient_support' }] : [],
  });
}

function fakeRecognizer(rawResponse: string) {
  let fakeCalls = 0;
  return {
    calls: () => fakeCalls,
    realCalls: () => 0,
    async recognize(_input: ImprintCitationContext['input']): Promise<string> {
      fakeCalls += 1;
      return rawResponse;
    },
  };
}

test('citation response passes all three gates through a fake recognizer with zero real calls', async () => {
  const { db, context } = fixture();
  try {
    const recognizer = fakeRecognizer(output(context.input.request_id));
    const raw = await recognizer.recognize(context.input);
    const result = validateImprintCitationResponse(db, context, raw, {
      activeLockfileHash: ACTIVE_LOCK,
    });
    assert.equal(recognizer.calls(), 1);
    assert.equal(recognizer.realCalls(), 0);
    assert.equal(result.status, 'accepted');
    assert.equal(result.accepted_claims.length, 1);
    assert.deepEqual(result.rejection_ledger, []);
  } finally {
    db.close();
  }
});

test('output_schema_invalid rejects a non-bare response and records the response ledger', () => {
  const { db, context } = fixture();
  try {
    const result = validateImprintCitationResponse(
      db,
      context,
      `\`\`\`json\n${output(context.input.request_id)}\n\`\`\``,
      { activeLockfileHash: ACTIVE_LOCK },
    );
    assert.equal(result.status, 'rejected');
    assert.deepEqual(result.rejection_ledger.map((entry) => entry.code), [
      'output_schema_invalid',
    ]);
  } finally {
    db.close();
  }
});

test('request_id_mismatch rejects the whole response and records the response ledger', () => {
  const { db, context } = fixture();
  try {
    const result = validateImprintCitationResponse(db, context, output('different-request'), {
      activeLockfileHash: ACTIVE_LOCK,
    });
    assert.equal(result.status, 'rejected');
    assert.deepEqual(result.rejection_ledger.map((entry) => entry.code), [
      'request_id_mismatch',
    ]);
  } finally {
    db.close();
  }
});

test('citation_fragment_unknown rejects only the affected claim and never drops its ledger entry', () => {
  const { db, context } = fixture();
  try {
    const raw = output(context.input.request_id, [
      {
        claim_id: 'c1',
        statement: 'The known page supports this functional claim.',
        fragmentIds: ['fragment-a'],
      },
      {
        claim_id: 'c2',
        statement: 'This functional claim references an unavailable fragment.',
        fragmentIds: ['fragment-missing'],
      },
    ]);
    const result = validateImprintCitationResponse(db, context, raw, {
      activeLockfileHash: ACTIVE_LOCK,
    });
    assert.equal(result.status, 'partial');
    assert.equal(result.accepted_claims.length, 1);
    assert.equal(result.rejected_claim_count, 1);
    assert.deepEqual(result.rejection_ledger.map((entry) => entry.code), [
      'citation_fragment_unknown',
    ]);
  } finally {
    db.close();
  }
});

test('citation_imprint_mismatch rejects a candidate owned by a different imprint', () => {
  const { db, context } = fixture();
  try {
    addImprint(db, {
      sourceId: 'source-b',
      imprintId: 'imprint-b',
      fragmentId: 'fragment-b',
    });
    const mismatched: ImprintCitationContext = {
      ...context,
      input: {
        ...context.input,
        fragments: [{
          fragment_id: 'fragment-b',
          anchor: { family: 'page', page: 19 },
          text: 'Functional content owned by a separate imprint',
        }],
      },
    };
    const result = validateImprintCitationResponse(
      db,
      mismatched,
      output(context.input.request_id, [{
        claim_id: 'c1',
        statement: 'A separate imprint is not a valid host candidate.',
        fragmentIds: ['fragment-b'],
      }]),
      { activeLockfileHash: ACTIVE_LOCK },
    );
    assert.equal(result.status, 'rejected');
    assert.deepEqual(result.rejection_ledger.map((entry) => entry.code), [
      'citation_imprint_mismatch',
    ]);
  } finally {
    db.close();
  }
});

test('citation_lockfile_mismatch rejects a claim before exact-anchor replay', () => {
  const { db, context } = fixture();
  try {
    const result = validateImprintCitationResponse(
      db,
      context,
      output(context.input.request_id),
      { activeLockfileHash: '7'.repeat(64) },
    );
    assert.equal(result.status, 'rejected');
    assert.deepEqual(result.rejection_ledger.map((entry) => entry.code), [
      'citation_lockfile_mismatch',
    ]);
  } finally {
    db.close();
  }
});

test('citation_anchor_replay_failed rejects a candidate absent from exact replay', () => {
  const { db, context } = fixture();
  try {
    const replayMiss: ImprintCitationContext = {
      ...context,
      input: {
        ...context.input,
        fragments: [{
          ...context.input.fragments[0],
          anchor: { family: 'page', page: 20 },
        }],
      },
    };
    const result = validateImprintCitationResponse(
      db,
      replayMiss,
      output(context.input.request_id),
      { activeLockfileHash: ACTIVE_LOCK },
    );
    assert.equal(result.status, 'rejected');
    assert.deepEqual(result.rejection_ledger.map((entry) => entry.code), [
      'citation_anchor_replay_failed',
    ]);
  } finally {
    db.close();
  }
});

test('existence-domain evidence marks a valid citation without rejecting it', () => {
  const { db, context } = fixture();
  try {
    const existenceIndex = buildCitationExistenceIndex([{
      existence_id: 'E-000-functional',
      document: 'academic-reading',
      docling_evidence: [{
        path: 'evidence/ielts-academic-reading-sample-tasks-2023.fragments.json',
        canonical_anchor: { page: 19 },
      }],
      mineru_evidence: [],
    }], [{
      document: 'academic-reading',
      original_filename: context.host.original_filename,
    }]);
    const result = validateImprintCitationResponse(
      db,
      context,
      output(context.input.request_id),
      { activeLockfileHash: ACTIVE_LOCK, existenceIndex },
    );
    assert.equal(result.status, 'accepted');
    assert.deepEqual(result.rejection_ledger, []);
    assert.deepEqual(result.accepted_claims[0].citations[0], {
      fragment_id: 'fragment-a',
      uncorroborated: true,
      existence_receipt_ids: ['E-000-functional'],
    });
  } finally {
    db.close();
  }
});

test('addendum 1 aligns all four actual filename pairs and stops on a wrong suffix', () => {
  const stems = [
    'ielts-academic-reading-sample-tasks-2023',
    'ielts-academic-writing-example-responses-to-parts-1-and-2-with-band-scores-and-examiner-comments',
    'ielts-academic-writing-sample-tasks-2023',
    'ielts-listening-sample-tasks-2023',
  ];
  for (const stem of stems) {
    assert.equal(
      alignCitationEvidenceFilename(`${stem}.fragments.json`, `${stem}.pdf`),
      stem,
    );
  }
  assert.throws(
    () => alignCitationEvidenceFilename('functional-volume.json', 'functional-volume.pdf'),
    (error: unknown) => (
      error instanceof ImprintCitationPreparationError
      && error.code === 'identity_mapping_stop'
    ),
  );
});
