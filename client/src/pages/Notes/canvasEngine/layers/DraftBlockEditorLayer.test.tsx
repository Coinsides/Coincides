import {
  act,
  fireEvent,
  render,
} from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { TemplateOption } from '@/services/templateOptions';
import {
  useDraftBlockController,
  type UseDraftBlockControllerOptions,
} from '../hooks/useDraftBlockController';
import type { BlockSaveOutcome } from '../hooks/useNoteCanvasDataAdapter';
import { useBlockSelectionController } from '../hooks/useBlockSelectionController';
import type { RuntimeInteractionState } from '../interactionController';
import type { BlockBoxLayout } from '../runtimeLayout';
import type { Note, NoteBlock } from '../runtimeDataTypes';
import { DraftWritingEntryLayer } from './DraftWritingEntryLayer';

const defaultDraftLayout: BlockBoxLayout = {
  x: 0,
  y: 12,
  width: 760,
  height: 72,
};

const defaultTextTemplate: TemplateOption = {
  template_id: 'text.paragraph',
  template_key: 'text.paragraph',
  template_version: '1.0.0',
  label: 'Text',
  description: 'Text block',
  system_type: 'text',
  learning_role: 'note',
  legacy_block_type: 'text',
  default_content: {},
  origin: 'test',
  status: 'active',
  isRuntime: false,
};

const note: Note = {
  id: 'note-1',
  course_id: 'project-1',
  title: 'Lifecycle test',
  description: null,
  status: 'active',
  metadata: {},
};

function savedBlockOutcome(block: NoteBlock): BlockSaveOutcome {
  return {
    status: 'saved',
    block,
    recoveryReceipt: null,
    reconciliation: 'response',
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

const defaultDiscardDraftBlock: UseDraftBlockControllerOptions['discardDraftBlock'] = async () => true;
const defaultFinalizeDraftBlock: UseDraftBlockControllerOptions['finalizeDraftBlock'] = async () => true;
const defaultInteractionState = (_state: RuntimeInteractionState) => undefined;

function Harness({
  createBlock,
  discardDraftBlock = defaultDiscardDraftBlock,
  onInteractionState = defaultInteractionState,
}: {
  createBlock: UseDraftBlockControllerOptions['createBlock'];
  discardDraftBlock?: UseDraftBlockControllerOptions['discardDraftBlock'];
  onInteractionState?: (state: RuntimeInteractionState) => void;
}) {
  const [, setActiveBlockId] = useState<string | null>(null);
  const [, setFocusBlockId] = useState<string | null>(null);
  const [, setSelectedBlockId] = useState<string | null>(null);
  const selection = useBlockSelectionController({ setInteractionState: onInteractionState });
  const controller = useDraftBlockController({
    createBlock,
    defaultDraftLayout,
    defaultTextTemplate,
    discardDraftBlock,
    finalizeDraftBlock: defaultFinalizeDraftBlock,
    note,
    onDraftFocusReceipt: selection.markDraftFocused,
    saveBlock: vi.fn(async (block: NoteBlock) => savedBlockOutcome(block)),
    saveDraftBlockPlacement: vi.fn(async (block) => block),
    setActiveBlockId,
    setBlockTextDrafts: vi.fn(),
    setBlockTextFlowDrafts: vi.fn(),
    setFocusBlockId,
    setInteractionState: onInteractionState,
    setSelectedBlockId,
  });

  return (
    <div>
      <input aria-label="Note title" defaultValue="Untouched title" autoFocus />
      <output data-focused-owner="true">{selection.focusedTextOwner?.blockId || ''}</output>
      <DraftWritingEntryLayer
        contentReadOnly={false}
        creating={controller.creatingDraft}
        draftActive={controller.draftActive}
        focusReceipt={controller.draftFocusReceipt}
        hasMeaningfulRenderableContent={false}
        hasPendingDurableEditor={false}
        layout={controller.draftLayout || defaultDraftLayout}
        pageOffsetX={0}
        phase={controller.draftPhase}
        placementPending={controller.placementPending}
        slashTargetActive={false}
        textareaRef={controller.draftRef}
        text={controller.draftText}
        onActivate={controller.activateDraft}
        onChange={(value) => {
          controller.setDraftText(value);
          void controller.persistDraft(value);
        }}
        onClearSlashTarget={vi.fn()}
        onDiscard={controller.discardDraft}
        onFocused={controller.handleDraftFocusReceipt}
        onFocusReleased={selection.releaseTextFocus}
        onKeyDown={vi.fn()}
        onPersist={(text) => controller.persistDraft(text)}
        onResize={controller.resizeDraftFromTextarea}
      />
    </div>
  );
}

describe('client-first draft component lifecycle', () => {
  it('mounts and focuses locally before held POST and placement promises resolve', async () => {
    const post = deferred<void>();
    const placement = deferred<void>();
    let durableCount = 0;
    const createBlock = vi.fn<UseDraftBlockControllerOptions['createBlock']>(async (_template, text, options) => {
      await post.promise;
      await placement.promise;
      durableCount += 1;
      return {
        block: {
          id: 'block-1',
          placement_id: 'placement-1',
          display_overrides_json: {},
          canvas_layout: null,
          block_type: 'text',
          title: null,
          content_json: options.contentJson || { body: text },
          plain_text: text,
          metadata: {},
          order_index: 0,
          source_references: [],
        },
        clientCreateKey: options.clientCreateKey,
        placementPersisted: true,
        reused: false,
      };
    });
    const view = render(<Harness createBlock={createBlock} />);
    const title = view.getByRole('textbox', { name: 'Note title' }) as HTMLInputElement;
    expect(document.activeElement).toBe(title);

    fireEvent.doubleClick(view.getByRole('button', { name: 'Double-click to start writing' }));
    const textarea = view.container.querySelector<HTMLTextAreaElement>('[data-draft-editor="true"] textarea');
    expect(textarea).not.toBeNull();
    expect(document.activeElement).toBe(textarea);
    expect(textarea?.dataset.blockId).toMatch(/^draft-/);
    expect(textarea?.dataset.textFlowId).toBe(`textflow-${textarea?.dataset.blockId}`);
    expect(textarea?.dataset.textUnitId).toBeTruthy();
    expect(view.container.querySelector('[data-focused-owner="true"]')?.textContent)
      .toBe(textarea?.dataset.blockId);
    expect(createBlock).toHaveBeenCalledTimes(0);

    fireEvent.change(textarea!, { target: { value: 'sentinel' } });
    expect(createBlock).toHaveBeenCalledTimes(1);
    expect(title.value).toBe('Untouched title');
    expect(textarea!.value).toBe('sentinel');
    expect(document.activeElement).toBe(textarea);
    expect(durableCount).toBe(0);

    await act(async () => {
      post.resolve();
      await Promise.resolve();
    });
    expect(textarea!.value).toBe('sentinel');
    expect(document.activeElement).toBe(textarea);
    expect(durableCount).toBe(0);

    await act(async () => {
      placement.resolve();
      await Promise.resolve();
    });
    expect(durableCount).toBe(1);
  });

  it('drops a blank blur without durable residue and restores the entry after reload', () => {
    const createBlock = vi.fn<UseDraftBlockControllerOptions['createBlock']>(async () => null);
    const first = render(<Harness createBlock={createBlock} />);
    fireEvent.doubleClick(first.getByRole('button', { name: 'Double-click to start writing' }));
    const textarea = first.container.querySelector<HTMLTextAreaElement>('[data-draft-editor="true"] textarea');
    expect(textarea).not.toBeNull();

    fireEvent.blur(textarea!);
    expect(createBlock).toHaveBeenCalledTimes(0);
    expect(first.getByRole('button', { name: 'Double-click to start writing' })).not.toBeNull();

    first.unmount();
    const reloaded = render(<Harness createBlock={createBlock} />);
    expect(createBlock).toHaveBeenCalledTimes(0);
    expect(reloaded.getByRole('button', { name: 'Double-click to start writing' })).not.toBeNull();
  });

  it('drops a blank Escape without entering SlashSession or creating a durable block', () => {
    const createBlock = vi.fn<UseDraftBlockControllerOptions['createBlock']>(async () => null);
    const view = render(<Harness createBlock={createBlock} />);
    fireEvent.doubleClick(view.getByRole('button', { name: 'Double-click to start writing' }));
    const textarea = view.container.querySelector<HTMLTextAreaElement>('[data-draft-editor="true"] textarea');
    expect(textarea).not.toBeNull();

    fireEvent.keyDown(textarea!, { key: 'Escape' });
    expect(createBlock).toHaveBeenCalledTimes(0);
    expect(view.getByRole('button', { name: 'Double-click to start writing' })).not.toBeNull();
  });

  it('releases the exact DOM focus receipt on title focus and editor unmount', () => {
    const onInteractionState = vi.fn();
    const createBlock = vi.fn<UseDraftBlockControllerOptions['createBlock']>(async () => null);
    const view = render(
      <Harness createBlock={createBlock} onInteractionState={onInteractionState} />,
    );
    fireEvent.doubleClick(view.getByRole('button', { name: 'Double-click to start writing' }));
    const textarea = view.container.querySelector<HTMLTextAreaElement>('[data-draft-editor="true"] textarea');
    const owner = view.container.querySelector<HTMLOutputElement>('[data-focused-owner="true"]');
    expect(owner?.textContent).toMatch(/^draft-/);

    act(() => {
      (view.getByRole('textbox', { name: 'Note title' }) as HTMLInputElement).focus();
    });
    expect(owner?.textContent).toBe('');
    expect(onInteractionState).toHaveBeenLastCalledWith({ mode: 'idle', target: 'surface' });

    fireEvent.doubleClick(view.getByRole('button', { name: 'Double-click to start writing' }));
    expect(owner?.textContent).toMatch(/^draft-/);
    view.unmount();
    expect(onInteractionState).toHaveBeenLastCalledWith({ mode: 'idle', target: 'surface' });
  });

  it('tombstones a pending POST when Escape discards text cleared back to empty', async () => {
    const post = deferred<Awaited<ReturnType<UseDraftBlockControllerOptions['createBlock']>>>();
    const createBlock = vi.fn<UseDraftBlockControllerOptions['createBlock']>(() => post.promise);
    const discardDraftBlock = vi.fn(async () => true);
    const view = render(
      <Harness createBlock={createBlock} discardDraftBlock={discardDraftBlock} />,
    );
    fireEvent.doubleClick(view.getByRole('button', { name: 'Double-click to start writing' }));
    const textarea = view.container.querySelector<HTMLTextAreaElement>('[data-draft-editor="true"] textarea');
    fireEvent.change(textarea!, { target: { value: 'pending sentinel' } });
    const clientCreateKey = createBlock.mock.calls[0]?.[2]?.clientCreateKey;
    fireEvent.change(textarea!, { target: { value: '' } });
    fireEvent.keyDown(textarea!, { key: 'Escape' });

    expect(discardDraftBlock).toHaveBeenCalledWith(note.id, clientCreateKey);
    expect(view.queryByText('pending sentinel')).toBeNull();
    await act(async () => {
      post.resolve({
        block: {
          id: 'late-block',
          placement_id: 'late-placement',
          display_overrides_json: {},
          canvas_layout: null,
          block_type: 'text',
          title: null,
          content_json: { body: 'pending sentinel' },
          plain_text: 'pending sentinel',
          metadata: {},
          order_index: 0,
          source_references: [],
        },
        clientCreateKey,
        placementPersisted: true,
        reused: false,
      });
      await Promise.resolve();
    });
    expect(view.getByRole('button', { name: 'Double-click to start writing' })).not.toBeNull();
  });
});

// A-25 ①: the draft box tells its owner when a change is an input method still composing, and hands over the
// committed word at compositionend.
describe('A-25 ① draft box and input method composition', () => {
  it('marks changes during composition and hands over the committed value at compositionend', async () => {
    const { DraftBlockEditorLayer } = await import('./DraftBlockEditorLayer');
    const onChange = vi.fn();
    const ref = { current: null as HTMLTextAreaElement | null };
    function Box() {
      const [text, setText] = useState('');
      return (
        <DraftBlockEditorLayer
          creating={false}
          focusReceipt={{ blockId: 'draft', textFlowId: 'flow', textUnitId: 'tu-1' }}
          layout={defaultDraftLayout}
          pageOffsetX={0}
          phase="focused"
          slashTargetActive={false}
          textareaRef={ref as never}
          text={text}
          onChange={(value, caret, textarea, input) => { setText(value); onChange(value, input); }}
          onClearSlashTarget={vi.fn()}
          onDiscard={vi.fn()}
          onFocused={vi.fn()}
          onFocusReleased={vi.fn()}
          onKeyDown={vi.fn()}
          onPersist={vi.fn(async () => {})}
          onResize={vi.fn()}
        />
      );
    }
    const view = render(<Box />);
    const box = view.container.querySelector('textarea')!;
    fireEvent.compositionStart(box);
    fireEvent.change(box, { target: { value: 'd' } });
    fireEvent.change(box, { target: { value: 'di' } });
    expect(onChange.mock.calls).toEqual([['d', { composing: true }], ['di', { composing: true }]]);
    fireEvent.change(box, { target: { value: '第一' } });
    fireEvent.compositionEnd(box);
    expect(onChange.mock.calls[onChange.mock.calls.length - 1]).toEqual(['第一', undefined]);
    onChange.mockClear();
    fireEvent.change(box, { target: { value: '第一 a' } });
    expect(onChange.mock.calls).toEqual([['第一 a', undefined]]);
  });
});

describe('A-25 ① keys while an input method composes behave as before', () => {
  it('Enter and Escape reach the owner, and Escape discards, the same while composing as not', async () => {
    const { DraftBlockEditorLayer } = await import('./DraftBlockEditorLayer');
    const run = (composing: boolean, text: string) => {
      const keys: string[] = [];
      const onDiscard = vi.fn();
      const view = render(
        <DraftBlockEditorLayer
          creating={false}
          focusReceipt={{ blockId: 'draft', textFlowId: 'flow', textUnitId: 'tu-1' }}
          layout={defaultDraftLayout}
          pageOffsetX={0}
          phase="focused"
          slashTargetActive={false}
          textareaRef={{ current: null } as never}
          text={text}
          onChange={vi.fn()}
          onClearSlashTarget={vi.fn()}
          onDiscard={onDiscard}
          onFocused={vi.fn()}
          onFocusReleased={vi.fn()}
          onKeyDown={(event) => { keys.push(event.key); }}
          onPersist={vi.fn(async () => {})}
          onResize={vi.fn()}
        />,
      );
      const box = view.container.querySelector('textarea')!;
      if (composing) fireEvent.compositionStart(box);
      fireEvent.keyDown(box, { key: 'Enter' });
      fireEvent.keyDown(box, { key: 'Escape' });
      view.unmount();
      return { keys, discarded: onDiscard.mock.calls.length };
    };
    for (const text of ['', 'd']) expect(run(true, text)).toEqual(run(false, text));
    expect(run(false, '')).toEqual({ keys: ['Enter', 'Escape'], discarded: 1 });
  });
});
