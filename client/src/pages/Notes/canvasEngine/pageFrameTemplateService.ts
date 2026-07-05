import {
  DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE,
  DEFAULT_PAGE_FRAME_PAGE_SIZE,
  createPageFramePrintProfile,
} from './pageFramePrintScaleService';
import type {
  CanvasInset,
  PageFrameBackgroundStyle,
  PageFrameModel,
  PageFramePageSize,
  PageFrameTemplate,
  PageFrameTemplateId,
} from './types';

export const DEFAULT_PAGE_FRAME_TEMPLATE_ID: PageFrameTemplateId = 'a4_portrait';

const DEFAULT_PAPER_BACKGROUND: PageFrameBackgroundStyle = {
  kind: 'paper',
  fill: '#101114',
  borderColor: '#2a2f38',
  shadow: '0 18px 46px rgba(0, 0, 0, 0.24)',
  gridVisible: false,
};

const SCREEN_NOTE_BACKGROUND: PageFrameBackgroundStyle = {
  kind: 'screen',
  fill: '#111722',
  borderColor: '#243248',
  shadow: '0 16px 40px rgba(0, 0, 0, 0.20)',
  gridVisible: true,
};

const CUSTOM_BACKGROUND: PageFrameBackgroundStyle = {
  kind: 'custom',
  fill: '#101114',
  borderColor: '#2a2f38',
  shadow: '0 18px 46px rgba(0, 0, 0, 0.22)',
  gridVisible: false,
};

function cloneInset(inset: CanvasInset): CanvasInset {
  return {
    top: inset.top,
    right: inset.right,
    bottom: inset.bottom,
    left: inset.left,
  };
}

function cloneBackground(background: PageFrameBackgroundStyle): PageFrameBackgroundStyle {
  return {
    ...background,
  };
}

function createPrintTemplate({
  templateId,
  label,
  pageSize,
}: {
  templateId: PageFrameTemplateId;
  label: string;
  pageSize: Exclude<PageFramePageSize, 'Custom'>;
}): PageFrameTemplate {
  const profile = createPageFramePrintProfile(pageSize);
  return {
    templateId,
    label,
    pageSize: profile.pageSize,
    width: profile.width,
    height: profile.height,
    contentInset: cloneInset(profile.contentInset),
    background: cloneBackground(DEFAULT_PAPER_BACKGROUND),
    exportable: true,
    defaultTypographyToken: DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE.profileId,
  };
}

const SCREEN_NOTE_CONTENT_INSET: CanvasInset = {
  top: 48,
  right: 64,
  bottom: 64,
  left: 64,
};

export const PAGE_FRAME_TEMPLATE_PRESETS: PageFrameTemplate[] = [
  createPrintTemplate({
    templateId: 'a4_portrait',
    label: 'A4 portrait',
    pageSize: 'A4',
  }),
  createPrintTemplate({
    templateId: 'letter_portrait',
    label: 'Letter portrait',
    pageSize: 'Letter',
  }),
  {
    templateId: 'screen_note',
    label: 'Screen note',
    pageSize: 'Custom',
    width: 1120,
    height: 720,
    contentInset: cloneInset(SCREEN_NOTE_CONTENT_INSET),
    background: cloneBackground(SCREEN_NOTE_BACKGROUND),
    exportable: false,
    defaultTypographyToken: DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE.profileId,
  },
  {
    templateId: 'custom',
    label: 'Custom',
    pageSize: 'Custom',
    width: createPageFramePrintProfile(DEFAULT_PAGE_FRAME_PAGE_SIZE).width,
    height: createPageFramePrintProfile(DEFAULT_PAGE_FRAME_PAGE_SIZE).height,
    contentInset: cloneInset(createPageFramePrintProfile(DEFAULT_PAGE_FRAME_PAGE_SIZE).contentInset),
    background: cloneBackground(CUSTOM_BACKGROUND),
    exportable: true,
    defaultTypographyToken: DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE.profileId,
  },
];

const PAGE_FRAME_TEMPLATE_BY_ID = new Map(
  PAGE_FRAME_TEMPLATE_PRESETS.map((template) => [template.templateId, template]),
);

export function inferPageFrameTemplateId(pageSize?: PageFramePageSize): PageFrameTemplateId {
  if (pageSize === 'Letter') return 'letter_portrait';
  if (pageSize === 'Custom') return 'custom';
  return DEFAULT_PAGE_FRAME_TEMPLATE_ID;
}

export function createPageFrameTemplate(
  templateId: PageFrameTemplateId = DEFAULT_PAGE_FRAME_TEMPLATE_ID,
  overrides: Partial<PageFrameTemplate> = {},
): PageFrameTemplate {
  const preset = PAGE_FRAME_TEMPLATE_BY_ID.get(templateId)
    || PAGE_FRAME_TEMPLATE_BY_ID.get(DEFAULT_PAGE_FRAME_TEMPLATE_ID)!;
  const nextBackground = overrides.background || preset.background;
  const nextContentInset = overrides.contentInset || preset.contentInset;
  return {
    ...preset,
    ...overrides,
    templateId: overrides.templateId || preset.templateId,
    contentInset: cloneInset(nextContentInset),
    background: cloneBackground(nextBackground),
  };
}

export function resolvePageFrameTemplate(pageFrame?: Partial<PageFrameModel>): PageFrameTemplate {
  const templateId = pageFrame?.templateId || inferPageFrameTemplateId(pageFrame?.pageSize);
  return createPageFrameTemplate(templateId, {
    pageSize: pageFrame?.pageSize,
    width: pageFrame?.width,
    height: pageFrame?.height,
    contentInset: pageFrame?.contentInset,
    background: pageFrame?.background,
    exportable: pageFrame?.exportable,
  });
}

export function applyPageFrameTemplate(
  pageFrame: PageFrameModel,
  template: PageFrameTemplate = createPageFrameTemplate(),
): PageFrameModel {
  return {
    ...pageFrame,
    templateId: template.templateId,
    pageSize: template.pageSize,
    width: template.width,
    height: template.height,
    contentInset: cloneInset(template.contentInset),
    background: cloneBackground(template.background),
    exportable: template.exportable,
  };
}

export function pageFrameTemplateToCssVars(
  templateOrBackground: PageFrameTemplate | PageFrameBackgroundStyle | null | undefined,
): Record<string, string> {
  const background = templateOrBackground && 'background' in templateOrBackground
    ? templateOrBackground.background
    : templateOrBackground || DEFAULT_PAPER_BACKGROUND;
  return {
    '--page-frame-background': background.fill,
    '--page-frame-border-color': background.borderColor,
    '--page-frame-shadow': background.shadow,
    '--page-frame-grid-visible': background.gridVisible ? '1' : '0',
  };
}
