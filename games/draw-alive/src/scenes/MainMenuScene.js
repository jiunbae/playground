import Phaser from 'phaser';
import { StageManager } from '../systems/StageManager.js';

const LEADERBOARD_KEY = 'playground_draw-alive_leaderboard';

function loadLeaderboard() {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveLeaderboardEntry(name, totalStars, stagesCleared) {
  try {
    const entries = loadLeaderboard();
    const existing = entries.findIndex(e => e.name === name);
    const entry = { name, totalStars, stagesCleared, timestamp: Date.now() };
    if (existing >= 0) {
      if (totalStars >= entries[existing].totalStars) entries[existing] = entry;
    } else {
      entries.push(entry);
    }
    entries.sort((a, b) => b.totalStars - a.totalStars || b.stagesCleared - a.stagesCleared);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries.slice(0, 50)));
  } catch { /* ignore */ }
}

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
    const stagesCleared = Math.max(0, stageManager.getMaxUnlockedStage() - 1);

    // Auto-save current player to leaderboard
    try {
      const sdk = window.__sdk;
      const user = sdk?.auth?.getUser();
      if (user) {
        saveLeaderboardEntry(user.name, totalStars, stagesCleared);
      }
    } catch { /* ignore */ }

    // Title
    this.add.text(width / 2, height * 0.15, 'Draw Alive', {
      fontSize: '52px',
      fontFamily: 'Outfit, sans-serif',
      fontStyle: 'bold',
      color: '#FF6B6B',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.15 + 55, '그려서 살려내기', {
      fontSize: '20px',
      fontFamily: '"Noto Sans KR", sans-serif',
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

    // Leaderboard button
    const lbBtn = this.add.text(width - 40, 30, '🏆', {
      fontSize: '28px',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    lbBtn.on('pointerdown', () => this._showLeaderboard(width, height));

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

  _showLeaderboard(width, height) {
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0)
      .setOrigin(0).setDepth(50).setInteractive();
    this.tweens.add({ targets: overlay, fillAlpha: 0.7, duration: 200 });

    const container = this.add.container(width / 2, height / 2).setDepth(51);
    container.setAlpha(0);
    this.tweens.add({ targets: container, alpha: 1, duration: 200 });

    const panelBg = this.add.rectangle(0, 0, width - 40, height * 0.7, 0x222222, 0.95);
    panelBg.setStrokeStyle(2, 0xFFC312, 0.8);
    container.add(panelBg);

    const title = this.add.text(0, -panelBg.height / 2 + 30, '🏆 리더보드', {
      fontSize: '22px', fontFamily: 'sans-serif', fontStyle: 'bold', color: '#FFC312',
    }).setOrigin(0.5);
    container.add(title);

    // Header row
    const headerY = -panelBg.height / 2 + 65;
    const colX = [-panelBg.width / 2 + 30, -panelBg.width / 2 + 70, 0, panelBg.width / 2 - 80, panelBg.width / 2 - 30];
    const headers = ['#', '이름', '총 별', '클리어'];
    const headerPositions = [colX[0], colX[1], colX[3], colX[4]];
    headers.forEach((h, i) => {
      container.add(this.add.text(headerPositions[i], headerY, h, {
        fontSize: '12px', fontFamily: 'sans-serif', fontStyle: 'bold', color: '#999',
      }).setOrigin(0, 0.5));
    });

    const entries = loadLeaderboard().slice(0, 10);
    entries.forEach((entry, i) => {
      const y = headerY + 30 + i * 28;
      const rankColor = i === 0 ? '#FFC312' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#FFFFFF';
      container.add(this.add.text(colX[0], y, `${i + 1}`, {
        fontSize: '14px', fontFamily: 'sans-serif', fontStyle: 'bold', color: rankColor,
      }).setOrigin(0, 0.5));
      container.add(this.add.text(colX[1], y, entry.name || '???', {
        fontSize: '14px', fontFamily: 'sans-serif', color: '#FFF',
      }).setOrigin(0, 0.5));
      container.add(this.add.text(colX[3], y, `★${entry.totalStars}`, {
        fontSize: '14px', fontFamily: 'sans-serif', color: '#FFC312',
      }).setOrigin(0, 0.5));
      container.add(this.add.text(colX[4], y, `${entry.stagesCleared}`, {
        fontSize: '14px', fontFamily: 'sans-serif', color: '#AAA',
      }).setOrigin(0, 0.5));
    });

    if (entries.length === 0) {
      container.add(this.add.text(0, 0, '아직 기록이 없습니다', {
        fontSize: '14px', fontFamily: 'sans-serif', color: '#999',
      }).setOrigin(0.5));
    }

    const closeBg = this.add.rectangle(0, panelBg.height / 2 - 35, 120, 36, 0xFF6B6B, 0.9);
    closeBg.setStrokeStyle(1, 0xFFFFFF, 0.3);
    const closeText = this.add.text(0, panelBg.height / 2 - 35, '닫기', {
      fontSize: '15px', fontFamily: 'sans-serif', color: '#FFF',
    }).setOrigin(0.5);
    closeBg.setInteractive({ useHandCursor: true });
    closeBg.on('pointerdown', () => {
      this.tweens.add({
        targets: [container, overlay],
        alpha: 0, duration: 150,
        onComplete: () => { container.destroy(); overlay.destroy(); },
      });
    });
    container.add([closeBg, closeText]);
  }

  _drawDoodle(width, height) {
    const g = this.add.graphics();
    const cx = width / 2;
    const cy = height * 0.35;

    // Smiling pencil character
    const bodyTop = cy - 50;
    const bodyBottom = cy + 50;
    const bodyW = 16;

    // Pencil body (vertical rectangle)
    g.fillStyle(0xFFC312, 0.9);
    g.fillRect(cx - bodyW / 2, bodyTop, bodyW, 80);

    // Pencil tip (triangle at bottom)
    g.fillStyle(0xF8C291, 0.9);
    g.fillTriangle(cx - bodyW / 2, bodyBottom - 20, cx + bodyW / 2, bodyBottom - 20, cx, bodyBottom + 10);

    // Pencil tip point
    g.fillStyle(0x2D3436, 0.7);
    g.fillTriangle(cx - 4, bodyBottom + 2, cx + 4, bodyBottom + 2, cx, bodyBottom + 10);

    // Eraser cap at top
    g.fillStyle(0xFF6B6B, 0.8);
    g.fillRect(cx - bodyW / 2, bodyTop - 12, bodyW, 14);
    g.lineStyle(2, 0xE55039, 0.6);
    g.beginPath();
    g.moveTo(cx - bodyW / 2, bodyTop);
    g.lineTo(cx + bodyW / 2, bodyTop);
    g.strokePath();

    // Circle head above eraser
    const headCy = bodyTop - 28;
    g.fillStyle(0xFFF3E0, 0.9);
    g.fillCircle(cx, headCy, 18);
    g.lineStyle(2.5, 0x2D3436, 0.5);
    g.strokeCircle(cx, headCy, 18);

    // Eyes
    g.fillStyle(0x2D3436, 0.7);
    g.fillCircle(cx - 6, headCy - 2, 3);
    g.fillCircle(cx + 6, headCy - 2, 3);

    // Eye sparkle
    g.fillStyle(0xFFFFFF, 0.9);
    g.fillCircle(cx - 5, headCy - 3, 1.2);
    g.fillCircle(cx + 7, headCy - 3, 1.2);

    // Smile
    g.lineStyle(2, 0x2D3436, 0.5);
    g.beginPath();
    g.arc(cx, headCy + 4, 7, 0.3, Math.PI - 0.3, false);
    g.strokePath();

    // Small arms
    g.lineStyle(2.5, 0x2D3436, 0.35);
    g.beginPath();
    g.moveTo(cx - bodyW / 2, cy - 15);
    g.lineTo(cx - bodyW / 2 - 18, cy - 25);
    g.moveTo(cx + bodyW / 2, cy - 15);
    g.lineTo(cx + bodyW / 2 + 18, cy - 25);
    g.strokePath();

    // Small legs
    g.lineStyle(2.5, 0x2D3436, 0.35);
    g.beginPath();
    g.moveTo(cx - 5, bodyBottom + 10);
    g.lineTo(cx - 10, bodyBottom + 25);
    g.moveTo(cx + 5, bodyBottom + 10);
    g.lineTo(cx + 10, bodyBottom + 25);
    g.strokePath();

    // Gentle bobbing animation
    this.tweens.add({
      targets: g,
      y: -5,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}
