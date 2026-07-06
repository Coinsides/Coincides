import {
  renameContentGroup,
  renameContentGroupPetal,
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
  petalLabelDrafts?: Record<string, string>;
}): ContentGroupV1 {
  let nextGroup = renameContentGroup({
    group: input.group,
    title: input.draft.title,
  });

  const petalLabelDrafts = input.petalLabelDrafts || {};
  for (const petal of nextGroup.petals) {
    if (!Object.prototype.hasOwnProperty.call(petalLabelDrafts, petal.id)) continue;
    const label = petalLabelDrafts[petal.id];
    if (typeof label !== 'string' || label === petal.label) continue;
    nextGroup = renameContentGroupPetal({
      group: nextGroup,
      petalId: petal.id,
      label,
    });
  }

  return updateContentGroupIdentityDraft({
    group: nextGroup,
    topic: input.draft.topic,
    type: input.draft.type,
    summary: input.draft.summary,
  });
}
