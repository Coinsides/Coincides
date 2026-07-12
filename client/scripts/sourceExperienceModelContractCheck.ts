import {
  deriveSourceExperienceState,
  isActiveSourceState,
  sourceMatchesQuery,
  sourceOpenBehavior,
  type SourceRecordDetail,
} from '../src/pages/Sources/sourceExperienceModel';

function assertEqual(actual: unknown, expected: unknown, message?: string): void {
  if (Object.is(actual, expected)) return;
  throw new Error(message || `Expected ${String(expected)}, received ${String(actual)}`);
}

type SourceFixturePatch = Omit<Partial<SourceRecordDetail>, 'file' | 'materialization'> & {
  file?: Partial<SourceRecordDetail['file']>;
  materialization?: Partial<SourceRecordDetail['materialization']>;
};

function sourceFixture(
  patch: SourceFixturePatch = {},
): SourceRecordDetail {
  const base: SourceRecordDetail = {
    id: 'source-1',
    display_name: 'Measure Theory.pdf',
    origin: { course_id: null, course_name_snapshot: null, entry_kind: 'library_upload' },
    metadata: {},
    file: {
      id: 'file-1',
      original_filename: 'measure-theory.pdf',
      mime_type: 'application/pdf',
      byte_size: 100,
      content_hash: 'a'.repeat(64),
      file_mtime: null,
      uploaded_at: '2026-07-11T00:00:00.000Z',
      storage_state: 'ready',
      format: 'pdf',
      capability: 'materializable',
      blob_available: true,
      blob_url: '/api/sources/source-1/blob',
      issue: null,
    },
    materialization: {
      id: 'run-1',
      parser_key: 'native-pdf',
      parser_version: '1',
      status: 'received',
      attempt_count: 0,
      projection_note_id: null,
      projection_available: false,
      error_code: null,
      error_message: null,
      retryable: false,
      started_at: null,
      completed_at: null,
    },
    placements: [],
    created_at: '2026-07-11T00:00:00.000Z',
    updated_at: '2026-07-11T00:00:00.000Z',
  };
  return {
    ...base,
    ...patch,
    file: { ...base.file, ...patch.file },
    materialization: { ...base.materialization, ...patch.materialization },
  };
}

for (const status of ['received', 'parsing', 'publishing'] as const) {
  const source = sourceFixture({ materialization: { status } });
  assertEqual(deriveSourceExperienceState(source), status);
  assertEqual(isActiveSourceState(source), true);
  assertEqual(sourceOpenBehavior(source).primary, 'detail');
}

const ready = sourceFixture({
  materialization: {
    status: 'materialized',
    projection_note_id: 'note-1',
    projection_available: true,
  },
});
assertEqual(deriveSourceExperienceState(ready), 'materialized');
assertEqual(sourceOpenBehavior(ready).projectionNoteId, 'note-1');

const missingProjection = sourceFixture({
  materialization: {
    status: 'materialized',
    projection_note_id: 'note-1',
    projection_available: false,
  },
});
assertEqual(deriveSourceExperienceState(missingProjection), 'projection_missing');
assertEqual(sourceOpenBehavior(missingProjection).primary, 'detail');

const storedOnly = sourceFixture({
  file: { capability: 'stored_only', format: 'xlsx' },
});
assertEqual(deriveSourceExperienceState(storedOnly), 'stored_only');

const retryableFailure = sourceFixture({
  materialization: { status: 'failed', retryable: true, error_message: 'Parser stopped' },
});
assertEqual(deriveSourceExperienceState(retryableFailure), 'failed');
assertEqual(sourceOpenBehavior(retryableFailure).canRetry, true);

const missingOriginal = sourceFixture({
  file: { blob_available: false, issue: { code: 'blob_missing', message: 'Missing' } },
});
assertEqual(deriveSourceExperienceState(missingOriginal), 'original_missing');
assertEqual(sourceOpenBehavior(missingOriginal).canOpenOriginal, false);

assertEqual(sourceMatchesQuery(ready, 'measure theory'), true);
assertEqual(sourceMatchesQuery(ready, 'measure-theory.pdf'), true);
assertEqual(sourceMatchesQuery(ready, 'topology'), false);

console.log('Source experience model contract check passed.');
