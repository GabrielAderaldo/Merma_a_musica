# ADR 0009: Snapshot de partida ativa em Redis

- **Status:** accepted
- **Data:** 2026-05-13
- **Decisores:** core

## Contexto

A escolha inicial era **memória pura** para a partida ativa (estado do `Room`/`Match`/`Round` vive apenas no processo Bun que detém aquela sala — ver [ADR-0002](0002-server-hono.md) sobre o padrão single-writer-per-room).

Trade-off resultante: **crash de processo, deploy ou reboot da VPS = 20 jogadores perdem a partida na metade**. Para a primeira iteração do MVP era considerado tolerável, mas em discussão arquitetural foi decidido que **a experiência de partida interrompida não é aceitável** — afetaria diretamente o pilar de design "ritmo rápido, zero tempo morto" e a percepção de qualidade do jogo.

Precisamos de um mecanismo de **recovery sem custo operacional alto**:
- Reescrever para event sourcing seria overkill.
- Postgres para snapshot a cada 5s polui o banco principal com escrita transiente.
- Memória pura + "aceitar a perda" foi rejeitada pelo time.

## Decisão

Adotar **Redis** como **store transiente de snapshot da partida ativa**.

### Como funciona

1. Cada `RoomActor` faz snapshot do seu estado serializado em Redis a cada **5 segundos** (configurável), apenas quando a sala está em `state ∈ {in_match, reveal}`. Lobby vazio/idle não escreve.
2. Chave Redis: `room:{invite_code}:snapshot` com TTL de **30 minutos** (auto-cleanup).
3. Payload: JSON do estado completo necessário para retomar a partida: roster de jogadores, configuração da partida, índice da rodada atual, resposta de cada jogador, placar acumulado, audio_token corrente.
4. **Em crash/reboot:** ao subir, cada node verifica se há salas órfãs (snapshots no Redis sem `RoomActor` vivo) e re-hidrata. Jogadores que reconectarem dentro da janela (~2 min) caem direto na partida onde pararam.
5. **Quando a partida termina** (`game_ended`): o snapshot é deletado imediatamente (não esperar TTL).

### Por que Redis (e não Postgres)

- Latência de escrita típica < 1ms.
- TTL nativo (auto-cleanup de salas mortas sem job de limpeza).
- Estrutura `HASH`/`STRING` simples cobre nosso caso — sem JOINs.
- Operação simples: 1 container Redis 7.x rodando na mesma VPS no MVP; cluster Redis Sentinel pós-MVP se virar gargalo.

### Onde NÃO usar Redis

- **Dados persistentes** (contas conectadas, recordes pessoais do modo solo, histórico de partidas) continuam em **Postgres** ([ADR-0006](0006-postgres-drizzle.md)). Redis é só para estado **vivo** que perde valor após o término da partida.
- **Pub/Sub entre nodes** — não usar Redis Pub/Sub para coordenar nodes; sticky routing por `invite_code` ([ADR-0002](0002-server-hono.md)) elimina a necessidade.

## Alternativas consideradas

| Alternativa | Por que foi rejeitada |
|---|---|
| **Memória pura + aceitar a perda** | Pilar "ritmo rápido / zero tempo morto" do GDD não combina com partida interrompida; UX inaceitável. |
| **Postgres para snapshot** | Latência de escrita (~5-15ms) + poluir o banco principal com churn transiente + maior custo operacional. |
| **Event sourcing completo (replay desde game_started)** | Overkill — não precisamos auditoria; recovery snapshot é o necessário. Complexidade ~3× maior. |
| **SQLite local em cada node** | Não compartilhado entre nodes; se a sala precisa migrar (rolling deploy) o estado fica preso. |
| **Memcached** | Sem persistência; reboot do container Memcached = perde tudo. Redis com `appendonly` resolve. |
| **In-memory replicado via Bun IPC** | Bun tem IPC entre processos, mas não tem cluster nativo robusto; reinventaria Redis ruim. |

## Consequências

- **Positivas:**
  - **Recovery automático** em crash/deploy. Limite: snapshot é a cada 5s, então até 5s de progresso pode se perder. UX: jogador reconecta, "rodada N reiniciou" no pior caso. Aceitável.
  - **Habilita rolling deploy** ([ADR-0010-deploy](#) — a discutir): node antigo serializa, node novo lê.
  - **Métrica trivial:** `redis_room_snapshots_total`, `redis_recovery_count` viram observabilidade.
  - **TTL nativo** elimina necessidade de job de limpeza.
- **Negativas / trade-offs:**
  - **+1 dependency operacional** (Redis). Mais um processo para monitorar, backup (mínimo, `appendonly`), upgrade.
  - **Latência adicional** em escrita: ~1ms por snapshot — irrelevante porque é fora do caminho crítico (não bloqueia `submit_answer`).
  - **Snapshots serializam dados sensíveis** (respostas dos jogadores em andamento). Cuidado: Redis dev sem auth na VPS é vetor de leak. Mitigação: Redis bind 127.0.0.1 + senha forte + sem expor porta externamente.
- **Neutras:**
  - Tamanho típico de snapshot: ~5–15 KB por sala (20 jogadores). 10.000 salas = ~50–150 MB total em Redis. Insignificante.

## Notas

- **Inicial:** 1 container Redis 7.x na mesma VPS, bind localhost, AOF habilitado.
- **Cliente:** `bun:sql` não cobre Redis. Usar `bun.redis` (nativo Bun) ou `ioredis` se preciso de feature avançada. **Preferência por `bun.redis`** quando estável — alinhado com [ADR-0001](0001-runtime-bun-and-ts-6.md).
- **Configuração do snapshot interval:** começa em 5s, pode ser reduzido (1-2s) se UX melhorar pouco; ou aumentado (10s) se Redis ficar pressionado.
- **Pós-MVP:** se >5k salas concorrentes virarem realidade, considerar Redis Sentinel (HA) e/ou Redis Streams para eventos de domínio assíncronos.
- **NFR alvo:** recovery completo de uma sala (snapshot → RoomActor vivo aceitando WS) em < 200ms.
