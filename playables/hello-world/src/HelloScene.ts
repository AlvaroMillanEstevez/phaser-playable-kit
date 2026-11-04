import Phaser from 'phaser';
import type { PlayableRuntime } from '../../../src/core/index.ts';

const TAPS_TO_WIN = 5;
const TIME_LIMIT_MS = 20_000;
const COLORS = { accent: 0xffc857, cta: 0x2ec4b6, text: '#ffffff' };

/**
 * Smallest complete playable: tutorial hint, one mechanic (tap the moving star),
 * an always-available CTA and an end card. Every visual is generated in code.
 */
export class HelloScene extends Phaser.Scene {
  private taps = 0;
  private ended = false;
  private star!: Phaser.GameObjects.Star;
  private hand!: Phaser.GameObjects.Container;
  private counter!: Phaser.GameObjects.Text;
  private ctaButton!: Phaser.GameObjects.Container;
  private endCard: Phaser.GameObjects.Container | undefined;
  private readonly runtime: PlayableRuntime;

  constructor(runtime: PlayableRuntime) {
    super('hello');
    this.runtime = runtime;
  }

  create(): void {
    this.counter = this.add
      .text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '28px', color: COLORS.text })
      .setOrigin(0.5);
    this.updateCounter();

    this.star = this.add
      .star(0, 0, 5, 28, 60, COLORS.accent)
      .setInteractive({ useHandCursor: true });
    this.star.on('pointerdown', () => {
      this.onStarTapped();
    });
    this.tweens.add({ targets: this.star, angle: 360, duration: 6000, repeat: -1 });

    this.hand = this.createHand();
    this.ctaButton = this.createButton('INSTALL', 160, 52, () => {
      this.runtime.cta();
    });

    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, () => {
      this.layout();
    });
    this.time.delayedCall(TIME_LIMIT_MS, () => {
      this.showEndCard();
    });
  }

  /** Keeps UI clear of the top corners and of the bottom band used by some containers. */
  private layout(): void {
    const { width, height } = this.scale;
    this.counter.setPosition(width / 2, height * 0.16);
    if (this.taps === 0) this.star.setPosition(width / 2, height / 2);
    this.hand.setPosition(this.star.x + 30, this.star.y + 40);
    this.ctaButton.setPosition(width / 2, height * 0.84);
    this.endCard?.setPosition(width / 2, height / 2);
  }

  private onStarTapped(): void {
    if (this.ended) return;
    this.runtime.markInteraction();
    this.taps += 1;
    this.updateCounter();
    this.hand.setVisible(false);

    const { width, height } = this.scale;
    this.tweens.add({
      targets: this.star,
      x: Phaser.Math.Between(width * 0.2, width * 0.8),
      y: Phaser.Math.Between(height * 0.3, height * 0.7),
      scale: { from: 1.3, to: 1 },
      duration: 250,
      ease: 'Back.Out',
    });
    if (this.taps >= TAPS_TO_WIN) this.showEndCard();
  }

  private updateCounter(): void {
    this.counter.setText(this.taps === 0 ? 'Tap the star!' : `${this.taps} / ${TAPS_TO_WIN}`);
  }

  private createHand(): Phaser.GameObjects.Container {
    const ring = this.add.circle(-30, -40, 24).setStrokeStyle(4, 0xffffff, 0.8);
    const palm = this.add.ellipse(0, 18, 44, 52, 0xffffff);
    const finger = this.add.rectangle(-14, -14, 16, 46, 0xffffff).setAngle(-30);
    const hand = this.add.container(0, 0, [ring, palm, finger]);
    this.tweens.add({
      targets: hand,
      scale: { from: 1, to: 0.85 },
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
    this.tweens.add({
      targets: ring,
      scale: { from: 0.5, to: 1.4 },
      alpha: { from: 1, to: 0 },
      duration: 1000,
      repeat: -1,
    });
    return hand;
  }

  private createButton(
    label: string,
    width: number,
    height: number,
    onPress: () => void,
  ): Phaser.GameObjects.Container {
    const bg = this.add
      .rectangle(0, 0, width, height, COLORS.cta)
      .setInteractive({ useHandCursor: true });
    const text = this.add
      .text(0, 0, label, {
        fontFamily: 'sans-serif',
        fontSize: '24px',
        fontStyle: 'bold',
        color: COLORS.text,
      })
      .setOrigin(0.5);
    bg.on('pointerdown', onPress);
    return this.add.container(0, 0, [bg, text]);
  }

  private showEndCard(): void {
    if (this.ended) return;
    this.ended = true;
    this.runtime.gameEnd();
    this.hand.setVisible(false);
    this.ctaButton.setVisible(false);

    // If time ran out before the player tapped anything, the first tap on the end card
    // only counts as interaction: networks forbid opening the store on the first tap.
    const shade = this.add.rectangle(0, 0, 4000, 4000, 0x000000, 0.7).setInteractive();
    shade.on('pointerdown', () => {
      this.runtime.markInteraction();
    });
    const title = this.add
      .text(0, -90, this.taps >= TAPS_TO_WIN ? 'Great job!' : 'Nice try!', {
        fontFamily: 'sans-serif',
        fontSize: '40px',
        fontStyle: 'bold',
        color: COLORS.text,
      })
      .setOrigin(0.5);
    const button = this.createButton('PLAY NOW', 240, 72, () => {
      if (!this.runtime.cta()) this.runtime.markInteraction();
    });
    this.endCard = this.add.container(0, 0, [shade, title, button]).setDepth(10);
    this.tweens.add({
      targets: button,
      scale: { from: 1, to: 1.08 },
      duration: 600,
      yoyo: true,
      repeat: -1,
    });
    this.layout();
  }
}
