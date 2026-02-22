#!/usr/bin/env bash
# FoundU — start backend + frontend in development mode
set -e

PNPM="${HOME}/Library/pnpm/pnpm"
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "==> Clearing port conflicts..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

echo "==> Starting FoundU dev servers..."
echo ""

# Trap Ctrl-C and kill all child processes
trap 'kill 0' INT TERM

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m'

# Start backend with prefixed output
"$PNPM" --filter @foundu/backend dev 2>&1 | \
  while IFS= read -r line; do printf "${BLUE}[backend]${NC}  %s\n" "$line"; done &

# Small delay so backend starts logging first
sleep 0.3

# Start frontend with prefixed output
"$PNPM" --filter foundu-frontend dev 2>&1 | \
  while IFS= read -r line; do printf "${GREEN}[frontend]${NC} %s\n" "$line"; done &

echo ""
echo "  Backend  → http://localhost:3001"
echo "  Frontend → http://localhost:3000"
echo "  API docs → http://localhost:3001/api/v1/docs"
echo ""
echo "  Press Ctrl-C to stop all servers"
echo ""

wait
