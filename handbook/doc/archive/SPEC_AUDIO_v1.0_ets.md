# 🎵 Mermã, a Música! — Especificação do Motor de Áudio

> **Versão 1.0 — MVP | Maio 2026**
> Detalha a estratégia universal de áudio baseada no Deezer e a lógica de resolução de faixas.

---

## 1. 🎯 Princípio Fundamental: Deezer como Motor Universal

Independente da plataforma de origem da playlist (Spotify, YouTube Music), o áudio reproduzido vem preferencialmente do **Deezer** via sua API pública de previews (30 segundos).

### 1.1 Estratégia de Resolução (ISRC First)
1.  **Metadados**: Extrai nome, artista e **ISRC** da playlist original.
2.  **Match por ISRC**: Busca no Deezer via ISRC (chave única global).
3.  **Fallback por Nome**: Se o ISRC falhar, busca por `track:"nome" artist:"artista"`.
4.  **Audio Source**: Se disponível no Deezer, gera um preview MP3.

---

## 2. 🔒 Segurança & Anti-Cheat

O sistema é projetado para impedir que jogadores identifiquem a música via ferramentas de desenvolvedor.

- **Proxy de Áudio**: O backend faz o download temporário e entrega o stream ao frontend. O browser nunca vê `api.deezer.com`.
- **audio_token**: O link `/api/audio/{token}` é opaco, expira após a rodada e só pode ser usado uma vez.
- **Headers Sanitizados**: Removemos `Content-Length` original e metadata ID3 (que contém o nome da música).

---

## 3. ⚖️ Fallback Spotify Premium

Apenas se uma música for vital e não existir no Deezer, o sistema tenta usar o **Spotify Web Playback SDK**.
- **Requisito**: O dono da música deve ter Spotify Premium.
- **Limitação**: Funciona apenas em navegadores compatíveis (exclui Safari iOS).

---

## 4. 📊 Limites & Performance

| API | Limite | Estratégia |
| :--- | :--- | :--- |
| **Deezer** | 50 req / 5s | Queue com throttle no backend para importação de playlists. |
| **Spotify** | Variável | Cache de ISRC -> Deezer ID por 24h em memória (ETS). |
| **YouTube** | 10k units / dia | Cache agressivo de metadados. |

---
*Grounding: Segue as diretrizes de APIs públicas de streaming e padrões de segurança para aplicações Web competitivas.*
