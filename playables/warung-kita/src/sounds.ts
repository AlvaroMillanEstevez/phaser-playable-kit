import { note, type Tone } from '../../../src/core/synth.ts';

/** Synthesized effects (Warung Kita has no audio yet); no audio files. */
export const SOUNDS = {
  tap: [{ at: 0, duration: 0.05, freq: 420, freqEnd: 300, wave: 'triangle', gain: 0.12 }],
  sizzle: [{ at: 0, duration: 0.18, freq: 180, freqEnd: 120, wave: 'sawtooth', gain: 0.05 }],
  ready: [note(0, 1319, 0.08, 'sine', 0.14), note(0.07, 1760, 0.12, 'sine', 0.1)],
  pick: [{ at: 0, duration: 0.06, freq: 620, freqEnd: 880, wave: 'sine', gain: 0.18 }],
  coin: [note(0, 1568, 0.08, 'sine', 0.14), note(0.05, 2093, 0.12, 'sine', 0.1)],
  invalid: [note(0, 150, 0.07, 'square', 0.08), note(0.09, 120, 0.09, 'square', 0.08)],
  left: [
    { at: 0, duration: 0.24, freq: 440, freqEnd: 196, wave: 'triangle', gain: 0.16 },
    { at: 0.12, duration: 0.16, freq: 230, freqEnd: 170, wave: 'sine', gain: 0.08 },
  ],
  win: [note(0, 523), note(0.1, 659), note(0.2, 784), note(0.3, 1047, 0.35)],
  lose: [
    note(0, 392, 0.18, 'sawtooth', 0.1),
    note(0.18, 330, 0.18, 'sawtooth', 0.1),
    note(0.36, 262, 0.4, 'sawtooth', 0.1),
  ],
} as const satisfies Record<string, readonly Tone[]>;
