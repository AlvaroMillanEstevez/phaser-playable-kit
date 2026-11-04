import { describe, expect, it, vi } from 'vitest';
import { AudioController, onFirstInteraction, type InteractionTarget } from '../src/core/audio.ts';

function sink() {
  return { setMuted: vi.fn<(muted: boolean) => void>() };
}

describe('AudioController', () => {
  it('starts muted until the first interaction', () => {
    const s = sink();
    const audio = new AudioController(s);
    expect(s.setMuted).toHaveBeenLastCalledWith(true);
    expect(audio.audible).toBe(false);

    audio.unlock();
    expect(s.setMuted).toHaveBeenLastCalledWith(false);
    expect(audio.audible).toBe(true);
  });

  it('mutes while not viewable and restores afterwards', () => {
    const s = sink();
    const audio = new AudioController(s);
    audio.unlock();

    audio.setViewable(false);
    expect(s.setMuted).toHaveBeenLastCalledWith(true);
    audio.setViewable(true);
    expect(s.setMuted).toHaveBeenLastCalledWith(false);
  });

  it('stays muted when viewable but still locked', () => {
    const s = sink();
    const audio = new AudioController(s);
    audio.setViewable(false);
    audio.setViewable(true);
    expect(audio.audible).toBe(false);
    expect(s.setMuted).toHaveBeenCalledTimes(1);
  });

  it('respects the user mute toggle', () => {
    const s = sink();
    const audio = new AudioController(s);
    audio.unlock();
    audio.setUserMuted(true);
    expect(s.setMuted).toHaveBeenLastCalledWith(true);
    audio.setViewable(true);
    expect(audio.audible).toBe(false);
  });

  it('only notifies the sink when the muted state changes', () => {
    const s = sink();
    const audio = new AudioController(s);
    audio.unlock();
    audio.unlock();
    audio.setViewable(true);
    expect(s.setMuted.mock.calls).toEqual([[true], [false]]);
  });
});

describe('onFirstInteraction', () => {
  it('fires once and removes its listeners', () => {
    const target = new EventTarget() as InteractionTarget & EventTarget;
    const callback = vi.fn();
    onFirstInteraction(target, callback);

    target.dispatchEvent(new Event('pointerdown'));
    target.dispatchEvent(new Event('keydown'));
    target.dispatchEvent(new Event('touchstart'));
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
