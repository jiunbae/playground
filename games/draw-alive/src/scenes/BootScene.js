import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    const { width, height } = this.scale;

    // Splash screen
    this.cameras.main.setBackgroundColor('#FFF8F0');

    const title = this.add.text(width / 2, height / 2 - 60, '그려서 살려내기', {
      fontSize: '48px',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      color: '#FF6B6B',
    }).setOrigin(0.5);

    const subtitle = this.add.text(width / 2, height / 2 + 10, 'Draw Alive', {
      fontSize: '24px',
      fontFamily: 'sans-serif',
      color: '#2D3436',
    }).setOrigin(0.5);

    const tagline = this.add.text(width / 2, height / 2 + 60, '네 낙서가 살아 움직인다', {
      fontSize: '16px',
      fontFamily: 'sans-serif',
      color: '#999',
    }).setOrigin(0.5);

    // Loading indicator
    const loading = this.add.text(width / 2, height / 2 + 140, '로딩 중...', {
      fontSize: '16px',
      fontFamily: 'sans-serif',
      color: '#AAA',
    }).setOrigin(0.5);

    // Fade in and transition
    this.cameras.main.fadeIn(500);

    this.time.delayedCall(1500, () => {
      const isFirstRun = !localStorage.getItem('drawAlive_onboarded');
      this.cameras.main.fadeOut(300);
      this.time.delayedCall(300, () => {
        if (isFirstRun) {
          this.scene.start('OnboardingScene');
        } else {
          this.scene.start('MainMenuScene');
        }
      });
    });
  }
}
