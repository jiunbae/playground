// Material definitions with physics properties and chain reaction rules
export const MATERIALS = {
  wood: {
    id: 'wood',
    name: '나무',
    color: '#8D6E63',
    colorLight: '#A1887F',
    density: 0.004,
    restitution: 0.2,
    friction: 0.6,
    health: 60,
    flammable: true,
    chainTargets: ['ice', 'wood'],
    chainType: 'fire',
    breakSounds: ['wood'],
    particleColors: ['#8D6E63', '#A1887F', '#6D4C41'],
  },
  ice: {
    id: 'ice',
    name: '얼음',
    color: '#4FC3F7',
    colorLight: '#B3E5FC',
    density: 0.003,
    restitution: 0.1,
    friction: 0.05,
    health: 40,
    flammable: false,
    chainTargets: ['glass'],
    chainType: 'thermal_shock',
    breakSounds: ['ice'],
    particleColors: ['#4FC3F7', '#B3E5FC', '#FFFFFF'],
  },
  glass: {
    id: 'glass',
    name: '유리',
    color: '#80DEEA',
    colorLight: '#E0F7FA',
    density: 0.005,
    restitution: 0.05,
    friction: 0.4,
    health: 25,
    flammable: false,
    chainTargets: ['wood', 'ice'],
    chainType: 'shatter',
    breakSounds: ['glass'],
    particleColors: ['#80DEEA', '#E0F7FA', '#FFFFFF'],
  },
  metal: {
    id: 'metal',
    name: '금속',
    color: '#90A4AE',
    colorLight: '#CFD8DC',
    density: 0.008,
    restitution: 0.3,
    friction: 0.4,
    health: 120,
    flammable: false,
    chainTargets: ['concrete'],
    chainType: 'domino',
    breakSounds: ['metal'],
    particleColors: ['#90A4AE', '#CFD8DC', '#FFD600'],
  },
  concrete: {
    id: 'concrete',
    name: '콘크리트',
    color: '#9E9E9E',
    colorLight: '#BDBDBD',
    density: 0.007,
    restitution: 0.05,
    friction: 0.8,
    health: 150,
    flammable: false,
    chainTargets: [],
    chainType: 'collapse',
    breakSounds: ['concrete'],
    particleColors: ['#9E9E9E', '#BDBDBD', '#757575'],
  },
  jelly: {
    id: 'jelly',
    name: '젤리',
    color: '#E91E63',
    colorLight: '#F48FB1',
    density: 0.002,
    restitution: 0.8,
    friction: 0.3,
    health: 30,
    flammable: false,
    chainTargets: [],
    chainType: 'bounce',
    breakSounds: ['jelly'],
    particleColors: ['#E91E63', '#F48FB1', '#FF80AB'],
  },
  sand: {
    id: 'sand',
    name: '모래',
    color: '#FFD54F',
    colorLight: '#FFE082',
    density: 0.006,
    restitution: 0.0,
    friction: 0.9,
    health: 20,
    flammable: false,
    chainTargets: [],
    chainType: 'crumble',
    breakSounds: ['sand'],
    particleColors: ['#FFD54F', '#FFE082', '#FFC107'],
  },
};

// Chain reaction interaction map: source material -> what happens to target
export const CHAIN_REACTIONS = {
  // Fire from wood spreads to other wood, melts ice
  fire: {
    wood: { effect: 'ignite', delay: 500, damage: 80, description: '화염 전이' },
    ice: { effect: 'thermal_shock', delay: 300, damage: 60, description: '열충격 파쇄' },
  },
  // Thermal shock from ice shatters glass
  thermal_shock: {
    glass: { effect: 'shatter', delay: 200, damage: 50, description: '파쇄' },
  },
  // Shattering glass sends shrapnel
  shatter: {
    wood: { effect: 'shrapnel', delay: 100, damage: 30, description: '파편 비산' },
    ice: { effect: 'shrapnel', delay: 100, damage: 30, description: '파편 비산' },
  },
  // Metal domino effect
  domino: {
    concrete: { effect: 'impact', delay: 400, damage: 40, description: '충격 균열' },
  },
};

export function getMaterial(id) {
  return MATERIALS[id] || MATERIALS.wood;
}
