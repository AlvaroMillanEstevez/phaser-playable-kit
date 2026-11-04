/** Anything that can be muted: Phaser's sound manager, a Web Audio gain node... */
export interface AudioSink {
  setMuted(muted: boolean): void;
}

/**
 * Keeps audio muted until the first user interaction and whenever the ad is not
 * viewable, as every supported network requires.
 */
export class AudioController {
  private unlocked = false;
  private viewable = true;
  private userMuted = false;
  private muted: boolean | undefined;
  private readonly sink: AudioSink;

  constructor(sink: AudioSink) {
    this.sink = sink;
    this.apply();
  }

  get audible(): boolean {
    return this.unlocked && this.viewable && !this.userMuted;
  }

  /** Call on the first user interaction. Later calls are ignored. */
  unlock(): void {
    this.unlocked = true;
    this.apply();
  }

  setViewable(viewable: boolean): void {
    this.viewable = viewable;
    this.apply();
  }

  /** For an in-ad mute button. */
  setUserMuted(muted: boolean): void {
    this.userMuted = muted;
    this.apply();
  }

  private apply(): void {
    const muted = !this.audible;
    if (muted === this.muted) return;
    this.muted = muted;
    this.sink.setMuted(muted);
  }
}

export interface InteractionTarget {
  addEventListener(type: string, listener: () => void, options?: AddEventListenerOptions): void;
  removeEventListener(type: string, listener: () => void, options?: EventListenerOptions): void;
}

const INTERACTION_EVENTS = ['pointerdown', 'touchstart', 'keydown'] as const;

/** Runs `callback` once, on the first pointer, touch or key event on `target`. */
export function onFirstInteraction(target: InteractionTarget, callback: () => void): void {
  const handler = (): void => {
    for (const type of INTERACTION_EVENTS)
      target.removeEventListener(type, handler, { capture: true });
    callback();
  };
  for (const type of INTERACTION_EVENTS) {
    target.addEventListener(type, handler, { capture: true, passive: true });
  }
}
