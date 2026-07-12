export type SourceFormat =
  | 'pdf'
  | 'docx'
  | 'txt'
  | 'md'
  | 'png'
  | 'jpeg'
  | 'webp'
  | 'pptx'
  | 'xlsx'
  | 'csv';

export type SourceCapability = 'materializable' | 'stored_only';
export type SourceMaterializationStatus = 'received' | 'parsing' | 'publishing' | 'materialized' | 'failed';
export type SourceExperienceState =
  | 'received'
  | 'parsing'
  | 'publishing'
  | 'materialized'
  | 'failed'
  | 'stored_only'
  | 'projection_missing'
  | 'original_missing';

export interface SourcePlacement {
  id: string;
  course_id: string;
  course_name: string;
  created_at: string;
}

export interface SourceRecordDetail {
  id: string;
  display_name: string;
  origin: {
    course_id: string | null;
    course_name_snapshot: string | null;
    entry_kind: 'project_upload' | 'library_upload' | 'import';
  };
  metadata: Record<string, unknown>;
  file: {
    id: string;
    original_filename: string;
    mime_type: string;
    byte_size: number;
    content_hash: string;
    file_mtime: string | null;
    uploaded_at: string;
    storage_state: 'staging' | 'ready';
    format: SourceFormat;
    capability: SourceCapability;
    blob_available: boolean;
    blob_url: string;
    issue: { code: string; message: string } | null;
  };
  materialization: {
    id: string;
    parser_key: string;
    parser_version: string;
    status: SourceMaterializationStatus;
    attempt_count: number;
    projection_note_id: string | null;
    projection_available: boolean;
    error_code: string | null;
    error_message: string | null;
    retryable: boolean;
    started_at: string | null;
    completed_at: string | null;
  };
  placements: SourcePlacement[];
  created_at: string;
  updated_at: string;
}

export interface SourceOpenBehavior {
  primary: 'projection' | 'detail';
  projectionNoteId: string | null;
  canOpenOriginal: boolean;
  canDownloadOriginal: boolean;
  canRetry: boolean;
  message: string;
}

export const SOURCE_STATE_LABELS: Record<SourceExperienceState, string> = {
  received: 'Received',
  parsing: 'Parsing',
  publishing: 'Publishing',
  materialized: 'Ready',
  failed: 'Failed',
  stored_only: 'Original only',
  projection_missing: 'Projection missing',
  original_missing: 'Original missing',
};

export function deriveSourceExperienceState(source: SourceRecordDetail): SourceExperienceState {
  if (!source.file.blob_available) return 'original_missing';
  if (source.file.capability === 'stored_only') return 'stored_only';

  const { materialization } = source;
  if (materialization.status === 'materialized') {
    return materialization.projection_note_id && materialization.projection_available
      ? 'materialized'
      : 'projection_missing';
  }
  return materialization.status;
}

export function sourceOpenBehavior(source: SourceRecordDetail): SourceOpenBehavior {
  const state = deriveSourceExperienceState(source);
  const originalAvailable = source.file.blob_available;
  if (state === 'materialized') {
    return {
      primary: 'projection',
      projectionNoteId: source.materialization.projection_note_id,
      canOpenOriginal: originalAvailable,
      canDownloadOriginal: originalAvailable,
      canRetry: false,
      message: 'Open extracted reading view',
    };
  }

  const messages: Record<Exclude<SourceExperienceState, 'materialized'>, string> = {
    received: 'The original is safe. Extraction is waiting to start.',
    parsing: 'The original is safe. Content extraction is in progress.',
    publishing: 'Extraction is complete and the reading view is being published atomically.',
    failed: source.materialization.error_message || 'Content extraction failed. The original remains available.',
    stored_only: 'This format is stored as an original file in the current version.',
    projection_missing: 'The original still exists, but its extracted reading view is unavailable.',
    original_missing: source.file.issue?.message || 'The Source record exists, but its original file is unavailable.',
  };

  return {
    primary: 'detail',
    projectionNoteId: null,
    canOpenOriginal: originalAvailable,
    canDownloadOriginal: originalAvailable,
    canRetry: state === 'failed' && source.materialization.retryable,
    message: messages[state],
  };
}

export function isActiveSourceState(source: SourceRecordDetail): boolean {
  const state = deriveSourceExperienceState(source);
  return state === 'received' || state === 'parsing' || state === 'publishing';
}

export function formatSourceBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / (1024 ** index);
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

export function sourceMatchesQuery(source: SourceRecordDetail, query: string): boolean {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return true;
  return [source.display_name, source.file.original_filename]
    .some((value) => value.toLocaleLowerCase().includes(normalized));
}
