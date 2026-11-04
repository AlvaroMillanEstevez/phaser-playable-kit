import type { SmokeDriver } from '../../tests/e2e/driver.ts';

export const driver: SmokeDriver = {
  ctaPoint: ({ width, height }) => ({ x: width / 2, y: height * 0.84 }),
  async interact(page, { width, height }) {
    await page.mouse.click(width / 2, height / 2);
  },
};
