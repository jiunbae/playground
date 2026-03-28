export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = { x: 0, y: 0, zoom: 1, targetZoom: 1, shake: 0 };
    this.width = 0;
    this.height = 0;
    this.dpr = window.devicePixelRatio || 1;
    this.particles = [];
    this._time = 0; // animation timer
    this._stars = this._generateStars(80);

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  _generateStars(count) {
    const stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random() * 0.6,
        size: 0.5 + Math.random() * 1.5,
        twinkleSpeed: 0.02 + Math.random() * 0.04,
        twinkleOffset: Math.random() * Math.PI * 2,
      });
    }
    return stars;
  }

  resize() {
    this.dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  clear() {
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this._time += 0.016;

    // Sky gradient background
    const grad = this.ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, '#050a20');
    grad.addColorStop(0.3, '#0f1335');
    grad.addColorStop(0.7, '#1a237e');
    grad.addColorStop(1, '#283593');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw twinkling stars
    const ctx = this.ctx;
    for (const star of this._stars) {
      const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(this._time * star.twinkleSpeed * 60 + star.twinkleOffset));
      ctx.save();
      ctx.globalAlpha = twinkle;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(star.x * this.width, star.y * this.height, star.size, 0, Math.PI * 2);
      ctx.fill();
      // Subtle glow on brighter stars
      if (star.size > 1.2) {
        ctx.globalAlpha = twinkle * 0.15;
        ctx.beginPath();
        ctx.arc(star.x * this.width, star.y * this.height, star.size * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  beginCamera() {
    const ctx = this.ctx;
    ctx.save();

    // Camera shake
    let shakeX = 0, shakeY = 0;
    if (this.camera.shake > 0.01) {
      shakeX = (Math.random() - 0.5) * this.camera.shake * 10;
      shakeY = (Math.random() - 0.5) * this.camera.shake * 10;
      this.camera.shake *= 0.92;
    }

    // Smooth zoom
    this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 0.08;

    const cx = this.width / 2;
    const cy = this.height / 2;
    ctx.translate(cx + shakeX, cy + shakeY);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-cx - this.camera.x, -cy - this.camera.y);
  }

  endCamera() {
    this.ctx.restore();
  }

  shakeCamera(intensity) {
    this.camera.shake = Math.max(this.camera.shake, intensity);
  }

  drawBody(body, color, materialType) {
    const ctx = this.ctx;
    const vertices = body.vertices;
    const cx = body.position.x;
    const cy = body.position.y;

    // Compute bounding info
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const v of vertices) {
      if (v.x < minX) minX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.x > maxX) maxX = v.x;
      if (v.y > maxY) maxY = v.y;
    }
    const bw = maxX - minX;
    const bh = maxY - minY;

    // --- Drop shadow beneath block ---
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(vertices[0].x + 3, vertices[0].y + 4);
    for (let i = 1; i < vertices.length; i++) {
      ctx.lineTo(vertices[i].x + 3, vertices[i].y + 4);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fill();
    ctx.restore();

    // --- Main body shape (clip for textures) ---
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
      ctx.lineTo(vertices[i].x, vertices[i].y);
    }
    ctx.closePath();
    ctx.clip();

    // Base fill
    if (materialType === 'glass') {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.35;
      ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = color;
      ctx.fill();
    }

    // Material-specific texture overlays
    if (materialType === 'wood') {
      // Horizontal grain lines
      ctx.strokeStyle = this._darken(color, 25);
      ctx.lineWidth = 0.8;
      const grainCount = Math.max(3, Math.floor(bh / 6));
      for (let i = 0; i < grainCount; i++) {
        const yOff = minY + (bh / grainCount) * (i + 0.5);
        ctx.beginPath();
        ctx.moveTo(minX - 2, yOff + Math.sin(i * 1.7) * 1.5);
        for (let px = minX; px <= maxX + 2; px += 6) {
          ctx.lineTo(px, yOff + Math.sin(px * 0.08 + i * 2.3) * 1.2);
        }
        ctx.stroke();
      }
    } else if (materialType === 'concrete' || materialType === 'stone') {
      // Speckle dots
      const dotCount = Math.floor(bw * bh / 40);
      for (let i = 0; i < dotCount; i++) {
        const dx = minX + Math.random() * bw;
        const dy = minY + Math.random() * bh;
        const dr = 0.5 + Math.random() * 1.2;
        ctx.fillStyle = Math.random() > 0.5
          ? this._lighten(color, 15)
          : this._darken(color, 15);
        ctx.beginPath();
        ctx.arc(dx, dy, dr, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (materialType === 'metal') {
      // Metallic sheen stripe at top
      const sheenGrad = ctx.createLinearGradient(minX, minY, minX, minY + bh * 0.4);
      sheenGrad.addColorStop(0, 'rgba(255,255,255,0.28)');
      sheenGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sheenGrad;
      ctx.fillRect(minX, minY, bw, bh * 0.4);
      // Subtle horizontal line
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 0.5;
      for (let gy = minY + 4; gy < maxY; gy += 4) {
        ctx.beginPath();
        ctx.moveTo(minX, gy);
        ctx.lineTo(maxX, gy);
        ctx.stroke();
      }
    } else if (materialType === 'glass') {
      // Reflection highlight (diagonal stripe)
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      const pad = bw * 0.2;
      ctx.moveTo(minX + pad, minY);
      ctx.lineTo(minX + pad + bw * 0.2, minY);
      ctx.lineTo(minX, minY + bh * 0.5);
      ctx.lineTo(minX, minY + bh * 0.25);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (materialType === 'ice') {
      // Icy shimmer highlight
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(cx - bw * 0.15, cy - bh * 0.2, bw * 0.25, bh * 0.15, body.angle - 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    // Edge highlight (outside clip)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
      ctx.lineTo(vertices[i].x, vertices[i].y);
    }
    ctx.closePath();
    if (materialType === 'glass') {
      ctx.strokeStyle = 'rgba(128,222,234,0.6)';
      ctx.lineWidth = 1.5;
    } else {
      ctx.strokeStyle = this._lighten(color, 30);
      ctx.lineWidth = 1.5;
    }
    ctx.stroke();
    ctx.restore();
  }

  drawCircle(x, y, radius, color) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  drawGlow(x, y, radius, color) {
    const ctx = this.ctx;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ground rendering with texture
  drawGround(y, width) {
    const ctx = this.ctx;

    // Dirt body (lighter below)
    const dirtGrad = ctx.createLinearGradient(0, y + 4, 0, y + 100);
    dirtGrad.addColorStop(0, '#5D4037');
    dirtGrad.addColorStop(0.3, '#4E342E');
    dirtGrad.addColorStop(1, '#3E2723');
    ctx.fillStyle = dirtGrad;
    ctx.fillRect(0, y + 4, width, 100);

    // Dark surface line (asphalt/packed earth)
    const surfaceGrad = ctx.createLinearGradient(0, y - 2, 0, y + 6);
    surfaceGrad.addColorStop(0, '#37474F');
    surfaceGrad.addColorStop(0.5, '#2c3e50');
    surfaceGrad.addColorStop(1, '#5D4037');
    ctx.fillStyle = surfaceGrad;
    ctx.fillRect(0, y - 2, width, 8);

    // Top highlight edge
    ctx.strokeStyle = '#546E7A';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y - 2);
    ctx.lineTo(width, y - 2);
    ctx.stroke();

    // Pebble/speckle texture on dirt
    ctx.save();
    for (let i = 0; i < 60; i++) {
      const px = Math.random() * width;
      const py = y + 8 + Math.random() * 50;
      const pr = 0.5 + Math.random() * 1.5;
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.12)';
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _lighten(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (num >> 16) + percent);
    const g = Math.min(255, ((num >> 8) & 0x00FF) + percent);
    const b = Math.min(255, (num & 0x0000FF) + percent);
    return `rgb(${r},${g},${b})`;
  }

  _darken(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - percent);
    const g = Math.max(0, ((num >> 8) & 0x00FF) - percent);
    const b = Math.max(0, (num & 0x0000FF) - percent);
    return `rgb(${r},${g},${b})`;
  }

  // Draw tool cursor at world position
  drawToolCursor(toolId, worldX, worldY) {
    const ctx = this.ctx;
    ctx.save();

    if (toolId === 'wrecking_ball') {
      // Wrecking ball: dark metallic sphere with highlight
      const r = 22;
      const grad = ctx.createRadialGradient(worldX - 5, worldY - 5, 2, worldX, worldY, r);
      grad.addColorStop(0, '#78909C');
      grad.addColorStop(0.6, '#455A64');
      grad.addColorStop(1, '#263238');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(worldX, worldY, r, 0, Math.PI * 2);
      ctx.fill();
      // Shine
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.ellipse(worldX - 6, worldY - 8, 6, 4, -0.5, 0, Math.PI * 2);
      ctx.fill();
      // Chain line upward
      ctx.strokeStyle = '#546E7A';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(worldX, worldY - r);
      ctx.lineTo(worldX, worldY - r - 40);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (toolId === 'bomb') {
      // Bomb icon: black circle with fuse
      const r = 16;
      ctx.fillStyle = '#263238';
      ctx.beginPath();
      ctx.arc(worldX, worldY, r, 0, Math.PI * 2);
      ctx.fill();
      // Shine
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.ellipse(worldX - 4, worldY - 5, 5, 3, -0.4, 0, Math.PI * 2);
      ctx.fill();
      // Fuse
      ctx.strokeStyle = '#8D6E63';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(worldX + 8, worldY - 12);
      ctx.quadraticCurveTo(worldX + 16, worldY - 22, worldX + 12, worldY - 28);
      ctx.stroke();
      // Spark at fuse tip
      const sparkAlpha = 0.5 + 0.5 * Math.sin(this._time * 12);
      ctx.fillStyle = `rgba(255,214,0,${sparkAlpha})`;
      ctx.beginPath();
      ctx.arc(worldX + 12, worldY - 28, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (toolId === 'laser') {
      // Laser: crosshair with glow
      ctx.strokeStyle = 'rgba(0,229,255,0.6)';
      ctx.lineWidth = 1.5;
      const sz = 14;
      ctx.beginPath();
      ctx.moveTo(worldX - sz, worldY);
      ctx.lineTo(worldX + sz, worldY);
      ctx.moveTo(worldX, worldY - sz);
      ctx.lineTo(worldX, worldY + sz);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0,229,255,0.3)';
      ctx.beginPath();
      ctx.arc(worldX, worldY, sz * 0.7, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  // Screen-space text (no camera transform)
  drawText(text, x, y, options = {}) {
    const ctx = this.ctx;
    const {
      font = '16px sans-serif',
      color = '#ffffff',
      align = 'left',
      baseline = 'top',
      shadow = false,
      shadowColor = 'rgba(0,0,0,0.5)',
      glow = false,
      glowColor = '#FFD600',
    } = options;

    ctx.save();
    ctx.font = font;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;

    if (glow) {
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 15;
    } else if (shadow) {
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;
    }

    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  // Screen to world coordinates
  screenToWorld(sx, sy) {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const wx = (sx - cx) / this.camera.zoom + cx + this.camera.x;
    const wy = (sy - cy) / this.camera.zoom + cy + this.camera.y;
    return { x: wx, y: wy };
  }
}
