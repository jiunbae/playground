import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, GAME_HEIGHT } from '../utils/constants';
import { UIHelper } from '../ui/UIHelper';
import { gameState } from '../systems/GameState';
import { saveToRDLeaderboard } from './MainMenuScene';

export class RunResultScene extends Phaser.Scene {
  private victory = false;

  constructor() {
    super({ key: 'RunResult' });
  }

  init(data: { victory: boolean }): void {
    this.victory = data.victory;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.BG_PRIMARY);
    const run = gameState.run;

    // Big result text
    if (this.victory) {
      this.add.text(GAME_WIDTH / 2, 120, '🎉', {
        fontSize: '80px',
      }).setOrigin(0.5);

      this.add.text(GAME_WIDTH / 2, 220, '승리!', {
        fontSize: '48px', fontFamily: 'sans-serif', color: '#FFD700', fontStyle: 'bold',
      }).setOrigin(0.5);

      this.add.text(GAME_WIDTH / 2, 280, '탑의 지배자를 쓰러뜨렸습니다!', {
        fontSize: '18px', fontFamily: 'sans-serif', color: COLORS.TEXT_HEX,
      }).setOrigin(0.5);
    } else {
      this.add.text(GAME_WIDTH / 2, 120, '💀', {
        fontSize: '80px',
      }).setOrigin(0.5);

      this.add.text(GAME_WIDTH / 2, 220, '패배...', {
        fontSize: '48px', fontFamily: 'sans-serif', color: '#FF4444', fontStyle: 'bold',
      }).setOrigin(0.5);

      this.add.text(GAME_WIDTH / 2, 280, '탑에서 쓰러졌습니다...', {
        fontSize: '18px', fontFamily: 'sans-serif', color: COLORS.TEXT_HEX,
      }).setOrigin(0.5);
    }

    // Run statistics
    if (run) {
      let yPos = 360;
      const stats = [
        { label: '캐릭터', value: `${run.character.name} (${run.character.title})` },
        { label: '도달 층', value: `Act ${run.currentAct} - Floor ${run.currentFloor}` },
        { label: '턴 수', value: `${run.turnsPlayed}` },
        { label: '총 데미지', value: `${run.totalDamageDealt}` },
        { label: '받은 데미지', value: `${run.totalDamageTaken}` },
        { label: '최고 단일 데미지', value: `${run.maxSingleDamage}` },
        { label: '최종 덱 크기', value: `${run.deck.length}장` },
        { label: '유물', value: `${run.relics.length}개` },
        { label: '획득 골드', value: `${run.gold}` },
      ];

      UIHelper.createPanel(this, GAME_WIDTH / 2, yPos + (stats.length * 30) / 2 - 15, 420, stats.length * 30 + 30);

      for (const stat of stats) {
        this.add.text(GAME_WIDTH / 2 - 170, yPos, stat.label, {
          fontSize: '15px', fontFamily: 'sans-serif', color: '#AAAAAA',
        }).setOrigin(0, 0.5);

        this.add.text(GAME_WIDTH / 2 + 170, yPos, stat.value, {
          fontSize: '15px', fontFamily: 'sans-serif', color: COLORS.TEXT_HEX, fontStyle: 'bold',
        }).setOrigin(1, 0.5);

        yPos += 30;
      }

      // Score calculation
      let score = 0;
      score += run.totalDamageDealt;
      score += run.currentFloor * 50;
      score += run.currentAct * 200;
      if (this.victory) score += 1000;
      score += run.relics.length * 50;
      score += run.deck.length * 5;

      yPos += 20;
      this.add.text(GAME_WIDTH / 2, yPos, `최종 점수: ${score}`, {
        fontSize: '28px', fontFamily: 'sans-serif', color: COLORS.ACCENT_HEX, fontStyle: 'bold',
      }).setOrigin(0.5);
    }

    // Save to local leaderboard
    if (run) {
      let userName = '나';
      try { const sdk = (window as any).__sdk; if (sdk) { const u = sdk.auth.getUser(); if (u) userName = u.name; } } catch {}
      saveToRDLeaderboard({
        name: userName,
        score,
        character: run.character.id,
        floorsCleared: run.currentFloor,
        timestamp: Date.now(),
      });
    }

    // Submit score to SDK
    if (run) {
      try {
        const sdk = (window as any).__sdk;
        sdk?.scores.submit({
          score,
          meta: {
            character: run.character.id,
            floorsCleared: run.currentFloor,
            victory: this.victory,
            totalDamage: run.totalDamageDealt,
            turnsPlayed: run.turnsPlayed,
          },
        }).catch(() => {});
      } catch (_) {}
    }

    // End run
    gameState.endRun(this.victory);
    gameState.clearSave();

    // Buttons
    UIHelper.createButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 140, 280, 55,
      '🔄 새 런 시작', () => {
        this.scene.start('CharacterSelect');
      }, COLORS.BUTTON, 22);

    UIHelper.createButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 70, 200, 40,
      '메인 메뉴', () => {
        this.scene.start('MainMenu');
      }, COLORS.DARK_GRAY, 16);

    UIHelper.fadeIn(this);
  }
}
