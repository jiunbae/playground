// Campaign levels - 5 Chapters with increasing complexity
// Each level defines structure layout and available tools

export const CHAPTERS = [
  {
    id: 1,
    name: '나무 입문',
    materials: ['wood'],
    description: '기본 파괴와 화염 전이를 배웁니다',
  },
  {
    id: 2,
    name: '2소재 조합',
    materials: ['wood', 'ice'],
    description: '소재 간 상호작용을 배웁니다',
  },
  {
    id: 3,
    name: '유리의 세계',
    materials: ['wood', 'ice', 'glass'],
    description: '유리 파쇄와 파편 체인을 배웁니다',
  },
  {
    id: 4,
    name: '금속과 콘크리트',
    materials: ['wood', 'ice', 'glass', 'metal', 'concrete'],
    description: '강력한 소재와 고급 도구를 사용합니다',
  },
  {
    id: 5,
    name: '마스터 챌린지',
    materials: ['wood', 'ice', 'glass', 'metal', 'concrete', 'jelly', 'sand'],
    description: '모든 소재와 도구를 활용한 극한 퍼즐',
  },
];

// Structure builder helpers
function stack(baseX, baseY, cols, rows, blockW, blockH, material) {
  const blocks = [];
  const totalW = cols * blockW;
  const startX = baseX - totalW / 2 + blockW / 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      blocks.push({
        x: startX + c * blockW,
        y: baseY - r * blockH - blockH / 2,
        w: blockW,
        h: blockH,
        material,
      });
    }
  }
  return blocks;
}

function tower(baseX, baseY, width, floors, blockH, material) {
  const blocks = [];
  for (let f = 0; f < floors; f++) {
    if (f % 2 === 0) {
      blocks.push({
        x: baseX,
        y: baseY - f * blockH,
        w: width,
        h: blockH,
        material,
      });
    } else {
      const pillarW = width * 0.25;
      blocks.push({
        x: baseX - width * 0.25,
        y: baseY - f * blockH,
        w: pillarW,
        h: blockH,
        material,
      });
      blocks.push({
        x: baseX + width * 0.25,
        y: baseY - f * blockH,
        w: pillarW,
        h: blockH,
        material,
      });
    }
  }
  return blocks;
}

function pyramid(baseX, baseY, baseCount, blockW, blockH, material) {
  const blocks = [];
  for (let row = 0; row < baseCount; row++) {
    const count = baseCount - row;
    const startX = baseX - (count - 1) * blockW * 0.5;
    for (let c = 0; c < count; c++) {
      blocks.push({
        x: startX + c * blockW,
        y: baseY - row * blockH,
        w: blockW,
        h: blockH,
        material,
      });
    }
  }
  return blocks;
}

function domino(startX, baseY, count, spacing, blockW, blockH, material) {
  const blocks = [];
  for (let i = 0; i < count; i++) {
    blocks.push({
      x: startX + i * spacing,
      y: baseY - blockH * 0.5,
      w: blockW,
      h: blockH * 2,
      material,
    });
  }
  return blocks;
}

function wall(baseX, baseY, width, height, blockW, blockH, material) {
  const blocks = [];
  const cols = Math.floor(width / blockW);
  const rows = Math.floor(height / blockH);
  const startX = baseX - (cols - 1) * blockW / 2;
  for (let r = 0; r < rows; r++) {
    const offset = r % 2 === 0 ? 0 : blockW / 2;
    for (let c = 0; c < cols; c++) {
      const x = startX + c * blockW + offset;
      if (x > baseX + width / 2 + blockW) continue;
      blocks.push({
        x,
        y: baseY - r * blockH - blockH / 2,
        w: blockW,
        h: blockH,
        material,
      });
    }
  }
  return blocks;
}

function arch(baseX, baseY, width, pillarH, material) {
  const blocks = [];
  // Left pillar
  for (let i = 0; i < Math.floor(pillarH / 25); i++) {
    blocks.push({
      x: baseX - width / 2,
      y: baseY - i * 25 - 12,
      w: 20,
      h: 25,
      material,
    });
  }
  // Right pillar
  for (let i = 0; i < Math.floor(pillarH / 25); i++) {
    blocks.push({
      x: baseX + width / 2,
      y: baseY - i * 25 - 12,
      w: 20,
      h: 25,
      material,
    });
  }
  // Top span
  blocks.push({
    x: baseX,
    y: baseY - pillarH - 5,
    w: width + 30,
    h: 15,
    material,
  });
  return blocks;
}

export const LEVELS = [
  // === CHAPTER 1: Wood Only ===
  {
    id: 1,
    chapter: 1,
    name: '첫 파괴',
    description: '탭하여 파괴하세요!',
    tools: ['shockwave'],
    toolLimits: null,
    blocks: (gx, gy) => [
      ...stack(gx, gy, 3, 3, 40, 25, 'wood'),
    ],
    tutorial: 'tap',
  },
  {
    id: 2,
    chapter: 1,
    name: '나무 탑',
    description: '높은 탑을 무너뜨리세요',
    tools: ['shockwave'],
    blocks: (gx, gy) => [
      ...tower(gx, gy, 80, 6, 25, 'wood'),
    ],
  },
  {
    id: 3,
    chapter: 1,
    name: '피라미드',
    description: '피라미드 구조를 파괴하세요',
    tools: ['shockwave', 'fireball'],
    blocks: (gx, gy) => [
      ...pyramid(gx, gy, 5, 35, 25, 'wood'),
    ],
  },
  {
    id: 4,
    chapter: 1,
    name: '도미노',
    description: '도미노를 쓰러뜨리세요',
    tools: ['shockwave'],
    blocks: (gx, gy) => [
      ...domino(gx - 150, gy, 8, 40, 12, 20, 'wood'),
    ],
    tutorial: 'domino',
  },
  {
    id: 5,
    chapter: 1,
    name: '화염 전이',
    description: '불로 나무를 태우세요',
    tools: ['fireball'],
    toolLimits: { fireball: 2 },
    blocks: (gx, gy) => [
      ...stack(gx - 50, gy, 2, 4, 35, 25, 'wood'),
      ...stack(gx + 50, gy, 2, 4, 35, 25, 'wood'),
      { x: gx, y: gy - 4 * 25, w: 120, h: 15, material: 'wood' },
    ],
    tutorial: 'fire',
  },
  {
    id: 6,
    chapter: 1,
    name: '약점 찾기',
    description: '핵심 블록을 노리세요',
    tools: ['shockwave'],
    toolLimits: { shockwave: 2 },
    blocks: (gx, gy) => [
      { x: gx - 40, y: gy, w: 20, h: 50, material: 'wood' },
      { x: gx + 40, y: gy, w: 20, h: 50, material: 'wood' },
      { x: gx, y: gy - 55, w: 120, h: 15, material: 'wood' },
      ...stack(gx, gy - 75, 3, 3, 35, 20, 'wood'),
    ],
  },

  // === CHAPTER 2: Wood + Ice ===
  {
    id: 7,
    chapter: 2,
    name: '얼음 등장',
    description: '얼음 블록을 파괴하세요',
    tools: ['shockwave'],
    blocks: (gx, gy) => [
      ...stack(gx, gy, 3, 2, 40, 25, 'ice'),
      ...stack(gx, gy - 55, 3, 2, 40, 25, 'wood'),
    ],
  },
  {
    id: 8,
    chapter: 2,
    name: '열충격',
    description: '불로 나무를 태워 얼음을 파쇄하세요',
    tools: ['fireball'],
    toolLimits: { fireball: 1 },
    blocks: (gx, gy) => [
      ...stack(gx - 40, gy, 2, 3, 35, 25, 'wood'),
      ...stack(gx + 40, gy, 2, 3, 35, 25, 'ice'),
    ],
    tutorial: 'chain',
  },
  {
    id: 9,
    chapter: 2,
    name: '얼음 다리',
    description: '다리를 무너뜨리세요',
    tools: ['shockwave', 'fireball'],
    blocks: (gx, gy) => [
      { x: gx - 60, y: gy, w: 20, h: 60, material: 'ice' },
      { x: gx + 60, y: gy, w: 20, h: 60, material: 'ice' },
      { x: gx, y: gy - 65, w: 150, h: 12, material: 'wood' },
      ...stack(gx, gy - 85, 3, 2, 30, 20, 'wood'),
    ],
  },
  {
    id: 10,
    chapter: 2,
    name: '이중 탑',
    description: '두 소재 탑을 동시에 파괴하세요',
    tools: ['shockwave', 'fireball'],
    toolLimits: { shockwave: 2, fireball: 2 },
    blocks: (gx, gy) => [
      ...tower(gx - 50, gy, 60, 5, 22, 'wood'),
      ...tower(gx + 50, gy, 60, 5, 22, 'ice'),
    ],
  },
  {
    id: 11,
    chapter: 2,
    name: '체인 퍼즐',
    description: '화염->나무->얼음 체인을 완성하세요',
    tools: ['fireball'],
    toolLimits: { fireball: 1 },
    blocks: (gx, gy) => {
      const blocks = [];
      for (let i = 0; i < 4; i++) {
        blocks.push({
          x: gx - 60 + i * 30,
          y: gy - i * 20,
          w: 35,
          h: 20,
          material: 'wood',
        });
      }
      for (let i = 0; i < 3; i++) {
        blocks.push({
          x: gx + 50 + i * 25,
          y: gy - 60 - i * 15,
          w: 30,
          h: 20,
          material: 'ice',
        });
      }
      return blocks;
    },
  },
  {
    id: 12,
    chapter: 2,
    name: '빙하 요새',
    description: '견고한 얼음 요새를 무너뜨리세요',
    tools: ['shockwave', 'fireball'],
    blocks: (gx, gy) => [
      { x: gx - 70, y: gy, w: 15, h: 80, material: 'ice' },
      { x: gx + 70, y: gy, w: 15, h: 80, material: 'ice' },
      { x: gx, y: gy - 5, w: 140, h: 15, material: 'ice' },
      ...stack(gx, gy - 30, 3, 2, 30, 20, 'wood'),
      { x: gx, y: gy - 65, w: 140, h: 12, material: 'ice' },
      { x: gx, y: gy - 80, w: 40, h: 15, material: 'wood' },
    ],
  },

  // === CHAPTER 3: Glass World ===
  {
    id: 13,
    chapter: 3,
    name: '유리의 등장',
    description: '유리는 충격에 약합니다',
    tools: ['shockwave'],
    blocks: (gx, gy) => [
      ...stack(gx, gy, 4, 3, 35, 20, 'glass'),
    ],
  },
  {
    id: 14,
    chapter: 3,
    name: '유리 온실',
    description: '유리 벽을 깨뜨리세요',
    tools: ['shockwave', 'laser'],
    blocks: (gx, gy) => [
      // Glass walls
      { x: gx - 80, y: gy - 25, w: 12, h: 70, material: 'glass' },
      { x: gx + 80, y: gy - 25, w: 12, h: 70, material: 'glass' },
      { x: gx, y: gy - 65, w: 170, h: 10, material: 'glass' },
      // Wood interior
      ...stack(gx, gy, 3, 2, 30, 22, 'wood'),
    ],
  },
  {
    id: 15,
    chapter: 3,
    name: '파편 체인',
    description: '유리 파편으로 나무를 파괴하세요',
    tools: ['shockwave'],
    toolLimits: { shockwave: 1 },
    blocks: (gx, gy) => [
      // Glass cluster on left
      ...stack(gx - 50, gy, 2, 3, 30, 20, 'glass'),
      // Wood cluster on right (chain target)
      ...stack(gx + 50, gy, 2, 3, 30, 20, 'wood'),
    ],
  },
  {
    id: 16,
    chapter: 3,
    name: '레이저 절단',
    description: '레이저로 구조물을 절단하세요',
    tools: ['laser'],
    blocks: (gx, gy) => [
      ...tower(gx, gy, 100, 6, 22, 'glass'),
      // Heavy wood blocks on top to cause collapse
      ...stack(gx, gy - 6 * 22 - 15, 2, 1, 40, 25, 'wood'),
    ],
    tutorial: 'swipe',
  },
  {
    id: 17,
    chapter: 3,
    name: '3소재 체인',
    description: '화염->나무->얼음->유리 체인!',
    tools: ['fireball'],
    toolLimits: { fireball: 1 },
    blocks: (gx, gy) => {
      const blocks = [];
      // Wood cluster (ignition)
      blocks.push({ x: gx - 70, y: gy, w: 35, h: 25, material: 'wood' });
      blocks.push({ x: gx - 70, y: gy - 28, w: 35, h: 25, material: 'wood' });
      blocks.push({ x: gx - 40, y: gy - 12, w: 30, h: 20, material: 'wood' });
      // Ice section (thermal shock chain)
      blocks.push({ x: gx - 10, y: gy, w: 30, h: 25, material: 'ice' });
      blocks.push({ x: gx - 10, y: gy - 28, w: 30, h: 25, material: 'ice' });
      // Glass section (shatter chain)
      blocks.push({ x: gx + 25, y: gy, w: 28, h: 22, material: 'glass' });
      blocks.push({ x: gx + 25, y: gy - 25, w: 28, h: 22, material: 'glass' });
      blocks.push({ x: gx + 55, y: gy, w: 28, h: 22, material: 'glass' });
      // Final wood (shrapnel target)
      blocks.push({ x: gx + 80, y: gy - 10, w: 35, h: 30, material: 'wood' });
      return blocks;
    },
  },
  {
    id: 18,
    chapter: 3,
    name: '유리 피라미드',
    description: '유리 피라미드를 산산조각 내세요',
    tools: ['shockwave', 'laser'],
    blocks: (gx, gy) => [
      ...pyramid(gx, gy, 6, 30, 20, 'glass'),
    ],
  },

  // === CHAPTER 4: Metal & Concrete ===
  {
    id: 19,
    chapter: 4,
    name: '금속 기둥',
    description: '강한 금속도 폭탄엔 무력합니다',
    tools: ['shockwave', 'bomb'],
    blocks: (gx, gy) => [
      // Metal pillars with glass on top
      { x: gx - 40, y: gy - 15, w: 20, h: 50, material: 'metal' },
      { x: gx + 40, y: gy - 15, w: 20, h: 50, material: 'metal' },
      { x: gx, y: gy - 50, w: 110, h: 12, material: 'metal' },
      ...stack(gx, gy - 70, 3, 2, 30, 20, 'glass'),
    ],
  },
  {
    id: 20,
    chapter: 4,
    name: '콘크리트 벽',
    description: '콘크리트는 매우 견고합니다',
    tools: ['bomb'],
    blocks: (gx, gy) => [
      ...wall(gx, gy, 160, 100, 35, 22, 'concrete'),
    ],
  },
  {
    id: 21,
    chapter: 4,
    name: '금속 도미노',
    description: '금속이 콘크리트를 부수는 도미노 효과',
    tools: ['shockwave', 'bomb'],
    toolLimits: { shockwave: 1, bomb: 1 },
    blocks: (gx, gy) => [
      // Metal dominoes leading to concrete wall
      ...domino(gx - 120, gy, 5, 35, 15, 18, 'metal'),
      // Concrete target
      ...stack(gx + 60, gy, 2, 3, 35, 25, 'concrete'),
    ],
  },
  {
    id: 22,
    chapter: 4,
    name: '강철 요새',
    description: '금속과 콘크리트의 요새를 파괴하세요',
    tools: ['bomb', 'laser'],
    blocks: (gx, gy) => [
      // Concrete base
      { x: gx, y: gy - 5, w: 180, h: 15, material: 'concrete' },
      // Metal walls
      { x: gx - 80, y: gy - 40, w: 15, h: 55, material: 'metal' },
      { x: gx + 80, y: gy - 40, w: 15, h: 55, material: 'metal' },
      // Glass windows
      { x: gx - 40, y: gy - 35, w: 25, h: 15, material: 'glass' },
      { x: gx + 40, y: gy - 35, w: 25, h: 15, material: 'glass' },
      // Wood interior
      ...stack(gx, gy - 25, 2, 2, 30, 20, 'wood'),
      // Metal roof
      { x: gx, y: gy - 70, w: 180, h: 12, material: 'metal' },
      // Top structure
      ...tower(gx, gy - 85, 60, 3, 18, 'wood'),
    ],
  },
  {
    id: 23,
    chapter: 4,
    name: '지진 파괴',
    description: '지진으로 모든 것을 흔들어 무너뜨리세요',
    tools: ['earthquake', 'shockwave'],
    blocks: (gx, gy) => [
      // Two tall unstable towers
      ...tower(gx - 70, gy, 50, 7, 20, 'wood'),
      ...tower(gx + 70, gy, 50, 7, 20, 'ice'),
      // Connecting bridge with glass
      { x: gx, y: gy - 4 * 20 - 5, w: 160, h: 10, material: 'glass' },
    ],
  },
  {
    id: 24,
    chapter: 4,
    name: '블랙홀',
    description: '블랙홀로 구조물을 빨아들이세요',
    tools: ['blackhole', 'shockwave'],
    blocks: (gx, gy) => [
      ...pyramid(gx, gy, 5, 30, 22, 'wood'),
      // Glass spire on top
      { x: gx, y: gy - 5 * 22 - 12, w: 15, h: 30, material: 'glass' },
    ],
  },

  // === CHAPTER 5: Master Challenge ===
  {
    id: 25,
    chapter: 5,
    name: '젤리 바운스',
    description: '젤리의 탄성을 이용하세요',
    tools: ['shockwave', 'bomb'],
    blocks: (gx, gy) => [
      // Jelly base
      ...stack(gx, gy, 3, 2, 35, 20, 'jelly'),
      // Wood on top
      ...stack(gx, gy - 45, 3, 3, 35, 20, 'wood'),
      // Glass crown
      { x: gx, y: gy - 110, w: 80, h: 10, material: 'glass' },
    ],
  },
  {
    id: 26,
    chapter: 5,
    name: '모래 성',
    description: '모래로 된 성을 무너뜨리세요',
    tools: ['shockwave', 'bomb', 'earthquake'],
    blocks: (gx, gy) => [
      // Sand castle structure
      ...stack(gx, gy, 5, 2, 28, 18, 'sand'),
      // Sand towers
      { x: gx - 50, y: gy - 50, w: 20, h: 55, material: 'sand' },
      { x: gx + 50, y: gy - 50, w: 20, h: 55, material: 'sand' },
      // Sand bridge
      { x: gx, y: gy - 80, w: 120, h: 12, material: 'sand' },
      // Decoration
      { x: gx, y: gy - 92, w: 30, h: 15, material: 'sand' },
    ],
  },
  {
    id: 27,
    chapter: 5,
    name: '풀 체인 마스터',
    description: '5소재 풀체인을 달성하세요!',
    tools: ['fireball', 'bomb'],
    toolLimits: { fireball: 1, bomb: 1 },
    blocks: (gx, gy) => {
      const blocks = [];
      // Wood start (ignition)
      blocks.push({ x: gx - 100, y: gy, w: 35, h: 25, material: 'wood' });
      blocks.push({ x: gx - 100, y: gy - 28, w: 35, h: 25, material: 'wood' });
      blocks.push({ x: gx - 70, y: gy - 12, w: 30, h: 20, material: 'wood' });
      // Ice section (thermal shock)
      blocks.push({ x: gx - 40, y: gy, w: 30, h: 25, material: 'ice' });
      blocks.push({ x: gx - 40, y: gy - 28, w: 30, h: 25, material: 'ice' });
      // Glass section (shatter from ice)
      blocks.push({ x: gx - 10, y: gy, w: 25, h: 22, material: 'glass' });
      blocks.push({ x: gx - 10, y: gy - 25, w: 25, h: 22, material: 'glass' });
      // Metal section (from bomb)
      blocks.push({ x: gx + 30, y: gy, w: 30, h: 25, material: 'metal' });
      blocks.push({ x: gx + 30, y: gy - 28, w: 30, h: 25, material: 'metal' });
      // Concrete section (domino from metal)
      blocks.push({ x: gx + 65, y: gy, w: 35, h: 30, material: 'concrete' });
      blocks.push({ x: gx + 95, y: gy, w: 35, h: 30, material: 'concrete' });
      return blocks;
    },
  },
  {
    id: 28,
    chapter: 5,
    name: '최종 보스',
    description: '거대한 다층 요새를 완전히 파괴하세요',
    tools: ['shockwave', 'fireball', 'laser', 'bomb', 'earthquake'],
    blocks: (gx, gy) => {
      const blocks = [];
      // Concrete foundation
      blocks.push({ x: gx, y: gy - 5, w: 220, h: 15, material: 'concrete' });
      // First floor - metal walls
      blocks.push({ x: gx - 100, y: gy - 40, w: 15, h: 55, material: 'metal' });
      blocks.push({ x: gx + 100, y: gy - 40, w: 15, h: 55, material: 'metal' });
      blocks.push({ x: gx - 35, y: gy - 40, w: 15, h: 55, material: 'metal' });
      blocks.push({ x: gx + 35, y: gy - 40, w: 15, h: 55, material: 'metal' });
      // First floor - wood interior
      for (let i = 0; i < 3; i++) {
        blocks.push({ x: gx - 65 + i * 33, y: gy - 25, w: 28, h: 20, material: 'wood' });
      }
      // Glass windows
      blocks.push({ x: gx - 68, y: gy - 45, w: 20, h: 12, material: 'glass' });
      blocks.push({ x: gx + 68, y: gy - 45, w: 20, h: 12, material: 'glass' });
      // Second floor platform
      blocks.push({ x: gx, y: gy - 72, w: 220, h: 12, material: 'concrete' });
      // Second floor
      blocks.push({ x: gx - 80, y: gy - 95, w: 15, h: 35, material: 'metal' });
      blocks.push({ x: gx + 80, y: gy - 95, w: 15, h: 35, material: 'metal' });
      for (let i = 0; i < 4; i++) {
        blocks.push({ x: gx - 50 + i * 33, y: gy - 90, w: 28, h: 18, material: 'ice' });
      }
      // Roof
      blocks.push({ x: gx, y: gy - 115, w: 180, h: 10, material: 'metal' });
      // Top decorations - glass spires
      blocks.push({ x: gx - 50, y: gy - 135, w: 10, h: 30, material: 'glass' });
      blocks.push({ x: gx, y: gy - 140, w: 12, h: 40, material: 'glass' });
      blocks.push({ x: gx + 50, y: gy - 135, w: 10, h: 30, material: 'glass' });
      // Flag pole
      blocks.push({ x: gx, y: gy - 170, w: 6, h: 20, material: 'wood' });
      return blocks;
    },
  },
  {
    id: 29,
    chapter: 5,
    name: '철거왕',
    description: '철거공으로 건물을 부수세요!',
    tools: ['wrecking_ball', 'bomb'],
    blocks: (gx, gy) => [
      // Simple building to demolish
      ...wall(gx - 40, gy, 80, 120, 30, 22, 'concrete'),
      // Glass on top
      ...stack(gx - 40, gy - 125, 3, 1, 30, 18, 'glass'),
      // Adjacent wood structure
      ...tower(gx + 60, gy, 50, 5, 22, 'wood'),
    ],
  },
  {
    id: 30,
    chapter: 5,
    name: '궁극의 파괴',
    description: '모든 도구를 사용해 완벽한 파괴를!',
    tools: ['shockwave', 'fireball', 'laser', 'bomb', 'wrecking_ball', 'blackhole', 'earthquake'],
    blocks: (gx, gy) => {
      const blocks = [];
      // Grand structure with all materials
      // Concrete base
      blocks.push({ x: gx, y: gy - 5, w: 280, h: 15, material: 'concrete' });
      // Left wing - wood
      for (let f = 0; f < 5; f++) {
        blocks.push({ x: gx - 100, y: gy - 20 - f * 22, w: 60, h: 20, material: f < 2 ? 'concrete' : 'wood' });
      }
      // Right wing - ice
      for (let f = 0; f < 5; f++) {
        blocks.push({ x: gx + 100, y: gy - 20 - f * 22, w: 60, h: 20, material: f < 2 ? 'metal' : 'ice' });
      }
      // Center tower
      for (let f = 0; f < 8; f++) {
        const mat = f < 2 ? 'concrete' : f < 4 ? 'metal' : f < 6 ? 'wood' : 'glass';
        if (f % 2 === 0) {
          blocks.push({ x: gx, y: gy - 20 - f * 20, w: 70, h: 18, material: mat });
        } else {
          blocks.push({ x: gx - 22, y: gy - 20 - f * 20, w: 18, h: 18, material: mat });
          blocks.push({ x: gx + 22, y: gy - 20 - f * 20, w: 18, h: 18, material: mat });
        }
      }
      // Bridges
      blocks.push({ x: gx - 50, y: gy - 65, w: 100, h: 8, material: 'glass' });
      blocks.push({ x: gx + 50, y: gy - 65, w: 100, h: 8, material: 'glass' });
      // Jelly accents
      blocks.push({ x: gx - 130, y: gy - 10, w: 20, h: 20, material: 'jelly' });
      blocks.push({ x: gx + 130, y: gy - 10, w: 20, h: 20, material: 'jelly' });
      // Sand decorations
      blocks.push({ x: gx, y: gy - 185, w: 25, h: 15, material: 'sand' });
      return blocks;
    },
  },
];

// Pre-built sandbox structures
export const SANDBOX_STRUCTURES = [
  {
    id: 'tower',
    name: '타워',
    description: '높은 타워',
    build: (gx, gy) => {
      const blocks = [];
      const materials = ['concrete', 'wood', 'ice', 'glass', 'wood'];
      for (let f = 0; f < 10; f++) {
        const mat = materials[f % materials.length];
        if (f % 2 === 0) {
          blocks.push({ x: gx, y: gy - f * 25, w: 80, h: 22, material: mat });
        } else {
          blocks.push({ x: gx - 25, y: gy - f * 25, w: 18, h: 22, material: mat });
          blocks.push({ x: gx + 25, y: gy - f * 25, w: 18, h: 22, material: mat });
        }
      }
      return blocks;
    },
  },
  {
    id: 'castle',
    name: '성',
    description: '중세 성곽',
    build: (gx, gy) => {
      const blocks = [];
      // Castle walls
      for (const ox of [-90, 90]) {
        for (let f = 0; f < 6; f++) {
          blocks.push({ x: gx + ox, y: gy - f * 22 - 11, w: 25, h: 22, material: f < 2 ? 'concrete' : 'wood' });
        }
      }
      // Gate arch
      blocks.push({ x: gx, y: gy - 70, w: 200, h: 12, material: 'concrete' });
      // Battlements
      for (let i = 0; i < 6; i++) {
        blocks.push({ x: gx - 75 + i * 30, y: gy - 85, w: 20, h: 15, material: 'concrete' });
      }
      // Interior
      blocks.push({ x: gx - 30, y: gy - 12, w: 25, h: 25, material: 'wood' });
      blocks.push({ x: gx + 30, y: gy - 12, w: 25, h: 25, material: 'wood' });
      blocks.push({ x: gx, y: gy - 35, w: 60, h: 10, material: 'wood' });
      // Tower tops with glass
      blocks.push({ x: gx - 90, y: gy - 140, w: 15, h: 15, material: 'glass' });
      blocks.push({ x: gx + 90, y: gy - 140, w: 15, h: 15, material: 'glass' });
      return blocks;
    },
  },
  {
    id: 'bridge',
    name: '다리',
    description: '아치형 다리',
    build: (gx, gy) => {
      const blocks = [];
      // Pillars
      for (const ox of [-100, -30, 30, 100]) {
        for (let f = 0; f < 4; f++) {
          blocks.push({ x: gx + ox, y: gy - f * 25 - 12, w: 20, h: 25, material: 'concrete' });
        }
      }
      // Deck
      blocks.push({ x: gx, y: gy - 105, w: 240, h: 12, material: 'metal' });
      // Railings
      for (let i = 0; i < 8; i++) {
        blocks.push({ x: gx - 105 + i * 30, y: gy - 120, w: 8, h: 18, material: 'glass' });
      }
      // Cars (wood boxes)
      blocks.push({ x: gx - 50, y: gy - 118, w: 25, h: 12, material: 'wood' });
      blocks.push({ x: gx + 40, y: gy - 118, w: 25, h: 12, material: 'wood' });
      return blocks;
    },
  },
  {
    id: 'skyscraper',
    name: '빌딩',
    description: '고층 빌딩',
    build: (gx, gy) => {
      const blocks = [];
      for (let floor = 0; floor < 12; floor++) {
        const y = gy - floor * 22;
        const mat = floor < 3 ? 'concrete' : floor < 7 ? 'metal' : 'glass';
        // Walls
        blocks.push({ x: gx - 45, y, w: 12, h: 22, material: mat });
        blocks.push({ x: gx + 45, y, w: 12, h: 22, material: mat });
        // Floor
        if (floor % 3 === 0) {
          blocks.push({ x: gx, y, w: 100, h: 8, material: 'concrete' });
        }
        // Window
        if (floor % 2 === 0) {
          blocks.push({ x: gx, y, w: 30, h: 12, material: 'glass' });
        }
      }
      // Roof
      blocks.push({ x: gx, y: gy - 12 * 22 - 5, w: 100, h: 8, material: 'metal' });
      // Antenna
      blocks.push({ x: gx, y: gy - 12 * 22 - 25, w: 5, h: 30, material: 'metal' });
      return blocks;
    },
  },
  {
    id: 'pyramid',
    name: '피라미드',
    description: '거대 피라미드',
    build: (gx, gy) => {
      const blocks = [];
      for (let row = 0; row < 8; row++) {
        const count = 8 - row;
        const startX = gx - (count - 1) * 18;
        const mat = row < 3 ? 'sand' : row < 6 ? 'concrete' : 'glass';
        for (let c = 0; c < count; c++) {
          blocks.push({
            x: startX + c * 36,
            y: gy - row * 22,
            w: 33,
            h: 20,
            material: mat,
          });
        }
      }
      return blocks;
    },
  },
];

export function getLevel(id) {
  return LEVELS.find(l => l.id === id);
}

export function getChapterLevels(chapterId) {
  return LEVELS.filter(l => l.chapter === chapterId);
}

export function getSandboxStructure(id) {
  return SANDBOX_STRUCTURES.find(s => s.id === id);
}
