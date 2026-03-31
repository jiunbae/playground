import Phaser from 'phaser';
import { CardInstance, getCardEffects, getCardDescription, getCardName } from '../data/cards';
import { COLORS, ELEMENT_COLORS, ELEMENT_ICONS } from '../utils/constants';

export const CARD_WIDTH = 110;
export const CARD_HEIGHT = 160;

export class CardRenderer {
  static createCard(
    scene: Phaser.Scene,
    card: CardInstance,
    x: number,
    y: number,
    interactive = true,
    scale = 1
  ): Phaser.GameObjects.Container {
    const container = scene.add.container(x, y);
    const w = CARD_WIDTH * scale;
    const h = CARD_HEIGHT * scale;

    const elementColor = ELEMENT_COLORS[card.data.element] || COLORS.GRAY;

    // Role-based tint colors
    const roleTintMap: Record<string, number> = {
      attack: 0x2A1A1A,
      skill: 0x1A2A1A,
      power: 0x221A2A,
    };
    const roleBgColor = roleTintMap[card.data.role] || 0x222233;

    // Card outer frame
    const outerFrame = scene.add.rectangle(0, 0, w + 2, h + 2, card.upgraded ? COLORS.ACCENT : COLORS.CARD_BORDER, 0.9);

    // Card background with role-based tint
    const bg = scene.add.rectangle(0, 0, w, h, roleBgColor, 0.95);
    bg.setStrokeStyle(1.5, card.upgraded ? COLORS.ACCENT : COLORS.CARD_BORDER);

    // Inner border for card frame effect
    const innerFrame = scene.add.rectangle(0, 0, w - 6 * scale, h - 6 * scale, 0x000000, 0);
    innerFrame.setStrokeStyle(1, elementColor, 0.25);

    // Subtle gradient overlay (top-to-bottom shine)
    const gradientGfx = scene.add.graphics();
    gradientGfx.fillStyle(0xffffff, 0.05);
    gradientGfx.fillRect(-w / 2, -h / 2, w, h * 0.4);
    gradientGfx.fillStyle(0x000000, 0.08);
    gradientGfx.fillRect(-w / 2, h * 0.1, w, h * 0.4);

    // Element color strip at top
    const strip = scene.add.rectangle(0, -h / 2 + 8 * scale, w - 4, 14 * scale, elementColor);
    strip.setAlpha(0.8);

    // Mana cost gem in top-left corner
    const gemGfx = scene.add.graphics();
    const gemX = -w / 2 + 16 * scale;
    const gemY = -h / 2 + 16 * scale;
    const gemR = 14 * scale;
    // Gem background (darker circle)
    gemGfx.fillStyle(0x1A3A6A, 0.95);
    gemGfx.fillCircle(gemX, gemY, gemR);
    // Gem highlight
    gemGfx.fillStyle(COLORS.ENERGY, 0.9);
    gemGfx.fillCircle(gemX, gemY, gemR - 2 * scale);
    // Gem shine
    gemGfx.fillStyle(0xffffff, 0.25);
    gemGfx.fillCircle(gemX - 3 * scale, gemY - 3 * scale, 4 * scale);
    // Gem border
    gemGfx.lineStyle(1.5, 0xffffff, 0.4);
    gemGfx.strokeCircle(gemX, gemY, gemR);

    const costText = scene.add.text(gemX, gemY, `${card.data.energyCost}`, {
      fontSize: `${16 * scale}px`, fontFamily: 'sans-serif', color: '#FFFFFF', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 1,
    }).setOrigin(0.5);

    // Element icon
    const icon = scene.add.text(w / 2 - 16 * scale, -h / 2 + 16 * scale, ELEMENT_ICONS[card.data.element], {
      fontSize: `${14 * scale}px`,
    }).setOrigin(0.5);

    // Card name - bold
    const name = scene.add.text(0, -h / 2 + 38 * scale, getCardName(card), {
      fontSize: `${12 * scale}px`, fontFamily: 'sans-serif', color: '#FFFFFF',
      fontStyle: 'bold', align: 'center',
      stroke: '#000000', strokeThickness: 1,
    }).setOrigin(0.5);

    // Card art area with role-tinted background
    const artBgColor = card.data.role === 'attack' ? 0x441111 :
      card.data.role === 'skill' ? 0x114411 : 0x331144;
    const artBg = scene.add.rectangle(0, 6 * scale, w - 16 * scale, 50 * scale, artBgColor, 0.3);
    artBg.setStrokeStyle(0.5, elementColor, 0.2);

    // Role indicator
    const roleText = card.data.role === 'attack' ? '⚔️' : card.data.role === 'skill' ? '🛡️' : '✨';
    const role = scene.add.text(0, 6 * scale, roleText, {
      fontSize: `${24 * scale}px`,
    }).setOrigin(0.5);

    // Description - smaller italics
    const desc = scene.add.text(0, h / 2 - 32 * scale, getCardDescription(card), {
      fontSize: `${9 * scale}px`, fontFamily: 'sans-serif', color: '#BBBBCC',
      fontStyle: 'italic', align: 'center', wordWrap: { width: w - 12 * scale },
    }).setOrigin(0.5);

    // Rarity indicator - small gem bar
    const rarityColor = card.data.rarity === 'rare' ? 0xFFD700 :
      card.data.rarity === 'uncommon' ? 0x4FC3F7 : 0xAAAAAA;
    const rarityBar = scene.add.rectangle(0, h / 2 - 8 * scale, 20 * scale, 3 * scale, rarityColor, 0.8);
    const rarityDot = scene.add.circle(0, h / 2 - 8 * scale, 3 * scale, rarityColor);

    // Hover shine effect layer (invisible until hover)
    const shineOverlay = scene.add.graphics();
    shineOverlay.fillStyle(0xffffff, 0);
    shineOverlay.fillRect(-w / 2, -h / 2, w, h);
    shineOverlay.setAlpha(0);
    shineOverlay.setName('shineOverlay');

    container.add([outerFrame, bg, innerFrame, gradientGfx, strip, gemGfx, costText, icon, name, artBg, role, desc, rarityBar, rarityDot, shineOverlay]);

    if (interactive) {
      bg.setInteractive({ useHandCursor: true });
      container.setData('card', card);
      container.setData('bg', bg);
    }

    return container;
  }

  static arrangeHand(
    scene: Phaser.Scene,
    cards: Phaser.GameObjects.Container[],
    centerX: number,
    y: number,
    maxWidth = 650
  ): void {
    const count = cards.length;
    if (count === 0) return;

    const scale = maxWidth < 500 ? 0.7 : maxWidth < 650 ? 0.85 : 1.0;
    cards.forEach(c => c.setScale(scale));
    const spacing = Math.min((CARD_WIDTH * scale) + 6, maxWidth / count);
    const totalWidth = spacing * (count - 1);
    const startX = centerX - totalWidth / 2;

    for (let i = 0; i < count; i++) {
      const targetX = startX + i * spacing;
      const arc = Math.sin((i / Math.max(count - 1, 1)) * Math.PI) * -10;

      scene.tweens.add({
        targets: cards[i],
        x: targetX,
        y: y + arc,
        duration: 200,
        ease: 'Power2',
      });

      cards[i].setDepth(i);
    }
  }
}
