import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
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
import {
  NOTE_ANNOTATION_PROPOSALS_METADATA_KEY,
  NOTE_READING_INTERPRETATIONS_METADATA_KEY,
} from '../contentGroupMetadataService';
import {
  annotationTruthsFromMetadata,
  loadAnnotationTruthsForNote,
  saveAnnotationTruthsForNote,
  stripLegacyAnnotationMetadata,
} from '../annotationTruthRepository';
import {
  applyCanvasLayoutsToBlocks,
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
  normalizeGroupFolders,
} from '../groupFolderService';
import {
  normalizePageFrameCollection,
} from '../pageFrameCollectionService';
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
  const [contentGroups, setContentGroups] = useState<ContentGroupV1[]>([]);
  const [groupFolders, setGroupFolders] = useState<GroupFolderV1[]>([]);
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
  const [blockTextDrafts, setBlockTextDrafts] = useState<Record<string, string>>({});
  const [blockTextFlowDrafts, setBlockTextFlowDrafts] = useState<Record<string, TextBlockContentV1>>({});
  const [blockFieldDrafts, setBlockFieldDrafts] = useState<Record<string, FieldValueRecord>>({});
  const noteRef = useRef<Note | null>(null);
  const annotationSaveGenerationRef = useRef(0);
  const contentGroupSaveGenerationRef = useRef(0);
  const pageFrameSaveGenerationRef = useRef(0);
  const typographyProfileSaveGenerationRef = useRef(0);

  useEffect(() => {
    noteRef.current = note;
  }, [note]);

  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => a.order_index - b.order_index),
    [blocks],
  );

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
    setLoading(true);
    try {
      const [noteRes, blocksRes] = await Promise.all([
        api.get(`/notes/${noteId}`),
        api.get(`/notes/${noteId}/blocks`),
      ]);
      const hydratedNote = noteRes.data as Note;
      const [savedContentGroups, savedGroupFolders, canvasPersistence, savedAnnotationTruths] = await Promise.all([
        loadContentGroupsForNote({ note: hydratedNote }),
        loadGroupFoldersForNote({ note: hydratedNote }),
        loadCanvasPersistenceForNote({ note: hydratedNote }),
        loadAnnotationTruthsForNote({ note: hydratedNote }),
      ]);
      const hydratedBlocks = applyCanvasLayoutsToBlocks(
        (blocksRes.data as any[]).map(hydrateClientBlock),
        canvasPersistence.blockLayouts,
      );
      const cleanMetadata = stripLegacyAnnotationMetadata(stripLegacyPageFrameMetadata(hydratedNote.metadata));
      let persistedNote = hydratedNote;
      if (metadataChanged(hydratedNote.metadata, cleanMetadata)) {
        const stripResponse = await api.put<Note>(`/notes/${hydratedNote.id}`, { metadata: cleanMetadata });
        persistedNote = stripResponse.data || { ...hydratedNote, metadata: cleanMetadata };
      }
      const noteForState: Note = { ...persistedNote, metadata: cleanMetadata };
      noteRef.current = noteForState;
      setNote(noteForState);
      setTitleDraft(noteRes.data.title);
      setAnnotationTruths(savedAnnotationTruths);
      setContentGroups(savedContentGroups);
      setGroupFolders(savedGroupFolders);
      setPageFrameCollection(canvasPersistence.pageFrameCollection);
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
      setBlockTextDrafts({});
      setBlockTextFlowDrafts({});
      setBlockFieldDrafts({});
      onNoteLoaded();
    } catch (err) {
      console.error('Failed to load note:', err);
      addToast('error', 'Failed to load note');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  }, [noteId, addToast, navigate, onNoteLoaded]);

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
    try {
      const res = await api.put(`/notes/${note.id}`, { title: nextTitle });
      setNote(res.data);
      setTitleDraft(res.data?.title || nextTitle);
      addToast('success', 'Note renamed');
    } catch (err) {
      console.error('Failed to rename note:', err);
      addToast('error', 'Failed to rename note');
    }
  }, [note, titleDraft, addToast]);

  const saveAnnotationTruths = useCallback(async (nextAnnotations: AnnotationTruthV1[]) => {
    const currentNote = noteRef.current || note;
    if (!currentNote) return;
    const previousAnnotations = annotationTruths;
    const saveGeneration = annotationSaveGenerationRef.current + 1;
    annotationSaveGenerationRef.current = saveGeneration;
    setAnnotationTruths(nextAnnotations);
    try {
      if (annotationSaveGenerationRef.current !== saveGeneration) return;
      const savedAnnotations = await saveAnnotationTruthsForNote({
        noteId: currentNote.id,
        annotations: nextAnnotations,
      });
      if (annotationSaveGenerationRef.current !== saveGeneration) return;
      setAnnotationTruths(savedAnnotations);
    } catch (err) {
      console.error('Failed to save annotations:', err);
      addToast('error', 'Failed to save annotation');
      if (annotationSaveGenerationRef.current !== saveGeneration) return;
      setAnnotationTruths(previousAnnotations);
    }
  }, [addToast, annotationTruths, note]);

  const saveContentGroups = useCallback(async (nextGroups: ContentGroupV1[]) => {
    const currentNote = noteRef.current || note;
    if (!currentNote) return;
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
      if (contentGroupSaveGenerationRef.current !== saveGeneration) return;
      setContentGroups(savedGroups);
    } catch (err) {
      console.error('Failed to save content groups:', err);
      addToast('error', 'Failed to save content group');
      if (contentGroupSaveGenerationRef.current !== saveGeneration) return;
      setContentGroups(previousGroups);
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

  const savePageFrameCollection = useCallback(async (nextCollection: PageFrameCollectionModel) => {
    const currentNote = noteRef.current || note;
    if (!currentNote) return;
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
  }, [addToast, note, pageFrameCollection]);

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
    const body = text.trimEnd();
    try {
      const metadata = {
        ...metadataForTemplateOption(template),
        ...(options.metadataPatch || {}),
      };
      const nextContent = options.contentJson || contentForTemplate(template, body);
      const nextKind = presentationKindForTemplate(template, true);
      const res = await api.post(`/notes/${note.id}/blocks`, {
        block_type: template.legacy_block_type,
        title: options.title || undefined,
        content_json: nextContent,
        plain_text: plainTextForBlockContent(nextKind, nextContent, body),
        metadata,
      });
      let created = hydrateClientBlock(res.data);
      if (options.layout) {
        const savedLayout = await saveBlockCanvasPlacementForNote({
          noteId: note.id,
          block: created,
          layout: options.layout,
        });
        created = { ...created, canvas_layout: savedLayout.layout };
      }
      const createdTextFlow = getTextFlowContent(nextContent);
      setBlocks((current) => [...current, created].sort((a, b) => a.order_index - b.order_index));
      setBlockTextDrafts((current) => ({ ...current, [created.id]: text.trimEnd() }));
      if (createdTextFlow) {
        setBlockTextFlowDrafts((current) => ({ ...current, [created.id]: createdTextFlow }));
      }
      if (!options.silent) addToast('success', 'Block added');
      return created;
    } catch (err) {
      console.error('Failed to create block:', err);
      addToast('error', 'Failed to create block');
      return null;
    }
  }, [note, addToast]);

  const saveBlock = useCallback(async (
    block: NoteBlock,
    text: string,
    options: { silent?: boolean; fieldValues?: FieldValueRecord; textFlow?: TextBlockContentV1 } = {},
  ): Promise<NoteBlock | null> => {
    const textFlowDraft = options.textFlow || blockTextFlowDrafts[block.id];
    const projectedTextFlow = textFlowDraft
      ? projectTextFlowContent({ [TEXT_FLOW_CONTENT_KEY]: textFlowDraft }, text).plain_text
      : null;
    const nextText = textFlowDraft
      ? (projectedTextFlow ?? text)
      : text.trimEnd();
    const previousText = textFromContent(block).trimEnd();
    const fieldValues = options.fieldValues || blockFieldDrafts[block.id];
    if (nextText === previousText && !fieldValues && !textFlowDraft) return block;
    setSavingBlockId(block.id);
    try {
      const nextContent = textFlowDraft
        ? contentForEditedTextFlowBlock(block, textFlowDraft)
        : contentForEditedBlock(block, nextText, fieldValues);
      const kind = presentationKindForBlock(block);
      const res = await api.put(`/note-blocks/${block.id}`, {
        content_json: nextContent,
        plain_text: plainTextForBlockContent(kind, nextContent, nextText),
      });
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
      return updated;
    } catch (err) {
      console.error('Failed to save block:', err);
      addToast('error', 'Failed to save block');
      return null;
    } finally {
      setSavingBlockId(null);
    }
  }, [addToast, blockFieldDrafts, blockTextFlowDrafts]);

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
    const nextText = text.trimEnd();
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
      const updated = hydrateClientBlock({ ...block, ...res.data, source_references: block.source_references });
      setBlocks((current) => current.map((item) => item.id === block.id ? updated : item));
      setBlockTextDrafts((current) => ({ ...current, [block.id]: nextText }));
      addToast('success', `Converted to ${template.label}`);
      return updated;
    } catch (err) {
      console.error('Failed to convert block:', err);
      addToast('error', 'Failed to convert block');
      return null;
    } finally {
      setSavingBlockId(null);
    }
  }, [addToast]);

  const persistBlockLayout = useCallback(async (block: NoteBlock, layout: BlockBoxLayout) => {
    if (!note) return;
    try {
      const savedLayout = await saveBlockCanvasPlacementForNote({
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
  }, [note, addToast, clearLayoutDraftForBlock]);

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
  }, [addToast]);

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
  }, [addToast]);

  const restoreBlock = useCallback(async (
    block: NoteBlock,
    options: { silent?: boolean } = {},
  ): Promise<NoteBlock | null> => {
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
  }, [addToast]);

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
      const saved = await saveGenericCanvasObjectForNote({
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
      });
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
  }, [note, sortedBlocks, addToast]);

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
    blocks,
    sortedBlocks,
    loading,
    titleDraft,
    setTitleDraft,
    templateWarning,
    savingBlockId,
    annotationTruths,
    contentGroups,
    groupFolders,
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
    templateOptions,
    defaultTextTemplate,
    insertTemplateOptions,
    saveTitle,
    saveAnnotationTruths,
    saveContentGroups,
    saveGroupFolders,
    savePageFrameCollection,
    persistCanvasObject,
    deleteCanvasObject,
    saveDocumentTypographyProfile,
    saveReadingInterpretations,
    saveAnnotationProposals,
    createBlock,
    saveBlock,
    applyTemplateToBlock,
    persistBlockLayout,
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
