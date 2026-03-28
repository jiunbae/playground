# Playground — Project Guidelines

## Overview
Browser-based game collection. Monorepo with pnpm workspaces.
Deployed to `jiun.dev/games/*` via GitHub Actions → `jiunbae.github.io`.

## Architecture

```
playground/                  ← This repo (jiunbae/playground)
├── packages/sdk/            ← @playground/sdk (shared game SDK)
├── games/{game-name}/       ← 10 individual games
├── portal/                  ← Game listing page
└── .github/workflows/       ← CI/CD

jiun-api (separate repo)     ← api.jiun.dev
├── /games/scores            ← Score submission & history
├── /games/leaderboard       ← Per-game leaderboards
├── /games/saves             ← Cloud save/load
└── /games/ws/:game          ← WebSocket multiplayer

jiunbae.github.io (blog)    ← jiun.dev
└── public/games/            ← Static game builds (auto-deployed)
```

## Build & Dev Commands
```bash
pnpm install                              # Install all deps
pnpm -r --filter './games/*' build        # Build all games
pnpm --filter @playground/sdk build       # Build SDK only
pnpm --filter @playground/beat-drop dev   # Dev single game
bash scripts/deploy-local.sh              # Manual deploy to blog
```

## Adding a New Game
1. Create `games/{game-name}/` with `package.json`, `vite.config.ts`, `index.html`, `src/`
2. Set `"name": "@playground/{game-name}"` in package.json
3. Set `base: './'` in vite.config to ensure relative asset paths
4. Add entry to `portal/index.html`
5. Add entry to blog's `src/data/playground.ts`

## Game Development Rules
- **한국어 우선**: 모든 유저 대면 텍스트는 한국어. 영문 서브타이틀은 OK
- **모바일 우선**: 터치 입력 필수. 최소 44px 터치 타겟. `touch-action: none`
- **오프라인 우선**: API 없이 localStorage로 완전 동작. SDK 연동은 점진적
- **온보딩 필수**: 첫 방문 시 게임 방법을 반드시 안내
- **Vite + TypeScript**: Canvas 또는 Phaser 3 사용. base: './' 필수
- **빌드 검증**: `npx vite build` 통과 필수. 0 console errors 목표

## SDK Integration Pattern
```typescript
import { PlaygroundSDK } from '@playground/sdk';

const sdk = PlaygroundSDK.init({
  apiUrl: 'https://api.jiun.dev',
  game: 'beat-drop',
});

// Offline-first: works without login
await sdk.scores.submit({ score: 9500, grade: 'S' });

// Online features: activated after login
if (await sdk.auth.loginIfAvailable()) {
  await sdk.saves.sync();
  const board = await sdk.leaderboard.top(10);
}
```

## Deployment
- **Auto**: Push to `main` → GitHub Actions builds all → deploys to `jiun.dev/games/`
- **Manual**: `bash scripts/deploy-local.sh` → copy to blog → git push blog
- **Requires**: `DEPLOY_TOKEN` secret in GitHub repo settings for auto-deploy

## Tech Stack per Game

| Game | Engine | Key Libs |
|------|--------|----------|
| korean-word-puzzle | Vite + TS | DOM + CSS |
| beat-drop | Vite + TS | Canvas + Web Audio |
| bluff-party | Vite + TS | DOM (innerHTML) |
| infinite-mosaic | Vite + TS | Canvas |
| draw-alive | Vite + JS | Phaser 3 + Matter.js |
| one-hand-fortress | Vite + TS | Phaser 3 |
| destruction-sandbox | Vite + JS | Matter.js |
| roguelike-deckbuilder | Vite + TS | Phaser 3 |
| whisper-garden | Vite + TS | Canvas + Web Audio |
| pocket-biome | Vite + TS | Canvas |
