import Phaser from 'phaser';
import { DrawingSystem } from '../systems/DrawingSystem.js';
import { PhysicsConverter } from '../systems/PhysicsConverter.js';

export class OnboardingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'OnboardingScene' });
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#FFF8F0');
    this.cameras.main.fadeIn(300);

    this.step = 0;
    this.drawnBodies = [];

    // Step indicators at top
    this.stepTexts = [];
    const steps = [
      { label: '1', desc: '화면에 그림을 그리세요 ✏️' },
      { label: '2', desc: '▶ 버튼을 누르면 물리가 적용됩니다' },
      { label: '3', desc: '공이 ⭐에 닿으면 클리어!' },
    ];

    // Step indicator dots
    const dotStartX = width / 2 - 60;
    this.stepDots = [];
    for (let i = 0; i < 3; i++) {
      const dotG = this.add.graphics().setDepth(101);
      const dx = dotStartX + i * 60;
      dotG.fillStyle(i === 0 ? 0xFF6B6B : 0xCCCCCC, 1);
      dotG.fillCircle(dx, 55, 12);
      const dotLabel = this.add.text(dx, 55, steps[i].label, {
        fontSize: '14px', fontFamily: 'sans-serif', fontStyle: 'bold',
        color: i === 0 ? '#FFF' : '#999',
      }).setOrigin(0.5).setDepth(102);
      this.stepDots.push({ graphics: dotG, label: dotLabel, x: dx });
    }

    // Main prompt (current step)
    this.promptText = this.add.text(width / 2, 100, steps[0].desc, {
      fontSize: '24px',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      color: '#2D3436',
    }).setOrigin(0.5);

    this.subText = this.add.text(width / 2, 140, '손가락으로 자유롭게 그림을 그려보세요', {
      fontSize: '16px',
      fontFamily: 'sans-serif',
      color: '#999',
    }).setOrigin(0.5);

    this.stepsData = steps;

    // Drawing system
    this.drawingSystem = new DrawingSystem(this);

    // Play button (step 2 action)
    this.playBtn = this.add.text(width / 2, height - 100, '▶ 살려내기!', {
      fontSize: '24px',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      color: '#FFF',
      backgroundColor: '#FF6B6B',
      padding: { x: 30, y: 15 },
    }).setOrigin(0.5).setDepth(100).setInteractive({ useHandCursor: true });

    this.playBtn.on('pointerdown', () => this._runSimulation());

    // Skip button
    this.skipBtn = this.add.text(width - 20, 30, '건너뛰기 →', {
      fontSize: '16px',
      fontFamily: 'sans-serif',
      color: '#AAA',
    }).setOrigin(1, 0).setDepth(100).setInteractive({ useHandCursor: true });

    this.skipBtn.on('pointerdown', () => {
      localStorage.setItem('drawAlive_onboarded', 'true');
      this.cameras.main.fadeOut(300);
      this.time.delayedCall(300, () => this.scene.start('MainMenuScene'));
    });

    // Detect first stroke drawn to advance to step 2
    this.drawingSystem.onStrokeEnd = () => {
      if (this.step === 0) {
        this._advanceStep(1);
      }
    };

    // Floor
    this.matter.add.rectangle(width / 2, height - 30, width, 20, { isStatic: true, label: 'floor' });

    // Walls
    this.matter.add.rectangle(10, height / 2, 20, height, { isStatic: true, label: 'wall' });
    this.matter.add.rectangle(width - 10, height / 2, 20, height, { isStatic: true, label: 'wall' });

    this.isSimulating = false;

    // Pause physics initially
    this.matter.world.pause();
  }

  _runSimulation() {
    const strokes = this.drawingSystem.getStrokes();
    if (strokes.length === 0) return;

    this.isSimulating = true;
    this.drawingSystem.enabled = false;
    this.playBtn.setVisible(false);

    // Resume physics for simulation
    this.matter.world.resume();

    // Convert drawings to physics bodies
    this.drawnBodies = PhysicsConverter.convertStrokes(this, strokes);

    // Advance to step 3
    this._advanceStep(2);
    this.promptText.setText('공이 ⭐에 닿으면 클리어!');
    this.subText.setText('그림이 살아 움직입니다!');

    // Create visual representations for drawn bodies
    this._createBodyVisuals();

    // Hide the drawing graphics
    this.drawingSystem.graphics.setAlpha(0.15);

    // After simulation, show continue button
    this.time.delayedCall(4000, () => {
      this._showContinue();
    });
  }

  _createBodyVisuals() {
    this.bodyGraphics = this.add.graphics();

    this.updateEvent = this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (!this.bodyGraphics) return;
        this.bodyGraphics.clear();
        for (const body of this.drawnBodies) {
          if (!body || !body.vertices) continue;
          const color = body.drawColor || 0x2D3436;
          this.bodyGraphics.fillStyle(color, 0.8);
          this.bodyGraphics.beginPath();
          const verts = body.vertices;
          this.bodyGraphics.moveTo(verts[0].x, verts[0].y);
          for (let i = 1; i < verts.length; i++) {
            this.bodyGraphics.lineTo(verts[i].x, verts[i].y);
          }
          this.bodyGraphics.closePath();
          this.bodyGraphics.fillPath();

          // Draw eyes on the body (alive feeling!)
          const cx = body.position.x;
          const cy = body.position.y;
          this._drawEyes(cx, cy, body.angle || 0);
        }
      },
    });
  }

  _drawEyes(cx, cy, angle) {
    const g = this.bodyGraphics;
    const eyeSpacing = 8;
    const eyeSize = 4;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // Left eye
    const lx = cx + (-eyeSpacing) * cos - (-5) * sin;
    const ly = cy + (-eyeSpacing) * sin + (-5) * cos;
    g.fillStyle(0xFFFFFF, 1);
    g.fillCircle(lx, ly, eyeSize + 1);
    g.fillStyle(0x2D3436, 1);
    g.fillCircle(lx, ly, eyeSize - 1);

    // Right eye
    const rx = cx + eyeSpacing * cos - (-5) * sin;
    const ry = cy + eyeSpacing * sin + (-5) * cos;
    g.fillStyle(0xFFFFFF, 1);
    g.fillCircle(rx, ry, eyeSize + 1);
    g.fillStyle(0x2D3436, 1);
    g.fillCircle(rx, ry, eyeSize - 1);
  }

  _showContinue() {
    const { width, height } = this.scale;
    const continueBtn = this.add.text(width / 2, height - 100, '시작하기 →', {
      fontSize: '24px',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      color: '#FFF',
      backgroundColor: '#4ECDC4',
      padding: { x: 30, y: 15 },
    }).setOrigin(0.5).setDepth(100).setInteractive({ useHandCursor: true });

    continueBtn.on('pointerdown', () => {
      localStorage.setItem('drawAlive_onboarded', 'true');
      this.cameras.main.fadeOut(300);
      this.time.delayedCall(300, () => this.scene.start('MainMenuScene'));
    });
  }

  _advanceStep(newStep) {
    this.step = newStep;
    // Update step dots
    for (let i = 0; i < this.stepDots.length; i++) {
      const dot = this.stepDots[i];
      dot.graphics.clear();
      const isActive = i <= newStep;
      dot.graphics.fillStyle(isActive ? 0xFF6B6B : 0xCCCCCC, 1);
      dot.graphics.fillCircle(dot.x, 55, 12);
      dot.label.setColor(isActive ? '#FFF' : '#999');
    }
    if (this.stepsData[newStep]) {
      this.promptText.setText(this.stepsData[newStep].desc);
    }
    if (newStep === 1) {
      this.subText.setText('아래 ▶ 버튼을 눌러보세요!');
    }
  }

  shutdown() {
    if (this.updateEvent) this.updateEvent.destroy();
    if (this.drawingSystem) this.drawingSystem.destroy();
  }
}
