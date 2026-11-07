import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TemplateOption } from '@/services/templateOptions';
import type { BlockBoxLayout } from '../runtimeLayout';
import type { Note, NoteBlock, TextBlockContentV1 } from '../runtimeDataTypes';
import type { DraftBlockCreateResult } from '../draftBlockPersistence';
import { createTextBlockContentV1, TEXT_FLOW_CONTENT_KEY } from '../textFlowService';
import {
  draftTextFlowFromText,
  useDraftBlockController,
  type UseDraftBlockControllerOptions,
} from './useDraftBlockController';
import type { BlockSaveOutcome } from './useNoteCanvasDataAdapter';

// A-04: typing a first paragraph, pressing Enter before the first POST returns,
// and continuing to type must keep the second paragraph as its own paragraph.
const layout: BlockBoxLayout = { x: 0, y: 0, width: 760, height: 72 };
const template: TemplateOption = {
  template_id: 'text', template_key: 'text', template_version: '1.0.0', label: 'Text', description: 'Text block',
  system_type: 'text', learning_role: 'note', legacy_block_type: 'text', default_content: {}, origin: 'test',
  status: 'active', isRuntime: false,
};
const note: Note = { id: 'note-1', course_id: 'project-1', title: 'Fast Enter', description: null, status: 'active', metadata: {} };

function block(text: string): NoteBlock {
  return {
    id: 'block-1', placement_id: 'placement-1', display_overrides_json: {}, canvas_layout: null, block_type: 'text',
    title: null, content_json: { body: text, [TEXT_FLOW_CONTENT_KEY]: createTextBlockContentV1(text, 'paragraph') },
    plain_text: text, metadata: {}, order_index: 0, source_references: [],
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

beforeEach(() => sessionStorage.clear());

describe('draft first-paragraph fast Enter', () => {
  it('saves text typed after Enter during the first create as a second paragraph', async () => {
    const create = deferred<DraftBlockCreateResult | null>();
    let durableUnits: string[] = [];
    const createBlock = vi.fn<UseDraftBlockControllerOptions['createBlock']>(async (_template, _text, options) => {
      durableUnits = (options.contentJson?.[TEXT_FLOW_CONTENT_KEY] as TextBlockContentV1).units.map((unit) => unit.text);
      return create.promise;
    });
    const saveBlock = vi.fn<UseDraftBlockControllerOptions['saveBlock']>(async (_block, text, options): Promise<BlockSaveOutcome> => {
      durableUnits = options?.textFlow?.units.map((unit) => unit.text) ?? [text];
      return { status: 'saved', block: block(text), recoveryReceipt: null, reconciliation: 'response' };
    });
    const subject = renderHook(() => useDraftBlockController({
      createBlock, defaultDraftLayout: layout, defaultTextTemplate: template,
      discardDraftBlock: vi.fn(async () => true), finalizeDraftBlock: vi.fn(async () => true), note,
      onDraftFocusReceipt: vi.fn(), saveBlock, saveDraftBlockPlacement: vi.fn(async (value) => value),
      setActiveBlockId: vi.fn(), setBlockTextDrafts: vi.fn(), setBlockTextFlowDrafts: vi.fn(),
      setFocusBlockId: vi.fn(), setInteractionState: vi.fn(), setSelectedBlockId: vi.fn(),
    }));

    let persisting!: Promise<void>;
    act(() => {
      subject.result.current.activateDraft();
      subject.result.current.setDraftText('First');
      persisting = subject.result.current.persistDraft('First');
    });
    act(() => subject.result.current.setDraftText('First\n'));
    act(() => subject.result.current.setDraftText('First\nSecond'));
    await act(async () => {
      create.resolve({ block: block('First'), clientCreateKey: 'key-1', placementPersisted: true, reused: false });
      await persisting;
    });

    // A single unit holding a newline shows only its first line in the durable
    // editor, and its next save overwrites the hidden part.
    expect(durableUnits).toEqual(['First', 'Second']);
  });

  it('keeps an Enter with nothing typed after it, and puts the caret on the new line', async () => {
    const create = deferred<DraftBlockCreateResult | null>();
    const saved: string[][] = [];
    const flowFrom = (options?: { textFlow?: TextBlockContentV1 }) => options?.textFlow?.units.map((unit) => unit.text) ?? [];
    const saveBlock = vi.fn<UseDraftBlockControllerOptions['saveBlock']>(async (_block, text, options): Promise<BlockSaveOutcome> => {
      saved.push(flowFrom(options));
      return { status: 'saved', recoveryReceipt: null, reconciliation: 'response',
        block: { ...block(text), content_json: { body: text, [TEXT_FLOW_CONTENT_KEY]: options?.textFlow } } };
    });
    const textDrafts: Array<Record<string, string>> = [];
    const setBlockTextDrafts = vi.fn((action) => {
      textDrafts.push(typeof action === 'function' ? action({}) : action);
    }) as unknown as UseDraftBlockControllerOptions['setBlockTextDrafts'];
    const flowDrafts: Array<Record<string, TextBlockContentV1>> = [];
    const setBlockTextFlowDrafts = vi.fn((action) => {
      flowDrafts.push(typeof action === 'function' ? action({}) : action);
    }) as unknown as UseDraftBlockControllerOptions['setBlockTextFlowDrafts'];
    const subject = renderHook(() => useDraftBlockController({
      createBlock: vi.fn(async () => create.promise), defaultDraftLayout: layout, defaultTextTemplate: template,
      discardDraftBlock: vi.fn(async () => true), finalizeDraftBlock: vi.fn(async () => true), note,
      onDraftFocusReceipt: vi.fn(), saveBlock, saveDraftBlockPlacement: vi.fn(async (value) => value),
      setActiveBlockId: vi.fn(), setBlockTextDrafts, setBlockTextFlowDrafts,
      setFocusBlockId: vi.fn(), setInteractionState: vi.fn(), setSelectedBlockId: vi.fn(),
    }));
    const textarea = document.createElement('textarea');
    (subject.result.current.draftRef as { current: HTMLTextAreaElement | null }).current = textarea;

    let persisting!: Promise<void>;
    act(() => {
      subject.result.current.activateDraft();
      subject.result.current.setDraftText('First');
      persisting = subject.result.current.persistDraft('First');
    });
    // Enter lands while the create is out, and the reader pauses.
    textarea.value = 'First\n';
    textarea.setSelectionRange(6, 6);
    act(() => subject.result.current.setDraftText('First\n'));
    await act(async () => {
      create.resolve({ block: block('First'), clientCreateKey: 'key-1', placementPersisted: true, reused: false });
      await persisting;
    });

    expect(saved).toEqual([['First', '']]);
    // Both halves of the authority name one text, trailing line included.
    expect(textDrafts[textDrafts.length - 1]?.['block-1']).toBe('First\n');
    const reconciliation = subject.result.current.draftOwnerReconciliation!;
    expect(reconciliation.to.textUnitId).toBe('tu-2');
    expect(reconciliation.selectionStart).toBe(0);
    // Published with the handoff, so the editor has that unit when it takes focus.
    expect(flowDrafts[flowDrafts.length - 1]?.['block-1']?.units.map((unit) => unit.text)).toEqual(['First', '']);
  });

  it('splits multi-line draft text into paragraph units like durable Enter', () => {
    expect(draftTextFlowFromText('One').units.map((unit) => unit.text)).toEqual(['One']);
    const flow = draftTextFlowFromText('One\nTwo\n\nFour');
    expect(flow.units.map((unit) => unit.text)).toEqual(['One', 'Two', '', 'Four']);
    expect(new Set(flow.units.map((unit) => unit.id)).size).toBe(4);
    expect(flow.units.every((unit) => unit.writing_role === 'paragraph')).toBe(true);
  });
});
