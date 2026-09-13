import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import DesignStudio from './DesignStudio';

vi.mock('./SuiteDrawer', () => ({ default: ({ search }: { search: string }) => <div data-testid="suite-drawer">{search}</div> }));
vi.mock('./PaletteDrawer', () => ({ default: ({ search }: { search: string }) => <div data-testid="palette-drawer">{search}</div> }));
vi.mock('@/stores/authStore', () => ({ useAuthStore: (selector: (state: unknown) => unknown) => selector({
  token: 'ds3', user: { id: 'ds3', onboarding_completed: true }, loadUser: vi.fn(),
}) }));
vi.mock('@/stores/courseStore', () => ({ useCourseStore: (selector: (state: unknown) => unknown) => selector({ courses: [], fetchCourses: vi.fn() }) }));
vi.mock('@/stores/tagStore', () => ({ useTagStore: (selector: (state: unknown) => unknown) => selector({ fetchTags: vi.fn() }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh', changeLanguage: vi.fn() } }) }));
// Keep the production App route and navigator. Unrelated destinations and overlays
// are leaves, so this navigation contract does not mount their API consumers.
vi.mock('@/pages/Auth/Login', () => ({ default: () => null }));
vi.mock('@/pages/Auth/Register', () => ({ default: () => null }));
vi.mock('@/pages/DailyBrief/DailyBrief', () => ({ default: () => null }));
vi.mock('@/pages/Calendar/Calendar', () => ({ default: () => null }));
vi.mock('@/pages/Goals/Goals', () => ({ default: () => null }));
vi.mock('@/pages/Courses/Courses', () => ({ default: () => null }));
vi.mock('@/pages/Courses/CourseDetail', () => ({ default: () => null }));
vi.mock('@/pages/Notes/NoteDetail', () => ({ default: () => null }));
vi.mock('@/pages/Boards/BoardList', () => ({ default: () => null }));
vi.mock('@/pages/Boards/BoardPage', () => ({ default: () => null }));
vi.mock('@/pages/Sources/SourceLibrary', () => ({ default: () => null }));
vi.mock('@/pages/GroupGallery/GroupGallery', () => ({ default: () => null }));
vi.mock('@/pages/GroupGallery/SingleContentGroupEditor', () => ({ default: () => null }));
vi.mock('@/pages/Settings/Settings', () => ({ default: () => null }));
vi.mock('@/pages/AgentMemories/AgentMemories', () => ({ default: () => null }));
vi.mock('@/pages/ToolReceipts/ToolReceipts', () => ({ default: () => null }));
vi.mock('@/pages/Decks/Decks', () => ({ default: () => null }));
vi.mock('@/pages/Decks/DeckDetail', () => ({ default: () => null }));
vi.mock('@/pages/Review/Review', () => ({ default: () => null }));
vi.mock('@/pages/Statistics/Statistics', () => ({ default: () => null }));
vi.mock('@/components/TaskModal/TaskModal', () => ({ default: () => null }));
vi.mock('@/components/CourseModal/CourseModal', () => ({ default: () => null }));
vi.mock('@/components/GoalModal/GoalModal', () => ({ default: () => null }));
vi.mock('@/components/DeckModal/DeckModal', () => ({ default: () => null }));
vi.mock('@/components/CardModal/CardModal', () => ({ default: () => null }));
vi.mock('@/components/CardViewModal/CardViewModal', () => ({ default: () => null }));
vi.mock('@/components/TaskViewModal/TaskViewModal', () => ({ default: () => null }));
vi.mock('@/components/AgentPanel/AgentPanel', () => ({ default: () => null }));
vi.mock('@/components/ShortcutsPanel/ShortcutsPanel', () => ({ default: () => null }));
vi.mock('@/components/Toast/Toast', () => ({ default: () => null }));
vi.mock('@/components/Onboarding/Onboarding', () => ({ default: () => null }));

function openStudio(path: string) {
  const router = createMemoryRouter([{ path: '/design-studio/:drawer?', element: <DesignStudio /> }], { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

describe('Design studio shell', () => {
  it('enters through the real App navigator and switches all five URL drawers', async () => {
    window.location.hash = '#/projects';
    const { default: App } = await import('@/App');
    render(<App />);
    const entry = screen.getByRole('link', { name: '设计室' });
    expect(entry.getAttribute('href')).toBe('#/design-studio');
    fireEvent.click(entry);
    await screen.findByRole('heading', { name: '设计室' });
    expect(screen.getByTestId('suite-drawer')).toBeTruthy();
    const nav = screen.getByRole('navigation', { name: '设计室抽屉' });
    expect(within(nav).getAllByRole('link').map((link) => link.textContent)).toEqual(['外观套装', '调色板', '模板库', '部件', '贴纸']);
    for (const [label, path] of [['调色板', 'palette'], ['模板库', 'templates'], ['部件', 'components'], ['贴纸', 'stickers'], ['外观套装', 'suites']]) {
      fireEvent.click(within(nav).getByRole('link', { name: label }));
      await screen.findByRole('heading', { name: label });
      expect(window.location.hash).toBe(`#/design-studio/${path}`);
      expect(within(nav).getByRole('link', { name: label }).getAttribute('aria-current')).toBe('page');
    }
  });

  it('opens palette by deep link and resets drawer-local search when switching', async () => {
    const router = openStudio('/design-studio/palette');
    fireEvent.change(screen.getByRole('searchbox', { name: '搜索资产' }), { target: { value: '杏黄' } });
    expect(screen.getByTestId('palette-drawer').textContent).toBe('杏黄');
    await act(async () => { await router.navigate('/design-studio/suites'); });
    expect(screen.getByTestId('suite-drawer').textContent).toBe('');
  });

  it.each([
    ['templates', '收纳不同用途的纸张与版式模板。'],
    ['components', '收纳可组合的页面部件与样式。'],
    ['stickers', '收纳可重复使用的装饰件与贴纸集合。'],
  ])('keeps %s as an explanatory placeholder without an inventory implementation', (drawer, description) => {
    openStudio(`/design-studio/${drawer}`);
    expect(screen.getByText(description)).toBeTruthy();
    expect(screen.getByText('V14 随批实装')).toBeTruthy();
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.queryByTestId('suite-drawer')).toBeNull();
    expect(screen.queryByTestId('palette-drawer')).toBeNull();
  });

  it('falls back from an unknown drawer to the default suite gallery', async () => {
    const router = openStudio('/design-studio/missing');
    await screen.findByTestId('suite-drawer');
    expect(router.state.location.pathname).toBe('/design-studio');
    expect(screen.getByRole('link', { name: '外观套装' }).getAttribute('aria-current')).toBe('page');
  });
});
