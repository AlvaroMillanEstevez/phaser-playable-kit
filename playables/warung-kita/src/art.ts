import Phaser from 'phaser';

/**
 * Art drawn in code, in Warung Kita's style: a rounded 2D toy restaurant in cream, wood,
 * jade and coral with soft shadows. The palette, the characters and the plate are ported
 * from Warung Kita (src/visuals/theme.ts, CharacterArt.ts and drawing.ts), same author,
 * MIT licence.
 */
export const PALETTE = {
  wall: 0xfff5e5,
  wallShade: 0xe8dcc8,
  floor: 0xe6d4bb,
  tile: 0xf0e3d0,
  grout: 0xd9c7af,
  green: 0x267568,
  greenLight: 0x6ca995,
  greenDark: 0x194f48,
  wood: 0xc79061,
  woodDark: 0x926447,
  woodLight: 0xe9bd8d,
  cream: 0xfffcf2,
  ink: 0x293f39,
  shadow: 0x273f38,
  coral: 0xd87860,
  gold: 0xe7b95b,
  skin: 0xdca77d,
  hair: 0x493b32,
} as const;

const SKINS = [PALETTE.skin, 0xbd835d, 0xe8b998, 0xcc9471] as const;
const SHIRTS = [0x8aa9b1, PALETTE.coral, 0xc4ac7c, 0x9fada0] as const;

export const FONT = '"Trebuchet MS", "Segoe UI", Arial, sans-serif';

export const css = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;

export function softShadow(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  g.fillStyle(PALETTE.shadow, 0.035).fillEllipse(x + 2, y + 2, w + 12, h + 7);
  g.fillStyle(PALETTE.shadow, 0.055).fillEllipse(x + 1, y + 1, w + 6, h + 3);
  g.fillStyle(PALETTE.shadow, 0.1).fillEllipse(x, y, w, h);
}

/** A plate of nasi goreng with a fried egg, centred on (x, y). */
export function drawMeal(g: Phaser.GameObjects.Graphics, x: number, y: number, scale = 1): void {
  const s = scale;
  g.fillStyle(PALETTE.wallShade).fillEllipse(x, y + 2 * s, 26 * s, 14 * s);
  g.fillStyle(PALETTE.cream).fillEllipse(x, y, 26 * s, 13 * s);
  g.lineStyle(0.8 * s, PALETTE.wallShade).strokeEllipse(x, y, 21 * s, 9 * s);
  g.fillStyle(PALETTE.wood).fillEllipse(x, y - s, 19 * s, 9 * s);
  g.fillStyle(PALETTE.woodLight).fillEllipse(x - 2 * s, y - 2 * s, 14 * s, 6 * s);
  g.fillStyle(PALETTE.cream).fillEllipse(x + 4 * s, y - 3 * s, 10 * s, 6 * s);
  g.fillStyle(PALETTE.gold).fillCircle(x + 4 * s, y - 3 * s, 2 * s);
  g.fillStyle(PALETTE.green).fillEllipse(x - 6 * s, y - 2 * s, 4 * s, 2 * s);
  g.fillStyle(PALETTE.coral).fillCircle(x - s, y, 1.2 * s);
}

export type Role = 'cook' | 'customer';

/**
 * A standing character, feet at (0, 0), about 70 px tall at scale 1. Ported from Warung
 * Kita's CharacterArt without the walking animation.
 */
export function createCharacter(
  scene: Phaser.Scene,
  role: Role,
  variant = 0,
): Phaser.GameObjects.Container {
  const customer = role === 'customer';
  const skin = SKINS[variant % SKINS.length] ?? PALETTE.skin;
  const shirt = customer ? (SHIRTS[variant % SHIRTS.length] ?? PALETTE.coral) : PALETTE.cream;
  const apron = variant === 1 ? PALETTE.coral : PALETTE.gold;
  const g = scene.add.graphics();
  softShadow(g, 0, 0, 34, 9);

  for (const side of [-1, 1]) {
    g.fillStyle(customer ? PALETTE.woodDark : PALETTE.greenDark).fillRoundedRect(
      side * 6 - 4,
      -13,
      8,
      13,
      4,
    );
    g.fillStyle(PALETTE.ink).fillRoundedRect(side * 6 - 5, -4, 11, 6, 3);
    g.fillStyle(shirt).fillRoundedRect(side * 14 - 4, -31, 8, 14, 4);
    g.fillStyle(skin).fillEllipse(side * 14, -16, 9, 10);
  }
  g.fillStyle(shirt).fillRoundedRect(-14, -34, 28, 29, 10);
  g.fillStyle(PALETTE.shadow, 0.08).fillRoundedRect(8, -26, 5, 18, 3);
  g.fillStyle(PALETTE.cream, 0.48).fillRoundedRect(-10, -32, 3, 12, 1.5);
  if (customer) {
    if (variant % 2 === 0) {
      g.lineStyle(1.5, PALETTE.cream, 0.7).lineBetween(0, -30, 0, -9);
      g.fillStyle(PALETTE.cream).fillCircle(3, -22, 1).fillCircle(3, -15, 1);
    } else {
      g.fillStyle(PALETTE.cream, 0.6).fillRoundedRect(-9, -20, 18, 3, 1.5);
    }
  } else {
    g.fillStyle(apron).fillRoundedRect(-10, -26, 20, 22, 5);
    g.lineStyle(2, apron).lineBetween(-7, -30, -5, -23).lineBetween(7, -30, 5, -23);
    g.fillStyle(PALETTE.cream, 0.6).fillRoundedRect(-6, -16, 12, 7, 2);
    for (const x of [-5, 5]) g.fillStyle(PALETTE.woodDark).fillCircle(x, -29, 1);
  }

  // Head
  g.fillStyle(skin).fillEllipse(-12, -42, 7, 9).fillEllipse(12, -42, 7, 9);
  g.fillStyle(PALETTE.hair).fillRoundedRect(-14, -59, 28, 29, 12);
  g.fillStyle(skin).fillRoundedRect(-13, -57, 26, 26, 11);
  g.fillStyle(PALETTE.cream, 0.15).fillEllipse(-6, -49, 9, 11);
  if (customer && variant % 4 === 3) {
    // Rounded headscarf, one of the game's customer variations.
    g.fillStyle(PALETTE.green).fillRoundedRect(-16, -61, 32, 31, 13);
    g.fillStyle(skin).fillRoundedRect(-11, -53, 22, 22, 10);
    g.fillStyle(PALETTE.green).fillTriangle(-13, -39, -16, -28, -7, -32);
  } else {
    g.fillStyle(PALETTE.hair).fillEllipse(0, -56, 28, 12);
    g.fillStyle(PALETTE.hair).fillRoundedRect(-13, -57, 7, variant % 3 === 1 ? 23 : 13, 3);
    if (variant % 3 === 1) g.fillStyle(PALETTE.hair).fillRoundedRect(7, -55, 7, 17, 4);
  }
  if (!customer) {
    g.fillStyle(PALETTE.wallShade).fillRoundedRect(-14, -65, 28, 12, 5);
    g.fillStyle(PALETTE.cream).fillCircle(-8, -65, 8).fillCircle(1, -68, 10).fillCircle(10, -64, 7);
    g.fillStyle(PALETTE.cream).fillRoundedRect(-12, -62, 24, 9, 3);
  } else if (variant % 4 === 2) {
    g.fillStyle(PALETTE.woodLight).fillRoundedRect(-14, -62, 28, 10, 5);
    g.fillStyle(PALETTE.wood).fillRoundedRect(-15, -55, 22, 5, 3);
  }

  // Face
  g.fillStyle(PALETTE.hair).fillEllipse(-4.5, -43, 3, 4).fillEllipse(4.5, -43, 3, 4);
  g.fillStyle(PALETTE.cream).fillCircle(-4, -44, 0.8).fillCircle(5, -44, 0.8);
  g.fillStyle(PALETTE.coral, 0.36).fillEllipse(-8, -39, 5, 3).fillEllipse(8, -39, 5, 3);
  g.lineStyle(1.2, PALETTE.woodDark)
    .beginPath()
    .moveTo(-3, -36)
    .lineTo(0, -35)
    .lineTo(3, -36)
    .strokePath();
  return scene.add.container(0, 0, [g]);
}

/** Wall with the jade tile band above, warm tiled floor below `floorY`. */
export function drawRoom(
  g: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  floorY: number,
  unit: number,
): void {
  g.clear();
  g.fillStyle(PALETTE.wall).fillRect(0, 0, width, floorY);
  g.fillStyle(PALETTE.green).fillRect(0, floorY - 26 * unit, width, 14 * unit);
  g.fillStyle(PALETTE.greenLight, 0.5).fillRect(0, floorY - 26 * unit, width, 3 * unit);
  g.fillStyle(PALETTE.wallShade).fillRect(0, floorY - 12 * unit, width, 12 * unit);
  // Two windows with jade frames, as on the game's back wall.
  const windowWidth = 96 * unit;
  const windowHeight = 70 * unit;
  const windowY = floorY - 26 * unit - windowHeight - 40 * unit;
  for (const x of [width * 0.14, width * 0.86]) {
    g.fillStyle(PALETTE.wallShade).fillRoundedRect(
      x - windowWidth / 2 - 6 * unit,
      windowY - 6 * unit,
      windowWidth + 12 * unit,
      windowHeight + 12 * unit,
      12 * unit,
    );
    g.fillStyle(PALETTE.greenLight, 0.35).fillRoundedRect(
      x - windowWidth / 2,
      windowY,
      windowWidth,
      windowHeight,
      8 * unit,
    );
    g.fillStyle(PALETTE.cream, 0.5).fillRoundedRect(
      x - windowWidth / 2 + 8 * unit,
      windowY + 8 * unit,
      windowWidth * 0.3,
      windowHeight - 16 * unit,
      6 * unit,
    );
    g.lineStyle(4 * unit, PALETTE.green).strokeRoundedRect(
      x - windowWidth / 2,
      windowY,
      windowWidth,
      windowHeight,
      8 * unit,
    );
    g.lineBetween(x, windowY, x, windowY + windowHeight);
  }
  g.fillStyle(PALETTE.floor).fillRect(0, floorY, width, height - floorY);
  const tile = 46 * unit;
  for (let row = 0; floorY + row * tile < height; row++) {
    for (let col = -1; col * tile < width; col++) {
      const x = col * tile + (row % 2) * tile * 0.5;
      g.fillStyle(PALETTE.tile).fillRoundedRect(
        x + 2,
        floorY + row * tile + 2,
        tile - 4,
        tile - 4,
        6 * unit,
      );
    }
  }
}

/** Wooden counter, the top surface at `rect.y`. */
export function drawCounter(
  g: Phaser.GameObjects.Graphics,
  rect: Phaser.Geom.Rectangle,
  unit: number,
): void {
  const { x, y, width, height } = rect;
  g.fillStyle(PALETTE.shadow, 0.08).fillRoundedRect(x + 4, y + 8, width, height, 14 * unit);
  g.fillStyle(PALETTE.wood).fillRoundedRect(x, y, width, height, 14 * unit);
  g.fillStyle(PALETTE.woodLight).fillRoundedRect(x, y, width, height * 0.36, {
    tl: 14 * unit,
    tr: 14 * unit,
    bl: 0,
    br: 0,
  });
  g.fillStyle(PALETTE.greenDark).fillRoundedRect(
    x + width * 0.3,
    y + height * 0.5,
    width * 0.4,
    height * 0.36,
    8 * unit,
  );
}

/** Cream stove with four rings; `burners` are the ring centres. */
export function drawStove(
  g: Phaser.GameObjects.Graphics,
  rect: Phaser.Geom.Rectangle,
  burners: readonly { x: number; y: number }[],
  unit: number,
): void {
  const { x, y, width, height } = rect;
  softShadow(g, x + width / 2, y + height + 4 * unit, width * 0.9, 18 * unit);
  g.fillStyle(PALETTE.wallShade).fillRoundedRect(x, y + 10 * unit, width, height, 18 * unit);
  g.fillStyle(PALETTE.cream).fillRoundedRect(x, y, width, height - 4 * unit, 18 * unit);
  g.fillStyle(PALETTE.greenDark).fillRoundedRect(
    x + width * 0.2,
    y + height - 30 * unit,
    width * 0.6,
    16 * unit,
    6 * unit,
  );
  for (const burner of burners) {
    g.fillStyle(PALETTE.ink).fillCircle(burner.x, burner.y, 26 * unit);
    g.fillStyle(PALETTE.greenLight).fillCircle(burner.x, burner.y, 20 * unit);
    g.fillStyle(PALETTE.ink).fillCircle(burner.x, burner.y, 14 * unit);
  }
}
