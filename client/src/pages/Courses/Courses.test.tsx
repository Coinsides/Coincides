import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CourseWithRecentNote } from '@/stores/courseStore';
import CoursesPage from './Courses';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  deleteCourse: vi.fn(),
  openModal: vi.fn(),
  addToast: vi.fn(),
  projectDeleteDialog: vi.fn(),
  courseState: {
    courses: [] as unknown[],
    deleteCourse: vi.fn(),
  },
  uiState: {
    modal: null as null | { type: string },
    openModal: vi.fn(),
    addToast: vi.fn(),
  },
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('@/stores/courseStore', () => ({
  useCourseStore: (selector: (state: typeof mocks.courseState) => unknown) => selector(mocks.courseState),
}));

vi.mock('@/stores/uiStore', () => ({
  useUIStore: (selector: (state: typeof mocks.uiState) => unknown) => selector(mocks.uiState),
}));

vi.mock('./ProjectDeleteDialog', () => ({
  ProjectDeleteDialog: (props: unknown) => {
    mocks.projectDeleteDialog(props);
    return null;
  },
}));

const recentCourse: CourseWithRecentNote = {
  id: 'course-1',
  user_id: 'user-1',
  name: 'Linear Algebra',
  code: null,
  color: '#6366f1',
  weight: 3,
  description: 'Legacy course description',
  semester: '2026 Fall',
  created_at: '2026-08-01T12:00:00.000Z',
  updated_at: '2026-08-29T12:00:00.000Z',
  recent_note: {
    id: 'note-recent',
    title: 'Matrix inverses',
    updated_at: '2026-08-29T13:00:00.000Z',
    excerpt: 'First line from the note\nSecond line from the note',
  },
};

const emptyCourse: CourseWithRecentNote = {
  ...recentCourse,
  id: 'course-empty',
  name: 'Empty Research Project',
  description: null,
  recent_note: null,
};

function renderCourses(courses: CourseWithRecentNote[]) {
  mocks.courseState.courses = courses;
  return render(<CoursesPage />);
}

function getProjectCard(course: CourseWithRecentNote): HTMLElement {
  const byTestId = screen.queryByTestId(`project-card-${course.id}`);
  if (byTestId) return byTestId;
  const title = screen.getByText(course.name);
  const currentCard = title.parentElement?.parentElement;
  if (!currentCard) throw new Error(`Could not resolve the card for ${course.name}`);
  return currentCard;
}

describe('Project life-trace cards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-29T16:00:00.000Z'));
    mocks.courseState.courses = [];
    mocks.courseState.deleteCourse = mocks.deleteCourse;
    mocks.uiState.modal = null;
    mocks.uiState.openModal = mocks.openModal;
    mocks.uiState.addToast = mocks.addToast;
    mocks.deleteCourse.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('K-1 renders the newest note title', () => {
    renderCourses([recentCourse]);
    const card = getProjectCard(recentCourse);

    expect(within(card).getByText('Matrix inverses')).toBeTruthy();
  });

  it('K-1 renders relative time for the newest note', () => {
    renderCourses([recentCourse]);
    const card = getProjectCard(recentCourse);

    expect(within(card).getByText('Today')).toBeTruthy();
  });

  it('K-1 opens the newest note from the Continue row', () => {
    renderCourses([recentCourse]);
    const card = getProjectCard(recentCourse);

    fireEvent.click(within(card).getByRole('button', { name: 'Continue · Matrix inverses' }));
    expect(mocks.navigate).toHaveBeenCalledWith('/notes/note-recent');
  });

  it('K-2a renders a non-empty note excerpt', () => {
    renderCourses([recentCourse]);
    const card = getProjectCard(recentCourse);

    expect(within(card).getByTestId('project-card-excerpt').textContent)
      .toContain('First line from the note');
  });

  it('K-2b renders neither an excerpt shell nor the legacy description when excerpt is empty', () => {
    const courseWithEmptyExcerpt: CourseWithRecentNote = {
      ...recentCourse,
      recent_note: { ...recentCourse.recent_note!, excerpt: '   ' },
    };
    renderCourses([courseWithEmptyExcerpt]);
    const card = getProjectCard(courseWithEmptyExcerpt);

    expect(within(card).queryByText('Legacy course description')).toBeNull();
    expect(within(card).queryByTestId('project-card-excerpt')).toBeNull();
  });

  it('K-5 renders the per-card empty-project state and opens Project detail', () => {
    renderCourses([emptyCourse]);
    const card = getProjectCard(emptyCourse);

    const emptyAction = within(card).getByRole('button', {
      name: 'Empty project — Drop in a source to begin',
    });
    fireEvent.click(emptyAction);
    expect(mocks.navigate).toHaveBeenCalledWith('/projects/course-empty');
  });

  it('omits the entire code label when a Project has no code', () => {
    renderCourses([recentCourse]);
    const card = getProjectCard(recentCourse);

    expect(within(card).queryByText(/No code/)).toBeNull();
    expect(within(card).getByText('2026 Fall')).toBeTruthy();
  });

  it('K-3a renders no priority weight badge on the Project card', () => {
    renderCourses([recentCourse]);
    const card = getProjectCard(recentCourse);

    expect(within(card).getByText('Linear Algebra')).toBeTruthy();
    expect(within(card).queryByText('High')).toBeNull();
  });

  it('K-4 opens the shared Project menu from the card context-menu entry', () => {
    renderCourses([recentCourse]);
    const card = getProjectCard(recentCourse);

    fireEvent.contextMenu(card);

    expect(screen.getByRole('menu')).toBeTruthy();
  });

  it('K-4 opens the shared Project menu from the ellipsis entry', () => {
    renderCourses([recentCourse]);
    const card = getProjectCard(recentCourse);

    fireEvent.click(within(card).getByRole('button', {
      name: 'More actions for Linear Algebra',
    }));

    expect(screen.getByRole('menu')).toBeTruthy();
  });

  it('K-4 Open menu item calls the existing Project-open handler', () => {
    renderCourses([recentCourse]);
    const card = getProjectCard(recentCourse);

    fireEvent.click(within(card).getByRole('button', {
      name: 'More actions for Linear Algebra',
    }));
    fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Open' }));

    expect(mocks.navigate).toHaveBeenCalledWith('/projects/course-1');
  });

  it('K-4 Sources menu item calls the existing Project Sources handler', () => {
    renderCourses([recentCourse]);
    const card = getProjectCard(recentCourse);

    fireEvent.click(within(card).getByRole('button', {
      name: 'More actions for Linear Algebra',
    }));
    fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Sources' }));

    expect(mocks.navigate).toHaveBeenCalledWith('/projects/course-1?focus=sources');
  });

  it('K-4 Tags menu item calls the existing Tag manager handler', () => {
    renderCourses([recentCourse]);
    const card = getProjectCard(recentCourse);

    fireEvent.click(within(card).getByRole('button', {
      name: 'More actions for Linear Algebra',
    }));
    fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Tags' }));

    expect(mocks.openModal).toHaveBeenCalledWith('tag-group-manager', {
      courseId: 'course-1',
      courseName: 'Linear Algebra',
    });
  });

  it('K-4 Edit menu item calls the existing Project-edit handler', () => {
    renderCourses([recentCourse]);
    const card = getProjectCard(recentCourse);

    fireEvent.click(within(card).getByRole('button', {
      name: 'More actions for Linear Algebra',
    }));
    fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Edit' }));

    expect(mocks.openModal).toHaveBeenCalledWith('course-edit', { course: recentCourse });
  });

  it('K-4 Move to Trash menu item calls the existing delete-dialog handler', () => {
    renderCourses([recentCourse]);
    const card = getProjectCard(recentCourse);

    fireEvent.click(within(card).getByRole('button', {
      name: 'More actions for Linear Algebra',
    }));
    fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', {
      name: 'Move to Trash',
    }));

    expect(mocks.projectDeleteDialog).toHaveBeenCalledWith(expect.objectContaining({
      projectId: 'course-1',
      projectName: 'Linear Algebra',
    }));
  });

  it('K-4 renders no legacy Sources toolbar action before the menu opens', () => {
    renderCourses([recentCourse]);
    const card = getProjectCard(recentCourse);

    expect(screen.queryByRole('menu')).toBeNull();
    expect(within(card).queryByRole('button', { name: 'Sources' })).toBeNull();
  });

  it('K-4 closes the Project menu on Escape and restores focus to the ellipsis', () => {
    renderCourses([recentCourse]);
    const card = getProjectCard(recentCourse);
    const trigger = within(card).getByRole('button', {
      name: 'More actions for Linear Algebra',
    });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole('menu')).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('K-4 closes the Project menu on an outside pointer down', () => {
    renderCourses([recentCourse]);
    const card = getProjectCard(recentCourse);

    fireEvent.click(within(card).getByRole('button', {
      name: 'More actions for Linear Algebra',
    }));
    expect(screen.getByRole('menu')).toBeTruthy();

    fireEvent.pointerDown(document.body);

    expect(screen.queryByRole('menu')).toBeNull();
  });
});
