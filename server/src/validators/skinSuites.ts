import { z } from 'zod';
import { skinPresetIdSchema } from './skin.js';

export const skinSuiteIdSchema = z.string().uuid();
const literalColor = z.string().regex(/^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, 'Use a resolved six- or eight-digit hex color');
export const skinSuiteTokensSchema = z.object({
  desk: literalColor,
  paper: literalColor,
  ink: literalColor,
  'ink-muted': literalColor,
  accent: literalColor,
  annotation: literalColor,
  hairline: literalColor,
  danger: literalColor,
  wall: literalColor,
  'board-desk': literalColor,
  card: literalColor,
  edge: literalColor,
  chalk: literalColor,
}).strict();
export const skinSuiteComponentsSchema = z.object({
  titleFont: z.enum(['sans', 'serif']),
  labelFont: z.enum(['system', 'mono']),
  menuDensity: z.enum(['comfortable', 'compact']),
  handleStyle: z.enum(['capsule', 'rivet']),
  headerRule: z.enum(['visible', 'hidden']),
}).strict();
const name = z.string().trim().min(1).max(64);
export const createSkinSuiteSchema = z.object({
  name,
  tokens: skinSuiteTokensSchema,
  components: skinSuiteComponentsSchema,
  materialPreset: skinPresetIdSchema.optional(),
}).strict();
export const updateSkinSuiteSchema = z.union([
  z.object({ name }).strict(),
  z.object({ name: name.optional(), tokens: skinSuiteTokensSchema, components: skinSuiteComponentsSchema, materialPreset: skinPresetIdSchema.optional() }).strict(),
]);
