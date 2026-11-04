import { browserGlobal, type AdapterFactory } from '../adapter.ts';
import { createPageAdapter } from './page.ts';

/**
 * Google Ads App campaigns. The build injects Google's `exitapi.js` into `<head>`;
 * the store URL is configured in Google Ads, so `ExitApi.exit()` takes no arguments.
 */
export const createAdapter: AdapterFactory = (options) => {
  const g = options.global ?? browserGlobal();
  return createPageAdapter('google', options, {
    cta() {
      if (g.ExitApi) g.ExitApi.exit();
      else console.warn('[playable] google: ExitApi not found');
    },
  });
};
