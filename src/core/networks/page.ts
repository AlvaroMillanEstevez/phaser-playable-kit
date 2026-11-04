import {
  browserGlobal,
  type AdapterOptions,
  type NetworkAdapter,
  type NetworkId,
} from '../adapter.ts';
import { Lifecycle } from '../lifecycle.ts';

/**
 * Base for networks without MRAID: the page is ready as soon as the script runs and
 * visibility follows the Page Visibility API.
 */
export function createPageAdapter(
  network: NetworkId,
  options: AdapterOptions,
  hooks: { cta(): void; gameEnd?(): void },
): NetworkAdapter {
  const g = options.global ?? browserGlobal();
  const lifecycle = new Lifecycle();
  let initialised = false;

  return {
    network,
    init() {
      if (initialised) return;
      initialised = true;
      const sync = (): void => {
        lifecycle.setViewable(g.document.visibilityState === 'visible');
      };
      sync();
      g.document.addEventListener('visibilitychange', sync);
      lifecycle.markReady();
    },
    onReady: (callback) => {
      lifecycle.onReady(callback);
    },
    onViewableChange: (callback) => lifecycle.onViewableChange(callback),
    isViewable: () => lifecycle.isViewable,
    cta: () => {
      hooks.cta();
    },
    gameEnd: () => hooks.gameEnd?.(),
  };
}
