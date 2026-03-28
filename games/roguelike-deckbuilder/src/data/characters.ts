import { Element } from '../utils/constants';

export interface CharacterData {
  id: string;
  name: string;
  title: string;
  element: Element;
  hp: number;
  startingDeckIds: string[];
  passiveName: string;
  passiveDescription: string;
}

export const ALL_CHARACTERS: CharacterData[] = [
  {
    id: 'fire_mage', name: '이그니스', title: '화염 마법사',
    element: 'fire', hp: 70,
    startingDeckIds: [
      'strike', 'strike', 'strike', 'strike',
      'defend', 'defend', 'defend', 'defend',
      'fire_strike', 'ember',
    ],
    passiveName: '불꽃의 혼',
    passiveDescription: '화염 카드 사용 시 화상 +1 추가',
  },
  {
    id: 'ice_knight', name: '프로스트', title: '냉기 기사',
    element: 'ice', hp: 80,
    startingDeckIds: [
      'strike', 'strike', 'strike', 'strike',
      'defend', 'defend', 'defend', 'defend',
      'ice_shard', 'frost_armor',
    ],
    passiveName: '서리의 심장',
    passiveDescription: '매 턴 시작 시 방어도 2 획득',
  },
  {
    id: 'storm_caller', name: '볼트', title: '번개 술사',
    element: 'lightning', hp: 65,
    startingDeckIds: [
      'strike', 'strike', 'strike', 'strike',
      'defend', 'defend', 'defend', 'defend',
      'spark', 'overcharge',
    ],
    passiveName: '번개의 축복',
    passiveDescription: '카드 드로우 시 10% 확률로 에너지 +1',
  },
];
