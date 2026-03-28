// ============================================================
// Terrain generation using simplex-like noise
// ============================================================

import { TerrainType } from './types';

// Simple seeded PRNG
function mulberry32(a: number): () => number {
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Value noise (smooth random)
export class NoiseGenerator {
  private grid: number[][] = [];
  private gridSize: number;
  private rng: () => number;

  constructor(seed: number, gridSize: number = 32) {
    this.gridSize = gridSize;
    this.rng = mulberry32(seed);
    this.grid = [];
    for (let y = 0; y < gridSize + 1; y++) {
      this.grid[y] = [];
      for (let x = 0; x < gridSize + 1; x++) {
        this.grid[y][x] = this.rng();
      }
    }
  }

  private smoothstep(t: number): number {
    return t * t * (3 - 2 * t);
  }

  sample(x: number, y: number): number {
    const gx = (x * this.gridSize) % this.gridSize;
    const gy = (y * this.gridSize) % this.gridSize;
    const ix = Math.floor(gx);
    const iy = Math.floor(gy);
    const fx = this.smoothstep(gx - ix);
    const fy = this.smoothstep(gy - iy);

    const ix1 = (ix + 1) % (this.gridSize + 1);
    const iy1 = (iy + 1) % (this.gridSize + 1);

    const v00 = this.grid[iy][ix];
    const v10 = this.grid[iy][ix1];
    const v01 = this.grid[iy1][ix];
    const v11 = this.grid[iy1][ix1];

    const top = v00 + (v10 - v00) * fx;
    const bottom = v01 + (v11 - v01) * fx;
    return top + (bottom - top) * fy;
  }

  fbm(x: number, y: number, octaves: number = 4): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxVal = 0;

    for (let i = 0; i < octaves; i++) {
      value += this.sample(x * frequency, y * frequency) * amplitude;
      maxVal += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }

    return value / maxVal;
  }
}

export const WORLD_SIZE = 2000;
export const TILE_SIZE = 20;
export const GRID_W = Math.floor(WORLD_SIZE / TILE_SIZE);
export const GRID_H = Math.floor(WORLD_SIZE / TILE_SIZE);

export class TerrainMap {
  tiles: TerrainType[][] = [];
  heightMap: number[][] = [];
  moistureMap: number[][] = [];

  constructor(seed: number = 42) {
    const heightNoise = new NoiseGenerator(seed, 24);
    const moistureNoise = new NoiseGenerator(seed + 1000, 20);
    const detailNoise = new NoiseGenerator(seed + 2000, 48);

    this.tiles = [];
    this.heightMap = [];
    this.moistureMap = [];

    for (let y = 0; y < GRID_H; y++) {
      this.tiles[y] = [];
      this.heightMap[y] = [];
      this.moistureMap[y] = [];

      for (let x = 0; x < GRID_W; x++) {
        const nx = x / GRID_W;
        const ny = y / GRID_H;

        const height = heightNoise.fbm(nx, ny, 4) + detailNoise.fbm(nx, ny, 2) * 0.15;
        const moisture = moistureNoise.fbm(nx, ny, 3);

        // Edge falloff to create island-like shape
        const dx = (nx - 0.5) * 2;
        const dy = (ny - 0.5) * 2;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const edgeFalloff = 1 - Math.min(1, dist * 0.9);
        const h = height * edgeFalloff;

        this.heightMap[y][x] = h;
        this.moistureMap[y][x] = moisture;

        if (h < 0.3) {
          this.tiles[y][x] = TerrainType.Water;
        } else if (h < 0.38) {
          this.tiles[y][x] = TerrainType.Sand;
        } else if (h < 0.6) {
          this.tiles[y][x] = moisture > 0.55 ? TerrainType.Forest : TerrainType.Grass;
        } else if (h < 0.75) {
          this.tiles[y][x] = moisture > 0.6 ? TerrainType.Forest : TerrainType.Grass;
        } else {
          this.tiles[y][x] = TerrainType.Mountain;
        }
      }
    }
  }

  getTile(x: number, y: number): TerrainType {
    const gx = Math.floor(x / TILE_SIZE);
    const gy = Math.floor(y / TILE_SIZE);
    if (gx < 0 || gx >= GRID_W || gy < 0 || gy >= GRID_H) return TerrainType.Water;
    return this.tiles[gy][gx];
  }

  isWalkable(x: number, y: number, aquatic: boolean = false): boolean {
    const tile = this.getTile(x, y);
    if (aquatic) return tile === TerrainType.Water;
    return tile !== TerrainType.Water && tile !== TerrainType.Mountain;
  }
}

export const TERRAIN_COLORS: Record<TerrainType, { base: string; dark: string }> = {
  [TerrainType.Water]: { base: '#2a6f9f', dark: '#1a4f7f' },
  [TerrainType.Sand]: { base: '#d4c490', dark: '#b0a070' },
  [TerrainType.Grass]: { base: '#5a9a4a', dark: '#3a7a2a' },
  [TerrainType.Forest]: { base: '#2a6a2a', dark: '#1a4a1a' },
  [TerrainType.Mountain]: { base: '#8a8a7a', dark: '#6a6a5a' },
};
