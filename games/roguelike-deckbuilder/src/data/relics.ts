export interface RelicData {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare';
  effect: RelicEffect;
}

export interface RelicEffect {
  type: 'start_combat_block' | 'start_combat_draw' | 'start_combat_energy' |
    'max_hp' | 'heal_on_combat_end' | 'gold_bonus' | 'damage_bonus' |
    'start_combat_strength' | 'energy_per_turn';
  value: number;
}

export const ALL_RELICS: RelicData[] = [
  {
    id: 'iron_shield', name: '강철 방패', rarity: 'common',
    description: '전투 시작 시 방어도 6 획득',
    effect: { type: 'start_combat_block', value: 6 },
  },
  {
    id: 'phoenix_feather', name: '불사조 깃털', rarity: 'rare',
    description: '최대 HP +15',
    effect: { type: 'max_hp', value: 15 },
  },
  {
    id: 'healing_herb', name: '치유의 약초', rarity: 'common',
    description: '전투 승리 시 HP 5 회복',
    effect: { type: 'heal_on_combat_end', value: 5 },
  },
  {
    id: 'gold_ring', name: '황금 반지', rarity: 'common',
    description: '전투 승리 시 골드 +25%',
    effect: { type: 'gold_bonus', value: 25 },
  },
  {
    id: 'war_drum', name: '전쟁의 북', rarity: 'uncommon',
    description: '전투 시작 시 힘 1 획득',
    effect: { type: 'start_combat_strength', value: 1 },
  },
  {
    id: 'ancient_tome', name: '고대의 서', rarity: 'uncommon',
    description: '전투 시작 시 카드 1장 추가 드로우',
    effect: { type: 'start_combat_draw', value: 1 },
  },
  {
    id: 'energy_crystal', name: '에너지 수정', rarity: 'rare',
    description: '매 턴 에너지 +1',
    effect: { type: 'energy_per_turn', value: 1 },
  },
  {
    id: 'battle_axe', name: '전투 도끼', rarity: 'uncommon',
    description: '공격 카드 데미지 +2',
    effect: { type: 'damage_bonus', value: 2 },
  },
];
