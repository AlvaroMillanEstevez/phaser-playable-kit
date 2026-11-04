import { describe, expect, it } from 'vitest';
import { computeLayout, type Rect } from '../src/layout.ts';

const SCREENS = [
  ['phone portrait', 390, 844],
  ['small phone portrait', 320, 480],
  ['phone landscape', 844, 390],
  ['tablet portrait', 768, 1024],
  ['tablet landscape', 1024, 768],
] as const;

const overlaps = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

describe.each(SCREENS)('computeLayout on %s', (_name, width, height) => {
  const layout = computeLayout(width, height, 6);

  it('uses two columns in portrait and three in landscape', () => {
    expect(layout.columns).toBe(width < height ? 2 : 3);
  });

  it('keeps every shelf on screen and out of the top band and top corners', () => {
    for (const shelf of layout.shelves) {
      expect(shelf.x).toBeGreaterThanOrEqual(0);
      expect(shelf.x + shelf.width).toBeLessThanOrEqual(width);
      expect(shelf.y).toBeGreaterThanOrEqual(56);
      expect(shelf.y + shelf.height).toBeLessThanOrEqual(layout.cta.y);
    }
  });

  it('does not overlap shelves', () => {
    const { shelves } = layout;
    for (let i = 0; i < shelves.length; i++) {
      for (let j = i + 1; j < shelves.length; j++) {
        const [a, b] = [shelves[i], shelves[j]];
        if (a && b) expect(overlaps(a, b)).toBe(false);
      }
    }
  });

  it('keeps the CTA above the bottom band', () => {
    expect(layout.cta.y).toBeLessThan(height * 0.95);
    expect(layout.cta.y).toBeGreaterThan(layout.title.y);
  });

  it('gives every item a touch area of at least 44×44 px', () => {
    expect(layout.hitArea.width).toBeGreaterThanOrEqual(44);
    expect(layout.hitArea.height).toBeGreaterThanOrEqual(44);
  });
});
