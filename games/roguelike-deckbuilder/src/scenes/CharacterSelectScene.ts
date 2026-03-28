import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, GAME_HEIGHT, ELEMENT_ICONS, ELEMENT_COLORS } from '../utils/constants';
import { UIHelper } from '../ui/UIHelper';
import { ALL_CHARACTERS, CharacterData } from '../data/characters';
import { gameState } from '../systems/GameState';
import { MapGenerator } from '../systems/MapGenerator';

export class CharacterSelectScene extends Phaser.Scene {
  private selectedIndex = 0;
  private characterContainers: Phaser.GameObjects.Container[] = [];
  private detailContainer?: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'CharacterSelect' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.BG_PRIMARY);
    this.selectedIndex = 0;
    this.characterContainers = [];

    // Title
    this.add.text(GAME_WIDTH / 2, 60, '캐릭터 선택', {
      fontSize: '32px', fontFamily: 'sans-serif', color: COLORS.ACCENT_HEX, fontStyle: 'bold',
    }).setOrigin(0.5);

    // Character cards
    const cardWidth = 190;
    const totalWidth = ALL_CHARACTERS.length * cardWidth + (ALL_CHARACTERS.length - 1) * 15;
    const startX = (GAME_WIDTH - totalWidth) / 2 + cardWidth / 2;

    ALL_CHARACTERS.forEach((char, i) => {
      const x = startX + i * (cardWidth + 15);
      const container = this.createCharacterCard(char, x, 250, i);
      this.characterContainers.push(container);
    });

    this.updateSelection();

    // Start button
    UIHelper.createButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 100, 260, 55,
      '⚔️ 던전 진입', () => this.startRun(), COLORS.BUTTON, 24);

    // Back button
    UIHelper.createButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 40, 140, 35,
      '← 뒤로', () => this.scene.start('MainMenu'), COLORS.DARK_GRAY, 16);

    UIHelper.fadeIn(this);
  }

  private createCharacterCard(char: CharacterData, x: number, y: number, index: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const color = ELEMENT_COLORS[char.element];

    const bg = this.add.rectangle(0, 0, 180, 260, 0x222233, 0.9);
    bg.setStrokeStyle(2, COLORS.CARD_BORDER);
    bg.setInteractive({ useHandCursor: true });

    bg.on('pointerdown', () => {
      this.selectedIndex = index;
      this.updateSelection();
    });

    // Element icon large
    const icon = this.add.text(0, -80, ELEMENT_ICONS[char.element], {
      fontSize: '48px',
    }).setOrigin(0.5);

    // Name
    const name = this.add.text(0, -30, char.name, {
      fontSize: '22px', fontFamily: 'sans-serif', color: COLORS.TEXT_HEX, fontStyle: 'bold',
    }).setOrigin(0.5);

    // Title
    const title = this.add.text(0, -5, char.title, {
      fontSize: '14px', fontFamily: 'sans-serif', color: '#AAAAAA',
    }).setOrigin(0.5);

    // HP
    const hp = this.add.text(0, 25, `❤️ HP: ${char.hp}`, {
      fontSize: '14px', fontFamily: 'sans-serif', color: '#FF6666',
    }).setOrigin(0.5);

    // Passive
    const passiveName = this.add.text(0, 55, `✨ ${char.passiveName}`, {
      fontSize: '13px', fontFamily: 'sans-serif', color: COLORS.ACCENT_HEX,
    }).setOrigin(0.5);

    const passiveDesc = this.add.text(0, 80, char.passiveDescription, {
      fontSize: '11px', fontFamily: 'sans-serif', color: '#999999',
      align: 'center', wordWrap: { width: 160 },
    }).setOrigin(0.5);

    // Deck count
    const deckInfo = this.add.text(0, 110, `🃏 시작 덱: ${char.startingDeckIds.length}장`, {
      fontSize: '12px', fontFamily: 'sans-serif', color: '#888888',
    }).setOrigin(0.5);

    container.add([bg, icon, name, title, hp, passiveName, passiveDesc, deckInfo]);
    container.setData('bg', bg);
    return container;
  }

  private updateSelection(): void {
    this.characterContainers.forEach((c, i) => {
      const bg = c.getData('bg') as Phaser.GameObjects.Rectangle;
      if (i === this.selectedIndex) {
        bg.setStrokeStyle(3, COLORS.ACCENT);
        c.setScale(1.05);
      } else {
        bg.setStrokeStyle(2, COLORS.CARD_BORDER);
        c.setScale(1.0);
      }
    });
  }

  private startRun(): void {
    const character = ALL_CHARACTERS[this.selectedIndex];
    const run = gameState.startRun(character);

    // Generate map for Act 1
    const mapGen = new MapGenerator();
    const dungeonMap = mapGen.generate(1, run.rng);

    this.scene.start('DungeonMap', { map: dungeonMap });
  }
}
