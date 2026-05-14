# ADR 0004: Áudio universal via Deezer (ISRC-first)

- **Status:** accepted
- **Data:** 2026-05-13
- **Decisores:** core

## Contexto

O jogo importa playlists de **três plataformas**: Spotify, Deezer e YouTube Music. Cada uma tem seu modelo de áudio:

- **Spotify:** previews de 30s são instáveis (várias músicas não têm) e o áudio completo exige SDK + conta Premium.
- **Deezer:** **previews de 30s são públicos, estáveis e disponíveis para 99%+ do catálogo**, sem autenticação.
- **YouTube Music:** previews via API não-oficial não são confiáveis; embed de player nativo expõe metadados (anti-cheat impossível).

Para a integridade do jogo, precisamos garantir:
- Áudio **sempre disponível** independentemente de qual plataforma a playlist veio.
- Headers de identificação removidos antes de chegar ao cliente (anti-cheat).
- Latência aceitável (proxy do backend, não direto da plataforma).

## Decisão

**Deezer é o motor de áudio universal.** Qualquer música importada (de qualquer plataforma) é normalizada e seu preview vem do Deezer.

**Estratégia de resolução:**
1. Extrair `ISRC` (International Standard Recording Code) da música original.
2. Buscar no Deezer via ISRC (chave global, match perfeito quando existe).
3. Se ISRC falhar ou não estiver disponível, fallback por nome: `track:"<nome>" artist:"<artista>"`.
4. Se ainda assim não houver match no Deezer, e a música for **vital** para a partida (ex: não há reservas no pool), usar **Spotify Web Playback SDK** como fallback — requer que o dono da música tenha Spotify Premium. Não funciona em Safari iOS.
5. Se nem o Spotify SDK resolver, a música é **descartada** silenciosamente e o backend seleciona outra do pool de reserva. Se não houver reservas, a rodada é pulada e `total_rounds` diminui.

**Proxy de áudio:**
- Backend baixa o preview do Deezer e re-stream via `GET /api/v1/audio/{audio_token}`.
- Headers strippados: ID3, `Content-Length` original.
- `audio_token` é UUIDv4, single-use, TTL = duração da rodada.
- Cache em memória do processo Bun (`Map` simples com TTL), não persistido (não há sentido em manter previews entre reinícios).

## Alternativas consideradas

| Alternativa | Por que foi rejeitada |
|---|---|
| **Spotify como motor universal** | Previews instáveis (várias faixas não têm); SDK oficial exige Premium e tem limitação de browsers (Safari iOS). Inviável como base. |
| **YouTube Music como motor universal** | API não oficial; ToS proíbe download/stream programático; alto risco legal e de instabilidade. |
| **Self-hosting de previews (upload pelos jogadores)** | Inviável legalmente e operacionalmente (custo de storage, moderação). |
| **Sem proxy (player consome direto da plataforma)** | Browser veria headers/URL/metadata da Deezer → trivial cheatar via DevTools Network. |
| **Cache persistido (Redis/SQLite)** | Complexidade extra sem ganho real no MVP — previews já são rápidos do Deezer; reinícios são raros. Reconsiderar pós-MVP se latência de cold-cache virar problema. |

## Consequências

- **Positivas:**
  - Um único provedor de áudio simplifica tudo: resolução, proxy, cache, debugging.
  - ISRC é padrão global → match consistente entre plataformas.
  - Deezer não exige autenticação para previews públicos.
  - Anti-cheat via proxy + header stripping cobre a ameaça óbvia (DevTools Network).
- **Negativas / trade-offs:**
  - Dependência única de provedor externo (Deezer). Se a API mudar política, projeto fica afetado. Mitigação: monitor de saúde + fallback Spotify SDK.
  - Algumas músicas raras (lo-fi obscuro, regional) podem não ter ISRC ou não estar no Deezer → dropadas silenciosamente. Vale a UX: aviso ao dono da playlist? (decisão para o GDD).
  - Limite Deezer: 50 req / 5s. Importação de playlist grande precisa de throttle/queue no backend.
- **Neutras:**
  - Cache em memória reinicia em deploys; previews voltam a ser buscados do Deezer. Aceitável.

## Notas

- Anti-cheat completo (cobertura de Shazam ao fundo, copiar URL, etc.) está em [`30-specs/02-audio.md`](../../30-specs/02-audio.md) e [`40-operations/03-security-anticheat.md`](../../../40-operations/03-security-anticheat.md) (a criar).
- Modelo de cache de **ISRC → Deezer track ID** persistido por 24h em **memória** (não ETS — versão antiga incorretamente referenciava ETS do Erlang). Pode virar Redis pós-MVP se ganho for medível.
