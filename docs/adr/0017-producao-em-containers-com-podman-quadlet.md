---
id: ADR-0017
title: Rodar a produção em containers com Podman + Quadlet, num pod só
status: proposed
date: 2026-10-21
supersedes: null
scope: ["apps/api/**", "apps/web/**", ".github/**", "deploy/**"]
revisit_when: "O primeiro deploy numa VPS real divergir da PoC (boot, network-online, RAM), ou a Fase 1 (N VPS) chegar"
---

# ADR-0017 — Rodar a produção em containers com Podman + Quadlet, num pod só

## Contexto

O [`operations.md`](../operations.md#topologia-da-fase-0) descreve a produção nativa: systemd com `git pull` → `bun install` → build direto na VPS. Assim, o Bun e as libs da VPS podem divergir das do CI (`oven-sh/setup-bun` no runner `ubuntu-latest`), e a Fase 1 exigiria reproduzir a VPS à mão. O mantenedor quer a produção em containers, com exatamente o mesmo runtime que passou no CI.

O app limita a escolha. As salas vivem na memória de um processo só ([ADR-0002](0002-servidor-hono-single-writer.md)) e se recuperam pelo snapshot no Redis ([ADR-0009](0009-snapshot-da-partida-em-redis.md)). Por isso o deploy é hard-cut, e troca sem queda (blue/green) não traz ganho. O Caddy já tem papel definido (TLS, `apps/web/dist`, headers S-30 a S-32). A VPS tem 2 vCPU e 4 GB, e há um mantenedor só.

## Decisão

Produção em **Podman 5.x com Quadlet**, **rootless**, sob um usuário de serviço dedicado com linger. Cada container é uma unit do systemd, com logs no journald. Os arquivos estão em [`deploy/quadlet/`](../../deploy/quadlet/).

- Um **pod** (`merma.pod`) com quatro containers que compartilham o loopback:
  - Caddy 2;
  - `apps/api` em `oven/bun:1.4.4-distroless` ([ADR-0018](0018-bun-1-4-4.md)), rodando como `65532` (a imagem declara `User=0`);
  - Postgres 17;
  - Redis 8, rodando como `redis`.
- Só o pod publica `80`, `443` e `443/udp`. Postgres, Redis e a API escutam em `127.0.0.1`, e a topologia do `operations.md` continua valendo dentro do pod.
- Imagens referenciadas por **digest** (`@sha256:…`), publicadas no GHCR. O CI roda os checks **dentro** da imagem `oven/bun:1.4.4` fixada pelo mesmo digest da produção, no lugar do `setup-bun`. A imagem de teste é a `debian` e a de produção é a `distroless`, ambas glibc.
- Segredos via `Secret=…,type=mount` do Quadlet (`podman secret`), nunca em `Environment=`.
- **Deploy pelo [`deploy/merma-deploy`](../../deploy/merma-deploy)**, não pelo `podman auto-update`:
  1. grava o digest novo num drop-in (`merma-api.container.d/image.conf`);
  2. reinicia **só** a `merma-api.service`;
  3. o `Notify=healthy` faz o restart esperar o healthcheck;
  4. se a API não ficar healthy em 30s, volta para o digest anterior.
- Host:
  - `net.ipv4.ip_unprivileged_port_start=80` em `/etc/sysctl.d/`;
  - `loginctl enable-linger` no usuário de serviço;
  - o `network-online.target` do sistema precisa ficar ativo.

### Resultado da PoC (2026-10-21, VM Ubuntu 26.04.1 arm64 no OrbStack, Podman 5.7.0)

| Ponto | Resultado |
|---|---|
| Rootless com 80/443 | ✅ Com o sysctl. Sem ele, o pasta falha em `UDP */443: Permission denied`. O usuário de serviço precisa de faixa em `/etc/subuid` (o `useradd` cria); sem ela, nenhuma imagem desempacota. |
| Ponta a ponta | ✅ Caddy (TLS) → API → Postgres 17.11 e Redis 8.10.2. WebSocket pelo proxy. `new Function` bloqueado pela flag do S-27 na distroless. Portas 3000, 5432, 6379 e 2019 fechadas fora do pod. |
| Hard-cut da API | ✅ Stop em 120 ms + start até healthy em 5,4 s; `merma-deploy` em 7 s. Postgres, Redis e Caddy não reiniciam. |
| Rollback com `podman auto-update` | ❌ Num pod, ele reinicia a unit **do pod**, derruba os quatro containers e julga o sucesso pelo pod. A API quebrada ficou em loop de restart, e o rollback não disparou. |
| Rollback com `merma-deploy` | ✅ A imagem quebrada voltou sozinha para a anterior em 32 s, sem tocar nos outros serviços. |
| RAM ociosa | ✅ ~66 MB nos containers: Postgres 31, Caddy 21, API 8,8, Redis 5,6. A VM inteira subiu ~120 MB com Podman, conmon e pasta. |
| Reboot | ✅ Os cinco serviços voltam pelo linger. ⚠️ No OrbStack o `network-online.target` não fica ativo: a unit do Podman espera 90 s por ele. Conferir na VPS real. |

Outros achados da PoC:

- Um PID 1 sem handler ignora o SIGTERM, e o stop vira SIGKILL depois de 10 s. Valia para o Bun 1.4.3 e vale para `sh -c` com pipe. O Bun 1.4.4 diz sair com 128 + o sinal quando é PID 1 (release notes, não reverificado na PoC); o handler continua necessário para gravar o snapshot (R8).
- O cache do build reaproveitou a camada do `ENV` mesmo com outro `--build-arg`. Por isso o build de release é feito em contexto limpo, com `--no-cache`.

## Restrições

- **ADR-0017.R1** MUST rodar Caddy, `apps/api`, Postgres e Redis de produção como containers Quadlet num único pod. — Check: `deploy/quadlet.test.ts`
- **ADR-0017.R2** MUST publicar só 80, 443 e 443/udp, e só no pod; Postgres, Redis e API escutam em `127.0.0.1`. — Check: `deploy/quadlet.test.ts`
- **ADR-0017.R3** MUST referenciar toda imagem por digest, e o CI MUST testar na mesma versão do Bun da imagem de produção. — Check: `deploy/quadlet.test.ts` (digest) + `scripts/harness.test.ts` (CI, `packageManager` e imagem na mesma versão)
- **ADR-0017.R4** MUST NOT pôr segredo em `Environment=` ou no arquivo da unit; só `Secret=`. — Check: `deploy/quadlet.test.ts`
- **ADR-0017.R5** MUST NOT usar container no desenvolvimento: a aplicação roda nativa e Postgres e Redis vêm da `~/.infra`. — Check: Review: mantenedor
- **ADR-0017.R6** MUST NOT usar `AutoUpdate=` nem `podman auto-update`; o deploy é pelo `deploy/merma-deploy`. — Check: `deploy/quadlet.test.ts`
- **ADR-0017.R7** MUST ter `Notify=healthy` e `HealthCmd=` em todo container, para o restart esperar o serviço de fato. — Check: `deploy/quadlet.test.ts`
- **ADR-0017.R8** MUST tratar SIGTERM na `apps/api`: gravar o snapshot das salas e sair, dentro dos 10 s antes do SIGKILL. — Check: pendente (apps/api) — teste de shutdown

## Consequências

- O runtime que passou no CI é o que roda em produção, e a Fase 1 vira "instalar Podman, criar o usuário e copiar as units".
- Sem daemon e com units do systemd: RTO, restart e logs seguem o que o `operations.md` já assume. O hard-cut medido (~7 s) cabe com folga na meta de < 30 s.
- Deploy que falha fica fora do ar por até ~32 s antes do rollback. Pior que a meta, mas só no caso de erro.
- O backup do Postgres passa a ser `podman exec … pg_dump`.
- Abrimos mão da paridade de ferramenta com o Mac (OrbStack é Docker). Pouco pesa, porque em dev nada roda em container.

## Alternativas descartadas

- Docker Engine + Compose: plano B, não foi preciso. Daemon root, e o restart e a ordem de subida do Compose duplicam o systemd.
- `podman auto-update` com rollback: reprovado na PoC (ver a tabela).
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
- `podman auto-update`: https://docs.podman.io/en/latest/markdown/podman-auto-update.1.html
- kamal-proxy: https://github.com/basecamp/kamal-proxy
- Tags `oven/bun:1.4.3` (`distroless` 46,6 MB, `debian` 90,3 MB, aferido em 2026-10-21) e `1.4.4-distroless` (digest `sha256:153a951a…`, aferido em 2026-10-26): https://hub.docker.com/r/oven/bun/tags
- Incus 7.0 LTS: https://discuss.linuxcontainers.org/t/incus-7-0-lts-has-been-released/26641
- PoC: [`deploy/`](../../deploy/)
