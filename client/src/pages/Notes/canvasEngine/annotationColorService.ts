export interface AnnotationColorOptionV1 {
  token: string;
  label: string;
  accent: string;
  background: string;
  badgeBackground: string;
  text: string;
}

export const ANNOTATION_COLOR_OPTIONS: AnnotationColorOptionV1[] = [
  {
    token: 'annotation-yellow',
    label: 'Yellow',
    accent: '#facc15',
    background: 'rgba(250, 204, 21, 0.22)',
    badgeBackground: 'rgba(113, 63, 18, 0.72)',
    text: '#fef9c3',
  },
  {
    token: 'annotation-blue',
    label: 'Blue',
    accent: '#60a5fa',
    background: 'rgba(37, 99, 235, 0.24)',
    badgeBackground: 'rgba(30, 58, 138, 0.74)',
    text: '#dbeafe',
  },
  {
    token: 'annotation-teal',
    label: 'Teal',
    accent: '#2dd4bf',
    background: 'rgba(20, 184, 166, 0.24)',
    badgeBackground: 'rgba(17, 94, 89, 0.74)',
    text: '#ccfbf1',
  },
  {
    token: 'annotation-violet',
    label: 'Violet',
    accent: '#a78bfa',
    background: 'rgba(124, 58, 237, 0.23)',
    badgeBackground: 'rgba(76, 29, 149, 0.74)',
    text: '#ede9fe',
  },
  {
    token: 'annotation-rose',
    label: 'Rose',
    accent: '#fb7185',
    background: 'rgba(225, 29, 72, 0.22)',
    badgeBackground: 'rgba(136, 19, 55, 0.74)',
    text: '#ffe4e6',
  },
  {
    token: 'annotation-slate',
    label: 'Slate',
    accent: '#94a3b8',
    background: 'rgba(100, 116, 139, 0.24)',
    badgeBackground: 'rgba(51, 65, 85, 0.78)',
    text: '#e2e8f0',
  },
];

export const DEFAULT_ANNOTATION_COLOR_TOKEN = 'annotation-yellow';

export function annotationColorForToken(token: string | null | undefined): AnnotationColorOptionV1 {
  return ANNOTATION_COLOR_OPTIONS.find((option) => option.token === token)
    || ANNOTATION_COLOR_OPTIONS.find((option) => option.token === DEFAULT_ANNOTATION_COLOR_TOKEN)
    || ANNOTATION_COLOR_OPTIONS[0];
}
