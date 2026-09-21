import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import TemplateDrawer from './TemplateDrawer';

vi.mock('@/services/api', () => ({ getToken: () => null, setToken: vi.fn(), default: { get: vi.fn(() => { throw new Error('No template requests'); }) } }));

describe('T7 factory template drawer', () => {
  it('renders all three live thumbnails and no application controls or metadata writers', () => {
    const view = render(<MemoryRouter><TemplateDrawer search="" /></MemoryRouter>);
    const list = screen.getByRole('list', { name: '出厂模板' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('手册式')).toBeTruthy(); expect(screen.getByText('简明式')).toBeTruthy();
    expect(screen.getByText('手册式装订')).toBeTruthy();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
    const previews = view.container.querySelectorAll('[data-template-preview]');
    expect(previews).toHaveLength(3);
    for (const preview of [...previews].slice(0, 2)) {
      expect(preview.querySelector('[data-note-truth-field="title"]')?.textContent).toBe('笔记题名');
      expect(preview.querySelector('[data-note-truth-field="description"]')?.textContent).toBe('笔记述名');
    }
    expect(previews[2].querySelector('[data-page-frame-slot-position="header-center"]')?.textContent).toBe('笔记题名');
    expect(previews[2].querySelector('[data-page-frame-slot="page-number"]')?.textContent).toBe('第 1 纸');
    fireEvent.click(screen.getByText('手册式'));
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('filters by name and keeps the empty result within the same inventory group', () => {
    const view = render(<MemoryRouter><TemplateDrawer search="简明" /></MemoryRouter>);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.queryByText('手册式装订')).toBeNull();
    view.rerender(<MemoryRouter><TemplateDrawer search="无此模板" /></MemoryRouter>);
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(screen.getByText('没有匹配的模板。')).toBeTruthy();
  });
});
