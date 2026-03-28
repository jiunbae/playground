import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/GameConfig';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.BG_ASLEEP);

    // 배경 파티클 (떠다니는 빛 입자)
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * GAME_WIDTH;
      const y = Math.random() * GAME_HEIGHT;
      const size = 2 + Math.random() * 4;
      const particle = this.add.circle(x, y, size, 0xffd93d, 0.2 + Math.random() * 0.3);

      this.tweens.add({
        targets: particle,
        y: y - 30 - Math.random() * 50,
        alpha: 0,
        duration: 3000 + Math.random() * 4000,
        repeat: -1,
        delay: Math.random() * 3000,
        onRepeat: () => {
          particle.x = Math.random() * GAME_WIDTH;
          particle.y = GAME_HEIGHT * 0.3 + Math.random() * GAME_HEIGHT * 0.5;
          particle.alpha = 0.2 + Math.random() * 0.3;
        },
      });
    }

    // 타이틀 로고
    const logoY = GAME_HEIGHT * 0.28;

    // 성 아이콘
    this.add.text(GAME_WIDTH / 2, logoY - 60, '🏰', {
      fontSize: '64px',
    }).setOrigin(0.5);

    // 게임 타이틀
    const title = this.add.text(GAME_WIDTH / 2, logoY + 20, '한 손의\n요새', {
      fontSize: '36px', color: '#4a3c31', fontStyle: 'bold',
      align: 'center', lineSpacing: 4,
    }).setOrigin(0.5);

    // 영문 서브타이틀
    this.add.text(GAME_WIDTH / 2, logoY + 80, 'One Hand Fortress', {
      fontSize: '18px', color: '#8d6e63',
    }).setOrigin(0.5);

    // 태그라인
    this.add.text(GAME_WIDTH / 2, logoY + 110, '잠든 마을을 깨우는 따뜻한 전략', {
      fontSize: '12px', color: '#a1887f',
    }).setOrigin(0.5);

    // 시작 버튼
    const btnY = GAME_HEIGHT * 0.62;

    const playBg = this.add.rectangle(GAME_WIDTH / 2, btnY, 200, 50, COLORS.UI_ACCENT, 0.9);
    playBg.setStrokeStyle(2, 0xffffff, 0.4);

    const playText = this.add.text(GAME_WIDTH / 2, btnY, '▶  게임 시작', {
      fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    playBg.setInteractive();
    playBg.on('pointerdown', () => {
      this.cameras.main.fadeOut(500);
      this.time.delayedCall(500, () => {
        this.scene.start('StageSelectScene');
      });
    });

    // 버튼 펄스 애니메이션
    this.tweens.add({
      targets: [playBg, playText],
      scaleX: 1.05, scaleY: 1.05,
      duration: 1200, yoyo: true, repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // ==================== HOW TO PLAY BUTTON ====================
    const helpBtnY = btnY + 65;
    const helpBg = this.add.rectangle(GAME_WIDTH / 2, helpBtnY, 200, 44, 0x5d4037, 0.7);
    helpBg.setStrokeStyle(1, 0x8d6e63, 0.6);
    const helpText = this.add.text(GAME_WIDTH / 2, helpBtnY, '❓ 게임 방법', {
      fontSize: '15px', color: '#d7ccc8', fontStyle: 'bold',
    }).setOrigin(0.5);

    helpBg.setInteractive();
    helpBg.on('pointerdown', () => {
      this.showHowToPlay();
    });

    // Login button
    try {
      const sdk = (window as any).__sdk;
      if (sdk) {
        const user = sdk.auth.getUser();
        const loginLabel = user ? `👤 ${user.name}` : '🔑 로그인';
        const loginBg = this.add.rectangle(GAME_WIDTH / 2, helpBtnY + 55, 200, 44, 0x5d4037, 0.7);
        loginBg.setStrokeStyle(1, 0x8d6e63, 0.6);
        const loginText = this.add.text(GAME_WIDTH / 2, helpBtnY + 55, loginLabel, {
          fontSize: '15px', color: '#d7ccc8', fontStyle: 'bold',
        }).setOrigin(0.5);
        loginBg.setInteractive();
        loginBg.on('pointerdown', async () => {
          try {
            const loggedIn = await sdk.auth.loginIfAvailable();
            if (loggedIn) {
              loginText.setText(`👤 ${loggedIn.name}`);
            }
          } catch (_) {}
        });
      }
    } catch (_) {}

    // 하단 크레딧
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 40, '한 손으로 지키는 우리 마을', {
      fontSize: '10px', color: '#bcaaa4',
    }).setOrigin(0.5);

    // 페이드인
    this.cameras.main.fadeIn(800);
  }

  private showHowToPlay(): void {
    // Overlay container
    const overlay = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0)
      .setOrigin(0).setDepth(50).setInteractive();
    this.tweens.add({ targets: overlay, fillAlpha: 0.7, duration: 300 });

    const container = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(51);
    container.setAlpha(0);
    this.tweens.add({ targets: container, alpha: 1, duration: 300 });

    // Panel background
    const panelBg = this.add.rectangle(0, 0, 320, 360, 0x1a1a2e, 0.95);
    panelBg.setStrokeStyle(2, 0xffd93d, 0.6);
    container.add(panelBg);

    // Title
    const title = this.add.text(0, -150, '📖 게임 방법', {
      fontSize: '20px', color: '#ffd93d', fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(title);

    // Instructions
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

    // Close button
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
