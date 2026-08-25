import {
  useCallback,
  useRef,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { flushSync } from 'react-dom';
import { textFlowIdForBlock } from '../../../../../../shared/types/textFlow';
import {
  formulaFieldsFromBlock,
  presentationKindForBlock,
  textFromContent,
  type FieldValueRecord,
} from '../blockContentService';
import type {
  NoteBlock,
  TextBlockContentV1,
} from '../runtimeDataTypes';
import {
  planSlashBlockRollback,
  type SlashExitReason,
  type SlashRollbackPlan,
  type SlashSession,
} from '../slashCommandReducer';
import {
  getTextFlowContent,
} from '../textFlowService';
import type { TextFocusReceipt } from '../textFocusReceipt';
import type { BlockDraftSnapshot } from './useBlockDraftAuthority';
import type { ApplyBlockTextFlowEdit } from './useBlockTextFlowEditController';
import type { BlockSaveOutcome } from './useNoteCanvasDataAdapter';

export interface RollbackBlockSlashSessionInput {
  session: SlashSession;
  getCurrentOwner: () => TextFocusReceipt | null;
  getCurrentText: () => string | undefined;
  reason: SlashExitReason;
  fallbackText?: string;
}

export type RollbackBlockSlashSession = (
  input: RollbackBlockSlashSessionInput,
) => SlashRollbackPlan;

export interface UseSlashBlockRollbackControllerOptions {
  applyBlockTextFlowEdit: ApplyBlockTextFlowEdit;
  blocks: NoteBlock[];
  readBlockDraftSnapshot: () => BlockDraftSnapshot;
  saveBlock: (
    block: NoteBlock,
    text: string,
    options?: {
      silent?: boolean;
      fieldValues?: FieldValueRecord;
      textFlow?: TextBlockContentV1;
    },
  ) => Promise<BlockSaveOutcome>;
  setBlockFieldDrafts: Dispatch<SetStateAction<Record<string, FieldValueRecord>>>;
  setBlockTextDrafts: Dispatch<SetStateAction<Record<string, string>>>;
}

export function useSlashBlockRollbackController({
  applyBlockTextFlowEdit,
  blocks,
  readBlockDraftSnapshot,
  saveBlock,
  setBlockFieldDrafts,
  setBlockTextDrafts,
}: UseSlashBlockRollbackControllerOptions): RollbackBlockSlashSession {
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;

  return useCallback(({
    session,
    getCurrentOwner,
    getCurrentText,
    reason,
    fallbackText,
  }: RollbackBlockSlashSessionInput): SlashRollbackPlan => {
    const blockId = session.owner.blockId;
    const snapshot = readBlockDraftSnapshot();
    const currentOwner = getCurrentOwner();
    const block = blocksRef.current.find((item) => item.id === blockId) || null;
    const hasTextDraft = Object.prototype.hasOwnProperty.call(snapshot.textDrafts, blockId);
    const currentText = hasTextDraft
      ? snapshot.textDrafts[blockId]
      : fallbackText ?? (block ? textFromContent(block) : '');
    const observedText = getCurrentText();
    const currentTextFlow = snapshot.textFlowDrafts[blockId]
      ?? (block ? getTextFlowContent(block.content_json) : null);
    const currentFieldDraft = snapshot.fieldDrafts[blockId];
    const formulaBlock = Boolean(block && presentationKindForBlock(block) === 'formula');
    const currentFieldText = typeof currentFieldDraft?.latex_input === 'string'
      ? currentFieldDraft.latex_input
      : null;
    const hasFieldText = currentFieldText !== null;
    const hasFormulaAuthority = Boolean(
      formulaBlock
      || hasFieldText,
    );
    const reject = (): SlashRollbackPlan => ({ applied: false, text: currentText, focus: null });
    if (
      (observedText !== undefined && observedText !== currentText)
      || (formulaBlock && !hasFieldText)
      || session.owner.textFlowId !== textFlowIdForBlock(blockId)
    ) {
      return reject();
    }

    const rollback = planSlashBlockRollback({
      session,
      currentOwner,
      text: currentText,
      textFlow: currentTextFlow,
      fieldText: currentFieldText,
      reason,
    });
    if (!rollback.applied || !rollback.focus) {
      return reject();
    }

    const nextTextDrafts = { ...snapshot.textDrafts, [blockId]: rollback.text };
    const nextFieldDrafts = hasFormulaAuthority
      ? {
        ...snapshot.fieldDrafts,
        [blockId]: {
          ...(block ? formulaFieldsFromBlock(block) : {}),
          ...(currentFieldDraft || {}),
          latex_input: rollback.fieldText ?? rollback.text,
        },
      }
      : snapshot.fieldDrafts;

    let textFlowEdit = Promise.resolve();
    flushSync(() => {
      setBlockTextDrafts(nextTextDrafts);
      if (rollback.textFlow) {
        textFlowEdit = applyBlockTextFlowEdit(block ?? { id: blockId }, rollback.textFlow, {
          previousTextFlow: currentTextFlow,
        });
      }
      if (hasFormulaAuthority) setBlockFieldDrafts(nextFieldDrafts);
    });

    if (!block) {
      console.warn('Slash block rollback was not durably saved:', {
        blockId,
        exitReason: reason,
        reason: 'block_unavailable',
        durableOutcome: 'not_attempted',
      });
    } else {
      try {
        const blockSave = saveBlock(block, rollback.text, {
          silent: true,
          fieldValues: hasFormulaAuthority ? nextFieldDrafts[blockId] : undefined,
          textFlow: rollback.textFlow || undefined,
        });
        void blockSave.then((saveOutcome) => {
          if (saveOutcome.status === 'saved') return;
          console.warn('Slash block rollback was not durably saved:', {
            blockId,
            exitReason: reason,
            reason: 'block_save_receipt_unavailable',
            durableOutcome: 'unknown',
          });
        }).catch((error) => {
          console.error('Failed to persist Slash block rollback:', {
            blockId,
            exitReason: reason,
            reason: 'block_save_failed',
            durableOutcome: 'unknown',
            error,
          });
        });
      } catch (error) {
        console.error('Failed to persist Slash block rollback:', {
          blockId,
          exitReason: reason,
          reason: 'block_save_failed',
          durableOutcome: 'unknown',
          error,
        });
      }
    }
    void textFlowEdit.catch((error) => {
      console.error('Failed to persist Slash annotation rollback:', {
        blockId,
        exitReason: reason,
        reason: 'annotation_save_failed',
        error,
      });
    });

    return rollback;
  }, [
    applyBlockTextFlowEdit,
    readBlockDraftSnapshot,
    saveBlock,
    setBlockFieldDrafts,
    setBlockTextDrafts,
  ]);
}
