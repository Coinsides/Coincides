import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { TemplateOption } from '@/services/templateOptions';
import {
  editingTextInteraction,
  idleInteraction,
  type RuntimeInteractionState,
} from '../interactionController';
import {
  resizeTextareaToContent,
} from '../measurementService';
import type { BlockBoxLayout } from '../runtimeLayout';
import { DEFAULT_BLOCK_HEIGHT } from '../runtimeLayout';
import type { Note, NoteBlock, TextBlockContentV1 } from '../runtimeDataTypes';
import {
  createEmptyTextBlockContentV1,
  projectTextFlowContent,
  TEXT_FLOW_CONTENT_KEY,
} from '../textFlowService';
import {
  INITIAL_DRAFT_BLOCK_LIFECYCLE_STATE,
  shouldMountLocalDraft,
  transitionCreatingDraft,
  transitionDraftActive,
  transitionDraftFocusNonce,
  transitionDraftLayout,
  transitionDraftText,
} from '../draftBlockLifecycleReducer';

export interface UseDraftBlockControllerOptions {
  createBlock: (
    template: TemplateOption,
    text: string,
    options?: {
      title?: string | null;
      contentJson?: Record<string, unknown>;
      metadataPatch?: Record<string, unknown>;
      layout?: BlockBoxLayout;
      silent?: boolean;
    },
  ) => Promise<NoteBlock | null>;
  defaultDraftLayout: BlockBoxLayout;
  defaultTextTemplate: TemplateOption;
  note: Note | null;
  onDraftPersisted?: (block: NoteBlock) => void;
  saveBlock: (
    block: NoteBlock,
    text: string,
    options?: { silent?: boolean; textFlow?: TextBlockContentV1 },
  ) => Promise<NoteBlock | null>;
  setActiveBlockId: Dispatch<SetStateAction<string | null>>;
  setFocusBlockId: Dispatch<SetStateAction<string | null>>;
  setInteractionState: (state: RuntimeInteractionState) => void;
  setSelectedBlockId: Dispatch<SetStateAction<string | null>>;
}

export function useDraftBlockController({
  createBlock,
  defaultDraftLayout,
  defaultTextTemplate,
  note,
  onDraftPersisted,
  saveBlock,
  setActiveBlockId,
  setFocusBlockId,
  setInteractionState,
  setSelectedBlockId,
}: UseDraftBlockControllerOptions) {
  const [draftActive, setDraftActive] = useState(INITIAL_DRAFT_BLOCK_LIFECYCLE_STATE.draftActive);
  const [draftText, setDraftTextState] = useState(INITIAL_DRAFT_BLOCK_LIFECYCLE_STATE.draftText);
  const [creatingDraft, setCreatingDraft] = useState(INITIAL_DRAFT_BLOCK_LIFECYCLE_STATE.creatingDraft);
  const [draftFocusNonce, setDraftFocusNonce] = useState(
    INITIAL_DRAFT_BLOCK_LIFECYCLE_STATE.draftFocusNonce,
  );
  const [draftLayout, setDraftLayoutState] = useState<BlockBoxLayout | null>(
    INITIAL_DRAFT_BLOCK_LIFECYCLE_STATE.draftLayout,
  );
  const draftRef = useRef<HTMLTextAreaElement | null>(null);
  const draftTextRef = useRef('');
  const creatingDraftRef = useRef(false);
  const setDraftText = useCallback<Dispatch<SetStateAction<string>>>((value) => {
    setDraftTextState((current) => transitionDraftText(current, { type: 'set_text', value }));
  }, []);
  const setDraftLayout = useCallback<Dispatch<SetStateAction<BlockBoxLayout | null>>>((value) => {
    setDraftLayoutState((current) => transitionDraftLayout(current, { type: 'set_layout', value }));
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

  const discardDraft = useCallback(() => {
    setDraftTextState((current) => transitionDraftText(current, { type: 'discard' }));
    draftTextRef.current = '';
    setDraftActive((current) => transitionDraftActive(current, { type: 'discard' }));
    setDraftLayoutState((current) => transitionDraftLayout(current, { type: 'discard' }));
    setInteractionState(idleInteraction());
  }, [setInteractionState]);

  const resetDraft = useCallback(() => {
    setDraftTextState((current) => transitionDraftText(current, { type: 'reset' }));
    draftTextRef.current = '';
    setDraftActive((current) => transitionDraftActive(current, { type: 'reset' }));
    setDraftLayoutState((current) => transitionDraftLayout(current, { type: 'reset' }));
    setCreatingDraft((current) => transitionCreatingDraft(current, { type: 'reset' }));
    creatingDraftRef.current = false;
  }, []);

  const activateDraft = useCallback((layout?: BlockBoxLayout) => {
    const nextLayout = layout || defaultDraftLayout;
    setActiveBlockId(null);
    setSelectedBlockId(null);
    setInteractionState(editingTextInteraction());

    if (shouldMountLocalDraft({
      hasNote: Boolean(note),
      hasDefaultTextTemplate: Boolean(defaultTextTemplate),
      creatingDraft: creatingDraftRef.current,
    })) {
      const transition = { type: 'activate_local', layout: nextLayout } as const;
      setDraftLayoutState((current) => transitionDraftLayout(current, transition));
      setDraftActive((current) => transitionDraftActive(current, transition));
      setDraftFocusNonce((current) => transitionDraftFocusNonce(current, transition));
      return;
    }

    creatingDraftRef.current = true;
    setCreatingDraft((current) => transitionCreatingDraft(current, { type: 'begin_empty_block_create' }));
    setDraftTextState((current) => transitionDraftText(current, { type: 'begin_empty_block_create' }));
    draftTextRef.current = '';
    setDraftActive((current) => transitionDraftActive(current, { type: 'begin_empty_block_create' }));
    setDraftLayoutState((current) => transitionDraftLayout(current, { type: 'begin_empty_block_create' }));

    const textFlow = createEmptyTextBlockContentV1('paragraph');
    void createBlock(defaultTextTemplate, '', {
      contentJson: {
        body: '',
        [TEXT_FLOW_CONTENT_KEY]: textFlow,
      },
      layout: nextLayout,
      silent: true,
    }).then((created) => {
      if (!created) return;
      setFocusBlockId(created.id);
      onDraftPersisted?.(created);
    }).finally(() => {
      creatingDraftRef.current = false;
      setCreatingDraft((current) => transitionCreatingDraft(current, { type: 'create_finished' }));
    });
  }, [
    createBlock,
    defaultDraftLayout,
    defaultTextTemplate,
    note,
    onDraftPersisted,
    setActiveBlockId,
    setFocusBlockId,
    setInteractionState,
    setSelectedBlockId,
  ]);

  const persistDraft = useCallback(async (
    initialText?: string,
    explicitTemplate?: TemplateOption,
    options: { textFlow?: TextBlockContentV1; layout?: BlockBoxLayout } = {},
  ) => {
    if (!note || creatingDraftRef.current) return;
    const template = explicitTemplate || defaultTextTemplate;
    const projectedTextFlow = options.textFlow
      ? projectTextFlowContent({ [TEXT_FLOW_CONTENT_KEY]: options.textFlow }, initialText ?? draftTextRef.current).plain_text
      : null;
    const textToCreate = (projectedTextFlow ?? initialText ?? draftTextRef.current).trimEnd();
    if (!template || (!textToCreate.trim() && !explicitTemplate)) return;

    creatingDraftRef.current = true;
    setCreatingDraft((current) => transitionCreatingDraft(current, { type: 'begin_draft_persist' }));
    try {
      const created = await createBlock(template, textToCreate, {
        contentJson: options.textFlow
          ? {
            body: textToCreate,
            [TEXT_FLOW_CONTENT_KEY]: options.textFlow,
          }
          : undefined,
        layout: options.layout || draftLayout || defaultDraftLayout,
        silent: true,
      });
      if (!created) return;
      let persistedBlock = created;

      const latestText = draftTextRef.current.trimEnd();
      if (!options.textFlow && latestText.trim() && latestText !== textToCreate) {
        const saved = await saveBlock(created, latestText, { silent: true });
        if (saved) persistedBlock = saved;
      }

      setDraftTextState((current) => transitionDraftText(current, { type: 'persist_succeeded' }));
      draftTextRef.current = '';
      setDraftActive((current) => transitionDraftActive(current, { type: 'persist_succeeded' }));
      setDraftLayoutState((current) => transitionDraftLayout(current, { type: 'persist_succeeded' }));
      setFocusBlockId(persistedBlock.id);
      onDraftPersisted?.(persistedBlock);
    } finally {
      creatingDraftRef.current = false;
      setCreatingDraft((current) => transitionCreatingDraft(current, { type: 'create_finished' }));
    }
  }, [
    note,
    defaultTextTemplate,
    draftLayout,
    defaultDraftLayout,
    createBlock,
    saveBlock,
    setFocusBlockId,
    onDraftPersisted,
  ]);

  const resizeDraftFromTextarea = useCallback((textarea: HTMLTextAreaElement) => {
    resizeTextareaToContent(textarea);
    const nextHeight = Math.max(DEFAULT_BLOCK_HEIGHT, textarea.scrollHeight + 34);
    setDraftLayout((current) => (current ? { ...current, height: nextHeight } : current));
  }, []);

  return {
    activateDraft,
    creatingDraft,
    discardDraft,
    draftActive,
    draftLayout,
    draftRef,
    draftText,
    draftTextRef,
    persistDraft,
    resetDraft,
    resizeDraftFromTextarea,
    setDraftLayout,
    setDraftText,
  };
}
