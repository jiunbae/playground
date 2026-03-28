import Matter from 'matter-js';
import { getMaterial } from './Materials.js';

const { Bodies, Body } = Matter;

let blockIdCounter = 0;

export class Block {
  constructor(x, y, width, height, materialId, options = {}) {
    this.id = blockIdCounter++;
    this.material = getMaterial(materialId);
    this.width = width;
    this.height = height;
    this.health = this.material.health;
    this.maxHealth = this.material.health;
    this.destroyed = false;
    this.burning = false;
    this.burnTimer = 0;
    this.chainTriggered = false;
    this.damageFlash = 0;

    const angle = options.angle || 0;

    this.body = Bodies.rectangle(x, y, width, height, {
      density: this.material.density,
      restitution: this.material.restitution,
      friction: this.material.friction,
      angle,
      chamfer: materialId === 'jelly' ? { radius: 3 } : undefined,
    });

    // Store reference back to Block on the physics body
    this.body.gameBlock = this;
  }

  takeDamage(amount, source = null) {
    if (this.destroyed) return false;

    this.health -= amount;
    this.damageFlash = 8;

    if (this.health <= 0) {
      this.destroyed = true;
      return true;
    }
    return false;
  }

  ignite() {
    if (!this.material.flammable || this.burning || this.destroyed) return false;
    this.burning = true;
    this.burnTimer = 0;
    return true;
  }

  update(delta) {
    if (this.damageFlash > 0) this.damageFlash--;

    if (this.burning && !this.destroyed) {
      this.burnTimer += delta;
      this.health -= 0.5;
      if (this.health <= 0) {
        this.destroyed = true;
        return true; // signal destruction
      }
    }
    return false;
  }

  getColor() {
    if (this.damageFlash > 0) return '#FFFFFF';
    if (this.burning) {
      return this.burnTimer % 200 < 100 ? '#FF6F00' : '#FF1744';
    }

    // Show damage through color darkening
    const healthRatio = this.health / this.maxHealth;
    if (healthRatio < 0.3) return this._darken(this.material.color, 40);
    if (healthRatio < 0.6) return this._darken(this.material.color, 20);
    return this.material.color;
  }

  _darken(hex, amount) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - amount);
    const g = Math.max(0, ((num >> 8) & 0xFF) - amount);
    const b = Math.max(0, (num & 0xFF) - amount);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }
}

export function createBlock(x, y, w, h, materialId, opts) {
  return new Block(x, y, w, h, materialId, opts);
}
