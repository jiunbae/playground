import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, GAME_HEIGHT } from '../utils/constants';
import { UIHelper } from '../ui/UIHelper';
import { gameState } from '../systems/GameState';

// --- Leaderboard ---
const RD_LEADERBOARD_KEY = 'playground_roguelike-deckbuilder_leaderboard';
const RD_LEADERBOARD_MAX = 50;

interface RDLeaderboardRecord {
  name: string;
  score: number;
  character: string;
  floorsCleared: number;
  timestamp: number;
}

function loadRDLeaderboard(): RDLeaderboardRecord[] {
  try {
    const data = localStorage.getItem(RD_LEADERBOARD_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveToRDLeaderboard(entry: RDLeaderboardRecord): void {
  const entries = loadRDLeaderboard();
  entries.push(entry);
  entries.sort((a, b) => b.score - a.score);
  if (entries.length > RD_LEADERBOARD_MAX) entries.length = RD_LEADERBOARD_MAX;
  localStorage.setItem(RD_LEADERBOARD_KEY, JSON.stringify(entries));
}

export { saveToRDLeaderboard };

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenu' });
  }

  create(): void {
    // Background
    this.cameras.main.setBackgroundColor(COLORS.BG_PRIMARY);

    // Title
    this.add.text(GAME_WIDTH / 2, 200, '카드의 탑', {
      fontSize: '56px', fontFamily: 'Outfit, "Noto Sans KR", sans-serif', color: COLORS.ACCENT_HEX,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 260, 'TOWER OF CARDS', {
      fontSize: '18px', fontFamily: 'Outfit, sans-serif', color: '#888888',
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(GAME_WIDTH / 2, 310, '카드 한 장의 선택이 운명을 바꾼다', {
      fontSize: '16px', fontFamily: 'sans-serif', color: COLORS.TEXT_HEX,
    }).setOrigin(0.5);

    // Decorative card icons
    const elements = ['🔥', '🧊', '⚡', '🌿', '🌑'];
    for (let i = 0; i < elements.length; i++) {
      const x = GAME_WIDTH / 2 + (i - 2) * 60;
      this.add.text(x, 370, elements[i], {
        fontSize: '32px',
      }).setOrigin(0.5);
    }

    let buttonY = 470;
    const spacing = 70;

    // Continue button (if save exists)
    if (gameState.hasSave()) {
      UIHelper.createButton(this, GAME_WIDTH / 2, buttonY, 280, 50,
        '▶ 이어하기', () => {
          // TODO: load save and resume
          this.scene.start('CharacterSelect');
        }, 0x4A3A6A, 22);
      buttonY += spacing;
    }

    // New Run
    UIHelper.createButton(this, GAME_WIDTH / 2, buttonY, 280, 50,
      '⚔️ 새 런 시작', () => {
        this.scene.start('CharacterSelect');
      }, COLORS.BUTTON, 22);
    buttonY += spacing;

    // Quick Run
    UIHelper.createButton(this, GAME_WIDTH / 2, buttonY, 280, 50,
      '⏱️ 퀵 런', () => {
        // Quick run starts directly
        this.scene.start('CharacterSelect', { quickRun: true });
      }, COLORS.BUTTON, 22);
    buttonY += spacing;

    // How to play
    UIHelper.createButton(this, GAME_WIDTH / 2, buttonY, 280, 50,
      '❓ 게임 방법', () => {
        this.showHowToPlay();
      }, COLORS.DARK_GRAY, 22);
    buttonY += spacing;

    // Leaderboard
    UIHelper.createButton(this, GAME_WIDTH / 2, buttonY, 280, 50,
      '🏆 리더보드', () => {
        this.showLeaderboard();
      }, 0x6B5B00, 22);
    buttonY += spacing;

    // Collection (placeholder)
    UIHelper.createButton(this, GAME_WIDTH / 2, buttonY, 280, 50,
      '📖 컬렉션', () => {
        // TODO
      }, COLORS.DARK_GRAY, 22);
    buttonY += spacing;

    // Stats
    if (gameState.totalRuns > 0) {
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 120, `총 런: ${gameState.totalRuns} | 클리어: ${gameState.totalClears}`, {
        fontSize: '14px', fontFamily: 'sans-serif', color: '#666666',
      }).setOrigin(0.5);
    }

    // Login button
    try {
      const sdk = (window as any).__sdk;
      if (sdk) {
        const user = sdk.auth.getUser();
        const loginLabel = user ? `👤 ${user.name}` : '🔑 로그인';
        UIHelper.createButton(this, GAME_WIDTH / 2, buttonY, 280, 50,
          loginLabel, () => {
            try {
              sdk.auth.loginIfAvailable().then((loggedIn: any) => {
                if (loggedIn) {
                  // Refresh scene to show updated name
                  this.scene.restart();
                }
              }).catch(() => {});
            } catch (_) {}
          }, 0x333333, 22);
        buttonY += spacing;
      }
    } catch (_) {}

    // Version
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 60, 'v0.1.0 MVP', {
      fontSize: '12px', fontFamily: 'sans-serif', color: '#444444',
    }).setOrigin(0.5);

    UIHelper.fadeIn(this);
  }

  private showLeaderboard(): void {
    const all = loadRDLeaderboard();
    const top10 = all.sort((a, b) => b.score - a.score).slice(0, 10);

    let myName = '나';
    try { const sdk = (window as any).__sdk; if (sdk) { const u = sdk.auth.getUser(); if (u) myName = u.name; } } catch {}
    const myIdx = all.findIndex(e => e.name === myName);

    // Overlay background
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.85)
      .setDepth(200).setInteractive();

    const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 620, 750, 0x1A1A2E, 0.95)
      .setStrokeStyle(2, COLORS.ACCENT).setDepth(201);

    const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 330, '\u{1F3C6} 리더보드', {
      fontSize: '32px', fontFamily: 'sans-serif', color: COLORS.ACCENT_HEX, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(202);

    // Header row
    const headerY = GAME_HEIGHT / 2 - 270;
    const cols = [GAME_WIDTH / 2 - 260, GAME_WIDTH / 2 - 200, GAME_WIDTH / 2 - 50, GAME_WIDTH / 2 + 80, GAME_WIDTH / 2 + 200];
    const headers = ['순위', '이름', '점수', '캐릭터', '층'];
    const headerTexts: Phaser.GameObjects.Text[] = [];
    headers.forEach((h, i) => {
      headerTexts.push(this.add.text(cols[i], headerY, h, {
        fontSize: '14px', fontFamily: 'sans-serif', color: '#888888',
      }).setOrigin(0.5).setDepth(202));
    });

    const rowTexts: Phaser.GameObjects.Text[] = [];
    if (top10.length > 0) {
      top10.forEach((e, i) => {
        const y = headerY + 35 + i * 38;
        const isMe = e.name === myName;
        const color = isMe ? '#FFD700' : COLORS.TEXT_HEX;
        [
          `${i + 1}`,
          e.name,
          e.score.toLocaleString(),
          e.character || '-',
          `${e.floorsCleared || 0}F`,
        ].forEach((val, ci) => {
          rowTexts.push(this.add.text(cols[ci], y, val, {
            fontSize: '15px', fontFamily: 'sans-serif', color,
          }).setOrigin(0.5).setDepth(202));
        });
      });
    } else {
      rowTexts.push(this.add.text(GAME_WIDTH / 2, headerY + 80, '아직 기록이 없습니다', {
        fontSize: '16px', fontFamily: 'sans-serif', color: '#888888',
      }).setOrigin(0.5).setDepth(202));
    }

    // My rank
    const myRankTexts: Phaser.GameObjects.Text[] = [];
    if (myIdx >= 0) {
      myRankTexts.push(this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 250, `내 순위: ${myIdx + 1}위 | ${all[myIdx].score.toLocaleString()}점 | ${all[myIdx].floorsCleared || 0}층`, {
        fontSize: '15px', fontFamily: 'sans-serif', color: '#FFD700',
      }).setOrigin(0.5).setDepth(202));
    }

    const closeBtn = UIHelper.createButton(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 310, 200, 50,
      '닫기', () => {
        overlay.destroy();
        panel.destroy();
        title.destroy();
        headerTexts.forEach(t => t.destroy());
        rowTexts.forEach(t => t.destroy());
        myRankTexts.forEach(t => t.destroy());
        closeBtn.destroy();
      }, COLORS.BUTTON, 20).setDepth(202);
  }

  private showHowToPlay(): void {
    // Overlay background
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.85)
      .setDepth(200).setInteractive();

    const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 600, 700, 0x1A1A2E, 0.95)
      .setStrokeStyle(2, COLORS.ACCENT).setDepth(201);

    const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 300, '게임 방법', {
      fontSize: '32px', fontFamily: 'sans-serif', color: COLORS.ACCENT_HEX, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(202);

    const instructions = [
      '🃏  카드를 사용하여 적과 전투합니다',
      '',
      '🔵  에너지(파란 구슬)를 소비하여 카드를 사용합니다',
      '',
      '⚔️  공격으로 데미지, 🛡️ 방어로 피해 차단',
      '',
      '🎁  전투 승리 시 새 카드를 획득합니다',
      '',
      '🗺️  맵에서 전투/상점/휴식 중 선택하세요',
      '',
      '💡  같은 속성 카드를 모으면 시너지 효과!',
    ];

    const instructionText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, instructions.join('\n'), {
      fontSize: '18px', fontFamily: 'sans-serif', color: COLORS.TEXT_HEX,
      lineSpacing: 6, align: 'left', wordWrap: { width: 500 },
    }).setOrigin(0.5).setDepth(202);

    const closeBtn = UIHelper.createButton(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 290, 200, 50,
      '닫기', () => {
        overlay.destroy();
        panel.destroy();
        title.destroy();
        instructionText.destroy();
        closeBtn.destroy();
      }, COLORS.BUTTON, 20).setDepth(202);
  }
}
