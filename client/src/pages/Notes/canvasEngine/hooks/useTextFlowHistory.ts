import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { RuntimeHistoryEntry } from '../historyService';
import type { BoardRangeSaveSnapshot } from '../boardTextRangeEditSession';
import type { AnnotationTruthV1, NoteBlock, TextBlockContentV1 } from '../runtimeDataTypes';
import { createTextFlowEditSession, restoreAnnotationRangeSnapshots, type TextFlowEditBoundary, type TextFlowEditMetadata, type TextFlowEditSelection, type TextFlowEditSnapshot, type TextFlowEditTransaction } from '../textFlowEditSession';
import { createTextBlockContentV1, getTextFlowContent } from '../textFlowService';
import { useBlockTextFlowEditController, type ApplyBlockTextFlowEdit } from './useBlockTextFlowEditController';
import type { BlockSaveOutcome, useNoteCanvasDataAdapter } from './useNoteCanvasDataAdapter';
import type { TemplateOption } from '@/services/templateOptions';
import { contentForEditedTextFlowBlock, plainTextForBlockContent, presentationKindForBlock } from '../blockContentService';
import { buildBlockTemplatePayload, type BlockTemplatePayload } from '../blockTemplateConversionService';
import type { BlockBoxLayout } from '../runtimeLayout';
import { extractTextUnit } from '../textUnitExtractionService';
import { moveTextUnitBetweenFlows, type TextUnitIdMapping } from '../textUnitMoveService';
import { TEXT_FLOW_CONTENT_KEY } from '../textFlowService';

export interface TextFlowHistoryHost {
  pushHistoryEntry: (entry: RuntimeHistoryEntry, options?: { skipBoundary?: boolean }) => boolean;
  enqueueRuntimeHistoryOperation: (operation: () => Promise<boolean>) => Promise<boolean>;
  whenHistoryIdle: () => Promise<boolean>;
  isReplaying?: () => boolean;
}

interface Options {
  noteId: string;
  generation: number;
  blocks: NoteBlock[];
  annotationTruths: AnnotationTruthV1[];
  readAnnotationTruths: () => AnnotationTruthV1[];
  setAnnotationTruthsSnapshot: (annotations: AnnotationTruthV1[]) => void;
  blockTextFlowDrafts: Record<string, TextBlockContentV1>;
  setBlockTextFlowDrafts: Dispatch<SetStateAction<Record<string, TextBlockContentV1>>>;
  setBlockTextDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  captureBoardTextRanges: (blockId: string) => BoardRangeSaveSnapshot;
  restoreBoardTextRanges: (blockId: string, flow: TextBlockContentV1 | null, snapshot: BoardRangeSaveSnapshot) => void;
  rebaseBoardTextRanges: (blockId: string, previous: TextBlockContentV1 | null, next: TextBlockContentV1) => void;
  saveBlock: ReturnType<typeof useNoteCanvasDataAdapter>['saveBlock'];
  applyTemplateToBlock?: ReturnType<typeof useNoteCanvasDataAdapter>['applyTemplateToBlock'];
  createDraftBlock?: ReturnType<typeof useNoteCanvasDataAdapter>['createDraftBlock'];
  saveDraftBlockPlacement?: ReturnType<typeof useNoteCanvasDataAdapter>['saveDraftBlockPlacement'];
  discardDraftBlock?: ReturnType<typeof useNoteCanvasDataAdapter>['discardDraftBlock'];
  trashBlock?: ReturnType<typeof useNoteCanvasDataAdapter>['trashBlock'];
  restoreBlock?: ReturnType<typeof useNoteCanvasDataAdapter>['restoreBlock'];
  transferTextUnit?: ReturnType<typeof useNoteCanvasDataAdapter>['transferTextUnit'];
  saveAnnotationTruthsOutcome: (annotations: AnnotationTruthV1[], options?: { preserveDrafts?: boolean }) => Promise<boolean>;
  history: MutableRefObject<TextFlowHistoryHost | null>;
  onSaveFailure?: () => void;
}

interface TemplateSnapshot extends Omit<TextFlowEditSnapshot, 'textFlow'> {
  textFlow: TextBlockContentV1 | null;
  payload: BlockTemplatePayload;
}

interface TemplateTransaction {
  blockId: string;
  template: TemplateOption;
  before: TemplateSnapshot;
  after: TemplateSnapshot;
  typingRecovery?: TextFlowEditSnapshot;
}

export interface DocumentTextFlowEdit {
  block: NoteBlock;
  previousTextFlow: TextBlockContentV1;
  nextTextFlow: TextBlockContentV1;
  metadata: TextFlowEditMetadata;
}

interface DocumentTransaction {
  blocks: { edit: TextFlowEditTransaction; typingRecovery: TextFlowEditSnapshot }[];
  move?: {
    sourceBlock: NoteBlock; targetBlock: NoteBlock; textUnitId: string;
    idMapping: TextUnitIdMapping;
    appliedSide: 'before' | 'after'; unresolvedTransfer?: 'before' | 'after';
    sourcePayload: TransferPayloads; targetPayload: TransferPayloads;
  };
  extraction?: {
    sourceBlock: NoteBlock; textUnitId: string; template: TemplateOption; layout: BlockBoxLayout;
    extracted: TextBlockContentV1; createdBlock: NoteBlock | null; createdVisible: boolean;
    appliedSide: 'before' | 'after';
    clientCreateKey: string; placementPersisted: boolean;
    sourcePayload: { before: Pick<BlockTemplatePayload, 'content_json' | 'plain_text'>; after: Pick<BlockTemplatePayload, 'content_json' | 'plain_text'> };
    createdPayload?: { before: Pick<BlockTemplatePayload, 'content_json' | 'plain_text'>; after: Pick<BlockTemplatePayload, 'content_json' | 'plain_text'> };
    unresolvedTransfer?: 'before' | 'after';
  };
}

type TransferPayloads = {
  before: Pick<BlockTemplatePayload, 'content_json' | 'plain_text'>;
  after: Pick<BlockTemplatePayload, 'content_json' | 'plain_text'>;
};

const blockPayload = ({ block_type, title, content_json, plain_text, metadata }: NoteBlock): BlockTemplatePayload => (
  structuredClone({ block_type, title, content_json, plain_text, metadata })
);

const plainTextFromTextFlow = (flow: TextBlockContentV1) => flow.units.map((unit) => unit.text).join('\n');
const rejected = (): Extract<BlockSaveOutcome, { status: 'rejected' }> => ({
  status: 'rejected', block: null, recoveryReceipt: null, reconciliation: 'not_attempted',
  durableState: 'not_checked', reason: 'request_failed', staleEpoch: false,
});

/** One pending typing group feeds the host's existing history; save retries never record history. */
export function useTextFlowHistory(options: Options) {
  const latest = useRef(options);
  latest.current = options;
  const active = useRef<object | null>(null);
  const mounted = useRef(true);
  const [replayScope, setReplayScope] = useState<object | null>(null);
  const [selectionRequest, setSelectionRequest] = useState<{ token: object; blockId: string; selection: TextFlowEditSelection } | null>(null);
  const appliedSelection = useRef(selectionRequest);
  useLayoutEffect(() => {
    if (!selectionRequest || appliedSelection.current === selectionRequest
      || active.current !== selectionRequest.token || replayScope === selectionRequest.token) return;
    const editor = Array.from(document.querySelectorAll<HTMLTextAreaElement>('textarea[data-runtime-textflow-editor="true"]'))
      .find((node) => node.dataset.blockId === selectionRequest.blockId && node.dataset.textUnitId === selectionRequest.selection.unitId);
    if (!editor) return;
    appliedSelection.current = selectionRequest;
    editor.focus();
    editor.setSelectionRange(selectionRequest.selection.start, selectionRequest.selection.end);
  }, [selectionRequest, replayScope]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const scope = useMemo(() => {
    const token = {};
    const current = () => mounted.current && active.current === token;
    let replaying = false;
    let templatePending = false;
    let documentPending = false;
    // Recovery attempts are keyed by the same immutable history entry, never a second undo stack.
    const failures = new Map<TextFlowEditTransaction, 'before' | 'after'>();
    const lastSave = new Map<string, { transaction: TextFlowEditTransaction; side: 'before' | 'after'; outcome: BlockSaveOutcome }>();
    // Failed conversion intents are recovery metadata for existing reversibleEdit entries.
    const templateFailures = new Map<TemplateTransaction, 'before' | 'after'>();
    const lastTemplateSave = new Map<string, { transaction: TemplateTransaction; side: 'before' | 'after'; block: NoteBlock | null }>();
    const documentFailures = new Map<DocumentTransaction, 'before' | 'after'>();
    const documentProgress = new WeakMap<DocumentTransaction, { side: 'before' | 'after'; completed: Set<string> }>();
    const issuedBases = new WeakMap<object, Map<'before' | 'after', number>>();
    const committedBases = new Map<string, number>();
    const transactionOrder = new WeakMap<TextFlowEditTransaction, number>();
    let nextTransactionOrder = 0;
    const baseFor = (transaction: object, side: 'before' | 'after', block: NoteBlock) => {
      let sides = issuedBases.get(transaction);
      if (!sides) { sides = new Map(); issuedBases.set(transaction, sides); }
      if (!sides.has(side)) sides.set(side, Math.max(block.text_save_revision ?? 0, committedBases.get(block.id) ?? 0));
      return sides.get(side)!;
    };
    const confirmBlock = (block: NoteBlock) => {
      if (typeof block.text_save_revision === 'number') committedBases.set(block.id, block.text_save_revision);
    };
    const committed = (transaction: object, block: NoteBlock) => {
      issuedBases.delete(transaction);
      confirmBlock(block);
    };
    const setDocumentPending = (value: boolean) => {
      documentPending = value;
      // A rejected pair write can leave every draft unchanged. Keep a visible
      // recovery state so React does not batch true -> null into no render and
      // hide both retry controls while documentFailures still owns the entry.
      if (current()) setReplayScope(value || documentFailures.size > 0 ? token : null);
    };
    const restoreSelection = (blockId: string, selection: TextFlowEditSelection) => {
      if (current()) setSelectionRequest({ token, blockId, selection });
    };
    const persist = async (transaction: TextFlowEditTransaction, side: 'before' | 'after', replay: boolean, recovery?: TextFlowEditSnapshot): Promise<boolean> => {
      if (!current()) return false;
      if (!transactionOrder.has(transaction)) transactionOrder.set(transaction, ++nextTransactionOrder);
      // A later body includes earlier typing. Confirm its failed dependencies
      // first, using their frozen snapshots and original OCC bases, before the
      // later transaction is allowed to publish any of its resources.
      for (const [earlier, earlierSide] of [...failures.entries()]) {
        if (earlier.blockId !== transaction.blockId || earlier === transaction
          || transactionOrder.get(earlier)! >= transactionOrder.get(transaction)!) continue;
        if (!await persist(earlier, earlierSide, false) || !current()) {
          failures.set(transaction, side);
          latest.current.onSaveFailure?.();
          return false;
        }
      }
      const api = latest.current;
      const block = api.blocks.find((candidate) => candidate.id === transaction.blockId);
      if (!block) { failures.set(transaction, side); api.onSaveFailure?.(); return false; }
      const snapshot = recovery ?? transaction[side];
      let outcome: BlockSaveOutcome = rejected();
      let success = false;
      try {
        if (replay) {
          replaying = true;
          setReplayScope(token);
          api.setBlockTextFlowDrafts((drafts) => ({ ...drafts, [block.id]: snapshot.textFlow }));
          api.setBlockTextDrafts((drafts) => ({ ...drafts, [block.id]: plainTextFromTextFlow(snapshot.textFlow) }));
          api.setAnnotationTruthsSnapshot(restoreAnnotationRangeSnapshots(api.readAnnotationTruths(), snapshot.annotationRanges));
          api.restoreBoardTextRanges(block.id, snapshot.textFlow, { ranges: snapshot.boardRanges });
        }
        outcome = await api.saveBlock(block, plainTextFromTextFlow(snapshot.textFlow), {
          silent: true, textFlow: snapshot.textFlow, boardRangeSnapshot: { ranges: snapshot.boardRanges }, preserveDrafts: true,
          annotationRanges: snapshot.annotationRanges,
          baseRevision: baseFor(transaction, side, block),
        });
        if (!current()) return false;
        success = outcome.status === 'saved';
        if (success && outcome.block) committed(transaction, outcome.block);
      } catch {
        success = false;
        outcome = rejected();
      } finally {
        if (current()) {
          replaying = false;
          if (replay) setReplayScope(null);
          if (success) {
            failures.delete(transaction);
            if (recovery) for (const failed of failures.keys()) {
              if (failed.blockId === block.id) { failures.delete(failed); issuedBases.delete(failed); }
            }
          }
          else { failures.set(transaction, side); api.onSaveFailure?.(); }
          lastSave.set(block.id, { transaction, side, outcome });
          if (replay) restoreSelection(block.id, snapshot.selection);
        }
      }
      return current() && success;
    };
    const persistTemplate = async (transaction: TemplateTransaction, side: 'before' | 'after'): Promise<boolean> => {
      if (!current()) return false;
      const api = latest.current;
      // Keep current provenance; only the five adjudicated fields belong to history.
      const block = api.blocks.find((candidate) => candidate.id === transaction.blockId);
      const snapshot = transaction[side];
      let updated: NoteBlock | null = null;
      let success = false;
      replaying = true;
      setReplayScope(token);
      try {
        if (!block || !api.applyTemplateToBlock) return false;
        // A conversion must not strand an earlier failed typing save, nor let a
        // later generic blur retry reinsert that paragraph into a formula.
        const failedTyping = [...failures.entries()].find(([failed]) => failed.blockId === block.id);
        if (failedTyping) {
          if (!transaction.typingRecovery
            || !await persist(failedTyping[0], failedTyping[1], false, transaction.typingRecovery)
            || !current()) return false;
          replaying = true;
        }
        api.setBlockTextFlowDrafts((drafts) => {
          const next = { ...drafts };
          if (snapshot.textFlow) next[block.id] = structuredClone(snapshot.textFlow);
          else delete next[block.id];
          return next;
        });
        api.setBlockTextDrafts((drafts) => ({ ...drafts, [block.id]: snapshot.payload.plain_text ?? '' }));
        api.setAnnotationTruthsSnapshot(restoreAnnotationRangeSnapshots(api.readAnnotationTruths(), snapshot.annotationRanges));
        updated = await api.applyTemplateToBlock(block, transaction.template, snapshot.payload.plain_text ?? '', {
          historySnapshot: { payload: structuredClone(snapshot.payload), boardRanges: { ranges: structuredClone(snapshot.boardRanges) }, annotationRanges: snapshot.annotationRanges },
          baseRevision: baseFor(transaction, side, block),
        });
        if (!current()) return false;
        success = updated !== null;
        if (updated) committed(transaction, updated);
      } catch {
        success = false;
      } finally {
        if (current()) {
          replaying = false;
          setReplayScope(null);
          if (success) templateFailures.delete(transaction);
          else { templateFailures.set(transaction, side); api.onSaveFailure?.(); }
          lastTemplateSave.set(transaction.blockId, { transaction, side, block: success ? updated : null });
          restoreSelection(transaction.blockId, snapshot.selection);
        }
      }
      return current() && success;
    };
    // Extraction and migration use the same atomic pair write and frozen OCC
    // bases. Only extraction owns a destination block lifecycle.
    const persistUnitTransfer = async (
      transaction: DocumentTransaction, side: 'before' | 'after',
      state: { sourceBlock: NoteBlock; targetBlock: NoteBlock; textUnitId: string;
        idMapping?: TextUnitIdMapping;
        sourcePayload: TransferPayloads; targetPayload: TransferPayloads },
    ): Promise<{ sourceBlock: NoteBlock; targetBlock: NoteBlock } | null> => {
      if (!current() || !latest.current.transferTextUnit) return null;
      const [source, target] = transaction.blocks;
      const original = latest.current.blocks.find((block) => block.id === source.edit.blockId) ?? state.sourceBlock;
      const destination = latest.current.blocks.find((block) => block.id === target.edit.blockId) ?? state.targetBlock;
      const forward = side === 'after';
      const result = await latest.current.transferTextUnit({
        sourceBlock: forward ? original : destination, targetBlock: forward ? destination : original,
        textUnitId: forward ? state.textUnitId : state.idMapping?.unit_id ?? state.textUnitId,
        ...(state.idMapping ? { idMapping: forward ? state.idMapping : {
          unit_id: state.textUnitId,
          inline_ids: Object.fromEntries(Object.entries(state.idMapping.inline_ids).map(([from, to]) => [to, from])),
        } } : {}),
        sourceTextFlow: forward ? source.edit.after.textFlow : target.edit.before.textFlow,
        targetTextFlow: forward ? target.edit.after.textFlow : source.edit.before.textFlow,
        sourcePayload: forward ? state.sourcePayload.after : state.targetPayload.before,
        targetPayload: forward ? state.targetPayload.after : state.sourcePayload.before,
        sourceBaseRevision: baseFor(forward ? source.edit : target.edit, side, forward ? original : destination),
        targetBaseRevision: baseFor(forward ? target.edit : source.edit, side, forward ? destination : original),
      });
      if (!current() || !result) return null;
      const sourceBlock = forward ? result.sourceBlock : result.targetBlock;
      const targetBlock = forward ? result.targetBlock : result.sourceBlock;
      for (const { edit } of transaction.blocks) {
        const block = edit.blockId === sourceBlock.id ? sourceBlock : targetBlock;
        committed(edit, block);
        lastSave.set(edit.blockId, { transaction: edit, side,
          outcome: { status: 'saved', block, recoveryReceipt: null, reconciliation: 'response' } });
      }
      return { sourceBlock, targetBlock };
    };
    const persistMove = async (transaction: DocumentTransaction, side: 'before' | 'after', replay: boolean): Promise<boolean> => {
      const move = transaction.move!;
      documentFailures.set(transaction, side);
      setDocumentPending(true);
      let success = false;
      try {
        if (!current()) return false;
        // A failed response can already have committed. Reconcile the original
        // direction first, retaining its exact two bases, before reversing it.
        if (move.unresolvedTransfer && move.unresolvedTransfer !== side) {
          if (!await persistMove(transaction, move.unresolvedTransfer, false) || !current()) return false;
          documentFailures.set(transaction, side);
          setDocumentPending(true);
        }
        for (const { edit, typingRecovery } of transaction.blocks) {
          const failedTyping = [...failures.entries()].find(([failed]) => failed.blockId === edit.blockId);
          if (failedTyping && !await persist(failedTyping[0], failedTyping[1], false, typingRecovery)) return false;
          if (!current()) return false;
        }
        if (move.appliedSide !== side) {
          move.unresolvedTransfer = side;
          const result = await persistUnitTransfer(transaction, side, move);
          if (!current() || !result) return false;
          Object.assign(move, result);
          move.appliedSide = side;
          move.unresolvedTransfer = undefined;
        }
        success = true;
        documentFailures.delete(transaction);
        return true;
      } catch {
        return false;
      } finally {
        if (current()) {
          if (!success) latest.current.onSaveFailure?.();
          setDocumentPending(false);
          if (replay && success) restoreSelection(side === 'after' ? move.targetBlock.id : move.sourceBlock.id,
            { ...transaction.blocks[0].edit.before.selection, unitId: side === 'after' ? move.idMapping.unit_id : move.textUnitId });
        }
      }
    };
    const persistExtraction = async (transaction: DocumentTransaction, side: 'before' | 'after', replay: boolean): Promise<boolean> => {
      const extraction = transaction.extraction!;
      documentFailures.set(transaction, side);
      setDocumentPending(true);
      let success = false;
      try {
        if (!current()) return false;
        const api = latest.current;
        if (!api.createDraftBlock || !api.saveDraftBlockPlacement || !api.discardDraftBlock
          || !api.trashBlock || !api.restoreBlock || !api.transferTextUnit) return false;
        // Resolve an earlier lost response before reversing it. In particular,
        // never trash a destination whose durable move is still unconfirmed.
        if (extraction.unresolvedTransfer && extraction.unresolvedTransfer !== side) {
          if (!await persistExtraction(transaction, extraction.unresolvedTransfer, false) || !current()) return false;
          setDocumentPending(true);
          documentFailures.set(transaction, side);
        }
        const source = transaction.blocks[0];
        const failedTyping = [...failures.entries()].find(([failed]) => failed.blockId === source.edit.blockId);
        if (failedTyping && !await persist(failedTyping[0], failedTyping[1], false, source.typingRecovery)) return false;
        if (!current()) return false;
        if (side === 'after' && !extraction.createdBlock) {
          const emptyFlow: TextBlockContentV1 = { ...extraction.extracted, units: [], inline_structures: [] };
          const receipt = await api.createDraftBlock(extraction.template, '', {
            contentJson: { [TEXT_FLOW_CONTENT_KEY]: emptyFlow }, layout: extraction.layout, silent: true,
            clientCreateKey: extraction.clientCreateKey,
          });
          if (!current() || !receipt) return false;
          const created = receipt.block;
          extraction.createdBlock = created;
          extraction.createdVisible = true;
          extraction.placementPersisted = receipt.placementPersisted;
          extraction.createdPayload = structuredClone({
            before: { content_json: created.content_json, plain_text: created.plain_text },
            after: { content_json: contentForEditedTextFlowBlock(created, extraction.extracted), plain_text: plainTextFromTextFlow(extraction.extracted) },
          });
          const before = { textFlow: emptyFlow, selection: source.edit.before.selection, annotationRanges: [], boardRanges: [] };
          transaction.blocks.push({ edit: { ...source.edit, blockId: created.id, before,
            after: { ...before, textFlow: extraction.extracted, selection: source.edit.before.selection } }, typingRecovery: before });
          if (!receipt.placementPersisted) return false;
        }
        if (side === 'after' && extraction.createdBlock && !extraction.createdVisible) {
          const restored = await api.restoreBlock(extraction.createdBlock, { silent: true });
          if (!current() || !restored) return false;
          extraction.createdBlock = restored;
          extraction.createdVisible = true;
        }
        if (side === 'after' && extraction.createdBlock && !extraction.placementPersisted) {
          const placed = await api.saveDraftBlockPlacement(extraction.createdBlock, extraction.layout, extraction.clientCreateKey, api.noteId);
          if (!current() || !placed) return false;
          extraction.createdBlock = placed;
          extraction.placementPersisted = true;
        }
        if (extraction.createdBlock && extraction.appliedSide !== side) {
          extraction.unresolvedTransfer = side;
          const result = await persistUnitTransfer(transaction, side, {
            sourceBlock: extraction.sourceBlock, targetBlock: extraction.createdBlock, textUnitId: extraction.textUnitId,
            sourcePayload: extraction.sourcePayload, targetPayload: extraction.createdPayload!,
          });
          if (!current() || !result) return false;
          extraction.sourceBlock = result.sourceBlock;
          extraction.createdBlock = result.targetBlock;
          extraction.appliedSide = side;
          extraction.unresolvedTransfer = undefined;
        }
        if (side === 'before' && extraction.createdBlock && extraction.createdVisible) {
          if (!await api.trashBlock(extraction.createdBlock.id, { silent: true }) || !current()) return false;
          extraction.createdVisible = false;
        }
        if (side === 'before' && !extraction.createdBlock) {
          if (!await api.discardDraftBlock(api.noteId, extraction.clientCreateKey) || !current()) return false;
          // No destination identity was confirmed. The canceled create key must
          // not be replayed if this same history entry is redone later.
          extraction.clientCreateKey = `unit-extraction:${crypto.randomUUID()}`;
        }
        success = true;
        documentFailures.delete(transaction);
        return true;
      } catch {
        return false;
      } finally {
        if (current()) {
          if (!success) latest.current.onSaveFailure?.();
          setDocumentPending(false);
          if (replay && success) {
            const source = transaction.blocks[0].edit;
            restoreSelection(side === 'after' ? extraction.createdBlock!.id : source.blockId, source.before.selection);
          }
        }
      }
    };
    // One entry owns the ordered block snapshots. The server still receives the
    // existing individual saves; a same-side retry only finishes missing blocks.
    const persistDocument = async (transaction: DocumentTransaction, side: 'before' | 'after', replay = false): Promise<boolean> => {
      if (transaction.extraction) return persistExtraction(transaction, side, replay);
      if (transaction.move) return persistMove(transaction, side, replay);
      if (!current()) return false;
      let progress = documentProgress.get(transaction);
      if (!progress || progress.side !== side) {
        progress = { side, completed: new Set() };
        documentProgress.set(transaction, progress);
      }
      documentFailures.set(transaction, side);
      setDocumentPending(true);
      let success = false;
      try {
        const api = latest.current;
        // Restore all local fields together, including blocks whose durable save
        // was already completed by an earlier attempt of this same direction.
        for (const { edit } of transaction.blocks) {
          const snapshot = edit[side];
          api.setBlockTextFlowDrafts((drafts) => ({ ...drafts, [edit.blockId]: structuredClone(snapshot.textFlow) }));
          api.setBlockTextDrafts((drafts) => ({ ...drafts, [edit.blockId]: plainTextFromTextFlow(snapshot.textFlow) }));
          api.setAnnotationTruthsSnapshot(restoreAnnotationRangeSnapshots(api.readAnnotationTruths(), snapshot.annotationRanges));
          api.restoreBoardTextRanges(edit.blockId, snapshot.textFlow, { ranges: snapshot.boardRanges });
        }
        for (const { edit, typingRecovery } of transaction.blocks) {
          if (!current()) return false;
          if (progress.completed.has(edit.blockId)) continue;
          // Earlier typing was sealed before this entry was reserved. If its
          // queued write failed, retire that recovery using the complete state
          // immediately before the document edit, never an older typing body.
          const failedTyping = [...failures.entries()].find(([failed]) => failed.blockId === edit.blockId);
          if (failedTyping && !await persist(failedTyping[0], failedTyping[1], false, typingRecovery)) return false;
          if (!current()) return false;
          const block = latest.current.blocks.find((candidate) => candidate.id === edit.blockId);
          if (!block) return false;
          const snapshot = edit[side];
          let outcome = await latest.current.saveBlock(block, plainTextFromTextFlow(snapshot.textFlow), {
            silent: true, textFlow: snapshot.textFlow, boardRangeSnapshot: { ranges: snapshot.boardRanges }, preserveDrafts: true,
            annotationRanges: snapshot.annotationRanges,
            baseRevision: baseFor(edit, side, block),
          });
          if (!current()) return false;
          if (!current()) return false;
          lastSave.set(edit.blockId, { transaction: edit, side, outcome });
          if (outcome.status !== 'saved') return false;
          committed(edit, outcome.block);
          progress.completed.add(edit.blockId);
        }
        success = true;
        documentFailures.delete(transaction);
        return true;
      } catch {
        return false;
      } finally {
        if (current()) {
          if (!success) latest.current.onSaveFailure?.();
          setDocumentPending(false);
          const first = transaction.blocks[0]?.edit;
          if (replay && first) restoreSelection(first.blockId, first[side].selection);
        }
      }
    };
    const session = createTextFlowEditSession({
      noteId: options.noteId, generation: options.generation,
      onSeal(transaction) {
        if (!current()) return;
        const host = latest.current.history.current;
        if (!host?.pushHistoryEntry({
          type: 'reversibleEdit',
          undo: () => persist(transaction, 'before', true),
          redo: () => persist(transaction, 'after', true),
        }, { skipBoundary: true })) return;
        void host.enqueueRuntimeHistoryOperation(() => persist(transaction, 'after', false));
      },
    });
    return { token, current, session, failures, lastSave, persist, templateFailures, lastTemplateSave, persistTemplate, confirmBlock,
      documentFailures, persistDocument, setDocumentPending,
      setTemplatePending(value: boolean) { templatePending = value; if (current()) setReplayScope(value ? token : null); },
      isReplaying: () => replaying || templatePending || documentPending };
  }, [options.noteId, options.generation]);
  active.current = scope.token;

  const apply = useBlockTextFlowEditController({
    annotationTruths: options.annotationTruths,
    blockTextFlowDrafts: options.blockTextFlowDrafts,
    setBlockTextFlowDrafts: options.setBlockTextFlowDrafts,
    saveAnnotationTruths: options.setAnnotationTruthsSnapshot,
    rebaseBoardTextRanges: options.rebaseBoardTextRanges,
    captureBoardTextRanges: (id) => options.captureBoardTextRanges(id).ranges,
    onEditApplied(change) {
      if (!scope.current() || !change.previousTextFlow) return;
      const beforeUnit = change.previousTextFlow.units[0];
      const afterUnit = change.nextTextFlow.units[0];
      if (!beforeUnit || !afterUnit) return;
      const metadata = change.options?.metadata ?? {
        unitId: beforeUnit.id, inputType: 'structure', kind: 'structural' as const, isComposing: false,
        beforeSelection: { unitId: beforeUnit.id, start: 0, end: 0 },
        afterSelection: { unitId: afterUnit.id, start: 0, end: 0 },
      };
      scope.session.record({
        noteId: options.noteId, generation: options.generation, blockId: change.block.id, metadata,
        before: { textFlow: change.previousTextFlow, selection: metadata.beforeSelection, annotationRanges: change.beforeAnnotationRanges, boardRanges: change.beforeBoardRanges },
        after: { textFlow: change.nextTextFlow, selection: metadata.afterSelection, annotationRanges: change.afterAnnotationRanges, boardRanges: change.afterBoardRanges },
      });
    },
  });
  const applyEdit: ApplyBlockTextFlowEdit = useCallback(async (block, flow, editOptions) => {
    if (!scope.current() || scope.isReplaying() || scope.templateFailures.size || scope.documentFailures.size || latest.current.history.current?.isReplaying?.()) return;
    const fullBlock = latest.current.blocks.find((candidate) => candidate.id === block.id);
    const previousTextFlow = editOptions?.previousTextFlow
      ?? (!latest.current.blockTextFlowDrafts[block.id] && !getTextFlowContent(block.content_json ?? {}) && fullBlock
        ? createTextBlockContentV1(fullBlock.plain_text ?? '') : undefined);
    return apply(block, flow, { ...editOptions, previousTextFlow });
  }, [apply, scope]);
  const boundary = useCallback((reason?: TextFlowEditBoundary, selection?: TextFlowEditSelection): boolean => {
    if (!scope.current() || scope.isReplaying() || latest.current.history.current?.isReplaying?.()) return false;
    if (reason === 'compositionStart') { scope.session.beginComposition(); return true; }
    if (reason === 'compositionEnd') { scope.session.endComposition(); return true; }
    if (reason === 'selection' && selection) return scope.session.selectionChanged(selection);
    return scope.session.seal();
  }, [scope]);
  const applyDocumentEdit = useCallback(async (changes: DocumentTextFlowEdit[]): Promise<boolean> => {
    if (!changes.length || !scope.current() || scope.templateFailures.size || scope.documentFailures.size
      || !boundary() || changes.some((change) => change.metadata.isComposing)) return false;
    const api = latest.current;
    const host = api.history.current;
    if (!host || new Set(changes.map((change) => change.block.id)).size !== changes.length
      || changes.some((change) => !api.blocks.some((block) => block.id === change.block.id))
      || changes.every((change) => JSON.stringify(change.previousTextFlow) === JSON.stringify(change.nextTextFlow))) return false;
    const transaction: DocumentTransaction = {
      blocks: changes.map((change) => {
        const before: TextFlowEditSnapshot = {
          textFlow: change.previousTextFlow, selection: change.metadata.beforeSelection,
          annotationRanges: api.readAnnotationTruths().flatMap((annotation) => annotation.ranges
            .filter((range) => range.block_id === change.block.id).map((range) => ({ annotationId: annotation.id, range }))),
          boardRanges: api.captureBoardTextRanges(change.block.id).ranges,
        };
        return structuredClone({
          edit: { noteId: api.noteId, generation: api.generation, blockId: change.block.id, metadata: change.metadata,
            before, after: { textFlow: change.nextTextFlow, selection: change.metadata.afterSelection, annotationRanges: [], boardRanges: [] } },
          typingRecovery: structuredClone(before),
        });
      }),
    };
    // Seal and reserve before applying drafts or awaiting work. No per-block
    // controller invocation below is allowed to create another history entry.
    if (!host.pushHistoryEntry({ type: 'reversibleEdit',
      undo: () => scope.persistDocument(transaction, 'before', true), redo: () => scope.persistDocument(transaction, 'after', true),
    }, { skipBoundary: true })) return false;
    scope.setDocumentPending(true);
    const applied = changes.map((change, index) => {
      const result = apply(change.block, change.nextTextFlow, {
        previousTextFlow: change.previousTextFlow, metadata: change.metadata, skipHistory: true,
      });
      api.setBlockTextDrafts((drafts) => ({ ...drafts, [change.block.id]: plainTextFromTextFlow(change.nextTextFlow) }));
      const edit = transaction.blocks[index].edit;
      const afterBoard = api.captureBoardTextRanges(change.block.id).ranges;
      edit.before.boardRanges = edit.before.boardRanges.filter((range) => {
        const next = afterBoard.find((candidate) => candidate.id === range.id);
        return next && JSON.stringify(next) !== JSON.stringify(range);
      });
      edit.after.boardRanges = structuredClone(edit.before.boardRanges.map((range) => afterBoard.find((candidate) => candidate.id === range.id)!));
      return result.then((ranges) => {
        edit.before.annotationRanges = structuredClone(ranges.beforeAnnotationRanges);
        edit.after.annotationRanges = structuredClone(ranges.afterAnnotationRanges);
      });
    });
    // Install rejection handling immediately; earlier queued saves may still be
    // in flight while this local snapshot preparation completes.
    const prepared = Promise.all(applied).then(() => true, () => false);
    try {
      return await host.enqueueRuntimeHistoryOperation(async () => {
        if (!await prepared || !scope.current()) {
          if (scope.current()) {
            scope.documentFailures.set(transaction, 'after');
            latest.current.onSaveFailure?.();
          }
          return false;
        }
        return scope.persistDocument(transaction, 'after');
      });
    } finally {
      scope.setDocumentPending(false);
    }
  }, [apply, boundary, scope]);
  const extractUnit = useCallback(async (block: NoteBlock, textUnitId: string, template: TemplateOption, layout: BlockBoxLayout): Promise<boolean> => {
    if (!scope.current() || scope.templateFailures.size || scope.documentFailures.size || !boundary()) return false;
    const api = latest.current;
    const host = api.history.current;
    const live = api.blocks.find((candidate) => candidate.id === block.id);
    if (!host || !live || !api.transferTextUnit || !api.createDraftBlock || !api.saveDraftBlockPlacement
      || !api.discardDraftBlock || !api.trashBlock || !api.restoreBlock) return false;
    const flow = api.blockTextFlowDrafts[block.id] ?? getTextFlowContent(live.content_json);
    const split = flow && extractTextUnit(flow, textUnitId);
    if (!flow || !split) return false;
    const selection = { unitId: textUnitId, start: 0, end: 0 };
    const before: TextFlowEditSnapshot = { textFlow: flow, selection,
      annotationRanges: api.readAnnotationTruths().flatMap((annotation) => annotation.ranges
        .filter((range) => range.block_id === block.id).map((range) => ({ annotationId: annotation.id, range }))),
      boardRanges: api.captureBoardTextRanges(block.id).ranges };
    const transaction: DocumentTransaction = structuredClone({
      blocks: [{ edit: { noteId: api.noteId, generation: api.generation, blockId: block.id,
        metadata: { unitId: textUnitId, inputType: 'extractTextUnit', kind: 'structural', isComposing: false,
          beforeSelection: selection, afterSelection: selection }, before,
        after: { ...before, textFlow: split.remaining } }, typingRecovery: before }],
      extraction: { sourceBlock: live, textUnitId, template, layout, extracted: split.extracted,
        createdBlock: null, createdVisible: false, appliedSide: 'before', placementPersisted: false,
        clientCreateKey: `unit-extraction:${crypto.randomUUID()}`,
        sourcePayload: {
          before: JSON.stringify(flow) === JSON.stringify(getTextFlowContent(live.content_json))
            ? { content_json: live.content_json, plain_text: live.plain_text }
            : { content_json: contentForEditedTextFlowBlock(live, flow), plain_text: plainTextFromTextFlow(flow) },
          after: { content_json: contentForEditedTextFlowBlock(live, split.remaining), plain_text: plainTextFromTextFlow(split.remaining) },
        } },
    });
    if (!host.pushHistoryEntry({ type: 'reversibleEdit',
      undo: () => scope.persistDocument(transaction, 'before', true),
      redo: () => scope.persistDocument(transaction, 'after', true),
    }, { skipBoundary: true })) return false;
    scope.setDocumentPending(true);
    try { return await host.enqueueRuntimeHistoryOperation(() => scope.persistDocument(transaction, 'after')); }
    finally { scope.setDocumentPending(false); }
  }, [boundary, scope]);
  const moveUnit = useCallback(async (
    block: NoteBlock, textUnitId: string, targetBlock: NoteBlock, targetUnitId: string, edge: 'before' | 'after',
  ): Promise<boolean> => {
    if (!scope.current() || scope.templateFailures.size || scope.documentFailures.size || !boundary()) return false;
    const api = latest.current;
    const host = api.history.current;
    // The active note's complete block list is the membership boundary; neither
    // caller-supplied block content nor an old route's projection is trusted.
    const source = api.blocks.find((candidate) => candidate.id === block.id);
    const target = api.blocks.find((candidate) => candidate.id === targetBlock.id);
    const textProjection = (candidate: NoteBlock) => candidate.block_type !== 'item_ref'
      && presentationKindForBlock(candidate) === 'paragraph';
    if (!host || !api.transferTextUnit || !source || !target || source.id === target.id
      || !textProjection(source) || !textProjection(target)) return false;
    const sourceFlow = api.blockTextFlowDrafts[source.id] ?? getTextFlowContent(source.content_json);
    const targetFlow = api.blockTextFlowDrafts[target.id] ?? getTextFlowContent(target.content_json);
    const moved = sourceFlow && targetFlow && moveTextUnitBetweenFlows(sourceFlow, textUnitId, targetFlow, targetUnitId, edge);
    if (!sourceFlow || !targetFlow || !moved) return false;
    const selection = { unitId: textUnitId, start: 0, end: 0 };
    const snapshot = (owner: NoteBlock, textFlow: TextBlockContentV1): TextFlowEditSnapshot => ({
      textFlow, selection,
      annotationRanges: api.readAnnotationTruths().flatMap((annotation) => annotation.ranges
        .filter((range) => range.block_id === owner.id).map((range) => ({ annotationId: annotation.id, range }))),
      boardRanges: api.captureBoardTextRanges(owner.id).ranges,
    });
    const payloads = (owner: NoteBlock, before: TextBlockContentV1, after: TextBlockContentV1): TransferPayloads => ({
      before: JSON.stringify(before) === JSON.stringify(getTextFlowContent(owner.content_json))
        ? { content_json: owner.content_json, plain_text: owner.plain_text }
        : { content_json: contentForEditedTextFlowBlock(owner, before), plain_text: plainTextFromTextFlow(before) },
      after: { content_json: contentForEditedTextFlowBlock(owner, after), plain_text: plainTextFromTextFlow(after) },
    });
    const transaction: DocumentTransaction = structuredClone({
      blocks: [{ owner: source, before: sourceFlow, after: moved.source }, { owner: target, before: targetFlow, after: moved.target }]
        .map(({ owner, before, after }) => {
          const beforeSnapshot = snapshot(owner, before);
          return { edit: { noteId: api.noteId, generation: api.generation, blockId: owner.id,
            metadata: { unitId: textUnitId, inputType: 'moveTextUnit', kind: 'structural', isComposing: false,
              beforeSelection: selection, afterSelection: selection }, before: beforeSnapshot,
            after: { ...beforeSnapshot, textFlow: after } }, typingRecovery: beforeSnapshot };
        }),
      move: { sourceBlock: source, targetBlock: target, textUnitId, idMapping: moved.idMapping, appliedSide: 'before',
        sourcePayload: payloads(source, sourceFlow, moved.source), targetPayload: payloads(target, targetFlow, moved.target) },
    });
    if (!host.pushHistoryEntry({ type: 'reversibleEdit',
      undo: () => scope.persistDocument(transaction, 'before', true),
      redo: () => scope.persistDocument(transaction, 'after', true),
    }, { skipBoundary: true })) return false;
    scope.setDocumentPending(true);
    try { return await host.enqueueRuntimeHistoryOperation(() => scope.persistDocument(transaction, 'after')); }
    finally { scope.setDocumentPending(false); }
  }, [boundary, scope]);
  const applyTemplateToBlock = useCallback(async (
    block: NoteBlock, template: TemplateOption, text: string, selection?: TextFlowEditSelection,
  ): Promise<NoteBlock | null> => {
    if (!boundary() || scope.templateFailures.size || scope.documentFailures.size || !latest.current.applyTemplateToBlock) return null;
    const api = latest.current;
    const host = api.history.current;
    const liveBlock = api.blocks.find((candidate) => candidate.id === block.id);
    if (!host || !liveBlock) return null;
    const beforePayload = blockPayload(liveBlock);
    const draft = api.blockTextFlowDrafts[block.id];
    if (draft && JSON.stringify(draft) !== JSON.stringify(getTextFlowContent(beforePayload.content_json))) {
      beforePayload.content_json = contentForEditedTextFlowBlock(liveBlock, draft);
      beforePayload.plain_text = plainTextForBlockContent(presentationKindForBlock(liveBlock), beforePayload.content_json, plainTextFromTextFlow(draft));
    }
    const beforeFlow = getTextFlowContent(beforePayload.content_json);
    const afterPayload = buildBlockTemplatePayload({ ...liveBlock, ...beforePayload }, template, text);
    const afterFlow = getTextFlowContent(afterPayload.content_json);
    const beforeBoardRanges = api.captureBoardTextRanges(block.id).ranges;
    const beforeAnnotationRanges = structuredClone(api.readAnnotationTruths().flatMap((annotation) => annotation.ranges
      .filter((range) => range.block_id === block.id).map((range) => ({ annotationId: annotation.id, range }))));
    // Reuse the existing unit-removal/rebase logic. The empty unit list is only
    // for computing range changes; a formula's actual snapshot remains null.
    const applied = apply(liveBlock, afterFlow ?? { ...createTextBlockContentV1(''), units: [] }, {
      previousTextFlow: beforeFlow, skipHistory: true,
    });
    api.setBlockTextFlowDrafts((drafts) => {
      const next = { ...drafts };
      if (afterFlow) next[block.id] = afterFlow;
      else delete next[block.id];
      return next;
    });
    const afterBoardRanges = api.captureBoardTextRanges(block.id).ranges;
    const touchedBeforeBoard = beforeBoardRanges.filter((range) => {
      const after = afterBoardRanges.find((candidate) => candidate.id === range.id);
      return after && JSON.stringify(after) !== JSON.stringify(range);
    });
    const beforeSelection = selection ?? { unitId: beforeFlow?.units[0]?.id ?? '', start: 0, end: 0 };
    const afterSelection = { unitId: afterFlow?.units[0]?.id ?? '', start: 0, end: 0 };
    // Reserve the structural entry before the first await; earlier typing is
    // already sealed and queued, so conversion cannot overtake its body save.
    const transaction: TemplateTransaction = structuredClone({
      blockId: block.id, template,
      before: { payload: beforePayload, textFlow: beforeFlow, selection: beforeSelection, annotationRanges: [], boardRanges: touchedBeforeBoard },
      after: { payload: afterPayload, textFlow: afterFlow, selection: afterSelection, annotationRanges: [],
        boardRanges: touchedBeforeBoard.map((range) => afterBoardRanges.find((candidate) => candidate.id === range.id)!) },
      typingRecovery: beforeFlow ? { textFlow: beforeFlow, selection: beforeSelection,
        annotationRanges: beforeAnnotationRanges, boardRanges: beforeBoardRanges } : undefined,
    });
    if (!host.pushHistoryEntry({ type: 'reversibleEdit',
      undo: () => scope.persistTemplate(transaction, 'before'), redo: () => scope.persistTemplate(transaction, 'after'),
    }, { skipBoundary: true })) return null;
    scope.setTemplatePending(true);
    try {
      const saved = await host.enqueueRuntimeHistoryOperation(async () => {
        if (!scope.current()) return false;
        const ranges = await applied;
        if (!scope.current()) return false;
        transaction.before.annotationRanges = structuredClone(ranges.beforeAnnotationRanges);
        transaction.after.annotationRanges = structuredClone(ranges.afterAnnotationRanges);
        return scope.persistTemplate(transaction, 'after');
      });
      return saved && scope.current() ? scope.lastTemplateSave.get(block.id)?.block ?? null : null;
    } finally {
      scope.setTemplatePending(false);
    }
  }, [apply, boundary, scope]);
  const saveBlock: Options['saveBlock'] = useCallback(async (block, text, saveOptions) => {
    if (!boundary()) return rejected();
    const host = options.history.current;
    if (!host || !scope.current()) return rejected();
    let outcome: BlockSaveOutcome = rejected();
    // Enroll the entire blur operation before its first await so navigation's
    // existing flush boundary cannot miss a save scheduled by an earlier tail.
    await host.enqueueRuntimeHistoryOperation(async () => {
      if (!scope.current()) return false;
      const failedDocument = [...scope.documentFailures.entries()].find(([transaction]) => transaction.blocks.some(({ edit }) => edit.blockId === block.id));
      if (failedDocument) {
        const [transaction, side] = failedDocument;
        if (await scope.persistDocument(transaction, side)) outcome = scope.lastSave.get(block.id)?.outcome ?? rejected();
        return outcome.status === 'saved';
      }
      // A failed multi-block intent owns its drafts until retry or undo. An
      // unrelated blur must not write a stale body while that intent is pending.
      if (scope.documentFailures.size) return false;
      const failedTemplate = [...scope.templateFailures.entries()].find(([transaction]) => transaction.blockId === block.id);
      if (failedTemplate) {
        const [transaction, side] = failedTemplate;
        if (await scope.persistTemplate(transaction, side)) {
          outcome = { status: 'saved', block: scope.lastTemplateSave.get(block.id)!.block!, recoveryReceipt: null, reconciliation: 'response' };
        }
        return outcome.status === 'saved';
      }
      const previous = scope.lastSave.get(block.id);
      const failed = [...scope.failures.keys()].find((transaction) => transaction.blockId === block.id);
      if (failed) {
        const api = latest.current;
        const flow = api.blockTextFlowDrafts[block.id] ?? saveOptions?.textFlow ?? failed.after.textFlow;
        const snapshot: TextFlowEditSnapshot = {
          textFlow: flow, selection: failed.after.selection,
          annotationRanges: api.readAnnotationTruths().flatMap((annotation) => annotation.ranges
            .filter((range) => range.block_id === block.id).map((range) => ({ annotationId: annotation.id, range }))),
          boardRanges: api.captureBoardTextRanges(block.id).ranges,
        };
        await scope.persist(failed, scope.failures.get(failed) ?? 'after', false, snapshot);
        outcome = scope.lastSave.get(block.id)?.outcome ?? rejected();
      } else if (previous && !saveOptions?.fieldValues
        && text === plainTextFromTextFlow(previous.transaction[previous.side].textFlow)
        && JSON.stringify(previous.transaction[previous.side].textFlow) === JSON.stringify(saveOptions?.textFlow ?? latest.current.blockTextFlowDrafts[block.id])) {
        outcome = previous.outcome;
      } else {
        outcome = await latest.current.saveBlock(block, text, { ...saveOptions, preserveDrafts: true });
        if (scope.current() && outcome.status === 'saved') scope.confirmBlock(outcome.block);
      }
      return outcome.status === 'saved';
    });
    return scope.current() ? outcome : rejected();
  }, [boundary, options.history, scope]);
  const flush = useCallback(async () => {
    if (!boundary()) throw new Error('Text composition is still active');
    if (!await options.history.current?.whenHistoryIdle() || !scope.current() || scope.failures.size || scope.templateFailures.size || scope.documentFailures.size) {
      throw new Error('Text changes could not be saved. Retry saving or undo before leaving the note.');
    }
  }, [boundary, options.history, scope]);
  return { applyEdit, applyDocumentEdit, extractUnit, moveUnit, applyTemplateToBlock, boundary, saveBlock, flush,
    isReplaying: () => scope.isReplaying() || Boolean(latest.current.history.current?.isReplaying?.()),
    recoveryBlockIds: scope.isReplaying() ? [] : [...new Set([
      ...[...scope.templateFailures.keys()].map((transaction) => transaction.blockId),
      ...[...scope.documentFailures.keys()].flatMap((transaction) => transaction.blocks.map(({ edit }) => edit.blockId)),
    ])],
    replaying: replayScope === scope.token || scope.templateFailures.size > 0 || scope.documentFailures.size > 0 };
}
