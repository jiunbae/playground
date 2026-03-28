/**
 * GameUI - HUD overlay for gameplay (ink gauge, color palette, controls).
 */
import { PhysicsConverter } from '../systems/PhysicsConverter.js';

export class GameUI {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.isSandbox = options.sandbox || false;
    this.elements = {};
    this.selectedColorIndex = 0;
    this.onColorChange = null;
    this.onSimulate = null;
    this.onUndo = null;
    this.onBack = null;

    this.colors = [
      { hex: 0x2D3436, name: '기본' },
      { hex: 0xFF4757, name: '탄성' },
      { hex: 0x3742FA, name: '마찰' },
      { hex: 0xFFC312, name: '가벼움' },
      { hex: 0xFF6B6B, name: '부드러움' },
      { hex: 0x4ECDC4, name: '끈적임' },
      { hex: 0xA8E6CF, name: '미끄러움' },
      { hex: 0x6C5CE7, name: '무거움' },
    ];

    this._createUI();
  }

  _createUI() {
    const { width, height } = this.scene.scale;
    const g = this.scene.add.graphics();
    g.setScrollFactor(0);
    g.setDepth(100);
    this.bgGraphics = g;

    // --- Top bar ---
    this._createTopBar(width);

    // --- Bottom bar ---
    this._createBottomBar(width, height);

    // --- Tutorial text (hidden by default) ---
    this.tutorialText = this.scene.add.text(width / 2, height / 2 - 100, '', {
      fontSize: '22px',
      fontFamily: 'sans-serif',
      color: '#2D3436',
      backgroundColor: '#FFFFFFCC',
      padding: { x: 16, y: 12 },
      align: 'center',
      wordWrap: { width: width - 80 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(150).setVisible(false);
  }

  _createTopBar(width) {
    // Back button
    const backBtn = this.scene.add.text(20, 20, '←', {
      fontSize: '32px', fontFamily: 'sans-serif', color: '#2D3436',
    }).setScrollFactor(0).setDepth(101).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.onBack && this.onBack());
    this.elements.backBtn = backBtn;

    // Stage name
    this.stageNameText = this.scene.add.text(width / 2, 25, '', {
      fontSize: '20px', fontFamily: 'sans-serif', color: '#2D3436', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(101);

    // Ink gauge as bottle shape
    if (!this.isSandbox) {
      const bottleX = 70;
      const bottleY = 48;
      const bottleW = 28;
      const bottleH = 32;

      this.inkBottleBg = this.scene.add.graphics().setScrollFactor(0).setDepth(101);
      this.inkBottleFill = this.scene.add.graphics().setScrollFactor(0).setDepth(102);
      this.inkBottleParams = { x: bottleX, y: bottleY, w: bottleW, h: bottleH };

      // Draw bottle outline
      this._drawBottleOutline();

      // Also keep a bar gauge next to bottle for clarity
      const gaugeX = bottleX + bottleW + 14;
      const gaugeY = bottleY + 10;
      const gaugeW = width - gaugeX - 60;
      const gaugeH = 12;

      this.inkGaugeBg = this.scene.add.graphics().setScrollFactor(0).setDepth(101);
      this.inkGaugeBg.fillStyle(0xDDDDDD, 1);
      this.inkGaugeBg.fillRoundedRect(gaugeX, gaugeY, gaugeW, gaugeH, 6);

      this.inkGaugeFill = this.scene.add.graphics().setScrollFactor(0).setDepth(102);
      this.inkGaugeParams = { x: gaugeX, y: gaugeY, w: gaugeW, h: gaugeH };

      this.inkText = this.scene.add.text(width - 20, gaugeY + gaugeH / 2, '100%', {
        fontSize: '13px', fontFamily: 'sans-serif', color: '#666',
      }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(102);
    }

    // Goal text
    this.goalText = this.scene.add.text(width / 2, this.isSandbox ? 55 : 82, '', {
      fontSize: '16px', fontFamily: 'sans-serif', color: '#666',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(101);
  }

  _createBottomBar(width, height) {
    const barY = height - 120;

    // Bottom bar background
    this.bgGraphics.fillStyle(0xFFFFFF, 0.9);
    this.bgGraphics.fillRoundedRect(0, barY, width, 120, { tl: 20, tr: 20, bl: 0, br: 0 });

    // Color palette
    const paletteStartX = 20;
    const paletteY = barY + 25;
    const colorSize = 36;
    const spacing = 6;
    this.colorButtons = [];

    for (let i = 0; i < this.colors.length; i++) {
      const x = paletteStartX + i * (colorSize + spacing) + colorSize / 2;
      const circle = this.scene.add.graphics().setScrollFactor(0).setDepth(102);
      circle.fillStyle(this.colors[i].hex, 1);
      circle.fillCircle(x, paletteY, colorSize / 2);

      // Selection ring
      if (i === 0) {
        circle.lineStyle(3, 0x000000, 1);
        circle.strokeCircle(x, paletteY, colorSize / 2 + 3);
      }

      // Hit area
      const hitZone = this.scene.add.zone(x, paletteY, colorSize + spacing, colorSize + spacing)
        .setScrollFactor(0).setDepth(103).setInteractive({ useHandCursor: true });
      hitZone.on('pointerdown', () => this._selectColor(i));

      this.colorButtons.push({ graphics: circle, x, y: paletteY, size: colorSize });
    }

    // Color property label
    this.colorLabel = this.scene.add.text(paletteStartX, paletteY + colorSize / 2 + 8, '기본 - 일반 물리', {
      fontSize: '12px', fontFamily: 'sans-serif', color: '#999',
    }).setScrollFactor(0).setDepth(102);

    // Undo button (with counter)
    this.maxUndos = 10;
    this.remainingUndos = this.maxUndos;
    const undoBtn = this.scene.add.text(width / 2 - 60, barY + 80, `↩ 되돌리기 (${this.maxUndos})`, {
      fontSize: '16px', fontFamily: 'sans-serif', color: '#FFF',
      backgroundColor: '#5D6D7E',
      padding: { x: 14, y: 10 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(102).setInteractive({ useHandCursor: true });
    undoBtn.on('pointerdown', () => {
      if (this.remainingUndos > 0) {
        this.remainingUndos--;
        undoBtn.setText(`↩ 되돌리기 (${this.remainingUndos})`);
        if (this.remainingUndos === 0) {
          undoBtn.setBackgroundColor('#AAA');
          undoBtn.setColor('#666');
        }
        this.onUndo && this.onUndo();
      }
    });
    this.elements.undoBtn = undoBtn;

    // Simulate button
    const simBtn = this.scene.add.text(width / 2 + 80, barY + 80, '▶ 실행', {
      fontSize: '20px', fontFamily: 'sans-serif', color: '#FFFFFF',
      backgroundColor: '#FF6B6B',
      padding: { x: 20, y: 8 },
      fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(102).setInteractive({ useHandCursor: true });
    simBtn.on('pointerdown', () => this.onSimulate && this.onSimulate());
    this.elements.simBtn = simBtn;
  }

  _selectColor(index) {
    this.selectedColorIndex = index;

    // Redraw all color buttons
    for (let i = 0; i < this.colorButtons.length; i++) {
      const btn = this.colorButtons[i];
      btn.graphics.clear();
      btn.graphics.fillStyle(this.colors[i].hex, 1);
      btn.graphics.fillCircle(btn.x, btn.y, btn.size / 2);
      if (i === index) {
        btn.graphics.lineStyle(3, 0x000000, 1);
        btn.graphics.strokeCircle(btn.x, btn.y, btn.size / 2 + 3);
      }
    }

    // Update color property label
    const descriptions = {
      '기본': '기본 - 일반 물리',
      '탄성': '탄성 - 잘 튕김!',
      '마찰': '마찰 - 잘 안 미끄러짐',
      '가벼움': '가벼움 - 깃털처럼!',
      '부드러움': '부드러움 - 살짝 튕김',
      '끈적임': '끈적임 - 달라붙음!',
      '미끄러움': '미끄러움 - 쏙쏙 미끄러짐',
      '무거움': '무거움 - 묵직하게!',
    };
    if (this.colorLabel) {
      this.colorLabel.setText(descriptions[this.colors[index].name] || this.colors[index].name);
    }

    if (this.onColorChange) {
      this.onColorChange(this.colors[index].hex);
    }
  }

  _drawBottleOutline() {
    const { x, y, w, h } = this.inkBottleParams;
    const g = this.inkBottleBg;
    const cx = x + w / 2;
    const neckW = w * 0.35;
    const neckH = h * 0.25;

    // Bottle neck
    g.lineStyle(2, 0xBBBBBB, 1);
    g.fillStyle(0xEEEEEE, 0.6);
    g.fillRoundedRect(cx - neckW / 2, y, neckW, neckH, 3);
    g.strokeRoundedRect(cx - neckW / 2, y, neckW, neckH, 3);

    // Bottle body
    g.fillStyle(0xEEEEEE, 0.5);
    g.fillRoundedRect(x, y + neckH - 2, w, h - neckH + 2, 5);
    g.strokeRoundedRect(x, y + neckH - 2, w, h - neckH + 2, 5);
  }

  _drawBottleLiquid(remaining, color) {
    if (!this.inkBottleFill) return;
    const { x, y, w, h } = this.inkBottleParams;
    const neckH = h * 0.25;
    const bodyTop = y + neckH - 1;
    const bodyH = h - neckH + 1;

    this.inkBottleFill.clear();

    // Liquid level inside the bottle body
    const liquidH = bodyH * remaining;
    const liquidTop = bodyTop + bodyH - liquidH;

    if (liquidH > 0) {
      this.inkBottleFill.fillStyle(color, 0.8);
      this.inkBottleFill.fillRoundedRect(x + 2, liquidTop, w - 4, liquidH - 2, { tl: 0, tr: 0, bl: 4, br: 4 });

      // Highlight on liquid surface
      this.inkBottleFill.fillStyle(0xFFFFFF, 0.25);
      this.inkBottleFill.fillRect(x + 4, liquidTop, w - 8, 2);
    }

    // If nearly full, fill into neck too
    if (remaining > 0.9) {
      const cx = x + w / 2;
      const neckW = w * 0.35;
      const neckFill = (remaining - 0.9) / 0.1;
      const neckLiquidH = (neckH - 4) * neckFill;
      this.inkBottleFill.fillStyle(color, 0.7);
      this.inkBottleFill.fillRect(cx - neckW / 2 + 2, bodyTop - neckLiquidH, neckW - 4, neckLiquidH);
    }
  }

  updateInkGauge(used, limit) {
    if (this.isSandbox || !this.inkGaugeFill) return;
    const { x, y, w, h } = this.inkGaugeParams;
    const remaining = Math.max(0, 1 - used / limit);

    this.inkGaugeFill.clear();
    // Color: green -> yellow -> red
    let color;
    if (remaining > 0.5) color = 0xA8E6CF;
    else if (remaining > 0.2) color = 0xFFC312;
    else color = 0xFF4757;

    this.inkGaugeFill.fillStyle(color, 1);
    this.inkGaugeFill.fillRoundedRect(x, y, w * remaining, h, 6);

    // Update bottle liquid level
    this._drawBottleLiquid(remaining, color);

    const pct = Math.round(remaining * 100);
    this.inkText.setText(`${pct}%`);

    // Low ink warning: flash the gauge and show warning text
    if (remaining <= 0.2 && remaining > 0) {
      this.inkText.setColor('#FF4757');
      if (!this._inkWarningShown) {
        this._inkWarningShown = true;
        // Pulsing border around gauge
        this._pulseInkWarning();
      }
    } else {
      this.inkText.setColor('#666');
      this._inkWarningShown = false;
      if (this.inkWarningGraphics) {
        this.inkWarningGraphics.clear();
      }
    }
  }

  _pulseInkWarning() {
    if (!this.inkWarningGraphics) {
      this.inkWarningGraphics = this.scene.add.graphics().setScrollFactor(0).setDepth(103);
    }
    const { x, y, w, h } = this.inkGaugeParams;
    this.inkWarningGraphics.clear();
    this.inkWarningGraphics.lineStyle(2, 0xFF4757, 0.8);
    this.inkWarningGraphics.strokeRoundedRect(x - 2, y - 2, w + 4, h + 4, 9);

    // Pulse animation via tween on alpha
    this.scene.tweens.add({
      targets: this.inkWarningGraphics,
      alpha: { from: 1, to: 0.3 },
      duration: 500,
      yoyo: true,
      repeat: 5,
      onComplete: () => {
        if (this.inkWarningGraphics) this.inkWarningGraphics.setAlpha(1);
      },
    });
  }

  setStageName(name) {
    this.stageNameText.setText(name);
  }

  setGoalText(text) {
    this.goalText.setText(text);
  }

  showTutorial(text) {
    this.tutorialText.setText(text).setVisible(true);
    this.scene.time.delayedCall(4000, () => {
      this.tutorialText.setVisible(false);
    });
  }

  setSimulationMode(active) {
    if (active) {
      this.elements.simBtn.setText('■ 정지');
      this.elements.simBtn.setBackgroundColor('#666');
    } else {
      this.elements.simBtn.setText('▶ 실행');
      this.elements.simBtn.setBackgroundColor('#FF6B6B');
    }
  }

  destroy() {
    // Cleanup handled by scene shutdown
  }
}
