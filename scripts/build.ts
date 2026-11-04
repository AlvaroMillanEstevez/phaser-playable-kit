/**
 * Builds every playable for every network into dist/<playable>/<network>/.
 *
 *   node scripts/build.ts                       # everything
 *   node scripts/build.ts --playable hello-world --network meta,unity
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { zipSync } from 'fflate';
import { build } from 'vite';
import {
  BUILD_NETWORKS,
  getNetworkSpec,
  isBuildNetwork,
  type BuildNetworkId,
} from '../src/core/networks/specs.ts';
import type { PlayableConfig } from '../src/core/playable-config.ts';
import { listPlayables, outputDir, PLAYABLES_DIR, zipName } from './lib/paths.ts';
import { playableViteConfig } from './lib/vite-config.ts';

const { values } = parseArgs({
  options: { playable: { type: 'string' }, network: { type: 'string' } },
});

const split = (value: string | undefined): string[] | undefined =>
  value
    ?.split(',')
    .map((v) => v.trim())
    .filter(Boolean);

const playables = split(values.playable) ?? listPlayables();
const requestedNetworks = split(values.network) ?? BUILD_NETWORKS;

const unknown = requestedNetworks.filter((n) => !isBuildNetwork(n));
if (unknown.length > 0) {
  console.error(`Unknown network(s): ${unknown.join(', ')}. Known: ${BUILD_NETWORKS.join(', ')}`);
  process.exit(1);
}
const networks = requestedNetworks as BuildNetworkId[];

async function loadConfig(playable: string): Promise<PlayableConfig> {
  const file = path.join(PLAYABLES_DIR, playable, 'playable.config.ts');
  const module = (await import(file)) as { default: PlayableConfig };
  return module.default;
}

for (const playable of playables) {
  const config = await loadConfig(playable);
  for (const network of networks) {
    const outDir = outputDir(playable, network);
    console.log(`\n▶ ${playable} → ${network}`);
    await build({
      ...playableViteConfig({ playable, network, orientation: config.orientation, outDir }),
      configFile: false,
      logLevel: 'warn',
    });
    if (getNetworkSpec(network).output === 'zip') {
      const html = readFileSync(path.join(outDir, 'index.html'));
      const zip = zipSync({ 'index.html': html }, { level: 9 });
      writeFileSync(path.join(outDir, zipName(playable, network)), zip);
    }
  }
}
console.log(`\nBuilt ${playables.length} playable(s) for ${networks.length} network(s).`);
