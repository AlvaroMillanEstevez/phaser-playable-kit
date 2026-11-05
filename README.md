# phaser-playable-kit

An open source kit for building **playable ads** for mobile games with
[Phaser 4](https://phaser.io), [Vite](https://vite.dev) and TypeScript.

Write the playable once, then build a network-ready file for each ad network: a single
self-contained HTML file, or a ZIP where the network requires it. A size budget checks
every build against its network's limit.

> **Status: early development (pre-v0.1.0).** The API and folder layout may still change.

## Why

Each ad network wants something slightly different. Some use MRAID and `mraid.open()`,
others want `ExitApi.exit()` or `FbPlayableAd.onCTAClick()`. Size limits run from 2 MB
to 5 MB, and the rules about audio, visibility and first-tap redirects differ too. This
kit keeps those differences in one small adapter per network, so the game code stays the same.

## Principles

- **Offline by design.** All code and assets are inlined into the build, and the ad makes
  no requests at runtime. The only external URL in any build is Google's
  `exitapi.js`, which Google requires.
- **No personal data.** The ad has no user or device identifiers. The runtime emits
  anonymous in-ad events only (`start`, `interaction`, `end`, `cta`) and never sends them
  anywhere.
- **No AI model APIs** in the kit or in the playables.
- **Network rules enforced in code.** Gameplay starts only when the container is ready
  and the ad is viewable. Audio stays muted until the first interaction and while the ad
  is hidden. The CTA is ignored until the player has interacted with the gameplay.

## Networks

| Network   | Status    | Output      | Limit  | CTA                         |
| --------- | --------- | ----------- | ------ | --------------------------- |
| AppLovin  | supported | single HTML | 5 MB   | `mraid.open()`              |
| Unity Ads | supported | single HTML | < 5 MB | `mraid.open()`              |
| Google    | supported | ZIP         | 5 MB   | `ExitApi.exit()`            |
| Meta      | supported | single HTML | 2 MB   | `FbPlayableAd.onCTAClick()` |
| Moloco    | testing   | single HTML | < 5 MB | `FbPlayableAd.onCTAClick()` |
| Liftoff   | testing   | single HTML | 5 MB   | `mraid.open()`              |
| Mintegral | planned   | ZIP         | 5 MB   | `window.install()`          |
| TikTok    | planned   | ZIP         | 3 MB   | `window.openAppStore()`     |

Requirements, official sources and the reasoning behind each limit are in
[docs/networks.md](docs/networks.md). When sources disagree, the kit applies the
strictest limit.

## Quick start

Requires Node.js 22.18 or newer (the build scripts are TypeScript run directly by Node).

```bash
npm install
npm run dev                  # hello-world in the browser, no ad network
npm run build                # every playable for every network → dist/
npm run size                 # fail if any build is over its network's limit
npm run validate             # static checks: external URLs, fetch/XHR, iframes, CTA per network
npm run test:e2e             # play every build in headless Chromium with a fake ad container
npm run build:demo           # demo site (phone frame, network picker, MRAID simulator) → dist/site
npm run preview:demo         # serve it at http://localhost:4174
npm run check                # typecheck, lint, format check and tests
```

Build a single playable for some networks:

```bash
node scripts/build.ts --playable hello-world --network meta,unity
```

Run the dev server with a network's adapter (useful to check its behaviour):

```bash
PLAYABLE=hello-world NETWORK=google npm run dev
```

## Writing a playable

A playable is a folder under `playables/`:

```
playables/hello-world/
├── index.html            # page shell, loads src/main.ts
├── playable.config.ts    # id, title, orientation, store URLs
└── src/
    ├── main.ts           # creates the runtime and starts Phaser when allowed
    └── HelloScene.ts     # the game
```

The runtime hides the network:

```ts
const runtime = createPlayable({ storeUrls: config.storeUrls });

runtime.start(() => {
  const game = new Phaser.Game({ /* ... */ scene: [new MyScene(runtime)] });
  bindPhaserGame(runtime, game); // audio and pause rules
});

// In the scene:
runtime.markInteraction(); // on every gameplay input
runtime.cta(); // CTA button (ignored before the first interaction)
runtime.gameEnd(); // when the end card appears
```

## Project structure

```
src/core/            runtime shared by every playable
  adapter.ts         NetworkAdapter interface
  runtime.ts         lifecycle, CTA guard, anonymous events
  audio.ts           mute until first interaction and while hidden
  phaser.ts          Phaser binding
  networks/          one adapter per network, plus build specs
playables/           the ads
scripts/             build and size budget
tests/               Vitest
docs/networks.md     network requirements and sources
```

## Tooling notes

- Phaser **4.2.1** and Vitest 5.0.3, the same versions as
  [Nusa: Warung Sort](https://github.com/AlvaroMillanEstevez/nusa-sorting).
- TypeScript **6.0.3**: typescript-eslint does not support the native TypeScript 7
  compiler yet.
- Vite **8.3.5**, for the dev-server security fixes over 8.3.2.

## Example games

The example playables will be based on the author's own games:

- **Nusa: Warung Sort**: sorting puzzle set in an Indonesian warung.
  [Play on itch.io](https://kokeskill.itch.io/nusa-warung-sort) ·
  [source](https://github.com/AlvaroMillanEstevez/nusa-sorting)
- **Warung Kita**: warung management game (prototype).
  [source](https://github.com/AlvaroMillanEstevez/warung-game)

## License

[MIT](LICENSE) © Alvaro Millan Estevez
