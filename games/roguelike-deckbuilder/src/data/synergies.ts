import { Element } from '../utils/constants';

export interface SynergyData {
  id: string;
  name: string;
  elements: Element[];
  requiredCount: number; // total cards of specified elements
  description: string;
  effect: SynergyEffect;
}

export interface SynergyEffect {
  type: 'damage_bonus' | 'block_bonus' | 'heal_per_turn' | 'draw_bonus' |
    'energy_start' | 'dot_bonus' | 'lifesteal_bonus';
  value: number;
}

// Single-element synergies (3/5/7 cards threshold)
export const ELEMENT_SYNERGIES: SynergyData[] = [
  // Fire synergies
  { id: 'fire_lv1', name: '불씨', elements: ['fire'], requiredCount: 3,
    description: '화상 데미지 +1', effect: { type: 'dot_bonus', value: 1 } },
  { id: 'fire_lv2', name: '화염 폭풍', elements: ['fire'], requiredCount: 5,
    description: '공격 데미지 +3', effect: { type: 'damage_bonus', value: 3 } },
  { id: 'fire_lv3', name: '지옥불', elements: ['fire'], requiredCount: 7,
    description: '공격 데미지 +5, 화상 +2', effect: { type: 'damage_bonus', value: 5 } },

  // Ice synergies
  { id: 'ice_lv1', name: '서리', elements: ['ice'], requiredCount: 3,
    description: '매 턴 방어도 +2', effect: { type: 'block_bonus', value: 2 } },
  { id: 'ice_lv2', name: '빙하', elements: ['ice'], requiredCount: 5,
    description: '매 턴 방어도 +4', effect: { type: 'block_bonus', value: 4 } },
  { id: 'ice_lv3', name: '영겁의 빙하', elements: ['ice'], requiredCount: 7,
    description: '매 턴 방어도 +7', effect: { type: 'block_bonus', value: 7 } },

  // Lightning synergies
  { id: 'lightning_lv1', name: '정전기', elements: ['lightning'], requiredCount: 3,
    description: '턴 시작 시 카드 +1', effect: { type: 'draw_bonus', value: 1 } },
  { id: 'lightning_lv2', name: '번개 구름', elements: ['lightning'], requiredCount: 5,
    description: '전투 시작 시 에너지 +1', effect: { type: 'energy_start', value: 1 } },
  { id: 'lightning_lv3', name: '뇌신의 축복', elements: ['lightning'], requiredCount: 7,
    description: '턴 시작 시 카드 +2, 에너지 +1', effect: { type: 'draw_bonus', value: 2 } },

  // Nature synergies
  { id: 'nature_lv1', name: '새싹', elements: ['nature'], requiredCount: 3,
    description: '매 턴 HP 2 회복', effect: { type: 'heal_per_turn', value: 2 } },
  { id: 'nature_lv2', name: '숲의 축복', elements: ['nature'], requiredCount: 5,
    description: '매 턴 HP 4 회복', effect: { type: 'heal_per_turn', value: 4 } },
  { id: 'nature_lv3', name: '세계수', elements: ['nature'], requiredCount: 7,
    description: '매 턴 HP 6 회복, 독 +2', effect: { type: 'heal_per_turn', value: 6 } },

  // Dark synergies
  { id: 'dark_lv1', name: '어둠의 속삭임', elements: ['dark'], requiredCount: 3,
    description: '생명력 흡수 +2', effect: { type: 'lifesteal_bonus', value: 2 } },
  { id: 'dark_lv2', name: '암흑의 권능', elements: ['dark'], requiredCount: 5,
    description: '생명력 흡수 +4, 공격 +2', effect: { type: 'lifesteal_bonus', value: 4 } },
  { id: 'dark_lv3', name: '심연', elements: ['dark'], requiredCount: 7,
    description: '생명력 흡수 +6, 공격 +4', effect: { type: 'lifesteal_bonus', value: 6 } },
];

// Cross-element synergies
export const CROSS_SYNERGIES: SynergyData[] = [
  {
    id: 'steam_explosion', name: '증기 폭발',
    elements: ['fire', 'ice'], requiredCount: 4,
    description: '화염+냉기 4장: 공격 데미지 +4',
    effect: { type: 'damage_bonus', value: 4 },
  },
  {
    id: 'storm_fire', name: '폭풍의 불꽃',
    elements: ['fire', 'lightning'], requiredCount: 4,
    description: '화염+번개 4장: 공격 데미지 +3, 화상 +1',
    effect: { type: 'damage_bonus', value: 3 },
  },
  {
    id: 'frozen_lightning', name: '얼어붙은 번개',
    elements: ['ice', 'lightning'], requiredCount: 4,
    description: '냉기+번개 4장: 방어도 +3, 카드 +1',
    effect: { type: 'block_bonus', value: 3 },
  },
  {
    id: 'life_drain', name: '생명 흡수',
    elements: ['nature', 'dark'], requiredCount: 4,
    description: '자연+암흑 4장: 생명력 흡수 +3, HP 회복 +2',
    effect: { type: 'lifesteal_bonus', value: 3 },
  },
  {
    id: 'wildfire', name: '야생의 불',
    elements: ['fire', 'nature'], requiredCount: 4,
    description: '화염+자연 4장: 화상 +2, 독 +2',
    effect: { type: 'dot_bonus', value: 2 },
  },
  {
    id: 'shadow_frost', name: '그림자 서리',
    elements: ['ice', 'dark'], requiredCount: 4,
    description: '냉기+암흑 4장: 방어도 +4, 생명흡수 +2',
    effect: { type: 'block_bonus', value: 4 },
  },
];

export const ALL_SYNERGIES = [...ELEMENT_SYNERGIES, ...CROSS_SYNERGIES];
