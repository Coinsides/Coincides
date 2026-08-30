import { useCallback, useEffect, useMemo, useState, type CSSProperties, type DragEvent, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronRight,
  Clock3,
  Folder,
  FolderPlus,
  LayoutGrid,
  Plus,
  Search,
} from 'lucide-react';
import {
  addMembersToContentGroup,
  createContentGroup,
  createContentGroupMembersFromDragPayload,
} from '@/pages/Notes/canvasEngine/contentGroupService';
import {
  readContentGroupDragPayload,
} from '@/pages/Notes/canvasEngine/contentGroupDragService';
import {
  canDeleteGroupFolder,
  createGroupFolder,
  deleteGroupFolder,
  groupFolderChildren,
  renameGroupFolder,
  systemGroupFolderId,
} from '@/pages/Notes/canvasEngine/groupFolderService';
import {
  CONTENT_GROUP_SURFACE_ROLES,
} from '@/pages/Notes/canvasEngine/contentGroupSurfaceRoleService';
import {
  moveContentGroupFolderPlacement,
} from '@/pages/Notes/canvasEngine/groupFolderRepository';
import type { ContentGroupV1, GroupFolderV1 } from '@/pages/Notes/canvasEngine/runtimeDataTypes';
import styles from './GroupGallery.module.css';
import {
  activeFolders,
  activeGroups,
  cleanLabel,
  folderPathText,
  loadGroupGalleryRecords,
  makeFolderKey,
  makeGroupKey,
  replaceRecord,
  saveGalleryRecord,
  splitKey,
  type GalleryMode,
  type GalleryRecord,
  type GroupRef,
} from './groupGalleryData';
import {
  normalizeGalleryMode,
} from './groupGalleryModeService';
import {
  buildGalleryGroupCardView,
  galleryModeLabel,
  galleryNoteLabel,
} from './groupGalleryShellModel';
import {
  buildGalleryDestinationModel,
  galleryDestinationLabel,
  groupsForGalleryDestination,
  normalizeGalleryDestinationKey,
  recordHasFolderWork,
  resolveGalleryCreationTarget,
  type GalleryDestinationKey,
} from './groupGalleryNavigationModel';

interface GroupSection {
  key: string;
  title: string;
  groups: GroupRef[];
}

const gallerySurfaceRole = CONTENT_GROUP_SURFACE_ROLES.gallery;
const galleryModeTabs: Array<{ value: GalleryMode; label: string }> = [
  { value: 'folder', label: 'Folder view' },
  { value: 'topic', label: 'Topic view' },
  { value: 'type', label: 'Type view' },
];

function topicColor(topic: string | null | undefined): string {
  const value = (topic || '').trim();
  if (!value) return '#64748b';
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  const palette = ['#38bdf8', '#22c55e', '#facc15', '#fb7185', '#a78bfa', '#f97316'];
  return palette[Math.abs(hash) % palette.length];
}

function groupFolderId(group: ContentGroupV1): string | null {
  return group.folder_id || group.placements?.[0]?.folder_id || null;
}

function scopedRootFolder(
  folders: GroupFolderV1[],
  scopeKind: GroupFolderV1['scope']['kind'],
  projectId?: string | null,
  noteId?: string | null,
): GroupFolderV1 | null {
  return folders.find((folder) => (
    folder.system_root
    && folder.scope.kind === scopeKind
    && (projectId === undefined || folder.scope.project_id === projectId)
    && (noteId === undefined || folder.scope.note_id === noteId)
  )) || null;
}

function countGroupsInFolder(records: GalleryRecord[], folderId: string): number {
  return records.reduce((count, record) => (
    count + activeGroups(record.groups).filter((group) => groupFolderId(group) === folderId).length
  ), 0);
}

function galleryBreadcrumbText(record: GalleryRecord | null, folder: GroupFolderV1 | null): string {
  if (!record || !folder) return 'Workspace';
  const folderPath = folderPathText(record.folders, folder.id)
    .split(' / ')
    .filter((part) => part.trim().length > 0);
  if (folder.scope.kind === 'workspace') {
    return ['Workspace', ...folderPath.filter((part) => part !== 'Workspace')].join(' / ');
  }
  if (folder.scope.kind === 'project') {
    return ['Workspace', record.project.name, ...folderPath].join(' / ');
  }
  return [
    'Workspace',
    record.project.name,
    galleryNoteLabel(record.note),
    ...folderPath,
  ].join(' / ');
}

export default function GroupGalleryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [records, setRecords] = useState<GalleryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<GalleryMode>(normalizeGalleryMode(searchParams.get('mode')));
  const [query, setQuery] = useState(searchParams.get('query') || '');
  const [destinationKey, setDestinationKey] = useState<GalleryDestinationKey>(
    normalizeGalleryDestinationKey(searchParams.get('destination')),
  );
  const [selectedFolderKey, setSelectedFolderKey] = useState<string | null>(null);
  const [folderTitleDraft, setFolderTitleDraft] = useState('');
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);

  useEffect(() => {
    const nextMode = normalizeGalleryMode(searchParams.get('mode'));
    const nextQuery = searchParams.get('query') || '';
    const nextDestination = normalizeGalleryDestinationKey(searchParams.get('destination'));
    setMode((current) => (current === nextMode ? current : nextMode));
    setQuery((current) => (current === nextQuery ? current : nextQuery));
    setDestinationKey((current) => (current === nextDestination ? current : nextDestination));
  }, [searchParams]);

  const loadGallery = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRecords(await loadGroupGalleryRecords());
    } catch (err) {
      console.error('Failed to load content group gallery:', err);
      setError('Failed to load content groups.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGallery();
  }, [loadGallery]);

  useEffect(() => {
    if (records.length === 0 || selectedFolderKey) return;
    const queryNoteId = searchParams.get('note_id');
    const queryFolderId = searchParams.get('folder_id');
    if (!queryNoteId || !queryFolderId) return;
    const record = records.find((item) => item.note.id === queryNoteId);
    if (!record || !record.folders.some((folder) => folder.id === queryFolderId)) return;
    setSelectedFolderKey(makeFolderKey(record.note.id, queryFolderId));
  }, [records, searchParams, selectedFolderKey]);

  const selectedFolderRef = splitKey(selectedFolderKey);
  const selectedFolderRecord = selectedFolderRef
    ? records.find((record) => record.note.id === selectedFolderRef.noteId) || null
    : null;
  const selectedFolder = selectedFolderRecord && selectedFolderRef
    ? selectedFolderRecord.folders.find((folder) => folder.id === selectedFolderRef.itemId) || null
    : null;

  useEffect(() => {
    setFolderTitleDraft(selectedFolder?.title || '');
  }, [selectedFolder?.id, selectedFolder?.title]);

  const recordsByProject = useMemo(() => {
    const map = new Map<string, GalleryRecord[]>();
    records.forEach((record) => {
      map.set(record.project.id, [...(map.get(record.project.id) || []), record]);
    });
    return Array.from(map.entries()).map(([projectId, projectRecords]) => ({
      project: projectRecords[0].project,
      records: projectRecords,
      projectId,
    }));
  }, [records]);

  const workspaceRootEntry = useMemo(() => {
    for (const record of records) {
      const folders = activeFolders(record.folders);
      const folder = scopedRootFolder(folders, 'workspace');
      if (folder) return { record, folders, folder };
    }
    return null;
  }, [records]);

  const destinationModel = useMemo(() => buildGalleryDestinationModel(records), [records]);
  const destinationLabel = galleryDestinationLabel(destinationModel, destinationKey);
  const destinationGroups = useMemo(
    () => groupsForGalleryDestination(records, destinationKey),
    [destinationKey, records],
  );
  const destinationCreationTarget = useMemo(
    () => resolveGalleryCreationTarget(records, destinationKey),
    [destinationKey, records],
  );
  const creationTarget = selectedFolderRecord && selectedFolder
    ? { record: selectedFolderRecord, folder: selectedFolder }
    : destinationCreationTarget;

  const visibleGroups = useMemo<GroupRef[]>(() => {
    const allGroups = mode === 'folder' && selectedFolder
      ? destinationGroups.filter(({ group }) => groupFolderId(group) === selectedFolder.id)
      : destinationGroups;
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) return allGroups;
    return allGroups.filter(({ record, group }) => [
      group.title,
      group.identity.topic || '',
      group.identity.type || group.identity.role || '',
      group.identity.summary || '',
      record.note.title || '',
      record.project.name,
      folderPathText(record.folders, groupFolderId(group)),
    ].join(' ').toLowerCase().includes(trimmedQuery));
  }, [destinationGroups, mode, query, selectedFolder]);

  const groupedVisibleGroups = useMemo<GroupSection[]>(() => {
    if (mode === 'folder') {
      return [{
        key: selectedFolder?.id || 'all',
        title: selectedFolder ? selectedFolder.title : destinationLabel,
        groups: visibleGroups,
      }];
    }
    const map = new Map<string, GroupRef[]>();
    visibleGroups.forEach((entry) => {
      const value = mode === 'topic'
        ? entry.group.identity.topic
        : entry.group.identity.type || entry.group.identity.role;
      const key = cleanLabel(value, mode === 'topic' ? 'No topic' : 'No type');
      map.set(key, [...(map.get(key) || []), entry]);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, groups]) => ({ key, title: key, groups }));
  }, [destinationLabel, mode, selectedFolder, visibleGroups]);

  const selectedFolderCanDelete = Boolean(selectedFolderRecord && selectedFolder && canDeleteGroupFolder({
    folders: selectedFolderRecord.folders,
    groups: selectedFolderRecord.groups,
    folderId: selectedFolder.id,
  }));

  const selectedFolderPath = selectedFolder
    ? galleryBreadcrumbText(selectedFolderRecord, selectedFolder)
    : destinationLabel;
  const creationTargetLabel = creationTarget
    ? creationTarget.folder.system_root
      ? creationTarget.folder.scope.kind === 'workspace'
        ? 'Workspace root'
        : creationTarget.folder.scope.kind === 'project'
          ? `${creationTarget.record.project.name} project root`
          : `${galleryNoteLabel(creationTarget.record.note)} note root`
      : creationTarget.folder.title
    : 'No creation target';
  const emptyMessage = query.trim()
    ? `No content groups match "${query.trim()}".`
    : mode === 'folder'
      ? 'No content groups in this folder yet.'
      : 'No content groups match this view yet.';

  const patchGallerySearchParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value && value.trim()) next.set(key, value);
      else next.delete(key);
    });
    setSearchParams(next);
  };

  const persistRecord = useCallback(async (
    record: GalleryRecord,
    groups = record.groups,
    folders = record.folders,
  ) => {
    const nextRecord = await saveGalleryRecord(record, groups, folders);
    setRecords((current) => replaceRecord(current, nextRecord));
    return nextRecord;
  }, []);

  const handleSelectFolder = (record: GalleryRecord, folderId: string) => {
    setSelectedFolderKey(makeFolderKey(record.note.id, folderId));
    patchGallerySearchParams({
      note_id: record.note.id,
      folder_id: folderId,
      mode,
      query,
    });
  };

  const handleSelectDestination = (nextDestination: GalleryDestinationKey) => {
    setDestinationKey(nextDestination);
    setSelectedFolderKey(null);
    patchGallerySearchParams({
      destination: nextDestination === 'all' ? null : nextDestination,
      note_id: null,
      folder_id: null,
      mode,
      query,
    });
  };

  const handleModeChange = (item: GalleryMode) => {
    setMode(item);
    patchGallerySearchParams({ mode: item });
  };

  const handleQueryChange = (nextQuery: string) => {
    setQuery(nextQuery);
    patchGallerySearchParams({ query: nextQuery });
  };

  const handleCreateFolder = async () => {
    if (!creationTarget) return;
    const { record, folder: parentFolder } = creationTarget;
    const siblingCount = groupFolderChildren(record.folders, parentFolder.id).length;
    const title = siblingCount === 0 ? 'New folder' : `New folder ${siblingCount + 1}`;
    const nextFolder = createGroupFolder({
      title,
      scope: parentFolder.scope,
      parentFolderId: parentFolder.id,
      orderIndex: record.folders.length,
    });
    await persistRecord(record, record.groups, [...record.folders, nextFolder]);
    handleSelectFolder(record, nextFolder.id);
  };

  const handleRenameFolder = async () => {
    if (!selectedFolderRecord || !selectedFolder || selectedFolder.system_root) return;
    const title = folderTitleDraft.trim();
    if (!title || title === selectedFolder.title) return;
    await persistRecord(
      selectedFolderRecord,
      selectedFolderRecord.groups,
      renameGroupFolder({ folders: selectedFolderRecord.folders, folderId: selectedFolder.id, title }),
    );
  };

  const handleDeleteFolder = async () => {
    if (!selectedFolderRecord || !selectedFolder || selectedFolder.system_root) return;
    const nextFolders = deleteGroupFolder({
      folders: selectedFolderRecord.folders,
      groups: selectedFolderRecord.groups,
      folderId: selectedFolder.id,
      allowNonEmpty: false,
    });
    if (nextFolders === selectedFolderRecord.folders) return;
    await persistRecord(selectedFolderRecord, selectedFolderRecord.groups, nextFolders);
    const noteRoot = systemGroupFolderId({
      kind: 'note',
      project_id: selectedFolderRecord.note.course_id,
      note_id: selectedFolderRecord.note.id,
      label: null,
    });
    handleSelectFolder(selectedFolderRecord, noteRoot);
  };

  const handleMoveGroupToFolder = async (record: GalleryRecord, group: ContentGroupV1) => {
    if (!selectedFolder) return;
    const savedGroup = await moveContentGroupFolderPlacement({
      groupId: group.id,
      folderId: selectedFolder.id,
    });
    setRecords((current) => current.map((currentRecord) => (
      currentRecord.note.id === record.note.id
        ? {
          ...currentRecord,
          groups: currentRecord.groups.map((item) => item.id === savedGroup.id ? savedGroup : item),
        }
        : currentRecord
    )));
  };

  const openEditor = (record: GalleryRecord, group: ContentGroupV1) => {
    const params = new URLSearchParams({
      note_id: record.note.id,
      group_id: group.id,
    });
    const folderId = groupFolderId(group);
    if (folderId) params.set('folder_id', folderId);
    params.set('mode', mode);
    if (query.trim()) params.set('query', query.trim());
    navigate(`/group-gallery/editor?${params.toString()}`);
  };

  const handleCreateGroup = async () => {
    if (!creationTarget) return;
    const { record, folder } = creationTarget;
    const nextGroup = createContentGroup({
      projectId: record.note.course_id,
      noteId: record.note.id,
      canvasId: record.note.id,
      title: 'New content group',
      folderId: folder.id,
      folders: record.folders,
      members: [],
    });
    const nextRecord = await persistRecord(record, [...record.groups, nextGroup]);
    openEditor(nextRecord, nextGroup);
  };

  const membersFromDragEvent = (event: DragEvent<HTMLElement>) => {
    const payload = readContentGroupDragPayload(event.dataTransfer);
    return payload ? createContentGroupMembersFromDragPayload(payload) : [];
  };

  const handleGroupCardDragOver = (event: DragEvent<HTMLElement>, key: string) => {
    const members = membersFromDragEvent(event);
    if (members.length === 0) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setDropTargetKey(key);
  };

  const handleDropOnGroupCard = async (
    event: DragEvent<HTMLElement>,
    record: GalleryRecord,
    group: ContentGroupV1,
  ) => {
    const members = membersFromDragEvent(event);
    if (members.length === 0) return;
    event.preventDefault();
    event.stopPropagation();
    setDropTargetKey(null);
    await persistRecord(
      record,
      record.groups.map((item) => (
        item.id === group.id ? addMembersToContentGroup(group, members) : item
      )),
      record.folders,
    );
  };

  const renderFolderBranch = (
    record: GalleryRecord,
    folders: GroupFolderV1[],
    folder: GroupFolderV1,
    depth = 0,
  ): ReactNode[] => {
    const key = makeFolderKey(record.note.id, folder.id);
    const selected = selectedFolderKey === key;
    const childCount = groupFolderChildren(folders, folder.id).length;
    return [
      <button
        key={key}
        type="button"
        className={`${styles.folderRow} ${selected ? styles.folderRowActive : ''}`}
        style={{ paddingLeft: `${10 + depth * 14}px` }}
        onClick={() => handleSelectFolder(record, folder.id)}
      >
        <ChevronRight className={styles.folderRowChevron} size={12} data-visible={childCount > 0} />
        <Folder className={styles.folderIconSlot} size={13} />
        <span className={styles.folderRowLabel}>{folder.title}</span>
        {selected ? <span className={styles.folderCurrent}>current</span> : null}
        <span className={styles.folderCount}>{countGroupsInFolder(records, folder.id)}</span>
      </button>,
      ...groupFolderChildren(folders, folder.id).flatMap((child) => (
        renderFolderBranch(record, folders, child, depth + 1)
      )),
    ];
  };

  return (
    <div
      className={styles.page}
      data-gallery-mode={mode}
      data-content-group-surface={gallerySurfaceRole.surface}
      data-content-group-role={gallerySurfaceRole.verb}
    >
      <header className={styles.galleryHeader}>
        <div className={styles.galleryTitleBlock}>
          <h1>Group Gallery</h1>
          <p>Organize content groups across workspace, projects, notes, and custom scopes.</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.searchBox}>
            <Search size={15} />
            <input
              value={query}
              onChange={(event) => handleQueryChange(event.currentTarget.value)}
              placeholder="Search folders and groups"
              aria-label="Search folders and groups"
            />
          </div>
          <button
            className={styles.iconTextButton}
            type="button"
            onClick={() => void handleCreateFolder()}
            disabled={!creationTarget}
          >
            <FolderPlus size={15} />
            New folder
          </button>
          <button
            className={styles.primaryButton}
            type="button"
            onClick={() => void handleCreateGroup()}
            disabled={!creationTarget}
          >
            <Plus size={15} />
            New group
          </button>
          <button
            className={styles.toolbarButton}
            type="button"
            onClick={() => (selectedFolderRecord ? navigate(`/notes/${selectedFolderRecord.note.id}`) : navigate(-1))}
          >
            返回
          </button>
        </div>
      </header>

      <section className={styles.galleryShell}>
        <aside className={`${styles.folderPane} ${styles.destinationPane}`} aria-label="Gallery destinations">
          <div className={styles.paneHeader}>
            <span>去处</span>
          </div>
          <nav className={styles.destinationNav} aria-label="固定去处">
            {destinationModel.primary.map((destination) => (
              <button
                key={destination.key}
                type="button"
                className={`${styles.destinationRow} ${destinationKey === destination.key ? styles.destinationRowActive : ''}`}
                onClick={() => handleSelectDestination(destination.key)}
              >
                {destination.kind === 'recent' ? <Clock3 size={15} /> : <LayoutGrid size={15} />}
                <span className={styles.destinationLabel}>{destination.label}</span>
                {destination.count === null ? null : <span className={styles.destinationCount}>{destination.count}</span>}
              </button>
            ))}
            <div className={styles.destinationDivider} />
            <span className={styles.destinationSectionLabel}>按项目</span>
            {destinationModel.scoped.map((destination) => (
              <button
                key={destination.key}
                type="button"
                className={`${styles.destinationRow} ${destinationKey === destination.key ? styles.destinationRowActive : ''}`}
                onClick={() => handleSelectDestination(destination.key)}
              >
                {destination.kind === 'project' ? (
                  <span className={styles.projectDot} style={{ background: destination.color || '#64748b' }} />
                ) : <Folder size={15} />}
                <span className={styles.destinationLabel}>{destination.label}</span>
                <span className={styles.destinationCount}>{destination.count}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className={styles.galleryPane}>
          <div className={styles.galleryToolbar}>
            <div className={styles.modeTabs} role="tablist" aria-label="Group gallery view">
              {galleryModeTabs.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={mode === item.value ? styles.modeActive : ''}
                  onClick={() => handleModeChange(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className={styles.viewSummary}>
              <span>{mode === 'folder' ? `${destinationLabel} groups` : `${galleryModeLabel(mode)} groups`}</span>
              <span>{visibleGroups.length} visible</span>
            </div>
          </div>

          {mode === 'folder' ? (
            <section className={styles.folderWorkspace} aria-label="Folder view navigator">
              <div className={styles.folderWorkspaceHeader}>
                <span>Folder view</span>
                <span>{destinationLabel}</span>
              </div>
              <div className={styles.folderWorkspaceTree}>
                {destinationKey !== 'workspace' && destinationKey.startsWith('project:') ? null : (
                  workspaceRootEntry && (
                    countGroupsInFolder(records, workspaceRootEntry.folder.id) > 0
                    || groupFolderChildren(workspaceRootEntry.folders, workspaceRootEntry.folder.id).length > 0
                    || destinationKey === 'workspace'
                  ) ? (
                    <section className={styles.workspaceGroup}>
                      {renderFolderBranch(workspaceRootEntry.record, workspaceRootEntry.folders, workspaceRootEntry.folder)}
                    </section>
                  ) : null
                )}
                {destinationKey === 'workspace' ? null : recordsByProject
                  .filter(({ projectId }) => (
                    !destinationKey.startsWith('project:') || destinationKey === `project:${projectId}`
                  ))
                  .map(({ project, records: projectRecords }) => {
                    const recordsWithFolderWork = projectRecords.filter(recordHasFolderWork);
                    if (recordsWithFolderWork.length === 0) return null;
                    const projectRootEntry = projectRecords
                      .map((record) => {
                        const folders = activeFolders(record.folders);
                        return {
                          record,
                          folders,
                          folder: scopedRootFolder(folders, 'project', project.id, null),
                        };
                      })
                      .find((entry) => entry.folder);
                    return (
                      <section key={project.id} className={styles.folderWorkspaceProject}>
                        <div className={styles.folderWorkspaceContext}>
                          <span className={styles.projectDot} style={{ background: project.color || '#64748b' }} />
                          <span>{project.name}</span>
                        </div>
                        {projectRootEntry?.folder ? (
                          <div className={styles.projectRootBlock}>
                            {renderFolderBranch(projectRootEntry.record, projectRootEntry.folders, projectRootEntry.folder)}
                          </div>
                        ) : null}
                        {recordsWithFolderWork.map((record) => {
                          const folders = activeFolders(record.folders);
                          const noteRoot = scopedRootFolder(folders, 'note', record.project.id, record.note.id);
                          return noteRoot ? (
                            <div key={record.note.id} className={styles.noteFolderBlock}>
                              <span className={styles.folderWorkspaceNote}>{record.note.title || '未命名'}</span>
                              {renderFolderBranch(record, folders, noteRoot)}
                            </div>
                          ) : null;
                        })}
                      </section>
                    );
                  })}
              </div>
            </section>
          ) : null}

          <div className={styles.scopeBar}>
            <div className={styles.scopeBlock}>
              <span className={styles.scopeLabel}>{selectedFolder ? 'Selected folder' : 'Destination target'}</span>
              <div className={styles.breadcrumbLine}>
                {selectedFolderPath.split(' / ').map((part, index) => (
                  <span key={`${part}-${index}`}>{part}</span>
                ))}
              </div>
            </div>
            {selectedFolder && !selectedFolder.system_root ? (
              <div className={styles.selectionActions}>
                <input
                  className={styles.folderRenameInput}
                  value={folderTitleDraft}
                  onChange={(event) => setFolderTitleDraft(event.currentTarget.value)}
                  aria-label="Selected folder name"
                />
                <button
                  type="button"
                  onClick={() => void handleRenameFolder()}
                  disabled={!folderTitleDraft.trim() || folderTitleDraft.trim() === selectedFolder.title}
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteFolder()}
                  disabled={!selectedFolderCanDelete}
                  title={selectedFolderCanDelete ? 'Delete folder' : 'Only empty user folders can be deleted'}
                >
                  Delete
                </button>
              </div>
            ) : null}
          </div>

          <div className={styles.groupSections}>
            {error ? (
              <div className={styles.statePanel}>
                <strong>Gallery could not load.</strong>
                <span>{error}</span>
                <button type="button" onClick={() => void loadGallery()}>Retry</button>
              </div>
            ) : loading ? (
              <div className={styles.statePanel}>Loading content groups</div>
            ) : visibleGroups.length === 0 ? (
              <div className={styles.statePanel}>{emptyMessage}</div>
            ) : groupedVisibleGroups.map((section) => (
              <section key={section.key} className={styles.groupSection}>
                {mode === 'folder' ? null : <h2>{section.title}</h2>}
                <div className={styles.groupGrid}>
                  {section.groups.map(({ record, group }) => {
                    const key = makeGroupKey(record.note.id, group.id);
                    const folderId = groupFolderId(group);
                    const card = buildGalleryGroupCardView({
                      group,
                      folders: record.folders,
                      folderId,
                      sourceProject: record.project,
                      sourceNote: record.note,
                    });
                    const topicStyle = {
                      '--topic-color': topicColor(group.identity.topic),
                    } as CSSProperties;
                    return (
                      <article
                        key={key}
                        className={`${styles.groupCard} ${dropTargetKey === key ? styles.groupCardDropTarget : ''}`}
                        style={topicStyle}
                        onDragOver={(event) => handleGroupCardDragOver(event, key)}
                        onDragLeave={() => setDropTargetKey((current) => (current === key ? null : current))}
                        onDrop={(event) => void handleDropOnGroupCard(event, record, group)}
                      >
                        <span className={styles.cardRoleTab}>{card.typeLabel}</span>
                        <button
                          type="button"
                          className={styles.cardInfoButton}
                          title={`${card.memberCountLabel}; ${card.folderPath}`}
                          aria-label={`Open source note for ${card.title}`}
                          onClick={() => navigate(`/notes/${record.note.id}`)}
                        >
                          i
                        </button>
                        {selectedFolder && folderId !== selectedFolder.id ? (
                          <button
                            type="button"
                            className={styles.cardMoveButton}
                            onClick={() => void handleMoveGroupToFolder(record, group)}
                          >
                            Move here
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className={styles.groupCardMain}
                          onClick={() => openEditor(record, group)}
                        >
                          <span className={styles.cardTitle}>{card.title}</span>
                          <span className={styles.cardPreview}>{card.preview}</span>
                          <span className={styles.cardBottom}>
                            <span className={styles.cardIdentityBlock}>
                              <span className={styles.cardTopic}>
                                <span className={styles.topicDot} />
                                {card.topicLabel}
                              </span>
                            </span>
                            <span
                              className={styles.statusChip}
                              data-status-kind={card.statusKind}
                              title={card.statusReason}
                            >
                              {card.statusLabel}
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          className={styles.cardOriginBadge}
                          aria-label={card.originLabel}
                          onClick={() => navigate(card.originRoute)}
                        >
                          <span className={styles.originDot} style={{ background: card.originColor }} />
                          <span>{card.originLabel}</span>
                        </button>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </main>
      </section>
      <footer className={styles.galleryStatusBar}>
        <span>New groups and folders: {creationTargetLabel}</span>
        <span>{galleryModeLabel(mode)} · {visibleGroups.length} visible groups · {destinationLabel} destination</span>
      </footer>
    </div>
  );
}
