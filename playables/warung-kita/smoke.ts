import type { SmokeDriver } from '../../tests/e2e/driver.ts';
import { computeLayout } from './src/layout.ts';

export const driver: SmokeDriver = {
  ctaPoint: ({ width, height }) => computeLayout(width, height).cta,
  async interact(page, { width, height }) {
    const { stove } = computeLayout(width, height);
    await page.mouse.click(stove.x + stove.width / 2, stove.y + stove.height / 2);
  },
};
