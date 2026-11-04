/**
 * Dev server for one playable: `npm run dev` (hello-world, preview network) or
 * `PLAYABLE=warung-sort NETWORK=meta npm run dev`. Production builds use scripts/build.ts.
 */
import path from 'node:path';
import { defineConfig } from 'vite';
import type { NetworkId } from './src/core/adapter.ts';
import type { PlayableConfig } from './src/core/playable-config.ts';
import { PLAYABLES_DIR } from './scripts/lib/paths.ts';
import { playableViteConfig } from './scripts/lib/vite-config.ts';

export default defineConfig(async () => {
  const playable = process.env.PLAYABLE ?? 'hello-world';
  const network = (process.env.NETWORK ?? 'preview') as NetworkId;
  const file = path.join(PLAYABLES_DIR, playable, 'playable.config.ts');
  const config = ((await import(file)) as { default: PlayableConfig }).default;
  return playableViteConfig({
    playable,
    network,
    orientation: config.orientation,
  });
});
