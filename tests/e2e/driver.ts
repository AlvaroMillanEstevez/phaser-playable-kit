import type { Page } from 'playwright-core';

export interface Viewport {
  readonly width: number;
  readonly height: number;
}

/** How the smoke test plays a playable. Each playable has one in `smoke.ts`. */
export interface SmokeDriver {
  /** A point on the CTA button shown during gameplay. */
  ctaPoint(viewport: Viewport): { x: number; y: number };
  /** Performs one gameplay interaction (a tap, a drag...). */
  interact(page: Page, viewport: Viewport): Promise<void>;
}
