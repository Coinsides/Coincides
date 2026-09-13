import { z } from 'zod';
import type { SkinSelection } from '../../../shared/types/skin.js';

// Runtime enum stays local to the server build; shared/types/skin.ts is the public type contract.
export const skinPresetIdSchema = z.enum(['default', 'quiet-ink', 'warm-paper', 'workbench']);
const colorSchema = z.string().regex(
  /^(?:#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|palette:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/,
  'Use a six- or eight-digit hex color or palette:<uuid>',
);
export const skinSelectionSchema: z.ZodType<SkinSelection> = z.object({
  preset: z.union([
    skinPresetIdSchema,
    z.string().regex(/^suite:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/) as z.ZodType<`suite:${string}`>,
  ]),
  materialPreset: skinPresetIdSchema.optional(),
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
    'board-desk': colorSchema.optional(),
    card: colorSchema.optional(),
    edge: colorSchema.optional(),
    chalk: colorSchema.optional(),
  }).strict().optional(),
  components: z.object({
    titleFont: z.enum(['sans', 'serif']).optional(),
    labelFont: z.enum(['system', 'mono']).optional(),
    menuDensity: z.enum(['comfortable', 'compact']).optional(),
    handleStyle: z.enum(['capsule', 'rivet']).optional(),
    headerRule: z.enum(['visible', 'hidden']).optional(),
  }).strict().optional(),
}).strict();
