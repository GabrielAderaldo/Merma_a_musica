# Estrutura do Monorepo — "Mermã, a Música!"

Guia rápido explicando o objetivo de cada diretório do monolito modular.

## Raiz

- `apps/`: aplicações executáveis ou serviços principais (gateway, orquestrador, engine, playlist e progressão).
- `libs/`: módulos compartilháveis (núcleo de domínio, adapters e shared kernel).
- `infra/`: recursos de infraestrutura, deploy e observabilidade.
- `scripts/`: utilitários CLI para tarefas de desenvolvimento, build e manutenção.
- `tools/`: ferramentas auxiliares (linters customizados, geradores, etc.).
- `doc/`: documentação do domínio e arquitetural.

## apps/

- `apps/frontend/`: Frontend SvelteKit + Deno. Conecta com o backend via Phoenix Channels (WebSocket) e REST.
- `apps/game_orchestrator/`: serviço em Elixir/Gleam que gerencia salas, timers e integração com o engine.
- `apps/game_engine/`: lógica pura da partida escrita em Gleam (regras, pontuação, rodadas), roda no mesmo nó BEAM que o orchestrator.
- `apps/playlist_integration/`: integrações com Spotify, Deezer e futuros serviços de música.
- `apps/progression_ranking/`: serviço futuro dedicado a XP, ranking global, conquistas e histórico.

## libs/

- `libs/domain/`: modelos de domínio, entidades, value objects e regras compartilhadas.
- `libs/adapters/`: implementações de portas externas (ex.: storage, APIs, mensagens).
- `libs/shared_kernel/`: utilitários comuns (tipos básicos, helpers, contratos e eventos).

## infra/

- `infra/ops/`: scripts de provisionamento, configuração de pipelines, IaC e notas operacionais.

## scripts/

- Scripts shell/node/etc. para padronizar lint, testes, geração de código e automações do dia a dia.

## tools/

- Ferramentas específicas do projeto (CLIs internas, geradores de contrato, validações).

---

Use este documento como mapa ao explorar o repositório ou orientar contribuições.
