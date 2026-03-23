#!/usr/bin/env bash
# setup.sh — Setup inicial do ambiente de desenvolvimento
#
# RESPONSABILIDADES:
# - Instalar dependências do Game Engine (Gleam)
# - Instalar dependências do Game Orchestrator (Mix + Gleam)
# - Instalar dependências do Frontend (Bun)

set -e

echo "=== Setup: Game Engine (Gleam) ==="
cd apps/game_engine && gleam deps download && cd ../..

echo "=== Setup: Game Orchestrator (Elixir + Gleam) ==="
cd apps/game_orchestrator && mix deps.get && cd ../..

echo "=== Setup: Frontend (SolidJS + Bun) ==="
cd apps/frontend && bun install && cd ../..

echo "=== Setup completo! ==="
echo "Use ./scripts/dev.sh para iniciar o desenvolvimento."
