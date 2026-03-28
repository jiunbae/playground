import { CHAIN_REACTIONS, getMaterial } from './Materials.js';

export class ChainReactionSystem {
  constructor(game) {
    this.game = game;
    this.pendingChains = []; // { sourceBlock, targetBlock, reaction, triggerTime }
    this.chainCount = 0;
    this.chainLog = []; // For scoring: [{material, type, time}]
    this.materialChains = new Set(); // Unique material types involved in chains
    this.onChain = null; // callback(chainCount, block, reaction)
    this.onBlockDestroyed = null;
  }

  reset() {
    this.pendingChains = [];
    this.chainCount = 0;
    this.chainLog = [];
    this.materialChains.clear();
  }

  // Called when a block is destroyed - check for chain reactions to neighbors
  triggerChain(destroyedBlock) {
    if (destroyedBlock.chainTriggered) return;
    destroyedBlock.chainTriggered = true;

    const mat = destroyedBlock.material;
    const chainType = mat.chainType;
    const reactions = CHAIN_REACTIONS[chainType];
    if (!reactions) return;

    // Find nearby blocks that can be affected
    const pos = destroyedBlock.body.position;
    const chainRadius = Math.max(destroyedBlock.width, destroyedBlock.height) * 2.5;

    const nearbyBlocks = this.game.blocks.filter(b => {
      if (b === destroyedBlock || b.destroyed || b.chainTriggered) return false;
      const dx = b.body.position.x - pos.x;
      const dy = b.body.position.y - pos.y;
      return Math.sqrt(dx * dx + dy * dy) < chainRadius;
    });

    for (const target of nearbyBlocks) {
      const reaction = reactions[target.material.id];
      if (!reaction) continue;

      // Queue the chain reaction with delay
      this.pendingChains.push({
        sourceBlock: destroyedBlock,
        targetBlock: target,
        reaction,
        triggerTime: Date.now() + reaction.delay,
      });
    }
  }

  update() {
    const now = Date.now();
    const toProcess = [];

    // Process pending chains that are ready
    for (let i = this.pendingChains.length - 1; i >= 0; i--) {
      const chain = this.pendingChains[i];
      if (now >= chain.triggerTime) {
        toProcess.push(chain);
        this.pendingChains.splice(i, 1);
      }
    }

    for (const chain of toProcess) {
      const { targetBlock, reaction, sourceBlock } = chain;
      if (targetBlock.destroyed) continue;

      // Apply chain effect
      switch (reaction.effect) {
        case 'ignite':
          if (targetBlock.ignite()) {
            this._recordChain(sourceBlock, targetBlock, reaction);
          }
          break;
        case 'thermal_shock':
        case 'shatter':
        case 'shrapnel':
        case 'impact':
          const destroyed = targetBlock.takeDamage(reaction.damage);
          this._recordChain(sourceBlock, targetBlock, reaction);
          if (destroyed) {
            if (this.onBlockDestroyed) {
              this.onBlockDestroyed(targetBlock);
            }
            // Recursively trigger more chains
            this.triggerChain(targetBlock);
          }
          break;
      }
    }
  }

  _recordChain(source, target, reaction) {
    this.chainCount++;
    this.materialChains.add(source.material.id);
    this.materialChains.add(target.material.id);
    this.chainLog.push({
      sourceMaterial: source.material.id,
      targetMaterial: target.material.id,
      type: reaction.effect,
      description: reaction.description,
      time: Date.now(),
    });

    if (this.onChain) {
      this.onChain(this.chainCount, target, reaction);
    }
  }

  get uniqueMaterialCount() {
    return this.materialChains.size;
  }

  get isActive() {
    return this.pendingChains.length > 0;
  }
}
