import Phaser from 'phaser';
import { createPlayable } from '../../../src/core/index.ts';
import { bindPhaserGame } from '../../../src/core/phaser.ts';
import { Synth } from '../../../src/core/synth.ts';
import fontUrl from '../assets/nusa-display-600.woff2';
import config from '../playable.config.ts';
import { FONT_FAMILY, SortScene } from './SortScene.ts';

const FONT_TIMEOUT_MS = 1500;

/** The font is inlined as a data URI, so this never touches the network. */
async function loadFont(): Promise<void> {
  const face = new FontFace(FONT_FAMILY, `url(${fontUrl})`, { weight: '600' });
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, FONT_TIMEOUT_MS));
  await Promise.race([face.load().then((loaded) => document.fonts.add(loaded)), timeout]);
}

const runtime = createPlayable({ storeUrls: config.storeUrls });
const synth = new Synth();

// Nothing renders until the network says the ad is ready and on screen.
runtime.start(() => {
  void loadFont()
    .catch(() => undefined)
    .then(() => {
      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: document.body,
        backgroundColor: '#2b1a10',
        scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
        banner: false,
        // Sounds are synthesized by `synth`; Phaser's own audio is not needed.
        audio: { noAudio: true },
        input: { activePointers: 1 },
        scene: [new SortScene(runtime, synth)],
      });
      bindPhaserGame(runtime, game, synth);
    });
});
