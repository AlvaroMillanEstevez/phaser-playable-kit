# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-11-08

First release. The project is new and in active development.

### Added

- Runtime with a `NetworkAdapter` contract: starts only when the container is ready and the
  ad is viewable, pauses and mutes while hidden, unlocks audio on the first interaction and
  ignores the CTA before the first gameplay interaction.
- Adapters for AppLovin, Unity Ads, Google and Meta, and for Moloco and Liftoff in testing.
- Build pipeline producing a single HTML file or a ZIP per playable and network, bundling
  only that network's adapter.
- Size budget, static validator and a Chromium smoke test for every build.
- Example ads: Hello World, Nusa: Warung Sort and Warung Kita.
- Demo page with a phone frame, simulated MRAID container and event log.
- CI and deployment of the demo to GitHub Pages.

### Known limitations

- Not yet tested on physical phones or in the networks' own preview tools.
- Mintegral and TikTok/Pangle are planned, not implemented.

[0.1.0]: https://github.com/AlvaroMillanEstevez/phaser-playable-kit/releases/tag/v0.1.0
