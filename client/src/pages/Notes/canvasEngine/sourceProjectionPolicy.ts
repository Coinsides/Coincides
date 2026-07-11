import type { Note } from './runtimeDataTypes';

export interface SourceProjectionPolicy {
  isSourceProjection: boolean;
  contentReadOnly: boolean;
  allowNoteMetadata: boolean;
  allowPlacementDisplayOverrides: boolean;
  allowInterpretationLayers: boolean;
}

export function sourceProjectionPolicyForNote(note: Note | null): SourceProjectionPolicy {
  const isSourceProjection = note?.note_class === 'source_projection'
    || note?.source_kind === 'source_projection';
  return {
    isSourceProjection,
    contentReadOnly: isSourceProjection,
    allowNoteMetadata: true,
    allowPlacementDisplayOverrides: true,
    allowInterpretationLayers: true,
  };
}
