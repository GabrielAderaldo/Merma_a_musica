# Imagem da apps/api (ADR-0017, ADR-0018). Contexto: a raiz do repositório.
#   docker build -f deploy/api.Containerfile -t ghcr.io/gabrieladeraldo/merma-api:<versão> .
# O Bun roda o TypeScript direto, sem build: a imagem leva o código das workspaces e as dependências de produção da
# API e das que ela usa (@merma/domain, @merma/schema). Digests do image index multi-arch, como no resto do deploy.
FROM docker.io/oven/bun:1.4.4@sha256:1d22548f177f4ff38e0c15baa3c2c46c6c2060ba2d1bc573bb4720b407548f1d AS deps
WORKDIR /app
COPY . .
RUN bun install --production --filter '@merma/api...'

# Distroless: sem shell, como nonroot pela unit (merma-api.container). O ENTRYPOINT da imagem já é o bun.
FROM docker.io/oven/bun:1.4.4-distroless@sha256:153a951ae40106e125898103e6e990ee0f38e6aee7f561029e26cf9fbed23470
WORKDIR /app/apps/api
COPY --from=deps /app /app
CMD ["--disallow-code-generation-from-strings=strict", "/app/apps/api/src/index.ts"]
