# Playground

A monorepo of browser-based games built with TypeScript and Vite.

## Structure

```
playground/
├── packages/sdk/       Shared SDK (auth, scores, saves, leaderboard, multiplayer)
├── games/              10 browser games
│   ├── korean-word-puzzle
│   ├── beat-drop
│   ├── bluff-party
│   ├── infinite-mosaic
│   ├── draw-alive
│   ├── one-hand-fortress
│   ├── destruction-sandbox
│   ├── roguelike-deckbuilder
│   ├── whisper-garden
│   └── pocket-biome
└── portal/             Portal landing page
```

## Getting Started

```bash
pnpm install
pnpm build:sdk
pnpm dev
```

## Games

| Game | Description |
|------|-------------|
| korean-word-puzzle | Korean word puzzle game |
| beat-drop | Rhythm-based game |
| bluff-party | Social deduction party game |
| infinite-mosaic | Procedural mosaic art game |
| draw-alive | Draw and watch your creations come alive |
| one-hand-fortress | One-handed tower defense |
| destruction-sandbox | Physics-based destruction sandbox |
| roguelike-deckbuilder | Roguelike card game |
| whisper-garden | Atmospheric garden game |
| pocket-biome | Pocket ecosystem simulator |

## SDK

The `@playground/sdk` package provides shared functionality for all games:

- **Auth** - User authentication with localStorage fallback
- **Scores** - Score submission and history
- **Saves** - Game state persistence
- **Leaderboard** - Rankings and leaderboards
- **Multiplayer** - Real-time multiplayer (WebSocket stub)

```typescript
import { PlaygroundSDK } from '@playground/sdk';

const sdk = PlaygroundSDK.init({
  apiUrl: 'https://api.playground.example.com',
  game: 'my-game',
});

await sdk.scores.submit({ score: 1000 });
await sdk.saves.save({ level: 5, inventory: [...] });
```
