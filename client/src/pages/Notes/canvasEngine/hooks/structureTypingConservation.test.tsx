// Conservation gate for words typed around heading structures (order A-21/A-24, condition e).
// Every word typed is in exactly one place afterwards: the note, or kept (on screen and in
// localStorage, two copies of one keeping). In the note it sits in the unit it was typed into.
// Sequences are seeded; a failure prints the seed and the events so it can be replayed alone.
import { act, render, waitFor } from '@testing-library/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TemplateOption } from '@/services/templateOptions';
import { createBoardTextRangeEditSession } from '../boardTextRangeEditSession';
import type { NoteBlock, TextBlockContentV1, TextUnitWritingRole } from '../runtimeDataTypes';
import { createTextBlockContentV1, getTextFlowContent, TEXT_FLOW_CONTENT_KEY } from '../textFlowService';
import { applyHeadingInputAtLine, headingStructureRequestForEdit } from '../headingInputService';
import { mergeTextUnitWithPrevious, splitTextUnitForEnter } from '../textUnitEditorService';
import { readUnplacedWords, rememberUnplacedWords } from '../structureTypingBuffer';
import { useHeadingStructureController } from './useHeadingStructureController';
import { usePlacementHistory } from './usePlacementHistory';
import { useTextFlowHistory, type TextFlowHistoryHost } from './useTextFlowHistory';

const template: TemplateOption = { template_id: 'text.paragraph', template_key: 'text.paragraph', template_version: '1.0.0',
  label: 'Text', description: 'Text', system_type: 'text', learning_role: 'note', legacy_block_type: 'paragraph',
  default_content: {}, origin: 'test', status: 'active', isRuntime: false };
const layout = { x: 0, y: 0, width: 400, height: 64, frame_id: 'page',
  coordinate_space: 'page_frame_local' as const, surface: 'formal_page' as const, width_mode: 'auto' as const };
type HistoryOptions = Parameters<typeof useTextFlowHistory>[0];

// The app runs under React's own scheduler, not act(): an act scope holds commits until it ends,
// and the structure waits for exactly those commits. Turned off here so timing is the app's.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;

const TOKEN = /<k\d+>/g;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const textOf = (flow: TextBlockContentV1) => flow.units.filter((unit) => unit.status !== 'deleted').map((unit) => unit.text).join('\n');

function textFlow(rows: Array<[string, string, TextUnitWritingRole?]>): TextBlockContentV1 {
  const flow = createTextBlockContentV1('');
  flow.units = rows.map(([id, text, role], index) => ({ ...flow.units[0], id, text, writing_role: role ?? 'paragraph', order_index: index }));
  return flow;
}

function block(id: string, flow: TextBlockContentV1, order: number): NoteBlock {
  return { id, block_type: 'paragraph', title: null, content_json: { [TEXT_FLOW_CONTENT_KEY]: flow },
    plain_text: textOf(flow), metadata: {}, order_index: order, source_references: [], placement_id: `p-${id}`,
    display_overrides_json: {}, canvas_layout: layout, text_save_revision: 0 };
}

// Mulberry32: small, seedable, the same sequence on every machine.
function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

// conflict: the unit-transfer answered 409; the server applied nothing and the real adapter returns null (after its toast).
// refuse (A-20 r3 M5): the adapter turns the save down before writing its recovery receipt (mutation_not_allowed,
// route_receipt_unavailable, board_range_sync_failed): nothing is sent, nothing is held for recovery.
type FaultKind = 'create' | 'transfer' | 'conflict' | 'reorder' | 'placement' | 'idleHang' | 'idleReject' | 'save' | 'refuse';
type Hooks = {
  editing: ReturnType<typeof useTextFlowHistory>;
  history: ReturnType<typeof usePlacementHistory>;
  heading: ReturnType<typeof useHeadingStructureController>;
  blocks: NoteBlock[];
  flowDrafts: Record<string, TextBlockContentV1>;
};

// Persistence lives in `server`; the host keeps React state, as the app's data adapter does.
// Its setters run after an await, at default priority: the timing that hid commit-1 from mutable fakes.
function makeWorld() {
  const server: Record<string, NoteBlock[]> = {
    note: [
      block('prior', textFlow([['tu-1', '<P0>'], ['tu-2', '<P1>']]), 0),
      block('work', textFlow([['tu-1', '<W0>'], ['tu-2', '<W1>']]), 1),
    ],
    other: [block('o', textFlow([['tu-1', '<O0>']]), 0)],
  };
  const world = {
    server,
    noteId: 'note',
    fault: null as FaultKind | null,
    // Matching calls to let through before the fault fires: 1 means the second such call fails.
    faultSkip: 0,
    setBlocks: (_: (current: NoteBlock[]) => NoteBlock[]) => {},
    setFlowDrafts: (_: (current: Record<string, TextBlockContentV1>) => Record<string, TextBlockContentV1>) => {},
    hooks: null as Hooks | null,
    // Saves sent while this is on never reach the server and never answer (a slow reply cut off by the page going).
    holdSaves: false,
    // A-20 r3d (N6): receipts from another mount the recovery queue offers (the controller's recoveryReceipts).
    recoveryReceipts: [] as { blockId: string; contentJson: Record<string, unknown> }[],
    // Saves to let through before holding starts: holdSaves@1 holds from the second save on.
    holdSkip: 0,
    // Bumped when the page goes away: the old page's code can no longer send anything.
    generation: 0,
    // A sync-priority commit of the host (a click elsewhere on the page) that carries no write.
    click: () => {},
    created: 0,
    log: [] as string[],
    // A-20 r2: the adapter's recovery receipts, as the app keeps them in localStorage: written before each block save
    // (one per block, the newer replacing the older), dropped when a save of the block succeeds, kept when it is held
    // or rejected. They outlive the page, and the banner offers them when the note is opened again.
    receipts: new Map<string, TextBlockContentV1>(),
  };
  const take = (kind: FaultKind) => {
    if (world.fault !== kind) return false;
    if (world.faultSkip > 0) { world.faultSkip -= 1; world.log.push(`fault ${kind} skipped`); return false; }
    world.fault = null;
    world.log.push(`FAULT ${kind}`);
    return true;
  };
  const units = (flow?: TextBlockContentV1 | null) => (flow?.units ?? []).filter((unit) => unit.status !== 'deleted')
    .map((unit) => `${unit.writing_role === 'paragraph' ? '' : 'H:'}${unit.text}`).join('|');
  // A write lands on its own note whether or not that note is still open.
  const commit = (noteId: string, update: (current: NoteBlock[]) => NoteBlock[],
    drafts?: Record<string, TextBlockContentV1>) => {
    server[noteId] = update(server[noteId]);
    if (world.noteId !== noteId) return;
    world.setBlocks(update);
    if (drafts) world.setFlowDrafts((current) => ({ ...current, ...drafts }));
  };
  const noteOf = (blockId: string) => Object.keys(server).find((noteId) => server[noteId].some((entry) => entry.id === blockId)) ?? world.noteId;
  const adapter = {
    saveBlock: (async (target, text, options) => {
      if (take('refuse')) {
        world.log.push(`save ${target.id} REFUSED before its receipt`);
        return { status: 'rejected', block: null, recoveryReceipt: null, reconciliation: 'not_attempted',
          durableState: 'not_checked', reason: 'board_range_sync_failed', staleEpoch: false } as never;
      }
      const issued = options?.textFlow ?? getTextFlowContent(target.content_json);
      if (issued) world.receipts.set(target.id, structuredClone(issued));
      if (world.holdSaves && world.holdSkip > 0) world.holdSkip -= 1;
      else if (world.holdSaves) { world.log.push(`save ${target.id} HELD (never reaches the server)`); return new Promise(() => {}); }
      await sleep(5);
      if (take('save')) {
        world.log.push(`save ${target.id} REJECTED`);
        // Sent and failed: the adapter wrote its receipt before sending (above), and returns it.
        return { status: 'rejected', block: null, recoveryReceipt: { recoveryKey: `receipt:${target.id}` }, reconciliation: 'read_failed',
          durableState: 'missing', reason: 'request_failed', staleEpoch: false } as never;
      }
      const flow = options?.textFlow ?? getTextFlowContent(target.content_json)!;
      const saved = { ...target, content_json: options?.contentSnapshot?.contentJson ?? { ...target.content_json, [TEXT_FLOW_CONTENT_KEY]: flow },
        plain_text: options?.contentSnapshot?.plainText ?? text, text_save_revision: (options?.baseRevision ?? target.text_save_revision ?? 0) + 1 };
      world.log.push(`save ${target.id} [${units(flow)}]`);
      world.receipts.delete(target.id);
      commit(noteOf(target.id), (current) => current.map((entry) => entry.id === target.id ? saved : entry));
      return { status: 'saved', block: saved, recoveryReceipt: null, reconciliation: 'response' };
    }) as HistoryOptions['saveBlock'],
    createDraftBlock: (async (_template, _text, options) => {
      await sleep(5);
      if (take('create')) throw new Error('synthetic create failure');
      const noteId = world.noteId;
      const created = { ...block(`new-${++world.created}`, getTextFlowContent(options?.contentJson ?? {})!, server[noteId].length),
        content_json: options!.contentJson! };
      world.log.push(`create ${created.id} [${units(getTextFlowContent(created.content_json))}]`);
      commit(noteId, (current) => [...current, created], { [created.id]: getTextFlowContent(created.content_json)! });
      return { block: created, clientCreateKey: options!.clientCreateKey!, placementPersisted: true, reused: false };
    }) as NonNullable<HistoryOptions['createDraftBlock']>,
    saveDraftBlockPlacement: (async (target) => {
      await sleep(5);
      if (take('placement')) throw new Error('synthetic placement failure');
      return target;
    }) as NonNullable<HistoryOptions['saveDraftBlockPlacement']>,
    discardDraftBlock: (async () => true) as NonNullable<HistoryOptions['discardDraftBlock']>,
    trashBlock: (async (id) => {
      world.log.push(`trash ${id}`);
      commit(noteOf(id), (current) => current.filter((entry) => entry.id !== id));
      return true;
    }) as NonNullable<HistoryOptions['trashBlock']>,
    restoreBlock: (async (target) => {
      commit(world.noteId, (current) => [...current, target]);
      return target;
    }) as NonNullable<HistoryOptions['restoreBlock']>,
    transferTextUnit: (async (input) => {
      await sleep(5);
      if (take('transfer')) throw new Error('synthetic transfer failure');
      if (take('conflict')) { world.log.push(`transfer ${input.textUnitId} CONFLICT (409)`); return null; }
      const sourceBlock = { ...input.sourceBlock, content_json: { [TEXT_FLOW_CONTENT_KEY]: input.sourceTextFlow },
        plain_text: textOf(input.sourceTextFlow), ...input.sourcePayload, text_save_revision: input.sourceBaseRevision + 1 };
      const targetBlock = { ...input.targetBlock, content_json: { [TEXT_FLOW_CONTENT_KEY]: input.targetTextFlow },
        plain_text: textOf(input.targetTextFlow), ...input.targetPayload, text_save_revision: input.targetBaseRevision + 1 };
      world.log.push(`transfer ${input.textUnitId} ${sourceBlock.id}[${units(input.sourceTextFlow)}] -> ${targetBlock.id}[${units(input.targetTextFlow)}]`);
      commit(noteOf(sourceBlock.id), (current) => current.map((entry) => entry.id === sourceBlock.id ? sourceBlock
        : entry.id === targetBlock.id ? targetBlock : entry), { [sourceBlock.id]: input.sourceTextFlow, [targetBlock.id]: input.targetTextFlow });
      return { sourceBlock, targetBlock };
    }) as NonNullable<HistoryOptions['transferTextUnit']>,
    reorder: async (ids: readonly string[]) => {
      await sleep(5);
      if (take('reorder')) return false;
      commit(world.noteId, (current) => ids.flatMap((id, order_index) => {
        const found = current.find((entry) => entry.id === id);
        return found ? [{ ...found, order_index }] : [];
      }));
      return true;
    },
    whenWritesIdle: () => {
      world.log.push('whenWritesIdle');
      if (take('idleHang')) return new Promise<void>(() => {});
      if (take('idleReject')) return Promise.reject(new Error('synthetic tracked write failure'));
      return Promise.resolve();
    },
  };

  function Host({ noteId }: { noteId: string }) {
    const born = useRef(world.generation).current;
    // A request the old page sent before it went away still lands; one it would send afterwards never leaves.
    const alive = <F extends (...args: never[]) => Promise<unknown>>(send: F) =>
      ((...args: Parameters<F>) => (world.generation === born ? send(...args) : Promise.reject(new Error('page gone')))) as unknown as F;
    const [blocks, setBlocks] = useState<NoteBlock[]>(() => structuredClone(server[noteId]));
    const [flowDrafts, setFlowDrafts] = useState<Record<string, TextBlockContentV1>>({});
    const [, setTextDrafts] = useState<Record<string, string>>({});
    const [annotations, setAnnotations] = useState<never[]>([]);
    world.setBlocks = (update) => setBlocks(update);
    world.setFlowDrafts = (update) => setFlowDrafts(update);
    const [, setClicks] = useState(0);
    world.click = () => flushSync(() => setClicks((count) => count + 1));
    // The adapter keeps the old note's blocks until the new note's fetch lands.
    const shown = useRef(noteId);
    useEffect(() => {
      if (shown.current === noteId) return;
      shown.current = noteId;
      void Promise.resolve().then(() => {
        setBlocks(structuredClone(server[noteId]));
        setFlowDrafts({});
        setTextDrafts({});
      });
    }, [noteId]);
    const board = useRef<ReturnType<typeof createBoardTextRangeEditSession> | null>(null);
    if (!board.current) { board.current = createBoardTextRangeEditSession('note', async (_note, updates) => updates); board.current.hydrate([]); }
    const host = useRef<TextFlowHistoryHost | null>(null);
    const editing = useTextFlowHistory({ noteId, generation: 1, blocks, annotationTruths: annotations,
      readAnnotationTruths: () => annotations, setAnnotationTruthsSnapshot: (next) => setAnnotations(next as never[]),
      blockTextFlowDrafts: flowDrafts, setBlockTextFlowDrafts: setFlowDrafts, setBlockTextDrafts: setTextDrafts,
      captureBoardTextRanges: board.current.snapshot, restoreBoardTextRanges: board.current.restore, rebaseBoardTextRanges: board.current.rebase,
      saveBlock: alive(adapter.saveBlock), saveAnnotationTruthsOutcome: async () => true, history: host,
      createDraftBlock: alive(adapter.createDraftBlock), saveDraftBlockPlacement: alive(adapter.saveDraftBlockPlacement),
      discardDraftBlock: alive(adapter.discardDraftBlock), trashBlock: alive(adapter.trashBlock), restoreBlock: alive(adapter.restoreBlock),
      transferTextUnit: alive(adapter.transferTextUnit) });
    const history = usePlacementHistory({ noteId, generation: 1, beforeHistoryBoundary: () => editing.boundary(),
      applyLayoutDrafts: () => {}, persistLayoutSnapshot: async () => true, target: null } as never);
    host.current = history;
    const heading = useHeadingStructureController({ noteId, blocks,
      layouts: Object.fromEntries(blocks.map((entry) => [entry.id, layout])), readOnly: false, template,
      textHistory: editing, reorderBlocks: alive(adapter.reorder), whenWritesIdle: adapter.whenWritesIdle,
      onFocusBlock: (id) => { world.log.push(`focusBlock ${id}`); }, onFailure: () => { world.log.push('onFailure'); }, setBlockTextDrafts: setTextDrafts,
      watchdogMs: 250, editorWaitMs: 0, ...({ placeRetryMs: 60 } as object),
      recoveryReceipts: world.recoveryReceipts });
    useLayoutEffect(() => { world.hooks = { editing, history, heading, blocks, flowDrafts }; });
    return null;
  }
  return { world, Host };
}

// The stored copy, whatever shape this build writes: every `text` field under the words keys.
// A-20 r2 (K4): 'window' reads only what a structure window kept; the text history's departure records ('edit') are
// left out, so a window that stopped keeping its own words cannot hide behind them.
// skipBox: records to leave out of the duplicate count (A-20 r3d N1; see keptTokens).
function storedTexts(only?: 'window', skipBox?: (record: Record<string, unknown>) => boolean): string[] {
  const texts: string[] = [];
  const tokens = (text: unknown) => (typeof text === 'string' ? text.match(TOKEN) ?? [] : []);
  const walk = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      if (typeof record.text === 'string') {
        if (only === 'window' && (record.source === 'edit' || record.source === 'split')) return;
        if (skipBox?.(record)) return;
        // Only what was typed into the window: its initial text is the unit's own, already in the note.
        const initial = new Set(tokens(record.initialText));
        texts.push(tokens(record.text).filter((token) => !initial.has(token)).join(''));
        return;
      }
      Object.values(record).forEach(walk);
    }
  };
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)!;
    if (key.startsWith('coincides:unplaced-words')) { try { walk(JSON.parse(localStorage.getItem(key)!)); } catch { /* not ours */ } }
  }
  return texts;
}
const shownBuffers = () => [...document.querySelectorAll<HTMLTextAreaElement>('textarea[data-structure-typing-buffer]')];

type Step = { kind: string; detail?: string };

// exemptEverything: the boundary assertion's positive control. Every word is excused at unload, the ones typed in
// a window included, exactly the misuse the assertion is there to catch.
// dropWindowRecords: the window-source boundary's positive control. The window's own records are treated as gone at
// unload while the text history's departure records stay: a word typed in a window is then held only by those.
async function runSequence(seed: number, length: number, script?: readonly string[],
  control: { exemptEverything?: boolean; dropWindowRecords?: boolean } = {}) {
  localStorage.clear();
  document.body.innerHTML = '';
  const rand = random(seed);
  const pick = <T,>(items: readonly T[]) => items[Math.floor(rand() * items.length)];
  const { world, Host } = makeWorld();
  let view = render(<Host noteId="note" />);
  const steps: Step[] = [];
  let tokenCount = 0;
  // Each token's anchor: a tag every word typed into the same unit shares.
  const anchorOf = new Map<string, string>();
  const typed: string[] = [];
  const undone = new Set<string>();
  // Ordinary unsaved edits a page took with it: the existing save path's limit, the same on both builds.
  const unsavedAtUnload = new Set<string>();
  // Words typed into a window. The unload exemption is for the existing save path only: never these (boundary of the relaxation).
  const typedInWindow = new Set<string>();
  let anchor = '<W1>';
  let away = false;
  const hooks = () => world.hooks!;
  const liveFlow = (blockId: string) => hooks().flowDrafts[blockId] ?? getTextFlowContent(hooks().blocks.find((entry) => entry.id === blockId)?.content_json ?? {});
  const locate = (tag: string) => {
    for (const entry of hooks().blocks) {
      const flow = liveFlow(entry.id);
      const unit = flow?.units.find((candidate) => candidate.status !== 'deleted' && candidate.text.includes(tag));
      if (unit && flow) return { block: entry, flow, unit };
    }
    return null;
  };
  const activeBuffer = () => shownBuffers().find((element) => !document.querySelector(`[data-structure-typing-notice]`)
    || element.ownerDocument.activeElement === element) ?? null;
  const pause = async (ms: number) => { await sleep(ms); };
  const record = (token: string) => { typed.push(token); anchorOf.set(token, anchor); };

  const typeToken = async () => {
    if (away) { steps.push({ kind: 'type', detail: 'away' }); return; }
    const token = `<k${tokenCount++}>`;
    const box = activeBuffer();
    if (box && document.activeElement === box) {
      if (!anchor) anchor = token;
      box.setSelectionRange(box.value.length, box.value.length);
      box.setRangeText(token, box.selectionStart, box.selectionEnd, 'end');
      box.dispatchEvent(new Event('input', { bubbles: true }));
      record(token);
      typedInWindow.add(token);
      steps.push({ kind: 'type', detail: `${token} in window` });
      return;
    }
    const at = locate(anchor) ?? null;
    if (!at || !hooks().editing.canApplyEdit() || hooks().heading.isBusy()) { tokenCount -= 1; steps.push({ kind: 'type', detail: 'refused' }); return; }
    const next = { ...at.flow, units: at.flow.units.map((unit) => unit.id === at.unit.id ? { ...unit, text: unit.text + token } : unit) };
    let applied = false;
    await (async () => {
      const result = await hooks().editing.applyEdit(at.block, next, { previousTextFlow: at.flow, metadata: {
        unitId: at.unit.id, inputType: 'insertText', kind: 'typing', isComposing: false,
        beforeSelection: { unitId: at.unit.id, start: at.unit.text.length, end: at.unit.text.length },
        afterSelection: { unitId: at.unit.id, start: at.unit.text.length + token.length, end: at.unit.text.length + token.length } } });
      applied = Boolean(result?.success);
    })();
    if (applied) record(token); else tokenCount -= 1;
    steps.push({ kind: 'type', detail: applied ? token : 'refused' });
  };

  const enter = async () => {
    // Away, the person is typing in another note; this gate counts the one it follows.
    if (away) { steps.push({ kind: 'enter', detail: 'away' }); return; }
    const box = activeBuffer();
    if (box && document.activeElement === box) {
      box.setSelectionRange(box.value.length, box.value.length);
      box.setRangeText('\n', box.selectionStart, box.selectionEnd, 'end');
      box.dispatchEvent(new Event('input', { bubbles: true }));
      anchor = '';
      steps.push({ kind: 'enter', detail: 'in window' });
      return;
    }
    const at = locate(anchor);
    if (!at || !hooks().editing.canApplyEdit() || hooks().heading.isBusy()) { steps.push({ kind: 'enter', detail: 'refused' }); return; }
    // An empty new line has no tag yet; the next token typed outside a window cannot find it.
    // So outside a window, Enter is always followed at once by its first token.
    const next = splitTextUnitForEnter(at.flow, at.unit.id, at.unit.text.length, at.unit.text.length);
    const index = next.units.findIndex((unit) => unit.id === at.unit.id);
    const created = next.units[index + 1];
    const token = `<k${tokenCount++}>`;
    const withToken = { ...next, units: next.units.map((unit) => unit.id === created.id ? { ...unit, text: token } : unit) };
    const request = headingStructureRequestForEdit(at.flow, next, { unitId: created.id, caret: 0 });
    if (request) {
      tokenCount -= 1;
      void hooks().heading.onHeadingStructure(at.block, request).then((ok) => world.log.push(`structure -> ${ok}`));
      anchor = '';
      steps.push({ kind: 'enter', detail: 'starts a structure' });
      return;
    }
    await (async () => {
      await hooks().editing.applyEdit(at.block, withToken, { previousTextFlow: at.flow, metadata: {
        unitId: created.id, inputType: 'insertParagraph', kind: 'structural', isComposing: false,
        beforeSelection: { unitId: at.unit.id, start: at.unit.text.length, end: at.unit.text.length },
        afterSelection: { unitId: created.id, start: token.length, end: token.length } } });
    })();
    anchor = token;
    record(token);
    steps.push({ kind: 'enter', detail: token });
  };

  const joinLines = async (how: 'join' | 'seldel') => {
    if (away) { steps.push({ kind: how, detail: 'away' }); return; }
    const at = locate(anchor);
    const index = at ? at.flow.units.findIndex((unit) => unit.id === at.unit.id) : -1;
    const previous = at && index > 0 ? at.flow.units[index - 1] : null;
    if (!at || !previous || !hooks().editing.canApplyEdit() || hooks().heading.isBusy()) { steps.push({ kind: how, detail: 'refused' }); return; }
    const next = mergeTextUnitWithPrevious(at.flow, at.unit.id);
    await (async () => {
      await hooks().editing.applyEdit(at.block, next, { previousTextFlow: at.flow, metadata: {
        unitId: previous.id, inputType: 'deleteContentBackward', kind: 'typing', isComposing: false,
        beforeSelection: how === 'join'
          ? { unitId: at.unit.id, start: 0, end: 0 }
          : { unitId: previous.id, start: previous.text.length, end: previous.text.length },
        afterSelection: { unitId: previous.id, start: previous.text.length, end: previous.text.length } } });
    })();
    steps.push({ kind: how, detail: at.unit.text.slice(0, 12) });
  };

  const heading = async (tag?: string) => {
    const at = locate(tag ?? anchor);
    if (!at || hooks().heading.isBusy() || !hooks().editing.canApplyEdit() || at.unit.writing_role !== 'paragraph') {
      steps.push({ kind: 'heading', detail: 'skipped' }); return;
    }
    const request = applyHeadingInputAtLine(at.flow, at.unit.id, `# ${at.unit.text}`, 2);
    if (!request) { steps.push({ kind: 'heading', detail: 'no request' }); return; }
    await (async () => { void hooks().heading.onHeadingStructure(at.block, request).then((ok) => world.log.push(`structure -> ${ok}`)); })();
    // Words typed in its window belong to the unit it was made on.
    if (tag) anchor = tag;
    steps.push({ kind: 'heading', detail: at.unit.text.slice(0, 12) });
  };

  const leave = async (guarded: boolean) => {
    if (away) return;
    if (guarded) {
      // The route boundary's order: typing settled, then the history flushed, then the switch.
      // A save that cannot drain holds the route, as the app does; the person stays.
      let ok = true;
      await (async () => {
        await Promise.race([hooks().heading.whenTypingSettled(), sleep(5_000).then(() => { ok = false; })]);
        if (ok) await hooks().editing.flush().catch(() => { ok = false; });
      })();
      if (!ok) { steps.push({ kind: 'leave', detail: 'held by the note' }); return; }
    }
    // An address-bar switch still blurs the editor first, which seals the typing session and starts its save.
    if (!guarded) { hooks().editing.boundary(); await pause(300); }
    world.noteId = 'other';
    view.rerender(<Host noteId="other" />);
    await pause(10);
    away = true;
    steps.push({ kind: 'leave', detail: guarded ? 'in app' : 'unguarded' });
  };

  const comeBack = async () => {
    if (!away) return;
    world.noteId = 'note';
    view.rerender(<Host noteId="note" />);
    await pause(30);
    away = false;
    steps.push({ kind: 'return' });
  };

  // The page goes away mid-whatever (a full navigation, a closed tab) and the note is opened again.
  // No cleanup runs on a real unload, so what React's unmount would store is thrown away here.
  const unload = async () => {
    // beforeunload first, as the route boundary does: blur seals the typing and the pending saves start.
    if (!away) {
      hooks().editing.boundary();
      void hooks().editing.flush().catch(() => {});
      for (let turn = 0; turn < 5; turn += 1) await Promise.resolve();
    }
    window.dispatchEvent(new Event('pagehide'));
    const onServer = new Set(world.server.note.flatMap((entry) => (getTextFlowContent(entry.content_json)?.units ?? [])
      .filter((unit) => unit.status !== 'deleted').flatMap((unit) => unit.text.match(TOKEN) ?? [])));
    const held = new Set(keptTokens());
    // A word typed in a window counts as held only if the window kept it (K4); any other word, if anything kept it.
    const heldByWindow = control.dropWindowRecords ? new Set<string>() : new Set(keptTokens('window'));
    if (!away) for (const token of noteTokens()) {
      if (!onServer.has(token) && !(typedInWindow.has(token) ? heldByWindow : held).has(token)) unsavedAtUnload.add(token);
    }
    if (control.exemptEverything) for (const token of typed) unsavedAtUnload.add(token);
    const stored: Array<[string, string]> = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)!;
      if (key.startsWith('coincides:unplaced-words')) stored.push([key, localStorage.getItem(key)!]);
    }
    world.generation += 1;
    // The page that held them is gone: what it never sent never arrives, and the next page's saves go through.
    world.holdSaves = false;
    view.unmount();
    document.body.innerHTML = '';
    for (const key of Object.keys(localStorage)) if (key.startsWith('coincides:unplaced-words')) localStorage.removeItem(key);
    for (const [key, value] of stored) localStorage.setItem(key, value);
    await pause(300);
    world.noteId = 'note';
    away = false;
    view = render(<Host noteId="note" />);
    await pause(50);
    steps.push({ kind: 'unload' });
  };

  const undoRedo = async () => {
    if (away || hooks().heading.isBusy() || activeBuffer()) { steps.push({ kind: 'undo+redo', detail: 'skipped' }); return; }
    const before = noteTokens().sort().join('');
    await (async () => { await hooks().history.undoRuntimeHistory(); })();
    await pause(300);
    await (async () => { await hooks().history.redoRuntimeHistory(); })();
    await pause(300);
    const after = noteTokens().sort().join('');
    for (const token of noteTokens()) undone.delete(token);
    steps.push({ kind: 'undo+redo', detail: before === after ? 'same' : `CHANGED ${before} -> ${after}` });
  };

  // Undo as the failure toast asks: it may take typed words back out of the note, legitimately.
  const releaseUndo = async () => {
    if (away || hooks().heading.isBusy()) { steps.push({ kind: 'undo', detail: 'skipped' }); return; }
    const before = new Set(noteTokens());
    await (async () => { await hooks().history.undoRuntimeHistory(); })();
    await pause(300);
    const after = new Set(noteTokens());
    const kept = new Set(keptTokens());
    for (const token of before) if (!after.has(token) && !kept.has(token)) undone.add(token);
    steps.push({ kind: 'undo' });
  };

  const noteTokens = () => hooks().blocks.flatMap((entry) => {
    const flow = liveFlow(entry.id);
    return flow ? flow.units.filter((unit) => unit.status !== 'deleted').flatMap((unit) => unit.text.match(TOKEN) ?? []) : [];
  });
  // An open window shows the unit's own text too; what it holds beyond the note is what was typed into it.
  // Held: shown in a window or kept-words box, stored in the kept-words archive, or (unless only the window's own
  // records count) in a recovery receipt. A receipt carries its whole block: only its words not in the note count.
  // A-20 r3d (N1), Main_Designer 2026-11-08: a box record with an empty start never lands by itself (no anchor; judged
  // by initialText, since the source tag does not survive the heading controller rewriting the record at reopen). Its
  // words that the note also has are not counted twice, UNLESS its whole text is already in that block's text on the
  // server: then the box holds what the server has (the CLICKBACK-end shape, N4), which stays red. Blind spot, TD-66:
  // a box copy that is only partly on the server is not seen as a duplicate.
  const serverBlockText = (blockId: unknown) => (getTextFlowContent(world.server.note.find((entry) => entry.id === blockId)?.content_json ?? {})
    ?.units ?? []).filter((unit) => unit.status !== 'deleted').map((unit) => unit.text).join(String.fromCharCode(10));
  const boxOnly = (record: Record<string, unknown>) => record.initialText === '' && typeof record.text === 'string'
    && !serverBlockText(record.blockId).includes(record.text);
  const keptTokens = (only?: 'window', skipSplit = false) => {
    const inNote = new Set(noteTokens());
    const shown = shownBuffers().flatMap((element) => element.value.match(TOKEN) ?? []).filter((token) => !inNote.has(token));
    const receipts = only === 'window' ? [] : [...world.receipts.values()].flatMap((flow) => flow.units
      .filter((unit) => unit.status !== 'deleted').flatMap((unit) => unit.text.match(TOKEN) ?? [])).filter((token) => !inNote.has(token));
    return [...new Set([...shown, ...storedTexts(only, skipSplit ? boxOnly : undefined).flatMap((text) => text.match(TOKEN) ?? []), ...receipts])];
  };

  let clickFrames: { mockRestore(): void } | null = null;
  const scripted = async (event: string) => {
    const [name, argument] = event.split(':');
    if (name === 'type') await typeToken();
    else if (name === 'enter') await enter();
    else if (name === 'heading') await heading(argument);
    else if (name === 'fault') {
      const [kind, skip] = argument.split('@');
      world.fault = kind as FaultKind;
      world.faultSkip = Number(skip ?? 0);
      steps.push({ kind: 'fault', detail: argument });
    }
    else if (name === 'leave') await leave(argument !== 'unguarded');
    else if (name === 'return') await comeBack();
    else if (name === 'undo') await releaseUndo();
    else if (name === 'unload') await unload();
    else if (name === 'holdSaves') { world.holdSaves = true; world.holdSkip = Number(argument || 0); steps.push({ kind: 'holdSaves', detail: argument }); }
    else if (name === 'clicks') {
      // Every frame fires before React commits, and a click commits at sync priority right after it (commit-1).
      clickFrames = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
        callback(0); world.click(); return 0;
      });
      steps.push({ kind: 'clicks' });
    }
    else if (name === 'wait') { await pause(Number(argument)); steps.push({ kind: 'wait', detail: argument }); }
    // A-20 r3 seeds. at:N types on next into the line holding <kN> (clicking back onto an earlier line).
    else if (name === 'at') { anchor = `<k${argument}>`; steps.push({ kind: 'at', detail: argument }); }
    // A-20 r3d (N1). join: Backspace at the start of the anchor's line, joining it onto the line before (the unit is
    // removed). seldel: a selection from the end of the line before to the start of the anchor's line deleted (the
    // same change of units; tokens are whole words, so only the line break is selected).
    else if (name === 'join' || name === 'seldel') await joinLines(name);
    // keepleave: what the route boundary's keepAndLeave does (keep, then the blur seals and sends); the person may
    // still be on the note after it. stay: the router held them after all, and the departure is taken back.
    else if (name === 'keepleave') {
      hooks().editing.keepOpenEdit();
      hooks().editing.boundary();
      void hooks().editing.flush().catch(() => {});
      for (let turn = 0; turn < 5; turn += 1) await Promise.resolve();
      steps.push({ kind: 'keepleave' });
    }
    else if (name === 'stay') {
      (hooks().editing as { withdrawKeptEdit?: () => void }).withdrawKeptEdit?.();
      steps.push({ kind: 'stay' });
    }
    // bfcache: the page goes into the back-forward cache and comes back; the session goes on.
    else if (name === 'bfcache') {
      window.dispatchEvent(Object.assign(new Event('pagehide'), { persisted: true }));
      window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true }));
      steps.push({ kind: 'bfcache' });
    }
    else throw new Error(`unknown scripted event ${event}`);
  };

  try {
    if (script) for (const event of script) await scripted(event);
    else for (let index = 0; index < length; index += 1) {
      const roll = rand();
      if (roll < 0.34) await typeToken();
      else if (roll < 0.44) await enter();
      else if (roll < 0.56) await heading();
      else if (roll < 0.70) {
        const kind = pick(['create', 'transfer', 'reorder', 'placement', 'idleHang', 'idleReject', 'save'] as const);
        world.fault = kind;
        steps.push({ kind: 'fault', detail: kind });
      } else if (roll < 0.78) await leave(rand() < 0.6);
      else if (roll < 0.84) await comeBack();
      else if (roll < 0.89) await undoRedo();
      else if (roll < 0.93) await releaseUndo();
      else if (roll < 0.96) await unload();
      else { const ms = pick([0, 20, 80, 300]); await pause(ms); steps.push({ kind: 'wait', detail: String(ms) }); }
      await pause(pick([0, 5, 30]));
    }
    // Settle: back on the note, faults cleared, every window and retry given time to end.
    world.fault = null;
    await comeBack();
    for (let round = 0; round < 40; round += 1) {
      await pause(50);
      const busy = hooks().heading.isBusy();
      const open = shownBuffers().some((element) => !document.querySelector('[data-structure-typing-notice]') || document.activeElement === element);
      if (!busy && !open) break;
    }
    await pause(1_000);

    const inNote = noteTokens();
    const kept = keptTokens();
    // A-20 r3d (N1): a box record kept like a split's is never placed by itself. Words in it that the note also has
    // are a copy the person is told not to paste back (manual, "Known for now"), not words written twice.
    const keptBesidesBox = keptTokens(undefined, true);
    const problems: string[] = [];
    // The relaxation's boundary: a word typed in a window is never excused as unsaved at unload.
    for (const token of unsavedAtUnload) if (typedInWindow.has(token)) problems.push(`${token} typed in window, UNSAVED AT UNLOAD is not its excuse`);
    for (const token of typed) {
      // A-20: no exemption for words still unsaved when the page went away. Typing still open is kept in the
      // kept-words archive at pagehide, sealed typing in its save's recovery receipt: in the note or kept, like any other.
      if (undone.has(token)) {
        if (inNote.includes(token) || kept.includes(token)) problems.push(`${token} was undone but is still somewhere`);
        continue;
      }
      const noteCount = inNote.filter((value) => value === token).length;
      const keptHere = kept.includes(token);
      if (noteCount + (keptHere ? 1 : 0) === 0) problems.push(`${token} LOST`);
      else if (noteCount > 1 || (noteCount === 1 && keptBesidesBox.includes(token))) problems.push(`${token} DUPLICATED (note ${noteCount}, kept ${keptHere})`);
      else if (noteCount === 1) {
        // In the note it must share a unit with its anchor, when the anchor is in the note too.
        const tag = anchorOf.get(token);
        const home = locate(token);
        if (tag && tag !== token && inNote.includes(tag) && home && !home.unit.text.includes(tag)) {
          problems.push(`${token} in the WRONG UNIT (expected with ${tag}, found in ${home.block.id}:${home.unit.id})`);
        }
      }
    }
    // The note's own text is never written twice either: a moved unit saved back would show up twice.
    const noteText = hooks().blocks.flatMap((entry) => (liveFlow(entry.id)?.units ?? [])
      .filter((unit) => unit.status !== 'deleted').map((unit) => unit.text)).join(' ');
    for (const tag of ['<P0>', '<P1>', '<W0>', '<W1>']) {
      const count = noteText.split(tag).length - 1;
      if (count !== 1) problems.push(`note text ${tag} appears ${count} times`);
    }
    const dump = hooks().blocks.map((entry) => `${entry.id}[${(liveFlow(entry.id)?.units ?? []).filter((unit) => unit.status !== 'deleted')
      .map((unit) => `${unit.writing_role === 'paragraph' ? '' : 'H:'}${unit.text}`).join(' | ')}]`).join(' ');
    return { problems, steps, typed: typed.length, dump, log: world.log, unsaved: [...unsavedAtUnload] };
  } finally {
    (clickFrames as { mockRestore(): void } | null)?.mockRestore();
    view.unmount();
    document.body.innerHTML = '';
    localStorage.clear();
  }
}

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const SEEDS = Number(env.CONSERVE_SEEDS ?? 40);
const FIRST = Number(env.CONSERVE_FIRST_SEED ?? 1);
const LENGTH = Number(env.CONSERVE_LENGTH ?? 16);

// The three known losses (order A-21/A-24 review): each must turn this gate red on the frozen build.
const KNOWN_LOSSES: Array<[string, string[]]> = [
  ['1: words handed to a second structure that fails before its first edit',
    ['fault:idleHang@1', 'heading', 'type', 'enter', 'type', 'wait:600']],
  ['1b: the same, the second structure failing at once on a tracked write',
    ['fault:idleReject@1', 'heading', 'type', 'enter', 'type', 'wait:600']],
  ['2: leaving through the app right after Enter in the window',
    ['heading', 'type', 'enter', 'type', 'leave:inApp']],
  ['3: a new heading elsewhere while kept words are on screen (buffer-3)',
    ['fault:create', 'heading', 'type', 'wait:400', 'undo', 'heading:<P1>', 'type', 'wait:600']],
  ['H: the page goes away while the window holds words, and the note is opened again',
    ['heading', 'type', 'type', 'unload', 'wait:600']],
  ['the role-change save fails once, no Enter in the window',
    ['fault:save', 'heading', 'type', 'wait:600', 'undo', 'wait:600']],
  ['commit-1: a sync-priority commit between a frame and the write it waits for',
    ['enter', 'wait:30', 'clicks', 'heading:<W1>', 'type', 'wait:600']],
];

// Paths found in the browser that the gate has to cover. Not known losses: each is run on the current code.
const PATH_ARMS: Array<[string, string[]]> = [
  // A-20 r3 (Main_Designer on Reviewer M1-M4). Saves held from here on: the queue stays behind the first save, so every
  // Enter and every line typed after it is sealed but not handed over when the page goes. Each Enter waits a beat after
  // the word before it, as a person does (an Enter in the same tick reads the flow from before that word: A-25 CHAIN).
  ['LIST: k, Enter x, Enter y while a save is on its way, the page goes (M1)',
    ['type', 'wait:2600', 'holdSaves:0', 'type', 'wait:30', 'enter', 'wait:30', 'type', 'wait:30', 'enter', 'wait:30', 'type', 'unload', 'wait:800']],
  ['CLICKBACK: with the Enter queued, typing back on the line it cut, the page goes (M1)',
    ['type', 'wait:2600', 'holdSaves:0', 'type', 'wait:30', 'enter', 'wait:30', 'at:1', 'type', 'unload', 'wait:800']],
  ['BACKIN-fail: kept and sent at a Back the router then holds, the save fails, the person stays and goes on (M2)',
    ['type', 'wait:2600', 'fault:save', 'type', 'keepleave', 'wait:600', 'stay', 'type', 'wait:600', 'unload', 'wait:800']],
  ['BACKIN-undo: as BACKIN-fail, then the failed words are undone; they must not come back (M2)',
    ['type', 'wait:2600', 'fault:save', 'type', 'keepleave', 'wait:600', 'stay', 'undo', 'wait:600', 'unload', 'wait:800']],
  ['HANDOVER-one-home: kept, then handed over while its save is held, the page goes (M3)',
    ['type', 'wait:2600', 'holdSaves:0', 'type', 'keepleave', 'wait:600', 'unload', 'wait:800']],
  ['REFUSE: the save is turned down before its receipt is written, the page goes (M5)',
    ['type', 'wait:2600', 'fault:refuse', 'type', 'wait:30', 'unload', 'wait:800']],
  // A-20 r3d (N1): a line joined (Backspace, or a selection across the line break deleted) while a save is on its way,
  // more typed, the page goes. Before: the joined line's record started from the server's text and landed as a whole
  // replacement beside the line the server still has (that line's words twice).
  ['MERGE: k0, Enter k1, saves held, k2, Backspace joins the k1 line onto the k0 line, k3, the page goes (N1)',
    ['type', 'wait:30', 'enter', 'wait:2600', 'holdSaves:0', 'type', 'wait:30', 'join', 'wait:30', 'type', 'unload', 'wait:800']],
  ['SELDEL: as MERGE, the line break selected and deleted (N1)',
    ['type', 'wait:30', 'enter', 'wait:2600', 'holdSaves:0', 'type', 'wait:30', 'seldel', 'wait:30', 'type', 'unload', 'wait:800']],
  ['BFCACHE: pagehide into the back-forward cache and back, more typing saved, the page goes (M4)',
    ['type', 'wait:2600', 'type', 'bfcache', 'wait:30', 'type', 'wait:2600', 'unload', 'wait:800']],
  // A-20 r2: a pause longer than IDLE_SAVE_MS writes the open text without sealing it; more typing, its save held,
  // and the page goes. Back on the note every word is there exactly once (K1: the saved part is not written twice).
  ['idle save, more typing, its save held, the page goes (K1)', ['type', 'wait:2600', 'type', 'holdSaves:0', 'unload', 'wait:800']],
  ['idle save twice, then leaving through the app (K1)', ['type', 'wait:2600', 'type', 'wait:2600', 'type', 'leave', 'wait:600', 'return', 'wait:800']],
  // acc15 / GEO-long-0: the words in the window land, the structure that follows gets 409 on its unit-transfer, the
  // page goes away and the note is opened again. Every word must be on the server or in this note's record.
  ['409: the second structure unit-transfer conflicts after the words in the window landed, then the page goes away',
    ['fault:conflict@1', 'heading', 'type', 'enter', 'type', 'wait:600', 'unload', 'wait:600']],
  ['409: the first structure unit-transfer conflicts, then the page goes away',
    ['fault:conflict', 'heading', 'type', 'enter', 'type', 'wait:600', 'unload', 'wait:600']],
  // GEO-long-0 as it happened: the save carrying the words never reaches the server, the page goes, the note is opened
  // again and the words come back from this note's record, the structure that follows gets 409, the page goes again.
  ['GEO-long-0: words not on the server at unload, back from the record, the restored structure gets 409, unload again',
    ['holdSaves:1', 'heading', 'type', 'enter', 'type', 'wait:600', 'fault:conflict', 'unload', 'wait:800', 'unload', 'wait:600']],
  ['GEO-long-0 variant: the role save goes, everything after it is held, the window still open when the page goes',
    ['holdSaves:1', 'heading', 'type', 'enter', 'type', 'fault:conflict', 'unload', 'wait:800', 'unload', 'wait:600']],
];

describe('words typed around heading structures are conserved', () => {
  afterEach(() => { vi.useRealTimers(); });
  for (const [name, script] of KNOWN_LOSSES) {
    it(`known loss ${name}`, async () => {
      const result = await runSequence(0, script.length, script);
      console.log(`SCRIPT ${name}: ${result.steps.map((step) => step.detail ? `${step.kind}(${step.detail})` : step.kind).join(' ')} || note: ${result.dump} || writes: ${result.log.join(' ; ')}`);
      expect(result.problems, `${result.problems.join('; ')}\n  note: ${result.dump}\n  events: ${result.steps
        .map((step) => step.detail ? `${step.kind}(${step.detail})` : step.kind).join(' ')}`).toEqual([]);
    }, 60_000);
  }
  for (const [name, script] of PATH_ARMS) {
    it(`path ${name}`, async () => {
      const result = await runSequence(0, script.length, script);
      console.log(`PATH ${name}: ${result.steps.map((step) => step.detail ? `${step.kind}(${step.detail})` : step.kind).join(' ')} || note: ${result.dump} || writes: ${result.log.join(' ; ')}`);
      expect(result.problems, `${result.problems.join('; ')}\n  note: ${result.dump}\n  writes: ${result.log.join(' ; ')}`).toEqual([]);
    }, 60_000);
  }

  it('boundary of the unload exemption, positive control: a word typed in a window and excused at unload turns the gate red', async () => {
    const result = await runSequence(0, 5, ['heading', 'type', 'type', 'unload', 'wait:600'], { exemptEverything: true });
    expect(result.steps.some((step) => step.detail?.endsWith('in window'))).toBe(true);
    expect(result.problems.some((problem) => problem.includes('typed in window, UNSAVED AT UNLOAD is not its excuse'))).toBe(true);
  }, 60_000);

  it('window-source boundary, positive control: with the window\'s own records gone and the departure records left, the gate turns red', async () => {
    const result = await runSequence(0, 7, ['holdSaves:0', 'heading', 'type', 'enter', 'type', 'wait:600', 'unload', 'wait:600'], { dropWindowRecords: true });
    expect(result.steps.some((step) => step.detail?.endsWith('in window'))).toBe(true);
    expect(result.problems.some((problem) => problem.includes('typed in window, UNSAVED AT UNLOAD is not its excuse'))).toBe(true);
  }, 60_000);

  it(`${SEEDS} seeded sequences of ${LENGTH} events: every word in exactly one place, in its own unit`, async () => {
    const failures: string[] = [];
    const unsavedSeeds: string[] = [];
    for (let seed = FIRST; seed < FIRST + SEEDS; seed += 1) {
      const result = await runSequence(seed, LENGTH);
      if (result.unsaved.length) unsavedSeeds.push(`seed ${seed}: ${result.unsaved.join(' ')}`);
      if (result.problems.length) {
        failures.push(`seed ${seed} (${result.typed} words): ${result.problems.join('; ')}\n  note: ${result.dump}\n  writes: ${env.CONSERVE_TRACE ? result.log.join(' ; ') : '(set CONSERVE_TRACE)'}\n  events: ${result.steps
          .map((step) => step.detail ? `${step.kind}(${step.detail})` : step.kind).join(' ')}`);
      }
    }
    // Not counted as losses, listed so they stay visible.
    console.log(`UNSAVED AT UNLOAD (existing save path): ${unsavedSeeds.length ? unsavedSeeds.join(' | ') : 'none'}`);
    expect(failures, failures.join('\n')).toEqual([]);
  }, 600_000);
});

// A-20 r3d (N6): the page went with a save on its way (its receipt waits in the recovery queue with Apply) and with a
// kept record on another line of the same block. On reopen the record waits in the box while the receipt waits: landing
// it would save the block, and that save's receipt would replace the waiting one (one receipt per block) and then go.
// The conservation gate cannot make that receipt (its saves are stand-ins, no receipt store); this test covers it.
describe('A-20 r3d kept words wait while the block has a receipt to apply (N6)', () => {
  it('reopen: the record stays in the box while the receipt waits, and lands once it is applied or dismissed', async () => {
    localStorage.clear();
    document.body.innerHTML = '';
    const { world, Host } = makeWorld();
    rememberUnplacedWords('note', { id: 'edit-work-tu-1-1', blockId: 'work', unitId: 'tu-1', initialText: '<W0>',
      text: '<W0> <bbb>', source: 'edit' });
    // An earlier page's save the server never had: '<W0> <aaa>'.
    world.recoveryReceipts.push({ blockId: 'work', contentJson: { [TEXT_FLOW_CONTENT_KEY]: textFlow([['tu-1', '<W0> <aaa>'], ['tu-2', '<W1>']]) } });
    const view = render(<Host noteId="note" />);
    const workText = () => {
      const hooks = world.hooks!;
      const flow = hooks.flowDrafts.work ?? getTextFlowContent(hooks.blocks.find((entry) => entry.id === 'work')?.content_json ?? {});
      return flow ? textOf(flow) : '';
    };
    await act(async () => { await sleep(400); });
    expect(workText()).not.toContain('<bbb>');
    expect(readUnplacedWords('note').map((words) => words.text)).toEqual(['<W0> <bbb>']);
    expect(shownBuffers().map((element) => element.value)).toContain('<W0> <bbb>');
    world.recoveryReceipts.splice(0);
    await waitFor(() => expect(workText()).toContain('<bbb>'), { timeout: 4000 });
    await waitFor(() => expect(readUnplacedWords('note')).toEqual([]));
    view.unmount();
  });
});

describe('A-20 r3d kept words and a receipt the server already has (N6a)', () => {
  it("kept words land when the block's receipt already matches the server (N6 narrowing)", async () => {
    localStorage.clear();
    document.body.innerHTML = '';
    const { world, Host } = makeWorld();
    rememberUnplacedWords('note', { id: 'edit-work-tu-1-1', blockId: 'work', unitId: 'tu-1', initialText: '<W0>',
      text: '<W0> <bbb>', source: 'edit' });
    // An earlier page's save that went through after the page left: its receipt is still offered, and its words are
    // exactly what the server has.
    const served = world.server.note.find((entry) => entry.id === 'work')!;
    world.recoveryReceipts.push({ blockId: 'work', contentJson: JSON.parse(JSON.stringify(served.content_json)) });
    const view = render(<Host noteId="note" />);
    const workText = () => {
      const hooks = world.hooks!;
      const flow = hooks.flowDrafts.work ?? getTextFlowContent(hooks.blocks.find((entry) => entry.id === 'work')?.content_json ?? {});
      return flow ? textOf(flow) : '';
    };
    await waitFor(() => expect(workText()).toContain('<bbb>'), { timeout: 4000 });
    await waitFor(() => expect(readUnplacedWords('note')).toEqual([]));
    expect(shownBuffers()).toEqual([]);
    view.unmount();
  });
});

describe('A-20 r3d the server text a receipt is read against is the note as opened this time (N6a)', () => {
  it('note → other → note in the same runtime: kept words land behind a receipt the server got while the note was away', async () => {
    localStorage.clear();
    document.body.innerHTML = '';
    const { world, Host } = makeWorld();
    const view = render(<Host noteId="note" />);
    await act(async () => { await sleep(50); });
    world.noteId = 'other';
    view.rerender(<Host noteId="other" />);
    await act(async () => { await sleep(50); });
    // While the note was away, its last save went through: the server has '<W0> <aaa>'. The receipt of that save is
    // still offered (its reply never reached the page), and words typed after it were kept.
    const changed = textFlow([['tu-1', '<W0> <aaa>'], ['tu-2', '<W1>']]);
    world.server.note = world.server.note.map((entry) => entry.id === 'work'
      ? { ...entry, content_json: { [TEXT_FLOW_CONTENT_KEY]: changed }, plain_text: textOf(changed) } : entry);
    world.recoveryReceipts.push({ blockId: 'work', contentJson: { [TEXT_FLOW_CONTENT_KEY]: structuredClone(changed) } });
    rememberUnplacedWords('note', { id: 'edit-work-tu-1-2', blockId: 'work', unitId: 'tu-1', initialText: '<W0> <aaa>',
      text: '<W0> <aaa> <bbb>', source: 'edit' });
    world.noteId = 'note';
    view.rerender(<Host noteId="note" />);
    const workText = () => {
      const hooks = world.hooks!;
      const flow = hooks.flowDrafts.work ?? getTextFlowContent(hooks.blocks.find((entry) => entry.id === 'work')?.content_json ?? {});
      return flow ? textOf(flow) : '';
    };
    await waitFor(() => expect(workText()).toContain('<bbb>'), { timeout: 4000 });
    await waitFor(() => expect(readUnplacedWords('note')).toEqual([]));
    expect(workText().match(/<aaa>/g)).toHaveLength(1);
    view.unmount();
  });
});
