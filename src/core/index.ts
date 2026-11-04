import { createAdapter } from '@network';
import type { StoreUrls } from './adapter.ts';
import { PlayableRuntime } from './runtime.ts';

export type { NetworkAdapter, NetworkId, StoreUrls } from './adapter.ts';
export type { AudioSink } from './audio.ts';
export { definePlayable, type PlayableConfig } from './playable-config.ts';
export { PlayableRuntime, type PlayableEvent } from './runtime.ts';

/**
 * Creates the runtime for the network chosen at build time. `@network` is an alias
 * the build points at one file in src/core/networks/, so only that adapter is bundled.
 */
export function createPlayable(options: { storeUrls: StoreUrls }): PlayableRuntime {
  return new PlayableRuntime({
    adapter: createAdapter({ storeUrls: options.storeUrls }),
    interactionTarget: window,
  });
}
