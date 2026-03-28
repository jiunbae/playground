import Phaser from 'phaser';
import { TowerDef, CELL_SIZE, MAP_TOP } from '../config/GameConfig';
import { Enemy } from './Enemy';

export class Tower {
  scene: Phaser.Scene;
  def: TowerDef;
  gridX: number;
  gridY: number;
  level: number = 1;
  sprite: Phaser.GameObjects.Container;
  rangeCircle: Phaser.GameObjects.Arc | Phaser.GameObjects.Graphics;
  lastAttackTime: number = 0;
  goldTimer: number = 0;

  constructor(scene: Phaser.Scene, def: TowerDef, gridX: number, gridY: number) {
    this.scene = scene;
    this.def = def;
    this.gridX = gridX;
    this.gridY = gridY;

    const px = gridX * CELL_SIZE + CELL_SIZE / 2;
    const py = gridY * CELL_SIZE + MAP_TOP + CELL_SIZE / 2;

    // 타워 비주얼: distinctive shapes per tower type
    const towerGraphics = this.drawTowerShape(scene, def);

    const levelText = scene.add.text(CELL_SIZE * 0.25, -CELL_SIZE * 0.25, '1', {
      fontSize: '10px', color: '#ffffff',
      backgroundColor: '#00000066', padding: { x: 2, y: 1 },
    }).setOrigin(0.5);

    this.sprite = scene.add.container(px, py, [...towerGraphics, levelText]);
    this.sprite.setDepth(10);
    this.sprite.setSize(CELL_SIZE, CELL_SIZE);

    // 범위 표시 (기본 비활성) - dashed range circle
    const rangeRadius = def.range * CELL_SIZE;
    const rangeGfx = scene.add.graphics();
    rangeGfx.lineStyle(1.5, def.color, 0.4);
    const dashLen = 6;
    const gapLen = 4;
    const circumference = 2 * Math.PI * rangeRadius;
    const totalSegs = Math.floor(circumference / (dashLen + gapLen));
    for (let i = 0; i < totalSegs; i++) {
      const startAngle = (i * (dashLen + gapLen)) / rangeRadius;
      const endAngle = startAngle + dashLen / rangeRadius;
      rangeGfx.beginPath();
      rangeGfx.arc(px, py, rangeRadius, startAngle, endAngle, false);
      rangeGfx.strokePath();
    }
    // fill with translucent color
    rangeGfx.fillStyle(def.color, 0.06);
    rangeGfx.fillCircle(px, py, rangeRadius);
    rangeGfx.setDepth(5);
    rangeGfx.setVisible(false);
    this.rangeCircle = rangeGfx as any; // store as any for show/hide

    // 배치 애니메이션: 씨앗에서 자라남
    this.sprite.setScale(0);
    scene.tweens.add({
      targets: this.sprite,
      scaleX: 1, scaleY: 1,
      duration: 500,
      ease: 'Back.easeOut',
    });
  }

  private drawTowerShape(scene: Phaser.Scene, def: TowerDef): Phaser.GameObjects.GameObject[] {
    const gfx = scene.add.graphics();
    const r = CELL_SIZE * 0.38;
    const items: Phaser.GameObjects.GameObject[] = [];

    switch (def.id) {
      case 'light': {
        // Archer/light tower: small tower base + triangle arrow on top
        gfx.fillStyle(def.color, 0.9);
        // Tower base (trapezoid-like rectangle)
        gfx.fillRect(-r * 0.5, -r * 0.1, r * 1.0, r * 1.1);
        gfx.fillRect(-r * 0.35, -r * 0.5, r * 0.7, r * 0.5);
        // Battlements
        gfx.fillRect(-r * 0.45, -r * 0.65, r * 0.2, r * 0.2);
        gfx.fillRect(-r * 0.05, -r * 0.65, r * 0.2, r * 0.2);
        gfx.fillRect(r * 0.25, -r * 0.65, r * 0.2, r * 0.2);
        // Arrow (triangle) on top
        gfx.fillStyle(0xffffff, 0.9);
        gfx.fillTriangle(0, -r * 1.0, -r * 0.15, -r * 0.65, r * 0.15, -r * 0.65);
        gfx.lineStyle(1.5, 0xffffff, 0.5);
        gfx.strokeRect(-r * 0.5, -r * 0.1, r * 1.0, r * 1.1);
        items.push(gfx);
        break;
      }
      case 'dew': {
        // Ice/dew tower: hexagonal crystal with blue glow
        const glowCircle = scene.add.circle(0, 0, r + 4, 0x74b9ff, 0.15);
        items.push(glowCircle);
        // Hexagon
        gfx.fillStyle(def.color, 0.85);
        gfx.lineStyle(2, 0xffffff, 0.5);
        const hex: { x: number; y: number }[] = [];
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          hex.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
        }
        gfx.beginPath();
        gfx.moveTo(hex[0].x, hex[0].y);
        for (let i = 1; i < 6; i++) gfx.lineTo(hex[i].x, hex[i].y);
        gfx.closePath();
        gfx.fillPath();
        gfx.strokePath();
        // Inner crystal lines
        gfx.lineStyle(1, 0xffffff, 0.3);
        gfx.lineBetween(hex[0].x, hex[0].y, hex[3].x, hex[3].y);
        gfx.lineBetween(hex[1].x, hex[1].y, hex[4].x, hex[4].y);
        gfx.lineBetween(hex[2].x, hex[2].y, hex[5].x, hex[5].y);
        items.push(gfx);
        // Pulsing glow animation
        scene.tweens.add({
          targets: glowCircle, alpha: 0.3, duration: 1200,
          yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
        break;
      }
      case 'rainbow': {
        // Chain/lightning: coil zigzag shape
        gfx.fillStyle(def.color, 0.85);
        gfx.fillCircle(0, 0, r * 0.5);
        gfx.lineStyle(2.5, def.color, 0.9);
        // Zigzag coil
        const zigPoints = [
          { x: -r * 0.6, y: -r * 0.7 }, { x: r * 0.3, y: -r * 0.45 },
          { x: -r * 0.3, y: -r * 0.15 }, { x: r * 0.3, y: r * 0.15 },
          { x: -r * 0.3, y: r * 0.45 }, { x: r * 0.6, y: r * 0.7 },
        ];
        gfx.beginPath();
        gfx.moveTo(zigPoints[0].x, zigPoints[0].y);
        for (let i = 1; i < zigPoints.length; i++) gfx.lineTo(zigPoints[i].x, zigPoints[i].y);
        gfx.strokePath();
        gfx.lineStyle(1, 0xffffff, 0.4);
        gfx.strokeCircle(0, 0, r * 0.5);
        items.push(gfx);
        break;
      }
      case 'bell': {
        // Bell tower: bell shape
        gfx.fillStyle(def.color, 0.9);
        // Bell dome
        gfx.beginPath();
        gfx.arc(0, -r * 0.1, r * 0.55, Math.PI, 0, false);
        gfx.lineTo(r * 0.65, r * 0.5);
        gfx.lineTo(-r * 0.65, r * 0.5);
        gfx.closePath();
        gfx.fillPath();
        // Clapper
        gfx.fillCircle(0, r * 0.55, r * 0.12);
        // Handle on top
        gfx.lineStyle(2.5, def.color, 0.9);
        gfx.beginPath();
        gfx.arc(0, -r * 0.6, r * 0.15, Math.PI, 0, false);
        gfx.strokePath();
        gfx.lineStyle(1.5, 0xffffff, 0.4);
        gfx.strokeRoundedRect(-r * 0.65, -r * 0.7, r * 1.3, r * 1.3, 4);
        items.push(gfx);
        break;
      }
      case 'spring': {
        // Spring/fountain tower: water fountain shape
        gfx.fillStyle(def.color, 0.85);
        // Basin
        gfx.fillRect(-r * 0.6, r * 0.2, r * 1.2, r * 0.3);
        // Pillar
        gfx.fillRect(-r * 0.1, -r * 0.3, r * 0.2, r * 0.5);
        // Water arcs
        gfx.lineStyle(2, 0x74b9ff, 0.7);
        gfx.beginPath();
        gfx.arc(0, -r * 0.3, r * 0.3, Math.PI * 0.8, Math.PI * 0.2, false);
        gfx.strokePath();
        gfx.lineStyle(1.5, 0x74b9ff, 0.5);
        gfx.beginPath();
        gfx.arc(0, -r * 0.3, r * 0.5, Math.PI * 0.7, Math.PI * 0.3, false);
        gfx.strokePath();
        gfx.lineStyle(1, 0xffffff, 0.3);
        gfx.strokeRect(-r * 0.6, r * 0.2, r * 1.2, r * 0.3);
        items.push(gfx);
        // Gold coin icon
        const coinText = scene.add.text(0, -r * 0.05, '💰', { fontSize: '10px' }).setOrigin(0.5);
        items.push(coinText);
        break;
      }
      case 'fence': {
        // Flower fence: fence pickets with flowers
        gfx.fillStyle(def.color, 0.85);
        for (let i = -2; i <= 2; i++) {
          const fx = i * r * 0.3;
          gfx.fillRect(fx - 2, -r * 0.3, 4, r * 0.8);
        }
        // Horizontal bar
        gfx.fillRect(-r * 0.7, 0, r * 1.4, 3);
        gfx.fillRect(-r * 0.7, r * 0.3, r * 1.4, 3);
        // Little flowers on top
        gfx.fillStyle(0xff69b4, 0.8);
        gfx.fillCircle(-r * 0.3, -r * 0.45, 3);
        gfx.fillCircle(r * 0.3, -r * 0.5, 3);
        gfx.fillStyle(0xffeb3b, 0.8);
        gfx.fillCircle(0, -r * 0.4, 2.5);
        items.push(gfx);
        break;
      }
      case 'lighthouse': {
        // Lighthouse: tall tower with light beam
        gfx.fillStyle(def.color, 0.9);
        // Tower body (tapered)
        gfx.fillTriangle(-r * 0.35, r * 0.6, r * 0.35, r * 0.6, 0, -r * 0.7);
        // Light housing at top
        gfx.fillStyle(0xffd93d, 0.9);
        gfx.fillCircle(0, -r * 0.55, r * 0.2);
        // Light beam glow
        const beamGlow = scene.add.circle(0, -r * 0.55, r * 0.35, 0xffd93d, 0.2);
        items.push(beamGlow);
        scene.tweens.add({
          targets: beamGlow, alpha: 0.4, scaleX: 1.3, scaleY: 1.3,
          duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
        // Stripes
        gfx.lineStyle(1.5, 0xffffff, 0.3);
        gfx.lineBetween(-r * 0.15, r * 0.2, r * 0.15, r * 0.2);
        gfx.lineBetween(-r * 0.22, r * 0.0, r * 0.22, r * 0.0);
        gfx.lineBetween(-r * 0.08, r * 0.4, r * 0.08, r * 0.4);
        items.push(gfx);
        break;
      }
      case 'musicbox': {
        // Music box: box shape with music notes
        gfx.fillStyle(def.color, 0.85);
        gfx.fillRoundedRect(-r * 0.55, -r * 0.35, r * 1.1, r * 0.9, 4);
        // Lid (slightly open)
        gfx.fillStyle(def.color, 0.7);
        gfx.fillRect(-r * 0.55, -r * 0.55, r * 1.1, r * 0.25);
        gfx.lineStyle(1.5, 0xffffff, 0.4);
        gfx.strokeRoundedRect(-r * 0.55, -r * 0.35, r * 1.1, r * 0.9, 4);
        items.push(gfx);
        // Music notes floating
        const note1 = scene.add.text(-r * 0.3, -r * 0.7, '♪', {
          fontSize: '10px', color: '#ffffff',
        }).setOrigin(0.5).setAlpha(0.6);
        const note2 = scene.add.text(r * 0.3, -r * 0.8, '♫', {
          fontSize: '10px', color: '#ffffff',
        }).setOrigin(0.5).setAlpha(0.4);
        items.push(note1, note2);
        scene.tweens.add({
          targets: note1, y: note1.y - 5, alpha: 0.8,
          duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
        scene.tweens.add({
          targets: note2, y: note2.y - 4, alpha: 0.7,
          duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 300,
        });
        break;
      }
      default: {
        // Fallback: simple circle
        const base = scene.add.circle(0, 0, CELL_SIZE * 0.4, def.color, 0.9);
        base.setStrokeStyle(2, 0xffffff, 0.6);
        items.push(base);
        const symbol = scene.add.text(0, 0, this.getSymbol(), {
          fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
        }).setOrigin(0.5);
        items.push(symbol);
        break;
      }
    }
    return items;
  }

  private getSymbol(): string {
    const symbols: Record<string, string> = {
      light: '☀', bell: '🔔', dew: '💧', spring: '⛲',
      rainbow: '🌈', fence: '🌿', lighthouse: '🏮', musicbox: '🎵',
    };
    return symbols[this.def.id] || '★';
  }

  getRange(): number {
    return this.def.range * (1 + (this.level - 1) * 0.2);
  }

  getDamage(): number {
    return this.def.damage * (1 + (this.level - 1) * 0.4);
  }

  getAttackSpeed(): number {
    return this.def.attackSpeed * (1 - (this.level - 1) * 0.1);
  }

  getUpgradeCost(): number {
    return Math.round(this.def.cost * 0.6 * this.level);
  }

  getSellValue(): number {
    return Math.round(this.def.cost * 0.5 * this.level);
  }

  canUpgrade(): boolean {
    return this.level < 3;
  }

  upgrade(): void {
    if (!this.canUpgrade()) return;
    this.level++;
    // 비주얼 업데이트
    const levelText = this.sprite.getAt(2) as Phaser.GameObjects.Text;
    levelText.setText(String(this.level));
    // 업그레이드 이펙트
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 1.3, scaleY: 1.3,
      duration: 150, yoyo: true,
      ease: 'Quad.easeOut',
    });
    // 범위 업데이트 - redraw dashed circle
    this.redrawRange();
  }

  private redrawRange(): void {
    const wasVisible = this.rangeCircle.visible;
    this.rangeCircle.destroy();
    const px = this.gridX * CELL_SIZE + CELL_SIZE / 2;
    const py = this.gridY * CELL_SIZE + MAP_TOP + CELL_SIZE / 2;
    const rangeRadius = this.getRange() * CELL_SIZE;
    const rangeGfx = this.scene.add.graphics();
    rangeGfx.lineStyle(1.5, this.def.color, 0.4);
    const dashLen = 6;
    const gapLen = 4;
    const circumference = 2 * Math.PI * rangeRadius;
    const totalSegs = Math.floor(circumference / (dashLen + gapLen));
    for (let i = 0; i < totalSegs; i++) {
      const startAngle = (i * (dashLen + gapLen)) / rangeRadius;
      const endAngle = startAngle + dashLen / rangeRadius;
      rangeGfx.beginPath();
      rangeGfx.arc(px, py, rangeRadius, startAngle, endAngle, false);
      rangeGfx.strokePath();
    }
    rangeGfx.fillStyle(this.def.color, 0.06);
    rangeGfx.fillCircle(px, py, rangeRadius);
    rangeGfx.setDepth(5);
    rangeGfx.setVisible(wasVisible);
    this.rangeCircle = rangeGfx as any;
  }

  showRange(show: boolean): void {
    this.rangeCircle.setVisible(show);
  }

  update(time: number, delta: number, enemies: Enemy[]): Enemy | null {
    // 샘물 탑: 골드 생성
    if (this.def.id === 'spring') {
      this.goldTimer += delta;
      if (this.goldTimer >= 5000 / this.level) {
        this.goldTimer = 0;
        return null; // GameScene에서 골드 추가 처리
      }
      return null;
    }

    // 꽃 울타리: 패시브
    if (this.def.id === 'fence') return null;

    // 공격 쿨다운
    if (time - this.lastAttackTime < this.getAttackSpeed()) return null;

    // 범위 내 적 찾기
    const range = this.getRange() * CELL_SIZE;
    const px = this.gridX * CELL_SIZE + CELL_SIZE / 2;
    const py = this.gridY * CELL_SIZE + MAP_TOP + CELL_SIZE / 2;

    let target: Enemy | null = null;
    let minDist = Infinity;

    for (const enemy of enemies) {
      if (enemy.isDead) continue;
      const dist = Phaser.Math.Distance.Between(px, py, enemy.x, enemy.y);
      if (dist <= range && dist < minDist) {
        minDist = dist;
        target = enemy;
      }
    }

    if (target) {
      this.lastAttackTime = time;
      this.attack(target, enemies);
      return target;
    }

    return null;
  }

  private attack(target: Enemy, allEnemies: Enemy[]): void {
    const px = this.gridX * CELL_SIZE + CELL_SIZE / 2;
    const py = this.gridY * CELL_SIZE + MAP_TOP + CELL_SIZE / 2;
    const damage = this.getDamage();

    // 탄환 이펙트 - enhanced projectiles with trails
    const bulletContainer = this.scene.add.container(px, py);
    bulletContainer.setDepth(15);

    if (this.def.id === 'dew') {
      // Ice projectile: blue diamond with sparkle
      const iceGfx = this.scene.add.graphics();
      iceGfx.fillStyle(0x74b9ff, 0.9);
      iceGfx.fillTriangle(0, -5, -4, 0, 0, 5);
      iceGfx.fillTriangle(0, -5, 4, 0, 0, 5);
      iceGfx.fillStyle(0xffffff, 0.6);
      iceGfx.fillCircle(-1, -1, 1.5);
      bulletContainer.add(iceGfx);
      // Sparkle trail
      const sparkleTimer = this.scene.time.addEvent({
        delay: 40, repeat: 4, callback: () => {
          const sparkle = this.scene.add.circle(bulletContainer.x, bulletContainer.y, 2, 0x74b9ff, 0.6);
          sparkle.setDepth(14);
          this.scene.tweens.add({ targets: sparkle, alpha: 0, scaleX: 0, scaleY: 0, duration: 200, onComplete: () => sparkle.destroy() });
        },
      });
      bulletContainer.setData('sparkleTimer', sparkleTimer);
    } else if (this.def.id === 'rainbow') {
      // Lightning/chain projectile: zigzag bolt
      const boltGfx = this.scene.add.graphics();
      boltGfx.lineStyle(2, this.def.color, 0.9);
      boltGfx.beginPath();
      boltGfx.moveTo(-4, -3);
      boltGfx.lineTo(1, -1);
      boltGfx.lineTo(-2, 1);
      boltGfx.lineTo(4, 3);
      boltGfx.strokePath();
      boltGfx.fillStyle(0xffffff, 0.7);
      boltGfx.fillCircle(0, 0, 2);
      bulletContainer.add(boltGfx);
    } else {
      // Default: glowing orb with trail
      const core = this.scene.add.circle(0, 0, 3.5, this.def.color, 0.95);
      const glow = this.scene.add.circle(0, 0, 6, this.def.color, 0.25);
      bulletContainer.add([glow, core]);
      // Trail particles
      const trailTimer = this.scene.time.addEvent({
        delay: 35, repeat: 5, callback: () => {
          const trail = this.scene.add.circle(bulletContainer.x, bulletContainer.y, 2, this.def.color, 0.4);
          trail.setDepth(14);
          this.scene.tweens.add({ targets: trail, alpha: 0, scaleX: 0, scaleY: 0, duration: 150, onComplete: () => trail.destroy() });
        },
      });
      bulletContainer.setData('trailTimer', trailTimer);
    }

    this.scene.tweens.add({
      targets: bulletContainer,
      x: target.x, y: target.y,
      duration: 200,
      onComplete: () => {
        const st = bulletContainer.getData('sparkleTimer') as Phaser.Time.TimerEvent;
        if (st) st.destroy();
        const tt = bulletContainer.getData('trailTimer') as Phaser.Time.TimerEvent;
        if (tt) tt.destroy();
        bulletContainer.destroy();

        if (this.def.id === 'bell' || this.def.id === 'musicbox') {
          // 범위 공격
          const splashRange = CELL_SIZE * 1.5;
          for (const e of allEnemies) {
            if (!e.isDead && Phaser.Math.Distance.Between(target.x, target.y, e.x, e.y) <= splashRange) {
              e.takeDamage(damage);
            }
          }
          // 범위 이펙트
          const splash = this.scene.add.circle(target.x, target.y, splashRange, this.def.color, 0.3);
          splash.setDepth(14);
          this.scene.tweens.add({
            targets: splash, alpha: 0, scaleX: 1.5, scaleY: 1.5,
            duration: 300, onComplete: () => splash.destroy(),
          });
        } else if (this.def.id === 'rainbow') {
          // 연쇄 공격
          target.takeDamage(damage);
          let prev = target;
          let chainCount = 0;
          for (const e of allEnemies) {
            if (chainCount >= 2) break;
            if (!e.isDead && e !== target && Phaser.Math.Distance.Between(prev.x, prev.y, e.x, e.y) <= CELL_SIZE * 2) {
              e.takeDamage(damage * 0.6);
              // 체인 이펙트
              const line = this.scene.add.line(0, 0, prev.x, prev.y, e.x, e.y, this.def.color, 0.6);
              line.setOrigin(0).setDepth(14);
              this.scene.tweens.add({ targets: line, alpha: 0, duration: 300, onComplete: () => line.destroy() });
              prev = e;
              chainCount++;
            }
          }
        } else if (this.def.id === 'dew') {
          // 감속 효과
          target.takeDamage(damage);
          if (!target.isDead) target.applySlow(0.5, 2000);
        } else {
          target.takeDamage(damage);
        }
      },
    });
  }

  destroy(): void {
    this.sprite.destroy();
    this.rangeCircle.destroy();
  }
}
