# Spotify Web API — Get Current User's Playlists

## Visão Geral

Retorna a lista de playlists que o usuário autenticado **possui ou segue**. No "Mermã, a Música!", é o primeiro endpoint chamado quando o jogador quer importar uma playlist do Spotify.

> **Requer OAuth 2.0** — Authorization Code Flow ou PKCE Flow.

---

## Diagrama do Fluxo

```mermaid
sequenceDiagram
    participant Browser as 🖥️ Frontend<br/>(SolidJS)
    participant Backend as ⚙️ Backend<br/>(BEAM)
    participant Spotify as 🎵 Spotify<br/>Web API

    Browser->>Backend: GET /api/v1/playlists/spotify<br/>(access_token no header)

    loop Paginar até ter todas as playlists
        Backend->>Spotify: GET /me/playlists<br/>?limit=50&offset={n}<br/>(Authorization: Bearer {token})
        Spotify->>Backend: Página de playlists<br/>(items[], next, total)
    end

    Backend->>Browser: Lista completa de playlists<br/>(id, name, cover, track_count)
```

---

## Endpoint

```
GET https://api.spotify.com/v1/me/playlists
```

### Autenticação

| Header | Valor |
|--------|-------|
| `Authorization` | `Bearer {access_token}` |

### Scopes Necessários

| Scope | Motivo |
|-------|--------|
| `playlist-read-private` | Acessar playlists privadas do usuário |

---

## Query Parameters

| Parâmetro | Tipo | Obrigatório | Default | Range | Descrição |
|-----------|------|:-----------:|---------|-------|-----------|
| `limit` | integer | Não | 20 | 1–50 | Número máximo de playlists por página |
| `offset` | integer | Não | 0 | 0–100.000 | Índice da primeira playlist a retornar. Usar com `limit` para paginar |

### Exemplo de Request

```bash
curl --request GET \
  --url "https://api.spotify.com/v1/me/playlists?limit=10&offset=5" \
  --header "Authorization: Bearer 1POdFZRZbvb...qqillRxMr2z"
```

---

## Response

### 200 OK — Lista Paginada de Playlists

```json
{
  "href": "https://api.spotify.com/v1/me/playlists?offset=0&limit=20",
  "limit": 20,
  "next": "https://api.spotify.com/v1/me/playlists?offset=20&limit=20",
  "offset": 0,
  "previous": null,
  "total": 45,
  "items": [
    {
      "collaborative": false,
      "description": "Minhas músicas favoritas de rock",
      "external_urls": {
        "spotify": "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"
      },
      "href": "https://api.spotify.com/v1/playlists/37i9dQZF1DXcBWIGoYBM5M",
      "id": "37i9dQZF1DXcBWIGoYBM5M",
      "images": [
        {
          "url": "https://i.scdn.co/image/ab67616d00001e02ff9ca10b55ce82ae553c8228",
          "height": 300,
          "width": 300
        }
      ],
      "name": "Meus Rocks",
      "owner": {
        "external_urls": {
          "spotify": "https://open.spotify.com/user/gabriel123"
        },
        "href": "https://api.spotify.com/v1/users/gabriel123",
        "id": "gabriel123",
        "type": "user",
        "uri": "spotify:user:gabriel123",
        "display_name": "Gabriel"
      },
      "public": false,
      "snapshot_id": "MTY4ODc2NTkzMywwMDAwMDAwMGQ0MWQ4Y2Q5OGY...",
      "items": {
        "href": "https://api.spotify.com/v1/playlists/37i9dQZF1DXcBWIGoYBM5M/items",
        "total": 45
      },
      "tracks": {
        "href": "https://api.spotify.com/v1/playlists/37i9dQZF1DXcBWIGoYBM5M/tracks",
        "total": 45
      },
      "type": "playlist",
      "uri": "spotify:playlist:37i9dQZF1DXcBWIGoYBM5M"
    }
  ]
}
```

### Campos da Response Paginada

| Campo | Tipo | Nullable | Descrição |
|-------|------|:--------:|-----------|
| `href` | string | Não | Link para este endpoint com os params atuais |
| `limit` | integer | Não | Máximo de items nesta página |
| `next` | string | Sim | URL da próxima página (`null` se última) |
| `offset` | integer | Não | Offset atual |
| `previous` | string | Sim | URL da página anterior (`null` se primeira) |
| `total` | integer | Não | Total de playlists disponíveis |
| `items` | array | Não | Array de `SimplifiedPlaylistObject` |

### Campos de Cada Playlist (`SimplifiedPlaylistObject`)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | string | Spotify ID da playlist |
| `name` | string | Nome da playlist |
| `description` | string | Descrição (pode ser `null`) |
| `collaborative` | boolean | `true` se permite edição por outros |
| `public` | boolean | `true` se pública, `false` se privada, `null` se irrelevante |
| `owner` | object | Usuário dono da playlist |
| `owner.id` | string | Spotify ID do dono |
| `owner.display_name` | string | Nome de exibição do dono |
| `images` | array | Imagens da playlist (até 3, ordenadas por tamanho decrescente). URLs são **temporárias** (expiram em < 1 dia) |
| `items` | object | Link para detalhes das faixas + total. **Usar este campo** |
| `items.href` | string | URL para buscar faixas (`/playlists/{id}/items`) |
| `items.total` | integer | Total de faixas na playlist |
| `tracks` | object | ⚠️ **Deprecado** — usar `items` em vez disso |
| `snapshot_id` | string | Versão atual da playlist |
| `uri` | string | Spotify URI (ex: `spotify:playlist:37i9...`) |
| `type` | string | Sempre `"playlist"` |
| `external_urls.spotify` | string | URL pública no Spotify |

### Erros

| Status | Descrição | Ação |
|:------:|-----------|------|
| 401 | Token inválido ou expirado | Renovar token via refresh flow |
| 403 | Scope insuficiente | Verificar se `playlist-read-private` foi solicitado |
| 429 | Rate limit atingido | Respeitar header `Retry-After`, implementar backoff |

---

## Implementação no Mermã

### Backend — Buscar Todas as Playlists (com Paginação)

```elixir
# Backend BEAM — módulo SpotifyPlaylists
defmodule SpotifyPlaylists do
  @base_url "https://api.spotify.com/v1"
  @page_size 50

  @doc """
  Busca TODAS as playlists do usuário, paginando automaticamente.
  Retorna lista completa de playlists simplificadas.
  """
  def fetch_all_playlists(access_token) do
    fetch_playlists_page(access_token, 0, [])
  end

  defp fetch_playlists_page(access_token, offset, acc) do
    url = "#{@base_url}/me/playlists?" <>
      URI.encode_query(%{limit: @page_size, offset: offset})

    headers = [{"Authorization", "Bearer #{access_token}"}]

    case HTTPClient.get(url, headers) do
      {:ok, %{status: 200, body: body}} ->
        playlists = body["items"] || []
        all = acc ++ playlists

        if body["next"] != nil do
          # Delay para respeitar rate limits
          Process.sleep(100)
          fetch_playlists_page(access_token, offset + @page_size, all)
        else
          {:ok, all}
        end

      {:ok, %{status: 401}} ->
        {:error, :token_expired}

      {:ok, %{status: 429, headers: resp_headers}} ->
        retry_after = get_retry_after(resp_headers)
        Process.sleep(retry_after * 1000)
        fetch_playlists_page(access_token, offset, acc)

      {:ok, %{status: status}} ->
        {:error, :spotify_error, status}

      {:error, reason} ->
        {:error, :network_error, reason}
    end
  end

  @doc """
  Transforma playlist do Spotify no formato do Mermã.
  """
  def normalize_playlist(spotify_playlist) do
    %{
      playlist_id: spotify_playlist["id"],
      name: spotify_playlist["name"],
      track_count: get_track_count(spotify_playlist),
      cover_url: get_cover_url(spotify_playlist),
      platform: "spotify"
    }
  end

  # Usar "items" (novo) com fallback para "tracks" (deprecado)
  defp get_track_count(playlist) do
    case playlist do
      %{"items" => %{"total" => total}} -> total
      %{"tracks" => %{"total" => total}} -> total
      _ -> 0
    end
  end

  defp get_cover_url(playlist) do
    case playlist["images"] do
      [first | _] -> first["url"]
      _ -> nil
    end
  end
end
```

### Frontend — Tipo TypeScript

```typescript
// src/lib/types/platform.ts

/** Playlist simplificada retornada pelo GET /me/playlists */
export interface SpotifySimplifiedPlaylist {
  id: string;
  name: string;
  description: string | null;
  collaborative: boolean;
  public: boolean | null;
  owner: {
    id: string;
    display_name: string;
    uri: string;
  };
  images: Array<{
    url: string;
    height: number | null;
    width: number | null;
  }>;
  /** Novo campo (pós fev/2026) — usar este */
  items?: {
    href: string;
    total: number;
  };
  /** @deprecated Usar `items` em vez disso */
  tracks?: {
    href: string;
    total: number;
  };
  snapshot_id: string;
  uri: string;
  type: "playlist";
  external_urls: {
    spotify: string;
  };
}

/** Response paginada do GET /me/playlists */
export interface SpotifyPlaylistsResponse {
  href: string;
  limit: number;
  next: string | null;
  offset: number;
  previous: string | null;
  total: number;
  items: SpotifySimplifiedPlaylist[];
}

/** Helper para extrair track count (compatível com novo e antigo) */
export function getPlaylistTrackCount(playlist: SpotifySimplifiedPlaylist): number {
  return playlist.items?.total ?? playlist.tracks?.total ?? 0;
}

/** Helper para extrair cover URL (primeira imagem) */
export function getPlaylistCoverUrl(playlist: SpotifySimplifiedPlaylist): string | null {
  return playlist.images?.[0]?.url ?? null;
}
```

### Frontend — Chamada via API do Mermã

```typescript
// src/lib/api/playlists.ts
import { api } from "./client";
import type { PlaylistListResponse } from "../types/api";

/**
 * Buscar playlists do jogador no Spotify.
 * Chamada vai ao backend do Mermã, que busca no Spotify e normaliza.
 */
export async function fetchSpotifyPlaylists(
  accessToken: string
): Promise<PlaylistListResponse> {
  return api<PlaylistListResponse>("/playlists/spotify", {
    headers: {
      "access_token": accessToken,
    },
  });
}
```

---

## Notas Importantes

### ⚠️ Campo `tracks` está Deprecado

Desde fevereiro de 2026, o campo `tracks` foi renomeado para `items`. O campo `tracks` ainda pode aparecer na resposta por retrocompatibilidade, mas deve ser tratado como deprecado. **Sempre use `items` como fonte primária**, com fallback para `tracks`:

```typescript
const trackCount = playlist.items?.total ?? playlist.tracks?.total ?? 0;
```

### ⚠️ URLs de Imagens são Temporárias

As URLs retornadas no campo `images[].url` **expiram em menos de 1 dia**. Não cachear permanentemente. Para o Mermã, isso não é problema porque as playlists são revalidadas toda vez que o jogador abre a área de playlists.

### ⚠️ Paginação Obrigatória para Muitas Playlists

Um usuário pode ter centenas de playlists. O backend deve paginar automaticamente (limit=50, offset incrementando) até `next` ser `null`.

### ⚠️ Rate Limiting

Respeitar o header `Retry-After` em respostas 429. Implementar delay entre páginas (100-200ms) para evitar atingir o limite.

---

## Referências

- [Spotify API — Get Current User's Playlists](https://developer.spotify.com/documentation/web-api/reference/get-a-list-of-current-users-playlists)
- [Spotify API Migration Feb 2026 — Mermã](./spotify_api_migration_2026.md)
- [Sistema de Áudio — Mermã](./especificacao_sistema_audio.md)
- [Contrato de API — Mermã](./contrato_api.md)

# Spotify Web API — Mudanças de Fevereiro 2026 (Guia de Migração)

## Visão Geral

Em **fevereiro de 2026**, o Spotify implementou mudanças significativas na Web API que afetam todas as aplicações em **Development Mode**. Este documento analisa o impacto direto no "Mermã, a Música!" e documenta as adaptações necessárias.

> **Apps em Extended Quota Mode não são afetados.** Todas as mudanças descritas aqui se aplicam apenas a apps em Development Mode.

---

## Timeline

| Data | O que aconteceu |
|------|----------------|
| 11 de fevereiro de 2026 | Novos apps em Dev Mode já criados com as novas restrições |
| 9 de março de 2026 | Apps existentes em Dev Mode migrados para novas restrições |

---

## Impacto no Mermã, a Música!

```mermaid
flowchart LR
    subgraph CRITICO["🔴 CRÍTICO"]
        A["Limite de 5 usuários\npor app em Dev Mode"]
        B["Batch endpoints\nremovidos"]
        C["Search limit\nreduzido para 10"]
    end

    subgraph MEDIO["🟡 MÉDIO"]
        D["Playlist endpoint\nrenomeado /tracks → /items"]
        E["Campo tracks\nrenomeado para items"]
        F["external_ids removido\n(revertido em março)"]
    end

    subgraph BAIXO["🟢 BAIXO"]
        G["Library endpoints\ngenéricos"]
        H["Browse endpoints\nremovidos"]
        I["Campos popularity\nremovidos"]
    end

    A --> |"MVP precisa de\nmais de 5 jogadores"| SOL1["Solicitar Extended\nQuota Mode"]
    B --> |"Importar playlist\nfaixa por faixa"| SOL2["Promise.all com\nrate limiting"]
    C --> |"Autocomplete\nlimitado"| SOL3["Paginar com\noffset"]
```

---

## 🔴 Mudanças Críticas para o Mermã

### 1. Premium Obrigatório para o Dono do App

O dono da aplicação registrada no Spotify Developer Dashboard **precisa ter Spotify Premium ativo**. Se a assinatura expirar, o app inteiro para de funcionar.

**Impacto:** O desenvolvedor principal do Mermã precisa manter Premium. Isso não afeta os jogadores — eles podem ter conta gratuita (exceto para o fallback Web Playback SDK).

**Ação:** Garantir que a conta dona do app no Spotify Dashboard tenha Premium ativo permanentemente.

### 2. Limite de 5 Usuários por App (Dev Mode)

Apps em Development Mode agora estão limitados a **5 usuários**. Isso significa que no máximo 5 jogadores diferentes podem autenticar com o Spotify.

**Impacto:** Para o MVP com testes entre amigos, 5 é suficiente. Para lançamento público, é **bloqueante** — precisa de Extended Quota Mode.

**Ação:**
- MVP/testes: funciona com o limite de 5.
- Lançamento: solicitar Extended Quota Mode antes de abrir ao público.

### 3. Limite de 1 Client ID por Desenvolvedor

Novos desenvolvedores só podem criar **1 app** no Dashboard.

**Impacto:** Baixo — o Mermã precisa de apenas 1 app. Apps existentes com múltiplos Client IDs mantêm os que já têm.

### 4. Batch Endpoints Removidos

Os endpoints de busca em lote foram removidos:

| Removido | Substituto |
|----------|-----------|
| `GET /tracks?ids=id1,id2,id3` | `GET /tracks/{id}` (1 request por faixa) |
| `GET /albums?ids=...` | `GET /albums/{id}` |
| `GET /artists?ids=...` | `GET /artists/{id}` |

**Impacto no Mermã:** Ao importar uma playlist com 50 músicas, antes era 1 request. Agora são **50 requests individuais**. Isso afeta performance e rate limiting.

**Ação:**

```typescript
// ANTES: batch (1 request)
const response = await fetch("/v1/tracks?ids=id1,id2,id3");
const { tracks } = await response.json();

// DEPOIS: individual com rate limiting
async function fetchTracksIndividually(
  trackIds: string[],
  accessToken: string
): Promise<SpotifyTrack[]> {
  const results: SpotifyTrack[] = [];

  // Processar em batches de 5 com delay para respeitar rate limits
  for (let i = 0; i < trackIds.length; i += 5) {
    const batch = trackIds.slice(i, i + 5);

    const batchResults = await Promise.all(
      batch.map((id) =>
        fetch(`https://api.spotify.com/v1/tracks/${id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }).then((r) => r.json())
      )
    );

    results.push(...batchResults);

    // Delay entre batches para evitar rate limit (429)
    if (i + 5 < trackIds.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return results;
}
```

### 5. Search Limit Reduzido

| Parâmetro | Antes | Depois |
|-----------|-------|--------|
| `limit` máximo | 50 | **10** |
| `limit` default | 20 | **5** |

**Impacto no Mermã:** Se usarmos o Spotify Search para buscar faixas por nome+artista (fallback quando ISRC não funciona), os resultados são mais limitados. Precisamos paginar.

**Ação:**

```typescript
// Buscar com paginação se necessário
async function searchSpotifyTrack(
  query: string,
  accessToken: string,
  maxResults: number = 10
): Promise<SpotifyTrack[]> {
  const results: SpotifyTrack[] = [];
  let offset = 0;
  const limit = 10; // máximo permitido

  while (results.length < maxResults) {
    const params = new URLSearchParams({
      q: query,
      type: "track",
      limit: String(limit),
      offset: String(offset),
    });

    const response = await fetch(
      `https://api.spotify.com/v1/search?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const data = await response.json();
    const tracks = data.tracks?.items ?? [];

    if (tracks.length === 0) break;

    results.push(...tracks);
    offset += limit;
  }

  return results.slice(0, maxResults);
}
```

---

## 🟡 Mudanças de Impacto Médio

### 6. Playlist Endpoints Renomeados

| Removido | Substituto | Nota |
|----------|-----------|------|
| `POST /playlists/{id}/tracks` | `POST /playlists/{id}/items` | |
| `GET /playlists/{id}/tracks` | `GET /playlists/{id}/items` | Só para playlists que o usuário possui ou colabora |
| `DELETE /playlists/{id}/tracks` | `DELETE /playlists/{id}/items` | Parâmetro `tracks` renomeado para `items` |
| `PUT /playlists/{id}/tracks` | `PUT /playlists/{id}/items` | |

**Impacto no Mermã:** O endpoint de importação de playlist usa `GET /playlists/{id}/tracks`. Precisa ser atualizado para `/items`.

**Ação:**

```typescript
// ANTES
const response = await fetch(
  `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
  { headers: { Authorization: `Bearer ${token}` } }
);

// DEPOIS
const response = await fetch(
  `https://api.spotify.com/v1/playlists/${playlistId}/items`,
  { headers: { Authorization: `Bearer ${token}` } }
);
```

### 7. Campo `tracks` Renomeado para `items` nas Respostas

| Antes | Depois |
|-------|--------|
| `playlist.tracks` | `playlist.items` |
| `playlist.tracks.items` | `playlist.items.items` |
| `playlist.tracks.items[].track` | `playlist.items.items[].item` |

**Importante:** O campo `items` pode estar **ausente** para playlists que o usuário não possui ou colabora. Tratar como opcional.

**Ação:**

```typescript
// ANTES
const trackCount = playlist.tracks.total;
const firstTrack = playlist.tracks.items[0].track;

// DEPOIS (com tratamento seguro)
const trackCount = playlist.items?.total ?? 0;
const firstTrack = playlist.items?.items?.[0]?.item;

if (!playlist.items) {
  console.warn("Track details not available for this playlist");
}
```

### 8. Campo `external_ids` — Removido e Revertido

O campo `external_ids` (que contém o **ISRC**) foi removido inicialmente mas **revertido em março de 2026**.

**Status atual:** `external_ids` está **disponível** novamente. O ISRC continua acessível.

**Impacto no Mermã:** Nenhum — o ISRC continua sendo a chave primária para cross-reference com o Deezer. Porém, é prudente tratar o campo como opcional por segurança:

```typescript
// Tratamento defensivo
function getISRC(track: SpotifyTrack): string | null {
  return track.external_ids?.isrc ?? null;
}
```

---

## 🟢 Mudanças de Baixo Impacto

### 9. Library Endpoints Genéricos

Endpoints específicos por tipo foram unificados:

| Antes | Depois |
|-------|--------|
| `PUT /me/tracks` | `PUT /me/library` (com URIs) |
| `PUT /me/albums` | `PUT /me/library` |
| `PUT /me/following` | `PUT /me/library` |
| `GET /me/tracks/contains` | `GET /me/library/contains` |

**Impacto no Mermã:** Nenhum no MVP — não salvamos músicas na biblioteca do usuário. Relevante apenas se no futuro adicionarmos feature de "salvar música que gostou".

### 10. Browse e Artist Endpoints Removidos

| Removido | Descrição |
|----------|-----------|
| `GET /browse/new-releases` | Novos lançamentos |
| `GET /browse/categories` | Categorias |
| `GET /artists/{id}/top-tracks` | Top tracks do artista |

**Impacto no Mermã:** Nenhum — não usamos esses endpoints.

### 11. Campos Removidos

| Tipo | Campos Removidos |
|------|-----------------|
| **Track** | `available_markets`, `linked_from`, `popularity` |
| **Album** | `album_group`, `available_markets`, `label`, `popularity` |
| **Artist** | `followers`, `popularity` |
| **User** (GET /me) | `country`, `email`, `explicit_content`, `followers`, `product` |

**Impacto no Mermã:**
- `popularity` removido — não usamos para ordenação ou seleção.
- `email` removido do `/me` — não usamos email do Spotify.
- `product` removido do `/me` — não podemos mais verificar se o usuário tem Premium via API. Para o fallback Web Playback SDK, teremos que **tentar conectar e tratar o erro** se não for Premium.

**Ação para verificação de Premium:**

```typescript
// ANTES: verificar via API
const me = await fetch("/v1/me", { headers: { Authorization: `Bearer ${token}` } });
const user = await me.json();
const isPremium = user.product === "premium";

// DEPOIS: verificar via tentativa de conexão do SDK
async function checkSpotifyPremium(token: string): Promise<boolean> {
  try {
    const player = new Spotify.Player({ name: "Mermã Check", getOAuthToken: (cb) => cb(token) });
    const connected = await player.connect();
    player.disconnect();
    return connected;
  } catch {
    return false;
  }
}
```

### 12. Outros Endpoints de Usuário Removidos

| Removido | Substituto |
|----------|-----------|
| `GET /users/{id}` | `GET /me` (só usuário atual) |
| `GET /users/{id}/playlists` | `GET /me/playlists` (só usuário atual) |
| `POST /users/{user_id}/playlists` | `POST /me/playlists` |

**Impacto no Mermã:** Nenhum — só acessamos dados do usuário atual (o jogador logado).

---

## Checklist de Migração para o Mermã

```mermaid
flowchart TD
    A["🔴 Premium do dono do app"] -->|Verificar| A1["✅ Garantir Premium ativo"]
    B["🔴 Limite de 5 usuários"] -->|Para lançamento| B1["📋 Solicitar Extended Quota"]
    C["🔴 Batch endpoints"] -->|Atualizar código| C1["✅ Fetch individual + rate limit"]
    D["🔴 Search limit=10"] -->|Atualizar código| D1["✅ Paginar com offset"]
    E["🟡 /tracks → /items"] -->|Atualizar endpoint| E1["✅ Usar /playlists/{id}/items"]
    F["🟡 Campo tracks → items"] -->|Atualizar parsing| F1["✅ Tratar items como opcional"]
    G["🟡 external_ids (ISRC)"] -->|Verificar| G1["✅ Revertido - disponível"]
    H["🟢 Campo product removido"] -->|Atualizar check| H1["✅ Verificar Premium via SDK"]
```

### Checklist Resumida

- [ ] **Conta:** Dono do app no Spotify Dashboard tem Premium ativo
- [ ] **Limites:** Solicitar Extended Quota Mode antes do lançamento público
- [ ] **Playlist endpoint:** Atualizar `/playlists/{id}/tracks` para `/playlists/{id}/items`
- [ ] **Playlist response:** Atualizar parsing de `tracks` para `items` com optional chaining
- [ ] **Batch fetch:** Substituir batch endpoints por fetches individuais com rate limiting
- [ ] **Search:** Atualizar limit para max 10, implementar paginação com offset
- [ ] **ISRC:** Tratar `external_ids` como opcional (defensivo) embora esteja disponível
- [ ] **Premium check:** Substituir verificação via `/me` por tentativa de conexão do SDK
- [ ] **Campos removidos:** Tratar `popularity`, `email`, `followers` como undefined
- [ ] **Rate limiting global:** Implementar throttle em todas as chamadas à Spotify API

---

## Impacto nos Documentos Existentes

| Documento | Atualização Necessária |
|-----------|----------------------|
| **Contrato de API** (`contrato_api.md`) | Nenhuma — endpoints REST do Mermã não mudam |
| **OpenAPI spec** (`openapi_spec.yaml`) | Nenhuma — spec do Mermã, não do Spotify |
| **Sistema de Áudio** (`especificacao_sistema_audio.md`) | Nota sobre batch removido no rate limiting |
| **Spotify OAuth flows** | Nenhuma — fluxos de auth não foram afetados |
| **Spec de Infra** | Nenhuma |

---

## Referências

- [Spotify February 2026 Migration Guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide)
- [Spotify Web API Changelog](https://developer.spotify.com/documentation/web-api/changelog)
- [Authorization Code Flow — Mermã](./spotify_oauth_flow.md)
- [Sistema de Áudio — Mermã](./especificacao_sistema_audio.md)

# Spotify OAuth — Refreshing Tokens

## Visão Geral

Access tokens do Spotify têm vida útil limitada de **1 hora** (3600 segundos). Quando expiram, a aplicação pode obter um novo token usando o `refresh_token` — **sem precisar que o usuário faça login novamente**.

O `refresh_token` é obtido na resposta original da troca de tokens (Etapa 2 do Authorization Code Flow ou PKCE Flow):

```json
{
  "access_token": "NgCXRK...MzYjw",
  "token_type": "Bearer",
  "scope": "user-read-private user-read-email",
  "expires_in": 3600,
  "refresh_token": "NgAagA...Um_SHo"
}
```

> **Nota:** O Client Credentials Flow **não fornece** `refresh_token`. Para renovar, basta fazer uma nova requisição de token.

---

## Diagrama do Fluxo

```mermaid
sequenceDiagram
    participant App as 🖥️ APPLICATION
    participant Spotify as 🟢 SPOTIFY<br/>ACCOUNTS SERVICE
    participant API as 🎵 SPOTIFY<br/>WEB API

    Note over App,API: Token expirou (após ~1 hora)

    App->>App: Detecta que access_token expirou<br/>(expires_at < agora)

    alt Authorization Code Flow (com backend)
        App->>Spotify: POST /api/token<br/>(grant_type=refresh_token,<br/>refresh_token)<br/>Header: Authorization Basic {base64(client_id:client_secret)}
    else PKCE Flow (sem client_secret)
        App->>Spotify: POST /api/token<br/>(grant_type=refresh_token,<br/>refresh_token,<br/>client_id)
    end

    Spotify->>App: Retorna novo access_token<br/>(access_token, token_type,<br/>expires_in, scope,<br/>refresh_token?)

    App->>App: Armazena novo access_token<br/>Se veio novo refresh_token, substitui o antigo

    App->>API: Request com novo access_token<br/>(Authorization: Bearer {novo_token})
    API->>App: Retorna dados solicitados<br/>({JSON object})
```

---

## Request

```
POST https://accounts.spotify.com/api/token
Content-Type: application/x-www-form-urlencoded
```

### Body Parameters

| Parâmetro | Obrigatório | Descrição |
|-----------|:-----------:|-----------|
| `grant_type` | ✅ | Deve ser `refresh_token` |
| `refresh_token` | ✅ | O refresh token obtido na autorização original |
| `client_id` | Só no PKCE | Client ID da aplicação (não necessário se enviar `Authorization` header) |

### Headers

| Header | Obrigatório | Descrição |
|--------|:-----------:|-----------|
| `Content-Type` | ✅ | Sempre `application/x-www-form-urlencoded` |
| `Authorization` | Só no Auth Code | `Basic {base64(client_id:client_secret)}` |

### Diferença entre os Fluxos

| Aspecto | Authorization Code | PKCE |
|---------|-------------------|------|
| Onde roda o refresh | Backend (servidor) | Frontend (browser) |
| `Authorization` header | ✅ `Basic {base64(id:secret)}` | ❌ Não envia |
| `client_id` no body | ❌ Não necessário | ✅ Obrigatório |
| `client_secret` | ✅ No header (Base64) | ❌ Nunca usado |

---

## Response — Sucesso (200 OK)

```json
{
  "access_token": "BQBLuPRYBQ...BP8stIv5xr-Iwaf4l8eg",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "AQAQfyEFmJJuCvAFh...cG_m-2KTgNDaDMQqjrOa3",
  "scope": "user-read-email user-read-private"
}
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `access_token` | string | Novo token de acesso |
| `token_type` | string | Sempre `"Bearer"` |
| `expires_in` | int | Segundos até expirar (3600 = 1 hora) |
| `refresh_token` | string? | Novo refresh token (pode ou não estar presente) |
| `scope` | string | Scopes concedidos |

> **Sobre o `refresh_token` na resposta:** Dependendo do grant usado para obter o refresh token original, a resposta pode ou não incluir um novo `refresh_token`. **Quando incluído, substitua o antigo.** Quando não incluído, continue usando o existente.

---

## Implementação — PKCE (Browser / Frontend)

Usado quando o jogador autenticou via PKCE Flow (100% client-side):

```typescript
// src/lib/utils/tokens.ts

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;

export async function refreshSpotifyTokenPKCE(): Promise<string> {
  const refreshToken = localStorage.getItem("spotify_refresh_token");
  if (!refreshToken) throw new Error("No refresh token available");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
    }),
  });

  if (!response.ok) {
    // Refresh token inválido ou revogado — forçar re-login
    if (response.status === 400 || response.status === 401) {
      logoutSpotify();
      throw new Error("Session expired — please login again");
    }
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  const data = await response.json();

  // Armazenar novo access_token
  localStorage.setItem("spotify_access_token", data.access_token);
  localStorage.setItem("spotify_token_expires_at",
    String(Date.now() + data.expires_in * 1000)
  );

  // Substituir refresh_token se veio um novo
  if (data.refresh_token) {
    localStorage.setItem("spotify_refresh_token", data.refresh_token);
  }

  return data.access_token;
}
```

---

## Implementação — Authorization Code (Backend / Servidor)

Usado quando o jogador autenticou via Authorization Code Flow (backend faz a troca):

```elixir
# Backend BEAM — renovar token do jogador
def refresh_user_token(refresh_token) do
  credentials = Base.encode64("#{client_id()}:#{client_secret()}")

  headers = [
    {"Content-Type", "application/x-www-form-urlencoded"},
    {"Authorization", "Basic #{credentials}"}
  ]

  body = URI.encode_query(%{
    grant_type: "refresh_token",
    refresh_token: refresh_token
  })

  case HTTPClient.post("https://accounts.spotify.com/api/token", body, headers) do
    {:ok, %{status: 200, body: token_data}} ->
      {:ok, %{
        access_token: token_data["access_token"],
        expires_in: token_data["expires_in"],
        refresh_token: token_data["refresh_token"] || refresh_token,
        scope: token_data["scope"]
      }}

    {:ok, %{status: 400}} ->
      {:error, :invalid_refresh_token}

    {:ok, %{status: 401}} ->
      {:error, :unauthorized}

    {:error, reason} ->
      {:error, :network_error, reason}
  end
end
```

### Endpoint REST do Mermã (proxy de refresh)

```elixir
# POST /api/v1/auth/spotify/refresh
def handle_refresh(conn, %{"refresh_token" => refresh_token}) do
  case SpotifyAuth.refresh_user_token(refresh_token) do
    {:ok, tokens} ->
      json(conn, %{
        access_token: tokens.access_token,
        expires_in: tokens.expires_in,
        refresh_token: tokens.refresh_token
      })

    {:error, :invalid_refresh_token} ->
      conn
      |> put_status(401)
      |> json(%{error: %{code: "token_invalid", message: "Refresh token inválido. Faça login novamente."}})
  end
end
```

---

## Helpers Completos de Gerenciamento de Token

```typescript
// src/lib/utils/tokens.ts — módulo completo

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const EXPIRY_MARGIN_MS = 60_000; // 1 minuto de margem

// ===== Armazenamento =====

export function storeSpotifyTokens(tokens: {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}): void {
  localStorage.setItem("spotify_access_token", tokens.access_token);
  localStorage.setItem("spotify_token_expires_at",
    String(Date.now() + tokens.expires_in * 1000)
  );
  if (tokens.refresh_token) {
    localStorage.setItem("spotify_refresh_token", tokens.refresh_token);
  }
}

// ===== Verificação =====

export function isSpotifyLoggedIn(): boolean {
  return localStorage.getItem("spotify_access_token") !== null;
}

export function isSpotifyTokenExpired(): boolean {
  const expiresAt = localStorage.getItem("spotify_token_expires_at");
  if (!expiresAt) return true;
  return Date.now() >= Number(expiresAt) - EXPIRY_MARGIN_MS;
}

// ===== Refresh =====

export async function refreshSpotifyToken(): Promise<string> {
  const refreshToken = localStorage.getItem("spotify_refresh_token");
  if (!refreshToken) throw new Error("No refresh token — login required");

  // Tenta via backend primeiro (Authorization Code Flow)
  try {
    const response = await fetch("/api/v1/auth/spotify/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (response.ok) {
      const data = await response.json();
      storeSpotifyTokens(data);
      return data.access_token;
    }
  } catch {
    // Backend indisponível — fallback para PKCE direto
  }

  // Fallback: refresh direto no Spotify (PKCE style)
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
    }),
  });

  if (!response.ok) {
    logoutSpotify();
    throw new Error("Session expired — please login again");
  }

  const data = await response.json();
  storeSpotifyTokens(data);
  return data.access_token;
}

// ===== Token Válido (auto-refresh) =====

export async function getValidSpotifyToken(): Promise<string> {
  if (!isSpotifyLoggedIn()) {
    throw new Error("Not logged in to Spotify");
  }

  if (isSpotifyTokenExpired()) {
    return refreshSpotifyToken();
  }

  return localStorage.getItem("spotify_access_token")!;
}

// ===== Logout =====

export function logoutSpotify(): void {
  localStorage.removeItem("spotify_access_token");
  localStorage.removeItem("spotify_refresh_token");
  localStorage.removeItem("spotify_token_expires_at");
  localStorage.removeItem("spotify_code_verifier");
}
```

---

## Fluxo Completo no Mermã — Ciclo de Vida do Token

```mermaid
sequenceDiagram
    participant Browser as 🖥️ Frontend<br/>(SolidJS)
    participant Backend as ⚙️ Backend<br/>(BEAM)
    participant Spotify as 🟢 Spotify

    Note over Browser,Spotify: Jogador já autenticado, token armazenado

    Browser->>Browser: getValidSpotifyToken()<br/>Verifica: token expirou?

    alt Token válido (< 1 hora)
        Browser->>Browser: Retorna access_token do localStorage
    else Token expirado
        Browser->>Backend: POST /api/v1/auth/spotify/refresh<br/>(refresh_token)
        Backend->>Spotify: POST /api/token<br/>(grant_type=refresh_token,<br/>refresh_token, client_id:client_secret)
        Spotify->>Backend: Novo access_token<br/>(+ possível novo refresh_token)
        Backend->>Browser: Retorna novos tokens
        Browser->>Browser: storeSpotifyTokens()<br/>Atualiza localStorage
    else Backend indisponível (fallback PKCE)
        Browser->>Spotify: POST /api/token direto<br/>(grant_type=refresh_token,<br/>refresh_token, client_id)
        Spotify->>Browser: Novo access_token
        Browser->>Browser: storeSpotifyTokens()
    else Refresh token inválido/revogado
        Browser->>Browser: logoutSpotify()<br/>Limpa localStorage
        Browser->>Browser: Redireciona para tela de login
    end
```

---

## Erros Comuns e Tratamento

| Cenário | HTTP Status | Causa | Ação |
|---------|:----------:|-------|------|
| Refresh token válido | 200 | Tudo OK | Armazenar novos tokens |
| Refresh token expirado/revogado | 400 | Usuário revogou acesso ou token muito antigo | Limpar tokens, forçar re-login |
| Client credentials inválidas | 401 | client_id ou client_secret errado (Auth Code) | Verificar configuração do app |
| Rate limited | 429 | Muitas requisições de refresh | Implementar backoff, cachear token |
| Spotify indisponível | 5xx | Problema no servidor Spotify | Retry com backoff exponencial |

---

## Referências

- [Spotify Refresh Token Guide](https://developer.spotify.com/documentation/web-api/tutorials/refreshing-tokens)
- [Authorization Code Flow — Mermã](./spotify_oauth_flow.md)
- [PKCE Flow — Mermã](./spotify_oauth_pkce_flow.md)
- [Client Credentials Flow — Mermã](./spotify_client_credentials_flow.md)
- [Contrato de API — Mermã](./contrato_api.md)

# Spotify OAuth — Client Credentials Flow

## Visão Geral

O Client Credentials Flow é o fluxo OAuth 2.0 mais simples — usado para autenticação **server-to-server** onde não há interação do usuário. Como não envolve autorização de um usuário, **só permite acessar endpoints que não requerem dados privados** (dados públicos, busca de faixas por ISRC, etc.).

No contexto do "Mermã, a Música!", esse fluxo é usado pelo **backend (BEAM)** para buscar dados públicos no Spotify — como buscar uma faixa por ISRC para cross-reference com o Deezer — sem precisar do token de nenhum jogador.

> **Importante:** Este fluxo **não dá acesso a playlists privadas, perfil do usuário ou streaming**. Para isso, é necessário o [Authorization Code Flow](./spotify_oauth_flow.md) ou o [PKCE Flow](./spotify_oauth_pkce_flow.md).

---

## Diagrama do Fluxo

```mermaid
sequenceDiagram
    participant App as 🖥️ APPLICATION<br/>(Backend/Server)
    participant Spotify as 🟢 SPOTIFY<br/>ACCOUNTS SERVICE
    participant API as 🎵 SPOTIFY<br/>WEB API

    Note over App,API: 1️⃣ Solicitar Access Token

    App->>Spotify: POST /api/token<br/>(client_id, client_secret,<br/>grant_type=client_credentials)
    Spotify->>App: Retorna access_token<br/>(access_token, token_type=Bearer,<br/>expires_in=3600)

    Note over App,API: 2️⃣ Acessar a Web API (dados públicos)

    App->>API: Request com access_token<br/>(Authorization: Bearer {token})
    API->>App: Retorna dados públicos<br/>({JSON object} — unscoped)
```

---

## Pré-requisitos

- Ter uma aplicação registrada no [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
- Ter anotado o **Client ID** e o **Client Secret**.
- Este fluxo roda **apenas no backend** (o `client_secret` nunca deve ser exposto ao browser).

---

## Etapa 1 — Solicitar Access Token

A aplicação envia uma requisição direta ao endpoint de token, sem interação do usuário.

### Request

```
POST https://accounts.spotify.com/api/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic {base64(client_id:client_secret)}
```

### Body Parameters

| Parâmetro | Obrigatório | Descrição |
|-----------|:-----------:|-----------|
| `grant_type` | ✅ | Deve ser `client_credentials` |

### Headers

| Header | Valor |
|--------|-------|
| `Authorization` | `Basic {base64(client_id:client_secret)}` |
| `Content-Type` | `application/x-www-form-urlencoded` |

### Exemplo de Implementação (Backend — Gleam/Elixir)

```elixir
# Backend BEAM — obter token de aplicação
def get_app_token() do
  credentials = Base.encode64("#{client_id()}:#{client_secret()}")

  headers = [
    {"Content-Type", "application/x-www-form-urlencoded"},
    {"Authorization", "Basic #{credentials}"}
  ]

  body = URI.encode_query(%{grant_type: "client_credentials"})

  case HTTPClient.post("https://accounts.spotify.com/api/token", body, headers) do
    {:ok, %{status: 200, body: %{"access_token" => token, "expires_in" => expires_in}}} ->
      {:ok, %{access_token: token, expires_in: expires_in}}

    {:ok, %{status: status, body: error}} ->
      {:error, :auth_failed, status, error}

    {:error, reason} ->
      {:error, :network_error, reason}
  end
end
```

### Exemplo de Implementação (TypeScript — referência)

```typescript
// Apenas para referência — este fluxo roda NO BACKEND, não no browser
async function getSpotifyAppToken(): Promise<string> {
  const credentials = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) throw new Error(`Auth failed: ${response.status}`);

  const data = await response.json();
  return data.access_token;
}
```

### Response — Sucesso (200 OK)

```json
{
  "access_token": "NgCXRKc...MzYjw",
  "token_type": "bearer",
  "expires_in": 3600
}
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `access_token` | string | Token para chamadas à Web API (dados públicos) |
| `token_type` | string | Sempre `"bearer"` |
| `expires_in` | int | Segundos até expirar (geralmente 3600 = 1 hora) |

> **Nota:** Não há `refresh_token` neste fluxo. Quando o token expira, basta solicitar um novo com a mesma requisição.

---

## Etapa 2 — Acessar a Spotify Web API

Com o `access_token`, o backend faz chamadas à Web API para acessar **dados públicos** (unscoped).

### Exemplo: Buscar Faixa por ISRC

```
GET https://api.spotify.com/v1/search?q=isrc:GBUM71029604&type=track
Authorization: Bearer {access_token}
```

### Exemplo de Implementação

```elixir
# Backend BEAM — buscar faixa por ISRC no Spotify
def search_track_by_isrc(isrc, access_token) do
  url = "https://api.spotify.com/v1/search?" <>
    URI.encode_query(%{q: "isrc:#{isrc}", type: "track", limit: 1})

  headers = [{"Authorization", "Bearer #{access_token}"}]

  case HTTPClient.get(url, headers) do
    {:ok, %{status: 200, body: %{"tracks" => %{"items" => [track | _]}}}} ->
      {:ok, track}

    {:ok, %{status: 200, body: %{"tracks" => %{"items" => []}}}} ->
      {:error, :not_found}

    {:ok, %{status: 401}} ->
      {:error, :token_expired}

    {:error, reason} ->
      {:error, :network_error, reason}
  end
end
```

### Endpoints Acessíveis com Client Credentials

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/v1/search` | GET | Buscar faixas, artistas, álbuns (dados públicos) |
| `/v1/tracks/{id}` | GET | Detalhes de uma faixa (inclui ISRC) |
| `/v1/artists/{id}` | GET | Detalhes de um artista |
| `/v1/albums/{id}` | GET | Detalhes de um álbum |

### Endpoints NÃO Acessíveis (requerem user auth)

| Endpoint | Motivo |
|----------|--------|
| `/v1/me/playlists` | Requer scope `playlist-read-private` |
| `/v1/me` | Requer dados do usuário |
| Web Playback SDK | Requer scope `streaming` + Premium |

---

## Cache e Renovação do Token

Como o Client Credentials token expira em 1 hora e não tem `refresh_token`, o backend deve:

1. **Cachear o token** em memória (ETS ou processo BEAM) com TTL.
2. **Renovar automaticamente** quando expirar (mesma requisição POST).
3. **Nunca expor** o token ao frontend.

### Exemplo de Cache no BEAM

```elixir
# Módulo de cache do token de aplicação Spotify
defmodule SpotifyAppToken do
  use GenServer

  def start_link(_) do
    GenServer.start_link(__MODULE__, nil, name: __MODULE__)
  end

  def get_token do
    GenServer.call(__MODULE__, :get_token)
  end

  # GenServer callbacks
  def init(_) do
    {:ok, %{token: nil, expires_at: 0}}
  end

  def handle_call(:get_token, _from, state) do
    if System.system_time(:second) >= state.expires_at do
      # Token expirado ou inexistente — buscar novo
      case fetch_new_token() do
        {:ok, %{access_token: token, expires_in: expires_in}} ->
          new_state = %{
            token: token,
            expires_at: System.system_time(:second) + expires_in - 60
          }
          {:reply, {:ok, token}, new_state}

        {:error, reason} ->
          {:reply, {:error, reason}, state}
      end
    else
      {:reply, {:ok, state.token}, state}
    end
  end

  defp fetch_new_token do
    # ... mesma implementação da Etapa 1
  end
end
```

---

## Uso no Mermã, a Música!

```mermaid
sequenceDiagram
    participant Backend as ⚙️ Backend<br/>(BEAM)
    participant Cache as 💾 Token Cache<br/>(ETS/GenServer)
    participant Spotify as 🟢 Spotify<br/>Accounts
    participant API as 🎵 Spotify<br/>Web API
    participant Deezer as 🎶 Deezer<br/>API

    Note over Backend,Deezer: Validação de Playlist — buscar ISRC de faixa pública

    Backend->>Cache: get_token()
    alt Token válido no cache
        Cache->>Backend: access_token (cacheado)
    else Token expirado ou inexistente
        Cache->>Spotify: POST /api/token<br/>(client_credentials)
        Spotify->>Cache: Novo access_token
        Cache->>Backend: access_token (renovado)
    end

    Backend->>API: GET /v1/tracks/{id}<br/>(access_token)
    API->>Backend: Track com ISRC

    Backend->>Deezer: GET /track/isrc:{ISRC}
    Deezer->>Backend: Track com preview_url
```

### Quando Usar Cada Fluxo no Mermã

| Fluxo | Quando Usar | Quem Inicia |
|-------|------------|-------------|
| **Client Credentials** | Buscar dados públicos (ISRC, metadados de faixas) sem depender do token do jogador | Backend automaticamente |
| **Authorization Code** | Importar playlists privadas do jogador, streaming via Web Playback SDK | Jogador faz login |
| **PKCE** | Alternativa ao Auth Code quando se quer autenticar 100% no frontend | Jogador faz login (client-side) |

---

## Comparação dos 3 Fluxos OAuth do Spotify

| Aspecto | Client Credentials | Authorization Code | PKCE |
|---------|-------------------|-------------------|------|
| Interação do usuário | ❌ Nenhuma | ✅ Login + autorização | ✅ Login + autorização |
| `client_secret` | ✅ Necessário | ✅ Necessário | ❌ Não usado |
| `refresh_token` | ❌ Não fornecido | ✅ Fornecido | ✅ Fornecido |
| Acesso a dados privados | ❌ Apenas públicos | ✅ Todos (com scopes) | ✅ Todos (com scopes) |
| Onde roda | Backend only | Backend | Frontend (browser) |
| Uso no Mermã | Busca de ISRC, metadados | Import de playlists, fallback SDK | Alternativa ao Auth Code |

---

## Referências

- [Spotify Client Credentials Guide](https://developer.spotify.com/documentation/web-api/tutorials/client-credentials-flow)
- [Authorization Code Flow — Mermã](./spotify_oauth_flow.md)
- [PKCE Flow — Mermã](./spotify_oauth_pkce_flow.md)
- [Especificação do Sistema de Áudio — Mermã](./especificacao_sistema_audio.md)

# Spotify OAuth — Authorization Code with PKCE Flow

## Visão Geral

O Authorization Code com PKCE (Proof Key for Code Exchange) é o fluxo OAuth 2.0 recomendado para aplicações onde o `client_secret` **não pode ser armazenado com segurança** — como SPAs (Single Page Applications), apps mobile e qualquer client-side application.

No contexto do "Mermã, a Música!", o PKCE é relevante porque o frontend é um **SPA em SolidJS** que roda inteiramente no browser. Embora o backend BEAM faça a troca de tokens no fluxo padrão (Authorization Code Flow), o PKCE pode ser usado como alternativa caso se queira fazer o fluxo inteiramente no frontend — eliminando a necessidade de expor o `client_secret` no servidor.

> **Diferença principal vs Authorization Code Flow:** No PKCE, o `client_secret` é substituído por um par `code_verifier` / `code_challenge` gerado dinamicamente pelo client. A segurança vem da criptografia (SHA-256), não de um segredo compartilhado.

---

## Diagrama do Fluxo

```mermaid
sequenceDiagram
    participant App as 🖥️ APPLICATION<br/>(Browser/SPA)
    participant Spotify as 🟢 SPOTIFY<br/>ACCOUNTS SERVICE
    participant API as 🎵 SPOTIFY<br/>WEB API
    participant User as 👤 USER

    Note over App,User: 0️⃣ Gerar Code Verifier + Challenge

    App->>App: Gerar code_verifier (random 64 chars)<br/>Calcular code_challenge = BASE64URL(SHA256(code_verifier))<br/>Salvar code_verifier no localStorage

    Note over App,User: 1️⃣ Solicitar Autorização do Usuário

    App->>Spotify: GET /authorize<br/>(client_id, response_type=code,<br/>redirect_uri, state, scope,<br/>code_challenge, code_challenge_method=S256)
    Spotify->>User: Exibe scopes solicitados<br/>e prompt de login
    User->>Spotify: Faz login e autoriza acesso
    Spotify->>App: Redirect para redirect_uri<br/>(code, state)

    Note over App,User: 2️⃣ Trocar Code por Tokens (sem client_secret!)

    App->>App: Recuperar code_verifier do localStorage
    App->>Spotify: POST /api/token<br/>(client_id, grant_type=authorization_code,<br/>code, redirect_uri, code_verifier)
    Spotify->>App: Retorna tokens<br/>(access_token, token_type,<br/>scope, expires_in, refresh_token)

    Note over App,User: 3️⃣ Acessar a Web API

    App->>API: Request com access_token<br/>(Authorization: Bearer {token})
    API->>App: Retorna dados solicitados<br/>({JSON object})

    Note over App,User: 4️⃣ Renovar Token Expirado

    App->>Spotify: POST /api/token<br/>(grant_type=refresh_token,<br/>refresh_token, client_id)
    Spotify->>App: Retorna novo access_token

    App->>API: Request com novo access_token
    API->>App: Retorna dados solicitados<br/>({JSON object})
```

---

## Pré-requisitos

- Ter uma aplicação registrada no [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
- Ter configurado a **Redirect URI** no painel do app.
- Ter anotado o **Client ID** (o `client_secret` **NÃO é usado** neste fluxo).

---

## Etapa 0 — Gerar Code Verifier e Code Challenge

Antes de iniciar o fluxo, a aplicação gera um par criptográfico:

### Code Verifier

String aleatória de alta entropia com 43 a 128 caracteres. Pode conter letras, dígitos, underscores, pontos, hifens e tildes.

```typescript
// src/lib/utils/pkce.ts
function generateCodeVerifier(length: number = 64): string {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
}
```

### Code Challenge

Hash SHA-256 do code verifier, codificado em Base64URL (sem padding).

```typescript
async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}
```

### Gerar o Par Completo

```typescript
export async function generatePKCE(): Promise<{
  codeVerifier: string;
  codeChallenge: string;
}> {
  const codeVerifier = generateCodeVerifier(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  return { codeVerifier, codeChallenge };
}
```

O `codeVerifier` é salvo no `localStorage` para ser usado na Etapa 2.

---

## Etapa 1 — Solicitar Autorização do Usuário

Igual ao fluxo padrão, mas com dois parâmetros adicionais: `code_challenge` e `code_challenge_method`.

### Request

```
GET https://accounts.spotify.com/authorize
```

### Query Parameters

| Parâmetro | Obrigatório | Descrição |
|-----------|:-----------:|-----------|
| `client_id` | ✅ | Client ID da aplicação |
| `response_type` | ✅ | Deve ser `code` |
| `redirect_uri` | ✅ | URI de callback registrada no app |
| `state` | ⚠️ Recomendado | String aleatória para proteção contra CSRF |
| `scope` | Opcional | Lista de scopes separados por espaço |
| `code_challenge_method` | ✅ | Deve ser `S256` |
| `code_challenge` | ✅ | Code challenge gerado na Etapa 0 |

### Scopes Necessários para o Mermã

```
playlist-read-private playlist-read-collaborative streaming user-read-playback-state
```

### Exemplo de Implementação

```typescript
// src/lib/api/auth.ts
const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize";
const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = `${window.location.origin}/login/callback`;

export async function startSpotifyLoginPKCE(): Promise<void> {
  // Gerar PKCE
  const { codeVerifier, codeChallenge } = await generatePKCE();

  // Salvar code_verifier para a Etapa 2
  localStorage.setItem("spotify_code_verifier", codeVerifier);

  // Gerar state anti-CSRF
  const state = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  sessionStorage.setItem("spotify_auth_state", state);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    scope: "playlist-read-private playlist-read-collaborative streaming user-read-playback-state",
    redirect_uri: REDIRECT_URI,
    state: state,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
  });

  window.location.href = `${SPOTIFY_AUTH_URL}?${params.toString()}`;
}
```

### Response — Sucesso

O Spotify redireciona de volta com `code` e `state`:

```
https://merma.example.com/login/callback?code=NApCCg..BkWtQ&state=34fFs29kd09
```

| Parâmetro | Descrição |
|-----------|-----------|
| `code` | Código de autorização para trocar por tokens |
| `state` | Mesmo valor enviado na request (validar obrigatoriamente!) |

### Response — Erro

```
https://merma.example.com/login/callback?error=access_denied&state=34fFs29kd09
```

| Parâmetro | Descrição |
|-----------|-----------|
| `error` | Motivo da falha (ex: `access_denied`) |
| `state` | Mesmo valor enviado |

### Parsing do Callback

```typescript
// Na página de callback (/login/callback)
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get("code");
const state = urlParams.get("state");
const error = urlParams.get("error");

// Validar state
const savedState = sessionStorage.getItem("spotify_auth_state");
if (state !== savedState) {
  throw new Error("State mismatch — possível ataque CSRF");
}

if (error) {
  throw new Error(`Autorização negada: ${error}`);
}

if (code) {
  // Prosseguir para Etapa 2
  await exchangeCodeForTokenPKCE(code);
}
```

---

## Etapa 2 — Trocar Code por Access Token

A diferença crucial do PKCE: **não envia `client_secret`**. Em vez disso, envia o `code_verifier` original. O Spotify valida que o hash do `code_verifier` corresponde ao `code_challenge` enviado na Etapa 1.

### Request

```
POST https://accounts.spotify.com/api/token
Content-Type: application/x-www-form-urlencoded
```

### Body Parameters

| Parâmetro | Obrigatório | Descrição |
|-----------|:-----------:|-----------|
| `grant_type` | ✅ | Deve ser `authorization_code` |
| `code` | ✅ | Código de autorização recebido no callback |
| `redirect_uri` | ✅ | Mesma URI da Etapa 1 (apenas validação) |
| `client_id` | ✅ | Client ID da aplicação |
| `code_verifier` | ✅ | O code verifier gerado na Etapa 0 (salvo no localStorage) |

### Headers

| Header | Valor |
|--------|-------|
| `Content-Type` | `application/x-www-form-urlencoded` |

> **Nota:** Sem header `Authorization` — não há `client_secret` neste fluxo.

### Exemplo de Implementação

```typescript
// src/lib/api/auth.ts
export async function exchangeCodeForTokenPKCE(code: string): Promise<void> {
  // Recuperar code_verifier salvo na Etapa 0
  const codeVerifier = localStorage.getItem("spotify_code_verifier");
  if (!codeVerifier) throw new Error("Code verifier not found");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: "authorization_code",
      code: code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  const data = await response.json();

  // Armazenar tokens
  storeSpotifyTokens(data);

  // Limpar code_verifier (single-use)
  localStorage.removeItem("spotify_code_verifier");
}
```

### Response — Sucesso (200 OK)

```json
{
  "access_token": "BQDv...access_token_aqui",
  "token_type": "Bearer",
  "scope": "playlist-read-private playlist-read-collaborative streaming user-read-playback-state",
  "expires_in": 3600,
  "refresh_token": "AQBx...refresh_token_aqui"
}
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `access_token` | string | Token para chamadas à Web API |
| `token_type` | string | Sempre `"Bearer"` |
| `scope` | string | Scopes concedidos |
| `expires_in` | int | Segundos até expirar (geralmente 3600) |
| `refresh_token` | string | Token para renovar sem re-autorização |

### Armazenamento dos Tokens

```typescript
// src/lib/utils/tokens.ts
interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token: string;
}

function storeSpotifyTokens(tokens: SpotifyTokenResponse): void {
  localStorage.setItem("spotify_access_token", tokens.access_token);
  localStorage.setItem("spotify_refresh_token", tokens.refresh_token);
  localStorage.setItem("spotify_token_expires_at",
    String(Date.now() + tokens.expires_in * 1000)
  );
}
```

---

## Etapa 3 — Acessar a Spotify Web API

Idêntico ao fluxo padrão — usa o `access_token` no header `Authorization`.

### Exemplo: Listar Playlists

```typescript
export async function fetchSpotifyPlaylists(): Promise<SpotifyPlaylistResponse> {
  const token = await getValidSpotifyToken();

  const response = await fetch("https://api.spotify.com/v1/me/playlists", {
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    // Token expirado — renovar e tentar novamente
    const newToken = await refreshSpotifyTokenPKCE();
    const retryResponse = await fetch("https://api.spotify.com/v1/me/playlists", {
      headers: { "Authorization": `Bearer ${newToken}` },
    });
    return retryResponse.json();
  }

  return response.json();
}
```

### Endpoints Usados no Mermã

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/v1/me/playlists` | GET | Listar playlists do usuário |
| `/v1/playlists/{id}/tracks` | GET | Listar faixas de uma playlist |
| `/v1/tracks/{id}` | GET | Detalhes da faixa (inclui ISRC) |
| `/v1/me` | GET | Dados do perfil do usuário |

---

## Etapa 4 — Renovar Token Expirado

No PKCE, o refresh também **não usa `client_secret`** — apenas `client_id`.

### Request

```
POST https://accounts.spotify.com/api/token
Content-Type: application/x-www-form-urlencoded
```

### Body Parameters

| Parâmetro | Obrigatório | Descrição |
|-----------|:-----------:|-----------|
| `grant_type` | ✅ | Deve ser `refresh_token` |
| `refresh_token` | ✅ | O refresh_token da Etapa 2 |
| `client_id` | ✅ | Client ID da aplicação |

### Response — Sucesso (200 OK)

```json
{
  "access_token": "BQDv...novo_access_token",
  "token_type": "Bearer",
  "scope": "playlist-read-private playlist-read-collaborative streaming user-read-playback-state",
  "expires_in": 3600,
  "refresh_token": "AQBx...possivelmente_novo_refresh_token"
}
```

> **Nota:** O response pode incluir um novo `refresh_token`. Se incluir, substituir o antigo.

### Exemplo de Implementação

```typescript
// src/lib/utils/tokens.ts
export async function refreshSpotifyTokenPKCE(): Promise<string> {
  const refreshToken = localStorage.getItem("spotify_refresh_token");
  if (!refreshToken) throw new Error("No refresh token available");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
    }),
  });

  if (!response.ok) throw new Error("Token refresh failed");

  const data = await response.json();

  // Atualizar tokens armazenados
  localStorage.setItem("spotify_access_token", data.access_token);
  localStorage.setItem("spotify_token_expires_at",
    String(Date.now() + data.expires_in * 1000)
  );

  if (data.refresh_token) {
    localStorage.setItem("spotify_refresh_token", data.refresh_token);
  }

  return data.access_token;
}
```

### Helpers de Token

```typescript
// src/lib/utils/tokens.ts
export function isSpotifyTokenExpired(): boolean {
  const expiresAt = localStorage.getItem("spotify_token_expires_at");
  if (!expiresAt) return true;
  return Date.now() >= Number(expiresAt) - 60_000; // 1 min de margem
}

export async function getValidSpotifyToken(): Promise<string> {
  if (isSpotifyTokenExpired()) {
    return refreshSpotifyTokenPKCE();
  }
  return localStorage.getItem("spotify_access_token")!;
}

export function isSpotifyLoggedIn(): boolean {
  return localStorage.getItem("spotify_access_token") !== null;
}

export function logoutSpotify(): void {
  localStorage.removeItem("spotify_access_token");
  localStorage.removeItem("spotify_refresh_token");
  localStorage.removeItem("spotify_token_expires_at");
  localStorage.removeItem("spotify_code_verifier");
}
```

---

## Comparação: Authorization Code vs PKCE

| Aspecto | Authorization Code | PKCE |
|---------|-------------------|------|
| `client_secret` | ✅ Necessário (backend) | ❌ Não usado |
| Onde roda a troca de tokens | Backend (seguro) | Frontend (browser) |
| Segurança | Secret compartilhado | Prova criptográfica (SHA-256) |
| Ideal para | Apps com backend | SPAs, mobile, client-side |
| Complexidade | Menor (backend faz tudo) | Maior (gerar verifier/challenge) |

### Qual Usar no Mermã?

Para o MVP, o projeto usa **Authorization Code Flow** (com backend fazendo a troca), porque o backend BEAM já existe e pode armazenar o `client_secret` com segurança. O PKCE é documentado aqui como referência e como alternativa caso se queira:

- Fazer o fluxo inteiramente no frontend (sem proxy no backend para auth).
- Dar ao jogador a opção de autenticar sem depender do backend.
- Suportar cenários onde o backend esteja temporariamente indisponível.

---

## Fluxo PKCE Adaptado para o Mermã

```mermaid
sequenceDiagram
    participant Browser as 🖥️ Frontend<br/>(SolidJS SPA)
    participant Spotify as 🟢 Spotify<br/>Accounts
    participant API as 🎵 Spotify<br/>Web API
    participant Backend as ⚙️ Backend<br/>(BEAM)
    participant Deezer as 🎶 Deezer<br/>API

    Note over Browser,Deezer: Login via PKCE (100% client-side)

    Browser->>Browser: Gerar code_verifier + code_challenge<br/>Salvar verifier no localStorage
    Browser->>Spotify: GET /authorize<br/>(client_id, code_challenge,<br/>code_challenge_method=S256, scope)
    Spotify->>Browser: Prompt de login + autorização
    Browser->>Spotify: Jogador autoriza
    Spotify->>Browser: Redirect com code + state
    Browser->>Spotify: POST /api/token<br/>(client_id, code, code_verifier)<br/>SEM client_secret
    Spotify->>Browser: access_token + refresh_token<br/>Armazena no localStorage

    Note over Browser,Deezer: Importar Playlist (via Backend)

    Browser->>Backend: POST /api/v1/playlists/spotify/{id}/import<br/>(access_token no header)
    Backend->>API: GET /v1/playlists/{id}/tracks<br/>(access_token)
    API->>Backend: Lista de faixas com ISRC

    Note over Browser,Deezer: Validar Áudio no Deezer

    loop Para cada faixa
        Backend->>Deezer: GET /track/isrc:{ISRC}
        Deezer->>Backend: Track com preview_url
    end

    Backend->>Browser: Playlist validada<br/>(✅ available / ⚠️ fallback / ❌ unavailable)
```

### Diferença Chave

No fluxo PKCE, a autenticação OAuth acontece **100% no browser** — o backend nunca vê o `client_secret`. Mas a importação e validação de playlists ainda passa pelo backend, que faz as chamadas à Spotify Web API e ao Deezer.

---

## Referências

- [Spotify PKCE Authorization Guide](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow)
- [RFC 7636 — PKCE](https://tools.ietf.org/html/rfc7636)
- [Spotify Web API Reference](https://developer.spotify.com/documentation/web-api/reference)
- [Authorization Code Flow — Mermã, a Música!](./spotify_oauth_flow.md)
- [Especificação do Sistema de Áudio — Mermã, a Música!](./especificacao_sistema_audio.md)
- [Contrato de API — Mermã, a Música!](./contrato_api.md)

# Spotify OAuth — Authorization Code Flow

## Visão Geral

O Authorization Code Flow é o fluxo OAuth 2.0 recomendado para aplicações de longa duração (web e mobile) onde o usuário concede permissão uma única vez. No contexto do "Mermã, a Música!", esse fluxo é usado quando o jogador conecta sua conta do Spotify para importar playlists.

> **Nota:** Para aplicações onde o `client_secret` não pode ser armazenado com segurança (ex: apps mobile, SPAs puros), deve-se usar a extensão **PKCE**. No nosso caso, o backend (BEAM) faz a troca de tokens, então o fluxo padrão é adequado.

---

## Diagrama do Fluxo

```mermaid
sequenceDiagram
    participant App as 🖥️ APPLICATION
    participant Spotify as 🟢 SPOTIFY ACCOUNTS SERVICE
    participant API as 🎵 SPOTIFY WEB API
    participant User as 👤 USER

    Note over App,User: 1️⃣ Solicitar Autorização do Usuário

    App->>Spotify: GET /authorize<br/>(client_id, response_type=code,<br/>redirect_uri, state, scope)
    Spotify->>User: Exibe scopes solicitados<br/>e prompt de login
    User->>Spotify: Faz login e autoriza acesso
    Spotify->>App: Redirect para redirect_uri<br/>(code, state)

    Note over App,User: 2️⃣ Trocar Code por Tokens

    App->>Spotify: POST /api/token<br/>(client_id, client_secret,<br/>grant_type=authorization_code,<br/>code, redirect_uri)
    Spotify->>App: Retorna tokens<br/>(access_token, token_type,<br/>scope, expires_in, refresh_token)

    Note over App,User: 3️⃣ Acessar a Web API

    App->>API: Request com access_token<br/>(Authorization: Bearer {token})
    API->>App: Retorna dados solicitados<br/>({JSON object})

    Note over App,User: 4️⃣ Renovar Token Expirado

    App->>Spotify: POST /api/token<br/>(grant_type=refresh_token,<br/>refresh_token)
    Spotify->>App: Retorna novo access_token

    App->>API: Request com novo access_token
    API->>App: Retorna dados solicitados<br/>({JSON object})
```

---

## Pré-requisitos

- Ter uma aplicação registrada no [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
- Ter configurado a **Redirect URI** no painel do app (deve corresponder exatamente à URI usada nas requisições).
- Ter anotado o **Client ID** e o **Client Secret** da aplicação.

---

## Etapa 1 — Solicitar Autorização do Usuário

A aplicação envia o usuário para o endpoint de autorização do Spotify via redirect no browser.

### Request

```
GET https://accounts.spotify.com/authorize
```

### Query Parameters

| Parâmetro | Obrigatório | Descrição |
|-----------|:-----------:|-----------|
| `client_id` | ✅ | Client ID da aplicação registrada no Spotify |
| `response_type` | ✅ | Deve ser `code` |
| `redirect_uri` | ✅ | URI de callback registrada no app. Deve corresponder **exatamente** (case, barras, etc.) |
| `state` | ⚠️ Recomendado | String aleatória para proteção contra CSRF ([RFC-6749](https://tools.ietf.org/html/rfc6749)) |
| `scope` | Opcional | Lista de scopes separados por espaço. Sem scopes = acesso apenas a dados públicos |
| `show_dialog` | Opcional | `false` (padrão): redireciona automaticamente se já autorizado. `true`: força nova aprovação |

### Scopes Necessários para o Mermã

```
playlist-read-private playlist-read-collaborative streaming user-read-playback-state
```

| Scope | Motivo |
|-------|--------|
| `playlist-read-private` | Importar playlists privadas do jogador |
| `playlist-read-collaborative` | Importar playlists colaborativas |
| `streaming` | Fallback: Spotify Web Playback SDK (requer Premium) |
| `user-read-playback-state` | Controlar estado de playback no fallback |

### Exemplo de Implementação

```typescript
// src/lib/api/auth.ts
const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize";
const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = `${window.location.origin}/api/v1/auth/spotify/callback`;

export function startSpotifyLogin(): void {
  const state = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  sessionStorage.setItem("spotify_auth_state", state);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    scope: "playlist-read-private playlist-read-collaborative streaming user-read-playback-state",
    redirect_uri: REDIRECT_URI,
    state: state,
  });

  window.location.href = `${SPOTIFY_AUTH_URL}?${params.toString()}`;
}
```

### Response — Sucesso

O Spotify redireciona o usuário de volta para a `redirect_uri` com os seguintes query parameters:

| Parâmetro | Descrição |
|-----------|-----------|
| `code` | Código de autorização que será trocado por tokens |
| `state` | Mesmo valor de `state` enviado na request |

```
https://merma.example.com/api/v1/auth/spotify/callback?code=NApCCg..BkWtQ&state=34fFs29kd09
```

### Response — Erro

Se o usuário rejeitar ou ocorrer erro:

| Parâmetro | Descrição |
|-----------|-----------|
| `error` | Motivo da falha (ex: `access_denied`) |
| `state` | Mesmo valor de `state` enviado |

```
https://merma.example.com/api/v1/auth/spotify/callback?error=access_denied&state=34fFs29kd09
```

### Validação Obrigatória

A aplicação **DEVE** comparar o `state` recebido no callback com o `state` original enviado. Se não corresponderem, rejeitar a requisição e abortar o fluxo — isso protege contra ataques CSRF.

---

## Etapa 2 — Trocar Code por Access Token

Com o `code` recebido, o backend troca por tokens de acesso.

### Request

```
POST https://accounts.spotify.com/api/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic {base64(client_id:client_secret)}
```

### Body Parameters

| Parâmetro | Obrigatório | Descrição |
|-----------|:-----------:|-----------|
| `grant_type` | ✅ | Deve ser `authorization_code` |
| `code` | ✅ | O código de autorização recebido no callback |
| `redirect_uri` | ✅ | Mesma URI usada na etapa 1 (apenas validação, sem redirect real) |

### Headers

| Header | Valor |
|--------|-------|
| `Authorization` | `Basic {base64(client_id:client_secret)}` |
| `Content-Type` | `application/x-www-form-urlencoded` |

### Exemplo de Implementação (Backend)

```elixir
# Exemplo no backend BEAM (Elixir) — endpoint /api/v1/auth/spotify/callback
def handle_callback(code, redirect_uri) do
  body = URI.encode_query(%{
    grant_type: "authorization_code",
    code: code,
    redirect_uri: redirect_uri
  })

  credentials = Base.encode64("#{client_id}:#{client_secret}")

  headers = [
    {"Content-Type", "application/x-www-form-urlencoded"},
    {"Authorization", "Basic #{credentials}"}
  ]

  case HTTPClient.post("https://accounts.spotify.com/api/token", body, headers) do
    {:ok, %{status: 200, body: token_data}} -> {:ok, token_data}
    {:ok, %{status: status}} -> {:error, :token_exchange_failed, status}
    {:error, reason} -> {:error, :network_error, reason}
  end
end
```

### Response — Sucesso (200 OK)

```json
{
  "access_token": "BQDv...access_token_aqui",
  "token_type": "Bearer",
  "scope": "playlist-read-private playlist-read-collaborative streaming user-read-playback-state",
  "expires_in": 3600,
  "refresh_token": "AQBx...refresh_token_aqui"
}
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `access_token` | string | Token para chamadas à Web API |
| `token_type` | string | Sempre `"Bearer"` |
| `scope` | string | Scopes concedidos (separados por espaço) |
| `expires_in` | int | Segundos até expirar (geralmente 3600 = 1 hora) |
| `refresh_token` | string | Token para renovar o access_token sem re-autorização |

### O Que Fazer com os Tokens

No "Mermã, a Música!", os tokens são retornados ao frontend e armazenados no **localStorage** do browser:

```typescript
// Frontend recebe os tokens do backend e armazena
function storeSpotifyTokens(tokens: SpotifyTokenResponse): void {
  localStorage.setItem("spotify_access_token", tokens.access_token);
  localStorage.setItem("spotify_refresh_token", tokens.refresh_token);
  localStorage.setItem("spotify_token_expires_at",
    String(Date.now() + tokens.expires_in * 1000)
  );
  localStorage.setItem("spotify_platform_user_id", tokens.platform_user_id);
}
```

---

## Etapa 3 — Acessar a Spotify Web API

Com o `access_token`, a aplicação faz chamadas à Web API.

### Exemplo: Listar Playlists do Usuário

```
GET https://api.spotify.com/v1/me/playlists
Authorization: Bearer {access_token}
```

### Exemplo de Implementação

```typescript
// src/lib/api/playlists.ts
export async function fetchSpotifyPlaylists(accessToken: string) {
  const response = await fetch("https://api.spotify.com/v1/me/playlists", {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
    },
  });

  if (response.status === 401) {
    // Token expirado — renovar (ver Etapa 4)
    throw new TokenExpiredError();
  }

  return response.json();
}
```

### Endpoints Usados no Mermã

| Endpoint | Método | Descrição | Scope Necessário |
|----------|--------|-----------|-----------------|
| `/v1/me/playlists` | GET | Listar playlists do usuário | `playlist-read-private` |
| `/v1/playlists/{id}/tracks` | GET | Listar faixas de uma playlist | `playlist-read-private` |
| `/v1/tracks/{id}` | GET | Detalhes da faixa (inclui ISRC) | — |
| `/v1/me` | GET | Dados do perfil do usuário | — |

---

## Etapa 4 — Renovar Token Expirado

O `access_token` expira após `expires_in` segundos (geralmente 1 hora). Para obter um novo sem pedir re-autorização ao usuário, usa-se o `refresh_token`.

### Request

```
POST https://accounts.spotify.com/api/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic {base64(client_id:client_secret)}
```

### Body Parameters

| Parâmetro | Obrigatório | Descrição |
|-----------|:-----------:|-----------|
| `grant_type` | ✅ | Deve ser `refresh_token` |
| `refresh_token` | ✅ | O refresh_token recebido na Etapa 2 |

### Response — Sucesso (200 OK)

```json
{
  "access_token": "BQDv...novo_access_token",
  "token_type": "Bearer",
  "scope": "playlist-read-private playlist-read-collaborative streaming user-read-playback-state",
  "expires_in": 3600
}
```

> **Nota:** O response pode ou não incluir um novo `refresh_token`. Se incluir, o antigo deve ser substituído. Se não incluir, o `refresh_token` original continua válido.

### Exemplo de Implementação

```typescript
// src/lib/utils/tokens.ts
export async function refreshSpotifyToken(): Promise<string> {
  const refreshToken = localStorage.getItem("spotify_refresh_token");
  if (!refreshToken) throw new Error("No refresh token available");

  const response = await fetch("/api/v1/auth/spotify/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) throw new Error("Token refresh failed");

  const data = await response.json();

  // Atualizar tokens armazenados
  localStorage.setItem("spotify_access_token", data.access_token);
  localStorage.setItem("spotify_token_expires_at",
    String(Date.now() + data.expires_in * 1000)
  );

  if (data.refresh_token) {
    localStorage.setItem("spotify_refresh_token", data.refresh_token);
  }

  return data.access_token;
}

// Helper para verificar se token está expirado
export function isSpotifyTokenExpired(): boolean {
  const expiresAt = localStorage.getItem("spotify_token_expires_at");
  if (!expiresAt) return true;
  return Date.now() >= Number(expiresAt) - 60_000; // 1 min de margem
}

// Helper para obter token válido (renova se necessário)
export async function getValidSpotifyToken(): Promise<string> {
  if (isSpotifyTokenExpired()) {
    return refreshSpotifyToken();
  }
  return localStorage.getItem("spotify_access_token")!;
}
```

---

## Fluxo Adaptado para o Mermã, a Música!

No contexto do projeto, o fluxo OAuth do Spotify funciona assim:

```mermaid
sequenceDiagram
    participant Browser as 🖥️ Frontend<br/>(SolidJS)
    participant Backend as ⚙️ Backend<br/>(BEAM)
    participant Spotify as 🟢 Spotify<br/>Accounts
    participant API as 🎵 Spotify<br/>Web API
    participant Deezer as 🎶 Deezer<br/>API

    Note over Browser,Deezer: Login do Jogador

    Browser->>Backend: GET /api/v1/auth/spotify/login<br/>(redirect_uri)
    Backend->>Spotify: Redirect → /authorize<br/>(client_id, scope, state)
    Spotify->>Browser: Prompt de login + autorização
    Browser->>Spotify: Jogador autoriza
    Spotify->>Backend: Callback com code + state
    Backend->>Spotify: POST /api/token<br/>(troca code por tokens)
    Spotify->>Backend: access_token + refresh_token
    Backend->>Browser: Retorna tokens ao frontend

    Note over Browser,Deezer: Importar Playlist

    Browser->>Backend: POST /api/v1/playlists/spotify/{id}/import<br/>(access_token no header)
    Backend->>API: GET /v1/playlists/{id}/tracks<br/>(access_token)
    API->>Backend: Lista de faixas com ISRC

    Note over Browser,Deezer: Validar Áudio no Deezer

    loop Para cada faixa
        Backend->>Deezer: GET /track/isrc:{ISRC}
        Deezer->>Backend: Track com preview_url (ou não encontrada)
    end

    Backend->>Browser: Playlist validada<br/>(status de cada faixa:<br/>✅ available / ⚠️ fallback / ❌ unavailable)
```

### Pontos-Chave da Adaptação

1. **O backend faz a troca de tokens** (code → access_token) porque possui o `client_secret` de forma segura.
2. **Tokens ficam no localStorage do browser** — o backend não persiste tokens no MVP (sem banco de dados).
3. **O backend usa o access_token do jogador** para buscar playlists e faixas na Spotify Web API.
4. **Cada faixa importada é validada no Deezer** via ISRC para encontrar o preview de áudio (Deezer é o motor de áudio primário).
5. **Refresh automático**: quando o frontend detecta token expirado, chama `/api/v1/auth/spotify/refresh` antes de fazer a operação.

---

## Referências

- [Spotify Authorization Guide](https://developer.spotify.com/documentation/web-api/tutorials/code-flow)
- [Spotify Web API Reference](https://developer.spotify.com/documentation/web-api/reference)
- [RFC 6749 — OAuth 2.0](https://tools.ietf.org/html/rfc6749)
- [Especificação do Sistema de Áudio — Mermã, a Música!](./especificacao_sistema_audio.md)
- [Contrato de API — Mermã, a Música!](./contrato_api.md)