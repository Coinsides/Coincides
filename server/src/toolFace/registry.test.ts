import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import {
  TOOL_REGISTRY,
  listNotesInputSchema,
  listNotesOutputSchema,
  resolveSelectionInputSchema,
  resolveSelectionOutputSchema,
} from './registry.js';

const courseId = 'c642f6c5-c039-4af4-8478-3af2a2f4e4af';
const noteId = 'b71ec10a-19ed-4078-93f8-7e6f638bcde2';

test('the server registry contains a real public list_notes entry with Zod schemas', () => {
  assert.ok(TOOL_REGISTRY.length >= 1);
  const entry = TOOL_REGISTRY.find((candidate) => candidate.name === 'list_notes');
  assert.ok(entry);

  assert.equal(entry.name, 'list_notes');
  assert.equal(entry.exposure, 'public');
  assert.equal(
    Object.prototype.hasOwnProperty.call(entry, 'threshold'),
    false,
    'existing entries without a threshold must not gain the optional key',
  );
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

test('resolve_selection registers the public read tool with the mixed receipt vocabulary', () => {
  const entry = TOOL_REGISTRY.find((candidate) => candidate.name === 'resolve_selection');
  assert.ok(entry, 'resolve_selection must exist in the authoritative server registry');

  assert.equal(entry.truth, 'content');
  assert.equal(entry.tier, 'immediate');
  assert.equal(entry.exposure, 'public');
  assert.deepEqual(entry.scopes, ['notes:read']);
  assert.deepEqual(entry.human_entry, {
    route: 'GET /api/notes/:id/blocks',
    client_call_site: 'client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts#fetchNote',
  });
  assert.ok(entry.input_schema instanceof z.ZodType);
  assert.ok(entry.output_schema instanceof z.ZodType);

  const valid = {
    note_id: noteId,
    refs: [{
      blockId: 'block-1',
      textFlowId: 'textflow-block-1',
      textUnitId: 'unit-1',
    }],
    text_ranges: [{
      blockId: 'block-1',
      textFlowId: 'textflow-block-1',
      textUnitId: 'unit-1',
      startOffset: 3,
      endOffset: 9,
      excerpt: '345678',
    }],
    at: '2026-08-24T12:02:03.456Z',
  };
  assert.deepEqual(resolveSelectionInputSchema.parse(valid), valid);
  assert.equal(resolveSelectionInputSchema.safeParse({ ...valid, unknown: true }).success, false);
  assert.equal(resolveSelectionInputSchema.safeParse({
    ...valid,
    refs: [{ ...valid.refs[0], unknown: true }],
  }).success, false, 'ref objects must remain strict');
  assert.equal(resolveSelectionInputSchema.safeParse({
    ...valid,
    text_ranges: [{ ...valid.text_ranges[0], block_id: 'block-1' }],
  }).success, false, 'inner camelCase fields must remain strict');
  assert.equal(resolveSelectionInputSchema.safeParse({
    ...valid,
    text_ranges: [{
      blockId: 'block-1',
      textFlowId: 'textflow-block-1',
      textUnitId: 'unit-1',
      startOffset: 3,
      endOffset: 9,
      text: '345678',
    }],
  }).success, false, 'excerpt must not silently regress to text');
  assert.equal(resolveSelectionInputSchema.safeParse({
    ...valid,
    text_ranges: [{ ...valid.text_ranges[0], excerpt: 'wrong' }],
  }).success, false, 'excerpt length must equal endOffset - startOffset');

  for (const result of [
    {
      outcome: 'found',
      blockId: 'block-1',
      textFlowId: 'textflow-block-1',
      textUnitId: 'unit-1',
    },
    {
      outcome: 'text_drifted',
      blockId: 'block-1',
      textFlowId: 'textflow-block-1',
      textUnitId: 'unit-1',
    },
    { outcome: 'missing' },
  ]) {
    assert.equal(resolveSelectionOutputSchema.safeParse({ results: [result] }).success, true);
  }
  assert.equal(resolveSelectionOutputSchema.safeParse({
    results: [{ outcome: 'forbidden' }],
  }).success, false);
  assert.equal(resolveSelectionOutputSchema.safeParse({
    results: [{ outcome: 'missing', blockId: 'secret-block' }],
  }).success, false, 'missing must not echo an existence-distinguishing identity');
});

test('K-b4 registry declares trash_notes with the batch threshold and causal outcome vocabulary', () => {
  const entry = TOOL_REGISTRY.find((candidate) => candidate.name === 'trash_notes');
  assert.ok(entry, 'trash_notes must exist in the authoritative server registry');

  assert.equal(entry.truth, 'content');
  assert.equal(entry.tier, 'confirm');
  assert.deepEqual(entry.threshold, { batch_field: 'note_ids' });
  assert.deepEqual(entry.human_entry, {
    route: 'DELETE /api/notes/:id',
    client_call_site: 'client/src/pages/Courses/CourseDetail.tsx#handleTrashNote',
  });
  assert.equal(entry.exposure, 'public');
  assert.deepEqual(entry.scopes, ['notes:write']);

  assert.deepEqual(entry.input_schema.parse({ note_ids: [noteId] }), {
    note_ids: [noteId],
  });
  assert.equal(entry.input_schema.safeParse({ note_ids: [] }).success, false);
  assert.equal(entry.input_schema.safeParse({ note_ids: Array(51).fill(noteId) }).success, false);
  assert.equal(entry.input_schema.safeParse({ note_ids: ['not-a-uuid'] }).success, false);
  assert.equal(entry.input_schema.safeParse({ note_ids: [noteId], unknown: true }).success, false);

  for (const result of [
    { note_id: noteId, outcome: 'trashed' },
    { note_id: noteId, outcome: 'missing' },
    { note_id: noteId, outcome: 'skipped', reason: 'already_trashed' },
    { note_id: noteId, outcome: 'skipped', reason: 'read_only_projection' },
  ]) {
    assert.equal(entry.output_schema.safeParse({ results: [result] }).success, true);
  }
  assert.equal(entry.output_schema.safeParse({
    results: [{ note_id: noteId, outcome: 'skipped' }],
  }).success, false, 'skipped outcomes must carry a reason');
  assert.equal(entry.output_schema.safeParse({
    results: [{ note_id: noteId, outcome: 'already_trashed' }],
  }).success, false, 'reasons must not become a third outcome');
});
