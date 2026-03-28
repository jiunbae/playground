import { Element, CardRole, Rarity } from '../utils/constants';

export interface CardEffect {
  type: 'damage' | 'block' | 'heal' | 'draw' | 'energy' | 'burn' | 'freeze' | 'shock' | 'poison' | 'strength' | 'weakness' | 'vulnerable' | 'thorns' | 'regen' | 'lifesteal';
  value: number;
  target?: 'enemy' | 'self' | 'all_enemies';
}

export interface CardData {
  id: string;
  name: string;
  element: Element;
  role: CardRole;
  rarity: Rarity;
  energyCost: number;
  effects: CardEffect[];
  upgradedEffects?: CardEffect[];
  synergyTags: string[];
  description: string;
  upgradedDescription?: string;
}

export interface CardInstance {
  data: CardData;
  upgraded: boolean;
  instanceId: number;
}

let nextInstanceId = 1;
export function createCardInstance(data: CardData, upgraded = false): CardInstance {
  return { data, upgraded, instanceId: nextInstanceId++ };
}

export function getCardEffects(card: CardInstance): CardEffect[] {
  if (card.upgraded && card.data.upgradedEffects) {
    return card.data.upgradedEffects;
  }
  return card.data.effects;
}

export function getCardDescription(card: CardInstance): string {
  if (card.upgraded && card.data.upgradedDescription) {
    return card.data.upgradedDescription;
  }
  return card.data.description;
}

export function getCardName(card: CardInstance): string {
  return card.upgraded ? card.data.name + '+' : card.data.name;
}

// ======= CARD DEFINITIONS =======

export const ALL_CARDS: CardData[] = [
  // === NEUTRAL (기본 카드) ===
  {
    id: 'strike', name: '공격', element: 'neutral', role: 'attack', rarity: 'common',
    energyCost: 1, effects: [{ type: 'damage', value: 6 }],
    upgradedEffects: [{ type: 'damage', value: 9 }],
    synergyTags: ['basic'], description: '적에게 6 데미지',
    upgradedDescription: '적에게 9 데미지',
  },
  {
    id: 'defend', name: '방어', element: 'neutral', role: 'skill', rarity: 'common',
    energyCost: 1, effects: [{ type: 'block', value: 5 }],
    upgradedEffects: [{ type: 'block', value: 8 }],
    synergyTags: ['basic'], description: '방어도 5 획득',
    upgradedDescription: '방어도 8 획득',
  },

  // === FIRE (화염) ===
  {
    id: 'fire_strike', name: '화염 참격', element: 'fire', role: 'attack', rarity: 'common',
    energyCost: 1, effects: [{ type: 'damage', value: 8 }, { type: 'burn', value: 2 }],
    upgradedEffects: [{ type: 'damage', value: 10 }, { type: 'burn', value: 3 }],
    synergyTags: ['fire_dot', 'fire_basic'], description: '8 데미지, 화상 2 부여',
    upgradedDescription: '10 데미지, 화상 3 부여',
  },
  {
    id: 'fire_ball', name: '파이어볼', element: 'fire', role: 'attack', rarity: 'uncommon',
    energyCost: 2, effects: [{ type: 'damage', value: 14 }, { type: 'burn', value: 4 }],
    upgradedEffects: [{ type: 'damage', value: 18 }, { type: 'burn', value: 6 }],
    synergyTags: ['fire_dot', 'fire_aoe'], description: '14 데미지, 화상 4 부여',
    upgradedDescription: '18 데미지, 화상 6 부여',
  },
  {
    id: 'flame_shield', name: '화염 방패', element: 'fire', role: 'skill', rarity: 'common',
    energyCost: 1, effects: [{ type: 'block', value: 6 }, { type: 'thorns', value: 3 }],
    upgradedEffects: [{ type: 'block', value: 8 }, { type: 'thorns', value: 5 }],
    synergyTags: ['fire_defense'], description: '방어도 6, 가시 3 획득',
    upgradedDescription: '방어도 8, 가시 5 획득',
  },
  {
    id: 'inferno', name: '인페르노', element: 'fire', role: 'attack', rarity: 'rare',
    energyCost: 3, effects: [{ type: 'damage', value: 24 }, { type: 'burn', value: 8 }],
    upgradedEffects: [{ type: 'damage', value: 30 }, { type: 'burn', value: 10 }],
    synergyTags: ['fire_dot', 'fire_burst'], description: '24 데미지, 화상 8 부여',
    upgradedDescription: '30 데미지, 화상 10 부여',
  },
  {
    id: 'ember', name: '잔불', element: 'fire', role: 'attack', rarity: 'common',
    energyCost: 0, effects: [{ type: 'damage', value: 4 }, { type: 'burn', value: 1 }],
    upgradedEffects: [{ type: 'damage', value: 6 }, { type: 'burn', value: 2 }],
    synergyTags: ['fire_dot', 'fire_basic'], description: '4 데미지, 화상 1 부여',
    upgradedDescription: '6 데미지, 화상 2 부여',
  },
  {
    id: 'fire_power', name: '불길의 힘', element: 'fire', role: 'power', rarity: 'uncommon',
    energyCost: 1, effects: [{ type: 'strength', value: 2 }],
    upgradedEffects: [{ type: 'strength', value: 3 }],
    synergyTags: ['fire_buff'], description: '힘 2 획득',
    upgradedDescription: '힘 3 획득',
  },

  // === ICE (냉기) ===
  {
    id: 'ice_shard', name: '얼음 파편', element: 'ice', role: 'attack', rarity: 'common',
    energyCost: 1, effects: [{ type: 'damage', value: 7 }, { type: 'freeze', value: 1 }],
    upgradedEffects: [{ type: 'damage', value: 10 }, { type: 'freeze', value: 1 }],
    synergyTags: ['ice_control', 'ice_basic'], description: '7 데미지, 빙결 1 부여',
    upgradedDescription: '10 데미지, 빙결 1 부여',
  },
  {
    id: 'frost_armor', name: '서리 갑옷', element: 'ice', role: 'skill', rarity: 'common',
    energyCost: 1, effects: [{ type: 'block', value: 8 }],
    upgradedEffects: [{ type: 'block', value: 12 }],
    synergyTags: ['ice_defense'], description: '방어도 8 획득',
    upgradedDescription: '방어도 12 획득',
  },
  {
    id: 'blizzard', name: '눈보라', element: 'ice', role: 'attack', rarity: 'uncommon',
    energyCost: 2, effects: [{ type: 'damage', value: 10 }, { type: 'freeze', value: 2 }, { type: 'weakness', value: 2 }],
    upgradedEffects: [{ type: 'damage', value: 14 }, { type: 'freeze', value: 3 }, { type: 'weakness', value: 2 }],
    synergyTags: ['ice_control', 'ice_aoe'], description: '10 데미지, 빙결 2, 약화 2 부여',
    upgradedDescription: '14 데미지, 빙결 3, 약화 2 부여',
  },
  {
    id: 'glacial_wall', name: '빙벽', element: 'ice', role: 'skill', rarity: 'uncommon',
    energyCost: 2, effects: [{ type: 'block', value: 14 }, { type: 'freeze', value: 1 }],
    upgradedEffects: [{ type: 'block', value: 18 }, { type: 'freeze', value: 2 }],
    synergyTags: ['ice_defense', 'ice_control'], description: '방어도 14, 빙결 1 부여',
    upgradedDescription: '방어도 18, 빙결 2 부여',
  },
  {
    id: 'absolute_zero', name: '절대영도', element: 'ice', role: 'attack', rarity: 'rare',
    energyCost: 3, effects: [{ type: 'damage', value: 20 }, { type: 'freeze', value: 3 }, { type: 'vulnerable', value: 2 }],
    upgradedEffects: [{ type: 'damage', value: 26 }, { type: 'freeze', value: 4 }, { type: 'vulnerable', value: 3 }],
    synergyTags: ['ice_control', 'ice_burst'], description: '20 데미지, 빙결 3, 취약 2 부여',
    upgradedDescription: '26 데미지, 빙결 4, 취약 3 부여',
  },

  // === LIGHTNING (번개) ===
  {
    id: 'spark', name: '전격', element: 'lightning', role: 'attack', rarity: 'common',
    energyCost: 1, effects: [{ type: 'damage', value: 9 }, { type: 'shock', value: 1 }],
    upgradedEffects: [{ type: 'damage', value: 12 }, { type: 'shock', value: 2 }],
    synergyTags: ['lightning_basic', 'lightning_chain'], description: '9 데미지, 감전 1 부여',
    upgradedDescription: '12 데미지, 감전 2 부여',
  },
  {
    id: 'chain_lightning', name: '연쇄 번개', element: 'lightning', role: 'attack', rarity: 'uncommon',
    energyCost: 2, effects: [{ type: 'damage', value: 7, target: 'all_enemies' }, { type: 'shock', value: 2 }],
    upgradedEffects: [{ type: 'damage', value: 10, target: 'all_enemies' }, { type: 'shock', value: 3 }],
    synergyTags: ['lightning_chain', 'lightning_aoe'], description: '모든 적에게 7 데미지, 감전 2',
    upgradedDescription: '모든 적에게 10 데미지, 감전 3',
  },
  {
    id: 'thunder_guard', name: '뇌전 수호', element: 'lightning', role: 'skill', rarity: 'common',
    energyCost: 1, effects: [{ type: 'block', value: 6 }, { type: 'draw', value: 1 }],
    upgradedEffects: [{ type: 'block', value: 8 }, { type: 'draw', value: 1 }],
    synergyTags: ['lightning_defense'], description: '방어도 6, 카드 1장 드로우',
    upgradedDescription: '방어도 8, 카드 1장 드로우',
  },
  {
    id: 'overcharge', name: '과충전', element: 'lightning', role: 'skill', rarity: 'uncommon',
    energyCost: 0, effects: [{ type: 'draw', value: 2 }, { type: 'energy', value: 1 }],
    upgradedEffects: [{ type: 'draw', value: 3 }, { type: 'energy', value: 1 }],
    synergyTags: ['lightning_energy'], description: '카드 2장 드로우, 에너지 1 획득',
    upgradedDescription: '카드 3장 드로우, 에너지 1 획득',
  },
  {
    id: 'thunderstorm', name: '뇌우', element: 'lightning', role: 'attack', rarity: 'rare',
    energyCost: 3, effects: [{ type: 'damage', value: 12, target: 'all_enemies' }, { type: 'shock', value: 4 }],
    upgradedEffects: [{ type: 'damage', value: 16, target: 'all_enemies' }, { type: 'shock', value: 5 }],
    synergyTags: ['lightning_chain', 'lightning_burst'], description: '모든 적에게 12 데미지, 감전 4',
    upgradedDescription: '모든 적에게 16 데미지, 감전 5',
  },

  // === NATURE (자연) ===
  {
    id: 'vine_whip', name: '덩굴 채찍', element: 'nature', role: 'attack', rarity: 'common',
    energyCost: 1, effects: [{ type: 'damage', value: 7 }, { type: 'poison', value: 3 }],
    upgradedEffects: [{ type: 'damage', value: 9 }, { type: 'poison', value: 4 }],
    synergyTags: ['nature_dot', 'nature_basic'], description: '7 데미지, 독 3 부여',
    upgradedDescription: '9 데미지, 독 4 부여',
  },
  {
    id: 'nature_heal', name: '자연의 치유', element: 'nature', role: 'skill', rarity: 'common',
    energyCost: 1, effects: [{ type: 'block', value: 5 }, { type: 'regen', value: 3 }],
    upgradedEffects: [{ type: 'block', value: 7 }, { type: 'regen', value: 4 }],
    synergyTags: ['nature_heal'], description: '방어도 5, 재생 3 획득',
    upgradedDescription: '방어도 7, 재생 4 획득',
  },
  {
    id: 'thorn_trap', name: '가시 덫', element: 'nature', role: 'skill', rarity: 'uncommon',
    energyCost: 1, effects: [{ type: 'thorns', value: 5 }, { type: 'poison', value: 2 }],
    upgradedEffects: [{ type: 'thorns', value: 7 }, { type: 'poison', value: 3 }],
    synergyTags: ['nature_dot', 'nature_defense'], description: '가시 5, 독 2 부여',
    upgradedDescription: '가시 7, 독 3 부여',
  },
  {
    id: 'overgrowth', name: '과성장', element: 'nature', role: 'attack', rarity: 'rare',
    energyCost: 2, effects: [{ type: 'damage', value: 12 }, { type: 'poison', value: 8 }, { type: 'regen', value: 3 }],
    upgradedEffects: [{ type: 'damage', value: 16 }, { type: 'poison', value: 10 }, { type: 'regen', value: 5 }],
    synergyTags: ['nature_dot', 'nature_burst'], description: '12 데미지, 독 8, 재생 3',
    upgradedDescription: '16 데미지, 독 10, 재생 5',
  },

  // === DARK (암흑) ===
  {
    id: 'shadow_strike', name: '그림자 참격', element: 'dark', role: 'attack', rarity: 'common',
    energyCost: 1, effects: [{ type: 'damage', value: 10 }, { type: 'lifesteal', value: 3 }],
    upgradedEffects: [{ type: 'damage', value: 13 }, { type: 'lifesteal', value: 4 }],
    synergyTags: ['dark_basic', 'dark_drain'], description: '10 데미지, 생명력 흡수 3',
    upgradedDescription: '13 데미지, 생명력 흡수 4',
  },
  {
    id: 'dark_pact', name: '어둠의 서약', element: 'dark', role: 'skill', rarity: 'uncommon',
    energyCost: 1, effects: [{ type: 'strength', value: 3 }, { type: 'draw', value: 2 }],
    upgradedEffects: [{ type: 'strength', value: 4 }, { type: 'draw', value: 3 }],
    synergyTags: ['dark_buff', 'dark_risk'], description: '힘 3, 카드 2장 드로우',
    upgradedDescription: '힘 4, 카드 3장 드로우',
  },
  {
    id: 'void_shield', name: '공허의 방패', element: 'dark', role: 'skill', rarity: 'common',
    energyCost: 1, effects: [{ type: 'block', value: 7 }, { type: 'lifesteal', value: 2 }],
    upgradedEffects: [{ type: 'block', value: 10 }, { type: 'lifesteal', value: 3 }],
    synergyTags: ['dark_defense', 'dark_drain'], description: '방어도 7, 생명력 흡수 2',
    upgradedDescription: '방어도 10, 생명력 흡수 3',
  },
  {
    id: 'soul_drain', name: '영혼 흡수', element: 'dark', role: 'attack', rarity: 'rare',
    energyCost: 2, effects: [{ type: 'damage', value: 18 }, { type: 'lifesteal', value: 8 }, { type: 'weakness', value: 2 }],
    upgradedEffects: [{ type: 'damage', value: 24 }, { type: 'lifesteal', value: 10 }, { type: 'weakness', value: 3 }],
    synergyTags: ['dark_drain', 'dark_burst'], description: '18 데미지, 생명력 흡수 8, 약화 2',
    upgradedDescription: '24 데미지, 생명력 흡수 10, 약화 3',
  },
];

export function getCardById(id: string): CardData | undefined {
  return ALL_CARDS.find(c => c.id === id);
}

export function getCardsByElement(element: Element): CardData[] {
  return ALL_CARDS.filter(c => c.element === element);
}

export function getCardsByRarity(rarity: Rarity): CardData[] {
  return ALL_CARDS.filter(c => c.rarity === rarity);
}
