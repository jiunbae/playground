// 게임 전체 설정 상수
export const GAME_WIDTH = 390;
export const GAME_HEIGHT = 844;

// 그리드 설정
export const GRID_COLS = 10;
export const GRID_ROWS = 16;
export const CELL_SIZE = GAME_WIDTH / GRID_COLS; // 39px

// 맵 영역 (상단 HUD와 하단 UI 제외)
export const MAP_TOP = 60;
export const MAP_BOTTOM = GAME_HEIGHT - 140;
export const MAP_ROWS = Math.floor((MAP_BOTTOM - MAP_TOP) / CELL_SIZE); // ~16

// 색상 팔레트 (기획문서 기반)
export const COLORS = {
  BG_ASLEEP: 0xe8e0f0,     // 잠든 배경: 흐릿한 라벤더
  BG_AWAKEN: 0xffe8d6,     // 깨어난 배경: 따뜻한 살구색
  TOWER_LIGHT: 0xffd93d,   // 빛의 탑: 골든 옐로
  TOWER_BELL: 0xc68b59,    // 종소리 탑: 코퍼 브라운
  TOWER_DEW: 0x95e1d3,     // 이슬 탑: 민트 그린
  TOWER_SPRING: 0x74b9ff,  // 샘물 탑: 스카이 블루
  TOWER_RAINBOW: 0xff6b9d, // 무지개 탑: 로즈 핑크
  TOWER_FENCE: 0x8bc34a,   // 꽃 울타리: 라이트 그린
  TOWER_LIGHTHOUSE: 0xff9800, // 등대: 오렌지
  TOWER_MUSICBOX: 0xce93d8,  // 오르골: 라이트 퍼플
  ENEMY_FOG: 0xc8d6e5,     // 안개 조각
  ENEMY_FROST: 0xd6e4f0,   // 서리 결정
  ENEMY_SHADOW: 0x9b89b3,  // 그림자 웅덩이
  ENEMY_MOTH: 0x4a69bd,    // 어둠 나방
  ENEMY_WIND: 0xecf0f1,    // 겨울바람
  ENEMY_BOSS: 0x5c3d6e,    // 깊은잠 (보스)
  UI_ACCENT: 0xff8a80,     // UI 강조: 코럴 핑크
  UI_TEXT: 0x4a3c31,       // UI 텍스트: 차콜 브라운
  GOLD: 0xffd700,
  PATH: 0xd4c5a9,          // 경로 색상
  PLACEABLE: 0xc8e6c9,     // 배치 가능 영역
  GRID_LINE: 0xe0d8c8,     // 그리드 라인
};

// 수호탑 정의
export interface TowerDef {
  id: string;
  name: string;
  nameKo: string;
  color: number;
  cost: number;
  range: number;       // 셀 단위
  damage: number;
  attackSpeed: number; // ms 간격
  special: string;
  unlockStage: number;
}

export const TOWERS: TowerDef[] = [
  {
    id: 'light', name: 'Light Tower', nameKo: '빛의 탑',
    color: COLORS.TOWER_LIGHT, cost: 50, range: 2.5, damage: 10,
    attackSpeed: 1000, special: '기본 공격', unlockStage: 1,
  },
  {
    id: 'bell', name: 'Bell Tower', nameKo: '종소리 탑',
    color: COLORS.TOWER_BELL, cost: 75, range: 1.8, damage: 20,
    attackSpeed: 1500, special: '범위 공격', unlockStage: 1,
  },
  {
    id: 'dew', name: 'Dew Tower', nameKo: '이슬 탑',
    color: COLORS.TOWER_DEW, cost: 60, range: 3, damage: 8,
    attackSpeed: 600, special: '빠른 공격 + 감속', unlockStage: 1,
  },
  {
    id: 'spring', name: 'Spring Tower', nameKo: '샘물 탑',
    color: COLORS.TOWER_SPRING, cost: 100, range: 0, damage: 0,
    attackSpeed: 0, special: '골드 생성 (5초당 10골드)', unlockStage: 1,
  },
  {
    id: 'rainbow', name: 'Rainbow Tower', nameKo: '무지개 탑',
    color: COLORS.TOWER_RAINBOW, cost: 120, range: 2, damage: 15,
    attackSpeed: 800, special: '연쇄 공격 (3체인)', unlockStage: 20,
  },
  {
    id: 'fence', name: 'Flower Fence', nameKo: '꽃 울타리',
    color: COLORS.TOWER_FENCE, cost: 30, range: 0, damage: 0,
    attackSpeed: 0, special: '경로 차단 (적 우회)', unlockStage: 35,
  },
  {
    id: 'lighthouse', name: 'Lighthouse', nameKo: '등대',
    color: COLORS.TOWER_LIGHTHOUSE, cost: 150, range: 4, damage: 5,
    attackSpeed: 2000, special: '주변 타워 버프 (+30% 공격력)', unlockStage: 50,
  },
  {
    id: 'musicbox', name: 'Music Box', nameKo: '오르골',
    color: COLORS.TOWER_MUSICBOX, cost: 200, range: 3, damage: 30,
    attackSpeed: 3000, special: '범위 내 전체 피해 + 힐링 오라', unlockStage: 50,
  },
];

// 잠의 파편(적) 정의
export interface EnemyDef {
  id: string;
  name: string;
  nameKo: string;
  color: number;
  health: number;
  speed: number;       // 초당 셀 이동 수
  reward: number;      // 처치 시 골드
  special: string;
}

export const ENEMIES: EnemyDef[] = [
  {
    id: 'fog', name: 'Fog Fragment', nameKo: '안개 조각',
    color: COLORS.ENEMY_FOG, health: 30, speed: 0.8, reward: 5,
    special: '느리지만 넓게 퍼짐',
  },
  {
    id: 'frost', name: 'Frost Crystal', nameKo: '서리 결정',
    color: COLORS.ENEMY_FROST, health: 15, speed: 1.8, reward: 8,
    special: '빠르지만 약함',
  },
  {
    id: 'shadow', name: 'Shadow Puddle', nameKo: '그림자 웅덩이',
    color: COLORS.ENEMY_SHADOW, health: 80, speed: 0.5, reward: 15,
    special: '느리고 체력 높음',
  },
  {
    id: 'moth', name: 'Dark Moth', nameKo: '어둠 나방',
    color: COLORS.ENEMY_MOTH, health: 20, speed: 2.0, reward: 10,
    special: '빠르고 소규모 군집',
  },
  {
    id: 'wind', name: 'Winter Wind', nameKo: '겨울바람',
    color: COLORS.ENEMY_WIND, health: 40, speed: 1.2, reward: 12,
    special: '수호탑 감속 디버프',
  },
  {
    id: 'boss', name: 'Deep Sleep', nameKo: '깊은잠',
    color: COLORS.ENEMY_BOSS, health: 300, speed: 0.3, reward: 100,
    special: '보스 - 매우 강력',
  },
];

// 스테이지 설정
export const STAGE_CONFIG = {
  startGold: 150,
  goldPerSecondBase: 0,
  villageHealth: 20,
  waveIntervalMs: 3000, // 물결 간 대기
};
