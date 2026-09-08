import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { createCoordinateContractSession } from '../coordinateContractSession';
import type { CoordinateContract } from '../placementContractService';
import {
  loadRuntimeTemplateOptions,
  metadataForTemplateOption,
  STATIC_TEMPLATE_OPTIONS,
  type TemplateOption,
} from '@/services/templateOptions';
import { useUIStore } from '@/stores/uiStore';
import {
  contentForEditedBlock,
  contentForEditedTextFlowBlock,
  contentForTemplate,
  plainTextForBlockContent,
  presentationKindForBlock,
  textFromContent,
  type BlockPresentationKind,
  type FieldValueRecord,
} from '../blockContentService';
import {
  getEffectiveAIVisibility,
  getEffectiveExportRole,
} from '../placementService';
import type {
  AIVisibility,
  BlockBoxLayout,
  ExportRole,
} from '../runtimeLayout';
import type {
  AnnotationProposalV1,
  AnnotationTruthV1,
  ContentGroupV1,
  GroupFolderV1,
  Note,
  NoteBlock,
  PurposeFrameV1,
  ReadingInterpretationV1,
  SourceAnchor,
  SourceJumpTarget,
  TextBlockContentV1,
} from '../runtimeDataTypes';
import {
  getTextFlowContent,
  projectTextFlowContent,
  TEXT_FLOW_CONTENT_KEY,
} from '../textFlowService';
import {
  normalizeContentGroup,
} from '../contentGroupService';
import { useBlockDraftAuthority } from './useBlockDraftAuthority';
import {
  NOTE_ANNOTATION_PROPOSALS_METADATA_KEY,
  NOTE_READING_INTERPRETATIONS_METADATA_KEY,
} from '../contentGroupMetadataService';
import {
  annotationTruthsDurablyEqual,
  annotationTruthsFromMetadata,
  loadAnnotationTruthsForNote,
  saveAnnotationTruthsForNote,
  stripLegacyAnnotationMetadata,
} from '../annotationTruthRepository';
import {
  applyCanvasLayoutsToBlocks,
  resolveCanvasPlacementWriteContext,
  deleteGenericCanvasObjectForNote,
  loadCanvasPersistenceForNote,
  saveGenericCanvasObjectForNote,
  saveBlockCanvasPlacementForNote,
  savePageFrameCollectionForNote,
  stripLegacyPageFrameMetadata,
} from '../canvasObjectRepository';
import {
  normalizeCanvasPersistencePayload,
} from '../canvasPersistenceNormalizer';
import {
  loadContentGroupsForNote,
  saveContentGroupsForNote,
} from '../contentGroupRepository';
import {
  loadGroupFoldersForNote,
  saveGroupFoldersForNote,
} from '../groupFolderRepository';
import {
  loadPurposeFramesForNote,
  savePurposeFramesForNote,
} from '../purposeRepository';
import {
  normalizeGroupFolders,
} from '../groupFolderService';
import {
  normalizePageFrameCollection,
} from '../pageFrameCollectionService';
import { sourceProjectionPolicyForNote } from '../sourceProjectionPolicy';
import {
  createDefaultDocumentTypographyProfile,
  typographyProfileFromMetadata,
  writeTypographyProfileMetadata,
} from '../typographyProfileService';
import type {
  CanvasObject,
  CanvasPlacement,
  ContentMount,
  DocumentTypographyProfile,
  ImageCanvasObject,
  PageFrameCollectionModel,
  StructuredCanvasObject,
  VisualConnector,
} from '../types';
import {
  createBlockEditRecoveryKey,
  finalizeDraftRecoveryReceipt,
  forgetBlockEditRecoveryReceipt,
  forgetDraftRecoveryReceipt,
  listBlockEditRecoveryReceipts,
  loadDraftRecoveryQueue,
  rememberBlockEditRecoveryReceipt,
  replayDraftRecoveryReceipts,
  type BlockEditRecoveryReceipt,
  type DraftBlockCreateResult,
  type DraftRecoveryReceipt,
} from '../draftBlockPersistence';
export type { BlockEditRecoveryReceipt } from '../draftBlockPersistence';
import {
  advanceRouteRequestGeneration,
  routeRequestGenerationMatches,
} from '../routeRequestGeneration';

type TemplateCategoryKey = 'default' | 'math' | 'userDefined';

export interface InsertTemplateGroup {
  key: TemplateCategoryKey;
  label: string;
  templates: TemplateOption[];
}

export interface UseNoteCanvasDataAdapterOptions {
  noteId?: string;
  onNoteLoaded: () => void;
  clearLayoutDraftForBlock: (blockId: string) => void;
  setLayoutDraftForBlock: (blockId: string, layout: BlockBoxLayout) => void;
}

export interface PersistCanvasObjectInput {
  canvasObject: CanvasObject;
  placement: CanvasPlacement;
  contentMounts?: ContentMount[];
  visualConnector?: VisualConnector | null;
  imageObject?: ImageCanvasObject | null;
  structuredObject?: StructuredCanvasObject | null;
  payload: Record<string, unknown>;
}

type AnnotationSaveRouteReceipt = Readonly<{
  noteId: string;
  generation: number;
  hydrationEpoch: number;
}>;

type AnnotationSaveRejectPhase =
  | 'enqueue'
  | 'publish'
  | 'publish_response'
  | 'publish_error'
  | 'reconciliation_read'
  | 'repair'
  | 'repair_response'
  | 'reconciliation_error'
  | 'snapshot';

export type BlockSaveDurableState =
  | 'matches_requested'
  | 'conflict'
  | 'missing'
  | 'read_failed'
  | 'not_checked';

export type BlockSaveOutcome =
  | {
    status: 'saved';
    block: NoteBlock;
    recoveryReceipt: null;
    reconciliation: 'response' | 'not_needed';
  }
  | {
    status: 'stale_epoch';
    block: NoteBlock | null;
    recoveryReceipt: BlockEditRecoveryReceipt;
    reconciliation: 'read_after_outcome' | 'read_failed';
    durableState: Exclude<BlockSaveDurableState, 'not_checked'>;
    reason: 'hydration_epoch_advanced' | 'route_receipt_stale' | 'superseded_operation';
  }
  | {
    status: 'rejected';
    block: NoteBlock | null;
    recoveryReceipt: BlockEditRecoveryReceipt | null;
    reconciliation: 'read_after_error' | 'read_failed' | 'not_attempted';
    durableState: BlockSaveDurableState;
    reason:
      | 'mutation_not_allowed'
      | 'route_receipt_unavailable'
      | 'recovery_receipt_unavailable'
      | 'request_failed';
    error?: unknown;
    staleEpoch: boolean;
  };

const INSERT_TEMPLATE_CATEGORIES: Array<{ key: TemplateCategoryKey; label: string }> = [
  { key: 'default', label: 'Default' },
  { key: 'math', label: 'Math' },
  { key: 'userDefined', label: 'User Defined' },
];

const DEFAULT_INSERT_TEMPLATE_KEYS = [
  'text.paragraph',
  'code.snippet',
];

const MATH_INSERT_TEMPLATE_KEYS = [
  'formula.math',
];

function findTemplateByKey(options: TemplateOption[], templateKey: string): TemplateOption | null {
  return options.find((template) => template.template_key === templateKey)
    || options.find((template) => template.template_id === templateKey)
    || null;
}

function isUserDefinedTemplate(option: TemplateOption): boolean {
  return option.origin === 'user' || (!option.isRuntime && option.origin === 'user');
}

function pickTemplatesByKey(options: TemplateOption[], templateKeys: string[]): TemplateOption[] {
  return templateKeys
    .map((templateKey) => findTemplateByKey(options, templateKey))
    .filter((template): template is TemplateOption => Boolean(template));
}

function templateWithInsertLabel(template: TemplateOption): TemplateOption {
  if (template.template_key !== 'code.snippet') return template;
  return {
    ...template,
    label: 'Code',
  };
}

export function buildInsertTemplateGroups(options: TemplateOption[]): InsertTemplateGroup[] {
  const groups = {
    default: pickTemplatesByKey(options, DEFAULT_INSERT_TEMPLATE_KEYS).map(templateWithInsertLabel),
    math: pickTemplatesByKey(options, MATH_INSERT_TEMPLATE_KEYS).map(templateWithInsertLabel),
    userDefined: options.filter(isUserDefinedTemplate).map(templateWithInsertLabel),
  };

  return INSERT_TEMPLATE_CATEGORIES
    .map((category) => ({
      ...category,
      templates: groups[category.key],
    }))
    .filter((category) => category.templates.length > 0);
}

function hydrateClientBlock(raw: any): NoteBlock {
  return {
    ...raw,
    content_json: raw?.content_json && typeof raw.content_json === 'object' ? raw.content_json : {},
    display_overrides_json: raw?.display_overrides_json && typeof raw.display_overrides_json === 'object'
      ? raw.display_overrides_json
      : {},
    canvas_layout: raw?.canvas_layout && typeof raw.canvas_layout === 'object'
      ? raw.canvas_layout
      : null,
    metadata: raw?.metadata && typeof raw.metadata === 'object' ? raw.metadata : {},
    source_references: Array.isArray(raw?.source_references)
      ? raw.source_references.filter((ref: unknown) => ref !== null)
      : [],
  };
}

function readingInterpretationsFromMetadata(metadata: Record<string, unknown> | undefined): ReadingInterpretationV1[] {
  const interpretations = metadata?.[NOTE_READING_INTERPRETATIONS_METADATA_KEY];
  if (!Array.isArray(interpretations)) return [];
  return interpretations.filter((item): item is ReadingInterpretationV1 => (
    Boolean(item)
    && typeof item === 'object'
    && typeof (item as ReadingInterpretationV1).id === 'string'
    && typeof (item as ReadingInterpretationV1).summary === 'string'
    && Array.isArray((item as ReadingInterpretationV1).proposed_annotation_ids)
  ));
}

function annotationProposalsFromMetadata(metadata: Record<string, unknown> | undefined): AnnotationProposalV1[] {
  const proposals = metadata?.[NOTE_ANNOTATION_PROPOSALS_METADATA_KEY];
  if (!Array.isArray(proposals)) return [];
  return proposals.filter((item): item is AnnotationProposalV1 => (
    Boolean(item)
    && typeof item === 'object'
    && typeof (item as AnnotationProposalV1).id === 'string'
    && typeof (item as AnnotationProposalV1).proposed_label === 'string'
    && Array.isArray((item as AnnotationProposalV1).proposed_ranges)
  ));
}

function metadataChanged(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown>,
): boolean {
  return JSON.stringify(before || {}) !== JSON.stringify(after);
}

function canonicalJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalJsonValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nestedValue]) => [key, canonicalJsonValue(nestedValue)]),
  );
}

function blockMatchesIssuedSave(
  observedBlock: NoteBlock,
  requestedPlainText: string,
  requestedContent: Record<string, unknown>,
): boolean {
  return observedBlock.plain_text === requestedPlainText
    && JSON.stringify(canonicalJsonValue(observedBlock.content_json))
      === JSON.stringify(canonicalJsonValue(requestedContent));
}

function upsertCanvasObject(items: CanvasObject[], item: CanvasObject): CanvasObject[] {
  const exists = items.some((candidate) => candidate.objectId === item.objectId);
  return exists
    ? items.map((candidate) => candidate.objectId === item.objectId ? item : candidate)
    : [...items, item];
}

function upsertCanvasPlacement(items: CanvasPlacement[], item: CanvasPlacement): CanvasPlacement[] {
  const exists = items.some((candidate) => candidate.placementId === item.placementId);
  return exists
    ? items.map((candidate) => candidate.placementId === item.placementId ? item : candidate)
    : [...items, item];
}

function replaceContentMountsForObject(
  items: ContentMount[],
  objectId: string,
  nextMounts: ContentMount[],
): ContentMount[] {
  return [
    ...items.filter((item) => item.objectId !== objectId),
    ...nextMounts,
  ];
}

function upsertVisualConnector(items: VisualConnector[], item: VisualConnector): VisualConnector[] {
  const exists = items.some((candidate) => candidate.connectorId === item.connectorId);
  return exists
    ? items.map((candidate) => candidate.connectorId === item.connectorId ? item : candidate)
    : [...items, item];
}

function upsertImageObject(items: ImageCanvasObject[], item: ImageCanvasObject): ImageCanvasObject[] {
  const exists = items.some((candidate) => candidate.objectId === item.objectId);
  return exists
    ? items.map((candidate) => candidate.objectId === item.objectId ? item : candidate)
    : [...items, item];
}

function upsertStructuredObject(items: StructuredCanvasObject[], item: StructuredCanvasObject): StructuredCanvasObject[] {
  const exists = items.some((candidate) => candidate.objectId === item.objectId);
  return exists
    ? items.map((candidate) => candidate.objectId === item.objectId ? item : candidate)
    : [...items, item];
}

function recordFromUnknown(value: unknown): Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
    ? value as Record<string, unknown>
    : {};
}

function createBlockEditRecoveryMountNonce(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function presentationKindForTemplate(template: TemplateOption, _sourceQuote = false): BlockPresentationKind {
  if (template.learning_role === 'formula') return 'formula';
  if (template.template_key === 'code.snippet') return 'code';
  return 'paragraph';
}

export function useNoteCanvasDataAdapter({
  noteId,
  onNoteLoaded,
  clearLayoutDraftForBlock,
  setLayoutDraftForBlock,
}: UseNoteCanvasDataAdapterOptions) {
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);

  const [note, setNote] = useState<Note | null>(null);
  const contractSession = useMemo(() => createCoordinateContractSession(), [noteId]);
  const [coordinateContract, setCoordinateContract] = useState<CoordinateContract>('v1');
  const [blocks, setBlocks] = useState<NoteBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [titleDraft, setTitleDraft] = useState('');
  const [templateOptions, setTemplateOptions] = useState<TemplateOption[]>(STATIC_TEMPLATE_OPTIONS);
  const [templateWarning, setTemplateWarning] = useState<string | null>(null);
  const [savingBlockId, setSavingBlockId] = useState<string | null>(null);
  const [anchorsBySourceRef, setAnchorsBySourceRef] = useState<Record<string, SourceAnchor>>({});
  const [sourceJumpTarget, setSourceJumpTarget] = useState<SourceJumpTarget | null>(null);
  const [sourceJumpBusy, setSourceJumpBusy] = useState<string | null>(null);
  const [annotationTruths, setAnnotationTruths] = useState<AnnotationTruthV1[]>([]);
  const [successfulHydrationEpoch, setSuccessfulHydrationEpoch] = useState(0);
  const [contentGroups, setContentGroups] = useState<ContentGroupV1[]>([]);
  const [groupFolders, setGroupFolders] = useState<GroupFolderV1[]>([]);
  const [purposeFrames, setPurposeFrames] = useState<PurposeFrameV1[]>([]);
  const [pageFrameCollection, setPageFrameCollection] = useState<PageFrameCollectionModel | null>(null);
  const [persistedCanvasObjects, setPersistedCanvasObjects] = useState<CanvasObject[]>([]);
  const [persistedCanvasPlacements, setPersistedCanvasPlacements] = useState<CanvasPlacement[]>([]);
  const [persistedContentMounts, setPersistedContentMounts] = useState<ContentMount[]>([]);
  const [persistedVisualConnectors, setPersistedVisualConnectors] = useState<VisualConnector[]>([]);
  const [persistedImageObjects, setPersistedImageObjects] = useState<ImageCanvasObject[]>([]);
  const [persistedStructuredObjects, setPersistedStructuredObjects] = useState<StructuredCanvasObject[]>([]);
  const [documentTypographyProfile, setDocumentTypographyProfile] = useState<DocumentTypographyProfile>(
    createDefaultDocumentTypographyProfile(),
  );
  const [readingInterpretations, setReadingInterpretations] = useState<ReadingInterpretationV1[]>([]);
  const [annotationProposals, setAnnotationProposals] = useState<AnnotationProposalV1[]>([]);
  const {
    blockTextDrafts,
    blockTextFlowDrafts,
    blockFieldDrafts,
    setBlockTextDrafts,
    setBlockTextFlowDrafts,
    setBlockFieldDrafts,
    readBlockDraftSnapshot,
  } = useBlockDraftAuthority();
  const noteRef = useRef<Note | null>(null);
  const [blockEditRecoveryMountNonce] = useState(createBlockEditRecoveryMountNonce);
  const adapterMountActiveRef = useRef(true);
  const routeNoteIdRef = useRef(noteId);
  const routeRequestGenerationRef = useRef(0);
  const routeRequestNoteIdRef = useRef(noteId);
  const noteLoadGenerationRef = useRef(0);
  const successfulHydrationEpochRef = useRef(0);
  const annotationSaveResponseSequenceRef = useRef(0);
  const annotationSaveTailsByNoteRef = useRef(new Map<string, Promise<void>>());
  const contentGroupSaveGenerationRef = useRef(0);
  const purposeFrameSaveGenerationRef = useRef(0);
  const pageFrameSaveGenerationRef = useRef(0);
  const typographyProfileSaveGenerationRef = useRef(0);
  const recoveryFailureNotifiedKeysRef = useRef(new Set<string>());
  const replayingRecoveryKeysRef = useRef(new Set<string>());
  const blockSaveOperationSequenceRef = useRef(0);
  const latestBlockSaveOperationByBlockRef = useRef(new Map<string, number>());
  const outstandingBlockSaveOperationsRef = useRef(new Map<number, Readonly<{
    blockId: string;
    requestedNoteId: string;
    creationGeneration: number;
  }>>());
  const blockSaveOutcomeVersionRef = useRef(0);
  routeNoteIdRef.current = noteId;
  const nextRouteRequestGeneration = advanceRouteRequestGeneration({
    noteId: routeRequestNoteIdRef.current,
    generation: routeRequestGenerationRef.current,
  }, noteId);
  routeRequestNoteIdRef.current = nextRouteRequestGeneration.noteId;
  routeRequestGenerationRef.current = nextRouteRequestGeneration.generation;

  useEffect(() => {
    adapterMountActiveRef.current = true;
    return () => {
      adapterMountActiveRef.current = false;
    };
  }, []);

  const hydratedNoteId = note?.id || null;
  const annotationSaveRouteReceipt = useMemo<AnnotationSaveRouteReceipt | null>(() => {
    if (!hydratedNoteId || hydratedNoteId !== noteId || successfulHydrationEpoch <= 0) return null;
    return Object.freeze({
      noteId: hydratedNoteId,
      generation: nextRouteRequestGeneration.generation,
      hydrationEpoch: successfulHydrationEpoch,
    });
  }, [hydratedNoteId, nextRouteRequestGeneration.generation, noteId, successfulHydrationEpoch]);

  useEffect(() => {
    noteRef.current = note;
  }, [note]);

  useEffect(() => {
    const activeRoute = {
      noteId: routeNoteIdRef.current,
      generation: routeRequestGenerationRef.current,
    };
    const latestVisibleOperation = Array.from(
      outstandingBlockSaveOperationsRef.current.entries(),
    ).filter(([, operation]) => routeRequestGenerationMatches(activeRoute, {
      noteId: operation.requestedNoteId,
      generation: operation.creationGeneration,
    })).sort(([left], [right]) => right - left)[0];
    setSavingBlockId(latestVisibleOperation?.[1].blockId || null);
  }, [nextRouteRequestGeneration.generation, noteId]);

  const setAnnotationTruthsSnapshot = useCallback((nextAnnotations: AnnotationTruthV1[]) => {
    setAnnotationTruths(nextAnnotations);
  }, []);

  const sourceProjectionPolicy = useMemo(
    () => sourceProjectionPolicyForNote(note),
    [note],
  );

  const allowSourceContentMutation = useCallback(() => {
    if (!sourceProjectionPolicy.contentReadOnly) return true;
    addToast('info', 'Source projection content is read-only');
    return false;
  }, [addToast, sourceProjectionPolicy.contentReadOnly]);

  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => a.order_index - b.order_index),
    [blocks],
  );
  const blockEditRecoveryReceipts = listBlockEditRecoveryReceipts(noteId);

  const insertTemplateGroups = useMemo(
    () => buildInsertTemplateGroups(templateOptions),
    [templateOptions],
  );

  const insertTemplateOptions = useMemo(
    () => insertTemplateGroups.flatMap((group) => group.templates),
    [insertTemplateGroups],
  );

  const defaultTextTemplate = useMemo(
    () => templateOptions.find((template) => template.template_key === 'text.paragraph')
      || templateOptions.find((template) => template.template_id === 'text.paragraph')
      || templateOptions[0]
      || STATIC_TEMPLATE_OPTIONS[0],
    [templateOptions],
  );

  const fetchNote = useCallback(async () => {
    if (!noteId) return;
    const requestedNoteId = noteId;
    const loadGeneration = noteLoadGenerationRef.current + 1;
    noteLoadGenerationRef.current = loadGeneration;
    const requestIsCurrent = () => (
      noteLoadGenerationRef.current === loadGeneration
      && routeNoteIdRef.current === requestedNoteId
    );
    setLoading(true);
    try {
      const [noteRes, blocksRes] = await Promise.all([
        api.get(`/notes/${noteId}`),
        api.get(`/notes/${noteId}/blocks`),
      ]);
      const hydratedNote = noteRes.data as Note;
      const savedContentGroups = await loadContentGroupsForNote({ note: hydratedNote });
      const [savedGroupFolders, canvasPersistence, savedAnnotationTruths, savedPurposeFrames] = await Promise.all([
        loadGroupFoldersForNote({ note: hydratedNote }),
        loadCanvasPersistenceForNote({ note: hydratedNote, contractSession }),
        loadAnnotationTruthsForNote({ note: hydratedNote }),
        loadPurposeFramesForNote({ note: hydratedNote }),
      ]);
      if (!requestIsCurrent()) return;
      const hydratedBlocks = applyCanvasLayoutsToBlocks(
        (blocksRes.data as any[]).map(hydrateClientBlock),
        canvasPersistence.blockLayouts,
        { pageFrameCollection: canvasPersistence.pageFrameCollection, coordinateContract: canvasPersistence.coordinateContract },
      );
      const cleanMetadata = stripLegacyAnnotationMetadata(stripLegacyPageFrameMetadata(hydratedNote.metadata));
      let persistedNote = hydratedNote;
      if (metadataChanged(hydratedNote.metadata, cleanMetadata)) {
        const stripResponse = await api.put<Note>(`/notes/${hydratedNote.id}`, { metadata: cleanMetadata });
        if (!requestIsCurrent()) return;
        persistedNote = stripResponse.data || { ...hydratedNote, metadata: cleanMetadata };
      }
      const noteForState: Note = { ...persistedNote, metadata: cleanMetadata };
      const hydrationEpoch = successfulHydrationEpochRef.current + 1;
      successfulHydrationEpochRef.current = hydrationEpoch;
      setSuccessfulHydrationEpoch(hydrationEpoch);
      noteRef.current = noteForState;
      setNote(noteForState);
      setTitleDraft(noteRes.data.title);
      setAnnotationTruthsSnapshot(savedAnnotationTruths);
      setContentGroups(savedContentGroups);
      setGroupFolders(savedGroupFolders);
      setPurposeFrames(savedPurposeFrames);
      setPageFrameCollection(canvasPersistence.pageFrameCollection);
      setCoordinateContract(canvasPersistence.coordinateContract || 'v1');
      setPersistedCanvasObjects(canvasPersistence.canvasObjects);
      setPersistedCanvasPlacements(canvasPersistence.canvasPlacements);
      setPersistedContentMounts(canvasPersistence.contentMounts);
      setPersistedVisualConnectors(canvasPersistence.visualConnectors);
      setPersistedImageObjects(canvasPersistence.imageObjects);
      setPersistedStructuredObjects(canvasPersistence.structuredObjects);
      setDocumentTypographyProfile(typographyProfileFromMetadata(hydratedNote.metadata));
      setReadingInterpretations(readingInterpretationsFromMetadata(hydratedNote.metadata));
      setAnnotationProposals(annotationProposalsFromMetadata(hydratedNote.metadata));
      setBlocks(hydratedBlocks);
      const activeRouteGeneration = routeRequestGenerationRef.current;
      const draftSnapshot = readBlockDraftSnapshot();
      const recoveredTextDrafts: Record<string, string> = {};
      const recoveredTextFlowDrafts: Record<string, TextBlockContentV1> = {};
      const recoveredFieldDrafts: Record<string, FieldValueRecord> = {};
      listBlockEditRecoveryReceipts(requestedNoteId).forEach((receipt) => {
        if (
          receipt.mountNonce !== blockEditRecoveryMountNonce
          || receipt.creationGeneration !== activeRouteGeneration
        ) {
          const notificationKey = `block-edit-recovery:${receipt.recoveryKey}`;
          if (!recoveryFailureNotifiedKeysRef.current.has(notificationKey)) {
            recoveryFailureNotifiedKeysRef.current.add(notificationKey);
            addToast('info', 'A previous block edit is queued for recovery');
          }
          return;
        }
        const blockId = receipt.blockId;
        recoveredTextDrafts[blockId] = Object.prototype.hasOwnProperty.call(
          draftSnapshot.textDrafts,
          blockId,
        )
          ? draftSnapshot.textDrafts[blockId]
          : receipt.text;
        const latestTextFlow = draftSnapshot.textFlowDrafts[blockId] || receipt.textFlow;
        if (latestTextFlow) recoveredTextFlowDrafts[blockId] = latestTextFlow;
        const latestFields = draftSnapshot.fieldDrafts[blockId] || receipt.fieldValues;
        if (latestFields) recoveredFieldDrafts[blockId] = latestFields;
      });
      setBlockTextDrafts(recoveredTextDrafts);
      setBlockTextFlowDrafts(recoveredTextFlowDrafts);
      setBlockFieldDrafts(recoveredFieldDrafts);
      onNoteLoaded();
    } catch (err) {
      if (!requestIsCurrent()) return;
      console.error('Failed to load note:', err);
      addToast('error', 'Failed to load note');
      navigate('/projects');
    } finally {
      if (requestIsCurrent()) setLoading(false);
    }
  }, [
    contractSession,
    noteId,
    addToast,
    blockEditRecoveryMountNonce,
    navigate,
    onNoteLoaded,
    readBlockDraftSnapshot,
    setAnnotationTruthsSnapshot,
  ]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  useEffect(() => {
    let cancelled = false;
    loadRuntimeTemplateOptions().then(({ options, warning }) => {
      if (cancelled) return;
      setTemplateOptions(options);
      setTemplateWarning(warning);
    });
    return () => { cancelled = true; };
  }, []);

  const fetchSourceAnchors = useCallback(async (courseId: string) => {
    try {
      await api.post('/source-anchors/generate', {
        course_id: courseId,
        target_type: 'note_block',
      });
      const res = await api.get('/source-anchors', { params: { course_id: courseId } });
      const nextAnchors: Record<string, SourceAnchor> = {};
      for (const anchor of res.data as SourceAnchor[]) {
        const sourceRefId = anchor.metadata?.note_block_source_id;
        if (sourceRefId) nextAnchors[sourceRefId] = anchor;
      }
      setAnchorsBySourceRef(nextAnchors);
    } catch (err) {
      console.error('Failed to load source anchors:', err);
      setAnchorsBySourceRef({});
    }
  }, []);

  useEffect(() => {
    if (!note?.course_id || blocks.length === 0) return;
    fetchSourceAnchors(note.course_id);
  }, [note?.course_id, blocks.length, fetchSourceAnchors]);

  const saveTitle = useCallback(async () => {
    const nextTitle = titleDraft.trim();
    if (!note || !nextTitle || nextTitle === note.title) return;
    if (!allowSourceContentMutation()) return;
    try {
      const res = await api.put(`/notes/${note.id}`, { title: nextTitle });
      setNote(res.data);
      setTitleDraft(res.data?.title || nextTitle);
      addToast('success', 'Note renamed');
    } catch (err) {
      console.error('Failed to rename note:', err);
      addToast('error', 'Failed to rename note');
    }
  }, [note, titleDraft, addToast, allowSourceContentMutation]);

  const saveAnnotationTruths = useCallback(async (nextAnnotations: AnnotationTruthV1[]) => {
    const currentNote = note;
    const receipt = annotationSaveRouteReceipt;
    if (!currentNote || !receipt) {
      console.warn('Rejected stale annotation save receipt:', {
        noteId: currentNote?.id || null,
        generation: null,
        phase: 'enqueue',
        reason: 'route_receipt_unavailable',
      });
      return;
    }
    const requestIsCurrent = () => (
      routeRequestGenerationMatches(
        { noteId: routeNoteIdRef.current, generation: routeRequestGenerationRef.current },
        receipt,
      )
      && noteRef.current?.id === receipt.noteId
      && successfulHydrationEpochRef.current === receipt.hydrationEpoch
    );
    const rejectStaleReceipt = (phase: AnnotationSaveRejectPhase): boolean => {
      if (requestIsCurrent()) return false;
      console.warn('Rejected stale annotation save receipt:', {
        noteId: receipt.noteId,
        generation: receipt.generation,
        hydrationEpoch: receipt.hydrationEpoch,
        phase,
        reason: 'route_receipt_stale',
        activeNoteId: routeNoteIdRef.current,
        activeGeneration: routeRequestGenerationRef.current,
        activeHydrationEpoch: successfulHydrationEpochRef.current,
      });
      return true;
    };
    if (rejectStaleReceipt('enqueue')) return;
    const responseSequence = annotationSaveResponseSequenceRef.current + 1;
    annotationSaveResponseSequenceRef.current = responseSequence;
    setAnnotationTruthsSnapshot(nextAnnotations);

    const setSnapshotIfCurrent = (annotations: AnnotationTruthV1[]) => {
      if (rejectStaleReceipt('snapshot')) return;
      if (annotationSaveResponseSequenceRef.current !== responseSequence) {
        console.warn('Rejected stale annotation save receipt:', {
          noteId: receipt.noteId,
          generation: receipt.generation,
          hydrationEpoch: receipt.hydrationEpoch,
          phase: 'snapshot',
          reason: 'snapshot_superseded',
          responseSequence,
          activeResponseSequence: annotationSaveResponseSequenceRef.current,
        });
        return;
      }
      setAnnotationTruthsSnapshot(annotations);
    };

    const publish = async () => {
      if (rejectStaleReceipt('publish')) return;
      try {
        const savedAnnotations = await saveAnnotationTruthsForNote({
          noteId: receipt.noteId,
          annotations: nextAnnotations,
        });
        if (rejectStaleReceipt('publish_response')) return;
        setSnapshotIfCurrent(savedAnnotations);
      } catch (err) {
        if (rejectStaleReceipt('publish_error')) return;
        console.error(
          'Failed to save annotations; durable outcome is unknown until reconciliation read:',
          err,
        );
        addToast('error', 'Failed to save annotation');

        try {
          const observedAnnotations = await loadAnnotationTruthsForNote({
            note: currentNote,
            importLegacy: false,
          });
          if (rejectStaleReceipt('reconciliation_read')) return;
          if (annotationTruthsDurablyEqual(observedAnnotations, nextAnnotations)) {
            setSnapshotIfCurrent(observedAnnotations);
            return;
          }

          if (rejectStaleReceipt('repair')) return;
          const repairedAnnotations = await saveAnnotationTruthsForNote({
            noteId: receipt.noteId,
            annotations: nextAnnotations,
          });
          if (rejectStaleReceipt('repair_response')) return;
          setSnapshotIfCurrent(repairedAnnotations);
        } catch (reconciliationError) {
          if (rejectStaleReceipt('reconciliation_error')) return;
          console.error(
            'Failed to reconcile annotations; durable outcome remains unknown:',
            reconciliationError,
          );
          // The active editor's optimistic snapshot remains authoritative. A
          // rejected request is not evidence that the server did not commit it.
          setSnapshotIfCurrent(nextAnnotations);
        }
      }
    };

    const tailKey = receipt.noteId;
    const previousTail = annotationSaveTailsByNoteRef.current.get(tailKey);
    // The first operation in a receipt bucket starts synchronously. This is
    // what lets a valid B intent enter PUT while an unrelated A PUT is held.
    const queuedPublish = previousTail ? previousTail.then(publish, publish) : publish();
    const settledTail = queuedPublish.then(
      () => undefined,
      () => undefined,
    );
    annotationSaveTailsByNoteRef.current.set(tailKey, settledTail);
    void settledTail.then(() => {
      if (annotationSaveTailsByNoteRef.current.get(tailKey) === settledTail) {
        annotationSaveTailsByNoteRef.current.delete(tailKey);
      }
    });
    await queuedPublish;
  }, [addToast, annotationSaveRouteReceipt, note, setAnnotationTruthsSnapshot]);

  const saveContentGroups = useCallback(async (nextGroups: ContentGroupV1[]): Promise<boolean> => {
    const currentNote = noteRef.current || note;
    if (!currentNote) return false;
    const previousGroups = contentGroups;
    const normalizedGroups = nextGroups.map(normalizeContentGroup);
    const saveGeneration = contentGroupSaveGenerationRef.current + 1;
    contentGroupSaveGenerationRef.current = saveGeneration;
    setContentGroups(normalizedGroups);
    try {
      const savedGroups = await saveContentGroupsForNote({
        noteId: currentNote.id,
        groups: normalizedGroups,
      });
      if (contentGroupSaveGenerationRef.current === saveGeneration) {
        setContentGroups(savedGroups);
      }
      return true;
    } catch (err) {
      console.error('Failed to save content groups:', err);
      addToast('error', 'Failed to save content group');
      if (contentGroupSaveGenerationRef.current === saveGeneration) {
        setContentGroups(previousGroups);
      }
      return false;
    }
  }, [addToast, contentGroups, note]);

  const saveGroupFolders = useCallback(async (nextFolders: GroupFolderV1[]) => {
    const currentNote = noteRef.current || note;
    if (!currentNote) return;
    const previousFolders = groupFolders;
    const normalizedFolders = normalizeGroupFolders(nextFolders);
    const saveGeneration = contentGroupSaveGenerationRef.current + 1;
    contentGroupSaveGenerationRef.current = saveGeneration;
    setGroupFolders(normalizedFolders);
    try {
      const savedFolders = await saveGroupFoldersForNote({
        noteId: currentNote.id,
        folders: normalizedFolders,
      });
      if (contentGroupSaveGenerationRef.current !== saveGeneration) return;
      setGroupFolders(savedFolders);
    } catch (err) {
      console.error('Failed to save group folders:', err);
      addToast('error', 'Failed to save group folders');
      if (contentGroupSaveGenerationRef.current !== saveGeneration) return;
      try {
        const savedFolders = await loadGroupFoldersForNote({
          note: currentNote,
          importLegacy: false,
        });
        setGroupFolders(savedFolders);
      } catch {
        setGroupFolders(previousFolders);
      }
    }
  }, [addToast, groupFolders, note]);

  const savePurposeFrames = useCallback(async (nextPurposes: PurposeFrameV1[]): Promise<boolean> => {
    const currentNote = noteRef.current || note;
    if (!currentNote) return false;
    const previousPurposes = purposeFrames;
    const saveGeneration = purposeFrameSaveGenerationRef.current + 1;
    purposeFrameSaveGenerationRef.current = saveGeneration;
    setPurposeFrames(nextPurposes);
    try {
      const savedPurposes = await savePurposeFramesForNote({
        noteId: currentNote.id,
        purposes: nextPurposes,
      });
      if (purposeFrameSaveGenerationRef.current !== saveGeneration) return true;
      setPurposeFrames(savedPurposes);
      return true;
    } catch (err) {
      console.error('Failed to save purposes:', err);
      addToast('error', 'Failed to save purpose');
      if (purposeFrameSaveGenerationRef.current === saveGeneration) {
        setPurposeFrames(previousPurposes);
      }
      return false;
    }
  }, [addToast, note, purposeFrames]);

  const savePageFrameCollection = useCallback(async (nextCollection: PageFrameCollectionModel) => {
    const currentNote = noteRef.current || note;
    if (!currentNote) return;
    if (!allowSourceContentMutation()) return;
    const previousCollection = pageFrameCollection;
    const normalizedCollection = normalizePageFrameCollection(nextCollection);
    const saveGeneration = pageFrameSaveGenerationRef.current + 1;
    pageFrameSaveGenerationRef.current = saveGeneration;
    setPageFrameCollection(normalizedCollection);
    try {
      const savedCollection = await savePageFrameCollectionForNote({
        noteId: currentNote.id,
        collection: normalizedCollection,
      });
      if (pageFrameSaveGenerationRef.current !== saveGeneration) return;
      setPageFrameCollection(savedCollection);
    } catch (err) {
      console.error('Failed to save page frames:', err);
      addToast('error', 'Failed to save page frames');
      if (pageFrameSaveGenerationRef.current !== saveGeneration) return;
      setPageFrameCollection(previousCollection);
    }
  }, [addToast, allowSourceContentMutation, note, pageFrameCollection, contractSession]);

  const saveDocumentTypographyProfile = useCallback(async (nextProfile: DocumentTypographyProfile) => {
    const currentNote = noteRef.current || note;
    if (!currentNote) return;
    const previousProfile = documentTypographyProfile;
    const nextMetadata = writeTypographyProfileMetadata(currentNote.metadata, nextProfile);
    const normalizedProfile = typographyProfileFromMetadata(nextMetadata);
    const saveGeneration = typographyProfileSaveGenerationRef.current + 1;
    typographyProfileSaveGenerationRef.current = saveGeneration;
    const optimisticNote = {
      ...currentNote,
      metadata: nextMetadata,
    };
    noteRef.current = optimisticNote;
    setNote(optimisticNote);
    setDocumentTypographyProfile(normalizedProfile);
    try {
      const res = await api.put(`/notes/${currentNote.id}`, { metadata: nextMetadata });
      const updated = res.data as Note;
      if (typographyProfileSaveGenerationRef.current !== saveGeneration) return;
      const savedProfile = typographyProfileFromMetadata(updated.metadata);
      noteRef.current = updated;
      setNote(updated);
      setDocumentTypographyProfile(savedProfile);
    } catch (err) {
      console.error('Failed to save document typography:', err);
      addToast('error', 'Failed to save typography');
      if (typographyProfileSaveGenerationRef.current !== saveGeneration) return;
      noteRef.current = currentNote;
      setNote(currentNote);
      setDocumentTypographyProfile(previousProfile);
    }
  }, [addToast, documentTypographyProfile, note]);

  const saveReadingInterpretations = useCallback(async (nextInterpretations: ReadingInterpretationV1[]) => {
    if (!note) return;
    const nextMetadata = {
      ...(note.metadata || {}),
      [NOTE_READING_INTERPRETATIONS_METADATA_KEY]: nextInterpretations,
    };
    setReadingInterpretations(nextInterpretations);
    try {
      const res = await api.put(`/notes/${note.id}`, { metadata: nextMetadata });
      const updated = res.data as Note;
      setNote(updated);
      setReadingInterpretations(readingInterpretationsFromMetadata(updated.metadata));
    } catch (err) {
      console.error('Failed to save reading interpretations:', err);
      addToast('error', 'Failed to save reading interpretation');
      setReadingInterpretations(readingInterpretationsFromMetadata(note.metadata));
    }
  }, [addToast, note]);

  const saveAnnotationProposals = useCallback(async (nextProposals: AnnotationProposalV1[]) => {
    if (!note) return;
    const nextMetadata = {
      ...(note.metadata || {}),
      [NOTE_ANNOTATION_PROPOSALS_METADATA_KEY]: nextProposals,
    };
    setAnnotationProposals(nextProposals);
    try {
      const res = await api.put(`/notes/${note.id}`, { metadata: nextMetadata });
      const updated = res.data as Note;
      setNote(updated);
      setAnnotationProposals(annotationProposalsFromMetadata(updated.metadata));
    } catch (err) {
      console.error('Failed to save annotation proposals:', err);
      addToast('error', 'Failed to save annotation proposal');
      setAnnotationProposals(annotationProposalsFromMetadata(note.metadata));
    }
  }, [addToast, note]);

  const createBlock = useCallback(async (
    template: TemplateOption,
    text: string,
    options: {
      title?: string | null;
      contentJson?: Record<string, unknown>;
      metadataPatch?: Record<string, unknown>;
      layout?: BlockBoxLayout;
      silent?: boolean;
    } = {},
  ): Promise<NoteBlock | null> => {
    if (!note) return null;
    if (!allowSourceContentMutation()) return null;
    const requestedNote = note;
    const requestGeneration = routeRequestGenerationRef.current;
    const requestIsCurrent = () => (
      routeRequestGenerationMatches(
        { noteId: routeNoteIdRef.current, generation: routeRequestGenerationRef.current },
        { noteId: requestedNote.id, generation: requestGeneration },
      )
      && noteRef.current?.id === requestedNote.id
    );
    const body = text.trimEnd();
    const metadata = {
      ...metadataForTemplateOption(template),
      ...(options.metadataPatch || {}),
    };
    const nextContent = options.contentJson || contentForTemplate(template, body);
    const nextKind = presentationKindForTemplate(template, true);
    let created: NoteBlock;
    try {
      const res = await api.post(`/notes/${requestedNote.id}/blocks`, {
        block_type: template.legacy_block_type,
        title: options.title || undefined,
        content_json: nextContent,
        plain_text: plainTextForBlockContent(nextKind, nextContent, body),
        metadata,
      });
      created = hydrateClientBlock(res.data);
    } catch (err) {
      if (!requestIsCurrent()) return null;
      console.error('Failed to create block:', err);
      addToast('error', 'Failed to create block');
      return null;
    }
    if (!requestIsCurrent()) return null;

    if (options.layout) {
      try {
        const savedLayout = await saveBlockCanvasPlacementForNote({
          ...await resolveCanvasPlacementWriteContext({
            noteId: requestedNote.id, loadedNoteId: note?.id, pageFrameCollection, contractSession,
          }),
          noteId: requestedNote.id,
          block: created,
          layout: options.layout,
        });
        created = { ...created, canvas_layout: savedLayout.layout };
      } catch (err) {
        if (!requestIsCurrent()) return null;
        console.error('Block created but placement save failed:', err);
        addToast('error', 'Block created, but its placement could not be saved');
        created = {
          ...created,
          canvas_layout: { ...options.layout },
        };
      }
    }

    if (!requestIsCurrent()) return null;
    const createdTextFlow = getTextFlowContent(nextContent);
    setBlocks((current) => [...current, created].sort((a, b) => a.order_index - b.order_index));
    setBlockTextDrafts((current) => ({ ...current, [created.id]: text.trimEnd() }));
    if (createdTextFlow) {
      setBlockTextFlowDrafts((current) => ({ ...current, [created.id]: createdTextFlow }));
    }
    if (!options.silent) addToast('success', 'Block added');
    return created;
  }, [note, addToast, allowSourceContentMutation, pageFrameCollection, contractSession]);

  const createDraftBlock = useCallback(async (
    template: TemplateOption,
    text: string,
    options: {
      title?: string | null;
      contentJson?: Record<string, unknown>;
      metadataPatch?: Record<string, unknown>;
      layout?: BlockBoxLayout;
      silent?: boolean;
      clientCreateKey: string;
    },
  ): Promise<DraftBlockCreateResult | null> => {
    if (!note) return null;
    if (!allowSourceContentMutation()) return null;
    const requestedNote = note;
    const requestGeneration = routeRequestGenerationRef.current;
    const requestIsCurrent = () => (
      routeRequestGenerationMatches(
        { noteId: routeNoteIdRef.current, generation: routeRequestGenerationRef.current },
        { noteId: requestedNote.id, generation: requestGeneration },
      )
      && noteRef.current?.id === requestedNote.id
    );
    const body = text.trimEnd();
    const metadata = {
      ...metadataForTemplateOption(template),
      ...(options.metadataPatch || {}),
    };
    const nextContent = options.contentJson || contentForTemplate(template, body);
    const nextKind = presentationKindForTemplate(template, true);
    let created: NoteBlock;
    let reused = false;
    try {
      const response = await api.post(`/notes/${requestedNote.id}/blocks`, {
        block_type: template.legacy_block_type,
        title: options.title || undefined,
        content_json: nextContent,
        plain_text: plainTextForBlockContent(nextKind, nextContent, body),
        metadata,
        client_create_key: options.clientCreateKey,
      });
      created = hydrateClientBlock(response.data);
      reused = response.data?.client_create_receipt?.reused === true;
    } catch (err: any) {
      if (err?.response?.data?.status === 'canceled') return null;
      if (requestIsCurrent()) {
        console.error('Failed to create draft block:', err);
        addToast('error', 'Failed to create block');
      }
      return null;
    }

    let placementPersisted = !options.layout;
    if (options.layout) {
      try {
        const savedLayout = await saveBlockCanvasPlacementForNote({
          ...await resolveCanvasPlacementWriteContext({
            noteId: requestedNote.id, loadedNoteId: note?.id, pageFrameCollection, contractSession,
          }),
          noteId: requestedNote.id,
          block: created,
          layout: options.layout,
        });
        created = { ...created, canvas_layout: savedLayout.layout };
        placementPersisted = true;
      } catch (err) {
        if (requestIsCurrent()) {
          console.error('Draft block created but placement save failed:', err);
          addToast('error', 'Block created, but its placement could not be saved');
        }
      }
    }

    if (placementPersisted && requestIsCurrent()) {
      const createdTextFlow = getTextFlowContent(nextContent);
      setBlocks((current) => [...current.filter((item) => item.id !== created.id), created]
        .sort((left, right) => left.order_index - right.order_index));
      setBlockTextDrafts((current) => ({ ...current, [created.id]: body }));
      if (createdTextFlow) {
        setBlockTextFlowDrafts((current) => ({ ...current, [created.id]: createdTextFlow }));
      }
    }

    return {
      block: created,
      clientCreateKey: options.clientCreateKey,
      placementPersisted,
      reused,
    };
  }, [note, addToast, allowSourceContentMutation, pageFrameCollection, contractSession]);

  const saveDraftBlockPlacement = useCallback(async (
    block: NoteBlock,
    layout: BlockBoxLayout,
    _clientCreateKey: string,
    requestedNoteId: string,
  ): Promise<NoteBlock | null> => {
    const requestGeneration = routeRequestGenerationRef.current;
    const requestIsCurrent = () => (
      routeRequestGenerationMatches(
        { noteId: routeNoteIdRef.current, generation: routeRequestGenerationRef.current },
        { noteId: requestedNoteId, generation: requestGeneration },
      )
      && noteRef.current?.id === requestedNoteId
    );
    try {
      const savedLayout = await saveBlockCanvasPlacementForNote({
        ...await resolveCanvasPlacementWriteContext({
          noteId: requestedNoteId, loadedNoteId: note?.id, pageFrameCollection, contractSession,
        }),
        noteId: requestedNoteId,
        block,
        layout,
      });
      const placed = { ...block, canvas_layout: savedLayout.layout };
      if (requestIsCurrent()) {
        const textFlow = getTextFlowContent(placed.content_json);
        setBlocks((current) => [...current.filter((item) => item.id !== placed.id), placed]
          .sort((left, right) => left.order_index - right.order_index));
        setBlockTextDrafts((current) => ({ ...current, [placed.id]: textFromContent(placed).trimEnd() }));
        if (textFlow) {
          setBlockTextFlowDrafts((current) => ({ ...current, [placed.id]: textFlow }));
        }
      }
      return placed;
    } catch (err) {
      if (requestIsCurrent()) {
        console.error('Failed to retry draft block placement:', err);
        addToast('error', 'Block placement is still pending');
      }
      return null;
    }
  }, [addToast, note?.id, pageFrameCollection, contractSession]);

  const finalizeDraftBlock = useCallback(async (
    receipt: DraftRecoveryReceipt,
  ): Promise<boolean> => {
    const body = receipt.text.trimEnd();
    const contentJson = receipt.contentJson || contentForTemplate(receipt.template, body);
    const presentationKind = presentationKindForTemplate(receipt.template, true);
    try {
      await finalizeDraftRecoveryReceipt(receipt, {
        createOrReuse: async (pendingReceipt) => {
          const response = await api.post(`/notes/${pendingReceipt.noteId}/blocks`, {
            block_type: pendingReceipt.template.legacy_block_type,
            content_json: contentJson,
            plain_text: plainTextForBlockContent(presentationKind, contentJson, body),
            metadata: metadataForTemplateOption(pendingReceipt.template),
            client_create_key: pendingReceipt.clientCreateKey,
          });
          return hydrateClientBlock(response.data);
        },
        savePlacement: async (durableBlock, pendingReceipt) => {
          await saveBlockCanvasPlacementForNote({
            ...await resolveCanvasPlacementWriteContext({
              noteId: pendingReceipt.noteId, loadedNoteId: note?.id, pageFrameCollection, contractSession,
            }),
            noteId: pendingReceipt.noteId,
            block: durableBlock,
            layout: pendingReceipt.layout,
          });
        },
        saveLatest: async (durableBlock) => {
          await api.put(`/note-blocks/${durableBlock.id}`, {
            content_json: contentJson,
            plain_text: plainTextForBlockContent(presentationKind, contentJson, body),
          });
        },
      });
      recoveryFailureNotifiedKeysRef.current.delete(receipt.clientCreateKey);
      return true;
    } catch (err) {
      console.error('Failed to finish draft for previous note:', err);
      if (!recoveryFailureNotifiedKeysRef.current.has(receipt.clientCreateKey)) {
        recoveryFailureNotifiedKeysRef.current.add(receipt.clientCreateKey);
        addToast('error', 'A previous-note draft is queued for recovery');
      }
      return false;
    }
  }, [addToast, note?.id, pageFrameCollection, contractSession]);

  useEffect(() => {
    const recoveryQueue = loadDraftRecoveryQueue();
    recoveryQueue.blocked.forEach((blocked) => {
      const notificationKey = blocked.clientCreateKey
        || `${blocked.storageKey}:${blocked.reason}`;
      if (recoveryFailureNotifiedKeysRef.current.has(notificationKey)) return;
      recoveryFailureNotifiedKeysRef.current.add(notificationKey);
      addToast('error', 'A previous-note draft needs attention and remains queued');
    });
    const receipts = recoveryQueue.replayable
      .filter((receipt) => !replayingRecoveryKeysRef.current.has(receipt.clientCreateKey));
    if (receipts.length === 0) return;
    receipts.forEach((receipt) => replayingRecoveryKeysRef.current.add(receipt.clientCreateKey));
    void replayDraftRecoveryReceipts(
      receipts,
      finalizeDraftBlock,
      forgetDraftRecoveryReceipt,
    ).finally(() => {
      receipts.forEach((receipt) => replayingRecoveryKeysRef.current.delete(receipt.clientCreateKey));
    });
  }, [addToast, finalizeDraftBlock]);

  const discardDraftBlock = useCallback(async (
    requestedNoteId: string,
    clientCreateKey: string,
  ): Promise<boolean> => {
    const requestGeneration = routeRequestGenerationRef.current;
    const requestIsCurrent = () => (
      routeRequestGenerationMatches(
        { noteId: routeNoteIdRef.current, generation: routeRequestGenerationRef.current },
        { noteId: requestedNoteId, generation: requestGeneration },
      )
      && noteRef.current?.id === requestedNoteId
    );
    try {
      const response = await api.post(`/notes/${requestedNoteId}/blocks/discard-client-create`, {
        client_create_key: clientCreateKey,
      });
      const blockId = typeof response.data?.block_id === 'string' ? response.data.block_id : null;
      if (blockId && requestIsCurrent()) {
        setBlocks((current) => current.filter((block) => block.id !== blockId));
        setBlockTextDrafts((current) => {
          const next = { ...current };
          delete next[blockId];
          return next;
        });
        setBlockTextFlowDrafts((current) => {
          const next = { ...current };
          delete next[blockId];
          return next;
        });
        setBlockFieldDrafts((current) => {
          const next = { ...current };
          delete next[blockId];
          return next;
        });
      }
      return Boolean(response.data?.discarded || response.data?.canceled);
    } catch (err) {
      if (requestIsCurrent()) {
        console.error('Failed to discard client-created draft block:', err);
        addToast('error', 'Empty draft cleanup could not be confirmed');
      }
      return false;
    }
  }, [addToast]);

  const saveBlock = useCallback(async (
    block: NoteBlock,
    text: string,
    options: {
      silent?: boolean;
      fieldValues?: FieldValueRecord;
      textFlow?: TextBlockContentV1;
      recoveryKey?: string;
    } = {},
  ): Promise<BlockSaveOutcome> => {
    if (!allowSourceContentMutation()) {
      return {
        status: 'rejected',
        block: null,
        recoveryReceipt: null,
        reconciliation: 'not_attempted',
        durableState: 'not_checked',
        reason: 'mutation_not_allowed',
        staleEpoch: false,
      };
    }
    const requestedNoteId = noteRef.current?.id || null;
    if (!requestedNoteId || routeNoteIdRef.current !== requestedNoteId) {
      console.error('Failed to save block: route receipt is unavailable');
      addToast('error', 'Failed to save block');
      return {
        status: 'rejected',
        block: null,
        recoveryReceipt: null,
        reconciliation: 'not_attempted',
        durableState: 'not_checked',
        reason: 'route_receipt_unavailable',
        staleEpoch: false,
      };
    }
    const requestGeneration = routeRequestGenerationRef.current;
    const requestHydrationEpoch = successfulHydrationEpochRef.current;
    const requestRouteIsCurrent = () => (
      adapterMountActiveRef.current
      && routeRequestGenerationMatches(
        { noteId: routeNoteIdRef.current, generation: routeRequestGenerationRef.current },
        { noteId: requestedNoteId, generation: requestGeneration },
      )
      && noteRef.current?.id === requestedNoteId
    );
    const requestIsCurrent = () => (
      requestRouteIsCurrent()
      && successfulHydrationEpochRef.current === requestHydrationEpoch
    );
    const textFlowDraft = options.textFlow || blockTextFlowDrafts[block.id];
    const projectedTextFlow = textFlowDraft
      ? projectTextFlowContent({ [TEXT_FLOW_CONTENT_KEY]: textFlowDraft }, text).plain_text
      : null;
    const nextText = textFlowDraft
      ? (projectedTextFlow ?? text)
      : text.trimEnd();
    const previousText = textFromContent(block).trimEnd();
    const fieldValues = options.fieldValues || blockFieldDrafts[block.id];
    if (nextText === previousText && !fieldValues && !textFlowDraft) {
      if (options.recoveryKey) forgetBlockEditRecoveryReceipt(options.recoveryKey);
      return {
        status: 'saved',
        block,
        recoveryReceipt: null,
        reconciliation: 'not_needed',
      };
    }
    const kind = presentationKindForBlock(block);
    const textFlowContent = textFlowDraft
      ? contentForEditedTextFlowBlock(block, textFlowDraft)
      : null;
    const nextContent = textFlowContent
      ? kind === 'formula' && fieldValues
        ? contentForEditedBlock({ ...block, content_json: textFlowContent }, nextText, fieldValues)
        : textFlowContent
      : contentForEditedBlock(block, nextText, fieldValues);
    const requestedPlainText = plainTextForBlockContent(kind, nextContent, nextText);
    const operationSequence = blockSaveOperationSequenceRef.current + 1;
    blockSaveOperationSequenceRef.current = operationSequence;
    const recoveryReceipt: BlockEditRecoveryReceipt = Object.freeze({
      version: 2,
      kind: 'block_edit_recovery',
      recoveryKey: createBlockEditRecoveryKey(
        requestedNoteId,
        block.id,
        requestGeneration,
        operationSequence,
        blockEditRecoveryMountNonce,
      ),
      noteId: requestedNoteId,
      requestedNoteId,
      mountNonce: blockEditRecoveryMountNonce,
      creationGeneration: requestGeneration,
      operationSequence,
      blockId: block.id,
      text: nextText,
      plainText: requestedPlainText,
      contentJson: nextContent,
      textFlow: textFlowDraft,
      fieldValues,
      hydrationEpoch: requestHydrationEpoch,
      queuedAt: new Date().toISOString(),
    });
    if (!rememberBlockEditRecoveryReceipt(recoveryReceipt)) {
      console.error('Failed to save block: recovery receipt is unavailable');
      addToast('error', 'Failed to preserve the block edit for recovery');
      return {
        status: 'rejected',
        block: null,
        recoveryReceipt,
        reconciliation: 'not_attempted',
        durableState: 'not_checked',
        reason: 'recovery_receipt_unavailable',
        staleEpoch: false,
      };
    }
    const operationIsLatest = () => (
      latestBlockSaveOperationByBlockRef.current.get(block.id) === operationSequence
    );
    const hasOtherOutstandingOperationForBlock = () => Array.from(
      outstandingBlockSaveOperationsRef.current.entries(),
    ).some(([sequence, operation]) => (
      sequence !== operationSequence
      && operation.blockId === block.id
      && operation.requestedNoteId === requestedNoteId
    ));
    const reconcileIssuedSave = async (
      successKind: 'read_after_outcome' | 'read_after_error',
    ): Promise<{
      block: NoteBlock | null;
      reconciliation: 'read_after_outcome' | 'read_after_error' | 'read_failed';
      durableState: Exclude<BlockSaveDurableState, 'not_checked'>;
    }> => {
      const reconciliationHydrationEpoch = successfulHydrationEpochRef.current;
      const reconciliationOperationSequence = blockSaveOperationSequenceRef.current;
      const reconciliationOutcomeVersion = blockSaveOutcomeVersionRef.current;
      const reconciliationReadIsCurrent = () => (
        requestRouteIsCurrent()
        && successfulHydrationEpochRef.current === reconciliationHydrationEpoch
        && blockSaveOperationSequenceRef.current === reconciliationOperationSequence
        && blockSaveOutcomeVersionRef.current === reconciliationOutcomeVersion
      );
      try {
        const blocksRes = await api.get(`/notes/${requestedNoteId}/blocks`);
        const rawBlock = Array.isArray(blocksRes.data)
          ? blocksRes.data.find((item: { id?: string }) => item?.id === block.id)
          : null;
        const observedBlock = rawBlock
          ? hydrateClientBlock({
            ...rawBlock,
            source_references: Array.isArray(rawBlock.source_references)
              ? rawBlock.source_references
              : block.source_references,
          })
          : null;
        if (!reconciliationReadIsCurrent()) {
          return { block: null, reconciliation: 'read_failed', durableState: 'read_failed' };
        }
        if (observedBlock && operationIsLatest()) {
          setBlocks((current) => current.some((item) => item.id === block.id)
            ? current.map((item) => item.id === block.id ? observedBlock : item)
            : [...current, observedBlock]);
        }
        return {
          block: observedBlock,
          reconciliation: successKind,
          durableState: !observedBlock
            ? 'missing'
            : blockMatchesIssuedSave(observedBlock, requestedPlainText, nextContent)
              ? 'matches_requested'
              : 'conflict',
        };
      } catch (reconciliationError) {
        console.error('Failed to reconcile block save outcome:', reconciliationError);
        if (requestRouteIsCurrent()) {
          addToast('error', 'Block save result could not be reconciled');
        }
        return { block: null, reconciliation: 'read_failed', durableState: 'read_failed' };
      }
    };

    latestBlockSaveOperationByBlockRef.current.set(block.id, operationSequence);
    outstandingBlockSaveOperationsRef.current.set(operationSequence, {
      blockId: block.id,
      requestedNoteId,
      creationGeneration: requestGeneration,
    });
    setSavingBlockId(block.id);
    try {
      const res = await api.put(`/note-blocks/${block.id}`, {
        content_json: nextContent,
        plain_text: requestedPlainText,
      });
      blockSaveOutcomeVersionRef.current += 1;
      if (!requestIsCurrent() || !operationIsLatest()) {
        const reconciliation = await reconcileIssuedSave('read_after_outcome');
        if (reconciliation.durableState === 'matches_requested') {
          forgetBlockEditRecoveryReceipt(recoveryReceipt.recoveryKey);
          if (options.recoveryKey && options.recoveryKey !== recoveryReceipt.recoveryKey) {
            forgetBlockEditRecoveryReceipt(options.recoveryKey);
          }
        }
        const reason = !requestRouteIsCurrent()
          ? 'route_receipt_stale'
          : successfulHydrationEpochRef.current !== requestHydrationEpoch
            ? 'hydration_epoch_advanced'
            : 'superseded_operation';
        console.warn('Block save completed outside its hydration receipt:', {
          blockId: block.id,
          noteId: requestedNoteId,
          reason,
          requestHydrationEpoch,
          activeHydrationEpoch: successfulHydrationEpochRef.current,
        });
        if (requestRouteIsCurrent()) {
          addToast(
            'info',
            reconciliation.durableState === 'matches_requested'
              ? 'Block save crossed a newer state; durable result reconciled'
              : 'Block save crossed a newer state; pending edit retained',
          );
        }
        return {
          status: 'stale_epoch',
          block: reconciliation.block,
          recoveryReceipt,
          reconciliation: reconciliation.reconciliation === 'read_after_outcome'
            ? 'read_after_outcome'
            : 'read_failed',
          durableState: reconciliation.durableState,
          reason,
        };
      }
      const updated = hydrateClientBlock({ ...block, ...res.data, source_references: block.source_references });
      setBlocks((current) => current.map((item) => item.id === block.id ? updated : item));
      setBlockTextDrafts((current) => ({ ...current, [block.id]: nextText }));
      if (textFlowDraft) {
        setBlockTextFlowDrafts((current) => ({ ...current, [block.id]: textFlowDraft }));
      }
      setBlockFieldDrafts((current) => {
        const next = { ...current };
        delete next[block.id];
        return next;
      });
      if (!options.silent) addToast('success', 'Block saved');
      if (!hasOtherOutstandingOperationForBlock()) {
        forgetBlockEditRecoveryReceipt(recoveryReceipt.recoveryKey);
        if (options.recoveryKey && options.recoveryKey !== recoveryReceipt.recoveryKey) {
          forgetBlockEditRecoveryReceipt(options.recoveryKey);
        }
      }
      return {
        status: 'saved',
        block: updated,
        recoveryReceipt: null,
        reconciliation: 'response',
      };
    } catch (err) {
      blockSaveOutcomeVersionRef.current += 1;
      console.error('Failed to save block:', err);
      if (requestIsCurrent()) addToast('error', 'Failed to save block');
      const reconciliation = await reconcileIssuedSave('read_after_error');
      if (
        reconciliation.durableState === 'matches_requested'
        && !hasOtherOutstandingOperationForBlock()
      ) {
        forgetBlockEditRecoveryReceipt(recoveryReceipt.recoveryKey);
        if (options.recoveryKey && options.recoveryKey !== recoveryReceipt.recoveryKey) {
          forgetBlockEditRecoveryReceipt(options.recoveryKey);
        }
      }
      return {
        status: 'rejected',
        block: reconciliation.block,
        recoveryReceipt,
        reconciliation: reconciliation.reconciliation === 'read_after_error'
          ? 'read_after_error'
          : 'read_failed',
        durableState: reconciliation.durableState,
        reason: 'request_failed',
        error: err,
        staleEpoch: !requestIsCurrent(),
      };
    } finally {
      outstandingBlockSaveOperationsRef.current.delete(operationSequence);
      if (requestRouteIsCurrent()) {
        const activeRoute = {
          noteId: routeNoteIdRef.current,
          generation: routeRequestGenerationRef.current,
        };
        const latestOutstandingOperation = Array.from(
          outstandingBlockSaveOperationsRef.current.entries(),
        ).filter(([, operation]) => routeRequestGenerationMatches(activeRoute, {
          noteId: operation.requestedNoteId,
          generation: operation.creationGeneration,
        })).sort(([left], [right]) => right - left)[0];
        setSavingBlockId(latestOutstandingOperation?.[1].blockId || null);
      }
    }
  }, [
    addToast,
    allowSourceContentMutation,
    blockEditRecoveryMountNonce,
    blockFieldDrafts,
    blockTextFlowDrafts,
  ]);

  const applyBlockEditRecovery = useCallback(async (recoveryKey: string): Promise<boolean> => {
    const activeNoteId = noteRef.current?.id || null;
    if (!activeNoteId || routeNoteIdRef.current !== activeNoteId) return false;
    const receipt = listBlockEditRecoveryReceipts(activeNoteId)
      .find((candidate) => candidate.recoveryKey === recoveryKey);
    if (!receipt) return false;
    const block = blocks.find((candidate) => candidate.id === receipt.blockId);
    if (!block) {
      addToast('error', 'The block for this recovery receipt is unavailable');
      return false;
    }
    const outcome = await saveBlock(block, receipt.text, {
      silent: true,
      fieldValues: receipt.fieldValues,
      textFlow: receipt.textFlow,
      recoveryKey: receipt.recoveryKey,
    });
    const applied = outcome.status === 'saved'
      || ('durableState' in outcome && outcome.durableState === 'matches_requested');
    if (applied && routeNoteIdRef.current === activeNoteId) {
      addToast('success', 'Recovered block edit applied');
    }
    return applied;
  }, [addToast, blocks, saveBlock]);

  const dismissBlockEditRecovery = useCallback((recoveryKey: string): boolean => {
    const activeNoteId = noteRef.current?.id || null;
    if (!activeNoteId || routeNoteIdRef.current !== activeNoteId) return false;
    const receipt = listBlockEditRecoveryReceipts(activeNoteId)
      .find((candidate) => candidate.recoveryKey === recoveryKey);
    if (!receipt || !forgetBlockEditRecoveryReceipt(receipt.recoveryKey)) return false;
    setBlockTextDrafts((current) => {
      const next = { ...current };
      if (next[receipt.blockId] === receipt.text) delete next[receipt.blockId];
      return next;
    });
    setBlockTextFlowDrafts((current) => {
      const draft = current[receipt.blockId];
      if (
        !draft
        || !receipt.textFlow
        || JSON.stringify(canonicalJsonValue(draft))
          !== JSON.stringify(canonicalJsonValue(receipt.textFlow))
      ) return current;
      const next = { ...current };
      delete next[receipt.blockId];
      return next;
    });
    setBlockFieldDrafts((current) => {
      const draft = current[receipt.blockId];
      if (
        !draft
        || !receipt.fieldValues
        || JSON.stringify(canonicalJsonValue(draft))
          !== JSON.stringify(canonicalJsonValue(receipt.fieldValues))
      ) return current;
      const next = { ...current };
      delete next[receipt.blockId];
      return next;
    });
    addToast('info', 'Block edit recovery dismissed');
    return true;
  }, [addToast, setBlockFieldDrafts, setBlockTextDrafts, setBlockTextFlowDrafts]);

  const applyTemplateToBlock = useCallback(async (
    block: NoteBlock,
    template: TemplateOption,
    text: string,
    options: {
      title?: string | null;
      contentJson?: Record<string, unknown>;
      metadataPatch?: Record<string, unknown>;
    } = {},
  ) => {
    if (!allowSourceContentMutation()) return null;
    const requestedNoteId = noteRef.current?.id || null;
    if (!requestedNoteId || routeNoteIdRef.current !== requestedNoteId) {
      console.error('Failed to convert block: route receipt is unavailable');
      addToast('error', 'Failed to convert block');
      return null;
    }
    const requestGeneration = routeRequestGenerationRef.current;
    const requestHydrationEpoch = successfulHydrationEpochRef.current;
    const requestRouteIsCurrent = () => (
      adapterMountActiveRef.current
      && routeRequestGenerationMatches(
        { noteId: routeNoteIdRef.current, generation: routeRequestGenerationRef.current },
        { noteId: requestedNoteId, generation: requestGeneration },
      )
      && noteRef.current?.id === requestedNoteId
    );
    const requestIsCurrent = () => (
      requestRouteIsCurrent()
      && successfulHydrationEpochRef.current === requestHydrationEpoch
    );
    const nextText = text.trimEnd();
    const recoveryKeysAtCreation = listBlockEditRecoveryReceipts(requestedNoteId)
      .filter((receipt) => receipt.blockId === block.id)
      .map((receipt) => receipt.recoveryKey);
    const operationSequence = blockSaveOperationSequenceRef.current + 1;
    blockSaveOperationSequenceRef.current = operationSequence;
    latestBlockSaveOperationByBlockRef.current.set(block.id, operationSequence);
    outstandingBlockSaveOperationsRef.current.set(operationSequence, {
      blockId: block.id,
      requestedNoteId,
      creationGeneration: requestGeneration,
    });
    setSavingBlockId(block.id);
    try {
      const metadata = {
        ...metadataForTemplateOption(template),
        ...(options.metadataPatch || {}),
      };
      const nextContent = options.contentJson || contentForTemplate(template, nextText);
      const nextKind = presentationKindForTemplate(template);
      const res = await api.put(`/note-blocks/${block.id}`, {
        block_type: template.legacy_block_type,
        title: options.title ?? block.title,
        content_json: nextContent,
        plain_text: plainTextForBlockContent(nextKind, nextContent, nextText),
        metadata,
      });
      blockSaveOutcomeVersionRef.current += 1;
      const updated = hydrateClientBlock({ ...block, ...res.data, source_references: block.source_references });
      if (
        !requestIsCurrent()
        || latestBlockSaveOperationByBlockRef.current.get(block.id) !== operationSequence
      ) return null;
      setBlocks((current) => current.map((item) => item.id === block.id ? updated : item));
      setBlockTextDrafts((current) => ({ ...current, [block.id]: nextText }));
      recoveryKeysAtCreation.forEach((recoveryKey) => {
        forgetBlockEditRecoveryReceipt(recoveryKey);
      });
      addToast('success', `Converted to ${template.label}`);
      return updated;
    } catch (err) {
      blockSaveOutcomeVersionRef.current += 1;
      console.error('Failed to convert block:', err);
      if (requestIsCurrent()) addToast('error', 'Failed to convert block');
      return null;
    } finally {
      outstandingBlockSaveOperationsRef.current.delete(operationSequence);
      if (requestRouteIsCurrent()) {
        const activeRoute = {
          noteId: routeNoteIdRef.current,
          generation: routeRequestGenerationRef.current,
        };
        const latestOutstandingOperation = Array.from(
          outstandingBlockSaveOperationsRef.current.entries(),
        ).filter(([, operation]) => routeRequestGenerationMatches(activeRoute, {
          noteId: operation.requestedNoteId,
          generation: operation.creationGeneration,
        })).sort(([left], [right]) => right - left)[0];
        setSavingBlockId(latestOutstandingOperation?.[1].blockId || null);
      }
    }
  }, [addToast, allowSourceContentMutation]);

  const refreshTrayState = useCallback(async (changedBlockIds: string[] = []) => {
    if (!note) return;
    const [blocksResponse, persistence] = await Promise.all([
      api.get(`/notes/${note.id}/blocks`),
      loadCanvasPersistenceForNote({ note, importLegacy: false, contractSession }),
    ]);
    if (routeNoteIdRef.current !== note.id) return;
    setBlocks(applyCanvasLayoutsToBlocks(blocksResponse.data, persistence.blockLayouts, {
      pageFrameCollection: persistence.pageFrameCollection,
      coordinateContract: persistence.coordinateContract,
    }));
    setPersistedCanvasObjects(persistence.canvasObjects);
    setPersistedCanvasPlacements(persistence.canvasPlacements);
    setPersistedContentMounts(persistence.contentMounts);
    changedBlockIds.forEach(clearLayoutDraftForBlock);
  }, [clearLayoutDraftForBlock, contractSession, note]);

  const persistBlockLayout = useCallback(async (block: NoteBlock, layout: BlockBoxLayout) => {
    if (!note) return;
    if (!allowSourceContentMutation()) return;
    try {
      const savedLayout = await saveBlockCanvasPlacementForNote({
        ...await resolveCanvasPlacementWriteContext({
          noteId: note.id, loadedNoteId: note?.id, pageFrameCollection, contractSession,
        }),
        noteId: note.id,
        block,
        layout,
      });
      setBlocks((current) => current.map((item) => (
        item.id === block.id
          ? { ...item, canvas_layout: savedLayout.layout }
          : item
      )));
      clearLayoutDraftForBlock(block.id);
    } catch (err) {
      console.error('Failed to save block layout:', err);
      addToast('error', 'Failed to save block layout');
    }
  }, [note, addToast, allowSourceContentMutation, clearLayoutDraftForBlock, pageFrameCollection, contractSession]);

  const updateBlockPolicy = useCallback(async (
    block: NoteBlock,
    layout: BlockBoxLayout,
    patch: Pick<BlockBoxLayout, 'export_role'> | Pick<BlockBoxLayout, 'ai_visibility'>,
  ) => {
    const nextLayout = { ...layout, ...patch };
    setLayoutDraftForBlock(block.id, nextLayout);
    await persistBlockLayout(block, nextLayout);
  }, [persistBlockLayout, setLayoutDraftForBlock]);

  const toggleBlockExportRole = useCallback((block: NoteBlock, layout: BlockBoxLayout) => {
    const current = getEffectiveExportRole(layout);
    const nextRole: ExportRole = current === 'included' ? 'excluded' : 'included';
    void updateBlockPolicy(block, layout, { export_role: nextRole });
  }, [updateBlockPolicy]);

  const toggleBlockAIVisibility = useCallback((block: NoteBlock, layout: BlockBoxLayout) => {
    const current = getEffectiveAIVisibility(layout);
    const nextVisibility: AIVisibility = current === 'visible' ? 'hidden' : 'visible';
    void updateBlockPolicy(block, layout, { ai_visibility: nextVisibility });
  }, [updateBlockPolicy]);

  const trashBlock = useCallback(async (
    blockId: string,
    options: { silent?: boolean } = {},
  ): Promise<boolean> => {
    if (!allowSourceContentMutation()) return false;
    try {
      await api.delete(`/note-blocks/${blockId}`);
      setBlocks((current) => current.filter((block) => block.id !== blockId));
      setBlockTextDrafts((current) => {
        const next = { ...current };
        delete next[blockId];
        return next;
      });
      setBlockTextFlowDrafts((current) => {
        const next = { ...current };
        delete next[blockId];
        return next;
      });
      setBlockFieldDrafts((current) => {
        const next = { ...current };
        delete next[blockId];
        return next;
      });
      if (!options.silent) addToast('success', 'Block moved to trash');
      return true;
    } catch (err) {
      console.error('Failed to trash block:', err);
      if (!options.silent) addToast('error', 'Failed to trash block');
      return false;
    }
  }, [addToast, allowSourceContentMutation]);

  const forgetBlockLocally = useCallback((blockId: string): void => {
    setBlocks((current) => current.filter((block) => block.id !== blockId));
    setBlockTextDrafts((current) => {
      const next = { ...current };
      delete next[blockId];
      return next;
    });
    setBlockTextFlowDrafts((current) => {
      const next = { ...current };
      delete next[blockId];
      return next;
    });
    setBlockFieldDrafts((current) => {
      const next = { ...current };
      delete next[blockId];
      return next;
    });
  }, []);

  const restoreBlockById = useCallback(async (
    blockId: string,
    options: { silent?: boolean; metadataPatch?: Record<string, unknown> } = {},
  ): Promise<NoteBlock | null> => {
    if (!allowSourceContentMutation()) return null;
    try {
      const payload: { status: 'active'; metadata?: Record<string, unknown> } = { status: 'active' };
      if (options.metadataPatch) payload.metadata = options.metadataPatch;
      const res = await api.put(`/note-blocks/${blockId}`, payload);
      const restored = hydrateClientBlock(res.data);
      setBlocks((current) => (
        [...current.filter((item) => item.id !== restored.id), restored]
          .sort((a, b) => a.order_index - b.order_index)
      ));
      setBlockTextDrafts((current) => ({
        ...current,
        [restored.id]: textFromContent(restored).trimEnd(),
      }));
      setBlockTextFlowDrafts((current) => {
        const next = { ...current };
        delete next[restored.id];
        return next;
      });
      setBlockFieldDrafts((current) => {
        const next = { ...current };
        delete next[restored.id];
        return next;
      });
      if (!options.silent) addToast('success', 'Block restored');
      return restored;
    } catch (err) {
      console.error('Failed to restore block:', err);
      if (!options.silent) addToast('error', 'Failed to restore block');
      return null;
    }
  }, [addToast, allowSourceContentMutation]);

  const restoreBlock = useCallback(async (
    block: NoteBlock,
    options: { silent?: boolean } = {},
  ): Promise<NoteBlock | null> => {
    if (!allowSourceContentMutation()) return null;
    try {
      const res = await api.put(`/note-blocks/${block.id}`, { status: 'active' });
      const restored = hydrateClientBlock({
        ...block,
        ...res.data,
        source_references: block.source_references,
      });
      setBlocks((current) => (
        [...current.filter((item) => item.id !== restored.id), restored]
          .sort((a, b) => a.order_index - b.order_index)
      ));
      setBlockTextDrafts((current) => ({
        ...current,
        [restored.id]: textFromContent(restored).trimEnd(),
      }));
      setBlockTextFlowDrafts((current) => {
        const next = { ...current };
        delete next[restored.id];
        return next;
      });
      setBlockFieldDrafts((current) => {
        const next = { ...current };
        delete next[restored.id];
        return next;
      });
      if (!options.silent) addToast('success', 'Block restored');
      return restored;
    } catch (err) {
      console.error('Failed to restore block:', err);
      if (!options.silent) addToast('error', 'Failed to restore block');
      return null;
    }
  }, [addToast, allowSourceContentMutation]);

  const persistCanvasObject = useCallback(async ({
    canvasObject,
    placement,
    contentMounts = [],
    visualConnector = null,
    imageObject = null,
    structuredObject = null,
    payload,
  }: PersistCanvasObjectInput): Promise<boolean> => {
    const currentNote = noteRef.current || note;
    if (!currentNote) return false;
    if (!allowSourceContentMutation()) return false;
    const previousObjects = persistedCanvasObjects;
    const previousPlacements = persistedCanvasPlacements;
    const previousMounts = persistedContentMounts;
    const previousConnectors = persistedVisualConnectors;
    const previousImages = persistedImageObjects;
    const previousStructured = persistedStructuredObjects;
    setPersistedCanvasObjects((current) => upsertCanvasObject(current, canvasObject));
    setPersistedCanvasPlacements((current) => upsertCanvasPlacement(current, placement));
    setPersistedContentMounts((current) => replaceContentMountsForObject(
      current,
      canvasObject.objectId,
      contentMounts,
    ));
    if (visualConnector) {
      setPersistedVisualConnectors((current) => upsertVisualConnector(current, visualConnector));
    }
    if (imageObject) {
      setPersistedImageObjects((current) => upsertImageObject(current, imageObject));
    }
    if (structuredObject) {
      setPersistedStructuredObjects((current) => upsertStructuredObject(current, structuredObject));
    }
    try {
      const writeContext = await resolveCanvasPlacementWriteContext({
        noteId: currentNote.id, loadedNoteId: note?.id, pageFrameCollection, contractSession,
      });
      const saved = await saveGenericCanvasObjectForNote({
        ...writeContext,
        noteId: currentNote.id,
        objectId: canvasObject.objectId,
        payload,
      });
      const savedRecord = recordFromUnknown(saved);
      const savedPlacement = savedRecord.placement ? [savedRecord.placement] : [];
      const savedVisualConnector = savedRecord.visualConnector ? [savedRecord.visualConnector] : [];
      const savedImageObject = savedRecord.imageObject ? [savedRecord.imageObject] : [];
      const savedStructuredObject = savedRecord.structuredObject ? [savedRecord.structuredObject] : [];
      const normalized = normalizeCanvasPersistencePayload({
        canvasObjects: savedRecord.canvasObject ? [savedRecord.canvasObject] : [],
        canvasPlacements: Array.isArray(savedRecord.placements) ? savedRecord.placements : savedPlacement,
        contentMounts: Array.isArray(savedRecord.contentMounts) ? savedRecord.contentMounts : [],
        visualConnectors: Array.isArray(savedRecord.visualConnectors)
          ? savedRecord.visualConnectors
          : savedVisualConnector,
        imageObjects: Array.isArray(savedRecord.imageObjects)
          ? savedRecord.imageObjects
          : savedImageObject,
        structuredObjects: Array.isArray(savedRecord.structuredObjects)
          ? savedRecord.structuredObjects
          : savedStructuredObject,
      }, writeContext.coordinateContract, writeContext.pageFrameCollection?.pageFrames || []);
      const nextObject = normalized.canvasObjects[0] || canvasObject;
      const nextPlacement = normalized.canvasPlacements[0] || placement;
      const nextVisualConnector = normalized.visualConnectors[0] || visualConnector;
      const nextImageObject = normalized.imageObjects[0] || imageObject;
      const nextStructuredObject = normalized.structuredObjects[0] || structuredObject;
      setPersistedCanvasObjects((current) => upsertCanvasObject(current, nextObject));
      setPersistedCanvasPlacements((current) => upsertCanvasPlacement(current, nextPlacement));
      setPersistedContentMounts((current) => replaceContentMountsForObject(
        current,
        nextObject.objectId,
        normalized.contentMounts,
      ));
      if (nextVisualConnector) {
        setPersistedVisualConnectors((current) => upsertVisualConnector(current, nextVisualConnector));
      }
      if (nextImageObject) {
        setPersistedImageObjects((current) => upsertImageObject(current, nextImageObject));
      }
      if (nextStructuredObject) {
        setPersistedStructuredObjects((current) => upsertStructuredObject(current, nextStructuredObject));
      }
      return true;
    } catch (err) {
      console.error('Failed to save CanvasObject:', err);
      addToast('error', 'Failed to save canvas object');
      setPersistedCanvasObjects(previousObjects);
      setPersistedCanvasPlacements(previousPlacements);
      setPersistedContentMounts(previousMounts);
      setPersistedVisualConnectors(previousConnectors);
      setPersistedImageObjects(previousImages);
      setPersistedStructuredObjects(previousStructured);
      return false;
    }
  }, [
    addToast,
    allowSourceContentMutation,
    contractSession,
    pageFrameCollection,
    note,
    persistedCanvasObjects,
    persistedCanvasPlacements,
    persistedContentMounts,
    persistedImageObjects,
    persistedStructuredObjects,
    persistedVisualConnectors,
  ]);

  const deleteCanvasObject = useCallback(async (objectId: string): Promise<boolean> => {
    const currentNote = noteRef.current || note;
    if (!currentNote) return false;
    if (!allowSourceContentMutation()) return false;
    const previousObjects = persistedCanvasObjects;
    const previousPlacements = persistedCanvasPlacements;
    const previousMounts = persistedContentMounts;
    const previousConnectors = persistedVisualConnectors;
    const previousImages = persistedImageObjects;
    const previousStructured = persistedStructuredObjects;
    const removedObjectIds = new Set([
      objectId,
      ...persistedVisualConnectors
        .filter((connector) => (
          connector.objectId === objectId
          || connector.startObjectId === objectId
          || connector.endObjectId === objectId
        ))
        .map((connector) => connector.objectId),
    ]);
    setPersistedCanvasObjects((current) => current.filter((item) => !removedObjectIds.has(item.objectId)));
    setPersistedCanvasPlacements((current) => current.filter((item) => !removedObjectIds.has(item.objectId)));
    setPersistedContentMounts((current) => current.filter((item) => !removedObjectIds.has(item.objectId)));
    setPersistedVisualConnectors((current) => current.filter((item) => !removedObjectIds.has(item.objectId)));
    setPersistedImageObjects((current) => current.filter((item) => !removedObjectIds.has(item.objectId)));
    setPersistedStructuredObjects((current) => current.filter((item) => !removedObjectIds.has(item.objectId)));
    try {
      await deleteGenericCanvasObjectForNote({
        noteId: currentNote.id,
        objectId,
      });
      return true;
    } catch (err) {
      console.error('Failed to delete CanvasObject:', err);
      addToast('error', 'Failed to delete canvas object');
      setPersistedCanvasObjects(previousObjects);
      setPersistedCanvasPlacements(previousPlacements);
      setPersistedContentMounts(previousMounts);
      setPersistedVisualConnectors(previousConnectors);
      setPersistedImageObjects(previousImages);
      setPersistedStructuredObjects(previousStructured);
      return false;
    }
  }, [
    addToast,
    allowSourceContentMutation,
    note,
    persistedCanvasObjects,
    persistedCanvasPlacements,
    persistedContentMounts,
    persistedImageObjects,
    persistedStructuredObjects,
    persistedVisualConnectors,
  ]);

  const moveBlock = useCallback(async (placementId: string, direction: -1 | 1) => {
    if (!note) return;
    if (!allowSourceContentMutation()) return;
    const current = sortedBlocks.findIndex((block) => block.placement_id === placementId);
    const target = current + direction;
    if (current < 0 || target < 0 || target >= sortedBlocks.length) return;

    const reordered = [...sortedBlocks];
    [reordered[current], reordered[target]] = [reordered[target], reordered[current]];
    const placements = reordered.map((block, index) => ({
      placement_id: block.placement_id,
      order_index: index,
    }));

    try {
      await api.put(`/notes/${note.id}/blocks/reorder`, { placements });
      setBlocks(reordered.map((block, index) => ({ ...block, order_index: index })));
    } catch (err) {
      console.error('Failed to reorder blocks:', err);
      addToast('error', 'Failed to reorder blocks');
    }
  }, [note, sortedBlocks, addToast, allowSourceContentMutation]);

  const handleViewSource = useCallback(async (anchorId: string) => {
    setSourceJumpBusy(anchorId);
    try {
      const res = await api.get(`/source-anchors/${anchorId}/jump-target`);
      setSourceJumpTarget(res.data);
    } catch (err: any) {
      console.error('Failed to open source anchor:', err);
      addToast('error', err?.response?.data?.error || 'Failed to open source');
    } finally {
      setSourceJumpBusy(null);
    }
  }, [addToast]);

  return {
    note,
    coordinateContract,
    sourceProjectionPolicy,
    blocks,
    sortedBlocks,
    loading,
    titleDraft,
    setTitleDraft,
    templateWarning,
    savingBlockId,
    blockEditRecoveryReceipts,
    annotationTruths,
    contentGroups,
    groupFolders,
    purposeFrames,
    pageFrameCollection,
    persistedCanvasObjects,
    persistedCanvasPlacements,
    persistedContentMounts,
    persistedVisualConnectors,
    persistedImageObjects,
    persistedStructuredObjects,
    documentTypographyProfile,
    anchorsBySourceRef,
    sourceJumpTarget,
    setSourceJumpTarget,
    sourceJumpBusy,
    readingInterpretations,
    annotationProposals,
    blockTextDrafts,
    setBlockTextDrafts,
    blockTextFlowDrafts,
    setBlockTextFlowDrafts,
    blockFieldDrafts,
    setBlockFieldDrafts,
    readBlockDraftSnapshot,
    templateOptions,
    defaultTextTemplate,
    insertTemplateOptions,
    saveTitle,
    saveAnnotationTruths,
    saveContentGroups,
    saveGroupFolders,
    savePurposeFrames,
    savePageFrameCollection,
    persistCanvasObject,
    deleteCanvasObject,
    saveDocumentTypographyProfile,
    saveReadingInterpretations,
    saveAnnotationProposals,
    createBlock,
    createDraftBlock,
    discardDraftBlock,
    finalizeDraftBlock,
    saveBlock,
    applyBlockEditRecovery,
    dismissBlockEditRecovery,
    saveDraftBlockPlacement,
    applyTemplateToBlock,
    persistBlockLayout,
    refreshTrayState,
    toggleBlockExportRole,
    toggleBlockAIVisibility,
    trashBlock,
    forgetBlockLocally,
    restoreBlock,
    restoreBlockById,
    moveBlock,
    handleViewSource,
  };
}
