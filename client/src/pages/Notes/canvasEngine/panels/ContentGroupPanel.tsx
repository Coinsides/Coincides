import {
  Archive,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  ExternalLink,
  Folder,
  Layers3,
  Link2,
  Menu,
  Plus,
  Save,
  Search,
  SlidersHorizontal,
  RefreshCw,
  Trash2,
  Unlink,
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
import { itemOriginLabel } from '@/services/itemSummaryReader';
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
  searchItems,
  updateItem,
  type CollectItemAnchorInput,
} from '../itemRepository';
import {
  createRelation,
  loadRelations,
  loadRelationTypes,
  reaffirmRelation,
  revokeRelation,
} from '../relationRepository';
import {
  buildRelationInspectorRows,
} from '../relationInspectorService';
import { activePurposeFrames } from '../purposeService';
import type { TrackPendingWrite } from '../inFlightWriteRegistry';
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
  RelationSeedTypeId,
  RelationTypeDefinitionV1,
  RelationV1,
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
type RelationDraftDirection = 'outgoing' | 'incoming';

const railViewTabs: { id: RailViewMode; label: string }[] = [
  { id: 'folder', label: 'Folder' },
  { id: 'topic', label: 'Topic' },
  { id: 'type', label: 'Type' },
  { id: 'all', label: 'All' },
];

interface ContentGroupPanelProps {
  hostMode?: 'page' | 'modal';
  trackPendingWrite?: TrackPendingWrite;
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
  hostMode = 'page',
  trackPendingWrite,
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
}: ContentGroupPanelProps) {
  const navigate = useNavigate();
  const navigationDisabled = hostMode === 'modal';
  const navigationTitle = navigationDisabled ? 'Open full page to use this' : undefined;
  const itemToolsDisabled = navigationDisabled && !trackPendingWrite;
  const trackPanelWrite: TrackPendingWrite = (key, operation) => (
    hostMode === 'modal' && trackPendingWrite
      ? trackPendingWrite(`content-group:${key}`, operation)
      : operation()
  );
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
  const [unlinkedItem, setUnlinkedItem] = useState<ItemV1 | null>(null);
  const [itemBusy, setItemBusy] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);
  const [itemRelations, setItemRelations] = useState<RelationV1[]>([]);
  const [relationTypes, setRelationTypes] = useState<RelationTypeDefinitionV1[]>([]);
  const [relationBusy, setRelationBusy] = useState(false);
  const [relationError, setRelationError] = useState<string | null>(null);
  const [relationCreateOpen, setRelationCreateOpen] = useState(false);
  const [relationQuery, setRelationQuery] = useState('');
  const [relationCandidates, setRelationCandidates] = useState<ItemV1[]>([]);
  const [relationTargetId, setRelationTargetId] = useState<string | null>(null);
  const [relationType, setRelationType] = useState<RelationSeedTypeId>('supports');
  const [relationDirection, setRelationDirection] = useState<RelationDraftDirection>('outgoing');
  const [relationNote, setRelationNote] = useState('');
  const [relationPurposeId, setRelationPurposeId] = useState('');
  const [groupActionError, setGroupActionError] = useState<string | null>(null);
  const expandedGroup = useMemo(
    () => activeGroups.find((group) => group.id === expandedGroupId) || null,
    [activeGroups, expandedGroupId],
  );
  const relationRows = useMemo(
    () => inspectedItemId ? buildRelationInspectorRows(itemRelations, inspectedItemId) : [],
    [inspectedItemId, itemRelations],
  );
  const selectedRelationType = useMemo(
    () => relationTypes.find((definition) => definition.id === relationType) || null,
    [relationType, relationTypes],
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
      setItemRelations([]);
      setRelationTypes([]);
      setRelationError(null);
      setRelationCreateOpen(false);
      setRelationCandidates([]);
      setRelationTargetId(null);
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
    let cancelled = false;
    setRelationCreateOpen(false);
    setRelationCandidates([]);
    setRelationTargetId(null);
    setRelationQuery('');
    setRelationNote('');
    setRelationPurposeId('');
    setRelationError(null);
    if (!inspectedItemId) {
      setItemRelations([]);
      return () => {
        cancelled = true;
      };
    }

    setRelationBusy(true);
    void Promise.all([
      loadRelations({ item_id: inspectedItemId }),
      loadRelationTypes(),
    ]).then(([relations, definitions]) => {
      if (cancelled) return;
      setItemRelations(relations);
      setRelationTypes(definitions);
      setRelationError(null);
    }).catch((error) => {
      if (!cancelled) setRelationError(itemErrorMessage(error));
    }).finally(() => {
      if (!cancelled) setRelationBusy(false);
    });

    return () => {
      cancelled = true;
    };
  }, [inspectedItemId]);

  const stopPanelEvent = (event: SyntheticEvent) => {
    event.stopPropagation();
  };

  const replaceGroup = async (nextGroup: ContentGroupV1) => {
    const saved = await onSaveContentGroups(
      contentGroups.map((group) => group.id === nextGroup.id ? nextGroup : group),
    );
    if (saved === false) throw new Error('Failed to save content group');
  };

  const handleReplaceGroupAction = async (nextGroup: ContentGroupV1) => {
    setGroupActionError(null);
    try {
      await replaceGroup(nextGroup);
    } catch (error) {
      setGroupActionError(itemErrorMessage(error));
    }
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
      await trackPanelWrite(`collect:${group.id}`, async () => {
        for (const input of inputs) {
          collected.push(await collectItemAnchor(input));
        }
        await refreshPool(group.id);
        setSelectedPoolAnchorIds(collected.map((anchor) => anchor.id));
      });
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
      await trackPanelWrite(`discard:${anchorId}`, () => discardItemAnchor(anchorId));
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
      await trackPanelWrite(`cast:${group.id}`, async () => {
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
      });
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
      await trackPanelWrite(`cast:${group.id}`, () => attachItemToGroup(group, unlinkedItem));
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

  const refreshItemRelations = async (itemId: string) => {
    const relations = await loadRelations({ item_id: itemId });
    setItemRelations(relations);
    return relations;
  };

  const handleSearchRelationCandidates = async () => {
    if (!inspectedItemId) return;
    setRelationBusy(true);
    setRelationError(null);
    try {
      const items = await searchItems({
        query: relationQuery,
        status: 'active',
        limit: 24,
      });
      const candidates = items.filter((item) => item.id !== inspectedItemId);
      setRelationCandidates(candidates);
      if (relationTargetId && !candidates.some((item) => item.id === relationTargetId)) {
        setRelationTargetId(null);
      }
    } catch (error) {
      setRelationError(itemErrorMessage(error));
    } finally {
      setRelationBusy(false);
    }
  };

  const handleCreateRelation = async () => {
    if (!inspectedItemId || !relationTargetId || !selectedRelationType) return;
    const directedIncoming = selectedRelationType.directionality === 'directed'
      && relationDirection === 'incoming';
    setRelationBusy(true);
    setRelationError(null);
    try {
      const relation = await trackPanelWrite(`relation:create:${inspectedItemId}`, () => createRelation({
        from_item_id: directedIncoming ? relationTargetId : inspectedItemId,
        to_item_id: directedIncoming ? inspectedItemId : relationTargetId,
        relation_type: relationType,
        note: relationNote.trim() || null,
        created_by: 'human',
        origin_purpose_id: relationPurposeId || null,
      }));
      setItemRelations((current) => [relation, ...current.filter((entry) => entry.id !== relation.id)]);
      setRelationCreateOpen(false);
      setRelationCandidates([]);
      setRelationTargetId(null);
      setRelationQuery('');
      setRelationNote('');
      setRelationPurposeId('');
      setRelationDirection('outgoing');
    } catch (error) {
      setRelationError(itemErrorMessage(error));
    } finally {
      setRelationBusy(false);
    }
  };

  const handleReaffirmRelation = async (relationId: string) => {
    setRelationBusy(true);
    setRelationError(null);
    try {
      const relation = await trackPanelWrite(`relation:reaffirm:${relationId}`, () => reaffirmRelation(relationId));
      setItemRelations((current) => current.map((entry) => (
        entry.id === relation.id ? relation : entry
      )));
    } catch (error) {
      setRelationError(itemErrorMessage(error));
    } finally {
      setRelationBusy(false);
    }
  };

  const handleRevokeRelation = async (relationId: string) => {
    setRelationBusy(true);
    setRelationError(null);
    try {
      await trackPanelWrite(`relation:revoke:${relationId}`, () => revokeRelation(relationId));
      setItemRelations((current) => current.filter((entry) => entry.id !== relationId));
    } catch (error) {
      setRelationError(itemErrorMessage(error));
    } finally {
      setRelationBusy(false);
    }
  };

  const handleSaveItem = async () => {
    if (!inspectedItemId || !itemDraft.plainText.trim()) return;
    setItemBusy(true);
    setItemError(null);
    try {
      const item = await trackPanelWrite(`item:save:${inspectedItemId}`, () => updateItem(inspectedItemId, {
        plain_text: itemDraft.plainText,
        item_type: itemDraft.itemType.trim() || null,
        topic: itemDraft.topic.trim() || null,
      }));
      setItemById((current) => ({ ...current, [item.id]: item }));
      setItemDraft({
        plainText: item.plain_text,
        itemType: item.item_type || '',
        topic: item.topic || '',
      });
      try {
        await refreshItemRelations(item.id);
      } catch (error) {
        setRelationError(itemErrorMessage(error));
      }
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
      const item = await trackPanelWrite(`item:retire:${inspectedItemId}`, () => retireItem(inspectedItemId));
      setItemById((current) => ({ ...current, [item.id]: item }));
      try {
        await refreshItemRelations(item.id);
      } catch (error) {
        setRelationError(itemErrorMessage(error));
      }
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
    if (navigationDisabled) return;
    const params = new URLSearchParams({
      note_id: noteId,
      folder_id: selectedFolderId || noteRootFolderId,
    });
    navigate(`/group-gallery?${params.toString()}`);
  };

  const openEditor = (group: ContentGroupV1) => {
    if (navigationDisabled) return;
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
          <button type="button" className={styles.iconBtn} onClick={openGallery} aria-label="Open Group Gallery" disabled={navigationDisabled} title={navigationTitle}>
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
            <button type="button" className={styles.contentGroupFolderRow} onClick={openGallery} disabled={navigationDisabled} title={navigationTitle}>
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
                      <button type="button" className={styles.contentGroupOpenEditor} onClick={() => openEditor(group)} disabled={navigationDisabled} title={navigationTitle}>
                        Open editor
                      </button>
                      <button
                        type="button"
                        className={styles.contentGroupOpenEditor}
                        aria-expanded={itemWorkbenchGroupId === group.id}
                        disabled={itemToolsDisabled}
                        title={itemToolsDisabled ? navigationTitle : undefined}
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
                        onClick={() => void handleReplaceGroupAction(softDeleteContentGroup(group))}
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
                          onClick={() => void handleReplaceGroupAction(moveContentGroupToFolder({ group, folderId: selectedFolderId }))}
                        >
                          Move here
                        </button>
                        ) : null}
                      </div>
                    ) : null}

                    {groupActionError ? <p className={styles.itemErrorText}>{groupActionError}</p> : null}

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
                            <span>{itemOriginLabel(inspectedItem)}</span>
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
                          <div className={styles.itemRelationInspector}>
                            <div className={styles.itemWorkbenchHeader}>
                              <span><Link2 size={12} />Relations</span>
                              <div className={styles.itemRelationHeaderActions}>
                                <small>{relationRows.length} active</small>
                                <button
                                  type="button"
                                  className={styles.iconBtn}
                                  title={relationCreateOpen ? 'Close Relation form' : 'Create Relation'}
                                  aria-label={relationCreateOpen ? 'Close Relation form' : 'Create Relation'}
                                  onClick={() => {
                                    setRelationCreateOpen((open) => !open);
                                    setRelationError(null);
                                  }}
                                  disabled={relationBusy || inspectedItem.status === 'retired'}
                                >
                                  {relationCreateOpen ? <X size={12} /> : <Plus size={12} />}
                                </button>
                              </div>
                            </div>

                            {relationCreateOpen ? (
                              <form
                                className={styles.itemRelationCreate}
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  void handleCreateRelation();
                                }}
                              >
                                <div className={styles.itemRelationSearchRow}>
                                  <input
                                    value={relationQuery}
                                    onChange={(event) => setRelationQuery(event.currentTarget.value)}
                                    onKeyDown={(event) => {
                                      if (event.key === 'Enter') {
                                        event.preventDefault();
                                        void handleSearchRelationCandidates();
                                      }
                                    }}
                                    placeholder="Search active Items"
                                    aria-label="Search Relation endpoint Items"
                                  />
                                  <button
                                    type="button"
                                    className={styles.iconBtn}
                                    onClick={() => void handleSearchRelationCandidates()}
                                    disabled={relationBusy}
                                    title="Search Items"
                                    aria-label="Search Items"
                                  >
                                    <Search size={12} />
                                  </button>
                                </div>

                                {relationCandidates.length > 0 ? (
                                  <div className={styles.itemRelationCandidates} role="listbox" aria-label="Relation endpoint results">
                                    {relationCandidates.map((candidate) => (
                                      <button
                                        key={candidate.id}
                                        type="button"
                                        role="option"
                                        aria-selected={relationTargetId === candidate.id}
                                        data-selected={relationTargetId === candidate.id ? 'true' : 'false'}
                                        onClick={() => setRelationTargetId(candidate.id)}
                                      >
                                        <strong>{candidate.item_type || 'Item'}</strong>
                                        <span>{candidate.plain_text}</span>
                                        <small>{candidate.topic || 'No topic'}</small>
                                      </button>
                                    ))}
                                  </div>
                                ) : null}

                                <div className={styles.itemRelationFields}>
                                  <select
                                    value={relationType}
                                    onChange={(event) => setRelationType(event.currentTarget.value as RelationSeedTypeId)}
                                    aria-label="Relation type"
                                  >
                                    {relationTypes.map((definition) => (
                                      <option key={definition.id} value={definition.id}>
                                        {definition.id.replace(/_/g, ' ')}
                                      </option>
                                    ))}
                                  </select>
                                  <select
                                    value={relationPurposeId}
                                    onChange={(event) => setRelationPurposeId(event.currentTarget.value)}
                                    aria-label="Relation Purpose receipt"
                                  >
                                    <option value="">No Purpose receipt</option>
                                    {activePurposes.map((purpose) => (
                                      <option key={purpose.id} value={purpose.id}>{purpose.title}</option>
                                    ))}
                                  </select>
                                </div>

                                {selectedRelationType?.directionality === 'directed' ? (
                                  <div className={styles.itemRelationDirection} aria-label="Relation direction">
                                    <button
                                      type="button"
                                      data-active={relationDirection === 'outgoing' ? 'true' : 'false'}
                                      aria-pressed={relationDirection === 'outgoing'}
                                      onClick={() => setRelationDirection('outgoing')}
                                    >
                                      <ArrowRight size={12} />
                                      This Item points out
                                    </button>
                                    <button
                                      type="button"
                                      data-active={relationDirection === 'incoming' ? 'true' : 'false'}
                                      aria-pressed={relationDirection === 'incoming'}
                                      onClick={() => setRelationDirection('incoming')}
                                    >
                                      <ArrowLeft size={12} />
                                      This Item receives
                                    </button>
                                  </div>
                                ) : (
                                  <p className={styles.itemQuietText}>Undirected pair</p>
                                )}

                                <textarea
                                  value={relationNote}
                                  onChange={(event) => setRelationNote(event.currentTarget.value)}
                                  placeholder="Optional judgment note"
                                  aria-label="Relation judgment note"
                                  rows={2}
                                />
                                <div className={styles.contentGroupActionRow}>
                                  <button
                                    type="submit"
                                    className={styles.secondaryBtn}
                                    disabled={relationBusy || !relationTargetId || !selectedRelationType}
                                  >
                                    <Link2 size={13} />
                                    Create Relation
                                  </button>
                                </div>
                              </form>
                            ) : null}

                            {relationBusy && relationRows.length === 0 ? (
                              <p className={styles.itemQuietText}>Loading Relations...</p>
                            ) : relationRows.length > 0 ? (
                              <div className={styles.itemRelationList}>
                                {relationRows.map((row) => (
                                  <section
                                    key={row.id}
                                    className={styles.itemRelationRow}
                                    data-freshness={row.freshness}
                                  >
                                    <div className={styles.itemRelationIdentity}>
                                      <span className={styles.itemRelationDirectionIcon} aria-hidden="true">
                                        {row.direction === 'outgoing'
                                          ? <ArrowRight size={12} />
                                          : row.direction === 'incoming'
                                            ? <ArrowLeft size={12} />
                                            : <Link2 size={12} />}
                                      </span>
                                      <strong>{row.type_label}</strong>
                                      <span className={styles.itemRelationFreshness}>{row.freshness_label}</span>
                                    </div>
                                    <button
                                      type="button"
                                      className={styles.itemRelationEndpoint}
                                      onClick={() => void handleInspectItem(row.other_item.id)}
                                      disabled={relationBusy}
                                      title="Inspect related Item"
                                    >
                                      <span>{row.other_item.plain_text}</span>
                                      <small>
                                        {row.direction_label}
                                        {' / '}
                                        {row.other_item.item_type || 'Item'}
                                        {row.endpoint_retired ? ' / retired endpoint' : ''}
                                      </small>
                                    </button>
                                    {row.note ? <p>{row.note}</p> : null}
                                    <div className={styles.itemRelationActions}>
                                      <button
                                        type="button"
                                        className={styles.iconBtn}
                                        onClick={() => void handleReaffirmRelation(row.id)}
                                        disabled={relationBusy || !row.can_reaffirm}
                                        title={row.can_reaffirm ? 'Reaffirm with current Item text' : 'Retired endpoints cannot be reaffirmed'}
                                        aria-label="Reaffirm Relation"
                                      >
                                        <RefreshCw size={12} />
                                      </button>
                                      <button
                                        type="button"
                                        className={styles.iconBtn}
                                        onClick={() => void handleRevokeRelation(row.id)}
                                        disabled={relationBusy || !row.can_revoke}
                                        title="Revoke Relation"
                                        aria-label="Revoke Relation"
                                      >
                                        <Unlink size={12} />
                                      </button>
                                    </div>
                                  </section>
                                ))}
                              </div>
                            ) : (
                              <p className={styles.itemQuietText}>No active Relations.</p>
                            )}
                            {relationError ? <p className={styles.itemErrorText}>{relationError}</p> : null}
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
