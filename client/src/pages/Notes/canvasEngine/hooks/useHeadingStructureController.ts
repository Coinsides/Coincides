import { useCallback, useEffect, useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { flushSync } from 'react-dom';
import { useAuthStore } from '@/stores/authStore';
import type { NoteBlock, TextBlockContentV1, TextUnitWritingRole } from '../runtimeDataTypes';
import type { BlockBoxLayout } from '../runtimeLayout';
import type { TemplateOption } from '@/services/templateOptions';
import type { HeadingTextFlowStructureRequest } from '../headingRoleService';
import { headingLevelForRole } from '../headingRoleService';
import { headingStructureRequestForEdit } from '../headingInputService';
import { getTextFlowContent, projectTextFlowContent, TEXT_FLOW_CONTENT_KEY } from '../textFlowService';
import { forgetUnplacedWords, openStructureTypingBuffer, readUnplacedWords, rememberUnplacedWords, type UnplacedWords,
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
// Longest wait between two asks of one kept entry. A kept entry that cannot land asks less and less often.
const RETRY_MAX_MS = 10_000;
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
export function mergeTypedText(live: string, initial: string, typed: string, typedCaret: number,
  options: { emptyMatches?: boolean } = { emptyMatches: true }): { text: string; caret: number } | null {
  // Unchanged text takes the window as it is. Empty matching empty proves nothing for kept words, though: unit ids are
  // reused, and an empty unit of the same id may be a new line the person just made. Kept words pass emptyMatches
  // false and need a real anchor like any other.
  if (live === initial && (initial !== '' || options.emptyMatches !== false)) return { text: typed, caret: Math.min(typedCaret, typed.length) };
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
  // Only text that was really on either side anchors the words. An empty side is no anchor: '' ends every text, and
  // would put words typed into an empty unit at the end of whatever it holds now.
  if (start > 0 && live.startsWith(before)) at = start;
  else if (end > 0 && live.endsWith(after)) at = live.length - after.length;
  // Typed at the end: the text they followed still ends the unit (something was added in front of it).
  else if (start > 0 && end === 0 && live.endsWith(before)) at = live.length;
  if (at < 0) return null;
  // What the anchors do not account for is text that came into the unit since. If the words already show up there,
  // they may have landed and been typed on: placing them again could write them twice, so they are kept instead.
  const lead = start > 0 && live.startsWith(before) ? before.length : 0;
  const tail = end > 0 && live.endsWith(after) ? after.length : 0;
  if (live.slice(lead, Math.max(lead, live.length - tail)).includes(inserted)) return null;
  return { text: live.slice(0, at) + inserted + live.slice(at), caret: at + inserted.length };
}

/**
 * Whether the window's words are already in the note where they were typed: the whole typed text, from the anchor
 * unit's start running forward, or ending at the anchor unit's end running back, closed by a line edge on the far
 * side. Lines that Enter split off live in the units that follow, so the text read forward runs on through them,
 * joined as the window joined them. A lookalike that merely starts or ends the same way does not count.
 */
export function typedTextIsPlaced(forward: string, backward: string, _initial: string, typed: string): boolean {
  if (!typed) return false;
  if (forward.startsWith(typed) && (forward.length === typed.length || forward[typed.length] === '\n')) return true;
  const from = backward.length - typed.length;
  return backward.endsWith(typed) && (from === 0 || backward[from - 1] === '\n');
}

type Focus = { blockId: string; unitId: string; caret: number };
// One window's words. The live entry is the open window; kept entries could not land yet.
// retryDelay: the wait before a kept entry asks again; it doubles after each refusal, up to RETRY_MAX_MS.
// role: the writing role of the words' unit when they were kept. Kept words from an empty unit go back into an empty unit
// only if it still has that role: a new empty paragraph that reused the id (Enter) is not where a heading's words went.
// roleFixed: the role was settled, once, when the words were kept or reopened; undefined then is a settled answer.
type Entry = { id: string; typing: StructureTypingBuffer; session?: string; focus: Focus; retryDelay?: number;
  role?: TextUnitWritingRole; roleFixed?: boolean; source?: UnplacedWords['source'] };
// The stored record with the role beside it. Older records have none, and their words from an empty unit stay kept.
type StoredWords = UnplacedWords & { writingRole?: TextUnitWritingRole };
let entryCount = 0;
const nextEntryId = () => `${Date.now().toString(36)}-${(entryCount += 1)}`;

/** A-20 r3d (N6): what kept words need of a recovery receipt (a BlockEditRecoveryReceipt fits). */
export interface RecoveryReceiptText {
  readonly blockId: string;
  readonly textFlow?: TextBlockContentV1;
  readonly contentJson?: Record<string, unknown>;
}

// A-20 r3d (N6a): a block's live units, id and text, in order. Exact: no substring, no normalising.
function unitTexts(flow: TextBlockContentV1 | null | undefined): string[] | null {
  return flow ? flow.units.filter((unit) => unit.status !== 'deleted').map((unit) => `${unit.id}\u0000${unit.text}`) : null;
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
  /** Defaults to HEADING_STRUCTURE_WATCHDOG_MS. Also the longest a leave waits for typed words. */
  watchdogMs?: number;
  /** Defaults to EDITOR_WAIT_MS. */
  editorWaitMs?: number;
  /** Defaults to PLACE_RETRY_MS. */
  placeRetryMs?: number;
  /**
   * A-20 r3d (N6): receipts from another mount the recovery queue offers (Apply / Dismiss). Kept words do not land on a
   * block one of them has words for that the server did not have, until it is applied or dismissed.
   */
  recoveryReceipts?: readonly RecoveryReceiptText[];
}) {
  const latest = useRef(input); latest.current = input;
  // A-20 r3d (N6a): each block's units as the server gave them when this note opened, taken once, the first time the
  // block is seen. Never the live units: the first kept words to land change those, and a later record would then
  // read the receipt as words the server lacks.
  // Taken again for each note opened: the runtime is not remounted when the route goes from one note to another and
  // back (NoteDetail is not keyed by note), and the server's text of a note opened again is what it is now, not what
  // it was on the first visit. The old note's blocks seen until the new note's fetch lands have other ids.
  const openedTexts = useRef(new Map<string, string[] | null>());
  const openedFor = useRef(input.noteId);
  if (openedFor.current !== input.noteId) { openedFor.current = input.noteId; openedTexts.current = new Map(); }
  for (const block of input.blocks) {
    if (!openedTexts.current.has(block.id)) openedTexts.current.set(block.id, unitTexts(getTextFlowContent(block.content_json)));
  }
  // A-20 r3d (N6a): a receipt holds kept words back only when its units differ from the server's text of the block at
  // opening (exactly, unit by unit). One the server already has (its save went through after the page left) holds
  // nothing back; with no flow on either side it holds.
  const recoveryWaiting = useCallback((blockId: string) => (latest.current.recoveryReceipts ?? []).some((receipt) => {
    if (receipt.blockId !== blockId) return false;
    const mine = unitTexts(receipt.textFlow ?? getTextFlowContent(receipt.contentJson ?? {}));
    const server = openedTexts.current.get(blockId);
    return !mine || !server || mine.length !== server.length || mine.some((text, index) => text !== server[index]);
  }), []);
  const busyRef = useRef(false);
  const activeRun = useRef<object | null>(null);
  const [busy, setBusy] = useState(false);
  const buffer = useRef<Entry | null>(null);
  const kept = useRef(new Set<Entry>());
  const mounted = useRef(true);
  // The last structure batch, settled or not, and the note it belongs to. A run the watchdog let go is still inside
  // its batch until its awaited write settles, and the history refuses a second batch meanwhile: the next structure
  // on the same note waits for it (another note's history is its own and never waits). The wait is inside the
  // waiting run, so its own watchdog bounds it: a write that hangs past about 20 s from the first structure leaves
  // the words in the note unsplit. While it waits the note is read-only again, as during any structure.
  const lastBatch = useRef<{ session?: string; settled: Promise<unknown> }>({ settled: Promise.resolve() });

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

  // Kept words land one at a time, each in a task of its own outside React's effects. Reading the note, merging the
  // words in and the edit itself are one synchronous step (placeTyped); an edit made inside an effect cannot reach the
  // note before the next one reads it, and the next would then be merged onto the text from before and write the first
  // away. So the next landing starts only after the one before it has published its edit.
  const landingQueue = useRef<Entry[]>([]);
  const landingScheduled = useRef(false);
  const landKept = (entry: Entry) => {
    if (!landingQueue.current.includes(entry)) landingQueue.current.push(entry);
    if (landingScheduled.current) return;
    landingScheduled.current = true;
    const next = () => setTimeout(() => {
      // A-25 ③ H1: a landing that throws must not stop the queue for the rest of this mount; the entry that threw
      // stays kept (it was not removed) and its own retry asks again.
      try {
        const due = landingQueue.current.shift();
        if (due && kept.current.has(due) && mounted.current) placeTypedRef.current(due);
      } finally {
        if (landingQueue.current.length) next();
        else landingScheduled.current = false;
      }
    }, 0);
    next();
  };
  // sameDelay: asking again only because the person is in the box is not a refusal; it does not slow the next ask.
  const retryTimer = (entry: Entry, sameDelay = false) => {
    const delay = entry.retryDelay ?? latest.current.placeRetryMs ?? PLACE_RETRY_MS;
    if (!sameDelay) entry.retryDelay = Math.min(delay * 2, RETRY_MAX_MS);
    setTimeout(() => {
      if (!kept.current.has(entry) || !mounted.current) return;
      if (latest.current.noteId === entry.session) landKept(entry);
      else retryTimer(entry);
    }, delay);
  };

  // The role of the unit the words belong to. Settled once, when the words are kept (read from the note at that
  // moment) or reopened (taken from the record, never from the note): read later, it would come from whatever unit
  // now has that id, and compare that unit with itself. A unit not there at that moment gives no role: kept.
  const liveRole = (entry: Entry): TextUnitWritingRole | undefined => latest.current.textHistory.readLiveFlow(entry.focus.blockId)
    ?.units.find((unit) => unit.id === entry.focus.unitId && unit.status !== 'deleted')?.writing_role;
  const fixRole = (entry: Entry, role: TextUnitWritingRole | undefined) => {
    if (entry.roleFixed) return;
    entry.role = role;
    entry.roleFixed = true;
  };
  // An open window has not been kept yet: what it would be stored with is read now, and not settled.
  const roleOf = (entry: Entry): TextUnitWritingRole | undefined => entry.roleFixed ? entry.role : liveRole(entry);
  const storedWords = (entry: Entry): StoredWords => ({ id: entry.id, blockId: entry.focus.blockId, unitId: entry.focus.unitId,
    initialText: entry.typing.initialText, text: entry.typing.text(), writingRole: roleOf(entry),
    // A-20b r2 (乙): where the words came from decides whether their '\n' is a paragraph key; it outlives each rewrite.
    ...(entry.source ? { source: entry.source } : {}) });

  // Words that cannot go in now: on screen, saying so, and stored for when the note is open again.
  const retainWords = useCallback((entry: Entry) => {
    if (buffer.current === entry) buffer.current = null;
    if (!kept.current.has(entry)) {
      kept.current.add(entry);
      fixRole(entry, liveRole(entry));
      const { typing, session, id } = entry;
      let count = 0;
      // Read where the words belong when storing, not when kept: a structure may move their unit to another block.
      const remember = () => {
        if (session) count = rememberUnplacedWords(session, storedWords(entry));
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
      rememberUnplacedWords(entry.session, storedWords(entry));
    };
    window.addEventListener('pagehide', storeOpenWindow);
    return () => window.removeEventListener('pagehide', storeOpenWindow);
  }, []);

  const canUseHeading = useCallback((block: NoteBlock | null) => {
    const current = latest.current;
    if (current.readOnly || busyRef.current) return false;
    return !current.coverFrameId || !block || current.layouts[block.id]?.frame_id !== current.coverFrameId;
  }, []);

  // A kept entry reopened from storage keeps its record's id, on screen too: one record, one box, one stored copy.
  const openEntry = (session: string | undefined, focus: Focus, text: string,
    options: { initialText?: string; focus?: boolean; id?: string; source?: UnplacedWords['source'] } = {}) => {
    const entry: Entry = { id: options.id ?? nextEntryId(), session, focus: { ...focus }, typing: null as unknown as StructureTypingBuffer,
      source: options.source };
    entry.typing = openStructureTypingBuffer({ text, caret: focus.caret, initialText: options.initialText, focus: options.focus,
      locate: () => editorFor(entry.focus.blockId, entry.focus.unitId, true) });
    entry.typing.element.dataset.structureTypingEntry = entry.id;
    return entry;
  };

  const commitStructure = useCallback(async (changes: DocumentTextFlowEdit[],
    requests: { block: NoteBlock; request: HeadingTextFlowStructureRequest }[], documentEdit: boolean): Promise<boolean> => {
    if (latest.current.readOnly || busyRef.current || requests.some(({ block }) => !canUseHeading(block))) return false;
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
    // The earlier batch this run is waiting for, while it waits.
    let waitingFor: typeof lastBatch.current | null = null;
    const watchdog = setTimeout(() => {
      if (!current()) return;
      // Abandon the run: its later steps see current() === false and stop.
      activeRun.current = null; release();
      // Given up while waiting for a batch that never settles: the next structure must not wait for it all over again.
      // It goes straight to the history, which refuses at once while that batch is open.
      if (waitingFor && lastBatch.current === waitingFor) lastBatch.current = { settled: Promise.resolve() };
      publishTextHalves(touchedBlockIds());
      latest.current.onFailure();
      exitQueue();
    }, api.watchdogMs ?? HEADING_STRUCTURE_WATCHDOG_MS);
    const touched = new Set(changes.map((change) => change.block.id));
    const touchedBlockIds = () => [...touched];
    // The window's unit has moved: from here on its words belong to the block that now holds it.
    // Kept words anchored on a unit this run moves go with it, on screen and in storage: the structure knows where
    // the unit went; nobody else can (unit ids repeat from block to block, so the note is never searched for one).
    const followUnit = (unitId: string, blockId: string, from: string) => {
      if (entry.focus.unitId === unitId) entry.focus = { ...entry.focus, blockId };
      for (const other of kept.current) {
        if (other !== entry && other.session === session && other.focus.blockId === from && other.focus.unitId === unitId) {
          other.focus = { ...other.focus, blockId };
        }
      }
      if (session) {
        for (const words of readUnplacedWords(session)) {
          if (words.blockId === from && words.unitId === unitId) rememberUnplacedWords(session, { ...words, blockId });
        }
      }
    };
    // A-25 r3 (F1): the structure's own body has begun (its edit may be on screen and in undo from here on).
    let bodyStarted = false;
    try {
      // Pause A1 writes before the existing unit transfers begin and drain any
      // earlier placement save, while its pure full plan remains available.
      const previous = lastBatch.current;
      await rendered(); await api.whenWritesIdle?.();
      if (previous.session === session) { waitingFor = previous; await previous.settled; waitingFor = null; }
      await rendered();
      if (!current()) return false;
      const batch = api.textHistory.runStructureBatch(async (record) => {
        bodyStarted = true;
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
            followUnit(segment[0], targetId, block.id);
            await rendered();
            segmentBlocks.push(targetId); touched.add(targetId);
            for (const unitId of segment.slice(1)) {
              const original = api.textHistory.readLiveBlock(block.id);
              const destination = api.textHistory.readLiveBlock(targetId);
              const destinationFlow = api.textHistory.readLiveFlow(targetId);
              const last = destinationFlow?.units[destinationFlow.units.length - 1];
              if (!original || !destination || !last || !current()
                || !await api.textHistory.moveUnit(original, unitId, destination, last.id, 'after')) return false;
              followUnit(unitId, targetId, block.id);
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
      lastBatch.current = { session, settled: batch.catch(() => false) };
      const succeeded = await batch;
      if (!current()) return false;
      if (!succeeded) {
        succeededFocus = null;
        latest.current.onFailure();
        publishTextHalves(touchedBlockIds());
      }
      // After the per-request focus frame: the boundary is open again.
      exitQueue();
      return succeeded;
    } catch {
      if (current()) {
        succeededFocus = null;
        // A-25 r2 (②b 乙): refused, before anything of it was applied, while a block of this structure holds a failed
        // save. The key is refused as before; the block's own mark (Retry / Copy) already says why, so no toast at
        // every key. r3 (F1): once the body has begun, its edit may be on screen and in undo: that failure is told.
        // r3: read from the history's ledgers, not from the error: in the browser the refusal arrives from the write
        // registry (whenWritesIdle above rethrows the failed save's own error), not as FailedSaveHoldError.
        if (!(!bodyStarted && latest.current.textHistory.holdsFailedSave(touchedBlockIds()))) latest.current.onFailure();
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
    // Someone typing in a kept box is not interrupted by its words landing under them: asked again later, at the same
    // pace, for as long as the focus stays there. This also holds when a composition in the box has just ended.
    if (!live && document.activeElement === typing.element) {
      if (kept.current.has(entry)) retryTimer(entry, true);
      return;
    }
    // A-25 ③ H2: the note changed between queueing and running: a kept entry waits for its note again (retryTimer
    // lands it once that note is current) instead of dropping out of the retry chain until a reload.
    if (latest.current.noteId !== entry.session) {
      if (live) leaveBuffer();
      else if (kept.current.has(entry)) retryTimer(entry);
      return;
    }
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
    // Kept words already in the note at their place (they landed, and the record outlived it): nothing to write.
    if (!live) {
      const units = flow.units.filter((candidate) => candidate.status !== 'deleted');
      const index = units.findIndex((candidate) => candidate.id === unit.id);
      if (typedTextIsPlaced(units.slice(index).map((candidate) => candidate.text).join('\n'),
        units.slice(0, index + 1).map((candidate) => candidate.text).join('\n'), typing.initialText, typing.text())) {
        finish(blockId, unitId, Math.min(typing.caret(), unit.text.length));
        return;
      }
    }
    // Empty matching empty is taken for an open window, and for kept words only when the empty unit found by its block
    // and id still has the role it had when they were kept.
    // A-20 r3d (N6): a receipt from an earlier page waits for this block in the recovery queue. Kept words landing now
    // would save the block, and that save's receipt replaces the waiting one (one receipt per block), then goes when the
    // save succeeds: words the server never had would be gone. They wait in the box until it is applied or dismissed.
    if (!live && recoveryWaiting(blockId)) { keep(); return; }
    const merged = mergeTypedText(unit.text, typing.initialText, typing.text(), typing.caret(),
      { emptyMatches: live || (entry.roleFixed === true && entry.role !== undefined && unit.writing_role === entry.role) });
    // The words' place in the unit cannot be found: never moved somewhere else silently. Nothing is touched on the
    // way out: no undo boundary, no save, no history. A refused ask must not cut what someone is typing elsewhere.
    if (!merged) { keep(); return; }
    // Only now, with an edit to make: the history can still refuse at the boundary; the same promise holds.
    if (!history.boundary()) { keep(); return; }
    let caret = merged.caret;
    let caretUnitId = unit.id;
    let next: TextBlockContentV1 = { ...flow, units: flow.units.map((candidate) => candidate.id === unit.id
      ? { ...candidate, text: merged.text } : candidate) };
    // Enter in the window splits paragraphs exactly as the editor's Enter does.
    // A-20b r2 (乙): only a window's '\n' is that Enter. A record the text history kept ('edit', 'split') holds a unit's
    // text, where '\n' is the editor's Shift+Enter (Enter and a multi-line paste make new units): it lands as it is. A
    // record with no source (older format) is split as before.
    for (let splitting = entry.source === 'edit' || entry.source === 'split' ? '' : unit.id; splitting;) {
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
    // In the note now, but only locally until the save that carries them is confirmed. A page that goes away before
    // that would lose them (3b): they stay stored, anchored on the unit as it was just before they landed, until the
    // history's writes have settled. Reopening places them only if they are not already there at that anchor.
    if (entry.session) {
      const session = entry.session;
      const landed: StoredWords = { id: entry.id, blockId, unitId: unit.id, initialText: unit.text, text: merged.text,
        writingRole: unit.writing_role, ...(entry.source ? { source: entry.source } : {}) };
      rememberUnplacedWords(session, landed);
      const confirm = (attempt: number) => {
        history.flush().then(() => forgetUnplacedWords(session, landed.id), () => {
          // A failed save holds the words for Retry or Undo; a composition only delays the flush. Ask again while
          // this note is open; past that the record waits for the next opening, which checks before writing.
          if (attempt < 30 && mounted.current && latest.current.noteId === session) {
            setTimeout(() => confirm(attempt + 1), latest.current.placeRetryMs ?? PLACE_RETRY_MS);
          }
        });
      };
      confirm(0);
    }
    // Body after a heading needs its own block. The words are already in the note, so a structure
    // that fails or is left behind can at most leave them unsplit: it can no longer lose them.
    const structure = headingStructureRequestForEdit(flow, next, { unitId: caretUnitId, caret });
    // Only a window the person is typing in goes on to the structure. Kept words that land later (a retry, a reopened
    // note, a landed record) only put the words back: no structure, no window, no focus, no read-only spell while the
    // person may be writing elsewhere. A heading left sharing its block with them is split the next time that block
    // is edited, when the editor's own heading detection asks for it.
    if (structure && live) void onHeadingStructureRef.current(block, { ...structure, previousTextFlow: next });
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
      // Compared where the words were typed, never as a substring: 'od' typed after 'body' is not in 'body'.
      const units = history.readLiveFlow(words.blockId)?.units.filter((unit) => unit.status !== 'deleted') ?? [];
      const at = units.findIndex((unit) => unit.id === words.unitId);
      if (at >= 0 && typedTextIsPlaced(units.slice(at).map((unit) => unit.text).join('\n'),
        units.slice(0, at + 1).map((unit) => unit.text).join('\n'), words.initialText, words.text)) {
        forgetUnplacedWords(noteId, words.id);
        continue;
      }
      const entry = openEntry(noteId, { blockId: words.blockId, unitId: words.unitId, caret: words.text.length }, words.text,
        { initialText: words.initialText, focus: false, id: words.id, source: words.source });
      // A record without a role (older format) gives none: its words from an empty unit stay kept.
      fixRole(entry, (words as StoredWords).writingRole);
      retainWords(entry);
      // Through the landing queue: each in a task of its own, outside this effect (see landKept).
      landKept(entry);
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
