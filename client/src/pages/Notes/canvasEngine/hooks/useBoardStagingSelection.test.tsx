import { useRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NoteCanvasRuntimeProvider } from '../NoteCanvasRuntimeProvider';
import { SelectionTypographyToolbarLayer } from '../layers/SelectionTypographyToolbarLayer';
import { DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE } from '../typographyProfileService';
import { useBoardStagingSelection } from './useBoardStagingSelection';
import type { BoardTextRangeSelection } from '@shared/types/boardTextRange';

const selection = {
  blockId: 'block-a', textFlowId: 'flow-a', textUnitId: 'unit-a',
  startOffset: 7, endOffset: 14, text: 'Before passage after',
};
function renderSelection(options: {
  hostMode?: 'page' | 'modal';
  blockIds?: string[];
  send?: (reference: BoardTextRangeSelection) => Promise<boolean>;
} = {}) {
  const close = vi.fn();
  const send = options.send ?? vi.fn(async () => true);
  function Surface() {
    const surfaceRef = useRef<HTMLDivElement>(null);
    const onSendToStaging = useBoardStagingSelection({
      noteId: 'note-a', surfaceRef, selection, blockIds: options.blockIds ?? ['block-a'],
    });
    return <div ref={surfaceRef}>
      <textarea aria-label="Selected note text" data-block-id="block-a" data-text-flow-id="flow-a"
        data-text-unit-id="unit-a" defaultValue={selection.text} />
      <SelectionTypographyToolbarLayer selection={{ range: selection, anchorRect: new DOMRect(100, 200, 120, 20) }}
        typographyProfile={DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE} onSaveTypographyProfile={vi.fn()}
        onClose={close} onSendToStaging={onSendToStaging} />
    </div>;
  }
  render(<NoteCanvasRuntimeProvider noteId="note-a" hostMode={options.hostMode ?? 'modal'} onSendToStaging={send}>
    <Surface />
  </NoteCanvasRuntimeProvider>);
  return { close, send };
}

describe('Modal selection Send to staging', () => {
  it('sends the source identities, offsets, and excerpt through the existing range receipt contract', async () => {
    const { close, send } = renderSelection();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Send to staging' })); });
    expect(send).toHaveBeenCalledExactlyOnceWith({
      note_id: 'note-a', block_id: 'block-a', text_flow_id: 'flow-a', text_unit_id: 'unit-a',
      start_offset: 7, end_offset: 14, excerpt: 'passage', at: expect.any(String),
    });
    expect(close).toHaveBeenCalledOnce();
  });

  it('does not expose the board action in the page note host', () => {
    renderSelection({ hostMode: 'page' });
    expect(screen.queryByRole('button', { name: 'Send to staging' })).toBeNull();
  });

  it.each(['missing block', 'changed text'])('refuses a stale selection: %s', async (reason) => {
    const { close, send } = renderSelection({ blockIds: reason === 'missing block' ? [] : ['block-a'] });
    if (reason === 'changed text') (screen.getByRole('textbox') as HTMLTextAreaElement).value = 'Changed since selection';
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Send to staging' })); });
    expect(send).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });

  it('waits for a single mount, keeps the selection after failure, and permits retry', async () => {
    let finish!: (result: boolean) => void;
    const pending = new Promise<boolean>((resolve) => { finish = resolve; });
    const send = vi.fn().mockReturnValueOnce(pending).mockResolvedValueOnce(true);
    const { close } = renderSelection({ send });
    const sendButton = screen.getByRole('button', { name: 'Send to staging' });
    await act(async () => {
      fireEvent.click(sendButton);
      fireEvent.click(sendButton);
    });
    expect((screen.getByRole('button', { name: 'Sending…' }) as HTMLButtonElement).disabled).toBe(true);
    expect(send).toHaveBeenCalledOnce();
    expect(close).not.toHaveBeenCalled();
    await act(async () => { finish(false); await pending; });
    expect(close).not.toHaveBeenCalled();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Send to staging' })); });
    expect(send).toHaveBeenCalledTimes(2);
    expect(close).toHaveBeenCalledOnce();
  });
});
