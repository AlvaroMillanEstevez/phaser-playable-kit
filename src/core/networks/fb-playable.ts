import { browserGlobal, type AdapterOptions, type NetworkAdapter } from '../adapter.ts';
import { createPageAdapter } from './page.ts';

/**
 * Networks that use Meta's `FbPlayableAd.onCTAClick()` (Meta, Moloco). The store URL
 * comes from the campaign, and JavaScript redirects are forbidden, so there is no
 * fallback when the API is missing.
 */
export function createFbPlayableAdapter(
  network: 'meta' | 'moloco',
  options: AdapterOptions,
): NetworkAdapter {
  const g = options.global ?? browserGlobal();
  return createPageAdapter(network, options, {
    cta() {
      if (g.FbPlayableAd) g.FbPlayableAd.onCTAClick();
      else console.warn(`[playable] ${network}: FbPlayableAd not found`);
    },
  });
}
