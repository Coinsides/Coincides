import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Proposal } from '@shared/types';
import { registerNoteAgentHumanEditor } from '@/lib/noteAgentHumanBridge';
import { NotePatchReview } from './NotePatchReview';

const http = vi.hoisted(() => ({ post: vi.fn(async () => ({ data: {} })) }));
vi.mock('@/services/api', () => ({ default: http }));

const proposal: Proposal = { id: 'c2-proposal', user_id: 'c2-user', conversation_id: 'c2-conversation',
  type: 'note_patch', status: 'pending', created_at: '2026-09-20 00:00:00', resolved_at: null,
  data: { note_id: 'c2-note', note_title: 'Draft', patches: [
    { block_id: 'c2-a', unit_id: 'c2-ua', old_text: 'Old A', new_text: 'New A', base_revision: 1, status: 'pending' },
    { block_id: 'c2-b', unit_id: 'c2-ub', old_text: 'Old B', new_text: 'New B', base_revision: 1, status: 'stale' },
  ] } };

describe('C2 patch-by-patch human review', () => {
  it('renders old/new text, sends only the clicked patch to the mounted editor, and never offers a stale apply', async () => {
    const applyPatch = vi.fn(async () => true);
    const unregister = registerNoteAgentHumanEditor({ noteId: 'c2-note', applyPatch, insertAnswer: async () => false });
    const refresh = vi.fn(async () => {});
    try {
      render(<NotePatchReview proposal={proposal} onRefresh={refresh} />);
      expect(screen.getByText('Old A')).toBeTruthy(); expect(screen.getByText('New A')).toBeTruthy();
      const patches = screen.getAllByRole('region', { name: /修订/ });
      expect((within(patches[1]).getByRole('button', { name: '勾 · 采纳' }) as HTMLButtonElement).disabled).toBe(true);
      fireEvent.click(within(patches[0]).getByRole('button', { name: '勾 · 采纳' }));
      await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
      expect(applyPatch).toHaveBeenCalledWith('c2-proposal', 0, expect.objectContaining({ block_id: 'c2-a' }));
      expect(http.post).not.toHaveBeenCalled();
      fireEvent.click(within(patches[1]).getByRole('button', { name: '叉 · 弃' }));
      await waitFor(() => expect(http.post).toHaveBeenCalledWith('/proposals/c2-proposal/patches/1/discard', {}));
      expect(applyPatch).toHaveBeenCalledTimes(1);
    } finally { unregister(); }
  });

  it('requires the existing editor to be open before acceptance', () => {
    render(<NotePatchReview proposal={proposal} onRefresh={async () => {}} />);
    expect(screen.getByRole('link', { name: '打开 Draft' }).getAttribute('href')).toBe('/#/notes/c2-note');
    expect(screen.getAllByRole('button', { name: '勾 · 采纳' }).every((button) => (button as HTMLButtonElement).disabled)).toBe(true);
  });
});
