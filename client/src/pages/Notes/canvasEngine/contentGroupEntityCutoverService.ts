import {
  normalizeContentGroup,
} from './contentGroupService';
import type {
  ContentGroupV1,
} from './runtimeDataTypes';

export function shouldImportLegacyContentGroups(input: {
  entityGroups: ContentGroupV1[];
  legacyGroups: ContentGroupV1[];
}): boolean {
  return input.entityGroups.length === 0 && input.legacyGroups.length > 0;
}

export function mergeEntityAndLegacyContentGroups(input: {
  entityGroups: ContentGroupV1[];
  legacyGroups: ContentGroupV1[];
}): ContentGroupV1[] {
  if (input.entityGroups.length > 0) return input.entityGroups.map(normalizeContentGroup);
  return input.legacyGroups.map(normalizeContentGroup);
}
