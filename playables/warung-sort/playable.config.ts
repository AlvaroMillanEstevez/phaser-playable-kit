import { definePlayable } from '../../src/core/playable-config.ts';

export default definePlayable({
  id: 'warung-sort',
  title: 'Nusa: Warung Sort',
  orientation: 'portrait,landscape',
  // The game is published on itch.io, not on the app stores yet.
  storeUrls: {
    ios: 'https://kokeskill.itch.io/nusa-warung-sort',
    android: 'https://kokeskill.itch.io/nusa-warung-sort',
  },
});
