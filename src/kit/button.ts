import Phaser from 'phaser';

export interface ButtonStyle {
  readonly width: number;
  readonly height: number;
  readonly fill: number;
  readonly shadow: number;
  readonly textColor: string;
  readonly fontFamily: string;
  readonly fontSize: number;
}

/** A rounded, pressable button drawn in code. The container's size is its hit area. */
export function createButton(
  scene: Phaser.Scene,
  label: string,
  style: ButtonStyle,
  onPress: () => void,
): Phaser.GameObjects.Container {
  const { width, height } = style;
  const radius = height / 2;
  const g = scene.add.graphics();
  g.fillStyle(style.shadow, 1).fillRoundedRect(-width / 2, -height / 2 + 6, width, height, radius);
  g.fillStyle(style.fill, 1).fillRoundedRect(-width / 2, -height / 2, width, height, radius);
  g.fillStyle(0xffffff, 0.18).fillRoundedRect(
    -width / 2 + 8,
    -height / 2 + 4,
    width - 16,
    height / 2.6,
    radius / 2,
  );
  const text = scene.add
    .text(0, -2, label, {
      fontFamily: style.fontFamily,
      fontSize: `${style.fontSize}px`,
      color: style.textColor,
    })
    .setOrigin(0.5);
  const button = scene.add.container(0, 0, [g, text]).setSize(width, height + 6);
  button.setInteractive({ useHandCursor: true });
  button.on('pointerdown', () => {
    scene.tweens.add({ targets: button, scale: button.scale * 0.94, duration: 70, yoyo: true });
    onPress();
  });
  return button;
}
