import { useCallback, type Dispatch, type SetStateAction } from 'react';
import {
  presentationKindForBlock,
  stringValue,
  type FieldValueRecord,
} from '../blockContentService';
import type { NoteBlock } from '../runtimeDataTypes';

export interface UseBlockFieldDraftControllerOptions {
  setBlockFieldDrafts: Dispatch<SetStateAction<Record<string, FieldValueRecord>>>;
  setBlockTextDrafts: Dispatch<SetStateAction<Record<string, string>>>;
}

function textForFieldDraft(block: NoteBlock, fallbackText: string, fieldValues: FieldValueRecord): string {
  const presentationKind = presentationKindForBlock(block);
  if (presentationKind === 'formula') {
    return stringValue(fieldValues.latex_input);
  }
  return fallbackText;
}

export function useBlockFieldDraftController({
  setBlockFieldDrafts,
  setBlockTextDrafts,
}: UseBlockFieldDraftControllerOptions) {
  const updateBlockFieldDraft = useCallback((
    block: NoteBlock,
    fallbackText: string,
    fieldValues: FieldValueRecord,
  ) => {
    setBlockFieldDrafts((current) => ({ ...current, [block.id]: fieldValues }));
    setBlockTextDrafts((current) => ({
      ...current,
      [block.id]: textForFieldDraft(block, fallbackText, fieldValues),
    }));
  }, [setBlockFieldDrafts, setBlockTextDrafts]);

  return {
    updateBlockFieldDraft,
  };
}
