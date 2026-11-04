import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { zipSync } from 'fflate';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NETWORKS } from '../src/core/networks/specs.ts';
import { checkBudget, findDeliverables, formatReport } from '../scripts/lib/size.ts';

describe('checkBudget', () => {
  it('passes a build exactly at the limit', () => {
    const result = checkBudget({
      playable: 'demo',
      network: 'meta',
      file: 'x',
      bytes: NETWORKS.meta.maxBytes,
    });
    expect(result.ok).toBe(true);
  });

  it('fails a build one byte over the limit', () => {
    const result = checkBudget({
      playable: 'demo',
      network: 'meta',
      file: 'x',
      bytes: NETWORKS.meta.maxBytes + 1,
    });
    expect(result.ok).toBe(false);
    expect(result.problems[0]).toMatch(/exceeds 2\.00 MB/);
  });

  it('applies "less than 5 MB" strictly for Unity', () => {
    const result = checkBudget({ playable: 'demo', network: 'unity', file: 'x', bytes: 5_000_000 });
    expect(result.ok).toBe(false);
  });

  it('uses decimal megabytes, the stricter reading of "5 MB"', () => {
    const result = checkBudget({
      playable: 'demo',
      network: 'applovin',
      file: 'x',
      bytes: 5_000_001,
    });
    expect(result.ok).toBe(false);
  });

  it('fails a Google ZIP with too many files', () => {
    const result = checkBudget({
      playable: 'demo',
      network: 'google',
      file: 'x',
      bytes: 1000,
      fileCount: 513,
    });
    expect(result.ok).toBe(false);
    expect(result.problems).toEqual(['513 files exceed 512']);
  });
});

describe('findDeliverables', () => {
  let dist: string;
  beforeEach(() => {
    dist = mkdtempSync(path.join(tmpdir(), 'ppk-size-'));
  });
  afterEach(() => {
    rmSync(dist, { recursive: true, force: true });
  });

  it('measures index.html for HTML networks and the ZIP for ZIP networks', () => {
    mkdirSync(path.join(dist, 'demo/meta'), { recursive: true });
    writeFileSync(path.join(dist, 'demo/meta/index.html'), 'x'.repeat(1234));
    mkdirSync(path.join(dist, 'demo/google'), { recursive: true });
    writeFileSync(path.join(dist, 'demo/google/index.html'), 'x'.repeat(9999));
    const zip = zipSync({ 'index.html': new Uint8Array(10), 'a.png': new Uint8Array(5) });
    writeFileSync(path.join(dist, 'demo/google/demo-google.zip'), zip);

    const found = findDeliverables(dist);
    expect(found.map((d) => [d.network, d.bytes, d.fileCount])).toEqual([
      ['google', zip.byteLength, 2],
      ['meta', 1234, undefined],
    ]);
  });

  it('ignores folders that are not networks', () => {
    mkdirSync(path.join(dist, 'demo/assets'), { recursive: true });
    expect(findDeliverables(dist)).toEqual([]);
  });

  it('throws when a build folder has no deliverable', () => {
    mkdirSync(path.join(dist, 'demo/unity'), { recursive: true });
    expect(() => findDeliverables(dist)).toThrow(/Missing deliverable/);
  });

  it('reports over-budget builds in the table', () => {
    const report = formatReport([
      checkBudget({ playable: 'demo', network: 'meta', file: 'x', bytes: 3_000_000 }),
    ]);
    expect(report).toContain('FAIL');
    expect(report).toContain('150%');
  });
});
