import { StrictMode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUIStore } from '@/stores/uiStore';
import AppLayout from './AppLayout';

const mocks = vi.hoisted(() => ({
  loadUser: vi.fn(),
  fetchCourses: vi.fn(),
  fetchTags: vi.fn(),
  changeLanguage: vi.fn(),
}));

vi.mock('@/stores/uiStore', async () => {
  const { create } = await import('zustand');
  interface FixtureUIState {
    sidebarOpen: boolean;
    toggleSidebar: () => void;
    setSidebarOpen: (open: boolean) => void;
    openModal: () => void;
    toggleAgentPanel: () => void;
    toggleShortcutsPanel: () => void;
  }
  return {
    useUIStore: create<FixtureUIState>((set, get) => ({
      sidebarOpen: true,
      toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      openModal: vi.fn(),
      toggleAgentPanel: vi.fn(),
      toggleShortcutsPanel: vi.fn(),
    })),
  };
});

vi.mock('@/stores/courseStore', () => ({
  useCourseStore: (selector: (state: unknown) => unknown) => selector({
    courses: [],
    fetchCourses: mocks.fetchCourses,
  }),
}));

vi.mock('@/stores/tagStore', () => ({
  useTagStore: (selector: (state: unknown) => unknown) => selector({ fetchTags: mocks.fetchTags }),
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) => selector({
    user: { onboarding_completed: true },
    loadUser: mocks.loadUser,
  }),
}));

vi.mock('@/components/Onboarding/Onboarding', () => ({ default: () => null }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: mocks.changeLanguage },
  }),
}));

function renderLayout(initialPath = '/boards', strictMode = false) {
  const router = createMemoryRouter([{
    element: <AppLayout />,
    children: [{ path: '*', element: <div>Fixture content</div> }],
  }], { initialEntries: [initialPath] });
  const rendered = render(strictMode
    ? <StrictMode><RouterProvider router={router} /></StrictMode>
    : <RouterProvider router={router} />);
  return { ...rendered, router };
}

function expectNavigator(open: boolean) {
  expect(useUIStore.getState().sidebarOpen).toBe(open);
  const button = screen.getByRole('button', { name: open ? 'Collapse navigator' : 'Expand navigator' });
  expect(button.getAttribute('aria-expanded')).toBe(String(open));
}

describe('AppLayout board navigator session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({ sidebarOpen: true });
  });

  it('collapses on board entry and restores the expanded navigator on leaving', async () => {
    const { router } = renderLayout();
    expectNavigator(true);

    await act(async () => { await router.navigate('/boards/board-a'); });
    expectNavigator(false);

    await act(async () => { await router.navigate('/projects'); });
    expectNavigator(true);
    expect(mocks.loadUser).toHaveBeenCalledTimes(1);
    expect(mocks.fetchCourses).toHaveBeenCalledTimes(1);
    expect(mocks.fetchTags).toHaveBeenCalledTimes(1);
  });

  it('respects manual toggles across rerenders and same-board query, hash, or slash changes', async () => {
    const { router, rerender } = renderLayout('/boards/board-a');
    expectNavigator(false);
    fireEvent.click(screen.getByRole('button', { name: 'Expand navigator' }));
    expectNavigator(true);

    rerender(<RouterProvider router={router} />);
    expectNavigator(true);
    await act(async () => { await router.navigate('/boards/board-a?selection=note-a#notes'); });
    expectNavigator(true);
    await act(async () => { await router.navigate('/boards/board-a/'); });
    expectNavigator(true);

    fireEvent.click(screen.getByRole('button', { name: 'Collapse navigator' }));
    await act(async () => { await router.navigate('/boards/board-a?selection=note-b'); });
    expectNavigator(false);
  });

  it('collapses on each distinct board and restores the original preference after the board chain', async () => {
    const { router } = renderLayout('/boards/board-a');
    fireEvent.click(screen.getByRole('button', { name: 'Expand navigator' }));
    await act(async () => { await router.navigate('/boards/board-b'); });
    expectNavigator(false);
    fireEvent.click(screen.getByRole('button', { name: 'Expand navigator' }));
    await act(async () => { await router.navigate('/boards/board-a'); });
    expectNavigator(false);
    await act(async () => { await router.navigate('/boards'); });
    expectNavigator(true);
  });

  it('restores an originally collapsed navigator after manual expansion and board changes', async () => {
    useUIStore.setState({ sidebarOpen: false });
    const { router } = renderLayout('/projects');
    await act(async () => { await router.navigate('/boards/board-a'); });
    expectNavigator(false);
    fireEvent.click(screen.getByRole('button', { name: 'Expand navigator' }));
    await act(async () => { await router.navigate('/boards/board-b'); });
    expectNavigator(false);
    fireEvent.click(screen.getByRole('button', { name: 'Expand navigator' }));
    await act(async () => { await router.navigate('/boards'); });
    expectNavigator(false);
  });

  it('captures a fresh outside-board preference on re-entry and restores on unmount', async () => {
    const { router, unmount } = renderLayout('/boards/board-a');
    await act(async () => { await router.navigate('/boards'); });
    expectNavigator(true);
    fireEvent.click(screen.getByRole('button', { name: 'Collapse navigator' }));
    await act(async () => { await router.navigate('/boards/board-a'); });
    fireEvent.click(screen.getByRole('button', { name: 'Expand navigator' }));
    unmount();
    expect(useUIStore.getState().sidebarOpen).toBe(false);
  });

  it('preserves the original preference through StrictMode effect replay', async () => {
    const { router } = renderLayout('/boards/board-a', true);
    expectNavigator(false);
    fireEvent.click(screen.getByRole('button', { name: 'Expand navigator' }));
    expectNavigator(true);
    await act(async () => { await router.navigate('/boards'); });
    expectNavigator(true);
  });
});
