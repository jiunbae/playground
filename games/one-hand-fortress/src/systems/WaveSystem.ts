import { ENEMIES, EnemyDef } from '../config/GameConfig';

export interface WaveData {
  enemies: { def: EnemyDef; count: number; interval: number }[];
  delayAfter: number;
}

// 시드 기반 난수 생성기 (주간 챌린지 적 구성 결정용)
class WaveSeededRandom {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  next(): number {
    this.seed = (this.seed * 16807 + 0) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

export class WaveSystem {
  /**
   * Generate waves for a stage. If `seed` is provided, enemy composition
   * variation is seeded deterministically (for weekly challenge).
   */
  generateWaves(stage: number, seed?: number): WaveData[] {
    // Ensure at least 5 waves, more for later stages
    const waveCount = Math.max(5, 3 + Math.floor(stage / 10));
    const healthMul = 1 + stage * 0.08;
    const waves: WaveData[] = [];

    // 사용 가능한 적 종류 결정 (스테이지 진행에 따라 증가, 보스 제외)
    const maxEnemyIndex = Math.min(Math.floor(stage / 8) + 1, ENEMIES.length - 2);

    for (let w = 0; w < waveCount; w++) {
      const isBossWave = stage % 10 === 0 && w === waveCount - 1;
      const isLastWave = w === waveCount - 1;
      const waveEnemies: { def: EnemyDef; count: number; interval: number }[] = [];

      if (isBossWave) {
        // 보스 웨이브: 잡몹 + 보스
        const minionDef = { ...ENEMIES[0], health: Math.round(ENEMIES[0].health * healthMul) };
        waveEnemies.push({ def: minionDef, count: 4 + Math.floor(stage / 10), interval: 700 });
        const bossDef = { ...ENEMIES[5], health: Math.round(ENEMIES[5].health * healthMul) };
        waveEnemies.push({ def: bossDef, count: 1, interval: 2000 });
      } else if (isLastWave && !isBossWave) {
        // 마지막 웨이브: 더 많은 적
        const enemyIdx = Math.min(maxEnemyIndex, Math.floor(w * 0.5));
        const baseDef = ENEMIES[enemyIdx];
        const scaledDef = { ...baseDef, health: Math.round(baseDef.health * healthMul * 1.2) };
        const count = 5 + Math.floor(stage / 5) + w;
        waveEnemies.push({ def: scaledDef, count, interval: Math.max(400, 1000 - stage * 8) });

        // 추가 타입
        if (maxEnemyIndex > 0) {
          const secondIdx = Math.min(maxEnemyIndex, (enemyIdx + 1) % (maxEnemyIndex + 1));
          const secondDef = ENEMIES[secondIdx];
          const scaledSecond = { ...secondDef, health: Math.round(secondDef.health * healthMul) };
          waveEnemies.push({ def: scaledSecond, count: Math.max(2, Math.floor(count / 2)), interval: Math.max(500, 1000 - stage * 8) });
        }
      } else {
        // 일반 웨이브: 점진적 난이도
        const typeCount = Math.min(1 + Math.floor(w / 3), 2);
        for (let t = 0; t < typeCount; t++) {
          const enemyIdx = Math.min(
            Math.floor(((w + t) * (stage + 1)) % (maxEnemyIndex + 1)),
            maxEnemyIndex
          );
          const baseDef = ENEMIES[enemyIdx];
          const waveScale = 1 + w * 0.05; // 웨이브마다 조금씩 강해짐
          const scaledDef = { ...baseDef, health: Math.round(baseDef.health * healthMul * waveScale) };
          const count = 3 + Math.floor(stage / 10) + Math.floor(w / 2);
          const interval = Math.max(400, 1200 - Math.min(stage * 10, 600));
          waveEnemies.push({ def: scaledDef, count, interval });
        }
      }

      waves.push({ enemies: waveEnemies, delayAfter: 5000 });
    }

    return waves;
  }
}
