import { NodeType } from '../utils/constants';
import { SeededRandom } from '../utils/SeededRandom';

export interface MapNode {
  id: number;
  floor: number;
  column: number;
  type: NodeType;
  connections: number[]; // ids of connected nodes on next floor
  visited: boolean;
  x: number;
  y: number;
}

export interface DungeonMap {
  nodes: MapNode[];
  act: number;
  totalFloors: number;
}

const ACT_NODE_DISTRIBUTION: Record<number, Record<NodeType, number>> = {
  1: { battle: 55, event: 15, shop: 10, rest: 10, elite: 5, treasure: 5, boss: 0 },
  2: { battle: 45, event: 15, shop: 10, rest: 10, elite: 15, treasure: 5, boss: 0 },
  3: { battle: 40, event: 10, shop: 10, rest: 10, elite: 20, treasure: 10, boss: 0 },
};

export class MapGenerator {
  generate(act: number, rng: SeededRandom): DungeonMap {
    const totalFloors = 7; // floors before boss
    const nodes: MapNode[] = [];
    let nodeId = 0;

    // Generate floor by floor
    const floors: MapNode[][] = [];

    for (let floor = 0; floor < totalFloors; floor++) {
      const nodesInFloor = rng.nextInt(2, 4);
      const floorNodes: MapNode[] = [];

      for (let col = 0; col < nodesInFloor; col++) {
        const type = this.pickNodeType(act, floor, totalFloors, rng);
        const node: MapNode = {
          id: nodeId++,
          floor,
          column: col,
          type,
          connections: [],
          visited: false,
          x: 0, y: 0,
        };
        floorNodes.push(node);
      }
      floors.push(floorNodes);
      nodes.push(...floorNodes);
    }

    // Add boss node
    const bossNode: MapNode = {
      id: nodeId++,
      floor: totalFloors,
      column: 0,
      type: 'boss',
      connections: [],
      visited: false,
      x: 0, y: 0,
    };
    floors.push([bossNode]);
    nodes.push(bossNode);

    // Generate connections
    for (let f = 0; f < floors.length - 1; f++) {
      const currentFloor = floors[f];
      const nextFloor = floors[f + 1];

      // Each node connects to at least 1 node on next floor
      for (const node of currentFloor) {
        const connectCount = Math.min(rng.nextInt(1, 2), nextFloor.length);
        const targets = rng.shuffle([...nextFloor]).slice(0, connectCount);
        for (const t of targets) {
          if (!node.connections.includes(t.id)) {
            node.connections.push(t.id);
          }
        }
      }

      // Ensure every next-floor node has at least one incoming connection
      for (const nextNode of nextFloor) {
        const hasIncoming = currentFloor.some(n => n.connections.includes(nextNode.id));
        if (!hasIncoming) {
          const source = rng.pick(currentFloor);
          source.connections.push(nextNode.id);
        }
      }
    }

    // Validate and fix rules
    this.validateMap(floors, rng, totalFloors);

    // Assign positions for rendering
    this.assignPositions(floors);

    return { nodes, act, totalFloors: totalFloors + 1 };
  }

  private pickNodeType(act: number, floor: number, totalFloors: number, rng: SeededRandom): NodeType {
    const dist = ACT_NODE_DISTRIBUTION[act] || ACT_NODE_DISTRIBUTION[1];

    // Rule: floor before boss must be rest or shop
    if (floor === totalFloors - 1) {
      return rng.next() < 0.5 ? 'rest' : 'shop';
    }

    // First floor should be a battle
    if (floor === 0) return 'battle';

    const types: NodeType[] = ['battle', 'event', 'shop', 'rest', 'elite', 'treasure'];
    const weights = types.map(t => dist[t]);
    return rng.weightedPick(types, weights);
  }

  private validateMap(floors: MapNode[][], rng: SeededRandom, totalFloors: number): void {
    // Rule: no consecutive elites
    for (let f = 0; f < floors.length - 1; f++) {
      for (const node of floors[f]) {
        if (node.type === 'elite') {
          for (const connId of node.connections) {
            const nextNode = floors[f + 1]?.find(n => n.id === connId);
            if (nextNode && nextNode.type === 'elite') {
              nextNode.type = 'battle';
            }
          }
        }
      }
    }

    // Ensure at least one path avoids elites (already somewhat guaranteed by random)
  }

  private assignPositions(floors: MapNode[][]): void {
    const mapWidth = 600;
    const mapHeight = 900;
    const paddingX = 80;
    const paddingY = 60;

    for (let f = 0; f < floors.length; f++) {
      const floor = floors[f];
      const y = mapHeight - paddingY - (f / (floors.length - 1)) * (mapHeight - paddingY * 2);
      const spacing = (mapWidth - paddingX * 2) / Math.max(floor.length - 1, 1);

      for (let i = 0; i < floor.length; i++) {
        floor[i].x = paddingX + i * spacing + (floor.length === 1 ? (mapWidth - paddingX * 2) / 2 : 0);
        floor[i].y = y;
      }
    }
  }
}
