import type { SmokeDriver } from '../../tests/e2e/driver.ts';
import { findHint } from './src/board.ts';
import { computeLayout, slotPosition } from './src/layout.ts';
import { createLevel } from './src/level.ts';

export const driver: SmokeDriver = {
  ctaPoint: ({ width, height }) => computeLayout(width, height, 6).cta,
  async interact(page, { width, height }) {
    const layout = computeLayout(width, height, 6);
    const hint = findHint(createLevel());
    const fromShelf = hint && layout.shelves[hint.from.shelf];
    const toShelf = hint && layout.shelves[hint.to.shelf];
    if (!hint || !fromShelf || !toShelf) throw new Error('No tutorial move');
    const from = slotPosition(fromShelf, hint.from.slot);
    const to = slotPosition(toShelf, hint.to.slot);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 8 });
    await page.mouse.up();
  },
};
