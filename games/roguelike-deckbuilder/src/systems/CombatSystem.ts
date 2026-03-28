import { CardInstance, getCardEffects, CardEffect } from '../data/cards';
import { EnemyData, EnemyIntent } from '../data/enemies';
import { gameState } from './GameState';
import { SynergySystem } from './SynergySystem';
import { BASE_ENERGY, CARDS_PER_DRAW, MAX_HAND_SIZE } from '../utils/constants';

export interface CombatEntity {
  hp: number;
  maxHp: number;
  block: number;
  // Buffs
  strength: number;
  thorns: number;
  regen: number;
  // Debuffs
  burn: number;
  freeze: number;
  shock: number;
  poison: number;
  weakness: number;
  vulnerable: number;
}

export interface EnemyCombatState extends CombatEntity {
  data: EnemyData;
  nextIntent: EnemyIntent | null;
}

export interface PlayerCombatState extends CombatEntity {
  energy: number;
  maxEnergy: number;
  hand: CardInstance[];
  drawPile: CardInstance[];
  discardPile: CardInstance[];
  exhaustPile: CardInstance[];
}

export type CombatPhase = 'player_turn' | 'enemy_turn' | 'victory' | 'defeat';

export interface CombatResult {
  phase: CombatPhase;
  damageDealt: number;
  damageBlocked: number;
  healingDone: number;
  cardsDrawn: number;
}

export class CombatSystem {
  player!: PlayerCombatState;
  enemies: EnemyCombatState[] = [];
  turn = 0;
  phase: CombatPhase = 'player_turn';
  synergySystem: SynergySystem;
  combatLog: string[] = [];

  constructor() {
    this.synergySystem = new SynergySystem();
  }

  initCombat(enemyDataList: EnemyData[]): void {
    const run = gameState.run!;
    const deck = [...run.deck];

    // Shuffle deck
    for (let i = deck.length - 1; i > 0; i--) {
      const j = run.rng.nextInt(0, i);
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    this.player = {
      hp: run.hp,
      maxHp: run.maxHp,
      block: 0,
      strength: 0,
      thorns: 0,
      regen: 0,
      burn: 0,
      freeze: 0,
      shock: 0,
      poison: 0,
      weakness: 0,
      vulnerable: 0,
      energy: BASE_ENERGY,
      maxEnergy: BASE_ENERGY,
      hand: [],
      drawPile: deck,
      discardPile: [],
      exhaustPile: [],
    };

    // Apply relic effects at combat start
    for (const relic of run.relics) {
      switch (relic.effect.type) {
        case 'start_combat_block':
          this.player.block += relic.effect.value;
          break;
        case 'start_combat_draw':
          // Will draw extra cards
          break;
        case 'start_combat_strength':
          this.player.strength += relic.effect.value;
          break;
        case 'energy_per_turn':
          this.player.maxEnergy += relic.effect.value;
          break;
      }
    }

    this.enemies = enemyDataList.map(data => ({
      hp: data.hp,
      maxHp: data.hp,
      block: 0,
      strength: 0,
      thorns: 0,
      regen: 0,
      burn: 0,
      freeze: 0,
      shock: 0,
      poison: 0,
      weakness: 0,
      vulnerable: 0,
      data,
      nextIntent: null,
    }));

    // Calculate synergies
    this.synergySystem.calculateActiveSynergies(run.deck);

    // Apply synergy start-of-combat effects
    const synergies = this.synergySystem.getActiveSynergies();
    for (const s of synergies) {
      if (s.effect.type === 'energy_start') {
        this.player.maxEnergy += s.effect.value;
      }
    }

    this.turn = 0;
    this.phase = 'player_turn';
    this.combatLog = [];

    // Roll enemy intents
    this.rollEnemyIntents();

    // Start first turn
    this.startPlayerTurn();
  }

  private rollEnemyIntents(): void {
    const rng = gameState.run!.rng;
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;
      const hpPercent = enemy.hp / enemy.maxHp;
      // Find current phase
      let currentPhase = enemy.data.phases[0];
      for (const phase of enemy.data.phases) {
        if (hpPercent <= phase.hpThreshold) {
          currentPhase = phase;
        }
      }
      const actions = currentPhase.actions;
      const weights = actions.map(a => a.weight);
      const items = actions.map(a => a.intent);
      enemy.nextIntent = rng.weightedPick(items, weights);
    }
  }

  startPlayerTurn(): void {
    this.turn++;
    this.phase = 'player_turn';
    this.player.block = 0;
    this.player.energy = this.player.maxEnergy;

    // Apply synergy bonuses
    const synergies = this.synergySystem.getActiveSynergies();
    for (const s of synergies) {
      if (s.effect.type === 'block_bonus') {
        this.player.block += s.effect.value;
      }
      if (s.effect.type === 'heal_per_turn') {
        this.healEntity(this.player, s.effect.value);
      }
    }

    // Apply regen
    if (this.player.regen > 0) {
      this.healEntity(this.player, this.player.regen);
    }

    // Draw cards
    let drawCount = CARDS_PER_DRAW;
    for (const s of synergies) {
      if (s.effect.type === 'draw_bonus') drawCount += s.effect.value;
    }
    for (const relic of gameState.run!.relics) {
      if (relic.effect.type === 'start_combat_draw' && this.turn === 1) {
        drawCount += relic.effect.value;
      }
    }
    this.drawCards(drawCount);

    // Character passive: 프로스트 - 매 턴 방어도 2
    if (gameState.run!.character.id === 'ice_knight') {
      this.player.block += 2;
    }

    gameState.run!.turnsPlayed++;
  }

  drawCards(count: number): CardInstance[] {
    const drawn: CardInstance[] = [];
    for (let i = 0; i < count; i++) {
      if (this.player.hand.length >= MAX_HAND_SIZE) break;
      if (this.player.drawPile.length === 0) {
        if (this.player.discardPile.length === 0) break;
        // Shuffle discard into draw
        this.player.drawPile = [...this.player.discardPile];
        this.player.discardPile = [];
        const rng = gameState.run!.rng;
        for (let j = this.player.drawPile.length - 1; j > 0; j--) {
          const k = rng.nextInt(0, j);
          [this.player.drawPile[j], this.player.drawPile[k]] = [this.player.drawPile[k], this.player.drawPile[j]];
        }
      }
      const card = this.player.drawPile.pop()!;
      this.player.hand.push(card);
      drawn.push(card);

      // Lightning character passive
      if (gameState.run!.character.id === 'storm_caller') {
        if (gameState.run!.rng.next() < 0.1) {
          this.player.energy++;
        }
      }
    }
    return drawn;
  }

  canPlayCard(card: CardInstance): boolean {
    if (this.phase !== 'player_turn') return false;
    const cost = card.data.energyCost;
    return this.player.energy >= cost;
  }

  playCard(card: CardInstance, targetIndex = 0): CombatResult {
    const result: CombatResult = {
      phase: this.phase,
      damageDealt: 0,
      damageBlocked: 0,
      healingDone: 0,
      cardsDrawn: 0,
    };

    if (!this.canPlayCard(card)) return result;

    this.player.energy -= card.data.energyCost;

    // Remove from hand
    this.player.hand = this.player.hand.filter(c => c.instanceId !== card.instanceId);

    const effects = getCardEffects(card);
    const synergies = this.synergySystem.getActiveSynergies();

    for (const effect of effects) {
      this.applyCardEffect(effect, card, targetIndex, synergies, result);
    }

    // Fire mage passive: 화염 카드 사용 시 화상 +1
    if (gameState.run!.character.id === 'fire_mage' && card.data.element === 'fire') {
      const target = this.enemies[targetIndex];
      if (target && target.hp > 0) {
        target.burn += 1;
      }
    }

    // Discard played card
    this.player.discardPile.push(card);

    // Check victory
    if (this.enemies.every(e => e.hp <= 0)) {
      this.phase = 'victory';
      result.phase = 'victory';
    }

    return result;
  }

  private applyCardEffect(
    effect: CardEffect,
    card: CardInstance,
    targetIndex: number,
    synergies: ReturnType<SynergySystem['getActiveSynergies']>,
    result: CombatResult
  ): void {
    const target = this.enemies[targetIndex];

    switch (effect.type) {
      case 'damage': {
        let dmg = effect.value + this.player.strength;
        // Relic bonus
        for (const relic of gameState.run!.relics) {
          if (relic.effect.type === 'damage_bonus' && card.data.role === 'attack') {
            dmg += relic.effect.value;
          }
        }
        // Synergy damage bonus
        for (const s of synergies) {
          if (s.effect.type === 'damage_bonus') dmg += s.effect.value;
        }
        // Weakness debuff on player
        if (this.player.weakness > 0) dmg = Math.floor(dmg * 0.75);

        const targets = effect.target === 'all_enemies'
          ? this.enemies.filter(e => e.hp > 0)
          : (target && target.hp > 0 ? [target] : []);

        for (const t of targets) {
          // Vulnerable on target
          let finalDmg = dmg;
          if (t.vulnerable > 0) finalDmg = Math.floor(finalDmg * 1.5);
          const actualDmg = this.dealDamage(t, finalDmg);
          result.damageDealt += actualDmg;

          // Thorns counter-damage
          if (t.thorns > 0) {
            this.dealDamageToPlayer(t.thorns);
          }
        }
        break;
      }
      case 'block': {
        this.player.block += effect.value;
        result.damageBlocked += effect.value;
        break;
      }
      case 'heal': {
        this.healEntity(this.player, effect.value);
        result.healingDone += effect.value;
        break;
      }
      case 'draw': {
        const drawn = this.drawCards(effect.value);
        result.cardsDrawn += drawn.length;
        break;
      }
      case 'energy': {
        this.player.energy += effect.value;
        break;
      }
      case 'burn': {
        if (target && target.hp > 0) {
          let burnVal = effect.value;
          for (const s of synergies) {
            if (s.effect.type === 'dot_bonus') burnVal += s.effect.value;
          }
          target.burn += burnVal;
        }
        break;
      }
      case 'freeze': {
        if (target && target.hp > 0) target.freeze += effect.value;
        break;
      }
      case 'shock': {
        if (target && target.hp > 0) target.shock += effect.value;
        break;
      }
      case 'poison': {
        if (target && target.hp > 0) {
          let poisonVal = effect.value;
          for (const s of synergies) {
            if (s.effect.type === 'dot_bonus') poisonVal += s.effect.value;
          }
          target.poison += poisonVal;
        }
        break;
      }
      case 'strength': {
        this.player.strength += effect.value;
        break;
      }
      case 'weakness': {
        if (target && target.hp > 0) target.weakness += effect.value;
        break;
      }
      case 'vulnerable': {
        if (target && target.hp > 0) target.vulnerable += effect.value;
        break;
      }
      case 'thorns': {
        this.player.thorns += effect.value;
        break;
      }
      case 'regen': {
        this.player.regen += effect.value;
        break;
      }
      case 'lifesteal': {
        if (target && target.hp > 0) {
          let lsVal = effect.value;
          for (const s of synergies) {
            if (s.effect.type === 'lifesteal_bonus') lsVal += s.effect.value;
          }
          const actualDmg = this.dealDamage(target, lsVal);
          this.healEntity(this.player, actualDmg);
          result.damageDealt += actualDmg;
          result.healingDone += actualDmg;
        }
        break;
      }
    }
  }

  private dealDamage(entity: CombatEntity, amount: number): number {
    let remaining = amount;
    if (entity.block > 0) {
      const blocked = Math.min(entity.block, remaining);
      entity.block -= blocked;
      remaining -= blocked;
    }
    entity.hp = Math.max(0, entity.hp - remaining);

    // Track stats
    if (gameState.run) {
      gameState.run.totalDamageDealt += remaining;
      if (remaining > gameState.run.maxSingleDamage) {
        gameState.run.maxSingleDamage = remaining;
      }
    }

    return remaining;
  }

  private dealDamageToPlayer(amount: number): void {
    let remaining = amount;
    if (this.player.block > 0) {
      const blocked = Math.min(this.player.block, remaining);
      this.player.block -= blocked;
      remaining -= blocked;
    }
    this.player.hp = Math.max(0, this.player.hp - remaining);
    if (gameState.run) {
      gameState.run.totalDamageTaken += remaining;
    }
  }

  private healEntity(entity: CombatEntity, amount: number): void {
    entity.hp = Math.min(entity.hp + amount, entity.maxHp);
  }

  endPlayerTurn(): void {
    // Discard hand
    this.player.discardPile.push(...this.player.hand);
    this.player.hand = [];

    // Tick player debuffs
    if (this.player.burn > 0) {
      this.dealDamageToPlayer(this.player.burn);
      this.player.burn = Math.max(0, this.player.burn - 1);
    }
    if (this.player.poison > 0) {
      this.dealDamageToPlayer(this.player.poison);
      this.player.poison = Math.max(0, this.player.poison - 1);
    }

    if (this.player.hp <= 0) {
      this.phase = 'defeat';
      return;
    }

    // Enemy turn
    this.phase = 'enemy_turn';
    this.executeEnemyTurn();
  }

  executeEnemyTurn(): void {
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0 || !enemy.nextIntent) continue;

      // Reset enemy block
      enemy.block = 0;

      // Apply DoTs on enemy
      if (enemy.burn > 0) {
        enemy.hp = Math.max(0, enemy.hp - enemy.burn);
        enemy.burn = Math.max(0, enemy.burn - 1);
        if (gameState.run) gameState.run.totalDamageDealt += enemy.burn;
      }
      if (enemy.poison > 0) {
        enemy.hp = Math.max(0, enemy.hp - enemy.poison);
        enemy.poison = Math.max(0, enemy.poison - 1);
        if (gameState.run) gameState.run.totalDamageDealt += enemy.poison;
      }
      if (enemy.shock > 0) {
        enemy.hp = Math.max(0, enemy.hp - enemy.shock);
        enemy.shock = Math.max(0, enemy.shock - 1);
      }

      if (enemy.hp <= 0) continue;

      // Freeze: skip turn
      if (enemy.freeze > 0) {
        enemy.freeze--;
        continue;
      }

      const intent = enemy.nextIntent;

      switch (intent.type) {
        case 'attack': {
          let dmg = intent.value + enemy.strength;
          if (enemy.weakness > 0) dmg = Math.floor(dmg * 0.75);
          if (this.player.vulnerable > 0) dmg = Math.floor(dmg * 1.5);
          this.dealDamageToPlayer(dmg);
          // Player thorns
          if (this.player.thorns > 0) {
            enemy.hp = Math.max(0, enemy.hp - this.player.thorns);
          }
          break;
        }
        case 'defend':
          enemy.block += intent.value;
          break;
        case 'buff':
          enemy.strength += intent.value;
          break;
        case 'debuff':
          this.player.weakness += intent.value;
          break;
        case 'special':
          // Special attacks deal heavy damage
          this.dealDamageToPlayer(intent.value);
          break;
      }

      // Tick enemy debuffs
      if (enemy.weakness > 0) enemy.weakness--;
      if (enemy.vulnerable > 0) enemy.vulnerable--;
    }

    // Tick player debuffs
    if (this.player.weakness > 0) this.player.weakness--;
    if (this.player.vulnerable > 0) this.player.vulnerable--;

    // Check outcomes
    if (this.player.hp <= 0) {
      this.phase = 'defeat';
      return;
    }
    if (this.enemies.every(e => e.hp <= 0)) {
      this.phase = 'victory';
      return;
    }

    // Roll new intents
    this.rollEnemyIntents();

    // Start next player turn
    this.startPlayerTurn();
  }

  endCombat(): { goldReward: number } {
    let goldReward = 0;
    for (const enemy of this.enemies) {
      const [min, max] = enemy.data.goldReward;
      goldReward += gameState.run!.rng.nextInt(min, max);
    }

    // Sync HP back to run state
    if (gameState.run) {
      gameState.run.hp = this.player.hp;

      // Heal on combat end relic
      for (const relic of gameState.run.relics) {
        if (relic.effect.type === 'heal_on_combat_end') {
          gameState.healPlayer(relic.effect.value);
        }
      }
    }

    gameState.addGold(goldReward);
    return { goldReward };
  }
}
