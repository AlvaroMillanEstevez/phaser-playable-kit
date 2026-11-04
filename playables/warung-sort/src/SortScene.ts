import Phaser from 'phaser';
import type { PlayableRuntime } from '../../../src/core/index.ts';
import type { Synth } from '../../../src/core/synth.ts';
import { createButton, type ButtonStyle } from '../../../src/kit/button.ts';
import { TutorialHand } from '../../../src/kit/hand.ts';
import ayamGoreng from '../assets/ayam-goreng.webp';
import backgroundLandscape from '../assets/background-landscape.webp';
import backgroundPortrait from '../assets/background-portrait.webp';
import durian from '../assets/durian.webp';
import manggis from '../assets/manggis.webp';
import mieGoreng from '../assets/mie-goreng.webp';
import shelfUrl from '../assets/shelf.webp';
import { findHint, freeSlots, move, type Board, type SlotRef } from './board.ts';
import { computeLayout, slotPosition, type Layout } from './layout.ts';
import { createLevel, ITEM_TYPES } from './level.ts';
import { SOUNDS } from './sounds.ts';

export const FONT_FAMILY = 'Fredoka';

const ITEM_URLS: Record<(typeof ITEM_TYPES)[number], string> = {
  'ayam-goreng': ayamGoreng,
  'mie-goreng': mieGoreng,
  durian,
  manggis,
};

/** Play time after the first interaction, then the end card shows anyway. */
const PLAY_TIME_MS = 25_000;
/** Without input for this long, the tutorial hand comes back. */
const IDLE_HINT_MS = 4_000;
const PRAISE = ['Enak!', 'Great!', 'Mantap!', 'Nice!'];

const COLORS = {
  text: '#fff4e0',
  stroke: '#4a2a12',
  cta: 0xf28c28,
  ctaShadow: 0xa8540c,
  panel: 0x5a3a22,
  panelBorder: 0xe9b872,
  sparkle: [0xffd166, 0xf28c28, 0xfff4e0],
};

interface EndCard {
  readonly shade: Phaser.GameObjects.Rectangle;
  readonly card: Phaser.GameObjects.Container;
  readonly panel: Phaser.GameObjects.Graphics;
  readonly gameName: Phaser.GameObjects.Text;
  readonly heading: Phaser.GameObjects.Text;
  readonly icons: readonly Phaser.GameObjects.Image[];
  readonly subtitle: Phaser.GameObjects.Text;
  readonly button: Phaser.GameObjects.Container;
}

const END_CARD_WIDTH = 360;
const END_CARD_HEIGHT = 400;

const slotKey = (ref: SlotRef): string => `${ref.shelf}:${ref.slot}`;

export class SortScene extends Phaser.Scene {
  private readonly runtime: PlayableRuntime;
  private readonly synth: Synth;
  private board: Board = createLevel();
  private layout!: Layout;
  private background!: Phaser.GameObjects.Image;
  private readonly shelves: Phaser.GameObjects.Image[] = [];
  private readonly items = new Map<string, Phaser.GameObjects.Image>();
  private readonly slotOf = new Map<Phaser.GameObjects.Image, SlotRef>();
  private title!: Phaser.GameObjects.Text;
  private cta!: Phaser.GameObjects.Container;
  private hand!: TutorialHand;
  private ghost!: Phaser.GameObjects.Image;
  private idleTimer: Phaser.Time.TimerEvent | undefined;
  private playTimer: Phaser.Time.TimerEvent | undefined;
  private dragging: Phaser.GameObjects.Image | undefined;
  private endCard: EndCard | undefined;
  private cleared = 0;
  private ended = false;

  constructor(runtime: PlayableRuntime, synth: Synth) {
    super('sort');
    this.runtime = runtime;
    this.synth = synth;
  }

  preload(): void {
    for (const type of ITEM_TYPES) this.load.image(type, ITEM_URLS[type]);
    this.load.image('shelf', shelfUrl);
    this.load.image('background-portrait', backgroundPortrait);
    this.load.image('background-landscape', backgroundLandscape);
  }

  create(): void {
    this.background = this.add.image(0, 0, 'background-portrait').setOrigin(0.5);
    this.board.shelves.forEach((shelf, shelfIndex) => {
      this.shelves.push(this.add.image(0, 0, 'shelf').setOrigin(0));
      shelf.forEach((type, slot) => {
        if (type !== null) this.createItem(type, { shelf: shelfIndex, slot });
      });
    });

    this.title = this.add
      .text(0, 0, 'Sort 3 of a kind!', {
        fontFamily: FONT_FAMILY,
        color: COLORS.text,
        stroke: COLORS.stroke,
        strokeThickness: 8,
        align: 'center',
      })
      .setOrigin(0.5);

    this.cta = createButton(this, 'PLAY NOW', this.buttonStyle(220, 64, 30), () => {
      this.runtime.cta();
    });
    this.tweens.add({
      targets: this.cta,
      angle: { from: -2, to: 2 },
      duration: 900,
      yoyo: true,
      repeat: -1,
    });

    this.ghost = this.add.image(0, 0, ITEM_TYPES[0]).setAlpha(0.9).setDepth(99).setVisible(false);
    this.hand = new TutorialHand(this);

    this.input.on('dragstart', (pointer: Phaser.Input.Pointer, image: Phaser.GameObjects.Image) => {
      this.onDragStart(pointer, image);
    });
    this.input.on(
      'drag',
      (pointer: Phaser.Input.Pointer, image: Phaser.GameObjects.Image, x: number, y: number) => {
        this.onDrag(pointer, image, x, y);
      },
    );
    this.input.on('dragend', (pointer: Phaser.Input.Pointer, image: Phaser.GameObjects.Image) => {
      this.onDragEnd(pointer, image);
    });

    this.applyLayout();
    this.scale.on(Phaser.Scale.Events.RESIZE, () => {
      this.applyLayout();
    });
    this.time.delayedCall(500, () => {
      this.showHint();
    });
  }

  private buttonStyle(width: number, height: number, fontSize: number): ButtonStyle {
    return {
      width,
      height,
      fontSize,
      fill: COLORS.cta,
      shadow: COLORS.ctaShadow,
      textColor: COLORS.text,
      fontFamily: FONT_FAMILY,
    };
  }

  private createItem(type: string, ref: SlotRef): void {
    const image = this.add.image(0, 0, type).setDepth(10);
    image.setInteractive({ draggable: true, useHandCursor: true });
    this.items.set(slotKey(ref), image);
    this.slotOf.set(image, ref);
  }

  // ---------------------------------------------------------------- layout

  private applyLayout(): void {
    const { width, height } = this.scale;
    const layout = computeLayout(width, height, this.board.shelves.length);
    this.layout = layout;

    const backgroundKey = layout.portrait ? 'background-portrait' : 'background-landscape';
    this.background.setTexture(backgroundKey).setPosition(width / 2, height / 2);
    const cover = Math.max(width / this.background.width, height / this.background.height);
    this.background.setScale(cover);

    layout.shelves.forEach((rect, index) => {
      this.shelves[index]?.setPosition(rect.x, rect.y).setDisplaySize(rect.width, rect.height);
    });
    for (const [image, ref] of this.slotOf) {
      this.fitItem(image);
      if (image !== this.dragging) this.placeItem(image, ref);
    }

    this.title.setPosition(layout.title.x, layout.title.y).setFontSize(layout.title.fontSize);
    this.cta.setPosition(layout.cta.x, layout.cta.y).setScale(layout.cta.scale);
    this.layoutEndCard();
    if (this.hand.active) this.showHint();
  }

  /** Sizes an item and gives it a touch area as big as its cubby. */
  private fitItem(image: Phaser.GameObjects.Image): void {
    const { itemSize, hitArea } = this.layout;
    image.setDisplaySize(itemSize, itemSize);
    const hitWidth = hitArea.width / image.scaleX;
    const hitHeight = hitArea.height / image.scaleY;
    const area = image.input?.hitArea as Phaser.Geom.Rectangle | undefined;
    area?.setTo((image.width - hitWidth) / 2, (image.height - hitHeight) / 2, hitWidth, hitHeight);
  }

  private slotPoint(ref: SlotRef): { x: number; y: number } {
    const shelf = this.layout.shelves[ref.shelf];
    return shelf ? slotPosition(shelf, ref.slot) : { x: 0, y: 0 };
  }

  private placeItem(image: Phaser.GameObjects.Image, ref: SlotRef): void {
    const { x, y } = this.slotPoint(ref);
    image.setPosition(x, y);
  }

  // ---------------------------------------------------------------- input

  private onDragStart(_pointer: Phaser.Input.Pointer, image: Phaser.GameObjects.Image): void {
    if (this.ended) return;
    this.runtime.markInteraction();
    this.playTimer ??= this.time.delayedCall(PLAY_TIME_MS, () => {
      this.showEndCard(false);
    });
    this.hand.stop();
    this.idleTimer?.remove();
    this.dragging = image;
    image.setDepth(50);
    this.tweens.add({ targets: image, scale: image.scale * 1.15, duration: 90 });
    this.synth.play(SOUNDS.pick);
  }

  private onDrag(
    _pointer: Phaser.Input.Pointer,
    image: Phaser.GameObjects.Image,
    x: number,
    y: number,
  ): void {
    if (image === this.dragging) image.setPosition(x, y);
  }

  private onDragEnd(pointer: Phaser.Input.Pointer, image: Phaser.GameObjects.Image): void {
    if (image !== this.dragging) return;
    this.dragging = undefined;
    image.setDepth(10);
    const from = this.slotOf.get(image);
    const to = this.dropTarget(pointer.x, pointer.y);
    const result = from && to ? move(this.board, from, to) : null;

    if (!from || !to || !result) {
      this.synth.play(SOUNDS.invalid);
      if (from) this.tweenTo(image, from);
      this.scheduleIdleHint();
      return;
    }

    this.board = result.board;
    this.items.delete(slotKey(from));
    this.items.set(slotKey(to), image);
    this.slotOf.set(image, to);
    this.tweenTo(image, to);
    this.synth.play(SOUNDS.drop);

    if (result.cleared !== null) {
      const shelf = result.cleared;
      this.time.delayedCall(140, () => {
        this.clearShelf(shelf);
      });
    }
    if (result.won) {
      this.time.delayedCall(900, () => {
        this.showEndCard(true);
      });
    } else {
      this.scheduleIdleHint();
    }
  }

  /** The free slot of the shelf under the pointer that is closest to it. */
  private dropTarget(x: number, y: number): SlotRef | null {
    const index = this.layout.shelves.findIndex((rect) => {
      const marginX = rect.width * 0.08;
      const marginY = rect.height * 0.15;
      return (
        x >= rect.x - marginX &&
        x <= rect.x + rect.width + marginX &&
        y >= rect.y - marginY &&
        y <= rect.y + rect.height + marginY
      );
    });
    if (index === -1) return null;
    let best: SlotRef | null = null;
    let bestDistance = Infinity;
    for (const slot of freeSlots(this.board, index)) {
      const distance = Math.abs(this.slotPoint({ shelf: index, slot }).x - x);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = { shelf: index, slot };
      }
    }
    return best;
  }

  private tweenTo(image: Phaser.GameObjects.Image, ref: SlotRef): void {
    const { x, y } = this.slotPoint(ref);
    const scale = this.layout.itemSize / image.width;
    this.tweens.add({ targets: image, x, y, scale, duration: 140, ease: 'Back.Out' });
  }

  // ---------------------------------------------------------------- feedback

  private clearShelf(shelf: number): void {
    this.cleared += 1;
    this.synth.play(SOUNDS.clear);
    const center = this.slotPoint({ shelf, slot: 1 });
    for (let slot = 0; slot < 3; slot++) {
      const key = slotKey({ shelf, slot });
      const image = this.items.get(key);
      if (!image) continue;
      this.items.delete(key);
      this.slotOf.delete(image);
      this.tweens.add({
        targets: image,
        x: center.x,
        scale: image.scale * 1.3,
        alpha: 0,
        duration: 260,
        ease: 'Cubic.In',
        onComplete: () => {
          image.destroy();
        },
      });
    }
    this.sparkle(center.x, center.y);
    const praise = this.add
      .text(center.x, center.y, PRAISE[(this.cleared - 1) % PRAISE.length] ?? '', {
        fontFamily: FONT_FAMILY,
        fontSize: `${Math.round(this.layout.itemSize * 0.5)}px`,
        color: '#ffd166',
        stroke: COLORS.stroke,
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(60);
    this.tweens.add({
      targets: praise,
      y: center.y - this.layout.itemSize,
      alpha: { from: 1, to: 0 },
      duration: 800,
      ease: 'Cubic.Out',
      onComplete: () => {
        praise.destroy();
      },
    });
    const shelfImage = this.shelves[shelf];
    if (shelfImage) {
      this.tweens.add({ targets: shelfImage, y: shelfImage.y - 4, duration: 70, yoyo: true });
    }
  }

  private sparkle(x: number, y: number): void {
    const size = this.layout.itemSize;
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10;
      const color = COLORS.sparkle[i % COLORS.sparkle.length] ?? 0xffffff;
      const star = this.add.star(x, y, 4, size * 0.04, size * 0.12, color).setDepth(55);
      this.tweens.add({
        targets: star,
        x: x + Math.cos(angle) * size * 1.1,
        y: y + Math.sin(angle) * size * 0.8,
        angle: 180,
        alpha: 0,
        duration: 500,
        ease: 'Cubic.Out',
        onComplete: () => {
          star.destroy();
        },
      });
    }
  }

  // ---------------------------------------------------------------- tutorial

  private showHint(): void {
    if (this.ended || this.dragging) return;
    const hint = findHint(this.board);
    const type = hint && this.board.shelves[hint.from.shelf]?.[hint.from.slot];
    if (!hint || !type) return;
    this.ghost.setTexture(type).setDisplaySize(this.layout.itemSize, this.layout.itemSize);
    const handScale = this.layout.itemSize / 80;
    this.hand.showDrag(this.slotPoint(hint.from), this.slotPoint(hint.to), handScale, this.ghost);
  }

  private scheduleIdleHint(): void {
    this.idleTimer?.remove();
    this.idleTimer = this.time.delayedCall(IDLE_HINT_MS, () => {
      this.showHint();
    });
  }

  // ---------------------------------------------------------------- end card

  private showEndCard(won: boolean): void {
    if (this.ended) return;
    this.ended = true;
    this.runtime.gameEnd();
    this.hand.stop();
    this.idleTimer?.remove();
    this.playTimer?.remove();
    this.cta.setVisible(false);
    this.input.setDragState(this.input.activePointer, 0);
    for (const image of this.slotOf.keys()) image.disableInteractive();
    if (won) this.synth.play(SOUNDS.win);

    // If the player never touched the board, the first tap on the end card only counts
    // as interaction: networks forbid opening the store on the first tap.
    const shade = this.add.rectangle(0, 0, 10, 10, 0x1a0e06, 0.7).setOrigin(0).setInteractive();
    shade.on('pointerdown', () => {
      this.runtime.markInteraction();
    });

    const panel = this.add.graphics();
    const heading = this.add
      .text(0, 0, won ? 'Warung tidy!' : "Time's up!", {
        fontFamily: FONT_FAMILY,
        fontSize: '44px',
        color: COLORS.text,
        stroke: COLORS.stroke,
        strokeThickness: 8,
      })
      .setOrigin(0.5);
    const subtitle = this.add
      .text(0, 0, won ? '50 levels are waiting for you!' : 'Finish sorting in the full game', {
        fontFamily: FONT_FAMILY,
        fontSize: '22px',
        color: COLORS.text,
        align: 'center',
      })
      .setOrigin(0.5);
    const gameName = this.add
      .text(0, 0, 'Nusa: Warung Sort', {
        fontFamily: FONT_FAMILY,
        fontSize: '30px',
        color: '#ffd166',
        stroke: COLORS.stroke,
        strokeThickness: 6,
      })
      .setOrigin(0.5);
    const icons = ITEM_TYPES.map((type, i) => {
      const icon = this.add.image(0, 0, type).setDisplaySize(64, 64);
      this.tweens.add({
        targets: icon,
        y: '-=8',
        duration: 500,
        delay: i * 120,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
      return icon;
    });
    const button = createButton(this, 'PLAY NOW', this.buttonStyle(260, 76, 36), () => {
      if (!this.runtime.cta()) this.runtime.markInteraction();
    });
    this.tweens.add({ targets: button, scale: 1.07, duration: 600, yoyo: true, repeat: -1 });

    const card = this.add
      .container(0, 0, [panel, gameName, heading, ...icons, subtitle, button])
      .setDepth(201);
    shade.setDepth(200);
    this.endCard = { shade, card, panel, gameName, heading, icons, subtitle, button };
    this.layoutEndCard();
    const fit = card.scale;
    card.setScale(fit * 0.6).setAlpha(0);
    this.tweens.add({ targets: card, scale: fit, alpha: 1, duration: 320, ease: 'Back.Out' });
  }

  private layoutEndCard(): void {
    const endCard = this.endCard;
    if (!endCard) return;
    const { width, height } = this.scale;
    const { shade, card, panel, gameName, heading, icons, subtitle, button } = endCard;
    shade.setSize(width, height);
    (shade.input?.hitArea as Phaser.Geom.Rectangle | undefined)?.setTo(0, 0, width, height);

    const w = END_CARD_WIDTH;
    const h = END_CARD_HEIGHT;
    panel
      .clear()
      .fillStyle(COLORS.panel, 0.96)
      .fillRoundedRect(-w / 2, -h / 2, w, h, 28)
      .lineStyle(6, COLORS.panelBorder, 1)
      .strokeRoundedRect(-w / 2, -h / 2, w, h, 28);
    gameName.setPosition(0, -150);
    heading.setPosition(0, -92);
    icons.forEach((icon, i) => icon.setPosition((i - 1.5) * 76, -10));
    subtitle.setPosition(0, 60).setWordWrapWidth(w - 40);
    button.setPosition(0, 140);

    card.setPosition(width / 2, height / 2);
    card.setScale(Math.min((width * 0.9) / w, (height * 0.8) / h, 1.6));
  }
}
