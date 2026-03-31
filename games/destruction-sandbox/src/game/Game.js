import Matter from 'matter-js';
import { Physics } from '../engine/Physics.js';
import { Renderer } from '../engine/Renderer.js';
import { Input } from '../engine/Input.js';
import { Audio } from '../engine/Audio.js';
import { ParticleSystem } from '../engine/Particles.js';
import { UI, saveToDSLeaderboard } from '../ui/UI.js';
import { Block, createBlock } from './Block.js';
import { ChainReactionSystem } from './ChainReaction.js';
import { ToolManager, TOOLS } from './Tools.js';
import { ScoringSystem } from './Scoring.js';
import { SaveSystem } from './SaveSystem.js';
import { getLevel, LEVELS } from './Levels.js';

const { Body, Vector } = Matter;

export class Game {
  constructor(canvas, uiContainer) {
    this.canvas = canvas;
    this.physics = new Physics(canvas);
    this.renderer = new Renderer(canvas);
    this.input = new Input(canvas);
    this.audio = new Audio();
    this.particles = new ParticleSystem();
    this.ui = new UI(uiContainer);
    this.toolManager = new ToolManager();
    this.scoring = new ScoringSystem();
    this.chainSystem = new ChainReactionSystem(this);
    this.save = new SaveSystem();
    window.__saveSystem = this.save;

    this.state = 'loading'; // loading, menu, stageSelect, playing, paused, results, sandbox
    this.blocks = [];
    this.currentLevel = null;
    this.currentLevelId = null;
    this.groundY = 0;
    this.destructionSettled = false;
    this.settleTimer = 0;
    this.slowMoTriggered = false;
    this.laserLine = null; // { start, end } for laser visual
    this.laserFade = 0;

    this._setupCallbacks();
    this._setupInput();
  }

  _setupCallbacks() {
    // UI callbacks
    this.ui.on('campaign', () => this.showStageSelect());
    this.ui.on('sandbox', () => this.startSandbox());
    this.ui.on('mainMenu', () => this.showMainMenu());
    this.ui.on('stageSelect', () => this.showStageSelect());
    this.ui.on('startLevel', (id) => this.startLevel(id));
    this.ui.on('retry', () => this.startLevel(this.currentLevelId));
    this.ui.on('nextLevel', () => {
      const nextId = this.currentLevelId + 1;
      if (getLevel(nextId)) {
        this.startLevel(nextId);
      } else {
        this.showStageSelect();
      }
    });
    this.ui.on('pause', () => this.pause());
    this.ui.on('resume', () => this.resume());
    this.ui.on('selectTool', (id) => {
      this.toolManager.selectTool(id);
      this.audio.playUIClick();
    });

    // Chain reaction callbacks
    this.chainSystem.onChain = (count, block, reaction) => {
      this.audio.playChain(count);
      this.audio.vibrateChain();
      this.particles.emitChainLink(block.body.position.x, block.body.position.y);
      this.scoring.recordChain();

      // Show chain popup in screen space
      const sx = block.body.position.x;
      const sy = block.body.position.y;
      this.ui.showChainPopup(sx, sy - 30, `${reaction.description}! x${count}`);

      // Trigger slow-mo on big chains
      if (count >= 3 && !this.slowMoTriggered) {
        this.physics.setSlowMotion(0.3, 1500);
        this.slowMoTriggered = true;
      }
    };

    this.chainSystem.onBlockDestroyed = (block) => {
      this._onBlockDestroyed(block);
    };

    // Physics collision callback
    this.physics.onCollision = (bodyA, bodyB, speed) => {
      if (speed < 1.5) return;

      const blockA = bodyA.gameBlock;
      const blockB = bodyB.gameBlock;

      // Collision damage
      if (blockA && !blockA.destroyed) {
        const dmg = speed * 3;
        if (blockA.takeDamage(dmg)) {
          this._onBlockDestroyed(blockA);
        }
      }
      if (blockB && !blockB.destroyed) {
        const dmg = speed * 3;
        if (blockB.takeDamage(dmg)) {
          this._onBlockDestroyed(blockB);
        }
      }

      // Impact particles
      const midX = (bodyA.position.x + bodyB.position.x) / 2;
      const midY = (bodyA.position.y + bodyB.position.y) / 2;
      if (speed > 3) {
        const mat = blockA?.material?.id || blockB?.material?.id || 'wood';
        this.particles.emitDestruction(midX, midY, mat);
        this.audio.playDestroy(mat, Math.min(speed / 10, 1));
        this.audio.vibrateImpact(Math.min(speed / 10, 1));
        this.renderer.shakeCamera(Math.min(speed * 0.3, 3));
      }
    };
  }

  _setupInput() {
    this.input.onTap((pos) => {
      if (this.state !== 'playing' && this.state !== 'sandbox') return;
      this.audio.init();

      const worldPos = this.renderer.screenToWorld(pos.x, pos.y);
      const tool = this.toolManager.getTool();

      if (!tool || !this.toolManager.canUse()) return;
      if (tool.gesture !== 'tap') return;

      this.toolManager.use();
      this.scoring.recordInput();
      this._applyTool(tool, worldPos);
    });

    this.input.onSwipe((start, end, info) => {
      if (this.state !== 'playing' && this.state !== 'sandbox') return;
      this.audio.init();

      const tool = this.toolManager.getTool();
      if (!tool || tool.gesture !== 'swipe' || !this.toolManager.canUse()) return;

      this.toolManager.use();
      this.scoring.recordInput();

      const worldStart = this.renderer.screenToWorld(start.x, start.y);
      const worldEnd = this.renderer.screenToWorld(end.x, end.y);
      this._applyLaser(worldStart, worldEnd, tool);
    });

    this.input.onLongPress((pos) => {
      if (this.state !== 'playing' && this.state !== 'sandbox') return;
      this.audio.init();

      const tool = this.toolManager.getTool();
      if (!tool) return;

      // Long press = charged explosion regardless of tool
      const worldPos = this.renderer.screenToWorld(pos.x, pos.y);
      this.toolManager.use();
      this.scoring.recordInput();
      this._applyChargedExplosion(worldPos);
    });

    this.input.onDrag((start, current, delta) => {
      // Tool switching via horizontal swipe on tool bar area
      if (this.state !== 'playing' && this.state !== 'sandbox') return;
      // Camera panning could go here
    });

    this.input.pinchCallback = (scale) => {
      this.renderer.camera.targetZoom = Math.max(0.3, Math.min(3, this.renderer.camera.targetZoom * scale));
    };
  }

  _applyTool(tool, pos) {
    this.audio.playTap();

    if (tool.special === 'ignite') {
      // Fireball: ignite nearby wood blocks
      const radius = tool.radius;
      let ignited = false;
      for (const block of this.blocks) {
        if (block.destroyed) continue;
        const dx = block.body.position.x - pos.x;
        const dy = block.body.position.y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < radius) {
          if (block.material.flammable) {
            block.ignite();
            ignited = true;
          }
          block.takeDamage(tool.damage * (1 - dist / radius));
        }
      }
      // Fire particles
      this.particles.emitExplosion(pos.x, pos.y, ['#FF6F00', '#FF1744', '#FFD600'], 0.8);
      this.audio.playExplosion(0.6);
      this.renderer.shakeCamera(2);
      this.audio.vibrateImpact(0.7);

      // Also apply physics force
      this.physics.applyExplosion(pos, tool.radius, tool.strength);
    } else {
      // Standard shockwave/bomb
      const affected = this.physics.applyExplosion(pos, tool.radius, tool.strength);
      this.particles.emitExplosion(pos.x, pos.y,
        ['#FF4081', '#FFD600', '#FFFFFF'], tool.strength / 0.015);
      this.audio.playExplosion(tool.strength / 0.015);
      this.renderer.shakeCamera(tool.strength * 200);
      this.audio.vibrateImpact(Math.min(tool.strength * 50, 1));

      // Direct damage to blocks in radius
      for (const block of this.blocks) {
        if (block.destroyed) continue;
        const dx = block.body.position.x - pos.x;
        const dy = block.body.position.y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < tool.radius) {
          const factor = 1 - dist / tool.radius;
          if (block.takeDamage(tool.damage * factor)) {
            this._onBlockDestroyed(block);
          }
        }
      }
    }
  }

  _applyLaser(start, end, tool) {
    // Draw laser line and damage blocks along the path
    this.laserLine = { start, end };
    this.laserFade = 20;

    const dir = Vector.normalise(Vector.sub(end, start));
    const len = Vector.magnitude(Vector.sub(end, start));

    for (const block of this.blocks) {
      if (block.destroyed) continue;
      // Point-to-line distance
      const bp = block.body.position;
      const t = Vector.dot(Vector.sub(bp, start), dir);
      if (t < 0 || t > len) continue;
      const closest = Vector.add(start, Vector.mult(dir, t));
      const dist = Vector.magnitude(Vector.sub(bp, closest));
      if (dist < tool.radius + Math.max(block.width, block.height) / 2) {
        if (block.takeDamage(tool.damage)) {
          this._onBlockDestroyed(block);
        }
      }
    }

    this.audio.playDestroy('glass', 0.8);
    this.renderer.shakeCamera(1.5);
  }

  _applyChargedExplosion(pos) {
    // Stronger explosion from long press
    const affected = this.physics.applyExplosion(pos, 130, 0.03);
    this.particles.emitExplosion(pos.x, pos.y,
      ['#FF1744', '#FFD600', '#FF4081', '#FFFFFF'], 1.5);
    this.audio.playExplosion(1.2);
    this.renderer.shakeCamera(5);
    this.audio.vibrateImpact(1.0);

    for (const block of this.blocks) {
      if (block.destroyed) continue;
      const dx = block.body.position.x - pos.x;
      const dy = block.body.position.y - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 130) {
        const factor = 1 - dist / 130;
        if (block.takeDamage(80 * factor)) {
          this._onBlockDestroyed(block);
        }
      }
    }

    // Auto slow-mo for charged explosion
    this.physics.setSlowMotion(0.2, 2000);
  }

  _onBlockDestroyed(block) {
    if (!block.destroyed) return;

    this.scoring.recordDestruction(block);
    this.particles.emitDestruction(
      block.body.position.x,
      block.body.position.y,
      block.material.id
    );
    this.audio.playDestroy(block.material.id, 0.8);

    // Remove physics body and replace with smaller fragments
    this._fragmentBlock(block);

    // Trigger chain reaction
    this.chainSystem.triggerChain(block);
  }

  _fragmentBlock(block) {
    const pos = block.body.position;
    const angle = block.body.angle;
    const vel = block.body.velocity;

    // Remove original body
    this.physics.removeBody(block.body);

    // Create 2-4 smaller fragment bodies
    const fragCount = 2 + Math.floor(Math.random() * 3);
    const fragW = block.width / 2;
    const fragH = block.height / 2;

    for (let i = 0; i < fragCount; i++) {
      const offsetX = (Math.random() - 0.5) * block.width * 0.5;
      const offsetY = (Math.random() - 0.5) * block.height * 0.5;
      const frag = Matter.Bodies.rectangle(
        pos.x + offsetX,
        pos.y + offsetY,
        fragW * (0.5 + Math.random() * 0.5),
        fragH * (0.5 + Math.random() * 0.5),
        {
          density: block.material.density * 0.5,
          restitution: block.material.restitution,
          friction: block.material.friction,
          angle: angle + (Math.random() - 0.5) * 0.5,
        }
      );

      // Inherit velocity + add explosion spread
      Body.setVelocity(frag, {
        x: vel.x + (Math.random() - 0.5) * 4,
        y: vel.y + (Math.random() - 0.5) * 4 - 2,
      });
      Body.setAngularVelocity(frag, (Math.random() - 0.5) * 0.3);

      // Mark fragment with material info for rendering
      frag._fragMaterial = block.material;
      frag._fragLife = 300; // frames until cleanup

      this.physics.addBody(frag);
    }
  }

  // === STATE MANAGEMENT ===

  showMainMenu() {
    this.state = 'menu';
    this.physics.clear();
    this.blocks = [];
    this.particles.clear();
    this.ui.showMainMenu();
  }

  showStageSelect() {
    this.state = 'stageSelect';
    this.physics.clear();
    this.blocks = [];
    this.particles.clear();
    this.ui.showStageSelect(this.save);
  }

  startLevel(levelId) {
    const level = getLevel(levelId);
    if (!level) return;

    this.state = 'playing';
    this.currentLevel = level;
    this.currentLevelId = levelId;
    this.destructionSettled = false;
    this.settleTimer = 0;
    this.slowMoTriggered = false;
    this.laserLine = null;
    this.laserFade = 0;

    // Reset systems
    this.physics.clear();
    this.blocks = [];
    this.particles.clear();
    this.scoring.reset();
    this.chainSystem.reset();
    this.physics.targetTimeScale = 1.0;
    this.physics.timeScale = 1.0;

    // Setup tools
    this.toolManager.setAvailable(level.tools);
    if (level.toolLimits) {
      this.toolManager.setLimits(level.toolLimits);
    } else {
      this.toolManager.clearLimits();
    }

    // Calculate ground position
    this.groundY = this.renderer.height * 0.75;
    const groundCenterX = this.renderer.width / 2;

    // Create ground
    const ground = Matter.Bodies.rectangle(
      groundCenterX, this.groundY + 30,
      this.renderer.width * 2, 60,
      { isStatic: true }
    );
    this.physics.addBody(ground);

    // Build structure
    const structureBlocks = level.blocks(groundCenterX, this.groundY - 10);
    for (const def of structureBlocks) {
      const block = createBlock(def.x, def.y, def.w, def.h, def.material);
      this.blocks.push(block);
      this.physics.addBody(block.body, block);
    }

    this.scoring.setTotalBlocks(this.blocks.length);

    // Reset camera
    this.renderer.camera.x = 0;
    this.renderer.camera.y = 0;
    this.renderer.camera.targetZoom = 1;

    // Show HUD
    this.ui.showGameHUD(level, this.toolManager);

    // Show tutorial if needed
    if (level.tutorial) {
      setTimeout(() => {
        this.ui.showTutorial(level.tutorial);
      }, 500);
    }

    // Start recording replay
    this.physics.startRecording();
  }

  startSandbox() {
    this.state = 'sandbox';
    this.currentLevelId = -1;
    this.physics.clear();
    this.blocks = [];
    this.particles.clear();
    this.scoring.reset();
    this.chainSystem.reset();

    // Unlimited tools
    this.toolManager.setAvailable(['shockwave', 'fireball', 'laser']);
    this.toolManager.clearLimits();

    this.groundY = this.renderer.height * 0.75;
    const gx = this.renderer.width / 2;

    // Ground
    const ground = Matter.Bodies.rectangle(gx, this.groundY + 30, this.renderer.width * 2, 60, { isStatic: true });
    this.physics.addBody(ground);

    // Generate a random fun structure
    this._generateSandboxStructure(gx, this.groundY - 10);

    this.scoring.setTotalBlocks(this.blocks.length);
    this.renderer.camera.x = 0;
    this.renderer.camera.y = 0;
    this.renderer.camera.targetZoom = 1;

    this.ui.showGameHUD({ name: '자유 파괴', id: -1 }, this.toolManager);
  }

  _generateSandboxStructure(gx, gy) {
    const materials = ['wood', 'ice', 'glass', 'wood', 'ice'];
    const type = Math.floor(Math.random() * 3);

    if (type === 0) {
      // Big tower
      for (let floor = 0; floor < 8; floor++) {
        const mat = materials[floor % materials.length];
        if (floor % 2 === 0) {
          const block = createBlock(gx, gy - floor * 28, 90, 25, mat);
          this.blocks.push(block);
          this.physics.addBody(block.body, block);
        } else {
          for (const ox of [-25, 25]) {
            const block = createBlock(gx + ox, gy - floor * 28, 20, 25, mat);
            this.blocks.push(block);
            this.physics.addBody(block.body, block);
          }
        }
      }
    } else if (type === 1) {
      // Pyramid
      for (let row = 0; row < 6; row++) {
        const count = 6 - row;
        const startX = gx - (count - 1) * 20;
        const mat = materials[row % materials.length];
        for (let c = 0; c < count; c++) {
          const block = createBlock(startX + c * 40, gy - row * 28, 35, 25, mat);
          this.blocks.push(block);
          this.physics.addBody(block.body, block);
        }
      }
    } else {
      // Castle
      for (const ox of [-80, 80]) {
        for (let f = 0; f < 5; f++) {
          const mat = f < 2 ? 'concrete' : materials[f % materials.length];
          const block = createBlock(gx + ox, gy - f * 28, 30, 25, mat);
          this.blocks.push(block);
          this.physics.addBody(block.body, block);
        }
      }
      // Bridge
      const bridge = createBlock(gx, gy - 3 * 28, 180, 15, 'wood');
      this.blocks.push(bridge);
      this.physics.addBody(bridge.body, bridge);
      // Top
      for (let c = 0; c < 4; c++) {
        const block = createBlock(gx - 45 + c * 30, gy - 4 * 28, 25, 20, 'ice');
        this.blocks.push(block);
        this.physics.addBody(block.body, block);
      }
    }
  }

  pause() {
    if (this.state !== 'playing' && this.state !== 'sandbox') return;
    this.state = 'paused';
    this.ui.showPause();
  }

  resume() {
    this.state = this.currentLevelId === -1 ? 'sandbox' : 'playing';
  }

  // === GAME LOOP ===

  update(delta) {
    if (this.state === 'playing' || this.state === 'sandbox') {
      this.physics.update(delta);
      this.chainSystem.update();
      this.particles.update();
      this.scoring.update();

      // Update burning blocks
      for (const block of this.blocks) {
        if (!block.destroyed) {
          const burnDestroyed = block.update(delta);
          if (burnDestroyed) {
            this._onBlockDestroyed(block);
          }
          // Fire particles for burning blocks
          if (block.burning && !block.destroyed) {
            if (Math.random() < 0.3) {
              this.particles.emitFire(block.body.position.x, block.body.position.y);
            }
          }
        }
      }

      // Cleanup old fragments
      const allBodies = this.physics.getAllBodies();
      for (const body of allBodies) {
        if (body._fragLife !== undefined) {
          body._fragLife--;
          if (body._fragLife <= 0 || body.position.y > this.groundY + 200) {
            this.physics.removeBody(body);
          }
        }
        // Remove bodies that fell off screen
        if (body.position.y > this.renderer.height + 200) {
          this.physics.removeBody(body);
        }
      }

      // Update UI
      const destroyedCount = this.blocks.filter(b => b.destroyed).length;
      const rate = this.blocks.length > 0 ? destroyedCount / this.blocks.length : 0;
      this.ui.updateHUD(rate, this.chainSystem.chainCount, this.toolManager);

      // Laser fade
      if (this.laserFade > 0) this.laserFade--;

      // Check if destruction has settled (for campaign mode)
      if (this.state === 'playing' && destroyedCount > 0) {
        const allSettled = allBodies.every(b =>
          b.isStatic || b.speed < 0.3
        );
        const noChains = !this.chainSystem.isActive;
        const noBurning = !this.blocks.some(b => b.burning && !b.destroyed);

        if (allSettled && noChains && noBurning) {
          this.settleTimer++;
          if (this.settleTimer > 90) { // ~1.5 seconds of calm
            this._finishLevel();
          }
        } else {
          this.settleTimer = 0;
        }
      }
    }
  }

  _finishLevel() {
    if (this.destructionSettled) return;
    this.destructionSettled = true;

    const result = this.scoring.calculateScore();

    // Save to local leaderboard
    {
      let userName = '나';
      try { const u = window.__sdk?.auth.getUser(); if (u) userName = u.name; } catch {}
      saveToDSLeaderboard({
        name: userName,
        totalScore: result.score,
        stars: result.stars || 0,
        stagesCleared: this.currentLevelId || 0,
        timestamp: Date.now(),
      });
    }

    // Submit score to SDK
    try {
      window.__sdk?.scores.submit({
        score: result.score,
        meta: {
          stageId: this.currentLevelId,
          destructionRate: result.destructionRate,
          chainCount: result.chainCount,
          perfectChain: result.perfectChain,
          stars: result.stars,
        },
      }).catch(() => {});
    } catch (_) {}

    // Save result
    if (this.currentLevelId > 0) {
      this.save.saveStageResult(this.currentLevelId, result);
      this.save.updateStats(result.destroyedBlocks || 0, result.chainCount, result.perfectChain);
    }

    // Play completion sounds
    if (result.perfectChain) {
      this.audio.playPerfectChain();
    } else if (result.stars > 0) {
      this.audio.playStar();
    }

    // Show results after brief delay
    setTimeout(() => {
      this.state = 'results';
      this.ui.showResults(result, this.currentLevel);
    }, 600);
  }

  render() {
    this.renderer.clear();
    this.renderer.beginCamera();

    // Draw ground
    this.renderer.drawGround(this.groundY, this.renderer.width * 3);

    // Draw blocks
    for (const block of this.blocks) {
      if (!block.destroyed) {
        this.renderer.drawBody(block.body, block.getColor(), block.material.id);

        // Health bar for damaged blocks
        if (block.health < block.maxHealth && block.health > 0) {
          const pos = block.body.position;
          const w = block.width;
          const healthPct = block.health / block.maxHealth;
          const ctx = this.renderer.ctx;
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(pos.x - w/2, pos.y - block.height/2 - 6, w, 3);
          ctx.fillStyle = healthPct > 0.5 ? '#4CAF50' : healthPct > 0.25 ? '#FF9800' : '#F44336';
          ctx.fillRect(pos.x - w/2, pos.y - block.height/2 - 6, w * healthPct, 3);
        }
      }
    }

    // Draw fragments
    const allBodies = this.physics.getAllBodies();
    for (const body of allBodies) {
      if (body._fragMaterial) {
        const alpha = Math.min(1, body._fragLife / 60);
        const ctx = this.renderer.ctx;
        ctx.save();
        ctx.globalAlpha = alpha;
        this.renderer.drawBody(body, body._fragMaterial.color, body._fragMaterial.id);
        ctx.restore();
      }
    }

    // Draw laser line - wider, more dramatic beam
    if (this.laserLine && this.laserFade > 0) {
      const ctx = this.renderer.ctx;
      const fadeAlpha = this.laserFade / 20;
      ctx.save();

      // Outer wide glow
      ctx.globalAlpha = fadeAlpha * 0.3;
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 18;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(this.laserLine.start.x, this.laserLine.start.y);
      ctx.lineTo(this.laserLine.end.x, this.laserLine.end.y);
      ctx.stroke();

      // Middle glow
      ctx.globalAlpha = fadeAlpha * 0.6;
      ctx.strokeStyle = '#40C4FF';
      ctx.lineWidth = 8;
      ctx.shadowColor = '#00E5FF';
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.moveTo(this.laserLine.start.x, this.laserLine.start.y);
      ctx.lineTo(this.laserLine.end.x, this.laserLine.end.y);
      ctx.stroke();

      // Bright core
      ctx.globalAlpha = fadeAlpha;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00E5FF';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(this.laserLine.start.x, this.laserLine.start.y);
      ctx.lineTo(this.laserLine.end.x, this.laserLine.end.y);
      ctx.stroke();

      ctx.restore();
    }

    // Draw tool cursor in world space
    if ((this.state === 'playing' || this.state === 'sandbox') && this.input.lastPointer) {
      const worldPos = this.renderer.screenToWorld(this.input.lastPointer.x, this.input.lastPointer.y);
      const toolId = this.toolManager.currentTool;
      this.renderer.drawToolCursor(toolId, worldPos.x, worldPos.y);
    }

    // Draw particles (in world space)
    this.particles.render(this.renderer.ctx);

    this.renderer.endCamera();

    // Draw slow-mo indicator
    if (this.physics.timeScale < 0.8) {
      const ctx = this.renderer.ctx;
      const alpha = (1 - this.physics.timeScale) * 0.5;
      ctx.save();
      ctx.fillStyle = `rgba(255,214,0,${alpha * 0.1})`;
      ctx.fillRect(0, 0, this.renderer.width, this.renderer.height);

      // Vignette effect during slow-mo
      const grad = ctx.createRadialGradient(
        this.renderer.width/2, this.renderer.height/2, this.renderer.height * 0.3,
        this.renderer.width/2, this.renderer.height/2, this.renderer.height * 0.7
      );
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(1, `rgba(0,0,0,${alpha * 0.4})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.renderer.width, this.renderer.height);

      // SLOW MO text
      this.renderer.drawText('SLOW MOTION', this.renderer.width / 2, 70, {
        font: "bold 14px 'Orbitron', monospace",
        color: `rgba(255,214,0,${alpha * 2})`,
        align: 'center',
        glow: true,
        glowColor: '#FFD600',
      });

      ctx.restore();
    }
  }

  // === INIT ===

  async init() {
    const fill = document.getElementById('loading-fill');
    if (fill) fill.style.width = '60%';

    await new Promise(r => setTimeout(r, 300));
    if (fill) fill.style.width = '100%';

    await new Promise(r => setTimeout(r, 400));

    // Hide loading screen
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
      setTimeout(() => loadingScreen.remove(), 500);
    }

    // Check if first launch
    if (!this.save.data.tutorialComplete) {
      this.state = 'onboarding';
      this.ui.showOnboarding(0, () => {
        this.save.completeOnboarding();
        this.showMainMenu();
      });
    } else {
      this.showMainMenu();
    }
  }
}
