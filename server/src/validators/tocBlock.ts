import { z } from 'zod';

/** TOC entries are a live chapter projection, never a stored content payload. */
export const tocBlockContentSchema = z.object({}).strict();
