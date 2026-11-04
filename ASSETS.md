# Assets and credits

The code is under the [MIT License](LICENSE). This file lists every non-code asset in
the repository, where it comes from and its licence. The kit only ships assets from the
author's own games or made for this project, plus fonts under licences that allow
redistribution with MIT software.

## Warung Sort playable (`playables/warung-sort/assets/`)

Taken from the author's game
[Nusa: Warung Sort](https://github.com/AlvaroMillanEstevez/nusa-sorting) and resized and
recompressed with [`tools/assets/build_warung_sort.py`](tools/assets/build_warung_sort.py).

| Asset                                                                             | Origin                                                                                                                                  | Licence                                                                          |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Items (`ayam-goreng`, `mie-goreng`, `durian`, `manggis`), `shelf`, `background-*` | Generated with ChatGPT (October 2026) from the author's prompts for Nusa: Warung Sort, then cut and cleaned by that game's art pipeline | MIT, to the extent the author holds rights                                       |
| `nusa-display-600.woff2` (Fredoka SemiBold, subset)                               | [Fredoka](https://fonts.google.com/specimen/Fredoka) by The Fredoka Project Authors, subset by Nusa: Warung Sort                        | SIL Open Font License 1.1 ([text](playables/warung-sort/assets/OFL-Fredoka.txt)) |

Depending on the jurisdiction, purely AI-generated images may not be protected by
copyright. See the game's own
[ASSETS.md](https://github.com/AlvaroMillanEstevez/nusa-sorting/blob/main/ASSETS.md).

## Generated in code

- Hello World playable: every shape is drawn with Phaser graphics.
- Sound effects in the playables are synthesized at runtime with the Web Audio API; there
  are no audio files.
