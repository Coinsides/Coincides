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
    accent: 'var(--paper-annotation-yellow-accent, #facc15)',
    background: 'var(--paper-annotation-yellow-background, rgba(250, 204, 21, 0.22))',
    badgeBackground: 'var(--paper-annotation-yellow-badge, rgba(113, 63, 18, 0.72))',
    text: 'var(--paper-annotation-yellow-text, #fef9c3)',
  },
  {
    token: 'annotation-blue',
    label: 'Blue',
    accent: 'var(--paper-annotation-blue-accent, #60a5fa)',
    background: 'var(--paper-annotation-blue-background, rgba(37, 99, 235, 0.24))',
    badgeBackground: 'var(--paper-annotation-blue-badge, rgba(30, 58, 138, 0.74))',
    text: 'var(--paper-annotation-blue-text, #dbeafe)',
  },
  {
    token: 'annotation-teal',
    label: 'Teal',
    accent: 'var(--paper-annotation-teal-accent, #2dd4bf)',
    background: 'var(--paper-annotation-teal-background, rgba(20, 184, 166, 0.24))',
    badgeBackground: 'var(--paper-annotation-teal-badge, rgba(17, 94, 89, 0.74))',
    text: 'var(--paper-annotation-teal-text, #ccfbf1)',
  },
  {
    token: 'annotation-violet',
    label: 'Violet',
    accent: 'var(--paper-annotation-violet-accent, #a78bfa)',
    background: 'var(--paper-annotation-violet-background, rgba(124, 58, 237, 0.23))',
    badgeBackground: 'var(--paper-annotation-violet-badge, rgba(76, 29, 149, 0.74))',
    text: 'var(--paper-annotation-violet-text, #ede9fe)',
  },
  {
    token: 'annotation-rose',
    label: 'Rose',
    accent: 'var(--paper-annotation-rose-accent, #fb7185)',
    background: 'var(--paper-annotation-rose-background, rgba(225, 29, 72, 0.22))',
    badgeBackground: 'var(--paper-annotation-rose-badge, rgba(136, 19, 55, 0.74))',
    text: 'var(--paper-annotation-rose-text, #ffe4e6)',
  },
  {
    token: 'annotation-slate',
    label: 'Slate',
    accent: 'var(--paper-annotation-slate-accent, #94a3b8)',
    background: 'var(--paper-annotation-slate-background, rgba(100, 116, 139, 0.24))',
    badgeBackground: 'var(--paper-annotation-slate-badge, rgba(51, 65, 85, 0.78))',
    text: 'var(--paper-annotation-slate-text, #e2e8f0)',
  },
];

export const DEFAULT_ANNOTATION_COLOR_TOKEN = 'annotation-yellow';

export function annotationColorForToken(token: string | null | undefined): AnnotationColorOptionV1 {
  return ANNOTATION_COLOR_OPTIONS.find((option) => option.token === token)
    || ANNOTATION_COLOR_OPTIONS.find((option) => option.token === DEFAULT_ANNOTATION_COLOR_TOKEN)
    || ANNOTATION_COLOR_OPTIONS[0];
}
