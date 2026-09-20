import { describe, expect, it } from 'vitest';
import { applyHeadingPrefix, headingLevelForRole, headingPrefix } from './headingRoleService';
import { createTextBlockContentV1, readTextFlowContent } from './textFlowService';
import { parseTextUnitsFromPlainText, setTextUnitWritingRole, splitTextUnitForEnter } from './textUnitEditorService';
import { detectSlashTrigger, filterSlashCommands } from '../noteSlashCommands';
import { typographyTextMetrics } from './typographyMeasurementService';
import { DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE } from './typographyProfileService';

describe('A4 heading roles within existing TextFlow', () => {
  it.each([1, 2, 3] as const)('round-trips heading %i and removes only its completed Markdown prefix', (level) => {
    const initial = createTextBlockContentV1('#'.repeat(level));
    const before = structuredClone(initial);
    const result = applyHeadingPrefix(initial, 'tu-1', '#'.repeat(level) + ' ');
    expect(result?.flow.units[0]).toMatchObject({ id: 'tu-1', writing_role: `heading_${level}`, text: '' });
    expect(readTextFlowContent({ text_flow: result!.flow }).textFlow).toEqual(result!.flow);
    expect(initial).toEqual(before);
    expect(parseTextUnitsFromPlainText('#'.repeat(level) + ' Chapter')[0].writing_role).toBe(`heading_${level}`);
    const slash = detectSlashTrigger(`/h${level}`)!;
    expect(slash.query).toBe(`h${level}`);
    expect(filterSlashCommands(slash.query)[0].writingRole).toBe(`heading_${level}`);
  });
  it('leaves incomplete or nonleading markers and code unchanged, and reads legacy heading as level one', () => {
    expect(headingLevelForRole('heading')).toBe(1);
    expect(headingPrefix('###')).toBeNull();
    expect(headingPrefix(' #### title')).toBeNull();
    expect(headingPrefix('#### title')).toBeNull();
    expect(applyHeadingPrefix(createTextBlockContentV1('#', 'code_line'), 'tu-1', '# ')).toBeNull();
  });
  it('changes an existing heading level, restores body, and Enter makes a body unit', () => {
    const heading = setTextUnitWritingRole(createTextBlockContentV1('Chapter'), 'tu-1', 'heading_3');
    expect(setTextUnitWritingRole(heading, 'tu-1', 'heading_2').units[0].writing_role).toBe('heading_2');
    expect(setTextUnitWritingRole(heading, 'tu-1', 'paragraph').units[0].writing_role).toBe('paragraph');
    const entered = splitTextUnitForEnter(heading, 'tu-1', 7);
    expect(entered.units.map((unit) => [unit.text, unit.writing_role])).toEqual([['Chapter', 'heading_3'], ['', 'paragraph']]);
    expect(filterSlashCommands('body')[0].writingRole).toBe('paragraph');
  });
  it('separates an existing hard-line paragraph when it becomes a single-line heading', () => {
    const initial = createTextBlockContentV1('Heading\nBody');
    initial.inline_structures = [{ id: 'inline-body', semantic_kind: 'inline_code', parent_text_unit_id: 'tu-1',
      anchor_text: 'Body', anchor_range: { start: 8, end: 12 }, field_values: {}, metadata: {}, status: 'active' }];
    const next = setTextUnitWritingRole(initial, 'tu-1', 'heading_2');
    expect(next.units.map((unit) => [unit.text, unit.writing_role])).toEqual([['Heading', 'heading_2'], ['Body', 'paragraph']]);
    expect(next.inline_structures[0]).toMatchObject({ id: 'inline-body', parent_text_unit_id: next.units[1].id,
      anchor_range: { start: 0, end: 4 } });
    expect(initial.units).toHaveLength(1);
  });
  it.each(['heading_1', 'heading_2', 'heading_3'] as const)('%s follows font, size, line height and paragraph spacing together', (writingRole) => {
    const base = { text: '标题', width: 300, typography: DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE, writingRole };
    const before = typographyTextMetrics(base);
    const after = typographyTextMetrics({ ...base, typography: { ...base.typography,
      fontFamily: 'Georgia, serif', fontSizePx: 18, lineHeightPx: 33, paragraphSpacingPx: 8 } });
    expect(after.fontFamily).toBe('Georgia, serif');
    expect(after.fontSizePx / before.fontSizePx).toBeCloseTo(18 / 15);
    expect(after.lineHeightPx / before.lineHeightPx).toBeCloseTo(33 / 22);
    expect(after.paragraphSpacingPx).toBe(8);
  });
});
