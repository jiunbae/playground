export class ScoringSystem {
  constructor() {
    this.reset();
  }

  reset() {
    this.totalBlocks = 0;
    this.destroyedBlocks = 0;
    this.chainCount = 0;
    this.maxChainCombo = 0;
    this.currentCombo = 0;
    this.comboTimer = 0;
    this.materialTypes = new Set();
    this.inputCount = 0; // player actions taken
    this.perfectChain = false;
    this.score = 0;
    this.stars = 0;
    this.popups = []; // floating score popups
  }

  setTotalBlocks(count) {
    this.totalBlocks = count;
  }

  recordDestruction(block) {
    this.destroyedBlocks++;
    this.materialTypes.add(block.material.id);
  }

  recordChain() {
    this.chainCount++;
    this.currentCombo++;
    this.comboTimer = 60; // frames until combo resets
    if (this.currentCombo > this.maxChainCombo) {
      this.maxChainCombo = this.currentCombo;
    }
  }

  recordInput() {
    this.inputCount++;
  }

  update() {
    if (this.comboTimer > 0) {
      this.comboTimer--;
      if (this.comboTimer <= 0) {
        this.currentCombo = 0;
      }
    }

    // Decay popups
    for (let i = this.popups.length - 1; i >= 0; i--) {
      this.popups[i].life--;
      this.popups[i].y -= 1.5;
      if (this.popups[i].life <= 0) {
        this.popups.splice(i, 1);
      }
    }
  }

  addPopup(x, y, text, color = '#FFD600') {
    this.popups.push({
      x, y, text, color,
      life: 60,
      maxLife: 60,
    });
  }

  get destructionRate() {
    if (this.totalBlocks === 0) return 0;
    return this.destroyedBlocks / this.totalBlocks;
  }

  calculateScore() {
    const destructionRate = this.destructionRate;
    const baseScore = Math.round(destructionRate * 1000);

    // Chain combo multiplier
    const chainMultiplier = 1 + (this.chainCount * 0.2);

    // Material diversity multiplier
    const materialMultiplier = 1 + (this.materialTypes.size - 1) * 0.15;

    this.score = Math.round(baseScore * chainMultiplier * materialMultiplier);

    // Perfect chain check: 1 input destroyed everything
    this.perfectChain = this.inputCount === 1 && destructionRate >= 0.95;

    // Star calculation
    this.stars = 0;
    if (destructionRate >= 0.7) this.stars = 1;
    if (destructionRate >= 0.7 && this.chainCount >= 3) this.stars = 2;
    if (destructionRate >= 0.95 && this.chainCount >= 3 && this.inputCount <= 2) this.stars = 3;

    return {
      score: this.score,
      stars: this.stars,
      destructionRate,
      chainCount: this.chainCount,
      maxCombo: this.maxChainCombo,
      materialTypes: this.materialTypes.size,
      perfectChain: this.perfectChain,
      inputCount: this.inputCount,
    };
  }
}
