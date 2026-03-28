import Phaser from 'phaser';
import { DrawingSystem } from '../systems/DrawingSystem.js';
import { PhysicsConverter } from '../systems/PhysicsConverter.js';
import { GameUI } from '../ui/GameUI.js';

export class SandboxScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SandboxScene' });
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#FFF8F0');
    this.cameras.main.fadeIn(200);

    this.isSimulating = false;
    this.drawnBodies = [];
    this.bodyGraphics = null;

    // Physics world
    this.matter.world.setBounds(0, 0, width, height, 20, true, true, false, true);

    // Floor
    this.matter.add.rectangle(width / 2, height - 15, width + 40, 30, {
      isStatic: true, label: 'floor', friction: 0.8,
    });

    // Drawing system (no ink limit)
    this.drawingSystem = new DrawingSystem(this);

    // UI
    this.gameUI = new GameUI(this, { sandbox: true });
    this.gameUI.setStageName('샌드박스');
    this.gameUI.setGoalText('자유롭게 그리고 실험하세요!');

    this.gameUI.onColorChange = (color) => this.drawingSystem.setColor(color);
    this.gameUI.onSimulate = () => this._toggleSimulation();
    this.gameUI.onUndo = () => {
      if (this.isSimulating) return;
      this.drawingSystem.undo();
    };
    this.gameUI.onBack = () => {
      if (this.isSimulating) this._stopSimulation();
      this.cameras.main.fadeOut(200);
      this.time.delayedCall(200, () => this.scene.start('MainMenuScene'));
    };

    // Clear button
    const clearBtn = this.add.text(width - 20, 85, '전체 지우기', {
      fontSize: '14px', fontFamily: 'sans-serif', color: '#FF6B6B',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(101)
      .setInteractive({ useHandCursor: true });
    clearBtn.on('pointerdown', () => {
      if (this.isSimulating) this._stopSimulation();
      this.drawingSystem.clear();
    });

    // Pause physics initially
    this.matter.world.pause();
  }

  _toggleSimulation() {
    if (this.isSimulating) {
      this._stopSimulation();
    } else {
      this._startSimulation();
    }
  }

  _startSimulation() {
    const strokes = this.drawingSystem.getStrokes();
    if (strokes.length === 0) return;

    this.isSimulating = true;
    this.drawingSystem.enabled = false;
    this.gameUI.setSimulationMode(true);

    this.drawnBodies = PhysicsConverter.convertStrokes(this, strokes);
    this.bodyGraphics = this.add.graphics().setDepth(10);

    this.bodyRenderEvent = this.time.addEvent({
      delay: 16, loop: true,
      callback: () => this._renderBodies(),
    });

    this.drawingSystem.graphics.setAlpha(0.1);
    this.matter.world.resume();
  }

  _stopSimulation() {
    this.isSimulating = false;
    this.gameUI.setSimulationMode(false);
    this.matter.world.pause();

    for (const body of this.drawnBodies) {
      if (body) this.matter.world.remove(body);
    }
    this.drawnBodies = [];

    if (this.bodyRenderEvent) this.bodyRenderEvent.destroy();
    if (this.bodyGraphics) { this.bodyGraphics.destroy(); this.bodyGraphics = null; }

    this.drawingSystem.enabled = true;
    this.drawingSystem.graphics.setAlpha(1);
  }

  _renderBodies() {
    if (!this.bodyGraphics) return;
    this.bodyGraphics.clear();

    for (const body of this.drawnBodies) {
      if (!body || !body.vertices) continue;
      const color = body.drawColor || 0x2D3436;

      this.bodyGraphics.fillStyle(color, 0.85);
      this.bodyGraphics.beginPath();
      const verts = body.vertices;
      this.bodyGraphics.moveTo(verts[0].x, verts[0].y);
      for (let i = 1; i < verts.length; i++) {
        this.bodyGraphics.lineTo(verts[i].x, verts[i].y);
      }
      this.bodyGraphics.closePath();
      this.bodyGraphics.fillPath();

      // Eyes
      const cx = body.position.x;
      const cy = body.position.y;
      const angle = body.angle || 0;
      const eyeSpacing = 8;
      const eyeSize = 3;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      const lx = cx + (-eyeSpacing) * cos - (-5) * sin;
      const ly = cy + (-eyeSpacing) * sin + (-5) * cos;
      this.bodyGraphics.fillStyle(0xFFFFFF, 1);
      this.bodyGraphics.fillCircle(lx, ly, eyeSize + 1);
      this.bodyGraphics.fillStyle(0x2D3436, 1);
      this.bodyGraphics.fillCircle(lx, ly, eyeSize - 1);

      const rx = cx + eyeSpacing * cos - (-5) * sin;
      const ry = cy + eyeSpacing * sin + (-5) * cos;
      this.bodyGraphics.fillStyle(0xFFFFFF, 1);
      this.bodyGraphics.fillCircle(rx, ry, eyeSize + 1);
      this.bodyGraphics.fillStyle(0x2D3436, 1);
      this.bodyGraphics.fillCircle(rx, ry, eyeSize - 1);
    }
  }

  shutdown() {
    if (this.bodyRenderEvent) this.bodyRenderEvent.destroy();
  }
}
