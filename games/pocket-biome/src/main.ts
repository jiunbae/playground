/**
 * Pocket Biome - Main Entry Point
 * AI organisms evolve autonomously in a pocket ecosystem
 */

import { PlaygroundSDK } from '@playground/sdk';
import {
  Creature, Plant, Fence, SpeciesType, Camera, JournalEntry, Discovery,
  PopulationSnapshot, SPECIES_CONFIG, CATEGORY_COLORS, CreatureCategory,
  BehaviorState, TerrainType,
} from './types';
import { TerrainMap, WORLD_SIZE, TILE_SIZE, TERRAIN_COLORS } from './terrain';
import { createCreature, updateCreature, generateNickname } from './creatures';

// Initialize Playground SDK
let __sdk: InstanceType<typeof PlaygroundSDK> | null = null;
try {
  __sdk = PlaygroundSDK.init({ apiUrl: 'https://api.jiun.dev', game: 'pocket-biome' });
} catch (_) {
  // SDK init failed — game continues without it
}

// ==================== CANVAS SETUP ====================
const canvas = document.createElement('canvas');
canvas.style.cssText = 'display:block;width:100%;height:100%';
document.getElementById('app')?.appendChild(canvas)
  ?? document.body.appendChild(canvas);
const ctx = canvas.getContext('2d')!;

function resize() {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}
resize();
addEventListener('resize', resize);

// ==================== GAME STATE ====================
let screen: 'menu' | 'sim' | 'journal' | 'discovery' = 'menu';
let terrain: TerrainMap;
let creatures: Creature[] = [];
let plants: Plant[] = [];
let fences: Fence[] = [];
let camera: Camera = { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2, zoom: 1 };
let simSpeed = 1;
let gameTime = 0;
let dayLength = 300; // seconds per day
let journal: JournalEntry[] = [];
let discoveries: Discovery[] = [];
let discoverySet = new Set<string>();
let popHistory: PopulationSnapshot[] = [];
let selected: Creature | null = null;
let nextPlantId = 1;
let tool: 'observe' | 'food' | 'fence' | 'species' = 'observe';
let dragging = false;
let dragStart = { x: 0, y: 0 };
let camDragStart = { x: 0, y: 0 };

// ==================== NEW UI STATE ====================
let showTutorial = false;
let tutorialAlpha = 1;
let tutorialTimer = 0;
const TUTORIAL_DURATION = 8; // seconds

let showJournalOverlay = false;
let journalScrollOffset = 0;

let showStatsOverlay = false;

// Floating notifications
interface FloatingNotification {
  text: string;
  x: number;
  y: number;
  alpha: number;
  timer: number;
  color: string;
}
let floatingNotifications: FloatingNotification[] = [];

// Extinction warnings
interface ExtinctionWarning {
  species: string;
  timer: number;
  alpha: number;
}
let extinctionWarnings: ExtinctionWarning[] = [];

// Track previously known species for extinction detection
let previousSpeciesSet = new Set<SpeciesType>();

// ==================== SEEDED RNG ====================
let rngState = Date.now();
function rng(): number {
  rngState = (rngState * 1664525 + 1013904223) & 0xFFFFFFFF;
  return (rngState >>> 0) / 0xFFFFFFFF;
}

// ==================== HELPERS ====================
function getCurrentDay(): number { return Math.floor(gameTime / dayLength) + 1; }
function getDayTime(): number { return (gameTime % dayLength) / dayLength; }
function getTimeLabel(): string {
  const dt = getDayTime();
  if (dt < 0.2) return '\uc0c8\ubcbd';
  if (dt < 0.4) return '\uc544\uce68';
  if (dt < 0.6) return '\ub0ae';
  if (dt < 0.8) return '\uc800\ub141';
  return '\ubc24';
}

function addJournal(text: string) {
  journal.unshift({ day: getCurrentDay(), time: getTimeLabel(), text });
  if (journal.length > 100) journal.pop();
}

function addDiscovery(id: string, title: string, desc: string, cat: Discovery['category'], icon: string, color: string) {
  if (discoverySet.has(id)) return;
  discoverySet.add(id);
  discoveries.unshift({ id, title, description: desc, day: getCurrentDay(), category: cat, icon, color });
  addJournal(`\uD83D\uDD2C \uc0c8 \ubc1c\uacac: ${title}`);
}

function addFloatingNotification(text: string, worldX: number, worldY: number, color: string = '#fff') {
  const sc = worldToScreen(worldX, worldY);
  floatingNotifications.push({
    text,
    x: sc.x,
    y: sc.y,
    alpha: 1,
    timer: 2.0,
    color,
  });
}

function addExtinctionWarning(species: string) {
  extinctionWarnings.push({
    species,
    timer: 4.0,
    alpha: 1,
  });
}

function spawnPlant(x: number, y: number) {
  const t = terrain.getTile(x, y);
  if (t === TerrainType.Water || t === TerrainType.Mountain) return;
  plants.push({
    id: nextPlantId++,
    pos: { x, y },
    energy: 20 + rng() * 30,
    maxEnergy: 50,
    growthRate: 0.5 + rng() * 0.5,
    size: 1 + rng() * 2,
    terrain: t,
  });
}

// ==================== SAVE/LOAD ====================
function hasSavedData(): boolean {
  return localStorage.getItem('pocket_biome_save') !== null;
}

function saveGame() {
  const data = {
    creatures: creatures.map(c => ({ ...c })),
    plants: plants.map(p => ({ ...p })),
    camera,
    simSpeed,
    gameTime,
    journal,
    discoveries,
    discoveryIds: Array.from(discoverySet),
    popHistory,
    nextPlantId,
    rngState,
  };
  localStorage.setItem('pocket_biome_save', JSON.stringify(data));
}

function loadGame(): boolean {
  const raw = localStorage.getItem('pocket_biome_save');
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    terrain = new TerrainMap(0); // Will be overwritten by creature positions
    creatures = data.creatures || [];
    plants = data.plants || [];
    fences = [];
    camera = data.camera || { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2, zoom: 1 };
    simSpeed = data.simSpeed || 1;
    gameTime = data.gameTime || 0;
    journal = data.journal || [];
    discoveries = data.discoveries || [];
    discoverySet = new Set(data.discoveryIds || []);
    popHistory = data.popHistory || [];
    nextPlantId = data.nextPlantId || 1;
    rngState = data.rngState || Date.now();
    // Rebuild terrain
    terrain = new TerrainMap(0);
    return true;
  } catch {
    return false;
  }
}

// ==================== INIT SIMULATION ====================
function initSimulation() {
  terrain = new TerrainMap(Math.floor(rng() * 100000));
  creatures = [];
  plants = [];
  fences = [];
  journal = [];
  discoveries = [];
  discoverySet.clear();
  popHistory = [];
  gameTime = 0;
  nextPlantId = 1;
  previousSpeciesSet.clear();
  floatingNotifications = [];
  extinctionWarnings = [];

  // Scatter initial plants
  for (let i = 0; i < 200; i++) {
    spawnPlant(rng() * WORLD_SIZE, rng() * WORLD_SIZE);
  }

  // Initial creatures
  const spawns: [SpeciesType, number][] = [
    [SpeciesType.Rabbit, 15],
    [SpeciesType.Deer, 8],
    [SpeciesType.Mouse, 12],
    [SpeciesType.Wolf, 4],
    [SpeciesType.Fox, 5],
    [SpeciesType.Eagle, 3],
    [SpeciesType.Butterfly, 10],
    [SpeciesType.Bee, 8],
    [SpeciesType.Frog, 6],
    [SpeciesType.Fish, 10],
  ];
  for (const [species, count] of spawns) {
    const config = SPECIES_CONFIG[species];
    for (let i = 0; i < count; i++) {
      let x: number, y: number, attempts = 0;
      do {
        x = rng() * WORLD_SIZE;
        y = rng() * WORLD_SIZE;
        attempts++;
      } while (attempts < 50 && !config.preferredTerrain.includes(terrain.getTile(x, y)));
      creatures.push(createCreature(species, { x, y }, rng, 0, undefined, 0));
    }
    previousSpeciesSet.add(species);
    addDiscovery(`species_${species}`, `${species} \ubc1c\uacac!`, `${species}\uc774(\uac00) \uc0dd\ud0dc\uacc4\uc5d0 \uc874\uc7ac\ud569\ub2c8\ub2e4`, 'species', config.symbol, config.color);
  }

  addJournal('\uc0c8\ub85c\uc6b4 \uc0dd\ud0dc\uacc4 \uc2dc\ubbac\ub808\uc774\uc158\uc774 \uc2dc\uc791\ub418\uc5c8\uc2b5\ub2c8\ub2e4!');

  // Show tutorial
  showTutorial = true;
  tutorialAlpha = 1;
  tutorialTimer = TUTORIAL_DURATION;
}

// ==================== UPDATE ====================
function update(dt: number) {
  // Update tutorial timer
  if (showTutorial) {
    tutorialTimer -= dt;
    if (tutorialTimer <= 1) {
      tutorialAlpha = Math.max(0, tutorialTimer);
    }
    if (tutorialTimer <= 0) {
      showTutorial = false;
    }
  }

  // Update floating notifications
  floatingNotifications.forEach(n => {
    n.timer -= dt;
    n.y -= 20 * dt;
    if (n.timer <= 0.5) n.alpha = Math.max(0, n.timer * 2);
  });
  floatingNotifications = floatingNotifications.filter(n => n.timer > 0);

  // Update extinction warnings
  extinctionWarnings.forEach(w => {
    w.timer -= dt;
    if (w.timer <= 1) w.alpha = Math.max(0, w.timer);
  });
  extinctionWarnings = extinctionWarnings.filter(w => w.timer > 0);

  if (simSpeed === 0) return;
  const scaledDt = dt * simSpeed;
  gameTime += scaledDt;

  // Auto-save every 60 game-seconds
  if (Math.floor(gameTime / 60) > Math.floor((gameTime - scaledDt) / 60)) {
    saveGame();
  }

  // Update plants (regrow)
  plants.forEach(p => {
    p.energy = Math.min(p.maxEnergy, p.energy + p.growthRate * scaledDt * 0.1);
    p.size = Math.min(4, p.size + 0.001 * scaledDt);
  });
  plants = plants.filter(p => p.energy > 0);
  if (rng() < 0.05 * scaledDt) spawnPlant(rng() * WORLD_SIZE, rng() * WORLD_SIZE);

  // Update creatures
  const newCreatures: Creature[] = [];
  for (const c of creatures) {
    if (!c.alive) continue;
    const result = updateCreature(c, creatures, plants, terrain, fences, scaledDt, rng, getDayTime(), getCurrentDay());
    if (result.born) newCreatures.push(result.born);
    if (result.journalEvent) addJournal(result.journalEvent);
    if (result.discoveryEvent) addDiscovery(result.discoveryEvent.id, result.discoveryEvent.title, result.discoveryEvent.desc, 'behavior', '\uD83D\uDD2C', '#4ade80');
  }
  creatures.push(...newCreatures);

  // Remove dead - with floating death notifications
  const deadCreatures = creatures.filter(c => !c.alive);
  deadCreatures.forEach(c => {
    const name = c.nickname || `${c.species}#${c.id}`;
    addJournal(`\uD83D\uDC80 ${name} \uc0ac\ub9dd (${Math.round(c.age)}\uc77c, ${c.generation}\uc138\ub300)`);
    addFloatingNotification(`\uD83D\uDC80 ${name} \uc0ac\ub9dd`, c.pos.x, c.pos.y, '#ef4444');
  });
  creatures = creatures.filter(c => c.alive);

  // Extinction check
  const speciesCounts = new Map<SpeciesType, number>();
  creatures.forEach(c => speciesCounts.set(c.species, (speciesCounts.get(c.species) || 0) + 1));

  // Track current species for extinction detection
  const currentSpeciesSet = new Set<SpeciesType>();
  creatures.forEach(c => currentSpeciesSet.add(c.species));

  for (const species of Object.values(SpeciesType)) {
    if (!speciesCounts.has(species) && previousSpeciesSet.has(species)) {
      addDiscovery(`extinct_${species}`, `${species} \uba78\uc885!`, `${species}\uc774(\uac00) \uc0dd\ud0dc\uacc4\uc5d0\uc11c \uc0ac\ub77c\uc84c\uc2b5\ub2c8\ub2e4`, 'event', '\u26a0\ufe0f', '#ef4444');
      addExtinctionWarning(species);
      previousSpeciesSet.delete(species);
    }
  }
  // Add any newly appeared species
  currentSpeciesSet.forEach(s => previousSpeciesSet.add(s));

  // Population snapshot (every 30 game-seconds)
  if (Math.floor(gameTime / 30) > Math.floor((gameTime - scaledDt) / 30)) {
    const counts = {} as Record<SpeciesType, number>;
    for (const s of Object.values(SpeciesType)) counts[s] = speciesCounts.get(s) || 0;
    popHistory.push({ day: getCurrentDay(), counts, total: creatures.length });
    if (popHistory.length > 200) popHistory.shift();
  }
}

// ==================== RENDER ====================
function worldToScreen(wx: number, wy: number): { x: number; y: number } {
  return {
    x: (wx - camera.x) * camera.zoom + canvas.width / 2,
    y: (wy - camera.y) * camera.zoom + canvas.height / 2,
  };
}

function screenToWorld(sx: number, sy: number): { x: number; y: number } {
  return {
    x: (sx - canvas.width / 2) / camera.zoom + camera.x,
    y: (sy - canvas.height / 2) / camera.zoom + camera.y,
  };
}

function getBehaviorIcon(state: BehaviorState): string {
  switch (state) {
    case BehaviorState.Idle: return '\uD83D\uDCA4';
    case BehaviorState.Wander: return '\uD83D\uDEB6';
    case BehaviorState.SeekFood: return '\uD83D\uDD0D';
    case BehaviorState.Eating: return '\uD83C\uDF7D\uFE0F';
    case BehaviorState.Flee: return '\uD83C\uDFC3';
    case BehaviorState.Hunt: return '\uD83D\uDDE1\uFE0F';
    case BehaviorState.Reproduce: return '\u2764\uFE0F';
    case BehaviorState.Rest: return '\uD83D\uDE34';
    default: return '\u2753';
  }
}

function getHungerLabel(creature: Creature): { text: string; color: string } {
  const ratio = creature.energy / creature.maxEnergy;
  if (ratio > 0.7) return { text: '\uD3EC\ub9CC', color: '#4ade80' };
  if (ratio > 0.4) return { text: '\ubcf4\ud1b5', color: '#fbbf24' };
  if (ratio > 0.15) return { text: '\ubc30\uace0\ud514', color: '#f97316' };
  return { text: '\uAD49\uc8FC\ub9bc', color: '#ef4444' };
}

function drawBar(x: number, y: number, w: number, h: number, ratio: number, color: string, bgColor: string = '#1a1a1a') {
  ctx.fillStyle = bgColor;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, ratio)), h);
  ctx.strokeStyle = '#3a3a3a';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x, y, w, h);
}

// ==================== CREATURE SHAPES ====================
function drawCreatureShape(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number,
  species: SpeciesType,
  vel: { x: number; y: number }
) {
  const s = size;
  const facing = Math.atan2(vel.y, vel.x);

  switch (species) {
    case SpeciesType.Rabbit: {
      // Oval body
      ctx.beginPath();
      ctx.ellipse(x, y, s * 0.9, s * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
      // Two ear lines
      ctx.beginPath();
      ctx.moveTo(x - s * 0.3, y - s * 0.9);
      ctx.lineTo(x - s * 0.15, y - s * 1.8);
      ctx.moveTo(x + s * 0.3, y - s * 0.9);
      ctx.lineTo(x + s * 0.15, y - s * 1.8);
      ctx.stroke();
      break;
    }
    case SpeciesType.Deer: {
      // Larger oval body
      ctx.beginPath();
      ctx.ellipse(x, y, s * 1.3, s * 1.0, 0, 0, Math.PI * 2);
      ctx.fill();
      // Antler lines
      ctx.beginPath();
      ctx.moveTo(x - s * 0.3, y - s);
      ctx.lineTo(x - s * 0.6, y - s * 2);
      ctx.lineTo(x - s * 1, y - s * 2.2);
      ctx.moveTo(x - s * 0.6, y - s * 2);
      ctx.lineTo(x - s * 0.3, y - s * 2.4);
      ctx.moveTo(x + s * 0.3, y - s);
      ctx.lineTo(x + s * 0.6, y - s * 2);
      ctx.lineTo(x + s * 1, y - s * 2.2);
      ctx.moveTo(x + s * 0.6, y - s * 2);
      ctx.lineTo(x + s * 0.3, y - s * 2.4);
      ctx.stroke();
      break;
    }
    case SpeciesType.Wolf: {
      // Angular body shape (diamond-ish)
      ctx.beginPath();
      ctx.moveTo(x, y - s * 1.3);
      ctx.lineTo(x + s * 1.1, y - s * 0.2);
      ctx.lineTo(x + s * 0.8, y + s * 1.0);
      ctx.lineTo(x - s * 0.8, y + s * 1.0);
      ctx.lineTo(x - s * 1.1, y - s * 0.2);
      ctx.closePath();
      ctx.fill();
      // Ears
      ctx.beginPath();
      ctx.moveTo(x - s * 0.5, y - s * 1.1);
      ctx.lineTo(x - s * 0.7, y - s * 1.7);
      ctx.moveTo(x + s * 0.5, y - s * 1.1);
      ctx.lineTo(x + s * 0.7, y - s * 1.7);
      ctx.stroke();
      break;
    }
    case SpeciesType.Fox: {
      // Triangular face shape
      ctx.beginPath();
      ctx.moveTo(x, y - s * 1.4);
      ctx.lineTo(x + s * 1.0, y + s * 0.8);
      ctx.lineTo(x, y + s * 0.5);
      ctx.lineTo(x - s * 1.0, y + s * 0.8);
      ctx.closePath();
      ctx.fill();
      // Snout
      ctx.beginPath();
      ctx.moveTo(x, y + s * 0.5);
      ctx.lineTo(x, y + s * 1.2);
      ctx.stroke();
      break;
    }
    case SpeciesType.Eagle: {
      // V-wing shape
      ctx.beginPath();
      ctx.moveTo(x, y - s * 0.4);
      ctx.lineTo(x - s * 2.0, y - s * 1.2);
      ctx.lineTo(x - s * 0.6, y);
      ctx.lineTo(x, y + s * 0.8);
      ctx.lineTo(x + s * 0.6, y);
      ctx.lineTo(x + s * 2.0, y - s * 1.2);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case SpeciesType.Fish: {
      // Fish ellipse with tail
      ctx.beginPath();
      ctx.ellipse(x, y, s * 1.3, s * 0.6, facing, 0, Math.PI * 2);
      ctx.fill();
      // Tail fin
      const tx = x - Math.cos(facing) * s * 1.3;
      const ty = y - Math.sin(facing) * s * 1.3;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx - Math.cos(facing + 0.6) * s, ty - Math.sin(facing + 0.6) * s);
      ctx.lineTo(tx - Math.cos(facing - 0.6) * s, ty - Math.sin(facing - 0.6) * s);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case SpeciesType.Butterfly: {
      // Figure-8 wing shape
      ctx.beginPath();
      ctx.ellipse(x - s * 0.6, y - s * 0.3, s * 0.8, s * 0.6, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + s * 0.6, y - s * 0.3, s * 0.8, s * 0.6, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x - s * 0.4, y + s * 0.5, s * 0.5, s * 0.4, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + s * 0.4, y + s * 0.5, s * 0.5, s * 0.4, 0.3, 0, Math.PI * 2);
      ctx.fill();
      // Body line
      ctx.beginPath();
      ctx.moveTo(x, y - s * 0.8);
      ctx.lineTo(x, y + s * 0.9);
      ctx.stroke();
      break;
    }
    case SpeciesType.Bee: {
      // Striped oval
      ctx.beginPath();
      ctx.ellipse(x, y, s * 1.0, s * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      // Black stripes
      ctx.strokeStyle = '#333';
      ctx.lineWidth = Math.max(1, s * 0.25);
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * s * 0.4, y - s * 0.6);
        ctx.lineTo(x + i * s * 0.4, y + s * 0.6);
        ctx.stroke();
      }
      // Reset stroke
      ctx.strokeStyle = SPECIES_CONFIG[species].color;
      ctx.lineWidth = Math.max(1, 1.2 * camera.zoom);
      break;
    }
    case SpeciesType.Frog: {
      // Wide squat oval
      ctx.beginPath();
      ctx.ellipse(x, y, s * 1.2, s * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x - s * 0.6, y - s * 0.5, s * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + s * 0.6, y - s * 0.5, s * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(x - s * 0.6, y - s * 0.5, s * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + s * 0.6, y - s * 0.5, s * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = SPECIES_CONFIG[species].color;
      break;
    }
    case SpeciesType.Mouse: {
      // Small oval + round ears
      ctx.beginPath();
      ctx.ellipse(x, y, s * 0.8, s * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Round ears
      ctx.beginPath();
      ctx.arc(x - s * 0.6, y - s * 0.6, s * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + s * 0.6, y - s * 0.6, s * 0.4, 0, Math.PI * 2);
      ctx.fill();
      // Tail
      ctx.beginPath();
      ctx.moveTo(x, y + s * 0.5);
      ctx.quadraticCurveTo(x + s * 1.2, y + s * 1.5, x + s * 1.5, y + s * 0.5);
      ctx.stroke();
      break;
    }
    default: {
      ctx.beginPath();
      ctx.arc(x, y, s, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ==================== TILE NOISE HASH ====================
function tileHash(tx: number, ty: number): number {
  let h = tx * 374761393 + ty * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return (h & 0xFFFF) / 0xFFFF;
}

function render() {
  const W = canvas.width, H = canvas.height;
  const dt = getDayTime();
  const brightness = dt < 0.2 ? 0.4 + dt * 3 : dt < 0.6 ? 1 : dt < 0.8 ? 1 - (dt - 0.6) * 3 : 0.3;

  ctx.fillStyle = `rgb(${Math.round(10 * brightness)},${Math.round(25 * brightness)},${Math.round(18 * brightness)})`;
  ctx.fillRect(0, 0, W, H);

  // Day/night sky band at top (only in sim)
  if (screen === 'sim') {
    const skyH = Math.min(50, H * 0.06);
    const skyGrad = ctx.createLinearGradient(0, 0, 0, skyH);
    if (dt < 0.2) {
      // Dawn - orange tint
      const dawnT = dt / 0.2;
      skyGrad.addColorStop(0, `rgba(${60 + Math.round(120 * dawnT)},${30 + Math.round(50 * dawnT)},${60 - Math.round(40 * dawnT)},0.7)`);
      skyGrad.addColorStop(1, 'rgba(0,0,0,0)');
    } else if (dt < 0.6) {
      // Day - light blue
      skyGrad.addColorStop(0, 'rgba(80,140,200,0.3)');
      skyGrad.addColorStop(1, 'rgba(0,0,0,0)');
    } else if (dt < 0.8) {
      // Dusk - orange tint
      const duskT = (dt - 0.6) / 0.2;
      skyGrad.addColorStop(0, `rgba(${180 - Math.round(100 * duskT)},${80 - Math.round(40 * duskT)},${20 + Math.round(40 * duskT)},0.6)`);
      skyGrad.addColorStop(1, 'rgba(0,0,0,0)');
    } else {
      // Night - dark blue
      skyGrad.addColorStop(0, 'rgba(10,15,40,0.8)');
      skyGrad.addColorStop(1, 'rgba(0,0,0,0)');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, skyH);

    // Stars at night
    if (brightness < 0.5) {
      const starAlpha = (0.5 - brightness) * 2;
      ctx.fillStyle = `rgba(255,255,240,${starAlpha * 0.8})`;
      for (let i = 0; i < 30; i++) {
        const sx = tileHash(i * 7, 999) * W;
        const sy = tileHash(i * 13, 777) * skyH * 1.5;
        const twinkle = Math.sin(gameTime * (1 + tileHash(i, i) * 2) + i) * 0.3 + 0.7;
        ctx.globalAlpha = starAlpha * twinkle * 0.8;
        ctx.beginPath();
        ctx.arc(sx, sy, 1 + tileHash(i, i + 1) * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  if (screen === 'menu') {
    ctx.textAlign = 'center';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillStyle = '#4ade80';
    ctx.fillText('\uD83C\uDF0D \ud3ec\ucf13 \ubc14\uc774\uc634', W / 2, H * 0.3);
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#5a8a6a';
    ctx.fillText('AI \uc0dd\ubb3c\ub4e4\uc774 \uc790\uc728\uc801\uc73c\ub85c \uc9c4\ud654\ud558\ub294 \uc0dd\ud0dc\uacc4', W / 2, H * 0.38);

    drawButton(W / 2 - 100, H * 0.5, 200, 50, '\uD83C\uDF31 \uc0c8 \uc2dc\ubbac\ub808\uc774\uc158', '#22c55e');

    // "Continue" button if save data exists
    if (hasSavedData()) {
      drawButton(W / 2 - 100, H * 0.5 + 65, 200, 50, '\u25B6 \uc774\uc5b4\ud558\uae30', '#1a6a3a');
    }

    // Login button
    const loginY = hasSavedData() ? H * 0.5 + 130 : H * 0.5 + 65;
    try {
      const user = __sdk?.auth.getUser();
      const loginLabel = user ? `\uD83D\uDC64 ${user.name}` : '\uD83D\uDD11 \ub85c\uadf8\uc778';
      drawButton(W / 2 - 100, loginY, 200, 50, loginLabel, '#334433');
    } catch (_) {
      drawButton(W / 2 - 100, loginY, 200, 50, '\uD83D\uDD11 \ub85c\uadf8\uc778', '#334433');
    }
    return;
  }

  // Render terrain
  const startWX = camera.x - W / 2 / camera.zoom;
  const startWY = camera.y - H / 2 / camera.zoom;
  const endWX = camera.x + W / 2 / camera.zoom;
  const endWY = camera.y + H / 2 / camera.zoom;

  const tileStart = { x: Math.max(0, Math.floor(startWX / TILE_SIZE)), y: Math.max(0, Math.floor(startWY / TILE_SIZE)) };
  const tileEnd = { x: Math.min(Math.floor(WORLD_SIZE / TILE_SIZE), Math.ceil(endWX / TILE_SIZE)), y: Math.min(Math.floor(WORLD_SIZE / TILE_SIZE), Math.ceil(endWY / TILE_SIZE)) };

  const gameTimeSec = gameTime;
  for (let ty = tileStart.y; ty < tileEnd.y; ty++) {
    for (let tx = tileStart.x; tx < tileEnd.x; tx++) {
      const t = terrain.tiles[ty]?.[tx];
      if (t === undefined) continue;
      const sc = worldToScreen(tx * TILE_SIZE, ty * TILE_SIZE);
      const size = Math.ceil(TILE_SIZE * camera.zoom) + 1;
      const tColors = TERRAIN_COLORS[t as TerrainType];
      const baseColor = brightness > 0.5 ? tColors.base : tColors.dark;

      // Noise-based brightness variation per tile
      const noise = (tileHash(tx, ty) - 0.5) * 0.12;
      ctx.globalAlpha = 0.7 + brightness * 0.3;
      ctx.fillStyle = baseColor;
      ctx.fillRect(sc.x, sc.y, size, size);

      // Slight brightness overlay based on noise
      if (noise > 0) {
        ctx.fillStyle = `rgba(255,255,255,${noise})`;
      } else {
        ctx.fillStyle = `rgba(0,0,0,${-noise})`;
      }
      ctx.fillRect(sc.x, sc.y, size, size);

      // Grass tufts on grass tiles
      if ((t === TerrainType.Grass || t === TerrainType.Forest) && camera.zoom > 0.4) {
        const h1 = tileHash(tx + 100, ty + 200);
        const h2 = tileHash(tx + 300, ty + 400);
        if (h1 > 0.5) {
          ctx.strokeStyle = `rgba(40,${Math.round(140 * brightness)},50,0.5)`;
          ctx.lineWidth = Math.max(0.5, camera.zoom);
          const gx = sc.x + h2 * size * 0.8;
          const gy = sc.y + size * 0.7;
          ctx.beginPath();
          ctx.moveTo(gx, gy);
          ctx.lineTo(gx - 2 * camera.zoom, gy - 5 * camera.zoom);
          ctx.moveTo(gx + 2 * camera.zoom, gy);
          ctx.lineTo(gx + 4 * camera.zoom, gy - 4 * camera.zoom);
          ctx.stroke();
        }
      }

      // Wave ripples on water tiles
      if (t === TerrainType.Water && camera.zoom > 0.3) {
        const wavePhase = gameTimeSec * 1.5 + tx * 0.7 + ty * 0.5;
        const waveAlpha = (Math.sin(wavePhase) * 0.5 + 0.5) * 0.15;
        ctx.fillStyle = `rgba(200,220,255,${waveAlpha})`;
        const wy = sc.y + size * (0.3 + Math.sin(wavePhase) * 0.15);
        ctx.fillRect(sc.x + size * 0.1, wy, size * 0.8, Math.max(1, camera.zoom));
      }
    }
  }
  ctx.globalAlpha = 1;

  // Plants (stems with leaves)
  plants.forEach(p => {
    const sc = worldToScreen(p.pos.x, p.pos.y);
    if (sc.x < -10 || sc.x > W + 10 || sc.y < -10 || sc.y > H + 10) return;
    const sz = p.size * camera.zoom * 1.5;
    const green = Math.round(130 * brightness + 30);

    // Stem
    ctx.strokeStyle = `rgba(30,${green - 20},25,0.9)`;
    ctx.lineWidth = Math.max(0.8, sz * 0.25);
    ctx.beginPath();
    ctx.moveTo(sc.x, sc.y + sz);
    ctx.lineTo(sc.x, sc.y - sz * 0.5);
    ctx.stroke();

    // Leaf shapes (small ellipses)
    ctx.fillStyle = `rgba(34,${green},50,0.85)`;
    ctx.beginPath();
    ctx.ellipse(sc.x - sz * 0.5, sc.y - sz * 0.2, sz * 0.6, sz * 0.3, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(sc.x + sz * 0.4, sc.y - sz * 0.5, sz * 0.5, sz * 0.25, 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Top bud/berry if energy is high
    if (p.energy > p.maxEnergy * 0.6) {
      ctx.fillStyle = `rgba(60,${green + 30},40,0.9)`;
      ctx.beginPath();
      ctx.arc(sc.x, sc.y - sz * 0.6, sz * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // Creatures (species-specific shapes)
  creatures.forEach(c => {
    if (!c.alive) return;
    const sc = worldToScreen(c.pos.x, c.pos.y);
    if (sc.x < -20 || sc.x > W + 20 || sc.y < -20 || sc.y > H + 20) return;
    const config = SPECIES_CONFIG[c.species];
    const size = config.baseSize * c.genetics.size * 4 * camera.zoom;

    ctx.fillStyle = config.color;
    ctx.strokeStyle = config.color;
    ctx.globalAlpha = 0.6 + brightness * 0.4;
    ctx.shadowBlur = 3 * camera.zoom;
    ctx.shadowColor = config.color;
    ctx.lineWidth = Math.max(1, 1.2 * camera.zoom);

    drawCreatureShape(ctx, sc.x, sc.y, size, c.species, c.vel);

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // Direction indicator
    if (camera.zoom > 0.6) {
      ctx.strokeStyle = config.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sc.x, sc.y);
      ctx.lineTo(sc.x + c.vel.x * 3 * camera.zoom, sc.y + c.vel.y * 3 * camera.zoom);
      ctx.stroke();
    }

    // Name
    if (c.nickname && camera.zoom > 0.8) {
      ctx.fillStyle = '#fff';
      ctx.font = `${8 * camera.zoom}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(c.nickname, sc.x, sc.y - size - 5);
    }

    // Selected highlight
    if (c === selected) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sc.x, sc.y, size + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  // Night overlay
  if (brightness < 0.6) {
    ctx.fillStyle = `rgba(0,0,20,${(0.6 - brightness) * 0.4})`;
    ctx.fillRect(0, 0, W, H);
  }

  // Floating death notifications
  floatingNotifications.forEach(n => {
    ctx.globalAlpha = n.alpha;
    ctx.fillStyle = n.color;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#000';
    ctx.fillText(n.text, n.x, n.y);
    ctx.shadowBlur = 0;
  });
  ctx.globalAlpha = 1;

  // HUD with rounded corners and semi-transparent backdrop
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(4, 4, W - 8, 36, 10);
  ctx.fillStyle = 'rgba(10,26,16,0.78)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(74,222,128,0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  ctx.textAlign = 'left';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = '#cde8d8';
  ctx.fillText(`Day ${getCurrentDay()} \u00B7 ${getTimeLabel()}`, 14, 26);
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#9ab8a8';
  ctx.fillText(`\uc0dd\ubb3c: ${creatures.length}  \uc885: ${new Set(creatures.map(c => c.species)).size}  \ubc1c\uacac: ${discoveries.length}`, 180, 26);

  // Speed buttons with rounded corners
  const speeds = [0, 1, 3, 5];
  const speedLabels = ['\u23F8', '1\u00D7', '3\u00D7', '5\u00D7'];
  speeds.forEach((s, i) => {
    const bx = W - 200 + i * 48;
    ctx.beginPath();
    ctx.roundRect(bx, 8, 40, 24, 6);
    ctx.fillStyle = simSpeed === s ? '#22c55e' : '#1a3a2a';
    ctx.fill();
    ctx.strokeStyle = simSpeed === s ? '#4ade80' : '#2a4a3a';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = '11px sans-serif';
    ctx.fillText(speedLabels[i], bx + 20, 24);
  });

  // Tool buttons at bottom with rounded backdrop
  const tools: [typeof tool, string][] = [['observe', '\uD83D\uDD0D'], ['food', '\uD83C\uDF31'], ['species', '\u2795']];
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(4, H - 42, W - 8, 38, 10);
  ctx.fillStyle = 'rgba(10,26,16,0.78)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(74,222,128,0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
  tools.forEach(([t, icon], i) => {
    const bx = W / 2 - 80 + i * 55;
    ctx.beginPath();
    ctx.roundRect(bx, H - 36, 48, 30, 8);
    ctx.fillStyle = tool === t ? '#1a4a2a' : '#0a1a10';
    ctx.fill();
    ctx.strokeStyle = tool === t ? '#4ade80' : '#2a4a3a';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = '16px sans-serif';
    ctx.fillText(icon, bx + 24, H - 17);
  });

  // Journal/Stats buttons
  drawButton(10, H - 36, 60, 32, '\uD83D\uDCD3', showJournalOverlay ? '#2a5a3a' : '#1a3a2a');
  drawButton(78, H - 36, 60, 32, '\uD83D\uDCCA', showStatsOverlay ? '#2a5a3a' : '#1a3a2a');

  // ==================== ENHANCED SELECTED CREATURE PANEL ====================
  if (selected && selected.alive) {
    const config = SPECIES_CONFIG[selected.species];
    const panelW = 210;
    const panelH = 220;
    const panelX = W - panelW - 6;
    const panelY = 46;

    // Panel bg with actual rounded corners
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 10);
    ctx.fillStyle = 'rgba(10,26,16,0.92)';
    ctx.fill();
    ctx.strokeStyle = config.color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Header
    ctx.textAlign = 'left';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = config.color;
    const behaviorIcon = getBehaviorIcon(selected.state);
    ctx.fillText(`${config.symbol} ${selected.nickname || selected.species} ${behaviorIcon}`, panelX + 10, panelY + 20);

    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#6a8a7a';
    ctx.fillText(`${selected.species} \u00B7 ${selected.category} \u00B7 ${selected.generation}\uc138\ub300`, panelX + 10, panelY + 35);

    // HP bar
    const barX = panelX + 10;
    let barY = panelY + 48;
    const barW = panelW - 20;
    const barH = 10;

    ctx.fillStyle = '#6a8a7a';
    ctx.font = '9px sans-serif';
    ctx.fillText('HP', barX, barY - 2);
    const hpRatio = selected.energy / selected.maxEnergy;
    const hpColor = hpRatio > 0.6 ? '#4ade80' : hpRatio > 0.3 ? '#fbbf24' : '#ef4444';
    drawBar(barX, barY, barW, barH, hpRatio, hpColor);
    ctx.fillStyle = '#fff';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(selected.energy)}/${Math.round(selected.maxEnergy)}`, barX + barW - 2, barY + 8);
    ctx.textAlign = 'left';

    // Energy / Hunger status
    barY += 18;
    const hunger = getHungerLabel(selected);
    ctx.fillStyle = '#6a8a7a';
    ctx.font = '9px sans-serif';
    ctx.fillText('\ubc30\uace0\ud514', barX, barY - 2);
    const hungerRatio = 1 - (selected.hunger || 0);
    drawBar(barX, barY, barW, barH, hungerRatio, hunger.color);
    ctx.fillStyle = hunger.color;
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(hunger.text, barX + barW - 2, barY + 8);
    ctx.textAlign = 'left';

    // Fear bar
    barY += 18;
    ctx.fillStyle = '#6a8a7a';
    ctx.font = '9px sans-serif';
    ctx.fillText('\uacf5\ud3ec', barX, barY - 2);
    drawBar(barX, barY, barW, barH, selected.fear || 0, '#a78bfa');

    // Reproduction urge bar
    barY += 18;
    ctx.fillStyle = '#6a8a7a';
    ctx.font = '9px sans-serif';
    ctx.fillText('\ubc88\uc2dd \uc695\uad6c', barX, barY - 2);
    drawBar(barX, barY, barW, barH, selected.reproductionUrge || 0, '#f472b6');

    // Info lines
    barY += 18;
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#8aaa9a';
    const infoLines = [
      `\ub098\uc774: ${Math.round(selected.age)}\uc77c / ${Math.round(selected.maxAge)}\uc77c`,
      `\uc0c1\ud0dc: ${selected.state} ${behaviorIcon}`,
      `\uc790\uc2dd: ${selected.childCount}\ub9c8\ub9ac`,
      `\uc18d\ub3c4: ${selected.genetics.speed.toFixed(2)} \u00B7 \ud06c\uae30: ${selected.genetics.size.toFixed(2)}`,
    ];
    infoLines.forEach((l, i) => {
      ctx.fillText(l, barX, barY + 12 + i * 14);
    });
  }

  // ==================== JOURNAL OVERLAY ====================
  if (showJournalOverlay) {
    const jW = Math.min(380, W - 20);
    const jH = Math.min(500, H - 100);
    const jX = (W - jW) / 2;
    const jY = (H - jH) / 2;

    // Backdrop
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, H);

    // Panel
    ctx.fillStyle = 'rgba(10,26,16,0.95)';
    ctx.fillRect(jX, jY, jW, jH);
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2;
    ctx.strokeRect(jX, jY, jW, jH);

    // Title
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('\uD83D\uDCD3 \uad00\ucc30 \uc77c\uc9c0', jX + jW / 2, jY + 28);

    // Close button
    ctx.fillStyle = '#888';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('\u2715', jX + jW - 12, jY + 28);

    // Entries
    ctx.save();
    ctx.beginPath();
    ctx.rect(jX + 5, jY + 42, jW - 10, jH - 52);
    ctx.clip();

    ctx.textAlign = 'left';
    ctx.font = '11px sans-serif';
    const lineHeight = 20;
    const maxVisible = Math.floor((jH - 52) / lineHeight);
    const visibleEntries = journal.slice(journalScrollOffset, journalScrollOffset + maxVisible);

    visibleEntries.forEach((entry, i) => {
      const ey = jY + 58 + i * lineHeight;
      // Alternate bg
      if (i % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fillRect(jX + 5, ey - 12, jW - 10, lineHeight);
      }
      ctx.fillStyle = '#5a8a6a';
      ctx.fillText(`D${entry.day} ${entry.time}`, jX + 12, ey);
      ctx.fillStyle = '#c0d8c8';
      ctx.fillText(entry.text, jX + 85, ey);
    });

    ctx.restore();

    // Scroll indicator
    if (journal.length > maxVisible) {
      const scrollRatio = journalScrollOffset / Math.max(1, journal.length - maxVisible);
      const trackH = jH - 52;
      const thumbH = Math.max(20, trackH * maxVisible / journal.length);
      const thumbY = jY + 42 + scrollRatio * (trackH - thumbH);
      ctx.fillStyle = 'rgba(74,222,128,0.3)';
      ctx.fillRect(jX + jW - 8, thumbY, 4, thumbH);
    }
  }

  // ==================== STATS OVERLAY ====================
  if (showStatsOverlay) {
    const sW = Math.min(380, W - 20);
    const sH = Math.min(500, H - 100);
    const sX = (W - sW) / 2;
    const sY = (H - sH) / 2;

    // Backdrop
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, H);

    // Panel
    ctx.fillStyle = 'rgba(10,26,16,0.95)';
    ctx.fillRect(sX, sY, sW, sH);
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2;
    ctx.strokeRect(sX, sY, sW, sH);

    // Title
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('\uD83D\uDCCA \uac1c\uccb4\uc218 \ud1b5\uacc4', sX + sW / 2, sY + 28);

    // Close
    ctx.fillStyle = '#888';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('\u2715', sX + sW - 12, sY + 28);

    // Current population bars
    const speciesEntries: [SpeciesType, number][] = [];
    const speciesCounts = new Map<SpeciesType, number>();
    creatures.forEach(c => speciesCounts.set(c.species, (speciesCounts.get(c.species) || 0) + 1));
    for (const s of Object.values(SpeciesType)) {
      speciesEntries.push([s, speciesCounts.get(s) || 0]);
    }
    speciesEntries.sort((a, b) => b[1] - a[1]);

    const maxCount = Math.max(1, ...speciesEntries.map(e => e[1]));
    const barAreaY = sY + 46;
    const barHeight = 18;
    const barGap = 4;
    const barMaxW = sW - 140;

    ctx.textAlign = 'left';
    speciesEntries.forEach(([species, count], i) => {
      const config = SPECIES_CONFIG[species];
      const y = barAreaY + i * (barHeight + barGap);

      // Label
      ctx.fillStyle = config.color;
      ctx.font = '11px sans-serif';
      ctx.fillText(`${config.symbol} ${species}`, sX + 12, y + 13);

      // Bar
      const barW = (count / maxCount) * barMaxW;
      ctx.fillStyle = count > 0 ? config.color : '#333';
      ctx.globalAlpha = count > 0 ? 0.7 : 0.2;
      ctx.fillRect(sX + 90, y, barW, barHeight);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#2a4a3a';
      ctx.strokeRect(sX + 90, y, barMaxW, barHeight);

      // Count
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(`${count}`, sX + 95 + barW + 4, y + 13);
    });

    // Mini population history graph
    if (popHistory.length > 1) {
      const graphY = barAreaY + speciesEntries.length * (barHeight + barGap) + 20;
      const graphH = Math.min(150, sY + sH - graphY - 20);
      const graphW = sW - 40;
      const graphX = sX + 20;

      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(graphX, graphY, graphW, graphH);
      ctx.strokeStyle = '#2a4a3a';
      ctx.strokeRect(graphX, graphY, graphW, graphH);

      ctx.fillStyle = '#6a8a7a';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('\uac1c\uccb4\uc218 \ubcc0\ud654 \uadf8\ub798\ud504', graphX + graphW / 2, graphY - 4);

      const maxTotal = Math.max(1, ...popHistory.map(p => p.total));
      const stepX = graphW / (popHistory.length - 1);

      // Draw line for total
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      popHistory.forEach((snap, i) => {
        const px = graphX + i * stepX;
        const py = graphY + graphH - (snap.total / maxTotal) * (graphH - 10) - 5;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();

      // Draw lines per species (top 5 by current count)
      const topSpecies = speciesEntries.slice(0, 5);
      topSpecies.forEach(([species]) => {
        const config = SPECIES_CONFIG[species];
        ctx.strokeStyle = config.color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        let maxS = 1;
        popHistory.forEach(snap => { if ((snap.counts[species] || 0) > maxS) maxS = snap.counts[species]; });
        popHistory.forEach((snap, i) => {
          const px = graphX + i * stepX;
          const py = graphY + graphH - ((snap.counts[species] || 0) / maxTotal) * (graphH - 10) - 5;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
        ctx.globalAlpha = 1;
      });
    }
  }

  // ==================== EXTINCTION WARNINGS ====================
  extinctionWarnings.forEach((w, i) => {
    ctx.globalAlpha = w.alpha;
    const wY = 50 + i * 50;

    // Flashing red banner
    const flash = Math.sin(w.timer * 6) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(239,68,68,${0.85 * flash})`;
    const bannerW = Math.min(360, W - 20);
    const bannerX = (W - bannerW) / 2;
    ctx.fillRect(bannerX, wY, bannerW, 40);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(bannerX, wY, bannerW, 40);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`\u26a0\ufe0f ${w.species} \uba78\uc885! \u26a0\ufe0f`, W / 2, wY + 26);
  });
  ctx.globalAlpha = 1;

  // ==================== TUTORIAL OVERLAY ====================
  if (showTutorial && screen === 'sim') {
    ctx.globalAlpha = tutorialAlpha * 0.85;
    const tW = Math.min(340, W - 30);
    const tH = 220;
    const tX = (W - tW) / 2;
    const tY = (H - tH) / 2;

    // Backdrop
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, H);

    // Panel
    ctx.globalAlpha = tutorialAlpha;
    ctx.fillStyle = 'rgba(10,30,18,0.95)';
    ctx.fillRect(tX, tY, tW, tH);
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2;
    ctx.strokeRect(tX, tY, tW, tH);

    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('\uD83C\uDF0D \uc870\uc791\ubc95', tX + tW / 2, tY + 28);

    const tutLines = [
      '\uD83D\uDD0D \uad00\ucc30: \uc0dd\ubb3c\uc744 \ud074\ub9ad\ud558\uc5ec \uc774\ub984\uc744 \uc9d3\uace0 \uc815\ubcf4\ub97c \ud655\uc778\ud558\uc138\uc694',
      '\uD83C\uDF31 \uc74c\uc2dd: \ud074\ub9ad\ud55c \uc704\uce58\uc5d0 \uc2dd\ubb3c\uc744 \ucd94\uac00\ud569\ub2c8\ub2e4',
      '\u2795 \ubc29\uc0ac: \uc0c8\ub85c\uc6b4 \uc0dd\ubb3c\uc744 \ucd94\uac00\ud569\ub2c8\ub2e4',
      '\ub4dc\ub798\uadf8\ub85c \uce74\uba54\ub77c \uc774\ub3d9, \ud720\ub85c \uc90c',
      '\uc18d\ub3c4 \uc870\uc808: \u23F8 1\u00D7 3\u00D7 5\u00D7',
    ];

    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    tutLines.forEach((line, i) => {
      ctx.fillStyle = '#c0e8d0';
      ctx.fillText(line, tX + 16, tY + 56 + i * 28);
    });

    // Dismiss hint
    ctx.fillStyle = '#5a8a6a';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('\ud0ed\ud558\uc5ec \ub2eb\uae30', tX + tW / 2, tY + tH - 12);

    ctx.globalAlpha = 1;
  }
}

function drawButton(x: number, y: number, w: number, h: number, label: string, bg: string) {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#2a4a3a';
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#fff';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2);
  ctx.textBaseline = 'alphabetic';
}

// ==================== INPUT ====================
canvas.addEventListener('mousedown', e => {
  if (screen === 'menu') {
    const H = canvas.height;
    // New simulation button
    if (e.clientY > H * 0.5 - 5 && e.clientY < H * 0.5 + 55) {
      initSimulation();
      screen = 'sim';
    }
    // Continue button
    if (hasSavedData() && e.clientY > H * 0.5 + 60 && e.clientY < H * 0.5 + 120) {
      if (loadGame()) {
        screen = 'sim';
        // Re-init terrain from seed (use a fixed seed since we can't recover the original)
        terrain = new TerrainMap(42);
      }
    }
    // Login button
    const loginY = hasSavedData() ? H * 0.5 + 130 : H * 0.5 + 65;
    if (e.clientY > loginY - 5 && e.clientY < loginY + 55) {
      try {
        __sdk?.auth.loginIfAvailable().catch(() => {});
      } catch (_) {}
    }
    return;
  }
  dragging = true;
  dragStart = { x: e.clientX, y: e.clientY };
  camDragStart = { x: camera.x, y: camera.y };
});

canvas.addEventListener('mousemove', e => {
  if (!dragging || screen !== 'sim') return;
  const dx = (e.clientX - dragStart.x) / camera.zoom;
  const dy = (e.clientY - dragStart.y) / camera.zoom;
  camera.x = camDragStart.x - dx;
  camera.y = camDragStart.y - dy;
});

canvas.addEventListener('mouseup', e => {
  const moved = Math.hypot(e.clientX - dragStart.x, e.clientY - dragStart.y);
  dragging = false;
  if (moved > 5 || screen !== 'sim') return;

  const W = canvas.width, H = canvas.height;

  // Dismiss tutorial on click
  if (showTutorial) {
    showTutorial = false;
    return;
  }

  // Close overlays on click outside panel
  if (showJournalOverlay || showStatsOverlay) {
    const oW = Math.min(380, W - 20);
    const oH = Math.min(500, H - 100);
    const oX = (W - oW) / 2;
    const oY = (H - oH) / 2;

    if (e.clientX < oX || e.clientX > oX + oW || e.clientY < oY || e.clientY > oY + oH) {
      showJournalOverlay = false;
      showStatsOverlay = false;
      return;
    }

    // Close button (top-right of panel)
    if (e.clientX > oX + oW - 30 && e.clientY < oY + 36) {
      showJournalOverlay = false;
      showStatsOverlay = false;
      return;
    }

    // If journal overlay is open, don't process other clicks
    return;
  }

  // Speed buttons
  if (e.clientY < 40) {
    [0, 1, 3, 5].forEach((s, i) => {
      const bx = W - 200 + i * 48;
      if (e.clientX >= bx && e.clientX <= bx + 40) simSpeed = s;
    });
    return;
  }

  // Bottom toolbar
  if (e.clientY > H - 40) {
    // Journal button
    if (e.clientX >= 10 && e.clientX <= 70) {
      showJournalOverlay = !showJournalOverlay;
      showStatsOverlay = false;
      journalScrollOffset = 0;
      return;
    }
    // Stats button
    if (e.clientX >= 78 && e.clientX <= 138) {
      showStatsOverlay = !showStatsOverlay;
      showJournalOverlay = false;
      return;
    }
    // Tools
    const tools_: (typeof tool)[] = ['observe', 'food', 'species'];
    tools_.forEach((t, i) => {
      const bx = W / 2 - 80 + i * 55;
      if (e.clientX >= bx && e.clientX <= bx + 48) tool = t;
    });
    return;
  }

  // World click
  const wp = screenToWorld(e.clientX, e.clientY);
  if (tool === 'observe') {
    selected = null;
    let minD = 20 / camera.zoom;
    creatures.forEach(c => {
      const d = Math.hypot(c.pos.x - wp.x, c.pos.y - wp.y);
      if (d < minD) { minD = d; selected = c; }
    });
    const sel = selected as Creature | null;
    if (sel && !sel.nickname) {
      const name = prompt(`\uc774 ${sel.species}\uc758 \uc774\ub984\uc744 \uc9c0\uc5b4\uc8fc\uc138\uc694:`);
      if (name) { sel.nickname = name; addJournal(`${sel.species}\uc5d0\uac8c "${name}" \uc774\ub984 \ubd80\uc5ec`); }
    }
  } else if (tool === 'food') {
    for (let i = 0; i < 5; i++) spawnPlant(wp.x + (rng() - 0.5) * 40, wp.y + (rng() - 0.5) * 40);
    addJournal('\uc74c\uc2dd\uc744 \ucd94\uac00\ud588\uc2b5\ub2c8\ub2e4');
  } else if (tool === 'species') {
    const types = Object.values(SpeciesType);
    const species = types[Math.floor(rng() * types.length)];
    creatures.push(createCreature(species, wp, rng, 0, undefined, getCurrentDay()));
    addJournal(`${species}\uc744(\ub97c) \ubc29\uc0ac\ud588\uc2b5\ub2c8\ub2e4`);
  }
});

canvas.addEventListener('wheel', e => {
  e.preventDefault();

  // If journal overlay is open, scroll journal
  if (showJournalOverlay) {
    if (e.deltaY > 0) {
      journalScrollOffset = Math.min(journal.length - 1, journalScrollOffset + 3);
    } else {
      journalScrollOffset = Math.max(0, journalScrollOffset - 3);
    }
    return;
  }

  camera.zoom *= e.deltaY > 0 ? 0.9 : 1.1;
  camera.zoom = Math.max(0.2, Math.min(3, camera.zoom));
}, { passive: false });

// Touch support
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const t = e.touches[0];
  canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: t.clientX, clientY: t.clientY }));
}, { passive: false });
canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const t = e.touches[0];
  canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: t.clientX, clientY: t.clientY }));
}, { passive: false });
canvas.addEventListener('touchend', e => {
  const t = e.changedTouches[0];
  canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: t.clientX, clientY: t.clientY }));
});

// ==================== GAME LOOP ====================
let lastTime = performance.now();
let sdkScoreTimer = 0;
const SDK_SCORE_INTERVAL = 60; // seconds

function gameLoop(now: number) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  if (screen === 'sim') {
    update(dt);

    // Periodic score submission to SDK
    sdkScoreTimer += dt;
    if (sdkScoreTimer >= SDK_SCORE_INTERVAL && __sdk) {
      sdkScoreTimer = 0;
      try {
        const speciesCounts = new Map<SpeciesType, number>();
        creatures.forEach(c => speciesCounts.set(c.species, (speciesCounts.get(c.species) || 0) + 1));
        const speciesCount = speciesCounts.size;
        const extinctions = extinctionWarnings.length;
        __sdk.scores.submit({
          score: discoveries.length,
          meta: { speciesCount, simulationDays: getCurrentDay(), extinctions },
        }).catch(() => {});
      } catch (_) {}
    }
  }
  render();
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
