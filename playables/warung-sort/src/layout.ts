/**
 * Where everything goes for a given screen size. Pure, so it is unit-tested for both
 * orientations.
 *
 * Reserved areas follow the strictest network rules: the top band stays free of
 * interactive UI (Liftoff's 50×50 corners, Unity's close button and countdown) and the
 * bottom band too (Unity's consent UI).
 */

/** shelf.webp is 440×213; the three cubbies are centred at these fractions of its width. */
export const SHELF_ASPECT = 440 / 213;
export const SLOT_CENTERS_X = [0.19, 0.5, 0.81] as const;
export const SLOT_CENTER_Y = 0.54;
export const ITEM_SIZE_OF_SHELF = 0.25;

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Layout {
  readonly portrait: boolean;
  readonly columns: number;
  /** Shelf rectangles, row by row. */
  readonly shelves: readonly Rect[];
  readonly itemSize: number;
  /** Touch area of an item: the whole cubby, larger than the image on small screens. */
  readonly hitArea: { readonly width: number; readonly height: number };
  readonly title: { readonly x: number; readonly y: number; readonly fontSize: number };
  readonly cta: { readonly x: number; readonly y: number; readonly scale: number };
}

export function computeLayout(width: number, height: number, shelfCount: number): Layout {
  const portrait = width < height;
  const columns = portrait ? 2 : 3;
  const rows = Math.ceil(shelfCount / columns);

  const topBand = Math.max(56, height * 0.07);
  const bottomBand = Math.max(24, height * 0.05);
  const titleHeight = height * (portrait ? 0.1 : 0.12);
  const ctaHeight = height * (portrait ? 0.12 : 0.15);

  const boardTop = topBand + titleHeight;
  const boardBottom = height - bottomBand - ctaHeight;
  const sideMargin = width * 0.04;
  const zoneWidth = width - sideMargin * 2;
  const zoneHeight = boardBottom - boardTop;

  const gap = 0.06;
  const shelfWidth = Math.min(
    zoneWidth / (columns + gap * (columns - 1)),
    (zoneHeight / (rows + gap * (rows - 1))) * SHELF_ASPECT,
  );
  const shelfHeight = shelfWidth / SHELF_ASPECT;
  const gapX = shelfWidth * gap;
  const gapY = shelfHeight * gap * 1.5;
  const gridWidth = columns * shelfWidth + (columns - 1) * gapX;
  const gridHeight = rows * shelfHeight + (rows - 1) * gapY;
  const left = (width - gridWidth) / 2;
  const top = boardTop + (zoneHeight - gridHeight) / 2;

  const shelves: Rect[] = [];
  for (let i = 0; i < shelfCount; i++) {
    const column = i % columns;
    const row = Math.floor(i / columns);
    shelves.push({
      x: left + column * (shelfWidth + gapX),
      y: top + row * (shelfHeight + gapY),
      width: shelfWidth,
      height: shelfHeight,
    });
  }

  const short = Math.min(width, height);
  return {
    portrait,
    columns,
    shelves,
    itemSize: shelfWidth * ITEM_SIZE_OF_SHELF,
    hitArea: { width: shelfWidth / 3, height: shelfHeight * 0.8 },
    title: { x: width / 2, y: topBand + titleHeight / 2, fontSize: Math.round(short * 0.07) },
    cta: { x: width / 2, y: height - bottomBand - ctaHeight / 2, scale: short / 420 },
  };
}

export function slotPosition(shelf: Rect, slot: number): { x: number; y: number } {
  return {
    x: shelf.x + shelf.width * (SLOT_CENTERS_X[slot] ?? 0.5),
    y: shelf.y + shelf.height * SLOT_CENTER_Y,
  };
}
