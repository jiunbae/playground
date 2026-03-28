import { PlaygroundSDK } from '@playground/sdk';
import { Game } from './game/Game.js';

// Initialize Playground SDK
try {
  window.__sdk = PlaygroundSDK.init({ apiUrl: 'https://api.jiun.dev', game: 'destruction-sandbox' });
} catch (_) {
  // SDK init failed — game continues without it
}

const canvas = document.getElementById('game-canvas');
const uiLayer = document.getElementById('ui-layer');

const game = new Game(canvas, uiLayer);

// Game loop
let lastTime = 0;

function gameLoop(timestamp) {
  const delta = Math.min(timestamp - lastTime, 33); // Cap at ~30fps delta
  lastTime = timestamp;

  game.update(delta);
  game.render();

  requestAnimationFrame(gameLoop);
}

// Initialize and start
game.init().then(() => {
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
});

// Prevent context menu on long press
document.addEventListener('contextmenu', (e) => e.preventDefault());

// Handle visibility change (auto-pause)
document.addEventListener('visibilitychange', () => {
  if (document.hidden && (game.state === 'playing' || game.state === 'sandbox')) {
    game.pause();
  }
});
