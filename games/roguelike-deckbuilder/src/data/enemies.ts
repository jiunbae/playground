export interface EnemyIntent {
  type: 'attack' | 'defend' | 'buff' | 'debuff' | 'special';
  value: number;
  description: string;
}

export interface EnemyAction {
  weight: number;
  intent: EnemyIntent;
}

export interface EnemyPhase {
  hpThreshold: number; // percentage (1.0 = 100%)
  actions: EnemyAction[];
}

export interface EnemyData {
  id: string;
  name: string;
  hp: number;
  phases: EnemyPhase[];
  isBoss: boolean;
  isElite: boolean;
  act: number;
  goldReward: [number, number]; // [min, max]
}

export const ALL_ENEMIES: EnemyData[] = [
  // === ACT 1 NORMAL ===
  {
    id: 'slime', name: '슬라임', hp: 28, isBoss: false, isElite: false, act: 1,
    goldReward: [8, 14],
    phases: [{
      hpThreshold: 1.0,
      actions: [
        { weight: 60, intent: { type: 'attack', value: 7, description: '물리기' } },
        { weight: 30, intent: { type: 'defend', value: 5, description: '굳기' } },
        { weight: 10, intent: { type: 'buff', value: 2, description: '강화' } },
      ],
    }],
  },
  {
    id: 'goblin', name: '고블린', hp: 32, isBoss: false, isElite: false, act: 1,
    goldReward: [10, 16],
    phases: [{
      hpThreshold: 1.0,
      actions: [
        { weight: 70, intent: { type: 'attack', value: 8, description: '단검 찌르기' } },
        { weight: 20, intent: { type: 'attack', value: 12, description: '강한 일격' } },
        { weight: 10, intent: { type: 'debuff', value: 1, description: '독 바르기' } },
      ],
    }],
  },
  {
    id: 'fire_golem', name: '화염 골렘', hp: 40, isBoss: false, isElite: false, act: 1,
    goldReward: [12, 18],
    phases: [
      {
        hpThreshold: 0.5,
        actions: [
          { weight: 60, intent: { type: 'attack', value: 10, description: '화염 주먹' } },
          { weight: 30, intent: { type: 'buff', value: 3, description: '화염 강화' } },
          { weight: 10, intent: { type: 'defend', value: 8, description: '용암 갑옷' } },
        ],
      },
      {
        hpThreshold: 0,
        actions: [
          { weight: 40, intent: { type: 'attack', value: 10, description: '화염 주먹' } },
          { weight: 40, intent: { type: 'special', value: 20, description: '자폭 충전' } },
          { weight: 20, intent: { type: 'defend', value: 8, description: '용암 갑옷' } },
        ],
      },
    ],
  },
  {
    id: 'skeleton', name: '해골 전사', hp: 35, isBoss: false, isElite: false, act: 1,
    goldReward: [10, 15],
    phases: [{
      hpThreshold: 1.0,
      actions: [
        { weight: 50, intent: { type: 'attack', value: 9, description: '뼈 칼날' } },
        { weight: 30, intent: { type: 'defend', value: 6, description: '뼈 방패' } },
        { weight: 20, intent: { type: 'attack', value: 14, description: '강타' } },
      ],
    }],
  },

  // === ACT 1 ELITE ===
  {
    id: 'dark_knight', name: '암흑 기사', hp: 60, isBoss: false, isElite: true, act: 1,
    goldReward: [20, 30],
    phases: [
      {
        hpThreshold: 0.5,
        actions: [
          { weight: 50, intent: { type: 'attack', value: 12, description: '암흑 참격' } },
          { weight: 30, intent: { type: 'defend', value: 10, description: '암흑 방패' } },
          { weight: 20, intent: { type: 'buff', value: 3, description: '암흑 강화' } },
        ],
      },
      {
        hpThreshold: 0,
        actions: [
          { weight: 70, intent: { type: 'attack', value: 16, description: '광폭화 참격' } },
          { weight: 30, intent: { type: 'attack', value: 20, description: '처형' } },
        ],
      },
    ],
  },

  // === ACT 1 BOSS ===
  {
    id: 'guardian', name: '탑의 수호자', hp: 90, isBoss: true, isElite: false, act: 1,
    goldReward: [40, 60],
    phases: [
      {
        hpThreshold: 0.6,
        actions: [
          { weight: 40, intent: { type: 'attack', value: 10, description: '돌 주먹' } },
          { weight: 30, intent: { type: 'defend', value: 12, description: '석화 방어' } },
          { weight: 30, intent: { type: 'buff', value: 2, description: '단단해지기' } },
        ],
      },
      {
        hpThreshold: 0.3,
        actions: [
          { weight: 50, intent: { type: 'attack', value: 15, description: '강화 주먹' } },
          { weight: 30, intent: { type: 'debuff', value: 2, description: '약화의 일격' } },
          { weight: 20, intent: { type: 'defend', value: 15, description: '완전 방어' } },
        ],
      },
      {
        hpThreshold: 0,
        actions: [
          { weight: 60, intent: { type: 'attack', value: 20, description: '분노의 일격' } },
          { weight: 40, intent: { type: 'attack', value: 25, description: '파멸의 주먹' } },
        ],
      },
    ],
  },

  // === ACT 2 NORMAL ===
  {
    id: 'frost_mage', name: '서리 마법사', hp: 45, isBoss: false, isElite: false, act: 2,
    goldReward: [14, 20],
    phases: [{
      hpThreshold: 1.0,
      actions: [
        { weight: 40, intent: { type: 'attack', value: 11, description: '냉기 화살' } },
        { weight: 30, intent: { type: 'debuff', value: 2, description: '빙결 시전' } },
        { weight: 30, intent: { type: 'defend', value: 8, description: '서리 장벽' } },
      ],
    }],
  },
  {
    id: 'shadow_assassin', name: '그림자 암살자', hp: 38, isBoss: false, isElite: false, act: 2,
    goldReward: [14, 22],
    phases: [{
      hpThreshold: 1.0,
      actions: [
        { weight: 50, intent: { type: 'attack', value: 14, description: '암살' } },
        { weight: 30, intent: { type: 'attack', value: 8, description: '독 단검' } },
        { weight: 20, intent: { type: 'buff', value: 3, description: '은신' } },
      ],
    }],
  },

  // === ACT 2 ELITE ===
  {
    id: 'thunder_drake', name: '뇌룡', hp: 80, isBoss: false, isElite: true, act: 2,
    goldReward: [28, 40],
    phases: [
      {
        hpThreshold: 0.5,
        actions: [
          { weight: 40, intent: { type: 'attack', value: 14, description: '번개 브레스' } },
          { weight: 30, intent: { type: 'buff', value: 3, description: '충전' } },
          { weight: 30, intent: { type: 'defend', value: 12, description: '비늘 방어' } },
        ],
      },
      {
        hpThreshold: 0,
        actions: [
          { weight: 60, intent: { type: 'attack', value: 20, description: '폭풍 브레스' } },
          { weight: 40, intent: { type: 'special', value: 25, description: '낙뢰' } },
        ],
      },
    ],
  },

  // === ACT 2 BOSS ===
  {
    id: 'storm_witch', name: '폭풍의 마녀', hp: 130, isBoss: true, isElite: false, act: 2,
    goldReward: [50, 75],
    phases: [
      {
        hpThreshold: 0.6,
        actions: [
          { weight: 40, intent: { type: 'attack', value: 12, description: '폭풍 화살' } },
          { weight: 30, intent: { type: 'debuff', value: 2, description: '번개 사슬' } },
          { weight: 30, intent: { type: 'defend', value: 10, description: '바람 장벽' } },
        ],
      },
      {
        hpThreshold: 0.3,
        actions: [
          { weight: 40, intent: { type: 'attack', value: 18, description: '폭풍 소환' } },
          { weight: 30, intent: { type: 'buff', value: 4, description: '마력 증폭' } },
          { weight: 30, intent: { type: 'debuff', value: 3, description: '감전 폭풍' } },
        ],
      },
      {
        hpThreshold: 0,
        actions: [
          { weight: 50, intent: { type: 'attack', value: 24, description: '대폭풍' } },
          { weight: 50, intent: { type: 'attack', value: 30, description: '천벌' } },
        ],
      },
    ],
  },

  // === ACT 3 NORMAL ===
  {
    id: 'void_walker', name: '공허의 보행자', hp: 55, isBoss: false, isElite: false, act: 3,
    goldReward: [18, 26],
    phases: [{
      hpThreshold: 1.0,
      actions: [
        { weight: 40, intent: { type: 'attack', value: 15, description: '공허 일격' } },
        { weight: 30, intent: { type: 'debuff', value: 2, description: '공허 침식' } },
        { weight: 30, intent: { type: 'defend', value: 10, description: '차원 왜곡' } },
      ],
    }],
  },

  // === ACT 3 ELITE ===
  {
    id: 'ancient_golem', name: '고대 골렘', hp: 100, isBoss: false, isElite: true, act: 3,
    goldReward: [35, 50],
    phases: [
      {
        hpThreshold: 0.5,
        actions: [
          { weight: 40, intent: { type: 'attack', value: 18, description: '고대의 주먹' } },
          { weight: 30, intent: { type: 'defend', value: 15, description: '고대 갑옷' } },
          { weight: 30, intent: { type: 'buff', value: 4, description: '고대 축복' } },
        ],
      },
      {
        hpThreshold: 0,
        actions: [
          { weight: 60, intent: { type: 'attack', value: 25, description: '파괴의 권' } },
          { weight: 40, intent: { type: 'special', value: 30, description: '대지의 분노' } },
        ],
      },
    ],
  },

  // === ACT 3 BOSS (최종 보스) ===
  {
    id: 'tower_master', name: '탑의 지배자', hp: 180, isBoss: true, isElite: false, act: 3,
    goldReward: [80, 120],
    phases: [
      {
        hpThreshold: 0.6,
        actions: [
          { weight: 35, intent: { type: 'attack', value: 15, description: '지배의 손길' } },
          { weight: 25, intent: { type: 'defend', value: 12, description: '차원 방어' } },
          { weight: 20, intent: { type: 'buff', value: 3, description: '마력 집중' } },
          { weight: 20, intent: { type: 'debuff', value: 2, description: '정신 잠식' } },
        ],
      },
      {
        hpThreshold: 0.3,
        actions: [
          { weight: 40, intent: { type: 'attack', value: 22, description: '파멸의 광선' } },
          { weight: 30, intent: { type: 'debuff', value: 3, description: '영혼 분쇄' } },
          { weight: 30, intent: { type: 'buff', value: 5, description: '완전 각성' } },
        ],
      },
      {
        hpThreshold: 0,
        actions: [
          { weight: 50, intent: { type: 'attack', value: 30, description: '종말의 일격' } },
          { weight: 30, intent: { type: 'attack', value: 35, description: '차원 붕괴' } },
          { weight: 20, intent: { type: 'special', value: 40, description: '절대 지배' } },
        ],
      },
    ],
  },
];

export function getEnemiesForAct(act: number, type: 'normal' | 'elite' | 'boss'): EnemyData[] {
  return ALL_ENEMIES.filter(e => {
    if (e.act !== act) return false;
    if (type === 'boss') return e.isBoss;
    if (type === 'elite') return e.isElite;
    return !e.isBoss && !e.isElite;
  });
}
