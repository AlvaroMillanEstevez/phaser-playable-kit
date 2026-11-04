import Phaser from 'phaser';

const TEXTURE = 'kit-hand';

interface Point {
  readonly x: number;
  readonly y: number;
}

type Carried = Phaser.GameObjects.Components.Transform & Phaser.GameObjects.Components.Visible;
const SIZE = 96;

/** Draws a pointing hand once and caches it as a texture. Generated, no image file. */
function ensureHandTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEXTURE)) return;
  const g = scene.make.graphics({}, false);
  const outline = 0x3b2a1a;
  const fill = 0xffffff;
  const draw = (stroke: boolean): void => {
    if (stroke) g.lineStyle(6, outline, 1);
    else g.fillStyle(fill, 1);
    const shape = stroke ? g.strokeRoundedRect.bind(g) : g.fillRoundedRect.bind(g);
    shape(30, 6, 18, 50, 9); // index finger
    shape(24, 40, 46, 44, 14); // palm
    shape(46, 36, 14, 26, 7); // middle finger knuckle
    shape(58, 40, 14, 24, 7); // ring finger knuckle
    shape(12, 50, 22, 14, 7); // thumb
  };
  draw(true);
  draw(false);
  g.generateTexture(TEXTURE, SIZE, SIZE);
  g.destroy();
}

/**
 * Tutorial hand that demonstrates a drag. The fingertip (top-left of the image) is the
 * point that touches the screen.
 */
export class TutorialHand {
  readonly image: Phaser.GameObjects.Image;
  private readonly scene: Phaser.Scene;
  private tween: Phaser.Tweens.TweenChain | undefined;
  private carry: Carried | undefined;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    ensureHandTexture(scene);
    this.image = scene.add
      .image(0, 0, TEXTURE)
      .setOrigin(0.4, 0.06)
      .setDepth(100)
      .setVisible(false);
  }

  /**
   * Loops: press at `from`, drag to `to`, release. `carry` (for example a ghost of the
   * dragged item) follows the fingertip.
   */
  showDrag(from: Point, to: Point, scale: number, carry?: Carried): void {
    this.stop();
    this.carry = carry;
    const { x: fromX, y: fromY } = from;
    const { x: toX, y: toY } = to;
    this.image.setPosition(fromX, fromY).setScale(scale).setVisible(true).setAlpha(0);
    const follow = (): void => {
      carry?.setPosition(this.image.x, this.image.y);
    };
    this.tween = this.scene.tweens.chain({
      targets: this.image,
      loop: -1,
      tweens: [
        {
          alpha: 1,
          x: fromX,
          y: fromY,
          duration: 250,
          onStart: () => carry?.setVisible(false),
        },
        { scale: scale * 0.85, duration: 180, onComplete: () => carry?.setVisible(true) },
        { x: toX, y: toY, duration: 800, ease: 'Sine.InOut', onUpdate: follow },
        { scale, duration: 180, onComplete: () => carry?.setVisible(false) },
        { alpha: 0, duration: 250, delay: 150 },
        { x: fromX, y: fromY, duration: 1, delay: 300 },
      ],
    });
  }

  stop(): void {
    this.tween?.stop();
    this.tween = undefined;
    this.image.setVisible(false);
    this.carry?.setVisible(false);
  }

  get active(): boolean {
    return this.tween !== undefined;
  }
}
