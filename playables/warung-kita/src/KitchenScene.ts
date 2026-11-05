import Phaser from 'phaser';
import type { PlayableRuntime } from '../../../src/core/index.ts';
import type { Synth } from '../../../src/core/synth.ts';
import { createButton, type ButtonStyle } from '../../../src/kit/button.ts';
import { TutorialHand } from '../../../src/kit/hand.ts';
import {
  createCharacter,
  css,
  drawCounter,
  drawMeal,
  drawRoom,
  drawStove,
  FONT,
  PALETTE,
} from './art.ts';
import {
  cook,
  createKitchen,
  hint,
  patienceLeft,
  RULES,
  serve,
  tick,
  type Kitchen,
  type Status,
  type Step,
} from './kitchen.ts';
import { CHARACTER_SCALE, computeLayout, type Box, type KitaLayout, type Point } from './layout.ts';
import { SOUNDS } from './sounds.ts';

/** Without input for this long, the tutorial hand comes back. */
const IDLE_HINT_MS = 3000;
/** Longest frame step fed to the rules, so a stalled tab does not skip ahead. */
const MAX_STEP_MS = 100;
const TEXT_RESOLUTION = 2;

const END_TEXT: Record<Exclude<Status, 'playing'>, { heading: string; subtitle: string }> = {
  won: {
    heading: 'Great service!',
    subtitle: 'Grow your warung from one stove to a full restaurant',
  },
  lost: { heading: 'Too slow!', subtitle: 'Hire cooks and a cashier to keep up with the rush' },
  timeUp: {
    heading: 'What a rush!',
    subtitle: 'Grow your warung from one stove to a full restaurant',
  },
};

interface CustomerView {
  readonly id: number;
  readonly root: Phaser.GameObjects.Container;
  readonly bubble: Phaser.GameObjects.Container;
  readonly ring: Phaser.GameObjects.Graphics;
}

interface BurnerView {
  readonly progress: Phaser.GameObjects.Graphics;
  readonly plate: Phaser.GameObjects.Container;
}

export class KitchenScene extends Phaser.Scene {
  private readonly runtime: PlayableRuntime;
  private readonly synth: Synth;
  private kitchen: Kitchen = createKitchen();
  private layout!: KitaLayout;
  private room!: Phaser.GameObjects.Graphics;
  private furniture!: Phaser.GameObjects.Graphics;
  private cookCharacter!: Phaser.GameObjects.Container;
  private sign!: Phaser.GameObjects.Container;
  private coinsPill!: Phaser.GameObjects.Container;
  private coinsText!: Phaser.GameObjects.Text;
  private stoveZone!: Phaser.GameObjects.Zone;
  private readonly customerZones: Phaser.GameObjects.Zone[] = [];
  private readonly customers = new Map<number, CustomerView>();
  private readonly burners: BurnerView[] = [];
  private cta!: Phaser.GameObjects.Container;
  private hand!: TutorialHand;
  private ghostPlate!: Phaser.GameObjects.Container;
  private idleTimer: Phaser.Time.TimerEvent | undefined;
  private dragging: number | undefined;
  private endCard: Phaser.GameObjects.Container | undefined;
  private ended = false;

  constructor(runtime: PlayableRuntime, synth: Synth) {
    super('kitchen');
    this.runtime = runtime;
    this.synth = synth;
  }

  create(): void {
    this.room = this.add.graphics();
    this.furniture = this.add.graphics().setDepth(2);
    this.cookCharacter = createCharacter(this, 'cook', 1).setDepth(3);
    this.sign = this.createSign();
    this.coinsPill = this.createCoinsPill();

    this.stoveZone = this.add.zone(0, 0, 1, 1).setOrigin(0).setInteractive({ useHandCursor: true });
    this.stoveZone.on('pointerdown', () => {
      this.onStoveTapped();
    });
    for (let slot = 0; slot < this.kitchen.counter.length; slot++) {
      const zone = this.add.zone(0, 0, 1, 1).setOrigin(0).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        this.onCustomerTapped(slot);
      });
      this.customerZones.push(zone);
    }

    this.kitchen.burners.forEach((_, index) => {
      const progress = this.add.graphics().setDepth(6);
      const plate = this.createPlate().setDepth(7).setVisible(false);
      plate.setInteractive({ draggable: true, useHandCursor: true });
      plate.on('dragstart', () => {
        this.onPlateDragStart(index);
      });
      plate.on('drag', (_pointer: Phaser.Input.Pointer, x: number, y: number) => {
        plate.setPosition(x, y);
      });
      plate.on('dragend', (pointer: Phaser.Input.Pointer) => {
        this.onPlateDrop(index, pointer.x, pointer.y);
      });
      this.burners.push({ progress, plate });
    });

    this.cta = createButton(this, 'LEARN MORE', this.buttonStyle(230, 62, 28), () => {
      this.runtime.cta();
    }).setDepth(20);
    this.tweens.add({
      targets: this.cta,
      angle: { from: -2, to: 2 },
      duration: 900,
      yoyo: true,
      repeat: -1,
    });

    this.ghostPlate = this.createPlate().setDepth(99).setAlpha(0.9).setVisible(false);
    this.hand = new TutorialHand(this);

    this.applyLayout();
    this.kitchen.counter.forEach((customer, slot) => {
      if (customer) this.addCustomer(customer.id, slot, false);
    });
    this.scale.on(Phaser.Scale.Events.RESIZE, () => {
      this.applyLayout();
    });
    this.time.delayedCall(500, () => {
      this.showHint();
    });
  }

  override update(_time: number, delta: number): void {
    if (this.ended) return;
    this.apply(tick(this.kitchen, Math.min(delta, MAX_STEP_MS)));
    this.drawDynamic();
  }

  // ---------------------------------------------------------------- building blocks

  private buttonStyle(width: number, height: number, fontSize: number): ButtonStyle {
    return {
      width,
      height,
      fontSize,
      fill: PALETTE.coral,
      shadow: 0x9c4f3c,
      textColor: css(PALETTE.cream),
      fontFamily: FONT,
    };
  }

  private text(content: string, size: number, color: number, bold = true): Phaser.GameObjects.Text {
    return this.add
      .text(0, 0, content, {
        fontFamily: FONT,
        fontSize: `${size}px`,
        fontStyle: bold ? 'bold' : 'normal',
        color: css(color),
        align: 'center',
        resolution: TEXT_RESOLUTION,
      })
      .setOrigin(0.5);
  }

  private createSign(): Phaser.GameObjects.Container {
    const g = this.add.graphics();
    g.fillStyle(PALETTE.shadow, 0.1).fillRoundedRect(-124, -26, 248, 60, 14);
    g.fillStyle(PALETTE.cream).fillRoundedRect(-124, -30, 248, 60, 14);
    g.lineStyle(2, PALETTE.wallShade).strokeRoundedRect(-118, -24, 236, 48, 10);
    const title = this.text('Warung Kita', 30, PALETTE.green);
    return this.add.container(0, 0, [g, title]).setDepth(10);
  }

  private createCoinsPill(): Phaser.GameObjects.Container {
    const g = this.add.graphics();
    g.fillStyle(PALETTE.cream).fillRoundedRect(-56, -18, 112, 36, 18);
    g.fillStyle(PALETTE.gold).fillCircle(-34, 0, 11);
    g.fillStyle(PALETTE.cream, 0.6).fillCircle(-34, 0, 5);
    this.coinsText = this.text('0', 22, PALETTE.ink).setOrigin(0, 0.5).setPosition(-16, 0);
    return this.add.container(0, 0, [g, this.coinsText]).setDepth(10);
  }

  private createPlate(): Phaser.GameObjects.Container {
    const g = this.add.graphics();
    drawMeal(g, 0, 0, 2);
    return this.add.container(0, 0, [g]).setSize(64, 44);
  }

  private createBubble(): Phaser.GameObjects.Container {
    const g = this.add.graphics();
    g.fillStyle(PALETTE.shadow, 0.12).fillCircle(2, 3, 30);
    g.fillStyle(PALETTE.cream).fillCircle(0, 0, 30);
    g.fillTriangle(-8, 26, 8, 26, 0, 38);
    drawMeal(g, 0, 2, 1.5);
    return this.add.container(0, 0, [g]);
  }

  // ---------------------------------------------------------------- layout

  private applyLayout(): void {
    const { width, height } = this.scale;
    const layout = computeLayout(width, height);
    this.layout = layout;
    const { unit } = layout;

    drawRoom(this.room, width, height, layout.floorY, unit);
    this.furniture.clear();
    drawStove(this.furniture, toRect(layout.stove), layout.burners, unit);
    drawCounter(this.furniture, toRect(layout.counter), unit);
    // Customers stand behind the counter, so the counter is drawn above them.
    this.furniture.setDepth(5);
    this.room.setDepth(0);

    this.cookCharacter.setPosition(layout.cook.x, layout.cook.y).setScale(CHARACTER_SCALE * unit);
    this.sign.setPosition(layout.sign.x, layout.sign.y).setScale(unit);
    this.coinsPill.setPosition(layout.coins.x, layout.coins.y).setScale(unit);
    this.stoveZone
      .setPosition(layout.stove.x, layout.stove.y)
      .setSize(layout.stove.width, layout.stove.height);
    layout.customerAreas.forEach((area, slot) => {
      this.customerZones[slot]?.setPosition(area.x, area.y).setSize(area.width, area.height);
    });
    this.burners.forEach((burner, index) => {
      const at = layout.burners[index];
      if (at && index !== this.dragging) burner.plate.setPosition(at.x, at.y).setScale(unit);
    });
    this.ghostPlate.setScale(unit);
    for (const [slot, view] of this.customerViewsBySlot()) this.placeCustomer(view, slot);
    this.cta.setPosition(layout.cta.x, layout.cta.y).setScale(layout.cta.scale);
    this.layoutEndCard();
    if (this.hand.active) this.showHint();
  }

  private customerViewsBySlot(): [number, CustomerView][] {
    const result: [number, CustomerView][] = [];
    this.kitchen.counter.forEach((customer, slot) => {
      const view = customer && this.customers.get(customer.id);
      if (view) result.push([slot, view]);
    });
    return result;
  }

  private placeCustomer(view: CustomerView, slot: number): void {
    const feet = this.layout.customers[slot];
    if (!feet) return;
    view.root.setPosition(feet.x, feet.y).setScale(CHARACTER_SCALE * this.layout.unit);
    view.bubble.setPosition(feet.x, this.bubbleY(feet)).setScale(this.layout.unit);
    view.ring.setPosition(view.bubble.x, view.bubble.y);
  }

  private bubbleY(feet: Point): number {
    return feet.y - (70 * CHARACTER_SCALE + 44) * this.layout.unit;
  }

  // ---------------------------------------------------------------- input

  private interacted(): void {
    this.runtime.markInteraction();
    this.hand.stop();
    this.scheduleIdleHint();
  }

  private onStoveTapped(): void {
    if (this.ended) return;
    this.interacted();
    const step = cook(this.kitchen);
    if (step.events.length === 0) this.synth.play(SOUNDS.invalid);
    this.apply(step);
  }

  private onCustomerTapped(slot: number): void {
    if (this.ended) return;
    this.interacted();
    const burner = this.kitchen.burners.findIndex((b) => b.kind === 'ready');
    if (burner === -1 || !this.kitchen.counter[slot]) return;
    this.apply(serve(this.kitchen, burner, slot));
  }

  private onPlateDragStart(burner: number): void {
    if (this.ended) return;
    this.interacted();
    this.dragging = burner;
    this.burners[burner]?.plate.setDepth(50);
    this.synth.play(SOUNDS.pick);
  }

  private onPlateDrop(burner: number, x: number, y: number): void {
    if (this.dragging !== burner) return;
    this.dragging = undefined;
    const view = this.burners[burner];
    view?.plate.setDepth(7);
    const slot = this.layout.customerAreas.findIndex((area) => contains(area, x, y));
    const step = slot === -1 ? null : serve(this.kitchen, burner, slot);
    if (!step || step.events.length === 0) {
      this.synth.play(SOUNDS.invalid);
      const home = this.layout.burners[burner];
      if (view && home)
        this.tweens.add({
          targets: view.plate,
          x: home.x,
          y: home.y,
          duration: 160,
          ease: 'Back.Out',
        });
      return;
    }
    this.apply(step);
  }

  // ---------------------------------------------------------------- state changes

  private apply(step: Step): void {
    const before = this.kitchen;
    this.kitchen = step.kitchen;
    for (const event of step.events) {
      switch (event.type) {
        case 'cookStarted':
          this.synth.play(SOUNDS.sizzle);
          break;
        case 'cooked':
          this.showPlate(event.burner);
          break;
        case 'arrived': {
          const customer = this.kitchen.counter[event.slot];
          if (customer) this.addCustomer(customer.id, event.slot, true);
          break;
        }
        case 'left': {
          const customer = before.counter[event.slot];
          if (customer) this.customerLeaves(customer.id);
          break;
        }
        case 'served': {
          const customer = before.counter[event.slot];
          if (customer) this.customerServed(customer.id, event.burner, event.slot, event.coins);
          break;
        }
        case 'ended':
          this.finish(event.status);
          break;
      }
    }
  }

  private showPlate(burner: number): void {
    const view = this.burners[burner];
    const at = this.layout.burners[burner];
    if (!view || !at) return;
    this.synth.play(SOUNDS.ready);
    view.plate.setPosition(at.x, at.y).setVisible(true).setScale(0);
    this.tweens.add({
      targets: view.plate,
      scale: this.layout.unit,
      duration: 220,
      ease: 'Back.Out',
    });
    // Tutorial: show the serve gesture as soon as the first plate is ready.
    if (this.kitchen.served === 0 && this.dragging === undefined) this.showHint();
  }

  private addCustomer(id: number, slot: number, animate: boolean): void {
    const root = createCharacter(this, 'customer', id).setDepth(4);
    const ring = this.add.graphics().setDepth(8);
    const bubble = this.createBubble().setDepth(9);
    const view: CustomerView = { id, root, bubble, ring };
    this.customers.set(id, view);
    this.placeCustomer(view, slot);
    if (!animate) return;
    const enter = slot === 2 ? 1 : -1;
    root.setAlpha(0).x += enter * 60 * this.layout.unit;
    bubble.setScale(0);
    this.tweens.add({
      targets: root,
      x: root.x - enter * 60 * this.layout.unit,
      alpha: 1,
      duration: 350,
      ease: 'Sine.Out',
    });
    this.tweens.add({
      targets: bubble,
      scale: this.layout.unit,
      duration: 260,
      delay: 250,
      ease: 'Back.Out',
    });
  }

  private removeCustomer(id: number): CustomerView | undefined {
    const view = this.customers.get(id);
    this.customers.delete(id);
    view?.ring.destroy();
    return view;
  }

  private customerLeaves(id: number): void {
    const view = this.removeCustomer(id);
    if (!view) return;
    this.synth.play(SOUNDS.left);
    const mark = this.text('!', 40, PALETTE.coral)
      .setPosition(view.bubble.x, view.bubble.y)
      .setDepth(12);
    view.bubble.destroy();
    this.tweens.add({
      targets: [view.root, mark],
      alpha: 0,
      y: `+=${20 * this.layout.unit}`,
      duration: 600,
      delay: 300,
      onComplete: () => {
        view.root.destroy();
        mark.destroy();
      },
    });
  }

  private customerServed(id: number, burner: number, slot: number, coins: number): void {
    const view = this.removeCustomer(id);
    const plate = this.burners[burner]?.plate;
    const feet = this.layout.customers[slot];
    if (!view || !plate || !feet) return;
    this.synth.play(SOUNDS.coin);

    // The plate flies to the customer; a copy stays with them as they leave.
    const flying = this.createPlate()
      .setPosition(plate.x, plate.y)
      .setScale(this.layout.unit)
      .setDepth(30);
    plate.setVisible(false);
    view.bubble.destroy();
    this.tweens.add({
      targets: flying,
      x: feet.x,
      y: feet.y - 40 * this.layout.unit,
      duration: 220,
      ease: 'Sine.Out',
      onComplete: () => {
        this.tweens.add({
          targets: [view.root, flying],
          alpha: 0,
          y: `-=${16 * this.layout.unit}`,
          duration: 500,
          delay: 250,
          onComplete: () => {
            view.root.destroy();
            flying.destroy();
          },
        });
      },
    });
    this.tweens.add({
      targets: view.root,
      y: view.root.y - 10 * this.layout.unit,
      duration: 120,
      yoyo: true,
    });

    const floater = this.text(`+${coins}`, 30, PALETTE.gold)
      .setStroke(css(PALETTE.greenDark), 6)
      .setPosition(feet.x, this.bubbleY(feet))
      .setDepth(40)
      .setScale(this.layout.unit);
    this.tweens.add({
      targets: floater,
      y: floater.y - 40 * this.layout.unit,
      alpha: { from: 1, to: 0 },
      duration: 800,
      onComplete: () => {
        floater.destroy();
      },
    });
    this.coinsText.setText(String(this.kitchen.coins));
    this.tweens.add({
      targets: this.coinsPill,
      scale: this.layout.unit * 1.15,
      duration: 100,
      yoyo: true,
    });
  }

  private drawDynamic(): void {
    const { unit } = this.layout;
    this.kitchen.burners.forEach((burner, index) => {
      const view = this.burners[index];
      const at = this.layout.burners[index];
      if (!view || !at) return;
      view.progress.clear();
      if (burner.kind !== 'cooking') return;
      const value = Math.min(1, burner.elapsedMs / RULES.cookMs);
      // A pan with a growing ring of progress.
      view.progress.fillStyle(PALETTE.ink).fillCircle(at.x, at.y, 18 * unit);
      view.progress.fillStyle(PALETTE.woodLight).fillCircle(at.x, at.y, 12 * unit);
      view.progress.lineStyle(5 * unit, PALETTE.gold);
      view.progress.beginPath();
      view.progress.arc(at.x, at.y, 23 * unit, -Math.PI / 2, -Math.PI / 2 + value * Math.PI * 2);
      view.progress.strokePath();
    });
    for (const [slot, view] of this.customerViewsBySlot()) {
      const customer = this.kitchen.counter[slot];
      if (!customer) continue;
      const left = patienceLeft(customer);
      const color = left > 0.5 ? PALETTE.green : left > 0.25 ? PALETTE.gold : PALETTE.coral;
      view.ring.clear().lineStyle(6 * unit, color);
      view.ring.beginPath();
      view.ring.arc(0, 0, 36 * unit, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2);
      view.ring.strokePath();
    }
  }

  // ---------------------------------------------------------------- tutorial

  private showHint(): void {
    if (this.ended || this.dragging !== undefined) return;
    const next = hint(this.kitchen);
    const { unit } = this.layout;
    if (next?.kind === 'cook') {
      const { stove } = this.layout;
      this.hand.showTap({ x: stove.x + stove.width / 2, y: stove.y + stove.height / 2 }, unit);
    } else if (next?.kind === 'serve') {
      const from = this.layout.burners[next.burner];
      const feet = this.layout.customers[next.slot];
      if (!from || !feet) return;
      this.hand.showDrag(from, { x: feet.x, y: feet.y - 50 * unit }, unit, this.ghostPlate);
    }
  }

  private scheduleIdleHint(): void {
    this.idleTimer?.remove();
    this.idleTimer = this.time.delayedCall(IDLE_HINT_MS, () => {
      this.showHint();
    });
  }

  // ---------------------------------------------------------------- end card

  private finish(status: Exclude<Status, 'playing'>): void {
    if (this.ended) return;
    this.ended = true;
    this.hand.stop();
    this.idleTimer?.remove();
    this.input.setDragState(this.input.activePointer, 0);
    this.synth.play(status === 'won' ? SOUNDS.win : SOUNDS.lose);
    this.time.delayedCall(700, () => {
      this.showEndCard(status);
    });
  }

  private showEndCard(status: Exclude<Status, 'playing'>): void {
    this.runtime.gameEnd();
    this.cta.setVisible(false);
    const { heading, subtitle } = END_TEXT[status];

    // If the player never interacted, the first tap on the end card only counts as
    // interaction: networks forbid opening the store on the first tap.
    const shade = this.add
      .rectangle(0, 0, 10, 10, PALETTE.greenDark, 0.55)
      .setOrigin(0)
      .setInteractive();
    shade.on('pointerdown', () => {
      this.runtime.markInteraction();
    });

    const panel = this.add.graphics();
    panel.fillStyle(PALETTE.shadow, 0.15).fillRoundedRect(-176, -196, 360, 400, 28);
    panel.fillStyle(PALETTE.cream).fillRoundedRect(-180, -200, 360, 400, 28);
    panel.lineStyle(6, PALETTE.green).strokeRoundedRect(-180, -200, 360, 400, 28);
    const name = this.text('Warung Kita', 34, PALETTE.green).setPosition(0, -150);
    const title = this.text(heading, 28, PALETTE.coral).setPosition(0, -106);
    // A jade backdrop so the cream chef hat and plate stand out from the cream panel.
    panel.fillStyle(PALETTE.greenLight, 0.28).fillRoundedRect(-130, -78, 260, 102, 20);
    const chef = createCharacter(this, 'cook', 1).setPosition(-50, 18).setScale(1.25);
    const plate = this.createPlate().setPosition(48, -14).setScale(1.2);
    this.tweens.add({
      targets: plate,
      y: -22,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
    const coins = this.text(
      `${this.kitchen.coins} coins earned`,
      18,
      PALETTE.ink,
      false,
    ).setPosition(0, 44);
    const body = this.text(subtitle, 17, PALETTE.ink, false)
      .setPosition(0, 80)
      .setWordWrapWidth(310);
    const note = this.text('In development', 14, PALETTE.green, false).setPosition(0, 112);
    const button = createButton(this, 'LEARN MORE', this.buttonStyle(250, 60, 28), () => {
      if (!this.runtime.cta()) this.runtime.markInteraction();
    }).setPosition(0, 160);
    this.tweens.add({ targets: button, scale: 1.06, duration: 600, yoyo: true, repeat: -1 });

    const card = this.add.container(0, 0, [
      panel,
      name,
      title,
      chef,
      plate,
      coins,
      body,
      note,
      button,
    ]);
    this.endCard = this.add.container(0, 0, [shade, card]).setDepth(200);
    this.layoutEndCard();
    const fit = card.scale;
    card.setScale(fit * 0.6).setAlpha(0);
    this.tweens.add({ targets: card, scale: fit, alpha: 1, duration: 320, ease: 'Back.Out' });
  }

  private layoutEndCard(): void {
    if (!this.endCard) return;
    const { width, height } = this.scale;
    const [shade, card] = this.endCard.list as [
      Phaser.GameObjects.Rectangle,
      Phaser.GameObjects.Container,
    ];
    shade.setSize(width, height);
    (shade.input?.hitArea as Phaser.Geom.Rectangle | undefined)?.setTo(0, 0, width, height);
    card.setPosition(width / 2, height / 2);
    card.setScale(Math.min((width * 0.9) / 360, (height * 0.82) / 400, 1.6));
  }
}

function toRect(box: Box): Phaser.Geom.Rectangle {
  return new Phaser.Geom.Rectangle(box.x, box.y, box.width, box.height);
}

function contains(box: Box, x: number, y: number): boolean {
  return x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;
}
