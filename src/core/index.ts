import { createAdapter } from '@network';
import type { StoreUrls } from './adapter.ts';
import { PlayableRuntime, type PlayableEvent } from './runtime.ts';

export type { NetworkAdapter, NetworkId, StoreUrls } from './adapter.ts';
export type { AudioSink } from './audio.ts';
export { definePlayable, type PlayableConfig } from './playable-config.ts';
export { PlayableRuntime, type PlayableEvent } from './runtime.ts';

/** Name of the DOM event that mirrors the runtime's anonymous events on `window`. */
export const PLAYABLE_EVENT = 'playable:event';

const EVENTS: readonly PlayableEvent[] = ['start', 'interaction', 'end', 'cta'];

/**
 * Creates the runtime for the network chosen at build time. `@network` is an alias
 * the build points at one file in src/core/networks/, so only that adapter is bundled.
 *
 * Each anonymous event is also dispatched on `window` as a `playable:event`
 * CustomEvent whose detail is the event name, so test pages can observe the ad. Nothing
 * else is attached and nothing leaves the page.
 */
export function createPlayable(options: { storeUrls: StoreUrls }): PlayableRuntime {
  const runtime = new PlayableRuntime({
    adapter: createAdapter({ storeUrls: options.storeUrls }),
    interactionTarget: window,
  });
  for (const event of EVENTS) {
    runtime.on(event, () => {
      window.dispatchEvent(new CustomEvent(PLAYABLE_EVENT, { detail: event }));
    });
  }
  return runtime;
}
