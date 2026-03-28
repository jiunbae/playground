import Phaser from 'phaser';
import { PlaygroundSDK } from '@playground/sdk';
import { GAME_WIDTH, GAME_HEIGHT } from './config/GameConfig';
import { TitleScene } from './scenes/TitleScene';
import { StageSelectScene } from './scenes/StageSelectScene';
import { GameScene } from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#e8e0f0',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [TitleScene, StageSelectScene, GameScene],
  input: {
    touch: {
      capture: true,
    },
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false,
  },
};

new Phaser.Game(config);

// Initialize Playground SDK
try {
  (window as any).__sdk = PlaygroundSDK.init({ apiUrl: 'https://api.jiun.dev', game: 'one-hand-fortress' });
} catch (_) {
  // SDK init failed — game continues without it
}
