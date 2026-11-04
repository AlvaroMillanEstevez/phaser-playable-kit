import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../..', import.meta.url));
export const PLAYABLES_DIR = path.join(ROOT, 'playables');
export const DIST_DIR = path.join(ROOT, 'dist');

/** Every folder under playables/ that has a playable.config.ts. */
export function listPlayables(): string[] {
  return readdirSync(PLAYABLES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => existsSync(path.join(PLAYABLES_DIR, name, 'playable.config.ts')))
    .sort();
}

export function outputDir(playable: string, network: string): string {
  return path.join(DIST_DIR, playable, network);
}

export function zipName(playable: string, network: string): string {
  return `${playable}-${network}.zip`;
}
