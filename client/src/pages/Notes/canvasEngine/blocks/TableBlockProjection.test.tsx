import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { TableBlockProjection } from './TableBlockProjection';
import { XINING_REFORMS_TABLE } from '../fixtures/xiningReformsTable';
import css from './TableBlockProjection.module.css?raw';

afterEach(cleanup);
const block = { block_type: 'table' as const, content_json: { ...XINING_REFORMS_TABLE } };

describe('table block projection', () => {
  it('renders nine-by-three Chinese data rows plus a header without an editor', () => {
    const view = render(<TableBlockProjection block={block} />);
    const table = screen.getByRole('table', { name: '熙宁新法表' });
    expect(within(table).getAllByRole('row')).toHaveLength(10);
    expect(within(table).getAllByRole('columnheader')).toHaveLength(3);
    expect(within(table).getAllByRole('cell')).toHaveLength(27);
    expect(screen.getByText('青苗法')).toBeTruthy();
    expect(screen.getByText('减少官养费用。', { exact: false })).toBeTruthy();
    expect(view.container.querySelector('textarea')).toBeNull();
    expect(screen.getByRole('region').tabIndex).toBe(0);
  });

  it('keeps print content identical and marks it for clipping to block width', () => {
    const view = render(<TableBlockProjection block={block} />);
    const tableContent = screen.getByRole('table').innerHTML;
    view.rerender(<TableBlockProjection block={block} print style={{ width: 240 }} />);
    expect(screen.getByRole('table').innerHTML).toBe(tableContent);
    const viewport = view.container.querySelector('[data-table-print-clip="true"]') as HTMLElement;
    expect(viewport.style.width).toBe('240px');
    expect(viewport.hasAttribute('tabindex')).toBe(false);
  });

  it('preserves plain text and cell newlines with no implicit header', () => {
    render(<TableBlockProjection block={{ block_type: 'table', content_json: { headers: [], rows: [['first\nsecond', '=A1+B1']] } }} />);
    expect(screen.queryByRole('columnheader')).toBeNull();
    expect(screen.getAllByRole('cell')[0].textContent).toBe('first\nsecond');
    expect(screen.getAllByRole('cell')[1].textContent).toBe('=A1+B1');
  });

  it('contains wide-table scrolling, print clipping and skin colours in the projection CSS', () => {
    expect(css).toContain('overflow-x: auto');
    expect(css).toContain('max-width: 100%');
    expect(css).toContain('.print { overflow: hidden; }');
    expect(css).toContain('@media print');
    expect(css).toContain('var(--document-font-size, 15px) * 0.85');
    expect(css).toContain('var(--sk-hairline');
    expect(css).toContain('nth-child(even)');
    expect(css).not.toMatch(/#[\da-f]{3,8}\b/i);
  });

  it('reports unreadable content instead of rendering a broken grid', () => {
    render(<TableBlockProjection block={{ block_type: 'table', content_json: {} }} />);
    expect(screen.getByRole('status').textContent).toContain('could not be read');
    expect(screen.queryByRole('table')).toBeNull();
  });
});
