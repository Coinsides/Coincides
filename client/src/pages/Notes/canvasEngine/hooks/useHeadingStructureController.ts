import { useCallback, useEffect, useRef, useState } from 'react';
import type { NoteBlock, TextBlockContentV1 } from '../runtimeDataTypes';
import type { BlockBoxLayout } from '../runtimeLayout';
import type { TemplateOption } from '@/services/templateOptions';
import type { HeadingTextFlowStructureRequest } from '../headingRoleService';
import { headingLevelForRole } from '../headingRoleService';
import { headingStructureRequestForEdit } from '../headingInputService';
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

export function useHeadingStructureController(input: {
  noteId?: string; blocks: NoteBlock[]; layouts: Record<string, BlockBoxLayout>;
  coverFrameId?: string | null; readOnly: boolean; template: TemplateOption;
  textHistory: ReturnType<typeof useTextFlowHistory>;
  reorderBlocks: (ids: readonly string[]) => Promise<boolean>;
  whenWritesIdle?: () => Promise<void>;
  onFocusBlock: (id: string) => void; onFailure: () => void;
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
    const current = () => latest.current.noteId === session && activeRun.current === run;
    // Let acknowledged React state become the live input of the next existing
    // unit transfer. No read polling and no independent content cache.
    const rendered = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
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
            segmentBlocks.push(targetId);
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
          latest.current.onFocusBlock(focusBlockId);
          requestAnimationFrame(() => {
            if (!current()) return;
            const editor = [...document.querySelectorAll<HTMLTextAreaElement>('textarea[data-runtime-textflow-editor="true"]')]
              .find((element) => element.dataset.blockId === focusBlockId && element.dataset.textUnitId === request.focus.unitId);
            editor?.focus(); editor?.setSelectionRange(request.focus.caret, request.focus.caret);
          });
        }
        return true;
      });
      if (!succeeded && current()) latest.current.onFailure();
      return succeeded;
    } catch {
      if (current()) latest.current.onFailure();
      return false;
    } finally {
      if (current()) { busyRef.current = false; setBusy(false); }
    }
  }, [canUseHeading]);
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
