import { definePlayable } from '../../src/core/playable-config.ts';

export default definePlayable({
  id: 'warung-kita',
  title: 'Warung Kita',
  orientation: 'portrait,landscape',
  // Warung Kita is a prototype that is not published yet: the CTA opens its repository.
  storeUrls: {
    ios: 'https://github.com/AlvaroMillanEstevez/warung-game',
    android: 'https://github.com/AlvaroMillanEstevez/warung-game',
  },
});
