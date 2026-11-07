import { useCallback, useEffect, useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { flushSync } from 'react-dom';
import { useAuthStore } from '@/stores/authStore';
import type { NoteBlock, TextBlockContentV1 } from '../runtimeDataTypes';
import type { BlockBoxLayout } from '../runtimeLayout';
import type { TemplateOption } from '@/services/templateOptions';
import type { HeadingTextFlowStructureRequest } from '../headingRoleService';
import { headingLevelForRole } from '../headingRoleService';
import { headingStructureRequestForEdit } from '../headingInputService';
import { projectTextFlowContent, TEXT_FLOW_CONTENT_KEY } from '../textFlowService';
import { forgetUnplacedWords, openStructureTypingBuffer, readUnplacedWords, rememberUnplacedWords,
  UNPLACED_WORDS_LIMIT, type StructureTypingBuffer } from '../structureTypingBuffer';
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

// How long a refused placement waits before asking again. It is refused only while
// a failed save holds the note for Retry or Undo.
const PLACE_RETRY_MS = 800;
// A block's editor mounts, and leaves read-only, some commits after the structure ends.
const EDITOR_WAIT_MS = 3_000;
const EDITOR_POLL_MS = 16;

/** A unit's editor, found by block and unit together: unit ids repeat from block to block. */
function editorFor(blockId: string, unitId: string, strict = false): HTMLTextAreaElement | null {
  const editors = [...document.querySelectorAll<HTMLTextAreaElement>('textarea[data-runtime-textflow-editor="true"]')]
    .filter((element) => element.dataset.blockId === blockId && element.getBoundingClientRect().width > 0
      && getComputedStyle(element).visibility !== 'hidden');
  const exact = editors.find((element) => element.dataset.textUnitId === unitId) ?? null;
  return strict ? exact : exact ?? editors[editors.length - 1] ?? null;
}

/**
 * What the buffer did to the text it was given, applied to whatever the unit holds now. The new
 * words go where they were typed, located by the original text on either side of them. When
 * neither side can be found the words are not put anywhere: the caller keeps them and says so.
 * Deletions made in the buffer are not replayed onto text that has changed under it.
 */
export function mergeTypedText(live: string, initial: string, typed: string, typedCaret: number): { text: string; caret: number } | null {
  if (live === initial) return { text: typed, caret: Math.min(typedCaret, typed.length) };
  let start = 0;
  while (start < initial.length && start < typed.length && initial[start] === typed[start]) start += 1;
  let end = 0;
  while (end < initial.length - start && end < typed.length - start
    && initial[initial.length - 1 - end] === typed[typed.length - 1 - end]) end += 1;
  const inserted = typed.slice(start, typed.length - end);
  if (!inserted) return { text: live, caret: live.length };
  const before = initial.slice(0, start);
  const after = initial.slice(initial.length - end);
  let at = -1;
  if (start > 0 && live.startsWith(before)) at = start;
  else if (live.endsWith(after)) at = live.length - after.length;
  if (at < 0) return null;
  return { text: live.slice(0, at) + inserted + live.slice(at), caret: at + inserted.length };
}

type Focus = { blockId: string; unitId: string; caret: number };
// One window's words. The live entry is the open window; kept entries could not land yet.
type Entry = { id: string; typing: StructureTypingBuffer; session?: string; focus: Focus };
let entryCount = 0;
const nextEntryId = () => `${Date.now().toString(36)}-${(entryCount += 1)}`;

export function useHeadingStructureController(input: {
  noteId?: string; blocks: NoteBlock[]; layouts: Record<string, BlockBoxLayout>;
  coverFrameId?: string | null; readOnly: boolean; template: TemplateOption;
  textHistory: ReturnType<typeof useTextFlowHistory>;
  reorderBlocks: (ids: readonly string[]) => Promise<boolean>;
  whenWritesIdle?: () => Promise<void>;
  onFocusBlock: (id: string) => void; onFailure: () => void;
  /** The text half of the draft authority; the editor renders from text and flow together. */
  setBlockTextDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  /** Defaults to HEADING_STRUCTURE_WATCHDOG_MS. Also the longest a leave waits for typed words. */
  watchdogMs?: number;
  /** Defaults to EDITOR_WAIT_MS. */
  editorWaitMs?: number;
  /** Defaults to PLACE_RETRY_MS. */
  placeRetryMs?: number;
}) {
  const latest = useRef(input); latest.current = input;
  const busyRef = useRef(false);
  const activeRun = useRef<object | null>(null);
  const [busy, setBusy] = useState(false);
  const buffer = useRef<Entry | null>(null);
  const kept = useRef(new Set<Entry>());
  const mounted = useRef(true);

  // Typed words are settled when no window is open and no structure is running. Kept words count
  // as settled: they are on screen and stored, and a leave does not wait for a save that cannot happen.
  const settleWaiters = useRef<Array<() => void>>([]);
  const isSettled = () => !buffer.current && !busyRef.current;
  const notifySettled = useCallback(() => {
    if (isSettled()) settleWaiters.current.splice(0).forEach((resolve) => resolve());
  }, []);

  // A frame says nothing about React: it can fire before a confirmed write has committed. A
  // commit of this component says nothing either, because a sync-priority commit (a click) can
  // come first and leave the write's default-priority update out. Each waiter is released only by
  // a commit that includes its own counted update, and React batches that with every earlier one.
  const [commitCount, requestCommit] = useState(0);
  const requestedCommits = useRef(0);
  const commitWaiters = useRef<Array<{ target: number; resolve: () => void }>>([]);
  useLayoutEffect(() => {
    const ready = commitWaiters.current.filter((waiter) => waiter.target <= commitCount);
    if (!ready.length) return;
    commitWaiters.current = commitWaiters.current.filter((waiter) => waiter.target > commitCount);
    ready.forEach((waiter) => waiter.resolve());
  });
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      commitWaiters.current.splice(0).forEach((waiter) => waiter.resolve());
    };
  }, []);
  const committed = useCallback(() => new Promise<void>((resolve) => {
    // No commit is coming after an unmount.
    if (!mounted.current) { resolve(); return; }
    requestedCommits.current += 1;
    const target = requestedCommits.current;
    commitWaiters.current.push({ target, resolve });
    requestCommit(target);
  }), []);

  const retryTimer = (entry: Entry) => {
    setTimeout(() => {
      if (!kept.current.has(entry) || !mounted.current) return;
      if (latest.current.noteId === entry.session) placeTypedRef.current(entry);
      else retryTimer(entry);
    }, latest.current.placeRetryMs ?? PLACE_RETRY_MS);
  };

  // Words that cannot go in now: on screen, saying so, and stored for when the note is open again.
  const retainWords = useCallback((entry: Entry) => {
    if (buffer.current === entry) buffer.current = null;
    if (!kept.current.has(entry)) {
      kept.current.add(entry);
      const { typing, session, focus, id } = entry;
      let count = 0;
      const remember = () => {
        if (session) count = rememberUnplacedWords(session, { id, blockId: focus.blockId, unitId: focus.unitId,
          initialText: typing.initialText, text: typing.text() });
      };
      remember();
      typing.element.addEventListener('input', remember);
      typing.retain({ noteId: session, crowded: count > UNPLACED_WORDS_LIMIT, onClose: () => {
        // Closing is the only thing that discards kept words.
        if (session) forgetUnplacedWords(session, id);
        kept.current.delete(entry);
        notifySettled();
      } });
      retryTimer(entry);
    }
    notifySettled();
  }, [notifySettled]);

  const leaveBuffer = useCallback(() => {
    const entry = buffer.current;
    if (!entry) return;
    if (entry.typing.changed()) retainWords(entry);
    else { buffer.current = null; entry.typing.close(); }
    notifySettled();
  }, [retainWords, notifySettled]);
  useEffect(() => {
    activeRun.current = null; busyRef.current = false; setBusy(false);
    return leaveBuffer;
  }, [input.noteId, leaveBuffer]);
  // A page that goes away runs no cleanup and no timers: what is still in the window is stored now,
  // synchronously, and placed when the note is opened again (or forgotten once it lands, if the page comes back).
  useEffect(() => {
    const storeOpenWindow = () => {
      const entry = buffer.current;
      if (!entry?.session || !entry.typing.changed()) return;
      rememberUnplacedWords(entry.session, { id: entry.id, blockId: entry.focus.blockId, unitId: entry.focus.unitId,
        initialText: entry.typing.initialText, text: entry.typing.text() });
    };
    window.addEventListener('pagehide', storeOpenWindow);
    return () => window.removeEventListener('pagehide', storeOpenWindow);
  }, []);

  const canUseHeading = useCallback((block: NoteBlock | null) => {
    const current = latest.current;
    if (current.readOnly || busyRef.current) return false;
    return !current.coverFrameId || !block || current.layouts[block.id]?.frame_id !== current.coverFrameId;
  }, []);

  const openEntry = (session: string | undefined, focus: Focus, text: string, options: { initialText?: string; focus?: boolean } = {}) => {
    const entry: Entry = { id: nextEntryId(), session, focus: { ...focus }, typing: null as unknown as StructureTypingBuffer };
    entry.typing = openStructureTypingBuffer({ text, caret: focus.caret, initialText: options.initialText, focus: options.focus,
      locate: () => editorFor(entry.focus.blockId, entry.focus.unitId, true) });
    entry.typing.element.dataset.structureTypingEntry = entry.id;
    return entry;
  };

  const commitStructure = useCallback(async (changes: DocumentTextFlowEdit[],
    requests: { block: NoteBlock; request: HeadingTextFlowStructureRequest }[], documentEdit: boolean): Promise<boolean> => {
    (window as any).__k1 = ((window as any).__k1 || []).concat([`cs-enter ${Math.round(performance.now())} ro=${latest.current.readOnly} busy=${busyRef.current}`]);
    if (latest.current.readOnly || busyRef.current || requests.some(({ block }) => !canUseHeading(block))) { (window as any).__k1 = ((window as any).__k1 || []).concat(['cs-refused-guard']); return false; }
    const session = latest.current.noteId;
    const api = latest.current;
    if (requests.some(({ block, request }) => !headingBlockSegments(request.nextTextFlow).length || !api.layouts[block.id])) return false;
    const run = {}; activeRun.current = run;
    busyRef.current = true; setBusy(true);
    const opening = requests[0].request;
    const openingUnit = opening.nextTextFlow.units.find((unit) => unit.id === opening.focus.unitId);
    // Words still waiting from an earlier window stay kept as their own entry; a new window never erases them.
    const previous = buffer.current;
    if (previous) {
      if (previous.typing.changed()) retainWords(previous);
      else { buffer.current = null; previous.typing.close(); }
    }
    const entry = openEntry(session, { blockId: requests[0].block.id, ...opening.focus }, openingUnit?.text ?? '');
    buffer.current = entry;
    let succeededFocus: Focus | null = null;
    const current = () => latest.current.noteId === session && activeRun.current === run;
    // Let acknowledged React state become the live input of the next existing
    // unit transfer. No read polling and no independent content cache.
    const rendered = () => new Promise<void>((resolve) => afterFrame(() => { void committed().then(resolve); }));
    // Every exit releases the busy state and places the window's words: at the new caret on
    // success, where the person was typing otherwise. Placement reads only committed state.
    const exitQueue = () => afterFrame(() => {
      void committed().then(() => {
        if (succeededFocus) entry.focus = succeededFocus;
        placeTypedRef.current(entry);
      });
    });
    const release = () => { busyRef.current = false; setBusy(false); notifySettled(); };
    const watchdog = setTimeout(() => {
      (window as any).__k1 = ((window as any).__k1 || []).concat([`cs-watchdog cur=${current()} ${Math.round(performance.now())}`]);
      if (!current()) return;
      // Abandon the run: its later steps see current() === false and stop.
      activeRun.current = null; release();
      publishTextHalves(touchedBlockIds());
      latest.current.onFailure();
      exitQueue();
    }, api.watchdogMs ?? HEADING_STRUCTURE_WATCHDOG_MS);
    const touched = new Set(changes.map((change) => change.block.id));
    const touchedBlockIds = () => [...touched];
    // The window's unit has moved: from here on its words belong to the block that now holds it.
    const followUnit = (unitId: string, blockId: string) => {
      if (entry.focus.unitId === unitId) entry.focus = { ...entry.focus, blockId };
    };
    try {
      // Pause A1 writes before the existing unit transfers begin and drain any
      // earlier placement save, while its pure full plan remains available.
      await rendered(); await api.whenWritesIdle?.(); (window as any).__k1 = ((window as any).__k1 || []).concat([`cs-idle ${Math.round(performance.now())}`]); await rendered();
      if (!current()) { (window as any).__k1 = ((window as any).__k1 || []).concat(['cs-not-current-before-batch']); return false; }
      const succeeded = await api.textHistory.runStructureBatch(async (record) => {
        const change = changes[0];
        const edited = documentEdit ? await api.textHistory.applyDocumentEdit(changes)
          : await api.textHistory.applyEdit(change.block, change.nextTextFlow, {
            previousTextFlow: change.previousTextFlow, metadata: change.metadata,
          });
        (window as any).__k1 = ((window as any).__k1 || []).concat([`cs-in-batch edited=${!!edited} ${Math.round(performance.now())}`]);
        if (!edited || !current()) return false;
        // The structural edit bypasses the editor's own text publisher; publish the
        // text half too, or the editor realigns to the old text and the chapter
        // tree (built from the flow) names a heading the block does not show.
        if (!documentEdit) publishTextHalves([change.block.id], change.nextTextFlow);
        await api.textHistory.flush(); await rendered();
        if (!current()) return false;
        for (const { block, request } of requests) {
          const segments = headingBlockSegments(request.nextTextFlow);
          const previousOrder = latest.current.blocks.map((item) => item.id);
          const segmentBlocks = [block.id];
          for (const segment of segments.slice(1)) {
            let created: NoteBlock | null = null;
            const source = api.textHistory.readLiveBlock(block.id);
            if (!source || !await api.textHistory.extractUnit(source, segment[0], api.template, api.layouts[block.id],
              (next) => { created = next; }) || !current()) return false;
            const target: NoteBlock | null = created;
            if (!target) return false;
            const targetId = (target as NoteBlock).id;
            followUnit(segment[0], targetId);
            await rendered();
            segmentBlocks.push(targetId); touched.add(targetId);
            for (const unitId of segment.slice(1)) {
              const original = api.textHistory.readLiveBlock(block.id);
              const destination = api.textHistory.readLiveBlock(targetId);
              const destinationFlow = api.textHistory.readLiveFlow(targetId);
              const last = destinationFlow?.units[destinationFlow.units.length - 1];
              if (!original || !destination || !last || !current()
                || !await api.textHistory.moveUnit(original, unitId, destination, last.id, 'after')) return false;
              followUnit(unitId, targetId);
              await rendered();
            }
          }
          if (!current()) return false;
          if (segmentBlocks.length > 1) {
            const afterOrder = previousOrder.flatMap((id) => id === block.id ? segmentBlocks : [id]);
            const restore = async (order: string[]) => {
              await rendered();
              if (latest.current.noteId !== session) return false;
              const live = latest.current.blocks.map((item) => item.id);
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
          succeededFocus = { blockId: focusBlockId, unitId: request.focus.unitId, caret: request.focus.caret };
          latest.current.onFocusBlock(focusBlockId);
        }
        return true;
      });
      (window as any).__k1 = ((window as any).__k1 || []).concat([`cs-batch-done ${succeeded} cur=${current()} ${Math.round(performance.now())}`]);
      if (!current()) return false;
      if (!succeeded) {
        succeededFocus = null;
        latest.current.onFailure();
        publishTextHalves(touchedBlockIds());
      }
      // After the per-request focus frame: the boundary is open again.
      exitQueue();
      return succeeded;
    } catch (error) {
      (window as any).__k1 = ((window as any).__k1 || []).concat([`cs-throw ${String(error).slice(0, 80)} ${Math.round(performance.now())}`]);
      if (current()) {
        succeededFocus = null;
        latest.current.onFailure();
        publishTextHalves(touchedBlockIds());
        exitQueue();
      }
      return false;
    } finally {
      clearTimeout(watchdog);
      if (current()) release();
    }
  }, [canUseHeading, committed, notifySettled, retainWords]);
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

  // The one edit a window produces, or a kept entry's retry. The words land first, as typing,
  // before anything else happens to them: publish, focus and removal in one task, no moment for
  // a key to land nowhere. Only then may a structure split what they made.
  const placeTyped = useCallback((entry: Entry, waitingSince = Date.now()) => {
    const live = buffer.current === entry;
    if (!live && !kept.current.has(entry)) return;
    const { typing } = entry;
    if (typing.isComposing()) { typing.afterComposition(() => placeTypedRef.current(entry)); return; }
    if (latest.current.noteId !== entry.session) { if (live) leaveBuffer(); return; }
    if (busyRef.current) { setTimeout(() => placeTypedRef.current(entry, waitingSince), EDITOR_POLL_MS); return; }
    const history = latest.current.textHistory;
    // The block that holds the unit now; the structure moves the entry along with it. A unit id
    // is only unique inside its block, so the note is never searched for one.
    const { blockId, unitId } = entry.focus;
    const block = history.readLiveBlock(blockId);
    const flow = history.readLiveFlow(blockId);
    const unit = flow?.units.find((candidate) => candidate.id === unitId && candidate.status !== 'deleted');
    const finish = (focusBlockId: string, focusUnitId: string, caret: number) => {
      // The buffer holds focus against editors until it is closed, so it goes first; same task, no key between.
      // Someone who clicked into another field in the window keeps it.
      const active = document.activeElement;
      const movedAway = !live || (active !== typing.element && active !== document.body && active !== null);
      if (buffer.current === entry) buffer.current = null;
      kept.current.delete(entry);
      if (entry.session) forgetUnplacedWords(entry.session, entry.id);
      typing.close();
      const editor = movedAway ? null : editorFor(focusBlockId, focusUnitId);
      editor?.focus();
      editor?.setSelectionRange(caret, caret);
      notifySettled();
    };
    const overdue = Date.now() - waitingSince >= (latest.current.editorWaitMs ?? EDITOR_WAIT_MS);
    // An open window stays open until there is an editor that can take the next key, typed or not.
    if (live && block && unit && !overdue) {
      const ready = editorFor(blockId, unitId, true);
      if (!ready || ready.readOnly) {
        setTimeout(() => placeTypedRef.current(entry, waitingSince), EDITOR_POLL_MS);
        return;
      }
    }
    if (!typing.changed()) {
      finish(blockId, unitId, unit ? Math.min(typing.caret(), unit.text.length) : entry.focus.caret);
      return;
    }
    // Kept entries keep asking until they land or are closed; one refusal must not end the retries.
    const keep = () => {
      if (!kept.current.has(entry)) retainWords(entry);
      else retryTimer(entry);
    };
    // A replay in progress passes by itself, and leaving the note waits for it.
    if (block && flow && unit && !history.isEditHeld() && !history.canApplyEdit() && !overdue) {
      setTimeout(() => placeTypedRef.current(entry, waitingSince), EDITOR_POLL_MS);
      return;
    }
    // Nowhere to put them yet, or a failed save holds the note: keep the words and say so.
    if (latest.current.readOnly || !block || !flow || !unit || !history.canApplyEdit()) { keep(); return; }
    // The history can still refuse at the boundary; the same promise holds.
    if (!history.boundary()) { keep(); return; }
    const merged = mergeTypedText(unit.text, typing.initialText, typing.text(), typing.caret());
    // The words' place in the unit cannot be found: never moved somewhere else silently.
    if (!merged) { keep(); return; }
    let caret = merged.caret;
    let caretUnitId = unit.id;
    let next: TextBlockContentV1 = { ...flow, units: flow.units.map((candidate) => candidate.id === unit.id
      ? { ...candidate, text: merged.text } : candidate) };
    // Enter in the window splits paragraphs exactly as the editor's Enter does.
    for (let splitting = unit.id; ;) {
      const carrier = next.units.find((candidate) => candidate.id === splitting);
      const breakAt = carrier ? carrier.text.indexOf('\n') : -1;
      if (!carrier || breakAt < 0) break;
      const index = next.units.findIndex((candidate) => candidate.id === splitting);
      next = splitTextUnitForEnter(next, splitting, breakAt, breakAt + 1);
      const following = next.units[index + 1].id;
      if (caretUnitId === splitting && caret > breakAt) { caretUnitId = following; caret -= breakAt + 1; }
      splitting = following;
    }
    const at = Math.min(typing.caret(), unit.text.length);
    flushSync(() => {
      void history.applyEdit(block, next, { previousTextFlow: flow, metadata: {
        unitId: unit.id, inputType: 'insertText', kind: 'typing', isComposing: false,
        beforeSelection: { unitId: unit.id, start: at, end: at },
        afterSelection: { unitId: caretUnitId, start: caret, end: caret },
      } });
      // applyEdit publishes the flow; the text half must agree or the editor realigns to the old text.
      const text = projectTextFlowContent({ [TEXT_FLOW_CONTENT_KEY]: next }).plain_text;
      latest.current.setBlockTextDrafts((current) => ({ ...current, [blockId]: text }));
    });
    // Everything typed in the window is one undo step.
    history.boundary();
    finish(blockId, caretUnitId, caret);
    // Body after a heading needs its own block. The words are already in the note, so a structure
    // that fails or is left behind can at most leave them unsplit: it can no longer lose them.
    const structure = headingStructureRequestForEdit(flow, next, { unitId: caretUnitId, caret });
    (window as any).__k1 = ((window as any).__k1 || []).concat([`pt-landed structure=${!!structure} ${Math.round(performance.now())}`]);
    if (structure) void onHeadingStructureRef.current(block, { ...structure, previousTextFlow: next });
  }, [leaveBuffer, notifySettled, retainWords]);
  const placeTypedRef = useRef(placeTyped);
  placeTypedRef.current = placeTyped;

  // Back on a note that still has words waiting: they go in now, or stay visible if they still cannot.
  const restoredNote = useRef<string | undefined>(undefined);
  // A refresh opens the note before the account has loaded, and the words are stored per account.
  const account = useAuthStore((state) => state.user?.id);
  const accountPending = useAuthStore((state) => Boolean(state.token) && !state.user);
  useEffect(() => {
    const noteId = input.noteId;
    if (!noteId || restoredNote.current === noteId || !input.blocks.length || accountPending) return;
    restoredNote.current = noteId;
    const onScreen = new Set([...kept.current].map((entry) => entry.id));
    const history = latest.current.textHistory;
    for (const words of readUnplacedWords(noteId)) {
      // Still on screen from before the person left: its own retry carries on.
      if (onScreen.has(words.id)) continue;
      // On screen from an earlier mount of this note: this one takes over. Removed quietly, since
      // closing it would discard the stored words it is about to reopen.
      document.querySelectorAll<HTMLElement>('[data-structure-typing-entry]').forEach((element) => {
        if (element.dataset.structureTypingEntry === words.id) element.remove();
      });
      // Already in the note (it landed, then the page went away before the record was cleared): never written twice.
      const unitText = history.readLiveFlow(words.blockId)?.units.find((unit) => unit.id === words.unitId)?.text;
      const inserted = mergeTypedText('\u0000', words.initialText, words.text, words.text.length);
      const insertedText = inserted ? inserted.text.slice(1) : words.text;
      if (unitText !== undefined && insertedText && unitText.includes(insertedText)) {
        forgetUnplacedWords(noteId, words.id);
        continue;
      }
      const entry = openEntry(noteId, { blockId: words.blockId, unitId: words.unitId, caret: words.text.length }, words.text,
        { initialText: words.initialText, focus: false });
      entry.id = words.id;
      retainWords(entry);
      placeTypedRef.current(entry);
    }
  }, [account, accountPending, input.blocks.length, input.noteId, retainWords]);

  const onHeadingStructure = useCallback((block: NoteBlock, request: HeadingTextFlowStructureRequest) => {
    const previousUnit = request.previousTextFlow.units.find((unit) => unit.id === request.headingUnitId)
      || request.previousTextFlow.units[0];
    if (!previousUnit) return Promise.resolve(false);
    // Undo puts the caret back where it was before the prefix turned the line into a heading.
    const beforeCaret = Math.min(previousUnit.text.length, request.beforeCaret ?? request.focus.caret);
    return commitStructure([{ block, previousTextFlow: request.previousTextFlow, nextTextFlow: request.nextTextFlow,
      metadata: { unitId: request.headingUnitId, inputType: request.inputType, kind: 'structural', isComposing: false,
        beforeSelection: { unitId: previousUnit.id, start: beforeCaret, end: beforeCaret },
        afterSelection: { unitId: request.focus.unitId, start: request.focus.caret, end: request.focus.caret } },
    }], [{ block, request }], false);
  }, [commitStructure]);
  const onHeadingStructureRef = useRef(onHeadingStructure);
  onHeadingStructureRef.current = onHeadingStructure;
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
  // Resolves once typed words are in the note or plainly kept, and no structure is running. A leave
  // never waits longer than the watchdog: by then any open window's words are kept and stored.
  const whenTypingSettled = useCallback(() => new Promise<void>((resolve) => {
    if (isSettled()) { resolve(); return; }
    let done = false;
    const finishWaiting = () => { if (!done) { done = true; resolve(); } };
    settleWaiters.current.push(finishWaiting);
    setTimeout(() => {
      if (done) return;
      const open = buffer.current;
      if (open?.typing.changed()) retainWords(open);
      finishWaiting();
    }, latest.current.watchdogMs ?? HEADING_STRUCTURE_WATCHDOG_MS);
  }), [retainWords]);
  return { onHeadingStructure, onDocumentEdit, canUseHeading, busy, isBusy: () => busyRef.current, whenTypingSettled };
}
