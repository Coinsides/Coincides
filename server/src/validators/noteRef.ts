import { z } from 'zod';

export const noteRefBlockDataSchema = z.object({ field: z.enum(['title', 'description']) }).strict();
