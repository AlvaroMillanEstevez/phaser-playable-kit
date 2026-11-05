/**
 * Builds the demo site into dist/site/ from the playable builds in dist/:
 * the demo page, a copy of every build under builds/ and builds/manifest.json.
 *
 *   npm run build && npm run build:demo
 */
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { build } from 'vite';
import type { DemoBuild, DemoManifest, DemoPlayable } from '../demo/src/manifest.ts';
import { getNetworkSpec } from '../src/core/networks/specs.ts';
import type { PlayableConfig } from '../src/core/playable-config.ts';
import { DIST_DIR, PLAYABLES_DIR, ROOT } from './lib/paths.ts';
import { findDeliverables } from './lib/size.ts';

const SITE_DIR = path.join(DIST_DIR, 'site');
/** Order of the playables in the demo: the two example games first. */
const ORDER = ['warung-sort', 'warung-kita', 'hello-world'];

const deliverables = findDeliverables(DIST_DIR).filter((d) => d.playable !== 'site');
if (deliverables.length === 0) {
  console.error('No builds found in dist/. Run `npm run build` first.');
  process.exit(1);
}

await build({
  configFile: false,
  root: path.join(ROOT, 'demo'),
  base: './',
  publicDir: false,
  envDir: false,
  logLevel: 'warn',
  build: { outDir: SITE_DIR, emptyOutDir: true, target: 'es2022' },
});

const playables: DemoPlayable[] = [];
for (const id of [...new Set(deliverables.map((d) => d.playable))]) {
  const configFile = path.join(PLAYABLES_DIR, id, 'playable.config.ts');
  if (!existsSync(configFile)) continue;
  const config = ((await import(configFile)) as { default: PlayableConfig }).default;
  const outDir = path.join(SITE_DIR, 'builds', id);
  mkdirSync(outDir, { recursive: true });

  const builds: DemoBuild[] = deliverables
    .filter((d) => d.playable === id)
    .map((d) => {
      const spec = getNetworkSpec(d.network);
      const html = `builds/${id}/${d.network}.html`;
      copyFileSync(path.join(DIST_DIR, id, d.network, 'index.html'), path.join(SITE_DIR, html));
      let download = html;
      if (spec.output === 'zip') {
        download = `builds/${id}/${path.basename(d.file)}`;
        copyFileSync(d.file, path.join(SITE_DIR, download));
      }
      return {
        network: d.network,
        name: spec.name,
        status: spec.status,
        family: spec.family,
        output: spec.output,
        maxBytes: spec.maxBytes,
        bytes: d.bytes,
        html,
        download,
      };
    });
  playables.push({ id, title: config.title, builds });
}

const rank = (id: string): number => (ORDER.includes(id) ? ORDER.indexOf(id) : ORDER.length);
playables.sort((a, b) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id));
const manifest: DemoManifest = { playables };
writeFileSync(
  path.join(SITE_DIR, 'builds', 'manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
console.log(`Demo site in ${path.relative(ROOT, SITE_DIR)}/ with ${deliverables.length} builds.`);
