import {
  browserGlobal,
  pickStoreUrl,
  type AdapterOptions,
  type Mraid,
  type NetworkAdapter,
  type NetworkId,
} from '../adapter.ts';
import { Lifecycle } from '../lifecycle.ts';

export interface MraidAdapterOptions extends AdapterOptions {
  /** How long to wait for the container to inject `window.mraid` before running standalone. */
  readonly mraidTimeoutMs?: number;
}

const POLL_MS = 50;
const DEFAULT_TIMEOUT_MS = 3000;

/**
 * Generic MRAID 2.0/3.0 adapter (AppLovin, Unity Ads, Liftoff).
 *
 * Follows the strictest common rules: wait for `ready`, then start only while
 * `isViewable()` is true, and open the store with `mraid.open`. The kit never adds a
 * `<script src="mraid.js">` tag because these SDKs inject MRAID themselves.
 */
export function createMraidAdapter(
  network: NetworkId,
  options: MraidAdapterOptions,
): NetworkAdapter {
  const g = options.global ?? browserGlobal();
  const timeoutMs = options.mraidTimeoutMs ?? DEFAULT_TIMEOUT_MS;
  const lifecycle = new Lifecycle();
  let containerReady = false;
  let initialised = false;
  let mraid: Mraid | undefined;

  const updateViewable = (viewable: boolean): void => {
    lifecycle.setViewable(viewable);
    if (containerReady && viewable) lifecycle.markReady();
  };

  const onContainerReady = (api: Mraid): void => {
    if (containerReady) return;
    containerReady = true;
    api.addEventListener('viewableChange', updateViewable);
    updateViewable(api.isViewable());
  };

  const connect = (api: Mraid): void => {
    mraid = api;
    if (api.getState() === 'loading') {
      api.addEventListener('ready', () => {
        onContainerReady(api);
      });
    } else {
      onContainerReady(api);
    }
  };

  const runStandalone = (): void => {
    console.warn(`[playable] ${network}: window.mraid not found, running standalone`);
    containerReady = true;
    updateViewable(g.document.visibilityState === 'visible');
    g.document.addEventListener('visibilitychange', () => {
      updateViewable(g.document.visibilityState === 'visible');
    });
  };

  const waitForMraid = (elapsed: number): void => {
    if (g.mraid) {
      connect(g.mraid);
    } else if (elapsed >= timeoutMs) {
      runStandalone();
    } else {
      setTimeout(() => {
        waitForMraid(elapsed + POLL_MS);
      }, POLL_MS);
    }
  };

  return {
    network,
    init() {
      if (initialised) return;
      initialised = true;
      waitForMraid(0);
    },
    onReady: (callback) => {
      lifecycle.onReady(callback);
    },
    onViewableChange: (callback) => lifecycle.onViewableChange(callback),
    isViewable: () => lifecycle.isViewable,
    cta() {
      if (!mraid || !containerReady) {
        console.warn(`[playable] ${network}: CTA ignored, MRAID is not ready`);
        return;
      }
      mraid.open(pickStoreUrl(g.navigator.userAgent, options.storeUrls));
    },
    gameEnd() {
      // MRAID has no standard completion call. Network profiles may add one later.
    },
  };
}
