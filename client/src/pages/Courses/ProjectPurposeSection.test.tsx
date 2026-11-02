import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PurposeCard } from '../Notes/canvasEngine/purposeRepository';
import { ProjectPurposeSection } from './ProjectPurposeSection';

const repo = vi.hoisted(() => ({
  list: vi.fn(), one: vi.fn(), amend: vi.fn(), redraft: vi.fn(), traces: vi.fn(),
}));
vi.mock('../Notes/canvasEngine/purposeRepository', () => ({
  loadProjectPurposeCards: repo.list,
  loadPurposeCard: repo.one,
  amendPurposeCard: repo.amend,
  redraftPurposeCard: repo.redraft,
  loadPurposeTraces: repo.traces,
}));

const card = (input: Partial<PurposeCard> = {}): PurposeCard => ({
  id: 'p1', title: 'Pass the exam', intent: null, status: 'active', created_by: 'human', user_verbatim: null,
  interpretation: {}, interpretation_locked: false, locked_at: null, member_count: 2, updated_at: '2026-11-02T00:00:00Z', ...input,
});

async function show(input: Partial<PurposeCard> = {}) {
  repo.list.mockResolvedValue([card(input)]);
  const view = render(<ProjectPurposeSection projectId="project" />);
  await waitFor(() => expect(view.container.querySelector('[data-purpose-card]')).not.toBeNull());
  return view;
}

beforeEach(() => {
  for (const mock of Object.values(repo)) mock.mockReset();
  repo.traces.mockResolvedValue([]);
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('purpose card', () => {
  it('asks for this Project and shows an empty section when there are no cards', async () => {
    repo.list.mockResolvedValue([]);
    render(<ProjectPurposeSection projectId="project" />);
    await waitFor(() => expect(screen.getByText('purposeCards.empty')).toBeTruthy());
    expect(repo.list).toHaveBeenCalledWith('project');
  });

  it('quotes the person\'s words exactly, and marks an importer card without any', async () => {
    const quoted = await show({ user_verbatim: '  我想搞懂  ', created_by: 'importer' });
    expect(quoted.container.querySelector('[data-purpose-words]')?.textContent).toBe('“  我想搞懂  ”');
    expect(quoted.container.querySelector('[data-purpose-inferred]')).toBeNull();
    cleanup();
    const inferred = await show({ created_by: 'importer' });
    expect(inferred.container.querySelector('[data-purpose-inferred]')).not.toBeNull();
    cleanup();
    const human = await show();
    expect(human.container.querySelector('[data-purpose-inferred]')).toBeNull();
  });

  it('shows the member count and recent traces with their words and ink', async () => {
    repo.traces.mockResolvedValue([
      { seq: 2, ts: new Date().toISOString(), actor_kind: 'human', verb: 'item_edited', summary: 'Edited item' },
      { seq: 1, ts: new Date().toISOString(), actor_kind: 'agent:interpreter', verb: 'purpose_amended', summary: 'Revised purpose interpretation' },
    ]);
    const view = await show();
    await waitFor(() => expect(view.container.querySelectorAll('[data-purpose-traces] li')).toHaveLength(2));
    expect(repo.traces).toHaveBeenCalledWith('p1', 5);
    const [human, agent] = view.container.querySelectorAll('[data-purpose-traces] li');
    expect(human.textContent).toContain('Edited item');
    expect(human.textContent).not.toContain('purposeCards.byAgent');
    expect(agent.textContent).toContain('purposeCards.byAgent');
    expect(view.container.querySelector('[data-purpose-members]')).not.toBeNull();
  });

  it('the lock icon flips with one click and no confirmation', async () => {
    repo.amend.mockResolvedValue(card({ interpretation_locked: true }));
    const view = await show();
    const button = () => view.container.querySelector('[data-purpose-lock]') as HTMLButtonElement;
    expect(button().getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(button());
    await waitFor(() => expect(button().getAttribute('aria-pressed')).toBe('true'));
    expect(repo.amend).toHaveBeenCalledWith('p1', { interpretation_locked: true });
    expect(view.container.querySelector('[data-purpose-locked]')).not.toBeNull();

    repo.amend.mockResolvedValue(card());
    fireEvent.click(button());
    await waitFor(() => expect(button().getAttribute('aria-pressed')).toBe('false'));
    expect(repo.amend).toHaveBeenLastCalledWith('p1', { interpretation_locked: false });
  });

  it('saving the interpretation sends only changes, and is labelled as locking', async () => {
    repo.amend.mockResolvedValue(card({ interpretation: { true_goal: 'Mine' }, interpretation_locked: true }));
    const view = await show({ interpretation: { true_goal: 'Machine', territory: 'Chapter 1' } });
    fireEvent.click(view.container.querySelector('[data-purpose-edit-interpretation]')!);
    const save = view.container.querySelector('[data-purpose-save-lock]')!;
    expect(save.textContent).toBe('purposeCards.saveAndLock');
    fireEvent.change(view.container.querySelector('[data-purpose-field="true_goal"]')!, { target: { value: 'Mine' } });
    fireEvent.change(view.container.querySelector('[data-purpose-field="territory"]')!, { target: { value: '' } });
    fireEvent.click(save);
    await waitFor(() => expect(view.container.querySelector('[data-purpose-locked]')).not.toBeNull());
    expect(repo.amend).toHaveBeenCalledWith('p1', { interpretation: { true_goal: 'Mine', territory: null } });
    expect(view.container.querySelector('[data-purpose-save-lock]')).toBeNull();
  });

  it('saving without changing a word still locks', async () => {
    repo.amend.mockResolvedValue(card({ interpretation_locked: true }));
    const view = await show({ interpretation: { true_goal: 'Fine as it is' } });
    fireEvent.click(view.container.querySelector('[data-purpose-edit-interpretation]')!);
    fireEvent.click(view.container.querySelector('[data-purpose-save-lock]')!);
    await waitFor(() => expect(repo.amend).toHaveBeenCalledWith('p1', { interpretation: {} }));
  });

  it('edits title and words without touching the lock, sending only what changed', async () => {
    repo.amend.mockResolvedValue(card({ user_verbatim: 'My words' }));
    const view = await show();
    fireEvent.click(view.container.querySelector('[data-purpose-edit]')!);
    fireEvent.change(screen.getByLabelText('purposeCards.wordsLabel'), { target: { value: 'My words' } });
    fireEvent.click(view.container.querySelector('[data-purpose-save]')!);
    await waitFor(() => expect(view.container.querySelector('[data-purpose-words]')).not.toBeNull());
    expect(repo.amend).toHaveBeenCalledWith('p1', { user_verbatim: 'My words' });
  });

  it('offers redraft on pending and failed cards only', async () => {
    const ready = await show({ interpretation: { true_goal: 'Done', draft_status: 'ready' } });
    expect(ready.container.querySelector('[data-purpose-redraft]')).toBeNull();
    cleanup();
    repo.redraft.mockResolvedValue(card({ interpretation: { draft_status: 'pending' } }));
    const failed = await show({ interpretation: { draft_status: 'failed' } });
    expect(failed.container.querySelector('[data-purpose-draft="failed"]')).not.toBeNull();
    fireEvent.click(failed.container.querySelector('[data-purpose-redraft]')!);
    await waitFor(() => expect(failed.container.querySelector('[data-purpose-draft="pending"]')).not.toBeNull());
    expect(repo.redraft).toHaveBeenCalledWith('p1');
  });

  it('explains a locked refusal, and a general failure', async () => {
    repo.redraft.mockRejectedValue({ response: { data: { details: { code: 'purpose_interpretation_locked' } } } });
    const view = await show({ interpretation: { draft_status: 'failed' } });
    fireEvent.click(view.container.querySelector('[data-purpose-redraft]')!);
    await waitFor(() => expect(screen.getAllByRole('alert').map((alert) => alert.textContent)).toContain('purposeCards.lockedRefused'));
    repo.amend.mockRejectedValue(new Error('offline'));
    fireEvent.click(view.container.querySelector('[data-purpose-lock]')!);
    await waitFor(() => expect(screen.getAllByRole('alert').map((alert) => alert.textContent)).toContain('purposeCards.actionFailed'));
    expect(view.container.querySelector('[data-purpose-lock]')?.getAttribute('aria-pressed')).toBe('false');
  });

  it('polls a pending card until its draft lands, then stops', async () => {
    vi.useFakeTimers();
    repo.list.mockResolvedValue([card({ interpretation: { draft_status: 'pending' } })]);
    repo.one.mockResolvedValueOnce(card({ interpretation: { draft_status: 'pending' } }))
      .mockResolvedValue(card({ interpretation: { true_goal: 'Drafted', draft_status: 'ready' } }));
    const view = render(<ProjectPurposeSection projectId="project" />);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(view.container.querySelector('[data-purpose-draft="pending"]')).not.toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(view.container.textContent).toContain('Drafted');
    await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
    expect(repo.one).toHaveBeenCalledTimes(2);
  });

  it('putting a card away removes it from the section', async () => {
    repo.amend.mockResolvedValue(card({ status: 'archived' }));
    const view = await show();
    fireEvent.click(view.container.querySelector('[data-purpose-archive]')!);
    await waitFor(() => expect(view.container.querySelector('[data-purpose-card]')).toBeNull());
    expect(repo.amend).toHaveBeenCalledWith('p1', { status: 'archived' });
    expect(view.container.textContent).toContain('purposeCards.empty');
  });

  it('reports a failed load with a retry', async () => {
    repo.list.mockRejectedValueOnce(new Error('offline')).mockResolvedValue([card()]);
    const view = render(<ProjectPurposeSection projectId="project" />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('purposeCards.loadFailed'));
    fireEvent.click(screen.getByText('purposeCards.retry'));
    await waitFor(() => expect(view.container.querySelector('[data-purpose-card]')).not.toBeNull());
  });
});
