import Phaser from 'phaser';
import { PlaygroundSDK } from '@playground/sdk';
import { BootScene } from './scenes/BootScene.js';
import { OnboardingScene } from './scenes/OnboardingScene.js';
import { MainMenuScene } from './scenes/MainMenuScene.js';
import { StageSelectScene } from './scenes/StageSelectScene.js';
import { GameplayScene } from './scenes/GameplayScene.js';
import { SandboxScene } from './scenes/SandboxScene.js';
import { ResultScene } from './scenes/ResultScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 720,
    height: 1280,
  },
  backgroundColor: '#FFF8F0',
  physics: {
    default: 'matter',
    matter: {
      gravity: { y: 1 },
      debug: false,
      setBounds: {
        left: true,
        right: true,
        top: false,
        bottom: true,
      },
    },
  },
  scene: [
    BootScene,
    OnboardingScene,
    MainMenuScene,
    StageSelectScene,
    GameplayScene,
    SandboxScene,
    ResultScene,
  ],
};

const game = new Phaser.Game(config);

// Initialize Playground SDK
try {
  window.__sdk = PlaygroundSDK.init({ apiUrl: 'https://api.jiun.dev', game: 'draw-alive' });
} catch (_) {
  // SDK init failed — game continues without it
}
