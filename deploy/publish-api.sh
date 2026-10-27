#!/usr/bin/env bash
# Builda a imagem da apps/api e publica no GHCR (ADR-0017.R3). Imprime a referência por digest que o merma-deploy usa.
# Roda na raiz do repositório, com a árvore limpa: a tag é o commit, e uma imagem tem de corresponder a um commit.
#   deploy/publish-api.sh
# Login: o token do gh (escopo write:packages) vai só pelo stdin do `docker login`, nunca na tela. O Docker sem
# credential helper grava o token em texto puro no ~/.docker/config.json, por isso o logout no fim, aconteça o que for.
set -euo pipefail

readonly REPO=ghcr.io/gabrieladeraldo/merma-api

if [[ -n $(git status --porcelain) ]]; then
  echo "publish-api: há mudança não commitada; commite antes, para a imagem corresponder a um commit" >&2
  exit 1
fi
tag=$(git rev-parse --short=12 HEAD)

trap 'docker logout ghcr.io >/dev/null 2>&1' EXIT
gh auth token | docker login ghcr.io -u "$(gh api user --jq .login)" --password-stdin >/dev/null
docker build -q -f deploy/api.Containerfile -t "$REPO:$tag" . >/dev/null
docker push -q "$REPO:$tag" >/dev/null
docker inspect --format '{{index .RepoDigests 0}}' "$REPO:$tag"
