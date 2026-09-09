import { z } from 'zod';

/** The complete visible tray order; geometry and object data are never accepted here. */
export const reorderNoteTraySchema = z.object({
  placementIds: z.array(z.string().min(1).max(220)),
}).strict().refine(({ placementIds }) => new Set(placementIds).size === placementIds.length, {
  message: 'Placement IDs must be unique',
  path: ['placementIds'],
});

export type ReorderNoteTrayInput = z.infer<typeof reorderNoteTraySchema>;
