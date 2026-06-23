import {
  groupFolderScopeKey,
  normalizeGroupFolder,
} from './groupFolderService';
import type {
  GroupFolderV1,
} from './runtimeDataTypes';

export function legacyGroupFoldersToImport(input: {
  entityFolders: GroupFolderV1[];
  legacyFolders: GroupFolderV1[];
}): GroupFolderV1[] {
  const entityFolderIds = new Set(input.entityFolders.map((folder) => folder.id));
  const legacySystemRootScopeById = new Map(
    input.legacyFolders
      .filter((folder) => folder.system_root)
      .map((folder) => [folder.id, groupFolderScopeKey(folder.scope)]),
  );
  const entitySystemRootIdByScope = new Map(
    input.entityFolders
      .filter((folder) => folder.system_root)
      .map((folder) => [groupFolderScopeKey(folder.scope), folder.id]),
  );

  return input.legacyFolders
    .filter((folder) => !folder.system_root && !entityFolderIds.has(folder.id))
    .map(normalizeGroupFolder)
    .map((folder) => {
      const legacyParentScope = folder.parent_folder_id
        ? legacySystemRootScopeById.get(folder.parent_folder_id)
        : null;
      if (!legacyParentScope) return folder;
      return {
        ...folder,
        parent_folder_id: entitySystemRootIdByScope.get(legacyParentScope) || folder.parent_folder_id,
      };
    });
}

export function shouldImportLegacyGroupFolders(input: {
  entityFolders: GroupFolderV1[];
  legacyFolders: GroupFolderV1[];
}): boolean {
  return legacyGroupFoldersToImport(input).length > 0;
}

export function mergeEntityAndLegacyGroupFolders(input: {
  entityFolders: GroupFolderV1[];
  legacyFolders: GroupFolderV1[];
}): GroupFolderV1[] {
  if (input.entityFolders.length > 0) return input.entityFolders.map(normalizeGroupFolder);
  return input.legacyFolders.map(normalizeGroupFolder);
}
