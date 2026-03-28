// Game dimensions (portrait mobile)
export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 1280;

// Colors from design doc
export const COLORS = {
  BG_PRIMARY: 0x1A1A2E,
  BG_BATTLE: 0x16213E,
  CARD_BORDER: 0xC9A96E,
  TEXT: 0xE8DCC8,
  TEXT_HEX: '#E8DCC8',
  ACCENT: 0xFFD700,
  ACCENT_HEX: '#FFD700',
  HP_BAR: 0xE53935,
  ENERGY: 0x42A5F5,
  ENERGY_HEX: '#42A5F5',

  FIRE: 0xC41E3A,
  FIRE_HEX: '#C41E3A',
  ICE: 0x4FC3F7,
  ICE_HEX: '#4FC3F7',
  LIGHTNING: 0xFFD54F,
  LIGHTNING_HEX: '#FFD54F',
  NATURE: 0x66BB6A,
  NATURE_HEX: '#66BB6A',
  DARK: 0x37474F,
  DARK_HEX: '#37474F',

  WHITE: 0xFFFFFF,
  BLACK: 0x000000,
  GRAY: 0x888888,
  DARK_GRAY: 0x333344,
  BUTTON: 0x2A2A4A,
  BUTTON_HOVER: 0x3A3A5A,
  SHIELD: 0x4488CC,
};

// Combat constants
export const BASE_ENERGY = 3;
export const CARDS_PER_DRAW = 5;
export const MAX_HAND_SIZE = 10;

// Map constants
export const NODES_PER_ACT = 15;
export const ACTS_TOTAL = 3;

// Card rarity weights
export const RARITY_WEIGHTS = {
  common: 60,
  uncommon: 30,
  rare: 10,
};

export type Element = 'fire' | 'ice' | 'lightning' | 'nature' | 'dark' | 'neutral';
export type CardRole = 'attack' | 'skill' | 'power';
export type Rarity = 'common' | 'uncommon' | 'rare';
export type NodeType = 'battle' | 'elite' | 'shop' | 'event' | 'rest' | 'treasure' | 'boss';

export const ELEMENT_COLORS: Record<Element, number> = {
  fire: COLORS.FIRE,
  ice: COLORS.ICE,
  lightning: COLORS.LIGHTNING,
  nature: COLORS.NATURE,
  dark: COLORS.DARK,
  neutral: COLORS.GRAY,
};

export const ELEMENT_NAMES: Record<Element, string> = {
  fire: '화염',
  ice: '냉기',
  lightning: '번개',
  nature: '자연',
  dark: '암흑',
  neutral: '무속성',
};

export const ELEMENT_ICONS: Record<Element, string> = {
  fire: '🔥',
  ice: '🧊',
  lightning: '⚡',
  nature: '🌿',
  dark: '🌑',
  neutral: '⚪',
};
