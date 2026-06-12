import { useCallback, useEffect, useMemo, useState } from 'react';
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
  contentForTemplate,
  plainTextForBlockContent,
  presentationKindForBlock,
  textFromContent,
  type BlockPresentationKind,
  type FieldValueRecord,
} from '../blockContentService';
import {
  buildLayoutPayload,
  getEffectiveAIVisibility,
  getEffectiveExportRole,
  writeLayoutOverride,
} from '../placementService';
import type {
  AIVisibility,
  BlockBoxLayout,
  ExportRole,
} from '../runtimeLayout';
import { NOTE_LAYOUT_KEY } from '../runtimeLayout';
import type {
  Note,
  NoteBlock,
  SourceAnchor,
  SourceJumpTarget,
} from '../runtimeDataTypes';

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

export function buildInsertTemplateGroups(options: TemplateOption[]): InsertTemplateGroup[] {
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

function presentationKindForTemplate(template: TemplateOption, sourceQuote = false): BlockPresentationKind {
  if (template.learning_role === 'definition') return 'definition';
  if (template.learning_role === 'formula') return 'formula';
  if (template.template_key === 'text.heading') return 'heading';
  if (template.template_key === 'code.snippet') return 'code';
  if (sourceQuote && template.template_key === 'source.quote') return 'sourceQuote';
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
  const [newTemplateId, setNewTemplateId] = useState('text.paragraph');
  const [templateOptions, setTemplateOptions] = useState<TemplateOption[]>(STATIC_TEMPLATE_OPTIONS);
  const [templateWarning, setTemplateWarning] = useState<string | null>(null);
  const [newBlockText, setNewBlockText] = useState('');
  const [savingBlockId, setSavingBlockId] = useState<string | null>(null);
  const [anchorsBySourceRef, setAnchorsBySourceRef] = useState<Record<string, SourceAnchor>>({});
  const [sourceJumpTarget, setSourceJumpTarget] = useState<SourceJumpTarget | null>(null);
  const [sourceJumpBusy, setSourceJumpBusy] = useState<string | null>(null);
  const [blockTextDrafts, setBlockTextDrafts] = useState<Record<string, string>>({});
  const [blockFieldDrafts, setBlockFieldDrafts] = useState<Record<string, FieldValueRecord>>({});

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
      setNote(noteRes.data);
      setTitleDraft(noteRes.data.title);
      setBlocks((blocksRes.data as any[]).map(hydrateClientBlock));
      setBlockTextDrafts({});
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
    if (insertTemplateOptions.length === 0) return;
    if (insertTemplateOptions.some((template) => template.template_id === newTemplateId)) return;
    setNewTemplateId(insertTemplateOptions[0].template_id);
  }, [insertTemplateOptions, newTemplateId]);

  useEffect(() => {
    let cancelled = false;
    loadRuntimeTemplateOptions().then(({ options, warning }) => {
      if (cancelled) return;
      const groups = buildInsertTemplateGroups(options);
      setTemplateOptions(options);
      setTemplateWarning(warning);
      setNewTemplateId((current) => (
        groups
          .flatMap((group) => group.templates)
          .some((template) => template.template_id === current)
          ? current
          : groups[0]?.templates[0]?.template_id || 'text.paragraph'
      ));
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

  const addBlock = useCallback(async (): Promise<NoteBlock | null> => {
    if (!newBlockText.trim()) return null;
    const selectedTemplate = insertTemplateOptions.find((template) => template.template_id === newTemplateId) || insertTemplateOptions[0];
    if (!selectedTemplate) return null;
    const created = await createBlock(selectedTemplate, newBlockText.trim());
    if (created) {
      setNewBlockText('');
      return created;
    }
    return null;
  }, [createBlock, insertTemplateOptions, newBlockText, newTemplateId]);

  const trashBlock = useCallback(async (blockId: string) => {
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
  }, [addToast]);

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
    newTemplateId,
    setNewTemplateId,
    templateWarning,
    newBlockText,
    setNewBlockText,
    savingBlockId,
    anchorsBySourceRef,
    sourceJumpTarget,
    setSourceJumpTarget,
    sourceJumpBusy,
    blockTextDrafts,
    setBlockTextDrafts,
    blockFieldDrafts,
    setBlockFieldDrafts,
    templateOptions,
    defaultTextTemplate,
    insertTemplateGroups,
    insertTemplateOptions,
    saveTitle,
    createBlock,
    saveBlock,
    applyTemplateToBlock,
    persistBlockLayout,
    toggleBlockExportRole,
    toggleBlockAIVisibility,
    addBlock,
    trashBlock,
    moveBlock,
    handleViewSource,
  };
}
