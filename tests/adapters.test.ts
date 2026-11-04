import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdapterFactory } from '../src/core/adapter.ts';
import { createAdapter as applovin } from '../src/core/networks/applovin.ts';
import { createAdapter as google } from '../src/core/networks/google.ts';
import { createAdapter as liftoff } from '../src/core/networks/liftoff.ts';
import { createAdapter as meta } from '../src/core/networks/meta.ts';
import { createAdapter as moloco } from '../src/core/networks/moloco.ts';
import { createMraidAdapter } from '../src/core/networks/mraid.ts';
import { createAdapter as preview } from '../src/core/networks/preview.ts';
import { createAdapter as unity } from '../src/core/networks/unity.ts';
import { ANDROID_UA, fakeGlobal, fakeMraid, STORE_URLS } from './helpers.ts';

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const mraidNetworks: [string, AdapterFactory][] = [
  ['applovin', applovin],
  ['unity', unity],
  ['liftoff', liftoff],
];

describe.each(mraidNetworks)('%s (MRAID)', (network, factory) => {
  it('reports its network id', () => {
    expect(factory({ storeUrls: STORE_URLS, global: fakeGlobal() }).network).toBe(network);
  });

  it('waits for ready and viewable before starting', () => {
    const mraid = fakeMraid();
    const adapter = factory({ storeUrls: STORE_URLS, global: fakeGlobal({ mraid }) });
    const onReady = vi.fn();
    adapter.init();
    adapter.onReady(onReady);

    mraid.fireReady();
    expect(onReady).not.toHaveBeenCalled();

    mraid.fireViewable(true);
    expect(onReady).toHaveBeenCalledOnce();
    expect(adapter.isViewable()).toBe(true);
  });

  it('starts immediately when the container is already ready and viewable', () => {
    const mraid = fakeMraid({ state: 'default', viewable: true });
    const adapter = factory({ storeUrls: STORE_URLS, global: fakeGlobal({ mraid }) });
    const onReady = vi.fn();
    adapter.init();
    adapter.onReady(onReady);
    expect(onReady).toHaveBeenCalledOnce();
  });

  it('forwards viewableChange events', () => {
    const mraid = fakeMraid({ state: 'default', viewable: true });
    const adapter = factory({ storeUrls: STORE_URLS, global: fakeGlobal({ mraid }) });
    const changes: boolean[] = [];
    adapter.onViewableChange((v) => changes.push(v));
    adapter.init();
    mraid.fireViewable(false);
    mraid.fireViewable(true);
    expect(changes).toEqual([true, false, true]);
  });

  it('opens the iOS store with mraid.open by default', () => {
    const mraid = fakeMraid({ state: 'default', viewable: true });
    const adapter = factory({ storeUrls: STORE_URLS, global: fakeGlobal({ mraid }) });
    adapter.init();
    adapter.cta();
    expect(mraid.open).toHaveBeenCalledWith(STORE_URLS.ios);
  });

  it('opens the Play Store on Android', () => {
    const mraid = fakeMraid({ state: 'default', viewable: true });
    const adapter = factory({
      storeUrls: STORE_URLS,
      global: fakeGlobal({ mraid }, ANDROID_UA),
    });
    adapter.init();
    adapter.cta();
    expect(mraid.open).toHaveBeenCalledWith(STORE_URLS.android);
  });

  it('does not call mraid.open before the container is ready', () => {
    const mraid = fakeMraid();
    const adapter = factory({ storeUrls: STORE_URLS, global: fakeGlobal({ mraid }) });
    adapter.init();
    adapter.cta();
    expect(mraid.open).not.toHaveBeenCalled();
  });
});

describe('createMraidAdapter injection timing', () => {
  it('waits for mraid to be injected after init', () => {
    vi.useFakeTimers();
    const global = fakeGlobal();
    const adapter = createMraidAdapter('unity', { storeUrls: STORE_URLS, global });
    const onReady = vi.fn();
    adapter.init();
    adapter.onReady(onReady);

    vi.advanceTimersByTime(200);
    global.mraid = fakeMraid({ state: 'default', viewable: true });
    vi.advanceTimersByTime(50);
    expect(onReady).toHaveBeenCalledOnce();
  });

  it('runs standalone when mraid never appears', () => {
    vi.useFakeTimers();
    const adapter = createMraidAdapter('applovin', {
      storeUrls: STORE_URLS,
      global: fakeGlobal(),
      mraidTimeoutMs: 500,
    });
    const onReady = vi.fn();
    adapter.init();
    adapter.onReady(onReady);
    vi.advanceTimersByTime(450);
    expect(onReady).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(onReady).toHaveBeenCalledOnce();
    expect(console.warn).toHaveBeenCalled();
  });
});

describe('google', () => {
  it('calls ExitApi.exit on CTA', () => {
    const exit = vi.fn();
    const adapter = google({ storeUrls: STORE_URLS, global: fakeGlobal({ ExitApi: { exit } }) });
    adapter.init();
    adapter.cta();
    expect(exit).toHaveBeenCalledOnce();
    expect(adapter.network).toBe('google');
  });

  it('is ready at init and follows page visibility', () => {
    const global = fakeGlobal({ ExitApi: { exit: vi.fn() } });
    const adapter = google({ storeUrls: STORE_URLS, global });
    const onReady = vi.fn();
    adapter.onReady(onReady);
    adapter.init();
    expect(onReady).toHaveBeenCalledOnce();
    expect(adapter.isViewable()).toBe(true);

    global.document.setVisibility('hidden');
    expect(adapter.isViewable()).toBe(false);
  });

  it('never touches mraid or FbPlayableAd', () => {
    const mraid = fakeMraid({ state: 'default', viewable: true });
    const onCTAClick = vi.fn();
    const exit = vi.fn();
    const adapter = google({
      storeUrls: STORE_URLS,
      global: fakeGlobal({ mraid, FbPlayableAd: { onCTAClick }, ExitApi: { exit } }),
    });
    adapter.init();
    adapter.cta();
    expect(mraid.open).not.toHaveBeenCalled();
    expect(onCTAClick).not.toHaveBeenCalled();
  });
});

describe.each([
  ['meta', meta],
  ['moloco', moloco],
] as const)('%s (FbPlayableAd)', (network, factory) => {
  it('calls FbPlayableAd.onCTAClick with no arguments', () => {
    const onCTAClick = vi.fn();
    const mraid = fakeMraid({ state: 'default', viewable: true });
    const adapter = factory({
      storeUrls: STORE_URLS,
      global: fakeGlobal({ FbPlayableAd: { onCTAClick }, mraid }),
    });
    adapter.init();
    adapter.cta();
    expect(onCTAClick).toHaveBeenCalledWith();
    expect(mraid.open).not.toHaveBeenCalled();
    expect(adapter.network).toBe(network);
  });

  it('does not fall back to a redirect when the API is missing', () => {
    const adapter = factory({ storeUrls: STORE_URLS, global: fakeGlobal() });
    adapter.init();
    expect(() => {
      adapter.cta();
    }).not.toThrow();
    expect(console.warn).toHaveBeenCalled();
  });
});

describe('preview', () => {
  it('logs the CTA instead of navigating', () => {
    const adapter = preview({ storeUrls: STORE_URLS, global: fakeGlobal() });
    adapter.init();
    adapter.cta();
    adapter.gameEnd();
    expect(console.info).toHaveBeenCalledWith('[playable] preview: CTA ->', STORE_URLS.ios);
  });
});
