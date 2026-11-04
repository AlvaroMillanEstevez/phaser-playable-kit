/**
 * Static validation of every build in dist/. Fails on errors, prints warnings.
 * Run after `npm run build`.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { isBuildNetwork } from '../src/core/networks/specs.ts';
import type { PlayableConfig } from '../src/core/playable-config.ts';
import { DIST_DIR, PLAYABLES_DIR } from './lib/paths.ts';
import { validateBuild } from './lib/validate.ts';

if (!existsSync(DIST_DIR)) {
  console.error('No builds found in dist/. Run `npm run build` first.');
  process.exit(1);
}

let builds = 0;
let errors = 0;
let warnings = 0;
for (const playable of readdirSync(DIST_DIR).sort()) {
  const configFile = path.join(PLAYABLES_DIR, playable, 'playable.config.ts');
  if (!existsSync(configFile)) continue;
  const config = ((await import(configFile)) as { default: PlayableConfig }).default;
  for (const network of readdirSync(path.join(DIST_DIR, playable)).sort()) {
    const file = path.join(DIST_DIR, playable, network, 'index.html');
    if (!isBuildNetwork(network) || !existsSync(file)) continue;
    builds++;
    const findings = validateBuild(readFileSync(file, 'utf8'), network, {
      storeUrls: [config.storeUrls.ios, config.storeUrls.android],
    });
    const failed = findings.some((f) => f.severity === 'error');
    console.log(`${failed ? 'FAIL' : 'ok  '}  ${playable.padEnd(14)} ${network}`);
    for (const finding of findings) {
      console.log(`        ${finding.severity.padEnd(7)} ${finding.rule}: ${finding.message}`);
      if (finding.severity === 'error') errors++;
      else warnings++;
    }
  }
}

console.log(`\n${builds} build(s): ${errors} error(s), ${warnings} warning(s).`);
if (builds === 0 || errors > 0) process.exit(1);
