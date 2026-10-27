---
id: ADR-0017
title: Rodar a produção em containers com Podman + Quadlet, num pod só
status: accepted
date: 2026-10-21
revised: 2026-10-27
supersedes: null
scope: ["apps/api/**", "apps/web/**", ".github/**", "deploy/**"]
revisit_when: "A VPS de produção divergir do staging (boot, network-online, RAM), o Caddy do host deixar de servir, ou a Fase 1 (N VPS) chegar"
---

# ADR-0017 — Rodar a produção em containers com Podman + Quadlet, num pod só

## Contexto

O [`operations.md`](../operations.md#topologia-da-fase-0) descreve a produção nativa: systemd com `git pull` → `bun install` → build direto na VPS. Assim, o Bun e as libs da VPS podem divergir das do CI (`oven-sh/setup-bun` no runner `ubuntu-latest`), e a Fase 1 exigiria reproduzir a VPS à mão. O mantenedor quer a produção em containers, com exatamente o mesmo runtime que passou no CI.

O app limita a escolha. As salas vivem na memória de um processo só ([ADR-0002](0002-servidor-hono-single-writer.md)) e se recuperam pelo snapshot no Redis ([ADR-0009](0009-snapshot-da-partida-em-redis.md)). Por isso o deploy é hard-cut, e troca sem queda (blue/green) não traz ganho. O Caddy já tem papel definido (TLS, `apps/web/dist`, headers S-30 a S-32). A VPS tem 2 vCPU e 4 GB, e há um mantenedor só.

Revisão de 2026-10-27: o staging sobe na VM do caninha-games (outro projeto do mantenedor), onde um Caddy nativo já ocupa 80 e 443. O mantenedor escolheu que o Caddy fique no host em **todo** ambiente, e não só nessa VM: um conjunto só de units, e o staging igual à produção. A VM tem 1 vCPU e, desde o upgrade para o Ubuntu 26.04 (que trouxe o Podman 5; com 1 GB, o boot dava kernel panic por falta de memória), 2 GB. Por isso, cada container ganha um teto de memória.

## Decisão

Produção em **Podman 5.x com Quadlet**, **rootless**, sob um usuário de serviço dedicado com linger. Cada container é uma unit do systemd, com logs no journald. Os arquivos estão em [`deploy/quadlet/`](../../deploy/quadlet/).

- Um **pod** (`merma.pod`) com três containers que compartilham o loopback:
  - `apps/api` em `oven/bun:1.4.4-distroless` ([ADR-0018](0018-bun-1-4-4.md)), rodando como `65532` (a imagem declara `User=0`);
  - Postgres 17;
  - Redis 8, rodando como `redis`.
- O **Caddy 2 roda no host**, nativo pelo apt e fora do pod. Ele cuida do TLS, dos headers S-30 e S-31, dos estáticos do `apps/web` e do proxy para a API. O bloco do Mermã fica em [`deploy/caddy/merma.caddy`](../../deploy/caddy/merma.caddy) e vai para `/etc/caddy/sites/`, que o Caddyfile do host importa. Assim ele convive com outro site na mesma VM.
- O pod publica só `127.0.0.1:3000`. Postgres e Redis escutam em `127.0.0.1` do pod, e nada dele fica exposto para fora da VM.
- Cada container tem teto de memória (`Memory=`). Se faltar RAM, o OOM mata o Mermã antes do que mais estiver na VM.
- Imagens referenciadas por **digest** (`@sha256:…`), e a da API publicada no GHCR. A da API sai de [`deploy/api.Containerfile`](../../deploy/api.Containerfile). O CI roda os checks **dentro** da imagem `oven/bun:1.4.4` fixada pelo mesmo digest da produção, no lugar do `setup-bun`. A imagem de teste é a `debian` e a de produção é a `distroless`, ambas glibc.
- Segredos via `Secret=` do Quadlet (`podman secret`), nunca em `Environment=`. O Postgres e o Redis recebem o segredo montado em arquivo (`type=mount`); a API recebe como variável de ambiente (`type=env`), porque lê tudo do ambiente (`apps/api/src/config.ts`). O que não é segredo e muda por host (`PUBLIC_BASE_URL`, o `client_id` do Spotify) fica num `EnvironmentFile=` do usuário de serviço.
- **Deploy pelo [`deploy/merma-deploy`](../../deploy/merma-deploy)**, não pelo `podman auto-update`:
  1. grava o digest novo num drop-in (`merma-api.container.d/image.conf`);
  2. reinicia **só** a `merma-api.service`;
  3. o `Notify=healthy` faz o restart esperar o healthcheck;
  4. se a API não ficar healthy em 30s, volta para o digest anterior.
- Host:
  - `loginctl enable-linger` no usuário de serviço;
  - o `network-online.target` do sistema precisa ficar ativo;
  - a rede do pod é `pasta:--host-lo-to-ns-lo`. Sem a flag, o que chega em `127.0.0.1:3000` do host cai na interface do pod, não no loopback, e a API responde com reset. Com o Caddy no host, o sysctl de porta baixa da PoC deixou de ser preciso.

### Resultado do staging (2026-10-27, Magalu BV1-2-10, 1 vCPU e 2 GB, Ubuntu 26.04.1, Podman 5.7.0)

Validou os pontos que a PoC deixou em aberto. Por isso a ADR passou a `accepted` nesta data.

| Ponto | Resultado |
|---|---|
| `network-online.target` | ✅ Ativo; boot em 12 s. |
| Ponta a ponta | ✅ Caddy do host (TLS, Let's Encrypt) → API → Postgres e Redis. WebSocket 101, migrações no boot e `/metrics` fechado para fora. |
| `merma-deploy` | ✅ API healthy em 6 s, sem reiniciar Postgres e Redis. |
| RAM ociosa | ✅ API 42 MB, Postgres 28 MB, Redis 8,6 MB, todos abaixo do `Memory=`. A VM inteira, com o caninha-games, usa ~520 MB. |
| Ubuntu 24.04 | ❌ Só tem o Podman 4.9; o `.pod` e o `Notify=healthy` pedem 5.0+. Com 1 GB, o 26.04 dava kernel panic no boot. |

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

- **ADR-0017.R1** MUST rodar `apps/api`, Postgres e Redis de produção como containers Quadlet num único pod, com o Caddy no host. — Check: `deploy/quadlet.test.ts`
- **ADR-0017.R2** MUST publicar só `127.0.0.1:3000`, e só no pod; Postgres, Redis e API escutam em `127.0.0.1`. — Check: `deploy/quadlet.test.ts`
- **ADR-0017.R3** MUST referenciar toda imagem por digest, e o CI MUST testar na mesma versão do Bun da imagem de produção. — Check: `deploy/quadlet.test.ts` (digest) + `scripts/harness.test.ts` (CI, `packageManager` e imagem na mesma versão)
- **ADR-0017.R4** MUST NOT pôr segredo em `Environment=` ou no arquivo da unit; só `Secret=`. — Check: `deploy/quadlet.test.ts`
- **ADR-0017.R5** MUST NOT usar container no desenvolvimento: a aplicação roda nativa e Postgres e Redis vêm da `~/.infra`. — Check: Review: mantenedor
- **ADR-0017.R6** MUST NOT usar `AutoUpdate=` nem `podman auto-update`; o deploy é pelo `deploy/merma-deploy`. — Check: `deploy/quadlet.test.ts`
- **ADR-0017.R7** MUST ter `Notify=healthy` e `HealthCmd=` em todo container, para o restart esperar o serviço de fato. — Check: `deploy/quadlet.test.ts`
- **ADR-0017.R8** MUST tratar SIGTERM na `apps/api`: gravar o snapshot das salas e sair, dentro dos 10 s antes do SIGKILL. — Check: `apps/api/src/shutdown.test.ts`
- **ADR-0017.R9** MUST pôr teto de memória (`Memory=`) em todo container. — Check: `deploy/quadlet.test.ts`
- **ADR-0017.R10** MUST NOT expor `/metrics` pelo Caddy; só se chega a ele pelo loopback da VM. — Check: `deploy/caddy.test.ts`

## Consequências

- O runtime que passou no CI é o que roda em produção, e a Fase 1 vira "instalar Podman, criar o usuário e copiar as units".
- Sem daemon e com units do systemd: RTO, restart e logs seguem o que o `operations.md` já assume. O hard-cut medido (~7 s) cabe com folga na meta de < 30 s.
- Deploy que falha fica fora do ar por até ~32 s antes do rollback. Pior que a meta, mas só no caso de erro.
- O backup do Postgres passa a ser `podman exec … pg_dump`.
- O Caddy fica fora da fixação por digest. Ele vem do apt do host, atualizado pelo sistema, e a versão pode divergir entre VPS.
- Na VM compartilhada, um erro no bloco `merma.caddy` impede o Caddy de recarregar, e isso afeta o outro site. Por isso, valide com `caddy validate` antes de recarregar.
- Abrimos mão da paridade de ferramenta com o Mac (OrbStack é Docker). Pouco pesa, porque em dev nada roda em container.

## Alternativas descartadas

- Docker Engine + Compose: plano B, não foi preciso. Daemon root, e o restart e a ordem de subida do Compose duplicam o systemd.
- `podman auto-update` com rollback: reprovado na PoC (ver a tabela).
- Caddy dentro do pod, publicando 80 e 443: era a versão de 2026-10-21. Não convive com outro Caddy na VM do staging, e duas variantes de units custariam mais.
- Caddy do pod servindo também o outro site da VM: um deploy quebrado do Mermã derrubaria o outro projeto.
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
