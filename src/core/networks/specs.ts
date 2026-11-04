import type { NetworkId } from '../adapter.ts';

/**
 * Build-time facts about each network. Requirements and sources are documented in
 * docs/networks.md; every limit here is the strictest one found.
 *
 * Pure data: imported by the Vite config and the Node scripts, never by the ad itself.
 */

export type Orientation = 'portrait' | 'landscape' | 'portrait,landscape';

/** How the ad talks to the container: MRAID, Google's ExitApi or Meta's FbPlayableAd. */
export type NetworkFamily = 'mraid' | 'google' | 'fb';

/** Tokens a build of each family must contain to reach the store through its API. */
export const FAMILY_TOKENS: Record<NetworkFamily, readonly string[]> = {
  mraid: ['mraid', 'isViewable', 'viewableChange'],
  google: ['ExitApi', 'exit'],
  fb: ['FbPlayableAd', 'onCTAClick'],
};

export interface NetworkSpec {
  readonly id: NetworkId;
  readonly name: string;
  readonly status: 'supported' | 'testing';
  /** `html`: a single self-contained index.html. `zip`: index.html packed in a ZIP. */
  readonly output: 'html' | 'zip';
  /** Maximum size of the deliverable (the HTML file or the ZIP), in bytes. */
  readonly maxBytes: number;
  /** Maximum number of files inside the ZIP. */
  readonly maxFiles?: number;
  readonly family: NetworkFamily;
  /**
   * Identifiers the network forbids anywhere in the file. The build renames them (they
   * only appear in unused or feature-detection code in Phaser) and the validator fails
   * if any is left.
   */
  readonly forbiddenTokens?: readonly string[];
  /** Extra `<head>` markup required by the network, inserted before any script. */
  readonly head?: (context: { orientation: Orientation }) => string;
}

const MB = 1_000_000;

/** The only external URL allowed in any build: Google requires it in `<head>`. */
export const GOOGLE_EXIT_API_URL =
  'https://tpc.googlesyndication.com/pagead/gadgets/html5/api/exitapi.js';

export const NETWORKS = {
  applovin: {
    id: 'applovin',
    name: 'AppLovin',
    status: 'supported',
    output: 'html',
    maxBytes: 5 * MB,
    family: 'mraid',
  },
  unity: {
    id: 'unity',
    name: 'Unity Ads',
    status: 'supported',
    output: 'html',
    // Unity requires "less than 5 MB".
    maxBytes: 5 * MB - 1,
    family: 'mraid',
  },
  liftoff: {
    id: 'liftoff',
    name: 'Liftoff',
    status: 'testing',
    output: 'html',
    maxBytes: 5 * MB,
    family: 'mraid',
  },
  google: {
    id: 'google',
    name: 'Google Ads',
    status: 'supported',
    output: 'zip',
    maxBytes: 5 * MB,
    maxFiles: 512,
    family: 'google',
    // "Local storage methods can't be used."
    forbiddenTokens: ['localStorage'],
    head: ({ orientation }) =>
      `<meta name="ad.orientation" content="${orientation}">\n` +
      `<script type="text/javascript" src="${GOOGLE_EXIT_API_URL}"></script>`,
  },
  meta: {
    id: 'meta',
    name: 'Meta',
    status: 'supported',
    output: 'html',
    maxBytes: 2 * MB,
    family: 'fb',
  },
  moloco: {
    id: 'moloco',
    name: 'Moloco',
    status: 'testing',
    output: 'html',
    // Moloco requires "less than 5 MB".
    maxBytes: 5 * MB - 1,
    family: 'fb',
    // "The standalone playable must not include the JavaScript object XMLHttpRequest."
    forbiddenTokens: ['XMLHttpRequest'],
  },
} as const satisfies Record<Exclude<NetworkId, 'preview'>, NetworkSpec>;

export type BuildNetworkId = keyof typeof NETWORKS;

export const BUILD_NETWORKS = Object.keys(NETWORKS) as BuildNetworkId[];

export function isBuildNetwork(id: string): id is BuildNetworkId {
  return Object.hasOwn(NETWORKS, id);
}

export function getNetworkSpec(id: BuildNetworkId): NetworkSpec {
  return NETWORKS[id];
}
