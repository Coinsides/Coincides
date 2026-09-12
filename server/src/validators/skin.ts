import { z } from 'zod';
import type { SkinSelection } from '../../../shared/types/skin.js';

// Runtime enum stays local to the server build; shared/types/skin.ts is the public type contract.
const colorSchema = z.string().regex(/^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, 'Use a six- or eight-digit hex color');
export const skinSelectionSchema: z.ZodType<SkinSelection> = z.object({
  preset: z.enum(['default', 'quiet-ink', 'warm-paper', 'workbench']),
  overrides: z.object({
    desk: colorSchema.optional(),
    paper: colorSchema.optional(),
    ink: colorSchema.optional(),
    'ink-muted': colorSchema.optional(),
    accent: colorSchema.optional(),
    annotation: colorSchema.optional(),
    hairline: colorSchema.optional(),
    danger: colorSchema.optional(),
    wall: colorSchema.optional(),
  }).strict().optional(),
}).strict();
