import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, GAME_HEIGHT } from '../utils/constants';
import { UIHelper } from '../ui/UIHelper';
import { CardRenderer } from '../ui/CardRenderer';
import { ALL_CARDS, CardData, createCardInstance } from '../data/cards';
import { ALL_RELICS, RelicData } from '../data/relics';
import { gameState } from '../systems/GameState';
import { DungeonMap } from '../systems/MapGenerator';

interface ShopItem {
  type: 'card' | 'relic' | 'remove';
  card?: CardData;
  relic?: RelicData;
  cost: number;
  purchased: boolean;
}

export class ShopScene extends Phaser.Scene {
  private map!: DungeonMap;
  private items: ShopItem[] = [];

  constructor() {
    super({ key: 'Shop' });
  }

  init(data: { map: DungeonMap }): void {
    this.map = data.map;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.BG_PRIMARY);
    const run = gameState.run!;
    this.items = [];

    // Title
    this.add.text(GAME_WIDTH / 2, 40, '🪙 상점', {
      fontSize: '32px', fontFamily: 'sans-serif', color: COLORS.ACCENT_HEX, fontStyle: 'bold',
    }).setOrigin(0.5);

    // Gold display
    this.add.text(GAME_WIDTH / 2, 80, `보유 골드: ${run.gold}`, {
      fontSize: '18px', fontFamily: 'sans-serif', color: '#FFD700',
    }).setOrigin(0.5);

    // Generate shop items
    this.generateShopItems();
    this.renderShop();

    // Card removal option
    const removeCost = 50 + (run.currentAct - 1) * 25;
    this.items.push({ type: 'remove', cost: removeCost, purchased: false });

    // Leave button
    UIHelper.createButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 60, 200, 45,
      '나가기 →', () => {
        gameState.saveToLocalStorage();
        this.scene.start('DungeonMap', { map: this.map });
      }, COLORS.DARK_GRAY, 18);

    UIHelper.fadeIn(this);
  }

  private generateShopItems(): void {
    const run = gameState.run!;
    const rng = run.rng;

    // 3 card items
    const pool = ALL_CARDS.filter(c => c.id !== 'strike' && c.id !== 'defend');
    const shuffled = rng.shuffle(pool);

    for (let i = 0; i < 3 && i < shuffled.length; i++) {
      const card = shuffled[i];
      const baseCost = card.rarity === 'rare' ? 120 : card.rarity === 'uncommon' ? 75 : 45;
      const cost = baseCost + rng.nextInt(-10, 10);
      this.items.push({ type: 'card', card, cost, purchased: false });
    }

    // 1 relic item
    const availableRelics = ALL_RELICS.filter(r => !run.relics.some(pr => pr.id === r.id));
    if (availableRelics.length > 0) {
      const relic = rng.pick(availableRelics);
      const baseCost = relic.rarity === 'rare' ? 200 : relic.rarity === 'uncommon' ? 140 : 90;
      this.items.push({ type: 'relic', relic, cost: baseCost, purchased: false });
    }
  }

  private renderShop(): void {
    const run = gameState.run!;
    let yOffset = 130;

    // Cards section
    this.add.text(GAME_WIDTH / 2, yOffset, '-- 카드 --', {
      fontSize: '16px', fontFamily: 'sans-serif', color: '#AAAAAA',
    }).setOrigin(0.5);
    yOffset += 30;

    const cardItems = this.items.filter(i => i.type === 'card');
    const cardSpacing = 170;
    const cardStartX = GAME_WIDTH / 2 - (cardItems.length - 1) * cardSpacing / 2;

    cardItems.forEach((item, i) => {
      if (!item.card) return;
      const x = cardStartX + i * cardSpacing;
      const card = createCardInstance(item.card);
      const container = CardRenderer.createCard(this, card, x, yOffset + 100, true, 1.1);

      // Price tag
      const priceColor = run.gold >= item.cost ? '#FFD700' : '#FF4444';
      this.add.text(x, yOffset + 195, `🪙 ${item.cost}`, {
        fontSize: '16px', fontFamily: 'sans-serif', color: priceColor, fontStyle: 'bold',
      }).setOrigin(0.5);

      const bg = container.getData('bg') as Phaser.GameObjects.Rectangle;
      bg.on('pointerdown', () => {
        if (!item.purchased && run.gold >= item.cost) {
          run.gold -= item.cost;
          gameState.addCardToDeck(createCardInstance(item.card!));
          item.purchased = true;
          container.setAlpha(0.3);
          this.refreshGoldDisplay();
        }
      });
    });

    yOffset += 240;

    // Relics section
    const relicItems = this.items.filter(i => i.type === 'relic');
    if (relicItems.length > 0) {
      this.add.text(GAME_WIDTH / 2, yOffset, '-- 유물 --', {
        fontSize: '16px', fontFamily: 'sans-serif', color: '#AAAAAA',
      }).setOrigin(0.5);
      yOffset += 40;

      relicItems.forEach((item) => {
        if (!item.relic) return;
        const panel = UIHelper.createPanel(this, GAME_WIDTH / 2, yOffset, 400, 60);

        this.add.text(GAME_WIDTH / 2 - 150, yOffset - 10, `💎 ${item.relic.name}`, {
          fontSize: '16px', fontFamily: 'sans-serif', color: '#BB88FF', fontStyle: 'bold',
        }).setOrigin(0, 0.5);

        this.add.text(GAME_WIDTH / 2 - 150, yOffset + 12, item.relic.description, {
          fontSize: '12px', fontFamily: 'sans-serif', color: '#999999',
        }).setOrigin(0, 0.5);

        const priceColor = run.gold >= item.cost ? '#FFD700' : '#FF4444';
        const priceText = this.add.text(GAME_WIDTH / 2 + 150, yOffset, `🪙 ${item.cost}`, {
          fontSize: '16px', fontFamily: 'sans-serif', color: priceColor, fontStyle: 'bold',
        }).setOrigin(1, 0.5);

        panel.setInteractive({ useHandCursor: true });
        panel.on('pointerdown', () => {
          if (!item.purchased && run.gold >= item.cost) {
            run.gold -= item.cost;
            gameState.addRelic(item.relic!);
            item.purchased = true;
            panel.setAlpha(0.3);
            priceText.setText('구매 완료');
            this.refreshGoldDisplay();
          }
        });

        yOffset += 75;
      });
    }

    // Card removal section
    yOffset += 20;
    this.add.text(GAME_WIDTH / 2, yOffset, '-- 서비스 --', {
      fontSize: '16px', fontFamily: 'sans-serif', color: '#AAAAAA',
    }).setOrigin(0.5);
    yOffset += 40;

    const removeCost = 50 + (run.currentAct - 1) * 25;
    const removePanel = UIHelper.createPanel(this, GAME_WIDTH / 2, yOffset, 400, 50);
    this.add.text(GAME_WIDTH / 2 - 150, yOffset, '🗑️ 카드 제거', {
      fontSize: '16px', fontFamily: 'sans-serif', color: '#FF6666',
    }).setOrigin(0, 0.5);

    const removePriceColor = run.gold >= removeCost ? '#FFD700' : '#FF4444';
    this.add.text(GAME_WIDTH / 2 + 150, yOffset, `🪙 ${removeCost}`, {
      fontSize: '16px', fontFamily: 'sans-serif', color: removePriceColor, fontStyle: 'bold',
    }).setOrigin(1, 0.5);

    removePanel.setInteractive({ useHandCursor: true });
    removePanel.on('pointerdown', () => {
      if (run.gold >= removeCost && run.deck.length > 5) {
        this.showRemoveCardSelection(removeCost);
      }
    });
  }

  private showRemoveCardSelection(cost: number): void {
    const run = gameState.run!;

    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.85).setDepth(50);
    overlay.setInteractive();

    this.add.text(GAME_WIDTH / 2, 60, '제거할 카드를 선택하세요', {
      fontSize: '20px', fontFamily: 'sans-serif', color: COLORS.ACCENT_HEX,
    }).setOrigin(0.5).setDepth(51);

    const perRow = 4;
    const spacing = 140;
    const startX = GAME_WIDTH / 2 - (Math.min(perRow, run.deck.length) - 1) * spacing / 2;

    run.deck.slice(0, 16).forEach((card, i) => {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const x = startX + col * spacing;
      const y = 200 + row * 200;

      const container = CardRenderer.createCard(this, card, x, y, true, 1.0);
      container.setDepth(52);

      const bg = container.getData('bg') as Phaser.GameObjects.Rectangle;
      bg.on('pointerdown', () => {
        run.gold -= cost;
        gameState.removeCardFromDeck(card.instanceId);
        gameState.saveToLocalStorage();
        this.scene.restart({ map: this.map });
      });
    });

    // Cancel button
    UIHelper.createButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 60, 160, 40,
      '취소', () => {
        this.scene.restart({ map: this.map });
      }, COLORS.DARK_GRAY, 16).setDepth(52);
  }

  private refreshGoldDisplay(): void {
    // Restart scene to refresh all displays
    this.scene.restart({ map: this.map });
  }
}
