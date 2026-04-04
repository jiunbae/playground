import { PlantInstance, PlantType, Particle, TimeOfDay, Season, Weather, HSL, ButtonDef } from './types';
import { hslString, lerp, clamp, drawRoundedRect, rand, easeOut } from './utils';
import { getPlantType } from './plants';

// ==================== SKY & ENVIRONMENT PALETTES ====================

interface SkyPalette {
  top: HSL;
  bottom: HSL;
  sunMoonColor: HSL;
  sunMoonY: number;
  ambientLight: number; // 0-1
}

const SKY_PALETTES: Record<TimeOfDay, SkyPalette> = {
  dawn: {
    top: { h: 220, s: 40, l: 55 },
    bottom: { h: 30, s: 70, l: 75 },
    sunMoonColor: { h: 40, s: 90, l: 80 },
    sunMoonY: 0.85,
    ambientLight: 0.5,
  },
  morning: {
    top: { h: 200, s: 60, l: 75 },
    bottom: { h: 45, s: 50, l: 85 },
    sunMoonColor: { h: 45, s: 95, l: 90 },
    sunMoonY: 0.4,
    ambientLight: 0.8,
  },
  noon: {
    top: { h: 210, s: 55, l: 70 },
    bottom: { h: 195, s: 40, l: 80 },
    sunMoonColor: { h: 50, s: 100, l: 95 },
    sunMoonY: 0.15,
    ambientLight: 1.0,
  },
  evening: {
    top: { h: 260, s: 45, l: 40 },
    bottom: { h: 20, s: 75, l: 60 },
    sunMoonColor: { h: 15, s: 90, l: 65 },
    sunMoonY: 0.8,
    ambientLight: 0.45,
  },
  night: {
    top: { h: 240, s: 50, l: 15 },
    bottom: { h: 250, s: 40, l: 25 },
    sunMoonColor: { h: 55, s: 20, l: 90 },
    sunMoonY: 0.25,
    ambientLight: 0.2,
  },
};

const SEASON_GROUND: Record<Season, HSL> = {
  spring: { h: 120, s: 45, l: 55 },
  summer: { h: 130, s: 55, l: 45 },
  autumn: { h: 35, s: 50, l: 50 },
  winter: { h: 200, s: 15, l: 80 },
};

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private stars: Array<{ x: number; y: number; size: number; twinkle: number }> = [];

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    this.generateStars();
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private generateStars(): void {
    this.stars = [];
    for (let i = 0; i < 80; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random() * 0.5,
        size: Math.random() * 2 + 0.5,
        twinkle: Math.random() * Math.PI * 2,
      });
    }
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  getWidth(): number { return this.width; }
  getHeight(): number { return this.height; }

  // ==================== SKY ====================

  drawSky(timeOfDay: TimeOfDay, timeProgress: number, season: Season): void {
    const palette = SKY_PALETTES[timeOfDay];
    const times: TimeOfDay[] = ['dawn', 'morning', 'noon', 'evening', 'night'];
    const idx = times.indexOf(timeOfDay);
    const nextIdx = (idx + 1) % times.length;
    const nextPalette = SKY_PALETTES[times[nextIdx]];

    const t = timeProgress;
    const topColor = {
      h: lerp(palette.top.h, nextPalette.top.h, t),
      s: lerp(palette.top.s, nextPalette.top.s, t),
      l: lerp(palette.top.l, nextPalette.top.l, t),
    };
    const bottomColor = {
      h: lerp(palette.bottom.h, nextPalette.bottom.h, t),
      s: lerp(palette.bottom.s, nextPalette.bottom.s, t),
      l: lerp(palette.bottom.l, nextPalette.bottom.l, t),
    };

    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height * 0.6);
    gradient.addColorStop(0, hslString(topColor));
    gradient.addColorStop(1, hslString(bottomColor));
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height * 0.6);

    // Stars at night
    if (timeOfDay === 'night' || timeOfDay === 'evening' || timeOfDay === 'dawn') {
      const starAlpha = timeOfDay === 'night' ? 0.8 : 0.3;
      const now = Date.now() / 1000;
      this.ctx.fillStyle = `rgba(255, 255, 240, ${starAlpha})`;
      for (const star of this.stars) {
        const twinkle = Math.sin(now * 2 + star.twinkle) * 0.5 + 0.5;
        this.ctx.globalAlpha = twinkle * starAlpha;
        this.ctx.beginPath();
        this.ctx.arc(star.x * this.width, star.y * this.height, star.size, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.globalAlpha = 1;
    }

    // Sun or Moon
    const sunY = lerp(palette.sunMoonY, nextPalette.sunMoonY, t) * this.height * 0.6;
    const sunX = this.width * 0.75;
    const sunColor = {
      h: lerp(palette.sunMoonColor.h, nextPalette.sunMoonColor.h, t),
      s: lerp(palette.sunMoonColor.s, nextPalette.sunMoonColor.s, t),
      l: lerp(palette.sunMoonColor.l, nextPalette.sunMoonColor.l, t),
    };

    if (timeOfDay === 'night') {
      // Moon
      this.ctx.fillStyle = hslString(sunColor, 0.9);
      this.ctx.beginPath();
      this.ctx.arc(sunX, sunY, 25, 0, Math.PI * 2);
      this.ctx.fill();
      // Moon shadow
      this.ctx.fillStyle = hslString({ h: 240, s: 50, l: 15 }, 0.8);
      this.ctx.beginPath();
      this.ctx.arc(sunX + 8, sunY - 5, 22, 0, Math.PI * 2);
      this.ctx.fill();
    } else {
      // Sun glow
      const glow = this.ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 60);
      glow.addColorStop(0, hslString(sunColor, 0.6));
      glow.addColorStop(1, hslString(sunColor, 0));
      this.ctx.fillStyle = glow;
      this.ctx.beginPath();
      this.ctx.arc(sunX, sunY, 60, 0, Math.PI * 2);
      this.ctx.fill();
      // Sun disc
      this.ctx.fillStyle = hslString(sunColor, 0.9);
      this.ctx.beginPath();
      this.ctx.arc(sunX, sunY, 20, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Clouds
    this.drawClouds(timeOfDay, season);
  }

  private drawClouds(timeOfDay: TimeOfDay, _season: Season): void {
    const now = Date.now() / 10000;
    const cloudAlpha = timeOfDay === 'night' ? 0.15 : 0.4;
    const cloudColor = timeOfDay === 'night'
      ? 'rgba(180, 180, 200,'
      : timeOfDay === 'evening'
      ? 'rgba(255, 200, 180,'
      : 'rgba(255, 255, 255,';

    for (let i = 0; i < 5; i++) {
      const baseX = ((now * (0.5 + i * 0.1) + i * 200) % (this.width + 200)) - 100;
      const baseY = 40 + i * 35 + Math.sin(now + i) * 10;
      this.ctx.fillStyle = `${cloudColor} ${cloudAlpha})`;
      // Draw fluffy cloud
      for (let j = 0; j < 4; j++) {
        const cx = baseX + j * 25 - 30;
        const cy = baseY + Math.sin(j * 1.2) * 8;
        const r = 20 + Math.sin(j * 2) * 8;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }

  // ==================== GROUND ====================

  drawGround(season: Season, timeOfDay: TimeOfDay): void {
    const groundColor = SEASON_GROUND[season] || SEASON_GROUND['spring'];
    const ambientLight = SKY_PALETTES[timeOfDay].ambientLight;
    const adjustedGround = {
      h: groundColor.h,
      s: groundColor.s * ambientLight,
      l: groundColor.l * (0.5 + ambientLight * 0.5),
    };

    const groundY = this.height * 0.55;
    const gradient = this.ctx.createLinearGradient(0, groundY, 0, this.height);
    gradient.addColorStop(0, hslString(adjustedGround));
    gradient.addColorStop(1, hslString({ h: adjustedGround.h, s: adjustedGround.s * 0.8, l: adjustedGround.l * 0.7 }));
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, groundY, this.width, this.height - groundY);

    // Draw gentle rolling hills
    this.ctx.fillStyle = hslString({ h: adjustedGround.h, s: adjustedGround.s * 0.9, l: adjustedGround.l * 0.95 });
    this.ctx.beginPath();
    this.ctx.moveTo(0, groundY + 10);
    for (let x = 0; x <= this.width; x += 20) {
      const y = groundY + 10 + Math.sin(x * 0.01) * 8 + Math.sin(x * 0.005 + 1) * 12;
      this.ctx.lineTo(x, y);
    }
    this.ctx.lineTo(this.width, this.height);
    this.ctx.lineTo(0, this.height);
    this.ctx.closePath();
    this.ctx.fill();

    // Grass texture - scattered tiny vertical strokes in varying green shades
    if (season !== 'winter') {
      for (let i = 0; i < 200; i++) {
        const gx = (i * 37 + 13 + (i * 71 % 17)) % this.width;
        const gy = groundY + 12 + (i * 23 % 60);
        const gh = 3 + (i % 5);
        const hueShift = (i * 7 % 20) - 10;
        const lightShift = (i * 13 % 16) - 8;
        this.ctx.strokeStyle = hslString({
          h: adjustedGround.h + hueShift,
          s: adjustedGround.s + 10,
          l: adjustedGround.l + lightShift,
        }, 0.25 + (i % 5) * 0.05);
        this.ctx.lineWidth = 0.8 + (i % 3) * 0.3;
        const sway = Math.sin(Date.now() / 1200 + i * 0.7) * 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(gx, gy);
        this.ctx.lineTo(gx + sway * 0.5, gy - gh);
        this.ctx.stroke();
      }

      // Larger swaying grass blades on top
      this.ctx.lineWidth = 1;
      for (let i = 0; i < 60; i++) {
        const gx = (i * 37 + 13) % this.width;
        const gy = groundY + 15 + (i * 23 % 40);
        const gh = 5 + (i % 7);
        const sway = Math.sin(Date.now() / 1000 + i) * 2;
        this.ctx.strokeStyle = hslString({ h: adjustedGround.h - 10, s: adjustedGround.s + 10, l: adjustedGround.l + 10 }, 0.4);
        this.ctx.beginPath();
        this.ctx.moveTo(gx, gy);
        this.ctx.quadraticCurveTo(gx + sway, gy - gh / 2, gx + sway * 1.5, gy - gh);
        this.ctx.stroke();
      }
    }
  }

  // ==================== GRID ====================

  drawGrid(gridWidth: number, gridHeight: number, cellSize: number, offsetX: number, offsetY: number, highlightCell: { x: number; y: number } | null): void {
    // Subtle grid lines with dashes
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    this.ctx.lineWidth = 0.5;
    this.ctx.setLineDash([3, 4]);

    for (let x = 0; x <= gridWidth; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(offsetX + x * cellSize, offsetY);
      this.ctx.lineTo(offsetX + x * cellSize, offsetY + gridHeight * cellSize);
      this.ctx.stroke();
    }
    for (let y = 0; y <= gridHeight; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(offsetX, offsetY + y * cellSize);
      this.ctx.lineTo(offsetX + gridWidth * cellSize, offsetY + y * cellSize);
      this.ctx.stroke();
    }
    this.ctx.setLineDash([]);

    // Subtle corner dots at grid intersections
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let x = 0; x <= gridWidth; x++) {
      for (let y = 0; y <= gridHeight; y++) {
        this.ctx.beginPath();
        this.ctx.arc(offsetX + x * cellSize, offsetY + y * cellSize, 1, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    if (highlightCell) {
      // Soft cell shading on hover with gradient
      const hx = offsetX + highlightCell.x * cellSize;
      const hy = offsetY + highlightCell.y * cellSize;
      const centerX = hx + cellSize / 2;
      const centerY = hy + cellSize / 2;
      const hoverGrad = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, cellSize * 0.7);
      hoverGrad.addColorStop(0, 'rgba(255, 255, 200, 0.2)');
      hoverGrad.addColorStop(1, 'rgba(255, 255, 200, 0.05)');
      this.ctx.fillStyle = hoverGrad;
      this.ctx.fillRect(hx, hy, cellSize, cellSize);

      // Hover border with rounded feel
      this.ctx.strokeStyle = 'rgba(255, 255, 200, 0.4)';
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(hx + 1, hy + 1, cellSize - 2, cellSize - 2);
    }
  }

  // ==================== PLANTS ====================

  drawPlant(plant: PlantInstance, cellSize: number, offsetX: number, offsetY: number, timeOfDay: TimeOfDay): void {
    const plantType = getPlantType(plant.typeId);
    if (!plantType) return;

    const cx = offsetX + plant.gridX * cellSize + cellSize / 2;
    const cy = offsetY + (plant.gridY + 1) * cellSize;
    const growth = clamp(plant.growth, 0, 1);
    const ambientLight = SKY_PALETTES[timeOfDay].ambientLight;

    this.ctx.save();

    // Gentle swaying
    const sway = Math.sin(Date.now() / 1500 + plant.swayOffset) * 2 * growth;
    this.ctx.translate(cx, cy);
    this.ctx.rotate((sway * Math.PI) / 180);

    const colorVar = plantType.colorVariants[plant.colorVariant % plantType.colorVariants.length];
    const adjustedColor = {
      h: colorVar.h,
      s: colorVar.s * (0.6 + ambientLight * 0.4),
      l: colorVar.l * (0.5 + ambientLight * 0.5),
    };

    switch (plantType.category) {
      case 'tree':
        this.drawTree(plantType, growth, adjustedColor, plant.sizeVariant, plant.bloomPhase);
        break;
      case 'flower':
        this.drawFlower(plantType, growth, adjustedColor, plant.sizeVariant, plant.bloomPhase);
        break;
      case 'bush':
        this.drawBush(plantType, growth, adjustedColor, plant.sizeVariant);
        break;
      case 'mushroom':
        this.drawMushroom(plantType, growth, adjustedColor, plant.sizeVariant, timeOfDay);
        break;
      case 'vine':
        this.drawVine(plantType, growth, adjustedColor, plant.sizeVariant, plant.bloomPhase);
        break;
      case 'grass':
        this.drawGrass(plantType, growth, adjustedColor, plant.sizeVariant);
        break;
    }

    // Water indicator
    if (plant.water < 0.3) {
      const dropY = -plantType.maxHeight * growth * plant.sizeVariant - 15;
      this.ctx.fillStyle = 'rgba(100, 180, 255, 0.7)';
      this.ctx.font = '14px "Noto Sans KR", serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('💧', 0, dropY);
    }

    this.ctx.restore();
  }

  private drawTree(type: PlantType, growth: number, color: HSL, sizeVar: number, bloom: number): void {
    const h = type.maxHeight * growth * sizeVar;
    if (h < 2) return;

    // Trunk
    const trunkWidth = 4 + growth * 6 * sizeVar;
    const trunkGrad = this.ctx.createLinearGradient(-trunkWidth / 2, 0, trunkWidth / 2, 0);
    trunkGrad.addColorStop(0, 'hsl(25, 40%, 25%)');
    trunkGrad.addColorStop(0.5, 'hsl(25, 35%, 35%)');
    trunkGrad.addColorStop(1, 'hsl(25, 40%, 25%)');
    this.ctx.fillStyle = trunkGrad;

    this.ctx.beginPath();
    this.ctx.moveTo(-trunkWidth / 2, 0);
    this.ctx.lineTo(-trunkWidth / 3, -h * 0.6);
    this.ctx.lineTo(trunkWidth / 3, -h * 0.6);
    this.ctx.lineTo(trunkWidth / 2, 0);
    this.ctx.closePath();
    this.ctx.fill();

    // Bark texture - horizontal line marks on trunk
    if (growth > 0.2) {
      this.ctx.strokeStyle = 'rgba(50, 30, 15, 0.35)';
      this.ctx.lineWidth = 0.7;
      const barkLines = Math.floor(h * 0.04) + 2;
      for (let i = 0; i < barkLines; i++) {
        const by = -(i / barkLines) * h * 0.55 - 3;
        const widthAtY = trunkWidth * (0.5 + 0.5 * (1 + by / (h * 0.6)));
        const bx1 = -widthAtY * 0.4 + (i % 3 - 1) * 1.5;
        const bx2 = widthAtY * 0.35 + (i % 2) * 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(bx1, by);
        this.ctx.quadraticCurveTo((bx1 + bx2) / 2, by + (i % 2 === 0 ? 1 : -0.5), bx2, by);
        this.ctx.stroke();
      }
    }

    // L-System branches
    if (growth > 0.3) {
      this.drawLSystemBranches(type, h, growth, color);
    }

    // Foliage clusters
    if (growth > 0.2) {
      const foliageY = -h * 0.5;
      const foliageR = (15 + growth * 25) * sizeVar;

      // Shadow under canopy on ground
      const shadowGrad = this.ctx.createRadialGradient(0, 2, 0, 0, 2, foliageR * 1.2);
      shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.18)');
      shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      this.ctx.fillStyle = shadowGrad;
      this.ctx.beginPath();
      this.ctx.ellipse(0, 2, foliageR * 1.2, foliageR * 0.3, 0, 0, Math.PI * 2);
      this.ctx.fill();
      const clusters = [
        { x: 0, y: foliageY - foliageR * 0.6, r: foliageR },
        { x: -foliageR * 0.6, y: foliageY, r: foliageR * 0.8 },
        { x: foliageR * 0.6, y: foliageY, r: foliageR * 0.8 },
        { x: -foliageR * 0.3, y: foliageY - foliageR * 0.9, r: foliageR * 0.7 },
        { x: foliageR * 0.3, y: foliageY - foliageR * 0.9, r: foliageR * 0.7 },
      ];

      for (const c of clusters) {
        const grad = this.ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
        grad.addColorStop(0, hslString({ h: color.h, s: color.s, l: color.l + 10 }, 0.9));
        grad.addColorStop(0.7, hslString(color, 0.85));
        grad.addColorStop(1, hslString({ h: color.h, s: color.s, l: color.l - 10 }, 0.6));
        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        this.ctx.fill();
      }

      // Cherry blossom petals
      if (type.id === 'cherry_tree' && bloom > 0.5) {
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          const r = foliageR * (0.8 + Math.sin(i * 3) * 0.3);
          const px = Math.cos(angle) * r;
          const py = foliageY + Math.sin(angle) * r * 0.6;
          this.ctx.fillStyle = hslString({ h: 340, s: 80, l: 85 }, 0.7 * bloom);
          this.ctx.beginPath();
          this.ctx.arc(px, py, 3 + bloom * 3, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    }
  }

  private drawLSystemBranches(type: PlantType, height: number, growth: number, color: HSL): void {
    const iterations = Math.min(type.lSystemIterations, Math.floor(growth * type.lSystemIterations) + 1);
    let commands = 'F';
    for (let i = 0; i < iterations; i++) {
      let next = '';
      for (const ch of commands) {
        if (ch === 'F') {
          next += type.lSystemRule;
        } else {
          next += ch;
        }
      }
      commands = next;
    }

    const segmentLength = (height * 0.15) / (iterations + 1);
    const angle = type.lSystemAngle;
    const stack: Array<{ x: number; y: number; a: number }> = [];
    let cx = 0, cy = 0, ca = -90;

    this.ctx.strokeStyle = hslString({ h: color.h + 10, s: color.s * 0.5, l: 30 }, 0.6);
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);

    for (const ch of commands) {
      switch (ch) {
        case 'F': {
          const nx = cx + Math.cos((ca * Math.PI) / 180) * segmentLength;
          const ny = cy + Math.sin((ca * Math.PI) / 180) * segmentLength;
          this.ctx.moveTo(cx, cy);
          this.ctx.lineTo(nx, ny);
          cx = nx;
          cy = ny;
          break;
        }
        case '+': ca += angle; break;
        case '-': ca -= angle; break;
        case '[': stack.push({ x: cx, y: cy, a: ca }); break;
        case ']': {
          const s = stack.pop();
          if (s) { cx = s.x; cy = s.y; ca = s.a; }
          break;
        }
      }
    }
    this.ctx.stroke();
  }

  private drawFlower(type: PlantType, growth: number, color: HSL, sizeVar: number, bloom: number): void {
    const h = type.maxHeight * growth * sizeVar;
    if (h < 2) return;

    // Stem
    this.ctx.strokeStyle = 'hsl(120, 45%, 35%)';
    this.ctx.lineWidth = 2 + growth;
    const stemSway = Math.sin(Date.now() / 2000) * 3 * growth;
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.quadraticCurveTo(stemSway, -h / 2, stemSway * 0.5, -h);
    this.ctx.stroke();

    // Leaves on stem
    if (growth > 0.3) {
      this.ctx.fillStyle = 'hsl(120, 50%, 40%)';
      for (let i = 0; i < 2; i++) {
        const ly = -h * (0.3 + i * 0.25);
        const lx = (i % 2 === 0 ? 1 : -1) * 8;
        this.ctx.beginPath();
        this.ctx.ellipse(lx + stemSway * (1 - (0.3 + i * 0.25)), ly, 6 * growth, 3 * growth, (i % 2 === 0 ? 0.3 : -0.3), 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    // Flower head
    if (growth > 0.4) {
      const flowerX = stemSway * 0.5;
      const flowerY = -h;
      const petalSize = (6 + growth * 8) * sizeVar;
      const petalCount = type.id === 'sunflower' ? 12 : type.id === 'lotus' ? 8 : 6;
      const bloomFactor = clamp((growth - 0.4) / 0.6, 0, 1) * bloom;

      // Petals - shaped ellipses arranged around center
      for (let i = 0; i < petalCount; i++) {
        const angle = (i / petalCount) * Math.PI * 2 + Date.now() / 10000;
        const petalDist = petalSize * 0.65 * bloomFactor;
        const px = flowerX + Math.cos(angle) * petalDist;
        const py = flowerY + Math.sin(angle) * petalDist;
        const petalColor = {
          h: color.h + (i % 2 === 0 ? 8 : -8),
          s: color.s,
          l: color.l + (i % 3) * 5,
        };

        // Draw each petal as an elongated ellipse pointing outward
        this.ctx.save();
        this.ctx.translate(px, py);
        this.ctx.rotate(angle);

        // Petal outer shape
        this.ctx.fillStyle = hslString(petalColor, 0.85);
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, petalSize * 0.45, petalSize * 0.22, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Petal inner highlight
        this.ctx.fillStyle = hslString({ h: petalColor.h, s: petalColor.s - 5, l: petalColor.l + 15 }, 0.4);
        this.ctx.beginPath();
        this.ctx.ellipse(-petalSize * 0.08, 0, petalSize * 0.25, petalSize * 0.1, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Petal vein (subtle center line)
        this.ctx.strokeStyle = hslString({ h: petalColor.h, s: petalColor.s, l: petalColor.l - 10 }, 0.2);
        this.ctx.lineWidth = 0.5;
        this.ctx.beginPath();
        this.ctx.moveTo(-petalSize * 0.35, 0);
        this.ctx.lineTo(petalSize * 0.35, 0);
        this.ctx.stroke();

        this.ctx.restore();
      }

      // Center with texture
      const centerColor = type.id === 'sunflower'
        ? { h: 30, s: 70, l: 30 }
        : { h: color.h + 30, s: color.s - 10, l: color.l + 20 };
      const centerR = petalSize * 0.3 * bloomFactor;
      // Center gradient
      const centerGrad = this.ctx.createRadialGradient(flowerX, flowerY, 0, flowerX, flowerY, centerR);
      centerGrad.addColorStop(0, hslString({ h: centerColor.h, s: centerColor.s, l: centerColor.l + 15 }, 0.95));
      centerGrad.addColorStop(1, hslString(centerColor, 0.9));
      this.ctx.fillStyle = centerGrad;
      this.ctx.beginPath();
      this.ctx.arc(flowerX, flowerY, centerR, 0, Math.PI * 2);
      this.ctx.fill();

      // Center dots (pollen texture)
      if (centerR > 3) {
        this.ctx.fillStyle = hslString({ h: centerColor.h + 10, s: centerColor.s - 10, l: centerColor.l + 25 }, 0.5);
        for (let d = 0; d < 5; d++) {
          const da = (d / 5) * Math.PI * 2;
          const dr = centerR * 0.4;
          this.ctx.beginPath();
          this.ctx.arc(flowerX + Math.cos(da) * dr, flowerY + Math.sin(da) * dr, 1, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    }
  }

  private drawBush(type: PlantType, growth: number, color: HSL, sizeVar: number): void {
    const h = type.maxHeight * growth * sizeVar;
    if (h < 2) return;

    const w = h * 1.4;
    // Main bush shape
    const clusters = [
      { x: 0, y: -h * 0.5, rx: w * 0.4, ry: h * 0.5 },
      { x: -w * 0.25, y: -h * 0.35, rx: w * 0.3, ry: h * 0.4 },
      { x: w * 0.25, y: -h * 0.35, rx: w * 0.3, ry: h * 0.4 },
    ];

    for (const c of clusters) {
      const grad = this.ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, Math.max(c.rx, c.ry));
      grad.addColorStop(0, hslString({ h: color.h, s: color.s, l: color.l + 10 }, 0.9));
      grad.addColorStop(0.7, hslString(color, 0.85));
      grad.addColorStop(1, hslString({ h: color.h, s: color.s, l: color.l - 15 }, 0.7));
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Fern frond details
    if (type.id === 'fern' && growth > 0.3) {
      this.ctx.strokeStyle = hslString({ h: color.h - 5, s: color.s + 10, l: color.l + 5 }, 0.6);
      this.ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const angle = -Math.PI / 2 + (i - 2) * 0.4;
        const length = h * 0.7;
        this.ctx.beginPath();
        this.ctx.moveTo(0, -2);
        for (let t = 0; t < 1; t += 0.05) {
          const fx = Math.cos(angle) * length * t + Math.sin(t * Math.PI) * 5;
          const fy = Math.sin(angle) * length * t - 2;
          this.ctx.lineTo(fx, fy);
        }
        this.ctx.stroke();
      }
    }
  }

  private drawMushroom(type: PlantType, growth: number, color: HSL, sizeVar: number, timeOfDay: TimeOfDay): void {
    const h = type.maxHeight * growth * sizeVar;
    if (h < 2) return;

    // Stem
    const stemW = 4 + growth * 4;
    this.ctx.fillStyle = 'hsl(40, 20%, 85%)';
    this.ctx.beginPath();
    this.ctx.moveTo(-stemW / 2, 0);
    this.ctx.lineTo(-stemW / 3, -h * 0.5);
    this.ctx.lineTo(stemW / 3, -h * 0.5);
    this.ctx.lineTo(stemW / 2, 0);
    this.ctx.closePath();
    this.ctx.fill();

    // Cap
    const capW = (12 + growth * 18) * sizeVar;
    const capH = capW * 0.5;
    const capY = -h * 0.5;

    const grad = this.ctx.createRadialGradient(0, capY - capH * 0.3, 0, 0, capY, capW);
    grad.addColorStop(0, hslString({ h: color.h, s: color.s, l: color.l + 15 }, 0.95));
    grad.addColorStop(0.6, hslString(color, 0.9));
    grad.addColorStop(1, hslString({ h: color.h, s: color.s, l: color.l - 10 }, 0.85));
    this.ctx.fillStyle = grad;

    this.ctx.beginPath();
    this.ctx.ellipse(0, capY, capW, capH, 0, Math.PI, 0);
    this.ctx.closePath();
    this.ctx.fill();

    // Spots for red mushroom
    if (type.id === 'mushroom_red' && growth > 0.5) {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      const spots = [
        { x: -capW * 0.3, y: capY - capH * 0.4, r: 3 },
        { x: capW * 0.2, y: capY - capH * 0.5, r: 2.5 },
        { x: 0, y: capY - capH * 0.7, r: 3.5 },
        { x: capW * 0.4, y: capY - capH * 0.3, r: 2 },
        { x: -capW * 0.15, y: capY - capH * 0.6, r: 2 },
      ];
      for (const s of spots) {
        this.ctx.beginPath();
        this.ctx.arc(s.x, s.y, s.r * growth, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    // Glow effect for glow mushroom
    if (type.id === 'mushroom_glow' && timeOfDay === 'night') {
      const glowAlpha = 0.3 + Math.sin(Date.now() / 800) * 0.15;
      const glow = this.ctx.createRadialGradient(0, capY - capH * 0.3, 0, 0, capY, capW * 1.5);
      glow.addColorStop(0, hslString({ h: color.h, s: color.s, l: 80 }, glowAlpha));
      glow.addColorStop(1, hslString({ h: color.h, s: color.s, l: 80 }, 0));
      this.ctx.fillStyle = glow;
      this.ctx.beginPath();
      this.ctx.arc(0, capY - capH * 0.3, capW * 1.5, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawVine(type: PlantType, growth: number, color: HSL, sizeVar: number, bloom: number): void {
    const h = type.maxHeight * growth * sizeVar;
    if (h < 2) return;

    // Main trunk
    this.ctx.strokeStyle = 'hsl(25, 35%, 30%)';
    this.ctx.lineWidth = 3 + growth * 3;
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.bezierCurveTo(-5, -h * 0.3, 5, -h * 0.6, 0, -h);
    this.ctx.stroke();

    // Hanging vines
    if (growth > 0.3) {
      const vineCount = Math.floor(growth * 8);
      for (let i = 0; i < vineCount; i++) {
        const startY = -h * (0.3 + (i / vineCount) * 0.65);
        const startX = (i % 2 === 0 ? -1 : 1) * (5 + i * 3);
        const vineLen = 15 + growth * 20;

        this.ctx.strokeStyle = hslString({ h: 120, s: 40, l: 35 }, 0.7);
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.quadraticCurveTo(startX + (i % 2 === 0 ? -10 : 10), startY + vineLen * 0.5, startX, startY + vineLen);
        this.ctx.stroke();

        // Hanging flowers
        if (bloom > 0.5 && i % 2 === 0) {
          const flowerY = startY + vineLen;
          for (let j = 0; j < 3; j++) {
            const fy = flowerY - j * 4;
            this.ctx.fillStyle = hslString(color, 0.8 - j * 0.15);
            this.ctx.beginPath();
            this.ctx.ellipse(startX, fy, 3 + (2 - j), 2 + (2 - j), 0, 0, Math.PI * 2);
            this.ctx.fill();
          }
        }
      }
    }
  }

  private drawGrass(type: PlantType, growth: number, color: HSL, sizeVar: number): void {
    const h = type.maxHeight * growth * sizeVar;
    if (h < 2) return;

    if (type.id === 'bamboo') {
      // Bamboo segments
      const segments = Math.floor(growth * 6) + 1;
      const segH = h / segments;
      const w = 4 + growth * 2;

      for (let i = 0; i < segments; i++) {
        const sy = -i * segH;
        const sway = Math.sin(Date.now() / 2000 + i * 0.5) * (i * 0.5);

        // Segment
        this.ctx.fillStyle = hslString({ h: color.h, s: color.s, l: color.l + (i % 2) * 5 });
        this.ctx.beginPath();
        this.ctx.moveTo(-w / 2 + sway, sy);
        this.ctx.lineTo(-w / 2 + sway, sy - segH + 1);
        this.ctx.lineTo(w / 2 + sway, sy - segH + 1);
        this.ctx.lineTo(w / 2 + sway, sy);
        this.ctx.closePath();
        this.ctx.fill();

        // Node
        this.ctx.fillStyle = hslString({ h: color.h, s: color.s - 5, l: color.l - 5 });
        this.ctx.beginPath();
        this.ctx.ellipse(sway, sy, w / 2 + 1, 2, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Leaves at some nodes
        if (i > 1 && i % 2 === 0) {
          this.ctx.fillStyle = hslString({ h: color.h + 10, s: color.s + 5, l: color.l + 10 }, 0.8);
          const leafDir = i % 4 === 0 ? 1 : -1;
          this.ctx.beginPath();
          this.ctx.moveTo(sway, sy);
          this.ctx.quadraticCurveTo(leafDir * 15 + sway, sy - 5, leafDir * 20 + sway, sy + 3);
          this.ctx.quadraticCurveTo(leafDir * 10 + sway, sy - 2, sway, sy);
          this.ctx.fill();
        }
      }
    }
  }

  // ==================== PARTICLES ====================

  drawParticles(particles: Particle[]): void {
    for (const p of particles) {
      const alpha = (p.life / p.maxLife) * p.color.a;
      this.ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha})`;

      if (p.type === 'rain') {
        this.ctx.fillRect(p.x, p.y, 1.5, p.size);
      } else if (p.type === 'leaf') {
        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(Date.now() / 500 + p.x);
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      } else if (p.type === 'sparkle') {
        const sparkleSize = p.size * (p.life / p.maxLife);
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, sparkleSize, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (p.type === 'petal') {
        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(Date.now() / 1000 + p.y * 0.1);
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, p.size, p.size * 0.4, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      } else if (p.type === 'water_drop') {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }

  // ==================== AMBIENT PARTICLES ====================

  drawAmbientParticles(timeOfDay: TimeOfDay): void {
    const now = Date.now() / 1000;

    if (timeOfDay === 'night' || timeOfDay === 'evening') {
      // Fireflies - small glowing yellow dots that drift
      for (let i = 0; i < 15; i++) {
        const phase = now * 0.3 + i * 2.7;
        const fx = (Math.sin(phase * 0.7 + i * 1.3) * 0.35 + 0.5) * this.width;
        const fy = this.height * 0.45 + Math.sin(phase * 0.5 + i * 0.9) * this.height * 0.2;
        const flicker = Math.sin(now * 3 + i * 5) * 0.5 + 0.5;
        const alpha = flicker * (timeOfDay === 'night' ? 0.7 : 0.35);

        // Glow
        const glow = this.ctx.createRadialGradient(fx, fy, 0, fx, fy, 8);
        glow.addColorStop(0, `rgba(255, 255, 120, ${alpha})`);
        glow.addColorStop(0.5, `rgba(255, 240, 80, ${alpha * 0.3})`);
        glow.addColorStop(1, `rgba(255, 240, 80, 0)`);
        this.ctx.fillStyle = glow;
        this.ctx.beginPath();
        this.ctx.arc(fx, fy, 8, 0, Math.PI * 2);
        this.ctx.fill();

        // Core dot
        this.ctx.fillStyle = `rgba(255, 255, 180, ${alpha})`;
        this.ctx.beginPath();
        this.ctx.arc(fx, fy, 1.5, 0, Math.PI * 2);
        this.ctx.fill();
      }
    } else {
      // Dust motes during day - gently floating particles
      for (let i = 0; i < 20; i++) {
        const phase = now * 0.2 + i * 3.1;
        const dx = (Math.sin(phase * 0.4 + i * 1.7) * 0.4 + 0.5) * this.width;
        const dy = (Math.sin(phase * 0.3 + i * 0.6) * 0.3 + 0.35) * this.height;
        const alpha = (Math.sin(now * 1.5 + i * 2) * 0.3 + 0.3) * (timeOfDay === 'noon' ? 0.25 : 0.15);
        const size = 1 + (i % 3) * 0.5;

        this.ctx.fillStyle = `rgba(255, 255, 230, ${alpha})`;
        this.ctx.beginPath();
        this.ctx.arc(dx, dy, size, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }

  // ==================== WEATHER ====================

  drawWeatherOverlay(weather: Weather, _timeOfDay: TimeOfDay): void {
    if (weather === 'sunny') {
      // Warm overlay
      this.ctx.fillStyle = 'rgba(255, 240, 200, 0.05)';
      this.ctx.fillRect(0, 0, this.width, this.height);

      // Light rays
      const now = Date.now() / 3000;
      this.ctx.save();
      this.ctx.globalAlpha = 0.04;
      for (let i = 0; i < 5; i++) {
        const angle = now + i * 0.5;
        const x = this.width * 0.75;
        const y = this.height * 0.1;
        this.ctx.fillStyle = 'rgba(255, 255, 200, 0.3)';
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x + Math.cos(angle) * 400, y + Math.sin(angle) * 400 + 300);
        this.ctx.lineTo(x + Math.cos(angle + 0.1) * 400, y + Math.sin(angle + 0.1) * 400 + 300);
        this.ctx.closePath();
        this.ctx.fill();
      }
      this.ctx.restore();
    }

    if (weather === 'rain') {
      // Dim overlay
      this.ctx.fillStyle = 'rgba(100, 110, 130, 0.1)';
      this.ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  // ==================== UI ====================

  drawButton(btn: ButtonDef): void {
    const isHovered = btn.hovered || false;
    const baseColor = btn.color || 'rgba(255, 255, 255, 0.15)';

    this.ctx.save();

    // Shadow
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    this.ctx.shadowBlur = 8;
    this.ctx.shadowOffsetY = 2;

    // Button background
    this.ctx.fillStyle = isHovered ? 'rgba(255, 255, 255, 0.25)' : baseColor;
    drawRoundedRect(this.ctx, btn.x, btn.y, btn.w, btn.h, 8);
    this.ctx.fill();

    // Border
    this.ctx.shadowColor = 'transparent';
    this.ctx.strokeStyle = isHovered ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.2)';
    this.ctx.lineWidth = 1.5;
    drawRoundedRect(this.ctx, btn.x, btn.y, btn.w, btn.h, 8);
    this.ctx.stroke();

    // Text
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.font = `${Math.min(btn.h * 0.4, 18)}px 'Noto Sans KR', 'Outfit', sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);

    this.ctx.restore();
  }

  drawText(text: string, x: number, y: number, size: number = 16, color: string = 'white', align: CanvasTextAlign = 'left'): void {
    // Use Noto Sans KR for Korean text
    this.ctx.fillStyle = color;
    this.ctx.font = `${size}px 'Noto Sans KR', 'Outfit', sans-serif`;
    this.ctx.textAlign = align;
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, x, y);
  }

  drawTitle(text: string, x: number, y: number, size: number = 48): void {
    this.ctx.save();
    // Shadow
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    this.ctx.shadowBlur = 10;
    this.ctx.shadowOffsetY = 3;
    this.ctx.fillStyle = 'rgba(255, 255, 240, 0.95)';
    this.ctx.font = `900 ${size}px 'Outfit', 'Noto Sans KR', sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, x, y);
    this.ctx.restore();
  }

  drawPanel(x: number, y: number, w: number, h: number, alpha: number = 0.6): void {
    this.ctx.save();
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    this.ctx.shadowBlur = 15;
    this.ctx.fillStyle = `rgba(20, 25, 40, ${alpha})`;
    drawRoundedRect(this.ctx, x, y, w, h, 12);
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 1;
    drawRoundedRect(this.ctx, x, y, w, h, 12);
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawProgressBar(x: number, y: number, w: number, h: number, progress: number, color: HSL): void {
    // Background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    drawRoundedRect(this.ctx, x, y, w, h, h / 2);
    this.ctx.fill();

    // Fill
    if (progress > 0) {
      const fillW = Math.max(h, w * clamp(progress, 0, 1));
      const grad = this.ctx.createLinearGradient(x, y, x + fillW, y);
      grad.addColorStop(0, hslString({ h: color.h, s: color.s, l: color.l + 10 }));
      grad.addColorStop(1, hslString(color));
      this.ctx.fillStyle = grad;
      drawRoundedRect(this.ctx, x, y, fillW, h, h / 2);
      this.ctx.fill();
    }
  }

  drawOverlay(alpha: number): void {
    this.ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  // ==================== WATERING ANIMATION ====================

  drawWateringCan(x: number, y: number, pouring: boolean): void {
    this.ctx.save();
    this.ctx.translate(x, y);

    // Can body
    this.ctx.fillStyle = 'hsl(200, 50%, 60%)';
    drawRoundedRect(this.ctx, -15, -10, 30, 20, 4);
    this.ctx.fill();

    // Spout
    this.ctx.strokeStyle = 'hsl(200, 50%, 55%)';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(15, -5);
    this.ctx.lineTo(25, -15);
    this.ctx.stroke();

    // Handle
    this.ctx.beginPath();
    this.ctx.moveTo(-5, -10);
    this.ctx.quadraticCurveTo(0, -22, 10, -10);
    this.ctx.stroke();

    if (pouring) {
      // Water drops - larger with blue trails
      for (let i = 0; i < 5; i++) {
        const progress = ((Date.now() / 80 + i * 12) % 30);
        const dropX = 25 + i * 2.5 + Math.sin(i * 2) * 2;
        const dropY = -15 + progress;
        const dropAlpha = 1 - progress / 30;
        const dropSize = 2.5 + (i % 2);

        // Trail
        const trailGrad = this.ctx.createLinearGradient(dropX, dropY - 8, dropX, dropY);
        trailGrad.addColorStop(0, `rgba(80, 160, 255, 0)`);
        trailGrad.addColorStop(1, `rgba(100, 180, 255, ${dropAlpha * 0.5})`);
        this.ctx.strokeStyle = trailGrad;
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(dropX, dropY - 8);
        this.ctx.lineTo(dropX, dropY);
        this.ctx.stroke();

        // Drop (teardrop shape)
        this.ctx.fillStyle = `rgba(120, 200, 255, ${dropAlpha * 0.8})`;
        this.ctx.beginPath();
        this.ctx.arc(dropX, dropY, dropSize, 0, Math.PI * 2);
        this.ctx.fill();

        // Drop highlight
        this.ctx.fillStyle = `rgba(200, 230, 255, ${dropAlpha * 0.6})`;
        this.ctx.beginPath();
        this.ctx.arc(dropX - 0.5, dropY - 0.5, dropSize * 0.4, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    this.ctx.restore();
  }
}
