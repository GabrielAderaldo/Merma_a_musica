# MERMÃ, A MÚSICA! — Especificação do Sistema de Áudio

**Documento complementar ao DDD, Infraestrutura e GDD**
**Versão 1.0 — MVP | Março 2026**

---

## 1. Visão Geral

Este documento detalha como o sistema de áudio do "Mermã, a Música!" funciona: de onde vêm as músicas, como são validadas, como são tocadas durante a partida e quais APIs são utilizadas. O áudio é o coração da experiência — sem ele, não há jogo.

### 1.1 Princípio Fundamental

**O Deezer é o motor de áudio universal.** Independente de qual plataforma o jogador usa para importar sua playlist (Spotify, Deezer ou YouTube Music), o áudio tocado na partida vem preferencialmente do Deezer via sua API pública de previews de 30 segundos. As demais plataformas funcionam como importadoras de metadados.

### 1.2 Resumo da Estratégia

```
Jogador importa playlist (Spotify / Deezer / YouTube Music)
        ↓
Sistema extrai metadados (nome, artista, ISRC)
        ↓
Sistema busca cada música no Deezer (ISRC → fallback nome+artista)
        ↓
Música encontrada no Deezer? → ✅ Válida (preview 30s disponível)
        ↓
Não encontrada no Deezer? → Tenta Spotify Web Playback SDK (exige Premium)
        ↓
Nenhum fallback disponível? → ❌ Marcada como indisponível, jogador avisado
```

---

## 2. Plataformas e APIs

### 2.1 Mapa de Plataformas

| Plataforma | Papel no Sistema | API Utilizada | Autenticação |
|-----------|-----------------|---------------|-------------|
| **Deezer** | Motor de áudio primário + importação de playlists | Deezer REST API (pública) | Sem auth para busca/preview. OAuth para importar playlists do usuário. |
| **Spotify** | Importação de playlists + fallback de áudio | Spotify Web API (OAuth) + Web Playback SDK (fallback) | OAuth obrigatório. Web Playback SDK exige Premium do jogador. |
| **YouTube Music** | Apenas importação de playlists | YouTube Data API v3 (metadados) + ytmusicapi (não-oficial, playlists) | OAuth Google para playlists do usuário. |

### 2.2 Deezer REST API — Motor de Áudio

**Endpoint principal para busca:**
- `GET https://api.deezer.com/search?q=track:"nome" artist:"artista"` — busca por nome e artista.
- `GET https://api.deezer.com/track/isrc:{ISRC}` — busca por ISRC (preferencial).
- `GET https://api.deezer.com/track/{id}` — detalhes da faixa (inclui `preview` URL).

**Campo de áudio:** Cada track retornado possui o campo `preview` — URL direta para um MP3 de 30 segundos. Este é o áudio tocado no jogo.

**Autenticação para busca/preview:** Nenhuma. A API pública do Deezer permite busca e acesso ao preview sem autenticação. O backend do jogo faz as chamadas diretamente.

**Autenticação para importar playlist do jogador:** OAuth 2.0 padrão do Deezer (quando o jogador quer importar suas playlists pessoais do Deezer).

**Rate limits:** A API pública do Deezer tem limite de 50 requests por 5 segundos. O backend deve implementar rate limiting e cache para respeitar isso.

### 2.3 Spotify Web API — Importação de Playlists

**Endpoints utilizados:**
- `GET /v1/me/playlists` — listar playlists do usuário.
- `GET /v1/playlists/{id}/tracks` — listar faixas de uma playlist.
- `GET /v1/tracks/{id}` — detalhes da faixa (inclui `external_ids.isrc`).

**Campo ISRC:** Disponível em `track.external_ids.isrc`. Usado como chave primária para buscar a mesma música no Deezer.

**Autenticação:** OAuth 2.0 com scopes `playlist-read-private` e `playlist-read-collaborative`.

**Preview_url:** Deprecado desde novembro 2024. Retorna `null` para apps novos e apps em development mode. Não é utilizado.

### 2.4 Spotify Web Playback SDK — Fallback de Áudio

**Quando é usado:** Apenas quando uma música NÃO é encontrada no Deezer E o jogador que possui a música tem Spotify Premium ativo.

**Como funciona:** O SDK cria um player Spotify no browser do jogador, controlado via API JavaScript. Permite tocar faixas completas (não apenas preview). O backend envia o Spotify URI da faixa e o SDK toca diretamente.

**Requisitos:**
- Jogador deve ter Spotify Premium ativo.
- Token OAuth do jogador com scope `streaming` e `user-read-playback-state`.
- Browser com suporte a Encrypted Media Extensions (Chrome, Firefox, Edge).

**Limitações:**
- Não funciona em Safari/iOS (limitação do SDK).
- Exige Premium — jogadores com conta gratuita não podem usar este fallback.
- O SDK é um recurso do JOGADOR que doou a música, não de todos os jogadores. Na prática, o backend faz proxy do áudio para que todos ouçam.

**Nota importante:** O uso do Web Playback SDK como proxy para outros jogadores pode conflitar com os termos de uso do Spotify. Para o MVP, documentamos como fallback técnico possível, mas a viabilidade legal precisa ser verificada. A recomendação é maximizar o match no Deezer para minimizar a dependência deste fallback.

### 2.5 YouTube Music — Apenas Metadados

**Endpoints utilizados (via YouTube Data API v3):**
- `GET /youtube/v3/playlists?mine=true` — listar playlists do usuário.
- `GET /youtube/v3/playlistItems?playlistId={id}` — listar itens de uma playlist.

**Metadados extraídos:** Título do vídeo/faixa, nome do canal (artista), ID do vídeo.

**ISRC:** Não disponível diretamente na YouTube Data API. O sistema extrai nome+artista do título do vídeo e busca no Deezer por nome+artista (fallback).

**Áudio:** Nenhum. YouTube Music não oferece preview ou playback via API oficial. Todo áudio vem do Deezer (ou fallback Spotify).

**Bibliotecas auxiliares:** Para acesso a playlists do YouTube Music que não são playlists padrão do YouTube (ex: "Liked Songs"), pode ser necessário usar a biblioteca não-oficial `ytmusicapi`. Documentar como dependência instável que pode quebrar.

---

## 3. Fluxo de Importação e Validação de Playlist

### 3.1 Visão Geral do Fluxo

```
1. Jogador faz login na plataforma (Spotify/Deezer/YouTube Music)
2. Jogador acessa área de Perfil → Playlists
3. Sistema lista playlists disponíveis na plataforma
4. Jogador seleciona playlist para importar
5. Sistema extrai metadados de cada faixa (nome, artista, ISRC quando disponível)
6. Sistema busca cada faixa no Deezer:
   a. Por ISRC (se disponível) → match exato
   b. Por nome+artista (fallback) → match por relevância
7. Para cada faixa, resultado é classificado:
   ✅ Disponível — encontrada no Deezer com preview
   ⚠️ Fallback — não encontrada no Deezer, mas disponível via Spotify Web Playback SDK (se jogador tem Premium)
   ❌ Indisponível — não encontrada em nenhuma fonte de áudio
8. Jogador vê resultado da validação com status de cada música
9. Músicas indisponíveis são marcadas com aviso — jogador pode substituí-las na plataforma original e re-importar
10. Playlist validada fica pronta para uso em partidas
```

### 3.2 Quando a Validação Roda

A validação roda **toda vez que o jogador abre a área de playlists** no perfil. Isso garante que:
- Previews que ficaram indisponíveis são detectados.
- Músicas adicionadas à playlist na plataforma original são incluídas.
- O jogador sempre vê o estado atual da playlist.

**Otimização:** O sistema pode cachear resultados de validação por sessão e só revalidar se a playlist mudou (comparando hash de IDs das faixas). Se a playlist não mudou, mostra o resultado cacheado instantaneamente.

### 3.3 Tela de Validação de Playlist

Para cada música da playlist, o jogador vê:

| Informação | Descrição |
|-----------|-----------|
| Nome da música | Extraído da plataforma original |
| Artista | Extraído da plataforma original |
| Capa do álbum | Extraída da plataforma original ou do Deezer |
| Status | ✅ Disponível / ⚠️ Fallback (Spotify Premium) / ❌ Indisponível |
| Botão play (5s) | Preview rápido de 5 segundos do Deezer para confirmar que é a música certa |
| Ação (se indisponível) | Aviso para substituir na plataforma original e re-importar |

**Botão de play rápido:** Toca 5 segundos do preview do Deezer para que o jogador confirme que o match está correto (a música encontrada no Deezer é de fato a mesma da playlist original). Disponível apenas para músicas com status ✅.

**Músicas indisponíveis:** O sistema NÃO sugere substituições. Apenas avisa que a música não é válida para o jogo. O jogador deve substituí-la na plataforma de streaming original (Spotify/Deezer/YouTube Music) e depois re-importar a playlist.

### 3.4 Algoritmo de Match no Deezer (Resolução de Música)

```
Entrada: metadata da música (nome, artista, ISRC?)

1. Se ISRC disponível (Spotify fornece):
   → GET /track/isrc:{ISRC}
   → Se encontrou e tem preview: ✅ MATCH
   → Se encontrou mas sem preview: ir para passo 3

2. Se ISRC não disponível ou não encontrou:
   → GET /search?q=track:"{nome}" artist:"{artista}"
   → Pegar primeiro resultado com preview disponível
   → Validar: nome e artista do resultado são similares ao original? (fuzzy match)
   → Se match aceitável e tem preview: ✅ MATCH

3. Se nenhum match no Deezer:
   → Jogador tem Spotify Premium + música veio do Spotify?
     → Sim: ⚠️ FALLBACK (Spotify Web Playback SDK)
     → Não: ❌ INDISPONÍVEL
```

**Threshold de similaridade para match por nome+artista:** Usar normalização (lowercase, sem acentos, sem parênteses) + distância de Levenshtein. Aceitar match se similaridade > 80%.

---

## 4. Fluxo de Áudio Durante a Partida

### 4.1 Sequência Completa de Uma Rodada (Áudio)

```
1. Backend seleciona música da rodada (do pool de músicas validadas)
2. Backend verifica fonte de áudio:
   a. Se Deezer: obtém preview URL do cache de validação
   b. Se fallback Spotify: prepara Spotify URI
3. Backend gera audio_token opaco (UUID, single-use, expira com a rodada)
4. Backend envia evento round_starting { round_index, audio_token, audio_source }
5. Frontend faz GET /api/audio/{audio_token}
6. Backend resolve audio_token:
   a. Se Deezer: faz proxy do preview MP3 (sanitiza headers)
   b. Se Spotify fallback: instrui o frontend do dono da música a tocar via SDK
7. Grace period de 3 segundos (buffer)
8. Backend envia timer_started
9. Frontend toca o áudio
10. [Rodada acontece...]
11. Rodada encerra → audio_token é invalidado
```

### 4.2 Proxy de Áudio (Deezer)

O backend atua como proxy entre o Deezer e o frontend:

**Request do frontend:**
```
GET /api/audio/{audio_token}
Headers: Authorization: Bearer {session_token}
```

**O que o backend faz:**
1. Resolve `audio_token` para a `preview_url` do Deezer (armazenada no estado da sala).
2. Faz request para a URL do Deezer.
3. Retorna o stream de áudio ao frontend com headers sanitizados:
   - `Content-Type: audio/mpeg`
   - Remove qualquer header que identifique o Deezer.
   - Remove metadata ID3 tags se possível (contêm nome da música).
4. `audio_token` é marcado como usado (single-use).

### 4.3 Fallback Spotify Web Playback SDK

Quando a fonte de áudio é Spotify (fallback):

1. Backend envia `round_starting` com `audio_source: "spotify_sdk"` e o `spotify_uri` da faixa.
2. O frontend do jogador que possui Spotify Premium inicializa o Web Playback SDK com seu token.
3. O SDK toca a faixa.
4. O áudio é capturado e redistribuído aos demais jogadores via proxy no backend.

**Nota:** Este fluxo é mais complexo e tem limitações (Safari, Premium obrigatório). A meta é que menos de 5% das músicas precisem deste fallback — o match no Deezer deve cobrir a grande maioria.

### 4.4 Anti-Cheat (Resumo — detalhes na Spec de Infra)

- URL do Deezer nunca exposta ao frontend (proxy obrigatório).
- `audio_token` é opaco, single-use, expira com a rodada.
- Headers sanitizados (sem metadata de plataforma).
- Timer controlado pelo backend.
- ID3 tags removidos quando possível.

---

## 5. Cache e Performance

### 5.1 O que é Cacheado

| Dado | Onde | TTL | Motivo |
|------|------|-----|--------|
| Resultado de validação de playlist | Memória BEAM (processo do jogador/sessão) | Duração da sessão | Evitar revalidar a cada abertura se playlist não mudou |
| Mapeamento ISRC → Deezer track ID | Memória BEAM (ETS) | 24 horas | ISRC→Deezer não muda frequentemente |
| Preview URL do Deezer | Memória BEAM (estado da sala) | Duração da partida | Já resolvido na validação |
| Metadados da playlist importada | Memória BEAM (sessão) | Duração da sessão | Re-importar a cada nova sessão |

### 5.2 Rate Limiting

| API | Limite | Estratégia |
|-----|--------|-----------|
| Deezer REST API | 50 requests / 5 segundos | Queue com throttle no backend. Validação de playlist usa batch com delay. |
| Spotify Web API | ~180 requests / minuto (varia) | Respeitar headers `Retry-After`. Cache agressivo de metadados. |
| YouTube Data API v3 | 10.000 units / dia (quota) | Cada list request custa ~1-3 units. Cachear resultados. Alertar se quota baixa. |

### 5.3 Otimização da Validação

Para playlists grandes (50+ músicas), a validação pode ser lenta por causa do rate limit do Deezer. Estratégias:

- **Batch com delay:** Validar em grupos de 10 músicas com 1 segundo de intervalo.
- **Progresso visual:** Mostrar barra de progresso ao jogador durante validação.
- **Validação incremental:** Se a playlist já foi validada antes e não mudou (mesmo hash de IDs), mostrar resultado cacheado.
- **Background validation:** Iniciar validação assim que o jogador importa, mesmo antes de ele abrir a área de playlists.

---

## 6. Tratamento de Erros

### 6.1 Erros na Validação

| Erro | Tratamento |
|------|-----------|
| Deezer API indisponível | Retry com backoff exponencial (3 tentativas). Se persistir, avisar jogador para tentar depois. |
| ISRC não encontrado no Deezer | Fallback para busca por nome+artista. |
| Busca por nome+artista retorna match incorreto | Threshold de similaridade < 80% → tratar como não encontrado. |
| Spotify token expirado | Usar refresh_token para renovar. Se falhar, pedir re-login. |
| YouTube Music API quota excedida | Avisar jogador que import de YouTube Music está temporariamente indisponível. |
| Playlist vazia ou sem músicas válidas | Avisar jogador. Playlist não pode ser usada. |

### 6.2 Erros Durante a Partida

| Erro | Tratamento |
|------|-----------|
| Preview URL do Deezer quebrou durante a rodada | Pula música, usa outra do pool de reserva (documentado na Spec de Infra). |
| Spotify Web Playback SDK falha | Pula música, usa outra do pool de reserva. |
| Jogador com fallback Spotify desconectou | Música fica indisponível para a rodada. Pula e usa reserva. |
| Timeout no proxy de áudio (backend → Deezer) | Retry 1x. Se falhar, pula música. |

---

## 7. Considerações Legais e Termos de Uso

### 7.1 Deezer

- Preview de 30s é explicitamente permitido pela API pública.
- Proibido armazenar áudio localmente (cache em disco). Apenas streaming.
- Obrigatório atribuir conteúdo ao Deezer (logo/link) conforme termos.

### 7.2 Spotify

- Web API para metadados: permitido com OAuth.
- Web Playback SDK: permitido para uso pessoal do usuário Premium.
- Proxy de áudio do SDK para outros jogadores: zona cinza legal. Minimizar uso.
- Proibido integrações de streaming comercial.

### 7.3 YouTube Music

- YouTube Data API v3: permitido com quota.
- Uso de bibliotecas não-oficiais (ytmusicapi): risco de quebra e possível violação de ToS.
- Sem áudio — apenas metadados.

### 7.4 Recomendação Geral

Maximizar uso do Deezer (API pública, termos claros, preview estável). Minimizar dependência do Spotify Web Playback SDK. YouTube Music como importador de metadados apenas. Se o projeto crescer, considerar contato direto com as plataformas para acordos formais.

---

## 8. Resumo das Decisões

| Decisão | Escolha |
|---------|---------|
| Motor de áudio primário | Deezer (preview 30s via API pública) |
| Fallback de áudio | Spotify Web Playback SDK (exige Premium do jogador) |
| Spotify no sistema | Importação de playlists + metadados + ISRC. Áudio só como fallback. |
| YouTube Music no sistema | Importação de playlists + metadados apenas. Sem áudio. |
| Busca cross-platform | ISRC primeiro, fallback nome+artista |
| Threshold de match | Similaridade > 80% (normalizado, fuzzy) |
| Validação de playlist | Na área de perfil, toda vez que o jogador abre. Cache por sessão. |
| Música indisponível (validação) | Aviso ao jogador, deve substituir na plataforma original |
| Música indisponível (partida) | Pula, usa reserva do pool |
| Preview de confirmação | Botão play rápido (5 segundos) na tela de validação |
| Proxy de áudio | Obrigatório. Frontend nunca vê URL real. |
| audio_token | Opaco, single-use, expira com a rodada |
| Auth Deezer para busca | Nenhuma (API pública) |
| Auth Deezer para playlists | OAuth (quando jogador importa do Deezer) |
| Auth Spotify | OAuth (import + fallback SDK) |
| Auth YouTube Music | OAuth Google (import de playlists) |
| Rate limiting Deezer | 50 req/5s, batch com throttle |
| Cache de ISRC→Deezer | ETS, TTL 24h |

---

## 9. Diagrama de Arquitetura do Sistema de Áudio

```
┌─────────────────────────────────────────────────────────────────┐
│                        JOGADOR (Browser)                         │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Spotify OAuth │  │ Deezer OAuth │  │ YouTube Music OAuth  │   │
│  │  (import)     │  │  (import)    │  │  (import)            │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘   │
│         └──────────────────┴─────────────────────┘               │
│                            │                                      │
│                     tokens no localStorage                        │
│                            │                                      │
│  ┌─────────────────────────▼─────────────────────────────────┐   │
│  │              Frontend (SvelteKit)                           │   │
│  │  - Tela de perfil/playlists (validação)                   │   │
│  │  - Player de áudio (recebe stream do proxy)               │   │
│  │  - Spotify Web Playback SDK (fallback, se Premium)        │   │
│  └─────────────────────────┬─────────────────────────────────┘   │
└─────────────────────────────┼─────────────────────────────────────┘
                              │
                    REST + WebSocket
                              │
┌─────────────────────────────▼─────────────────────────────────────┐
│                     BACKEND (BEAM)                                 │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │              Playlist Integration Context                   │   │
│  │                                                             │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐   │   │
│  │  │ Spotify API  │  │  Deezer API  │  │ YouTube Data   │   │   │
│  │  │ (metadados)  │  │ (metadados + │  │ API v3         │   │   │
│  │  │              │  │  busca ISRC)  │  │ (metadados)    │   │   │
│  │  └──────┬───────┘  └──────┬───────┘  └───────┬────────┘   │   │
│  │         └──────────────────┴──────────────────┘            │   │
│  │                         │                                   │   │
│  │              ┌──────────▼──────────┐                       │   │
│  │              │  Resolução de Música │                       │   │
│  │              │  (ISRC → Deezer)     │                       │   │
│  │              │  (nome+artista →     │                       │   │
│  │              │   Deezer fallback)   │                       │   │
│  │              └──────────┬──────────┘                       │   │
│  │                         │                                   │   │
│  │              ┌──────────▼──────────┐                       │   │
│  │              │  Cache de Validação  │                       │   │
│  │              │  (ETS / memória)     │                       │   │
│  │              └──────────┬──────────┘                       │   │
│  └──────────────────────────┼──────────────────────────────────┘   │
│                             │                                      │
│  ┌──────────────────────────▼──────────────────────────────────┐   │
│  │              Game Orchestrator                               │   │
│  │  - Seleciona música da rodada                               │   │
│  │  - Gera audio_token                                         │   │
│  │  - Proxy de áudio (Deezer preview → jogadores)              │   │
│  │  - Sanitiza headers                                         │   │
│  │  - Controla timer                                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                    │
│                    ┌───────────────────┐                           │
│                    │   Deezer CDN      │                           │
│                    │  (preview MP3)    │                           │
│                    └───────────────────┘                           │
└────────────────────────────────────────────────────────────────────┘
```

---

*Fim do Documento de Especificação do Sistema de Áudio*