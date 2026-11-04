/**
 * Loads every build in dist/ in headless Chromium with a fake ad container and checks
 * the behaviour the networks require:
 *
 * - MRAID builds render nothing before the ad is ready and viewable.
 * - The build makes no network request (Google's exitapi.js is the only exception).
 * - The CTA is ignored before the first gameplay interaction.
 * - After it, the CTA calls this network's API exactly once, with the right arguments.
 * - No JavaScript errors.
 *
 *   npm run build && npm run test:e2e
 *
 * Needs Chromium: `npx playwright-core install chromium-headless-shell`, or set CHROME
 * to a Chrome or Chromium executable.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, type Page } from 'playwright-core';
import {
  GOOGLE_EXIT_API_URL,
  NETWORKS,
  type BuildNetworkId,
} from '../../src/core/networks/specs.ts';
import type { PlayableConfig } from '../../src/core/playable-config.ts';
import { DIST_DIR, listPlayables, PLAYABLES_DIR } from '../../scripts/lib/paths.ts';
import type { SmokeDriver, Viewport } from './driver.ts';

const VIEWPORT: Viewport = { width: 390, height: 844 };
const READY_AT_MS = 300;
const VIEWABLE_AT_MS = 700;

declare global {
  interface Window {
    __calls: string[];
  }
}

/** A fake container exposing MRAID, ExitApi and FbPlayableAd that records every call. */
function installFakeContainer({
  readyAt,
  viewableAt,
}: {
  readyAt: number;
  viewableAt: number;
}): void {
  window.__calls = [];
  const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
  let state = 'loading';
  let viewable = false;
  const emit = (event: string, ...args: unknown[]): void => {
    for (const listener of listeners[event] ?? []) listener(...args);
  };
  Object.assign(window, {
    mraid: {
      getState: () => state,
      isViewable: () => viewable,
      open: (url: string) => window.__calls.push(`mraid.open(${url})`),
      addEventListener: (event: string, listener: (...args: unknown[]) => void) => {
        (listeners[event] ??= []).push(listener);
      },
      removeEventListener: () => undefined,
    },
    FbPlayableAd: {
      onCTAClick: (...args: unknown[]) =>
        window.__calls.push(`FbPlayableAd.onCTAClick(${args.join(',')})`),
    },
  });
  // Non-writable, so the real exitapi.js (blocked anyway) could not replace it.
  Object.defineProperty(window, 'ExitApi', {
    value: { exit: (...args: unknown[]) => window.__calls.push(`ExitApi.exit(${args.join(',')})`) },
    writable: false,
  });
  setTimeout(() => {
    state = 'default';
    emit('ready');
  }, readyAt);
  setTimeout(() => {
    viewable = true;
    emit('viewableChange', true);
  }, viewableAt);
}

function expectedCta(network: BuildNetworkId, config: PlayableConfig): string {
  switch (network) {
    case 'applovin':
    case 'unity':
    case 'liftoff':
      // The smoke test browser is not Android, so the iOS URL is expected.
      return `mraid.open(${config.storeUrls.ios})`;
    case 'google':
      return 'ExitApi.exit()';
    case 'meta':
    case 'moloco':
      return 'FbPlayableAd.onCTAClick()';
  }
}

const calls = (page: Page): Promise<string[]> => page.evaluate(() => window.__calls);

async function smoke(
  page: Page,
  playable: string,
  network: BuildNetworkId,
  config: PlayableConfig,
  driver: SmokeDriver,
): Promise<string[]> {
  const problems: string[] = [];
  const external: string[] = [];
  page.on('pageerror', (error) => problems.push(`JS error: ${error.message}`));
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith('file:') || url.startsWith('data:')) return route.continue();
    if (!(network === 'google' && url === GOOGLE_EXIT_API_URL)) external.push(url);
    return route.abort();
  });
  await page.addInitScript(installFakeContainer, {
    readyAt: READY_AT_MS,
    viewableAt: VIEWABLE_AT_MS,
  });
  await page.goto(pathToFileURL(path.join(DIST_DIR, playable, network, 'index.html')).href);

  const usesMraid = NETWORKS[network].family === 'mraid';
  if (usesMraid) {
    await page.waitForTimeout((READY_AT_MS + VIEWABLE_AT_MS) / 2);
    if ((await page.locator('canvas').count()) > 0) problems.push('rendered before viewable');
  }
  await page.waitForSelector('canvas', { timeout: 5000 });
  await page.waitForTimeout(800);

  const cta = driver.ctaPoint(VIEWPORT);
  await page.mouse.click(cta.x, cta.y);
  await page.waitForTimeout(100);
  if ((await calls(page)).length > 0) problems.push('CTA worked before the first interaction');

  await driver.interact(page, VIEWPORT);
  await page.waitForTimeout(400);
  await page.mouse.click(cta.x, cta.y);
  await page.waitForTimeout(200);
  const made = await calls(page);
  const expected = expectedCta(network, config);
  if (made.length !== 1 || made[0] !== expected) {
    problems.push(`expected CTA ${expected}, got ${JSON.stringify(made)}`);
  }
  if (external.length > 0) problems.push(`network requests: ${external.join(', ')}`);
  return problems;
}

const executablePath = process.env.CHROME;
const browser = await chromium.launch(executablePath ? { executablePath } : {});
let failures = 0;
let runs = 0;

for (const playable of listPlayables()) {
  const configModule = (await import(path.join(PLAYABLES_DIR, playable, 'playable.config.ts'))) as {
    default: PlayableConfig;
  };
  const driverFile = path.join(PLAYABLES_DIR, playable, 'smoke.ts');
  if (!existsSync(driverFile)) {
    console.error(`FAIL  ${playable}: missing smoke.ts driver`);
    failures++;
    continue;
  }
  const { driver } = (await import(driverFile)) as { driver: SmokeDriver };
  for (const network of Object.keys(NETWORKS) as BuildNetworkId[]) {
    if (!existsSync(path.join(DIST_DIR, playable, network, 'index.html'))) continue;
    runs++;
    const page = await browser.newPage({ viewport: VIEWPORT });
    const problems = await smoke(page, playable, network, configModule.default, driver);
    await page.close();
    if (problems.length > 0) failures++;
    console.log(
      `${problems.length === 0 ? 'ok  ' : 'FAIL'}  ${playable.padEnd(14)} ${network.padEnd(9)} ${problems.join('; ')}`,
    );
  }
}
await browser.close();

if (runs === 0) {
  console.error('No builds found in dist/. Run `npm run build` first.');
  process.exit(1);
}
if (failures > 0) {
  console.error(`\n${failures} of ${runs} smoke test(s) failed.`);
  process.exit(1);
}
console.log(`\nAll ${runs} smoke test(s) passed.`);
