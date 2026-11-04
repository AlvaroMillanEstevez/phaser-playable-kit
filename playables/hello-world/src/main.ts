import Phaser from 'phaser';
import { createPlayable } from '../../../src/core/index.ts';
import { bindPhaserGame } from '../../../src/core/phaser.ts';
import config from '../playable.config.ts';
import { HelloScene } from './HelloScene.ts';

const runtime = createPlayable({ storeUrls: config.storeUrls });

// Nothing renders until the network says the ad is ready and on screen.
runtime.start(() => {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: document.body,
    backgroundColor: '#1d1b2f',
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
    banner: false,
    scene: [new HelloScene(runtime)],
  });
  bindPhaserGame(runtime, game);
});
