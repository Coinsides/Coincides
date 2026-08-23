import { z, type ZodTypeAny } from 'zod';
import {
  createNoteSchema,
  updateNoteSchema,
} from '../validators/index.js';

export type ToolTruth =
  | 'content'
  | 'knowledge'
  | 'spatial'
  | 'provenance'
  | 'semantic'
  | 'purpose'
  | 'package';

export type ToolTier = 'immediate' | 'propose' | 'confirm';
export type ToolExposure = 'public' | 'internal' | 'test';

export interface ToolRegistryHumanEntry {
  route: string;
  client_call_site: string;
}

export interface ToolRegistryThreshold {
  batch_field: string;
}

export interface ToolRegistryEntry {
  name: string;
  description: string;
  input_schema: ZodTypeAny;
  output_schema: ZodTypeAny;
  truth: ToolTruth;
  tier: ToolTier;
  threshold?: ToolRegistryThreshold;
  human_entry: ToolRegistryHumanEntry;
  exposure: ToolExposure;
  scopes: string[];
}

const createNoteShape = createNoteSchema.shape;
const updateNoteShape = updateNoteSchema.shape;

export const listNotesInputSchema = createNoteSchema
  .pick({ course_id: true })
  .extend({
    status: updateNoteShape.status.unwrap().optional().default('active'),
  })
  .strict();

const noteOutputSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  course_id: createNoteShape.course_id,
  title: createNoteShape.title,
  description: createNoteShape.description.unwrap().nullable(),
  status: updateNoteShape.status.unwrap(),
  source_kind: z.string().min(1),
  note_class: z.string().min(1),
  page_format: createNoteShape.page_format.removeDefault().unwrap(),
  metadata: createNoteShape.metadata.unwrap(),
  operation_batch_id: z.string().uuid().nullable(),
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
  trashed_at: z.string().min(1).nullable(),
}).strict();

export const listNotesOutputSchema = z.array(noteOutputSchema);

export const trashNotesInputSchema = z.object({
  note_ids: z.array(z.string().uuid()).min(1).max(50),
}).strict();

const trashNotesResultSchema = z.discriminatedUnion('outcome', [
  z.object({
    note_id: z.string().uuid(),
    outcome: z.literal('trashed'),
  }).strict(),
  z.object({
    note_id: z.string().uuid(),
    outcome: z.literal('missing'),
  }).strict(),
  z.object({
    note_id: z.string().uuid(),
    outcome: z.literal('skipped'),
    reason: z.enum(['already_trashed', 'read_only_projection']),
  }).strict(),
]);

export const trashNotesOutputSchema = z.object({
  results: z.array(trashNotesResultSchema),
}).strict();

/**
 * The only authoritative V2.BN.12 tool directory. JSON manifests are derived
 * from these runtime entries; legacy v1 toolDefinitions are intentionally not
 * imported or adapted here.
 */
export const TOOL_REGISTRY: ToolRegistryEntry[] = [
  {
    name: 'list_notes',
    description: 'List notes in one Project, optionally filtered by lifecycle status.',
    input_schema: listNotesInputSchema,
    output_schema: listNotesOutputSchema,
    truth: 'content',
    tier: 'immediate',
    human_entry: {
      route: 'GET /api/notes',
      client_call_site: 'client/src/pages/Courses/CourseDetail.tsx#fetchSummary',
    },
    exposure: 'public',
    scopes: ['notes:read'],
  },
  {
    name: 'trash_notes',
    description: 'Move one note to trash immediately, or record a multi-note proposal for human review.',
    input_schema: trashNotesInputSchema,
    output_schema: trashNotesOutputSchema,
    truth: 'content',
    tier: 'confirm',
    threshold: { batch_field: 'note_ids' },
    human_entry: {
      route: 'DELETE /api/notes/:id',
      client_call_site: 'client/src/pages/Courses/CourseDetail.tsx#handleTrashNote',
    },
    exposure: 'public',
    scopes: ['notes:write'],
  },
];
