import type { NetworkId } from '../adapter.ts';

/**
 * Build-time facts about each network. Requirements and sources are documented in
 * docs/networks.md; every limit here is the strictest one found.
 *
 * Pure data: imported by the Vite config and the Node scripts, never by the ad itself.
 */

export type Orientation = 'portrait' | 'landscape' | 'portrait,landscape';

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
  /** Code the build must contain to reach the store through this network's API. */
  readonly ctaSignature: string;
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
    ctaSignature: '.open(',
  },
  unity: {
    id: 'unity',
    name: 'Unity Ads',
    status: 'supported',
    output: 'html',
    // Unity requires "less than 5 MB".
    maxBytes: 5 * MB - 1,
    ctaSignature: '.open(',
  },
  liftoff: {
    id: 'liftoff',
    name: 'Liftoff',
    status: 'testing',
    output: 'html',
    maxBytes: 5 * MB,
    ctaSignature: '.open(',
  },
  google: {
    id: 'google',
    name: 'Google Ads',
    status: 'supported',
    output: 'zip',
    maxBytes: 5 * MB,
    maxFiles: 512,
    ctaSignature: 'ExitApi',
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
    ctaSignature: 'FbPlayableAd',
  },
  moloco: {
    id: 'moloco',
    name: 'Moloco',
    status: 'testing',
    output: 'html',
    // Moloco requires "less than 5 MB".
    maxBytes: 5 * MB - 1,
    ctaSignature: 'FbPlayableAd',
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
