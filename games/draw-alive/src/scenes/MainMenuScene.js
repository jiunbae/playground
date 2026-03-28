import Phaser from 'phaser';
import { StageManager } from '../systems/StageManager.js';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#FFF8F0');
    this.cameras.main.fadeIn(300);

    const stageManager = new StageManager();
    const totalStars = stageManager.getTotalStars();

    // Title
    this.add.text(width / 2, height * 0.15, 'Draw Alive', {
      fontSize: '52px',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      color: '#FF6B6B',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.15 + 55, '그려서 살려내기', {
      fontSize: '20px',
      fontFamily: 'sans-serif',
      color: '#2D3436',
    }).setOrigin(0.5);

    // Stars display
    if (totalStars > 0) {
      this.add.text(width / 2, height * 0.15 + 90, `★ ${totalStars}`, {
        fontSize: '18px',
        fontFamily: 'sans-serif',
        color: '#FFC312',
      }).setOrigin(0.5);
    }

    // Decorative animated drawing
    this._drawDoodle(width, height);

    // Menu buttons
    const btnConfigs = [
      { text: '챌린지 모드', desc: '물리 퍼즐을 풀어보세요', color: '#FF6B6B', scene: 'StageSelectScene' },
      { text: '샌드박스', desc: '자유롭게 그리고 실험하세요', color: '#4ECDC4', scene: 'SandboxScene' },
    ];

    const startY = height * 0.52;
    const btnHeight = 80;
    const btnGap = 15;

    btnConfigs.forEach((cfg, i) => {
      const y = startY + i * (btnHeight + btnGap);
      this._createButton(width / 2, y, width - 80, btnHeight, cfg);
    });

    // Login button
    try {
      const sdk = window.__sdk;
      if (sdk) {
        const user = sdk.auth.getUser();
        const loginLabel = user ? `👤 ${user.name}` : '🔑 로그인';
        const loginBtn = this.add.text(width / 2, height - 70, loginLabel, {
          fontSize: '14px', fontFamily: 'sans-serif', color: '#999',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        loginBtn.on('pointerdown', async () => {
          try {
            const loggedIn = await sdk.auth.loginIfAvailable();
            if (loggedIn) {
              loginBtn.setText(`👤 ${loggedIn.name}`);
            }
          } catch (_) {}
        });
      }
    } catch (_) {}

    // Version text
    this.add.text(width / 2, height - 30, 'v0.1.0 MVP', {
      fontSize: '12px', fontFamily: 'sans-serif', color: '#CCC',
    }).setOrigin(0.5);
  }

  _createButton(x, y, w, h, cfg) {
    const g = this.add.graphics();
    g.fillStyle(Phaser.Display.Color.HexStringToColor(cfg.color).color, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 16);

    this.add.text(x, y - 10, cfg.text, {
      fontSize: '24px', fontFamily: 'sans-serif', fontStyle: 'bold', color: '#FFF',
    }).setOrigin(0.5);

    this.add.text(x, y + 18, cfg.desc, {
      fontSize: '14px', fontFamily: 'sans-serif', color: '#FFFFFFCC',
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      this.cameras.main.fadeOut(200);
      this.time.delayedCall(200, () => this.scene.start(cfg.scene));
    });
  }

  _drawDoodle(width, height) {
    const g = this.add.graphics();
    const cx = width / 2;
    const cy = height * 0.35;

    // Simple animated doodle character
    g.lineStyle(4, 0x2D3436, 0.4);

    // Body (wobbly circle)
    g.beginPath();
    for (let a = 0; a <= Math.PI * 2; a += 0.1) {
      const r = 40 + Math.sin(a * 3) * 5;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (a === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.strokePath();

    // Eyes
    g.fillStyle(0x2D3436, 0.5);
    g.fillCircle(cx - 12, cy - 8, 5);
    g.fillCircle(cx + 12, cy - 8, 5);

    // Smile
    g.beginPath();
    g.arc(cx, cy + 5, 12, 0.2, Math.PI - 0.2, false);
    g.strokePath();

    // Small legs
    g.lineStyle(3, 0x2D3436, 0.3);
    g.beginPath();
    g.moveTo(cx - 15, cy + 40);
    g.lineTo(cx - 20, cy + 55);
    g.moveTo(cx + 15, cy + 40);
    g.lineTo(cx + 20, cy + 55);
    g.strokePath();
  }
}
