import {
  renameContentGroup,
  updateContentGroupIdentityDraft,
} from '../Notes/canvasEngine/contentGroupService';
import type {
  ContentGroupV1,
} from '../Notes/canvasEngine/runtimeDataTypes';

export interface ContentGroupEditorDraft {
  title: string;
  topic: string;
  type: string;
  summary: string;
}

export function applyContentGroupEditorDraft(input: {
  group: ContentGroupV1;
  draft: ContentGroupEditorDraft;
}): ContentGroupV1 {
  const nextGroup = renameContentGroup({
    group: input.group,
    title: input.draft.title,
  });

  return updateContentGroupIdentityDraft({
    group: nextGroup,
    topic: input.draft.topic,
    type: input.draft.type,
    summary: input.draft.summary,
  });
}
