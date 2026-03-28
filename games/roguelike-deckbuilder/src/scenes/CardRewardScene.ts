import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, GAME_HEIGHT } from '../utils/constants';
import { UIHelper } from '../ui/UIHelper';
import { CardRenderer } from '../ui/CardRenderer';
import { ALL_CARDS, CardData, createCardInstance, CardInstance } from '../data/cards';
import { ALL_RELICS, RelicData } from '../data/relics';
import { gameState } from '../systems/GameState';
import { DungeonMap } from '../systems/MapGenerator';

export class CardRewardScene extends Phaser.Scene {
  private map!: DungeonMap;
  private goldReward = 0;
  private isElite = false;
  private rewardCards: CardData[] = [];

  constructor() {
    super({ key: 'CardReward' });
  }

  init(data: { map: DungeonMap; goldReward: number; isElite?: boolean }): void {
    this.map = data.map;
    this.goldReward = data.goldReward;
    this.isElite = data.isElite || false;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.BG_PRIMARY);
    const run = gameState.run!;

    // Victory text
    this.add.text(GAME_WIDTH / 2, 60, '⚔️ 전투 승리!', {
      fontSize: '28px', fontFamily: 'sans-serif', color: COLORS.ACCENT_HEX, fontStyle: 'bold',
    }).setOrigin(0.5);

    // Gold reward
    this.add.text(GAME_WIDTH / 2, 110, `🪙 +${this.goldReward} 골드`, {
      fontSize: '20px', fontFamily: 'sans-serif', color: '#FFD700',
    }).setOrigin(0.5);

    // Generate card rewards
    this.rewardCards = this.generateCardRewards(3);

    this.add.text(GAME_WIDTH / 2, 170, '카드 보상을 선택하세요 (또는 스킵)', {
      fontSize: '16px', fontFamily: 'sans-serif', color: COLORS.TEXT_HEX,
    }).setOrigin(0.5);

    // Display reward cards
    const spacing = 170;
    const startX = GAME_WIDTH / 2 - (this.rewardCards.length - 1) * spacing / 2;

    this.rewardCards.forEach((cardData, i) => {
      const card = createCardInstance(cardData);
      const x = startX + i * spacing;
      const container = CardRenderer.createCard(this, card, x, 400, true, 1.3);
      const bg = container.getData('bg') as Phaser.GameObjects.Rectangle;

      bg.on('pointerdown', () => {
        this.selectCard(card);
      });

      bg.on('pointerover', () => {
        container.setScale(1.4);
      });
      bg.on('pointerout', () => {
        container.setScale(1.3);
      });
    });

    // Elite gives relic
    if (this.isElite) {
      this.add.text(GAME_WIDTH / 2, 580, '💎 엘리트 보상: 유물 획득!', {
        fontSize: '16px', fontFamily: 'sans-serif', color: '#BB88FF',
      }).setOrigin(0.5);

      const availableRelics = ALL_RELICS.filter(r => !run.relics.some(pr => pr.id === r.id));
      if (availableRelics.length > 0) {
        const relic = run.rng.pick(availableRelics);
        const relicPanel = UIHelper.createPanel(this, GAME_WIDTH / 2, 640, 300, 60);
        this.add.text(GAME_WIDTH / 2, 630, `💎 ${relic.name}`, {
          fontSize: '16px', fontFamily: 'sans-serif', color: '#BB88FF', fontStyle: 'bold',
        }).setOrigin(0.5);
        this.add.text(GAME_WIDTH / 2, 655, relic.description, {
          fontSize: '12px', fontFamily: 'sans-serif', color: '#999999',
        }).setOrigin(0.5);

        gameState.addRelic(relic);
      }
    }

    // Skip button
    UIHelper.createButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 100, 200, 45,
      '스킵 →', () => this.returnToMap(), COLORS.DARK_GRAY, 18);

    UIHelper.fadeIn(this);
  }

  private generateCardRewards(count: number): CardData[] {
    const run = gameState.run!;
    const rng = run.rng;

    // Filter available cards (exclude basic strike/defend)
    const pool = ALL_CARDS.filter(c => c.id !== 'strike' && c.id !== 'defend');

    // Weight by rarity
    const weights = pool.map(c => {
      let w = c.rarity === 'common' ? 60 : c.rarity === 'uncommon' ? 30 : 10;

      // Synergy weighting: boost cards matching deck elements
      const deckElements = new Set(run.deck.map(d => d.data.element));
      if (deckElements.has(c.element)) w *= 1.2;

      // Character element bonus
      if (c.element === run.character.element) w *= 1.3;

      return w;
    });

    const results: CardData[] = [];
    const usedIndices = new Set<number>();

    for (let i = 0; i < count; i++) {
      let chosen = rng.weightedPick(pool, weights);
      let attempts = 0;
      while (results.includes(chosen) && attempts < 20) {
        chosen = rng.weightedPick(pool, weights);
        attempts++;
      }
      results.push(chosen);
    }

    return results;
  }

  private selectCard(card: CardInstance): void {
    gameState.addCardToDeck(card);
    this.returnToMap();
  }

  private returnToMap(): void {
    gameState.saveToLocalStorage();
    this.scene.start('DungeonMap', { map: this.map });
  }
}
