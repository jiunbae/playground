function getCloudSdk() {
  return window.__sdk || null;
}

function showCloudToast(msg) {
  const existing = document.getElementById('cloud-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'cloud-toast';
  toast.textContent = msg;
  toast.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:#fff;padding:8px 16px;border-radius:20px;font-size:13px;z-index:9999;transition:opacity 0.3s;';
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 2000);
}

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
    // Auto-sync with cloud on init if logged in
    try {
      if (getCloudSdk()?.auth.getUser()) {
        this.cloudSync();
      }
    } catch { /* ignore */ }
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
      this.data.updatedAt = Date.now();
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Failed to save:', e);
    }
    // Cloud save (fire-and-forget)
    this._cloudSave();
  }

  async _cloudSave() {
    if (!getCloudSdk()) return;
    try {
      await getCloudSdk().saves.save({ ...this.data, updatedAt: Date.now() });
      showCloudToast('\u2601\uFE0F \uC800\uC7A5\uB428');
    } catch { /* cloud save failed, continue offline */ }
  }

  async cloudSync() {
    if (!getCloudSdk()) return;
    try {
      const cloudData = await getCloudSdk().saves.load();
      if (!cloudData) {
        this._cloudSave();
        return;
      }

      const localUpdatedAt = this.data.updatedAt || 0;
      const cloudUpdatedAt = cloudData.updatedAt || 0;

      if (cloudUpdatedAt > localUpdatedAt) {
        this.data = { ...DEFAULT_SAVE, ...cloudData };
        localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
        showCloudToast('\u2601\uFE0F \uD074\uB77C\uC6B0\uB4DC\uC5D0\uC11C \uBCF5\uC6D0\uB428');
      } else {
        this._cloudSave();
      }
    } catch { /* cloud sync failed */ }
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
