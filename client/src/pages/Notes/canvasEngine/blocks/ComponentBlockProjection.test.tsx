import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ComponentBlockProjection } from './ComponentBlockProjection';
import { SONG_TIMELINE } from '../fixtures/songTimeline';
import { SONG_REVENUE_CHART } from '../fixtures/songRevenueChart';
import type { ComponentBlockPayload } from '../componentBlockService';
import css from './ComponentBlockProjection.module.css?raw';

afterEach(cleanup);
const block = (payload: ComponentBlockPayload) => ({ block_type: 'component' as const, content_json: { ...payload } });

describe('built-in component projection', () => {
  it('renders the thirteen-entry 960–997 positive timeline with local disclosure state', () => {
    const before = JSON.stringify(SONG_TIMELINE);
    const view = render(<ComponentBlockProjection block={block(SONG_TIMELINE)} />);
    const list = screen.getByRole('list', { name: '宋初年表 · 960—997' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(13);
    expect(screen.getByText('960')).toBeTruthy(); expect(screen.getByText('997')).toBeTruthy();
    const detail = view.container.querySelector('details')!;
    expect(detail.open).toBe(false);
    fireEvent.click(detail.querySelector('summary')!);
    expect(detail.open).toBe(true);
    expect(JSON.stringify(SONG_TIMELINE)).toBe(before);
    expect(view.container.querySelector('textarea')).toBeNull();
  });

  it('keeps timeline print initial content and collapsed geometry identical to the reading projection', () => {
    const view = render(<ComponentBlockProjection block={block(SONG_TIMELINE)} />);
    const initial = screen.getByRole('list').innerHTML;
    view.rerender(<ComponentBlockProjection block={block(SONG_TIMELINE)} print style={{ width: 280 }} />);
    expect(screen.getByRole('list').innerHTML).toBe(initial);
    expect((view.container.firstElementChild as HTMLElement).style.width).toBe('280px');
    expect(view.container.querySelectorAll('details[open]')).toHaveLength(0);
  });

  it('renders a plain entry without an empty disclosure affordance', () => {
    const view = render(<ComponentBlockProjection block={block({ component_kind: 'timeline', params: { entries: [{ year: '960', label: '建国' }] } })} />);
    expect(view.container.querySelector('details')).toBeNull();
    expect(screen.getByText('建国')).toBeTruthy();
  });

  it('renders the three-period two-series positive revenue chart and every data value', () => {
    const view = render(<ComponentBlockProjection block={block(SONG_REVENUE_CHART)} />);
    expect(screen.getByRole('img', { name: '岁入的换血' })).toBeTruthy();
    expect(view.container.querySelectorAll('rect')).toHaveLength(6);
    expect(view.container.querySelectorAll('[data-chart-x-label]')).toHaveLength(3);
    expect(within(screen.getByRole('list', { name: 'Chart legend' })).getAllByRole('listitem')).toHaveLength(2);
    expect(view.container.querySelectorAll('[data-chart-value]')).toHaveLength(6);
    expect(screen.getByText('财政收入（教学示意单位）')).toBeTruthy();
    expect(screen.getByRole('region').tabIndex).toBe(0);
  });

  it('shares the exact axis between grouped bars and lines and retains chart data when printing', () => {
    const view = render(<ComponentBlockProjection block={block(SONG_REVENUE_CHART)} />);
    const axis = view.container.querySelector('[data-chart-axis]')!.innerHTML;
    view.rerender(<ComponentBlockProjection block={block({ ...SONG_REVENUE_CHART, component_kind: 'chart_line' })} />);
    expect(view.container.querySelector('[data-chart-axis]')!.innerHTML).toBe(axis);
    expect(view.container.querySelectorAll('polyline')).toHaveLength(2);
    expect(view.container.querySelectorAll('circle')).toHaveLength(6);
    expect(view.container.querySelectorAll('rect')).toHaveLength(0);
    const lineContent = screen.getByRole('img').innerHTML;
    view.rerender(<ComponentBlockProjection block={block({ ...SONG_REVENUE_CHART, component_kind: 'chart_line' })} print />);
    expect(screen.getByRole('img').innerHTML).toBe(lineContent);
  });

  it.each([[[-4, 0, 8]], [[0, 0, 0]], [[-9, -3, -1]], [[-Number.MAX_VALUE, 0, Number.MAX_VALUE]], [[0, Number.MIN_VALUE, 0]]])(
    'draws finite SVG coordinates and nonnegative bar heights for the numeric range %j', (values) => {
      const view = render(<ComponentBlockProjection block={block({ component_kind: 'chart_bar', params: {
        x_labels: ['A', 'B', 'C'], series: [{ name: 'Values', values }],
      } })} />);
      const baseline = Number(view.container.querySelector('[data-chart-baseline]')!.getAttribute('y1'));
      expect(baseline).toBeGreaterThanOrEqual(32); expect(baseline).toBeLessThanOrEqual(256);
      for (const node of view.container.querySelectorAll('rect, circle, line, text')) {
        for (const attribute of ['x', 'y', 'x1', 'x2', 'y1', 'y2', 'height', 'width']) {
          if (node.hasAttribute(attribute)) expect(Number.isFinite(Number(node.getAttribute(attribute)))).toBe(true);
        }
      }
      for (const rect of view.container.querySelectorAll('rect')) expect(Number(rect.getAttribute('height'))).toBeGreaterThanOrEqual(0);
      expect(view.container.querySelectorAll('[data-chart-value]')).toHaveLength(3);
      const firstLabelY = Number(view.container.querySelector('[data-chart-x-label]')!.getAttribute('y'));
      for (const label of view.container.querySelectorAll('[data-chart-value] text')) {
        expect(firstLabelY - Number(label.getAttribute('y'))).toBeGreaterThanOrEqual(24);
      }
    },
  );

  it('wraps long x labels within three visible lines, retaining the complete label in accessible text', () => {
    const label = '北宋中期财政收入分类说明'.repeat(20);
    const view = render(<ComponentBlockProjection block={block({ component_kind: 'chart_line', params: {
      x_labels: [label, '短标签'], series: [{ name: 'First', values: [1, 1] }, { name: 'Second', values: [1, 1] }],
    } })} />);
    const lines = view.container.querySelectorAll('[data-chart-x-label="0"] tspan');
    expect(lines).toHaveLength(3); expect(lines[2].textContent).toContain('…');
    expect(view.container.querySelector('desc')!.textContent).toContain(label);
    const numbers = view.container.querySelectorAll('[data-chart-value="1"] text');
    expect(numbers[0].getAttribute('x')).not.toBe(numbers[2].getAttribute('x'));
    expect(numbers).toHaveLength(4);
  });

  it('renders an unknown kind as a named placeholder and reports unreadable known content', () => {
    const view = render(<ComponentBlockProjection block={block({ component_kind: 'future_component', params: {} })} />);
    expect(screen.getByRole('status').textContent).toContain('future_component');
    expect(screen.getByRole('status').textContent).toContain('未注册组件');
    view.rerender(<ComponentBlockProjection block={block({ component_kind: 'timeline', params: {} })} />);
    expect(screen.getByRole('status').textContent).toContain('could not be read');
  });

  it('uses skin accent and neutral tokens, hairlines and contained scroll/print styles', () => {
    expect(css).toContain('var(--sk-accent'); expect(css).toContain('var(--sk-ink-muted');
    expect(css).toContain('var(--sk-hairline'); expect(css).toContain('overflow-x: auto');
    expect(css).toContain('stroke-dasharray'); expect(css).toContain('break-inside: avoid');
    expect(css).not.toMatch(/#[\da-f]{3,8}\b/i);
  });
});
