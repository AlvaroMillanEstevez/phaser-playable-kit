# Roadmap

Planned work after v0.1.0, in priority order within each area. Estimates are in hours and
are adjusted to what building the MVP actually took. Priorities: **P1** next, **P2** after
that, **P3** when there is time.

## 1. Verification on real targets (P1)

| Task                                                                                                     | Hours |
| -------------------------------------------------------------------------------------------------------- | ----: |
| Test both ads on physical phones: iOS Safari and WKWebView, Android WebView, one low-end device          |     4 |
| Run the builds through AppLovin's and Unity's preview tools, Google's HTML5 validator and Meta's preview |     4 |
| Re-check every network's official page and update `docs/networks.md`                                     |     2 |
| Confirm whether AppLovin needs a `mraid.js` tag                                                          |     1 |

## 2. Networks (P1)

| Task                                                                                     | Hours |
| ---------------------------------------------------------------------------------------- | ----: |
| Mintegral adapter: ZIP, everything in base64, `window.install()` and `gameEnd`           |     4 |
| TikTok/Pangle adapter: ZIP with `config.json`, `window.openAppStore()`                   |     4 |
| Liftoff: confirm MRAID or `postMessage`, reserved corners and `gameEnd`; leave "testing" |     3 |
| Moloco: confirm size limit and packaging; leave "testing"                                |     1 |
| Snapchat, InMobi and other MRAID receivers                                               |     5 |

## 3. Size (P1)

| Task                                                                       | Hours |
| -------------------------------------------------------------------------- | ----: |
| Reduced Phaser build with only the modules used (also removes the loader)  |     8 |
| Per-asset size report for each build                                       |     2 |
| General image and audio compression pipeline, replacing per-ad scripts     |     4 |
| Keep Meta's single HTML well under its 2 MB limit with room for richer ads |     2 |

## 4. Quality (P2)

| Task                                                                            | Hours |
| ------------------------------------------------------------------------------- | ----: |
| Sharp rendering on high-density screens                                         |     3 |
| More smoke tests: full win, time-up and lost end cards, pause while hidden      |     3 |
| Low-end performance pass and WebGL context-loss fallback (required by AppLovin) |     3 |
| Basic accessibility: contrast, touch targets, reduced motion                    |     2 |
| Pointer and touch tests with real touch events                                  |     1 |

## 5. Developer experience (P2)

| Task                                                                         | Hours |
| ---------------------------------------------------------------------------- | ----: |
| `create-playable` CLI that generates an ad from a template                   |     5 |
| Hot reload per network, with the demo's simulated container in `npm run dev` |     3 |
| Per-ad settings for store URLs, texts and colours                            |     3 |
| Move Hello World to the shared `src/kit` hand and button                     |     1 |

## 6. Mechanic templates (P2)

| Task                                      | Hours |
| ----------------------------------------- | ----: |
| Sort template, extracted from Warung Sort |     3 |
| Drag and merge                            |     5 |
| Choose a door or path                     |     4 |
| Simple runner                             |     6 |
| Scratch to reveal                         |     3 |

## 7. Variants and localization (P3)

| Task                                                                | Hours |
| ------------------------------------------------------------------- | ----: |
| A/B variants: texts, colours, tutorial length and end card, no code |     4 |
| Localized texts in English, Spanish and Indonesian                  |     3 |

## 8. Portfolio (P3)

| Task                                    | Hours |
| --------------------------------------- | ----: |
| Third example ad from a different genre |     8 |

**Total: 104 hours.**
