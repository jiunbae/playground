# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Browser)                      │
│                                                              │
│  jiun.dev/games/{game}/     jiun.dev/playground/             │
│  ┌──────────────────┐      ┌─────────────────┐              │
│  │   Game (Vite)     │      │  Portal Page     │              │
│  │   ┌────────────┐  │      │  (Game List)     │              │
│  │   │@playground/ │  │      └─────────────────┘              │
│  │   │   sdk       │  │                                      │
│  │   └─────┬──────┘  │                                      │
│  └─────────┼─────────┘                                      │
│            │ fetch / WebSocket                               │
└────────────┼────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────┐
│   api.jiun.dev (Hono+Bun)  │
│                            │
│   /auth/*      OAuth+JWT   │
│   /games/scores     CRUD   │
│   /games/leaderboard  R    │
│   /games/saves     CRUD    │
│   /games/ws/:game    WS    │
│                            │
│   MongoDB (game_scores,    │
│    game_saves, game_sessions│
│    )                       │
└────────────────────────────┘
```

## Data Flow

### 1. Offline Mode (Default)
```
Game → localStorage
  - scores: playground_{game}_scores
  - saves:  playground_{game}_save_{slot}
  - stats:  playground_{game}_stats
```

### 2. Online Mode (After Login)
```
Game → @playground/sdk → api.jiun.dev → MongoDB
  ↕ localStorage (cache + offline fallback)
```

### 3. Multiplayer (WebSocket)
```
Player A → sdk.multiplayer.send(data)
              → ws://api.jiun.dev/games/ws/{game}
              → broadcast to room
              → Player B receives via sdk.multiplayer.onMessage()
```

## Deployment Pipeline

```
Developer pushes to jiunbae/playground main
    │
    ▼
GitHub Actions (.github/workflows/deploy.yml)
    │
    ├─ pnpm install
    ├─ Build SDK (@playground/sdk)
    ├─ Build all games (parallel)
    ├─ Collect dist/ artifacts
    │
    ▼
Deploy to jiunbae/jiunbae.github.io
    └─ public/games/{game-name}/index.html + assets/
    │
    ▼
GitHub Pages serves jiun.dev/games/*
```

## API Endpoints

### Scores
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /games/scores | Required | Submit score |
| GET | /games/leaderboard/:game | Public | Top scores (best per user) |
| GET | /games/leaderboard/:game/me | Required | Scores around user's rank |
| GET | /games/scores/:game | Required | User's score history |
| GET | /games/scores/:game/best | Required | User's personal best |

### Saves
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /games/saves/:game | Required | Save game state (upsert by slot) |
| GET | /games/saves/:game | Required | Load all save slots |
| GET | /games/saves/:game/:slot | Required | Load specific slot |

### Multiplayer
| Protocol | Path | Auth | Description |
|----------|------|------|-------------|
| WebSocket | /games/ws/:game?token=JWT | Query param | Real-time game session |

## Database Schema

### game_scores
```
{ userId, game, score, grade?, metadata?, createdAt }
Indexes: { game: 1, score: -1 }, { userId: 1, game: 1, score: -1 }
```

### game_saves
```
{ userId, game, slot, data, updatedAt, createdAt }
Index: { userId: 1, game: 1, slot: 1 } (unique)
```

### game_sessions
```
{ game, hostUserId, players[], state, gameData?, createdAt }
```
