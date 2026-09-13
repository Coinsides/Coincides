import { z } from 'zod';
import type { NoteCover } from '../../../shared/types/noteCover.js';

const cropSchema = z.object({
  x: z.number().finite().min(0).max(100),
  y: z.number().finite().min(0).max(100),
  width: z.number().finite().positive().max(100),
  height: z.number().finite().positive().max(100),
}).strict().refine((crop) => crop.x + crop.width <= 100 + 1e-6
  && crop.y + crop.height <= 100 + 1e-6, 'Cover crop must stay inside the original image');

export const noteCoverSchema: z.ZodType<NoteCover> = z.object({
  assetId: z.string().min(1),
  card: z.object({ crop: cropSchema, zoom: z.number().finite().min(1) }).strict(),
}).strict();

const coverBindingMetadataSchema = z.object({
  binding: z.object({ cover: noteCoverSchema.nullable().optional() }).passthrough().optional(),
}).passthrough();

/** Keep the existing open-record JSON Schema: cover is a runtime-only product
 * refinement, not a new tool-face input vocabulary. Return the original record
 * so unrelated metadata and precise viewport parameters pass through untouched. */
export const noteMetadataSchema = z.record(z.unknown()).superRefine((metadata, context) => {
  const result = coverBindingMetadataSchema.safeParse(metadata);
  if (!result.success) {
    for (const issue of result.error.issues) context.addIssue(issue);
  }
});
