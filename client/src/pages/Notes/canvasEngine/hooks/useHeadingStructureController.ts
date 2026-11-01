import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { NoteBlock, TextBlockContentV1 } from '../runtimeDataTypes';
import type { BlockBoxLayout } from '../runtimeLayout';
import type { TemplateOption } from '@/services/templateOptions';
import type { HeadingTextFlowStructureRequest } from '../headingRoleService';
import { headingLevelForRole } from '../headingRoleService';
import { headingStructureRequestForEdit } from '../headingInputService';
import { projectTextFlowContent, TEXT_FLOW_CONTENT_KEY } from '../textFlowService';
import { splitTextUnitForEnter } from '../textUnitEditorService';
import type { DocumentTextFlowEdit, useTextFlowHistory } from './useTextFlowHistory';

/** Headings are ordinary units isolated into ordinary text blocks. */
export function headingBlockSegments(flow: TextBlockContentV1): string[][] {
  const segments: string[][] = [];
  let body: string[] = [];
  for (const unit of flow.units) {
    if (unit.status !== 'deleted' && headingLevelForRole(unit.writing_role)) {
      if (body.length) segments.push(body);
      segments.push([unit.id]); body = [];
    } else body.push(unit.id);
  }
  if (body.length) segments.push(body);
  return segments;
}

// A structure commit waits for React to publish each step. Animation frames stop
// in background or throttled tabs, so every wait also has a short timer: a frame
// that never comes must not hold the whole note read-only.
const FRAME_FALLBACK_MS = 100;
// Last-resort exit when some awaited write never settles at all.
export const HEADING_STRUCTURE_WATCHDOG_MS = 10_000;

function afterFrame(callback: () => void): void {
  let done = false;
  const run = () => { if (!done) { done = true; callback(); } };
  requestAnimationFrame(run);
  setTimeout(run, FRAME_FALLBACK_MS);
}

function isNoteTextEditor(target: EventTarget | null): boolean {
  return target instanceof HTMLTextAreaElement && target.dataset.runtimeTextflowEditor === 'true';
}

// While a heading structure commits, the edit boundary refuses every edit until
// the new block holds focus, so text typed in that window reached no editor.
// Queue it instead and replay it into the focused block. Composition input is
// left alone so an input method keeps working.
function captureTypingDuringStructure() {
  let typed = '';
  const onBeforeInput = (event: Event) => {
    const input = event as InputEvent;
    if (!isNoteTextEditor(input.target) || input.isComposing) return;
    if (input.inputType === 'insertText' && input.data) {
      typed += input.data;
      input.preventDefault();
    }
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (!isNoteTextEditor(event.target) || event.isComposing) return;
    if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      typed += '\n';
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };
  window.addEventListener('beforeinput', onBeforeInput, true);
  window.addEventListener('keydown', onKeyDown, true);
  let stopped = false;
  return {
    finish: () => {
      if (!stopped) {
        stopped = true;
        window.removeEventListener('beforeinput', onBeforeInput, true);
        window.removeEventListener('keydown', onKeyDown, true);
      }
      const value = typed;
      typed = '';
      return value;
    },
  };
}

export function useHeadingStructureController(input: {
  noteId?: string; blocks: NoteBlock[]; layouts: Record<string, BlockBoxLayout>;
  coverFrameId?: string | null; readOnly: boolean; template: TemplateOption;
  textHistory: ReturnType<typeof useTextFlowHistory>;
  reorderBlocks: (ids: readonly string[]) => Promise<boolean>;
  whenWritesIdle?: () => Promise<void>;
  onFocusBlock: (id: string) => void; onFailure: () => void;
  /** The text half of the draft authority; the editor renders from text and flow together. */
  setBlockTextDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  /** Defaults to HEADING_STRUCTURE_WATCHDOG_MS. */
  watchdogMs?: number;
}) {
  const latest = useRef(input); latest.current = input;
  const busyRef = useRef(false);
  const activeRun = useRef<object | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { activeRun.current = null; busyRef.current = false; setBusy(false); }, [input.noteId]);
  const canUseHeading = useCallback((block: NoteBlock | null) => {
    const current = latest.current;
    if (current.readOnly || busyRef.current) return false;
    return !current.coverFrameId || !block || current.layouts[block.id]?.frame_id !== current.coverFrameId;
  }, []);
  const commitStructure = useCallback(async (changes: DocumentTextFlowEdit[],
    requests: { block: NoteBlock; request: HeadingTextFlowStructureRequest }[], documentEdit: boolean): Promise<boolean> => {
    if (latest.current.readOnly || busyRef.current || requests.some(({ block }) => !canUseHeading(block))) return false;
    const session = latest.current.noteId;
    const api = latest.current;
    if (requests.some(({ block, request }) => !headingBlockSegments(request.nextTextFlow).length || !api.layouts[block.id])) return false;
    const run = {}; activeRun.current = run;
    busyRef.current = true; setBusy(true);
    const typing = captureTypingDuringStructure();
    let lastFocus: { blockId: string; unitId: string; caret: number } | null = null;
    const current = () => latest.current.noteId === session && activeRun.current === run;
    // Let acknowledged React state become the live input of the next existing
    // unit transfer. No read polling and no independent content cache.
    const rendered = () => new Promise<void>((resolve) => afterFrame(resolve));
    // Every exit releases the busy state and gives queued keys somewhere to go:
    // success replays them at the new caret, any other exit (failure, throw, or
    // the watchdog) puts them back where the person was typing, beside the toast.
    const fallbackFocus = { blockId: requests[0].block.id, unitId: requests[0].request.focus.unitId,
      caret: requests[0].request.focus.caret };
    const exitQueue = (focus: { blockId: string; unitId: string; caret: number }) => afterFrame(() => {
      const typed = typing.finish();
      if (typed && latest.current.noteId === session) void replayTyped(focus, typed);
    });
    const release = () => { busyRef.current = false; setBusy(false); };
    const watchdog = setTimeout(() => {
      if (!current()) return;
      // Abandon the run: its later steps see current() === false and stop.
      activeRun.current = null; release();
      publishTextHalves(touchedBlockIds());
      latest.current.onFailure();
      exitQueue(lastFocus ?? fallbackFocus);
    }, api.watchdogMs ?? HEADING_STRUCTURE_WATCHDOG_MS);
    const touched = new Set(changes.map((change) => change.block.id));
    const touchedBlockIds = () => [...touched];
    try {
      // Pause A1 writes before the existing unit transfers begin and drain any
      // earlier placement save, while its pure full plan remains available.
      await rendered(); await api.whenWritesIdle?.(); await rendered();
      if (!current()) return false;
      const succeeded = await api.textHistory.runStructureBatch(async (record) => {
        const change = changes[0];
        const edited = documentEdit ? await api.textHistory.applyDocumentEdit(changes)
          : await api.textHistory.applyEdit(change.block, change.nextTextFlow, {
            previousTextFlow: change.previousTextFlow, metadata: change.metadata,
          });
        if (!edited || !current()) return false;
        // The structural edit bypasses the editor's own text publisher; publish the
        // text half too, or the editor realigns to the old text and the chapter
        // tree (built from the flow) names a heading the block does not show.
        if (!documentEdit) publishTextHalves([change.block.id], change.nextTextFlow);
        await api.textHistory.flush(); await rendered();
        if (!current()) return false;
        for (const { block, request } of requests) {
          const segments = headingBlockSegments(request.nextTextFlow);
          const previousOrder = latest.current.blocks.map((entry) => entry.id);
          const segmentBlocks = [block.id];
          for (const segment of segments.slice(1)) {
            let created: NoteBlock | null = null;
            const source = api.textHistory.readLiveBlock(block.id);
            if (!source || !await api.textHistory.extractUnit(source, segment[0], api.template, api.layouts[block.id],
              (next) => { created = next; }) || !current()) return false;
            await rendered();
            const target: NoteBlock | null = created;
            if (!target) return false;
            const targetId = (target as NoteBlock).id;
            segmentBlocks.push(targetId); touched.add(targetId);
            for (const unitId of segment.slice(1)) {
              const original = api.textHistory.readLiveBlock(block.id);
              const destination = api.textHistory.readLiveBlock(targetId);
              const destinationFlow = api.textHistory.readLiveFlow(targetId);
              const last = destinationFlow?.units[destinationFlow.units.length - 1];
              if (!original || !destination || !last || !current()
                || !await api.textHistory.moveUnit(original, unitId, destination, last.id, 'after')) return false;
              await rendered();
            }
          }
          if (!current()) return false;
          if (segmentBlocks.length > 1) {
            const afterOrder = previousOrder.flatMap((id) => id === block.id ? segmentBlocks : [id]);
            const restore = async (order: string[]) => {
              await rendered();
              if (latest.current.noteId !== session) return false;
              const live = latest.current.blocks.map((entry) => entry.id);
              const existing = new Set(live);
              return latest.current.reorderBlocks([...order.filter((id) => existing.has(id)), ...live.filter((id) => !order.includes(id))]);
            };
            // Undo order first, then reverse the established unit transfers and
            // role edit. Redo rebuilds those same block identities before ordering.
            record({ type: 'reversibleEdit', undo: () => restore(previousOrder), redo: () => restore(afterOrder) });
            if (!await restore(afterOrder)) return false;
            await rendered();
          }
          const focusIndex = segments.findIndex((segment) => segment.includes(request.focus.unitId));
          const focusBlockId = segmentBlocks[Math.max(0, focusIndex)];
          lastFocus = { blockId: focusBlockId, unitId: request.focus.unitId, caret: request.focus.caret };
          latest.current.onFocusBlock(focusBlockId);
          afterFrame(() => {
            if (!current()) return;
            const editor = [...document.querySelectorAll<HTMLTextAreaElement>('textarea[data-runtime-textflow-editor="true"]')]
              .find((element) => element.dataset.blockId === focusBlockId && element.dataset.textUnitId === request.focus.unitId);
            editor?.focus(); editor?.setSelectionRange(request.focus.caret, request.focus.caret);
          });
        }
        return true;
      });
      if (!current()) return false;
      if (!succeeded) {
        latest.current.onFailure();
        publishTextHalves(touchedBlockIds());
      }
      // After the per-request focus frame: the boundary is open again.
      exitQueue(succeeded && lastFocus ? lastFocus : fallbackFocus);
      return succeeded;
    } catch {
      if (current()) {
        latest.current.onFailure();
        publishTextHalves(touchedBlockIds());
        exitQueue(fallbackFocus);
      }
      return false;
    } finally {
      clearTimeout(watchdog);
      if (current()) release();
      // A run abandoned by its note's unmount has nowhere to replay; stop capturing.
      if (latest.current.noteId !== session) typing.finish();
    }
  }, [canUseHeading]);
  // Both halves of the draft authority from the same flow: the live one by default.
  const publishTextHalves = useCallback((blockIds: string[], flow?: TextBlockContentV1) => {
    const history = latest.current.textHistory;
    const texts: Record<string, string> = {};
    for (const id of blockIds) {
      const live = flow ?? history.readLiveFlow(id);
      if (live) texts[id] = projectTextFlowContent({ [TEXT_FLOW_CONTENT_KEY]: live }).plain_text;
    }
    if (Object.keys(texts).length) latest.current.setBlockTextDrafts((current) => ({ ...current, ...texts }));
  }, []);
  const replayTyped = useCallback(async (focus: { blockId: string; unitId: string; caret: number }, typed: string) => {
    const history = latest.current.textHistory;
    // A partial structure may have moved the focus unit into a new block.
    const holder = history.readLiveFlow(focus.blockId)?.units.some((entry) => entry.id === focus.unitId) ? focus.blockId
      : latest.current.blocks.find((entry) => history.readLiveFlow(entry.id)?.units.some((unit) => unit.id === focus.unitId))?.id;
    if (holder && holder !== focus.blockId) focus = { ...focus, blockId: holder };
    const block = history.readLiveBlock(focus.blockId);
    const flow = history.readLiveFlow(focus.blockId);
    // A failed structure may not have created the focus unit at all; keep the keys
    // in the block's last live unit rather than dropping them.
    const exact = flow?.units.find((entry) => entry.id === focus.unitId);
    const live = flow?.units.filter((entry) => entry.status !== 'deleted') ?? [];
    const unit = exact ?? live[live.length - 1];
    if (!block || !flow || !unit) return;
    const at = exact ? Math.min(focus.caret, unit.text.length) : unit.text.length;
    let next = { ...flow, units: flow.units.map((entry) => entry.id === unit.id
      ? { ...entry, text: unit.text.slice(0, at) + typed + unit.text.slice(at) } : entry) };
    // Enter pressed in the window splits paragraphs exactly as the editor's Enter does.
    let caretUnitId = unit.id;
    let caretOffset = at + typed.length;
    for (;;) {
      const carrier = next.units.find((entry) => entry.id === caretUnitId);
      const breakAt = carrier ? carrier.text.indexOf('\n') : -1;
      if (!carrier || breakAt < 0) break;
      const index = next.units.findIndex((entry) => entry.id === caretUnitId);
      next = splitTextUnitForEnter(next, caretUnitId, breakAt, breakAt + 1);
      caretUnitId = next.units[index + 1].id;
      caretOffset -= breakAt + 1;
    }
    // Refused only while a failed save holds the note for Retry/Undo, as all typing
    // is; the failure toast is already on screen. No retry: a late replay built from
    // this snapshot would overwrite whatever the person types next.
    const applied = await history.applyEdit(block, next, { previousTextFlow: flow, metadata: {
      unitId: unit.id, inputType: 'insertText', kind: 'typing', isComposing: false,
      beforeSelection: { unitId: unit.id, start: at, end: at },
      afterSelection: { unitId: caretUnitId, start: caretOffset, end: caretOffset },
    } });
    if (!applied || !applied.success) return;
    // applyEdit publishes the flow; the text half must agree or the editor realigns to the old text.
    const text = projectTextFlowContent({ [TEXT_FLOW_CONTENT_KEY]: next }).plain_text;
    latest.current.setBlockTextDrafts((current) => ({ ...current, [focus.blockId]: text }));
    afterFrame(() => {
      const editor = [...document.querySelectorAll<HTMLTextAreaElement>('textarea[data-runtime-textflow-editor="true"]')]
        .find((element) => element.dataset.blockId === focus.blockId && element.dataset.textUnitId === caretUnitId);
      editor?.focus(); editor?.setSelectionRange(caretOffset, caretOffset);
    });
  }, []);
  const onHeadingStructure = useCallback((block: NoteBlock, request: HeadingTextFlowStructureRequest) => {
    const previousUnit = request.previousTextFlow.units.find((unit) => unit.id === request.headingUnitId)
      || request.previousTextFlow.units[0];
    if (!previousUnit) return Promise.resolve(false);
    const beforeCaret = Math.min(previousUnit.text.length, request.focus.caret);
    return commitStructure([{ block, previousTextFlow: request.previousTextFlow, nextTextFlow: request.nextTextFlow,
      metadata: { unitId: request.headingUnitId, inputType: request.inputType, kind: 'structural', isComposing: false,
        beforeSelection: { unitId: previousUnit.id, start: beforeCaret, end: beforeCaret },
        afterSelection: { unitId: request.focus.unitId, start: request.focus.caret, end: request.focus.caret } },
    }], [{ block, request }], false);
  }, [commitStructure]);
  const onDocumentEdit = useCallback((changes: DocumentTextFlowEdit[]) => {
    const requests: { block: NoteBlock; request: HeadingTextFlowStructureRequest }[] = [];
    const normalized = changes.map((change) => {
      const selection = change.metadata.afterSelection;
      const request = headingStructureRequestForEdit(change.previousTextFlow, change.nextTextFlow,
        { unitId: selection.unitId, caret: selection.end });
      if (!request) return change;
      requests.push({ block: change.block, request });
      return { ...change, nextTextFlow: request.nextTextFlow, metadata: { ...change.metadata,
        afterSelection: { unitId: request.focus.unitId, start: request.focus.caret, end: request.focus.caret } } };
    });
    if (!requests.length) return latest.current.readOnly || busyRef.current ? Promise.resolve(false)
      : latest.current.textHistory.applyDocumentEdit(changes);
    return commitStructure(normalized, requests, true);
  }, [commitStructure]);
  return { onHeadingStructure, onDocumentEdit, canUseHeading, busy, isBusy: () => busyRef.current };
}
