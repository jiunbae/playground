import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, GRID_COLS, CELL_SIZE, MAP_TOP, MAP_BOTTOM,
  COLORS, TOWERS, TowerDef, STAGE_CONFIG, WEEKLY_COLORS, getWeekLabel,
} from '../config/GameConfig';
import { MapGenerator, MapData, CellType } from '../systems/MapGenerator';
import { PathFinder } from '../systems/PathFinder';
import { WaveSystem, WaveData } from '../systems/WaveSystem';
import { Tower } from '../entities/Tower';
import { Enemy } from '../entities/Enemy';

type GamePhase = 'prepare' | 'wave' | 'between_waves' | 'victory' | 'defeat';

export class GameScene extends Phaser.Scene {
  // 스테이지
  private stage: number = 1;
  private mode: 'normal' | 'weekly' = 'normal';
  private weeklySeed: number = 0;
  private mapData!: MapData;
  private mapRows!: number;

  // 시스템
  private pathFinder!: PathFinder;
  private waveSystem!: WaveSystem;

  // 엔티티
  private towers: Tower[] = [];
  private enemies: Enemy[] = [];

  // 상태
  private gold: number = 0;
  private villageHealth: number = 0;
  private maxVillageHealth: number = 0;
  private currentWave: number = 0;
  private totalWaves: number = 0;
  private waves: WaveData[] = [];
  private phase: GamePhase = 'prepare';

  // 웨이브 스폰
  private spawnQueue: { def: any; spawnIndex: number }[] = [];
  private spawnTimer: number = 0;
  private spawnInterval: number = 0;
  private betweenWaveTimer: number = 0;

  // UI
  private selectedTowerIndex: number = 0;
  private availableTowers: TowerDef[] = [];
  private towerSlots: Phaser.GameObjects.Container[] = [];
  private goldText!: Phaser.GameObjects.Text;
  private healthText!: Phaser.GameObjects.Text;
  private healthBar!: Phaser.GameObjects.Rectangle;
  private healthBarBg!: Phaser.GameObjects.Rectangle;
  private waveText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private startButton!: Phaser.GameObjects.Container;
  private speedButton!: Phaser.GameObjects.Container;
  private gameSpeed: number = 1;

  // 맵 비주얼
  private mapContainer!: Phaser.GameObjects.Container;

  // 경로 캐시
  private cachedPaths: { x: number; y: number }[][] = [];

  // 타워 메뉴 관련
  private activeTowerMenu: Phaser.GameObjects.Container | null = null;
  private activeTowerMenuTimer: Phaser.Time.TimerEvent | null = null;

  // Tower info tooltip
  private towerTooltip: Phaser.GameObjects.Container | null = null;

  // Weekly challenge banner
  private weeklyBanner: Phaser.GameObjects.Container | null = null;

  // Stats tracking
  private totalEnemiesKilled: number = 0;
  private totalTowersBuilt: number = 0;
  private totalGoldEarned: number = 0;

  constructor() {
    super('GameScene');
  }

  init(data: { stage?: number; mode?: 'normal' | 'weekly'; seed?: number } = {}): void {
    this.mode = data.mode || 'normal';
    this.weeklySeed = data.seed || 0;

    if (this.mode === 'weekly') {
      // Weekly challenge: derive a stage-like difficulty from the seed
      // Produces a challenge equivalent to stage 15-30 range for balanced difficulty
      this.stage = 15 + (this.weeklySeed % 16);
    } else {
      this.stage = data.stage || 1;
    }

    this.towers = [];
    this.enemies = [];
    this.gold = STAGE_CONFIG.startGold + Math.floor(this.stage / 5) * 25;
    this.villageHealth = STAGE_CONFIG.villageHealth;
    this.maxVillageHealth = STAGE_CONFIG.villageHealth;
    this.currentWave = 0;
    this.phase = 'prepare';
    this.spawnQueue = [];
    this.gameSpeed = 1;
    this.activeTowerMenu = null;
    this.activeTowerMenuTimer = null;
    this.towerTooltip = null;
    this.weeklyBanner = null;
    this.totalEnemiesKilled = 0;
    this.totalTowersBuilt = 0;
    this.totalGoldEarned = 0;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.BG_ASLEEP);

    // 맵 생성
    this.mapRows = Math.floor((MAP_BOTTOM - MAP_TOP) / CELL_SIZE);
    const mapGen = new MapGenerator();
    const mapSeed = this.mode === 'weekly' ? this.weeklySeed * 7919 + 31 : undefined;
    this.mapData = mapGen.generate(this.stage, GRID_COLS, this.mapRows, mapSeed);

    // 패스파인더 초기화
    this.pathFinder = new PathFinder(GRID_COLS, this.mapRows);
    for (let y = 0; y < this.mapRows; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const cell = this.mapData.grid[y]?.[x] ?? 0;
        this.pathFinder.setWalkable(x, y, cell === 1 || cell === 2 || cell === 3);
      }
    }

    // 경로 캐시
    this.cachedPaths = [];
    for (const sp of this.mapData.spawnPoints) {
      const path = this.pathFinder.findPath(sp.x, sp.y, this.mapData.villagePoint.x, this.mapData.villagePoint.y);
      if (path && path.length > 1) {
        this.cachedPaths.push(path);
      }
    }

    // 경로가 없으면 폴백: 직선 경로 생성
    if (this.cachedPaths.length === 0) {
      const fallbackPath: { x: number; y: number }[] = [];
      const vx = this.mapData.villagePoint.x;
      for (let y = 0; y <= this.mapData.villagePoint.y; y++) {
        fallbackPath.push({ x: vx, y });
      }
      this.cachedPaths.push(fallbackPath);
      // 스폰 포인트도 갱신
      if (this.mapData.spawnPoints.length === 0) {
        this.mapData.spawnPoints.push({ x: vx, y: 0 });
      }
    }

    // 웨이브 생성
    this.waveSystem = new WaveSystem();
    this.waves = this.waveSystem.generateWaves(this.stage, mapSeed);
    this.totalWaves = this.waves.length;

    // 사용 가능한 타워 필터링 (주간 챌린지: 기본 5종 해금)
    if (this.mode === 'weekly') {
      this.availableTowers = TOWERS.filter(t => t.unlockStage <= 35);
    } else {
      this.availableTowers = TOWERS.filter(t => t.unlockStage <= this.stage);
    }

    // 맵 렌더링
    this.renderMap();

    // UI 생성
    this.createHUD();
    this.createTowerSlots();
    this.createButtons();

    // 입력 처리
    this.input.on('pointerdown', this.handleTap, this);

    // 주간 챌린지 배너 표시
    if (this.mode === 'weekly') {
      this.createWeeklyBanner();
    }
  }

  private createWeeklyBanner(): void {
    const bannerY = MAP_TOP + 2;
    const container = this.add.container(GAME_WIDTH / 2, bannerY).setDepth(19);

    const bg = this.add.rectangle(0, 0, GAME_WIDTH - 20, 22, WEEKLY_COLORS.BANNER_BG, 0.85);
    bg.setStrokeStyle(1, WEEKLY_COLORS.BORDER, 0.6);
    container.add(bg);

    const label = this.add.text(0, 0, `\u2694\uFE0F \uC8FC\uAC04 \uCC4C\uB9B0\uC9C0 \u2014 ${getWeekLabel()}`, {
      fontSize: '10px', color: WEEKLY_COLORS.TEXT, fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(label);

    this.weeklyBanner = container;

    // Subtle pulse animation
    this.tweens.add({
      targets: container,
      alpha: 0.7,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private renderMap(): void {
    this.mapContainer = this.add.container(0, 0);

    for (let y = 0; y < this.mapRows; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const px = x * CELL_SIZE;
        const py = y * CELL_SIZE + MAP_TOP;
        const cell = this.mapData.grid[y]?.[x] ?? 0;

        let color: number;
        let alpha = 1;

        switch (cell) {
          case 1: // 경로
            color = COLORS.PATH;
            break;
          case 2: // 시작점
            color = 0xb39ddb;
            break;
          case 3: // 마을
            color = 0xffcc80;
            break;
          case 4: // 장식
            color = 0xdcedc8;
            break;
          default: // 배치 가능
            color = COLORS.PLACEABLE;
            alpha = 0.5;
        }

        // Subtle color variation per cell
        const colorVariation = ((x * 7 + y * 13) % 5) * 0.03;
        const adjustedAlpha = Math.min(1, alpha + colorVariation - 0.06);

        const rect = this.add.rectangle(px, py, CELL_SIZE - 1, CELL_SIZE - 1, color, adjustedAlpha);
        rect.setOrigin(0);
        rect.setStrokeStyle(0.5, COLORS.GRID_LINE, 0.3);
        this.mapContainer.add(rect);

        // Subtle ground decoration: tiny dots for grass/stone texture
        if (cell === 0 || cell === 4) {
          const decoGfx = this.add.graphics();
          const seed = (x * 31 + y * 17) % 100;
          if (cell === 0) {
            // Grass dots on placeable ground
            decoGfx.fillStyle(0x7cb342, 0.2 + (seed % 3) * 0.05);
            const dotCount = 2 + (seed % 3);
            for (let d = 0; d < dotCount; d++) {
              const dx = px + 4 + ((seed * (d + 1) * 7) % (CELL_SIZE - 8));
              const dy = py + 4 + ((seed * (d + 1) * 11) % (CELL_SIZE - 8));
              decoGfx.fillCircle(dx, dy, 1 + (d % 2) * 0.5);
            }
          } else {
            // Stone dots on decoration cells
            decoGfx.fillStyle(0x9e9e9e, 0.15);
            const dx = px + 8 + (seed % (CELL_SIZE - 16));
            const dy = py + 8 + ((seed * 3) % (CELL_SIZE - 16));
            decoGfx.fillCircle(dx, dy, 1.5);
          }
          decoGfx.setDepth(1);
          this.mapContainer.add(decoGfx);
        } else if (cell === 1) {
          // Path cells: subtle stone/paving texture
          const pathGfx = this.add.graphics();
          pathGfx.fillStyle(0x8d6e63, 0.12);
          const seed2 = (x * 23 + y * 11) % 50;
          for (let d = 0; d < 2; d++) {
            const dx = px + 5 + ((seed2 * (d + 1) * 5) % (CELL_SIZE - 10));
            const dy = py + 5 + ((seed2 * (d + 1) * 9) % (CELL_SIZE - 10));
            pathGfx.fillCircle(dx, dy, 1);
          }
          pathGfx.setDepth(1);
          this.mapContainer.add(pathGfx);
        }

        // 마을 아이콘
        if (cell === 3 && x === this.mapData.villagePoint.x) {
          const villageIcon = this.add.text(px + CELL_SIZE / 2, py + CELL_SIZE / 2, '🏘️', {
            fontSize: '20px',
          }).setOrigin(0.5).setDepth(3);
          this.mapContainer.add(villageIcon);
        }

        // 시작점 표시
        if (cell === 2) {
          const spawnIcon = this.add.text(px + CELL_SIZE / 2, py + CELL_SIZE / 2, '💤', {
            fontSize: '14px',
          }).setOrigin(0.5).setDepth(3);
          this.mapContainer.add(spawnIcon);
        }

        // 장식 아이콘
        if (cell === 4) {
          const decorIcons = ['🌱', '🌸', '🍀', '🌻'];
          const decorIcon = decorIcons[(x + y) % decorIcons.length];
          const deco = this.add.text(px + CELL_SIZE / 2, py + CELL_SIZE / 2, decorIcon, {
            fontSize: '10px',
          }).setOrigin(0.5).setDepth(2).setAlpha(0.6);
          this.mapContainer.add(deco);
        }
      }
    }

    // 경로 위에 점선 표시
    for (const path of this.cachedPaths) {
      for (let i = 0; i < path.length - 1; i++) {
        const from = path[i];
        const to = path[i + 1];
        const fx = from.x * CELL_SIZE + CELL_SIZE / 2;
        const fy = from.y * CELL_SIZE + MAP_TOP + CELL_SIZE / 2;
        const tx = to.x * CELL_SIZE + CELL_SIZE / 2;
        const ty = to.y * CELL_SIZE + MAP_TOP + CELL_SIZE / 2;
        const dot = this.add.circle((fx + tx) / 2, (fy + ty) / 2, 2, 0x8d6e63, 0.4);
        this.mapContainer.add(dot);
      }
    }

    this.mapContainer.setDepth(1);
  }

  private createHUD(): void {
    // 상단 HUD 배경
    this.add.rectangle(0, 0, GAME_WIDTH, 56, 0x000000, 0.3).setOrigin(0).setDepth(20);

    // 마을 체력 바
    const heartIcon = this.add.text(8, 6, '❤️', { fontSize: '14px' }).setDepth(21);
    this.healthBarBg = this.add.rectangle(30, 10, 80, 10, 0x000000, 0.5).setOrigin(0).setDepth(21);
    this.healthBarBg.setStrokeStyle(1, 0x666666, 0.5);
    this.healthBar = this.add.rectangle(30, 10, 80, 10, 0x4caf50, 0.9).setOrigin(0).setDepth(21);
    this.healthText = this.add.text(70, 23, `${this.villageHealth}/${this.maxVillageHealth}`, {
      fontSize: '10px', color: '#cccccc',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0).setDepth(21);

    // 물결 진행도
    this.waveText = this.add.text(GAME_WIDTH / 2, 6, `물결 0/${this.totalWaves}`, {
      fontSize: '14px', color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0).setDepth(21);

    // 골드
    this.add.text(GAME_WIDTH - 100, 5, '💰', { fontSize: '14px' }).setDepth(21);
    this.goldText = this.add.text(GAME_WIDTH - 80, 7, `${this.gold}`, {
      fontSize: '14px', color: '#ffd700',
      fontFamily: 'monospace',
    }).setDepth(21);

    // 스테이지 표시
    if (this.mode === 'weekly') {
      this.add.text(GAME_WIDTH / 2, 26, `주간 챌린지`, {
        fontSize: '11px', color: WEEKLY_COLORS.ACCENT_HEX,
        fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(0.5, 0).setDepth(21);
    } else {
      this.add.text(GAME_WIDTH / 2, 26, `스테이지 ${this.stage}`, {
        fontSize: '11px', color: '#cccccc',
        fontFamily: 'monospace',
      }).setOrigin(0.5, 0).setDepth(21);
    }

    // 페이즈 텍스트
    this.phaseText = this.add.text(GAME_WIDTH / 2, 42, '준비 페이즈 - 수호탑을 배치하세요', {
      fontSize: '10px', color: '#aaaaaa',
    }).setOrigin(0.5, 0).setDepth(21);

    // 뒤로가기 버튼
    const backBtn = this.add.text(GAME_WIDTH - 25, 42, '\u2715', {
      fontSize: '16px', color: '#999999',
    }).setOrigin(0.5).setDepth(21).setInteractive();
    backBtn.on('pointerdown', () => {
      this.scene.start(this.mode === 'weekly' ? 'TitleScene' : 'StageSelectScene');
    });
  }

  private createTowerSlots(): void {
    const slotY = GAME_HEIGHT - 130;
    const slotSize = 48;
    const gap = 6;
    const totalWidth = this.availableTowers.length * (slotSize + gap) - gap;
    const startX = (GAME_WIDTH - totalWidth) / 2;

    // 슬롯 배경
    this.add.rectangle(0, slotY - 12, GAME_WIDTH, slotSize + 28, 0x000000, 0.4)
      .setOrigin(0).setDepth(20);

    this.towerSlots = [];
    for (let i = 0; i < this.availableTowers.length; i++) {
      const t = this.availableTowers[i];
      const sx = startX + i * (slotSize + gap) + slotSize / 2;
      const sy = slotY + slotSize / 2;

      const bg = this.add.rectangle(0, 0, slotSize, slotSize, 0x333333, 0.8);
      bg.setStrokeStyle(2, i === this.selectedTowerIndex ? 0xffffff : 0x666666);

      // Mini tower preview instead of plain circle
      const previewGfx = this.add.graphics();
      const pr = 10; // mini preview radius
      switch (t.id) {
        case 'light':
          previewGfx.fillStyle(t.color, 0.9);
          previewGfx.fillRect(-pr * 0.5, -pr * 0.1 - 4, pr * 1.0, pr * 0.8);
          previewGfx.fillRect(-pr * 0.35, -pr * 0.5 - 4, pr * 0.7, pr * 0.4);
          previewGfx.fillStyle(0xffffff, 0.8);
          previewGfx.fillTriangle(0, -pr * 0.9 - 4, -pr * 0.15, -pr * 0.5 - 4, pr * 0.15, -pr * 0.5 - 4);
          break;
        case 'dew':
          previewGfx.fillStyle(t.color, 0.85);
          previewGfx.lineStyle(1, 0xffffff, 0.5);
          { const hex: number[][] = [];
            for (let hi = 0; hi < 6; hi++) {
              const a = (Math.PI / 3) * hi - Math.PI / 6;
              hex.push([Math.cos(a) * pr, Math.sin(a) * pr - 4]);
            }
            previewGfx.beginPath();
            previewGfx.moveTo(hex[0][0], hex[0][1]);
            for (let hi = 1; hi < 6; hi++) previewGfx.lineTo(hex[hi][0], hex[hi][1]);
            previewGfx.closePath();
            previewGfx.fillPath();
            previewGfx.strokePath(); }
          break;
        case 'rainbow':
          previewGfx.fillStyle(t.color, 0.85);
          previewGfx.fillCircle(0, -4, pr * 0.5);
          previewGfx.lineStyle(2, t.color, 0.9);
          previewGfx.beginPath();
          previewGfx.moveTo(-pr * 0.5, -pr * 0.6 - 4);
          previewGfx.lineTo(pr * 0.3, -pr * 0.3 - 4);
          previewGfx.lineTo(-pr * 0.3, 0 - 4);
          previewGfx.lineTo(pr * 0.5, pr * 0.3 - 4);
          previewGfx.strokePath();
          break;
        case 'bell':
          previewGfx.fillStyle(t.color, 0.9);
          previewGfx.beginPath();
          previewGfx.arc(0, -4, pr * 0.55, Math.PI, 0, false);
          previewGfx.lineTo(pr * 0.65, pr * 0.4 - 4);
          previewGfx.lineTo(-pr * 0.65, pr * 0.4 - 4);
          previewGfx.closePath();
          previewGfx.fillPath();
          previewGfx.fillCircle(0, pr * 0.45 - 4, 2);
          break;
        case 'spring':
          previewGfx.fillStyle(t.color, 0.85);
          previewGfx.fillRect(-pr * 0.5, pr * 0.1 - 4, pr * 1.0, pr * 0.3);
          previewGfx.fillRect(-pr * 0.08, -pr * 0.3 - 4, pr * 0.16, pr * 0.4);
          previewGfx.lineStyle(1.5, 0x74b9ff, 0.7);
          previewGfx.beginPath();
          previewGfx.arc(0, -pr * 0.3 - 4, pr * 0.3, Math.PI * 0.8, Math.PI * 0.2, false);
          previewGfx.strokePath();
          break;
        case 'fence':
          previewGfx.fillStyle(t.color, 0.85);
          for (let fi = -1; fi <= 1; fi++) {
            previewGfx.fillRect(fi * pr * 0.4 - 1.5, -pr * 0.3 - 4, 3, pr * 0.7);
          }
          previewGfx.fillRect(-pr * 0.5, -4, pr * 1.0, 2);
          previewGfx.fillStyle(0xff69b4, 0.8);
          previewGfx.fillCircle(-pr * 0.2, -pr * 0.4 - 4, 2);
          previewGfx.fillCircle(pr * 0.2, -pr * 0.45 - 4, 2);
          break;
        case 'lighthouse':
          previewGfx.fillStyle(t.color, 0.9);
          previewGfx.fillTriangle(-pr * 0.3, pr * 0.5 - 4, pr * 0.3, pr * 0.5 - 4, 0, -pr * 0.6 - 4);
          previewGfx.fillStyle(0xffd93d, 0.9);
          previewGfx.fillCircle(0, -pr * 0.5 - 4, pr * 0.18);
          break;
        case 'musicbox':
          previewGfx.fillStyle(t.color, 0.85);
          previewGfx.fillRoundedRect(-pr * 0.5, -pr * 0.3 - 4, pr * 1.0, pr * 0.7, 2);
          previewGfx.fillStyle(t.color, 0.6);
          previewGfx.fillRect(-pr * 0.5, -pr * 0.5 - 4, pr * 1.0, pr * 0.22);
          break;
        default:
          previewGfx.fillStyle(t.color, 0.9);
          previewGfx.fillCircle(0, -4, pr);
      }

      const cost = this.add.text(0, 18, `${t.cost}`, {
        fontSize: '10px', color: '#ffd700', fontFamily: 'monospace',
      }).setOrigin(0.5);

      const name = this.add.text(0, -22, t.nameKo.substring(0, 3), {
        fontSize: '8px', color: '#cccccc',
      }).setOrigin(0.5);

      const slot = this.add.container(sx, sy, [bg, previewGfx, cost, name]);
      slot.setSize(slotSize, slotSize);
      slot.setDepth(22);
      slot.setInteractive();
      slot.on('pointerdown', () => this.selectTower(i));

      this.towerSlots.push(slot);
    }
  }

  private createButtons(): void {
    // 시작 버튼
    const btnBg = this.add.rectangle(0, 0, 120, 36, COLORS.UI_ACCENT, 0.9);
    btnBg.setStrokeStyle(2, 0xffffff, 0.5);
    const btnText = this.add.text(0, 0, '▶ 물결 시작', {
      fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.startButton = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 30, [btnBg, btnText]);
    this.startButton.setSize(120, 36);
    this.startButton.setInteractive();
    this.startButton.setDepth(25);
    this.startButton.on('pointerdown', () => this.startWave());

    // 배속 버튼
    const speedBg = this.add.rectangle(0, 0, 40, 28, 0x333333, 0.8);
    speedBg.setStrokeStyle(1, 0x666666);
    const speedText = this.add.text(0, 0, 'x1', {
      fontSize: '12px', color: '#ffffff',
    }).setOrigin(0.5);

    this.speedButton = this.add.container(GAME_WIDTH - 35, GAME_HEIGHT - 30, [speedBg, speedText]);
    this.speedButton.setSize(40, 28);
    this.speedButton.setInteractive();
    this.speedButton.setDepth(25);
    this.speedButton.on('pointerdown', () => {
      this.gameSpeed = this.gameSpeed === 1 ? 2 : 1;
      speedText.setText(`x${this.gameSpeed}`);
    });
  }

  private selectTower(index: number): void {
    this.selectedTowerIndex = index;
    // 슬롯 하이라이트 갱신
    for (let i = 0; i < this.towerSlots.length; i++) {
      const bg = this.towerSlots[i].getAt(0) as Phaser.GameObjects.Rectangle;
      bg.setStrokeStyle(2, i === index ? 0xffffff : 0x666666);
    }

    // Show tower info tooltip
    this.showTowerTooltip(this.availableTowers[index]);
  }

  private showTowerTooltip(towerDef: TowerDef): void {
    // Remove old tooltip
    if (this.towerTooltip) {
      this.towerTooltip.destroy();
      this.towerTooltip = null;
    }

    const tooltipY = GAME_HEIGHT - 185;
    const container = this.add.container(GAME_WIDTH / 2, tooltipY).setDepth(28);

    const panelW = 260;
    const panelH = 48;
    const bg = this.add.rectangle(0, 0, panelW, panelH, 0x1a1a2e, 0.92);
    bg.setStrokeStyle(1, towerDef.color, 0.6);
    container.add(bg);

    // Tower icon
    const icon = this.add.circle(-panelW / 2 + 20, 0, 10, towerDef.color, 0.9);
    container.add(icon);

    // Tower name
    const nameText = this.add.text(-panelW / 2 + 38, -14, towerDef.nameKo, {
      fontSize: '11px', color: '#ffffff', fontStyle: 'bold',
    });
    container.add(nameText);

    // Stats
    const statsStr = towerDef.damage > 0
      ? `공격: ${towerDef.damage}  범위: ${towerDef.range}칸  속도: ${(towerDef.attackSpeed / 1000).toFixed(1)}초`
      : `${towerDef.special}`;

    const statsText = this.add.text(-panelW / 2 + 38, 4, statsStr, {
      fontSize: '9px', color: '#aaaaaa',
    });
    container.add(statsText);

    // Special
    const specialText = this.add.text(panelW / 2 - 8, 0, towerDef.special, {
      fontSize: '8px', color: '#ffd93d',
      wordWrap: { width: 100 },
    }).setOrigin(1, 0.5);
    container.add(specialText);

    this.towerTooltip = container;

    // Auto-hide after 3 seconds
    this.time.delayedCall(3000, () => {
      if (this.towerTooltip === container && container.active) {
        this.tweens.add({
          targets: container,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            container.destroy();
            if (this.towerTooltip === container) this.towerTooltip = null;
          },
        });
      }
    });
  }

  private handleTap(pointer: Phaser.Input.Pointer): void {
    // UI 영역 클릭 무시
    if (pointer.y < MAP_TOP || pointer.y > MAP_BOTTOM) return;

    // 기존 타워 메뉴 닫기
    this.closeActiveTowerMenu();

    const gridX = Math.floor(pointer.x / CELL_SIZE);
    const gridY = Math.floor((pointer.y - MAP_TOP) / CELL_SIZE);

    if (gridX < 0 || gridX >= GRID_COLS || gridY < 0 || gridY >= this.mapRows) return;

    const cell = this.mapData.grid[gridY]?.[gridX];

    // 이미 타워가 있는지 확인
    const existingTower = this.towers.find(t => t.gridX === gridX && t.gridY === gridY);
    if (existingTower) {
      this.showTowerMenu(existingTower);
      return;
    }

    // 배치 가능 영역에만 배치
    if (cell !== 0) {
      // 배치 불가 피드백 - enhanced with specific messages
      if (cell === 1) {
        this.showFloatingText(pointer.x, pointer.y, '경로 위에는 배치 불가!', '#ff8a80');
      } else if (cell === 2) {
        this.showFloatingText(pointer.x, pointer.y, '적 출현 지점입니다!', '#b39ddb');
      } else if (cell === 3) {
        this.showFloatingText(pointer.x, pointer.y, '마을 위에는 배치 불가!', '#ffcc80');
      } else if (cell === 4) {
        this.showFloatingText(pointer.x, pointer.y, '장식물이 있습니다!', '#dcedc8');
      }
      // Brief shake feedback
      this.cameras.main.shake(80, 0.003);
      return;
    }

    const towerDef = this.availableTowers[this.selectedTowerIndex];
    if (!towerDef) return;
    if (this.gold < towerDef.cost) {
      this.showFloatingText(pointer.x, pointer.y, '골드 부족!', '#ff4444');
      this.cameras.main.shake(80, 0.003);
      return;
    }

    // 타워 배치
    this.gold -= towerDef.cost;
    this.updateGoldDisplay();

    const tower = new Tower(this, towerDef, gridX, gridY);
    this.towers.push(tower);
    this.totalTowersBuilt++;

    // 맵 셀 업데이트
    this.mapData.grid[gridY][gridX] = 4; // 배치 불가로 변경

    this.showFloatingText(pointer.x, pointer.y - 20, `-${towerDef.cost}`, '#ffd700');
  }

  private closeActiveTowerMenu(): void {
    if (this.activeTowerMenu && this.activeTowerMenu.active) {
      this.activeTowerMenu.destroy();
    }
    this.activeTowerMenu = null;
    if (this.activeTowerMenuTimer) {
      this.activeTowerMenuTimer.destroy();
      this.activeTowerMenuTimer = null;
    }
    this.towers.forEach(t => t.showRange(false));
  }

  private showTowerMenu(tower: Tower): void {
    // 범위 표시
    tower.showRange(true);
    this.showUpgradeMenu(tower);
  }

  private showUpgradeMenu(tower: Tower): void {
    const px = tower.gridX * CELL_SIZE + CELL_SIZE / 2;
    let py = tower.gridY * CELL_SIZE + MAP_TOP - 30;

    // 화면 상단을 넘어가면 아래에 표시
    if (py < MAP_TOP + 10) {
      py = tower.gridY * CELL_SIZE + MAP_TOP + CELL_SIZE + 30;
    }

    const menuContainer = this.add.container(px, py);
    menuContainer.setDepth(30);

    // 배경
    const menuBg = this.add.rectangle(0, 0, 140, 48, 0x000000, 0.9);
    menuBg.setStrokeStyle(1, 0xffffff, 0.4);
    menuContainer.add(menuBg);

    // 타워 이름 + 레벨
    const titleText = this.add.text(0, -16, `${tower.def.nameKo} Lv.${tower.level}`, {
      fontSize: '9px', color: '#ffffff',
    }).setOrigin(0.5);
    menuContainer.add(titleText);

    const buttonY = 8;

    if (tower.canUpgrade()) {
      const upgradeCost = tower.getUpgradeCost();
      const canAfford = this.gold >= upgradeCost;
      const upgradeBg = this.add.rectangle(-35, buttonY, 60, 22, canAfford ? 0x2e7d32 : 0x555555, 0.9);
      upgradeBg.setStrokeStyle(1, canAfford ? 0x4caf50 : 0x777777);
      const upgradeLabel = this.add.text(-35, buttonY, `⬆${upgradeCost}G`, {
        fontSize: '10px', color: canAfford ? '#ffffff' : '#999999',
      }).setOrigin(0.5);

      if (canAfford) {
        upgradeBg.setInteractive();
        upgradeBg.on('pointerdown', (p: Phaser.Input.Pointer, lx: number, ly: number, event: Phaser.Types.Input.EventData) => {
          event.stopPropagation();
          if (this.gold >= upgradeCost) {
            this.gold -= upgradeCost;
            tower.upgrade();
            this.updateGoldDisplay();
            this.closeActiveTowerMenu();
            this.showFloatingText(px, py - 20, `Lv.${tower.level}!`, '#4caf50');
          }
        });
      }
      menuContainer.add([upgradeBg, upgradeLabel]);
    }

    const sellValue = tower.getSellValue();
    const sellBg = this.add.rectangle(35, buttonY, 60, 22, 0x8b0000, 0.9);
    sellBg.setStrokeStyle(1, 0xff4444);
    const sellLabel = this.add.text(35, buttonY, `🗑+${sellValue}G`, {
      fontSize: '10px', color: '#ff8a80',
    }).setOrigin(0.5);
    sellBg.setInteractive();
    sellBg.on('pointerdown', (p: Phaser.Input.Pointer, lx: number, ly: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.gold += sellValue;
      this.updateGoldDisplay();
      this.mapData.grid[tower.gridY][tower.gridX] = 0;
      tower.destroy();
      this.towers = this.towers.filter(t => t !== tower);
      this.closeActiveTowerMenu();
      this.showFloatingText(px, py, `+${sellValue}G`, '#ffd700');
    });
    menuContainer.add([sellBg, sellLabel]);

    // Clamp menu to screen
    if (menuContainer.x - 70 < 0) menuContainer.x = 70;
    if (menuContainer.x + 70 > GAME_WIDTH) menuContainer.x = GAME_WIDTH - 70;

    this.activeTowerMenu = menuContainer;

    // 4초 후 자동 닫기
    this.activeTowerMenuTimer = this.time.delayedCall(4000, () => {
      this.closeActiveTowerMenu();
    });
  }

  private startWave(): void {
    if (this.phase !== 'prepare' && this.phase !== 'between_waves') return;
    if (this.currentWave >= this.totalWaves) return;

    this.phase = 'wave';
    this.phaseText.setText(`물결 ${this.currentWave + 1}/${this.totalWaves} 진행 중...`);
    this.startButton.setVisible(false);

    // ==================== WAVE INCOMING BANNER ====================
    this.showWaveBanner(this.currentWave + 1);

    const waveData = this.waves[this.currentWave];
    this.spawnQueue = [];

    // 각 적 그룹의 스폰 데이터 준비
    for (const group of waveData.enemies) {
      for (let i = 0; i < group.count; i++) {
        const spawnIndex = i % this.cachedPaths.length;
        this.spawnQueue.push({ def: group.def, spawnIndex });
      }
    }

    this.spawnInterval = Math.max(300, waveData.enemies[0]?.interval || 1000);
    this.spawnTimer = 0;
  }

  private showWaveBanner(waveNum: number): void {
    const bannerBg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, 280, 60, 0x000000, 0)
      .setDepth(35);
    const bannerText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, `⚔️ Wave ${waveNum} 시작! ⚔️`, {
      fontSize: '22px', color: '#ff8a80', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(35).setAlpha(0);

    // Animate in
    this.tweens.add({
      targets: [bannerBg],
      fillAlpha: 0.6,
      duration: 200,
    });
    this.tweens.add({
      targets: bannerText,
      alpha: 1,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Hold, then fade out
        this.tweens.add({
          targets: [bannerText, bannerBg],
          alpha: 0,
          duration: 500,
          delay: 1000,
          onComplete: () => {
            bannerText.destroy();
            bannerBg.destroy();
          },
        });
      },
    });
  }

  private spawnEnemy(def: any, pathIndex: number): void {
    const path = this.cachedPaths[pathIndex % this.cachedPaths.length];
    if (!path || path.length < 2) return;

    const enemy = new Enemy(this, def, path);
    this.enemies.push(enemy);
  }

  private showFloatingText(x: number, y: number, text: string, color: string): void {
    const ft = this.add.text(x, y, text, {
      fontSize: '12px', color, fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(30);

    this.tweens.add({
      targets: ft,
      y: y - 30, alpha: 0,
      duration: 800,
      onComplete: () => ft.destroy(),
    });
  }

  private updateGoldDisplay(): void {
    this.goldText.setText(`${this.gold}`);
  }

  private updateHealthDisplay(): void {
    this.healthText.setText(`${this.villageHealth}/${this.maxVillageHealth}`);
    const ratio = Math.max(0, this.villageHealth / this.maxVillageHealth);
    this.healthBar.width = 80 * ratio;
    if (ratio < 0.3) {
      this.healthBar.setFillStyle(0xf44336, 0.9);
    } else if (ratio < 0.6) {
      this.healthBar.setFillStyle(0xff9800, 0.9);
    } else {
      this.healthBar.setFillStyle(0x4caf50, 0.9);
    }
  }

  // 등대 버프: 주변 타워에 대미지 증가 효과
  private getLighthouseBuff(tower: Tower): number {
    let buff = 1.0;
    for (const t of this.towers) {
      if (t.def.id === 'lighthouse' && t !== tower) {
        const dx = Math.abs(t.gridX - tower.gridX);
        const dy = Math.abs(t.gridY - tower.gridY);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= t.getRange()) {
          buff += 0.3 * t.level;
        }
      }
    }
    return buff;
  }

  update(time: number, delta: number): void {
    if (this.phase === 'victory' || this.phase === 'defeat') return;

    const dt = delta * this.gameSpeed;

    // 샘물 타워 골드 생성
    for (const tower of this.towers) {
      if (tower.def.id === 'spring') {
        tower.goldTimer += dt;
        const interval = 5000 / tower.level;
        if (tower.goldTimer >= interval) {
          tower.goldTimer -= interval;
          const goldGain = 10 * tower.level;
          this.gold += goldGain;
          this.totalGoldEarned += goldGain;
          this.updateGoldDisplay();
          const px = tower.gridX * CELL_SIZE + CELL_SIZE / 2;
          const py = tower.gridY * CELL_SIZE + MAP_TOP;
          this.showFloatingText(px, py, `+${goldGain}`, '#74b9ff');
        }
      }
    }

    if (this.phase === 'wave') {
      // 적 스폰
      if (this.spawnQueue.length > 0) {
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.spawnInterval) {
          this.spawnTimer -= this.spawnInterval;
          const next = this.spawnQueue.shift()!;
          this.spawnEnemy(next.def, next.spawnIndex);
        }
      }

      // 적 업데이트
      for (const enemy of this.enemies) {
        enemy.update(dt);

        // 마을 도달
        if (enemy.reachedVillage) {
          this.villageHealth--;
          this.updateHealthDisplay();
          this.cameras.main.shake(100, 0.005);

          if (this.villageHealth <= 0) {
            this.gameOver(false);
            return;
          }
        }
      }

      // 죽은/도달한 적 제거 (보상 처리 먼저)
      for (const enemy of this.enemies) {
        if (enemy.isDead) {
          this.gold += enemy.def.reward;
          this.totalGoldEarned += enemy.def.reward;
          this.totalEnemiesKilled++;
          this.updateGoldDisplay();
        }
      }
      this.enemies = this.enemies.filter(e => !e.isDead && !e.reachedVillage);

      // 타워 공격
      for (const tower of this.towers) {
        if (tower.def.id === 'spring' || tower.def.id === 'fence') continue;

        // 등대 자체는 공격하지 않고 버프만 제공
        if (tower.def.id === 'lighthouse') {
          // 등대: 주변에 버프 오라 비주얼 (가끔 표시)
          continue;
        }

        tower.update(time, dt, this.enemies);
      }

      // 웨이브 클리어 체크
      if (this.spawnQueue.length === 0 && this.enemies.length === 0) {
        this.currentWave++;
        this.waveText.setText(`물결 ${this.currentWave}/${this.totalWaves}`);

        if (this.currentWave >= this.totalWaves) {
          this.gameOver(true);
        } else {
          this.phase = 'between_waves';
          this.betweenWaveTimer = STAGE_CONFIG.waveIntervalMs;
          this.phaseText.setText(`다음 물결까지 준비하세요...`);
          this.startButton.setVisible(true);
          (this.startButton.getAt(1) as Phaser.GameObjects.Text).setText('▶ 다음 물결');
        }
      }
    }

    if (this.phase === 'between_waves') {
      this.betweenWaveTimer -= dt;
      if (this.betweenWaveTimer <= 0) {
        this.startWave();
      }
    }

    // 타워 슬롯 비용 색상 업데이트
    for (let i = 0; i < this.towerSlots.length; i++) {
      const costText = this.towerSlots[i].getAt(2) as Phaser.GameObjects.Text;
      const canAfford = this.gold >= this.availableTowers[i].cost;
      costText.setColor(canAfford ? '#ffd700' : '#ff4444');
    }
  }

  private gameOver(victory: boolean): void {
    this.phase = victory ? 'victory' : 'defeat';
    this.startButton.setVisible(false);
    this.closeActiveTowerMenu();

    // Submit score to SDK
    try {
      const sdk = (window as any).__sdk;
      const meta: Record<string, unknown> = {
        stage: this.stage,
        wavesCleared: this.currentWave,
        healthRemaining: this.villageHealth,
        goldEarned: this.totalGoldEarned,
        victory,
      };
      if (this.mode === 'weekly') {
        meta.weekly = true;
        meta.weeklySeed = this.weeklySeed;
      }
      sdk?.scores.submit({
        score: this.mode === 'weekly' ? this.calculateWeeklyScore() : this.stage,
        meta,
      }).catch(() => {});
    } catch (_) {}

    // 주간 챌린지 결과 저장
    if (this.mode === 'weekly') {
      this.saveWeeklyResult(victory);
    }

    // 진행도 저장 (일반 모드만)
    if (victory && this.mode !== 'weekly') {
      const saved = localStorage.getItem('ohf_progress');
      const progress = saved ? JSON.parse(saved) : { highestCleared: 0 };
      if (this.stage > progress.highestCleared) {
        progress.highestCleared = this.stage;
      }
      localStorage.setItem('ohf_progress', JSON.stringify(progress));
    }

    // 결과 화면
    const overlay = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0)
      .setOrigin(0).setDepth(40).setInteractive(); // 뒤쪽 클릭 차단
    this.tweens.add({ targets: overlay, fillAlpha: 0.7, duration: 500 });

    const resultContainer = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(41);
    resultContainer.setAlpha(0);
    this.tweens.add({ targets: resultContainer, alpha: 1, duration: 500, delay: 300 });

    // 결과 패널 배경 - taller to accommodate stats
    const panelBg = this.add.rectangle(0, 0, 300, 380, 0x1a1a2e, 0.95);
    panelBg.setStrokeStyle(2, victory ? 0xffd93d : 0x9b89b3, 0.8);
    resultContainer.add(panelBg);

    if (victory) {
      // 깨어남 연출: 배경색 전환
      this.tweens.addCounter({
        from: 0, to: 100, duration: 2000,
        onUpdate: (tween: Phaser.Tweens.Tween) => {
          const t = (tween.getValue?.() ?? 0) / 100;
          const r = Phaser.Math.Interpolation.Linear([0xe8, 0xff], t);
          const g = Phaser.Math.Interpolation.Linear([0xe0, 0xe8], t);
          const b = Phaser.Math.Interpolation.Linear([0xf0, 0xd6], t);
          this.cameras.main.setBackgroundColor(
            Phaser.Display.Color.GetColor(Math.round(r), Math.round(g), Math.round(b))
          );
        },
      });

      // 스타 평가
      const healthRatio = this.villageHealth / this.maxVillageHealth;
      const stars = healthRatio >= 1 ? 3 : healthRatio >= 0.5 ? 2 : 1;
      const starStr = '\u2B50'.repeat(stars) + '\u2606'.repeat(3 - stars);

      const isWeekly = this.mode === 'weekly';
      const titleLabel = isWeekly
        ? `\u2694\uFE0F \uC8FC\uAC04 \uCC4C\uB9B0\uC9C0 \uC644\uB8CC!`
        : '\uD83C\uDF05 \uB9C8\uC744\uC774 \uAE68\uC5B4\uB0AC\uC2B5\uB2C8\uB2E4!';
      const titleColor = isWeekly ? WEEKLY_COLORS.ACCENT_HEX : '#ffd93d';

      const title = this.add.text(0, -160, titleLabel, {
        fontSize: '18px', color: titleColor, fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5);

      const starsText = this.add.text(0, -125, starStr, {
        fontSize: '28px',
      }).setOrigin(0.5);

      // ==================== VICTORY STATS ====================
      const statsLines = [
        `\uC794\uC5EC \uCCB4\uB825: ${this.villageHealth}/${this.maxVillageHealth}`,
        `\uCC98\uCE58\uD55C \uC801: ${this.totalEnemiesKilled}\uB9C8\uB9AC`,
        `\uBC30\uCE58\uD55C \uC218\uD638\uD0D1: ${this.totalTowersBuilt}\uAC1C`,
        `\uD68D\uB4DD\uD55C \uACE8\uB4DC: ${this.totalGoldEarned}G`,
        `\uB0A8\uC740 \uACE8\uB4DC: ${this.gold}G`,
      ];

      if (isWeekly) {
        const score = this.calculateWeeklyScore();
        statsLines.unshift(`\uC810\uC218: ${score}\uC810`);
        statsLines.push('');
        statsLines.push(`${getWeekLabel()} \uCC4C\uB9B0\uC9C0`);
        const best = this.getWeeklyBest();
        if (best) {
          statsLines.push(`\uC774\uBC88 \uC8FC \uCD5C\uACE0: ${best.score}\uC810`);
        }
      }

      const statsInfo = this.add.text(0, isWeekly ? -45 : -55, statsLines.join('\n'), {
        fontSize: '12px', color: '#cccccc',
        lineSpacing: 6, align: 'center',
      }).setOrigin(0.5);

      resultContainer.add([title, starsText, statsInfo]);

      if (isWeekly) {
        // 다시 도전 버튼
        const retryBtn = this.createResultButton(0, 70, '\uD83D\uDD04 \uB2E4\uC2DC \uB3C4\uC804', WEEKLY_COLORS.ACCENT, () => {
          this.scene.restart({ mode: 'weekly', seed: this.weeklySeed });
        });
        resultContainer.add(retryBtn);

        // 타이틀로 돌아가기
        const menuBtn = this.createResultButton(0, 115, '\uD83C\uDFE0 \uD0C0\uC774\uD2C0\uB85C', 0x555555, () => {
          this.scene.start('TitleScene');
        });
        resultContainer.add(menuBtn);
      } else {
        // 다음 스테이지 버튼
        const nextBtn = this.createResultButton(0, 50, '\u25B6 \uB2E4\uC74C \uC2A4\uD14C\uC774\uC9C0', 0x2e7d32, () => {
          this.scene.restart({ stage: this.stage + 1 });
        });
        resultContainer.add(nextBtn);

        // 다시 도전 버튼
        const retryBtn = this.createResultButton(0, 95, '\uD83D\uDD04 \uB2E4\uC2DC \uB3C4\uC804', 0x555555, () => {
          this.scene.restart({ stage: this.stage });
        });
        resultContainer.add(retryBtn);

        // 스테이지 선택 버튼
        const menuBtn = this.createResultButton(0, 140, '\uD83C\uDFE0 \uC2A4\uD14C\uC774\uC9C0 \uC120\uD0DD', 0x555555, () => {
          this.scene.start('StageSelectScene');
        });
        resultContainer.add(menuBtn);
      }
    } else {
      const isWeekly = this.mode === 'weekly';
      const defeatTitle = isWeekly
        ? `\u2694\uFE0F \uCC4C\uB9B0\uC9C0 \uC2E4\uD328...`
        : '\uD83D\uDE34 \uB9C8\uC744\uC774 \uC7A0\uB4E4\uC5C8\uC2B5\uB2C8\uB2E4...';
      const defeatColor = isWeekly ? WEEKLY_COLORS.ACCENT_HEX : '#9b89b3';

      const title = this.add.text(0, -150, defeatTitle, {
        fontSize: '18px', color: defeatColor, fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5);

      // ==================== DEFEAT STATS ====================
      const infoLines = [
        `\uBB3C\uACB0 ${this.currentWave}/${this.totalWaves}\uC5D0\uC11C \uC2E4\uD328`,
        ``,
        `\uCC98\uCE58\uD55C \uC801: ${this.totalEnemiesKilled}\uB9C8\uB9AC`,
        `\uBC30\uCE58\uD55C \uC218\uD638\uD0D1: ${this.totalTowersBuilt}\uAC1C`,
        `\uD68D\uB4DD\uD55C \uACE8\uB4DC: ${this.totalGoldEarned}G`,
        `\uB0A8\uC740 \uC218\uD638\uD0D1: ${this.towers.length}\uAC1C`,
      ];

      if (isWeekly) {
        const score = this.calculateWeeklyScore();
        infoLines.splice(1, 0, `\uC810\uC218: ${score}\uC810`);
        infoLines.push('');
        infoLines.push(`${getWeekLabel()} \uCC4C\uB9B0\uC9C0`);
      }

      const info = this.add.text(0, -70, infoLines.join('\n'), {
        fontSize: '13px', color: '#cccccc',
        lineSpacing: 5, align: 'center',
      }).setOrigin(0.5);

      resultContainer.add([title, info]);

      if (isWeekly) {
        const retryBtn = this.createResultButton(0, 40, '\uD83D\uDD04 \uB2E4\uC2DC \uB3C4\uC804', WEEKLY_COLORS.ACCENT, () => {
          this.scene.restart({ mode: 'weekly', seed: this.weeklySeed });
        });
        resultContainer.add(retryBtn);

        const menuBtn = this.createResultButton(0, 90, '\uD83C\uDFE0 \uD0C0\uC774\uD2C0\uB85C', 0x555555, () => {
          this.scene.start('TitleScene');
        });
        resultContainer.add(menuBtn);
      } else {
        const retryBtn = this.createResultButton(0, 40, '\uD83D\uDD04 \uB2E4\uC2DC \uB3C4\uC804', COLORS.UI_ACCENT, () => {
          this.scene.restart({ stage: this.stage });
        });
        resultContainer.add(retryBtn);

        const menuBtn = this.createResultButton(0, 90, '\uD83C\uDFE0 \uC2A4\uD14C\uC774\uC9C0 \uC120\uD0DD', 0x555555, () => {
          this.scene.start('StageSelectScene');
        });
        resultContainer.add(menuBtn);
      }
    }
  }

  // ==================== 주간 챌린지 헬퍼 ====================
  private calculateWeeklyScore(): number {
    const waveScore = this.currentWave * 100;
    const healthBonus = this.villageHealth * 50;
    const killBonus = this.totalEnemiesKilled * 10;
    const goldBonus = Math.floor(this.totalGoldEarned / 10);
    return waveScore + healthBonus + killBonus + goldBonus;
  }

  private saveWeeklyResult(victory: boolean): void {
    try {
      const result = {
        seed: this.weeklySeed,
        score: this.calculateWeeklyScore(),
        wavesCleared: this.currentWave,
        totalWaves: this.totalWaves,
        healthRemaining: this.villageHealth,
        goldEarned: this.totalGoldEarned,
        enemiesKilled: this.totalEnemiesKilled,
        victory,
        timestamp: Date.now(),
      };
      const key = `ohf_weekly_${this.weeklySeed}`;
      const existing = localStorage.getItem(key);
      if (existing) {
        const prev = JSON.parse(existing);
        if (result.score > prev.score) {
          localStorage.setItem(key, JSON.stringify(result));
        }
      } else {
        localStorage.setItem(key, JSON.stringify(result));
      }
    } catch (_) { /* ignore */ }
  }

  private getWeeklyBest(): { score: number; wavesCleared: number; victory: boolean } | null {
    try {
      const key = `ohf_weekly_${this.weeklySeed}`;
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  private createResultButton(x: number, y: number, text: string, bgColor: number, callback: () => void): Phaser.GameObjects.Container {
    const bg = this.add.rectangle(0, 0, 200, 36, bgColor, 0.9);
    bg.setStrokeStyle(1, 0xffffff, 0.4);
    const label = this.add.text(0, 0, text, {
      fontSize: '14px', color: '#ffffff',
    }).setOrigin(0.5);

    const btn = this.add.container(x, y, [bg, label]);
    btn.setSize(200, 36);
    btn.setInteractive();
    btn.on('pointerdown', callback);
    return btn;
  }
}
