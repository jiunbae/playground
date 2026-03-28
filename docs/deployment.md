# Deployment Guide

## Auto Deployment (GitHub Actions)

Push to `main` → `.github/workflows/deploy.yml` triggers:

1. Install pnpm + Node 22
2. `pnpm install`
3. Build SDK → Build all games
4. Collect `dist/` from each game → `deploy/games/`
5. Push to `jiunbae/jiunbae.github.io` `public/games/`

### Setup Required
- GitHub Secret `DEPLOY_TOKEN`: Personal access token with `repo` scope for `jiunbae.github.io`
- Set in: `jiunbae/playground` → Settings → Secrets → Actions

### URL Mapping
```
games/beat-drop/dist/       → jiun.dev/games/beat-drop/
games/korean-word-puzzle/dist/ → jiun.dev/games/korean-word-puzzle/
```

## Manual Local Deployment

```bash
cd ~/workspace/playground

# Build all
pnpm install
pnpm --filter @playground/sdk build
pnpm -r --filter './games/*' build

# Deploy to blog
bash scripts/deploy-local.sh

# Push blog
cd ~/workspace/jiunbae.github.io
git add public/games/
git commit -m "deploy: Update playground games"
git push
```

## Deploy Single Game

```bash
cd ~/workspace/playground

# Build one game
pnpm --filter @playground/beat-drop build

# Copy to blog
BLOG=~/workspace/jiunbae.github.io
rm -rf $BLOG/public/games/beat-drop
cp -r games/beat-drop/dist $BLOG/public/games/beat-drop

# Push blog
cd $BLOG && git add public/games/beat-drop && git commit -m "deploy: Update beat-drop" && git push
```

## Blog Integration

### Portal Page
Blog's `src/data/playground.ts` contains the game card list for the `/playground/` page.
When adding a new game, also add an entry here:

```typescript
{
  slug: '/games/my-new-game/',
  title: '게임 이름',
  description: '게임 설명',
  gradient: 'linear-gradient(...)',
  date: '2026-03-28',
  tags: ['Canvas', 'Physics']
}
```

### Asset Path Rule
All games MUST use `base: './'` in vite.config.
This ensures `<script src="./assets/index-xxx.js">` instead of `/assets/index-xxx.js`.
Without this, games break when served at `jiun.dev/games/{name}/`.

## Environments

| Env | Games URL | API URL | Notes |
|-----|-----------|---------|-------|
| Local dev | localhost:3000 | localhost:3000 (jiun-api) | `pnpm --filter @playground/{game} dev` |
| Production | jiun.dev/games/* | api.jiun.dev | GitHub Pages + K3s |
