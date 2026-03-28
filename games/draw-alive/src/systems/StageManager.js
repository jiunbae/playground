/**
 * StageManager - Manages challenge stages with procedural generation.
 * Handles stage goals, static obstacles, star rating, and ink limits.
 */
export class StageManager {
  constructor() {
    this.stages = this._generateStages();
    this.progress = this._loadProgress();
  }

  _generateStages() {
    const stages = [];

    // --- Handcrafted stages (1-10) ---

    // Stage 1: Tutorial - just drop something
    stages.push({
      id: 1,
      name: '첫 번째 마법',
      description: '아무거나 그려보세요! 그림이 살아 움직입니다.',
      inkLimit: 2000,
      goals: [{ type: 'reach_ground', description: '바닥에 닿기' }],
      obstacles: [],
      collectibles: [],
      stars: { ink: [0.8, 0.5, 0.3], time: [30, 20, 10] },
      tutorial: '화면 위쪽에 그림을 그린 뒤, ▶ 실행 버튼을 누르세요!',
    });

    // Stage 2: Collect one star directly below
    stages.push({
      id: 2,
      name: '별을 모아라',
      description: '오브젝트가 별을 지나가게 하세요.',
      inkLimit: 1800,
      goals: [{ type: 'collect_stars', count: 1, description: '별 1개 모으기' }],
      obstacles: [],
      collectibles: [{ x: 360, y: 600, type: 'star' }],
      stars: { ink: [0.7, 0.5, 0.3], time: [30, 20, 10] },
      tutorial: '별 위에서 그림을 그리면 떨어지면서 별을 모을 수 있어요!',
    });

    // Stage 3: Star behind a wall - need to go around
    stages.push({
      id: 3,
      name: '장애물 넘기',
      description: '벽을 넘어 별을 모으세요.',
      inkLimit: 1600,
      goals: [{ type: 'collect_stars', count: 1, description: '별 1개 모으기' }],
      obstacles: [
        { type: 'rect', x: 360, y: 700, w: 250, h: 20, isStatic: true },
      ],
      collectibles: [{ x: 500, y: 800, type: 'star' }],
      stars: { ink: [0.7, 0.4, 0.25], time: [30, 20, 10] },
      tutorial: '장애물 위에서 그리면 옆으로 굴러 떨어져요!',
    });

    // Stage 4: Use bouncing (red color) to reach a star
    stages.push({
      id: 4,
      name: '탄성의 힘',
      description: '빨간색으로 그리면 잘 튕겨요! 튕겨서 별을 모으세요.',
      inkLimit: 1500,
      goals: [{ type: 'collect_stars', count: 1, description: '별 1개 모으기' }],
      obstacles: [
        { type: 'rect', x: 360, y: 800, w: 400, h: 20, isStatic: true },
        { type: 'rect', x: 200, y: 600, w: 180, h: 20, angle: -0.3, isStatic: true },
      ],
      collectibles: [{ x: 580, y: 500, type: 'star' }],
      stars: { ink: [0.6, 0.4, 0.2], time: [40, 25, 15] },
      tutorial: '빨간색(탄성)으로 그리면 더 높이 튕겨요!',
    });

    // Stage 5: Two stars with a dividing wall
    stages.push({
      id: 5,
      name: '갈림길',
      description: '벽 양쪽의 별을 모두 모으세요.',
      inkLimit: 1800,
      goals: [{ type: 'collect_stars', count: 2, description: '별 2개 모으기' }],
      obstacles: [
        { type: 'rect', x: 360, y: 650, w: 20, h: 250, isStatic: true },
      ],
      collectibles: [
        { x: 200, y: 700, type: 'star' },
        { x: 520, y: 700, type: 'star' },
      ],
      stars: { ink: [0.6, 0.4, 0.2], time: [40, 25, 15] },
    });

    // Stage 6: Reach the target zone
    stages.push({
      id: 6,
      name: '목표를 향해',
      description: '그림을 목표 지점까지 이동시키세요!',
      inkLimit: 1600,
      goals: [{ type: 'reach_target', description: '목표 지점에 도착' }],
      obstacles: [
        { type: 'rect', x: 360, y: 700, w: 350, h: 20, isStatic: true },
        { type: 'rect', x: 550, y: 600, w: 20, h: 200, isStatic: true },
      ],
      targets: [{ x: 620, y: 950, radius: 45 }],
      stars: { ink: [0.6, 0.4, 0.2], time: [40, 25, 15] },
    });

    // Stage 7: Ramp and collect
    stages.push({
      id: 7,
      name: '경사면 활용',
      description: '경사면을 이용해 별을 모으세요.',
      inkLimit: 1400,
      goals: [{ type: 'collect_stars', count: 2, description: '별 2개 모으기' }],
      obstacles: [
        { type: 'rect', x: 280, y: 600, w: 300, h: 20, angle: 0.25, isStatic: true },
        { type: 'rect', x: 500, y: 800, w: 250, h: 20, angle: -0.2, isStatic: true },
      ],
      collectibles: [
        { x: 450, y: 550, type: 'star' },
        { x: 350, y: 900, type: 'star' },
      ],
      stars: { ink: [0.6, 0.35, 0.2], time: [45, 30, 15] },
    });

    // Stage 8: Heavy object needed to push through
    stages.push({
      id: 8,
      name: '무게의 차이',
      description: '보라색(무거움)으로 그려 장애물을 밀어내세요!',
      inkLimit: 1500,
      goals: [{ type: 'collect_stars', count: 1, description: '별 1개 모으기' }],
      obstacles: [
        { type: 'rect', x: 360, y: 750, w: 120, h: 20, isStatic: false },
        { type: 'rect', x: 360, y: 850, w: 350, h: 20, isStatic: true },
      ],
      collectibles: [{ x: 360, y: 680, type: 'star' }],
      stars: { ink: [0.6, 0.35, 0.2], time: [45, 30, 15] },
      tutorial: '보라색(무거움)은 다른 물체를 밀어낼 수 있어요!',
    });

    // Stage 9: Multi-star gauntlet
    stages.push({
      id: 9,
      name: '별 수집가',
      description: '세 개의 별을 모두 모으세요!',
      inkLimit: 2000,
      goals: [{ type: 'collect_stars', count: 3, description: '별 3개 모으기' }],
      obstacles: [
        { type: 'rect', x: 200, y: 500, w: 200, h: 20, angle: 0.15, isStatic: true },
        { type: 'rect', x: 500, y: 650, w: 200, h: 20, angle: -0.15, isStatic: true },
        { type: 'rect', x: 300, y: 800, w: 200, h: 20, isStatic: true },
      ],
      collectibles: [
        { x: 150, y: 400, type: 'star' },
        { x: 550, y: 550, type: 'star' },
        { x: 400, y: 730, type: 'star' },
      ],
      stars: { ink: [0.55, 0.35, 0.2], time: [50, 35, 20] },
    });

    // Stage 10: Combined challenge - stars + target
    stages.push({
      id: 10,
      name: '최종 시험',
      description: '별을 모으고 목표 지점에 도착하세요!',
      inkLimit: 2200,
      goals: [
        { type: 'collect_stars', count: 2, description: '별 2개 모으기' },
        { type: 'reach_target', description: '목표 도착' },
      ],
      obstacles: [
        { type: 'rect', x: 250, y: 550, w: 250, h: 20, angle: 0.2, isStatic: true },
        { type: 'rect', x: 500, y: 700, w: 200, h: 20, isStatic: true },
        { type: 'rect', x: 150, y: 800, w: 20, h: 200, isStatic: true },
      ],
      collectibles: [
        { x: 400, y: 450, type: 'star' },
        { x: 200, y: 650, type: 'star' },
      ],
      targets: [{ x: 600, y: 950, radius: 45 }],
      stars: { ink: [0.5, 0.3, 0.15], time: [60, 40, 20] },
    });

    // --- Procedural stages (11+) ---
    for (let i = 11; i <= 50; i++) {
      stages.push(this._generateProceduralStage(i));
    }

    return stages;
  }

  _generateProceduralStage(id) {
    const seed = id * 7919; // prime seed
    const rng = this._seededRandom(seed);

    // Difficulty scaling (from design doc)
    const obstacleCount = 3 + Math.floor(id / 8);
    const inkMultiplier = Math.max(1.2, 2.0 - id * 0.008);
    const goalCount = Math.min(3, 1 + Math.floor(id / 20));

    // Generate obstacles
    const obstacles = [];
    const w = 720;
    const h = 1280;
    for (let i = 0; i < Math.min(obstacleCount, 8); i++) {
      const ox = 100 + rng() * (w - 200);
      const oy = 350 + rng() * (h - 600);
      const ow = 80 + rng() * 200;
      const oh = 15 + rng() * 25;
      const angle = (rng() - 0.5) * 0.6;
      obstacles.push({
        type: 'rect', x: ox, y: oy, w: ow, h: oh, angle, isStatic: true,
      });
    }

    // Generate collectibles (stars)
    const collectibles = [];
    for (let i = 0; i < goalCount; i++) {
      let sx, sy;
      let attempts = 0;
      do {
        sx = 80 + rng() * (w - 160);
        sy = 300 + rng() * (h - 500);
        attempts++;
      } while (attempts < 20 && this._tooCloseToObstacles(sx, sy, obstacles, 60));
      collectibles.push({ x: sx, y: sy, type: 'star' });
    }

    // Occasionally add a target zone goal
    const hasTarget = rng() > 0.6;
    const targets = [];
    const goals = [];

    if (hasTarget) {
      const tx = 100 + rng() * (w - 200);
      const ty = h - 250 + rng() * 100;
      targets.push({ x: tx, y: ty, radius: 40 });
      goals.push({ type: 'reach_target', description: '목표 도착' });
    }

    if (goalCount > 0) {
      goals.push({ type: 'collect_stars', count: goalCount, description: `별 ${goalCount}개 모으기` });
    }
    if (goals.length === 0) {
      goals.push({ type: 'collect_stars', count: 1, description: '별 1개 모으기' });
    }

    // Ink limit based on optimal path estimate
    const baseInk = 600 + goalCount * 300 + obstacleCount * 100 + (hasTarget ? 200 : 0);
    const inkLimit = Math.round(baseInk * inkMultiplier);

    return {
      id,
      name: `스테이지 ${id}`,
      description: goals.map(g => g.description).join(' + '),
      inkLimit,
      goals,
      obstacles,
      collectibles,
      targets: targets.length > 0 ? targets : undefined,
      stars: {
        ink: [Math.max(0.3, 0.7 - id * 0.003), Math.max(0.2, 0.45 - id * 0.002), 0.15],
        time: [50 + id, 30 + id * 0.5, 15],
      },
    };
  }

  _seededRandom(seed) {
    let s = seed;
    return () => {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  _tooCloseToObstacles(x, y, obstacles, minDist) {
    for (const o of obstacles) {
      const dist = Math.hypot(x - o.x, y - o.y);
      if (dist < minDist) return true;
    }
    return false;
  }

  getStage(id) {
    return this.stages.find(s => s.id === id) || null;
  }

  getStageCount() {
    return this.stages.length;
  }

  /** Calculate star rating for a clear */
  calculateStars(stageId, inkUsed, inkLimit, timeTaken) {
    const stage = this.getStage(stageId);
    if (!stage) return 1;

    const inkRatio = inkUsed / inkLimit;
    const thresholds = stage.stars.ink;
    let stars = 1;
    if (inkRatio <= thresholds[2]) stars = 3;
    else if (inkRatio <= thresholds[1]) stars = 2;

    return stars;
  }

  /** Save stage progress to localStorage */
  saveProgress(stageId, stars, inkUsed, time) {
    const key = `stage_${stageId}`;
    const existing = this.progress[key];
    if (!existing || stars > existing.stars) {
      this.progress[key] = { stageId, stars, bestInk: inkUsed, bestTime: time, clearCount: 1 };
    } else {
      existing.clearCount++;
      if (inkUsed < existing.bestInk) existing.bestInk = inkUsed;
      if (time < existing.bestTime) existing.bestTime = time;
    }
    this._saveProgress();
  }

  getProgress(stageId) {
    return this.progress[`stage_${stageId}`] || null;
  }

  getMaxUnlockedStage() {
    let max = 1;
    for (const key in this.progress) {
      const p = this.progress[key];
      if (p.stars > 0) max = Math.max(max, p.stageId + 1);
    }
    return Math.min(max, this.stages.length);
  }

  getTotalStars() {
    let total = 0;
    for (const key in this.progress) {
      total += this.progress[key].stars;
    }
    return total;
  }

  _loadProgress() {
    try {
      const data = localStorage.getItem('drawAlive_progress');
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  _saveProgress() {
    try {
      localStorage.setItem('drawAlive_progress', JSON.stringify(this.progress));
    } catch {}
  }
}
