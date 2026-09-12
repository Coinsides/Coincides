import type Database from 'better-sqlite3';
import { hydrateCourseSkin } from './skin.js';

export interface RecentCourseNote {
  id: string;
  title: string;
  updated_at: string;
  excerpt: string | null;
}

export type CourseCardRow = Record<string, unknown> & {
  recent_note: RecentCourseNote | null;
};

interface CourseWithRecentNoteColumns extends Record<string, unknown> {
  recent_note_id: string | null;
  recent_note_title: string | null;
  recent_note_updated_at: string | null;
  recent_note_excerpt: string | null;
}

export function listCourseCards(db: Database.Database, userId: string): CourseCardRow[] {
  const rows = db.prepare(`
    SELECT
      c.*,
      recent.id AS recent_note_id,
      recent.title AS recent_note_title,
      recent.updated_at AS recent_note_updated_at,
      (
        SELECT substr(group_concat(ordered_blocks.plain_text, char(10)), 1, 200)
        FROM (
          SELECT trim(blocks.plain_text) AS plain_text
          FROM note_block_placements placements
          JOIN note_blocks blocks ON blocks.id = placements.block_id
          WHERE placements.note_id = recent.id
            AND blocks.user_id = c.user_id
            AND blocks.status = 'active'
            AND trim(COALESCE(blocks.plain_text, '')) <> ''
          ORDER BY placements.order_index ASC, placements.id ASC
        ) AS ordered_blocks
      ) AS recent_note_excerpt
    FROM courses c
    LEFT JOIN notes recent ON recent.id = (
      SELECT candidate.id
      FROM notes candidate
      WHERE candidate.user_id = c.user_id
        AND candidate.course_id = c.id
        AND candidate.status = 'active'
      ORDER BY julianday(candidate.updated_at) DESC, candidate.id DESC
      LIMIT 1
    )
    WHERE c.user_id = ?
    ORDER BY c.created_at DESC
  `).all(userId) as CourseWithRecentNoteColumns[];

  return rows.map((row) => {
    const {
      recent_note_id: recentNoteId,
      recent_note_title: recentNoteTitle,
      recent_note_updated_at: recentNoteUpdatedAt,
      recent_note_excerpt: recentNoteExcerpt,
      ...course
    } = row;

    return {
      ...hydrateCourseSkin(course),
      recent_note: recentNoteId === null
        ? null
        : {
            id: recentNoteId,
            title: recentNoteTitle ?? '',
            updated_at: recentNoteUpdatedAt ?? '',
            excerpt: recentNoteExcerpt,
          },
    };
  });
}
