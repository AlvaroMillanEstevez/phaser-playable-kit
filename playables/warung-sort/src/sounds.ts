import { note, type Tone } from '../../../src/core/synth.ts';

/** Synthesized effects, the same ones Nusa: Warung Sort uses. No audio files. */
export const SOUNDS = {
  pick: [{ at: 0, duration: 0.06, freq: 620, freqEnd: 880, wave: 'sine', gain: 0.18 }],
  drop: [{ at: 0, duration: 0.08, freq: 240, freqEnd: 150, wave: 'triangle', gain: 0.3 }],
  invalid: [note(0, 150, 0.07, 'square', 0.08), note(0.09, 120, 0.09, 'square', 0.08)],
  clear: [
    note(0, 660),
    note(0.06, 830),
    note(0.12, 990, 0.16),
    note(0.12, 1980, 0.12, 'sine', 0.06),
  ],
  win: [note(0, 523), note(0.1, 659), note(0.2, 784), note(0.3, 1047, 0.35)],
} as const satisfies Record<string, readonly Tone[]>;
