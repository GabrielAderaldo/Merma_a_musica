#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Inicia o backend (Phoenix + Game Engine) e o frontend em paralelo
echo "==> Iniciando Game Orchestrator (Phoenix) na porta 4000..."
cd "$ROOT_DIR/apps/game_orchestrator"
mix phx.server &
BACKEND_PID=$!

echo "==> Iniciando Frontend (SvelteKit) na porta 5173..."
cd "$ROOT_DIR/apps/frontend"
deno task dev &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT

wait
