import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Course } from '@shared/types';
import CourseModal from './CourseModal';
import { usePaletteStore } from '@/hooks/usePaletteColors';

vi.mock('@/services/api', () => ({
  getToken: () => null, setToken: vi.fn(),
  default: { get: vi.fn(async (url: string) => {
    if (url === '/palette-colors') return { data: mocks.paletteColors };
    throw new Error(`Unexpected synthetic GET: ${url}`);
  }), delete: (url: string) => mocks.deletePaletteColor(url) },
}));

const mocks = vi.hoisted(() => ({
  addToast: vi.fn(),
  closeModal: vi.fn(),
  createCourse: vi.fn(),
  updateCourse: vi.fn(),
  paletteColors: [] as Array<{ id: string; user_id: string; name: string; value: string; origin: 'user'; sort: number; created_at: string }>,
  deletePaletteColor: vi.fn(),
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
    mocks.paletteColors = [];
    usePaletteStore.setState({ owner: undefined, colors: [], values: {}, detached: {}, loaded: false, loading: false, error: null });
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

  it('submitting a project after deleting another token color retains its detached hex and cannot restore the reference', async () => {
    const id = '14000000-0000-4000-8000-000000000017';
    mocks.paletteColors = [{ id, user_id: 'user-1', name: '自选/雾', value: '#aBcDeF80', origin: 'user', sort: 1, created_at: '2026-09-13' }];
    const skin: Course['skin'] = { preset: 'warm-paper', overrides: { paper: `palette:${id}`, accent: '#112233' } };
    mocks.uiState.modal = { type: 'course-edit', data: { course: { ...existingCourse, skin } } };
    let finishDelete!: (value: unknown) => void;
    mocks.deletePaletteColor.mockReturnValue(new Promise((resolve) => { finishDelete = resolve; }));
    render(<CourseModal />);
    await waitFor(() => expect(usePaletteStore.getState().colors).toHaveLength(1));
    fireEvent.click(screen.getByText('高级颜色'));
    fireEvent.click(screen.getByRole('button', { name: '强调' }));
    fireEvent.click(screen.getByRole('button', { name: '编辑' }));
    fireEvent.click(screen.getByRole('button', { name: '删除自选/雾' }));
    await waitFor(() => expect(mocks.deletePaletteColor).toHaveBeenCalledWith(`/palette-colors/${id}`));
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));
    expect(mocks.updateCourse).not.toHaveBeenCalled();
    await act(async () => { finishDelete({ data: { id, value: '#aBcDeF80' } }); });
    await waitFor(() => expect(mocks.updateCourse).toHaveBeenCalledTimes(1));
    expect(mocks.updateCourse).toHaveBeenCalledWith(existingCourse.id, expect.objectContaining({
      skin: { preset: 'warm-paper', overrides: { paper: '#aBcDeF80', accent: '#112233' } },
    }));
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
