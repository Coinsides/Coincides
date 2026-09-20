import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { AgentEpisodeRecord } from '@shared/types/agentEpisodes';
import AgentMemoriesPage from './AgentMemories';

const requests = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), delete: vi.fn() }));
vi.mock('@/services/api', () => ({ default: requests }));

const path = '/settings/agent-episodes';
let stored: AgentEpisodeRecord[];

function episode(index: number, conversationId = 'synthetic-conversation-a'): AgentEpisodeRecord {
  return {
    id: `synthetic-episode-${index}`, conversation_id: conversationId,
    conversation_title: 'Synthetic project', seq: index + 1,
    summary_text: `  Synthetic summary ${index}\nOriginal summary spacing.  `,
    message_range: {
      first_message_id: `synthetic-message-${index}-first`,
      last_message_id: `synthetic-message-${index}-last`,
      started_at: '2026-09-20 08:00:00', ended_at: '2026-09-20 08:30:00',
    },
    anchor_manifest: {
      note_ids: ['synthetic-note-a', `synthetic-note-${'long-id-'.repeat(20)}`],
      board_ids: ['synthetic-board-a'], item_ids: ['synthetic-item-a'],
      proposal_ids: ['synthetic-proposal-a'], memory_ids: ['synthetic-memory-a'],
    },
    token_estimate: 25, created_at: '2026-09-20 08:31:00',
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  stored = [episode(0), episode(1, 'synthetic-conversation-b'), episode(2)];
  requests.get.mockImplementation(async (url: string) => ({ data: url === path ? structuredClone(stored) : [] }));
  requests.delete.mockImplementation(async (url: string) => {
    const id = decodeURIComponent(url.slice(path.length + 1));
    stored = stored.filter((row) => row.id !== id);
    return { status: 204 };
  });
});

async function openEpisodes() {
  render(<MemoryRouter><AgentMemoriesPage /></MemoryRouter>);
  await screen.findByText('No agent memories yet.');
  fireEvent.click(screen.getByRole('tab', { name: 'Episodes' }));
  await waitFor(() => expect(screen.queryByText('Loading conversation episodes...')).toBeNull());
}

describe('C3 episode human view', () => {
  it('loads the Episodes tab on demand and groups summaries with complete anchor IDs and message ranges', async () => {
    render(<MemoryRouter><AgentMemoriesPage /></MemoryRouter>);
    await screen.findByText('No agent memories yet.');
    expect(requests.get).toHaveBeenCalledExactlyOnceWith('/settings/agent-memories');
    fireEvent.click(screen.getByRole('tab', { name: 'Episodes' }));
    await screen.findByRole('region', { name: 'Conversation synthetic-conversation-a' });

    expect(requests.get).toHaveBeenLastCalledWith(path);
    expect(screen.getByRole('tab', { name: 'Episodes' }).getAttribute('aria-selected')).toBe('true');
    const firstGroup = within(screen.getByRole('region', { name: 'Conversation synthetic-conversation-a' }));
    expect(firstGroup.getAllByRole('listitem')).toHaveLength(2);
    const firstRow = within(firstGroup.getAllByRole('listitem')[0]);
    expect(firstRow.getByRole('heading', { name: 'Episode 3' })).toBeTruthy();
    expect(firstRow.getByText(stored[2].summary_text, { normalizer: (text) => text }).textContent).toBe(stored[2].summary_text);
    for (const id of Object.values(stored[2].anchor_manifest).flat()) {
      expect(firstRow.getByText(id, { exact: true }).textContent).toBe(id);
    }
    expect(firstRow.getByText(stored[2].message_range.started_at).getAttribute('datetime')).toBe(stored[2].message_range.started_at);
    expect(firstRow.getByText(stored[2].message_range.ended_at).getAttribute('datetime')).toBe(stored[2].message_range.ended_at);
    expect(firstRow.getByText('Messages: synthetic-message-2-first → synthetic-message-2-last')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Conversation synthetic-conversation-b' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(requests.put).not.toHaveBeenCalled();
  });

  it('searches the full loaded collection, including an older episode beyond the first page and its anchor ID', async () => {
    stored = Array.from({ length: 30 }, (_, index) => episode(index));
    stored[0].anchor_manifest.memory_ids = ['synthetic-older-anchor'];
    await openEpisodes();
    expect(screen.getAllByRole('listitem')).toHaveLength(25);
    expect(screen.queryByText(stored[0].summary_text, { normalizer: (text) => text })).toBeNull();
    const search = screen.getByRole('searchbox', { name: 'Search episodes' });
    fireEvent.change(search, { target: { value: 'SYNTHETIC-OLDER-ANCHOR' } });
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText(stored[0].summary_text, { normalizer: (text) => text })).toBeTruthy();
    fireEvent.change(search, { target: { value: 'missing summary phrase' } });
    expect(screen.getByText('No episodes match your search.')).toBeTruthy();
    fireEvent.change(search, { target: { value: '' } });
    expect(screen.getAllByRole('listitem')).toHaveLength(25);
    expect(requests.get).toHaveBeenCalledTimes(2);
  });

  it('keeps all 52 episodes reachable across grouped pages and a conversation label on each page', async () => {
    stored = Array.from({ length: 52 }, (_, index) => episode(index, index % 2 ? 'synthetic-b' : 'synthetic-a'));
    await openEpisodes();
    const seen = new Set<string>();
    const navigation = within(screen.getByRole('navigation', { name: 'Episode pages' }));
    for (let page = 0; page < 3; page += 1) {
      const rows = screen.getAllByRole('listitem');
      expect(rows).toHaveLength(page === 2 ? 2 : 25);
      for (const row of rows) {
        seen.add(row.querySelector('h4')!.textContent!);
        expect(row.closest('section')?.getAttribute('aria-label')).toMatch(/^Conversation synthetic-[ab]$/);
      }
      if (page < 2) fireEvent.click(navigation.getByRole('button', { name: 'Next' }));
    }
    expect(seen.size).toBe(52);
    expect((navigation.getByRole('button', { name: 'Next' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('explains original-message retention, cancels without a write, and deletes only after confirmation', async () => {
    stored = [episode(0)];
    await openEpisodes();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('group', { name: 'Confirm episode deletion' }).textContent)
      .toContain('Original conversation messages and referenced objects will be kept.');
    expect(requests.delete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(requests.delete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
    await screen.findByText('No conversation episodes yet.');
    expect(requests.delete).toHaveBeenCalledExactlyOnceWith(`${path}/synthetic-episode-0`);
    expect(requests.put).not.toHaveBeenCalled();
  });

  it('retains a failed deletion for retry and disables navigation while deletion is pending', async () => {
    stored = [episode(0)];
    requests.delete.mockRejectedValueOnce(new Error('Synthetic request failure'));
    await openEpisodes();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
    expect((screen.getByRole('tab', { name: 'Memories' }) as HTMLButtonElement).disabled).toBe(true);
    await screen.findByRole('alert');
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(stored).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
    await screen.findByText('No conversation episodes yet.');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('returns to a valid page after deleting its only row', async () => {
    stored = Array.from({ length: 26 }, (_, index) => episode(index));
    await openEpisodes();
    const navigation = within(screen.getByRole('navigation', { name: 'Episode pages' }));
    fireEvent.click(navigation.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect((navigation.getByRole('button', { name: 'Previous' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('searchbox') as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(25));
    expect(screen.queryByRole('navigation', { name: 'Episode pages' })).toBeNull();
    expect(stored).toHaveLength(25);
  });

  it('retries a failed list without reporting an empty collection', async () => {
    requests.get.mockImplementationOnce(async () => ({ data: [] }))
      .mockRejectedValueOnce(new Error('Synthetic request failure'));
    await openEpisodes();
    expect(screen.getByRole('alert').textContent).toBe('Could not load conversation episodes.');
    expect(screen.queryByText('No conversation episodes yet.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByRole('region', { name: 'Conversation synthetic-conversation-a' });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(requests.get).toHaveBeenCalledTimes(3);
  });

  it('supports keyboard tab navigation and shows empty anchor kinds without an edit control', async () => {
    stored = [{ ...episode(0), conversation_title: null,
      anchor_manifest: { note_ids: [], board_ids: [], item_ids: [], proposal_ids: [], memory_ids: [] } }];
    render(<MemoryRouter><AgentMemoriesPage /></MemoryRouter>);
    await screen.findByText('No agent memories yet.');
    const memories = screen.getByRole('tab', { name: 'Memories' });
    fireEvent.keyDown(memories, { key: 'ArrowRight' });
    await screen.findByText('Untitled conversation');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Episodes' }));
    expect(screen.getAllByText('None')).toHaveLength(5);
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Episodes' }), { key: 'Home' });
    expect(screen.getByText('No agent memories yet.')).toBeTruthy();
    expect(memories.getAttribute('aria-selected')).toBe('true');
  });
});
