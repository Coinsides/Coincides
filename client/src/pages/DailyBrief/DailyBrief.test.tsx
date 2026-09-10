import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DailyBriefResponse } from '@shared/types';
import { useDailyBriefStore } from '@/stores/dailyBriefStore';
import { useUIStore } from '@/stores/uiStore';
import DailyBrief from './DailyBrief';

const requests = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock('@/services/api', () => ({ default: requests }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | { defaultValue: string }) => (
      typeof fallback === 'string' ? fallback : fallback?.defaultValue ?? key
    ),
  }),
}));

const syntheticBrief: DailyBriefResponse = {
  date: '2026-09-10',
  tasks: { must: [], recommended: [], optional: [] },
  cards_due_count: 0,
  recurring_alerts: [],
  energy_level: null,
  time_blocks: [],
  minimum_working_flow: {
    must_tasks_count: 0,
    cards_due_count: 0,
    exam_mode_active: false,
    exam_courses: [],
  },
};

beforeEach(() => {
  vi.resetAllMocks();
  useDailyBriefStore.setState({ briefData: null, loading: false });
  useUIStore.getState().setAgentPanelOpen(false);
  requests.get.mockResolvedValue({ data: syntheticBrief });
});

afterEach(() => {
  cleanup();
  useUIStore.getState().setAgentPanelOpen(false);
  useDailyBriefStore.setState({ briefData: null, loading: false });
});

describe('Home Agent entry', () => {
  it('opens the existing panel state from the loaded Home and keeps it open on repeated clicks', async () => {
    render(<MemoryRouter><DailyBrief /></MemoryRouter>);
    await screen.findByText("Today's Minimum");
    expect(useUIStore.getState().agentPanelOpen).toBe(false);

    const entry = screen.getByRole('button', { name: 'Chat with Agent' });
    fireEvent.click(entry);
    expect(useUIStore.getState().agentPanelOpen).toBe(true);
    fireEvent.click(entry);
    expect(useUIStore.getState().agentPanelOpen).toBe(true);
    expect(requests.get).toHaveBeenCalledWith('/daily-brief');
    expect(requests.post).not.toHaveBeenCalled();
    expect(requests.put).not.toHaveBeenCalled();
  });

  it('opens the panel while the first brief is pending and preserves it when loading completes', async () => {
    let resolveBrief!: (value: { data: DailyBriefResponse }) => void;
    requests.get.mockReturnValue(new Promise<{ data: DailyBriefResponse }>((resolve) => {
      resolveBrief = resolve;
    }));
    render(<MemoryRouter><DailyBrief /></MemoryRouter>);
    expect(useDailyBriefStore.getState().loading).toBe(true);
    expect(screen.queryByText("Today's Minimum")).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Chat with Agent' }));
    expect(useUIStore.getState().agentPanelOpen).toBe(true);

    await act(async () => resolveBrief({ data: syntheticBrief }));
    await waitFor(() => expect(useDailyBriefStore.getState().loading).toBe(false));
    expect(screen.getByText("Today's Minimum")).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Chat with Agent' })).toBeTruthy();
    expect(useUIStore.getState().agentPanelOpen).toBe(true);
  });
});
