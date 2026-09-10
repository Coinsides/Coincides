import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { RuntimeHistoryEntry } from '../historyService';
import type { BoardRangeSaveSnapshot } from '../boardTextRangeEditSession';
import type { AnnotationTruthV1, NoteBlock, TextBlockContentV1 } from '../runtimeDataTypes';
import { createTextFlowEditSession, restoreAnnotationRangeSnapshots, type TextFlowEditBoundary, type TextFlowEditSelection, type TextFlowEditSnapshot, type TextFlowEditTransaction } from '../textFlowEditSession';
import { createTextBlockContentV1, getTextFlowContent } from '../textFlowService';
import { useBlockTextFlowEditController, type ApplyBlockTextFlowEdit } from './useBlockTextFlowEditController';
import type { BlockSaveOutcome, useNoteCanvasDataAdapter } from './useNoteCanvasDataAdapter';
import type { TemplateOption } from '@/services/templateOptions';
import { contentForEditedTextFlowBlock, plainTextForBlockContent, presentationKindForBlock } from '../blockContentService';
import { buildBlockTemplatePayload, type BlockTemplatePayload } from '../blockTemplateConversionService';

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
    // Recovery attempts are keyed by the same immutable history entry, never a second undo stack.
    const failures = new Map<TextFlowEditTransaction, 'before' | 'after'>();
    const lastSave = new Map<string, { transaction: TextFlowEditTransaction; side: 'before' | 'after'; outcome: BlockSaveOutcome }>();
    // Failed conversion intents are recovery metadata for existing reversibleEdit entries.
    const templateFailures = new Map<TemplateTransaction, 'before' | 'after'>();
    const lastTemplateSave = new Map<string, { transaction: TemplateTransaction; side: 'before' | 'after'; block: NoteBlock | null }>();
    const restoreSelection = (blockId: string, selection: TextFlowEditSelection) => {
      if (current()) setSelectionRequest({ token, blockId, selection });
    };
    const persist = async (transaction: TextFlowEditTransaction, side: 'before' | 'after', replay: boolean, recovery?: TextFlowEditSnapshot): Promise<boolean> => {
      if (!current()) return false;
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
        });
        if (!current()) return false;
        success = outcome.status === 'saved';
        if (success && snapshot.annotationRanges.length) {
          success = await api.saveAnnotationTruthsOutcome(
            restoreAnnotationRangeSnapshots(api.readAnnotationTruths(), snapshot.annotationRanges), { preserveDrafts: true },
          );
          if (!success) outcome = { ...rejected(), block: outcome.block };
        }
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
              if (failed.blockId === block.id) failures.delete(failed);
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
          historySnapshot: { payload: structuredClone(snapshot.payload), boardRanges: { ranges: structuredClone(snapshot.boardRanges) } },
        });
        if (!current()) return false;
        success = updated !== null;
        if (success && snapshot.annotationRanges.length) {
          success = await api.saveAnnotationTruthsOutcome(
            restoreAnnotationRangeSnapshots(api.readAnnotationTruths(), snapshot.annotationRanges), { preserveDrafts: true },
          );
        }
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
    return { token, current, session, failures, lastSave, persist, templateFailures, lastTemplateSave, persistTemplate,
      setTemplatePending(value: boolean) { templatePending = value; if (current()) setReplayScope(value ? token : null); },
      isReplaying: () => replaying || templatePending };
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
    if (!scope.current() || scope.isReplaying() || scope.templateFailures.size || latest.current.history.current?.isReplaying?.()) return;
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
  const applyTemplateToBlock = useCallback(async (
    block: NoteBlock, template: TemplateOption, text: string, selection?: TextFlowEditSelection,
  ): Promise<NoteBlock | null> => {
    if (!boundary() || scope.templateFailures.size || !latest.current.applyTemplateToBlock) return null;
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
      }
      return outcome.status === 'saved';
    });
    return scope.current() ? outcome : rejected();
  }, [boundary, options.history, scope]);
  const flush = useCallback(async () => {
    if (!boundary()) throw new Error('Text composition is still active');
    if (!await options.history.current?.whenHistoryIdle() || !scope.current() || scope.failures.size || scope.templateFailures.size) {
      throw new Error('Text changes could not be saved. Retry saving or undo before leaving the note.');
    }
  }, [boundary, options.history, scope]);
  return { applyEdit, applyTemplateToBlock, boundary, saveBlock, flush,
    isReplaying: () => scope.isReplaying() || Boolean(latest.current.history.current?.isReplaying?.()),
    recoveryBlockIds: scope.isReplaying() ? [] : [...new Set([...scope.templateFailures.keys()].map((transaction) => transaction.blockId))],
    replaying: replayScope === scope.token || scope.templateFailures.size > 0 };
}
