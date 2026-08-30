import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
});
