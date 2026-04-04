import Phaser from 'phaser';
import { DrawingSystem } from '../systems/DrawingSystem.js';
import { PhysicsConverter } from '../systems/PhysicsConverter.js';
import { StageManager } from '../systems/StageManager.js';
import { GameUI } from '../ui/GameUI.js';

// --- DrawAliveSFX: Web Audio sound effects ---
class DrawAliveSFX {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (this.ctx) return;
    try { this.ctx = new AudioContext(); } catch { /* no audio */ }
  }

  _ensureCtx() {
    if (!this.ctx) return null;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  playWhoosh() {
    const ctx = this._ensureCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  }

  playStarCollect() {
    const ctx = this._ensureCtx();
    if (!ctx) return;
    // High-freq sparkle burst
    [1800, 2400, 3000].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.05;
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.1);
    });
  }

  playVictoryChime() {
    const ctx = this._ensureCtx();
    if (!ctx) return;
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  }
}

const drawAliveSFX = new DrawAliveSFX();

export class GameplayScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameplayScene' });
  }

  init(data) {
    this.stageId = data.stageId || 1;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#FFF8F0');
    this.cameras.main.fadeIn(200);

    this.stageManager = new StageManager();
    this.stage = this.stageManager.getStage(this.stageId);
    if (!this.stage) {
      this.scene.start('StageSelectScene');
      return;
    }

    this.isSimulating = false;
    this.simulationTime = 0;
    this.drawnBodies = [];
    this.collectedStars = 0;
    this.starSprites = [];
    this.targetSprites = [];
    this.bodyGraphics = null;
    this._cleared = false;
    this._starShineAngle = 0;

    // Init audio on first interaction
    this.input.once('pointerdown', () => drawAliveSFX.init());

    // Drawing particle system
    this._drawingParticles = [];
    this._drawingParticleGraphics = null;
    this._lastParticlePos = { x: 0, y: 0 };

    // Draw environmental stage background decorations
    this._drawStageBackground();

    // Physics world setup
    this.matter.world.setBounds(0, 0, width, height, 20, true, true, false, true);

    // Floor
    const floor = this.matter.add.rectangle(width / 2, height - 15, width + 40, 30, {
      isStatic: true, label: 'floor', friction: 0.8,
    });

    // Create stage obstacles
    this._createObstacles();

    // Create collectible stars
    this._createCollectibles();

    // Create target zones
    this._createTargets();

    // Drawing system
    this.drawingSystem = new DrawingSystem(this);
    this.drawingSystem.setInkLimit(this.stage.inkLimit);
    // Disable drawing until stage intro finishes
    this.drawingSystem.enabled = false;

    // Stage intro overlay
    this._showStageIntro(width, height);

    // UI
    this.gameUI = new GameUI(this);
    this.gameUI.setStageName(this.stage.name);
    this.gameUI.setGoalText(this.stage.goals.map(g => g.description).join(' + '));
    this.gameUI.updateInkGauge(0, this.stage.inkLimit);

    // UI callbacks
    this.gameUI.onColorChange = (color) => this.drawingSystem.setColor(color);
    this.gameUI.onSimulate = () => this._toggleSimulation();
    this.gameUI.onUndo = () => this.drawingSystem.undo();
    this.gameUI.onBack = () => this._goBack();

    // Drawing particle graphics layer
    this._drawingParticleGraphics = this.add.graphics().setDepth(15);

    // Track drawing position for particle emission
    this.input.on('pointermove', (pointer) => {
      if (!pointer.isDown || this.isSimulating || !this.drawingSystem?.enabled) return;
      const dx = pointer.x - this._lastParticlePos.x;
      const dy = pointer.y - this._lastParticlePos.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 20) {
        this._lastParticlePos = { x: pointer.x, y: pointer.y };
        const colors = [0xFF6B6B, 0x4ECDC4, 0xFFC312, 0xA8E6CF, 0x6C5CE7];
        this._drawingParticles.push({
          x: pointer.x + (Math.random() - 0.5) * 8,
          y: pointer.y + (Math.random() - 0.5) * 8,
          size: 2 + Math.random() * 3,
          life: 1,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    });
    this.input.on('pointerdown', (pointer) => {
      this._lastParticlePos = { x: pointer.x, y: pointer.y };
    });

    // Particle update timer
    this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => this._updateDrawingParticles(),
    });

    // Ink gauge updates
    this.drawingSystem.onInkChanged = (used, limit) => {
      this.gameUI.updateInkGauge(used, limit);
    };

    // Collision detection for stars and targets
    this.matter.world.on('collisionstart', (event) => {
      if (!this.isSimulating) return;
      for (const pair of event.pairs) {
        this._checkStarCollision(pair.bodyA, pair.bodyB);
        this._checkStarCollision(pair.bodyB, pair.bodyA);
        this._checkTargetCollision(pair.bodyA, pair.bodyB);
        this._checkTargetCollision(pair.bodyB, pair.bodyA);
      }
    });

    // Tutorial text
    if (this.stage.tutorial) {
      this.gameUI.showTutorial(this.stage.tutorial);
    }

    // Pause physics initially
    this.matter.world.pause();

    // Draw goal indicators (arrows toward targets)
    this._drawGoalIndicators();

    // Star sparkle animation timer
    this._starSparkleGraphics = this.add.graphics().setDepth(6);
    this.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => this._updateStarSparkle(),
    });

    // Drawing hint: show ghost hint on first visit to a stage
    this._showDrawingHintIfFirstTime();

    // Scene cleanup on shutdown
    this.events.on('shutdown', () => {
      if (this.drawingSystem) this.drawingSystem.destroy();
      this.drawnBodies = [];
      this.starSprites = [];
      this.targetSprites = [];
    });
  }

  _createObstacles() {
    if (!this.stage.obstacles) return;

    const g = this.add.graphics();
    g.setDepth(1);

    for (const obs of this.stage.obstacles) {
      if (obs.type === 'rect') {
        const body = this.matter.add.rectangle(obs.x, obs.y, obs.w, obs.h, {
          isStatic: obs.isStatic !== false,
          angle: obs.angle || 0,
          friction: 0.8,
          label: 'obstacle',
        });

        // Draw obstacle visual
        g.fillStyle(0xDDDDDD, 1);
        g.lineStyle(2, 0xBBBBBB, 1);

        // Draw rotated rectangle
        const cos = Math.cos(obs.angle || 0);
        const sin = Math.sin(obs.angle || 0);
        const hw = obs.w / 2;
        const hh = obs.h / 2;
        const corners = [
          { x: obs.x + (-hw * cos - -hh * sin), y: obs.y + (-hw * sin + -hh * cos) },
          { x: obs.x + (hw * cos - -hh * sin), y: obs.y + (hw * sin + -hh * cos) },
          { x: obs.x + (hw * cos - hh * sin), y: obs.y + (hw * sin + hh * cos) },
          { x: obs.x + (-hw * cos - hh * sin), y: obs.y + (-hw * sin + hh * cos) },
        ];
        g.beginPath();
        g.moveTo(corners[0].x, corners[0].y);
        for (let i = 1; i < 4; i++) g.lineTo(corners[i].x, corners[i].y);
        g.closePath();
        g.fillPath();
        g.strokePath();
      }
    }
    this.obstacleGraphics = g;
  }

  _createCollectibles() {
    if (!this.stage.collectibles) return;

    for (const c of this.stage.collectibles) {
      if (c.type === 'star') {
        // Visual star
        const starG = this.add.graphics().setDepth(5);
        this._drawStar(starG, c.x, c.y, 20, 5, 0xFFC312);

        // Physics sensor
        const sensor = this.matter.add.circle(c.x, c.y, 25, {
          isStatic: true,
          isSensor: true,
          label: 'star',
        });

        this.starSprites.push({ graphics: starG, body: sensor, collected: false, x: c.x, y: c.y });
      }
    }
  }

  _createTargets() {
    if (!this.stage.targets) return;
    this.targetSprites = [];

    for (const t of this.stage.targets) {
      const targetG = this.add.graphics().setDepth(3);
      const r = t.radius || 40;

      // Draw target zone (pulsing circle)
      targetG.lineStyle(3, 0xFF6B6B, 0.8);
      targetG.strokeCircle(t.x, t.y, r);
      targetG.lineStyle(2, 0xFF6B6B, 0.4);
      targetG.strokeCircle(t.x, t.y, r * 0.6);
      targetG.fillStyle(0xFF6B6B, 0.15);
      targetG.fillCircle(t.x, t.y, r);

      // Label
      const label = this.add.text(t.x, t.y, '목표', {
        fontSize: '14px', fontFamily: 'sans-serif', color: '#FF6B6B',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(4);

      // Sensor body
      const sensor = this.matter.add.circle(t.x, t.y, r, {
        isStatic: true, isSensor: true, label: 'target',
      });

      this.targetSprites.push({
        graphics: targetG, label, body: sensor, reached: false,
        x: t.x, y: t.y, radius: r,
      });
    }
  }

  _drawStar(g, cx, cy, outerR, points, color) {
    g.fillStyle(color, 1);
    g.beginPath();
    const innerR = outerR * 0.45;
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath();
    g.fillPath();

    // Center glow
    g.fillStyle(0xFFF8F0, 0.5);
    g.fillCircle(cx, cy, outerR * 0.35);

    // Outer soft glow ring
    g.fillStyle(0xFFC312, 0.15);
    g.fillCircle(cx, cy, outerR * 1.4);
  }

  _drawStageBackground() {
    const { width, height } = this.scale;
    const bgG = this.add.graphics().setDepth(0);

    // Subtle sky gradient at top (warm pastel)
    for (let i = 0; i < 6; i++) {
      const alpha = 0.04 * (6 - i);
      bgG.fillStyle(0x87CEEB, alpha);
      bgG.fillRect(0, i * 25, width, 25);
    }

    // Clouds
    const cloudCount = 3 + (this.stageId % 3);
    for (let i = 0; i < cloudCount; i++) {
      const cx = (width / (cloudCount + 1)) * (i + 1) + (this.stageId * 37 + i * 73) % 60 - 30;
      const cy = 30 + (this.stageId * 13 + i * 47) % 80;
      const scale = 0.6 + (i % 3) * 0.25;
      bgG.fillStyle(0xFFFFFF, 0.25);
      bgG.fillCircle(cx, cy, 22 * scale);
      bgG.fillCircle(cx - 18 * scale, cy + 4, 16 * scale);
      bgG.fillCircle(cx + 18 * scale, cy + 4, 16 * scale);
      bgG.fillCircle(cx + 8 * scale, cy - 6, 14 * scale);
    }

    // Ground grass tufts along the bottom
    const floorY = height - 30;
    bgG.fillStyle(0xA8E6CF, 0.5);
    for (let i = 0; i < 20; i++) {
      const gx = (width / 20) * i + (this.stageId * 11 + i * 31) % 30;
      const gh = 6 + (i * 7) % 8;
      // Little triangle tufts
      bgG.beginPath();
      bgG.moveTo(gx - 4, floorY);
      bgG.lineTo(gx, floorY - gh);
      bgG.lineTo(gx + 4, floorY);
      bgG.closePath();
      bgG.fillPath();
      bgG.beginPath();
      bgG.moveTo(gx + 2, floorY);
      bgG.lineTo(gx + 6, floorY - gh * 0.7);
      bgG.lineTo(gx + 10, floorY);
      bgG.closePath();
      bgG.fillPath();
    }

    // Small decorative trees on some stages
    if (this.stageId % 2 === 0) {
      const treePositions = [width * 0.1, width * 0.9];
      for (const tx of treePositions) {
        // Trunk
        bgG.fillStyle(0x8D6E63, 0.3);
        bgG.fillRect(tx - 3, floorY - 35, 6, 35);
        // Canopy
        bgG.fillStyle(0x66BB6A, 0.25);
        bgG.fillCircle(tx, floorY - 45, 18);
        bgG.fillCircle(tx - 10, floorY - 38, 14);
        bgG.fillCircle(tx + 10, floorY - 38, 14);
      }
    }
  }

  _drawGoalIndicators() {
    // Animated dashed arrows pointing toward targets
    if (!this.targetSprites || this.targetSprites.length === 0) return;
    const { width, height } = this.scale;

    if (this._goalIndicatorGraphics) this._goalIndicatorGraphics.destroy();
    this._goalIndicatorGraphics = this.add.graphics().setDepth(2);
    const g = this._goalIndicatorGraphics;

    for (const target of this.targetSprites) {
      if (target.reached) continue;
      // Draw dashed circle around target
      const segments = 12;
      g.lineStyle(2, 0xFF6B6B, 0.4);
      for (let i = 0; i < segments; i += 2) {
        const a1 = (i / segments) * Math.PI * 2;
        const a2 = ((i + 1) / segments) * Math.PI * 2;
        const r = target.radius + 12;
        g.beginPath();
        g.moveTo(target.x + Math.cos(a1) * r, target.y + Math.sin(a1) * r);
        g.lineTo(target.x + Math.cos(a2) * r, target.y + Math.sin(a2) * r);
        g.strokePath();
      }

      // Arrow from top-center pointing down toward target
      const arrowStartY = Math.max(110, target.y - 80);
      g.lineStyle(2, 0xFF6B6B, 0.5);
      // Dashed line
      for (let dy = arrowStartY; dy < target.y - target.radius - 15; dy += 10) {
        g.beginPath();
        g.moveTo(target.x, dy);
        g.lineTo(target.x, dy + 5);
        g.strokePath();
      }
      // Arrowhead
      const tipY = target.y - target.radius - 15;
      g.fillStyle(0xFF6B6B, 0.5);
      g.beginPath();
      g.moveTo(target.x, tipY + 8);
      g.lineTo(target.x - 6, tipY);
      g.lineTo(target.x + 6, tipY);
      g.closePath();
      g.fillPath();
    }
  }

  _checkStarCollision(bodyA, bodyB) {
    if (bodyA.label !== 'star') return;

    // Check if bodyB is a drawn body
    if (!bodyB.label || !bodyB.label.startsWith('drawn_')) return;

    // Find matching star sprite
    for (const star of this.starSprites) {
      if (star.body === bodyA && !star.collected) {
        star.collected = true;
        this.collectedStars++;

        // Star collect sound + particle explosion
        drawAliveSFX.playStarCollect();
        this._spawnStarExplosion(star.x, star.y);

        // Collect animation
        this.tweens.add({
          targets: star.graphics,
          scaleX: 1.5, scaleY: 1.5, alpha: 0,
          duration: 300,
          ease: 'Power2',
          onComplete: () => star.graphics.setVisible(false),
        });

        // Remove sensor
        this.matter.world.remove(star.body);

        // Check win condition
        this._checkWinCondition();
        break;
      }
    }
  }

  _checkTargetCollision(bodyA, bodyB) {
    if (bodyA.label !== 'target') return;
    if (!bodyB.label || !bodyB.label.startsWith('drawn_')) return;

    if (!this.targetSprites) return;
    for (const target of this.targetSprites) {
      if (target.body === bodyA && !target.reached) {
        target.reached = true;

        // Animate target
        this.tweens.add({
          targets: target.graphics,
          alpha: 0.3,
          duration: 300,
          ease: 'Power2',
        });
        target.label.setText('도착!').setColor('#4ECDC4');

        this._checkWinCondition();
        break;
      }
    }
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

    // Whoosh sound + camera shake
    drawAliveSFX.playWhoosh();
    this.cameras.main.shake(200, 0.008);

    this.isSimulating = true;
    this.simulationStartTime = Date.now();
    this.drawingSystem.enabled = false;
    this.gameUI.setSimulationMode(true);

    // Convert drawings to physics bodies
    this.drawnBodies = PhysicsConverter.convertStrokes(this, strokes);

    // Create visual graphics for drawn bodies
    this.bodyGraphics = this.add.graphics().setDepth(10);

    // Start body rendering loop
    this.bodyRenderEvent = this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => this._renderBodies(),
    });

    // Hide drawing graphics (show faintly)
    this.drawingSystem.graphics.setAlpha(0.1);

    // Resume physics
    this.matter.world.resume();

    // Check for reach_ground goal periodically
    this._setupGroundCheck();

    // Check for reach_target goal via continuous checking
    this._setupTargetCheck();

    // Auto-stop after 15 seconds
    this.autoStopTimer = this.time.delayedCall(15000, () => {
      if (this.isSimulating) this._onSimulationTimeout();
    });
  }

  _stopSimulation() {
    this.isSimulating = false;
    this.gameUI.setSimulationMode(false);

    // Pause physics
    this.matter.world.pause();

    // Remove drawn bodies
    for (const body of this.drawnBodies) {
      if (body) this.matter.world.remove(body);
    }
    this.drawnBodies = [];

    // Stop rendering
    if (this.bodyRenderEvent) this.bodyRenderEvent.destroy();
    if (this.bodyGraphics) { this.bodyGraphics.destroy(); this.bodyGraphics = null; }
    if (this.autoStopTimer) this.autoStopTimer.destroy();
    if (this.groundCheckEvent) this.groundCheckEvent.destroy();

    // Restore drawing
    this.drawingSystem.enabled = true;
    this.drawingSystem.graphics.setAlpha(1);

    // Reset stars
    this.collectedStars = 0;
    for (const star of this.starSprites) {
      if (star.collected) {
        star.collected = false;
        star.graphics.setVisible(true).setAlpha(1).setScale(1);
        // Re-create sensor
        star.body = this.matter.add.circle(star.x, star.y, 25, {
          isStatic: true, isSensor: true, label: 'star',
        });
      }
    }

    // Reset targets
    if (this.targetSprites) {
      for (const target of this.targetSprites) {
        if (target.reached) {
          target.reached = false;
          target.graphics.setAlpha(1);
          target.label.setText('목표').setColor('#FF6B6B');
          target.body = this.matter.add.circle(target.x, target.y, target.radius, {
            isStatic: true, isSensor: true, label: 'target',
          });
        }
      }
    }
  }

  _renderBodies() {
    if (!this.bodyGraphics) return;
    this.bodyGraphics.clear();

    for (const body of this.drawnBodies) {
      if (!body || !body.vertices) continue;
      const color = body.drawColor || 0x2D3436;
      const verts = body.vertices;

      // Subtle filled body with low opacity matching stroke color
      this.bodyGraphics.fillStyle(color, 0.25);
      this.bodyGraphics.beginPath();
      this.bodyGraphics.moveTo(verts[0].x, verts[0].y);
      for (let i = 1; i < verts.length; i++) {
        this.bodyGraphics.lineTo(verts[i].x, verts[i].y);
      }
      this.bodyGraphics.closePath();
      this.bodyGraphics.fillPath();

      // Solid stroke outline
      this.bodyGraphics.lineStyle(2.5, color, 0.85);
      this.bodyGraphics.beginPath();
      this.bodyGraphics.moveTo(verts[0].x, verts[0].y);
      for (let i = 1; i < verts.length; i++) {
        this.bodyGraphics.lineTo(verts[i].x, verts[i].y);
      }
      this.bodyGraphics.closePath();
      this.bodyGraphics.strokePath();

      // Eyes
      this._drawEyes(body.position.x, body.position.y, body.angle || 0);
    }
  }

  _drawEyes(cx, cy, angle) {
    const g = this.bodyGraphics;
    const eyeSpacing = 8;
    const eyeSize = 3;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const lx = cx + (-eyeSpacing) * cos - (-5) * sin;
    const ly = cy + (-eyeSpacing) * sin + (-5) * cos;
    g.fillStyle(0xFFFFFF, 1);
    g.fillCircle(lx, ly, eyeSize + 1);
    g.fillStyle(0x2D3436, 1);
    g.fillCircle(lx, ly, eyeSize - 1);

    const rx = cx + eyeSpacing * cos - (-5) * sin;
    const ry = cy + eyeSpacing * sin + (-5) * cos;
    g.fillStyle(0xFFFFFF, 1);
    g.fillCircle(rx, ry, eyeSize + 1);
    g.fillStyle(0x2D3436, 1);
    g.fillCircle(rx, ry, eyeSize - 1);
  }

  _setupGroundCheck() {
    const hasGroundGoal = this.stage.goals.some(g => g.type === 'reach_ground');
    if (!hasGroundGoal) return;

    const height = this.scale.height;
    this.groundCheckEvent = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        for (const body of this.drawnBodies) {
          if (body && body.position && body.position.y > height - 60) {
            this._checkWinCondition();
            return;
          }
        }
      },
    });
  }

  _setupTargetCheck() {
    const hasTargetGoal = this.stage.goals.some(g => g.type === 'reach_target');
    if (!hasTargetGoal || !this.targetSprites || this.targetSprites.length === 0) return;

    this.targetCheckEvent = this.time.addEvent({
      delay: 200,
      loop: true,
      callback: () => {
        if (!this.isSimulating) return;
        for (const body of this.drawnBodies) {
          if (!body || !body.position) continue;
          for (const target of this.targetSprites) {
            if (target.reached) continue;
            const dist = Math.hypot(body.position.x - target.x, body.position.y - target.y);
            if (dist < target.radius + 15) {
              target.reached = true;
              this.tweens.add({
                targets: target.graphics, alpha: 0.3, duration: 300, ease: 'Power2',
              });
              target.label.setText('도착!').setColor('#4ECDC4');
              this._checkWinCondition();
            }
          }
        }
      },
    });
  }

  _checkWinCondition() {
    if (!this.isSimulating) return;

    let allGoalsMet = true;
    for (const goal of this.stage.goals) {
      if (goal.type === 'collect_stars') {
        if (this.collectedStars < goal.count) allGoalsMet = false;
      } else if (goal.type === 'reach_ground') {
        const height = this.scale.height;
        const reached = this.drawnBodies.some(b => b && b.position && b.position.y > height - 60);
        if (!reached) allGoalsMet = false;
      } else if (goal.type === 'reach_target') {
        if (this.targetSprites) {
          const allReached = this.targetSprites.every(t => t.reached);
          if (!allReached) allGoalsMet = false;
        } else {
          allGoalsMet = false;
        }
      }
    }

    if (allGoalsMet) {
      this._onStageClear();
    }
  }

  _onStageClear() {
    if (this._cleared) return;
    this._cleared = true;

    const timeTaken = (Date.now() - this.simulationStartTime) / 1000;
    const inkUsed = this.drawingSystem.inkUsed;
    const inkLimit = this.stage.inkLimit;
    const stars = this.stageManager.calculateStars(this.stageId, inkUsed, inkLimit, timeTaken);

    // Save progress
    this.stageManager.saveProgress(this.stageId, stars, inkUsed, timeTaken);

    // Show success effect
    this._showSuccessEffect();

    // Go to result scene after delay
    this.time.delayedCall(1500, () => {
      this.cameras.main.fadeOut(300);
      this.time.delayedCall(300, () => {
        this.scene.start('ResultScene', {
          stageId: this.stageId,
          stars,
          inkUsed,
          inkLimit,
          timeTaken,
          maxStage: this.stageManager.getStageCount(),
        });
      });
    });
  }

  _showSuccessEffect() {
    const { width, height } = this.scale;

    // Victory chime
    drawAliveSFX.playVictoryChime();

    // Confetti rain (30 colorful dots from top)
    this._spawnConfetti();

    // Particle-like celebration
    const g = this.add.graphics().setDepth(200);
    const particles = [];
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: width / 2 + (Math.random() - 0.5) * 200,
        y: height / 2,
        vx: (Math.random() - 0.5) * 8,
        vy: -Math.random() * 12 - 3,
        size: 4 + Math.random() * 8,
        color: [0xFFC312, 0xFF6B6B, 0x4ECDC4, 0xA8E6CF, 0x6C5CE7][Math.floor(Math.random() * 5)],
        life: 1,
      });
    }

    const successText = this.add.text(width / 2, height / 2 - 50, '클리어!', {
      fontSize: '48px', fontFamily: 'sans-serif', fontStyle: 'bold', color: '#FF6B6B',
    }).setOrigin(0.5).setDepth(201).setAlpha(0);

    this.tweens.add({
      targets: successText, alpha: 1, scaleX: 1.2, scaleY: 1.2,
      duration: 400, ease: 'Back.easeOut',
    });

    const particleTimer = this.time.addEvent({
      delay: 16, loop: true,
      callback: () => {
        g.clear();
        let alive = false;
        for (const p of particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.3;
          p.life -= 0.02;
          if (p.life > 0) {
            alive = true;
            g.fillStyle(p.color, p.life);
            g.fillCircle(p.x, p.y, p.size * p.life);
          }
        }
        if (!alive) particleTimer.destroy();
      },
    });
  }

  _onSimulationTimeout() {
    // Failed - offer retry
    const { width, height } = this.scale;

    const failText = this.add.text(width / 2, height / 2 - 50, '시간 초과...', {
      fontSize: '32px', fontFamily: 'sans-serif', color: '#FFB3BA',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(200);

    const retryBtn = this.add.text(width / 2, height / 2 + 20, '다시 시도', {
      fontSize: '22px', fontFamily: 'sans-serif', color: '#FFF',
      backgroundColor: '#FF6B6B', padding: { x: 24, y: 12 },
    }).setOrigin(0.5).setDepth(200).setInteractive({ useHandCursor: true });

    retryBtn.on('pointerdown', () => {
      failText.destroy();
      retryBtn.destroy();
      this._stopSimulation();
      this.drawingSystem.clear();
    });
  }

  _showDrawingHintIfFirstTime() {
    const hintKey = `drawAlive_hint_${this.stageId}`;
    if (localStorage.getItem(hintKey)) return;
    localStorage.setItem(hintKey, 'true');

    const { width, height } = this.scale;
    const hintG = this.add.graphics().setDepth(50).setAlpha(0.35);

    // Draw a ghost hint based on stage goals
    hintG.lineStyle(6, 0xFF6B6B, 1);

    if (this.stage.collectibles && this.stage.collectibles.length > 0) {
      // Hint: draw a curved line from top-center toward the first collectible
      const target = this.stage.collectibles[0];
      const startX = width / 2;
      const startY = 200;
      hintG.beginPath();
      hintG.moveTo(startX, startY);
      // Curve toward collectible
      const midX = (startX + target.x) / 2 + (Math.random() - 0.5) * 40;
      const midY = (startY + target.y) / 2 - 30;
      // Approximate bezier with line segments
      for (let t = 0; t <= 1; t += 0.05) {
        const invT = 1 - t;
        const px = invT * invT * startX + 2 * invT * t * midX + t * t * target.x;
        const py = invT * invT * startY + 2 * invT * t * midY + t * t * (target.y - 40);
        hintG.lineTo(px, py);
      }
      hintG.strokePath();
    } else if (this.stage.targets && this.stage.targets.length > 0) {
      // Hint: line toward target
      const target = this.stage.targets[0];
      const startX = width / 2;
      const startY = 200;
      hintG.beginPath();
      hintG.moveTo(startX, startY);
      const midX = (startX + target.x) / 2;
      const midY = (startY + target.y) / 2 - 50;
      for (let t = 0; t <= 1; t += 0.05) {
        const invT = 1 - t;
        const px = invT * invT * startX + 2 * invT * t * midX + t * t * target.x;
        const py = invT * invT * startY + 2 * invT * t * midY + t * t * (target.y - 40);
        hintG.lineTo(px, py);
      }
      hintG.strokePath();
    } else {
      // Simple drop hint: draw a blob at center-top
      hintG.fillStyle(0xFF6B6B, 1);
      hintG.fillCircle(width / 2, 250, 25);
    }

    // Add hint label
    const hintLabel = this.add.text(width / 2, 165, '여기에 그려보세요!', {
      fontSize: '16px', fontFamily: 'sans-serif', color: '#FF6B6B',
      fontStyle: 'bold', backgroundColor: '#FFFFFFCC', padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setDepth(51).setAlpha(0.8);

    // Fade out the hint after 3 seconds
    this.tweens.add({
      targets: [hintG, hintLabel],
      alpha: 0,
      duration: 800,
      delay: 2500,
      ease: 'Power2',
      onComplete: () => {
        hintG.destroy();
        hintLabel.destroy();
      },
    });
  }

  _updateStarSparkle() {
    if (!this._starSparkleGraphics) return;
    this._starShineAngle += 0.12;
    this._starSparkleGraphics.clear();

    for (const star of this.starSprites) {
      if (star.collected) continue;
      const cx = star.x;
      const cy = star.y;
      const angle = this._starShineAngle;

      // Rotating shine lines
      this._starSparkleGraphics.lineStyle(1.5, 0xFFF176, 0.6);
      for (let i = 0; i < 4; i++) {
        const a = angle + (i * Math.PI) / 2;
        const inner = 12;
        const outer = 22;
        this._starSparkleGraphics.beginPath();
        this._starSparkleGraphics.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
        this._starSparkleGraphics.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
        this._starSparkleGraphics.strokePath();
      }
    }
  }

  _updateDrawingParticles() {
    if (!this._drawingParticleGraphics) return;
    this._drawingParticleGraphics.clear();
    for (const p of this._drawingParticles) {
      p.life -= 0.03;
      if (p.life > 0) {
        this._drawingParticleGraphics.fillStyle(p.color, p.life * 0.8);
        this._drawingParticleGraphics.fillCircle(p.x, p.y, p.size * p.life);
      }
    }
    this._drawingParticles = this._drawingParticles.filter(p => p.life > 0);
  }

  _spawnStarExplosion(cx, cy) {
    const g = this.add.graphics().setDepth(100);
    const particles = [];
    const colors = [0xFFC312, 0xFFF176, 0xFFFFFF, 0xFFD700];
    for (let i = 0; i < 15; i++) {
      const angle = (Math.PI * 2 * i) / 15 + Math.random() * 0.3;
      const speed = 80 + Math.random() * 120;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 4,
        life: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    const timer = this.time.addEvent({
      delay: 16, loop: true,
      callback: () => {
        g.clear();
        let alive = false;
        for (const p of particles) {
          p.x += p.vx * 0.016;
          p.y += p.vy * 0.016;
          p.vy += 200 * 0.016;
          p.life -= 0.04;
          if (p.life > 0) {
            alive = true;
            g.fillStyle(p.color, p.life);
            g.fillCircle(p.x, p.y, p.size * p.life);
          }
        }
        if (!alive) { timer.destroy(); g.destroy(); }
      },
    });
  }

  _spawnConfetti() {
    const { width, height } = this.scale;
    const g = this.add.graphics().setDepth(199);
    const confetti = [];
    const colors = [0xFFC312, 0xFF6B6B, 0x4ECDC4, 0xA8E6CF, 0x6C5CE7, 0xFF9FF3, 0x48DBFB];
    for (let i = 0; i < 30; i++) {
      confetti.push({
        x: Math.random() * width,
        y: -10 - Math.random() * 100,
        vx: (Math.random() - 0.5) * 60,
        vy: 80 + Math.random() * 120,
        size: 3 + Math.random() * 5,
        life: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        wobble: Math.random() * Math.PI * 2,
      });
    }
    const timer = this.time.addEvent({
      delay: 16, loop: true,
      callback: () => {
        g.clear();
        let alive = false;
        for (const p of confetti) {
          p.x += p.vx * 0.016 + Math.sin(p.wobble) * 1.5;
          p.y += p.vy * 0.016;
          p.wobble += 0.1;
          if (p.y > height + 20) p.life -= 0.05;
          else p.life -= 0.005;
          if (p.life > 0) {
            alive = true;
            g.fillStyle(p.color, Math.min(1, p.life));
            g.fillCircle(p.x, p.y, p.size);
          }
        }
        if (!alive) { timer.destroy(); g.destroy(); }
      },
    });
  }

  _showStageIntro(width, height) {
    // Stage intro overlay - show stage name + objective for 2 seconds
    const overlayBg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6)
      .setDepth(100);
    const goalText = this.stage.goals.map(g => g.description).join(' + ');
    const stageLabel = this.add.text(width / 2, height / 2 - 20, `⭐ Stage ${this.stageId}`, {
      fontSize: '32px',
      fontFamily: 'Outfit, sans-serif',
      fontStyle: 'bold',
      color: '#FFC312',
    }).setOrigin(0.5).setDepth(101).setAlpha(0);

    const goalLabel = this.add.text(width / 2, height / 2 + 25, goalText, {
      fontSize: '18px',
      fontFamily: '"Noto Sans KR", sans-serif',
      color: '#FFFFFF',
    }).setOrigin(0.5).setDepth(101).setAlpha(0);

    // Animate in
    this.tweens.add({
      targets: [stageLabel, goalLabel],
      alpha: 1,
      duration: 300,
      ease: 'Power2',
    });

    // Fade out after 2 seconds, then enable drawing
    this.time.delayedCall(2000, () => {
      this.tweens.add({
        targets: [overlayBg, stageLabel, goalLabel],
        alpha: 0,
        duration: 400,
        onComplete: () => {
          overlayBg.destroy();
          stageLabel.destroy();
          goalLabel.destroy();
          if (this.drawingSystem) this.drawingSystem.enabled = true;
        },
      });
    });
  }

  _goBack() {
    if (this.isSimulating) this._stopSimulation();
    this.cameras.main.fadeOut(200);
    this.time.delayedCall(200, () => this.scene.start('StageSelectScene'));
  }

  shutdown() {
    if (this.bodyRenderEvent) this.bodyRenderEvent.destroy();
    if (this.autoStopTimer) this.autoStopTimer.destroy();
    if (this.groundCheckEvent) this.groundCheckEvent.destroy();
    if (this.drawingSystem) this.drawingSystem.destroy();
    this.drawnBodies = [];
    this.starSprites = [];
    this.targetSprites = [];
  }
}
