// Destruction tools the player can use
export const TOOLS = {
  shockwave: {
    id: 'shockwave',
    name: '충격파',
    icon: '💥',
    description: '탭한 지점에 충격파 발생',
    radius: 80,
    strength: 0.015,
    damage: 50,
    gesture: 'tap',
    unlocked: true,
  },
  fireball: {
    id: 'fireball',
    name: '화염구',
    icon: '🔥',
    description: '불을 발사하여 나무를 태움',
    radius: 50,
    strength: 0.01,
    damage: 40,
    gesture: 'tap',
    unlocked: true,
    special: 'ignite',
  },
  laser: {
    id: 'laser',
    name: '레이저',
    icon: '⚡',
    description: '스와이프 방향으로 절단',
    radius: 10,
    strength: 0.005,
    damage: 80,
    gesture: 'swipe',
    unlocked: true,
  },
  bomb: {
    id: 'bomb',
    name: '폭탄',
    icon: '💣',
    description: '강력한 폭발 (넓은 범위)',
    radius: 150,
    strength: 0.025,
    damage: 100,
    gesture: 'tap',
    unlocked: true,
  },
  wrecking_ball: {
    id: 'wrecking_ball',
    name: '철거공',
    icon: '⚫',
    description: '드래그하여 물리적 타격',
    radius: 30,
    strength: 0.02,
    damage: 70,
    gesture: 'drag',
    unlocked: true,
  },
  blackhole: {
    id: 'blackhole',
    name: '블랙홀',
    icon: '🌀',
    description: '모든 것을 빨아들임',
    radius: 120,
    strength: -0.02,
    damage: 30,
    gesture: 'tap',
    unlocked: true,
    special: 'blackhole',
  },
  earthquake: {
    id: 'earthquake',
    name: '지진',
    icon: '🌊',
    description: '화면 전체를 흔듦',
    radius: 9999,
    strength: 0.008,
    damage: 20,
    gesture: 'tap',
    unlocked: true,
    special: 'earthquake',
  },
};

export class ToolManager {
  constructor() {
    this.currentTool = 'shockwave';
    this.availableTools = ['shockwave', 'fireball', 'laser'];
    this.usesLeft = {};
    this.unlimited = true;
  }

  setAvailable(toolIds) {
    this.availableTools = toolIds.filter(id => TOOLS[id]);
    if (!this.availableTools.includes(this.currentTool)) {
      this.currentTool = this.availableTools[0] || 'shockwave';
    }
  }

  setLimits(limits) {
    this.unlimited = false;
    this.usesLeft = { ...limits };
  }

  clearLimits() {
    this.unlimited = true;
    this.usesLeft = {};
  }

  selectTool(toolId) {
    if (this.availableTools.includes(toolId)) {
      this.currentTool = toolId;
      return true;
    }
    return false;
  }

  nextTool() {
    const idx = this.availableTools.indexOf(this.currentTool);
    const next = (idx + 1) % this.availableTools.length;
    this.currentTool = this.availableTools[next];
    return this.currentTool;
  }

  prevTool() {
    const idx = this.availableTools.indexOf(this.currentTool);
    const prev = (idx - 1 + this.availableTools.length) % this.availableTools.length;
    this.currentTool = this.availableTools[prev];
    return this.currentTool;
  }

  canUse(toolId = null) {
    const id = toolId || this.currentTool;
    if (this.unlimited) return true;
    return (this.usesLeft[id] || 0) > 0;
  }

  use(toolId = null) {
    const id = toolId || this.currentTool;
    if (!this.unlimited) {
      if ((this.usesLeft[id] || 0) <= 0) return false;
      this.usesLeft[id]--;
    }
    return true;
  }

  getTool(id = null) {
    return TOOLS[id || this.currentTool];
  }

  getTotalUsesLeft() {
    if (this.unlimited) return Infinity;
    return Object.values(this.usesLeft).reduce((a, b) => a + b, 0);
  }
}
