import { z } from 'zod';

/** B3 placement semantics, shared by human creation and organized-note apply. */
export const PARAGRAPH_FURNITURE_KEY = 'paragraph_furniture_v1';
export const paragraphFurnitureSchema = z.discriminatedUnion('variant', [
  z.object({ variant: z.literal('quote'), source: z.string().optional() }).strict(),
  z.object({ variant: z.literal('callout'), label: z.string().optional() }).strict(),
]);
