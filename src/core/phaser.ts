import type Phaser from 'phaser';
import type { PlayableRuntime } from './runtime.ts';

/**
 * Connects a Phaser game to the runtime: audio follows the mute rules and the game
 * loop pauses while the ad is not viewable.
 */
export function bindPhaserGame(runtime: PlayableRuntime, game: Phaser.Game): void {
  runtime.attachAudio({
    setMuted: (muted) => {
      game.sound.mute = muted;
    },
  });
  runtime.onPauseChange((paused) => {
    if (paused) game.pause();
    else game.resume();
  });
}
