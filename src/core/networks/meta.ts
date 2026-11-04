import type { AdapterFactory } from '../adapter.ts';
import { createFbPlayableAdapter } from './fb-playable.ts';

/** See docs/networks.md#meta for the requirements this adapter follows. */
export const createAdapter: AdapterFactory = (options) => createFbPlayableAdapter('meta', options);
