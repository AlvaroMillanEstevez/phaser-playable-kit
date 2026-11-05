/**
 * Rules of the Warung Kita playable: a reduced version of Warung Kita's loop. Cook nasi
 * goreng on a four-position stove and serve it to customers at the counter before their
 * patience runs out.
 *
 * Pure TypeScript with no Phaser dependency. Time only moves through `tick`, and clocks
 * only run after the first interaction, so the ad never punishes a player who has not
 * started yet.
 */

export const BURNERS = 4;
export const COUNTER_SLOTS = 3;

export const RULES = {
  cookMs: 1500,
  /** Coins per portion, as in the game. */
  price: 10,
  servedToWin: 5,
  lostToLose: 2,
  /** The ad ends anyway after this much play time. */
  playTimeMs: 30_000,
  /** Arrivals after the first interaction; the first customer is already waiting. */
  arrivalsMs: [2000, 4500, 7000, 9500, 12_000, 15_000, 18_000, 21_000],
  /** Patience of each customer in arrival order; the last value repeats. */
  patienceMs: [14_000, 12_000, 11_000, 10_000, 9000, 9000],
} as const;

export type BurnerState =
  | { readonly kind: 'empty' }
  | { readonly kind: 'cooking'; readonly elapsedMs: number }
  | { readonly kind: 'ready' };

export interface Customer {
  readonly id: number;
  readonly patienceMs: number;
  readonly waitedMs: number;
}

export type Status = 'playing' | 'won' | 'lost' | 'timeUp';

export interface Kitchen {
  readonly started: boolean;
  readonly playedMs: number;
  readonly burners: readonly BurnerState[];
  /** Counter positions; `null` when free. */
  readonly counter: readonly (Customer | null)[];
  /** Customers still to arrive (index into RULES.arrivalsMs). */
  readonly nextArrival: number;
  readonly nextId: number;
  readonly served: number;
  readonly lost: number;
  readonly coins: number;
  readonly status: Status;
}

export type KitchenEvent =
  | { readonly type: 'cookStarted'; readonly burner: number }
  | { readonly type: 'cooked'; readonly burner: number }
  | { readonly type: 'arrived'; readonly slot: number }
  | { readonly type: 'left'; readonly slot: number }
  | {
      readonly type: 'served';
      readonly slot: number;
      readonly burner: number;
      readonly coins: number;
    }
  | { readonly type: 'ended'; readonly status: Exclude<Status, 'playing'> };

export interface Step {
  readonly kitchen: Kitchen;
  readonly events: readonly KitchenEvent[];
}

const patienceFor = (index: number): number =>
  RULES.patienceMs[Math.min(index, RULES.patienceMs.length - 1)] ?? 9000;

export function createKitchen(): Kitchen {
  const counter: (Customer | null)[] = Array.from({ length: COUNTER_SLOTS }, () => null);
  counter[1] = { id: 0, patienceMs: patienceFor(0), waitedMs: 0 };
  return {
    started: false,
    playedMs: 0,
    burners: Array.from({ length: BURNERS }, () => ({ kind: 'empty' })),
    counter,
    nextArrival: 0,
    nextId: 1,
    served: 0,
    lost: 0,
    coins: 0,
    status: 'playing',
  };
}

/** Starts cooking on the first empty burner. */
export function cook(kitchen: Kitchen): Step {
  const burner = kitchen.burners.findIndex((b) => b.kind === 'empty');
  if (kitchen.status !== 'playing' || burner === -1) return { kitchen, events: [] };
  const burners = kitchen.burners.map((b, i) =>
    i === burner ? ({ kind: 'cooking', elapsedMs: 0 } as const) : b,
  );
  return {
    kitchen: { ...kitchen, started: true, burners },
    events: [{ type: 'cookStarted', burner }],
  };
}

/** Serves a ready plate to the customer at `slot`. */
export function serve(kitchen: Kitchen, burner: number, slot: number): Step {
  const customer = kitchen.counter[slot];
  if (kitchen.status !== 'playing' || kitchen.burners[burner]?.kind !== 'ready' || !customer) {
    return { kitchen, events: [] };
  }
  const served = kitchen.served + 1;
  const next: Kitchen = {
    ...kitchen,
    started: true,
    burners: kitchen.burners.map((b, i) => (i === burner ? { kind: 'empty' } : b)),
    counter: kitchen.counter.map((c, i) => (i === slot ? null : c)),
    served,
    coins: kitchen.coins + RULES.price,
  };
  const events: KitchenEvent[] = [{ type: 'served', slot, burner, coins: RULES.price }];
  return withStatus(next, events);
}

/** Advances cooking, patience, arrivals and play time. No-op before the first interaction. */
export function tick(kitchen: Kitchen, deltaMs: number): Step {
  if (!kitchen.started || kitchen.status !== 'playing') return { kitchen, events: [] };
  const events: KitchenEvent[] = [];
  const playedMs = kitchen.playedMs + deltaMs;

  const burners = kitchen.burners.map((burner, index): BurnerState => {
    if (burner.kind !== 'cooking') return burner;
    const elapsedMs = burner.elapsedMs + deltaMs;
    if (elapsedMs < RULES.cookMs) return { kind: 'cooking', elapsedMs };
    events.push({ type: 'cooked', burner: index });
    return { kind: 'ready' };
  });

  let lost = kitchen.lost;
  const counter = kitchen.counter.map((customer, slot) => {
    if (!customer) return null;
    const waitedMs = customer.waitedMs + deltaMs;
    if (waitedMs < customer.patienceMs) return { ...customer, waitedMs };
    lost += 1;
    events.push({ type: 'left', slot });
    return null;
  });

  let { nextArrival, nextId } = kitchen;
  while (
    nextArrival < RULES.arrivalsMs.length &&
    playedMs >= (RULES.arrivalsMs[nextArrival] ?? Infinity)
  ) {
    const slot = freeSlotNearestCenter(counter);
    if (slot === null) break;
    counter[slot] = { id: nextId, patienceMs: patienceFor(nextId), waitedMs: 0 };
    events.push({ type: 'arrived', slot });
    nextArrival += 1;
    nextId += 1;
  }

  return withStatus({ ...kitchen, playedMs, burners, counter, lost, nextArrival, nextId }, events);
}

function freeSlotNearestCenter(counter: readonly (Customer | null)[]): number | null {
  for (const slot of [1, 0, 2]) if (counter[slot] === null) return slot;
  return null;
}

function withStatus(kitchen: Kitchen, events: KitchenEvent[]): Step {
  let status: Status = 'playing';
  if (kitchen.served >= RULES.servedToWin) status = 'won';
  else if (kitchen.lost >= RULES.lostToLose) status = 'lost';
  else if (kitchen.playedMs >= RULES.playTimeMs) status = 'timeUp';
  if (status !== 'playing') events.push({ type: 'ended', status });
  return { kitchen: { ...kitchen, status }, events };
}

/** Fraction of patience left, 1 when the customer just arrived. */
export function patienceLeft(customer: Customer): number {
  return Math.max(0, 1 - customer.waitedMs / customer.patienceMs);
}

/** The waiting customer with the least patience left. */
export function mostUrgent(kitchen: Kitchen): number | null {
  let best: number | null = null;
  let bestLeft = Infinity;
  kitchen.counter.forEach((customer, slot) => {
    if (!customer) return;
    const left = customer.patienceMs - customer.waitedMs;
    if (left < bestLeft) {
      bestLeft = left;
      best = slot;
    }
  });
  return best;
}

export type Hint =
  | { readonly kind: 'cook' }
  | { readonly kind: 'serve'; readonly burner: number; readonly slot: number };

/** What the tutorial hand should show: serve the most urgent customer, else cook. */
export function hint(kitchen: Kitchen): Hint | null {
  if (kitchen.status !== 'playing') return null;
  const ready = kitchen.burners.findIndex((b) => b.kind === 'ready');
  const slot = mostUrgent(kitchen);
  if (ready !== -1 && slot !== null) return { kind: 'serve', burner: ready, slot };
  const waiting = kitchen.counter.filter(Boolean).length;
  const inProgress = kitchen.burners.filter((b) => b.kind !== 'empty').length;
  if (waiting > inProgress && kitchen.burners.some((b) => b.kind === 'empty'))
    return { kind: 'cook' };
  return null;
}
