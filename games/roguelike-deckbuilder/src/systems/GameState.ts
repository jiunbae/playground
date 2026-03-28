import { CardInstance, createCardInstance, getCardById } from '../data/cards';
import { CharacterData } from '../data/characters';
import { RelicData } from '../data/relics';
import { SeededRandom } from '../utils/SeededRandom';
// --- Cloud Save ---
function getCloudSdk(): any {
  return (window as any).__sdk || null;
}

const CLOUD_SAVE_SLOTS = ['card_tower_cloud_slot_0', 'card_tower_cloud_slot_1', 'card_tower_cloud_slot_2'];

function showCloudToast(msg: string): void {
  const existing = document.getElementById('cloud-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'cloud-toast';
  toast.textContent = msg;
  toast.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:#fff;padding:8px 16px;border-radius:20px;font-size:13px;z-index:9999;transition:opacity 0.3s;';
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 2000);
}

export interface RunState {
  seed: number;
  rng: SeededRandom;
  character: CharacterData;
  hp: number;
  maxHp: number;
  gold: number;
  deck: CardInstance[];
  relics: RelicData[];
  potions: string[];
  currentAct: number;
  currentFloor: number;
  score: number;
  turnsPlayed: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  maxSingleDamage: number;
}

class GameStateManager {
  private static instance: GameStateManager;
  public run: RunState | null = null;
  public totalRuns = 0;
  public totalClears = 0;

  static getInstance(): GameStateManager {
    if (!GameStateManager.instance) {
      GameStateManager.instance = new GameStateManager();
    }
    return GameStateManager.instance;
  }

  startRun(character: CharacterData, seed?: number): RunState {
    const actualSeed = seed ?? Math.floor(Math.random() * 2147483647);
    const rng = new SeededRandom(actualSeed);

    const deck: CardInstance[] = [];
    for (const cardId of character.startingDeckIds) {
      const cardData = getCardById(cardId);
      if (cardData) {
        deck.push(createCardInstance(cardData));
      }
    }

    this.run = {
      seed: actualSeed,
      rng,
      character,
      hp: character.hp,
      maxHp: character.hp,
      gold: 99,
      deck,
      relics: [],
      potions: [],
      currentAct: 1,
      currentFloor: 0,
      score: 0,
      turnsPlayed: 0,
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      maxSingleDamage: 0,
    };

    this.totalRuns++;
    return this.run;
  }

  endRun(victory: boolean): void {
    if (victory) this.totalClears++;
    this.run = null;
  }

  healPlayer(amount: number): void {
    if (!this.run) return;
    this.run.hp = Math.min(this.run.hp + amount, this.run.maxHp);
  }

  damagePlayer(amount: number): void {
    if (!this.run) return;
    this.run.hp = Math.max(0, this.run.hp - amount);
    this.run.totalDamageTaken += amount;
  }

  addGold(amount: number): void {
    if (!this.run) return;
    const bonus = this.run.relics.find(r => r.id === 'gold_ring');
    const multiplier = bonus ? 1 + bonus.effect.value / 100 : 1;
    this.run.gold += Math.floor(amount * multiplier);
  }

  addCardToDeck(card: CardInstance): void {
    if (!this.run) return;
    this.run.deck.push(card);
  }

  removeCardFromDeck(instanceId: number): void {
    if (!this.run) return;
    this.run.deck = this.run.deck.filter(c => c.instanceId !== instanceId);
  }

  addRelic(relic: RelicData): void {
    if (!this.run) return;
    this.run.relics.push(relic);
    if (relic.effect.type === 'max_hp') {
      this.run.maxHp += relic.effect.value;
      this.run.hp += relic.effect.value;
    }
  }

  saveToLocalStorage(): void {
    if (!this.run) return;
    const saveData = {
      seed: this.run.seed,
      characterId: this.run.character.id,
      hp: this.run.hp,
      maxHp: this.run.maxHp,
      gold: this.run.gold,
      deck: this.run.deck.map(c => ({ id: c.data.id, upgraded: c.upgraded })),
      relics: this.run.relics.map(r => r.id),
      currentAct: this.run.currentAct,
      currentFloor: this.run.currentFloor,
      score: this.run.score,
      turnsPlayed: this.run.turnsPlayed,
      totalDamageDealt: this.run.totalDamageDealt,
      totalDamageTaken: this.run.totalDamageTaken,
      maxSingleDamage: this.run.maxSingleDamage,
    };
    localStorage.setItem('card_tower_save', JSON.stringify(saveData));

    // Also save to cloud (fire-and-forget), pass flag to avoid recursion
    this._cloudSaveOnly(0).catch(() => {});
  }

  clearSave(): void {
    localStorage.removeItem('card_tower_save');
  }

  hasSave(): boolean {
    return localStorage.getItem('card_tower_save') !== null;
  }

  // --- Cloud Save Integration ---
  private async _cloudSaveOnly(slot: number = 0): Promise<void> {
    if (!getCloudSdk() || slot < 0 || slot > 2) return;
    try {
      const localRaw = localStorage.getItem('card_tower_save');
      if (!localRaw) return;

      const slotKey = CLOUD_SAVE_SLOTS[slot];
      await getCloudSdk().saves.save({
        slot,
        slotKey,
        data: JSON.parse(localRaw),
        updatedAt: Date.now(),
      });
      showCloudToast('\u2601\uFE0F \uC800\uC7A5\uB428');
    } catch { /* cloud save failed, continue offline */ }
  }

  async loadFromCloud(slot: number = 0): Promise<boolean> {
    if (!getCloudSdk() || slot < 0 || slot > 2) return false;
    try {
      const cloudData = await getCloudSdk().saves.load<{
        slot: number; slotKey: string; data: any; updatedAt: number;
      }>();
      if (!cloudData || !cloudData.data) return false;

      // Compare with local: use newer
      const localRaw = localStorage.getItem('card_tower_save');
      if (localRaw) {
        const localData = JSON.parse(localRaw);
        // If local has higher floor, keep local
        if (localData.currentFloor > (cloudData.data.currentFloor || 0)) {
          return false;
        }
      }

      localStorage.setItem('card_tower_save', JSON.stringify(cloudData.data));
      showCloudToast('\u2601\uFE0F \uD074\uB77C\uC6B0\uB4DC\uC5D0\uC11C \uBCF5\uC6D0\uB428');
      return true;
    } catch {
      return false;
    }
  }

  async syncOnLogin(): Promise<void> {
    if (!getCloudSdk()) return;
    try {
      await this.loadFromCloud(0);
    } catch { /* sync failed */ }
  }
}

export const gameState = GameStateManager.getInstance();
