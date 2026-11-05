import Phaser from 'phaser';
import { createPlayable } from '../../../src/core/index.ts';
import { bindPhaserGame } from '../../../src/core/phaser.ts';
import { Synth } from '../../../src/core/synth.ts';
import config from '../playable.config.ts';
import { KitchenScene } from './KitchenScene.ts';

const runtime = createPlayable({ storeUrls: config.storeUrls });
const synth = new Synth();

// Nothing renders until the network says the ad is ready and on screen.
runtime.start(() => {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: document.body,
    backgroundColor: '#fff5e5',
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
    banner: false,
    // Sounds are synthesized by `synth`; Phaser's own audio is not needed.
    audio: { noAudio: true },
    input: { activePointers: 1 },
    scene: [new KitchenScene(runtime, synth)],
  });
  bindPhaserGame(runtime, game, synth);
});
