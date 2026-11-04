import { describe, expect, it } from 'vitest';
import {
  canMove,
  createBoard,
  findTripleMove,
  freeSlots,
  isEmpty,
  move,
  type Board,
  type SlotRef,
} from '../src/board.ts';
import { createLevel } from '../src/level.ts';

const ref = (shelf: number, slot: number): SlotRef => ({ shelf, slot });

describe('createBoard', () => {
  it('rejects shelves without three slots', () => {
    expect(() => createBoard([['a', 'a']])).toThrow(/expected 3/);
  });

  it('rejects items that do not come in sets of three', () => {
    expect(() => createBoard([['a', 'a', null]])).toThrow(/sets of three/);
  });
});

describe('move', () => {
  const board = createBoard([
    ['a', 'a', null],
    ['a', 'b', null],
    ['b', 'b', null],
  ]);

  it('moves an item into a free slot', () => {
    const result = move(board, ref(1, 1), ref(1, 2));
    expect(result?.board.shelves[1]).toEqual(['a', null, 'b']);
    expect(result?.cleared).toBeNull();
  });

  it('does not mutate the original board', () => {
    move(board, ref(1, 0), ref(0, 2));
    expect(board.shelves[0]).toEqual(['a', 'a', null]);
  });

  it('clears a shelf that holds three identical items', () => {
    const result = move(board, ref(1, 0), ref(0, 2));
    expect(result?.cleared).toBe(0);
    expect(result?.board.shelves[0]).toEqual([null, null, null]);
    expect(result?.won).toBe(false);
  });

  it('rejects moves to an occupied slot, from an empty slot or out of bounds', () => {
    expect(move(board, ref(0, 0), ref(0, 1))).toBeNull();
    expect(move(board, ref(0, 2), ref(1, 2))).toBeNull();
    expect(move(board, ref(0, 0), ref(9, 0))).toBeNull();
    expect(canMove(board, ref(0, 0), ref(0, 0))).toBe(false);
  });

  it('reports the win when the last triple clears', () => {
    const almost = createBoard([
      ['a', 'a', null],
      ['a', null, null],
    ]);
    const result = move(almost, ref(1, 0), ref(0, 2));
    expect(result?.won).toBe(true);
    expect(result && isEmpty(result.board)).toBe(true);
  });
});

describe('findTripleMove', () => {
  it('finds the move that completes a pair', () => {
    const board = createBoard([
      ['a', 'a', null],
      ['b', 'a', 'b'],
      ['b', null, null],
    ]);
    expect(findTripleMove(board)).toEqual({ from: ref(1, 1), to: ref(0, 2) });
  });

  it('returns null when no pair can be completed', () => {
    const board = createBoard([
      ['a', 'b', null],
      ['b', 'a', null],
      ['a', 'b', null],
    ]);
    expect(findTripleMove(board)).toBeNull();
  });
});

describe('level', () => {
  it('starts with the tutorial move completing a triple', () => {
    const level = createLevel();
    const hint = findTripleMove(level);
    expect(hint).not.toBeNull();
    if (!hint) return;
    expect(move(level, hint.from, hint.to)?.cleared).toBe(hint.to.shelf);
  });

  it('can be won by a greedy player within 12 moves', () => {
    let board: Board = createLevel();
    let moves = 0;
    while (!isEmpty(board) && moves < 12) {
      const next = findTripleMove(board) ?? firstPairingMove(board);
      if (!next) break;
      const result = move(board, next.from, next.to);
      if (!result) break;
      board = result.board;
      moves += 1;
    }
    expect(isEmpty(board)).toBe(true);
    expect(moves).toBeLessThanOrEqual(12);
  });
});

/** Moves an item next to an equal one on a shelf that still has room for the third. */
function firstPairingMove(board: Board): { from: SlotRef; to: SlotRef } | null {
  for (const [s, shelf] of board.shelves.entries()) {
    const items = shelf.filter((x) => x !== null);
    const free = freeSlots(board, s);
    if (items.length !== 1 || free.length < 1) continue;
    const item = items[0];
    for (const [o, other] of board.shelves.entries()) {
      const slot = other.indexOf(item ?? null);
      if (o !== s && slot !== -1 && free[0] !== undefined) {
        return { from: ref(o, slot), to: ref(s, free[0]) };
      }
    }
  }
  return null;
}
