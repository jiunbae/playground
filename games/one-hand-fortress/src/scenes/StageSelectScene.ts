import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/GameConfig';

const WORLDS = [
  { name: '잠든 숲의 정원', emoji: '🌿', color: 0xa5d6a7, stages: 10 },
  { name: '호수 마을의 새벽', emoji: '🌊', color: 0x81d4fa, stages: 10 },
  { name: '달빛 언덕의 약속', emoji: '🌙', color: 0xce93d8, stages: 10 },
  { name: '눈 내리는 항구', emoji: '❄️', color: 0xb0bec5, stages: 10 },
  { name: '구름 위의 마을', emoji: '☁️', color: 0xfff9c4, stages: 10 },
];

export class StageSelectScene extends Phaser.Scene {
  private highestCleared: number = 0;

  constructor() {
    super('StageSelectScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.BG_ASLEEP);

    // 로컬 저장소에서 진행도 로드
    const saved = localStorage.getItem('ohf_progress');
    if (saved) {
      this.highestCleared = JSON.parse(saved).highestCleared || 0;
    }

    // 타이틀
    this.add.text(GAME_WIDTH / 2, 30, '🏰 한 손의 요새', {
      fontSize: '20px', color: '#4a3c31', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 55, '한 손의 요새', {
      fontSize: '12px', color: '#8d6e63',
    }).setOrigin(0.5);

    // Help button (top-right)
    const helpBg = this.add.rectangle(GAME_WIDTH - 30, 30, 40, 30, 0x5d4037, 0.7);
    helpBg.setStrokeStyle(1, 0x8d6e63, 0.6);
    const helpIcon = this.add.text(GAME_WIDTH - 30, 30, '❓', {
      fontSize: '16px',
    }).setOrigin(0.5);
    helpBg.setInteractive();
    helpBg.on('pointerdown', () => this.showHowToPlay());

    // 스크롤 가능한 스테이지 목록
    let yOffset = 90;

    for (let w = 0; w < WORLDS.length; w++) {
      const world = WORLDS[w];
      const worldStartStage = w * 10 + 1;

      // 월드 헤더
      const headerBg = this.add.rectangle(GAME_WIDTH / 2, yOffset + 15, GAME_WIDTH - 20, 34, world.color, 0.3);
      headerBg.setStrokeStyle(1, world.color, 0.5);

      this.add.text(20, yOffset + 8, `${world.emoji} 월드 ${w + 1}`, {
        fontSize: '14px', color: '#4a3c31', fontStyle: 'bold',
      });

      this.add.text(GAME_WIDTH - 20, yOffset + 12, world.name, {
        fontSize: '11px', color: '#6d4c41',
      }).setOrigin(1, 0);

      yOffset += 40;

      // 스테이지 버튼 그리드 (5x2)
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 5; col++) {
          const stageNum = worldStartStage + row * 5 + col;
          const isUnlocked = stageNum <= this.highestCleared + 1;
          const isCleared = stageNum <= this.highestCleared;

          const bx = 30 + col * 70;
          const by = yOffset + row * 55;
          const size = 44;

          const btnColor = isCleared ? world.color : (isUnlocked ? 0xeeeeee : 0x999999);
          const btnAlpha = isUnlocked ? 0.9 : 0.4;

          const btn = this.add.rectangle(bx, by, size, size, btnColor, btnAlpha);
          btn.setStrokeStyle(isCleared ? 2 : 1, isCleared ? 0xffd700 : 0xaaaaaa);

          const numText = this.add.text(bx, by - 4, `${stageNum}`, {
            fontSize: '16px',
            color: isUnlocked ? '#4a3c31' : '#999999',
            fontStyle: isCleared ? 'bold' : 'normal',
          }).setOrigin(0.5);

          // 클리어한 스테이지에 별 표시
          if (isCleared) {
            this.add.text(bx, by + 14, '⭐', {
              fontSize: '10px',
            }).setOrigin(0.5);
          }

          if (isUnlocked) {
            btn.setInteractive();
            btn.on('pointerdown', () => {
              this.scene.start('GameScene', { stage: stageNum });
            });
          }
        }
      }

      yOffset += 120;
    }

    // 무한 스테이지 버튼
    if (this.highestCleared >= 50) {
      const infBg = this.add.rectangle(GAME_WIDTH / 2, yOffset + 20, GAME_WIDTH - 40, 50, 0x7e57c2, 0.3);
      infBg.setStrokeStyle(1, 0x7e57c2);
      infBg.setInteractive();
      infBg.on('pointerdown', () => {
        const stage = 51 + Math.floor(Math.random() * 1000);
        this.scene.start('GameScene', { stage });
      });

      this.add.text(GAME_WIDTH / 2, yOffset + 15, '♾️ 무한 스테이지', {
        fontSize: '16px', color: '#7e57c2', fontStyle: 'bold',
      }).setOrigin(0.5);

      this.add.text(GAME_WIDTH / 2, yOffset + 32, '프로시저럴 랜덤 맵 도전', {
        fontSize: '11px', color: '#9575cd',
      }).setOrigin(0.5);
    }
  }

  private showHowToPlay(): void {
    const overlay = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0)
      .setOrigin(0).setDepth(50).setInteractive();
    this.tweens.add({ targets: overlay, fillAlpha: 0.7, duration: 300 });

    const container = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(51);
    container.setAlpha(0);
    this.tweens.add({ targets: container, alpha: 1, duration: 300 });

    const panelBg = this.add.rectangle(0, 0, 320, 360, 0x1a1a2e, 0.95);
    panelBg.setStrokeStyle(2, 0xffd93d, 0.6);
    container.add(panelBg);

    const title = this.add.text(0, -150, '📖 게임 방법', {
      fontSize: '20px', color: '#ffd93d', fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(title);

    const instructions = [
      { icon: '👆', text: '빈 칸을 탭하여 타워를 배치하세요' },
      { icon: '⬆️', text: '타워 종류를 선택하고 업그레이드하세요' },
      { icon: '⚔️', text: '적이 마을에 도달하기 전에 처치하세요' },
      { icon: '💰', text: '골드를 모아 더 강한 타워를 구매하세요' },
      { icon: '🌅', text: '모든 물결을 막아 마을을 깨우세요!' },
    ];

    instructions.forEach((inst, i) => {
      const y = -95 + i * 50;
      const iconText = this.add.text(-130, y, inst.icon, {
        fontSize: '20px',
      }).setOrigin(0, 0.5);
      const descText = this.add.text(-95, y, inst.text, {
        fontSize: '13px', color: '#d7ccc8',
        wordWrap: { width: 230 },
      }).setOrigin(0, 0.5);
      container.add([iconText, descText]);
    });

    const closeBg = this.add.rectangle(0, 140, 160, 40, 0x5d4037, 0.9);
    closeBg.setStrokeStyle(1, 0x8d6e63);
    const closeText = this.add.text(0, 140, '닫기', {
      fontSize: '15px', color: '#ffffff',
    }).setOrigin(0.5);
    closeBg.setInteractive();
    closeBg.on('pointerdown', () => {
      this.tweens.add({
        targets: [container, overlay],
        alpha: 0,
        duration: 200,
        onComplete: () => {
          container.destroy();
          overlay.destroy();
        },
      });
    });
    container.add([closeBg, closeText]);
  }
}
