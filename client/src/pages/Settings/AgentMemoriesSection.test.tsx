import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AgentMemoriesSection from './AgentMemoriesSection';
import AgentMemoriesPage from '../AgentMemories/AgentMemories';

const requests = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/services/api', () => ({ default: requests }));

beforeEach(() => {
  vi.resetAllMocks();
  requests.get.mockResolvedValue({ data: Array.from({ length: 205 }, (_, index) => ({
    id: 'synthetic-' + index, content: 'Synthetic memory ' + index, category: 'fact',
    created_at: new Date(Date.UTC(2026, 8, 10, 0, 0, -index)).toISOString(),
    source_conversation_id: null, last_accessed: null,
  })) });
});

describe('Settings agent memories summary', () => {
  it('shows the total and three latest previews, then opens the full page', async () => {
    render(<MemoryRouter><Routes>
      <Route path="/" element={<AgentMemoriesSection />} />
      <Route path="/agent-memories" element={<AgentMemoriesPage />} />
    </Routes></MemoryRouter>);
    await screen.findByText('205 memories');
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getAllByRole('listitem').map((row) => row.textContent)).toEqual([
      expect.stringContaining('Synthetic memory 0'), expect.stringContaining('Synthetic memory 1'), expect.stringContaining('Synthetic memory 2'),
    ]);
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    fireEvent.click(screen.getByRole('link', { name: 'View all agent memories' }));
    await screen.findByRole('heading', { name: 'Agent memories', level: 1 });
    await screen.findByText('Synthetic memory 24');
    expect(screen.getAllByRole('listitem')).toHaveLength(25);
  });

  it('keeps the zero-count empty state and full-page entry', async () => {
    requests.get.mockResolvedValue({ data: [] });
    render(<MemoryRouter><AgentMemoriesSection /></MemoryRouter>);
    await screen.findByText('No agent memories yet.');
    expect(screen.getByText('0 memories')).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.getByRole('link', { name: 'View all agent memories' }).getAttribute('href')).toBe('/agent-memories');
  });

  it('retries a load failure without showing an incorrect count or empty state', async () => {
    requests.get.mockRejectedValueOnce(new Error('Synthetic load failure'));
    render(<MemoryRouter><AgentMemoriesSection /></MemoryRouter>);
    await screen.findByRole('alert');
    expect(screen.queryByText('0 memories')).toBeNull();
    expect(screen.queryByText('No agent memories yet.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByText('205 memories');
  });
});
