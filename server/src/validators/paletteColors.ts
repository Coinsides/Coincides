import { z } from 'zod';

export const paletteColorIdSchema = z.string().uuid();
const paletteColorFields = {
  name: z.string().trim().min(1).max(64),
  value: z.string().regex(/^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, 'Use a six- or eight-digit hex color'),
  sort: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
};

export const createPaletteColorSchema = z.object(paletteColorFields).strict();
export const updatePaletteColorSchema = z.object(paletteColorFields).partial().strict()
  .refine((value) => Object.keys(value).length > 0, 'Provide a name, value, or sort');
