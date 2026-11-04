import path from 'node:path';
import type { Plugin, UserConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import type { NetworkId } from '../../src/core/adapter.ts';
import { getNetworkSpec, isBuildNetwork, type Orientation } from '../../src/core/networks/specs.ts';
import { PLAYABLES_DIR, ROOT } from './paths.ts';

export interface PlayableBuildOptions {
  readonly playable: string;
  readonly network: NetworkId;
  readonly orientation: Orientation;
  readonly outDir?: string;
}

const SELF_CLOSING_VOID_TAG = /<(meta|link|br|hr|img|input)\b([^<>]*?)\s*\/>/gi;

/**
 * Inserts the network's required `<head>` markup before any other tag and rewrites
 * `<meta ... />` as `<meta ...>`, since Google rejects self-closing tags. Runs before
 * scripts are inlined, so it only ever sees the playable's own markup.
 */
function networkHtml(network: NetworkId, orientation: Orientation): Plugin {
  return {
    name: 'playable:network-html',
    transformIndexHtml: {
      order: 'pre',
      handler(source) {
        const html = source.replace(SELF_CLOSING_VOID_TAG, '<$1$2>');
        if (!isBuildNetwork(network)) return html;
        const head = getNetworkSpec(network).head?.({ orientation });
        if (!head) return html;
        return html.replace(/<head>/i, (tag) => `${tag}\n${head}`);
      },
    },
  };
}

/** Vite config for one playable and one network, shared by `vite dev` and the build. */
export function playableViteConfig(options: PlayableBuildOptions): UserConfig {
  const { playable, network, orientation } = options;
  return {
    root: path.join(PLAYABLES_DIR, playable),
    base: './',
    publicDir: false,
    envDir: false,
    resolve: {
      alias: {
        '@network': path.join(ROOT, 'src/core/networks', `${network}.ts`),
      },
    },
    plugins: [networkHtml(network, orientation), viteSingleFile({ removeViteModuleLoader: true })],
    build: {
      outDir: options.outDir ?? path.join(ROOT, 'dist', playable, network),
      emptyOutDir: true,
      // Unity supports Android 5+ and iOS 13+ webviews.
      target: ['es2019', 'safari13'],
      reportCompressedSize: false,
      sourcemap: false,
    },
  };
}
