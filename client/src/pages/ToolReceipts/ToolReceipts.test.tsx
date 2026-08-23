import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ToolReceiptsPage from './ToolReceipts';

const mocks = vi.hoisted(() => ({
  addToast: vi.fn(),
  apply: vi.fn(),
  dismiss: vi.fn(),
  list: vi.fn(),
  listProposed: vi.fn(),
  revert: vi.fn(),
}));

vi.mock('@/stores/uiStore', () => ({
  useUIStore: (selector: (state: { addToast: typeof mocks.addToast }) => unknown) => selector({
    addToast: mocks.addToast,
  }),
}));

vi.mock('./toolReceiptsApi', () => ({
  applyToolReceipt: mocks.apply,
  dismissToolReceipt: mocks.dismiss,
  listProposedToolReceipts: mocks.listProposed,
  listToolReceipts: mocks.list,
  revertToolReceipt: mocks.revert,
}));

type Status = 'proposed' | 'applied' | 'reverted' | 'dismissed';

function receipt(id: string, status: Status) {
  return {
    id,
    tool: 'trash_notes',
    tier: status === 'proposed' || status === 'dismissed' ? 'propose' : 'immediate',
    resources: [{ kind: 'note', id: `note-${id}`, outcome: status === 'proposed' ? 'pending' : 'trashed' }],
    intended_input_summary: `${id} summary`,
    created_at: '2026-08-23T12:00:00.000Z',
    status,
    applied_at: status === 'applied' || status === 'reverted' ? '2026-08-23T12:01:00.000Z' : null,
    reverted_at: status === 'reverted' ? '2026-08-23T12:02:00.000Z' : null,
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/tool-receipts']}>
      <ToolReceiptsPage />
    </MemoryRouter>,
  );
}

describe('ToolReceipts human review and executed views', () => {
  let byStatus: Record<Status, ReturnType<typeof receipt>[]>;

  beforeEach(() => {
    vi.clearAllMocks();
    byStatus = {
      proposed: [
        receipt('proposal-one', 'proposed'),
        receipt('proposal-two', 'proposed'),
      ],
      applied: [receipt('applied-one', 'applied')],
      reverted: [receipt('reverted-one', 'reverted')],
      dismissed: [receipt('dismissed-one', 'dismissed')],
    };
    mocks.list.mockImplementation(async (status: Status) => [...byStatus[status]]);
    mocks.listProposed.mockImplementation(async () => [...byStatus.proposed]);
    mocks.apply.mockImplementation(async (receiptId: string) => {
      byStatus.proposed = byStatus.proposed.filter((item) => item.id !== receiptId);
    });
    mocks.dismiss.mockImplementation(async (receiptId: string) => {
      byStatus.proposed = byStatus.proposed.filter((item) => item.id !== receiptId);
    });
    mocks.revert.mockImplementation(async () => {
      const applied = byStatus.applied[0];
      byStatus.applied = [];
      byStatus.reverted = [
        { ...applied, status: 'reverted', reverted_at: '2026-08-23T12:03:00.000Z' },
        ...byStatus.reverted,
      ];
    });
  });

  it('K-7 keeps the proposed Apply, Dismiss, and Jump to scene controls', async () => {
    renderPage();

    expect(await screen.findByText('proposal-one summary')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Jump to scene' })).toHaveLength(2);
    expect((screen.getAllByRole('button', { name: 'Jump to scene' })[0] as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getAllByRole('button', { name: 'Apply' })[0]);
    await waitFor(() => expect(mocks.apply).toHaveBeenCalledWith('proposal-one'));

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Dismiss' })).toHaveLength(1);
      expect((screen.getByRole('button', { name: 'Dismiss' }) as HTMLButtonElement).disabled).toBe(false);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    await waitFor(() => expect(mocks.dismiss).toHaveBeenCalledWith('proposal-two'));
  });

  it('K-4/K-5 exposes all four API-backed counts and moves a reverted row into read-only history', async () => {
    renderPage();

    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(4));
    expect(screen.getByRole('tab', { name: 'Proposed 2' })).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Executed 3' }));

    expect(screen.getByText('Applied 1')).toBeTruthy();
    expect(screen.getByText('Reverted 1')).toBeTruthy();
    expect(screen.getByText('Dismissed 1')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Revert' })).toHaveLength(1);
    expect(screen.getByText('reverted-one summary')).toBeTruthy();
    expect(screen.getByText('dismissed-one summary')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Revert' }));

    await waitFor(() => expect(mocks.revert).toHaveBeenCalledWith('applied-one'));
    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(8));
    expect(screen.getByText('Applied 0')).toBeTruthy();
    expect(screen.getByText('Reverted 2')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Revert' })).toBeNull();
    expect(screen.getByText('applied-one summary')).toBeTruthy();
  });
});
