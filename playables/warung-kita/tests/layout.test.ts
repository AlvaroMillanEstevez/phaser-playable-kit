import { describe, expect, it } from 'vitest';
import { computeLayout, type Box } from '../src/layout.ts';

const SCREENS = [
  ['phone portrait', 390, 844],
  ['small phone portrait', 320, 480],
  ['phone landscape', 844, 390],
  ['tablet portrait', 768, 1024],
  ['tablet landscape', 1024, 768],
] as const;

const inside = (box: Box, width: number, height: number): boolean =>
  box.x >= 0 && box.y >= 0 && box.x + box.width <= width && box.y + box.height <= height;

const overlaps = (a: Box, b: Box): boolean =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

describe.each(SCREENS)('computeLayout on %s', (_name, width, height) => {
  const layout = computeLayout(width, height);

  it('keeps the counter, stove and customers on screen', () => {
    expect(inside(layout.counter, width, height)).toBe(true);
    expect(inside(layout.stove, width, height)).toBe(true);
    for (const area of layout.customerAreas) expect(inside(area, width, height)).toBe(true);
  });

  it('keeps interactive areas out of the top band', () => {
    for (const area of layout.customerAreas) expect(area.y).toBeGreaterThanOrEqual(56);
    expect(layout.stove.y).toBeGreaterThanOrEqual(56);
  });

  it('does not overlap the stove with customers or the counter', () => {
    expect(overlaps(layout.stove, layout.counter)).toBe(false);
    for (const area of layout.customerAreas) expect(overlaps(layout.stove, area)).toBe(false);
  });

  it('places the CTA below the stove and above the bottom band', () => {
    expect(layout.cta.y).toBeGreaterThan(layout.stove.y + layout.stove.height);
    expect(layout.cta.y).toBeLessThan(height * 0.95);
  });

  it('keeps burners at least 44 px apart for touch', () => {
    const [a, b, c] = layout.burners;
    if (!a || !b || !c) throw new Error('missing burners');
    expect(Math.abs(b.x - a.x)).toBeGreaterThanOrEqual(44);
    expect(Math.abs(c.y - a.y)).toBeGreaterThanOrEqual(44);
  });

  it('gives each customer a touch area of at least 44 px', () => {
    for (const area of layout.customerAreas) {
      expect(area.width).toBeGreaterThanOrEqual(44);
      expect(area.height).toBeGreaterThanOrEqual(44);
    }
  });
});
