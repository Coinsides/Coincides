import {
  chartComponentParamsSchema, componentBlockContentSchema, timelineComponentParamsSchema,
} from '../validators/componentBlock.js';

export function assertComponentBlockContent(input: { block_type: string; content_json?: unknown }): void {
  if (input.block_type === 'component') componentBlockContentSchema.parse(input.content_json);
}

/** read_note v1 text projection only; the existing strict output schema stays unchanged. */
export function componentBlockPlainText(content: unknown): string {
  const result = componentBlockContentSchema.safeParse(content);
  if (!result.success) return '';
  const { component_kind: kind, params } = result.data;
  const flatten = (text: string) => text.replace(/\r\n|[\t\r\n]/g, ' ');
  if (kind === 'timeline') {
    const timeline = timelineComponentParamsSchema.parse(params);
    return [
      ...(timeline.title ? [flatten(timeline.title)] : []),
      ...timeline.entries.map(entry => [entry.year, entry.label, ...(entry.detail !== undefined ? [entry.detail] : [])].map(flatten).join('\t')),
    ].join('\n');
  }
  if (kind === 'chart_bar' || kind === 'chart_line') {
    const chart = chartComponentParamsSchema.parse(params);
    return [
      ...(chart.title ? [flatten(chart.title)] : []),
      ...(chart.y_label ? [flatten(chart.y_label)] : []),
      chart.x_labels.map(flatten).join('\t'),
      ...chart.series.map(series => [flatten(series.name), ...series.values.map(String)].join('\t')),
    ].join('\n');
  }
  return `${flatten(kind)}\n未注册组件`;
}
