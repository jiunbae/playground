import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, GAME_HEIGHT } from '../utils/constants';
import { UIHelper } from '../ui/UIHelper';
import { ALL_RELICS } from '../data/relics';
import { gameState } from '../systems/GameState';
import { DungeonMap } from '../systems/MapGenerator';

export class TreasureScene extends Phaser.Scene {
  private map!: DungeonMap;

  constructor() {
    super({ key: 'Treasure' });
  }

  init(data: { map: DungeonMap }): void {
    this.map = data.map;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.BG_PRIMARY);
    const run = gameState.run!;

    // Title
    this.add.text(GAME_WIDTH / 2, 150, '📦 보물 상자', {
      fontSize: '36px', fontFamily: 'sans-serif', color: COLORS.ACCENT_HEX, fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 210, '보물 상자를 열었습니다!', {
      fontSize: '18px', fontFamily: 'sans-serif', color: COLORS.TEXT_HEX,
    }).setOrigin(0.5);

    // Treasure chest animation (simple)
    const chest = this.add.text(GAME_WIDTH / 2, 320, '🎁', {
      fontSize: '80px',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: chest,
      scaleX: 1.2, scaleY: 1.2,
      duration: 500,
      yoyo: true,
      repeat: 1,
      ease: 'Bounce',
    });

    // Give a relic
    const availableRelics = ALL_RELICS.filter(r => !run.relics.some(pr => pr.id === r.id));

    if (availableRelics.length > 0) {
      const relic = run.rng.pick(availableRelics);
      gameState.addRelic(relic);

      this.time.delayedCall(800, () => {
        this.add.text(GAME_WIDTH / 2, 440, `💎 ${relic.name}`, {
          fontSize: '24px', fontFamily: 'sans-serif', color: '#BB88FF', fontStyle: 'bold',
        }).setOrigin(0.5);

        this.add.text(GAME_WIDTH / 2, 480, relic.description, {
          fontSize: '16px', fontFamily: 'sans-serif', color: '#999999',
        }).setOrigin(0.5);
      });
    }

    // Gold reward
    const goldAmount = run.rng.nextInt(20, 50) + (run.currentAct - 1) * 15;
    gameState.addGold(goldAmount);

    this.time.delayedCall(1200, () => {
      this.add.text(GAME_WIDTH / 2, 540, `🪙 +${goldAmount} 골드`, {
        fontSize: '20px', fontFamily: 'sans-serif', color: '#FFD700',
      }).setOrigin(0.5);
    });

    // Continue button
    UIHelper.createButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 120, 220, 50,
      '계속 →', () => {
        gameState.saveToLocalStorage();
        this.scene.start('DungeonMap', { map: this.map });
      }, COLORS.BUTTON, 20);

    UIHelper.fadeIn(this);
  }
}
