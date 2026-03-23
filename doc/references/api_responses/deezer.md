# Deezer API — Respostas de Referência

Documentação coletada em março/2026.
Base URL: `https://api.deezer.com`
Auth: NÃO requerida para search e track (endpoints públicos).

## Endpoints usados

| Endpoint | Auth | Uso no projeto |
|---|---|---|
| `GET /search?q=...` | Não | Buscar música por nome+artista (resolução cross-platform) |
| `GET /search?q=track:"x" artist:"y"` | Não | Busca avançada com filtros |
| `GET /track/{id}` | Não | Detalhes completos (preview URL, album, cover) |
| `GET /2.0/track/isrc:{ISRC}` | Não | Lookup por ISRC (não documentado oficialmente, funciona) |
| Preview URL (`preview` field) | Não | MP3 30s — MOTOR DE ÁUDIO do jogo |

**Rate limit:** 50 requests / 5 segundos por IP. Implementar throttling.

## Campos-chave para o projeto

| Campo Deezer | Mapeia para | Onde |
|---|---|---|
| `id` | `deezer_track_id` | search + track |
| `title` / `title_short` | `deezer_name` | search + track |
| `artist.name` | `deezer_artist` | search + track |
| `album.title` | `deezer_album` | search + track |
| `album.cover_medium` | `deezer_cover_url` | search + track |
| `preview` | Preview URL (MP3 30s) | search + track |
| `isrc` | Para cross-ref com Spotify | search + track |
| `duration` | Duração em segundos | search + track |
| `readable` | Verificar antes de usar | search + track |

## Response: GET /search?q=track:"nome" artist:"artista"

```json
{
  "data": [
    {
      "id": 3135556,
      "readable": true,
      "title": "Harder, Better, Faster, Stronger",
      "title_short": "Harder, Better, Faster, Stronger",
      "title_version": "",
      "isrc": "GBDUW0000059",
      "link": "https://www.deezer.com/track/3135556",
      "duration": 224,
      "rank": 956857,
      "explicit_lyrics": false,
      "preview": "https://cdnt-preview.dzcdn.net/api/1/...",
      "artist": {
        "id": 27,
        "name": "Daft Punk",
        "picture_medium": "https://cdn-images.dzcdn.net/images/artist/.../250x250.jpg"
      },
      "album": {
        "id": 302127,
        "title": "Discovery",
        "cover_medium": "https://cdn-images.dzcdn.net/images/cover/.../250x250.jpg"
      },
      "type": "track"
    }
  ],
  "total": 1,
  "next": "https://api.deezer.com/search?q=...&index=25"
}
```

## Response: GET /track/{id}

Mesmo formato da seção acima mas com campos extras:
- `share`, `track_position`, `disk_number`, `release_date`
- `bpm`, `gain`, `available_countries`
- `contributors` (array com `role`)
- `album.release_date`, `album.link`
- `artist.nb_album`, `artist.nb_fan`, `artist.radio`

## Lookup por ISRC (não documentado)

```
GET https://api.deezer.com/2.0/track/isrc:USRC17607839
```

Retorna objeto Track completo (mesmo formato do GET /track/{id}).
ISRC pode conter dash entre letras/números em alguns casos.
Este é o caminho PREFERENCIAL para resolução Spotify→Deezer:
1. Spotify dá o ISRC via `track.external_ids.isrc`
2. Deezer resolve via `/2.0/track/isrc:{ISRC}`
3. Se não encontrar, fallback para search `track:"nome" artist:"artista"`

## Busca avançada (filtros)

```
GET /search?q=track:"Bohemian Rhapsody" artist:"Queen"
GET /search?q=artist:"Daft Punk"&strict=on&limit=10
```

Filtros: `track:`, `artist:`, `album:`, `label:`, `dur_min:`, `dur_max:`, `bpm_min:`, `bpm_max:`
Valores texto entre aspas duplas. Múltiplos filtros = AND lógico.

## Notas para implementação

1. Preview URL tem token com expiração — não cachear por muito tempo
2. `readable == false` = restrição geográfica. Verificar `alternative` no /track/{id}
3. ISRC disponível tanto no search quanto no track — usar para match Spotify→Deezer
4. Paginação: campo `next` ou `index` manual (0, 25, 50...)
5. Search não requer auth — apenas endpoints de playlist do usuário precisam OAuth
