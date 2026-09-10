import type { BoardTextRangeV1 } from '../../../../../shared/types/boardTextRange';
import type { AnnotationRangeV1, AnnotationTruthV1, TextBlockContentV1 } from './runtimeDataTypes';

export interface TextFlowEditSelection {
  unitId: string;
  start: number;
  end: number;
}

export interface TextFlowEditMetadata {
  unitId: string;
  inputType: string;
  beforeSelection: TextFlowEditSelection;
  afterSelection: TextFlowEditSelection;
  isComposing: boolean;
  kind: 'typing' | 'structural';
}

export type TextFlowEditBoundary = 'selection' | 'focus' | 'blur' | 'compositionStart' | 'compositionEnd';

export interface AnnotationRangeSnapshot {
  annotationId: string;
  range: AnnotationRangeV1;
}

export interface TextFlowEditSnapshot {
  textFlow: TextBlockContentV1;
  selection: TextFlowEditSelection;
  annotationRanges: AnnotationRangeSnapshot[];
  boardRanges: BoardTextRangeV1[];
}

export interface TextFlowEditTransaction {
  noteId: string;
  generation: number;
  blockId: string;
  metadata: TextFlowEditMetadata;
  before: TextFlowEditSnapshot;
  after: TextFlowEditSnapshot;
}

const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const annotationKey = (snapshot: AnnotationRangeSnapshot) => `${snapshot.annotationId}\u0000${snapshot.range.id}`;

/** Only the recorded range identities are restored; later annotation edits survive. */
export function restoreAnnotationRangeSnapshots(
  current: AnnotationTruthV1[],
  snapshots: AnnotationRangeSnapshot[],
): AnnotationTruthV1[] {
  const byId = new Map(snapshots.map((snapshot) => [annotationKey(snapshot), snapshot.range]));
  let changed = false;
  const next = current.map((annotation) => {
    let touched = false;
    const ranges = annotation.ranges.map((range) => {
      const restored = byId.get(annotationKey({ annotationId: annotation.id, range }));
      if (!restored || same(range, restored)) return range;
      touched = true;
      return structuredClone(restored);
    });
    if (!touched) return annotation;
    changed = true;
    return { ...annotation, ranges };
  });
  return changed ? next : current;
}

function mergeSnapshots<T>(first: T[], latest: T[], key: (value: T) => string, preferLatest: boolean): T[] {
  const result = new Map(first.map((value) => [key(value), value]));
  latest.forEach((value) => {
    if (preferLatest || !result.has(key(value))) result.set(key(value), value);
  });
  return [...result.values()];
}

function touchedSnapshots<T>(before: T[], after: T[], key: (value: T) => string): [T[], T[]] {
  const nextById = new Map(after.map((value) => [key(value), value]));
  // Text editing changes existing identities; creation/deletion belongs to its own owner.
  const beforeTouched = before.filter((value) => nextById.has(key(value)) && !same(value, nextById.get(key(value))));
  return [beforeTouched, beforeTouched.map((value) => nextById.get(key(value))!)];
}

/** One open input group only. Sealed groups go immediately to the existing runtime history. */
export function createTextFlowEditSession(options: {
  noteId: string;
  generation: number;
  onSeal: (transaction: TextFlowEditTransaction) => void;
}) {
  let pending: TextFlowEditTransaction | null = null;
  let composing = false;

  const seal = (): boolean => {
    if (composing) return false;
    if (!pending) return true;
    const transaction = pending;
    pending = null;
    if (!same(transaction.before, transaction.after)) options.onSeal(transaction);
    return true;
  };

  return {
    record(input: TextFlowEditTransaction): boolean {
      if (input.noteId !== options.noteId || input.generation !== options.generation) return false;
      if (same(input.before.textFlow, input.after.textFlow)) return true;
      if (composing && (input.metadata.kind === 'structural' || (pending && (
        pending.blockId !== input.blockId || pending.metadata.unitId !== input.metadata.unitId
      )))) return false;

      const standalone = input.metadata.kind === 'structural'
        || ['insertFromPaste', 'insertFromDrop', 'insertParagraph', 'insertLineBreak'].includes(input.metadata.inputType);
      const canMerge = pending && !standalone
        && pending.blockId === input.blockId
        && pending.metadata.unitId === input.metadata.unitId
        && (composing || (
          pending.metadata.inputType === input.metadata.inputType
          && same(pending.after.selection, input.metadata.beforeSelection)
          && same(pending.after.textFlow, input.before.textFlow)
        ));
      if (!canMerge) seal();
      if (input.metadata.isComposing) composing = true;

      const next = structuredClone(input);
      [next.before.annotationRanges, next.after.annotationRanges] = touchedSnapshots(
        next.before.annotationRanges, next.after.annotationRanges, annotationKey,
      );
      [next.before.boardRanges, next.after.boardRanges] = touchedSnapshots(
        next.before.boardRanges, next.after.boardRanges, (range) => range.id,
      );
      if (pending) {
        next.before = {
          ...pending.before,
          annotationRanges: mergeSnapshots(pending.before.annotationRanges, next.before.annotationRanges, annotationKey, false),
          boardRanges: mergeSnapshots(pending.before.boardRanges, next.before.boardRanges, (range) => range.id, false),
        };
        next.after.annotationRanges = mergeSnapshots(pending.after.annotationRanges, next.after.annotationRanges, annotationKey, true);
        next.after.boardRanges = mergeSnapshots(pending.after.boardRanges, next.after.boardRanges, (range) => range.id, true);
        next.metadata.beforeSelection = pending.metadata.beforeSelection;
      }
      pending = next;
      if (standalone && !composing) seal();
      return true;
    },
    seal,
    selectionChanged(selection: TextFlowEditSelection): boolean {
      return !pending || same(pending.after.selection, selection) ? true : seal();
    },
    beginComposition() {
      seal();
      composing = true;
    },
    endComposition() {
      composing = false;
      seal();
    },
    clear() {
      pending = null;
      composing = false;
    },
  };
}
