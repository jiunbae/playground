import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, GAME_HEIGHT, ELEMENT_ICONS } from '../utils/constants';
import { UIHelper } from '../ui/UIHelper';
import { CardRenderer, CARD_WIDTH, CARD_HEIGHT } from '../ui/CardRenderer';
import { CombatSystem, EnemyCombatState } from '../systems/CombatSystem';
import { EnemyData } from '../data/enemies';
import { CardInstance, getCardEffects, getCardName } from '../data/cards';
import { gameState } from '../systems/GameState';
import { DungeonMap, MapGenerator } from '../systems/MapGenerator';

export class BattleScene extends Phaser.Scene {
  private combat!: CombatSystem;
  private enemies: EnemyData[] = [];
  private map!: DungeonMap;
  private isBoss = false;
  private isElite = false;

  // UI elements
  private handCards: Phaser.GameObjects.Container[] = [];
  private enemyContainers: Phaser.GameObjects.Container[] = [];
  private energyText!: Phaser.GameObjects.Text;
  private hpBar!: Phaser.GameObjects.Container;
  private blockText!: Phaser.GameObjects.Text;
  private deckText!: Phaser.GameObjects.Text;
  private discardText!: Phaser.GameObjects.Text;
  private turnText!: Phaser.GameObjects.Text;
  private selectedCardIndex = -1;
  private isAnimating = false;
  private synergyText!: Phaser.GameObjects.Text;
  private tooltipContainer?: Phaser.GameObjects.Container;
  private endTurnContainer!: Phaser.GameObjects.Container;
  private endTurnBg!: Phaser.GameObjects.Rectangle;
  private endTurnPulseTween?: Phaser.Tweens.Tween;
  private energyContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'Battle' });
  }

  init(data: { enemies: EnemyData[]; map: DungeonMap; isBoss?: boolean; isElite?: boolean }): void {
    this.enemies = data.enemies;
    this.map = data.map;
    this.isBoss = data.isBoss || false;
    this.isElite = data.isElite || false;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.BG_BATTLE);
    this.handCards = [];
    this.enemyContainers = [];
    this.selectedCardIndex = -1;
    this.isAnimating = false;

    // Initialize combat
    this.combat = new CombatSystem();
    this.combat.initCombat(this.enemies);

    // Draw UI
    this.createBattleUI();
    this.renderEnemies();
    this.renderHand();
    this.updateUI();

    UIHelper.fadeIn(this);
  }

  private createBattleUI(): void {
    // Top: enemy area
    // Middle: battle field
    // Bottom: player hand + controls

    // Battle title
    const titleText = this.isBoss ? '⚠️ 보스 전투' : this.isElite ? '💀 엘리트 전투' : '⚔️ 전투';
    this.add.text(GAME_WIDTH / 2, 20, titleText, {
      fontSize: '16px', fontFamily: 'sans-serif',
      color: this.isBoss ? '#FF4444' : this.isElite ? '#FF8800' : COLORS.TEXT_HEX,
    }).setOrigin(0.5).setDepth(5);

    // Turn indicator
    this.turnText = this.add.text(GAME_WIDTH - 20, 20, '', {
      fontSize: '14px', fontFamily: 'sans-serif', color: '#888888',
    }).setOrigin(1, 0.5).setDepth(5);

    // Player area (bottom)
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 150, GAME_WIDTH, 300, 0x111122, 0.4);

    // Energy display
    this.energyText = this.add.text(40, GAME_HEIGHT - 290, '', {
      fontSize: '24px', fontFamily: 'sans-serif', color: COLORS.ENERGY_HEX, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(5);

    // HP bar
    this.hpBar = this.add.container(0, 0);

    // Block display
    this.blockText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 310, '', {
      fontSize: '16px', fontFamily: 'sans-serif', color: '#4488CC',
    }).setOrigin(0.5).setDepth(5);

    // Deck/Discard counts
    this.deckText = this.add.text(30, GAME_HEIGHT - 30, '', {
      fontSize: '14px', fontFamily: 'sans-serif', color: '#888888',
    }).setOrigin(0, 0.5).setDepth(5);

    this.discardText = this.add.text(GAME_WIDTH - 30, GAME_HEIGHT - 30, '', {
      fontSize: '14px', fontFamily: 'sans-serif', color: '#888888',
    }).setOrigin(1, 0.5).setDepth(5);

    // End turn button (prominent)
    this.endTurnContainer = UIHelper.createButton(this, GAME_WIDTH - 80, GAME_HEIGHT - 290, 140, 55,
      '⏭️ 턴 종료', () => this.endTurn(), 0x664488, 20);
    this.endTurnContainer.setDepth(5);
    this.endTurnBg = this.endTurnContainer.list[0] as Phaser.GameObjects.Rectangle;
    this.endTurnBg.setStrokeStyle(3, COLORS.ACCENT);

    // Synergy display
    this.synergyText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 340, '', {
      fontSize: '12px', fontFamily: 'sans-serif', color: COLORS.ACCENT_HEX,
    }).setOrigin(0.5).setDepth(5);

    // Show active synergies
    const synergies = this.combat.synergySystem.getActiveSynergies();
    if (synergies.length > 0) {
      const names = synergies.map(s => s.name).join(', ');
      this.synergyText.setText(`✨ 시너지: ${names}`);
    }
  }

  private renderEnemies(): void {
    // Clear old
    this.enemyContainers.forEach(c => c.destroy());
    this.enemyContainers = [];

    const spacing = Math.min(240, GAME_WIDTH / this.combat.enemies.length);
    const startX = GAME_WIDTH / 2 - (this.combat.enemies.length - 1) * spacing / 2;

    this.combat.enemies.forEach((enemy, i) => {
      if (enemy.hp <= 0) return;
      const x = startX + i * spacing;
      const y = 200;
      const container = this.createEnemyVisual(enemy, x, y, i);
      this.enemyContainers.push(container);
    });
  }

  private createEnemyVisual(enemy: EnemyCombatState, x: number, y: number, index: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Enemy body - procedural shapes based on enemy type
    const bodyColor = enemy.data.isBoss ? 0x882222 : enemy.data.isElite ? 0x886622 : 0x444455;
    const bodySize = enemy.data.isBoss ? 110 : 100;
    const body = this.add.rectangle(0, 0, bodySize, bodySize, bodyColor, 0.8);
    body.setStrokeStyle(2, enemy.data.isBoss ? 0xFF4444 : COLORS.CARD_BORDER);
    body.setInteractive({ useHandCursor: true });

    // Draw procedural enemy visual instead of emoji
    const enemyGfx = this.add.graphics();
    const enemyId = enemy.data.id;

    if (enemyId === 'slime' || enemyId === 'fire_golem') {
      // Slime/blob shape with eyes
      const blobColor = enemyId === 'fire_golem' ? 0xCC4411 : 0x66BB66;
      enemyGfx.fillStyle(blobColor, 0.85);
      // Blob body (rounded shape using overlapping circles)
      enemyGfx.fillCircle(0, 5, 28);
      enemyGfx.fillCircle(-12, -5, 20);
      enemyGfx.fillCircle(12, -5, 20);
      enemyGfx.fillCircle(0, -12, 18);
      // Shiny spot
      enemyGfx.fillStyle(0xffffff, 0.25);
      enemyGfx.fillCircle(-8, -15, 8);
      enemyGfx.fillCircle(-5, -18, 4);
      // Eyes
      enemyGfx.fillStyle(0xffffff, 0.9);
      enemyGfx.fillCircle(-10, -5, 7);
      enemyGfx.fillCircle(10, -5, 7);
      enemyGfx.fillStyle(0x111111, 0.95);
      enemyGfx.fillCircle(-8, -4, 4);
      enemyGfx.fillCircle(12, -4, 4);
      // Mouth
      if (enemyId === 'fire_golem') {
        enemyGfx.fillStyle(0xFF6600, 0.8);
        enemyGfx.fillRect(-8, 10, 16, 4);
      }
    } else if (enemyId === 'skeleton') {
      // Skull outline
      enemyGfx.fillStyle(0xEEDDCC, 0.9);
      enemyGfx.fillCircle(0, -5, 24);
      enemyGfx.fillRect(-14, 10, 28, 14);
      // Eye sockets
      enemyGfx.fillStyle(0x111111, 0.95);
      enemyGfx.fillCircle(-9, -8, 8);
      enemyGfx.fillCircle(9, -8, 8);
      // Nose hole
      enemyGfx.fillTriangle(0, 2, -4, 8, 4, 8);
      // Teeth
      enemyGfx.fillStyle(0xEEDDCC, 0.9);
      for (let ti = -2; ti <= 2; ti++) {
        enemyGfx.fillRect(ti * 6 - 2, 14, 4, 7);
      }
      enemyGfx.lineStyle(1.5, 0x888877, 0.5);
      enemyGfx.strokeCircle(0, -5, 24);
    } else if (enemyId === 'goblin') {
      // Goblin face
      enemyGfx.fillStyle(0x558833, 0.9);
      enemyGfx.fillCircle(0, 0, 25);
      // Pointy ears
      enemyGfx.fillTriangle(-25, -8, -35, -22, -18, -15);
      enemyGfx.fillTriangle(25, -8, 35, -22, 18, -15);
      // Eyes
      enemyGfx.fillStyle(0xFFFF44, 0.9);
      enemyGfx.fillCircle(-9, -5, 6);
      enemyGfx.fillCircle(9, -5, 6);
      enemyGfx.fillStyle(0x111111, 0.95);
      enemyGfx.fillCircle(-8, -4, 3);
      enemyGfx.fillCircle(10, -4, 3);
      // Grin
      enemyGfx.lineStyle(2, 0x333311, 0.8);
      enemyGfx.beginPath();
      enemyGfx.arc(0, 5, 12, 0.2, Math.PI - 0.2, false);
      enemyGfx.strokePath();
    } else if (enemy.data.isBoss) {
      // Boss: large menacing figure with aura
      const bossAuraOuter = this.add.circle(0, 0, 52, bodyColor, 0.1);
      const bossAuraMid = this.add.circle(0, 0, 45, bodyColor, 0.15);
      container.add([bossAuraOuter, bossAuraMid]);
      // Pulsing boss aura
      this.tweens.add({
        targets: bossAuraOuter, scaleX: 1.2, scaleY: 1.2, alpha: 0.05,
        duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      this.tweens.add({
        targets: bossAuraMid, scaleX: 1.1, scaleY: 1.1, alpha: 0.08,
        duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 200,
      });
      // Boss face
      enemyGfx.fillStyle(0x442222, 0.9);
      enemyGfx.fillCircle(0, -5, 30);
      // Crown
      enemyGfx.fillStyle(0xFFD700, 0.9);
      enemyGfx.fillTriangle(-20, -28, -15, -40, -10, -28);
      enemyGfx.fillTriangle(-5, -30, 0, -44, 5, -30);
      enemyGfx.fillTriangle(10, -28, 15, -40, 20, -28);
      enemyGfx.fillRect(-20, -28, 40, 6);
      // Glowing eyes
      enemyGfx.fillStyle(0xFF2222, 0.9);
      enemyGfx.fillCircle(-10, -8, 6);
      enemyGfx.fillCircle(10, -8, 6);
      enemyGfx.fillStyle(0xFFFF00, 0.6);
      enemyGfx.fillCircle(-10, -8, 3);
      enemyGfx.fillCircle(10, -8, 3);
      // Mouth
      enemyGfx.lineStyle(2, 0xFF4444, 0.7);
      enemyGfx.beginPath();
      enemyGfx.arc(0, 8, 14, 0.3, Math.PI - 0.3, false);
      enemyGfx.strokePath();
    } else if (enemy.data.isElite) {
      // Elite: armored figure
      enemyGfx.fillStyle(0x886622, 0.9);
      enemyGfx.fillCircle(0, -8, 22);
      // Helmet
      enemyGfx.fillStyle(0x555555, 0.9);
      enemyGfx.fillRect(-22, -20, 44, 12);
      enemyGfx.fillTriangle(0, -35, -12, -20, 12, -20);
      // Visor slit
      enemyGfx.fillStyle(0xFF4444, 0.7);
      enemyGfx.fillRect(-14, -12, 28, 4);
      // Shoulder pads
      enemyGfx.fillStyle(0x666666, 0.8);
      enemyGfx.fillCircle(-25, 10, 10);
      enemyGfx.fillCircle(25, 10, 10);
    } else {
      // Generic enemy: shadowy figure
      enemyGfx.fillStyle(0x555577, 0.8);
      enemyGfx.fillCircle(0, -5, 22);
      // Eyes
      enemyGfx.fillStyle(0xFF8888, 0.8);
      enemyGfx.fillCircle(-8, -8, 5);
      enemyGfx.fillCircle(8, -8, 5);
      enemyGfx.fillStyle(0x111111, 0.9);
      enemyGfx.fillCircle(-7, -7, 2.5);
      enemyGfx.fillCircle(9, -7, 2.5);
    }

    // Create a placeholder for the icon position (keep for layout compat)
    const icon = this.add.text(0, -5, '', { fontSize: '1px' }).setOrigin(0.5).setAlpha(0);

    // Name
    const name = this.add.text(0, -65, enemy.data.name, {
      fontSize: '14px', fontFamily: 'sans-serif', color: COLORS.TEXT_HEX, fontStyle: 'bold',
    }).setOrigin(0.5);

    // HP bar
    const hpBg = this.add.rectangle(0, 60, 90, 12, 0x333333);
    const hpWidth = Math.max(0, (enemy.hp / enemy.maxHp) * 88);
    const hpBar = this.add.rectangle(-44 + hpWidth / 2, 60, hpWidth, 10, COLORS.HP_BAR);
    const hpText = this.add.text(0, 60, `${enemy.hp}/${enemy.maxHp}`, {
      fontSize: '10px', fontFamily: 'sans-serif', color: '#FFFFFF',
    }).setOrigin(0.5);

    // Intent (large icon + text description)
    let intentIcon = '';
    let intentDesc = '';
    let intentColor = '#FF8888';
    if (enemy.nextIntent) {
      switch (enemy.nextIntent.type) {
        case 'attack':
          intentIcon = `⚔️ ${enemy.nextIntent.value}`;
          intentDesc = `${enemy.nextIntent.value} 데미지 예정`;
          intentColor = '#FF6666';
          break;
        case 'defend':
          intentIcon = `🛡️ ${enemy.nextIntent.value}`;
          intentDesc = '방어 예정';
          intentColor = '#6688CC';
          break;
        case 'buff':
          intentIcon = '⬆️';
          intentDesc = '강화 예정';
          intentColor = '#FFAA44';
          break;
        case 'debuff':
          intentIcon = '⬇️';
          intentDesc = '약화 예정';
          intentColor = '#AA66FF';
          break;
        case 'special':
          intentIcon = `⚠️ ${enemy.nextIntent.value}`;
          intentDesc = '특수 공격 예정';
          intentColor = '#FF4444';
          break;
      }
    }
    const intentBg = this.add.rectangle(0, -90, 120, 40, 0x000000, 0.5);
    intentBg.setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(intentColor).color);
    const intent = this.add.text(0, -96, intentIcon, {
      fontSize: '22px', fontFamily: 'sans-serif', color: intentColor, fontStyle: 'bold',
    }).setOrigin(0.5);
    const intentLabel = this.add.text(0, -78, intentDesc, {
      fontSize: '10px', fontFamily: 'sans-serif', color: intentColor,
    }).setOrigin(0.5);

    // Block display
    const blockDisplay = this.add.text(55, -40, '', {
      fontSize: '14px', fontFamily: 'sans-serif', color: '#4488CC',
    }).setOrigin(0.5);
    if (enemy.block > 0) blockDisplay.setText(`🛡️${enemy.block}`);

    // Status effects
    const statusY = 80;
    const statuses: string[] = [];
    if (enemy.burn > 0) statuses.push(`🔥${enemy.burn}`);
    if (enemy.freeze > 0) statuses.push(`🧊${enemy.freeze}`);
    if (enemy.shock > 0) statuses.push(`⚡${enemy.shock}`);
    if (enemy.poison > 0) statuses.push(`☠️${enemy.poison}`);
    if (enemy.weakness > 0) statuses.push(`⬇️${enemy.weakness}`);
    if (enemy.vulnerable > 0) statuses.push(`💥${enemy.vulnerable}`);
    if (enemy.strength > 0) statuses.push(`💪${enemy.strength}`);

    const statusText = this.add.text(0, statusY, statuses.join(' '), {
      fontSize: '12px', fontFamily: 'sans-serif', color: '#CCCCCC',
    }).setOrigin(0.5);

    body.on('pointerdown', () => {
      if (this.selectedCardIndex >= 0) {
        this.playSelectedCard(index);
      }
    });

    container.add([body, enemyGfx, icon, name, hpBg, hpBar, hpText, intentBg, intent, intentLabel, blockDisplay, statusText]);
    container.setData('enemy', enemy);
    container.setData('index', index);
    container.setData('hpBar', hpBar);
    container.setData('hpText', hpText);

    return container;
  }

  private renderHand(): void {
    this.handCards.forEach(c => c.destroy());
    this.handCards = [];

    const hand = this.combat.player.hand;
    hand.forEach((card, i) => {
      const container = CardRenderer.createCard(this, card, 0, 0);
      const bg = container.getData('bg') as Phaser.GameObjects.Rectangle;

      bg.on('pointerdown', () => {
        if (this.isAnimating) return;
        if (this.selectedCardIndex === i) {
          // Deselect
          this.selectedCardIndex = -1;
          this.updateHandHighlight();
          // If attack card with single enemy, auto-play
          if (this.combat.enemies.filter(e => e.hp > 0).length === 1 && card.data.role === 'attack') {
            this.selectedCardIndex = i;
            this.playSelectedCard(this.combat.enemies.findIndex(e => e.hp > 0));
          }
        } else {
          this.selectedCardIndex = i;
          this.updateHandHighlight();

          // Auto-play non-targeted cards (skills/powers)
          if (card.data.role !== 'attack' || card.data.effects.some(e => e.target === 'all_enemies')) {
            this.playSelectedCard(0);
          } else if (this.combat.enemies.filter(e => e.hp > 0).length === 1) {
            this.playSelectedCard(this.combat.enemies.findIndex(e => e.hp > 0));
          }
        }
      });

      bg.on('pointerover', () => {
        if (this.combat.canPlayCard(card)) {
          container.setScale(1.1);
          container.y -= 15;
          container.setDepth(100);
        }
        // Show shine effect on hover
        const shine = container.getByName('shineOverlay') as Phaser.GameObjects.Graphics;
        if (shine) {
          shine.clear();
          shine.fillStyle(0xffffff, 0.06);
          shine.fillRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT);
          this.tweens.add({ targets: shine, alpha: 1, duration: 150 });
        }
        this.showCardTooltip(card, container.x, GAME_HEIGHT - 350);
      });

      bg.on('pointerout', () => {
        container.setScale(1.0);
        container.setDepth(i);
        // Hide shine effect
        const shine = container.getByName('shineOverlay') as Phaser.GameObjects.Graphics;
        if (shine) shine.setAlpha(0);
        CardRenderer.arrangeHand(this, this.handCards, GAME_WIDTH / 2, GAME_HEIGHT - 175);
        this.hideCardTooltip();
      });

      this.handCards.push(container);
    });

    CardRenderer.arrangeHand(this, this.handCards, GAME_WIDTH / 2, GAME_HEIGHT - 175);
  }

  private updateHandHighlight(): void {
    this.handCards.forEach((c, i) => {
      const card = this.combat.player.hand[i];
      if (!card) return;
      const bg = c.getData('bg') as Phaser.GameObjects.Rectangle;
      if (i === this.selectedCardIndex) {
        bg.setStrokeStyle(3, COLORS.ACCENT);
        c.y -= 20;
      } else if (this.combat.canPlayCard(card)) {
        bg.setStrokeStyle(2, COLORS.CARD_BORDER);
      } else {
        bg.setStrokeStyle(2, 0x555555);
        bg.setAlpha(0.6);
      }
    });
  }

  private playSelectedCard(targetIndex: number): void {
    if (this.selectedCardIndex < 0 || this.isAnimating) return;

    const card = this.combat.player.hand[this.selectedCardIndex];
    if (!card || !this.combat.canPlayCard(card)) {
      this.selectedCardIndex = -1;
      this.showEnergyInsufficient();
      return;
    }

    this.isAnimating = true;
    this.selectedCardIndex = -1;

    const result = this.combat.playCard(card, targetIndex);

    // Show damage numbers
    if (result.damageDealt > 0 && this.combat.enemies[targetIndex]) {
      const enemy = this.combat.enemies[targetIndex];
      const ec = this.enemyContainers.find(c => c.getData('index') === targetIndex);
      if (ec) {
        UIHelper.showDamageNumber(this, ec.x, ec.y - 60, result.damageDealt);
      }
    }

    if (result.healingDone > 0) {
      UIHelper.showHealNumber(this, GAME_WIDTH / 2, GAME_HEIGHT - 320, result.healingDone);
    }

    // Refresh UI after short delay
    this.time.delayedCall(300, () => {
      this.isAnimating = false;

      if (result.phase === 'victory') {
        this.onVictory();
        return;
      }
      if (result.phase === 'defeat') {
        this.onDefeat();
        return;
      }

      this.renderEnemies();
      this.renderHand();
      this.updateUI();
    });
  }

  private endTurn(): void {
    if (this.isAnimating || this.combat.phase !== 'player_turn') return;

    this.isAnimating = true;

    // Capture enemy intents before they act
    const intents = this.combat.enemies
      .filter(e => e.hp > 0 && e.nextIntent)
      .map((e, i) => ({ index: i, name: e.name, intent: { ...e.nextIntent! }, emoji: e.emoji }));

    // Execute enemy turn
    this.combat.endPlayerTurn();

    // Animate each enemy's action sequentially
    let delay = 200;
    for (const info of intents) {
      this.time.delayedCall(delay, () => {
        // Find enemy container
        const container = this.enemyContainers[info.index];
        if (!container || !container.active) return;

        // Flash enemy
        this.tweens.add({
          targets: container,
          scaleX: 1.15, scaleY: 1.15,
          duration: 100,
          yoyo: true,
        });

        // Show action text
        let actionText = '';
        let actionColor = '#ff6666';
        if (info.intent.type === 'attack' || info.intent.type === 'special') {
          actionText = `⚔️ ${info.intent.value} 데미지!`;
          actionColor = '#ff4444';
          // Screen shake for attacks
          this.cameras.main.shake(150, 0.005);
        } else if (info.intent.type === 'defend') {
          actionText = `🛡️ +${info.intent.value} 방어`;
          actionColor = '#66aaff';
        } else if (info.intent.type === 'buff') {
          actionText = `💪 +${info.intent.value} 강화`;
          actionColor = '#ffaa44';
        } else if (info.intent.type === 'debuff') {
          actionText = `😵 약화!`;
          actionColor = '#aa66ff';
        }

        if (actionText) {
          const text = this.add.text(container.x, container.y - 50, actionText, {
            fontSize: '16px', fontFamily: 'sans-serif', color: actionColor,
            stroke: '#000000', strokeThickness: 3,
          }).setOrigin(0.5).setDepth(50);

          this.tweens.add({
            targets: text,
            y: text.y - 40,
            alpha: 0,
            duration: 1000,
            onComplete: () => text.destroy(),
          });
        }
      });
      delay += 400;
    }

    // After all animations, update UI
    this.time.delayedCall(delay + 300, () => {
      this.isAnimating = false;

      if (this.combat.phase === 'defeat') {
        this.onDefeat();
        return;
      }
      if (this.combat.phase === 'victory') {
        this.onVictory();
        return;
      }

      this.renderEnemies();
      this.renderHand();
      this.updateUI();
    });
  }

  private updateUI(): void {
    const p = this.combat.player;

    this.energyText.setText(`⚡ ${p.energy}/${p.maxEnergy}`);
    this.turnText.setText(`턴 ${this.combat.turn}`);
    this.deckText.setText(`📚 ${p.drawPile.length}`);
    this.discardText.setText(`🗑️ ${p.discardPile.length}`);
    this.blockText.setText(p.block > 0 ? `🛡️ 방어도: ${p.block}` : '');

    // Update HP bar
    this.hpBar.removeAll(true);
    const hpBarWidth = 300;
    const hpBg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 260, hpBarWidth, 20, 0x333333);
    const hpWidth = Math.max(0, (p.hp / p.maxHp) * (hpBarWidth - 2));
    const hpFill = this.add.rectangle(
      GAME_WIDTH / 2 - (hpBarWidth - 2) / 2 + hpWidth / 2,
      GAME_HEIGHT - 260, hpWidth, 18, COLORS.HP_BAR
    );
    const hpText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 260, `❤️ ${p.hp}/${p.maxHp}`, {
      fontSize: '14px', fontFamily: 'sans-serif', color: '#FFFFFF',
    }).setOrigin(0.5);
    this.hpBar.add([hpBg, hpFill, hpText]);

    // Player status effects
    const statuses: string[] = [];
    if (p.strength > 0) statuses.push(`💪${p.strength}`);
    if (p.thorns > 0) statuses.push(`🌵${p.thorns}`);
    if (p.regen > 0) statuses.push(`💚${p.regen}`);
    if (p.burn > 0) statuses.push(`🔥${p.burn}`);
    if (p.poison > 0) statuses.push(`☠️${p.poison}`);
    if (p.weakness > 0) statuses.push(`⬇️${p.weakness}`);
    if (p.vulnerable > 0) statuses.push(`💥${p.vulnerable}`);

    // Highlight playable cards
    let anyPlayable = false;
    this.handCards.forEach((c, i) => {
      const card = this.combat.player.hand[i];
      if (!card) return;
      const bg = c.getData('bg') as Phaser.GameObjects.Rectangle;
      if (!this.combat.canPlayCard(card)) {
        bg.setAlpha(0.5);
      } else {
        bg.setAlpha(1);
        anyPlayable = true;
      }
    });

    // Pulse end turn button when no cards can be played or no energy
    if (!anyPlayable || p.energy === 0) {
      if (!this.endTurnPulseTween || !this.endTurnPulseTween.isPlaying()) {
        this.endTurnPulseTween = this.tweens.add({
          targets: this.endTurnContainer,
          scaleX: 1.08, scaleY: 1.08,
          duration: 500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    } else {
      if (this.endTurnPulseTween) {
        this.endTurnPulseTween.stop();
        this.endTurnPulseTween = undefined;
        this.endTurnContainer.setScale(1);
      }
    }
  }

  private onVictory(): void {
    const result = this.combat.endCombat();

    this.time.delayedCall(500, () => {
      if (this.isBoss) {
        this.handleBossVictory();
      } else {
        this.scene.start('CardReward', {
          map: this.map,
          goldReward: result.goldReward,
          isElite: this.isElite,
        });
      }
    });
  }

  private handleBossVictory(): void {
    const run = gameState.run!;
    if (run.currentAct >= 3) {
      // Game complete!
      this.scene.start('RunResult', { victory: true });
    } else {
      // Next act
      run.currentAct++;
      run.currentFloor = 0;
      const mapGen = new MapGenerator();
      const newMap = mapGen.generate(run.currentAct, run.rng);
      this.scene.start('DungeonMap', { map: newMap });
    }
  }

  private onDefeat(): void {
    this.time.delayedCall(500, () => {
      this.scene.start('RunResult', { victory: false });
    });
  }

  private showCardTooltip(card: CardInstance, x: number, y: number): void {
    this.hideCardTooltip();

    const effects = getCardEffects(card);
    const lines: string[] = [];

    lines.push(`${getCardName(card)} (코스트: ${card.data.energyCost})`);
    lines.push('');

    for (const effect of effects) {
      switch (effect.type) {
        case 'damage':
          lines.push(`⚔️ ${effect.value} 데미지${effect.target === 'all_enemies' ? ' (전체)' : ''}`);
          break;
        case 'block':
          lines.push(`🛡️ ${effect.value} 방어도 획득`);
          break;
        case 'heal':
          lines.push(`💚 ${effect.value} 회복`);
          break;
        case 'draw':
          lines.push(`🃏 카드 ${effect.value}장 드로우`);
          break;
        case 'energy':
          lines.push(`⚡ 에너지 ${effect.value} 획득`);
          break;
        case 'burn':
          lines.push(`🔥 화상 ${effect.value} 부여`);
          break;
        case 'freeze':
          lines.push(`🧊 빙결 ${effect.value} 부여`);
          break;
        case 'shock':
          lines.push(`⚡ 감전 ${effect.value} 부여`);
          break;
        case 'poison':
          lines.push(`☠️ 중독 ${effect.value} 부여`);
          break;
        case 'strength':
          lines.push(`💪 힘 ${effect.value} 증가`);
          break;
        case 'weakness':
          lines.push(`⬇️ 약화 ${effect.value} 부여`);
          break;
        case 'vulnerable':
          lines.push(`💥 취약 ${effect.value} 부여`);
          break;
        case 'thorns':
          lines.push(`🌵 가시 ${effect.value} 획득`);
          break;
        case 'regen':
          lines.push(`💚 재생 ${effect.value} 획득`);
          break;
        case 'lifesteal':
          lines.push(`🧛 흡혈 ${effect.value}`);
          break;
      }
    }

    const container = this.add.container(x, y).setDepth(500);

    const tooltipText = this.add.text(0, 0, lines.join('\n'), {
      fontSize: '14px', fontFamily: 'sans-serif', color: '#FFFFFF',
      lineSpacing: 4, align: 'left', padding: { x: 0, y: 0 },
    }).setOrigin(0.5);

    const bounds = tooltipText.getBounds();
    const padX = 16;
    const padY = 12;
    const bg = this.add.rectangle(0, 0, bounds.width + padX * 2, bounds.height + padY * 2, 0x111122, 0.95);
    bg.setStrokeStyle(2, COLORS.ACCENT);

    container.add([bg, tooltipText]);

    // Clamp position within screen
    const halfW = (bounds.width + padX * 2) / 2;
    if (container.x - halfW < 10) container.x = halfW + 10;
    if (container.x + halfW > GAME_WIDTH - 10) container.x = GAME_WIDTH - halfW - 10;

    this.tooltipContainer = container;
  }

  private hideCardTooltip(): void {
    if (this.tooltipContainer) {
      this.tooltipContainer.destroy();
      this.tooltipContainer = undefined;
    }
  }

  private showEnergyInsufficient(): void {
    // Flash energy text red
    const origColor = COLORS.ENERGY_HEX;
    this.energyText.setColor('#FF2222');
    this.energyText.setFontSize(28);

    // Show message
    const msg = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 360, '에너지 부족!', {
      fontSize: '22px', fontFamily: 'sans-serif', color: '#FF4444', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(500);

    this.tweens.add({
      targets: msg,
      y: GAME_HEIGHT - 400,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => msg.destroy(),
    });

    // Reset energy text after flash
    this.time.delayedCall(300, () => {
      this.energyText.setColor(origColor);
      this.energyText.setFontSize(24);
    });
  }
}
