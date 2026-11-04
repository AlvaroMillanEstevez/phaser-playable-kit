import type { StoreUrls } from './adapter.ts';
import type { Orientation } from './networks/specs.ts';

/** Per-ad settings, read by both the ad code and the build. Keep it free of imports. */
export interface PlayableConfig {
  /** Folder name under playables/. */
  readonly id: string;
  readonly title: string;
  readonly orientation: Orientation;
  readonly storeUrls: StoreUrls;
}

export function definePlayable(config: PlayableConfig): PlayableConfig {
  for (const url of [config.storeUrls.ios, config.storeUrls.android]) {
    if (!url.startsWith('https://')) {
      throw new Error(`${config.id}: store URLs must use https (${url})`);
    }
  }
  return config;
}
