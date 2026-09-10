import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentMemoryRecord } from '@shared/types/agentMemories';
import AgentMemoriesSection from './AgentMemoriesSection';

const requests = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), delete: vi.fn() }));
vi.mock('@/services/api', () => ({ default: requests }));

const path = '/settings/agent-memories';
const originalContent = '  Synthetic memory\nSecond line  ';
const createdAt = '2026-09-09 12:00:00';
const accessedAt = '2026-09-09 12:30:00';
let stored: AgentMemoryRecord[];

beforeEach(() => {
  vi.resetAllMocks();
  stored = [
    {
      id: 'synthetic-memory-one', category: 'preference', content: originalContent,
      source_conversation_id: 'synthetic-conversation', created_at: createdAt, last_accessed: accessedAt,
    },
    {
      id: 'synthetic-memory-two', category: 'fact', content: 'Another synthetic memory',
      source_conversation_id: null, created_at: '2026-09-08 09:00:00', last_accessed: null,
    },
  ];
  requests.get.mockImplementation(async () => ({ data: stored.map((memory) => ({ ...memory })) }));
  requests.put.mockImplementation(async (url: string, { content }: { content: string }) => {
    const id = decodeURIComponent(url.slice(path.length + 1));
    stored = stored.map((memory) => memory.id === id ? { ...memory, content } : memory);
    return { data: { ...stored.find((memory) => memory.id === id)! } };
  });
  requests.delete.mockImplementation(async (url: string) => {
    const id = decodeURIComponent(url.slice(path.length + 1));
    stored = stored.filter((memory) => memory.id !== id);
    return { status: 204 };
  });
});

async function firstRow() {
  await screen.findByText('Another synthetic memory');
  return within(screen.getAllByRole('listitem')[0]);
}

describe('Settings agent memories human controls', () => {
  it('lists synthetic memories verbatim with their stored timestamps and available source conversation', async () => {
    render(<AgentMemoriesSection />);
    expect(screen.getByRole('status').textContent).toBe('Loading agent memories...');
    const row = await firstRow();

    expect(requests.get).toHaveBeenCalledExactlyOnceWith(path);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(row.getByText(originalContent, { normalizer: (text) => text }).textContent).toBe(originalContent);
    expect(row.getByText(createdAt).getAttribute('datetime')).toBe(createdAt);
    expect(row.getByText(accessedAt).getAttribute('datetime')).toBe(accessedAt);
    expect(row.getByText('Source conversation: synthetic-conversation')).toBeTruthy();
    expect(screen.queryByText(/Updated:/)).toBeNull();
  });

  it('saves the exact inline edit and shows the persisted content when reopened', async () => {
    const page = render(<AgentMemoriesSection />);
    const row = await firstRow();
    fireEvent.click(row.getByRole('button', { name: 'Edit' }));
    const content = '  Edited synthetic memory\nKeep this line break.  ';
    fireEvent.change(screen.getByRole('textbox', { name: 'Memory content' }), { target: { value: content } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
    expect(requests.put).toHaveBeenCalledExactlyOnceWith(`${path}/synthetic-memory-one`, { content });
    expect(stored[0].content).toBe(content);
    page.unmount();
    render(<AgentMemoriesSection />);
    await firstRow();
    expect(screen.getByText(content, { normalizer: (text) => text }).textContent).toBe(content);
    expect(requests.get).toHaveBeenCalledTimes(2);
  });

  it('lets a human cancel deletion and removes the row only after confirmed deletion', async () => {
    render(<AgentMemoriesSection />);
    const row = await firstRow();
    fireEvent.click(row.getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('group', { name: 'Confirm memory deletion' }).textContent).toContain('cannot be undone');
    expect(requests.delete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(requests.delete).not.toHaveBeenCalled();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);

    fireEvent.click(row.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1));
    expect(requests.delete).toHaveBeenCalledExactlyOnceWith(`${path}/synthetic-memory-one`);
    expect(stored.map((memory) => memory.id)).toEqual(['synthetic-memory-two']);
    expect(screen.queryByText(originalContent, { normalizer: (text) => text })).toBeNull();
  });

  it('shows the empty state for zero memories', async () => {
    stored = [];
    render(<AgentMemoriesSection />);
    expect(await screen.findByText('No agent memories yet.')).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
  });

  it('retries a failed list request without misreporting an empty collection', async () => {
    requests.get.mockRejectedValueOnce(new Error('Synthetic request failure'));
    render(<AgentMemoriesSection />);
    expect((await screen.findByRole('alert')).textContent).toBe('Could not load agent memories.');
    expect(screen.queryByText('No agent memories yet.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await firstRow();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(requests.get).toHaveBeenCalledTimes(2);
  });

  it('retains a draft after a failed save and allows another save', async () => {
    requests.put.mockRejectedValueOnce(new Error('Synthetic request failure'));
    render(<AgentMemoriesSection />);
    const row = await firstRow();
    fireEvent.click(row.getByRole('button', { name: 'Edit' }));
    const content = 'Synthetic draft retained after a request failure';
    fireEvent.change(screen.getByRole('textbox', { name: 'Memory content' }), { target: { value: content } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByRole('alert');
    expect((screen.getByRole('textbox', { name: 'Memory content' }) as HTMLTextAreaElement).value).toBe(content);
    expect(stored[0].content).toBe(originalContent);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
    expect(stored[0].content).toBe(content);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('retains a row after a failed deletion and allows another confirmed deletion', async () => {
    requests.delete.mockRejectedValueOnce(new Error('Synthetic request failure'));
    render(<AgentMemoriesSection />);
    const row = await firstRow();
    fireEvent.click(row.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
    await screen.findByRole('alert');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(stored).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1));
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
