# YouTube Data API v3 — Respostas de Referência

Documentação coletada em março/2026.
Base URL: `https://www.googleapis.com/youtube/v3`
Auth: OAuth 2.0 (Google) para playlists do usuário.

## Quota

- **10.000 units/dia** (default)
- Reset: meia-noite Pacific Time
- `playlists.list` = 1 unit
- `playlistItems.list` = 1 unit
- `search.list` = **100 units** (EVITAR — usar playlistItems em vez de search)

**Estratégia:** NÃO usamos `search.list` (caro demais). Apenas `playlists.list` + `playlistItems.list` = 1 unit cada. Para um jogador com 10 playlists de 50 músicas cada = ~60 units (listagem + paginação).

## Endpoints usados

| Endpoint | Cost | Auth | Uso no projeto |
|---|---|---|---|
| `GET /playlists?mine=true` | 1 | OAuth | Listar playlists do jogador |
| `GET /playlistItems?playlistId={id}` | 1 | OAuth | Listar vídeos/músicas de uma playlist |

**NÃO usamos:** `search.list` (100 units), `videos.list` (sem necessidade).

## OAuth Flow (Google)

- Authorize: `https://accounts.google.com/o/oauth2/v2/auth`
- Token: `https://oauth2.googleapis.com/token`
- Scopes: `https://www.googleapis.com/auth/youtube.readonly`
- Content-Type token exchange: `application/x-www-form-urlencoded`

### Authorize URL

```
https://accounts.google.com/o/oauth2/v2/auth?
  client_id={CLIENT_ID}
  &redirect_uri={REDIRECT_URI}
  &response_type=code
  &scope=https://www.googleapis.com/auth/youtube.readonly
  &state={RANDOM_STATE}
  &access_type=offline
  &prompt=consent
```

`access_type=offline` garante que recebemos `refresh_token`.
`prompt=consent` força tela de consentimento (necessário para refresh_token).

### Token Exchange

```http
POST https://oauth2.googleapis.com/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code={CODE}
&redirect_uri={REDIRECT_URI}
&client_id={CLIENT_ID}
&client_secret={CLIENT_SECRET}
```

### Token Response

```json
{
  "access_token": "ya29.a0...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "1//0e...",
  "scope": "https://www.googleapis.com/auth/youtube.readonly"
}
```

### Token Refresh

```http
POST https://oauth2.googleapis.com/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token={REFRESH_TOKEN}
&client_id={CLIENT_ID}
&client_secret={CLIENT_SECRET}
```

## Response: GET /playlists?mine=true&part=snippet,contentDetails

```json
{
  "kind": "youtube#playlistListResponse",
  "etag": "abc123",
  "pageInfo": {
    "totalResults": 5,
    "resultsPerPage": 25
  },
  "items": [
    {
      "kind": "youtube#playlist",
      "etag": "def456",
      "id": "PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf",
      "snippet": {
        "publishedAt": "2023-01-15T10:30:00Z",
        "channelId": "UC1234567890",
        "title": "Minhas Músicas Favoritas",
        "description": "Playlist de músicas que eu curto",
        "thumbnails": {
          "default": { "url": "https://i.ytimg.com/vi/.../default.jpg", "width": 120, "height": 90 },
          "medium": { "url": "https://i.ytimg.com/vi/.../mqdefault.jpg", "width": 320, "height": 180 },
          "high": { "url": "https://i.ytimg.com/vi/.../hqdefault.jpg", "width": 480, "height": 360 }
        },
        "channelTitle": "João Silva"
      },
      "contentDetails": {
        "itemCount": 42
      }
    }
  ]
}
```

Mapeamento: `id` → playlist_id, `snippet.title` → name, `snippet.thumbnails.medium.url` → cover_url, `contentDetails.itemCount` → track_count

## Response: GET /playlistItems?playlistId={id}&part=snippet&maxResults=50

```json
{
  "kind": "youtube#playlistItemListResponse",
  "etag": "ghi789",
  "nextPageToken": "CAUQAA",
  "pageInfo": {
    "totalResults": 42,
    "resultsPerPage": 50
  },
  "items": [
    {
      "kind": "youtube#playlistItem",
      "etag": "jkl012",
      "id": "UExSYXh0bUVyWmdPZWl...",
      "snippet": {
        "publishedAt": "2023-02-10T14:00:00Z",
        "channelId": "UC1234567890",
        "title": "Queen - Bohemian Rhapsody (Official Video)",
        "description": "Bohemian Rhapsody by Queen...",
        "thumbnails": {
          "default": { "url": "https://i.ytimg.com/vi/fJ9rUzIMcZQ/default.jpg", "width": 120, "height": 90 },
          "medium": { "url": "https://i.ytimg.com/vi/fJ9rUzIMcZQ/mqdefault.jpg", "width": 320, "height": 180 },
          "high": { "url": "https://i.ytimg.com/vi/fJ9rUzIMcZQ/hqdefault.jpg", "width": 480, "height": 360 }
        },
        "channelTitle": "Queen Official",
        "playlistId": "PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf",
        "position": 0,
        "resourceId": {
          "kind": "youtube#video",
          "videoId": "fJ9rUzIMcZQ"
        },
        "videoOwnerChannelTitle": "Queen Official",
        "videoOwnerChannelId": "UCiMhD4jzUqG-IgPzUmmytRQ"
      }
    }
  ]
}
```

### Extração de metadados do título

YouTube Music não tem campos separados de "nome da música" e "artista". O título do vídeo tipicamente segue o formato:
- `"Artista - Nome da Música"` (mais comum)
- `"Artista - Nome (Official Video)"`
- `"Artista - Nome (feat. Outro)"`
- `"Nome da Música"` (sem artista no título)

**Parser necessário:** split por ` - ` (espaço traço espaço), primeiro segmento = artista, segundo = nome da música. Limpar sufixos como `(Official Video)`, `(Lyrics)`, `(Audio)`, `[Official Music Video]`.

O `videoOwnerChannelTitle` pode ser usado como fallback para o artista.

Mapeamento:
- `snippet.title` → parsear para `original_name` + `original_artist`
- `snippet.resourceId.videoId` → `original_id`
- `snippet.videoOwnerChannelTitle` → fallback artista
- **SEM ISRC** — YouTube não fornece. Resolução no Deezer via nome+artista (fallback)

## Paginação

YouTube usa `pageToken` (não offset):
- Primeira página: sem token
- Próxima: `nextPageToken` da resposta → `pageToken={token}` na próxima request
- `maxResults`: até 50

## Notas para implementação

1. **Sem ISRC** — resolução no Deezer é SEMPRE por nome+artista (fallback path)
2. **Parser de título** — precisa de lógica para separar artista/música do título do vídeo
3. **Quota conservadora** — 10.000 units/dia. Cachear agressivamente.
4. **Vídeos deletados/privados** — `snippet.title` pode ser "Deleted video" ou "Private video". Filtrar.
5. **Paginação por token** — diferente do offset do Spotify/Deezer
6. **Sem áudio** — YouTube não oferece preview/playback via API. 100% Deezer para áudio.
