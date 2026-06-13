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
import type { Note, NoteBlock } from '../runtimeDataTypes';

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
    options?: { silent?: boolean },
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
  const [draftActive, setDraftActive] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [draftFocusNonce, setDraftFocusNonce] = useState(0);
  const [draftLayout, setDraftLayout] = useState<BlockBoxLayout | null>(null);
  const draftRef = useRef<HTMLTextAreaElement | null>(null);
  const draftTextRef = useRef('');
  const creatingDraftRef = useRef(false);

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
    setDraftText('');
    draftTextRef.current = '';
    setDraftActive(false);
    setDraftLayout(null);
    setInteractionState(idleInteraction());
  }, [setInteractionState]);

  const resetDraft = useCallback(() => {
    setDraftText('');
    draftTextRef.current = '';
    setDraftActive(false);
    setDraftLayout(null);
    setCreatingDraft(false);
    creatingDraftRef.current = false;
  }, []);

  const activateDraft = useCallback((layout?: BlockBoxLayout) => {
    setDraftLayout(layout || defaultDraftLayout);
    setDraftActive(true);
    setDraftFocusNonce((value) => value + 1);
    setActiveBlockId(null);
    setSelectedBlockId(null);
    setInteractionState(editingTextInteraction());
  }, [defaultDraftLayout, setActiveBlockId, setInteractionState, setSelectedBlockId]);

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
      let persistedBlock = created;

      const latestText = draftTextRef.current.trimEnd();
      if (latestText.trim() && latestText !== textToCreate) {
        const saved = await saveBlock(created, latestText, { silent: true });
        if (saved) persistedBlock = saved;
      }

      setDraftText('');
      draftTextRef.current = '';
      setDraftActive(false);
      setDraftLayout(null);
      setFocusBlockId(persistedBlock.id);
      onDraftPersisted?.(persistedBlock);
    } finally {
      creatingDraftRef.current = false;
      setCreatingDraft(false);
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
    setDraftLayout((current) => (
      current ? { ...current, height: nextHeight } : current
    ));
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
