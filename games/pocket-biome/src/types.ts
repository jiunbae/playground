// ============================================================
// Core Types for Pocket Biome
// ============================================================

export interface Vec2 {
  x: number;
  y: number;
}

export enum TerrainType {
  Water = 0,
  Sand = 1,
  Grass = 2,
  Forest = 3,
  Mountain = 4,
}

export enum SpeciesType {
  Rabbit = 'rabbit',
  Deer = 'deer',
  Wolf = 'wolf',
  Fox = 'fox',
  Eagle = 'eagle',
  Fish = 'fish',
  Butterfly = 'butterfly',
  Bee = 'bee',
  Frog = 'frog',
  Mouse = 'mouse',
}

export enum CreatureCategory {
  Herbivore = 'herbivore',
  Predator = 'predator',
  Insect = 'insect',
  Fish = 'fish',
  Bird = 'bird',
}

export enum BehaviorState {
  Idle = 'idle',
  Wander = 'wander',
  SeekFood = 'seekFood',
  Eating = 'eating',
  Flee = 'flee',
  Hunt = 'hunt',
  Reproduce = 'reproduce',
  Rest = 'rest',
  Dead = 'dead',
}

export interface Genetics {
  speed: number;       // 0.5 - 2.0
  size: number;        // 0.5 - 2.0
  senseRange: number;  // 0.5 - 2.0
  color: number;       // hue shift -30 to 30
  aggression: number;  // 0 - 1
  sociability: number; // 0 - 1
}

export interface Creature {
  id: number;
  species: SpeciesType;
  category: CreatureCategory;
  pos: Vec2;
  vel: Vec2;
  genetics: Genetics;
  energy: number;
  maxEnergy: number;
  hunger: number;
  fear: number;
  reproductionUrge: number;
  age: number;
  maxAge: number;
  state: BehaviorState;
  stateTimer: number;
  targetId: number | null;
  targetPos: Vec2 | null;
  nickname: string | null;
  generation: number;
  parentIds: number[];
  childCount: number;
  alive: boolean;
  birthDay: number;
}

export interface Plant {
  id: number;
  pos: Vec2;
  energy: number;
  maxEnergy: number;
  growthRate: number;
  size: number;
  terrain: TerrainType;
}

export interface Fence {
  id: number;
  start: Vec2;
  end: Vec2;
}

export interface JournalEntry {
  day: number;
  time: string;
  text: string;
}

export interface Discovery {
  id: string;
  title: string;
  description: string;
  day: number;
  category: 'species' | 'behavior' | 'event';
  icon: string;
  color: string;
}

export interface PopulationSnapshot {
  day: number;
  counts: Record<SpeciesType, number>;
  total: number;
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export const SPECIES_CONFIG: Record<SpeciesType, {
  category: CreatureCategory;
  baseSpeed: number;
  baseSize: number;
  baseSenseRange: number;
  maxEnergy: number;
  maxAge: number;
  color: string;
  symbol: string;
  diet: ('plant' | SpeciesType)[];
  predators: SpeciesType[];
  preferredTerrain: TerrainType[];
}> = {
  [SpeciesType.Rabbit]: {
    category: CreatureCategory.Herbivore,
    baseSpeed: 1.8,
    baseSize: 0.7,
    baseSenseRange: 80,
    maxEnergy: 80,
    maxAge: 600,
    color: '#c4a882',
    symbol: 'R',
    diet: ['plant'],
    predators: [SpeciesType.Wolf, SpeciesType.Fox, SpeciesType.Eagle],
    preferredTerrain: [TerrainType.Grass, TerrainType.Forest],
  },
  [SpeciesType.Deer]: {
    category: CreatureCategory.Herbivore,
    baseSpeed: 1.5,
    baseSize: 1.4,
    baseSenseRange: 100,
    maxEnergy: 120,
    maxAge: 900,
    color: '#b8956a',
    symbol: 'D',
    diet: ['plant'],
    predators: [SpeciesType.Wolf],
    preferredTerrain: [TerrainType.Grass, TerrainType.Forest],
  },
  [SpeciesType.Wolf]: {
    category: CreatureCategory.Predator,
    baseSpeed: 2.0,
    baseSize: 1.3,
    baseSenseRange: 120,
    maxEnergy: 100,
    maxAge: 800,
    color: '#7a7a8a',
    symbol: 'W',
    diet: [SpeciesType.Rabbit, SpeciesType.Deer, SpeciesType.Mouse],
    predators: [],
    preferredTerrain: [TerrainType.Grass, TerrainType.Forest],
  },
  [SpeciesType.Fox]: {
    category: CreatureCategory.Predator,
    baseSpeed: 1.9,
    baseSize: 0.9,
    baseSenseRange: 90,
    maxEnergy: 70,
    maxAge: 600,
    color: '#d4793a',
    symbol: 'F',
    diet: [SpeciesType.Rabbit, SpeciesType.Mouse, SpeciesType.Frog],
    predators: [SpeciesType.Wolf, SpeciesType.Eagle],
    preferredTerrain: [TerrainType.Forest, TerrainType.Grass],
  },
  [SpeciesType.Eagle]: {
    category: CreatureCategory.Bird,
    baseSpeed: 2.5,
    baseSize: 1.1,
    baseSenseRange: 150,
    maxEnergy: 90,
    maxAge: 1000,
    color: '#5a3a1a',
    symbol: 'E',
    diet: [SpeciesType.Rabbit, SpeciesType.Mouse, SpeciesType.Fish],
    predators: [],
    preferredTerrain: [TerrainType.Mountain, TerrainType.Forest, TerrainType.Grass],
  },
  [SpeciesType.Fish]: {
    category: CreatureCategory.Fish,
    baseSpeed: 1.2,
    baseSize: 0.6,
    baseSenseRange: 50,
    maxEnergy: 50,
    maxAge: 400,
    color: '#4a8abf',
    symbol: 'f',
    diet: ['plant'],
    predators: [SpeciesType.Eagle, SpeciesType.Frog],
    preferredTerrain: [TerrainType.Water],
  },
  [SpeciesType.Butterfly]: {
    category: CreatureCategory.Insect,
    baseSpeed: 1.0,
    baseSize: 0.3,
    baseSenseRange: 40,
    maxEnergy: 30,
    maxAge: 200,
    color: '#df7fbf',
    symbol: 'b',
    diet: ['plant'],
    predators: [SpeciesType.Frog, SpeciesType.Fox],
    preferredTerrain: [TerrainType.Grass, TerrainType.Forest],
  },
  [SpeciesType.Bee]: {
    category: CreatureCategory.Insect,
    baseSpeed: 1.4,
    baseSize: 0.25,
    baseSenseRange: 60,
    maxEnergy: 25,
    maxAge: 180,
    color: '#dfcf3f',
    symbol: 'B',
    diet: ['plant'],
    predators: [SpeciesType.Frog],
    preferredTerrain: [TerrainType.Grass, TerrainType.Forest],
  },
  [SpeciesType.Frog]: {
    category: CreatureCategory.Herbivore,
    baseSpeed: 1.1,
    baseSize: 0.5,
    baseSenseRange: 45,
    maxEnergy: 40,
    maxAge: 500,
    color: '#4fbf4f',
    symbol: 'g',
    diet: [SpeciesType.Butterfly, SpeciesType.Bee, SpeciesType.Fish],
    predators: [SpeciesType.Fox, SpeciesType.Eagle],
    preferredTerrain: [TerrainType.Water, TerrainType.Grass],
  },
  [SpeciesType.Mouse]: {
    category: CreatureCategory.Herbivore,
    baseSpeed: 1.6,
    baseSize: 0.4,
    baseSenseRange: 50,
    maxEnergy: 35,
    maxAge: 300,
    color: '#a89080',
    symbol: 'm',
    diet: ['plant'],
    predators: [SpeciesType.Wolf, SpeciesType.Fox, SpeciesType.Eagle],
    preferredTerrain: [TerrainType.Grass, TerrainType.Forest, TerrainType.Sand],
  },
};

export const CATEGORY_COLORS: Record<CreatureCategory, string> = {
  [CreatureCategory.Herbivore]: '#6fbf6f',
  [CreatureCategory.Predator]: '#df5f5f',
  [CreatureCategory.Insect]: '#dfbf4f',
  [CreatureCategory.Fish]: '#4f9fdf',
  [CreatureCategory.Bird]: '#9f7fdf',
};
