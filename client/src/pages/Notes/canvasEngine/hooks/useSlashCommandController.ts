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
  filterSlashCommands,
  findTemplateForCommand,
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
import type { TextFocusReceipt } from '../textFocusReceipt';
import {
  INITIAL_SLASH_COMMAND_STATE,
  applySlashExitToText,
  deriveSlashTargetIdentity,
  transitionSlashCommandIndex,
  transitionSlashTarget,
  type SlashTarget,
} from '../slashCommandReducer';

export type { SlashTarget } from '../slashCommandReducer';

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
  focusedTextOwner: TextFocusReceipt | null;
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
  focusedTextOwner,
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
  const [slashTarget, setSlashTarget] = useState<SlashTarget | null>(
    INITIAL_SLASH_COMMAND_STATE.target,
  );
  const [activeSlashCommandIndex, setActiveSlashCommandIndex] = useState(
    INITIAL_SLASH_COMMAND_STATE.activeIndex,
  );

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
    setSlashTarget((current) => transitionSlashTarget(current, {
      type: 'exit',
      reason: 'external_clear',
    }));
  }, []);

  useEffect(() => {
    setActiveSlashCommandIndex((current) => transitionSlashCommandIndex(current, { type: 'reset_index' }));
  }, [slashTarget?.target, slashTarget?.blockId, slashTarget?.trigger.query]);

  useEffect(() => {
    setActiveSlashCommandIndex((current) => transitionSlashCommandIndex(current, {
      type: 'clamp_index',
      commandCount: slashCommands.length,
    }));
  }, [slashCommands.length]);

  const updateSlashTarget = useCallback((
    target: SlashTarget['target'],
    text: string,
    caret: number,
    blockId?: string,
    anchorElement?: HTMLElement | null,
  ) => {
    const identity = deriveSlashTargetIdentity({ target, text, caret, blockId });
    const nextTarget: SlashTarget | null = identity ? {
      ...identity,
      anchor: getSlashMenuAnchor(anchorElement || null, blockListRef.current, caret),
    } : null;
    setSlashTarget((current) => transitionSlashTarget(current, {
      type: 'sync_target',
      target: nextTarget,
    }));
    const receipt = focusedTextOwner && (
      target === 'draft' || focusedTextOwner.blockId === blockId
    ) ? focusedTextOwner : null;
    if (!receipt) return;
    setInteractionState(nextTarget
      ? openingMenuInteraction('slashMenu', blockId, receipt, target)
      : editingTextInteraction(receipt, target));
  }, [blockListRef, focusedTextOwner, setInteractionState]);

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
        const cleanedText = applySlashExitToText({
          text: draftTextRef.current,
          target: slashTarget,
          reason: 'commit',
        });
        const textFlow = setTextUnitWritingRole(
          createTextBlockContentV1(cleanedText, 'paragraph'),
          'tu-1',
          command.writingRole,
        );
        const projected = projectTextFlowContent({ [TEXT_FLOW_CONTENT_KEY]: textFlow }, cleanedText).plain_text;
        setSlashTarget((current) => transitionSlashTarget(current, { type: 'exit', reason: 'commit' }));
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
      setSlashTarget((current) => transitionSlashTarget(current, { type: 'exit', reason: 'commit' }));
      setBlockTextDrafts((current) => ({ ...current, [block.id]: projected }));
      setBlockTextFlowDrafts((current) => ({ ...current, [block.id]: nextFlow }));
      const updated = await saveBlock(block, projected, { silent: true, textFlow: nextFlow });
      if (updated) setFocusBlockId(block.id);
      return;
    }

    if (command.commandKind === 'annotation_action') {
      addToast('info', 'Select text first, then use Label.');
      setSlashTarget((current) => transitionSlashTarget(current, {
        type: 'exit',
        reason: 'annotation_action',
      }));
      return;
    }

    const template = findTemplateForCommand(command, templateOptions);
    if (!template) {
      addToast('error', `${command.label} template is not available`);
      return;
    }

    if (slashTarget.target === 'draft') {
      const cleanedText = applySlashExitToText({
        text: draftTextRef.current,
        target: slashTarget,
        reason: 'commit',
      });
      setSlashTarget((current) => transitionSlashTarget(current, { type: 'exit', reason: 'commit' }));
      setDraftText(cleanedText);
      draftTextRef.current = cleanedText;
      await persistDraft(cleanedText, template);
      return;
    }

    const blockId = slashTarget.blockId;
    const block = blockId ? blocks.find((item) => item.id === blockId) : undefined;
    if (!block) return;

    const currentText = blockTextDrafts[block.id] ?? textFromContent(block);
    const cleanedText = applySlashExitToText({ text: currentText, target: slashTarget, reason: 'commit' });
    setSlashTarget((current) => transitionSlashTarget(current, { type: 'exit', reason: 'commit' }));
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
    setActiveSlashCommandIndex((current) => transitionSlashCommandIndex(current, {
      type: 'move_index',
      direction,
      commandCount: slashCommands.length,
    }));
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
      setSlashTarget((current) => transitionSlashTarget(current, { type: 'exit', reason: 'escape' }));
      return;
    }

    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault();
      setSlashTarget((current) => transitionSlashTarget(current, { type: 'exit', reason: 'ctrl_enter' }));
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
        setSlashTarget((current) => transitionSlashTarget(current, { type: 'exit', reason: 'escape' }));
      }
      return;
    }

    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault();
      setSlashTarget((current) => transitionSlashTarget(current, { type: 'exit', reason: 'ctrl_enter' }));
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
