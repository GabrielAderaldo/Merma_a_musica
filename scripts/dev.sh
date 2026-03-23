#!/usr/bin/env bash
# dev.sh — Inicia ambiente de desenvolvimento
#
# RESPONSABILIDADES:
# - Iniciar backend (Phoenix server na porta 4000)
# - Iniciar frontend dev server (SolidStart na porta 3000)
# - Ambos em paralelo

set -e

echo "=== Iniciando Backend (Phoenix + Gleam) ==="
cd apps/game_orchestrator && mix phx.server &
BACKEND_PID=$!

echo "=== Iniciando Frontend (SolidJS + Bun) ==="
cd apps/frontend && bun dev &
FRONTEND_PID=$!

echo ""
echo "Backend:  http://localhost:4000"
echo "Frontend: http://localhost:3000"
echo ""
echo "Ctrl+C para parar ambos."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
