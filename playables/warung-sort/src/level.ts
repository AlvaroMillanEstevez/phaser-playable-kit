import { createBoard, type Board } from './board.ts';

export const ITEM_TYPES = ['ayam-goreng', 'mie-goreng', 'durian', 'manggis'] as const;

const [A, B, C, D] = ITEM_TYPES;

/**
 * The single level of the ad: six shelves, four kinds of food. The first triple is one
 * move away (the tutorial move), and the rest needs about six more moves.
 */
export function createLevel(): Board {
  return createBoard([
    [A, A, null],
    [B, C, A],
    [D, B, null],
    [C, D, null],
    [B, null, D],
    [C, null, null],
  ]);
}
