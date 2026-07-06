import {
  Check,
  ChevronRight,
  ExternalLink,
  Folder,
  Menu,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type DragEvent,
  type SyntheticEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  addMembersToContentGroup,
  createContentGroup,
  createContentGroupMemberFromAnnotation,
  createContentGroupMemberFromBlock,
  createContentGroupMembersFromDragPayload,
  createContentGroupMemberFromRange,
  moveContentGroupToFolder,
  softDeleteContentGroup,
} from '../contentGroupService';
import {
  buildContentGroupIndex,
  filterContentGroupIndex,
} from '../contentGroupIndexService';
import {
  hasContentGroupDragPayloadType,
  readContentGroupDragPayload,
} from '../contentGroupDragService';
import {
  groupFolderChildren,
  systemGroupFolderId,
} from '../groupFolderService';
import {
  CONTENT_GROUP_SURFACE_ROLES,
} from '../contentGroupSurfaceRoleService';
import type {
  AnnotationRangeV1,
  AnnotationTruthV1,
  ContentGroupMemberV1,
  ContentGroupV1,
  GroupFolderV1,
  NoteBlock,
} from '../runtimeDataTypes';
import {
  buildRailGroupRowView,
  cleanRailLabel,
  railFolderPathText,
  railGroupMatchesQuery,
  railSelectionLabel,
} from './contentGroupRailShellModel';
import styles from '../../NoteDetail.module.css';

const railSurfaceRole = CONTENT_GROUP_SURFACE_ROLES.rail;
const sourceNoteTitle = 'Current note';

type RailViewMode = 'folder' | 'topic' | 'type' | 'all';

const railViewTabs: { id: RailViewMode; label: string }[] = [
  { id: 'folder', label: 'Folder' },
  { id: 'topic', label: 'Topic' },
  { id: 'type', label: 'Type' },
  { id: 'all', label: 'All' },
];

interface ContentGroupPanelProps {
  annotations: AnnotationTruthV1[];
  contentGroups: ContentGroupV1[];
  groupFolders: GroupFolderV1[];
  blocks: NoteBlock[];
  selectedAnnotationIds: string[];
  draftRanges: AnnotationRangeV1[];
  selectedBlockId?: string | null;
  projectId: string;
  noteId: string;
  canvasId: string;
  onClose: () => void;
  onSaveContentGroups: (groups: ContentGroupV1[]) => Promise<void> | void;
  onSaveGroupFolders: (folders: GroupFolderV1[]) => Promise<void> | void;
}

function groupFolderId(group: ContentGroupV1): string | null {
  return group.folder_id || group.placements?.[0]?.folder_id || null;
}

function sortGroupsForRailView(groups: ContentGroupV1[], viewMode: RailViewMode): ContentGroupV1[] {
  const collator = new Intl.Collator('en', { sensitivity: 'base' });
  const sorted = [...groups];
  if (viewMode === 'topic') {
    return sorted.sort((left, right) => (
      collator.compare(cleanRailLabel(left.identity.topic, 'No topic'), cleanRailLabel(right.identity.topic, 'No topic'))
      || collator.compare(left.title, right.title)
    ));
  }
  if (viewMode === 'type') {
    return sorted.sort((left, right) => (
      collator.compare(
        cleanRailLabel(left.identity.type || left.identity.role, 'no type'),
        cleanRailLabel(right.identity.type || right.identity.role, 'no type'),
      )
      || collator.compare(left.title, right.title)
    ));
  }
  if (viewMode === 'all') {
    return sorted.sort((left, right) => collator.compare(left.title, right.title));
  }
  return sorted;
}

export function ContentGroupPanel({
  annotations,
  contentGroups,
  groupFolders,
  blocks,
  selectedAnnotationIds,
  draftRanges,
  selectedBlockId,
  projectId,
  noteId,
  canvasId,
  onClose,
  onSaveContentGroups,
}: ContentGroupPanelProps) {
  const navigate = useNavigate();
  const activeGroups = useMemo(
    () => contentGroups.filter((group) => group.status !== 'deleted'),
    [contentGroups],
  );
  const activeFolders = useMemo(
    () => groupFolders.filter((folder) => folder.status !== 'deleted'),
    [groupFolders],
  );
  const noteRootFolderId = useMemo(() => systemGroupFolderId({
    kind: 'note',
    project_id: projectId,
    note_id: noteId,
    label: null,
  }), [noteId, projectId]);
  const folderById = useMemo(
    () => new Map(activeFolders.map((folder) => [folder.id, folder])),
    [activeFolders],
  );
  const annotationById = useMemo(
    () => new Map(annotations.filter((annotation) => annotation.status !== 'deleted').map((annotation) => [annotation.id, annotation])),
    [annotations],
  );
  const candidateMembers = useMemo(() => {
    const annotationMembers = selectedAnnotationIds
      .map((id, index) => {
        const annotation = annotationById.get(id);
        return annotation ? createContentGroupMemberFromAnnotation(annotation, index) : null;
      })
      .filter((member): member is ContentGroupMemberV1 => Boolean(member));
    const rangeMembers = draftRanges.map((range, index) => (
      createContentGroupMemberFromRange(range, annotationMembers.length + index)
    ));
    const selectedBlock = selectedBlockId ? blocks.find((block) => block.id === selectedBlockId) : null;
    const blockMembers = selectedBlock
      ? [createContentGroupMemberFromBlock(selectedBlock, annotationMembers.length + rangeMembers.length)]
      : [];
    return [...annotationMembers, ...rangeMembers, ...blockMembers];
  }, [annotationById, blocks, draftRanges, selectedAnnotationIds, selectedBlockId]);

  const [createOpen, setCreateOpen] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState('New content group');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(noteRootFolderId);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [folderMenuOpen, setFolderMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<RailViewMode>('folder');

  useEffect(() => {
    if (selectedFolderId && activeFolders.some((folder) => folder.id === selectedFolderId)) return;
    setSelectedFolderId(noteRootFolderId);
  }, [activeFolders, noteRootFolderId, selectedFolderId]);

  const stopPanelEvent = (event: SyntheticEvent) => {
    event.stopPropagation();
  };

  const replaceGroup = async (nextGroup: ContentGroupV1) => {
    await onSaveContentGroups(contentGroups.map((group) => group.id === nextGroup.id ? nextGroup : group));
  };

  const handleCreateGroup = async (members = candidateMembers) => {
    const nextGroup = createContentGroup({
      projectId,
      noteId,
      canvasId,
      title: newGroupTitle,
      members,
      folderId: selectedFolderId || noteRootFolderId,
      folders: activeFolders,
    });
    await onSaveContentGroups([...contentGroups, nextGroup]);
    setExpandedGroupId(nextGroup.id);
    setCreateOpen(false);
    setNewGroupTitle('New content group');
  };

  const handleAddCandidates = async (group: ContentGroupV1) => {
    if (candidateMembers.length === 0) return;
    await replaceGroup(addMembersToContentGroup(group, candidateMembers));
    setExpandedGroupId(group.id);
  };

  const membersFromDragEvent = (event: DragEvent<HTMLElement>): ContentGroupMemberV1[] => {
    const payload = readContentGroupDragPayload(event.dataTransfer);
    if (!payload) return [];
    return createContentGroupMembersFromDragPayload(payload, {
      annotations,
      blocks,
    });
  };

  const handleDropOnGroup = async (event: DragEvent<HTMLElement>, group: ContentGroupV1) => {
    event.preventDefault();
    event.stopPropagation();
    const members = membersFromDragEvent(event);
    if (members.length === 0) return;
    await replaceGroup(addMembersToContentGroup(group, members));
    setExpandedGroupId(group.id);
  };

  const handleDropOnNewGroup = async (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const members = membersFromDragEvent(event);
    if (members.length === 0) return;
    await handleCreateGroup(members);
  };

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    if (!hasContentGroupDragPayloadType(event.dataTransfer)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const openGallery = () => {
    const params = new URLSearchParams({
      note_id: noteId,
      folder_id: selectedFolderId || noteRootFolderId,
    });
    navigate(`/group-gallery?${params.toString()}`);
  };

  const openEditor = (group: ContentGroupV1) => {
    const params = new URLSearchParams({
      note_id: noteId,
      group_id: group.id,
    });
    const folderId = groupFolderId(group);
    if (folderId) params.set('folder_id', folderId);
    navigate(`/group-gallery/editor?${params.toString()}`);
  };

  const candidateLabel = railSelectionLabel(candidateMembers.length);
  const hasCandidateMembers = candidateMembers.length > 0;

  const indexEntries = useMemo(() => buildContentGroupIndex({
    groups: activeGroups,
    folders: activeFolders,
  }), [activeFolders, activeGroups]);
  const visibleEntries = useMemo(() => filterContentGroupIndex({
    entries: indexEntries,
    folderId: selectedFolderId,
  }), [indexEntries, selectedFolderId]);
  const folderScopedGroups = useMemo(() => {
    const entryGroups = visibleEntries.map((entry) => entry.group);
    if (selectedFolderId !== noteRootFolderId) return entryGroups;
    const entryGroupIds = new Set(entryGroups.map((group) => group.id));
    const orphanGroups = activeGroups.filter((group) => (
      !entryGroupIds.has(group.id)
      && !group.folder_id
      && (!group.placements || group.placements.length === 0)
    ));
    return [...entryGroups, ...orphanGroups];
  }, [activeGroups, noteRootFolderId, selectedFolderId, visibleEntries]);
  const visibleChildFolders = useMemo(
    () => groupFolderChildren(activeFolders, selectedFolderId || noteRootFolderId),
    [activeFolders, noteRootFolderId, selectedFolderId],
  );
  const scopeLabel = railFolderPathText(activeFolders, selectedFolderId || noteRootFolderId);
  const scopeParts = scopeLabel.split(' / ').filter(Boolean);
  const shortScopeLabel = scopeParts[scopeParts.length - 1] || scopeLabel;
  const groupsForView = useMemo(() => (
    sortGroupsForRailView(viewMode === 'folder' ? folderScopedGroups : activeGroups, viewMode)
  ), [activeGroups, folderScopedGroups, viewMode]);
  const visibleGroupRows = useMemo(() => groupsForView
    .map((group) => {
      const folderId = groupFolderId(group);
      const folder = folderId ? folderById.get(folderId) || null : null;
      const row = buildRailGroupRowView({ group, folder, sourceNoteTitle });
      return { group, folder, row };
    })
    .filter(({ group, row }) => railGroupMatchesQuery({ group, row, query })),
  [folderById, groupsForView, query]);

  return (
    <aside
      className={styles.contentGroupPanel}
      aria-label="Content groups"
      data-content-group-surface={railSurfaceRole.surface}
      data-content-group-role={railSurfaceRole.verb}
      role="dialog"
      onPointerDown={stopPanelEvent}
      onMouseDown={stopPanelEvent}
      onClick={stopPanelEvent}
      onDoubleClick={stopPanelEvent}
    >
      <header className={styles.contentGroupHeader}>
        <div className={styles.contentGroupHeaderTitle}>
          <span className={styles.contentGroupActiveDot} />
          <strong>Groups</strong>
        </div>
        <div className={styles.contentGroupActionRow}>
          <button type="button" className={styles.iconBtn} onClick={openGallery} aria-label="Open Group Gallery">
            <Menu size={15} />
          </button>
          <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Close content groups">
            <X size={15} />
          </button>
        </div>
      </header>

      <section className={styles.contentGroupFolderBar}>
        <button
          type="button"
          className={styles.contentGroupFolderLine}
          aria-expanded={folderMenuOpen}
          onClick={() => setFolderMenuOpen((open) => !open)}
        >
          <Folder size={13} />
          <span>{scopeLabel}</span>
          <ChevronRight className={styles.contentGroupFolderChevron} size={13} />
        </button>
        {folderMenuOpen ? (
          <div className={styles.contentGroupFolderMenu} aria-label="Rail folder selector">
            <button
              type="button"
              className={styles.contentGroupFolderRow}
              onClick={() => {
                setSelectedFolderId(noteRootFolderId);
                setFolderMenuOpen(false);
              }}
            >
              <Folder size={13} />
              <span>Note groups</span>
            </button>
            {visibleChildFolders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                className={styles.contentGroupFolderRow}
                onClick={() => {
                  setSelectedFolderId(folder.id);
                  setFolderMenuOpen(false);
                }}
              >
                <Folder size={13} />
                <span>{folder.title}</span>
              </button>
            ))}
            <button type="button" className={styles.contentGroupFolderRow} onClick={openGallery}>
              <ExternalLink size={13} />
              <span>Open full Gallery</span>
            </button>
          </div>
        ) : null}
      </section>

      <div className={styles.contentGroupToolRow}>
        <button type="button" className={styles.iconBtn} onClick={() => setCreateOpen((open) => !open)} aria-label="New group">
          <Plus size={15} />
        </button>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={() => setSearchOpen((open) => !open)}
          aria-label="Search"
          aria-pressed={searchOpen}
        >
          <Search size={15} />
        </button>
        <button type="button" className={styles.iconBtn} aria-label="Rail local view controls">
          <SlidersHorizontal size={15} />
        </button>
        <span className={styles.contentGroupToolScope}>{shortScopeLabel}</span>
      </div>

      {searchOpen ? (
        <div className={styles.contentGroupSearchRow}>
          <input
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Search folders or groups..."
            aria-label="Search content groups"
          />
        </div>
      ) : <div className={styles.contentGroupSearchRow} data-collapsed="true" aria-hidden="true" />}

      <div className={styles.contentGroupViewTabs} role="tablist" aria-label="Rail view">
        {railViewTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={viewMode === tab.id}
            className={viewMode === tab.id ? styles.contentGroupViewTabActive : ''}
            onClick={() => setViewMode(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <main className={styles.contentGroupRailScroll}>
        {createOpen ? (
          <section className={styles.contentGroupDraftBox} aria-label="Create content group">
            <input
              className={styles.contentGroupInput}
              value={newGroupTitle}
              onChange={(event) => setNewGroupTitle(event.currentTarget.value)}
              aria-label="New content group name"
              autoFocus
            />
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => void handleCreateGroup()}
              disabled={!newGroupTitle.trim()}
              aria-label="Create new group"
            >
              <Check size={15} />
            </button>
            <button type="button" className={styles.iconBtn} onClick={() => setCreateOpen(false)} aria-label="Cancel new group">
              <X size={15} />
            </button>
          </section>
        ) : null}

        {hasCandidateMembers ? (
          <section
            className={styles.contentGroupDropZone}
            data-content-group-intake="new-group"
            onDragOver={handleDragOver}
            onDrop={(event) => void handleDropOnNewGroup(event)}
          >
            <span>Drop selected content here</span>
            <small>{candidateLabel}. Create a group from the current selection.</small>
          </section>
        ) : null}

        <div className={styles.contentGroupSectionLabel}>Content groups</div>

        <div className={styles.contentGroupList}>
          {visibleGroupRows.length === 0 ? (
            <p className={styles.contentGroupEmpty}>
              {query.trim() ? `No content groups match "${query.trim()}".` : 'No content groups yet.'}
            </p>
          ) : visibleGroupRows.map(({ group, folder, row }) => {
            const expanded = expandedGroupId === group.id;
            const rowStyle = { '--rail-topic-color': row.topicColor } as CSSProperties;
            const shouldShowMove = Boolean(selectedFolderId && groupFolderId(group) !== selectedFolderId);
            return (
              <section
                key={group.id}
                className={[
                  styles.contentGroupUnit,
                  expanded ? styles.contentGroupRowActive : '',
                ].filter(Boolean).join(' ')}
                style={rowStyle}
                onDragOver={handleDragOver}
                onDrop={(event) => void handleDropOnGroup(event, group)}
              >
                <button
                  type="button"
                  className={styles.contentGroupRow}
                  aria-expanded={expanded}
                  onClick={() => setExpandedGroupId(expanded ? null : group.id)}
                  title={`${row.topicLabel} / ${row.memberCountLabel}. ${row.stabilityReason}`}
                >
                  <span className={styles.contentGroupTopicStrip} />
                  <span className={styles.contentGroupName}>{row.title}</span>
                  <span className={styles.contentGroupRoleBadge}>{row.typeLabel}</span>
                  <span className={styles.contentGroupStatusChip} data-status-kind={row.statusLabel}>
                    {row.statusLabel}
                  </span>
                  <ChevronRight className={expanded ? styles.contentGroupChevronOpen : ''} size={14} />
                </button>

                {expanded ? (
                  <div className={styles.contentGroupExpandedArea}>
                    <div
                      className={styles.contentGroupDropZone}
                      data-content-group-intake="existing-group"
                      onDragOver={handleDragOver}
                      onDrop={(event) => void handleDropOnGroup(event, group)}
                    >
                      <span>Drop selected content here</span>
                      <small>{hasCandidateMembers ? candidateLabel : 'Select text, label, or block first.'}</small>
                    </div>

                    <div className={styles.contentGroupExpandedActions}>
                      <button type="button" className={styles.contentGroupOpenEditor} onClick={() => openEditor(group)}>
                        Open editor
                      </button>
                      <span className={styles.contentGroupSourceIndicator}>
                        {folder ? folder.title : row.sourceLabel}
                      </span>
                      <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() => void replaceGroup(softDeleteContentGroup(group))}
                        aria-label="Delete content group"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {(hasCandidateMembers || shouldShowMove) ? (
                      <div className={styles.contentGroupActionRow}>
                        {hasCandidateMembers ? (
                          <button
                            type="button"
                            className={styles.secondaryBtn}
                            onClick={() => void handleAddCandidates(group)}
                            title="Add the current item to this group."
                          >
                            <Plus size={14} />
                            Add current item
                          </button>
                        ) : null}
                        {shouldShowMove ? (
                        <button
                          type="button"
                          className={styles.secondaryBtn}
                          onClick={() => void replaceGroup(moveContentGroupToFolder({ group, folderId: selectedFolderId }))}
                        >
                          Move here
                        </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      </main>

      <footer className={styles.contentGroupStatusBar}>
        <span>{visibleGroupRows.length} groups</span>
        <span>{hasCandidateMembers ? 'selected content ready' : 'no selection'}</span>
      </footer>
    </aside>
  );
}
