import {
  Archive,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronRight,
  ExternalLink,
  Folder,
  Layers3,
  Menu,
  Plus,
  Save,
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
  createContentGroupMemberFromItem,
  createContentGroupMembersFromDragPayload,
  createContentGroupMemberFromRange,
  moveContentGroupToFolder,
  removeContentGroupMember,
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
import {
  castItemFromAnchors,
  collectItemAnchor,
  discardItemAnchor,
  loadItem,
  loadPoolItemAnchors,
  retireItem,
  updateItem,
  type CollectItemAnchorInput,
} from '../itemRepository';
import {
  activePurposeFrames,
  movePurposeMember,
  removePurposeItemMember,
  upsertPurposeItemMember,
} from '../purposeService';
import type {
  AnnotationRangeV1,
  AnnotationTruthV1,
  ContentGroupMemberV1,
  ContentGroupV1,
  GroupFolderV1,
  ItemAnchorV1,
  ItemV1,
  NoteBlock,
  PurposeFrameV1,
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
  purposeFrames: PurposeFrameV1[];
  blocks: NoteBlock[];
  selectedAnnotationIds: string[];
  draftRanges: AnnotationRangeV1[];
  selectedBlockId?: string | null;
  projectId: string;
  noteId: string;
  canvasId: string;
  onClose: () => void;
  onSaveContentGroups: (groups: ContentGroupV1[]) => Promise<boolean | void> | boolean | void;
  onSaveGroupFolders: (folders: GroupFolderV1[]) => Promise<void> | void;
  onSavePurposeFrames: (purposes: PurposeFrameV1[]) => Promise<boolean | void> | boolean | void;
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

function itemErrorMessage(error: unknown): string {
  const response = error && typeof error === 'object' ? (error as any).response : null;
  const apiMessage = response?.data?.error;
  if (typeof apiMessage === 'string' && apiMessage) return apiMessage;
  if (error instanceof Error && error.message) return error.message;
  return 'Item operation failed.';
}

function anchorExcerpt(member: ContentGroupMemberV1, range?: AnnotationRangeV1 | null): string {
  return String(
    range?.range_text_cache
    || member.current_content
    || member.preview_text
    || member.label
    || '',
  ).trim();
}

function anchorInputsForMember(
  group: ContentGroupV1,
  member: ContentGroupMemberV1,
): CollectItemAnchorInput[] {
  const common = {
    pool_scope_kind: 'content_group' as const,
    pool_scope_id: group.id,
    collected_for: group.title,
    created_by: 'human',
  };
  if (member.kind === 'block' && member.target_id) {
    const excerpt = anchorExcerpt(member);
    return excerpt ? [{
      ...common,
      target_kind: 'block',
      target_id: member.target_id,
      excerpt,
    }] : [];
  }
  if (member.kind === 'content_range' && member.content_range) {
    const excerpt = anchorExcerpt(member, member.content_range);
    return excerpt ? [{
      ...common,
      target_kind: 'content_range',
      target_id: member.content_range.id,
      range_json: { ...member.content_range },
      excerpt,
    }] : [];
  }
  if (member.kind === 'annotation') {
    const sourceRanges = Array.isArray(member.metadata?.source_ranges)
      ? member.metadata.source_ranges
        .filter((range): range is AnnotationRangeV1 => Boolean(range && typeof range === 'object' && 'id' in range))
      : [];
    return sourceRanges.flatMap((range) => {
      const excerpt = anchorExcerpt(member, range);
      return excerpt ? [{
        ...common,
        target_kind: 'content_range' as const,
        target_id: range.id,
        range_json: { ...range },
        excerpt,
        metadata: { annotation_id: member.target_id || null },
      }] : [];
    });
  }
  return [];
}

export function ContentGroupPanel({
  annotations,
  contentGroups,
  groupFolders,
  purposeFrames,
  blocks,
  selectedAnnotationIds,
  draftRanges,
  selectedBlockId,
  projectId,
  noteId,
  canvasId,
  onClose,
  onSaveContentGroups,
  onSavePurposeFrames,
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
  const activePurposes = useMemo(
    () => activePurposeFrames(purposeFrames),
    [purposeFrames],
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
  const [itemWorkbenchGroupId, setItemWorkbenchGroupId] = useState<string | null>(null);
  const [poolAnchors, setPoolAnchors] = useState<ItemAnchorV1[]>([]);
  const [selectedPoolAnchorIds, setSelectedPoolAnchorIds] = useState<string[]>([]);
  const [castBody, setCastBody] = useState('');
  const [castType, setCastType] = useState('');
  const [castTopic, setCastTopic] = useState('');
  const [itemById, setItemById] = useState<Record<string, ItemV1>>({});
  const [inspectedItemId, setInspectedItemId] = useState<string | null>(null);
  const [itemDraft, setItemDraft] = useState({ plainText: '', itemType: '', topic: '' });
  const [purposeEdgeDrafts, setPurposeEdgeDrafts] = useState<Record<string, {
    role: string;
    fitness: string;
  }>>({});
  const [unlinkedItem, setUnlinkedItem] = useState<ItemV1 | null>(null);
  const [itemBusy, setItemBusy] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);
  const expandedGroup = useMemo(
    () => activeGroups.find((group) => group.id === expandedGroupId) || null,
    [activeGroups, expandedGroupId],
  );

  useEffect(() => {
    if (selectedFolderId && activeFolders.some((folder) => folder.id === selectedFolderId)) return;
    setSelectedFolderId(noteRootFolderId);
  }, [activeFolders, noteRootFolderId, selectedFolderId]);

  useEffect(() => {
    let cancelled = false;
    if (!expandedGroup || itemWorkbenchGroupId !== expandedGroup.id) {
      setPoolAnchors([]);
      setSelectedPoolAnchorIds([]);
      setInspectedItemId(null);
      setUnlinkedItem(null);
      setItemError(null);
      return () => {
        cancelled = true;
      };
    }

    const itemIds = [...new Set(expandedGroup.members
      .filter((member) => member.kind === 'item' && member.item_id)
      .map((member) => member.item_id!))];
    setItemBusy(true);
    void Promise.all([
      loadPoolItemAnchors(expandedGroup.id),
      Promise.all(itemIds.map(async (itemId) => {
        try {
          return await loadItem(itemId);
        } catch {
          return null;
        }
      })),
    ]).then(([anchors, items]) => {
      if (cancelled) return;
      setPoolAnchors(anchors);
      setSelectedPoolAnchorIds((ids) => ids.filter((id) => anchors.some((anchor) => anchor.id === id)));
      setItemById((current) => {
        const next = { ...current };
        items.forEach((item) => {
          if (item) next[item.id] = item;
        });
        return next;
      });
      setItemError(null);
    }).catch((error) => {
      if (!cancelled) setItemError(itemErrorMessage(error));
    }).finally(() => {
      if (!cancelled) setItemBusy(false);
    });

    return () => {
      cancelled = true;
    };
  }, [expandedGroup, itemWorkbenchGroupId]);

  useEffect(() => {
    const selected = poolAnchors.filter((anchor) => selectedPoolAnchorIds.includes(anchor.id));
    setCastBody(selected.map((anchor) => anchor.excerpt).join('\n\n'));
  }, [poolAnchors, selectedPoolAnchorIds]);

  useEffect(() => {
    if (!inspectedItemId) {
      setPurposeEdgeDrafts({});
      return;
    }
    const nextDrafts: Record<string, { role: string; fitness: string }> = {};
    activePurposes.forEach((purpose) => {
      const edge = purpose.members.find((member) => (
        member.member_kind === 'item'
        && member.member_id === inspectedItemId
      ));
      if (!edge) return;
      nextDrafts[edge.id] = {
        role: edge.role || '',
        fitness: edge.fitness || 'unknown',
      };
    });
    setPurposeEdgeDrafts(nextDrafts);
  }, [activePurposes, inspectedItemId]);

  const stopPanelEvent = (event: SyntheticEvent) => {
    event.stopPropagation();
  };

  const replaceGroup = async (nextGroup: ContentGroupV1) => {
    const saved = await onSaveContentGroups(
      contentGroups.map((group) => group.id === nextGroup.id ? nextGroup : group),
    );
    if (saved === false) throw new Error('Failed to save content group');
  };

  const refreshPool = async (groupId: string) => {
    const anchors = await loadPoolItemAnchors(groupId);
    setPoolAnchors(anchors);
    setSelectedPoolAnchorIds((ids) => ids.filter((id) => anchors.some((anchor) => anchor.id === id)));
    return anchors;
  };

  const handleCollectCandidates = async (group: ContentGroupV1) => {
    const inputs = candidateMembers.flatMap((member) => anchorInputsForMember(group, member));
    if (inputs.length === 0) {
      setItemError('Select a Block or a text range before collecting Item material.');
      return;
    }
    setItemBusy(true);
    setItemError(null);
    const collected: ItemAnchorV1[] = [];
    try {
      for (const input of inputs) {
        collected.push(await collectItemAnchor(input));
      }
      await refreshPool(group.id);
      setSelectedPoolAnchorIds(collected.map((anchor) => anchor.id));
    } catch (error) {
      await refreshPool(group.id).catch(() => undefined);
      setItemError(itemErrorMessage(error));
    } finally {
      setItemBusy(false);
    }
  };

  const handleDiscardAnchor = async (group: ContentGroupV1, anchorId: string) => {
    setItemBusy(true);
    setItemError(null);
    try {
      await discardItemAnchor(anchorId);
      await refreshPool(group.id);
    } catch (error) {
      setItemError(itemErrorMessage(error));
    } finally {
      setItemBusy(false);
    }
  };

  const attachItemToGroup = async (group: ContentGroupV1, item: ItemV1) => {
    const nextGroup = addMembersToContentGroup(group, [
      createContentGroupMemberFromItem(item.id, group.members.length),
    ]);
    await replaceGroup(nextGroup);
  };

  const handleCast = async (group: ContentGroupV1) => {
    if (selectedPoolAnchorIds.length === 0 || !castBody.trim()) return;
    setItemBusy(true);
    setItemError(null);
    let item: ItemV1 | null = null;
    try {
      item = await castItemFromAnchors({
        anchor_ids: selectedPoolAnchorIds,
        plain_text: castBody,
        item_type: castType.trim() || null,
        topic: castTopic.trim() || null,
        origin_course_id: projectId,
        origin_note_id: noteId,
        created_by: 'human',
        claimed_by: 'human',
      });
      setItemById((current) => ({ ...current, [item!.id]: item! }));
      try {
        await attachItemToGroup(group, item);
        setUnlinkedItem(null);
      } catch (error) {
        setUnlinkedItem(item);
        throw new Error(`Item ${item.id} was cast, but its Group edge needs retry: ${itemErrorMessage(error)}`);
      }
      setSelectedPoolAnchorIds([]);
      setCastType('');
      setCastTopic('');
      setInspectedItemId(item.id);
      setItemDraft({
        plainText: item.plain_text,
        itemType: item.item_type || '',
        topic: item.topic || '',
      });
      await refreshPool(group.id);
    } catch (error) {
      if (item) await refreshPool(group.id).catch(() => undefined);
      setItemError(itemErrorMessage(error));
    } finally {
      setItemBusy(false);
    }
  };

  const handleAttachUnlinkedItem = async (group: ContentGroupV1) => {
    if (!unlinkedItem) return;
    setItemBusy(true);
    setItemError(null);
    try {
      await attachItemToGroup(group, unlinkedItem);
      setUnlinkedItem(null);
    } catch (error) {
      setItemError(itemErrorMessage(error));
    } finally {
      setItemBusy(false);
    }
  };

  const handleInspectItem = async (itemId: string) => {
    setItemBusy(true);
    setItemError(null);
    try {
      const item = await loadItem(itemId);
      setItemById((current) => ({ ...current, [item.id]: item }));
      setInspectedItemId(item.id);
      setItemDraft({
        plainText: item.plain_text,
        itemType: item.item_type || '',
        topic: item.topic || '',
      });
    } catch (error) {
      setItemError(itemErrorMessage(error));
    } finally {
      setItemBusy(false);
    }
  };

  const handleSaveItem = async () => {
    if (!inspectedItemId || !itemDraft.plainText.trim()) return;
    setItemBusy(true);
    setItemError(null);
    try {
      const item = await updateItem(inspectedItemId, {
        plain_text: itemDraft.plainText,
        item_type: itemDraft.itemType.trim() || null,
        topic: itemDraft.topic.trim() || null,
      });
      setItemById((current) => ({ ...current, [item.id]: item }));
      setItemDraft({
        plainText: item.plain_text,
        itemType: item.item_type || '',
        topic: item.topic || '',
      });
    } catch (error) {
      setItemError(itemErrorMessage(error));
    } finally {
      setItemBusy(false);
    }
  };

  const handleRetireItem = async () => {
    if (!inspectedItemId) return;
    setItemBusy(true);
    setItemError(null);
    try {
      const item = await retireItem(inspectedItemId);
      setItemById((current) => ({ ...current, [item.id]: item }));
    } catch (error) {
      setItemError(itemErrorMessage(error));
    } finally {
      setItemBusy(false);
    }
  };

  const handleRemoveItemMember = async (group: ContentGroupV1, memberId: string, itemId?: string | null) => {
    setItemBusy(true);
    setItemError(null);
    try {
      await replaceGroup(removeContentGroupMember(group, memberId));
      if (itemId && inspectedItemId === itemId) setInspectedItemId(null);
    } catch (error) {
      setItemError(itemErrorMessage(error));
    } finally {
      setItemBusy(false);
    }
  };

  const persistPurposeChange = async (nextPurpose: PurposeFrameV1) => {
    setItemBusy(true);
    setItemError(null);
    try {
      const saved = await onSavePurposeFrames(
        purposeFrames.map((purpose) => purpose.id === nextPurpose.id ? nextPurpose : purpose),
      );
      if (saved === false) throw new Error('Failed to save Purpose membership');
    } catch (error) {
      setItemError(itemErrorMessage(error));
    } finally {
      setItemBusy(false);
    }
  };

  const handleAddItemToPurpose = async (purpose: PurposeFrameV1, itemId: string) => {
    await persistPurposeChange(upsertPurposeItemMember({
      purpose,
      itemId,
      fitness: 'unknown',
    }));
  };

  const handleUpdateItemPurposeEdge = async (input: {
    purpose: PurposeFrameV1;
    itemId: string;
    role?: string | null;
    fitness?: string;
  }) => {
    await persistPurposeChange(upsertPurposeItemMember(input));
  };

  const handleRemoveItemFromPurpose = async (purpose: PurposeFrameV1, itemId: string) => {
    await persistPurposeChange(removePurposeItemMember({ purpose, itemId }));
  };

  const handleMoveItemInPurpose = async (
    purpose: PurposeFrameV1,
    memberEdgeId: string,
    direction: 'up' | 'down',
  ) => {
    await persistPurposeChange(movePurposeMember({
      purpose,
      memberId: memberEdgeId,
      direction,
    }));
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
            const itemMembers = group.members.filter((member) => member.kind === 'item' && member.item_id);
            const inspectedItem = inspectedItemId && itemMembers.some((member) => member.item_id === inspectedItemId)
              ? itemById[inspectedItemId] || null
              : null;
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
                      <button
                        type="button"
                        className={styles.contentGroupOpenEditor}
                        aria-expanded={itemWorkbenchGroupId === group.id}
                        onClick={() => setItemWorkbenchGroupId((current) => current === group.id ? null : group.id)}
                      >
                        Item tools
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
                            title="Add the current selection as a legacy group member."
                          >
                            <Plus size={14} />
                            Add selection
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

                    {itemWorkbenchGroupId === group.id ? (
                    <section className={styles.itemWorkbench} aria-label={`Item workbench for ${group.title}`}>
                      <div className={styles.itemWorkbenchHeader}>
                        <span>
                          <Layers3 size={13} />
                          Item material
                        </span>
                        <small>{poolAnchors.length} unclaimed</small>
                      </div>

                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => void handleCollectCandidates(group)}
                        disabled={!hasCandidateMembers || itemBusy}
                      >
                        <Plus size={13} />
                        Collect selection
                      </button>

                      {poolAnchors.length > 0 ? (
                        <div className={styles.itemMaterialList}>
                          {poolAnchors.map((anchor) => (
                            <div key={anchor.id} className={styles.itemMaterialRow}>
                              <input
                                type="checkbox"
                                aria-label={`Select material: ${anchor.excerpt}`}
                                checked={selectedPoolAnchorIds.includes(anchor.id)}
                                onChange={() => setSelectedPoolAnchorIds((current) => (
                                  current.includes(anchor.id)
                                    ? current.filter((id) => id !== anchor.id)
                                    : [...current, anchor.id]
                                ))}
                                disabled={itemBusy}
                              />
                              <span>
                                <strong>{anchor.target_kind.replace('_', ' ')}</strong>
                                <small>{anchor.excerpt}</small>
                              </span>
                              <button
                                type="button"
                                className={styles.iconBtn}
                                aria-label="Discard unclaimed material"
                                onClick={(event) => {
                                  event.preventDefault();
                                  void handleDiscardAnchor(group, anchor.id);
                                }}
                                disabled={itemBusy}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={styles.itemQuietText}>No material collected for this group.</p>
                      )}

                      {selectedPoolAnchorIds.length > 0 ? (
                        <div className={styles.itemCastForm}>
                          <textarea
                            value={castBody}
                            onChange={(event) => setCastBody(event.currentTarget.value)}
                            aria-label="Item body"
                            rows={4}
                          />
                          <div className={styles.itemFieldRow}>
                            <input
                              value={castType}
                              onChange={(event) => setCastType(event.currentTarget.value)}
                              placeholder="Type"
                              aria-label="Item type"
                            />
                            <input
                              value={castTopic}
                              onChange={(event) => setCastTopic(event.currentTarget.value)}
                              placeholder="Topic"
                              aria-label="Item topic"
                            />
                          </div>
                          <button
                            type="button"
                            className={styles.secondaryBtn}
                            onClick={() => void handleCast(group)}
                            disabled={itemBusy || !castBody.trim()}
                          >
                            <Layers3 size={13} />
                            {selectedPoolAnchorIds.length === 1
                              ? 'Quick cast Item'
                              : `Fusion cast ${selectedPoolAnchorIds.length} Anchors`}
                          </button>
                        </div>
                      ) : null}

                      {unlinkedItem ? (
                        <div className={styles.itemRecoveryRow}>
                          <span>Item {unlinkedItem.id.slice(0, 8)} is durable but not linked to this Group.</span>
                          <button
                            type="button"
                            className={styles.secondaryBtn}
                            onClick={() => void handleAttachUnlinkedItem(group)}
                            disabled={itemBusy}
                          >
                            Retry link
                          </button>
                        </div>
                      ) : null}

                      {itemError ? <p className={styles.itemErrorText}>{itemError}</p> : null}

                      <div className={styles.itemWorkbenchHeader}>
                        <span>Items</span>
                        <small>{itemMembers.length} linked</small>
                      </div>
                      {itemMembers.length > 0 ? (
                        <div className={styles.itemMemberList}>
                          {itemMembers.map((member) => {
                            const item = member.item_id ? itemById[member.item_id] : null;
                            return (
                              <div key={member.id} className={styles.itemMemberRow}>
                                <button
                                  type="button"
                                  onClick={() => member.item_id && void handleInspectItem(member.item_id)}
                                  disabled={!member.item_id || itemBusy}
                                >
                                  <strong>{item?.item_type || 'item'}</strong>
                                  <span>{item?.plain_text || member.item_id}</span>
                                  <small>{item?.status || 'loading'}</small>
                                </button>
                                <button
                                  type="button"
                                  className={styles.iconBtn}
                                  aria-label="Remove Item from this group"
                                  title="Remove only the Group edge; keep the Item."
                                  onClick={() => void handleRemoveItemMember(group, member.id, member.item_id)}
                                  disabled={itemBusy}
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className={styles.itemQuietText}>No durable Items linked yet.</p>
                      )}

                      {inspectedItem ? (
                        <div className={styles.itemInspector}>
                          <div className={styles.itemWorkbenchHeader}>
                            <span>Inspect Item</span>
                            <small>{inspectedItem.status}</small>
                          </div>
                          <textarea
                            value={itemDraft.plainText}
                            onChange={(event) => setItemDraft((current) => ({
                              ...current,
                              plainText: event.currentTarget.value,
                            }))}
                            aria-label="Edit Item body"
                            rows={5}
                            disabled={inspectedItem.status === 'retired'}
                          />
                          <div className={styles.itemFieldRow}>
                            <input
                              value={itemDraft.itemType}
                              onChange={(event) => setItemDraft((current) => ({
                                ...current,
                                itemType: event.currentTarget.value,
                              }))}
                              placeholder="Type"
                              aria-label="Edit Item type"
                              disabled={inspectedItem.status === 'retired'}
                            />
                            <input
                              value={itemDraft.topic}
                              onChange={(event) => setItemDraft((current) => ({
                                ...current,
                                topic: event.currentTarget.value,
                              }))}
                              placeholder="Topic"
                              aria-label="Edit Item topic"
                              disabled={inspectedItem.status === 'retired'}
                            />
                          </div>
                          <div className={styles.itemReceiptSummary}>
                            <span>Origin project: {inspectedItem.origin_course_id || 'removed / none'}</span>
                            <span>Origin note: {inspectedItem.origin_note_id || 'removed / none'}</span>
                            <span>Snapshot: {inspectedItem.current_snapshot.content_hash.slice(0, 20)}...</span>
                          </div>
                          <div className={styles.itemReceiptList}>
                            {inspectedItem.anchors.map((anchor) => (
                              <p key={anchor.id}>
                                <strong>{anchor.target_kind}</strong>
                                <span>{anchor.excerpt}</span>
                                <small>
                                  {anchor.source_record_id ? 'Source receipt kept' : 'Source unavailable'}
                                  {' / '}
                                  {anchor.claimed_by || 'unknown claimant'}
                                </small>
                              </p>
                            ))}
                          </div>
                          <div className={styles.itemPurposeMembership}>
                            <div className={styles.itemWorkbenchHeader}>
                              <span>Purpose membership</span>
                              <small>{activePurposes.length} active</small>
                            </div>
                            {activePurposes.length > 0 ? (
                              <div className={styles.itemPurposeList}>
                                {activePurposes.map((purpose) => {
                                  const directEdge = purpose.members.find((member) => (
                                    member.member_kind === 'item'
                                    && member.member_id === inspectedItem.id
                                  ));
                                  const derivedViaCurrentGroup = purpose.members.some((member) => (
                                    member.member_kind === 'content_group'
                                    && member.member_id === group.id
                                  ));
                                  const edgeIndex = directEdge
                                    ? purpose.members.findIndex((member) => member.id === directEdge.id)
                                    : -1;
                                  const edgeDraft = directEdge
                                    ? purposeEdgeDrafts[directEdge.id] || {
                                      role: directEdge.role || '',
                                      fitness: directEdge.fitness || 'unknown',
                                    }
                                    : null;
                                  const edgeDraftChanged = Boolean(directEdge && edgeDraft && (
                                    edgeDraft.role.trim() !== (directEdge.role || '')
                                    || (edgeDraft.fitness.trim() || 'unknown') !== directEdge.fitness
                                  ));
                                  return (
                                    <section key={purpose.id} className={styles.itemPurposeRow}>
                                      <div className={styles.itemPurposeIdentity}>
                                        <strong>{purpose.title}</strong>
                                        <span>
                                          {directEdge ? 'direct' : derivedViaCurrentGroup ? 'via current group' : 'no direct edge'}
                                        </span>
                                      </div>
                                      {directEdge && edgeDraft ? (
                                        <>
                                          <div className={styles.itemFieldRow}>
                                            <input
                                              value={edgeDraft.role}
                                              placeholder="Role"
                                              aria-label={`Role in ${purpose.title}`}
                                              onChange={(event) => {
                                                const role = event.currentTarget.value;
                                                setPurposeEdgeDrafts((current) => ({
                                                  ...current,
                                                  [directEdge.id]: {
                                                    ...edgeDraft,
                                                    role,
                                                  },
                                                }));
                                              }}
                                              disabled={itemBusy || inspectedItem.status === 'retired'}
                                            />
                                            <input
                                              value={edgeDraft.fitness}
                                              placeholder="Fitness"
                                              aria-label={`Fitness in ${purpose.title}`}
                                              onChange={(event) => {
                                                const fitness = event.currentTarget.value;
                                                setPurposeEdgeDrafts((current) => ({
                                                  ...current,
                                                  [directEdge.id]: {
                                                    ...edgeDraft,
                                                    fitness,
                                                  },
                                                }));
                                              }}
                                              disabled={itemBusy || inspectedItem.status === 'retired'}
                                            />
                                          </div>
                                          <div className={styles.itemPurposeActions}>
                                            <button
                                              type="button"
                                              className={styles.iconBtn}
                                              onClick={() => void handleUpdateItemPurposeEdge({
                                                purpose,
                                                itemId: inspectedItem.id,
                                                role: edgeDraft.role.trim() || null,
                                                fitness: edgeDraft.fitness.trim() || 'unknown',
                                              })}
                                              disabled={itemBusy || inspectedItem.status === 'retired' || !edgeDraftChanged}
                                              title="Save Purpose edge"
                                              aria-label={`Save ${inspectedItem.plain_text} membership in ${purpose.title}`}
                                            >
                                              <Save size={12} />
                                            </button>
                                            <button
                                              type="button"
                                              className={styles.iconBtn}
                                              onClick={() => void handleMoveItemInPurpose(purpose, directEdge.id, 'up')}
                                              disabled={itemBusy || edgeIndex <= 0}
                                              title="Move Purpose edge up"
                                              aria-label={`Move ${inspectedItem.plain_text} up in ${purpose.title}`}
                                            >
                                              <ArrowUp size={12} />
                                            </button>
                                            <button
                                              type="button"
                                              className={styles.iconBtn}
                                              onClick={() => void handleMoveItemInPurpose(purpose, directEdge.id, 'down')}
                                              disabled={itemBusy || edgeIndex < 0 || edgeIndex >= purpose.members.length - 1}
                                              title="Move Purpose edge down"
                                              aria-label={`Move ${inspectedItem.plain_text} down in ${purpose.title}`}
                                            >
                                              <ArrowDown size={12} />
                                            </button>
                                            <button
                                              type="button"
                                              className={styles.iconBtn}
                                              onClick={() => void handleRemoveItemFromPurpose(purpose, inspectedItem.id)}
                                              disabled={itemBusy}
                                              title="Remove direct Purpose edge"
                                              aria-label={`Remove ${inspectedItem.plain_text} from ${purpose.title}`}
                                            >
                                              <X size={12} />
                                            </button>
                                          </div>
                                        </>
                                      ) : (
                                        <button
                                          type="button"
                                          className={styles.secondaryBtn}
                                          onClick={() => void handleAddItemToPurpose(purpose, inspectedItem.id)}
                                          disabled={itemBusy || inspectedItem.status === 'retired'}
                                        >
                                          <Plus size={13} />
                                          Add direct
                                        </button>
                                      )}
                                    </section>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className={styles.itemQuietText}>No active Purpose is available for this note.</p>
                            )}
                          </div>
                          <div className={styles.contentGroupActionRow}>
                            <button
                              type="button"
                              className={styles.secondaryBtn}
                              onClick={() => void handleSaveItem()}
                              disabled={itemBusy || inspectedItem.status === 'retired' || !itemDraft.plainText.trim()}
                            >
                              <Save size={13} />
                              Save Item
                            </button>
                            <button
                              type="button"
                              className={styles.secondaryBtn}
                              onClick={() => void handleRetireItem()}
                              disabled={itemBusy || inspectedItem.status === 'retired'}
                            >
                              <Archive size={13} />
                              Retire
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </section>
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
