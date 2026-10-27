# Spotify Web API — Respostas de Referência

> **Aferido em 2026-10-26 ([ADR-0024](../adr/0024-playlist-por-link-publico-e-lista-resolvidos-na-deezer.md)):** o login é PKCE sem `client_secret`, com os scopes `playlist-read-private playlist-read-collaborative`. A contagem de faixas é `items.total` (`tracks.total` está deprecated), e o item da playlist vem em `item` (`track` está deprecated). As URLs de imagem expiram em menos de um dia, então não são guardadas. Em Development Mode, `/items` dá 403 em playlist que o usuário não criou nem colabora.

Documentação coletada em março/2026. Inclui mudanças de fev/2026 (Dev Mode restrictions).

## Endpoints usados

| Endpoint | Scope | Uso no projeto |
|---|---|---|
| `GET /v1/me` | `user-read-private` | Obter platform_user_id + display_name |
| `GET /v1/me/playlists` | `playlist-read-private` | Listar playlists do jogador |
| `GET /v1/playlists/{id}/items` | `playlist-read-private` | Listar tracks (com ISRC) |
| `POST /api/token` (Accounts) | — | Token exchange + refresh |

**ATENÇÃO:**
- Usar `/items` e NÃO `/tracks` (deprecated fev/2026)
- `preview_url` deprecated — NÃO usamos (Deezer é nosso motor de áudio)
- `popularity` removido em Dev Mode
- ISRC está em `track.external_ids.isrc`

## OAuth Flow

- Tipo: Authorization Code (com backend + client_secret)
- Authorize: `GET https://accounts.spotify.com/authorize`
- Token: `POST https://accounts.spotify.com/api/token`
- Content-Type: `application/x-www-form-urlencoded`
- Auth header: `Authorization: Basic {BASE64(CLIENT_ID:CLIENT_SECRET)}`
- Scopes: `playlist-read-private user-read-private`

## Response: GET /v1/me

```json
{
  "display_name": "João Silva",
  "id": "smedjan",
  "images": [{ "url": "https://i.scdn.co/image/...", "height": 64, "width": 64 }],
  "type": "user",
  "uri": "spotify:user:smedjan"
}
```

Mapeamento: `id` → platform_user_id, `display_name` → platform_username

## Response: GET /v1/me/playlists

```json
{
  "href": "https://api.spotify.com/v1/me/playlists?offset=0&limit=20",
  "limit": 20,
  "next": null,
  "offset": 0,
  "total": 45,
  "items": [
    {
      "id": "3cEYpjA9oz9GiPac4AsH4n",
      "name": "Rock Clássico",
      "description": "Minha playlist favorita",
      "images": [{ "url": "https://mosaic.scdn.co/640/...", "height": 640, "width": 640 }],
      "owner": { "id": "smedjan", "display_name": "João" },
      "tracks": { "total": 52 },
      "public": true,
      "snapshot_id": "MTYsNjM5...",
      "uri": "spotify:playlist:3cEYpjA9oz9GiPac4AsH4n"
    }
  ]
}
```

Mapeamento: `id` → playlist_id, `name`, `images[0].url` → cover_url, `tracks.total` → track_count

## Response: GET /v1/playlists/{id}/items

```json
{
  "limit": 50,
  "next": null,
  "offset": 0,
  "total": 52,
  "items": [
    {
      "added_at": "2024-03-15T10:30:00Z",
      "is_local": false,
      "track": {
        "id": "11dFghVXANMlKmJXsNCbNl",
        "name": "Track Exemplo",
        "artists": [{ "id": "0TnOYISbd1XYRBk9myaseg", "name": "Artista Exemplo" }],
        "album": {
          "id": "2up3OPMp9Tb4dAKM2erWXQ",
          "name": "Album Exemplo",
          "images": [{ "url": "https://i.scdn.co/image/...", "height": 300, "width": 300 }]
        },
        "duration_ms": 237040,
        "external_ids": { "isrc": "USRC17607839" },
        "uri": "spotify:track:11dFghVXANMlKmJXsNCbNl",
        "is_local": false
      }
    }
  ]
}
```

Mapeamento: `track.id` → original_id, `track.name` → original_name,
`track.artists[0].name` → original_artist, `track.external_ids.isrc` → isrc

## Response: POST /api/token

```json
{
  "access_token": "BQDj2JtN...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "AQAf8k9...",
  "scope": "playlist-read-private user-read-private"
}
```

Mesmo formato para exchange e refresh. Sempre armazenar o refresh_token mais recente (Spotify pode rotacionar).
