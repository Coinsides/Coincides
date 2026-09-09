import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
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
import { textFromContent, type FieldValueRecord } from '../blockContentService';
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
import {
  textFocusReceiptsEqual,
  type TextFocusReceipt,
  type TextOwnerReconciliation,
} from '../textFocusReceipt';
import {
  INITIAL_SLASH_COMMAND_STATE,
  applySlashExitToText,
  deriveSlashTargetIdentity,
  planSlashSessionRollback,
  reconcileSlashOwner,
  slashExitPolicy,
  transitionSlashCommandIndex,
  transitionSlashSession,
  transitionSlashTarget,
  type SlashExitReason,
  type SlashSession,
  type SlashSessionAction,
  type SlashTarget,
} from '../slashCommandReducer';
import type { RollbackBlockSlashSession } from './useSlashBlockRollbackController';
import type { BlockSaveOutcome } from './useNoteCanvasDataAdapter';

export type { SlashTarget } from '../slashCommandReducer';

function textareaHasOwnerIdentity(element: HTMLTextAreaElement): boolean {
  return Boolean(
    element.dataset.blockId
    || element.dataset.textFlowId
    || element.dataset.textUnitId,
  );
}

function textareaMatchesOwner(
  element: HTMLTextAreaElement,
  owner: TextFocusReceipt,
): boolean {
  return element.dataset.blockId === owner.blockId
    && element.dataset.textFlowId === owner.textFlowId
    && element.dataset.textUnitId === owner.textUnitId;
}

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
  draftOwnerReconciliation?: TextOwnerReconciliation | null;
  focusedTextOwner: TextFocusReceipt | null;
  insertTemplateOptions: TemplateOption[];
  persistDraft: (
    initialText?: string,
    explicitTemplate?: TemplateOption,
    options?: { textFlow?: TextBlockContentV1 },
  ) => Promise<void>;
  rollbackBlockSlashSession: RollbackBlockSlashSession;
  saveBlock: (
    block: NoteBlock,
    text: string,
    options?: { silent?: boolean; fieldValues?: FieldValueRecord; textFlow?: TextBlockContentV1 },
  ) => Promise<BlockSaveOutcome>;
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
  draftOwnerReconciliation = null,
  focusedTextOwner,
  insertTemplateOptions,
  persistDraft,
  rollbackBlockSlashSession,
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
  const [slashSession, setSlashSession] = useState<SlashSession | null>(null);
  const slashSessionRef = useRef<SlashSession | null>(slashSession);
  const slashOwnerElementRef = useRef<HTMLTextAreaElement | null>(null);
  const focusedTextOwnerRef = useRef(focusedTextOwner);
  const blockTextDraftsRef = useRef(blockTextDrafts);
  focusedTextOwnerRef.current = focusedTextOwner;
  blockTextDraftsRef.current = blockTextDrafts;

  const dispatchSlashSession = useCallback((action: SlashSessionAction) => {
    setSlashSession((current) => {
      const next = transitionSlashSession(current, action);
      slashSessionRef.current = next;
      return next;
    });
  }, []);

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

  useEffect(() => {
    setActiveSlashCommandIndex((current) => transitionSlashCommandIndex(current, { type: 'reset_index' }));
  }, [slashTarget?.target, slashTarget?.blockId, slashTarget?.trigger.query]);

  useEffect(() => {
    setActiveSlashCommandIndex((current) => transitionSlashCommandIndex(current, {
      type: 'clamp_index',
      commandCount: slashCommands.length,
    }));
  }, [slashCommands.length]);

  useLayoutEffect(() => {
    if (!draftOwnerReconciliation) return;
    const reconciled = reconcileSlashOwner(
      { target: slashTarget, session: slashSession },
      draftOwnerReconciliation,
    );
    if (reconciled.target === slashTarget && reconciled.session === slashSession) return;
    slashSessionRef.current = reconciled.session;
    slashOwnerElementRef.current = null;
    setSlashTarget(reconciled.target);
    setSlashSession(reconciled.session);
    setInteractionState(openingMenuInteraction(
      'slashMenu',
      draftOwnerReconciliation.to.blockId,
      draftOwnerReconciliation.to,
      'block',
    ));
  }, [draftOwnerReconciliation, setInteractionState, slashSession, slashTarget]);

  const restoreSlashOwnerFocus = useCallback((
    owner: TextFocusReceipt,
    caret: number,
    preferredElement: HTMLTextAreaElement | null,
  ) => {
    const findOwnerElement = (): HTMLTextAreaElement | null => {
      if (
        preferredElement?.isConnected
        && (
          !textareaHasOwnerIdentity(preferredElement)
          || textareaMatchesOwner(preferredElement, owner)
        )
      ) {
        return preferredElement;
      }
      return [...(blockListRef.current?.querySelectorAll<HTMLTextAreaElement>('textarea') || [])]
        .find((element) => textareaMatchesOwner(element, owner)) || null;
    };
    const restore = () => {
      if (!textFocusReceiptsEqual(focusedTextOwnerRef.current, owner)) return;
      const textarea = findOwnerElement();
      if (!textarea) return;
      const nextCaret = Math.max(0, Math.min(caret, textarea.value.length));
      textarea.focus({ preventScroll: true });
      textarea.setSelectionRange(nextCaret, nextCaret);
    };

    restore();
    queueMicrotask(restore);
  }, [blockListRef]);

  const exitSlashSession = useCallback((
    reason: SlashExitReason,
    currentTextOverride?: string,
  ): boolean => {
    const session = slashSessionRef.current;
    const currentText = session?.target === 'draft'
      ? draftTextRef.current
      : currentTextOverride ?? '';
    const policy = slashExitPolicy(reason);
    const rollback = session?.target === 'block' && policy.rollbackTrigger
      ? rollbackBlockSlashSession({
        session,
        getCurrentOwner: () => focusedTextOwnerRef.current,
        getCurrentText: () => blockTextDraftsRef.current[session.owner.blockId],
        reason,
        fallbackText: currentTextOverride,
      })
      : planSlashSessionRollback({
        session,
        currentOwner: focusedTextOwnerRef.current,
        text: currentText,
        reason,
      });
    const ownerElement = slashOwnerElementRef.current;

    setSlashTarget((current) => transitionSlashTarget(current, { type: 'exit', reason }));
    dispatchSlashSession({ type: 'exit', reason });
    slashOwnerElementRef.current = null;
    if (policy.rollbackTrigger && session) {
      const currentOwner = focusedTextOwnerRef.current;
      if (currentOwner && textFocusReceiptsEqual(currentOwner, session.owner)) {
        setInteractionState(editingTextInteraction(currentOwner, session.target));
      }
    }
    if (!rollback.applied || !rollback.focus || !session) return false;

    if (session.target === 'draft') {
      setDraftText(rollback.text);
    }
    restoreSlashOwnerFocus(rollback.focus.owner, rollback.focus.caret, ownerElement);
    return true;
  }, [
    dispatchSlashSession,
    draftTextRef,
    restoreSlashOwnerFocus,
    rollbackBlockSlashSession,
    setDraftText,
    setInteractionState,
  ]);

  const clearSlashTarget = useCallback(() => {
    setSlashTarget((current) => transitionSlashTarget(current, {
      type: 'exit',
      reason: 'external_clear',
    }));
    dispatchSlashSession({ type: 'exit', reason: 'external_clear' });
    slashOwnerElementRef.current = null;
  }, [dispatchSlashSession]);

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
    const ownerTextarea = anchorElement instanceof HTMLTextAreaElement
      ? anchorElement
      : null;
    const draftOwnerMatchesElement = Boolean(
      ownerTextarea
      && focusedTextOwner
      && textareaMatchesOwner(ownerTextarea, focusedTextOwner),
    );
    const blockOwnerMatchesElement = Boolean(
      focusedTextOwner
      && focusedTextOwner.blockId === blockId
      && (
        !ownerTextarea
        || !textareaHasOwnerIdentity(ownerTextarea)
        || textareaMatchesOwner(ownerTextarea, focusedTextOwner)
      ),
    );
    const receipt = focusedTextOwner && (
      target === 'draft'
        ? draftOwnerMatchesElement
        : blockOwnerMatchesElement
    ) ? focusedTextOwner : null;
    const authorizedTarget = identity && !receipt ? null : nextTarget;
    setSlashTarget((current) => transitionSlashTarget(current, {
      type: 'sync_target',
      target: authorizedTarget,
    }));
    const originalSlice = identity
      ? text.slice(identity.trigger.start, identity.trigger.end)
      : '';
    const rollbackCaret = ownerTextarea
      ? Math.max(0, ownerTextarea.selectionStart - originalSlice.length)
      : identity?.trigger.start ?? caret;
    dispatchSlashSession({
      type: 'sync_session',
      target: identity,
      owner: receipt,
      text,
      caret: rollbackCaret,
    });
    slashOwnerElementRef.current = identity && receipt
      ? ownerTextarea
      : null;
    if (!receipt) return;
    setInteractionState(authorizedTarget
      ? openingMenuInteraction('slashMenu', blockId, receipt, target)
      : editingTextInteraction(receipt, target));
  }, [blockListRef, dispatchSlashSession, focusedTextOwner, setInteractionState]);

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
    blockTextDraftsRef.current = {
      ...blockTextDraftsRef.current,
      [blockId]: value,
    };
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
      exitSlashSession('disabled');
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
        exitSlashSession('commit', draftTextRef.current);
        setDraftText(projected);
        draftTextRef.current = projected;
        await persistDraft(projected, undefined, { textFlow });
        return;
      }

      const blockId = slashTarget.blockId;
      const block = blockId ? blocks.find((item) => item.id === blockId) : undefined;
      if (!block) {
        exitSlashSession('missing_block');
        return;
      }
      const currentText = blockTextDrafts[block.id] ?? textFromContent(block);
      const baseFlow = blockTextFlowDrafts[block.id]
        || getTextFlowContent(block.content_json)
        || createTextBlockContentV1(currentText, 'paragraph');
      const nextFlow = applyWritingRoleToFlow(baseFlow, slashTarget.trigger, command.writingRole);
      const projected = projectTextFlowContent({ [TEXT_FLOW_CONTENT_KEY]: nextFlow }, currentText).plain_text;
      exitSlashSession('commit', currentText);
      setBlockTextDrafts((current) => ({ ...current, [block.id]: projected }));
      setBlockTextFlowDrafts((current) => ({ ...current, [block.id]: nextFlow }));
      const saveOutcome = await saveBlock(block, projected, { silent: true, textFlow: nextFlow });
      if (saveOutcome.status === 'saved') setFocusBlockId(block.id);
      return;
    }

    if (command.commandKind === 'annotation_action') {
      addToast('info', 'Select text first, then use Label.');
      exitSlashSession('annotation_action');
      return;
    }

    const template = findTemplateForCommand(command, templateOptions);
    if (!template) {
      addToast('error', `${command.label} template is not available`);
      exitSlashSession('missing_template');
      return;
    }

    if (slashTarget.target === 'draft') {
      const cleanedText = applySlashExitToText({
        text: draftTextRef.current,
        target: slashTarget,
        reason: 'commit',
      });
      exitSlashSession('commit', draftTextRef.current);
      setDraftText(cleanedText);
      draftTextRef.current = cleanedText;
      await persistDraft(cleanedText, template);
      return;
    }

    const blockId = slashTarget.blockId;
    const block = blockId ? blocks.find((item) => item.id === blockId) : undefined;
    if (!block) {
      exitSlashSession('missing_block');
      return;
    }

    const currentText = blockTextDrafts[block.id] ?? textFromContent(block);
    const cleanedText = applySlashExitToText({ text: currentText, target: slashTarget, reason: 'commit' });
    exitSlashSession('commit', currentText);
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
    exitSlashSession,
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
      exitSlashSession('escape', draftTextRef.current);
      return;
    }

    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault();
      exitSlashSession('ctrl_enter', draftText);
      void persistDraft(draftText);
    }
  }, [draftText, draftTextRef, exitSlashSession, handleSlashMenuKeyDown, persistDraft, slashTarget]);

  const handleBlockKeyDown = useCallback((
    block: NoteBlock,
    text: string,
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (handleSlashMenuKeyDown(event, 'block')) return;

    if (event.key === 'Escape') {
      if (slashTarget?.target === 'block') {
        event.preventDefault();
        exitSlashSession('escape', text);
      }
      return;
    }

    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault();
      exitSlashSession('ctrl_enter', text);
      void saveBlock(block, text, { silent: true }).then((saveOutcome) => {
        if (saveOutcome.status === 'saved') activateDraft();
      });
    }
  }, [activateDraft, exitSlashSession, handleSlashMenuKeyDown, saveBlock, slashTarget]);

  return {
    dismissSlashSession: () => exitSlashSession('escape'),
    activeSlashCommandId: slashCommands[activeSlashCommandIndex]?.id ?? null,
    clearSlashTarget,
    handleBlockKeyDown,
    handleBlockTextChange,
    handleDraftChange,
    handleDraftKeyDown,
    handleSelectSlashCommand,
    slashCommands,
    slashSession,
    slashTarget,
  };
}
