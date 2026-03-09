#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Instalando dependências do Game Engine (Gleam)..."
cd "$ROOT_DIR/apps/game_engine"
gleam deps download

echo ""
echo "==> Instalando dependências do Game Orchestrator (Elixir)..."
cd "$ROOT_DIR/apps/game_orchestrator"
mix deps.get
mix ecto.setup

echo ""
echo "==> Instalando dependências do Frontend (Deno + SvelteKit)..."
cd "$ROOT_DIR/apps/frontend"
deno install

echo ""
echo "==> Setup completo!"
