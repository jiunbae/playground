import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, ELEMENT_COLORS, Element } from '../utils/constants';

export class UIHelper {
  static createButton(
    scene: Phaser.Scene,
    x: number, y: number,
    width: number, height: number,
    text: string,
    callback: () => void,
    color = COLORS.BUTTON,
    fontSize = 20
  ): Phaser.GameObjects.Container {
    const container = scene.add.container(x, y);

    const bg = scene.add.rectangle(0, 0, width, height, color, 0.9);
    bg.setStrokeStyle(2, COLORS.CARD_BORDER);
    bg.setInteractive({ useHandCursor: true });

    const label = scene.add.text(0, 0, text, {
      fontSize: `${fontSize}px`,
      fontFamily: 'sans-serif',
      color: COLORS.TEXT_HEX,
      align: 'center',
    }).setOrigin(0.5);

    bg.on('pointerover', () => bg.setFillStyle(COLORS.BUTTON_HOVER));
    bg.on('pointerout', () => bg.setFillStyle(color));
    bg.on('pointerdown', callback);

    container.add([bg, label]);
    return container;
  }

  static createPanel(
    scene: Phaser.Scene,
    x: number, y: number,
    width: number, height: number,
    alpha = 0.85
  ): Phaser.GameObjects.Rectangle {
    const panel = scene.add.rectangle(x, y, width, height, COLORS.DARK_GRAY, alpha);
    panel.setStrokeStyle(2, COLORS.CARD_BORDER);
    return panel;
  }

  static createText(
    scene: Phaser.Scene,
    x: number, y: number,
    text: string,
    fontSize = 18,
    color = COLORS.TEXT_HEX
  ): Phaser.GameObjects.Text {
    return scene.add.text(x, y, text, {
      fontSize: `${fontSize}px`,
      fontFamily: 'sans-serif',
      color,
      align: 'center',
    }).setOrigin(0.5);
  }

  static createProgressBar(
    scene: Phaser.Scene,
    x: number, y: number,
    width: number, height: number,
    current: number, max: number,
    color: number,
    bgColor = 0x333333
  ): Phaser.GameObjects.Container {
    const container = scene.add.container(x, y);
    const bg = scene.add.rectangle(0, 0, width, height, bgColor);
    const barWidth = Math.max(0, (current / max) * width);
    const bar = scene.add.rectangle(-width / 2 + barWidth / 2, 0, barWidth, height - 2, color);
    const text = scene.add.text(0, 0, `${current}/${max}`, {
      fontSize: '14px', fontFamily: 'sans-serif', color: '#FFFFFF',
    }).setOrigin(0.5);
    container.add([bg, bar, text]);
    return container;
  }

  static getElementColor(element: Element): number {
    return ELEMENT_COLORS[element] || COLORS.GRAY;
  }

  static fadeIn(scene: Phaser.Scene, duration = 300): void {
    const overlay = scene.add.rectangle(GAME_WIDTH / 2, 640, GAME_WIDTH, 1280, 0x000000, 1).setDepth(1000);
    scene.tweens.add({
      targets: overlay,
      alpha: 0,
      duration,
      onComplete: () => overlay.destroy(),
    });
  }

  static showDamageNumber(
    scene: Phaser.Scene,
    x: number, y: number,
    value: number,
    color = '#FF4444'
  ): void {
    // Flying damage number with scale-in effect and outline
    const text = scene.add.text(x, y, `-${value}`, {
      fontSize: '32px', fontFamily: 'sans-serif', color, fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(100).setScale(0.3);

    // Scale up then float away
    scene.tweens.add({
      targets: text,
      scaleX: 1.2, scaleY: 1.2,
      duration: 120,
      ease: 'Back.easeOut',
      onComplete: () => {
        scene.tweens.add({
          targets: text,
          y: y - 70,
          scaleX: 0.8, scaleY: 0.8,
          alpha: 0,
          duration: 700,
          ease: 'Power2',
          onComplete: () => text.destroy(),
        });
      },
    });

    // Small impact flash at origin
    const flash = scene.add.circle(x, y, 20, Phaser.Display.Color.HexStringToColor(color).color, 0.4);
    flash.setDepth(99);
    scene.tweens.add({
      targets: flash,
      scaleX: 2, scaleY: 2, alpha: 0,
      duration: 300,
      onComplete: () => flash.destroy(),
    });
  }

  static showHealNumber(
    scene: Phaser.Scene,
    x: number, y: number,
    value: number
  ): void {
    // Green healing number floating upward
    const text = scene.add.text(x, y, `+${value}`, {
      fontSize: '28px', fontFamily: 'sans-serif', color: '#44FF44', fontStyle: 'bold',
      stroke: '#003300', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(100).setScale(0.5);

    scene.tweens.add({
      targets: text,
      scaleX: 1.1, scaleY: 1.1,
      duration: 150,
      ease: 'Back.easeOut',
      onComplete: () => {
        scene.tweens.add({
          targets: text,
          y: y - 55,
          alpha: 0,
          duration: 700,
          ease: 'Power2',
          onComplete: () => text.destroy(),
        });
      },
    });

    // Small green glow
    const glow = scene.add.circle(x, y, 15, 0x44FF44, 0.3);
    glow.setDepth(99);
    scene.tweens.add({
      targets: glow,
      scaleX: 1.8, scaleY: 1.8, alpha: 0,
      duration: 400,
      onComplete: () => glow.destroy(),
    });
  }
}
