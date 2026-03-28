// A* 패스파인딩 시스템
export interface GridNode {
  x: number;
  y: number;
  walkable: boolean;
}

interface AStarNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: AStarNode | null;
}

export class PathFinder {
  private grid: GridNode[][];
  private cols: number;
  private rows: number;

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.grid = [];
    for (let y = 0; y < rows; y++) {
      this.grid[y] = [];
      for (let x = 0; x < cols; x++) {
        this.grid[y][x] = { x, y, walkable: true };
      }
    }
  }

  setWalkable(x: number, y: number, walkable: boolean): void {
    if (this.inBounds(x, y)) {
      this.grid[y][x].walkable = walkable;
    }
  }

  isWalkable(x: number, y: number): boolean {
    return this.inBounds(x, y) && this.grid[y][x].walkable;
  }

  private inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.cols && y >= 0 && y < this.rows;
  }

  findPath(startX: number, startY: number, endX: number, endY: number): { x: number; y: number }[] | null {
    if (!this.inBounds(startX, startY) || !this.inBounds(endX, endY)) return null;

    const open: AStarNode[] = [];
    const closed = new Set<string>();

    const startNode: AStarNode = {
      x: startX, y: startY, g: 0,
      h: this.heuristic(startX, startY, endX, endY),
      f: 0, parent: null,
    };
    startNode.f = startNode.g + startNode.h;
    open.push(startNode);

    while (open.length > 0) {
      // 가장 낮은 f값 노드 선택
      open.sort((a, b) => a.f - b.f);
      const current = open.shift()!;
      const key = `${current.x},${current.y}`;

      if (current.x === endX && current.y === endY) {
        return this.reconstructPath(current);
      }

      closed.add(key);

      // 4방향 이웃 탐색
      const neighbors = [
        { x: current.x - 1, y: current.y },
        { x: current.x + 1, y: current.y },
        { x: current.x, y: current.y - 1 },
        { x: current.x, y: current.y + 1 },
      ];

      for (const n of neighbors) {
        const nKey = `${n.x},${n.y}`;
        if (!this.inBounds(n.x, n.y) || !this.grid[n.y][n.x].walkable || closed.has(nKey)) {
          continue;
        }

        const g = current.g + 1;
        const existing = open.find(o => o.x === n.x && o.y === n.y);

        if (!existing) {
          const h = this.heuristic(n.x, n.y, endX, endY);
          open.push({ x: n.x, y: n.y, g, h, f: g + h, parent: current });
        } else if (g < existing.g) {
          existing.g = g;
          existing.f = g + existing.h;
          existing.parent = current;
        }
      }
    }

    return null; // 경로 없음
  }

  private heuristic(x1: number, y1: number, x2: number, y2: number): number {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2); // 맨해튼 거리
  }

  private reconstructPath(node: AStarNode): { x: number; y: number }[] {
    const path: { x: number; y: number }[] = [];
    let current: AStarNode | null = node;
    while (current) {
      path.unshift({ x: current.x, y: current.y });
      current = current.parent;
    }
    return path;
  }
}
