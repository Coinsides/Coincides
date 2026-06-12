import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type CSSProperties,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CornerDownLeft,
  Eye,
  FileText,
  Info,
  LayoutDashboard,
  MoreHorizontal,
  PanelTopClose,
  PanelTopOpen,
  Plus,
  Star,
  X,
} from 'lucide-react';
import api from '@/services/api';
import {
  loadRuntimeTemplateOptions,
  metadataForTemplateOption,
  STATIC_TEMPLATE_OPTIONS,
  type TemplateOption,
} from '@/services/templateOptions';
import { useUIStore } from '@/stores/uiStore';
import {
  detectSlashTrigger,
  filterSlashCommands,
  findTemplateForCommand,
  removeSlashTrigger,
  type NoteSlashCommand,
  type SlashTrigger,
} from '../noteSlashCommands';
import {
  buildNoteCanvasRuntimeModel,
} from './engineModel';
import {
  combinedDefinitionText,
  contentForEditedBlock,
  contentForTemplate,
  plainTextForBlockContent,
  presentationKindForBlock,
  stringValue,
  textFromContent,
  type BlockPresentationKind,
  type FieldValueRecord,
} from './blockContentService';
import { useNoteCanvasRuntime } from './hooks/useNoteCanvasRuntime';
import { BlockEditorLayer } from './layers/BlockEditorLayer';
import { ExportPreviewLayer } from './layers/ExportPreviewLayer';
import { SlashMenuLayer } from './layers/SlashMenuLayer';
import {
  attachWindowPointerSession,
  draggingBlockInteraction,
  editingTextInteraction,
  calculateDraggedBlockLayouts,
  calculateResizedBlockLayouts,
  idleInteraction,
  openingMenuInteraction,
  previewingInteraction,
  resizingBlockInteraction,
  selectedBlockInteraction,
} from './interactionController';
import {
  applyMeasuredBlockHeightToLayouts,
  estimateTextBlockHeight,
  resizeTextareaToContent,
} from './measurementService';
import {
  createBlankDraftLayout,
  createSurfaceModePolicy,
  getNextSurfaceMode,
  getVisibleBlocksForSurface,
  shouldResolvePageCollisions,
  shouldUseElasticAvoidance,
} from './modePolicyService';
import {
  calculatePageFrameHeight,
  createDefaultDraftLayout,
  createRuntimePageFrame,
} from './pageFrameService';
import {
  applyMoveSnap,
  buildDefaultBlockLayouts,
  buildLayoutHistoryEntry,
  buildLayoutPayload,
  getBoundaryKind,
  getEffectiveAIVisibility,
  getEffectiveExportRole,
  layoutsEqual,
  normalizeBlockLayout,
  writeLayoutOverride,
} from './placementService';
import { buildExportPreviewModel } from './exportPreviewService';
import { getSlashMenuAnchor } from './overlayService';
import {
  DEFAULT_BLOCK_HEIGHT,
  DEFAULT_PAGE_CONTENT_WIDTH,
  LAYOUT_MEASURE_SUPPRESSION_MS,
  MIN_BLOCK_HEIGHT,
  MIN_BLOCK_WIDTH,
  NOTE_LAYOUT_KEY,
  type AIVisibility,
  type BlockBoxLayout,
  type ExportRole,
  type LayoutHistoryEntry,
  type SnapGuide,
  type SlashMenuAnchor,
  type SurfaceMode,
} from './runtimeLayout';
import type { BlockPlacementModel } from './types';
import type {
  Note,
  NoteBlock,
  SourceAnchor,
  SourceJumpTarget,
} from './runtimeDataTypes';
import {
  createRuntimeViewport,
  createRuntimeWorld,
} from './viewportService';
import styles from '../NoteDetail.module.css';

type SlashTarget = {
  target: 'draft' | 'block';
  blockId?: string;
  trigger: SlashTrigger;
  anchor: SlashMenuAnchor | null;
};

type TemplateCategoryKey = 'default' | 'math' | 'userDefined';

const INSERT_TEMPLATE_CATEGORIES: Array<{ key: TemplateCategoryKey; label: string }> = [
  { key: 'default', label: 'Default' },
  { key: 'math', label: 'Math' },
  { key: 'userDefined', label: 'User Defined' },
];

const DEFAULT_INSERT_TEMPLATE_KEYS = [
  'text.paragraph',
  'text.heading',
  'source.quote',
  'definition.basic',
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

function buildInsertTemplateGroups(options: TemplateOption[]): Array<{
  key: TemplateCategoryKey;
  label: string;
  templates: TemplateOption[];
}> {
  const groups = {
    default: pickTemplatesByKey(options, DEFAULT_INSERT_TEMPLATE_KEYS),
    math: pickTemplatesByKey(options, MATH_INSERT_TEMPLATE_KEYS),
    userDefined: options.filter(isUserDefinedTemplate),
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
    metadata: raw?.metadata && typeof raw.metadata === 'object' ? raw.metadata : {},
    source_references: Array.isArray(raw?.source_references)
      ? raw.source_references.filter((ref: unknown) => ref !== null)
      : [],
  };
}

function isFormulaLikeBlock(block: NoteBlock): boolean {
  const templateKey = typeof block.metadata?.template_key === 'string' ? block.metadata.template_key : '';
  const templateId = typeof block.metadata?.template_id === 'string' ? block.metadata.template_id : '';
  const legacyTemplateId = typeof block.metadata?.legacy_template_id === 'string' ? block.metadata.legacy_template_id : '';
  return block.block_type === 'formula'
    || templateKey.includes('formula')
    || templateId.includes('formula')
    || legacyTemplateId.includes('formula');
}

function shouldShowPreview(block: NoteBlock, text: string): boolean {
  return isFormulaLikeBlock(block) && text.trim().length > 0;
}

function isEditableDomTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

function estimateBlockHeightForText(block: NoteBlock, text: string, width: number): number {
  return estimateTextBlockHeight({
    text,
    width,
    title: block.title,
    showPreview: shouldShowPreview(block, text),
    sourceReferenceCount: block.source_references?.length || 0,
  });
}

function estimateBlockHeight(block: NoteBlock, width: number): number {
  return estimateBlockHeightForText(block, textFromContent(block), width);
}

export default function NoteCanvasRuntime() {
  const { noteId } = useNoteCanvasRuntime();
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);

  const [note, setNote] = useState<Note | null>(null);
  const [blocks, setBlocks] = useState<NoteBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [titleDraft, setTitleDraft] = useState('');
  const [newTemplateId, setNewTemplateId] = useState('text.paragraph');
  const [templateOptions, setTemplateOptions] = useState<TemplateOption[]>(STATIC_TEMPLATE_OPTIONS);
  const [templateWarning, setTemplateWarning] = useState<string | null>(null);
  const [newBlockText, setNewBlockText] = useState('');
  const [savingBlockId, setSavingBlockId] = useState<string | null>(null);
  const [anchorsBySourceRef, setAnchorsBySourceRef] = useState<Record<string, SourceAnchor>>({});
  const [sourceJumpTarget, setSourceJumpTarget] = useState<SourceJumpTarget | null>(null);
  const [sourceJumpBusy, setSourceJumpBusy] = useState<string | null>(null);
  const [draftActive, setDraftActive] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [draftFocusNonce, setDraftFocusNonce] = useState(0);
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [blockTextDrafts, setBlockTextDrafts] = useState<Record<string, string>>({});
  const [slashTarget, setSlashTarget] = useState<SlashTarget | null>(null);
  const [chromeCollapsed, setChromeCollapsed] = useState(false);
  const [showAdvancedInsert, setShowAdvancedInsert] = useState(false);
  const [showNoteInfo, setShowNoteInfo] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [showExportPreview, setShowExportPreview] = useState(false);
  const [showPreviewBlockTypes, setShowPreviewBlockTypes] = useState(false);
  const [showPreviewAIVisibility, setShowPreviewAIVisibility] = useState(false);
  const [showPreviewExportStatus, setShowPreviewExportStatus] = useState(false);
  const [layoutMode, setLayoutMode] = useState(false);
  const [surfaceMode, setSurfaceMode] = useState<SurfaceMode>('page');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [layoutDrafts, setLayoutDrafts] = useState<Record<string, BlockBoxLayout>>({});
  const [blockFieldDrafts, setBlockFieldDrafts] = useState<Record<string, FieldValueRecord>>({});
  const [draftLayout, setDraftLayout] = useState<BlockBoxLayout | null>(null);
  const [contentWidth, setContentWidth] = useState(DEFAULT_PAGE_CONTENT_WIDTH);
  const [snapGuide, setSnapGuide] = useState<SnapGuide | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [interactionState, setInteractionState] = useState(idleInteraction());

  const draftRef = useRef<HTMLTextAreaElement | null>(null);
  const draftTextRef = useRef('');
  const creatingDraftRef = useRef(false);
  const blockListRef = useRef<HTMLDivElement | null>(null);
  const movingBlockIdRef = useRef<string | null>(null);
  const suppressMeasuredReflowUntilRef = useRef(0);
  const layoutUndoStackRef = useRef<LayoutHistoryEntry[]>([]);
  const layoutRedoStackRef = useRef<LayoutHistoryEntry[]>([]);

  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => a.order_index - b.order_index),
    [blocks],
  );

  const defaultTextTemplate = useMemo(
    () => templateOptions.find((template) => template.template_key === 'text.paragraph')
      || templateOptions.find((template) => template.template_id === 'text.paragraph')
      || templateOptions[0]
      || STATIC_TEMPLATE_OPTIONS[0],
    [templateOptions],
  );

  const insertTemplateGroups = useMemo(
    () => buildInsertTemplateGroups(templateOptions),
    [templateOptions],
  );

  const insertTemplateOptions = useMemo(
    () => insertTemplateGroups.flatMap((group) => group.templates),
    [insertTemplateGroups],
  );

  const slashCommands = useMemo(() => (
    slashTarget
      ? filterSlashCommands(slashTarget.trigger.query).map((command) => (
        findTemplateForCommand(command, insertTemplateOptions)
          ? command
          : { ...command, disabledReason: `${command.label} is not enabled in this notebook build yet.` }
      ))
      : []
  ), [slashTarget, insertTemplateOptions]);

  const sourceReferenceCount = useMemo(
    () => sortedBlocks.reduce((total, block) => total + block.source_references.length, 0),
    [sortedBlocks],
  );

  const surfacePolicy = useMemo(
    () => createSurfaceModePolicy(surfaceMode),
    [surfaceMode],
  );

  const visibleBlocks = useMemo(
    () => getVisibleBlocksForSurface(sortedBlocks, surfacePolicy, contentWidth),
    [sortedBlocks, surfacePolicy, contentWidth],
  );

  const blockLayouts = useMemo(() => {
    const defaults = buildDefaultBlockLayouts(visibleBlocks, contentWidth, estimateBlockHeight);
    const resolvedLayouts = visibleBlocks.reduce<Record<string, BlockBoxLayout>>((acc, block) => {
      const draft = layoutDrafts[block.id];
      acc[block.id] = draft || normalizeBlockLayout({
        block,
        fallback: defaults[block.id],
        contentWidth,
        surfaceMode,
        estimateHeight: estimateBlockHeight,
      });
      return acc;
    }, {});
    return resolvedLayouts;
  }, [visibleBlocks, contentWidth, layoutDrafts, surfaceMode]);

  const pageOffsetX = surfacePolicy.pageOffsetX;

  const defaultDraftLayout = useMemo(() => {
    return createDefaultDraftLayout(blockLayouts, contentWidth);
  }, [blockLayouts, contentWidth]);

  const pageContentHeight = useMemo(() => {
    return calculatePageFrameHeight({
      blockLayouts,
      draftActive,
      draftLayout,
      defaultDraftLayout,
    });
  }, [blockLayouts, draftActive, draftLayout, defaultDraftLayout]);

  const primaryPageFrame = useMemo(
    () => createRuntimePageFrame({
      x: pageOffsetX,
      height: pageContentHeight,
    }),
    [pageContentHeight, pageOffsetX],
  );

  const canvasBlockPlacements = useMemo<BlockPlacementModel[]>(
    () => visibleBlocks.flatMap((block) => {
      const layout = blockLayouts[block.id];
      if (!layout) return [];
      const boundary = getBoundaryKind(layout);
      return [{
        blockId: block.id,
        x: layout.x + pageOffsetX,
        y: layout.y,
        width: layout.width,
        height: layout.height,
        rotation: layout.rotation || 0,
        surface: boundary === 'inside' ? 'formal_page' : 'canvas_workspace',
      }];
    }),
    [blockLayouts, pageOffsetX, visibleBlocks],
  );

  const noteCanvasRuntime = useMemo(() => {
    const viewport = createRuntimeViewport(surfaceMode, pageContentHeight);

    return buildNoteCanvasRuntimeModel({
      mode: surfaceMode,
      world: createRuntimeWorld(surfaceMode, pageContentHeight),
      primaryPageFrame,
      viewport,
      blockPlacements: canvasBlockPlacements,
    });
  }, [canvasBlockPlacements, pageContentHeight, primaryPageFrame, surfaceMode]);

  const exportPreview = useMemo(() => {
    return buildExportPreviewModel(visibleBlocks, blockLayouts);
  }, [visibleBlocks, blockLayouts]);

  const fetchNote = useCallback(async () => {
    if (!noteId) return;
    setLoading(true);
    try {
      const [noteRes, blocksRes] = await Promise.all([
        api.get(`/notes/${noteId}`),
        api.get(`/notes/${noteId}/blocks`),
      ]);
      setNote(noteRes.data);
      setTitleDraft(noteRes.data.title);
      setBlocks((blocksRes.data as any[]).map(hydrateClientBlock));
      setBlockTextDrafts({});
      setLayoutDrafts({});
      setSelectedBlockId(null);
      setInteractionState(idleInteraction());
      setDraftLayout(null);
    } catch (err) {
      console.error('Failed to load note:', err);
      addToast('error', 'Failed to load note');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  }, [noteId, addToast, navigate]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  useEffect(() => {
    if (insertTemplateOptions.length === 0) return;
    if (insertTemplateOptions.some((template) => template.template_id === newTemplateId)) return;
    setNewTemplateId(insertTemplateOptions[0].template_id);
  }, [insertTemplateOptions, newTemplateId]);

  useEffect(() => {
    let cancelled = false;
    loadRuntimeTemplateOptions().then(({ options, warning }) => {
      if (cancelled) return;
      setTemplateOptions(options);
      setTemplateWarning(warning);
      setNewTemplateId((current) => (
        buildInsertTemplateGroups(options)
          .flatMap((group) => group.templates)
          .some((template) => template.template_id === current)
          ? current
          : buildInsertTemplateGroups(options)[0]?.templates[0]?.template_id || 'text.paragraph'
      ));
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!draftActive) return;
    window.setTimeout(() => {
      draftRef.current?.focus();
      resizeTextareaToContent(draftRef.current);
    }, 0);
  }, [draftActive, draftFocusNonce]);

  useLayoutEffect(() => {
    resizeTextareaToContent(draftRef.current);
    if (!draftActive || !draftRef.current) return;
    const nextHeight = Math.max(DEFAULT_BLOCK_HEIGHT, draftRef.current.scrollHeight + 34);
    setDraftLayout((current) => (
      current && nextHeight > current.height + 2
        ? { ...current, height: nextHeight }
        : current
    ));
  }, [draftText, draftActive]);

  useLayoutEffect(() => {
    const updateContentWidth = () => {
      const width = blockListRef.current?.clientWidth;
      if (width && Number.isFinite(width)) {
        const availableWidth = surfaceMode === 'canvas' ? width - pageOffsetX : width;
        setContentWidth(Math.max(MIN_BLOCK_WIDTH, availableWidth));
      }
    };
    updateContentWidth();

    const element = blockListRef.current;
    const observer = typeof ResizeObserver !== 'undefined' && element
      ? new ResizeObserver(updateContentWidth)
      : null;
    observer?.observe(element as Element);

    window.addEventListener('resize', updateContentWidth);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateContentWidth);
    };
  }, [pageOffsetX, surfaceMode]);

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

  const saveTitle = async () => {
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
  };

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
      const nextKind: BlockPresentationKind = template.learning_role === 'definition'
        ? 'definition'
        : template.learning_role === 'formula'
          ? 'formula'
          : template.template_key === 'text.heading'
            ? 'heading'
            : template.template_key === 'code.snippet'
              ? 'code'
              : template.template_key === 'source.quote'
                ? 'sourceQuote'
                : 'paragraph';
      const res = await api.post(`/notes/${note.id}/blocks`, {
        block_type: template.legacy_block_type,
        title: options.title || undefined,
        content_json: nextContent,
        plain_text: plainTextForBlockContent(nextKind, nextContent, body),
        metadata,
        display_overrides_json: options.layout
          ? { [NOTE_LAYOUT_KEY]: buildLayoutPayload(options.layout) }
          : undefined,
      });
      const created = hydrateClientBlock(res.data);
      setBlocks((current) => [...current, created].sort((a, b) => a.order_index - b.order_index));
      setBlockTextDrafts((current) => ({ ...current, [created.id]: text.trimEnd() }));
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
    options: { silent?: boolean; fieldValues?: FieldValueRecord } = {},
  ): Promise<NoteBlock | null> => {
    const nextText = text.trimEnd();
    const previousText = textFromContent(block).trimEnd();
    const fieldValues = options.fieldValues || blockFieldDrafts[block.id];
    if (nextText === previousText && !fieldValues) return block;
    setSavingBlockId(block.id);
    try {
      const nextContent = contentForEditedBlock(block, nextText, fieldValues);
      const kind = presentationKindForBlock(block);
      const res = await api.put(`/note-blocks/${block.id}`, {
        content_json: nextContent,
        plain_text: plainTextForBlockContent(kind, nextContent, nextText),
      });
      const updated = hydrateClientBlock({ ...block, ...res.data, source_references: block.source_references });
      setBlocks((current) => current.map((item) => item.id === block.id ? updated : item));
      setBlockTextDrafts((current) => ({ ...current, [block.id]: nextText }));
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
  }, [addToast, blockFieldDrafts]);

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
      const nextKind: BlockPresentationKind = template.learning_role === 'definition'
        ? 'definition'
        : template.learning_role === 'formula'
          ? 'formula'
          : template.template_key === 'text.heading'
            ? 'heading'
            : 'paragraph';
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
      setFocusBlockId(block.id);
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
    const displayOverrides = writeLayoutOverride(block, layout);
    try {
      await api.put(`/notes/${note.id}/block-placements/${block.placement_id}`, {
        display_overrides_json: displayOverrides,
      });
      setBlocks((current) => current.map((item) => (
        item.id === block.id
          ? { ...item, display_overrides_json: displayOverrides }
          : item
      )));
      setLayoutDrafts((current) => {
        const next = { ...current };
        delete next[block.id];
        return next;
      });
    } catch (err) {
      console.error('Failed to save block layout:', err);
      addToast('error', 'Failed to save block layout');
    }
  }, [note, addToast]);

  const updateBlockPolicy = useCallback(async (
    block: NoteBlock,
    layout: BlockBoxLayout,
    patch: Pick<BlockBoxLayout, 'export_role'> | Pick<BlockBoxLayout, 'ai_visibility'>,
  ) => {
    const nextLayout = { ...layout, ...patch };
    setLayoutDrafts((current) => ({ ...current, [block.id]: nextLayout }));
    await persistBlockLayout(block, nextLayout);
  }, [persistBlockLayout]);

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

  const persistChangedBlockLayouts = useCallback((nextLayouts: Record<string, BlockBoxLayout>) => {
    Object.entries(nextLayouts).forEach(([blockId, nextLayout]) => {
      const previousLayout = blockLayouts[blockId];
      if (previousLayout && layoutsEqual(previousLayout, nextLayout)) return;
      const targetBlock = blocks.find((item) => item.id === blockId);
      if (!targetBlock) return;
      void persistBlockLayout(targetBlock, nextLayout);
    });
  }, [blocks, blockLayouts, persistBlockLayout]);

  const persistLayoutSnapshot = useCallback((layouts: Record<string, BlockBoxLayout>) => {
    Object.entries(layouts).forEach(([blockId, layout]) => {
      const targetBlock = blocks.find((item) => item.id === blockId);
      if (!targetBlock) return;
      void persistBlockLayout(targetBlock, layout);
    });
  }, [blocks, persistBlockLayout]);

  const pushLayoutHistory = useCallback((
    before: Record<string, BlockBoxLayout>,
    after: Record<string, BlockBoxLayout>,
  ) => {
    const entry = buildLayoutHistoryEntry(before, after);
    if (!entry) return;
    layoutUndoStackRef.current = [...layoutUndoStackRef.current, entry].slice(-60);
    layoutRedoStackRef.current = [];
  }, []);

  const undoLayoutHistory = useCallback(() => {
    const entry = layoutUndoStackRef.current.pop();
    if (!entry) return false;
    layoutRedoStackRef.current.push(entry);
    setLayoutDrafts((current) => ({ ...current, ...entry.before }));
    persistLayoutSnapshot(entry.before);
    return true;
  }, [persistLayoutSnapshot]);

  const redoLayoutHistory = useCallback(() => {
    const entry = layoutRedoStackRef.current.pop();
    if (!entry) return false;
    layoutUndoStackRef.current.push(entry);
    setLayoutDrafts((current) => ({ ...current, ...entry.after }));
    persistLayoutSnapshot(entry.after);
    return true;
  }, [persistLayoutSnapshot]);

  useEffect(() => {
    const handleLayoutHistoryKeys = (event: globalThis.KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || isEditableDomTarget(event.target)) return;
      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) {
        if (!undoLayoutHistory()) return;
        event.preventDefault();
        return;
      }
      if (key === 'y' || (key === 'z' && event.shiftKey)) {
        if (!redoLayoutHistory()) return;
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleLayoutHistoryKeys);
    return () => window.removeEventListener('keydown', handleLayoutHistoryKeys);
  }, [redoLayoutHistory, undoLayoutHistory]);

  const persistDraft = useCallback(async (
    initialText?: string,
    explicitTemplate?: TemplateOption,
  ) => {
    if (!note || creatingDraftRef.current) return;
    const template = explicitTemplate || defaultTextTemplate;
    const textToCreate = (initialText ?? draftTextRef.current).trimEnd();
    if (!template || (!textToCreate.trim() && !explicitTemplate)) return;

    creatingDraftRef.current = true;
    setCreatingDraft(true);
    try {
      const created = await createBlock(template, textToCreate, {
        layout: draftLayout || defaultDraftLayout,
        silent: true,
      });
      if (!created) return;

      const latestText = draftTextRef.current.trimEnd();
      if (latestText.trim() && latestText !== textToCreate) {
        await saveBlock(created, latestText, { silent: true });
      }

      setDraftText('');
      draftTextRef.current = '';
      setDraftActive(false);
      setDraftLayout(null);
      setSlashTarget(null);
      setFocusBlockId(created.id);
    } finally {
      creatingDraftRef.current = false;
      setCreatingDraft(false);
    }
  }, [note, defaultTextTemplate, draftLayout, defaultDraftLayout, createBlock, saveBlock]);

  const activateDraft = useCallback((layout?: BlockBoxLayout) => {
    setDraftLayout(layout || defaultDraftLayout);
    setDraftActive(true);
    setDraftFocusNonce((value) => value + 1);
    setActiveBlockId(null);
    setSelectedBlockId(null);
    setInteractionState(editingTextInteraction());
  }, [defaultDraftLayout]);

  const clearBlockSelection = useCallback(() => {
    setSelectedBlockId(null);
    setActiveBlockId(null);
    setFocusBlockId(null);
    setInteractionState(idleInteraction());
  }, []);

  const addBlock = async (): Promise<boolean> => {
    if (!newBlockText.trim()) return false;
    const selectedTemplate = insertTemplateOptions.find((template) => template.template_id === newTemplateId) || insertTemplateOptions[0];
    if (!selectedTemplate) return false;
    const created = await createBlock(selectedTemplate, newBlockText.trim());
    if (created) {
      setNewBlockText('');
      setFocusBlockId(created.id);
      return true;
    }
    return false;
  };

  const trashBlock = async (blockId: string) => {
    try {
      await api.delete(`/note-blocks/${blockId}`);
      setBlocks((current) => current.filter((block) => block.id !== blockId));
      setBlockTextDrafts((current) => {
        const next = { ...current };
        delete next[blockId];
        return next;
      });
      setBlockFieldDrafts((current) => {
        const next = { ...current };
        delete next[blockId];
        return next;
      });
      addToast('success', 'Block moved to trash');
    } catch (err) {
      console.error('Failed to trash block:', err);
      addToast('error', 'Failed to trash block');
    }
  };

  const moveBlock = async (placementId: string, direction: -1 | 1) => {
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
  };

  const handleViewSource = async (anchorId: string) => {
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
  };

  const updateSlashTarget = (
    target: SlashTarget['target'],
    text: string,
    caret: number,
    blockId?: string,
    anchorElement?: HTMLElement | null,
  ) => {
    const trigger = detectSlashTrigger(text, caret);
    setSlashTarget(trigger ? {
      target,
      blockId,
      trigger,
      anchor: getSlashMenuAnchor(anchorElement || null, blockListRef.current),
    } : null);
    setInteractionState(trigger
      ? openingMenuInteraction('slashMenu', blockId)
      : target === 'block'
        ? editingTextInteraction(blockId)
        : editingTextInteraction());
  };

  const handleDraftChange = (value: string, caret: number, anchorElement?: HTMLElement | null) => {
    setDraftText(value);
    draftTextRef.current = value;
    updateSlashTarget('draft', value, caret, undefined, anchorElement);
  };

  const handleBlockTextChange = (
    blockId: string,
    value: string,
    caret: number,
    anchorElement?: HTMLElement | null,
  ) => {
    setBlockTextDrafts((current) => ({ ...current, [blockId]: value }));
    updateSlashTarget('block', value, caret, blockId, anchorElement);
  };

  const handleSelectSlashCommand = async (command: NoteSlashCommand) => {
    if (!slashTarget) return;
    if (command.disabledReason) {
      addToast('info', command.disabledReason);
      return;
    }

    const template = findTemplateForCommand(command, templateOptions);
    if (!template) {
      addToast('error', `${command.label} template is not available`);
      return;
    }

    if (slashTarget.target === 'draft') {
      const cleanedText = removeSlashTrigger(draftTextRef.current, slashTarget.trigger);
      setSlashTarget(null);
      setDraftText(cleanedText);
      draftTextRef.current = cleanedText;
      await persistDraft(cleanedText, template);
      return;
    }

    const blockId = slashTarget.blockId;
    const block = blockId ? blocks.find((item) => item.id === blockId) : undefined;
    if (!block) return;

    const currentText = blockTextDrafts[block.id] ?? textFromContent(block);
    const cleanedText = removeSlashTrigger(currentText, slashTarget.trigger);
    setSlashTarget(null);
    setBlockTextDrafts((current) => ({ ...current, [block.id]: cleanedText }));

    if (!cleanedText.trim()) {
      await applyTemplateToBlock(block, template, cleanedText);
      return;
    }

    await applyTemplateToBlock(block, template, cleanedText);
  };

  const handleDraftKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape' && slashTarget?.target === 'draft') {
      event.preventDefault();
      setSlashTarget(null);
      return;
    }

    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault();
      void persistDraft(draftText);
    }
  };

  const handleBlockKeyDown = (block: NoteBlock, text: string, event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      if (slashTarget?.target === 'block') {
        event.preventDefault();
        setSlashTarget(null);
      }
      return;
    }

    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault();
      void saveBlock(block, text, { silent: true }).then(() => activateDraft());
    }
  };

  const beginMoveBlock = useCallback((
    event: ReactPointerEvent<HTMLElement>,
    block: NoteBlock,
    layout: BlockBoxLayout,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedBlockId(block.id);
    setInteractionState(draggingBlockInteraction(block.id));
    setLayoutMode(true);
    const startClientX = event.clientX;
    const startClientY = event.clientY;
    const startLayouts = { ...blockLayouts };
    let latestLayouts: Record<string, BlockBoxLayout> = startLayouts;
    movingBlockIdRef.current = block.id;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      setLayoutDrafts(() => {
        const deltaX = moveEvent.clientX - startClientX;
        const deltaY = moveEvent.clientY - startClientY;
        const result = calculateDraggedBlockLayouts({
          blockId: block.id,
          startLayouts,
          initialLayout: layout,
          deltaX,
          deltaY,
          contentWidth,
          snapEnabled,
          orderedBlockIds: visibleBlocks.map((item) => item.id),
          useElasticAvoidance: shouldUseElasticAvoidance({
            policy: surfacePolicy,
            snapEnabled,
            deltaY,
          }),
        });
        latestLayouts = result.layouts;
        setSnapGuide(result.guide);
        return latestLayouts;
      });
    };

    attachWindowPointerSession({
      onMove: handlePointerMove,
      onEnd: () => {
        suppressMeasuredReflowUntilRef.current = Date.now() + LAYOUT_MEASURE_SUPPRESSION_MS;
        movingBlockIdRef.current = null;
        setSnapGuide(null);
        setInteractionState(selectedBlockInteraction(block.id));
        pushLayoutHistory(startLayouts, latestLayouts);
        persistChangedBlockLayouts(latestLayouts);
      },
    });
  }, [blockLayouts, contentWidth, persistChangedBlockLayouts, pushLayoutHistory, snapEnabled, surfacePolicy, visibleBlocks]);

  const beginResizeBlock = useCallback((
    event: ReactPointerEvent<HTMLElement>,
    block: NoteBlock,
    text: string,
    layout: BlockBoxLayout,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedBlockId(block.id);
    setInteractionState(resizingBlockInteraction(block.id));
    setLayoutMode(true);
    const startClientX = event.clientX;
    let latestLayouts: Record<string, BlockBoxLayout> = blockLayouts;
    const startLayouts = { ...blockLayouts };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startClientX;
      setLayoutDrafts((current) => {
        const result = calculateResizedBlockLayouts({
          blockId: block.id,
          baseLayouts: blockLayouts,
          currentLayouts: current,
          initialLayout: layout,
          deltaX,
          contentWidth,
          snapEnabled,
          orderedBlockIds: visibleBlocks.map((item) => item.id),
          resolveCollisions: shouldResolvePageCollisions(surfacePolicy),
          estimateHeight: (width) => estimateBlockHeightForText(block, text, width),
        });
        latestLayouts = result.layouts;
        setSnapGuide(result.guide);
        return latestLayouts;
      });
    };

    attachWindowPointerSession({
      onMove: handlePointerMove,
      onEnd: () => {
        setSnapGuide(null);
        setInteractionState(selectedBlockInteraction(block.id));
        pushLayoutHistory(startLayouts, latestLayouts);
        persistChangedBlockLayouts(latestLayouts);
      },
    });
  }, [blockLayouts, contentWidth, persistChangedBlockLayouts, pushLayoutHistory, snapEnabled, surfacePolicy, visibleBlocks]);

  const handlePageSpaceClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const rawX = event.clientX - rect.left - pageOffsetX;
    const rawY = event.clientY - rect.top;
    activateDraft(createBlankDraftLayout({
      policy: surfacePolicy,
      snapEnabled,
      rawX,
      rawY,
      contentWidth,
      defaultDraftLayout,
    }));
  };

  const toggleSurfaceMode = () => {
    setSurfaceMode((current) => getNextSurfaceMode(current));
    setShowAdvancedInsert(false);
    setShowNoteInfo(false);
    setShowMoreActions(false);
    setShowExportPreview(false);
    setSnapGuide(null);
    clearBlockSelection();
  };

  const handleSurfacePointerDown = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('article, aside, button, input, textarea, select, [role="dialog"]')) return;
    clearBlockSelection();
  };

  if (loading || !note) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.chromeWrap}>
        {chromeCollapsed ? (
          <div className={styles.chromeCollapsed}>
            <button className={styles.backBtn} onClick={() => navigate(`/projects/${note.course_id}`)}>
              <ArrowLeft size={18} />
              Project
            </button>
            <button
              className={styles.iconBtn}
              onClick={() => setChromeCollapsed(false)}
              title="Show note tools"
              aria-label="Show note tools"
            >
              <PanelTopOpen size={16} />
            </button>
          </div>
        ) : (
          <div className={styles.noteChrome}>
            <button className={styles.backBtn} onClick={() => navigate(`/projects/${note.course_id}`)}>
              <ArrowLeft size={18} />
              Project
            </button>

            <input
              className={styles.titleInput}
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              onBlur={saveTitle}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                void saveTitle();
              }}
              aria-label="Note title"
            />

            <div className={styles.chromeActions}>
              <button
                className={`${styles.modePill} ${surfaceMode === 'canvas' ? styles.modePillActive : ''}`}
                onClick={toggleSurfaceMode}
                title={surfacePolicy.nextModeLabel}
                aria-pressed={surfaceMode === 'canvas'}
              >
                <FileText size={15} />
                {surfacePolicy.label}
              </button>
              <button
                className={`${styles.modePill} ${showExportPreview ? styles.modePillActive : ''}`}
                onClick={() => {
                  setShowAdvancedInsert(false);
                  setShowNoteInfo(false);
                  setShowMoreActions(false);
                  const nextPreviewState = !showExportPreview;
                  setShowExportPreview(nextPreviewState);
                  setInteractionState(nextPreviewState ? previewingInteraction() : idleInteraction());
                }}
                title="Preview export boundary"
                aria-pressed={showExportPreview}
              >
                <Eye size={15} />
                Preview
              </button>
              <button
                className={`${styles.modePill} ${layoutMode ? styles.modePillActive : ''}`}
                onClick={() => {
                  setSnapGuide(null);
                  setLayoutMode((value) => !value);
                }}
                title="Toggle layout mode"
                aria-pressed={layoutMode}
              >
                <LayoutDashboard size={15} />
                Layout
              </button>
              <button
                className={styles.iconBtn}
                onClick={() => addToast('info', 'Favorites will become persistent in a later Better Notebook patch')}
                title="Add to favorites"
                aria-label="Add to favorites"
              >
                <Star size={16} />
              </button>
              <button
                className={styles.iconBtn}
                onClick={() => {
                  setShowAdvancedInsert(false);
                  setShowExportPreview(false);
                  setShowMoreActions(false);
                  const nextNoteInfoState = !showNoteInfo;
                  setShowNoteInfo(nextNoteInfoState);
                  setInteractionState(nextNoteInfoState ? openingMenuInteraction('noteInfo') : idleInteraction());
                }}
                title="View info"
                aria-label="View info"
              >
                <Info size={16} />
              </button>
              <button
                className={styles.iconBtn}
                onClick={() => {
                  setShowAdvancedInsert(false);
                  setShowNoteInfo(false);
                  setShowExportPreview(false);
                  const nextMoreActionsState = !showMoreActions;
                  setShowMoreActions(nextMoreActionsState);
                  setInteractionState(nextMoreActionsState ? openingMenuInteraction('moreActions') : idleInteraction());
                }}
                title="More note actions"
                aria-label="More note actions"
              >
                <MoreHorizontal size={16} />
              </button>
              <button
                className={styles.iconBtn}
                onClick={() => {
                  setShowAdvancedInsert(false);
                  setShowNoteInfo(false);
                  setShowMoreActions(false);
                  setShowExportPreview(false);
                  setChromeCollapsed(true);
                }}
                title="Hide note tools"
                aria-label="Hide note tools"
              >
                <PanelTopClose size={16} />
              </button>
            </div>

            {showNoteInfo && (
              <div className={styles.infoPopover}>
                <div className={styles.popoverHeader}>
                  <div>
                    <div className={styles.popoverEyebrow}>Note info</div>
                    <strong>{note.title || 'Untitled note'}</strong>
                  </div>
                  <button className={styles.iconBtn} onClick={() => setShowNoteInfo(false)} title="Close">
                    <X size={15} />
                  </button>
                </div>
                <dl className={styles.infoGrid}>
                  <div>
                    <dt>Mode</dt>
                    <dd>{surfaceMode === 'page' ? 'Page' : 'Canvas'}</dd>
                  </div>
                  <div>
                    <dt>Blocks</dt>
                    <dd>{sortedBlocks.length}</dd>
                  </div>
                  <div>
                    <dt>Sources</dt>
                    <dd>{sourceReferenceCount}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{note.status}</dd>
                  </div>
                </dl>
                <p className={styles.popoverNote}>
                  Full source, relation, export, and history details will move into the Better Notebook inspector.
                </p>
              </div>
            )}

            {showMoreActions && (
              <div className={`${styles.infoPopover} ${styles.actionsPopover}`}>
                <div className={styles.popoverHeader}>
                  <div>
                    <div className={styles.popoverEyebrow}>Note actions</div>
                    <strong>More</strong>
                  </div>
                  <button className={styles.iconBtn} onClick={() => setShowMoreActions(false)} title="Close">
                    <X size={15} />
                  </button>
                </div>
                <button
                  className={styles.moreAction}
                  onClick={() => {
                    setSnapGuide(null);
                    setSnapEnabled((value) => !value);
                  }}
                >
                  <LayoutDashboard size={15} />
                  <span>Snap alignment</span>
                  <small>
                    {snapEnabled
                      ? 'On: moving and resizing can align to page and neighbor edges.'
                      : 'Off: moving and resizing use free placement.'}
                  </small>
                  <span className={`${styles.togglePill} ${snapEnabled ? styles.togglePillOn : styles.togglePillOff}`}>
                    {snapEnabled ? 'On' : 'Off'}
                  </span>
                </button>
                <p className={styles.popoverNote}>
                  Page settings, history, export, and inspector actions will live here as they become real.
                </p>
              </div>
            )}

            {showExportPreview && (
              <ExportPreviewLayer
                preview={exportPreview}
                showBlockTypes={showPreviewBlockTypes}
                showAIVisibility={showPreviewAIVisibility}
                showExportStatus={showPreviewExportStatus}
                onToggleBlockTypes={() => setShowPreviewBlockTypes((value) => !value)}
                onToggleAIVisibility={() => setShowPreviewAIVisibility((value) => !value)}
                onToggleExportStatus={() => setShowPreviewExportStatus((value) => !value)}
                onClose={() => {
                  setShowExportPreview(false);
                  setInteractionState(idleInteraction());
                }}
              />
            )}

          </div>
        )}
      </div>

      <div
        className={`${styles.documentShell} ${surfaceMode === 'canvas' ? styles.documentShellCanvas : ''}`}
        onMouseDown={handleSurfacePointerDown}
      >
        {templateWarning && <div className={styles.templateWarning}>{templateWarning}</div>}

        <div className={styles.pageToolRail} aria-label="Page tools">
          <button
            className={styles.pageToolBtn}
            onClick={() => {
              setShowNoteInfo(false);
              setShowMoreActions(false);
              const nextInsertState = !showAdvancedInsert;
              setShowAdvancedInsert(nextInsertState);
              setInteractionState(nextInsertState ? openingMenuInteraction('insert') : idleInteraction());
            }}
            title="Insert block"
            aria-label="Insert block"
          >
            <Plus size={16} />
            Insert
          </button>
        </div>

        {showAdvancedInsert && (
          <aside className={styles.insertPanel} aria-label="Advanced insert panel">
            <div className={styles.popoverHeader}>
              <div>
                <div className={styles.popoverEyebrow}>Block insert</div>
                <strong>Advanced insert</strong>
              </div>
              <button className={styles.iconBtn} onClick={() => setShowAdvancedInsert(false)} title="Close">
                <X size={15} />
              </button>
            </div>
            <p className={styles.popoverNote}>
              Use this when you want to pick a precise block type. The natural path is still clicking the page or typing /.
            </p>
            <div className={styles.addBlock}>
              <select
                className={styles.typeSelect}
                value={newTemplateId}
                onChange={(event) => setNewTemplateId(event.target.value)}
              >
                {insertTemplateGroups.map((group) => (
                  <optgroup key={group.key} label={group.label}>
                    {group.templates.map((template) => (
                      <option key={`${group.key}-${template.template_id}`} value={template.template_id}>
                        {template.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <textarea
                className={styles.newBlockText}
                value={newBlockText}
                onChange={(event) => setNewBlockText(event.target.value)}
                placeholder="Write the block content here."
              />
              <button
                className={styles.addBlockBtn}
                onClick={async () => {
                  const created = await addBlock();
                  if (created) setShowAdvancedInsert(false);
                }}
              >
                <Plus size={16} />
                Add block
              </button>
            </div>
          </aside>
        )}

        {sourceJumpTarget && (
          <div className={styles.sourceJumpPanel}>
            <div className={styles.sourceJumpHeader}>
              <div>
                <div className={styles.sourceJumpEyebrow}>Source snapshot</div>
                <div className={styles.sourceJumpTitle}>{sourceJumpTarget.snapshot.title}</div>
                <div className={styles.sourceJumpMeta}>
                  {sourceJumpTarget.snapshot.source_filename} - {sourceJumpTarget.page.page_label || `p.${sourceJumpTarget.page.page_number}`}
                </div>
              </div>
              <button
                className={styles.iconBtn}
                onClick={() => setSourceJumpTarget(null)}
                title="Close source"
              >
                <X size={16} />
              </button>
            </div>
            <div className={styles.sourceJumpPage}>
              <div className={styles.sourceJumpPageLabel}>
                Focused source page
                {sourceJumpTarget.focus.page_start ? ` ${sourceJumpTarget.focus.page_start}` : ''}
                {sourceJumpTarget.focus.page_end && sourceJumpTarget.focus.page_end !== sourceJumpTarget.focus.page_start ? `-${sourceJumpTarget.focus.page_end}` : ''}
              </div>
              <p>{sourceJumpTarget.page.text_content}</p>
            </div>
          </div>
        )}

        <section className={`${styles.writingSurface} ${surfaceMode === 'canvas' ? styles.writingSurfaceCanvas : styles.writingSurfacePage}`}>
          <div
            ref={blockListRef}
            className={`${styles.blockList} ${surfaceMode === 'canvas' ? styles.blockListCanvas : styles.blockListPage} ${layoutMode ? styles.layoutMode : ''}`}
            data-canvas-engine-version={noteCanvasRuntime.version}
            data-canvas-engine-route={noteCanvasRuntime.route}
            data-canvas-visible-blocks={noteCanvasRuntime.visibleBlockIds.length}
            data-canvas-page-frame={noteCanvasRuntime.primaryPageFrame?.id || 'none'}
            data-canvas-surface-mode={surfacePolicy.mode}
            data-canvas-interaction-mode={interactionState.mode}
            data-canvas-interaction-target={interactionState.target}
            data-canvas-interaction-block={interactionState.blockId || ''}
            style={{
              minHeight: pageContentHeight,
              '--formal-page-offset-x': `${pageOffsetX}px`,
              '--formal-page-width': `${primaryPageFrame.width}px`,
              '--canvas-world-width': `${noteCanvasRuntime.world.width}px`,
            } as CSSProperties}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) clearBlockSelection();
            }}
            onDoubleClick={handlePageSpaceClick}
          >
            {surfaceMode === 'canvas' && (
              <>
                <div className={styles.formalPageBoundary} style={{ minHeight: pageContentHeight }} />
                <div className={styles.scratchWorkspaceLabel}>Scratch workspace</div>
              </>
            )}
            {snapGuide?.x !== undefined && (
              <div className={styles.snapGuideVertical} style={{ left: snapGuide.x + pageOffsetX }} />
            )}
            {snapGuide?.y !== undefined && (
              <div className={styles.snapGuideHorizontal} style={{ top: snapGuide.y }} />
            )}
            {visibleBlocks.map((block) => {
              const text = blockTextDrafts[block.id] ?? textFromContent(block);
              const isActive = activeBlockId === block.id || focusBlockId === block.id || selectedBlockId === block.id;
              const layout = blockLayouts[block.id];
              return (
                  <BlockEditorLayer
                  key={block.id}
                  block={block}
                  text={text}
                  layout={layout}
                  fieldDraft={blockFieldDrafts[block.id]}
                  layoutMode={layoutMode}
                  saving={savingBlockId === block.id}
                  active={isActive}
                  autoFocus={focusBlockId === block.id}
                  onFocused={() => {
                    suppressMeasuredReflowUntilRef.current = Date.now() + LAYOUT_MEASURE_SUPPRESSION_MS;
                    setSelectedBlockId(block.id);
                    setActiveBlockId(block.id);
                    setFocusBlockId(null);
                    setInteractionState(editingTextInteraction(block.id));
                  }}
                  onTextChange={(value, caret, anchorElement) => handleBlockTextChange(block.id, value, caret, anchorElement)}
                  onFieldDraftChange={(fieldValues) => {
                    setBlockFieldDrafts((current) => ({ ...current, [block.id]: fieldValues }));
                    const nextText = presentationKindForBlock(block) === 'definition'
                      ? combinedDefinitionText(stringValue(fieldValues.concept_name), stringValue(fieldValues.description))
                      : presentationKindForBlock(block) === 'formula'
                        ? stringValue(fieldValues.latex_input)
                        : text;
                    setBlockTextDrafts((current) => ({ ...current, [block.id]: nextText }));
                  }}
                  onSave={(silent, fieldValues) => saveBlock(block, text, { silent, fieldValues })}
                  onTrash={() => trashBlock(block.id)}
                  onSelect={() => {
                    suppressMeasuredReflowUntilRef.current = Date.now() + LAYOUT_MEASURE_SUPPRESSION_MS;
                    setSelectedBlockId(block.id);
                    setActiveBlockId((current) => current === block.id ? current : null);
                    setFocusBlockId((current) => current === block.id ? current : null);
                    setInteractionState(selectedBlockInteraction(block.id));
                  }}
                  onBeginMove={(event) => beginMoveBlock(event, block, layout)}
                  onBeginResize={(event) => beginResizeBlock(event, block, text, layout)}
                  onToggleExportRole={() => toggleBlockExportRole(block, layout)}
                  onToggleAIVisibility={() => toggleBlockAIVisibility(block, layout)}
                  showBlockTypeBadge={showPreviewBlockTypes}
                  showAIStatusBadge={showPreviewAIVisibility}
                  showExportStatusBadge={showPreviewExportStatus}
                  onKeyDown={(event) => handleBlockKeyDown(block, text, event)}
                  onMeasuredHeight={(height) => {
                    const allowActiveFormulaReflow = isActive && presentationKindForBlock(block) === 'formula';
                    if (movingBlockIdRef.current) return;
                    if (!allowActiveFormulaReflow && Date.now() < suppressMeasuredReflowUntilRef.current) return;
                    setLayoutDrafts((current) => {
                      return applyMeasuredBlockHeightToLayouts({
                        currentLayouts: current,
                        baseLayouts: blockLayouts,
                        blockId: block.id,
                        fallbackLayout: layout,
                        measuredHeight: height,
                        orderedBlockIds: visibleBlocks.map((item) => item.id),
                        resolveCollisions: shouldResolvePageCollisions(surfacePolicy),
                      });
                    });
                  }}
                  pageOffsetX={pageOffsetX}
                  anchorsBySourceRef={anchorsBySourceRef}
                  sourceJumpBusy={sourceJumpBusy}
                  onViewSource={handleViewSource}
                />
              );
            })}

            {draftActive && (
              <div
                className={`${styles.block} ${styles.blockBox} ${styles.draftBlock}`}
                style={{
                  left: (draftLayout || defaultDraftLayout).x + pageOffsetX,
                  top: (draftLayout || defaultDraftLayout).y,
                  width: (draftLayout || defaultDraftLayout).width,
                  height: (draftLayout || defaultDraftLayout).height,
                }}
              >
                <textarea
                  ref={draftRef}
                  className={styles.pageTextArea}
                  value={draftText}
                  onChange={(event) => {
                    resizeTextareaToContent(event.currentTarget);
                    const nextHeight = Math.max(DEFAULT_BLOCK_HEIGHT, event.currentTarget.scrollHeight + 34);
                    setDraftLayout((current) => (
                      current ? { ...current, height: nextHeight } : current
                    ));
                    handleDraftChange(event.currentTarget.value, event.currentTarget.selectionStart, event.currentTarget);
                  }}
                  onBlur={() => {
                    if (slashTarget?.target === 'draft') return;
                    if (draftText.trim()) {
                      void persistDraft(draftText);
                    } else {
                      setDraftText('');
                      draftTextRef.current = '';
                      setDraftActive(false);
                      setDraftLayout(null);
                      setSlashTarget(null);
                      setInteractionState(idleInteraction());
                    }
                  }}
                  onKeyDown={handleDraftKeyDown}
                  placeholder={creatingDraft ? 'Saving block...' : 'Start writing, or type / for blocks'}
                  rows={1}
                />
                <div className={styles.draftHint}>
                  <CornerDownLeft size={13} />
                  Enter for a new line, Ctrl+Enter for the next block.
                </div>
              </div>
            )}

            {slashTarget && (
              <SlashMenuLayer
                commands={slashCommands}
                onSelect={handleSelectSlashCommand}
                anchor={slashTarget.anchor}
              />
            )}

            {!draftActive && sortedBlocks.length === 0 && (
              <button className={styles.emptyPagePrompt} onDoubleClick={() => activateDraft(defaultDraftLayout)}>
                Double-click to start writing
              </button>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
