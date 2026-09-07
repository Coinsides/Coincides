import { describe, expect, it } from 'vitest';
import { createPageFramePrintProfile } from './pageFramePrintScaleService';
import {
  derivePageReadingViewport,
  normalizePageReadingStepFactor,
  nudgePageReadingStepFactor,
  type PageReadingGear,
} from './pageReadingViewportService';

const printProfile = createPageFramePrintProfile('A4');
const options = {
  availableWidth: 680,
  availableHeight: 850,
  paperWidth: printProfile.width,
  paperHeight: printProfile.height,
  physicalScale: printProfile.physicalScale,
};

describe('page reading display scale', () => {
  const gears: PageReadingGear[] = ['fit_width', 'fit_page', 'physical'];
  const steps = Array.from({ length: 16 }, (_, index) => (index + 5) / 10);

  it.each(gears.flatMap((gear) => steps.map((stepFactor) => ({ gear, stepFactor }))))(
    'derives $gear at step $stepFactor without quantizing its base scale',
    ({ gear, stepFactor }) => {
      const result = derivePageReadingViewport({ ...options, viewState: { gear, stepFactor } });
      const expectedBaseScale = gear === 'physical'
        ? printProfile.physicalScale
        : gear === 'fit_page'
          ? Math.min(680 / printProfile.width, 850 / printProfile.height)
          : 680 / printProfile.width;

      expect(result.baseScale).toBe(expectedBaseScale);
      expect(result.displayScale).toBe(expectedBaseScale * stepFactor);
      expect(result.effectiveGear).toBe(gear);
    },
  );

  it('keeps the physical constant at full precision and independent of available dimensions', () => {
    const result = derivePageReadingViewport({
      ...options,
      availableWidth: 120,
      availableHeight: 200,
      viewState: { gear: 'physical', stepFactor: 1 },
    });
    expect(result.displayScale).toBe((210 / 25.4 * 96) / 904);
    expect(result.displayScale).not.toBe(Math.round(printProfile.physicalScale * 100) / 100);
  });

  it.each(steps)('degrades long-page fit_page to fit_width at step %s', (stepFactor) => {
    const longOptions = { ...options, paperHeight: printProfile.width * 3 + 1 };
    const result = derivePageReadingViewport({ ...longOptions, viewState: { gear: 'fit_page', stepFactor } });
    const fitWidth = derivePageReadingViewport({ ...longOptions, viewState: { gear: 'fit_width', stepFactor } });

    expect(result.gear).toBe('fit_page');
    expect(result.effectiveGear).toBe('fit_width');
    expect(result.isLongPage).toBe(true);
    expect(result.displayScale).toBe(fitWidth.displayScale);
  });

  it('uses a strict greater-than-three long-page threshold', () => {
    const result = derivePageReadingViewport({
      ...options,
      paperHeight: printProfile.width * 3,
      viewState: { gear: 'fit_page', stepFactor: 1 },
    });
    expect(result.isLongPage).toBe(false);
    expect(result.effectiveGear).toBe('fit_page');
    expect(result.displayScale).toBe(850 / (printProfile.width * 3));
  });

  it('does not apply the canvas zoom clamp to fitted display scales', () => {
    const viewState = { gear: 'fit_width' as const, stepFactor: 1 };
    expect(derivePageReadingViewport({ ...options, availableWidth: 90.4, viewState }).displayScale).toBeCloseTo(0.1);
    expect(derivePageReadingViewport({ ...options, availableWidth: 9040, viewState }).displayScale).toBe(10);
  });

  it('has finite positive fallbacks while the paper or available box is unmeasured', () => {
    for (const gear of gears) {
      const result = derivePageReadingViewport({
        viewState: { gear, stepFactor: Number.NaN },
        availableWidth: 0,
        availableHeight: Number.NaN,
        paperWidth: -1,
        paperHeight: Number.POSITIVE_INFINITY,
        physicalScale: 0,
      });
      expect(result.displayScale).toBe(1);
    }
  });

  it('does not mutate its input view state or unscaled paper dimensions', () => {
    const frozenOptions = Object.freeze({
      ...options,
      viewState: Object.freeze({ gear: 'fit_page' as const, stepFactor: 1.2 }),
    });
    derivePageReadingViewport(frozenOptions);
    expect(frozenOptions).toEqual({ ...options, viewState: { gear: 'fit_page', stepFactor: 1.2 } });
  });
});

describe('page reading manual steps', () => {
  it('walks exact 0.1 stops and remains within 0.5–2.0', () => {
    let factor = 0.5;
    for (let step = 6; step <= 20; step += 1) {
      factor = nudgePageReadingStepFactor(factor, 1);
      expect(factor).toBe(step / 10);
    }
    expect(nudgePageReadingStepFactor(factor, 1)).toBe(2);
    for (let step = 19; step >= 5; step -= 1) {
      factor = nudgePageReadingStepFactor(factor, -1);
      expect(factor).toBe(step / 10);
    }
    expect(nudgePageReadingStepFactor(factor, -1)).toBe(0.5);
  });

  it('normalizes only manual step input', () => {
    expect(normalizePageReadingStepFactor(0.43)).toBe(0.5);
    expect(normalizePageReadingStepFactor(2.9)).toBe(2);
    expect(normalizePageReadingStepFactor(1.13)).toBe(1.1);
    expect(normalizePageReadingStepFactor(Number.NaN)).toBe(1);
  });
});
