import type Phaser from 'phaser';
import type { AudioSink } from './audio.ts';
import type { PlayableRuntime } from './runtime.ts';

/**
 * Connects a Phaser game to the runtime: audio follows the mute rules and the game
 * loop pauses while the ad is not viewable. `sink` defaults to Phaser's sound manager;
 * pass a `Synth` when the playable synthesizes its sounds.
 */
export function bindPhaserGame(
  runtime: PlayableRuntime,
  game: Phaser.Game,
  sink: AudioSink = {
    setMuted: (muted) => {
      game.sound.mute = muted;
    },
  },
): void {
  runtime.attachAudio(sink);
  runtime.onPauseChange((paused) => {
    if (paused) game.pause();
    else game.resume();
  });
}
