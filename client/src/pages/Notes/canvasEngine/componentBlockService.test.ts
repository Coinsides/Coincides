import { describe, expect, it } from 'vitest';
import {
  BUILTIN_COMPONENT_KINDS, CHART_MAX_POINTS, CHART_MAX_SERIES, COMPONENT_MAX_CHARACTERS,
  TIMELINE_MAX_ENTRIES, cloneComponentBlockPayload, componentBlockPlainText, componentBlockValidationError,
  createDefaultComponentBlockPayload, estimateComponentBlockHeight, isChartComponentPayload,
  isTimelineComponentPayload, readComponentBlockPayload,
  type ComponentBlockPayload, type KnownChartComponentPayload, type KnownTimelineComponentPayload,
} from './componentBlockService';

const timeline = (): KnownTimelineComponentPayload => ({ component_kind: 'timeline', params: {
  title: '宋初年表', entries: [{ year: '960', label: '北宋建立', detail: '陈桥兵变后建宋' }],
} });
const chart = (): KnownChartComponentPayload => ({ component_kind: 'chart_bar', params: {
  title: '岁入的换血', y_label: '示意比例', x_labels: ['初期', '中期', '后期'],
  series: [{ name: '田赋', values: [70, 50, 30] }, { name: '工商收入', values: [30, 50, 70] }],
} });

describe('B2 component payloads follow the B1 data-backed block path', () => {
  it('declares exactly three built-ins with usable defaults', () => {
    expect(BUILTIN_COMPONENT_KINDS).toEqual(['timeline', 'chart_bar', 'chart_line']);
    for (const kind of BUILTIN_COMPONENT_KINDS) {
      const payload = createDefaultComponentBlockPayload(kind);
      expect(payload.component_kind).toBe(kind);
      expect(componentBlockValidationError(payload)).toBeNull();
    }
    expect(isTimelineComponentPayload(timeline())).toBe(true);
    expect(isChartComponentPayload(chart())).toBe(true);
  });

  it('reads only component blocks without converting them into TextFlow', () => {
    const payload = timeline();
    expect(readComponentBlockPayload({ block_type: 'component', content_json: payload })).toBe(payload);
    expect(readComponentBlockPayload({ block_type: 'paragraph', content_json: payload })).toBeNull();
    expect(readComponentBlockPayload({ block_type: 'component', content_json: { text: 'old' } })).toBeNull();
  });

  it('retains unknown kinds and opaque params for a stable placeholder', () => {
    const payload = { component_kind: 'future_kind', params: { title: 'Stored data', rows: [1, 2] } };
    expect(componentBlockValidationError(payload)).toBeNull();
    expect(readComponentBlockPayload({ block_type: 'component', content_json: payload })).toBe(payload);
    expect(componentBlockPlainText(payload)).toBe('future_kind\n未注册组件');
    expect(isTimelineComponentPayload(payload)).toBe(false);
    expect(isChartComponentPayload(payload)).toBe(false);
  });

  it.each([
    null, [], {}, { component_kind: '', params: {} }, { component_kind: '   ', params: {} },
    { component_kind: 'a'.repeat(129), params: {} }, { component_kind: 'timeline', params: [] },
    { component_kind: 'timeline', params: {}, presentation: {} },
  ])('rejects malformed envelopes: %j', (value) => {
    expect(componentBlockValidationError(value)).not.toBeNull();
  });

  it('enforces the 1–64 timeline count without truncating or reordering entries', () => {
    const payload = timeline();
    payload.params.entries = Array.from({ length: TIMELINE_MAX_ENTRIES }, (_, index) => ({ year: `${index}`, label: '事件' }));
    expect(componentBlockValidationError(payload)).toBeNull();
    payload.params.entries.push({ year: '65', label: '事件' });
    expect(componentBlockValidationError(payload)).not.toBeNull();
    payload.params.entries = [];
    expect(componentBlockValidationError(payload)).not.toBeNull();
  });

  it('keeps timeline fields plain text and fold state outside the payload', () => {
    for (const params of [
      { entries: [{ year: 960, label: '建立' }] }, { entries: [{ year: '960' }] },
      { entries: [{ year: '960', label: '建立', detail: null }] },
      { entries: [{ year: '960', label: '建立', expanded: true }] },
      { entries: [{ year: '', label: '' }], expanded: true }, { title: 1, entries: [] },
    ]) expect(componentBlockValidationError({ component_kind: 'timeline', params })).not.toBeNull();
    expect(componentBlockValidationError({ component_kind: 'timeline', params: { entries: [{ year: '', label: '' }] } })).toBeNull();
  });

  it.each(['chart_bar', 'chart_line'] as const)('enforces points and series limits for %s', (kind) => {
    const payload = chart();
    payload.component_kind = kind;
    payload.params.x_labels = Array.from({ length: CHART_MAX_POINTS }, (_, index) => `${index}`);
    payload.params.series = Array.from({ length: CHART_MAX_SERIES }, (_, index) => ({ name: `${index}`, values: Array(32).fill(0) }));
    expect(componentBlockValidationError(payload)).toBeNull();
    payload.params.series.push({ name: '5', values: Array(32).fill(0) });
    expect(componentBlockValidationError(payload)).not.toBeNull();
    payload.params.series.pop();
    payload.params.x_labels.push('33');
    payload.params.series.forEach((series) => series.values.push(0));
    expect(componentBlockValidationError(payload)).not.toBeNull();
  });

  it('requires finite aligned chart data while accepting negative, fractional, zero and extreme finite values', () => {
    const payload = chart();
    for (const values of [[-10, 0, 0.5], [Number.MAX_VALUE, -Number.MAX_VALUE, Number.MIN_VALUE]]) {
      payload.params.series[0].values = values;
      expect(componentBlockValidationError(payload)).toBeNull();
    }
    for (const values of [[1, 2], [1, 2, 3, 4], [1, NaN, 3], [1, Infinity, 3]]) {
      payload.params.series[0].values = values;
      expect(componentBlockValidationError(payload)).not.toBeNull();
    }
    expect(componentBlockValidationError({ component_kind: 'chart_line', params: { x_labels: [], series: [] } })).not.toBeNull();
    expect(componentBlockValidationError({ component_kind: 'chart_bar', params: { ...chart().params, y_label: 4 } })).not.toBeNull();
  });

  it.each(['timeline', 'chart_bar', 'chart_line'] as const)('counts the full text budget for %s in UTF-16 characters', (kind) => {
    const payload = kind === 'timeline'
      ? { component_kind: kind, params: { title: '界'.repeat(COMPONENT_MAX_CHARACTERS), entries: [{ year: '', label: '' }] } }
      : { component_kind: kind, params: { title: '界'.repeat(COMPONENT_MAX_CHARACTERS), x_labels: [''], series: [{ name: '', values: [0] }] } };
    expect(componentBlockValidationError(payload)).toBeNull();
    payload.params.title += '界';
    expect(componentBlockValidationError(payload)).not.toBeNull();
  });

  it('clones draft data without mutating the original nested params', () => {
    const original = chart();
    const copy = cloneComponentBlockPayload(original);
    copy.params.series[0].values[0] = 99;
    expect(original.params.series[0].values[0]).toBe(70);
  });

  it('flattens current content including collapsed details and chart labels', () => {
    const payload = timeline();
    payload.params.title = '宋\r\n初';
    payload.params.entries[0].detail = '细节\t文字\n换行';
    expect(componentBlockPlainText(payload)).toBe('宋 初\n960\t北宋建立\t细节 文字 换行');
    expect(componentBlockPlainText(chart())).toBe('岁入的换血\n示意比例\n初期\t中期\t后期\n田赋\t70\t50\t30\n工商收入\t30\t50\t70');
  });

  it('estimates indivisible content height for the existing measurement pipeline', () => {
    const payload = timeline();
    payload.params.entries[0].label = '较长的年表标签'.repeat(20);
    expect(estimateComponentBlockHeight(payload, 180)).toBeGreaterThan(estimateComponentBlockHeight(payload, 760));
    for (const item of [timeline(), chart(), { component_kind: 'later', params: {} }] as ComponentBlockPayload[]) {
      expect(estimateComponentBlockHeight(item, 760)).toBeGreaterThan(0);
    }
  });
});
