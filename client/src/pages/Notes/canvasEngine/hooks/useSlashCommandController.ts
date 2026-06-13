import {
  useCallback,
  useMemo,
  useState,
  type Dispatch,
  type KeyboardEvent,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from 'react';
import type { TemplateOption } from '@/services/templateOptions';
import type { Toast } from '@/stores/uiStore';
import {
  detectSlashTrigger,
  filterSlashCommands,
  findTemplateForCommand,
  removeSlashTrigger,
  type NoteSlashCommand,
  type SlashTrigger,
} from '../../noteSlashCommands';
import { textFromContent } from '../blockContentService';
import {
  editingTextInteraction,
  openingMenuInteraction,
  type RuntimeInteractionState,
} from '../interactionController';
import { getSlashMenuAnchor } from '../overlayService';
import type { SlashMenuAnchor } from '../runtimeLayout';
import type { NoteBlock } from '../runtimeDataTypes';

export type SlashTarget = {
  target: 'draft' | 'block';
  blockId?: string;
  trigger: SlashTrigger;
  anchor: SlashMenuAnchor | null;
};

export interface UseSlashCommandControllerOptions {
  addToast: (type: Toast['type'], message: string) => void;
  applyTemplateToBlock: (
    block: NoteBlock,
    template: TemplateOption,
    text: string,
  ) => Promise<NoteBlock | null>;
  blockListRef: RefObject<HTMLDivElement>;
  blocks: NoteBlock[];
  blockTextDrafts: Record<string, string>;
  draftText: string;
  draftTextRef: MutableRefObject<string>;
  insertTemplateOptions: TemplateOption[];
  persistDraft: (
    initialText?: string,
    explicitTemplate?: TemplateOption,
  ) => Promise<void>;
  saveBlock: (
    block: NoteBlock,
    text: string,
    options?: { silent?: boolean },
  ) => Promise<NoteBlock | null>;
  setBlockTextDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  setDraftText: Dispatch<SetStateAction<string>>;
  setFocusBlockId: Dispatch<SetStateAction<string | null>>;
  setInteractionState: (state: RuntimeInteractionState) => void;
  templateOptions: TemplateOption[];
  activateDraft: () => void;
}

export function useSlashCommandController({
  addToast,
  applyTemplateToBlock,
  blockListRef,
  blocks,
  blockTextDrafts,
  draftText,
  draftTextRef,
  insertTemplateOptions,
  persistDraft,
  saveBlock,
  setBlockTextDrafts,
  setDraftText,
  setFocusBlockId,
  setInteractionState,
  templateOptions,
  activateDraft,
}: UseSlashCommandControllerOptions) {
  const [slashTarget, setSlashTarget] = useState<SlashTarget | null>(null);

  const slashCommands = useMemo(() => (
    slashTarget
      ? filterSlashCommands(slashTarget.trigger.query).map((command) => (
        findTemplateForCommand(command, insertTemplateOptions)
          ? command
          : { ...command, disabledReason: `${command.label} is not enabled in this notebook build yet.` }
      ))
      : []
  ), [slashTarget, insertTemplateOptions]);

  const clearSlashTarget = useCallback(() => {
    setSlashTarget(null);
  }, []);

  const updateSlashTarget = useCallback((
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
      anchor: getSlashMenuAnchor(anchorElement || null, blockListRef.current, caret),
    } : null);
    setInteractionState(trigger
      ? openingMenuInteraction('slashMenu', blockId)
      : target === 'block'
        ? editingTextInteraction(blockId)
        : editingTextInteraction());
  }, [blockListRef, setInteractionState]);

  const handleDraftChange = useCallback((
    value: string,
    caret: number,
    anchorElement?: HTMLElement | null,
  ) => {
    setDraftText(value);
    draftTextRef.current = value;
    updateSlashTarget('draft', value, caret, undefined, anchorElement);
  }, [draftTextRef, setDraftText, updateSlashTarget]);

  const handleBlockTextChange = useCallback((
    blockId: string,
    value: string,
    caret: number,
    anchorElement?: HTMLElement | null,
  ) => {
    setBlockTextDrafts((current) => ({ ...current, [blockId]: value }));
    updateSlashTarget('block', value, caret, blockId, anchorElement);
  }, [setBlockTextDrafts, updateSlashTarget]);

  const handleSelectSlashCommand = useCallback(async (command: NoteSlashCommand) => {
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

    const updated = await applyTemplateToBlock(block, template, cleanedText);
    if (updated) setFocusBlockId(block.id);
  }, [
    addToast,
    applyTemplateToBlock,
    blocks,
    blockTextDrafts,
    draftTextRef,
    persistDraft,
    setBlockTextDrafts,
    setDraftText,
    setFocusBlockId,
    slashTarget,
    templateOptions,
  ]);

  const handleDraftKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape' && slashTarget?.target === 'draft') {
      event.preventDefault();
      setSlashTarget(null);
      return;
    }

    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault();
      setSlashTarget(null);
      void persistDraft(draftText);
    }
  }, [draftText, persistDraft, slashTarget]);

  const handleBlockKeyDown = useCallback((
    block: NoteBlock,
    text: string,
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key === 'Escape') {
      if (slashTarget?.target === 'block') {
        event.preventDefault();
        setSlashTarget(null);
      }
      return;
    }

    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault();
      setSlashTarget(null);
      void saveBlock(block, text, { silent: true }).then(() => activateDraft());
    }
  }, [activateDraft, saveBlock, slashTarget]);

  return {
    clearSlashTarget,
    handleBlockKeyDown,
    handleBlockTextChange,
    handleDraftChange,
    handleDraftKeyDown,
    handleSelectSlashCommand,
    slashCommands,
    slashTarget,
  };
}
