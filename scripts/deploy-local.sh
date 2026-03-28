#!/bin/bash
# Build all games and copy to blog repo
set -e

echo "Building all games..."
pnpm -r --filter './games/*' build

echo "Copying to blog..."
BLOG_DIR="${BLOG_DIR:-$HOME/workspace/jiunbae.github.io}"
for game in games/*/; do
  name=$(basename "$game")
  if [ -d "$game/dist" ]; then
    rm -rf "$BLOG_DIR/public/games/$name"
    cp -r "$game/dist" "$BLOG_DIR/public/games/$name"
  fi
done

echo "Done! Now cd $BLOG_DIR && git add public/games/ && git commit && git push"
