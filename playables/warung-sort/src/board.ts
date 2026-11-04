/**
 * Rules of the Warung Sort playable: a reduced version of Nusa: Warung Sort's core.
 * Shelves have three slots; moving an item into a free slot can complete a shelf of
 * three identical items, which clears it. The board is won when every shelf is empty.
 *
 * Pure TypeScript with no Phaser dependency, so it is fully unit-tested.
 */

export const SLOTS_PER_SHELF = 3;

export type ItemType = string;
export type Slot = ItemType | null;
export type Shelf = readonly Slot[];

export interface Board {
  readonly shelves: readonly Shelf[];
}

export interface SlotRef {
  readonly shelf: number;
  readonly slot: number;
}

export interface MoveResult {
  readonly board: Board;
  /** Index of the shelf cleared by this move, if any. */
  readonly cleared: number | null;
  readonly won: boolean;
}

export function createBoard(shelves: readonly Shelf[]): Board {
  const counts = new Map<ItemType, number>();
  shelves.forEach((shelf, index) => {
    if (shelf.length !== SLOTS_PER_SHELF) {
      throw new Error(`Shelf ${index} has ${shelf.length} slots, expected ${SLOTS_PER_SHELF}`);
    }
    for (const item of shelf) {
      if (item !== null) counts.set(item, (counts.get(item) ?? 0) + 1);
    }
  });
  for (const [item, count] of counts) {
    if (count % SLOTS_PER_SHELF !== 0) {
      throw new Error(`"${item}" appears ${count} times; every item must come in sets of three`);
    }
  }
  return { shelves: shelves.map((shelf) => [...shelf]) };
}

export function itemAt(board: Board, ref: SlotRef): Slot {
  return board.shelves[ref.shelf]?.[ref.slot] ?? null;
}

export function freeSlots(board: Board, shelf: number): number[] {
  const slots = board.shelves[shelf] ?? [];
  return slots.flatMap((item, index) => (item === null ? [index] : []));
}

export function canMove(board: Board, from: SlotRef, to: SlotRef): boolean {
  const inBounds = (ref: SlotRef): boolean =>
    ref.shelf >= 0 &&
    ref.shelf < board.shelves.length &&
    ref.slot >= 0 &&
    ref.slot < SLOTS_PER_SHELF;
  if (!inBounds(from) || !inBounds(to)) return false;
  if (from.shelf === to.shelf && from.slot === to.slot) return false;
  return itemAt(board, from) !== null && itemAt(board, to) === null;
}

/** Moves an item to a free slot. Returns `null` when the move is not allowed. */
export function move(board: Board, from: SlotRef, to: SlotRef): MoveResult | null {
  if (!canMove(board, from, to)) return null;
  const item = itemAt(board, from);
  const shelves = board.shelves.map((shelf) => [...shelf]);
  const source = shelves[from.shelf];
  const target = shelves[to.shelf];
  if (!source || !target) return null;
  source[from.slot] = null;
  target[to.slot] = item;

  let cleared: number | null = null;
  if (target.every((slot) => slot !== null && slot === item)) {
    target.fill(null);
    cleared = to.shelf;
  }
  const next: Board = { shelves };
  return { board: next, cleared, won: isEmpty(next) };
}

export function isEmpty(board: Board): boolean {
  return board.shelves.every((shelf) => shelf.every((slot) => slot === null));
}

/**
 * A move that completes a triple, used by the tutorial hand: a shelf with two equal
 * items and one free slot, plus that item somewhere else.
 */
export function findTripleMove(board: Board): { from: SlotRef; to: SlotRef } | null {
  for (const [shelfIndex, shelf] of board.shelves.entries()) {
    const free = shelf.indexOf(null);
    const items = shelf.filter((slot): slot is ItemType => slot !== null);
    const [first, second] = items;
    if (free === -1 || items.length !== 2 || first !== second || first === undefined) continue;
    for (const [otherIndex, other] of board.shelves.entries()) {
      if (otherIndex === shelfIndex) continue;
      const slot = other.indexOf(first);
      if (slot !== -1) {
        return { from: { shelf: otherIndex, slot }, to: { shelf: shelfIndex, slot: free } };
      }
    }
  }
  return null;
}
