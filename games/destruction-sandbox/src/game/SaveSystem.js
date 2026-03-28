const SAVE_KEY = 'destruction_sandbox_save';

const DEFAULT_SAVE = {
  version: 1,
  campaign: {
    currentStage: 1,
    stages: {}, // { stageId: { stars, bestScore, completed } }
  },
  sandbox: {
    unlockedTools: ['shockwave', 'fireball', 'laser'],
  },
  stats: {
    totalFragments: 0,
    totalChains: 0,
    totalDestructions: 0,
    perfectChains: 0,
  },
  settings: {
    soundVolume: 0.7,
    hapticEnabled: true,
    graphicsQuality: 'high',
  },
  tutorialComplete: false,
  onboardingStep: 0,
};

export class SaveSystem {
  constructor() {
    this.data = this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        // Merge with defaults for forward compatibility
        return { ...DEFAULT_SAVE, ...data };
      }
    } catch (e) {
      console.warn('Failed to load save:', e);
    }
    return { ...DEFAULT_SAVE };
  }

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Failed to save:', e);
    }
  }

  getStageResult(stageId) {
    return this.data.campaign.stages[stageId] || null;
  }

  saveStageResult(stageId, result) {
    const existing = this.data.campaign.stages[stageId];
    if (!existing || result.score > existing.bestScore) {
      this.data.campaign.stages[stageId] = {
        stars: Math.max(result.stars, existing?.stars || 0),
        bestScore: Math.max(result.score, existing?.bestScore || 0),
        completed: true,
      };
    }

    // Advance current stage
    if (stageId >= this.data.campaign.currentStage) {
      this.data.campaign.currentStage = stageId + 1;
    }

    this.save();
  }

  updateStats(destroyed, chains, perfect) {
    this.data.stats.totalFragments += destroyed;
    this.data.stats.totalChains += chains;
    this.data.stats.totalDestructions++;
    if (perfect) this.data.stats.perfectChains++;
    this.save();
  }

  isStageUnlocked(stageId) {
    return stageId <= this.data.campaign.currentStage;
  }

  completeOnboarding() {
    this.data.tutorialComplete = true;
    this.data.onboardingStep = 99;
    this.save();
  }

  get onboardingStep() {
    return this.data.onboardingStep;
  }

  set onboardingStep(v) {
    this.data.onboardingStep = v;
    this.save();
  }

  resetAll() {
    this.data = { ...DEFAULT_SAVE };
    this.save();
  }
}
