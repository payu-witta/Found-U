#!/usr/bin/env bash
# FoundU — production build (packages must be built in dependency order)
set -e

export PATH="$HOME/Library/pnpm:$PATH"
PNPM="$(which pnpm)"
ROOT="$(cd "$(dirname "$0")" && pwd)"

step() { echo ""; echo "==> $*"; }

step "Building @foundu/ai..."
"$PNPM" --filter @foundu/ai build

step "Building @foundu/db..."
"$PNPM" --filter @foundu/db build

step "Building @foundu/backend..."
"$PNPM" --filter @foundu/backend build

step "Building foundu-frontend..."
"$PNPM" --filter foundu-frontend build

echo ""
echo "✓ All packages built successfully"
