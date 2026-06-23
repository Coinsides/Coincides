import {
  useCallback,
  useEffect,
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
import type { NoteBlock, TextBlockContentV1, TextUnitWritingRole } from '../runtimeDataTypes';
import {
  createTextBlockContentV1,
  getTextFlowContent,
  projectTextFlowContent,
  TEXT_FLOW_CONTENT_KEY,
} from '../textFlowService';
import {
  setTextUnitWritingRole,
} from '../textUnitEditorService';

function clampSlashCommandIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(index, length - 1));
}

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
  blockTextFlowDrafts: Record<string, TextBlockContentV1>;
  draftText: string;
  draftTextRef: MutableRefObject<string>;
  insertTemplateOptions: TemplateOption[];
  persistDraft: (
    initialText?: string,
    explicitTemplate?: TemplateOption,
    options?: { textFlow?: TextBlockContentV1 },
  ) => Promise<void>;
  saveBlock: (
    block: NoteBlock,
    text: string,
    options?: { silent?: boolean; textFlow?: TextBlockContentV1 },
  ) => Promise<NoteBlock | null>;
  setBlockTextDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  setBlockTextFlowDrafts: Dispatch<SetStateAction<Record<string, TextBlockContentV1>>>;
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
  blockTextFlowDrafts,
  draftText,
  draftTextRef,
  insertTemplateOptions,
  persistDraft,
  saveBlock,
  setBlockTextDrafts,
  setBlockTextFlowDrafts,
  setDraftText,
  setFocusBlockId,
  setInteractionState,
  templateOptions,
  activateDraft,
}: UseSlashCommandControllerOptions) {
  const [slashTarget, setSlashTarget] = useState<SlashTarget | null>(null);
  const [activeSlashCommandIndex, setActiveSlashCommandIndex] = useState(0);

  const slashCommands = useMemo(() => (
    slashTarget
      ? filterSlashCommands(slashTarget.trigger.query).map((command) => (
        command.disabledReason
        || command.commandKind === 'annotation_action'
        || command.objectKind === 'writing_role'
        || findTemplateForCommand(command, insertTemplateOptions)
          ? command
          : { ...command, disabledReason: `${command.label} is not enabled in this notebook build yet.` }
      ))
      : []
  ), [slashTarget, insertTemplateOptions]);

  const clearSlashTarget = useCallback(() => {
    setSlashTarget(null);
  }, []);

  useEffect(() => {
    setActiveSlashCommandIndex(0);
  }, [slashTarget?.target, slashTarget?.blockId, slashTarget?.trigger.query]);

  useEffect(() => {
    setActiveSlashCommandIndex((current) => clampSlashCommandIndex(current, slashCommands.length));
  }, [slashCommands.length]);

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

  const applyWritingRoleToFlow = useCallback((
    flow: TextBlockContentV1,
    trigger: SlashTrigger,
    role: TextUnitWritingRole,
  ): TextBlockContentV1 => {
    let offset = 0;
    let targetUnitId = flow.units[0]?.id || 'tu-1';
    const nextUnits = flow.units.map((unit) => {
      const start = offset;
      const end = start + unit.text.length;
      offset = end + 1;
      if (trigger.start < start || trigger.start > end) return unit;

      targetUnitId = unit.id;
      const localStart = Math.max(0, trigger.start - start);
      const localEnd = Math.max(localStart, Math.min(unit.text.length, trigger.end - start));
      return {
        ...unit,
        text: `${unit.text.slice(0, localStart)}${unit.text.slice(localEnd)}`.trimEnd(),
      };
    });

    return setTextUnitWritingRole({ ...flow, units: nextUnits }, targetUnitId, role);
  }, []);

  const handleSelectSlashCommand = useCallback(async (command: NoteSlashCommand) => {
    if (!slashTarget) return;
    if (command.disabledReason) {
      addToast('info', command.disabledReason);
      return;
    }

    if (command.objectKind === 'writing_role' && command.writingRole) {
      if (slashTarget.target === 'draft') {
        const cleanedText = removeSlashTrigger(draftTextRef.current, slashTarget.trigger);
        const textFlow = setTextUnitWritingRole(
          createTextBlockContentV1(cleanedText, 'paragraph'),
          'tu-1',
          command.writingRole,
        );
        const projected = projectTextFlowContent({ [TEXT_FLOW_CONTENT_KEY]: textFlow }, cleanedText).plain_text;
        setSlashTarget(null);
        setDraftText(projected);
        draftTextRef.current = projected;
        await persistDraft(projected, undefined, { textFlow });
        return;
      }

      const blockId = slashTarget.blockId;
      const block = blockId ? blocks.find((item) => item.id === blockId) : undefined;
      if (!block) return;
      const currentText = blockTextDrafts[block.id] ?? textFromContent(block);
      const baseFlow = blockTextFlowDrafts[block.id]
        || getTextFlowContent(block.content_json)
        || createTextBlockContentV1(currentText, 'paragraph');
      const nextFlow = applyWritingRoleToFlow(baseFlow, slashTarget.trigger, command.writingRole);
      const projected = projectTextFlowContent({ [TEXT_FLOW_CONTENT_KEY]: nextFlow }, currentText).plain_text;
      setSlashTarget(null);
      setBlockTextDrafts((current) => ({ ...current, [block.id]: projected }));
      setBlockTextFlowDrafts((current) => ({ ...current, [block.id]: nextFlow }));
      const updated = await saveBlock(block, projected, { silent: true, textFlow: nextFlow });
      if (updated) setFocusBlockId(block.id);
      return;
    }

    if (command.commandKind === 'annotation_action') {
      addToast('info', 'Select text first, then use Label.');
      setSlashTarget(null);
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
    applyWritingRoleToFlow,
    applyTemplateToBlock,
    blocks,
    blockTextDrafts,
    blockTextFlowDrafts,
    draftTextRef,
    persistDraft,
    saveBlock,
    setBlockTextDrafts,
    setBlockTextFlowDrafts,
    setDraftText,
    setFocusBlockId,
    slashTarget,
    templateOptions,
  ]);

  const moveActiveSlashCommand = useCallback((direction: 1 | -1) => {
    setActiveSlashCommandIndex((current) => {
      if (slashCommands.length === 0) return 0;
      return (current + direction + slashCommands.length) % slashCommands.length;
    });
  }, [slashCommands.length]);

  const handleSlashMenuKeyDown = useCallback((
    event: KeyboardEvent<HTMLTextAreaElement>,
    target: SlashTarget['target'],
  ): boolean => {
    if (!slashTarget || slashTarget.target !== target) return false;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveActiveSlashCommand(1);
      return true;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveActiveSlashCommand(-1);
      return true;
    }

    if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      const command = slashCommands[activeSlashCommandIndex];
      if (command) void handleSelectSlashCommand(command);
      return true;
    }

    return false;
  }, [
    activeSlashCommandIndex,
    handleSelectSlashCommand,
    moveActiveSlashCommand,
    slashCommands,
    slashTarget,
  ]);

  const handleDraftKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (handleSlashMenuKeyDown(event, 'draft')) return;

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
  }, [draftText, handleSlashMenuKeyDown, persistDraft, slashTarget]);

  const handleBlockKeyDown = useCallback((
    block: NoteBlock,
    text: string,
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (handleSlashMenuKeyDown(event, 'block')) return;

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
  }, [activateDraft, handleSlashMenuKeyDown, saveBlock, slashTarget]);

  return {
    activeSlashCommandId: slashCommands[activeSlashCommandIndex]?.id ?? null,
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
