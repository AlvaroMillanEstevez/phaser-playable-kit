import { browserGlobal, pickStoreUrl, type AdapterFactory } from '../adapter.ts';
import { createPageAdapter } from './page.ts';

/** Local development: no container, the CTA is only logged. */
export const createAdapter: AdapterFactory = (options) => {
  const g = options.global ?? browserGlobal();
  return createPageAdapter('preview', options, {
    cta() {
      console.info(
        '[playable] preview: CTA ->',
        pickStoreUrl(g.navigator.userAgent, options.storeUrls),
      );
    },
    gameEnd() {
      console.info('[playable] preview: gameEnd');
    },
  });
};
