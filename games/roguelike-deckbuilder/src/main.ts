import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './utils/constants';
import { MainMenuScene } from './scenes/MainMenuScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { DungeonMapScene } from './scenes/DungeonMapScene';
import { BattleScene } from './scenes/BattleScene';
import { CardRewardScene } from './scenes/CardRewardScene';
import { RestScene } from './scenes/RestScene';
import { ShopScene } from './scenes/ShopScene';
import { TreasureScene } from './scenes/TreasureScene';
import { EventScene } from './scenes/EventScene';
import { RunResultScene } from './scenes/RunResultScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#1A1A2E',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [
    MainMenuScene,
    CharacterSelectScene,
    DungeonMapScene,
    BattleScene,
    CardRewardScene,
    RestScene,
    ShopScene,
    TreasureScene,
    EventScene,
    RunResultScene,
  ],
};

new Phaser.Game(config);
