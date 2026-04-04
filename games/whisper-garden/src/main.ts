/**
 * Whisper Garden - Main Entry Point
 * Manages game state, input, and game loop
 */

import { Renderer } from './renderer';
import { AudioManager } from './audio';
import { PLANT_TYPES, getPlantType } from './plants';
import {
  PlantInstance, Particle, GardenState,
  GameScreen, Season, Weather, TimeOfDay, ButtonDef,
} from './types';
import { clamp, rand } from './utils';
import { PlaygroundSDK } from '@playground/sdk';

// --- SDK Init ---
let sdk: PlaygroundSDK | null = null;
try {
  sdk = PlaygroundSDK.init({ apiUrl: 'https://api.jiun.dev', game: 'whisper-garden' });
} catch { /* SDK init failed, continue offline */ }

let sdkLoggedIn = false;
try {
  if (sdk) sdkLoggedIn = !!sdk.auth.getUser();
} catch { /* ignore */ }

let lastSdkScore = -1;
let lastSdkSubmitTime = 0;

let lastCloudSaveTime = 0;

async function handleSdkLogin(): Promise<void> {
  if (!sdk) return;
  try {
    const user = await sdk.auth.loginIfAvailable();
    sdkLoggedIn = !!user;
    if (user) {
      await cloudSyncOnLogin();
    }
  } catch { /* login failed */ }
}

function showCloudToast(msg: string): void {
  addToast(msg);
}

async function cloudSaveGarden(): Promise<void> {
  if (!sdk) return;
  try {
    // Always save locally first (offline-first)
    save();
    await sdk.saves.save({ garden, gameTime, nextPlantId, updatedAt: Date.now() });
    showCloudToast('\u2601\uFE0F \uC800\uC7A5\uB428');
  } catch { /* cloud save failed, continue offline */ }
}

async function cloudSyncOnLogin(): Promise<void> {
  if (!sdk) return;
  try {
    const cloudData = await sdk.saves.load<{ garden: GardenState; gameTime: number; nextPlantId: number; updatedAt: number }>();
    if (!cloudData) {
      await cloudSaveGarden();
      return;
    }

    // Compare updatedAt: local save timestamp vs cloud
    const localRaw = localStorage.getItem('whisper-garden-save');
    let localUpdatedAt = 0;
    if (localRaw) {
      try {
        const localData = JSON.parse(localRaw);
        localUpdatedAt = localData.updatedAt || 0;
      } catch { /* ignore */ }
    }

    if ((cloudData.updatedAt || 0) > localUpdatedAt) {
      garden = { ...garden, ...cloudData.garden };
      gameTime = cloudData.gameTime || 0;
      nextPlantId = cloudData.nextPlantId || 1;
      showCloudToast('\u2601\uFE0F \uD074\uB77C\uC6B0\uB4DC\uC5D0\uC11C \uBCF5\uC6D0\uB428');
    } else {
      await cloudSaveGarden();
    }
  } catch { /* cloud sync failed */ }
}

function submitGardenScore(): void {
  if (!sdk) return;
  const now = performance.now() / 1000;
  if (garden.aestheticScore === lastSdkScore) return;
  if (now - lastSdkSubmitTime < 60) return;

  lastSdkScore = garden.aestheticScore;
  lastSdkSubmitTime = now;

  const uniqueSpecies = new Set(garden.plants.map(p => p.typeId)).size;
  try {
    sdk.scores.submit({
      score: garden.aestheticScore,
      meta: {
        plantsGrown: garden.totalPlantsGrown,
        level: garden.level,
        uniqueSpecies,
        gardenAge: Math.floor(gameTime / DAY_LENGTH),
      },
    });
  } catch { /* score submission failed */ }
}

// ==================== CONSTANTS ====================
const GRID_W = 8;
const GRID_H = 6;
const TIME_SPEED = 0.15; // Game seconds per real second
const DAY_LENGTH = 60; // Game seconds per full day
const SEASON_LENGTH = 300; // Game seconds per season

// ==================== GAME STATE ====================
let screen: GameScreen = 'menu';
let garden: GardenState = {
  plants: [],
  gridWidth: GRID_W,
  gridHeight: GRID_H,
  level: 1,
  experience: 0,
  coins: 100,
  unlockedPlants: ['cherry_tree', 'oak_tree', 'rose', 'tulip', 'sunflower', 'mushroom'],
  aestheticScore: 0,
  totalPlantsGrown: 0,
};

let gameTime = 0;
let selectedPlantId: string | null = null;
let selectedTool: 'plant' | 'water' | 'remove' | null = 'plant';
let weather: Weather = 'clear';
let particles: Particle[] = [];
let buttons: ButtonDef[] = [];
let hoveredCell: { gridX: number; gridY: number } | null = null;
let nextPlantId = 1;
let audioEnabled = false;
let showWelcomeTutorial = false;
let welcomeTutorialShown = false;

// Toast system
interface Toast {
  message: string;
  time: number;
  duration: number;
}
let toasts: Toast[] = [];
let toastTime = 0;

function addToast(message: string) {
  toasts.push({ message, time: performance.now() / 1000, duration: 2.5 });
}

// Hover info for plants
let hoveredPlantInfo: { plant: PlantInstance; screenX: number; screenY: number } | null = null;
let mousePos = { x: 0, y: 0 };
let completedPlantIds = new Set<number>();
let lastSeason: string = '';
let tooltipOpacity = 0;
let tooltipTarget = 0;

// ==================== INIT ====================
const canvas = document.createElement('canvas');
canvas.style.cssText = 'display:block;width:100%;height:100%';
document.getElementById('app')!.appendChild(canvas);

const renderer = new Renderer(canvas);
const audio = new AudioManager();

window.addEventListener('resize', () => renderer.resize());

// ==================== TIME ====================
function getTimeOfDay(): TimeOfDay {
  if (!gameTime || isNaN(gameTime) || gameTime < 0) return 'morning';
  const dayProgress = (gameTime % DAY_LENGTH) / DAY_LENGTH;
  if (dayProgress < 0.15) return 'dawn';
  if (dayProgress < 0.35) return 'morning';
  if (dayProgress < 0.6) return 'noon';
  if (dayProgress < 0.8) return 'evening';
  return 'night';
}

function getSeason(): Season {
  const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
  if (!gameTime || isNaN(gameTime) || gameTime < 0) return 'spring';
  const s = Math.floor((gameTime / SEASON_LENGTH) % 4);
  return seasons[s] || 'spring';
}

function getDayNumber(): number {
  return Math.floor(gameTime / DAY_LENGTH) + 1;
}

// ==================== GARDEN LOGIC ====================
function plantAt(gridX: number, gridY: number): void {
  if (!selectedPlantId) return;
  if (garden.plants.some(p => p.gridX === gridX && p.gridY === gridY)) {
    addToast('\u274C \uC774\uBBF8 \uC2DD\uBB3C\uC774 \uC788\uC5B4\uC694');
    return;
  }

  const type = getPlantType(selectedPlantId);
  if (!type) return;

  garden.plants.push({
    id: nextPlantId++,
    typeId: selectedPlantId,
    gridX, gridY,
    growth: 0,
    water: 0.5,
    health: 1,
    plantedAt: gameTime,
    lastWatered: gameTime,
    colorVariant: Math.floor(Math.random() * (type.colorVariants?.length || 1)),
    sizeVariant: 0.85 + Math.random() * 0.3,
    swayOffset: Math.random() * Math.PI * 2,
    bloomPhase: 0,
  });

  garden.totalPlantsGrown++;
  garden.experience += 5;
  addToast(`\uD83C\uDF31 ${type.nameKo}\uB97C \uC2EC\uC5C8\uC2B5\uB2C8\uB2E4`);
  if (audioEnabled) audio.playDigSound();
}

function waterAt(gridX: number, gridY: number): void {
  const plant = garden.plants.find(p => p.gridX === gridX && p.gridY === gridY);
  if (plant) {
    plant.water = clamp(plant.water + 0.4, 0, 1);
    plant.lastWatered = gameTime;
    addToast('\uD83D\uDCA7 \uBB3C\uC744 \uC8FC\uC5C8\uC2B5\uB2C8\uB2E4');
    if (audioEnabled) audio.playWaterDropSound();
    // Water particles
    const cellSize = Math.min(renderer.getWidth() / GRID_W, (renderer.getHeight() - 120) / GRID_H);
    const offsetX = (renderer.getWidth() - GRID_W * cellSize) / 2;
    const offsetY = renderer.getHeight() * 0.35;
    const px = offsetX + gridX * cellSize + cellSize / 2;
    const py = offsetY + gridY * cellSize + cellSize / 2;
    for (let i = 0; i < 5; i++) {
      particles.push({
        x: px, y: py - 10,
        vx: rand(-1, 1), vy: rand(-2, 0),
        life: 1, maxLife: 1,
        size: rand(2, 4),
        color: { r: 100, g: 180, b: 255, a: 0.7 },
        type: 'water_drop',
      });
    }
  }
}

function removeAt(gridX: number, gridY: number): void {
  const plant = garden.plants.find(p => p.gridX === gridX && p.gridY === gridY);
  if (plant) {
    const type = getPlantType(plant.typeId);
    addToast(`\uD83D\uDDD1\uFE0F ${type ? type.nameKo + '\uC744(\uB97C) ' : '\uC2DD\uBB3C\uC744 '}\uC81C\uAC70\uD588\uC2B5\uB2C8\uB2E4`);
  }
  garden.plants = garden.plants.filter(p => !(p.gridX === gridX && p.gridY === gridY));
}

function updatePlants(dt: number): void {
  const season = getSeason();
  const tod = getTimeOfDay();

  garden.plants.forEach(plant => {
    const type = getPlantType(plant.typeId);
    if (!type) return;

    // Water depletes over time
    plant.water = clamp(plant.water - type.waterNeed * dt * 0.01, 0, 1);

    // Rain waters plants
    if (weather === 'rain') plant.water = clamp(plant.water + dt * 0.005, 0, 1);

    // Growth
    const waterBonus = plant.water > 0.3 ? 1 : 0.2;
    const seasonBonus = type.seasonBonus === season ? 1.5 : 1;
    const nightSlowdown = tod === 'night' ? 0.3 : 1;
    const growthRate = (1 / type.growthTime) * waterBonus * seasonBonus * nightSlowdown;
    plant.growth = clamp(plant.growth + growthRate * dt, 0, 1);

    // Health
    if (plant.water < 0.1) plant.health = clamp(plant.health - dt * 0.002, 0, 1);
    else plant.health = clamp(plant.health + dt * 0.001, 0, 1);

    // Growth completion sparkle + chime
    if (plant.growth >= 1 && !completedPlantIds.has(plant.id)) {
      completedPlantIds.add(plant.id);
      if (audioEnabled) audio.playGrowthChime();
      // Sparkle particles around the plant
      const cellSize = Math.min(renderer.getWidth() / GRID_W, (renderer.getHeight() - 120) / GRID_H);
      const offsetX = (renderer.getWidth() - GRID_W * cellSize) / 2;
      const offsetY = renderer.getHeight() * 0.35;
      const px = offsetX + plant.gridX * cellSize + cellSize / 2;
      const py = offsetY + plant.gridY * cellSize + cellSize / 2;
      for (let si = 0; si < 8; si++) {
        particles.push({
          x: px, y: py,
          vx: rand(-1.5, 1.5), vy: rand(-2, -0.5),
          life: 1, maxLife: 1.5,
          size: rand(2, 4),
          color: { r: 255, g: 220, b: 50, a: 0.9 },
          type: 'sparkle' as any,
        });
      }
    }

    // Bloom
    if (type.category === 'flower' && plant.growth > 0.7) {
      plant.bloomPhase = clamp(plant.bloomPhase + dt * 0.02, 0, 1);
    }
  });

  // Aesthetic score
  garden.aestheticScore = garden.plants.reduce((sum, p) => {
    const type = getPlantType(p.typeId);
    return sum + (type ? Math.round(type.aestheticValue * p.growth * p.health) : 0);
  }, 0);
}

function updateParticles(dt: number): void {
  particles.forEach(p => {
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.vy += 0.05 * dt * 60;
    p.life -= dt / p.maxLife;
  });
  particles = particles.filter(p => p.life > 0);

  // Weather particles
  if (weather === 'rain' && screen === 'garden') {
    for (let i = 0; i < 3; i++) {
      particles.push({
        x: Math.random() * renderer.getWidth(),
        y: -10,
        vx: -0.5, vy: 4 + Math.random() * 3,
        life: 1, maxLife: 1.2,
        size: 2,
        color: { r: 150, g: 200, b: 255, a: 0.4 },
        type: 'rain',
      });
    }
  }

  // Season particles (leaves, petals)
  const season = getSeason();
  if ((season === 'autumn' || season === 'spring') && screen === 'garden' && Math.random() < 0.02) {
    particles.push({
      x: Math.random() * renderer.getWidth(),
      y: -10,
      vx: rand(-0.5, 0.5), vy: rand(0.3, 1),
      life: 1, maxLife: 3,
      size: rand(3, 6),
      color: season === 'autumn'
        ? { r: 200 + rand(0, 55), g: 100 + rand(0, 80), b: 20, a: 0.8 }
        : { r: 255, g: 180 + rand(0, 50), b: 200, a: 0.7 },
      type: season === 'autumn' ? 'leaf' : 'petal',
    });
  }
}

function updateWeather(): void {
  if (Math.random() < 0.0005) {
    const r = Math.random();
    weather = r < 0.4 ? 'clear' : r < 0.65 ? 'sunny' : r < 0.85 ? 'rain' : 'wind';
  }
}

// ==================== INPUT ====================
function getCellFromMouse(x: number, y: number): { gridX: number; gridY: number } | null {
  const cellSize = Math.min(renderer.getWidth() / GRID_W, (renderer.getHeight() - 120) / GRID_H);
  const offsetX = (renderer.getWidth() - GRID_W * cellSize) / 2;
  const offsetY = renderer.getHeight() * 0.35;
  const gx = Math.floor((x - offsetX) / cellSize);
  const gy = Math.floor((y - offsetY) / cellSize);
  if (gx >= 0 && gx < GRID_W && gy >= 0 && gy < GRID_H) return { gridX: gx, gridY: gy };
  return null;
}

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  // Check buttons
  for (const btn of buttons) {
    if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
      btn.action();
      return;
    }
  }

  if (screen === 'garden' && !showWelcomeTutorial) {
    const cell = getCellFromMouse(mx, my);
    if (cell) {
      if (selectedTool === 'plant') plantAt(cell.gridX, cell.gridY);
      else if (selectedTool === 'water') waterAt(cell.gridX, cell.gridY);
      else if (selectedTool === 'remove') removeAt(cell.gridX, cell.gridY);
    }
  }
});

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  mousePos = { x: mx, y: my };
  const cell = getCellFromMouse(mx, my);
  hoveredCell = cell;

  // Check if hovering over a planted plant
  hoveredPlantInfo = null;
  if (cell && screen === 'garden') {
    const plant = garden.plants.find(p => p.gridX === cell.gridX && p.gridY === cell.gridY);
    if (plant) {
      const cellSize = Math.min(renderer.getWidth() / GRID_W, (renderer.getHeight() - 120) / GRID_H);
      const offsetX = (renderer.getWidth() - GRID_W * cellSize) / 2;
      const offsetY = renderer.getHeight() * 0.35;
      hoveredPlantInfo = {
        plant,
        screenX: offsetX + cell.gridX * cellSize + cellSize / 2,
        screenY: offsetY + cell.gridY * cellSize,
      };
    }
  }
});

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const t = e.touches[0];
  canvas.dispatchEvent(new MouseEvent('click', { clientX: t.clientX, clientY: t.clientY }));
}, { passive: false });

// ==================== RENDERING ====================
function buildButtons(): void {
  buttons = [];
  const W = renderer.getWidth();
  const H = renderer.getHeight();

  if (screen === 'menu') {
    // Login button (top-right)
    buttons.push({ x: W - 52, y: 8, w: 44, h: 36, label: sdkLoggedIn ? '\u{1F464}' : '\u{1F512}', action: () => { handleSdkLogin(); } });
    buttons.push({ x: W / 2 - 100, y: H * 0.5, w: 200, h: 50, label: '\uD83C\uDF3F \uC815\uC6D0 \uC2DC\uC791', action: () => {
      if (!welcomeTutorialShown) {
        showWelcomeTutorial = true;
        welcomeTutorialShown = true;
        try { localStorage.setItem('whisper-garden-tutorial-shown', '1'); } catch { /* ignore */ }
      }
      screen = 'garden';
    } });
    buttons.push({ x: W / 2 - 100, y: H * 0.6, w: 200, h: 50, label: '\uD83D\uDCD6 \uC2DD\uBB3C \uB3C4\uAC10', action: () => { screen = 'catalog'; } });
  } else if (screen === 'garden') {
    const gap = 6;
    const buttonCount = 5;
    const totalGap = (buttonCount - 1) * gap;
    const bw = Math.min(70, (W - 20 - totalGap) / buttonCount);
    const bh = 44;
    const by = H - 52;
    const startX = W / 2 - (bw * 5 + gap * 4) / 2;

    const plantTypes = garden.unlockedPlants;
    // Tool buttons - selected tool gets highlighted color + border indicator
    buttons.push({ x: startX, y: by, w: bw, h: bh, label: selectedTool === 'plant' ? '\u25B6 \uD83C\uDF31 \uC2EC\uAE30' : '\uD83C\uDF31 \uC2EC\uAE30', color: selectedTool === 'plant' ? '#16a34a' : undefined, action: () => { selectedTool = 'plant'; } });
    buttons.push({ x: startX + bw + gap, y: by, w: bw, h: bh, label: selectedTool === 'water' ? '\u25B6 \uD83D\uDCA7 \uBB3C' : '\uD83D\uDCA7 \uBB3C', color: selectedTool === 'water' ? '#0891b2' : undefined, action: () => { selectedTool = 'water'; } });
    buttons.push({ x: startX + (bw + gap) * 2, y: by, w: bw, h: bh, label: selectedTool === 'remove' ? '\u25B6 \uD83D\uDDD1\uFE0F \uC81C\uAC70' : '\uD83D\uDDD1\uFE0F \uC81C\uAC70', color: selectedTool === 'remove' ? '#dc2626' : undefined, action: () => { selectedTool = 'remove'; } });
    buttons.push({ x: startX + (bw + gap) * 3, y: by, w: bw, h: bh, label: audioEnabled ? '\uD83D\uDD0A' : '\uD83D\uDD07', action: () => { audioEnabled = !audioEnabled; if (audioEnabled) audio.init(); } });
    buttons.push({ x: startX + (bw + gap) * 4, y: by, w: bw, h: bh, label: '\uD83C\uDFE0 \uBA54\uB274', action: () => { screen = 'menu'; showWelcomeTutorial = false; } });

    // Plant selector (top)
    if (selectedTool === 'plant') {
      const maxCards = W < 400 ? 4 : 6;
      const pw = 56, ph = 56;
      const pStartX = W / 2 - (pw * Math.min(plantTypes.length, maxCards) + gap * (Math.min(plantTypes.length, maxCards) - 1)) / 2;
      plantTypes.slice(0, maxCards).forEach((pid, i) => {
        const pt = getPlantType(pid);
        if (pt) {
          buttons.push({
            x: pStartX + i * (pw + gap), y: 8, w: pw, h: ph,
            label: pt.nameKo,
            color: selectedPlantId === pid ? '#86efac' : undefined,
            action: () => { selectedPlantId = pid; },
          });
        }
      });
      if (!selectedPlantId) selectedPlantId = plantTypes[0];
    }
  } else if (screen === 'catalog') {
    buttons.push({ x: W / 2 - 80, y: H - 60, w: 160, h: 44, label: '← 돌아가기', action: () => { screen = 'menu'; } });
  }
}

function render(): void {
  const W = renderer.getWidth();
  const H = renderer.getHeight();
  const tod = getTimeOfDay();
  const season = getSeason();
  const timeProgress = (gameTime % DAY_LENGTH) / DAY_LENGTH;

  renderer.clear();
  renderer.drawSky(tod, timeProgress, season);

  if (screen === 'menu') {
    renderer.drawGround(season, tod);
    renderer.drawTitle('🌿 속삭이는 정원', W / 2, H * 0.25, 36);
    renderer.drawText('평화로운 나만의 정원을 가꾸세요', W / 2, H * 0.35, 14, 'rgba(255,255,255,0.6)', 'center');
  } else if (screen === 'garden') {
    renderer.drawGround(season, tod);
    const cellSize = Math.min(W / GRID_W, (H - 120) / GRID_H);
    const offsetX = (W - GRID_W * cellSize) / 2;
    const offsetY = H * 0.35;
    renderer.drawGrid(GRID_W, GRID_H, cellSize, offsetX, offsetY, hoveredCell ? { x: hoveredCell.gridX, y: hoveredCell.gridY } : null);

    // Draw plants sorted by Y
    [...garden.plants].sort((a, b) => a.gridY - b.gridY).forEach(plant => {
      renderer.drawPlant(plant, cellSize, offsetX, offsetY, tod);
    });

    // HUD
    const seasonEmoji: Record<string, string> = { spring: '\uD83C\uDF38\uBD04', summer: '\u2600\uFE0F\uC5EC\uB984', autumn: '\uD83C\uDF42\uAC00\uC744', winter: '\u2744\uFE0F\uACA8\uC6B8' };
    renderer.drawText(`Day ${getDayNumber()} · ${tod} · ${seasonEmoji[season] || season}`, W / 2, H * 0.32, 12, 'rgba(255,255,255,0.5)', 'center');
    renderer.drawText(`🌱 ${garden.plants.length}  ⭐ ${garden.aestheticScore}  ${weather === 'rain' ? '🌧️' : weather === 'sunny' ? '☀️' : weather === 'wind' ? '💨' : '🌤️'}`, W / 2, H * 0.28, 13, 'rgba(255,255,255,0.7)', 'center');

    // Watering can cursor
    if (selectedTool === 'water' && hoveredCell) {
      const px = offsetX + hoveredCell.gridX * cellSize + cellSize / 2;
      const py = offsetY + hoveredCell.gridY * cellSize;
      renderer.drawWateringCan(px, py, false);
    }
  } else if (screen === 'catalog') {
    renderer.drawOverlay(0.7);
    renderer.drawTitle('\uD83D\uDCD6 \uC2DD\uBB3C \uB3C4\uAC10', W / 2, 50, 28);

    const RARITY_COLORS: Record<string, string> = {
      common: '#9ca3af',
      uncommon: '#4ade80',
      rare: '#60a5fa',
      legendary: '#fbbf24',
    };
    const CATEGORY_ICONS: Record<string, string> = {
      tree: '\uD83C\uDF33',
      flower: '\uD83C\uDF3A',
      bush: '\uD83C\uDF3F',
      mushroom: '\uD83C\uDF44',
      vine: '\uD83C\uDF3E',
      grass: '\uD83C\uDF3E',
    };

    const cardW = Math.min(140, (W - 40) / 3 - 10);
    const cardH = 100;
    const cols = Math.max(2, Math.min(3, Math.floor((W - 20) / (cardW + 10))));

    PLANT_TYPES.forEach((pt, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const totalW = cols * cardW + (cols - 1) * 10;
      const startX = (W - totalW) / 2;
      const x = startX + col * (cardW + 10);
      const y = 90 + row * (cardH + 10);
      const unlocked = garden.unlockedPlants.includes(pt.id);

      // Card panel with rarity border
      const rarityColor = RARITY_COLORS[pt.rarity] || '#555';
      renderer.drawPanel(x, y, cardW, cardH, unlocked ? 0.45 : 0.15);

      if (unlocked) {
        // Category icon
        const icon = CATEGORY_ICONS[pt.category] || '\uD83C\uDF3F';
        renderer.drawText(icon, x + 16, y + 22, 20, 'white', 'center');

        // Plant name
        renderer.drawText(pt.nameKo, x + cardW / 2 + 8, y + 22, 13, 'white', 'center');

        // Growth time
        const growthMins = Math.round(pt.growthTime / 60);
        const growthLabel = growthMins >= 1 ? `${growthMins}m` : `${pt.growthTime}s`;
        renderer.drawText(`\u23F1 ${growthLabel}`, x + 10, y + 46, 10, 'rgba(255,255,255,0.6)', 'left');

        // Water need
        const waterBars = Math.round(pt.waterNeed * 5);
        const waterStr = '\uD83D\uDCA7'.repeat(waterBars) + '\u25CB'.repeat(5 - waterBars);
        renderer.drawText(waterStr, x + 10, y + 62, 8, 'rgba(255,255,255,0.5)', 'left');

        // Rarity tag
        renderer.drawText(pt.rarity.toUpperCase(), x + cardW - 10, y + 46, 9, rarityColor, 'right');

        // Aesthetic value
        renderer.drawText(`\u2B50${pt.aestheticValue}`, x + cardW - 10, y + 62, 10, '#fbbf24', 'right');

        // Season bonus
        if (pt.seasonBonus) {
          const seasonIcons: Record<string, string> = { spring: '\uD83C\uDF38', summer: '\u2600\uFE0F', autumn: '\uD83C\uDF42', winter: '\u2744\uFE0F' };
          renderer.drawText(seasonIcons[pt.seasonBonus] || '', x + 10, y + cardH - 14, 10, 'rgba(255,255,255,0.5)', 'left');
        }

        // Rarity indicator line at bottom
        renderer.drawText('\u2500'.repeat(Math.floor(cardW / 8)), x + cardW / 2, y + cardH - 4, 6, rarityColor, 'center');
      } else {
        renderer.drawText('???', x + cardW / 2, y + 30, 18, '#444', 'center');
        renderer.drawText('\uD83D\uDD12 \uBBF8\uD574\uAE08', x + cardW / 2, y + 55, 10, '#555', 'center');
      }
    });
  }

  renderer.drawWeatherOverlay(weather, tod);
  renderer.drawAmbientParticles(tod);
  renderer.drawParticles(particles);
  buttons.forEach(btn => renderer.drawButton(btn));

  // --- Plant info tooltip on hover (fade in over 0.2s) ---
  if (hoveredPlantInfo && screen === 'garden' && tooltipOpacity > 0.01) {
    const p = hoveredPlantInfo.plant;
    const type = getPlantType(p.typeId);
    if (type) {
      const ttW = 160;
      const ttH = 72;
      let ttX = hoveredPlantInfo.screenX - ttW / 2;
      let ttY = hoveredPlantInfo.screenY - ttH - 10;
      // Clamp to screen
      if (ttX < 4) ttX = 4;
      if (ttX + ttW > W - 4) ttX = W - ttW - 4;
      if (ttY < 4) ttY = hoveredPlantInfo.screenY + 40;

      renderer.drawPanel(ttX, ttY, ttW, ttH, 0.85 * tooltipOpacity);
      renderer.drawText(type.nameKo, ttX + ttW / 2, ttY + 16, 13, `rgba(255,255,255,${tooltipOpacity})`, 'center');
      const growthPct = Math.round(p.growth * 100);
      const waterPct = Math.round(p.water * 100);
      renderer.drawText(`\uC131\uC7A5: ${growthPct}%`, ttX + 10, ttY + 36, 11, growthPct >= 100 ? `rgba(74,222,128,${tooltipOpacity})` : `rgba(255,255,255,${tooltipOpacity * 0.7})`, 'left');
      renderer.drawText(`\uC218\uBD84: ${waterPct}%`, ttX + 10, ttY + 52, 11, waterPct < 20 ? `rgba(239,68,68,${tooltipOpacity})` : `rgba(255,255,255,${tooltipOpacity * 0.7})`, 'left');
      // Mini progress bars
      renderer.drawProgressBar(ttX + 70, ttY + 31, 80, 6, p.growth, { h: 120, s: 60, l: 50 });
      renderer.drawProgressBar(ttX + 70, ttY + 47, 80, 6, p.water, { h: 200, s: 70, l: 55 });
    }
  }

  // --- Toast notifications ---
  const now = performance.now() / 1000;
  toasts = toasts.filter(t => (now - t.time) < t.duration);
  toasts.forEach((t, i) => {
    const elapsed = now - t.time;
    const fadeIn = Math.min(1, elapsed * 4);
    const fadeOut = Math.max(0, 1 - (elapsed - t.duration + 0.5) * 2);
    const alpha = Math.min(fadeIn, fadeOut);
    const yOffset = H * 0.18 + i * 36;

    renderer.drawPanel(W / 2 - 130, yOffset - 14, 260, 30, 0.7 * alpha);
    renderer.drawText(t.message, W / 2, yOffset + 2, 13, `rgba(255,255,255,${alpha * 0.9})`, 'center');
  });

  // --- Welcome tutorial overlay ---
  if (showWelcomeTutorial && screen === 'garden') {
    renderer.drawOverlay(0.75);

    const panelW = Math.min(340, W * 0.85);
    const panelH = 300;
    const panelX = (W - panelW) / 2;
    const panelY = (H - panelH) / 2;
    renderer.drawPanel(panelX, panelY, panelW, panelH, 0.9);

    renderer.drawText('\uD83C\uDF3F \uC18D\uC0AD\uC774\uB294 \uC815\uC6D0 \uC548\uB0B4', W / 2, panelY + 30, 20, '#4ade80', 'center');

    const tutorialLines = [
      '\uC2DD\uBB3C\uC744 \uC120\uD0DD\uD558\uACE0 \uC815\uC6D0\uC5D0 \uC2EC\uC73C\uC138\uC694 \uD83C\uDF31',
      '\uBB3C\uC744 \uC8FC\uBA74 \uBE60\uB974\uAC8C \uC790\uB77D\uB2C8\uB2E4 \uD83D\uDCA7',
      '\uACC4\uC808\uC5D0 \uB530\uB77C \uC131\uC7A5 \uC18D\uB3C4\uAC00 \uB2EC\uB77C\uC838\uC694 \uD83C\uDF38\u2600\uFE0F\uD83C\uDF42\u2744\uFE0F',
      '\uBBF8\uC801 \uC810\uC218\uB97C \uB192\uC5EC\uBCF4\uC138\uC694 \u2B50',
    ];

    tutorialLines.forEach((line, i) => {
      renderer.drawText(line, W / 2, panelY + 70 + i * 40, 14, 'rgba(255,255,255,0.85)', 'center');
    });

    // Close button
    const closeBtnW = 160;
    const closeBtnH = 42;
    const closeBtnX = W / 2 - closeBtnW / 2;
    const closeBtnY = panelY + panelH - 60;
    buttons.push({
      x: closeBtnX, y: closeBtnY, w: closeBtnW, h: closeBtnH,
      label: '\uC2DC\uC791\uD558\uAE30!',
      color: '#16a34a',
      action: () => { showWelcomeTutorial = false; },
    });
    renderer.drawButton(buttons[buttons.length - 1]);
  }
}

// ==================== GAME LOOP ====================
let lastTime = performance.now();

function gameLoop(now: number): void {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  gameTime += dt * TIME_SPEED * 60; // Accelerated time
  toastTime = now / 1000;

  if (screen === 'garden') {
    updatePlants(dt * TIME_SPEED * 60);
    updateWeather();
    // Periodically submit score to SDK (every 60s if score changed)
    submitGardenScore();

    // Season change notification
    const currentSeason = getSeason();
    if (lastSeason && lastSeason !== currentSeason) {
      const seasonNames: Record<string, string> = {
        spring: '\uD83C\uDF38 \uBD04\uC774 \uC654\uC5B4\uC694',
        summer: '\u2600\uFE0F \uC5EC\uB984\uC774 \uC654\uC5B4\uC694',
        autumn: '\uD83C\uDF42 \uAC00\uC744\uC774 \uC654\uC5B4\uC694',
        winter: '\u2744\uFE0F \uACA8\uC6B8\uC774 \uC654\uC5B4\uC694',
      };
      addToast(seasonNames[currentSeason] || `${currentSeason} \uACC4\uC808`);
    }
    lastSeason = currentSeason;
  }
  updateParticles(dt);

  // Tooltip fade-in (0.2s)
  tooltipTarget = hoveredPlantInfo ? 1 : 0;
  tooltipOpacity += (tooltipTarget - tooltipOpacity) * Math.min(1, dt / 0.2);
  if (tooltipOpacity < 0.01) tooltipOpacity = 0;

  if (audioEnabled) {
    audio.update(weather, getTimeOfDay());
    // Shift ambient tone with time of day
    audio.setAmbientTone(getTimeOfDay());
  }

  buildButtons();
  render();
  requestAnimationFrame(gameLoop);
}

// ==================== LOAD / SAVE ====================
function loadSave(): void {
  const saved = localStorage.getItem('whisper-garden-save');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      garden = { ...garden, ...data.garden };
      gameTime = data.gameTime || 0;
      nextPlantId = data.nextPlantId || 1;
    } catch {}
  }
  try {
    welcomeTutorialShown = localStorage.getItem('whisper-garden-tutorial-shown') === '1';
  } catch {}
}

function save(): void {
  localStorage.setItem('whisper-garden-save', JSON.stringify({ garden, gameTime, nextPlantId, updatedAt: Date.now() }));
}

setInterval(save, 10000);

// Cloud save every 60s (same interval as score submission)
setInterval(() => {
  if (screen === 'garden') {
    cloudSaveGarden();
  }
}, 60000);

// ==================== START ====================
loadSave();
requestAnimationFrame(gameLoop);
