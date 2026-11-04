import type { NetworkAdapter } from './adapter.ts';
import {
  AudioController,
  onFirstInteraction,
  type AudioSink,
  type InteractionTarget,
} from './audio.ts';

/** Anonymous in-ad events. They carry no payload and are never sent over the network. */
export type PlayableEvent = 'start' | 'interaction' | 'end' | 'cta';

export interface RuntimeOptions {
  readonly adapter: NetworkAdapter;
  /** Where to listen for the first interaction that unlocks audio. */
  readonly interactionTarget?: InteractionTarget;
  /** Called with `true` when gameplay must pause (ad hidden) and `false` to resume. */
  readonly onPauseChange?: (paused: boolean) => void;
}

export class PlayableRuntime {
  readonly adapter: NetworkAdapter;
  private audio: AudioController | undefined;
  private started = false;
  private interacted = false;
  private ended = false;
  private readonly listeners = new Map<PlayableEvent, Set<() => void>>();
  private readonly onPauseChange: ((paused: boolean) => void) | undefined;

  constructor(options: RuntimeOptions) {
    this.adapter = options.adapter;
    this.onPauseChange = options.onPauseChange;
    if (options.interactionTarget) {
      onFirstInteraction(options.interactionTarget, () => this.audio?.unlock());
    }
  }

  /** Mutes and unmutes `sink` following the audio rules. Call once the sink exists. */
  attachAudio(sink: AudioSink): void {
    this.audio = new AudioController(sink);
    this.audio.setViewable(this.adapter.isViewable());
  }

  /** Unlocks audio by hand, for sinks that cannot rely on `interactionTarget`. */
  unlockAudio(): void {
    this.audio?.unlock();
  }

  setUserMuted(muted: boolean): void {
    this.audio?.setUserMuted(muted);
  }

  /** Connects to the container and runs `onStart` once gameplay may begin. */
  start(onStart: () => void): void {
    this.adapter.init();
    this.adapter.onViewableChange((viewable) => {
      this.audio?.setViewable(viewable);
      if (this.started) this.onPauseChange?.(!viewable);
    });
    this.adapter.onReady(() => {
      if (this.started) return;
      this.started = true;
      this.audio?.setViewable(this.adapter.isViewable());
      this.emit('start');
      onStart();
    });
  }

  /**
   * Call on every gameplay interaction. Networks forbid opening the store on the
   * player's first tap, so `cta()` is ignored until this has been called.
   */
  markInteraction(): void {
    if (this.interacted) return;
    this.interacted = true;
    this.emit('interaction');
  }

  get hasInteracted(): boolean {
    return this.interacted;
  }

  /** Opens the store. Returns `false` when ignored because the player has not played yet. */
  cta(): boolean {
    if (!this.interacted) return false;
    this.emit('cta');
    this.adapter.cta();
    return true;
  }

  /** Marks the end of the experience. Only the first call reaches the network. */
  gameEnd(): void {
    if (this.ended) return;
    this.ended = true;
    this.emit('end');
    this.adapter.gameEnd();
  }

  on(event: PlayableEvent, listener: () => void): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener);
    return () => set.delete(listener);
  }

  private emit(event: PlayableEvent): void {
    for (const listener of this.listeners.get(event) ?? []) listener();
  }
}
