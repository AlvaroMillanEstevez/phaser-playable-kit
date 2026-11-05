import type { BuildNetworkId, NetworkFamily } from '../../src/core/networks/specs.ts';

/** builds/manifest.json, written by scripts/build-demo.ts. */
export interface DemoManifest {
  readonly playables: readonly DemoPlayable[];
}

export interface DemoPlayable {
  readonly id: string;
  readonly title: string;
  readonly builds: readonly DemoBuild[];
}

export interface DemoBuild {
  readonly network: BuildNetworkId;
  readonly name: string;
  readonly status: 'supported' | 'testing';
  readonly family: NetworkFamily;
  readonly output: 'html' | 'zip';
  readonly maxBytes: number;
  /** Size of the deliverable (HTML or ZIP). */
  readonly bytes: number;
  /** Path of the HTML, relative to the site. */
  readonly html: string;
  /** Path of the file to download (the HTML or the ZIP). */
  readonly download: string;
}
