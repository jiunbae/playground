// ==================== TYPES ====================

export interface Vec2 {
  x: number;
  y: number;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Weather = 'clear' | 'rain' | 'wind' | 'sunny';
export type TimeOfDay = 'dawn' | 'morning' | 'noon' | 'evening' | 'night';
export type GameScreen = 'menu' | 'garden' | 'catalog' | 'planting';

export interface PlantType {
  id: string;
  name: string;
  nameKo: string;
  category: 'tree' | 'flower' | 'bush' | 'mushroom' | 'vine' | 'grass';
  growthTime: number; // seconds to fully grow (accelerated)
  waterNeed: number; // 0-1 how quickly it needs water
  baseColor: HSL;
  colorVariants: HSL[];
  lSystemRule: string;
  lSystemAngle: number;
  lSystemIterations: number;
  maxHeight: number;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  seasonBonus: Season | null;
  aestheticValue: number; // base aesthetic points
}

export interface PlantInstance {
  id: number;
  typeId: string;
  gridX: number;
  gridY: number;
  growth: number; // 0-1
  water: number; // 0-1
  health: number; // 0-1
  plantedAt: number;
  lastWatered: number;
  colorVariant: number;
  sizeVariant: number; // 0.8-1.2
  swayOffset: number;
  bloomPhase: number; // for flowers
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: Color;
  type: 'rain' | 'leaf' | 'sparkle' | 'petal' | 'water_drop';
}

export interface GardenState {
  plants: PlantInstance[];
  gridWidth: number;
  gridHeight: number;
  level: number;
  experience: number;
  coins: number;
  unlockedPlants: string[];
  aestheticScore: number;
  totalPlantsGrown: number;
}

export interface ButtonDef {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  action: () => void;
  color?: string;
  hovered?: boolean;
}
