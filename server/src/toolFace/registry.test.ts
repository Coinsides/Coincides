import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import {
  TOOL_REGISTRY,
  listNotesInputSchema,
  listNotesOutputSchema,
} from './registry.js';

const courseId = 'c642f6c5-c039-4af4-8478-3af2a2f4e4af';

test('the server registry contains a real public list_notes entry with Zod schemas', () => {
  assert.ok(TOOL_REGISTRY.length >= 1);
  const entry = TOOL_REGISTRY.find((candidate) => candidate.name === 'list_notes');
  assert.ok(entry);

  assert.equal(entry.name, 'list_notes');
  assert.equal(entry.exposure, 'public');
  assert.deepEqual(entry.human_entry, {
    route: 'GET /api/notes',
    client_call_site: 'client/src/pages/Courses/CourseDetail.tsx#fetchSummary',
  });
  assert.ok(entry.input_schema instanceof z.ZodType);
  assert.ok(entry.output_schema instanceof z.ZodType);
});

test('list_notes input reuses the route vocabulary and rejects unknown fields', () => {
  assert.deepEqual(listNotesInputSchema.parse({ course_id: courseId }), {
    course_id: courseId,
    status: 'active',
  });
  assert.deepEqual(listNotesInputSchema.parse({
    course_id: courseId,
    status: 'archived',
  }), {
    course_id: courseId,
    status: 'archived',
  });

  assert.equal(listNotesInputSchema.safeParse({
    course_id: courseId,
    unknown: true,
  }).success, false);
});

test('list_notes output describes the hydrated note list returned by the route', () => {
  const result = listNotesOutputSchema.safeParse([{
    id: 'b71ec10a-19ed-4078-93f8-7e6f638bcde2',
    user_id: 'a2bd9e98-3eef-475d-8943-2f023578b3c4',
    course_id: courseId,
    title: 'Continuity',
    description: null,
    status: 'active',
    source_kind: 'manual',
    note_class: 'user',
    page_format: 'flow',
    metadata: {},
    operation_batch_id: null,
    created_at: '2026-08-22T08:00:00.000Z',
    updated_at: '2026-08-22T08:00:00.000Z',
    trashed_at: null,
  }]);

  assert.equal(result.success, true);
});
