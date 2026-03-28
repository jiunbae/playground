import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, GAME_HEIGHT } from '../utils/constants';
import { UIHelper } from '../ui/UIHelper';
import { gameState } from '../systems/GameState';
import { DungeonMap } from '../systems/MapGenerator';
import { CardRenderer } from '../ui/CardRenderer';

export class RestScene extends Phaser.Scene {
  private map!: DungeonMap;

  constructor() {
    super({ key: 'Rest' });
  }

  init(data: { map: DungeonMap }): void {
    this.map = data.map;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.BG_PRIMARY);
    const run = gameState.run!;

    // Title
    this.add.text(GAME_WIDTH / 2, 100, '🔥 휴식처', {
      fontSize: '32px', fontFamily: 'sans-serif', color: COLORS.ACCENT_HEX, fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 150, '모닥불 앞에서 잠시 쉬어갑니다...', {
      fontSize: '16px', fontFamily: 'sans-serif', color: COLORS.TEXT_HEX,
    }).setOrigin(0.5);

    // Current HP
    this.add.text(GAME_WIDTH / 2, 220, `현재 HP: ${run.hp}/${run.maxHp}`, {
      fontSize: '18px', fontFamily: 'sans-serif', color: '#FF6666',
    }).setOrigin(0.5);

    // Option 1: Heal
    const healAmount = Math.floor(run.maxHp * 0.3);
    UIHelper.createButton(this, GAME_WIDTH / 2, 350, 320, 70,
      `❤️ 휴식 - HP ${healAmount} 회복`, () => {
        gameState.healPlayer(healAmount);
        gameState.saveToLocalStorage();
        this.scene.start('DungeonMap', { map: this.map });
      }, 0x442222, 20);

    // Option 2: Upgrade a card
    UIHelper.createButton(this, GAME_WIDTH / 2, 450, 320, 70,
      '⬆️ 대장간 - 카드 1장 업그레이드', () => {
        this.showUpgradeSelection();
      }, 0x334422, 20);

    UIHelper.fadeIn(this);
  }

  private showUpgradeSelection(): void {
    const run = gameState.run!;
    const upgradeable = run.deck.filter(c => !c.upgraded);

    if (upgradeable.length === 0) {
      // No cards to upgrade, just heal instead
      gameState.healPlayer(Math.floor(run.maxHp * 0.3));
      gameState.saveToLocalStorage();
      this.scene.start('DungeonMap', { map: this.map });
      return;
    }

    // Show overlay
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.8).setDepth(50);

    this.add.text(GAME_WIDTH / 2, 80, '업그레이드할 카드를 선택하세요', {
      fontSize: '20px', fontFamily: 'sans-serif', color: COLORS.ACCENT_HEX,
    }).setOrigin(0.5).setDepth(51);

    const perRow = 4;
    const spacing = 140;
    const startX = GAME_WIDTH / 2 - (Math.min(perRow, upgradeable.length) - 1) * spacing / 2;

    upgradeable.slice(0, 12).forEach((card, i) => {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const x = startX + col * spacing;
      const y = 250 + row * 200;

      const container = CardRenderer.createCard(this, card, x, y, true, 1.0);
      container.setDepth(52);

      const bg = container.getData('bg') as Phaser.GameObjects.Rectangle;
      bg.on('pointerdown', () => {
        card.upgraded = true;
        gameState.saveToLocalStorage();
        this.scene.start('DungeonMap', { map: this.map });
      });
    });
  }
}
