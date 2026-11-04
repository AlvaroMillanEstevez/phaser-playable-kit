import type { AudioSink } from './audio.ts';

export interface Tone {
  /** Start, in seconds after `play()`. */
  readonly at: number;
  readonly duration: number;
  readonly freq: number;
  /** When set, the pitch glides to this frequency. */
  readonly freqEnd?: number;
  readonly wave: OscillatorType;
  readonly gain: number;
}

export const note = (
  at: number,
  freq: number,
  duration = 0.09,
  wave: OscillatorType = 'triangle',
  gain = 0.2,
): Tone => ({ at, duration, freq, wave, gain });

type AudioContextFactory = () => AudioContext;

/**
 * Tiny Web Audio synthesizer: sound effects with no audio files. Web Audio also respects
 * the iOS mute switch, unlike `<audio>`.
 *
 * It is an `AudioSink`: the context is created on the first unmute (which the runtime
 * only does after a user gesture) and suspended while muted.
 */
export class Synth implements AudioSink {
  private context: AudioContext | undefined;
  private muted = true;
  private readonly createContext: AudioContextFactory;

  constructor(createContext: AudioContextFactory = () => new AudioContext()) {
    this.createContext = createContext;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      void this.context?.suspend();
      return;
    }
    this.context ??= this.createContext();
    void this.context.resume();
  }

  play(tones: readonly Tone[]): void {
    const context = this.context;
    if (this.muted || !context) return;
    const now = context.currentTime;
    for (const tone of tones) {
      const start = now + tone.at;
      const end = start + tone.duration;
      const osc = context.createOscillator();
      const env = context.createGain();
      osc.type = tone.wave;
      osc.frequency.setValueAtTime(tone.freq, start);
      if (tone.freqEnd) osc.frequency.exponentialRampToValueAtTime(tone.freqEnd, end);
      // Short attack and exponential release so tones do not click.
      env.gain.setValueAtTime(0.0001, start);
      env.gain.exponentialRampToValueAtTime(tone.gain, start + 0.008);
      env.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(env).connect(context.destination);
      osc.start(start);
      osc.stop(end + 0.02);
    }
  }
}
