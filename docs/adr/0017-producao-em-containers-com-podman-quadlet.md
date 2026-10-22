---
id: ADR-0017
title: Rodar a produção em containers com Podman + Quadlet, num pod só
status: proposed
date: 2026-10-21
supersedes: null
scope: ["apps/api/**", "apps/web/**", ".github/**", "deploy/**"]
revisit_when: "A PoC numa VPS de teste falhar em rootless com 80/443 ou no rollback do podman auto-update, ou a Fase 1 (N VPS) chegar"
---

# ADR-0017 — Rodar a produção em containers com Podman + Quadlet, num pod só

## Contexto

O [`operations.md`](../operations.md#topologia-da-fase-0) descreve a produção nativa: systemd com `git pull` → `bun install` → build direto na VPS. Assim, o Bun e as libs da VPS podem divergir das do CI (`oven-sh/setup-bun` no runner `ubuntu-latest`), e a Fase 1 exigiria reproduzir a VPS à mão. O mantenedor quer a produção em containers, com exatamente o mesmo runtime que passou no CI.

O app limita a escolha. As salas vivem na memória de um processo só ([ADR-0002](0002-servidor-hono-single-writer.md)) e se recuperam pelo snapshot no Redis ([ADR-0009](0009-snapshot-da-partida-em-redis.md)). Por isso o deploy é hard-cut, e troca sem queda (blue/green) não traz ganho. O Caddy já tem papel definido (TLS, `apps/web/dist`, headers S-30 a S-32). A VPS tem 2 vCPU e 4 GB, e há um mantenedor só.

## Decisão

Produção em **Podman 5.x com Quadlet**: cada container é uma unit do systemd, com logs no journald.

- Um **pod** (`merma.pod`) com quatro containers que compartilham o loopback:
  - Caddy 2;
  - `apps/api` em `oven/bun:1.4.3-distroless`;
  - Postgres 17;
  - Redis 8.
- Só o pod publica `80` e `443`. Postgres, Redis e a API escutam em `127.0.0.1`, e a topologia do `operations.md` continua valendo dentro do pod.
- Imagens referenciadas por **digest** (`@sha256:…`), publicadas no GHCR.
- O CI roda os checks **dentro** da imagem `oven/bun:1.4.3` fixada pelo mesmo digest da produção, no lugar do `setup-bun`. A imagem de teste é a `debian` e a de produção é a `distroless`, ambas glibc.
- Segredos via `Secret=` do Quadlet (`podman secret`), nunca em variável de ambiente no arquivo da unit.
- Deploy: hard-cut, sem trocar o desenho do `operations.md`. Puxar a imagem nova e reiniciar a unit da API; o `RecoveryService` reidrata as salas.

Fica para a PoC, antes de virar `accepted`:

1. Rootless com 80/443: `net.ipv4.ip_unprivileged_port_start` ou rootful.
2. O rollback do `podman auto-update` dispara com `Notify=healthy` + `HealthCmd=`. A doc do auto-update fala em READY via sd_notify; a doc do Quadlet diz que `Notify=healthy` espera o healthcheck.
3. RAM ociosa do pod numa VPS de 4 GB.

## Restrições

- **ADR-0017.R1** MUST rodar Caddy, `apps/api`, Postgres e Redis de produção como containers Quadlet num único pod. — Check: pendente — PoC numa VPS de teste
- **ADR-0017.R2** MUST publicar só as portas 80 e 443, e só no pod; Postgres, Redis e API escutam em `127.0.0.1`. — Check: pendente — teste de config dos arquivos Quadlet
- **ADR-0017.R3** MUST referenciar toda imagem por digest, e o CI MUST testar na mesma versão do Bun da imagem de produção. — Check: pendente — verificação no CI de que os arquivos Quadlet e o workflow não têm tag sem digest
- **ADR-0017.R4** MUST NOT pôr segredo em `Environment=` ou no arquivo da unit; só `Secret=`. — Check: pendente — verificação dos arquivos Quadlet no CI
- **ADR-0017.R5** MUST NOT usar container no desenvolvimento: a aplicação roda nativa e Postgres e Redis vêm da `~/.infra`. — Check: Review: mantenedor

## Consequências

- O runtime que passou no CI é o que roda em produção, e a Fase 1 vira "instalar Podman e copiar as units".
- Sem daemon e com units do systemd: RTO, restart e logs seguem o que o `operations.md` já assume.
- O backup do Postgres passa a ser `podman exec … pg_dump`, e os volumes do pod precisam de caminho e permissão definidos.
- Abrimos mão da paridade de ferramenta com o Mac (OrbStack é Docker). Pouco pesa, porque em dev nada roda em container.
- Risco: Quadlet tem menos material que Compose. A PoC existe para pagar esse risco antes do `accepted`.

## Alternativas descartadas

- Docker Engine + Compose: **plano B** se a PoC falhar. Daemon root, e o restart e a ordem de subida do Compose duplicam o systemd.
- Rede interna em vez de pod: tira o Redis do loopback e fere o [ADR-0009](0009-snapshot-da-partida-em-redis.md).R3.
- Kamal 2: a troca sem queda não serve a salas em memória, e o kamal-proxy tomaria o lugar do Caddy.
- Coolify / Dokploy: de 0,5 a 1,2 GB ociosos numa VPS de 4 GB, com proxy próprio; o Dokploy tem uma parte proprietária.
- Dokku / CapRover: mais uma camada entre o app e o Caddy; o CapRover depende do Swarm.
- k3s: Kubernetes inteiro para um processo.
- Docker Swarm: desenvolvimento praticamente parado.
- Nomad: licença BUSL, não open source.
- Incus com imagens OCI: `incus-compose` em beta e problemas relatados de PID 1 e UID/GID.

## Fontes

- Quadlet: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- `podman auto-update` (rollback): https://docs.podman.io/en/latest/markdown/podman-auto-update.1.html
- kamal-proxy: https://github.com/basecamp/kamal-proxy
- Tags `oven/bun:1.4.3` (`distroless` 46,6 MB, `debian` 90,3 MB, aferido em 2026-10-21): https://hub.docker.com/r/oven/bun/tags
- Incus 7.0 LTS: https://discuss.linuxcontainers.org/t/incus-7-0-lts-has-been-released/26641
- Topologia atual: [`operations.md`](../operations.md#topologia-da-fase-0)
