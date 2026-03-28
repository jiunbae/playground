import Phaser from 'phaser';

export class ResultScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultScene' });
  }

  init(data) {
    this.stageId = data.stageId || 1;
    this.stars = data.stars || 1;
    this.inkUsed = data.inkUsed || 0;
    this.inkLimit = data.inkLimit || 1000;
    this.timeTaken = data.timeTaken || 0;
    this.maxStage = data.maxStage || 50;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#FFF8F0');
    this.cameras.main.fadeIn(300);

    // Title
    this.add.text(width / 2, height * 0.12, '스테이지 클리어!', {
      fontSize: '36px', fontFamily: 'sans-serif', fontStyle: 'bold', color: '#FF6B6B',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.12 + 45, `스테이지 ${this.stageId}`, {
      fontSize: '20px', fontFamily: 'sans-serif', color: '#666',
    }).setOrigin(0.5);

    // Stars with animation
    const starY = height * 0.3;
    for (let i = 0; i < 3; i++) {
      const x = width / 2 + (i - 1) * 70;
      const filled = i < this.stars;
      const star = this.add.text(x, starY, filled ? '★' : '☆', {
        fontSize: '56px', color: filled ? '#FFC312' : '#DDD',
      }).setOrigin(0.5).setScale(0);

      this.tweens.add({
        targets: star,
        scaleX: 1, scaleY: 1,
        delay: 300 + i * 200,
        duration: 400,
        ease: 'Back.easeOut',
      });
    }

    // Stats
    const statsY = height * 0.45;
    const inkPct = Math.round((1 - this.inkUsed / this.inkLimit) * 100);
    const timeStr = this.timeTaken.toFixed(1);

    const stats = [
      { label: '잉크 효율', value: `${inkPct}% 남음` },
      { label: '클리어 시간', value: `${timeStr}초` },
    ];

    stats.forEach((s, i) => {
      const y = statsY + i * 50;
      this.add.text(width / 2 - 100, y, s.label, {
        fontSize: '18px', fontFamily: 'sans-serif', color: '#999',
      }).setOrigin(0, 0.5);
      this.add.text(width / 2 + 100, y, s.value, {
        fontSize: '20px', fontFamily: 'sans-serif', fontStyle: 'bold', color: '#2D3436',
      }).setOrigin(1, 0.5);
    });

    // Submit score to SDK
    try {
      window.__sdk?.scores.submit({
        score: this.stars,
        meta: { stageId: this.stageId, stars: this.stars, inkUsed: this.inkUsed, timeMs: Math.round(this.timeTaken * 1000) },
      }).catch(() => {});
    } catch (_) {}

    // Buttons
    const btnY = height * 0.68;

    // Retry button
    this._createBtn(width / 2 - 90, btnY, '다시 도전', '#4ECDC4', () => {
      this.cameras.main.fadeOut(200);
      this.time.delayedCall(200, () => {
        this.scene.start('GameplayScene', { stageId: this.stageId });
      });
    });

    // Next stage button
    if (this.stageId < this.maxStage) {
      this._createBtn(width / 2 + 90, btnY, '다음 스테이지 →', '#FF6B6B', () => {
        this.cameras.main.fadeOut(200);
        this.time.delayedCall(200, () => {
          this.scene.start('GameplayScene', { stageId: this.stageId + 1 });
        });
      });
    }

    // Back to stage select
    this._createBtn(width / 2, btnY + 70, '스테이지 선택', '#999', () => {
      this.cameras.main.fadeOut(200);
      this.time.delayedCall(200, () => this.scene.start('StageSelectScene'));
    });

    // Back to menu
    this.add.text(width / 2, height - 50, '메인 메뉴', {
      fontSize: '16px', fontFamily: 'sans-serif', color: '#AAA',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.cameras.main.fadeOut(200);
        this.time.delayedCall(200, () => this.scene.start('MainMenuScene'));
      });
  }

  _createBtn(x, y, text, bgColor, callback) {
    const btn = this.add.text(x, y, text, {
      fontSize: '18px', fontFamily: 'sans-serif', fontStyle: 'bold', color: '#FFF',
      backgroundColor: bgColor, padding: { x: 18, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', callback);
    return btn;
  }
}
