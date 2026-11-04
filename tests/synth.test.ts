import { describe, expect, it, vi } from 'vitest';
import { note, Synth } from '../src/core/synth.ts';

function fakeContext() {
  const oscillators: { start: ReturnType<typeof vi.fn> }[] = [];
  const param = () => ({
    value: 0,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  });
  const context = {
    currentTime: 0,
    destination: {},
    resume: vi.fn(() => Promise.resolve()),
    suspend: vi.fn(() => Promise.resolve()),
    createOscillator: () => {
      const osc = {
        type: 'sine',
        frequency: param(),
        connect: (node: unknown) => node,
        start: vi.fn(),
        stop: vi.fn(),
      };
      oscillators.push(osc);
      return osc;
    },
    createGain: () => ({ gain: param(), connect: (node: unknown) => node }),
  };
  return { context: context as unknown as AudioContext, raw: context, oscillators };
}

describe('Synth', () => {
  it('does not create an AudioContext while muted', () => {
    const factory = vi.fn(() => fakeContext().context);
    const synth = new Synth(factory);
    synth.setMuted(true);
    synth.play([note(0, 440)]);
    expect(factory).not.toHaveBeenCalled();
  });

  it('creates the context on first unmute and plays tones', () => {
    const fake = fakeContext();
    const synth = new Synth(() => fake.context);
    synth.setMuted(false);
    synth.play([note(0, 440), note(0.1, 660)]);
    expect(fake.raw.resume).toHaveBeenCalled();
    expect(fake.oscillators).toHaveLength(2);
  });

  it('suspends the context and stays silent while muted again', () => {
    const fake = fakeContext();
    const synth = new Synth(() => fake.context);
    synth.setMuted(false);
    synth.setMuted(true);
    synth.play([note(0, 440)]);
    expect(fake.raw.suspend).toHaveBeenCalled();
    expect(fake.oscillators).toHaveLength(0);
  });
});
