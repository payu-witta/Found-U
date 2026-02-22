#!/usr/bin/env bash
set -e

# FoundU Local Development Startup Script
# Run from repo root: bash scripts/dev.sh

echo "=== FoundU Dev Setup ==="

# 1. Install all workspace dependencies
echo "[1/4] Installing dependencies..."
pnpm install

# 2. Build shared packages (backend depends on these)
echo "[2/4] Building shared packages..."
pnpm --filter @foundu/db build
pnpm --filter @foundu/ai build

# 3. Start backend (background)
echo "[3/4] Starting backend on :3001..."
pnpm --filter @foundu/backend dev &
BACKEND_PID=$!

# Give backend a moment to boot
sleep 3

# 4. Start frontend
echo "[4/4] Starting frontend on :3000..."
pnpm --filter foundu-frontend dev &
FRONTEND_PID=$!

echo ""
echo "=== FoundU running ==="
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:3001"
echo "  Press Ctrl+C to stop both"
echo ""

# Trap Ctrl+C to kill both
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM
wait
