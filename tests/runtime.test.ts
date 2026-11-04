import { describe, expect, it, vi } from 'vitest';
import type { NetworkAdapter } from '../src/core/adapter.ts';
import { Lifecycle } from '../src/core/lifecycle.ts';
import { PlayableRuntime, type PlayableEvent } from '../src/core/runtime.ts';

function stubAdapter() {
  const lifecycle = new Lifecycle();
  const adapter = {
    network: 'preview',
    init: vi.fn(),
    onReady: (cb: () => void) => {
      lifecycle.onReady(cb);
    },
    onViewableChange: (cb: (v: boolean) => void) => lifecycle.onViewableChange(cb),
    isViewable: () => lifecycle.isViewable,
    cta: vi.fn(),
    gameEnd: vi.fn(),
  } satisfies NetworkAdapter;
  return { adapter, lifecycle };
}

function recordEvents(runtime: PlayableRuntime): PlayableEvent[] {
  const events: PlayableEvent[] = [];
  for (const e of ['start', 'interaction', 'end', 'cta'] as const)
    runtime.on(e, () => events.push(e));
  return events;
}

describe('PlayableRuntime', () => {
  it('starts only once the adapter is ready', () => {
    const { adapter, lifecycle } = stubAdapter();
    const runtime = new PlayableRuntime({ adapter });
    const onStart = vi.fn();

    runtime.start(onStart);
    expect(adapter.init).toHaveBeenCalledOnce();
    expect(onStart).not.toHaveBeenCalled();

    lifecycle.setViewable(true);
    lifecycle.markReady();
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('ignores the CTA until the player has interacted', () => {
    const { adapter } = stubAdapter();
    const runtime = new PlayableRuntime({ adapter });

    expect(runtime.cta()).toBe(false);
    expect(adapter.cta).not.toHaveBeenCalled();

    runtime.markInteraction();
    expect(runtime.cta()).toBe(true);
    expect(adapter.cta).toHaveBeenCalledOnce();
  });

  it('forwards gameEnd to the network only once', () => {
    const { adapter } = stubAdapter();
    const runtime = new PlayableRuntime({ adapter });
    runtime.gameEnd();
    runtime.gameEnd();
    expect(adapter.gameEnd).toHaveBeenCalledOnce();
  });

  it('emits anonymous lifecycle events in order', () => {
    const { adapter, lifecycle } = stubAdapter();
    const runtime = new PlayableRuntime({ adapter });
    const events = recordEvents(runtime);

    runtime.start(() => undefined);
    lifecycle.setViewable(true);
    lifecycle.markReady();
    runtime.markInteraction();
    runtime.markInteraction();
    runtime.gameEnd();
    runtime.cta();

    expect(events).toEqual(['start', 'interaction', 'end', 'cta']);
  });

  it('pauses gameplay and mutes audio while the ad is hidden', () => {
    const { adapter, lifecycle } = stubAdapter();
    const onPauseChange = vi.fn();
    const target = new EventTarget();
    const runtime = new PlayableRuntime({ adapter, interactionTarget: target });
    runtime.onPauseChange(onPauseChange);
    const sink = { setMuted: vi.fn<(m: boolean) => void>() };
    runtime.attachAudio(sink);

    runtime.start(() => undefined);
    lifecycle.setViewable(true);
    lifecycle.markReady();
    target.dispatchEvent(new Event('pointerdown'));
    expect(sink.setMuted).toHaveBeenLastCalledWith(false);

    lifecycle.setViewable(false);
    expect(onPauseChange).toHaveBeenLastCalledWith(true);
    expect(sink.setMuted).toHaveBeenLastCalledWith(true);

    lifecycle.setViewable(true);
    expect(onPauseChange).toHaveBeenLastCalledWith(false);
    expect(sink.setMuted).toHaveBeenLastCalledWith(false);
  });

  it('does not report pauses before gameplay has started', () => {
    const { adapter, lifecycle } = stubAdapter();
    const onPauseChange = vi.fn();
    const runtime = new PlayableRuntime({ adapter });
    runtime.onPauseChange(onPauseChange);
    runtime.start(() => undefined);
    lifecycle.setViewable(true);
    lifecycle.setViewable(false);
    expect(onPauseChange).not.toHaveBeenCalled();
  });
});
