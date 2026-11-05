/**
 * Screen positions for both orientations. Pure, so it is unit-tested. Interactive UI
 * stays out of the top band (Liftoff's 50×50 corners, Unity's close button) and the
 * bottom band (Unity's consent UI).
 */
import { BURNERS, COUNTER_SLOTS } from './kitchen.ts';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface KitaLayout {
  readonly portrait: boolean;
  /** Scale of everything, 1 on a 400×760 portrait screen. */
  readonly unit: number;
  readonly floorY: number;
  readonly sign: Point;
  readonly coins: Point;
  /** Feet of the customers at each counter slot. */
  readonly customers: readonly Point[];
  /** Touch area of each customer, including the order bubble. */
  readonly customerAreas: readonly Box[];
  readonly counter: Box;
  readonly stove: Box;
  readonly burners: readonly Point[];
  readonly cook: Point;
  readonly cta: Point & { readonly scale: number };
}

const TOP_BAND = 56;
/** Customers and the cook are drawn at this multiple of the art's 70 px height. */
export const CHARACTER_SCALE = 1.5;

export function computeLayout(width: number, height: number): KitaLayout {
  const portrait = width < height;
  const unit = portrait ? Math.min(width / 400, height / 760) : Math.min(width / 760, height / 420);
  const top = Math.max(TOP_BAND, height * 0.07);
  const bottom = Math.max(24, height * 0.05);

  const sign = { x: width / 2, y: top + 26 * unit };
  const coins = { x: width / 2, y: top + 70 * unit };
  const cta = { x: 0, y: 0, scale: unit };

  let counterCenter: Point;
  let stoveCenter: Point;
  let ctaPoint: Point;
  if (portrait) {
    counterCenter = { x: width / 2, y: top + 290 * unit };
    stoveCenter = { x: width / 2 + 30 * unit, y: counterCenter.y + 190 * unit };
    ctaPoint = { x: width / 2, y: height - bottom - 44 * unit };
  } else {
    counterCenter = { x: width * 0.33, y: top + 250 * unit };
    stoveCenter = { x: width * 0.76, y: top + 175 * unit };
    ctaPoint = { x: width * 0.76, y: height - bottom - 40 * unit };
  }

  const spacing = 112 * unit;
  const customers = Array.from({ length: COUNTER_SLOTS }, (_, slot) => ({
    x: counterCenter.x + (slot - 1) * spacing,
    y: counterCenter.y - 8 * unit,
  }));
  const charHeight = 70 * CHARACTER_SCALE * unit;
  const customerAreas = customers.map((feet) => ({
    x: feet.x - spacing / 2,
    y: feet.y - charHeight - 70 * unit,
    width: spacing,
    height: charHeight + 70 * unit,
  }));
  const counterWidth = spacing * COUNTER_SLOTS + 24 * unit;
  const counter = {
    x: counterCenter.x - counterWidth / 2,
    y: counterCenter.y - 18 * unit,
    width: counterWidth,
    height: 56 * unit,
  };

  const stoveWidth = 210 * unit;
  const stoveHeight = 170 * unit;
  const stove = {
    x: stoveCenter.x - stoveWidth / 2,
    y: stoveCenter.y - stoveHeight / 2,
    width: stoveWidth,
    height: stoveHeight,
  };
  const burners = Array.from({ length: BURNERS }, (_, i) => ({
    x: stoveCenter.x + (i % 2 === 0 ? -1 : 1) * 52 * unit,
    y: stoveCenter.y + (i < 2 ? -46 : 26) * unit,
  }));
  const cook = { x: stove.x - 46 * unit, y: stove.y + stoveHeight * 0.75 };

  return {
    portrait,
    unit,
    floorY: counterCenter.y - 40 * unit,
    sign,
    coins,
    customers,
    customerAreas,
    counter,
    stove,
    burners,
    cook,
    cta: { ...cta, ...ctaPoint },
  };
}
