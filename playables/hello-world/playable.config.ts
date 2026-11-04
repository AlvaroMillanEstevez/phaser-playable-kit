import { definePlayable } from '../../src/core/playable-config.ts';

export default definePlayable({
  id: 'hello-world',
  title: 'Hello World',
  orientation: 'portrait,landscape',
  // A minimal example has no app of its own: point at the author's published game.
  storeUrls: {
    ios: 'https://kokeskill.itch.io/nusa-warung-sort',
    android: 'https://kokeskill.itch.io/nusa-warung-sort',
  },
});
