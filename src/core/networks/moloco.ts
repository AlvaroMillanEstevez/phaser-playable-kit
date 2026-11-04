import type { AdapterFactory } from '../adapter.ts';
import { createFbPlayableAdapter } from './fb-playable.ts';

/** See docs/networks.md#moloco for the requirements this adapter follows. */
export const createAdapter: AdapterFactory = (options) =>
  createFbPlayableAdapter('moloco', options);
