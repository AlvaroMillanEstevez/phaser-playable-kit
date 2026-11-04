"""Build the Warung Sort playable's assets from a local clone of nusa-sorting.

    python3 tools/assets/build_warung_sort.py ../nusaSorting

Reads the game's own art (src/assets/art) and font (src/assets/fonts), resizes and
recompresses it as WebP, and writes playables/warung-sort/assets/. The output is
committed, so the clone is only needed to rebuild it. Requires Pillow with WebP support.
"""

import shutil
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "playables" / "warung-sort" / "assets"

ITEMS = ["ayam-goreng", "mie-goreng", "durian", "manggis"]
ITEM_SIZE = 128
SHELF_WIDTH = 440
BACKGROUND_LONG_SIDE = 1024
ITEM_QUALITY = 82
BACKGROUND_QUALITY = 60

FONT = "nusa-display-600.woff2"
FONT_LICENSE = "OFL-Fredoka.txt"


def save_webp(image: Image.Image, path: Path, quality: int) -> None:
    image.save(path, "WEBP", quality=quality, method=6)
    print(f"{path.relative_to(ROOT)}  {image.size[0]}x{image.size[1]}  {path.stat().st_size / 1000:.1f} kB")


def resize_to_width(image: Image.Image, width: int) -> Image.Image:
    height = round(image.height * width / image.width)
    return image.resize((width, height), Image.Resampling.LANCZOS)


def resize_long_side(image: Image.Image, long_side: int) -> Image.Image:
    scale = long_side / max(image.size)
    size = (round(image.width * scale), round(image.height * scale))
    return image.resize(size, Image.Resampling.LANCZOS)


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    source = Path(sys.argv[1]).resolve()
    art = source / "src" / "assets" / "art"
    fonts = source / "src" / "assets" / "fonts"
    if not art.is_dir():
        sys.exit(f"Not a nusa-sorting clone: {art} not found")

    OUT.mkdir(parents=True, exist_ok=True)
    for name in ITEMS:
        image = Image.open(art / "items" / f"{name}.webp").convert("RGBA")
        save_webp(image.resize((ITEM_SIZE, ITEM_SIZE), Image.Resampling.LANCZOS), OUT / f"{name}.webp", ITEM_QUALITY)

    shelf = Image.open(art / "shelf.webp").convert("RGBA")
    save_webp(resize_to_width(shelf, SHELF_WIDTH), OUT / "shelf.webp", ITEM_QUALITY)

    for orientation in ("portrait", "landscape"):
        background = Image.open(art / f"background-{orientation}.webp").convert("RGB")
        save_webp(
            resize_long_side(background, BACKGROUND_LONG_SIDE),
            OUT / f"background-{orientation}.webp",
            BACKGROUND_QUALITY,
        )

    for name in (FONT, FONT_LICENSE):
        shutil.copyfile(fonts / name, OUT / name)
        print(f"{(OUT / name).relative_to(ROOT)}  {(OUT / name).stat().st_size / 1000:.1f} kB")

    total = sum(f.stat().st_size for f in OUT.iterdir() if f.suffix in {".webp", ".woff2"})
    print(f"total {total / 1000:.1f} kB (about {total * 4 / 3 / 1000:.1f} kB as base64)")


if __name__ == "__main__":
    main()
