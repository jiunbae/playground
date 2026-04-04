// ============================================================
// Infinite Mosaic - Procedural Mosaic Puzzle Game
// Web implementation: Vite + TypeScript + HTML5 Canvas
// ============================================================

import { PlaygroundSDK } from '@playground/sdk';

// --- SDK Init ---
let sdk: PlaygroundSDK | null = null;
try {
  sdk = PlaygroundSDK.init({ apiUrl: 'https://api.jiun.dev', game: 'infinite-mosaic' });
} catch { /* SDK init failed, continue offline */ }

let sdkLoggedIn = false;
try {
  if (sdk) sdkLoggedIn = !!sdk.auth.getUser();
} catch { /* ignore */ }

async function handleSdkLogin(): Promise<void> {
  if (!sdk) return;
  try {
    const user = await sdk.auth.loginIfAvailable();
    sdkLoggedIn = !!user;
  } catch { /* login failed */ }
}

// --- Types ---

interface HSL { h: number; s: number; l: number; }
interface Vec2 { x: number; y: number; }

type ShapeType = 'square' | 'triangle' | 'hexagon' | 'diamond';
type GameScreen = 'menu' | 'puzzle' | 'gallery' | 'complete';
type Difficulty = 'easy' | 'medium' | 'hard';
type GameMode = 'zen' | 'speed';

interface PieceData {
  id: number;
  gridX: number;
  gridY: number;
  shape: ShapeType;
  color: HSL;
  rotation: number;       // current rotation (degrees)
  targetRotation: number; // correct rotation
  placed: boolean;
  // current world position (when dragging or in tray)
  x: number;
  y: number;
  // animation
  scale: number;
  opacity: number;
}

interface PuzzleConfig {
  gridSize: number;
  shapes: ShapeType[];
  rotationEnabled: boolean;
  label: string;
}

interface GalleryEntry {
  id: string;
  date: string;
  difficulty: Difficulty;
  gridSize: number;
  score: number;
  timeSeconds: number;
  palette: HSL[];
  grid: { shape: ShapeType; color: HSL }[][];
  mode: GameMode;
}

interface Button {
  x: number; y: number; w: number; h: number;
  label: string;
  action: () => void;
  color?: string;
  hovered?: boolean;
}

// --- Constants ---

const DIFFICULTY_CONFIG: Record<Difficulty, PuzzleConfig> = {
  easy:   { gridSize: 6,  shapes: ['square', 'triangle'], rotationEnabled: false, label: '쉬움 (6×6)' },
  medium: { gridSize: 8,  shapes: ['square', 'triangle', 'diamond'], rotationEnabled: true, label: '보통 (8×8)' },
  hard:   { gridSize: 10, shapes: ['square', 'triangle', 'hexagon', 'diamond'], rotationEnabled: true, label: '어려움 (10×10)' },
};

const SPEED_TIMES = [60, 90, 120];

const STYLE_PALETTES: HSL[][] = [
  // Islamic Geometry
  [{ h: 200, s: 70, l: 45 }, { h: 40, s: 80, l: 55 }, { h: 170, s: 60, l: 40 }, { h: 30, s: 75, l: 50 }, { h: 220, s: 65, l: 50 }],
  // Stained Glass
  [{ h: 0, s: 80, l: 45 }, { h: 50, s: 90, l: 50 }, { h: 120, s: 70, l: 40 }, { h: 240, s: 80, l: 45 }, { h: 300, s: 70, l: 50 }],
  // Mandala
  [{ h: 280, s: 60, l: 50 }, { h: 320, s: 70, l: 55 }, { h: 200, s: 50, l: 45 }, { h: 40, s: 65, l: 55 }, { h: 160, s: 55, l: 45 }],
  // Minimal
  [{ h: 210, s: 15, l: 55 }, { h: 30, s: 20, l: 65 }, { h: 0, s: 10, l: 50 }, { h: 180, s: 15, l: 60 }, { h: 60, s: 20, l: 55 }],
  // Art Nouveau
  [{ h: 35, s: 75, l: 45 }, { h: 80, s: 55, l: 40 }, { h: 15, s: 65, l: 50 }, { h: 140, s: 45, l: 38 }, { h: 55, s: 70, l: 48 }],
  // Cyberpunk
  [{ h: 280, s: 100, l: 55 }, { h: 180, s: 100, l: 50 }, { h: 330, s: 90, l: 55 }, { h: 60, s: 100, l: 50 }, { h: 200, s: 80, l: 45 }],
];

// --- Utility Functions ---

function hslToString(c: HSL): string {
  return `hsl(${c.h}, ${c.s}%, ${c.l}%)`;
}

function hslToStringAlpha(c: HSL, a: number): string {
  return `hsla(${c.h}, ${c.s}%, ${c.l}%, ${a})`;
}

function lerpColor(a: HSL, b: HSL, t: number): HSL {
  return {
    h: a.h + (b.h - a.h) * t,
    s: a.s + (b.s - a.s) * t,
    l: a.l + (b.l - a.l) * t,
  };
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// --- Color Harmony Scoring ---

function colorDistance(a: HSL, b: HSL): number {
  const dh = Math.min(Math.abs(a.h - b.h), 360 - Math.abs(a.h - b.h)) / 180;
  const ds = Math.abs(a.s - b.s) / 100;
  const dl = Math.abs(a.l - b.l) / 100;
  return Math.sqrt(dh * dh + ds * ds + dl * dl);
}

function computeColorHarmony(colors: HSL[]): number {
  if (colors.length < 2) return 1;
  let totalScore = 0;
  let pairs = 0;
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      const d = colorDistance(colors[i], colors[j]);
      // Harmonious colors have distances around 0.3-0.7
      const harmony = 1 - Math.abs(d - 0.5) * 2;
      totalScore += Math.max(0, harmony);
      pairs++;
    }
  }
  return pairs > 0 ? totalScore / pairs : 0;
}

function computeSymmetry(grid: (PieceData | null)[][], size: number): number {
  let matches = 0;
  let total = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < Math.floor(size / 2); x++) {
      const a = grid[y]?.[x];
      const b = grid[y]?.[size - 1 - x];
      if (a && b) {
        total++;
        if (a.shape === b.shape) matches += 0.5;
        if (Math.abs(a.color.h - b.color.h) < 30) matches += 0.5;
      }
    }
  }
  // Vertical symmetry
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < Math.floor(size / 2); y++) {
      const a = grid[y]?.[x];
      const b = grid[size - 1 - y]?.[x];
      if (a && b) {
        total++;
        if (a.shape === b.shape) matches += 0.5;
        if (Math.abs(a.color.h - b.color.h) < 30) matches += 0.5;
      }
    }
  }
  return total > 0 ? matches / total : 0;
}

function computePatternCoherence(grid: (PieceData | null)[][], size: number): number {
  let coherent = 0;
  let total = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size - 1; x++) {
      const a = grid[y]?.[x];
      const b = grid[y]?.[x + 1];
      if (a && b) {
        total++;
        const d = colorDistance(a.color, b.color);
        if (d < 0.6) coherent++;
      }
    }
  }
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size - 1; y++) {
      const a = grid[y]?.[x];
      const b = grid[y + 1]?.[x];
      if (a && b) {
        total++;
        const d = colorDistance(a.color, b.color);
        if (d < 0.6) coherent++;
      }
    }
  }
  return total > 0 ? coherent / total : 0;
}

// --- Puzzle Generator ---

function generatePuzzle(difficulty: Difficulty, seed: number): PieceData[] {
  const config = DIFFICULTY_CONFIG[difficulty];
  const rng = seededRandom(seed);
  const { gridSize, shapes } = config;

  // Pick a palette
  const paletteIdx = Math.floor(rng() * STYLE_PALETTES.length);
  const basePalette = STYLE_PALETTES[paletteIdx];

  // Generate a pattern using a simplified WFC-like approach
  const pieces: PieceData[] = [];
  let id = 0;

  for (let gy = 0; gy < gridSize; gy++) {
    for (let gx = 0; gx < gridSize; gx++) {
      // Shape selection based on position pattern
      const patternVal = (gx + gy) % shapes.length;
      // Add some randomness
      const shapeIdx = rng() < 0.3
        ? Math.floor(rng() * shapes.length)
        : patternVal;
      const shape = shapes[shapeIdx];

      // Color: use palette with positional variation for harmony
      const baseColor = basePalette[Math.floor(rng() * basePalette.length)];
      // Apply gradient-like variation based on position
      const posRatio = (gx + gy) / (gridSize * 2);
      const hueShift = (rng() - 0.5) * 20 + posRatio * 30;
      const color: HSL = {
        h: (baseColor.h + hueShift + 360) % 360,
        s: clamp(baseColor.s + (rng() - 0.5) * 15, 20, 100),
        l: clamp(baseColor.l + (rng() - 0.5) * 15, 25, 75),
      };

      // Symmetric coloring: mirror colors for aesthetic
      if (gx >= gridSize / 2) {
        const mirrorPiece = pieces.find(p => p.gridX === gridSize - 1 - gx && p.gridY === gy);
        if (mirrorPiece && rng() < 0.6) {
          color.h = mirrorPiece.color.h;
          color.s = mirrorPiece.color.s;
        }
      }
      if (gy >= gridSize / 2) {
        const mirrorPiece = pieces.find(p => p.gridX === gx && p.gridY === gridSize - 1 - gy);
        if (mirrorPiece && rng() < 0.4) {
          color.h = mirrorPiece.color.h;
        }
      }

      const targetRotation = config.rotationEnabled
        ? Math.floor(rng() * 4) * 90
        : 0;
      const rotation = config.rotationEnabled
        ? Math.floor(rng() * 4) * 90
        : 0;

      pieces.push({
        id: id++,
        gridX: gx,
        gridY: gy,
        shape,
        color,
        rotation,
        targetRotation,
        placed: false,
        x: 0, y: 0,
        scale: 1,
        opacity: 1,
      });
    }
  }

  return pieces;
}

// --- Leaderboard ---

const LEADERBOARD_KEY = 'playground_infinite-mosaic_leaderboard';
const LEADERBOARD_MAX = 50;

interface LeaderboardRecord {
  name: string;
  score: number;
  difficulty: string;
  timestamp: number;
}

function loadMosaicLeaderboard(): LeaderboardRecord[] {
  try {
    const data = localStorage.getItem(LEADERBOARD_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveToMosaicLeaderboard(entry: LeaderboardRecord): void {
  const entries = loadMosaicLeaderboard();
  entries.push(entry);
  entries.sort((a, b) => b.score - a.score);
  if (entries.length > LEADERBOARD_MAX) entries.length = LEADERBOARD_MAX;
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
}

let mosaicLeaderboardOverlay: HTMLDivElement | null = null;

function showMosaicLeaderboard(): void {
  if (mosaicLeaderboardOverlay) return;

  function renderOverlay() {
    const all = loadMosaicLeaderboard();
    const top10 = all.sort((a, b) => b.score - a.score).slice(0, 10);

    let myName = '나';
    try { if (sdk) { const u = sdk.auth.getUser(); if (u) myName = u.name; } } catch {}
    const myIdx = all.findIndex(e => e.name === myName);

    const diffLabel: Record<string, string> = { easy: '쉬움', medium: '보통', hard: '어려움' };

    const rowsHtml = top10.length > 0
      ? top10.map((e, i) => `
        <tr style="${e.name === myName ? 'background:rgba(255,204,0,0.15);' : ''}">
          <td style="padding:6px 8px;text-align:center;font-weight:bold;">${i + 1}</td>
          <td style="padding:6px 8px;">${e.name}</td>
          <td style="padding:6px 8px;text-align:center;">${e.score}</td>
          <td style="padding:6px 8px;text-align:center;">${diffLabel[e.difficulty] || e.difficulty}</td>
          <td style="padding:6px 8px;text-align:center;font-size:11px;color:#888;">${new Date(e.timestamp).toLocaleDateString('ko-KR')}</td>
        </tr>`).join('')
      : '<tr><td colspan="5" style="padding:20px;text-align:center;color:#888;">아직 기록이 없습니다</td></tr>';

    const myRankHtml = myIdx >= 0
      ? `<div style="margin-top:12px;padding:8px;background:rgba(255,204,0,0.1);border-radius:8px;font-size:13px;"><strong>내 순위:</strong> ${myIdx + 1}위 | ${all[myIdx].score}점</div>`
      : '';

    mosaicLeaderboardOverlay!.innerHTML = `
      <div style="position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:1000;">
        <div style="background:#1a1a2e;border:1px solid rgba(100,180,100,0.4);border-radius:16px;padding:24px;max-width:480px;width:90%;max-height:80vh;overflow-y:auto;color:#fff;font-family:'Segoe UI',system-ui,sans-serif;">
          <h2 style="margin:0 0 12px;text-align:center;">🏆 리더보드</h2>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead><tr style="border-bottom:2px solid rgba(255,255,255,0.2);">
              <th style="padding:6px 8px;">순위</th><th style="padding:6px 8px;text-align:left;">이름</th>
              <th style="padding:6px 8px;">미적 점수</th><th style="padding:6px 8px;">난이도</th>
              <th style="padding:6px 8px;">날짜</th>
            </tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          ${myRankHtml}
          <button id="mosaic-lb-close" style="display:block;margin:16px auto 0;padding:10px 32px;border:none;border-radius:8px;background:#2d6a4f;color:#fff;font-size:16px;cursor:pointer;">닫기</button>
        </div>
      </div>`;

    mosaicLeaderboardOverlay!.querySelector('#mosaic-lb-close')!.addEventListener('click', closeMosaicLeaderboard);
  }

  mosaicLeaderboardOverlay = document.createElement('div');
  mosaicLeaderboardOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:1000;';
  document.body.appendChild(mosaicLeaderboardOverlay);
  renderOverlay();
}

function closeMosaicLeaderboard(): void {
  if (mosaicLeaderboardOverlay) {
    mosaicLeaderboardOverlay.remove();
    mosaicLeaderboardOverlay = null;
  }
}

// --- Web Audio SFX ---
let mosaicAudioCtx: AudioContext | null = null;
function getMosaicAudio(): AudioContext {
  if (!mosaicAudioCtx) mosaicAudioCtx = new AudioContext();
  return mosaicAudioCtx;
}

function playPlaceClick(hue: number): void {
  try {
    const ctx = getMosaicAudio();
    const now = ctx.currentTime;
    // Map hue (0-360) to frequency (400-900)
    const freq = 400 + (hue / 360) * 500;
    const osc = ctx.createOscillator();
    osc.type = 'sine'; osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.15, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.1);
  } catch {}
}

function playSpinSound(): void {
  try {
    const ctx = getMosaicAudio();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.12, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.08);
  } catch {}
}

function playCompletionShimmer(): void {
  try {
    const ctx = getMosaicAudio();
    const now = ctx.currentTime;
    [523, 659, 784, 988, 1175, 1319].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine'; osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now + i * 0.12);
      g.gain.linearRampToValueAtTime(0.1, now + i * 0.12 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(now + i * 0.12); osc.stop(now + i * 0.12 + 0.4);
    });
  } catch {}
}

function playMilestoneSound(): void {
  try {
    const ctx = getMosaicAudio();
    const now = ctx.currentTime;
    [880, 1100, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine'; osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now + i * 0.08);
      g.gain.linearRampToValueAtTime(0.15, now + i * 0.08 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(now + i * 0.08); osc.stop(now + i * 0.08 + 0.25);
    });
  } catch {}
}

// --- Main Game Class ---

// Text shadow helper for canvas rendering
function applyTextShadow(ctx: CanvasRenderingContext2D): void {
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;
}

function clearTextShadow(ctx: CanvasRenderingContext2D): void {
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width = 0;
  height = 0;
  dpr = 1;

  screen: GameScreen = 'menu';
  difficulty: Difficulty = 'easy';
  gameMode: GameMode = 'zen';
  speedTimeLimit = 60;
  showTutorial = false;
  tutorialShown = false;

  // Puzzle state
  pieces: PieceData[] = [];
  gridSize = 6;
  cellSize = 0;
  gridOffsetX = 0;
  gridOffsetY = 0;
  trayOffsetY = 0;
  trayScrollX = 0;
  trayPieces: PieceData[] = [];
  placedGrid: (PieceData | null)[][] = [];

  // Interaction
  draggingPiece: PieceData | null = null;
  dragOffset: Vec2 = { x: 0, y: 0 };
  pointerPos: Vec2 = { x: 0, y: 0 };
  buttons: Button[] = [];
  hoveredButton: Button | null = null;

  // Score
  aestheticScore = 0;
  symmetryScore = 0;
  harmonyScore = 0;
  coherenceScore = 0;
  placedCount = 0;
  totalPieces = 0;

  // Timer (speed mode)
  timeRemaining = 0;
  timerActive = false;
  startTime = 0;
  elapsedTime = 0;

  // Speed mode state
  speedScore = 0;
  speedCombo = 1;
  speedPuzzlesCompleted = 0;

  // Animation
  lastTime = 0;
  completionTime = 0;
  completionAnimProgress = 0;
  particles: Particle[] = [];
  shakeAmount = 0;

  // Gallery
  gallery: GalleryEntry[] = [];
  galleryScroll = 0;
  galleryPage = 0;

  // Menu animation
  menuTime = 0;
  menuHue = 0;

  // Harmony tooltip
  harmonyTooltipVisible = false;
  harmonyTooltipX = 0;
  harmonyTooltipY = 0;

  // Completion screen data
  lastCompletedEntry: GalleryEntry | null = null;

  // Scroll tracking for tray
  trayDragStartX = 0;
  trayDragging = false;
  trayVelocity = 0;

  // Long-press rotation state
  longPressTimer: ReturnType<typeof setTimeout> | null = null;
  longPressPiece: PieceData | null = null;
  longPressMoved = false;

  // Harmony milestone tracking
  lastMilestone = 0;

  // Gallery touch scroll state
  galleryTouchStartY = 0;
  galleryTouchScrollStart = 0;
  galleryTouching = false;

  constructor() {
    this.canvas = document.getElementById('game') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.canvas.style.touchAction = 'none';
    this.loadGallery();
    try {
      this.tutorialShown = localStorage.getItem('infinite-mosaic-tutorial-shown') === '1';
    } catch { /* ignore */ }
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Pointer events
    this.canvas.addEventListener('pointerdown', e => this.onPointerDown(e));
    this.canvas.addEventListener('pointermove', e => this.onPointerMove(e));
    this.canvas.addEventListener('pointerup', e => this.onPointerUp(e));
    this.canvas.addEventListener('pointercancel', e => this.onPointerUp(e));

    // Right-click to rotate pieces in tray
    this.canvas.addEventListener('contextmenu', e => {
      e.preventDefault();
      if (this.screen !== 'puzzle') return;
      const rect = this.canvas.getBoundingClientRect();
      const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      if (pos.y >= this.trayOffsetY) {
        const piece = this.findTrayPieceAt(pos);
        if (piece) this.rotatePiece(piece);
      }
    });

    // 2-finger touch to rotate while dragging
    this.canvas.addEventListener('touchstart', e => {
      if (e.touches.length === 2 && this.draggingPiece) {
        e.preventDefault();
        this.rotatePiece(this.draggingPiece);
      }
    }, { passive: false });

    // Wheel for gallery scroll
    this.canvas.addEventListener('wheel', e => {
      if (this.screen === 'gallery') {
        this.galleryScroll += e.deltaY * 0.5;
        this.galleryScroll = Math.max(0, this.galleryScroll);
        e.preventDefault();
      }
    }, { passive: false });

    // Remove loading screen
    const loadEl = document.getElementById('loading');
    if (loadEl) loadEl.style.display = 'none';

    // Start game loop
    this.lastTime = performance.now();
    requestAnimationFrame(t => this.loop(t));
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
    if (this.screen === 'puzzle') this.layoutPuzzle();
  }

  // --- Storage ---

  loadGallery() {
    try {
      const data = localStorage.getItem('infinite-mosaic-gallery');
      if (data) this.gallery = JSON.parse(data);
    } catch { /* ignore */ }
  }

  saveGallery() {
    try {
      // Keep max 50 entries
      if (this.gallery.length > 50) this.gallery = this.gallery.slice(-50);
      localStorage.setItem('infinite-mosaic-gallery', JSON.stringify(this.gallery));
    } catch { /* ignore */ }
  }

  // --- Puzzle Setup ---

  startPuzzle(difficulty: Difficulty, mode: GameMode = 'zen') {
    if (!this.tutorialShown) {
      this.showTutorial = true;
      this.tutorialShown = true;
      try { localStorage.setItem('infinite-mosaic-tutorial-shown', '1'); } catch { /* ignore */ }
      this._pendingDifficulty = difficulty;
      this._pendingMode = mode;
      return;
    }
    this._startPuzzleInternal(difficulty, mode);
  }

  _pendingDifficulty: Difficulty = 'easy';
  _pendingMode: GameMode = 'zen';

  _startPuzzleInternal(difficulty: Difficulty, mode: GameMode = 'zen') {
    this.difficulty = difficulty;
    this.gameMode = mode;
    this.screen = 'puzzle';
    const config = DIFFICULTY_CONFIG[difficulty];
    this.gridSize = config.gridSize;
    this.totalPieces = this.gridSize * this.gridSize;
    this.placedCount = 0;
    this.aestheticScore = 0;
    this.completionAnimProgress = 0;
    this.particles = [];
    this.shakeAmount = 0;
    this.trayScrollX = 0;
    this.trayVelocity = 0;
    this.lastMilestone = 0;

    const seed = Date.now();
    this.pieces = generatePuzzle(difficulty, seed);

    // Init placed grid
    this.placedGrid = [];
    for (let y = 0; y < this.gridSize; y++) {
      this.placedGrid[y] = [];
      for (let x = 0; x < this.gridSize; x++) {
        this.placedGrid[y][x] = null;
      }
    }

    // All pieces go to tray initially
    this.trayPieces = shuffle([...this.pieces], Math.random);

    this.layoutPuzzle();

    // Timer
    if (mode === 'speed') {
      this.timeRemaining = this.speedTimeLimit;
      this.timerActive = true;
      this.speedScore = 0;
      this.speedCombo = 1;
      this.speedPuzzlesCompleted = 0;
    } else {
      this.timerActive = false;
      this.startTime = performance.now();
      this.elapsedTime = 0;
    }
  }

  layoutPuzzle() {
    const padding = 20;
    const topBarHeight = 60;
    const trayHeight = Math.min(120, this.height * 0.18);
    const availW = this.width - padding * 2;
    const availH = this.height - topBarHeight - trayHeight - padding * 2;
    this.cellSize = Math.floor(Math.min(availW / this.gridSize, availH / this.gridSize));
    this.gridOffsetX = Math.floor((this.width - this.cellSize * this.gridSize) / 2);
    this.gridOffsetY = topBarHeight + Math.floor((availH - this.cellSize * this.gridSize) / 2);
    this.trayOffsetY = this.height - trayHeight;

    // Position tray pieces
    this.layoutTrayPieces();
  }

  layoutTrayPieces() {
    const trayPieceSize = Math.min(this.cellSize * 0.8, 60);
    const spacing = trayPieceSize + 12;
    const startX = 20 + this.trayScrollX;
    const centerY = this.trayOffsetY + (this.height - this.trayOffsetY) / 2;

    this.trayPieces.forEach((p, i) => {
      if (!p.placed) {
        p.x = startX + i * spacing;
        p.y = centerY;
      }
    });
  }

  // --- Scoring ---

  updateScore() {
    const grid = this.placedGrid;
    const size = this.gridSize;

    // Collect placed colors
    const placedColors: HSL[] = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (grid[y][x]) placedColors.push(grid[y][x]!.color);
      }
    }

    this.symmetryScore = computeSymmetry(grid, size);
    this.harmonyScore = computeColorHarmony(placedColors);
    this.coherenceScore = computePatternCoherence(grid, size);
    this.aestheticScore = this.symmetryScore * 0.35 + this.harmonyScore * 0.35 + this.coherenceScore * 0.30;
  }

  // --- Piece Placement ---

  tryPlacePiece(piece: PieceData, screenX: number, screenY: number): boolean {
    const gx = Math.round((screenX - this.gridOffsetX) / this.cellSize - 0.5);
    const gy = Math.round((screenY - this.gridOffsetY) / this.cellSize - 0.5);

    if (gx < 0 || gx >= this.gridSize || gy < 0 || gy >= this.gridSize) return false;
    if (this.placedGrid[gy][gx] !== null) return false;

    const config = DIFFICULTY_CONFIG[this.difficulty];

    // Check if correct position
    if (piece.gridX === gx && piece.gridY === gy) {
      // Check rotation
      if (config.rotationEnabled && piece.rotation % 360 !== piece.targetRotation % 360) {
        return false;
      }

      // Place it
      piece.placed = true;
      piece.x = this.gridOffsetX + gx * this.cellSize + this.cellSize / 2;
      piece.y = this.gridOffsetY + gy * this.cellSize + this.cellSize / 2;
      this.placedGrid[gy][gx] = piece;
      this.placedCount++;
      this.trayPieces = this.trayPieces.filter(p => p.id !== piece.id);
      this.layoutTrayPieces();

      // Snap animation
      piece.scale = 1.2;
      this.shakeAmount = 3;

      // Play placement sound based on piece hue
      playPlaceClick(piece.color.h);

      // Particles
      for (let i = 0; i < 8; i++) {
        this.particles.push(new Particle(piece.x, piece.y, piece.color));
      }

      this.updateScore();

      // Harmony milestone check (50%, 75%, 90%)
      const scorePercent = this.aestheticScore * 100;
      const milestones = [50, 75, 90];
      for (const m of milestones) {
        if (scorePercent >= m && this.lastMilestone < m) {
          this.lastMilestone = m;
          playMilestoneSound();
          // Celebratory particle burst
          for (let pi = 0; pi < 20; pi++) {
            const palette = STYLE_PALETTES[Math.floor(Math.random() * STYLE_PALETTES.length)];
            const col = palette[Math.floor(Math.random() * palette.length)];
            this.particles.push(new Particle(piece.x + (Math.random() - 0.5) * 100, piece.y + (Math.random() - 0.5) * 100, col, 1.5));
          }
        }
      }

      // Speed mode combo
      if (this.gameMode === 'speed') {
        this.speedCombo = Math.min(this.speedCombo + 0.2, 4);
        this.speedScore += Math.round(100 * this.speedCombo);
      }

      // Check completion
      if (this.placedCount === this.totalPieces) {
        this.onPuzzleComplete();
      }

      return true;
    }

    return false;
  }

  onPuzzleComplete() {
    this.completionTime = performance.now();
    this.elapsedTime = (performance.now() - this.startTime) / 1000;

    // Play completion shimmer sound
    playCompletionShimmer();

    // Big particle burst
    const cx = this.gridOffsetX + this.gridSize * this.cellSize / 2;
    const cy = this.gridOffsetY + this.gridSize * this.cellSize / 2;
    for (let i = 0; i < 60; i++) {
      const palette = STYLE_PALETTES[Math.floor(Math.random() * STYLE_PALETTES.length)];
      const col = palette[Math.floor(Math.random() * palette.length)];
      this.particles.push(new Particle(cx + (Math.random() - 0.5) * 200, cy + (Math.random() - 0.5) * 200, col, 2));
    }

    // Save to gallery
    const entry: GalleryEntry = {
      id: generateId(),
      date: new Date().toLocaleDateString('ko-KR'),
      difficulty: this.difficulty,
      gridSize: this.gridSize,
      score: Math.round(this.aestheticScore * 100),
      timeSeconds: Math.round(this.elapsedTime),
      palette: this.pieces.slice(0, 5).map(p => p.color),
      grid: this.buildGridSnapshot(),
      mode: this.gameMode,
    };
    this.lastCompletedEntry = entry;
    this.gallery.push(entry);
    this.saveGallery();

    // Save to local leaderboard
    {
      let userName = '나';
      try { if (sdk) { const u = sdk.auth.getUser(); if (u) userName = u.name; } } catch {}
      saveToMosaicLeaderboard({
        name: userName,
        score: Math.round(this.aestheticScore * 100),
        difficulty: this.difficulty,
        timestamp: Date.now(),
      });
    }

    // Submit score to SDK
    if (sdk) {
      try {
        sdk.scores.submit({
          score: Math.round(this.aestheticScore * 100),
          meta: {
            difficulty: this.difficulty,
            mode: this.gameMode,
            symmetry: Math.round(this.symmetryScore * 100) / 100,
            harmony: Math.round(this.harmonyScore * 100) / 100,
            coherence: Math.round(this.coherenceScore * 100) / 100,
            timeSeconds: Math.round(this.elapsedTime),
          },
        });
      } catch { /* score submission failed */ }
    }

    if (this.gameMode === 'speed') {
      this.speedPuzzlesCompleted++;
      // Start next puzzle immediately in speed mode
      if (this.timeRemaining > 0) {
        const seed = Date.now();
        this.pieces = generatePuzzle('easy', seed);
        this.gridSize = 4; // Smaller for speed
        // Actually re-use easy config but smaller
        this.placedGrid = [];
        for (let y = 0; y < this.gridSize; y++) {
          this.placedGrid[y] = [];
          for (let x = 0; x < this.gridSize; x++) {
            this.placedGrid[y][x] = null;
          }
        }
        this.totalPieces = this.gridSize * this.gridSize;
        this.placedCount = 0;
        this.trayPieces = shuffle([...this.pieces].slice(0, this.totalPieces), Math.random);
        this.layoutPuzzle();
        return;
      }
    }

    // Show completion screen after a short delay
    setTimeout(() => {
      if (this.placedCount === this.totalPieces) {
        this.screen = 'complete';
      }
    }, 1500);
  }

  buildGridSnapshot(): { shape: ShapeType; color: HSL }[][] {
    const snap: { shape: ShapeType; color: HSL }[][] = [];
    for (let y = 0; y < this.gridSize; y++) {
      snap[y] = [];
      for (let x = 0; x < this.gridSize; x++) {
        const p = this.placedGrid[y]?.[x];
        if (p) {
          snap[y][x] = { shape: p.shape, color: { ...p.color } };
        } else {
          snap[y][x] = { shape: 'square', color: { h: 0, s: 0, l: 30 } };
        }
      }
    }
    return snap;
  }

  rotatePiece(piece: PieceData) {
    if (!piece.placed && DIFFICULTY_CONFIG[this.difficulty].rotationEnabled) {
      piece.rotation = (piece.rotation + 90) % 360;
      piece.scale = 1.15;
      playSpinSound();
    }
  }

  // --- Input Handling ---

  getPointerPos(e: PointerEvent): Vec2 {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  onPointerDown(e: PointerEvent) {
    const pos = this.getPointerPos(e);
    this.pointerPos = pos;

    // Check buttons first
    for (const btn of this.buttons) {
      if (pos.x >= btn.x && pos.x <= btn.x + btn.w &&
          pos.y >= btn.y && pos.y <= btn.y + btn.h) {
        btn.action();
        return;
      }
    }

    if (this.screen !== 'puzzle') return;

    // Gallery touch scroll
    if (this.screen === 'gallery') {
      this.galleryTouching = true;
      this.galleryTouchStartY = pos.y;
      this.galleryTouchScrollStart = this.galleryScroll;
      return;
    }

    // Check tray area for scrolling
    if (pos.y >= this.trayOffsetY) {
      // Find piece under pointer in tray
      const piece = this.findTrayPieceAt(pos);
      if (piece) {
        this.draggingPiece = piece;
        this.dragOffset = { x: pos.x - piece.x, y: pos.y - piece.y };
        piece.scale = 1.15;
        piece.opacity = 0.85;

        // Long-press rotation for mobile
        this.longPressPiece = piece;
        this.longPressMoved = false;
        this.longPressTimer = setTimeout(() => {
          if (this.longPressPiece === piece && !this.longPressMoved) {
            this.rotatePiece(piece);
            this.draggingPiece = null;
            piece.scale = 1;
            piece.opacity = 1;
          }
          this.longPressTimer = null;
        }, 500);
      } else {
        // Start tray scroll
        this.trayDragging = true;
        this.trayDragStartX = pos.x;
        this.trayVelocity = 0;
      }
      return;
    }

    // Check if clicking on placed piece (for info)
    // Nothing to do for placed pieces in this version
  }

  onPointerMove(e: PointerEvent) {
    const pos = this.getPointerPos(e);
    const prevPos = this.pointerPos;
    this.pointerPos = pos;

    // Button hover
    this.hoveredButton = null;
    for (const btn of this.buttons) {
      btn.hovered = pos.x >= btn.x && pos.x <= btn.x + btn.w &&
                    pos.y >= btn.y && pos.y <= btn.y + btn.h;
      if (btn.hovered) this.hoveredButton = btn;
    }

    // Harmony score tooltip hover detection
    if (this.screen === 'puzzle') {
      const scoreX = this.width - 20;
      this.harmonyTooltipVisible = (pos.x >= scoreX - 140 && pos.x <= scoreX && pos.y >= 8 && pos.y <= 36);
      this.harmonyTooltipX = pos.x;
      this.harmonyTooltipY = pos.y;
    } else {
      this.harmonyTooltipVisible = false;
    }

    // Gallery touch scroll
    if (this.galleryTouching && this.screen === 'gallery') {
      const dy = this.galleryTouchStartY - pos.y;
      this.galleryScroll = Math.max(0, this.galleryTouchScrollStart + dy);
    }

    if (this.draggingPiece) {
      this.draggingPiece.x = pos.x - this.dragOffset.x;
      this.draggingPiece.y = pos.y - this.dragOffset.y;
      // Cancel long-press if moved
      this.longPressMoved = true;
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    }

    if (this.trayDragging) {
      const dx = pos.x - prevPos.x;
      this.trayScrollX += dx;
      this.trayVelocity = dx;
      this.layoutTrayPieces();
    }
  }

  onPointerUp(e: PointerEvent) {
    const pos = this.getPointerPos(e);

    // Clean up long-press timer
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    this.longPressPiece = null;

    // End gallery touch scroll
    this.galleryTouching = false;

    if (this.draggingPiece) {
      const piece = this.draggingPiece;
      piece.opacity = 1;

      // Check if very small movement (tap) -> rotate
      const moved = dist(
        { x: piece.x, y: piece.y },
        { x: pos.x - this.dragOffset.x, y: pos.y - this.dragOffset.y }
      );

      if (moved < 5 && pos.y >= this.trayOffsetY) {
        // Tap to rotate
        this.rotatePiece(piece);
      } else {
        // Try to place
        const placed = this.tryPlacePiece(piece, piece.x, piece.y);
        if (!placed) {
          // Return to tray
          piece.scale = 1;
          this.layoutTrayPieces();
        }
      }

      this.draggingPiece = null;
    }

    if (this.trayDragging) {
      this.trayDragging = false;
      // Momentum scroll
    }
  }

  findTrayPieceAt(pos: Vec2): PieceData | null {
    const size = Math.min(this.cellSize * 0.8, 60);
    // Search in reverse for top-most
    for (let i = this.trayPieces.length - 1; i >= 0; i--) {
      const p = this.trayPieces[i];
      if (p.placed) continue;
      if (Math.abs(pos.x - p.x) < size / 2 && Math.abs(pos.y - p.y) < size / 2) {
        return p;
      }
    }
    return null;
  }

  // --- Game Loop ---

  loop(time: number) {
    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;

    this.update(dt);
    this.render();

    requestAnimationFrame(t => this.loop(t));
  }

  update(dt: number) {
    this.menuTime += dt;
    this.menuHue = (this.menuHue + dt * 15) % 360;

    // Piece animations
    for (const p of this.pieces) {
      if (p.scale !== 1) {
        p.scale += (1 - p.scale) * dt * 10;
        if (Math.abs(p.scale - 1) < 0.01) p.scale = 1;
      }
    }

    // Particles
    for (const p of this.particles) {
      p.update(dt);
    }
    this.particles = this.particles.filter(p => p.life > 0);

    // Shake
    if (this.shakeAmount > 0) {
      this.shakeAmount *= 0.9;
      if (this.shakeAmount < 0.1) this.shakeAmount = 0;
    }

    // Completion animation
    if (this.screen === 'puzzle' && this.placedCount === this.totalPieces && this.completionTime > 0) {
      this.completionAnimProgress = Math.min(1, (performance.now() - this.completionTime) / 1500);
    }

    // Speed mode timer
    if (this.timerActive && this.gameMode === 'speed' && this.screen === 'puzzle') {
      this.timeRemaining -= dt;
      if (this.timeRemaining <= 0) {
        this.timeRemaining = 0;
        this.timerActive = false;
        this.screen = 'complete';
      }
      // Combo decay
      this.speedCombo = Math.max(1, this.speedCombo - dt * 0.3);
    }

    // Zen mode elapsed time
    if (this.screen === 'puzzle' && this.gameMode === 'zen' && this.placedCount < this.totalPieces) {
      this.elapsedTime = (performance.now() - this.startTime) / 1000;
    }

    // Tray momentum
    if (!this.trayDragging && Math.abs(this.trayVelocity) > 0.1) {
      this.trayScrollX += this.trayVelocity;
      this.trayVelocity *= 0.92;
      this.layoutTrayPieces();
    }
  }

  // --- Rendering ---

  render() {
    const ctx = this.ctx;
    ctx.save();

    // Shake
    if (this.shakeAmount > 0) {
      ctx.translate(
        (Math.random() - 0.5) * this.shakeAmount,
        (Math.random() - 0.5) * this.shakeAmount
      );
    }

    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.width, this.height);

    // Default text shadow for all canvas text
    applyTextShadow(ctx);

    this.buttons = [];

    switch (this.screen) {
      case 'menu': this.renderMenu(ctx); break;
      case 'puzzle': this.renderPuzzle(ctx); break;
      case 'complete': this.renderComplete(ctx); break;
      case 'gallery': this.renderGallery(ctx); break;
    }

    clearTextShadow(ctx);

    // Tutorial overlay
    if (this.showTutorial) {
      this.renderTutorial(ctx);
    }

    // Render particles on top
    for (const p of this.particles) {
      p.render(ctx);
    }

    ctx.restore();
  }

  addButton(x: number, y: number, w: number, h: number, label: string, action: () => void, color?: string): Button {
    const btn: Button = { x, y, w, h, label, action, color };
    this.buttons.push(btn);
    return btn;
  }

  drawButton(ctx: CanvasRenderingContext2D, btn: Button) {
    const isHovered = btn.hovered || false;
    const baseColor = btn.color || '#4a3f6b';
    ctx.save();

    // Shadow
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = isHovered ? 15 : 8;
    ctx.shadowOffsetY = isHovered ? 4 : 2;

    // Background
    const r = 12;
    ctx.beginPath();
    ctx.roundRect(btn.x, btn.y, btn.w, btn.h, r);
    ctx.fillStyle = isHovered ? lightenColor(baseColor, 15) : baseColor;
    ctx.fill();

    // Border glow
    ctx.strokeStyle = isHovered ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.shadowColor = 'transparent';

    // Text with shadow
    applyTextShadow(ctx);
    ctx.fillStyle = '#f0e8dc';
    ctx.font = `600 ${Math.min(btn.h * 0.38, 18)}px 'Outfit', 'Noto Sans KR', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
    clearTextShadow(ctx);

    ctx.restore();
  }

  renderTutorial(ctx: CanvasRenderingContext2D) {
    // Dim background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, this.width, this.height);

    const cx = this.width / 2;
    const panelW = Math.min(380, this.width * 0.85);
    const panelH = 340;
    const panelX = cx - panelW / 2;
    const panelY = (this.height - panelH) / 2;

    // Panel background
    ctx.save();
    ctx.shadowColor = 'rgba(100, 80, 200, 0.3)';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#252040';
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Title
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd700';
    ctx.font = `bold ${Math.min(24, this.width * 0.055)}px 'Outfit', 'Noto Sans KR', sans-serif`;
    ctx.fillText('게임 방법', cx, panelY + 40);

    // Instructions
    const lines = [
      { icon: '\uD83C\uDFA8', text: '\uC0C9\uC0C1 \uD314\uB808\uD2B8\uC5D0\uC11C \uD0C0\uC77C\uC744 \uC120\uD0DD\uD558\uC138\uC694' },
      { icon: '\uD83E\uDDE9', text: '\uADF8\uB9AC\uB4DC\uC5D0 \uB193\uC544 \uBAA8\uC790\uC774\uD06C\uB97C \uC644\uC131\uD558\uC138\uC694' },
      { icon: '\u2B50', text: '\uC0C9\uC0C1 \uC870\uD654\uB3C4\uAC00 \uB192\uC744\uC218\uB85D \uC810\uC218\uAC00 \uC62C\uB77C\uAC11\uB2C8\uB2E4' },
      { icon: '\uD83C\uDF08', text: '\uC778\uC811\uD55C \uC0C9\uC758 \uC870\uD654: \uC720\uC0AC\uC0C9(+3) > \uBCF4\uC0C9(+2) > \uC0BC\uC0C9(+1.5)' },
    ];

    const lineStartY = panelY + 85;
    const lineGap = 48;
    ctx.font = `400 ${Math.min(15, this.width * 0.038)}px 'Outfit', 'Noto Sans KR', sans-serif`;

    lines.forEach((line, i) => {
      const y = lineStartY + i * lineGap;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#f0e8dc';
      ctx.font = `400 ${Math.min(22, this.width * 0.05)}px 'Outfit', 'Noto Sans KR', sans-serif`;
      ctx.fillText(line.icon, panelX + 20, y);
      ctx.font = `400 ${Math.min(15, this.width * 0.038)}px 'Outfit', 'Noto Sans KR', sans-serif`;
      ctx.fillStyle = 'rgba(240, 232, 220, 0.85)';
      ctx.fillText(line.text, panelX + 52, y);
    });

    ctx.restore();

    // Start button
    const btnW = Math.min(200, panelW * 0.6);
    const btnH = 48;
    const btnX = cx - btnW / 2;
    const btnY = panelY + panelH - 70;
    const btn = this.addButton(btnX, btnY, btnW, btnH, '\uC2DC\uC791\uD558\uAE30', () => {
      this.showTutorial = false;
      this._startPuzzleInternal(this._pendingDifficulty, this._pendingMode);
    }, '#2d6a4f');
    this.drawButton(ctx, btn);
  }

  renderMenu(ctx: CanvasRenderingContext2D) {
    // Animated background mosaic
    this.drawMenuBackground(ctx);

    // Title
    const titleY = this.height * 0.13;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Title glow
    ctx.shadowColor = `hsl(${this.menuHue}, 70%, 60%)`;
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#f0e8dc';
    ctx.font = `bold ${Math.min(this.width * 0.09, 48)}px 'Outfit', 'Noto Sans KR', sans-serif`;
    ctx.fillText('인피니트 모자이크', this.width / 2, titleY);

    ctx.shadowBlur = 0;
    ctx.fillStyle = `hsl(${this.menuHue}, 50%, 70%)`;
    ctx.font = `400 ${Math.min(this.width * 0.04, 18)}px 'Outfit', 'Noto Sans KR', sans-serif`;
    ctx.fillText('프로시저럴 아트 퍼즐', this.width / 2, titleY + 40);
    ctx.restore();

    // Zen Mode section
    const sectionStartY = this.height * 0.28;
    const btnW = Math.min(280, this.width * 0.7);
    const btnH = 52;
    const btnX = (this.width - btnW) / 2;
    const gap = 14;

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = `600 ${Math.min(this.width * 0.04, 16)}px 'Outfit', 'Noto Sans KR', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('젠 모드', this.width / 2, sectionStartY);

    const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
    const diffColors = ['#2d6a4f', '#b5651d', '#8b0000'];
    difficulties.forEach((d, i) => {
      const y = sectionStartY + 20 + i * (btnH + gap);
      const btn = this.addButton(btnX, y, btnW, btnH, DIFFICULTY_CONFIG[d].label, () => this.startPuzzle(d, 'zen'), diffColors[i]);
      this.drawButton(ctx, btn);
    });

    // Speed Mode section
    const speedY = sectionStartY + 20 + 3 * (btnH + gap) + 30;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = `600 ${Math.min(this.width * 0.04, 16)}px 'Outfit', 'Noto Sans KR', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('스피드 챌린지', this.width / 2, speedY);

    SPEED_TIMES.forEach((t, i) => {
      const y = speedY + 20 + i * (btnH + gap);
      const btn = this.addButton(btnX, y, btnW, btnH, `${t}초`, () => {
        this.speedTimeLimit = t;
        this.startPuzzle('easy', 'speed');
      }, '#6b3fa0');
      this.drawButton(ctx, btn);
    });

    // Gallery button
    const galleryY = speedY + 20 + 3 * (btnH + gap) + 20;
    const galleryBtn = this.addButton(btnX, galleryY, btnW, btnH, `갤러리 (${this.gallery.length}작품)`, () => {
      this.screen = 'gallery';
      this.galleryScroll = 0;
    }, '#3a506b');
    this.drawButton(ctx, galleryBtn);

    // Leaderboard button
    const lbY = galleryY + btnH + gap;
    const lbBtn = this.addButton(btnX, lbY, btnW, btnH, '\u{1F3C6} 리더보드', () => {
      showMosaicLeaderboard();
    }, '#4a3f6b');
    this.drawButton(ctx, lbBtn);

    // Login button (top-right)
    const loginBtn = this.addButton(this.width - 52, 8, 44, 36, sdkLoggedIn ? '\u{1F464}' : '\u{1F512}', () => {
      handleSdkLogin();
    }, 'rgba(255,255,255,0.1)');
    this.drawButton(ctx, loginBtn);
  }

  drawMenuBackground(ctx: CanvasRenderingContext2D) {
    const t = this.menuTime;
    const cols = 12;
    const rows = Math.ceil(this.height / (this.width / cols));
    const size = this.width / cols;

    ctx.save();
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const hue = (x * 30 + y * 45 + t * 25) % 360;
        const sat = 65 + Math.sin(t + x * 0.3 + y * 0.2) * 15;
        const lit = 45 + Math.sin(t * 1.5 + x * 0.7 + y * 0.4) * 10;
        const pulse = Math.sin(t * 2 + x * 0.5 + y * 0.3) * 2;
        const cellAlpha = 0.12 + Math.sin(t * 1.2 + x * 0.6 + y * 0.8) * 0.05;

        ctx.globalAlpha = cellAlpha;
        ctx.fillStyle = `hsl(${hue}, ${sat}%, ${lit}%)`;
        ctx.fillRect(x * size + pulse, y * size + pulse, size - 2, size - 2);

        // Subtle inner border glow
        ctx.globalAlpha = cellAlpha * 0.5;
        ctx.strokeStyle = `hsl(${(hue + 30) % 360}, ${sat}%, ${lit + 15}%)`;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x * size + pulse + 1, y * size + pulse + 1, size - 4, size - 4);
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  renderPuzzle(ctx: CanvasRenderingContext2D) {
    // Top bar
    this.drawTopBar(ctx);

    // Grid background
    this.drawGrid(ctx);

    // Placed pieces
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const piece = this.placedGrid[y][x];
        if (piece) {
          const cx = this.gridOffsetX + x * this.cellSize + this.cellSize / 2;
          const cy = this.gridOffsetY + y * this.cellSize + this.cellSize / 2;
          this.drawPiece(ctx, piece, cx, cy, this.cellSize * 0.9, piece.scale);
        }
      }
    }

    // Tray background
    ctx.fillStyle = 'rgba(10, 10, 30, 0.85)';
    ctx.fillRect(0, this.trayOffsetY, this.width, this.height - this.trayOffsetY);

    // Piece rotation help text near tray
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '400 11px "Outfit", "Noto Sans KR", sans-serif';
    ctx.fillText('\uD074\uB9AD: \uD0C0\uC77C \uBC30\uCE58 | \uC6B0\uD074\uB9AD: \uD68C\uC804', this.width / 2, this.trayOffsetY - 8);
    ctx.restore();

    // Tray separator line
    const grad = ctx.createLinearGradient(0, this.trayOffsetY, this.width, this.trayOffsetY);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(0.2, `hsl(${this.menuHue}, 60%, 50%)`);
    grad.addColorStop(0.8, `hsl(${(this.menuHue + 60) % 360}, 60%, 50%)`);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, this.trayOffsetY - 1, this.width, 2);

    // Tray pieces
    const trayPieceSize = Math.min(this.cellSize * 0.8, 60);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, this.trayOffsetY, this.width, this.height - this.trayOffsetY);
    ctx.clip();

    for (const p of this.trayPieces) {
      if (!p.placed && p !== this.draggingPiece) {
        // Drop shadow under tray pieces
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + trayPieceSize * 0.35, trayPieceSize * 0.35, trayPieceSize * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        this.drawPiece(ctx, p, p.x, p.y, trayPieceSize, p.scale);
      }
    }
    ctx.restore();

    // Dragging piece on top with enhanced visibility
    if (this.draggingPiece) {
      ctx.save();

      // Larger drag shadow (8px down, 50% opacity)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.ellipse(this.draggingPiece.x + 4, this.draggingPiece.y + 8,
        this.cellSize * 0.5, this.cellSize * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glow highlight around dragged piece
      ctx.shadowColor = `hsl(${this.draggingPiece.color.h}, 80%, 60%)`;
      ctx.shadowBlur = 15;

      ctx.globalAlpha = this.draggingPiece.opacity;
      this.drawPiece(ctx, this.draggingPiece, this.draggingPiece.x, this.draggingPiece.y,
        this.cellSize * 0.95, this.draggingPiece.scale);
      ctx.shadowBlur = 0;

      // Highlight target cell
      const gx = Math.round((this.draggingPiece.x - this.gridOffsetX) / this.cellSize - 0.5);
      const gy = Math.round((this.draggingPiece.y - this.gridOffsetY) / this.cellSize - 0.5);
      if (gx >= 0 && gx < this.gridSize && gy >= 0 && gy < this.gridSize && !this.placedGrid[gy][gx]) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          this.gridOffsetX + gx * this.cellSize + 2,
          this.gridOffsetY + gy * this.cellSize + 2,
          this.cellSize - 4, this.cellSize - 4
        );
      }
      ctx.restore();
    }

    // Completion overlay with sparkle/shimmer effect
    if (this.completionAnimProgress > 0 && this.placedCount === this.totalPieces) {
      const a = easeOutCubic(this.completionAnimProgress);
      ctx.fillStyle = `rgba(255, 255, 255, ${a * 0.15})`;
      ctx.fillRect(0, 0, this.width, this.height);

      // Shimmer sweep across the mosaic
      const gridW = this.gridSize * this.cellSize;
      const gridH = this.gridSize * this.cellSize;
      const sweepX = this.gridOffsetX + gridW * this.completionAnimProgress * 1.3 - gridW * 0.15;
      const sweepWidth = gridW * 0.3;
      const shimmerGrad = ctx.createLinearGradient(sweepX - sweepWidth / 2, 0, sweepX + sweepWidth / 2, 0);
      shimmerGrad.addColorStop(0, `rgba(255, 255, 255, 0)`);
      shimmerGrad.addColorStop(0.5, `rgba(255, 255, 255, ${a * 0.3})`);
      shimmerGrad.addColorStop(1, `rgba(255, 255, 255, 0)`);
      ctx.fillStyle = shimmerGrad;
      ctx.fillRect(this.gridOffsetX, this.gridOffsetY, gridW, gridH);

      // Sparkle stars scattered across mosaic
      const sparkleCount = 20;
      const now = performance.now() / 1000;
      for (let i = 0; i < sparkleCount; i++) {
        const phase = i * 1.7 + now * 2;
        const sparkleAlpha = Math.max(0, Math.sin(phase) * a * 0.9);
        if (sparkleAlpha <= 0) continue;
        const sx = this.gridOffsetX + (i * 37 + 13) % gridW;
        const sy = this.gridOffsetY + (i * 53 + 7) % gridH;
        const sSize = 2 + Math.sin(phase * 0.7) * 1.5;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.fillStyle = `rgba(255, 255, 220, ${sparkleAlpha})`;
        // 4-point star
        ctx.beginPath();
        ctx.moveTo(0, -sSize);
        ctx.lineTo(sSize * 0.3, -sSize * 0.3);
        ctx.lineTo(sSize, 0);
        ctx.lineTo(sSize * 0.3, sSize * 0.3);
        ctx.lineTo(0, sSize);
        ctx.lineTo(-sSize * 0.3, sSize * 0.3);
        ctx.lineTo(-sSize, 0);
        ctx.lineTo(-sSize * 0.3, -sSize * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.textAlign = 'center';
      ctx.globalAlpha = a;
      ctx.fillStyle = '#ffd700';
      ctx.font = `bold ${36 * a}px 'Outfit', 'Noto Sans KR', sans-serif`;
      ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
      ctx.shadowBlur = 20;
      ctx.fillText('완성!', this.width / 2, this.height * 0.15);
      ctx.restore();
    }

    // Back button
    const backBtn = this.addButton(8, 10, 60, 36, '뒤로', () => { this.screen = 'menu'; }, '#4a3f6b');
    this.drawButton(ctx, backBtn);
  }

  drawTopBar(ctx: CanvasRenderingContext2D) {
    // Background
    ctx.fillStyle = 'rgba(10, 10, 30, 0.9)';
    ctx.fillRect(0, 0, this.width, 56);

    ctx.save();
    ctx.textBaseline = 'middle';

    // Progress
    const progressText = `${this.placedCount} / ${this.totalPieces}`;
    ctx.fillStyle = '#e0d4c8';
    ctx.font = '600 15px "Outfit", "Noto Sans KR", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(progressText, 80, 28);

    // Progress bar
    const barX = 80;
    const barY = 42;
    const barW = 120;
    const barH = 5;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 3);
    ctx.fill();

    const progress = this.placedCount / this.totalPieces;
    const progressGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    progressGrad.addColorStop(0, '#4ade80');
    progressGrad.addColorStop(1, '#22d3ee');
    ctx.fillStyle = progressGrad;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW * progress, barH, 3);
    ctx.fill();

    // Aesthetic score with harmony gauge arc
    const scoreX = this.width - 20;
    const gaugeR = 18;
    const gaugeCx = scoreX - 55;
    const gaugeCy = 24;
    const scoreVal = this.aestheticScore;

    // Gauge background arc
    ctx.beginPath();
    ctx.arc(gaugeCx, gaugeCy, gaugeR, Math.PI * 0.8, Math.PI * 2.2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Gauge fill arc
    const startAngle = Math.PI * 0.8;
    const endAngle = startAngle + (Math.PI * 1.4) * scoreVal;
    if (scoreVal > 0) {
      const gaugeGrad = ctx.createLinearGradient(gaugeCx - gaugeR, gaugeCy, gaugeCx + gaugeR, gaugeCy);
      gaugeGrad.addColorStop(0, '#ef4444');
      gaugeGrad.addColorStop(0.5, '#fbbf24');
      gaugeGrad.addColorStop(1, '#4ade80');
      ctx.beginPath();
      ctx.arc(gaugeCx, gaugeCy, gaugeR, startAngle, endAngle);
      ctx.strokeStyle = gaugeGrad;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Score number inside gauge
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fbbf24';
    ctx.font = '700 11px "Outfit", "Noto Sans KR", sans-serif';
    ctx.fillText(`${Math.round(scoreVal * 100)}`, gaugeCx, gaugeCy + 4);

    // Label to the right
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(251, 191, 36, 0.7)';
    ctx.font = '500 11px "Outfit", "Noto Sans KR", sans-serif';
    ctx.fillText('조화', scoreX, 22);

    // Timer or elapsed
    ctx.fillStyle = '#a0a0c0';
    ctx.font = '400 13px "Outfit", "Noto Sans KR", sans-serif';
    if (this.gameMode === 'speed') {
      const secs = Math.ceil(this.timeRemaining);
      const urgent = this.timeRemaining < 10;

      // Prominent countdown display
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Large countdown in center-top area
      const cdY = 28;
      if (urgent) {
        // Pulsing red effect
        const pulse = 0.7 + Math.sin(this.menuTime * 8) * 0.3;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#ef4444';
        ctx.font = `bold 28px 'Outfit', 'Noto Sans KR', sans-serif`;
        ctx.shadowColor = 'rgba(239, 68, 68, 0.6)';
        ctx.shadowBlur = 15;
      } else {
        ctx.fillStyle = '#fbbf24';
        ctx.font = `bold 22px 'Outfit', 'Noto Sans KR', sans-serif`;
        ctx.shadowColor = 'rgba(251, 191, 36, 0.3)';
        ctx.shadowBlur = 10;
      }
      const mins = Math.floor(secs / 60);
      const secPart = secs % 60;
      const timeStr = mins > 0 ? `${mins}:${secPart.toString().padStart(2, '0')}` : `${secs}s`;
      ctx.fillText(timeStr, this.width / 2, cdY);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      // Timer progress bar below
      const timerBarW = Math.min(160, this.width * 0.3);
      const timerBarH = 4;
      const timerBarX = this.width / 2 - timerBarW / 2;
      const timerBarY = cdY + 16;
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      ctx.roundRect(timerBarX, timerBarY, timerBarW, timerBarH, 2);
      ctx.fill();
      const timerProgress = this.timeRemaining / this.speedTimeLimit;
      ctx.fillStyle = urgent ? '#ef4444' : '#fbbf24';
      ctx.beginPath();
      ctx.roundRect(timerBarX, timerBarY, timerBarW * timerProgress, timerBarH, 2);
      ctx.fill();

      // Combo below score
      ctx.fillStyle = '#fbbf24';
      ctx.font = '500 12px "Outfit", "Noto Sans KR", sans-serif';
      ctx.fillText(`콤보: x${this.speedCombo.toFixed(1)}`, this.width / 2, 48);

      ctx.restore();

      // Speed score on the right (smaller text)
      ctx.textAlign = 'right';
      ctx.fillStyle = '#a0a0c0';
      ctx.font = '400 12px "Outfit", "Noto Sans KR", sans-serif';
      ctx.fillText(`속도: ${this.speedScore}`, scoreX, 42);
    } else {
      const mins = Math.floor(this.elapsedTime / 60);
      const secs = Math.floor(this.elapsedTime % 60);
      ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, scoreX, 42);
    }

    // Rotation hint
    if (DIFFICULTY_CONFIG[this.difficulty].rotationEnabled) {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = '400 11px "Outfit", "Noto Sans KR", sans-serif';
      ctx.fillText('탭하여 회전', this.width / 2, 28);
    }

    // Harmony score tooltip
    if (this.harmonyTooltipVisible) {
      const score = Math.round(this.aestheticScore * 100);
      let label = '';
      if (score >= 80) label = '\uC644\uBCBD\uD55C \uC870\uD654! \uB9C8\uC2A4\uD130\uD53C\uC2A4!';
      else if (score >= 60) label = '\uC88B\uC740 \uC870\uD654! \uACC4\uC18D \uB9DE\uCDB0\uBCF4\uC138\uC694';
      else if (score >= 40) label = '\uBCF4\uD1B5 \uC870\uD654. \uC0C9\uBC30\uCE58\uB97C \uB2E4\uC2DC \uD655\uC778\uD558\uC138\uC694';
      else label = '\uC870\uD654\uAC00 \uB0AE\uC2B5\uB2C8\uB2E4. \uC720\uC0AC\uC0C9\uC744 \uC778\uC811\uD574 \uBC30\uCE58\uD558\uC138\uC694';

      const ttW = Math.min(280, this.width * 0.6);
      const ttH = 36;
      const ttX = this.width - ttW - 10;
      const ttY = 52;
      ctx.fillStyle = 'rgba(30, 25, 50, 0.92)';
      ctx.beginPath();
      ctx.roundRect(ttX, ttY, ttW, ttH, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'center';
      ctx.font = '500 12px "Outfit", "Noto Sans KR", sans-serif';
      ctx.fillText(label, ttX + ttW / 2, ttY + ttH / 2 + 1);
    }

    ctx.restore();
  }

  drawGrid(ctx: CanvasRenderingContext2D) {
    ctx.save();

    // Grid area background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.fillRect(this.gridOffsetX, this.gridOffsetY,
      this.gridSize * this.cellSize, this.gridSize * this.cellSize);

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= this.gridSize; i++) {
      ctx.beginPath();
      ctx.moveTo(this.gridOffsetX + i * this.cellSize, this.gridOffsetY);
      ctx.lineTo(this.gridOffsetX + i * this.cellSize, this.gridOffsetY + this.gridSize * this.cellSize);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(this.gridOffsetX, this.gridOffsetY + i * this.cellSize);
      ctx.lineTo(this.gridOffsetX + this.gridSize * this.cellSize, this.gridOffsetY + i * this.cellSize);
      ctx.stroke();
    }

    // Empty cell indicators - crosshatch dot pattern
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        if (!this.placedGrid[y][x]) {
          const cellX = this.gridOffsetX + x * this.cellSize;
          const cellY = this.gridOffsetY + y * this.cellSize;
          const cs = this.cellSize;

          // Subtle dot grid pattern
          const dotSpacing = Math.max(8, cs / 5);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
          for (let dy = dotSpacing; dy < cs; dy += dotSpacing) {
            for (let dx = dotSpacing; dx < cs; dx += dotSpacing) {
              ctx.beginPath();
              ctx.arc(cellX + dx, cellY + dy, 0.8, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          // Subtle crosshatch lines
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(cellX + cs * 0.2, cellY + cs * 0.8);
          ctx.lineTo(cellX + cs * 0.8, cellY + cs * 0.2);
          ctx.moveTo(cellX + cs * 0.2, cellY + cs * 0.2);
          ctx.lineTo(cellX + cs * 0.8, cellY + cs * 0.8);
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  }

  drawPiece(ctx: CanvasRenderingContext2D, piece: PieceData, cx: number, cy: number, size: number, scale: number) {
    ctx.save();
    clearTextShadow(ctx);
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.rotate((piece.rotation * Math.PI) / 180);

    const half = size / 2;
    const color = hslToString(piece.color);
    const lightColor = hslToString({ h: piece.color.h, s: piece.color.s, l: Math.min(85, piece.color.l + 15) });
    const darkColor = hslToString({ h: piece.color.h, s: piece.color.s, l: Math.max(15, piece.color.l - 15) });

    switch (piece.shape) {
      case 'square': {
        // Beveled square with 3D effect
        const r = size * 0.1;
        const bevel = Math.max(2, size * 0.06);
        ctx.beginPath();
        ctx.roundRect(-half, -half, size, size, r);
        ctx.fillStyle = color;
        ctx.fill();

        // 3D bevel - lighter top-left edge
        ctx.beginPath();
        ctx.moveTo(-half + r, -half);
        ctx.lineTo(half - r, -half);
        ctx.quadraticCurveTo(half, -half, half, -half + r);
        ctx.lineTo(half - bevel, -half + r + bevel);
        ctx.lineTo(-half + r + bevel, -half + bevel);
        ctx.lineTo(-half + bevel, -half + r + bevel);
        ctx.lineTo(-half, half - r);
        ctx.quadraticCurveTo(-half, -half, -half + r, -half);
        ctx.closePath();
        ctx.fillStyle = lightColor;
        ctx.globalAlpha = 0.25;
        ctx.fill();
        ctx.globalAlpha = 1;

        // 3D bevel - darker bottom-right edge
        ctx.beginPath();
        ctx.moveTo(half, -half + r);
        ctx.lineTo(half, half - r);
        ctx.quadraticCurveTo(half, half, half - r, half);
        ctx.lineTo(-half + r, half);
        ctx.quadraticCurveTo(-half, half, -half, half - r);
        ctx.lineTo(-half + bevel, half - r - bevel);
        ctx.lineTo(-half + r + bevel, half - bevel);
        ctx.lineTo(half - r - bevel, half - bevel);
        ctx.lineTo(half - bevel, half - r - bevel);
        ctx.lineTo(half - bevel, -half + r + bevel);
        ctx.closePath();
        ctx.fillStyle = darkColor;
        ctx.globalAlpha = 0.2;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Top highlight shine
        ctx.beginPath();
        ctx.roundRect(-half + 3, -half + 3, size - 6, size / 3 - 3, [r, r, 0, 0]);
        ctx.fillStyle = `rgba(255,255,255,0.1)`;
        ctx.fill();

        // Border
        ctx.beginPath();
        ctx.roundRect(-half, -half, size, size, r);
        ctx.strokeStyle = darkColor;
        ctx.lineWidth = 1;
        ctx.stroke();
        break;
      }

      case 'triangle': {
        ctx.beginPath();
        ctx.moveTo(0, -half);
        ctx.lineTo(half, half);
        ctx.lineTo(-half, half);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        // 3D bevel - light top-left edge
        ctx.beginPath();
        ctx.moveTo(0, -half);
        ctx.lineTo(-half, half);
        ctx.lineTo(-half * 0.6, half * 0.6);
        ctx.lineTo(0, -half + 6);
        ctx.closePath();
        ctx.fillStyle = lightColor;
        ctx.globalAlpha = 0.2;
        ctx.fill();
        ctx.globalAlpha = 1;

        // 3D bevel - dark bottom-right edge
        ctx.beginPath();
        ctx.moveTo(0, -half);
        ctx.lineTo(half, half);
        ctx.lineTo(-half, half);
        ctx.lineTo(-half * 0.6, half * 0.6);
        ctx.lineTo(half * 0.5, half * 0.6);
        ctx.lineTo(0, -half + 6);
        ctx.closePath();
        ctx.fillStyle = darkColor;
        ctx.globalAlpha = 0.15;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Highlight
        ctx.beginPath();
        ctx.moveTo(0, -half + 6);
        ctx.lineTo(half * 0.3, half * 0.1);
        ctx.lineTo(-half * 0.3, half * 0.1);
        ctx.closePath();
        ctx.fillStyle = `rgba(255,255,255,0.08)`;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, -half);
        ctx.lineTo(half, half);
        ctx.lineTo(-half, half);
        ctx.closePath();
        ctx.strokeStyle = darkColor;
        ctx.lineWidth = 1;
        ctx.stroke();
        break;
      }

      case 'hexagon': {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          const hx = Math.cos(angle) * half;
          const hy = Math.sin(angle) * half;
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        // Inner highlight
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          const hx = Math.cos(angle) * half * 0.6;
          const hy = Math.sin(angle) * half * 0.6 - half * 0.1;
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(255,255,255,0.08)`;
        ctx.fill();

        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          const hx = Math.cos(angle) * half;
          const hy = Math.sin(angle) * half;
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.strokeStyle = darkColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        break;
      }

      case 'diamond': {
        ctx.beginPath();
        ctx.moveTo(0, -half);
        ctx.lineTo(half, 0);
        ctx.lineTo(0, half);
        ctx.lineTo(-half, 0);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        // Top facet
        ctx.beginPath();
        ctx.moveTo(0, -half + 3);
        ctx.lineTo(half * 0.5, 0);
        ctx.lineTo(0, -half * 0.3);
        ctx.lineTo(-half * 0.5, 0);
        ctx.closePath();
        ctx.fillStyle = `rgba(255,255,255,0.1)`;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, -half);
        ctx.lineTo(half, 0);
        ctx.lineTo(0, half);
        ctx.lineTo(-half, 0);
        ctx.closePath();
        ctx.strokeStyle = darkColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        break;
      }
    }

    ctx.restore();
  }

  renderComplete(ctx: CanvasRenderingContext2D) {
    // Background with subtle mosaic
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.width, this.height);
    this.drawMenuBackground(ctx);

    const entry = this.lastCompletedEntry;
    if (!entry) return;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Title
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = 'rgba(255, 215, 0, 0.4)';
    ctx.shadowBlur = 20;
    ctx.font = `bold ${Math.min(this.width * 0.08, 40)}px 'Outfit', 'Noto Sans KR', sans-serif`;
    ctx.fillText('걸작 완성!', this.width / 2, this.height * 0.08);
    ctx.shadowBlur = 0;

    // Mini mosaic preview
    const previewSize = Math.min(this.width * 0.55, this.height * 0.3, 250);
    const previewX = (this.width - previewSize) / 2;
    const previewY = this.height * 0.13;
    const cellSize = previewSize / entry.gridSize;

    for (let y = 0; y < entry.gridSize; y++) {
      for (let x = 0; x < entry.gridSize; x++) {
        const cell = entry.grid[y]?.[x];
        if (cell) {
          ctx.fillStyle = hslToString(cell.color);
          const r = cellSize * 0.08;
          ctx.beginPath();
          ctx.roundRect(
            previewX + x * cellSize + 1,
            previewY + y * cellSize + 1,
            cellSize - 2, cellSize - 2, r
          );
          ctx.fill();
        }
      }
    }

    // Frame around preview
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(previewX - 4, previewY - 4, previewSize + 8, previewSize + 8);

    // Serial number
    const serialY = previewY + previewSize + 25;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '400 12px monospace';
    ctx.fillText(`#${entry.id.toUpperCase()} | ${entry.date}`, this.width / 2, serialY);

    // Score section
    const scoreY = serialY + 35;
    ctx.fillStyle = '#f0e8dc';
    ctx.font = `bold ${Math.min(28, this.width * 0.06)}px 'Outfit', 'Noto Sans KR', sans-serif`;
    ctx.fillText(`미적 점수: ${entry.score}`, this.width / 2, scoreY);

    // Radar chart (simplified as bars)
    const barStartY = scoreY + 35;
    const barW = Math.min(220, this.width * 0.5);
    const barH = 16;
    const barGap = 28;
    const barX = (this.width - barW) / 2;

    const metrics = [
      { label: '대칭', value: this.symmetryScore, color: '#4ade80' },
      { label: '조화', value: this.harmonyScore, color: '#60a5fa' },
      { label: '통일성', value: this.coherenceScore, color: '#f472b6' },
    ];

    metrics.forEach((m, i) => {
      const y = barStartY + i * barGap;
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '500 13px "Outfit", "Noto Sans KR", sans-serif';
      ctx.fillText(m.label, barX, y - 3);

      // Bar bg
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.roundRect(barX, y + 4, barW, barH, 4);
      ctx.fill();

      // Bar fill
      ctx.fillStyle = m.color;
      ctx.beginPath();
      ctx.roundRect(barX, y + 4, barW * m.value, barH, 4);
      ctx.fill();

      // Value
      ctx.textAlign = 'right';
      ctx.fillStyle = '#f0e8dc';
      ctx.fillText(`${Math.round(m.value * 100)}%`, barX + barW, y - 3);
    });

    // Time
    const timeY = barStartY + 3 * barGap + 10;
    if (this.gameMode === 'speed') {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fbbf24';
      ctx.font = '600 18px "Outfit", "Noto Sans KR", sans-serif';
      ctx.fillText(`스피드 점수: ${this.speedScore}`, this.width / 2, timeY);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '400 14px "Outfit", "Noto Sans KR", sans-serif';
      ctx.fillText(`퍼즐: ${this.speedPuzzlesCompleted}개 | 최대 콤보: x${this.speedCombo.toFixed(1)}`, this.width / 2, timeY + 25);
    } else {
      const mins = Math.floor(entry.timeSeconds / 60);
      const secs = entry.timeSeconds % 60;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '400 14px "Outfit", "Noto Sans KR", sans-serif';
      ctx.fillText(`시간: ${mins}분 ${secs}초`, this.width / 2, timeY);
    }

    ctx.restore();

    // Buttons
    const btnW = Math.min(240, this.width * 0.6);
    const btnH = 48;
    const btnX = (this.width - btnW) / 2;
    const btnBaseY = this.height * 0.82;

    const playAgainBtn = this.addButton(btnX, btnBaseY, btnW, btnH, 'Play Again', () => {
      this.startPuzzle(this.difficulty, this.gameMode);
    }, '#2d6a4f');
    this.drawButton(ctx, playAgainBtn);

    const galleryBtn = this.addButton(btnX, btnBaseY + btnH + 12, btnW, btnH, '갤러리 보기', () => {
      this.screen = 'gallery';
      this.galleryScroll = 0;
    }, '#3a506b');
    this.drawButton(ctx, galleryBtn);

    const menuBtn = this.addButton(btnX, btnBaseY + (btnH + 12) * 2, btnW, 40, 'Main Menu', () => {
      this.screen = 'menu';
    }, '#4a3f6b');
    this.drawButton(ctx, menuBtn);
  }

  renderGallery(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.width, this.height);

    // Header
    ctx.fillStyle = 'rgba(10, 10, 30, 0.95)';
    ctx.fillRect(0, 0, this.width, 56);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f0e8dc';
    ctx.font = `bold ${Math.min(this.width * 0.05, 24)}px 'Outfit', 'Noto Sans KR', sans-serif`;
    ctx.fillText('나의 갤러리', this.width / 2, 28);
    ctx.restore();

    // Back button
    const backBtn = this.addButton(8, 10, 60, 36, '뒤로', () => { this.screen = 'menu'; }, '#4a3f6b');
    this.drawButton(ctx, backBtn);

    if (this.gallery.length === 0) {
      ctx.save();
      ctx.textAlign = 'center';

      // Empty state icon
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.font = `${Math.min(64, this.width * 0.12)}px 'Outfit', 'Noto Sans KR', sans-serif`;
      ctx.fillText('\uD83D\uDDBC\uFE0F', this.width / 2, this.height * 0.38);

      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = `500 ${Math.min(18, this.width * 0.045)}px 'Outfit', 'Noto Sans KR', sans-serif`;
      ctx.fillText('\uC544\uC9C1 \uC644\uC131\uD55C \uC791\uD488\uC774 \uC5C6\uC2B5\uB2C8\uB2E4', this.width / 2, this.height * 0.48);

      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = `400 ${Math.min(14, this.width * 0.035)}px 'Outfit', 'Noto Sans KR', sans-serif`;
      ctx.fillText('\uD37C\uC990\uC744 \uC644\uC131\uD558\uBA74 \uC5EC\uAE30\uC5D0 \uC791\uD488\uC774 \uC800\uC7A5\uB429\uB2C8\uB2E4', this.width / 2, this.height * 0.53);
      ctx.restore();

      // CTA button
      const btnW = Math.min(220, this.width * 0.55);
      const btnH = 48;
      const startBtn = this.addButton(
        (this.width - btnW) / 2, this.height * 0.60, btnW, btnH,
        '\uD37C\uC990 \uC2DC\uC791\uD558\uAE30', () => { this.screen = 'menu'; }, '#2d6a4f'
      );
      this.drawButton(ctx, startBtn);
      return;
    }

    // Gallery grid
    const cols = this.width > 600 ? 3 : 2;
    const padding = 16;
    const cardSize = (this.width - padding * (cols + 1)) / cols;
    const startY = 70 - this.galleryScroll;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 56, this.width, this.height - 56);
    ctx.clip();

    const reversed = [...this.gallery].reverse();
    reversed.forEach((entry, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = padding + col * (cardSize + padding);
      const y = startY + row * (cardSize + 60 + padding);

      if (y + cardSize + 60 < 56 || y > this.height) return; // cull off-screen

      // Card background
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.beginPath();
      ctx.roundRect(x, y, cardSize, cardSize + 50, 10);
      ctx.fill();

      // Mini mosaic
      const gs = entry.gridSize;
      const cs = cardSize / gs;
      for (let gy = 0; gy < gs; gy++) {
        for (let gx = 0; gx < gs; gx++) {
          const cell = entry.grid[gy]?.[gx];
          if (cell) {
            ctx.fillStyle = hslToString(cell.color);
            ctx.fillRect(x + gx * cs + 0.5, y + gy * cs + 0.5, cs - 1, cs - 1);
          }
        }
      }

      // Info below mosaic
      ctx.fillStyle = '#e0d4c8';
      ctx.font = '500 12px "Outfit", "Noto Sans KR", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`점수: ${entry.score}`, x + 4, y + cardSize + 6);

      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '400 10px "Outfit", "Noto Sans KR", sans-serif';
      ctx.fillText(`${entry.date} | ${entry.difficulty} | ${entry.mode}`, x + 4, y + cardSize + 24);

      if (entry.timeSeconds > 0) {
        const m = Math.floor(entry.timeSeconds / 60);
        const s = entry.timeSeconds % 60;
        ctx.fillText(`${m}m ${s}s`, x + 4, y + cardSize + 38);
      }
    });

    ctx.restore();

    // Scroll limit
    const totalRows = Math.ceil(this.gallery.length / cols);
    const maxScroll = Math.max(0, totalRows * (cardSize + 60 + padding) - (this.height - 70));
    this.galleryScroll = clamp(this.galleryScroll, 0, maxScroll);
  }
}

// --- Particles ---

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: HSL;
  size: number;

  constructor(x: number, y: number, color: HSL, sizeMultiplier = 1) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 120;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.maxLife = 0.5 + Math.random() * 0.8;
    this.life = this.maxLife;
    this.color = { ...color };
    this.size = (2 + Math.random() * 4) * sizeMultiplier;
  }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += 120 * dt; // gravity
    this.vx *= 0.98;
    this.life -= dt;
  }

  render(ctx: CanvasRenderingContext2D) {
    if (this.life <= 0) return;
    const t = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = t;
    ctx.fillStyle = hslToString(this.color);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * t, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// --- Helper ---

function lightenColor(hex: string, percent: number): string {
  // Simple approach: just parse and adjust
  // For our buttons we use HSL-like approach
  if (hex.startsWith('#')) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const lr = Math.min(255, r + percent * 2);
    const lg = Math.min(255, g + percent * 2);
    const lb = Math.min(255, b + percent * 2);
    return `rgb(${lr}, ${lg}, ${lb})`;
  }
  return hex;
}

// --- Init ---

new Game();
