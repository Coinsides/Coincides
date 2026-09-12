import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Course } from '@shared/types';
import CourseModal from './CourseModal';

const mocks = vi.hoisted(() => ({
  addToast: vi.fn(),
  closeModal: vi.fn(),
  createCourse: vi.fn(),
  updateCourse: vi.fn(),
  uiState: {
    modal: null as { type: string; data?: unknown } | null,
  },
}));

vi.mock('@/stores/uiStore', () => ({
  useUIStore: (selector: (state: {
    modal: typeof mocks.uiState.modal;
    closeModal: typeof mocks.closeModal;
    addToast: typeof mocks.addToast;
  }) => unknown) => selector({
    modal: mocks.uiState.modal,
    closeModal: mocks.closeModal,
    addToast: mocks.addToast,
  }),
}));

vi.mock('@/stores/courseStore', () => ({
  useCourseStore: () => ({
    createCourse: mocks.createCourse,
    updateCourse: mocks.updateCourse,
  }),
}));

const existingCourse = {
  id: 'course-high',
  user_id: 'user-1',
  name: 'Linear Algebra',
  code: 'MATH201',
  color: '#6366f1',
  weight: 3,
  description: 'Proofs and problem sets',
  semester: '2026 Fall',
  created_at: '2026-08-01T12:00:00.000Z',
  updated_at: '2026-08-28T12:00:00.000Z',
};

async function submitEditedCourse() {
  render(<CourseModal />);
  fireEvent.change(
    screen.getByPlaceholderText('e.g. Linear Algebra, PI-046 Research, Case Notes'),
    { target: { value: 'Linear Algebra II' } },
  );
  fireEvent.click(screen.getByRole('button', { name: 'Update' }));
  await waitFor(() => expect(mocks.updateCourse).toHaveBeenCalledTimes(1));
  return mocks.updateCourse.mock.calls[0][1] as Record<string, unknown>;
}

describe('CourseModal project weight retirement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.uiState.modal = {
      type: 'course-edit',
      data: { course: existingCourse },
    };
    mocks.createCourse.mockResolvedValue(existingCourse);
    mocks.updateCourse.mockResolvedValue(existingCourse);
  });

  it('K-3b does not render the Priority Weight control', () => {
    render(<CourseModal />);

    expect(screen.getByText('Edit Project')).toBeTruthy();
    expect(screen.queryByText('Priority Weight')).toBeNull();
  });

  it('K-3c submits an edit patch without its own weight field', async () => {
    const submittedPatch = await submitEditedCourse();

    expect(Object.prototype.hasOwnProperty.call(submittedPatch, 'weight')).toBe(false);
  });

  it('K-3c keeps the existing weight when the edit patch is merged', async () => {
    const submittedPatch = await submitEditedCourse();

    expect({ ...existingCourse, ...submittedPatch }.weight).toBe(existingCourse.weight);
  });

  it('publishes the saved project so reopening an edit preserves its persisted skin', async () => {
    let detailCourse: Course = { ...existingCourse, skin: null };
    const onUpdated = vi.fn((updated: Course) => { detailCourse = updated; });
    mocks.uiState.modal = { type: 'course-edit', data: { course: detailCourse, onUpdated } };
    const savedCourse: Course = {
      ...detailCourse,
      skin: { preset: 'warm-paper' },
      updated_at: '2026-09-11T12:00:00.000Z',
    };
    mocks.updateCourse.mockResolvedValueOnce(savedCourse);

    const firstEdit = render(<CourseModal />);
    fireEvent.change(screen.getByRole('combobox', { name: '纸面预设' }), { target: { value: 'warm-paper' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() => expect(onUpdated).toHaveBeenCalledWith(savedCourse));
    expect(detailCourse).toBe(savedCourse);
    expect(onUpdated.mock.invocationCallOrder[0]).toBeLessThan(mocks.closeModal.mock.invocationCallOrder[0]);
    firstEdit.unmount();

    mocks.uiState.modal = { type: 'course-edit', data: { course: detailCourse, onUpdated } };
    mocks.updateCourse.mockResolvedValueOnce({ ...savedCourse, name: 'Linear Algebra II' });
    render(<CourseModal />);
    expect((screen.getByRole('combobox', { name: '纸面预设' }) as HTMLSelectElement).value).toBe('warm-paper');
    fireEvent.change(screen.getByPlaceholderText('e.g. Linear Algebra, PI-046 Research, Case Notes'), {
      target: { value: 'Linear Algebra II' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() => expect(onUpdated).toHaveBeenCalledTimes(2));
    expect(mocks.updateCourse.mock.calls[1][1]).toMatchObject({
      name: 'Linear Algebra II', skin: { preset: 'warm-paper' },
    });
    expect(detailCourse.skin).toEqual({ preset: 'warm-paper' });
  });
});
