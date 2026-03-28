import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, GAME_HEIGHT, NodeType, ELEMENT_ICONS } from '../utils/constants';
import { UIHelper } from '../ui/UIHelper';
import { DungeonMap, MapNode, MapGenerator } from '../systems/MapGenerator';
import { gameState } from '../systems/GameState';
import { getEnemiesForAct } from '../data/enemies';

const NODE_ICONS: Record<NodeType, string> = {
  battle: '⚔️',
  elite: '💀',
  shop: '🪙',
  event: '❓',
  rest: '🔥',
  treasure: '📦',
  boss: '👑',
};

const NODE_COLORS: Record<NodeType, number> = {
  battle: 0x888888,
  elite: 0xFF4444,
  shop: 0xFFD700,
  event: 0x4FC3F7,
  rest: 0x66BB6A,
  treasure: 0xFFD700,
  boss: 0xC41E3A,
};

export class DungeonMapScene extends Phaser.Scene {
  private map!: DungeonMap;
  private nodeObjects: Map<number, Phaser.GameObjects.Container> = new Map();
  private currentAccessibleNodes: number[] = [];
  private mapContainer!: Phaser.GameObjects.Container;
  private scrollY = 0;

  constructor() {
    super({ key: 'DungeonMap' });
  }

  init(data: { map: DungeonMap }): void {
    this.map = data.map;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.BG_PRIMARY);
    this.nodeObjects.clear();

    // Header
    const run = gameState.run!;
    this.add.text(GAME_WIDTH / 2, 30, `Act ${this.map.act} - ${run.character.title}`, {
      fontSize: '22px', fontFamily: 'sans-serif', color: COLORS.ACCENT_HEX, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10);

    // Player stats bar
    this.createStatsBar();

    // Map container (scrollable)
    this.mapContainer = this.add.container(60, 80);

    // Draw connections first
    for (const node of this.map.nodes) {
      for (const connId of node.connections) {
        const targetNode = this.map.nodes.find(n => n.id === connId);
        if (targetNode) {
          const line = this.add.line(0, 0,
            node.x, node.y, targetNode.x, targetNode.y,
            0x444466, 0.5
          ).setOrigin(0, 0);
          this.mapContainer.add(line);
        }
      }
    }

    // Draw nodes
    for (const node of this.map.nodes) {
      const container = this.createNodeVisual(node);
      this.mapContainer.add(container);
      this.nodeObjects.set(node.id, container);
    }

    // Determine accessible nodes
    this.updateAccessibleNodes();

    // Scrolling
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) {
        this.mapContainer.y += pointer.velocity.y * 0.02;
        this.mapContainer.y = Phaser.Math.Clamp(this.mapContainer.y, -400, 200);
      }
    });

    UIHelper.fadeIn(this);
  }

  private createStatsBar(): void {
    const run = gameState.run!;
    const y = GAME_HEIGHT - 50;

    const bar = this.add.rectangle(GAME_WIDTH / 2, y, GAME_WIDTH, 60, 0x111122, 0.95).setDepth(10);
    bar.setStrokeStyle(1, COLORS.CARD_BORDER);

    // HP
    this.add.text(30, y - 10, `❤️ ${run.hp}/${run.maxHp}`, {
      fontSize: '16px', fontFamily: 'sans-serif', color: '#FF6666',
    }).setOrigin(0, 0.5).setDepth(11);

    // Gold
    this.add.text(180, y - 10, `🪙 ${run.gold}`, {
      fontSize: '16px', fontFamily: 'sans-serif', color: COLORS.ACCENT_HEX,
    }).setOrigin(0, 0.5).setDepth(11);

    // Deck
    this.add.text(300, y - 10, `🃏 ${run.deck.length}`, {
      fontSize: '16px', fontFamily: 'sans-serif', color: COLORS.TEXT_HEX,
    }).setOrigin(0, 0.5).setDepth(11);

    // Relics
    this.add.text(400, y - 10, `💎 ${run.relics.length}`, {
      fontSize: '16px', fontFamily: 'sans-serif', color: '#BB88FF',
    }).setOrigin(0, 0.5).setDepth(11);

    // Floor info
    this.add.text(GAME_WIDTH / 2, y + 12, `Floor ${run.currentFloor + 1}`, {
      fontSize: '12px', fontFamily: 'sans-serif', color: '#666666',
    }).setOrigin(0.5).setDepth(11);
  }

  private createNodeVisual(node: MapNode): Phaser.GameObjects.Container {
    const container = this.add.container(node.x, node.y);
    const radius = node.type === 'boss' ? 28 : 22;
    const color = NODE_COLORS[node.type];

    const circle = this.add.circle(0, 0, radius, color, 0.7);
    circle.setStrokeStyle(2, COLORS.CARD_BORDER);

    const icon = this.add.text(0, 0, NODE_ICONS[node.type], {
      fontSize: node.type === 'boss' ? '24px' : '18px',
    }).setOrigin(0.5);

    if (node.visited) {
      circle.setAlpha(0.3);
      icon.setAlpha(0.3);
    }

    container.add([circle, icon]);
    container.setData('node', node);
    container.setData('circle', circle);

    return container;
  }

  private updateAccessibleNodes(): void {
    const run = gameState.run!;

    if (run.currentFloor === 0) {
      // First floor nodes are accessible
      this.currentAccessibleNodes = this.map.nodes
        .filter(n => n.floor === 0)
        .map(n => n.id);
    } else {
      // Find the last visited node
      const visitedNodes = this.map.nodes.filter(n => n.visited);
      const lastVisited = visitedNodes[visitedNodes.length - 1];
      if (lastVisited) {
        this.currentAccessibleNodes = lastVisited.connections;
      }
    }

    // Make accessible nodes interactive with glow
    for (const nodeId of this.currentAccessibleNodes) {
      const container = this.nodeObjects.get(nodeId);
      if (!container) continue;

      const circle = container.getData('circle') as Phaser.GameObjects.Arc;
      circle.setStrokeStyle(3, COLORS.ACCENT);
      circle.setInteractive({ useHandCursor: true });

      // Pulsing animation
      this.tweens.add({
        targets: circle,
        scaleX: 1.15, scaleY: 1.15,
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      circle.on('pointerdown', () => this.selectNode(nodeId));
    }
  }

  private selectNode(nodeId: number): void {
    const node = this.map.nodes.find(n => n.id === nodeId)!;
    node.visited = true;

    const run = gameState.run!;
    run.currentFloor = node.floor + 1;

    switch (node.type) {
      case 'battle':
      case 'elite': {
        const type = node.type === 'elite' ? 'elite' : 'normal';
        const enemies = getEnemiesForAct(this.map.act, type);
        const rng = run.rng;
        const enemy = rng.pick(enemies);
        this.scene.start('Battle', { enemies: [enemy], map: this.map, isElite: node.type === 'elite' });
        break;
      }
      case 'boss': {
        const bosses = getEnemiesForAct(this.map.act, 'boss');
        if (bosses.length > 0) {
          this.scene.start('Battle', { enemies: [bosses[0]], map: this.map, isBoss: true });
        }
        break;
      }
      case 'rest':
        this.scene.start('Rest', { map: this.map });
        break;
      case 'shop':
        this.scene.start('Shop', { map: this.map });
        break;
      case 'treasure': {
        this.scene.start('Treasure', { map: this.map });
        break;
      }
      case 'event':
        this.scene.start('Event', { map: this.map });
        break;
    }
  }
}
