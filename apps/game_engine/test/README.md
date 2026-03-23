Vou analisar a estrutura dos testes e propor uma organização que espelhe os bounded contexts e conceitos DDD que definimos.Agora vou gerar os arquivos concretos. Vou fazer o mapeamento de cada teste do monolito para seu novo lar, reorganizando e renomeando onde necessário.Agora o arquivo raiz mínimo que só carrega o runner:Vamos verificar a estrutura final e copiar tudo para output:Agora vou contar os testes em cada arquivo para garantir que não perdemos nenhum:Hmm, o monolito original tem quantos? Deixa verificar:86 no original, 90 na nova estrutura (4 testes a mais porque desmembrei testes compostos — por exemplo `speed_bonus_scoring_test` que testava 4 cenários num só virou testes separados). Zero perdido.Aqui vai o raciocínio por trás de cada decisão:

---

## A lógica da separação

O princípio é: **a estrutura de testes espelha a estrutura do domínio**. Se você sabe onde o código de produção mora, sabe onde o teste está.

**`test_helpers.gleam`** centraliza todas as factories (`make_song`, `make_player`, `make_config`) e os setups compostos (`setup_in_round`, `setup_simple_1_round`). No monolito, essas funções estavam misturadas com os testes. Agora são importáveis por qualquer arquivo — e se a assinatura de `Player` mudar, você corrige num lugar só.

**Unit tests (domain services puros)** — `validation_test`, `scoring_test`, `song_selection_test`, `near_miss_test`. Esses testam funções puras que não precisam de nenhum setup de match. Se `levenshtein("abc", "abd")` retorna `1`, não importa se existe um match ou não. São os testes mais rápidos e estáveis do sistema.

**Workflow tests (aggregate transitions)** — `lobby_test`, `round_test`, `finish_test`. Cada um mapeia para um workflow do domínio. `lobby_test` cobre de `new_match` até `start_match` (WaitingMatch → ActiveMatch). `round_test` cobre tudo que acontece durante rounds. `finish_test` cobre `end_match`, ranking, highlights e scores finais.

**`tiebreaker_test`** ganhou arquivo próprio porque tem 8 testes com setups complexos (pools A/B, 3+ players, resolve). Misturar com `finish_test` deixaria o arquivo enorme.

**`error_states_test`** agrupa todas as transições inválidas: tentar start durante InProgress, answer para player desconhecido, start_round sem mais rounds. São os "testes de rejeição" do aggregate — garantem que a máquina de estados protege suas invariantes.

**`e2e_test`** ficou enxuto: só 4 cenários completos (2 players/3 rounds, solo, solo/3 rounds, 4 players). Os testes que antes eram "e2e" mas na verdade testavam um aspecto específico (como fuzzy matching via `submit_answer`) foram reclassificados para `round_test` — onde pertencem semanticamente.

Resultado: 1 arquivo de 600+ linhas virou 11 arquivos coesos, nenhum com mais de ~170 linhas, e zero testes perdidos.
