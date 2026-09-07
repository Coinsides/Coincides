export type PageReadingGear = 'fit_width' | 'fit_page' | 'physical';

export interface PageReadingViewState {
  gear: PageReadingGear;
  stepFactor: number;
}

export const PAGE_READING_STEP_MIN = 0.5;
export const PAGE_READING_STEP_MAX = 2;
export const PAGE_READING_STEP_SIZE = 0.1;

export function createDefaultPageReadingViewState(): PageReadingViewState {
  return { gear: 'fit_width', stepFactor: 1 };
}

export function normalizePageReadingStepFactor(stepFactor: number): number {
  if (!Number.isFinite(stepFactor)) return 1;
  // Quantize only the user's step, never the physical or fitted display scale.
  return Math.max(5, Math.min(20, Math.round(stepFactor * 10))) / 10;
}

export function nudgePageReadingStepFactor(stepFactor: number, direction: -1 | 1): number {
  return normalizePageReadingStepFactor(normalizePageReadingStepFactor(stepFactor) + direction * PAGE_READING_STEP_SIZE);
}

export interface DerivePageReadingViewportOptions {
  viewState: PageReadingViewState;
  availableWidth: number;
  availableHeight: number;
  /** Unscaled paper outer box; the content layout width is independent of this fit. */
  paperWidth: number;
  paperHeight: number;
  /** Supplied by the print profile's single physical mapping definition. */
  physicalScale: number;
}

export interface PageReadingViewport {
  gear: PageReadingGear;
  effectiveGear: PageReadingGear;
  stepFactor: number;
  baseScale: number;
  displayScale: number;
  isLongPage: boolean;
}

function positiveFiniteOr(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function derivePageReadingViewport({
  viewState,
  availableWidth,
  availableHeight,
  paperWidth,
  paperHeight,
  physicalScale,
}: DerivePageReadingViewportOptions): PageReadingViewport {
  const width = positiveFiniteOr(paperWidth, 1);
  const height = positiveFiniteOr(paperHeight, 1);
  const fitWidthScale = positiveFiniteOr(availableWidth, width) / width;
  const fitHeightScale = positiveFiniteOr(availableHeight, height) / height;
  const isLongPage = height / width > 3;
  const effectiveGear = viewState.gear === 'fit_page' && isLongPage ? 'fit_width' : viewState.gear;
  const baseScale = effectiveGear === 'physical'
    ? positiveFiniteOr(physicalScale, 1)
    : effectiveGear === 'fit_page'
      ? Math.min(fitWidthScale, fitHeightScale)
      : fitWidthScale;
  const stepFactor = normalizePageReadingStepFactor(viewState.stepFactor);

  return {
    gear: viewState.gear,
    effectiveGear,
    stepFactor,
    baseScale,
    displayScale: baseScale * stepFactor,
    isLongPage,
  };
}
