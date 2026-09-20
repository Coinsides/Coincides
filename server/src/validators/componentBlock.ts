import { z } from 'zod';

export const COMPONENT_MAX_TEXT_LENGTH = 65536;
export const TIMELINE_MAX_ENTRIES = 64;
export const CHART_MAX_SERIES = 4;
export const CHART_MAX_POINTS = 32;

export const timelineComponentParamsSchema = z.object({
  title: z.string().optional(),
  entries: z.array(z.object({
    year: z.string(), label: z.string(), detail: z.string().optional(),
  }).strict()).min(1).max(TIMELINE_MAX_ENTRIES),
}).strict();

export const chartComponentParamsSchema = z.object({
  title: z.string().optional(),
  x_labels: z.array(z.string()).min(1).max(CHART_MAX_POINTS),
  series: z.array(z.object({
    name: z.string(), values: z.array(z.number().finite()).min(1).max(CHART_MAX_POINTS),
  }).strict()).min(1).max(CHART_MAX_SERIES),
  y_label: z.string().optional(),
}).strict().superRefine((params, ctx) => {
  params.series.forEach((series, index) => {
    if (series.values.length !== params.x_labels.length) ctx.addIssue({
      code: z.ZodIssueCode.custom, path: ['series', index, 'values'],
      message: 'Every series must have one value per x label',
    });
  });
});

/** Manual closed set: unknown kinds retain their envelope for placeholder rendering. */
export const BUILTIN_COMPONENT_PARAMS_SCHEMAS = Object.freeze({
  timeline: timelineComponentParamsSchema,
  chart_bar: chartComponentParamsSchema,
  chart_line: chartComponentParamsSchema,
});

export const componentBlockContentSchema = z.object({
  component_kind: z.string().min(1).max(128).refine(value => value.trim().length > 0, 'Component kind cannot be blank'),
  params: z.record(z.unknown()),
}).strict().superRefine((content, ctx) => {
  const kind = content.component_kind;
  if (kind !== 'timeline' && kind !== 'chart_bar' && kind !== 'chart_line') return;
  const result = BUILTIN_COMPONENT_PARAMS_SCHEMAS[kind].safeParse(content.params);
  if (!result.success) {
    for (const issue of result.error.issues) ctx.addIssue({ ...issue, path: ['params', ...issue.path] });
    return;
  }
  const params = result.data;
  const textLength = (params.title?.length ?? 0) + ('entries' in params
    ? params.entries.reduce((sum, entry) => sum + entry.year.length + entry.label.length + (entry.detail?.length ?? 0), 0)
    : (params.y_label?.length ?? 0) + params.x_labels.reduce((sum, label) => sum + label.length, 0)
      + params.series.reduce((sum, series) => sum + series.name.length, 0));
  if (textLength > COMPONENT_MAX_TEXT_LENGTH) ctx.addIssue({
    code: z.ZodIssueCode.custom, path: ['params'], message: 'Component text exceeds 65536 UTF-16 code units',
  });
});

export type ComponentBlockContent = z.infer<typeof componentBlockContentSchema>;
