import type { AdapterFactory } from '../adapter.ts';
import { createMraidAdapter } from './mraid.ts';

/** See docs/networks.md#liftoff for the requirements this adapter follows. */
export const createAdapter: AdapterFactory = (options) => createMraidAdapter('liftoff', options);
