import { useState } from 'react';
import { act, createEvent, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { BlockEditRecoveryReceipt } from '../draftBlockPersistence';
import type { NoteBlock, TextBlockContentV1 } from '../runtimeDataTypes';
import { createTextBlockContentV1 } from '../textFlowService';
import { BlockEditRecoveryQueue } from './BlockEditRecoveryQueue';

const receipt: BlockEditRecoveryReceipt = {
  version: 2, kind: 'block_edit_recovery', recoveryKey: 'recovery-a',
  noteId: 'note-a', requestedNoteId: 'note-a', mountNonce: 'mount-a',
  creationGeneration: 1, operationSequence: 1, blockId: 'block-a',
  text: 'saved draft', plainText: 'saved draft', contentJson: { body: 'saved draft' },
  baseRevision: 3, hydrationEpoch: 1, queuedAt: '2026-09-11T12:00:00.000Z',
};
const current: NoteBlock = {
  id: 'block-a', text_save_revision: 7, placement_id: 'placement-a',
  display_overrides_json: {}, block_type: 'paragraph', title: null,
  content_json: { body: 'newer saved text' }, plain_text: 'newer saved text',
  metadata: {}, order_index: 0, source_references: [],
};

function callbacks() {
  return {
    onApply: vi.fn(async (_key: string) => false),
    onDismiss: vi.fn((_key: string) => true),
    onInspect: vi.fn(async (_key: string): Promise<NoteBlock | null> => current),
    onReplay: vi.fn(async (_key: string) => false),
  };
}

function textFlow(units: { id: string; text: string; deleted?: boolean }[]): TextBlockContentV1 {
  return {
    ...createTextBlockContentV1(''),
    units: units.map((unit, index) => ({
      ...createTextBlockContentV1('').units[0], ...unit, order_index: index,
      status: unit.deleted ? 'deleted' : 'active',
    })),
  };
}

describe('BlockEditRecoveryQueue conflict choices', () => {
  it('preserves ordinary Apply and Dismiss actions, including editor focus protection and failed-Apply retry', async () => {
    const props = callbacks();
    render(<BlockEditRecoveryQueue receipts={[receipt]} {...props} />);
    const apply = screen.getByRole('button', { name: 'Apply' });
    const mouseDown = createEvent.mouseDown(apply);
    fireEvent(apply, mouseDown);
    expect(mouseDown.defaultPrevented).toBe(true);
    fireEvent.click(apply);
    await act(async () => {});
    fireEvent.click(apply);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(props.onApply).toHaveBeenCalledTimes(2);
    expect(props.onApply).toHaveBeenLastCalledWith(receipt.recoveryKey);
    expect(props.onDismiss).toHaveBeenCalledWith(receipt.recoveryKey);
    expect(props.onInspect).not.toHaveBeenCalled();
    expect(props.onReplay).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'View differences' })).toBeNull();
  });

  it('changes a stale Apply result into three informed choices without fetching or replaying automatically', async () => {
    const props = callbacks();
    const { rerender } = render(<BlockEditRecoveryQueue receipts={[receipt]} {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await act(async () => {});
    rerender(<BlockEditRecoveryQueue receipts={[receipt]} conflicts={{ [receipt.recoveryKey]: true }} {...props} />);
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'View differences', 'Replay draft on current version', 'Discard this draft',
    ]);
    expect(screen.getByText(/This draft is based on an older version/)).toBeTruthy();
    expect(screen.getByText(/Replaying will replace the current block text with this draft/)).toBeTruthy();
    expect(props.onInspect).not.toHaveBeenCalled();
    expect(props.onReplay).not.toHaveBeenCalled();
    expect(props.onDismiss).not.toHaveBeenCalled();
  });

  it('loads a read-only current-text comparison and matches units while showing empty, deleted and absent units', async () => {
    const props = callbacks();
    const draftFlow = textFlow([
      { id: 'shared', text: 'draft shared text' }, { id: 'draft-only', text: '' },
      { id: 'deleted', text: 'removed draft text', deleted: true },
    ]);
    props.onInspect.mockResolvedValue({ ...current, content_json: { text_flow: textFlow([
      { id: 'current-only', text: 'current-only text' }, { id: 'shared', text: 'current shared text' },
    ]) } });
    render(<BlockEditRecoveryQueue receipts={[{ ...receipt, contentJson: { text_flow: draftFlow } }]}
      conflicts={{ [receipt.recoveryKey]: true }} {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'View differences' }));
    const comparison = await screen.findByRole('region', { name: 'Draft and current text comparison' });
    const sharedRow = within(comparison).getByText('draft shared text').parentElement!.parentElement!;
    expect(within(sharedRow).getByText('current shared text')).toBeTruthy();
    expect(within(sharedRow).getByText('Current text · unit 2')).toBeTruthy();
    expect(within(comparison).getByText('Empty text unit')).toBeTruthy();
    expect(within(comparison).getByText('Deleted unit')).toBeTruthy();
    expect(within(comparison).getAllByText('Not present in the current version')).toHaveLength(2);
    expect(within(comparison).getByText('Not present in the recovery draft')).toBeTruthy();
    expect(within(comparison).getByText('current-only text')).toBeTruthy();
    expect(within(comparison).getByText(/current version 7/)).toBeTruthy();
    expect(props.onInspect).toHaveBeenCalledWith(receipt.recoveryKey);
    expect(props.onApply).not.toHaveBeenCalled();
    expect(props.onReplay).not.toHaveBeenCalled();
    expect(props.onDismiss).not.toHaveBeenCalled();
  });

  it('shows read failures without dropping the draft and allows another explicit comparison request', async () => {
    const props = callbacks();
    props.onInspect.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(null).mockResolvedValueOnce(current);
    render(<BlockEditRecoveryQueue receipts={[receipt]} conflicts={{ [receipt.recoveryKey]: true }} {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'View differences' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Your draft is still available');
    fireEvent.click(screen.getByRole('button', { name: 'View differences' }));
    await waitFor(() => expect(props.onInspect).toHaveBeenCalledTimes(2));
    await waitFor(() => expect((screen.getByRole('button', { name: 'View differences' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'View differences' }));
    const comparison = await screen.findByRole('region', { name: 'Draft and current text comparison' });
    expect(within(comparison).getByText('saved draft')).toBeTruthy();
    expect(within(comparison).getByText('newer saved text')).toBeTruthy();
    expect(props.onInspect).toHaveBeenCalledTimes(3);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(props.onReplay).not.toHaveBeenCalled();
  });

  it('blocks duplicate and competing actions during a comparison request', async () => {
    const props = callbacks();
    let resolveRead!: (value: NoteBlock) => void;
    props.onInspect.mockImplementation(() => new Promise((resolve) => { resolveRead = resolve; }));
    render(<BlockEditRecoveryQueue receipts={[receipt]} conflicts={{ [receipt.recoveryKey]: true }} {...props} />);
    const inspect = screen.getByRole('button', { name: 'View differences' });
    fireEvent.click(inspect);
    fireEvent.click(inspect);
    fireEvent.click(screen.getByRole('button', { name: 'Replay draft on current version' }));
    fireEvent.click(screen.getByRole('button', { name: 'Discard this draft' }));
    expect(screen.getAllByRole('button').every((button) => (button as HTMLButtonElement).disabled)).toBe(true);
    expect(props.onInspect).toHaveBeenCalledTimes(1);
    expect(props.onReplay).not.toHaveBeenCalled();
    expect(props.onDismiss).not.toHaveBeenCalled();
    await act(async () => { resolveRead(current); });
    expect(screen.getAllByRole('button').every((button) => !(button as HTMLButtonElement).disabled)).toBe(true);
  });

  it('replays only on the informed action, guards duplicate clicks, and leaves a failed replay recoverable', async () => {
    const props = callbacks();
    let resolveReplay!: (value: boolean) => void;
    props.onReplay.mockImplementation(() => new Promise((resolve) => { resolveReplay = resolve; }));
    render(<BlockEditRecoveryQueue receipts={[receipt]} conflicts={{ [receipt.recoveryKey]: true }} {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'View differences' }));
    await screen.findByRole('region', { name: 'Draft and current text comparison' });
    const replay = screen.getByRole('button', { name: 'Replay draft on current version' });
    replay.focus();
    expect(document.activeElement).toBe(replay);
    const mouseDown = createEvent.mouseDown(replay);
    fireEvent(replay, mouseDown);
    expect(mouseDown.defaultPrevented).toBe(true);
    fireEvent.click(replay);
    fireEvent.click(replay);
    expect(props.onReplay).toHaveBeenCalledTimes(1);
    expect(props.onReplay).toHaveBeenCalledWith(receipt.recoveryKey);
    expect(screen.getAllByRole('button').every((button) => (button as HTMLButtonElement).disabled)).toBe(true);
    expect(screen.queryByRole('region', { name: 'Draft and current text comparison' })).toBeNull();
    await act(async () => { resolveReplay(false); });
    expect(screen.getByRole('alert').textContent).toContain('The draft was not saved and is still available');
    expect(screen.getByRole('button', { name: 'Replay draft on current version' })).toBeTruthy();
    expect(props.onApply).not.toHaveBeenCalled();
    expect(props.onDismiss).not.toHaveBeenCalled();
  });

  it('reflects successful replay removal, with no automatic Apply or discard', async () => {
    const props = callbacks();
    props.onReplay.mockResolvedValue(true);
    function QueueOwner() {
      const [receipts, setReceipts] = useState([receipt]);
      return <BlockEditRecoveryQueue receipts={receipts} conflicts={{ [receipt.recoveryKey]: true }} {...props}
        onReplay={async (key) => {
          const saved = await props.onReplay(key);
          if (saved) setReceipts([]);
          return saved;
        }} />;
    }
    render(<QueueOwner />);
    fireEvent.click(screen.getByRole('button', { name: 'Replay draft on current version' }));
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
    expect(props.onReplay).toHaveBeenCalledWith(receipt.recoveryKey);
    expect(props.onInspect).not.toHaveBeenCalled();
    expect(props.onApply).not.toHaveBeenCalled();
    expect(props.onDismiss).not.toHaveBeenCalled();
  });

  it('discards only the chosen draft and does not read or save the current text', () => {
    const props = callbacks();
    const otherReceipt = { ...receipt, recoveryKey: 'recovery-b', text: 'another draft' };
    function QueueOwner() {
      const [receipts, setReceipts] = useState([receipt, otherReceipt]);
      return <BlockEditRecoveryQueue receipts={receipts} conflicts={{ [receipt.recoveryKey]: true }} {...props}
        onDismiss={(key) => {
          props.onDismiss(key);
          setReceipts((previous) => previous.filter((item) => item.recoveryKey !== key));
          return true;
        }} />;
    }
    render(<QueueOwner />);
    fireEvent.click(screen.getByRole('button', { name: 'Discard this draft' }));
    expect(props.onDismiss).toHaveBeenCalledWith(receipt.recoveryKey);
    expect(screen.queryByRole('button', { name: 'Discard this draft' })).toBeNull();
    expect(screen.getByText('another draft')).toBeTruthy();
    expect(props.onInspect).not.toHaveBeenCalled();
    expect(props.onReplay).not.toHaveBeenCalled();
    expect(props.onApply).not.toHaveBeenCalled();
  });
});
