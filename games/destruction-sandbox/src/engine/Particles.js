export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.maxParticles = 2000;
  }

  emit(x, y, options = {}) {
    const {
      count = 10,
      color = '#FFD600',
      colors = null,
      speedMin = 1,
      speedMax = 5,
      sizeMin = 2,
      sizeMax = 6,
      life = 60,
      gravity = 0.05,
      spread = Math.PI * 2,
      angle = -Math.PI / 2,
      shape = 'rect', // 'rect', 'circle', 'spark'
      friction = 0.98,
      fadeOut = true,
    } = options;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const a = angle + (Math.random() - 0.5) * spread;
      const speed = speedMin + Math.random() * (speedMax - speedMin);
      const c = colors ? colors[Math.floor(Math.random() * colors.length)] : color;

      this.particles.push({
        x, y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        size: sizeMin + Math.random() * (sizeMax - sizeMin),
        color: c,
        life,
        maxLife: life,
        gravity,
        shape,
        friction,
        fadeOut,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
      });
    }
  }

  emitExplosion(x, y, materialColors, intensity = 1.0) {
    // Bright flash circle at explosion center
    this.emit(x, y, {
      count: 1,
      color: '#FFFFFF',
      speedMin: 0,
      speedMax: 0,
      sizeMin: 30 * intensity,
      sizeMax: 50 * intensity,
      life: 8,
      gravity: 0,
      shape: 'flash',
      friction: 1,
      fadeOut: true,
    });

    // Main debris
    this.emit(x, y, {
      count: Math.floor(30 * intensity),
      colors: materialColors,
      speedMin: 2,
      speedMax: 8 * intensity,
      sizeMin: 2,
      sizeMax: 8,
      life: 80,
      gravity: 0.08,
      shape: 'rect',
    });
    // Spark trail
    this.emit(x, y, {
      count: Math.floor(15 * intensity),
      color: '#FFD600',
      speedMin: 3,
      speedMax: 10 * intensity,
      sizeMin: 1,
      sizeMax: 3,
      life: 40,
      gravity: 0.02,
      shape: 'spark',
    });
    // Dust cloud
    this.emit(x, y, {
      count: Math.floor(10 * intensity),
      colors: ['#8D6E63', '#A1887F', '#BCAAA4', '#D7CCC8'],
      speedMin: 0.5,
      speedMax: 3 * intensity,
      sizeMin: 4,
      sizeMax: 12,
      life: 60,
      gravity: 0.01,
      shape: 'circle',
      friction: 0.96,
      fadeOut: true,
      spread: Math.PI * 2,
    });
    // Smoke after explosion
    this.emit(x, y, {
      count: Math.floor(8 * intensity),
      colors: ['#616161', '#757575', '#9E9E9E', '#BDBDBD'],
      speedMin: 0.2,
      speedMax: 1.2,
      sizeMin: 6,
      sizeMax: 18,
      life: 100,
      gravity: -0.03,
      shape: 'circle',
      friction: 0.97,
      fadeOut: true,
      spread: Math.PI * 0.8,
      angle: -Math.PI / 2,
    });
  }

  emitDestruction(x, y, materialType) {
    const configs = {
      wood: {
        colors: ['#8D6E63', '#A1887F', '#6D4C41', '#FF6F00'],
        count: 20, sizeMax: 6,
      },
      ice: {
        colors: ['#4FC3F7', '#B3E5FC', '#FFFFFF', '#80DEEA'],
        count: 25, sizeMax: 5, shape: 'circle',
      },
      glass: {
        colors: ['#80DEEA', '#E0F7FA', '#FFFFFF', '#B2EBF2'],
        count: 30, sizeMax: 4, shape: 'spark',
      },
      metal: {
        colors: ['#90A4AE', '#CFD8DC', '#FFD600', '#78909C'],
        count: 15, sizeMax: 5,
      },
      concrete: {
        colors: ['#9E9E9E', '#BDBDBD', '#757575', '#795548'],
        count: 20, sizeMax: 7, gravity: 0.12,
      },
      jelly: {
        colors: ['#E91E63', '#F48FB1', '#FF80AB', '#FCE4EC'],
        count: 20, sizeMax: 5, shape: 'circle',
      },
      sand: {
        colors: ['#FFD54F', '#FFE082', '#FFC107', '#FFAB00'],
        count: 25, sizeMax: 3, gravity: 0.15,
      },
    };

    const cfg = configs[materialType] || configs.wood;
    this.emit(x, y, {
      ...cfg,
      speedMin: 1,
      speedMax: 6,
      life: 70,
    });
  }

  emitChainLink(x, y) {
    this.emit(x, y, {
      count: 8,
      colors: ['#FFD600', '#FF6F00', '#FF1744'],
      speedMin: 1,
      speedMax: 4,
      sizeMin: 2,
      sizeMax: 5,
      life: 30,
      gravity: -0.02,
      shape: 'spark',
    });
  }

  emitFire(x, y) {
    // Main fire particles (larger, with glow)
    this.emit(x, y, {
      count: 4,
      colors: ['#FF6F00', '#FF8F00', '#FFD600', '#FFAB00'],
      speedMin: 0.5,
      speedMax: 2.5,
      sizeMin: 5,
      sizeMax: 12,
      life: 30,
      gravity: -0.1,
      shape: 'fire',
      spread: Math.PI * 0.5,
      angle: -Math.PI / 2,
      friction: 0.97,
    });
    // Inner hot core
    this.emit(x, y, {
      count: 2,
      colors: ['#FFFF00', '#FFF176', '#FFFFFF'],
      speedMin: 0.3,
      speedMax: 1.5,
      sizeMin: 3,
      sizeMax: 6,
      life: 18,
      gravity: -0.12,
      shape: 'circle',
      spread: Math.PI * 0.3,
      angle: -Math.PI / 2,
      friction: 0.96,
    });
    // Smoke above fire
    if (Math.random() < 0.3) {
      this.emit(x, y - 10, {
        count: 1,
        colors: ['#616161', '#757575'],
        speedMin: 0.2,
        speedMax: 0.8,
        sizeMin: 4,
        sizeMax: 8,
        life: 40,
        gravity: -0.04,
        shape: 'circle',
        spread: Math.PI * 0.3,
        angle: -Math.PI / 2,
        friction: 0.98,
      });
    }
  }

  emitStar(x, y) {
    this.emit(x, y, {
      count: 15,
      colors: ['#FFD600', '#FFF176', '#FFFFFF'],
      speedMin: 1,
      speedMax: 5,
      sizeMin: 2,
      sizeMax: 4,
      life: 50,
      gravity: 0.02,
      shape: 'spark',
    });
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vx *= p.friction;
      p.vy *= p.friction;
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotSpeed;
      p.life--;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx) {
    for (const p of this.particles) {
      const alpha = p.fadeOut ? (p.life / p.maxLife) : 1;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      switch (p.shape) {
        case 'circle':
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'spark':
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(-p.size, 0);
          ctx.lineTo(0, -p.size * 0.3);
          ctx.lineTo(p.size, 0);
          ctx.lineTo(0, p.size * 0.3);
          ctx.closePath();
          ctx.fill();
          break;
        case 'flash': {
          // Bright explosion flash circle with radial gradient
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
          grad.addColorStop(0, 'rgba(255,255,255,0.9)');
          grad.addColorStop(0.3, 'rgba(255,235,59,0.6)');
          grad.addColorStop(0.7, 'rgba(255,152,0,0.2)');
          grad.addColorStop(1, 'rgba(255,87,34,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'fire': {
          // Fire particle with glow: orange->yellow gradient circle
          const r = p.size / 2;
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
          grad.addColorStop(0, '#FFFF00');
          grad.addColorStop(0.4, p.color);
          grad.addColorStop(1, 'rgba(255,87,34,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();
          // Outer glow
          ctx.globalAlpha = alpha * 0.3;
          const glowGrad = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 2);
          glowGrad.addColorStop(0, p.color);
          glowGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(0, 0, r * 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        default: // rect
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          break;
      }

      ctx.restore();
    }
  }

  clear() {
    this.particles = [];
  }
}
