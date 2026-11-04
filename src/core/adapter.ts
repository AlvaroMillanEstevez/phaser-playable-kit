/**
 * Contract between a playable and the ad network container.
 *
 * Each network ships its own implementation and the build picks exactly one of them,
 * so a build never contains code for other networks.
 */

export type NetworkId = 'preview' | 'applovin' | 'unity' | 'liftoff' | 'google' | 'meta' | 'moloco';

export interface StoreUrls {
  readonly ios: string;
  readonly android: string;
}

export type MraidState = 'loading' | 'default' | 'expanded' | 'resized' | 'hidden';

/** The subset of the MRAID 2.0/3.0 API the kit relies on. */
export interface Mraid {
  getState(): MraidState;
  isViewable(): boolean;
  open(url: string): void;
  addEventListener(event: 'ready', listener: () => void): void;
  addEventListener(event: 'viewableChange', listener: (viewable: boolean) => void): void;
  removeEventListener(event: string, listener: (...args: never[]) => void): void;
}

/**
 * The globals an adapter may touch. Adapters receive it explicitly so tests can pass
 * fakes instead of patching `window`.
 */
export interface AdGlobal {
  mraid?: Mraid | undefined;
  ExitApi?: { exit(): void } | undefined;
  FbPlayableAd?: { onCTAClick(): void } | undefined;
  readonly navigator: { readonly userAgent: string };
  readonly document: {
    readonly visibilityState: DocumentVisibilityState;
    addEventListener(type: 'visibilitychange', listener: () => void): void;
  };
}

export interface AdapterOptions {
  readonly storeUrls: StoreUrls;
  readonly global?: AdGlobal;
}

export interface NetworkAdapter {
  readonly network: NetworkId;
  /** Connects to the container. Safe to call more than once. */
  init(): void;
  /**
   * Runs `callback` once the container is ready and the ad is viewable, which is the
   * earliest moment gameplay may start. Runs immediately if that already happened.
   */
  onReady(callback: () => void): void;
  /** Subscribes to visibility changes. Returns an unsubscribe function. */
  onViewableChange(callback: (viewable: boolean) => void): () => void;
  isViewable(): boolean;
  /** Sends the player to the store through the network's own API. */
  cta(): void;
  /** Tells the network the main experience is over (no-op where unsupported). */
  gameEnd(): void;
}

export type AdapterFactory = (options: AdapterOptions) => NetworkAdapter;

/** Unity's recommended detection: Android by user agent, everything else is iOS. */
export function pickStoreUrl(userAgent: string, urls: StoreUrls): string {
  return /android/i.test(userAgent) ? urls.android : urls.ios;
}

export function browserGlobal(): AdGlobal {
  return window;
}
