import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Note } from '../runtimeDataTypes';
import { SourceConversionNotice } from './SourceConversionNotice';

function note(extra: Partial<Note>): Note {
  return { id: 'note-1', course_id: 'course-1', title: 'Paper', description: null, status: 'active', ...extra };
}

describe('SourceConversionNotice', () => {
  it('shows on a projection whose parser reported messages, without a count', () => {
    render(<SourceConversionNotice note={note({
      note_class: 'source_projection',
      metadata: { parser_messages: [{ type: 'warning', message: 'An unrecognised element was ignored' }] },
    })} />);
    expect(screen.getByRole('note').textContent).not.toMatch(/\d/);
  });

  it.each([
    ['no record', { note_class: 'source_projection', metadata: {} }],
    ['an empty list', { note_class: 'source_projection', metadata: { parser_messages: [] } }],
    ['a malformed value', { note_class: 'source_projection', metadata: { parser_messages: 'x' } }],
    ['a handwritten note', { note_class: 'user', metadata: { parser_messages: [{}] } }],
  ])('stays away with %s', (_label, extra) => {
    render(<SourceConversionNotice note={note(extra)} />);
    expect(screen.queryByRole('note')).toBeNull();
  });
});
