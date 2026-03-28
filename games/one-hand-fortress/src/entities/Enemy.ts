import Phaser from 'phaser';
import { EnemyDef, CELL_SIZE, MAP_TOP, COLORS } from '../config/GameConfig';

export class Enemy {
  scene: Phaser.Scene;
  def: EnemyDef;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  speed: number;
  baseSpeed: number;
  isDead: boolean = false;
  reachedVillage: boolean = false;

  private path: { x: number; y: number }[];
  private pathIndex: number = 0;
  private sprite: Phaser.GameObjects.Container;
  private healthBar: Phaser.GameObjects.Rectangle;
  private healthBarBg: Phaser.GameObjects.Rectangle;
  private slowTimer: number = 0;

  constructor(scene: Phaser.Scene, def: EnemyDef, path: { x: number; y: number }[]) {
    this.scene = scene;
    this.def = def;
    this.health = def.health;
    this.maxHealth = def.health;
    this.speed = def.speed;
    this.baseSpeed = def.speed;
    this.path = path;

    // 시작 위치
    const start = path[0];
    this.x = start.x * CELL_SIZE + CELL_SIZE / 2;
    this.y = start.y * CELL_SIZE + MAP_TOP + CELL_SIZE / 2;

    // 비주얼 - enhanced enemy shapes
    const bodySize = this.def.id === 'boss' ? CELL_SIZE * 0.45 : CELL_SIZE * 0.3;

    if (def.id === 'moth') {
      // Moth: body + animated flapping wings
      const body = scene.add.circle(0, 0, bodySize * 0.7, def.color, 0.9);
      body.setStrokeStyle(1, 0xffffff, 0.3);
      // Eyes
      const eye1 = scene.add.circle(-3, -3, 1.5, 0xffffff, 0.9);
      const eye2 = scene.add.circle(3, -3, 1.5, 0xffffff, 0.9);
      // Wings with flapping animation
      const wing1 = scene.add.ellipse(-8, -2, 12, 7, def.color, 0.5).setAngle(-20);
      const wing2 = scene.add.ellipse(8, -2, 12, 7, def.color, 0.5).setAngle(20);
      // Wing veins
      const wingGfx = scene.add.graphics();
      wingGfx.lineStyle(0.5, 0xffffff, 0.2);
      wingGfx.lineBetween(-5, -3, -12, -5);
      wingGfx.lineBetween(-5, -1, -11, 0);
      wingGfx.lineBetween(5, -3, 12, -5);
      wingGfx.lineBetween(5, -1, 11, 0);
      this.sprite = scene.add.container(this.x, this.y, [wing1, wing2, wingGfx, body, eye1, eye2]);
      // Flapping animation
      scene.tweens.add({
        targets: wing1, scaleY: 0.4, angle: -35,
        duration: 150, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      scene.tweens.add({
        targets: wing2, scaleY: 0.4, angle: 35,
        duration: 150, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    } else if (def.id === 'shadow' || def.id === 'frost') {
      // Crawler: segmented body
      const segments: Phaser.GameObjects.Arc[] = [];
      const segCount = 4;
      for (let i = segCount - 1; i >= 0; i--) {
        const segSize = bodySize * (1 - i * 0.15);
        const segAlpha = 0.6 + (segCount - i) * 0.08;
        const seg = scene.add.circle(i * 4, i * 1.5, segSize, def.color, segAlpha);
        seg.setStrokeStyle(0.8, 0xffffff, 0.2);
        segments.push(seg);
      }
      // Head segment eyes
      const headEye1 = scene.add.circle(-bodySize * 0.3, -bodySize * 0.3, 1.5, 0xffffff, 0.8);
      const headEye2 = scene.add.circle(bodySize * 0.3, -bodySize * 0.3, 1.5, 0xffffff, 0.8);
      this.sprite = scene.add.container(this.x, this.y, [...segments, headEye1, headEye2]);
      // Crawling animation (segments undulate)
      segments.forEach((seg, idx) => {
        scene.tweens.add({
          targets: seg, y: seg.y + 1.5,
          duration: 300, yoyo: true, repeat: -1,
          ease: 'Sine.easeInOut', delay: idx * 80,
        });
      });
    } else if (def.id === 'boss') {
      // Boss: large body + pulsing aura with multiple rings
      const auraOuter = scene.add.circle(0, 0, bodySize + 12, def.color, 0.08);
      const auraMid = scene.add.circle(0, 0, bodySize + 7, def.color, 0.15);
      const auraInner = scene.add.circle(0, 0, bodySize + 3, def.color, 0.25);
      const body = scene.add.circle(0, 0, bodySize, def.color, 0.9);
      body.setStrokeStyle(2, 0xffffff, 0.5);
      // Boss face
      const eye1 = scene.add.circle(-bodySize * 0.3, -bodySize * 0.15, 3, 0xff4444, 0.9);
      const eye2 = scene.add.circle(bodySize * 0.3, -bodySize * 0.15, 3, 0xff4444, 0.9);
      const mouth = scene.add.graphics();
      mouth.lineStyle(1.5, 0xff4444, 0.6);
      mouth.beginPath();
      mouth.arc(0, bodySize * 0.15, bodySize * 0.25, 0.2, Math.PI - 0.2, false);
      mouth.strokePath();
      this.sprite = scene.add.container(this.x, this.y, [auraOuter, auraMid, auraInner, body, eye1, eye2, mouth]);
      // Pulsing aura animation
      scene.tweens.add({
        targets: auraOuter, scaleX: 1.3, scaleY: 1.3, alpha: 0.02,
        duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      scene.tweens.add({
        targets: auraMid, scaleX: 1.15, scaleY: 1.15, alpha: 0.08,
        duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 200,
      });
      scene.tweens.add({
        targets: auraInner, scaleX: 1.08, scaleY: 1.08, alpha: 0.15,
        duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 400,
      });
    } else if (def.id === 'fog') {
      // Fog: amorphous cloud shape
      const cloud1 = scene.add.circle(-4, 2, bodySize * 0.7, def.color, 0.6);
      const cloud2 = scene.add.circle(4, 0, bodySize * 0.8, def.color, 0.5);
      const cloud3 = scene.add.circle(0, -3, bodySize * 0.75, def.color, 0.7);
      const body = scene.add.circle(0, 0, bodySize * 0.6, def.color, 0.85);
      // Wispy eyes
      const eye1 = scene.add.circle(-3, -2, 1.5, 0xffffff, 0.6);
      const eye2 = scene.add.circle(3, -2, 1.5, 0xffffff, 0.6);
      this.sprite = scene.add.container(this.x, this.y, [cloud1, cloud2, cloud3, body, eye1, eye2]);
      // Drifting cloud animation
      scene.tweens.add({ targets: cloud1, x: cloud1.x - 2, y: cloud1.y + 1, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      scene.tweens.add({ targets: cloud2, x: cloud2.x + 2, y: cloud2.y - 1, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 300 });
    } else {
      // Wind and others: default with small details
      const body = scene.add.circle(0, 0, bodySize, def.color, 0.85);
      body.setStrokeStyle(1.5, 0xffffff, 0.4);
      const eye1 = scene.add.circle(-bodySize * 0.3, -bodySize * 0.2, 1.5, 0xffffff, 0.7);
      const eye2 = scene.add.circle(bodySize * 0.3, -bodySize * 0.2, 1.5, 0xffffff, 0.7);
      this.sprite = scene.add.container(this.x, this.y, [body, eye1, eye2]);
    }

    // 체력바
    const barWidth = CELL_SIZE * 0.7;
    this.healthBarBg = scene.add.rectangle(0, -bodySize - 6, barWidth, 4, 0x000000, 0.4);
    this.healthBar = scene.add.rectangle(0, -bodySize - 6, barWidth, 4, 0x4caf50, 0.9);
    this.healthBar.setOrigin(0, 0.5);
    this.healthBar.x = -barWidth / 2;
    this.sprite.add([this.healthBarBg, this.healthBar]);

    this.sprite.setDepth(8);

    // 등장 애니메이션
    this.sprite.setAlpha(0);
    scene.tweens.add({ targets: this.sprite, alpha: 1, duration: 300 });
  }

  takeDamage(damage: number): void {
    if (this.isDead) return;
    this.health -= damage;

    // 체력바 업데이트
    const ratio = Math.max(0, this.health / this.maxHealth);
    const barWidth = CELL_SIZE * 0.7;
    this.healthBar.width = barWidth * ratio;

    // 색상 변화
    if (ratio < 0.3) {
      this.healthBar.setFillStyle(0xf44336);
    } else if (ratio < 0.6) {
      this.healthBar.setFillStyle(0xff9800);
    }

    // 피격 이펙트
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.5, duration: 50, yoyo: true,
    });

    if (this.health <= 0) {
      this.die();
    }
  }

  applySlow(factor: number, duration: number): void {
    this.speed = this.baseSpeed * factor;
    this.slowTimer = duration;
    // 감속 비주얼
    try {
      const body = this.sprite?.getAt(0) as Phaser.GameObjects.Arc | undefined;
      if (body && typeof body.setStrokeStyle === 'function') {
        body.setStrokeStyle(2, 0x74b9ff, 0.8);
      }
    } catch { /* sprite may have been destroyed */ }
  }

  private die(): void {
    this.isDead = true;
    // 빛 입자로 흩어지는 이펙트
    const baseColor = Phaser.Display.Color.IntegerToColor(this.def.color);
    const white = Phaser.Display.Color.IntegerToColor(0xffffff);
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const interp = Phaser.Display.Color.Interpolate.ColorWithColor(baseColor, white, 100, 50);
      const particleColor = Phaser.Display.Color.GetColor(
        Math.round(interp.r), Math.round(interp.g), Math.round(interp.b)
      );
      const particle = this.scene.add.circle(this.x, this.y, 3, particleColor, 0.8);
      particle.setDepth(12);
      this.scene.tweens.add({
        targets: particle,
        x: this.x + Math.cos(angle) * 20,
        y: this.y + Math.sin(angle) * 20,
        alpha: 0, scaleX: 0, scaleY: 0,
        duration: 400,
        ease: 'Quad.easeOut',
        onComplete: () => particle.destroy(),
      });
    }
    this.sprite.destroy();
  }

  update(delta: number): void {
    if (this.isDead || this.reachedVillage) return;

    // 감속 타이머
    if (this.slowTimer > 0) {
      this.slowTimer -= delta;
      if (this.slowTimer <= 0) {
        this.speed = this.baseSpeed;
      }
    }

    // 경로 따라 이동
    if (this.pathIndex >= this.path.length - 1) {
      this.reachedVillage = true;
      this.sprite.destroy();
      return;
    }

    const target = this.path[this.pathIndex + 1];
    const tx = target.x * CELL_SIZE + CELL_SIZE / 2;
    const ty = target.y * CELL_SIZE + MAP_TOP + CELL_SIZE / 2;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, tx, ty);
    const moveSpeed = this.speed * CELL_SIZE * (delta / 1000);

    if (dist <= moveSpeed) {
      this.x = tx;
      this.y = ty;
      this.pathIndex++;
    } else {
      const angle = Math.atan2(ty - this.y, tx - this.x);
      this.x += Math.cos(angle) * moveSpeed;
      this.y += Math.sin(angle) * moveSpeed;
    }

    this.sprite.setPosition(this.x, this.y);

    // 떠다니는 움직임 (부드러운 바운스)
    if (this.def.id === 'fog' || this.def.id === 'moth') {
      const wobble = Math.sin(Date.now() * 0.003) * 2;
      this.sprite.y = this.y + wobble;
    }
  }

  destroy(): void {
    if (!this.isDead) {
      this.sprite?.destroy();
    }
  }
}
