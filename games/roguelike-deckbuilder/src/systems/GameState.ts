import { CardInstance, createCardInstance, getCardById } from '../data/cards';
import { CharacterData } from '../data/characters';
import { RelicData } from '../data/relics';
import { SeededRandom } from '../utils/SeededRandom';

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
  }

  clearSave(): void {
    localStorage.removeItem('card_tower_save');
  }

  hasSave(): boolean {
    return localStorage.getItem('card_tower_save') !== null;
  }
}

export const gameState = GameStateManager.getInstance();
