# @playground/sdk — Integration Guide

## Installation

SDK is a workspace package. In any game's code:
```typescript
import { PlaygroundSDK } from '@playground/sdk';
```

Add to game's package.json:
```json
{
  "dependencies": {
    "@playground/sdk": "workspace:*"
  }
}
```

## Initialization

```typescript
const sdk = PlaygroundSDK.init({
  apiUrl: 'https://api.jiun.dev',  // Production API
  game: 'beat-drop',               // Game identifier (must match folder name)
});
```

The SDK operates in **offline-first mode** by default. All features fall back to localStorage when:
- User is not logged in
- API is unreachable
- Network errors occur

## Auth

```typescript
// Check if user is already logged in (from previous session)
const user = await sdk.auth.loginIfAvailable();
if (user) {
  console.log(`Welcome back, ${user.name}`);
}

// Get current user (null if not logged in)
const currentUser = sdk.auth.getUser();

// Logout
sdk.auth.logout();
```

Auth uses JWT tokens from `api.jiun.dev/auth/*` (Google/GitHub/Twitter OAuth).
Token is stored in localStorage and auto-refreshed.

## Scores

```typescript
// Submit a score (works offline — queued and synced on next login)
await sdk.scores.submit({
  score: 9500,
  grade: 'S',                    // Optional: S, A, B, C, D
  metadata: {                    // Optional: game-specific data
    maxCombo: 142,
    accuracy: 0.97,
    difficulty: 'Hard',
  },
});

// Get personal best
const best = await sdk.scores.getMyBest();
// { score: 9500, grade: 'S', metadata: {...}, createdAt: '...' }

// Get score history
const history = await sdk.scores.getHistory();
// [{ score: 9500, ... }, { score: 8200, ... }, ...]
```

## Leaderboard

```typescript
// Top 10 (public, no auth needed)
const top = await sdk.leaderboard.top(10);
// [{ userId, name, score, grade }, ...]

// Scores around my rank (auth needed)
const around = await sdk.leaderboard.aroundMe();
// [{ rank: 42, ... }, { rank: 43, me: true, ... }, { rank: 44, ... }]
```

## Saves

```typescript
// Save game state (slot 0-2, defaults to 0)
await sdk.saves.save({
  level: 5,
  deck: ['strike', 'defend', 'bash'],
  hp: 42,
  gold: 150,
});

// Load (returns null if no save exists)
const save = await sdk.saves.load();
if (save) {
  game.restoreState(save.data);
}

// Sync local saves with cloud (call after login)
await sdk.saves.sync();
```

## Multiplayer

```typescript
// Connect to a game room
const room = await sdk.multiplayer.connect();

// Send data to other players
sdk.multiplayer.send({
  type: 'move',
  x: 100,
  y: 200,
});

// Receive data from other players
sdk.multiplayer.onMessage((data, fromUserId) => {
  if (data.type === 'move') {
    updateOpponent(data.x, data.y);
  }
});

// Disconnect
sdk.multiplayer.disconnect();
```

## Offline Behavior

| Feature | Offline Behavior |
|---------|-----------------|
| Scores | Saved to localStorage, synced on next login |
| Saves | localStorage only |
| Leaderboard | Returns cached data or empty array |
| Multiplayer | Not available (requires connection) |

## Per-Game Integration Checklist

- [ ] `PlaygroundSDK.init()` in game entry point
- [ ] Score submission on game over / level complete
- [ ] Save/load for persistent game state
- [ ] Leaderboard display (if applicable)
- [ ] Multiplayer (if applicable: bluff-party, one-hand-fortress PvP)
- [ ] Login button in settings/menu (optional, not blocking)
