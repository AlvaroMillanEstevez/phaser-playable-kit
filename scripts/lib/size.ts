import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { unzipSync } from 'fflate';
import {
  getNetworkSpec,
  isBuildNetwork,
  type BuildNetworkId,
} from '../../src/core/networks/specs.ts';
import { zipName } from './paths.ts';

/** The file uploaded to a network: index.html, or the ZIP for ZIP networks. */
export interface Deliverable {
  readonly playable: string;
  readonly network: BuildNetworkId;
  readonly file: string;
  readonly bytes: number;
  /** Number of entries, for ZIP deliverables. */
  readonly fileCount?: number;
}

export interface BudgetResult extends Deliverable {
  readonly maxBytes: number;
  readonly maxFiles?: number;
  readonly ok: boolean;
  readonly problems: readonly string[];
}

export function checkBudget(deliverable: Deliverable): BudgetResult {
  const spec = getNetworkSpec(deliverable.network);
  const problems: string[] = [];
  if (deliverable.bytes > spec.maxBytes) {
    problems.push(`${formatBytes(deliverable.bytes)} exceeds ${formatBytes(spec.maxBytes)}`);
  }
  if (
    spec.maxFiles !== undefined &&
    deliverable.fileCount !== undefined &&
    deliverable.fileCount > spec.maxFiles
  ) {
    problems.push(`${deliverable.fileCount} files exceed ${spec.maxFiles}`);
  }
  return {
    ...deliverable,
    maxBytes: spec.maxBytes,
    ...(spec.maxFiles !== undefined && { maxFiles: spec.maxFiles }),
    ok: problems.length === 0,
    problems,
  };
}

/** Finds the deliverable of every build under `distDir` (dist/<playable>/<network>/). */
export function findDeliverables(distDir: string): Deliverable[] {
  if (!existsSync(distDir)) return [];
  const deliverables: Deliverable[] = [];
  for (const playable of readdirSync(distDir).sort()) {
    const playableDir = path.join(distDir, playable);
    if (!statSync(playableDir).isDirectory()) continue;
    for (const network of readdirSync(playableDir).sort()) {
      if (!isBuildNetwork(network)) continue;
      const spec = getNetworkSpec(network);
      const isZip = spec.output === 'zip';
      const file = path.join(
        playableDir,
        network,
        isZip ? zipName(playable, network) : 'index.html',
      );
      if (!existsSync(file)) {
        throw new Error(`Missing deliverable ${path.relative(distDir, file)}`);
      }
      const bytes = statSync(file).size;
      deliverables.push(
        isZip
          ? { playable, network, file, bytes, fileCount: countZipEntries(file) }
          : { playable, network, file, bytes },
      );
    }
  }
  return deliverables;
}

function countZipEntries(file: string): number {
  return Object.keys(unzipSync(readFileSync(file))).length;
}

export function formatBytes(bytes: number): string {
  return `${(bytes / 1_000_000).toFixed(2)} MB`;
}

export function formatReport(results: readonly BudgetResult[]): string {
  const rows = results.map((r) => {
    const used = Math.round((r.bytes / r.maxBytes) * 100);
    const status = r.ok ? 'ok  ' : 'FAIL';
    return `${status}  ${r.playable.padEnd(14)} ${r.network.padEnd(9)} ${formatBytes(r.bytes).padStart(9)} / ${formatBytes(r.maxBytes).padEnd(8)} ${String(used).padStart(3)}%${r.ok ? '' : `  ${r.problems.join('; ')}`}`;
  });
  return ['      playable       network        size / limit     used', ...rows].join('\n');
}
