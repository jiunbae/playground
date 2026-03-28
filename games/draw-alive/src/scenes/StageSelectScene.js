import Phaser from 'phaser';
import { StageManager } from '../systems/StageManager.js';

export class StageSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'StageSelectScene' });
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#FFF8F0');
    this.cameras.main.fadeIn(200);

    this.stageManager = new StageManager();
    const maxUnlocked = this.stageManager.getMaxUnlockedStage();

    // Header
    this.add.text(20, 25, '←', {
      fontSize: '32px', fontFamily: 'sans-serif', color: '#2D3436',
    }).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.cameras.main.fadeOut(200);
        this.time.delayedCall(200, () => this.scene.start('MainMenuScene'));
      });

    this.add.text(width / 2, 30, '챌린지 모드', {
      fontSize: '24px', fontFamily: 'sans-serif', fontStyle: 'bold', color: '#2D3436',
    }).setOrigin(0.5, 0);

    const totalStars = this.stageManager.getTotalStars();
    this.add.text(width / 2, 62, `총 ★ ${totalStars}`, {
      fontSize: '16px', fontFamily: 'sans-serif', color: '#FFC312',
    }).setOrigin(0.5, 0);

    // Stage grid (scrollable) - use 2 columns for richer info cards
    const gridStartY = 100;
    const cols = 2;
    const cellSize = (width - 60) / cols;
    const padding = 10;

    // Container for scrolling
    const stageCount = Math.min(50, this.stageManager.getStageCount());
    const rows = Math.ceil(stageCount / cols);
    const totalHeight = rows * cellSize + gridStartY + 40;

    for (let i = 0; i < stageCount; i++) {
      const stage = this.stageManager.getStage(i + 1);
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = 30 + col * cellSize + cellSize / 2;
      const y = gridStartY + row * cellSize + cellSize / 2;

      const isUnlocked = (i + 1) <= maxUnlocked;
      const progress = this.stageManager.getProgress(i + 1);

      this._createStageCell(x, y, cellSize - padding, stage, isUnlocked, progress);
    }

    // Enable camera scroll if content overflows
    if (totalHeight > height) {
      this.cameras.main.setBounds(0, 0, width, totalHeight);
      this.input.on('pointermove', (pointer) => {
        if (pointer.isDown) {
          this.cameras.main.scrollY -= (pointer.y - pointer.prevPosition.y);
          this.cameras.main.scrollY = Phaser.Math.Clamp(
            this.cameras.main.scrollY, 0, totalHeight - height
          );
        }
      });
    }
  }

  _createStageCell(x, y, size, stage, isUnlocked, progress) {
    const g = this.add.graphics();
    const cardH = size * 0.9;
    const cardW = size;

    if (isUnlocked) {
      // Background
      const bgColor = progress ? 0xA8E6CF : 0xFFFFFF;
      g.fillStyle(bgColor, 1);
      g.fillRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 12);
      g.lineStyle(2, 0xDDDDDD, 1);
      g.strokeRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 12);

      // Stage number + name
      this.add.text(x, y - cardH / 2 + 14, `${stage.id}. ${stage.name}`, {
        fontSize: '16px', fontFamily: 'sans-serif', fontStyle: 'bold',
        color: '#2D3436',
      }).setOrigin(0.5, 0);

      // Difficulty indicator
      const difficulty = this._getDifficulty(stage);
      const diffColor = difficulty === '쉬움' ? '#4ECDC4' : difficulty === '보통' ? '#FFC312' : '#FF6B6B';
      this.add.text(x, y - cardH / 2 + 36, difficulty, {
        fontSize: '12px', fontFamily: 'sans-serif',
        color: diffColor, fontStyle: 'bold',
      }).setOrigin(0.5, 0);

      // Stars
      const starStr = progress
        ? '★'.repeat(progress.stars) + '☆'.repeat(3 - progress.stars)
        : '☆☆☆';
      this.add.text(x, y + 2, starStr, {
        fontSize: '16px', fontFamily: 'sans-serif', color: '#FFC312',
      }).setOrigin(0.5);

      // Brief objective
      const objective = stage.goals.map(g => g.description).join(', ');
      this.add.text(x, y + cardH / 2 - 16, objective, {
        fontSize: '11px', fontFamily: 'sans-serif', color: '#888',
        wordWrap: { width: cardW - 16 },
        align: 'center',
      }).setOrigin(0.5, 1);

      // Interactive
      const zone = this.add.zone(x, y, cardW, cardH).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        this.cameras.main.fadeOut(200);
        this.time.delayedCall(200, () => {
          this.scene.start('GameplayScene', { stageId: stage.id });
        });
      });
    } else {
      // Locked
      g.fillStyle(0xEEEEEE, 1);
      g.fillRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 12);

      this.add.text(x, y - 8, '🔒', {
        fontSize: '24px',
      }).setOrigin(0.5);

      this.add.text(x, y + 18, `스테이지 ${stage.id}`, {
        fontSize: '12px', fontFamily: 'sans-serif', color: '#AAA',
      }).setOrigin(0.5);
    }
  }

  _getDifficulty(stage) {
    const id = stage.id;
    if (id <= 3) return '쉬움';
    if (id <= 8) return '보통';
    return '어려움';
  }
}
