import { GRID_COLS } from '../config/GameConfig';

// 셀 타입: 0=배치 가능, 1=경로, 2=시작점, 3=마을(종점), 4=장식(배치 불가)
export type CellType = 0 | 1 | 2 | 3 | 4;

export interface MapData {
  grid: CellType[][];
  spawnPoints: { x: number; y: number }[];
  villagePoint: { x: number; y: number };
  cols: number;
  rows: number;
}

// 시드 기반 난수 생성기
class SeededRandom {
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

export class MapGenerator {
  generate(stage: number, cols: number, rows: number): MapData {
    const rng = new SeededRandom(stage * 7919 + 31);
    const grid: CellType[][] = [];

    // 모두 배치 가능으로 초기화
    for (let y = 0; y < rows; y++) {
      grid[y] = [];
      for (let x = 0; x < cols; x++) {
        grid[y][x] = 0;
      }
    }

    // 경로 수 결정 (1~3개)
    const pathCount = Math.min(3, 1 + Math.floor(stage / 25));
    const spawnPoints: { x: number; y: number }[] = [];

    // 마을 위치 (하단 중앙)
    const villageX = Math.floor(cols / 2);
    const villageY = rows - 2;
    grid[villageY][villageX] = 3;
    if (villageX - 1 >= 0) grid[villageY][villageX - 1] = 3;
    if (villageX + 1 < cols) grid[villageY][villageX + 1] = 3;

    // 각 경로 생성
    for (let p = 0; p < pathCount; p++) {
      // 시작점: 상단 랜덤
      let spawnX: number;
      if (pathCount === 1) {
        spawnX = Math.floor(cols / 2);
      } else {
        const section = Math.floor(cols / (pathCount + 1));
        spawnX = section * (p + 1);
      }
      spawnX = Math.max(1, Math.min(cols - 2, spawnX));
      const spawnY = 0;
      spawnPoints.push({ x: spawnX, y: spawnY });
      grid[spawnY][spawnX] = 2;

      // 시작점에서 마을까지 경로 생성 (랜덤 워크 + 하향 진행)
      let cx = spawnX;
      let cy = spawnY;

      while (cy < villageY) {
        if (grid[cy][cx] === 0) {
          grid[cy][cx] = 1;
        }

        // 하단으로 진행 (65% 아래, 35% 좌우)
        const roll = rng.next();
        if (roll < 0.65 || cy === 0) {
          cy++;
        } else if (roll < 0.82) {
          const dir = cx < villageX ? 1 : -1;
          cx = Math.max(1, Math.min(cols - 2, cx + dir));
        } else {
          const dir = cx > villageX ? -1 : 1;
          cx = Math.max(1, Math.min(cols - 2, cx + dir));
        }
      }

      // 마을까지 마지막 구간 연결 - 현재 위치에서 villageX로 수평 이동 후 하강
      while (cx !== villageX && cy < rows) {
        if (grid[cy][cx] === 0) grid[cy][cx] = 1;
        cx += cx < villageX ? 1 : -1;
      }
      // 마을 위치까지 수직 연결
      while (cy <= villageY) {
        if (grid[cy][cx] === 0) grid[cy][cx] = 1;
        cy++;
      }
    }

    // 경로 주변에 랜덤 장식 배치
    for (let y = 1; y < rows - 1; y++) {
      for (let x = 0; x < cols; x++) {
        if (grid[y][x] === 0 && rng.next() < 0.08) {
          grid[y][x] = 4;
        }
      }
    }

    return { grid, spawnPoints, villagePoint: { x: villageX, y: villageY }, cols, rows };
  }
}
