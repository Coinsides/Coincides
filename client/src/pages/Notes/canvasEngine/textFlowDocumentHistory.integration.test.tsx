import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { useRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TextBlockProjection } from './blocks/TextBlockProjection';
import { createBoardTextRangeEditSession } from './boardTextRangeEditSession';
import { DocumentTextFlowSelectionContext, useDocumentTextFlowSelection } from './hooks/useDocumentTextFlowSelection';
import { useBlockDraftAuthority } from './hooks/useBlockDraftAuthority';
import type { BlockSaveOutcome } from './hooks/useNoteCanvasDataAdapter';
import { usePlacementHistory } from './hooks/usePlacementHistory';
import { useTextFlowHistory, type TextFlowHistoryHost } from './hooks/useTextFlowHistory';
import type { AnnotationTruthV1, NoteBlock, TextBlockContentV1 } from './runtimeDataTypes';
import { navigateTextFlowBlockBoundary, type TextFlowNavigationTarget } from './textFlowBlockNavigation';
import { createTextBlockContentV1, TEXT_FLOW_CONTENT_KEY } from './textFlowService';

// jsdom supplies events; real-browser smoke separately checks B5 mirror geometry.
vi.mock('./textareaNavigation', async (importOriginal) => ({
  ...await importOriginal<typeof import('./textareaNavigation')>(),
  measureTextareaNavigation: vi.fn((_node: HTMLTextAreaElement, offset: number) => ({
    x: offset * 8, y: 0, lineHeight: 20, atFirstLine: true, atLastLine: true,
  })),
  textareaBoundaryCaret: vi.fn((node: HTMLTextAreaElement, _edge: string, x: number) => ({
    offset: Math.min(node.value.length, Math.round(x / 8)), y: 0,
  })),
}));

afterEach(cleanup);
const plainText = (flow: TextBlockContentV1) => flow.units.map((unit) => unit.text).join('\n');

function renderDocumentHistory() {
  const before = ['alpha', 'omega'].map((text, index): TextBlockContentV1 => {
    const base = createTextBlockContentV1(text);
    return {
      ...base, metadata: { nested: { preserved: index } },
      units: [{ ...base.units[0], id: `unit-${index}`, writing_role: index === 0 ? 'todo_item' : 'quote',
        indent_level: index, metadata: { checked: true, nested: { label: text } } }],
      inline_structures: [{ id: `inline-${index}`, semantic_kind: 'inline_code', parent_text_unit_id: `unit-${index}`,
        anchor_text: 'a', anchor_range: { start: 0, end: 1 }, field_values: { language: 'text' },
        metadata: { retained: true }, status: 'active' }],
    };
  });
  const blocks: NoteBlock[] = before.map((flow, index) => ({
    id: `block-${index}`, placement_id: `placement-${index}`, block_type: 'paragraph',
    title: null, content_json: { [TEXT_FLOW_CONTENT_KEY]: flow }, plain_text: plainText(flow),
    display_overrides_json: {}, metadata: {}, order_index: index, source_references: [],
  }));
  const boardRanges = createBoardTextRangeEditSession('synthetic-document-note', async (_note, ranges) => ranges);
  boardRanges.hydrate([]);
  const saved: Array<{ blockId: string; flow: TextBlockContentV1 }> = [];
  const saveBlock = vi.fn(async (block: NoteBlock, _text: string, options?: { textFlow?: TextBlockContentV1 }): Promise<BlockSaveOutcome> => {
    if (options?.textFlow) saved.push({ blockId: block.id, flow: structuredClone(options.textFlow) });
    return { status: 'saved', block, recoveryReceipt: null, reconciliation: 'response' };
  });
  let current!: { history: ReturnType<typeof usePlacementHistory>; flows: TextBlockContentV1[] };
  function Fixture() {
    const drafts = useBlockDraftAuthority();
    const [annotations, setAnnotations] = useState<AnnotationTruthV1[]>([]);
    const annotationRef = useRef(annotations);
    annotationRef.current = annotations;
    const host = useRef<TextFlowHistoryHost | null>(null);
    const targets = useRef(new Map<string, TextFlowNavigationTarget>());
    const textHistory = useTextFlowHistory({
      noteId: 'synthetic-document-note', generation: 1, blocks,
      annotationTruths: annotations, readAnnotationTruths: () => annotationRef.current,
      setAnnotationTruthsSnapshot: (next) => { annotationRef.current = next; setAnnotations(next); },
      blockTextFlowDrafts: drafts.blockTextFlowDrafts,
      setBlockTextFlowDrafts: drafts.setBlockTextFlowDrafts, setBlockTextDrafts: drafts.setBlockTextDrafts,
      captureBoardTextRanges: boardRanges.snapshot, restoreBoardTextRanges: boardRanges.restore,
      rebaseBoardTextRanges: boardRanges.rebase, saveBlock, saveAnnotationTruthsOutcome: async () => true,
      history: host,
    });
    const history = usePlacementHistory({
      noteId: 'synthetic-document-note', generation: 1,
      beforeHistoryBoundary: () => textHistory.boundary(),
      applyLayoutDrafts: vi.fn(), persistLayoutSnapshot: async () => true,
    });
    host.current = history;
    const disabled = textHistory.replaying || history.historyReplaying;
    const selection = useDocumentTextFlowSelection({
      noteId: 'synthetic-document-note', visibleBlocks: blocks, disabled,
      applyDocumentEdit: textHistory.applyDocumentEdit,
    });
    const flows = blocks.map((block, index) => drafts.blockTextFlowDrafts[block.id] ?? before[index]);
    current = { history, flows };
    return <DocumentTextFlowSelectionContext.Provider value={selection}>
      {blocks.map((block, index) => <TextBlockProjection key={block.id} blockId={block.id}
        text={plainText(flows[index])} textFlow={flows[index]} presentationKind="paragraph" readOnly={disabled}
        annotations={annotations} selectedAnnotationIds={[]} showLabelOverlay={false} textareaRef={null}
        onFocused={vi.fn()} onAnnotationSelect={vi.fn()} onAnnotationContextMenu={vi.fn()}
        onTextUnitSelection={vi.fn()} onTextUnitContextMenu={vi.fn()} onTextChange={vi.fn()}
        onTextFlowChange={(next, metadata, previousTextFlow) => { void textHistory.applyEdit(block, next, { metadata, previousTextFlow }); }}
        onTextEditBoundary={textHistory.boundary}
        onBoundaryNavigate={(request) => navigateTextFlowBlockBoundary({
          visibleBlocks: blocks, fromBlockId: block.id, request, targets: targets.current, disabled,
        })}
        onNavigationTarget={(target) => {
          if (target) targets.current.set(block.id, target); else targets.current.delete(block.id);
        }}
        onSave={async (_silent, _fields, latestFlow) => {
          const flow = latestFlow ?? flows[index];
          return textHistory.saveBlock(block, plainText(flow), { silent: true, textFlow: flow });
        }} onKeyDown={vi.fn()} />)}
    </DocumentTextFlowSelectionContext.Provider>;
  }
  const view = render(<Fixture />);
  const unit = (index: number) => view.container.querySelector<HTMLTextAreaElement>(`textarea[data-text-unit-id="unit-${index}"]`)!;
  const idle = async () => { await act(async () => { await current.history.whenHistoryIdle(); }); };
  const select = async () => {
    act(() => { unit(0).focus(); unit(0).setSelectionRange(2, 2); });
    fireEvent.keyDown(unit(0), { key: 'ArrowDown', shiftKey: true });
    expect(document.activeElement).toBe(unit(1));
    const setData = vi.fn();
    fireEvent.copy(unit(1), { clipboardData: { setData } });
    expect(setData).toHaveBeenCalledWith('text/plain', 'pha\n\nom');
    await idle();
    expect(current.flows).toEqual(before);
    // Navigation blur can save the original flow, but does not create history.
    for (const savedBlock of saved) expect(savedBlock.flow).toEqual(before[blocks.findIndex((block) => block.id === savedBlock.blockId)]);
    saved.length = 0;
  };
  const replay = async (key: 'z' | 'y') => {
    await act(async () => {
      expect(fireEvent.keyDown(window, { key, ctrlKey: true })).toBe(false);
      await current.history.whenHistoryIdle();
    });
  };
  return { ...view, before, blocks, saved, saveBlock, unit, idle, select, replay, current: () => current };
}

describe('B6b real document selection → B4 runtime history integration', () => {
  it('places the optimistic caret at the first endpoint while the first block save is pending', async () => {
    const editor = renderDocumentHistory();
    await editor.select();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const persist = editor.saveBlock.getMockImplementation()!;
    editor.saveBlock.mockImplementationOnce(async (...args) => { await gate; return persist(...args); });
    await act(async () => {
      fireEvent.paste(editor.unit(1), { clipboardData: { getData: () => 'X' } });
      await Promise.resolve();
    });
    expect(editor.current().flows.map(plainText)).toEqual(['alX', 'ega']);
    expect(document.activeElement).toBe(editor.unit(0));
    expect(editor.unit(0).selectionStart).toBe(3);
    expect(editor.unit(0).readOnly).toBe(true);
    await act(async () => { release(); await editor.current().history.whenHistoryIdle(); });
    expect(editor.unit(0).readOnly).toBe(false);
    expect(editor.current().flows.map(plainText)).toEqual(['alX', 'ega']);
  });

  it.each(['Delete', 'beforeinput', 'paste'] as const)('%s is one reversible entry and restores both flows field-for-field', async (operation) => {
    const editor = renderDocumentHistory();
    await editor.select();
    const inserted = operation === 'Delete' ? '' : 'X';
    await act(async () => {
      if (operation === 'Delete') fireEvent.keyDown(editor.unit(1), { key: 'Delete' });
      else if (operation === 'paste') fireEvent.paste(editor.unit(1), { clipboardData: { getData: () => inserted } });
      else fireEvent(editor.unit(1), new InputEvent('beforeinput', {
        bubbles: true, cancelable: true, inputType: 'insertText', data: inserted,
      }));
      await editor.current().history.whenHistoryIdle();
    });
    const after = editor.before.map((flow, index) => ({
      ...flow, units: [{ ...flow.units[0], text: index === 0 ? `al${inserted}` : 'ega' }],
      inline_structures: index === 0 ? flow.inline_structures : [{
        ...flow.inline_structures[0], anchor_range: null,
        metadata: {
          ...flow.inline_structures[0].metadata,
          pre_edit_offsets: { text_unit_id: 'unit-1', start_offset: 0, end_offset: 1, range_text_cache: 'a' },
        },
      }],
    }));
    expect(editor.current().flows).toEqual(after);
    expect(editor.container.querySelectorAll('textarea')).toHaveLength(2);
    expect(editor.saved).toEqual(after.map((flow, index) => ({ blockId: editor.blocks[index].id, flow })));

    await editor.replay('z');
    expect(editor.current().flows).toEqual(editor.before);
    expect([editor.unit(0).dataset.textUnitId, editor.unit(1).dataset.textUnitId]).toEqual(['unit-0', 'unit-1']);
    await act(async () => { expect(await editor.current().history.undoRuntimeHistory()).toBe(false); });
    await editor.replay('y');
    expect(editor.current().flows).toEqual(after);
    await act(async () => { expect(await editor.current().history.redoRuntimeHistory()).toBe(false); });
    expect(editor.saved).toEqual([after, editor.before, after].flatMap((flows) =>
      flows.map((flow, index) => ({ blockId: editor.blocks[index].id, flow }))));
  });
});
