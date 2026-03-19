import type { CardContent } from '@shared/types';
import { CardTemplateType } from '@shared/types';

export const templateOptions = [
  { value: '', label: 'All types' },
  { value: CardTemplateType.Definition, label: 'Definition' },
  { value: CardTemplateType.Theorem, label: 'Theorem' },
  { value: CardTemplateType.Formula, label: 'Formula' },
  { value: CardTemplateType.General, label: 'General' },
];

export const templateColors: Record<string, string> = {
  [CardTemplateType.Definition]: '#6366f1',
  [CardTemplateType.Theorem]: '#f59e0b',
  [CardTemplateType.Formula]: '#22c55e',
  [CardTemplateType.General]: '#8b5cf6',
};

export const templateLabels: Record<string, string> = {
  [CardTemplateType.Definition]: 'DEF',
  [CardTemplateType.Theorem]: 'THM',
  [CardTemplateType.Formula]: 'FML',
  [CardTemplateType.General]: 'GEN',
};

export function getContentPreview(content: CardContent): string {
  if (!content) return '';
  if ('definition' in content) return content.definition || '';
  if ('statement' in content) return content.statement || '';
  if ('formula' in content) return content.formula || '';
  if ('body' in content) return content.body || '';
  return '';
}
