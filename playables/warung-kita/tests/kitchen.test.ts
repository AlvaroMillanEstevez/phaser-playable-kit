import { describe, expect, it } from 'vitest';
import {
  cook,
  createKitchen,
  hint,
  mostUrgent,
  patienceLeft,
  RULES,
  serve,
  tick,
  type Kitchen,
} from '../src/kitchen.ts';

/** Ticks in 100 ms steps, like frames, collecting the kitchen state. */
function advance(kitchen: Kitchen, ms: number): Kitchen {
  let state = kitchen;
  for (let t = 0; t < ms; t += 100) state = tick(state, 100).kitchen;
  return state;
}

describe('kitchen', () => {
  it('starts with one customer waiting and the clock stopped', () => {
    const kitchen = createKitchen();
    expect(kitchen.counter.filter(Boolean)).toHaveLength(1);
    const later = advance(kitchen, 60_000);
    expect(later).toEqual(kitchen);
  });

  it('cooks on the first empty burner and finishes after cookMs', () => {
    let state = cook(createKitchen()).kitchen;
    expect(state.started).toBe(true);
    expect(state.burners[0]?.kind).toBe('cooking');
    state = cook(state).kitchen;
    expect(state.burners[1]?.kind).toBe('cooking');

    const step = tick(state, RULES.cookMs);
    expect(step.kitchen.burners[0]?.kind).toBe('ready');
    expect(step.events).toContainEqual({ type: 'cooked', burner: 0 });
  });

  it('ignores cooking when all four burners are busy', () => {
    let state = createKitchen();
    for (let i = 0; i < 4; i++) state = cook(state).kitchen;
    expect(cook(state).events).toEqual([]);
  });

  it('serves a ready plate to a waiting customer for coins', () => {
    let state = advance(cook(createKitchen()).kitchen, RULES.cookMs);
    const step = serve(state, 0, 1);
    state = step.kitchen;
    expect(state.served).toBe(1);
    expect(state.coins).toBe(RULES.price);
    expect(state.counter[1]).toBeNull();
    expect(state.burners[0]?.kind).toBe('empty');
  });

  it('rejects serving a plate that is not ready or an empty slot', () => {
    const cooking = cook(createKitchen()).kitchen;
    expect(serve(cooking, 0, 1).events).toEqual([]);
    const ready = advance(cooking, RULES.cookMs);
    expect(serve(ready, 0, 0).events).toEqual([]);
  });

  it('lets customers leave when patience runs out', () => {
    const state = advance(cook(createKitchen()).kitchen, RULES.patienceMs[0] + 100);
    expect(state.lost).toBeGreaterThanOrEqual(1);
  });

  it('brings new customers over time, without exceeding the counter', () => {
    const state = advance(cook(createKitchen()).kitchen, 8000);
    expect(state.counter.filter(Boolean).length).toBeLessThanOrEqual(3);
    expect(state.nextArrival).toBeGreaterThan(0);
  });

  it('is lost after two customers leave', () => {
    const state = advance(cook(createKitchen()).kitchen, 20_000);
    expect(state.status).toBe('lost');
  });

  it('is won by a player who follows the hints within 20 seconds', () => {
    let state = createKitchen();
    let elapsed = 0;
    while (state.status === 'playing' && elapsed < 20_000) {
      const next = hint(state);
      if (next?.kind === 'cook') state = cook(state).kitchen;
      else if (next?.kind === 'serve') state = serve(state, next.burner, next.slot).kitchen;
      state = tick(state, 250).kitchen;
      elapsed += 250;
    }
    expect(state.status).toBe('won');
    expect(state.lost).toBe(0);
  });

  it('ends with timeUp after the play time if nothing else ends it', () => {
    const state: Kitchen = {
      ...createKitchen(),
      started: true,
      lost: 0,
      counter: [null, null, null],
    };
    const end = tick({ ...state, nextArrival: RULES.arrivalsMs.length }, RULES.playTimeMs);
    expect(end.kitchen.status).toBe('timeUp');
  });

  it('points the hint at the most urgent customer', () => {
    let state = cook(createKitchen()).kitchen;
    // Before the second customer arrives (2 s), so there is no tie.
    state = advance(state, 1500);
    const urgent = mostUrgent(state);
    expect(urgent).toBe(1);
    const customer = state.counter[1];
    expect(customer && patienceLeft(customer)).toBeLessThan(1);
    expect(hint(state)).toEqual({ kind: 'serve', burner: 0, slot: 1 });
  });

  it('first hints cooking, as the tutorial does', () => {
    expect(hint(createKitchen())).toEqual({ kind: 'cook' });
  });
});
