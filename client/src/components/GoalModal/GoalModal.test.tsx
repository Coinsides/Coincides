import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Goal } from '@shared/types';
import GoalModal from './GoalModal';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  createGoal: vi.fn(),
  updateGoal: vi.fn(),
  batchCreateTasks: vi.fn(),
  closeModal: vi.fn(),
  addToast: vi.fn(),
  modal: null as { type: string; data?: Record<string, unknown> } | null,
}));

vi.mock('@/services/api', () => ({ default: { get: mocks.get } }));
vi.mock('@/stores/uiStore', () => ({
  useUIStore: (select: (state: unknown) => unknown) => select({
    modal: mocks.modal, closeModal: mocks.closeModal, addToast: mocks.addToast,
  }),
}));
vi.mock('@/stores/courseStore', () => ({
  useCourseStore: (select: (state: unknown) => unknown) => select({ courses: [{ id: 'course-1', name: 'Networks' }] }),
}));
vi.mock('@/stores/goalStore', () => ({
  useGoalStore: () => ({ goals: [], createGoal: mocks.createGoal, updateGoal: mocks.updateGoal }),
}));
vi.mock('@/stores/taskStore', () => ({
  useTaskStore: () => ({ batchCreateTasks: mocks.batchCreateTasks }),
}));

const goal = {
  id: 'goal-1', title: 'Learn sockets', description: 'Ports and sockets', deadline: '2026-11-20',
  course_id: 'course-1', parent_id: null,
} as unknown as Goal;

beforeEach(() => {
  vi.resetAllMocks();
  mocks.get.mockResolvedValue({ data: [
    { id: 'task-1', title: 'Read chapter 3', date: '2026-11-02', goal_id: 'goal-1' },
    { id: 'task-2', title: 'Other goal task', date: '2026-11-03', goal_id: 'goal-2' },
  ] });
  mocks.updateGoal.mockImplementation(async (_id, data) => ({ ...goal, ...data }));
});

describe('GoalModal edit mode', () => {
  it('saves the existing goal in place and shows its tasks', async () => {
    mocks.modal = { type: 'goal-edit', data: { goal } };
    render(<GoalModal />);

    expect(screen.getByText('Edit Goal')).toBeTruthy();
    expect(await screen.findByText('Read chapter 3')).toBeTruthy();
    expect(screen.queryByText('Other goal task')).toBeNull();
    expect(mocks.get).toHaveBeenCalledWith('/tasks', { params: { course_id: 'course-1' } });
    expect(screen.queryByRole('button', { name: 'Create Goal' })).toBeNull();

    fireEvent.change(screen.getByPlaceholderText('e.g. Master Chapter 5'), { target: { value: 'Learn sockets well' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Goal' }));

    await waitFor(() => expect(mocks.updateGoal).toHaveBeenCalledWith('goal-1', {
      title: 'Learn sockets well', description: 'Ports and sockets', deadline: '2026-11-20',
    }));
    expect(mocks.createGoal).not.toHaveBeenCalled();
    expect(mocks.batchCreateTasks).not.toHaveBeenCalled();
    expect(mocks.addToast).toHaveBeenCalledWith('success', 'Goal saved');
    expect(mocks.closeModal).toHaveBeenCalled();
  });

  it('keeps creating a new goal outside edit mode', async () => {
    mocks.modal = { type: 'goal-create' };
    mocks.createGoal.mockResolvedValue({ ...goal, id: 'goal-new' });
    render(<GoalModal />);

    fireEvent.change(screen.getByPlaceholderText('e.g. Master Chapter 5'), { target: { value: 'New goal' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Goal' }));

    await waitFor(() => expect(mocks.createGoal).toHaveBeenCalledTimes(1));
    expect(mocks.updateGoal).not.toHaveBeenCalled();
    expect(mocks.get).not.toHaveBeenCalled();
  });
});
