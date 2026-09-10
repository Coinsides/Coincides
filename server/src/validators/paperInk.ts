import { z } from 'zod';

// Same data vocabulary as board chalk; paper ink has its own storage and lifecycle.
export const paperFreehandDataSchema = z.object({
  points: z.array(z.object({
    x: z.number().finite(),
    y: z.number().finite(),
    pressure: z.number().finite().nonnegative().optional(),
  }).passthrough()).min(1).optional(),
  path: z.string().min(1).optional(),
  style: z.record(z.unknown()).optional(),
}).passthrough().refine((value) => value.points !== undefined || value.path !== undefined,
  'Freehand data requires points or path');
