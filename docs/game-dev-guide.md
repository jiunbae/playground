# Game Development Guide

## Creating a New Game

### 1. Scaffold
```bash
mkdir games/my-new-game
cd games/my-new-game
npm init -y
npm install vite typescript --save-dev
```

### 2. package.json
```json
{
  "name": "@playground/my-new-game",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "devDependencies": {
    "vite": "^8.0.0",
    "typescript": "^5.7.0"
  }
}
```

### 3. vite.config.ts
```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',  // ⚠️ REQUIRED: relative paths for subdirectory serving
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
  server: { port: 3000 },
});
```

### 4. index.html
```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
  <title>게임 이름</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

### 5. Register
- Add to `portal/index.html`
- Add to blog's `src/data/playground.ts`

## Quality Checklist

### 필수 (Must Have)
- [ ] `base: './'` in vite.config (없으면 서브디렉토리에서 404)
- [ ] 한국어 UI 텍스트 (영문 서브타이틀 OK)
- [ ] 모바일 터치 입력 지원
- [ ] 첫 방문 온보딩/튜토리얼
- [ ] 게임 방법 도움말 버튼
- [ ] `npx vite build` 빌드 성공
- [ ] 브라우저 콘솔 에러 0개
- [ ] 메인 메뉴 → 게임 플레이 → 결과/메뉴 복귀 루프 완성

### 권장 (Should Have)
- [ ] 44px 이상 터치 타겟
- [ ] 로딩 상태 표시
- [ ] 에러 피드백 (잘못된 입력, 불가능한 액션)
- [ ] 뒤로가기 버튼
- [ ] localStorage 기반 통계/세이브
- [ ] 점수/결과 공유 기능

### 비주얼 기준 (Visual Quality)
- [ ] 프로시저럴 에셋 (단순 원/사각형 금지 — 고유 도형, 그라데이션, 그림자)
- [ ] 히트/클릭 피드백 애니메이션
- [ ] 화면 전환 애니메이션 (페이드, 슬라이드)
- [ ] 일관된 색상 팔레트
- [ ] 반응형 레이아웃 (모바일/태블릿/데스크톱)

## Common Patterns

### Canvas Game Loop
```typescript
let lastTime = performance.now();

function gameLoop(now: number) {
  const dt = Math.min((now - lastTime) / 1000, 0.05); // Cap at 50ms
  lastTime = now;

  update(dt);
  render();
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
```

### Screen/Scene Management
```typescript
type Screen = 'menu' | 'playing' | 'results';
let screen: Screen = 'menu';

function render() {
  switch (screen) {
    case 'menu': renderMenu(); break;
    case 'playing': renderGame(); break;
    case 'results': renderResults(); break;
  }
}
```

### Touch + Mouse Input
```typescript
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  handleInput(e.clientX, e.clientY);
});
```

### Responsive Canvas
```typescript
function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();
```

## Phaser Games

draw-alive, one-hand-fortress, roguelike-deckbuilder use Phaser 3.

```typescript
import Phaser from 'phaser';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',  // Must match HTML id
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [MenuScene, GameScene, ResultScene],
};

new Phaser.Game(config);
```

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| 404 on assets after deploy | `base` not set to `'./'` | Add `base: './'` to vite.config |
| Blank screen | JS references missing DOM id | Check index.html has matching id |
| Touch not working | Missing touch event handlers | Use `pointerdown` instead of `click` |
| Canvas not sizing | No resize handler | Add `window.addEventListener('resize', resize)` |
| Game freezes | Infinite loop in update | Cap dt, check for NaN in physics |
