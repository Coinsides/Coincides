import type Database from 'better-sqlite3';

export interface AgentSourceSearchResult {
  source_record_id: string;
  title: string;
  /** Read the full extracted text with read_note. */
  projection_note_id: string;
  course_id: string | null;
  course_name: string | null;
  matched_on: 'title' | 'content' | 'title_and_content';
  snippets: Array<{ content: string; page: number | null }>;
}

interface ProjectionBlockMatch {
  source_record_id: string;
  display_name: string;
  projection_note_id: string;
  course_id: string | null;
  course_name: string | null;
  plain_text: string;
  metadata: string | null;
  order_index: number;
}

const MAX_TERMS = 8;
const MAX_SOURCES = 5;
const MAX_SNIPPETS = 3;

const FILE_TYPE_EXTENSIONS: Record<string, string[]> = {
  pdf: ['pdf'], docx: ['docx'], xlsx: ['xlsx'], txt: ['txt'], md: ['md'],
  image: ['png', 'jpg', 'jpeg', 'webp'],
};

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

// Natural-language questions rarely contain a block verbatim, so match terms and
// rank by how many of them a block contains.
function searchTerms(query: string): string[] {
  const terms = query.toLowerCase().split(/[\s,.;:!?()[\]{}"'，。；：！？（）、]+/u)
    .filter((term) => term.length >= 2);
  return [...new Set(terms)].slice(0, MAX_TERMS);
}

function extensionMatches(filename: string, fileType?: string): boolean {
  if (!fileType) return true;
  const extensions = FILE_TYPE_EXTENSIONS[fileType];
  const extension = filename.toLowerCase().split('.').pop() ?? '';
  return !extensions || extensions.includes(extension);
}

/**
 * Find Ready Sources by name or by the text of their extracted projection.
 * Reads projection blocks directly, so it works before any Project material
 * has been derived and never writes.
 */
export function searchSourcesForAgent(
  db: Database.Database,
  userId: string,
  input: { query: string; course_id?: string; file_type?: string },
): AgentSourceSearchResult[] {
  const terms = searchTerms(input.query);
  if (terms.length === 0) return [];
  const placementFilter = input.course_id
    ? 'AND EXISTS (SELECT 1 FROM source_project_placements spp WHERE spp.source_record_id = sr.id AND spp.course_id = ?)'
    : '';
  const sourceRows = db.prepare(`
    SELECT sr.id AS source_record_id, sr.display_name, sm.projection_note_id, n.course_id, c.name AS course_name,
           sf.original_filename
    FROM source_records sr
    JOIN source_materializations sm ON sm.source_record_id = sr.id AND sm.user_id = sr.user_id
    JOIN source_files sf ON sf.source_record_id = sr.id AND sf.user_id = sr.user_id
    JOIN notes n ON n.id = sm.projection_note_id AND n.user_id = sr.user_id
    LEFT JOIN courses c ON c.id = n.course_id
    WHERE sr.user_id = ? AND sm.status = 'materialized' ${placementFilter}
  `).all(...(input.course_id ? [userId, input.course_id] : [userId])) as Array<{
    source_record_id: string; display_name: string; projection_note_id: string;
    course_id: string | null; course_name: string | null; original_filename: string;
  }>;
  const sources = new Map(sourceRows
    .filter((row) => extensionMatches(row.original_filename, input.file_type))
    .map((row) => [row.source_record_id, row]));
  if (sources.size === 0) return [];

  const ids = [...sources.keys()];
  const blocks = db.prepare(`
    SELECT sm.source_record_id, p.order_index, b.plain_text, b.metadata
    FROM source_materializations sm
    JOIN note_block_placements p ON p.note_id = sm.projection_note_id
    JOIN note_blocks b ON b.id = p.block_id AND b.user_id = sm.user_id AND b.status = 'active'
    WHERE sm.user_id = ? AND sm.source_record_id IN (${ids.map(() => '?').join(', ')})
      AND (${terms.map(() => "lower(b.plain_text) LIKE ? ESCAPE '\\'").join(' OR ')})
  `).all(userId, ...ids, ...terms.map((term) => `%${escapeLike(term)}%`)) as Array<
    Pick<ProjectionBlockMatch, 'source_record_id' | 'order_index' | 'plain_text' | 'metadata'>
  >;

  const hits = (text: string) => terms.filter((term) => text.toLowerCase().includes(term)).length;
  const results: Array<AgentSourceSearchResult & { score: number }> = [];
  for (const source of sources.values()) {
    const titleScore = hits(source.display_name);
    const matched = blocks
      .filter((block) => block.source_record_id === source.source_record_id)
      .map((block) => ({ block, score: hits(block.plain_text) }))
      .sort((a, b) => b.score - a.score || a.block.order_index - b.block.order_index);
    if (titleScore === 0 && matched.length === 0) continue;
    results.push({
      source_record_id: source.source_record_id,
      title: source.display_name,
      projection_note_id: source.projection_note_id,
      course_id: source.course_id,
      course_name: source.course_name,
      matched_on: titleScore > 0 && matched.length > 0 ? 'title_and_content' : titleScore > 0 ? 'title' : 'content',
      snippets: matched.slice(0, MAX_SNIPPETS).map(({ block }) => {
        let page: number | null = null;
        try {
          const value = JSON.parse(block.metadata || '{}').source_page_index;
          page = typeof value === 'number' ? value : null;
        } catch { /* Snippets stay usable without a page. */ }
        return { content: block.plain_text.slice(0, 500), page };
      }),
      score: titleScore * 2 + (matched[0]?.score ?? 0),
    });
  }
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SOURCES)
    .map(({ score: _score, ...result }) => result);
}
